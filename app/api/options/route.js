import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

// Simplified Black-Scholes-inspired premium calculator
// premium ≈ intrinsic + time value
function calcPremium(currentPrice, strikePrice, optionType, daysToExpiry) {
  const intrinsic = optionType === 'call'
    ? Math.max(0, currentPrice - strikePrice)
    : Math.max(0, strikePrice - currentPrice);
  // Time value decays with sqrt of time remaining; vol ~30% annualized
  const vol = 0.30;
  const timeValue = strikePrice * vol * Math.sqrt(Math.max(0, daysToExpiry) / 365);
  return parseFloat((intrinsic + timeValue).toFixed(4));
}

async function getClassId(studentId) {
  const { data: cs } = await db.from('class_students').select('class_id')
    .eq('student_id', studentId).order('joined_at', { ascending: false }).limit(1).single();
  return cs?.class_id;
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json([]);
  const classId = await getClassId(student.id);
  if (!classId) return Response.json([]);

  const { data, error } = await db.from('options_positions')
    .select('*').eq('student_id', student.id).eq('class_id', classId)
    .order('created_at', { ascending: false }).limit(50);

  if (error?.code === '42P01') return Response.json({ tableNotReady: true });
  return Response.json(data || []);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });
  const classId = body.classId || await getClassId(student.id);
  if (!classId) return Response.json({ error: 'No class found' }, { status: 404 });

  // ── BUY option ────────────────────────────────────────────────
  if (action === 'buy') {
    const { coin, optionType, strikePrice, contracts, expiryDays } = body;
    if (!coin || !optionType || !strikePrice || !contracts || !expiryDays)
      return Response.json({ error: 'coin, optionType, strikePrice, contracts, expiryDays required' }, { status: 400 });
    if (!['call', 'put'].includes(optionType))
      return Response.json({ error: 'optionType must be call or put' }, { status: 400 });

    const { data: priceRow } = await db.from('price_cache').select('price').eq('symbol', coin.toUpperCase()).single();
    if (!priceRow) return Response.json({ error: `No price found for ${coin}` }, { status: 400 });
    const currentPrice = parseFloat(priceRow.price);
    const strike = parseFloat(strikePrice);
    const qty = parseFloat(contracts);
    const days = parseInt(expiryDays);

    const premiumPerContract = calcPremium(currentPrice, strike, optionType, days);
    const totalPremium = parseFloat((premiumPerContract * qty).toFixed(2));

    // Deduct premium from portfolio cash
    const { data: portfolio } = await db.from('portfolios').select('cash')
      .eq('student_id', student.id).eq('class_id', classId).single();
    if (!portfolio) return Response.json({ error: 'Portfolio not found' }, { status: 404 });
    const cash = parseFloat(portfolio.cash);
    if (cash < totalPremium) return Response.json({ error: `Insufficient cash — need ${totalPremium.toFixed(2)}, have ${cash.toFixed(2)}` }, { status: 400 });

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    const [{ error: portErr }, { data: opt, error: optErr }] = await Promise.all([
      db.from('portfolios').update({ cash: cash - totalPremium }).eq('student_id', student.id).eq('class_id', classId),
      db.from('options_positions').insert({
        student_id:   student.id,
        class_id:     classId,
        coin:         coin.toUpperCase(),
        option_type:  optionType,
        strike_price: strike,
        contracts:    qty,
        premium_paid: totalPremium,
        expires_at:   expiresAt,
        status:       'open',
      }).select().single(),
    ]);

    if (portErr || optErr) return Response.json({ error: portErr?.message || optErr?.message }, { status: 500 });
    return Response.json({ success: true, option: opt, premiumPaid: totalPremium, premiumPerContract });
  }

  // ── CLOSE (early close — sell option back at current value) ──
  if (action === 'close') {
    const { positionId } = body;
    const { data: pos } = await db.from('options_positions').select('*')
      .eq('id', positionId).eq('student_id', student.id).eq('status', 'open').single();
    if (!pos) return Response.json({ error: 'Position not found' }, { status: 404 });

    const { data: priceRow } = await db.from('price_cache').select('price').eq('symbol', pos.coin).single();
    const currentPrice = priceRow ? parseFloat(priceRow.price) : 0;
    const daysLeft = Math.max(0, (new Date(pos.expires_at) - new Date()) / (1000 * 86400));
    const closeValue = parseFloat((calcPremium(currentPrice, parseFloat(pos.strike_price), pos.option_type, daysLeft) * parseFloat(pos.contracts)).toFixed(2));

    const { data: portfolio } = await db.from('portfolios').select('cash').eq('student_id', student.id).eq('class_id', classId).single();
    await Promise.all([
      db.from('portfolios').update({ cash: parseFloat(portfolio.cash) + closeValue }).eq('student_id', student.id).eq('class_id', classId),
      db.from('options_positions').update({ status: 'closed', payout: closeValue }).eq('id', positionId),
    ]);
    return Response.json({ success: true, closeValue, pnl: closeValue - parseFloat(pos.premium_paid) });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
