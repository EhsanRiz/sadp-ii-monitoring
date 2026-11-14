/**
 * Public-facing layout for the SADP-II / 4D Climate Solutions website.
 *
 * Wraps the unauthenticated marketing pages (Home, About, Results, Partners)
 * with a shared header + footer. The "Monitoring" entry links to /dashboard —
 * RoleGate bounces unauthenticated visitors to /login and back, so Monitoring
 * stays staff-only while the rest of the site is public.
 *
 * NOTE: copy here is placeholder, written to be edited. No partner is named
 * except 4D Climate Solutions.
 */
import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/results', label: 'Results' },
  { to: '/partners', label: 'Partners' },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
            <img src="/logo-4d-mark.png" alt="" className="h-8 w-8" />
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">SADP-II Monitoring</div>
              <div className="text-[11px] text-muted-foreground">4D Climate Solutions</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
            <Button asChild size="sm" className="ml-2">
              <Link to="/dashboard">
                <LogIn className="mr-1.5 h-4 w-4" /> Monitoring login
              </Link>
            </Button>
          </nav>

          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <nav className="border-t bg-background px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-3 py-2 text-sm font-medium',
                      isActive ? 'bg-muted text-primary' : 'text-muted-foreground',
                    )
                  }
                >
                  {n.label}
                </NavLink>
              ))}
              <Button asChild size="sm" className="mt-2">
                <Link to="/dashboard" onClick={() => setOpen(false)}>
                  <LogIn className="mr-1.5 h-4 w-4" /> Monitoring login
                </Link>
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 md:grid-cols-4">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <img src="/logo-4d-mark.png" alt="" className="h-7 w-7" />
              <span className="font-semibold">SADP-II Monitoring</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Monitoring smallholder agricultural enterprises across Lesotho, implemented by
              4D Climate Solutions.
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explore</div>
            <ul className="mt-3 space-y-2 text-sm">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="text-muted-foreground hover:text-foreground">{n.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Staff</div>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/dashboard" className="text-muted-foreground hover:text-foreground">Monitoring login</Link></li>
              <li><Link to="/reports" className="text-muted-foreground hover:text-foreground">Reports</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</div>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>4D Climate Solutions</li>
              <li>Maseru, Lesotho</li>
              <li className="italic">[Add contact email]</li>
            </ul>
          </div>
        </div>
        <div className="border-t">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
            © {new Date().getFullYear()} 4D Climate Solutions · Smallholder Agriculture Development Project II
          </div>
        </div>
      </footer>
    </div>
  );
}
