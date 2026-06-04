import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setConfigs, getAllConfig } from '@/lib/db';
import { getAllStudents } from '@/lib/students';
import { db } from '@/lib/db';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });
  // params.action is an array for catch-all routes, e.g. ['bull-run','start']
  const action = Array.isArray(params.action) ? params.action.join('/') : params.action;
  let body = {};
  try { body = await request.json(); } catch {}

  switch (action) {
    case 'freeze':
      await setConfigs({ MARKET_FREEZE: '1', MARKET_FREEZE_REASON: body.reason || 'Market temporarily closed', MARKET_FREEZE_UNTIL: body.minutes ? new Date(Date.now() + body.minutes * 60000).toISOString() : '' });
      return Response.json({ success: true, message: '🔒 Market frozen' });
    case 'unfreeze':
      await setConfigs({ MARKET_FREEZE: '0', MARKET_FREEZE_REASON: '', MARKET_FREEZE_UNTIL: '' });
      return Response.json({ success: true, message: '✅ Market open' });
    case 'bull-run/start':
      await setConfigs({ BULL_RUN_ACTIVE: '1', BULL_RUN_MULTIPLIER: String(body.multiplier || 2) });
      return Response.json({ success: true, message: `🐂 Bull run started (${body.multiplier || 2}×)` });
    case 'bull-run/stop':
      await setConfigs({ BULL_RUN_ACTIVE: '0' });
      return Response.json({ success: true, message: '⏹ Bull run ended' });
    case 'bull-run/schedule': {
      if (!body.scheduledAt) return Response.json({ error: 'scheduledAt required' }, { status: 400 });
      await setConfigs({ BULL_RUN_SCHEDULED_AT: new Date(body.scheduledAt).toISOString(), BULL_RUN_SCHEDULED_MULT: String(body.multiplier || 2) });
      return Response.json({ success: true, message: `🐂 Bull run scheduled for ${new Date(body.scheduledAt).toLocaleString()}` });
    }
    case 'bull-run/cancel-schedule':
      await setConfigs({ BULL_RUN_SCHEDULED_AT: '', BULL_RUN_SCHEDULED_MULT: '2' });
      return Response.json({ success: true, message: '✅ Bull run schedule cancelled' });
    case 'flash-sale/start': {
      if (!body.coin) return Response.json({ error: 'Coin required' }, { status: 400 });
      await setConfigs({ FLASH_SALE_COIN: body.coin.toUpperCase(), FLASH_SALE_FACTOR: String(1 - (body.discountPct || 20) / 100), FLASH_SALE_UNTIL: new Date(Date.now() + (body.minutes || 30) * 60000).toISOString() });
      return Response.json({ success: true, message: `⚡ Flash sale: ${body.coin} ${body.discountPct || 20}% off` });
    }
    case 'flash-sale/stop':
      await setConfigs({ FLASH_SALE_COIN: '', FLASH_SALE_FACTOR: '', FLASH_SALE_UNTIL: '' });
      return Response.json({ success: true, message: '⏹ Flash sale ended' });
    case 'announcement/post':
      if (!body.text) return Response.json({ error: 'text required' }, { status: 400 });
      await setConfigs({ ANNOUNCEMENT: body.text, ANNOUNCEMENT_COLOR: body.color || 'blue' });
      return Response.json({ success: true, message: '📢 Announcement posted' });
    case 'announcement/clear':
      await setConfigs({ ANNOUNCEMENT: '', ANNOUNCEMENT_COLOR: 'blue' });
      return Response.json({ success: true, message: '✅ Announcement cleared' });
    case 'flash-sale/schedule': {
      if (!body.scheduledAt || !body.coin) return Response.json({ error: 'scheduledAt and coin required' }, { status: 400 });
      await setConfigs({ FLASH_SALE_SCHEDULED_AT: new Date(body.scheduledAt).toISOString(), FLASH_SALE_SCHEDULED_COIN: body.coin.toUpperCase(), FLASH_SALE_SCHEDULED_FACTOR: String(1 - (body.discountPct || 20) / 100), FLASH_SALE_SCHEDULED_MINS: String(body.minutes || 30) });
      return Response.json({ success: true, message: `⚡ Flash sale on ${body.coin.toUpperCase()} scheduled` });
    }
    case 'flash-sale/cancel-schedule':
      await setConfigs({ FLASH_SALE_SCHEDULED_AT: '', FLASH_SALE_SCHEDULED_COIN: '', FLASH_SALE_SCHEDULED_FACTOR: '0.8', FLASH_SALE_SCHEDULED_MINS: '30' });
      return Response.json({ success: true, message: '✅ Flash sale schedule cancelled' });
    case 'pause':
      await setConfigs({ SIM_PAUSED: '1', MARKET_FREEZE: '1', MARKET_FREEZE_REASON: '⏸ Simulation paused' });
      return Response.json({ success: true, message: '⏸ Paused' });
    case 'resume':
      await setConfigs({ SIM_PAUSED: '0', MARKET_FREEZE: '0', MARKET_FREEZE_REASON: '' });
      return Response.json({ success: true, message: '▶ Resumed' });
    case 'end':
      await setConfigs({ SIM_PAUSED: '1', MARKET_FREEZE: '1', MARKET_FREEZE_REASON: '🏁 Simulation ended' });
      return Response.json({ success: true, message: '🏁 Ended' });
    case 'post-headline': {
      if (!body.headline) return Response.json({ error: 'Headline required' }, { status: 400 });
      const cfg = await getAllConfig();
      let history = [];
      try { history = JSON.parse(cfg.HEADLINE_HISTORY || '[]'); } catch {}
      history.push({ text: body.headline, url: body.url || '', ts: Date.now(), type: '👨‍🏫 Teacher Post' });
      if (history.length > 20) history = history.slice(-20);
      await setConfigs({ HEADLINE_HISTORY: JSON.stringify(history) });
      return Response.json({ success: true, message: '📰 Headline posted' });
    }
    case 'clear-headlines':
      await setConfigs({ HEADLINE_HISTORY: '[]' });
      return Response.json({ success: true, message: '🗑 Cleared' });
    case 'add-student': {
      if (!body.name || !body.email || !body.classId) return Response.json({ error: 'name, email, classId required' }, { status: 400 });
      const { data: cls } = await db.from('classes').select('seed_money').eq('id', body.classId).single();
      let student;
      const { data: existing } = await db.from('students').select('*').eq('email', body.email.toLowerCase()).single();
      if (existing) { student = existing; }
      else {
        const { data: ns } = await db.from('students').insert({ name: body.name, email: body.email.toLowerCase() }).select().single();
        student = ns;
      }
      await db.from('class_students').upsert({ class_id: body.classId, student_id: student.id }, { onConflict: 'class_id,student_id' });
      await db.from('portfolios').upsert({ student_id: student.id, class_id: body.classId, cash: parseFloat(cls?.seed_money || 10000), fees_paid: 0 }, { onConflict: 'student_id,class_id' });
      return Response.json({ success: true, message: `✅ ${body.name} added`, student });
    }
    case 'remove-student':
      if (!body.studentId || !body.classId) return Response.json({ error: 'studentId and classId required' }, { status: 400 });
      await db.from('class_students').delete().eq('student_id', body.studentId).eq('class_id', body.classId);
      return Response.json({ success: true, message: '✅ Student removed' });
    case 'reset-student': {
      if (!body.studentId || !body.classId) return Response.json({ error: 'studentId and classId required' }, { status: 400 });
      const { data: cls2 } = await db.from('classes').select('seed_money').eq('id', body.classId).single();
      await Promise.all([
        db.from('portfolios').update({ cash: parseFloat(cls2?.seed_money || 10000), fees_paid: 0 }).eq('student_id', body.studentId).eq('class_id', body.classId),
        db.from('holdings').delete().eq('student_id', body.studentId).eq('class_id', body.classId),
        db.from('trades').delete().eq('student_id', body.studentId).eq('class_id', body.classId),
        db.from('snapshots').delete().eq('student_id', body.studentId).eq('class_id', body.classId),
      ]);
      return Response.json({ success: true, message: '✅ Reset' });
    }
    case 'edit-class': {
      if (!body.classId || !body.name) return Response.json({ error: 'classId and name required' }, { status: 400 });
      await db.from('classes').update({ name: body.name }).eq('id', body.classId);
      return Response.json({ success: true, message: '✅ Class renamed' });
    }
    case 'move-student': {
      if (!body.studentId || !body.fromClassId || !body.toClassId)
        return Response.json({ error: 'studentId, fromClassId, toClassId required' }, { status: 400 });
      const { data: cls } = await db.from('classes').select('seed_money').eq('id', body.toClassId).single();
      // Update all class-scoped records
      await Promise.all([
        db.from('class_students').delete().eq('student_id', body.studentId).eq('class_id', body.fromClassId),
        db.from('class_students').upsert({ student_id: body.studentId, class_id: body.toClassId }, { onConflict: 'class_id,student_id' }),
        db.from('portfolios').update({ class_id: body.toClassId }).eq('student_id', body.studentId).eq('class_id', body.fromClassId),
        db.from('holdings').update({ class_id: body.toClassId }).eq('student_id', body.studentId).eq('class_id', body.fromClassId),
        db.from('trades').update({ class_id: body.toClassId }).eq('student_id', body.studentId).eq('class_id', body.fromClassId),
        db.from('snapshots').update({ class_id: body.toClassId }).eq('student_id', body.studentId).eq('class_id', body.fromClassId),
      ]);
      // Ensure portfolio row exists in target class
      await db.from('portfolios').upsert({ student_id: body.studentId, class_id: body.toClassId, cash: parseFloat(cls?.seed_money || 10000), fees_paid: 0 }, { onConflict: 'student_id,class_id' });
      return Response.json({ success: true, message: '✅ Student moved' });
    }
    case 'backfill-snapshots': {
      if (!body.classId) return Response.json({ error: 'classId required' }, { status: 400 });
      const { data: classStudents } = await db.from('class_students').select('student_id').eq('class_id', body.classId);
      const studentIds = (classStudents || []).map(r => r.student_id);
      if (!studentIds.length) return Response.json({ success: true, message: 'No students', count: 0 });
      const [portfoliosRes, holdingsRes, pricesRes] = await Promise.all([
        db.from('portfolios').select('student_id, cash').in('student_id', studentIds).eq('class_id', body.classId),
        db.from('holdings').select('student_id, coin, quantity, margin_borrowed').in('student_id', studentIds).eq('class_id', body.classId),
        db.from('price_cache').select('symbol, price'),
      ]);
      const pm = {};
      (pricesRes.data || []).forEach(p => { pm[p.symbol] = parseFloat(p.price); });
      const portfolioMap = {};
      (portfoliosRes.data || []).forEach(p => { portfolioMap[p.student_id] = parseFloat(p.cash); });
      const holdingsByStudent = {};
      (holdingsRes.data || []).forEach(h => {
        if (!holdingsByStudent[h.student_id]) holdingsByStudent[h.student_id] = [];
        holdingsByStudent[h.student_id].push(h);
      });
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await db.from('snapshots').select('student_id').eq('class_id', body.classId).eq('snapshot_type', 'daily').gte('created_at', today);
      const alreadyHave = new Set((existing || []).map(s => s.student_id));
      const rows = studentIds.filter(id => !alreadyHave.has(id)).map(studentId => {
        const cash = portfolioMap[studentId] ?? 0;
        let holdingsVal = 0, borrowed = 0;
        (holdingsByStudent[studentId] || []).forEach(h => {
          holdingsVal += parseFloat(h.quantity) * (pm[h.coin] || parseFloat(h.avg_buy_price) || 0);
          borrowed += parseFloat(h.margin_borrowed || 0);
        });
        return { student_id: studentId, class_id: body.classId, total_value: cash + holdingsVal - borrowed, cash, snapshot_type: 'daily' };
      });
      if (rows.length) await db.from('snapshots').insert(rows);
      return Response.json({ success: true, message: `✅ Backfilled ${rows.length} daily snapshots`, count: rows.length });
    }
    default:
      return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
