-- ============================================================================
-- Taskrel - Contractor pricing catalog
-- Migration: 005_pricing_catalog.sql
-- ============================================================================

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

create index if not exists pricing_catalog_items_contractor_trade_idx
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

alter table quotes
  add column if not exists pricing_source text not null default 'ai_estimate' check (
    pricing_source in ('ai_estimate','catalog_match','manual_edit','mixed')
  ),
  add column if not exists pricing_confidence text;
