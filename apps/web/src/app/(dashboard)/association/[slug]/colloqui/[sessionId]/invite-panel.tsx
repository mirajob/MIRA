"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { inviteCandidatesToSession } from "@/lib/actions/interview-booking";

export interface InvitableCandidate {
  applicationId: string;
  name: string;
  email: string;
  /** Già invitato a questo round. */
  invited: boolean;
  /** Ha già scelto un orario. */
  booked: boolean;
}

/**
 * Invito dei candidati al round.
 *
 * Non si sceglie l'orario per loro: si manda il link e lo scelgono. Chi è già
 * stato invitato resta in elenco con il suo stato, così si vede a colpo d'occhio
 * chi non ha ancora prenotato senza tenere un foglio a parte.
 */
export function InvitePanel({
  sessionId,
  slug,
  candidates,
  sessionOpen,
}: {
  sessionId: string;
  slug: string;
  candidates: InvitableCandidate[];
  sessionOpen: boolean;
}) {
  const t = useTranslations("Interviews");
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const notInvited = candidates.filter((c) => !c.invited);
  const waiting = candidates.filter((c) => c.invited && !c.booked);

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
    const result = await inviteCandidatesToSession({
      sessionId,
      slug,
      applicationIds: [...selected],
    });
    if (result.error) window.alert(result.error);
    else setSelected(new Set());
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-border bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="text-body-sm font-medium text-navy">{t("inviteHeading")}</span>
        <span className="text-body-sm text-ink-tertiary">
          {t("inviteSummary", {
            toInvite: notInvited.length,
            waiting: waiting.length,
          })}
        </span>
        <span className="ml-auto text-body-sm text-ink-tertiary">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {!sessionOpen && (
            <p className="mb-3 rounded-md bg-warning-bg px-3 py-2 text-body-sm text-warning">
              {t("inviteNeedsOpen")}
            </p>
          )}

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

              {selected.size > 0 && (
                <button
                  onClick={invite}
                  disabled={loading || !sessionOpen}
                  className="mt-3 rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
                >
                  {loading ? t("working") : t("inviteCta", { count: selected.size })}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
