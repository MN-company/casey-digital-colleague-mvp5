import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../supabase/functions/casey-original-ui/index.js',import.meta.url),'utf8');
const part=src.slice(src.indexOf('async function aiInterpret('),src.indexOf('\nasync function sessionFrom('));
async function run(object,docs=[]){
 const text=JSON.stringify(object),pieces=[text.slice(0,35),text.slice(35,70),text.slice(70)];const packets=pieces.map(text=>'data: '+JSON.stringify({candidates:[{content:{parts:[{text}]}}]})+'\n\n').join('');
 const bytes=new TextEncoder().encode(packets);let endpoint;const seen=[];
 const {aiInterpret}=vm.runInNewContext(part+'\n({aiInterpret})',{GEMINI_API_KEY:'test',GEMINI_TEXT_MODEL:'model',takeRate:async()=>{},redact:x=>x,AbortSignal,TextDecoder,Uint8Array,
 fetch:async url=>{endpoint=url;return new Response(new ReadableStream({start(c){for(let i=0;i<bytes.length;i+=7)c.enqueue(bytes.slice(i,i+7));c.close();}}));}});
 const result=await aiInterpret('Question',{session_id:'s',recent_history:[],state:{}},null,docs,'it-IT',text=>seen.push(text));return {result,seen,endpoint};
}
test('Gemini SSE survives arbitrary UTF8/network boundaries and emits progressively',async()=>{const x=await run({intent:'other',citations:[],response:'Ciao, già qui. "Bene"!'});assert.match(x.endpoint,/:streamGenerateContent\?alt=sse/);assert.ok(x.seen.length>0);assert.equal(x.seen.at(-1),x.result.response);});
test('unsupported institutional answers never enter the progressive output',async()=>{const x=await run({intent:'information',citations:[],response:'Esame domani, inventato'});assert.equal(x.seen.length,0);assert.equal(x.result.intent,'handoff');});
test('only existing source IDs unlock progressive policy answers',async()=>{const x=await run({intent:'information',citations:['doc'],response:'Informazione verificata.'},[{id:'doc',title:'Fonte'}]);assert.equal(x.seen.at(-1),'Informazione verificata.');assert.equal(x.result.citations[0].id,'doc');});
