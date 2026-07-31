"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  publishSeededAssociation,
  unpublishSeededAssociation,
} from "@/lib/actions/association-seeding";

/**
 * Barra di revisione mostrata all'admin MIRA sopra la vetrina di un'associazione.
 * La pagina sotto è esattamente quella che vedrà lo studente — non un'anteprima
 * separata — così non può esistere uno scarto fra ciò che si approva e ciò che si
 * pubblica.
 */
export function AssociationDraftAdminBar({
  associationId,
  slug,
  published,
}: {
  associationId: string;
  slug: string;
  published: boolean;
}) {
  const t = useTranslations("AdminSeededAssociations");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);
    const result = published
      ? await unpublishSeededAssociation(associationId)
      : await publishSeededAssociation(associationId);
    if (result.error) {
      window.alert(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="sticky top-0 z-40 -mx-2 mb-6 border-b border-border bg-white/95 px-2 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className={`text-eyebrow uppercase rounded-full px-2 py-0.5 font-medium ${
            published ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {published ? t("statusPublished") : t("statusDraft")}
        </span>

        <p className="text-body-sm text-ink-secondary">
          {published ? t("barPublishedHint") : t("barDraftHint")}
        </p>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/admin/associations/seminate"
            className="text-body-sm text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700"
          >
            {t("backToList")}
          </Link>
          <button
            onClick={handleToggle}
            disabled={loading}
            className={`rounded-md px-4 py-1.5 text-body-sm text-white transition-colors duration-100 disabled:opacity-40 ${
              published ? "bg-navy hover:bg-navy-700" : "bg-petrol hover:bg-petrol-700"
            }`}
          >
            {loading ? t("working") : published ? t("unpublish") : t("publish")}
          </button>
        </div>
      </div>
    </div>
  );
}
