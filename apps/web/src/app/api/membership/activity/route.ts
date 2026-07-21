import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth";
import { createServiceClient } from "@mira/supabase/server";
import { canManageMembers } from "@/lib/association-access";

export async function POST(request: Request) {
  const ctx = await getUserContext();
  const { membershipId, activityDescription, title } = await request.json();

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileId = (ctx.profile as any).id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("id, user_id, association_id")
    .eq("id", membershipId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  // Puo' modificare chi e' il diretto interessato, oppure chi gestisce i membri
  // dell'associazione. Prima era ammessa la sola auto-modifica, ma MemberActions viene
  // montato esclusivamente sulle righe ALTRUI: il pulsante "Ruolo" rispondeva sempre 403.
  const isSelf = membership.user_id === profileId;
  const canManage = await canManageMembers(supabase, membership.association_id, profileId, ctx.isMiraAdmin);

  if (!isSelf && !canManage) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const updateData: Record<string, unknown> = {};
  if (activityDescription !== undefined) updateData.activity_description = activityDescription;
  if (title !== undefined) updateData.title = title;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("association_memberships") as any)
    .update(updateData)
    .eq("id", membershipId);

  return NextResponse.json({ success: true });
}
