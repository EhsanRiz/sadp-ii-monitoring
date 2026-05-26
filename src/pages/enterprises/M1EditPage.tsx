/**
 * Milestone 1 (M1) editor page.
 *
 * Tabbed layout mirrors the M1 report structure:
 *   - Narrative          (Phase 1: built)
 *   - Cashbook           (Phase 2: scaffold + "coming soon")
 *   - Financial Report   (Phase 2: scaffold + "coming soon")
 *   - Bank Reconciliation(Phase 2: scaffold + "coming soon")
 *   - Supporting Docs    (Phase 3: scaffold + "coming soon")
 *
 * The Phase 1 cut writes only to m1_submissions.narrative. The other jsonb
 * columns are already in the schema; the UI for them lands in Phase 2/3.
 */
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useEnterprise } from '@/lib/enterprises';
import {
  canApproveM1Submission,
  canReopenM1,
  canSubmitM1,
  useM1Submission,
  useSaveM1Draft,
  useTransitionM1,
} from '@/lib/m1';
import { M1NarrativeFormRenderer } from '@/components/forms/M1NarrativeFormRenderer';
import { M1CashbookFormRenderer } from '@/components/forms/M1CashbookFormRenderer';
import { M1FinancialReportFormRenderer } from '@/components/forms/M1FinancialReportFormRenderer';
import { M1BankReconciliationFormRenderer } from '@/components/forms/M1BankReconciliationFormRenderer';
import type { M1FinancialReportResponses } from '@/forms/m1FinancialReportSchema';
import type { M1BankReconciliationResponses } from '@/forms/m1BankReconciliationSchema';
import type { M1CashbookResponses } from '@/forms/m1CashbookSchema';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Send, Check, Printer, Unlock, History, Construction, Sparkles, AlertTriangle } from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';
import type { M1NarrativeResponses } from '@/forms/m1NarrativeSchema';

export function M1EditPage() {
  const { id: enterpriseId } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const enterprise = useEnterprise(enterpriseId);
  const m1 = useM1Submission(enterpriseId);
  const save = useSaveM1Draft(enterpriseId!);
  const transition = useTransitionM1(enterpriseId!);

  const [narrative, setNarrative] = useState<M1NarrativeResponses>({});
  const [cashbook, setCashbook] = useState<M1CashbookResponses>({});
  const [financialReport, setFinancialReport] = useState<M1FinancialReportResponses>({});
  const [bankReconciliation, setBankReconciliation] = useState<M1BankReconciliationResponses>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (m1.data?.narrative) setNarrative(m1.data.narrative as M1NarrativeResponses);
    if (m1.data?.cashbook) setCashbook(m1.data.cashbook as M1CashbookResponses);
    if (m1.data?.financial_report) setFinancialReport(m1.data.financial_report as M1FinancialReportResponses);
    if (m1.data?.bank_reconciliation) setBankReconciliation(m1.data.bank_reconciliation as M1BankReconciliationResponses);
  }, [m1.data]);

  if (!enterpriseId) return null;
  if (enterprise.isLoading) return <Loading />;
  if (!enterprise.data) return null;

  const status = m1.data?.status ?? null;
  const isApproved = status === 'approved';
  const wasReopened = status === 'draft' && !!m1.data?.approved_at;
  const canDraft = canSubmitM1(role) && !isApproved;
  const canSubmitAction = canSubmitM1(role) && (status === 'draft' || status === null);
  const canApproveAction = canApproveM1Submission(role, user?.id ?? null, m1.data);
  const canReopenAction = isApproved && canReopenM1(role);
  const hasSubmission = !!m1.data;

  const handleReopen = () => {
    setError(null);
    if (
      !window.confirm(
        'Reopen this approved M1 submission for editing?\n\n' +
          'The form will return to draft status. The original submitted and ' +
          'approved dates stay on file as historical record. After your edits, ' +
          'you will need to submit and have someone re-approve it.',
      )
    ) return;
    transition.mutate(
      { to: 'draft', userId: user!.id },
      {
        onSuccess: () => toast.success('M1 reopened for editing'),
        onError: (e: Error) => {
          setError(e.message);
          toast.error('Could not reopen', { description: e.message });
        },
      },
    );
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to={`/enterprises/${enterpriseId}?tab=m1`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to M1
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            M1 Progress Report — {enterprise.data.beneficiary_short_name}
          </h1>
          <p className="text-sm text-muted-foreground">Milestone 1 — narrative + financial summary</p>
        </div>
        <div className="flex items-center gap-2">
          {hasSubmission && (
            <Button asChild variant="outline" size="sm" title="Open the printable M1 report">
              <Link to={`/enterprises/${enterpriseId}/m1.pdf`} target="_blank" rel="noopener">
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </Link>
            </Button>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      {m1.data && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
            {wasReopened && (
              <div className="flex items-center gap-1.5 text-warning font-medium">
                <History className="h-3.5 w-3.5" />
                Reopened for editing — previously approved on{' '}
                {formatDateDMY(m1.data.approved_at!)}
              </div>
            )}
            {m1.data.submitted_at && <div>Submitted: {formatDateDMY(m1.data.submitted_at)}</div>}
            {m1.data.approved_at && !wasReopened && (
              <div>Approved: {formatDateDMY(m1.data.approved_at)}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Auto-import banner — shown when the M1 row was populated by the
          extract-m1-pdf edge function and hasn't been approved yet. The
          field supervisor must review the draft before submitting. */}
      {m1.data?.imported_from_pdf_path && m1.data.status !== 'approved' && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Sparkles className="h-4 w-4 mt-0.5 text-warning shrink-0" />
              <div>
                <p className="font-medium text-warning">
                  Auto-imported from PDF — please review before submitting
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Claude extracted the narrative + cashbook from the uploaded scanned M1
                  report on{' '}
                  {m1.data.imported_at ? formatDateDMY(m1.data.imported_at) : '—'}.
                  Verify every section, especially anything flagged below as low confidence.
                </p>
              </div>
            </div>
            {Array.isArray(m1.data.import_notes) && m1.data.import_notes.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {m1.data.import_notes.length} extraction note
                  {m1.data.import_notes.length !== 1 ? 's' : ''} — click to expand
                </summary>
                <ul className="mt-2 space-y-1 pl-3">
                  {(m1.data.import_notes as Array<{ field?: string; note: string; confidence?: string }>).map((n, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertTriangle
                        className={
                          'h-3 w-3 mt-0.5 shrink-0 ' +
                          (n.confidence === 'low' ? 'text-destructive' : 'text-warning')
                        }
                      />
                      <span>
                        {n.field && (
                          <code className="font-mono text-[10px] bg-muted px-1 rounded mr-1">
                            {n.field}
                          </code>
                        )}
                        {n.note}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="narrative">
        <TabsList>
          <TabsTrigger value="narrative">Narrative</TabsTrigger>
          <TabsTrigger value="cashbook">Cashbook</TabsTrigger>
          <TabsTrigger value="financial">Financial Report</TabsTrigger>
          <TabsTrigger value="reconciliation">Bank Reconciliation</TabsTrigger>
          <TabsTrigger value="supporting">Supporting Docs</TabsTrigger>
        </TabsList>

        <TabsContent value="narrative" className="space-y-4 mt-4">
          <M1NarrativeFormRenderer
            responses={narrative}
            onChange={setNarrative}
            readOnly={isApproved}
          />
        </TabsContent>

        <TabsContent value="cashbook" className="mt-4 space-y-4">
          <M1CashbookFormRenderer
            responses={cashbook}
            onChange={setCashbook}
            readOnly={isApproved}
          />
        </TabsContent>
        <TabsContent value="financial" className="mt-4 space-y-4">
          <M1FinancialReportFormRenderer
            responses={financialReport}
            onChange={setFinancialReport}
            readOnly={isApproved}
          />
        </TabsContent>
        <TabsContent value="reconciliation" className="mt-4 space-y-4">
          <M1BankReconciliationFormRenderer
            responses={bankReconciliation}
            onChange={setBankReconciliation}
            readOnly={isApproved}
          />
        </TabsContent>
        <TabsContent value="supporting" className="mt-4">
          <ComingSoon
            label="Supporting Documents"
            description="Multi-file upload tagged by kind (bank statement, invoice, receipt, audit trail). Files are stored in the m1-supporting-docs bucket and embedded by reference in the printed M1 PDF."
          />
        </TabsContent>
      </Tabs>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Actions</CardTitle>
          <CardDescription>
            Draft saves keep your progress private. Submitting hands the report to your M&E Officer
            or Team Leader for approval. Approval can only be given by someone other than the
            person who submitted. Once approved, the report locks — an M&E Officer, Team Leader,
            or Super Admin can reopen it for further edits.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {canReopenAction && (
            <Button
              onClick={handleReopen}
              disabled={transition.isPending}
              variant="outline"
              className="border-warning text-warning hover:bg-warning/10 hover:text-warning"
            >
              <Unlock className="mr-2 h-4 w-4" />
              {transition.isPending ? 'Reopening…' : 'Reopen for editing'}
            </Button>
          )}
          {hasSubmission && (
            <Button asChild variant="outline">
              <Link to={`/enterprises/${enterpriseId}/m1.pdf`} target="_blank" rel="noopener">
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </Link>
            </Button>
          )}
          <Button
            onClick={() => {
              setError(null);
              save.mutate(
                {
                  narrative: narrative as Record<string, unknown>,
                  cashbook: cashbook as Record<string, unknown>,
                  financial_report: financialReport as Record<string, unknown>,
                  bank_reconciliation: bankReconciliation as Record<string, unknown>,
                  filled_by: user?.id ?? null,
                },
                {
                  onSuccess: () => toast.success('Draft saved'),
                  onError: (e: Error) => {
                    setError(e.message);
                    toast.error('Save failed', { description: e.message });
                  },
                },
              );
            }}
            disabled={!canDraft || save.isPending}
            variant="outline"
          >
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? 'Saving…' : 'Save draft'}
          </Button>
          <Button
            onClick={() => {
              setError(null);
              save.mutate(
                {
                  narrative: narrative as Record<string, unknown>,
                  cashbook: cashbook as Record<string, unknown>,
                  financial_report: financialReport as Record<string, unknown>,
                  bank_reconciliation: bankReconciliation as Record<string, unknown>,
                  filled_by: user?.id ?? null,
                },
                {
                  onSuccess: () =>
                    transition.mutate(
                      { to: 'submitted', userId: user!.id },
                      {
                        onSuccess: () => toast.success('M1 submitted for approval'),
                        onError: (e: Error) => {
                          setError(e.message);
                          toast.error('Submission failed', { description: e.message });
                        },
                      },
                    ),
                  onError: (e: Error) => {
                    setError(e.message);
                    toast.error('Save failed', { description: e.message });
                  },
                },
              );
            }}
            disabled={!canSubmitAction || save.isPending || transition.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            Submit for approval
          </Button>
          <Button
            onClick={() => {
              setError(null);
              transition.mutate(
                { to: 'approved', userId: user!.id },
                {
                  onSuccess: () => toast.success('M1 approved'),
                  onError: (e: Error) => {
                    setError(e.message);
                    toast.error('Approval failed', { description: e.message });
                  },
                },
              );
            }}
            disabled={!canApproveAction || transition.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ComingSoon({ label, description }: { label: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-6 pb-6 flex items-start gap-3 text-sm">
        <Construction className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">{label} — coming in Phase 2</p>
          <p className="text-muted-foreground mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Loading() {
  return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
}
