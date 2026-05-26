import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useEnterprise,
  useEnterpriseHistory,
  isCoverPageReady,
  useUploadedEsmpPdfMeta,
  formatBytes,
} from '@/lib/enterprises';
import { useCommunityCouncils, useDistricts, useEnterpriseTypes, useResourceCenters, useVillages } from '@/lib/catalogs';
import {
  useEssfSubmission,
  useEmmpSubmission,
  useEmmpTemplateForType,
  useInspectionVisits,
  useEnterpriseEsmpStatus,
  useExtractEsmpPdf,
  ExtractPdfError,
  type ExtractPdfResult,
} from '@/lib/esmp';
import { useM1Submission } from '@/lib/m1';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { getEnterpriseVisual, type EnterpriseCategory } from '@/lib/enterprise-icons';
import type { EnterpriseRow, SubmissionStatus } from '@/types/database';
import { FileText, Upload, ClipboardList, FileCheck2, Plus, ChevronRight, ChevronDown, Sparkles, Loader2, AlertTriangle } from 'lucide-react';
import { formatDateDMY, formatLSL, cn } from '@/lib/utils';

/** Colored left-edge border that matches a submission's status. */
function statusBorder(status: SubmissionStatus | null | undefined): string {
  switch (status) {
    case 'approved':
      return 'border-l-4 border-l-success';
    case 'submitted':
      return 'border-l-4 border-l-warning';
    case 'draft':
      return 'border-l-4 border-l-info';
    default:
      return 'border-l-4 border-l-muted-foreground/30';
  }
}

const ESMP_LABEL: Record<string, string> = {
  not_started: 'Not started',
  pending_app_completion: 'In app, in progress',
  completed_uploaded: 'Uploaded (scanned)',
  completed_in_app: 'Completed in app',
};

const COMPUTED_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete (ESSF + EMMP approved)',
  legacy_pdf: 'Legacy PDF on file',
};

export function EnterpriseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: enterprise, isLoading, error } = useEnterprise(id);
  const { data: types } = useEnterpriseTypes();
  const { data: districts } = useDistricts();
  const { data: ccs } = useCommunityCouncils(enterprise?.district_id ?? null);
  const { data: rcs } = useResourceCenters(enterprise?.district_id ?? null);
  const { data: villages } = useVillages(enterprise?.district_id ?? null);
  const { data: history } = useEnterpriseHistory(id);
  const qc = useQueryClient();

  // Phase-2 ESMP reads
  const essf = useEssfSubmission(id);
  const emmpTemplate = useEmmpTemplateForType(enterprise?.enterprise_type_id);
  const emmp = useEmmpSubmission(id);
  const inspections = useInspectionVisits(id);
  const esmpStatus = useEnterpriseEsmpStatus(id);
  const m1 = useM1Submission(id);

  const [draft, setDraft] = useState<Partial<EnterpriseRow>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  const [lastExtract, setLastExtract] = useState<ExtractPdfResult | null>(null);
  const extract = useExtractEsmpPdf(id ?? '');
  const pdfMeta = useUploadedEsmpPdfMeta(id, !!enterprise?.esmp_uploaded_pdf_url);
  // Tab state is driven by the URL ?tab= search param so:
  //   1. Back-to-enterprise links from sub-form pages can target a tab
  //      (e.g. EssfEditPage uses ?tab=esmp).
  //   2. A page refresh keeps the user on the same tab — without this,
  //      Tabs falls back to defaultValue and dumps everyone on Details.
  // `replace: true` keeps tab switches out of browser history so the back
  // button still returns to the previous *page*, not the previous tab.
  const [searchParams, setSearchParams] = useSearchParams();
  const allowedTabs = ['details', 'progress', 'esmp', 'm1', 'history'] as const;
  type TabId = (typeof allowedTabs)[number];
  const tabFromUrl = searchParams.get('tab');
  const currentTab: TabId = (allowedTabs as readonly string[]).includes(tabFromUrl ?? '')
    ? (tabFromUrl as TabId)
    : 'details';
  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'details') params.delete('tab');
    else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    if (enterprise) setDraft(enterprise);
  }, [enterprise]);

  const save = useMutation({
    mutationFn: async () => {
      if (!enterprise) throw new Error('No enterprise');
      const merged = { ...enterprise, ...draft };
      const ready = isCoverPageReady(merged as EnterpriseRow);
      const { error: err } = await supabase
        .from('enterprises')
        .update({
          ...draft,
          registration_completeness: ready ? 'cover_page_ready' : 'minimal',
        })
        .eq('id', enterprise.id);
      if (err) throw err;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise', id] });
      qc.invalidateQueries({ queryKey: ['enterprise-history', id] });
      qc.invalidateQueries({ queryKey: ['enterprises'] });
    },
    onError: (e: Error) => setSaveError(e.message),
  });

  const uploadEsmp = useMutation({
    mutationFn: async (file: File) => {
      if (!enterprise) throw new Error('No enterprise');
      const path = `${enterprise.id}.pdf`;
      const up = await supabase.storage
        .from('esmp-pdfs')
        .upload(path, file, { upsert: true, contentType: 'application/pdf' });
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage
        .from('esmp-pdfs')
        .createSignedUrl(path, 60 * 60 * 24 * 30);
      const { error: err } = await supabase
        .from('enterprises')
        .update({
          esmp_status: 'completed_uploaded',
          esmp_uploaded_pdf_url: signed?.signedUrl ?? null,
        })
        .eq('id', enterprise.id);
      if (err) throw err;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enterprise', id] });
      qc.invalidateQueries({ queryKey: ['enterprise-history', id] });
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!enterprise) return null;

  const ready = isCoverPageReady({ ...enterprise, ...draft } as EnterpriseRow);

  function set<K extends keyof EnterpriseRow>(key: K, value: EnterpriseRow[K] | null) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  const typeInfo = types?.find((t) => t.id === enterprise.enterprise_type_id);
  const visual = getEnterpriseVisual(typeInfo?.name, typeInfo?.category as EnterpriseCategory);
  const TypeIcon = visual.icon;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg shrink-0', visual.tileBg)}>
            <TypeIcon className={cn('h-6 w-6', visual.iconColor)} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{enterprise.beneficiary_short_name}</h1>
            <p className="text-sm text-muted-foreground">
              {typeInfo?.name ?? '—'} · R
              {enterprise.round_id} ·{' '}
              {districts?.find((d) => d.id === enterprise.district_id)?.name ?? '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={enterprise.registration_completeness === 'cover_page_ready' ? 'default' : 'outline'}>
            {enterprise.registration_completeness === 'cover_page_ready' ? 'Cover-page ready' : 'Minimal'}
          </Badge>
          {ready && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/enterprises/${enterprise.id}/cover-page.pdf`} target="_blank" rel="noopener">
                <FileText className="mr-2 h-4 w-4" />
                Cover-page PDF
              </Link>
            </Button>
          )}
          {essf.data && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/enterprises/${enterprise.id}/esmp.pdf`} target="_blank" rel="noopener">
                <FileText className="mr-2 h-4 w-4" />
                ESMP report
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="esmp">ESMP</TabsTrigger>
          <TabsTrigger value="m1">Milestone 1</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Beneficiary short name">
                <Input
                  value={draft.beneficiary_short_name ?? ''}
                  onChange={(e) => set('beneficiary_short_name', e.target.value)}
                />
              </Field>
              <Field label="Formal applicant organisation">
                <Input
                  value={draft.applicant_organisation_name ?? ''}
                  onChange={(e) => set('applicant_organisation_name', e.target.value)}
                />
              </Field>
              <Field label="Project title">
                <Input
                  value={draft.project_title ?? ''}
                  onChange={(e) => set('project_title', e.target.value || null)}
                />
              </Field>
              <Field label="Registration number">
                <Input
                  value={draft.registration_number ?? ''}
                  onChange={(e) => set('registration_number', e.target.value || null)}
                />
              </Field>
              <Field label="Principal applicant">
                <Input
                  value={draft.principal_applicant_name ?? ''}
                  onChange={(e) => set('principal_applicant_name', e.target.value || null)}
                />
              </Field>
              <Field label="Service Provider (name)">
                <Input
                  value={draft.service_provider_name ?? ''}
                  onChange={(e) => set('service_provider_name', e.target.value || null)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Community Council">
                <Select
                  value={draft.community_council_id ?? undefined}
                  onValueChange={(v) => set('community_council_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {ccs?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Resource Center">
                <Select
                  value={draft.resource_center_id ?? undefined}
                  onValueChange={(v) => set('resource_center_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {rcs?.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Village">
                <Select
                  value={draft.village_id ?? undefined}
                  onValueChange={(v) => set('village_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {villages?.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Location detail">
                <Input
                  value={draft.location_detail ?? ''}
                  onChange={(e) => set('location_detail', e.target.value || null)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financials + period</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label="Period start">
                <Input
                  type="date"
                  value={draft.period_start ?? ''}
                  onChange={(e) => set('period_start', e.target.value || null)}
                />
              </Field>
              <Field label="Period end">
                <Input
                  type="date"
                  value={draft.period_end ?? ''}
                  onChange={(e) => set('period_end', e.target.value || null)}
                />
              </Field>
              <Field label={`Total project cost ${formatLSL(draft.total_project_cost_lsl)}`}>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.total_project_cost_lsl ?? ''}
                  onChange={(e) =>
                    set('total_project_cost_lsl', e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              </Field>
              <Field label={`Total grant ${formatLSL(draft.total_grant_lsl)}`}>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.total_grant_lsl ?? ''}
                  onChange={(e) =>
                    set('total_grant_lsl', e.target.value === '' ? null : Number(e.target.value))
                  }
                />
              </Field>
              <Field label={`Current grant payment ${formatLSL(draft.current_grant_payment_lsl)}`}>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.current_grant_payment_lsl ?? ''}
                  onChange={(e) =>
                    set(
                      'current_grant_payment_lsl',
                      e.target.value === '' ? null : Number(e.target.value),
                    )
                  }
                />
              </Field>
              <Field label="Beneficiary contact phone">
                <Input
                  value={draft.beneficiary_contact_phone ?? ''}
                  onChange={(e) => set('beneficiary_contact_phone', e.target.value || null)}
                />
              </Field>
            </CardContent>
          </Card>

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}
          <div className="flex items-center gap-3">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Completeness will auto-set to{' '}
              <code>{ready ? 'cover_page_ready' : 'minimal'}</code> on save.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card className="bg-gradient-to-br from-tint-success/40 to-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Progress at a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProgressRow
                label="Cover-page registration"
                tone={enterprise.registration_completeness === 'cover_page_ready' ? 'success' : 'warning'}
                value={enterprise.registration_completeness === 'cover_page_ready' ? 100 : 40}
                detail={enterprise.registration_completeness === 'cover_page_ready' ? 'Ready' : 'Minimal info on file'}
              />
              <ProgressRow
                label="Procurement plan"
                tone={
                  enterprise.procurement_plan_status === 'done' ? 'success'
                    : enterprise.procurement_plan_status === 'in_progress' ? 'warning' : 'neutral'
                }
                value={
                  enterprise.procurement_plan_status === 'done' ? 100
                    : enterprise.procurement_plan_status === 'in_progress' ? 50 : 0
                }
                detail={enterprise.procurement_plan_status.replace(/_/g, ' ')}
              />
              <ProgressRow
                label="Business plan"
                tone={
                  ['done_validated', 'validated_submitted'].includes(enterprise.business_plan_status) ? 'success'
                    : ['done_to_be_validated', 'submitted'].includes(enterprise.business_plan_status) ? 'warning'
                    : enterprise.business_plan_status === 'in_progress' ? 'info' : 'neutral'
                }
                value={
                  enterprise.business_plan_status === 'validated_submitted' ? 100
                    : enterprise.business_plan_status === 'submitted' ? 80
                    : enterprise.business_plan_status === 'done_validated' ? 70
                    : enterprise.business_plan_status === 'done_to_be_validated' ? 55
                    : enterprise.business_plan_status === 'in_progress' ? 30
                    : 0
                }
                detail={enterprise.business_plan_status.replace(/_/g, ' ')}
              />
              <ProgressRow
                label="Milestone 1 report"
                tone={
                  enterprise.milestone1_report_status === 'done_submitted' ? 'success'
                    : enterprise.milestone1_report_status === 'done_not_submitted' ? 'warning'
                    : enterprise.milestone1_report_status === 'in_progress' ? 'info' : 'neutral'
                }
                value={
                  enterprise.milestone1_report_status === 'done_submitted' ? 100
                    : enterprise.milestone1_report_status === 'done_not_submitted' ? 75
                    : enterprise.milestone1_report_status === 'in_progress' ? 40
                    : 0
                }
                detail={enterprise.milestone1_report_status.replace(/_/g, ' ')}
              />
              <ProgressRow
                label="Drilling"
                tone={
                  ['drilled', 'pre_existing', 'not_needed'].includes(enterprise.drilling_status) ? 'success'
                    : enterprise.drilling_status === 'in_progress' ? 'warning'
                    : enterprise.drilling_status === 'not_drilled' ? 'destructive' : 'neutral'
                }
                value={
                  ['drilled', 'pre_existing', 'not_needed'].includes(enterprise.drilling_status) ? 100
                    : enterprise.drilling_status === 'in_progress' ? 50
                    : 0
                }
                detail={enterprise.drilling_status.replace(/_/g, ' ')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress + budget</CardTitle>
              <CardDescription>
                Edit any of the dimensions below. The summary above updates after you save.
                ESMP status lives on its own tab.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Field label={`Budget ${formatLSL(draft.budget_lsl)}`}>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.budget_lsl ?? ''}
                  onChange={(e) =>
                    set('budget_lsl', e.target.value === '' ? null : Number(e.target.value))
                  }
                  placeholder="e.g. 250000"
                />
              </Field>
              <Field label="Procurement Plan">
                <Select
                  value={draft.procurement_plan_status ?? enterprise.procurement_plan_status}
                  onValueChange={(v) =>
                    set('procurement_plan_status', v as EnterpriseRow['procurement_plan_status'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Business Plan">
                <Select
                  value={draft.business_plan_status ?? enterprise.business_plan_status}
                  onValueChange={(v) =>
                    set('business_plan_status', v as EnterpriseRow['business_plan_status'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done_to_be_validated">Done, to be validated</SelectItem>
                    <SelectItem value="done_validated">Done & validated</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="validated_submitted">Validated & submitted</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Milestone 1 Report">
                <Select
                  value={draft.milestone1_report_status ?? enterprise.milestone1_report_status}
                  onValueChange={(v) =>
                    set('milestone1_report_status', v as EnterpriseRow['milestone1_report_status'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="done_not_submitted">Done, not submitted</SelectItem>
                    <SelectItem value="done_submitted">Done & submitted</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Drilling">
                <Select
                  value={draft.drilling_status ?? enterprise.drilling_status}
                  onValueChange={(v) =>
                    set('drilling_status', v as EnterpriseRow['drilling_status'])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unknown</SelectItem>
                    <SelectItem value="not_needed">Not needed</SelectItem>
                    <SelectItem value="pre_existing">Pre-existing borehole</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="drilled">Drilled</SelectItem>
                    <SelectItem value="not_drilled">Not drilled</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </CardContent>
            <div className="px-6 pb-6">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="esmp" className="space-y-4">
          {/* Overall computed status — green when ESSF + EMMP are both approved */}
          <Card className="bg-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ESMP status</CardTitle>
              <CardDescription>
                Computed from the three sub-forms below. M&E Officer or Team Leader must
                approve each one. Approval is locked to a different user than the submitter.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge
                variant={
                  esmpStatus.data?.computed_status === 'complete'
                    ? 'default'
                    : esmpStatus.data?.computed_status === 'in_progress'
                      ? 'secondary'
                      : 'outline'
                }
              >
                {COMPUTED_LABEL[esmpStatus.data?.computed_status ?? 'not_started']}
              </Badge>
            </CardContent>
          </Card>

          {/* 1. ESSF */}
          <Card className={cn('transition-shadow hover:shadow-md', statusBorder(essf.data?.status))}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Environmental & Social Screening Form (ESSF)
                  </CardTitle>
                  <CardDescription>
                    One per enterprise. Identifies site sensitivity, project completeness, and a
                    24-question checklist.
                  </CardDescription>
                </div>
                <StatusBadge status={essf.data?.status ?? null} />
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="space-y-0.5">
                {essf.data?.submitted_at && (
                  <div>Submitted: {formatDateDMY(essf.data.submitted_at)}</div>
                )}
                {essf.data?.approved_at && (
                  <div>Approved: {formatDateDMY(essf.data.approved_at)}</div>
                )}
                {!essf.data && <div>Not yet started.</div>}
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={`/enterprises/${enterprise.id}/essf`}>
                  {essf.data ? 'Open' : 'Start ESSF'}
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* 2. EMMP */}
          <Card className={cn('transition-shadow hover:shadow-md', statusBorder(emmp.data?.status))}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4 text-primary" />
                    Environmental Management & Monitoring Plan (EMMP)
                  </CardTitle>
                  <CardDescription>
                    {emmpTemplate.data
                      ? `Template: ${emmpTemplate.data.title}`
                      : emmpTemplate.isLoading
                        ? 'Loading template…'
                        : 'No in-app template for this enterprise type (use Legacy upload below).'}
                  </CardDescription>
                </div>
                <StatusBadge status={emmp.data?.status ?? null} />
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="space-y-0.5">
                {emmp.data?.submitted_at && (
                  <div>Submitted: {formatDateDMY(emmp.data.submitted_at)}</div>
                )}
                {emmp.data?.approved_at && (
                  <div>Approved: {formatDateDMY(emmp.data.approved_at)}</div>
                )}
                {!emmp.data && <div>Not yet started.</div>}
              </div>
              <Button asChild size="sm" variant="outline" disabled={!emmpTemplate.data}>
                <Link to={`/enterprises/${enterprise.id}/emmp`}>
                  {emmp.data ? 'Open' : 'Start EMMP'}
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* 3. Inspection visits — border tone reflects most-recent visit */}
          <Card className={cn('transition-shadow hover:shadow-md', statusBorder(inspections.data?.[0]?.status))}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    Compliance monitoring visits
                  </CardTitle>
                  <CardDescription>
                    21-aspect checklist across three phases (pre-construction, construction,
                    operation). One row per site visit; the most recent one feeds the overall
                    ESMP status.
                  </CardDescription>
                </div>
                <Button asChild size="sm">
                  <Link to={`/enterprises/${enterprise.id}/inspections/new`}>
                    <Plus className="mr-1 h-3 w-3" />
                    New visit
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {inspections.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : inspections.data && inspections.data.length > 0 ? (
                <ul className="divide-y text-sm">
                  {inspections.data.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                    >
                      <div>
                        <div className="font-medium">
                          {formatDateDMY(v.visit_date)} ·{' '}
                          <span className="text-muted-foreground font-normal">
                            {v.inspected_by_name}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {v.submitted_at && `Submitted ${formatDateDMY(v.submitted_at)}`}
                          {v.submitted_at && v.approved_at && ' · '}
                          {v.approved_at && `Approved ${formatDateDMY(v.approved_at)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={v.status} />
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/enterprises/${enterprise.id}/inspections/${v.id}`}>
                            Open
                            <ChevronRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Milestone 1 lived here briefly; promoted to its own top-level
              tab so it sits parallel to ESMP — see the <TabsContent value="m1">
              block below. */}

          {/* Legacy: scanned-PDF upload (collapsed by default) */}
          <Card>
            <CardHeader className="pb-2">
              <button
                type="button"
                onClick={() => setShowLegacy((s) => !s)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <CardTitle className="text-sm">Legacy: scanned-PDF upload</CardTitle>
                  <CardDescription className="text-xs">
                    Pre-Phase-2 workflow. Use this only if the in-app forms are not yet
                    suitable for a given enterprise (e.g. Fish Production while its EMMP
                    template is being prepared).
                  </CardDescription>
                </div>
                {showLegacy ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </CardHeader>
            {showLegacy && (
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    Current: {ESMP_LABEL[enterprise.esmp_status] ?? enterprise.esmp_status}
                  </Badge>
                </div>

                {/* Uploaded-PDF file card. Original filename isn't preserved on
                    upload (file is stored as <enterpriseId>.pdf), so we
                    construct a sensible display name from the beneficiary and
                    show storage metadata (size + last-updated) to make it
                    obvious what's actually on file.                          */}
                {enterprise.esmp_uploaded_pdf_url && (
                  <a
                    href={enterprise.esmp_uploaded_pdf_url}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-3 rounded-md border p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="rounded-md bg-primary/10 p-2 shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        ESMP — {enterprise.beneficiary_short_name}.pdf
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {pdfMeta.isLoading ? (
                          'Loading file info…'
                        ) : pdfMeta.data ? (
                          <>
                            {formatBytes(pdfMeta.data.size)} · Uploaded{' '}
                            {formatDateDMY(pdfMeta.data.uploaded_at)}
                          </>
                        ) : (
                          'PDF on file'
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-primary shrink-0">Open ↗</span>
                  </a>
                )}

                {/* ---------- Auto-extract ESMP responses from the PDF ----------
                    Calls extract-esmp-pdf-v3 edge function which sends the PDF
                    to Claude, parses structured responses, and writes draft
                    essf_submissions + emmp_submissions rows. Field supervisor
                    reviews + corrects before submitting — see the warning
                    banners that appear on the ESSF / EMMP edit pages.

                    We pre-flight check the submission states so the user
                    isn't surprised by a 409 from the server: if either form
                    is currently approved, the button is disabled and we
                    point at the relevant "Reopen for editing" affordance.   */}
                {enterprise.esmp_uploaded_pdf_url && (() => {
                  const essfApproved = essf.data?.status === 'approved';
                  const emmpApproved = emmp.data?.status === 'approved';
                  // Block extraction when EITHER form is approved — re-running
                  // would skip the approved one anyway and leave the user with
                  // a half-imported state. Better to be explicit.
                  const blocked = essfApproved || emmpApproved;
                  return (
                  <div className="rounded-md border border-info/30 bg-info/5 p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm">
                        <div className="font-medium flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-info" />
                          Auto-extract responses from the PDF
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reads the uploaded PDF and creates draft ESSF + EMMP submissions
                          you can review and approve. Will overwrite any existing draft —
                          approved submissions are left untouched.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setLastExtract(null);
                          extract.mutate(undefined, {
                            onSuccess: (data) => {
                              setLastExtract(data);
                              const parts: string[] = [];
                              if (data.essf.has_data) parts.push('ESSF');
                              if (data.emmp.status === 'imported' && data.emmp.has_data)
                                parts.push('EMMP');
                              toast.success(
                                parts.length
                                  ? `Drafted: ${parts.join(' + ')} — open to review`
                                  : 'Extraction returned no data — see notes',
                              );
                            },
                            onError: (e: Error) => {
                              if (e instanceof ExtractPdfError && e.status === 409) {
                                toast.error('Cannot re-import', {
                                  description:
                                    e.message +
                                    ' Open the ESSF and click "Reopen for editing", then try again.',
                                });
                              } else {
                                toast.error('Extraction failed', { description: e.message });
                              }
                            },
                          });
                        }}
                        disabled={extract.isPending || blocked}
                      >
                        {extract.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Extracting…
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Extract responses
                          </>
                        )}
                      </Button>
                    </div>
                    {blocked && (
                      <div className="flex items-start gap-1.5 rounded border border-warning/30 bg-warning/5 p-2 text-xs">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <span className="font-medium text-warning">
                            {essfApproved && emmpApproved
                              ? 'ESSF and EMMP are both already approved'
                              : essfApproved
                                ? 'ESSF is already approved'
                                : 'EMMP is already approved'}
                          </span>
                          <span className="text-muted-foreground">
                            {' '}— re-importing would overwrite{' '}
                            {essfApproved && emmpApproved ? 'signed-off forms' : 'a signed-off form'}.
                            Reopen{' '}
                            {essfApproved && emmpApproved
                              ? 'both forms'
                              : essfApproved
                                ? 'the ESSF'
                                : 'the EMMP'}{' '}
                            for editing first if you want to re-run extraction.
                          </span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {essfApproved && (
                              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                                <Link to={`/enterprises/${id}/essf`}>
                                  Reopen ESSF →
                                </Link>
                              </Button>
                            )}
                            {emmpApproved && (
                              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                                <Link to={`/enterprises/${id}/emmp`}>
                                  Reopen EMMP →
                                </Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {extract.isPending && (
                      <p className="text-xs text-muted-foreground">
                        Reading the PDF and asking Claude to map responses to the form
                        schema. Usually takes 20–60 seconds for a 15-page document.
                      </p>
                    )}
                    {lastExtract && (
                      <div className="space-y-2 mt-2 border-t pt-3">
                        <div className="text-sm font-medium flex items-center gap-1.5 text-success">
                          <Sparkles className="h-4 w-4" />
                          Drafts ready — review and submit
                        </div>
                        <div className="text-xs flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-success/40 text-success">
                            ESSF: drafted{lastExtract.essf.has_data ? '' : ' (empty)'}
                          </Badge>
                          {lastExtract.emmp.status === 'imported' && (
                            <Badge variant="outline" className="border-success/40 text-success">
                              EMMP: drafted{lastExtract.emmp.has_data ? '' : ' (empty)'}
                            </Badge>
                          )}
                          {lastExtract.emmp.status === 'no_template' && (
                            <Badge variant="outline">
                              EMMP: skipped — no template for this enterprise type
                            </Badge>
                          )}
                          {lastExtract.emmp.status === 'approved_skip' && (
                            <Badge variant="outline" className="border-warning/40 text-warning">
                              EMMP: already approved — left untouched
                            </Badge>
                          )}
                        </div>
                        {lastExtract.notes.length > 0 && (
                          <details className="text-xs" open>
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              {lastExtract.notes.length} extraction note
                              {lastExtract.notes.length !== 1 ? 's' : ''} — click to collapse
                            </summary>
                            <ul className="mt-2 space-y-1 pl-3">
                              {lastExtract.notes.map((n, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <AlertTriangle
                                    className={cn(
                                      'h-3 w-3 mt-0.5 shrink-0',
                                      n.confidence === 'low' ? 'text-destructive' : 'text-warning',
                                    )}
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
                        <div className="flex gap-2 pt-1">
                          <Button asChild size="sm">
                            <Link to={`/enterprises/${id}/essf`}>Review ESSF →</Link>
                          </Button>
                          {lastExtract.emmp.status === 'imported' && (
                            <Button asChild size="sm" variant="outline">
                              <Link to={`/enterprises/${id}/emmp`}>Review EMMP →</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })()}

                {/* The old "Update legacy status" dropdown lived here. It's
                    been removed because esmp_status is now derived from the
                    digital forms (essf + emmp) — a manual dropdown that
                    could contradict the form state was confusing UX. Status
                    pill at top of the ESMP tab reflects the computed view. */}

                <div className="border-t pt-4 space-y-2">
                  <Label>{enterprise.esmp_uploaded_pdf_url ? 'Replace scanned ESMP (PDF)' : 'Upload scanned ESMP (PDF)'}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadEsmp.mutate(f);
                      }}
                    />
                    {uploadEsmp.isPending && (
                      <span className="text-xs text-muted-foreground inline-flex items-center">
                        <Upload className="mr-1 h-3 w-3" /> Uploading…
                      </span>
                    )}
                  </div>
                  {uploadEsmp.error && (
                    <p className="text-sm text-destructive">{(uploadEsmp.error as Error).message}</p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="m1" className="space-y-4">
          {/* Milestone 1 progress report — promoted from the ESMP tab to its
              own top-level tab so it sits parallel to ESMP. Phase 1 wires up
              the narrative form; Cashbook (Phase 2.1) is also live. Financial
              Report, Bank Reconciliation, and Supporting Documents are in
              the M1 page as separate tabs and will ship in Phase 2.2/2.3 +
              Phase 3 — all on the same m1_submissions row. */}
          <Card className={statusBorder(m1.data?.status)}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCheck2 className="h-4 w-4" />
                    Milestone 1 progress report
                  </CardTitle>
                  <CardDescription>
                    Cover page · Narrative · Cashbook · Financial Report · Bank Reconciliation ·
                    Supporting documents. Narrative + Cashbook are live; the remaining sections
                    are scaffolded inside the M1 page and ship in upcoming phases.
                  </CardDescription>
                </div>
                <StatusBadge status={m1.data?.status ?? null} />
              </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm">
              {m1.data ? (
                <span className="text-muted-foreground">
                  {m1.data.submitted_at && <>Submitted {formatDateDMY(m1.data.submitted_at)} · </>}
                  {m1.data.approved_at && <>Approved {formatDateDMY(m1.data.approved_at)}</>}
                  {!m1.data.submitted_at && !m1.data.approved_at && <>Draft in progress</>}
                </span>
              ) : (
                <span className="text-muted-foreground">Not started.</span>
              )}
              <div className="ml-auto flex gap-2">
                <Button asChild size="sm" variant={m1.data ? 'outline' : 'default'}>
                  <Link to={`/enterprises/${id}/m1`}>
                    {m1.data ? 'Open M1' : 'Start M1'}
                  </Link>
                </Button>
                {m1.data && (
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/enterprises/${id}/m1.pdf`} target="_blank" rel="noopener">
                      <FileText className="mr-1.5 h-3.5 w-3.5" /> M1 report PDF
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit trail</CardTitle>
              <CardDescription>
                Server-recorded via the <code>audit_trigger</code> on the enterprises table.
                Read-only — no one (not even Super Admin) can edit it from the client.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history && history.length === 0 && (
                <p className="text-sm text-muted-foreground">No history yet.</p>
              )}
              <ul className="space-y-3">
                {history?.map((row) => (
                  <li key={row.id} className="border-l-2 pl-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{row.action}</Badge>
                      <span className="text-muted-foreground">
                        {formatDateDMY(row.changed_at)} ·{' '}
                        {new Date(row.changed_at).toLocaleTimeString()}
                      </span>
                    </div>
                    {row.action === 'UPDATE' && row.diff && (
                      <pre className="mt-2 text-xs bg-muted rounded p-2 overflow-x-auto">
                        {JSON.stringify(row.diff, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

type ProgressTone = 'success' | 'warning' | 'info' | 'destructive' | 'neutral';

const PROGRESS_BAR: Record<ProgressTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  info: 'bg-info',
  destructive: 'bg-destructive',
  neutral: 'bg-muted-foreground/40',
};

function ProgressRow({
  label,
  detail,
  value,
  tone,
}: {
  label: string;
  detail: string;
  value: number;
  tone: ProgressTone;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground capitalize">{detail}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', PROGRESS_BAR[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
