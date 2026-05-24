/**
 * Inline PDF preview at /enterprises/:id/esmp.pdf — the browser displays the
 * rendered ESMP report (cover + ESSF + EMMP), with print/save support.
 *
 * Pre-condition: ESSF must exist (any status); EMMP submission is optional —
 * if missing, the renderer notes the omission instead of failing.
 */
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PDFViewer } from '@react-pdf/renderer';
import { useEnterprise } from '@/lib/enterprises';
import { useDistricts, useEnterpriseTypes } from '@/lib/catalogs';
import { useEssfSubmission, useEmmpSubmission, useEmmpTemplateForType } from '@/lib/esmp';
import { EsmpPdfDocument } from '@/pdf/EsmpPdf';
import type { EmmpSchema } from '@/components/forms/EmmpFormRenderer';
import type { EssfResponses } from '@/forms/essfSchema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function EsmpPdfRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: enterprise, isLoading, error } = useEnterprise(id);
  const { data: districts } = useDistricts();
  const { data: types } = useEnterpriseTypes();
  const essf = useEssfSubmission(id);
  const emmpTemplate = useEmmpTemplateForType(enterprise?.enterprise_type_id);
  const emmp = useEmmpSubmission(id);

  useEffect(() => {
    if (enterprise) {
      document.title = `ESMP — ${enterprise.beneficiary_short_name}.pdf`;
    }
  }, [enterprise]);

  if (isLoading || essf.isLoading || emmp.isLoading || emmpTemplate.isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }
  if (error) {
    return <div className="p-8 text-sm text-destructive">{(error as Error).message}</div>;
  }
  if (!enterprise) return null;

  if (!essf.data) {
    return (
      <div className="p-8 flex justify-center">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>ESMP report not ready</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              The combined ESMP report can only render once an ESSF submission exists
              for this enterprise. Open the enterprise, fill in the ESSF, and try again.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate(`/enterprises/${enterprise.id}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to enterprise
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const districtName = districts?.find((d) => d.id === enterprise.district_id)?.name ?? '';
  const typeRow = types?.find((t) => t.id === enterprise.enterprise_type_id);
  const enterpriseTypeName = typeRow?.name ?? 'Sub-project';
  const template = (emmpTemplate.data?.schema as unknown as EmmpSchema | undefined) ?? null;
  const templateVersion = template?.version ?? null;
  // Prefer the EMMP approved date, then ESSF approved date, then today, so the
  // cover/footer reflects when the report was finalised.
  const reportDate =
    emmp.data?.approved_at ??
    essf.data?.approved_at ??
    essf.data?.submitted_at ??
    new Date().toISOString();

  return (
    <div className="h-screen w-screen">
      <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }}>
        <EsmpPdfDocument
          enterprise={enterprise}
          districtName={districtName}
          enterpriseTypeName={enterpriseTypeName}
          essf={(essf.data.responses as EssfResponses | null) ?? null}
          essfApprovedAt={essf.data.approved_at ?? null}
          emmpTemplate={template}
          emmpTemplateVersion={templateVersion}
          emmpResponses={(emmp.data?.responses as Record<string, unknown> | null) ?? null}
          emmpApprovedAt={emmp.data?.approved_at ?? null}
          reportDate={reportDate}
        />
      </PDFViewer>
    </div>
  );
}
