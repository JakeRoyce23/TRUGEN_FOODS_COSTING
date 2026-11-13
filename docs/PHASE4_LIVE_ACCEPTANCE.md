# Phase 4 live owner acceptance

Target: **TRUGEN FOODS — `jueboylmczhlkrjtdjva`**. The approved migration was deployed successfully on 05 November 2026. Do not reapply it or reset the database.

**Final status: Phase 4 live acceptance passed on 05 November 2026.** The deployed schema/permissions and hosted role tests passed; both accounts authenticated and logged out; real OWNER browser CRUD/refresh passed; OTHER could not find/view/edit the OWNER record through UI or direct API; anonymous/direct writes were denied; all eight financial values matched; final cleanup searches returned zero verification records. The owner reports successful live recovery/login for both accounts. See BUILD_PROGRESS for exact commands, results and the stale-conflict REST latency limitation.

## 1. Start the application

Password recovery is available and was successfully exercised by the owner for both accounts. [PASSWORD_RECOVERY.md](PASSWORD_RECOVERY.md) remains the repeatable private procedure. Hosted Site URL and allowed reset redirect were verified; the CLI did not expose the hosted template body.

In PowerShell:

```powershell
Set-Location -LiteralPath 'C:\Users\Jayson G. Abrenica\Desktop\TRUGEN-FOODS'
npm.cmd run dev
```

Open the URL printed by Vite. The ignored `.env.local` already points to the correct project. If a development server was already running before configuration changed, restart it. Do not substitute the fake browser-test configuration.

## 2. Test owner login and session restoration

1. Try the owner's email with an incorrect password once. Expect a sign-in error and no access to protected pages.
2. Sign in with the correct owner credentials. Expect Home and the owner's account details in Settings.
3. Open History and refresh the page. A valid session should restore, keeping you signed in.
4. If login fails, confirm the user's email is confirmed in Supabase Authentication → Users. Report the displayed error, never the password or session token.

## 3. Create and save the approved costing example

Choose **New Costing** and enter:

| Input | Value |
| --- | --- |
| Food/order name | `PHASE 4 TEST — Chicken tray` |
| Servings | `10` |
| Ingredient name | `Chicken` |
| Purchased quantity/unit | `1` / `kg` |
| Purchase price | `1300` |
| Actual quantity used/unit | `0.5` / `kg` |
| Markup | `35` |
| Optional round-up | `10` |

Verify Puhunan **₱650.00**, calculated Tubo **₱227.50**, exact selling price **₱877.50**, cost/serving **₱65.00**, exact selling price/serving **₱87.75**, rounded total **₱880.00**, rounded price/serving **₱88.00**, and actual Tubo at rounded price **₱230.00**.

Click **Save costing** once and wait for confirmation. Expect the saved detail page; record its `/costings/<id>` URL for the isolation check. If saving fails, retain the form and report the error instead of repeatedly creating new records.

## 4. Verify history and persistence

1. Open History and search `PHASE 4 TEST`.
2. Verify the saved record and exact/rounded amounts; choose View.
3. Refresh the detail page, then navigate away and return through History.
4. Confirm the ingredient input values, quantities, markup, rounding and financial results are unchanged. Refresh must not erase a confirmed saved costing.

## 5. Edit and recalculate

1. Choose Edit on the test record.
2. Change actual quantity used from `0.5` kg to `0.25` kg.
3. Expect Puhunan **₱325.00**, calculated Tubo **₱113.75**, exact selling price **₱438.75**, rounded total **₱440.00**, exact price/serving **₱43.88**, rounded price/serving **₱44.00**, and actual rounded-price Tubo **₱115.00**.
4. Click **Save changes** and refresh. The edited values must persist in detail and History.

## 6. Verify a second account cannot access the owner's record

1. Keep the owner session open. Open a separate private/incognito browser window and sign in with the second account.
2. Search History for `PHASE 4 TEST`. The owner's record must not appear.
3. Paste the owner's saved detail URL into that second-account window. The record must be unavailable; owner ingredient details must not appear.
4. Try the same URL with `/edit` appended. The second account must not obtain or edit the owner's costing.
5. Return to the owner window and verify the test record is unchanged.

These UI checks complement the live PostgreSQL permission tests. The optional two-account API script below checks direct table and RPC access independently of route guards.

## 7. Test confirmed deletion

1. In the owner window, find the specifically named test record in History and choose Delete.
2. Cancel first; verify the record remains.
3. Choose Delete again and confirm the correct test-record name.
4. Refresh History and revisit the old detail URL. The test costing must be absent/unavailable. Its ingredient rows must also be deleted; the automated API check verifies the cascade.

## 8. Test logout and protected routes

1. In Settings, click **Log out**. Expect Login.
2. Visit `/history` and `/new` while signed out. Expect redirection to Login.
3. Refresh to confirm the session remains signed out. Log out the second-account window as well.

## Optional automated real API checks

The owner authorized live permitted/denied-access testing and filled the four private fields in the Git-ignored `.env.verification.local`. Both distinct accounts passed. Do not paste credentials into chat or use `VITE_*` variables for passwords.

Run from the project directory:

```powershell
node --env-file=.env.local --env-file=.env.verification.local scripts/verify-supabase.mjs
```

This script uses the official SDK and real email/password Auth, creates one random `[Verification only]` record, checks all eight amounts, retries, history, read/edit/delete, direct-write denial, anonymous access and cross-account isolation, and verifies cleanup of only its own generated record. It does not create or alter Auth users. The final run passed; see BUILD_PROGRESS for the platform limit on the stale-edit REST response.

The opt-in real-browser script starts its own local Vite server on port 5176, uses installed Chrome without mocks/traces/recordings, and cleans up its generated record. The final default run used OWNER as primary and OTHER in a separate isolation context:

```powershell
node --env-file=.env.local --env-file=.env.verification.local scripts/verify-live-browser.mjs
```

Phase 4 is complete. Physical-phone and three-real-recipe release acceptance remain outstanding. Phase 5 is ready for explicit scope approval and has not started.
