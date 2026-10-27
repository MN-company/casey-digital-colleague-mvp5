-- Apply the same provider admission policy to retained kiosk/legacy callers.
create function public.casey_paid_access(p_hash text,p_action text,p_request uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 perform pg_catalog.pg_advisory_xact_lock(27102026,601);
 delete from public.casey_beta_visitors where token_hash=p_hash and expires_at<=now();
 if not exists(select 1 from public.casey_beta_visitors where token_hash=p_hash and expires_at>now()) then
  result=public.casey_beta_access(p_hash,'create');
  if result ? 'error' then return result; end if;
 end if;
 if p_action not in ('text','voice','finish','voice_abort') then return jsonb_build_object('error','unauthorized'); end if;
 return public.casey_beta_access(p_hash,p_action,p_request,'{"answer":""}');
end; $$;
revoke all on function public.casey_paid_access(text,text,uuid) from public,anon,authenticated;
grant execute on function public.casey_paid_access(text,text,uuid) to service_role;
