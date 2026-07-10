import { createServerClient } from "@mira/supabase/server";
import { KnowledgeUploadForm } from "./knowledge-upload-form";
import { getLocale, getTranslations } from "next-intl/server";

const STATUS_STYLES: Record<string, string> = {
  uploaded: "bg-warning-bg text-warning",
  extracting: "bg-petrol-50 text-petrol-700",
  chunking: "bg-petrol-50 text-petrol-700",
  embedding: "bg-petrol-50 text-petrol-700",
  ready: "bg-success-bg text-success",
  failed: "bg-error-bg text-error",
};

export default async function KnowledgeBasePage() {
  const supabase = await createServerClient();
  const t = await getTranslations("AdminKnowledgeBase");
  const locale = await getLocale();
  const dateLocale = locale === "it" ? "it-IT" : "en-US";

  const { data: documents } = await supabase
    .from("knowledge_documents")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-h1 text-navy">{t("heading")}</h1>
        <p className="mt-1 text-body text-ink-secondary">
          {t("subhead")}
        </p>
      </div>

      <KnowledgeUploadForm />

      <div>
        <h2 className="font-display text-h2 text-navy mb-4">{t("uploadedDocsHeading")}</h2>
        {!documents?.length ? (
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <p className="text-body text-ink-secondary">{t("noDocuments")}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-white overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableTitle")}</th>
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableType")}</th>
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableScope")}</th>
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableStatus")}</th>
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableUploadedBy")}</th>
                  <th className="text-left text-eyebrow text-navy/60 uppercase py-3 px-4">{t("tableDate")}</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-border last:border-0 hover:bg-navy-50/50">
                    <td className="py-4 px-4 text-body font-medium text-navy">{doc.title}</td>
                    <td className="py-4 px-4 text-body-sm text-ink">{t.has(`sourceTypes.${doc.source_type}`) ? t(`sourceTypes.${doc.source_type}`) : doc.source_type}</td>
                    <td className="py-4 px-4 text-body-sm text-ink">{t.has(`scopes.${doc.visibility_scope}`) ? t(`scopes.${doc.visibility_scope}`) : doc.visibility_scope}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-eyebrow font-medium uppercase ${STATUS_STYLES[doc.processing_status] ?? "bg-navy-50 text-navy"}`}>
                        {t.has(`processingStatus.${doc.processing_status}`) ? t(`processingStatus.${doc.processing_status}`) : doc.processing_status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink">
                      {(doc.profiles as { full_name: string | null })?.full_name ?? "—"}
                    </td>
                    <td className="py-4 px-4 text-body-sm text-ink-secondary">
                      {new Date(doc.created_at).toLocaleDateString(dateLocale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
