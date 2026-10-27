/** Public, source-backed acceptance. Creates one temporary kiosk session, no bookings. */
import {mkdir,writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
const project=process.argv[2];
if(!['preview','production'].includes(project))throw Error('Choose preview or production explicitly');
const ref=project==='production'?'oxzraaadxqsruibinlxn':'sneaxpqnmlhnrhoautjx';
const url=`https://${ref}.supabase.co/functions/v1/casey-definitivo-ui`;
const output=process.argv[3]||'results/cloud-evaluation.json';
const courseCases=[
 ['AI & Data Science','40'],['AI & Sports Management','40'],
 ['Business Creation & Entrepreneurship','40'],['Digital Economics & Finance','40'],
 ['International Business Studies','40'],['Marketing & Global Commerce','40'],
 ['Software & Cloud Architecture with AI','40'],['Foundation Year','40'],
 ['AI for Business Transformation','50'],['Digital Marketing & Data Analytics','50'],
 ['Entrepreneurship, Start Up & Innovation','50'],['Design & Communication','50'],['International Business','50']
].map(([course,pass])=>({name:course,query:`Qual è il voto minimo per superare un esame nel corso ${course}?`,pattern:pass,source:course}));
const cases=[
 {name:'printing',query:'Come posso stampare in campus?',pattern:'badge|stampant|Welcome',source:'servizi campus'},
 {name:'credit',query:'Dove acquisto i crediti per stampare in campus?',pattern:'Welcome',source:'servizi campus'},
 {name:'library',query:'Posso mangiare in biblioteca?',pattern:'non|vietato|bistrot'},
 {name:'dm_curriculum',query:'Nel corso Digital Management è previsto Mathematics for Decision Sciences?',pattern:'Mathematics|previst|sì',source:'Digital Management'},
 {name:'choose_course',query:'Qual è il voto minimo per superare un esame?',mode:'course_clarification'},
 {name:'course_followup',query:'DMDA',history:[{role:'user',text:'Quanto serve per superare un esame?'},{role:'assistant',text:'A quale corso si riferisce la domanda?'}],pattern:'50',source:'Digital Marketing'},
 {name:'private_records',query:'Quali sono i miei voti personali?',mode:'operation_guidance'},
 {name:'unknown_future_deadline',query:'Qual è la data esatta del tirocinio nel 2029 per Digital Management?',unsupported:true},
 {name:'unknown_course',query:'Qual è il regolamento degli esami di Astrofisica Quantistica del campus?',mode:'course_clarification'},
 ...courseCases,
 {name:'printing_english',query:'Where can I buy printing credit on campus?',language:'en-US',pattern:'Welcome',source:'servizi campus'},
 {name:'undergraduate_spanish',query:'¿Cuál es la nota mínima para aprobar un examen de AI & Data Science?',language:'es-ES',pattern:'40',source:'AI & Data Science'}
];
async function call(body,token){
 const started=Date.now();
 const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://casey-digital-colleague-live.vercel.app',...(token?{'x-session-token':token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
 return {status:r.status,seconds:(Date.now()-started)/1000,response:await r.json()};
}
const session=await call({action:'session'});if(session.status!==200||!session.response.token)throw Error('Session unavailable');
const results=[];
const normal=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
for(const c of cases){
 const result=await call({action:'turn',message:c.query,history:c.history||[],language:c.language||'it-IT'},session.response.token);
 const d=result.response;
 let passed=result.status===200;
 if(c.mode)passed&&=d.mode===c.mode;
 else if(c.unsupported)passed&&=['clarification','course_clarification','no_source'].includes(d.mode)||/non|conferm|disponibil|verificat/i.test(d.answer||'');
 else{
  passed&&=d.mode==='llm'&&!!d.citations?.length&&new RegExp(c.pattern,'i').test(d.answer||'')&&d.retrieval==='hybrid';
  if(c.source)passed&&=d.citations?.some(x=>normal(x.title).includes(normal(c.source)));
 }
 results.push({name:c.name,passed,...result});
 await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify({project,results},null,2));
 console.log(c.name,passed?'PASS':'FAIL',d.mode,d.retrieval||'');
 await new Promise(resolve=>setTimeout(resolve,1000));
}
console.log(`${results.filter(x=>x.passed).length}/${results.length} passed`);
if(results.some(x=>!x.passed))process.exitCode=1;
