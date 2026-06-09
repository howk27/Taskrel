-- ============================================================================
-- Taskrel — Initial Schema
-- Migration: 001_initial_schema.sql
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================================


-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";


-- ─── Helpers ─────────────────────────────────────────────────────────────────

-- Auto-update updated_at on any table that has it
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ─── contractors ─────────────────────────────────────────────────────────────
-- One row per account. Created immediately after Supabase Auth signup.

create table contractors (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references auth.users(id) on delete cascade not null unique,
  business_name             text not null default '',
  trade                     text check (trade in (
                              'painting','roofing','flooring','landscaping',
                              'hvac','plumbing','electrical'
                            )),
  phone                     text,
  email                     text not null,
  stripe_customer_id        text unique,
  stripe_connect_account_id text unique,
  subscription_status       text check (subscription_status in (
                              'trialing','active','past_due','canceled'
                            )),
  onboarding_complete       boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger contractors_updated_at
  before update on contractors
  for each row execute function set_updated_at();

alter table contractors enable row level security;

create policy "contractors: own row only"
  on contractors for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Returns the contractors.id for the currently authenticated user.
-- Defined here (after contractors table) so PostgreSQL can validate the query.
create or replace function auth_contractor_id()
returns uuid as $$
  select id from contractors where user_id = auth.uid()
$$ language sql security definer stable;

-- Auto-create contractor row on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into contractors (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ─── clients ─────────────────────────────────────────────────────────────────
-- Auto-populated when a quote is sent. Not manually managed (v1).

create table clients (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid references contractors(id) on delete cascade not null,
  name          text not null,
  email         text,
  phone         text,
  address       text,
  created_at    timestamptz not null default now()
);

create index clients_contractor_id_idx on clients (contractor_id);

alter table clients enable row level security;

create policy "clients: own data only"
  on clients for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


-- ─── quotes ──────────────────────────────────────────────────────────────────

create table quotes (
  id             uuid primary key default gen_random_uuid(),
  contractor_id  uuid references contractors(id) on delete cascade not null,
  client_id      uuid references clients(id) on delete set null,

  -- Denormalized client fields — kept even if client record is deleted
  client_name    text not null,
  client_email   text,
  client_phone   text,
  client_address text,

  trade          text not null check (trade in (
                   'painting','roofing','flooring','landscaping',
                   'hvac','plumbing','electrical'
                 )),
  status         text not null default 'draft' check (status in (
                   'draft','sent','approved','rejected','expired'
                 )),

  -- Line items stored as JSONB: [{description, quantity, unit_price, total}]
  line_items     jsonb not null default '[]'::jsonb,

  subtotal       numeric(10,2) not null default 0,
  tax_rate       numeric(5,4) not null default 0,     -- e.g. 0.0700 = 7%
  tax_amount     numeric(10,2) not null default 0,
  total          numeric(10,2) not null default 0,

  notes          text,
  valid_until    date,
  sent_via       text[] not null default '{}',        -- ['email','sms']

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index quotes_contractor_id_idx on quotes (contractor_id);
create index quotes_client_id_idx     on quotes (client_id);
create index quotes_status_idx        on quotes (contractor_id, status);

create trigger quotes_updated_at
  before update on quotes
  for each row execute function set_updated_at();

alter table quotes enable row level security;

create policy "quotes: own data only"
  on quotes for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


-- ─── jobs ────────────────────────────────────────────────────────────────────
-- Created from approved quotes. Powers the calendar.

create table jobs (
  id              uuid primary key default gen_random_uuid(),
  contractor_id   uuid references contractors(id) on delete cascade not null,
  client_id       uuid references clients(id) on delete set null,
  quote_id        uuid references quotes(id) on delete set null,

  title           text not null,
  description     text,
  status          text not null default 'scheduled' check (status in (
                    'scheduled','in_progress','completed','canceled'
                  )),
  scheduled_start timestamptz not null,
  scheduled_end   timestamptz,
  address         text,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index jobs_contractor_id_idx      on jobs (contractor_id);
create index jobs_scheduled_start_idx    on jobs (contractor_id, scheduled_start);
create index jobs_status_idx             on jobs (contractor_id, status);

create trigger jobs_updated_at
  before update on jobs
  for each row execute function set_updated_at();

alter table jobs enable row level security;

create policy "jobs: own data only"
  on jobs for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


-- ─── invoice_counters ────────────────────────────────────────────────────────
-- Tracks per-contractor invoice numbering (INV-0001, INV-0002, ...)

create table invoice_counters (
  contractor_id uuid primary key references contractors(id) on delete cascade,
  last_number   integer not null default 0
);

alter table invoice_counters enable row level security;

create policy "invoice_counters: own data only"
  on invoice_counters for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());

-- Returns the next invoice number string for a contractor, e.g. "INV-0004"
create or replace function next_invoice_number(p_contractor_id uuid)
returns text as $$
declare
  v_next integer;
begin
  insert into invoice_counters (contractor_id, last_number)
  values (p_contractor_id, 1)
  on conflict (contractor_id) do update
    set last_number = invoice_counters.last_number + 1
  returning last_number into v_next;

  return 'INV-' || lpad(v_next::text, 4, '0');
end;
$$ language plpgsql security definer;


-- ─── invoices ────────────────────────────────────────────────────────────────

create table invoices (
  id                       uuid primary key default gen_random_uuid(),
  contractor_id            uuid references contractors(id) on delete cascade not null,
  client_id                uuid references clients(id) on delete set null,
  quote_id                 uuid references quotes(id) on delete set null,
  job_id                   uuid references jobs(id) on delete set null,

  invoice_number           text not null,

  -- Denormalized client fields
  client_name              text not null,
  client_email             text,
  client_phone             text,

  status                   text not null default 'draft' check (status in (
                             'draft','sent','paid','overdue','void'
                           )),

  line_items               jsonb not null default '[]'::jsonb,

  subtotal                 numeric(10,2) not null default 0,
  tax_rate                 numeric(5,4) not null default 0,
  tax_amount               numeric(10,2) not null default 0,
  total                    numeric(10,2) not null default 0,
  amount_paid              numeric(10,2) not null default 0,

  due_date                 date,
  paid_at                  timestamptz,

  stripe_payment_intent_id text,
  stripe_payment_link      text,

  notes                    text,
  sent_via                 text[] not null default '{}',

  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index invoices_contractor_id_idx on invoices (contractor_id);
create index invoices_client_id_idx     on invoices (client_id);
create index invoices_status_idx        on invoices (contractor_id, status);
create index invoices_due_date_idx      on invoices (contractor_id, due_date) where status != 'paid';

create trigger invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();

alter table invoices enable row level security;

create policy "invoices: own data only"
  on invoices for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


-- ============================================================================
-- v2 Stubs — tables exist, no data written to them in v1
-- ============================================================================

create table change_orders (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid references contractors(id) on delete cascade not null,
  quote_id      uuid references quotes(id) on delete cascade not null,
  description   text not null,
  amount        numeric(10,2) not null default 0,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table change_orders enable row level security;

create policy "change_orders: own data only"
  on change_orders for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


create table crew_members (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid references contractors(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade,
  name          text not null,
  email         text,
  role          text not null default 'crew' check (role in ('owner','admin','crew')),
  created_at    timestamptz not null default now()
);

alter table crew_members enable row level security;

create policy "crew_members: own data only"
  on crew_members for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());
