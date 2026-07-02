import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ assignments: [] });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id').eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ assignments: [] });

  // Get active assignments for this class
  const { data: assignments, error } = await db.from('assignments')
    .select('id, lesson_id, title, description, due_at, created_at')
    .eq('class_id', classId)
    .eq('active', true)
    .order('due_at', { ascending: true, nullsFirst: false });

  if (error?.code === '42703') return Response.json({ assignments: [] }); // column missing

  if (!assignments?.length) return Response.json({ assignments: [] });

  // Fetch lesson titles
  const lessonIds = [...new Set(assignments.map(a => a.lesson_id).filter(Boolean))];
  let lessonMap = {};
  if (lessonIds.length) {
    const { data: lessons } = await db.from('learn_lessons').select('id, title').in('id', lessonIds);
    (lessons || []).forEach(l => { lessonMap[l.id] = l.title; });
  }

  // Fetch student completions
  const { data: completions } = await db.from('assignment_completions')
    .select('assignment_id')
    .eq('student_id', student.id)
    .in('assignment_id', assignments.map(a => a.id));

  const completedIds = new Set((completions || []).map(c => c.assignment_id));

  // Check lesson pass status for lesson-linked assignments
  let passedLessons = new Set();
  if (lessonIds.length) {
    const { data: attempts } = await db.from('learn_attempts')
      .select('lesson_id')
      .eq('student_id', student.id)
      .eq('class_id', classId)
      .eq('passed', true)
      .in('lesson_id', lessonIds);
    (attempts || []).forEach(a => passedLessons.add(a.lesson_id));
  }

  return Response.json({
    assignments: assignments.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueAt: a.due_at,
      createdAt: a.created_at,
      lessonId: a.lesson_id,
      lessonTitle: a.lesson_id ? lessonMap[a.lesson_id] : null,
      completed: completedIds.has(a.id) || (a.lesson_id ? passedLessons.has(a.lesson_id) : false),
      overdue: a.due_at ? new Date(a.due_at) < new Date() : false,
    })),
  });
}
