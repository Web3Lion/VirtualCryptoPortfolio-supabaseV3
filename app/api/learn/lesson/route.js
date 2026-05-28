import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET ?lessonId=xxx — full lesson content + shuffled questions
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get('lessonId');
  if (!lessonId) return Response.json({ error: 'lessonId required' }, { status: 400 });

  const [lessonRes, blocksRes, questionsRes] = await Promise.all([
    db.from('learn_lessons').select('*').eq('id', lessonId).single(),
    db.from('learn_blocks').select('*').eq('lesson_id', lessonId).order('order_index'),
    db.from('learn_questions').select('*').eq('lesson_id', lessonId).order('order_index'),
  ]);

  const lesson = lessonRes.data;
  if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });

  // Fetch options separately (no FK constraint required)
  const questionIds = (questionsRes.data || []).map(q => q.id);
  const { data: allOptions } = questionIds.length
    ? await db.from('learn_options').select('*').in('question_id', questionIds).order('order_index')
    : { data: [] };

  // Shuffle and limit questions
  const allQ = (questionsRes.data || []).map(q => ({
    ...q,
    options: (allOptions || [])
      .filter(o => o.question_id === q.id)
      .sort((a, b) => a.order_index - b.order_index)
      .map(o => ({ id: o.id, option_text: o.option_text, order_index: o.order_index })),
  }));
  const shuffled = [...allQ].sort(() => Math.random() - 0.5).slice(0, lesson.questions_to_show || allQ.length);

  return Response.json({
    lesson,
    blocks: blocksRes.data || [],
    questions: shuffled,
  });
}
