import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const MIGRATION_SQL = `
ALTER TABLE class_reward_config
  ADD COLUMN IF NOT EXISTS ai_coach_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_coach_daily_quota integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS ai_allow_student_key boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_student_key_limit integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS student_ai_settings (
  student_id uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  gemini_api_key text,
  updated_at timestamptz DEFAULT now()
);
`.trim();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  // Check if migration ran by querying the new column
  const { error } = await db.from('class_reward_config').select('ai_coach_enabled').limit(1);
  return Response.json({ migrated: !error });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { error } = await db.rpc('run_sql', { query: MIGRATION_SQL }).catch(() => ({ error: { code: 'NET' } }));
  if (!error) return Response.json({ success: true });

  return Response.json({
    error: 'Auto-migration unavailable. Run this SQL in your Supabase SQL Editor:',
    sql: MIGRATION_SQL,
  }, { status: 422 });
}
