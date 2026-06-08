import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function POST(request) {
  const session_header = request.headers.get('x-teacher-email');
  const authHeader = request.headers.get('authorization');
  const cronOk    = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const teacherOk = session_header === TEACHER_EMAIL;
  if (!cronOk && !teacherOk) return Response.json({ error: 'Unauthorized' }, { status: 403 });

  const results = [];

  try {
    await db.rpc('exec_sql', { sql: `
      CREATE TABLE IF NOT EXISTS weekly_challenges (
        id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        class_id       uuid REFERENCES classes(id) ON DELETE CASCADE,
        title          text NOT NULL,
        description    text,
        challenge_type text NOT NULL,
        target_value   numeric DEFAULT 1,
        tokens_reward  integer DEFAULT 100,
        starts_at      timestamptz NOT NULL,
        ends_at        timestamptz NOT NULL,
        active         boolean DEFAULT true,
        created_at     timestamptz DEFAULT now()
      );
    ` });
    results.push('weekly_challenges: OK');
  } catch (e) {
    results.push(`weekly_challenges: ${e.message}`);
  }

  try {
    await db.rpc('exec_sql', { sql: `
      CREATE TABLE IF NOT EXISTS weekly_challenge_completions (
        id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        challenge_id uuid REFERENCES weekly_challenges(id) ON DELETE CASCADE,
        student_id   uuid REFERENCES students(id) ON DELETE CASCADE,
        class_id     uuid NOT NULL,
        completed_at timestamptz DEFAULT now(),
        UNIQUE (challenge_id, student_id)
      );
    ` });
    results.push('weekly_challenge_completions: OK');
  } catch (e) {
    results.push(`weekly_challenge_completions: ${e.message}`);
  }

  return Response.json({ success: true, results });
}
