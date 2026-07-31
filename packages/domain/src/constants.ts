// Aree delle associazioni universitarie. MIRA non e' limitata alla Bocconi: la lista copre
// anche atenei tecnici (Politecnico), di comunicazione e moda (IULM) e generalisti.
// Sono slug testuali, non un enum del DB: aggiungerne di nuovi non richiede migrazioni e non
// invalida i valori gia' salvati. Mostrati "prettificati" (underscore -> spazio).
export const ASSOCIATION_CATEGORIES = [
  "management",
  "finance",
  "consulting",
  "economics",
  "entrepreneurship",
  "marketing",
  "tech",
  "data_ai",
  "engineering",
  "design",
  "architecture",
  "communication",
  "media_journalism",
  "fashion",
  "arts",
  "music",
  "culture",
  "law",
  "politics",
  "public_policy",
  "social_impact",
  "sustainability",
  "sciences",
  "health",
  "languages",
  "debate",
  "sports",
  "international",
  "other",
] as const;

// Ordine con cui le sezioni compaiono nella lista associazioni: prima gli ambiti
// legati alla carriera, poi cultura, sport e comunità. L'ordine dell'array sopra
// serve ai menu a tendina, questo alla lettura di una pagina lunga.
export const ASSOCIATION_CATEGORY_ORDER: readonly string[] = [
  "management",
  "finance",
  "consulting",
  "economics",
  "entrepreneurship",
  "marketing",
  "tech",
  "data_ai",
  "engineering",
  "sciences",
  "law",
  "politics",
  "public_policy",
  "debate",
  "social_impact",
  "sustainability",
  "health",
  "communication",
  "media_journalism",
  "design",
  "architecture",
  "fashion",
  "arts",
  "music",
  "culture",
  "languages",
  "sports",
  "international",
  "other",
];

// Etichette per gli slug che "prettificati" verrebbero male (Data ai, Media journalism...).
// Gli altri ricadono sulla prettificazione automatica.
const ASSOCIATION_CATEGORY_LABELS: Record<string, string> = {
  data_ai: "Data & AI",
  media_journalism: "Media & Journalism",
  public_policy: "Public Policy",
  social_impact: "Social Impact",
};

export function associationCategoryLabel(slug: string): string {
  if (!slug) return "";
  return (
    ASSOCIATION_CATEGORY_LABELS[slug] ??
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, " ")
  );
}

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
