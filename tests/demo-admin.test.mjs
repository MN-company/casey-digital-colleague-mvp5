import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
// Demo branch: persistent Student Office session (demo-admin-bridge.js + settings.js + real-calendar.js). No network.
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const memory=(init={})=>{const m=new Map(Object.entries(init));return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),has:k=>m.has(k)};};
const KEY='casey-v3-admin',COPY='casey-demo-admin-v1',TOKEN='t'.repeat(48),OTHER='o'.repeat(48);
const flush=async(n=20)=>{for(let i=0;i<n;i++)await new Promise(r=>setImmediate(r));};

function settings({hash='',local=memory(),session=memory(),reply=()=>({status:200,body:{}})}={}){
 const nodes=new Map(),docEvents={},winEvents={},calls=[],timers=[];
 const el=id=>{if(!nodes.has(id)){const c=new Set(),ev={};nodes.set(id,{id,textContent:'',value:'',hidden:false,checked:false,href:'',className:'',ev,
  classList:{add:x=>c.add(x),remove:x=>c.delete(x)},setAttribute(){},getAttribute:()=>null,removeAttribute(){},replaceChildren(){},append(){},reset(){},
  addEventListener:(n,f)=>{(ev[n]||=[]).push(f);}});}return nodes.get(id);};
 const ctx={localStorage:local,sessionStorage:session,URLSearchParams,AbortSignal,Date,Promise,
  CASEY_CONFIG:{settingsApiUrl:'https://api.invalid/settings'},
  location:{hash,origin:'https://demo.example',pathname:'/settings.html',search:''},history:{replaceState(){}},
  document:{getElementById:el,createElement:()=>el('x'+Math.random()),addEventListener:(n,f)=>{(docEvents[n]||=[]).push(f);}},
  addEventListener:(n,f)=>{(winEvents[n]||=[]).push(f);},dispatchEvent:e=>{for(const f of winEvents[e.type]||[])f(e);return true;},
  CustomEvent:class{constructor(t){this.type=t;}},confirm:()=>true,
  setTimeout:(f,ms)=>{timers.push({f,ms});return timers.length;},clearTimeout(){},
  fetch:async(_url,init)=>{const body=JSON.parse(init.body);calls.push({action:body.action,token:init.headers['x-admin-token']});const r=reply(body.action);return{ok:r.status<400,status:r.status,json:async()=>r.body};}};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(read('demo-admin-bridge.js'),ctx);vm.runInContext(read('settings.js'),ctx);
 const start=async()=>{for(const f of docEvents.DOMContentLoaded||[])await f();await flush();};
 const fireDoc=n=>{for(const f of docEvents[n]||[])f({});};
 const click=async id=>{for(const f of el(id).ev.click||[])await f({preventDefault(){}});await flush();};
 const storageEvent=e=>{for(const f of winEvents.storage||[])f(e);};
 return{ctx,el,calls,timers,local,session,start,fireDoc,click,storageEvent,winEvents};
}
const okStatus=action=>action==='admin_status'?{status:200,body:{google_email:'office@example.test',pending:[],emails:[]}}:{status:200,body:{students:[],documents:[],ok:true,oauth_configured:true}};

test('signed-in staff is not logged out by idle time: no idle timer, no admin_logout',async()=>{
 const f=settings({hash:'#admin_token='+TOKEN,reply:okStatus});await f.start();
 for(const n of ['pointerdown','keydown','touchstart'])f.fireDoc(n);
 assert.equal(f.timers.filter(t=>t.ms>=600000).length,0,'no 10-minute idle timer');
 for(const t of f.timers)t.f();await flush();
 assert.equal(f.calls.some(c=>c.action==='admin_logout'),false);
 assert.equal(f.el('signedIn').hidden,false);assert.equal(f.session.getItem(KEY),TOKEN);assert.equal(f.local.getItem(COPY),TOKEN);
 assert.doesNotMatch(read('settings.js'),/restartAdminIdle|inattività/);
});

test('OAuth return token is mirrored to localStorage; a new tab is seeded from it',async()=>{
 const first=settings({hash:'#admin_token='+TOKEN,reply:okStatus});await first.start();
 assert.equal(first.local.getItem(COPY),TOKEN);
 const tab=settings({local:first.local,reply:okStatus});
 assert.equal(tab.session.getItem(KEY),TOKEN,'fresh sessionStorage seeded on load');
 await tab.start();assert.equal(tab.calls[0].action,'admin_status');assert.equal(tab.calls[0].token,TOKEN);assert.equal(tab.el('signedIn').hidden,false);
});

test('explicit Logout calls admin_logout and clears sessionStorage and the localStorage copy',async()=>{
 const f=settings({local:memory({[COPY]:TOKEN}),reply:okStatus});await f.start();
 await f.click('logoutButton');
 assert.ok(f.calls.some(c=>c.action==='admin_logout'&&c.token===TOKEN));
 assert.equal(f.session.getItem(KEY),null);assert.equal(f.local.getItem(COPY),null);assert.equal(f.el('signedOut').hidden,false);
});

test('server 401 shows "Accesso scaduto" and clears both copies',async()=>{
 const f=settings({local:memory({[COPY]:TOKEN}),reply:a=>a==='admin_status'?{status:401,body:{error:'Sessione amministratore non valida'}}:okStatus(a)});await f.start();
 assert.match(f.el('globalStatus').textContent,/Accesso scaduto/);
 assert.equal(f.session.getItem(KEY),null);assert.equal(f.local.getItem(COPY),null);
});

test('a network/5xx failure does not destroy the persistent session',async()=>{
 const f=settings({local:memory({[COPY]:TOKEN}),reply:a=>a==='admin_status'?{status:503,body:{error:'down'}}:okStatus(a)});await f.start();
 assert.doesNotMatch(f.el('globalStatus').textContent,/Accesso scaduto/);assert.match(f.el('globalStatus').textContent,/non raggiungibile/);
 assert.equal(f.local.getItem(COPY),TOKEN);
});

test('a 401 for a stale token does not wipe a newer sign-in saved by another tab',()=>{
 const f=settings({local:memory({[COPY]:OTHER}),session:memory({[KEY]:OTHER})});
 f.ctx.CaseyDemoAdmin.clear(TOKEN);
 assert.equal(f.local.getItem(COPY),OTHER);assert.equal(f.session.getItem(KEY),OTHER);
});

test('logout in another tab (storage event) removes this tab token and notifies listeners',()=>{
 const f=settings({local:memory({[COPY]:TOKEN})});let notified=0;f.ctx.addEventListener('casey:demo-admin',()=>notified++);
 assert.equal(f.session.getItem(KEY),TOKEN);
 f.local.removeItem(COPY);f.storageEvent({key:COPY,newValue:null});
 assert.equal(f.session.getItem(KEY),null);assert.equal(notified,1);
 f.storageEvent({key:COPY,newValue:OTHER});assert.equal(f.session.getItem(KEY),OTHER);assert.equal(notified,2);
});

// Calendar window opened with noopener: fresh sessionStorage, same-origin localStorage.
function calendar({local,status=200,body={connected:true,events:[]}}){
 const node=()=>({children:[],textContent:'',style:{setProperty(){}},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;}});
 const ids={cal:node(),calTitle:node(),calSub:node()},sent=[],session=memory(),winEvents={};
 const ctx={VIEW:'OFFICE',localStorage:local,sessionStorage:session,CASEY_CONFIG:{settingsApiUrl:'https://api.invalid/settings'},Intl,Date,AbortSignal,
  document:{hidden:false,querySelectorAll:()=>[],getElementById:k=>ids[k],createElement:node,createDocumentFragment:node},
  addEventListener:(n,f)=>{(winEvents[n]||=[]).push(f);},dispatchEvent:e=>{for(const f of winEvents[e.type]||[])f(e);return true;},CustomEvent:class{constructor(t){this.type=t;}},
  fetch:async(_u,init)=>{sent.push(init.headers['x-admin-token']);return{ok:status<400,status,json:async()=>body};}};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(read('demo-admin-bridge.js'),ctx);vm.runInContext(read('real-calendar.js'),ctx);
 return{ctx,ids,sent,session,local};
}

test('presentation calendar window uses the shared staff token without a new login',async()=>{
 const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit'}).format(new Date())+'-02';
 const f=calendar({local:memory({[COPY]:TOKEN}),body:{connected:true,events:[{start:day,title:'OFFICE EVENT'}]}});await flush();
 assert.deepEqual(f.sent,[TOKEN]);assert.match(JSON.stringify(f.ids.cal),/OFFICE EVENT/);
});

test('calendar 401 clears the shared copy and asks for staff sign-in on next render',async()=>{
 const f=calendar({local:memory({[COPY]:TOKEN}),status:401,body:{error:'Sessione amministratore non valida'}});await flush();
 assert.equal(f.local.getItem(COPY),null);assert.equal(f.session.getItem(KEY),null);
 f.ctx.window.renderCal();await flush();assert.match(f.ids.calSub.textContent,/Accedi come staff/);assert.equal(f.sent.length,1);
});
