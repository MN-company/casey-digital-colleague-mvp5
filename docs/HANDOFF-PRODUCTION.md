# Casey Handoff: rilascio con continuità completa

La pagina Casey originale conserva Emma, Sofia, avatar e impostazioni e torna a usare `casey-original-ui`. Il telefono usa una chat dedicata su `college.html`. Entrambe le pagine condividono il progetto Supabase `oxzraaadxqsruibinlxn` e i secret esistenti. L'app College resta una simulazione: non integra l'SSO proprietario H-FARM.

## Passi e review

| Passo | Cambiamento | Review e verifica |
| --- | --- | --- |
| 1 | Routing distingue procedure, richieste personali, ambiguità e negazioni | Corpus IT/EN/ES, compatibilità dei test esistenti. Nessuna classificazione concede autorizzazioni. |
| 2 | Recupero scansione con conferma persa, controllo totem dopo scadenza, chiusura sessione originale | Identico account + identico tentativo possono recuperare lo stesso claim per 5 minuti; altri tentativi/account non riusano il QR. Test reale di risposta di rete persa. |
| 3 | Libreria per account, sessioni simultanee, salvataggi versionati, bozze di questa scheda | Nuovo browser senza chat ID trova la cronologia; entrambi i dispositivi restano connessi. Conflitti append-only conservano entrambi i messaggi; modifiche incompatibili fermano il salvataggio. Test di risposta arrivata durante save e bozza offline dopo reload. |
| 4 | Ripresa operativa con disponibilità reali e conferma visibile | Gateway verso l'autorizzazione originale, verifica del vero registro studenti, FreeBusy, nonce legato a sessione, lock tra dispositivi e request ID idempotente. Test con backend simulato del protocollo di conferma; lettura del calendario reale. Nessuna prenotazione reale creata durante il collaudo. |
| 5 | Stato voce esplicito, interruzione, microfono solo su scelta, spegnimento in background | Test del ciclo microfono e interruzione, Gemini Live reale in browser con dispositivo audio sintetico, continuità testo/voce con cronologia integrale. |

## Confini e conservazione

- Il primo account autenticato che scansiona acquisisce **tutto** il contesto: il QR è una capacità di accesso, non prova di identità. Nessuna matricola al totem. La scadenza è 120 secondi, il consumo atomico, il token casuale da 256 bit è conservato soltanto come hash; il frammento URL viene rimosso subito.
- Non trasferiamo token Auth, credenziali Google o conferme operative del totem. Le azioni sul telefono usano l'identità verificata attuale e richiedono una nuova conferma. La vecchia sessione operativa del totem viene invalidata nel claim e la sua cronologia server eliminata; lo schermo si pulisce solo quando il claim è confermato.
- Nuove chat: massimo 30 giorni dalla creazione; le precedenti mantengono la loro scadenza. Chat non acquisite: pulizia dopo 10 minuti. Token/sessioni del telefono: massimo 24 ore, ripristinabili con Auth. Le bozze e credenziali restano nella sessionStorage della scheda e sono rimosse al logout; la bozza non sopravvive alla chiusura definitiva della scheda.
- RLS protegge tutte le tabelle nuove. Solo il proprietario autenticato legge le chat; scritture e RPC sensibili passano dal backend, con service-role e controlli su account, chat e sessione. Draft e lock operativi non sono esposti ai client.
- I token originali di conferma sono cifrati AES-GCM usando una chiave derivata dal secret esistente `CASEY_TOKEN_ENCRYPTION_KEY`; chat/account sono autenticati come dati associati. Non raggiungono il browser. Nessun tool del modello esegue commit.
- Se Calendar restituisce stato incerto/failed, la UI non dichiara l'appuntamento confermato. In caso di timeout si verifica o ripete **la stessa** richiesta; nessun nuovo appuntamento automatico. Le cancellazioni della bozza non cancellano eventi già registrati.
- Il classificatore opzionale `HANDOFF_CLASSIFIER=model` può aumentare la cautela; non può abbassare i controlli deterministici. In caso di errore chiede chiarimenti.

## Distribuzione e rollback

Le migrazioni di questo rilascio sono additive `20261022123719`–`20261022125001` e sono state applicate singolarmente sul progetto condiviso. **Non eseguire db push indiscriminato:** la migrazione del vecchio progetto isolato ha una destinazione diversa. Le Actions distribuiscono le funzioni, non applicano migrazioni.

La versione precedente in produzione è `dpl_96MEqcZ1Uzx2BWmL2eYCsW6aDcmM`, commit `ffb67967d15049966d735dcbb434264823aa6ffd`. Per rollback ripromuovere quel deployment; le tabelle additive possono restare. Il backend originale aggiunge l'allowlist esplicita delle origini fidate e limita le nuove sessioni a 30 per IP/minuto e 500 globali/minuto, invece delle precedenti 20 per IP/giorno; il protocollo di prenotazione rimane invariato. Non ripristinare tabelle o dati da snapshot. La versione delle funzioni precedente al lavoro è registrata fuori dal repository.

## Limiti effettivi del collaudo

I test automatici non dimostrano riconoscimento vocale su un telefono fisico né l'SSO dell'app H-FARM. Le letture reali di Google Calendar e i token Gemini sono verificati; una prenotazione reale, con account presente nel registro e conferma volontaria, resta una verifica di accettazione. Gemini può rispondere 503 per carico temporaneo; i messaggi restano salvati. L'advisor segnala l'impostazione Auth preesistente “Leaked Password Protection Disabled”; nessuna nuova segnalazione RLS dalle tabelle introdotte.

## Ripetere i test

- `node --test tests/*.test.mjs` e `deno test tests/handoff-operations.test.ts` non creano prenotazioni.
- `tests/handoff-continuity-cloud.py` richiede `CASEY_HANDOFF_KEYS` e `CASEY_HANDOFF_ACCOUNTS` come percorsi di file privati, più facoltativo `CASEY_HANDOFF_ORIGIN`. Legge Calendar reale e crea soltanto dati QA/sessioni di test.
- `tests/handoff-browser-recovery.py` richiede Playwright Python, `CASEY_HANDOFF_ACCOUNTS` e `CASEY_TEST_URL`. Verifica perdita della conferma del claim, invalidazione della sessione totem, salvataggio concorrente, nuovo browser e bozze offline. Usare account dedicati di test senza privilegi operativi.
