import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../supabase/functions/casey6-original-ui/index.js',import.meta.url),'utf8');
const part=src.slice(src.indexOf('async function aiInterpret('),src.indexOf('\nasync function sessionFrom('));
test('Gemini Standard uses same server-side GEMINI_API_KEY and REST generateContent, not OpenRouter',async()=>{
 let calls=[],limits=[];
 const {aiInterpret}=vm.runInNewContext(part+'\n({aiInterpret})',{
   GEMINI_API_KEY:'unit-test-secret',GEMINI_TEXT_MODEL:'gemini-3.8-flash',
   takeRate:async(...a)=>limits.push(a),redact:s=>s,AbortSignal,
   fetch:async(url,opts)=>{calls.push({url,opts});return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:JSON.stringify({intent:'information',response:'Risposta con fonte.',citations:['doc-test']})}]}}]})}}
 });
 const result=await aiInterpret('Come si stampa?',{session_id:'session-1',recent_history:[],state:{}},{student:{institution:'SHARED'}},[{id:'doc-test',title:'Manuale',content:'Per stampare seguire le istruzioni ufficiali.',source_url:'https://example.org/verified'}]);
 assert.equal(result.response,'Risposta con fonte.');assert.equal(result.citations.length,1);
 assert.match(calls[0].url,/models\/gemini-3\.8-flash:generateContent/);
 assert.equal(calls[0].opts.headers['x-goog-api-key'],'unit-test-secret');
 assert.equal(JSON.parse(calls[0].opts.body).generationConfig.responseMimeType,'application/json');
 assert.equal(limits.length,2);
});
test('Institutional information without a verified citation always goes to handoff',async()=>{
 const {aiInterpret}=vm.runInNewContext(part+'\n({aiInterpret})',{
  GEMINI_API_KEY:'dummy',GEMINI_TEXT_MODEL:'gemini-3.8-flash',takeRate:async()=>{},redact:s=>s,AbortSignal,
  fetch:async()=>({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'{"intent":"information","response":"inventato","citations":[]}'}]}}]})})
 });
 const result=await aiInterpret('Quando sono gli esami?',{session_id:'s',recent_history:[],state:{}},null,[], 'it-IT');
 assert.equal(result.intent,'handoff');assert.doesNotMatch(result.response,/inventato/);
});
test('No OpenRouter or Chirp credentials remain in active Standard code',()=>{
 assert.doesNotMatch(src,/OPENROUTER_(?:KEY|MODEL)|OPENROUTER_API_KEY|openrouter\.ai\/api/);
 assert.match(src,/knowledge_lookup/);
 assert.match(src,/gemini_text_configured/);
});
