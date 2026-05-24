import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useEnterprise } from '@/lib/enterprises';
import {
  canApproveSubmission,
  canSubmit,
  useCreateInspection,
  useInspectionVisit,
  useSaveInspectionDraft,
  useTransitionInspection,
} from '@/lib/esmp';
import { InspectionFormRenderer } from '@/components/forms/InspectionFormRenderer';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { InspectionResponses } from '@/forms/inspectionSchema';
import { ArrowLeft, Send, Check, Save } from 'lucide-react';
import { formatDateDMY } from '@/lib/utils';

/**
 * Handles both "new inspection" (no visitId) and "edit existing inspection" (visitId in URL).
 */
export function InspectionEditPage() {
  const { id: enterpriseId, visitId } = useParams<{ id: string; visitId?: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const enterprise = useEnterprise(enterpriseId);
  const visit = useInspectionVisit(visitId);

  // "New" mode: capture header fields first, create the visit, then navigate to /:visitId
  const create = useCreateInspection(enterpriseId!);
  const [newInspectedBy, setNewInspectedBy] = useState('');
  const [newVisitDate, setNewVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [createError, setCreateError] = useState<string | null>(null);

  // "Edit" mode
  const save = useSaveInspectionDraft(visitId ?? '');
  const transition = useTransitionInspection(visitId ?? '', enterpriseId!);
  const [draft, setDraft] = useState<InspectionResponses>({});
  const [inspectedByEdit, setInspectedByEdit] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (visit.data) {
      setDraft((visit.data.responses as InspectionResponses) ?? {});
      setInspectedByEdit(visit.data.inspected_by_name ?? '');
    }
  }, [visit.data]);

  if (!enterpriseId) return null;
  if (enterprise.isLoading) return <Loading />;
  if (!enterprise.data) return null;

  // ---------- New-inspection flow ----------
  if (!visitId) {
    const defaultInspectedBy = enterprise.data.service_provider_name ?? '';
    function onCreate(e: FormEvent) {
      e.preventDefault();
      setCreateError(null);
      const inspectedBy = newInspectedBy.trim() || defaultInspectedBy.trim();
      if (!inspectedBy) {
        setCreateError('Inspected by is required.');
        return;
      }
      create.mutate(
        {
          inspected_by_name: inspectedBy,
          visit_date: newVisitDate,
          filled_by: user?.id ?? null,
        },
        {
          onSuccess: (id) => navigate(`/enterprises/${enterpriseId}/inspections/${id}`, { replace: true }),
          onError: (err: Error) => setCreateError(err.message),
        },
      );
    }
    return (
      <div className="space-y-6 max-w-2xl">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={`/enterprises/${enterpriseId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to enterprise
          </Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>New inspection visit</CardTitle>
            <CardDescription>
              Record a compliance monitoring visit for{' '}
              <strong>{enterprise.data.beneficiary_short_name}</strong>. The full checklist
              opens after you save these basics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="inspected_by">Inspected by</Label>
                <Input
                  id="inspected_by"
                  value={newInspectedBy}
                  onChange={(e) => setNewInspectedBy(e.target.value)}
                  placeholder={defaultInspectedBy || 'Inspector name'}
                  required={!defaultInspectedBy}
                />
                {defaultInspectedBy && (
                  <p className="text-xs text-muted-foreground">
                    Default: <code>{defaultInspectedBy}</code> (Service Provider on file)
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="visit_date">Visit date</Label>
                <Input
                  id="visit_date"
                  type="date"
                  value={newVisitDate}
                  onChange={(e) => setNewVisitDate(e.target.value)}
                  required
                />
              </div>
              {createError && (
                <p className="md:col-span-2 text-sm text-destructive">{createError}</p>
              )}
              <Button type="submit" disabled={create.isPending} className="md:col-span-2 justify-self-start">
                {create.isPending ? 'Creating…' : 'Create and open checklist'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---------- Edit/view existing inspection ----------
  if (visit.isLoading) return <Loading />;
  if (!visit.data) {
    return (
      <div className="p-8 text-sm text-destructive">Inspection not found.</div>
    );
  }

  const status = visit.data.status;
  const isApproved = status === 'approved';
  const canDraft = canSubmit(role) && !isApproved;
  const canSubmitAction = canSubmit(role) && status === 'draft';
  const canApproveAction = canApproveSubmission(role, user?.id ?? null, visit.data);

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
            Inspection — {enterprise.data.beneficiary_short_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Visit date: {formatDateDMY(visit.data.visit_date)} ·{' '}
            Inspected by: {visit.data.inspected_by_name}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-sm">Visit basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 text-sm">
          <div className="space-y-1.5">
            <Label htmlFor="ib">Inspected by</Label>
            <Input
              id="ib"
              value={inspectedByEdit}
              onChange={(e) => setInspectedByEdit(e.target.value)}
              disabled={isApproved}
            />
          </div>
          <div className="space-y-1.5 text-xs text-muted-foreground">
            <Label>Submitted</Label>
            <div>{visit.data.submitted_at ? formatDateDMY(visit.data.submitted_at) : '—'}</div>
            <Label>Approved</Label>
            <div>{visit.data.approved_at ? formatDateDMY(visit.data.approved_at) : '—'}</div>
          </div>
        </CardContent>
      </Card>

      <InspectionFormRenderer responses={draft} onChange={setDraft} readOnly={isApproved} />

      {editError && <p className="text-sm text-destructive">{editError}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!canDraft || save.isPending}
            onClick={() => {
              setEditError(null);
              save.mutate(
                {
                  responses: draft as Record<string, unknown>,
                  inspected_by_name: inspectedByEdit,
                },
                { onError: (e: Error) => setEditError(e.message) },
              );
            }}
          >
            <Save className="mr-2 h-4 w-4" />
            {save.isPending ? 'Saving…' : 'Save draft'}
          </Button>
          <Button
            disabled={!canSubmitAction || save.isPending || transition.isPending}
            onClick={() => {
              setEditError(null);
              save.mutate(
                {
                  responses: draft as Record<string, unknown>,
                  inspected_by_name: inspectedByEdit,
                },
                {
                  onSuccess: () =>
                    transition.mutate(
                      { to: 'submitted', userId: user!.id },
                      { onError: (e: Error) => setEditError(e.message) },
                    ),
                  onError: (e: Error) => setEditError(e.message),
                },
              );
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            Submit for approval
          </Button>
          <Button
            disabled={!canApproveAction || transition.isPending}
            onClick={() => {
              setEditError(null);
              transition.mutate(
                { to: 'approved', userId: user!.id },
                { onError: (e: Error) => setEditError(e.message) },
              );
            }}
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
