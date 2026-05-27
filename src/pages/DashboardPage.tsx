import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useEnterpriseTypes, useOrganizations, useDistricts } from '@/lib/catalogs';
import { useEnterpriseLifecycle } from '@/lib/enterprises';
import {
  LIFECYCLE_MILESTONES,
  aggregateLifecycle,
  type EnterpriseLifecycleRow,
  type LifecycleMilestoneId,
} from '@/lib/lifecycle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Sprout,
  AlertCircle,
  Layers,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { getEnterpriseVisual } from '@/lib/enterprise-icons';

/**
 * Dashboard — landing page for every signed-in user.
 *
 *   - Super Admin sees one section per organization (4D + RSDA stacked).
 *   - Everyone else sees their own org only.
 *   - Each section: 4 stat cards (icon + count + sparkline), a donut of
 *     enterprises by type, and a horizontal bar of M1-readiness pipeline.
 */
export function DashboardPage() {
  const { role, isSuperAdmin } = useAuth();
  const { data: orgs } = useOrganizations();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground capitalize">
          Signed in as {role?.replace('_', ' ') ?? 'unknown role'}
          {isSuperAdmin ? ' · cross-organization view' : ''}.
        </p>
      </header>

      {isSuperAdmin
        ? orgs?.map((o) => <OrgSection key={o.id} orgId={o.id} orgCode={o.code} orgName={o.name} />)
        : <OrgSection orgId={null} orgCode="Your org" orgName="" />}

      <Card className="border-primary/20 bg-gradient-to-br from-tint-success/50 to-background">
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/enterprises/new">
              <Sprout className="mr-2 h-4 w-4" />
              Register new enterprise
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/enterprises">Find an enterprise</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface OrgSectionProps {
  orgId: string | null; // null = "everything in my scope" (non-super-admin)
  orgCode: string;
  orgName: string;
}

interface OrgCounts {
  total: number;
  esmpDone: number;
  m1Submitted: number;
  drillingResolved: number;
  coverPageReady: number;
  byTypeId: Record<number, number>;
  byDistrictId: Record<string, { ready: number; total: number }>;
}

function OrgSection({ orgId, orgCode, orgName }: OrgSectionProps) {
  const { data: types } = useEnterpriseTypes();
  const { data: districts } = useDistricts();
  const { data: lifecycleMap } = useEnterpriseLifecycle();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-counts-v2', orgId ?? 'my-scope'],
    queryFn: async (): Promise<OrgCounts> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scope = <T extends { eq: (...a: any[]) => any }>(q: T): T =>
        (orgId ? q.eq('organization_id', orgId) : q) as T;

      // Counts in parallel.
      const [total, esmpDone, m1Submitted, drillingResolved, coverPageReady, rows] = await Promise.all([
        scope(supabase.from('enterprises').select('id', { count: 'exact', head: true })),
        scope(supabase.from('enterprises').select('id', { count: 'exact', head: true }))
          .in('esmp_status', ['completed_in_app', 'completed_uploaded']),
        scope(supabase.from('enterprises').select('id', { count: 'exact', head: true }))
          .eq('milestone1_report_status', 'done_submitted'),
        scope(supabase.from('enterprises').select('id', { count: 'exact', head: true }))
          .in('drilling_status', ['drilled', 'pre_existing', 'not_needed']),
        scope(supabase.from('enterprises').select('id', { count: 'exact', head: true }))
          .eq('registration_completeness', 'cover_page_ready'),
        // Pull rows to compute by-type and by-district histograms client-side.
        scope(supabase.from('enterprises').select('enterprise_type_id, district_id, registration_completeness')),
      ]);

      const byTypeId: Record<number, number> = {};
      const byDistrictId: Record<string, { ready: number; total: number }> = {};
      const rowData = (rows.data ?? []) as Array<{
        enterprise_type_id: number;
        district_id: string;
        registration_completeness: string;
      }>;
      for (const r of rowData) {
        byTypeId[r.enterprise_type_id] = (byTypeId[r.enterprise_type_id] ?? 0) + 1;
        const bd = (byDistrictId[r.district_id] ||= { ready: 0, total: 0 });
        bd.total += 1;
        if (r.registration_completeness === 'cover_page_ready') bd.ready += 1;
      }

      return {
        total: total.count ?? 0,
        esmpDone: esmpDone.count ?? 0,
        m1Submitted: m1Submitted.count ?? 0,
        drillingResolved: drillingResolved.count ?? 0,
        coverPageReady: coverPageReady.count ?? 0,
        byTypeId,
        byDistrictId,
      };
    },
  });

  // Build donut data: top 6 types + "Other".
  const typeChartData = (() => {
    if (!data || !types) return [];
    const entries = Object.entries(data.byTypeId)
      .map(([id, count]) => {
        const t = types.find((x) => x.id === Number(id));
        return { id: Number(id), name: t?.name ?? `Type ${id}`, value: count, category: t?.category };
      })
      .sort((a, b) => b.value - a.value);
    if (entries.length <= 7) return entries;
    const top = entries.slice(0, 6);
    const otherCount = entries.slice(6).reduce((s, e) => s + e.value, 0);
    return [...top, { id: -1, name: 'Other', value: otherCount, category: undefined }];
  })();

  // Pipeline data: each stage as a horizontal bar.
  const pipeline = data
    ? [
        { stage: 'Registered',     count: data.total,            tone: 'hsl(var(--muted-foreground))' },
        { stage: 'Cover-page ready', count: data.coverPageReady, tone: 'hsl(var(--info))' },
        { stage: 'ESMP done',      count: data.esmpDone,         tone: 'hsl(var(--warning))' },
        { stage: 'Drilling resolved', count: data.drillingResolved, tone: 'hsl(var(--secondary))' },
        { stage: 'M1 submitted',   count: data.m1Submitted,      tone: 'hsl(var(--success))' },
      ]
    : [];

  // District readiness: ready vs. remaining, stacked.
  const districtChart = (() => {
    if (!data || !districts) return [];
    return Object.entries(data.byDistrictId)
      .map(([id, v]) => {
        const d = districts.find((x) => x.id === id);
        return {
          district: d?.name ?? id.slice(0, 6),
          ready: v.ready,
          remaining: v.total - v.ready,
        };
      })
      .sort((a, b) => b.ready + b.remaining - (a.ready + a.remaining));
  })();

  // Donut palette — anchored on brand greens + semantic tints.
  const PIE_PALETTE = [
    'hsl(var(--primary))',
    'hsl(var(--secondary))',
    'hsl(var(--success))',
    'hsl(var(--warning))',
    'hsl(var(--info))',
    'hsl(152 50% 45%)',
    'hsl(var(--muted-foreground))',
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{orgCode}</h2>
        {orgName && <span className="text-sm text-muted-foreground">— {orgName}</span>}
      </div>

      {error && (
        <Card className="border-destructive bg-tint-danger">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div className="text-sm">
              <div className="font-medium">Couldn&apos;t load counts.</div>
              <div className="text-muted-foreground">{(error as Error).message}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RSDA-style district × milestone matrix */}
      <LifecycleMatrix
        scopeOrgId={orgId}
        lifecycleMap={lifecycleMap}
        districts={districts ?? []}
      />

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Donut: enterprises by type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              Enterprises by type
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : typeChartData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
                No enterprises yet.
              </div>
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {typeChartData.map((_entry, i) => (
                        <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {!isLoading && typeChartData.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {typeChartData.slice(0, 5).map((d, i) => {
                  const t = types?.find((x) => x.id === d.id);
                  const v = getEnterpriseVisual(t?.name, t?.category);
                  const Icon = v.icon;
                  return (
                    <li key={d.id} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ background: PIE_PALETTE[i % PIE_PALETTE.length] }}
                      />
                      <Icon className={cn('h-3 w-3', v.iconColor)} />
                      <span className="truncate flex-1">{d.name}</span>
                      <span className="text-muted-foreground tabular-nums">{d.value}</span>
                    </li>
                  );
                })}
                {typeChartData.length > 5 && (
                  <li className="text-muted-foreground italic">
                    +{typeChartData.length - 5} more
                  </li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Horizontal-bar pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-primary" />
              Milestone-1 readiness pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipeline} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="stage"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      width={140}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {pipeline.map((p, i) => (
                        <Cell key={i} fill={p.tone} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* District readiness — only when we actually have multiple districts */}
      {districtChart.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cover-page readiness by district</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="district" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="ready" stackId="a" fill="hsl(var(--success))" name="Cover-page ready" />
                    <Bar dataKey="remaining" stackId="a" fill="hsl(var(--muted))" name="Remaining" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}


// ---------------------------------------------------------------------------
// LifecycleMatrix — district × milestone aggregation table.
// Mirrors RSDA's "Analysed beneficiary" sheet: one row per district plus a
// grand-total row; one column per milestone; cell shows "count_yes / total".
// Cells colored by completion ratio.
// ---------------------------------------------------------------------------
function LifecycleMatrix({
  scopeOrgId,
  lifecycleMap,
  districts,
}: {
  scopeOrgId: string | null;
  lifecycleMap: Map<string, EnterpriseLifecycleRow> | undefined;
  districts: Array<{ id: string; name: string }>;
}) {
  if (!lifecycleMap) {
    return <Skeleton className="h-40 w-full" />;
  }
  // Filter rows to this org's scope (or all if super-admin scope).
  const rows = Array.from(lifecycleMap.values()).filter((r) =>
    scopeOrgId ? r.organization_id === scopeOrgId : true,
  );
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          No enterprises in scope.
        </CardContent>
      </Card>
    );
  }

  const byDistrict = aggregateLifecycle(rows, (r) => r.district_id);
  const districtNameById = new Map(districts.map((d) => [d.id, d.name]));

  // Sort district rows by name; grand total appended last.
  const districtRows = Array.from(byDistrict.entries())
    .map(([id, agg]) => ({ id, name: districtNameById.get(id) ?? id.slice(0, 6), ...agg }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Grand total across all districts.
  const grandTotal = {
    total: rows.length,
    counts: Object.fromEntries(
      LIFECYCLE_MILESTONES.map((m) => [m.id, rows.filter((r) => r[m.id] === 'yes').length]),
    ) as Record<LifecycleMilestoneId, number>,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Milestone tracker — district × milestone</CardTitle>
        <CardDescription className="text-xs">
          Each cell shows the count of enterprises with the milestone marked Yes,
          out of the district total. Cell shading scales with completion ratio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-3 sticky left-0 bg-background z-10">District</th>
                <th className="text-right py-2 pr-3">Total</th>
                {LIFECYCLE_MILESTONES.map((m) => (
                  <th
                    key={m.id}
                    className="text-center py-2 px-1 align-bottom font-medium"
                    style={{ minWidth: 64 }}
                    title={m.label + (m.source === 'derived' ? ' (auto-derived)' : '')}
                  >
                    <div className="text-[10px] leading-tight">{m.short}</div>
                    {m.source === 'derived' && (
                      <div className="text-muted-foreground/60 text-[9px]">auto</div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {districtRows.map((d) => (
                <tr key={d.id} className="border-b hover:bg-muted/30">
                  <td className="py-1.5 pr-3 font-medium sticky left-0 bg-background z-10">{d.name}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-muted-foreground">{d.total}</td>
                  {LIFECYCLE_MILESTONES.map((m) => {
                    const c = d.counts[m.id];
                    return <MatrixCell key={m.id} count={c} total={d.total} />;
                  })}
                </tr>
              ))}
              {/* Grand total row */}
              <tr className="bg-muted/40 font-semibold">
                <td className="py-2 pr-3 sticky left-0 bg-muted/40 z-10">All districts</td>
                <td className="py-2 pr-3 text-right tabular-nums">{grandTotal.total}</td>
                {LIFECYCLE_MILESTONES.map((m) => (
                  <MatrixCell key={m.id} count={grandTotal.counts[m.id]} total={grandTotal.total} />
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MatrixCell({ count, total }: { count: number; total: number }) {
  const ratio = total > 0 ? count / total : 0;
  // green saturation scales with ratio. 0 → muted, 1 → solid success.
  const bg =
    ratio === 0 ? 'bg-muted/40 text-muted-foreground' :
    ratio < 0.34 ? 'bg-success/15 text-success' :
    ratio < 0.67 ? 'bg-success/30 text-success' :
                   'bg-success/60 text-success-foreground';
  return (
    <td className="py-1 px-1 text-center">
      <span className={cn(
        'inline-flex items-center justify-center min-w-[44px] px-1 py-0.5 rounded text-[11px] tabular-nums',
        bg,
      )}>
        {count} / {total}
      </span>
    </td>
  );
}
