import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

const ALLOWED_EMOJIS = ['👀', '💎', '🚀', '🔥', '📉', '🤝'];

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { tradeId, emoji } = await request.json();
  if (!tradeId || !emoji) return Response.json({ error: 'tradeId and emoji required' }, { status: 400 });
  if (!ALLOWED_EMOJIS.includes(emoji)) return Response.json({ error: 'Invalid emoji' }, { status: 400 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not found' }, { status: 404 });

  // Toggle: if already reacted with this emoji, remove it
  const { data: existing } = await db.from('trade_reactions')
    .select('id').eq('trade_id', tradeId).eq('student_id', student.id).eq('emoji', emoji).single();

  if (existing) {
    await db.from('trade_reactions').delete().eq('id', existing.id);
    return Response.json({ action: 'removed' });
  }

  // Remove any previous reaction by this student on this trade (one reaction per trade per student)
  await db.from('trade_reactions').delete().eq('trade_id', tradeId).eq('student_id', student.id);

  const { error } = await db.from('trade_reactions').insert({
    trade_id: tradeId, student_id: student.id, emoji,
  });

  if (error?.code === '42P01') return Response.json({ tableNotReady: true });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ action: 'added' });
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({});

  const { searchParams } = new URL(request.url);
  const tradeIds = searchParams.get('tradeIds')?.split(',').filter(Boolean) || [];
  if (!tradeIds.length) return Response.json({});

  const student = await getStudentByEmail(session.user.email);

  const { data, error } = await db.from('trade_reactions')
    .select('trade_id, emoji, student_id').in('trade_id', tradeIds);

  if (error?.code === '42P01') return Response.json({});

  // Group by trade_id: { tradeId: { emoji: count, __mine: emoji } }
  const result = {};
  (data || []).forEach(r => {
    if (!result[r.trade_id]) result[r.trade_id] = {};
    result[r.trade_id][r.emoji] = (result[r.trade_id][r.emoji] || 0) + 1;
    if (r.student_id === student?.id) result[r.trade_id].__mine = r.emoji;
  });
  return Response.json(result);
}
