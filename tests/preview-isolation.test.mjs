import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/casey6-original-ui/index.js',import.meta.url),'utf8');
function backend(env={}){
 let handle;const calls=[];
 const context=vm.createContext({Request,Response,URL,URLSearchParams,TextEncoder,TextDecoder,crypto,AbortSignal,console,Intl,Date,
 Deno:{env:{get:k=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-service',GEMINI_API_KEY:'test-gemini',...env})[k]},serve:f=>handle=f},
 fetch:async(url,options={})=>{calls.push({url,options});
 if(url.includes('dc_take_rate'))return Response.json(true);
 if(url.includes('dc_sessions?'))return Response.json([{id:'session-test'}]);
 if(url.includes('dc_v4_conversations?'))return Response.json([]);
 if(url.includes('dc_v4_documents?'))return Response.json([]);
 return Response.json([]);
 }});
 vm.runInContext(source,context);return {handle,calls,context};
}
const origin='http://localhost:4173';
const request=(action,headers={})=>new Request('https://test.supabase.co/functions/v1/casey6-original-ui',{method:'POST',headers:{origin,'content-type':'application/json',...headers},body:JSON.stringify({action})});
test('Preview blocks every external write before any database or Google call',async()=>{
 const b=backend();
 for(const action of ['commit','student_submit_request','student_google_start','student_google_disconnect','admin_calendar','admin_request_update','admin_verify','admin_retry','admin_retry_email','admin_student_upsert','admin_document_create','admin_disconnect','admin_logout'])assert.equal((await b.handle(request(action))).status,403,action);
 assert.equal(b.calls.length,0);
});
test('Preview GET OAuth routes cannot replace shared Google connections',async()=>{
 const b=backend();for(const path of ['start','callback','student-start','student-callback'])assert.equal((await b.handle(new Request('https://test.supabase.co/functions/v1/casey6-original-ui/oauth/'+path))).status,403);
 assert.equal(b.calls.length,0);
});
test('Preview rejects production and unrelated origins',async()=>{
 const b=backend();for(const denied of ['https://evil.example','https://casey-digital-colleague-live.vercel.app','https://casey-digital-colleague-live-evil-mnbrain.vercel.app'])assert.equal((await b.handle(request('session',{origin:denied}))).status,403);
 assert.equal(b.calls.length,0);
});
test('Protected reads require a valid Casey session',async()=>{
 const b=backend();assert.equal((await b.handle(request('health'))).status,401);assert.equal(b.calls.length,0);
});
test('Preview session creation consumes only preview rate buckets',async()=>{
 const b=backend();const response=await b.handle(request('session'));assert.equal(response.status,200);assert.equal((await response.json()).token.length,72);
 const rates=b.calls.filter(c=>c.url.includes('dc_take_rate')).map(c=>JSON.parse(c.options.body).p_bucket);
 assert.equal(rates.length,2);assert.ok(rates.every(x=>x.startsWith('casey6-preview:')));
});
test('Anonymous knowledge never reads institution-specific documents',async()=>{
 const b=backend();const response=await b.handle(new Request('https://test.supabase.co/functions/v1/casey6-original-ui',{method:'POST',headers:{origin,'x-session-token':'a'.repeat(72)},body:JSON.stringify({action:'knowledge_lookup',query:'Quando sono gli esami 2026-2027?'})}));
 assert.equal(response.status,200);assert.equal((await response.json()).verified,false);
 const lookup=b.calls.find(c=>c.url.includes('dc_v4_documents?'));assert.equal(new URL(lookup.url).searchParams.get('institution'),'in.(SHARED)');
});
