import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth";
import { createServiceClient } from "@mira/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: Request) {
  const ctx = await getUserContext();
  const { membershipId, associationId, action } = await request.json();

  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: myMembership } = await (supabase.from("association_memberships") as any)
    .select("role, permissions")
    .eq("association_id", associationId)
    .eq("user_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  const canManage =
    ctx.isMiraAdmin ||
    myMembership?.role === "association_president" ||
    (myMembership?.permissions as Record<string, boolean>)?.manage_board_permissions;

  if (!canManage) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  const { data: target } = await (supabase.from("association_memberships") as any)
    .select("user_id, role")
    .eq("id", membershipId)
    .single();

  if (!target) return NextResponse.json({ error: "Membro non trovato" }, { status: 404 });
  if (target.user_id === profileId) return NextResponse.json({ error: "Non puoi modificare te stesso" }, { status: 400 });
  if (target.role === "association_president") return NextResponse.json({ error: "Non puoi modificare il presidente" }, { status: 400 });

  if (action === "promote") {
    await (supabase.from("association_memberships") as any)
      .update({
        role: "association_admin",
        permissions: { is_board: true },
      })
      .eq("id", membershipId);
  } else if (action === "demote") {
    await (supabase.from("association_memberships") as any)
      .update({
        role: "association_member",
        permissions: {},
      })
      .eq("id", membershipId);
  }

  return NextResponse.json({ success: true });
}
