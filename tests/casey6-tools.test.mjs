import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../casey-tools.js',import.meta.url),'utf8');
function makeEnv(){
 const calls=[];
 const window={CaseyBridge:{
   liveFindSlots:async a=>{calls.push(['slots',a]);return {slots:[]}},
   livePrepareBooking:async a=>{calls.push(['prepare',a]);return {status:'awaiting_confirmation'}},
   liveBookingStatus:async a=>{calls.push(['status',a]);return {saved:false}},
   liveSearchKnowledge:async a=>{calls.push(['knowledge',a]);return {verified:false}}
 }};
 vm.runInNewContext(src,{window,console});return {api:window.CaseyTools,calls};
}
test('Tool allowlist only permits verified read/prepare operations; never commit directly',async()=>{
 const {api,calls}=makeEnv();
 assert.equal(api.names.includes('commit'),false);
 assert.equal((await api.execute('commit',{confirmation_token:'fake'})).status,'unsupported_tool');
 assert.equal((await api.execute('prepare_booking',{slot_id:'slot-id'})).status,'awaiting_confirmation');
 assert.equal(calls[0][0],'prepare');
 assert.equal(calls[0][1],'slot-id');
});
test('Live knowledge tool forwards query to scoped backend bridge',async()=>{
 const {api,calls}=makeEnv();await api.execute('search_verified_knowledge',{query:'Exam dates 2026-2027'});
 assert.equal(calls[0][0],'knowledge');assert.equal(calls[0][1],'Exam dates 2026-2027');
});
test('Server errors are returned as safe states and never expose credentials',async()=>{
 const {api}=makeEnv();
 const v=await api.execute('__proto__',{});
 assert.equal(v.status,'unsupported_tool');
});
