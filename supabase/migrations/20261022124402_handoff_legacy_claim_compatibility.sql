-- Older clients remain single-use while receiving the new chat/session association.
create or replace function public.hf7_claim(p_hash text,p_user uuid,p_session_hash text) returns jsonb language sql security invoker set search_path='' as $$
 select public.hf7_claim_recover(p_hash,p_user,p_session_hash,p_session_hash);
$$;
