begin;
create table public.hf7_operation_locks(chat_id uuid primary key references public.hf7_chats(id) on delete cascade,lease uuid not null,expires_at timestamptz not null);
alter table public.hf7_operation_locks enable row level security;
revoke all on public.hf7_operation_locks from public,anon,authenticated;
grant all on public.hf7_operation_locks to service_role;
create function public.hf7_operation_lock(p_chat uuid,p_lease uuid) returns boolean language plpgsql security invoker set search_path='' as $$
declare n uuid;begin insert into public.hf7_operation_locks values(p_chat,p_lease,now()+interval '90 seconds') on conflict(chat_id) do update set lease=excluded.lease,expires_at=excluded.expires_at where public.hf7_operation_locks.expires_at<=now() returning chat_id into n;return n is not null;end $$;
revoke all on function public.hf7_operation_lock(uuid,uuid) from public,anon,authenticated;
grant execute on function public.hf7_operation_lock(uuid,uuid) to service_role;
commit;
