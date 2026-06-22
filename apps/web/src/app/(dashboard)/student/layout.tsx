import { StudentBottomNav } from "@/components/student-bottom-nav";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="pb-16">{children}</div>
      <StudentBottomNav />
    </>
  );
}
