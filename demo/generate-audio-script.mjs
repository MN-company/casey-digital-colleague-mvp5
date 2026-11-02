// Generates demo/AUDIO_SCRIPT.md from demo-script.js. Usage: node demo/generate-audio-script.mjs
import fs from 'node:fs';import vm from 'node:vm';import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const notes={
 'caso1_checkin':'Caso 1 · totem. Tono rassicurante e pratico; «Check-in» come etichetta del pulsante.',
 'caso2_badge':'Caso 2 · totem. Disponibile; date e orari letti per esteso; pausa breve prima di «inquadra il QR».',
 'caso3_stage':'Caso 3 · totem. Entusiasmo sincero su «Complimenti», poi chiaro e onesto sul limite («non decido io»).',
 'caso4_career':'Caso 4 · totem. Cordiale; date e orari letti per esteso; chiusura su «ecco il QR».',
 'fallback':'Qualsiasi caso · totem. Gentile, leggermente dispiaciuto, ritmo lento.'};
export function loadScript(){const window={};vm.runInNewContext(fs.readFileSync(new URL('demo-script.js',root),'utf8'),{window,Intl,Date});return window.CaseyDemoScript;}
export function generate(s){
 const rows=[...s.steps.flatMap(st=>st.totem),s.fallback];
 const cell=t=>String(t).replace(/\|/g,'\\|');
 return ['# Casey demo · lista audio ElevenLabs','',
  'Generata da `demo/generate-audio-script.mjs` a partire da `demo-script.js` (stessa fonte usata dal runtime). Non modificare a mano: rigenera con `node demo/generate-audio-script.mjs`. Lingua it-IT, voce maschile di Casey. Un file mp3 per riga in `assets/demo-audio/`.','',
  '> Gli orari sono scritti nel testo dei casi 2 e 4: se cambiano, aggiorna `demo-script.js` (anche `phoneSlots`), rigenera questo file e ri-registra l\'audio.','',
  'Domande dell\'utente (non registrate, pronunciate dal vivo; tasti 1–4 sul totem):','',
  ...s.steps.map((st,i)=>(i+1)+'. **'+st.id+'** · «'+st.question+'»'),'',
  '| file | testo per ElevenLabs | testo a schermo | note |','|---|---|---|---|',
  ...rows.map(l=>'| `'+l.audio+'` | '+cell(l.speech||l.text)+' | '+cell(s.render(l.text))+' | '+(notes[l.id]||'')+' |'),'',
  'Le righe sul telefono (saluto con il nome, slot reali, richiesta di stage, conferma) sono solo testo e non hanno audio.',''].join('\n');
}
if(process.argv[1]===fileURLToPath(import.meta.url))fs.writeFileSync(new URL('demo/AUDIO_SCRIPT.md',root),generate(loadScript()));
