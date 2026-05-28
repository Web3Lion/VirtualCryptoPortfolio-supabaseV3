import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });
  const { data } = await db.from('class_reward_config').select('*').eq('class_id', classId).single();
  return Response.json(data || { enabled: false, badge_reward_tokens: 50, lesson_reward_tokens: 25, crush_points_per_token: 100, crush_max_tokens_per_day: 50 });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });
  const { classId, enabled, badgeRewardTokens, lessonRewardTokens, crushPointsPerToken, crushMaxTokensPerDay } = await request.json();
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });
  await db.from('class_reward_config').upsert({
    class_id: classId,
    enabled: !!enabled,
    badge_reward_tokens: Math.max(1, parseInt(badgeRewardTokens) || 50),
    lesson_reward_tokens: Math.max(1, parseInt(lessonRewardTokens) || 25),
    crush_points_per_token: Math.max(10, parseInt(crushPointsPerToken) || 100),
    crush_max_tokens_per_day: Math.max(1, parseInt(crushMaxTokensPerDay) || 50),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'class_id' });
  return Response.json({ success: true });
}
