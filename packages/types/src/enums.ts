export type GlobalRole = "student" | "mira_admin" | "company_user" | "university_user";

export type AssociationRole =
  | "association_president"
  | "association_admin"
  | "association_reviewer"
  | "association_interviewer"
  | "association_member";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "interview"
  | "accepted"
  | "rejected"
  | "waitlisted"
  | "withdrawn";

export type InvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "revoked"
  | "invalid";

export type InvitationType =
  | "association_president"
  | "association_board_member"
  | "company_admin"
  | "company_recruiter"
  | "university_admin"
  | "mira_admin";

export type AssociationPageStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "unpublished"
  | "disabled";

export type ApplicationCycleStatus = "draft" | "open" | "closed" | "archived";

export type QuestionType =
  | "short_text"
  | "long_text"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "rating_scale"
  | "file_upload"
  | "role_preference"
  | "availability"
  | "case_prompt";

export type VisibilityScope =
  | "private_to_student"
  | "association_application"
  | "association_internal"
  | "company_anonymous"
  | "company_identified"
  | "admin_only"
  | "global_mira"
  | "university_aggregate"
  | "ai_internal_only";

export type KnowledgeProcessingStatus =
  | "uploaded"
  | "extracting"
  | "chunking"
  | "embedding"
  | "ready"
  | "failed";

export type FitCategory =
  | "strong_fit"
  | "good_fit"
  | "uncertain_fit"
  | "weak_fit";

export type Confidence = "low" | "medium" | "high";
