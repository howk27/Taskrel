-- ============================================================================
-- Taskrel - Quote logo storage and policy text
-- Migration: 006_quote_logo_storage_and_policies.sql
-- ============================================================================

alter table contractors
  add column if not exists quote_policy_text text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quote-logos',
  'quote-logos',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "quote logos: authenticated read" on storage.objects;
create policy "quote logos: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'quote-logos');

drop policy if exists "quote logos: own folder insert" on storage.objects;
create policy "quote logos: own folder insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'quote-logos'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  );

drop policy if exists "quote logos: own folder update" on storage.objects;
create policy "quote logos: own folder update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'quote-logos'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  )
  with check (
    bucket_id = 'quote-logos'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  );

drop policy if exists "quote logos: own folder delete" on storage.objects;
create policy "quote logos: own folder delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'quote-logos'
    and (storage.foldername(name))[1] = auth_contractor_id()::text
  );
