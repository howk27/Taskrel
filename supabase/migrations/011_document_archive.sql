-- ============================================================================
-- Taskrel - Document archive (quote & invoice PDF persistence)
-- Migration: 011_document_archive.sql
--
-- Approach A: a private Storage bucket holds rendered PDFs, and a `documents`
-- table tracks each stored render. PDFs are written at send time (a frozen
-- archive of exactly what the client received) and read back via signed URLs.
-- Contents are client PII, so the bucket is private and scoped per contractor.
-- ============================================================================

-- Private bucket — archived PDFs are never publicly readable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS: a contractor may only touch objects under their own
-- {contractor_id}/... folder. (select+insert+update+delete cover upsert too.)
drop policy if exists "documents: own folder read" on storage.objects;
create policy "documents: own folder read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  );

drop policy if exists "documents: own folder insert" on storage.objects;
create policy "documents: own folder insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  );

drop policy if exists "documents: own folder update" on storage.objects;
create policy "documents: own folder update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  );

drop policy if exists "documents: own folder delete" on storage.objects;
create policy "documents: own folder delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  );

-- Tracked archive — one row per stored PDF.
create table if not exists documents (
  id                uuid primary key default gen_random_uuid(),
  contractor_id     uuid references contractors(id) on delete cascade not null,
  entity_type       text not null check (entity_type in ('quote','invoice')),
  entity_id         uuid not null,
  storage_path      text not null,
  file_name         text not null,
  renderer_version  text,
  byte_size         integer,
  created_at        timestamptz not null default now()
);

create index if not exists documents_entity_idx
  on documents (contractor_id, entity_type, entity_id, created_at desc);

alter table documents enable row level security;

drop policy if exists "documents: own data only" on documents;
create policy "documents: own data only"
  on documents for all
  to authenticated
  using (contractor_id = auth_contractor_id())
  with check (contractor_id = auth_contractor_id());
