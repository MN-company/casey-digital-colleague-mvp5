# Casey 6.0 — Knowledge / RAG design

Target: campus FAQ on public kiosks and personalized policy/exam support in the authenticated College app. No sample or unverified data may be shown as official policy.

## Ingestion (not deployed yet)

1. School staff approve authoritative documents (PDF, handbook, annual 2026–2027 academic calendar, program/exam timetables). Metadata: institution, **exact program**, academic year, version, language, source URL, SHA-256, verified reviewer/date, expiry.
2. Preserve page/section anchors during extraction. Chunk into 400–750 tokens with 80-token overlap. Keep tables and dates together; detect conflicting or superseded versions.
3. Load `dc_v6_knowledge_documents` + `dc_v6_knowledge_chunks` via a protected staff-only ingestion job, never from the public browser.
4. Migration `20261018_casey_v6_knowledge_foundation.sql` provides verified lexical search, source citations and program/year filtering. **Semantic pgvector embeddings and the ingestion job are not implemented in this milestone**. Enable pgvector only after the chosen embedding model/dimensionality and provider quotas are established.
5. Queries from anonymous kiosks may see only `institution='SHARED'` and globally applicable documents. Authenticated College app queries derive `institution/program` from server-verified identity, never model-supplied fields. Academic-year-specific documents require an explicit validated year, otherwise Casey asks for clarification.
6. Quote relevant short excerpts and cite title, page, source URL and version. If nothing is returned, explicitly say that no verified source was found.

## Campus FAQ cache

`dc_v6_public_faq` stores human-reviewed answers to repeatable shared questions such as **"Come si stampa?"**. Each record references a verified source hash; invalidate on document changes or expiration. Never cache student-specific schedules, private messages, or booking outcomes. Cache is retrieval of approved text, not cache of any generated claim.

## Tool workflow

- `search_verified_knowledge` from Gemini Live calls the same scoped backend knowledge endpoint used by Standard.
- Kiosk booking requires a handoff to authenticated College app; the current Casey login stays unchanged for Wednesday's demo.
- College app supplies real authenticated student context via verified server session; never trust a demo Emma/Sofia selector as identity.
- `prepare_booking` only prepares. Existing `Confermo` button invokes `commit`, which validates the student, confirmation token and FreeBusy before writing Google Calendar.

## Pending after demo

Document ingestion, pgvector hybrid search, exact citations and source page verification, answer-cache invalidation tests, per-course calendar filters, SSO/College app handoff and UX redesign. They are not implied complete by this patch.
