/** Course names select public source context; they never authenticate a student. */
const clean=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const COURSES=[
 {program:'DIGITAL_MANAGEMENT',institution:'CAFOSCARI',label:'Digital Management',aliases:['digital management','bsc dm','corso dm','per dm']},
 {program:'AI_DATA_SCIENCE',institution:'CICC',label:'AI & Data Science',aliases:['ai data science','artificial intelligence data science','bsc ai']},
 {program:'AI_SPORTS_MANAGEMENT',institution:'CICC',label:'AI & Sports Management',aliases:['ai sports management','sports management']},
 {program:'BUSINESS_CREATION_ENTREPRENEURSHIP',institution:'CICC',label:'Business Creation & Entrepreneurship',aliases:['business creation entrepreneurship','bsc bce']},
 {program:'DIGITAL_ECONOMICS_FINANCE',institution:'CICC',label:'Digital Economics & Finance',aliases:['digital economics finance','bsc def']},
 {program:'INTERNATIONAL_BUSINESS_STUDIES',institution:'CICC',label:'International Business Studies',aliases:['international business studies','bsc ibs']},
 {program:'MARKETING_GLOBAL_COMMERCE',institution:'CICC',label:'Marketing & Global Commerce',aliases:['marketing global commerce','bsc mgc']},
 {program:'SOFTWARE_CLOUD_ARCHITECTURE_AI',institution:'CICC',label:'Software & Cloud Architecture with AI',aliases:['software cloud architecture','bsc sca']},
 {program:'FOUNDATION_YEAR',institution:'CICC',label:'Foundation Year',aliases:['foundation year']},
 {program:'AI_BUSINESS_TRANSFORMATION',institution:'CICC',label:'AI for Business Transformation',aliases:['ai for business transformation','ai business transformation','aibt']},
 {program:'DIGITAL_MARKETING_DATA_ANALYTICS',institution:'CICC',label:'Digital Marketing & Data Analytics',aliases:['digital marketing data analytics','d m d a','dmda']},
 {program:'ENTREPRENEURSHIP_STARTUP_INNOVATION',institution:'CICC',label:'Entrepreneurship, Start Up & Innovation',aliases:['entrepreneurship start up innovation','entrepreneurship startup innovation','msc esi']},
 {program:'DESIGN_COMMUNICATION',institution:'CICC',label:'Design & Communication',aliases:['design communication','design e comunicazione','msc m8']},
 {program:'INTERNATIONAL_BUSINESS',institution:'CICC',label:'International Business',aliases:['international business','msc mib']},
] as const;
export function namedCourse(text:string){
 const q=clean(text);
 const short:Record<string,string>={dm:'DIGITAL_MANAGEMENT',ai:'AI_DATA_SCIENCE',bce:'BUSINESS_CREATION_ENTREPRENEURSHIP',def:'DIGITAL_ECONOMICS_FINANCE',ibs:'INTERNATIONAL_BUSINESS_STUDIES',mgc:'MARKETING_GLOBAL_COMMERCE',sca:'SOFTWARE_CLOUD_ARCHITECTURE_AI',esi:'ENTREPRENEURSHIP_STARTUP_INNOVATION',mib:'INTERNATIONAL_BUSINESS'};
 const shortName=/\b(?:corso|studio) ai$/.test(q)?'AI_DATA_SCIENCE':short[q];
 const exact=COURSES.find(c=>clean(c.program)===q||shortName===c.program);if(exact)return exact;
 const ranked=COURSES.map(c=>({c,score:Math.max(0,...c.aliases.filter(a=>(' '+q+' ').includes(' '+a+' ')).map(a=>a.length))})).filter(x=>x.score).sort((a,b)=>b.score-a.score);
 if(!ranked.length)return null;
 // A longer full name wins over its generic prefix, never over a different named course.
 const first=ranked[0];if(ranked.slice(1).some(x=>!first.c.aliases.some(a=>x.c.aliases.some(b=>a.includes(b)))&&x.score))return null;
 return first.c;
}
export function knowledgeScope(profile:any,turns:any[]=[]){
 const institution=String(profile?.institution||'').toUpperCase().replace(/[^A-Z]/g,'');
 const rosterPool=['CAFOSCARI','CAFOSCARIUNIVERSITY'].includes(institution)?'CAFOSCARI':['CICC','CHICHESTER','UNIVERSITYOFCHICHESTER'].includes(institution)?'CICC':'SHARED';
 const course=namedCourse(String(profile?.program||''));
 if(course&&rosterPool===course.institution)return {institution:rosterPool,program:course.program,label:course.label,source:'roster'};
 for(const t of turns.slice(-10).reverse()){
  if(t.role!=='user')continue;
  const named=namedCourse(String(t.text||''));
  if(named&&(rosterPool==='SHARED'||rosterPool===named.institution))return {institution:named.institution,program:named.program,label:named.label,source:'question'};
 }
 return {institution:rosterPool,program:null,label:null,source:'shared'};
}
export function needsCourse(query:string,scope:any){
 return !scope.program&&/\b(esam\w*|exam\w*|assessment|resit|vot[oi]|marks?|grades?|superamento|pass(?:ing)?|calendario accademico|academic calendar|curriculum|piano di studi|tesi|dissertation|thesis|crediti formativi)\b/i.test(query);
}

export function courseLevel(program:string|null){
 if(program==='FOUNDATION_YEAR')return 'foundation';
 return COURSES.slice(9).some(c=>c.program===program)?'master':program?'bachelor':null;
}
