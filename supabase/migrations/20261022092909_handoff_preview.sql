-- Apply ONLY to the isolated preview project sneaxpqnmlhnrhoautjx.
begin;
create table public.hf_handoff_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 student_number text not null unique check(student_number ~ '^[A-Za-z0-9-]{3,24}$'), active boolean not null default true
);
create table public.hf_handoff_links (
 id uuid primary key default gen_random_uuid(), source_session uuid not null references public.dc_sessions(id),
 token_hash text not null unique, student_number text not null,
 context jsonb not null check(jsonb_typeof(context)='array' and octet_length(context::text)<24000),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '2 minutes',
 consumed_at timestamptz, consumed_by uuid references auth.users(id),
 check(expires_at<=created_at+interval '2 minutes')
);
create table public.hf_handoff_conversations (
 user_id uuid primary key references auth.users(id) on delete cascade,
 session_id uuid not null references public.dc_sessions(id), context jsonb not null,
 updated_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours'
);
create index hf_handoff_links_expiry on public.hf_handoff_links(expires_at);
alter table public.hf_handoff_profiles enable row level security;
alter table public.hf_handoff_links enable row level security;
alter table public.hf_handoff_conversations enable row level security;
revoke all on public.hf_handoff_profiles, public.hf_handoff_links, public.hf_handoff_conversations from anon,authenticated;
grant all on public.hf_handoff_profiles, public.hf_handoff_links, public.hf_handoff_conversations to service_role;
grant select on public.hf_handoff_profiles, public.hf_handoff_conversations to authenticated;
create policy own_profile on public.hf_handoff_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy own_conversation on public.hf_handoff_conversations for select to authenticated using(user_id=(select auth.uid()) and expires_at>now());
-- Service-only RPCs: the Edge Function validates Auth through /auth/v1/user first.
create function public.hf_handoff_claim(p_hash text,p_user uuid,p_session_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.hf_handoff_links; s uuid; n text;
begin
 select student_number into n from public.hf_handoff_profiles where user_id=p_user and active;
 if n is null then raise exception 'handoff_unavailable'; end if;
 select * into l from public.hf_handoff_links where token_hash=p_hash for update;
 if l.id is null or l.consumed_at is not null or l.expires_at<=now() or l.student_number<>n then raise exception 'handoff_unavailable'; end if;
 insert into public.dc_sessions(token_hash,expires_at) values(p_session_hash,now()+interval '24 hours') returning id into s;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user::text,0));
 update public.dc_sessions set expires_at=now() where id in(select session_id from public.hf_handoff_conversations where user_id=p_user);
 delete from public.dc_v4_conversations where session_id in(select session_id from public.hf_handoff_conversations where user_id=p_user);
 update public.hf_handoff_links set consumed_at=now(),consumed_by=p_user,context='[]'::jsonb where id=l.id;
 insert into public.hf_handoff_conversations(user_id,session_id,context) values(p_user,s,l.context)
 on conflict(user_id) do update set session_id=excluded.session_id,context=excluded.context,updated_at=now(),expires_at=now()+interval '24 hours';
 -- Persist in the existing conversation API too; identity is verified, turns remain untrusted content.
 insert into public.dc_v4_conversations(session_id,student_auth_id,language,state,recent_history)
 values(s,p_user,'it','{}'::jsonb,l.context);
 return jsonb_build_object('context',l.context,'student_number',n);
end $$;
revoke all on function public.hf_handoff_claim(text,uuid,text) from public,anon,authenticated;
grant execute on function public.hf_handoff_claim(text,uuid,text) to service_role;
create function public.hf_handoff_issue(p_session uuid,p_hash text,p_number text,p_context jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare i uuid;
begin
 perform 1 from public.dc_sessions where id=p_session for update;
 delete from public.hf_handoff_links where source_session=p_session and consumed_at is null;
 insert into public.hf_handoff_links(source_session,token_hash,student_number,context) values(p_session,p_hash,p_number,p_context) returning id into i;
 return i;
end $$;
revoke all on function public.hf_handoff_issue(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.hf_handoff_issue(uuid,text,text,jsonb) to service_role;
-- TTL cleanup includes claimed context. Token expiry is also enforced at read/claim time.
create function public.hf_handoff_cleanup() returns void language sql security invoker set search_path='' as $$
 delete from public.hf_handoff_links where expires_at<now()-interval '10 minutes';
 delete from public.dc_v4_conversations where session_id in(select session_id from public.hf_handoff_conversations where expires_at<=now());
 delete from public.hf_handoff_conversations where expires_at<=now();
$$;
revoke all on function public.hf_handoff_cleanup() from public,anon,authenticated;
grant execute on function public.hf_handoff_cleanup() to service_role;
commit;
-- H-FARM identifiers exist only in the preview roster; legacy institutions stay supported.
alter table public.dc_v4_student_roster drop constraint dc_v4_student_roster_institution_check;
alter table public.dc_v4_student_roster add constraint dc_v4_student_roster_institution_check check(institution in ('CAFOSCARI','CICC','H-FARM'));
create or replace function public.hf_handoff_restore(p_user uuid,p_session_hash text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.hf_handoff_conversations; s uuid;
begin
 select * into c from public.hf_handoff_conversations where user_id=p_user and expires_at>now() for update;
 if c.user_id is null then raise exception 'conversation_unavailable'; end if;
 if not exists(select 1 from public.hf_handoff_profiles where user_id=p_user and active) then raise exception 'profile_unavailable'; end if;
 update public.dc_sessions set expires_at=now() where id=c.session_id;
 delete from public.dc_v4_conversations where session_id=c.session_id;
 insert into public.dc_sessions(token_hash,expires_at) values(p_session_hash,c.expires_at) returning id into s;
 update public.hf_handoff_conversations set session_id=s where user_id=p_user;
 insert into public.dc_v4_conversations(session_id,student_auth_id,language,state,recent_history) values(s,p_user,'it','{}',c.context);
 return jsonb_build_object('context',c.context);
end $$;
revoke all on function public.hf_handoff_restore(uuid,text) from public,anon,authenticated;
grant execute on function public.hf_handoff_restore(uuid,text) to service_role;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('hf-handoff-preview-cleanup','*/5 * * * *','select public.hf_handoff_cleanup()');
