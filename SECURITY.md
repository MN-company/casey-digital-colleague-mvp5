# Sicurezza della versione pubblica

- Pubblicare solo il frontend statico, asset, codice della Edge Function e documentazione.
- `config.js` contiene una Supabase publishable key, utilizzabile nel browser in presenza di regole di accesso server-side corrette. Non è un service-role key.
- Mai fare commit di chiavi Google OAuth segrete, OpenRouter, variabili segrete Supabase, token di accesso/refresh, `.env` personali o file JSON `client_secret*`.
- Le credenziali precedentemente condivise in chat vanno ruotate prima dell'utilizzo con dati reali.
- Le credenziali per il test vanno create e comunicate ai collaboratori attraverso un canale riservato, non nel README.
- Gli asset grafici/loghi sono forniti per la demo H-FARM: verificare le autorizzazioni prima di riutilizzarli pubblicamente in contesti commerciali.

### Cloud Voice 5.1

- `GOOGLE_TTS_SERVICE_ACCOUNT_JSON` è **solo** un secret Supabase. Non caricare file JSON del service account nella repository pubblica.
- L'Edge Function `casey-tts` richiede un token valido della sessione originale, più limiti di utilizzo per sessione/IP/globali. Il JWT gateway Supabase è disabilitato per mantenere compatibilità con il token di sessione applicativo; **non rimuovere la verifica applicativa**.
- Concedi al service account Google solo il minimo accesso a Text-to-Speech e impostare budget/quote Google Cloud.
- Non archiviare gli MP3 generati contenenti dati personali in bucket pubblici.
