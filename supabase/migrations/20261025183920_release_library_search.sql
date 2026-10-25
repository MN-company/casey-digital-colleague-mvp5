SET search_path=public,extensions;
CREATE OR REPLACE FUNCTION public.hf8_search_hybrid(p_query text, p_embedding vector DEFAULT NULL::vector, p_pool text DEFAULT 'SHARED'::text, p_program text DEFAULT NULL::text, p_academic_year text DEFAULT NULL::text, p_limit integer DEFAULT 5, p_allow_candidate boolean DEFAULT false)
 RETURNS TABLE(chunk_id text, doc_id text, title text, applicable_pool text, academic_year text, pdf_page integer, section_hint text, excerpt text, document_sha256 text, source_url text, approval_status text, validity_flags jsonb, program text, explicit_applicability text[], scope_verified boolean, lexical_rank bigint, semantic_rank bigint, cosine_similarity real, hybrid_score double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
WITH eligible AS MATERIALIZED(
 SELECT c.id AS chunk_id,c.search_vector,c.embedding,c.section_hint,c.content,c.pdf_page,
 c.explicit_applicability,c.scope_verified,d.id AS doc_id,d.title,d.applicable_pool,
 d.academic_year,d.sha256,d.source_url,d.program,d.approval_status,d.validity_flags
 FROM public.hf8_source_chunks c JOIN public.hf8_source_documents d ON d.id=c.doc_id
 WHERE p_pool IN('SHARED','CAFOSCARI','CICC')
 AND length(btrim(coalesce(p_query,''))) BETWEEN 3 AND 350
 AND (p_embedding IS NULL OR extensions.vector_dims(p_embedding)=768)
 AND ((p_pool='SHARED' AND d.applicable_pool='SHARED' AND c.scope_verified AND c.explicit_applicability @> ARRAY['CAFOSCARI','CICC'])
 OR (p_pool<>'SHARED' AND d.applicable_pool=p_pool)
 OR (p_pool<>'SHARED' AND d.applicable_pool='SHARED' AND c.scope_verified
 AND p_pool=ANY(c.explicit_applicability)))
 AND(d.program IS NULL OR(p_program IS NOT NULL AND d.program=p_program))
 AND d.audience='students' AND d.approval_status NOT IN('rejected','superseded')
 AND (p_allow_candidate OR d.approval_status='approved')
 AND (p_allow_candidate OR d.applicable_pool<>'SHARED' OR c.scope_verified)
),
fts_query AS(SELECT websearch_to_tsquery('simple'::regconfig,left(p_query,350)) AS q),
lexical_raw AS(
 SELECT e.chunk_id,ts_rank_cd(e.search_vector,q.q) AS relevance
 FROM eligible e CROSS JOIN fts_query q WHERE e.search_vector @@ q.q
 ORDER BY relevance DESC,e.chunk_id LIMIT 40),
lexical AS(SELECT chunk_id,row_number() OVER (ORDER BY relevance DESC,chunk_id) AS lr FROM lexical_raw),
semantic_raw AS(
 SELECT e.chunk_id,(1-(e.embedding OPERATOR(extensions.<=>) p_embedding))::real AS similarity
 FROM eligible e WHERE p_embedding IS NOT NULL AND e.embedding IS NOT NULL
 ORDER BY e.embedding OPERATOR(extensions.<=>) p_embedding,e.chunk_id LIMIT 40),
semantic AS(SELECT chunk_id,row_number() OVER (ORDER BY similarity DESC,chunk_id) AS sr,similarity FROM semantic_raw),
fused AS(SELECT coalesce(l.chunk_id,s.chunk_id) AS id,l.lr,s.sr,s.similarity,
(coalesce(1.0/(60+l.lr),0.0)+coalesce(1.0/(60+s.sr),0.0)) AS score
FROM lexical l FULL OUTER JOIN semantic s ON l.chunk_id=s.chunk_id)
SELECT e.chunk_id,e.doc_id,e.title,e.applicable_pool,e.academic_year,e.pdf_page,
e.section_hint,e.content,e.sha256,e.source_url,e.approval_status,e.validity_flags,
e.program,e.explicit_applicability,e.scope_verified,
f.lr,f.sr,f.similarity,
(f.score+CASE WHEN p_academic_year IS NOT NULL AND e.academic_year=p_academic_year
 THEN 0.002 ELSE 0 END)::double precision
FROM fused f JOIN eligible e ON e.chunk_id=f.id
ORDER BY 19 DESC,16 NULLS LAST,17 NULLS LAST,e.chunk_id
LIMIT least(greatest(coalesce(p_limit,5),1),8);
$function$;

REVOKE ALL ON FUNCTION public.hf8_search_hybrid(text,extensions.vector,text,text,text,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hf8_search_hybrid(text,extensions.vector,text,text,text,integer,boolean) TO service_role;

