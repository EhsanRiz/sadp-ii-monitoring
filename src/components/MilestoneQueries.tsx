/**
 * SADP queries for one milestone (M1 / M2), shown inside that milestone's card.
 *
 * A query is an mgp_actions row (kind='sadp_query', milestone=m1/m2) — it is both
 * the query and its redressal action. The tick (status→done) records who/when;
 * the received / sent-back dates lock once set (enforced in the DB trigger).
 * Logging or resolving a query re-derives the board stage (auto-move).
 */
import { useState, type FormEvent } from 'react';
import { Plus, Trash2, Lock, RotateCcw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { syncAutoStage } from '../lib/mutations';
import { errMsg, fmtDate, type ActionRow } from '../lib/data';
import type { MoneyStage } from '../lib/stage-finances';
import { inputCls, toast } from './ui';

export function MilestoneQueries({
  trackingId,
  stage,
  queries,
  canEdit,
  userName,
  onChanged,
}: {
  trackingId: string;
  stage: MoneyStage;
  queries: ActionRow[];
  canEdit: boolean;
  userName: (id: string | null) => string;
  onChanged: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const list = [...queries].sort((a, b) => a.created_at.localeCompare(b.created_at));

  async function add(e?: FormEvent) {
    e?.preventDefault();
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    const { error } = await supabase.from('mgp_actions').insert({
      tracking_id: trackingId,
      kind: 'sadp_query',
      milestone: stage,
      description: t,
      query_status: 'raised',
      sadp_received_date: new Date().toISOString().slice(0, 10),
    });
    setBusy(false);
    if (error) return toast.err(errMsg(error));
    setText('');
    await syncAutoStage(trackingId);
    onChanged();
  }

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

  if (!canEdit && list.length === 0) return null;

  return (
    <fieldset className="space-y-2 rounded-md border border-amber-200 bg-amber-50/50 p-2.5">
      <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
        <RotateCcw size={12} /> SADP queries
        {list.length > 0 && <span className="rounded-full bg-amber-200 px-1.5 text-[10px] font-semibold text-amber-900">{list.length}</span>}
      </legend>

      {list.length === 0 && <p className="text-[11px] text-amber-700/80">No queries for this milestone.</p>}

      <ul className="space-y-2">
        {list.map((a) => {
          const done = a.status === 'done';
          const recvLocked = !!a.sadp_received_date;
          const sentLocked = !!a.sadp_sent_back_date;
          const sentStamp = a.sadp_sent_back_at ? `${userName(a.sadp_sent_back_by)} · ${fmtDate(a.sadp_sent_back_at.slice(0, 10))}` : undefined;
          return (
            <li key={a.id} className="space-y-2 rounded-md border border-amber-200 bg-white p-2.5">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#008C44]"
                  checked={done}
                  disabled={!canEdit}
                  title="Redressal done"
                  onChange={() => update(a.id, { status: done ? 'open' : 'done' })}
                />
                <div className="min-w-0 flex-1">
                  <div className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{a.description}</div>
                  {done && a.done_at && (
                    <div className="text-[11px] text-brand">✓ redressed · {userName(a.done_by)}, {fmtDate(a.done_at.slice(0, 10))}</div>
                  )}
                </div>
                {canEdit && (
                  <button onClick={() => del(a)} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600" title="Delete query">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <QueryDate label="Received from SADP" value={a.sadp_received_date} locked={!canEdit || recvLocked} onChange={(d) => update(a.id, { sadp_received_date: d || null })} />
                <QueryDate label="Sent back to SADP" value={a.sadp_sent_back_date} locked={!canEdit || sentLocked} stamp={sentStamp} onChange={(d) => update(a.id, { sadp_sent_back_date: d || null })} />
              </div>

              {canEdit ? (
                <label className="block">
                  <span className="mb-1 block text-[11px] font-medium text-slate-500">Reasoning / response to SADP</span>
                  <textarea
                    className={inputCls}
                    rows={2}
                    defaultValue={a.query_reasoning ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null;
                      if (v !== (a.query_reasoning ?? null)) update(a.id, { query_reasoning: v });
                    }}
                    placeholder="How 4D traced and addressed the query, and the reasoning sent back to SADP."
                  />
                </label>
              ) : (
                a.query_reasoning && <p className="text-xs text-slate-500">{a.query_reasoning}</p>
              )}
            </li>
          );
        })}
      </ul>

      {canEdit && (
        <form onSubmit={add} className="flex gap-2">
          <input className={inputCls} placeholder={`Add a ${stage.toUpperCase()} query from SADP…`} value={text} onChange={(e) => setText(e.target.value)} />
          <button
            type="submit"
            disabled={busy || !text.trim()}
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-300 bg-white px-2.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-40"
          >
            <Plus size={13} /> Add
          </button>
        </form>
      )}
    </fieldset>
  );
}

/** A query date that locks (read-only) once set. */
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
