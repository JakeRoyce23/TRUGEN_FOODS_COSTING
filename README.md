# TRUGEN FOODS — Mobile Costing Calculator

Phase 4 is complete: Supabase email/password authentication and recovery, protected routes, owner-private saved costings, search/view/edit/confirmed delete, and the approved database migration are implemented. Both accounts passed live Auth/logout; real OWNER browser CRUD/refresh and two-account UI/API isolation passed; anonymous/direct writes were denied; all temporary records were removed. The approved decimal calculator and mobile interface are preserved. Physical-phone/three-recipe release acceptance, public deployment and a separately approved Phase 5 remain outstanding.

## Requirements

- Node.js 22 or newer, compatible with the installed Vite and Supabase SDK versions
- npm
- A configured Supabase project and a privately provisioned owner account

## Local development

The supplied project URL and public key are configured locally; the verified URL ends in `.supabase.co`. The migration is deployed, public signup is disabled and Phase 4 live acceptance is recorded in [PHASE4_LIVE_ACCEPTANCE.md](docs/PHASE4_LIVE_ACCEPTANCE.md). [SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) retains fresh-project setup instructions; do not reapply the initial migration to this project.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite and sign in with the owner account created through the Supabase Dashboard. Login uses real Supabase Auth; there is no preview bypass or public signup. Never put account passwords or privileged keys in frontend environment variables.

The local app uses `http://127.0.0.1:5174` with strict port selection to match the approved recovery redirect. Use **Forgot password?** on Login to request a reset email; `/reset-password` validates recovery links and accepts the new password. The owner reports successful live recovery/login for both test accounts. See [PASSWORD_RECOVERY.md](docs/PASSWORD_RECOVERY.md) for the implementation and repeatable private reset procedure.

## Verification

### Phase 6C PWA support

Production builds register `/sw.js` after the existing password-recovery preparation and React startup. Normal `npm run dev` does not register a worker. The versioned `trugen-foods-public-v1` cache contains only `/offline.html` and the three icons listed in `public/sw.js`. App navigation is network-only with an offline-page fallback on network failure; the app HTML, JavaScript, Supabase responses, records, settings and recovery callback URLs are never added to the worker cache. Existing Supabase session persistence is unchanged.

Login and saved-record operations still require internet. Offline fallback requires an earlier successful worker installation and a subsequent controlled navigation; a first-ever offline visit cannot install it. A page already open is not replaced when connectivity changes. Reconnect and refresh to load the online application. Refresh still discards unsaved forms.

Updates use the normal waiting lifecycle: finish/save your work, then close all TRUGEN app windows and browser tabs before reopening. There is no forced activation or automatic reload. Only obsolete `trugen-foods-public-v<number>` caches are deleted. Increment the cache version in `public/sw.js` whenever its offline page or cached icons change. Changes to the online application itself are fetched from the network, not an application-shell cache.

`public/_headers` sets revalidation for the worker and manifest when uploaded to Cloudflare Pages; it does not change routing. Continue building and uploading `dist` through the existing Direct Upload workflow. No deployment was performed for Phase 6C.

After building, run the focused production-artifact smoke test with `npm.cmd run test:e2e -- --config=playwright.pwa.config.ts`. It serves existing `dist` locally on port 5179 and blocks live external traffic. It verifies cache contents, offline/reconnect behavior and natural worker updates with an in-memory test revision. It does not apply Cloudflare headers or verify real Android installation. Avoid reusing this test port for normal development; production-preview workers remain scoped to their own origin.

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

Project requirements and progress are in `docs/PROJECT_PLAN.md` and `docs/BUILD_PROGRESS.md`.

Browser tests use installed Google Chrome at 320×740, 390×844, 768×1024, and 1440×1000. Playwright starts its own isolated Vite server on port 5178 with a fake Supabase configuration and mocked HTTP responses. Unit/component tests explicitly ignore `.env.local`; SQL tests execute the actual migration in an isolated PGlite PostgreSQL instance. These checks do not verify hosted Auth or database behavior. The opt-in live verification script and private test-account instructions are in the setup guide.

Phone/tablet profiles emulate touch; physical phone keyboards and Safari still require device testing. In Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`. Use `npm.cmd run test:e2e -- --workers=2` to limit browser concurrency.

## Try the calculator

After signing in, open `/new`, enter a food name and 10 servings. Add an ingredient named Carrots, purchased quantity 1 kg, purchase price ₱1,300.00, and used quantity 0.5 kg. Leave markup at its approved 35% default, then select upward rounding to ₱10.

Expected: ₱650.00 Puhunan, ₱227.50 calculated Tubo, ₱877.50 exact price, ₱65.00 cost/serving, ₱87.75 exact price/serving, ₱880.00 rounded price, ₱88.00 rounded price/serving, and ₱230.00 actual Tubo at the rounded price. Changing any input recalculates immediately; no submission is needed.

The calculator uses [decimal.js](https://mikemcl.github.io/decimal.js/) with decimal-string inputs/results and explicit half-up centavo rounding. Each line is rounded before summing; markup profit is rounded before adding to Puhunan. Optional ₱5/₱10 round-up never replaces the exact total. Quantities (including fractional pcs) allow 6 decimals; price/markup allow 2. Input precision errors are reported rather than silently rounded.

Only compatible kg/g, L/mL, or pcs/pcs units can be combined. Usage cannot exceed purchase. Zero prices and zero markup are valid; quantities and whole-number servings must be positive. Partial estimates clearly identify excluded invalid/incomplete ingredient rows. Per-serving amounts are rounded independently for display, so multiplying them by servings may differ from the total.

Use **View results** and **Back to ingredients** to jump through the form. **Review costing** shows outstanding issues and focuses the first invalid field. Results remain labeled estimates until all required details are valid. Removing a filled ingredient or resetting entered data asks for confirmation; empty rows remove immediately, and at least one ingredient card remains.

Save is enabled for a complete valid costing and reports success only after database confirmation. The migration recomputes approved financial values, writes parent/ingredients atomically, enforces ownership, and detects duplicate retries and stale edits. Financial values remain decimal strings at the API boundary. History uses real account records, literal name search, Philippine dates, and newest-first pagination.

Unsaved drafts normally clear on navigation or refresh. A failed in-flight save can be recovered from tab memory after the same owner signs back in; explicit logout clears this recovery. Settings preview changes remain nonpersistent and do not change calculator defaults.

## Project structure

```text
src/app/                 Routes and Home/Login/Settings pages
src/components/          Reusable UI and responsive layout
src/features/auth/       Session provider, protected routes, logout
src/features/costing/    Calculator, repository, saved detail/edit, retry recovery
src/features/history/    Real saved-record cards and history
src/lib/                 Supabase client, money and resource helpers
src/test/                Component support and PostgreSQL/security tests
tests/e2e/               Mocked SDK/browser workflows
supabase/migrations/     Reviewed versioned SQL migration
scripts/                 Optional live verification script
docs/                    Approved plan, setup, progress, QA screenshots
```

Phase 4 adds `@supabase/supabase-js` 2.119.0 and development-only `@electric-sql/pglite` 0.5.15. See [BUILD_PROGRESS.md](docs/BUILD_PROGRESS.md) for final live/regression results, the REST conflict-latency observation and the bundle-size warning.
