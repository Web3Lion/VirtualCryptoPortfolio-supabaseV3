import { db } from './db';

export async function getStudentByEmail(email) {
  const { data } = await db.from('students').select('id, name, email, is_bot').eq('email', email.toLowerCase().trim()).single();
  return data || null;
}

export async function getStudentClass(studentId) {
  const { data } = await db
    .from('class_students')
    .select('class_id, classes(id, name, seed_money, trade_fee, is_active)')
    .eq('student_id', studentId)
    .order('joined_at', { ascending: false })
    .limit(1)
    .single();
  return data?.classes || null;
}

export async function getStudentClasses(studentId) {
  const { data } = await db
    .from('class_students')
    .select('class_id, classes(id, name, semester, seed_money, trade_fee, is_active)')
    .eq('student_id', studentId)
    .order('joined_at', { ascending: false });
  return (data || []).map(r => r.classes);
}

export async function getStudentPortfolio(studentId, classId) {
  const [portfolioRes, holdingsRes, tradesRes] = await Promise.all([
    db.from('portfolios').select('cash, fees_paid').eq('student_id', studentId).eq('class_id', classId).single(),
    db.from('holdings').select('*').eq('student_id', studentId).eq('class_id', classId).gt('quantity', 0),
    db.from('trades').select('*').eq('student_id', studentId).eq('class_id', classId).order('created_at', { ascending: false }).limit(200),
  ]);
  return {
    portfolio: portfolioRes.data || { cash: 0, fees_paid: 0 },
    holdings:  holdingsRes.data || [],
    trades:    tradesRes.data   || [],
  };
}

// Range → { type, hours } mapping
const RANGE_CONFIG = {
  '1D':  { type: 'intraday', hours: 24 },
  '3D':  { type: 'intraday', hours: 72 },
  '1W':  { type: 'intraday', hours: 168 },
  '1M':  { type: 'daily',    days: 30 },
  '3M':  { type: 'daily',    days: 90 },
  'ALL': { type: 'daily',    days: null },
};

export async function getPortfolioHistory(studentId, classId, range = '1W') {
  const cfg = RANGE_CONFIG[range] || RANGE_CONFIG['1W'];
  const cutoff = cfg.days !== null
    ? new Date(Date.now() - cfg.days * 24 * 60 * 60 * 1000).toISOString()
    : cfg.hours
    ? new Date(Date.now() - cfg.hours * 60 * 60 * 1000).toISOString()
    : null;

  // Always fetch both so client can switch without re-requesting
  let intradayQ = db.from('snapshots').select('total_value, created_at')
    .eq('student_id', studentId).eq('class_id', classId)
    .eq('snapshot_type', 'intraday').order('created_at').limit(1000);

  let dailyQ = db.from('snapshots').select('total_value, created_at')
    .eq('student_id', studentId).eq('class_id', classId)
    .eq('snapshot_type', 'daily').order('created_at').limit(500);

  if (cutoff && cfg.type === 'intraday') intradayQ = intradayQ.gte('created_at', cutoff);
  if (cutoff && cfg.type === 'daily')    dailyQ    = dailyQ.gte('created_at', cutoff);

  const [intradayRes, dailyRes] = await Promise.all([intradayQ, dailyQ]);

  const fmt = (r, isIntraday) => ({
    v: parseFloat(r.total_value),
    t: isIntraday
      ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    ts: r.created_at,
  });

  return {
    intraday: (intradayRes.data || []).map(r => fmt(r, true)),
    daily:    (dailyRes.data    || []).map(r => fmt(r, false)),
    range,
  };
}

export async function getClassCoins(classId) {
  const { data } = await db.from('class_coins').select('symbol, gecko_id, name, sector').eq('class_id', classId).eq('active', true).order('symbol');
  return data || [];
}

export async function getAllStudents(classId) {
  const { data } = await db.from('class_students').select('student_id, students(id, name, email, is_bot)').eq('class_id', classId);
  return (data || []).map(r => r.students);
}
