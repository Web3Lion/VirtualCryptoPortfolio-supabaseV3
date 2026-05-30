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

async function returnCoinsToHoldings(studentId, classId, coin, quantity, fallbackPrice) {
  const { data: existing } = await db.from('holdings').select('quantity')
    .eq('student_id', studentId).eq('class_id', classId).eq('coin', coin).single();
  if (existing) {
    await db.from('holdings').update({ quantity: parseFloat(existing.quantity) + quantity })
      .eq('student_id', studentId).eq('class_id', classId).eq('coin', coin);
  } else {
    await db.from('holdings').insert({
      student_id: studentId, class_id: classId, coin,
      quantity, avg_price: fallbackPrice, margin_borrowed: 0,
    });
  }
}

async function creditCash(studentId, classId, amount) {
  const { data } = await db.from('portfolios').select('cash')
    .eq('student_id', studentId).eq('class_id', classId).single();
  if (data) {
    await db.from('portfolios').update({ cash: parseFloat(data.cash) + amount })
      .eq('student_id', studentId).eq('class_id', classId);
  }
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
      .in('status', ['active', 'claimable', 'restaked'])
      .order('created_at', { ascending: false }),
    db.from('holdings').select('coin, quantity')
      .eq('student_id', student.id).eq('class_id', classId).gt('quantity', 0),
    db.from('price_cache').select('symbol, price'),
    db.from('staking_config').select('enabled').eq('class_id', classId).single(),
  ]);

  const priceMap = {};
  (priceRes.data || []).forEach(r => { priceMap[r.symbol] = parseFloat(r.price); });

  const now = new Date();
  const RESTAKE_GRACE_MS = 24 * 60 * 60 * 1000; // 24 hours

  const positions = (posRes.data || [])
    // hide restaked positions that have already been claimed (claimable_rewards = 0)
    .filter(p => p.status !== 'restaked' || parseFloat(p.claimable_rewards || 0) > 0)
    .map(p => {
      const price = priceMap[p.coin] || 0;
      // Restaked positions: coins are in the new position, not here
      const currentValue = p.status === 'restaked' ? 0 : parseFloat(p.quantity) * price;
      // Real-time reward accrual for active positions only
      const daysElapsed = (now - new Date(p.last_reward_at)) / (1000 * 86400);
      const accruedRewards = p.status === 'active'
        ? calcDailyReward(parseFloat(p.quantity), price, parseFloat(p.apy)) * Math.max(0, daysElapsed)
        : 0;
      const isMature = p.unlocks_at ? now >= new Date(p.unlocks_at) : false;
      // For claimable: when will cron auto-restake it?
      const autoRestakeAt = p.status === 'claimable' && p.unlocks_at
        ? new Date(new Date(p.unlocks_at).getTime() + RESTAKE_GRACE_MS)
        : null;

      return { ...p, currentValue, accruedRewards, isMature, price, autoRestakeAt };
    });

  // Holdings eligible for staking (cross-ref STAKEABLE_COINS)
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

  const { data: cfg } = await db.from('staking_config').select('enabled').eq('class_id', classId).single();
  if (!cfg?.enabled) return Response.json({ error: 'Staking is not enabled for this class' }, { status: 400 });

  // ── STAKE ──────────────────────────────────────────────────────────────────
  if (action === 'stake') {
    const { coin, quantity } = body;
    const symbol = coin?.toUpperCase();
    const stakeInfo = STAKEABLE_COINS[symbol];
    if (!stakeInfo) return Response.json({ error: `${coin} is not stakeable` }, { status: 400 });

    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return Response.json({ error: 'Quantity must be greater than 0' }, { status: 400 });

    const { data: holding } = await db.from('holdings').select('quantity')
      .eq('student_id', student.id).eq('class_id', classId).eq('coin', symbol).single();
    if (!holding || parseFloat(holding.quantity) < qty)
      return Response.json({ error: `Not enough ${symbol} to stake` }, { status: 400 });

    const newQty = parseFloat(holding.quantity) - qty;
    if (newQty > 1e-9) {
      await db.from('holdings').update({ quantity: newQty })
        .eq('student_id', student.id).eq('class_id', classId).eq('coin', symbol);
    } else {
      await db.from('holdings').delete()
        .eq('student_id', student.id).eq('class_id', classId).eq('coin', symbol);
    }

    const now = new Date();
    const unlocksAt = stakeInfo.lockDays > 0
      ? new Date(now.getTime() + stakeInfo.lockDays * 86400 * 1000).toISOString()
      : null;

    await db.from('staking_positions').insert({
      student_id: student.id, class_id: classId, coin: symbol,
      quantity: qty, apy: stakeInfo.apy, lock_days: stakeInfo.lockDays,
      staked_at: now.toISOString(), unlocks_at: unlocksAt,
      status: 'active', total_rewards_earned: 0, claimable_rewards: 0,
      last_reward_at: now.toISOString(),
    });

    return Response.json({ success: true });
  }

  // ── CLAIM ─────────────────────────────────────────────────────────────────
  // Handles both 'claimable' (return coins + rewards) and 'restaked' (rewards only).
  if (action === 'claim') {
    const { positionId } = body;
    const { data: position } = await db.from('staking_positions').select('*')
      .eq('id', positionId).eq('student_id', student.id)
      .in('status', ['claimable', 'restaked']).single();
    if (!position) return Response.json({ error: 'Position not found or not claimable' }, { status: 404 });

    const { data: priceData } = await db.from('price_cache').select('price').eq('symbol', position.coin).single();
    const price = parseFloat(priceData?.price || 0);
    const rewardAmount = parseFloat(position.claimable_rewards || 0);

    if (position.status === 'claimable') {
      // Return coins to holdings
      await returnCoinsToHoldings(student.id, classId, position.coin, parseFloat(position.quantity), price);
    }
    // Credit rewards to cash (both claimable and restaked)
    if (rewardAmount > 0) await creditCash(student.id, classId, rewardAmount);

    await db.from('staking_positions').update({ status: 'completed' }).eq('id', positionId);

    return Response.json({
      success: true,
      coinsReturned: position.status === 'claimable',
      rewardCredited: rewardAmount,
    });
  }

  // ── UNSTAKE ───────────────────────────────────────────────────────────────
  // Only for active positions. Flexible: pays out accumulated rewards. Locked early: forfeits rewards.
  if (action === 'unstake') {
    const { positionId } = body;
    const { data: position } = await db.from('staking_positions').select('*')
      .eq('id', positionId).eq('student_id', student.id).eq('status', 'active').single();
    if (!position) return Response.json({ error: 'Position not found' }, { status: 404 });

    const now = new Date();
    const isFlexible = position.lock_days === 0;
    const isEarlyExit = !isFlexible;

    const { data: priceData } = await db.from('price_cache').select('price').eq('symbol', position.coin).single();
    const price = parseFloat(priceData?.price || 0);

    // Return coins always
    await returnCoinsToHoldings(student.id, classId, position.coin, parseFloat(position.quantity), price);

    let paidOut = 0;
    if (isFlexible) {
      // Pay out everything accumulated
      const daysElapsed = (now - new Date(position.last_reward_at)) / (1000 * 86400);
      const pending = calcDailyReward(parseFloat(position.quantity), price, parseFloat(position.apy)) * daysElapsed;
      paidOut = parseFloat(position.total_rewards_earned) + pending;
      if (paidOut > 0) await creditCash(student.id, classId, paidOut);
    }
    // Early exit from a locked position: forfeits all accumulated rewards

    await db.from('staking_positions').update({
      status: isEarlyExit ? 'unstaked' : 'completed',
      total_rewards_earned: isFlexible ? paidOut : parseFloat(position.total_rewards_earned),
      last_reward_at: now.toISOString(),
    }).eq('id', positionId);

    return Response.json({ success: true, isEarlyExit, paidOut });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
