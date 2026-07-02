import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ modules: [] });

  const { data: modules } = await db.from('learn_modules')
    .select('id, title, emoji, order_index').order('order_index');

  if (!modules?.length) return Response.json({ modules: [] });

  const moduleIds = modules.map(m => m.id);
  const [lessonsRes, attemptsRes] = await Promise.all([
    db.from('learn_lessons')
      .select('id, module_id, title, order_index, is_published, tokens_reward')
      .in('module_id', moduleIds).eq('is_published', true).order('order_index'),
    db.from('learn_attempts')
      .select('lesson_id, passed, score')
      .eq('student_id', student.id).eq('class_id', classId),
  ]);

  const lessons = lessonsRes.data || [];
  const attempts = attemptsRes.data || [];

  // Best attempt per lesson
  const bestByLesson = {};
  attempts.forEach(a => {
    const prev = bestByLesson[a.lesson_id];
    if (!prev || a.score > prev.score) bestByLesson[a.lesson_id] = a;
  });

  const result = modules.map(m => ({
    id: m.id,
    title: m.title,
    emoji: m.emoji,
    lessons: lessons
      .filter(l => l.module_id === m.id)
      .map(l => {
        const best = bestByLesson[l.id];
        return {
          id: l.id,
          title: l.title,
          tokensReward: l.tokens_reward,
          attempted: !!best,
          passed: !!best?.passed,
          bestScore: best ? Math.round(best.score || 0) : null,
        };
      }),
  })).filter(m => m.lessons.length > 0);

  return Response.json({ modules: result });
}
