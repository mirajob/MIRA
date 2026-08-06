import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { APP_TIME_ZONE } from "@/lib/format-date";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Chi usa MIRA come app: installazioni e notifiche.
 *
 * Serve a rispondere a una domanda sola, che vale mesi di lavoro: ha senso fare l'app
 * degli store? Se gli studenti aggiungono MIRA alla schermata Home e la riaprono da lì,
 * la risposta arriva da questi numeri invece che a intuito.
 *
 * Due limiti da tenere a mente leggendo la tabella:
 * - su iPhone non esiste nessun evento di installazione. Di quegli studenti sappiamo solo
 *   quando hanno aperto MIRA dall'icona, ed è la prima apertura a fare da data.
 * - si conta da quando questa pagina esiste (agosto 2026). Niente dati retroattivi.
 */

interface Riga {
  id: string;
  nome: string | null;
  email: string;
  installedAt: string | null;
  lastOpenAt: string | null;
  platform: string | null;
  dispositivi: number;
}

const PIATTAFORME: Record<string, string> = {
  ios: "iPhone",
  android: "Android",
  desktop: "Computer",
};

export default async function AdminAppPage() {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";
  const supabase = await createServiceClient();

  const { data: profiles, error } = await (supabase.from("profiles") as any)
    .select("id, full_name, email, app_installed_at, app_last_open_at, app_platform")
    .not("app_last_open_at", "is", null)
    .order("app_last_open_at", { ascending: false })
    .limit(500);

  // Finché la migrazione non è applicata la query fallisce: meglio dirlo che mostrare
  // una pagina vuota che sembra "nessuno l'ha installata".
  const migrazioneMancante = Boolean(error);

  const { data: subs } = await (supabase.from("push_subscriptions") as any).select("user_id, platform, created_at");

  const perUtente = new Map<string, number>();
  for (const s of (subs ?? []) as any[]) {
    perUtente.set(s.user_id as string, (perUtente.get(s.user_id as string) ?? 0) + 1);
  }

  const righe: Riga[] = ((profiles ?? []) as any[]).map((p) => ({
    id: p.id as string,
    nome: (p.full_name as string) ?? null,
    email: p.email as string,
    installedAt: (p.app_installed_at as string) ?? null,
    lastOpenAt: (p.app_last_open_at as string) ?? null,
    platform: (p.app_platform as string) ?? null,
    dispositivi: perUtente.get(p.id as string) ?? 0,
  }));

  const settimana = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const attiveSettimana = righe.filter((r) => r.lastOpenAt && new Date(r.lastOpenAt).getTime() > settimana).length;
  const conNotifiche = perUtente.size;
  const dispositiviTotali = (subs ?? []).length;

  function quando(iso: string | null): string {
    if (!iso) return "–";
    return new Date(iso).toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: APP_TIME_ZONE,
    });
  }

  const statistiche = [
    { valore: righe.length, etichetta: "Hanno aperto MIRA dall'icona" },
    { valore: attiveSettimana, etichetta: "Attivi negli ultimi 7 giorni" },
    { valore: conNotifiche, etichetta: "Con notifiche attive" },
    { valore: dispositiviTotali, etichetta: "Dispositivi iscritti" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-h2 font-semibold text-navy">App e notifiche</h1>
        <p className="mt-1 text-body-sm text-ink-secondary">
          Chi ha aggiunto MIRA alla schermata Home del telefono e chi riceve le notifiche. Su iPhone il momento
          dell&apos;installazione non è visibile a nessun sito: lì la data è la prima apertura dall&apos;icona.
        </p>
      </div>

      {migrazioneMancante && (
        <div className="rounded-lg border border-warning/40 bg-warning-bg px-4 py-3">
          <p className="text-body-sm text-warning">
            Le tabelle delle notifiche non sono ancora state create sul database. Finché non lo sono, questa pagina
            resta vuota anche se qualcuno ha installato MIRA.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statistiche.map((s) => (
          <div key={s.etichetta} className="rounded-lg border border-border bg-white px-4 py-3">
            <p className="text-h2 font-semibold tabular-nums text-navy">{s.valore}</p>
            <p className="mt-0.5 text-xs text-ink-secondary">{s.etichetta}</p>
          </div>
        ))}
      </div>

      {righe.length === 0 ? (
        <p className="rounded-lg border border-border bg-white px-4 py-6 text-center text-body-sm text-ink-tertiary">
          Nessuno ha ancora aperto MIRA dall&apos;icona.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-white">
          <table className="w-full text-left text-body-sm">
            <thead className="border-b border-border text-xs uppercase text-ink-tertiary">
              <tr>
                <th className="px-4 py-2.5 font-medium">Studente</th>
                <th className="px-4 py-2.5 font-medium">Dispositivo</th>
                <th className="px-4 py-2.5 font-medium">Dal</th>
                <th className="px-4 py-2.5 font-medium">Ultima apertura</th>
                <th className="px-4 py-2.5 font-medium">Notifiche</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((r) => (
                <tr key={r.id} className="border-b border-border/50 last:border-b-0">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-navy">{r.nome ?? "–"}</p>
                    <p className="text-xs text-ink-tertiary">{r.email}</p>
                  </td>
                  <td className="px-4 py-2.5 text-ink-secondary">
                    {r.platform ? (PIATTAFORME[r.platform] ?? r.platform) : "–"}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-secondary">{quando(r.installedAt)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-ink-secondary">{quando(r.lastOpenAt)}</td>
                  <td className="px-4 py-2.5">
                    {r.dispositivi > 0 ? (
                      <span className="rounded bg-success-bg px-2 py-0.5 text-xs font-medium text-success">
                        {r.dispositivi === 1 ? "attive" : `attive · ${r.dispositivi}`}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-tertiary">no</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
