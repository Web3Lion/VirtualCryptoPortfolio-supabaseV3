import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

function isTeacher(session) {
  if (!TEACHER_EMAIL) return !!session;
  return session?.user?.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();
}

function blockContent(b) {
  if (b.type === 'video' || b.type === 'article') {
    return { url: b.url || '', title: b.title || '', description: b.description || '' };
  }
  if (b.type === 'divider') return {};
  return { text: b.text || '' };
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { classId, data } = await request.json();

  // Validate shape
  if (!data?.module?.title || !Array.isArray(data.lessons)) {
    return Response.json({ error: 'Invalid format. Needs module.title and lessons array.' }, { status: 400 });
  }

  const { module: mod, lessons } = data;

  // Create module
  const { data: createdMod, error: modErr } = await db.from('learn_modules').insert({
    class_id: classId || null,
    title: mod.title,
    description: mod.description || null,
    emoji: mod.emoji || '📚',
    order_index: mod.order_index || 0,
    is_published: false,
  }).select().single();

  if (modErr) return Response.json({ error: modErr.message }, { status: 500 });

  const results = [];

  for (const lesson of lessons) {
    // Create lesson
    const { data: createdLesson, error: lessonErr } = await db.from('learn_lessons').insert({
      module_id: createdMod.id,
      title: lesson.title,
      description: lesson.description || null,
      order_index: lesson.order_index || 0,
      tokens_reward: lesson.tokens_reward ?? 25,
      pass_threshold: lesson.pass_threshold ?? 75,
      questions_to_show: lesson.questions_to_show ?? 4,
      is_published: false,
    }).select().single();

    if (lessonErr) { results.push({ lesson: lesson.title, error: lessonErr.message }); continue; }

    // Create blocks
    if (Array.isArray(lesson.blocks) && lesson.blocks.length > 0) {
      await db.from('learn_blocks').insert(
        lesson.blocks.map((b, i) => ({
          lesson_id: createdLesson.id,
          block_type: b.type,
          content: blockContent(b),
          order_index: b.order_index ?? i + 1,
        }))
      );
    }

    // Create questions + options
    let questionsCreated = 0;
    if (Array.isArray(lesson.questions)) {
      for (let qi = 0; qi < lesson.questions.length; qi++) {
        const q = lesson.questions[qi];
        const { data: createdQ } = await db.from('learn_questions').insert({
          lesson_id: createdLesson.id,
          question_text: q.question,
          explanation: q.explanation || null,
          order_index: qi + 1,
        }).select().single();

        if (createdQ && Array.isArray(q.options)) {
          await db.from('learn_options').insert(
            q.options.map((opt, oi) => ({
              question_id: createdQ.id,
              option_text: opt,
              is_correct: oi === q.correct,
              order_index: oi,
            }))
          );
          questionsCreated++;
        }
      }
    }

    results.push({
      lesson: lesson.title,
      blocks: (lesson.blocks || []).length,
      questions: questionsCreated,
    });
  }

  return Response.json({ success: true, module: createdMod.title, moduleId: createdMod.id, lessons: results });
}
