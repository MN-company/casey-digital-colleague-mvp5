create or replace function public.casey_beta_access(p_hash text,p_action text,p_request uuid default null,p_payload jsonb default '{}',p_user uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.casey_beta_visitors; s public.casey_beta_settings; r public.casey_beta_requests; u public.casey_beta_usage;
 g public.casey_beta_usage; who text; seconds integer; active integer; item jsonb; newly_linked boolean := false;
begin
 -- Atomic quotas and leases across all Edge isolates; no process-local counters.
 perform pg_catalog.pg_advisory_xact_lock(27102026,601);
 select * into s from public.casey_beta_settings where id=true;
 if s.demo_until>now() then
  s.text_per_day:=2000000000; s.voice_seconds_per_day:=2000000000;
  s.global_text_per_day:=2000000000; s.global_voice_seconds_per_day:=2000000000;
  s.max_text:=500; s.max_voice:=100;
 end if;
 if p_action='config' then return jsonb_build_object('enabled',s.enabled,'text_limit',s.text_per_day,'voice_seconds',s.voice_seconds_per_day); end if;
 if p_action='create' then
  delete from public.casey_beta_visitors where id in (select id from public.casey_beta_visitors where expires_at<now() limit 50);
  delete from public.casey_beta_usage where day<current_date-31;
  if not s.enabled then return jsonb_build_object('error','paused'); end if;
  if not coalesce(s.demo_until>now(),false) and (select count(*) from public.casey_beta_visitors where created_at>=current_date)>=1000 then return jsonb_build_object('error','admissions_full'); end if;
  insert into public.casey_beta_visitors(token_hash) values(p_hash) returning * into v;
 else
  select * into v from public.casey_beta_visitors where token_hash=p_hash and expires_at>now();
  if v.id is null then return jsonb_build_object('error','unauthorized'); end if;
 end if;
 if p_action='email_intent' then
  if p_user is not null and v.user_id is not null and v.user_id is distinct from p_user then return jsonb_build_object('error','unauthorized'); end if;
  update public.casey_beta_visitors set pending_email_hash=p_payload->>'email_hash',pending_state_hash=p_payload->>'state_hash',pending_until=now()+interval '15 minutes' where id=v.id;
  return jsonb_build_object('pending',true);
 end if;
 if p_action='link' then
  if v.user_id is null and (v.pending_until is null or v.pending_until<now() or v.pending_email_hash is distinct from p_payload->>'email_hash' or v.pending_state_hash is distinct from p_payload->>'state_hash') then return jsonb_build_object('error','login_not_initiated'); end if;
  if p_user is null or (v.user_id is not null and v.user_id<>p_user) then return jsonb_build_object('error','unauthorized'); end if;
  -- Verification happens server-side; preserve guest history, never trust client user IDs.
  newly_linked := v.user_id is null;
  update public.casey_beta_visitors set user_id=p_user,pending_email_hash=null,pending_state_hash=null,pending_until=null where id=v.id returning * into v;
 end if;
 who=coalesce('user:'||v.user_id::text,'guest:'||v.id::text);
 insert into public.casey_beta_usage(principal) values(who),('global') on conflict do nothing;
 select * into u from public.casey_beta_usage where casey_beta_usage.principal=who and day=current_date;
 select * into g from public.casey_beta_usage where casey_beta_usage.principal='global' and day=current_date;
 if p_action='link' and newly_linked then
  -- Linking must never reset today's guest allowance.
  update public.casey_beta_usage set texts=texts+coalesce((select texts from public.casey_beta_usage where casey_beta_usage.principal='guest:'||v.id::text and day=current_date),0),
   voice_seconds=voice_seconds+coalesce((select voice_seconds from public.casey_beta_usage where casey_beta_usage.principal='guest:'||v.id::text and day=current_date),0)
   where casey_beta_usage.principal=who and day=current_date returning * into u;
 end if;
 if p_action='list' then
  if p_user is null or v.user_id is distinct from p_user then return jsonb_build_object('error','unauthorized'); end if;
  return jsonb_build_object('conversations',(select coalesce(jsonb_agg(jsonb_build_object('id',x.id,'created_at',x.created_at,'context',x.context) order by x.created_at desc),'[]') from (select id,created_at,context from public.casey_beta_visitors where user_id=p_user and expires_at>now() order by created_at desc limit 20) x));
 end if;
 if p_action='restore' then
  if p_user is null or v.user_id is distinct from p_user then return jsonb_build_object('error','unauthorized'); end if;
  select context into item from public.casey_beta_visitors where id=(p_payload->>'conversation_id')::uuid and user_id=p_user and expires_at>now();
  if item is null then return jsonb_build_object('error','unauthorized'); end if;
  update public.casey_beta_visitors set context=item where id=v.id;
  return jsonb_build_object('context',item);
 end if;
 if p_action='voice_end' then
  if not coalesce(s.demo_until>now(),false) then return jsonb_build_object('released',false); end if;
  select * into r from public.casey_beta_requests where id=p_request and visitor_id=v.id and kind='voice' and completed_at is null;
  if r.id is not null then
   seconds=greatest(0,floor(extract(epoch from (r.expires_at-now()))));
   update public.casey_beta_requests set completed_at=now() where id=r.id;
   update public.casey_beta_usage set voice_seconds=greatest(0,voice_seconds-seconds) where day=(r.created_at at time zone 'UTC')::date and casey_beta_usage.principal in (who,'global');
  end if;
  return jsonb_build_object('released',true);
 end if;
 if p_action='voice_abort' then
  select * into r from public.casey_beta_requests where id=p_request and visitor_id=v.id and kind='voice' and completed_at is null;
  if r.id is not null then
   seconds=ceil(extract(epoch from (r.expires_at-r.created_at)));
   update public.casey_beta_requests set completed_at=now(),expires_at=now() where id=r.id;
   update public.casey_beta_usage set voice_seconds=greatest(0,voice_seconds-seconds) where day=(r.created_at at time zone 'UTC')::date and casey_beta_usage.principal in (who,'global');
  end if;
  return jsonb_build_object('released',true);
 end if;
 if p_action='voice_save' then
  if not exists(select 1 from public.casey_beta_requests where id=p_request and visitor_id=v.id and kind='voice' and expires_at>now()-interval '30 seconds') then return jsonb_build_object('error','voice_expired'); end if;
  update public.casey_beta_visitors set context=p_payload->'context' where id=v.id;
  return jsonb_build_object('saved',true);
 end if;
 if p_action='voice_context' then
  if not exists(select 1 from public.casey_beta_requests where id=p_request and visitor_id=v.id and kind='voice' and completed_at is null and expires_at>now()) then return jsonb_build_object('error','voice_expired'); end if;
  return jsonb_build_object('context',v.context);
 end if;
 if p_action in ('text','voice') then
  if not s.enabled then return jsonb_build_object('error','paused'); end if;
  select * into r from public.casey_beta_requests where id=p_request;
  if r.id is not null then
   if r.visitor_id<>v.id or r.kind<>p_action then return jsonb_build_object('error','unauthorized'); end if;
   return jsonb_build_object('error','duplicate_request','result',r.result);
  end if;
  if exists(select 1 from public.casey_beta_requests where visitor_id=v.id and completed_at is null and expires_at>now() and (p_action='voice' or kind='text')) then return jsonb_build_object('error','busy'); end if;
  select count(*) into active from public.casey_beta_requests where kind=p_action and completed_at is null and expires_at>now();
  if active >= (case when p_action='voice' then s.max_voice else s.max_text end) then return jsonb_build_object('error','capacity'); end if;
  if p_action='text' then
   if u.texts>=s.text_per_day or g.texts>=s.global_text_per_day then return jsonb_build_object('error','text_limit'); end if;
   update public.casey_beta_usage set texts=texts+1 where day=current_date and casey_beta_usage.principal in (who,'global');
   insert into public.casey_beta_requests(id,visitor_id,kind,expires_at,message) values(p_request,v.id,'text',now()+interval '120 seconds',left(p_payload->>'message',1000));
  else
   seconds=least(case when s.demo_until>now() then 1800 else 300 end,s.voice_seconds_per_day-u.voice_seconds,s.global_voice_seconds_per_day-g.voice_seconds);
   if seconds<30 then return jsonb_build_object('error','voice_limit'); end if;
   update public.casey_beta_usage set voice_seconds=voice_seconds+seconds where day=current_date and casey_beta_usage.principal in (who,'global');
   insert into public.casey_beta_requests(id,visitor_id,kind,expires_at) values(p_request,v.id,'voice',now()+pg_catalog.make_interval(secs=>seconds)) returning * into r;
  end if;
  return jsonb_build_object('context',v.context,'seconds',seconds,'expires_at',r.expires_at,'request_id',p_request);
 end if;
 if p_action='finish' then
  select * into r from public.casey_beta_requests where id=p_request and visitor_id=v.id and kind='text' and completed_at is null and expires_at>now();
  if r.id is null then return jsonb_build_object('error','request_expired'); end if;
  update public.casey_beta_requests set result=p_payload,completed_at=now() where id=r.id;
  -- Only server-generated text reaches this action. Retain a bounded private transcript.
  item=jsonb_build_array(jsonb_build_object('role','user','text',r.message),jsonb_build_object('role','assistant','text',left(p_payload->>'answer',6000)));
  update public.casey_beta_visitors set context=(select coalesce(jsonb_agg(value order by ord),'[]') from jsonb_array_elements(v.context||item) with ordinality x(value,ord) where ord>greatest(0,jsonb_array_length(v.context||item)-100)) where id=v.id;
  return jsonb_build_object('saved',true);
 end if;
 return jsonb_build_object('id',v.id,'verified',v.user_id is not null,'context',v.context,'text_remaining',greatest(0,s.text_per_day-u.texts),'voice_seconds_remaining',greatest(0,s.voice_seconds_per_day-u.voice_seconds),'enabled',s.enabled);
end; $$;
revoke all on function public.casey_beta_access(text,text,uuid,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.casey_beta_access(text,text,uuid,jsonb,uuid) to service_role;

-- Apply the same provider admission policy to retained kiosk/legacy callers.
create or replace function public.casey_paid_access(p_hash text,p_action text,p_request uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 perform pg_catalog.pg_advisory_xact_lock(27102026,601);
 delete from public.casey_beta_visitors where token_hash=p_hash and expires_at<=now();
 if not exists(select 1 from public.casey_beta_visitors where token_hash=p_hash and expires_at>now()) then
  result=public.casey_beta_access(p_hash,'create');
  if result ? 'error' then return result; end if;
 end if;
 if p_action not in ('text','voice','finish','voice_abort','voice_end') then return jsonb_build_object('error','unauthorized'); end if;
 return public.casey_beta_access(p_hash,p_action,p_request,'{"answer":""}');
end; $$;
revoke all on function public.casey_paid_access(text,text,uuid) from public,anon,authenticated;
grant execute on function public.casey_paid_access(text,text,uuid) to service_role;
