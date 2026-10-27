# Casey 6.0 — Relazione di implementazione RAG handbook (26 ottobre 2026)

## Ambito completato

È stato eseguito un **caricamento additivo su Preview e produzione Supabase** dei 14 handbook originali H-FARM College 2026–2027. Sono stati conservati integralmente i record delle fonti esistenti. Nessuna migrazione distruttiva, cancellazione, modifica al roster, evento Calendar o invio email. Nessuna nuova Edge Function o modifica GitHub pubblicata.

| Stato verificato | Produzione | Preview |
|---|---:|---:|
| Documenti preesistenti | 22 | 24, inclusi due QA candidate |
| Chunk preesistenti | 777 | 779 |
| Nuovi handbook | 14 | 14 |
| Chunk nuovi handbook | 819 | 819 |
| Collezione derivata di contenuti comuni | 1 | 1 |
| Chunk comuni da pagine identiche DM/AI | 20 | 20 |
| Totale documenti | **37** | **39** |
| Totale chunk | **1616** | **1618** |
| Nuove fonti abilitate per demo | 14: 13 handbook + 1 common | 14: 13 handbook + 1 common |
| Foundation Year | candidate/non visibile | candidate/non visibile |
| Embedding vettoriali presenti nel corpus nuovo | 0 | 0 |

Produzione Supabase: `oxzraaadxqsruibinlxn`, 25.114.291 byte di database dopo l'importazione. Preview: `sneaxpqnmlhnrhoautjx`. Entrambi Postgres 17 con pgvector 0.8.2.

## Funzionamento del retrieval

- Mantiene le tabelle e RPC già implementate: `hf8_source_documents`, `hf8_source_chunks`, `hf8_search_hybrid`. Fonte/documento collegato a pagina PDF fisica e URL Drive originale. Per i contenuti condivisi, 18 pagine sono testualmente identiche nei PDF DM e AI; sono stati creati 20 chunk SHARED, ciascuno con riferimento pagina AI e pagina DM in `section_hint`.
- `CAFOSCARI` più programma `DIGITAL_MANAGEMENT` legge il relativo handbook. `CICC` più programma esatto legge il proprio handbook. Un programma non verificato o generico non viene assegnato per inferenza.
- Requisiti accademici: Master L7 50% per resit/superamento, undergraduate L4-L6 40%; la spiegazione undergraduate in alcuni Master ha una nota di contesto sull'heading, mentre il testo originale della pagina resta invariato.
- Per Digital Management, date nel 2026 restano indicizzate per l'anno accademico 2026/27. Una data scaduta si può menzionare come riferimento storico, ma non trasferire come nuova scadenza 2027 verificata.
- Alcune intestazioni hanno alias IT per supportare ricerche in italiano su PDF inglesi (es. “stampare” -> PRINTER). Contenuti originali `content` e hash non sono alterati.
- Fonti approvate solo **per la demo richiesta dall'utente**; `validity_flags` contiene indicatore esplicito di mancata certificazione istituzionale.

## Verifiche condotte sulle istanze effettive

1. Conteggi dei vecchi documenti/chunk invariati in entrambi gli ambienti.
2. Pagine nuove nell'intervallo `1..pdf_pages`: **0 errori**.
3. La query reale `hf8_search_hybrid` in produzione cerca “stampare” e “PRONOTE” nel pool SHARED e recupera gli estratti originali delle pagine 47 e 29 del PDF AI.
4. In produzione la query “Mathematics for Decision Sciences”, con scope CAFOSCARI/DIGITAL_MANAGEMENT, recupera il relativo handbook, pagine 7 e 8.
5. In produzione “voto minimo superamento esame master”, con scope CICC/DIGITAL_MARKETING_DATA_ANALYTICS, recupera l'handbook MSc DMDA pagina 11 che menziona il 50%.
6. Ricerca candidate=false non espone Foundation Year; interrogazioni di test non hanno restituito contenuti dell'istituzione errata.
7. Le tabelle `hf8` hanno RLS attivo, nessun SELECT `anon` per i documenti né SELECT `authenticated` per i chunk.
8. Le nuove fonti sono effettivamente approvate nel database, con reviewer etichettato come `casey_user_demo_approval_2026_10_26`, non come revisore Student Office.
9. La Edge Function di produzione **già distribuita**, `casey-definitivo-handoff` versione 10, incorpora la chiamata alla RPC `hf8_search_hybrid`; `config.js` di main punta a tale endpoint. Nessun ridistribuzione della funzione necessaria per leggere le nuove righe.

## Componenti NON completati (da non presentare come operativi)

- **Commit GitHub**: richiesta di creazione branch `feature/handbooks-rag-20261026` respinta: HTTP 403, `Resource not accessible by integration`. Il codice dell'importer è solo nel pacchetto ZIP; la repository resta invariata.
- **Profilo studente**: il roster di produzione contiene programmi generici come `Business` e diversi `null`. Non sono stati assegnati corsi sulla base dell'email o della conversazione; occorre il mapping ufficiale del corso per abilitare il retrieval specifico al login.
- **Retrieval semantic vector**: pgvector è installato ma 0 nuovi embedding; la funzione `retrieve()` esistente passa `p_embedding:null`. I test confermano la ricerca lessicale, non una ricerca vettoriale completa o reranking semantico.
- **Gemini Live / UI fisica**: verificata la corrispondenza degli endpoint e RPC, NON una sessione completa microfono→tool→LLM→voce con studenti veri. Non sono stati testati Gemini billing e rate limit.
- **Immagini/tabelle**: non è stato eseguito OCR a tappeto. Il pacchetto segnala 161 pagine con poco testo; diagrammi/tabelle visive richiedono verifica selettiva. L'indice contiene principalmente testo PDF digitale.
- **Qualità**: 10/10 unit test dell'importatore passati, SQL smoke test superati, ma la batteria da 120 domande e 30 casi negativi con misure di accuratezza, recall, tempo e citazioni non è stata eseguita.
- **Versionamento incrementale**: ID SHA deterministici, ma il job di aggiornamento automatico / cron e il workflow di supersession dei documenti precedenti non sono stati messi in servizio.

## Prossimi interventi, in ordine

1. Risolvere autorizzazione **write** sul repository GitHub e fare commit del pacchetto di ingestion senza PDF né secret; annotare la migrazione SQL eseguita tramite tool nelle note di deployment.
2. Validare il roster con Student Office e mappare i nomi reali dei 13 programmi attivi; verificare login e scope per DM, AI, almeno un Master, un account anonimo e profilo incompleto.
3. Completare la verifica visiva delle tabelle/date, soprattutto i calendari contenuti come immagini.
4. Progettare e inserire embedding 768d e query vector in backend protetto, con benchmark contro l'attuale FTS. Non degradare il fallback lessicale.
5. Test e2e del totem e Gemini Live; 120 domande e 30 negative, citazioni e assenza di mix tra atenei.
6. Convalidare Foundation Year e confermare le scadenze di Digital Management per gli anni successivi prima di promuoverle a scadenze attuali.

**Limite di responsabilità:** questa è una verifica di dati, RPC e codice distribuito, non una certificazione di servizio end-to-end completamente testato.
