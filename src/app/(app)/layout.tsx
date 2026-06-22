import { AppShell } from "@/components/layout/app-shell";
import { getCurrentWorkspace } from "@/lib/auth/workspace";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { contractor } = await getCurrentWorkspace();

  return (
    <AppShell contractor={contractor}>
      {children}
    </AppShell>
  );
}
