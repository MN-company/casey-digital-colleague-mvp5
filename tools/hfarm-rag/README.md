# H-FARM handbook ingestion

Recovered from the user-provided `CASEY6_HFARM_RAG_Ingest_Package.zip` on
2026-10-27. Archive SHA256:
`a0ee88ce99fb79d7ede65b8a42b97b04f21b156ad746cfc493dfd6e26ba3e546`.
The historical implementation report is preserved in
`docs/CASEY6_RAG_DEPLOYMENT_REPORT_ORIGINAL.md`; it describes the previous
ChatGPT session, not actions performed by the current release.

The corpus is already imported in both environments. Do not re-import merely
to deploy this repository. Production contains 37 documents / 1,616 chunks;
Preview contains 39 / 1,618. Both retain the original 22 documents / 777 chunks.
The additional two Preview records are synthetic QA fixtures.

## Local use

Python 3.11+ is required. From this directory:

```sh
python -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m unittest test_safety -v
.venv/bin/python ingest_handbooks.py --root /private/handbooks --output results
HANDBOOK_PDF_ROOT=/private/handbooks .venv/bin/python -m unittest test_ingest -v
.venv/bin/python build_shared.py --root /private/handbooks --output results
```

`test_safety` uses synthetic PDFs and mocked HTTP. `test_ingest` is the
original ten-test source audit and requires all fourteen original PDFs.
The source audit cannot be run against the ZIP's extracted JSON alone.
No PDFs, extracted text, generated results, student records or credentials
belong in this public repository. `tools/` is excluded from Vercel uploads.

## Additive write behavior

Dry-run is the default. `--apply --project preview|production` also requires
`SUPABASE_URL` to exactly match the selected existing project and a private
`SUPABASE_SERVICE_ROLE_KEY`. Never put this key in a command argument or file
committed to Git. Source-derived document/chunk IDs are deterministic.

Unlike the recovered version, repeated uploads use
`resolution=ignore-duplicates`: existing IDs are skipped. They do not change
existing content, review status, timestamps, scope or embeddings. In particular,
a reviewed candidate cannot silently become approved on a repeated import.
This is insert-only synchronization; corrections to existing IDs and document
supersession require separate reviewed operations. A document/chunk batch is
not an atomic whole-corpus transaction: a failure can leave partial inserts.
Retry after inspecting the error; ignored duplicates allow resuming. Always
run `acceptance.sql` and compare content/hash manifests afterwards.

The importer handles the fourteen source handbooks. `build_shared.py` separately
derives eighteen matching DM/AI pages into twenty shared chunks; it writes
local files only and keeps the derived document candidate pending review.
The already approved shared document in Supabase is not changed by this release.

## Evidence and scope

DM uses CAFOSCARI / DIGITAL_MANAGEMENT. Other handbooks use exact CICC program
codes. Foundation Year was reviewed against source pages 9, 13, 23 and 54,
which explicitly identify Chichester Board/ChiView and University of Chichester,
and is now approved for the user-requested demo. Fresh imports still start it
as candidate until reviewed; insert-only repeats preserve the existing review.
The backend uses canonical verified roster names where present; otherwise it
asks which course the public question concerns. This selects source context,
never authenticates a student or authorizes personal operations. Generic
Business/null values never become an arbitrarily inferred course.

Master L7 pass marks are 50%; undergraduate L4-L6 are 40%. Source excerpts are
preserved, with contextual headings. Dates from 2026 remain historical evidence
within academic year 2026/27; no exact 2027 deadline is inferred. Do not remove
demo-only approval warnings or claim institutional certification.

Production embeddings and query vectors use `gemini-embedding-2` at 768
dimensions. Text and Live knowledge tools use the same hybrid hf8 retrieval.
The service-role-only `casey-rag-maintenance` function backfills missing vectors
in bounded batches and reuses vectors for identical text; it never edits source
text, document identity, audience or course scope. The service-only
`hf8_store_embeddings` RPC validates each source content hash and updates only
missing vector metadata. Retry 429 responses with backoff; never mix model spaces.
Physical voice/login acceptance and original PDF visual inspection remain
separate from the automated source-backed retrieval/answer checks.
