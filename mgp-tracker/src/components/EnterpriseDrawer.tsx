import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Trash2, ArrowRight, Phone, AlertTriangle } from 'lucide-react';
import { useData, daysSince, fmtDate, fmtDateTime, errMsg, type ActionRow } from '../lib/data';
import { supabase } from '../lib/supabase';
import { STAGES, STAGE, type StageKey } from '../lib/stages';
import { changeStage } from '../lib/mutations';
import { Button, Drawer, Modal, StageChip, inputCls, toast } from './ui';

export function EnterpriseDrawer({ trackingId, onClose }: { trackingId: string | null; onClose: () => void }) {
  const { itemById, history, users, items, canEdit, isAdmin, userName, reload } = useData();
  const it = trackingId ? itemById[trackingId] : undefined;

  const [target, setTarget] = useState<StageKey | null>(null);
  const [note, setNote] = useState('');
  const [queries, setQueries] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setTarget(null);
    setNote('');
    setQueries('');
  }, [trackingId]);

  const hist = useMemo(() => (it ? history.filter((h) => h.tracking_id === it.id).reverse() : []), [history, it]);
  const owners = useMemo(
    () => Array.from(new Set([...users.map((u) => u.full_name), ...items.flatMap((i) => i.actions.map((a) => a.owner ?? ''))].filter(Boolean))).sort(),
    [users, items],
  );

  if (!it) return null;
  const openQueries = it.actions.filter((a) => a.kind === 'sadp_query' && a.status === 'open');

  async function confirmMove() {
    if (!it || !target) return;
    setBusy(true);
    const ok = await changeStage(it.id, it.name, target, note.trim() || null);
    if (ok && target === 'sadp_queries') {
      const lines = queries
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      if (lines.length) {
        const { error } = await supabase.from('mgp_actions').insert(lines.map((description) => ({ tracking_id: it.id, kind: 'sadp_query', description })));
        if (error) toast.err(errMsg(error));
      }
    }
    setBusy(false);
    setTarget(null);
    setNote('');
    setQueries('');
    reload();
  }

  async function remove() {
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
      title={
        <div>
          <div className="text-lg font-bold leading-tight">{it.name}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            <span>{it.district}</span>
            {it.enterprise_type && <span>· {it.enterprise_type}</span>}
            {it.community_council && <span>· {it.community_council}</span>}
            {it.phone && (
              <a href={`tel:${it.phone}`} className="inline-flex items-center gap-1 text-brand">
                · <Phone size={11} /> {it.phone}
              </a>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <StageChip stage={it.stage} />
            <span className="text-xs text-slate-500">
              {STAGE[it.stage].code} · for {daysSince(it.stage_since)} days
            </span>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Move */}
        {canEdit && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Move to</h3>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {STAGES.map((s) => (
                <button
                  key={s.key}
                  disabled={s.key === it.stage}
                  onClick={() => setTarget(s.key)}
                  className={`rounded-md border px-2 py-1.5 text-left text-xs font-medium transition disabled:cursor-default disabled:opacity-40 ${
                    target === s.key ? 'border-brand bg-brand-light ring-1 ring-brand' : 'border-slate-200 hover:border-brand'
                  }`}
                >
                  <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${s.dot}`} />
                  {s.short}
                </button>
              ))}
            </div>
            {target && (
              <div className="mt-3 space-y-2 rounded-lg border border-brand/30 bg-brand-light/40 p-3">
                <div className="flex items-center gap-2 text-sm">
                  {STAGE[it.stage].short} <ArrowRight size={14} /> <b>{STAGE[target].label}</b>
                </div>
                {target === 'approved' && openQueries.length > 0 && (
                  <div className="flex items-start gap-2 rounded bg-amber-50 p-2 text-xs text-amber-900">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {openQueries.length} SADP quer{openQueries.length === 1 ? 'y is' : 'ies are'} still open. Tick them as done if resolved.
                  </div>
                )}
                {target === 'sadp_queries' && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Queries from SADP — one per line (optional, you can add more later)</span>
                    <textarea className={inputCls} rows={4} value={queries} onChange={(e) => setQueries(e.target.value)} placeholder={'e.g. Bank reconciliation does not balance\nMissing supplier quotations'} />
                  </label>
                )}
                <input className={inputCls} placeholder="Note (optional) — e.g. “submitted to SADP 3 Nov”" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setTarget(null)}>
                    Cancel
                  </Button>
                  <Button onClick={confirmMove} disabled={busy}>
                    {busy ? 'Saving…' : 'Confirm move'}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {it.note && !target && (
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
        <p className="mb-4 text-sm text-slate-600">This removes {it.name} from the tracker along with its action plan and history. It does not touch the enterprise in the monitoring app.</p>
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
  const [owner, setOwner] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const sorted = [...actions].sort((a, b) => (a.status === b.status ? (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') : a.status === 'open' ? -1 : 1));

  async function add(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('mgp_actions').insert({ tracking_id: trackingId, kind, description: desc.trim(), owner: owner.trim() || null, due_date: due || null });
    setBusy(false);
    if (error) return toast.err(errMsg(error));
    setDesc('');
    onChange();
  }

  async function toggle(a: ActionRow) {
    const { error } = await supabase.from('mgp_actions').update({ status: a.status === 'open' ? 'done' : 'open' }).eq('id', a.id);
    if (error) toast.err(errMsg(error));
    else onChange();
  }

  async function del(a: ActionRow) {
    if (!window.confirm('Delete this item?')) return;
    const { error } = await supabase.from('mgp_actions').delete().eq('id', a.id);
    if (error) toast.err(errMsg(error));
    else onChange();
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">
        Action plan <span className="font-normal text-slate-500">({actions.filter((a) => a.status === 'open').length} open)</span>
      </h3>
      {sorted.length === 0 && <p className="mb-3 text-sm text-slate-500">No queries or actions yet.</p>}
      <ul className="mb-3 divide-y rounded-lg border">
        {sorted.map((a) => {
          const late = a.status === 'open' && a.due_date && a.due_date < today;
          return (
            <li key={a.id} className="flex items-start gap-3 px-3 py-2">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-[#008C44]" checked={a.status === 'done'} disabled={!canEdit} onChange={() => toggle(a)} />
              <div className="min-w-0 flex-1">
                <div className={`text-sm ${a.status === 'done' ? 'text-slate-400 line-through' : ''}`}>
                  {a.kind === 'sadp_query' && <span className="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">SADP query</span>}
                  {a.description}
                </div>
                <div className="text-xs text-slate-500">
                  {a.owner && <span className="font-medium text-slate-700">{a.owner}</span>}
                  {a.due_date && <span className={late ? 'font-semibold text-red-600' : ''}> · due {fmtDate(a.due_date)}</span>}
                  {a.status === 'done' && a.done_at && (
                    <span>
                      {' '}
                      · done by {userName(a.done_by)} {fmtDate(a.done_at)}
                    </span>
                  )}
                </div>
              </div>
              {canEdit && (
                <button onClick={() => del(a)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {canEdit && (
        <form onSubmit={add} className="space-y-2 rounded-lg bg-slate-50 p-3">
          <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-xs font-medium">
            {(['action', 'sadp_query'] as const).map((k) => (
              <button type="button" key={k} onClick={() => setKind(k)} className={`flex-1 rounded px-2 py-1 ${kind === k ? 'bg-brand text-white' : 'text-slate-600'}`}>
                {k === 'action' ? 'Action' : 'SADP query'}
              </button>
            ))}
          </div>
          <input className={inputCls} placeholder={kind === 'action' ? 'What needs to be done?' : 'Query raised by SADP'} value={desc} onChange={(e) => setDesc(e.target.value)} required />
          <div className="grid grid-cols-[1fr_auto_auto] gap-2">
            <input className={inputCls} list="mgp-owners" placeholder="Owner (who)" value={owner} onChange={(e) => setOwner(e.target.value)} />
            <input className={inputCls} type="date" value={due} onChange={(e) => setDue(e.target.value)} />
            <Button disabled={busy || !desc.trim()}>Add</Button>
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
