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

// GET - fetch watchlist for current student
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudent(session.user.email);
  if (!student) return Response.json([]);

  const classId = await getClassId(student.id);
  if (!classId) return Response.json([]);

  const { data, error } = await db.from('watchlist')
    .select('*')
    .eq('student_id', student.id)
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (error) return Response.json([]);
  return Response.json(data || []);
}

// POST - add watchlist alert
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { coin, targetPrice, direction, classId: bodyClassId } = body;

  if (!coin || !targetPrice || !direction)
    return Response.json({ error: 'coin, targetPrice, direction required' }, { status: 400 });

  const student = await getStudent(session.user.email);
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  const classId = bodyClassId || await getClassId(student.id);
  if (!classId) return Response.json({ error: 'No class found' }, { status: 404 });

  // Check how many alerts student has (for badge logic)
  const { data: existing } = await db.from('watchlist')
    .select('id').eq('student_id', student.id).eq('class_id', classId);
  const count = (existing || []).length;

  const { data, error } = await db.from('watchlist').insert({
    student_id:   student.id,
    class_id:     classId,
    coin:         coin.toUpperCase(),
    target_price: parseFloat(targetPrice),
    direction:    direction,
    created_at:   new Date().toISOString(),
  }).select().single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Badge checks
  let newBadge = null;
  const newCount = count + 1;
  if (newCount === 1)  newBadge = 'first_watch';
  if (newCount === 10) newBadge = 'serious_watch';
  if (newCount === 20) newBadge = 'veteran_watch';

  if (newBadge) {
    await db.from('badges').upsert({
      student_id: student.id,
      class_id:   classId,
      badge_id:   newBadge,
      earned_at:  new Date().toISOString(),
    }, { onConflict: 'student_id,class_id,badge_id' });
  }

  return Response.json({ success: true, data, newBadge });
}

// DELETE - remove watchlist alert
export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await request.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  const student = await getStudent(session.user.email);
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  await db.from('watchlist').delete()
    .eq('id', id).eq('student_id', student.id);

  return Response.json({ success: true });
}