"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { inviteCandidatesToSession } from "@/lib/actions/interview-booking";
import { setSessionSharedPlace } from "@/lib/actions/interview-sessions";

export interface InvitableCandidate {
  applicationId: string;
  name: string;
  email: string;
  /** Già invitato a questo round. */
  invited: boolean;
  /** Ha già scelto un orario. */
  booked: boolean;
}

export interface InvitePreview {
  sessionTitle: string;
  description: string | null;
  mode: "online" | "in_person";
  /** "auto" | "shared" | "per_interview" */
  linkMode: string;
  /** Il posto già noto, quando la sessione ne ha uno solo per tutti. */
  place: string | null;
}

/**
 * Invito dei candidati al round.
 *
 * Prima di mandare si vede cosa riceveranno: titolo, descrizione, modalità e
 * posto. Serve perché il posto non è sempre noto adesso, e senza dirlo il board
 * non poteva sapere se stava mandando un invito completo o uno a cui mancava
 * ancora l'indirizzo.
 *
 * Il campo per scrivere il posto compare solo quando la sessione ne ha uno solo
 * per tutti e non è stato ancora indicato. Con "un posto diverso per ogni
 * colloquio" non compare, perché lì il posto si mette dopo la prenotazione e un
 * campo qui farebbe credere il contrario.
 */
export function InvitePanel({
  sessionId,
  slug,
  candidates,
  sessionOpen,
  placeMissing,
  placeIsLink,
  preview,
}: {
  sessionId: string;
  slug: string;
  candidates: InvitableCandidate[];
  sessionOpen: boolean;
  /** true solo se la sessione usa un posto unico e non è ancora stato scritto. */
  placeMissing: boolean;
  placeIsLink: boolean;
  preview: InvitePreview;
}) {
  const t = useTranslations("Interviews");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [place, setPlace] = useState("");

  const notInvited = candidates.filter((c) => !c.invited);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function invite() {
    if (!selected.size) return;
    setLoading(true);

    // Il posto prima dell'invito: così la conferma di prenotazione lo contiene
    // già e al candidato arriva una mail sola invece di due.
    if (placeMissing && place.trim()) {
      const saved = await setSessionSharedPlace({ sessionId, slug, place });
      if (saved.error) {
        window.alert(saved.error);
        setLoading(false);
        return;
      }
    }

    const result = await inviteCandidatesToSession({
      sessionId,
      slug,
      applicationIds: [...selected],
    });
    if (result.error) window.alert(result.error);
    else {
      setSelected(new Set());
      setConfirming(false);
    }
    router.refresh();
    setLoading(false);
  }

  // Cosa comparirà nell'invito al posto dell'indirizzo.
  const placeLine =
    preview.mode === "online"
      ? preview.linkMode === "auto"
        ? t("previewPlaceAuto")
        : preview.linkMode === "per_interview"
          ? t("previewPlaceLater")
          : (place.trim() || preview.place || t("previewPlaceMissing"))
      : preview.linkMode === "per_interview"
        ? t("previewPlaceLater")
        : (place.trim() || preview.place || t("previewPlaceMissing"));

  return (
    <div className="rounded-lg border border-border bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-body-sm font-medium text-navy">{t("inviteHeading")}</span>
        <span className="text-body-sm text-ink-tertiary">
          {t("inviteSummary", { toInvite: notInvited.length })}
        </span>
        <span className="ml-auto text-body-sm text-ink-tertiary">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {!candidates.length ? (
            <p className="text-body-sm text-ink-secondary">{t("noCandidates")}</p>
          ) : (
            <>
              <div className="max-h-72 space-y-0.5 overflow-y-auto">
                {candidates.map((c) => (
                  <label
                    key={c.applicationId}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 ${
                      c.invited ? "opacity-70" : "cursor-pointer hover:bg-paper"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(c.applicationId)}
                      onChange={() => toggle(c.applicationId)}
                      disabled={c.invited}
                    />
                    <span className="text-body-sm text-navy">{c.name}</span>
                    <span className="text-body-sm text-ink-tertiary">{c.email}</span>
                    <span className="ml-auto text-body-sm">
                      {c.booked ? (
                        <span className="text-success">{t("candidateBooked")}</span>
                      ) : c.invited ? (
                        <span className="text-warning">{t("candidateWaiting")}</span>
                      ) : null}
                    </span>
                  </label>
                ))}
              </div>

              {selected.size > 0 && !confirming && (
                <button
                  onClick={() => setConfirming(true)}
                  disabled={loading || !sessionOpen}
                  className="mt-3 rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
                >
                  {t("inviteCta", { count: selected.size })}
                </button>
              )}

              {/* Anteprima: cosa riceve il candidato, prima di mandarlo davvero. */}
              {confirming && (
                <div className="mt-3 space-y-3 rounded-md border border-border bg-paper p-3">
                  <p className="text-eyebrow uppercase text-navy/60">
                    {t("previewHeading", { count: selected.size })}
                  </p>

                  <div className="space-y-1 text-body-sm">
                    <p className="text-navy font-medium">{preview.sessionTitle}</p>
                    {preview.description && (
                      <p className="whitespace-pre-wrap text-ink-secondary">{preview.description}</p>
                    )}
                    <p className="text-ink">
                      {preview.mode === "online" ? t("modeOnline") : t("modeInPerson")}
                      {" · "}
                      <span className="text-ink-secondary">{placeLine}</span>
                    </p>
                    <p className="text-ink-tertiary">{t("previewTimeNote")}</p>
                  </div>

                  {placeMissing && (
                    <div>
                      <label className="mb-1 block text-eyebrow uppercase text-navy/60">
                        {t("placeBeforeInvite")}
                      </label>
                      <input
                        value={place}
                        onChange={(e) => setPlace(e.target.value)}
                        placeholder={placeIsLink ? t("linkPlaceholder") : t("locationPlaceholder")}
                        className="w-full rounded-md border border-border px-3 py-1.5 text-body-sm text-ink focus:border-petrol focus:outline-none"
                      />
                      <p className="mt-1 text-body-sm text-ink-tertiary">{t("placeBeforeInviteHint")}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <button
                      onClick={invite}
                      disabled={loading || !sessionOpen}
                      className="rounded-md bg-petrol px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-petrol-700 disabled:opacity-40"
                    >
                      {loading ? t("working") : t("previewSendCta", { count: selected.size })}
                    </button>
                    <button
                      onClick={() => setConfirming(false)}
                      className="text-body-sm text-ink-secondary hover:underline"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
