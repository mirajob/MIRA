"use client";

import { signOut } from "@/lib/actions/auth";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut()}
      className="text-body-sm text-ink-secondary hover:text-error transition-colors duration-100"
    >
      Esci
    </button>
  );
}
