import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { enrollStudent, isTeacherEmail, normalizeJoinCode } from '@/lib/enroll';

// A signed-in student enters the code their teacher gave them and is
// enrolled in that class directly — no roster entry needed.
export async function POST(request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  if (isTeacherEmail(email)) return Response.json({ error: 'Teachers manage classes from the teacher dashboard' }, { status: 400 });

  let body = {};
  try { body = await request.json(); } catch {}
  const code = normalizeJoinCode(body.code);
  if (!code) return Response.json({ error: 'Enter a class code' }, { status: 400 });

  const { data: cls } = await db.from('classes').select('id, is_active').eq('join_code', code).maybeSingle();
  if (!cls || cls.is_active === false)
    return Response.json({ error: 'That class code was not found. Check it with your teacher.' }, { status: 404 });

  try {
    const name = session.user.name?.trim() || email.split('@')[0];
    const result = await enrollStudent({ name, email, classId: cls.id });
    return Response.json({ success: true, ...result });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
