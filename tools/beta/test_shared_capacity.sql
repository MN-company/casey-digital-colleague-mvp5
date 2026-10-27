begin;
do $$
declare h text := encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'); result jsonb;
begin
 update public.casey_beta_settings set enabled=false where id=true;
 result=public.casey_paid_access(h,'text',gen_random_uuid());
 if result->>'error'<>'paused' then raise exception 'legacy API can bypass shared pause'; end if;
end; $$;
rollback;
begin;
do $$
declare legacy text := encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'); beta text := encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'); result jsonb;
begin
 update public.casey_beta_settings set max_voice=1,enabled=true where id=true;
 result=public.casey_paid_access(legacy,'voice',gen_random_uuid());
 if result ? 'error' then raise exception 'legitimate legacy voice admission failed'; end if;
 perform public.casey_beta_access(beta,'create');
 result=public.casey_beta_access(beta,'voice',gen_random_uuid());
 if result->>'error'<>'capacity' then raise exception 'beta and legacy do not share voice capacity'; end if;
end; $$;
rollback;
select 'Shared pause and cross-entrypoint concurrency verified; transactions rolled back' as result;
