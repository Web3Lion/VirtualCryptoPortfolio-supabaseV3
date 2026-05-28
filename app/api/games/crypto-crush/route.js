import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// GET — today's tokens earned from crush for this student/class
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const email = session.user.email.toLowerCase();
  const { data: student } = await db.from('students').select('id').eq('email', email).single();
  if (!student) return Response.json({ tokensToday: 0, maxTokens: 50, pointsPerToken: 100 });

  // Get crush config from class_reward_config
  const { data: cfg } = await db.from('class_reward_config').select('*').eq('class_id', classId).single();
  const maxTokens = cfg?.crush_max_tokens_per_day ?? 50;
  const pointsPerToken = cfg?.crush_points_per_token ?? 100;

  // Sum crush tokens earned today
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLedger } = await db.from('class_reward_ledger')
    .select('tokens')
    .eq('student_id', student.id)
    .eq('class_id', classId)
    .like('reason', 'crush:%')
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at', `${today}T23:59:59Z`);

  const tokensToday = (todayLedger || []).reduce((s, r) => s + (r.tokens || 0), 0);
  return Response.json({ tokensToday, maxTokens, pointsPerToken });
}

// POST — claim tokens for a completed game session
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { classId, score } = await request.json();
  if (!classId || score == null) return Response.json({ error: 'classId and score required' }, { status: 400 });

  const email = session.user.email.toLowerCase();
  const { data: student } = await db.from('students').select('id').eq('email', email).single();
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  // Check rewards enabled
  const { data: cfg } = await db.from('class_reward_config').select('*').eq('class_id', classId).single();
  if (!cfg?.enabled) return Response.json({ tokensAwarded: 0, reason: 'Rewards not enabled for this class' });

  const maxTokens = cfg?.crush_max_tokens_per_day ?? 50;
  const pointsPerToken = cfg?.crush_points_per_token ?? 100;

  // How many tokens already earned today from crush
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayLedger } = await db.from('class_reward_ledger')
    .select('tokens')
    .eq('student_id', student.id)
    .eq('class_id', classId)
    .like('reason', 'crush:%')
    .gte('created_at', `${today}T00:00:00Z`)
    .lt('created_at', `${today}T23:59:59Z`);

  const tokensToday = (todayLedger || []).reduce((s, r) => s + (r.tokens || 0), 0);
  const remaining = Math.max(0, maxTokens - tokensToday);
  if (remaining === 0) return Response.json({ tokensAwarded: 0, reason: 'Daily limit reached' });

  // Convert score to tokens, capped at remaining daily limit
  const tokensEarned = Math.min(Math.floor(score / pointsPerToken), remaining);
  if (tokensEarned <= 0) return Response.json({ tokensAwarded: 0, reason: 'Score too low to earn tokens' });

  await db.from('class_reward_ledger').insert({
    student_id: student.id,
    class_id: classId,
    tokens: tokensEarned,
    reason: `crush:${score}pts`,
  });

  return Response.json({ tokensAwarded: tokensEarned, tokensToday: tokensToday + tokensEarned, maxTokens });
}
