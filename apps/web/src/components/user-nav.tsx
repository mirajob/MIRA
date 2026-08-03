"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { signOut } from "@/lib/actions/auth";

interface UserNavProps {
  fullName: string | null;
  email: string;
  avatarUrl?: string | null;
  /** Dove porta il blocco. Assente per chi non ha una pagina profilo (es. account solo associazione). */
  profileHref?: string | null;
}

/**
 * Il blocco in fondo alla barra: chi sei, e da lì si entra nel proprio account.
 *
 * L'uscita chiede conferma. Prima bastava sfiorare una parola per essere buttati
 * fuori dalla sessione, e riprendere il lavoro voleva dire rifare l'accesso.
 */
export function UserNav({ fullName, email, avatarUrl, profileHref }: UserNavProps) {
  const t = useTranslations("UserNav");
  const c = useTranslations("Common");
  const pathname = usePathname();
  const [confirming, setConfirming] = useState(false);

  const active = Boolean(profileHref && pathname === profileHref);

  const identity = (
    <>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[10px] font-semibold text-white">
          {(fullName ?? email).charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-navy">{fullName ?? t("userFallback")}</p>
        <p className="truncate text-[10px] text-ink-tertiary">{email}</p>
      </div>
    </>
  );

  return (
    <div className="space-y-2">
      {profileHref ? (
        <Link
          href={profileHref}
          className={`-mx-1 flex items-center gap-2 rounded-md px-1 py-1 transition-colors duration-100 ${
            active ? "bg-navy-50" : "hover:bg-navy-50/60"
          }`}
        >
          {identity}
        </Link>
      ) : (
        <div className="flex items-center gap-2">{identity}</div>
      )}

      {confirming ? (
        <div className="space-y-1.5 rounded-md bg-paper px-2 py-2">
          <p className="text-[11px] leading-snug text-ink-secondary">{c("signOutConfirm")}</p>
          <div className="flex items-center gap-2">
            <form action={signOut}>
              <button
                type="submit"
                className="rounded bg-navy px-2 py-1 text-[11px] font-medium text-white transition-colors duration-100 hover:bg-navy-700"
              >
                {c("signOut")}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[11px] text-ink-secondary transition-colors duration-100 hover:text-navy"
            >
              {c("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs text-ink-secondary transition-colors duration-100 hover:text-error"
        >
          {c("signOut")}
        </button>
      )}
    </div>
  );
}
