// Institutional email domains for Italian universities. Students authenticate
// with a `nome.cognome@<domain>` (or a subdomain of it, e.g. `studenti.<domain>`)
// address issued by their university — this is how MIRA verifies someone is a
// real enrolled student without requiring manual review.
//
// Sourced from the CRUI (Conferenza dei Rettori delle Università Italiane)
// institutional contact list, cross-checked against each university's own IT
// services pages for the exact student-facing domain. Two universities issue
// students a domain that is NOT a subdomain of their institutional domain
// (Bocconi, Cattolica) — those are listed with their student-specific domain
// directly, matching is still a plain suffix check against the value below.
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
];

export const ALLOWED_STUDENT_DOMAINS = ITALIAN_UNIVERSITY_DOMAINS.map((u) => u.domain);

function domainMatches(emailDomain: string, allowedDomain: string): boolean {
  return emailDomain === allowedDomain || emailDomain.endsWith(`.${allowedDomain}`);
}

export function validatePassword(password: string): { valid: boolean; error: string | null } {
  if (password.length < 8) {
    return { valid: false, error: "Almeno 8 caratteri." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Almeno una lettera maiuscola." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Almeno un numero." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: "Almeno un carattere speciale (es. ! ? # -)." };
  }
  return { valid: true, error: null };
}

export function validateStudentEmail(email: string): {
  valid: boolean;
  domain: string | null;
  error: string | null;
} {
  const parts = email.toLowerCase().trim().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, domain: null, error: "Formato email non valido." };
  }

  const domain = parts[1];
  const isAllowed = ALLOWED_STUDENT_DOMAINS.some((d) => domainMatches(domain, d));

  if (!isAllowed) {
    return {
      valid: false,
      domain,
      error: "Usa la tua email istituzionale universitaria (es. nome.cognome@studenti.tuateneo.it).",
    };
  }

  return { valid: true, domain, error: null };
}
