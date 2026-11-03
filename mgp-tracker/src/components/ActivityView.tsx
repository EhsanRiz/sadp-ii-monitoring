import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowRight, Download } from 'lucide-react';
import { useData } from '../lib/data';
import { STAGE } from '../lib/stages';
import { useNav } from '../App';
import { Filters, matches } from './Filters';
import { Button, Empty, StageChip, inputCls, selectCls } from './ui';

type Kind = 'move' | 'placed' | 'query' | 'action' | 'done';
interface Event {
  key: string;
  at: string;
  who: string;
  whoId: string | null;
  trackingId: string;
  enterprise: string;
  district: string;
  kind: Kind;
  from: string | null; // stage key
  to: string | null; // stage key
  detail: string;
}
type SortKey = 'at' | 'who' | 'enterprise' | 'district' | 'kind';

const KIND_LABEL: Record<Kind, string> = {
  placed: 'Placed',
  move: 'Moved',
  query: 'SADP query added',
  action: 'Action added',
  done: 'Item done',
};

export function ActivityView() {
  const { history, items, itemById, users, userName } = useData();
  const { openItem } = useNav();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [who, setWho] = useState('');
  const [type, setType] = useState<'stage' | 'all' | 'plan'>('stage');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'at', dir: 'desc' });

  const events = useMemo<Event[]>(() => {
    const out: Event[] = [];
    for (const h of history) {
      const it = itemById[h.tracking_id];
      if (!it) continue;
      out.push({
        key: `h${h.id}`,
        at: h.changed_at,
        who: userName(h.changed_by),
        whoId: h.changed_by,
        trackingId: h.tracking_id,
        enterprise: it.name,
        district: it.district,
        kind: h.from_stage ? 'move' : 'placed',
        from: h.from_stage,
        to: h.to_stage,
        detail: h.note ?? '',
      });
    }
    for (const it of items) {
      for (const a of it.actions) {
        out.push({
          key: `a${a.id}`,
          at: a.created_at,
          who: userName(a.created_by),
          whoId: a.created_by,
          trackingId: it.id,
          enterprise: it.name,
          district: it.district,
          kind: a.kind === 'sadp_query' ? 'query' : 'action',
          from: null,
          to: null,
          detail: `${a.description}${a.owner ? ` — owner: ${a.owner}` : ''}${a.due_date ? ` — due ${a.due_date}` : ''}`,
        });
        if (a.status === 'done' && a.done_at) {
          out.push({
            key: `d${a.id}`,
            at: a.done_at,
            who: userName(a.done_by),
            whoId: a.done_by,
            trackingId: it.id,
            enterprise: it.name,
            district: it.district,
            kind: 'done',
            from: null,
            to: null,
            detail: a.description,
          });
        }
      }
    }
    return out;
  }, [history, items, itemById, userName]);

  const shown = useMemo(() => {
    const f = events.filter((e) => {
      if (type === 'stage' && !(e.kind === 'move' || e.kind === 'placed')) return false;
      if (type === 'plan' && (e.kind === 'move' || e.kind === 'placed')) return false;
      if (who && e.whoId !== who) return false;
      if (district && e.district !== district) return false;
      const day = localDay(e.at);
      if (from && day < from) return false;
      if (to && day > to) return false;
      return matches(e.enterprise, search) || matches(e.detail, search) || matches(e.who, search);
    });
    const dir = sort.dir === 'asc' ? 1 : -1;
    return f.sort((a, b) => {
      const va = sort.key === 'kind' ? KIND_LABEL[a.kind] : a[sort.key];
      const vb = sort.key === 'kind' ? KIND_LABEL[b.kind] : b[sort.key];
      const c = String(va).localeCompare(String(vb));
      return c !== 0 ? c * dir : b.at.localeCompare(a.at);
    });
  }, [events, type, who, district, from, to, search, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'at' ? 'desc' : 'asc' }));
  }

  function exportCsv() {
    const head = ['Date', 'Time', 'By', 'Enterprise', 'District', 'Event', 'From', 'To', 'Details / note'];
    const rows = shown.map((e) => {
      const d = new Date(e.at);
      return [
        localDay(e.at),
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        e.who,
        e.enterprise,
        e.district,
        KIND_LABEL[e.kind],
        e.from ? STAGE[e.from as keyof typeof STAGE].label : '',
        e.to ? STAGE[e.to as keyof typeof STAGE].label : '',
        e.detail,
      ];
    });
    const csv = [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MGP_M1_activity_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const Th = ({ k, children, className = '' }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <th className={`px-3 py-2.5 ${className}`}>
      <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 uppercase tracking-wide hover:text-brand-dark">
        {children}
        {sort.key === k ? sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : <ArrowUpDown size={12} className="opacity-40" />}
      </button>
    </th>
  );

  const people = users.filter((u) => events.some((e) => e.whoId === u.id));

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold">Activity log</h2>
        <p className="text-sm text-slate-500">Who moved which enterprise, from where to where, and when. Click a column heading to sort. Updates live.</p>
      </div>

      <Filters search={search} setSearch={setSearch} district={district} setDistrict={setDistrict}>
        <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="stage">Stage moves</option>
          <option value="plan">Action plan changes</option>
          <option value="all">Everything</option>
        </select>
        <select className={selectCls} value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">Everyone</option>
          {people.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="date" className={`${inputCls} w-[150px]`} value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
          <span>to</span>
          <input type="date" className={`${inputCls} w-[150px]`} value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
          {(from || to) && (
            <button className="text-xs text-brand hover:underline" onClick={() => { setFrom(''); setTo(''); }}>
              clear
            </button>
          )}
        </div>
        <Button variant="secondary" className="ml-auto" onClick={exportCsv}>
          <Download size={15} /> Excel (CSV)
        </Button>
      </Filters>

      <div className="text-sm text-slate-500">
        {shown.length} record{shown.length === 1 ? '' : 's'}
      </div>

      {shown.length === 0 ? (
        <Empty>No activity yet{events.length ? ' for these filters' : ''}.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <Th k="at">Date &amp; time</Th>
                <Th k="who">By</Th>
                <Th k="enterprise">Enterprise</Th>
                <Th k="district">District</Th>
                <Th k="kind">Event</Th>
                <th className="px-3 py-2.5 uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((e) => (
                <tr key={e.key} className="align-top">
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                    <div>{new Date(e.at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div className="text-xs text-slate-500">{new Date(e.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{e.who}</td>
                  <td className="px-3 py-2">
                    <button className="text-left font-medium text-brand hover:underline" onClick={() => openItem(e.trackingId)}>
                      {e.enterprise}
                    </button>
                  </td>
                  <td className="px-3 py-2">{e.district}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-600">{KIND_LABEL[e.kind]}</td>
                  <td className="px-3 py-2">
                    {(e.kind === 'move' || e.kind === 'placed') && e.to ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {e.from && (
                          <>
                            <StageChip stage={e.from as keyof typeof STAGE} size="sm" />
                            <ArrowRight size={13} className="text-slate-400" />
                          </>
                        )}
                        <StageChip stage={e.to as keyof typeof STAGE} size="sm" />
                      </div>
                    ) : null}
                    {e.detail && <div className={`text-xs ${e.kind === 'move' || e.kind === 'placed' ? 'mt-1 italic text-slate-500' : 'text-slate-700'}`}>{e.detail}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function localDay(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
