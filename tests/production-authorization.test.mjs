import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/functions/casey-original-ui/index.js',import.meta.url),'utf8');
const origin='https://casey-digital-colleague-live.vercel.app';
function server(){let handle;const calls=[];const ctx=vm.createContext({Request,Response,URL,URLSearchParams,TextEncoder,TextDecoder,crypto,AbortSignal,console,Intl,Date,
 Deno:{env:{get:k=>({SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-key',GEMINI_API_KEY:'test-gemini'})[k]},serve:f=>handle=f},
 fetch:async(url,options={})=>{calls.push({url,options});return Response.json(url.includes('rpc/hf7_take_rate')?true:url.includes('dc_sessions?')?[{id:'test-session'}]:[]);}});
 vm.runInContext(source,ctx);return {handle,calls};}
function req(fields={},headers={}){return new Request('https://test.supabase.co/functions/v1/casey-original-ui',{method:'POST',headers:{origin,'x-session-token':'a'.repeat(72),...headers},body:JSON.stringify({action:'commit',...fields})});}
test('Production allows production origin but requires session',async()=>{const b=server();const r=await b.handle(req({},{'x-session-token':''}));assert.equal(r.status,401);assert.equal(r.headers.get('access-control-allow-origin'),origin);assert.equal(b.calls.length,0);});
test('Production commit is enabled and rejects absent button confirmation',async()=>{const b=server();const r=await b.handle(req());assert.equal(r.status,400);assert.match((await r.json()).error,/Conferma tramite pulsante/);assert.equal(b.calls.length,1);});
test('Production cannot book as demo Emma or Sofia without verified student identity',async()=>{for(const scenario of ['EMMA','SOFIA']){const b=server();const r=await b.handle(req({scenario,student_number:'1234567',request_id:'11111111-1111-4111-8111-111111111111',slot_id:'22222222-2222-4222-8222-222222222222',confirmation_token:'c'.repeat(48)}));assert.equal(r.status,401);assert.ok(b.calls.every(c=>!c.url.includes('dc_v4_confirm_booking')));}});
test('Production keeps unrelated origins denied',async()=>{const b=server();assert.equal((await b.handle(req({},{origin:'https://evil.example'}))).status,403);assert.equal(b.calls.length,0);});

test('Public kiosk session rate uses an explicit minute, not the legacy daily bucket',async()=>{const b=server();const r=await b.handle(req({action:'session'}));assert.equal(r.status,200);const rates=b.calls.filter(c=>c.url.includes('take_rate'));assert.equal(rates.length,2);for(const c of rates){const body=JSON.parse(c.options.body);assert.equal(body.p_window_seconds,60);assert.match(body.p_bucket,/^casey-session:/);}assert.ok(!b.calls.some(c=>c.url.includes('rpc/dc_take_rate')));});
