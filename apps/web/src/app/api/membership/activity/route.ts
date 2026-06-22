import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth";
import { createServiceClient } from "@mira/supabase/server";

export async function POST(request: Request) {
  const ctx = await getUserContext();
  const { membershipId, activityDescription } = await request.json();

  const supabase = await createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileId = (ctx.profile as any).id as string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: membership } = await (supabase.from("association_memberships") as any)
    .select("id")
    .eq("id", membershipId)
    .eq("user_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("association_memberships") as any)
    .update({ activity_description: activityDescription })
    .eq("id", membershipId);

  return NextResponse.json({ success: true });
}
