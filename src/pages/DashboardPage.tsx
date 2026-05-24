import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useEnterpriseTypes, useOrganizations, useDistricts } from '@/lib/catalogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Sprout,
  AlertCircle,
  Building2,
  ClipboardCheck,
  FileCheck2,
  Droplets,
  Layers,
  type LucideIcon,
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

  const orgFilter = orgId ? `orgCode=${orgCode}` : '';
  const link = (extra: string) =>
    extra ? `/enterprises?${[orgFilter, extra].filter(Boolean).join('&')}` : `/enterprises?${orgFilter}`;

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

      {/* 4 stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Enterprises"
          count={isLoading ? null : data?.total ?? 0}
          to={link('')}
          hint="All enterprises in scope"
          tone="primary"
          fillPct={null}
        />
        <StatCard
          icon={ClipboardCheck}
          label="Cover-page ready"
          count={isLoading ? null : data?.coverPageReady ?? 0}
          to={link('completeness=cover_page_ready')}
          hint="Minimum data on file for the M1 cover page"
          tone="info"
          fillPct={data?.total ? (data.coverPageReady / data.total) * 100 : null}
        />
        <StatCard
          icon={FileCheck2}
          label="ESMP completed"
          count={isLoading ? null : data?.esmpDone ?? 0}
          to={link('esmp=completed_in_app')}
          hint="In-app forms approved or legacy PDF on file"
          tone="warning"
          fillPct={data?.total ? (data.esmpDone / data.total) * 100 : null}
        />
        <StatCard
          icon={Droplets}
          label="Drilling resolved"
          count={isLoading ? null : data?.drillingResolved ?? 0}
          to={link('drilling=drilled')}
          hint="Drilled, pre-existing, or not needed"
          tone="success"
          fillPct={data?.total ? (data.drillingResolved / data.total) * 100 : null}
        />
      </div>

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

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  count: number | null;
  to: string;
  hint: string;
  tone: 'primary' | 'info' | 'warning' | 'success';
  fillPct: number | null;
}

const TONE_STYLES = {
  primary: { tile: 'bg-primary/10 text-primary', bar: 'bg-primary', border: 'hover:border-primary/40' },
  info:    { tile: 'bg-info/10 text-info',       bar: 'bg-info',    border: 'hover:border-info/40' },
  warning: { tile: 'bg-warning/15 text-warning', bar: 'bg-warning', border: 'hover:border-warning/50' },
  success: { tile: 'bg-success/15 text-success', bar: 'bg-success', border: 'hover:border-success/40' },
} as const;

function StatCard({ icon: Icon, label, count, to, hint, tone, fillPct }: StatCardProps) {
  const { tile, bar, border } = TONE_STYLES[tone];
  return (
    <Link
      to={to}
      className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
    >
      <Card
        className={cn(
          'h-full transition-all cursor-pointer group-hover:shadow-md group-hover:-translate-y-0.5',
          border,
        )}
      >
        <CardContent className="pt-5 pb-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', tile)}>
              <Icon className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div>
            <div className="text-3xl font-semibold tabular-nums">
              {count === null ? <Skeleton className="h-8 w-16" /> : count}
            </div>
            <div className="text-sm font-medium mt-0.5">{label}</div>
          </div>
          {fillPct !== null && count !== null ? (
            <div className="space-y-1">
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', bar)}
                  style={{ width: `${Math.min(100, Math.max(0, fillPct))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{Math.round(fillPct)}% · {hint}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{hint}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
