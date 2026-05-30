import { db } from '@/lib/db';
import { calcDailyReward } from '@/lib/staking';

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

      const rows = targets.map(sid => {
        const cash = pMap[sid] ?? 0;
        let holdingsVal = 0, borrowed = 0;
        (hMap[sid] || []).forEach(h => {
          holdingsVal += parseFloat(h.quantity) * (priceMap[h.coin] || 0);
          borrowed    += parseFloat(h.margin_borrowed || 0);
        });
        return { student_id: sid, class_id: cls.id, total_value: cash + holdingsVal - borrowed, cash, snapshot_type: 'daily' };
      });

      if (rows.length) {
        await db.from('snapshots').insert(rows);
        total += rows.length;
      }
    }

    // ── Distribute staking rewards ────────────────────────────────────────
    let stakingRewards = 0;
    try {
      const { data: activePositions } = await db.from('staking_positions')
        .select('*').eq('status', 'active');

      if (activePositions?.length) {
        const now = new Date();
        for (const pos of activePositions) {
          const price = priceMap[pos.coin] || 0;
          if (!price) continue;

          const daysElapsed = (now - new Date(pos.last_reward_at)) / (1000 * 86400);
          if (daysElapsed < 0.01) continue; // skip if rewarded very recently

          const reward = calcDailyReward(parseFloat(pos.quantity), price, parseFloat(pos.apy)) * daysElapsed;

          const isMature = pos.unlocks_at ? now >= new Date(pos.unlocks_at) : false;

          if (isMature) {
            // Auto-complete: return coins + final reward
            const { data: existingHolding } = await db.from('holdings').select('quantity')
              .eq('student_id', pos.student_id).eq('class_id', pos.class_id).eq('coin', pos.coin).single();
            if (existingHolding) {
              await db.from('holdings').update({ quantity: parseFloat(existingHolding.quantity) + parseFloat(pos.quantity) })
                .eq('student_id', pos.student_id).eq('class_id', pos.class_id).eq('coin', pos.coin);
            } else {
              await db.from('holdings').insert({
                student_id: pos.student_id, class_id: pos.class_id, coin: pos.coin,
                quantity: parseFloat(pos.quantity), avg_price: price, margin_borrowed: 0,
              });
            }
            await db.from('staking_positions').update({
              status: 'completed',
              total_rewards_earned: parseFloat(pos.total_rewards_earned) + reward,
              last_reward_at: now.toISOString(),
            }).eq('id', pos.id);
          } else {
            await db.from('staking_positions').update({
              total_rewards_earned: parseFloat(pos.total_rewards_earned) + reward,
              last_reward_at: now.toISOString(),
            }).eq('id', pos.id);
          }

          // Credit reward to cash
          if (reward > 0) {
            const { data: portfolio } = await db.from('portfolios').select('cash')
              .eq('student_id', pos.student_id).eq('class_id', pos.class_id).single();
            if (portfolio) {
              await db.from('portfolios').update({ cash: parseFloat(portfolio.cash) + reward })
                .eq('student_id', pos.student_id).eq('class_id', pos.class_id);
              stakingRewards++;
            }
          }
        }
      }
    } catch (_) { /* staking tables may not exist yet — skip silently */ }

    return Response.json({ success: true, snapshotsCreated: total, stakingRewards });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
