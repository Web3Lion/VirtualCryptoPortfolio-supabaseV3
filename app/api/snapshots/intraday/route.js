import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Lightweight intraday snapshot — uses existing price_cache, no CoinGecko fetch.
// Safe to call on every page load; does NOT update price_cache.updated_at so it
// never interferes with the dashboard's manual refresh cooldown.
// Server-side rate limit: skips if a snapshot was taken in the last 25 minutes.
const SNAPSHOT_INTERVAL_MS = 25 * 60 * 1000;

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  // Rate-limit: check the most recent intraday snapshot across all classes
  const cutoff = new Date(Date.now() - SNAPSHOT_INTERVAL_MS).toISOString();
  const { data: recent } = await db.from('snapshots')
    .select('created_at').eq('snapshot_type', 'intraday')
    .gte('created_at', cutoff).limit(1).single();
  if (recent) return Response.json({ skipped: true });

  // Load all prices from cache
  const { data: allCached } = await db.from('price_cache').select('symbol, price');
  const priceMap = {};
  (allCached || []).forEach(r => { priceMap[r.symbol] = parseFloat(r.price); });

  const { data: classes } = await db.from('classes').select('id');
  let total = 0;

  for (const cls of classes || []) {
    try {
      const { data: classStudents } = await db.from('class_students')
        .select('student_id').eq('class_id', cls.id);
      if (!classStudents?.length) continue;
      const studentIds = classStudents.map(r => r.student_id);

      const [portfoliosRes, holdingsRes, stakingRes] = await Promise.all([
        db.from('portfolios').select('student_id, cash').in('student_id', studentIds).eq('class_id', cls.id),
        db.from('holdings').select('student_id, coin, quantity, margin_borrowed').in('student_id', studentIds).eq('class_id', cls.id),
        db.from('staking_positions').select('student_id, coin, quantity').in('student_id', studentIds).eq('class_id', cls.id).in('status', ['active', 'claimable']).catch(() => ({ data: null })),
      ]);

      const portfolioMap = {};
      (portfoliosRes.data || []).forEach(p => { portfolioMap[p.student_id] = parseFloat(p.cash); });
      const holdingsByStudent = {};
      (holdingsRes.data || []).forEach(h => {
        if (!holdingsByStudent[h.student_id]) holdingsByStudent[h.student_id] = [];
        holdingsByStudent[h.student_id].push(h);
      });
      const stakingByStudent = {};
      (stakingRes.data || []).forEach(p => {
        if (!stakingByStudent[p.student_id]) stakingByStudent[p.student_id] = [];
        stakingByStudent[p.student_id].push(p);
      });

      const rows = studentIds.map(sid => {
        const cash = portfolioMap[sid] ?? 0;
        let holdingsVal = 0, borrowed = 0;
        (holdingsByStudent[sid] || []).forEach(h => {
          holdingsVal += parseFloat(h.quantity) * (priceMap[h.coin] || parseFloat(h.avg_buy_price) || 0);
          borrowed    += parseFloat(h.margin_borrowed || 0);
        });
        const stakingVal = (stakingByStudent[sid] || []).reduce((s, p) =>
          s + parseFloat(p.quantity) * (priceMap[p.coin] || 0), 0);
        return { student_id: sid, class_id: cls.id, total_value: cash + holdingsVal + stakingVal - borrowed, cash, snapshot_type: 'intraday' };
      });

      if (rows.length) {
        await db.from('snapshots').insert(rows);
        total += rows.length;
      }
    } catch (_) {}
  }

  return Response.json({ success: true, snapshotsCreated: total });
}
