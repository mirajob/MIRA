import { NextResponse } from "next/server";
import { getUserContext } from "@/lib/auth";
import { createServiceClient } from "@mira/supabase/server";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: Request) {
  const ctx = await getUserContext();
  const { code } = await request.json();

  if (!code) return NextResponse.json({ error: "Inserisci un codice" });

  const supabase = await createServiceClient();
  const profileId = (ctx.profile as any).id as string;

  const { data: association } = await (supabase.from("association_profiles") as any)
    .select("id, name, slug")
    .eq("invite_code", code.trim())
    .maybeSingle();

  if (!association) {
    return NextResponse.json({ error: "Codice non valido" });
  }

  const { data: existing } = await (supabase.from("association_memberships") as any)
    .select("id")
    .eq("association_id", association.id)
    .eq("user_id", profileId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Sei già membro di questa associazione" });
  }

  // Redirect to join page for member/board choice
  return NextResponse.json({
    redirect: `/join/${code}`,
  });
}
