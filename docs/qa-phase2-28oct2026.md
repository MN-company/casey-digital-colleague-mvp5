# Casey — QA fase 2, 28 ottobre 2026

Input: `Casey_Report_QA_Fase2_28ottobre.pdf`, otto pagine. Branch: `fix/nadia-demo-native-handoff`. Questa matrice distingue correzione, prova automatica e accettazione fisica. Non sono state create prenotazioni né inviate email di prova.

## Modifiche e copertura

| ID | Correzione / verifica |
| --- | --- |
| E1 | Errori rete/timeout/JSON/provider tradotti da `casey-errors.js`; Account solo per 401/403; sul totem errori visualizzati senza lettura vocale. Test matrice errori e Live. |
| D1 | Rimossa attesa artificiale blu e chiamata state duplicata; indicazione dopo 6 secondi; timeout richiesta 28 s. Due domande con fonti in produzione misurate a circa 3 s prima del rilascio. Il provider può comunque rallentare. |
| D2 | Chip sostituiti con domande presenti nel RAG, home Campus apre le schede pertinenti; rimosso rinvio a pulsante Appuntamento inesistente. Stampa e assenza per malattia collaudate con fonti reali. |
| D3 | Scansione lega il primo dispositivo e concede 10 minuti per login; claim monouso e recupero idempotente preservati. Test SQL e API; email su telefono reale resta accettazione manuale. Auth resta per scheda: non si salvano automaticamente credenziali su un totem condiviso. |
| D4 | Fino alle 00:00 del 29 ottobre, ora di Roma, sospesi i piccoli limiti demo: quote giornaliere effettive 2 miliardi, 500 richieste testo / 100 voce concorrenti, sessioni voce fino a 30 minuti. Stop libera la prenotazione di capacità solo nella finestra demo. Limiti normali ripristinati automaticamente; Auth, proprietà, antiabuso e limiti del fornitore rimangono. |
| D5 | Guest distinti College/Campus; il vecchio guest viene conservato per College; QR, destinazione e titolo seguono scenario. Il colore non attribuisce privilegi universitari. |
| D6 | Eliminata cancellazione dello storico blu all'avvio; ripristino aggiorna la conversazione senza eliminare le altre, carica lista account e conserva i timestamp locali già noti. I vecchi messaggi cloud senza timestamp individuale non permettono di ricostruire l'ora originale. |
| D7 | Campus verifica busy prima di svuotare il campo. |
| D8 | Attività dimostrativa coerente con le pratiche di esempio; eliminati vecchi listener `casey_sync` / `CASEY_ACTION` che potevano simulare esiti. Calendario reale resta soggetto all'accesso staff. |
| E2 | Errori includono un contatto Student Office utilizzabile senza AI; nessuna policy inventata come fallback. |
| S1 | La chat pubblica ignora la cronologia client e usa la propria cronologia nel database. Test del vero handler con assistant falsificato e controllo legittimo. Nessuna identità studente viene inoltrata dal totem. |
| D9 | Menu Campus chiuso con inert; contenitore telefono con overflow limitato. |
| D10 | Durante la finestra demo il reset inattività del totem passa da 75 secondi a 30 minuti. |
| D11 | Apri Casey apre solo la presentazione; calendario ha il proprio comando. Verificato nel browser. |
| D12 | Lingua conservata e inoltrata ad app, testo e Live; tradotti i comandi principali IT/EN/ES. Le schede editoriali del campus non costituiscono un catalogo integralmente tradotto. |
| D13 | Badge illustrativo non promette più un appuntamento il 21 ottobre: data e ora da concordare. |
| E3 | Richieste di chat limitate a 28 s, risposta di recupero leggibile. |
| E4 | Rimosso secondo decodeURIComponent del parametro OAuth già decodificato da URLSearchParams. |
| E5 | Il totem ripristina la cronologia precedente se la richiesta fallisce. |
| E6 | Permesso microfono prima della creazione del token; se negato nessun token emesso. Test positivo e negativo. |
| I1 | maxlength 1000, avviso accessibile e contatore vicino al limite; backend rifiuta e non tronca. |
| S2 | CSP sui cinque ingressi principali, hash script verificati, nessun event handler HTML inline, script-src-attr none. Prove browser con CSP attiva. |
| S3 | Rimosse informazioni generation_model, retrieval, pool e knowledge_scope dalle risposte pubbliche, anche cache e strutture annidate; citazioni preservate. |
| V1 | Origin estranei negati; rate limit atomici e quote verificati senza disabilitare autenticazione. |
| V2 | Prompt e fonti rimangono input non fidati; strumenti AI non possono confermare prenotazioni. Test di proprietà, nonce e conferma esplicita. Nessuna promessa di immunità assoluta alla prompt injection. |
| V3 | Client rinnova sessione pubblica scaduta una volta; QR scaduti e tentativi differenti rifiutati. |

## Ripresa QR e calendario

La ripresa usa il renderer della chat già presente in entrambe le app, senza iframe o una seconda interfaccia. Gli orari hanno data/ora Europe/Rome e pulsanti con contrasto esplicito. Preparazione e cancellazione sono coperte da dry run; commit resta esclusivamente dietro conferma visibile con nonce e controlli server. Il logout su un'altra scheda invalida anche la vista privata locale. Il controllo indipendente di sicurezza ha individuato questo caso, corretto e coperto da regressione.

## Verifiche locali

- Node: 130 test superati.
- Deno: 30 test superati, incluso handler pubblico con cronologia falsificata.
- Type check: sette funzioni chat/Live/handoff/Beta.
- SQL con rollback in Preview e produzione: quote demo/normali, proprietario della lease, rifiuto del contesto dopo stop, scansione/riserva/scadenza QR. Il test ha individuato il vecchio vincolo di due minuti: migrazione aggiuntiva applicata senza cancellare dati.
- Browser locale: dashboard, Apri Casey, posta, app College e login integrato con CSP attiva.
- Preview: flussi Auth/QR/recupero e rifiuto delle operazioni esterne verificati. Il generatore AI della Preview ha restituito ai_unavailable: non è una prova positiva del RAG; produzione verificata separatamente.

## Limiti di accettazione

Voce sul microfono e altoparlante fisici, consenso Google su account reale e scansione/email su telefono reale richiedono prova manuale. Nessun appuntamento reale è stato confermato. Le quote e disponibilità del fornitore esterno non possono essere eliminate dall'applicazione. Gli elementi D3 (accesso tra schede), D6 (vecchi timestamp mancanti) e D12 (catalogo editoriale interamente tradotto) hanno i limiti esplicitati sopra: non vengono dichiarati integralmente completati.

## Rilascio

Rollback frontend precedente: `dpl_8PSjYbgqFvBGVKKHupewhpH5ZrSM`, commit main `9a730d43a9f19d3cbf5411f9ddddd9e127dea9ad`. Le quattro migrazioni sono additive o modificano funzioni/vincoli; non alterano documenti o chunk del RAG. Dettagli del nuovo deploy e smoke HTTPS vengono registrati dopo il rilascio.
