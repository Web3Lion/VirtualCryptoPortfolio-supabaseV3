import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const MIGRATION_SQL = `
ALTER TABLE class_reward_config
  ADD COLUMN IF NOT EXISTS crush_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS higher_lower_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS miner_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS miner_points_per_token integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS miner_max_tokens_per_day integer DEFAULT 40,
  ADD COLUMN IF NOT EXISTS spin_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bull_bear_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS bull_bear_tokens_per_correct integer DEFAULT 5,
  ADD COLUMN IF NOT EXISTS bull_bear_max_tokens_per_day integer DEFAULT 50;
`.trim();

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { data, error } = await db.from('class_reward_config').select('spin_enabled').limit(1);
  return Response.json({ migrated: !error && data !== null });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { error } = await db.rpc('run_sql', { query: MIGRATION_SQL }).then(v => v, () => ({ error: { code: 'NET' } }));

  if (!error) return Response.json({ success: true });

  return Response.json({
    error: 'Auto-migration unavailable. Run this SQL in your Supabase SQL Editor:',
    sql: MIGRATION_SQL,
  }, { status: 422 });
}
