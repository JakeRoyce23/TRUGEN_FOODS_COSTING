# TRUGEN FOODS — Build progress

Last updated: 09 November 2026.

**Current state:** **Phase 6C is complete locally.** Production-only service-worker registration, restricted public-asset caching, an offline page and natural waiting updates are implemented and locally verified. Phase 5B remains complete and deployed as recorded below. The owner reports the existing application is deployed on Cloudflare and accepted on desktop/Android; this Phase 6C change has not been deployed. Phase 6D/6E verification/deployment and real-device PWA acceptance remain unperformed and require approval.

Authority: [PROJECT_PLAN.md](PROJECT_PLAN.md) and the preserved [official Word plan](TRUGEN_FOODS_Codex_Development_Plan.docx). Issue IDs below refer to the PROJECT_PLAN decision register.

**Password recovery update:** The owner's authorized Phase 4 recovery UI is implemented and verified. `/forgot-password` and `/reset-password` support the configured app at `http://127.0.0.1:5174`; hosted Site URL/redirect values were checked read-only. The owner reports that recovery and subsequent login succeeded for both accounts. Agent-run checks did not resend email or change passwords: 11 callback/unit tests, 16 four-viewport mocked browser tests and a non-mutating live-configured route check passed. The hosted email template itself remains owner-verified rather than CLI-visible. See [PASSWORD_RECOVERY.md](PASSWORD_RECOVERY.md).

**Deployment update (05 November 2026):** After the successful dry run and explicit approval, the exact project reference, single migration and reviewed hash were checked again. CLI push succeeded with only the approved migration, no seeds/custom roles, and Vault updates disabled. Local/remote history matches. Current Auth settings confirm public signup and anonymous login disabled, email login enabled. See [PHASE4_MIGRATION_DEPLOYMENT.md](PHASE4_MIGRATION_DEPLOYMENT.md) for evidence and [PHASE4_LIVE_ACCEPTANCE.md](PHASE4_LIVE_ACCEPTANCE.md) for the remaining owner walkthrough.

## Phase tracker

| Phase | Status | Completed | Pending / exit condition |
| --- | --- | --- | --- |
| Preparation | Complete | Source read/extracted; PROJECT_PLAN, AGENTS, BUILD_PROGRESS; architecture, folder proposal, scope/calculation review. | Owner subsequently authorized Phases 1–4. |
| 0 — Setup | Complete | React/TypeScript/Vite scaffold; Tailwind and shadcn-style primitives; router, lint, Vitest and Playwright setup; README and environment placeholder. | Passed lint, unit tests, browser tests, TypeScript production build, and local start. |
| 1 — UI | Complete | Responsive Login, Home, New Costing/summary, History and Settings; mobile/desktop navigation; mock/placeholder labeling; dynamic ingredient cards; search and basic feedback. | Verified at 390px and 1440px in Chrome; navigation and core interactions pass Playwright tests. |
| 2 — Calculator | Complete | Decimal-safe pure calculator, dynamic ingredients, kg/g and L/mL conversions, fractional pcs, live totals, markup, exact/rounded prices and profit, per-serving values, field feedback, tests. | 68 unit/component tests and 12 mobile/desktop browser tests passed; lint and TypeScript/production build passed. |
| 3 — Results / form quality | Complete | Prominent exact/rounded prices, selected markup, incomplete status, corrective feedback, focus navigation, removal/reset confirmations, four-viewport regression tests. | 77 unit/component and 40 browser tests passed; final scroll adjustment passed 4 targeted browser tests; lint and TypeScript/build passed. Owner acceptance on real recipes remains pending. |
| 4 — Data/auth and authorized history CRUD | **Complete** | Approved migration/schema/security; both-account Auth/logout; committed owner CRUD/refresh; two-account UI/API isolation; anonymous/direct-write denial; financial agreement; password recovery; zero-residue cleanup; full regression. | Physical-phone and three-real-recipe checks remain before release. Persistent settings remain deferred. |
| 5 — Subsequent approved work | Complete through Phase 5B | Persistent owner settings and prompt stale-conflict handling are deployed and accepted. | Phase 5C has not started. |
| 6 — PWA and release readiness | Phase 6C complete locally | Manifest/icons, offline fallback, public-only cache and naturally waiting updates verified in local Chrome. | Phase 6D/6E require separate approval; Phase 6C not deployed and real Android PWA behavior not tested. |

## Feature tracker

| ID | Feature | Implementation status |
| --- | --- | --- |
| F01 | Owner sign-in/sign-out | Complete: both accounts passed real password login/local logout; OWNER and OTHER passed browser login/logout and protected-route checks. Owner reports successful live recovery for both accounts; callback/unit/browser automation and live-configured route checks pass. Public signup remains disabled. |
| F02 | New costing with name/servings | Complete local form with name feedback, decimal-safe positive whole-number servings validation, whole-costing readiness status, error count, and first-invalid-field focus. |
| F03 | Ingredient add/edit/remove | Local add/edit/remove, automatic useful focus, filled-row removal confirmation, and reset confirmation; at least one card retained. Reordering remains optional and unimplemented. |
| F04 | Purchase/use quantities, units, prices | Complete for approved units; exact compatible conversions, precision feedback, positive quantities, non-negative prices, and used ≤ purchased after conversion. |
| F05 | Live line/total/per-serving results | Verified live line costs, Puhunan, selected markup, calculated Tubo, prominent exact/rounded prices, and per-serving prices. Partial rows and invalid order-level details visibly mark results as incomplete estimates. |
| F06 | Markup and optional upward rounding | Editable 35% starting markup with rounding off; optional upward ₱5/₱10; preserve exact price and show rounded price/serving and actual rounded-price Tubo. |
| F07 | Saved costing CRUD and search | Complete: atomic repository/RPC lifecycle, search, snapshot view, confirmed delete, retry identity and revision protection. Real OWNER browser CRUD/refresh and two-account UI/API isolation passed; anonymous/direct writes denied; disposable records removed. |
| F08 | Default markup/rounding settings | Interactive screen-only preview retained; approved calculator defaults are 35% and no rounding. Settings persistence and propagation remain deferred. |

## Open decisions and issues

No unresolved calculator defects were found in the executed Phase 4 regression checks. Remaining items include hosted configuration and acceptance; this is not a claim that every device or live workflow has been tested.

| IDs | Topic | Status / next action |
| --- | --- | --- |
| D01, D09 | Centavo rounding sequence; zero-value validation | Confirmed and tested: round each line half-up, sum, round calculated Tubo half-up; price/markup may be zero but quantities/servings must be positive. |
| D02, D03 | Per-serving prices and rounded-price profit | Approved and tested: preserve exact/rounded totals and independent per-serving displays; show calculated Tubo and actual Tubo at rounded price separately. |
| D04 | Starting markup/rounding | Approved and tested: 35%, no rounding; reset restores defaults. Settings remains a separate nonpersistent preview. |
| D05 | Precision and fractional pcs | Approved and tested: quantities 6 decimals including pcs; prices/markup 2; reject excess precision/usage. Phase 4 uses NUMERIC plus explicit constraints and decimal-string serialization; no new business maximum imposed. Intrinsic PostgreSQL limits apply. |
| D06 | PHP/connectivity assumptions and private versus shared access | Phase 4 explicitly implements private records per authenticated account and requires internet for Auth/persistence. Shared staff records remain outside scope. |
| D07 | Account provisioning/invitation/recovery procedure | Two Dashboard-created users exist; public signup disabled. Both password logins passed and the owner reports successful recovery for both. Recovery UI and safe callback behavior verified; no public signup/admin module. |
| D08 | History search/order/date display | Implemented literal case-insensitive food-name search, created-at descending with ID tie-break, 50-record pages, and Asia/Manila display. |
| D10 | Duplicate-save/retry identity and edit conflict behavior | Stable record/request UUIDs, idempotent retry, advisory lock and revisions verified. Hosted SQL returned `40001` for stale edits. In the final REST run, the stale request timed out without a code but the revision/totals remained unchanged; see final acceptance limitation. |
| D11 | Hosting, production capacity, backup/recovery | Verify official terms and agree operational policy before deployment. |
| D12 | Phase numbering and approval boundary | Phase 4 Auth/database/history/recovery scope is complete. A separately defined Phase 5 and production deployment still require owner approval. |

## Phase 1 implementation record

Historical record of Phase 1 completion; subsequent calculation changes are recorded under Phase 2 below.

### Features and structure

- `src/app`: browser routes plus Home, Login, and Settings pages.
- `src/components`: responsive shell, desktop sidebar, mobile bottom navigation, branding, headers, notices, and reusable shadcn-style Button/Card/Input/Label/Select/Badge primitives.
- `src/features/costing`: New Costing form, typed local ingredient state, add/edit/remove cards, summary placeholders, and basic food-name/servings feedback. No costing math is present.
- `src/features/history`: clearly identified mock records, responsive cards, local search/empty state, and non-mutating View/Edit/Delete placeholder feedback.
- `src/styles`: Tailwind v4 theme tokens for the approved green, cream, orange, typography, borders, and shadows.
- `src/test` and `tests/e2e`: Vitest setup/component tests and Playwright mobile/desktop workflows.
- Root setup: `package.json`, exact-version lockfile, Vite/TypeScript/ESLint/Playwright configuration, `components.json`, `.gitignore`, `.env.example`, `index.html`, and README.
- QA captures: `docs/qa/phase1-mobile-new-costing.png` and `docs/qa/phase1-desktop-home.png`.

### Installed dependency groups

- Application: React 19, React DOM, React Router, Lucide React, Radix Slot, class-variance-authority, clsx, and tailwind-merge.
- Build/style: Vite 8, React Vite plugin, TypeScript 6.0.3, Tailwind CSS 4 and its Vite plugin. TypeScript 6 was selected because TypeScript ESLint does not yet support TypeScript 7.
- Quality: ESLint 10 with TypeScript/React plugins, Vitest, Testing Library, jsdom, and Playwright Test.

## Testing and review results through Phase 2 (historical)

The following preserves prior phase evidence. Current Phase 4 results are recorded separately below.

| Check | Status | Evidence / limit |
| --- | --- | --- |
| Source content extraction | Passed | OOXML body read: 382 paragraphs, 25 tables, 240 cells; full text in PROJECT_PLAN Appendix A; header/footer included. |
| Additional content inspection | Passed | No images/drawings, text boxes, revisions, comments, nested tables, or external content chunks; footnote/endnote parts have no note text; empty bibliography. |
| Full extraction coverage | Passed | All 348 nonempty body/header/footer paragraphs matched against Appendix A after whitespace/table-format normalization. |
| Original DOCX preservation | Passed | Before/after SHA-256 identical: `3B3A99B2AD7E593266F30ED2CD3E7DD54213E632587ACE7BF78F92C71A1BBE97`. |
| Requirements/scope review | Complete | F01–F08, exclusions, stack, schema, phases, and QA captured; D01–D12 record ambiguities. |
| Source and owner worked-example arithmetic | Passed in calculator tests | ₱60.00 and ₱36.00 lines; the full ₱650 example including ₱227.50/₱877.50/₱87.75/₱880.00/₱88.00/₱230.00 is verified in unit, component, and browser tests. |
| Documentation integrity | Passed | Approved decisions updated in PROJECT_PLAN and AGENTS; original Word plan preserved. Appendix A remains the historical extraction. |
| Word visual-layout review | Not performed | Text-only extraction; source file was not edited or republished. |
| ESLint | Passed | `npm run lint`; zero warnings/errors. |
| Unit/component tests | Passed | `npm run test`; 68/68 tests: calculations, conversions, boundaries, invalid input, blank versus zero, defaults, dynamic row state, updates, reset, and all approved summary values. |
| TypeScript + production build | Passed | `npm run build`; `tsc -b` and Vite build completed; 2,085 modules transformed. |
| Browser workflows | Passed | `npm run test:e2e`; 12/12 tests across 390×844 and 1440×1000 Chrome. Includes all 6 Phase 1 tests plus calculator, validation, reset, and all-route checks. No page runtime errors or horizontal overflow in tested flows. |
| Local development start | Passed | Playwright verified the app at `http://127.0.0.1:5173/` using the configured `npm run dev -- --host 127.0.0.1` command, which starts a server when needed and reuses one otherwise. |
| Responsive visual review | Passed for tested views | Filled calculator captures in docs/qa inspected at mobile/desktop sizes. Automated overflow checks cover all five routes. Real phone keyboards, iPhone behavior, and a full accessibility/performance audit remain untested. |
| Dependency audit | Historical Phase 1 result; development findings remain | Phase 1 production audit reported 0 vulnerabilities. Phase 2 decimal.js installation still reported the known 12 moderate findings; no forced toolchain downgrade was applied. This is not a new full security audit. |
| RLS/security/persistence | Not run | No database or auth implementation. |
| Owner acceptance | Pending | Three real recipe/order checks after implementation. |

Phase 2 verification uses real local calculator behavior in Vitest/Testing Library and Playwright with installed Chrome. These tests establish frontend calculation behavior, not persistence, authentication, RLS, or production readiness. The in-app browser tool failed during connection with missing sandbox metadata; the repository Playwright runner provided browser verification instead.

## Phase 2 implementation record

Historical completion record; subsequent refinements are documented under Phase 3.

### Calculation rules implemented

- `calculateIngredient`: validates required name/values, precision, signs and units; converts kg/g and L/mL to compatible base units; permits fractional pcs; rejects usage above purchase; returns rounded line cost or field errors, never a blank-as-zero result.
- `calculateCosting`: sums valid rounded lines, reports partial estimates, validates markup/servings, computes half-up markup-based Tubo and exact selling price, optional upward ₱5/₱10, actual rounded-price Tubo, and all three per-serving amounts.
- `validateServings`: accepts positive whole-number values without converting to binary floating point. Invalid servings suppress per-serving results while retaining valid totals.
- `formatMoney`: formats decimal strings as PHP with grouping and two decimal places without converting money through `Number`.
- Working precision grows with input digits to preserve centavos on large numbers; no unapproved quantity/markup/money business cap. Per-serving displayed amounts never feed back into totals. Decimal.js 10.6.0 is now an explicit pinned runtime dependency.

### Files created or modified

Created: `src/lib/money.ts`, `src/features/costing/calculations.ts`, `src/features/costing/calculations.test.ts`, `src/features/costing/costing-summary.tsx`, `tests/e2e/phase-two.spec.ts`, and `docs/qa/phase2-mobile-chrome.png` / `phase2-desktop-chrome.png`.

Modified: `src/features/costing/types.ts`, `ingredient-card.tsx`, `new-costing-page.tsx`, `new-costing-page.test.tsx`; `src/app/pages/home-page.tsx` and `settings-page.tsx` (outdated preview wording); `package.json` and `package-lock.json`; `AGENTS.md`, `docs/PROJECT_PLAN.md`, `docs/BUILD_PROGRESS.md`, and `README.md`.

### Limitations and Phase 3 readiness

Phase 2 is ready for review. Calculations are live and local only; navigation/refresh clears inputs, saving is disabled, and other mock screens remain labeled previews. Settings changes are not persistent and do not propagate into the calculator. No Supabase, database, backend, authentication, or deployment work was performed. Physical keyboard/device testing and broader accessibility checks remain future work. The next phase can refine form schemas, error presentation, and accidental-removal safeguards after explicit approval; Phase 3 has not started.

## Phase 3 implementation record

### Completed UI/UX and validation improvements

- Results show the selected Tubo percentage and prominent **Exact Suggested Selling Price**, alongside the separately labeled optional rounded price, rounded price per serving, and actual rounded-price Tubo. All original amounts and the approved half-up calculation sequence are preserved.
- Results identify **Incomplete costing · Estimates only** until the order name, servings, markup, and every ingredient are valid. A blank order name can no longer accompany an apparently complete result. Valid partial line totals remain visible with excluded-row warnings; a valid zero-price line remains distinct from a blank/invalid row.
- Review reveals missing fields, provides an outstanding-field count and **Fix first issue**, and focuses errors in form order. Associated error descriptions and red field borders identify correction targets. Compatible-unit and excess-usage errors are now reported even when other fields are incomplete; no second set of calculation rules was introduced.
- **View results** places the summary below the mobile header; **Back to ingredients** focuses the first ingredient. Adding a row focuses its name. Removing a row preserves the other rows and focuses the nearest remaining name. Focus scroll spacing keeps controls clear of fixed navigation.
- Filled rows require browser-native confirmation before removal; empty rows remove directly. Resetting entered data requires confirmation. Cancel preserves input and totals; confirming reset restores 35% markup, rounding off, and one empty row. A visible Remove label and purchase-price helper clarify actions and inputs.
- The approved green/cream/orange styling, 16px input text, decimal/numeric input modes, and at least 44px form controls are retained. Saving is disabled and local-state limitations are visible. No artificial loading states were added to synchronous calculations.
- Existing React state and pure typed validation were retained under the owner's instruction to avoid unnecessary rebuilding. React Hook Form/Zod migration is deferred until a demonstrated need. No dependency installation, architecture replacement, new business rules, or backend work was necessary.

### Executed checks

| Check | Actual result / evidence |
| --- | --- |
| Unit/component regression | `npm.cmd run test`: **77/77 passed** across 2 files, including the original 68 tests and 9 new tests for recipe scenarios, independent field errors, incomplete readiness, focus, and cancellation. Rerun after the final scroll refinement: 77/77 passed. |
| Browser regression | `npm.cmd run test:e2e -- --workers=2`: **40/40 passed** (10 workflows at each viewport). Includes all Phase 1/2 workflows and 4 new Phase 3 workflows. |
| Final results-scroll / captures | Targeted `--grep "results, keyboard focus"`: **4/4 passed** after the final summary scroll alignment change. No broader code change followed. |
| Responsive coverage | Chrome at **320×740**, **390×844**, **768×1024**, and **1440×1000**; phone/tablet profiles emulate touch. Checks cover route navigation, no horizontal overflow, readable controls, all form control heights ≥44px, input/select font size ≥16px, keyboard Tab order, focus and scroll positions, and result readability. Full-page and results captures in `docs/qa/phase3-*.png` were visually reviewed. |
| Approved owner example | Verified in pure, component, and browser tests: ₱650.00 / 10 servings / 35% → ₱227.50 calculated Tubo, ₱877.50 exact total, ₱87.75 exact/serving; upward ₱10 → ₱880.00, ₱88.00/serving, ₱230.00 actual Tubo. Cost/serving remains ₱65.00. |
| Additional realistic examples | Chicken/rice/oil trays: ₱390.00 cost, ₱526.50 exact, ₱530.00 rounded. Flour/milk/fractional-egg pancake batch: ₱45.00 cost, ₱67.50 exact, ₱70.00 rounded, ₱23.33 rounded/serving. Vegetable side with 12.34% markup: ₱60.00 cost, ₱67.40 exact. These are illustrative fixtures, not owner acceptance recipes or market-price claims. |
| ESLint | `npm.cmd run lint`: passed, no errors/warnings. Rerun after final changes. |
| TypeScript + production build | `npm.cmd run build`: passed (`tsc -b` and Vite, 2,085 modules). Final generated assets: 30.90 kB CSS and 373.77 kB JavaScript. |
| Local application | Playwright verified the running Vite app using the configured `npm run dev -- --host 127.0.0.1` server setup; starts when needed, otherwise reuses the existing server. |
| Source preservation | Original DOCX SHA-256 remains `3B3A99B2AD7E593266F30ED2CD3E7DD54213E632587ACE7BF78F92C71A1BBE97`. Appendix A, previous phase records, and Phase 1/2 QA images were preserved. Phase 2 regression captures now go to test output rather than overwriting historical images. |

The in-app browser connection again failed with missing sandbox metadata. The repository's Playwright runner and installed Chrome supplied the executed browser tests and screenshots. Browser emulation establishes behavior at those viewport sizes; it does not verify physical phone keyboards or Safari.

### Files created or modified

- Created: `tests/e2e/phase-three.spec.ts`; eight captures in `docs/qa/phase3-*.png` (full-page views at four sizes and four results captures).
- Modified application files: `src/features/costing/new-costing-page.tsx`, `ingredient-card.tsx`, `costing-summary.tsx`, `types.ts`, `calculations.ts`, and `src/styles/globals.css`.
- Modified tests/configuration: `src/features/costing/new-costing-page.test.tsx`, `calculations.test.ts`, `tests/e2e/phase-two.spec.ts`, and `playwright.config.ts`.
- Modified documentation: `AGENTS.md`, `docs/PROJECT_PLAN.md`, `docs/BUILD_PROGRESS.md`, and `README.md`. Package files and installed dependency versions are unchanged in Phase 3.

### Remaining limitations and Phase 4 readiness

The local calculator is ready for owner review before Phase 4. Physical Android/iPhone keyboards, Safari, screen-reader output, full accessibility/performance audits, and owner acceptance using three actual recipes have not been completed. The earlier 12 moderate development-tool dependency findings remain a historical issue; no new security audit was performed in Phase 3.

Entries remain temporary React state and clear on navigation or refresh. Only explicit reset and filled-row removal have confirmation safeguards; navigation/refresh behavior is disclosed, not blocked. Settings remain a nonpersistent preview. There is no real login, Supabase integration, database CRUD, backend, or deployment. Schema/RLS, account provisioning/recovery, and private-owner access decisions must be reviewed before authorized Phase 4 implementation.

## Phase 4 implementation record — 05 November 2026

This preserves the initial implementation/predeployment evidence. Subsequent approved deployment and live verification are recorded in the dedicated section below.

### Implemented behavior

- Added the official Supabase SDK with public environment configuration, setup/error guidance, real email/password login, logout, session restoration, token expiry handling, and protected routes. There is no fake-login fallback, public signup UI, or privileged browser credential.
- Home and History now retrieve actual account records through the repository. History supports newest-first pagination, literal case-insensitive name search, Philippine dates, loading/retry/empty states, snapshot view, editing, and named confirmation before deleting. Deletion reports success only after confirmation from the database.
- Save validates complete inputs, disables repeated submissions while pending, preserves failed input, and retains a stable request/record identity for safe retries after uncertain network outcomes. Expected revisions reject stale updates. A failed in-flight save can survive same-owner reauthentication in tab memory; another account cannot recover it and explicit logout clears it. Ordinary drafts are not auto-saved and refresh discards recovery.
- View/edit reuse the approved calculator. A regression found during browser testing (old cached detail after edit) was fixed by refetching saved detail on navigation; the updated saved amounts are now asserted in the full workflow.
- D01–D05 formulas and defaults remain unchanged. Every saved original/rounded result and ingredient snapshot is validated on read against the existing calculator. Settings preferences remain an explicitly nonpersistent preview.

### Database and security

The local migration is `supabase/migrations/202611050001_costings.sql`; it has **not been applied to the hosted project by the agent**. The schema/RLS proposal was documented in [PHASE4_DATABASE_REVIEW.md](PHASE4_DATABASE_REVIEW.md) before implementing SQL.

- `costings` stores owner, food name, servings, markup/rounding, exact and rounded financial totals/per-serving values, revision, retry identity, input snapshot, and timestamps.
- `costing_ingredients` stores ordered names, purchased/used quantity and unit snapshots, purchase prices, and computed line costs. Deleting a costing cascades its ingredients. Deleting an Auth account that still owns costings is restricted, avoiding automatic loss of legitimate history.
- Money uses NUMERIC integer centavos; inputs/outputs use decimal strings. Exact rational half-up arithmetic in SQL follows the client sequence and recomputes all stored totals. Constraints reject incompatible units, excess usage/precision, nonfinite values, and invalid signs.
- Both tables have RLS. Authenticated table access is SELECT only, scoped to the owner; anonymous access and direct writes are denied. Child ownership follows its parent. Four `trugen_*` RPCs implement list/get/save/delete with explicit authenticated identity checks and empty search paths; private helpers are not browser-executable.
- Save/edit uses a single transaction, record-level advisory locking, payload/request matching and revision checks. Tests inject a late ingredient-insert failure to establish rollback of both parent and children.

### Executed verification

| Check | Actual result and limits |
| --- | --- |
| Unit/component/SQL suite | `npm.cmd run test`: **130/130 passed in 8 files**, including a final rerun after configuring `.env.local`. The shared test setup blanks Supabase variables to isolate tests from the live project. |
| Local PostgreSQL/security | **38 tests** execute the actual migration in isolated PGlite PostgreSQL with local Auth fixtures. Covers financial agreement, approved examples, conversions, half-up boundaries, precision rejection, zero/large values, parent/child rollback, retry conflicts, deletion cascade, account-delete restriction, anonymous/foreign-owner denial, direct-write denial, and spoofed owner/totals rejection. This is actual local SQL execution, not hosted Supabase verification. |
| Browser regression | `npm.cmd run test:e2e -- --workers=2`: **68/68 passed** (17 workflows × 4 viewports: 320, 390, 768, 1440px). Official SDK requests are intercepted with test responses. Covers correct/incorrect login, protected routes, restore/logout/expiry, save/view/reload/edit/delete, failed network and uncertain retry, pending-save lock, invalid form, history retry, and same-owner failed-save recovery. These are mocked HTTP tests. |
| ESLint | `npm.cmd run lint`: passed with no errors/warnings after the final test isolation change. |
| TypeScript and production build | `npm.cmd run build`: passed (`tsc -b`, Vite, 2,137 modules). Final configured build: JS 598.29 kB / gzip 178.27 kB; CSS 30.47 kB / gzip 6.21 kB. Vite reports the existing >500 kB chunk warning; no build failure. |
| Local startup | `npm.cmd run dev -- --host 127.0.0.1 --port 5175 --strictPort`: Vite started successfully with the corrected live public configuration. Browser tests separately start their isolated server on port 5174. Startup does not establish successful owner login. |
| Responsive visual review | Inspected history screenshots at 320, 390, 768, 1440px. Existing form/navigation regressions pass at all four sizes. Captures are mocked browser data, not live saved records. |
| Dependency audit | `npm.cmd audit --omit=dev`: **0 production vulnerabilities**. Dependency installation reported 10 moderate findings in the broader dependency tree; a clean production audit does not clear development-tool findings. |
| Live public connection | Read-only GET `/auth/v1/settings` at `https://jueboylmczhlkrjtdjva.supabase.co`: **HTTP 200** with the supplied publishable key. Email login enabled, anonymous login disabled, public signup enabled (`disable_signup: false`). The supplied `.supabase.com` hostname failed DNS even outside the sandbox; `.env.local` now uses the verified `.co` address. |
| Live application schema | Read-only GET `/rest/v1/costings?select=id&limit=0`: **HTTP 404**. Migration/schema installation is not verified; no live records were read or changed. No hosted Auth settings were changed. |
| Live owner Auth/CRUD/RLS | **Not run**: hosted setup and privately provisioned accounts required. `scripts/verify-supabase.mjs` passed `node --check`; its opt-in disposable-record checks have not been run. |
| Original Word document | SHA-256 remains `3B3A99B2AD7E593266F30ED2CD3E7DD54213E632587ACE7BF78F92C71A1BBE97`. Original document and PROJECT_PLAN Appendix A preserved. |

The in-app browser connection failed because required sandbox metadata was unavailable; repository Playwright with installed Chrome provided the browser evidence. Windows sandbox process cleanup prevented a preliminary runner from exiting; the complete final suite ran with approved permissions and passed. Physical smartphone keyboards, Safari, screen readers, broad performance/accessibility audits and three real-recipe owner acceptance remain untested.

### Files and dependencies

- Added `@supabase/supabase-js` **2.119.0** and development-only `@electric-sql/pglite` **0.5.15**; updated `package.json` and `package-lock.json`.
- Created `src/lib/supabase.ts`, `src/lib/supabase.test.ts`, `src/lib/use-resource.ts`, and `src/features/auth/{auth-context,auth-provider,require-auth,logout-button}.tsx/ts` with Auth/login tests.
- Created costing repository/parser tests, saved detail/edit page, failed-save recovery module/tests, reusable history card, and `src/test/database.test.ts`.
- Modified `src/main.tsx`, routing, Home/Login/Settings, app shell, page header, New Costing, summary and history integration. Approved `calculations.ts` was not changed in Phase 4.
- Added `supabase/migrations/202611050001_costings.sql`, `scripts/verify-supabase.mjs`, `docs/PHASE4_DATABASE_REVIEW.md`, and `docs/SUPABASE_SETUP.md`.
- Added `tests/e2e/fixtures.ts` and `phase-four.spec.ts`; adapted Phase 1–3 browser tests to authenticated fixtures while preserving their calculator/UX checks; updated Playwright configuration and `src/test/setup.ts`.
- Updated `.env.example`, README, AGENTS, PROJECT_PLAN and BUILD_PROGRESS. Created ignored `.env.local` using the supplied publishable key; public configuration only, no account password or privileged key.
- Added four `docs/qa/phase4-history-*.png` captures. Earlier phase screenshots and documentation are retained.

### Remaining hosted setup and acceptance

Follow [SUPABASE_SETUP.md](SUPABASE_SETUP.md) in the owner's existing project:

1. Disable public signups in Supabase Auth and leave anonymous sign-ins disabled.
2. Provision/confirm the owner through Authentication → Users and keep the password private.
3. Review and apply the prepared migration once through SQL Editor, then inspect RLS and grants. The public key cannot administer Auth settings or execute arbitrary SQL migrations.
4. Restart `npm.cmd run dev`, sign in, and verify the approved example through save → refresh → search → view → edit → confirmed delete. Verify anonymous and second-account isolation with privately configured test accounts; the optional live script is documented.
5. Complete owner acceptance with three real recipes and a physical smartphone. Record actual results before marking hosted Phase 4 complete.

No production deployment or separate Phase 5 work has started. Persistent settings, hosting/recovery decisions, and further optimization remain outside this implementation. The local implementation is ready for hosted Phase 4 acceptance; a new phase still requires approval.

## Phase 4 approved migration and live verification — 05 November 2026

### Deployment

The owner explicitly approved `202611050001_costings.sql` for `jueboylmczhlkrjtdjva`. Immediately before deployment the saved project reference and explicit remote target matched, only that migration existed locally, and its SHA-256 matched the approved value `8FDC5C8E26D9B0EE20AAE603C97DC409CDB7D016714DBD01F7A7E349968B3EC0`. A final dry run confirmed only that pending file.

Executed once: `supabase db push --remote=jueboylmczhlkrjtdjva --skip-vault --yes` through the pinned local CLI 3.0.0. Exit code **0**, `dryRun: false`, exactly one applied migration, empty seed/custom-role lists, and `Finished supabase db push.` No migration errors occurred and no corrective schema changes were attempted. Local and remote migration history now both show **202611050001**.

### Actual live results

| Check | Result / boundary |
| --- | --- |
| Tables/indexes | `public.costings` and `public.costing_ingredients` exist, RLS enabled on both, four expected indexes present. |
| Constraints | 26 validated CHECK/key/foreign-key/unique constraints inspected: precision/signs, unit compatibility, usage limits, financial identities, rounding, owner FK RESTRICT, child FK CASCADE, unique row ordering and primary keys. |
| Functions | Four expected public SECURITY DEFINER RPCs and six private helpers present; all empty search paths. Authenticated can execute public RPCs, anon cannot; neither browser role can execute private helpers or use the private schema. |
| Table privileges/policies | Authenticated SELECT only; INSERT/UPDATE/DELETE/TRUNCATE denied. Anon has no table access. Both owner policies contain expected USING/WITH CHECK expressions. |
| Auth preservation | Two Auth users before and after deployment/testing. Aggregate fingerprint of IDs plus updated_at unchanged. No Auth user creation/deletion/password changes or hosted Auth configuration changes were made by the agent. |
| Live anonymous HTTP | Official SDK with publishable key: SELECT on each table and history RPC execution denied with `42501`. |
| Current Auth settings | Public signup disabled, anonymous sign-in disabled, email login enabled, verified through the live public settings endpoint. |
| Hosted SQL role/security tests | `scripts/phase4-security-check.sql` passed locally then on hosted PostgreSQL, exit **0**. Uses the two existing user IDs with authenticated/anon role contexts. Owner save/read/select/edit/delete permitted; other-account parent/child reads hidden and get/save/delete RPCs denied; anonymous SELECT/RPC and owner direct writes denied. Retry and stale-edit protection verified. |
| Financial values on hosted SQL | Full approved example passed: 650.00 cost, 227.50 profit, 877.50 exact, 880.00 rounded, 65.00 cost/serving, 87.75 exact/serving, 88.00 rounded/serving, 230.00 actual rounded profit. Edit to 0.25 kg passed 325.00 cost / 438.75 exact / 440.00 rounded / 115.00 actual profit. |
| Test cleanup | SQL test transaction explicitly rolled back. Follow-up reads show **0 costings, 0 ingredients**, same two Auth users/fingerprint. Only a generated test UUID was used; no business records deleted. |
| Real password Auth / committed API persistence | **Not run**. `.env.verification.local` contains empty account fields. Existing two-account SDK script is ready but cannot sign in without locally configured credentials. No tokens/passwords printed. |
| Real browser refresh/login/logout/CRUD | **Pending**; step-by-step walkthrough in PHASE4_LIVE_ACCEPTANCE. Earlier 68 browser tests used mocked network responses and do not satisfy this live checkpoint. |
| Formula preservation | Client `calculations.ts` hash remains `C5573E2655A49D0465E786FA761ED25072D13799F9EF344865BB9E6D4B3CDF11`; migration hash unchanged. No application feature/calculation edits in this deployment. |

SQL role impersonation verifies deployed PostgreSQL enforcement, but does not test Supabase password authentication or committed browser/API persistence. Do not conflate these layers or mark Phase 4 fully complete from the SQL result.

### Files and remaining work

Added `scripts/phase4-postflight.sql`, `scripts/phase4-security-check.sql`, `docs/PHASE4_LIVE_ACCEPTANCE.md` and an ignored private `.env.verification.local` template with blank account fields. Updated migration/setup/progress documentation and current README/plan status. No production application code or approved migration was changed.

At that deployment checkpoint, the next step was private credentials and live SDK/browser acceptance. Those checks were subsequently completed in the final acceptance section below. Physical smartphone and three-real-recipe owner acceptance remain pending; no public deployment or Phase 5 work has started.

## Phase 4 live acceptance attempt — 05 November 2026

The owner confirmed that both accounts were configured privately and authorized disposable live tests. The following results supersede the earlier entries describing blank credentials and unrun browser acceptance.

| Check | Actual result / evidence |
| --- | --- |
| Two-account SDK script | Attempted against the approved project. Stopped at authentication before creating any records. Safe, separate diagnostic: OWNER rejected with `invalid_credentials`, HTTP 400; OTHER authenticated successfully. Neither supplied value had outer whitespace. No passwords/tokens/emails were printed. |
| Blocker / action | Asked the owner to correct only OWNER email/password in `.env.verification.local` and confirm locally saved changes. No passwords reset, Auth users modified, or production schema changes attempted. Two-account SDK CRUD/denial assertions have **not passed** in this attempt. |
| Real browser acceptance | `node --env-file=.env.local --env-file=.env.verification.local scripts/verify-live-browser.mjs --other-account`: **exit 0 / PASS** using installed Chrome and a dedicated Vite server on port 5176. Real Supabase requests; no mocked endpoints. OTHER account authenticated and restored its session after reload. |
| Committed CRUD / persistence | Saved a unique `[Live browser test]` costing through the app; refreshed detail and verified purchased inputs and amounts. Edited usage from 0.5 to 0.25 kg, saved and refreshed again. History search found the edited record. Cancelled deletion preserved it; confirmed deletion removed it. Refreshed history had no matching record and its former detail URL was unavailable. |
| Financial accuracy | All eight amounts asserted in the live form and saved/reloaded detail. Initial: cost 650.00, calculated profit 227.50, exact 877.50, cost/serving 65.00, exact/serving 87.75, rounded 880.00, rounded/serving 88.00, actual rounded profit 230.00. Edited: 325.00, 113.75, 438.75, 32.50, 43.88, 440.00, 44.00, 115.00 respectively. Initial defaults were 35% and rounding disabled. |
| Logout / protected pages | Browser logout passed; `/history` and `/new` redirected to Login, including after refresh. Test SDK session signed out. |
| Cleanup | Separate authenticated SDK probe confirmed this run's parent UUID unavailable (`P0002`) and its child query empty. Only this run's temporary record was deleted. No business records touched. |
| Responsive check | Saved-detail horizontal-overflow assertions passed at 320, 390, 768 and 1440px. Mobile full-page capture `docs/qa/phase4-live-mobile.png` visually reviewed; it contains only disposable test data. These are Chrome emulation checks, not physical-device acceptance. |
| Local financial/database regression | `npm.cmd run test -- src/features/costing/calculations.test.ts src/test/database.test.ts`: **107/107 passed**, 2 files. Includes calculation/SQL agreement, boundaries, conversions, validation and SQL permissions. |
| Script validation / unchanged code | Both verification scripts passed `node --check`. Client calculation SHA-256 and approved migration SHA-256 still match the values above. No application code or financial rule changes; no new migration, deployment, or Phase 5 work. Earlier full lint/build/mock-browser results remain historical and were not rerun for these script/documentation edits. |

Added `scripts/verify-live-browser.mjs` and its disposable-data screenshot. Strengthened `scripts/verify-supabase.mjs` to assert all eight financial amounts, exact denial codes, unchanged data after denied writes, local test-session sign-out, and verified cleanup before reporting success. At this historical attempt, the two-account path still awaited valid OWNER credentials; the final acceptance below later passed. Both private env files remained untouched and ignored; this workspace has no Git repository.

The in-app browser connection failed on missing `sandboxPolicy` metadata; installed Playwright/Chrome supplied the evidence with traces, recordings and session files disabled. This historical attempt left Phase 4 incomplete; the final section below records the later OWNER/two-account pass. Physical-phone and three-real-recipe owner acceptance remain outstanding.

## Phase 4 password recovery implementation — 05 November 2026

### Changes and boundaries

- Confirmed the original app had no reset route and intentionally disabled SDK URL-session detection. Added public `/forgot-password` and `/reset-password`, matching the existing mobile green/cream design; Login now links to recovery and Settings explains how to reach it.
- Requests use `resetPasswordForEmail` with the current origin plus `/reset-password`. Recovery callbacks arriving at Site URL are moved to the reset route before router startup. Implicit tokens, recovery token hashes, and recovery-marked PKCE codes are handled explicitly; the PKCE flow identifier is retained while URLs are sanitized.
- A server-validated recovery identity is required. An ordinary saved login cannot activate the form. Identity is checked again before `updateUser({ password })`; invalid/expired/rejected callbacks and changed-account sessions cannot submit a password change. Callback exchanges are shared across StrictMode effect replays, with no async SDK work inside Auth event callbacks.
- Added verified account display, new/confirm password fields, visibility toggle, length/mismatch feedback, submit lock, safe weak-password/error feedback, confirmed success and local session sign-out/retry. Reset-link parameters are removed from the address bar, raw Auth error text is not rendered, and the document has a no-referrer policy. Refreshing the sanitized form requires a fresh link, as explained on the page.
- Vite now defaults to strict port 5174 to match the hosted redirect. Moved isolated mocked Playwright server to 5178; the user's running port-5174 server was preserved. Both private env files, costing calculations, database tables/migration, and existing Auth users were left unchanged.

### Actual verification

| Check | Result / boundary |
| --- | --- |
| Hosted URL configuration | CLI `config pull --remote=jueboylmczhlkrjtdjva --dry-run --output-format json`, privately captured and selectively summarized: Site URL `http://127.0.0.1:5174`, allowed reset URL `http://127.0.0.1:5174/reset-password`. `dry_run: true`, `wrote: false`; no hosted/local config write from this command. |
| Hosted recovery email template | **Not exposed by the CLI result; not independently verified.** Documented the standard `{{ .ConfirmationURL }}` link and Dashboard review steps. No template edited and no real recovery email sent. |
| Local app reachability | GET `/reset-password` on port 5174 returned HTTP 200 with the app shell. Transformed Supabase module confirmed the approved project and no mock project; no key contents printed. |
| Unit/component/SQL | `npm.cmd run test`: **141/141 passed in 9 files**, including 11 new callback/validation tests and all prior costing/SQL regressions. Final targeted rerun after retaining PKCE flow IDs: **11/11 passed**. |
| Existing browser regression | All **68 existing tests passed** in the first expanded full run. Initial new recovery checks failed on test-fixture mismatches, not costing regressions: malformed fake JWT signature, overly strict SDK request-body assertion, and missing legacy-compatible Auth error code. These fixtures were corrected. |
| Final recovery browser suite | `npm.cmd run test:e2e -- tests/e2e/password-recovery.spec.ts --workers=2`: **16/16 passed**, exit 0, at 320/390/768/1440px. Uses official SDK against intercepted `supabase.test`, not real users. Tests email redirect and neutral response, required email, token cleanup, valid recovery, mismatched passwords, update/sign-out, Site URL fallback, weak password, invalid/missing/expired links, reload with existing session, and account-switch denial before update. |
| Visual review | Four `docs/qa/phase4-recovery-*.png` captures contain only synthetic account data and blank password fields. Small-phone and desktop captures visually reviewed; no horizontal overflow in all four profiles. Physical devices remain untested. |
| TypeScript/production build | Final `npm.cmd run build`: **passed**, 2,141 modules; JS 607.29 kB / gzip 180.44 kB, CSS 31.03 kB / gzip 6.28 kB. Existing >500 kB bundle advisory remains; no build errors. |
| ESLint | `npm.cmd run lint`: **passed**. |
| Preservation | Calculation SHA-256 remains `C5573E2655A49D0465E786FA761ED25072D13799F9EF344865BB9E6D4B3CDF11`; migration SHA-256 remains `8FDC5C8E26D9B0EE20AAE603C97DC409CDB7D016714DBD01F7A7E349968B3EC0`. No production DDL/data/Auth-user writes performed. |

The in-app browser connection failed again with missing sandbox metadata; installed Chrome/Playwright provided the verification. Final recovery checks are mocked and must not be reported as live password resets. The hosted template, email delivery, and private password changes still require the owner walkthrough. Corrected private test credentials are then needed to finish real two-account isolation testing. Phase 5 has not started.

### Files created or modified

Created `src/features/auth/password-recovery.ts`, `password-recovery.test.ts`, `recovery-layout.tsx`, `forgot-password-page.tsx`, `reset-password-page.tsx`, `tests/e2e/password-recovery.spec.ts`, `docs/PASSWORD_RECOVERY.md`, and four recovery QA screenshots. Modified `src/main.tsx`, routing, Login/Settings recovery guidance, the comment explaining manual callback handling in `src/lib/supabase.ts`, `index.html`, Vite/Playwright port configuration, and README/AGENTS/project-plan/setup/acceptance/progress documentation. No dependencies added.

## Phase 4 final live acceptance — 05 November 2026

The owner reported successful password recovery and login for both hosted Auth accounts, updated the ignored private verification file, and authorized final disposable-record tests. Configuration validation confirmed the file exists, all five required fields are nonempty including the explicit live opt-in, and the two emails are distinct. No credential, token or email value was printed.

| Check | Final result / boundary |
| --- | --- |
| Direct two-account SDK acceptance | `scripts/verify-supabase.mjs`: **passed, exit 0**. Both distinct accounts authenticated and signed out locally. OWNER saved the approved example, idempotent retry returned the same record, get/search succeeded, OTHER history returned no record, and all eight summary values matched. Edit to 0.25 kg matched all eight edited values. Confirmed deletion and child cascade passed. |
| Direct authorization/security | OTHER table reads returned no OWNER rows; get returned `P0002`, save returned `42501`, and delete returned `P0002`. Anonymous table/RPC access returned `42501`. Authenticated direct parent update and child delete returned `42501`; denied requests left the owner record unchanged. These real HTTP checks complement the earlier hosted PostgreSQL role tests. |
| Live OWNER browser lifecycle | `scripts/verify-live-browser.mjs`: **passed, exit 0**, real Supabase and installed Chrome. Signed-out `/history` redirected to Login; OWNER logged in, saved a temporary costing, refreshed, viewed ingredient snapshot, edited, saved/refreshed, searched History, cancelled deletion, confirmed deletion, verified absence/unavailable detail, logged out, and remained redirected from protected routes after refresh. |
| Live two-account UI isolation | A separate browser context logged OTHER in while the OWNER record existed. Search returned no matching card; direct detail and edit URLs were unavailable; ingredient content and Save Changes were absent. OTHER logged out and protected History redirected to Login. Reloading OWNER showed the record and edited amounts unchanged. |
| Live financial/input agreement | Initial live values: 650.00 Puhunan, 227.50 calculated Tubo, 877.50 exact price, 65.00 cost/serving, 87.75 exact/serving, 880.00 rounded price, 88.00 rounded/serving and 230.00 actual rounded Tubo. Saved ingredient: 1 kg purchased for 1300.00, 0.5 kg used. Edited usage 0.25 kg produced 325.00, 113.75, 438.75, 32.50, 43.88, 440.00, 44.00 and 115.00. Default 35% and rounding-off state were checked before selecting ₱10. |
| Password recovery | Owner-reported live recovery and subsequent login succeeded for both accounts. Agent-run non-mutating Chrome check against port 5174 passed Login → Forgot password, required-email feedback, safe missing-link `/reset-password` handling and no overflow at 320/390/768/1440px. It sent no email and changed no user. The 11 unit/callback and 16 mocked browser recovery tests remain separate evidence; CLI could not expose the hosted template body. |
| Cleanup / existing data | The first silent direct run was interrupted; its single recent `[Verification only] <UUID>` record was identified by prefix/time, removed and verified unavailable. The retry interruption was handled the same way. Completed API/browser runs verified their own UUID cleanup. Final read-only searches under both accounts returned **0** `[Verification only]` or `[Live browser test]` records. No business record was read by name, modified or deleted. |
| Unit/component/database regression | `npm.cmd run test`: **141/141 passed in 9 files**, including the actual migration in isolated PGlite, calculations, Auth/recovery, repository and SQL security tests. |
| Full mocked browser regression | `npm.cmd run test:e2e -- --workers=2`: **84/84 passed** in Chrome across 320×740, 390×844, 768×1024 and 1440×1000; 68 prior workflows plus 16 recovery checks. Runs on isolated port 5178 with fake/intercepted Supabase responses. |
| ESLint / TypeScript / build | `npm.cmd run lint`: passed. `npm.cmd run build`: passed (`tsc -b`, 2,141 modules). JS 607.29 kB / gzip 180.44 kB; CSS 31.03 kB / gzip 6.28 kB. Existing >500 kB chunk advisory remains non-fatal. |
| Integrity | Client calculation SHA-256 remains `C5573E2655A49D0465E786FA761ED25072D13799F9EF344865BB9E6D4B3CDF11`; deployed migration remains `8FDC5C8E26D9B0EE20AAE603C97DC409CDB7D016714DBD01F7A7E349968B3EC0`; official Word plan remains `3B3A99B2AD7E593266F30ED2CD3E7DD54213E632587ACE7BF78F92C71A1BBE97`. No schema, policy, Auth setting, financial calculation or existing-user modification was made. |

One noncritical platform limitation was reproduced: the stale-revision RPC over REST timed out after 45 seconds and returned no PostgreSQL code. A follow-up get proved its revision and totals were unchanged, so no stale mutation occurred. The earlier hosted SQL role test directly returned `40001` for the same stale edit. This preserves data safety but means a rare concurrent edit can present as a slow generic network failure instead of an immediate conflict in the browser. Changing the deployed function's conflict code or adding a client request timeout requires separate approval and is a reasonable Phase 5 hardening item.

No critical authentication, authorization, calculation, persistence or cleanup failure remains. Phase 4's technical and live acceptance exit condition is met. Physical-phone keyboard/browser testing, three real recipes, hosted email-template body inspection, operational backup/recovery decisions and the existing bundle advisory remain pre-release work rather than claims of completed verification. Phase 5 is ready for owner-approved scope; recommended priorities are persistent per-owner markup/rounding settings, conflict-response hardening, then release operations/performance and physical-device acceptance. No Phase 5 implementation has started.

Final verification modified only `scripts/verify-supabase.mjs`, `scripts/verify-live-browser.mjs`, the generated disposable-data screenshot `docs/qa/phase4-live-mobile.png`, and current documentation. The in-app browser connection was unavailable because its sandbox metadata was missing; the installed Playwright/Chrome fallback supplied the browser evidence with traces, recordings and saved sessions disabled.

## Phase 5A — persistent owner settings — complete 05 November 2026

The owner authorized Phase 5A only, reviewed the remote dry run, and explicitly approved the single settings migration. Local implementation, hosted deployment, and targeted two-account live acceptance are complete. Phase 5B has not started.

### Implemented

- Added `src/features/settings/settings-repository.ts` with strict decimal-string parsing, shared calculator validation, safe Supabase error handling, and authenticated load/save RPC calls.
- Replaced the Settings preview with a mobile-first persistent form for default Tubo/markup and selling-price rounding. It includes loading, retry, precision validation, save locking, success, and error feedback. Approved initial values remain 35% and no rounding.
- New blank costings load the signed-in owner's saved defaults before rendering. Editing a saved costing and recovering a failed save continue to use their captured markup/rounding values; existing records and calculations are unchanged.
- Extended the mocked Supabase browser fixture and responsive workflow coverage for save, reload, and new-costing initialization.

### Deployed database migration

Migration `supabase/migrations/202611050002_user_settings.sql` creates only the additive `public.user_settings` table, its owner-select RLS policy, and `trugen_get_user_settings()` / `trugen_save_user_settings(text,text)` functions. Authenticated users can select only their own row; direct INSERT/UPDATE/DELETE remain revoked and writes occur through the validating security-definer RPC. Anonymous execution/read is revoked. The owner foreign key cascades only when that Auth user is deliberately deleted.

The migration contains no DML against existing records, no DROP/TRUNCATE, and no ALTER of `costings`, `costing_ingredients`, or their functions/policies. It returns 35%/no-rounding without inserting a row when an account has not saved settings. Invalid precision, negative markup, unsupported rounding, anonymous access, cross-account reads, and direct writes are covered by isolated PostgreSQL tests. Migration SHA-256: `FE6706A23BD91C0F65604D3A7C75F475F5B67DF59060F12D582C739F288A2D3E`.

The CLI confirmed the production target as `TRUGEN FOODS (jueboylmczhlkrjtdjva)`. The approved command applied only `202611050002_user_settings.sql`; no seed or role changes were included. A post-deployment remote dry run returned `upToDate: true` with zero pending migrations.

### Actual verification

| Check | Result / boundary |
| --- | --- |
| Unit, component, and isolated PostgreSQL | `npm.cmd run test`: **151/151 passed in 10 files**. Includes defaults, repository parsing/errors, SQL persistence, validation, owner isolation, anonymous/direct-write denial, costing calculations, and all prior tests. PGlite executes both versioned migrations; this is local PostgreSQL evidence, not hosted deployment. |
| Targeted responsive browser | Phase-one browser suite: **12/12 passed** across 320, 390, 768, and 1440px. Verified settings save, reload persistence, and initialization of new costings using mocked Supabase requests. The Windows Vite child required explicit shutdown after the assertions; Playwright then exited 0. |
| Full mocked browser regression | All **84/84 scenarios reported `ok`** across the four viewports, including saved-record edit behavior and prior calculation/Auth/recovery flows. The Windows Vite child remained alive after the final assertion, so the wrapper was stopped manually and did not emit its normal final exit summary. No browser assertion failed. |
| ESLint | `npm.cmd run lint`: **passed**. |
| TypeScript / production build | `npm.cmd run build`: **passed**, 2,142 modules. JS 611.29 kB / gzip 181.19 kB; CSS 31.15 kB / gzip 6.30 kB. Existing >500 kB advisory remains non-fatal. |
| Calculation and Phase 4 migration integrity | Calculation SHA-256 remains `C5573E2655A49D0465E786FA761ED25072D13799F9EF344865BB9E6D4B3CDF11`; approved Phase 4 migration remains `8FDC5C8E26D9B0EE20AAE603C97DC409CDB7D016714DBD01F7A7E349968B3EC0`. |
| Hosted migration | `db push --remote --yes`: **passed** against exact project `jueboylmczhlkrjtdjva`; applied only `202611050002_user_settings.sql`. Follow-up remote dry run: **passed**, database up to date, no pending migration/seed/role changes. |
| Targeted live settings acceptance | `scripts/verify-phase5a.mjs`: **passed, exit 0** using real Supabase and two private test accounts. OWNER saved temporary markup/rounding values; Settings retained them through browser logout/login; a blank New Costing loaded them; OTHER received no OWNER row through RLS and its direct update was denied with `42501`. |
| Restoration and existing records | The script restored the OWNER's original markup and rounding in `finally`, re-read and matched both values, and confirmed the before/after owner costing-history snapshot was identical. It created, edited, or deleted no costing record and changed no Auth user. Both SDK sessions signed out locally. |

### Remaining limitations

- Phase 5B conflict hardening is now locally implemented and dry-run only as recorded below. Existing pre-release items remain: physical-phone testing, three real recipes, hosted email-template review, backup/recovery decisions, and bundle optimization.

### Files created or modified

Created the Phase 5A settings repository/test, migration, and targeted live verification script. Modified the Settings page, new-costing initialization, database test harness, mocked browser fixture/workflow, `AGENTS.md`, `docs/PROJECT_PLAN.md`, and this progress log. No dependency was added.

## Phase 5B — stale-edit conflict fix — complete 05 November 2026

### Implementation

- Added `supabase/migrations/202611050003_conflict_codes.sql`. It recreates only `trugen_save_costing(uuid,uuid,integer,jsonb)` and `trugen_delete_costing(uuid,integer)`, replacing the two application-level SQLSTATE `40001` raises with `PT409`.
- A normalized function-body comparison against applied migration `202611050001_costings.sql` passed for both RPCs: after normalizing `CREATE OR REPLACE` and `PT409` back to `40001`, each definition is byte-for-byte identical. Parameters, return types, SECURITY DEFINER, empty search paths, advisory/row locks, ownership/version checks, calculations, writes, and responses are preserved. Existing execute revokes/grants are reapplied.
- The repository maps `PT409` to a typed `CostingConflictError` while retaining `40001` compatibility. Edit and delete screens display the conflict clearly, preserve local edit input, and offer explicit Reload latest version / Reload history actions. Reloading an edit requires confirmation that unsaved changes will be discarded.
- No previous migration, calculation function, schema/table, RLS policy, Auth behavior, or financial rule was changed. Migration SHA-256: `0993FA2B6E520817E3881DA98FF3D13FAC759582E0890AF34E0751D0AEFA17D3`.
- Added `scripts/verify-phase5b.mjs` for opt-in, one-record live conflict timing, frontend feedback, invariant checks, and verified cleanup.

### Verification

| Check | Actual result / boundary |
| --- | --- |
| Targeted SQL and repository tests | `npm.cmd run test -- src/features/costing/costing-repository.test.ts src/test/database.test.ts`: **51/51 passed in 2 files**. Both stale save and stale delete return `PT409`; assertions confirm the newer/saved record remains unchanged after denial. Client tests cover `PT409`, legacy `40001`, and typed delete conflicts. |
| Focused browser conflict flow | One mobile Chrome test: **1/1 passed**, exit 0. A mocked concurrent update caused `PT409`; unsaved local input remained, cancelled reload preserved it, and confirmed reload opened the newer server version. The known Windows Vite child required explicit shutdown after the assertion. No full browser regression was run. |
| ESLint | `npm.cmd run lint`: **passed**. |
| TypeScript / production build | `npm.cmd run build`: **passed**, 2,142 modules. Existing >500 kB advisory remains non-fatal. |
| Integrity | Calculation SHA-256 remains `C5573E2655A49D0465E786FA761ED25072D13799F9EF344865BB9E6D4B3CDF11`; migrations 001 and 002 remain `8FDC5C8E26D9B0EE20AAE603C97DC409CDB7D016714DBD01F7A7E349968B3EC0` and `FE6706A23BD91C0F65604D3A7C75F475F5B67DF59060F12D582C739F288A2D3E`. |
| Hosted migration | `db push --remote --yes`: **passed** against exact production project `TRUGEN FOODS (jueboylmczhlkrjtdjva)`. Applied only `202611050003_conflict_codes.sql`; no seed or role changes. Post-deployment dry run returned `upToDate: true` with no pending migrations. |
| Live stale save | Real owner browser edit against Supabase: **HTTP 409 in 220 ms**. UI displayed “modified elsewhere,” exposed Reload latest version, and retained the unsaved local field. A direct get matched the complete version-2 record after denial. |
| Live stale delete | Real Supabase RPC: **HTTP 409 / `PT409` in 82 ms**. A direct get again matched the complete version-2 record; the stale request did not delete or modify it. |
| Live cleanup | **Passed.** Deleted only the generated `[Phase 5B verification] <UUID>` record at its current revision, confirmed `P0002` afterward, confirmed zero child rows, and signed out the local test session. |

### Completion and remaining limits

- The former 45-second stale REST abort is resolved in the measured live scenario. The production functions now return application conflicts promptly without allowing an overwrite.
- No critical Phase 5B issue remains. Measurements are from this targeted acceptance run and are not general service-latency guarantees.
- No Phase 5C work or broader production deployment has started.

## Phase 6B — basic PWA implementation — complete locally 08 November 2026

- Added `public/manifest.webmanifest` with stable root identity/scope/start URL, standalone display, TRUGEN FOODS/TRUGEN naming, and the approved green/cream colors.
- Added branded `192x192` and `512x512` PNG icons plus a `512x512` maskable PNG. The maskable wheat mark remains inside the central safe area. All three files were decoded as PNGs at their declared dimensions and copied byte-for-byte into `dist/icons`.
- Linked the manifest from `index.html`. Vite copied the manifest and icons into the normal `dist` output, preserving the existing Cloudflare Pages Direct Upload workflow.
- Added no dependency and changed no route, calculation, Auth/recovery code, Supabase schema/RPC/RLS, or deployment configuration. No service worker, offline cache, offline saving, synchronization or automatic deployment was introduced.
- Verification passed: `npm.cmd run lint`; `npm.cmd run test` (**152/152 tests in 10 files**); and `npm.cmd run build` (**2,142 modules**). The existing non-failing JavaScript chunk advisory remains: 612.03 kB / gzip 181.36 kB. Artifact validation confirmed the manifest values/reference, exact PNG formats/dimensions, source/build hash agreement, and absence of service-worker artifacts.
- Android installation and hosted production behavior remain unverified until Phases 6D/6E. Phase 6C has not started.

## Phase 6C — safe offline support and updates — complete locally 09 November 2026

### Authorized implementation

- Added `public/offline.html`, `public/sw.js`, `public/_headers` and `src/app/pwa.ts`. No existing Cloudflare header rules were present. The offline page is self-contained, mobile-friendly, has no input fields/private data and explains the internet requirement for login and records.
- The worker pre-caches exactly the offline page and the three approved PNG icons using credential-free requests. Navigation requests go to the network without HTTP-cache storage; only rejected network requests receive the offline fallback. Successful/HTTP-error navigation responses are not cached. Icons use exact-path cache lookup; misses are fetched without runtime cache writes.
- All cross-origin traffic, including Supabase, bypasses interception. Mutations and Authorization-bearing requests bypass interception. Other same-origin resources/API fetches are not handled; query-bearing icon URLs are not cache keys. No background sync, offline saving, token storage or app-shell caching was added. Existing Auth session storage is unchanged.
- `preparePasswordRecovery()` still runs before React mounts. `registerPwa()` is called after render initialization, only registers in production, and catches registration failures with a generic warning. It does not log raw error details or reload the app.
- Updates use normal waiting/activation, with no forced takeover. Cleanup matches only obsolete `trugen-foods-public-v<number>` caches. Cache version must be incremented when the offline page/icons change. `_headers` adds worker/manifest revalidation rules only; SPA routing and Direct Upload are preserved.
- Added focused registration and worker-policy tests, an isolated production-artifact Playwright config/test and an ESLint worker-global configuration. README documents the behavior, versioning, testing and limitations.

### Actual checks

| Check | Result / boundary |
| --- | --- |
| ESLint | `npm.cmd run lint`: passed, including the worker and new TypeScript tests/config. |
| Unit/component/local SQL | `npm.cmd run test`: **174/174 passed in 12 files**, including 22 new registration/cache-policy cases. SQL tests use isolated PGlite, not live Supabase. |
| Production build | `npm.cmd run build`: passed, **2,143 modules**. JS 612.27 kB / gzip 181.49 kB; the existing non-failing >500 kB advisory remains. |
| Production artifact verification | Worker, offline page, headers, manifest and all three icons matched their public sources by SHA-256 in `dist`. |
| Local production Chrome | `npm.cmd run test:e2e -- --config=playwright.pwa.config.ts`: **1/1 passed, exit 0**. Verified actual worker registration/control; exactly four cached assets; mocked Supabase response not handled by worker; offline history/recovery-URL fallback and icons; reconnect to Login; update remains waiting with input intact; closing the page allows activation, removes old owned cache and retains unrelated caches. Desktop Chrome with a 390px viewport, not a real Android device. External live traffic blocked. |
| Existing recovery browser regression | `npm.cmd run test:e2e -- tests/e2e/password-recovery.spec.ts --project=mobile-chrome --workers=1`: **4/4 passed, exit 0**, covering exact reset redirect, verification/reset/sign-out, root callback/retry handling and invalid-link rejection. The known Windows Vite teardown stalled afterward; the exact test-owned Vite process on 5178 was identified and stopped explicitly before the runner exited. The existing suite regenerated its mobile recovery QA screenshot. |
| Protected implementation integrity | Calculation and all three migration SHA-256 hashes match the earlier recorded baselines. No Auth/recovery module, route, RPC, RLS, schema, package manifest or lockfile was edited. |

### Remaining limits

No Cloudflare upload, hosted-header verification, live Supabase operation or actual Android installation test was performed. The fallback needs a successful prior installation and controlled navigation; first-ever offline access is not supported. Open pages are not replaced on connectivity loss, and refresh still loses unsaved inputs. Phase 6D and Phase 6E have not started.

## Phase 6D verification and Phase 6E preparation — 09 November 2026

- Phase 6D completed: lint and production build passed; 174 unit/component/local SQL tests, 88 mocked browser regression tests and one production PWA test passed (263 total). The Windows browser runner needed its verified test-only Vite process stopped after all assertions passed. Hash comparisons confirmed 79 source/configuration/test files unchanged. No hosted checks or real owner-data writes were performed.
- Phase 6E-1: reran `npm.cmd run build` successfully (2,143 modules; existing non-blocking >500 kB chunk advisory). Verified all eight requested output paths, manifest/reference, exact PNG dimensions, and public-to-dist hash agreement. Output contains 10 expected files, no environment/SQL/source-map files, no private-key pattern or unexplained private configuration match. Matches within standard library character alphabets were excluded after the Phase 6D investigation.
- Existing application routes remain in place; no top-level `404.html` or redirect override was introduced. Hosted SPA behavior and response headers are still pending verification.
- README records the existing Cloudflare Pages Direct Upload workflow, but the inspected project documentation does not identify the exact Pages project name or production URL. The owner must select the existing project and supply its exact production URL with upload confirmation.
- Only this progress record and normal build output were updated during Phase 6E preparation. No application source, dependency, database, authentication or Cloudflare setting was changed.
- Phase 6E-2 is paused before the owner's manual upload, as explicitly requested. No deployment or hosted verification has been performed. Android installation, owner acceptance, offline/reconnection and subsequent-version update checks remain pending. Phase 6 is not complete.

## Update rules and activity log

At each authorized phase, update completed features, pending tasks, decisions/issues, and tests with actual command/results. Mark phases complete only when their acceptance checkpoint passes. Record skipped checks and remaining work explicitly.

| Date | Activity | Outcome |
| --- | --- | --- |
| 2026-11-04 | Documentation preparation | Official plan extracted and reviewed; three project documents prepared. No development performed; approval pending. |
| 2026-11-04 | Phase 1 setup and frontend | Responsive React frontend and mock interactions completed. Lint, 2 unit tests, 6 browser tests, production build, local start, responsive screenshots, and production dependency audit passed. Phase 2 not started. |
| 2026-11-04 | Phase 2 calculations | Owner approved D02–D05 and retained D01; implemented live decimal calculations and exact/rounded result distinctions. 68 unit/component tests, 12 browser tests, lint, and build passed. Phase 3 awaits approval. |
| 2026-11-04 | Phase 3 results, UX, and validation | Owner authorized Phase 3 only. Improved results/readiness, validation/focus, and removal/reset safeguards. 77 unit/component tests, 40 browser tests, 4 targeted final browser checks, lint, and build passed. Phase 4 awaits approval. |
| 2026-11-05 | Phase 4 Auth, database and history | Local implementation verified: 130 unit/component/SQL tests, 68 mocked browser tests, lint, TypeScript/build, and local startup passed. Added supplied public configuration and corrected project URL after read-only verification. Live Auth settings responded; public signup remains enabled and costing endpoint returned 404. Hosted setup/owner acceptance pending; Phase 5 not started. |
| 2026-11-05 | Phase 4 migration preparation | Installed dev-only CLI 3.0.0 (package/lock updated); initialized supabase/config.toml and cache ignore rules; added scripts/phase4-preflight.sql and deployment review/guide. Migration and calculations unchanged; 38 SQL/security tests passed. Link/dry run stopped for missing CLI authentication. No actual migration executed; approval checkpoint remains pending after successful remote review. |
| 2026-11-05 | Phase 4 remote dry run | Owner completed CLI login. Verified authenticated access, linked exact project, inspected remote catalogs/policies/functions and six DDL watcher definitions. Migration list and dry run succeeded: only 202611050001_costings.sql pending, no seed/custom-role changes or migration warnings/errors. Added policies to preflight inspection and recorded evidence. Actual migration not run; explicit approval requested before deployment. |
| 2026-11-05 | Approved migration deployed | Applied only approved 202611050001 to exact target; deployment/history/schema checks passed. Live anonymous HTTP denial and rollback-only hosted SQL financial/CRUD/ownership tests passed; Auth users preserved and no test records remain. Real password/API/browser acceptance pending private credentials; Phase 4 remains incomplete and Phase 5 not started. |
| 2026-11-05 | Phase 4 final live acceptance | Both-account live Auth/logout, OWNER browser CRUD/refresh, two-account UI/API isolation, anonymous/direct-write denial, exact financial values, cleanup and owner-reported live recovery passed. Final zero-residue searches returned 0/0. Regression passed: 141 unit/component/database and 84 browser tests, lint and build. Phase 4 complete; physical phone/real recipes remain pre-release; Phase 5 awaits approval. |
| 2026-11-05 | Phase 5A persistent owner settings | Local implementation complete: private settings migration, persistent Settings UI, and saved defaults for new costings. 151 unit/component/SQL tests, 12 targeted browser tests, lint and build passed; full browser run reported 84/84 passing assertions with a Windows Vite teardown limitation. Hosted migration remains unapplied pending explicit approval; Phase 5B not started. |
| 2026-11-05 | Phase 5A hosted deployment and acceptance | Applied only approved migration 202611050002 to exact production target; follow-up dry run reported up to date. Real OWNER save/logout/login/new-costing defaults and OTHER RLS/direct-write denial passed. Original settings were restored and existing costing snapshot matched. Phase 5A complete; Phase 5B not started. |
| 2026-11-05 | Phase 5B stale-conflict hardening | Prepared migration 202611050003 changing only application conflict SQLSTATEs to `PT409`, added typed client handling and explicit reload actions. 51 targeted SQL/repository tests, one focused browser test, lint and build passed. Remote dry run lists only this migration; production deployment and live latency verification await explicit approval. |
| 2026-11-05 | Phase 5B deployment and live acceptance | Applied only migration 202611050003 to exact production target; follow-up dry run is up to date. Live stale save returned 409 in 220 ms and stale delete returned 409/PT409 in 82 ms; version 2 remained unchanged after both. Frontend guidance and temporary-record cleanup passed. Phase 5B complete; Phase 5C not started. |
| 2026-11-08 | Phase 6B basic PWA implementation | Added the root-scoped standalone manifest and three branded PNG icons, linked the manifest, and verified their `dist` copies. Lint, 152 tests and build passed; no dependency, service worker, offline behavior or deployment was added. Phase 6C not started. |
| 2026-11-09 | Phase 6C safe offline support and updates | Added production-only registration, four-asset public cache, offline fallback, revalidation headers and natural waiting updates. Lint, 174 tests, build and production Chrome smoke test passed; four mocked mobile recovery assertions passed with manual test-server teardown. No deployment or live Supabase writes; Phases 6D/6E not started. |
