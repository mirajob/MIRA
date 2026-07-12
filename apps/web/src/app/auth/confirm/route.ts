import { NextResponse } from "next/server";
import { createServerClient } from "@mira/supabase/server";

/**
 * Conferma email via token_hash (template Supabase personalizzato:
 * {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email).
 *
 * A differenza di /auth/callback (?code= + PKCE), verifyOtp non dipende dal
 * code_verifier salvato nel browser della registrazione: il link funziona anche
 * aperto da un altro browser o dall'app email del telefono — il caso reale più
 * comune, ed esattamente quello che faceva fallire le conferme.
 */
const VALID_TYPES = ["email", "signup", "invite", "magiclink", "recovery", "email_change"] as const;
type EmailOtpType = (typeof VALID_TYPES)[number];

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const next = searchParams.get("next") ?? "/api/auth/redirect";

  const type = VALID_TYPES.includes(rawType as EmailOtpType) ? (rawType as EmailOtpType) : null;

  if (tokenHash && type) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Email confirm verifyOtp error:", error.message);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
