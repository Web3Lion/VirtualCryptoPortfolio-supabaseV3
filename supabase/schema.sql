-- ============================================================
-- CryptoClassroom Schema v2 — with Classes + Invitations
-- Paste entire file into Supabase SQL Editor and Run
-- ============================================================

-- ── Classes ──────────────────────────────────────────────────
create table if not exists classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  semester    text not null default '',
  teacher_email text not null,
  seed_money  numeric(14,4) not null default 10000,
  trade_fee   numeric(8,6) not null default 0.005,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ── Students ─────────────────────────────────────────────────
create table if not exists students (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null unique,
  is_bot      boolean default false,
  created_at  timestamptz default now()
);

-- ── Class Students (many-to-many) ────────────────────────────
create table if not exists class_students (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  joined_at   timestamptz default now(),
  unique(class_id, student_id)
);

-- ── Invitations ───────────────────────────────────────────────
create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete cascade,
  email       text not null,
  name        text not null,
  token       text not null unique default gen_random_uuid()::text,
  accepted    boolean default false,
  accepted_at timestamptz,
  created_at  timestamptz default now()
);

-- ── Class Coins ───────────────────────────────────────────────
create table if not exists class_coins (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references classes(id) on delete cascade,
  symbol      text not null,
  gecko_id    text not null,
  name        text not null,
  sector      text not null default 'Other',
  active      boolean default true,
  created_at  timestamptz default now(),
  unique(class_id, symbol)
);

-- ── Config (global settings + market controls) ───────────────
create table if not exists config (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz default now()
);

-- ── Portfolios ────────────────────────────────────────────────
create table if not exists portfolios (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  cash        numeric(14,4) not null default 10000,
  fees_paid   numeric(14,4) not null default 0,
  updated_at  timestamptz default now(),
  unique(student_id, class_id)
);

-- ── Holdings ─────────────────────────────────────────────────
create table if not exists holdings (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references students(id) on delete cascade,
  class_id        uuid not null references classes(id) on delete cascade,
  coin            text not null,
  quantity        numeric(20,8) not null default 0,
  avg_buy_price   numeric(20,8) not null default 0,
  margin_borrowed numeric(20,8) not null default 0,
  updated_at      timestamptz default now(),
  unique(student_id, class_id, coin)
);

-- Migration for existing deployments:
-- alter table holdings add column if not exists margin_borrowed numeric(20,8) not null default 0;

-- ── Trades ───────────────────────────────────────────────────
create table if not exists trades (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  action      text not null check (action in ('BUY','SELL')),
  coin        text not null,
  quantity    numeric(20,8) not null,
  price       numeric(20,8) not null,
  gross_value numeric(14,4) not null,
  fee         numeric(14,4) not null,
  cash_after  numeric(14,4) not null,
  reasoning   text default '',
  created_at  timestamptz default now()
);

-- ── Snapshots (for charts) ───────────────────────────────────
create table if not exists snapshots (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references students(id) on delete cascade,
  class_id      uuid not null references classes(id) on delete cascade,
  total_value   numeric(14,4) not null,
  cash          numeric(14,4) not null,
  snapshot_type text default 'intraday',
  created_at    timestamptz default now()
);

-- ── Price Cache (updated every 30 min by cron) ───────────────
create table if not exists price_cache (
  symbol      text primary key,
  price       numeric(20,8) not null,
  change_1h   numeric(10,4),
  change_24h  numeric(10,4),
  change_7d   numeric(10,4),
  updated_at  timestamptz default now()
);

-- ── Badges ───────────────────────────────────────────────────
create table if not exists badges (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  badge_id    text not null,
  earned_at   timestamptz default now(),
  unique(student_id, class_id, badge_id)
);

-- ── Watchlist ─────────────────────────────────────────────────
create table if not exists watchlist (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references students(id) on delete cascade,
  class_id     uuid not null references classes(id) on delete cascade,
  coin         text not null,
  direction    text not null check (direction in ('above','below')),
  target_price numeric(20,8) not null,
  triggered    boolean default false,
  email_alert  boolean default false,
  created_at   timestamptz default now()
);

-- ── Seed default config ───────────────────────────────────────
insert into config (key, value) values
  ('MARKET_FREEZE',        '0'),
  ('MARKET_FREEZE_REASON', ''),
  ('MARKET_FREEZE_UNTIL',  ''),
  ('TRADING_HOURS_ON',     '0'),
  ('TRADING_HOURS_START',  '09:00'),
  ('TRADING_HOURS_END',    '15:00'),
  ('DAILY_LIMIT_ON',       '0'),
  ('DAILY_LIMIT_N',        '3'),
  ('TRADE_FEE_OVERRIDE',   ''),
  ('BULL_RUN_ACTIVE',      '0'),
  ('BULL_RUN_MULTIPLIER',  '2'),
  ('FLASH_SALE_COIN',      ''),
  ('FLASH_SALE_FACTOR',    '0.8'),
  ('FLASH_SALE_UNTIL',     ''),
  ('MARGIN_ENABLED',       '0'),
  ('MARGIN_MULTIPLIER',    '2'),
  ('SIM_PAUSED',           '0'),
  ('HEADLINE_HISTORY',     '[]')
on conflict (key) do nothing;

-- ── ClassReward config (per class, teacher-controlled) ────────
create table if not exists class_reward_config (
  class_id            uuid primary key references classes(id) on delete cascade,
  enabled             boolean not null default false,
  badge_reward_tokens integer not null default 50,
  updated_at          timestamptz default now()
);

-- ── ClassReward ledger (immutable transaction log) ────────────
-- tokens > 0 = credit (badge earned, teacher grant)
-- tokens < 0 = debit  (redemption for cash)
create table if not exists class_reward_ledger (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  tokens      integer not null,
  reason      text not null,
  created_at  timestamptz default now()
);

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_class_students_class    on class_students(class_id);
create index if not exists idx_class_students_student  on class_students(student_id);
create index if not exists idx_class_coins_class       on class_coins(class_id);
create index if not exists idx_holdings_student_class  on holdings(student_id, class_id);
create index if not exists idx_trades_student_class    on trades(student_id, class_id);
create index if not exists idx_trades_created          on trades(created_at);
create index if not exists idx_snapshots_student_class on snapshots(student_id, class_id);
create index if not exists idx_invitations_token       on invitations(token);
create index if not exists idx_invitations_email       on invitations(email);
create index if not exists idx_reward_ledger_student_class on class_reward_ledger(student_id, class_id);
