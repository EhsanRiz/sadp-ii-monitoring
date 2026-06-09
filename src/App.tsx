import { useEffect } from 'react';
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
import { LoginPage } from '@/pages/LoginPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SetPasswordPage } from '@/pages/SetPasswordPage';
import { SyncConflictsPage } from '@/pages/SyncConflictsPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { INITIAL_URL_TYPE } from '@/lib/initial-url';
import { DashboardPage } from '@/pages/DashboardPage';
import { EnterprisesListPage } from '@/pages/enterprises/EnterprisesListPage';
import { EnterpriseDetailPage } from '@/pages/enterprises/EnterpriseDetailPage';
import { NewEnterprisePage } from '@/pages/enterprises/NewEnterprisePage';
import { CoverPagePdfRoute } from '@/pages/enterprises/CoverPagePdfRoute';
import { EsmpPdfRoute } from '@/pages/enterprises/EsmpPdfRoute';
import { EssfEditPage } from '@/pages/enterprises/EssfEditPage';
import { EmmpEditPage } from '@/pages/enterprises/EmmpEditPage';
import { InspectionEditPage } from '@/pages/enterprises/InspectionEditPage';
import { M1EditPage } from '@/pages/enterprises/M1EditPage';
import { MonitoringVisitEditPage } from '@/pages/enterprises/MonitoringVisitEditPage';
import { M1PdfRoute } from '@/pages/enterprises/M1PdfRoute';
import { OrganizationsAdminPage } from '@/pages/admin/OrganizationsAdminPage';
import { UsersAdminPage } from '@/pages/admin/UsersAdminPage';
import { DistrictsAdminPage } from '@/pages/admin/DistrictsAdminPage';
import { CommunityCouncilsAdminPage } from '@/pages/admin/CommunityCouncilsAdminPage';
import { ResourceCentersAdminPage } from '@/pages/admin/ResourceCentersAdminPage';
import { EnterpriseTypesAdminPage } from '@/pages/admin/EnterpriseTypesAdminPage';
import { AdminGeographyPage } from '@/pages/admin/AdminGeographyPage';
import { ReportsHomePage } from '@/pages/reports/ReportsHomePage';
import { ReportsArchivePage } from '@/pages/reports/ReportsArchivePage';
import { UnsavedChangesProvider } from '@/lib/use-unsaved-changes-guard';

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
      <Outlet />
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
