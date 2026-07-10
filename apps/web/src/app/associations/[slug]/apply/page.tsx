import { createServerClient, createServiceClient } from "@mira/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { getLocale, getTranslations } from "next-intl/server";
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
  const t = await getTranslations("ApplyPage");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

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

  const notYetOpen = cycle && (cycle as any).opens_at && new Date((cycle as any).opens_at) > new Date();

  if (!cycle || notYetOpen) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="max-w-md text-center space-y-4 px-4">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="mx-auto h-7" />
          <h1 className="font-display text-h1 text-navy mt-8">
            {notYetOpen ? t("notYetOpenHeading") : t("closedHeading")}
          </h1>
          <p className="text-body text-ink-secondary">
            {notYetOpen
              ? t("opensOnBody", { name: association.name, date: new Date((cycle as any).opens_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }) })
              : t("noCyclesBody", { name: association.name })}
          </p>
          <Link href={`/associations/${slug}`} className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
            {t("backToAssociationPage")}
          </Link>
        </div>
      </div>
    );
  }

  const svc = await createServiceClient();
  const { data: questions } = await (svc.from("application_questions") as any)
    .select("*")
    .eq("application_cycle_id", cycle.id)
    .order("order_index");

  const positions = ((cycle as any).available_roles ?? []) as Array<{ name: string; description?: string }>;

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
          <h1 className="font-display text-h1 text-navy mt-8">{t("alreadyAppliedHeading")}</h1>
          <p className="text-body text-ink-secondary">
            {t("alreadyAppliedBody")}
          </p>
          <Link href="/student" className="text-petrol underline underline-offset-2 decoration-1 hover:text-petrol-700">
            {t("goToDashboard")}
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
        <p className="text-eyebrow text-navy/60 uppercase mb-2">{t("eyebrow")}</p>
        <h1 className="font-display text-display-md text-navy">{association.name}</h1>
        <p className="mt-1 text-body text-ink-secondary">{cycle.title}</p>
        {(cycle as any).description && (
          <p className="mt-3 text-body text-ink whitespace-pre-wrap">{(cycle as any).description}</p>
        )}
        {cycle.closes_at && (
          <p className="mt-2 text-body-sm text-ink-tertiary">
            {t("closesOn", { date: new Date(cycle.closes_at).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }) })}
          </p>
        )}

        {positions.length > 0 && (
          <div className="mt-6">
            <h2 className="text-label text-navy mb-3">{t("positionsHeading")}</h2>
            <div className="space-y-2">
              {positions.map((p, i) => (
                <div key={i} className="rounded-md border border-border bg-white px-4 py-3">
                  <p className="text-body font-medium text-navy">{p.name}</p>
                  {p.description && <p className="text-body-sm text-ink-secondary mt-1">{p.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <ApplicationForm
            cycleId={cycle.id}
            positions={positions.map(p => p.name)}
            questions={(questions ?? []).map((q: any) => ({
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
