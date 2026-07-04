# CryptoClassroom

A classroom crypto-trading simulator. Students get a seeded virtual portfolio
and trade real, live-priced coins against their classmates; teachers configure
the market, content, and rules from a dedicated dashboard. Built with Next.js
14 (App Router) and Supabase, deployed on Vercel.

## Features

**Student-facing**
- Portfolio dashboard (holdings, P/L, portfolio value chart, Time Travel history)
- Live market page (price table, sector heatmap, technical-indicator charts)
- Buy / sell / short, margin & leverage, limit & stop orders, DCA, options, staking
- Learn modules (video/article/quiz lessons — blockchain, DeFi, NFTs, technical
  analysis, security, taxes) with an AI Tutor
- Games: Bull vs Bear, Higher/Lower, Crypto Crush, Miner Runner, Spin
- Leaderboard, badges, rewards store, class news feed, social profile pages
- AI Portfolio Review & AI Trade Coach (Gemini-powered)

**Teacher-facing**
- Class & student roster management, invite links
- Market controls: freeze/pause, bull run & flash sale events, trading hours,
  daily trade limits, margin/leverage/short toggles
- Content authoring: lesson editor, quiz generator, gradebook, assignments
- "Satoshi Botomoto" auto-trading bot (per-class strategy config)
- Cockpit: live system health — price cache freshness, CoinGecko/FreeCryptoAPI
  usage this month, pending orders, market state
- Seed/export learn content to/from `content/learn/*.json`

## Tech stack

- **Next.js 14** (App Router) + React 18, plain CSS-in-JS (no Tailwind)
- **Supabase** (Postgres + `@supabase/supabase-js`) for all persistence
- **NextAuth** with Google OAuth for login
- **Vercel** for hosting (Hobby plan compatible — see note on cron below)
- **GitHub Actions** for the 30-minute price-refresh scheduler

## Required services

| Service | Used for | Required? |
|---|---|---|
| [Supabase](https://supabase.com) | Database (Postgres) for everything — students, portfolios, trades, content | **Required** |
| [Google Cloud Console](https://console.cloud.google.com) OAuth client | Login (NextAuth Google provider) | **Required** |
| [Vercel](https://vercel.com) | Hosting/deployment | **Required** |
| [CoinGecko](https://www.coingecko.com/en/api) (Demo/free API key) | Bulk market price data, refreshed every 30 min | **Required** |
| [FreeCryptoAPI](https://freecryptoapi.com) | Live per-coin price at the exact instant of a student trade (primary source; CoinGecko is the fallback) | **Required** |
| [Resend](https://resend.com) | Class invitation emails, watchlist price alerts | Optional — features degrade gracefully without it |
| [Google AI Studio](https://aistudio.google.com) (Gemini API key) | AI Tutor, AI Trade Coach, AI Portfolio Review, quiz generation | Optional — those specific features are disabled without it |
| GitHub Actions (this repo) | Runs the 30-min price refresh — see below, needed because Vercel's free plan only allows daily cron | **Required** unless you're on Vercel Pro+ |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/Web3Lion/VirtualCryptoPortfolio-supabaseV3.git
cd VirtualCryptoPortfolio-supabaseV3
npm install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run the entire contents of **`schema.sql`** once —
   it creates all ~39 tables and is idempotent (safe to re-run).
3. Create the `run_sql` RPC function — several admin/migration routes in this
   app use it to run ad-hoc `ALTER TABLE` statements from serverless
   functions (e.g. adding a column without a redeploy). Run this once too:
   ```sql
   CREATE OR REPLACE FUNCTION run_sql(query text)
   RETURNS void AS $$
   BEGIN
     EXECUTE query;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```
4. From Project Settings → API, grab the Project URL, anon/publishable key,
   and service role key for step 4.

### 3. Set up Google OAuth

1. In [Google Cloud Console](https://console.cloud.google.com), create an
   OAuth 2.0 Client ID (Web application).
2. Add your local (`http://localhost:3000/api/auth/callback/google`) and
   production (`https://your-domain/api/auth/callback/google`) redirect URIs.

### 4. Configure environment variables

Copy `.env.example` to `.env.local` and fill in real values:

```bash
cp .env.example .env.local
```

See the table above for what each service is for. `TEACHER_EMAIL` must
exactly match the Google account email of whoever should have teacher access
— this gates every `/teacher/*` route and API.

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000`.

### 6. Deploy to Vercel

1. Import the repo into Vercel.
2. Add every variable from `.env.local` to the project's Environment Variables
   (Production, and Preview if you test PRs).
3. Deploy. `vercel.json` already configures two daily cron jobs
   (`/api/cron/prices`, `/api/cron/snapshots`) — fine as-is on Hobby, but see
   the next step for real price freshness.

### 7. Set up the 30-minute price refresh (GitHub Actions)

Vercel's free (Hobby) plan only allows cron schedules once per day, so
`.github/workflows/price-refresh.yml` calls `/api/cron/prices` from GitHub's
scheduler every 30 minutes instead — free and independent of Vercel's plan
tier. To activate it, in this repo's **Settings → Secrets and variables →
Actions**:

- Add secret `CRON_SECRET` — must match the `CRON_SECRET` env var in Vercel.
- Add variable `APP_URL` — your production URL (e.g.
  `https://your-project.vercel.app`).

Then trigger it once manually from the **Actions** tab (workflow →
"Run workflow") to confirm it's wired up correctly, rather than waiting for
the schedule. If you're on Vercel Pro or higher, you can skip this and just
tighten the cron schedule in `vercel.json` instead.

## Scripts

```bash
npm run dev     # local dev server, localhost:3000
npm run build   # production build
npm run start   # run a production build locally
npm run lint    # next lint
```

## How prices stay fresh (and free)

- The dashboard/market page's bulk price data refreshes on a shared 30-minute
  staleness gate — whichever fires first in a given window (the GitHub Actions
  schedule, or a student trade needing a refresh) pays for one CoinGecko batch
  call covering every coin; everyone else in that window reads the
  now-fresh cache for free. This caps CoinGecko usage near a fixed monthly
  baseline regardless of trading volume.
- A student-initiated trade (buy/sell/short/sell-all) always prices at the
  exact instant of that trade — first via FreeCryptoAPI (a separate quota),
  falling back to the shared CoinGecko refresh above if that fails — so a
  trade can never be filled off a stale displayed price.
- Automated executions (the auto-trading bot, DCA, limit/stop orders, margin
  call liquidations) reuse whatever price the cron just fetched a moment
  earlier rather than re-fetching, since there's no fairness concern for the
  system's own actions.
- The teacher Cockpit page shows real (not estimated) CoinGecko and
  FreeCryptoAPI call counts for the current month.
