"""Opt-in shared-project integration checks. Uses QA Auth accounts and real Calendar reads; never commits bookings."""
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

s,d=api('session');check('Independent transport session',s==200);source=d['session_token'];one=login(accounts[0]);two=login(accounts[1]);context=[{'role':'user','text':'Prenota martedì alle 15'},{'role':'user','text':'No, venerdì alle 16'},{'role':'user','text':'Annulla la prenotazione'}]
link=issue(context);attempt='a'*64
s,d=api('claim',{'token':link['token'],'attempt':attempt},auth=one);check('Recoverable claim',s==200);phone=d['session_token'];chat=d['chat_id']
s,recovered=api('claim',{'token':link['token'],'attempt':attempt},auth=one);check('Lost acknowledgement recovers same chat',s==200 and recovered['chat_id']==chat)
check('Different attempt cannot replay',api('claim',{'token':link['token'],'attempt':'b'*64},auth=one)[0]==409)
check('Different owner cannot recover',api('claim',{'token':link['token'],'attempt':attempt},auth=two)[0]==409)
s,library=api('list',auth=one);check('Library finds chat without local ID',s==200 and any(c['id']==chat for c in library['chats']));check('Other owner library excludes chat',all(c['id']!=chat for c in api('list',auth=two)[1]['chats']))
s,restored=api('restore',{'chat_id':chat},auth=one);check('Second device restores',s==200);second=restored['session_token'];check('First device remains connected',api('load',{'chat_id':chat},session=phone,auth=one)[0]==200)
s,saved=api('save',{'chat_id':chat,'context':context+[{'id':'phone-one','role':'user','text':'Telefono uno'}],'version':0},session=phone,auth=one);check('First device saves',s==200)
check('Stale second device gets structured conflict',api('save',{'chat_id':chat,'context':context,'version':0},session=second,auth=one)[0]==409)
s,loaded=api('load',{'chat_id':chat},session=second,auth=one);check('Second device sees new messages',s==200 and loaded['context'][-1]['id']=='phone-one')
s,profile=api('operation',{'chat_id':chat,'operation':'profile'},session=phone,auth=one);check('Existing backend verifies identity without QA roster privileges',s==200 and profile['profile']['authenticated'] and not profile['profile']['registered'])
s,slots=api('operation',{'chat_id':chat,'operation':'slots'},session=phone,auth=one);check('Real Calendar read is connected or explicitly unavailable',s==200 and isinstance(slots.get('calendar_connected'),bool));print('Calendar connected:',slots.get('calendar_connected'),'verified slots:',len(slots.get('slots',[])),flush=True)
s,d=api('operation',{'chat_id':chat,'operation':'prepare','slot_id':'00000000-0000-4000-8000-000000000001'},session=phone,auth=one);check('Demo account cannot prepare real booking',s in (401,403,500))
check('Model-like commit without draft denied',api('operation',{'chat_id':chat,'operation':'commit'},session=phone,auth=one)[0] in (400,403,404))
check('Other account cannot invoke operations',api('operation',{'chat_id':chat,'operation':'slots'},session=phone,auth=two)[0]==404)
check('QA cleanup',api('clear',{'chat_id':chat},session=phone,auth=one)[0]==200)
print('Passed:',len(passed),flush=True)
