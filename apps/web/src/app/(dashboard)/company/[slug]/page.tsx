import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function CompanyRootPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/company/${slug}/search`);
}
