# Native student access and security release

The original blue/red College student apps now use the existing beta backend directly. `/prova.html` redirects to `app-blu.html?prova=1`; it no longer presents a separate trial UI. The native chat includes guest access, email verification, server-owned conversation history and optional voice. Existing College account access remains separately authorized.

## Authentication and history

Email login must start on the same browser. An expiring nonce, requested email and guest capability are checked both in the browser and server before linking history. Unsolicited bearer fragments are rejected. Refresh, OTP and asynchronous private readers invalidate pending results on logout/account change. New conversations archive previous history without creating a new visitor or resetting quota. Archives enforce capability/account ownership.

## Security changes

The maintained public text, retrieval, TTS and Live endpoints now share the beta pause, daily budget and capacity. Calendar slot lookup is rate limited before contacting Google. Model-controlled intent labels cannot bypass the source requirement for arbitrary answers; only exact greetings/thanks use fixed local replies. Booking still requires verified identity, authorized roster, server-owned slot preparation and explicit confirmation; model text cannot commit a booking.

Apply additive migrations in order:

1. `20261027185621_bind_beta_email_intent.sql`
2. `20261027185850_shared_paid_capacity.sql`
3. `20261027191521_student_conversations.sql`

All three were applied to Preview before production. No RAG document, chunk or embedding is changed by these migrations. Preview canary checks verify requested/unrequested login, archive ownership and unchanged quotas. `tools/beta/test_shared_capacity.sql` rolls back its pause/capacity probes.

## Validation and limits

84 Node tests, 29 Deno tests, 3 importer safety tests and 11 live Preview auth/history canaries passed. Modified TypeScript entrypoints type-check. A fresh independent patch review was completed and its four bypass/regression points corrected before final tests.

Codex Security scan f8940a00-866b-41fd-bcfd-d12a40698652 records six validated baseline issues (one high, four medium, one low), the source evidence and partial coverage. These fixes do not establish universal prompt-injection immunity. Model-output boundary tests use adversarial fixtures; no actual private-user takeover, provider exhaustion or booking was attempted. Physical microphone acceptance remains manual. A subsequent cloud-source addendum recovered office/casey-v2/v3/v4. The current frontend does not call them. office/v2/v3 exposed anonymous write paths and office exposed staff dashboard data; v3/v4 had unmetered availability. All four now return HTTP 410 before accessing any database/provider. Original remote source snapshots remain in the private release workspace for reversible recovery; no table, credential or connection is deleted. This addendum is separate from the sealed baseline scan.

Voice reserves the full server-issued interval, including an early stop. While an operation lease is active, history mutation may be temporarily blocked to avoid an old response overwriting a new conversation. New email links require the browser that requested them; this is intentional login-CSRF protection.

Production deployment identity, URL, served-asset checks and final RAG counts are documented in the release report outside the public repository.
