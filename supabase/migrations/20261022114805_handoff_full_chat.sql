-- Additive demo namespace in the existing project. Apply shared-base.sql first.
begin;
create table public.hf7_chats(id uuid primary key default gen_random_uuid(),user_id uuid references auth.users(id),session_id uuid not null references public.hf6_sessions(id),context jsonb not null default '[]',workflow jsonb not null default '{}',version integer not null default 0,updated_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '24 hours',check(jsonb_typeof(context)='array' and octet_length(context::text)<2000000));
create table public.hf7_links(id uuid primary key default gen_random_uuid(),source_session uuid not null references public.hf6_sessions(id),chat_id uuid not null references public.hf7_chats(id) on delete cascade,token_hash text unique not null,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '2 minutes',consumed_at timestamptz,check(expires_at<=created_at+interval '2 minutes'));
alter table public.hf7_chats enable row level security;
alter table public.hf7_links enable row level security;
revoke all on public.hf7_chats,public.hf7_links from anon,authenticated;
grant all on public.hf7_chats,public.hf7_links to service_role;
grant select on public.hf7_chats to authenticated;
create policy hf7_owner_read on public.hf7_chats for select to authenticated using(user_id=(select auth.uid()) and expires_at>now());
create function public.hf7_take_rate(p_bucket text,p_limit integer,p_window_seconds integer default 60) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;begin
 insert into public.hf6_rate_limits(bucket,used,expires_at) values(p_bucket,1,now()+pg_catalog.make_interval(secs=>p_window_seconds)) on conflict(bucket) do update set used=case when public.hf6_rate_limits.expires_at<=now() then 1 else public.hf6_rate_limits.used+1 end,expires_at=case when public.hf6_rate_limits.expires_at<=now() then now()+pg_catalog.make_interval(secs=>p_window_seconds) else public.hf6_rate_limits.expires_at end where public.hf6_rate_limits.expires_at<=now() or public.hf6_rate_limits.used<p_limit returning used into n;return n is not null;
end $$;
create function public.hf7_issue(p_session uuid,p_hash text,p_context jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c uuid;w jsonb;begin
 perform 1 from public.hf6_sessions where id=p_session and expires_at>now() for update;
 if not found then raise exception 'session_expired';end if;
 select state into w from public.hf6_v4_conversations where session_id=p_session;
 select chat_id into c from public.hf7_links where source_session=p_session and consumed_at is null limit 1;
 if c is null then insert into public.hf7_chats(session_id,context,workflow) values(p_session,p_context,coalesce(w,'{}')) returning id into c;
 else update public.hf7_chats set context=p_context,workflow=coalesce(w,'{}'),updated_at=now() where id=c and user_id is null;end if;
 delete from public.hf7_links where source_session=p_session and consumed_at is null;
 insert into public.hf7_links(source_session,chat_id,token_hash) values(p_session,c,p_hash);
 return jsonb_build_object('chat_id',c,'id',(select id from public.hf7_links where token_hash=p_hash));
end $$;
create function public.hf7_claim(p_hash text,p_user uuid,p_session_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.hf7_links;c public.hf7_chats;s uuid;begin
 -- The service-only Edge Function validates the live Auth user before this RPC.
 if p_user is null then raise exception 'auth_required';end if;
 select * into l from public.hf7_links where token_hash=p_hash for update;
 if l.id is null or l.consumed_at is not null or l.expires_at<=now() then raise exception 'unavailable';end if;
 select * into c from public.hf7_chats where id=l.chat_id for update;
 if c.user_id is not null then raise exception 'already_claimed';end if;
 insert into public.hf6_sessions(token_hash,expires_at) values(p_session_hash,c.expires_at) returning id into s;
 update public.hf7_chats set user_id=p_user,session_id=s,updated_at=now() where id=c.id;
 update public.hf7_links set consumed_at=now() where id=l.id;
 insert into public.hf6_v4_conversations(session_id,student_auth_id,language,state,recent_history) values(s,p_user,'it',c.workflow,c.context);
 delete from public.hf6_v4_conversations where session_id=l.source_session;
 return jsonb_build_object('chat_id',c.id,'context',c.context,'workflow',c.workflow,'version',c.version);
end $$;
create function public.hf7_restore(p_user uuid,p_chat uuid,p_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.hf7_chats;s uuid;begin
 select * into c from public.hf7_chats where id=p_chat and user_id=p_user and expires_at>now() for update;
 if c.id is null then raise exception 'unavailable';end if;
 update public.hf6_sessions set expires_at=now() where id=c.session_id;
 delete from public.hf6_v4_conversations where session_id=c.session_id;
 insert into public.hf6_sessions(token_hash,expires_at) values(p_hash,c.expires_at) returning id into s;
 update public.hf7_chats set session_id=s where id=c.id;
 insert into public.hf6_v4_conversations(session_id,student_auth_id,language,state,recent_history) values(s,p_user,'it',c.workflow,c.context);
 return jsonb_build_object('chat_id',c.id,'context',c.context,'workflow',c.workflow,'version',c.version);
end $$;
create function public.hf7_save(p_user uuid,p_session uuid,p_chat uuid,p_context jsonb,p_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.hf7_chats;begin
 select * into c from public.hf7_chats where id=p_chat and user_id=p_user and session_id=p_session and expires_at>now() for update;
 if c.id is null then raise exception 'unavailable';end if;
 if c.version<>p_version then raise exception 'version_conflict';end if;
 update public.hf7_chats set context=p_context,version=version+1,updated_at=now() where id=c.id;
 return jsonb_build_object('version',c.version+1);
end $$;
create function public.hf7_cleanup() returns void language sql security invoker set search_path='' as $$
 delete from public.hf7_links where expires_at<now()-interval '10 minutes';
 delete from public.hf6_v4_conversations where session_id in(select session_id from public.hf7_chats where expires_at<=now()) or session_id in(select id from public.hf6_sessions where expires_at<=now());
 delete from public.hf7_chats where expires_at<=now();
$$;
revoke all on function public.hf7_take_rate(text,integer,integer),public.hf7_issue(uuid,text,jsonb),public.hf7_claim(text,uuid,text),public.hf7_restore(uuid,uuid,text),public.hf7_save(uuid,uuid,uuid,jsonb,integer),public.hf7_cleanup() from public,anon,authenticated;
grant execute on function public.hf7_take_rate(text,integer,integer),public.hf7_issue(uuid,text,jsonb),public.hf7_claim(text,uuid,text),public.hf7_restore(uuid,uuid,text),public.hf7_save(uuid,uuid,uuid,jsonb,integer),public.hf7_cleanup() to service_role;
commit;
create function public.hf7_cancel(p_source uuid,p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.hf7_links;begin
 select * into l from public.hf7_links where id=p_id and source_session=p_source for update;
 if l.id is null then return jsonb_build_object('consumed',false);end if;
 if l.consumed_at is not null then return jsonb_build_object('consumed',true);end if;
 delete from public.hf7_links where id=l.id;
 delete from public.hf7_chats where id=l.chat_id and user_id is null;
 return jsonb_build_object('consumed',false);
end $$;
revoke all on function public.hf7_cancel(uuid,uuid) from public,anon,authenticated;
grant execute on function public.hf7_cancel(uuid,uuid) to service_role;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('casey-handoff-v2-cleanup','*/5 * * * *','select public.hf7_cleanup()');
