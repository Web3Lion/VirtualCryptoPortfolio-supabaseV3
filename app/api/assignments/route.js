import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// GET — student fetches active assignments for their class
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');

  // Teacher fetching with completions
  const isTeacher = TEACHER_EMAIL && session.user.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();
  if (isTeacher && !classId) return Response.json([]);

  if (!classId) {
    const student = await getStudentByEmail(session.user.email);
    if (!student) return Response.json([]);
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json([]);

  const { data: assignments, error } = await db.from('assignments')
    .select('*').eq('class_id', classId).eq('active', true)
    .order('due_at', { ascending: true, nullsFirst: false });

  if (error?.code === '42P01') return Response.json({ tableNotReady: true });

  if (isTeacher) {
    // Include completions per assignment
    const ids = (assignments || []).map(a => a.id);
    const { data: completions } = ids.length
      ? await db.from('assignment_completions').select('assignment_id, student_id, students(name)').in('assignment_id', ids)
      : { data: [] };

    const compMap = {};
    (completions || []).forEach(c => {
      if (!compMap[c.assignment_id]) compMap[c.assignment_id] = [];
      compMap[c.assignment_id].push({ studentId: c.student_id, name: c.students?.name });
    });

    const { data: classStudents } = await db.from('class_students')
      .select('student_id, students(name, is_bot)').eq('class_id', classId);
    const totalStudents = (classStudents || []).filter(r => !r.students?.is_bot).length;

    return Response.json((assignments || []).map(a => ({
      ...a,
      completions: compMap[a.id] || [],
      totalStudents,
    })));
  }

  // Student — just return assignments with their own completion status
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json([]);
  const ids = (assignments || []).map(a => a.id);
  const { data: myCompletions } = ids.length
    ? await db.from('assignment_completions').select('assignment_id')
        .in('assignment_id', ids).eq('student_id', student.id)
    : { data: [] };
  const doneSet = new Set((myCompletions || []).map(c => c.assignment_id));

  return Response.json((assignments || []).map(a => ({ ...a, completed: doneSet.has(a.id) })));
}

// POST — teacher creates / manages; student marks complete
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { action } = body;
  const isTeacher = TEACHER_EMAIL && session.user.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();

  // Teacher: create assignment
  if (action === 'create') {
    if (!isTeacher) return Response.json({ error: 'Teacher only' }, { status: 403 });
    const { classId, title, description, dueAt } = body;
    if (!classId || !title) return Response.json({ error: 'classId and title required' }, { status: 400 });

    const { data, error } = await db.from('assignments').insert({
      class_id: classId, title, description: description || null,
      due_at: dueAt || null, active: true,
    }).select().single();

    if (error?.code === '42P01') return Response.json({ error: 'Run the assignments migration first.' }, { status: 503 });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true, assignment: data });
  }

  // Teacher: archive (soft-delete) assignment
  if (action === 'archive') {
    if (!isTeacher) return Response.json({ error: 'Teacher only' }, { status: 403 });
    await db.from('assignments').update({ active: false }).eq('id', body.id);
    return Response.json({ success: true });
  }

  // Teacher: mark a student complete
  if (action === 'mark-complete') {
    if (!isTeacher) return Response.json({ error: 'Teacher only' }, { status: 403 });
    const { assignmentId, studentId, classId } = body;
    await db.from('assignment_completions')
      .upsert({ assignment_id: assignmentId, student_id: studentId, class_id: classId },
               { onConflict: 'assignment_id,student_id' });
    return Response.json({ success: true });
  }

  // Teacher: unmark complete
  if (action === 'unmark-complete') {
    if (!isTeacher) return Response.json({ error: 'Teacher only' }, { status: 403 });
    await db.from('assignment_completions')
      .delete().eq('assignment_id', body.assignmentId).eq('student_id', body.studentId);
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
