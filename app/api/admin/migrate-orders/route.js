import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const CREATE_SQL = `
CREATE TABLE IF NOT EXISTS pending_orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  coin text NOT NULL,
  action text NOT NULL CHECK (action IN ('BUY','SELL','SHORT')),
  amount numeric(20,8) NOT NULL,
  amount_type text NOT NULL DEFAULT 'Dollar Amount',
  limit_price numeric(20,8) NOT NULL,
  leverage_multiplier numeric(5,2) NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','executed','cancelled','failed')),
  reasoning text,
  created_at timestamptz DEFAULT now(),
  executed_at timestamptz,
  executed_price numeric(20,8),
  fail_reason text
);
CREATE INDEX IF NOT EXISTS pending_orders_student_idx ON pending_orders(student_id, status);
CREATE INDEX IF NOT EXISTS pending_orders_class_idx ON pending_orders(class_id, status);
`;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { error } = await db.from('pending_orders').select('id').limit(1);
  return Response.json({ tableExists: !error });
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });

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
