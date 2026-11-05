import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
const source=fs.readFileSync(new URL('../supabase/functions/casey-original-ui/index.js',import.meta.url),'utf8');
const part=source.slice(source.indexOf('/* reconcile:start'),source.indexOf('/* reconcile:end */'));
const BOOK='11111111-2222-3333-4444-555555555555',SLOT='aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
function fixture(googleImpl,{age=10*60000,raced=false}={}){
 const calls=[],state={booking:true,booked:true};
 const db=async(path,body,method='GET')=>{calls.push(method+' '+path.split('?')[0]);
  if(method==='GET'&&path.startsWith('dc_bookings'))return state.booking?[{id:BOOK,slot_id:SLOT,created_at:new Date(Date.now()-age).toISOString(),calendar_status:'created',google_event_id:'dc'+BOOK.replace(/-/g,'')}]:[];
  if(method==='DELETE'&&path.startsWith('dc_bookings')){const had=state.booking&&!raced;state.booking=false;return had?[{id:BOOK}]:[];}
  if(method==='PATCH'&&path.startsWith('dc_slots')){assert.match(path,/booked=eq.true/);state.booked=body.booked;return [];}
  return [];};
 const google=async url=>{calls.push('GOOGLE');return googleImpl(url);};
 const ctx=vm.runInNewContext(part+'\n({reconcileCancelled})',{db,google,qs:o=>new URLSearchParams(o).toString(),eventId:id=>'dc'+id.replace(/-/g,''),console:{log(){}},Date,Promise,setTimeout,clearTimeout,JSON,Array,encodeURIComponent,URLSearchParams});
 const run=()=>ctx.reconcileCancelled({calendar_id:'staff@example.test'},'t',[{id:SLOT,starts_at:new Date(Date.now()+86400000).toISOString()}]);
 return {calls,state,run};
}
const err=(status,extra={})=>Object.assign(new Error('g'),{status,...extra});
test('404 deletes dependents, then booking, then frees slot',async()=>{const f=fixture(()=>{throw err(404);});assert.deepEqual([...await f.run()],[SLOT]);assert.equal(f.state.booking,false);assert.equal(f.state.booked,false);
 const seq=f.calls.filter(x=>!x.startsWith('GET')&&x!=='GOOGLE');assert.deepEqual(seq,['DELETE dc_v3_mail_outbox','DELETE dc_tickets','DELETE dc_bookings','PATCH dc_slots']);});
test('410 frees the slot',async()=>{const f=fixture(()=>{throw err(410);});await f.run();assert.equal(f.state.booked,false);});
test('cancelled event frees the slot',async()=>{const f=fixture(()=>({status:'cancelled',extendedProperties:{private:{caseyBookingId:BOOK}}}));await f.run();assert.equal(f.state.booked,false);assert.equal(f.state.booking,false);});
test('cancelled event owned by another booking is untouched',async()=>{const f=fixture(()=>({status:'cancelled',extendedProperties:{private:{caseyBookingId:'other'}}}));await f.run();assert.equal(f.state.booked,true);});
test('confirmed event is untouched',async()=>{const f=fixture(()=>({status:'confirmed'}));assert.deepEqual([...await f.run()],[]);assert.equal(f.state.booking,true);assert.equal(f.state.booked,true);});
for(const [name,e] of [['500',err(500)],['401',err(401)],['network',err(undefined,{uncertain:true})]])
 test(`Google ${name} is untouched`,async()=>{const f=fixture(()=>{throw e;});await f.run();assert.equal(f.state.booking,true);assert.equal(f.state.booked,true);assert.ok(!f.calls.some(x=>x.startsWith('DELETE')));});
test('booking younger than 2 minutes is not checked',async()=>{const f=fixture(()=>{throw err(404);},{age:30000});await f.run();assert.equal(f.state.booked,true);assert.ok(!f.calls.includes('GOOGLE'));});
test('slot is not freed when the conditional booking delete matched nothing',async()=>{const f=fixture(()=>{throw err(404);},{raced:true});assert.deepEqual([...await f.run()],[]);assert.equal(f.state.booked,true);assert.ok(!f.calls.includes('PATCH dc_slots'));});
test('handlers reconcile before selecting free slots',()=>{const slots=source.slice(source.indexOf("if(b.action==='slots'){"));assert.ok(slots.indexOf('reconcileWindow(')<slots.indexOf("booked:'eq.false',starts_at:'gt.'+new Date().toISOString(),order:'starts_at.asc',limit:'750'"));
 const month=source.slice(source.indexOf('async function monthlyAvailability('));assert.ok(month.indexOf('reconcileWindow(')<month.indexOf("booked:'eq.false'"));});
