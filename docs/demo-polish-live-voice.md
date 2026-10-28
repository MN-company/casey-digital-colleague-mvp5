# Product polish and native Gemini voice

The dashboard brand is Casey - your digital colleague. Passwordless email access has one entry flow: no separate signup tab.

The existing native microphone now invokes the metered Gemini Live PCM/WebSocket client. It no longer calls native SpeechRecognition for this entry point. Repeated activation stops the Live session; state and errors appear in the chat. Lazy loading can retry after a failed script fetch. Beta voice preserves existing account helpers rather than replacing the whole Handoff API.

Mail and approval queue contain explicit, fictional presentation cases for College and Farm. Each office has four messages and three reviewable requests; student mail contains a welcome example. Approve saves a draft to the local demo mailbox, not an outbound email; reject has a distinct state. The UI does not claim an email was sent. Mail rows are keyboard-operable buttons and draft textareas have labels. These fixtures do not create production records or Gmail messages.

Additional audit fixes: removed an inactive profile download control, static unread badges and an unverified online indicator. Calendar reads no longer run when another dashboard tab is active.

Validation: 119 Node tests, inline JavaScript syntax checks, browser draft approval/queue count, and an actual metered token → Gemini Live WebSocket → generated audio turn. Live proof: gemini-3.8-live setup acknowledged, five audio chunks, output transcript and turn completion. No physical microphone or real email delivery was tested. No new Google permission, booking or backend migration.

The deeper product audit is delivered separately with current screenshots. Remaining areas include campus services without real integrations, illustrative entry QR, manually curated event data, source provenance lost when conversations are restored, parallel chat implementations and mixed-language labels. These are product coverage and maintainability findings, not a claim that AI authorship can be inferred from code.
