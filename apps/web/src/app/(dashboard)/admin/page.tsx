import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminHomePage() {
  const ctx = await getUserContext();

  if (!ctx.isMiraAdmin) {
    redirect("/student");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MIRA Admin</h1>
        <p className="mt-1 text-gray-600">Console di amministrazione</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/invitations"
          className="rounded-lg border bg-white p-6 shadow-sm hover:border-blue-300 transition-colors"
        >
          <h2 className="font-semibold">Inviti</h2>
          <p className="mt-2 text-sm text-gray-600">
            Invita presidenti di associazioni
          </p>
        </Link>

        <Link
          href="/admin/associations"
          className="rounded-lg border bg-white p-6 shadow-sm hover:border-blue-300 transition-colors"
        >
          <h2 className="font-semibold">Associazioni</h2>
          <p className="mt-2 text-sm text-gray-600">
            Gestisci le associazioni registrate
          </p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-lg border bg-white p-6 shadow-sm hover:border-blue-300 transition-colors"
        >
          <h2 className="font-semibold">Utenti</h2>
          <p className="mt-2 text-sm text-gray-600">
            Visualizza e gestisci gli utenti
          </p>
        </Link>

        <Link
          href="/admin/applications"
          className="rounded-lg border bg-white p-6 shadow-sm hover:border-blue-300 transition-colors"
        >
          <h2 className="font-semibold">Candidature</h2>
          <p className="mt-2 text-sm text-gray-600">
            Tutte le candidature sulla piattaforma
          </p>
        </Link>

        <Link
          href="/admin/knowledge-base"
          className="rounded-lg border bg-white p-6 shadow-sm hover:border-blue-300 transition-colors"
        >
          <h2 className="font-semibold">Knowledge Base</h2>
          <p className="mt-2 text-sm text-gray-600">
            Carica documenti per l&apos;AI
          </p>
        </Link>

        <Link
          href="/admin/audit-logs"
          className="rounded-lg border bg-white p-6 shadow-sm hover:border-blue-300 transition-colors"
        >
          <h2 className="font-semibold">Audit Log</h2>
          <p className="mt-2 text-sm text-gray-600">
            Log delle azioni sensibili
          </p>
        </Link>
      </div>
    </div>
  );
}
