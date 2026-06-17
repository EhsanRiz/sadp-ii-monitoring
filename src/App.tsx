import { useEffect, lazy, Suspense, type ComponentType } from 'react';
import {
  Outlet,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  createBrowserRouter,
  createRoutesFromElements,
} from 'react-router-dom';
import { Toaster } from 'sonner';
import { RoleGate } from '@/components/RoleGate';
import { AppShell } from '@/components/AppShell';
import { PageFallback } from '@/components/PageFallback';
import { LoginPage } from '@/pages/LoginPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SetPasswordPage } from '@/pages/SetPasswordPage';
import { SyncConflictsPage } from '@/pages/SyncConflictsPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { INITIAL_URL_TYPE } from '@/lib/initial-url';
// Core day-to-day pages stay in the main bundle (no heavy deps, hot path).
import { EnterprisesListPage } from '@/pages/enterprises/EnterprisesListPage';
import { EnterpriseDetailPage } from '@/pages/enterprises/EnterpriseDetailPage';
import { NewEnterprisePage } from '@/pages/enterprises/NewEnterprisePage';
import { EssfEditPage } from '@/pages/enterprises/EssfEditPage';
import { EmmpEditPage } from '@/pages/enterprises/EmmpEditPage';
import { InspectionEditPage } from '@/pages/enterprises/InspectionEditPage';
import { M1EditPage } from '@/pages/enterprises/M1EditPage';
import { MonitoringVisitEditPage } from '@/pages/enterprises/MonitoringVisitEditPage';
import { UnsavedChangesProvider } from '@/lib/use-unsaved-changes-guard';

/**
 * Lazy-load the heavy / infrequent routes into their own chunks so they don't
 * bloat the initial bundle that every field user downloads on a slow link:
 *   - Dashboard pulls in recharts
 *   - the .pdf routes + Reports pull in @react-pdf/renderer (and xlsx)
 *   - the admin section is super-admin-only
 * `lazyNamed` adapts our named exports to React.lazy's default-export contract.
 */
function lazyNamed<T extends Record<string, ComponentType<object>>>(
  loader: () => Promise<T>,
  name: keyof T,
) {
  return lazy(() => loader().then((m) => ({ default: m[name] })));
}

const DashboardPage = lazyNamed(() => import('@/pages/DashboardPage'), 'DashboardPage');
const CoverPagePdfRoute = lazyNamed(() => import('@/pages/enterprises/CoverPagePdfRoute'), 'CoverPagePdfRoute');
const EsmpPdfRoute = lazyNamed(() => import('@/pages/enterprises/EsmpPdfRoute'), 'EsmpPdfRoute');
const M1PdfRoute = lazyNamed(() => import('@/pages/enterprises/M1PdfRoute'), 'M1PdfRoute');
const ReportsHomePage = lazyNamed(() => import('@/pages/reports/ReportsHomePage'), 'ReportsHomePage');
const ReportsArchivePage = lazyNamed(() => import('@/pages/reports/ReportsArchivePage'), 'ReportsArchivePage');
const OrganizationsAdminPage = lazyNamed(() => import('@/pages/admin/OrganizationsAdminPage'), 'OrganizationsAdminPage');
const UsersAdminPage = lazyNamed(() => import('@/pages/admin/UsersAdminPage'), 'UsersAdminPage');
const DistrictsAdminPage = lazyNamed(() => import('@/pages/admin/DistrictsAdminPage'), 'DistrictsAdminPage');
const CommunityCouncilsAdminPage = lazyNamed(() => import('@/pages/admin/CommunityCouncilsAdminPage'), 'CommunityCouncilsAdminPage');
const ResourceCentersAdminPage = lazyNamed(() => import('@/pages/admin/ResourceCentersAdminPage'), 'ResourceCentersAdminPage');
const EnterpriseTypesAdminPage = lazyNamed(() => import('@/pages/admin/EnterpriseTypesAdminPage'), 'EnterpriseTypesAdminPage');
const AdminGeographyPage = lazyNamed(() => import('@/pages/admin/AdminGeographyPage'), 'AdminGeographyPage');

/**
 * Root layout — wraps the entire app. Runs the invite/recovery redirect
 * once on mount and renders the Toaster portal + an <Outlet /> for child
 * routes.
 *
 * Lives inside the data router so it can use useLocation + useNavigate
 * normally.
 */
function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (INITIAL_URL_TYPE && location.pathname !== '/set-password') {
      navigate('/set-password', { replace: true });
    }
    // run once on mount — INITIAL_URL_TYPE is a module constant
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ duration: 4000 }}
      />
      {/* Outer Suspense for lazy routes that render without the AppShell
          (the raw .pdf routes). Shell routes have their own inner boundary so
          the nav stays put while a page chunk loads. */}
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </>
  );
}

/**
 * Top-level route table built as a data router so we can use the stable
 * `useBlocker` hook for unsaved-changes guards. RBAC matrix
 * (PHASE_1_DESIGN.md §4):
 *
 *   super_admin      → everything, all orgs
 *   team_leader      → read everything in own org
 *   me_officer       → read/write enterprises in own org
 *   field_supervisor → read/write enterprises in own org
 *
 * Admin section is super-admin-only; non-admins land directly on /dashboard.
 */
export const appRouter = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Authenticated routes — anyone signed-in */}
      <Route
        element={
          <RoleGate>
            <AppShell />
          </RoleGate>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/enterprises" element={<EnterprisesListPage />} />
        <Route path="/enterprises/new" element={<NewEnterprisePage />} />
        {/* Wrap the enterprise detail page in an UnsavedChangesProvider so
            the Details cover-page form AND the EnterpriseLifecycleEditor
            can both register their dirty flag, and the page shows ONE
            confirmation prompt on navigation (instead of two from
            independent useBlocker instances). */}
        <Route
          path="/enterprises/:id"
          element={
            <UnsavedChangesProvider message="You have unsaved changes on this enterprise — leave anyway?">
              <EnterpriseDetailPage />
            </UnsavedChangesProvider>
          }
        />
        <Route path="/enterprises/:id/essf" element={<EssfEditPage />} />
        <Route path="/enterprises/:id/emmp" element={<EmmpEditPage />} />
        <Route path="/enterprises/:id/inspections/new" element={<InspectionEditPage />} />
        <Route path="/enterprises/:id/inspections/:visitId" element={<InspectionEditPage />} />
        <Route path="/enterprises/:id/m1" element={<M1EditPage />} />
        <Route
          path="/enterprises/:id/monitoring-visits/new"
          element={<MonitoringVisitEditPage />}
        />
        <Route
          path="/enterprises/:id/monitoring-visits/:visitId"
          element={<MonitoringVisitEditPage />}
        />

        {/* Reports */}
        <Route path="/reports" element={<ReportsHomePage />} />
        <Route path="/reports/:kind" element={<ReportsHomePage />} />
        <Route path="/reports/archive" element={<ReportsArchivePage />} />

        {/* Phase 6 — offline queue conflict review */}
        <Route path="/sync-conflicts" element={<SyncConflictsPage />} />
      </Route>

      {/* Cover-page PDF — auth required, but renders raw PDF (not inside AppShell) */}
      <Route
        path="/enterprises/:id/cover-page.pdf"
        element={
          <RoleGate>
            <CoverPagePdfRoute />
          </RoleGate>
        }
      />
      <Route
        path="/enterprises/:id/m1.pdf"
        element={
          <RoleGate>
            <M1PdfRoute />
          </RoleGate>
        }
      />
      <Route
        path="/enterprises/:id/esmp.pdf"
        element={
          <RoleGate>
            <EsmpPdfRoute />
          </RoleGate>
        }
      />

      {/* Admin routes — Super Admin only */}
      <Route
        element={
          <RoleGate roles={['super_admin']}>
            <AppShell />
          </RoleGate>
        }
      >
        <Route path="/admin/organizations" element={<OrganizationsAdminPage />} />
        <Route path="/admin/users" element={<UsersAdminPage />} />
        <Route path="/admin/districts" element={<DistrictsAdminPage />} />
        <Route path="/admin/community-councils" element={<CommunityCouncilsAdminPage />} />
        <Route path="/admin/resource-centers" element={<ResourceCentersAdminPage />} />
        <Route path="/admin/enterprise-types" element={<EnterpriseTypesAdminPage />} />
        <Route path="/admin/geography" element={<AdminGeographyPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Route>,
  ),
);
