# Deployment Casey MVP 5.0

## Collegamenti operativi

Repository `main` collegata al progetto Vercel esistente; branch di produzione
`main` con assegnazione automatica del dominio. Il secret Actions
`SUPABASE_ACCESS_TOKEN` è configurato. Il primo deploy Actions verificato è il
[run 39124371580](https://github.com/MN-company/casey-digital-colleague-mvp5/actions/runs/39124371580)
(riesecuzione riuscita del 18 ottobre 2026): sola funzione `casey-original-ui`,
versione passata da 8 a 9, `verify_jwt=false`, controllo `public_config` riuscito.
Le altre Edge Functions sono rimaste alla stessa versione.

## Vercel

Usare **il progetto esistente** `casey-digital-colleague-live` del team `mnbrain`
(`team_tlVkdTknVZ34Ty7nah0lkj8w`), ID `prj_g7Mxl0hhmXQk8Oi6Caus3DQsPA1x`.
Dominio di produzione: https://casey-digital-colleague-live.vercel.app.
Non importare un secondo progetto e non spostare i domini.

In [Settings → Git](https://vercel.com/mnbrain/casey-digital-colleague-live/settings/git)
collegare `MN-company/casey-digital-colleague-mvp5`; il production branch deve essere
`main`. Se il namespace non compare, il proprietario deve autorizzare il collegamento
GitHub/Vercel per questa repository. Framework `Other`, root repository, nessuna
fase di build: il frontend è statico. Un push/merge su `main` avvia il deploy Vercel
quando il collegamento Git è attivo. Controllare commit, stato `Ready` e dominio
nella dashboard; la sola presenza del workflow Supabase non collega Vercel.

`config.js` è distribuito così com'è e punta al backend di produzione; le variabili
Vercel non sostituiscono automaticamente i valori di questo file. Per questo
`vercel.json` abilita i deploy Git solo per `main`; le preview del progetto sono
state disabilitate anche nelle impostazioni Vercel durante la configurazione CI/CD.
Non riabilitarle prima di predisporre un backend separato e una configurazione
frontend dedicata. CORS non costituisce un isolamento dei dati. Eventuali vecchi
URL preview già distribuiti non vengono rimossi da questa impostazione.
`.vercelignore` esclude sorgenti backend, workflow e documentazione dal sito statico.

Controllare che `index.html`, `auth.js`, `casey-bridge.js`, `settings.html` e i video
siano raggiungibili. La pubblicazione frontend e backend è indipendente, non atomica:
introdurre modifiche compatibili con entrambe le versioni durante il rilascio.

## GitHub Actions: deploy automatico della sola Edge Function

[Workflow](https://github.com/MN-company/casey-digital-colleague-mvp5/actions/workflows/deploy-supabase.yml):
`.github/workflows/deploy-supabase.yml`, attivato a ogni push su `main`, oppure
manualmente da Actions → Deploy Supabase Edge Function → Run workflow su `main`.
Altri branch e pull request non possono distribuire il backend di produzione.

Il proprietario inserisce un token personale Supabase in
[Repository → Settings → Secrets and variables → Actions](https://github.com/MN-company/casey-digital-colleague-mvp5/settings/secrets/actions)
con nome **`SUPABASE_ACCESS_TOKEN`**. Preferire un token limitato al progetto
`oxzraaadxqsruibinlxn` con i soli permessi necessari alle Edge Functions.
Non usare publishable key, service-role key o password database come token CLI.
Non incollare il token in codice, chat, log o variabili frontend. Non serve un
secret Vercel per il collegamento Git nativo. Il workflow fallisce esplicitamente
prima del deploy se il secret manca; dopo averlo aggiunto rieseguire il workflow.

Actions e Supabase CLI sono fissati a versioni precise. Il comando è:

```sh
supabase functions deploy casey-original-ui \
  --project-ref oxzraaadxqsruibinlxn --no-verify-jwt --use-api
```

`supabase/config.toml` dichiara l'entrypoint `.js` e `verify_jwt = false`, coerenti
con la funzione attualmente attiva. Il gateway JWT resta disabilitato: il codice
gestisce autenticazione studenti/staff e callback OAuth. Non sostituire questo
comportamento senza verificare quei flussi. Il token CLI è esposto solo ai passi
che ne hanno bisogno; checkout ha permessi di sola lettura e non conserva credenziali.

Il workflow **non** esegue `db push`, reset, migrations, seed, configurazioni Auth,
aggiornamento secrets Supabase, né deploy/pruning delle altre funzioni. Non richiede
password database. Dopo il deploy chiama esclusivamente `public_config`, che legge
la configurazione in memoria senza scritture DB o invii Google. Il successo di
questo controllo non certifica prenotazioni, email o login end-to-end.

Verificare il run verde e, nel dashboard Supabase, versione aggiornata della sola
`casey-original-ui` e JWT disabilitato. Proteggere l'accesso di scrittura a `main`
perché ogni push distribuisce in produzione. Per rollback ripristinare con un
nuovo commit la versione compatibile della funzione/frontend e attendere entrambi
i deploy; non ripristinare/reset del database per fare rollback del codice.

Riferimenti: [Supabase deploy e CI/CD](https://supabase.com/docs/guides/functions/deploy),
[Vercel GitHub](https://vercel.com/docs/git/vercel-for-github).

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
