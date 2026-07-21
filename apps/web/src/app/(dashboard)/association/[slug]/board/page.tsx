/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServiceClient } from "@mira/supabase/server";
import { getUserContext } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InviteCodeSection } from "./invite-code-section";
import { PendingBoardRequests } from "./pending-board-requests";
import { MembershipToggle } from "./membership-toggle";
import { MembersList, type Person } from "./members-list";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MembersPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createServiceClient();
  const ctx = await getUserContext();
  const currentUserId = (ctx.profile as any).id as string;
  const t = await getTranslations("Board");
  const tDegree = await getTranslations("SignupPage");

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug, invite_code, membership_enabled")
    .eq("slug", slug)
    .maybeSingle();

  if (!association) notFound();

  const membershipEnabled = Boolean(association.membership_enabled);

  const { data: allMemberships } = await (supabase.from("association_memberships") as any)
    .select("id, user_id, role, title, permissions, status, section_id, created_at")
    .eq("association_id", association.id)
    .in("status", ["active", "pending_approval"])
    .order("created_at");

  const userIds = (allMemberships ?? []).map((m: any) => m.user_id).filter(Boolean);

  // Il corso e il livello di studi stanno su student_profiles, non su profiles: servono
  // per mostrare "Magistrale · Economics" accanto a ogni persona.
  const [{ data: profilesData }, { data: studentProfiles }, { data: sectionsData }] = await Promise.all([
    userIds.length
      ? (supabase.from("profiles") as any).select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? (supabase.from("student_profiles") as any)
          .select("user_id, degree_level, degree_program")
          .in("user_id", userIds)
      : Promise.resolve({ data: [] }),
    (supabase.from("association_sections") as any)
      .select("id, name, position")
      .eq("association_id", association.id)
      .order("position"),
  ]);

  const profileMap = new Map<string, any>((profilesData ?? []).map((p: any) => [p.id, p]));
  const studentMap = new Map<string, any>((studentProfiles ?? []).map((s: any) => [s.user_id, s]));

  function degreeLevelLabel(level: string | null) {
    if (!level) return null;
    return tDegree.has(`degreeLevels.${level}`) ? tDegree(`degreeLevels.${level}`) : level;
  }

  const active = (allMemberships ?? []).filter((m: any) => m.status === "active");
  const pending = (allMemberships ?? []).filter((m: any) => m.status === "pending_approval");

  // Una lista sola: amministratori e membri insieme, gli amministratori in cima cosi'
  // si vede subito chi ha accesso alla dashboard.
  const people: Person[] = active
    .map((m: any) => {
      const p = profileMap.get(m.user_id);
      const s = studentMap.get(m.user_id);
      return {
        membershipId: m.id as string,
        profileId: m.user_id as string,
        role: m.role as string,
        title: (m.title as string | null) ?? null,
        sectionId: (m.section_id as string | null) ?? null,
        isSelf: m.user_id === currentUserId,
        fullName: (p?.full_name as string | null) ?? null,
        email: (p?.email as string) ?? "—",
        degreeLevel: degreeLevelLabel((s?.degree_level as string | null) ?? null),
        degreeProgram: (s?.degree_program as string | null) ?? null,
      };
    })
    .sort((a: Person, b: Person) => {
      const adminA = a.role !== "association_member" ? 0 : 1;
      const adminB = b.role !== "association_member" ? 0 : 1;
      if (adminA !== adminB) return adminA - adminB;
      return (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email);
    });

  const sections = ((sectionsData ?? []) as any[]).map((s) => ({ id: s.id as string, name: s.name as string }));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-h2 text-navy">{t("heading")}</h2>
        <p className="mt-0.5 text-body-sm text-ink-secondary">{t("subhead")}</p>
      </div>

      <InviteCodeSection
        associationId={association.id}
        currentCode={association.invite_code}
        membershipEnabled={membershipEnabled}
      />

      <MembershipToggle associationId={association.id} enabled={membershipEnabled} />

      {pending.length > 0 && (
        <PendingBoardRequests
          associationId={association.id}
          requests={pending.map((m: any) => {
            const p = profileMap.get(m.user_id);
            return {
              id: m.id as string,
              title: (m.title as string | null) ?? null,
              profile: {
                full_name: (p?.full_name as string | null) ?? null,
                email: (p?.email as string) ?? "—",
              },
            };
          })}
        />
      )}

      <MembersList
        associationId={association.id}
        slug={slug}
        sections={sections}
        people={people}
        membershipEnabled={membershipEnabled}
      />
    </div>
  );
}
