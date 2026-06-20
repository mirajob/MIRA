"use server";

import { getUserContext } from "@/lib/auth";
import { scrapeWebsiteText, generateAssociationPage } from "@mira/ai";
import { createServiceClient } from "@mira/supabase/server";
import { revalidatePath } from "next/cache";

export async function generatePageFromWebsite(associationId: string, websiteUrl: string) {
  const ctx = await getUserContext();
  const supabase = await createServiceClient();

  const { data: association } = await supabase
    .from("association_profiles")
    .select("name, slug")
    .eq("id", associationId)
    .single();

  if (!association) return { error: "Associazione non trovata" };

  let websiteText = "";
  try {
    websiteText = await scrapeWebsiteText(websiteUrl);
  } catch {
    return { error: "Impossibile accedere al sito web. Controlla l'URL e riprova." };
  }

  try {
    const page = await generateAssociationPage({
      associationName: association.name,
      websiteText,
    });

    await supabase
      .from("association_profiles")
      .update({
        short_description: page.short_description,
        long_description: page.long_description,
        category: page.suggested_category,
        sectors: page.suggested_sectors,
        team_structure: page.suggested_team_structure,
      })
      .eq("id", associationId);

    await supabase.from("ai_logs").insert({
      module: "association_page_generator",
      provider: "openai",
      model: "gpt-4o-mini",
      entity_type: "association_profile",
      entity_id: associationId,
      user_id: ctx.profile.id,
      input_metadata: { website_url: websiteUrl, text_length: websiteText.length },
      output_summary: { category: page.suggested_category, sectors: page.suggested_sectors },
      status: "success",
    });

    revalidatePath(`/association/${association.slug}/public-page`);
    return { success: true, page };
  } catch (e) {
    await supabase.from("ai_logs").insert({
      module: "association_page_generator",
      provider: "openai",
      model: "gpt-4o-mini",
      entity_type: "association_profile",
      entity_id: associationId,
      user_id: ctx.profile.id,
      status: "error",
      error_message: (e as Error).message,
    });

    return { error: "Errore nella generazione AI. Riprova." };
  }
}
