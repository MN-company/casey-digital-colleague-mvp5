-- Casey RAG acceptance checks, READ ONLY. Run in both environments, before and after ingest.
select applicable_pool, approval_status, count(*) from public.hf8_source_documents group by 1,2 order by 1,2;
select count(*) as docs, (select count(*) from public.hf8_source_chunks) as chunks from public.hf8_source_documents;
select count(*) as imported_handbooks from public.hf8_source_documents where source_provenance = 'H-FARM Student Office handbook shared 2026-10-26';
select d.title,d.applicable_pool,d.program,d.academic_year,d.approval_status,count(c.id) as chunks,
       min(c.pdf_page) as first_page,max(c.pdf_page) as last_page
from public.hf8_source_documents d left join public.hf8_source_chunks c on c.doc_id=d.id
where d.source_provenance = 'H-FARM Student Office handbook shared 2026-10-26'
group by d.id order by d.title;
select count(*) as misleading_future_years from public.hf8_source_documents where source_provenance = 'H-FARM Student Office handbook shared 2026-10-26' and academic_year <> '2026/2027';
select count(*) as incorrectly_approved_foundation from public.hf8_source_documents where program='FOUNDATION_YEAR' and source_provenance = 'H-FARM Student Office handbook shared 2026-10-26' and approval_status <> 'candidate';
select count(*) as cross_program_null_handbooks from public.hf8_source_documents where source_provenance = 'H-FARM Student Office handbook shared 2026-10-26' and program is null;
-- Current retrieval remains service-only; verify grants/RLS separately.
select schemaname,tablename,policyname,roles,cmd from pg_policies where tablename in ('hf8_source_documents','hf8_source_chunks');
