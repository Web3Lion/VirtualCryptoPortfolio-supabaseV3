import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// Adds margin_borrowed column to holdings if it doesn't already exist.
// Called once from the teacher page to apply the leverage/short trading migration.
export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) {
    return Response.json({ error: 'Teacher only' }, { status: 403 });
  }

  const { error } = await db.rpc('run_sql', {
    query: 'ALTER TABLE holdings ADD COLUMN IF NOT EXISTS margin_borrowed NUMERIC(20,8) NOT NULL DEFAULT 0;'
  }).then(v => v, () => ({ error: { code: 'NET' } }));

  const errMsg = typeof error === 'string' ? error : (error?.message || '');
  const errCode = error?.code || '';
  const rpcMissing = errCode === 'PGRST202' || errCode === 'NET'
    || errMsg.includes('Could not find the function') || errMsg.includes('run_sql');

  if (rpcMissing || error) {
    // Fallback: check if the column already exists via a direct select
    const { data } = await db.from('holdings').select('margin_borrowed').limit(1);
    if (data !== null) return Response.json({ success: true, note: 'Column already exists' });
    return Response.json({
      error: 'Run this SQL in your Supabase SQL Editor:',
      sql: 'ALTER TABLE holdings ADD COLUMN IF NOT EXISTS margin_borrowed NUMERIC(20,8) NOT NULL DEFAULT 0;',
    }, { status: 422 });
  }

  return Response.json({ success: true });
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) {
    return Response.json({ error: 'Teacher only' }, { status: 403 });
  }
  // Check if column exists
  const { data, error } = await db.from('holdings').select('margin_borrowed').limit(1);
  return Response.json({ columnExists: !error && data !== null });
}
