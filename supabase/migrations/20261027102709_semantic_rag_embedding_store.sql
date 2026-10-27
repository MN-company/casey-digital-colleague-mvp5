-- Bounded vector-only writes; callable exclusively with a service role.
-- Source text, document links, approval and scope are never modified here.
create or replace function public.hf8_store_embeddings(p_rows jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare changed integer;
begin
 if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 100 then
  raise exception 'Invalid embedding batch';
 end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r
   where r->>'embedding_model' <> 'gemini-embedding-2-768'
   or jsonb_typeof(r->'embedding') <> 'array'
   or jsonb_array_length(r->'embedding') <> 768) then
  raise exception 'Invalid embedding space';
 end if;
 update public.hf8_source_chunks c
 set embedding=(r.embedding::text)::extensions.vector(768),
     embedding_model=r.embedding_model, embedded_at=now()
 from jsonb_to_recordset(p_rows) as r(id text,content_sha256 text,embedding jsonb,embedding_model text)
 where c.id=r.id and c.content_sha256=r.content_sha256 and c.embedding is null;
 get diagnostics changed = row_count;
 return changed;
end;
$$;
revoke all on function public.hf8_store_embeddings(jsonb) from public,anon,authenticated;
grant execute on function public.hf8_store_embeddings(jsonb) to service_role;
