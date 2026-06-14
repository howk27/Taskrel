-- ============================================================================
-- Taskrel - Quote Scheduling + Google Sheets Sync
-- Migration: 002_quote_schedule_and_google_sheets.sql
-- Safe to run after 001_initial_schema.sql. Uses IF NOT EXISTS for repeatability.
-- ============================================================================

alter table contractors
  add column if not exists google_sheets_sync_enabled boolean not null default false,
  add column if not exists google_sheets_refresh_token text,
  add column if not exists google_sheets_sheet_id text,
  add column if not exists google_sheets_last_synced_at timestamptz,
  add column if not exists google_sheets_status text not null default 'disconnected';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contractors_google_sheets_status_check'
  ) then
    alter table contractors
      add constraint contractors_google_sheets_status_check
      check (google_sheets_status in ('disconnected','connected','error'));
  end if;
end
$$;

alter table quotes
  add column if not exists scheduled_start timestamptz,
  add column if not exists scheduled_end timestamptz;
