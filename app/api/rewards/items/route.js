import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';
import { STORE_ITEMS } from '@/app/api/rewards/store/route';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  const { data: cs } = await db.from('class_students').select('class_id')
    .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
  const classId = cs?.class_id;
  if (!classId) return Response.json({ owned: [], freezeHistory: [], freezesAvailable: 0 });

  // Fetch all relevant ledger rows with timestamps
  const { data: ledger } = await db.from('class_reward_ledger')
    .select('tokens, reason, created_at')
    .eq('student_id', student.id).eq('class_id', classId)
    .or('reason.like.store:%,reason.like.freeze_used:%')
    .order('created_at', { ascending: false });

  const rows = ledger || [];

  // Owned store items (deduplicated for non-freeze items)
  const purchases = rows.filter(r => r.reason?.startsWith('store:') && r.tokens < 0);
  const owned = [...new Set(purchases.map(r => r.reason.replace('store:', '')))];

  // Flair / theme active state
  const activeFlair = purchases.find(r => r.reason?.startsWith('store:flair_'))?.reason.replace('store:', '') || null;
  const activeTheme = purchases.find(r => r.reason?.startsWith('store:theme_'))?.reason.replace('store:', '') || null;

  // Freeze counts
  const freezePurchases = rows.filter(r => r.reason === 'store:streak_freeze');
  const freezeUsedRows  = rows.filter(r => r.reason?.startsWith('freeze_used:'));
  const freezesPurchased = freezePurchases.length;
  const freezesUsed     = freezeUsedRows.length;
  const freezesAvailable = Math.max(0, freezesPurchased - freezesUsed);

  // Merge freeze history in chronological order
  const freezeHistory = [
    ...freezePurchases.map(r => ({ type: 'purchased', date: r.created_at })),
    ...freezeUsedRows.map(r => ({
      type: 'used',
      date: r.created_at,
      forDate: r.reason.replace('freeze_used:', ''),
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return Response.json({ owned, activeFlair, activeTheme, freezesAvailable, freezesPurchased, freezesUsed, freezeHistory, storeItems: STORE_ITEMS });
}
