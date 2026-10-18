# Casey — Digital Colleague · MVP 5.0

MVP dimostrativo di assistente digitale per gli studenti di H-FARM College. Questa repository contiene l'interfaccia originale integrata con il backend Supabase, il calendario Student Office, le richieste interne e il modulo Auth con email/password e OTP.

**Versione pubblica del codice, non un'istanza indipendente.** Le API e il database attualmente puntano al progetto Supabase di Casey; per installare una propria istanza occorre creare/configurare un proprio progetto e applicare lo schema compatibile. Non ci sono API key private nel repository.

## Prova online

- App: https://casey-digital-colleague-live.vercel.app/
- Impostazioni Student Office: https://casey-digital-colleague-live.vercel.app/settings.html
- Architettura: https://casey-digital-colleague-live.vercel.app/architettura.html

Nota: l'accesso con email e password è disponibile sull'app in produzione tramite un aggiornamento mirato del file `auth.js`. Per usarlo devi avere un utente creato in **Supabase Authentication → Users** con password impostata ed email confermata, e un profilo attivo in `dc_v4_student_roster` con il medesimo indirizzo email. Creare soltanto una riga nel registro studenti non crea l'identità Supabase Auth.

## Struttura

- `index.html`, `styles.css`: interfaccia originale e navigazione studente/ufficio.
- `casey-bridge.js`: collegamento UI ↔ API Supabase.
- `auth.js`: verifica email OTP oppure accesso con password tramite Supabase Auth.
- `settings.html`, `settings.js`, `settings.css`: connessione dello Student Office, calendario e gestione.
- `architettura.html`: vista illustrativa dell'architettura.
- `A.mp4` ... `F.mp4`, immagini: avatar e asset grafici originali.
- `config.js`: **solo configurazione pubblica** (Supabase URL e publishable key).
- `supabase/functions/casey-original-ui/index.js`: sorgente della Edge Function backend, **senza credenziali**.
- `vercel.json`: configurazione deploy statico.
- `docs/`: istruzioni di test e deploy.

## Architettura

Vercel (frontend statico) → Supabase Edge Function `casey-original-ui` → PostgreSQL / Supabase Auth → Google Calendar e Gmail (via OAuth staff/studente). Il sistema conserva richieste in Supabase: la scheda "Le mie richieste" **non** è la posta Gmail. Le email di conferma sono un'azione separata, se prevista e attivata nel flusso di prenotazione.

L'account staff Google deve autorizzare i permessi necessari tramite `/settings.html`. **Un collegamento OAuth attivo non significa che ogni conversazione o richiesta generi un messaggio Gmail.**

## Funzionalità demo

Interfaccia originale conservata; calendario navigabile; utenti studenti verificati; richieste salvate nel database; prenotazioni con esplicita conferma; integrazione Google Calendar dello Student Office; eventuale invio email sulla conferma prenotazione; fallback AI tramite OpenRouter se configurato. I casi Emma/Sofia e l'avatar possono utilizzare contenuti dimostrativi. Non considerare la lista come garanzia di test end-to-end in ogni ambiente.

## Prerequisiti e avvio

Per aprire localmente il frontend puoi usare un server statico (`python3 -m http.server 8000`) e visitare `http://localhost:8000`. Le operazioni autenticabili richiedono il backend Supabase configurato. Per un deploy completo vedi `docs/DEPLOY.md`; per una prova guidata `docs/TESTING.md`.

**Non pubblicare mai** file `client_secret*.json`, chiavi `OPENROUTER_API_KEY`, service-role Supabase, token OAuth, refresh token o segreti di cifratura. Il solo fatto che `config.js` sia pubblico è previsto: contiene esclusivamente una publishable key.
