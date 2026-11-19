/**
 * "Updates in the admin" (adjustment point 1):
 *   - UpdatesBanner: a "N updates since your last visit" indicator, counting
 *     movements and contribution changes since the viewer last marked seen.
 *   - ContributionChanges: an admin log of edits to contract & fund amounts
 *     (what changed, by whom, when), fed by the mgp_finance_log trigger.
 */
import { useMemo, useState } from 'react';
import { Bell, Check, FileEdit } from 'lucide-react';
import { useData, fmtDateTime } from '../lib/data';
import { formatLslShort } from '../lib/stage-finances';
import { ExpandableList } from './ExpandableList';

const SEEN_KEY = 'mgp_seen_at';

const FIELD_LABEL: Record<string, string> = {
  farmer_contract_lsl: 'Farmer contract',
  farmer_contributed_lsl: 'Farmer contributed',
  sadp_contract_lsl: 'SADP contract',
  sadp_contributed_lsl: 'SADP contributed',
  funds_allocated_lsl: 'Funds allocated',
  funds_depleted_lsl: 'Funds depleted',
};

function fmtAmt(v: string | null): string {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return Number.isFinite(n) ? formatLslShort(n) : v;
}

/** Last-seen time (ms). Defaults to now on first visit, so nothing shows as "new" initially. */
function readSeenMs(): number {
  try {
    const s = localStorage.getItem(SEEN_KEY);
    if (s) return new Date(s).getTime();
  } catch {
    /* storage unavailable */
  }
  const now = new Date().toISOString();
  try {
    localStorage.setItem(SEEN_KEY, now);
  } catch {
    /* ignore */
  }
  return new Date(now).getTime();
}

export function UpdatesBanner() {
  const { history, financeLog } = useData();
  const [seenMs, setSeenMs] = useState(readSeenMs);

  const newCount = useMemo(() => {
    const h = history.filter((x) => new Date(x.changed_at).getTime() > seenMs).length;
    const f = financeLog.filter((x) => new Date(x.changed_at).getTime() > seenMs).length;
    return h + f;
  }, [history, financeLog, seenMs]);

  if (newCount === 0) return null;

  const markSeen = () => {
    const now = new Date().toISOString();
    try {
      localStorage.setItem(SEEN_KEY, now);
    } catch {
      /* ignore */
    }
    setSeenMs(new Date(now).getTime());
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-fdblue/30 bg-fdblue-light/60 px-4 py-2.5 text-sm print:hidden">
      <Bell size={15} className="text-sky-700" />
      <span className="text-sky-900">
        <b className="tabular-nums">{newCount}</b> update{newCount === 1 ? '' : 's'} since your last visit
      </span>
      <button onClick={markSeen} className="ml-auto inline-flex items-center gap-1 rounded-md border border-sky-300 bg-white px-2 py-1 text-xs font-medium text-sky-800 transition hover:bg-sky-50">
        <Check size={13} /> Mark as seen
      </button>
    </div>
  );
}

export function ContributionChanges() {
  const { financeLog, itemById, userName, isAdmin } = useData();
  if (!isAdmin || financeLog.length === 0) return null;

  return (
    <div className="rounded-xl border bg-white print:hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <FileEdit size={15} className="text-brand" />
        <h3 className="text-sm font-semibold">Contribution changes</h3>
        <span className="text-xs text-slate-500">recent edits to contract &amp; fund amounts</span>
      </div>
      <ExpandableList
        items={financeLog.map((r) => {
          const name = itemById[r.tracking_id]?.name ?? '(enterprise)';
          const label = FIELD_LABEL[r.field] ?? r.field;
          return (
            <li key={r.id} className="flex items-start gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="truncate font-medium">{name}</span>
                  <span className="text-xs text-slate-400">
                    {r.stage ? `${r.stage.toUpperCase()} · ` : ''}
                    {label}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  <span className="tabular-nums">{fmtAmt(r.old_value)}</span> → <span className="font-medium tabular-nums text-slate-700">{fmtAmt(r.new_value)}</span>
                </div>
              </div>
              <div className="shrink-0 text-right text-[11px] leading-tight text-slate-400">
                {userName(r.changed_by)}
                <br />
                {fmtDateTime(r.changed_at)}
              </div>
            </li>
          );
        })}
      />
    </div>
  );
}
