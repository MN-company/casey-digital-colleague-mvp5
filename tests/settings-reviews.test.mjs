import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const read=f=>fs.readFileSync(new URL('../'+f,import.meta.url),'utf8');
const flush=async(n=10)=>{for(let i=0;i<n;i++)await new Promise(r=>setImmediate(r));};
function el(tag){const n={tag,className:'',textContent:'',value:'',children:[],attrs:{},ev:{},disabled:false,
 append(...x){n.children.push(...x);},replaceChildren(...x){n.children=[...x];},setAttribute(k,v){n.attrs[k]=v;},addEventListener(e,f){n.ev[e]=f;}};return n;}
const text=n=>typeof n==='string'?n:(n.textContent||'')+n.children.map(text).join(' ');
const find=(n,f)=>typeof n==='string'?null:f(n)?n:n.children.map(c=>find(c,f)).find(Boolean)||null;
function load({reviews,replies={},confirmed=true}){const calls=[],asked=[],w={};vm.runInNewContext(read('settings-reviews.js'),{window:w,document:{createElement:el},Intl,Date});
 const call=async(action,body)=>{calls.push({action,...body});if(action==='admin_service_reviews')return {reviews:reviews()};const r=replies[action];if(r instanceof Error)throw r;return r;};
 const box=el('div'),api=w.CaseyServiceReviews.mount(box,{call,ask:m=>{asked.push(m);return confirmed;}});return {api,box,calls,asked};}
const ROW={id:'r1',subject:'Internship: <b>x</b>',question:'Prima riga\n- Email: a@b.it',status:'in_review',staff_reply:'Ciao',created_at:'2026-11-04T08:12:00Z',is_test:true};
test('settings list: include_test, Rome time, status, first line, test badge; textContent only',async()=>{const f=load({reviews:()=>[ROW]});await f.api.load();
 assert.deepEqual(f.calls,[{action:'admin_service_reviews',include_test:true}]);const t=text(f.box);
 for(const s of ['Internship: <b>x</b>','4 nov 2026','09:12','In revisione','Prima riga','test'])assert.ok(t.includes(s),s);assert.ok(!t.includes('Email:'));
 assert.ok(!read('settings-reviews.js').includes('innerHTML'));assert.equal(find(f.box,n=>n.tag==='select').value,'in_review');assert.equal(find(f.box,n=>n.tag==='textarea').value,'Ciao');
});
test('settings save sends status + reply and refreshes; errors inline',async()=>{const f=load({reviews:()=>[ROW],replies:{admin_service_review_update:{saved:true}}});await f.api.load();
 find(f.box,n=>n.tag==='select').value='closed';find(f.box,n=>n.tag==='textarea').value='Chiusa';await find(f.box,n=>n.textContent==='Salva').ev.click();await flush();
 assert.deepEqual(f.calls[1],{action:'admin_service_review_update',id:'r1',status:'closed',staff_reply:'Chiusa'});assert.equal(f.calls[2].action,'admin_service_reviews');
 const g=load({reviews:()=>[ROW],replies:{admin_service_review_update:Error('Non autorizzato')}});await g.api.load();await find(g.box,n=>n.textContent==='Salva').ev.click();
 assert.ok(text(g.box).includes('Errore: Non autorizzato'));assert.equal(find(g.box,n=>n.textContent==='Salva').disabled,false);
});
test('settings delete asks confirm(); cancel makes no call, confirm deletes and refreshes',async()=>{let rows=[ROW];
 const no=load({reviews:()=>rows,confirmed:false});await no.api.load();await find(no.box,n=>n.textContent==='Elimina').ev.click();assert.deepEqual(no.asked,['Eliminare definitivamente questa richiesta?']);assert.equal(no.calls.length,1);
 const yes=load({reviews:()=>rows,replies:{admin_service_review_delete:{deleted:true}}});await yes.api.load();rows=[];await find(yes.box,n=>n.textContent==='Elimina').ev.click();await flush();
 assert.deepEqual(yes.calls[1],{action:'admin_service_review_delete',id:'r1'});assert.ok(text(yes.box).includes('Nessuna richiesta Student Office.'));
});
test('settings list failure is shown inline; section present in settings.html',async()=>{const w={};vm.runInNewContext(read('settings-reviews.js'),{window:w,document:{createElement:el},Intl,Date});const box=el('div');
 await w.CaseyServiceReviews.mount(box,{call:async()=>{throw Error('offline');}}).load();assert.ok(text(box).includes('Richieste non disponibili: offline'));
 const html=read('settings.html');assert.ok(html.includes('Richieste Student Office')&&html.includes('id="reviewList"')&&html.includes('settings-reviews.js'));
});
