import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

async function isTeacher(session) {
  return session?.user?.email === TEACHER_EMAIL;
}

// GET — list challenges for a class
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!await isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const { data, error } = await db.from('weekly_challenges')
    .select('*').eq('class_id', classId).order('created_at', { ascending: false });

  if (error?.code === '42P01') return Response.json({ tableNotReady: true, challenges: [] });
  return Response.json({ challenges: data || [] });
}

// POST — create a new weekly challenge
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!await isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const body = await request.json();
  const { classId, title, description, challengeType, targetValue, tokensReward, startsAt, endsAt } = body;

  if (!classId || !title || !challengeType || !startsAt || !endsAt)
    return Response.json({ error: 'classId, title, challengeType, startsAt, endsAt required' }, { status: 400 });

  const VALID_TYPES = ['min_trades', 'hold_coins', 'learn', 'write_notes', 'profit'];
  if (!VALID_TYPES.includes(challengeType))
    return Response.json({ error: `challengeType must be one of: ${VALID_TYPES.join(', ')}` }, { status: 400 });

  const { data, error } = await db.from('weekly_challenges').insert({
    class_id:       classId,
    title:          title.trim(),
    description:    description?.trim() || null,
    challenge_type: challengeType,
    target_value:   parseFloat(targetValue) || 1,
    tokens_reward:  parseInt(tokensReward) || 100,
    starts_at:      startsAt,
    ends_at:        endsAt,
    active:         true,
  }).select().single();

  if (error?.code === '42P01') return Response.json({ error: 'Run the weekly challenge migration first.' }, { status: 503 });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, challenge: data });
}

// DELETE — archive a challenge
export async function DELETE(request) {
  const session = await getServerSession(authOptions);
  if (!await isTeacher(session)) return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { id } = await request.json();
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });

  await db.from('weekly_challenges').update({ active: false }).eq('id', id);
  return Response.json({ success: true });
}
