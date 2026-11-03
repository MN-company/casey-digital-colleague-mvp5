import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const MESSAGE='Questa è una richiesta che riguarda te, quindi qui sul totem non la gestisco: non so chi sei e chiunque potrebbe sentire. Nella versione per gli studenti ti farei inquadrare un QR, accederesti con il tuo account e sceglieresti dal telefono. Intanto, se vuoi, ti rispondo su orari e procedure generali.';
// Real definitivo-kiosk.js + demo-free.js with stubbed HandoffAPI (classify -> private) and DOM.
function fixture(search,language='it-IT'){
 const nodes=new Map(),api=[],said=[],dialogue=[],qr=[],fetches=[],timers=[];
 const el=id=>{if(!nodes.has(id)){const c=new Set();nodes.set(id,{id,textContent:'',value:'',hidden:false,innerHTML:'',classList:{add:x=>c.add(x),remove:x=>c.delete(x),contains:x=>c.has(x)},setAttribute(){},replaceChildren(){}});}return nodes.get(id);};
 const document={getElementById:el,querySelector:()=>el('bePill'),querySelectorAll:sel=>sel.split(',').map(s=>s.trim()).filter(s=>/^#[\w-]+$/.test(s)).map(s=>el(s.slice(1))),addEventListener(){}};
 const HandoffAPI={call:async(action,body)=>{api.push(action);if(action==='classify')return {route:'private'};if(action==='issue')return {id:'l1',token:'t1',expires_in:600};if(action==='cancel')return {ok:true};throw Error('unexpected '+action);}};
 const ctx={document,location:{search,href:'http://localhost/index.html',origin:'http://localhost'},URL,URLSearchParams,AbortSignal,
  CASEY_CONFIG:Object.freeze({apiUrl:'https://example.invalid',publishableKey:'p'}),HandoffAPI,CaseyLanguage:{get:()=>language},S:'COLLEGE',capTimer:0,
  CaseyDialogue:{append:(r,t)=>dialogue.push([r,t]),snapshot:()=>dialogue.map(([role,text])=>({role,text})),clear(){},replace(){}},
  CaseyCampusCases:{handle:async()=>({matched:false})},qrcode:()=>({addData:u=>qr.push(u),make(){},getModuleCount:()=>1,isDark:()=>true}),
  say:t=>said.push(t),showSilent(){},shutUp(){},setState(){},goIdle(){},resetAll(){},setScenario(){},addEventListener(){},dispatchEvent(){},
  fetch:async u=>{fetches.push(u);throw Error('no network');},setTimeout:(fn,ms)=>{timers.push([fn,ms]);return timers.length;},clearTimeout(){},setInterval:()=>0,clearInterval(){}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(read('definitivo-kiosk.js'),ctx);const kiosk=ctx.handover;vm.runInContext(read('demo-free.js'),ctx);
 return {ctx,kiosk,api,said,dialogue,qr,fetches,el,timers};
}
test('?libero=1: handover and openSession never issue a link and answer in place',async()=>{
 const f=fixture('?libero=1');assert.notEqual(f.ctx.handover,f.kiosk);
 for(const fn of [f.ctx.handover,f.ctx.openSession]){const r=await fn(undefined,'badge');assert.equal(r.status,'handoff_disabled');}
 assert.deepEqual(f.api,[]);assert.deepEqual(f.qr,[]);assert.deepEqual(f.said,[MESSAGE,MESSAGE]);assert.equal(f.dialogue.at(-1)[1],MESSAGE);assert.equal(f.ctx.caseyHandoffActive(),false);
});
test('?libero=1: private routes from send and the Live bridge get the message, never a QR',async()=>{
 const f=fixture('?libero=1');await f.ctx.send('Voglio prenotare il ritiro del badge');assert.ok(f.api.includes('classify'));assert.ok(!f.api.includes('issue'));assert.ok(f.said.includes(MESSAGE));
 const r=await f.ctx.CaseyBridge.liveMobileHandoff();assert.equal(r.status,'handoff_disabled');assert.ok(!f.api.includes('issue'));assert.deepEqual(f.qr,[]);
});
test('?libero=1 hides sign-in, settings and app links',()=>{const f=fixture('?libero=1');for(const id of ['settingsLink','appLink','tryCaseyLink','caseyPasswordForm'])assert.equal(f.el(id).hidden,true,id);assert.equal(f.ctx.CaseyFreeMode.active,true);});
test('without ?libero=1, or with ?demo=1, the kiosk handover is unchanged',async()=>{
 for(const search of ['','?demo=1&libero=1','?libero=0']){const f=fixture(search);assert.equal(f.ctx.handover,f.kiosk,search);assert.equal(f.ctx.CaseyFreeMode,undefined);assert.equal(f.el('settingsLink').hidden,false);
  const r=await f.ctx.handover();assert.equal(r.status,'handoff_ready');assert.ok(f.api.includes('issue'));}
});
const cardShown=f=>f.el('qrCard').classList.contains('on')&&f.el('qrTitle').textContent==='Come funziona per gli studenti';
test('?libero=1: text path explains the privacy filter and shows the student info card, no QR',async()=>{
 const f=fixture('?libero=1');await f.ctx.send('Voglio prenotare il ritiro del badge');
 assert.ok(f.said.includes(MESSAGE));assert.ok(cardShown(f));assert.equal(f.el('qrCode').hidden,true);
 assert.equal(f.el('qrSub').textContent,['1 · Inquadri il QR','2 · Accedi con il tuo account College','3 · Scegli dal telefono','4 · Confermi tu: senza conferma non succede nulla'].join('\n'));
 assert.ok(!f.api.includes('issue'));assert.deepEqual(f.qr,[]);assert.ok(f.timers.some(([,ms])=>ms===25000));
});
test('?libero=1: Live bridge returns the exact-sentence note without QR or personal data',async()=>{
 const f=fixture('?libero=1');f.ctx.CaseyDialogue.append('user','Voglio prenotare il ritiro del badge');const r=await f.ctx.CaseyBridge.liveMobileHandoff();
 assert.equal(r.status,'handoff_disabled');assert.ok(r.note.includes(MESSAGE));assert.match(r.note,/exactly/);assert.match(r.note,/Do not propose any QR/);assert.match(r.note,/personal data/);
 assert.ok(!f.api.includes('issue'));assert.ok(cardShown(f));
});
test('?libero=1: en-US note uses the English sentence',async()=>{
 const f=fixture('?libero=1','en-US');const r=await f.ctx.handover();assert.ok(r.note.includes(f.ctx.CaseyFreeMode.messages.en));assert.ok(r.note.includes("This request is about you"));assert.ok(!r.note.includes(MESSAGE));assert.ok(f.said.includes(f.ctx.CaseyFreeMode.messages.en));
});
test('?libero=1: card hides on goIdle, resetAll, new turn and after 25 s',async()=>{
 const f=fixture('?libero=1');
 await f.ctx.handover();assert.ok(cardShown(f));f.ctx.goIdle();assert.equal(f.el('qrCard').classList.contains('on'),false);assert.equal(f.el('qrCode').hidden,false);
 await f.ctx.handover();f.ctx.resetAll();assert.equal(f.el('qrCard').classList.contains('on'),false);
 await f.ctx.handover();f.ctx.CaseyCampusCases.handle=async()=>({matched:true});await f.ctx.send('Orari biblioteca');assert.equal(f.el('qrCard').classList.contains('on'),false);
 await f.ctx.handover();f.timers.at(-1)[0]();assert.equal(f.el('qrCard').classList.contains('on'),false);assert.equal(f.ctx.CaseyFreeMode.cardVisible(),false);
});
test('index.html loads demo-free.js right after definitivo-kiosk.js',()=>{const s=read('index.html');assert.ok(s.includes('<script src="definitivo-kiosk.js"></script><script src="demo-free.js"></script>'));});
