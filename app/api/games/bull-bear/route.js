import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const DEFAULT_TOKENS_PER_CORRECT = 5;
const DEFAULT_MAX_TOKENS_PER_DAY = 50;

async function getStudentAndClass(email, classId) {
  const { data: student } = await db.from('students').select('id').eq('email', email.toLowerCase()).single();
  if (!student) return {};
  if (classId) return { studentId: student.id, classId };
  const { data: cs } = await db.from('class_students').select('class_id')
    .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
  return { studentId: student.id, classId: cs?.class_id };
}

// GET — returns config for the game (enabled, token rate, today's usage)
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const { studentId } = await getStudentAndClass(session.user.email, classId);
  const { data: cfg } = await db.from('class_reward_config').select('*').eq('class_id', classId).single();

  const enabled          = !!(cfg?.enabled && cfg?.bull_bear_enabled !== false);
  const tokensPerCorrect = cfg?.bull_bear_tokens_per_correct ?? DEFAULT_TOKENS_PER_CORRECT;
  const maxPerDay        = cfg?.bull_bear_max_tokens_per_day ?? DEFAULT_MAX_TOKENS_PER_DAY;

  let tokensToday = 0;
  if (studentId) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: ledger } = await db.from('class_reward_ledger')
      .select('tokens')
      .eq('student_id', studentId).eq('class_id', classId)
      .like('reason', 'bullbear:%')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at',  `${today}T23:59:59Z`);
    tokensToday = (ledger || []).reduce((s, r) => s + (r.tokens || 0), 0);
  }

  return Response.json({ enabled, tokensPerCorrect, maxPerDay, tokensToday });
}

// POST — submit game result, claim tokens
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { classId, score, total } = await request.json();
  if (!classId || score == null) return Response.json({ error: 'classId and score required' }, { status: 400 });

  const { studentId } = await getStudentAndClass(session.user.email, classId);
  if (!studentId) return Response.json({ error: 'Student not found' }, { status: 404 });

  const { data: cfg } = await db.from('class_reward_config').select('*').eq('class_id', classId).single();
  if (!cfg?.enabled || cfg?.bull_bear_enabled === false)
    return Response.json({ tokensAwarded: 0, reason: 'Bull or Bear rewards not enabled' });

  const tokensPerCorrect = cfg?.bull_bear_tokens_per_correct ?? DEFAULT_TOKENS_PER_CORRECT;
  const maxPerDay        = cfg?.bull_bear_max_tokens_per_day ?? DEFAULT_MAX_TOKENS_PER_DAY;

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLedger } = await db.from('class_reward_ledger')
    .select('tokens')
    .eq('student_id', studentId).eq('class_id', classId)
    .like('reason', 'bullbear:%')
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at',  `${today}T23:59:59Z`);

  const tokensToday = (todayLedger || []).reduce((s, r) => s + (r.tokens || 0), 0);
  const remaining   = Math.max(0, maxPerDay - tokensToday);
  if (remaining === 0) return Response.json({ tokensAwarded: 0, reason: 'Daily limit reached', tokensToday, maxPerDay });

  const tokensEarned = Math.min(score * tokensPerCorrect, remaining);

  if (tokensEarned > 0) {
    await db.from('class_reward_ledger').insert({
      student_id: studentId, class_id: classId,
      tokens: tokensEarned,
      reason: `bullbear:${score}/${total}`,
    });
  }

  return Response.json({ tokensAwarded: tokensEarned, tokensToday: tokensToday + tokensEarned, maxPerDay });
}
