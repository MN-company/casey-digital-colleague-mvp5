# Casey 6 HFARM RAG: release audit

## Status

Release blocked: the original `CASEY6_HFARM_RAG_Ingest_Package.zip` and
`CASEY6_RAG_DEPLOYMENT_REPORT.md` were not available in this workspace, the
checked Codex directories or Downloads. The referenced ChatGPT conversation
reader returns internal content references in place of assistant responses and
no attachments. Its web page did not expose the conversation. This is a new
audit, not a reconstruction of the missing report or importer.

Repository: `MN-company/casey-digital-colleague-mvp5`.
Base: `main` at `9e59b979d330b668e81c1841493b3a6b506db234`.
Dedicated branch: `feat/casey6-hfarm-rag-ingest`.
The fresh checkout was clean before adding this audit. No importer changes
were present on main; no open PR was found during inspection.

## Live database verification

Authenticated SELECT queries confirmed these counts on 2026-10-27 at 00:56 Europe/Rome
(2026-10-26 22:56 UTC):

| Environment | Project | Documents | Chunks |
| --- | --- | ---: | ---: |
| Production | oxzraaadxqsruibinlxn | 37 | 1,616 |
| Preview | sneaxpqnmlhnrhoautjx | 39 | 1,618 |

Both contain the original 22 documents / 777 chunks, 14 handbooks / 819
chunks, and one derived shared-services document / 20 chunks. Preview also
contains two synthetic QA documents / two chunks. Production has no QA
documents. Presence and provenance are verified; original file byte equality
cannot be independently established without the source package and baseline
manifest. No database writes or re-import were performed. Both environments have zero
orphan chunks; the sorted original-document ID/SHA256 manifests match
(MD5 comparison digest: `0a477280da4223e30c7d8682400b52ca`).

All 1,616 production chunks and all real-source Preview chunks have NULL
embeddings. Preview has one embedded synthetic QA chunk. Import presence
therefore does not certify semantic retrieval. The checked-in retrieval adapter
currently requests lexical search (`p_embedding: null`). Handbook metadata
includes demo approval rather than institutional review and warnings against
projecting historical deadlines forward. The requested Digital Management
next-year behavior and master pass-mark behavior require review against the
missing package and dedicated retrieval acceptance checks.

`tests/hfarm-ingest-audit.sql` is a repeatable read-only inspection query.

## Existing deployment and validation

Vercel project: `casey-digital-colleague-live`,
`prj_g7Mxl0hhmXQk8Oi6Caus3DQsPA1x`,
team `team_tlVkdTknVZ34Ty7nah0lkj8w`.

Existing production deployment / rollback reference:
`dpl_CQXTtYxrkzpQ2wEFsLUEx8PoW1t9`, matching the base commit above.

- Public URL: https://casey-digital-colleague-live.vercel.app
- Immutable deployment URL: https://casey-digital-colleague-live-na361yude-mnbrain.vercel.app
- 66 Node tests passed.
- 12 Deno tests passed with `--allow-env` (handoff operations and RAG suites).
- Deno type checks passed for casey-handoff and casey-handoff-live.
- Production casey-original-ui public_config responded successfully;
  oauth_configured=true and OAuth URL matches the production project.
- All five checked public assets match source byte for byte: index.html,
  config.js, casey-bridge.js, settings.html and auth.0916809e.js.
- This is a static frontend with no package.json/build command. No new remote
  build or deployment has been executed for this audit.

Non-main automatic Vercel deployments are disabled in vercel.json. A branch
push alone must not be reported as a deployment. The existing config.js points
to production; any future Preview must use isolated configuration rather than
silently pointing a preview UI at production writes.

## Completion blockers

Recover both original artifacts and inspect their file manifest, hashes,
importer, tests, documentation and environment targets. Commit reviewed files
on this branch, run importer-specific tests and the existing suites, then
deploy the intended runtime changes and verify the new URL, served asset
bytes, functions and scoped RAG answers. Record the final commit, PR and new
deployment identifiers separately. Do not overwrite the 22 original documents
or copy Preview QA fixtures into production. No new deployment, completed
importer delivery, physical microphone acceptance or real booking is claimed.
