export interface Profile {
  id: string;
  auth_user_id: string;
  full_name: string | null;
  email: string;
  email_domain: string | null;
  avatar_url: string | null;
  phone: string | null;
  locale: string;
  timezone: string | null;
  onboarding_started_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  id: string;
  user_id: string;
  university: string;
  university_email: string;
  degree_program: string | null;
  degree_level: string | null;
  current_year: number | null;
  graduation_year: number | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  transcript_uploaded: boolean;
  transcript_summary: Record<string, unknown> | null;
  interests: unknown[];
  goals: unknown[];
  experiences: unknown[];
  working_style: Record<string, unknown> | null;
  availability: Record<string, unknown> | null;
  profile_summary: string | null;
  visibility_settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AssociationProfile {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  category: string | null;
  short_description: string | null;
  long_description: string | null;
  website_url: string | null;
  social_links: Record<string, string>;
  sectors: string[];
  recruiting_timeline: string | null;
  team_structure: unknown[];
  contact_email: string | null;
  public_page_status: string;
  official: boolean;
  created_by_user_id: string | null;
  approved_by_user_id: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  application_cycle_id: string;
  association_id: string;
  student_user_id: string;
  student_profile_id: string;
  status: string;
  selected_role_preferences: unknown[];
  privacy_consent: Record<string, unknown>;
  submitted_at: string | null;
  last_status_change_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationCycle {
  id: string;
  association_id: string;
  title: string;
  description: string | null;
  status: string;
  opens_at: string | null;
  closes_at: string | null;
  eligible_students: Record<string, unknown>;
  available_roles: unknown[];
  evaluation_criteria: Record<string, unknown>;
  interview_process_description: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  invitation_type: string;
  status: string;
  invited_email: string;
  invited_email_domain: string | null;
  invitation_token: string;
  invited_by_user_id: string | null;
  accepted_by_user_id: string | null;
  association_id: string | null;
  company_id: string | null;
  university_id: string | null;
  invited_role: string | null;
  invited_permissions: Record<string, boolean>;
  metadata: Record<string, unknown>;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}
