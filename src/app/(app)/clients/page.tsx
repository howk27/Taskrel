import Link from "next/link";
import { redirect } from "next/navigation";
import { EnvelopeSimple, MapPin, Plus, UserList } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/page-header";
import { Surface } from "@/components/ui/surface";
import { formatDate } from "@/lib/format";
import { emptyStateFor } from "@/lib/readiness/setup-readiness";
import { createClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: contractor } = await supabase
    .from("contractors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, email, phone, address, created_at")
    .eq("contractor_id", contractor?.id)
    .order("name", { ascending: true });

  const clientRows = clients ?? [];
  const completeContacts = clientRows.filter(client => client.email || client.phone).length;
  const withAddresses = clientRows.filter(client => client.address).length;
  const empty = emptyStateFor("clients");

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 md:px-8 xl:py-8">
      <PageHeader
        eyebrow="Relationships"
        title="Clients"
        subtitle="A simple client list built from the quotes and jobs you create."
        action={(
          <Link
            href="/quotes/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f] hover:bg-[#a9c6ff]"
          >
            <Plus size={18} weight="bold" />
            New quote
          </Link>
        )}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <ClientMetric label="Total clients" value={String(clientRows.length)} />
        <ClientMetric label="Reachable" value={String(completeContacts)} />
        <ClientMetric label="With addresses" value={String(withAddresses)} />
      </div>

      {clientRows.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {clientRows.map(client => (
            <Surface key={client.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--tr-blue)]/15 text-[var(--tr-blue)]">
                  <UserList size={22} weight="duotone" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{client.name}</p>
                  <p className="mt-1 text-xs text-[var(--tr-text-faint)]">Added {formatDate(client.created_at)}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {client.email && (
                  <p className="flex min-w-0 items-center gap-2 text-[var(--tr-text-muted)]">
                    <EnvelopeSimple size={16} weight="duotone" className="shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </p>
                )}
                {client.phone && <p className="text-[var(--tr-text-muted)]">{client.phone}</p>}
                {client.address && (
                  <p className="flex items-start gap-2 text-[var(--tr-text-faint)]">
                    <MapPin size={16} weight="duotone" className="mt-0.5 shrink-0" />
                    <span>{client.address}</span>
                  </p>
                )}
              </div>
            </Surface>
          ))}
        </div>
      ) : (
        <Surface className="p-10 text-center">
          <UserList size={34} weight="duotone" className="mx-auto mb-3 text-slate-500" />
          <p className="font-semibold text-white">{empty.title}</p>
          <p className="mt-1 text-sm text-[var(--tr-text-muted)]">{empty.body}</p>
          <Link href="/quotes/new" className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--tr-blue)] px-4 text-sm font-bold text-[#09204f]">
            <Plus size={17} weight="bold" />
            {empty.actionLabel}
          </Link>
        </Surface>
      )}
    </div>
  );
}

function ClientMetric({ label, value }: { label: string; value: string }) {
  return (
    <Surface className="p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tr-text-faint)]">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </Surface>
  );
}
