-- Native student UI supports new/restored conversations without minting a new identity or resetting quotas.
create table public.casey_beta_chat_archives(id uuid primary key default gen_random_uuid(),visitor_id uuid not null references public.casey_beta_visitors(id) on delete cascade,user_id uuid references auth.users(id),context jsonb not null,created_at timestamptz not null default now());
create index on public.casey_beta_chat_archives(visitor_id);
create index on public.casey_beta_chat_archives(user_id) where user_id is not null;
alter table public.casey_beta_chat_archives enable row level security;
revoke all on public.casey_beta_chat_archives from public,anon,authenticated;
grant all on public.casey_beta_chat_archives to service_role;
create function public.casey_beta_chats(p_hash text,p_action text,p_chat uuid default null,p_user uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.casey_beta_visitors; selected jsonb; archived uuid;
begin
 perform pg_catalog.pg_advisory_xact_lock(27102026,601);
 select * into v from public.casey_beta_visitors where token_hash=p_hash and expires_at>now();
 if v.id is null or (v.user_id is not null and v.user_id is distinct from p_user) then return jsonb_build_object('error','unauthorized'); end if;
 if v.user_id is not null then update public.casey_beta_chat_archives set user_id=v.user_id where visitor_id=v.id and user_id is null; end if;
 if p_action='list' then
  return jsonb_build_object('conversations',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'context',context,'created_at',created_at) order by created_at desc),'[]') from
   (select id,context,created_at from public.casey_beta_chat_archives where visitor_id=v.id or (p_user is not null and user_id=p_user)
    union all select id,context,created_at from public.casey_beta_visitors where expires_at>now() and (id=v.id or (p_user is not null and user_id=p_user)) order by created_at desc limit 40) x));
 end if;
 if p_action='restore' then
  select context into selected from (select id,context from public.casey_beta_chat_archives where visitor_id=v.id or (p_user is not null and user_id=p_user)
   union all select id,context from public.casey_beta_visitors where expires_at>now() and (id=v.id or (p_user is not null and user_id=p_user))) x where id=p_chat;
  if selected is null then return jsonb_build_object('error','unauthorized'); end if;
 elsif p_action='new' then selected='[]'::jsonb;
 else return jsonb_build_object('error','unauthorized'); end if;
 if exists(select 1 from public.casey_beta_requests where visitor_id=v.id and expires_at>now() and completed_at is null) then return jsonb_build_object('error','busy'); end if;
 if jsonb_array_length(v.context)>0 and v.context<>selected then
  insert into public.casey_beta_chat_archives(visitor_id,user_id,context) values(v.id,v.user_id,v.context) returning id into archived;
 end if;
 update public.casey_beta_visitors set context=selected where id=v.id;
 return jsonb_build_object('id',v.id,'context',selected,'archived_id',archived);
end; $$;
revoke all on function public.casey_beta_chats(text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.casey_beta_chats(text,text,uuid,uuid) to service_role;
