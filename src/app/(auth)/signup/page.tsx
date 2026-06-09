"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signup } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signup, undefined);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <Link href="/" className="text-2xl font-black tracking-tight text-white">
            task<span className="text-[#F97316]">rel</span>
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-white">Create your account</h1>
          <p className="mt-1 text-sm text-slate-400">Free to start — no credit card required</p>
        </div>

        <form action={action} className="space-y-4">
          <Input
            label="Business name"
            name="business_name"
            type="text"
            placeholder="ABC Painting LLC"
            autoComplete="organization"
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            minLength={8}
            required
          />

          {state?.error && (
            <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={pending}>
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-[#F97316] font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
