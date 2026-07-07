import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CopyLink } from "./copy-link";

export default async function AdminUsersPage() {
  const ctx = await getUserContext();
  if (!ctx.isMiraAdmin) redirect("/student");

  const supabase = await createServiceClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*, global_role_assignments(role), student_profiles(university, degree_program, onboarding_completed)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) console.error("admin users query error:", error);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-h1 text-navy">Utenti</h1>
        <p className="mt-1 text-body text-ink-secondary">
          Tutti gli utenti registrati su MIRA
        </p>
      </div>

      <div className="rounded-lg border border-border bg-white p-5">
        <p className="text-label text-navy mb-1">Link di iscrizione generale</p>
        <p className="text-body-sm text-ink-secondary mb-3">
          Condividi questo link per far registrare nuovi studenti su MIRA (email @studbocconi.it o @gmail.com).
        </p>
        <CopyLink url="https://mirajob.cloud/signup" />
      </div>

      {!profiles?.length ? (
        <div className="rounded-lg border border-border bg-white p-8 text-center">
          <p className="text-body text-ink-secondary">Nessun utente registrato</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Nome</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Email</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Ruoli</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Corso</th>
                <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">Registrato</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const roles = (p.global_role_assignments as Array<{ role: string }>)?.map((r) => r.role) ?? [];
                const student = (p.student_profiles as Array<Record<string, unknown>>)?.[0];
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white text-eyebrow font-semibold">
                          {(p.full_name ?? p.email).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-body font-medium text-navy">{p.full_name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink">{p.email}</td>
                    <td className="py-4 px-4">
                      <div className="flex gap-1 flex-wrap">
                        {roles.map((role) => (
                          <span key={role} className="inline-flex items-center px-2 py-0.5 rounded-full text-eyebrow font-medium bg-petrol-50 text-petrol-700 uppercase">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink">
                      {(student?.degree_program as string) ?? "—"}
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink-secondary">
                      {new Date(p.created_at).toLocaleDateString("it-IT")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
