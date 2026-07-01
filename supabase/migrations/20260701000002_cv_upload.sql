-- Migration: CV upload support on student_profiles

alter table student_profiles
  add column if not exists cv_uploaded boolean default false,
  add column if not exists cv_summary jsonb;
