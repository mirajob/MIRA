import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <Link href="/">
            <img
              src="/brand/mira-lockup.svg"
              alt="MIRA"
              className="mx-auto h-7"
            />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
