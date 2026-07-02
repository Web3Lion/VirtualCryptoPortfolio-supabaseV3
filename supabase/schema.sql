-- ============================================================
-- CryptoClassroom — Full Schema
-- Paste entire file into Supabase SQL Editor and Run
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS
-- ============================================================

-- ── Classes ──────────────────────────────────────────────────
create table if not exists classes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  semester      text not null default '',
  teacher_email text not null,
  seed_money    numeric(14,4) not null default 10000,
  trade_fee     numeric(8,6) not null default 0.005,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- ── Students ─────────────────────────────────────────────────
create table if not exists students (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null unique,
  is_bot     boolean default false,
  created_at timestamptz default now()
);

-- ── Class Students (many-to-many) ────────────────────────────
create table if not exists class_students (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  joined_at  timestamptz default now(),
  unique(class_id, student_id)
);

-- ── Invitations ──────────────────────────────────────────────
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
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references classes(id) on delete cascade,
  symbol     text not null,
  gecko_id   text not null,
  name       text not null,
  sector     text not null default 'Other',
  active     boolean default true,
  created_at timestamptz default now(),
  unique(class_id, symbol)
);

-- ── Config (global settings + market controls) ───────────────
create table if not exists config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz default now()
);

-- ── Portfolios ────────────────────────────────────────────────
create table if not exists portfolios (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  cash       numeric(14,4) not null default 10000,
  fees_paid  numeric(14,4) not null default 0,
  updated_at timestamptz default now(),
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

-- ── Trades ───────────────────────────────────────────────────
-- action: BUY | SELL | SHORT (open short) | COVER (close short)
create table if not exists trades (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  class_id    uuid not null references classes(id) on delete cascade,
  action      text not null check (action in ('BUY','SELL','SHORT','COVER')),
  coin        text not null,
  quantity    numeric(20,8) not null,
  price       numeric(20,8) not null,
  gross_value numeric(14,4) not null,
  fee         numeric(14,4) not null,
  cash_after  numeric(14,4) not null,
  reasoning   text default '',
  created_at  timestamptz default now()
);

-- ── Snapshots (for charts) ────────────────────────────────────
create table if not exists snapshots (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references students(id) on delete cascade,
  class_id      uuid not null references classes(id) on delete cascade,
  total_value   numeric(14,4) not null,
  cash          numeric(14,4) not null,
  snapshot_type text default 'intraday',
  created_at    timestamptz default now()
);

-- ── Price Cache (updated by cron) ─────────────────────────────
create table if not exists price_cache (
  symbol     text primary key,
  price      numeric(20,8) not null,
  change_1h  numeric(10,4),
  change_24h numeric(10,4),
  change_7d  numeric(10,4),
  updated_at timestamptz default now()
);

-- ── Badges ───────────────────────────────────────────────────
create table if not exists badges (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  badge_id   text not null,
  earned_at  timestamptz default now(),
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

-- ── Pending / Limit Orders ────────────────────────────────────
create table if not exists pending_orders (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references students(id) on delete cascade,
  class_id            uuid not null references classes(id) on delete cascade,
  coin                text not null,
  action              text not null check (action in ('BUY','SELL','SHORT')),
  amount              numeric(20,8) not null,
  amount_type         text not null default 'Dollar Amount',
  limit_price         numeric(20,8) not null,
  leverage_multiplier numeric(5,2) not null default 1,
  status              text not null default 'pending' check (status in ('pending','executed','cancelled','failed')),
  reasoning           text,
  created_at          timestamptz default now(),
  executed_at         timestamptz,
  executed_price      numeric(20,8),
  fail_reason         text
);

-- ── ClassReward Config (per class, teacher-controlled) ────────
create table if not exists class_reward_config (
  class_id                         uuid primary key references classes(id) on delete cascade,
  enabled                          boolean not null default false,
  badge_reward_tokens              integer not null default 50,
  lesson_reward_tokens             integer not null default 25,
  -- Crypto Crush
  crush_enabled                    boolean default true,
  crush_points_per_token           integer not null default 100,
  crush_max_tokens_per_day         integer not null default 50,
  -- Higher/Lower
  higher_lower_enabled             boolean default true,
  higher_lower_tokens_per_correct  integer not null default 10,
  -- Miner Runner
  miner_enabled                    boolean default true,
  miner_points_per_token           integer default 50,
  miner_max_tokens_per_day         integer default 40,
  -- Daily Spin
  spin_enabled                     boolean default true,
  -- Bull or Bear
  bull_bear_enabled                boolean default true,
  bull_bear_tokens_per_correct     integer default 5,
  bull_bear_max_tokens_per_day     integer default 50,
  -- AI Trade Coach
  ai_coach_enabled                 boolean default false,
  ai_coach_daily_quota             integer default 5,
  ai_allow_student_key             boolean default false,
  ai_student_key_limit             integer default 0,
  -- Pinned feed post
  pinned_message                   text,
  pinned_updated_at                timestamptz,
  updated_at                       timestamptz default now()
);

-- ── Student AI Settings ───────────────────────────────────────
create table if not exists student_ai_settings (
  student_id     uuid primary key references students(id) on delete cascade,
  gemini_api_key text,
  updated_at     timestamptz default now()
);

-- ── ClassReward Ledger (immutable transaction log) ────────────
-- tokens > 0 = credit (badge/lesson earned, teacher grant)
-- tokens < 0 = debit  (redemption for cash)
create table if not exists class_reward_ledger (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  tokens     integer not null,
  reason     text not null,   -- e.g. "badge:first_trade" | "lesson:<uuid>" | "redeem"
  created_at timestamptz default now()
);

-- ── News Articles (populated by cron from RSS feeds) ──────────
create table if not exists news_articles (
  id           uuid primary key default gen_random_uuid(),
  source       text not null,
  title        text not null,
  url          text not null unique,
  image_url    text default '',
  summary      text default '',
  published_at timestamptz,
  fetched_at   timestamptz default now()
);

-- ── Pushed Articles (teacher-curated feed for students) ───────
create table if not exists pushed_articles (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid references news_articles(id) on delete set null,
  title      text not null,
  url        text not null unique,
  source     text not null,
  image_url  text default '',
  summary    text default '',
  pushed_by  text not null,
  is_manual  boolean default false,
  pushed_at  timestamptz default now()
);

-- ── Learn: Modules ────────────────────────────────────────────
-- class_id null = shared across all classes
create table if not exists learn_modules (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references classes(id) on delete cascade,
  title       text not null,
  description text,
  emoji       text default '📚',
  order_index integer default 0,
  is_published boolean default true,
  created_at  timestamptz default now()
);

-- ── Learn: Lessons ────────────────────────────────────────────
create table if not exists learn_lessons (
  id                uuid primary key default gen_random_uuid(),
  module_id         uuid not null references learn_modules(id) on delete cascade,
  title             text not null,
  description       text,
  order_index       integer default 0,
  tokens_reward     integer default 25,
  pass_threshold    integer default 75,
  questions_to_show integer default 4,
  is_published      boolean default true,
  created_at        timestamptz default now()
);

-- ── Learn: Content Blocks ─────────────────────────────────────
-- block_type: heading | subheading | text | video | article | divider | comparison
create table if not exists learn_blocks (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null,
  block_type text not null,
  content    jsonb not null default '{}',
  order_index integer default 0
);

-- ── Learn: Quiz Questions ─────────────────────────────────────
create table if not exists learn_questions (
  id            uuid primary key default gen_random_uuid(),
  lesson_id     uuid not null,
  question_text text not null,
  explanation   text,
  order_index   integer default 0
);

-- ── Learn: Answer Options ─────────────────────────────────────
create table if not exists learn_options (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null,
  option_text text not null,
  is_correct  boolean default false,
  order_index integer default 0
);

-- ── Learn: Student Quiz Attempts ──────────────────────────────
create table if not exists learn_attempts (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null,
  class_id     uuid not null,
  lesson_id    uuid not null,
  score        integer,
  passed       boolean,
  answers      jsonb,
  completed_at timestamptz default now()
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

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_class_students_class      on class_students(class_id);
create index if not exists idx_class_students_student    on class_students(student_id);
create index if not exists idx_class_coins_class         on class_coins(class_id);
create index if not exists idx_holdings_student_class    on holdings(student_id, class_id);
create index if not exists idx_trades_student_class      on trades(student_id, class_id);
create index if not exists idx_trades_created            on trades(created_at);
create index if not exists idx_snapshots_student_class   on snapshots(student_id, class_id);
create index if not exists idx_invitations_token         on invitations(token);
create index if not exists idx_invitations_email         on invitations(email);
create index if not exists idx_reward_ledger_student_class on class_reward_ledger(student_id, class_id);
create index if not exists idx_pending_orders_student    on pending_orders(student_id, status);
create index if not exists idx_pending_orders_class      on pending_orders(class_id, status);
create index if not exists idx_news_articles_published   on news_articles(published_at desc);
create index if not exists idx_pushed_articles_pushed    on pushed_articles(pushed_at desc);
create index if not exists idx_learn_modules_class       on learn_modules(class_id);
create index if not exists idx_learn_lessons_module      on learn_lessons(module_id);
create index if not exists idx_learn_attempts_student    on learn_attempts(student_id, class_id);

-- ============================================================
-- ALTER TABLE migrations — safe to run on existing deployments
-- ============================================================

-- Add lesson_reward_tokens to class_reward_config if missing
alter table class_reward_config
  add column if not exists lesson_reward_tokens integer not null default 25;

-- Add Crypto Crush columns if missing (older deployments)
alter table class_reward_config
  add column if not exists crush_points_per_token integer not null default 100;
alter table class_reward_config
  add column if not exists crush_max_tokens_per_day integer not null default 50;

-- Add Higher / Lower columns if missing
alter table class_reward_config
  add column if not exists higher_lower_tokens_per_correct integer not null default 10;

-- ── Higher / Lower Predictions ────────────────────────────────
create table if not exists higher_lower_predictions (
  id                  uuid primary key default gen_random_uuid(),
  student_id          uuid not null references students(id) on delete cascade,
  class_id            uuid not null references classes(id)  on delete cascade,
  coin_id             text not null,
  direction           text not null check (direction in ('higher', 'lower')),
  price_at_prediction numeric(20,8) not null,
  predicted_at        timestamptz not null default now(),
  resolved_at         timestamptz,
  resolution_price    numeric(20,8),
  correct             boolean,
  tokens_awarded      integer not null default 0
);
create index if not exists hl_pred_student_class_idx
  on higher_lower_predictions(student_id, class_id, predicted_at desc);

-- Add margin_borrowed to holdings if missing (older deployments)
alter table holdings
  add column if not exists margin_borrowed numeric(20,8) not null default 0;

-- Widen trades action constraint to include SHORT and COVER
-- (Postgres requires dropping and re-adding the constraint)
alter table trades drop constraint if exists trades_action_check;
alter table trades add constraint trades_action_check
  check (action in ('BUY','SELL','SHORT','COVER'));
