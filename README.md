# Casey 6.0 — Definitivo Preview

New totem and College app frontend, integrated with authenticated conversations and single-use QR handoff in a separate Supabase Preview project.

Serve the static files over HTTP on port 8000; open index.html or app-blu.html. Document retrieval connects to the existing Supabase hybrid RAG; the ZIP retrieval engine and corpus are excluded.

See [integration, verification and outstanding work](docs/CASEY_6_DEFINITIVO_PREVIEW.md). This branch uses Preview configuration: do not merge or promote it directly to production.

Production remains on main. Calendar/email writes are disabled here. Dashboard and Campus shell remain demonstrations. Gemini generation is currently blocked by the configured provider project's depleted prepaid credits. The existing RAG index has only two QA smoke records and no approved documents; the complete original corpus still needs to be identified.
