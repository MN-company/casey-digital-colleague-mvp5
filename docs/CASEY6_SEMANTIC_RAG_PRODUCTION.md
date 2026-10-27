# Complete source-backed RAG release — 27 October 2026

The earlier release saved the importer but left semantic retrieval inactive.
This change indexes all 1,616 real source chunks with normalized 768-dimensional
Gemini Embedding 2 vectors and supplies real query vectors to the existing
hybrid search RPC. Public text chat, authenticated chat and Live knowledge
tools use the same hf8 corpus. Lexical search remains available during an
embedding-provider outage. It is explicitly reported as lexical fallback.

## Source and course handling

The original 22 documents / 777 chunks are retained, alongside all fourteen
2026/27 handbooks and the shared-campus document. Foundation Year was reviewed
against its source text: pages 9, 13, 23 and 54 explicitly identify Chichester
Board, ChiView and University of Chichester. It is now approved for the user's
demo with a recorded scope-review flag. No institutional approval is claimed.

Canonical roster program names and explicit course aliases map to the right
handbook. A generic Business/null value does not guess a degree. For course-
dependent public rules Casey asks which course is intended and retains the
answer in the conversation. This selects the subject of public source research;
it never changes the roster, authenticates an identity or authorizes a private
operation. Verified roster scope takes precedence over user-edited claims.

Master L7 grading retrieval excludes undergraduate-only paragraphs printed
inside some Master handbooks and prioritizes the actual Master resit/pass rule
on page 11. Source level/section metadata reaches the answer model. Grounded
answers must return valid source IDs from a constrained schema; citations retain
PDF page, original URL, document hash and demo-approval label. Exact historical
dates are not silently projected into 2027 or later years.

## Operational implementation

`casey-rag-maintenance` requires a service-role credential and JWT verification.
Its resumable job deduplicates identical text before calling Gemini, validates
vectors and writes only missing embedding metadata. The service-only,
security-invoker `hf8_store_embeddings` RPC checks each source ID/content hash
and batch size. It cannot edit source text, approvals, audience or course scope.
Anonymous and authenticated student roles have no execute grant on that RPC.
Both source tables retain RLS. No private credential reaches the browser.

Document prompt: `title: none | text: ...`.
Query prompt: `task: search result | query: ...`.
Embedding model/space: `gemini-embedding-2-768` for both.

For future imports, use the private service-role environment and
`tools/hfarm-rag/backfill_embeddings.py --project preview|production`.
The worker is deployed with JWT verification in a separate CI step, rather
than the no-verify-jwt setting used by session-authenticated frontend adapters.
Provider rate limits are handled by bounded batches, backoff and resumption.

## Validation

Local regression suites cover dimensions/normalization, outage fallback,
institution/course isolation, canonical course aliases, incomplete profiles,
clarification flow, invalid candidates, source preservation and L7 versus L4–L6
grading. Existing booking/Handoff and frontend suites remain required.

The live source-backed evaluation includes campus printing/credit, library
rules, DM curriculum, undergraduate/master pass marks, Foundation Year,
course clarification, unsupported future deadlines and private-record requests.
Final commit, deployment URLs, counts and exact test outcomes are recorded in
the exported release evidence. Physical microphone and real booking behavior
are not changed or represented as tested by this source-retrieval release.

The Preview project's Google key currently reports depleted prepayment credits.
Preview received all real corpus vectors and passed database/permission checks;
real generation was staged in the service-only production canary using the
working production provider, before switching public endpoints. No production
key was copied into Preview and no billing/security setting was changed.
