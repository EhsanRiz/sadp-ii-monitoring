import { useCallback, useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEnterprises, useEnterpriseLifecycle, type EnterpriseListFilters } from '@/lib/enterprises';
import { LIFECYCLE_MILESTONES, lifecycleGlyph, type LifecycleMilestoneId, type LifecycleValue } from '@/lib/lifecycle';
import type { DrillingStatus, EnterpriseRow, EsmpStatus, Milestone1ReportStatus } from '@/types/database';
import { useDistricts, useEnterpriseTypes, useOrganizations, useResourceCenters } from '@/lib/catalogs';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, FileText, LayoutGrid, List, Sprout, ChevronRight, X as XIcon, CloudDownload } from 'lucide-react';
import { getEnterpriseVisual, type EnterpriseCategory } from '@/lib/enterprise-icons';
import { cn } from '@/lib/utils';
import { OfflineErrorState } from '@/components/OfflineErrorState';
import { PrecacheRcButton } from '@/components/enterprise/PrecacheRcButton';
import { getCachedEnterpriseIds } from '@/lib/precache';

const ESMP_LABEL: Record<string, string> = {
  not_started: 'Not started',
  pending_app_completion: 'In app, in progress',
  completed_uploaded: 'Uploaded (scanned)',
  completed_in_app: 'Completed in app',
};

const ESMP_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  not_started: 'destructive',
  pending_app_completion: 'outline',
  completed_uploaded: 'secondary',
  completed_in_app: 'default',
};

/**
 * 5-segment progress bar showing the five tracking dimensions for one enterprise.
 * Each segment is green when "done-ish", amber for in-progress, grey for not-started.
 */
function dimensionTone(kind: 'cover' | 'esmp' | 'm1' | 'drilling' | 'biz', e: EnterpriseRow):
  'done' | 'progress' | 'idle' {
  switch (kind) {
    case 'cover':
      return e.registration_completeness === 'cover_page_ready' ? 'done' : 'progress';
    case 'esmp':
      return ['completed_in_app', 'completed_uploaded'].includes(e.esmp_status) ? 'done'
        : e.esmp_status === 'pending_app_completion' ? 'progress' : 'idle';
    case 'm1':
      return e.milestone1_report_status === 'done_submitted' ? 'done'
        : ['in_progress', 'done_not_submitted'].includes(e.milestone1_report_status) ? 'progress' : 'idle';
    case 'drilling':
      return ['drilled', 'pre_existing', 'not_needed'].includes(e.drilling_status) ? 'done'
        : e.drilling_status === 'in_progress' ? 'progress'
        : e.drilling_status === 'not_drilled' ? 'idle' : 'idle';
    case 'biz':
      return ['done_validated', 'validated_submitted'].includes(e.business_plan_status) ? 'done'
        : ['done_to_be_validated', 'submitted', 'in_progress'].includes(e.business_plan_status) ? 'progress' : 'idle';
  }
}

const DOT_CLASS: Record<'done' | 'progress' | 'idle', string> = {
  done: 'bg-success',
  progress: 'bg-warning',
  idle: 'bg-muted-foreground/25',
};

const DIMENSIONS = [
  { key: 'cover',    label: 'Cover-page registration' },
  { key: 'esmp',     label: 'ESMP' },
  { key: 'biz',      label: 'Business plan' },
  { key: 'm1',       label: 'Milestone 1 report' },
  { key: 'drilling', label: 'Drilling' },
] as const;

/**
 * Compact five-dimension status row: one small dot per dimension, color-coded.
 * green=done, amber=in-progress, muted-grey=not-started. Hover any dot for the
 * dimension name + status.
 */
function ProgressDots({ e }: { e: EnterpriseRow }) {
  const summary = DIMENSIONS.map((d) => dimensionTone(d.key, e));
  const doneCount = summary.filter((t) => t === 'done').length;
  return (
    <div className="flex items-center gap-2" aria-label={`${doneCount} of ${DIMENSIONS.length} dimensions complete`}>
      <div className="flex items-center gap-1">
        {DIMENSIONS.map((d, i) => (
          <span
            key={d.key}
            title={`${d.label}: ${summary[i]}`}
            className={cn('h-2 w-2 rounded-full', DOT_CLASS[summary[i]])}
          />
        ))}
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">
        {doneCount} / {DIMENSIONS.length}
      </span>
    </div>
  );
}

export function EnterprisesListPage() {
  // Filter state is held in the URL via useSearchParams (not local state) so
  // that clicking into an enterprise and then hitting the browser back button
  // restores the exact filtered view. URL-driven state also makes filtered
  // results shareable / bookmarkable.
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  // Passed via Link `state` so the enterprise detail page can render a
  // visible "← Back to filtered list" chip. Saved as the full URL (path +
  // query) so the back-link restores exactly which filter the user was in.
  // Bookmarked / shared / refreshed detail pages won't have this state,
  // and the detail header just hides the chip in that case.
  const linkState = { from: location.pathname + location.search };

  // Derive filters from URL on every render — single source of truth.
  const filters = useMemo<EnterpriseListFilters>(
    () => ({
      search:            searchParams.get('q') ?? '',
      organizationCode:  searchParams.get('orgCode') ?? null,
      districtId:        searchParams.get('district') ?? null,
      resourceCenterId:  searchParams.get('rc') ?? null,
      enterpriseTypeId:  searchParams.get('type') ? Number(searchParams.get('type')) : null,
      esmpStatus:       (searchParams.get('esmp')      as EsmpStatus               | null) ?? null,
      milestone1Status: (searchParams.get('m1')        as Milestone1ReportStatus   | null) ?? null,
      drillingStatus:   (searchParams.get('drilling')  as DrillingStatus           | null) ?? null,
      completeness:     (searchParams.get('completeness') as 'minimal' | 'cover_page_ready' | null) ?? null,
    }),
    [searchParams],
  );

  // Activity filter is client-side — operates on the lifecycle map. Also
  // round-tripped through the URL so back button restores it.
  const activityId = (searchParams.get('activity') as LifecycleMilestoneId | '__all' | null) ?? '__all';
  const activityValue = (searchParams.get('activityValue') as 'yes' | 'no' | 'n_a' | 'not_tracked' | '__any' | null) ?? '__any';

  /**
   * Patch the URL with the given key/value pairs. `null` removes the key.
   * Uses `replace: true` so filter tweaks don't pollute browser history —
   * the back button still returns to whatever page brought us here.
   */
  const patchParams = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const next = new URLSearchParams(searchParams);
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined || v === '' || v === '__all' || v === '__any') {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  // Shim that mimics the old setFilters(...) signature — accepts a full
  // EnterpriseListFilters object and patches the URL keys in one go. Keeps
  // the body of this component unchanged below.
  const setFilters = useCallback(
    (next: EnterpriseListFilters) => {
      patchParams({
        q:            next.search ?? null,
        orgCode:      next.organizationCode ?? null,
        district:     next.districtId ?? null,
        rc:           next.resourceCenterId ?? null,
        type:         next.enterpriseTypeId ?? null,
        esmp:         next.esmpStatus ?? null,
        m1:           next.milestone1Status ?? null,
        drilling:     next.drillingStatus ?? null,
        completeness: next.completeness ?? null,
      });
    },
    [patchParams],
  );

  const setActivityValue = useCallback(
    (v: 'yes' | 'no' | 'n_a' | 'not_tracked' | '__any') => patchParams({ activityValue: v }),
    [patchParams],
  );

  // Count of active filters — anything non-null/non-default. Drives the
  // "N active · Clear all" pill in the filter card header.
  const activeFilterCount =
    (filters.search ? 1 : 0)
    + (filters.organizationCode ? 1 : 0)
    + (filters.districtId ? 1 : 0)
    + (filters.resourceCenterId ? 1 : 0)
    + (filters.enterpriseTypeId ? 1 : 0)
    + (filters.esmpStatus ? 1 : 0)
    + (filters.milestone1Status ? 1 : 0)
    + (filters.drillingStatus ? 1 : 0)
    + (filters.completeness ? 1 : 0)
    + (activityId !== '__all' ? 1 : 0);

  const clearAllFilters = useCallback(() => {
    // setSearchParams with an empty URLSearchParams wipes every query key
    // (filter + activity + activity-value). The view toggle is in
    // localStorage so it survives.
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);
  const [view, setView] = useState<'table' | 'cards'>(() => {
    // Default to cards on small screens — the 11-column matrix is unreadable
    // on a phone. Desktop respects the user's last choice.
    const stored = localStorage.getItem('enterprises-view') as 'table' | 'cards' | null;
    if (stored) return stored;
    if (typeof window !== 'undefined' && window.innerWidth < 768) return 'cards';
    return 'cards';
  });
  const setViewPersisted = (v: 'table' | 'cards') => {
    setView(v);
    localStorage.setItem('enterprises-view', v);
  };

  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const { data: organizations } = useOrganizations();
  const { data: districts } = useDistricts();
  // When an Org filter is set, scope the District dropdown to that org only.
  // Non-super-admins are already RLS-scoped server-side; the catalog query
  // still returns everything, so we filter client-side here for UI clarity.
  const selectedOrgId = filters.organizationCode
    ? organizations?.find((o) => o.code === filters.organizationCode)?.id
    : null;
  const visibleDistricts = selectedOrgId
    ? districts?.filter((d) => d.organization_id === selectedOrgId)
    : districts;
  const { data: types } = useEnterpriseTypes();
  const { data: rcs } = useResourceCenters(filters.districtId ?? null);
  const { data: enterprises, isLoading, error } = useEnterprises(filters);
  const { data: lifecycle } = useEnterpriseLifecycle();

  // Read the localStorage-backed set of cached enterprise IDs once on mount.
  // Re-read on focus and after the PrecacheRcButton fires (which dispatches
  // a 'sadp:precache-changed' event so we don't have to poll).
  const [cachedIds, setCachedIds] = useState<Set<string>>(() => getCachedEnterpriseIds());
  useEffect(() => {
    const refresh = () => setCachedIds(getCachedEnterpriseIds());
    window.addEventListener('focus', refresh);
    window.addEventListener('sadp:precache-changed', refresh);
    // Polling fallback for when a cache happens in this same tab without a
    // focus event — cheap, 2-second resolution is fine for a status dot.
    const id = window.setInterval(refresh, 2000);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('sadp:precache-changed', refresh);
      window.clearInterval(id);
    };
  }, []);

  // Resolve the selected RC (if any) into the name + count needed by the
  // RC precache button.
  const selectedRc = filters.resourceCenterId
    ? rcs?.find((r) => r.id === filters.resourceCenterId)
    : null;

  // Client-side activity/status filter applied on top of the server-filtered list.
  const filteredEnterprises = useMemo(() => {
    if (!enterprises || activityId === '__all') return enterprises ?? [];
    return enterprises.filter((e) => {
      const row = lifecycle?.[e.id];
      const cell = row ? (row[activityId] as LifecycleValue | null | undefined) : null;
      if (activityValue === '__any') return cell != null; // any tracked value matches
      if (activityValue === 'not_tracked') return cell == null;
      return cell === activityValue;
    });
  }, [enterprises, lifecycle, activityId, activityValue]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enterprises</h1>
          <p className="text-sm text-muted-foreground">
            {enterprises ? `${filteredEnterprises.length} of ${enterprises.length} shown` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Per-RC "Take offline" — only when a Resource Center is filtered.
              This is the headline offline workflow: one tap caches every
              enterprise served by the selected RC. The button shows
              cached-status from localStorage. */}
          {selectedRc && filteredEnterprises.length > 0 && (
            <PrecacheRcButton
              rcId={selectedRc.id}
              rcName={selectedRc.name}
              count={filteredEnterprises.length}
            />
          )}
          {/* view toggle */}
          <div className="hidden md:flex rounded-md border bg-background overflow-hidden">
            <button
              type="button"
              onClick={() => setViewPersisted('cards')}
              className={cn(
                'px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors',
                view === 'cards' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Cards
            </button>
            <button
              type="button"
              onClick={() => setViewPersisted('table')}
              className={cn(
                'px-2.5 py-1.5 text-xs flex items-center gap-1.5 transition-colors',
                view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
              )}
            >
              <List className="h-3.5 w-3.5" /> Table
            </button>
          </div>
          <Button asChild>
            <Link to="/enterprises/new">
              <Plus className="mr-2 h-4 w-4" />
              New enterprise
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            Filter
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="font-normal">
                {activeFilterCount} active
              </Badge>
            )}
          </CardTitle>
          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-7 px-2 text-xs"
            >
              <XIcon className="mr-1 h-3 w-3" />
              Clear all
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Row 1: Search spans wider; Org (super-admin only) + District + RC */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Beneficiary or applicant name…"
                value={filters.search ?? ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            {isSuperAdmin && (
              <div className="space-y-1.5">
                <Label>Organisation</Label>
                <Select
                  value={filters.organizationCode ?? '__all'}
                  onValueChange={(v) =>
                    setFilters({
                      ...filters,
                      organizationCode: v === '__all' ? null : v,
                      // clear downstream filters when org changes — they may not apply
                      districtId: null,
                      resourceCenterId: null,
                    })
                  }
                >
                  <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">All organisations</SelectItem>
                    {organizations?.map((o) => (
                      <SelectItem key={o.id} value={o.code}>
                        {o.code} — {o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>District</Label>
              <Select
                value={filters.districtId ?? '__all'}
                onValueChange={(v) =>
                  setFilters({
                    ...filters,
                    districtId: v === '__all' ? null : v,
                    resourceCenterId: null,
                  })
                }
              >
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All districts</SelectItem>
                  {visibleDistricts?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Resource Center</Label>
              <Select
                value={filters.resourceCenterId ?? '__all'}
                onValueChange={(v) =>
                  setFilters({ ...filters, resourceCenterId: v === '__all' ? null : v })
                }
                disabled={!filters.districtId}
              >
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All RCs</SelectItem>
                  {rcs?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Row 2: Type + Activity + Status (Activity = milestone column from the matrix) */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Enterprise type</Label>
              <Select
                value={filters.enterpriseTypeId ? String(filters.enterpriseTypeId) : '__all'}
                onValueChange={(v) =>
                  setFilters({ ...filters, enterpriseTypeId: v === '__all' ? null : Number(v) })
                }
              >
                <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All types</SelectItem>
                  {types?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Activity (milestone)</Label>
              <Select
                value={activityId}
                onValueChange={(v) => {
                  // Both `activity` and `activityValue` need to change together
                  // when switching activity — patch the URL in one call so the
                  // second key doesn't clobber the first.
                  const nextActivityValue =
                    v === '__all' ? '__any'
                    : activityValue === '__any' ? 'yes'
                    : activityValue;
                  patchParams({ activity: v, activityValue: nextActivityValue });
                }}
              >
                <SelectTrigger><SelectValue placeholder="Any activity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">Any activity</SelectItem>
                  {LIFECYCLE_MILESTONES.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={activityValue}
                onValueChange={(v) => setActivityValue(v as typeof activityValue)}
                disabled={activityId === '__all'}
              >
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any">Any status</SelectItem>
                  <SelectItem value="yes">✓ Yes</SelectItem>
                  <SelectItem value="no">✗ No</SelectItem>
                  <SelectItem value="n_a">N/A</SelectItem>
                  <SelectItem value="not_tracked">– Not yet tracked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <OfflineErrorState
          error={error}
          label="enterprises list"
          retry={[() => qc.invalidateQueries({ queryKey: ['enterprises'] })]}
        />
      )}

      {isLoading ? (
        <div className={view === 'cards' ? 'grid gap-3 md:grid-cols-2 lg:grid-cols-3' : ''}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={view === 'cards' ? 'h-32 w-full' : 'h-10 w-full mb-2'} />
          ))}
        </div>
      ) : enterprises && filteredEnterprises.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No enterprises match these filters"
          description="Try clearing a filter, or register a new enterprise to see it here."
          action={
            <Button asChild size="sm">
              <Link to="/enterprises/new">
                <Plus className="mr-1 h-4 w-4" /> Register new enterprise
              </Link>
            </Button>
          }
        />
      ) : view === 'cards' ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredEnterprises?.map((e) => {
            const t = types?.find((x) => x.id === e.enterprise_type_id);
            const v = getEnterpriseVisual(t?.name, t?.category as EnterpriseCategory);
            const Icon = v.icon;
            return (
              <Link
                key={e.id}
                to={`/enterprises/${e.id}`}
                state={linkState}
                className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                <Card className="h-full transition-all group-hover:shadow-md group-hover:-translate-y-0.5 group-hover:border-primary/30">
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0', v.tileBg)}>
                        <Icon className={cn('h-5 w-5', v.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-1.5" title={e.beneficiary_short_name}>
                          {/* Offline-ready dot — appears on cached enterprises so
                              the user can see at a glance which beneficiaries
                              they can access while offline. */}
                          {cachedIds.has(e.id) && (
                            <span
                              title="Cached for offline"
                              className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-success/15 text-success shrink-0"
                            >
                              <CloudDownload className="h-2.5 w-2.5" />
                            </span>
                          )}
                          <span className="truncate">{e.beneficiary_short_name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t?.name ?? '—'} · R{e.round_id} ·{' '}
                          {districts?.find((d) => d.id === e.district_id)?.name ?? '—'}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge
                        variant={e.registration_completeness === 'cover_page_ready' ? 'default' : 'outline'}
                        className="text-[10px]"
                      >
                        {e.registration_completeness === 'cover_page_ready' ? 'Cover-page ready' : 'Minimal'}
                      </Badge>
                      <Badge variant={ESMP_VARIANT[e.esmp_status] ?? 'outline'} className="text-[10px]">
                        ESMP: {ESMP_LABEL[e.esmp_status] ?? e.esmp_status}
                      </Badge>
                    </div>
                    <ProgressDots e={e} />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pl-2 pr-3 sticky left-0 bg-background z-10 min-w-[180px]">Beneficiary</th>
                    <th className="py-2 pr-3 min-w-[90px]">District</th>
                    {LIFECYCLE_MILESTONES.map((m) => (
                      <th
                        key={m.id}
                        className="py-2 px-1 text-center font-medium align-bottom"
                        style={{ minWidth: 64, maxWidth: 90 }}
                        title={m.label}
                      >
                        <div className="text-[10px] leading-tight">{m.short}</div>
                      </th>
                    ))}
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnterprises?.map((e) => {
                    const t = types?.find((x) => x.id === e.enterprise_type_id);
                    const v = getEnterpriseVisual(t?.name, t?.category as EnterpriseCategory);
                    const Icon = v.icon;
                    const lc = lifecycle?.[e.id];
                    return (
                      <tr key={e.id} className="border-b transition-colors duration-150 hover:bg-tint-success/30">
                        <td className="py-1.5 pl-2 pr-3 font-medium sticky left-0 bg-background z-10">
                          <Link to={`/enterprises/${e.id}`} state={linkState} className="flex items-center gap-2 hover:text-primary">
                            <div className={cn('flex h-6 w-6 items-center justify-center rounded shrink-0', v.tileBg)}>
                              <Icon className={cn('h-3 w-3', v.iconColor)} />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate flex items-center gap-1">
                                {cachedIds.has(e.id) && (
                                  <CloudDownload
                                    className="h-2.5 w-2.5 text-success shrink-0"
                                    aria-label="Cached for offline"
                                  />
                                )}
                                <span className="truncate">{e.beneficiary_short_name}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">{t?.name ?? '—'}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="py-1.5 pr-3 text-muted-foreground">
                          {districts?.find((d) => d.id === e.district_id)?.name ?? '—'}
                        </td>
                        {LIFECYCLE_MILESTONES.map((m) => {
                          const value: LifecycleValue | null = (lc?.[m.id] as LifecycleValue | null) ?? null;
                          const { glyph, tone } = lifecycleGlyph(value);
                          return (
                            <td key={m.id} className="py-1.5 px-1 text-center">
                              <span className={cn(
                                'inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded text-[11px] font-bold',
                                tone === 'success' && 'bg-success/15 text-success',
                                tone === 'destructive' && 'bg-destructive/10 text-destructive',
                                tone === 'muted' && 'bg-muted text-muted-foreground text-[9px]',
                                tone === 'empty' && 'text-muted-foreground/40',
                              )}>
                                {glyph}
                              </span>
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 text-right">
                          <Button asChild variant="ghost" size="sm" className="h-7 px-2">
                            <Link to={`/enterprises/${e.id}`} state={linkState}>
                              <FileText className="h-3 w-3" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-3 mt-3 px-2 text-[10px] text-muted-foreground">
              <span><span className="inline-block h-2 w-2 rounded-sm bg-success mr-1"></span>Yes</span>
              <span><span className="inline-block h-2 w-2 rounded-sm bg-destructive mr-1"></span>No</span>
              <span><span className="inline-block h-2 w-2 rounded-sm bg-muted mr-1"></span>N/A</span>
              <span><span className="text-muted-foreground/40 mr-1">–</span>Not yet tracked</span>
              <span className="ml-auto italic">All milestones are marked manually — Upload pill on ESMP / M1 jumps to that module.</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
