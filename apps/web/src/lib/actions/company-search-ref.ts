import { createHmac } from "crypto";

// Opaque token: HMAC(searchId, studentId) — reversible server-side, opaque to clients.
// Plain helper module (no "use server"): Next.js requires every export of a
// Server Actions file to be an async function, and these are synchronous by design.
function makeRef(searchId: string, studentId: string): string {
  return createHmac("sha256", searchId).update(studentId).digest("base64url").slice(0, 20);
}

export function resolveStudentRef(searchId: string, token: string, students: { id: string }[]): string | null {
  return students.find((s) => makeRef(searchId, s.id) === token)?.id ?? null;
}

export { makeRef };
