import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

async function getStudent(email) {
  const { data } = await db.from('students').select('id').eq('email', email.toLowerCase()).single();
  return data;
}
async function getClassId(studentId) {
  const { data } = await db.from('class_students').select('class_id')
    .eq('student_id', studentId).order('joined_at', { ascending: false }).limit(1).single();
  return data?.class_id;
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudent(session.user.email);
  if (!student) return Response.json([]);
  const classId = await getClassId(student.id);
  if (!classId) return Response.json([]);

  const { data, error } = await db.from('dca_orders')
    .select('*').eq('student_id', student.id).eq('class_id', classId)
    .eq('active', true).order('created_at', { ascending: false });

  if (error?.code === '42P01') return Response.json({ tableNotReady: true });
  return Response.json(data || []);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { coin, amountUsd, frequency, classId: bodyClassId } = body;
  if (!coin || !amountUsd || !frequency)
    return Response.json({ error: 'coin, amountUsd, frequency required' }, { status: 400 });
  if (!['daily', 'weekly'].includes(frequency))
    return Response.json({ error: 'frequency must be daily or weekly' }, { status: 400 });
  if (parseFloat(amountUsd) < 1)
    return Response.json({ error: 'Minimum $1 per DCA' }, { status: 400 });

  const student = await getStudent(session.user.email);
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });
  const classId = bodyClassId || await getClassId(student.id);
  if (!classId) return Response.json({ error: 'No class found' }, { status: 404 });

  const nextRun = new Date();
  nextRun.setUTCHours(16, 0, 0, 0); // 4pm UTC daily
  if (nextRun <= new Date()) nextRun.setDate(nextRun.getDate() + 1);

  const { data, error } = await db.from('dca_orders').insert({
    student_id:  student.id,
    class_id:    classId,
    coin:        coin.toUpperCase(),
    amount_usd:  parseFloat(amountUsd),
    frequency,
    next_run_at: nextRun.toISOString(),
    active:      true,
  }).select().single();

  if (error?.code === '42P01') return Response.json({ error: 'DCA table not set up — ask your teacher to enable it.' }, { status: 503 });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true, data });
}

export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await request.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  const student = await getStudent(session.user.email);
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });
  await db.from('dca_orders').update({ active: false }).eq('id', id).eq('student_id', student.id);
  return Response.json({ success: true });
}
