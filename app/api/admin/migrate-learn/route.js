import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export const SETUP_SQL = `
-- Learning modules (class_id null = available to all classes)
CREATE TABLE IF NOT EXISTS learn_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📚',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Lessons within a module
CREATE TABLE IF NOT EXISTS learn_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  tokens_reward INTEGER DEFAULT 25,
  pass_threshold INTEGER DEFAULT 75,
  questions_to_show INTEGER DEFAULT 4,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Content blocks: heading | subheading | text | video | article | divider
CREATE TABLE IF NOT EXISTS learn_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL,
  block_type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER DEFAULT 0
);

-- Quiz question bank per lesson
CREATE TABLE IF NOT EXISTS learn_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

-- Answer options (mark is_correct = true for the right one)
CREATE TABLE IF NOT EXISTS learn_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0
);

-- Student quiz attempts
CREATE TABLE IF NOT EXISTS learn_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  class_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  score INTEGER,
  passed BOOLEAN,
  answers JSONB,
  completed_at TIMESTAMPTZ DEFAULT now()
);
`;

// Check if tables exist
export async function GET() {
  const { data, error } = await db.from('learn_modules').select('id').limit(1);
  return Response.json({ ready: !error, sql: error ? SETUP_SQL : null });
}

// Seed the 4 module shells (lessons imported separately via /api/teacher/learn/import)
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { error: checkErr } = await db.from('learn_modules').select('id').limit(1);
  if (checkErr) return Response.json({ error: 'Tables not created yet. Run the SQL first.', sql: SETUP_SQL }, { status: 503 });

  const MODULES = [
    { title: 'Blockchain Basics',        description: 'Learn the foundational concepts that power every cryptocurrency network.',         emoji: '⛓️', order_index: 1 },
    { title: 'Crypto Markets',           description: 'Understand how crypto markets work — prices, liquidity, exchanges, and cycles.',    emoji: '📈', order_index: 2 },
    { title: 'Trading Strategies',       description: 'From buying the dip to technical analysis — build a real trading toolkit.',         emoji: '🎯', order_index: 3 },
    { title: 'Risk & Portfolio Mgmt',    description: 'Protect your capital with position sizing, stop losses, and diversification.',       emoji: '🛡️', order_index: 4 },
  ];

  const results = [];
  for (const m of MODULES) {
    const { data: existing } = await db.from('learn_modules').select('id').eq('title', m.title).maybeSingle();
    if (existing) { results.push({ module: m.title, status: 'already exists' }); continue; }
    const { data: created, error } = await db.from('learn_modules').insert({ ...m, is_published: false }).select().single();
    results.push({ module: m.title, status: error ? `error: ${error.message}` : 'created', id: created?.id });
  }

  return Response.json({ success: true, results });
}
