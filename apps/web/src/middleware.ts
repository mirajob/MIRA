import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@mira/supabase/middleware";

// `/opengraph-image` e `/manifest.json` non sono pagine ma vengono comunque dal matcher:
// senza metterli qui il middleware li rimandava al login, e chi condivideva il link su
// WhatsApp non vedeva nessuna anteprima.
//
// Stesso motivo per `/sw.js` e `/offline.html` (MIRA installata sulla schermata Home):
// il service worker lo scarica anche chi non ha ancora fatto il login, e un redirect al
// login al posto del file lo renderebbe semplicemente non registrabile.
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/verify-email", "/auth/callback", "/auth/confirm", "/associations", "/join", "/aziende", "/privacy", "/termini", "/opengraph-image", "/manifest.json", "/sw.js", "/offline.html"];
const ADMIN_ROUTES = ["/admin"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isAdminRoute(pathname: string): boolean {
  return ADMIN_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (isAdminRoute(pathname)) {
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    const { data: roles } = profile
      ? await (supabase.from("global_role_assignments") as any)
          .select("role")
          .eq("user_id", (profile as any).id)
      : { data: null };

    const isAdmin = (roles ?? []).some((r: any) => r.role === "mira_admin");
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
