import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  useCommunityCouncils,
  useDistricts,
  useEnterpriseTypes,
  useOrganizations,
  useResourceCenters,
  useRounds,
  useVillages,
} from '@/lib/catalogs';
import type { Database } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Single-form registration. Required for "minimal" save: org (or implied by
 * district), round, district, type, beneficiary names. Optional cover-page
 * fields can be filled here or later via /enterprises/:id.
 *
 * The DB trigger `enterprises_geo_consistency()` will validate the geo FK chain
 * server-side and reject inconsistent combinations (e.g., CC not in district).
 */
export function NewEnterprisePage() {
  const navigate = useNavigate();
  const { isSuperAdmin, organizationId } = useAuth();
  const { data: orgs } = useOrganizations();
  const { data: rounds } = useRounds();
  const { data: types } = useEnterpriseTypes();

  // Super Admin: default to their home org (if they have one set in user_profiles)
  // so the dropdown pre-selects sensibly. They can still switch per-entry.
  const [orgIdLocal, setOrgIdLocal] = useState<string | undefined>(
    isSuperAdmin ? (organizationId ?? undefined) : undefined,
  );
  const effectiveOrgId = isSuperAdmin ? orgIdLocal : (organizationId ?? undefined);

  const { data: districts } = useDistricts(effectiveOrgId ?? null);
  const [districtId, setDistrictId] = useState<string | undefined>(undefined);
  const { data: ccs } = useCommunityCouncils(districtId ?? null);
  const { data: rcs } = useResourceCenters(districtId ?? null);
  const { data: villages } = useVillages(districtId ?? null);

  const [form, setForm] = useState({
    round_id: '',
    enterprise_type_id: '',
    beneficiary_short_name: '',
    applicant_organisation_name: '',
    community_council_id: '',
    resource_center_id: '',
    village_id: '',
    location_detail: '',
    beneficiary_contact_phone: '',
    service_provider_name: '',
    project_title: '',
    registration_number: '',
    period_start: '',
    period_end: '',
    total_project_cost_lsl: '',
    total_grant_lsl: '',
    current_grant_payment_lsl: '',
    principal_applicant_name: '',
  });
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!effectiveOrgId) throw new Error('Organization is required.');
      if (!form.round_id) throw new Error('Round is required.');
      if (!form.enterprise_type_id) throw new Error('Enterprise type is required.');
      if (!districtId) throw new Error('District is required.');
      if (!form.beneficiary_short_name.trim()) throw new Error('Beneficiary name is required.');

      const payload: Database['public']['Tables']['enterprises']['Insert'] = {
        organization_id: effectiveOrgId,
        round_id: Number(form.round_id),
        enterprise_type_id: Number(form.enterprise_type_id),
        district_id: districtId,
        beneficiary_short_name: form.beneficiary_short_name.trim(),
        applicant_organisation_name:
          form.applicant_organisation_name.trim() || form.beneficiary_short_name.trim(),
        community_council_id: form.community_council_id || null,
        resource_center_id: form.resource_center_id || null,
        village_id: form.village_id || null,
        location_detail: form.location_detail.trim() || null,
        beneficiary_contact_phone: form.beneficiary_contact_phone.trim() || null,
        service_provider_name: form.service_provider_name.trim() || null,
        project_title: form.project_title.trim() || null,
        registration_number: form.registration_number.trim() || null,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        total_project_cost_lsl: form.total_project_cost_lsl
          ? Number(form.total_project_cost_lsl)
          : null,
        total_grant_lsl: form.total_grant_lsl ? Number(form.total_grant_lsl) : null,
        current_grant_payment_lsl: form.current_grant_payment_lsl
          ? Number(form.current_grant_payment_lsl)
          : null,
        principal_applicant_name: form.principal_applicant_name.trim() || null,
      };

      // Determine completeness flag from the data we actually have.
      const ready = Boolean(
        payload.project_title &&
          payload.registration_number &&
          payload.period_start &&
          payload.period_end &&
          payload.total_project_cost_lsl !== null &&
          payload.total_grant_lsl !== null &&
          payload.principal_applicant_name &&
          payload.community_council_id &&
          payload.resource_center_id,
      );
      payload.registration_completeness = ready ? 'cover_page_ready' : 'minimal';

      const { data, error: err } = await supabase
        .from('enterprises')
        .insert(payload)
        .select('id')
        .single();
      if (err) throw err;
      return data.id as string;
    },
    onSuccess: (id) => navigate(`/enterprises/${id}`),
    onError: (e: Error) => setError(e.message),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    create.mutate();
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Register new enterprise</h1>
        <p className="text-sm text-muted-foreground">
          The first block of fields is required. Fill in the cover-page fields now or later — the row
          starts at <code>minimal</code> and auto-promotes to <code>cover_page_ready</code> once every
          required cover-page field is populated.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {isSuperAdmin && (
              <div className="space-y-1.5 md:col-span-2">
                <Label>Organization</Label>
                <Select value={orgIdLocal} onValueChange={setOrgIdLocal}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization…" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs?.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.code} — {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Round</Label>
              <Select value={form.round_id} onValueChange={(v) => update('round_id', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select round…" />
                </SelectTrigger>
                <SelectContent>
                  {rounds?.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>
                      {r.name} ({r.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Enterprise type</Label>
              <Select
                value={form.enterprise_type_id}
                onValueChange={(v) => update('enterprise_type_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  {types?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>District</Label>
              <Select value={districtId} onValueChange={setDistrictId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select district…" />
                </SelectTrigger>
                <SelectContent>
                  {districts?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="short">Beneficiary short name</Label>
              <Input
                id="short"
                value={form.beneficiary_short_name}
                onChange={(e) => update('beneficiary_short_name', e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="formal">Formal applicant organisation name</Label>
              <Input
                id="formal"
                value={form.applicant_organisation_name}
                onChange={(e) => update('applicant_organisation_name', e.target.value)}
                placeholder="Defaults to short name if left blank"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location (recommended)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Community Council</Label>
              <Select
                value={form.community_council_id || undefined}
                onValueChange={(v) => update('community_council_id', v)}
                disabled={!districtId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select CC…" />
                </SelectTrigger>
                <SelectContent>
                  {ccs?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Resource Center</Label>
              <Select
                value={form.resource_center_id || undefined}
                onValueChange={(v) => update('resource_center_id', v)}
                disabled={!districtId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select RC…" />
                </SelectTrigger>
                <SelectContent>
                  {rcs?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Village</Label>
              <Select
                value={form.village_id || undefined}
                onValueChange={(v) => update('village_id', v)}
                disabled={!districtId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select village…" />
                </SelectTrigger>
                <SelectContent>
                  {villages?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="loc">Location detail (free text)</Label>
              <Input
                id="loc"
                value={form.location_detail}
                onChange={(e) => update('location_detail', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact + Service Provider</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Beneficiary contact phone</Label>
              <Input
                id="phone"
                value={form.beneficiary_contact_phone}
                onChange={(e) => update('beneficiary_contact_phone', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sp">Service Provider name</Label>
              <Input
                id="sp"
                value={form.service_provider_name}
                onChange={(e) => update('service_provider_name', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cover-page fields (optional now, required for PDF)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="title">Project title</Label>
              <Input
                id="title"
                value={form.project_title}
                onChange={(e) => update('project_title', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="regno">Registration number</Label>
              <Input
                id="regno"
                value={form.registration_number}
                onChange={(e) => update('registration_number', e.target.value)}
                placeholder="e.g. D2024063"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pa">Principal applicant name</Label>
              <Input
                id="pa"
                value={form.principal_applicant_name}
                onChange={(e) => update('principal_applicant_name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ps">Period start</Label>
              <Input
                id="ps"
                type="date"
                value={form.period_start}
                onChange={(e) => update('period_start', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pe">Period end</Label>
              <Input
                id="pe"
                type="date"
                value={form.period_end}
                onChange={(e) => update('period_end', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tpc">Total project cost (M)</Label>
              <Input
                id="tpc"
                type="number"
                step="0.01"
                value={form.total_project_cost_lsl}
                onChange={(e) => update('total_project_cost_lsl', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tg">Total grant (M)</Label>
              <Input
                id="tg"
                type="number"
                step="0.01"
                value={form.total_grant_lsl}
                onChange={(e) => update('total_grant_lsl', e.target.value)}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="cgp">Current grant payment (M)</Label>
              <Input
                id="cgp"
                type="number"
                step="0.01"
                value={form.current_grant_payment_lsl}
                onChange={(e) => update('current_grant_payment_lsl', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Saving…' : 'Save enterprise'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/enterprises')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
