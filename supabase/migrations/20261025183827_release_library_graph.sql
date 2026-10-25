-- Structural continuation and literal title references, never inferred from embedding similarity.
CREATE OR REPLACE VIEW public.casey_source_links WITH(security_invoker=true) AS
 SELECT c.id AS source_chunk_id,n.id AS target_chunk_id,'continua_in'::text AS relazione,
 c.section_hint AS evidenza,c.doc_id AS source_doc_id,n.doc_id AS target_doc_id
 FROM public.hf8_source_chunks c JOIN public.hf8_source_chunks n ON n.doc_id=c.doc_id
 AND n.pdf_page=c.pdf_page+1
 AND regexp_replace(n.section_hint,' \(continua [0-9]+\)$','')=regexp_replace(c.section_hint,' \(continua [0-9]+\)$','')
 UNION
 SELECT c.id,n.id,'rimanda_a',d.title,c.doc_id,d.id
 FROM public.hf8_source_chunks c JOIN public.hf8_source_documents d ON d.id<>c.doc_id
 AND length(d.title)>15 AND position(lower(d.title) IN lower(c.content))>0
 JOIN LATERAL(SELECT id,doc_id FROM public.hf8_source_chunks t WHERE t.doc_id=d.id ORDER BY t.pdf_page,t.chunk_index_on_page LIMIT 1)n ON true;
REVOKE ALL ON public.casey_source_links FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.casey_source_links TO service_role;
CREATE OR REPLACE FUNCTION public.hf8_library_expand(p_ids text[],p_pool text,p_program text DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('chunk_id',x.id,'doc_id',x.doc_id,'title',x.title,
 'pdf_page',x.pdf_page,'section_hint',x.section_hint,'excerpt',x.content,'document_sha256',x.sha256,
 'content_sha256',x.content_sha256,'source_url',x.source_url,'academic_year',x.academic_year,
 'approval_status',x.approval_status,'validity_flags',x.validity_flags,'applicable_pool',x.applicable_pool,
 'explicit_applicability',x.explicit_applicability,'scope_verified',x.scope_verified,'relation',x.relazione,'relation_evidence',x.evidenza)),'[]'::jsonb)
 FROM(SELECT c.*,d.title,d.sha256,d.source_url,d.academic_year,d.approval_status,d.validity_flags,d.applicable_pool,l.relazione,l.evidenza
 FROM public.casey_source_links l JOIN public.hf8_source_chunks c ON c.id=l.target_chunk_id
 JOIN public.hf8_source_documents d ON d.id=c.doc_id
 WHERE l.source_chunk_id=ANY(p_ids) AND d.approval_status='approved' AND d.audience='students'
 AND(d.program IS NULL OR d.program=p_program)
 AND((p_pool='SHARED' AND d.applicable_pool='SHARED' AND c.scope_verified AND c.explicit_applicability @> ARRAY['CAFOSCARI','CICC'])
 OR(p_pool IN('CAFOSCARI','CICC') AND(d.applicable_pool=p_pool OR(d.applicable_pool='SHARED' AND c.scope_verified AND p_pool=ANY(c.explicit_applicability)))))
 ORDER BY c.pdf_page,c.id LIMIT 3)x;
$$;
REVOKE ALL ON FUNCTION public.hf8_library_expand(text[],text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hf8_library_expand(text[],text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.hf7_create(p_user uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE s uuid;c uuid;BEGIN
 IF p_user IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
 INSERT INTO public.hf6_sessions(token_hash,expires_at) VALUES(p_hash,now()+interval '24 hours') RETURNING id INTO s;
 INSERT INTO public.hf7_chats(user_id,session_id) VALUES(p_user,s) RETURNING id INTO c;
 INSERT INTO public.hf7_chat_sessions VALUES(c,s);
 RETURN jsonb_build_object('chat_id',c,'context','[]'::jsonb,'workflow','{}'::jsonb,'version',0);
END $$;
REVOKE ALL ON FUNCTION public.hf7_create(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hf7_create(uuid,text) TO service_role;
