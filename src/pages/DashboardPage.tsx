import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useOrganizations } from '@/lib/catalogs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sprout, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Dashboard. For Super Admin: renders one section per organization so the
 * 4D / RSDA split is visible at a glance. For everyone else: their org only.
 *
 * Every count card is a Link to /enterprises with pre-set filters via URL
 * params, so "ESMP completed: 163" is a one-click drill-down.
 */
export function DashboardPage() {
  const { role, isSuperAdmin } = useAuth();
  const { data: orgs } = useOrganizations();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground capitalize">
          Signed in as {role?.replace('_', ' ') ?? 'unknown role'}
          {isSuperAdmin ? ' (cross-organization)' : ''}.
        </p>
      </header>

      {isSuperAdmin
        ? orgs?.map((o) => <OrgSection key={o.id} orgId={o.id} orgCode={o.code} orgName={o.name} />)
        : <OrgSection orgId={null} orgCode="Your org" orgName="" />}

      <Card>
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

function OrgSection({ orgId, orgCode, orgName }: OrgSectionProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-counts', orgId ?? 'my-scope'],
    queryFn: async () => {
      // All five counts in parallel. Empty .eq() chain on null orgId means
      // RLS scopes for us (Super Admin OR own-org check). `any` because the
      // chain returns a different builder shape at each step but they all
      // expose .eq()/.in() that we need.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scope = <T extends { eq: (...a: any[]) => any }>(q: T): T =>
        (orgId ? q.eq('organization_id', orgId) : q) as T;
      const [total, esmpDone, m1Submitted, drillingResolved] = await Promise.all([
        scope(supabase.from('enterprises').select('id', { count: 'exact', head: true })),
        scope(supabase.from('enterprises').select('id', { count: 'exact', head: true })).in('esmp_status', ['completed_in_app', 'completed_uploaded']),
        scope(supabase.from('enterprises').select('id', { count: 'exact', head: true })).eq('milestone1_report_status', 'done_submitted'),
        scope(supabase.from('enterprises').select('id', { count: 'exact', head: true })).in('drilling_status', ['drilled', 'pre_existing', 'not_needed']),
      ]);
      return {
        total: total.count ?? 0,
        esmpDone: esmpDone.count ?? 0,
        m1Submitted: m1Submitted.count ?? 0,
        drillingResolved: drillingResolved.count ?? 0,
      };
    },
  });

  // URL-param scope prefix: ?orgCode=4D filters the enterprises list to one org.
  const orgFilter = orgId ? `orgCode=${orgCode}` : '';
  const link = (extra: string) =>
    extra ? `/enterprises?${[orgFilter, extra].filter(Boolean).join('&')}` : `/enterprises?${orgFilter}`;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold tracking-tight">{orgCode}</h2>
        {orgName && <span className="text-sm text-muted-foreground">— {orgName}</span>}
      </div>
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div className="text-sm">
              <div className="font-medium">Couldn&apos;t load counts.</div>
              <div className="text-muted-foreground">{(error as Error).message}</div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Enterprises"
          count={isLoading ? null : data?.total ?? 0}
          to={link('')}
          hint="All enterprises in scope. Click to browse."
          accent
        />
        <StatCard
          label="ESMP completed"
          count={isLoading ? null : data?.esmpDone ?? 0}
          to={link('esmp=completed_in_app')}
          hint="ESMP form either completed in-app or uploaded as PDF."
        />
        <StatCard
          label="M1 report submitted"
          count={isLoading ? null : data?.m1Submitted ?? 0}
          to={link('m1=done_submitted')}
          hint="Milestone 1 report completed and submitted to CGP Secretariat."
        />
        <StatCard
          label="Drilling resolved"
          count={isLoading ? null : data?.drillingResolved ?? 0}
          to={link('drilling=drilled')}
          hint="Drilled, pre-existing borehole, or not needed for the type."
        />
      </div>
    </section>
  );
}

interface StatCardProps {
  label: string;
  count: number | null;
  to: string;
  hint: string;
  accent?: boolean;
}

function StatCard({ label, count, to, hint, accent }: StatCardProps) {
  return (
    <Link to={to} className="group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      <Card
        className={cn(
          'transition-colors group-hover:border-primary group-hover:shadow-md cursor-pointer h-full',
          accent && 'border-primary/30',
        )}
      >
        <CardHeader className="pb-2">
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-4xl flex items-baseline gap-2">
            {count === null ? <span className="text-muted-foreground text-2xl">…</span> : count}
            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>
      </Card>
    </Link>
  );
}
