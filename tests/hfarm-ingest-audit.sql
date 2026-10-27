-- Read-only audit. Run separately in production and Preview via an authenticated SQL client.
-- Does not import, update, delete, generate embeddings or modify schema.
begin transaction read only;
select
  (select count(*) from public.hf8_source_documents) as documents,
  (select count(*) from public.hf8_source_chunks) as chunks;
select d.source_provenance, count(distinct d.id) as documents,
       count(c.id) as chunks, count(c.embedding) as embedded_chunks
from public.hf8_source_documents d
left join public.hf8_source_chunks c on c.doc_id = d.id
group by d.source_provenance order by d.source_provenance;
select count(*) as orphan_chunks
from public.hf8_source_chunks c
left join public.hf8_source_documents d on d.id = c.doc_id
where d.id is null;
select id, filename, sha256
from public.hf8_source_documents
where source_provenance = 'user_original_zip_regolamenti_hfarm_casey_rag'
order by id;
commit;
