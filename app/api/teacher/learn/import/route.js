import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

function isTeacher(session) {
  if (!TEACHER_EMAIL) return !!session;
  return session?.user?.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();
}

// POST — import a single lesson into an existing module
// Body: { moduleTitle: string, lesson: LessonJSON }
// LessonJSON.blocks use { block_type, content, order_index }
// LessonJSON.questions use { question_text, explanation, options: [{ option_text, is_correct }] }
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const body = await request.json();
  const { moduleTitle, lesson } = body;

  if (!moduleTitle || !lesson) {
    return Response.json({ error: 'moduleTitle and lesson are required' }, { status: 400 });
  }

  // Find the module by title
  const { data: mod, error: modErr } = await db
    .from('learn_modules')
    .select('id')
    .eq('title', moduleTitle)
    .maybeSingle();

  if (modErr || !mod) {
    return Response.json({ error: `Module "${moduleTitle}" not found. Seed modules first.` }, { status: 404 });
  }

  // Reject duplicate lesson title in this module
  const { data: dupLesson } = await db
    .from('learn_lessons')
    .select('id')
    .eq('module_id', mod.id)
    .eq('title', lesson.title)
    .maybeSingle();

  if (dupLesson) {
    return Response.json({ error: `Lesson "${lesson.title}" already exists in this module.` }, { status: 409 });
  }

  // Auto-increment order_index
  const { data: existing } = await db
    .from('learn_lessons')
    .select('order_index')
    .eq('module_id', mod.id)
    .order('order_index', { ascending: false })
    .limit(1);
  const nextOrder = existing?.length ? (existing[0].order_index + 1) : 1;

  // Create lesson
  const { data: newLesson, error: lessonErr } = await db.from('learn_lessons').insert({
    module_id: mod.id,
    title: lesson.title,
    description: lesson.description || '',
    order_index: nextOrder,
    tokens_reward: lesson.tokens_reward ?? 25,
    pass_threshold: lesson.pass_threshold ?? 70,
    questions_to_show: lesson.questions_to_show ?? 5,
    is_published: lesson.is_published ?? false,
  }).select().single();

  if (lessonErr) return Response.json({ error: lessonErr.message }, { status: 500 });

  // Insert blocks
  if (lesson.blocks?.length) {
    await db.from('learn_blocks').insert(
      lesson.blocks.map(b => ({
        lesson_id: newLesson.id,
        block_type: b.block_type,
        content: b.content,
        order_index: b.order_index,
      }))
    );
  }

  // Insert questions + options
  let questionCount = 0;
  for (let qi = 0; qi < (lesson.questions || []).length; qi++) {
    const q = lesson.questions[qi];
    const { data: newQ, error: qErr } = await db.from('learn_questions').insert({
      lesson_id: newLesson.id,
      question_text: q.question_text,
      explanation: q.explanation || '',
      order_index: qi + 1,
    }).select().single();

    if (qErr) continue;
    questionCount++;

    await db.from('learn_options').insert(
      (q.options || []).map((o, i) => ({
        question_id: newQ.id,
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_index: i,
      }))
    );
  }

  return Response.json({ success: true, lessonId: newLesson.id, questionCount });
}
