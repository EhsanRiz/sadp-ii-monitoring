/**
 * Inline PDF preview at /enterprises/:id/m1.pdf — assembled Milestone 1
 * report. Phase 1: cover page + narrative.
 *
 * Pre-condition: an m1_submissions row must exist for the enterprise; if
 * not, we show a "not ready" card with a link to start the M1 form.
 */
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PDFViewer } from '@react-pdf/renderer';
import { useEnterprise } from '@/lib/enterprises';
import { useDistricts, useResourceCenters } from '@/lib/catalogs';
import { useM1Submission } from '@/lib/m1';
import { M1PdfDocument } from '@/pdf/M1Pdf';
import type { M1NarrativeResponses } from '@/forms/m1NarrativeSchema';
import type { M1CashbookResponses } from '@/forms/m1CashbookSchema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function M1PdfRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: enterprise, isLoading, error } = useEnterprise(id);
  const { data: districts } = useDistricts();
  const { data: rcs } = useResourceCenters(enterprise?.district_id ?? null);
  const m1 = useM1Submission(id);

  useEffect(() => {
    if (enterprise) document.title = `M1 Report — ${enterprise.beneficiary_short_name}.pdf`;
  }, [enterprise]);

  if (isLoading || m1.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (error) {
    return <div className="p-8 text-sm text-destructive">{(error as Error).message}</div>;
  }
  if (!enterprise) return null;

  if (!m1.data) {
    return (
      <div className="p-8 flex justify-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>M1 report not ready</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The M1 report PDF assembles the cover page plus the narrative form. Open the M1 page
              for this enterprise, fill in at least the narrative, save a draft, then come back here
              to view the report.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/enterprises/${enterprise.id}?tab=m1`}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back to M1
                </Link>
              </Button>
              <Button asChild size="sm" onClick={() => navigate(`/enterprises/${enterprise.id}/m1`)}>
                <Link to={`/enterprises/${enterprise.id}/m1`}>Open M1</Link>
              </Button>
            </div>
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
        <M1PdfDocument
          enterprise={enterprise}
          districtName={districtName}
          resourceCenterName={resourceCenterName}
          narrative={(m1.data.narrative as M1NarrativeResponses | null) ?? null}
          cashbook={(m1.data.cashbook as M1CashbookResponses | null) ?? null}
          reportDate={m1.data.report_date}
          m1PeriodStart={m1.data.m1_period_start}
          m1PeriodEnd={m1.data.m1_period_end}
        />
      </PDFViewer>
    </div>
  );
}
