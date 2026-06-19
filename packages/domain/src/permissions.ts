export const ASSOCIATION_PERMISSIONS = [
  "manage_association_profile",
  "manage_public_page",
  "manage_application_cycles",
  "manage_application_questions",
  "publish_application_cycle",
  "close_application_cycle",
  "view_candidates",
  "view_candidate_answers",
  "view_candidate_academic_profile",
  "view_raw_transcript",
  "view_candidate_ai_evaluation",
  "add_internal_candidate_notes",
  "change_candidate_status",
  "send_interview_invites",
  "manage_interview_slots",
  "view_board_members",
  "invite_board_members",
  "manage_board_permissions",
  "upload_association_projects",
  "view_association_analytics",
  "export_candidate_data",
  "contact_candidates",
] as const;

export type AssociationPermission = (typeof ASSOCIATION_PERMISSIONS)[number];

export const ROLE_PERMISSION_TEMPLATES: Record<string, AssociationPermission[]> = {
  association_president: [...ASSOCIATION_PERMISSIONS],

  association_admin: [
    "manage_association_profile",
    "manage_public_page",
    "manage_application_cycles",
    "manage_application_questions",
    "publish_application_cycle",
    "close_application_cycle",
    "view_candidates",
    "view_candidate_answers",
    "view_candidate_academic_profile",
    "view_candidate_ai_evaluation",
    "add_internal_candidate_notes",
    "change_candidate_status",
    "send_interview_invites",
    "manage_interview_slots",
    "view_board_members",
    "invite_board_members",
    "view_association_analytics",
    "contact_candidates",
  ],

  association_reviewer: [
    "view_candidates",
    "view_candidate_answers",
    "view_candidate_academic_profile",
    "add_internal_candidate_notes",
  ],

  association_interviewer: [
    "view_candidates",
    "view_candidate_answers",
    "send_interview_invites",
    "manage_interview_slots",
    "add_internal_candidate_notes",
  ],

  association_member: [],
};
