-- Presentation profile is separate from the authoritative university roster.
create table public.casey_account_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text check (char_length(display_name) between 2 and 80),
 name_source text not null default 'email' check(name_source in ('email','user')),
 updated_at timestamptz not null default now()
);
alter table public.casey_account_profiles enable row level security;
revoke all on public.casey_account_profiles from public,anon,authenticated;
grant all on public.casey_account_profiles to service_role;
