/**
 * Per-stage money editor for an enterprise (migration 330).
 *
 * One card per money stage (M1, M2), each with three blocks — farmer
 * contribution, SADP / budget allocation, and funds / report — plus a live
 * summary (outstanding variance, % of funds depleted). Mirrors the team's
 * Round 3 contribution + SADP budget sheets.
 *
 * Explicit Save (like the lifecycle editor) routes through useSaveEnterprisePatch
 * -> saveOrEnqueue, so money entered offline on a field tablet syncs when back
 * online. The whole stage_finances map is saved atomically.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  MONEY_STAGES,
  parseStageFinances,
  stageFinanceOrEmpty,
  farmerVariance,
  pctDepleted,
  hasAnyFinance,
  formatLsl,
  emptyStageFinance,
  BA_STATUS_META,
  REPORT_STATUS_META,
  type MoneyStage,
  type StageFinance,
  type StageFinancesMap,
  type BaStatus,
  type StageReportStatus,
} from '@/lib/stage-finances';
import { STAGE_META } from '@/lib/stage';
import { useSaveEnterprisePatch } from '@/lib/enterprises';
import { useRegisterDirty } from '@/lib/use-unsaved-changes-guard';
import type { Json, LifecycleStage } from '@/types/database';

interface Props {
  enterpriseId: string;
  /** The enterprise's stage_finances jsonb (may be null while loading). */
  stageFinances: Json | null | undefined;
  /** Current macro-stage — used to highlight the active money card. */
  currentStage?: LifecycleStage | null;
  readOnly?: boolean;
}

function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function StageFinanceEditor({
  enterpriseId,
  stageFinances,
  currentStage,
  readOnly = false,
}: Props) {
  const save = useSaveEnterprisePatch(enterpriseId);
  const [draft, setDraft] = useState<StageFinancesMap>({});
  const [dirty, setDirty] = useState(false);

  useRegisterDirty('stage-finances', dirty);

  useEffect(() => {
    setDraft(parseStageFinances(stageFinances));
    setDirty(false);
  }, [stageFinances, enterpriseId]);

  function setField<K extends keyof StageFinance>(stage: MoneyStage, key: K, value: StageFinance[K]) {
    setDraft((d) => {
      const base = d[stage] ?? emptyStageFinance();
      return { ...d, [stage]: { ...base, [key]: value } };
    });
    setDirty(true);
  }

  function onSave() {
    // Prune stages with no data so the jsonb stays clean.
    const clean: StageFinancesMap = {};
    for (const s of MONEY_STAGES) {
      const rec = draft[s];
      if (rec && hasAnyFinance(rec)) clean[s] = rec;
    }
    save.mutate(
      { description: 'Save stage finances', patch: { stage_finances: clean as unknown as Json } },
      {
        onSuccess: (result) => {
          toast.success(result.online ? 'Finances saved' : 'Saved locally — will sync when online');
          setDirty(false);
        },
        onError: (e: Error) => toast.error('Save failed', { description: e.message }),
      },
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Stage finances</CardTitle>
            <CardDescription>
              Farmer &amp; SADP contributions, budget allocation and fund depletion for each
              stage. Amounts in Maloti (M).
            </CardDescription>
          </div>
          {dirty && !readOnly && (
            <span className="inline-flex items-center gap-1 text-xs text-warning shrink-0">
              <AlertCircle className="h-3 w-3" /> unsaved
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {MONEY_STAGES.map((stage) => (
          <StageMoneyCard
            key={stage}
            stage={stage}
            value={stageFinanceOrEmpty(draft, stage)}
            active={currentStage === stage}
            readOnly={readOnly}
            onChange={setField}
          />
        ))}

        {!readOnly && (
          <div className="sticky bottom-0 -mx-6 -mb-2 px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t z-10 flex justify-end items-center gap-2
                          md:static md:mx-0 md:mb-0 md:p-0 md:pt-1 md:bg-transparent md:backdrop-blur-none md:border-t-0">
            {dirty && <span className="text-xs text-warning md:hidden">Unsaved</span>}
            <Button onClick={onSave} disabled={!dirty || save.isPending} size="sm">
              <Save className="mr-2 h-3 w-3" />
              {save.isPending ? 'Saving…' : 'Save finances'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CardProps {
  stage: MoneyStage;
  value: StageFinance;
  active: boolean;
  readOnly: boolean;
  onChange: <K extends keyof StageFinance>(stage: MoneyStage, key: K, value: StageFinance[K]) => void;
}

function StageMoneyCard({ stage, value: f, active, readOnly, onChange }: CardProps) {
  const variance = farmerVariance(f);
  const depleted = pctDepleted(f);
  const set = <K extends keyof StageFinance>(key: K, v: StageFinance[K]) => onChange(stage, key, v);

  return (
    <div className={cn('rounded-lg border p-3 space-y-3', active && 'border-primary/40 bg-tint-success/20')}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{STAGE_META[stage].full}</span>
        {active && (
          <span className="rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-2 py-0.5">
            Current stage
          </span>
        )}
      </div>

      {/* Farmer contribution */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Farmer contribution
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <MoneyField label="Contract (M)" value={f.farmer_contract_lsl} onChange={(v) => set('farmer_contract_lsl', v)} id={`${stage}-fc`} />
          <MoneyField label="Contributed (M)" value={f.farmer_contributed_lsl} onChange={(v) => set('farmer_contributed_lsl', v)} id={`${stage}-fp`} />
          <div className="space-y-1.5">
            <Label className="text-xs">Outstanding</Label>
            <div className={cn('h-9 flex items-center px-3 rounded-md border bg-muted/40 text-sm tabular-nums',
              variance != null && variance > 0 ? 'text-warning font-medium' : 'text-muted-foreground')}>
              {variance == null ? '—' : formatLsl(variance)}
            </div>
          </div>
        </div>
      </fieldset>

      {/* SADP / Budget allocation */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          SADP &amp; budget allocation
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <MoneyField label="SADP contributed (M)" value={f.sadp_contributed_lsl} onChange={(v) => set('sadp_contributed_lsl', v)} id={`${stage}-sadp`} />
          <div className="space-y-1.5">
            <Label className="text-xs">BA status</Label>
            <Select
              value={f.ba_status ?? '__none'}
              onValueChange={(v) => set('ba_status', v === '__none' ? null : (v as BaStatus))}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Not set</SelectItem>
                {(Object.keys(BA_STATUS_META) as BaStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{BA_STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor={`${stage}-ba-date`}>BA submitted</Label>
            <Input
              id={`${stage}-ba-date`}
              type="date"
              className="h-9"
              value={f.ba_submitted_date ?? ''}
              onChange={(e) => set('ba_submitted_date', e.target.value || null)}
            />
          </div>
        </div>
      </fieldset>

      {/* Funds & report */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Funds &amp; report
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <MoneyField label="Allocated (M)" value={f.funds_allocated_lsl} onChange={(v) => set('funds_allocated_lsl', v)} id={`${stage}-alloc`} />
          <MoneyField label="Depleted (M)" value={f.funds_depleted_lsl} onChange={(v) => set('funds_depleted_lsl', v)} id={`${stage}-depl`} />
          <MoneyField label="Yet to report (M)" value={f.yet_to_report_lsl} onChange={(v) => set('yet_to_report_lsl', v)} id={`${stage}-ytr`} />
          <div className="space-y-1.5">
            <Label className="text-xs">Report status</Label>
            <Select
              value={f.report_status ?? '__none'}
              onValueChange={(v) => set('report_status', v === '__none' ? null : (v as StageReportStatus))}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Not set</SelectItem>
                {(Object.keys(REPORT_STATUS_META) as StageReportStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{REPORT_STATUS_META[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" htmlFor={`${stage}-rep-date`}>Report date</Label>
            <Input
              id={`${stage}-rep-date`}
              type="date"
              className="h-9"
              value={f.report_date ?? ''}
              onChange={(e) => set('report_date', e.target.value || null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Depleted</Label>
            <div className={cn('h-9 flex items-center px-3 rounded-md border bg-muted/40 text-sm tabular-nums',
              depleted != null && depleted >= 90 ? 'text-warning font-medium' : 'text-muted-foreground')}>
              {depleted == null ? '—' : `${depleted}%`}
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  id: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs" htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        step={1000}
        className="h-9 tabular-nums"
        placeholder="—"
        value={value ?? ''}
        onChange={(e) => onChange(num(e.target.value))}
      />
    </div>
  );
}
