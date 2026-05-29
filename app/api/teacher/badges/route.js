import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  if (TEACHER_EMAIL && session.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data } = await db.from('classes').select('id').eq('teacher_email', session.user.email).order('created_at', { ascending: false }).limit(1).single();
    classId = data?.id;
  }
  if (!classId) return Response.json({ students: [] });

  // Get all students in this class with their names
  const { data: classStudents } = await db.from('class_students')
    .select('student_id, students(id, name, email)')
    .eq('class_id', classId);

  const studentList = (classStudents || []).map(cs => ({
    id: cs.student_id,
    name: cs.students?.name || cs.students?.email || 'Unknown',
  }));

  if (!studentList.length) return Response.json({ students: [] });

  // Get all badges for this class
  const studentIds = studentList.map(s => s.id);
  const { data: badges } = await db.from('badges')
    .select('student_id, badge_id, earned_at')
    .eq('class_id', classId)
    .in('student_id', studentIds)
    .order('earned_at', { ascending: false });

  const badgesByStudent = {};
  (badges || []).forEach(b => {
    if (!badgesByStudent[b.student_id]) badgesByStudent[b.student_id] = [];
    badgesByStudent[b.student_id].push({ badge_id: b.badge_id, earned_at: b.earned_at });
  });

  return Response.json({
    students: studentList.map(s => ({
      ...s,
      badges: badgesByStudent[s.id] || [],
    })),
  });
}
