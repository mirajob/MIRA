export const ALLOWED_STUDENT_DOMAINS = ["studbocconi.it", "gmail.com"] as const;

export function validateStudentEmail(email: string): {
  valid: boolean;
  domain: string | null;
  error: string | null;
} {
  const parts = email.toLowerCase().trim().split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, domain: null, error: "Invalid email format" };
  }

  const domain = parts[1];
  const isAllowed = (ALLOWED_STUDENT_DOMAINS as readonly string[]).includes(domain);

  if (!isAllowed) {
    return {
      valid: false,
      domain,
      error: `Email domain @${domain} is not allowed. MIRA is currently restricted to Bocconi University students (@studbocconi.it).`,
    };
  }

  return { valid: true, domain, error: null };
}
