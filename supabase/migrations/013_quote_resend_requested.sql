-- ============================================================================
-- Taskrel - Client resend-request rate limit
-- Migration: 013_quote_resend_requested.sql
--
-- The unauthenticated /api/public/quotes/[token]/request-resend route lets a
-- client notify the contractor that they want a new quote when one has expired.
-- This column backs a 1-hour per-quote cooldown so a client cannot spam the
-- contractor with notifications.
-- See src/app/api/public/quotes/[token]/request-resend/route.ts
-- ============================================================================

alter table public.quotes
  add column if not exists last_resend_requested_at timestamptz;

comment on column public.quotes.last_resend_requested_at is
  'Timestamp of the most recent client resend-request notification; backs the 1-hour per-quote cooldown.';
