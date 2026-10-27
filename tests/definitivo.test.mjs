import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Language persists, ignores unsupported values and synchronizes controls',()=>{
 const saved=new Map();const controls=[{value:'',addEventListener(){}}];const ctx={URLSearchParams,location:{search:'',origin:'http://localhost'},localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},document:{documentElement:{},querySelectorAll:()=>controls,getElementById:()=>null},CustomEvent:class{},window:{addEventListener(){},dispatchEvent(){}}};
 vm.createContext(ctx);vm.runInContext(read('../casey-language.js'),ctx);ctx.window.CaseyLanguage.set('en-US');assert.equal(saved.get('casey-language'),'en-US');assert.equal(controls[0].value,'en-US');ctx.window.CaseyLanguage.set('invalid');assert.equal(ctx.window.CaseyLanguage.get(),'en-US');
});
test('Authorized release targets versioned production adapters without publishing the document corpus',()=>{
 const config=read('../config.js');assert.match(config,/oxzraaadxqsruibinlxn/);assert.doesNotMatch(config,/sneaxpqnmlhnrhoautjx/);assert.match(config,/casey-definitivo-ui/);assert.match(config,/casey-definitivo-live/);
 for(const page of ['index.html','app-blu.html','app-rossa.html'])assert.doesNotMatch(read('../'+page),/src="conoscenza\.js"/);
 assert.doesNotMatch(read('../supabase/functions/_shared/definitivo-preview.ts'),/import .*definitivo-(?:corpus|search)/);
});
test('Kiosk Live preserves course context and source/clarification metadata through its actual API adapter',async()=>{
 const element={placeholder:'',textContent:''};const history=[{role:'user',text:'Quanto serve per superare un esame?'}];const calls=[];
 const language={get:()=> 'it-IT'};
 const ctx={AbortSignal,URL,URLSearchParams,clearInterval,clearTimeout,setInterval,setTimeout,
  CaseyLanguage:language,document:{querySelector:()=>element,getElementById:()=>element},
  fetch:async(_url,init)=>{const body=JSON.parse(init.body);calls.push(body);return Response.json(body.action==='session'?{token:'a'.repeat(72)}:{verified:false,matches:[],note:'Quale corso?',clarification_required:'course'});},
  window:{CASEY_CONFIG:{apiUrl:'https://example.invalid/definitivo-ui',publishableKey:'public-test'},HandoffAPI:{},CaseyDialogue:{snapshot:()=>history},say(){},addEventListener(){},CaseyLanguage:language}};
 vm.createContext(ctx);vm.runInContext(read('../definitivo-kiosk.js'),ctx);
 const result=await ctx.window.CaseyBridge.liveSearchKnowledge('DMDA');
 assert.equal(calls[1].action,'knowledge_lookup');assert.deepEqual(calls[1].history,history);
 assert.equal(result.note,'Quale corso?');assert.equal(result.clarification_required,'course');
});
