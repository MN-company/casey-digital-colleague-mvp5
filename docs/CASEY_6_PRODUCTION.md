# Casey 6 production release — 18 October 2026

The user explicitly authorized production deployment after the restricted preview. Production config uses the original `casey-original-ui` and `casey-live-token` endpoints and existing OAuth callback URLs. Both production function sources now include the verified Gemini and tool changes. Only the two `casey6-*` preview functions retain the temporary write/OAuth blockers.

Production booking keeps verified student identity, confirmation token, session/request binding, Calendar FreeBusy checks, database confirmation RPC and deterministic event reconciliation. No model tool can commit: the existing visible confirmation button calls the backend. Standard uses Gemini with the existing server-side Live key; browser TTS replaces Chirp in the active frontend. Emma/Sofia and original interface remain.

RAG is future preparation only. No documents, schema migration, ingestion or semantic service activated for this release. The feature flags remain off unless previously configured externally.

Rollback snapshot: old production Vercel deployment `dpl_9WbN7fJkKRNuJ9MK11AQQd4uqnae`, frontend commit `646f6367216efee69eaf924fce5171ee9db82044`; backend snapshots original UI v18 / Live token v9 saved outside the repository in the task's work/rollback-production. Rollback requires both restoring those backend sources and restoring the prior Vercel production deployment. No secret rotation or database migration is involved.

Validation: 34 offline tests; production authorization checks show commit is reachable and rejects missing confirmation (400), missing identity (401), unrelated origins (403). Existing preview integration verified Gemini text, constrained Live WebSocket, real Calendar availability tools and generated audio. Microphone and authenticated successful real booking are not certified by those checks.
