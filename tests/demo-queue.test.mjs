import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
function reviewQueue({admin=null,search='',now=Date.now(),reply=()=>({status:200,body:{}})}={}){const win={},doc={},calls=[];
 const ctx={window:{location:{search},addEventListener:(n,f)=>{win[n]=f;}},sessionStorage:{getItem:k=>k==='casey-v3-admin'?admin:null},document:{addEventListener:(n,f)=>{doc[n]=f;}},queue:[],renders:0,renderTabs(){},loadScenario(){},Intl,URLSearchParams,AbortSignal,
  Date:class extends Date{static now(){return now;}},CASEY_CONFIG:{settingsApiUrl:'https://api.invalid/s'},
  fetch:async(_u,init)=>{const body=JSON.parse(init.body);calls.push({body,token:init.headers['x-admin-token']});const r=reply(body);return{ok:r.status<400,status:r.status,json:async()=>r.body};}};
 ctx.renderQueue=()=>{ctx.renders++;};ctx.window.loadScenario=ctx.loadScenario;vm.createContext(ctx);vm.runInContext(read('campus-review-queue.js'),ctx);Object.assign(ctx.window,{win,doc,calls,ctx});return ctx.window;}
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
const flush=async(n=10)=>{for(let i=0;i<n;i++)await new Promise(r=>setImmediate(r));};
const ID='abcdef12-0000-0000-0000-000000000001',ID2='abcdef12-0000-0000-0000-000000000002';
const STAGE="Casey, stage part-time?\nDettagli richiesta:\n- Studente: Pietro Bianchi\n- Email: pietro@example.com\n- Impegno: part-time · 20 ore/settimana\n- Ruolo: Data Analyst Intern\n- Azienda: Nordest Analytics Srl\n- Periodo: gennaio – giugno 2027\n- Lezioni da conciliare: lunedì–mercoledì mattina";
const iso=ms=>new Date(ms).toISOString(),NOW=Date.parse('2026-11-04T10:00:00Z');
test('?demo=1: only reviews created after page load (5 s skew) are shown, newest first; outside demo unchanged',async()=>{
 const rows=[{id:'old',subject:'old',status:'open',created_at:iso(NOW-60000)},{id:'a',subject:'a',status:'open',created_at:iso(NOW-4000)},{id:'b',subject:'b',status:'open',created_at:iso(NOW+30000)},{id:'nodate',subject:'n',status:'open'}];
 const demo=reviewQueue({admin:'t',search:'?demo=1',now:NOW,reply:()=>({status:200,body:{reviews:rows}})});demo.ctx.queue.push({id:'SO-2026-1042'});await demo.win.DOMContentLoaded();await flush();
 assert.deepEqual(demo.ctx.queue.map(t=>t.id),['b','a','SO-2026-1042']);assert.equal(demo.calls[0].body.include_test,true);
 demo.win['casey:review-created']({detail:{id:'c',subject:'c',status:'open',created_at:iso(NOW+60000)}});assert.equal(demo.ctx.queue[0].id,'c','new ticket on top');
 const plain=reviewQueue({admin:'t',now:NOW,reply:()=>({status:200,body:{reviews:rows}})});await plain.win.DOMContentLoaded();await flush();
 assert.equal(plain.ctx.queue.length,4);assert.equal(plain.calls[0].body.include_test,undefined);
});
test('draft template is built from the ticket lines and degrades gracefully',()=>{const w=reviewQueue();
 assert.equal(w.campusReviewDraft(STAGE),'Buongiorno Pietro,\n\nabbiamo ricevuto la tua richiesta per lo stage part-time (part-time · 20 ore/settimana) come Data Analyst Intern presso Nordest Analytics Srl, nel periodo gennaio – giugno 2027. Verificheremo la compatibilità con le lezioni (lunedì–mercoledì mattina) e ti risponderemo a breve. Per completare la valutazione inviaci la bozza del contratto.\n\nStudent Office');
 assert.equal(w.campusReviewDraft('solo domanda'),'Buongiorno,\n\nabbiamo ricevuto la tua richiesta per lo stage part-time. Verificheremo la compatibilità con le lezioni e ti risponderemo a breve. Per completare la valutazione inviaci la bozza del contratto.\n\nStudent Office');
 assert.ok(w.campusReviewDraft('x\n- Studente: Studente College').startsWith('Buongiorno,\n'));
});
test('real card editor: prefilled escaped draft and three actions only for staff',()=>{
 const t={id:ID,q:'s',question:STAGE.replace('Pietro','<b>Pietro</b>'),reviewStatus:'in_review'};const html=reviewQueue({admin:'t'}).renderCampusReview(t);
 assert.ok(html.includes('data-review-draft="'+ID+'"')&&html.includes('Buongiorno &lt;b&gt;Pietro&lt;/b&gt;,'));
 for(const l of ['Salva bozza','Invia risposta','Scarta la bozza'])assert.ok(html.includes('>'+l+'</button>'),l);assert.ok(html.includes('class="btn ok" data-review-send'));
 assert.ok(!reviewQueue().renderCampusReview(t).includes('textarea'),'no editor without staff token');
 assert.ok(reviewQueue({admin:'t'}).renderCampusReview({...t,staff_reply:'Gia salvata'}).includes('>Gia salvata</textarea>'),'server staff_reply wins');
 assert.ok(!reviewQueue({admin:'t'}).renderCampusReview({...t,reviewStatus:'resolved'}).includes('textarea'));
});
const click=(w,attr,id)=>w.doc.click({target:{closest:()=>({dataset:{[attr]:id},disabled:false})}});
test('save: update in_review with edited reply; disabled while in flight; result note',async()=>{let release;const gate=new Promise(r=>release=r);
 const w=reviewQueue({admin:'tok',reply:()=>({status:200,body:{saved:true}})});w.ctx.fetch=(f=>async(...a)=>{await gate;return f(...a);})(w.ctx.fetch);
 w.__caseyReviewQueue.upsert({id:ID,subject:'s',question:STAGE,status:'open',created_at:iso(NOW)});w.doc.input({target:{dataset:{reviewDraft:ID},value:'Testo modificato'}});
 click(w,'reviewSave',ID);assert.ok(w.renderCampusReview(w.ctx.queue[0]).includes('data-review-save="'+ID+'" disabled'),'disabled in flight');click(w,'reviewSend',ID);
 release();await flush();assert.equal(w.calls.length,1,'second click ignored while busy');
 assert.deepEqual(JSON.parse(JSON.stringify(w.calls[0])),{body:{action:'admin_service_review_update',id:ID,status:'in_review',staff_reply:'Testo modificato'},token:'tok'});
 const html=w.renderCampusReview(w.ctx.queue[0]);assert.ok(html.includes('Bozza salvata')&&html.includes('IN REVISIONE')&&!html.includes(' disabled'));
});
test('send: success shows recipient and RISOLTA; server error text is shown escaped',async()=>{
 const ok=reviewQueue({admin:'tok',reply:()=>({status:200,body:{sent:true,gmail_message_id:'m1',recipient:'pietro@example.com'}})});ok.__caseyReviewQueue.upsert({id:ID,subject:'s',question:STAGE,status:'in_review',created_at:iso(NOW)});
 click(ok,'reviewSend',ID);await flush();assert.equal(ok.calls[0].body.action,'admin_service_review_send');assert.equal(ok.calls[0].body.staff_reply,ok.campusReviewDraft(STAGE));
 const h=ok.renderCampusReview(ok.ctx.queue[0]);assert.ok(h.includes('Risposta inviata a pietro@example.com')&&h.includes('RISOLTA')&&!h.includes('textarea'));
 const bad=reviewQueue({admin:'tok',reply:()=>({status:422,body:{error:'Nessuna email <studente>'}})});bad.__caseyReviewQueue.upsert({id:ID2,subject:'s',question:'q',status:'in_review',created_at:iso(NOW)});
 click(bad,'reviewSend',ID2);await flush();const e=bad.renderCampusReview(bad.ctx.queue[0]);assert.ok(e.includes('Nessuna email &lt;studente&gt;')&&e.includes('IN REVISIONE')&&e.includes('textarea'));
});
test('discard resets the draft to the template without network; no action without staff token',async()=>{
 const w=reviewQueue({admin:'tok'});w.__caseyReviewQueue.upsert({id:ID,subject:'s',question:STAGE,status:'in_review',staff_reply:'vecchia',created_at:iso(NOW)});
 w.doc.input({target:{dataset:{reviewDraft:ID},value:'xx'}});click(w,'reviewReset',ID);assert.equal(w.calls.length,0);assert.ok(w.renderCampusReview(w.ctx.queue[0]).includes('>Buongiorno Pietro,'));
 const anon=reviewQueue();anon.__caseyReviewQueue.upsert({id:ID,subject:'s',question:STAGE,status:'open',created_at:iso(NOW)});click(anon,'reviewSend',ID);await flush();assert.equal(anon.calls.length,0);
});
test('fixtures: realistic unique practice numbers, every one with a draft, no demo wording visible',()=>{
 for(const S of ['COLLEGE','CAMPUS']){const {ctx,box}=workspace(S);for(const t of ctx.queue){assert.match(t.id,/^(SO|CS)-2026-\d{4}$/);assert.ok(t.draft.trim().length>40,t.id);}
  const visible=JSON.stringify([ctx.queue.map(({id,who,to,q,rule,lvlTxt,draft,details})=>({id,who,to,q,rule,lvlTxt,draft,details})),ctx.mailOffice.map(({from,to,subj,body})=>({from,to,subj,body})),ctx.mailPerson.map(({from,to,subj,body})=>({from,to,subj,body})),ctx.feed.map(({so,q,out})=>({so,q,out}))]);
  assert.doesNotMatch(visible,/demo|dimostrativ|fixture/i,S);ctx.window.renderQueue();ctx.window.renderMail();ctx.window.renderFeed();assert.doesNotMatch(box.children.map(n=>n.textContent).join(' '),/demo|dimostrativ|fixture/i);}
});
test('fixture approval stays local: toast says draft saved, never sent; no student mail entry',()=>{const {ctx}=workspace('COLLEGE');const toasts=[];ctx.toast=(a,b)=>toasts.push([a,b]);
 ctx.approve=i=>{ctx.mailPerson.unshift({demo:true,subj:'Bozza approvata — pratica '+ctx.queue[i].id});ctx.toast('Bozza approvata','Salvata nella demo.');};vm.runInContext(read('demo-workspace.js'),ctx);
 const before=ctx.mailPerson.length;ctx.window.approve(0);assert.deepEqual(toasts,[['Bozza approvata','Bozza salvata. Nessuna email è stata inviata.']]);assert.equal(ctx.mailPerson.length,before);
});
