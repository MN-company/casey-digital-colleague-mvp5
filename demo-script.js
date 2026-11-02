/* Ordered live-demo script (?demo=1), presenter script "Demo Live Casey – Pietro". Pre-recorded lines only; real effects stay in existing clients.
   Line: text = on screen, speech = text read by ElevenLabs (numbers in letters), audio = mp3 path. */
(()=>{'use strict';
const line=(id,text,speech)=>({id,text,...(speech?{speech}:{}),audio:'assets/demo-audio/'+id+'.mp3'});
const norm=s=>' '+String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()+' ';
const steps=[
{id:'checkin',question:'Ciao Casey! Sono un po\' in ritardo per la lezione… come funziona il check-in su PRONOTE?',
 keywords:['pronote','pro note','check-in','check in','checkin','presenza','presenze','ritardo'],handoff:null,phone:null,
 totem:[line('caso1_checkin','Ciao! Tranquillo, si fa in un attimo. Apri l\'app PRONOTE, vai sulla lezione di oggi e tocca «Check-in». Se la lezione è già iniziata risulterai in ritardo: quindi fallo appena entri in aula.')]},
{id:'badge',question:'Casey, dovevo ritirare il badge, ma avevo lezione proprio a quell\'ora. C\'è un\'altra data?',
 keywords:['badge','ritiro','ritirare','tesserino'],handoff:{intent:'badge'},
 totem:[line('caso2_badge','Certo, capita spesso. I prossimi ritiri sono venerdì 6 novembre alle 11:00, oppure lunedì 9 novembre alle 14:30. Visto che è una prenotazione a tuo nome, continuiamo sul tuo telefono: inquadra il QR qui sotto.',
  'Certo, capita spesso. I prossimi ritiri sono venerdì sei novembre alle undici, oppure lunedì nove alle due e mezza. Visto che è una prenotazione a tuo nome, continuiamo sul tuo telefono: inquadra il QR qui sotto.')],
 phoneSlots:[{day:'2026-11-06',time:'11:00'},{day:'2026-11-09',time:'14:30'}],
 phone:{intro:'Ecco i prossimi ritiri del badge:'}},
{id:'stage',question:'Casey, un\'azienda mi ha proposto uno stage part-time, tipo venti ore a settimana. Posso farlo mentre seguo le lezioni?',
 keywords:['stage','tirocinio','internship','part-time','part time'],handoff:{intent:'internship'},
 totem:[line('caso3_stage','Complimenti, bella notizia! Si può fare, ma non decido io: uno stage durante i corsi va approvato dallo Student Office, che verifica che sia compatibile con le lezioni. Io però posso prepararti la richiesta e metterla in coda per loro. Continuiamo sul telefono: inquadra il QR.')],
 phone:{intro:'Ho preparato la tua richiesta di stage part-time:',summary:'Stage part-time · durante i corsi · 20 ore/settimana · Azienda Demo Srl',ask:'La invio allo Student Office per la revisione?',button:'Invia allo Student Office',sending:'Invio la richiesta allo Student Office, un attimo.',done:'Fatto! La richiesta è nella coda dello Student Office: la valuterà una persona dello staff.'}},
{id:'career',question:'Ultima cosa, Casey: prima di accettare vorrei parlarne con qualcuno del Career Service. Quando posso prenotare un incontro?',
 keywords:['career','carrier','carriera','appuntamento','incontro','prenotare','prenotazione'],handoff:{intent:'career'},
 totem:[line('caso4_career','Ottima idea. Il Career Service ha ancora due slot liberi: venerdì 6 novembre alle 16:00, oppure martedì 10 novembre alle 9:30. Scegli quello che preferisci dal telefono: ecco il QR.',
  'Ottima idea. Il Career Service ha ancora due slot liberi: venerdì sei novembre alle quattro del pomeriggio, oppure martedì dieci alle nove e mezza. Scegli quello che preferisci dal telefono: ecco il QR.')],
 phoneSlots:[{day:'2026-11-06',time:'16:00'},{day:'2026-11-10',time:'09:30'}],
 phone:{intro:'Ecco gli slot liberi con il Career Service:'}}];
const freeze=o=>{if(o&&(typeof o==='object'||typeof o==='function')&&!Object.isFrozen(o)){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
function score(step,text){const t=norm(text);if(!t.trim())return 0;return(step?.keywords||[]).filter(k=>{const n=norm(k);return n.trim()&&t.includes(n);}).length;}
function confirms(step,text){return score(step,text)>0;}
// Highest keyword score wins; a tie or no hit returns `expected` (the next step in sequence, or -1 after the last step).
function pick(text,expected){const scores=steps.map(s=>score(s,text)),best=Math.max(...scores);if(best>0&&scores.filter(x=>x===best).length===1)return scores.indexOf(best);return expected;}
function render(text){return String(text??'');}
function phoneGreeting(name,intro=''){const n=String(name||'').trim(),i=String(intro||'').trim();return n?('Ciao '+n+'! '+i).trim():i;}
const rome=(iso,opts)=>new Intl.DateTimeFormat('it-IT',{timeZone:'Europe/Rome',...opts}).format(new Date(iso));
// «venerdì 6 novembre alle 16:00» in Europe/Rome; '' for an invalid date.
function slotDay(iso){const d=new Date(iso);if(Number.isNaN(d.getTime()))return '';return rome(d,{weekday:'long',day:'numeric',month:'long'})+' alle '+rome(d,{hour:'2-digit',minute:'2-digit',hour12:false});}
const slotTime=iso=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Rome',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);};
function careerConfirmed(iso){const l=slotDay(iso);return l?'Appuntamento confermato: '+l+' con il Career Service. Ti ho mandato la conferma via email. E in bocca al lupo per lo stage!':'';}
window.CaseyDemoScript=freeze({steps,fallback:line('fallback','Scusa, non ho capito bene. Puoi ripetere?'),render,score,confirms,pick,phoneGreeting,slotDay,slotTime,careerConfirmed});
})();
