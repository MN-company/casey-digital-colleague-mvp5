# Casey 6.0 Handoff — isolated Preview

## Scope and plan

1. Preserve Casey's existing interface and Emma/Sofia demo. Create a separate Git branch and HTTPS Vercel Preview; never promote to production.
2. Isolate Supabase Auth, schema, test identities, and functions. Review RLS and privileges before issuing test credentials.
3. Implement low-trust student number on kiosk, opaque short-lived QR, verified mobile login, atomic claim, persistent context, and Gemini continuation. Review and test each boundary.
4. Run existing regression tests, real cloud negative tests, separate-browser HTTPS tests, then a physical phone scan with the user.

## Environment

- Production Supabase: `oxzraaadxqsruibinlxn` — no writes/deploys performed for Handoff.
- Preview Supabase: `sneaxpqnmlhnrhoautjx`, created independently because branching requires Pro. Schema-only snapshot; no production data, Auth users, Google connections, or secrets copied.
- Preview functions: `casey-handoff`, `casey-handoff-ui`, `casey-handoff-live`. Each checks the isolated project URL on startup.
- Git branch: `feature/casey-6-handoff`. Production workflow remains main-only.
- Vercel: existing `casey-digital-colleague-live` project, team `mnbrain`, explicit Preview deployment only. Git auto-deploy remains disabled for this feature branch.

## Security design and review

- Matricola at the kiosk is a routing hint, never authentication. The phone signs in through real Supabase Auth using synthetic preview accounts. The application database mapping is admin-provisioned; user-editable metadata is ignored.
- QR contains only HTTPS `college.html#handoff=<256-bit random value>`; no transcript, matricola, Auth JWT, or Casey session. Only SHA-256 of the QR token is stored. The fragment is removed immediately; no third-party scripts load on the login page.
- Token expires after 120 seconds. Issuing a new one invalidates the prior pending token for that source session. Claim is a PostgreSQL transaction with a row lock: verified account mapping must match, and only one concurrent claim succeeds. Context import and consumption commit together.
- Login and kiosk storage namespaces are separate. Only the authenticated phone receives the new Casey session. Kiosk polling reveals consumed/expired state only and clears its transcript after handoff.
- All public tables have RLS. Handoff links are inaccessible to anon/authenticated. Profiles and conversations permit owner-only SELECT; clients cannot alter matricola, identity, links, or saved context directly. Service-only RPCs use SECURITY INVOKER, empty search_path, and explicit EXECUTE revocations from PUBLIC/anon/authenticated.
- Strict origin allowlist includes only reviewed Preview hosts/local test origins. Backend is not a proxy to production. API keys remain server-side except the intended publishable key.
- Context is untrusted conversation data. It never proves identity, authorizes a booking, or establishes institutional facts. The existing booking path retains identity verification, availability checks, explicit button confirmation and idempotency.
- Default personal-request classifier: conservative public allowlist; unknown requests go to authenticated mobile. Set `HANDOFF_CLASSIFIER=model` for advisory Gemini classification; model failure routes to mobile, and the model cannot downgrade the deterministic privacy guardrail. Live audio routing also relies on constrained model instructions/tool calling, which is probabilistic; server authorization still protects records/actions.
- Context retention: 24 hours, explicit delete, owner-only access, scheduled cleanup every five minutes plus request-time cleanup. Link rows are purged ten minutes after expiry. Context copied into Casey's conversation table is deleted alongside the Handoff record.
- No service keys, test passwords, browser storage state, or QR token values belong in Git or public reports.

## Connected versus simulated

- Real: Supabase password authentication, verified synthetic identities, server-side matricola, SQL context storage, single-use QR claim, Gemini ephemeral token and Live connection.
- Simulated: the blue College shell and institution's identity registry. This is not the real H-FARM app or SSO.
- Existing Calendar/Gmail API code is deployed in isolation, but OAuth secrets and a dedicated test calendar are absent. No production connection copied. No claim of successful external booking/email is permitted.
- Emma/Sofia remain demonstration scenarios, never authenticated identity.

## Reproducible checks

`node --test tests/*.test.mjs`

`deno check supabase/functions/casey-handoff/index.ts supabase/functions/casey-handoff-live/index.ts`

Opt-in real cloud tests (credential paths outside repo):
`CASEY_HANDOFF_KEYS=/private/path/keys.json CASEY_HANDOFF_ACCOUNTS=/private/path/accounts.json CASEY_HANDOFF_ORIGIN=https://preview-host python3 tests/handoff-cloud.py`

The cloud suite exercises identity mismatch, missing auth/session, production-origin rejection, expiry, replay, regeneration, concurrent claims, RLS read/write/RPC boundaries, persistence, restore/delete and actual Google ephemeral token issuance. Browser testing must additionally verify QR decoding, separate storage contexts, mobile layout, original Casey rendering, and Live setup/audio response.

## Physical acceptance

Open the Preview kiosk on a computer; enter the test student's matricola and generate QR. Scan on a separate phone, sign in with that student's private test credentials, confirm import, continue the previous topic, then reload and verify persistence. Confirm the kiosk clears. Try the consumed QR again and verify rejection. Allow microphone on the phone and verify actual duplex speech. These actions require the user's physical phone; automated browser contexts are not two physical devices.

## References reviewed

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth sessions](https://supabase.com/docs/guides/auth/sessions)
- [OWASP token guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [Vercel deployments](https://vercel.com/docs/deployments)
- Supabase changelog reviewed; October TLS deprecation does not require weakening client TLS or changing these API flows.

## Validation snapshot (22 October 2026)

- Existing automated tests: 53/53 passed.
- Real cloud integration suite: 29/29 passed, repeated with the HTTPS Preview origin. Ephemeral token issuance is verified separately from Live generation.
- Separate browser contexts: QR image decoded; phone login and matching import passed; kiosk cleared; imported context survived page reload.
- Live generation is BLOCKED: Google closed the real `gemini-3.8-live` WebSocket with 1011 and “Your prepayment credits are depleted”. An independent minimal `gemini-3.8-flash` call returned upstream HTTP 402 with the same message. This confirms the symptom for the configured API key; it does not establish the user's balance in other Google projects or accounts. No successful AI continuation is claimed.
- Security advisor: no database/RLS findings; one Auth warning, leaked-password protection disabled. Test accounts use generated random passwords and a synthetic registry; production hardening of Auth is outside this isolated demonstration.
- Physical computer-to-phone scan and microphone acceptance remain pending user confirmation.
- Calendar/Gmail configuration remains intentionally absent following the user's prioritization of proving Handoff; no Google production connections were copied.

This branch's config points to the isolated project. Do not merge it into main or promote it as-is; a production integration needs environment-specific configuration and separate acceptance.
