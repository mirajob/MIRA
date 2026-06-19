"use client";

import { signOut } from "@/lib/actions/auth";

interface UserNavProps {
  fullName: string | null;
  email: string;
}

export function UserNav({ fullName, email }: UserNavProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white text-label">
        {(fullName ?? email).charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-body-sm font-medium text-navy truncate">
          {fullName ?? "Utente"}
        </p>
        <p className="text-eyebrow text-ink-tertiary truncate">{email}</p>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="text-body-sm text-ink-secondary hover:text-navy transition-colors duration-100"
        >
          Esci
        </button>
      </form>
    </div>
  );
}
