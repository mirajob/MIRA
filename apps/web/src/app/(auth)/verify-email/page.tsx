import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="mt-8 space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold">Controlla la tua email</h2>
        <p className="text-sm text-gray-600">
          Ti abbiamo inviato un link di verifica. Clicca sul link nella tua email
          per completare la registrazione.
        </p>
        <p className="text-xs text-gray-500">
          Se non ricevi l&apos;email, controlla la cartella spam.
        </p>
      </div>

      <p className="text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
          Torna al login
        </Link>
      </p>
    </div>
  );
}
