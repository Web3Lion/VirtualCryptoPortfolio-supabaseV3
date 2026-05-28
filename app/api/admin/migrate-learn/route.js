import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

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

// PATCH — update existing seed lesson (questions_to_show, add missing questions)
export async function PATCH() {
  // Find the lesson — search by module title first, then match lesson
  const { data: modules } = await db.from('learn_modules').select('id').eq('title', 'Blockchain Basics');
  const moduleIds = (modules || []).map(m => m.id);

  let lesson = null;
  if (moduleIds.length) {
    const { data: lessons } = await db.from('learn_lessons')
      .select('id, questions_to_show')
      .in('module_id', moduleIds)
      .ilike('title', '%Proof of Work%');
    lesson = lessons?.[0] || null;
  }

  // Fallback: search all lessons by title
  if (!lesson) {
    const { data: lessons } = await db.from('learn_lessons')
      .select('id, questions_to_show')
      .ilike('title', '%Proof of Work%');
    lesson = lessons?.[0] || null;
  }

  if (!lesson) return Response.json({ error: 'Lesson not found — run Seed Sample Module first' }, { status: 404 });

  // Get current question count
  const { data: existing, error: fetchErr } = await db.from('learn_questions')
    .select('id, question_text').eq('lesson_id', lesson.id);
  if (fetchErr) return Response.json({ error: fetchErr.message }, { status: 500 });

  const existingTexts = new Set((existing || []).map(q => q.question_text.trim()));
  const currentCount = existing?.length || 0;

  const allNewQuestions = [
    {
      question_text: 'How often does Bitcoin\'s Proof of Work target finding a new block?',
      explanation: 'Bitcoin\'s difficulty automatically adjusts so that a new block is found approximately every 10 minutes, regardless of total mining power.',
      options: [
        { option_text: 'Every 1 minute', is_correct: false },
        { option_text: 'Every 10 minutes', is_correct: true },
        { option_text: 'Every 30 minutes', is_correct: false },
        { option_text: 'Every hour', is_correct: false },
      ],
    },
    {
      question_text: 'What percentage of mining power would an attacker need to rewrite Bitcoin\'s blockchain?',
      explanation: 'A "51% attack" requires controlling more than half of all mining power, making it astronomically expensive on Bitcoin.',
      options: [
        { option_text: '10%', is_correct: false },
        { option_text: '25%', is_correct: false },
        { option_text: 'More than 51%', is_correct: true },
        { option_text: '100%', is_correct: false },
      ],
    },
    {
      question_text: 'Which of the following blockchains uses Proof of Stake?',
      explanation: 'Ethereum, Cardano, and Solana all use Proof of Stake. Bitcoin is the major holdout still using Proof of Work.',
      options: [
        { option_text: 'Bitcoin', is_correct: false },
        { option_text: 'Litecoin', is_correct: false },
        { option_text: 'Cardano', is_correct: true },
        { option_text: 'Monero', is_correct: false },
      ],
    },
    {
      question_text: 'In Proof of Work, what are participants who compete to add new blocks called?',
      explanation: 'Participants in PoW are called miners — they use computing hardware to solve mathematical puzzles and earn block rewards.',
      options: [
        { option_text: 'Validators', is_correct: false },
        { option_text: 'Delegates', is_correct: false },
        { option_text: 'Stakers', is_correct: false },
        { option_text: 'Miners', is_correct: true },
      ],
    },
  ];

  let added = 0;
  const errors = [];
  let nextIndex = currentCount + 1;

  for (const q of allNewQuestions) {
    if (existingTexts.has(q.question_text.trim())) continue;

    const { data: question, error: qErr } = await db.from('learn_questions').insert({
      lesson_id: lesson.id,
      question_text: q.question_text,
      explanation: q.explanation,
      order_index: nextIndex,
    }).select('id').single();

    if (qErr || !question) { errors.push(q.question_text + ': ' + (qErr?.message || 'insert failed')); continue; }

    const { error: oErr } = await db.from('learn_options').insert(
      q.options.map((o, i) => ({ question_id: question.id, option_text: o.option_text, is_correct: o.is_correct, order_index: i }))
    );
    if (oErr) { errors.push('options for ' + q.question_text + ': ' + oErr.message); continue; }

    added++;
    nextIndex++;
  }

  // Update questions_to_show to 5
  await db.from('learn_lessons').update({ questions_to_show: 5 }).eq('id', lesson.id);

  return Response.json({
    success: true,
    lessonId: lesson.id,
    questionsAdded: added,
    totalNow: currentCount + added,
    questions_to_show: 5,
    errors: errors.length ? errors : undefined,
  });
}

// Check if tables exist
export async function GET() {
  const { data, error } = await db.from('learn_modules').select('id').limit(1);
  return Response.json({ ready: !error, sql: error ? SETUP_SQL : null });
}

// Seed all modules + lessons from /content/learn/*.json in one shot
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { error: checkErr } = await db.from('learn_modules').select('id').limit(1);
  if (checkErr) return Response.json({ error: 'Tables not created yet. Run the SQL first.', sql: SETUP_SQL }, { status: 503 });

  // Load all JSON files from content/learn/
  const contentDir = path.join(process.cwd(), 'content', 'learn');
  let jsonFiles = [];
  try {
    jsonFiles = fs.readdirSync(contentDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .map(f => JSON.parse(fs.readFileSync(path.join(contentDir, f), 'utf8')));
  } catch (e) {
    return Response.json({ error: `Could not read content/learn: ${e.message}` }, { status: 500 });
  }

  const results = [];

  for (const fileData of jsonFiles) {
    const { moduleTitle, lessons = [] } = fileData;
    if (!moduleTitle) continue;

    // Upsert module
    let modId;
    const { data: existing } = await db.from('learn_modules').select('id, is_published').eq('title', moduleTitle).maybeSingle();
    if (existing) {
      modId = existing.id;
      if (!existing.is_published) await db.from('learn_modules').update({ is_published: true }).eq('id', modId);
    } else {
      // Derive emoji/description from the first file with this title, or use defaults
      const { data: created } = await db.from('learn_modules').insert({
        title: moduleTitle,
        description: fileData.description || '',
        emoji: fileData.emoji || '📚',
        order_index: fileData.order_index || 0,
        is_published: true,
      }).select('id').single();
      modId = created?.id;
    }
    if (!modId) { results.push({ module: moduleTitle, error: 'Could not create module' }); continue; }

    // Import each lesson (skip if already exists by title)
    let lessonsAdded = 0, lessonsSkipped = 0;
    for (const lesson of lessons) {
      const { data: dupLesson } = await db.from('learn_lessons').select('id').eq('module_id', modId).eq('title', lesson.title).maybeSingle();
      if (dupLesson) { lessonsSkipped++; continue; }

      // Get next order_index
      const { data: last } = await db.from('learn_lessons').select('order_index').eq('module_id', modId).order('order_index', { ascending: false }).limit(1);
      const nextOrder = last?.length ? (last[0].order_index + 1) : 1;

      const { data: newLesson, error: lErr } = await db.from('learn_lessons').insert({
        module_id: modId,
        title: lesson.title,
        description: lesson.description || '',
        order_index: nextOrder,
        tokens_reward: lesson.tokens_reward ?? 25,
        pass_threshold: lesson.pass_threshold ?? 70,
        questions_to_show: lesson.questions_to_show ?? 5,
        is_published: lesson.is_published ?? true,
      }).select().single();
      if (lErr || !newLesson) { continue; }

      // Insert blocks
      if (lesson.blocks?.length) {
        await db.from('learn_blocks').insert(
          lesson.blocks.map(b => ({ lesson_id: newLesson.id, block_type: b.block_type, content: b.content, order_index: b.order_index }))
        );
      }

      // Insert questions + options
      for (let qi = 0; qi < (lesson.questions || []).length; qi++) {
        const q = lesson.questions[qi];
        const { data: newQ } = await db.from('learn_questions').insert({
          lesson_id: newLesson.id,
          question_text: q.question_text,
          explanation: q.explanation || '',
          order_index: qi + 1,
        }).select('id').single();
        if (!newQ) continue;
        await db.from('learn_options').insert(
          (q.options || []).map((o, i) => ({ question_id: newQ.id, option_text: o.option_text, is_correct: o.is_correct, order_index: i }))
        );
      }
      lessonsAdded++;
    }
    results.push({ module: moduleTitle, lessonsAdded, lessonsSkipped });
  }

  return Response.json({ success: true, results });
}

// Legacy reference only — not called. Superseded by JSON import + Seed 4 Modules.
async function _legacySeedBlockchainBasics() {
  const { data: existing } = await db.from('learn_modules').select('id').eq('title', 'Blockchain Basics').single();
  if (existing) {
    // Find lesson and check question count
    const { data: existingLesson } = await db.from('learn_lessons')
      .select('id').eq('module_id', existing.id).single();
    if (existingLesson) {
      const { data: existingQ } = await db.from('learn_questions')
        .select('id').eq('lesson_id', existingLesson.id).limit(1);
      if (existingQ?.length > 0) return Response.json({ success: true, note: 'Already seeded' });
      // Module + lesson exist but no questions — fall through to PATCH to add them
      const patchRes = await fetch(new URL('/api/admin/migrate-learn', process.env.NEXTAUTH_URL || 'http://localhost:3000'), { method: 'PATCH' });
      const patchData = await patchRes.json();
      return Response.json({ success: true, note: `Module existed but had no questions. Added ${patchData.questionsAdded ?? 0}.` });
    }
    return Response.json({ success: true, note: 'Already seeded' });
  }

  // ── Create module ──────────────────────────────────────────
  const { data: mod } = await db.from('learn_modules').insert({
    title: 'Blockchain Basics',
    description: 'Learn the foundational concepts that power every cryptocurrency network.',
    emoji: '⛓️',
    order_index: 1,
    is_published: true,
  }).select().single();

  // ── Create lesson ──────────────────────────────────────────
  const { data: lesson } = await db.from('learn_lessons').insert({
    module_id: mod.id,
    title: 'Proof of Work vs Proof of Stake',
    description: 'Understand the two most important consensus mechanisms in crypto — and why Ethereum switched.',
    order_index: 1,
    tokens_reward: 50,
    pass_threshold: 75,
    questions_to_show: 5,
    is_published: true,
  }).select().single();

  // ── Create content blocks ──────────────────────────────────
  const blocks = [
    { block_type: 'heading',    order_index: 1,  content: { text: 'How Do Blockchains Agree?' } },
    { block_type: 'text',       order_index: 2,  content: { text: 'A blockchain has thousands of computers around the world — none of which trust each other. To add a new block of transactions, they all need to agree on what happened. The rules they use to reach that agreement is called a **consensus mechanism**. The two dominant approaches are Proof of Work (PoW) and Proof of Stake (PoS).' } },
    { block_type: 'subheading', order_index: 3,  content: { text: '⛏️ Proof of Work (PoW)' } },
    { block_type: 'text',       order_index: 4,  content: { text: 'In PoW, computers called **miners** race to solve a complex mathematical puzzle. The first to solve it earns the right to add the next block and receives a reward in cryptocurrency. Bitcoin still uses PoW today.\n\n**Key properties:**\n- Requires enormous computing power (and electricity)\n- The difficulty adjusts so a block is found roughly every 10 minutes\n- An attacker would need 51% of all mining power to cheat — making it extremely expensive to attack' } },
    { block_type: 'subheading', order_index: 5,  content: { text: '🪙 Proof of Stake (PoS)' } },
    { block_type: 'text',       order_index: 6,  content: { text: 'In PoS, participants called **validators** lock up ("stake") their own cryptocurrency as collateral. The network randomly selects a validator to add the next block — the more you stake, the higher your chance. Ethereum switched from PoW to PoS in September 2022 in an event called **The Merge**.\n\n**Key properties:**\n- Uses ~99.95% less energy than PoW\n- Validators risk losing their staked coins if they cheat (called "slashing")\n- Lower barrier to entry than buying mining hardware' } },
    { block_type: 'video',      order_index: 7,  content: { url: 'https://www.youtube.com/watch?v=M3EFi_POhps', title: 'Proof of Work vs Proof of Stake — Explained', description: 'A clear visual breakdown of both consensus mechanisms and how they compare.' } },
    { block_type: 'subheading', order_index: 8,  content: { text: '⚖️ Side-by-Side Comparison' } },
    { block_type: 'text',       order_index: 9,  content: { text: '| | Proof of Work | Proof of Stake |\n|---|---|---|\n| **Used by** | Bitcoin | Ethereum, Cardano, Solana |\n| **Energy use** | Very high | Very low |\n| **Security** | Computational power | Economic stake |\n| **Barrier to entry** | Expensive hardware | Own cryptocurrency |\n| **Block reward** | Mining reward | Staking reward |' } },
    { block_type: 'article',    order_index: 10, content: { url: 'https://ethereum.org/en/developers/docs/consensus-mechanisms/', title: 'Consensus Mechanisms — Ethereum.org', description: 'The official Ethereum documentation explaining PoW, PoS, and why the network transitioned. Thorough and beginner-friendly.' } },
  ];

  await db.from('learn_blocks').insert(blocks.map(b => ({ ...b, lesson_id: lesson.id })));

  // ── Create quiz questions (10 — system shows 5 randomly) ───
  const questions = [
    {
      question_text: 'Which consensus mechanism does Bitcoin use?',
      explanation: 'Bitcoin uses Proof of Work. Miners compete to solve puzzles to add new blocks.',
      order_index: 1,
      options: [
        { option_text: 'Proof of Stake', is_correct: false },
        { option_text: 'Proof of Work', is_correct: true },
        { option_text: 'Proof of Authority', is_correct: false },
        { option_text: 'Delegated Proof of Stake', is_correct: false },
      ],
    },
    {
      question_text: 'What do miners compete to do in Proof of Work?',
      explanation: 'Miners race to solve a cryptographic puzzle. The winner adds the next block and earns a reward.',
      order_index: 2,
      options: [
        { option_text: 'Stake the most cryptocurrency', is_correct: false },
        { option_text: 'Solve a complex mathematical puzzle first', is_correct: true },
        { option_text: 'Hold coins for the longest time', is_correct: false },
        { option_text: 'Vote on which transactions are valid', is_correct: false },
      ],
    },
    {
      question_text: 'What event marked Ethereum\'s switch from PoW to PoS?',
      explanation: 'Ethereum\'s transition to Proof of Stake in September 2022 was called "The Merge."',
      order_index: 3,
      options: [
        { option_text: 'The Ethereum Fork', is_correct: false },
        { option_text: 'The Genesis Block', is_correct: false },
        { option_text: 'The Merge', is_correct: true },
        { option_text: 'The Upgrade', is_correct: false },
      ],
    },
    {
      question_text: 'What happens to a validator\'s stake if they try to cheat in PoS?',
      explanation: 'Validators who act dishonestly can have their staked coins destroyed — this is called "slashing."',
      order_index: 4,
      options: [
        { option_text: 'They are banned permanently', is_correct: false },
        { option_text: 'Nothing — the network just ignores them', is_correct: false },
        { option_text: 'Their staked coins are destroyed (slashed)', is_correct: true },
        { option_text: 'They lose their validator license', is_correct: false },
      ],
    },
    {
      question_text: 'Approximately how much less energy does Proof of Stake use compared to Proof of Work?',
      explanation: 'Ethereum\'s switch to PoS reduced its energy consumption by approximately 99.95%.',
      order_index: 5,
      options: [
        { option_text: '~50% less', is_correct: false },
        { option_text: '~75% less', is_correct: false },
        { option_text: '~90% less', is_correct: false },
        { option_text: '~99.95% less', is_correct: true },
      ],
    },
    {
      question_text: 'In Proof of Stake, what increases a validator\'s chance of being chosen to add the next block?',
      explanation: 'Validators are selected randomly, but a larger stake gives a higher probability of selection.',
      order_index: 6,
      options: [
        { option_text: 'Faster internet connection', is_correct: false },
        { option_text: 'More powerful computer hardware', is_correct: false },
        { option_text: 'Staking more cryptocurrency', is_correct: true },
        { option_text: 'Being an early adopter of the network', is_correct: false },
      ],
    },
    {
      question_text: 'How often does Bitcoin\'s Proof of Work target finding a new block?',
      explanation: 'Bitcoin\'s difficulty automatically adjusts so that a new block is found approximately every 10 minutes, regardless of total mining power.',
      order_index: 7,
      options: [
        { option_text: 'Every 1 minute', is_correct: false },
        { option_text: 'Every 10 minutes', is_correct: true },
        { option_text: 'Every 30 minutes', is_correct: false },
        { option_text: 'Every hour', is_correct: false },
      ],
    },
    {
      question_text: 'What percentage of the total mining power would an attacker need to rewrite Bitcoin\'s blockchain?',
      explanation: 'A "51% attack" requires controlling more than half of all mining power, making it astronomically expensive to execute on Bitcoin.',
      order_index: 8,
      options: [
        { option_text: '10%', is_correct: false },
        { option_text: '25%', is_correct: false },
        { option_text: 'More than 51%', is_correct: true },
        { option_text: '100%', is_correct: false },
      ],
    },
    {
      question_text: 'Which of the following blockchains uses Proof of Stake?',
      explanation: 'Ethereum, Cardano, and Solana all use Proof of Stake. Bitcoin is the major holdout still using Proof of Work.',
      order_index: 9,
      options: [
        { option_text: 'Bitcoin', is_correct: false },
        { option_text: 'Litecoin', is_correct: false },
        { option_text: 'Cardano', is_correct: true },
        { option_text: 'Monero', is_correct: false },
      ],
    },
    {
      question_text: 'In Proof of Work, what is the term for participants who compete to add new blocks?',
      explanation: 'Participants in PoW are called miners — they use computing hardware to solve mathematical puzzles and earn block rewards.',
      order_index: 10,
      options: [
        { option_text: 'Validators', is_correct: false },
        { option_text: 'Delegates', is_correct: false },
        { option_text: 'Stakers', is_correct: false },
        { option_text: 'Miners', is_correct: true },
      ],
    },
  ];

  const insertErrors = [];
  for (const q of questions) {
    const { data: question, error: qErr } = await db.from('learn_questions').insert({
      lesson_id: lesson.id,
      question_text: q.question_text,
      explanation: q.explanation,
      order_index: q.order_index,
    }).select('id').single();

    if (qErr || !question) { insertErrors.push(q.question_text + ': ' + (qErr?.message || 'failed')); continue; }

    const { error: oErr } = await db.from('learn_options').insert(
      q.options.map((o, i) => ({ question_id: question.id, option_text: o.option_text, is_correct: o.is_correct, order_index: i }))
    );
    if (oErr) insertErrors.push('options: ' + oErr.message);
  }

  return Response.json({ success: true, moduleId: mod.id, lessonId: lesson.id, insertErrors: insertErrors.length ? insertErrors : undefined });
}
