import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAllConfig, setConfigs } from '@/lib/db';
const TEACHER_EMAIL = process.env.TEACHER_EMAIL;
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const cfg = await getAllConfig();
  return Response.json({
    tradingHoursOn:  cfg.TRADING_HOURS_ON === '1',
    tradingHoursStart: cfg.TRADING_HOURS_START,
    tradingHoursEnd:   cfg.TRADING_HOURS_END,
    dailyLimitOn:    cfg.DAILY_LIMIT_ON === '1',
    dailyLimitN:     parseInt(cfg.DAILY_LIMIT_N) || 3,
    marginEnabled:   cfg.MARGIN_ENABLED === '1',
    marginMult:      parseInt(cfg.MARGIN_MULTIPLIER) || 2,
    shortEnabled:    cfg.SHORT_SELLING_ENABLED === '1',
  });
}
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.email !== TEACHER_EMAIL) return Response.json({ error: 'Teacher only' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const updates = {};
  if (body.tradingHoursOn    !== undefined) updates.TRADING_HOURS_ON    = body.tradingHoursOn    ? '1' : '0';
  if (body.tradingHoursStart !== undefined) updates.TRADING_HOURS_START = body.tradingHoursStart;
  if (body.tradingHoursEnd   !== undefined) updates.TRADING_HOURS_END   = body.tradingHoursEnd;
  if (body.dailyLimitOn      !== undefined) updates.DAILY_LIMIT_ON      = body.dailyLimitOn      ? '1' : '0';
  if (body.dailyLimitN       !== undefined) updates.DAILY_LIMIT_N       = body.dailyLimitN;
  if (body.marginEnabled     !== undefined) updates.MARGIN_ENABLED      = body.marginEnabled     ? '1' : '0';
  if (body.marginMult        !== undefined) updates.MARGIN_MULTIPLIER   = body.marginMult;
  if (body.shortEnabled      !== undefined) updates.SHORT_SELLING_ENABLED = body.shortEnabled    ? '1' : '0';
  await setConfigs(updates);
  return Response.json({ success: true, message: '✓ Settings saved' });
}
