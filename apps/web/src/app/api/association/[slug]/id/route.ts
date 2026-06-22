import { createServerClient } from "@mira/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("association_profiles")
    .select("id, name")
    .eq("slug", slug)
    .single();

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ id: data.id, name: data.name });
}
