import { useMemo, useState } from 'react';
import { useData, fmtDate, errMsg, type ActionRow, type Item } from '../lib/data';
import { supabase } from '../lib/supabase';
import { useNav } from '../App';
import { Filters, matches } from './Filters';
import { Empty, StageChip, inputCls, toast } from './ui';

export function ActionsView() {
  const { items, canEdit, reload } = useData();
  const { openItem } = useNav();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [status, setStatus] = useState<'open' | 'done' | 'all'>('open');
  const [owner, setOwner] = useState('');
  const [kind, setKind] = useState<'' | 'sadp_query' | 'action'>('');

  const all = useMemo(() => items.flatMap((it) => it.actions.map((a) => ({ a, it }))), [items]);
  const owners = useMemo(() => Array.from(new Set(all.map((x) => x.a.owner).filter(Boolean))).sort() as string[], [all]);
  const today = new Date().toISOString().slice(0, 10);

  const rows = all
    .filter(
      ({ a, it }) =>
        (status === 'all' || a.status === status) &&
        (!owner || a.owner === owner) &&
        (!kind || a.kind === kind) &&
        (!district || it.district === district) &&
        (matches(it.name, search) || matches(a.description, search)),
    )
    .sort((x, y) => (x.a.due_date ?? '9999').localeCompare(y.a.due_date ?? '9999') || x.it.name.localeCompare(y.it.name));

  const overdue = rows.filter(({ a }) => a.status === 'open' && a.due_date && a.due_date < today).length;

  async function toggle(a: ActionRow) {
    const { error } = await supabase.from('mgp_actions').update({ status: a.status === 'open' ? 'done' : 'open' }).eq('id', a.id);
    if (error) toast.err(errMsg(error));
    else reload();
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Action plan</h2>
        <p className="text-sm text-slate-500">Every SADP query and action across all enterprises, by due date.</p>
      </div>
      <Filters search={search} setSearch={setSearch} district={district} setDistrict={setDistrict}>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="open">Open</option>
          <option value="done">Done</option>
          <option value="all">All</option>
        </select>
        <select className={`${inputCls} w-auto`} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="">Queries & actions</option>
          <option value="sadp_query">SADP queries only</option>
          <option value="action">Actions only</option>
        </select>
        <select className={`${inputCls} w-auto`} value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">All owners</option>
          {owners.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </Filters>
      <div className="text-sm text-slate-500">
        {rows.length} item{rows.length === 1 ? '' : 's'}
        {overdue > 0 && <span className="font-semibold text-red-600"> · {overdue} overdue</span>}
      </div>
      {rows.length === 0 ? (
        <Empty>No items. Open an enterprise to add SADP queries or actions to its plan.</Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <ul className="divide-y">
            {rows.map(({ a, it }) => (
              <ActionLine key={a.id} a={a} it={it} canEdit={canEdit} onToggle={() => toggle(a)} onOpen={() => openItem(it.id)} today={today} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActionLine({ a, it, canEdit, onToggle, onOpen, today }: { a: ActionRow; it: Item; canEdit: boolean; onToggle: () => void; onOpen: () => void; today: string }) {
  const late = a.status === 'open' && a.due_date && a.due_date < today;
  return (
    <li className="flex items-start gap-3 px-4 py-2.5">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#006838]" checked={a.status === 'done'} disabled={!canEdit} onChange={onToggle} />
      <div className="min-w-0 flex-1">
        <div className={`text-sm ${a.status === 'done' ? 'text-slate-400 line-through' : ''}`}>
          {a.kind === 'sadp_query' && <span className="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-900">SADP query</span>}
          {a.description}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <button onClick={onOpen} className="font-medium text-brand hover:underline">
            {it.name}
          </button>
          <span>{it.district}</span>
          <StageChip stage={it.stage} size="sm" />
        </div>
      </div>
      <div className="shrink-0 text-right text-xs">
        <div className="font-medium text-slate-700">{a.owner || '—'}</div>
        <div className={late ? 'font-semibold text-red-600' : 'text-slate-500'}>{a.due_date ? `due ${fmtDate(a.due_date)}` : 'no due date'}</div>
      </div>
    </li>
  );
}
