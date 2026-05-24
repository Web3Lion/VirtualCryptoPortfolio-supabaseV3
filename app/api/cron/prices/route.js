import { db } from '@/lib/db';
import { fetchBulkPrices, GECKO_ID_MAP } from '@/lib/prices';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ── 1. Update price cache ─────────────────────────────────
    const { data: coins } = await db.from('class_coins').select('symbol,gecko_id').eq('active', true);
    const symbols = [...new Set((coins || []).map(c => c.symbol))];

    let priceUpdateCount = 0;
    let freshPriceMap = {};

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
        priceUpdateCount = rows.length;
      }

      Object.entries(priceMap).forEach(([symbol, data]) => { freshPriceMap[symbol] = data.price; });
    }

    // ── 2. Snapshots: intraday every run, daily once per day ──
    const now = new Date();
    const todayMidnight = new Date(now);
    todayMidnight.setUTCHours(0, 0, 0, 0);
    const todayIso = todayMidnight.toISOString();

    const { data: classes } = await db.from('classes').select('id');
    let intradayCount = 0;
    let dailyCount = 0;

    for (const cls of classes || []) {
      const { data: classStudents } = await db.from('class_students')
        .select('student_id')
        .eq('class_id', cls.id);

      if (!classStudents?.length) continue;
      const studentIds = classStudents.map(r => r.student_id);

      // Which students already have a daily snapshot today?
      const { data: existingDaily } = await db.from('snapshots')
        .select('student_id')
        .eq('class_id', cls.id)
        .eq('snapshot_type', 'daily')
        .gte('created_at', todayIso)
        .in('student_id', studentIds);

      const alreadyHaveDaily = new Set((existingDaily || []).map(s => s.student_id));

      const [portfoliosRes, holdingsRes] = await Promise.all([
        db.from('portfolios').select('student_id, cash').in('student_id', studentIds).eq('class_id', cls.id),
        db.from('holdings').select('student_id, coin, quantity, margin_borrowed').in('student_id', studentIds).eq('class_id', cls.id),
      ]);

      // Fill in any coins not returned by the bulk fetch
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

      const intradayRows = [];
      const dailyRows    = [];

      for (const studentId of studentIds) {
        const cash     = portfolioMap[studentId] ?? 0;
        const holdings = holdingsByStudent[studentId] || [];
        let holdingsVal = 0, borrowed = 0;
        holdings.forEach(h => {
          holdingsVal += parseFloat(h.quantity) * (freshPriceMap[h.coin] || 0);
          borrowed    += parseFloat(h.margin_borrowed || 0);
        });
        const totalValue = cash + holdingsVal - borrowed;

        intradayRows.push({ student_id: studentId, class_id: cls.id, total_value: totalValue, cash, snapshot_type: 'intraday' });

        if (!alreadyHaveDaily.has(studentId)) {
          dailyRows.push({ student_id: studentId, class_id: cls.id, total_value: totalValue, cash, snapshot_type: 'daily' });
        }
      }

      if (intradayRows.length) {
        await db.from('snapshots').insert(intradayRows);
        intradayCount += intradayRows.length;
      }
      if (dailyRows.length) {
        await db.from('snapshots').insert(dailyRows);
        dailyCount += dailyRows.length;
      }
    }

    return Response.json({ success: true, pricesUpdated: priceUpdateCount, intradaySnapshotsCreated: intradayCount, dailySnapshotsCreated: dailyCount, symbols });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
