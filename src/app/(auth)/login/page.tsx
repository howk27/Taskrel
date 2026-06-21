"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";

const proofItems = [
  "Return to quotes waiting on review",
  "Pick up invoice and follow-up work",
  "Keep client records tied to each job",
];

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex flex-1 items-center px-5 py-8 md:px-8">
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-[0.9fr_1fr] md:items-center">
        <section className="space-y-6">
          <Link href="/" aria-label="Taskrel home">
            <TaskrelWordmark size="sm" />
          </Link>
          <div>
            <p className="text-sm font-bold text-[var(--tr-amber)]">Back to the work queue</p>
            <h1 className="mt-3 max-w-sm text-3xl font-extrabold leading-tight text-white md:text-4xl">
              Open the next quote, invoice, or follow-up without hunting.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-[var(--tr-text-muted)]">
              Taskrel keeps the quote-to-cash trail in one place for small trade businesses.
            </p>
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
            <h2 className="text-xl font-bold text-white">Welcome back</h2>
            <p className="mt-1 text-sm text-[var(--tr-text-muted)]">Log in to your workspace.</p>
          </div>

          <form action={action} className="space-y-4">
            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              defaultValue={state?.values?.email ?? ""}
              required
            />
            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              required
            />

            {state?.error && (
              <p className="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                {state.error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={pending}>
              Log in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--tr-text-muted)]">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-[var(--tr-orange)] hover:underline">
              Sign up
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
