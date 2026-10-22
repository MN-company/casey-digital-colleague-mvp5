begin;
-- Additive rollout: original dc_* data and authorization are unchanged.
alter table public.hf7_chats add column created_at timestamptz not null default now();
alter table public.hf7_chats alter column expires_at set default now()+interval '30 days';
create index hf7_chats_owner_updated on public.hf7_chats(user_id,updated_at desc);
alter table public.hf7_links add column claim_attempt_hash text;
create table public.hf7_chat_sessions(chat_id uuid references public.hf7_chats(id) on delete cascade,session_id uuid references public.hf6_sessions(id) on delete cascade,primary key(chat_id,session_id));
insert into public.hf7_chat_sessions select id,session_id from public.hf7_chats where user_id is not null;
alter table public.hf7_chat_sessions enable row level security;
revoke all on public.hf7_chat_sessions from public,anon,authenticated;
grant all on public.hf7_chat_sessions to service_role;
create function public.hf7_claim_recover(p_hash text,p_user uuid,p_session_hash text,p_attempt text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.hf7_links;c public.hf7_chats;s uuid;begin
 if p_user is null or length(p_attempt)<>64 then raise exception 'auth_required';end if;
 select * into l from public.hf7_links where token_hash=p_hash for update;
 if l.id is null then raise exception 'unavailable';end if;
 select * into c from public.hf7_chats where id=l.chat_id for update;
 if l.consumed_at is not null then
  if c.user_id is distinct from p_user or l.claim_attempt_hash is distinct from p_attempt or l.consumed_at<now()-interval '5 minutes' then raise exception 'unavailable';end if;
 elsif l.expires_at<=now() or c.user_id is not null then raise exception 'unavailable';
 end if;
 if c.expires_at<=now() then raise exception 'unavailable';end if;
 insert into public.hf6_sessions(token_hash,expires_at) values(p_session_hash,least(c.expires_at,now()+interval '24 hours')) returning id into s;
 insert into public.hf7_chat_sessions values(c.id,s);
 update public.hf7_chats set user_id=p_user,session_id=s,updated_at=now() where id=c.id;
 update public.hf7_links set consumed_at=coalesce(consumed_at,now()),claim_attempt_hash=p_attempt where id=l.id;
 insert into public.hf6_v4_conversations(session_id,student_auth_id,language,state,recent_history) values(s,p_user,'it',c.workflow,c.context);
 delete from public.hf6_v4_conversations where session_id=l.source_session;
 return jsonb_build_object('chat_id',c.id,'context',c.context,'workflow',c.workflow,'version',c.version);
end $$;
create or replace function public.hf7_restore(p_user uuid,p_chat uuid,p_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.hf7_chats;s uuid;begin
 select * into c from public.hf7_chats where id=p_chat and user_id=p_user and expires_at>now() for update;
 if c.id is null then raise exception 'unavailable';end if;
 insert into public.hf6_sessions(token_hash,expires_at) values(p_hash,least(c.expires_at,now()+interval '24 hours')) returning id into s;
 insert into public.hf7_chat_sessions values(c.id,s);
 insert into public.hf6_v4_conversations(session_id,student_auth_id,language,state,recent_history) values(s,p_user,'it',c.workflow,c.context);
 return jsonb_build_object('chat_id',c.id,'context',c.context,'workflow',c.workflow,'version',c.version);
end $$;
create or replace function public.hf7_save(p_user uuid,p_session uuid,p_chat uuid,p_context jsonb,p_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare c public.hf7_chats;begin
 select * into c from public.hf7_chats where id=p_chat and user_id=p_user and expires_at>now() for update;
 if c.id is null or not exists(select 1 from public.hf7_chat_sessions where chat_id=p_chat and session_id=p_session) then raise exception 'unavailable';end if;
 if c.version<>p_version then raise exception 'version_conflict';end if;
 update public.hf7_chats set context=p_context,version=version+1,updated_at=now() where id=c.id;
 return jsonb_build_object('version',c.version+1);
end $$;
create table public.hf7_operation_drafts(id uuid primary key default gen_random_uuid(),chat_id uuid not null references public.hf7_chats(id) on delete cascade,user_id uuid not null references auth.users(id),request_id uuid not null,slot_id uuid not null,confirmation_cipher text not null,slot jsonb not null,email text not null,expires_at timestamptz not null,status text not null default 'prepared' check(status in('prepared','committing','completed','cancelled')),result jsonb,created_at timestamptz not null default now());
alter table public.hf7_operation_drafts enable row level security;
revoke all on public.hf7_operation_drafts from public,anon,authenticated;
grant all on public.hf7_operation_drafts to service_role;
create unique index hf7_one_pending_operation on public.hf7_operation_drafts(chat_id) where status in('prepared','committing');
revoke all on function public.hf7_claim_recover(text,uuid,text,text) from public,anon,authenticated;
grant execute on function public.hf7_claim_recover(text,uuid,text,text) to service_role;
commit;
