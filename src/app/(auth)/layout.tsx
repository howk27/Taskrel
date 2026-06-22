export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--tr-bg)] flex flex-col">
      {children}
    </div>
  );
}
