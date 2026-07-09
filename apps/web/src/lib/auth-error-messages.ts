export type AuthErrorKey = "invalid_credentials" | "user_already_registered" | "generic";

export function getAuthErrorKey(message: string): AuthErrorKey {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "invalid_credentials";
  if (normalized.includes("already registered") || normalized.includes("already exists")) return "user_already_registered";
  return "generic";
}
