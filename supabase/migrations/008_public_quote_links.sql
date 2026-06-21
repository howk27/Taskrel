-- ============================================================================
-- Taskrel - Public quote links and approval timestamps
-- Migration: 008_public_quote_links.sql
-- ============================================================================

alter table quotes
  add column if not exists public_access_token text,
  add column if not exists approved_at timestamptz;

create unique index if not exists quotes_public_access_token_key
  on quotes (public_access_token)
  where public_access_token is not null;
