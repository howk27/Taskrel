"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex flex-1 items-center px-5 py-8 md:px-8">
      <div className="mx-auto w-full max-w-md">
        <Link href="/" aria-label="Taskrel home" className="mb-8 inline-flex">
          <TaskrelWordmark size="sm" />
        </Link>

        <section className="rounded-lg border border-[var(--tr-border-soft)] bg-[var(--tr-surface)] p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-[var(--tr-text)]">Welcome back</h2>
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
            <Link href="/signup" className="font-medium text-[var(--tr-primary)] hover:underline">
              Sign up
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
