import Link from "next/link";
import { Scale, LayoutDashboard, FileText, Users, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

export function AppShell({
  children,
  activeRoute,
}: {
  children: React.ReactNode;
  activeRoute?: string;
}) {
  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/contracts/new", label: "New Contract", icon: FileText },
    { href: "/referee", label: "Referee", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-emerald-600" />
            <span className="text-lg font-bold text-slate-900">WeightLock</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={activeRoute === item.href ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
            <form action={signOut}>
              <Button variant="ghost" size="sm" className="gap-2 text-slate-500">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </form>
          </nav>
          {/* Mobile nav */}
          <nav className="flex sm:hidden items-center gap-1">
            {navItems.slice(0, 3).map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={activeRoute === item.href ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-9"
                >
                  <item.icon className="h-4 w-4" />
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
