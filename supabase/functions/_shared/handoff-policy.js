/** Routing is a privacy hint, never authorization. Public procedures stay on the kiosk. */
export function classifyHandoff(message) {
 const t=String(message||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const own=/\b(mio|mia|miei|mie|my|mis|personale|personali|personal)\b/.test(t);
 const record=/\b(vot\w*|grade\w*|notas|rat[ae]|pagament\w*|payment\w*|presenz\w*|assenz\w*|attendance|carriera|crediti|record\w*|appuntament\w*|borsa|scholarship)\b/.test(t);
 const access=/mostrami|show me|check my|controlla|verifica|quanto devo|quante (?:assenze|presenze)|ignora\w*|ignore|bypass/.test(t);
 const booking=/\b(prenotami|prenota|prenotare|fissami|fissa|book|schedule|cancel|annulla|disdici|sposta)\b/.test(t)&&/\b(appuntament\w*|meeting|incontro|office|prenotazion\w*|appointment)\b/.test(t);
 const procedural=/\b(come (?:funziona|si|posso|faccio|giustific\w*|richied\w*)|how (?:do|can|does|to)|como (?:puedo|se))\b/.test(t);
 const publicRule=/\b(regolament\w*|regole|requisit\w*|procedur\w*|policy|voto minimo|soglia|sufficienza|pass mark|minimum grade|giustific\w*|in generale|informazioni generali|orari|opening hours)\b/.test(t);
 const credentials=/\b(password|codice fiscale|iban)\b/.test(t);
 const privateHealth=/\b(diagnos\w*|medical|health|salute)\b/.test(t)&&own;
 const negated=/^(non (?:voglio|devi)|do not|don't)\b/.test(t);
 const directRecord=/mostrami (?:i |le |il |la )?(?:miei |mie |mio |mia )?(?:voti|rate|rata|pagamenti|presenze|assenze)|show me (?:my )?(?:grades|payments|attendance)|quante (?:assenze|presenze) ho/.test(t);
 if(directRecord||credentials||(!procedural&&!publicRule&&privateHealth)||(booking&&!procedural&&!negated)||(!procedural&&!publicRule&&record&&(own||access||/quante (?:assenze|presenze) ho/.test(t))))return {personal:true,route:'mobile',reason:'personal_request'};
 return {personal:false,route:'public',reason:procedural||publicRule?'general_question':'public_clarification'};
}
