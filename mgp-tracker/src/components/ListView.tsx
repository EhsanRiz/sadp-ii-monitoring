import { useEffect, useMemo, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useData, daysSince, fmtDate, type Item, type CatalogRow } from '../lib/data';
import { STAGES, STAGE, type StageKey } from '../lib/stages';
import { placeEnterprise } from '../lib/mutations';
import { useNav } from '../App';
import { Filters, matches } from './Filters';
import { Button, StageChip, Empty, selectCls } from './ui';

type StageFilter = '' | StageKey | 'pending' | 'with_4d' | 'unplaced';
const GROUPS: Record<'pending' | 'with_4d', StageKey[]> = {
  pending: ['sadp_queries', 'under_review', 'with_isp', 'blocked_infra', 'withdrawn'],
  with_4d: ['sadp_queries', 'under_review'],
};

type Row = { kind: 'placed'; name: string; district: string; it: Item } | { kind: 'unplaced'; name: string; district: string; c: CatalogRow };

export function ListView() {
  const { items, unplaced, canEdit, reload } = useData();
  const { listFilter, openItem } = useNav();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState(listFilter.district ?? '');
  const [stage, setStage] = useState<StageFilter>(listFilter.stage ?? '');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    setDistrict(listFilter.district ?? '');
    setStage(listFilter.stage ?? '');
  }, [listFilter]);

  const rows = useMemo<Row[]>(() => {
    const all: Row[] = [
      ...items.map((it) => ({ kind: 'placed' as const, name: it.name, district: it.district, it })),
      ...unplaced.map((c) => ({ kind: 'unplaced' as const, name: c.name, district: c.district ?? '—', c })),
    ];
    return all.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, unplaced]);

  const inStage = (r: Row) => {
    if (!stage) return true;
    if (stage === 'unplaced') return r.kind === 'unplaced';
    if (r.kind === 'unplaced') return false;
    return stage === 'pending' || stage === 'with_4d' ? GROUPS[stage].includes(r.it.stage) : r.it.stage === stage;
  };
  const shown = rows.filter((r) => matches(r.name, search) && (!district || r.district === district) && inStage(r));
  const nUnplaced = shown.filter((r) => r.kind === 'unplaced').length;

  async function place(c: CatalogRow, s: StageKey) {
    setBusyId(c.enterprise_id);
    if (await placeEnterprise(c.enterprise_id, c.name, s)) await reload();
    setBusyId(null);
  }

  function exportCsv() {
    const head = ['Enterprise', 'District', 'Type', 'Community council', 'Stage', 'Whiteboard ref', 'In stage since', 'Days in stage', 'Open SADP queries', 'Open actions', 'Next due', 'Note', 'Open items'];
    const lines = shown.map((r) => {
      if (r.kind === 'unplaced') return [r.name, r.district, r.c.enterprise_type ?? '', r.c.community_council ?? '', 'Not yet placed', '', '', '', '', '', '', '', ''];
      const i = r.it;
      return [
        i.name,
        i.district,
        i.enterprise_type ?? '',
        i.community_council ?? '',
        STAGE[i.stage].label,
        STAGE[i.stage].code,
        fmtDate(i.stage_since),
        String(daysSince(i.stage_since)),
        String(i.openQueries),
        String(i.openActions - i.openQueries),
        i.nextDue ?? '',
        i.note ?? '',
        i.actions
          .filter((a) => a.status === 'open')
          .map((a) => `${a.kind === 'sadp_query' ? '[Query] ' : ''}${a.description}${a.owner ? ` (${a.owner})` : ''}${a.due_date ? ` due ${a.due_date}` : ''}`)
          .join(' | '),
      ];
    });
    const csv = [head, ...lines].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MGP_M1_tracker_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const stageLabel =
    stage === 'pending' ? '3. Pending' : stage === 'with_4d' ? '3(a) With 4D' : stage === 'unplaced' ? 'Not yet placed' : stage ? STAGE[stage].label : '';

  return (
    <div className="space-y-4">
      <Filters search={search} setSearch={setSearch} district={district} setDistrict={setDistrict}>
        <select className={selectCls} value={stage} onChange={(e) => setStage(e.target.value as StageFilter)}>
          <option value="">All enterprises</option>
          <option value="unplaced">Not yet placed</option>
          <option value="with_4d">3(a) With 4D (all)</option>
          <option value="pending">3. Pending (all)</option>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.code}. {s.label}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" onClick={exportCsv}>
            <Download size={15} /> Excel (CSV)
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </Button>
        </div>
      </Filters>

      <div className="text-sm text-slate-500">
        {shown.length} enterprise{shown.length === 1 ? '' : 's'}
        {stageLabel && <> · {stageLabel}</>}
        {district && <> · {district}</>}
        {nUnplaced > 0 && canEdit && (
          <span className="ml-1 text-fdbrown">
            · {nUnplaced} not yet placed — choose a stage in the <b>Stage</b> column to place one
          </span>
        )}
      </div>

      {shown.length === 0 ? (
        <Empty>No enterprises match.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Enterprise</th>
                <th className="px-3 py-2.5">District</th>
                <th className="px-3 py-2.5">Stage</th>
                <th className="px-3 py-2.5 text-right">Days</th>
                <th className="px-3 py-2.5">Open items</th>
                <th className="px-3 py-2.5">Next due</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((r, n) => {
                if (r.kind === 'unplaced') {
                  const c = r.c;
                  return (
                    <tr key={c.enterprise_id} className="align-top">
                      <td className="px-3 py-2 tabular-nums text-slate-400">{n + 1}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-slate-500">{[c.enterprise_type, c.community_council].filter(Boolean).join(' · ')}</div>
                      </td>
                      <td className="px-3 py-2">{r.district}</td>
                      <td className="px-3 py-2">
                        {canEdit ? (
                          <select
                            className="rounded-md border border-dashed border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:border-brand focus:border-brand focus:outline-none"
                            value=""
                            disabled={busyId === c.enterprise_id}
                            onChange={(e) => e.target.value && place(c, e.target.value as StageKey)}
                          >
                            <option value="">{busyId === c.enterprise_id ? 'Placing…' : 'Not placed — place in…'}</option>
                            {STAGES.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.code}. {s.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs italic text-slate-400">Not yet placed</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-300">—</td>
                      <td className="px-3 py-2 text-slate-300">—</td>
                      <td className="px-3 py-2 text-slate-300">—</td>
                    </tr>
                  );
                }
                const i = r.it;
                const open = i.actions.filter((a) => a.status === 'open');
                return (
                  <tr key={i.id} className="cursor-pointer align-top hover:bg-brand-light/50" onClick={() => openItem(i.id)}>
                    <td className="px-3 py-2 tabular-nums text-slate-400">{n + 1}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{i.name}</div>
                      <div className="text-xs text-slate-500">{[i.enterprise_type, i.community_council].filter(Boolean).join(' · ')}</div>
                      {i.note && <div className="mt-0.5 text-xs italic text-slate-500">“{i.note}”</div>}
                    </td>
                    <td className="px-3 py-2">{i.district}</td>
                    <td className="px-3 py-2">
                      <StageChip stage={i.stage} size="sm" />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{daysSince(i.stage_since)}</td>
                    <td className="max-w-xs px-3 py-2 text-xs">
                      {open.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <ul className="space-y-0.5">
                          {open.slice(0, 3).map((a) => (
                            <li key={a.id}>
                              {a.kind === 'sadp_query' && <b className="text-amber-700">Query: </b>}
                              {a.description}
                              {a.owner && <span className="text-slate-500"> — {a.owner}</span>}
                            </li>
                          ))}
                          {open.length > 3 && <li className="text-slate-500">+{open.length - 3} more</li>}
                        </ul>
                      )}
                    </td>
                    <td className={`whitespace-nowrap px-3 py-2 text-xs ${i.nextDue && i.nextDue < new Date().toISOString().slice(0, 10) ? 'font-semibold text-red-600' : ''}`}>{fmtDate(i.nextDue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
