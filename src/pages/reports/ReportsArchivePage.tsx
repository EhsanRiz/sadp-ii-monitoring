/**
 * Reports archive — list saved snapshots, re-open / re-download.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useReportArchive, useDeleteSavedReport,
         type PeriodReportArchiveRow } from '@/lib/reports';
import { PeriodReportPreview } from '@/components/reports/PeriodReportPreview';
import { downloadReportExcel } from '@/lib/reportExcel';
import { pdf } from '@react-pdf/renderer';
import { PeriodReportPdf } from '@/pdf/PeriodReportPdf';
import { useAuth } from '@/lib/auth';

export function ReportsArchivePage() {
  const { data, isLoading } = useReportArchive();
  const { isSuperAdmin } = useAuth();
  const del = useDeleteSavedReport();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Reports archive</h1>
        <p className="text-sm text-muted-foreground">
          Saved snapshots. Each row preserves the exact numbers at the time of generation.
        </p>
      </header>

      <div className="inline-flex rounded-md border bg-muted/30 p-0.5 text-sm">
        <Link to="/reports/monthly"   className="px-3 py-1.5 rounded text-muted-foreground hover:text-foreground">Monthly</Link>
        <Link to="/reports/quarterly" className="px-3 py-1.5 rounded text-muted-foreground hover:text-foreground">Quarterly</Link>
        <Link to="/reports/custom"    className="px-3 py-1.5 rounded text-muted-foreground hover:text-foreground">Custom range</Link>
        <Link to="/reports/archive"   className="px-3 py-1.5 rounded bg-background shadow-sm font-medium">Archive</Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" /><Skeleton className="h-14" /><Skeleton className="h-14" />
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          title="No saved reports yet"
          description="Generate a report and click Save to archive it here."
        />
      ) : (
        <div className="space-y-2">
          {data.map((r) => (
            <Card key={r.id} className="transition-shadow hover:shadow-sm">
              <CardHeader className="py-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base">{r.period_label} <span className="text-xs font-normal text-muted-foreground">· {r.kind}</span></CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.period_start} → {r.period_end}
                      {' · '}
                      {scopeLabel(r)}
                      {' · '}
                      Saved {new Date(r.generated_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline"
                      onClick={() => setOpenId(openId === r.id ? null : r.id)}>
                      {openId === r.id ? 'Close' : 'Open'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadReportExcel(r.payload, r.kind)}>
                      Excel
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => downloadPdf(r)}>
                      PDF
                    </Button>
                    {isSuperAdmin && (
                      <Button size="sm" variant="ghost" className="text-destructive"
                        onClick={() => {
                          if (!window.confirm(`Delete the saved report for ${r.period_label}?`)) return;
                          del.mutate(r.id, {
                            onSuccess: () => toast.success('Deleted'),
                            onError: (e: unknown) => toast.error((e as Error).message),
                          });
                        }}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              {openId === r.id && (
                <CardContent className="border-t pt-4">
                  <PeriodReportPreview snapshot={r.payload} kind={r.kind} />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function scopeLabel(r: PeriodReportArchiveRow) {
  if (r.payload.scope.kind === 'all') return 'All organisations';
  return r.payload.scope.org_name;
}

async function downloadPdf(r: PeriodReportArchiveRow) {
  try {
    const blob = await pdf(<PeriodReportPdf snapshot={r.payload} kind={r.kind} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SADP-II ${r.period_label.replace(/[^A-Za-z0-9 _-]/g, '')}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (e) {
    console.error(e);
    toast.error('PDF export failed');
  }
}
