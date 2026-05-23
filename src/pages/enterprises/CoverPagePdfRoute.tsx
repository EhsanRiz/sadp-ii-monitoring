import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PDFViewer } from '@react-pdf/renderer';
import { useEnterprise, isCoverPageReady } from '@/lib/enterprises';
import { useDistricts, useResourceCenters } from '@/lib/catalogs';
import { CoverPagePdfDocument } from '@/pdf/CoverPagePdf';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Inline PDF preview at /enterprises/:id/cover-page.pdf — the browser will
 * display the rendered PDF (and let the user save / print it).
 *
 * Refuses to render unless `isCoverPageReady` returns true — this mirrors the
 * CHECK constraint in migration 060 and the design doc §6.9.
 */
export function CoverPagePdfRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: enterprise, isLoading, error } = useEnterprise(id);
  const { data: districts } = useDistricts();
  const { data: rcs } = useResourceCenters(enterprise?.district_id ?? null);

  useEffect(() => {
    if (enterprise) {
      document.title = `Cover page — ${enterprise.beneficiary_short_name}.pdf`;
    }
  }, [enterprise]);

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (error) {
    return <div className="p-8 text-sm text-destructive">{(error as Error).message}</div>;
  }
  if (!enterprise) return null;

  if (!isCoverPageReady(enterprise)) {
    return (
      <div className="p-8 flex justify-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Cover page not ready</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The cover page can only render once every cover-page-required field is populated:
              project title, registration number, period dates, total project cost, total grant,
              principal applicant name, Community Council, and Resource Center.
            </p>
            <button
              className="text-sm text-primary hover:underline"
              onClick={() => navigate(`/enterprises/${enterprise.id}`)}
            >
              ← Back to enterprise
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const districtName = districts?.find((d) => d.id === enterprise.district_id)?.name ?? '';
  const resourceCenterName =
    rcs?.find((r) => r.id === enterprise.resource_center_id)?.name ?? '';

  return (
    <div className="h-screen w-screen">
      <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
        <CoverPagePdfDocument
          enterprise={enterprise}
          districtName={districtName}
          resourceCenterName={resourceCenterName}
        />
      </PDFViewer>
    </div>
  );
}
