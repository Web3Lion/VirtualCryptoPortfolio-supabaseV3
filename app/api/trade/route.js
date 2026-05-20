import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { executeTrade } from '@/lib/trade';
import { checkBadgesAfterTrade } from './badge-check';
import { db } from '@/lib/db';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid body' }, { status: 400 }); }

  const { action, coin, amountType, amount, reasoning, classId: bodyClassId } = body;

  if (!['BUY','SELL'].includes(action)) return Response.json({ error: 'Invalid action' }, { status: 400 });
  if (!coin || !amount || parseFloat(amount) <= 0) return Response.json({ error: 'Invalid coin or amount' }, { status: 400 });

  let classId = bodyClassId;
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ error: 'No class found' }, { status: 404 });

  const result = await executeTrade({
    studentId: student.id, classId, action,
    coin: coin.toUpperCase(),
    amountType: amountType || 'Dollar Amount',
    amount: parseFloat(amount),
    reasoning: reasoning || '',
  });

  if (!result.success) return Response.json({ error: result.error }, { status: 400 });

  // Check badges after successful trade
  let newBadge = null;
  let tokensAwarded = 0;
  try {
    const badgeResult = await checkBadgesAfterTrade({
      studentId:  student.id,
      classId,
      action,
      coin:       coin.toUpperCase(),
      grossValue: result.grossValue || parseFloat(amount),
      price:      result.price,
      reasoning:  reasoning || '',
      newCash:    result.newCash,
    });
    newBadge     = badgeResult?.badge ?? null;
    tokensAwarded = badgeResult?.tokensAwarded ?? 0;
  } catch (e) {
    console.error('Badge check error:', e);
  }

  return Response.json({ ...result, newBadge, tokensAwarded });
}
