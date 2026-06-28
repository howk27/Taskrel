"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/lib/actions/auth";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <main className="flex flex-1 items-center px-5 py-8 md:px-8">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" aria-label="Taskrel home" className="mb-8 inline-flex">
          <TaskrelWordmark size="sm" />
        </Link>

        <section className="rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[var(--tr-text)]">Create your account</h2>
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
              <p className="text-sm text-[var(--tr-text-muted)]">
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
            <Link href="/login" className="font-medium text-[var(--tr-primary)] hover:underline">
              Log in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
