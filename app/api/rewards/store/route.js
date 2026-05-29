import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

export const STORE_ITEMS = [
  { id: 'cash_50',    name: '$50 Cash Drop',   emoji: '💵', price: 100, desc: 'Instantly add $50 to your portfolio cash',   category: 'cash',  cashValue: 50 },
  { id: 'cash_200',   name: '$200 Cash Drop',  emoji: '💰', price: 350, desc: 'Instantly add $200 to your portfolio cash',  category: 'cash',  cashValue: 200 },
  { id: 'cash_500',   name: '$500 Cash Drop',  emoji: '🤑', price: 800, desc: 'Instantly add $500 to your portfolio cash',  category: 'cash',  cashValue: 500 },
  { id: 'flair_star',    name: 'Star Flair',     emoji: '⭐', price: 150, desc: 'Show ⭐ next to your name on the leaderboard', category: 'flair' },
  { id: 'flair_fire',    name: 'Fire Flair',     emoji: '🔥', price: 150, desc: 'Show 🔥 next to your name on the leaderboard', category: 'flair' },
  { id: 'flair_diamond', name: 'Diamond Flair',  emoji: '💎', price: 250, desc: 'Show 💎 next to your name on the leaderboard', category: 'flair' },
  { id: 'flair_crown',   name: 'Crown Flair',    emoji: '👑', price: 400, desc: 'Show 👑 next to your name on the leaderboard', category: 'flair' },
  { id: 'title_hodler',  name: '"HODLer" Title', emoji: '🧘', price: 200, desc: 'Display the HODLer title on your profile',     category: 'title' },
  { id: 'title_whale',   name: '"Whale" Title',  emoji: '🐳', price: 300, desc: 'Display the Whale title on your profile',       category: 'title' },
  { id: 'title_oracle',  name: '"Oracle" Title', emoji: '🔮', price: 500, desc: 'Display the Oracle title on your profile',      category: 'title' },
];

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ balance: 0, items: STORE_ITEMS, owned: [] });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ balance: 0, items: STORE_ITEMS, owned: [], classId: null });

  const { data: ledger } = await db.from('class_reward_ledger')
    .select('tokens, reason').eq('student_id', student.id).eq('class_id', classId);

  const balance = (ledger || []).reduce((s, r) => s + r.tokens, 0);
  const owned = (ledger || [])
    .filter(r => r.reason?.startsWith('store:') && r.tokens < 0)
    .map(r => r.reason.replace('store:', ''));

  return Response.json({ balance, items: STORE_ITEMS, owned, classId });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ error: 'Not registered' }, { status: 403 });

  const { classId, itemId } = await request.json();
  if (!classId || !itemId) return Response.json({ error: 'classId and itemId required' }, { status: 400 });

  const item = STORE_ITEMS.find(i => i.id === itemId);
  if (!item) return Response.json({ error: 'Item not found' }, { status: 404 });

  const { data: cfg } = await db.from('class_reward_config').select('enabled').eq('class_id', classId).single();
  if (!cfg?.enabled) return Response.json({ error: 'Rewards not enabled for this class' }, { status: 400 });

  // Check balance
  const { data: ledger } = await db.from('class_reward_ledger')
    .select('tokens, reason').eq('student_id', student.id).eq('class_id', classId);
  const balance = (ledger || []).reduce((s, r) => s + r.tokens, 0);
  if (balance < item.price) return Response.json({ error: 'Not enough tokens' }, { status: 400 });

  // Flair items: cancel existing flair first (only one active flair at a time)
  if (item.category === 'flair') {
    const existingFlair = (ledger || []).find(r => r.reason?.startsWith('store:flair_') && r.tokens < 0);
    if (existingFlair) {
      // Refund the old flair cost and mark as swapped
      const oldItem = STORE_ITEMS.find(i => `store:${i.id}` === existingFlair.reason);
      if (oldItem) {
        await db.from('class_reward_ledger').insert({
          student_id: student.id, class_id: classId,
          tokens: oldItem.price, reason: `store_refund:${oldItem.id}`,
        });
      }
    }
  }

  // Deduct tokens
  await db.from('class_reward_ledger').insert({
    student_id: student.id, class_id: classId,
    tokens: -item.price, reason: `store:${itemId}`,
  });

  // Cash items: add to portfolio immediately
  let cashAdded = 0;
  if (item.category === 'cash' && item.cashValue) {
    const { data: portfolio } = await db.from('portfolios')
      .select('cash').eq('student_id', student.id).eq('class_id', classId).single();
    const newCash = parseFloat(portfolio?.cash || 0) + item.cashValue;
    await db.from('portfolios').update({ cash: newCash }).eq('student_id', student.id).eq('class_id', classId);
    cashAdded = item.cashValue;
  }

  return Response.json({ success: true, tokensSpent: item.price, newBalance: balance - item.price, cashAdded });
}
