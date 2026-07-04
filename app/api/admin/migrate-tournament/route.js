import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const SQL = `
CREATE TABLE IF NOT EXISTS tournaments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID NOT NULL,
  name          TEXT NOT NULL,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  prize_tokens  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','ended')),
  winner_id     UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tournaments_class ON tournaments(class_id, status);

CREATE TABLE IF NOT EXISTS tournament_snapshots (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id       UUID NOT NULL,
  start_value    NUMERIC(20,2),
  end_value      NUMERIC(20,2),
  return_pct     NUMERIC(10,4),
  rank           INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (TEACHER_EMAIL && session?.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { error } = await db.rpc('run_sql', { query: SQL }).then(v => v, () => ({ error: { code: 'NET' } }));
  const errCode = error?.code || '';
  const errMsg  = typeof error === 'string' ? error : (error?.message || '');
  const rpcMissing = errCode === 'PGRST202' || errCode === 'NET'
    || errMsg.includes('Could not find') || errMsg.includes('run_sql');

  if (rpcMissing || error) {
    const { data } = await db.from('tournaments').select('id').limit(1);
    if (data !== null) return Response.json({ success: true, note: 'Tables already exist' });
    return Response.json({ error: 'Run this SQL in Supabase SQL Editor:', sql: SQL }, { status: 422 });
  }
  return Response.json({ success: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (TEACHER_EMAIL && session?.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });
  const { data } = await db.from('tournaments').select('id').limit(1);
  return Response.json({ tableExists: data !== null });
}
