"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addCandidateNote } from "@/lib/actions/candidates";
import { APP_TIME_ZONE } from "@/lib/format-date";

export interface CandidateNote {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

/**
 * Le note del board su un candidato, raggruppate per chi le ha scritte.
 *
 * Prima era un riquadro senza spiegazione in fondo alla pagina, e nessuno poteva
 * intuire a cosa servisse. Il raggruppamento per autore serve quando il
 * colloquio lo fanno persone diverse: quello che conta non è solo cosa è stato
 * scritto, ma chi lo pensa.
 */
export function CandidateNotes({
  applicationId,
  notes,
  dateLocale,
}: {
  applicationId: string;
  notes: CandidateNote[];
  dateLocale: string;
}) {
  const t = useTranslations("CandidateNotes");
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    await addCandidateNote(applicationId, text.trim());
    setText("");
    router.refresh();
    setSaving(false);
  }

  const byAuthor = new Map<string, CandidateNote[]>();
  for (const note of notes) {
    byAuthor.set(note.authorName, [...(byAuthor.get(note.authorName) ?? []), note]);
  }

  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-eyebrow uppercase text-navy/70">{t("heading")}</p>
        <p className="mt-0.5 text-body-sm text-ink-secondary">{t("explainer")}</p>
      </div>

      <div className="space-y-3 px-4 py-3">
        <div className="flex flex-wrap items-start gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder={t("placeholder")}
            className="min-w-[240px] flex-1 rounded-md border border-border px-3 py-1.5 text-body-sm text-ink focus:border-petrol focus:outline-none"
          />
          <button
            onClick={save}
            disabled={saving || !text.trim()}
            className="rounded-md bg-navy px-4 py-1.5 text-body-sm text-white transition-colors duration-100 hover:bg-navy-700 disabled:opacity-40"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>

        {notes.length === 0 ? (
          <p className="text-body-sm text-ink-tertiary">{t("empty")}</p>
        ) : (
          <div className="space-y-3">
            {[...byAuthor.entries()].map(([author, authorNotes]) => (
              <div key={author}>
                <p className="text-body-sm font-medium text-navy">{author}</p>
                <div className="mt-1 space-y-1.5 border-l-2 border-border pl-3">
                  {authorNotes.map((note) => (
                    <div key={note.id}>
                      <p className="text-body-sm text-ink whitespace-pre-wrap">{note.text}</p>
                      <p className="text-xs text-ink-tertiary">
                        {new Date(note.createdAt).toLocaleString(dateLocale, {
                          timeZone: APP_TIME_ZONE,
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
