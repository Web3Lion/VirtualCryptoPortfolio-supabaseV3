import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkBadgesAfterLesson } from '@/app/api/learn/badge-check';

// POST — mark a game-type lesson as complete and award tokens (first completion only)
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { lessonId, classId } = await request.json();
  if (!lessonId || !classId) return Response.json({ error: 'lessonId and classId required' }, { status: 400 });

  const email = session.user.email.toLowerCase();
  const { data: student } = await db.from('students').select('id').eq('email', email).single();
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  const { data: lesson } = await db.from('learn_lessons').select('tokens_reward').eq('id', lessonId).single();
  if (!lesson) return Response.json({ error: 'Lesson not found' }, { status: 404 });

  // Record attempt as auto-passed (score 100)
  await db.from('learn_attempts').insert({
    student_id: student.id,
    class_id: classId,
    lesson_id: lessonId,
    score: 100,
    passed: true,
    answers: {},
    completed_at: new Date().toISOString(),
  });

  // Award tokens on first completion only
  let tokensAwarded = 0;
  if (lesson.tokens_reward > 0) {
    const { data: prevPasses } = await db.from('learn_attempts')
      .select('id')
      .eq('student_id', student.id)
      .eq('class_id', classId)
      .eq('lesson_id', lessonId)
      .eq('passed', true);

    if ((prevPasses || []).length === 1) {
      const { data: cfg } = await db.from('class_reward_config').select('enabled').eq('class_id', classId).single();
      if (cfg?.enabled) {
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

  const badgeResult = await checkBadgesAfterLesson({ studentId: student.id, classId });
  tokensAwarded += badgeResult.tokensAwarded;

  return Response.json({ success: true, tokensAwarded, newBadges: badgeResult.newBadges });
}
