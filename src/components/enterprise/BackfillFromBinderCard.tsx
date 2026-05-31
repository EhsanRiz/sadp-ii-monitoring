/**
 * "Backfill from M1 binder" card — Option B entry point on the Progress tab.
 *
 * For enterprises that have already completed Milestone 1, the M1 report PDF
 * is the source of truth for everything upstream: cover page, ESSF, EMMP, the
 * most-recent inspection, and the M1 sections themselves. This card lets the
 * user upload one PDF and pre-fill all of them at once.
 *
 * Forward-going (per-module) flows are untouched — this is purely additive.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  FileText,
  Loader2,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import {
  BackfillBinderError,
  formatBytes,
  useBackfillM1Binder,
  useM1Submission,
  useRemoveM1SourcePdf,
  useUploadM1SourcePdf,
  useUploadedM1PdfMeta,
  type BackfillBinderResult,
} from '@/lib/m1';
import { formatDateDMY } from '@/lib/utils';

type Props = {
  enterpriseId: string;
  beneficiaryShortName: string;
};

export function BackfillFromBinderCard({ enterpriseId, beneficiaryShortName }: Props) {
  const m1 = useM1Submission(enterpriseId);
  const hasSourcePdf = !!m1.data?.uploaded_pdf_path;
  const m1PdfMeta = useUploadedM1PdfMeta(enterpriseId, hasSourcePdf);
  const uploadPdf = useUploadM1SourcePdf(enterpriseId);
  const removePdf = useRemoveM1SourcePdf(enterpriseId);
  const backfill = useBackfillM1Binder(enterpriseId);

  const [lastResult, setLastResult] = useState<BackfillBinderResult | null>(null);

  const m1Approved = m1.data?.status === 'approved';

  const onBackfill = () => {
    if (
      !window.confirm(
        'Backfill from this M1 binder?\n\n' +
          'This will populate (from the uploaded PDF):\n' +
          '  • Cover page — fills only EMPTY fields; never overwrites existing values\n' +
          '  • ESSF — drafts a submission for review\n' +
          '  • EMMP — drafts a submission for review\n' +
          '  • Most-recent Inspection visit (if present in the PDF)\n' +
          '  • M1 narrative, cashbook, financial report, bank reconciliation\n\n' +
          'Already-approved sections will block the operation. Click OK to proceed.',
      )
    ) return;
    setLastResult(null);
    backfill.mutate(undefined, {
      onSuccess: (data) => {
        setLastResult(data);
        const pieces = [
          data.essf_written ? 'ESSF' : null,
          data.emmp_written ? 'EMMP' : null,
          data.inspection_written ? 'inspection' : null,
          data.narrative_sections_filled > 0 ? `${data.narrative_sections_filled}/7 narrative` : null,
          data.cashbook_entry_count > 0 ? `${data.cashbook_entry_count} cashbook` : null,
          data.financial_report_item_count > 0 ? `${data.financial_report_item_count} FR items` : null,
          data.bank_reconciliation_filled ? 'bank reconciliation' : null,
          data.cover_fields_filled > 0 ? `${data.cover_fields_filled} cover fields` : null,
        ].filter(Boolean);
        toast.success(`Backfill complete: ${pieces.join(' · ')}`);
      },
      onError: (e: Error) => {
        if (e instanceof BackfillBinderError && e.status === 409) {
          toast.error('Backfill blocked', {
            description: `${e.message} Reopen the ${e.section ?? 'affected'} submission first.`,
          });
        } else {
          toast.error('Backfill failed', { description: e.message });
        }
      },
    });
  };

  return (
    <Card className="border-info/30 bg-info/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-info" />
          Backfill from M1 binder
        </CardTitle>
        <CardDescription>
          If this enterprise has <strong>already completed Milestone 1</strong>, upload the
          complete M1 binder PDF and we'll auto-populate cover page (empty fields only) +
          ESSF + EMMP + most-recent Inspection + M1 sections from one document. Forward-going
          uploads (per-module ESMP / M1 cards on the ESMP and Milestone 1 tabs) are
          unaffected — use whichever flow fits your workflow.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File card / upload */}
        {hasSourcePdf ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-3 rounded-md border bg-background p-3">
              <div className="rounded-md bg-primary/10 p-2 shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  M1 binder — {beneficiaryShortName}.pdf
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {m1PdfMeta.isLoading ? (
                    'Loading file info…'
                  ) : m1PdfMeta.data ? (
                    <>
                      {formatBytes(m1PdfMeta.data.size)} · Uploaded{' '}
                      {formatDateDMY(m1PdfMeta.data.uploaded_at)}
                    </>
                  ) : (
                    'PDF on file'
                  )}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0"
              disabled={removePdf.isPending || backfill.isPending}
              onClick={() => {
                if (
                  !window.confirm(
                    'Remove the uploaded M1 binder PDF?\n\n' +
                      'The file will be deleted from storage. Any draft data extracted from this file stays on the relevant forms — clear those manually from each tab if needed.',
                  )
                ) return;
                removePdf.mutate(undefined, {
                  onSuccess: () => {
                    toast.success('M1 binder PDF removed');
                    setLastResult(null);
                  },
                  onError: (e: Error) => toast.error('Could not remove PDF', { description: e.message }),
                });
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" />
              {removePdf.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="binder-upload">Upload the complete M1 binder PDF</Label>
            <Input
              id="binder-upload"
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                uploadPdf.mutate(f, {
                  onSuccess: () => toast.success('M1 binder PDF uploaded'),
                  onError: (err: Error) => toast.error('Upload failed', { description: err.message }),
                });
                e.target.value = '';
              }}
              disabled={uploadPdf.isPending}
            />
            {uploadPdf.isPending && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Uploading…
              </p>
            )}
          </div>
        )}

        {/* Backfill action */}
        {hasSourcePdf && (
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border bg-background p-3">
            <div className="text-sm flex-1 min-w-[14rem]">
              <div className="font-medium flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-info" />
                Run backfill
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Reads the uploaded PDF and writes drafts to every section at once. Approved
                sections block the operation — reopen them first.
              </p>
            </div>
            <Button
              onClick={onBackfill}
              disabled={backfill.isPending || m1Approved}
              size="sm"
            >
              {backfill.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Backfilling…
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" /> Backfill from binder
                </>
              )}
            </Button>
          </div>
        )}

        {/* Approved-M1 guard */}
        {hasSourcePdf && m1Approved && (
          <div className="flex items-start gap-1.5 rounded border border-warning/30 bg-warning/5 p-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="font-medium text-warning">M1 is already approved</span>
              <span className="text-muted-foreground">
                {' '}— backfilling would overwrite a signed-off submission. Reopen the M1
                first if you need to re-run backfill.
              </span>
              <div className="mt-1.5">
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <Link to={`/enterprises/${enterpriseId}/m1`}>Go to M1 to reopen →</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Live result summary */}
        {lastResult && (
          <div className="space-y-2 rounded-md border border-success/30 bg-success/5 p-3">
            <div className="text-sm font-medium flex items-center gap-1.5 text-success">
              <Sparkles className="h-4 w-4" /> Backfill drafts ready — review each tab and submit
            </div>
            <div className="text-xs flex flex-wrap items-center gap-2">
              {lastResult.cover_fields_filled > 0 && (
                <Badge variant="outline" className="border-success/40 text-success">
                  Cover page: {lastResult.cover_fields_filled} fields filled
                </Badge>
              )}
              {lastResult.cover_fields_conflict > 0 && (
                <Badge variant="outline" className="border-warning/40 text-warning">
                  Cover page: {lastResult.cover_fields_conflict} conflicts (kept existing)
                </Badge>
              )}
              {lastResult.essf_written && (
                <Badge variant="outline" className="border-success/40 text-success">ESSF drafted</Badge>
              )}
              {lastResult.emmp_written && (
                <Badge variant="outline" className="border-success/40 text-success">EMMP drafted</Badge>
              )}
              {lastResult.inspection_written && (
                <Badge variant="outline" className="border-success/40 text-success">Inspection drafted</Badge>
              )}
              <Badge variant="outline" className="border-success/40 text-success">
                Narrative: {lastResult.narrative_sections_filled} / 7 sections
              </Badge>
              <Badge variant="outline" className="border-success/40 text-success">
                Cashbook: {lastResult.cashbook_entry_count} entries
              </Badge>
              <Badge variant="outline" className="border-success/40 text-success">
                Financial report: {lastResult.financial_report_item_count} items
              </Badge>
              {lastResult.bank_reconciliation_filled && (
                <Badge variant="outline" className="border-success/40 text-success">Bank reconciliation</Badge>
              )}
            </div>
            {lastResult.notes.length > 0 && (
              <details className="text-xs" open>
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {lastResult.notes.length} extraction note{lastResult.notes.length !== 1 ? 's' : ''} — click to collapse
                </summary>
                <ul className="mt-2 space-y-1 pl-3">
                  {lastResult.notes.map((n, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertTriangle
                        className={
                          n.confidence === 'low'
                            ? 'h-3 w-3 mt-0.5 shrink-0 text-destructive'
                            : 'h-3 w-3 mt-0.5 shrink-0 text-warning'
                        }
                      />
                      <span>
                        {n.field && <code className="text-[10px] bg-muted px-1 rounded mr-1">{n.field}</code>}
                        {n.note}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
