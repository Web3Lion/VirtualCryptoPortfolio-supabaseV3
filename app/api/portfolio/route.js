import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail, getStudentPortfolio, getClassCoins } from '@/lib/students';
import { db } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');

  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id').eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ error: 'No class found' }, { status: 404 });

  const { portfolio, holdings, trades } = await getStudentPortfolio(student.id, classId);
  const coins = await getClassCoins(classId);

  // Get cached prices
  const symbols = [...new Set(holdings.map(h => h.coin))];
  const priceMap = {};
  if (symbols.length > 0) {
    const { data: cached } = await db.from('price_cache').select('symbol, price').in('symbol', symbols);
    (cached || []).forEach(r => { priceMap[r.symbol] = parseFloat(r.price); });
  }

  const [{ data: cls }, { data: rewardCfg }, { data: rewardLedger }] = await Promise.all([
    db.from('classes').select('seed_money').eq('id', classId).single(),
    db.from('class_reward_config').select('enabled, badge_reward_tokens').eq('class_id', classId).single(),
    db.from('class_reward_ledger').select('tokens').eq('student_id', student.id).eq('class_id', classId),
  ]);
  const seedMoney = parseFloat(cls?.seed_money || 10000);
  const cash      = parseFloat(portfolio.cash);
  const feesPaid  = parseFloat(portfolio.fees_paid);

  const holdingsWithPrices = holdings.map(h => {
    const curPrice = priceMap[h.coin] || parseFloat(h.avg_buy_price);
    const qty      = parseFloat(h.quantity);
    const avgBuy   = parseFloat(h.avg_buy_price);
    const curVal   = qty * curPrice;
    const plPct    = avgBuy > 0 ? ((curPrice / avgBuy) - 1) * 100 : 0;
    return { coin: h.coin, qty, avgBuy, curPrice, curVal, plPct, plTotal: (curPrice - avgBuy) * qty };
  });

  const holdingsValue = holdingsWithPrices.reduce((s, h) => s + h.curVal, 0);
  const totalValue    = cash + holdingsValue;
  const pl            = totalValue - seedMoney;
  const returnPct     = ((totalValue / seedMoney) - 1) * 100;

  const classRewardTokens = (rewardLedger || []).reduce((sum, r) => sum + r.tokens, 0);

  return Response.json({
    classId,
    summary: { startCash: seedMoney, cash: cash.toFixed(2), holdingsVal: holdingsValue.toFixed(2), totalVal: totalValue.toFixed(2), pl: pl.toFixed(2), returnPct: returnPct.toFixed(2), fees: feesPaid.toFixed(2) },
    holdings: holdingsWithPrices,
    history:  trades.map(t => ({ id: t.id, action: t.action, coin: t.coin, quantity: parseFloat(t.quantity), price: parseFloat(t.price), grossValue: parseFloat(t.gross_value), fee: parseFloat(t.fee), cashAfter: parseFloat(t.cash_after), reasoning: t.reasoning, createdAt: t.created_at })),
    availableCoins: coins,
    prices: priceMap,
    classRewardTokens,
    classRewardEnabled: rewardCfg?.enabled || false,
    badgeRewardTokens: rewardCfg?.badge_reward_tokens || 50,
  });
}
