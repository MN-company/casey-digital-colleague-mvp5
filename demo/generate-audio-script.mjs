// Generates demo/AUDIO_SCRIPT.md from demo-script.js. Usage: node demo/generate-audio-script.mjs
import fs from 'node:fs';import vm from 'node:vm';import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const notes={
 'checkin-totem-1':'Tono informativo e sereno; leggera enfasi su «non è il QR di Casey». «2026/2027» = «duemilaventisei duemilaventisette».',
 'badge-totem-1':'Disponibile e rassicurante; pausa breve prima di «inquadra il QR».',
 'badge-phone-1':'Pratico, cordiale; «Confermo appuntamento» detto come etichetta del pulsante.',
 'internship-totem-1':'Entusiasmo sincero su «Bella notizia!», poi tono chiaro e onesto sul limite.',
 'internship-phone-a':'Breve, operativo, ritmo veloce.',
 'internship-phone-b':'Calmo e preciso; si riproduce solo dopo conferma del backend (review_saved).',
 'booking-totem-1':'Cordiale; data e ora lette per esteso. Contiene gli slot: se cambiano, va ri-registrato.',
 'booking-phone-1':'Pratico, cordiale; come badge-phone-1 ma frase diversa.',
 'fallback':'Gentile, leggermente dispiaciuto, ritmo lento.'};
export function loadScript(){const window={};vm.runInNewContext(fs.readFileSync(new URL('demo-script.js',root),'utf8'),{window});return window.CaseyDemoScript;}
export function generate(s){
 const rows=[];
 for(const st of s.steps){for(const l of st.totem)rows.push([l,st.id+' · totem']);for(const l of st.phone)rows.push([l,st.id+' · telefono']);}
 rows.push([s.fallback,'qualsiasi · totem']);
 const cell=t=>String(t).replace(/\|/g,'\\|');
 return ['# Casey demo · lista audio ElevenLabs','',
  'Generata da `demo/generate-audio-script.mjs` a partire da `demo-script.js` (stessa fonte usata dal runtime). Non modificare a mano: rigenera con `node demo/generate-audio-script.mjs`. Lingua it-IT, voce Casey. Un file mp3 per riga in `assets/demo-audio/`.','',
  'Slot del calendario demo (`slots` in `demo-script.js`): '+s.slots.map(x=>'«'+x+'»').join(', ')+'.','',
  '> **Attenzione:** se cambi `slots`, rigenera questo file; l\'audio booking-totem-1 va ri-registrato perché pronuncia gli orari.','',
  'Domande dell\'utente (non registrate, pronunciate dal vivo):','',
  ...s.steps.map((st,i)=>(i+1)+'. **'+st.id+'** · «'+st.question+'»'),'',
  '| ID | file | testo | note di intonazione |','|---|---|---|---|',
  ...rows.map(([l,where])=>'| '+l.id+' | `'+l.audio+'` | '+cell(s.render(l.text))+' | '+where+'. '+(notes[l.id]||'')+' |'),'',
  'Il saluto sul telefono («Ciao <nome>, eccoci sul tuo telefono.») è dinamico e non ha audio.',''].join('\n');
}
if(process.argv[1]===fileURLToPath(import.meta.url))fs.writeFileSync(new URL('demo/AUDIO_SCRIPT.md',root),generate(loadScript()));
