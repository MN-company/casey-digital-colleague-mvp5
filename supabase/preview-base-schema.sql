set check_function_bodies = off;
-- Schema-only snapshot from production. No data, users, credentials or policies copied.
create extension if not exists pgcrypto with schema extensions;
create table if not exists public."dc_bookings" (id uuid NOT NULL DEFAULT gen_random_uuid(), session_id uuid NOT NULL, user_id uuid NOT NULL, slot_id uuid NOT NULL, request_id uuid NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now(), processing_ms integer NOT NULL DEFAULT 0, is_seed boolean NOT NULL DEFAULT false, calendar_status text NOT NULL DEFAULT 'not_connected'::text, google_event_id text);
alter table public."dc_bookings" enable row level security;
revoke all on public."dc_bookings" from anon, authenticated;
grant all on public."dc_bookings" to service_role;
create table if not exists public."dc_context_links" (user_id uuid NOT NULL, profile_id integer NOT NULL);
alter table public."dc_context_links" enable row level security;
revoke all on public."dc_context_links" from anon, authenticated;
grant all on public."dc_context_links" to service_role;
create table if not exists public."dc_email_outbox" (id uuid NOT NULL DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL, recipient text NOT NULL, subject text NOT NULL, body text NOT NULL, status text NOT NULL DEFAULT 'awaiting_configuration'::text, attempts integer NOT NULL DEFAULT 0, provider_id text, last_error text, created_at timestamp with time zone NOT NULL DEFAULT now(), sent_at timestamp with time zone);
alter table public."dc_email_outbox" enable row level security;
revoke all on public."dc_email_outbox" from anon, authenticated;
grant all on public."dc_email_outbox" to service_role;
create table if not exists public."dc_integrations" (name text NOT NULL, payload jsonb NOT NULL, updated_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_integrations" enable row level security;
revoke all on public."dc_integrations" from anon, authenticated;
grant all on public."dc_integrations" to service_role;
create table if not exists public."dc_policy_sections" (section text NOT NULL, title text NOT NULL, content text NOT NULL, document text NOT NULL DEFAULT 'Academic Advisory Policy'::text, version text NOT NULL DEFAULT 'Career Day sample · v1'::text, is_sample boolean NOT NULL DEFAULT true);
alter table public."dc_policy_sections" enable row level security;
revoke all on public."dc_policy_sections" from anon, authenticated;
grant all on public."dc_policy_sections" to service_role;
create table if not exists public."dc_rate_limits" (bucket text NOT NULL, used integer NOT NULL DEFAULT 1, expires_at timestamp with time zone NOT NULL);
alter table public."dc_rate_limits" enable row level security;
revoke all on public."dc_rate_limits" from anon, authenticated;
grant all on public."dc_rate_limits" to service_role;
create table if not exists public."dc_sample_academic" (profile_id integer NOT NULL, credits integer NOT NULL, next_exam text NOT NULL, focus text NOT NULL);
alter table public."dc_sample_academic" enable row level security;
revoke all on public."dc_sample_academic" from anon, authenticated;
grant all on public."dc_sample_academic" to service_role;
create table if not exists public."dc_sample_history" (profile_id integer NOT NULL, previous_visits integer NOT NULL, last_topic text NOT NULL, open_request text NOT NULL);
alter table public."dc_sample_history" enable row level security;
revoke all on public."dc_sample_history" from anon, authenticated;
grant all on public."dc_sample_history" to service_role;
create table if not exists public."dc_sample_registry" (id integer NOT NULL, student_code text NOT NULL, program text NOT NULL, study_year integer NOT NULL, advisor text NOT NULL);
alter table public."dc_sample_registry" enable row level security;
revoke all on public."dc_sample_registry" from anon, authenticated;
grant all on public."dc_sample_registry" to service_role;
create table if not exists public."dc_sessions" (id uuid NOT NULL DEFAULT gen_random_uuid(), token_hash text NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now(), expires_at timestamp with time zone NOT NULL DEFAULT (now() + '1 day'::interval));
alter table public."dc_sessions" enable row level security;
revoke all on public."dc_sessions" from anon, authenticated;
grant all on public."dc_sessions" to service_role;
create table if not exists public."dc_slots" (id uuid NOT NULL DEFAULT gen_random_uuid(), starts_at timestamp with time zone NOT NULL, ends_at timestamp with time zone NOT NULL, booked boolean NOT NULL DEFAULT false);
alter table public."dc_slots" enable row level security;
revoke all on public."dc_slots" from anon, authenticated;
grant all on public."dc_slots" to service_role;
create table if not exists public."dc_summary_dictionary" (category text NOT NULL, variant integer NOT NULL, template text NOT NULL);
alter table public."dc_summary_dictionary" enable row level security;
revoke all on public."dc_summary_dictionary" from anon, authenticated;
grant all on public."dc_summary_dictionary" to service_role;
create table if not exists public."dc_support_outbox" (id uuid NOT NULL DEFAULT gen_random_uuid(), ticket_id uuid NOT NULL, recipient text, subject text NOT NULL, body text NOT NULL, status text NOT NULL DEFAULT 'awaiting_configuration'::text, attempts integer NOT NULL DEFAULT 0, provider_id text, last_error text, created_at timestamp with time zone NOT NULL DEFAULT now(), sent_at timestamp with time zone);
alter table public."dc_support_outbox" enable row level security;
revoke all on public."dc_support_outbox" from anon, authenticated;
grant all on public."dc_support_outbox" to service_role;
create table if not exists public."dc_tickets" (id uuid NOT NULL DEFAULT gen_random_uuid(), session_id uuid NOT NULL, user_id uuid NOT NULL, booking_id uuid, request_id uuid NOT NULL, kind text NOT NULL, summary jsonb NOT NULL, details text NOT NULL DEFAULT ''::text, status text NOT NULL DEFAULT 'open'::text, created_at timestamp with time zone NOT NULL DEFAULT now(), is_seed boolean NOT NULL DEFAULT false, resolution_ms integer, citation_checked boolean NOT NULL DEFAULT false, citation_valid boolean, context_origin text NOT NULL DEFAULT 'sample'::text, suggested_reply text);
alter table public."dc_tickets" enable row level security;
revoke all on public."dc_tickets" from anon, authenticated;
grant all on public."dc_tickets" to service_role;
create table if not exists public."dc_users" (id uuid NOT NULL DEFAULT gen_random_uuid(), session_id uuid NOT NULL, email text NOT NULL, email_verified boolean NOT NULL DEFAULT false, created_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_users" enable row level security;
revoke all on public."dc_users" from anon, authenticated;
grant all on public."dc_users" to service_role;
create table if not exists public."dc_v3_admin_sessions" (token_hash text NOT NULL, google_email text NOT NULL, expires_at timestamp with time zone NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v3_admin_sessions" enable row level security;
revoke all on public."dc_v3_admin_sessions" from anon, authenticated;
grant all on public."dc_v3_admin_sessions" to service_role;
create table if not exists public."dc_v3_booking_registry" (booking_id uuid NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v3_booking_registry" enable row level security;
revoke all on public."dc_v3_booking_registry" from anon, authenticated;
grant all on public."dc_v3_booking_registry" to service_role;
create table if not exists public."dc_v3_google_connections" (id text NOT NULL DEFAULT 'staff'::text, google_email text NOT NULL, refresh_token_ciphertext text NOT NULL, refresh_token_iv text NOT NULL, granted_scopes text[] NOT NULL DEFAULT '{}'::text[], calendar_id text NOT NULL DEFAULT 'primary'::text, updated_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v3_google_connections" enable row level security;
revoke all on public."dc_v3_google_connections" from anon, authenticated;
grant all on public."dc_v3_google_connections" to service_role;
create table if not exists public."dc_v3_mail_outbox" (booking_id uuid NOT NULL, recipient text NOT NULL, status text NOT NULL DEFAULT 'pending'::text, attempts integer NOT NULL DEFAULT 0, gmail_message_id text, last_error text, created_at timestamp with time zone NOT NULL DEFAULT now(), sent_at timestamp with time zone);
alter table public."dc_v3_mail_outbox" enable row level security;
revoke all on public."dc_v3_mail_outbox" from anon, authenticated;
grant all on public."dc_v3_mail_outbox" to service_role;
create table if not exists public."dc_v3_oauth_states" (state_hash text NOT NULL, return_to text NOT NULL, expires_at timestamp with time zone NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v3_oauth_states" enable row level security;
revoke all on public."dc_v3_oauth_states" from anon, authenticated;
grant all on public."dc_v3_oauth_states" to service_role;
create table if not exists public."dc_v4_admin_audit" (id uuid NOT NULL DEFAULT gen_random_uuid(), staff_email text NOT NULL, action text NOT NULL, target_id text, occurred_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v4_admin_audit" enable row level security;
revoke all on public."dc_v4_admin_audit" from anon, authenticated;
grant all on public."dc_v4_admin_audit" to service_role;
create table if not exists public."dc_v4_booking_confirmations" (id uuid NOT NULL DEFAULT gen_random_uuid(), session_id uuid NOT NULL, student_auth_id uuid NOT NULL, slot_id uuid NOT NULL, request_id uuid NOT NULL, token_hash text NOT NULL, expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:05:00'::interval), used_at timestamp with time zone, cancelled_at timestamp with time zone, created_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v4_booking_confirmations" enable row level security;
revoke all on public."dc_v4_booking_confirmations" from anon, authenticated;
grant all on public."dc_v4_booking_confirmations" to service_role;
create table if not exists public."dc_v4_conversations" (session_id uuid NOT NULL, student_auth_id uuid, institution text, language text NOT NULL DEFAULT 'it'::text, state jsonb NOT NULL DEFAULT '{}'::jsonb, recent_history jsonb NOT NULL DEFAULT '[]'::jsonb, updated_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v4_conversations" enable row level security;
revoke all on public."dc_v4_conversations" from anon, authenticated;
grant all on public."dc_v4_conversations" to service_role;
create table if not exists public."dc_v4_documents" (id uuid NOT NULL DEFAULT gen_random_uuid(), institution text NOT NULL, title text NOT NULL, content text NOT NULL, source_url text NOT NULL, version text, verified boolean NOT NULL DEFAULT false, updated_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v4_documents" enable row level security;
revoke all on public."dc_v4_documents" from anon, authenticated;
grant all on public."dc_v4_documents" to service_role;
create table if not exists public."dc_v4_student_roster" (id uuid NOT NULL DEFAULT gen_random_uuid(), institution text NOT NULL, student_number text NOT NULL, institutional_email text NOT NULL, preferred_language text NOT NULL DEFAULT 'it'::text, program text, active boolean NOT NULL DEFAULT true, created_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v4_student_roster" enable row level security;
revoke all on public."dc_v4_student_roster" from anon, authenticated;
grant all on public."dc_v4_student_roster" to service_role;
create table if not exists public."dc_v5_requests" (id uuid NOT NULL DEFAULT gen_random_uuid(), student_auth_id uuid NOT NULL, student_email text NOT NULL, institution text NOT NULL, scenario text, subject text NOT NULL, body text NOT NULL, status text NOT NULL DEFAULT 'open'::text, staff_reply text NOT NULL DEFAULT ''::text, reviewed_by text, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v5_requests" enable row level security;
revoke all on public."dc_v5_requests" from anon, authenticated;
grant all on public."dc_v5_requests" to service_role;
create table if not exists public."dc_v5_student_google" (student_auth_id uuid NOT NULL, google_email text NOT NULL, refresh_token_ciphertext text NOT NULL, refresh_token_iv text NOT NULL, calendar_id text NOT NULL DEFAULT 'primary'::text, granted_scopes text[] NOT NULL DEFAULT '{}'::text[], updated_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v5_student_google" enable row level security;
revoke all on public."dc_v5_student_google" from anon, authenticated;
grant all on public."dc_v5_student_google" to service_role;
create table if not exists public."dc_v5_student_oauth_states" (state_hash text NOT NULL, student_auth_id uuid NOT NULL, return_to text NOT NULL, expires_at timestamp with time zone NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now());
alter table public."dc_v5_student_oauth_states" enable row level security;
revoke all on public."dc_v5_student_oauth_states" from anon, authenticated;
grant all on public."dc_v5_student_oauth_states" to service_role;
alter table public."dc_integrations" add constraint "dc_integrations_pkey" PRIMARY KEY (name);
alter table public."dc_sessions" add constraint "dc_sessions_token_hash_key" UNIQUE (token_hash);
alter table public."dc_users" add constraint "dc_users_email_check" CHECK ((length(email) <= 254));
alter table public."dc_users" add constraint "dc_users_pkey" PRIMARY KEY (id);
alter table public."dc_v4_student_roster" add constraint "dc_v4_student_roster_institution_check" CHECK ((institution = ANY (ARRAY['CAFOSCARI'::text, 'CICC'::text])));
alter table public."dc_v4_student_roster" add constraint "dc_v4_student_roster_institution_student_number_key" UNIQUE (institution, student_number);
alter table public."dc_v4_student_roster" add constraint "dc_v4_student_roster_institutional_email_check" CHECK ((institutional_email = lower(institutional_email)));
alter table public."dc_v4_student_roster" add constraint "dc_v4_student_roster_institutional_email_key" UNIQUE (institutional_email);
alter table public."dc_v4_student_roster" add constraint "dc_v4_student_roster_pkey" PRIMARY KEY (id);
alter table public."dc_v4_student_roster" add constraint "dc_v4_student_roster_preferred_language_check" CHECK ((preferred_language = ANY (ARRAY['it'::text, 'en'::text])));
alter table public."dc_v4_student_roster" add constraint "dc_v4_student_roster_student_number_check" CHECK (((length(student_number) >= 2) AND (length(student_number) <= 80)));
alter table public."dc_v4_conversations" add constraint "dc_v4_conversations_institution_check" CHECK ((institution = ANY (ARRAY['CAFOSCARI'::text, 'CICC'::text])));
alter table public."dc_v4_conversations" add constraint "dc_v4_conversations_language_check" CHECK ((language = ANY (ARRAY['it'::text, 'en'::text])));
alter table public."dc_v4_conversations" add constraint "dc_v4_conversations_pkey" PRIMARY KEY (session_id);
alter table public."dc_v4_booking_confirmations" add constraint "dc_v4_booking_confirmations_pkey" PRIMARY KEY (id);
alter table public."dc_v4_booking_confirmations" add constraint "dc_v4_booking_confirmations_session_id_request_id_key" UNIQUE (session_id, request_id);
alter table public."dc_v4_booking_confirmations" add constraint "dc_v4_booking_confirmations_token_hash_key" UNIQUE (token_hash);
alter table public."dc_v4_documents" add constraint "dc_v4_documents_institution_check" CHECK ((institution = ANY (ARRAY['CAFOSCARI'::text, 'CICC'::text, 'SHARED'::text])));
alter table public."dc_v4_documents" add constraint "dc_v4_documents_pkey" PRIMARY KEY (id);
alter table public."dc_v5_requests" add constraint "dc_v5_requests_body_check" CHECK (((length(body) >= 3) AND (length(body) <= 3000)));
alter table public."dc_v5_requests" add constraint "dc_v5_requests_institution_check" CHECK ((institution = ANY (ARRAY['CAFOSCARI'::text, 'CICC'::text])));
alter table public."dc_v5_requests" add constraint "dc_v5_requests_pkey" PRIMARY KEY (id);
alter table public."dc_v5_requests" add constraint "dc_v5_requests_scenario_check" CHECK ((scenario = ANY (ARRAY['EMMA'::text, 'SOFIA'::text])));
alter table public."dc_v5_requests" add constraint "dc_v5_requests_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'in_review'::text, 'resolved'::text, 'closed'::text])));
alter table public."dc_v5_requests" add constraint "dc_v5_requests_subject_check" CHECK (((length(subject) >= 3) AND (length(subject) <= 180)));
alter table public."dc_v5_student_google" add constraint "dc_v5_student_google_pkey" PRIMARY KEY (student_auth_id);
alter table public."dc_v5_student_oauth_states" add constraint "dc_v5_student_oauth_states_pkey" PRIMARY KEY (state_hash);
alter table public."dc_users" add constraint "dc_users_session_id_key" UNIQUE (session_id);
alter table public."dc_slots" add constraint "dc_slots_check" CHECK ((ends_at > starts_at));
alter table public."dc_slots" add constraint "dc_slots_pkey" PRIMARY KEY (id);
alter table public."dc_slots" add constraint "dc_slots_starts_at_key" UNIQUE (starts_at);
alter table public."dc_email_outbox" add constraint "dc_email_outbox_pkey" PRIMARY KEY (id);
alter table public."dc_email_outbox" add constraint "dc_email_outbox_status_check" CHECK ((status = ANY (ARRAY['awaiting_configuration'::text, 'pending'::text, 'sending'::text, 'accepted'::text, 'delivered'::text, 'failed'::text])));
alter table public."dc_email_outbox" add constraint "dc_email_outbox_ticket_id_key" UNIQUE (ticket_id);
alter table public."dc_rate_limits" add constraint "dc_rate_limits_pkey" PRIMARY KEY (bucket);
alter table public."dc_bookings" add constraint "dc_bookings_pkey" PRIMARY KEY (id);
alter table public."dc_bookings" add constraint "dc_bookings_session_id_request_id_key" UNIQUE (session_id, request_id);
alter table public."dc_bookings" add constraint "dc_bookings_slot_id_key" UNIQUE (slot_id);
alter table public."dc_sessions" add constraint "dc_sessions_pkey" PRIMARY KEY (id);
alter table public."dc_sample_registry" add constraint "dc_sample_registry_pkey" PRIMARY KEY (id);
alter table public."dc_sample_registry" add constraint "dc_sample_registry_student_code_key" UNIQUE (student_code);
alter table public."dc_sample_academic" add constraint "dc_sample_academic_pkey" PRIMARY KEY (profile_id);
alter table public."dc_sample_history" add constraint "dc_sample_history_pkey" PRIMARY KEY (profile_id);
alter table public."dc_context_links" add constraint "dc_context_links_pkey" PRIMARY KEY (user_id);
alter table public."dc_summary_dictionary" add constraint "dc_summary_dictionary_pkey" PRIMARY KEY (category, variant);
alter table public."dc_policy_sections" add constraint "dc_policy_sections_pkey" PRIMARY KEY (section);
alter table public."dc_tickets" add constraint "dc_tickets_details_check" CHECK ((length(details) <= 1200));
alter table public."dc_tickets" add constraint "dc_tickets_kind_check" CHECK ((kind = ANY (ARRAY['booking'::text, 'operator'::text])));
alter table public."dc_tickets" add constraint "dc_tickets_pkey" PRIMARY KEY (id);
alter table public."dc_tickets" add constraint "dc_tickets_session_id_request_id_key" UNIQUE (session_id, request_id);
alter table public."dc_support_outbox" add constraint "dc_support_outbox_pkey" PRIMARY KEY (id);
alter table public."dc_support_outbox" add constraint "dc_support_outbox_status_check" CHECK ((status = ANY (ARRAY['awaiting_configuration'::text, 'pending'::text, 'sending'::text, 'accepted'::text, 'delivered'::text, 'failed'::text])));
alter table public."dc_support_outbox" add constraint "dc_support_outbox_ticket_id_key" UNIQUE (ticket_id);
alter table public."dc_v3_google_connections" add constraint "dc_v3_google_connections_id_check" CHECK ((id = 'staff'::text));
alter table public."dc_v3_google_connections" add constraint "dc_v3_google_connections_pkey" PRIMARY KEY (id);
alter table public."dc_v3_oauth_states" add constraint "dc_v3_oauth_states_pkey" PRIMARY KEY (state_hash);
alter table public."dc_v3_admin_sessions" add constraint "dc_v3_admin_sessions_pkey" PRIMARY KEY (token_hash);
alter table public."dc_v3_mail_outbox" add constraint "dc_v3_mail_outbox_pkey" PRIMARY KEY (booking_id);
alter table public."dc_v3_mail_outbox" add constraint "dc_v3_mail_outbox_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'sending'::text, 'sent'::text, 'failed'::text, 'uncertain'::text])));
alter table public."dc_v3_booking_registry" add constraint "dc_v3_booking_registry_pkey" PRIMARY KEY (booking_id);
alter table public."dc_v4_admin_audit" add constraint "dc_v4_admin_audit_pkey" PRIMARY KEY (id);
alter table public."dc_users" add constraint "dc_users_session_id_fkey" FOREIGN KEY (session_id) REFERENCES dc_sessions(id);
alter table public."dc_v4_booking_confirmations" add constraint "dc_v4_booking_confirmations_student_auth_id_fkey" FOREIGN KEY (student_auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."dc_context_links" add constraint "dc_context_links_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES dc_sample_registry(id);
alter table public."dc_context_links" add constraint "dc_context_links_user_id_fkey" FOREIGN KEY (user_id) REFERENCES dc_users(id);
alter table public."dc_v5_student_google" add constraint "dc_v5_student_google_student_auth_id_fkey" FOREIGN KEY (student_auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."dc_v4_conversations" add constraint "dc_v4_conversations_session_id_fkey" FOREIGN KEY (session_id) REFERENCES dc_sessions(id) ON DELETE CASCADE;
alter table public."dc_tickets" add constraint "dc_tickets_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES dc_bookings(id);
alter table public."dc_email_outbox" add constraint "dc_email_outbox_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES dc_tickets(id);
alter table public."dc_v4_conversations" add constraint "dc_v4_conversations_student_auth_id_fkey" FOREIGN KEY (student_auth_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."dc_v3_mail_outbox" add constraint "dc_v3_mail_outbox_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES dc_bookings(id);
alter table public."dc_v5_student_oauth_states" add constraint "dc_v5_student_oauth_states_student_auth_id_fkey" FOREIGN KEY (student_auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."dc_bookings" add constraint "dc_bookings_session_id_fkey" FOREIGN KEY (session_id) REFERENCES dc_sessions(id);
alter table public."dc_tickets" add constraint "dc_tickets_session_id_fkey" FOREIGN KEY (session_id) REFERENCES dc_sessions(id);
alter table public."dc_bookings" add constraint "dc_bookings_slot_id_fkey" FOREIGN KEY (slot_id) REFERENCES dc_slots(id);
alter table public."dc_v4_booking_confirmations" add constraint "dc_v4_booking_confirmations_session_id_fkey" FOREIGN KEY (session_id) REFERENCES dc_sessions(id) ON DELETE CASCADE;
alter table public."dc_bookings" add constraint "dc_bookings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES dc_users(id);
alter table public."dc_tickets" add constraint "dc_tickets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES dc_users(id);
alter table public."dc_v3_booking_registry" add constraint "dc_v3_booking_registry_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES dc_bookings(id) ON DELETE CASCADE;
alter table public."dc_v5_requests" add constraint "dc_v5_requests_student_auth_id_fkey" FOREIGN KEY (student_auth_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."dc_support_outbox" add constraint "dc_support_outbox_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES dc_tickets(id);
alter table public."dc_sample_academic" add constraint "dc_sample_academic_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES dc_sample_registry(id);
alter table public."dc_v4_booking_confirmations" add constraint "dc_v4_booking_confirmations_slot_id_fkey" FOREIGN KEY (slot_id) REFERENCES dc_slots(id);
alter table public."dc_sample_history" add constraint "dc_sample_history_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES dc_sample_registry(id);
CREATE OR REPLACE FUNCTION public.dc_commit_operation(p_session uuid, p_request uuid, p_email text, p_slot uuid DEFAULT NULL::uuid, p_details text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare u uuid;b uuid;t uuid;s public.dc_slots;r public.dc_tickets;ts timestamptz:=clock_timestamp();begin
perform 1 from public.dc_sessions where id=p_session and expires_at>now() for update;if not found then raise exception 'Session expired';end if;
select * into r from public.dc_tickets where session_id=p_session and request_id=p_request;if found then return jsonb_build_object('id',r.id,'booking_id',r.booking_id,'kind',r.kind,'email_status',(select status from public.dc_email_outbox where ticket_id=r.id));end if;
if(select count(*)from public.dc_tickets where session_id=p_session)>=5 then raise exception 'Operation limit reached';end if;
if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(p_email)>254 then raise exception 'Invalid email';end if;
insert into public.dc_users(session_id,email)values(p_session,lower(p_email))on conflict(session_id)do update set email=excluded.email returning id into u;
if p_slot is not null then select * into s from public.dc_slots where id=p_slot and starts_at>now()and not booked for update;if not found then raise exception 'Slot unavailable';end if;update public.dc_slots set booked=true where id=p_slot;insert into public.dc_bookings(session_id,user_id,slot_id,request_id,processing_ms)values(p_session,u,p_slot,p_request,(extract(epoch from(clock_timestamp()-ts))*1000)::int)returning id into b;end if;
insert into public.dc_tickets(session_id,user_id,booking_id,request_id,kind,details,summary)values(p_session,u,b,p_request,case when b is null then 'operator'else 'booking'end,p_details,public.dc_ticket_summary(case when b is null then 'operator'else 'booking'end,p_request,s.starts_at))returning id into t;
insert into public.dc_email_outbox(ticket_id,recipient,subject,body)values(t,lower(p_email),case when b is null then 'Digital Colleague: request recorded'else 'Digital Colleague: booking confirmation'end,case when b is null then 'Your request has been recorded. Reference: '||t::text else 'Your advisory appointment: '||s.starts_at::text||'. Reference: '||t::text end);
return jsonb_build_object('id',t,'booking_id',b,'kind',case when b is null then 'operator'else 'booking'end,'start',s.starts_at,'end',s.ends_at,'email_status','awaiting_configuration');end $function$
;
revoke all on function public.dc_commit_operation(p_session uuid, p_request uuid, p_email text, p_slot uuid, p_details text) from public,anon,authenticated;
grant execute on function public.dc_commit_operation(p_session uuid, p_request uuid, p_email text, p_slot uuid, p_details text) to service_role;
CREATE OR REPLACE FUNCTION public.dc_dashboard_metrics()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with checks as (
 select p.section,p.content,public.dc_retrieve_policy(q.query) as retrieved
 from (values ('2.1','book appointment'),('2.2','reschedule appointment'),('3.1','contact the office')) q(section,query)
 left join public.dc_policy_sections p on p.section=q.section
), fidelity as (
 select count(*) as reviewed,100.0*count(*)filter(where section is not null and content<>'' and retrieved->>'section'=section and retrieved->>'content'=content)/count(*) as accuracy from checks
)
select jsonb_build_object('actions',count(*),'resolution_ms',avg(resolution_ms),'booking_ms',avg(resolution_ms)filter(where kind='booking'),'automation_rate',case when count(*)>0 then 100.0*count(*)filter(where kind='booking')/count(*)else null end,
 'citations_reviewed',(select reviewed from fidelity),'citation_accuracy',(select accuracy from fidelity),'citation_basis','exact_policy_section_matching')
from public.dc_tickets where not is_seed and created_at>=((now()at time zone 'Europe/Rome')::date::timestamp at time zone 'Europe/Rome'); $function$
;
revoke all on function public.dc_dashboard_metrics() from public,anon,authenticated;
grant execute on function public.dc_dashboard_metrics() to service_role;
CREATE OR REPLACE FUNCTION public.dc_enrich_ticket()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 new.summary:=case when new.kind='operator' then public.dc_request_summary(new.details) else '[]'::jsonb end;
 new.context_origin:='request';return new;
end $function$
;
revoke all on function public.dc_enrich_ticket() from public,anon,authenticated;
grant execute on function public.dc_enrich_ticket() to service_role;
CREATE OR REPLACE FUNCTION public.dc_enriched_summary(p_user uuid, p_request uuid, p_kind text, p_start timestamp with time zone, p_details text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare idx integer; reg public.dc_sample_registry; acad public.dc_sample_academic; hist public.dc_sample_history;
 variants bytea:=decode(replace(p_request::text,'-',''),'hex'); rows text[]; v_category text; template text; routing text;
begin
 select profile_id into idx from public.dc_context_links where user_id=p_user;
 if idx is null then
   idx:=1+get_byte(decode(replace(p_user::text,'-',''),'hex'),0)%9;
   if p_details ~* '(1st year|first.year|primo anno)' then idx:=1+(idx-1)%3; end if;
   insert into public.dc_context_links(user_id,profile_id) values(p_user,idx) on conflict(user_id)do nothing;
   select profile_id into idx from public.dc_context_links where user_id=p_user;
 end if;
 select * into reg from public.dc_sample_registry where id=idx;
 select * into acad from public.dc_sample_academic where profile_id=idx;
 select * into hist from public.dc_sample_history where profile_id=idx;
 routing:=case when p_kind='booking' then 'confirmed slot '||to_char(p_start at time zone 'Europe/Rome','DD Mon HH24:MI')||' Europe/Rome' else 'operator review required' end;
 rows:=array[]::text[];
 foreach v_category in array array['registry','academic','history','routing'] loop
   select d.template into template from public.dc_summary_dictionary d where d.category=v_category and variant=1+get_byte(variants,cardinality(rows))%3;
   rows:=array_append(rows,case v_category
     when 'registry' then format(template,reg.student_code,reg.program,reg.study_year)
     when 'academic' then format(template,acad.credits,acad.next_exam,acad.focus)
     when 'history' then format(template,hist.previous_visits,hist.last_topic,hist.open_request)
     else format(template,reg.advisor,routing,substring(p_request::text,1,8)) end);
 end loop;
 return to_jsonb(rows);
end $function$
;
revoke all on function public.dc_enriched_summary(p_user uuid, p_request uuid, p_kind text, p_start timestamp with time zone, p_details text) from public,anon,authenticated;
grant execute on function public.dc_enriched_summary(p_user uuid, p_request uuid, p_kind text, p_start timestamp with time zone, p_details text) to service_role;
CREATE OR REPLACE FUNCTION public.dc_prepare_support_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin if new.kind='operator' then new.suggested_reply:=public.dc_suggested_reply(new.details,new.id);end if;return new;end $function$
;
revoke all on function public.dc_prepare_support_reply() from public,anon,authenticated;
grant execute on function public.dc_prepare_support_reply() to service_role;
CREATE OR REPLACE FUNCTION public.dc_queue_support_mail()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare contact text;begin
 if new.kind='operator' and not new.is_seed then
  select email into contact from public.dc_users where id=new.user_id;
  insert into public.dc_support_outbox(ticket_id,subject,body) values(new.id,'[Digital Colleague] Support ticket '||new.id,
   'OPEN SUPPORT TICKET'||E'\n\n'||'Ticket ID: '||new.id||E'\n'||'Status: open · human review required'||E'\n'||'Requester email: '||contact||E'\n\n'||'ORIGINAL REQUEST'||E'\n'||new.details||E'\n\n'||'SUGGESTED RESPONSE — review before replying'||E'\n'||new.suggested_reply);
 end if;return new;
end $function$
;
revoke all on function public.dc_queue_support_mail() from public,anon,authenticated;
grant execute on function public.dc_queue_support_mail() to service_role;
CREATE OR REPLACE FUNCTION public.dc_request_summary(p_details text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare clean text; topic text; timing text;
begin
 clean:=regexp_replace(coalesce(p_details,''),'[[:alnum:]._%+\-]+@[[:alnum:].\-]+\.[[:alpha:]]{2,}','[email omitted]','gi');
 clean:=regexp_replace(clean,'\+?[0-9][0-9 ()\-]{7,}[0-9]','[contact omitted]','g');
 clean:=regexp_replace(clean,'[[:space:]]+',' ','g');
 -- Nine routing categories, selected only from words in the request.
 topic:=case when clean ~* '(reschedul|spost|riprogram|change.*appointment)' then 'Change to an existing appointment'
 when clean ~* '(exam|esam)' then 'Examination support'
 when clean ~* '(credit|cfu)' then 'Academic credits'
 when clean ~* '(study.plan|piano.*stud)' then 'Study plan review'
 when clean ~* '(certificate|certificat|document)' then 'Documents and certificates'
 when clean ~* '(tuition|payment|pagament|tasse)' then 'Fees and payments'
 when clean ~* '(internship|tirocin|stage)' then 'Internship support'
 when clean ~* '(enrol|iscrizion)' then 'Enrollment support'
 else 'Student office assistance' end;
 timing:=substring(clean from '(?i)(tomorrow|today|domani|oggi|[0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}:[0-9]{2})');
 return jsonb_build_array('Subject: '||topic,'Request: '||left(trim(clean),360)||case when length(clean)>360 then '…' else '' end,
 case when timing is null then 'Timing: no explicit day or time provided in the request.' else 'Requested timing: '||timing||' (as supplied; not confirmed).' end);
end $function$
;
revoke all on function public.dc_request_summary(p_details text) from public,anon,authenticated;
grant execute on function public.dc_request_summary(p_details text) to service_role;
CREATE OR REPLACE FUNCTION public.dc_retrieve_policy(p_query text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select to_jsonb(p)||jsonb_build_object('url','/policy#section-'||replace(section,'.','-'))
 from public.dc_policy_sections p where section=case
 when p_query ~* '(reschedul|spost|riprogram|change.*appointment)' then '2.2'
 when p_query ~* '(book|appointment|advisory|prenot|appuntamento|slot|alle|tomorrow|domani)' then '2.1'
 else '3.1' end;
$function$
;
revoke all on function public.dc_retrieve_policy(p_query text) from public,anon,authenticated;
grant execute on function public.dc_retrieve_policy(p_query text) to service_role;
CREATE OR REPLACE FUNCTION public.dc_suggested_reply(p_details text, p_ticket uuid)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare italian boolean:=p_details ~* '(vorrei|spost|prenot|appuntamento|segreteria|aiuto|esame|ciao|buongiorno|salve|richiest|ho bisogno)'; topic text;
begin
 if p_details ~* '(reschedul|spost|riprogram|change.*appointment)' then
  topic:=case when italian then 'La richiesta di modifica dell’appuntamento richiede la verifica della prenotazione originale e delle disponibilità. L’appuntamento esistente non è stato annullato dal sistema.' else 'Changing your appointment requires a check of the original booking and availability. The system has not cancelled your existing appointment.' end;
 elsif p_details ~* '(exam|esam|credit|study.plan|piano.*stud)' then
  topic:=case when italian then 'La tua richiesta richiede una verifica della situazione accademica da parte dell’ufficio. Il ticket conserva il contesto che hai fornito.' else 'Your request needs an academic record check by the office. Your ticket preserves the context you supplied.' end;
 else
  topic:=case when italian then 'La tua richiesta è stata registrata per la verifica da parte dell’ufficio studenti.' else 'Your request has been recorded for review by the student office.' end;
 end if;
 return case when italian then 'Buongiorno,'||E'\n\n'||'abbiamo registrato la tua richiesta con il ticket '||p_ticket||'. '||topic||E'\n\n'||'Se vuoi aggiungere informazioni, puoi rispondere indicando il numero del ticket.'||E'\n\n'||'Ufficio studenti' else 'Hello,'||E'\n\n'||'we have recorded your request under ticket '||p_ticket||'. '||topic||E'\n\n'||'To add information, reply with the ticket reference.'||E'\n\n'||'Student office' end;
end $function$
;
revoke all on function public.dc_suggested_reply(p_details text, p_ticket uuid) from public,anon,authenticated;
grant execute on function public.dc_suggested_reply(p_details text, p_ticket uuid) to service_role;
CREATE OR REPLACE FUNCTION public.dc_take_rate(p_bucket text, p_limit integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ declare n integer;begin insert into public.dc_rate_limits(bucket,used,expires_at)values(p_bucket,1,now()+interval '1 day')on conflict(bucket)do update set used=case when public.dc_rate_limits.expires_at<now()then 1 else public.dc_rate_limits.used+1 end,expires_at=case when public.dc_rate_limits.expires_at<now()then now()+interval '1 day'else public.dc_rate_limits.expires_at end where public.dc_rate_limits.expires_at<now()or public.dc_rate_limits.used<p_limit returning used into n;return n is not null;end $function$
;
revoke all on function public.dc_take_rate(p_bucket text, p_limit integer) from public,anon,authenticated;
grant execute on function public.dc_take_rate(p_bucket text, p_limit integer) to service_role;
CREATE OR REPLACE FUNCTION public.dc_ticket_summary(p_kind text, p_request uuid, p_start timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare action_points text[];context_points text[];followup_points text[];v bytea:=decode(replace(p_request::text,'-',''),'hex');slot_text text:=to_char(p_start at time zone 'Europe/Rome','DD Mon YYYY HH24:MI')||' · Europe/Rome';
begin
if p_kind='booking' then
 action_points:=array['Advisory appointment recorded.','Available appointment reserved after confirmation.','Booking request converted into a saved appointment.'];
 context_points:=array['Selected time: '||slot_text||'.','Thirty-minute advisory slot: '||slot_text||'.','Reserved start time: '||slot_text||'.'];
 followup_points:=array['Confirmation job recorded in the delivery queue.','Booking, contact and follow-up ticket saved together.','Confirmation delivery tracked in the backend.'];
else
 action_points:=array['Student office assistance request recorded.','Request routed to the operator queue.','A review ticket was created for the office.'];
 context_points:=array['Request context saved for operator review.','The original request is retained in the private ticket.','An operator can review the stored request details.'];
 followup_points:=array['Human review is pending.','The next action requires an operator decision.','Contact information saved for follow-up; review pending.'];
end if;
return jsonb_build_array(action_points[1+get_byte(v,0)%3],context_points[1+get_byte(v,5)%3],followup_points[1+get_byte(v,10)%3]);end $function$
;
revoke all on function public.dc_ticket_summary(p_kind text, p_request uuid, p_start timestamp with time zone) from public,anon,authenticated;
grant execute on function public.dc_ticket_summary(p_kind text, p_request uuid, p_start timestamp with time zone) to service_role;
CREATE OR REPLACE FUNCTION public.dc_v2_book_slot(p_session uuid, p_request uuid, p_email text, p_slot uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_user uuid; v_booking public.dc_bookings%rowtype; v_slot public.dc_slots%rowtype; v_old_email text;
begin
 if p_request is null or p_slot is null then raise exception 'Invalid request' using errcode='22023'; end if;
 if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email' using errcode='22023'; end if;
 perform 1 from public.dc_sessions where id=p_session and expires_at>now() for update;
 if not found then raise exception 'Session expired' using errcode='22023'; end if;
 select * into v_booking from public.dc_bookings where session_id=p_session and request_id=p_request;
 if found then
  select email into v_old_email from public.dc_users where id=v_booking.user_id;
  if v_booking.slot_id<>p_slot or lower(v_old_email)<>lower(trim(p_email)) then raise exception 'Request reference reused for a different booking' using errcode='22023'; end if;
  select * into v_slot from public.dc_slots where id=v_booking.slot_id;
  return jsonb_build_object('saved',true,'booking_id',v_booking.id,'start',v_slot.starts_at,'end',v_slot.ends_at,'calendar_status',v_booking.calendar_status,'repeated',true);
 end if;
 select * into v_slot from public.dc_slots where id=p_slot and starts_at>now() and not booked for update;
 if not found then raise exception 'Slot unavailable' using errcode='P0001'; end if;
 insert into public.dc_users(session_id,email) values(p_session,lower(trim(p_email)))
  on conflict(session_id) do update set email=excluded.email returning id into v_user;
 insert into public.dc_bookings(session_id,user_id,slot_id,request_id,calendar_status)
  values(p_session,v_user,p_slot,p_request,'not_connected') returning * into v_booking;
 update public.dc_slots set booked=true where id=p_slot;
 return jsonb_build_object('saved',true,'booking_id',v_booking.id,'start',v_slot.starts_at,'end',v_slot.ends_at,'calendar_status',v_booking.calendar_status,'repeated',false);
end;
$function$
;
revoke all on function public.dc_v2_book_slot(p_session uuid, p_request uuid, p_email text, p_slot uuid) from public,anon,authenticated;
grant execute on function public.dc_v2_book_slot(p_session uuid, p_request uuid, p_email text, p_slot uuid) to service_role;
CREATE OR REPLACE FUNCTION public.dc_v4_confirm_booking(p_session uuid, p_auth_user uuid, p_request uuid, p_slot uuid, p_email text, p_token_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_confirmation public.dc_v4_booking_confirmations; v_result jsonb;
begin
 select * into v_confirmation from public.dc_v4_booking_confirmations where session_id=p_session and student_auth_id=p_auth_user and request_id=p_request for update;
 if not found or v_confirmation.token_hash<>p_token_hash or v_confirmation.slot_id<>p_slot or v_confirmation.cancelled_at is not null or v_confirmation.expires_at < now() then raise exception 'Confirmation invalid or expired' using errcode='22023'; end if;
 if v_confirmation.used_at is not null then return public.dc_v2_book_slot(p_session,p_request,p_email,p_slot); end if;
 v_result:=public.dc_v2_book_slot(p_session,p_request,p_email,p_slot);
 update public.dc_v4_booking_confirmations set used_at=now() where id=v_confirmation.id;
 insert into public.dc_v3_booking_registry(booking_id) values((v_result->>'booking_id')::uuid) on conflict (booking_id) do nothing;
 return v_result;
end;
$function$
;
revoke all on function public.dc_v4_confirm_booking(p_session uuid, p_auth_user uuid, p_request uuid, p_slot uuid, p_email text, p_token_hash text) from public,anon,authenticated;
grant execute on function public.dc_v4_confirm_booking(p_session uuid, p_auth_user uuid, p_request uuid, p_slot uuid, p_email text, p_token_hash text) to service_role;