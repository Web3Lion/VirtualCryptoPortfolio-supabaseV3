import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { generateShareToken } from '@/lib/shareToken';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: cs } = await db.from('class_students').select('class_id')
    .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
  if (!cs?.class_id) return Response.json({ error: 'No class' }, { status: 404 });

  const token = generateShareToken(student.id, cs.class_id);
  const url = `${process.env.NEXTAUTH_URL || ''}/share/${token}`;
  return Response.json({ token, url });
}
