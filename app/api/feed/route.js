import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json([]);

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json([]);

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [tradesRes, badgesRes, challengesRes] = await Promise.all([
    db.from('trades')
      .select('id, student_id, action, coin, quantity, price, gross_value, reasoning, created_at, students(name, is_bot)')
      .eq('class_id', classId).gte('created_at', cutoff)
      .order('created_at', { ascending: false }).limit(50),
    db.from('badges')
      .select('badge_id, earned_at, students(name)')
      .eq('class_id', classId).gte('earned_at', cutoff)
      .order('earned_at', { ascending: false }).limit(20),
    db.from('class_reward_ledger')
      .select('tokens, reason, created_at, students(name)')
      .eq('class_id', classId).gte('created_at', cutoff)
      .like('reason', 'daily_challenge:%')
      .order('created_at', { ascending: false }).limit(10),
  ]);

  // Fetch reactions for all trade IDs in one query
  const tradeIds = (tradesRes.data || []).filter(t => !t.students?.is_bot).map(t => t.id);
  let reactionsMap = {};
  if (tradeIds.length) {
    const { data: rxData } = await db.from('trade_reactions')
      .select('trade_id, emoji, student_id').in('trade_id', tradeIds).catch(() => ({ data: null }));
    (rxData || []).forEach(r => {
      if (!reactionsMap[r.trade_id]) reactionsMap[r.trade_id] = {};
      reactionsMap[r.trade_id][r.emoji] = (reactionsMap[r.trade_id][r.emoji] || 0) + 1;
      if (r.student_id === student.id) reactionsMap[r.trade_id].__mine = r.emoji;
    });
  }

  const items = [];

  (tradesRes.data || []).forEach(t => {
    if (t.students?.is_bot) return;
    const name = t.students?.name || 'Someone';
    const val  = parseFloat(t.gross_value || 0);
    const qty  = parseFloat(t.quantity || 0);
    const price = parseFloat(t.price || 0);
    const actionLabel = { BUY: 'bought', SELL: 'sold', SHORT: 'shorted', COVER: 'covered' }[t.action] || t.action.toLowerCase();
    items.push({
      type:      'trade',
      id:        t.id,
      studentId: t.student_id,
      isMine:    t.student_id === student.id,
      ts:        t.created_at,
      action:    t.action,
      coin:      t.coin,
      name,
      actionLabel,
      qty:       qty,
      price:     price,
      value:     val,
      reasoning: t.reasoning || null,
      reactions: reactionsMap[t.id] || {},
    });
  });

  const BADGE_NAMES = {
    first_trade:'First Trade', active_trader:'Active Trader', power_trader:'Power Trader',
    whale:'Whale', doubled_up:'Doubled Up', first_profit:'First Profit', ten_pct:'+10%',
    to_the_moon:'To the Moon', diamond_hands:'Diamond Hands', diversified:'Diversified',
    sharpshooter:'Sharpshooter', analyst:'Analyst', researcher:'Researcher',
    crush_500:'Crush 500', crush_1000:'Crush 1000', first_lesson:'First Lesson',
    signal_found:'Signal Found', data_chef:'Data Chef', market_pulse:'Market Pulse',
  };
  (badgesRes.data || []).forEach(b => {
    items.push({
      type: 'badge', ts: b.earned_at,
      name: b.students?.name || 'Someone',
      badgeId: b.badge_id,
      badgeName: BADGE_NAMES[b.badge_id] || b.badge_id,
    });
  });

  (challengesRes.data || []).forEach(r => {
    items.push({
      type: 'challenge', ts: r.created_at,
      name: r.students?.name || 'Someone',
      tokens: r.tokens,
    });
  });

  items.sort((a, b) => b.ts.localeCompare(a.ts));
  return Response.json({ items: items.slice(0, 40), currentStudentId: student.id });
}
