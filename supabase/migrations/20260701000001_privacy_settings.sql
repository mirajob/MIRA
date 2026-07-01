-- Add privacy settings to student_profiles
-- Students can control what data is visible to associations and companies
alter table student_profiles
  add column if not exists privacy_settings jsonb
  default '{"show_grades_to_associations": false, "show_grades_to_companies": false}'::jsonb;
