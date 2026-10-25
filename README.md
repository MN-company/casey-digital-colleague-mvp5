# Casey 6.0

Pietro’s updated College and Campus frontends, with real authenticated chats, saved history and secure QR continuity. The chat separates conversation, document questions and personal operations before retrieval, and uses Gemini to write short answers with separate citations.

The frontend targets versioned production adapters: `casey-definitivo-ui`, `casey-definitivo-handoff`, and `casey-definitivo-live`. Secrets stay on Supabase. Gemini Live is attempted first for voice, with a speech/AI/speech fallback and one Stop control.

The library uses the original user-approved regulations archive: 22 PDFs and 777 source cards. Source contents and demo passwords are private and are not shipped with the static frontend. Legacy booking authorization, explicit confirmation and Google availability checks remain enforced on the backend.

See [release details and validation](docs/CASEY_6_RELEASE_20261025.md). Office/Campus shell records remain visual demonstrations; actual chat, document search, authentication and protected appointment operations use the backend.
