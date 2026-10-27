import sys,json,uuid,hashlib,concurrent.futures,time,pathlib
import os,subprocess
REF=os.environ.get('CASEY_BETA_TEST_PROJECT','')
if REF!='sneaxpqnmlhnrhoautjx':raise SystemExit('This verification runs only against the isolated Preview project')
KEY=os.environ['SUPABASE_SERVICE_ROLE_KEY']
results=[]
def rest(env,path,payload):
 cfg={'url':'https://'+REF+'.supabase.co/rest/v1/'+path,'request':'POST','header':['Content-Type: application/json','apikey: '+KEY,'Authorization: Bearer '+KEY],'data':json.dumps(payload),'write-out':'\n%{http_code}'}
 # Secret is passed on stdin, never in command arguments or output.
 text='\n'.join(k+' = '+json.dumps(vv) for k,v in cfg.items() for vv in (v if isinstance(v,list) else [v]))
 r=subprocess.run(['curl','--silent','--show-error','--retry','3','--retry-all-errors','--config','-'],input=text.encode(),capture_output=True,check=True)
 body,_,status=r.stdout.rpartition(b'\n');return int(status),json.loads(body)
ENV='preview'

def rpc(token,action,rid=None,payload=None):
 status,d=rest(ENV,'rpc/casey_beta_access',{'p_hash':hashlib.sha256(token.encode()).hexdigest(),'p_action':action,'p_request':rid,'p_payload':payload or {},'p_user':None})
 assert status==200,(status,d)
 return d

def check(name,passed,details=None):
 results.append({'name':name,'passed':bool(passed),'details':details});print(name,'PASS' if passed else 'FAIL',flush=True);assert passed,details

def create():
 token=str(uuid.uuid4())+str(uuid.uuid4());d=rpc(token,'create');assert 'id'in d,d;return token

a,b=create(),create();rid=str(uuid.uuid4());reserved=rpc(a,'text',rid,{'message':'test isolated transcript'});check('reservation',not reserved.get('error'))
check('cross-visitor request replay denied',rpc(b,'text',rid,{'message':'test'})['error']=='unauthorized')
check('guest cannot link a client supplied identity',rpc(a,'link').get('error')=='unauthorized')
check('guest cannot list account chats',rpc(a,'list').get('error')=='unauthorized')
check('single in-flight text per guest',rpc(a,'text',str(uuid.uuid4()),{'message':'test'}).get('error')=='busy')
rpc(a,'finish',rid,{'answer':'test answer','citations':[]});check('private history stored',len(rpc(a,'state')['context'])==2)
check('other guest sees no history',rpc(b,'state')['context']==[])
check('request idempotency',rpc(a,'text',rid).get('result',{}).get('answer')=='test answer')
for i in range(19):
 rid=str(uuid.uuid4());assert not rpc(a,'text',rid,{'message':'quota probe'}).get('error');rpc(a,'finish',rid,{'answer':'test'})
check('20 questions enforced server-side',rpc(a,'text',str(uuid.uuid4()),{'message':'21st'}).get('error')=='text_limit')
for burst in [5,10,20,50]:
 tokens=[create() for i in range(burst)];ids=[str(uuid.uuid4()) for i in tokens];started=time.monotonic()
 def reserve(x):t,i=x;return rpc(t,'text',i,{'message':'concurrent admission probe'})
 with concurrent.futures.ThreadPoolExecutor(max_workers=burst) as pool:rows=list(pool.map(reserve,zip(tokens,ids)))
 accepted=sum('error' not in d for d in rows);check(str(burst)+' concurrent requests bounded',accepted==min(burst,10),{'accepted':accepted,'rejected':burst-accepted,'seconds':round(time.monotonic()-started,2)})
 for t,i,d in zip(tokens,ids,rows):
  if 'error' not in d:rpc(t,'finish',i,{'answer':'test'})
voices=[create() for i in range(6)];leases=[]
for t in voices:leases.append(rpc(t,'voice',str(uuid.uuid4())))
check('voice concurrent cap',sum('error'not in x for x in leases)==5 and leases[-1].get('error')=='capacity')
abort_id=leases[0]['request_id'];rpc(voices[0],'voice_abort',abort_id);check('provider failure refunds reserved time',rpc(voices[0],'state')['voice_seconds_remaining']==300)
check('voice daily allowance reserved',rpc(voices[1],'state')['voice_seconds_remaining']==0)
check('text fallback remains usable with voice slot reserved',not rpc(voices[0],'text',str(uuid.uuid4()),{'message':'fallback'}).get('error'))
pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'beta-database-results.json').write_text(json.dumps(results,indent=2))
