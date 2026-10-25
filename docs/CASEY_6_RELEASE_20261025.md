# Casey 6 release — 25 October 2026

## Result

The user explicitly authorized the updated frontend and production release. This supersedes the Preview-only configuration and release prohibition in the earlier dated Preview notes.

“Come stai?” now routes to conversation before any profile or document lookup. Information requests search the approved source library and its source-backed structural links, then Gemini writes a short answer; raw PDF paragraphs are no longer chat replies. Operational requests use the existing authenticated backend with fresh authorization, availability and explicit UI commitment. The confirmation explanation is removed from ordinary chat UI, while the actual confirmation step remains enforced when an action is prepared.

The original regulations archive contributes 22 PDFs, 262 pages, 777 source cards and 636 structural/literal-reference links. Approval is by the user for the demo, not institutional certification. Staff/internal procedures and unverified institution scopes remain excluded from student answers. The existing vector-ready schema is retained; current retrieval is lexical plus structural expansion, not fabricated embeddings.

Conversation, information and operation-routing caches are separate. Information cache keys include scope, language and dialogue context; source-dependent entries are revalidated against content, document version, approval and applicability. No availability or completed operation result is reused as an authorization decision.

Gemini 3.8 returned temporary overload during testing. The configured text fallback to Gemini 3.5 Flash Lite was verified with real generated responses. Gemini Live token provisioning and an actual constrained WebSocket setup completed successfully. The browser controller tries Live first, then the fallback, and Stop closes both microphone input and output.

## Frontend merge

Compared the previous archive against the latest user-supplied Downloads/MVP DEFINITIVO.zip. Both new avatar/video sets, Campus red styling, centered kiosk layout and separate presentation URLs are incorporated. Pietro’s removed usage metrics and automatic appointment suggestions stay removed. His simulated app conversation engines are replaced with the account-owned chat client; visual app sections retain their layout.

The blue app has no language selector. The chat header has a hamburger menu with real saved conversations. Account email, explanatory safeguards and redundant voice controls are removed from the main chat view. A left-hand composer control switches among voice, Stop and send, with an explicitly visual attachment “+”. Attachment upload is not implemented or represented as successful.

## Validation

- 66 Node checks: conversation continuity, privacy routes, booking guards, Live protocol and voice lifecycle.
- 11 Deno checks: source scoping, candidate exclusion, small-talk isolation and AI synthesis.
- 17 browser checks: actual account login, red/blue UI, source-free small talk, history menu, composer states, Live/fallback/Stop and absence of runtime errors.
- Real cloud responses verified “Come stai?” without a document and an animal-policy answer in two sentences with PDF citations.
- Production source readback: 22 approved demo documents, 777 cards, zero Chichester withdrawal-source leakage in the Ca’ Foscari query used for validation.

Browser audio checks use simulated devices and do not establish the physical microphone/speaker experience. No real appointment is created by release testing. The office/Campus shell agenda remains a labelled demonstration; Google Calendar can also be opened directly.

## Release isolation and rollback

Production project: oxzraaadxqsruibinlxn. New adapter names are versioned separately from the established operational functions. Evidence/library migrations are additive; existing bookings, Google connections and account histories are not replaced. No original source PDF contents, API secrets or demo passwords are published to GitHub/Vercel.

Previous frontend rollback candidate: dpl_91tguPdMR211hZN12apZZqqtgCWC, main 06a612cee27247e092de279b3142b2f484956bb9. Rolling the frontend back leaves additive library tables intact and restores the previous frontend configuration.
