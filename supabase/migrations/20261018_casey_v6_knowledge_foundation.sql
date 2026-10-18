-- Casey 6.0 knowledge foundation: all sources must be reviewed/verified before use.
-- This migration is NOT deployed automatically to the current production database.
CREATE TABLE IF NOT EXISTS public.dc_v6_knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 200),
  source_url text,
  source_sha256 text NOT NULL UNIQUE CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  source_version text,
  institution text NOT NULL DEFAULT 'SHARED',
  program text, -- null means all programs; otherwise exact roster/program match
  academic_year text, -- e.g. '2026-2027', null only for year-invariant policy
  language text NOT NULL DEFAULT 'it',
  verified boolean NOT NULL DEFAULT false,
  verified_by text,
  verified_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT source_verified CHECK (NOT verified OR (verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS public.dc_v6_knowledge_chunks (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.dc_v6_knowledge_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL CHECK (chunk_index>=0),
  page_number integer CHECK (page_number IS NULL OR page_number>0),
  heading text,
  content text NOT NULL CHECK (length(content) BETWEEN 15 AND 12000),
  search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
  UNIQUE(document_id,chunk_index)
);
CREATE INDEX IF NOT EXISTS dc_v6_chunks_lexical_idx ON public.dc_v6_knowledge_chunks USING gin(search_vector);
CREATE INDEX IF NOT EXISTS dc_v6_docs_metadata_idx ON public.dc_v6_knowledge_documents(institution,program,academic_year) WHERE verified=true;

CREATE TABLE IF NOT EXISTS public.dc_v6_public_faq (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  normalized_question text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('it-IT','en-US','es-ES')),
  answer text NOT NULL,
  source_document_id uuid NOT NULL REFERENCES public.dc_v6_knowledge_documents(id),
  source_sha256 text NOT NULL,
  reviewed_at timestamptz NOT NULL,
  valid_until timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  UNIQUE(normalized_question,locale)
);

ALTER TABLE public.dc_v6_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dc_v6_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dc_v6_public_faq ENABLE ROW LEVEL SECURITY;
-- Service role used only from trusted Supabase Edge functions; no anonymous reads.
REVOKE ALL ON public.dc_v6_knowledge_documents FROM anon,authenticated;
REVOKE ALL ON public.dc_v6_knowledge_chunks FROM anon,authenticated;
REVOKE ALL ON public.dc_v6_public_faq FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.dc_v6_search_verified(
  p_query text,
  p_institution text DEFAULT 'SHARED',
  p_program text DEFAULT NULL,
  p_academic_year text DEFAULT NULL,
  p_limit integer DEFAULT 5
) RETURNS TABLE (
  id uuid, title text, source_url text, source_version text,
  page_number integer, content text, program text, academic_year text, score real
)
LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT d.id,d.title,d.source_url,d.source_version,c.page_number,c.content,d.program,d.academic_year,
        ts_rank_cd(c.search_vector,websearch_to_tsquery('simple',left(p_query,320))) AS score
 FROM public.dc_v6_knowledge_chunks c
 JOIN public.dc_v6_knowledge_documents d ON d.id=c.document_id
 WHERE d.verified AND d.verified_at IS NOT NULL
   AND (d.expires_at IS NULL OR d.expires_at > now())
   AND d.institution IN ('SHARED',COALESCE(p_institution,'SHARED'))
   AND (d.program IS NULL OR (p_program IS NOT NULL AND d.program=p_program))
   AND (d.academic_year IS NULL OR (p_academic_year IS NOT NULL AND d.academic_year=p_academic_year))
   AND c.search_vector @@ websearch_to_tsquery('simple',left(p_query,320))
 ORDER BY score DESC,c.document_id,c.chunk_index
 LIMIT LEAST(GREATEST(p_limit,1),10)
$$;
REVOKE ALL ON FUNCTION public.dc_v6_search_verified(text,text,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dc_v6_search_verified(text,text,text,text,integer) TO service_role;

-- Next iteration: install pgvector and store Gemini embeddings per chunk. Hybrid reranking
-- will combine lexical and cosine similarity. Do not fabricate retrieved excerpts when empty.

-- Only previously reviewed FAQ linked to a still-verified, unchanged shared document.
CREATE OR REPLACE FUNCTION public.dc_v6_get_verified_faq(p_normalized_question text,p_locale text)
RETURNS TABLE(answer text,title text,source_url text,source_version text)
LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT f.answer,d.title,d.source_url,d.source_version
 FROM public.dc_v6_public_faq f
 JOIN public.dc_v6_knowledge_documents d ON d.id=f.source_document_id
 WHERE f.enabled AND f.locale=p_locale AND f.normalized_question=left(p_normalized_question,360)
 AND f.source_sha256=d.source_sha256 AND d.verified AND d.verified_at IS NOT NULL
 AND d.institution='SHARED' AND d.program IS NULL AND d.academic_year IS NULL
 AND (d.expires_at IS NULL OR d.expires_at>now())
 AND (f.valid_until IS NULL OR f.valid_until>now())
 LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.dc_v6_get_verified_faq(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.dc_v6_get_verified_faq(text,text) TO service_role;
