# TRUGEN FOODS — Mobile Costing Calculator

Prepared: 04 November 2026. Updated: 05 November 2026 for completed Phase 4 and authorized Phase 5A persistent owner settings. See BUILD_PROGRESS for implementation, verification, and the pending hosted-migration approval checkpoint.

## 1. Authority and scope

The official reference is [TRUGEN_FOODS_Codex_Development_Plan.docx](TRUGEN_FOODS_Codex_Development_Plan.docx), planning baseline v1.0, dated 04 November 2026. This document organizes that baseline; it does not approve unresolved business decisions or extend the scope. Source section references below refer to the Word document. Appendix A contains its complete text extraction, including tables, prompts, commands, header, and footer.

The Word plan itself calls several choices assumptions, recommendations, or decisions requiring confirmation. Proposed implementation details are not automatically approved requirements. The owner subsequently authorized Phases 1 and 2 and explicitly approved D02–D05, retaining D01 and adding rounded-price Tubo and per-serving displays. Those approvals are recorded below; they supersede the earlier open calculation questions. The original Word document and Appendix A remain unchanged historical references.

The owner subsequently authorized Phase 3 to improve results, mobile usability, validation feedback, and calculator regression coverage. The request explicitly preserves the working calculation architecture and excludes authentication, persistence, backend APIs, and deployment. Existing React state and pure validation are retained; migrating to React Hook Form/Zod is deferred until a demonstrated need, rather than duplicating working rules. This implementation choice follows the instruction to avoid unnecessary rebuilding and does not change business requirements.

The owner's subsequent Phase 4 request authorized Supabase email/password authentication, private-owner database integration, atomic save/edit, and real history/search/view/delete. This brought the original Phase 5 CRUD work into Phase 4; it did not authorize a separate Phase 5 or public deployment. Migration `202611050001_costings.sql` was reviewed, approved and deployed to `jueboylmczhlkrjtdjva` on 05 November 2026. Phase 4 final acceptance passed: both-account Auth/logout, real OWNER browser CRUD/refresh, two-account UI/API isolation, anonymous/direct-write denial, financial agreement, password recovery and zero-residue cleanup. [PHASE4_DATABASE_REVIEW.md](PHASE4_DATABASE_REVIEW.md), [SUPABASE_SETUP.md](SUPABASE_SETUP.md) and [PHASE4_LIVE_ACCEPTANCE.md](PHASE4_LIVE_ACCEPTANCE.md) record the review and evidence.

Source SHA-256: `3B3A99B2AD7E593266F30ED2CD3E7DD54213E632587ACE7BF78F92C71A1BBE97`.

The owner subsequently authorized password recovery within Phase 4 to resolve the local reset redirect problem: mobile `/forgot-password` and `/reset-password`, verified recovery sessions, password confirmation and `updateUser`, safe invalid-link handling, and request redirects matching `http://127.0.0.1:5174/reset-password`. This does not authorize the agent to change existing users or reset their passwords during testing. [PASSWORD_RECOVERY.md](PASSWORD_RECOVERY.md) records implementation and the private owner walkthrough. Calculations, tables and the original planning extraction were unchanged by that work.

The owner subsequently authorized Phase 5A only: persistent private defaults for Tubo/markup percentage and optional selling-price rounding. The approved defaults remain 35% and rounding disabled. New costings use the saved account defaults; saved records, edits, recovered failed saves, and the financial calculation contract remain unchanged. Migration `202611050002_user_settings.sql` was reviewed, explicitly approved, deployed to `jueboylmczhlkrjtdjva`, and passed targeted two-account live acceptance with original settings restored. Phase 5B is not authorized.

## 2. Product objectives and release boundary

Source: §§1, 7.

Provide a responsive, mobile-first food-order costing web application. An owner enters the food/order name, servings, purchased ingredients, purchase prices, and actual quantities used; sees live Puhunan, Tubo, Selling Price, and per-serving amounts; and saves a costing for later review or editing. Partial use of bulk purchases must be costed accurately.

The first release targets one owner or a few authorized users. The source authorization model gives each user private records; shared staff access is not defined. Baseline assumptions awaiting confirmation are a primary owner account, internet access for sign-in and saving, PHP currency, and an existing food-business workflow.

### Functional requirements

| ID | Source requirement | Acceptance expectation |
| --- | --- | --- |
| F01 | Owner sign-in/sign-out | Authorized users access protected screens; no public self-signup. |
| F02 | New costing | Food/order name and positive whole-number servings. |
| F03 | Ingredient rows | Add, edit, and remove; reordering is explicitly optional. |
| F04 | Purchase/use inputs | Ingredient name, purchased amount/unit/price, used amount/unit. |
| F05 | Live results | Line costs, total Puhunan, markup %, Tubo amount, Selling Price, and cost/selling price per serving. |
| F06 | Markup and rounding | Editable non-negative markup, including above 100%; optional upward price rounding. |
| F07 | Saved costings | Create, view, edit, delete with confirmation, and search history. |
| F08 | Settings | Persist default markup and preferred rounding option. |

### Explicit exclusions

- No stock deduction, remaining inventory, or inventory balances. Costings are input-price and quantity snapshots.
- No POS, receipt printing, checkout, payment processing, accounting reports, or delivery management.
- No advanced charts, multi-branch access, native Android/iOS application, or separate admin module.
- Packaging, labor, gas/electricity, transport, and other overheads are deferred. MVP Puhunan is only the sum of included ingredient lines.
- Export is a later-release strategy. Shared business/workspace membership is a possible future extension, not part of the current private-owner model.

## 3. UI/UX requirements

Source: §2 and §7.

Navigation: Login → Home → New Costing with live results on the same page → Save → History → View/Edit/Delete. Bottom navigation contains Home, New Costing, and History. Settings and Logout are in an account menu.

| Screen/section | Required elements and behavior |
| --- | --- |
| Login | TRUGEN FOODS brand, email, password, show-password control, sign-in; no public signup. |
| Home | Prominent + New Costing action, last saved records, short introduction. |
| New Costing | Food name, servings, repeatable ingredient cards; recompute on valid input changes. |
| Live Result | Puhunan, Tubo %, Tubo amount, cost/serving, selling price/serving, prominent selling price, optional round-up. This is a calculator section rather than an extra required navigation destination. |
| History/detail | Search, date, food name, cost, price; open, edit, and confirmed delete. |
| Settings | Default markup, rounding step, sign-out; lightweight presentation. |

Shared elements: wordmark/account top bar; IngredientCard with all purchase/use inputs, calculated line cost, and remove action; full-width Add Ingredient button; MoneySummary; clear loading, validation, saved-success, error, and empty-history states. A fixed bottom summary is allowed on long forms only when it does not cover inputs.

Phase 3 refinements: selected Tubo percentage appears in the summary; exact and rounded suggested prices are prominent and remain separate. An incomplete order name, servings, markup, or ingredient row prevents a final-valid status even when partial numbers are available. Review reveals errors and focuses the first invalid field; View results and Back to ingredients reduce scrolling. Filled-row removal and reset of entered data require confirmation. Empty rows remove directly, one row remains, and focus moves to a useful remaining field. Saving stays disabled and local data-loss behavior stays visible. Numeric inputs preserve exact strings and use decimal/numeric input modes; errors explain compatible units and how to correct excess usage.

| Visual/accessibility token | Source guideline |
| --- | --- |
| Primary | Deep green `#1C5441` |
| Canvas | Warm near-white `#FAFBF7` |
| Accent | Muted orange `#C9792B`, mainly for highlights |
| Layout | 390px reference mobile width; responsive tablet and desktop |
| Inputs | Large tap targets, labeled numeric fields, native numeric keypad |
| Money/readability | PHP `₱`, two decimals, text labels, strong contrast |

Check keyboard and bottom-navigation interactions on phones. The source usability target is ideally fewer than twelve meaningful taps to start and save a simple one-ingredient costing, excluding typing. Compatibility targets are Android Chrome and desktop Chrome/Edge; test an iPhone browser if available.

## 4. Calculation contract

Source: §3; examples repeated in §7. Use the explicit centavo convention in §3.4 when interpreting the general formulas in §3.1.

### Units and validation

- Mass: `g`, `kg`; 1 kg = 1,000 g. Volume: `mL`, `L`; 1 L = 1,000 mL. Count: `pcs` with `pcs` only.
- Convert purchase and used quantities to the same base unit within a category before comparison or division. Reject cross-category pairs; never infer density.
- Purchased and used quantities must be positive. Used base quantity must not exceed purchased base quantity for one row. Represent multiple packs by increasing purchased quantity or splitting into rows.
- Purchase price must be non-negative. Zero price is allowed. Servings must be a positive integer.
- Markup must be non-negative and may exceed 100%. Zero markup is allowed.
- A valid costing requires a nonempty food name and at least one complete valid ingredient. Saving remains deferred. Fractional pieces are approved. Quantities accept up to 6 decimal places; purchase prices and markup percentages accept up to 2. Excess precision is an error, never silently rounded at input.
- Incomplete/invalid ingredient rows have no line cost. Sum valid lines only and visibly label the entire estimate partial when rows are excluded. If no valid lines exist, display unavailable amounts rather than a misleading zero. A valid line with zero purchase price is included normally.
- No new business maximum is approved for quantities, prices, markup, or servings. Phase 2 uses decimal strings and working precision sized to the entered digits; database ranges and name-length limits remain future schema decisions. Ordinary decimal notation is accepted; malformed, nonfinite, exponent, hexadecimal, and comma-formatted inputs produce validation feedback.

### Computation sequence

`round_centavo(x)` means round to the nearest PHP 0.01 using half-up rounding. Calculate with decimal-safe arithmetic; centavo storage alone does not make quantity division safe.

1. Normalize compatible quantities to base units.
2. Raw ingredient cost = (purchase price ÷ purchased base quantity) × used base quantity.
3. Ingredient line cost = `round_centavo(raw ingredient cost)`.
4. Total Puhunan = sum of the rounded ingredient line costs.
5. Tubo amount = `round_centavo(total Puhunan × markup percent ÷ 100)`.
6. Exact selling price = total Puhunan + rounded Tubo amount.
7. If selected, rounded selling price = `ceil(exact selling price ÷ step) × step`, where step is ₱5 or ₱10. No rounding leaves the rounded price absent. An exact multiple stays unchanged.
8. Cost per serving = total Puhunan ÷ servings. Exact selling price per serving = exact selling price ÷ servings. Display each with half-up centavo rounding.
9. When optional round-up is enabled, also calculate rounded selling price per serving = rounded selling price ÷ servings, displayed half-up to centavos, and actual Tubo at rounded price = rounded selling price − total Puhunan. Preserve the original calculated Tubo and exact selling price alongside these additional values.

The percentage is **markup on cost**, not revenue profit margin. “Exact/unrounded price” means before optional ₱5/₱10 rounding; centavo rounding has already happened. Show both exact and rounded totals when round-up is active. Do not round unit prices early. Per-serving displays use half-up rounding and may not multiply back to the total; they never replace or change the stored in-memory totals.

### Verified source examples

| Scenario | Inputs | Expected |
| --- | --- | --- |
| Partial purchase | 1 kg for ₱120; use 0.5 kg | ₱60.00 line cost |
| Conversion | 500 g for ₱90; use 0.2 kg | ₱36.00 line cost |
| Markup | ₱650 cost; 35% | ₱227.50 Tubo; ₱877.50 exact price |
| Round-up | ₱877.50; step ₱10 | ₱880.00 rounded price |
| Per serving | ₱650 cost; 10 servings | ₱65.00 cost/serving |

The owner has approved 35% as the editable starting markup and no optional rounding as the default. These apply to each new/reset local costing. Settings remains a nonpersistent preview and does not change calculator defaults in Phase 2.

### Approved Phase 2 acceptance example

| Result | Expected amount |
| --- | --- |
| Puhunan | ₱650.00 |
| Servings / markup | 10 / 35% |
| Calculated Tubo | ₱227.50 |
| Exact selling price | ₱877.50 |
| Cost per serving | ₱65.00 |
| Exact selling price per serving | ₱87.75 |
| Rounded selling price, upward ₱10 | ₱880.00 |
| Rounded selling price per serving | ₱88.00 |
| Actual Tubo at rounded price | ₱230.00 |

The additional rounded-price profit and per-serving fields were explicitly requested in the owner's Phase 2 approval. All calculated results update locally; there is no database persistence, real authentication, backend API, or deployment in this phase.

## 5. Technology and proposed architecture

Source: §4. Preserve the selected stack; package versions and setup commands must be verified when implementation is authorized.

| Layer | Source choice |
| --- | --- |
| UI/build | React, TypeScript, Vite |
| Styling/components/icons | Tailwind CSS, shadcn/ui, Lucide |
| Routing | React Router |
| Forms/validation | React Hook Form, Zod |
| Decimal calculations | decimal.js |
| Persistence/authentication | Supabase PostgreSQL, Supabase Auth, Supabase client SDK, RLS |
| Automated tests | Vitest, Playwright; source setup also lists Testing Library and jsdom |
| Hosting candidate | Netlify or Cloudflare; final choice and current commercial terms/limits unconfirmed |

Proposed dependency flow:

```text
Mobile / desktop browser
  React routes + accessible components
    Costing form -> validation -> pure decimal calculator -> live summary
    Auth provider -> Supabase Auth
    Data access -> Supabase API
      Transactional save/edit RPC -> database validation + totals verification
      PostgreSQL costings / costing_items / user_settings
      RLS enforces current-user ownership on every permitted operation
```

Keep calculations independent of React and the network. UI owns interaction and presentation, feature modules own workflows, and a small data-access boundary handles Supabase operations. Use database-side decimal/numeric computation and the same rounding order as the client; saved totals must be recomputed or validated by the database. Save/edit the costing and its items in one transaction so partial failure cannot leave inconsistent records. These boundaries implement the source recommendation without introducing a custom Node/Express service.

Use an approved public/publishable Supabase browser key with RLS. Never expose service-role/secret keys in browser code, `VITE_*`, or Git. Use HTTPS and environment configuration; hidden UI buttons are not authorization. Keep owner records private and test access independently of the UI.

Hosting/cost statements in the Word document are historical planning guidance, not freshly verified pricing or policy advice. It cautions against Vercel Hobby for business use and proposes evaluating Netlify/Cloudflare with Supabase. Re-check official commercial-use terms, limits, production availability, costs, and backup/recovery options before choosing deployment. A domain is optional. No provider account, service, or deployment is created in this task.

## 6. Database structure

Source: §5. The baseline schema below is preserved for traceability. Phase 4 implements the reviewed refinement described immediately below it; its initial migration was applied to the hosted project after explicit owner approval on 05 November 2026.

| Table | Essential fields |
| --- | --- |
| `costings` | `id`, `owner_id`, `food_name`, `servings`, `markup_pct`, `total_cost_centavos`, `profit_centavos`, `exact_price_centavos`, nullable `rounded_price_centavos`, `rounding_step`, `created_at`, `updated_at` |
| `costing_items` | `id`, `costing_id`, `ingredient_name`, `purchased_qty`, `purchased_unit`, `purchase_price_centavos`, `used_qty`, `used_unit`, `line_cost_centavos`, `sort_order` |
| `user_settings` | `user_id`, `default_markup_pct`, `rounding_step`, `updated_at` |

Phase 4 refinement: the ingredient table is named `costing_ingredients`, matching the latest owner request. Only `costings` and `costing_ingredients` are implemented; persistent `user_settings` remains deferred because the current request does not implement preference persistence. NUMERIC integer-centavo columns preserve the original money convention; unconstrained NUMERIC plus validation/checks avoids silently rounding excess precision. Quantities allow 6 decimals, prices/markup 2, and positive integer servings remain NUMERIC to avoid an unapproved integer range cap. PostgreSQL's intrinsic numeric/storage limits apply.

`costings` additionally stores actual rounded-price Tubo, cost/exact/rounded price per serving, a revision, last save request UUID, and the input snapshot for retry detection. Public `trugen_get_costing`, `trugen_list_costings`, `trugen_save_costing`, and `trugen_delete_costing` functions serialize financial values as decimal strings. The SQL implementation uses exact rational half-up rounding, sums rounded lines, and retains both original and rounded prices. Browser roles have owner-scoped SELECT through RLS but cannot write directly; SECURITY DEFINER mutation functions use empty search paths and explicit identity/ownership checks, atomic changes, and revision preconditions. Private helpers are not exposed. See the review document and `supabase/migrations/202611050001_costings.sql` for the exact implementation.

Proposed type approach: UUID identity/reference fields; exact numeric quantities and percentages; integer centavo money fields; integer servings/sort order; text names and constrained unit values; timezone-aware timestamps. Final numeric ranges must fit both PostgreSQL storage and client serialization safely. Do not silently choose an arbitrary business maximum or a rounding-step encoding.

Relationships and constraints:

- `costings.owner_id` and `user_settings.user_id` reference Supabase Auth identities; one settings row per user.
- One costing has many items via `costing_items.costing_id`; delete items with `ON DELETE CASCADE` when their costing is deleted.
- Index owner references, costing-item references, and creation dates as appropriate for owned history queries.
- Enforce positive quantities/servings, non-negative money/markup, supported compatible units, used ≤ purchased after conversion, nonempty food name, and at least one valid item. Use the transaction for aggregate/cross-row checks that cannot be ordinary row checks.
- Retain entered quantities, units, and purchase prices with saved line and total amounts. Editing a costing changes that record; the source does not require immutable version history.
- New records belong to `auth.uid()`; reject another owner's IDs. Validate parent ownership for ingredient access and reject owner reassignment.
- Review the RPC and direct write permissions together: direct table writes must not bypass required totals or complete-costing validation.

| Access | Required policy |
| --- | --- |
| Read | Signed-in users read only owned costings and their items. |
| Create | Current authenticated user owns new costings; reject foreign owner assignment. |
| Update | Only owned costings/items; never permit cross-owner moves. |
| Delete | Only owned costings; UI confirms; dependent items deleted. |
| Settings | Each user reads/writes only their own settings. |

No company-wide sharing is implied by admitting a few accounts. An explicit membership design would require a separate approved scope decision.

## 7. Proposed repository structure

Source: §6.1. Use the existing `TRUGEN-FOODS` workspace as the project root; the source's `trugen-costing/` is a sample name, not a requirement to create a nested application. The tree below is the architectural baseline. The frontend now exists; database paths remain proposals for later phases. See BUILD_PROGRESS for the actual file inventory.

```text
TRUGEN-FOODS/
  AGENTS.md
  README.md                         # future setup and usage
  .env.example                      # future placeholders only
  docs/
    TRUGEN_FOODS_Codex_Development_Plan.docx
    PROJECT_PLAN.md
    BUILD_PROGRESS.md
  src/
    app/                            # routes, providers, auth guards
    components/                     # shared UI, IngredientCard, MoneySummary
    features/
      costing/                      # form, pure calculations, validation
      history/                      # saved record list/detail workflows
    lib/                            # Supabase access and money helpers
    test/                           # fixtures and test helpers
  supabase/
    migrations/                     # schema, constraints, RLS, save/edit RPC
  tests/
    e2e/                            # mobile browser workflows
```

Keep login, home, and settings page placement simple within these boundaries; split further only when implementation needs it. Avoid extra services or speculative modules.

## 8. Development phases and recommended order

Source: §6, §8, §9. Preserve the source phases 0–6. The owner's Phase 1 request combined setup and frontend work; Phase 2 authorizes calculations only. Source prompts remain reference material, not authority to advance phases.

| Phase | Deliverables | Acceptance checkpoint |
| --- | --- | --- |
| 0 — Setup | After approval: Git/Vite/TypeScript, CSS/UI libraries, design tokens, routing/test setup, README and environment placeholders; retain these project documents. | Local app runs; available lint, typecheck, tests, and build succeed. |
| 1 — UI | Mobile Login, Home, New Costing/result, History, Settings shells with sample data. | Readable at 390px and desktop; navigation works; no Supabase integration yet. |
| 2 — Calculator | Dynamic rows, pure decimal calculations, unit conversions, markup, round-up, live summary. | Known examples and arithmetic boundary tests pass; no database writes. |
| 3 — Results / form quality | Improve result hierarchy, selected markup, incomplete status, field feedback, focus/navigation, removal/reset safeguards; verify 320/390/768/1440px. Retain existing pure validation; schema-library migration is deferred under the owner's minimal-change instruction. | All calculation rules preserved; invalid/blank inputs handled safely; saving unavailable; unit/component/browser, lint and production checks pass. |
| 4 — Auth, database, history (owner's current scope) | Reviewed migrations, owner Auth, atomic save/edit, history/search/detail, confirmed delete, RLS and API validation. Persistent settings remain deferred. | Local tests pass; owner configures project and approves migration; live Auth/API/RLS/persistence acceptance passes. Local and hosted evidence must remain distinct. |
| 5 — Subsequent approved work | Original history CRUD deliverables were brought forward into the owner's Phase 4 request. Further Phase 5 scope requires owner approval. | No automatic progression. |
| 6 — QA/deploy | Unit/integration/mobile E2E, accessibility/performance, deployment configuration and owner acceptance. | Critical checks pass; approved HTTPS deployment works on owner's phone. |

Implementation order remains 0 → 1 → 2 → 3 → 4 → separately authorized subsequent work. Phase 4, including the full costing-record lifecycle and deployed initial migration, passed live Auth/API/browser acceptance. Separate Phase 5 work and public website deployment are not authorized until the owner defines and approves them.

Work in small reviewable increments and run applicable checks after each phase. Migrations require the review described in source Prompt C before implementation. The embedded first prompt and quick-start commands in Appendix A are reference material, not current permission to scaffold or install.

## 9. Testing and acceptance plan

Source: §7. This is the testing plan; executed checks and exact results are recorded separately in BUILD_PROGRESS.

- **Math (Vitest):** all five source examples; compatible kg/g and L/mL conversion; pcs; half-up line and profit rounding; sum rounded lines; markup zero and above 100%; no rounding/₱5/₱10; exact rounding multiples; approved per-serving policy.
- **Validation:** blank/zero/negative quantities and invalid units; cross-category inputs; used quantity greater than purchase after conversion; fractional/zero servings; negative price/markup. Zero price and zero markup remain valid. Cover approved precision and limits once decided.
- **Interaction:** ingredient add/edit/remove and immediate totals; optional reorder only if selected; invalid save prevention; loading, success, empty, and error states; settings behavior; delete confirmation.
- **Persistence/security:** create/refresh/edit without duplicates; delete with item cascade; transaction rollback; reject tampered totals and foreign-owner IDs; signed-out and second-account read/write denial on costings, items, settings, and RPC; sign-out/session handling.
- **Mobile E2E (Playwright):** sign-in → new costing → ingredient entry → live totals → save → history → edit → delete → sign-out at 390px. Check large-screen layout and keyboard/fixed-summary usability. Verify double-tap saves and failed-network retries.
- **Release:** available lint, typecheck, unit/integration/E2E, production build; accessibility/performance; Android Chrome, desktop Chrome/Edge, and iPhone if available; HTTPS; secrets/configuration; backup/recovery policy and versioned migrations. Export remains deferred.
- **Owner acceptance:** hand-check three real recipes/orders; confirm sufficient units, correct results, understandable Puhunan/Tubo/Selling Price labels, faster workflow, and useful repeat-order history.

Record actual commands, outcomes, failures, and unrun checks in [BUILD_PROGRESS.md](BUILD_PROGRESS.md). Never label planned checks as passed.

## 10. Requirements review and decision register

No numerical error was found in the source worked examples. The following gaps and wording inconsistencies need explicit handling; none are silently converted into requirements.

| ID | Finding / unresolved decision | Recommendation or source interpretation | Decision point |
| --- | --- | --- | --- |
| D01 | Line and profit centavo rounding order | Approved and retained: round each line half-up, sum rounded lines, round markup-based profit half-up, add for exact price. | Confirmed by owner for Phase 2. |
| D02 | Exact and rounded per-serving prices | Approved: divide exact/rounded totals independently by positive whole-number servings; display both half-up to 2 decimals when rounding is on. No remainder allocation. | Approved by owner for Phase 2. |
| D03 | Calculated versus actual rounded-price Tubo | Approved: preserve calculated markup-based Tubo; additionally show rounded price minus Puhunan as actual Tubo at rounded price. | Approved by owner for Phase 2. |
| D04 | Initial markup and rounding defaults | Approved: 35% editable markup, optional rounding off. New/reset calculator uses these defaults; Settings remains screen-only preview. Saved-record preference behavior remains a later persistence concern. | Approved by owner for Phase 2. |
| D05 | Precision and fractional pieces | Approved: quantities including pcs up to 6 decimals; price/markup up to 2; reject excess precision; usage ≤ purchase after conversion. No arbitrary business maxima introduced. Storage ranges and name lengths remain schema/form decisions. | Phase 2 rules approved; later schema bounds pending. |
| D06 | Owner access and private records. | Phase 4 requires owner email/password login and cross-account isolation. PHP remains approved; network access is required for Auth/data. Shared records remain excluded. | Implemented and verified live with two accounts. |
| D07 | Initial account and recovery. | Dashboard-created accounts, public signup disabled, and in-app forgot/reset password flow with verified callbacks. No public signup/admin module. | Owner reports successful live recovery/login for both accounts; automation also passes. |
| D08 | History matching, order, dates. | Phase 4 requests name search and newest first. Implementation uses literal case-insensitive substring matching, creation time/ID order, pages of 50, and Asia/Manila display dates. | Recorded implementation choices; no advanced filters. |
| D09 | Field-specific zero-value validation | Quantities/servings must be positive; price/markup may be zero. Phase 2 tests cover these distinctions. | Resolved under approved source rules; retain in Phase 3. |
| D10 | Duplicate retries and edit conflicts. | Phase 4 uses a stable costing UUID/request UUID, replay checking, atomic writes and revision preconditions. Retry unchanged failed requests; reopen latest records after conflict. Failed saves can survive same-owner reauthentication in tab memory; ordinary drafts do not persist after refresh. | Phase 5B deployed application `PT409`, retained legacy client compatibility, and added explicit reload actions. Live stale save returned HTTP 409 in 220 ms and stale delete in 82 ms; neither overwrote version 2. |
| D11 | Hosting, backup/recovery policy, account ownership, and production capacity are unsettled. | Select and verify current provider terms/limits and a practical recovery process before launch. No paid tier assumed. | Developer + owner before Phase 6 deployment. |
| D12 | Source phases and owner requests group tasks differently. | The owner authorized authentication, recovery and full record CRUD as Phase 4; final live acceptance passed. Separate Phase 5 work and deployment are not authorized. | Phase 4 complete; owner approval required before Phase 5 or deployment. |

Scope review: the listed core features support accurate costing and repeat-order reuse. Ingredient reordering is optional and can wait; a separate result page, shared-workspace model, offline synchronization, ingredient catalog, analytics, PDF/receipt export, and additional expense modules are not required by this baseline. Do not add them during MVP implementation. Production backups are an operational need in the source, not authorization for an in-app backup module.

## Appendix A — Complete source text extraction

Extracted directly from the DOCX's OOXML without modifying it. The main document has 382 paragraphs and 25 tables (240 cells); all body content is included in source order below. One-cell layout tables are presented as paragraphs/code blocks, and data tables retain rows and columns. Styling, blank spacing, and pagination are not reproduced. Header and footer text are included separately; the page-number field is identified. Footnote/endnote parts contain only separators, with no textual notes. There are no embedded images/drawings, text boxes, tracked changes, comments, external content chunks, or nested tables. The custom bibliography contains no entries. This is a content extraction, not a visual-layout audit of the Word file.

<!-- SOURCE_EXTRACTION_START -->

PRODUCT + ENGINEERING BLUEPRINT

TRUGEN FOODS

Mobile Costing Calculator

MVP scope  •  Tech stack  •  UI/UX  •  Database  •  Codex work plan

A practical build plan for a mobile-first food-order costing web application, prepared to guide incremental implementation with OpenAI Codex.

PRODUCT PROMISE

In a few simple steps, the owner enters food order details, purchased ingredients, and actual quantity used. The system shows accurate Puhunan, Tubo, Selling Price, and per-serving amounts, then saves the costing for future use.

### Key implementation decisions

| Area | Selected approach |
| --- | --- |
| Release target | MVP for one owner / a few authorized users; responsive web app |
| UI approach | Mobile-first, clean green-and-cream design; live calculator results |
| Main stack | React + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Data and login | Supabase PostgreSQL, Supabase Auth, database RLS |
| Coding workflow | Codex in small reviewable tasks; tests after each phase |

Status: Planning baseline  |  Version: 1.0  |  Prepared: 04 November 2026

### 1. Product definition and MVP scope

#### 1.1 Business problem

Ingredients are often purchased in bulk but partially used for individual orders. Manual computation makes it difficult to estimate true cost (puhunan), target profit (tubo), and selling price quickly and consistently.

#### 1.2 Owner goal

The owner should be able to create a new costing on a phone, add ingredients, see totals update automatically, save the record, and open it again for review or editing.

#### 1.3 MVP functional requirements

| ID | Requirement | Acceptance expectation |
| --- | --- | --- |
| F01 | Owner sign-in and sign-out | Authorized users can access the protected screens. |
| F02 | New costing | Enter food/order name and positive whole-number servings. |
| F03 | Ingredient rows | Add, edit, reorder (optional), and remove ingredients. |
| F04 | Purchase and use inputs | Enter purchased amount + unit + price and actual used amount + unit. |
| F05 | Live results | Show line costs, total puhunan, tubo, price, cost/serving. |
| F06 | Markup and rounding | Edit profit %; optionally round final price upward. |
| F07 | Saved costings | Create, view, edit, delete records and search history. |
| F08 | Settings | Save default markup and preferred rounding option. |

#### 1.4 Explicit exclusions for the first release

- No stock deduction or inventory balance tracking: each costing records a price/quantity snapshot, not remaining inventory.

- No POS, receipt printing, order checkout, payment processing, accounting reports, or delivery management.

- No advanced charts, multi-branch access, or native Android/iOS app in the MVP.

- Packaging, labor, gas/electricity, transport, and other overheads can be added in a future phase; current “Puhunan” is the sum of included ingredient lines.

ASSUMPTION TO VERIFY BEFORE LAUNCH

One primary owner account, internet access for sign-in and saving, PHP currency, and an existing food business workflow. These are baseline decisions, not confirmed client requirements.

### 2. UX structure and visual design

#### 2.1 Recommended navigation

Login → Home → New Costing (live result on same page) → Save → History → View / Edit / Delete. Use a simple bottom navigation for Home, New Costing, and History. Put Settings and Logout under an account menu.

#### 2.2 Screen specifications

| Screen | Primary elements | Important interaction |
| --- | --- | --- |
| Login | Brand, email, password, show password, sign in | No public self-signup for MVP. |
| Home | Large + New Costing, last saved records, short intro | The calculator action is most prominent. |
| New Costing | Food name, servings, repeatable ingredient cards | Auto-recompute whenever valid input changes. |
| Live Result | Puhunan, tubo %, tubo amount, cost/serving, sell price | Prominent selling price; optional round-up. |
| History | Search, date, food name, cost and price | Open record, edit, confirm before delete. |
| Settings | Default markup, rounding step, sign out | Keep light; no separate admin module. |

#### 2.3 UI component inventory

- Top bar: TRUGEN FOODS wordmark, account / logout menu.

- IngredientCard: name, purchased quantity/unit, purchase price, used quantity/unit, computed line cost, remove icon.

- Add Ingredient: clear full-width action below the list.

- MoneySummary: running Puhunan, Tubo, Selling Price, per-serving values; fixed bottom summary on long mobile forms only when it does not cover inputs.

- Feedback: clear loading, validation, saved-success, error, and empty-history states.

#### 2.4 Visual direction and accessibility

| Token | Initial guideline |
| --- | --- |
| Primary | Deep food-business green (#1C5441) |
| Canvas | Warm near-white (#FAFBF7) |
| Accent | Muted orange (#C9792B); mainly highlights |
| Layout | 390px reference mobile width; responsive tablet/desktop |
| Interaction | Large tap targets, labeled numeric fields, native numeric keypad |
| Readability | PHP amounts with ₱, two decimals; text labels and strong contrast |

### 3. Calculation and data rules

#### 3.1 Required formula

```text
Ingredient cost = (purchase price ÷ purchased quantity in base units) × used quantity in base units
Total puhunan = sum of ingredient costs
Tubo amount = total puhunan × (markup percent ÷ 100)
Selling price = total puhunan + tubo amount
Cost per serving = total puhunan ÷ servings
Selling price per serving = selling price ÷ servings
```

The selected percentage is MARKUP ON COST, not profit margin based on revenue. Rounding is optional and applies only to the final selling price, after the unrounded total is computed.

#### 3.2 Worked examples

| Scenario | Input | Expected |
| --- | --- | --- |
| Carrots | 1 kg purchased for ₱120; 0.5 kg used | Ingredient cost: ₱60.00 |
| Unit conversion | 500 g purchased for ₱90; 0.2 kg used | Ingredient cost: ₱36.00 |
| Profit | Puhunan ₱650; markup 35% | Tubo ₱227.50; selling price ₱877.50 |
| Rounding | Selling price ₱877.50; round up to ₱10 | Displayed rounded price: ₱880.00 |
| Per serving | Total cost ₱650; 10 servings | Cost/serving ₱65.00 |

#### 3.3 Unit rules

- Mass: g and kg (1 kg = 1,000 g). Volume: mL and L (1 L = 1,000 mL). Count: pcs to pcs only.

- Reject mixed categories such as kg versus mL; never silently assume food density.

- Purchased and used quantities must be positive; purchase price must be non-negative; servings must be a positive whole number.

- For this MVP, a single purchase row must not use more than the purchased quantity. If it represents multiple packs, increase the purchased quantity or split into rows.

- Markup cannot be negative; support values above 100% when needed instead of limiting the owner to 35–40%.

- Store exact calculation snapshots. Use decimal-safe arithmetic (e.g., decimal.js) or integer centavos, not unconstrained floating-point math for money.

#### 3.4 Rounding convention

Round individual ingredient costs to the nearest centavo (half up); sum rounded line amounts; compute and round tubo to centavos; add it to get the exact selling price. Optional round-up increments: no rounding, ₱5, or ₱10. Show the unrounded and rounded values when the option is active.

### 4. Recommended technology and architecture

| Layer | Technology | Why it fits |
| --- | --- | --- |
| UI | React + TypeScript | Component-based forms with safer data shapes. |
| Build | Vite | Simple fast project setup and development. |
| Styling | Tailwind CSS | Responsive utility classes for mobile layout. |
| Components | shadcn/ui + Lucide | Accessible form controls, cards, dialogs and icons. |
| Routing | React Router | Login, home, calculator, and history screens. |
| Forms | React Hook Form + Zod | Dynamic fields and clear validation. |
| Money | decimal.js | Stable money math and predictable rounding. |
| Data | Supabase PostgreSQL | Managed records, relational items, constraints. |
| Auth | Supabase Auth | Managed email/password sign-in and sessions. |
| Tests | Vitest + Playwright | Calculation tests and mobile workflow tests. |
| Deployment | Netlify or Cloudflare | Static frontend hosting; verify limits and terms. |

#### 4.1 How the pieces connect

```text
Mobile browser / desktop browser
    → React pages + Tailwind / shadcn components
    → calculator module (preview math + validation)
    → Supabase Auth (sign-in)
    → Supabase API + PostgreSQL (costings + ingredient items)
    → Row Level Security (authorized access to records)
```

#### 4.2 Security and hosting boundaries

- No custom Node/Express server is necessary initially. Use Supabase client SDK with an approved public/publishable key and RLS.

- Never place the Supabase service-role/secret key in browser code, in VITE_* variables, or in Git.

- Use HTTPS, environment variables, and private owner-only data policies; do not rely only on hidden UI buttons.

- For real business use, avoid Vercel Hobby: its free Hobby plan is restricted to non-commercial personal projects. Consider Netlify/Cloudflare subject to their current terms and limits.

#### 4.3 Approximate cost guidance

Local coding, React, Vite, Tailwind, and shadcn/ui are free to start. Supabase has a limited free tier suitable for initial development/testing, but production availability, capacity, and pricing should be reviewed. A custom domain is optional and usually costs extra.

### 5. Data model and authorization

#### 5.1 Proposed database tables

| Table | Essential fields | Purpose |
| --- | --- | --- |
| costings | id, owner_id, food_name, servings, markup_pct, total_cost_centavos, profit_centavos, exact_price_centavos, rounded_price_centavos (nullable), rounding_step, created_at, updated_at | One saved order/recipe costing. |
| costing_items | id, costing_id, ingredient_name, purchased_qty, purchased_unit, purchase_price_centavos, used_qty, used_unit, line_cost_centavos, sort_order | Snapshot of ingredients entered for a costing. |
| user_settings | user_id, default_markup_pct, rounding_step, updated_at | Owner preferences; one row per user. |

#### 5.2 Relationships and constraints

- One costing has many costing_items; delete dependent items when an owned costing is deleted (ON DELETE CASCADE).

- Link owner_id/user_id to Supabase Auth user identity. Add appropriate indexes for owner_id, costing_id, and created_at.

- Require a nonempty food name and at least one valid ingredient to save; require positive quantity and servings.

- Check numeric bounds and units in the database where practical. Preserve historical input prices and quantities in each saved record.

- Prefer one validated transactional database RPC for saving a costing and all ingredient items atomically; the database should verify ownership and recompute/validate totals so tampered browser values cannot be trusted.

#### 5.3 Row Level Security (RLS) plan

| Operation | Rule |
| --- | --- |
| Read | Only signed-in users can read costings they own and their ingredient items. |
| Create | Each new costing is assigned to auth.uid(); rows for other owners are rejected. |
| Update | Owner can update their own costing and its items only. |
| Delete | Owner can delete their own costing only, with confirmation in the UI. |
| Preferences | Each user can read/write only their own settings. |

OWNERSHIP NOTE

For a single owner this is straightforward. If multiple staff later need shared access to all company costings, introduce an explicit business/workspace membership model. Do not weaken RLS to make records public.

### 6. Codex development sequence

Build vertically: confirm one feature works, test it, then move on. Do not request the entire system in a single Codex prompt.

| Phase | Work and expected deliverable | Acceptance checkpoint |
| --- | --- | --- |
| 0 — Setup | Initialize Git/Vite/TypeScript; install CSS/UI libs; create AGENTS.md and README. | App runs locally; lint/build work. |
| 1 — UI | Create responsive Login, Home, New Costing, Result, History, Settings shells with sample data. | 390px mobile and desktop layouts are readable; navigation works. |
| 2 — Calculator | Create dynamic ingredient rows, unit conversion, markup calculation and result summary. | Known formula examples pass automated tests. |
| 3 — Form quality | Add Zod validation, numeric formatting, error/empty states, accidental remove confirmation where needed. | Invalid/blank units and quantities handled safely. |
| 4 — Data/auth | Configure Supabase Auth, schema, RLS policies and settings. | Owner signs in; user cannot read or change another owner’s data. |
| 5 — History CRUD | Transactional save/edit, history search, record detail, delete confirmation. | Saved data survives refresh; operations behave correctly. |
| 6 — QA/deploy | Unit and mobile E2E tests; accessibility/performance checks; deploy & owner acceptance. | Critical tests pass; live HTTPS app works on owner’s phone. |

#### 6.1 Proposed repository layout

```text
trugen-costing/
  AGENTS.md                 # permanent rules for Codex
  README.md                 # setup and usage
  .env.example              # placeholder variables only
  docs/                     # requirements and decisions
  src/
    app/                    # routes and auth provider
    components/             # shared UI and IngredientCard
    features/costing/       # form, calculations, validation
    features/history/       # saved record views
    lib/                    # Supabase client and money helpers
    test/                   # test helpers and fixtures
  supabase/migrations/      # versioned schema and RLS
  tests/e2e/                # mobile browser workflows
```

### 7. Quality assurance and owner acceptance

#### 7.1 Minimum testing matrix

| Test case | Expected result |
| --- | --- |
| 1 kg, ₱120, use 0.5 kg | Ingredient line shows ₱60.00. |
| 500 g, ₱90, use 0.2 kg | Ingredient line shows ₱36.00. |
| ₱650 puhunan, 35% tubo | Tubo ₱227.50; exact selling price ₱877.50. |
| Round up to nearest ₱10 | Rounded selling price ₱880.00; exact price retained. |
| Servings = 10, cost ₱650 | Cost per serving ₱65.00. |
| Remove one ingredient | Totals update immediately and correctly. |
| Blank, zero, negative or incompatible units | Clear errors; invalid costing cannot be saved. |
| Refresh after saving | Record persists in history with original inputs. |
| Edit saved costing | Updated calculations persist without duplicates. |
| Delete record | Confirmation appears; record and its items are removed. |
| Signed-out / another account | No unauthorized costing data is exposed. |
| Mobile 390px viewport | Input fields, keyboard, buttons and result are usable. |

#### 7.2 Nonfunctional checklist

- Accuracy: 2-decimal PHP money display; consistent centavo rounding; client and database calculation agreement.

- Usability: ideally fewer than a dozen meaningful taps to start and save a simple one-ingredient costing (excluding data typing).

- Security: HTTPS, RLS tests, no public signup by default, no exposed secrets, sign-out/session behavior.

- Reliability: loading/error states; no duplicate save on double taps; clear network failure retry.

- Compatibility: Android Chrome and desktop Chrome/Edge; test an iPhone browser if available.

- Data safety: production backups/recovery policy, migration version control, export strategy in later release.

#### 7.3 Business acceptance questions

Have the owner test three real recipes or orders. Ask: (1) Are the ingredient units enough? (2) Does the system agree with hand-checked ingredient calculations? (3) Are the labels Puhunan, Tubo, and Selling Price immediately understandable? (4) Is the workflow faster than manual costing? (5) Does the saved history help with repeat orders?

### 8. First Codex prompt — copy and paste

Use this first, in Codex Plan mode if available, with the new project folder open. Ask Codex to produce a short implementation plan before writing the complete application.

```text
PROJECT: TRUGEN FOODS — Mobile Costing Calculator

Act as a senior React/TypeScript engineer and UI/UX developer.
We are building a mobile-first web app for a Filipino food business owner.

READ THIS PRODUCT BRIEF:
- Login; Home; New Costing; live Costing Result; History; Settings.
- Owner inputs food name, positive servings, and dynamic ingredient rows.
- Each row: ingredient name, purchased quantity + unit,
  purchase price (PHP), actual used quantity + compatible unit.
- Convert kg/g and L/mL; pcs only with pcs.
- Ingredient cost = purchase price / purchased base quantity
  * used base quantity.
- Puhunan = sum of ingredient line costs.
- Tubo = Puhunan * markup percent / 100.
- Selling Price = Puhunan + Tubo; optional round UP to ₱5 or ₱10.
- Show cost per serving and selling price per serving.
- Save/view/edit/delete costing and ingredient snapshots.
- Default assumption: one owner; no public signup or inventory tracking.

PREFERRED STACK:
React + TypeScript + Vite; Tailwind; shadcn/ui; React Router;
React Hook Form + Zod; decimal.js; Supabase Auth/PostgreSQL/RLS;
Vitest + Playwright. Mobile first (390px reference width).

WORK RULES:
1. First inspect the existing repository. Do not overwrite useful files.
2. Before coding, provide a staged implementation plan with file paths.
3. Implement PHASE 0 ONLY in this task: initialize the app (if needed),
   design tokens, routing skeleton, README, AGENTS.md, test setup.
4. Do not create real Supabase credentials or production data.
5. Keep code clean and reusable; no unnecessary dependencies.
6. Run available lint, typecheck, tests and build; report results.
7. Summarize files changed, commands run, and the next phase.
```

#### 8.1 Example AGENTS.md content

```text
# TRUGEN FOODS — Codex Project Rules
- Purpose: mobile-first costing calculator for a small food business.
- Stack: React, TypeScript, Vite, Tailwind, shadcn/ui, Supabase.
- Keep pages simple; owner workflow is the priority.
- Prefer small, accessible reusable components.
- Use PHP (₱) and decimal-safe money calculations.
- Profit percentage is MARKUP ON COST, not revenue margin.
- Support kg/g, L/mL, and pcs with compatible-unit checks.
- Never trust browser-supplied prices/totals without server checks.
- Never commit .env files or use secret/service-role keys in UI.
- Enforce Supabase row ownership through RLS.
- Add tests for math and any changed critical flow.
- Run typecheck/lint/tests/build; report failures honestly.
- Do not add inventory, billing, POS or unnecessary modules.
```

### 9. Follow-up Codex prompts by phase

#### Prompt A — mobile UI

```text
Implement Phase 1 from the TRUGEN FOODS development plan.
Build polished mobile-first layouts for Login, Home, New Costing,
Result section, History and Settings using sample data only.
Use green/cream design tokens, responsive cards, touch-friendly fields,
clear ₱ values, bottom navigation and empty/loading states.
Do not integrate Supabase yet. Verify at 390px and desktop widths.
Run checks and summarize what changed.
```

#### Prompt B — calculator engine

```text
Implement Phase 2 only. Add dynamic ingredient rows and a pure,
unit-tested calculation module using decimal.js. Support kg/g,
L/mL and pcs, money rounding to centavos, cost markup (not margin),
and optional price round-up. Display instant totals and per-serving
figures. Test the ₱120/1kg/0.5kg, ₱650/35%, and ₱877.50→₱880
examples plus error cases. Do not add database writes yet.
```

#### Prompt C — authentication, database and records

```text
Implement Phases 4–5 in reviewable tasks, one step at a time.
First propose migrations for costings, costing_items, user_settings,
indexes, constraints and strict Supabase RLS policies. After review,
implement owner login and transactional save/edit of an entire
costing, then history/read/delete. Validate ownership and amounts
on the server/database. Do not expose secret keys. Add RLS and
integration tests; show any manual Supabase setup required.
```

#### Prompt D — release readiness

```text
Complete Phase 6. Audit the mobile costing workflow,
calculation accuracy, error states, auth/RLS, keyboard usability,
accessibility and safe deployment configuration. Run unit,
end-to-end, lint, typecheck and build checks. Provide a short
release checklist, unresolved issues and owner acceptance steps.
Do not claim tests passed unless you ran them.
```

#### 9.1 First work session checklist

- Create a project folder and Git repository; open it in Codex.

- Paste the first prompt above and approve the proposed phased plan.

- Check the scaffolded app in a browser at approximately 390px width.

- Move to Phase 1 for design, then Phase 2 for calculator accuracy; connect Supabase only after those pass.

### 10. Official technical references and decisions

These sources are for setup validation and implementation guidance. Dependencies, free-tier limits, and platform policies can change; re-check them before production launch.

Vite / React TypeScript starter: https://vite.dev/guide/

Tailwind CSS installation for Vite: https://tailwindcss.com/docs/installation/using-vite

shadcn/ui with Vite: https://ui.shadcn.com/docs/installation/vite

Supabase + React guide: https://supabase.com/docs/guides/auth/quickstarts/react

Supabase Row Level Security guide: https://supabase.com/docs/guides/database/postgres/row-level-security

Vitest guide: https://vitest.dev/guide/

Playwright introduction: https://playwright.dev/docs/intro

Codex best practices and AGENTS.md: https://learn.chatgpt.com/guides/best-practices

Supabase plan/billing information: https://supabase.com/docs/guides/platform/billing-on-supabase

Netlify plans: https://www.netlify.com/pricing/

Cloudflare Pages overview: https://developers.cloudflare.com/pages/

Vercel Hobby restriction (commercial use): https://vercel.com/docs/plans/hobby

#### Decision log before development

| Decision | Current baseline | Who confirms |
| --- | --- | --- |
| User accounts | Owner-only / invitation-based | Business owner |
| Price meaning | 35% markup on cost | Business owner |
| Purchase quantity rule | Single purchase line; use ≤ purchased amount | Business owner |
| Allowed units | kg, g, L, mL, pcs | Business owner |
| Rounding | No round, upward ₱5 or ₱10 | Business owner |
| Extra expenses | Deferred to later release | Business owner |
| Launch hosting | Evaluate Netlify/Cloudflare plus Supabase | Developer + owner |

#### 10.1 Quick-start local commands

```text
npm create vite@latest trugen-costing -- --template react-ts
cd trugen-costing
npm install
npm install tailwindcss @tailwindcss/vite
npm install @supabase/supabase-js react-router-dom react-hook-form zod @hookform/resolvers decimal.js lucide-react
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @playwright/test
# Then follow the current shadcn/ui Vite setup guide
npm run dev
```

Prerequisite: install a compatible current Node.js LTS release and Git. Codex should verify package versions and installation instructions at implementation time.

### Source header and footer

- `word/header1.xml`: TRUGEN FOODS  /  DEVELOPMENT PLAN
- `word/footer1.xml`: Planning document  •  04 November 2026     |     Page 1

Footer field instruction: `PAGE`; cached displayed value: `1`. Word updates this page number during pagination.

<!-- SOURCE_EXTRACTION_END -->
