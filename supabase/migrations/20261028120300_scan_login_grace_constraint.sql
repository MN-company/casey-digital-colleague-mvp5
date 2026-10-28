-- Unscanned QR still expires within two minutes. Only the first scan can reserve
-- up to ten further minutes, bound to its attempt and never extended on retries.
alter table public.hf7_links drop constraint hf7_links_check;
alter table public.hf7_links add constraint hf7_links_check check (
 expires_at<=created_at+interval '2 minutes' or
 (scan_attempt_hash is not null and expires_at<=created_at+interval '12 minutes')
);
