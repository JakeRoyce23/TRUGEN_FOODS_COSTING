# Phase 4 password recovery

Local app: `http://127.0.0.1:5174`. Project: `jueboylmczhlkrjtdjva`.

## Implementation

- `/forgot-password` requests an email with `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`. Login links to this page. The response does not confirm whether an email has an account.
- `/reset-password` is public so a signed-out owner can open a recovery link. It consumes recovery tokens explicitly while automatic SDK URL detection stays disabled. Implicit recovery fragments are installed through `setSession`; recovery token hashes use `verifyOtp`; PKCE codes use `exchangeCodeForSession` with their flow identifier and must be marked as recovery by the SDK.
- Dashboard-generated recovery links that land on the Site URL are routed to `/reset-password` before the router mounts. Callback credentials and untrusted error parameters are removed from the address bar. The page never renders the provider's raw error descriptions. The document uses a no-referrer policy.
- The callback must establish a session validated by `getUser`. An existing ordinary login is not enough to open the form. The account identity is checked again before `updateUser({ password })`; another account or an expired session blocks submission.
- The page shows the verified email, masked password/confirmation fields, an optional visibility toggle, an 8-character minimum, mismatch/weak-password feedback, and a submit lock. Supabase still enforces its hosted password policy. Successful changes clear form/draft recovery state and sign out the current browser session; failed sign-out has a retry action.
- Callback processing is shared across React StrictMode effect replays. No separate copy of recovery tokens is persisted. The normal Supabase SDK session uses its existing configured storage. Reloading the sanitized reset page intentionally requires a new link; keep it open until finished.
- `npm run dev` now uses port **5174** with strict port selection so it cannot silently move away from the configured redirect. Automated mocked browser tests use **5178**, separately from the real-configured app.

## Hosted settings and template

On 05 November 2026, a read-only CLI configuration dry run verified:

| Setting | Hosted value |
| --- | --- |
| Site URL | `http://127.0.0.1:5174` |
| Allowed Redirect URLs | `http://127.0.0.1:5174/reset-password` |

The command reported `dry_run: true`, `wrote: false`. No hosted settings were changed. The CLI result did not expose the recovery email template, so its exact content and delivered emails are **not independently verified**.

In Supabase Dashboard, select this project, then **Authentication → Email Templates → Reset Password** (or **Authentication → Emails**, depending on the dashboard layout). The standard reset link should use:

```html
<a href="{{ .ConfirmationURL }}">Reset password</a>
```

`ConfirmationURL` includes Supabase's verification step and the requested redirect. A link containing only `{{ .SiteURL }}` or `{{ .RedirectTo }}` opens a page without verifying recovery and is insufficient. Do not remove the token verification step. The app also supports a deliberately customized token-hash callback, but the standard confirmation URL is sufficient here. No template change was made by the agent.

References: [Supabase email template variables](https://supabase.com/docs/guides/auth/auth-email-templates), [password reset request](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [updateUser](https://supabase.com/docs/reference/javascript/auth-updateuser), and [redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).

## Reset the two test accounts privately

1. Keep the app running at `http://127.0.0.1:5174`. If starting it again, use `npm.cmd run dev`; stop only your old app terminal first if that port is occupied. `localhost` is a different origin; use `127.0.0.1` consistently.
2. Log out of the app. Open `http://127.0.0.1:5174/forgot-password` and enter the **OWNER** test email privately. Click **Send reset link** once.
3. Open the newest email's link on this same computer while the app is running. A phone's `127.0.0.1` refers to the phone itself. Do not reuse a link that was already consumed or forward the link to chat.
4. Confirm the reset page shows the intended account email. Enter and confirm a new, unique password, then select **Update password**. Keep the page open until it reports success. The agent has not chosen, generated, or changed any real password.
5. Return to Login and verify the OWNER account with its new password. Log out.
6. Repeat steps 2–5 for the **OTHER** test account. Keep account sessions separate and check the displayed email each time.
7. Update only the corresponding four credential fields in the ignored `.env.verification.local`, then save. Leave `.env.local` unchanged. Do not share passwords, links, or tokens in chat.
8. Confirm **both passwords reset and test credentials updated**. The remaining two-account Phase 4 acceptance tests can then run with the new local credentials.

If a link is missing/expired/already used, choose **Request a new reset link**. Old emails retain old redirects, so request a fresh email after any URL/template correction. If delivery fails, check Spam, the hosted Auth/email logs, and any SMTP sender/rate restrictions; avoid repeatedly sending requests. A successful request screen does not prove inbox delivery. If Supabase returns a stricter password-policy error, use a stronger password and retry.

## Verification boundary

Automated recovery tests intercept `supabase.test` and never send real recovery emails or update hosted users. They verify callback handling, request redirect, password confirmation, update/sign-out behavior, invalid links and responsive layout. Unit tests exercise callback parsing and server-validated identity checks. The owner subsequently reported successful real recovery and login for both accounts; the agent did not observe or store passwords/tokens. The hosted template body remains owner-checked because the CLI did not expose it. Phase 4 final acceptance passed; Phase 5 still requires explicit approval.
