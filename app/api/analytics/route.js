import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';
import { calculateBeta, calculateVolatility, calculateCalmar } from '@/lib/metrics';
import { fetchBtcMarketChart } from '@/lib/prices';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ error: 'No class found' }, { status: 404 });

  const [snapshotsRes, holdingsRes, pricesRes] = await Promise.all([
    db.from('snapshots').select('total_value, created_at')
      .eq('student_id', student.id).eq('class_id', classId)
      .order('created_at', { ascending: true }),
    db.from('holdings').select('coin, quantity, avg_buy_price')
      .eq('student_id', student.id).eq('class_id', classId).gt('quantity', 0),
    db.from('price_cache').select('symbol, price'),
  ]);

  const snapshots = snapshotsRes.data || [];
  const holdings  = holdingsRes.data || [];
  const priceMap  = {};
  (pricesRes.data || []).forEach(p => { priceMap[p.symbol] = parseFloat(p.price); });

  // Sector breakdown from holdings
  const { data: classCoins } = await db.from('class_coins')
    .select('symbol, sector').eq('class_id', classId);
  const sectorMap = {};
  (classCoins || []).forEach(c => { sectorMap[c.symbol] = c.sector; });

  const sectorTotals = {};
  holdings.forEach(h => {
    const val = parseFloat(h.quantity) * (priceMap[h.coin] || parseFloat(h.avg_buy_price) || 0);
    const sector = sectorMap[h.coin] || 'Other';
    sectorTotals[sector] = (sectorTotals[sector] || 0) + val;
  });

  const btcChart  = await fetchBtcMarketChart(db, 90).catch(() => null);
  const beta      = calculateBeta(snapshots, btcChart);
  const volatility = calculateVolatility(snapshots);
  const calmar    = calculateCalmar(snapshots);

  return Response.json({ beta, volatility, calmarRatio: calmar, sectorTotals });
}
