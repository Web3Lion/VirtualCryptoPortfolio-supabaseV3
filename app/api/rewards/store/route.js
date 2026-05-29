import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStudentByEmail } from '@/lib/students';
import { db } from '@/lib/db';

export const STORE_ITEMS = [
  // Flair
  { id: 'flair_star',    name: 'Star Flair',      emoji: '⭐', price: 150, desc: 'Show ⭐ next to your name on the leaderboard', category: 'flair' },
  { id: 'flair_fire',    name: 'Fire Flair',       emoji: '🔥', price: 150, desc: 'Show 🔥 next to your name on the leaderboard', category: 'flair' },
  { id: 'flair_diamond', name: 'Diamond Flair',    emoji: '💎', price: 250, desc: 'Show 💎 next to your name on the leaderboard', category: 'flair' },
  { id: 'flair_crown',   name: 'Crown Flair',      emoji: '👑', price: 400, desc: 'Show 👑 next to your name on the leaderboard', category: 'flair' },
  // Titles
  { id: 'title_hodler',  name: '"HODLer" Title',   emoji: '🧘', price: 200, desc: 'Display the HODLer title on your profile',     category: 'title' },
  { id: 'title_whale',   name: '"Whale" Title',     emoji: '🐳', price: 300, desc: 'Display the Whale title on your profile',      category: 'title' },
  { id: 'title_oracle',  name: '"Oracle" Title',    emoji: '🔮', price: 500, desc: 'Display the Oracle title on your profile',     category: 'title' },
  // Themes
  { id: 'theme_gold',    name: 'Gold Rush',         emoji: '🪙', price: 300, desc: 'Transform the app into a golden trading floor — rich amber and burnished gold', category: 'theme' },
  { id: 'theme_arcade',  name: '80s Arcade',        emoji: '👾', price: 300, desc: 'Neon magenta and cyan on deep black — pixel vibes from the golden age of gaming', category: 'theme' },
  { id: 'theme_dino',    name: 'Dino Trader',       emoji: '🦕', price: 300, desc: 'Prehistoric jungle greens — trade like a beast that survived 65 million years', category: 'theme' },
];

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const student = await getStudentByEmail(session.user.email);
  if (!student) return Response.json({ balance: 0, items: STORE_ITEMS, owned: [], activeTheme: null });

  const { searchParams } = new URL(request.url);
  let classId = searchParams.get('classId');
  if (!classId) {
    const { data: cs } = await db.from('class_students').select('class_id')
      .eq('student_id', student.id).order('joined_at', { ascending: false }).limit(1).single();
    classId = cs?.class_id;
  }
  if (!classId) return Response.json({ balance: 0, items: STORE_ITEMS, owned: [], activeTheme: null, classId: null });

  const { data: ledger } = await db.from('class_reward_ledger')
    .select('tokens, reason, created_at').eq('student_id', student.id).eq('class_id', classId)
    .order('created_at', { ascending: false });

  const balance = (ledger || []).reduce((s, r) => s + r.tokens, 0);

  const purchases = (ledger || []).filter(r => r.reason?.startsWith('store:') && r.tokens < 0);
  const owned = [...new Set(purchases.map(r => r.reason.replace('store:', '')))];

  const activeFlair = purchases.find(r => r.reason?.startsWith('store:flair_'))?.reason.replace('store:', '') || null;
  const activeTheme = purchases.find(r => r.reason?.startsWith('store:theme_'))?.reason.replace('store:', '') || null;

  return Response.json({ balance, items: STORE_ITEMS, owned, activeFlair, activeTheme, classId });
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

  const { data: ledger } = await db.from('class_reward_ledger')
    .select('tokens, reason, created_at').eq('student_id', student.id).eq('class_id', classId)
    .order('created_at', { ascending: false });

  const balance = (ledger || []).reduce((s, r) => s + r.tokens, 0);
  if (balance < item.price) return Response.json({ error: 'Not enough tokens' }, { status: 400 });

  const purchases = (ledger || []).filter(r => r.reason?.startsWith('store:') && r.tokens < 0);

  // Flair: swap — refund old one first
  if (item.category === 'flair') {
    const oldFlair = purchases.find(r => r.reason?.startsWith('store:flair_'));
    if (oldFlair) {
      const oldItem = STORE_ITEMS.find(i => `store:${i.id}` === oldFlair.reason);
      if (oldItem) {
        await db.from('class_reward_ledger').insert({
          student_id: student.id, class_id: classId,
          tokens: oldItem.price, reason: `store_refund:${oldItem.id}`,
        });
      }
    }
  }

  // Theme: swap — refund old one first
  if (item.category === 'theme') {
    const oldTheme = purchases.find(r => r.reason?.startsWith('store:theme_'));
    if (oldTheme) {
      const oldItem = STORE_ITEMS.find(i => `store:${i.id}` === oldTheme.reason);
      if (oldItem) {
        await db.from('class_reward_ledger').insert({
          student_id: student.id, class_id: classId,
          tokens: oldItem.price, reason: `store_refund:${oldItem.id}`,
        });
      }
    }
  }

  await db.from('class_reward_ledger').insert({
    student_id: student.id, class_id: classId,
    tokens: -item.price, reason: `store:${itemId}`,
  });

  const newBalance = balance - item.price;
  return Response.json({ success: true, tokensSpent: item.price, newBalance, activeTheme: item.category === 'theme' ? itemId : null });
}
