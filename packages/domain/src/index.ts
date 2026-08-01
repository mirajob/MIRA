export { ALLOWED_STUDENT_DOMAINS, ITALIAN_UNIVERSITY_DOMAINS, validateStudentEmail, validatePassword } from "./validation";
export { ASSOCIATION_PERMISSIONS, ROLE_PERMISSION_TEMPLATES } from "./permissions";
export { ASSOCIATION_CATEGORIES, ASSOCIATION_CATEGORY_ORDER, associationCategoryLabel, APPLICATION_STATUS_LABELS, FIT_CATEGORY_LABELS, INVITATION_EXPIRY_DAYS } from "./constants";
export type { AssociationPermission } from "./permissions";
export {
  normalizeAssociationName,
  significantWords,
  associationAcronyms,
  matchAssociationNames,
  rankAssociationMatches,
} from "./association-matching";
export type {
  AssociationMatchLevel,
  AssociationMatchResult,
  AssociationCandidate,
  RankedAssociationMatch,
} from "./association-matching";
export {
  PATHS,
  WA_LIMITS,
  COPY as WHATSAPP_COPY,
  LINK_PLACEHOLDER,
  initialState,
  handleEvent,
  toDisponibilita,
  toPianoCarriera,
  validateOutbound,
} from "./whatsapp-agent";
export type {
  PathId,
  AgentStep,
  StepName,
  AgentState,
  AgentReply,
  CollectedData,
  InboundEvent,
  OutboundMessage,
  OutboundButton,
  FlowAnswers,
} from "./whatsapp-agent";
