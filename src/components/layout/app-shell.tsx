"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarBlank,
  DeviceMobile,
  FileText,
  Gear,
  HouseLine,
  MagnifyingGlass,
  Moon,
  Plus,
  Receipt,
  Sun,
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
  { href: "/settings", label: "Settings", Icon: Gear },
];

const mobileNav = nav.filter(item =>
  ["/dashboard", "/jobs", "/quotes", "/invoices"].includes(item.href)
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
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);

  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === "system") {
      root.removeAttribute("data-theme");
      window.localStorage.setItem("taskrel-theme", "system");
      return;
    }

    root.setAttribute("data-theme", themeMode);
    window.localStorage.setItem("taskrel-theme", themeMode);
  }, [themeMode]);

  return (
    <div className="min-h-screen bg-[var(--tr-bg)] text-[var(--tr-text)]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-[var(--tr-border)] bg-[var(--tr-shell)]/98 xl:flex xl:flex-col">
        <div className="border-b border-[var(--tr-border)] px-6 py-6">
          <Link href="/dashboard" className="block">
            <TaskrelWordmark size="md" />
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {nav.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`group relative flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[var(--tr-surface-2)] text-[var(--tr-text)]"
                    : "text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface)] hover:text-[var(--tr-text)]"
                }`}
              >
                {active && <span className="absolute left-0 h-7 w-1 rounded-full bg-[var(--tr-primary)]" />}
                <Icon size={22} weight={active ? "duotone" : "regular"} className={active ? "text-[var(--tr-primary)]" : ""} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--tr-border)] p-4">
          <ThemeToggle mode={themeMode} onChange={setThemeMode} expanded />
          <div className="mt-3 rounded-xl bg-[var(--tr-surface)] p-3 shadow-[inset_0_0_0_1px_var(--tr-border-soft)]">
            <p className="truncate text-sm font-semibold text-[var(--tr-text)]">{businessName}</p>
            <p className="truncate text-xs text-[var(--tr-text-faint)]">{contractor?.email ?? "Contractor workspace"}</p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 hidden h-16 grid-cols-[1fr_minmax(320px,480px)_1fr] items-center border-b border-[var(--tr-border)] bg-[var(--tr-bg)]/92 px-6 backdrop-blur-xl xl:ml-[272px] xl:grid">
        <label className="col-start-2 flex h-11 w-full items-center gap-3 rounded-lg border border-[var(--tr-border)] bg-[var(--tr-bg-soft)] px-4">
          <MagnifyingGlass size={20} className="text-[var(--tr-text-faint)]" />
          <input
            placeholder="Search jobs, clients, or quotes..."
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--tr-text)] placeholder:text-[var(--tr-text-faint)] focus:outline-none"
          />
        </label>
        <div className="col-start-3 flex items-center justify-end gap-3">
          <ThemeToggle mode={themeMode} onChange={setThemeMode} />
          <Link href="/calendar" className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--tr-border)] text-[var(--tr-text-muted)] hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)]">
            <CalendarBlank size={20} />
          </Link>
          <Link href="/quotes/new" className="tr-primary-action inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold">
            <Plus size={17} weight="bold" />
            New quote
          </Link>
        </div>
      </header>

      <header className="sticky top-0 z-30 border-b border-[var(--tr-border)] bg-[var(--tr-bg)]/95 px-4 backdrop-blur-xl safe-top xl:hidden">
        <div className="mx-auto grid h-14 max-w-lg grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
          <Link href="/dashboard" className="flex min-w-0 items-center">
            <TaskrelWordmark size="sm" />
            <span className="sr-only">Taskrel dashboard</span>
          </Link>
          <ThemeToggle mode={themeMode} onChange={setThemeMode} />
          <Link
            href="/quotes/new"
            className="tr-primary-action inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-black"
          >
            <Plus size={17} weight="bold" />
            Quote
          </Link>
        </div>
      </header>

      <main className="pb-24 xl:ml-[272px] xl:pb-0">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--tr-border)] bg-[var(--tr-bg)]/95 backdrop-blur safe-bottom xl:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-4 items-stretch">
          {mobileNav.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors ${
                  active ? "text-[var(--tr-primary)]" : "text-[var(--tr-text-faint)]"
                }`}
              >
                <Icon size={22} weight={active ? "duotone" : "regular"} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

type ThemeMode = "system" | "light" | "dark";

function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";

  const saved = window.localStorage.getItem("taskrel-theme");
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

function ThemeToggle({
  mode,
  onChange,
  expanded = false,
}: {
  mode: ThemeMode;
  onChange: (mode: ThemeMode) => void;
  expanded?: boolean;
}) {
  const nextMode: Record<ThemeMode, ThemeMode> = {
    system: "light",
    light: "dark",
    dark: "system",
  };
  const label = mode === "system" ? "System theme" : mode === "light" ? "Light theme" : "Dark theme";
  const Icon = mode === "system" ? DeviceMobile : mode === "light" ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => onChange(nextMode[mode])}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--tr-border)] bg-[var(--tr-bg-soft)] px-3 text-sm font-semibold text-[var(--tr-text-muted)] transition-colors hover:bg-[var(--tr-surface-2)] hover:text-[var(--tr-text)] ${
        expanded ? "w-full justify-start" : "w-10"
      }`}
      aria-label={`Theme mode: ${label}. Click to change.`}
      title={label}
    >
      <Icon size={18} weight="duotone" />
      {expanded && <span>{label}</span>}
    </button>
  );
}
