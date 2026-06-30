import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkBadgesAfterMiner } from '@/app/api/games/miner-badge-check';

const DEFAULT_MAX_TOKENS    = 40;
const DEFAULT_PTS_PER_TOKEN = 50;

async function getStudentAndClass(email) {
  const { data: student } = await db.from('students').select('id').eq('email', email.toLowerCase()).single();
  if (!student) return {};
  const { data: cs } = await db.from('class_students').select('class_id')
    .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
  return { studentId: student.id, classId: cs?.class_id };
}

// GET — today's tokens earned from Miner Runner
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const { studentId } = await getStudentAndClass(session.user.email);
  if (!studentId) return Response.json({ tokensToday: 0, maxTokens: DEFAULT_MAX_TOKENS, pointsPerToken: DEFAULT_PTS_PER_TOKEN });

  const { data: cfg } = await db.from('class_reward_config').select('*').eq('class_id', classId).single();
  const maxTokens     = cfg?.miner_max_tokens_per_day  ?? DEFAULT_MAX_TOKENS;
  const pointsPerToken = cfg?.miner_points_per_token   ?? DEFAULT_PTS_PER_TOKEN;

  const today = new Date().toISOString().slice(0, 10);
  const { data: ledger } = await db.from('class_reward_ledger')
    .select('tokens')
    .eq('student_id', studentId).eq('class_id', classId)
    .like('reason', 'miner:%')
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at',  `${today}T23:59:59Z`);

  const tokensToday = (ledger || []).reduce((s, r) => s + (r.tokens || 0), 0);
  return Response.json({ tokensToday, maxTokens, pointsPerToken });
}

// POST — submit a completed run, claim tokens + badges
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { classId, score, level } = await request.json();
  if (!classId || score == null) return Response.json({ error: 'classId and score required' }, { status: 400 });

  const { studentId } = await getStudentAndClass(session.user.email);
  if (!studentId) return Response.json({ error: 'Student not found' }, { status: 404 });

  const { data: cfg } = await db.from('class_reward_config').select('*').eq('class_id', classId).single();
  if (!cfg?.enabled) return Response.json({ tokensAwarded: 0, reason: 'Rewards not enabled for this class' });

  const maxTokens     = cfg?.miner_max_tokens_per_day  ?? DEFAULT_MAX_TOKENS;
  const pointsPerToken = cfg?.miner_points_per_token   ?? DEFAULT_PTS_PER_TOKEN;

  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLedger } = await db.from('class_reward_ledger')
    .select('tokens')
    .eq('student_id', studentId).eq('class_id', classId)
    .like('reason', 'miner:%')
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at',  `${today}T23:59:59Z`);

  const tokensToday = (todayLedger || []).reduce((s, r) => s + (r.tokens || 0), 0);
  const remaining   = Math.max(0, maxTokens - tokensToday);
  if (remaining === 0) return Response.json({ tokensAwarded: 0, reason: 'Daily limit reached', tokensToday, maxTokens });

  const tokensEarned = Math.min(Math.floor(score / pointsPerToken), remaining);

  if (tokensEarned > 0) {
    await db.from('class_reward_ledger').insert({
      student_id: studentId, class_id: classId,
      tokens: tokensEarned,
      reason: `miner:${score}pts`,
    });
  }

  const newTodayTotal = tokensToday + tokensEarned;
  const badgeResult = await checkBadgesAfterMiner({ studentId, classId, score, level, tokensToday: newTodayTotal, maxTokens });

  return Response.json({ tokensAwarded: tokensEarned, tokensToday: newTodayTotal, maxTokens, newBadges: badgeResult.newBadges });
}
