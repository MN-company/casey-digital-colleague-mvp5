# QR voice continuity, vocal direction and avatar

Showing a QR no longer stops the active Gemini Live session. The QR tool returns a structured handoff_ready result; visual copy stays silent while Live is active, so the model explains the handoff in its existing voice. Voice stops and kiosk history clears only when the transfer is consumed. Typed input during Live uses the same connection.

Server-owned vocal direction now accompanies Charon on every maintained Live issuer and the guest configuration: warm, calm, clear, conversational, short phrases, natural pronunciation and stable delivery across the QR explanation. This is a designed delivery style over the existing Charon voice, not a newly cloned speaker. Tool authorization, privacy and source rules remain higher priority. Google documents tone/accent direction through system instructions: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/live-api/configure-language-voice

Gemini's avatar callbacks now reach the original A-F video controller. C loops during response generation/playback, then A returns at idle; finite gestures return to idle. Video switching preserves the current visible frame until the next video loads. The existing College/Farm media and presentation layout remain in use.

The kiosk also has an Ascolta control to hear typed responses without granting microphone access. Failure in this mode returns to text rather than starting browser recognition or speech. Microphone mode retains its pre-existing failure fallback; QR display no longer triggers it.

Regression controls cover QR appearance/consumption, absence of browser speech during a Live QR, the actual video controller switching C/A, and listen-only failure without microphone access. Physical microphone, speaker preference and subjective voice design acceptance remain manual; deployment/browser checks are documented in the release report.
