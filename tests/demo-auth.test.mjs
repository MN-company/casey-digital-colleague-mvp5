// Persistent demo login: an expired saved access token is refreshed before app-auth-shell open() decides on sign-in.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<20;i++)await new Promise(r=>setTimeout(r,0));};
const AUTH='casey-beta-auth-v1',COPY='casey-demo-auth-v1';
const expired={access_token:'old',refresh_token:'r1',expires_at:Date.now()-3600000,email:'demo@example.test',user_id:'u1'};
function setup({search='?casey=1&demo=1',copy=expired,refresh,beta}={}){
 const calls=[],fetches=[],listeners={},elements=new Map(),local=new Map(copy?[[COPY,JSON.stringify(copy)]]:[]),storage=new Map([['casey-handoff-v2-pending','a'.repeat(64)]]);
 const element=tag=>{const e={tag,children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},append:(...i)=>e.children.push(...i),replaceChildren:(...i)=>{e.children=i;},before(){},textContent:'',hidden:false};Object.defineProperty(e,'id',{set(id){e._id=id;elements.set(id,e);},get(){return e._id;}});return e;};
 const root=element('section'),locked=[];
 const document={readyState:'complete',documentElement:{classList:{toggle:(c,on)=>locked.push(on)}},head:element('head'),getElementById:id=>id==='vCasey'?root:elements.get(id)||null,createElement:element,querySelector:()=>element('input'),addEventListener(){}};
 const auth=()=>{try{const a=JSON.parse(storage.get(AUTH)||'null');return a&&a.expires_at>Date.now()+30000?a:null;}catch{return null;}};
 const window={CASEY_CONFIG:{supabaseUrl:'https://sb.test',publishableKey:'pk'},
  HandoffAPI:{auth,session:()=>'s',sessionKey:'k',authKey:AUTH,saveSession(){},async call(action,args){calls.push({action,args});if(['claim','restore','create'].includes(action))return {chat_id:'c',session_token:'s',version:1,context:[{id:'t',role:'assistant',text:'x'}]};if(action==='operation')return {calendar_connected:true,slots:[],draft:null};return {};}},
  CaseyAccount:{profile:async()=>({first_name:'Pietro'})},
  __casey:{ACT:{},go(){},restoreConversation(){}},
  CaseyStudentAccess:Object.freeze({open:()=>calls.push({action:'login-dialog'}),ensure(){},refresh(){},voice(){}}),CaseyChatMerge:{merge:(_b,l)=>l},CaseyLive:{stop:async()=>{}},
  ...(beta?{CaseyBeta:{refresh:async()=>{calls.push({action:'beta-refresh'});storage.set(AUTH,JSON.stringify({...expired,access_token:'beta',expires_at:Date.now()+3600000}));}}}:{}),
  addEventListener:(n,h)=>(listeners[n]||=[]).push(h),dispatchEvent:e=>{for(const h of listeners[e.type]||[])h(e);}};
 const fetch=async(url,init)=>{fetches.push({url,init});return refresh?{ok:true,json:async()=>({access_token:'new',refresh_token:'r2',expires_in:3600,user:{id:'u1',email:'demo@example.test'}})}:{ok:false,status:400,json:async()=>({error:'invalid_grant'})};};
 const ctx={window,document,fetch,location:{hash:'',pathname:'/app-blu.html',search},sessionStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},localStorage:{getItem:k=>local.get(k)??null,setItem:(k,v)=>local.set(k,String(v)),removeItem:k=>local.delete(k)},URLSearchParams,crypto:webcrypto,history:{replaceState(){}},Intl,Date,CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail;}},console,setTimeout,clearTimeout,setInterval:()=>0};
 vm.createContext(ctx);for(const f of ['demo-auth-bridge.js','casey-dates.js','app-auth-shell.js','app-connected.js','demo-script.js','demo-phone.js'])vm.runInContext(read(f),ctx);
 return {window,calls,fetches,storage,local,locked};
}
test('expired saved token + valid refresh: refreshed before open(), QR claim proceeds without the login sheet',async()=>{
 const e=setup({refresh:true});await e.window.CaseyNativeHandoff.open();await flush();
 assert.equal(e.fetches.length,1);assert.equal(e.fetches[0].url,'https://sb.test/auth/v1/token?grant_type=refresh_token');
 assert.equal(e.fetches[0].init.headers.apikey,'pk');assert.deepEqual(JSON.parse(e.fetches[0].init.body),{refresh_token:'r1'});
 const s=JSON.parse(e.storage.get(AUTH));assert.equal(s.access_token,'new');assert.equal(s.refresh_token,'r2');assert.equal(s.user_id,'u1');assert.ok(s.expires_at>Date.now()+3000000);
 assert.equal(e.local.get(COPY),e.storage.get(AUTH),'rotated token mirrored to the copy');
 assert.ok(e.calls.some(c=>c.action==='claim'));assert.ok(!e.calls.some(c=>c.action==='login-dialog'));assert.ok(!e.calls.some(c=>c.action==='scan'));
});
test('expired saved token + rejected refresh: copy cleared and login sheet shown',async()=>{
 const e=setup({refresh:false});await e.window.CaseyNativeHandoff.open();await flush();
 assert.equal(e.fetches.length,1);assert.equal(e.local.has(COPY),false);assert.equal(e.storage.has(AUTH),false);
 assert.ok(e.calls.some(c=>c.action==='scan'));assert.ok(e.calls.some(c=>c.action==='login-dialog'));assert.ok(!e.calls.some(c=>c.action==='claim'));
});
test('fresh saved token: no refresh request',async()=>{
 const e=setup({refresh:true,copy:{...expired,expires_at:Date.now()+3600000}});await e.window.CaseyDemoAuth.ready;assert.equal(e.fetches.length,0);
});
test('CaseyBeta.refresh is preferred when present; account entries re-evaluated after ready',async()=>{
 const e=setup({refresh:true,beta:true});assert.equal(e.locked.at(-1),false,'signed out before ready');await e.window.CaseyDemoAuth.ready;await flush();
 assert.ok(e.calls.some(c=>c.action==='beta-refresh'));assert.equal(e.fetches.length,0);assert.equal(JSON.parse(e.local.get(COPY)).access_token,'beta');assert.equal(e.locked.at(-1),true,'entries hidden after refresh');
});
test('non-demo: no CaseyDemoAuth/ready and no refresh request',async()=>{
 const e=setup({search:'?casey=1',refresh:true});await e.window.CaseyNativeHandoff.open();await flush();
 assert.equal(e.window.CaseyDemoAuth,undefined);assert.equal(e.fetches.length,0);assert.equal(e.local.get(COPY),JSON.stringify(expired),'localStorage untouched');
 assert.ok(e.calls.some(c=>c.action==='login-dialog'));
});
