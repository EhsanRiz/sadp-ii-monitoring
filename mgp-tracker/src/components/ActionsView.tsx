import { useMemo, useState } from 'react';
import { useData, fmtDate, errMsg, type ActionRow, type Item } from '../lib/data';
import { supabase } from '../lib/supabase';
import { useNav } from '../App';
import { Filters, matches } from './Filters';
import { Bell } from 'lucide-react';
import { Empty, StageChip, selectCls, toast } from './ui';
import { TaskRow, type Task } from './Tasks';

export function ActionsView() {
  const { items, canEdit, reload, users, me } = useData();
  const { openItem } = useNav();
  const [mode, setMode] = useState<'people' | 'list'>('people');
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Action plan</h2>
          <p className="text-sm text-slate-500">
            {mode === 'people' ? 'Open tasks against each person’s name. Assign items from an enterprise’s action plan.' : 'Every SADP query and action across all enterprises, by due date.'}
          </p>
        </div>
        <div className="flex rounded-md border border-slate-300 bg-white p-0.5 text-sm print:hidden">
          {(['people', 'list'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} className={`rounded px-3 py-1 ${mode === m ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              {m === 'people' ? 'By person' : 'All items'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'people' && (
        <PeopleBoard
          all={all}
          users={users.filter((u) => u.is_active)}
          meId={me?.id ?? null}
          canEdit={canEdit}
          search={search}
          setSearch={setSearch}
          district={district}
          setDistrict={setDistrict}
        />
      )}
      {mode === 'list' && (<>
      <Filters search={search} setSearch={setSearch} district={district} setDistrict={setDistrict}>
        <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="open">Open</option>
          <option value="done">Done</option>
          <option value="all">All</option>
        </select>
        <select className={selectCls} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          <option value="">Queries & actions</option>
          <option value="sadp_query">SADP queries only</option>
          <option value="action">Actions only</option>
        </select>
        <select className={selectCls} value={owner} onChange={(e) => setOwner(e.target.value)}>
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
      </>)}
    </div>
  );
}

function ActionLine({ a, it, canEdit, onToggle, onOpen, today }: { a: ActionRow; it: Item; canEdit: boolean; onToggle: () => void; onOpen: () => void; today: string }) {
  const late = a.status === 'open' && a.due_date && a.due_date < today;
  return (
    <li className="hover-row flex items-start gap-3 px-4 py-2.5">
      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#008C44]" checked={a.status === 'done'} disabled={!canEdit} onChange={onToggle} />
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

function PeopleBoard({
  all,
  users,
  meId,
  canEdit,
  search,
  setSearch,
  district,
  setDistrict,
}: {
  all: Task[];
  users: { id: string; full_name: string; role: string }[];
  meId: string | null;
  canEdit: boolean;
  search: string;
  setSearch: (s: string) => void;
  district: string;
  setDistrict: (d: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const open = all
    .filter((t) => t.a.status === 'open' && (!district || t.it.district === district) && (matches(t.it.name, search) || matches(t.a.description, search)))
    .sort((x, y) => (x.a.due_date ?? '9999').localeCompare(y.a.due_date ?? '9999'));
  const byUser = (id: string) => open.filter((t) => t.a.assigned_to === id);
  const unassigned = open.filter((t) => !t.a.assigned_to);
  const doneCount = (id: string) => all.filter((t) => t.a.assigned_to === id && t.a.status === 'done').length;
  // me first, then most open tasks
  const people = [...users].sort((a, b) => (a.id === meId ? -1 : b.id === meId ? 1 : byUser(b.id).length - byUser(a.id).length || a.full_name.localeCompare(b.full_name)));

  const Card = ({ title, sub, tasks, tickable, done }: { title: string; sub: string; tasks: Task[]; tickable: (t: Task) => boolean; done?: number }) => {
    const late = tasks.filter((t) => t.a.due_date && t.a.due_date < today).length;
    return (
      <div className="flex flex-col overflow-hidden rounded-xl border bg-white">
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{title}</div>
            <div className="text-[11px] text-slate-500">{sub}</div>
          </div>
          {late > 0 && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">{late} overdue</span>}
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${tasks.length ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`} title="Open tasks">
            <Bell size={12} /> {tasks.length}
          </span>
        </div>
        {tasks.length === 0 ? (
          <p className="px-4 py-4 text-xs text-slate-400">No open tasks{done ? ` · ${done} done` : ''}</p>
        ) : (
          <ul className="max-h-[420px] divide-y overflow-y-auto">
            {tasks.map((t) => (
              <TaskRow key={t.a.id} t={t} canTick={tickable(t)} compact />
            ))}
          </ul>
        )}
        {tasks.length > 0 && !!done && <div className="border-t px-4 py-1.5 text-[11px] text-slate-400">{done} done so far</div>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Filters search={search} setSearch={setSearch} district={district} setDistrict={setDistrict} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {people.map((u) => (
          <Card
            key={u.id}
            title={`${u.full_name}${u.id === meId ? ' (you)' : ''}`}
            sub={u.role.replace('_', ' ')}
            tasks={byUser(u.id)}
            done={doneCount(u.id)}
            tickable={() => canEdit || u.id === meId}
          />
        ))}
        {unassigned.length > 0 && <Card title="Not assigned to a registered user" sub="assign from the enterprise’s action plan" tasks={unassigned} tickable={() => canEdit} />}
      </div>
    </div>
  );
}
