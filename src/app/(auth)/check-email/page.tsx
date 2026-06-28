import Link from "next/link";
import { EnvelopeSimple } from "@/components/ui/icons";

export default function CheckEmailPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-[var(--tr-primary-fill)] shadow-[inset_0_0_0_1px_var(--tr-primary-edge)]">
          <EnvelopeSimple size={34} weight="duotone" className="text-[var(--tr-primary)]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[var(--tr-text)]">Check your email</h1>
          <p className="mt-2 text-sm text-[var(--tr-text-muted)]">
            We sent a confirmation link to your email. Click it to activate your account.
          </p>
        </div>
        <Link href="/login" className="block text-sm text-[var(--tr-primary)] hover:underline">
          Back to login
        </Link>
      </div>
    </main>
  );
}
