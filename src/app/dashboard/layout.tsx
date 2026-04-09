import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-session";
import { LogoutButton } from "@/components/LogoutButton";

const nav = [
  { href: "/dashboard", label: "Home" },
  { href: "/dashboard/bills", label: "Bills" },
  { href: "/dashboard/income", label: "Income" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-[var(--card-border)] bg-[var(--background)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/dashboard"
              className="font-[800] tracking-tight"
              style={{ fontFamily: "var(--font-syne), system-ui" }}
            >
              BillFlow
            </Link>
            <nav className="flex gap-1">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-lg px-3 py-1.5 text-sm text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--foreground)]"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-[var(--muted)] sm:inline">
              {user.email}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
