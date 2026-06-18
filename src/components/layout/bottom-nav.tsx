"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarBlank, FileText, Gear, HouseLine, Receipt } from "@/components/ui/icons";

const nav = [
  { href: "/dashboard", label: "Home", Icon: HouseLine },
  { href: "/quotes", label: "Quotes", Icon: FileText },
  { href: "/calendar", label: "Calendar", Icon: CalendarBlank },
  { href: "/invoices", label: "Invoices", Icon: Receipt },
  { href: "/settings", label: "Settings", Icon: Gear },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--tr-border)] bg-[var(--tr-bg)]/95 backdrop-blur safe-bottom">
      <div className="mx-auto flex max-w-lg items-stretch">
        {nav.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors ${
                active ? "text-[var(--tr-blue)]" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon size={24} weight={active ? "fill" : "regular"} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
