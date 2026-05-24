import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnterprise, useEnterpriseHistory, isCoverPageReady } from '@/lib/enterprises';
import { useCommunityCouncils, useDistricts, useEnterpriseTypes, useResourceCenters, useVillages } from '@/lib/catalogs';
import {
  useEssfSubmission,
  useEmmpSubmission,
  useEmmpTemplateForType,
  useInspectionVisits,
  useEnterpriseEsmpStatus,
} from '@/lib/esmp';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import type { EnterpriseRow } from '@/types/database';
import { FileText, Upload, ClipboardList, FileCheck2, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { formatDateDMY, formatLSL } from '@/lib/utils';

const ESMP_LABEL: Record<string, string> = {
  not_started: 'Not started',
  pending_app_completion: 'In app, in progress',
  completed_uploaded: 'Uploaded (scanned)',
  completed_in_app: 'Completed in app',
};

const COMPUTED_LABEL: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  ready_for_m1: 'Ready for Milestone 1',
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

  const [draft, setDraft] = useState<Partial<EnterpriseRow>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

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

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{enterprise.beneficiary_short_name}</h1>
          <p className="text-sm text-muted-foreground">
            {types?.find((t) => t.id === enterprise.enterprise_type_id)?.name ?? '—'} · R
            {enterprise.round_id} ·{' '}
            {districts?.find((d) => d.id === enterprise.district_id)?.name ?? '—'}
          </p>
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
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="esmp">ESMP</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Progress + budget</CardTitle>
              <CardDescription>
                Tracking dimensions from the validated central-region progress report.
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
                  esmpStatus.data?.computed_status === 'ready_for_m1'
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
          <Card>
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
          <Card>
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

          {/* 3. Inspection visits */}
          <Card>
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
                  {enterprise.esmp_uploaded_pdf_url && (
                    <a
                      href={enterprise.esmp_uploaded_pdf_url}
                      target="_blank"
                      rel="noopener"
                      className="text-sm text-primary hover:underline"
                    >
                      View uploaded PDF
                    </a>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Update legacy status</Label>
                  <Select
                    value={draft.esmp_status ?? enterprise.esmp_status}
                    onValueChange={(v) =>
                      set('esmp_status', v as EnterpriseRow['esmp_status'])
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ESMP_LABEL).map(([k, label]) => (
                        <SelectItem key={k} value={k}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                  Save status
                </Button>

                <div className="border-t pt-4 space-y-2">
                  <Label>Upload scanned ESMP (PDF)</Label>
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
