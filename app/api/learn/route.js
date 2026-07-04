import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET — fetch all published modules + student progress
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');

  // Resolve classId from student membership
  const email = session.user.email.toLowerCase();
  const { data: studentRow } = await db.from('students').select('id').eq('email', email).single();

  if (!classId && studentRow) {
    const { data: cs } = await db.from('class_students').select('class_id').eq('student_id', studentRow.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }

  // Fetch modules (global + class-specific)
  const { data: modules, error } = await db.from('learn_modules')
    .select('*')
    .or(`class_id.is.null${classId ? `,class_id.eq.${classId}` : ''}`)
    .eq('is_published', true)
    .order('order_index');

  if (error?.code === '42P01') return Response.json({ notReady: true });

  // Fetch lessons for each module
  const moduleIds = (modules || []).map(m => m.id);
  let { data: lessons, error: lessonsErr } = moduleIds.length
    ? await db.from('learn_lessons').select('id, module_id, title, emoji, description, order_index, tokens_reward, pass_threshold, questions_to_show, is_published').in('module_id', moduleIds).eq('is_published', true).order('order_index')
    : { data: [] };

  if (lessonsErr) {
    // emoji column may not exist yet on this database — backfill it and retry once
    await db.rpc('run_sql', { query: "ALTER TABLE learn_lessons ADD COLUMN IF NOT EXISTS emoji TEXT DEFAULT '📚'" }).catch(() => {});
    const retry = moduleIds.length
      ? await db.from('learn_lessons').select('id, module_id, title, emoji, description, order_index, tokens_reward, pass_threshold, questions_to_show, is_published').in('module_id', moduleIds).eq('is_published', true).order('order_index')
      : { data: [] };
    lessons = retry.data;
  }

  // Fetch student attempts
  let attempts = [];
  if (studentRow && classId) {
    const lessonIds = (lessons || []).map(l => l.id);
    if (lessonIds.length) {
      const { data: att } = await db.from('learn_attempts').select('lesson_id, score, passed, completed_at').eq('student_id', studentRow.id).eq('class_id', classId).in('lesson_id', lessonIds).order('completed_at', { ascending: false });
      attempts = att || [];
    }
  }

  // Map attempts by lesson (best score)
  const progressMap = {};
  attempts.forEach(a => {
    if (!progressMap[a.lesson_id] || a.score > progressMap[a.lesson_id].score) {
      progressMap[a.lesson_id] = a;
    }
  });

  const result = (modules || []).map(m => ({
    ...m,
    lessons: (lessons || [])
      .filter(l => l.module_id === m.id)
      .map(l => ({ ...l, progress: progressMap[l.id] || null })),
  }));

  return Response.json(result);
}
