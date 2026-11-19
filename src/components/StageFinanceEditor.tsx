/**
 * Per-milestone money editor for an enterprise (migration 410).
 *
 * One card per money milestone (M1, M2), each with three blocks — farmer
 * contribution, SADP / budget allocation, and funds / report — plus live
 * read-outs (outstanding variance, % of funds depleted). Mirrors the team's
 * Round 3 contribution + SADP budget sheets. Amounts in Maloti (M).
 *
 * Explicit Save writes the whole stage_finances map atomically. When the M2
 * report is marked approved the enterprise auto-graduates (the agreed model:
 * graduation is automatic on M2 completion).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import {
  MONEY_STAGES,
  parseStageFinances,
  stageFinanceOrEmpty,
  farmerVariance,
  pctDepleted,
  approvalTurnaroundDays,
  formatLsl,
  emptyStageFinance,
  BA_STATUS_META,
  REPORT_STATUS_META,
  type Json,
  type MoneyStage,
  type StageFinance,
  type StageFinancesMap,
  type BaStatus,
  type StageReportStatus,
} from '../lib/stage-finances';
import { LIFECYCLE_META, type LifecycleStage } from '../lib/lifecycle';
import { saveStageFinances } from '../lib/mutations';
import { Button, inputCls, toast } from './ui';

interface Props {
  trackingId: string;
  name: string;
  stageFinances: Json | null | undefined;
  /** Current milestone — highlights the active card and gates auto-graduation. */
  currentStage: LifecycleStage;
  readOnly?: boolean;
  onSaved: () => void;
  /** Reports whether there are unsaved changes, so a parent can show a sticky save bar. */
  onDirtyChange?: (dirty: boolean) => void;
}

/** Imperative handle so a parent (e.g. the drawer's floating save bar) can trigger a save. */
export interface FinanceEditorHandle {
  save: () => Promise<void>;
}

function num(v: string): number | null {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const StageFinanceEditor = forwardRef<FinanceEditorHandle, Props>(function StageFinanceEditor(
  { trackingId, name, stageFinances, currentStage, readOnly = false, onSaved, onDirtyChange },
  ref,
) {
  const [draft, setDraft] = useState<StageFinancesMap>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraft(parseStageFinances(stageFinances));
    setDirty(false);
  }, [stageFinances, trackingId]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function setField<K extends keyof StageFinance>(stage: MoneyStage, key: K, value: StageFinance[K]) {
    setDraft((d) => {
      const base = d[stage] ?? emptyStageFinance();
      return { ...d, [stage]: { ...base, [key]: value } };
    });
    setDirty(true);
  }

  async function onSave() {
    setBusy(true);
    // Agreed model: approving the M2 report graduates the enterprise.
    const autoGrad: LifecycleStage | undefined =
      currentStage === 'm2' && draft.m2?.report_status === 'approved' ? 'graduated' : undefined;
    const ok = await saveStageFinances(trackingId, name, draft, autoGrad);
    setBusy(false);
    if (ok) {
      if (autoGrad) toast.ok(`🎓 ${name} graduated`);
      setDirty(false);
      onSaved();
    }
  }

  // Expose the latest save() to a parent (floating save bar) without re-binding the handle.
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  useImperativeHandle(ref, () => ({ save: () => onSaveRef.current() }), []);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Stage finances</h3>
          <p className="text-xs text-slate-500">Farmer &amp; SADP contributions, budget allocation and fund depletion per milestone. Amounts in Maloti (M).</p>
        </div>
        {dirty && !readOnly && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700">
            <AlertCircle size={12} /> unsaved
          </span>
        )}
      </div>

      <div className="space-y-3">
        {MONEY_STAGES.map((stage) => (
          <StageMoneyCard key={stage} stage={stage} value={stageFinanceOrEmpty(draft, stage)} active={currentStage === stage} readOnly={readOnly} onChange={setField} />
        ))}
      </div>

      {!readOnly && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {currentStage === 'm2' && draft.m2?.report_status === 'approved' && (
            <span className="text-xs text-brand-dark">Approving the M2 report graduates this enterprise.</span>
          )}
          <Button onClick={onSave} disabled={!dirty || busy} size="sm">
            <Save size={13} /> {busy ? 'Saving…' : 'Save finances'}
          </Button>
        </div>
      )}
    </section>
  );
});

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
  const turnaround = approvalTurnaroundDays(f);
  const set = <K extends keyof StageFinance>(key: K, v: StageFinance[K]) => onChange(stage, key, v);

  return (
    <div className={`space-y-3 rounded-lg border p-3 ${active ? 'border-brand/40 bg-brand-light/40' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{LIFECYCLE_META[stage].full}</span>
        {active && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand-dark">Current milestone</span>}
      </div>

      {/* Farmer contribution */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Farmer contribution</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <MoneyField label="Contract (M)" value={f.farmer_contract_lsl} onChange={(v) => set('farmer_contract_lsl', v)} id={`${stage}-fc`} />
          <MoneyField label="Contributed (M)" value={f.farmer_contributed_lsl} onChange={(v) => set('farmer_contributed_lsl', v)} id={`${stage}-fp`} />
          <ReadOut label="Outstanding" value={variance == null ? '—' : formatLsl(variance)} warn={variance != null && variance > 0} />
        </div>
      </fieldset>

      {/* SADP / Budget allocation */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">SADP &amp; budget allocation</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <MoneyField label="SADP contributed (M)" value={f.sadp_contributed_lsl} onChange={(v) => set('sadp_contributed_lsl', v)} id={`${stage}-sadp`} />
          <Field label="BA status">
            <select className={inputCls} value={f.ba_status ?? ''} onChange={(e) => set('ba_status', (e.target.value || null) as BaStatus | null)}>
              <option value="">Not set</option>
              {(Object.keys(BA_STATUS_META) as BaStatus[]).map((s) => (
                <option key={s} value={s}>{BA_STATUS_META[s].label}</option>
              ))}
            </select>
          </Field>
          <Field label="BA submitted">
            <input type="date" className={inputCls} value={f.ba_submitted_date ?? ''} onChange={(e) => set('ba_submitted_date', e.target.value || null)} />
          </Field>
        </div>
      </fieldset>

      {/* Funds & report */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Funds &amp; report</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <MoneyField label="Allocated (M)" value={f.funds_allocated_lsl} onChange={(v) => set('funds_allocated_lsl', v)} id={`${stage}-alloc`} />
          <MoneyField label="Depleted (M)" value={f.funds_depleted_lsl} onChange={(v) => set('funds_depleted_lsl', v)} id={`${stage}-depl`} />
          <MoneyField label="Yet to report (M)" value={f.yet_to_report_lsl} onChange={(v) => set('yet_to_report_lsl', v)} id={`${stage}-ytr`} />
          <Field label="Report status">
            <select className={inputCls} value={f.report_status ?? ''} onChange={(e) => set('report_status', (e.target.value || null) as StageReportStatus | null)}>
              <option value="">Not set</option>
              {(Object.keys(REPORT_STATUS_META) as StageReportStatus[]).map((s) => (
                <option key={s} value={s}>{REPORT_STATUS_META[s].label}</option>
              ))}
            </select>
          </Field>
          <Field label="Report date">
            <input type="date" className={inputCls} value={f.report_date ?? ''} onChange={(e) => set('report_date', e.target.value || null)} />
          </Field>
          <ReadOut label="Depleted" value={depleted == null ? '—' : `${depleted}%`} warn={depleted != null && depleted >= 90} />
        </div>
      </fieldset>

      {/* Report approval turnaround */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stage.toUpperCase()} report approval (PFO → SADP)</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Submitted to PFO">
            <input type="date" className={inputCls} value={f.pfo_submitted_date ?? ''} onChange={(e) => set('pfo_submitted_date', e.target.value || null)} />
          </Field>
          <Field label="Approved by SADP">
            <input type="date" className={inputCls} value={f.sadp_approved_date ?? ''} onChange={(e) => set('sadp_approved_date', e.target.value || null)} />
          </Field>
          <ReadOut label="Turnaround" value={turnaround == null ? '—' : `${turnaround} day${turnaround === 1 ? '' : 's'}`} warn={turnaround != null && turnaround > 30} />
        </div>
      </fieldset>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs text-slate-600">{label}</label>
      {children}
    </div>
  );
}

function ReadOut({ label, value, warn }: { label: string; value: string; warn: boolean }) {
  return (
    <Field label={label}>
      <div className={`flex h-[38px] items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums ${warn ? 'font-medium text-amber-700' : 'text-slate-500'}`}>{value}</div>
    </Field>
  );
}

function MoneyField({ label, value, onChange, id }: { label: string; value: number | null; onChange: (v: number | null) => void; id: string }) {
  return (
    <Field label={label}>
      <input id={id} type="number" inputMode="numeric" min={0} step={1000} className={`${inputCls} tabular-nums`} placeholder="—" value={value ?? ''} onChange={(e) => onChange(num(e.target.value))} />
    </Field>
  );
}
