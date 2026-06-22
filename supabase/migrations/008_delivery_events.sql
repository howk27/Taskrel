-- ============================================================================
-- Taskrel - Delivery proof events
-- Migration: 008_delivery_events.sql
-- ============================================================================

create table if not exists delivery_events (
  id              uuid primary key default gen_random_uuid(),
  contractor_id   uuid references contractors(id) on delete cascade not null,
  actor_user_id   uuid references auth.users(id) on delete set null,
  entity_type     text not null check (entity_type in ('quote','invoice')),
  entity_id       uuid not null,
  action          text not null check (action in ('send','payment_link','payment')),
  channel         text not null check (channel in ('email','sms','stripe')),
  provider        text not null check (provider in ('sendgrid','twilio','stripe','taskrel')),
  recipient       text,
  status          text not null check (status in ('success','error','info')),
  code            text not null,
  message         text not null,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists delivery_events_entity_idx
  on delivery_events (contractor_id, entity_type, entity_id, created_at desc);

create index if not exists delivery_events_status_idx
  on delivery_events (contractor_id, status, created_at desc);

alter table delivery_events enable row level security;

drop policy if exists "delivery_events: own data only" on delivery_events;
create policy "delivery_events: own data only"
  on delivery_events for all
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());
