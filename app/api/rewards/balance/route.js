import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ balance: 0, ledger: [] });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ balance: 0, ledger: [] });

  const { data: ledger } = await db.from('class_reward_ledger')
    .select('tokens, reason, created_at')
    .eq('student_id', student.id).eq('class_id', classId)
    .order('created_at', { ascending: false });

  const balance = (ledger || []).reduce((sum, r) => sum + r.tokens, 0);
  return Response.json({ balance, ledger: ledger || [] });
}
