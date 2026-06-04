import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

// ── Helper: compute current portfolio value for all students in a class ──
async function getPortfolioValues(classId, studentIds) {
  const [portfoliosRes, holdingsRes, pricesRes] = await Promise.all([
    db.from('portfolios').select('student_id, cash').in('student_id', studentIds).eq('class_id', classId),
    db.from('holdings').select('student_id, coin, quantity').in('student_id', studentIds).eq('class_id', classId).gt('quantity', 0),
    db.from('price_cache').select('symbol, price'),
  ]);
  const pm = {};
  (pricesRes.data || []).forEach(p => { pm[p.symbol] = parseFloat(p.price); });
  const result = {};
  (portfoliosRes.data || []).forEach(p => { result[p.student_id] = parseFloat(p.cash); });
  (holdingsRes.data || []).forEach(h => {
    result[h.student_id] = (result[h.student_id] || 0) + parseFloat(h.quantity) * (pm[h.coin] || 0);
  });
  return result;
}

// ── GET: active/upcoming tournaments for the student's class ──
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');

  if (!classId) {
    const student = await getStudentByEmail(session.user.email);
    if (!student) return Response.json([]);
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json([]);

  const now = new Date().toISOString();
  const { data: tournaments, error } = await db.from('tournaments')
    .select('*').eq('class_id', classId)
    .or(`status.eq.active,status.eq.upcoming,ends_at.gte.${new Date(Date.now() - 7*24*60*60*1000).toISOString()}`)
    .order('starts_at', { ascending: false }).limit(5);

  if (error?.code === '42P01') return Response.json({ tableNotReady: true });

  // For active tournaments, compute live standings
  const enriched = await Promise.all((tournaments || []).map(async t => {
    if (t.status !== 'active') return t;
    const { data: classStudents } = await db.from('class_students')
      .select('student_id, students(name, is_bot)').eq('class_id', classId);
    const students = (classStudents || []).filter(r => r.students && !r.students.is_bot);
    const studentIds = students.map(r => r.student_id);

    const { data: snapshots } = await db.from('tournament_snapshots')
      .select('*').eq('tournament_id', t.id).in('student_id', studentIds);
    const startMap = {};
    (snapshots || []).forEach(s => { startMap[s.student_id] = parseFloat(s.start_value || 0); });

    const currentVals = await getPortfolioValues(classId, studentIds);
    const standings = students.map(r => {
      const sid = r.student_id;
      const startVal = startMap[sid] || currentVals[sid] || 10000;
      const curVal = currentVals[sid] || startVal;
      return { studentId: sid, name: r.students.name, startVal, curVal, returnPct: ((curVal - startVal) / startVal) * 100 };
    }).sort((a, b) => b.returnPct - a.returnPct).map((s, i) => ({ ...s, rank: i + 1 }));

    return { ...t, standings };
  }));

  return Response.json(enriched);
}

// ── POST: teacher creates/manages tournaments ──
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { action } = body;
  const isTeacher = TEACHER_EMAIL && session.user.email?.toLowerCase() === TEACHER_EMAIL.toLowerCase();

  // ── Create tournament (teacher only) ─────────────────────
  if (action === 'create') {
    if (!isTeacher) return Response.json({ error: 'Teacher only' }, { status: 403 });
    const { classId, name, startsAt, endsAt, prizeTokens } = body;
    if (!classId || !name || !startsAt || !endsAt)
      return Response.json({ error: 'classId, name, startsAt, endsAt required' }, { status: 400 });

    const { data, error } = await db.from('tournaments').insert({
      class_id: classId, name, starts_at: startsAt, ends_at: endsAt,
      prize_tokens: parseInt(prizeTokens) || 0,
      status: new Date(startsAt) <= new Date() ? 'active' : 'upcoming',
    }).select().single();

    if (error?.code === '42P01') return Response.json({ error: 'Run the tournament migration first.' }, { status: 503 });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // If already active, snapshot starting values
    if (data.status === 'active') {
      const { data: classStudents } = await db.from('class_students')
        .select('student_id, students(is_bot)').eq('class_id', classId);
      const studentIds = (classStudents || []).filter(r => !r.students?.is_bot).map(r => r.student_id);
      const startVals = await getPortfolioValues(classId, studentIds);
      await db.from('tournament_snapshots').insert(
        studentIds.map(sid => ({ tournament_id: data.id, student_id: sid, class_id: classId, start_value: startVals[sid] || 0 }))
      );
    }

    return Response.json({ success: true, tournament: data });
  }

  // ── Start (activate an upcoming tournament) ───────────────
  if (action === 'start') {
    if (!isTeacher) return Response.json({ error: 'Teacher only' }, { status: 403 });
    const { tournamentId, classId } = body;
    const { data: t } = await db.from('tournaments').select('*').eq('id', tournamentId).single();
    if (!t) return Response.json({ error: 'Tournament not found' }, { status: 404 });

    const { data: classStudents } = await db.from('class_students')
      .select('student_id, students(is_bot)').eq('class_id', classId || t.class_id);
    const studentIds = (classStudents || []).filter(r => !r.students?.is_bot).map(r => r.student_id);
    const startVals = await getPortfolioValues(classId || t.class_id, studentIds);

    // Delete any old snapshots for this tournament
    await db.from('tournament_snapshots').delete().eq('tournament_id', tournamentId);
    await db.from('tournament_snapshots').insert(
      studentIds.map(sid => ({ tournament_id: tournamentId, student_id: sid, class_id: classId || t.class_id, start_value: startVals[sid] || 0 }))
    );
    await db.from('tournaments').update({ status: 'active' }).eq('id', tournamentId);
    return Response.json({ success: true, message: `🏆 Tournament started — ${studentIds.length} students enrolled` });
  }

  // ── End + award winner ────────────────────────────────────
  if (action === 'end') {
    if (!isTeacher) return Response.json({ error: 'Teacher only' }, { status: 403 });
    const { tournamentId } = body;
    const { data: t } = await db.from('tournaments').select('*').eq('id', tournamentId).single();
    if (!t) return Response.json({ error: 'Tournament not found' }, { status: 404 });

    const { data: snaps } = await db.from('tournament_snapshots')
      .select('*, students(name, is_bot)').eq('tournament_id', tournamentId);
    const students = (snaps || []).filter(s => !s.students?.is_bot);
    const studentIds = students.map(s => s.student_id);
    const endVals = await getPortfolioValues(t.class_id, studentIds);

    const ranked = students.map(s => ({
      ...s, endVal: endVals[s.student_id] || parseFloat(s.start_value),
      returnPct: ((endVals[s.student_id] - parseFloat(s.start_value)) / parseFloat(s.start_value)) * 100,
    })).sort((a, b) => b.returnPct - a.returnPct);

    // Update end values + ranks
    await Promise.all(ranked.map((s, i) =>
      db.from('tournament_snapshots').update({ end_value: s.endVal, return_pct: s.returnPct, rank: i + 1 })
        .eq('tournament_id', tournamentId).eq('student_id', s.student_id)
    ));

    // Award prize tokens to winner
    const winner = ranked[0];
    if (winner && t.prize_tokens > 0) {
      await db.from('class_reward_ledger').insert({
        student_id: winner.student_id, class_id: t.class_id,
        tokens: t.prize_tokens, reason: `tournament:${t.name}`,
      });
    }

    await db.from('tournaments').update({ status: 'ended', winner_id: winner?.student_id }).eq('id', tournamentId);
    return Response.json({ success: true, winner: winner ? { name: winner.students?.name, returnPct: winner.returnPct } : null, ranked });
  }

  return Response.json({ error: 'Unknown action' }, { status: 400 });
}
