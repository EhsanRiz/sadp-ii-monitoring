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
  type Json,
  type MoneyStage,
  type StageFinance,
  type StageFinancesMap,
  type ContractValue,
  type SpendEntry,
  type ReportDateKey,
} from '../lib/stage-finances';
import { LIFECYCLE_META, type LifecycleStage } from '../lib/lifecycle';
import { deriveAutoStage } from '../lib/auto-stage';
import { saveStageFinances } from '../lib/mutations';
import { useData, fmtDate, fmtDateTime, type FinanceLogRow } from '../lib/data';
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
  const { me, userName, itemById, isAdmin, financeLog } = useData();
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

  /** Set a stamped report date (date + who + when), or clear all three. */
  function setStampedDate(stage: MoneyStage, base: ReportDateKey, dateValue: string | null) {
    setDraft((d) => {
      const f = d[stage] ?? emptyStageFinance();
      const next: StageFinance = dateValue
        ? { ...f, [`${base}_date`]: dateValue, [`${base}_by`]: me?.id ?? null, [`${base}_at`]: new Date().toISOString() }
        : { ...f, [`${base}_date`]: null, [`${base}_by`]: null, [`${base}_at`]: null };
      return { ...d, [stage]: next };
    });
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
    const approved = !!curF?.sadp_approved_date;
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

      <ContractContributions contract={contract} draft={draft} readOnly={readOnly} onChange={setField} trackingId={trackingId} financeLog={financeLog} userName={userName} />

      <div className="mt-3 space-y-3">
        {MONEY_STAGES.map((stage) => (
          <StageMoneyCard
            key={stage}
            stage={stage}
            value={stageFinanceOrEmpty(draft, stage)}
            active={currentStage === stage}
            readOnly={readOnly}
            isAdmin={isAdmin}
            onChange={setField}
            onStampedDate={setStampedDate}
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
  trackingId,
  financeLog,
  userName,
}: {
  contract: ContractValue;
  draft: StageFinancesMap;
  readOnly: boolean;
  onChange: <K extends keyof StageFinance>(stage: MoneyStage, key: K, value: StageFinance[K]) => void;
  trackingId: string;
  financeLog: FinanceLogRow[];
  userName: (id: string | null) => string;
}) {
  const split = hasSplit(contract);
  const totalSadp = contractSadp(contract);
  const totalFarmer = contractFarmer(contract);
  const grand = contractGrandTotal(contract);
  const contribSadp = totalSadpContributed(draft);
  const contribFarmer = totalFarmerContributed(draft);
  const set = (stage: MoneyStage, key: 'sadp_contributed_lsl' | 'farmer_contributed_lsl', v: number | null) => onChange(stage, key, v);

  // Who/when history of contribution edits (from the change-log the app records).
  const contribHistory = financeLog
    .filter((r) => r.tracking_id === trackingId && (r.field === 'farmer_contributed_lsl' || r.field === 'sadp_contributed_lsl'))
    .slice(0, 8);

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
                  <MoneyInput value={draft[s]?.sadp_contributed_lsl ?? null} onChange={(v) => set(s, 'sadp_contributed_lsl', v)} disabled={readOnly} id={`${s}-csadp`} align="right" compact />
                </td>
                <td className="px-2 py-1">
                  <MoneyInput value={draft[s]?.farmer_contributed_lsl ?? null} onChange={(v) => set(s, 'farmer_contributed_lsl', v)} disabled={readOnly} id={`${s}-cfarmer`} align="right" compact />
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

      {contribHistory.length > 0 && (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
          <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <History size={11} /> Contribution history
          </div>
          <ul className="divide-y divide-slate-100">
            {contribHistory.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                <span className="text-slate-600">
                  <span className="font-medium text-slate-500">{(r.stage ?? '').toUpperCase()} {r.field === 'farmer_contributed_lsl' ? 'Farmer' : 'SADP'}</span>{' '}
                  <span className="font-medium tabular-nums text-slate-700">{formatLsl(r.new_value == null ? null : Number(r.new_value))}</span>
                </span>
                <span className="shrink-0 text-slate-400">{userName(r.changed_by)} · {fmtDateTime(r.changed_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
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

/** Money input that formats with thousand separators as you type (e.g. 160,000). */
function MoneyInput({
  value,
  onChange,
  disabled,
  id,
  placeholder = '—',
  align = 'left',
  compact,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
  align?: 'left' | 'right';
  compact?: boolean;
}) {
  const display = value == null ? '' : value.toLocaleString('en-US');
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      disabled={disabled}
      className={`${inputCls} ${compact ? 'h-8' : ''} w-full tabular-nums ${align === 'right' ? 'text-right' : ''}`}
      placeholder={placeholder}
      value={display}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^0-9]/g, '');
        onChange(digits === '' ? null : Number(digits));
      }}
    />
  );
}

interface CardProps {
  stage: MoneyStage;
  value: StageFinance;
  active: boolean;
  readOnly: boolean;
  isAdmin: boolean;
  onChange: <K extends keyof StageFinance>(stage: MoneyStage, key: K, value: StageFinance[K]) => void;
  onStampedDate: (stage: MoneyStage, base: ReportDateKey, date: string | null) => void;
  newDepleted: string;
  onNewDepleted: (v: string) => void;
  userName: (id: string | null) => string;
}

function StageMoneyCard({ stage, value: f, active, readOnly, isAdmin, onChange, onStampedDate, newDepleted, onNewDepleted, userName }: CardProps) {
  const depleted = currentDepleted(f);
  const pct = pctDepleted(f);
  const pfoDays = pfoApprovalDays(f);
  const turnaround = approvalTurnaroundDays(f);
  void onChange; // (report dates go through onStampedDate; contributions live in the top block)

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
              <MoneyInput
                value={newDepleted === '' ? null : Number(newDepleted)}
                onChange={(v) => onNewDepleted(v == null ? '' : String(v))}
                placeholder={depleted != null ? `was ${formatLsl(depleted)}` : '—'}
              />
            </Field>
            <p className="self-end pb-2 text-[11px] text-slate-400">Saved as a new locked entry stamped with your name and the date.</p>
          </div>
        )}
      </fieldset>

      {/* Report approval: locked, stamped dates — only an Admin can revise once set */}
      <fieldset className="space-y-2">
        <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {stage.toUpperCase()} report approval (PFO → SADP)
          <span className="inline-flex items-center gap-0.5 text-[10px] font-normal normal-case text-slate-400"><Lock size={10} /> locked once set{isAdmin ? ' · you can revise' : ' · admin to revise'}</span>
        </legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <StampedDate label="Report target date" base="report_target" f={f} readOnly={readOnly} isAdmin={isAdmin} userName={userName} onChange={(d) => onStampedDate(stage, 'report_target', d)} />
          <StampedDate label="Submitted to PFO" base="pfo_submitted" f={f} readOnly={readOnly} isAdmin={isAdmin} userName={userName} onChange={(d) => onStampedDate(stage, 'pfo_submitted', d)} />
          <StampedDate label="Approved by PFO" base="pfo_approved" f={f} readOnly={readOnly} isAdmin={isAdmin} userName={userName} onChange={(d) => onStampedDate(stage, 'pfo_approved', d)} />
          <StampedDate label="Approved by SADP" base="sadp_approved" f={f} readOnly={readOnly} isAdmin={isAdmin} userName={userName} onChange={(d) => onStampedDate(stage, 'sadp_approved', d)} />
          <ReadOut label="PFO turnaround" value={pfoDays == null ? '—' : `${pfoDays} day${pfoDays === 1 ? '' : 's'}`} warn={pfoDays != null && pfoDays > 14} />
          <ReadOut label="Full turnaround (→ SADP)" value={turnaround == null ? '—' : `${turnaround} day${turnaround === 1 ? '' : 's'}`} warn={turnaround != null && turnaround > 30} />
        </div>
        {active && f.sadp_approved_date && (
          <p className="text-[11px] text-brand-dark">On save this {stage === 'm1' ? 'advances the enterprise to M2' : 'graduates the enterprise'} and marks it Approved.</p>
        )}
      </fieldset>
    </div>
  );
}

/** A report date that locks once set; non-admins see it read-only, admins can revise. */
function StampedDate({
  label,
  base,
  f,
  readOnly,
  isAdmin,
  userName,
  onChange,
}: {
  label: string;
  base: ReportDateKey;
  f: StageFinance;
  readOnly: boolean;
  isAdmin: boolean;
  userName: (id: string | null) => string;
  onChange: (date: string | null) => void;
}) {
  const date = f[`${base}_date`];
  const by = f[`${base}_by`];
  const at = f[`${base}_at`];
  const locked = readOnly || (!!date && !isAdmin);
  const stamp = by || at ? `${userName(by)}${at ? ` · ${fmtDate(at.slice(0, 10))}` : ''}` : null;
  return (
    <Field label={<span className="flex items-center gap-1">{label}{date && <Lock size={10} className="text-slate-300" />}</span>}>
      {locked && date ? (
        <div className="flex h-[38px] items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm tabular-nums text-slate-600">{fmtDate(date)}</div>
      ) : (
        <input type="date" className={inputCls} value={date ?? ''} onChange={(e) => onChange(e.target.value || null)} />
      )}
      {stamp && <span className="mt-0.5 block text-[10px] text-slate-400">{stamp}</span>}
    </Field>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
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
