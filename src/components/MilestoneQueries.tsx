/**
 * SADP queries for one milestone (M1 / M2), shown inside that milestone's card.
 *
 * Flow: SADP returns the report with queries → staff log them (one row at a time
 * with an expected redressal date, saved together) → each is also an Action Plan
 * item → as each is addressed it's ticked → once all are addressed the whole
 * report pack is sent back to SADP (one stamped action that moves the enterprise
 * to At SADP).
 *
 * A query is an mgp_actions row (kind='sadp_query', milestone=m1/m2): the row is
 * both the query and its redressal action. The tick (status→done) stamps who/when.
 */
import { useState } from 'react';
import { Plus, Trash2, X, RotateCcw, Send, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { syncAutoStage, markReportResubmitted } from '../lib/mutations';
import { errMsg, fmtDate, type ActionRow } from '../lib/data';
import type { StageFinance, MoneyStage } from '../lib/stage-finances';
import { inputCls, Button, toast } from './ui';

interface Draft {
  text: string;
  due: string;
}

export function MilestoneQueries({
  trackingId,
  name,
  stage,
  f,
  queries,
  canEdit,
  meId,
  userName,
  onChanged,
}: {
  trackingId: string;
  name: string;
  stage: MoneyStage;
  f: StageFinance;
  queries: ActionRow[];
  canEdit: boolean;
  meId: string | null;
  userName: (id: string | null) => string;
  onChanged: () => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const list = [...queries].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const allAddressed = list.length > 0 && list.every((a) => a.status === 'done');
  const resubmitted = !!f.report_resubmitted_date;

  async function update(id: string, patch: Record<string, unknown>) {
    const { error } = await supabase.from('mgp_actions').update(patch).eq('id', id);
    if (error) return toast.err(errMsg(error));
    await syncAutoStage(trackingId);
    onChanged();
  }

  async function del(a: ActionRow) {
    if (!window.confirm(`Delete query “${a.description}”?`)) return;
    const { error } = await supabase.from('mgp_actions').delete().eq('id', a.id);
    if (error) return toast.err(errMsg(error));
    await syncAutoStage(trackingId);
    onChanged();
  }

  async function saveDrafts() {
    const rows = drafts.map((d) => ({ ...d, text: d.text.trim() })).filter((d) => d.text);
    if (!rows.length || busy) return;
    setBusy(true);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('mgp_actions').insert(
      rows.map((d) => ({
        tracking_id: trackingId,
        kind: 'sadp_query',
        milestone: stage,
        description: d.text,
        due_date: d.due || null,
        query_status: 'raised',
        sadp_received_date: today,
      })),
    );
    setBusy(false);
    if (error) return toast.err(errMsg(error));
    setDrafts([]);
    await syncAutoStage(trackingId);
    onChanged();
  }

  async function sendPack() {
    if (busy) return;
    setBusy(true);
    await markReportResubmitted(trackingId, name, stage, meId);
    setBusy(false);
    onChanged();
  }

  if (!canEdit && list.length === 0) return null;

  return (
    <fieldset className="space-y-2 rounded-md border border-amber-200 bg-amber-50/50 p-2.5">
      <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
        <RotateCcw size={12} /> SADP queries
        {list.length > 0 && <span className="rounded-full bg-amber-200 px-1.5 text-[10px] font-semibold text-amber-900">{list.length}</span>}
      </legend>

      {list.length === 0 && drafts.length === 0 && <p className="text-[11px] text-amber-700/80">No queries for this milestone.</p>}

      {/* Existing queries */}
      {list.length > 0 && (
        <ul className="space-y-1.5">
          {list.map((a) => {
            const done = a.status === 'done';
            return (
              <li key={a.id} className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-white px-2.5 py-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#008C44]"
                  checked={done}
                  disabled={!canEdit}
                  title="Mark addressed"
                  onChange={() => update(a.id, { status: done ? 'open' : 'done' })}
                />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{a.description}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                    {canEdit && !done ? (
                      <label className="flex items-center gap-1">
                        <span>redress by</span>
                        <input type="date" className={`${inputCls} h-6 px-1 py-0 text-[11px]`} value={a.due_date ?? ''} onChange={(e) => update(a.id, { due_date: e.target.value || null })} />
                      </label>
                    ) : (
                      a.due_date && <span>redress by {fmtDate(a.due_date)}</span>
                    )}
                    {a.sadp_received_date && <span>· received {fmtDate(a.sadp_received_date)}</span>}
                    {done && a.done_at && <span className="text-brand">· ✓ {userName(a.done_by)}, {fmtDate(a.done_at.slice(0, 10))}</span>}
                  </div>
                </div>
                {canEdit && (
                  <button onClick={() => del(a)} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600" title="Delete query">
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Report pack status / action */}
      {resubmitted ? (
        <div className="flex items-center gap-1.5 rounded-md border border-brand/20 bg-brand-light/50 px-2.5 py-1.5 text-xs text-brand-dark">
          <Check size={13} /> Report pack sent to SADP · {userName(f.report_resubmitted_by)} · {f.report_resubmitted_at ? fmtDate(f.report_resubmitted_at.slice(0, 10)) : ''}
        </div>
      ) : (
        canEdit &&
        allAddressed && (
          <Button onClick={sendPack} disabled={busy} size="sm">
            <Send size={13} /> Send report pack to SADP
          </Button>
        )
      )}

      {/* Batch add */}
      {canEdit && (
        <div className="space-y-1.5 rounded-md border border-dashed border-amber-300 bg-white/60 p-2">
          {drafts.map((d, i) => (
            <div key={i} className="space-y-1.5 rounded-md border border-slate-200 bg-white p-2">
              <input
                className={`${inputCls} h-8 w-full`}
                placeholder={`${stage.toUpperCase()} query from SADP…`}
                value={d.text}
                onChange={(e) => setDrafts((ds) => ds.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                autoFocus={i === drafts.length - 1}
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  Redress by
                  <input
                    type="date"
                    className={`${inputCls} h-8 w-[150px]`}
                    value={d.due}
                    onChange={(e) => setDrafts((ds) => ds.map((x, j) => (j === i ? { ...x, due: e.target.value } : x)))}
                  />
                </label>
                <button onClick={() => setDrafts((ds) => ds.filter((_, j) => j !== i))} className="ml-auto rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-red-600" title="Remove row">
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrafts((ds) => [...ds, { text: '', due: '' }])}
              className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-white px-2 py-1 text-[11px] font-medium text-amber-800 transition hover:bg-amber-100"
            >
              <Plus size={12} /> Add query row
            </button>
            {drafts.length > 0 && (
              <Button onClick={saveDrafts} disabled={busy || !drafts.some((d) => d.text.trim())} size="sm">
                {busy ? 'Saving…' : `Save ${drafts.filter((d) => d.text.trim()).length || ''} quer${drafts.filter((d) => d.text.trim()).length === 1 ? 'y' : 'ies'}`}
              </Button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
}
