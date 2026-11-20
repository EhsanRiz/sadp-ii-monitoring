/**
 * Money editor for an enterprise (migration 410, reshaped 450).
 *
 * A single enterprise-level contract value (SADP + farmer) at the top — not
 * split across milestones — then one card per money milestone (M1, M2) holding
 * contributions to date, budget allocation, funds, and the report → PFO → SADP
 * approval flow, including any rounds where SADP returned the report with
 * queries. Amounts in Maloti (M).
 *
 * Explicit Save writes the whole stage_finances map atomically. When the M2
 * report is marked approved the enterprise auto-graduates (the agreed model:
 * graduation is automatic on M2 completion).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Save, AlertCircle, Plus, X, RotateCcw } from 'lucide-react';
import {
  MONEY_STAGES,
  parseFinances,
  stageFinanceOrEmpty,
  pctDepleted,
  approvalTurnaroundDays,
  pfoApprovalDays,
  contractTotal,
  farmerOutstanding,
  formatLsl,
  emptyStageFinance,
  STANDARD_CONTRACT,
  BA_STATUS_META,
  REPORT_STATUS_META,
  type Json,
  type MoneyStage,
  type StageFinance,
  type StageFinancesMap,
  type ContractValue,
  type SadpReturn,
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
  const [contract, setContract] = useState<ContractValue>({ sadp_lsl: null, farmer_lsl: null });
  const [draft, setDraft] = useState<StageFinancesMap>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ef = parseFinances(stageFinances);
    setContract(ef.contract);
    setDraft(ef.stages);
    setDirty(false);
  }, [stageFinances, trackingId]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function setContractField<K extends keyof ContractValue>(key: K, value: ContractValue[K]) {
    setContract((c) => ({ ...c, [key]: value }));
    setDirty(true);
  }

  function setField<K extends keyof StageFinance>(stage: MoneyStage, key: K, value: StageFinance[K]) {
    setDraft((d) => {
      const base = d[stage] ?? emptyStageFinance();
      return { ...d, [stage]: { ...base, [key]: value } };
    });
    setDirty(true);
  }

  function mutateReturns(stage: MoneyStage, fn: (rounds: SadpReturn[]) => SadpReturn[]) {
    setDraft((d) => {
      const base = d[stage] ?? emptyStageFinance();
      return { ...d, [stage]: { ...base, sadp_returns: fn(base.sadp_returns) } };
    });
    setDirty(true);
  }

  async function onSave() {
    setBusy(true);
    // Agreed model: approving the M2 report graduates the enterprise.
    const autoGrad: LifecycleStage | undefined =
      currentStage === 'm2' && draft.m2?.report_status === 'approved' ? 'graduated' : undefined;
    const ok = await saveStageFinances(trackingId, name, { contract, stages: draft }, autoGrad);
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

  const total = contractTotal(contract);
  const outstanding = farmerOutstanding(contract, draft);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Stage finances</h3>
          <p className="text-xs text-slate-500">One contract value per enterprise; contributions, funds and reports per milestone. Amounts in Maloti (M).</p>
        </div>
        {dirty && !readOnly && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700">
            <AlertCircle size={12} /> unsaved
          </span>
        )}
      </div>

      {/* Contract value — single enterprise-level figure (SADP + Farmer), not split by milestone */}
      <fieldset className="mb-3 space-y-2 rounded-lg border border-brand/30 bg-brand-light/40 p-3" disabled={readOnly}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Contract value (whole enterprise)</legend>
          {!readOnly && (
            <button
              type="button"
              onClick={() => { setContract({ ...STANDARD_CONTRACT }); setDirty(true); }}
              className="inline-flex items-center gap-1 rounded-md border border-brand/30 bg-white px-2 py-0.5 text-[11px] font-medium text-brand-dark transition hover:bg-brand-light"
            >
              Use standard M500,000
            </button>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <MoneyField label="SADP contract (M)" value={contract.sadp_lsl} onChange={(v) => setContractField('sadp_lsl', v)} id="contract-sadp" />
          <MoneyField label="Farmer contract (M)" value={contract.farmer_lsl} onChange={(v) => setContractField('farmer_lsl', v)} id="contract-farmer" />
          <ReadOut label="Contract value" value={total == null ? '—' : formatLsl(total)} warn={false} />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <ReadOut
            label="Farmer outstanding"
            value={outstanding == null ? '—' : formatLsl(outstanding)}
            warn={outstanding != null && outstanding > 0}
          />
        </div>
      </fieldset>

      <div className="space-y-3">
        {MONEY_STAGES.map((stage) => (
          <StageMoneyCard
            key={stage}
            stage={stage}
            value={stageFinanceOrEmpty(draft, stage)}
            active={currentStage === stage}
            readOnly={readOnly}
            onChange={setField}
            onMutateReturns={mutateReturns}
          />
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
  onMutateReturns: (stage: MoneyStage, fn: (rounds: SadpReturn[]) => SadpReturn[]) => void;
}

function StageMoneyCard({ stage, value: f, active, readOnly, onChange, onMutateReturns }: CardProps) {
  const depleted = pctDepleted(f);
  const pfoDays = pfoApprovalDays(f);
  const turnaround = approvalTurnaroundDays(f);
  const set = <K extends keyof StageFinance>(key: K, v: StageFinance[K]) => onChange(stage, key, v);

  return (
    <div className={`space-y-3 rounded-lg border p-3 ${active ? 'border-brand/40 bg-brand-light/40' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{LIFECYCLE_META[stage].full}</span>
        {active && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand-dark">Current milestone</span>}
      </div>

      {/* Contributions to date (this milestone) */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contributions to date</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          <MoneyField label="SADP contributed (M)" value={f.sadp_contributed_lsl} onChange={(v) => set('sadp_contributed_lsl', v)} id={`${stage}-sadp`} />
          <MoneyField label="Farmer contributed (M)" value={f.farmer_contributed_lsl} onChange={(v) => set('farmer_contributed_lsl', v)} id={`${stage}-fp`} />
        </div>
      </fieldset>

      {/* Budget allocation */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Budget allocation</legend>
        <div className="grid gap-2 sm:grid-cols-3">
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
          <Field label="Report target date">
            <input type="date" className={inputCls} value={f.report_target_date ?? ''} onChange={(e) => set('report_target_date', e.target.value || null)} />
          </Field>
          <ReadOut label="Depleted" value={depleted == null ? '—' : `${depleted}%`} warn={depleted != null && depleted >= 90} />
        </div>
      </fieldset>

      {/* Report approval: Submitted to PFO → Approved by PFO → Approved by SADP */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stage.toUpperCase()} report approval (PFO → SADP)</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Submitted to PFO">
            <input type="date" className={inputCls} value={f.pfo_submitted_date ?? ''} onChange={(e) => set('pfo_submitted_date', e.target.value || null)} />
          </Field>
          <Field label="Approved by PFO">
            <input type="date" className={inputCls} value={f.pfo_approved_date ?? ''} onChange={(e) => set('pfo_approved_date', e.target.value || null)} />
          </Field>
          <Field label="Approved by SADP">
            <input type="date" className={inputCls} value={f.sadp_approved_date ?? ''} onChange={(e) => set('sadp_approved_date', e.target.value || null)} />
          </Field>
          <ReadOut label="PFO turnaround" value={pfoDays == null ? '—' : `${pfoDays} day${pfoDays === 1 ? '' : 's'}`} warn={pfoDays != null && pfoDays > 14} />
          <ReadOut label="Full turnaround (→ SADP)" value={turnaround == null ? '—' : `${turnaround} day${turnaround === 1 ? '' : 's'}`} warn={turnaround != null && turnaround > 30} />
        </div>
      </fieldset>

      {/* Returned by SADP — queries (zero or more rounds) */}
      <SadpReturnsBlock stage={stage} rounds={f.sadp_returns} readOnly={readOnly} onMutate={onMutateReturns} />
    </div>
  );
}

function emptyReturn(): SadpReturn {
  return { returned_date: null, queries: null, resubmitted_date: null };
}

function SadpReturnsBlock({
  stage,
  rounds,
  readOnly,
  onMutate,
}: {
  stage: MoneyStage;
  rounds: SadpReturn[];
  readOnly: boolean;
  onMutate: (stage: MoneyStage, fn: (r: SadpReturn[]) => SadpReturn[]) => void;
}) {
  const setRound = <K extends keyof SadpReturn>(idx: number, key: K, v: SadpReturn[K]) =>
    onMutate(stage, (r) => r.map((x, i) => (i === idx ? { ...x, [key]: v } : x)));
  const addRound = () => onMutate(stage, (r) => [...r, emptyReturn()]);
  const removeRound = (idx: number) => onMutate(stage, (r) => r.filter((_, i) => i !== idx));

  if (readOnly && rounds.length === 0) return null;

  return (
    <fieldset className="space-y-2 rounded-md border border-amber-200 bg-amber-50/60 p-2.5" disabled={readOnly}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
          <RotateCcw size={12} /> Returned by SADP — queries
          {rounds.length > 0 && <span className="rounded-full bg-amber-200 px-1.5 text-[10px] font-semibold text-amber-900">{rounds.length}</span>}
        </legend>
        {!readOnly && (
          <button
            type="button"
            onClick={addRound}
            className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-medium text-amber-800 transition hover:bg-amber-100"
          >
            <Plus size={12} /> {rounds.length === 0 ? 'Record a return' : 'Add another return'}
          </button>
        )}
      </div>

      {rounds.length === 0 && <p className="text-[11px] text-amber-700/80">Not returned — the report has not come back from SADP with queries.</p>}

      <div className="space-y-2.5">
        {rounds.map((r, idx) => (
          <div key={idx} className="space-y-2 rounded-md border border-amber-200 bg-white p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800">Return {idx + 1}</span>
              {!readOnly && (
                <button type="button" onClick={() => removeRound(idx)} className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-red-600" aria-label="Remove this return">
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Received back from SADP">
                <input type="date" className={inputCls} value={r.returned_date ?? ''} onChange={(e) => setRound(idx, 'returned_date', e.target.value || null)} />
              </Field>
              <Field label="Sent back to SADP">
                <input type="date" className={inputCls} value={r.resubmitted_date ?? ''} onChange={(e) => setRound(idx, 'resubmitted_date', e.target.value || null)} />
              </Field>
            </div>
            <Field label="Queries raised">
              <textarea
                className={`${inputCls} min-h-[56px] resize-y`}
                placeholder="What did SADP ask to be fixed or clarified?"
                value={r.queries ?? ''}
                onChange={(e) => setRound(idx, 'queries', e.target.value || null)}
              />
            </Field>
          </div>
        ))}
      </div>
    </fieldset>
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
