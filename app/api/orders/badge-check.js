import { db } from '@/lib/db';

async function awardBadge(studentId, classId, badgeId) {
  const { data: existing } = await db.from('badges').select('id')
    .eq('student_id', studentId).eq('class_id', classId).eq('badge_id', badgeId).single();
  if (existing) return null;
  const { error } = await db.from('badges').insert({
    student_id: studentId, class_id: classId,
    badge_id: badgeId, earned_at: new Date().toISOString(),
  });
  return error ? null : badgeId;
}

async function grantTokens(earned, studentId, classId) {
  if (!earned.length) return 0;
  try {
    const { data: cfg } = await db.from('class_reward_config')
      .select('enabled, badge_reward_tokens').eq('class_id', classId).single();
    if (cfg?.enabled && cfg.badge_reward_tokens > 0) {
      await db.from('class_reward_ledger').insert(
        earned.map(id => ({ student_id: studentId, class_id: classId, tokens: cfg.badge_reward_tokens, reason: `badge:${id}` }))
      );
      return earned.length * cfg.badge_reward_tokens;
    }
  } catch (e) { console.error('Order badge token error:', e); }
  return 0;
}

// Called when an order is placed (POST) or cancelled (DELETE)
export async function checkBadgesAfterOrderAction({ studentId, classId, action, pendingCount, isCancellation }) {
  const earned = [];
  const give = async (id) => { const b = await awardBadge(studentId, classId, id); if (b) earned.push(b); };

  const { data: allOrders } = await db.from('pending_orders')
    .select('id, action, status, created_at, executed_at')
    .eq('student_id', studentId)
    .eq('class_id', classId);

  const orders = allOrders || [];
  const totalPlaced = orders.length;

  // Placement milestones
  if (totalPlaced >= 1)  await give('order_placed');
  if (totalPlaced >= 5)  await give('order_sniper');
  if (totalPlaced >= 20) await give('limit_master');

  // First SHORT order
  if (orders.some(o => o.action === 'SHORT')) await give('short_seller');

  // Stacked: 3+ pending orders at once
  if (pendingCount >= 3) await give('stacked_orders');

  // Cut bait: first cancellation
  if (isCancellation) {
    const cancelled = orders.filter(o => o.status === 'cancelled');
    if (cancelled.length >= 1) await give('cut_bait');
  }

  const tokensAwarded = await grantTokens(earned, studentId, classId);
  return { newBadges: earned, tokensAwarded };
}

// Called when a limit order executes (in cron job)
export async function checkBadgesAfterOrderExecution({ studentId, classId, order }) {
  const earned = [];
  const give = async (id) => { const b = await awardBadge(studentId, classId, id); if (b) earned.push(b); };

  const { data: allOrders } = await db.from('pending_orders')
    .select('id, action, status, created_at, executed_at')
    .eq('student_id', studentId)
    .eq('class_id', classId);

  const executed = (allOrders || []).filter(o => o.status === 'executed');

  // First execution
  if (executed.length >= 1) await give('order_hit');

  // 3 executed orders
  if (executed.length >= 3) await give('triple_trigger');

  // Patient limit: this order was pending 24+ hours before executing
  if (order.created_at && order.executed_at) {
    const hoursOpen = (new Date(order.executed_at) - new Date(order.created_at)) / 3600000;
    if (hoursOpen >= 24) await give('patient_limit');
  }

  const tokensAwarded = await grantTokens(earned, studentId, classId);
  return { newBadges: earned, tokensAwarded };
}
