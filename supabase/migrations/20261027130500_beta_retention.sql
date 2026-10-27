-- Remove only expired beta data; no student, RAG or calendar tables are touched.
select cron.schedule('casey-beta-retention','17 3 * * *',
 $$delete from public.casey_beta_visitors where expires_at<now(); delete from public.casey_beta_usage where day<current_date-31;$$);
