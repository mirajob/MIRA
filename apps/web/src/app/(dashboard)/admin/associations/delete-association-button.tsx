"use client";

import { useState } from "react";
import { deleteAssociationAccount } from "@/lib/actions/admin-delete";
import { useRouter } from "next/navigation";

export function DeleteAssociationButton({ associationId, name }: { associationId: string; name: string }) {
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const router = useRouter();

  async function handleClick() {
    const confirmation = window.prompt(
      `Questa azione elimina definitivamente "${name}" e tutti i suoi dati (candidature, board, cicli, ecc). Non è reversibile.\n\nScrivi ELIMINA per confermare.`
    );
    if (confirmation !== "ELIMINA") return;

    setLoading(true);
    const result = await deleteAssociationAccount(associationId);
    if (result.error) {
      window.alert(result.error);
      setLoading(false);
      return;
    }
    setDeleted(true);
    router.refresh();
  }

  if (deleted) return <span className="text-xs text-ink-tertiary">Eliminata</span>;

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
