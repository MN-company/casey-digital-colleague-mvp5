# Casey Live Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Branch `demo/casey-video`, deployed on Vercel, runs a **live** scripted demo of 4 use cases with `?demo=1`. The Casey conversation is fake: the user speaks, Casey answers with pre-recorded audio. The QR handoff, Google Calendar, Gmail and the Student Office review queue are real.

**Architecture:** Two new runtime files.
- `demo-mode.js` on the totem (`index.html`): replaces turn and voice with an ordered script, browser speech recognition with live (interim) subtitles, mp3 playback, Stop, and a hidden presenter key.
- `demo-phone.js` in the phone app (`app-blu.html`): replaces `chat_turn` with scripted lines and hides the sign-in UI.

Shared data lives in `demo-script.js`. Real effects go only through existing clients and Edge Functions: `handover()`/`claim`, handoff `slots`/`prepare`/`commit`, `service_case`. No backend logic change. The only backend change is adding the demo origin to CORS, in a separate PR deployed together with Pietro.

**Tech Stack:** Vanilla JS IIFE modules on `window.*`, static HTML, Web Speech `SpeechRecognition`, `HTMLAudioElement`, `node:test` + `vm` tests (see `tests/security-boundaries.test.mjs` for the fixture style).

**Spec:** `../../../../../CODEX.md` (handoff folder), sections dated 2026-11-01.

## Global Constraints

- Design, avatar A–F, layout: unchanged. No new chat container or iframe (use existing renderers: `say()` on totem, `restoreConversation`/chat bubbles on phone).
- Without `?demo=1` every page behaves exactly as `main`. The existing suite stays green, except the known failure at `tests/native-handoff.test.mjs:13` (past date), which is not touched.
- In demo mode: zero calls to `turn`, `classify`, `chat_turn`, `knowledge` or Gemini Live / live-token.
- Booking: only the "Confermo appuntamento" button triggers `commit`.
- Case 3 says "inserita in coda" only after `service_case` returns `review_saved === true`.
- Stop: aborts recognition, audio and timers; late callbacks are no-ops (revision counter).
- New code goes only in external `.js` files (CSP `script-src 'self'`).
- No emails, passwords or PII in the repo.
- Language: `it-IT`.
- Question order fixed: 1 check-in → 2 badge → 3 internship → 4 booking.

## Review Focus

1. Misheard or partial phrase: the script still advances in order. Keywords only confirm the step; a mismatch does not block (test in Task 1).
2. Totem goes idle after a QR claim (`goIdle` → `messages.clear`): the script step must survive. Persist the index in `sessionStorage` key `casey-demo-step` (test in Task 2).
3. Stop during audio, or the hidden key during audio: no double line, no late handover (test in Task 2).
4. Phone with no stored auth in demo mode: never show the sign-in sheet. Show "Sessione demo non attiva" unless `?setup=1` (test in Task 3).
5. `service_case` fails or returns `review_saved !== true`: Casey shows a neutral error line and never claims the request is queued (test in Task 3).

---

## File Structure

- Create `demo-script.js`: data plus pure helpers. Holds totem lines, phone lines and the audio manifest.
- Create `demo-mode.js`: totem runtime.
- Create `demo-phone.js`: phone runtime.
- Create `demo/AUDIO_SCRIPT.md`: ElevenLabs list of ID, file and text. Create `assets/demo-audio/.gitkeep`.
- Modify `index.html:1115`: add `demo-script.js` and `demo-mode.js` after `kiosk-voice.js`.
- Modify `app-blu.html:1432`: add `demo-script.js` and `demo-phone.js` after `app-auth-shell.js`.
- Modify `definitivo-kiosk.js`, function `handover`: URL base from `CASEY_CONFIG.demoAppBase`, append `demo=1` when demo is active, allow `intent` values `badge` and `internship`.
- Modify `vercel.json`: `"deploymentEnabled": {"main": true, "demo/casey-video": true, "*": false}`.
- Tests: `tests/demo-script.test.mjs`, `tests/demo-mode.test.mjs`, `tests/demo-phone.test.mjs`.
- Separate branch `fix/cors-demo-origin` from `main`: add the Vercel URL of the demo branch to the origin sets in `supabase/functions/casey-definitivo-{handoff,ui,live}/index.ts` and `supabase/functions/casey-original-ui/index.js:81`.

---

### Task 1: Script data + audio list

**Files:** Create `demo-script.js`, `demo/AUDIO_SCRIPT.md`, `assets/demo-audio/.gitkeep`. Test: `tests/demo-script.test.mjs`.

**Interfaces:**
- Produces: `window.CaseyDemoScript`, frozen:
  - `steps: Step[]` with length 4, in order `checkin`, `badge`, `internship`, `booking`.
  - `Step = { id, question: string, keywords: string[], totem: Line[], handoff: null | { intent: 'badge'|'internship' }, phone: Line[] }`
  - `Line = { id: string, text: string, audio: string }`. Rule: `audio === 'assets/demo-audio/' + id + '.mp3'`.
  - `fallback: Line` (id `fallback`, "Scusa, non ho sentito bene. Puoi ripetere?")
  - `confirms(step: Step, text: string): boolean`. Keyword hit, case- and accent-insensitive.
  - `phoneGreeting(name: string|null): string`. Returns `"Ciao <name>, eccoci sul tuo telefono."`, or `"Eccoci sul tuo telefono."` if there is no name.

Content to write. Italian, realistic, consistent with `docs/three-live-campus-cases.md`; final copy will be reviewed by the user.
- `checkin`: question "Ciao Casey, come funziona il check-in quest'anno?". 1 totem line (PRONOTE: dynamic QR shown in class at the start of the lesson; not Casey's QR). No handoff.
- `badge`: question about picking up the badge outside the assigned slot. Totem line 1 explains alternatives exist and the account is needed, then QR. `handoff:{intent:'badge'}`. Phone: real slots come from the app, plus one scripted line inviting the user to pick a slot and press "Confermo appuntamento".
- `internship`: question about a part-time internship. Totem line: this needs Student Office review, continue on phone. `handoff:{intent:'internship'}`. Phone line A (sent before the call): "Invio la tua richiesta allo Student Office…". Phone line B (only after success): "Fatto: la richiesta è nella coda di revisione dello Student Office. La decisione spetta allo staff."
- `booking`: question asking for an appointment with the Student Office. Totem line names the fixed free slots, placeholder `{{SLOT_1}}` / `{{SLOT_2}}` to be filled when the calendar is prepared, then QR. `handoff:{intent:'badge'}`, which reuses the booking flow. Phone line as in badge.
- `AUDIO_SCRIPT.md` is generated from the same data: one table row per Line (ID · file · text · intonation note), plus `fallback`.

- [ ] Step 1: Failing tests. Load in `vm` with `window={}` and assert:
  - step ids are in order;
  - every `audio` follows the rule and ids are unique across all lines;
  - `confirms(steps[0],'come funziona il CHECK-IN')`, `confirms(steps[2],'internship part time')` and `confirms(steps[3],'vorrei prenotare un appuntamento')` are all true;
  - `confirms(steps[0],'')` is false;
  - `steps[1].handoff.intent==='badge'` and `steps[2].handoff.intent==='internship'`;
  - `phoneGreeting('Pietro').includes('Pietro')`.
- [ ] Step 2: `node --test tests/demo-script.test.mjs` → FAIL.
- [ ] Step 3: Implement plus `AUDIO_SCRIPT.md`.
- [ ] Step 4: → PASS.
- [ ] Step 5: Commit `feat(demo): ordered live-demo script and ElevenLabs audio list`.

### Task 2: Totem runtime `demo-mode.js`

**Files:** Create `demo-mode.js`. Modify `index.html:1115`. Test: `tests/demo-mode.test.mjs`.

**Interfaces:**
- Consumes: `CaseyDemoScript`, `window.say(text,source,kind,label,end)`, `window.setAvatarState('A'|'C'|'E')`, `window.handover(note,intent)`, `window.CaseyDialogue.append(role,text)`, `window.toggleMic`, `#capText` (subtitle), `#micBtn`.
- Produces: `window.CaseyDemo = { active, step(): number, stop(): void, advance(text?: string): Promise<void>, reset(): void }`, plus `CASEY_CONFIG.demoActive = true`.

Behavior:
- Active only when `?demo=1`; otherwise the file is a no-op.
- `window.send = text => CaseyDemo.advance(text)`. `window.toggleMic` starts its own recognizer (pattern of `casey-voice-session.js:11-16`, but `interimResults=true`, `lang='it-IT'`). Interim text is written live to `#capText`. On final result, `advance(final)`.
- `advance(text)`:
  - take `steps[index]` (index from `sessionStorage['casey-demo-step']`, default 0); append the user turn;
  - avatar `E` for 700 ms, then for each totem line: `say(text,…)`, play the audio, avatar `C`, and on `ended` avatar `A`;
  - if `handoff`, call `handover(undefined, handoff.intent)` after the last audio;
  - then increment the index (wrapping after 4 is not needed: clamp at 3 and repeat `fallback`).
- Missing or failed audio: keep the text, avatar `C` for `max(2000, len*55)` ms, continue.
- Hidden presenter key: `Shift+ArrowRight` → `advance(steps[index].question)`, meaning "force this step". `Shift+Backspace` → `reset()`, which sets step 0, stops, and goes idle.
- `stop()`: abort recognizer, pause and reset audio, clear timers, `revision++`. Wired to the mic/stop button while running.
- Totem sign-in entry points hidden with `hidden=true` in demo mode. The implementer locates them in `index.html` (account/login buttons, `#caseyPasswordForm`).

- [ ] Step 1: Failing tests (fake `window`, `document`, `Audio`, `SpeechRecognition`, timers):
  - no `?demo=1` → `send` unchanged;
  - with demo: `send('qualsiasi')` uses step 0 even if keywords miss;
  - the badge step calls `handover(undefined,'badge')` once, after `ended`;
  - `stop()` during audio → later `ended` does nothing;
  - interim result updates `#capText` without advancing;
  - the step index survives a simulated `goIdle` (sessionStorage);
  - `Shift+ArrowRight` advances exactly once while audio is playing (no double);
  - no `fetch` to `functions/v1/` in any test.
- [ ] Step 2: FAIL. Step 3: implement plus script tags. Step 4: `node --test tests/*.test.mjs` PASS (known date failure excepted).
- [ ] Step 5: Commit `feat(demo): totem live-demo runtime with browser speech, audio and presenter key`.

### Task 3: QR to demo phone app + phone runtime `demo-phone.js`

**Files:** Modify `definitivo-kiosk.js` (`handover`) and `app-blu.html:1432`. Create `demo-phone.js`. Tests: `tests/demo-mode.test.mjs` (QR), `tests/demo-phone.test.mjs`.

**Interfaces:**
- Consumes on the totem: `CASEY_CONFIG.demoAppBase?: string`, `CASEY_CONFIG.demoActive?: boolean`.
- Consumes on the phone:
  - the existing `app-auth-shell.js` internals reached through globals: `window.CaseyNativeHandoff` (check what it exposes: `active`, `slots()`), `HandoffAPI.auth()`, `HandoffAPI.call('operation',{operation:'profile'})`;
  - `window.CaseyCampusCases.handle(query)`;
  - `window.CaseyStudentAccess.open`.
- Produces on the phone: `window.CaseyDemoPhone = { active, intent(): string|null }`.

Totem (`definitivo-kiosk.js`):
- The URL is `new URL(file, C.demoAppBase || location.href)`.
- If `C.demoActive`, `url.searchParams.set('demo','1')`.
- `intent` is set for `badge` **and** `internship` (today only `badge`).
- `demo-mode.js` sets `demoAppBase = location.origin + '/'` so the phone opens the **same deployed branch**.

Phone (`demo-phone.js`, active only with `?demo=1`):
- **Login hidden.** If `!HandoffAPI.auth()` and there is no `?setup=1`: replace `CaseyStudentAccess.open` with a no-op that shows the status "Sessione demo non attiva". With `?setup=1` the normal sign-in works, and the presenter uses it before going live.
- **Greeting.** After claim (`casey:dialogue` or the first `restoreConversation`), call `operation:'profile'`; if it has a display name, append the assistant line `phoneGreeting(name)`. The name comes only from the server profile, never from the client.
- **Intent `internship`.**
  - Append phone line A.
  - Run `await CaseyCampusCases.handle(<step 3 question from script>)`.
  - Then, if `r.review_saved === true`, append line B; otherwise append "Non riesco a inviare la richiesta adesso. Riprova tra poco." and never say "in coda".
  - Guard: run once per chat (`sessionStorage['casey-demo-internship-'+chatId]`).
- **Intent `badge`.** Keep the existing slots flow (`enter()` already calls `slots()`); append the scripted line.
- **Free text in demo.** Wrap the phone answer path: if the booking phase is not `awaiting_slot`, return the scripted fallback instead of calling `chat_turn`. Find the hook: `app().` answer callback registered by `app-auth-shell.js`. If it is not reachable through a global, add a minimal, documented `window.CaseyNativeHandoff.answerOverride` check inside `answer()`, active only when set.

- [ ] Step 1: Failing tests.
  - Totem QR:
    - with `demoAppBase='https://demo.example/'` and `demoActive` → the URL starts with `https://demo.example/app-blu.html?casey=1`, contains `demo=1`, `intent=internship` for step 3, and `#handoff=`; it never contains `localhost` when a base is given;
    - without demo → same URL as before.
  - Phone:
    - no auth plus demo → `CaseyStudentAccess.open()` does not open the sheet;
    - `?setup=1` → the original is called;
    - internship plus `review_saved:true` → line B is present;
    - `review_saved:false` → the error line is present and no "in coda" text appears;
    - the second load of the same chat does not call `handle` again;
    - free text in demo never calls `HandoffAPI.call('chat_turn')`;
    - without `?demo=1` → nothing changes.
- [ ] Step 2: FAIL. Step 3: implement. Step 4: full suite PASS (known date failure excepted).
- [ ] Step 5: Commit `feat(demo): demo QR to branch app, scripted phone flow, real review queue`.

### Task 4: Vercel config + push branch

- [ ] Change `vercel.json` `deploymentEnabled` as in File Structure; commit `chore(demo): enable Vercel deployments for demo branch`.
- [ ] `git push -u origin demo/casey-video` (authorized by the user).
- [ ] Read the deployment URL from Vercel (`list_deployments` for project `prj_g7Mxl0hhmXQk8Oi6Caus3DQsPA1x`, team `team_tlVkdTknVZ34Ty7nah0lkj8w`). Prefer the stable branch alias `…-git-demo-casey-video-…vercel.app`. Verify that `index.html?demo=1` is served with status 200 and that the served `demo-mode.js` hash matches the commit.

### Task 5: CORS PR (no deploy)

- [ ] `git switch -c fix/cors-demo-origin origin/main`. Add the branch alias URL from Task 4 to the 4 origin sets. Only a string is added; no logic changes.
- [ ] `deno test` for the touched functions (or the repo's `tests/*.test.ts` that import them), plus `node --test tests/*.test.mjs`.
- [ ] Commit `fix(cors): allow demo branch origin`, push, then open a PR to `main` with a description for Pietro.
- [ ] **No deploy.** The deploy of the 4 functions to production is coordinated with Pietro, and the merge to `main` triggers `deploy-supabase.yml`. Merging is therefore the deploy action, so do not merge.

### Task 6: Verification and handover (with user)

- [ ] Report: automated tests, served-asset check, and what was **not** verified (real microphone, phone, real booking, Gmail).
- [ ] Update `CODEX.md` (handoff folder): what was built, the URLs, the PR, open items (copy review, mp3, accounts in roster, staff Google connection, slots, CORS deploy).
