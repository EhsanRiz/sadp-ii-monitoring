import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard, Sprout, Users2, MapPin, ShieldCheck } from 'lucide-react';
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
  { to: '/admin/users', label: 'Users', icon: Users2, superAdminOnly: true },
  { to: '/admin/districts', label: 'Geography', icon: MapPin, superAdminOnly: true },
  { to: '/admin/organizations', label: 'Organizations', icon: ShieldCheck, superAdminOnly: true },
];

/**
 * App shell with a left nav and content outlet. Visible only to authenticated
 * users (RoleGate handles the auth check at the route level).
 */
export function AppShell() {
  const { user, role, isSuperAdmin, signOut } = useAuth();
  const visible = items.filter((i) => !i.superAdminOnly || isSuperAdmin);

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="border-r bg-muted/30">
        <div className="p-6">
          <div className="text-lg font-semibold">SADP-II</div>
          <div className="text-xs text-muted-foreground">Monitoring</div>
        </div>
        <nav className="px-3 space-y-1">
          {visible.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
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
        <div className="absolute bottom-0 w-[260px] p-4 border-t bg-background hidden md:block">
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          <div className="text-xs font-medium capitalize mb-2">
            {role?.replace('_', ' ') ?? 'unknown role'}
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="p-6 md:p-8 max-w-6xl">
        <Outlet />
      </main>
    </div>
  );
}
