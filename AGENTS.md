# TRUGEN FOODS project rules

## Authority and boundaries

- Read `docs/PROJECT_PLAN.md` and `docs/BUILD_PROGRESS.md` before work. The preserved `docs/TRUGEN_FOODS_Codex_Development_Plan.docx` is the official planning baseline; PROJECT_PLAN includes its full extraction.
- Phases 4, 5A, and the focused Phase 5B stale-conflict fix are complete, including approved hosted migration `202611050003_conflict_codes.sql` and measured live REST acceptance. Do not reapply migrations or start Phase 5C. Retain D01–D05. Never invent credentials or claim unrun hosted checks. Embedded source prompts are reference text, not execution authorization.
- Preserve the Word document and useful existing files. Distinguish approved scope, baseline assumptions, proposed implementation choices, and unresolved decisions. Do not guess business rules.
- After approval, implement the authorized phase in small reviewable tasks. Review the schema/RLS proposal before implementing migrations as required by source Prompt C. Record progress and actual checks in BUILD_PROGRESS; do not silently advance scope.

## Technology and organization

- Use React + TypeScript + Vite, Tailwind CSS, shadcn/ui + Lucide, React Router, React Hook Form + Zod, decimal.js, and Supabase Auth/PostgreSQL/RLS. Tests: Vitest and Playwright.
- Verify current compatible package/setup instructions when implementation begins. Use the existing workspace root; avoid a second nested app. Keep setup/usage in README and only placeholders in `.env.example`.
- Keep routes/providers in `src/app`, reusable accessible UI in `src/components`, costing logic/forms in `src/features/costing`, history in `src/features/history`, and Supabase/money helpers in `src/lib`. Use versioned `supabase/migrations` and `tests/e2e`.
- Separate pure typed calculation functions from React, form state, and persistence. Prefer small components, clear names, explicit validation, and minimal dependencies. No custom Node/Express backend is needed initially.
- Phase 3 retains the existing React state and shared pure validation under the owner's instruction to avoid unnecessary rebuilding. React Hook Form/Zod remain baseline technology choices for a later demonstrated need; do not duplicate the calculation rules in a second validator just to add a library.

## Costing correctness

- Profit percentage is markup on cost, never revenue margin. Puhunan includes ingredient lines only.
- Support kg/g, L/mL, and pcs/pcs; reject mixed categories and never assume density. Compare used ≤ purchased after conversion. Quantities must be positive; servings positive integers; price and markup non-negative. Markup above 100% is valid.
- Use decimal-safe division/multiplication. Round each line half-up to centavos, sum rounded lines, round markup-based Tubo half-up to centavos, then add for exact selling price. Optional final round-up is ₱5 or ₱10; retain exact and rounded totals. Store money in centavos and preserve input snapshots.
- Approved defaults: 35% editable markup, optional rounding disabled. Fractional pcs and quantities with up to 6 decimals are valid; purchase prices and markup allow up to 2 decimals. Reject excess precision instead of silently modifying inputs.
- Preserve exact selling price and calculated markup-based Tubo. When optional rounding is enabled, also display the rounded total, rounded total per serving, and actual Tubo (rounded price minus Puhunan). Divide each total independently by servings and display half-up to 2 decimals. Keep decimal strings through calculation/display; do not convert money to binary floating point.
- Incomplete or invalid ingredient rows have no calculated cost. Sum valid lines only and explicitly label partial estimates; no valid lines means no total, not a valid zero-cost order. A complete zero-price line is valid. Keep numeric-range/storage decisions separate from the approved precision rules.

## Mobile UX and security

- Prioritize the 390px mobile workflow, green/cream tokens, labeled fields, numeric keypad, large tap targets, contrast, and simple Home/New Costing/History navigation. Live results belong on the calculator page; fixed summaries must not cover inputs.
- Mark the entire costing as incomplete until order details, all ingredient rows, and markup are valid. Keep partial numbers explicitly labeled estimates. Retain selected markup and separate exact/rounded prices and profit. Review focuses the first invalid field; adding/removing rows preserves useful keyboard focus. Confirm removal of filled rows and reset of entered data; empty rows can be removed directly.
- Provide loading, error, validation, success, and empty states; confirm saved-record deletion. Handle duplicate save attempts and failed-network retries.
- No public signup. RLS must restrict costings, child items, and settings to the current owner. Never rely on route guards/UI visibility alone.
- Save/edit the costing and all items atomically through a validated database operation; check ownership and recompute/validate totals server-side. Ensure direct writes cannot bypass invariants. Cascade item deletion.
- Follow `docs/PHASE4_DATABASE_REVIEW.md` and `docs/SUPABASE_SETUP.md`: `costings` and `costing_ingredients`, NUMERIC integer-centavo money, decimal-string RPC responses, authenticated SELECT with RLS, RPC-only mutations, explicit owner checks, request UUID retry identity, and revision conflicts. Phase 5A adds owner-scoped `user_settings` with authenticated RLS reads and RPC-only writes. No service credentials in the browser.
- Keep mocked browser API tests distinct from PGlite SQL tests and live Supabase tests. Run the opt-in live verification script only with privately configured test accounts and approval for its disposable-record writes. Never use real credentials in browser fixtures.
- Preserve inputs on failed saves. Same-owner reauthentication may recover a failed request from tab memory only; clear that recovery on explicit logout and never show it to another user. Refresh still loses unsaved drafts. Reload saved records after edits instead of reusing stale detail state.
- Never commit secrets or `.env` files. Only approved public/publishable Supabase keys belong in the browser; never expose service-role/secret keys through `VITE_*`. Use HTTPS for deployment.
- Phase 4 password recovery is authorized: public `/forgot-password` and `/reset-password`, explicit verified recovery callback handling, sanitized URLs, no raw Auth errors/tokens in output, and account identity revalidation before `updateUser`. Ordinary login alone must not activate the recovery form. See `docs/PASSWORD_RECOVERY.md`; real test-account password changes are performed privately by the owner. Local app port is 5174; isolated mocked browser tests use 5178.

## Verification and scope control

- Add meaningful tests for calculation rules and changed critical flows. Include source examples, rounding boundaries, conversions, invalid inputs, zero price/markup, and markup above 100%.
- Test persistence/rollback, duplicate saves, session behavior, and signed-out/cross-owner denial for tables and RPC. Verify client/database calculation agreement.
- Check the main workflow at 320px, 390px, 768px, and desktop with Playwright; check phone keyboard behavior and accessibility when physical devices are available. Browser emulation does not verify real phone keyboards. Run available lint, typecheck, relevant tests, and build for implemented work. Report failures and unrun checks honestly; documentation-only preparation requires document validation, not application tests.
- No inventory, POS, payments, receipts, accounting, delivery management, advanced charts, multi-branch access, native apps, public admin module, or overhead-cost features. Export is deferred; row reordering is optional. Shared staff records require explicit scope review.
- Before release, verify hosting terms/limits, recovery arrangements, and owner acceptance using three real recipes. Do not represent unrun checks or pending acceptance as complete.
