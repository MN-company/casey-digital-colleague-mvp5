-- Additive evidence library. Does not modify existing bookings, identities or Google connections.
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE TABLE IF NOT EXISTS public.hf8_source_documents(
 id text PRIMARY KEY CHECK(id ~ '^hf_[0-9a-f]{24}$'), title text NOT NULL,filename text NOT NULL,
 relative_pdf_path text NOT NULL,sha256 text NOT NULL UNIQUE CHECK(length(sha256)=64),
 source_provenance text NOT NULL DEFAULT 'user_provided_zip',source_url text,
 source_pool text NOT NULL CHECK(source_pool IN('GENERIC','CAFOSCARI','CHICHESTER')),
 applicable_pool text NOT NULL CHECK(applicable_pool IN('SHARED','CAFOSCARI','CICC')),
 topic text NOT NULL,program text,audience text NOT NULL CHECK(audience IN('students','staff','sensitive_support')),
 language text NOT NULL CHECK(language IN('it','en','es')),academic_year text,
 validity_flags jsonb NOT NULL DEFAULT '[]',effective_from date,review_by date,document_approval_date date,
 pdf_pages integer NOT NULL CHECK(pdf_pages>0),
 approval_status text NOT NULL DEFAULT 'candidate' CHECK(approval_status IN('candidate','approved','superseded','rejected')),
 verified_by text,verified_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(approval_status<>'approved' OR(verified_by IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS public.hf8_source_chunks(
 id text PRIMARY KEY CHECK(id ~ '^hc_[0-9a-f]{24}$'),doc_id text NOT NULL REFERENCES public.hf8_source_documents(id) ON DELETE CASCADE,
 pdf_page integer NOT NULL CHECK(pdf_page>0),chunk_index_on_page integer NOT NULL CHECK(chunk_index_on_page>0),
 section_hint text NOT NULL,content text NOT NULL CHECK(length(content)>20),content_sha256 text NOT NULL CHECK(length(content_sha256)=64),word_count integer NOT NULL CHECK(word_count>0),
 search_vector tsvector GENERATED ALWAYS AS(setweight(to_tsvector('simple',coalesce(section_hint,'')),'B')||setweight(to_tsvector('simple',coalesce(content,'')),'A')) STORED,
 embedding extensions.vector(768),embedding_model text,embedded_at timestamptz,
 explicit_applicability text[] NOT NULL DEFAULT '{}',scope_verified boolean NOT NULL DEFAULT false,
 UNIQUE(doc_id,pdf_page,chunk_index_on_page),
 CHECK(explicit_applicability <@ ARRAY['CAFOSCARI','CICC']),CHECK(cardinality(explicit_applicability)=0 OR scope_verified),
 CHECK((embedding IS NULL AND embedding_model IS NULL AND embedded_at IS NULL) OR(embedding IS NOT NULL AND embedding_model='gemini-embedding-2-768' AND embedded_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS hf8_chunks_search ON public.hf8_source_chunks USING gin(search_vector);
ALTER TABLE public.hf8_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hf8_source_chunks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hf8_source_documents,public.hf8_source_chunks FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.hf8_source_documents,public.hf8_source_chunks TO service_role;
