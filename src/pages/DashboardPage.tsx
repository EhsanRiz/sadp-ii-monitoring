import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sprout, AlertCircle } from 'lucide-react';

/**
 * Landing page after sign-in. Phase 1 keeps it intentionally lean — only the
 * counts a Field Supervisor/M&E Officer actually needs at a glance:
 *   - total enterprises in their org
 *   - how many are still 'minimal' (need cover-page completion)
 *   - how many have ESMP status not yet started
 *
 * The list page handles all the filtering. This is just orientation.
 */
export function DashboardPage() {
  const { role, isSuperAdmin } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-counts'],
    queryFn: async () => {
      const total = await supabase
        .from('enterprises')
        .select('id', { count: 'exact', head: true });
      const esmpDone = await supabase
        .from('enterprises')
        .select('id', { count: 'exact', head: true })
        .in('esmp_status', ['completed_in_app', 'completed_uploaded']);
      const m1Submitted = await supabase
        .from('enterprises')
        .select('id', { count: 'exact', head: true })
        .eq('milestone1_report_status', 'done_submitted');
      const drillingDone = await supabase
        .from('enterprises')
        .select('id', { count: 'exact', head: true })
        .in('drilling_status', ['drilled', 'pre_existing', 'not_needed']);
      return {
        total: total.count ?? 0,
        esmpDone: esmpDone.count ?? 0,
        m1Submitted: m1Submitted.count ?? 0,
        drillingDone: drillingDone.count ?? 0,
      };
    },
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground capitalize">
          Signed in as {role?.replace('_', ' ') ?? 'unknown role'}
          {isSuperAdmin ? ' (cross-organization)' : ''}.
        </p>
      </header>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div className="text-sm">
              <div className="font-medium">Couldn&apos;t load dashboard data.</div>
              <div className="text-muted-foreground">{(error as Error).message}</div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enterprises (your scope)</CardDescription>
            <CardTitle className="text-4xl">{isLoading ? '…' : data?.total ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link to="/enterprises">
                Browse <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ESMP completed</CardDescription>
            <CardTitle className="text-4xl">{isLoading ? '…' : data?.esmpDone ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            ESMP form either completed in-app or uploaded as a scanned PDF.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>M1 report submitted</CardDescription>
            <CardTitle className="text-4xl">{isLoading ? '…' : data?.m1Submitted ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Milestone 1 report completed and submitted to the CGP Secretariat.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Drilling resolved</CardDescription>
            <CardTitle className="text-4xl">{isLoading ? '…' : data?.drillingDone ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Either drilled, pre-existing borehole on site, or not needed for the enterprise type.
          </CardContent>
        </Card>
      </div>

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
