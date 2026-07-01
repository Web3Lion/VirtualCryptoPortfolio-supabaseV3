import { db } from '@/lib/db';

export async function GET() {
  const { data } = await db.from('class_reward_config').select('pinned_message').limit(1);
  return Response.json({ columnExists: data !== null });
}

export async function POST() {
  const { error } = await db.rpc('exec_sql', {
    sql: `
      ALTER TABLE class_reward_config
        ADD COLUMN IF NOT EXISTS pinned_message text,
        ADD COLUMN IF NOT EXISTS pinned_updated_at timestamptz;
    `
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
