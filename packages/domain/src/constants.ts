export const ASSOCIATION_CATEGORIES = [
  "finance",
  "consulting",
  "entrepreneurship",
  "tech",
  "marketing",
  "social_impact",
  "politics",
  "culture",
  "sports",
  "other",
] as const;

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  submitted: "Inviata",
  in_review: "In valutazione",
  interview: "Colloquio",
  accepted: "Accettato",
  rejected: "Non selezionato",
  waitlisted: "Lista d'attesa",
  withdrawn: "Ritirata",
};

export const FIT_CATEGORY_LABELS: Record<string, string> = {
  strong_fit: "Strong Fit",
  good_fit: "Good Fit",
  uncertain_fit: "Needs Review",
  weak_fit: "Weak Fit",
};

export const INVITATION_EXPIRY_DAYS = 14;
