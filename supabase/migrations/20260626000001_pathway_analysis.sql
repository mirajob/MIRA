-- Add pathway_analysis JSONB field to student_profiles
-- Stores AI-generated narrative analysis of the student's path, competencies, directions
alter table student_profiles
  add column if not exists pathway_analysis jsonb;
