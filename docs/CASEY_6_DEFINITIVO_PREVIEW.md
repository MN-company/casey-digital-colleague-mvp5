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
- The original regolamenti_hfarm_casey_rag.zip has now been identified and ingested in Preview: 22 PDFs, 262 pages, 777 readable cards. User approval is explicitly for the demo; it is not institutional certification. The two QA smoke records remain candidates.
- Calendar, email and administrative dashboard integration are pending. The office dashboard and Campus/Farm app remain labelled demonstrations. No production OAuth/calendar connection was copied.
- The College shell is a prototype. Password authentication is real Supabase Auth, not H-FARM SSO.
- Before production: environment-specific configuration, current approved documents, provider funding, real calendar/account acceptance, microphone/device checks and explicit release authorization.

## RAG source

The source is the original `regolamenti_hfarm_casey_rag.zip`, provided explicitly by the user, not the unrelated MVP demo corpus. Original PDF bytes and extracted contents are not published in this repository or on Vercel.

The existing hf8 document/chunk tables hold the evidence once. `hf8_library_entry_details` adds literal requirement/action snippets, contacts, reference dates and deadline mentions. Readable views expose Italian column names: `casey_biblioteca_documenti`, `casey_biblioteca_schede`, `casey_biblioteca_scadenze`. The search adapter uses the existing hybrid RPC, then reads the matching structured card. It retains lexical fallback with explicit keyword expansion while Gemini credits are unavailable. No fabricated embeddings or generated policy summaries.

There are 5 Ca’ Foscari, 5 Chichester and 12 originally common-folder PDFs. Two common-folder documents are conservatively restricted to CICC (withdrawal and student athletes). Mixed sections of the College statute remain available for inspection but are excluded from answers until scope can be verified. Staff material and sensitive internal procedures are kept out of student retrieval. Original academic years are retained with a historical-year warning.

A card is an original article or section on a PDF page; long sections continue on adjacent cards. Extracted dates are not automatically current deadlines. Approval, institution, audience, filename, SHA-256 and page accompany the evidence. All library access is service-only, with RLS and security-invoker views.

## Demo access

Preview accepts the aliases `demo` and `casey` for the dedicated synthetic demo user. Passwords are distributed privately, not embedded in public code. Personal users can request an email link or enter an email OTP; callbacks return to the exact Preview URL. Paolo’s requested email has an active demo roster in Preview and production, with mailbox confirmation required and no password reset or admin privileges. The existing Casey account is preserved. Actual personal mailbox delivery remains user acceptance.
