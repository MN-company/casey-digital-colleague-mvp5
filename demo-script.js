/* Ordered live-demo script (?demo=1). Pre-recorded lines only; real effects stay in existing clients. */
(()=>{'use strict';
const line=(id,text)=>({id,text,audio:'assets/demo-audio/'+id+'.mp3'});
const norm=s=>' '+String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+' ';
// Presenter: edit to match the prepared demo calendar, then regenerate demo/AUDIO_SCRIPT.md and re-record booking-totem-1.
const slots=['giovedì 12 novembre alle 10:00','giovedì 12 novembre alle 15:30'];
const pickSlot='scegline uno e premi «Confermo appuntamento». Finché non confermi, non prenoto nulla.';
const steps=[
{id:'checkin',question:'Ciao Casey, come funziona il check-in quest\'anno?',keywords:['check-in','checkin','presenze','pronote'],handoff:null,phone:[],
totem:[line('checkin-totem-1','Quest\'anno il check-in segue la procedura PRONOTE: all\'inizio della lezione, in aula, viene mostrato un QR dinamico. Attenzione, non è il QR di Casey. Trovi la procedura completa nell\'handbook 2026/2027.')]},
{id:'badge',question:'Dovrei ritirare il badge, ma non riesco nell\'orario che mi è stato assegnato. Riusciamo a trovare un\'altra data?',keywords:['badge','ritirare','altra data','orario'],handoff:{intent:'badge'},
totem:[line('badge-totem-1','Certo, cerchiamo insieme una nuova disponibilità con lo Student Office. Per prenotare serve il tuo account College: inquadra il QR qui sotto e continuiamo sul tuo telefono, nella stessa conversazione.')],
phone:[line('badge-phone-1','Qui sotto trovi gli orari dello Student Office: '+pickSlot)]},
{id:'internship',question:'Ciao Casey, ho trovato un\'internship, però da contratto sarebbe part time e non full time. Potrebbe andare bene comunque?',keywords:['internship','part time','part-time','tirocinio','stage','contratto'],handoff:{intent:'internship'},
totem:[line('internship-totem-1','Bella notizia! Però su un contratto part time non posso decidere io: serve una revisione dello Student Office. Inquadra il QR qui sotto e dal tuo telefono invio la richiesta allo staff.')],
phone:[line('internship-phone-a','Invio la tua richiesta allo Student Office, un attimo.'),line('internship-phone-b','Fatto: la richiesta è nella coda di revisione dello Student Office. La decisione spetta allo staff.')]},
{id:'booking',question:'Vorrei prenotare un appuntamento con lo Student Office.',keywords:['appuntamento','prenotare','prenotazione','student office'],handoff:{intent:'badge'},
totem:[line('booking-totem-1','Volentieri. Lo Student Office ha due orari liberi: {{SLOT_1}} oppure {{SLOT_2}}. Inquadra il QR qui sotto e scegli dal tuo telefono.')],
phone:[line('booking-phone-1','Bene, qui sotto vedi gli orari dello Student Office: '+pickSlot)]}];
const freeze=o=>{if(o&&(typeof o==='object'||typeof o==='function')&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
function confirms(step,text){const t=norm(text);if(!t.trim())return false;return(step?.keywords||[]).some(k=>{const n=norm(k);return n.trim()&&t.includes(n);});}
function render(text){return String(text??'').replace(/\{\{SLOT_([12])\}\}/g,(_,n)=>slots[n-1]);}
function phoneGreeting(name){const n=String(name||'').trim();return n?'Ciao '+n+', eccoci sul tuo telefono.':'Eccoci sul tuo telefono.';}
window.CaseyDemoScript=freeze({steps,fallback:line('fallback','Scusa, non ho sentito bene. Puoi ripetere?'),slots,render,confirms,phoneGreeting});
})();
