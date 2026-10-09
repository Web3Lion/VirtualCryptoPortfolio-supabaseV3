import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { assignJoinCode, isTeacherEmail } from '@/lib/enroll';

// Teacher-only: create or replace a class's join code. Replacing it stops
// the old code from working; students already enrolled stay enrolled.
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!isTeacherEmail(session?.user?.email)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { classId } = await request.json().catch(() => ({}));
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  try {
    const joinCode = await assignJoinCode(classId);
    return Response.json({ success: true, joinCode });
  } catch (e) {
    const missingColumn = /join_code/.test(e.message);
    return Response.json({
      error: missingColumn ? 'Run the latest schema.sql in Supabase to enable class codes (classes.join_code is missing)' : e.message,
    }, { status: 500 });
  }
}
