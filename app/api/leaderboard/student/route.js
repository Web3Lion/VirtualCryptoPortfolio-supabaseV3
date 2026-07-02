import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateSharpe, calculateSortino, calculateMaxDrawdown, calculateWinRate } from '@/lib/metrics';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId');
  let classId     = searchParams.get('classId');
  if (!studentId) return Response.json({ error: 'studentId required' }, { status: 400 });

  const email = session.user.email.toLowerCase();
  const isTeacher = email === process.env.TEACHER_EMAIL?.toLowerCase();

  // Auto-detect classId: find a class both viewer and target share
  if (!classId) {
    if (isTeacher) {
      const { data: tc } = await db.from('classes').select('id').eq('teacher_email', process.env.TEACHER_EMAIL).order('created_at', { ascending: false }).limit(1).single();
      classId = tc?.id;
    } else {
      const { data: me } = await db.from('students').select('id').eq('email', email).single();
      if (me) {
        const { data: myClasses } = await db.from('class_students').select('class_id').eq('student_id', me.id);
        const myClassIds = (myClasses || []).map(c => c.class_id);
        const { data: theirClasses } = await db.from('class_students').select('class_id').eq('student_id', studentId);
        classId = (theirClasses || []).map(c => c.class_id).find(id => myClassIds.includes(id));
      }
    }
  }
  if (!classId) return Response.json({ error: 'Class not found' }, { status: 404 });

  // Verify requester is in the same class (or is teacher)
  if (!isTeacher) {
    const { data: me } = await db.from('students').select('id').eq('email', email).single();
    if (me) {
      const { data: membership } = await db.from('class_students').select('class_id').eq('student_id', me.id).eq('class_id', classId).single();
      if (!membership) return Response.json({ error: 'Not in this class' }, { status: 403 });
    }
  }

  const { data: student } = await db.from('students').select('id, name, email, is_bot').eq('id', studentId).single();
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  const { data: cls } = await db.from('classes').select('seed_money').eq('id', classId).single();
  const seedMoney = parseFloat(cls?.seed_money || 10000);

  const [portRes, holdRes, tradesRes, snapsRes, badgesRes, ledgerRes, attemptsRes] = await Promise.all([
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).eq('class_id', classId).single(),
    db.from('holdings').select('coin, quantity, avg_buy_price, margin_borrowed').eq('student_id', studentId).eq('class_id', classId),
    db.from('trades').select('action, coin, quantity, price, gross_value, fee, cash_after, reasoning, created_at').eq('student_id', studentId).eq('class_id', classId).order('created_at', { ascending: false }).limit(20),
    db.from('snapshots').select('total_value, created_at').eq('student_id', studentId).eq('class_id', classId).order('created_at', { ascending: true }),
    db.from('badges').select('badge_id, earned_at').eq('student_id', studentId).eq('class_id', classId),
    db.from('class_reward_ledger').select('tokens, reason').eq('student_id', studentId).eq('class_id', classId),
    db.from('learn_attempts').select('lesson_id, passed, score, created_at').eq('student_id', studentId).eq('class_id', classId).order('created_at', { ascending: false }),
  ]);

  const cash = parseFloat(portRes.data?.cash || 0);
  const feesPaid = parseFloat(portRes.data?.fees_paid || 0);
  const holdings = holdRes.data || [];

  // Get prices for held coins
  const coins = [...new Set(holdings.map(h => h.coin))];
  const priceMap = {};
  if (coins.length) {
    const { data: prices } = await db.from('price_cache').select('symbol, price').in('symbol', coins);
    (prices || []).forEach(p => { priceMap[p.symbol] = parseFloat(p.price); });
  }

  const holdingsWithPrices = holdings.map(h => {
    const curPrice = priceMap[h.coin] || parseFloat(h.avg_buy_price);
    const qty = parseFloat(h.quantity);
    const avgBuy = parseFloat(h.avg_buy_price);
    const isShort = qty < 0;
    const curVal = qty * curPrice;
    const plPct = isShort
      ? (avgBuy > 0 ? ((avgBuy - curPrice) / avgBuy) * 100 : 0)
      : (avgBuy > 0 ? ((curPrice / avgBuy) - 1) * 100 : 0);
    const plTotal = (curPrice - avgBuy) * qty;
    const marginBorrowed = parseFloat(h.margin_borrowed || 0);
    return { coin: h.coin, qty, avgBuy, curPrice, curVal, plPct, plTotal, marginBorrowed, isShort };
  });

  const holdingsVal = holdingsWithPrices.reduce((s, h) => s + h.curVal, 0);
  const totalBorrowed = holdingsWithPrices.reduce((s, h) => s + h.marginBorrowed, 0);
  const totalVal = cash + holdingsVal - totalBorrowed;
  const pl = totalVal - seedMoney;
  const returnPct = ((totalVal / seedMoney) - 1) * 100;

  const snapshots = snapsRes.data || [];
  const trades = tradesRes.data || [];

  // Mini chart: last 30 daily snapshots
  const dailySnaps = snapshots
    .filter(s => {
      // deduplicate to one per day
      return true;
    })
    .slice(-30)
    .map(s => ({ t: s.created_at.slice(0, 10), v: parseFloat(s.total_value) }));

  // Deduplicate daily
  const dayMap = {};
  snapshots.forEach(s => { dayMap[s.created_at.slice(0, 10)] = parseFloat(s.total_value); });
  const chartData = Object.entries(dayMap).sort(([a],[b])=>a.localeCompare(b)).slice(-30).map(([t,v])=>({t,v}));

  // Tokens & items from ledger
  const ledger = ledgerRes.data || [];
  const tokenBalance = ledger.reduce((s, r) => s + (r.tokens || 0), 0);
  const FLAIR_EMOJI = { flair_star:'⭐', flair_fire:'🔥', flair_diamond:'💎', flair_crown:'👑' };
  const storePurchases = ledger.filter(r => r.reason?.startsWith('store:') && r.tokens < 0);
  const activeFlair = (() => {
    const f = storePurchases.find(r => r.reason?.startsWith('store:flair_'));
    return f ? (FLAIR_EMOJI[f.reason.replace('store:', '')] || null) : null;
  })();
  const activeTitle = (() => {
    const TITLES = { title_hodler:'🧘 HODLer', title_whale:'🐳 Whale', title_oracle:'🔮 Oracle' };
    const t = storePurchases.find(r => r.reason?.startsWith('store:title_'));
    return t ? (TITLES[t.reason.replace('store:', '')] || null) : null;
  })();
  const freezesPurchased = ledger.filter(r => r.reason === 'store:streak_freeze').length;
  const freezesUsed     = ledger.filter(r => r.reason?.startsWith('freeze_used:')).length;
  const freezesAvailable = Math.max(0, freezesPurchased - freezesUsed);

  // Login streak from ledger
  const loginReasons = ledger.filter(r => r.reason?.startsWith('login_streak:') || r.reason?.startsWith('freeze_used:'));
  const loginDates = [...new Set(loginReasons.filter(r => r.reason.startsWith('login_streak:')).map(r => r.reason.replace('login_streak:', '')))];
  const freezeDates = [...new Set(loginReasons.filter(r => r.reason.startsWith('freeze_used:')).map(r => r.reason.replace('freeze_used:', '')))];
  const allStreakDates = [...new Set([...loginDates, ...freezeDates])].sort().reverse();
  const todayStr = new Date().toISOString().slice(0, 10);
  const prevDay = d => { const dt = new Date(d + 'T12:00:00Z'); dt.setDate(dt.getDate() - 1); return dt.toISOString().slice(0, 10); };
  let loginStreak = 0, check = allStreakDates[0] === todayStr ? todayStr : prevDay(todayStr);
  for (const d of allStreakDates) {
    if (d === check) { loginStreak++; check = prevDay(check); } else if (d < check) break;
  }

  // Lesson completions
  const attempts = attemptsRes.data || [];
  const bestByLesson = {};
  attempts.forEach(a => {
    const prev = bestByLesson[a.lesson_id];
    if (!prev || a.score > prev.score) bestByLesson[a.lesson_id] = a;
  });
  const lessonsAttempted = Object.keys(bestByLesson).length;
  const lessonsPassed    = Object.values(bestByLesson).filter(a => a.passed).length;

  return Response.json({
    student: { id: student.id, name: student.name, isBot: student.is_bot },
    summary: {
      totalVal: totalVal.toFixed(2),
      cash: cash.toFixed(2),
      holdingsVal: holdingsVal.toFixed(2),
      pl: pl.toFixed(2),
      returnPct: returnPct.toFixed(2),
      fees: feesPaid.toFixed(2),
      seedMoney,
    },
    metrics: {
      sharpe:      calculateSharpe(snapshots),
      sortino:     calculateSortino(snapshots),
      maxDrawdown: calculateMaxDrawdown(snapshots),
      winRate:     calculateWinRate(trades.map(t => ({ ...t, grossValue: t.gross_value }))),
    },
    holdings: holdingsWithPrices,
    recentTrades: trades.slice(0, 10).map(t => ({
      action: t.action, coin: t.coin,
      quantity: parseFloat(t.quantity),
      price: parseFloat(t.price),
      createdAt: t.created_at,
    })),
    chartData,
    badges: (badgesRes.data || []).map(b => b.badge_id),
    rewards: { tokenBalance, activeFlair, activeTitle, freezesAvailable, freezesPurchased, freezesUsed },
    streak: { loginStreak },
    progress: { lessonsAttempted, lessonsPassed },
  });
}
