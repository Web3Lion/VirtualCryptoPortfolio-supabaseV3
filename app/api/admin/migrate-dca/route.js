import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const SQL = `
CREATE TABLE IF NOT EXISTS dca_orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id     UUID NOT NULL,
  coin         TEXT NOT NULL,
  amount_usd   NUMERIC(20,2) NOT NULL,
  frequency    TEXT NOT NULL CHECK (frequency IN ('daily','weekly')),
  next_run_at  TIMESTAMPTZ NOT NULL,
  last_run_at  TIMESTAMPTZ,
  runs_count   INTEGER NOT NULL DEFAULT 0,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS dca_orders_next_run ON dca_orders(next_run_at) WHERE active = true;
`;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (TEACHER_EMAIL && session?.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { error } = await db.rpc('run_sql', { query: SQL }).then(v => v, () => ({ error: { code: 'NET' } }));
  const errMsg = typeof error === 'string' ? error : (error?.message || '');
  const errCode = error?.code || '';
  const rpcMissing = errCode === 'PGRST202' || errCode === 'NET'
    || errMsg.includes('Could not find') || errMsg.includes('run_sql');

  if (rpcMissing || error) {
    const { data } = await db.from('dca_orders').select('id').limit(1);
    if (data !== null) return Response.json({ success: true, note: 'Table already exists' });
    return Response.json({ error: 'Run this SQL in your Supabase SQL Editor:', sql: SQL }, { status: 422 });
  }
  return Response.json({ success: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (TEACHER_EMAIL && session?.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });
  const { data } = await db.from('dca_orders').select('id').limit(1);
  return Response.json({ tableExists: data !== null });
}
