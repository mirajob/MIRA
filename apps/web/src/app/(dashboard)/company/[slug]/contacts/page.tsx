import { getCompanyContext } from "@/lib/auth";
import { loadCompanyContacts } from "@/lib/actions/company-contacts";
import { CompanyContactsClient } from "./company-contacts-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CompanyContactsPage({ params }: Props) {
  const { slug } = await params;
  await getCompanyContext(slug);
  const contacts = await loadCompanyContacts(slug);

  return <CompanyContactsClient slug={slug} initialContacts={contacts} />;
}
