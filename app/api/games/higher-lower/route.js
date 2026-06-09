import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const GAME_COINS = ['BTC', 'ETH', 'HBAR', 'SUI'];

async function getStudent(email) {
  const { data } = await db.from('students').select('id').eq('email', email.toLowerCase()).single();
  return data;
}

async function getConfig(classId) {
  const { data } = await db.from('class_reward_config').select('*').eq('class_id', classId).single();
  return data || { enabled: false, higher_lower_tokens_per_correct: 10 };
}

// GET ?classId=xxx — resolve pending predictions, return state
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const student = await getStudent(session.user.email);
  if (!student) return Response.json({ predictions: [], canPredict: {}, prices: {}, config: {} });

  // Fetch prices and config in parallel
  const [priceRes, cfg] = await Promise.all([
    db.from('price_cache').select('symbol, price').in('symbol', GAME_COINS),
    getConfig(classId),
  ]);

  const priceMap = {};
  (priceRes.data || []).forEach(r => { priceMap[r.symbol] = parseFloat(r.price); });

  // Lazy-resolve: find pending predictions older than 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: toResolve, error: resolveErr } = await db
    .from('higher_lower_predictions')
    .select('*')
    .eq('student_id', student.id)
    .eq('class_id', classId)
    .is('resolved_at', null)
    .lt('predicted_at', cutoff);

  if (resolveErr?.code === '42P01') return Response.json({ tableNotReady: true });

  const tokensPerCorrect = cfg?.higher_lower_tokens_per_correct ?? 10;
  const resolvedNow = new Date().toISOString();

  for (const pred of (toResolve || [])) {
    const currentPrice = priceMap[pred.coin_id];
    if (!currentPrice) continue;

    const priceWentUp = currentPrice > parseFloat(pred.price_at_prediction);
    const correct = (pred.direction === 'higher' && priceWentUp) || (pred.direction === 'lower' && !priceWentUp);

    let tokensAwarded = 0;
    if (correct && cfg?.enabled && tokensPerCorrect > 0) {
      tokensAwarded = tokensPerCorrect;
      await db.from('class_reward_ledger').insert({
        student_id: student.id,
        class_id: classId,
        tokens: tokensAwarded,
        reason: `higher_lower:${pred.coin_id}:correct`,
      });
    }

    await db.from('higher_lower_predictions').update({
      resolved_at: resolvedNow,
      resolution_price: currentPrice,
      correct,
      tokens_awarded: tokensAwarded,
    }).eq('id', pred.id);
  }

  // Fetch all predictions from last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: predictions } = await db
    .from('higher_lower_predictions')
    .select('*')
    .eq('student_id', student.id)
    .eq('class_id', classId)
    .gte('predicted_at', sevenDaysAgo)
    .order('predicted_at', { ascending: false });

  // Which coins can still be predicted today?
  const today = new Date().toISOString().slice(0, 10);
  const todaySet = new Set(
    (predictions || [])
      .filter(p => p.predicted_at?.slice(0, 10) === today)
      .map(p => p.coin_id)
  );
  const canPredict = {};
  GAME_COINS.forEach(c => { canPredict[c] = !todaySet.has(c); });

  return Response.json({
    predictions: predictions || [],
    canPredict,
    prices: priceMap,
    config: { tokensPerCorrect, rewardsEnabled: cfg?.enabled ?? false },
  });
}

// POST — submit a prediction
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { classId, coinId, direction } = body;

  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });
  if (!GAME_COINS.includes(coinId)) return Response.json({ error: 'Invalid coin' }, { status: 400 });
  if (!['higher', 'lower'].includes(direction)) return Response.json({ error: 'Invalid direction' }, { status: 400 });

  const student = await getStudent(session.user.email);
  if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

  // One prediction per coin per day
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await db
    .from('higher_lower_predictions')
    .select('id')
    .eq('student_id', student.id)
    .eq('class_id', classId)
    .eq('coin_id', coinId)
    .gte('predicted_at', `${today}T00:00:00Z`)
    .lte('predicted_at', `${today}T23:59:59Z`)
    .maybeSingle();

  if (existing) return Response.json({ error: 'Already predicted this coin today' }, { status: 409 });

  const { data: priceRow } = await db.from('price_cache').select('price').eq('symbol', coinId).single();
  if (!priceRow?.price) return Response.json({ error: 'Price unavailable' }, { status: 503 });

  const { data: pred, error } = await db
    .from('higher_lower_predictions')
    .insert({
      student_id: student.id,
      class_id: classId,
      coin_id: coinId,
      direction,
      price_at_prediction: parseFloat(priceRow.price),
    })
    .select()
    .single();

  if (error?.code === '42P01') return Response.json({ tableNotReady: true }, { status: 503 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json(pred);
}
