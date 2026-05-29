import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

const CHALLENGES = [
  { id: 'any_trade',    emoji: '📊', name: 'Market Mover',     desc: 'Execute any trade today',                          tokens: 25, detail: 'Open the market and buy or sell any coin.' },
  { id: 'learn_one',   emoji: '📚', name: 'Daily Student',    desc: 'Complete any lesson in the Learning Hub',           tokens: 30, detail: 'Head to Learn and finish one lesson.' },
  { id: 'perfect_quiz',emoji: '💯', name: 'Perfectionist',   desc: 'Score 100% on any quiz today',                     tokens: 50, detail: 'Get every question right on a quiz lesson.' },
  { id: 'crush_play',  emoji: '🎮', name: 'Crush Addict',     desc: 'Play a round of Crypto Crush',                     tokens: 20, detail: 'Jump into Crypto Crush and finish a game.' },
  { id: 'write_note',  emoji: '✍️', name: 'Trade Journalist', desc: 'Write a trade note with 50+ characters',            tokens: 25, detail: 'Add a detailed note when making any trade.' },
  { id: 'three_trades',emoji: '⚡', name: 'Active Trader',    desc: 'Make 3 or more trades today',                      tokens: 40, detail: 'Execute three separate buy or sell trades.' },
  { id: 'hold_3',      emoji: '🌈', name: 'Diversifier',      desc: 'Hold 3 or more different coins right now',          tokens: 30, detail: 'Build a portfolio with at least 3 different coins.' },
];

function todayChallenge() {
  const d = new Date();
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  return CHALLENGES[dayOfYear % CHALLENGES.length];
}

const today = () => new Date().toISOString().slice(0, 10);

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function calcStreak(sortedDatesDesc, todayStr, claimedToday) {
  if (!sortedDatesDesc.length) return 0;
  let streak = 0;
  // Start check from today if claimed, else from yesterday
  let check = claimedToday ? todayStr : prevDay(todayStr);
  for (const d of sortedDatesDesc) {
    if (d === check) { streak++; check = prevDay(check); }
    else if (d < check) break;
  }
  return streak;
}

async function checkCompletion(challenge, studentId, classId) {
  const start = `${today()}T00:00:00Z`;
  const end   = `${today()}T23:59:59Z`;

  if (challenge.id === 'any_trade') {
    const { count } = await db.from('trades').select('id', { count:'exact', head:true })
      .eq('student_id', studentId).eq('class_id', classId).gte('created_at', start).lte('created_at', end);
    return { met: (count || 0) >= 1, progress: count || 0, target: 1 };
  }
  if (challenge.id === 'three_trades') {
    const { count } = await db.from('trades').select('id', { count:'exact', head:true })
      .eq('student_id', studentId).eq('class_id', classId).gte('created_at', start).lte('created_at', end);
    return { met: (count || 0) >= 3, progress: Math.min(count || 0, 3), target: 3 };
  }
  if (challenge.id === 'write_note') {
    const { data } = await db.from('trades').select('reasoning')
      .eq('student_id', studentId).eq('class_id', classId).gte('created_at', start).lte('created_at', end);
    const noted = (data || []).filter(t => (t.reasoning || '').trim().length >= 50).length;
    return { met: noted >= 1, progress: noted, target: 1 };
  }
  if (challenge.id === 'learn_one') {
    const { count } = await db.from('learn_attempts').select('id', { count:'exact', head:true })
      .eq('student_id', studentId).eq('class_id', classId).eq('passed', true).gte('completed_at', start).lte('completed_at', end);
    return { met: (count || 0) >= 1, progress: count || 0, target: 1 };
  }
  if (challenge.id === 'perfect_quiz') {
    const { count } = await db.from('learn_attempts').select('id', { count:'exact', head:true })
      .eq('student_id', studentId).eq('class_id', classId).eq('score', 100).gte('completed_at', start).lte('completed_at', end);
    return { met: (count || 0) >= 1, progress: count || 0, target: 1 };
  }
  if (challenge.id === 'crush_play') {
    const { data } = await db.from('class_reward_ledger').select('id')
      .eq('student_id', studentId).eq('class_id', classId).like('reason', 'crush:%')
      .gte('created_at', start).lte('created_at', end);
    return { met: (data || []).length >= 1, progress: (data || []).length, target: 1 };
  }
  if (challenge.id === 'hold_3') {
    const { count } = await db.from('holdings').select('id', { count:'exact', head:true })
      .eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0);
    return { met: (count || 0) >= 3, progress: Math.min(count || 0, 3), target: 3 };
  }
  return { met: false, progress: 0, target: 1 };
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ error: 'No class' }, { status: 404 });

  const challenge = todayChallenge();

  // Check if already claimed today
  const { data: existing } = await db.from('class_reward_ledger').select('id')
    .eq('student_id', student.id).eq('class_id', classId)
    .eq('reason', `daily_challenge:${today()}`).limit(1);
  const alreadyClaimed = (existing || []).length > 0;

  const completion = await checkCompletion(challenge, student.id, classId);

  // Fetch all past completions for streak calculation
  const { data: allCompletions } = await db.from('class_reward_ledger')
    .select('reason').eq('student_id', student.id).eq('class_id', classId)
    .like('reason', 'daily_challenge:%').order('reason', { ascending: false });
  const completionDates = [...new Set((allCompletions || []).map(c => c.reason.replace('daily_challenge:', '')))].sort().reverse();

  // Auto-award if conditions met and not yet claimed
  let justEarned = false;
  let tokensAwarded = 0;
  if (completion.met && !alreadyClaimed) {
    try {
      const { data: cfg } = await db.from('class_reward_config').select('enabled').eq('class_id', classId).single();
      if (cfg?.enabled) {
        await db.from('class_reward_ledger').insert({
          student_id: student.id, class_id: classId,
          tokens: challenge.tokens, reason: `daily_challenge:${today()}`,
        });
        justEarned = true;
        tokensAwarded = challenge.tokens;
        // Add today to dates for streak calc
        if (!completionDates.includes(today())) completionDates.unshift(today());
      }
    } catch {}
  }

  const claimed = alreadyClaimed || justEarned;
  const streak  = calcStreak(completionDates, today(), claimed);

  // Award streak badges at milestones
  if (justEarned && streak > 0) {
    const awardBadge = async (id) => {
      const { data: ex } = await db.from('badges').select('id').eq('student_id', student.id).eq('class_id', classId).eq('badge_id', id).single();
      if (!ex) await db.from('badges').insert({ student_id: student.id, class_id: classId, badge_id: id, earned_at: new Date().toISOString() }).catch(() => {});
    };
    if (streak >= 3)  await awardBadge('streak_3');
    if (streak >= 7)  await awardBadge('streak_7');
    if (streak >= 14) await awardBadge('streak_14');
    if (streak >= 30) await awardBadge('streak_30');
  }

  return Response.json({
    challenge, completion, claimed, justEarned, tokensAwarded,
    streak, date: today(),
  });
}
