import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, type AppRole } from '@/lib/auth';

interface RoleGateProps {
  roles?: AppRole[];
  children: ReactNode;
  /**
   * If true, also allow Super Admin. Defaults to true — Super Admin sees everything.
   * Set false on the rare case where the route is strictly tenant-scoped.
   */
  superAdminBypass?: boolean;
}

/**
 * Wraps a route's children. Behaviour:
 *   - Still loading?     → spinner.
 *   - Not authenticated? → redirect to /login (with `from` in state for return).
 *   - Wrong role?        → redirect to /unauthorized.
 *   - Otherwise          → render children.
 *
 * Usage:
 *   <Route element={<RoleGate roles={['super_admin']}><AdminLayout /></RoleGate>}>
 *     <Route path="users" element={<UsersPage />} />
 *   </Route>
 */
export function RoleGate({ roles, children, superAdminBypass = true }: RoleGateProps) {
  const { user, role, loading, isSuperAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && roles.length > 0) {
    const ok = (superAdminBypass && isSuperAdmin) || (role && roles.includes(role));
    if (!ok) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}
