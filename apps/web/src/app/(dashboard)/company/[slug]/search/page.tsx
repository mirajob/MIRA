import { getCompanyContext } from "@/lib/auth";
import { CompanySearchClient } from "./company-search-client";
import { loadCompanySearches } from "@/lib/actions/company-search";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ searchId?: string }>;
}

export default async function CompanySearchPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { searchId } = await searchParams;
  await getCompanyContext(slug);
  const searches = await loadCompanySearches(slug);

  return <CompanySearchClient slug={slug} initialSearches={searches} initialActiveId={searchId} />;
}
