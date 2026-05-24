import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useEnterprises, type EnterpriseListFilters } from '@/lib/enterprises';
import type { DrillingStatus, EnterpriseRow, EsmpStatus, Milestone1ReportStatus } from '@/types/database';
import { useDistricts, useEnterpriseTypes, useResourceCenters } from '@/lib/catalogs';
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
import { Plus, FileText, LayoutGrid, List, Sprout, ChevronRight } from 'lucide-react';
import { getEnterpriseVisual, type EnterpriseCategory } from '@/lib/enterprise-icons';
import { cn } from '@/lib/utils';

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
  const [searchParams] = useSearchParams();
  const initialFilters = useMemo<EnterpriseListFilters>(
    () => ({
      organizationCode: searchParams.get('orgCode') ?? null,
      esmpStatus: (searchParams.get('esmp') as EsmpStatus) ?? null,
      milestone1Status: (searchParams.get('m1') as Milestone1ReportStatus) ?? null,
      drillingStatus: (searchParams.get('drilling') as DrillingStatus) ?? null,
      completeness:
        (searchParams.get('completeness') as 'minimal' | 'cover_page_ready') ?? null,
    }),
    // Only seed once from URL; user can clear afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [filters, setFilters] = useState<EnterpriseListFilters>(initialFilters);
  const [view, setView] = useState<'table' | 'cards'>(() => {
    return (localStorage.getItem('enterprises-view') as 'table' | 'cards') ?? 'cards';
  });
  const setViewPersisted = (v: 'table' | 'cards') => {
    setView(v);
    localStorage.setItem('enterprises-view', v);
  };

  const { data: districts } = useDistricts();
  const { data: types } = useEnterpriseTypes();
  const { data: rcs } = useResourceCenters(filters.districtId ?? null);
  const { data: enterprises, isLoading, error } = useEnterprises(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Enterprises</h1>
          <p className="text-sm text-muted-foreground">
            {enterprises ? `${enterprises.length} shown` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="space-y-1.5 lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Beneficiary or applicant name…"
                value={filters.search ?? ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
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
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All districts</SelectItem>
                  {districts?.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
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
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All RCs</SelectItem>
                  {rcs?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={filters.enterpriseTypeId ? String(filters.enterpriseTypeId) : '__all'}
                onValueChange={(v) =>
                  setFilters({ ...filters, enterpriseTypeId: v === '__all' ? null : Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All types</SelectItem>
                  {types?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>ESMP status</Label>
              <Select
                value={filters.esmpStatus ?? '__all'}
                onValueChange={(v) =>
                  setFilters({ ...filters, esmpStatus: v === '__all' ? null : (v as EsmpStatus) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all">All</SelectItem>
                  {Object.entries(ESMP_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive bg-tint-danger">
          <CardContent className="pt-6 text-sm text-destructive">
            {(error as Error).message}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className={view === 'cards' ? 'grid gap-3 md:grid-cols-2 lg:grid-cols-3' : ''}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={view === 'cards' ? 'h-32 w-full' : 'h-10 w-full mb-2'} />
          ))}
        </div>
      ) : enterprises && enterprises.length === 0 ? (
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
          {enterprises?.map((e) => {
            const t = types?.find((x) => x.id === e.enterprise_type_id);
            const v = getEnterpriseVisual(t?.name, t?.category as EnterpriseCategory);
            const Icon = v.icon;
            return (
              <Link
                key={e.id}
                to={`/enterprises/${e.id}`}
                className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                <Card className="h-full transition-all group-hover:shadow-md group-hover:-translate-y-0.5 group-hover:border-primary/30">
                  <CardContent className="pt-5 pb-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg shrink-0', v.tileBg)}>
                        <Icon className={cn('h-5 w-5', v.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate" title={e.beneficiary_short_name}>
                          {e.beneficiary_short_name}
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
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-4">Beneficiary</th>
                    <th className="py-2 pr-4">District</th>
                    <th className="py-2 pr-4">Round</th>
                    <th className="py-2 pr-4">Progress</th>
                    <th className="py-2 pr-4">ESMP</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {enterprises?.map((e) => {
                    const t = types?.find((x) => x.id === e.enterprise_type_id);
                    const v = getEnterpriseVisual(t?.name, t?.category as EnterpriseCategory);
                    const Icon = v.icon;
                    return (
                      <tr key={e.id} className="border-t hover:bg-muted/40">
                        <td className="py-2 pr-4 font-medium">
                          <div className="flex items-center gap-2">
                            <div className={cn('flex h-7 w-7 items-center justify-center rounded shrink-0', v.tileBg)}>
                              <Icon className={cn('h-3.5 w-3.5', v.iconColor)} />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate">{e.beneficiary_short_name}</div>
                              <div className="text-xs text-muted-foreground truncate">{t?.name ?? '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {districts?.find((d) => d.id === e.district_id)?.name ?? '—'}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">R{e.round_id}</td>
                        <td className="py-2 pr-4 w-[180px]">
                          <ProgressDots e={e} />
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant={ESMP_VARIANT[e.esmp_status] ?? 'outline'} className="text-[10px]">
                            {ESMP_LABEL[e.esmp_status] ?? e.esmp_status}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <Button asChild variant="ghost" size="sm">
                            <Link to={`/enterprises/${e.id}`}>
                              <FileText className="mr-2 h-4 w-4" /> Open
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
