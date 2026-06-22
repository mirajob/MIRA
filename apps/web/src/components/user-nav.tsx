"use client";

import { signOut } from "@/lib/actions/auth";

interface UserNavProps {
  fullName: string | null;
  email: string;
}

export function UserNav({ fullName, email }: UserNavProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-white text-[10px] font-semibold">
          {(fullName ?? email).charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-navy truncate">
            {fullName ?? "Utente"}
          </p>
          <p className="text-[10px] text-ink-tertiary truncate">{email}</p>
        </div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="text-xs text-ink-secondary hover:text-error transition-colors duration-100"
        >
          Esci
        </button>
      </form>
    </div>
  );
}
