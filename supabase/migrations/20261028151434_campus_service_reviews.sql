-- Generic public-kiosk questions awaiting a human decision. No student identity is inferred.
create table public.casey_service_reviews (
 id uuid primary key default gen_random_uuid(),
 session_id uuid references public.hf6_sessions(id) on delete set null,
 kind text not null check(kind='internship_contract'),
 subject text not null check(length(subject) between 3 and 180),
 question text not null check(length(question) between 3 and 1000),
 status text not null default 'open' check(status in ('open','in_review','resolved','closed')),
 staff_reply text not null default '' check(length(staff_reply)<=3000),
 reviewed_by text,
 is_test boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(session_id,kind)
);
alter table public.casey_service_reviews enable row level security;
revoke all on public.casey_service_reviews from anon,authenticated;
grant select,insert,update,delete on public.casey_service_reviews to service_role;
create index casey_service_reviews_pending on public.casey_service_reviews(status,created_at desc);
