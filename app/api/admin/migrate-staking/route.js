import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

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
  `ALTER TABLE staking_positions ADD COLUMN IF NOT EXISTS claimable_rewards numeric(20,8) DEFAULT 0`,
];

export const MANUAL_SQL = SQL_STATEMENTS.join(';\n\n') + ';';

function isRpcUnavailable(error) {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : (error.message || '');
  const code = error.code || '';
  // PGRST202 = PostgREST "function not found in schema cache"
  return code === 'PGRST202'
    || msg.includes('Could not find the function')
    || msg.includes('run_sql')
    || msg.includes('does not exist');
}

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

  for (const sql of SQL_STATEMENTS) {
    // db.rpc() resolves (never rejects) — catch is only for network errors
    const { error } = await db.rpc('run_sql', { query: sql })
      .catch(() => ({ error: { message: 'network_error', code: 'NET' } }));

    if (!error) continue; // statement succeeded

    if (isRpcUnavailable(error)) {
      // run_sql function doesn't exist in this Supabase project —
      // return the SQL so the teacher can paste it into the SQL editor
      return Response.json({ sql: MANUAL_SQL }, { status: 422 });
    }

    const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
    if (msg.includes('already exists')) continue; // idempotent, treat as success

    return Response.json({ error: msg }, { status: 500 });
  }

  return Response.json({ success: true });
}
