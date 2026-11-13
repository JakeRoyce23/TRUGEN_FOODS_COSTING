# Connect TRUGEN FOODS to Supabase

Phase 4 code and migrations are implemented and tested locally. On 05 November 2026 the owner supplied the project reference and publishable key. They are configured in the ignored `.env.local`; the verified project URL is `https://jueboylmczhlkrjtdjva.supabase.co`. The supplied `.supabase.com` hostname did not resolve, so it was corrected after the `.co` Auth endpoint accepted the provided key.

**Final Phase 4 update, 05 November 2026:** Following explicit owner approval, migration `202611050001_costings.sql` was applied successfully to `jueboylmczhlkrjtdjva`. Both tables, ten functions, constraints, RLS and privileges were verified. Two Auth users were preserved; public signup and anonymous login are disabled. Both-account Auth/logout, real OWNER browser CRUD/refresh, two-account UI/API isolation, anonymous/direct-write denial, financial agreement, password recovery and cleanup passed. See [PHASE4_LIVE_ACCEPTANCE.md](PHASE4_LIVE_ACCEPTANCE.md) for evidence. Do not rerun initial setup or reapply the migration. Never share passwords, secret keys or session tokens in chat.

## 1. Create or select the project

1. Sign in to the [Supabase Dashboard](https://supabase.com/dashboard) using your own account. Create a project for TRUGEN FOODS, or select the intended existing project. Keep its database password in your password manager.
2. Review [PHASE4_DATABASE_REVIEW.md](PHASE4_DATABASE_REVIEW.md) and `supabase/migrations/202611050001_costings.sql`. The migration adds `costings`, `costing_ingredients`, a private helper schema, and four application RPCs. It does not delete existing application tables. It fails rather than overwriting same-named objects.
3. Before applying anything to an existing database, confirm the project and review its existing objects/backups. Do not apply this migration blindly to a project containing unrelated tables with these names. Ask for a migration review if they exist. The agent will require your approval before making hosted changes.

## 2. Configure owner-only authentication

1. In Authentication settings, enable email/password sign-in and **disable new public user signups**. Also leave anonymous sign-ins and unused providers disabled. This is essential: hiding a signup form is not a substitute for the service setting.
2. In Authentication → Users, use the Dashboard's **Add user / Create user** action to create the owner's email and a strong unique password. Mark the email confirmed using the Dashboard's confirmation option if available; otherwise complete its confirmation process. Do not use a public signup endpoint.
3. Store and deliver the owner's password privately. Never put it in a `VITE_*` variable, source code, Git, or chat. There is no application admin/registration module.
4. Use Site URL `http://127.0.0.1:5174` and allow redirect `http://127.0.0.1:5174/reset-password`. Both hosted values were verified read-only after the owner's update. Local Vite uses port 5174; mocked browser tests use port 5178.
5. Password recovery is now implemented at `/forgot-password` and `/reset-password`. Follow [PASSWORD_RECOVERY.md](PASSWORD_RECOVERY.md) for the email-template check, safe link handling, and private two-account reset walkthrough. Real password changes and email delivery remain owner acceptance steps; the agent did not change existing Auth users.

The application admits valid Supabase accounts and isolates each account's records. Create only authorized owner accounts. It does not provide shared staff records or business roles.

## 3. Apply the reviewed migration

**Already completed for this project:** the owner approved the reviewed migration after the successful CLI dry run, and deployment succeeded. [PHASE4_MIGRATION_DEPLOYMENT.md](PHASE4_MIGRATION_DEPLOYMENT.md) preserves the review and results. The SQL Editor steps below are reference instructions for a fresh project only; do not apply the migration again here or repair its history unnecessarily.

1. Open SQL Editor in the confirmed project.
2. Create a new query, paste the complete contents of `supabase/migrations/202611050001_costings.sql`, and review it before clicking Run. It is a single transaction; if any statement fails, stop and investigate rather than removing security checks.
3. Keep the migration file as the version-controlled source of truth. Apply it once. Do not rerun it to update a populated database; future changes need a new migration.
4. Verify that both application tables have RLS enabled. Browser roles should have SELECT only on the tables. Only `authenticated` should execute the four public `trugen_*` RPCs. The SQL Editor normally runs with privileges that bypass RLS, so a successful query there is **not** proof of owner isolation.
5. Keep the default `public` Data API schema available; do not expose `trugen_private`. Never grant browser roles direct writes to these tables just to resolve an application error.
6. The owner foreign key prevents deleting an Auth account that still owns costings. Review and preserve its legitimate records before any account-removal procedure; do not drop this constraint as a shortcut. Deleting an individual costing cascades only that costing's ingredients.

These read-only checks help inspect configuration:

```sql
select schemaname, tablename, rowsecurity
from pg_tables where schemaname = 'public'
and tablename in ('costings', 'costing_ingredients');

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where tablename in ('costings', 'costing_ingredients');

select grantee, table_name, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and table_name in ('costings', 'costing_ingredients');
```

## 4. Configure the browser application locally

1. Find the project's URL and **publishable** API key in its Connect/API Keys panel. Use an `sb_publishable_...` key. Secret keys (`sb_secret_...`), service-role keys, database passwords, and account passwords do not belong in the frontend.
2. For a fresh checkout, copy `.env.example` to `.env.local` in the project root. This workspace already has the supplied public configuration; do not overwrite it with placeholders. `.gitignore` excludes `.env.local` and other local environment files.
3. Edit only your local file:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REFERENCE.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SB_PUBLISHABLE_KEY
```

4. Run `npm.cmd install`, then `npm.cmd run dev` in Windows PowerShell. Open the printed Vite URL. Restart Vite after changing environment variables.
5. Sign in using the owner account. With missing or invalid configuration, the application shows setup guidance and disables login; it does not fall back to fake authentication.

The publishable key is intentionally public; [RLS and authenticated privileges protect records](https://supabase.com/docs/guides/api/api-keys). Auth session tokens are managed by the official SDK in browser storage. Use a trusted device, log out on shared devices, and keep the device/browser secure. The SDK refreshes valid sessions; expired or rejected sessions return to login. Server logout revokes refresh sessions, but already issued access tokens can remain valid until their expiry as described in [Supabase sign-out documentation](https://supabase.com/docs/reference/javascript/auth-signout).

## 5. Verify the real connection

After configuration, perform this owner acceptance flow:

1. Try an incorrect password; confirm an error, then log in successfully. Refresh a protected page to verify session restoration.
2. Create the approved example: 1 kg purchased for 1300, 0.5 kg used, 10 servings, 35% markup, upward rounding to ₱10. Confirm ₱650.00 Puhunan, ₱227.50 Tubo, ₱877.50 exact total, ₱87.75 exact/serving, ₱880.00 rounded total, ₱88.00 rounded/serving, and ₱230.00 actual rounded-price Tubo.
3. Save once. Confirm success, reload the detail page, search history, and check every original input and amount.
4. Edit usage to 0.25 kg and save changes: ₱325.00 Puhunan, ₱438.75 exact, ₱440.00 rounded, ₱115.00 actual rounded-price Tubo. Refresh again.
5. Cancel a delete and verify it remains. Delete this disposable test record only after confirming its name; verify the ingredient rows also disappear.
6. Test a temporary network failure during save. Entries should remain; retry the same unchanged entries. An uncertain response must not create a duplicate. If another tab edited the record, reopen the latest version before making another edit.
   If an in-flight save fails because the session expired, sign back in as the same owner without refreshing the tab; the failed request can be recovered from tab memory. It is unavailable to other accounts and cleared on explicit logout. Refreshing discards this temporary recovery, so check history before entering a replacement order after an uncertain save. Ordinary unsaved drafts are not auto-saved.
7. Log out, then revisit `/history` or `/new`; verify redirection to Login. Check expiry/refresh behavior with your project's real token settings.
8. Using a second **temporary authorized test account** created privately in the Dashboard, verify that the other account cannot list, read, edit, or delete the first account's records through API requests. Anonymous requests must fail. Direct table writes must fail even for the owning account; use the RPCs for complete costings.

An optional repeatable API check is provided in `scripts/verify-supabase.mjs`. It creates one explicitly named disposable verification record, edits it, and deletes only that generated UUID. It never bulk-deletes records or creates accounts. First create two test users in the intended test project, then create a private ignored `.env.verification.local` file with:

```dotenv
TRUGEN_RUN_LIVE_CHECKS=yes
VITE_SUPABASE_URL=https://YOUR_PROJECT_REFERENCE.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SB_PUBLISHABLE_KEY
TRUGEN_TEST_OWNER_EMAIL=YOUR_FIRST_TEST_EMAIL
TRUGEN_TEST_OWNER_PASSWORD=YOUR_FIRST_TEST_PASSWORD
TRUGEN_TEST_OTHER_EMAIL=YOUR_SECOND_TEST_EMAIL
TRUGEN_TEST_OTHER_PASSWORD=YOUR_SECOND_TEST_PASSWORD
```

Run `node --env-file=.env.verification.local scripts/verify-supabase.mjs` after reviewing the script and approving its disposable-data writes. Keep the file private and remove it when no longer needed. Do not paste its contents into chat. This script has **not** been run against a live project during implementation.

## Local automated checks and their limits

```powershell
npm.cmd run test
npm.cmd run lint
npm.cmd run build
npm.cmd run test:e2e -- --workers=2
```

- Vitest runs the real migration and SQL on an isolated in-memory PGlite PostgreSQL engine with local Auth identity fixtures. It tests decimal agreement, transactions, privileges, and RLS. The test setup clears Supabase environment variables before importing application modules, so local project credentials are not used. It does not connect to Supabase's hosted Auth or Data API.
- Playwright uses an isolated Vite server on port 5178 with a clearly fake test URL/key and intercepted HTTP responses. These tests exercise the official SDK and UI but are **mocked network tests**, not live database verification. Test credentials never enter the normal production build or `.env.local`.
- Device-emulated Chrome checks do not replace physical smartphone keyboard testing. Production deployment is outside this phase.

Official setup references: [React Auth](https://supabase.com/docs/guides/auth/quickstarts/react), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions).
