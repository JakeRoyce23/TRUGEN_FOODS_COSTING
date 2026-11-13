# Phase 4 migration deployment review

Reviewed: 05 November 2026. Intended hosted project: **`jueboylmczhlkrjtdjva`** (TRUGEN FOODS).

## Current status

The owner reports initial Supabase setup and two Dashboard-created application accounts. Supabase CLI **3.0.0** is now pinned as a project development dependency and `supabase init` completed locally. The migration and application calculations are unchanged. All **38 local PostgreSQL/security tests passed** again.

**The owner explicitly approved the migration, and deployment completed successfully on 05 November 2026.** The target is TRUGEN FOODS, reference `jueboylmczhlkrjtdjva`, region `ap-southeast-1`. The exact linked reference, single migration inventory and approved SHA-256 were checked immediately before deployment. Remote commands identify this target as **production**.

Only `202611050001_costings.sql` was applied; no seeds, custom roles or Vault updates were included. Local and remote migration history both show `202611050001`. No migration errors occurred. Deployed schema/security and hosted SQL role tests passed. Subsequent final acceptance passed both-account Auth/logout, real OWNER browser CRUD/refresh, two-account UI/API isolation, anonymous/direct-write denial and zero-residue cleanup. Phase 4 is complete; Phase 5 has not started. No credentials are recorded here.

## Deployment and verification result

Approved command, executed once:

```powershell
.\node_modules\.bin\supabase.cmd db push --remote=jueboylmczhlkrjtdjva --skip-vault --yes
```

Result: exit code 0; `dryRun: false`; `migrations: ["202611050001_costings.sql"]`; `seeds: []`; `roles: []`; message `Finished supabase db push.` The `--yes` flag supplied the owner's explicit migration approval to the noninteractive CLI.

Read-only `scripts/phase4-postflight.sql` verified two RLS-enabled tables, four indexes, 26 validated CHECK/key/foreign-key/unique constraints, four SECURITY DEFINER public RPCs with empty search paths and authenticated-only browser execution, six inaccessible private helpers, and the two expected owner policies. Authenticated table access is SELECT only; anonymous table access and direct writes are denied. Both existing Auth users' count and ID/update-time fingerprint match their predeployment values.

Live HTTP checks confirmed anonymous SELECT on both tables and anonymous history RPC calls fail with `42501`. Auth settings now report public signup disabled, email login enabled and anonymous sign-in disabled; no Auth settings were changed by the agent.

`scripts/phase4-security-check.sql` was validated locally, then executed on hosted PostgreSQL under the owner's testing authorization. It uses the two existing user IDs with explicit authenticated/anonymous role contexts, verifies the full approved financial example, retry/read/edit/delete/cascade and denied foreign-account/direct-write operations, then rolls back the entire transaction. All assertions passed (exit 0). Follow-up reads found zero costing/ingredient test records and the same two Auth users/fingerprint. **This is real hosted SQL enforcement testing, not password authentication or committed browser/API persistence testing.**

The private test-account fields are configured. The two-account HTTP script was attempted but stopped at OWNER authentication before creating records. OTHER account login and a separate committed browser CRUD workflow passed. Correct the private OWNER values and confirm before retrying. Continue with [PHASE4_LIVE_ACCEPTANCE.md](PHASE4_LIVE_ACCEPTANCE.md). Do not mark Phase 4 complete yet.

The new preflight SQL was also executed successfully inside read-only transactions before and after applying the migration to an isolated local PGlite database. It detected the ten application functions and both RLS-enabled tables after migration. This validates the inspection query locally; it does not establish the hosted project's contents. Final hashes of the migration and `src/features/costing/calculations.ts` match their pre-review values.

## Predeployment remote inspection and dry-run evidence (historical)

All commands used the installed CLI **3.0.0** on 05 November 2026. Remote SQL queries used `--read-only`.

| Check | Observed result |
| --- | --- |
| CLI authentication | `projects list --output json` succeeded and returned the intended healthy TRUGEN FOODS project. The initial listing noted there was no local link yet; linking subsequently resolved that notice. |
| Link and target | `link --project-ref jueboylmczhlkrjtdjva` succeeded. Saved local reference matches exactly. Remote inspection/history/dry run identify TRUGEN FOODS and environment `production`. |
| Database | PostgreSQL **17.11**; `auth.users`, `auth.uid()`, `anon` and `authenticated` exist. |
| Public relations | No public tables, partitioned tables, views, materialized views, indexes or sequences were returned. |
| Functions and policies | No public functions, TRUGEN private functions, or policies in public/trugen_private were returned. |
| Private schema | `trugen_private` does not exist. |
| Migration history | History table absent at preflight; migration list shows local version `202611050001` with an empty remote version. |
| DDL event triggers | Six existing extension/PostgREST watchers were inspected, including their function definitions and event tags. Extension handlers are restricted to CREATE/DROP EXTENSION, neither used by this migration. `pgrst_ddl_watch` sends schema-reload notifications; `pgrst_drop_watch` handles drops, which this migration does not perform. No unrelated data-changing behavior applicable to this migration was found. |
| Dry run | Exit code **0**, `dryRun: true`; exactly one pending migration, empty seed and custom-role lists. No errors, conflicting objects, or migration warnings reported. |

Executed dry-run command:

```powershell
.\node_modules\.bin\supabase.cmd db push --remote=jueboylmczhlkrjtdjva --dry-run --skip-vault
```

Relevant output, with no credentials:

```text
Target: project TRUGEN FOODS (jueboylmczhlkrjtdjva) · production
Initialising login role...
DRY RUN: migrations will *not* be pushed to the database.
Would push these migrations:
 • 202611050001_costings.sql
```

Structured result:

```json
{
  "upToDate": false,
  "dryRun": true,
  "migrations": ["202611050001_costings.sql"],
  "seeds": [],
  "roles": [],
  "message": "Finished supabase db push.",
  "target": {
    "kind": "linked",
    "project_ref": "jueboylmczhlkrjtdjva",
    "project_name": "TRUGEN FOODS",
    "environment": "production"
  }
}
```

“Initialising login role...” is CLI connection preparation, not an application migration. Read-only query responses also include the CLI's standard reminder to treat returned database content as untrusted; that is not a schema/security failure. The successful dry run establishes the pending-file plan, not successful execution of the SQL on hosted PostgreSQL. Live constraints/RLS/Auth/CRUD acceptance remains after approved deployment.

## Exact proposed migration scope

Only one local migration exists: [`202611050001_costings.sql`](../supabase/migrations/202611050001_costings.sql), version `202611050001`.

SHA-256 of the reviewed file:

`8FDC5C8E26D9B0EE20AAE603C97DC409CDB7D016714DBD01F7A7E349968B3EC0`

| Object/action | Exact scope |
| --- | --- |
| New private schema | `trugen_private`; revoke schema access from PUBLIC, anon and authenticated. |
| Six private helpers | `half_up(numeric,numeric)`, `money_text(numeric)`, `decimal_input(jsonb,integer,boolean)`, `unit_factor(text)`, `unit_category(text)`, `document(uuid)`. Revoke browser execution of these helpers. |
| New parent table | `public.costings`: UUID key, owner FK to `auth.users(id)` with DELETE RESTRICT, snapshot/order inputs, NUMERIC financial values, timestamps, retry UUID and version. |
| New ingredient table | `public.costing_ingredients`: UUID key, parent FK with DELETE CASCADE, input-price/quantity snapshots and calculated line cost. |
| Indexes | Primary-key indexes on both tables, unique `(costing_id, sort_order)`, explicit `costings_owner_created_idx`. |
| Constraints | Required names and fields, positive quantities/integer servings, nonnegative prices/markup, quantity precision 6 decimals, markup precision 2, finite numeric inputs, supported compatible units, usage ≤ purchased, exact calculated line/summary relationships, supported rounding options. Money stored as whole centavos. |
| RLS | Enable on both new tables; `costings_owner` and `ingredients_owner` policies for authenticated owner access, with USING and WITH CHECK. |
| Table privileges | Revoke all PUBLIC/anon/authenticated access on the two new tables; grant authenticated SELECT only. Direct browser writes remain denied. |
| Four public RPCs | `trugen_get_costing(uuid)`, `trugen_list_costings(text,integer)`, `trugen_save_costing(uuid,uuid,integer,jsonb)`, `trugen_delete_costing(uuid,integer)`. Execute granted only to authenticated among browser/PUBLIC roles. |
| Transaction | BEGIN/COMMIT around the migration; no DROP, TRUNCATE, CREATE OR REPLACE, data backfill or top-level data mutation. |

On actual deployment, the CLI also manages its own `supabase_migrations.schema_migrations` tracking metadata and records the applied migration version. This CLI bookkeeping is separate from the application SQL. Seeds, custom-role deployment, Vault synchronization, and configuration pushes are excluded from the proposed command.

## Safety and authorization findings

- The migration creates new objects, then changes privileges/RLS only on those new objects. It contains no changes to unrelated application tables, existing Auth user rows, Auth settings, Storage, or existing schema-wide default privileges. Its FK adds a dependency on `auth.users` and intentionally prevents future deletion of an account while it owns saved costings.
- Existing names are not silently reused or overwritten: a pre-existing `trugen_private` schema, conflicting table/index, or matching function signature causes failure. Do not resolve conflicts by dropping objects, adding `IF NOT EXISTS`, repairing history, or blindly re-running this initial migration. Inspect existing state first.
- DELETE/INSERT/UPDATE statements inside the save/delete function bodies define later application behavior; installing those functions does not execute those statements. Save replaces only the selected owned costing's ingredients atomically. Delete checks owner/revision and cascades only its dependent ingredients. Neither is invoked during deployment.
- RLS restricts direct reads; direct writes are denied at the privilege layer. SECURITY DEFINER RPCs can bypass table RLS as their owning role, so explicit `auth.uid()`/owner checks are essential and present on every public entry point. Empty search paths and schema-qualified application references avoid search-path hijacking; no dynamic SQL or caller-supplied owner/totals are trusted.
- Parent totals/required children are enforced through the validated atomic save RPC, not a cross-table CHECK constraint. Privileged administrators can bypass browser restrictions; do not grant browser direct writes or use privileged keys in the frontend.
- Constraints and SQL math follow D01–D05. Exact and optionally rounded prices/profit/per-serving values remain separate. Invalid input precision is rejected, not silently rounded. The migration does not modify the client calculator.
- **Static review cannot certify the existing hosted database.** A read-only catalog check must establish absence of name collisions and inspect any enabled DDL event triggers, which can execute during object creation. The CLI dry run lists pending migration files; it is not a SQL execution/rollback rehearsal and does not prove the constraints or RLS work in the hosted service.

## CLI preparation and private login

Run these commands in your own PowerShell terminal:

```powershell
Set-Location -LiteralPath 'C:\Users\Jayson G. Abrenica\Desktop\TRUGEN-FOODS'
.\node_modules\.bin\supabase.cmd login
```

CLI sign-in is already complete in this workspace. For a fresh setup, complete the sign-in flow privately. If it requests a personal access token, provide it only to your local CLI prompt. Do not place it in frontend `VITE_*` variables or paste it into chat.

The initialized `supabase/config.toml` is local configuration, not proof of a hosted link. Its local Auth signup flag is disabled, local Site URL uses port 5173, seed execution is disabled, and no Vault secrets are configured. Do not push this generated configuration to the hosted project. CLI cache/branch/environment files are ignored by Git.

## Link, inspect, and dry run — no migration application

These commands target the exact project explicitly. CLI v3 database commands default to local targets; this workflow uses `--remote=<reference>` deliberately, as documented in the [Supabase v3 migration guide](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3).

```powershell
.\node_modules\.bin\supabase.cmd link --project-ref jueboylmczhlkrjtdjva
.\node_modules\.bin\supabase.cmd db query --remote=jueboylmczhlkrjtdjva --read-only --file scripts/phase4-preflight.sql
.\node_modules\.bin\supabase.cmd migration list --remote=jueboylmczhlkrjtdjva
.\node_modules\.bin\supabase.cmd db push --remote=jueboylmczhlkrjtdjva --dry-run --skip-vault
```

Stop at any error and review it. The preflight reads catalog metadata only and checks required roles/Auth objects, existing public relations/application functions, private schema presence and DDL event triggers. Inspect trigger definitions if any could affect application object creation. Never treat a mismatch or missing permissions as a reason to weaken RLS.

The executed remote history check and dry run confirm the pending file is `202611050001_costings.sql`. No other local migration exists. Preserve the reviewed file hash and recheck pending files if the database or local migrations change before deployment. If tables appear because SQL Editor was used meanwhile, stop for reconciliation; do not force or repair history automatically.

## Approval checkpoint

After the catalog check and dry run succeed, present the exact pending filenames, target project, reviewed file hash, any existing-object/trigger findings, and expected changes above. Then ask:

> Do you approve applying `202611050001_costings.sql` to project `jueboylmczhlkrjtdjva`, creating the reviewed tables, functions, indexes, constraints and access policies?

This checkpoint came from the owner's explicit instruction: **“After the dry run, stop and request my explicit approval before deploying the migration to the hosted Supabase database.”** The agent stopped, presented the dry run, and the owner subsequently explicitly approved this exact migration/target. That approval was used for the successful deployment recorded above. It does not authorize unrelated configuration changes, resets, seeds, history repair or Phase 5.

## After approval and successful deployment

1. Verify the migration history, both tables/constraints, enabled RLS, policies, table grants, public RPC execution grants and private-helper restrictions using read-only queries.
2. Use the two privately configured accounts for the existing opt-in `scripts/verify-supabase.mjs` checks described in [SUPABASE_SETUP.md](SUPABASE_SETUP.md). The script creates/edits/deletes only its disposable generated verification record and checks owner/anonymous restrictions; never delete legitimate costings.
3. Verify real browser login, wrong-password feedback, refresh/session restore, the approved ₱650 example, save/view/search/edit/delete, and logout/protected routes. Distinguish API checks from browser checks in the progress record.
4. Record executed results and remaining physical-device/owner acceptance. Do not begin Phase 5.
