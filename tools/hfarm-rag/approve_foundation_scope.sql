-- Applied in both environments after inspecting the recovered source text.
-- Foundation Year pages 9 (Chichester Board), 13 (mitigating circumstances),
-- 23 (ChiView) and 54 (University of Chichester regulations) establish CICC scope.
-- User approval is for this demo; this is not institutional certification.
update public.hf8_source_documents
set approval_status = 'approved',
    verified_by = 'casey_user_demo_approval_source_scope_review_2026_10_27',
    verified_at = now(),
    validity_flags = (validity_flags - 'institution_scope_needs_verification')
        || '["scope_verified_from_source_pages_9_13_23_54"]'::jsonb
where filename = 'BSc - Foundation Year .pdf'
  and sha256 = 'b78dd378bb0ddd0fc5be05f6c060b62768ae3fa2469068a3b2a976352ccca1b6'
  and program = 'FOUNDATION_YEAR' and applicable_pool = 'CICC'
  and approval_status = 'candidate';
