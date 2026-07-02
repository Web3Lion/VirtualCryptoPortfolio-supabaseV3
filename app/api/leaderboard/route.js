import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateSharpe, calculateSortino, calculateMaxDrawdown, calculateWinRate } from '@/lib/metrics';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');

  // Find class if not provided
  if (!classId) {
    const email = session.user.email.toLowerCase();
    // Try teacher's class first
    const { data: teacherClass } = await db
      .from('classes')
      .select('id')
      .eq('teacher_email', process.env.TEACHER_EMAIL)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (teacherClass) {
      classId = teacherClass.id;
    } else {
      // Find student's class
      const { data: student } = await db.from('students').select('id').eq('email', email).single();
      if (student) {
        const { data: cs } = await db.from('class_students').select('class_id')
          .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
        classId = cs?.class_id;
      }
    }
  }
  if (!classId) return Response.json([]);

  // Get class config
  const { data: cls } = await db.from('classes').select('seed_money, trade_fee').eq('id', classId).single();
  const seedMoney = parseFloat(cls?.seed_money || 10000);

  // Get all students in class
  const { data: classStudents } = await db
    .from('class_students')
    .select('student_id, students(id, name, email, is_bot)')
    .eq('class_id', classId);

  if (!classStudents?.length) return Response.json([]);

  const students = classStudents.map(r => r.students).filter(Boolean);

  // Get all portfolios, holdings, trades for this class
  const studentIds = students.map(s => s.id);

  const FLAIR_EMOJI = { flair_star:'⭐', flair_fire:'🔥', flair_diamond:'💎', flair_crown:'👑' };
  const TITLE_LABELS = { title_hodler:'HODLer', title_whale:'Whale', title_oracle:'Oracle' };

  const [portfoliosRes, holdingsRes, tradesRes, pricesRes, snapshotsRes, flairRes, loginStreakRes, titleRes] = await Promise.all([
    db.from('portfolios').select('student_id, cash, fees_paid').in('student_id', studentIds).eq('class_id', classId),
    db.from('holdings').select('student_id, coin, quantity, avg_buy_price').in('student_id', studentIds).eq('class_id', classId).gt('quantity', 0),
    db.from('trades').select('student_id, action, coin, gross_value, fee, created_at').in('student_id', studentIds).eq('class_id', classId),
    db.from('price_cache').select('symbol, price'),
    db.from('snapshots').select('student_id, total_value, created_at').in('student_id', studentIds).eq('class_id', classId).order('created_at', { ascending: true }),
    db.from('class_reward_ledger').select('student_id, reason, created_at').in('student_id', studentIds).eq('class_id', classId).like('reason', 'store:flair_%').order('created_at', { ascending: false }),
    db.from('class_reward_ledger').select('student_id, reason').in('student_id', studentIds).eq('class_id', classId)
      .or('reason.like.login_streak:%,reason.like.freeze_used:%,reason.eq.store:streak_freeze'),
    db.from('class_reward_ledger').select('student_id, reason, created_at').in('student_id', studentIds).eq('class_id', classId).like('reason', 'store:title_%').order('created_at', { ascending: false }),
  ]);

  // Most recent flair per student
  const flairMap = {};
  (flairRes.data || []).forEach(f => {
    if (!flairMap[f.student_id]) flairMap[f.student_id] = FLAIR_EMOJI[f.reason.replace('store:', '')] || null;
  });

  // Most recent title per student
  const titleMap = {};
  (titleRes.data || []).forEach(t => {
    if (!titleMap[t.student_id]) titleMap[t.student_id] = TITLE_LABELS[t.reason.replace('store:', '')] || null;
  });

  const portfolioMap = {};
  (portfoliosRes.data || []).forEach(p => { portfolioMap[p.student_id] = p; });

  const holdingsMap = {};
  (holdingsRes.data || []).forEach(h => {
    if (!holdingsMap[h.student_id]) holdingsMap[h.student_id] = [];
    holdingsMap[h.student_id].push(h);
  });

  const tradeCountMap = {};
  const tradesByStudent = {};
  (tradesRes.data || []).forEach(t => {
    tradeCountMap[t.student_id] = (tradeCountMap[t.student_id] || 0) + 1;
    if (!tradesByStudent[t.student_id]) tradesByStudent[t.student_id] = [];
    tradesByStudent[t.student_id].push(t);
  });

  const priceMap = {};
  (pricesRes.data || []).forEach(p => { priceMap[p.symbol] = parseFloat(p.price); });

  // Staked value — after priceMap is built so lookups work
  const stakingMap = {};
  try {
    const { data: staked } = await db.from('staking_positions')
      .select('student_id, coin, quantity, status, total_rewards_earned, claimable_rewards')
      .in('student_id', studentIds)
      .eq('class_id', classId)
      .in('status', ['active', 'claimable']);
    (staked || []).forEach(s => {
      const price = priceMap[s.coin] || 0;
      const principal = parseFloat(s.quantity) * price;
      const rewardCoins = s.status === 'claimable'
        ? parseFloat(s.claimable_rewards || 0)
        : parseFloat(s.total_rewards_earned || 0);
      stakingMap[s.student_id] = (stakingMap[s.student_id] || 0) + principal + rewardCoins * price;
    });
  } catch (_) {}

  const snapshotsByStudent = {};
  (snapshotsRes.data || []).forEach(s => {
    if (!snapshotsByStudent[s.student_id]) snapshotsByStudent[s.student_id] = [];
    snapshotsByStudent[s.student_id].push(s);
  });

  // Pre-compute login streaks per student from class_reward_ledger login_streak:/freeze entries
  const loginLedgerByStudent = {};
  (loginStreakRes.data || []).forEach(r => {
    if (!loginLedgerByStudent[r.student_id]) loginLedgerByStudent[r.student_id] = [];
    loginLedgerByStudent[r.student_id].push(r.reason);
  });

  function prevDay(dateStr) {
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function calcLoginStreak(reasons) {
    const loginDates = [...new Set(reasons.filter(r => r.startsWith('login_streak:')).map(r => r.replace('login_streak:', '')))];
    const freezeDates = [...new Set(reasons.filter(r => r.startsWith('freeze_used:')).map(r => r.replace('freeze_used:', '')))];
    const freezesOwned = reasons.filter(r => r === 'store:streak_freeze').length;
    const freezesAvailable = Math.max(0, freezesOwned - freezeDates.length);
    const dates = [...new Set([...loginDates, ...freezeDates])].sort().reverse();
    if (!dates.length) return { loginStreak: 0, loginStreakAtRisk: false, freezesAvailable };
    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = prevDay(todayStr);
    const claimedToday = dates[0] === todayStr;
    let streak = 0, check = claimedToday ? todayStr : yesterday;
    for (const d of dates) {
      if (d === check) { streak++; check = prevDay(check); }
      else if (d < check) break;
    }
    const loginStreakAtRisk = !claimedToday && dates[0] === yesterday && streak > 0;
    return { loginStreak: streak, loginStreakAtRisk, freezesAvailable };
  }

  // Pre-compute trading streaks: consecutive calendar days (up to today) with ≥1 trade
  function calcStreak(trades) {
    const days = [...new Set(trades.map(t => t.created_at.slice(0, 10)))].sort().reverse();
    if (!days.length) return 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (days[0] !== today && days[0] !== yesterday) return 0;
    let streak = 1, check = days[0];
    for (let i = 1; i < days.length; i++) {
      const expected = new Date(new Date(check).getTime() - 86400000).toISOString().slice(0, 10);
      if (days[i] === expected) { streak++; check = expected; } else break;
    }
    return streak;
  }

  // Build leaderboard rows
  const rows = students.map(student => {
    const portfolio  = portfolioMap[student.id] || { cash: seedMoney, fees_paid: 0 };
    const cash       = parseFloat(portfolio.cash) || 0;
    const feesPaid   = parseFloat(portfolio.fees_paid) || 0;
    const holdings   = holdingsMap[student.id] || [];

    // Calculate holdings value using current prices
    let holdingsVal = 0;
    holdings.forEach(h => {
      const price = priceMap[h.coin] || parseFloat(h.avg_buy_price) || 0;
      holdingsVal += parseFloat(h.quantity) * price;
    });

    const { loginStreak, loginStreakAtRisk, freezesAvailable } = calcLoginStreak(loginLedgerByStudent[student.id] || []);

    const stakingVal = stakingMap[student.id] || 0;
    const totalVal   = cash + holdingsVal + stakingVal;
    const pl         = totalVal - seedMoney;
    const returnPct  = ((pl / seedMoney) * 100);

    return {
      id:          student.id,
      name:        student.name,
      email:       student.email,
      isBot:       student.is_bot || false,
      cash:        parseFloat(cash.toFixed(2)),
      holdingsVal: parseFloat(holdingsVal.toFixed(2)),
      stakingVal:  parseFloat(stakingVal.toFixed(2)),
      total:       parseFloat(totalVal.toFixed(2)),
      pl:          parseFloat(pl.toFixed(2)),
      returnPct:   parseFloat(returnPct.toFixed(2)),
      fees:       parseFloat(feesPaid.toFixed(2)),
      coinCount:  holdings.length,
      tradeCount:  tradeCountMap[student.id] || 0,
      sharpeRatio: calculateSharpe(snapshotsByStudent[student.id] || []),
      sortinoRatio: calculateSortino(snapshotsByStudent[student.id] || []),
      maxDrawdown:  calculateMaxDrawdown(snapshotsByStudent[student.id] || []),
      winRate:      calculateWinRate(tradesByStudent[student.id] || []),
      flair:        flairMap[student.id] || null,
      activeTitle:  titleMap[student.id] || null,
      streak:       calcStreak(tradesByStudent[student.id] || []),
      loginStreak,
      loginStreakAtRisk,
      freezesAvailable,
    };
  });

  // Sort by total value descending
  rows.sort((a, b) => b.total - a.total);

  // Rank change vs yesterday (most recent snapshot before today UTC midnight)
  const todayMidnight = new Date();
  todayMidnight.setUTCHours(0, 0, 0, 0);
  const prevValueMap = {};
  Object.entries(snapshotsByStudent).forEach(([sid, snaps]) => {
    const prev = [...snaps].reverse().find(s => new Date(s.created_at) < todayMidnight);
    if (prev) prevValueMap[sid] = parseFloat(prev.total_value);
  });
  const prevRankMap = {};
  Object.entries(prevValueMap).sort((a, b) => b[1] - a[1]).forEach(([sid], i) => { prevRankMap[sid] = i + 1; });
  rows.forEach((row, i) => {
    const prev = prevRankMap[row.id];
    row.rankChange = prev != null ? prev - (i + 1) : null;
  });

  return Response.json(rows);
}