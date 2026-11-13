# Phase 4 database and security review

Prepared 05 November 2026 before migration implementation. The latest owner request authorizes authentication and the full costing record lifecycle in Phase 4, bringing forward the baseline Phase 5 CRUD work. No hosted changes or deployment are authorized by this document.

## Design

- `costings`: UUID, `auth.users` owner, food name, NUMERIC servings/markup, rounding choice (`none`, `5`, `10`), NUMERIC integer-centavo totals/profit/per-serving amounts, creation/update times, revision, last request UUID, and input snapshot for safe request replay.
- `costing_ingredients`: UUID, parent costing with cascade deletion, stable row order, ingredient name, NUMERIC purchase/use quantities, compatible units, NUMERIC integer-centavo purchase/line cost. Rows retain historical purchase data; there is no ingredient catalogue or inventory.
- NUMERIC has no fixed typmod: CHECK constraints and RPC validation reject excess precision instead of PostgreSQL silently rounding inputs to a declared scale. No arbitrary business quantity or money maximum is introduced. PostgreSQL's intrinsic numeric limits still apply.
- Money remains whole centavos in NUMERIC columns, consistent with D01 and the original plan. RPC reads serialize money as two-decimal PHP strings and all quantities/percentages/servings as strings, avoiding JavaScript Number precision loss. Integer quotient/remainder half-up arithmetic avoids early division rounding.
- Only two tables are needed for this request. Persistent preference settings remain deferred; the existing screen will explicitly label its preview and show the real signed-in account.

## Security and consistency

- RLS enabled on both tables; authenticated ownership policies cover SELECT/INSERT/UPDATE/DELETE, with child ownership derived from its parent.
- Browser roles receive SELECT only on tables. Direct INSERT/UPDATE/DELETE and table-level mutation are denied, even on owned records. This is deliberate: ownership policies alone cannot guarantee a complete, consistently calculated order.
- Authenticated clients call narrow save/read/list/delete RPCs. Mutation RPCs use SECURITY DEFINER, an empty search path, schema-qualified references, an explicit `auth.uid()` check and ownership validation. Anonymous execution is revoked. Private helpers are not exposed.
- Save validates every field and recomputes every amount in the database before committing parent and children in one transaction. Client-calculated totals are never trusted. Rejected updates roll back all changes.
- Each form retains a costing UUID and request UUID for retries. Matching retries return the confirmed record without a duplicate; mismatched reused requests are rejected. A revision precondition rejects stale edits. A transaction lock serializes operations for a costing, including concurrent creation attempts.
- Delete requires an owned record and the displayed revision, then cascades its ingredient rows. The UI confirms the named record. No automatic deletion or bulk operation exists.
- Deleting an Auth user with existing costings is restricted by the owner foreign key. Account removal must not silently cascade through legitimate costing history; only explicit costing deletion cascades its ingredient rows.
- History uses newest-created-first ordering with an ID tie-break, literal case-insensitive food-name matching, and pages of 50. Dates display in Asia/Manila. These resolve the requested history ordering/search without adding analytics.

## Review outcome and verification plan

The design preserves D01–D05, addresses direct API bypass, partial saves, duplicate retries, precision loss, foreign-owner mutations, and stale edits. It uses the existing pure client calculator and adds a database enforcement boundary rather than replacing it. Schema files may now be prepared and tested locally under the owner's Phase 4 instruction. Applying them to a hosted database remains a separate owner-reviewed setup action.

Test the actual SQL on an isolated PostgreSQL engine with local Auth fixtures when available; distinguish these checks from a Supabase service test. Test client SDK/network behavior with explicit mocks. Live Auth, PostgREST, deployed grants/RLS, and browser-to-project integration must be verified after the owner configures a project. Never report those as passed without execution.

Official references: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions and execution privileges](https://supabase.com/docs/guides/database/functions), [publishable versus secret keys](https://supabase.com/docs/guides/api/api-keys).
