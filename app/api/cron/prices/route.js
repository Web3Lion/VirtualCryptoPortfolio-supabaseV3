import { db } from '@/lib/db';
import { fetchBulkPrices, GECKO_ID_MAP } from '@/lib/prices';

export async function GET(request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all active coins across all classes (include gecko_id for manually-added coins)
    const { data: coins } = await db.from('class_coins').select('symbol,gecko_id').eq('active', true);
    const symbols = [...new Set((coins || []).map(c => c.symbol))];

    if (!symbols.length) return Response.json({ success: true, message: 'No coins to update' });

    // Build extra gecko ID map for coins not in the built-in GECKO_ID_MAP
    const extraIds = {};
    (coins || []).forEach(c => {
      if (c.gecko_id && !GECKO_ID_MAP[c.symbol?.toUpperCase()]) extraIds[c.symbol.toUpperCase()] = c.gecko_id;
    });

    // Fetch prices from CoinGecko
    const priceMap = await fetchBulkPrices(symbols, extraIds);

    // Save to price_cache
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
    }

    return Response.json({ success: true, updated: rows.length, symbols });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
