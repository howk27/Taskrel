-- ============================================================================
-- Taskrel - Property value and overhead pricing intelligence
-- Migration: 007_pricing_intelligence.sql
-- ============================================================================

alter table contractors
  add column if not exists overhead_percent numeric(6,3) not null default 0,
  add column if not exists overhead_fixed_per_job numeric(10,2) not null default 0;

alter table quotes
  add column if not exists property_valuation_snapshot jsonb,
  add column if not exists pricing_recommendation_snapshot jsonb;
