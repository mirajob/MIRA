export type AuthErrorKey = "invalid_credentials" | "user_already_registered" | "email_not_confirmed" | "generic";

export function getAuthErrorKey(message: string): AuthErrorKey {
  const normalized = message.toLowerCase();
  if (normalized.includes("email not confirmed")) return "email_not_confirmed";
  if (normalized.includes("invalid login credentials")) return "invalid_credentials";
  if (normalized.includes("already registered") || normalized.includes("already exists")) return "user_already_registered";
  return "generic";
}
