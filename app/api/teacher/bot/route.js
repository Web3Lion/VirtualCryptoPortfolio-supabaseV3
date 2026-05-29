import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, getAllConfig, setConfigs } from '@/lib/db';
import { BOT_EMAIL, BOT_NAME, ensureBotStudent, resetBot } from '@/lib/bot';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

function botKey(classId, k) { return `BOT_${k}_${classId}`; }

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  if (TEACHER_EMAIL && session.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data } = await db.from('classes').select('id').eq('teacher_email', session.user.email).order('created_at', { ascending: false }).limit(1).single();
    classId = data?.id;
  }
  if (!classId) return Response.json({ error: 'No class found' }, { status: 404 });

  const cfg = await getAllConfig();
  const config = {
    enabled:       cfg[botKey(classId,'ENABLED')]      === '1',
    strategy:      cfg[botKey(classId,'STRATEGY')]     || 'momentum',
    risk:          cfg[botKey(classId,'RISK')]          || 'moderate',
    maxPositions:  parseInt(cfg[botKey(classId,'MAX_POS')]) || 5,
    buyThreshold:  parseFloat(cfg[botKey(classId,'BUY_THR')]) || 2,
    takeProfit:    parseFloat(cfg[botKey(classId,'TAKE_PROFIT')]) || 15,
    stopLoss:      parseFloat(cfg[botKey(classId,'STOP_LOSS')]) || 10,
  };

  // Bot stats
  let stats = { cash: 0, totalValue: 0, returnPct: 0, tradeCount: 0, holdings: [] };
  try {
    const { data: cls } = await db.from('classes').select('seed_money').eq('id', classId).single();
    const seedMoney = parseFloat(cls?.seed_money || 10000);
    const { data: student } = await db.from('students').select('id').eq('email', BOT_EMAIL).single();
    if (student) {
      const [pRes, hRes, tRes, prRes] = await Promise.all([
        db.from('portfolios').select('cash').eq('student_id', student.id).eq('class_id', classId).single(),
        db.from('holdings').select('coin, quantity, avg_buy_price').eq('student_id', student.id).eq('class_id', classId).gt('quantity', 0),
        db.from('trades').select('id', { count: 'exact', head: true }).eq('student_id', student.id).eq('class_id', classId),
        db.from('price_cache').select('symbol, price'),
      ]);
      const priceMap = {};
      (prRes.data || []).forEach(p => { priceMap[p.symbol] = parseFloat(p.price); });
      const cash = parseFloat(pRes.data?.cash || 0);
      const holdingsVal = (hRes.data || []).reduce((s, h) => s + parseFloat(h.quantity) * (priceMap[h.coin] || parseFloat(h.avg_buy_price)), 0);
      const totalValue = cash + holdingsVal;
      stats = {
        cash, totalValue, seedMoney,
        returnPct: ((totalValue / seedMoney) - 1) * 100,
        tradeCount: tRes.count || 0,
        holdings: (hRes.data || []).map(h => ({
          coin: h.coin,
          quantity: parseFloat(h.quantity),
          avgBuy: parseFloat(h.avg_buy_price),
          currentPrice: priceMap[h.coin] || parseFloat(h.avg_buy_price),
          pnlPct: ((priceMap[h.coin] || parseFloat(h.avg_buy_price)) - parseFloat(h.avg_buy_price)) / parseFloat(h.avg_buy_price) * 100,
        })),
      };
    }
  } catch {}

  return Response.json({ config, stats, classId });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  if (TEACHER_EMAIL && session.user?.email?.toLowerCase() !== TEACHER_EMAIL.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const body = await request.json();
  const { classId, action } = body;
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  if (action === 'reset') {
    const { data: cls } = await db.from('classes').select('seed_money').eq('id', classId).single();
    await resetBot(classId, cls?.seed_money || 10000);
    return Response.json({ success: true, message: 'Bot portfolio reset' });
  }

  const updates = {};
  if (body.enabled      !== undefined) updates[botKey(classId,'ENABLED')]     = body.enabled ? '1' : '0';
  if (body.strategy     !== undefined) updates[botKey(classId,'STRATEGY')]    = body.strategy;
  if (body.risk         !== undefined) updates[botKey(classId,'RISK')]        = body.risk;
  if (body.maxPositions !== undefined) updates[botKey(classId,'MAX_POS')]     = String(body.maxPositions);
  if (body.buyThreshold !== undefined) updates[botKey(classId,'BUY_THR')]     = String(body.buyThreshold);
  if (body.takeProfit   !== undefined) updates[botKey(classId,'TAKE_PROFIT')] = String(body.takeProfit);
  if (body.stopLoss     !== undefined) updates[botKey(classId,'STOP_LOSS')]   = String(body.stopLoss);
  await setConfigs(updates);

  // If enabling bot, ensure student + portfolio exist
  if (body.enabled) {
    const { data: cls } = await db.from('classes').select('seed_money').eq('id', classId).single();
    await ensureBotStudent(classId, cls?.seed_money || 10000);
  }

  return Response.json({ success: true, message: '✅ Bot settings saved' });
}
