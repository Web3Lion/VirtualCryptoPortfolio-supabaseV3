import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateSharpe, calculateSortino, calculateMaxDrawdown, calculateWinRate } from '@/lib/metrics';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== process.env.TEACHER_EMAIL)
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const { data: cls } = await db.from('classes').select('name, seed_money').eq('id', classId).single();
  const seedMoney = parseFloat(cls?.seed_money || 10000);

  const { data: classStudents } = await db.from('class_students').select('student_id, students(id, name, email, is_bot)').eq('class_id', classId);
  const students = (classStudents || []).map(r => r.students).filter(s => s && !s.is_bot);
  const studentIds = students.map(s => s.id);

  const [portfoliosRes, holdingsRes, tradesRes, pricesRes, snapshotsRes, stakingRes, badgesRes] = await Promise.all([
    db.from('portfolios').select('student_id, cash, fees_paid').in('student_id', studentIds).eq('class_id', classId),
    db.from('holdings').select('student_id, coin, quantity, avg_buy_price').in('student_id', studentIds).eq('class_id', classId),
    db.from('trades').select('student_id, action, coin, gross_value, fee').in('student_id', studentIds).eq('class_id', classId),
    db.from('price_cache').select('symbol, price'),
    db.from('snapshots').select('student_id, total_value, created_at').in('student_id', studentIds).eq('class_id', classId).order('created_at', { ascending: true }),
    db.from('staking_positions').select('student_id, coin, quantity').in('student_id', studentIds).eq('class_id', classId).in('status', ['active', 'claimable']).catch(() => ({ data: null })),
    db.from('badges').select('student_id').in('student_id', studentIds).eq('class_id', classId).catch(() => ({ data: null })),
  ]);

  const pm = {};
  (pricesRes.data || []).forEach(p => { pm[p.symbol] = parseFloat(p.price); });
  const portfolioMap = {};
  (portfoliosRes.data || []).forEach(p => { portfolioMap[p.student_id] = p; });
  const holdingsMap = {};
  (holdingsRes.data || []).forEach(h => {
    if (!holdingsMap[h.student_id]) holdingsMap[h.student_id] = [];
    holdingsMap[h.student_id].push(h);
  });
  const tradesMap = {};
  (tradesRes.data || []).forEach(t => {
    if (!tradesMap[t.student_id]) tradesMap[t.student_id] = [];
    tradesMap[t.student_id].push(t);
  });
  const snapshotsMap = {};
  (snapshotsRes.data || []).forEach(s => {
    if (!snapshotsMap[s.student_id]) snapshotsMap[s.student_id] = [];
    snapshotsMap[s.student_id].push(s);
  });
  const stakingMap = {};
  (stakingRes.data || []).forEach(p => {
    if (!stakingMap[p.student_id]) stakingMap[p.student_id] = [];
    stakingMap[p.student_id].push(p);
  });
  const badgesCountMap = {};
  (badgesRes.data || []).forEach(b => { badgesCountMap[b.student_id] = (badgesCountMap[b.student_id] || 0) + 1; });

  const rows = students.map(student => {
    const port = portfolioMap[student.id] || { cash: seedMoney, fees_paid: 0 };
    const cash = parseFloat(port.cash);
    const holdings = holdingsMap[student.id] || [];
    let holdingsVal = 0;
    holdings.forEach(h => { holdingsVal += parseFloat(h.quantity) * (pm[h.coin] || parseFloat(h.avg_buy_price) || 0); });
    const stakingVal = (stakingMap[student.id] || []).reduce((s, p) => s + parseFloat(p.quantity) * (pm[p.coin] || 0), 0);
    const totalVal = cash + holdingsVal + stakingVal;
    const returnPct = ((totalVal / seedMoney) - 1) * 100;
    const snaps = snapshotsMap[student.id] || [];
    const trades = tradesMap[student.id] || [];
    return {
      name:        student.name,
      email:       student.email,
      portfolio:   totalVal.toFixed(2),
      cash:        cash.toFixed(2),
      holdingsVal: holdingsVal.toFixed(2),
      stakingVal:  stakingVal.toFixed(2),
      returnPct:   returnPct.toFixed(2),
      pl:          (totalVal - seedMoney).toFixed(2),
      fees:        parseFloat(port.fees_paid).toFixed(2),
      tradeCount:  trades.length,
      coinCount:   holdings.length,
      badges:      badgesCountMap[student.id] || 0,
      sharpe:      calculateSharpe(snaps) ?? '',
      sortino:     calculateSortino(snaps) ?? '',
      maxDrawdown: calculateMaxDrawdown(snaps) ?? '',
      winRate:     calculateWinRate(trades) ?? '',
    };
  });

  rows.sort((a, b) => parseFloat(b.portfolio) - parseFloat(a.portfolio));

  const headers = ['Rank','Name','Email','Portfolio ($)','Cash ($)','Holdings ($)','Staking ($)','Return (%)','P/L ($)','Fees ($)','Trades','Coins','Badges','Sharpe','Sortino','Max Drawdown (%)','Win Rate (%)'];
  const csvRows = [
    headers.join(','),
    ...rows.map((r, i) => [
      i + 1, `"${r.name}"`, `"${r.email}"`,
      r.portfolio, r.cash, r.holdingsVal, r.stakingVal, r.returnPct, r.pl, r.fees,
      r.tradeCount, r.coinCount, r.badges, r.sharpe, r.sortino, r.maxDrawdown, r.winRate,
    ].join(',')),
  ];

  const className = cls?.name || 'class';
  return new Response(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${className}-grades-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
