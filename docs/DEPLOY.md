# Deployment Casey MVP 5.0

## Vercel

Pubblica la radice di questa repository in un progetto Vercel statico con framework `Other` (nessuna fase di build necessaria). Imposta le route secondo `vercel.json`. Controlla che `index.html`, `auth.js`, `casey-bridge.js`, `settings.html` e i video siano raggiungibili.

## Supabase

Il frontend usa `config.js` con URL progetto e publishable key. Non inserire service-role o API key segrete nel frontend. Distribuisci `supabase/functions/casey-original-ui/index.js` come Edge Function `casey-original-ui` con le impostazioni di verifica JWT del codice originale (la funzione gestisce autenticazioni specifiche e CORS al suo interno). Il progetto deve contenere le tabelle/funzioni dello schema Casey v2-v5; questa repository non è un dump completo del database di produzione e **non contiene credenziali, dati utenti, token OAuth o migrations automatiche**.

In **Supabase → Edge Functions → Secrets** configura:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `CASEY_ADMIN_EMAILS` (email staff autorizzate, separate da virgola)
- `CASEY_TOKEN_ENCRYPTION_KEY` (32 byte casuali, codificati come 64 caratteri esadecimali)
- `OPENROUTER_API_KEY` (opzionale)
- `OPENROUTER_FREE_MODEL` (opzionale, default `openrouter/free`)

Le credenziali Supabase server si ottengono tramite le variabili automatiche dell'Edge Function. In Google Cloud, configura il consenso OAuth, abilita Calendar/Gmail e registra entrambi i redirect:

- `https://<project-ref>.supabase.co/functions/v1/casey-original-ui/oauth/callback`
- `https://<project-ref>.supabase.co/functions/v1/casey-original-ui/oauth/student-callback`

In Supabase Auth imposta Site URL e redirect URL coerenti col dominio Vercel. L'OTP necessita di invio email funzionante; il login email/password non richiede email una volta creato un utente confermato.

## Student Office

L'amministratore autorizzato avvia l'integrazione Google da `/settings.html` e seleziona calendario. Le richieste Student Office sono record Supabase e non messaggi Gmail; le email di conferma si verificano separatamente.

## Limiti

Per nuove installazioni servono migrations/schema del database, non inclusi nel codice sorgente. I permessi Google su app OAuth in Testing richiedono l'aggiunta di test user. Un test end-to-end va eseguito prima di qualsiasi presentazione come prodotto pronto alla produzione.
