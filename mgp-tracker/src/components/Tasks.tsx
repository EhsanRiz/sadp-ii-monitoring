import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useData, fmtDate, fmtDateTime, errMsg, type ActionRow, type Item } from '../lib/data';
import { supabase } from '../lib/supabase';
import { DISTRICT_SHORT } from '../lib/stages';
import { useNav } from '../App';
import { toast } from './ui';

export interface Task {
  a: ActionRow;
  it: Item;
}

/** Open items assigned to a given registered user, soonest due first. */
export function useTasksFor(userId: string | null | undefined): Task[] {
  const { items } = useData();
  return useMemo(() => {
    if (!userId) return [];
    const out: Task[] = [];
    for (const it of items) for (const a of it.actions) if (a.assigned_to === userId && a.status === 'open') out.push({ a, it });
    return out.sort((x, y) => (x.a.due_date ?? '9999').localeCompare(y.a.due_date ?? '9999') || (x.a.assigned_at ?? '').localeCompare(y.a.assigned_at ?? ''));
  }, [items, userId]);
}

export function TaskRow({ t, canTick, compact, onOpen }: { t: Task; canTick: boolean; compact?: boolean; onOpen?: () => void }) {
  const { userName, reload } = useData();
  const { openItem } = useNav();
  const [ticking, setTicking] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const late = t.a.due_date && t.a.due_date < today;

  async function clear() {
    setTicking(true);
    const { error } = await supabase.from('mgp_actions').update({ status: 'done' }).eq('id', t.a.id);
    if (error) {
      toast.err(errMsg(error));
      setTicking(false);
    } else {
      toast.ok('Cleared ✓');
      reload();
    }
  }

  return (
    <li className={`flex items-start gap-2.5 ${compact ? 'px-3 py-2' : 'px-4 py-2.5'} ${ticking ? 'opacity-50' : ''}`}>
      {canTick ? (
        <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#008C44]" checked={ticking} onChange={clear} title="Mark as done" />
      ) : (
        <span className="mt-1 h-3 w-3 shrink-0 rounded-sm border border-slate-300" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm leading-snug">
          {t.a.kind === 'sadp_query' && <span className="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">SADP query</span>}
          {t.a.description}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
          <button
            className="font-medium text-brand hover:underline"
            onClick={() => {
              onOpen?.();
              openItem(t.it.id);
            }}
          >
            {t.it.name}
          </button>
          <span>{DISTRICT_SHORT[t.it.district] ?? t.it.district}</span>
          {t.a.assigned_at && (
            <span>
              assigned {fmtDateTime(t.a.assigned_at)}
              {t.a.assigned_by && <> by {userName(t.a.assigned_by).split(' ')[0]}</>}
            </span>
          )}
        </div>
      </div>
      <div className={`shrink-0 text-right text-xs ${late ? 'font-semibold text-red-600' : 'text-slate-500'}`}>
        {t.a.due_date ? (
          <>
            {late ? 'overdue' : 'due'}
            <br />
            {fmtDate(t.a.due_date)}
          </>
        ) : (
          'no due date'
        )}
      </div>
    </li>
  );
}

/** Header bell: my open assigned items, with a "new" count since I last opened it. */
export function BellMenu() {
  const { me } = useData();
  const tasks = useTasksFor(me?.id);
  const [open, setOpen] = useState(false);
  const key = `mgp-bell-seen-${me?.id}`;
  const [seenAt, setSeenAt] = useState<string>(() => {
    try {
      return localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  });
  const ref = useRef<HTMLDivElement>(null);
  const fresh = tasks.filter((t) => (t.a.assigned_at ?? '') > seenAt).length;

  useEffect(() => {
    if (!open) return;
    const now = new Date().toISOString();
    setSeenAt(now);
    try {
      localStorage.setItem(key, now);
    } catch {
      /* ignore */
    }
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open, key]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100" title="Tasks assigned to me">
        <Bell size={19} className={fresh ? 'text-brand' : ''} />
        {tasks.length > 0 && (
          <span className={`absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full px-1 text-center text-[10px] font-bold leading-[18px] text-white ${fresh ? 'bg-red-600' : 'bg-brand'}`}>
            {tasks.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(92vw,420px)] overflow-hidden rounded-xl border bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b bg-brand-light/60 px-3 py-2.5">
            <span className="text-sm font-semibold text-brand-dark">My tasks</span>
            <span className="text-xs text-slate-500">{tasks.length} open · tick to clear</span>
          </div>
          {tasks.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-500">Nothing assigned to you. 🎉</p>
          ) : (
            <ul className="max-h-[60vh] divide-y overflow-y-auto">
              {tasks.map((t) => (
                <TaskRow key={t.a.id} t={t} canTick compact onOpen={() => setOpen(false)} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Dashboard card for the signed-in user. */
export function MyTasksCard() {
  const { me } = useData();
  const tasks = useTasksFor(me?.id);
  return (
    <div className="overflow-hidden rounded-xl border border-brand/30 bg-white print:hidden">
      <div className="flex items-center gap-2 border-b bg-brand-light/60 px-4 py-2.5">
        <Bell size={16} className="text-brand" />
        <span className="text-sm font-semibold text-brand-dark">My tasks</span>
        <span className="ml-auto text-xs text-slate-500">{tasks.length ? `${tasks.length} open — tick each one when done` : 'nothing assigned to you'}</span>
      </div>
      {tasks.length > 0 && (
        <ul className="divide-y">
          {tasks.map((t) => (
            <TaskRow key={t.a.id} t={t} canTick />
          ))}
        </ul>
      )}
    </div>
  );
}
