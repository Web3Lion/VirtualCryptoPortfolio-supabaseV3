import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// Split into individual statements so we can run them one-by-one and
// skip failures on statements that are no-ops (e.g. column already exists).
const SQL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS staking_positions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid REFERENCES students(id) ON DELETE CASCADE,
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
    coin text NOT NULL,
    quantity numeric(20,8) NOT NULL,
    apy numeric(8,6) NOT NULL,
    lock_days integer NOT NULL DEFAULT 0,
    staked_at timestamptz DEFAULT now(),
    unlocks_at timestamptz,
    status text NOT NULL DEFAULT 'active',
    total_rewards_earned numeric(20,8) DEFAULT 0,
    claimable_rewards numeric(20,8) DEFAULT 0,
    last_reward_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS staking_student_class_idx ON staking_positions(student_id, class_id, status)`,
  `CREATE INDEX IF NOT EXISTS staking_class_active_idx ON staking_positions(class_id, status)`,
  `CREATE TABLE IF NOT EXISTS staking_config (
    class_id uuid REFERENCES classes(id) ON DELETE CASCADE PRIMARY KEY,
    enabled boolean DEFAULT true,
    updated_at timestamptz DEFAULT now()
  )`,
  // Upgrade existing installations — safe on fresh tables too
  `ALTER TABLE staking_positions ADD COLUMN IF NOT EXISTS claimable_rewards numeric(20,8) DEFAULT 0`,
];

// Full SQL shown to teachers who need to run it manually in Supabase
const MANUAL_SQL = SQL_STATEMENTS.join(';\n') + ';';

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

  // Try each statement individually so a no-op (column already exists, etc.)
  // doesn't abort the whole migration.
  const errors = [];
  for (const sql of SQL_STATEMENTS) {
    const { error } = await db.rpc('run_sql', { query: sql }).catch(() => ({ error: 'rpc_unavailable' }));
    if (error === 'rpc_unavailable') {
      // run_sql function doesn't exist — return the full SQL for manual execution
      return Response.json({
        error: 'Auto-migration unavailable — paste the SQL below into your Supabase SQL editor and run it.',
        sql: MANUAL_SQL,
      }, { status: 422 });
    }
    if (error) {
      const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
      // "already exists" errors are fine — treat as success
      if (!msg.includes('already exists')) errors.push(msg);
    }
  }

  if (errors.length) return Response.json({ error: errors.join(' | ') }, { status: 500 });
  return Response.json({ success: true });
}
