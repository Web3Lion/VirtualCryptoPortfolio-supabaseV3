import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS staking_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  coin text NOT NULL,
  quantity numeric(20,8) NOT NULL,
  apy numeric(8,6) NOT NULL,
  lock_days integer NOT NULL DEFAULT 0,
  staked_at timestamptz DEFAULT now(),
  unlocks_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','unstaked','completed')),
  total_rewards_earned numeric(20,8) DEFAULT 0,
  last_reward_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staking_student_class_idx ON staking_positions(student_id, class_id, status);
CREATE INDEX IF NOT EXISTS staking_class_active_idx ON staking_positions(class_id, status);

CREATE TABLE IF NOT EXISTS staking_config (
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE PRIMARY KEY,
  enabled boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);
`;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { error } = await db.from('staking_positions').select('id').limit(1);
  return Response.json({ tablesExist: !error });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { error } = await db.rpc('run_sql', { query: CREATE_SQL }).catch(() => ({ error: 'rpc_unavailable' }));

  if (error === 'rpc_unavailable') {
    return Response.json({
      error: 'Auto-migration unavailable. Run this SQL in your Supabase dashboard:',
      sql: CREATE_SQL.trim(),
    }, { status: 422 });
  }
  if (error) return Response.json({ error: error.message || error }, { status: 500 });
  return Response.json({ success: true });
}
