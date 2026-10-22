"""Real shared-project integration checks; touches hf6_/hf7_ demo data only."""
import json,os,ssl,certifi,urllib.request,urllib.error,concurrent.futures,datetime
BASE='https://oxzraaadxqsruibinlxn.supabase.co';ORIGIN=os.environ.get('CASEY_HANDOFF_ORIGIN','http://127.0.0.1:4173')
keys=json.load(open(os.environ['CASEY_HANDOFF_KEYS']));accounts=json.load(open(os.environ['CASEY_HANDOFF_ACCOUNTS']))[1:]
ANON=next(x['api_key'] for x in keys if x['name']=='anon');SERVICE=next(x['api_key'] for x in keys if x['name']=='service_role');ctx=ssl.create_default_context(cafile=certifi.where());passed=[]
def req(path,body=None,headers={},method=None):
 r=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers={'apikey':ANON,'Content-Type':'application/json','Origin':ORIGIN,**headers},method=method)
 try:
  with urllib.request.urlopen(r,context=ctx,timeout=40) as v:
   raw=v.read();return v.status,json.loads(raw) if raw else None
 except urllib.error.HTTPError as e:
  raw=e.read();return e.code,json.loads(raw) if raw else None

def check(name,value):
 assert value,name
 passed.append(name);print('PASS',name,flush=True)
def api(action,body={},session='',auth=''):return req('/functions/v1/casey-handoff',{'action':action,**body},{'x-session-token':session,'x-student-token':auth})
def login(a):
 s,d=req('/auth/v1/token?grant_type=password',{'email':a['email'],'password':a['password']});assert s==200;return d['access_token']
def issue(context):
 s,d=api('issue',{'context':context},session=source);assert s==200,(s,d);return d
s,d=req('/functions/v1/casey-handoff-ui',{'action':'session'});check('Dedicated kiosk session',s==200);source=d['token'];one=login(accounts[0]);two=login(accounts[1])
context=[{'role':'user' if i%2==0 else 'assistant','text':'Messaggio '+str(i)+' - Aurora nel contesto completo'} for i in range(40)]
link=issue(context);check('Issue QR without matricola',bool(link['token']))
check('Login still required on phone',api('claim',{'token':link['token']})[0]==401)
s,d=api('claim',{'token':link['token']},auth=one);check('Any signed-in recipient can claim',s==200);phone=d['session_token'];chat=d['chat_id'];version=d['version']
check('All 40 messages transferred without truncation',d['context']==context)
check('Replay denied',api('claim',{'token':link['token']},auth=two)[0]==409)
check('Kiosk sees successful acquisition',api('status',{'id':link['id']},session=source)[1]['consumed'])
check('Other account cannot load chat',api('load',{'chat_id':chat},session=phone,auth=two)[0]==404)
check('Anonymous cannot read QR links',req('/rest/v1/hf7_links?select=*')[0] in (401,403))
s,rows=req('/rest/v1/hf7_chats?select=id',headers={'Authorization':'Bearer '+two});check('RLS excludes other owner',s==200 and all(x['id']!=chat for x in rows))
check('Auth role cannot call claim RPC',req('/rest/v1/rpc/hf7_claim',{'p_hash':'a'*64,'p_user':accounts[1]['id'],'p_session_hash':'b'*64},{'Authorization':'Bearer '+two})[0] in (401,403,404))
new=context+[{'role':'user','text':'Quale nome compare nei messaggi precedenti? Ripeti Aurora.'}]
s,d=api('save',{'chat_id':chat,'context':new,'version':version},session=phone,auth=one);check('Full conversation saved',s==200);version=d['version']
check('Stale concurrent save rejected',api('save',{'chat_id':chat,'context':[],'version':version-1},session=phone,auth=one)[0]!=200)
check('Reload preserves entire chat',api('load',{'chat_id':chat},session=phone,auth=one)[1]['context']==new)
s,d=api('chat_turn',{'chat_id':chat},session=phone,auth=one)
if s==200:check('Real Gemini text recalls imported history','Aurora' in d['answer'])
else:print('BLOCKED Gemini text:',s,d.get('error'),flush=True)
link=issue([{'role':'user','text':'Seconda chat'}]);s,second=api('claim',{'token':link['token']},auth=one);check('Second chat has a different ID',s==200 and second['chat_id']!=chat)
s,d=api('restore',{'chat_id':chat},auth=one);check('Original chat remains restorable',s==200 and d['context']==new);phone=d['session_token']
first=issue(context);second=issue(context);check('Regeneration invalidates old QR',api('claim',{'token':first['token']},auth=one)[0]==409)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results=list(pool.map(lambda a:api('claim',{'token':second['token']},auth=a),[one,two]))
check('Concurrent scans have one owner',sorted(x[0] for x in results)==[200,409])
link=issue(context);check('Cancel restores kiosk without transferring',api('cancel',{'id':link['id']},session=source)[0]==200 and api('claim',{'token':link['token']},auth=one)[0]==409)
link=issue(context);past=(datetime.datetime.now(datetime.timezone.utc)-datetime.timedelta(seconds=1)).isoformat();s,_=req('/rest/v1/hf7_links?id=eq.'+link['id'],{'expires_at':past},{'apikey':SERVICE,'Authorization':'Bearer '+SERVICE,'Prefer':'return=representation'},'PATCH');assert s==200
check('Expired QR cannot claim',api('claim',{'token':link['token']},auth=one)[0]==409)
s,d=req('/functions/v1/casey-handoff-live',{'language':'it-IT'},{'x-session-token':phone,'x-student-token':one});check('Google issues Live token with existing secrets',s==200 and bool(d.get('token')))
check('Clear only own chat',api('clear',{'chat_id':chat},session=phone,auth=one)[0]==200)
check('Cleared chat gone',api('load',{'chat_id':chat},session=phone,auth=one)[0]==404)
print('Passed:',len(passed),flush=True)
