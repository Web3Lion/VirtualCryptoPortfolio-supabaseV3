import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail, getStudentPortfolio, getClassCoins } from '@/lib/students';
import { db } from '@/lib/db';
import { calculateSharpe, calculateSortino, calculateMaxDrawdown, calculateWinRate } from '@/lib/metrics';
import { checkMilestones } from '@/app/api/trade/badge-check';

export async function GET(request) {
  try {
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
    const activeCoins = await getClassCoins(classId);

    // Fetch staking positions alongside portfolio data
    let stakingPositions = null;
    try {
      const { data } = await db.from('staking_positions')
        .select('coin, quantity, status, total_rewards_earned, claimable_rewards')
        .eq('student_id', student.id)
        .eq('class_id', classId)
        .in('status', ['active', 'claimable']);
      stakingPositions = data;
    } catch {}

    // Get cached prices for held + staked coins
    const heldSymbols = [...new Set([
      ...holdings.map(h => h.coin),
      ...(stakingPositions || []).map(p => p.coin),
    ])];
    const priceMap = {};
    if (heldSymbols.length > 0) {
      const { data: cached } = await db.from('price_cache').select('symbol, price').in('symbol', heldSymbols);
      (cached || []).forEach(r => { priceMap[r.symbol] = parseFloat(r.price); });
    }

    // Merge held coins into availableCoins so deactivated coins still show in the trade dropdown
    const activeSymbols = new Set(activeCoins.map(c => c.symbol));
    const heldButInactive = holdings
      .filter(h => !activeSymbols.has(h.coin))
      .map(h => ({ symbol: h.coin, gecko_id: null, name: h.coin, sector: 'Other', deactivated: true }));
    const coins = [...activeCoins, ...heldButInactive];

    const [{ data: cls }, { data: rewardCfg }, { data: rewardLedger }, { data: snapshots }] = await Promise.all([
      db.from('classes').select('seed_money').eq('id', classId).single(),
      db.from('class_reward_config').select('enabled, badge_reward_tokens').eq('class_id', classId).single(),
      db.from('class_reward_ledger').select('tokens').eq('student_id', student.id).eq('class_id', classId),
      db.from('snapshots').select('total_value, created_at').eq('student_id', student.id).eq('class_id', classId).order('created_at', { ascending: true }),
    ]);
    const seedMoney = parseFloat(cls?.seed_money || 10000);
    const cash      = parseFloat(portfolio.cash);
    const feesPaid  = parseFloat(portfolio.fees_paid);

    const holdingsWithPrices = holdings.map(h => {
      const curPrice      = priceMap[h.coin] || parseFloat(h.avg_buy_price);
      const qty           = parseFloat(h.quantity);
      const avgBuy        = parseFloat(h.avg_buy_price);
      const marginBorrowed = parseFloat(h.margin_borrowed || 0);
      const isShort       = qty < 0;
      const curVal        = qty * curPrice;
      const plPct = isShort
        ? (avgBuy > 0 ? ((avgBuy - curPrice) / avgBuy) * 100 : 0)
        : (avgBuy > 0 ? ((curPrice / avgBuy) - 1) * 100 : 0);
      const plTotal = (curPrice - avgBuy) * qty;
      return { coin: h.coin, qty, avgBuy, curPrice, curVal, plPct, plTotal, marginBorrowed, isShort };
    });

    const holdingsValue  = holdingsWithPrices.reduce((s, h) => s + h.curVal, 0);
    const totalBorrowed  = holdingsWithPrices.reduce((s, h) => s + h.marginBorrowed, 0);
    const stakingValue   = (stakingPositions || []).reduce((s, p) => {
      const price = priceMap[p.coin] || 0;
      const principal = parseFloat(p.quantity) * price;
      const rewardCoins = p.status === 'claimable'
        ? parseFloat(p.claimable_rewards || 0)
        : parseFloat(p.total_rewards_earned || 0);
      return s + principal + rewardCoins * price;
    }, 0);
    const totalValue    = cash + holdingsValue + stakingValue - totalBorrowed;
    const pl            = totalValue - seedMoney;
    const returnPct     = ((totalValue / seedMoney) - 1) * 100;

    const classRewardTokens = (rewardLedger || []).reduce((sum, r) => sum + r.tokens, 0);

    let sharpeRatio = null, sortinoRatio = null, maxDrawdown = null, winRate = null;
    try { sharpeRatio  = calculateSharpe(snapshots);  } catch {}
    try { sortinoRatio = calculateSortino(snapshots); } catch {}
    try { maxDrawdown  = calculateMaxDrawdown(snapshots); } catch {}
    try { winRate      = calculateWinRate(trades);    } catch {}

    // Check portfolio milestones — awards badge + returns it for dashboard toast
    let newMilestone = null;
    try {
      newMilestone = await checkMilestones({ studentId: student.id, classId, returnPct });
    } catch {}

    // Compute trading streak (consecutive days with at least one trade)
    let tradingStreak = 0;
    try {
      const days = [...new Set(trades.map(t => t.created_at?.slice(0, 10)).filter(Boolean))].sort().reverse();
      if (days.length) {
        const todayStr     = new Date().toISOString().slice(0, 10);
        const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (days[0] === todayStr || days[0] === yesterdayStr) {
          let streak = 1, prev = new Date(days[0]);
          for (let i = 1; i < days.length; i++) {
            const expected = new Date(prev); expected.setDate(expected.getDate() - 1);
            if (days[i] === expected.toISOString().slice(0, 10)) { streak++; prev = expected; }
            else break;
          }
          tradingStreak = streak;
        }
      }
    } catch {}

    return Response.json({
      classId,
      summary: { startCash: seedMoney, cash: cash.toFixed(2), holdingsVal: holdingsValue.toFixed(2), stakingVal: stakingValue.toFixed(2), totalVal: totalValue.toFixed(2), pl: pl.toFixed(2), returnPct: returnPct.toFixed(2), fees: feesPaid.toFixed(2) },
      holdings: holdingsWithPrices,
      history:  trades.map(t => ({ id: t.id, action: t.action, coin: t.coin, quantity: parseFloat(t.quantity), price: parseFloat(t.price), grossValue: parseFloat(t.gross_value), fee: parseFloat(t.fee), cashAfter: parseFloat(t.cash_after), reasoning: t.reasoning, createdAt: t.created_at })),
      availableCoins: coins,
      prices: priceMap,
      classRewardTokens,
      classRewardEnabled: rewardCfg?.enabled || false,
      badgeRewardTokens: rewardCfg?.badge_reward_tokens || 50,
      sharpeRatio, sortinoRatio, maxDrawdown, winRate,
      newMilestone, tradingStreak,
    });
  } catch (err) {
    console.error('[portfolio] unhandled error:', err);
    return Response.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
