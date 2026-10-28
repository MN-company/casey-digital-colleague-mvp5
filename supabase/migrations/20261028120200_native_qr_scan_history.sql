alter table public.hf6_sessions add column if not exists context jsonb not null default '[]';
alter table public.hf7_links add column if not exists scan_attempt_hash text;
create or replace function public.hf7_scan(p_hash text,p_attempt text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.hf7_links;begin
 if length(p_hash)<>64 or length(p_attempt)<>64 then raise exception 'unavailable';end if;
 select * into l from public.hf7_links where token_hash=p_hash for update;
 if l.id is null or l.consumed_at is not null or l.expires_at<=now() or (l.scan_attempt_hash is not null and l.scan_attempt_hash<>p_attempt) then raise exception 'unavailable';end if;
 if l.scan_attempt_hash is null then update public.hf7_links set scan_attempt_hash=p_attempt,expires_at=now()+interval '10 minutes' where id=l.id;end if;
 return jsonb_build_object('reserved',true);
end;$$;
revoke all on function public.hf7_scan(text,text) from public,anon,authenticated;
grant execute on function public.hf7_scan(text,text) to service_role;
create or replace function public.hf7_claim_recover(p_hash text,p_user uuid,p_session_hash text,p_attempt text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.hf7_links;c public.hf7_chats;s uuid;begin
 if p_user is null or length(p_attempt)<>64 then raise exception 'auth_required';end if;
 select * into l from public.hf7_links where token_hash=p_hash for update;
 if l.id is null or (l.scan_attempt_hash is not null and l.scan_attempt_hash<>p_attempt) then raise exception 'unavailable';end if;
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
