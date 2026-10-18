# Sicurezza della versione pubblica

- Pubblicare solo il frontend statico, asset, codice della Edge Function e documentazione.
- `config.js` contiene una Supabase publishable key, utilizzabile nel browser in presenza di regole di accesso server-side corrette. Non è un service-role key.
- Mai fare commit di chiavi Google OAuth segrete, OpenRouter, variabili segrete Supabase, token di accesso/refresh, `.env` personali o file JSON `client_secret*`.
- Le credenziali precedentemente condivise in chat vanno ruotate prima dell'utilizzo con dati reali.
- Le credenziali per il test vanno create e comunicate ai collaboratori attraverso un canale riservato, non nel README.
- Gli asset grafici/loghi sono forniti per la demo H-FARM: verificare le autorizzazioni prima di riutilizzarli pubblicamente in contesti commerciali.
