import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { classId, studentId, email, amount, note, all } = await request.json();
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const tokens = Math.floor(parseInt(amount) || 0);
  if (tokens === 0) return Response.json({ error: 'Amount must be at least 1 token' }, { status: 400 });

  const reason = `teacher_grant:${(note || 'Teacher award').trim()}`;

  if (all) {
    const { data: enrolled } = await db
      .from('class_students')
      .select('student_id')
      .eq('class_id', classId);

    if (!enrolled?.length) return Response.json({ error: 'No students found in this class' }, { status: 404 });

    await db.from('class_reward_ledger').insert(
      enrolled.map(r => ({ student_id: r.student_id, class_id: classId, tokens, reason }))
    );
    return Response.json({ success: true, count: enrolled.length });
  }

  // Grant by studentId (direct) or by email (lookup)
  let sid = studentId;
  if (!sid && email) {
    const { data: student } = await db
      .from('students')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();
    if (!student) return Response.json({ error: `No student found with email ${email}` }, { status: 404 });
    sid = student.id;
  }
  if (!sid) return Response.json({ error: 'studentId or email required' }, { status: 400 });

  await db.from('class_reward_ledger').insert({ student_id: sid, class_id: classId, tokens, reason });
  return Response.json({ success: true, count: 1 });
}
