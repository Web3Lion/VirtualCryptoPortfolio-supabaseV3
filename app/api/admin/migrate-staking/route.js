import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export const MANUAL_SQL = `-- Run this in your Supabase dashboard → SQL Editor

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
  status text NOT NULL DEFAULT 'active',
  total_rewards_earned numeric(20,8) DEFAULT 0,
  claimable_rewards numeric(20,8) DEFAULT 0,
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

ALTER TABLE staking_positions ADD COLUMN IF NOT EXISTS claimable_rewards numeric(20,8) DEFAULT 0;`;

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

  // Check if the tables already exist — if so, nothing to do
  const { error: tableCheck } = await db.from('staking_positions').select('id').limit(1);
  if (!tableCheck) {
    // Tables already exist — silently try to add any missing columns
    await db.rpc('run_sql', {
      query: 'ALTER TABLE staking_positions ADD COLUMN IF NOT EXISTS claimable_rewards numeric(20,8) DEFAULT 0',
    }).catch(() => {});
    return Response.json({ success: true });
  }

  // Tables don't exist — try run_sql to create them
  const statements = [
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
  ];

  for (const sql of statements) {
    const result = await db.rpc('run_sql', { query: sql }).catch(() => ({ error: true }));
    if (result?.error) {
      // Anything goes wrong — show the SQL for manual execution
      return Response.json({ sql: MANUAL_SQL }, { status: 422 });
    }
  }

  return Response.json({ success: true });
}
