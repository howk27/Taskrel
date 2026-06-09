import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F97316]/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth={1.5} className="w-8 h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">Check your email</h1>
          <p className="mt-2 text-sm text-slate-400">
            We sent a confirmation link to your email. Click it to activate your account.
          </p>
        </div>
        <Link href="/login" className="block text-sm text-[#F97316] hover:underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
