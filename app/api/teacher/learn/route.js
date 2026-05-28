import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

function isTeacher(session) {
  if (!TEACHER_EMAIL) return !!session;
  return session?.user?.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();
}

// GET ?classId=xxx  — list modules + lessons + question counts
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');

  const { data: modules } = await db.from('learn_modules')
    .select('*')
    .or(`class_id.is.null${classId ? `,class_id.eq.${classId}` : ''}`)
    .order('order_index');

  const moduleIds = (modules || []).map(m => m.id);
  const [lessonsRes, questionsRes] = await Promise.all([
    moduleIds.length
      ? db.from('learn_lessons').select('*').in('module_id', moduleIds).order('order_index')
      : Promise.resolve({ data: [] }),
    moduleIds.length
      ? db.from('learn_questions').select('id, lesson_id').in(
          'lesson_id',
          // will be filtered below; fetch broadly
          (await (moduleIds.length
            ? db.from('learn_lessons').select('id').in('module_id', moduleIds)
            : Promise.resolve({ data: [] })
          )).data?.map(l => l.id) || []
        )
      : Promise.resolve({ data: [] }),
  ]);

  const questionCountByLesson = {};
  (questionsRes.data || []).forEach(q => {
    questionCountByLesson[q.lesson_id] = (questionCountByLesson[q.lesson_id] || 0) + 1;
  });

  const result = (modules || []).map(m => ({
    ...m,
    lessons: (lessonsRes.data || [])
      .filter(l => l.module_id === m.id)
      .map(l => ({ ...l, question_count: questionCountByLesson[l.id] || 0 })),
  }));

  return Response.json(result);
}

// POST — create module, lesson, question, or option
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const body = await request.json();
  const { type } = body;

  if (type === 'module') {
    const { classId, title, description, emoji, orderIndex } = body;
    const { data, error } = await db.from('learn_modules').insert({
      class_id: classId || null,
      title,
      description: description || null,
      emoji: emoji || '📚',
      order_index: orderIndex || 0,
      is_published: false,
    }).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  if (type === 'lesson') {
    const { moduleId, title, description, tokensReward, passThreshold, questionsToShow, orderIndex } = body;
    const { data, error } = await db.from('learn_lessons').insert({
      module_id: moduleId,
      title,
      description: description || null,
      tokens_reward: tokensReward ?? 25,
      pass_threshold: passThreshold ?? 75,
      questions_to_show: questionsToShow ?? 4,
      order_index: orderIndex || 0,
      is_published: false,
    }).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  if (type === 'question') {
    const { lessonId, questionText, explanation, orderIndex, options } = body;
    const { data: q, error } = await db.from('learn_questions').insert({
      lesson_id: lessonId,
      question_text: questionText,
      explanation: explanation || null,
      order_index: orderIndex || 0,
    }).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });

    if (options?.length) {
      await db.from('learn_options').insert(
        options.map((o, i) => ({
          question_id: q.id,
          option_text: o.text,
          is_correct: !!o.isCorrect,
          order_index: i,
        }))
      );
    }
    return Response.json(q);
  }

  if (type === 'block') {
    const { lessonId, blockType, content, orderIndex } = body;
    const { data, error } = await db.from('learn_blocks').insert({
      lesson_id: lessonId,
      block_type: blockType,
      content: content || {},
      order_index: orderIndex || 0,
    }).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  return Response.json({ error: 'Unknown type' }, { status: 400 });
}

// PUT — update module, lesson, question, or toggle publish
export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const body = await request.json();
  const { type, id } = body;

  if (type === 'module') {
    const { title, description, emoji, orderIndex, isPublished } = body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (emoji !== undefined) updates.emoji = emoji;
    if (orderIndex !== undefined) updates.order_index = orderIndex;
    if (isPublished !== undefined) updates.is_published = isPublished;
    const { data, error } = await db.from('learn_modules').update(updates).eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  if (type === 'lesson') {
    const { title, description, tokensReward, passThreshold, questionsToShow, orderIndex, isPublished } = body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (tokensReward !== undefined) updates.tokens_reward = tokensReward;
    if (passThreshold !== undefined) updates.pass_threshold = passThreshold;
    if (questionsToShow !== undefined) updates.questions_to_show = questionsToShow;
    if (orderIndex !== undefined) updates.order_index = orderIndex;
    if (isPublished !== undefined) updates.is_published = isPublished;
    const { data, error } = await db.from('learn_lessons').update(updates).eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json(data);
  }

  return Response.json({ error: 'Unknown type' }, { status: 400 });
}

// DELETE — delete module, lesson, question, or block
export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id   = searchParams.get('id');
  if (!type || !id) return Response.json({ error: 'type and id required' }, { status: 400 });

  const TABLE = { module: 'learn_modules', lesson: 'learn_lessons', question: 'learn_questions', block: 'learn_blocks' }[type];
  if (!TABLE) return Response.json({ error: 'Unknown type' }, { status: 400 });

  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
