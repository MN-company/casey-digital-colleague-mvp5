# Casey 6 HFARM RAG release — 2026-10-27

## Recovered package and implementation

Source: user-provided Drive file `1ZXgVpMk7HqRpbmy76IAd8dcGWcti1Oec`.
Package: `CASEY6_HFARM_RAG_Ingest_Package.zip` (297,587 bytes), SHA256
`a0ee88ce99fb79d7ede65b8a42b97b04f21b156ad746cfc493dfd6e26ba3e546`.
It includes `DEPLOYMENT_REPORT.md`, preserved as
`CASEY6_RAG_DEPLOYMENT_REPORT_ORIGINAL.md`. That historical report describes
prior imports, not a new import performed by this release.

Repository: MN-company/casey-digital-colleague-mvp5 (public).
Branch: `feat/casey6-hfarm-rag-ingest`; PR #13.
Base: main `9e59b979d330b668e81c1841493b3a6b506db234`.
The initial audit-only commit was `d28934c3bb9e878499911e72ec8d5690b9335a72`.

The importer, shared-page derivation, source-dependent tests and read-only SQL
acceptance checks are in `tools/hfarm-rag/`. The uploader now ignores duplicate
IDs instead of merging them, so repeating an import cannot overwrite existing
content, approvals or scope. Synthetic safety tests exercise dry-run, target
validation, repeated imports and secret-key headers. CI runs those tests.
All tools are excluded from the static Vercel deployment. No PDF, raw extracted
text, generated results, student data or credential is committed.

## Live database verification

| Environment | Project | Documents | Chunks |
| --- | --- | ---: | ---: |
| Production | oxzraaadxqsruibinlxn | 37 | 1,616 |
| Preview | sneaxpqnmlhnrhoautjx | 39 | 1,618 |

Both retain 22 original documents / 777 chunks, plus 14 handbooks / 819 chunks
and one derived shared-services document / 20 chunks. Preview has two extra
synthetic QA documents / two chunks. No re-import or database modification is
needed for this source-code release.

Both databases match the recovered package's sorted handbook document ID/SHA
manifest (`59dbc31a90eb2c6c6fe4d23bc0b1f2ba`) and chunk ID/MD5(content)
manifest (`78dbd43a4fa319bd809b6c0f16cef77c`). These MD5 values are comparison
digests, not security signatures; source PDF SHA256 and chunk SHA256 values
are retained independently. The original 22-document ID/SHA manifests also
match each other (`0a477280da4223e30c7d8682400b52ca`). There are zero orphan
chunks, zero out-of-range pages and zero approved Foundation Year records.
Original PDF byte extraction was not repeated: those fourteen PDFs are not in
the package. This release verifies exported text against the live database.

Production RPC checks recovered shared printing pages 46/47, Digital Management
curriculum pages 7/8, and MSc DMDA page 11 including 50%. Foundation Year is
not exposed with candidates disabled. Scope is controlled by the server roster.
Generic Business/null roster programs still need authoritative normalization;
this release does not guess courses or edit student records.

All real-source embeddings remain NULL. The checked-in adapter uses lexical
retrieval with `p_embedding: null`. Demo-only approval remains explicitly
labelled. No exact 2027 deadline is inferred from a 2026 date. A full semantic
RAG, source visual review and large retrieval benchmark are not completed here.

## Validation and deployment

- 66 existing Node tests passed in the initial audit.
- 12 Deno tests passed with --allow-env; handoff function type checks passed.
- 3 new Python safety tests passed using explicitly synthetic PDFs and mocked HTTP.
- The ten original source-PDF tests are preserved but not rerun without the PDFs.
- The previous five public assets matched main byte for byte.
- Production public_config responded successfully with the correct project.
- A real production UI turn for "Come posso stampare in campus?" returned
  a safe clarification with no citation, despite successful direct RPC hits.
  This is an end-to-end answer-quality gap in the existing runtime; it is not
  evidence that the handbooks failed to import. No full RAG acceptance is claimed.
- Static frontend: no package.json or local build command. The actual Vercel
  build and post-release URL checks must be recorded in the final release record.

Vercel project: `casey-digital-colleague-live`,
`prj_g7Mxl0hhmXQk8Oi6Caus3DQsPA1x`,
team `team_tlVkdTknVZ34Ty7nah0lkj8w`.
Environment: production, with config.js pointing to oxzraaadxqsruibinlxn.
Non-main automatic Vercel deployment is disabled. Do not call a branch push a
deployment or create a preview UI pointing at production writes.

Previous production / rollback reference:
`dpl_CQXTtYxrkzpQ2wEFsLUEx8PoW1t9` at base commit 9e59b979.
Public URL: https://casey-digital-colleague-live.vercel.app
Previous immutable URL: https://casey-digital-colleague-live-na361yude-mnbrain.vercel.app

No schema migration, source row update, real booking or external message is
part of this release. Physical microphone, official student login/course mapping
and deliberate booking acceptance remain separate from automated checks.
