// Institutional email domains for the universities MIRA recognizes. Students
// authenticate with a `nome.cognome@<domain>` (or a subdomain of it, e.g.
// `studenti.<domain>`) address issued by their university — this is how MIRA
// verifies someone is a real enrolled student without requiring manual review.
//
// The Italian block is sourced from the CRUI (Conferenza dei Rettori delle
// Università Italiane) institutional contact list, cross-checked against each
// university's own IT services pages for the exact student-facing domain. Two
// universities issue students a domain that is NOT a subdomain of their
// institutional domain (Bocconi, Cattolica) — those are listed with their
// student-specific domain directly. Matching is always a plain suffix check
// against the value below, so the institutional domain also covers student
// subdomains (e.g. `student.ethz.ch` matches `ethz.ch`).
//
// The international block covers selected top European institutions plus a few
// global peers, using each school's primary institutional domain.
//
// NOTE: this list is kept in sync BY HAND with the SQL `handle_new_user`
// trigger (latest: supabase/migrations/*_university_domains.sql). Any change
// here must ship a matching migration, or new signups from the added domain
// won't get a student profile auto-provisioned.
export const ITALIAN_UNIVERSITY_DOMAINS: Array<{ name: string; domain: string }> = [
  // Milano
  { name: "Università Bocconi", domain: "studbocconi.it" },
  { name: "Politecnico di Milano", domain: "polimi.it" },
  { name: "Università degli Studi di Milano (Statale)", domain: "unimi.it" },
  { name: "Università degli Studi di Milano-Bicocca", domain: "unimib.it" },
  { name: "Università Cattolica del Sacro Cuore", domain: "icatt.it" },
  { name: "IULM", domain: "iulm.it" },
  { name: "Università Vita-Salute San Raffaele", domain: "unisr.it" },
  { name: "Humanitas University", domain: "hunimed.eu" },

  // Roma
  { name: "Sapienza Università di Roma", domain: "uniroma1.it" },
  { name: "Università di Roma Tor Vergata", domain: "uniroma2.it" },
  { name: "Università degli Studi Roma Tre", domain: "uniroma3.it" },
  { name: "Università degli Studi di Roma Foro Italico", domain: "uniroma4.it" },
  { name: "LUISS Guido Carli", domain: "luiss.it" },
  { name: "LUMSA", domain: "lumsa.it" },
  { name: "Università Campus Bio-Medico di Roma", domain: "unicampus.it" },
  { name: "Università degli Studi Internazionali di Roma (UNINT)", domain: "unint.eu" },

  // Torino
  { name: "Politecnico di Torino", domain: "polito.it" },
  { name: "Università degli Studi di Torino", domain: "unito.it" },

  // Bologna
  { name: "Alma Mater Studiorum Università di Bologna", domain: "unibo.it" },

  // Altri atenei maggiori
  { name: "Università degli Studi di Padova", domain: "unipd.it" },
  { name: "Università degli Studi di Napoli Federico II", domain: "unina.it" },
  { name: "Università degli Studi di Napoli L'Orientale", domain: "unior.it" },
  { name: "Università degli Studi di Napoli Parthenope", domain: "uniparthenope.it" },
  { name: "Università degli Studi di Pisa", domain: "unipi.it" },
  { name: "Scuola Normale Superiore di Pisa", domain: "sns.it" },
  { name: "Scuola Superiore Sant'Anna Pisa", domain: "santannapisa.it" },
  { name: "Università degli Studi di Firenze", domain: "unifi.it" },
  { name: "Università degli Studi di Genova", domain: "unige.it" },
  { name: "Università Ca' Foscari Venezia", domain: "unive.it" },
  { name: "Università IUAV di Venezia", domain: "iuav.it" },
  { name: "Università degli Studi di Trento", domain: "unitn.it" },
  { name: "Università degli Studi di Verona", domain: "univr.it" },
  { name: "Università degli Studi di Bari Aldo Moro", domain: "uniba.it" },
  { name: "Politecnico di Bari", domain: "poliba.it" },
  { name: "Università degli Studi di Palermo", domain: "unipa.it" },
  { name: "Università degli Studi di Catania", domain: "unict.it" },
  { name: "Università degli Studi di Modena e Reggio Emilia", domain: "unimore.it" },
  { name: "Università degli Studi di Parma", domain: "unipr.it" },
  { name: "Università degli Studi di Siena", domain: "unisi.it" },
  { name: "Università per Stranieri di Siena", domain: "unistrasi.it" },
  { name: "Università degli Studi di Perugia", domain: "unipg.it" },
  { name: "Università per Stranieri di Perugia", domain: "unistrapg.it" },
  { name: "Università degli Studi di Cagliari", domain: "unica.it" },
  { name: "Università degli Studi di Trieste", domain: "units.it" },
  { name: "Università degli Studi di Udine", domain: "uniud.it" },
  { name: "Università degli Studi di Ferrara", domain: "unife.it" },
  { name: "Università degli Studi di Pavia", domain: "unipv.it" },
  { name: "Università degli Studi dell'Insubria", domain: "uninsubria.it" },
  { name: "Università degli Studi di Bergamo", domain: "unibg.it" },
  { name: "Università degli Studi di Brescia", domain: "unibs.it" },
  { name: "Libera Università di Bolzano", domain: "unibz.it" },
  { name: "Università della Valle d'Aosta", domain: "univda.it" },
  { name: "Università della Calabria", domain: "unical.it" },
  { name: "Università degli Studi Mediterranea di Reggio Calabria", domain: "unirc.it" },
  { name: "Università degli Studi Magna Graecia di Catanzaro", domain: "unicz.it" },
  { name: "Università degli Studi di Messina", domain: "unime.it" },
  { name: "Libera Università degli Studi di Enna Kore", domain: "unikore.it" },
  { name: "Università degli Studi di Sassari", domain: "uniss.it" },
  { name: "Università degli Studi del Salento (Lecce)", domain: "unisalento.it" },
  { name: "Università degli Studi di Salerno", domain: "unisa.it" },
  { name: "Università degli Studi della Campania Luigi Vanvitelli", domain: "unicampania.it" },
  { name: "Università degli Studi del Sannio (Benevento)", domain: "unisannio.it" },
  { name: "Università degli Studi del Molise", domain: "unimol.it" },
  { name: "Università degli Studi della Basilicata", domain: "unibas.it" },
  { name: "Università degli Studi dell'Aquila", domain: "univaq.it" },
  { name: "Università degli Studi G. D'Annunzio Chieti-Pescara", domain: "unich.it" },
  { name: "Università degli Studi della Tuscia (Viterbo)", domain: "unitus.it" },
  { name: "Università degli Studi di Cassino e del Lazio Meridionale", domain: "unicas.it" },
  { name: "Università degli Studi del Piemonte Orientale", domain: "uniupo.it" },
  { name: "Università degli Studi di Camerino", domain: "unicam.it" },
  { name: "Università degli Studi di Macerata", domain: "unimc.it" },
  { name: "Università degli Studi di Urbino Carlo Bo", domain: "uniurb.it" },
  { name: "Università Politecnica delle Marche (Ancona)", domain: "univpm.it" },
  { name: "Università degli Studi di Teramo", domain: "unite.it" },
  { name: "Università LUM Jean Monnet (Bari)", domain: "lum.it" },
  { name: "LIUC - Università Cattaneo (Castellanza)", domain: "liuc.it" },
  { name: "Scuola IMT Alti Studi Lucca", domain: "imtlucca.it" },
  { name: "Gran Sasso Science Institute (GSSI)", domain: "gssi.it" },

  // Estero — Regno Unito
  { name: "London School of Economics (LSE)", domain: "lse.ac.uk" },
  { name: "University of Oxford", domain: "ox.ac.uk" },
  { name: "University of Cambridge", domain: "cam.ac.uk" },
  { name: "Imperial College London", domain: "imperial.ac.uk" },
  { name: "University College London (UCL)", domain: "ucl.ac.uk" },
  { name: "King's College London", domain: "kcl.ac.uk" },
  { name: "University of Warwick", domain: "warwick.ac.uk" },
  { name: "University of Edinburgh", domain: "ed.ac.uk" },
  { name: "London Business School", domain: "london.edu" },

  // Estero — Francia
  { name: "HEC Paris", domain: "hec.edu" },
  { name: "INSEAD", domain: "insead.edu" },
  { name: "Sciences Po", domain: "sciencespo.fr" },
  { name: "ESSEC Business School", domain: "essec.edu" },
  { name: "ESCP Business School", domain: "escp.eu" },
  { name: "EDHEC Business School", domain: "edhec.com" },
  { name: "École Polytechnique", domain: "polytechnique.edu" },
  { name: "emlyon business school", domain: "emlyon.com" },
  { name: "Sorbonne Université", domain: "sorbonne-universite.fr" },

  // Estero — Spagna
  { name: "ESADE Business & Law School (Barcellona)", domain: "esade.edu" },
  { name: "IE University", domain: "ie.edu" },
  { name: "IESE Business School", domain: "iese.edu" },
  { name: "Universitat Pompeu Fabra (Barcellona)", domain: "upf.edu" },

  // Estero — Austria
  { name: "WU Vienna (Wirtschaftsuniversität Wien)", domain: "wu.ac.at" },
  { name: "Universität Wien", domain: "univie.ac.at" },

  // Estero — Germania
  { name: "Ludwig-Maximilians-Universität München (LMU)", domain: "lmu.de" },
  { name: "Technische Universität München (TUM)", domain: "tum.de" },
  { name: "Universität Mannheim", domain: "uni-mannheim.de" },
  { name: "Frankfurt School of Finance & Management", domain: "fs.de" },
  { name: "WHU – Otto Beisheim School of Management", domain: "whu.edu" },
  { name: "ESMT Berlin", domain: "esmt.org" },
  { name: "Humboldt-Universität zu Berlin", domain: "hu-berlin.de" },

  // Estero — Svizzera
  { name: "ETH Zürich", domain: "ethz.ch" },
  { name: "EPFL (École polytechnique fédérale de Lausanne)", domain: "epfl.ch" },
  { name: "Università di San Gallo (HSG)", domain: "unisg.ch" },
  { name: "IMD Lausanne", domain: "imd.org" },
  { name: "Universität Zürich", domain: "uzh.ch" },

  // Estero — Paesi Bassi
  { name: "Erasmus University Rotterdam (RSM)", domain: "eur.nl" },
  { name: "University of Amsterdam", domain: "uva.nl" },
  { name: "Tilburg University", domain: "tilburguniversity.edu" },
  { name: "TU Delft", domain: "tudelft.nl" },

  // Estero — Belgio
  { name: "KU Leuven", domain: "kuleuven.be" },
  { name: "Vlerick Business School", domain: "vlerick.com" },

  // Estero — Svezia
  { name: "Stockholm School of Economics", domain: "hhs.se" },
  { name: "KTH Royal Institute of Technology", domain: "kth.se" },
  { name: "Lund University", domain: "lu.se" },

  // Estero — Danimarca
  { name: "Copenhagen Business School (CBS)", domain: "cbs.dk" },
  { name: "University of Copenhagen", domain: "ku.dk" },

  // Estero — Irlanda
  { name: "Trinity College Dublin", domain: "tcd.ie" },
  { name: "University College Dublin (Smurfit)", domain: "ucd.ie" },

  // Estero — Portogallo
  { name: "Nova School of Business & Economics", domain: "novasbe.pt" },
  { name: "Católica Lisbon School of Business & Economics", domain: "ucp.pt" },

  // Estero — Stati Uniti
  { name: "Harvard University", domain: "harvard.edu" },
  { name: "Massachusetts Institute of Technology (MIT)", domain: "mit.edu" },
  { name: "Stanford University", domain: "stanford.edu" },
  { name: "University of Pennsylvania (Wharton)", domain: "upenn.edu" },
  { name: "Columbia University", domain: "columbia.edu" },
  { name: "University of Chicago (Booth)", domain: "uchicago.edu" },
  { name: "Yale University", domain: "yale.edu" },
  { name: "Princeton University", domain: "princeton.edu" },
  { name: "University of California, Berkeley", domain: "berkeley.edu" },
];

export const ALLOWED_STUDENT_DOMAINS = ITALIAN_UNIVERSITY_DOMAINS.map((u) => u.domain);

// Associations First Build (docs/02_MIRA_ASSOCIATIONS_FIRST_BUILD.md) is
// scoped to Bocconi associations only: students can sign up from any
// university (that's what ITALIAN_UNIVERSITY_DOMAINS is for), but browsing
// and applying to associations is gated to this exact value of
// student_profiles.university until other universities' associations exist.
export const BOCCONI_UNIVERSITY_NAME = "Università Bocconi";

function domainMatches(emailDomain: string, allowedDomain: string): boolean {
  return emailDomain === allowedDomain || emailDomain.endsWith(`.${allowedDomain}`);
}

export type PasswordErrorCode = "too_short" | "no_uppercase" | "no_number" | "no_special";
export type StudentEmailErrorCode = "invalid_format" | "non_institutional_domain";

export function validatePassword(password: string): {
  valid: boolean;
  error: string | null;
  errorCode: PasswordErrorCode | null;
} {
  if (password.length < 8) {
    return { valid: false, error: "Almeno 8 caratteri.", errorCode: "too_short" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Almeno una lettera maiuscola.", errorCode: "no_uppercase" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Almeno un numero.", errorCode: "no_number" };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: "Almeno un carattere speciale (es. ! ? # -).", errorCode: "no_special" };
  }
  return { valid: true, error: null, errorCode: null };
}

export function validateStudentEmail(email: string): {
  valid: boolean;
  domain: string | null;
  error: string | null;
  errorCode: StudentEmailErrorCode | null;
} {
  const parts = email.toLowerCase().trim().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, domain: null, error: "Formato email non valido.", errorCode: "invalid_format" };
  }

  const domain = parts[1];
  const isAllowed = ALLOWED_STUDENT_DOMAINS.some((d) => domainMatches(domain, d));

  if (!isAllowed) {
    return {
      valid: false,
      domain,
      error: "Usa la tua email istituzionale universitaria (es. nome.cognome@studenti.tuateneo.it).",
      errorCode: "non_institutional_domain",
    };
  }

  return { valid: true, domain, error: null, errorCode: null };
}
