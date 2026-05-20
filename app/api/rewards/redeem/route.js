import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  const { classId, tokens } = await request.json();
  if (!classId || !tokens || parseInt(tokens) <= 0)
    return Response.json({ error: 'Invalid request' }, { status: 400 });

  // Verify ClassReward is enabled
  const { data: config } = await db.from('class_reward_config')
    .select('enabled').eq('class_id', classId).single();
  if (!config?.enabled) return Response.json({ error: 'ClassReward not enabled for this class' }, { status: 400 });

  // Get current balance
  const { data: ledger } = await db.from('class_reward_ledger')
    .select('tokens').eq('student_id', student.id).eq('class_id', classId);
  const balance = (ledger || []).reduce((sum, r) => sum + r.tokens, 0);
  const redeemAmount = Math.min(parseInt(tokens), balance);

  if (redeemAmount <= 0) return Response.json({ error: 'No tokens to redeem' }, { status: 400 });

  const cashValue = redeemAmount * 1.00;

  // Record redemption debit
  await db.from('class_reward_ledger').insert({
    student_id: student.id, class_id: classId,
    tokens: -redeemAmount,
    reason: 'redemption',
  });

  // Credit cash to portfolio (upsert in case portfolio row doesn't exist yet)
  const { data: portfolio } = await db.from('portfolios')
    .select('cash').eq('student_id', student.id).eq('class_id', classId).single();
  const newCash = parseFloat(portfolio?.cash || 0) + cashValue;
  await db.from('portfolios')
    .update({ cash: newCash, updated_at: new Date().toISOString() })
    .eq('student_id', student.id).eq('class_id', classId);

  return Response.json({
    success: true,
    tokensRedeemed: redeemAmount,
    cashAdded: cashValue,
    newBalance: balance - redeemAmount,
    newCash,
  });
}
