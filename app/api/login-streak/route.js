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

  const { data: existing } = await db.from('class_reward_ledger').select('tokens')
    .eq('student_id', student.id).eq('class_id', classId)
    .eq('reason', `login_streak:${today()}`).limit(1);
  const alreadyClaimed = (existing || []).length > 0;

  const { data: allLogins } = await db.from('class_reward_ledger')
    .select('reason').eq('student_id', student.id).eq('class_id', classId)
    .like('reason', 'login_streak:%').order('reason', { ascending: false });
  const loginDates = [...new Set((allLogins || []).map(c => c.reason.replace('login_streak:', '')))].sort().reverse();

  let justEarned = false;
  let tokensAwarded = 0;
  if (!alreadyClaimed) {
    try {
      const { data: cfg } = await db.from('class_reward_config').select('enabled').eq('class_id', classId).single();
      if (cfg?.enabled) {
        const day = calcStreak(loginDates, today(), false) + 1;
        const tokens = tokensForDay(day);
        await db.from('class_reward_ledger').insert({
          student_id: student.id, class_id: classId,
          tokens, reason: `login_streak:${today()}`,
        });
        justEarned = true;
        tokensAwarded = tokens;
        if (!loginDates.includes(today())) loginDates.unshift(today());
      }
    } catch {}
  }

  const claimed = alreadyClaimed || justEarned;
  const streak = calcStreak(loginDates, today(), claimed);
  const tokensToday = justEarned ? tokensAwarded : (alreadyClaimed ? (existing[0]?.tokens || 0) : 0);
  const tokensTomorrow = tokensForDay(streak + 1);

  return Response.json({ claimed, justEarned, tokensAwarded, tokensToday, tokensTomorrow, streak, date: today() });
}
