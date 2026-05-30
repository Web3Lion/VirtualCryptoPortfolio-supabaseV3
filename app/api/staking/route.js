import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { STAKEABLE_COINS, calcDailyReward } from '@/lib/staking';
import { db } from '@/lib/db';

async function resolveClassId(studentId, bodyClassId) {
  if (bodyClassId) return bodyClassId;
  const { data: cs } = await db.from('class_students').select('class_id')
    .eq('student_id', studentId).order('joined_at', { ascending: false }).limit(1).single();
  return cs?.class_id || null;
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ positions: [], stakeable: [], config: { enabled: false } });

  const { searchParams } = new URL(request.url);
  const classId = await resolveClassId(student.id, searchParams.get('classId'));
  if (!classId) return Response.json({ positions: [], stakeable: [], config: { enabled: false } });

  const [posRes, holdingsRes, priceRes, cfgRes] = await Promise.all([
    db.from('staking_positions').select('*')
      .eq('student_id', student.id).eq('class_id', classId)
      .in('status', ['active']).order('created_at', { ascending: false }),
    db.from('holdings').select('coin, quantity').eq('student_id', student.id).eq('class_id', classId).gt('quantity', 0),
    db.from('price_cache').select('symbol, price'),
    db.from('staking_config').select('enabled').eq('class_id', classId).single(),
  ]);

  const priceMap = {};
  (priceRes.data || []).forEach(r => { priceMap[r.symbol] = parseFloat(r.price); });

  // Enrich positions with current value and pending rewards
  const now = new Date();
  const positions = (posRes.data || []).map(p => {
    const price = priceMap[p.coin] || 0;
    const currentValue = parseFloat(p.quantity) * price;
    const secondsElapsed = (now - new Date(p.last_reward_at)) / 1000;
    const daysElapsed = secondsElapsed / 86400;
    const pendingReward = calcDailyReward(parseFloat(p.quantity), price, parseFloat(p.apy)) * daysElapsed;
    const isMature = p.unlocks_at ? now >= new Date(p.unlocks_at) : true;
    return { ...p, currentValue, pendingReward, isMature, price };
  });

  // Holdings eligible for staking (coin must be in STAKEABLE_COINS and student must own some)
  const stakeable = (holdingsRes.data || [])
    .filter(h => STAKEABLE_COINS[h.coin.toUpperCase()])
    .map(h => ({
      coin: h.coin,
      quantity: parseFloat(h.quantity),
      value: parseFloat(h.quantity) * (priceMap[h.coin] || 0),
      price: priceMap[h.coin] || 0,
      ...STAKEABLE_COINS[h.coin.toUpperCase()],
    }));

  return Response.json({
    positions,
    stakeable,
    config: { enabled: cfgRes.data?.enabled ?? false },
    classId,
  });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  const body = await request.json();
  const { action, classId: bodyClassId } = body;
  const classId = await resolveClassId(student.id, bodyClassId);
  if (!classId) return Response.json({ error: 'No class found' }, { status: 404 });

  // Verify staking is enabled
  const { data: cfg } = await db.from('staking_config').select('enabled').eq('class_id', classId).single();
  if (!cfg?.enabled) return Response.json({ error: 'Staking is not enabled for this class' }, { status: 400 });

  // ── STAKE ────────────────────────────────────────────────────────────────
  if (action === 'stake') {
    const { coin, quantity } = body;
    const symbol = coin?.toUpperCase();
    const stakeInfo = STAKEABLE_COINS[symbol];
    if (!stakeInfo) return Response.json({ error: `${coin} is not stakeable` }, { status: 400 });

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return Response.json({ error: 'Quantity must be greater than 0' }, { status: 400 });

    // Check holding
    const { data: holding } = await db.from('holdings').select('quantity')
      .eq('student_id', student.id).eq('class_id', classId).eq('coin', symbol).single();
    if (!holding || parseFloat(holding.quantity) < qty)
      return Response.json({ error: `Not enough ${symbol} to stake` }, { status: 400 });

    const newQty = parseFloat(holding.quantity) - qty;
    // Update or delete holding
    if (newQty > 0.000000001) {
      await db.from('holdings').update({ quantity: newQty })
        .eq('student_id', student.id).eq('class_id', classId).eq('coin', symbol);
    } else {
      await db.from('holdings').delete()
        .eq('student_id', student.id).eq('class_id', classId).eq('coin', symbol);
    }

    // Create position
    const now = new Date();
    const unlocksAt = stakeInfo.lockDays > 0
      ? new Date(now.getTime() + stakeInfo.lockDays * 86400 * 1000).toISOString()
      : null;

    await db.from('staking_positions').insert({
      student_id: student.id,
      class_id: classId,
      coin: symbol,
      quantity: qty,
      apy: stakeInfo.apy,
      lock_days: stakeInfo.lockDays,
      staked_at: now.toISOString(),
      unlocks_at: unlocksAt,
      status: 'active',
      total_rewards_earned: 0,
      last_reward_at: now.toISOString(),
    });

    return Response.json({ success: true });
  }

  // ── UNSTAKE ──────────────────────────────────────────────────────────────
  if (action === 'unstake') {
    const { positionId } = body;
    const { data: position } = await db.from('staking_positions').select('*')
      .eq('id', positionId).eq('student_id', student.id).eq('status', 'active').single();
    if (!position) return Response.json({ error: 'Position not found' }, { status: 404 });

    const now = new Date();
    const isMature = position.unlocks_at ? now >= new Date(position.unlocks_at) : true;

    // Credit final rewards only if mature (no penalty on principal)
    let finalReward = 0;
    if (isMature) {
      const { data: priceData } = await db.from('price_cache').select('price').eq('symbol', position.coin).single();
      const price = parseFloat(priceData?.price || 0);
      const daysElapsed = (now - new Date(position.last_reward_at)) / (1000 * 86400);
      finalReward = calcDailyReward(parseFloat(position.quantity), price, parseFloat(position.apy)) * daysElapsed;
    }

    // Return coins to holdings
    const { data: existingHolding } = await db.from('holdings').select('quantity')
      .eq('student_id', student.id).eq('class_id', classId).eq('coin', position.coin).single();

    if (existingHolding) {
      await db.from('holdings').update({ quantity: parseFloat(existingHolding.quantity) + parseFloat(position.quantity) })
        .eq('student_id', student.id).eq('class_id', classId).eq('coin', position.coin);
    } else {
      const { data: priceData } = await db.from('price_cache').select('price').eq('symbol', position.coin).single();
      await db.from('holdings').insert({
        student_id: student.id, class_id: classId, coin: position.coin,
        quantity: parseFloat(position.quantity),
        avg_price: parseFloat(priceData?.price || 0),
        margin_borrowed: 0,
      });
    }

    // Credit rewards to cash + mark position done
    const totalEarned = parseFloat(position.total_rewards_earned) + finalReward;
    await Promise.all([
      finalReward > 0
        ? db.from('portfolios').select('cash').eq('student_id', student.id).eq('class_id', classId).single()
            .then(({ data }) => db.from('portfolios').update({ cash: parseFloat(data.cash) + finalReward })
              .eq('student_id', student.id).eq('class_id', classId))
        : Promise.resolve(),
      db.from('staking_positions').update({
        status: isMature ? 'completed' : 'unstaked',
        total_rewards_earned: totalEarned,
        last_reward_at: now.toISOString(),
      }).eq('id', positionId),
    ]);

    return Response.json({ success: true, isMature, finalReward, totalEarned });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
