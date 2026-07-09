"use client";

import { useState } from "react";
import { deleteUserAccount } from "@/lib/actions/admin-delete";
import { useRouter } from "next/navigation";

export function DeleteUserButton({ profileId, name }: { profileId: string; name: string }) {
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const router = useRouter();

  async function handleClick() {
    const confirmation = window.prompt(
      `Questa azione elimina definitivamente l'account di "${name}" e tutti i suoi dati (candidature, associazioni, chat, ecc). Non è reversibile.\n\nScrivi ELIMINA per confermare.`
    );
    if (confirmation !== "ELIMINA") return;

    setLoading(true);
    const result = await deleteUserAccount(profileId);
    if (result.error) {
      window.alert(result.error);
      setLoading(false);
      return;
    }
    setDeleted(true);
    router.refresh();
  }

  if (deleted) return <span className="text-xs text-ink-tertiary">Eliminato</span>;

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-body-sm text-error hover:underline disabled:opacity-40"
    >
      {loading ? "Eliminazione..." : "Elimina"}
    </button>
  );
}
