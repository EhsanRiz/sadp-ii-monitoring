import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useEnterprise } from '@/lib/enterprises';
import {
  canApproveSubmission,
  canReopen,
  canSubmit,
  useEssfSubmission,
  useSaveEssfDraft,
  useTransitionEssf,
} from '@/lib/esmp';
import { EssfFormRenderer } from '@/components/forms/EssfFormRenderer';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { EssfResponses } from '@/forms/essfSchema';
import { ArrowLeft, Send, Check, Save, Printer, Unlock, History, Sparkles, AlertTriangle } from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';

export function EssfEditPage() {
  const { id: enterpriseId } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const enterprise = useEnterprise(enterpriseId);
  const essf = useEssfSubmission(enterpriseId);
  const save = useSaveEssfDraft(enterpriseId!);
  const transition = useTransitionEssf(enterpriseId!);

  const [draft, setDraft] = useState<EssfResponses>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (essf.data?.responses) setDraft(essf.data.responses as EssfResponses);
  }, [essf.data]);

  if (!enterpriseId) return null;
  if (enterprise.isLoading) return <Loading />;
  if (!enterprise.data) return null;

  const status = essf.data?.status ?? null;
  const isApproved = status === 'approved';
  // A submission that was once approved but is now back to draft — useful for
  // displaying "Previously approved on …" on the trail card.
  const wasReopened = status === 'draft' && !!essf.data?.approved_at;
  const canDraft = canSubmit(role) && !isApproved;
  const canSubmitAction = canSubmit(role) && (status === 'draft' || status === null);
  const canApproveAction = canApproveSubmission(role, user?.id ?? null, essf.data);
  const canReopenAction = isApproved && canReopen(role);
  // Print is offered whenever an ESSF submission exists — it just opens the
  // existing /esmp.pdf route, which is the canonical printable artifact.
  const hasSubmission = !!essf.data;

  const handleReopen = () => {
    setError(null);
    if (
      !window.confirm(
        'Reopen this approved ESSF for editing?\n\n' +
          'The form will return to draft status. The original submitted and ' +
          'approved dates stay on file as historical record. After your edits, ' +
          'you will need to submit and have someone re-approve it.',
      )
    ) {
      return;
    }
    transition.mutate(
      { to: 'draft', userId: user!.id },
      {
        onSuccess: () => toast.success('ESSF reopened for editing'),
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
            <Link to={`/enterprises/${enterpriseId}?tab=esmp`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to ESMP
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            ESSF — {enterprise.data.beneficiary_short_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Environmental and Social Screening Form
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasSubmission && (
            <Button
              asChild
              variant="outline"
              size="sm"
              title="Open the printable ESMP report (cover + ESSF + EMMP)"
            >
              <Link to={`/enterprises/${enterpriseId}/esmp.pdf`} target="_blank" rel="noopener">
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </Link>
            </Button>
          )}
          <StatusBadge status={status} />
        </div>
      </div>

      {essf.data && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
            {wasReopened && (
              <div className="flex items-center gap-1.5 text-warning font-medium">
                <History className="h-3.5 w-3.5" />
                Reopened for editing — previously approved on{' '}
                {formatDateDMY(essf.data.approved_at!)}
              </div>
            )}
            {essf.data.submitted_at && (
              <div>Submitted: {formatDateDMY(essf.data.submitted_at)}</div>
            )}
            {essf.data.approved_at && !wasReopened && (
              <div>Approved: {formatDateDMY(essf.data.approved_at)}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PDF-import review banner. Shown when this submission was auto-
          populated by the extract-esmp-pdf edge function. Field supervisor
          must review the highlighted items before submitting. */}
      {essf.data?.imported_from_pdf_path && essf.data.status !== 'approved' && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <Sparkles className="h-4 w-4 mt-0.5 text-warning shrink-0" />
              <div>
                <p className="font-medium text-warning">
                  Auto-imported from PDF — please review before submitting
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Claude extracted these responses from the uploaded scanned ESMP on{' '}
                  {essf.data.imported_at ? formatDateDMY(essf.data.imported_at) : '—'}.
                  Verify every field below, especially anything flagged below as a
                  low-confidence read.
                </p>
              </div>
            </div>
            {Array.isArray(essf.data.import_notes) && essf.data.import_notes.length > 0 && (
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  {essf.data.import_notes.length} extraction note
                  {essf.data.import_notes.length !== 1 ? 's' : ''} — click to expand
                </summary>
                <ul className="mt-2 space-y-1 pl-3">
                  {(essf.data.import_notes as Array<{ field?: string; note: string; confidence?: string }>).map((n, i) => (
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

      <EssfFormRenderer responses={draft} onChange={setDraft} readOnly={isApproved} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Actions</CardTitle>
          <CardDescription>
            Draft saves keep your progress private. Submitting hands the form to your M&E
            Officer or Team Leader for approval. Approval can only be given by someone other
            than the person who submitted. Once approved, the form locks — an M&E Officer,
            Team Leader, or Super Admin can reopen it for further edits.
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
              <Link to={`/enterprises/${enterpriseId}/esmp.pdf`} target="_blank" rel="noopener">
                <Printer className="mr-2 h-4 w-4" /> Print / PDF
              </Link>
            </Button>
          )}
          <Button
            onClick={() => {
              setError(null);
              save.mutate(
                { responses: draft as Record<string, unknown>, filled_by: user?.id ?? null },
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
                { responses: draft as Record<string, unknown>, filled_by: user?.id ?? null },
                {
                  onSuccess: () =>
                    transition.mutate(
                      { to: 'submitted', userId: user!.id },
                      {
                        onSuccess: () => toast.success('ESSF submitted for approval'),
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
                  onSuccess: () => toast.success('ESSF approved'),
                  onError: (e: Error) => {
                    setError(e.message);
                    toast.error('Approval failed', { description: e.message });
                  },
                },
              );
            }}
            disabled={!canApproveAction || transition.isPending}
            variant="default"
          >
            <Check className="mr-2 h-4 w-4" />
            Approve
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Loading() {
  return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
}
