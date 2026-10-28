# Badge handoff continuation regression

The production transcript retained the original badge request, but subsequent messages “Ok quindi?” and “Quando posso cambiare orario per il ritiro?” went to document retrieval and returned a course clarification. Recognizing only the first complete campus request did not cover continuation.

The native app now derives pending booking intent from the imported user turns, opens actual protected availability on entry, and routes short continuations/date choices to the existing booking gateway. A unique exact time choice prepares the existing confirmation card. Only its visible confirmation button can commit. New information topics and cancellations clear the pending conversational intent. Reloading an authenticated transferred chat restores the protected chat before text or voice starts.

QR issuance checkpoints any unfinished Live transcript before taking the snapshot. Mobile Live instructions explicitly carry pending booking requests into follow-ups and use availability tools rather than handbook search.

Validation: 143 Node tests pass, including the actual reported two follow-up phrases, date selection preparing confirmation without commit, and transcript checkpoint ordering. A production integration dry run loaded the real client controller with a synthetic verified account, passed issue/scan/claim, restored both original turns, fetched real Google Calendar availability for both follow-ups and “Domani mattina”, and verified the new turns persisted in the same protected chat. No real appointment was created or moved. A registered student identity is still required by the existing production preparation/commit authorization; this change does not bypass it.
