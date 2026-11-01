# Casey demo · lista audio ElevenLabs

Generata da `demo/generate-audio-script.mjs` a partire da `demo-script.js` (stessa fonte usata dal runtime). Non modificare a mano: rigenera con `node demo/generate-audio-script.mjs`. Lingua it-IT, voce Casey. Un file mp3 per riga in `assets/demo-audio/`.

Slot del calendario demo (`slots` in `demo-script.js`): «giovedì 12 novembre alle 10:00», «giovedì 12 novembre alle 15:30».

> **Attenzione:** se cambi `slots`, rigenera questo file; l'audio booking-totem-1 va ri-registrato perché pronuncia gli orari.

Domande dell'utente (non registrate, pronunciate dal vivo):

1. **checkin** · «Ciao Casey, come funziona il check-in quest'anno?»
2. **badge** · «Dovrei ritirare il badge, ma non riesco nell'orario che mi è stato assegnato. Riusciamo a trovare un'altra data?»
3. **internship** · «Ciao Casey, ho trovato un'internship, però da contratto sarebbe part time e non full time. Potrebbe andare bene comunque?»
4. **booking** · «Vorrei prenotare un appuntamento con lo Student Office.»

| ID | file | testo | note di intonazione |
|---|---|---|---|
| checkin-totem-1 | `assets/demo-audio/checkin-totem-1.mp3` | Quest'anno il check-in segue la procedura PRONOTE: all'inizio della lezione, in aula, viene mostrato un QR dinamico. Attenzione, non è il QR di Casey. Trovi la procedura completa nell'handbook 2026/2027. | checkin · totem. Tono informativo e sereno; leggera enfasi su «non è il QR di Casey». «2026/2027» = «duemilaventisei duemilaventisette». |
| badge-totem-1 | `assets/demo-audio/badge-totem-1.mp3` | Certo, cerchiamo insieme una nuova disponibilità con lo Student Office. Per prenotare serve il tuo account College: inquadra il QR qui sotto e continuiamo sul tuo telefono, nella stessa conversazione. | badge · totem. Disponibile e rassicurante; pausa breve prima di «inquadra il QR». |
| badge-phone-1 | `assets/demo-audio/badge-phone-1.mp3` | Qui sotto trovi gli orari dello Student Office: scegline uno e premi «Confermo appuntamento». Finché non confermi, non prenoto nulla. | badge · telefono. Pratico, cordiale; «Confermo appuntamento» detto come etichetta del pulsante. |
| internship-totem-1 | `assets/demo-audio/internship-totem-1.mp3` | Bella notizia! Però su un contratto part time non posso decidere io: serve una revisione dello Student Office. Inquadra il QR qui sotto e dal tuo telefono invio la richiesta allo staff. | internship · totem. Entusiasmo sincero su «Bella notizia!», poi tono chiaro e onesto sul limite. |
| internship-phone-a | `assets/demo-audio/internship-phone-a.mp3` | Invio la tua richiesta allo Student Office, un attimo. | internship · telefono. Breve, operativo, ritmo veloce. |
| internship-phone-b | `assets/demo-audio/internship-phone-b.mp3` | Fatto: la richiesta è nella coda di revisione dello Student Office. La decisione spetta allo staff. | internship · telefono. Calmo e preciso; si riproduce solo dopo conferma del backend (review_saved). |
| booking-totem-1 | `assets/demo-audio/booking-totem-1.mp3` | Volentieri. Lo Student Office ha due orari liberi: giovedì 12 novembre alle 10:00 oppure giovedì 12 novembre alle 15:30. Inquadra il QR qui sotto e scegli dal tuo telefono. | booking · totem. Cordiale; data e ora lette per esteso. Contiene gli slot: se cambiano, va ri-registrato. |
| booking-phone-1 | `assets/demo-audio/booking-phone-1.mp3` | Bene, qui sotto vedi gli orari dello Student Office: scegline uno e premi «Confermo appuntamento». Finché non confermi, non prenoto nulla. | booking · telefono. Pratico, cordiale; come badge-phone-1 ma frase diversa. |
| fallback | `assets/demo-audio/fallback.mp3` | Scusa, non ho sentito bene. Puoi ripetere? | qualsiasi · totem. Gentile, leggermente dispiaciuto, ritmo lento. |

Il saluto sul telefono («Ciao <nome>, eccoci sul tuo telefono.») è dinamico e non ha audio.
