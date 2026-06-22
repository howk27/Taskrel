-- ============================================================================
-- Taskrel - Quote follow-up work queue
-- Migration: 009_quote_follow_ups.sql
-- ============================================================================

alter table quotes
  add column if not exists follow_up_due_at timestamptz,
  add column if not exists last_followed_up_at timestamptz;

create index if not exists quotes_follow_up_due_idx
  on quotes (contractor_id, follow_up_due_at)
  where status = 'sent' and follow_up_due_at is not null;
