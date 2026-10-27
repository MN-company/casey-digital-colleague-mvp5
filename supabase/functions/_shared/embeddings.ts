/** One embedding space for document ingestion and live queries; never exposed to clients. */
export const EMBEDDING_MODEL='gemini-embedding-2';
export const EMBEDDING_TAG='gemini-embedding-2-768';
export const EMBEDDING_DIMENSIONS=768;
export function normalizedVector(values:unknown):number[]{
 if(!Array.isArray(values)||values.length!==EMBEDDING_DIMENSIONS||values.some(x=>typeof x!=='number'||!Number.isFinite(x)))throw Error('Invalid embedding');
 const norm=Math.hypot(...values);if(norm<1e-9)throw Error('Empty embedding');
 return values.map(x=>x/norm);
}
export async function embedTexts(texts:string[],task:'RETRIEVAL_QUERY'|'RETRIEVAL_DOCUMENT'):Promise<number[][]>{
 const key=Deno.env.get('GEMINI_API_KEY');if(!key)throw Error('Embedding provider unavailable');
 if(!texts.length||texts.length>100)throw Error('Invalid embedding batch');
 const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents`,{
  method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
  body:JSON.stringify({requests:texts.map(text=>({model:'models/'+EMBEDDING_MODEL,content:{parts:[{text:(task==='RETRIEVAL_QUERY'?'task: search result | query: ':'title: none | text: ')+text.slice(0,7000)}]},outputDimensionality:EMBEDDING_DIMENSIONS}))}),
  signal:AbortSignal.timeout(task==='RETRIEVAL_QUERY'?7000:45000)
 });
 if(!r.ok){const error=await r.json().catch(()=>({}));const reason=String(error.error?.message||'request rejected').replaceAll(key,'[redacted]').slice(0,240);throw Object.assign(Error('Embedding provider '+r.status+': '+reason),{status:r.status});}
 const data=await r.json();if(data.embeddings?.length!==texts.length)throw Error('Incomplete embedding batch');
 return data.embeddings.map((x:any)=>normalizedVector(x.values));
}
const queryCache=new Map<string,{vector:number[],expires:number}>();
export async function queryVector(query:string):Promise<number[]|null>{
 if(!Deno.env.get('GEMINI_API_KEY'))return null;
 const hit=queryCache.get(query);if(hit&&hit.expires>Date.now())return hit.vector;
 try{const [vector]=await embedTexts([query],'RETRIEVAL_QUERY');
  if(queryCache.size>=200)queryCache.delete(queryCache.keys().next().value!);
  queryCache.set(query,{vector,expires:Date.now()+300000});return vector;
 }catch{return null;} // Lexical retrieval remains available during provider outages.
}
