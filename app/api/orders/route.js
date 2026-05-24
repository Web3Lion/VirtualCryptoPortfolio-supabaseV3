import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { data: student } = await db.from('students').select('id').eq('email', session.user.email.toLowerCase()).single();
  if (!student) return Response.json([]);

  const { data, error } = await db.from('pending_orders')
    .select('*')
    .eq('student_id', student.id)
    .in('status', ['pending'])
    .order('created_at', { ascending: false });

  if (error?.code === '42P01') return Response.json({ tableNotReady: true });
  return Response.json(data || []);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { coin, action, amount, amountType, limitPrice, leverageMultiplier = 1, reasoning, classId } = body;

  if (!coin || !action || !amount || !limitPrice || !classId)
    return Response.json({ error: 'coin, action, amount, limitPrice, classId required' }, { status: 400 });
  if (!['BUY', 'SELL', 'SHORT'].includes(action))
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  if (parseFloat(limitPrice) <= 0)
    return Response.json({ error: 'Limit price must be greater than 0' }, { status: 400 });

  const { data: student } = await db.from('students').select('id').eq('email', session.user.email.toLowerCase()).single();
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  const { data: order, error } = await db.from('pending_orders').insert({
    student_id:          student.id,
    class_id:            classId,
    coin:                coin.toUpperCase(),
    action,
    amount:              parseFloat(amount),
    amount_type:         amountType || 'Dollar Amount',
    limit_price:         parseFloat(limitPrice),
    leverage_multiplier: parseFloat(leverageMultiplier) || 1,
    reasoning:           reasoning || null,
    status:              'pending',
  }).select().single();

  if (error?.code === '42P01') return Response.json({ error: 'Orders table not set up yet. Ask your teacher to run the migration.' }, { status: 503 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, order });
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const { data: student } = await db.from('students').select('id').eq('email', session.user.email.toLowerCase()).single();
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  await db.from('pending_orders')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('student_id', student.id)
    .eq('status', 'pending');

  return Response.json({ success: true });
}
