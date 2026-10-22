# Handoff completo — implementazione V2

## Review e decisioni
La prima implementazione chiedeva matricola, forzava il QR sulle richieste ambigue, limitava la cronologia a 12 messaggi e incorporava il totem dentro una pagina mobile. La V2 applica il flusso concordato: chat anonima al totem, scelta esplicita del trasferimento, QR senza matricola, acquisizione dell'intera chat nell'account autenticato del telefono.

## Esperienza
- Il totem conserva interfaccia originale, Emma/Sofia e comandi voce. Le richieste personali producono una proposta; il dialogo QR si apre solo su scelta dell'utente.
- Durante il QR la voce è fermata e la chat è in pausa. QR nuovo dopo due minuti; Torna alla conversazione revoca quello pendente.
- Dopo scansione e login, acquisizione automatica. Se l'account è già autenticato non si ripete il login.
- Il telefono presenta una sola chat con tutti i messaggi, campo testo e pulsante Parla con Casey sempre visibili. Nessun iframe o sezione di contesto separata.
- Il server assegna la chat al primo account autenticato che acquisisce il QR. Un altro account che possieda il QR può quindi acquisirla prima dell'utente: comportamento deliberatamente scelto, senza verifica del destinatario al totem.
- Il totem si pulisce solo dopo acquisizione confermata. Le vecchie chat non vengono sovrascritte da un nuovo handoff allo stesso account.

## Supabase e isolamento
Progetto esistente `oxzraaadxqsruibinlxn`, secret esistenti. Funzioni dedicate `casey-handoff`, `casey-handoff-ui`, `casey-handoff-live`, origini configurate con `HANDOFF6_ORIGINS`. Funzioni e tabelle originali `dc_*` non vengono sostituite.

Il namespace `hf6_*` contiene lo schema compatibile con l'adapter Casey; `hf7_*` gestisce chat, QR e transazioni. `supabase/handoff-demo-base.sql` crea solo lo schema con prefisso; `20261022114805_handoff_full_chat.sql` aggiunge il protocollo. Applicati solo questi due file al progetto esistente: NON applicare la precedente migrazione destinata al vecchio progetto separato e NON fare db push indiscriminato.

Il progetto separato `sneaxpqnmlhnrhoautjx` non viene più usato dalla V2 e non è stato eliminato.

## Contesto e sicurezza
Cronologia completa: nessun taglio agli ultimi 12 messaggi o 1600 caratteri per messaggio. Limite operativo esplicito di 2 MB per richiesta/chat, con errore invece di troncamento silenzioso. La finestra del modello resta soggetta ai limiti del provider.

Il workflow server-side viene importato con la chat. Identità e token Auth sono quelli del telefono: testo della cronologia e vecchie dichiarazioni di autorizzazione non diventano permessi. L'adapter Preview blocca preparazione/commit di prenotazioni e modifiche Google/amministrative. Sono conservate le proposte conversazionali; non si ripetono azioni esterne automaticamente.

QR opaco a 256 bit, hash SHA-256, scadenza di 120 secondi. Claim, assegnazione dell'account e importazione sono un'unica transazione con lock. Replay e doppia acquisizione non consentiti. Revoca e claim si sincronizzano sullo stesso lock.

RLS attiva sulle nuove tabelle. Le chat sono leggibili solo dal proprietario; i link non sono accessibili ai client. Le RPC sono SECURITY INVOKER, search_path vuoto, EXECUTE revocato a PUBLIC/anon/authenticated. Il backend verifica il token Auth attraverso Supabase prima di invocarle. Salvataggi serializzati e versione ottimistica impediscono sovrascritture da richieste vecchie.

## Verifiche
`node --test tests/*.test.mjs`

`CASEY_HANDOFF_KEYS=/private/keys.json CASEY_HANDOFF_ACCOUNTS=/private/accounts.json python3 tests/handoff-v2-cloud.py`

La suite usa soltanto account sintetici QA e namespace hf6_/hf7_; verifica intera cronologia di 40 messaggi, nessuna matricola, replay, account diverso, RLS, versioni, chat multiple, restore, race, annullamento, scadenza e token Gemini. Il browser verifica controlli visibili a 393x852, acquisizione automatica, pulizia e reload. I risultati del provider vengono distinti dai test del trasferimento.


## Stato della verifica del provider
Sul progetto condiviso il token Gemini Live viene emesso e il WebSocket raggiunge setupComplete con il microfono collegato. Una verifica indipendente di Gemini 3.8 Flash ha restituito HTTP 503 “This model is currently experiencing high demand”, diverso dal precedente errore sui crediti della chiave del progetto separato. La risposta completa in testo/voce va distinta dalla sola connessione. Nessuna risposta simulata viene inserita nella chat per nascondere un errore del provider.
