"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/lib/actions/auth";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { publicLaunch } from "@/lib/public-launch";

const proofItems = [
  "Quote drafts you can edit before sending",
  "Client-ready quote links and follow-up",
  "Invoices, payments, and records connected",
];

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <main className="flex flex-1 items-center px-5 py-8 md:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[0.9fr_1fr] md:items-center">
        <section className="space-y-6">
          <Link href="/" aria-label="Taskrel home">
            <TaskrelWordmark size="sm" />
          </Link>
          <div>
            <p className="text-sm font-bold text-[var(--tr-amber)]">Field-ready setup</p>
            <h1 className="mt-3 max-w-sm text-3xl font-extrabold leading-tight text-white md:text-4xl">
              Start with the quote workflow contractors repeat every week.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-[var(--tr-text-muted)]">{publicLaunch.pricingBody}</p>
          </div>
          <div className="grid gap-3">
            {proofItems.map(item => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] px-4 py-3 text-sm font-semibold text-white">
                <CheckCircle size={18} weight="duotone" className="shrink-0 text-[var(--tr-green)]" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Create your account</h2>
            <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Start free, then keep one simple monthly plan.</p>
          </div>

          <form action={action} className="space-y-4">
            <Input
              label="Name"
              name="name"
              type="text"
              placeholder="ABC Painting LLC"
              autoComplete="organization"
              defaultValue={state?.values?.name ?? ""}
              required
            />
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              defaultValue={state?.values?.email ?? ""}
              required
            />
            <div className="space-y-1">
              <Input
                label="Password"
                name="password"
                type="password"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                pattern="[a-zA-Z0-9]+"
                title="Letters and numbers only - no special characters"
                required
              />
              <p className="text-xs text-[var(--tr-text-faint)]">
                Letters and numbers only. No special characters.
              </p>
            </div>

            {state?.error && (
              <p className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                {state.error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={pending}>
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--tr-text-muted)]">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--tr-orange)] hover:underline">
              Log in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
