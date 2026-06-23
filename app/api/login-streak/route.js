import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';
import { decideLoginStreak } from '@/lib/loginStreak.mjs';

const today = () => new Date().toISOString().slice(0, 10);

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
  if (!classId) return Response.json({ error: 'No class' }, { status: 404 });

  const { data: ledger } = await db.from('class_reward_ledger').select('tokens, reason')
    .eq('student_id', student.id).eq('class_id', classId)
    .or('reason.like.login_streak:%,reason.like.freeze_used:%,reason.eq.store:streak_freeze');

  const { data: cfg } = await db.from('class_reward_config').select('enabled').eq('class_id', classId).single();

  const result = decideLoginStreak(ledger || [], today(), { allowAward: !!cfg?.enabled });

  if (result.inserts.length) {
    try {
      await db.from('class_reward_ledger').insert(
        result.inserts.map(i => ({ student_id: student.id, class_id: classId, ...i }))
      );
    } catch {}
  }

  const { inserts, ...response } = result;
  return Response.json({ ...response, date: today() });
}
