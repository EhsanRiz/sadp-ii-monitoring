import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth';
import { useEnterprise } from '@/lib/enterprises';
import {
  canApproveSubmission,
  canSubmit,
  useEmmpSubmission,
  useEmmpTemplateForType,
  useSaveEmmpDraft,
  useTransitionEmmp,
} from '@/lib/esmp';
import { EmmpFormRenderer, type EmmpSchema } from '@/components/forms/EmmpFormRenderer';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Send, Check, Save } from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';

export function EmmpEditPage() {
  const { id: enterpriseId } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const enterprise = useEnterprise(enterpriseId);
  const template = useEmmpTemplateForType(enterprise.data?.enterprise_type_id);
  const emmp = useEmmpSubmission(enterpriseId);
  const save = useSaveEmmpDraft(enterpriseId!, template.data?.id);
  const transition = useTransitionEmmp(enterpriseId!);

  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (emmp.data?.responses) setDraft(emmp.data.responses as Record<string, unknown>);
  }, [emmp.data]);

  if (!enterpriseId) return null;
  if (enterprise.isLoading || template.isLoading) return <Loading />;
  if (!enterprise.data) return null;

  const status = emmp.data?.status ?? null;
  const isApproved = status === 'approved';
  const canDraft = canSubmit(role) && !isApproved && !!template.data;
  const canSubmitAction = canSubmit(role) && (status === 'draft' || status === null) && !!template.data;
  const canApproveAction = canApproveSubmission(role, user?.id ?? null, emmp.data);

  if (!template.data) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/enterprises/${enterpriseId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>No EMMP template for this enterprise type</CardTitle>
            <CardDescription>
              This enterprise type doesn&apos;t have an in-app EMMP template yet (likely Fish
              Production). Upload a scanned EMMP via the ESMP tab&apos;s legacy upload until
              a template is added.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to={`/enterprises/${enterpriseId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to enterprise
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            EMMP — {enterprise.data.beneficiary_short_name}
          </h1>
          <p className="text-sm text-muted-foreground">{template.data.title}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {emmp.data && (emmp.data.submitted_at || emmp.data.approved_at) && (
        <Card className="bg-muted/30">
          <CardContent className="pt-4 text-xs text-muted-foreground space-y-1">
            {emmp.data.submitted_at && <div>Submitted: {formatDateDMY(emmp.data.submitted_at)}</div>}
            {emmp.data.approved_at && <div>Approved: {formatDateDMY(emmp.data.approved_at)}</div>}
          </CardContent>
        </Card>
      )}

      <EmmpFormRenderer
        schema={template.data.schema as unknown as EmmpSchema}
        responses={draft}
        onChange={setDraft}
        readOnly={isApproved}
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              setError(null);
              save.mutate(
                { responses: draft, filled_by: user?.id ?? null },
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
                { responses: draft, filled_by: user?.id ?? null },
                {
                  onSuccess: () =>
                    transition.mutate(
                      { to: 'submitted', userId: user!.id },
                      {
                        onSuccess: () => toast.success('EMMP submitted for approval'),
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
                  onSuccess: () => toast.success('EMMP approved'),
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

function Loading() {
  return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
}
