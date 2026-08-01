import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Quanto ci costa l'AI, letto da ai_logs.
 *
 * Prima questo dato esisteva solo dentro la tabella su Supabase: per sapere se una lettura
 * del libretto era andata bene o quanto era costata bisognava aprire il database. Qui si
 * vede il mese corrente, il dettaglio per modulo e modello, e le ultime chiamate una per una.
 *
 * Il costo è quello che scriviamo noi al momento della chiamata (token per listino), quindi
 * è una stima nostra, non la fattura di Google: serve a capire l'ordine di grandezza e a
 * accorgersi subito se una scelta di modello raddoppia il conto.
 */
export default async function AdminAiUsagePage() {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const supabase = await createServiceClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthRows } = await (supabase.from("ai_logs") as any)
    .select("module, model, provider, status, tokens_input, tokens_output, estimated_cost")
    .gte("created_at", startOfMonth.toISOString());

  const { data: recent } = await (supabase.from("ai_logs") as any)
    .select("created_at, module, model, provider, status, tokens_input, tokens_output, estimated_cost, input_metadata, output_summary, error_message")
    .order("created_at", { ascending: false })
    .limit(40);

  const rows = (monthRows ?? []) as any[];
  const totalCost = rows.reduce((sum, r) => sum + Number(r.estimated_cost ?? 0), 0);
  const totalCalls = rows.length;
  const failed = rows.filter((r) => r.status !== "success").length;

  const byKey = new Map<string, { calls: number; cost: number; tokensIn: number; tokensOut: number }>();
  for (const r of rows) {
    const key = `${r.module} · ${r.model ?? "—"}`;
    const agg = byKey.get(key) ?? { calls: 0, cost: 0, tokensIn: 0, tokensOut: 0 };
    agg.calls += 1;
    agg.cost += Number(r.estimated_cost ?? 0);
    agg.tokensIn += Number(r.tokens_input ?? 0);
    agg.tokensOut += Number(r.tokens_output ?? 0);
    byKey.set(key, agg);
  }
  const grouped = [...byKey.entries()].sort((a, b) => b[1].cost - a[1].cost);

  const money = (value: number) => `$${value.toFixed(4)}`;
  const monthLabel = startOfMonth.toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-eyebrow uppercase text-navy/60">Admin · Consumi AI</p>
        <h1 className="font-display text-h2 text-navy">Quanto stiamo spendendo</h1>
        <p className="mt-0.5 text-body-sm text-ink-secondary">
          Costo stimato al momento della chiamata: token effettivi per il listino del modello. È una nostra
          stima, non la fattura di Google, ma basta per accorgersi se qualcosa raddoppia il conto.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Stat label={`Spesa ${monthLabel}`} value={money(totalCost)} />
        <Stat label="Chiamate del mese" value={String(totalCalls)} />
        <Stat label="Fallite" value={String(failed)} tone={failed > 0 ? "warning" : "normal"} />
      </div>

      <section className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="border-b border-border bg-navy-50/50 px-3 py-1.5">
          <p className="text-eyebrow uppercase text-navy/70">Per modulo e modello, questo mese</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-body-sm">
            <thead>
              <tr className="border-b border-border text-left text-eyebrow uppercase text-navy/60">
                <th className="px-3 py-2 font-medium">Modulo · modello</th>
                <th className="px-3 py-2 font-medium">Chiamate</th>
                <th className="px-3 py-2 font-medium">Token in / out</th>
                <th className="px-3 py-2 font-medium">Costo</th>
                <th className="px-3 py-2 font-medium">Media a chiamata</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-ink-tertiary">
                    Nessuna chiamata questo mese.
                  </td>
                </tr>
              )}
              {grouped.map(([key, agg]) => (
                <tr key={key} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 text-navy font-medium">{key}</td>
                  <td className="px-3 py-2 tabular-nums text-ink">{agg.calls}</td>
                  <td className="px-3 py-2 tabular-nums text-ink-secondary">
                    {agg.tokensIn.toLocaleString("it-IT")} / {agg.tokensOut.toLocaleString("it-IT")}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-ink">{money(agg.cost)}</td>
                  <td className="px-3 py-2 tabular-nums text-ink-tertiary">
                    {agg.calls > 0 ? money(agg.cost / agg.calls) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white overflow-hidden">
        <div className="border-b border-border bg-navy-50/50 px-3 py-1.5">
          <p className="text-eyebrow uppercase text-navy/70">Ultime 40 chiamate</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-body-sm">
            <thead>
              <tr className="border-b border-border text-left text-eyebrow uppercase text-navy/60">
                <th className="px-3 py-2 font-medium">Quando</th>
                <th className="px-3 py-2 font-medium">Modulo</th>
                <th className="px-3 py-2 font-medium">Modello</th>
                <th className="px-3 py-2 font-medium">Esito</th>
                <th className="px-3 py-2 font-medium">Token</th>
                <th className="px-3 py-2 font-medium">Costo</th>
                <th className="px-3 py-2 font-medium">Dettaglio</th>
              </tr>
            </thead>
            <tbody>
              {((recent ?? []) as any[]).map((r, i) => {
                const meta = (r.input_metadata ?? {}) as Record<string, unknown>;
                const out = (r.output_summary ?? {}) as Record<string, unknown>;
                const detail = [
                  out.courses_found != null ? `${out.courses_found} esami` : null,
                  meta.via_text === true ? "letto dal testo" : meta.via_text === false ? "letto dal file" : null,
                  typeof meta.text_reason === "string" && meta.text_reason ? String(meta.text_reason) : null,
                  r.error_message ? String(r.error_message).slice(0, 60) : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap text-ink-tertiary">
                      {new Date(r.created_at).toLocaleString("it-IT", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 text-ink">{r.module}</td>
                    <td className="px-3 py-2 text-ink-secondary">{r.model ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${
                          r.status === "success" ? "bg-success-bg text-success" : "bg-error-bg text-error"
                        }`}
                      >
                        {r.status === "success" ? "ok" : r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink-secondary whitespace-nowrap">
                      {r.tokens_input != null ? `${r.tokens_input} / ${r.tokens_output ?? 0}` : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-ink whitespace-nowrap">
                      {r.estimated_cost != null ? money(Number(r.estimated_cost)) : "—"}
                    </td>
                    <td className="px-3 py-2 text-ink-tertiary">{detail || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warning" }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2">
      <p className="text-eyebrow uppercase text-navy/60">{label}</p>
      <p className={`mt-0.5 text-h3 tabular-nums ${tone === "warning" ? "text-warning" : "text-navy"}`}>{value}</p>
    </div>
  );
}
