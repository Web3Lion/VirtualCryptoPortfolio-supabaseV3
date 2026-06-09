import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const db = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ── Config helpers ────────────────────────────────────────────
const CONFIG_DEFAULTS = {
  MARKET_FREEZE:        '0',
  MARKET_FREEZE_REASON: '',
  MARKET_FREEZE_UNTIL:  '',
  TRADING_HOURS_ON:     '0',
  TRADING_HOURS_START:  '09:00',
  TRADING_HOURS_END:    '15:00',
  DAILY_LIMIT_ON:       '0',
  DAILY_LIMIT_N:        '3',
  TRADE_FEE_OVERRIDE:   '',
  BULL_RUN_ACTIVE:      '0',
  BULL_RUN_MULTIPLIER:  '2',
  FLASH_CRASH_ACTIVE:      '0',
  FLASH_CRASH_MULTIPLIER:  '0.5',
  FLASH_SALE_COIN:      '',
  FLASH_SALE_FACTOR:    '0.8',
  FLASH_SALE_UNTIL:     '',
  MARGIN_ENABLED:         '0',
  MARGIN_MULTIPLIER:      '2',
  SHORT_SELLING_ENABLED:  '0',
  SIM_PAUSED:             '0',
  HEADLINE_HISTORY:     '[]',
  ANNOUNCEMENT:         '',
  ANNOUNCEMENT_COLOR:   'blue',
  MARGIN_CALL_ENABLED:    '1',
  MARGIN_CALL_THRESHOLD:  '0.25',
  SCENARIO_ACTIVE:  '0',
  SCENARIO_DATE:    '',
  SCENARIO_LABEL:   '',
  BULL_RUN_SCHEDULED_AT:       '',
  BULL_RUN_SCHEDULED_MULT:     '2',
  FLASH_SALE_SCHEDULED_AT:     '',
  FLASH_SALE_SCHEDULED_COIN:   '',
  FLASH_SALE_SCHEDULED_FACTOR: '0.8',
  FLASH_SALE_SCHEDULED_MINS:   '30',
};

export async function getAllConfig() {
  const { data } = await db.from('config').select('key, value');
  const map = { ...CONFIG_DEFAULTS };
  (data || []).forEach(r => { map[r.key] = r.value; });
  return map;
}

export async function setConfig(key, value) {
  await db.from('config').upsert({ key, value: String(value), updated_at: new Date().toISOString() });
}

export async function setConfigs(updates) {
  const rows = Object.entries(updates).map(([key, value]) => ({
    key, value: String(value), updated_at: new Date().toISOString(),
  }));
  await db.from('config').upsert(rows);
}

export async function getMarketStatus(classId) {
  const cfg = await getAllConfig();
  const now = new Date();

  if (cfg.FLASH_SALE_COIN && cfg.FLASH_SALE_UNTIL && now > new Date(cfg.FLASH_SALE_UNTIL)) {
    await setConfigs({ FLASH_SALE_COIN: '', FLASH_SALE_FACTOR: '', FLASH_SALE_UNTIL: '' });
    cfg.FLASH_SALE_COIN = '';
  }
  if (cfg.MARKET_FREEZE === '1' && cfg.MARKET_FREEZE_UNTIL && now > new Date(cfg.MARKET_FREEZE_UNTIL)) {
    await setConfigs({ MARKET_FREEZE: '0', MARKET_FREEZE_UNTIL: '', MARKET_FREEZE_REASON: '' });
    cfg.MARKET_FREEZE = '0';
  }

  // Auto-activate scheduled bull run
  if (cfg.BULL_RUN_SCHEDULED_AT && now >= new Date(cfg.BULL_RUN_SCHEDULED_AT) && cfg.BULL_RUN_ACTIVE !== '1') {
    await setConfigs({ BULL_RUN_ACTIVE: '1', BULL_RUN_MULTIPLIER: cfg.BULL_RUN_SCHEDULED_MULT || '2', BULL_RUN_SCHEDULED_AT: '' });
    cfg.BULL_RUN_ACTIVE = '1';
    cfg.BULL_RUN_MULTIPLIER = cfg.BULL_RUN_SCHEDULED_MULT || '2';
    cfg.BULL_RUN_SCHEDULED_AT = '';
  }

  // Auto-activate scheduled flash sale
  if (cfg.FLASH_SALE_SCHEDULED_AT && now >= new Date(cfg.FLASH_SALE_SCHEDULED_AT) && !cfg.FLASH_SALE_COIN) {
    const until = new Date(now.getTime() + parseInt(cfg.FLASH_SALE_SCHEDULED_MINS || '30') * 60000).toISOString();
    await setConfigs({
      FLASH_SALE_COIN: cfg.FLASH_SALE_SCHEDULED_COIN,
      FLASH_SALE_FACTOR: cfg.FLASH_SALE_SCHEDULED_FACTOR || '0.8',
      FLASH_SALE_UNTIL: until,
      FLASH_SALE_SCHEDULED_AT: '',
      FLASH_SALE_SCHEDULED_COIN: '',
    });
    cfg.FLASH_SALE_COIN = cfg.FLASH_SALE_SCHEDULED_COIN;
    cfg.FLASH_SALE_SCHEDULED_AT = '';
  }

  // Get class-specific settings if classId provided
  let seedMoney = 10000;
  let feeRate   = 0.005;
  if (classId) {
    const { data: cls } = await db.from('classes').select('seed_money, trade_fee').eq('id', classId).single();
    if (cls) { seedMoney = parseFloat(cls.seed_money); feeRate = parseFloat(cls.trade_fee); }
  }
  if (cfg.TRADE_FEE_OVERRIDE) feeRate = parseFloat(cfg.TRADE_FEE_OVERRIDE);

  return {
    frozen:            cfg.MARKET_FREEZE === '1',
    freezeReason:      cfg.MARKET_FREEZE_REASON || 'Market temporarily closed',
    paused:            cfg.SIM_PAUSED === '1',
    tradingHoursOn:    cfg.TRADING_HOURS_ON === '1',
    tradingHoursStart: cfg.TRADING_HOURS_START,
    tradingHoursEnd:   cfg.TRADING_HOURS_END,
    dailyLimitOn:      cfg.DAILY_LIMIT_ON === '1',
    dailyLimitN:       parseInt(cfg.DAILY_LIMIT_N) || 3,
    feeRate,
    seedMoney,
    bullRun:           cfg.BULL_RUN_ACTIVE === '1',
    bullMult:          parseFloat(cfg.BULL_RUN_MULTIPLIER) || 2,
    flashCrash:        cfg.FLASH_CRASH_ACTIVE === '1',
    flashCrashMult:    parseFloat(cfg.FLASH_CRASH_MULTIPLIER) || 0.5,
    flashSale:         cfg.FLASH_SALE_COIN ? {
      coin:   cfg.FLASH_SALE_COIN,
      factor: parseFloat(cfg.FLASH_SALE_FACTOR) || 0.8,
      until:  cfg.FLASH_SALE_UNTIL,
    } : null,
    marginEnabled:     cfg.MARGIN_ENABLED === '1',
    marginMult:        parseInt(cfg.MARGIN_MULTIPLIER) || 2,
    shortEnabled:      cfg.SHORT_SELLING_ENABLED === '1',
    headlines:         JSON.parse(cfg.HEADLINE_HISTORY || '[]'),
    marginCallEnabled:   cfg.MARGIN_CALL_ENABLED !== '0',
    marginCallThreshold: parseFloat(cfg.MARGIN_CALL_THRESHOLD) || 0.25,
    scenarioActive:    cfg.SCENARIO_ACTIVE === '1',
    scenarioDate:      cfg.SCENARIO_DATE || null,
    scenarioLabel:     cfg.SCENARIO_LABEL || null,
    announcement:      cfg.ANNOUNCEMENT || '',
    announcementColor: cfg.ANNOUNCEMENT_COLOR || 'blue',
    bullRunScheduledAt:   cfg.BULL_RUN_SCHEDULED_AT || null,
    bullRunScheduledMult: parseInt(cfg.BULL_RUN_SCHEDULED_MULT) || 2,
    flashSaleScheduledAt:   cfg.FLASH_SALE_SCHEDULED_AT || null,
    flashSaleScheduledCoin: cfg.FLASH_SALE_SCHEDULED_COIN || null,
    flashSaleScheduledPct:  cfg.FLASH_SALE_SCHEDULED_FACTOR ? Math.round((1 - parseFloat(cfg.FLASH_SALE_SCHEDULED_FACTOR)) * 100) : 20,
    flashSaleScheduledMins: parseInt(cfg.FLASH_SALE_SCHEDULED_MINS) || 30,
  };
}
