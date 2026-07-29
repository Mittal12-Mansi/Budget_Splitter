import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import { LogOut, Home, Users, BookOpen, Activity, Wallet, RefreshCw } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";


export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/groups", label: "Groups", icon: Users },
    { href: "/personal", label: "Personal Tracker", icon: Wallet },
    { href: "/docs", label: "Documentation", icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <aside className="w-full md:w-64 border-r border-border bg-sidebar shrink-0 md:h-screen sticky top-0 flex flex-col">
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
        <div className="flex items-center gap-2 font-display text-xl font-bold tracking-tight text-primary">
          <Activity className="h-6 w-6" />
          <span>Splitter</span>
        </div>
        <NotificationBell />
    </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium ${
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-sidebar-border mt-auto">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-mono">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
