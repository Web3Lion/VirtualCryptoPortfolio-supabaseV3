import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const ALL_SQL = `
ALTER TABLE class_reward_config
  ADD COLUMN IF NOT EXISTS crush_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS crush_points_per_token integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS crush_max_tokens_per_day integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS higher_lower_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS higher_lower_tokens_per_correct integer DEFAULT 10,
  ADD COLUMN IF NOT EXISTS miner_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS miner_points_per_token integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS miner_max_tokens_per_day integer DEFAULT 40,
  ADD COLUMN IF NOT EXISTS spin_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bull_bear_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bull_bear_tokens_per_correct integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS bull_bear_max_tokens_per_day integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS ai_coach_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_coach_daily_quota integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS ai_allow_student_key boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_student_key_limit integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pinned_message text,
  ADD COLUMN IF NOT EXISTS pinned_updated_at timestamptz;

CREATE TABLE IF NOT EXISTS student_ai_settings (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  gemini_api_key text,
  updated_at timestamptz DEFAULT now()
);
`.trim();

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { error } = await db.rpc('run_sql', { query: ALL_SQL }).then(v => v, () => ({ error: { code: 'NO_RPC' } }));
  if (!error) return Response.json({ success: true });

  return Response.json({ error: 'run_sql unavailable', sql: ALL_SQL }, { status: 422 });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  return Response.json({ sql: ALL_SQL });
}
