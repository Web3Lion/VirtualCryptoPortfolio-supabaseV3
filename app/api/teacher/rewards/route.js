import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const DEFAULTS = {
  enabled: false,
  badge_reward_tokens: 50,
  lesson_reward_tokens: 25,
  crush_enabled: true,
  crush_points_per_token: 100,
  crush_max_tokens_per_day: 50,
  higher_lower_enabled: true,
  higher_lower_tokens_per_correct: 10,
  miner_enabled: true,
  miner_points_per_token: 50,
  miner_max_tokens_per_day: 40,
  spin_enabled: true,
  bull_bear_enabled: true,
  bull_bear_tokens_per_correct: 5,
  bull_bear_max_tokens_per_day: 50,
};

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });
  const { data } = await db.from('class_reward_config').select('*').eq('class_id', classId).single();
  return Response.json({ ...DEFAULTS, ...(data || {}) });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const body = await request.json();
  const { classId } = body;
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const int = (key, min, def) => Math.max(min, parseInt(body[key] ?? body[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())]) || def);
  const bool = (key, def) => body[key] !== undefined ? !!body[key] : def;

  await db.from('class_reward_config').upsert({
    class_id: classId,
    enabled:                        bool('enabled', false),
    badge_reward_tokens:            int('badge_reward_tokens', 1, 50),
    lesson_reward_tokens:           int('lesson_reward_tokens', 1, 25),
    crush_enabled:                  bool('crush_enabled', true),
    crush_points_per_token:         int('crush_points_per_token', 10, 100),
    crush_max_tokens_per_day:       int('crush_max_tokens_per_day', 1, 50),
    higher_lower_enabled:           bool('higher_lower_enabled', true),
    higher_lower_tokens_per_correct:int('higher_lower_tokens_per_correct', 1, 10),
    miner_enabled:                  bool('miner_enabled', true),
    miner_points_per_token:         int('miner_points_per_token', 1, 50),
    miner_max_tokens_per_day:       int('miner_max_tokens_per_day', 1, 40),
    spin_enabled:                   bool('spin_enabled', true),
    bull_bear_enabled:              bool('bull_bear_enabled', true),
    bull_bear_tokens_per_correct:   int('bull_bear_tokens_per_correct', 1, 5),
    bull_bear_max_tokens_per_day:   int('bull_bear_max_tokens_per_day', 1, 50),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'class_id' });

  return Response.json({ success: true });
}
