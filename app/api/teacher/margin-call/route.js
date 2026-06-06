import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setConfigs } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (TEACHER_EMAIL && session?.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { enabled, threshold } = await request.json();
  await setConfigs({
    MARGIN_CALL_ENABLED:   enabled ? '1' : '0',
    MARGIN_CALL_THRESHOLD: String(Math.max(0.05, Math.min(0.75, parseFloat(threshold) || 0.25))),
  });
  return Response.json({ success: true });
}
