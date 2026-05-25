import { Route, Routes, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { RoleGate } from '@/components/RoleGate';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
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
import { M1PdfRoute } from '@/pages/enterprises/M1PdfRoute';
import { OrganizationsAdminPage } from '@/pages/admin/OrganizationsAdminPage';
import { UsersAdminPage } from '@/pages/admin/UsersAdminPage';
import { DistrictsAdminPage } from '@/pages/admin/DistrictsAdminPage';
import { CommunityCouncilsAdminPage } from '@/pages/admin/CommunityCouncilsAdminPage';
import { ResourceCentersAdminPage } from '@/pages/admin/ResourceCentersAdminPage';
import { EnterpriseTypesAdminPage } from '@/pages/admin/EnterpriseTypesAdminPage';

/**
 * Top-level route table. RBAC matrix (PHASE_1_DESIGN.md §4):
 *
 *   super_admin      → everything, all orgs
 *   team_leader      → read everything in own org
 *   me_officer       → read/write enterprises in own org
 *   field_supervisor → read/write enterprises in own org
 *
 * Admin section is super-admin-only; non-admins land directly on /dashboard.
 */
export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{ duration: 4000 }}
      />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="/enterprises/:id" element={<EnterpriseDetailPage />} />
        <Route path="/enterprises/:id/essf" element={<EssfEditPage />} />
        <Route path="/enterprises/:id/emmp" element={<EmmpEditPage />} />
        <Route path="/enterprises/:id/inspections/new" element={<InspectionEditPage />} />
        <Route path="/enterprises/:id/inspections/:visitId" element={<InspectionEditPage />} />
        <Route path="/enterprises/:id/m1" element={<M1EditPage />} />
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
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
  );
}
