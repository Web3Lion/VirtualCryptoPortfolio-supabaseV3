import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { lessonId, classId, answers } = await request.json();
  if (!lessonId || !classId || !answers) return Response.json({ error: 'lessonId, classId, answers required' }, { status: 400 });

  const email = session.user.email.toLowerCase();
  const { data: student } = await db.from('students').select('id').eq('email', email).single();
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  // Fetch lesson
  const { data: lesson } = await db.from('learn_lessons').select('tokens_reward, pass_threshold').eq('id', lessonId).single();
  if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });

  // Fetch questions then options separately (no FK constraint required)
  const { data: questions } = await db.from('learn_questions')
    .select('id, question_text, explanation').eq('lesson_id', lessonId);

  const questionIds = (questions || []).map(q => q.id);
  const { data: allOptions } = questionIds.length
    ? await db.from('learn_options').select('*').in('question_id', questionIds).order('order_index')
    : { data: [] };

  // Grade
  let correct = 0;
  const graded = (questions || []).map(q => {
    const opts = (allOptions || []).filter(o => o.question_id === q.id).sort((a, b) => a.order_index - b.order_index);
    const chosen = answers[q.id];
    const correctOpt = opts.find(o => o.is_correct);
    const isCorrect = !!(chosen && correctOpt && chosen === correctOpt.id);
    if (isCorrect) correct++;
    return {
      id: q.id,
      question_text: q.question_text,
      explanation: q.explanation,
      chosen_option_id: chosen || null,
      correct_option_id: correctOpt?.id || null,
      is_correct: isCorrect,
      options: opts,
    };
  });

  const total = graded.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= (lesson.pass_threshold || 75);

  // Save attempt
  await db.from('learn_attempts').insert({
    student_id: student.id,
    class_id: classId,
    lesson_id: lessonId,
    score,
    passed,
    answers,
    completed_at: new Date().toISOString(),
  });

  // Award tokens on first pass
  let tokensAwarded = 0;
  if (passed && lesson.tokens_reward > 0) {
    const { data: prevPasses } = await db.from('learn_attempts')
      .select('id')
      .eq('student_id', student.id)
      .eq('class_id', classId)
      .eq('lesson_id', lessonId)
      .eq('passed', true);

    // Only award if this is the first pass (count includes this one now)
    if ((prevPasses || []).length === 1) {
      const { data: rewardCfg } = await db.from('class_reward_config')
        .select('enabled').eq('class_id', classId).single();
      if (rewardCfg?.enabled) {
        await db.from('class_reward_ledger').insert({
          student_id: student.id,
          class_id: classId,
          tokens: lesson.tokens_reward,
          reason: `lesson:${lessonId}`,
        });
        tokensAwarded = lesson.tokens_reward;
      }
    }
  }

  return Response.json({ score, passed, correct, total, tokensAwarded, questions: graded });
}
