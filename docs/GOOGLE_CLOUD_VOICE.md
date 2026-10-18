# Casey MVP 5.1 — Google Cloud Voice

## Stato

- Codice **implementato e testato localmente**, non ancora collegato a un account Google Cloud funzionante.
- Frontend: `casey-voice.js` usa Google Cloud come sintesi primaria, e passa automaticamente alla Web Speech API del browser se manca il token di sessione, il servizio non è configurato, si verifica timeout oppure la risposta audio non viene riprodotta.
- STT: rimane `SpeechRecognition` / `webkitSpeechRecognition` del browser. Selezione lingua `it-IT`, `en-US`, `es-ES` nello stesso menu.
- Testi dinamici LLM: un parametro lingua viene inoltrato all'attuale backend, che lo usa per la lingua del prompt OpenRouter. Saluti/ringraziamenti sono localizzati. **Altri messaggi deterministici della demo restano in italiano**: l'audio non traduce automaticamente il testo; richiedono una fase successiva di localizzazione.
- Nessuna modifica a DB, calendario, Gmail, avatar, orchestratore o barge-in.

## Architettura

```
index.html -> casey-voice.js
  -> POST /functions/v1/casey-tts (x-session-token della sessione Casey)
       -> verifica token hash in dc_sessions
       -> rate limiting atomico via dc_take_rate
       -> OAuth JWT service account Google Cloud
       -> POST https://texttospeech.googleapis.com/v1/text:synthesize
       <- MP3
  -> HTMLAudioElement
  -> fallback speechSynthesis del browser se Google fallisce
```

Non è necessaria una seconda richiesta di consenso OAuth Gmail/Calendar. Serve invece una **service account identity** per il TTS; quella di Google Calendar/Gmail rimane invariata. Il token privato NON viene mai inviato al browser.

## 1. Credenziali Google Cloud

L'utente ha già abilitato Cloud Text-to-Speech API e billing nel progetto Google Cloud usato per Calendar/Gmail.

1. In [Google Cloud Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts), seleziona quel progetto.
2. Crea un service account dedicato, per esempio `casey-tts-demo`. Concedigli solo i permessi necessari per chiamare Text-to-Speech (non Editor/Owner; se la chiamata restituisce `PERMISSION_DENIED`, controlla IAM e Service Usage). Le normali credenziali OAuth Web Client di Gmail/Calendar **non** sono credenziali di service account.
3. Crea una chiave **JSON** per questo service account *solo se necessario* per l'hosting esterno Supabase. Questa chiave è sensibile: non allegarla a ChatGPT, non inserirla su GitHub, non inviarla su Slack e non salvarla nella cartella pubblica. Google raccomanda di limitare il più possibile l'uso di chiavi persistenti; una futura federazione Workload Identity consentirebbe di eliminarla.
4. In [Supabase → Edge Function Secrets](https://supabase.com/dashboard/project/oxzraaadxqsruibinlxn/settings/functions), inserisci un secret chiamato esattamente `GOOGLE_TTS_SERVICE_ACCOUNT_JSON` e incolla il JSON completo come valore. Non riutilizzare `GOOGLE_CLIENT_SECRET` di Calendar/Gmail.

La funzione `casey-tts` firma da sola un assertion JWT RS256 usando Web Crypto, ottiene un access token OAuth con lo scope `cloud-platform` e fa la richiesta di sintesi con il nome della voce per la lingua richiesta.

## 2. Deploy della funzione Supabase

Dalla root della repository:

```bash
supabase login
supabase link --project-ref oxzraaadxqsruibinlxn
supabase functions deploy casey-tts --project-ref oxzraaadxqsruibinlxn
```

La configurazione `supabase/config.toml` definisce `verify_jwt = false` per `casey-tts` **solo perché la funzione verifica esplicitamente** `x-session-token` con hash contro `dc_sessions`, scadenza e limiti per IP/sessione/globale. Non esporre mai questo endpoint senza controlli di sessione/rate limit. La stessa configurazione esplicita il vecchio `verify_jwt=false` per `casey-original-ui`, già protetto dalle proprie sessioni.

Per rendere effettivo il passaggio della lingua anche nelle risposte generate dal modello, distribuisci la versione aggiornata del backend principale **solo dopo aver confrontato il codice live con quello della repository**:

```bash
supabase functions deploy casey-original-ui --project-ref oxzraaadxqsruibinlxn
```

Questo secondo comando è opzionale per il solo TTS, ma necessario affinché il prompt OpenRouter segua la scelta di lingua; non va eseguito alla cieca se la versione live è stata modificata dopo il pacchetto di partenza.

## 3. Frontend Vercel

Con la repository GitHub collegata al progetto Vercel esistente `casey-digital-colleague-live`, fai commit e push su `main`. Il nuovo script `casey-voice.js` viene caricato da `index.html`. `config.js` contiene **solo** la URL pubblica della funzione Supabase. Non servono segreti Google in Vercel.

Se il collegamento Vercel/GitHub non è attivo, questo push non basta: prima connetti la repository al progetto Vercel esistente o distribuisci il frontend tramite CLI Vercel nel progetto corretto.

## 4. Test manuali

Apri il sito in Chrome e prova la lingua italiana. Dopo una richiesta con sessione valida, `casey-tts` deve restituire `Content-Type: audio/mpeg` e Casey pronuncia la risposta. Controlla Network per verificare che il browser non contatti direttamente Google TTS e non veda token OAuth.

Ripeti in inglese e spagnolo verificando l'audio, e prova il microfono: il riconoscitore browser deve usare il codice lingua selezionato. Forza temporaneamente un errore di `casey-tts` per verificare il fallback `speechSynthesis`. Prova ON/OFF, reset e la successione di risposte senza sovrapposizione audio.

Verifica la compatibilità Chrome, Edge e Safari; la disponibilità delle voci fallback dipende dal sistema operativo/browser. Per le lingue diverse dall'italiano, verifica separatamente il contenuto dei messaggi: il TTS legge il testo generato, **non** effettua traduzione automatica.

## 5. Test automatizzati

Nella root della repository, con Node.js 22+: 

```bash
node --test tests/voice-frontend.test.mjs
node --experimental-strip-types --test tests/voice-backend.test.mjs
python tests/browser-smoke.py
```

I test backend usano **soltanto mock**, una chiave RSA generata al volo e un Google OAuth simulato: non richiedono né consumano crediti. Il test browser usa contenuto locale senza avviare il backend e senza richiedere un login.

## Protezioni costo e dati

Il servizio richiede una sessione Casey attiva, rifiuta lingue non permesse, input vuoti e testi oltre 1200 caratteri/4000 byte. Usa limiti atomici riutilizzando la funzione SQL `dc_take_rate` già presente nel backend storico. Questo riduce il rischio di abuso, ma **non garantisce l'impossibilità di consumi**: configura quote Google Cloud e notifiche di budget. La fascia gratuita Chirp 3 HD è soggetta a condizioni e limiti Google correnti.

Fonti ufficiali:
- https://docs.cloud.google.com/text-to-speech/docs/chirp3-hd
- https://docs.cloud.google.com/text-to-speech/docs/reference/rest/v1/text/synthesize
- https://docs.cloud.google.com/text-to-speech/docs/authentication
- https://docs.cloud.google.com/text-to-speech/quotas
- https://cloud.google.com/text-to-speech/pricing
- https://supabase.com/docs/guides/functions/secrets
- https://supabase.com/docs/guides/functions/function-configuration
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis
