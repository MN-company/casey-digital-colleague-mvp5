import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const ctx=vm.createContext({Intl,Date});vm.runInContext(readFileSync(new URL('../casey-dates.js',import.meta.url),'utf8'),ctx);
const parse=(s,p={},now='2026-10-19T10:00:00Z')=>JSON.parse(JSON.stringify(ctx.CaseyDates.parseAppointment(s,p,new Date(now))));
test('weekdays IT/EN/ES select the upcoming date without adding an extra week',()=>{for(const s of ['prossimo martedì','Tuesday','martes'])assert.equal(parse(s).day,'2026-10-20');});
test('next week is a calendar week, including Mondays and Sundays',()=>{assert.equal(parse('next week Monday').day,'2026-10-26');assert.equal(parse('domenica prossima settimana').day,'2026-11-01');});
test('time-only follow-up retains the selected date',()=>{const r=parse('sì, alle 15',{day:'2026-10-21',time:'10:00'});assert.equal(r.day,'2026-10-21');assert.equal(r.time,'15:00');});
test('changing date clears the previous hour unless same time is explicit',()=>{assert.equal(parse('Friday',{day:'2026-10-21',time:'15:00'}).time,null);assert.equal(parse('Friday same time',{day:'2026-10-21',time:'15:00'}).time,'15:00');});
test('12-hour, Spanish and afternoon expressions produce 24-hour times',()=>{assert.equal(parse('at 3 pm').time,'15:00');assert.equal(parse('a las 15:30').time,'15:30');assert.equal(parse('alle 3 del pomeriggio').time,'15:00');});
test('ambiguous, impossible and past dates require clarification',()=>{assert.equal(parse('alle 3').error,'ambiguous_time');assert.equal(parse('31/02/2027').error,'invalid_date');assert.equal(parse('alle 25:99').error,'invalid_time');assert.equal(parse('2025-10-21').error,'past_date');});
test('calendar arithmetic across DST and midnight uses Rome date',()=>{assert.equal(parse('domani',{},'2026-10-24T23:30:00Z').day,'2026-10-26');assert.equal(parse('domani',{},'2026-03-28T23:30:00Z').day,'2026-03-30');assert.equal(parse('oggi',{},'2026-10-19T23:30:00Z').day,'2026-10-20');});
test('textual date with year is supported in three languages',()=>{for(const s of ['26 ottobre 2026','26 October 2026','26 octubre 2026'])assert.equal(parse(s).day,'2026-10-26');});
test('Spanish morning is a period, not a relative date',()=>{const r=parse('martes por la mañana');assert.equal(r.day,'2026-10-20');assert.equal(r.period,'morning');});
test('appointment context can transfer from Live user turns into Standard',()=>{const h=ctx.CaseyDates.fromHistory([{role:'user',text:'Vorrei prenotare martedì alle 15'},{role:'assistant',text:'Controllo gli slot.'}],new Date('2026-10-19T10:00:00Z'));const r=parse('alle 16',h);assert.equal(h.phase,'awaiting_slot');assert.equal(r.day,'2026-10-20');assert.equal(r.time,'16:00');});
test('a new information topic clears appointment context from history',()=>{const h=ctx.CaseyDates.fromHistory([{role:'user',text:'prenota martedì alle 15'},{role:'user',text:'Come organizzo il pomeriggio di studio?'}],new Date('2026-10-19T10:00:00Z'));assert.equal(h.phase,'ready');assert.equal(h.day,undefined);});
test('Correction replaces rejected date and cancellation prevents reviving a stale appointment',()=>{
 const history=[{role:'user',text:'Prenota martedì alle 15'},{role:'user',text:'No, venerdì alle 16'},{role:'user',text:'Annulla la prenotazione'},{role:'user',text:'Domani alle 10'}];
 const corrected=ctx.CaseyDates.fromHistory(history.slice(0,2),new Date('2026-10-19T10:00:00Z'));assert.equal(corrected.day,'2026-10-23');assert.equal(corrected.time,'16:00');
 const cancelled=ctx.CaseyDates.fromHistory(history,new Date('2026-10-19T10:00:00Z'));assert.notEqual(cancelled.phase,'awaiting_slot');assert.equal(cancelled.day,undefined);
});

test('Real reported badge conversation keeps its intent through both follow-up questions',()=>{const turns=[{role:'user',text:'Devo ritirare il badge ma non riesco nello slot riservato. Come posso fare?'},{role:'assistant',text:'Fai login College.'},{role:'user',text:'Ok quindi?'},{role:'user',text:'Quando posso cambiare orario per il ritiro?'}];assert.equal(ctx.CaseyDates.fromHistory(turns).phase,'awaiting_slot');});

test('A new exam question does not reuse pending badge availability',()=>{assert.equal(ctx.CaseyDates.fromHistory([{role:'user',text:'Devo ritirare il badge in un altro orario'},{role:'user',text:'Quando ho un esame?'}]).phase,'ready');});
