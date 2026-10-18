# Collaudo minimo collaboratori

1. Apri il sito pubblico Vercel. Verifica avatar, sei video, tab e calendario.
2. In Supabase Auth crea un utente demo **con email confermata e password** (senza invio di inviti/OTP). Usa un indirizzo demo controllato, non una password nota pubblicamente.
3. In `dc_v4_student_roster`, per la medesima email crea un record attivo (`active=true`). Una riga nella tabella studenti, da sola, **non** consente il login.
4. Apri "Account studente", seleziona "Accedi con password", autentica e verifica che l'identità venga riconosciuta dal backend.
5. Da studente prova calendario e invio di una richiesta. Controlla la nuova riga in `dc_v5_requests`.
6. Da Student Office verifica la richiesta nell'app: non cercarla nella casella Gmail, perché è una richiesta interna.
7. Per una prenotazione, conferma esplicitamente lo slot proposto e verifica la riga database, l'evento nel Google Calendar staff e l'eventuale email di conferma nella cartella "Inviati" o nei log applicativi.

Se nel Gmail dell'ufficio non compare un'email, la richiesta può essere stata registrata correttamente: il programma invia email solo per le operazioni che prevedono esplicitamente una conferma tramite Gmail. Non dedurre consegna email dal semplice collegamento OAuth.
