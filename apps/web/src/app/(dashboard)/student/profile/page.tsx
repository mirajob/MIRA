import { getUserContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { createServerClient } from "@mira/supabase/server";

export default async function StudentProfilePage() {
  const ctx = await getUserContext();
  if (!ctx.isStudent) redirect("/login");

  const supabase = await createServerClient();
  const { data: studentProfile } = await supabase
    .from("student_profiles")
    .select("*")
    .eq("user_id", ctx.profile.id)
    .single();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Il tuo profilo</h1>

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-gray-500">Nome</p>
            <p className="text-sm">{ctx.profile.full_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-sm">{ctx.profile.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Università</p>
            <p className="text-sm">{studentProfile?.university ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Corso di laurea</p>
            <p className="text-sm">{studentProfile?.degree_program ?? "Da completare"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Anno</p>
            <p className="text-sm">{studentProfile?.current_year ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Onboarding</p>
            <p className="text-sm">
              {studentProfile?.onboarding_completed
                ? "Completato"
                : "Da completare"}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Libretto</p>
            <p className="text-sm">
              {studentProfile?.transcript_uploaded
                ? "Caricato"
                : "Non caricato"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
