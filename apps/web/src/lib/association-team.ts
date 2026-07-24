/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Person } from "@/app/(dashboard)/association/[slug]/board/members-list";

export interface PendingRequest {
  id: string;
  title: string | null;
  profile: { full_name: string | null; email: string };
}

export interface TeamData {
  people: Person[];
  sections: { id: string; name: string }[];
  pendingRequests: PendingRequest[];
}

/**
 * Carica le persone di un'associazione (attivi + richieste in attesa), le sezioni e i dati di
 * corso/livello dal blocco header della MiraCard. Estratto per essere condiviso tra la tab
 * Membri e l'onboarding guidato, che mostrano lo stesso team.
 *
 * Corso e livello vengono dal blocco header approvato della MiraCard, non da
 * student_profiles.degree_program (di fatto abbandonato): la card e' cio' che lo studente
 * compila davvero, e "approved" e' cio' che l'associazione puo' gia' vedere aprendola.
 */
export async function loadTeamData(
  supabase: any,
  associationId: string,
  currentUserId: string,
  degreeLevelLabel: (level: string | null) => string | null
): Promise<TeamData> {
  const { data: allMemberships } = await (supabase.from("association_memberships") as any)
    .select("id, user_id, role, title, permissions, status, section_id, created_at")
    .eq("association_id", associationId)
    .in("status", ["active", "pending_approval"])
    .order("created_at");

  const userIds = (allMemberships ?? []).map((m: any) => m.user_id).filter(Boolean);

  const [{ data: profilesData }, { data: studentProfiles }, { data: sectionsData }] = await Promise.all([
    userIds.length
      ? (supabase.from("profiles") as any).select("id, full_name, email").in("id", userIds)
      : Promise.resolve({ data: [] }),
    userIds.length
      ? (supabase.from("student_profiles") as any).select("id, user_id, degree_level, degree_program").in("user_id", userIds)
      : Promise.resolve({ data: [] }),
    (supabase.from("association_sections") as any).select("id, name, position").eq("association_id", associationId).order("position"),
  ]);

  const profileMap = new Map<string, any>((profilesData ?? []).map((p: any) => [p.id, p]));
  const studentMap = new Map<string, any>((studentProfiles ?? []).map((s: any) => [s.user_id, s]));

  const studentProfileIds = (studentProfiles ?? []).map((s: any) => s.id).filter(Boolean);
  const { data: headerBlocks } = studentProfileIds.length
    ? await (supabase.from("card_blocks") as any)
        .select("student_profile_id, prose_content")
        .eq("block_type", "header")
        .eq("status", "approved")
        .in("student_profile_id", studentProfileIds)
    : { data: [] };

  const headerByStudentProfile = new Map<string, any>(
    (headerBlocks ?? []).map((b: any) => [b.student_profile_id, b.prose_content ?? {}])
  );

  const active = (allMemberships ?? []).filter((m: any) => m.status === "active");
  const pendingRows = (allMemberships ?? []).filter((m: any) => m.status === "pending_approval");

  const people: Person[] = active
    .map((m: any) => {
      const p = profileMap.get(m.user_id);
      const s = studentMap.get(m.user_id);
      const header = s?.id ? headerByStudentProfile.get(s.id) : null;
      return {
        membershipId: m.id as string,
        profileId: m.user_id as string,
        role: m.role as string,
        title: (m.title as string | null) ?? null,
        sectionId: (m.section_id as string | null) ?? null,
        isSelf: m.user_id === currentUserId,
        fullName: (p?.full_name as string | null) ?? null,
        email: (p?.email as string) ?? "—",
        degreeLevel: degreeLevelLabel((header?.livello as string | null) || ((s?.degree_level as string | null) ?? null)),
        degreeProgram: ((header?.corso as string | null)?.trim() || (s?.degree_program as string | null)) ?? null,
      };
    })
    .sort((a: Person, b: Person) => {
      const adminA = a.role !== "association_member" ? 0 : 1;
      const adminB = b.role !== "association_member" ? 0 : 1;
      if (adminA !== adminB) return adminA - adminB;
      return (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email);
    });

  const sections = ((sectionsData ?? []) as any[]).map((s) => ({ id: s.id as string, name: s.name as string }));

  const pendingRequests: PendingRequest[] = pendingRows.map((m: any) => {
    const p = profileMap.get(m.user_id);
    return {
      id: m.id as string,
      title: (m.title as string | null) ?? null,
      profile: { full_name: (p?.full_name as string | null) ?? null, email: (p?.email as string) ?? "—" },
    };
  });

  return { people, sections, pendingRequests };
}
