# Pietro app integration — 27 October 2026

Input archive SHA256: d98574a8c9d5ab2b3196fb17ef200872770dad64d43bd3dfd96db628ae1fd8bc.

Only the updated index, College and Campus apps and bust image were taken from the archive. Its older backend, voice adapters, configuration and CI were excluded. Native app chat calls the current production classify/session/turn APIs, supplies bounded conversation history and renders escaped handbook citations. It has no canned policy fallback. The displayed Marco persona is a visual fixture, never an authenticated identity.

Personal data, saved account conversations, handoff and Student Office appointments use the existing authenticated client via the account panel. Booking still requires identity, fresh availability, prepare and explicit confirmation. The main kiosk, Live and real staff calendar adapters are preserved byte for byte.

The package did not include real event ticketing, restaurant ordering, parcel or campus badge provider APIs. Simulated confirmations are blocked; the app does not claim to have executed these operations. Campus agenda now directs to authenticated Student Office appointments. Informational Campus browsing remains supplied editorial content, not a live feed from provider APIs. Native Campus voice uses browser speech over the real text RAG; the kiosk/account retain Gemini Live. Physical microphone and speech quality require device acceptance.

No schema or corpus migration and no document deletion. Baseline production: 37 documents, 1,616 chunks, 1,616 embeddings; original 22 documents/777 chunks retained. Rollback: deployment dpl_78kqdesMQ7QLgHwmM3NYy18pmmd2, main 12f85bce19ef4bd6a7d096ca29fa7ca86ef9d836.

Validation: 71 Node tests and 21 Deno tests passed. New tests cover the native adapter, protected routing, history bounds, escaped sources and network errors. Browser and production evidence is recorded in the release report outside the public deployment.
