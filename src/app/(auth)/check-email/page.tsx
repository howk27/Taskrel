import Link from "next/link";
import { EnvelopeSimple } from "@/components/ui/icons";

export default function CheckEmailPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F97316]/10">
          <EnvelopeSimple size={34} weight="duotone" className="text-[#F97316]" />
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
