import { getCompanyContext } from "@/lib/auth";
import { CompanyProfileClient } from "./company-profile-client";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CompanyProfilePage({ params }: Props) {
  const { slug } = await params;
  const { company } = await getCompanyContext(slug);
  return <CompanyProfileClient slug={slug} company={company} />;
}
