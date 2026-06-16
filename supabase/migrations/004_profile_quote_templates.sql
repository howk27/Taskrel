-- ============================================================================
-- Taskrel - Business Profile, Multi-Trade Onboarding, Quote Templates
-- Migration: 004_profile_quote_templates.sql
-- Safe to run after prior migrations. Uses IF NOT EXISTS where possible.
-- ============================================================================

alter table contractors
  add column if not exists business_type text,
  add column if not exists primary_trade text,
  add column if not exists trades text[] not null default '{}',
  add column if not exists logo_url text,
  add column if not exists business_phone text,
  add column if not exists business_website text,
  add column if not exists license_text text,
  add column if not exists quote_default_terms text,
  add column if not exists quote_default_note text,
  add column if not exists quote_policy_text text,
  add column if not exists quote_template_preset text not null default 'classic';

update contractors
set
  primary_trade = coalesce(primary_trade, trade),
  trades = case
    when coalesce(array_length(trades, 1), 0) = 0 and trade is not null then array[trade]
    else trades
  end
where primary_trade is null or coalesce(array_length(trades, 1), 0) = 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contractors_business_type_check'
  ) then
    alter table contractors
      add constraint contractors_business_type_check
      check (business_type in (
        'home_improvement','mechanical_services','outdoor_services',
        'general_contracting','other'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'contractors_primary_trade_check'
  ) then
    alter table contractors
      add constraint contractors_primary_trade_check
      check (primary_trade in (
        'painting','roofing','flooring','landscaping',
        'hvac','plumbing','electrical'
      ));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'contractors_quote_template_preset_check'
  ) then
    alter table contractors
      add constraint contractors_quote_template_preset_check
      check (quote_template_preset in ('classic','modern','compact'));
  end if;
end
$$;

alter table quotes
  add column if not exists business_snapshot jsonb,
  add column if not exists template_preset text not null default 'classic';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'quotes_template_preset_check'
  ) then
    alter table quotes
      add constraint quotes_template_preset_check
      check (template_preset in ('classic','modern','compact'));
  end if;
end
$$;
