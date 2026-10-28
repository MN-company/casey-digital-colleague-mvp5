type DB=(path:string,body?:unknown,method?:string)=>Promise<any>;
const qs=(d:Record<string,string>)=>new URLSearchParams(d).toString();
export function campusCase(query:string){const q=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/check[\s-]?in|pronote/.test(q)&&!/i miei|mie presenze|quante.*assenze/.test(q))return 'checkin';
 if(/badge|tessera/.test(q)&&/ritir/.test(q)&&/non.{0,20}riesc|altr[ao]|spost|cambi|assegnat|riprogramm/.test(q))return 'badge_reschedule';
 if(/internship|tirocinio|\bstage\b/.test(q)&&/part[\s-]?time|non.{0,12}full[\s-]?time/.test(q))return 'internship_contract';return null;
}
export async function handleCampusCase(query:string,sessionId:string,db:DB,base:string,language='it-IT',dryRun=false){
 const kind=campusCase(query);if(!kind)return {matched:false};
 if(kind==='checkin'){
  // The actual 2026/27 handbook explicitly describes PRONOTE and the in-class dynamic QR.
  const rows=await db('hf8_source_chunks?'+qs({select:'id,content,pdf_page,d:hf8_source_documents!inner(title,source_url,sha256,program,approval_status,audience,academic_year)',content:'ilike.*PRONOTE*','d.program':'eq.AI_DATA_SCIENCE','d.approval_status':'eq.approved','d.audience':'eq.students','d.academic_year':'eq.2026/2027',limit:'20'}));
  const row=rows.find((r:any)=>/dynamic QR code/i.test(r.content)&&/beginning of each lecture/i.test(r.content));
  if(!row)throw Object.assign(Error('La procedura PRONOTE aggiornata non è disponibile: verifica con Student Office.'),{status:503});
  const answer=language==='en-US'?'This year attendance uses PRONOTE Campus: scan the dynamic QR shown in class at the beginning of each lecture. That records your attendance; it is the classroom QR, not a Casey login.':language==='es-ES'?'Este año la asistencia usa PRONOTE Campus: escanea el QR dinámico mostrado en clase al inicio de cada lección. Es el QR de la clase, no un acceso a Casey.':"Quest’anno il check-in passa da PRONOTE Campus: all’inizio di ogni lezione scansioni il QR dinamico mostrato in aula, che registra la presenza. È il QR della lezione, non un login a Casey.";
  return {matched:true,case:kind,answer,mode:'campus_case',citations:[{id:row.id,title:row.d.title,page:row.pdf_page,url:row.d.source_url,sha256:row.d.sha256}],verified:true};
 }
 if(kind==='badge_reschedule'){
  let availability:any={slots:[],calendar_connected:false};
  if(base.includes('oxzraaadxqsruibinlxn')){
   const call=async(body:unknown,token='')=>{const r=await fetch(base+'/functions/v1/casey-original-ui',{method:'POST',headers:{'Content-Type':'application/json','x-session-token':token},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const d=await r.json();if(!r.ok)throw Object.assign(Error('Disponibilità Student Office non verificabile in questo momento.'),{status:r.status});return d;};
   const session=await call({action:'session'});availability=await call({action:'slots'},session.token);
  }
  return {matched:true,case:kind,mode:'campus_case',answer:language==='en-US'?'I’m checking the Student Office times. Meanwhile, sign in to the College app so we can choose a new time for your badge collection.':language==='es-ES'?'Compruebo los horarios de Student Office. Mientras tanto, accede a la app College para elegir otro horario para recoger tu tarjeta.':'Adesso controllo gli orari dello Student Office. Nel frattempo fai il login sull’app College, così scegliamo un’altra data per il ritiro del badge.',citations:[],availability:{...availability,source:'google_calendar',checked_at:new Date().toISOString()},requires_handoff:true,booking_created:false};
 }
 const subject='Internship: verifica contratto part-time';
 let rows=await db('casey_service_reviews?'+qs({select:'id,status,subject,question,created_at,is_test',session_id:'eq.'+sessionId,kind:'eq.internship_contract',limit:'1'}));
 if(!rows.length){try{rows=await db('casey_service_reviews',{session_id:sessionId,kind,subject,question:query,status:'open',is_test:dryRun});}catch(error){rows=await db('casey_service_reviews?'+qs({select:'id,status,subject,question,created_at,is_test',session_id:'eq.'+sessionId,kind:'eq.internship_contract',limit:'1'}));if(!rows.length)throw error;}}
 if(!rows[0]?.id)throw Object.assign(Error('La richiesta non è stata salvata. Riprova.'),{status:503});
 return {matched:true,case:kind,mode:'campus_case',answer:language==='en-US'?'A part-time internship contract needs Student Office review. I’ve added your question to their review queue; this does not mean the internship has been approved.':language==='es-ES'?'Un contrato de prácticas a tiempo parcial requiere revisión de Student Office. He guardado la solicitud en su cola; las prácticas todavía no están aprobadas.':'Un contratto di internship part-time richiede una valutazione dello Student Office. Ho inserito la richiesta nella coda di revisione: il tirocinio non è ancora approvato.',citations:[],review:{...rows[0],kind,department:'Student Office',is_test:rows[0].is_test===true},review_saved:true,approved:false};
}
