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

/**
 * Un'associazione ha due soli livelli: amministratore e membro.
 *
 * - amministratore -> accesso completo alla dashboard. Nessun permesso da spuntare:
 *   chi amministra puo' fare tutto, chi non amministra non entra. Chi crea la pagina
 *   nasce amministratore e puo' nominarne altri.
 * - membro -> nessun permesso, quindi nessun accesso alla dashboard. Esiste solo nella
 *   lista membri dell'associazione (vedi hasWorkspaceAccess).
 *
 * association_president / reviewer / interviewer sono RITIRATI. Restano mappati qui solo
 * perche' i valori sopravvivono nell'enum Postgres: "president" e' equiparato ad
 * amministratore cosi' che eventuali righe non ancora convertite non perdano l'accesso.
 */
export const ROLE_PERMISSION_TEMPLATES: Record<string, AssociationPermission[]> = {
  association_admin: [...ASSOCIATION_PERMISSIONS],

  // Legacy: identico ad association_admin, non piu' assegnabile.
  association_president: [...ASSOCIATION_PERMISSIONS],

  association_member: [],
};
