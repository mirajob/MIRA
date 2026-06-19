import { createServerClient } from "@mira/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { ApplicationForm } from "./application-form";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ cycle?: string }>;
}

export default async function ApplyPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { cycle: cycleId } = await searchParams;
  const user = await getUser();
  const supabase = await createServerClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  if (!user) {
    redirect(`/signup?redirect=/associations/${slug}/apply${cycleId ? `?cycle=${cycleId}` : ""}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const { data: student } = await supabase
    .from("student_profiles")
    .select("id, onboarding_completed")
    .eq("user_id", profile!.id)
    .maybeSingle();

  if (!student?.onboarding_completed) {
    redirect(`/student/onboarding?redirect=/associations/${slug}/apply${cycleId ? `?cycle=${cycleId}` : ""}`);
  }

  let cycle = null;
  if (cycleId) {
    const { data } = await supabase
      .from("application_cycles")
      .select("*")
      .eq("id", cycleId)
      .eq("status", "open")
      .maybeSingle();
    cycle = data;
  } else {
    const { data } = await supabase
      .from("application_cycles")
      .select("*")
      .eq("association_id", association.id)
      .eq("status", "open")
      .order("closes_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    cycle = data;
  }

  if (!cycle) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 px-4">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="mx-auto h-7" />
          <h1 className="font-display text-h1 text-navy mt-8">Candidature chiuse</h1>
          <p className="text-body text-ink-secondary">
            {association.name} non ha cicli di candidatura aperti al momento.
          </p>
          <Link href={`/associations/${slug}`} className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
            Torna alla pagina dell&apos;associazione
          </Link>
        </div>
      </div>
    );
  }

  const { data: questions } = await supabase
    .from("application_questions")
    .select("*")
    .eq("application_cycle_id", cycle.id)
    .order("order_index");

  const { data: existingApp } = await supabase
    .from("applications")
    .select("id")
    .eq("application_cycle_id", cycle.id)
    .eq("student_user_id", profile!.id)
    .maybeSingle();

  if (existingApp) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 px-4">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="mx-auto h-7" />
          <h1 className="font-display text-h1 text-navy mt-8">Candidatura inviata</h1>
          <p className="text-body text-ink-secondary">
            Hai già inviato la tua candidatura per questo ciclo.
          </p>
          <Link href="/student" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
            Vai alla dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="h-20 px-6 lg:px-12 flex items-center border-b border-border bg-white">
        <Link href={`/associations/${slug}`}>
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-7" />
        </Link>
      </header>

      <main className="mx-auto max-w-reading px-6 py-12">
        <p className="text-eyebrow text-navy/60 uppercase mb-2">Candidatura</p>
        <h1 className="font-display text-display-md text-navy">{association.name}</h1>
        <p className="mt-1 text-body text-ink-secondary">{cycle.title}</p>
        {cycle.closes_at && (
          <p className="mt-1 text-body-sm text-ink-tertiary">
            Scadenza: {new Date(cycle.closes_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}

        <div className="mt-8">
          <ApplicationForm
            cycleId={cycle.id}
            questions={(questions ?? []).map(q => ({
              id: q.id,
              questionText: q.question_text,
              questionType: q.question_type,
              required: q.required,
              helperText: q.helper_text,
              options: q.options as string[],
            }))}
            slug={slug}
          />
        </div>
      </main>
    </div>
  );
}
