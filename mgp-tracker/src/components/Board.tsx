import { useState } from 'react';
import { MessageSquareWarning, ListChecks, Clock, Inbox } from 'lucide-react';
import { useData, daysSince, type Item, type CatalogRow } from '../lib/data';
import { STAGES, STAGE, DISTRICT_SHORT, type StageKey } from '../lib/stages';
import { changeStage, placeEnterprise } from '../lib/mutations';
import { useNav } from '../App';
import { Filters, matches } from './Filters';

// Drag payload: a tracking row id, or "cat:<enterprise_id>" for a not-yet-placed enterprise.
export function Board() {
  const { items, unplaced, canEdit, reload } = useData();
  const { openItem } = useNav();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<StageKey | null>(null);
  const [showUnplaced, setShowUnplaced] = useState(true);

  const shown = items.filter((i) => matches(i.name, search) && (!district || i.district === district));
  const shownUnplaced = unplaced.filter((c) => matches(c.name, search) && (!district || c.district === district));

  async function drop(stage: StageKey) {
    setOver(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    if (id.startsWith('cat:')) {
      const c = unplaced.find((u) => u.enterprise_id === id.slice(4));
      if (c && (await placeEnterprise(c.enterprise_id, c.name, stage))) await reload();
      return;
    }
    const it = items.find((i) => i.id === id);
    if (!it || it.stage === stage) return;
    if (await changeStage(it.id, it.name, stage, null)) {
      await reload();
      if (stage === 'sadp_queries') openItem(it.id); // prompt to log the queries
    }
  }

  return (
    <div className="space-y-4">
      <Filters search={search} setSearch={setSearch} district={district} setDistrict={setDistrict}>
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 accent-[#008C44]" checked={showUnplaced} onChange={(e) => setShowUnplaced(e.target.checked)} />
          Show not-yet-placed ({shownUnplaced.length})
        </label>
        {canEdit && <span className="hidden text-xs text-slate-500 xl:inline">Drag a card into a column to place or move it. Click a card to open it.</span>}
      </Filters>
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="flex min-w-max gap-3">
          {showUnplaced && (
            <div className="flex w-64 shrink-0 flex-col rounded-xl border border-dashed border-slate-300 bg-white/60">
              <div className="rounded-t-xl border-b bg-white px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Inbox size={14} className="text-fdbrown" />
                  <span className="text-sm font-semibold">Not yet placed</span>
                  <span className="ml-auto rounded-full bg-slate-100 px-2 text-xs font-semibold tabular-nums">{shownUnplaced.length}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-500">All enterprises from the SADP II list — drag into a stage</div>
              </div>
              <div className="flex max-h-[calc(100vh-270px)] min-h-[120px] flex-col gap-1.5 overflow-y-auto p-2">
                {shownUnplaced.map((c) => (
                  <UnplacedCard key={c.enterprise_id} c={c} draggable={canEdit} onDragStart={() => setDragId(`cat:${c.enterprise_id}`)} />
                ))}
                {shownUnplaced.length === 0 && <div className="py-6 text-center text-xs text-slate-400">All placed</div>}
              </div>
            </div>
          )}
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
                <div className="rounded-t-xl border-b bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className="ml-auto rounded-full bg-slate-100 px-2 text-xs font-semibold tabular-nums">{col.length}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {s.code} · {s.hint}
                  </div>
                </div>
                <div className="flex max-h-[calc(100vh-270px)] min-h-[120px] flex-col gap-2 overflow-y-auto p-2">
                  {col.map((it) => (
                    <Card key={it.id} it={it} draggable={canEdit} onDragStart={() => setDragId(it.id)} onClick={() => openItem(it.id)} />
                  ))}
                  {col.length === 0 && <div className="py-6 text-center text-xs text-slate-400">{canEdit ? 'Drop here' : 'Empty'}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function UnplacedCard({ c, draggable, onDragStart }: { c: CatalogRow; draggable: boolean; onDragStart: () => void }) {
  return (
    <div draggable={draggable} onDragStart={onDragStart} className={`rounded-md border bg-white px-2.5 py-1.5 ${draggable ? 'cursor-grab hover:border-brand active:cursor-grabbing' : ''}`}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 text-[13px] leading-snug">{c.name}</div>
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">{DISTRICT_SHORT[c.district ?? ''] ?? c.district}</span>
      </div>
      {c.enterprise_type && <div className="truncate text-[11px] text-slate-400">{c.enterprise_type}</div>}
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
        {it.actions.length > 0 && (
          <span
            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium ${it.openActions === 0 ? 'bg-brand-light text-brand-dark' : 'bg-fdblue-light text-sky-800'}`}
            title="Action plan items done"
          >
            <ListChecks size={11} /> {it.actions.length - it.openActions}/{it.actions.length}
          </span>
        )}
        {overdue && <span className="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700">overdue</span>}
      </div>
      {it.note && <div className="mt-1.5 line-clamp-2 text-[11px] italic text-slate-500">“{it.note}”</div>}
    </div>
  );
}
