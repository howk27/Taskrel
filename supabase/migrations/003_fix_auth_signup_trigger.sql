-- ============================================================================
-- Taskrel - Fix Auth Signup Trigger Search Path
-- Migration: 003_fix_auth_signup_trigger.sql
-- Run this if Supabase Auth signup returns "Database error saving new user".
-- ============================================================================

create or replace function public.auth_contractor_id()
returns uuid as $$
  select id from public.contractors where user_id = auth.uid()
$$ language sql security definer stable set search_path = public, auth;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.contractors (user_id, email, business_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'business_name', '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public, auth;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
