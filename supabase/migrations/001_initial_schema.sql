-- ============================================================================
-- Taskrel — Initial Schema
-- Migration: 001_initial_schema.sql
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================================


-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


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

create table if not exists contractors (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid references auth.users(id) on delete cascade not null unique,
  business_name             text not null default '',
  business_type             text check (business_type in (
                              'home_improvement','mechanical_services',
                              'outdoor_services','general_contracting','other'
                            )),
  trade                     text check (trade in (
                              'painting','roofing','flooring','landscaping',
                              'hvac','plumbing','electrical'
                            )),
  primary_trade             text check (primary_trade in (
                              'painting','roofing','flooring','landscaping',
                              'hvac','plumbing','electrical'
                            )),
  trades                    text[] not null default '{}',
  phone                     text,
  email                     text not null,
  logo_url                  text,
  business_phone            text,
  business_website          text,
  license_text              text,
  quote_default_terms       text,
  quote_default_note        text,
  quote_policy_text         text,
  quote_template_preset     text not null default 'classic' check (
                              quote_template_preset in ('classic','modern','compact')
                            ),
  stripe_customer_id        text unique,
  stripe_connect_account_id text unique,
  subscription_status       text check (subscription_status in (
                              'trialing','active','past_due','canceled'
                            )),
  google_sheets_sync_enabled boolean not null default false,
  google_sheets_refresh_token text,
  google_sheets_sheet_id     text,
  google_sheets_last_synced_at timestamptz,
  google_sheets_status       text not null default 'disconnected' check (
                              google_sheets_status in (
                                'disconnected','connected','error'
                              )
                            ),
  onboarding_complete       boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table contractors
  add column if not exists business_type text check (business_type in (
    'home_improvement','mechanical_services','outdoor_services','general_contracting','other'
  )),
  add column if not exists primary_trade text check (primary_trade in (
    'painting','roofing','flooring','landscaping','hvac','plumbing','electrical'
  )),
  add column if not exists trades text[] not null default '{}',
  add column if not exists logo_url text,
  add column if not exists business_phone text,
  add column if not exists business_website text,
  add column if not exists license_text text,
  add column if not exists quote_default_terms text,
  add column if not exists quote_default_note text,
  add column if not exists quote_policy_text text,
  add column if not exists quote_template_preset text not null default 'classic' check (
    quote_template_preset in ('classic','modern','compact')
  ),
  add column if not exists google_sheets_sync_enabled boolean not null default false,
  add column if not exists google_sheets_refresh_token text,
  add column if not exists google_sheets_sheet_id text,
  add column if not exists google_sheets_last_synced_at timestamptz,
  add column if not exists google_sheets_status text not null default 'disconnected' check (
    google_sheets_status in ('disconnected','connected','error')
  );

drop trigger if exists contractors_updated_at on contractors;
create trigger contractors_updated_at
  before update on contractors
  for each row execute function set_updated_at();

alter table contractors enable row level security;

drop policy if exists "contractors: own row only" on contractors;
create policy "contractors: own row only"
  on contractors for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Returns the contractors.id for the currently authenticated user.
-- Defined here (after contractors table) so PostgreSQL can validate the query.
create or replace function auth_contractor_id()
returns uuid as $$
  select id from public.contractors where user_id = auth.uid()
$$ language sql security definer stable set search_path = public, auth;

-- Auto-create contractor row on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.contractors (user_id, email, business_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'business_name', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ─── clients ─────────────────────────────────────────────────────────────────
-- Auto-populated when a quote is sent. Not manually managed (v1).

create table if not exists clients (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid references contractors(id) on delete cascade not null,
  name          text not null,
  email         text,
  phone         text,
  address       text,
  created_at    timestamptz not null default now()
);

alter table clients
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text;

create index if not exists clients_contractor_id_idx on clients (contractor_id);

alter table clients enable row level security;

drop policy if exists "clients: own data only" on clients;
create policy "clients: own data only"
  on clients for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


-- ─── quotes ──────────────────────────────────────────────────────────────────

create table if not exists quotes (
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
  scheduled_start timestamptz,
  scheduled_end   timestamptz,
  business_snapshot jsonb,
  template_preset text not null default 'classic' check (
                   template_preset in ('classic','modern','compact')
                 ),
  pricing_source text not null default 'ai_estimate' check (
                   pricing_source in ('ai_estimate','catalog_match','manual_edit','mixed')
                 ),
  pricing_confidence text,
  sent_via       text[] not null default '{}',        -- ['email','sms']

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table quotes
  add column if not exists scheduled_start timestamptz,
  add column if not exists scheduled_end timestamptz,
  add column if not exists business_snapshot jsonb,
  add column if not exists template_preset text not null default 'classic' check (
    template_preset in ('classic','modern','compact')
  ),
  add column if not exists pricing_source text not null default 'ai_estimate' check (
    pricing_source in ('ai_estimate','catalog_match','manual_edit','mixed')
  ),
  add column if not exists pricing_confidence text,
  add column if not exists sent_via text[] not null default '{}';

create index if not exists quotes_contractor_id_idx on quotes (contractor_id);
create index if not exists quotes_client_id_idx     on quotes (client_id);
create index if not exists quotes_status_idx        on quotes (contractor_id, status);

drop trigger if exists quotes_updated_at on quotes;
create trigger quotes_updated_at
  before update on quotes
  for each row execute function set_updated_at();

alter table quotes enable row level security;

drop policy if exists "quotes: own data only" on quotes;
create policy "quotes: own data only"
  on quotes for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


-- Contractor-specific rates learned from edited quote line items.

create table if not exists pricing_catalog_items (
  id             uuid primary key default gen_random_uuid(),
  contractor_id  uuid references contractors(id) on delete cascade not null,
  trade          text not null check (trade in (
                   'painting','roofing','flooring','landscaping',
                   'hvac','plumbing','electrical'
                 )),
  item_key       text not null,
  item_name      text not null,
  description    text not null,
  unit           text not null default 'unit',
  unit_price     numeric(10,2) not null default 0,
  usage_count    integer not null default 0,
  last_used_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (contractor_id, trade, item_key, unit)
);

create index if not exists pricing_catalog_contractor_trade_idx
  on pricing_catalog_items (contractor_id, trade);

drop trigger if exists pricing_catalog_items_updated_at on pricing_catalog_items;
create trigger pricing_catalog_items_updated_at
  before update on pricing_catalog_items
  for each row execute function set_updated_at();

alter table pricing_catalog_items enable row level security;

drop policy if exists "pricing catalog: own data only" on pricing_catalog_items;
create policy "pricing catalog: own data only"
  on pricing_catalog_items for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


-- ─── jobs ────────────────────────────────────────────────────────────────────
-- Created from approved quotes. Powers the calendar.

create table if not exists jobs (
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

alter table jobs
  add column if not exists quote_id uuid references quotes(id) on delete set null;

create index if not exists jobs_contractor_id_idx      on jobs (contractor_id);
create index if not exists jobs_scheduled_start_idx    on jobs (contractor_id, scheduled_start);
create index if not exists jobs_status_idx             on jobs (contractor_id, status);

drop trigger if exists jobs_updated_at on jobs;
create trigger jobs_updated_at
  before update on jobs
  for each row execute function set_updated_at();

alter table jobs enable row level security;

drop policy if exists "jobs: own data only" on jobs;
create policy "jobs: own data only"
  on jobs for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


-- ─── invoice_counters ────────────────────────────────────────────────────────
-- Tracks per-contractor invoice numbering (INV-0001, INV-0002, ...)

create table if not exists invoice_counters (
  contractor_id uuid primary key references contractors(id) on delete cascade,
  last_number   integer not null default 0
);

alter table invoice_counters enable row level security;

drop policy if exists "invoice_counters: own data only" on invoice_counters;
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

create table if not exists invoices (
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

alter table invoices
  add column if not exists job_id uuid references jobs(id) on delete set null,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_payment_link text,
  add column if not exists sent_via text[] not null default '{}';

create index if not exists invoices_contractor_id_idx on invoices (contractor_id);
create index if not exists invoices_client_id_idx     on invoices (client_id);
create index if not exists invoices_status_idx        on invoices (contractor_id, status);
create index if not exists invoices_due_date_idx      on invoices (contractor_id, due_date) where status != 'paid';

drop trigger if exists invoices_updated_at on invoices;
create trigger invoices_updated_at
  before update on invoices
  for each row execute function set_updated_at();

alter table invoices enable row level security;

drop policy if exists "invoices: own data only" on invoices;
create policy "invoices: own data only"
  on invoices for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


-- ============================================================================
-- v2 Stubs — tables exist, no data written to them in v1
-- ============================================================================

create table if not exists change_orders (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid references contractors(id) on delete cascade not null,
  quote_id      uuid references quotes(id) on delete cascade not null,
  description   text not null,
  amount        numeric(10,2) not null default 0,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists change_orders_updated_at on change_orders;
create trigger change_orders_updated_at
  before update on change_orders
  for each row execute function set_updated_at();

alter table change_orders enable row level security;

drop policy if exists "change_orders: own data only" on change_orders;
create policy "change_orders: own data only"
  on change_orders for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


create table if not exists crew_members (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid references contractors(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade,
  name          text not null,
  email         text,
  role          text not null default 'crew' check (role in ('owner','admin','crew')),
  created_at    timestamptz not null default now()
);

alter table crew_members enable row level security;

drop policy if exists "crew_members: own data only" on crew_members;
create policy "crew_members: own data only"
  on crew_members for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());


-- ─── quote logo storage ─────────────────────────────────────────────────────
-- Public bucket for contractor quote logos. Objects are scoped to contractor id.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-logos',
  'quote-logos',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "quote logos: authenticated read" on storage.objects;
create policy "quote logos: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'quote-logos');

drop policy if exists "quote logos: own folder insert" on storage.objects;
create policy "quote logos: own folder insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'quote-logos'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  );

drop policy if exists "quote logos: own folder update" on storage.objects;
create policy "quote logos: own folder update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'quote-logos'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  )
  with check (
    bucket_id = 'quote-logos'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  );

drop policy if exists "quote logos: own folder delete" on storage.objects;
create policy "quote logos: own folder delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'quote-logos'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  );
