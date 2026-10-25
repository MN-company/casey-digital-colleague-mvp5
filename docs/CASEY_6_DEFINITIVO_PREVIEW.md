# Casey 6.0 — integration Preview, 25 October 2026

This branch integrates the visual assets supplied in MVP DEFINITIVO.zip with the existing authenticated College conversation client and handoff protocol. It is a Preview configuration and must not be merged or promoted directly to production.

## Implemented

- New totem frontend; production remains unchanged on main. A visual snapshot of the previous frontend is at legacy.html.
- Italian, English and Spanish selector in the upper right. Selection persists and reaches the kiosk, phone and conversation service. Source excerpts remain in their original language.
- Dedicated Casey section in app-blu.html, reusing the existing same-origin College client. Real Supabase authentication, server-persisted library, new chat, restore, version conflict handling and deletion.
- Simulated Casey chat, invented slots and fake booking confirmations removed from the blue app. The College shell profile remains a labelled demonstration and never authenticates a user.
- Existing full-chat handoff reused on the isolated Preview project. Server-generated QR tokens are hashed, single-use and valid for 120 seconds. URL fragments are removed; the kiosk clears after claim. QR has a scan-readable size and quiet zone.
- New frontend connects to the pre-existing Supabase hybrid RAG, hf8_search_hybrid (PostgreSQL FTS + pgvector, reciprocal-rank fusion), through a scoped server adapter. No corpus or retrieval engine from MVP DEFINITIVO.zip is used.
- Only approved database documents can support policy answers. Existing QA smoke fixtures and candidate records are excluded. Embedding failures retain the existing lexical database search and never synthesize vectors.
- Institution/program scope comes from the authenticated, server-managed roster. The kiosk sees SHARED documents only.

## Isolation

Supabase: sneaxpqnmlhnrhoautjx, Casey Handoff Preview. New functions: casey-definitivo-ui and casey-definitivo-handoff. Existing Preview and production functions were not replaced. The additive hf6/hf7 bootstrap is recorded in supabase/definitivo-preview-schema.sql. Never apply that bootstrap where these namespaces already exist.

Vercel: existing casey-digital-colleague-live project, feature/casey-6-definitivo branch. Main and the production alias are unchanged. Existing production remains deployment dpl_91tguPdMR211hZN12apZZqqtgCWC, main commit 06a612cee27247e092de279b3142b2f484956bb9.

## Verification

63 local Node tests pass. Dedicated Deno tests cover the existing RAG contract, server roster scope, candidate denial and explicit search failure. Both new Edge Functions pass Deno checks.

Real cloud checks cover authentication, new chat, save/list/load, anonymous denial, version conflicts, write denial, unavailable calendar and QR issue/claim/replay/status. RAG verification must distinguish the two existing QA smoke fixtures from an actual approved corpus.

Final browser and HTTPS results are recorded in the delivery report. Separate browser contexts use synthetic QA accounts; they do not prove physical-phone microphone or institution SSO acceptance.

No real Calendar event or email was created. External prepare/commit/cancel operations are denied server-side. Production booking authorization and functions are unchanged.

## Outstanding work and external blockers

- The configured Preview Gemini key returns HTTP 402: prepaid credits depleted. Free-form generation remains unavailable until its project is funded or its key replaced by the owner. Greetings and document excerpts work independently of model credits.
- Live voice is explicitly disabled here and needs reconnection and testing after the provider key works. Physical microphone/audio remains separate acceptance.
- The existing hf8 index currently contains only two non-authoritative QA smoke records, with no approved documents. The complete original RAG package/corpus still needs to be identified. No ZIP corpus is substituted.
- Calendar, email and administrative dashboard integration are pending. The office dashboard and Campus/Farm app remain labelled demonstrations. No production OAuth/calendar connection was copied.
- The College shell is a prototype. Password authentication is real Supabase Auth, not H-FARM SSO.
- Before production: environment-specific configuration, current approved documents, provider funding, real calendar/account acceptance, microphone/device checks and explicit release authorization.

## RAG source

The adapter uses only the existing hf8_search_hybrid RPC and server-verified dc_v4_student_roster scope. It does not create a replacement search index, ingest the ZIP, or alter the existing RAG schema. Provider credits are required for fresh embeddings; absence of embeddings is explicitly a lexical fallback. Pending identification of the complete original project, do not claim full corpus ingestion or approved institutional coverage.
