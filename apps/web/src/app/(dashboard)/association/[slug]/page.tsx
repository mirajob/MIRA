import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AssociationDashboardPage({ params }: Props) {
  const { slug } = await params;
  redirect(`/association/${slug}/cycles`);
}
