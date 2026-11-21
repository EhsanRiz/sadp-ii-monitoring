/**
 * Money editor for an enterprise (migration 410, reshaped 460).
 *
 *  - Top: the FIXED contract (M1 200k / M2 300k / total 500k, read-only) with
 *    SADP + farmer contributions entered against it and the deficit shown in red.
 *    Shown once — not inside the milestone cards.
 *  - M1 / M2 cards: a FROZEN allocated figure (the SADP grant) and a
 *    fund-depletion history (cumulative readings, each locked with who/when),
 *    plus the report → PFO → SADP approval flow.
 *
 * Saving also auto-moves the board stage (and advances the lifecycle) from the
 * report fields: submitted → At SADP, approved → Approved (M1 rolls to M2, M2
 * graduates). Amounts in Maloti (M).
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Save, AlertCircle, Lock, History } from 'lucide-react';
import {
  MONEY_STAGES,
  parseFinances,
  stageFinanceOrEmpty,
  serializeFinances,
  pctDepleted,
  currentDepleted,
  approvalTurnaroundDays,
  pfoApprovalDays,
  contractSadp,
  contractFarmer,
  contractGrandTotal,
  totalSadpContributed,
  totalFarmerContributed,
  cellTotal,
  hasSplit,
  formatLsl,
  emptyStageFinance,
  REPORT_STATUS_META,
  type Json,
  type MoneyStage,
  type StageFinance,
  type StageFinancesMap,
  type ContractValue,
  type SpendEntry,
  type StageReportStatus,
} from '../lib/stage-finances';
import { LIFECYCLE_META, type LifecycleStage } from '../lib/lifecycle';
import { deriveAutoStage } from '../lib/auto-stage';
import { saveStageFinances } from '../lib/mutations';
import { useData, fmtDate } from '../lib/data';
import type { StageKey } from '../lib/stages';
import { Button, inputCls, toast } from './ui';

interface Props {
  trackingId: string;
  name: string;
  stageFinances: Json | null | undefined;
  /** Current milestone — highlights the active card and gates auto-graduation. */
  currentStage: LifecycleStage;
  readOnly?: boolean;
  onSaved: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

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
  const { me, userName, itemById } = useData();
  const [contract, setContract] = useState<ContractValue>({ m1: null, m2: null, flat: null });
  const [draft, setDraft] = useState<StageFinancesMap>({});
  // New depletion readings being typed (not yet appended to history), per milestone.
  const [newDepleted, setNewDepleted] = useState<Partial<Record<MoneyStage, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ef = parseFinances(stageFinances);
    setContract(ef.contract);
    setDraft(ef.stages);
    setNewDepleted({});
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

  function setDepletedInput(stage: MoneyStage, v: string) {
    setNewDepleted((n) => ({ ...n, [stage]: v }));
    setDirty(true);
  }

  /** Fold any typed depletion readings into the draft as new locked history rows. */
  function draftWithDepletion(): StageFinancesMap {
    const out: StageFinancesMap = { ...draft };
    for (const s of MONEY_STAGES) {
      const raw = newDepleted[s];
      const amt = raw != null ? num(raw) : null;
      if (amt == null) continue;
      const base = out[s] ?? emptyStageFinance();
      const latest = currentDepleted(base);
      if (latest != null && amt === latest) continue; // unchanged — no new row
      const entry: SpendEntry = { amount: amt, at: new Date().toISOString(), by: me?.id ?? null };
      out[s] = { ...base, depletion: [...base.depletion, entry] };
    }
    return out;
  }

  async function onSave() {
    setBusy(true);
    const stages = draftWithDepletion();
    const actions = itemById[trackingId]?.actions ?? [];

    // Auto-advance lifecycle on report approval.
    const curMs: MoneyStage = currentStage === 'm2' ? 'm2' : 'm1';
    const curF = stages[curMs];
    const approved = !!curF?.sadp_approved_date || curF?.report_status === 'approved';
    let lifecycleStage: LifecycleStage | undefined;
    if (approved && currentStage === 'm1') lifecycleStage = 'm2';
    else if (approved && currentStage === 'm2') lifecycleStage = 'graduated';

    // Auto-move the board stage from the report fields + open queries.
    const serialized = serializeFinances({ contract, stages });
    const autoStage: StageKey | undefined = deriveAutoStage(serialized, currentStage, actions) ?? undefined;

    const ok = await saveStageFinances(trackingId, name, { contract, stages }, { lifecycleStage, stage: autoStage });
    setBusy(false);
    if (ok) {
      if (lifecycleStage === 'graduated') toast.ok(`🎓 ${name} graduated`);
      setNewDepleted({});
      setDirty(false);
      onSaved();
    }
  }

  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  useImperativeHandle(ref, () => ({ save: () => onSaveRef.current() }), []);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Stage finances</h3>
          <p className="text-xs text-slate-500">Fixed contract with contributions &amp; deficit on top; allocated funds and depletion per milestone. Amounts in Maloti (M).</p>
        </div>
        {dirty && !readOnly && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-amber-700">
            <AlertCircle size={12} /> unsaved
          </span>
        )}
      </div>

      <ContractContributions contract={contract} draft={draft} readOnly={readOnly} onChange={setField} />

      <div className="mt-3 space-y-3">
        {MONEY_STAGES.map((stage) => (
          <StageMoneyCard
            key={stage}
            stage={stage}
            value={stageFinanceOrEmpty(draft, stage)}
            active={currentStage === stage}
            readOnly={readOnly}
            onChange={setField}
            newDepleted={newDepleted[stage] ?? ''}
            onNewDepleted={(v) => setDepletedInput(stage, v)}
            userName={userName}
          />
        ))}
      </div>

      {!readOnly && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button onClick={onSave} disabled={!dirty || busy} size="sm">
            <Save size={13} /> {busy ? 'Saving…' : 'Save finances'}
          </Button>
        </div>
      )}
    </section>
  );
});

/** Red deficit, green when met. */
function Deficit({ value }: { value: number }) {
  if (value <= 0) return <span className="font-medium text-brand-dark">Met</span>;
  return <span className="font-semibold text-red-600 tabular-nums">−{formatLsl(value)}</span>;
}

function ContractContributions({
  contract,
  draft,
  readOnly,
  onChange,
}: {
  contract: ContractValue;
  draft: StageFinancesMap;
  readOnly: boolean;
  onChange: <K extends keyof StageFinance>(stage: MoneyStage, key: K, value: StageFinance[K]) => void;
}) {
  const split = hasSplit(contract);
  const totalSadp = contractSadp(contract);
  const totalFarmer = contractFarmer(contract);
  const grand = contractGrandTotal(contract);
  const contribSadp = totalSadpContributed(draft);
  const contribFarmer = totalFarmerContributed(draft);
  const set = (stage: MoneyStage, key: 'sadp_contributed_lsl' | 'farmer_contributed_lsl', v: number | null) => onChange(stage, key, v);

  return (
    <div className="space-y-3 rounded-lg border border-brand/30 bg-brand-light/40 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Contract &amp; contributions</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500"><Lock size={11} /> contract fixed</span>
      </div>

      {/* Fixed contract table */}
      <div className="overflow-hidden rounded-md border border-brand/20 bg-white">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="bg-brand-light/60 text-xs text-slate-600">
              <th className="px-3 py-1.5 text-left font-medium"> </th>
              <th className="px-3 py-1.5 text-right font-medium">SADP</th>
              <th className="px-3 py-1.5 text-right font-medium">Farmer</th>
              <th className="px-3 py-1.5 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {split ? (
              <>
                <ContractRow label="M1" sadp={contract.m1?.sadp ?? 0} farmer={contract.m1?.farmer ?? 0} total={cellTotal(contract.m1)} />
                <ContractRow label="M2" sadp={contract.m2?.sadp ?? 0} farmer={contract.m2?.farmer ?? 0} total={cellTotal(contract.m2)} />
              </>
            ) : (
              <ContractRow label="Contract" sadp={contract.flat?.sadp ?? 0} farmer={contract.flat?.farmer ?? 0} total={cellTotal(contract.flat)} nonStandard />
            )}
            <tr className="bg-slate-50 font-semibold text-slate-800">
              <td className="px-3 py-1.5">Total</td>
              <td className="px-3 py-1.5 text-right">{formatLsl(totalSadp)}</td>
              <td className="px-3 py-1.5 text-right">{formatLsl(totalFarmer)}</td>
              <td className="px-3 py-1.5 text-right">{formatLsl(grand)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Contributions entered against the contract */}
      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-600">
              <th className="px-3 py-1.5 text-left font-medium">Contributed to date</th>
              <th className="px-3 py-1.5 text-right font-medium">SADP</th>
              <th className="px-3 py-1.5 text-right font-medium">Farmer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MONEY_STAGES.map((s) => (
              <tr key={s}>
                <td className="px-3 py-1.5 text-xs font-medium text-slate-500">{s.toUpperCase()}</td>
                <td className="px-2 py-1">
                  <ContribInput value={draft[s]?.sadp_contributed_lsl ?? null} onChange={(v) => set(s, 'sadp_contributed_lsl', v)} readOnly={readOnly} id={`${s}-csadp`} />
                </td>
                <td className="px-2 py-1">
                  <ContribInput value={draft[s]?.farmer_contributed_lsl ?? null} onChange={(v) => set(s, 'farmer_contributed_lsl', v)} readOnly={readOnly} id={`${s}-cfarmer`} />
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-medium">
              <td className="px-3 py-1.5 text-xs text-slate-600">Total contributed</td>
              <td className="px-3 py-1.5 text-right">{formatLsl(contribSadp)}</td>
              <td className="px-3 py-1.5 text-right">{formatLsl(contribFarmer)}</td>
            </tr>
            <tr className="bg-red-50/40">
              <td className="px-3 py-1.5 text-xs font-semibold text-slate-600">Deficit</td>
              <td className="px-3 py-1.5 text-right"><Deficit value={Math.max(0, totalSadp - contribSadp)} /></td>
              <td className="px-3 py-1.5 text-right"><Deficit value={Math.max(0, totalFarmer - contribFarmer)} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContractRow({ label, sadp, farmer, total, nonStandard }: { label: string; sadp: number; farmer: number; total: number; nonStandard?: boolean }) {
  return (
    <tr>
      <td className="px-3 py-1.5 text-xs font-medium text-slate-500">
        {label}
        {nonStandard && <span className="ml-1 rounded bg-amber-100 px-1 text-[9px] font-semibold uppercase text-amber-800">non-standard</span>}
      </td>
      <td className="px-3 py-1.5 text-right text-slate-700">{formatLsl(sadp)}</td>
      <td className="px-3 py-1.5 text-right text-slate-700">{formatLsl(farmer)}</td>
      <td className="px-3 py-1.5 text-right font-medium text-slate-800">{formatLsl(total)}</td>
    </tr>
  );
}

function ContribInput({ value, onChange, readOnly, id }: { value: number | null; onChange: (v: number | null) => void; readOnly: boolean; id: string }) {
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={0}
      step={1000}
      disabled={readOnly}
      className={`${inputCls} h-8 w-full text-right tabular-nums`}
      placeholder="—"
      value={value ?? ''}
      onChange={(e) => onChange(num(e.target.value))}
    />
  );
}

interface CardProps {
  stage: MoneyStage;
  value: StageFinance;
  active: boolean;
  readOnly: boolean;
  onChange: <K extends keyof StageFinance>(stage: MoneyStage, key: K, value: StageFinance[K]) => void;
  newDepleted: string;
  onNewDepleted: (v: string) => void;
  userName: (id: string | null) => string;
}

function StageMoneyCard({ stage, value: f, active, readOnly, onChange, newDepleted, onNewDepleted, userName }: CardProps) {
  const depleted = currentDepleted(f);
  const pct = pctDepleted(f);
  const pfoDays = pfoApprovalDays(f);
  const turnaround = approvalTurnaroundDays(f);
  const set = <K extends keyof StageFinance>(key: K, v: StageFinance[K]) => onChange(stage, key, v);

  return (
    <div className={`space-y-3 rounded-lg border p-3 ${active ? 'border-brand/40 bg-brand-light/40' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{LIFECYCLE_META[stage].full}</span>
        {active && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold text-brand-dark">Current milestone</span>}
      </div>

      {/* Fund depletion: frozen allocated + locked cumulative history */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Fund depletion <span className="inline-flex items-center gap-0.5 text-[10px] font-normal normal-case text-slate-400"><Lock size={10} /> allocated frozen</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <ReadOut label="Allocated (SADP grant)" value={formatLsl(f.allocated_lsl)} warn={false} />
          <ReadOut label="Depleted to date" value={formatLsl(depleted)} warn={false} />
          <ReadOut label="% depleted" value={pct == null ? '—' : `${pct}%`} warn={pct != null && pct >= 90} />
        </div>

        {f.depletion.length > 0 && (
          <div className="rounded-md border border-slate-200 bg-slate-50/70">
            <div className="flex items-center gap-1.5 border-b border-slate-200 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              <History size={11} /> Depletion history
            </div>
            <ul className="divide-y divide-slate-100">
              {f.depletion.map((d, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-2.5 py-1.5 text-xs">
                  <span className="font-medium tabular-nums text-slate-700">{formatLsl(d.amount)}</span>
                  <span className="text-slate-400">
                    {userName(d.by)}{d.at ? ` · ${fmtDate(d.at.slice(0, 10))}` : ''}
                    <Lock size={10} className="ml-1 inline text-slate-300" />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!readOnly && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Record new depleted total (cumulative)">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                className={`${inputCls} tabular-nums`}
                placeholder={depleted != null ? `was ${formatLsl(depleted)}` : '—'}
                value={newDepleted}
                onChange={(e) => onNewDepleted(e.target.value)}
              />
            </Field>
            <p className="self-end pb-2 text-[11px] text-slate-400">Saved as a new locked entry stamped with your name and the date.</p>
          </div>
        )}
      </fieldset>

      {/* Report approval: Submitted to PFO → Approved by PFO → Approved by SADP */}
      <fieldset className="space-y-2" disabled={readOnly}>
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stage.toUpperCase()} report approval (PFO → SADP)</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Report status">
            <select className={inputCls} value={f.report_status ?? ''} onChange={(e) => set('report_status', (e.target.value || null) as StageReportStatus | null)}>
              <option value="">Not set</option>
              {(Object.keys(REPORT_STATUS_META) as StageReportStatus[]).map((s) => (
                <option key={s} value={s}>{REPORT_STATUS_META[s].label}</option>
              ))}
            </select>
          </Field>
          <Field label="Report target date">
            <input type="date" className={inputCls} value={f.report_target_date ?? ''} onChange={(e) => set('report_target_date', e.target.value || null)} />
          </Field>
          <Field label="Report date">
            <input type="date" className={inputCls} value={f.report_date ?? ''} onChange={(e) => set('report_date', e.target.value || null)} />
          </Field>
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
        {active && (f.sadp_approved_date || f.report_status === 'approved') && (
          <p className="text-[11px] text-brand-dark">On save this {stage === 'm1' ? 'advances the enterprise to M2' : 'graduates the enterprise'} and marks it Approved.</p>
        )}
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
