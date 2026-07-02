import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

function isTeacher(session) {
  return session?.user?.email?.toLowerCase() === TEACHER_EMAIL?.toLowerCase();
}

// GET ?action=modules → [{id, title, emoji, lessons:[{id,title,order_index}]}]
// GET ?lessonId=UUID   → full lesson with blocks, questions, options
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get('lessonId');

  if (lessonId) {
    // Full lesson fetch
    const { data: lesson, error: lErr } = await db.from('learn_lessons')
      .select('id, module_id, title, description, order_index, tokens_reward, pass_threshold, questions_to_show, is_published')
      .eq('id', lessonId).single();
    if (lErr || !lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });

    const [{ data: blocks }, { data: questions }] = await Promise.all([
      db.from('learn_blocks').select('id, block_type, content, order_index').eq('lesson_id', lessonId).order('order_index'),
      db.from('learn_questions').select('id, question_text, explanation, order_index').eq('lesson_id', lessonId).order('order_index'),
    ]);

    const questionIds = (questions || []).map(q => q.id);
    let options = [];
    if (questionIds.length) {
      const { data: opts } = await db.from('learn_options')
        .select('id, question_id, option_text, is_correct, order_index')
        .in('question_id', questionIds).order('order_index');
      options = opts || [];
    }

    const questionsWithOptions = (questions || []).map(q => ({
      ...q,
      options: options.filter(o => o.question_id === q.id),
    }));

    return Response.json({ lesson, blocks: blocks || [], questions: questionsWithOptions });
  }

  // Module + lesson list
  const { data: modules } = await db.from('learn_modules').select('id, title, emoji, order_index').order('order_index');
  const moduleIds = (modules || []).map(m => m.id);
  let lessons = [];
  if (moduleIds.length) {
    const { data: l } = await db.from('learn_lessons')
      .select('id, module_id, title, order_index, is_published')
      .in('module_id', moduleIds).order('order_index');
    lessons = l || [];
  }

  const result = (modules || []).map(m => ({
    ...m,
    lessons: lessons.filter(l => l.module_id === m.id),
  }));

  return Response.json(result);
}

// PATCH — save lesson metadata, blocks, questions+options
export async function PATCH(request) {
  const session = await getServerSession(authOptions);
  if (!isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (!body?.lessonId) return Response.json({ error: 'Missing lessonId' }, { status: 400 });

  const { lessonId, lesson, blocks, questions } = body;
  const errors = [];

  // 1. Update lesson metadata
  if (lesson) {
    const { error } = await db.from('learn_lessons').update({
      title: lesson.title,
      description: lesson.description,
      tokens_reward: lesson.tokens_reward,
      pass_threshold: lesson.pass_threshold,
      questions_to_show: lesson.questions_to_show,
      is_published: lesson.is_published,
    }).eq('id', lessonId);
    if (error) errors.push(`lesson: ${error.message}`);
  }

  // 2. Update blocks (upsert existing, delete removed)
  if (blocks) {
    const existingIds = blocks.filter(b => b.id && !b.id.startsWith('new_')).map(b => b.id);
    // Delete blocks that were removed
    const { data: currentBlocks } = await db.from('learn_blocks').select('id').eq('lesson_id', lessonId);
    const toDelete = (currentBlocks || []).map(b => b.id).filter(id => !existingIds.includes(id));
    if (toDelete.length) await db.from('learn_blocks').delete().in('id', toDelete);

    for (const block of blocks) {
      if (block.id && !block.id.startsWith('new_')) {
        const { error } = await db.from('learn_blocks').update({
          block_type: block.block_type,
          content: block.content,
          order_index: block.order_index,
        }).eq('id', block.id);
        if (error) errors.push(`block ${block.id}: ${error.message}`);
      } else {
        const { error } = await db.from('learn_blocks').insert({
          lesson_id: lessonId,
          block_type: block.block_type,
          content: block.content,
          order_index: block.order_index,
        });
        if (error) errors.push(`new block: ${error.message}`);
      }
    }
  }

  // 3. Update questions + options
  if (questions) {
    const { data: currentQs } = await db.from('learn_questions').select('id').eq('lesson_id', lessonId);
    const existingQIds = questions.filter(q => q.id && !q.id.startsWith('new_')).map(q => q.id);
    const qToDelete = (currentQs || []).map(q => q.id).filter(id => !existingQIds.includes(id));

    if (qToDelete.length) {
      await db.from('learn_options').delete().in('question_id', qToDelete);
      await db.from('learn_questions').delete().in('id', qToDelete);
    }

    for (const q of questions) {
      let questionId = q.id;
      if (q.id && !q.id.startsWith('new_')) {
        const { error } = await db.from('learn_questions').update({
          question_text: q.question_text,
          explanation: q.explanation,
          order_index: q.order_index,
        }).eq('id', q.id);
        if (error) errors.push(`question ${q.id}: ${error.message}`);
      } else {
        const { data: inserted, error } = await db.from('learn_questions').insert({
          lesson_id: lessonId,
          question_text: q.question_text,
          explanation: q.explanation,
          order_index: q.order_index,
        }).select('id').single();
        if (error) { errors.push(`new question: ${error.message}`); continue; }
        questionId = inserted.id;
      }

      if (q.options) {
        await db.from('learn_options').delete().eq('question_id', questionId);
        for (const opt of q.options) {
          const { error } = await db.from('learn_options').insert({
            question_id: questionId,
            option_text: opt.option_text,
            is_correct: !!opt.is_correct,
            order_index: opt.order_index,
          });
          if (error) errors.push(`option: ${error.message}`);
        }
      }
    }
  }

  if (errors.length) return Response.json({ error: errors.join('; ') }, { status: 500 });
  return Response.json({ success: true });
}
