-- ============================================================================
-- Taskrel - Durable public-PDF rate limit
-- Migration: 012_quote_pdf_rate_limit.sql
--
-- The unauthenticated public quote-PDF route (/api/public/quotes/[token]/pdf)
-- launches Chromium per render and is reachable by anyone holding the token,
-- so rapid repeats are a DoS / cost vector. The previous cooldown was an
-- in-memory Map (per serverless instance, lost on cold start). This column
-- backs a durable per-quote cooldown that holds across instances.
-- See src/lib/pdf/pdf-rate-limit.ts and the public PDF route.
-- ============================================================================

alter table public.quotes
  add column if not exists last_pdf_generated_at timestamptz;

comment on column public.quotes.last_pdf_generated_at is
  'Timestamp of the most recent public-PDF render; backs the per-quote render cooldown.';
