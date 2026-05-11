-- VolleySchedule registrations MVP schema
-- Apply in Supabase SQL editor or via CLI: supabase db push

create type public.app_role as enum ('organizer', 'team_manager');

create type public.tournament_status as enum ('draft', 'open', 'closed');

create type public.registration_status as enum (
  'draft',
  'pending_payment',
  'paid',
  'under_review',
  'approved',
  'rejected',
  'waitlisted'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  role public.app_role not null default 'team_manager',
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  city text,
  created_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid (),
  slug text not null unique,
  name text not null,
  description text,
  location_label text,
  starts_on date,
  ends_on date,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  status public.tournament_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.divisions (
  id uuid primary key default gen_random_uuid (),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  label text not null,
  fee_cents integer not null default 0 check (fee_cents >= 0),
  max_teams integer check (max_teams is null or max_teams > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (tournament_id, label)
);

create table public.teams (
  id uuid primary key default gen_random_uuid (),
  organization_id uuid references public.organizations (id) on delete set null,
  display_name text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid (),
  team_id uuid not null references public.teams (id) on delete cascade,
  division_id uuid not null references public.divisions (id) on delete cascade,
  status public.registration_status not null default 'draft',
  notes_team text,
  notes_staff text,
  external_payment_reference text,
  stripe_checkout_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (team_id, division_id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid (),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  provider text not null default 'stripe',
  provider_payment_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null,
  raw jsonb,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid (),
  registration_id uuid not null references public.registrations (id) on delete cascade,
  kind text not null,
  storage_path text not null,
  uploaded_at timestamptz not null default now()
);

create index idx_divisions_tournament on public.divisions (tournament_id);
create index idx_teams_created_by on public.teams (created_by);
create index idx_registrations_division on public.registrations (division_id);
create index idx_registrations_status on public.registrations (status);
create index idx_payments_registration on public.payments (registration_id);
