import { useState } from 'react';
import { MessageSquareWarning, ListChecks, Clock } from 'lucide-react';
import { useData, daysSince, type Item } from '../lib/data';
import { STAGES, STAGE, DISTRICT_SHORT, type StageKey } from '../lib/stages';
import { changeStage } from '../lib/mutations';
import { useNav } from '../App';
import { Filters, matches } from './Filters';

export function Board() {
  const { items, canEdit, reload } = useData();
  const { openItem } = useNav();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<StageKey | null>(null);

  const shown = items.filter((i) => matches(i.name, search) && (!district || i.district === district));

  async function drop(stage: StageKey) {
    setOver(null);
    const it = items.find((i) => i.id === dragId);
    setDragId(null);
    if (!it || it.stage === stage) return;
    if (await changeStage(it.id, it.name, stage, null)) {
      await reload();
      if (stage === 'sadp_queries') openItem(it.id); // prompt to log the queries
    }
  }

  return (
    <div className="space-y-4">
      <Filters search={search} setSearch={setSearch} district={district} setDistrict={setDistrict}>
        {canEdit && <span className="hidden text-xs text-slate-500 lg:inline">Drag a card to another column to move it, or click a card to open it.</span>}
      </Filters>
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex min-w-max gap-3">
          {STAGES.map((s) => {
            const col = shown.filter((i) => i.stage === s.key);
            return (
              <div
                key={s.key}
                className={`flex w-64 shrink-0 flex-col rounded-xl border bg-slate-100/70 ${over === s.key ? 'ring-2 ring-brand' : ''}`}
                onDragOver={(e) => {
                  if (!canEdit) return;
                  e.preventDefault();
                  setOver(s.key);
                }}
                onDragLeave={() => setOver((o) => (o === s.key ? null : o))}
                onDrop={() => drop(s.key)}
              >
                <div className="sticky top-0 rounded-t-xl border-b bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className="ml-auto rounded-full bg-slate-100 px-2 text-xs font-semibold tabular-nums">{col.length}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {s.code} · {s.hint}
                  </div>
                </div>
                <div className="flex max-h-[calc(100vh-260px)] min-h-[120px] flex-col gap-2 overflow-y-auto p-2">
                  {col.map((it) => (
                    <Card key={it.id} it={it} draggable={canEdit} onDragStart={() => setDragId(it.id)} onClick={() => openItem(it.id)} />
                  ))}
                  {col.length === 0 && <div className="py-6 text-center text-xs text-slate-400">Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Card({ it, draggable, onDragStart, onClick }: { it: Item; draggable: boolean; onDragStart: () => void; onClick: () => void }) {
  const days = daysSince(it.stage_since);
  const overdue = it.nextDue && it.nextDue < new Date().toISOString().slice(0, 10);
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className={`cursor-pointer rounded-lg border bg-white p-2.5 shadow-sm transition hover:border-brand hover:shadow ${draggable ? 'active:cursor-grabbing' : ''}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 text-sm font-medium leading-snug">{it.name}</div>
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{DISTRICT_SHORT[it.district] ?? it.district}</span>
      </div>
      {it.enterprise_type && <div className="mt-0.5 truncate text-[11px] text-slate-500">{it.enterprise_type}</div>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="inline-flex items-center gap-1 text-slate-500" title={`In ${STAGE[it.stage].short} for ${days} days`}>
          <Clock size={11} /> {days}d
        </span>
        {it.openQueries > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900">
            <MessageSquareWarning size={11} /> {it.openQueries} quer{it.openQueries === 1 ? 'y' : 'ies'}
          </span>
        )}
        {it.openActions - it.openQueries > 0 && (
          <span className="inline-flex items-center gap-1 rounded bg-sky-100 px-1.5 py-0.5 font-medium text-sky-800">
            <ListChecks size={11} /> {it.openActions - it.openQueries}
          </span>
        )}
        {overdue && <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700">overdue</span>}
      </div>
      {it.note && <div className="mt-1.5 line-clamp-2 text-[11px] italic text-slate-500">“{it.note}”</div>}
    </div>
  );
}
