import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, getMarketStatus } from '@/lib/db';
import { fetchBulkPrices, GECKO_ID_MAP } from '@/lib/prices';

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

async function getLastRefreshAt() {
  const { data } = await db.from('price_cache').select('updated_at').order('updated_at', { ascending: false }).limit(1).single();
  return data?.updated_at ? new Date(data.updated_at) : null;
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const lastRefresh = await getLastRefreshAt();
  if (!lastRefresh) return Response.json({ canRefresh: true, nextRefreshAt: null });

  const nextRefreshAt = new Date(lastRefresh.getTime() + COOLDOWN_MS);
  const canRefresh = Date.now() >= nextRefreshAt.getTime();
  return Response.json({ canRefresh, nextRefreshAt: nextRefreshAt.toISOString(), lastRefreshAt: lastRefresh.toISOString() });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  // Check cooldown
  const lastRefresh = await getLastRefreshAt();
  if (lastRefresh) {
    const nextRefreshAt = new Date(lastRefresh.getTime() + COOLDOWN_MS);
    if (Date.now() < nextRefreshAt.getTime()) {
      return Response.json({ blocked: true, nextRefreshAt: nextRefreshAt.toISOString() }, { status: 429 });
    }
  }

  const report = { pricesUpdated: 0, intradaySnapshots: 0, errors: [] };

  // ── 1. Update price cache ─────────────────────────────────────
  let freshPriceMap = {};
  try {
    const { data: coins } = await db.from('class_coins').select('symbol,gecko_id').eq('active', true);
    const symbols = [...new Set((coins || []).map(c => c.symbol))];

    if (symbols.length) {
      const extraIds = {};
      (coins || []).forEach(c => {
        if (c.gecko_id && !GECKO_ID_MAP[c.symbol?.toUpperCase()]) extraIds[c.symbol.toUpperCase()] = c.gecko_id;
      });
      const priceMap = await fetchBulkPrices(symbols, extraIds);
      const rows = Object.entries(priceMap).map(([symbol, data]) => ({
        symbol,
        price:      data.price,
        change_1h:  data.change1h,
        change_24h: data.change24h,
        change_7d:  data.change7d,
        updated_at: new Date().toISOString(),
      }));
      if (rows.length > 0) {
        await db.from('price_cache').upsert(rows, { onConflict: 'symbol' });
        report.pricesUpdated = rows.length;
      }
      Object.entries(priceMap).forEach(([symbol, data]) => { freshPriceMap[symbol] = data.price; });
    }
  } catch (e) {
    report.errors.push(`prices: ${e.message}`);
  }

  // ── 2. Snapshots for all classes ──────────────────────────────
  try {
    const { data: classes } = await db.from('classes').select('id');

    for (const cls of classes || []) {
      try {
        const { data: classStudents } = await db.from('class_students').select('student_id').eq('class_id', cls.id);
        if (!classStudents?.length) continue;
        const studentIds = classStudents.map(r => r.student_id);

        const [portfoliosRes, holdingsRes] = await Promise.all([
          db.from('portfolios').select('student_id, cash').in('student_id', studentIds).eq('class_id', cls.id),
          db.from('holdings').select('student_id, coin, quantity, margin_borrowed').in('student_id', studentIds).eq('class_id', cls.id),
        ]);

        const holdingCoins = [...new Set((holdingsRes.data || []).map(h => h.coin))];
        const missingCoins = holdingCoins.filter(c => !freshPriceMap[c]);
        if (missingCoins.length) {
          const { data: cached } = await db.from('price_cache').select('symbol, price').in('symbol', missingCoins);
          (cached || []).forEach(r => { freshPriceMap[r.symbol] = parseFloat(r.price); });
        }

        const portfolioMap = {};
        (portfoliosRes.data || []).forEach(p => { portfolioMap[p.student_id] = parseFloat(p.cash); });
        const holdingsByStudent = {};
        (holdingsRes.data || []).forEach(h => {
          if (!holdingsByStudent[h.student_id]) holdingsByStudent[h.student_id] = [];
          holdingsByStudent[h.student_id].push(h);
        });

        const rows = studentIds.map(studentId => {
          const cash = portfolioMap[studentId] ?? 0;
          const holdings = holdingsByStudent[studentId] || [];
          let holdingsVal = 0, borrowed = 0;
          holdings.forEach(h => {
            holdingsVal += parseFloat(h.quantity) * (freshPriceMap[h.coin] || 0);
            borrowed    += parseFloat(h.margin_borrowed || 0);
          });
          return { student_id: studentId, class_id: cls.id, total_value: cash + holdingsVal - borrowed, cash, snapshot_type: 'intraday' };
        });

        if (rows.length) {
          await db.from('snapshots').insert(rows);
          report.intradaySnapshots += rows.length;
        }
      } catch (e) {
        report.errors.push(`snapshots[${cls.id}]: ${e.message}`);
      }
    }
  } catch (e) {
    report.errors.push(`snapshots: ${e.message}`);
  }

  const nextRefreshAt = new Date(Date.now() + COOLDOWN_MS).toISOString();
  return Response.json({ success: true, ...report, nextRefreshAt });
}
