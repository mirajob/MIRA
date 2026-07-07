-- Migration: association verification status
-- Mirrors company_profiles.verification_status so associations can go through
-- the same self-registration + waiting-list approval flow as companies.
-- Existing associations (all created via admin-issued invitations, already
-- trusted) default to 'verified' so nothing already live is affected.

do $$ begin
  create type association_verification_status as enum (
    'pending_verification',
    'verified',
    'rejected',
    'suspended'
  );
exception when duplicate_object then null;
end $$;

alter table association_profiles
  add column if not exists verification_status association_verification_status not null default 'verified',
  add column if not exists rejected_reason text;

create index if not exists association_profiles_verification_status_idx on association_profiles(verification_status);
