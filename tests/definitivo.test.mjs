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
