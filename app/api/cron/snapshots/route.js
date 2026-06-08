import { db } from '@/lib/db';
import { calcDailyRewardCoins } from '@/lib/staking';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// Creates a daily snapshot for every student in every class RIGHT NOW.
// Can be called by the teacher from the dashboard to backfill missing history.
// Also accepts ?force=1 to overwrite any existing snapshot from today.
export async function POST(request) {
  const session_header = request.headers.get('x-teacher-email');
  // Auth: accept cron secret OR teacher email header
  const authHeader = request.headers.get('authorization');
  const cronOk  = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const teacherOk = session_header === TEACHER_EMAIL;
  if (!cronOk && !teacherOk) {
    return Response.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === '1';

  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { data: allCached } = await db.from('price_cache').select('symbol, price');
    const priceMap = {};
    (allCached || []).forEach(r => { priceMap[r.symbol] = parseFloat(r.price); });

    const { data: classes } = await db.from('classes').select('id');
    let total = 0;

    for (const cls of classes || []) {
      const { data: classStudents } = await db.from('class_students')
        .select('student_id').eq('class_id', cls.id);
      if (!classStudents?.length) continue;

      const studentIds = classStudents.map(r => r.student_id);
      let targets = studentIds;

      if (!force) {
        const { data: existing } = await db.from('snapshots')
          .select('student_id')
          .eq('class_id', cls.id)
          .eq('snapshot_type', 'daily')
          .gte('created_at', todayIso)
          .in('student_id', studentIds);
        const done = new Set((existing || []).map(s => s.student_id));
        targets = studentIds.filter(id => !done.has(id));
      }
      if (!targets.length) continue;

      let stakingRes = { data: null };
      try {
        const { data } = await db.from('staking_positions')
          .select('student_id, coin, quantity, status, total_rewards_earned, claimable_rewards')
          .in('student_id', targets).eq('class_id', cls.id)
          .in('status', ['active', 'claimable']);
        stakingRes = { data };
      } catch {}

      const [portfoliosRes, holdingsRes] = await Promise.all([
        db.from('portfolios').select('student_id, cash').in('student_id', targets).eq('class_id', cls.id),
        db.from('holdings').select('student_id, coin, quantity, margin_borrowed').in('student_id', targets).eq('class_id', cls.id),
      ]);

      const pMap = {};
      (portfoliosRes.data || []).forEach(p => { pMap[p.student_id] = parseFloat(p.cash); });

      const hMap = {};
      (holdingsRes.data || []).forEach(h => {
        if (!hMap[h.student_id]) hMap[h.student_id] = [];
        hMap[h.student_id].push(h);
      });

      const sMap = {};
      (stakingRes.data || []).forEach(p => {
        if (!sMap[p.student_id]) sMap[p.student_id] = [];
        sMap[p.student_id].push(p);
      });

      const rows = targets.map(sid => {
        const cash = pMap[sid] ?? 0;
        let holdingsVal = 0, borrowed = 0;
        (hMap[sid] || []).forEach(h => {
          holdingsVal += parseFloat(h.quantity) * (priceMap[h.coin] || 0);
          borrowed    += parseFloat(h.margin_borrowed || 0);
        });
        const stakingVal = (sMap[sid] || []).reduce((s, p) => {
          const price = priceMap[p.coin] || 0;
          const principal = parseFloat(p.quantity) * price;
          // Include accrued reward coins in portfolio value
          const rewardCoins = p.status === 'claimable'
            ? parseFloat(p.claimable_rewards || 0)
            : parseFloat(p.total_rewards_earned || 0);
          return s + principal + rewardCoins * price;
        }, 0);
        return { student_id: sid, class_id: cls.id, total_value: cash + holdingsVal + stakingVal - borrowed, cash, snapshot_type: 'daily' };
      });

      if (rows.length) {
        await db.from('snapshots').insert(rows);
        total += rows.length;
      }
    }

    // ── Staking: accumulate rewards, flip mature → claimable, auto-restake ──
    let stakingProcessed = 0;
    try {
      const GRACE_MS = 24 * 60 * 60 * 1000; // 24 h before auto-restake
      const now = new Date();

      // 1. Active positions: accumulate rewards; locked+mature → claimable
      const { data: activePositions } = await db.from('staking_positions')
        .select('*').eq('status', 'active');

      for (const pos of activePositions || []) {
        const price = priceMap[pos.coin] || 0;
        if (!price) continue;

        const daysElapsed = (now - new Date(pos.last_reward_at)) / (1000 * 86400);
        if (daysElapsed < 0.01) continue;

        const reward = calcDailyRewardCoins(parseFloat(pos.quantity), parseFloat(pos.apy)) * daysElapsed;
        const newTotal = parseFloat(pos.total_rewards_earned) + reward;
        const isMature = pos.unlocks_at && now >= new Date(pos.unlocks_at);

        if (isMature) {
          // Flip to claimable — do NOT touch holdings or cash; student must claim.
          await db.from('staking_positions').update({
            status: 'claimable',
            total_rewards_earned: newTotal,
            claimable_rewards: newTotal,
            last_reward_at: now.toISOString(),
          }).eq('id', pos.id);
        } else {
          // Still earning — accumulate only (no cash credit until claimed)
          await db.from('staking_positions').update({
            total_rewards_earned: newTotal,
            last_reward_at: now.toISOString(),
          }).eq('id', pos.id);
        }
        stakingProcessed++;
      }

      // 2. Claimable positions past the grace window → auto-restake
      const { data: claimablePositions } = await db.from('staking_positions')
        .select('*').eq('status', 'claimable');

      for (const pos of claimablePositions || []) {
        if (!pos.unlocks_at) continue;
        const pastGrace = now >= new Date(new Date(pos.unlocks_at).getTime() + GRACE_MS);
        if (!pastGrace) continue;

        // Create new identical staking position — coins never returned to holdings
        await db.from('staking_positions').insert({
          student_id: pos.student_id, class_id: pos.class_id,
          coin: pos.coin, quantity: pos.quantity,
          apy: pos.apy, lock_days: pos.lock_days,
          staked_at: now.toISOString(),
          unlocks_at: new Date(now.getTime() + pos.lock_days * 86400 * 1000).toISOString(),
          status: 'active',
          total_rewards_earned: 0, claimable_rewards: 0,
          last_reward_at: now.toISOString(),
        });

        // Each missed cycle keeps its own restaked record so students can see
        // per-period breakdowns. The UI provides a Claim All button to sweep them.
        await db.from('staking_positions').update({ status: 'restaked' }).eq('id', pos.id);
        stakingProcessed++;
      }
    } catch (_) { /* staking tables may not exist yet — skip silently */ }

    return Response.json({ success: true, snapshotsCreated: total, stakingProcessed });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
