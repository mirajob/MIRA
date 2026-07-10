"use client";

import { useTranslations } from "next-intl";
import { signOut } from "@/lib/actions/auth";

export function LogoutButton() {
  const c = useTranslations("Common");
  return (
    <button
      onClick={() => signOut()}
      className="text-body-sm text-ink-secondary hover:text-error transition-colors duration-100"
    >
      {c("signOut")}
    </button>
  );
}
