-- ============================================================
-- CryptoClass — Full Database Schema
-- Run this once in your Supabase SQL Editor to create all tables.
-- All statements use IF NOT EXISTS / IF NOT EXISTS so it's safe
-- to run multiple times (idempotent).
-- ============================================================

-- ── Core ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS students (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  email      text UNIQUE NOT NULL,
  is_bot     boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS classes (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  semester   text,
  seed_money numeric(20,2) DEFAULT 10000,
  trade_fee  numeric(5,4)  DEFAULT 0.005,
  is_active  boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_students (
  class_id   uuid REFERENCES classes(id)  ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  joined_at  timestamptz DEFAULT now(),
  PRIMARY KEY (class_id, student_id)
);

CREATE TABLE IF NOT EXISTS portfolios (
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id   uuid REFERENCES classes(id)  ON DELETE CASCADE,
  cash       numeric(20,8) DEFAULT 10000,
  fees_paid  numeric(20,8) DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (student_id, class_id)
);

CREATE TABLE IF NOT EXISTS holdings (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id      uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id        uuid REFERENCES classes(id)  ON DELETE CASCADE,
  coin            text NOT NULL,
  quantity        numeric(20,8) DEFAULT 0,
  avg_buy_price   numeric(20,8) DEFAULT 0,
  margin_borrowed numeric(20,8) DEFAULT 0,
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (student_id, class_id, coin)
);

CREATE TABLE IF NOT EXISTS trades (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id  uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id    uuid REFERENCES classes(id)  ON DELETE CASCADE,
  action      text NOT NULL,
  coin        text NOT NULL,
  quantity    numeric(20,8),
  price       numeric(20,8),
  gross_value numeric(20,8),
  fee         numeric(20,8),
  cash_after  numeric(20,8),
  reasoning   text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trades_student_class_idx ON trades(student_id, class_id);

CREATE TABLE IF NOT EXISTS snapshots (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id    uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id      uuid REFERENCES classes(id)  ON DELETE CASCADE,
  total_value   numeric(20,8),
  cash          numeric(20,8),
  snapshot_type text DEFAULT 'daily',
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS snapshots_student_class_idx ON snapshots(student_id, class_id, snapshot_type);

-- ── Market data ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_cache (
  symbol     text PRIMARY KEY,
  price      numeric(20,8),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS class_coins (
  id       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  symbol   text NOT NULL,
  gecko_id text,
  name     text,
  sector   text,
  active   boolean DEFAULT true,
  UNIQUE (class_id, symbol)
);

CREATE TABLE IF NOT EXISTS config (
  key        text PRIMARY KEY,
  value      text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id     uuid REFERENCES classes(id)  ON DELETE CASCADE,
  coin         text NOT NULL,
  target_price numeric(20,8),
  created_at   timestamptz DEFAULT now()
);

-- ── Invitations ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invitations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id    uuid REFERENCES classes(id) ON DELETE CASCADE,
  email       text NOT NULL,
  name        text,
  token       text UNIQUE,
  accepted    boolean DEFAULT false,
  accepted_at timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- ── Badges ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS badges (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id   uuid REFERENCES classes(id)  ON DELETE CASCADE,
  badge_id   text NOT NULL,
  earned_at  timestamptz DEFAULT now(),
  UNIQUE (student_id, class_id, badge_id)
);

-- ── News ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS news_articles (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text,
  url          text UNIQUE NOT NULL,
  source       text,
  summary      text,
  image_url    text,
  sentiment    text,
  published_at timestamptz,
  fetched_at   timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS news_published_idx ON news_articles(published_at DESC);

CREATE TABLE IF NOT EXISTS pushed_articles (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id  uuid,
  title       text,
  url         text,
  source      text,
  image_url   text,
  summary     text,
  pushed_by   text,
  is_manual   boolean DEFAULT false,
  pushed_at   timestamptz DEFAULT now()
);

-- ── ClassReward Tokens ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS class_reward_config (
  class_id                         uuid REFERENCES classes(id) ON DELETE CASCADE PRIMARY KEY,
  enabled                          boolean DEFAULT false,
  badge_reward_tokens              integer DEFAULT 50,
  lesson_reward_tokens             integer DEFAULT 25,
  -- Crypto Crush
  crush_enabled                    boolean DEFAULT true,
  crush_points_per_token           integer DEFAULT 100,
  crush_max_tokens_per_day         integer DEFAULT 50,
  -- Higher/Lower
  higher_lower_enabled             boolean DEFAULT true,
  higher_lower_tokens_per_correct  integer DEFAULT 10,
  -- Miner Runner
  miner_enabled                    boolean DEFAULT true,
  miner_points_per_token           integer DEFAULT 50,
  miner_max_tokens_per_day         integer DEFAULT 40,
  -- Daily Spin
  spin_enabled                     boolean DEFAULT true,
  -- Bull or Bear
  bull_bear_enabled                boolean DEFAULT true,
  bull_bear_tokens_per_correct     integer DEFAULT 5,
  bull_bear_max_tokens_per_day     integer DEFAULT 50,
  -- AI Trade Coach
  ai_coach_enabled                 boolean DEFAULT false,
  ai_coach_daily_quota             integer DEFAULT 5,
  ai_allow_student_key             boolean DEFAULT false,
  ai_student_key_limit             integer DEFAULT 0,
  -- Pinned feed post
  pinned_message                   text,
  pinned_updated_at                timestamptz,
  updated_at                       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_ai_settings (
  student_id    uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  gemini_api_key text,
  updated_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_streaks (
  student_id   uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  freeze_count integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS class_configs (
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  key      text NOT NULL,
  value    text,
  PRIMARY KEY (class_id, key)
);

CREATE TABLE IF NOT EXISTS class_reward_ledger (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id   uuid REFERENCES classes(id)  ON DELETE CASCADE,
  tokens     integer NOT NULL,
  reason     text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_student_class_idx ON class_reward_ledger(student_id, class_id);

-- ── Limit Orders ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pending_orders (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id           uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id             uuid REFERENCES classes(id)  ON DELETE CASCADE,
  coin                 text NOT NULL,
  action               text NOT NULL,
  amount               numeric(20,8) NOT NULL,
  amount_type          text NOT NULL DEFAULT 'Dollar Amount',
  limit_price          numeric(20,8) NOT NULL,
  leverage_multiplier  numeric(5,2)  NOT NULL DEFAULT 1,
  status               text NOT NULL DEFAULT 'pending',
  reasoning            text,
  created_at           timestamptz DEFAULT now(),
  executed_at          timestamptz,
  executed_price       numeric(20,8),
  fail_reason          text
);
CREATE INDEX IF NOT EXISTS pending_orders_student_idx ON pending_orders(student_id, status);
CREATE INDEX IF NOT EXISTS pending_orders_class_idx   ON pending_orders(class_id,   status);

-- ── Staking ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staking_positions (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id           uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id             uuid REFERENCES classes(id)  ON DELETE CASCADE,
  coin                 text NOT NULL,
  quantity             numeric(20,8) NOT NULL,
  apy                  numeric(8,6)  NOT NULL,
  lock_days            integer NOT NULL DEFAULT 0,
  staked_at            timestamptz DEFAULT now(),
  unlocks_at           timestamptz,
  status               text NOT NULL DEFAULT 'active',
  total_rewards_earned numeric(20,8) DEFAULT 0,
  claimable_rewards    numeric(20,8) DEFAULT 0,
  last_reward_at       timestamptz DEFAULT now(),
  created_at           timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staking_student_class_idx ON staking_positions(student_id, class_id, status);
CREATE INDEX IF NOT EXISTS staking_class_active_idx  ON staking_positions(class_id, status);

CREATE TABLE IF NOT EXISTS staking_config (
  class_id   uuid REFERENCES classes(id) ON DELETE CASCADE PRIMARY KEY,
  enabled    boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dca_orders (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id     uuid NOT NULL,
  coin         text NOT NULL,
  amount_usd   numeric(20,2) NOT NULL,
  frequency    text NOT NULL CHECK (frequency IN ('daily','weekly')),
  next_run_at  timestamptz NOT NULL,
  last_run_at  timestamptz,
  runs_count   integer NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dca_orders_next_run ON dca_orders(next_run_at) WHERE active = true;

CREATE TABLE IF NOT EXISTS options_positions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id      uuid NOT NULL,
  coin          text NOT NULL,
  option_type   text NOT NULL CHECK (option_type IN ('call','put')),
  strike_price  numeric(20,4) NOT NULL,
  contracts     numeric(20,6) NOT NULL,
  premium_paid  numeric(20,2) NOT NULL,
  expires_at    timestamptz NOT NULL,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','exercised','expired','closed')),
  payout        numeric(20,2),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS options_open ON options_positions(expires_at) WHERE status = 'open';

-- ── Learning ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS learn_modules (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id     uuid REFERENCES classes(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  emoji        text DEFAULT '📚',
  order_index  integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learn_lessons (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id         uuid NOT NULL REFERENCES learn_modules(id) ON DELETE CASCADE,
  title             text NOT NULL,
  description       text,
  order_index       integer DEFAULT 0,
  tokens_reward     integer DEFAULT 25,
  pass_threshold    integer DEFAULT 75,
  questions_to_show integer DEFAULT 4,
  is_published      boolean DEFAULT true,
  created_at        timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS learn_blocks (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id   uuid NOT NULL,
  block_type  text NOT NULL,
  content     jsonb NOT NULL DEFAULT '{}',
  order_index integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS learn_questions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id     uuid NOT NULL,
  question_text text NOT NULL,
  explanation   text,
  order_index   integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS learn_options (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid NOT NULL,
  option_text text NOT NULL,
  is_correct  boolean DEFAULT false,
  order_index integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS learn_attempts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id   uuid NOT NULL,
  class_id     uuid NOT NULL,
  lesson_id    uuid NOT NULL,
  score        integer,
  passed       boolean,
  answers      jsonb,
  completed_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS learn_attempts_student_idx ON learn_attempts(student_id, class_id);

CREATE TABLE IF NOT EXISTS assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL,
  title       text NOT NULL,
  description text,
  due_at      timestamptz,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assignments_class ON assignments(class_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS assignment_completions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id  uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id       uuid NOT NULL,
  completed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS trade_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id    uuid NOT NULL,
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  emoji       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trade_id, student_id)
);
CREATE INDEX IF NOT EXISTS trade_reactions_trade ON trade_reactions(trade_id);

CREATE TABLE IF NOT EXISTS tournaments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      uuid NOT NULL,
  name          text NOT NULL,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  prize_tokens  integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','active','ended')),
  winner_id     uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tournaments_class ON tournaments(class_id, status);

CREATE TABLE IF NOT EXISTS tournament_snapshots (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id  uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id       uuid NOT NULL,
  start_value    numeric(20,2),
  end_value      numeric(20,2),
  return_pct     numeric(10,4),
  rank           integer,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Weekly Challenges ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weekly_challenges (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id       uuid REFERENCES classes(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  challenge_type text NOT NULL,
  target_value   numeric DEFAULT 1,
  tokens_reward  integer DEFAULT 100,
  starts_at      timestamptz NOT NULL,
  ends_at        timestamptz NOT NULL,
  active         boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS weekly_challenges_class ON weekly_challenges(class_id, active);

CREATE TABLE IF NOT EXISTS weekly_challenge_completions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id uuid REFERENCES weekly_challenges(id) ON DELETE CASCADE,
  student_id   uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id     uuid NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE (challenge_id, student_id)
);

-- ── Higher / Lower Predictions (price direction game) ─────────

CREATE TABLE IF NOT EXISTS higher_lower_predictions (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id           uuid REFERENCES students(id) ON DELETE CASCADE,
  class_id             uuid REFERENCES classes(id)  ON DELETE CASCADE,
  coin_id              text NOT NULL,
  direction            text NOT NULL CHECK (direction IN ('higher', 'lower')),
  price_at_prediction  numeric(20,8) NOT NULL,
  predicted_at         timestamptz DEFAULT now(),
  resolved_at          timestamptz,
  resolution_price     numeric(20,8),
  correct              boolean,
  tokens_awarded       integer DEFAULT 0
);
CREATE INDEX IF NOT EXISTS hl_pred_student_class_idx
  ON higher_lower_predictions(student_id, class_id, predicted_at DESC);
