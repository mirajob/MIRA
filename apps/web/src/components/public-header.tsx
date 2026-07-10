import Link from "next/link";
import { createServerClient } from "@mira/supabase/server";
import { getTranslations } from "next-intl/server";
import { LogoutButton } from "./logout-button";

export async function PublicHeader() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const t = await getTranslations("PublicHeader");
  const c = await getTranslations("Common");

  return (
    <header className="h-20 px-6 lg:px-12 flex items-center justify-between border-b border-border bg-white">
      <Link href="/">
        <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-7" />
      </Link>
      <div className="flex items-center gap-4">
        <Link href="/associations" className="text-body text-ink-secondary hover:text-navy transition-colors duration-100">
          {t("associationsLink")}
        </Link>
        {user ? (
          <>
            <Link
              href="/api/auth/redirect"
              className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100"
            >
              {t("dashboard")}
            </Link>
            <LogoutButton />
          </>
        ) : (
          <>
            <Link href="/login" className="text-body text-navy hover:text-petrol transition-colors duration-100">
              {c("login")}
            </Link>
            <Link href="/signup" className="bg-navy text-white px-6 py-3 rounded-md text-label hover:bg-navy-700 transition-colors duration-100">
              {c("start")}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
