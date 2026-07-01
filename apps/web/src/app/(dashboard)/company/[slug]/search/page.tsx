import { getCompanyContext } from "@/lib/auth";
import { CompanySearchClient } from "./company-search-client";
import { loadCompanySearches } from "@/lib/actions/company-search";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CompanySearchPage({ params }: Props) {
  const { slug } = await params;
  await getCompanyContext(slug);
  const searches = await loadCompanySearches(slug);

  return <CompanySearchClient slug={slug} initialSearches={searches} />;
}
