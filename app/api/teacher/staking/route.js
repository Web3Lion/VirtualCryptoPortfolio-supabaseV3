import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

const TEACHER_EMAIL = process.env.TEACHER_EMAIL;

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get('classId');
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  const { data: cfg } = await db.from('staking_config').select('*').eq('class_id', classId).single();

  // Class-level staking stats
  const { data: positions } = await db.from('staking_positions')
    .select('coin, quantity, apy, total_rewards_earned, status')
    .eq('class_id', classId).eq('status', 'active');

  const activePositions = positions || [];
  const totalEarned = activePositions.reduce((s, p) => s + parseFloat(p.total_rewards_earned || 0), 0);

  // Count per coin
  const byCoin = {};
  activePositions.forEach(p => {
    if (!byCoin[p.coin]) byCoin[p.coin] = { count: 0, totalQty: 0 };
    byCoin[p.coin].count++;
    byCoin[p.coin].totalQty += parseFloat(p.quantity);
  });

  return Response.json({
    enabled: cfg?.enabled ?? false,
    activePositions: activePositions.length,
    totalEarned,
    byCoin,
  });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email?.toLowerCase() !== TEACHER_EMAIL?.toLowerCase())
    return Response.json({ error: 'Teacher only' }, { status: 403 });

  const { classId, enabled } = await request.json();
  if (!classId) return Response.json({ error: 'classId required' }, { status: 400 });

  await db.from('staking_config').upsert(
    { class_id: classId, enabled: !!enabled, updated_at: new Date().toISOString() },
    { onConflict: 'class_id' }
  );
  return Response.json({ success: true });
}
