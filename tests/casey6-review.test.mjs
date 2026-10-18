import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const file = p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('Emma/Sofia scenarios, presence buttons and demo controls remain',()=>{
 const html=file('../index.html');
 for(const s of ['EMMA','SOFIA','triggerPresence()', 'caseyLiveBtn','caseyYes','caseyNo','casey-tools.js'])assert.ok(html.includes(s),'missing '+s);
});
test('Gemini token setup includes only safe tools, shares Gemini API key, and keeps Gemini Live model',()=>{
 const c=file('../supabase/functions/casey6-live-token/index.ts');
 assert.match(c,/gemini-3\.8-live/);assert.match(c,/GEMINI_API_KEY/);
 assert.match(c,/tools:LIVE_TOOLS/);
 assert.match(c,/prepare_booking/);assert.doesNotMatch(c,/\{name:'confirm_booking'/);
 assert.match(c,/bidiGenerateContentSetup/);
});
test('Booking confirmation still uses existing secure backend commit',()=>{
 const bridge=file('../casey-bridge.js');
 assert.match(bridge,/api\('prepare',\{slot_id/);
 assert.match(bridge,/api\('commit',\{request_id/);
 assert.match(bridge,/function livePrepareBooking/);
 assert.match(bridge,/new CustomEvent\('casey:booking-result'/);
});
test('RAG remains opt-in and requires reviewer and verified source citations',()=>{
 const sql=file('../supabase/migrations/20261018_casey_v6_knowledge_foundation.sql');
 const b=file('../supabase/functions/casey6-original-ui/index.js');
 assert.match(sql,/verified boolean NOT NULL DEFAULT false/);
 assert.match(sql,/source_sha256/);assert.match(sql,/p_program/);assert.match(sql,/academic_year/);
 assert.match(b,/CASEY_KNOWLEDGE_V6_ENABLED/);
 assert.match(b,/CASEY_VERIFIED_FAQ_ENABLED/);
});
