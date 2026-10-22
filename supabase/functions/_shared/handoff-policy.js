/** Routing is a privacy hint, never authorization. Unknown requests ask for clarification. */
export function classifyHandoff(message) {
 const t=String(message||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const sensitive=/\b(password|codice fiscale|iban|diagnos\w*|medical|health|salute)\b/.test(t);
 const own=/\b(mio|mia|miei|mie|my|mis|mi|personale|personali|personal|attendance)\b/.test(t);
 const record=/\b(vot\w*|grade\w*|notas|rat[ae]|pagament\w*|payment\w*|presenz\w*|attendance|carriera|crediti|record\w*|appuntament\w*|borsa|scholarship)\b/.test(t);
 const override=/ignora\w*|ignorare|ignore|bypass|mostrami|show me/.test(t);
 if(sensitive||(own&&record)||(override&&record))return {personal:true,route:'mobile',reason:'personal_request'};
 const general=/^(ciao|salve|hello|hi|grazie|thanks|hola|gracias)[!.\s]*$/.test(t)||(!own&&/^(come (funziona|si|posso)|quali|dove|quando|what|how|where|when|como|donde)|\b(in generale|informazioni generali|general information)\b/.test(t));
 if(general&&!sensitive)return {personal:false,route:'public',reason:'general_question'};
 return {personal:true,route:'clarify',reason:'needs_clarification'};
}
