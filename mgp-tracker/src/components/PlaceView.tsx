import { useState, type FormEvent } from 'react';
import { useData, errMsg } from '../lib/data';
import { supabase } from '../lib/supabase';
import { DISTRICTS, STAGES, STAGE, type StageKey } from '../lib/stages';
import { Filters, matches } from './Filters';
import { Button, Empty, inputCls, toast } from './ui';

export function PlaceView() {
  const { unplaced, catalog, items, isAdmin, reload } = useData();
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState<StageKey>('with_isp');
  const [busy, setBusy] = useState(false);

  const shown = unplaced.filter((c) => (matches(c.name, search) || matches(c.organisation_name ?? '', search)) && (!district || c.district === district));
  const allShownSelected = shown.length > 0 && shown.every((c) => selected.has(c.enterprise_id));

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleAll() {
    setSelected((s) => {
      const n = new Set(s);
      if (allShownSelected) shown.forEach((c) => n.delete(c.enterprise_id));
      else shown.forEach((c) => n.add(c.enterprise_id));
      return n;
    });
  }

  async function place() {
    if (!selected.size) return;
    setBusy(true);
    const { error } = await supabase.from('mgp_tracking').insert([...selected].map((enterprise_id) => ({ enterprise_id, stage })));
    setBusy(false);
    if (error) return toast.err(errMsg(error));
    toast.ok(`${selected.size} enterprise${selected.size === 1 ? '' : 's'} placed in ${STAGE[stage].short}`);
    setSelected(new Set());
    reload();
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Add enterprises to the tracker</h2>
        <p className="text-sm text-slate-500">
          {catalog.length - unplaced.length} of {catalog.length} enterprises from the SADP II enterprise list are on the tracker
          {items.some((i) => !i.enterprise_id) && <> (plus {items.filter((i) => !i.enterprise_id).length} added manually)</>}. Tick the ones that are in the same stage, pick the stage, and place them together.
        </p>
      </div>

      <div className="sticky top-[57px] z-20 flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3 shadow-sm">
        <span className="text-sm font-medium">{selected.size} selected → place in</span>
        <select className={`${inputCls} w-auto`} value={stage} onChange={(e) => setStage(e.target.value as StageKey)}>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.code}. {s.label}
            </option>
          ))}
        </select>
        <Button onClick={place} disabled={!selected.size || busy}>
          {busy ? 'Placing…' : `Place ${selected.size || ''}`}
        </Button>
        {selected.size > 0 && (
          <Button variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        )}
      </div>

      <Filters search={search} setSearch={setSearch} district={district} setDistrict={setDistrict} />

      {unplaced.length === 0 ? (
        <Empty>All enterprises are on the tracker.</Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white">
          <label className="flex cursor-pointer items-center gap-3 border-b bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <input type="checkbox" className="h-4 w-4 accent-[#006838]" checked={allShownSelected} onChange={toggleAll} />
            Select all shown ({shown.length})
          </label>
          <ul className="max-h-[60vh] divide-y overflow-y-auto">
            {shown.map((c) => (
              <li key={c.enterprise_id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-brand-light/40">
                  <input type="checkbox" className="h-4 w-4 accent-[#006838]" checked={selected.has(c.enterprise_id)} onChange={() => toggle(c.enterprise_id)} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-slate-500">{[c.enterprise_type, c.community_council].filter(Boolean).join(' · ')}</div>
                  </div>
                  <span className="text-xs text-slate-500">{c.district}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && <AddCustom onDone={reload} />}
    </div>
  );
}

function AddCustom({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [district, setDistrict] = useState<string>('Maseru');
  const [stage, setStage] = useState<StageKey>('with_isp');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('mgp_tracking').insert({ custom_name: name.trim(), custom_district: district, stage });
    setBusy(false);
    if (error) return toast.err(errMsg(error));
    toast.ok(`${name} added`);
    setName('');
    onDone();
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-dashed bg-white p-4">
      <div className="mb-2 text-sm font-semibold">Enterprise not in the list?</div>
      <p className="mb-3 text-xs text-slate-500">Admins can add an enterprise that is missing from the SADP II enterprise list (e.g. to reach the 166 on the board).</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <input className={inputCls} placeholder="Enterprise name" value={name} onChange={(e) => setName(e.target.value)} required />
        <select className={inputCls} value={district} onChange={(e) => setDistrict(e.target.value)}>
          {DISTRICTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value as StageKey)}>
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.short}
            </option>
          ))}
        </select>
        <Button disabled={busy || !name.trim()}>Add</Button>
      </div>
    </form>
  );
}
