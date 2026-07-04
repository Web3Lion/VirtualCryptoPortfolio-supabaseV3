import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, getAllConfig } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  // If TEACHER_EMAIL is set, enforce it; otherwise allow any authenticated user (dev/single-teacher setup)
  if (TEACHER_EMAIL && session.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: `Teacher only — logged in as ${session.user?.email}, expected ${TEACHER_EMAIL}` }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');

  const now = new Date();
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  try {
    const teacherEmail = session.user.email;
    if (!classId) {
      const { data } = await db.from('classes').select('id').eq('teacher_email', teacherEmail).order('created_at', { ascending: false }).limit(1).single();
      classId = data?.id;
    }
    if (!classId) return Response.json({ error: 'No class found. Create a class first on the Teacher page.' }, { status: 404 });

    const safe = (p) => p.then(r => r).catch(() => ({ data: null, count: 0 }));

    const [
      cfg,
      tradesTodayRes,
      tradesMonthRes,
      tradesTotalRes,
      priceCacheRes,
      studentsRes,
      activeTodayRes,
      classCoinsRes,
      portfoliosRes,
      holdingsRes,
      allPricesRes,
      pendingOrdersRes,
      snapshotTodayRes,
      classesRes,
    ] = await Promise.all([
      getAllConfig().catch(() => ({})),
      safe(db.from('trades').select('*', { count: 'exact', head: true }).eq('class_id', classId).gte('created_at', today.toISOString())),
      safe(db.from('trades').select('*', { count: 'exact', head: true }).eq('class_id', classId).gte('created_at', monthStart.toISOString())),
      safe(db.from('trades').select('*', { count: 'exact', head: true }).eq('class_id', classId)),
      safe(db.from('price_cache').select('symbol, updated_at').order('updated_at', { ascending: true }).limit(1)),
      safe(db.from('class_students').select('student_id').eq('class_id', classId)),
      safe(db.from('trades').select('student_id').eq('class_id', classId).gte('created_at', today.toISOString())),
      safe(db.from('class_coins').select('symbol').eq('class_id', classId).eq('active', true)),
      safe(db.from('portfolios').select('cash').eq('class_id', classId)),
      safe(db.from('holdings').select('coin, quantity, margin_borrowed').eq('class_id', classId).gt('quantity', 0)),
      safe(db.from('price_cache').select('symbol, price, updated_at')),
      safe(db.from('pending_orders').select('*', { count: 'exact', head: true }).eq('class_id', classId).eq('status', 'pending')),
      safe(db.from('snapshots').select('*', { count: 'exact', head: true }).eq('class_id', classId).eq('snapshot_type', 'intraday').gte('created_at', today.toISOString())),
      safe(db.from('classes').select('id, name').eq('teacher_email', teacherEmail)),
    ]);

    // Price map
    const priceMap = {};
    (allPricesRes.data || []).forEach(p => { priceMap[p.symbol] = parseFloat(p.price); });

    // Portfolio totals
    let totalCash = 0, totalHoldings = 0, totalBorrowed = 0;
    (portfoliosRes.data || []).forEach(p => { totalCash += parseFloat(p.cash || 0); });
    (holdingsRes.data || []).forEach(h => {
      totalHoldings += parseFloat(h.quantity) * (priceMap[h.coin] || 0);
      totalBorrowed  += parseFloat(h.margin_borrowed || 0);
    });
    const totalPortfolioValue = totalCash + totalHoldings - totalBorrowed;

    const totalStudents = (studentsRes.data || []).length;
    const activeToday   = new Set((activeTodayRes.data || []).map(t => t.student_id)).size;

    const stalest       = priceCacheRes.data?.[0];
    const cacheAgeMin   = stalest ? Math.floor((Date.now() - new Date(stalest.updated_at).getTime()) / 60000) : 999;
    const priceCacheCount = (allPricesRes.data || []).length;

    // Real counts (bumped in lib/prices.js at the actual call sites), not an
    // estimate — CoinGecko is only actually hit by the shared 30-min gate
    // (cron ticks that find a stale cache, or a trade falling back when
    // FreeCryptoAPI fails), and FreeCryptoAPI is hit by student trades.
    const monthKey = now.toISOString().slice(0, 7);
    const coingeckoCallsMonth  = parseInt(cfg[`API_CALLS_COINGECKO_${monthKey}`]  || '0', 10) || 0;
    const freecryptoCallsMonth = parseInt(cfg[`API_CALLS_FREECRYPTO_${monthKey}`] || '0', 10) || 0;
    const GECKO_LIMIT = 10000;

    const flashSaleActive = !!cfg.FLASH_SALE_COIN && new Date(cfg.FLASH_SALE_UNTIL || 0) > now;

    return Response.json({
      classId,
      classes: classesRes.data || [],
      features: {
        frozen:          cfg.MARKET_FREEZE === '1',
        freezeReason:    cfg.MARKET_FREEZE_REASON || '',
        paused:          cfg.SIM_PAUSED === '1',
        bullRunActive:   cfg.BULL_RUN_ACTIVE === '1',
        bullRunMult:     cfg.BULL_RUN_MULTIPLIER || '2',
        flashSaleActive,
        flashSaleCoin:   cfg.FLASH_SALE_COIN || '',
        flashSaleUntil:  cfg.FLASH_SALE_UNTIL || '',
        marginEnabled:   cfg.MARGIN_ENABLED === '1',
        marginMult:      cfg.MARGIN_MULTIPLIER || '2',
        shortEnabled:    cfg.SHORT_SELLING_ENABLED === '1',
        tradingHoursOn:  cfg.TRADING_HOURS_ON === '1',
        tradingHoursStart: cfg.TRADING_HOURS_START || '09:00',
        tradingHoursEnd:   cfg.TRADING_HOURS_END   || '15:00',
        dailyLimitOn:    cfg.DAILY_LIMIT_ON === '1',
        dailyLimitN:     cfg.DAILY_LIMIT_N || '3',
      },
      trades: {
        today:          tradesTodayRes.count   || 0,
        month:          tradesMonthRes.count   || 0,
        total:          tradesTotalRes.count   || 0,
        snapshotsToday: snapshotTodayRes.count || 0,
      },
      students: { total: totalStudents, activeToday },
      portfolio: {
        totalValue:    totalPortfolioValue,
        totalCash,
        totalHoldings,
        coinCount:     (classCoinsRes.data || []).length,
      },
      api: {
        cacheAgeMinutes: cacheAgeMin,
        stalestSymbol:   stalest?.symbol || null,
        cachedSymbols:   priceCacheCount,
        coingecko: { callsThisMonth: coingeckoCallsMonth, callsLimit: GECKO_LIMIT },
        freecrypto: { callsThisMonth: freecryptoCallsMonth },
      },
      orders: { pending: pendingOrdersRes.count || 0 },
      fetchedAt: now.toISOString(),
    });
  } catch (err) {
    console.error('Cockpit error:', err);
    return Response.json({ error: `Server error: ${err.message}` }, { status: 500 });
  }
}
