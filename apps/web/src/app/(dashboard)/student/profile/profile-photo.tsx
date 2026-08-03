"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { uploadProfilePhoto, removeProfilePhoto } from "@/lib/actions/profile-photo";

/**
 * La foto profilo, con accanto la spiegazione di chi la vede.
 *
 * La spiegazione sta qui e non in una pagina di aiuto: il momento in cui uno
 * decide se mettere la propria faccia su una piattaforma è questo, non dopo.
 */
export function ProfilePhoto({
  initialUrl,
  fallback,
}: {
  initialUrl: string | null;
  /** L'iniziale mostrata quando non c'è foto. */
  fallback: string;
}) {
  const t = useTranslations("Profile");
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setBusy(true);
    setError(null);
    const data = new FormData();
    data.append("photo", file);
    const result = await uploadProfilePhoto(data);
    if ("error" in result && result.error) setError(result.error);
    else if ("photoUrl" in result) setUrl(result.photoUrl ?? null);
    setBusy(false);
  }

  async function onRemove() {
    setBusy(true);
    setError(null);
    const result = await removeProfilePhoto();
    if (result.error) setError(result.error);
    else setUrl(null);
    setBusy(false);
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-start gap-5">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-navy-50 text-h3 font-medium text-navy">
            {fallback}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-body font-medium text-navy">{t("photoHeading")}</h2>
          <p className="mt-1 text-body-sm text-ink-secondary">{t("photoIntro")}</p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
            >
              {busy ? t("working") : url ? t("photoReplace") : t("photoAdd")}
            </button>
            {url && (
              <button
                type="button"
                onClick={onRemove}
                disabled={busy}
                className="text-body-sm text-ink-secondary transition-colors hover:text-error disabled:opacity-40"
              >
                {t("photoRemove")}
              </button>
            )}
            <span className="text-body-sm text-ink-tertiary">{t("photoFormats")}</span>
          </div>

          {error && <p className="mt-2 text-body-sm text-error">{error}</p>}

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <dl className="mt-5 space-y-2 border-t border-border pt-4">
        {(["photoSeenAssociations", "photoSeenCompanies", "photoSeenPublic"] as const).map((key) => (
          <div key={key} className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-4">
            <dt className="text-body-sm font-medium text-navy">{t(`${key}.who`)}</dt>
            <dd className="text-body-sm text-ink-secondary">{t(`${key}.what`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
