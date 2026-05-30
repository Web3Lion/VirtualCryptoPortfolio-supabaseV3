import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

const ALL_TABLES = [
  'students','classes','class_students','portfolios','holdings','trades',
  'snapshots','price_cache','class_coins','config','watchlist','invitations',
  'badges','news_articles','pushed_articles',
  'class_reward_config','class_reward_ledger',
  'pending_orders','staking_positions','staking_config',
  'learn_modules','learn_lessons','learn_blocks','learn_questions','learn_options','learn_attempts',
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  // Check which tables exist
  const status = {};
  await Promise.all(ALL_TABLES.map(async (t) => {
    const { error } = await db.from(t).select('*').limit(1);
    status[t] = !error;
  }));

  const sql = readFileSync(join(process.cwd(), 'schema.sql'), 'utf8');

  return Response.json({ status, sql });
}
