# Tre flussi della presentazione

La voce usa Gemini Live con la configurazione vocale Casey. La ricerca e gli effetti operativi sono verificati dal backend. La disponibilità del fornitore ha quote e costi: il servizio non viene presentato come gratuito o illimitato.

## Check-in

«Ciao Casey come funziona il checkin quest'anno?» resta sul totem. Risposta dalla procedura PRONOTE del handbook 2026/2027, pagina fisica 7: QR dinamico mostrato in aula all'inizio della lezione. Il QR della lezione non è il QR di accesso a Casey. Nessuna consultazione di presenze personali e nessun trasferimento sull'app.

## Ritiro badge

«Dovrei ritirare il badge ma non riesco a farlo nell'orario che mi è stato assegnato, riusciamo a trovare un'altra data?» avvia la consultazione reale di disponibilità Student Office, verificata tramite il backend Google Calendar già collegato. Casey invita nel frattempo ad accedere all'app College. Il totem mostra gli orari restituiti e il QR per riprendere nella chat originale; dopo accesso la chat presenta gli slot e la conferma esistente.

Questo flusso cerca una nuova disponibilità. Non dichiara cancellato o spostato un appuntamento preesistente senza averne verificato proprietà e risultato. Nessun test conferma una prenotazione reale.

## Internship

«Ciao Casey avrei trovato un internship però da contratto sarebbe un part time e non un full time, potrebbe andare bene comunque?» crea una richiesta persistente in `casey_service_reviews`, con stato open, visibile subito nella coda del totem e consultabile dallo staff autenticato anche dopo. La stessa domanda nella stessa sessione non duplica la richiesta. Casey può dire “inserita nella coda” solamente dopo conferma del backend. L'idoneità del contratto resta una decisione umana; l'inserimento non è un'approvazione.

Lo staff autenticato può prendere in carico la richiesta. Le API di lettura globale e aggiornamento richiedono la sessione staff; la tabella non è leggibile o scrivibile direttamente da anon/authenticated. Il riferimento alla sessione viene rimosso quando questa viene eliminata, senza cancellare il lavoro dello staff.

## Verifiche

135 test Node e 38 Deno nella suite corrente. Sei nuovi test coprono i tre intenti, fonte PRONOTE mancante, lettura Calendar senza commit, salvataggio/idempotenza della revisione e fallimento database senza falsa conferma. Migrazione applicata in Preview e produzione. Smoke API con dry_run per non sporcare la coda operativa; i risultati Google reali e i test WebSocket/browser vengono controllati prima del completamento del rilascio.
