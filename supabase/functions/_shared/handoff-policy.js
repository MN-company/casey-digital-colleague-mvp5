/** Routing is a privacy hint, never authorization. Booking and account actions belong on the phone. */
export function classifyHandoff(message) {
 const t=String(message||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const sensitive=/\b(password|codice fiscale|iban|diagnos\w*|medical|health|salute)\b/.test(t);
 const own=/\b(mio|mia|miei|mie|my|mis|personale|personali|personal)\b/.test(t);
 const record=/\b(vot\w*|grade\w*|notas|rat[ae]|pagament\w*|payment\w*|presenz\w*|assenz\w*|attendance|carriera|crediti|record\w*|appuntament\w*|borsa|scholarship)\b/.test(t);
 const access=/mostrami|show me|check my|controlla|verifica|quanto devo|quante (?:assenze|presenze)|ignora\w*|ignore|bypass/.test(t);
 const booking=/\b(prenotami|prenota|prenotare|fissami|fissa|book|schedule|cancel|annulla|disdici|sposta)\b/.test(t)&&/\b(appuntament\w*|meeting|incontro|office|prenotazion\w*|appointment)\b/.test(t);
 const procedural=/^(come (?:funziona|si|posso|faccio)|how (?:do|can|does|to)|como (?:puedo|se))\b/.test(t);
 const negated=/^(non (?:voglio|devi)|do not|don't)\b/.test(t);
 if(sensitive||(own&&record)||(access&&record)||(booking&&!procedural&&!negated))return {personal:true,route:'mobile',reason:'personal_request'};
 const general=negated||procedural||/^(ciao|salve|hello|hi|grazie|thanks|hola|gracias|buongiorno|buonasera)\b/.test(t)||(!own&&/^(quali|dove|quando|what|how|where|when|como|donde)\b|\b(in generale|informazioni generali|general information|orari|opening hours)\b/.test(t))||/^(si|no|ok|va bene|yes|no thanks|perfetto|solo informazioni generali)[!.\s]*$/.test(t);
 return {personal:false,route:'public',reason:general?'general_question':'public_clarification'};
}
