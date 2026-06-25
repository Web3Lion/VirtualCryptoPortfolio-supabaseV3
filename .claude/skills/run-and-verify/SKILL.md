---
name: run-and-verify
description: Use this to actually run this app (CryptoClassroom, Next.js 14 App Router) and visually/functionally verify a change — start the dev server, drive a headless browser against it, and check for console/hydration errors and real layout (not just that `next build` succeeds). Use before claiming a UI fix is done, or when asked to "verify", "check it actually works", "run the app", or "make sure X renders/centers/looks right".
---

# Running and verifying this app

`next build` passing only proves the code compiles — it does NOT prove
a page renders correctly, hydrates without errors, or looks right.
This app has shipped bugs that `next build` was blind to (a dead
Tailwind setup with zero CSS effect, and a React hydration crash) —
both only surfaced once an actual browser rendered the page. Always
verify visually for any layout/centering/rendering claim.

## 1. Start the dev server

Use the Bash tool's `run_in_background: true` (not manual `nohup &`,
which the sandbox can leave orphaned with a stale `.next` cache —
see Gotcha below).

```
npm run dev          (with run_in_background: true)
```

Then poll until it's actually serving (don't fixed-`sleep`):

```bash
timeout 30 bash -c 'until curl -sf http://localhost:3000 >/dev/null; do sleep 1; done' && echo UP
```

To stop it later, use `TaskStop` with the returned task id — `pkill -f
"next dev"` alone is unreliable against tasks launched via
`run_in_background` and can leave the old process running while you
think it's dead.

## 2. Gotcha: never run `next build` while `next dev` is running

Both write to `.next/`. Running a production build while the dev
server is up corrupts its build manifest — the dev server starts
404-ing its own JS/CSS chunks (you'll see a blank/unstyled page with
no layout at all, easy to mistake for a real app bug). If you need
both, build first, fully stop it, `rm -rf .next`, then start dev — or
just don't run `next build` while iterating with `next dev`.

If pages suddenly look completely unstyled / flush-left with no
errors thrown, suspect this stale-cache collision before suspecting
your code. Fix: `TaskStop` whatever's running, `rm -rf .next`, restart
clean.

## 3. No Playwright/chromium-cli preinstalled — install on demand

This repo has no browser-automation tooling committed. Install it
into a scratch dir (NOT the project's `node_modules`/`package.json` —
keep it out of the repo unless the user asks to commit it as a real
dev dependency):

```bash
mkdir -p /tmp/verify-scratch && cd /tmp/verify-scratch
npm init -y >/dev/null 2>&1
npm install playwright --no-save
npx playwright install chromium --with-deps
```

This downloads ~300MB once; keep reusing the same scratch dir across
a session rather than reinstalling.

## 4. Drive it and check both rendering AND console errors

```js
// /tmp/verify-scratch/check.mjs
import { chromium } from '/tmp/verify-scratch/node_modules/playwright/index.mjs';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0, 200)); });
page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message.slice(0, 200)));
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto('http://localhost:3000/PATH', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
console.log(errors.length ? errors : 'clean');
await page.screenshot({ path: '/tmp/verify-scratch/shot.png' });
await browser.close();
```

Then `Read` the screenshot file — actually look at it, don't just
trust that the script ran. For layout claims (centered, aligned),
measure with `page.locator(sel).boundingBox()` and compare the gaps
numerically rather than eyeballing.

## 5. Auth limitation

Login is Google OAuth only (`lib/auth.js`) — there's no way to get a
headlessly-authenticated session in this environment. Most pages
either render their public/loading shell fine unauthenticated (enough
to catch hydration errors, dead CSS, layout bugs) or redirect to `/`.
If a page requires real student/teacher data to verify (e.g. a
specific ledger value), that part of the check can't be automated here
— say so explicitly rather than claiming full verification.

## 6. Sweep multiple pages at once

Once the harness is up, looping over several routes in one script
(reusing one browser, one new page per route) is cheap and catches
regressions on pages you didn't directly touch — do this whenever a
shared component (e.g. `components/Nav.jsx`) changes.
