# Casey demo · lista audio ElevenLabs

Generata da `demo/generate-audio-script.mjs` a partire da `demo-script.js` (stessa fonte usata dal runtime). Non modificare a mano: rigenera con `node demo/generate-audio-script.mjs`. Lingua it-IT, voce maschile di Casey. Un file mp3 per riga in `assets/demo-audio/`.

> Gli orari sono scritti nel testo dei casi 2 e 4: se cambiano, aggiorna `demo-script.js` (anche `phoneSlots`), rigenera questo file e ri-registra l'audio.

Domande dell'utente (non registrate, pronunciate dal vivo; tasti 1–4 sul totem):

1. **checkin** · «Ciao Casey! Sono un po' in ritardo per la lezione… come funziona il check-in su PRONOTE?»
2. **badge** · «Casey, dovevo ritirare il badge, ma avevo lezione proprio a quell'ora. C'è un'altra data?»
3. **stage** · «Casey, un'azienda mi ha proposto uno stage part-time, tipo venti ore a settimana. Posso farlo mentre seguo le lezioni?»
4. **career** · «Ultima cosa, Casey: prima di accettare vorrei parlarne con qualcuno del Career Service. Quando posso prenotare un incontro?»

| file | testo per ElevenLabs | testo a schermo | note |
|---|---|---|---|
| `assets/demo-audio/caso1_checkin.mp3` | Ciao! Tranquillo, si fa in un attimo. Apri l'app PRONOTE, vai sulla lezione di oggi e tocca «Check-in». Se la lezione è già iniziata risulterai in ritardo: quindi fallo appena entri in aula. | Ciao! Tranquillo, si fa in un attimo. Apri l'app PRONOTE, vai sulla lezione di oggi e tocca «Check-in». Se la lezione è già iniziata risulterai in ritardo: quindi fallo appena entri in aula. | Caso 1 · totem. Tono rassicurante e pratico; «Check-in» come etichetta del pulsante. |
| `assets/demo-audio/caso2_badge.mp3` | Certo, capita spesso. I prossimi ritiri sono venerdì sei novembre alle undici, oppure lunedì nove alle due e mezza. Visto che è una prenotazione a tuo nome, continuiamo sul tuo telefono: inquadra il QR qui sotto. | Certo, capita spesso. I prossimi ritiri sono venerdì 6 novembre alle 11:00, oppure lunedì 9 novembre alle 14:30. Visto che è una prenotazione a tuo nome, continuiamo sul tuo telefono: inquadra il QR qui sotto. | Caso 2 · totem. Disponibile; date e orari letti per esteso; pausa breve prima di «inquadra il QR». |
| `assets/demo-audio/caso3_stage.mp3` | Complimenti, bella notizia! Si può fare, ma non decido io: uno stage durante i corsi va approvato dallo Student Office, che verifica che sia compatibile con le lezioni. Io però posso prepararti la richiesta e metterla in coda per loro. Continuiamo sul telefono: inquadra il QR. | Complimenti, bella notizia! Si può fare, ma non decido io: uno stage durante i corsi va approvato dallo Student Office, che verifica che sia compatibile con le lezioni. Io però posso prepararti la richiesta e metterla in coda per loro. Continuiamo sul telefono: inquadra il QR. | Caso 3 · totem. Entusiasmo sincero su «Complimenti», poi chiaro e onesto sul limite («non decido io»). |
| `assets/demo-audio/caso4_career.mp3` | Ottima idea. Il Career Service ha ancora due slot liberi: venerdì sei novembre alle quattro del pomeriggio, oppure martedì dieci alle nove e mezza. Scegli quello che preferisci dal telefono: ecco il QR. | Ottima idea. Il Career Service ha ancora due slot liberi: venerdì 6 novembre alle 16:00, oppure martedì 10 novembre alle 9:30. Scegli quello che preferisci dal telefono: ecco il QR. | Caso 4 · totem. Cordiale; date e orari letti per esteso; chiusura su «ecco il QR». |
| `assets/demo-audio/fallback.mp3` | Scusa, non ho capito bene. Puoi ripetere? | Scusa, non ho capito bene. Puoi ripetere? | Qualsiasi caso · totem. Gentile, leggermente dispiaciuto, ritmo lento. |

Le righe sul telefono (saluto con il nome, slot reali, richiesta di stage, conferma) sono solo testo e non hanno audio.
