import { verifyShareToken } from '@/lib/shareToken';
import { db } from '@/lib/db';
import { calculateSharpe, calculateMaxDrawdown, calculateWinRate } from '@/lib/metrics';

export async function GET(request, { params }) {
  const { token } = params;
  const decoded = verifyShareToken(token);
  if (!decoded) return Response.json({ error: 'Invalid or expired link' }, { status: 401 });

  const { studentId, classId } = decoded;

  const [studentRes, portfolioRes, holdingsRes, tradesRes, pricesRes, badgesRes, snapshotsRes, clsRes] = await Promise.all([
    db.from('students').select('name').eq('id', studentId).single(),
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).eq('class_id', classId).single(),
    db.from('holdings').select('coin, quantity, avg_buy_price').eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0),
    db.from('trades').select('action, coin, quantity, price, gross_value, created_at').eq('student_id', studentId).eq('class_id', classId).order('created_at', { ascending: false }).limit(10),
    db.from('price_cache').select('symbol, price'),
    db.from('badges').select('badge_id, earned_at').eq('student_id', studentId).eq('class_id', classId),
    db.from('snapshots').select('total_value, created_at').eq('student_id', studentId).eq('class_id', classId).order('created_at', { ascending: true }),
    db.from('classes').select('name, seed_money').eq('id', classId).single(),
  ]);

  if (!studentRes.data) return Response.json({ error: 'Not found' }, { status: 404 });

  const pm = {};
  (pricesRes.data || []).forEach(p => { pm[p.symbol] = parseFloat(p.price); });

  const cash = parseFloat(portfolioRes.data?.cash || 0);
  const fees = parseFloat(portfolioRes.data?.fees_paid || 0);
  const seedMoney = parseFloat(clsRes.data?.seed_money || 10000);

  let holdingsVal = 0;
  const holdings = (holdingsRes.data || []).map(h => {
    const price = pm[h.coin] || parseFloat(h.avg_buy_price);
    const val = parseFloat(h.quantity) * price;
    holdingsVal += val;
    const plPct = ((price / parseFloat(h.avg_buy_price)) - 1) * 100;
    return { coin: h.coin, qty: parseFloat(h.quantity), avgBuy: parseFloat(h.avg_buy_price), curPrice: price, curVal: val, plPct };
  });
  holdings.sort((a, b) => b.curVal - a.curVal);

  const totalVal = cash + holdingsVal;
  const pl = totalVal - seedMoney;
  const returnPct = ((totalVal / seedMoney) - 1) * 100;
  const snaps = snapshotsRes.data || [];

  return Response.json({
    student:    { name: studentRes.data.name },
    class:      { name: clsRes.data?.name },
    summary:    { totalVal, cash, holdingsVal, pl, returnPct, fees, seedMoney },
    holdings,
    recentTrades: (tradesRes.data || []).slice(0, 8),
    badgeCount:   (badgesRes.data || []).length,
    sharpe:       calculateSharpe(snaps),
    maxDrawdown:  calculateMaxDrawdown(snaps),
    winRate:      calculateWinRate(tradesRes.data || []),
    tradeCount:   tradesRes.data?.length || 0,
  });
}
