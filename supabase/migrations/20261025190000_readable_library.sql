-- Preview only. Original evidence is stored once in hf8_source_chunks.
-- These annotations are literal extractions, not generated interpretations.
CREATE TABLE public.hf8_library_entry_details (
 chunk_id text PRIMARY KEY REFERENCES public.hf8_source_chunks(id) ON DELETE CASCADE,
 entry_kind text NOT NULL CHECK(entry_kind IN ('reference','requirement','procedure')),
 contacts jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(contacts)='array'),
 reference_dates jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(reference_dates)='array'),
 requirements jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(requirements)='array'),
 actions jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(actions)='array'),
 extraction_method text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.hf8_library_entry_details ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hf8_library_entry_details FROM anon, authenticated;
GRANT ALL ON public.hf8_library_entry_details TO service_role;
CREATE VIEW public.casey_biblioteca_documenti WITH (security_invoker=true) AS
 SELECT d.id, d.title AS documento, d.topic AS argomento, d.applicable_pool AS istituzione,
 d.audience AS destinatari, d.academic_year AS anno_accademico, d.pdf_pages AS pagine,
 d.approval_status AS stato, d.verified_by AS approvazione, d.validity_flags AS avvertenze,
 d.filename AS file_originale, d.relative_pdf_path AS percorso_originale, d.sha256,
 count(c.id) AS schede
 FROM public.hf8_source_documents d LEFT JOIN public.hf8_source_chunks c ON c.doc_id=d.id
 GROUP BY d.id;
CREATE VIEW public.casey_biblioteca_schede WITH (security_invoker=true) AS
 SELECT c.id, c.doc_id AS documento_id, d.title AS documento, d.topic AS argomento,
 c.section_hint AS sezione, x.entry_kind AS tipo, c.content AS testo_originale,
 x.requirements AS requisiti_estratti, x.actions AS azioni_estratte,
 x.contacts AS contatti, x.reference_dates AS date_citate,
 c.pdf_page AS pagina_pdf, d.filename AS file_originale, d.sha256,
 d.applicable_pool AS istituzione, c.explicit_applicability AS applicabile_a,
 c.scope_verified AS ambito_verificato, d.program AS corso, d.audience AS destinatari,
 d.academic_year AS anno_accademico, d.approval_status AS stato,
 d.verified_by AS approvazione, d.validity_flags AS avvertenze,
 x.extraction_method AS metodo_estrazione
 FROM public.hf8_source_chunks c JOIN public.hf8_source_documents d ON d.id=c.doc_id
 JOIN public.hf8_library_entry_details x ON x.chunk_id=c.id;
REVOKE ALL ON public.casey_biblioteca_documenti,public.casey_biblioteca_schede FROM anon,authenticated;
GRANT SELECT ON public.casey_biblioteca_documenti,public.casey_biblioteca_schede TO service_role;
COMMENT ON VIEW public.casey_biblioteca_schede IS 'Readable source cards. Dates are references, not validated current deadlines. Requirement/action snippets may continue on adjacent cards. Demo approval is not institutional certification.';
