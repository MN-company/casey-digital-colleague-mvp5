begin;
create function public.hf7_library(p_user uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'title',coalesce((select left(t->>'text',100) from jsonb_array_elements(c.context) t where t->>'role'='user' limit 1),'Conversazione con Casey'),'updated_at',c.updated_at,'expires_at',c.expires_at) order by c.updated_at desc),'[]') from (select * from public.hf7_chats where user_id=p_user and expires_at>now() order by updated_at desc limit 50) c;
$$;
revoke all on function public.hf7_library(uuid) from public,anon,authenticated;
grant execute on function public.hf7_library(uuid) to service_role;
create or replace function public.hf7_cleanup() returns void language sql security invoker set search_path='' as $$
 delete from public.hf7_links where expires_at<now()-interval '10 minutes';
 delete from public.hf6_v4_conversations where session_id in(select session_id from public.hf7_chats where expires_at<=now()) or session_id in(select id from public.hf6_sessions where expires_at<=now());
 delete from public.hf7_chats where expires_at<=now() or (user_id is null and updated_at<now()-interval '10 minutes');
 delete from public.hf7_operation_locks where expires_at<=now();
$$;
commit;
