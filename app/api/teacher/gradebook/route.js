import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');

  if (!classId) {
    const { data: cls } = await db.from('classes').select('id').eq('teacher_email', TEACHER_EMAIL).order('created_at', { ascending: false }).limit(1).single();
    classId = cls?.id;
  }
  if (!classId) return Response.json({ error: 'No class found' }, { status: 404 });

  const [studentsRes, modulesRes, attemptsRes] = await Promise.all([
    db.from('class_students').select('student_id, students(id, name, email)').eq('class_id', classId),
    db.from('learn_modules').select('id, title, emoji, order_index').order('order_index'),
    db.from('learn_attempts').select('student_id, lesson_id, passed, score, created_at').eq('class_id', classId).order('created_at', { ascending: false }),
  ]);

  const students = (studentsRes.data || []).map(r => r.students).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  const modules  = modulesRes.data || [];
  const moduleIds = modules.map(m => m.id);

  let lessons = [];
  if (moduleIds.length) {
    const { data: l } = await db.from('learn_lessons')
      .select('id, module_id, title, order_index, is_published')
      .in('module_id', moduleIds).order('order_index');
    lessons = l || [];
  }

  // Best attempt per student per lesson
  const bestAttempt = {};
  (attemptsRes.data || []).forEach(a => {
    const key = `${a.student_id}:${a.lesson_id}`;
    const prev = bestAttempt[key];
    if (!prev || a.score > prev.score) bestAttempt[key] = a;
  });

  // Attempt counts per student per lesson
  const attemptCounts = {};
  (attemptsRes.data || []).forEach(a => {
    const key = `${a.student_id}:${a.lesson_id}`;
    attemptCounts[key] = (attemptCounts[key] || 0) + 1;
  });

  const modulesWithLessons = modules.map(m => ({
    ...m,
    lessons: lessons.filter(l => l.module_id === m.id),
  }));

  const rows = students.map(s => {
    const lessonResults = {};
    lessons.forEach(l => {
      const key = `${s.id}:${l.id}`;
      const best = bestAttempt[key];
      lessonResults[l.id] = best
        ? { passed: best.passed, score: Math.round(best.score || 0), attempts: attemptCounts[key] || 1, date: best.created_at }
        : null;
    });
    const passed  = Object.values(lessonResults).filter(r => r?.passed).length;
    const total   = lessons.length;
    return { id: s.id, name: s.name, email: s.email, lessonResults, passed, total };
  });

  return Response.json({ modules: modulesWithLessons, students: rows, totalLessons: lessons.length });
}
