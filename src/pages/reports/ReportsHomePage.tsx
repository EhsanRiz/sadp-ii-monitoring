/**
 * Reports — generate Monthly / Quarterly / Custom-range snapshots and export them.
 *
 * URL shape:
 *   /reports               → defaults to Monthly tab
 *   /reports/monthly       → monthly period picker
 *   /reports/quarterly     → quarterly period picker
 *   /reports/custom        → free date range picker
 *   /reports/archive       → saved snapshots
 *
 * The page is purely "build → preview" — the user must click Generate to run
 * the RPC, and can then Save (to the archive), Download PDF, or Download Excel.
 */
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import { useOrganizations } from '@/lib/catalogs';
import {
  type ReportKind, type ReportPeriod,
  defaultPeriodForKind, periodLabel,
  monthlyPeriod, quarterlyPeriod,
  useGeneratePeriodReport, useSavePeriodReport,
} from '@/lib/reports';
import { PeriodReportPreview } from '@/components/reports/PeriodReportPreview';
import { downloadReportExcel } from '@/lib/reportExcel';
import { pdf } from '@react-pdf/renderer';
import { PeriodReportPdf } from '@/pdf/PeriodReportPdf';

export function ReportsHomePage() {
  const params = useParams<{ kind?: string }>();
  const kind: ReportKind =
    params.kind === 'quarterly' ? 'quarterly' :
    params.kind === 'custom'    ? 'custom'    :
                                  'monthly';
  return <ReportsBuilder key={kind} kind={kind} />;
}

function ReportsBuilder({ kind }: { kind: ReportKind }) {
  const { isSuperAdmin, organizationId } = useAuth();
  const { data: organizations } = useOrganizations();

  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState<ReportPeriod>(() => defaultPeriodForKind(kind, today));
  const [scopeOrgId, setScopeOrgId] = useState<string | null>(
    isSuperAdmin ? null : (organizationId ?? null)
  );
  const [generated, setGenerated] = useState(false);

  // Re-init period when switching kind via the URL
  // (key on the parent handles unmount/remount)

  const enabled = generated;
  const q = useGeneratePeriodReport(enabled ? { period, orgId: scopeOrgId } : null);
  const saveMut = useSavePeriodReport();

  const label = periodLabel(kind, period);

  async function handleDownloadPdf() {
    if (!q.data) return;
    try {
      const blob = await pdf(<PeriodReportPdf snapshot={q.data} kind={kind} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SADP-II ${label.replace(/[^A-Za-z0-9 _-]/g,'')}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      toast.error('PDF export failed — check the console.');
    }
  }

  async function handleSave() {
    if (!q.data) return;
    try {
      await saveMut.mutateAsync({
        kind,
        period,
        period_label: label,
        scope_org_id: scopeOrgId,
        payload: q.data,
      });
      toast.success(`Saved “${label}” to the archive.`);
    } catch (e: unknown) {
      const msg = (e instanceof Error) ? e.message : 'Save failed';
      toast.error(msg);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate a Monthly, Quarterly, or Custom-range snapshot of project state.
        </p>
      </header>

      {/* Kind tabs */}
      <div className="inline-flex rounded-md border bg-muted/30 p-0.5 text-sm">
        <TabLink to="/reports/monthly"   active={kind === 'monthly'}   label="Monthly" />
        <TabLink to="/reports/quarterly" active={kind === 'quarterly'} label="Quarterly" />
        <TabLink to="/reports/custom"    active={kind === 'custom'}    label="Custom range" />
        <TabLink to="/reports/archive"   active={false}                label="Archive" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Build report</CardTitle>
          <CardDescription>
            Pick the period and scope, then click Generate. Numbers reflect the database state at generation time.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {kind === 'monthly'   && <MonthlyPicker period={period} setPeriod={setPeriod} />}
            {kind === 'quarterly' && <QuarterlyPicker period={period} setPeriod={setPeriod} />}
            {kind === 'custom'    && <CustomPicker period={period} setPeriod={setPeriod} />}

            {/* Scope */}
            <div>
              <Label className="text-xs">Scope</Label>
              <Select
                value={scopeOrgId ?? '__all'}
                onValueChange={(v) => {
                  setScopeOrgId(v === '__all' ? null : v);
                  setGenerated(false);
                }}
                disabled={!isSuperAdmin}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {isSuperAdmin && <SelectItem value="__all">All organisations</SelectItem>}
                  {organizations?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isSuperAdmin && (
                <p className="mt-1 text-[11px] text-muted-foreground">Scoped to your organisation.</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setGenerated(true); q.refetch(); }}>Generate</Button>
            {q.data && (
              <>
                <Button variant="outline" onClick={handleDownloadPdf}>Download PDF</Button>
                <Button variant="outline" onClick={() => downloadReportExcel(q.data!, kind)}>
                  Download Excel
                </Button>
                <Button variant="outline" onClick={handleSave} disabled={saveMut.isPending}>
                  {saveMut.isPending ? 'Saving…' : 'Save to archive'}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {q.isFetching && (
        <Card><CardContent className="p-6 space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </CardContent></Card>
      )}
      {q.error && (
        <Card><CardContent className="p-6 text-sm text-destructive">
          {(q.error as Error).message}
        </CardContent></Card>
      )}
      {q.data && !q.isFetching && (
        <Card><CardContent className="p-6">
          <PeriodReportPreview snapshot={q.data} kind={kind} />
        </CardContent></Card>
      )}
    </div>
  );
}

// ----- pickers -----

function MonthlyPicker({ period, setPeriod }: { period: ReportPeriod; setPeriod: (p: ReportPeriod)=>void }) {
  const months = useMemo(() => {
    const list: { value: string; label: string; period: ReportPeriod }[] = [];
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    for (let i = 0; i < 24; i++) {
      const offsetMonth = m - i;
      const year = y + Math.floor(offsetMonth / 12);
      const mo = ((offsetMonth % 12) + 12) % 12;
      const p = monthlyPeriod(year, mo);
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      list.push({ value: p.start, label: `${monthNames[mo]} ${year}`, period: p });
    }
    return list;
  }, []);

  return (
    <div className="sm:col-span-2">
      <Label className="text-xs">Month</Label>
      <Select
        value={period.start}
        onValueChange={(v) => {
          const found = months.find((m) => m.value === v);
          if (found) setPeriod(found.period);
        }}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{months.map(m => (
          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
        ))}</SelectContent>
      </Select>
    </div>
  );
}

function QuarterlyPicker({ period, setPeriod }: { period: ReportPeriod; setPeriod: (p: ReportPeriod)=>void }) {
  const quarters = useMemo(() => {
    const list: { value: string; label: string; period: ReportPeriod }[] = [];
    const now = new Date();
    let y = now.getUTCFullYear();
    let q = Math.floor(now.getUTCMonth() / 3) + 1;
    for (let i = 0; i < 12; i++) {
      const p = quarterlyPeriod(y, q as 1|2|3|4);
      list.push({ value: p.start, label: `Q${q} ${y}`, period: p });
      q -= 1;
      if (q === 0) { q = 4; y -= 1; }
    }
    return list;
  }, []);

  return (
    <div className="sm:col-span-2">
      <Label className="text-xs">Quarter</Label>
      <Select
        value={period.start}
        onValueChange={(v) => {
          const found = quarters.find((m) => m.value === v);
          if (found) setPeriod(found.period);
        }}
      >
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{quarters.map(q => (
          <SelectItem key={q.value} value={q.value}>{q.label}</SelectItem>
        ))}</SelectContent>
      </Select>
    </div>
  );
}

function CustomPicker({ period, setPeriod }: { period: ReportPeriod; setPeriod: (p: ReportPeriod)=>void }) {
  return (
    <>
      <div>
        <Label className="text-xs">From</Label>
        <Input type="date" value={period.start}
          onChange={(e) => setPeriod({ ...period, start: e.target.value })} />
      </div>
      <div>
        <Label className="text-xs">To</Label>
        <Input type="date" value={period.end}
          onChange={(e) => setPeriod({ ...period, end: e.target.value })} />
      </div>
    </>
  );
}

function TabLink({ to, active, label }: { to: string; active: boolean; label: string }) {
  return (
    <Link
      to={to}
      className={
        'px-3 py-1.5 rounded transition-colors ' +
        (active ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground')
      }
    >
      {label}
    </Link>
  );
}
