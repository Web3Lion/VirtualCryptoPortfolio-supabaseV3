import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const SQL = `
CREATE TABLE IF NOT EXISTS assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    UUID NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  due_at      TIMESTAMPTZ,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS assignments_class ON assignments(class_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS assignment_completions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id  UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id     UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id       UUID NOT NULL,
  completed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, student_id)
);
`;

export async function POST() {
  const session = await getServerSession(authOptions);
  if (TEACHER_EMAIL && session?.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { error } = await db.rpc('run_sql', { query: SQL }).catch(() => ({ error: { code: 'NET' } }));
  const errCode = error?.code || '';
  const errMsg  = typeof error === 'string' ? error : (error?.message || '');
  const rpcMissing = errCode === 'PGRST202' || errCode === 'NET'
    || errMsg.includes('Could not find') || errMsg.includes('run_sql');

  if (rpcMissing || error) {
    const { data } = await db.from('assignments').select('id').limit(1);
    if (data !== null) return Response.json({ success: true, note: 'Tables already exist' });
    return Response.json({ error: 'Run this SQL in Supabase SQL Editor:', sql: SQL }, { status: 422 });
  }
  return Response.json({ success: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (TEACHER_EMAIL && session?.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });
  const { data } = await db.from('assignments').select('id').limit(1);
  return Response.json({ tableExists: data !== null });
}
