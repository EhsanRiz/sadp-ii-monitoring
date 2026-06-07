import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { OfflineBadge } from '@/components/OfflineBadge';
import {
  LogOut,
  LayoutDashboard,
  Sprout,
  FileBarChart,
  Users2,
  MapPin,
  ShieldCheck,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  superAdminOnly?: boolean;
}

const items: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/enterprises', label: 'Enterprises', icon: Sprout },
  { to: '/reports/monthly', label: 'Reports', icon: FileBarChart },
  { to: '/admin/users', label: 'Users', icon: Users2, superAdminOnly: true },
  { to: '/admin/districts', label: 'Geography', icon: MapPin, superAdminOnly: true },
  { to: '/admin/organizations', label: 'Organizations', icon: ShieldCheck, superAdminOnly: true },
];

/**
 * App shell with two layouts:
 *
 *   Desktop (md+): a sticky left nav rail (260px) + content area.
 *   Mobile (<md):  a hamburger drawer that slides over the content, plus
 *                  a top header bar with the brand, hamburger, and
 *                  OfflineBadge.
 *
 * Route changes auto-close the drawer so navigation feels like a normal
 * mobile app instead of leaving the overlay open.
 */
export function AppShell() {
  const { user, role, isSuperAdmin, signOut } = useAuth();
  const visible = items.filter((i) => !i.superAdminOnly || isSuperAdmin);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close the drawer on route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the drawer is open so the page underneath doesn't
  // slide around when the user swipes inside the panel.
  useEffect(() => {
    if (drawerOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [drawerOpen]);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      {/* ===================== Desktop sidebar ===================== */}
      <aside
        className={cn(
          'border-r bg-muted/30 hidden md:flex md:sticky md:top-0 md:h-screen md:flex-col',
        )}
      >
        <SidebarBody
          email={user?.email ?? null}
          role={role}
          items={visible}
          onSignOut={signOut}
        />
      </aside>

      {/* ===================== Mobile drawer ====================== */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-foreground/30"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Sliding panel */}
          <aside
            className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] bg-background border-r shadow-xl flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            <SidebarBody
              email={user?.email ?? null}
              role={role}
              items={visible}
              onSignOut={signOut}
              closeButton={
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden -mr-2"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              }
            />
          </aside>
        </div>
      )}

      {/* ===================== Main column ======================== */}
      <div className="flex flex-col min-w-0">
        {/* Mobile header bar */}
        <header className="md:hidden sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Logo className="h-7" />
              <span className="text-xs font-medium text-muted-foreground truncate">
                SADP-II
              </span>
            </div>
            <OfflineBadge />
          </div>
        </header>

        {/* Page outlet */}
        <main className="p-4 md:p-8 max-w-6xl">
          {/* Desktop top strip — only shown on md+, hidden on mobile where the
              OfflineBadge already lives in the header. */}
          <div className="hidden md:flex justify-end mb-4">
            <OfflineBadge />
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

interface SidebarBodyProps {
  email: string | null;
  role: ReturnType<typeof useAuth>['role'];
  items: NavItem[];
  onSignOut: () => void;
  closeButton?: React.ReactNode;
}

function SidebarBody({ email, role, items, onSignOut, closeButton }: SidebarBodyProps) {
  return (
    <>
      <div className="p-5 border-b space-y-2 flex items-start justify-between gap-2">
        <div className="space-y-2 min-w-0">
          <Logo />
          <div className="text-xs text-muted-foreground font-medium">SADP-II Monitoring</div>
        </div>
        {closeButton}
      </div>
      <nav className="px-3 py-4 space-y-1 flex-1 overflow-y-auto">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              cn(
                // Slightly taller on mobile so the tap target hits the 44px iOS HIG minimum.
                'flex items-center gap-3 rounded-md px-3 py-3 md:py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground',
              )
            }
          >
            <it.icon className="h-4 w-4" />
            {it.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t bg-background">
        <div className="text-xs text-muted-foreground truncate">{email}</div>
        <div className="text-xs font-medium capitalize mb-2">
          {role?.replace('_', ' ') ?? 'unknown role'}
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );
}
