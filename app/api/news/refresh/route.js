import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;
const CRON_SECRET   = process.env.CRON_SECRET;
const APP_URL       = process.env.NEXTAUTH_URL || '';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL)
    return Response.json({ error: 'Teacher only' }, { status: 403 });
  try {
    const res  = await fetch(`${APP_URL}/api/cron/news`, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const data = await res.json();
    return Response.json({ success: true, message: `✅ Fetched ${data.fetched || 0} new articles`, ...data });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
