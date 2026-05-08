import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail, getPortfolioHistory } from '@/lib/students';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ intraday: [], daily: [] });
  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  const range  = searchParams.get('range') || '1W';
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id').eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ intraday: [], daily: [] });
  return Response.json(await getPortfolioHistory(student.id, classId, range));
}
