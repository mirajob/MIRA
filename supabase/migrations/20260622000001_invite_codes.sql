-- Add invite code to associations and activity description to memberships
ALTER TABLE association_profiles ADD COLUMN IF NOT EXISTS invite_code text UNIQUE;
ALTER TABLE association_memberships ADD COLUMN IF NOT EXISTS activity_description text;
