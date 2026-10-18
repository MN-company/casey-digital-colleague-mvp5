# Casey 6 preview — 18 October 2026

Base: `feature/casey-live-5-2` at `7234b4beec996cc9913eeb0d7e6a9c8374876e0f`.
The supplied M1 ZIP was inspected before applying its blob-checked installer.

## Changes and isolation

Standard uses Gemini REST (`gemini-3.8-flash`) with the existing server-side `GEMINI_API_KEY`; speech uses browser TTS. Live (`gemini-3.8-live`) declares availability, prepare, booking-status and verified-knowledge tools. Only the visible confirmation workflow can request commit. Emma/Sofia, presence controls, avatar and original layout remain.

Preview uses only `casey6-original-ui` and `casey6-live-token`. Calendar commits, request submissions, administrative mutations and all OAuth GET routes are blocked. Existing Supabase Auth login is unchanged. Calendar free/busy reads, temporary sessions, rate counters, conversation state and prepare confirmations still use the existing database. This is not a separate database or a complete sandbox. All preview rate counters use a separate namespace. No real booking end-to-end success is claimed.

The production function sources in this branch mirror the downloaded deployed versions: original UI v18 and Live token v9. This reconciles CORS and quota-error drift without redeploying them. Their OpenRouter/Chirp paths remain available to the existing production frontend. The preview exclusively uses the new functions.

Only exact preview origins and localhost are allowed. Vercel branch autodeploy remains disabled as before; deploy this branch explicitly as Preview. Never promote this branch directly to production while its config points at restricted preview functions.

## Knowledge

The migration is a reviewed-source lexical foundation with institution, program, academic-year and page metadata. It is NOT applied. V6 knowledge and FAQ flags remain off; semantic retrieval, source ingestion and real College app handoff require a later increment and actual official documents/app URL. Do not fabricate exam dates. No irreversible cleanup of legacy functions, credentials or tables was performed.

## Verification and release gate

Run `node --test tests/*.test.mjs`, `deno check supabase/functions/casey6-live-token/index.ts`, JavaScript syntax checks and `git diff --check`. Additional executable backend tests cover OAuth/write denial, origin checks, session checks, rate isolation and anonymous knowledge scope.

Before production: a dedicated test calendar and verified student roster account; actual microphone/audio test; prepare/click/Calendar reconciliation test; reviewed official documents; final routing review. Google model documentation confirms Flash text and Live function calling; project quotas must be read in AI Studio, independently from Casey anti-abuse counters.

## Rollback

No production frontend alias, existing Edge Function, secret or schema was changed. Close the preview and continue using the existing demo at its existing URL. To withdraw preview service, remove only the two `casey6-*` functions and archive the Vercel preview after user review. Do not delete shared database records or alter Google connections as rollback.

## Cloud verification — final pass

30 offline tests pass, including timezone/DST, chosen fallback language and forged demo identity checks. TypeScript, JavaScript syntax and diff checks pass.

- Session and health: HTTP 200, correct CORS, configured Gemini 3.8 Flash.
- Real Calendar FreeBusy filtering returned available slots.
- Standard: actual response with mode `llm`; EN selected locale respected.
- Live: token HTTP 200, constrained WebSocket setup succeeded, actual `find_available_slots` function call completed and 483360 bytes of audio generated. Integration found UTC hours being spoken as local: fixed with explicit `local_start/local_end/timezone`; follow-up transcript correctly says 09:00 for 07:00 UTC on 19 October.
- Commit HTTP 403. No real appointment or email created.
- Database verified directly: zero documents and zero verified documents.
- Browser: original Emma/Sofia, presence controls, language selector, Live button and real availability calendar loaded. Mac then locked; further Safari/microphone checks need unlock.
- AI Studio selected project `Casey Key - FREE test`: Live RPM/RPD unlimited, TPM 65000. Association to Supabase secret and text-model quotas are not verified. No billing changes.

Preview branch alias: https://casey-digital-colleague-live-git-feature-casey-6-393aa8-mnbrain.vercel.app

Google model references:
https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live
