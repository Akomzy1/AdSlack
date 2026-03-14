import Link from "next/link";
import type { Route } from "next";
import { SavedProvider } from "@/contexts/SavedContext";
import { NotificationBell } from "@/components/nav/NotificationBell";

function NavItem({ href, icon, label, badge }: {
  href: Route;
  icon: string;
  label: string;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
    >
      <span className="flex items-center gap-2.5">
        <span>{icon}</span>
        {label}
      </span>
      {badge && (
        <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-semibold text-accent">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-border bg-surface flex flex-col">
        <nav className="flex flex-col gap-0.5 p-3 pt-4">
          <NavItem href={"/discover" as Route} icon="🔍" label="Discover" />
          <NavItem href={"/saved"    as Route} icon="🔖" label="Saved Ads" />
          <NavItem href={"/products" as Route} icon="📊" label="Products" badge="PRO" />
          <NavItem href={"/alerts"   as Route} icon="🔔" label="Alerts" />
          <NavItem href={"/billing"  as Route} icon="💳" label="Billing" />
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top nav bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-5">
          <Link href="/discover" className="text-sm font-semibold text-foreground hover:text-accent transition-colors">
            Adslack
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/alerts"
              className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-surface-2 hover:text-foreground transition-colors"
            >
              Alerts
            </Link>
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <SavedProvider>{children}</SavedProvider>
        </main>
      </div>
    </div>
  );
}
