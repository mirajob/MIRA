"use client";

import { useState } from "react";
import { deleteUserAccount } from "@/lib/actions/admin-delete";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export function DeleteUserButton({ profileId, name }: { profileId: string; name: string }) {
  const t = useTranslations("AdminUsers");
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const router = useRouter();

  async function handleClick() {
    const confirmWord = t("deleteConfirmWord");
    const confirmation = window.prompt(t("deleteConfirmPrompt", { name, word: confirmWord }));
    if (confirmation !== confirmWord) return;

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

  if (deleted) return <span className="text-xs text-ink-tertiary">{t("deletedLabel")}</span>;

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-body-sm text-error hover:underline disabled:opacity-40"
    >
      {loading ? t("deleting") : t("deleteButton")}
    </button>
  );
}
