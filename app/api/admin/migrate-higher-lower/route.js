import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS higher_lower_predictions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  coin_id text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('higher', 'lower')),
  price_at_prediction numeric(20,8) NOT NULL,
  predicted_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolution_price numeric(20,8),
  correct boolean,
  tokens_awarded integer DEFAULT 0
);
CREATE INDEX IF NOT EXISTS hl_pred_student_class_idx
  ON higher_lower_predictions(student_id, class_id, predicted_at DESC);
ALTER TABLE class_reward_config
  ADD COLUMN IF NOT EXISTS higher_lower_tokens_per_correct integer DEFAULT 10;
`;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });
  const { error } = await db.from('higher_lower_predictions').select('id').limit(1);
  return Response.json({ tableExists: !error });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { error } = await db.rpc('run_sql', { query: CREATE_SQL })
    .then(v => v, () => ({ error: { code: 'NET' } }));

  if (!error) return Response.json({ success: true });

  const errMsg = typeof error === 'string' ? error : (error?.message || '');
  const errCode = error?.code || '';
  const rpcMissing = errCode === 'PGRST202' || errCode === 'NET'
    || errMsg.includes('Could not find the function') || errMsg.includes('run_sql');

  if (rpcMissing || error) {
    return Response.json({
      error: 'Auto-migration unavailable. Run this SQL in your Supabase SQL Editor:',
      sql: CREATE_SQL.trim(),
    }, { status: 422 });
  }
  return Response.json({ success: true });
}
