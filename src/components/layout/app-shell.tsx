"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  CalendarBlank,
  FileText,
  Gear,
  HouseLine,
  Lightning,
  MagnifyingGlass,
  Plus,
  Receipt,
  UserList,
  Wrench,
} from "@/components/ui/icons";
import type { Trade } from "@/types";
import { TaskrelWordmark } from "@/components/brand/taskrel-wordmark";

type ShellContractor = {
  business_name: string | null;
  email: string | null;
  trade: Trade | null;
  primary_trade: Trade | null;
};

const nav = [
  { href: "/dashboard", label: "Dashboard", Icon: HouseLine },
  { href: "/jobs", label: "Jobs", Icon: Wrench },
  { href: "/quotes", label: "Quotes", Icon: FileText },
  { href: "/invoices", label: "Invoices", Icon: Receipt },
  { href: "/clients", label: "Clients", Icon: UserList },
  { href: "/ai-assistant", label: "Notices", Icon: Lightning },
  { href: "/settings", label: "Settings", Icon: Gear },
];

const mobileNav = nav.filter(item =>
  ["/dashboard", "/jobs", "/quotes", "/invoices", "/ai-assistant"].includes(item.href)
);

export function AppShell({
  children,
  contractor,
}: {
  children: ReactNode;
  contractor: ShellContractor | null;
}) {
  const pathname = usePathname();
  const businessName = contractor?.business_name || "Taskrel";

  return (
    <div className="min-h-screen bg-[var(--tr-bg)] text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-[var(--tr-border)] bg-[var(--tr-shell)]/95 backdrop-blur xl:flex xl:flex-col">
        <div className="border-b border-[var(--tr-border)] px-6 py-6">
          <Link href="/dashboard" className="block">
            <TaskrelWordmark size="md" />
          </Link>
        </div>

        <div className="px-4 py-5">
          <Link
            href="/quotes/new"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f] transition-colors hover:bg-[#a9c6ff]"
          >
            <Plus size={18} weight="bold" />
            Create New
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {nav.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`group relative flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-white/10 text-white"
                    : "text-[var(--tr-text-muted)] hover:bg-white/6 hover:text-white"
                }`}
              >
                {active && <span className="absolute left-0 h-7 w-1 rounded-full bg-[var(--tr-blue)]" />}
                <Icon size={22} weight={active ? "duotone" : "regular"} className={active ? "text-[var(--tr-blue)]" : ""} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--tr-border)] p-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="truncate text-sm font-semibold text-white">{businessName}</p>
            <p className="truncate text-xs text-[var(--tr-text-faint)]">{contractor?.email ?? "Contractor workspace"}</p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 hidden h-16 border-b border-[var(--tr-border)] bg-[var(--tr-bg)]/82 px-6 backdrop-blur-xl xl:ml-[272px] xl:flex xl:items-center xl:justify-between">
        <label className="flex h-11 w-full max-w-md items-center gap-3 rounded-xl border border-[var(--tr-border)] bg-[#0a1020]/80 px-4">
          <MagnifyingGlass size={20} className="text-[var(--tr-text-faint)]" />
          <input
            placeholder="Search jobs, clients, or quotes..."
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-[var(--tr-text-faint)] focus:outline-none"
          />
        </label>
        <div className="flex items-center gap-3">
          <Link href="/calendar" className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--tr-border)] text-[var(--tr-text-muted)] hover:text-white">
            <CalendarBlank size={20} />
          </Link>
          <Link href="/quotes/new" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f]">
            <Plus size={17} weight="bold" />
            Create
          </Link>
        </div>
      </header>

      <header className="sticky top-0 z-30 border-b border-[var(--tr-border)] bg-[var(--tr-bg)]/95 px-4 py-3 backdrop-blur-xl safe-top xl:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <Link href="/dashboard" className="min-w-0">
            <TaskrelWordmark size="sm" />
            <span className="sr-only">Taskrel dashboard</span>
          </Link>
          <Link
            href="/quotes/new"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[var(--tr-blue)] px-3 text-sm font-black text-[#09204f] shadow-lg shadow-blue-950/20"
          >
            <Plus size={17} weight="bold" />
            Create
          </Link>
        </div>
      </header>

      <main className="pb-24 xl:ml-[272px] xl:pb-0">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--tr-border)] bg-[var(--tr-bg)]/95 backdrop-blur safe-bottom xl:hidden">
        <div className="mx-auto flex max-w-lg items-stretch">
          {mobileNav.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors ${
                  active ? "text-[var(--tr-blue)]" : "text-[var(--tr-text-faint)]"
                }`}
              >
                <Icon size={22} weight={active ? "duotone" : "regular"} />
                {label.replace("Dashboard", "Home")}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
