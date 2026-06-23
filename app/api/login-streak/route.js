import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

const today = () => new Date().toISOString().slice(0, 10);

function prevDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function calcStreak(sortedDatesDesc, todayStr, claimedToday) {
  if (!sortedDatesDesc.length) return 0;
  let streak = 0;
  let check = claimedToday ? todayStr : prevDay(todayStr);
  for (const d of sortedDatesDesc) {
    if (d === check) { streak++; check = prevDay(check); }
    else if (d < check) break;
  }
  return streak;
}

// Day 1 = 5 tokens, day 2 = 10, ... day 10 = 50, then 50/day for every consecutive login after that.
function tokensForDay(day) {
  return day <= 10 ? day * 5 : 50;
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

  const { data: ledger } = await db.from('class_reward_ledger').select('tokens, reason')
    .eq('student_id', student.id).eq('class_id', classId)
    .or('reason.like.login_streak:%,reason.like.freeze_used:%,reason.eq.store:streak_freeze');

  const alreadyClaimed = (ledger || []).some(r => r.reason === `login_streak:${today()}`);
  const loginDates = [...new Set((ledger || []).filter(r => r.reason.startsWith('login_streak:')).map(r => r.reason.replace('login_streak:', '')))];
  const freezeDates = [...new Set((ledger || []).filter(r => r.reason.startsWith('freeze_used:')).map(r => r.reason.replace('freeze_used:', '')))];
  const freezesOwned = (ledger || []).filter(r => r.reason === 'store:streak_freeze').length;

  // Combine real logins with freeze-protected gap days for streak continuity purposes.
  let effectiveDates = [...new Set([...loginDates, ...freezeDates])].sort().reverse();

  let justEarned = false;
  let freezeUsed = false;
  let tokensAwarded = 0;
  if (!alreadyClaimed) {
    try {
      const { data: cfg } = await db.from('class_reward_config').select('enabled').eq('class_id', classId).single();
      if (cfg?.enabled) {
        const yesterday = prevDay(today());
        const dayBeforeYesterday = prevDay(yesterday);
        const freezesAvailable = freezesOwned - freezeDates.length;
        const hasGap = effectiveDates.length > 0 && effectiveDates[0] !== yesterday;
        // A streak freeze covers exactly one missed day: yesterday is missing but the day before it isn't.
        if (hasGap && effectiveDates[0] === dayBeforeYesterday && freezesAvailable > 0) {
          await db.from('class_reward_ledger').insert({
            student_id: student.id, class_id: classId,
            tokens: 0, reason: `freeze_used:${yesterday}`,
          });
          effectiveDates = [yesterday, ...effectiveDates];
          freezeUsed = true;
        }

        const day = calcStreak(effectiveDates, today(), false) + 1;
        const tokens = tokensForDay(day);
        await db.from('class_reward_ledger').insert({
          student_id: student.id, class_id: classId,
          tokens, reason: `login_streak:${today()}`,
        });
        justEarned = true;
        tokensAwarded = tokens;
        if (!effectiveDates.includes(today())) effectiveDates.unshift(today());
      }
    } catch {}
  }

  const claimed = alreadyClaimed || justEarned;
  const streak = calcStreak(effectiveDates, today(), claimed);
  const tokensToday = justEarned ? tokensAwarded : (alreadyClaimed ? ((ledger || []).find(r => r.reason === `login_streak:${today()}`)?.tokens || 0) : 0);
  const tokensTomorrow = tokensForDay(streak + 1);
  const freezesAvailable = Math.max(0, freezesOwned - (freezeUsed ? freezeDates.length + 1 : freezeDates.length));

  return Response.json({ claimed, justEarned, freezeUsed, tokensAwarded, tokensToday, tokensTomorrow, streak, freezesAvailable, date: today() });
}
