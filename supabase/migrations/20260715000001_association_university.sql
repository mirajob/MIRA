-- Migration: associations are now scoped per university, not Bocconi-only.
--
-- Each association gets the university of the president who registered it
-- (apps/web/src/lib/actions/association-register.ts). Students only browse
-- and apply to associations that match their own university.
--
-- Existing associations predate this column and were all created under the
-- Bocconi-only regime, so they backfill to Bocconi rather than being left
-- unscoped (which would make them invisible to everyone).

alter table association_profiles add column university text;

update association_profiles set university = 'Università Bocconi' where university is null;

alter table association_profiles alter column university set default 'Università Bocconi';

create index association_profiles_university_idx on association_profiles(university);
