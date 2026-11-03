import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useData, daysSince, fmtDate, type Item } from '../lib/data';
import { STAGES, STAGE, type StageKey } from '../lib/stages';
import { useNav } from '../App';
import { Filters, matches } from './Filters';
import { Button, StageChip, Empty, inputCls } from './ui';

type StageFilter = '' | StageKey | 'pending' | 'with_4d';
const GROUPS: Record<'pending' | 'with_4d', StageKey[]> = {
  pending: ['sadp_queries', 'under_review', 'with_isp', 'blocked_infra', 'withdrawn'],
  with_4d: ['sadp_queries', 'under_review'],
};

export function ListView() {
  const { items } = useData();
  const { listFilter, openItem } = useNav();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState(listFilter.district ?? '');
  const [stage, setStage] = useState<StageFilter>(listFilter.stage ?? '');

  useEffect(() => {
    setDistrict(listFilter.district ?? '');
    setStage(listFilter.stage ?? '');
  }, [listFilter]);

  const inStage = (i: Item) => !stage || (stage === 'pending' || stage === 'with_4d' ? GROUPS[stage].includes(i.stage) : i.stage === stage);
  const shown = items.filter((i) => matches(i.name, search) && (!district || i.district === district) && inStage(i));

  function exportCsv() {
    const head = ['Enterprise', 'District', 'Type', 'Community council', 'Stage', 'Whiteboard ref', 'In stage since', 'Days in stage', 'Open SADP queries', 'Open actions', 'Next due', 'Note', 'Open items'];
    const rows = shown.map((i) => [
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
    ]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `MGP_M1_tracker_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      <Filters search={search} setSearch={setSearch} district={district} setDistrict={setDistrict}>
        <select className={`${inputCls} w-auto`} value={stage} onChange={(e) => setStage(e.target.value as StageFilter)}>
          <option value="">All stages</option>
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
        {stage && <> · {stage === 'pending' ? '3. Pending' : stage === 'with_4d' ? '3(a) With 4D' : STAGE[stage].label}</>}
        {district && <> · {district}</>}
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
              {shown.map((i, n) => {
                const open = i.actions.filter((a) => a.status === 'open');
                return (
                  <tr key={i.id} className="cursor-pointer align-top hover:bg-brand-light/40" onClick={() => openItem(i.id)}>
                    <td className="px-3 py-2 text-slate-400 tabular-nums">{n + 1}</td>
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
