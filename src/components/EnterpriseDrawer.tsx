import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Trash2, Phone, AlertTriangle, Save, Plus, Lock } from 'lucide-react';
import { useData, daysSince, fmtDate, fmtDateTime, errMsg, type ActionRow, type QueryStatus } from '../lib/data';
import { supabase } from '../lib/supabase';
import { STAGES, STAGE, type StageKey } from '../lib/stages';
import { LIFECYCLE_STAGES, LIFECYCLE_META, type LifecycleStage } from '../lib/lifecycle';
import { changeStage, setLifecycleStage, syncAutoStage } from '../lib/mutations';
import { StageFinanceEditor, type FinanceEditorHandle } from './StageFinanceEditor';
import { EnterpriseJourney } from './EnterpriseJourney';
import { deriveRisk } from '../lib/risk';
import { RiskFlagChips } from './NeedsAttention';
import { deriveReadiness, TIER_META } from '../lib/readiness';
import { ReadinessBar, MissingChips } from './GraduationReadiness';
import { deriveReportSla, SLA_TARGET_DAYS } from '../lib/sla';
import { SlaBadge } from './ReportSla';
import { Button, Drawer, Modal, StageChip, LifecycleChip, inputCls, toast } from './ui';

/** Stages that can't be derived from the data — set manually (pre-submission). */
const MANUAL_STAGE_KEYS: StageKey[] = ['under_review', 'with_isp', 'blocked_infra'];
const MANUAL_STAGES = STAGES.filter((s) => MANUAL_STAGE_KEYS.includes(s.key));

export function EnterpriseDrawer({ trackingId, onClose }: { trackingId: string | null; onClose: () => void }) {
  const { itemById, history, users, items, canEdit, isAdmin, userName, reload, me } = useData();
  const [removeReason, setRemoveReason] = useState('Withdrawn');
  const it = trackingId ? itemById[trackingId] : undefined;

  const [busyLc, setBusyLc] = useState(false);
  const [busyStage, setBusyStage] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Floating save for the finance editor — save without scrolling to the bottom.
  const financeRef = useRef<FinanceEditorHandle>(null);
  const [financesDirty, setFinancesDirty] = useState(false);
  const [savingFinances, setSavingFinances] = useState(false);

  async function saveFinances() {
    setSavingFinances(true);
    await financeRef.current?.save();
    setSavingFinances(false);
  }

  const hist = useMemo(() => (it ? history.filter((h) => h.tracking_id === it.id).reverse() : []), [history, it]);
  const owners = useMemo(
    () => Array.from(new Set([...users.map((u) => u.full_name), ...items.flatMap((i) => i.actions.map((a) => a.owner ?? ''))].filter(Boolean))).sort(),
    [users, items],
  );

  if (!it) return null;
  const risk = deriveRisk(it);
  const readiness = deriveReadiness(it);
  const sla = deriveReportSla(it);

  async function manualMove(stage: StageKey) {
    if (!it || stage === it.stage || busyStage) return;
    setBusyStage(true);
    await changeStage(it.id, it.name, stage, null);
    setBusyStage(false);
    reload();
  }

  async function changeLifecycle(s: LifecycleStage) {
    if (!it || s === it.lifecycle_stage || busyLc) return;
    setBusyLc(true);
    await setLifecycleStage(it.id, it.name, s);
    setBusyLc(false);
    reload();
  }

  async function remove() {
    if (it!.enterprise_id) {
      // keep it out of the enterprise list and totals (e.g. withdrawn)
      const { error: xErr } = await supabase
        .from('mgp_excluded')
        .upsert({ enterprise_id: it!.enterprise_id, reason: removeReason || 'Removed from tracker', excluded_by: me?.id ?? null });
      if (xErr) return toast.err(errMsg(xErr));
    }
    const { error } = await supabase.from('mgp_tracking').delete().eq('id', it!.id);
    if (error) return toast.err(errMsg(error));
    toast.ok(`${it!.name} removed from tracker`);
    setConfirmDelete(false);
    onClose();
    reload();
  }

  return (
    <Drawer
      open
      onClose={onClose}
      wide
      footer={
        canEdit && financesDirty ? (
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <AlertTriangle size={13} /> Unsaved finance changes
            </span>
            <Button onClick={saveFinances} disabled={savingFinances} size="sm">
              <Save size={13} /> {savingFinances ? 'Saving…' : 'Save finances'}
            </Button>
          </div>
        ) : undefined
      }
      title={
        <div>
          <div className="text-lg font-bold leading-tight">{it.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <span>{it.district}</span>
            {it.enterprise_type && <span>· {it.enterprise_type}</span>}
            {it.community_council && <span>· {it.community_council}</span>}
            {it.service_provider && <span>· <span className="text-slate-400">SP</span> {it.service_provider}</span>}
            {it.phone && (
              <a href={`tel:${it.phone}`} className="inline-flex items-center gap-1 text-brand">
                · <Phone size={11} /> {it.phone}
              </a>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LifecycleChip stage={it.lifecycle_stage} />
            <StageChip stage={it.stage} />
            <span className="text-xs text-slate-500">
              {STAGE[it.stage].code} · for {daysSince(it.stage_since)} days
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Risk flags */}
        {risk.flags.length > 0 && (
          <div className={`rounded-lg border px-3 py-2.5 ${risk.level === 'red' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
            <div className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold ${risk.level === 'red' ? 'text-red-700' : 'text-amber-800'}`}>
              <AlertTriangle size={13} /> Needs attention
            </div>
            <RiskFlagChips flags={risk.flags} />
          </div>
        )}

        {/* Report awaiting SADP approval — SLA clock */}
        {sla.waiting && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <SlaBadge sla={sla} />
            <span>awaiting SADP approval{sla.level === 'breach' ? ` — over the ${SLA_TARGET_DAYS}-day SLA` : ''}</span>
          </div>
        )}

        {/* Lifecycle milestone */}
        <section>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold">Milestone</h3>
            <span className="text-xs text-slate-400">M1 → M2 → Graduation</span>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {LIFECYCLE_STAGES.map((s) => {
              const active = s === it.lifecycle_stage;
              return (
                <button
                  key={s}
                  disabled={!canEdit || busyLc || active}
                  onClick={() => changeLifecycle(s)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition disabled:cursor-default ${
                    active ? 'bg-white text-brand-dark shadow-sm ring-1 ring-brand/20' : 'text-slate-600 enabled:hover:bg-white/60'
                  }`}
                >
                  {LIFECYCLE_META[s].label}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">{LIFECYCLE_META[it.lifecycle_stage].description}</p>
        </section>

        {/* Graduation readiness */}
        {readiness.tier !== 'graduated' && (
          <section>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Graduation readiness</h3>
              <span className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TIER_META[readiness.tier].chip}`}>{TIER_META[readiness.tier].label}</span>
                <span className="text-xs font-semibold tabular-nums text-slate-600">{readiness.pct}%</span>
              </span>
            </div>
            <ReadinessBar pct={readiness.pct} tier={readiness.tier} />
            <div className="mt-2"><MissingChips missing={readiness.missing} max={8} /></div>
          </section>
        )}

        {/* Journey strip */}
        <EnterpriseJourney stage={it.lifecycle_stage} stageFinances={it.stage_finances} approvalStage={it.stage} />

        {/* Per-milestone finances */}
        <StageFinanceEditor
          ref={financeRef}
          trackingId={it.id}
          name={it.name}
          stageFinances={it.stage_finances}
          currentStage={it.lifecycle_stage}
          readOnly={!canEdit}
          onSaved={reload}
          onDirtyChange={setFinancesDirty}
        />

        {/* Section — mostly automatic; manual only for the pre-submission stages */}
        {canEdit && (
          <section>
            <h3 className="mb-1 text-sm font-semibold">Section</h3>
            <p className="mb-2 text-xs text-slate-500">
              Moves to <b>At SADP</b>, <b>SADP Queries</b> and <b>Approved</b> happen automatically from the report dates and queries. Set a pre-submission section here if needed.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MANUAL_STAGES.map((s) => {
                const current = s.key === it.stage;
                return (
                  <button
                    key={s.key}
                    disabled={current || busyStage}
                    onClick={() => manualMove(s.key)}
                    className={`inline-flex items-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-default ${
                      current ? 'border-brand bg-brand-light text-brand-dark ring-1 ring-brand/30' : 'border-slate-200 text-slate-600 hover:border-brand'
                    }`}
                  >
                    <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${s.dot}`} />
                    {s.short}
                    {current && <span className="ml-1.5 text-[10px] text-slate-400">· current</span>}
                  </button>
                );
              })}
            </div>
            {!MANUAL_STAGE_KEYS.includes(it.stage) && (
              <p className="mt-2 text-xs text-slate-400">Currently <b className="text-slate-600">{STAGE[it.stage].short}</b> (set automatically).</p>
            )}
          </section>
        )}

        {it.note && (
          <div className="rounded-md bg-slate-50 px-3 py-2 text-sm italic text-slate-600">
            “{it.note}” <span className="not-italic text-xs text-slate-400">— latest note</span>
          </div>
        )}

        {/* Action plan */}
        <ActionPlan trackingId={it.id} actions={it.actions} canEdit={canEdit} owners={owners} userName={userName} onChange={reload} />

        {/* History */}
        <section>
          <h3 className="mb-2 text-sm font-semibold">History</h3>
          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            {hist.map((h) => (
              <li key={h.id} className="text-sm">
                <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${STAGE[h.to_stage].dot}`} />
                <div>
                  {h.from_stage ? (
                    <>
                      {STAGE[h.from_stage].short} → <b>{STAGE[h.to_stage].short}</b>
                    </>
                  ) : (
                    <>
                      Placed in <b>{STAGE[h.to_stage].short}</b>
                    </>
                  )}
                </div>
                {h.note && <div className="text-xs italic text-slate-500">“{h.note}”</div>}
                <div className="text-xs text-slate-400">
                  {userName(h.changed_by)} · {fmtDateTime(h.changed_at)}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {isAdmin && (
          <div className="border-t pt-4">
            <Button variant="ghost" className="text-red-600" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Remove from tracker
            </Button>
          </div>
        )}
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Remove from tracker?">
        <p className="mb-3 text-sm text-slate-600">
          {it.name} will be taken off the tracker and out of all totals (e.g. if withdrawn), together with its action plan and history. The enterprise itself stays in the monitoring app.
        </p>
        <input className={`${inputCls} mb-4`} value={removeReason} onChange={(e) => setRemoveReason(e.target.value)} placeholder="Reason (e.g. Withdrawn)" />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={remove}>
            Remove
          </Button>
        </div>
      </Modal>
    </Drawer>
  );
}

const QUERY_STATUS: { key: QueryStatus; label: string; short: string; chip: string }[] = [
  { key: 'raised', label: 'Raised by SADP', short: 'Raised', chip: 'border-amber-200 bg-amber-50 text-amber-800' },
  { key: 'addressing', label: 'Being addressed by 4D', short: 'Addressing', chip: 'border-fdblue/30 bg-fdblue-light text-sky-800' },
  { key: 'responded', label: 'Responded to SADP', short: 'Responded', chip: 'border-brand/20 bg-brand-light text-brand-dark' },
];

function ActionPlan({
  trackingId,
  actions,
  canEdit,
  owners,
  userName,
  onChange,
}: {
  trackingId: string;
  actions: ActionRow[];
  canEdit: boolean;
  owners: string[];
  userName: (id: string | null) => string;
  onChange: () => void;
}) {
  const [kind, setKind] = useState<'action' | 'sadp_query'>('action');
  const [desc, setDesc] = useState('');
  const { users } = useData();
  const activeUsers = users.filter((u) => u.is_active);
  const [assignee, setAssignee] = useState(''); // user id, '' = none, 'other' = free text
  const [owner, setOwner] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  // Optimistic ticks so the checkbox responds instantly; cleared when fresh data arrives.
  const [pendingTick, setPendingTick] = useState<Record<string, 'open' | 'done'>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => setPendingTick({}), [actions]);

  // Keep the order items were added (no jumping when ticked).
  const list = [...actions].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const statusOf = (a: ActionRow) => pendingTick[a.id] ?? a.status;
  const doneCount = list.filter((a) => statusOf(a) === 'done').length;
  const pct = list.length ? Math.round((doneCount / list.length) * 100) : 0;

  async function add(e?: FormEvent) {
    e?.preventDefault();
    const text = desc.trim();
    if (!text || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from('mgp_actions')
      .insert({
        tracking_id: trackingId,
        kind,
        description: text,
        assigned_to: assignee && assignee !== 'other' ? assignee : null,
        owner: assignee === 'other' ? owner.trim() || null : null,
        due_date: due || null,
        query_status: kind === 'sadp_query' ? 'raised' : null,
        // A SADP query is "received" the day it's logged (locked thereafter).
        sadp_received_date: kind === 'sadp_query' ? new Date().toISOString().slice(0, 10) : null,
      });
    setBusy(false);
    if (error) return toast.err(errMsg(error));
    setDesc('');
    if (kind === 'sadp_query') await syncAutoStage(trackingId);
    onChange();
    inputRef.current?.focus(); // ready for the next item
  }

  async function toggle(a: ActionRow) {
    const next = statusOf(a) === 'open' ? 'done' : 'open';
    setPendingTick((p) => ({ ...p, [a.id]: next }));
    const { error } = await supabase.from('mgp_actions').update({ status: next }).eq('id', a.id);
    if (error) {
      setPendingTick((p) => {
        const n = { ...p };
        delete n[a.id];
        return n;
      });
      toast.err(errMsg(error));
    } else {
      if (a.kind === 'sadp_query') await syncAutoStage(trackingId);
      onChange();
    }
  }

  async function setQueryDate(a: ActionRow, field: 'sadp_received_date' | 'sadp_sent_back_date', date: string) {
    const { error } = await supabase.from('mgp_actions').update({ [field]: date || null }).eq('id', a.id);
    if (error) toast.err(errMsg(error));
    else {
      await syncAutoStage(trackingId);
      onChange();
    }
  }

  async function reassign(a: ActionRow, userId: string) {
    const { error } = await supabase.from('mgp_actions').update({ assigned_to: userId || null }).eq('id', a.id);
    if (error) toast.err(errMsg(error));
    else {
      if (userId) toast.ok(`Assigned to ${userName(userId)}`);
      onChange();
    }
  }

  async function del(a: ActionRow) {
    if (!window.confirm(`Delete “${a.description}”?`)) return;
    const { error } = await supabase.from('mgp_actions').delete().eq('id', a.id);
    if (error) toast.err(errMsg(error));
    else onChange();
  }

  async function setQueryStatus(a: ActionRow, status: QueryStatus) {
    const { error } = await supabase.from('mgp_actions').update({ query_status: status }).eq('id', a.id);
    if (error) toast.err(errMsg(error));
    else onChange();
  }

  async function setQueryReasoning(a: ActionRow, text: string) {
    const { error } = await supabase.from('mgp_actions').update({ query_reasoning: text.trim() || null }).eq('id', a.id);
    if (error) toast.err(errMsg(error));
    else onChange();
  }

  /** Jump to the add box ready for a new follow-up, optionally pre-filled (e.g. from a query). */
  function startFollowUp(prefill?: string) {
    setKind('action');
    if (prefill !== undefined) setDesc(prefill);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ block: 'center' });
    });
  }

  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <h3 className="text-sm font-semibold">Action plan</h3>
        {list.length > 0 && (
          <>
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full bg-brand-logo transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-medium text-slate-600">
              {doneCount} of {list.length} done
            </span>
          </>
        )}
        {canEdit && (
          <button
            onClick={() => startFollowUp()}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 transition hover:border-brand hover:text-brand"
          >
            <Plus size={13} /> Follow-up
          </button>
        )}
      </div>

      {list.length > 0 && (
        <ul className="mb-3 divide-y rounded-lg border">
          {list.map((a) => {
            const done = statusOf(a) === 'done';
            const late = !done && a.due_date && a.due_date < today;
            return (
              <li key={a.id} className={`hover-row group ${done ? 'bg-slate-50' : ''}`}>
                <div className="flex items-start gap-3 px-3 py-2">
                <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#008C44]" checked={done} disabled={!canEdit} onChange={() => toggle(a)} />
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm ${done ? 'text-slate-400 line-through' : ''}`}>
                      {a.kind === 'sadp_query' && <span className="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900 no-underline">SADP query</span>}
                      {a.description}
                    </div>
                    {(a.owner || a.due_date || (done && a.done_at)) && (
                      <div className="text-xs text-slate-500">
                        {a.assigned_to ? (
                          <span className="font-medium text-slate-700" title={a.assigned_at ? `Assigned by ${userName(a.assigned_by)} on ${fmtDateTime(a.assigned_at)}` : undefined}>
                            🔔 {userName(a.assigned_to)}
                            {a.assigned_at && <span className="font-normal text-slate-400"> · assigned {fmtDateTime(a.assigned_at)}</span>}
                          </span>
                        ) : (
                          a.owner && <span className="font-medium text-slate-700">{a.owner}</span>
                        )}
                        {a.due_date && <span className={late ? 'font-semibold text-red-600' : ''}>{a.owner ? ' · ' : ''}due {fmtDate(a.due_date)}</span>}
                        {done && a.done_at && (
                          <span className="text-brand">
                            {a.owner || a.due_date ? ' · ' : ''}✓ {userName(a.done_by)}, {fmtDate(a.done_at)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </label>
                {canEdit && a.kind === 'sadp_query' && (
                  <button
                    onClick={() => startFollowUp(`Follow up: ${a.description}`)}
                    className="rounded p-1 text-slate-300 hover:bg-brand-light hover:text-brand"
                    title="Add a follow-up for this query"
                  >
                    <Plus size={14} />
                  </button>
                )}
                {canEdit && !done && (
                  <select
                    className="w-24 shrink-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] text-slate-500 hover:border-slate-300 focus:border-brand"
                    value={a.assigned_to ?? ''}
                    onChange={(e) => reassign(a, e.target.value)}
                    title="Assign to"
                  >
                    <option value="">{a.assigned_to ? 'Unassign' : 'Assign…'}</option>
                    {activeUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name}
                      </option>
                    ))}
                  </select>
                )}
                {canEdit && (
                  <button onClick={() => del(a)} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600" title="Delete">
                    <Trash2 size={14} />
                  </button>
                )}
                </div>
                {a.kind === 'sadp_query' && (
                  <div className="border-t border-slate-100 px-3 py-2">
                    <QueryWorkflow a={a} canEdit={canEdit} onStatus={setQueryStatus} onReasoning={setQueryReasoning} onDate={setQueryDate} userName={userName} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <form onSubmit={add} className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex gap-2">
            <select className="rounded-md border border-slate-300 bg-white px-2 text-xs font-medium" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} title="Type of item">
              <option value="action">Action</option>
              <option value="sadp_query">SADP query</option>
            </select>
            <input
              ref={inputRef}
              className={inputCls}
              placeholder={list.length ? 'Add another item… (press Enter)' : 'Add an item… (press Enter)'}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <Button disabled={busy || !desc.trim()}>{busy ? '…' : 'Add'}</Button>
          </div>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
            <div className="flex gap-2">
              <select className={`${inputCls} ${assignee === 'other' ? 'w-40' : ''}`} value={assignee} onChange={(e) => setAssignee(e.target.value)} title="Assign to (kept for the next items)">
                <option value="">🔔 Assign to… (optional)</option>
                {activeUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
                <option value="other">Someone not registered…</option>
              </select>
              {assignee === 'other' && <input className={inputCls} list="mgp-owners" placeholder="Name" value={owner} onChange={(e) => setOwner(e.target.value)} />}
            </div>
            <input className={`${inputCls} w-[150px]`} type="date" value={due} onChange={(e) => setDue(e.target.value)} title="Due date (optional)" />
          </div>
          <datalist id="mgp-owners">
            {owners.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </form>
      )}
    </section>
  );
}

/** A query date that locks (becomes read-only) once set, with an optional who/when stamp. */
function QueryDate({
  label,
  value,
  locked,
  stamp,
  onChange,
}: {
  label: string;
  value: string | null;
  locked: boolean;
  stamp?: string;
  onChange: (date: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
        {label}
        {value && <Lock size={10} className="text-slate-300" />}
      </span>
      {locked && value ? (
        <div className="flex h-8 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-xs tabular-nums text-slate-600">{fmtDate(value)}</div>
      ) : (
        <input type="date" className={`${inputCls} h-8`} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
      )}
      {stamp && <span className="block text-[10px] text-slate-400">{stamp}</span>}
    </div>
  );
}

function QueryWorkflow({
  a,
  canEdit,
  onStatus,
  onReasoning,
  onDate,
  userName,
}: {
  a: ActionRow;
  canEdit: boolean;
  onStatus: (a: ActionRow, s: QueryStatus) => void;
  onReasoning: (a: ActionRow, t: string) => void;
  onDate: (a: ActionRow, field: 'sadp_received_date' | 'sadp_sent_back_date', date: string) => void;
  userName: (id: string | null) => string;
}) {
  const status: QueryStatus = a.query_status ?? 'raised';
  const [reason, setReason] = useState(a.query_reasoning ?? '');
  useEffect(() => setReason(a.query_reasoning ?? ''), [a.query_reasoning]);
  const meta = QUERY_STATUS.find((q) => q.key === status)!;
  const showReason = status === 'addressing' || status === 'responded';
  const sentStamp = a.sadp_sent_back_at ? `${userName(a.sadp_sent_back_by)} · ${fmtDate(a.sadp_sent_back_at.slice(0, 10))}` : undefined;

  if (!canEdit) {
    return (
      <div className="space-y-1.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.chip}`}>{meta.label}</span>
          {a.query_reasoning && <span className="text-slate-500">· {a.query_reasoning}</span>}
        </div>
        <div className="flex flex-wrap gap-x-4 text-slate-500">
          {a.sadp_received_date && <span>Received from SADP {fmtDate(a.sadp_received_date)}</span>}
          {a.sadp_sent_back_date && <span>Sent back {fmtDate(a.sadp_sent_back_date)}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        <QueryDate label="Received from SADP" value={a.sadp_received_date} locked={!!a.sadp_received_date} onChange={(d) => onDate(a, 'sadp_received_date', d)} />
        <QueryDate label="Sent back to SADP" value={a.sadp_sent_back_date} locked={!!a.sadp_sent_back_date} stamp={sentStamp} onChange={(d) => onDate(a, 'sadp_sent_back_date', d)} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Query status</span>
        <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-[11px]">
          {QUERY_STATUS.map((q, i) => (
            <button
              key={q.key}
              onClick={() => onStatus(a, q.key)}
              className={`rounded px-2 py-0.5 ${status === q.key ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              title={q.label}
            >
              {i + 1}. {q.short}
            </button>
          ))}
        </div>
      </div>
      {showReason && (
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">Reasoning / response to SADP</span>
          <textarea
            className={inputCls}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => {
              if ((reason.trim() || null) !== (a.query_reasoning ?? null)) onReasoning(a, reason);
            }}
            placeholder="How 4D traced and addressed the query, and the reasoning sent back to SADP."
          />
        </label>
      )}
    </div>
  );
}
