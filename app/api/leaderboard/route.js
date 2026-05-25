import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { calculateSharpe } from '@/lib/metrics';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');

  // Find class if not provided
  if (!classId) {
    const email = session.user.email.toLowerCase();
    // Try teacher's class first
    const { data: teacherClass } = await db
      .from('classes')
      .select('id')
      .eq('teacher_email', process.env.TEACHER_EMAIL)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (teacherClass) {
      classId = teacherClass.id;
    } else {
      // Find student's class
      const { data: student } = await db.from('students').select('id').eq('email', email).single();
      if (student) {
        const { data: cs } = await db.from('class_students').select('class_id')
          .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
        classId = cs?.class_id;
      }
    }
  }
  if (!classId) return Response.json([]);

  // Get class config
  const { data: cls } = await db.from('classes').select('seed_money, trade_fee').eq('id', classId).single();
  const seedMoney = parseFloat(cls?.seed_money || 10000);

  // Get all students in class
  const { data: classStudents } = await db
    .from('class_students')
    .select('student_id, students(id, name, email, is_bot)')
    .eq('class_id', classId);

  if (!classStudents?.length) return Response.json([]);

  const students = classStudents.map(r => r.students).filter(Boolean);

  // Get all portfolios, holdings, trades for this class
  const studentIds = students.map(s => s.id);

  const [portfoliosRes, holdingsRes, tradesRes, pricesRes, snapshotsRes] = await Promise.all([
    db.from('portfolios').select('student_id, cash, fees_paid').in('student_id', studentIds).eq('class_id', classId),
    db.from('holdings').select('student_id, coin, quantity, avg_buy_price').in('student_id', studentIds).eq('class_id', classId).gt('quantity', 0),
    db.from('trades').select('student_id').in('student_id', studentIds).eq('class_id', classId),
    db.from('price_cache').select('symbol, price'),
    db.from('snapshots').select('student_id, total_value, created_at').in('student_id', studentIds).eq('class_id', classId).order('created_at', { ascending: true }),
  ]);

  const portfolioMap = {};
  (portfoliosRes.data || []).forEach(p => { portfolioMap[p.student_id] = p; });

  const holdingsMap = {};
  (holdingsRes.data || []).forEach(h => {
    if (!holdingsMap[h.student_id]) holdingsMap[h.student_id] = [];
    holdingsMap[h.student_id].push(h);
  });

  const tradeCountMap = {};
  (tradesRes.data || []).forEach(t => {
    tradeCountMap[t.student_id] = (tradeCountMap[t.student_id] || 0) + 1;
  });

  const priceMap = {};
  (pricesRes.data || []).forEach(p => { priceMap[p.symbol] = parseFloat(p.price); });

  const snapshotsByStudent = {};
  (snapshotsRes.data || []).forEach(s => {
    if (!snapshotsByStudent[s.student_id]) snapshotsByStudent[s.student_id] = [];
    snapshotsByStudent[s.student_id].push(s);
  });

  // Build leaderboard rows
  const rows = students.map(student => {
    const portfolio  = portfolioMap[student.id] || { cash: seedMoney, fees_paid: 0 };
    const cash       = parseFloat(portfolio.cash) || 0;
    const feesPaid   = parseFloat(portfolio.fees_paid) || 0;
    const holdings   = holdingsMap[student.id] || [];

    // Calculate holdings value using current prices
    let holdingsVal = 0;
    holdings.forEach(h => {
      const price = priceMap[h.coin] || parseFloat(h.avg_buy_price) || 0;
      holdingsVal += parseFloat(h.quantity) * price;
    });

    const totalVal  = cash + holdingsVal;
    const pl        = totalVal - seedMoney;
    const returnPct = ((pl / seedMoney) * 100);

    return {
      id:         student.id,
      name:       student.name,
      email:      student.email,
      isBot:      student.is_bot || false,
      cash:       parseFloat(cash.toFixed(2)),
      holdingsVal:parseFloat(holdingsVal.toFixed(2)),
      total:      parseFloat(totalVal.toFixed(2)),
      pl:         parseFloat(pl.toFixed(2)),
      returnPct:  parseFloat(returnPct.toFixed(2)),
      fees:       parseFloat(feesPaid.toFixed(2)),
      coinCount:  holdings.length,
      tradeCount: tradeCountMap[student.id] || 0,
      sharpeRatio: calculateSharpe(snapshotsByStudent[student.id] || []),
    };
  });

  // Sort by total value descending
  rows.sort((a, b) => b.total - a.total);

  return Response.json(rows);
}