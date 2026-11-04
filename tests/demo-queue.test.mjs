import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
function reviewQueue({admin=null}={}){const ctx={window:{addEventListener(){}},sessionStorage:{getItem:k=>k==='casey-v3-admin'?admin:null},document:{addEventListener(){}},queue:[],renderQueue(){},renderTabs(){},loadScenario(){},Intl,Date,CASEY_CONFIG:{}};
 ctx.window.loadScenario=ctx.loadScenario;vm.createContext(ctx);vm.runInContext(read('campus-review-queue.js'),ctx);return ctx.window;}
const Q="Casey, un'azienda mi ha proposto uno stage part-time. Posso farlo?\nDettagli richiesta:\n- Studente: Pietro <b>Bianchi</b>\n- Impegno: part-time · 20 ore/settimana\n- Allegati: nessuno";
test('real review card: domanda + labeled details, header, Europe/Rome time, staff note, escaped',()=>{
 const w=reviewQueue(),html=w.renderCampusReview({id:'abcdef12-0000-0000-0000-000000000000',q:'Internship: <script>',question:Q,reviewStatus:'open',created_at:'2026-11-04T08:12:00Z'});
 assert.ok(html.includes('RICHIESTA abcdef12 · STUDENT OFFICE · da Casey (app College)'));
 assert.ok(html.includes('<p class="real-review-question">Casey, un&#39;azienda mi ha proposto uno stage part-time. Posso farlo?</p>'));
 assert.ok(html.includes('Studente: <b>Pietro &lt;b&gt;Bianchi&lt;/b&gt;</b><br>Impegno: <b>part-time · 20 ore/settimana</b><br>Allegati: <b>nessuno</b>'));
 assert.ok(!html.includes('<script>')&&html.includes('Internship: &lt;script&gt;'));assert.ok(html.includes('09:12'),'Europe/Rome CET');
 assert.ok(html.includes('Valutazione dello staff: Casey non approva né respinge la richiesta.'));assert.ok(html.includes('REVISIONE STAFF'));
 assert.ok(!html.includes('data-campus-review'),'no take-over button without staff');
 assert.ok(reviewQueue({admin:'t'}).renderCampusReview({id:'abcdef12-0000-0000-0000-000000000000',q:'x',question:'x',reviewStatus:'open'}).includes('Prendi in carico'));
});
test('parse: question without details stays a single paragraph; label injection is escaped',()=>{
 const w=reviewQueue();assert.deepEqual(JSON.parse(JSON.stringify(w.parseCampusReviewQuestion('Solo domanda'))),{ask:'Solo domanda',details:[]});
 const html=w.renderCampusReview({id:'x',q:'s',question:'D\n- <img src=x>: "v"',reviewStatus:'in_review'});assert.ok(html.includes('&lt;img src=x&gt;: <b>&quot;v&quot;</b>'));assert.ok(html.includes('IN REVISIONE'));
});
function workspace(S){const el=()=>{const e={children:[],className:'',textContent:'',childNodes:[],append(...x){e.childNodes.push(...x);},prepend(x){e.children.unshift(x);},after(x){e.afterNode=x;},querySelector(){return e.r1||(e.r1=el());}};return e;};
 const box=el(),ctx={S,queue:[],mailOffice:[],mailPerson:[],feed:[],selMail:0,VIEW:'OFFICE',renderAll(){},document:{createElement:el,getElementById:()=>box}};
 ctx.window=ctx;ctx.loadScenario=()=>{};ctx.renderMail=()=>{};ctx.renderFeed=()=>{};ctx.renderQueue=()=>{box.children=ctx.queue.map(()=>el());};
 vm.createContext(ctx);vm.runInContext(read('demo-workspace.js'),ctx);ctx.window.loadScenario();return {ctx,box};}
test('COLLEGE fixtures: ≥10 synthetic requests, unique ids, rich fields, rendered in the same queue',()=>{
 const {ctx,box}=workspace('COLLEGE'),q=ctx.queue;assert.ok(q.length>=10);assert.equal(new Set(q.map(t=>t.id)).size,q.length);
 for(const t of q){assert.ok(t.demo&&t.who&&t.q&&t.to&&t.draft&&t.rule.startsWith('Richiesta allo staff: ')&&t.lvlTxt);for(const k of ['corso','canale','ricevuta','priorita','sintesi'])assert.ok(t.details[k],t.id+' '+k);
  assert.ok(['Casey totem','App College','Email'].includes(t.details.canale));assert.ok(['Alta','Media','Bassa'].includes(t.details.priorita));assert.match(t.email,/^[a-z.]+@example\.com$/);}
 for(const s of ['proroga','rata','prerequisito','visto','piano di studi','Erasmus','Badge','Aula studio','crediti','tempo aggiuntivo'])assert.ok(q.some(t=>t.q.toLowerCase().includes(s.toLowerCase())),s);
 assert.equal(ctx.mailOffice.length,q.length+1);assert.ok(ctx.mailOffice[0].subj.startsWith(q.length+' richieste'));assert.equal(ctx.feed.length,q.length);
 ctx.window.renderQueue();const d=box.children.at(-1).r1?.afterNode||box.children[1].r1.afterNode;assert.equal(d.className,'kv demo-ticket-details');assert.ok(d.childNodes.some(n=>n.textContent==='Casey totem'||n.textContent==='App College'||n.textContent==='Email'));
 assert.equal(box.children[0].className,'workspace-demo-note');assert.ok(!read('demo-workspace.js').includes('innerHTML'),'details via textContent');
});
test('CAMPUS fixtures keep three requests with the same shape',()=>{const {ctx}=workspace('CAMPUS');assert.equal(ctx.queue.length,3);assert.equal(new Set(ctx.queue.map(t=>t.id)).size,3);});
