import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useEnterprise } from '@/lib/enterprises';
import {
  canApproveSubmission,
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
import { ArrowLeft, Send, Check, Save } from 'lucide-react';
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
  const canDraft = canSubmit(role) && !isApproved;
  const canSubmitAction = canSubmit(role) && (status === 'draft' || status === null);
  const canApproveAction = canApproveSubmission(role, user?.id ?? null, essf.data);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to={`/enterprises/${enterpriseId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to enterprise
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            ESSF — {enterprise.data.beneficiary_short_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Environmental and Social Screening Form
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {essf.data && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
            {essf.data.submitted_at && (
              <div>Submitted: {formatDateDMY(essf.data.submitted_at)}</div>
            )}
            {essf.data.approved_at && (
              <div>Approved: {formatDateDMY(essf.data.approved_at)}</div>
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
            than the person who submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setError(null);
              save.mutate(
                { responses: draft as Record<string, unknown>, filled_by: user?.id ?? null },
                { onError: (e: Error) => setError(e.message) },
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
                      { onError: (e: Error) => setError(e.message) },
                    ),
                  onError: (e: Error) => setError(e.message),
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
                { onError: (e: Error) => setError(e.message) },
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
