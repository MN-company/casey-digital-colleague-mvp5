# Interaction release — 19 October 2026

Production deployment explicitly requested by the user after review. No schema migration or credential change.

## Behavior

- Correct script dependency order; browser smoke loads the original document.
- Idempotent avatar state switches; obsolete video callbacks ignored; hidden video paused. Two existing video players remain, with browser cache reuse and no video reload for repeated audio chunks.
- Standard subtitles follow native speech sentence events and remain scrollable. Live transcripts accumulate per response, reveal against the local audio playback clock and persist at audio completion. Live alignment is approximate: Gemini's transcript provides no word timestamps, so this is not phoneme/word forced alignment.
- Live endpointing waits 500 ms. Browser microphone prefers AudioWorklet with 20 ms packets, with ScriptProcessor fallback. Queued audio and tool duration metrics are held in memory, without text, keys or tokens.
- Written messages use the active Live socket. Recent conversation context transfers between Standard and Live in this tab, clears on reset/logout/identity expiry, and cannot authorize backend actions. Standard recognizer and native speech stop when Live starts; language changes restart Live with context; mute applies to Live output. Recognized speech renews the kiosk idle timer.
- Standard text uses Gemini streamGenerateContent and NDJSON to the browser. Policy text is withheld until a matching verified citation ID is present. Browser TTS begins after final validation, in sentence cues; native Live audio remains progressive. Streaming text does not imply zero model startup latency.
- Gemini Flash reasoning uses low thinking instead of the medium default. Real preview first text improved from an observed 12.0 s to 5.1 s in this small, non-statistical comparison; no universal speed claim.
- Shared tested date parser handles IT/EN/ES weekdays, ISO/day-first/textual dates, AM/PM, Rome calendar/DST arithmetic, invalid/past dates and ambiguous small hours. Time-only follow-ups retain the day; new dates reset the prior hour. Ordinary information questions do not force the awaiting-slot workflow. Dates are proposals only; real Calendar filtering and explicit confirmation remain mandatory.
- Legacy verified-source search compares full content, normalizes accents, expands a small explicit multilingual vocabulary and selects an excerpt near a match. No embeddings or semantic-search claim; existing 100-document limit remains. Future RAG/FAQ activation remains opt-in.

## Verification before production

51 Node tests pass, including fragmented SSE, unsupported-source suppression, date and DST edge cases, cumulative Live transcripts, congestion, Live typed input and existing production/preview authorization checks. Browser loaded the actual local document with no JavaScript errors.

Real restricted-backend checks: date follow-up retained 20 October while changing 15:00 to 16:00; Calendar FreeBusy read returned 12 available slots; token constrained to 500 ms silence; SSE delivered six progressive text events and a final answer. Real Gemini Live remembered “verde” across two typed turns. A locally synthesized Italian PCM utterance was streamed at realtime speed and recognized, generating “Buongiorno!” audio. The utterance had nonzero measured signal; no personal audio was used. An additional fresh audio-only session kept sending silence without audioStreamEnd: automatic endpointing recognized the utterance and produced audio about 1.1 seconds after the synthetic speech ended. This is not a physical microphone/noise/echo certification.

Production checks and final deployment identity are recorded in the task's delivered verification report. No successful real booking or email send is claimed: no authenticated test student/calendar was supplied. Existing confirmation and identity denial tests remain mandatory.

## Avatar direction

Keep behavior, rendering and audio as separate components. For this release, the video state machine changes only on actual state transitions, while audio capture runs in an AudioWorklet. A future local 3D renderer can consume the same states and an audio envelope/viseme timeline without entering the model request path. A 3D model does not inherently add network/model latency; its download, GPU use and frame scheduling need testing on the weakest target device. Introduce it only with a rigged asset, reduced geometry/textures, a 30 fps budget and the current video/photo fallback. This release does not invent or ship a new 3D likeness.

## Rollback

Baseline production frontend deployment dpl_HjXnboxPS8nzdKemM9XKQ5SAvSLx / main 2f5b940. Downloaded original UI v20 and Live token v10 source snapshots are saved outside the repository in this chat's work/rollback directory. Restore both frontend and backend together. Existing clients can still use the non-stream JSON turn endpoint; the new client accepts JSON while backend rollout completes.
