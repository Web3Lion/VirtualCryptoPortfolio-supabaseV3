export function prevDay(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function calcStreak(sortedDatesDesc, todayStr, claimedToday) {
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
export function tokensForDay(day) {
  return day <= 10 ? day * 5 : 50;
}

// Pure decision function: given the student's full reward-ledger rows (login_streak:/freeze_used:/store:streak_freeze
// reasons only) and today's date, decides what (if anything) should be awarded/consumed. Performs no I/O — the
// caller is responsible for executing `inserts` against the database.
export function decideLoginStreak(ledgerRows, todayStr, { allowAward }) {
  const reasons = ledgerRows || [];
  const alreadyClaimed = reasons.some(r => r.reason === `login_streak:${todayStr}`);
  const loginDates = [...new Set(reasons.filter(r => r.reason.startsWith('login_streak:')).map(r => r.reason.replace('login_streak:', '')))];
  const freezeDates = [...new Set(reasons.filter(r => r.reason.startsWith('freeze_used:')).map(r => r.reason.replace('freeze_used:', '')))];
  const freezesOwned = reasons.filter(r => r.reason === 'store:streak_freeze').length;

  let effectiveDates = [...new Set([...loginDates, ...freezeDates])].sort().reverse();

  let justEarned = false;
  let freezeUsed = false;
  let tokensAwarded = 0;
  const inserts = [];

  if (!alreadyClaimed && allowAward) {
    const yesterday = prevDay(todayStr);
    const dayBeforeYesterday = prevDay(yesterday);
    const freezesAvailable = freezesOwned - freezeDates.length;
    const hasGap = effectiveDates.length > 0 && effectiveDates[0] !== yesterday;

    // A streak freeze covers exactly one missed day: yesterday is missing but the day before it isn't.
    if (hasGap && effectiveDates[0] === dayBeforeYesterday && freezesAvailable > 0) {
      inserts.push({ tokens: 0, reason: `freeze_used:${yesterday}` });
      effectiveDates = [yesterday, ...effectiveDates];
      freezeUsed = true;
    }

    const day = calcStreak(effectiveDates, todayStr, false) + 1;
    const tokens = tokensForDay(day);
    inserts.push({ tokens, reason: `login_streak:${todayStr}` });
    justEarned = true;
    tokensAwarded = tokens;
    if (!effectiveDates.includes(todayStr)) effectiveDates = [todayStr, ...effectiveDates];
  }

  const claimed = alreadyClaimed || justEarned;
  const streak = calcStreak(effectiveDates, todayStr, claimed);
  const tokensToday = justEarned
    ? tokensAwarded
    : (alreadyClaimed ? (reasons.find(r => r.reason === `login_streak:${todayStr}`)?.tokens || 0) : 0);
  const tokensTomorrow = tokensForDay(streak + 1);
  const freezesAvailable = Math.max(0, freezesOwned - (freezeUsed ? freezeDates.length + 1 : freezeDates.length));

  return { claimed, justEarned, freezeUsed, tokensAwarded, tokensToday, tokensTomorrow, streak, freezesAvailable, inserts };
}
