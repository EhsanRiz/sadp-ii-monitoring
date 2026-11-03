import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { STAGE, type StageKey } from './stages';
import { toast } from '../components/ui';

export interface CatalogRow {
  enterprise_id: string;
  name: string;
  organisation_name: string | null;
  district: string | null;
  enterprise_type: string | null;
  community_council: string | null;
  phone: string | null;
}

export interface TrackingRow {
  id: string;
  enterprise_id: string | null;
  custom_name: string | null;
  custom_district: string | null;
  stage: StageKey;
  note: string | null;
  stage_since: string;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

export interface ActionRow {
  id: string;
  tracking_id: string;
  kind: 'sadp_query' | 'action';
  description: string;
  owner: string | null;
  due_date: string | null;
  status: 'open' | 'done';
  created_by: string | null;
  created_at: string;
  done_by: string | null;
  done_at: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_at: string | null;
}

export interface HistoryRow {
  id: number;
  tracking_id: string;
  from_stage: StageKey | null;
  to_stage: StageKey;
  note: string | null;
  changed_by: string | null;
  changed_at: string;
}

export interface MgpUser {
  id: string;
  auth_user_id: string | null;
  full_name: string;
  phone: string;
  role: 'super_admin' | 'admin' | 'member' | 'viewer';
  is_active: boolean;
  activated_at: string | null;
  created_at: string;
  pin_expires_at: string | null;
}

export interface Item extends TrackingRow {
  name: string;
  district: string;
  enterprise_type: string | null;
  community_council: string | null;
  phone: string | null;
  actions: ActionRow[];
  openActions: number;
  openQueries: number;
  nextDue: string | null;
}

interface DataCtx {
  loading: boolean;
  error: string | null;
  me: MgpUser | null;
  canEdit: boolean;
  isAdmin: boolean;
  catalog: CatalogRow[];
  items: Item[];
  itemById: Record<string, Item>;
  unplaced: CatalogRow[];
  history: HistoryRow[];
  users: MgpUser[];
  userName: (id: string | null) => string;
  baselineAt: string | null;
  live: boolean;
  reload: () => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

export function DataProvider({ authUserId, children }: { authUserId: string; children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [tracking, setTracking] = useState<TrackingRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [users, setUsers] = useState<MgpUser[]>([]);
  const [baselineAt, setBaselineAt] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [cat, tr, ac, hi, us, st] = await Promise.all([
      supabase.rpc('mgp_enterprise_catalog'),
      supabase.from('mgp_tracking').select('*'),
      supabase.from('mgp_actions').select('*').order('created_at'),
      supabase.from('mgp_stage_history').select('*').order('changed_at'),
      supabase
        .from('mgp_users')
        .select('id, auth_user_id, full_name, phone, role, is_active, activated_at, created_at, pin_expires_at')
        .order('full_name'),
      supabase.from('mgp_settings').select('*'),
    ]);
    const firstErr = [cat, tr, ac, hi, us, st].find((r) => r.error)?.error;
    if (firstErr) {
      setError(firstErr.message);
    } else {
      setError(null);
      setCatalog((cat.data ?? []) as CatalogRow[]);
      setTracking((tr.data ?? []) as TrackingRow[]);
      setActions((ac.data ?? []) as ActionRow[]);
      setHistory((hi.data ?? []) as HistoryRow[]);
      setUsers((us.data ?? []) as MgpUser[]);
      const b = (st.data ?? []).find((r: { key: string }) => r.key === 'baseline_at');
      setBaselineAt(b ? (b.value as string) : null);
    }
    setLoading(false);
  }, []);

  // ---- Realtime: any change by anyone refreshes every open screen within ~0.5s ----
  const [live, setLive] = useState(false);
  const pending = useRef<HistoryRow[]>([]);
  const pendingAssign = useRef<ActionRow[]>([]);
  const actionsRef = useRef<ActionRow[]>([]);
  actionsRef.current = actions;
  const timer = useRef<number | null>(null);
  const scheduleReload = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => reload(), 400); // batch bursts (e.g. bulk placing)
  }, [reload]);

  useEffect(() => {
    reload();
    const channel = supabase
      .channel('mgp-tracker-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mgp_tracking' }, scheduleReload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mgp_actions' }, (payload) => {
        const n = payload.new as ActionRow | undefined;
        const prev = n ? actionsRef.current.find((x) => x.id === n.id) : undefined;
        if (n?.assigned_to && n.status === 'open' && (!prev || prev.assigned_to !== n.assigned_to)) pendingAssign.current.push(n);
        scheduleReload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mgp_settings' }, scheduleReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mgp_stage_history' }, (payload) => {
        pending.current.push(payload.new as HistoryRow);
        scheduleReload();
      })
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') reload(); // catch anything missed while disconnected
      });
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    const t = window.setInterval(reload, 120_000); // safety net
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      window.clearInterval(t);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [reload, scheduleReload]);

  const value = useMemo<DataCtx>(() => {
    const catById = new Map(catalog.map((c) => [c.enterprise_id, c]));
    const actByTracking = new Map<string, ActionRow[]>();
    for (const a of actions) {
      const list = actByTracking.get(a.tracking_id) ?? [];
      list.push(a);
      actByTracking.set(a.tracking_id, list);
    }
    const items: Item[] = tracking
      .map((t) => {
        const c = t.enterprise_id ? catById.get(t.enterprise_id) : undefined;
        const acts = actByTracking.get(t.id) ?? [];
        const open = acts.filter((a) => a.status === 'open');
        const dues = open.map((a) => a.due_date).filter(Boolean).sort() as string[];
        return {
          ...t,
          name: c?.name ?? t.custom_name ?? '(unknown enterprise)',
          district: c?.district ?? t.custom_district ?? '—',
          enterprise_type: c?.enterprise_type ?? null,
          community_council: c?.community_council ?? null,
          phone: c?.phone ?? null,
          actions: acts,
          openActions: open.length,
          openQueries: open.filter((a) => a.kind === 'sadp_query').length,
          nextDue: dues[0] ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    const placed = new Set(tracking.map((t) => t.enterprise_id).filter(Boolean));
    const me = users.find((u) => u.auth_user_id === authUserId) ?? null;
    const nameById = new Map(users.map((u) => [u.id, u.full_name]));
    return {
      loading,
      error,
      me,
      canEdit: !!me && me.role !== 'viewer',
      isAdmin: !!me && (me.role === 'admin' || me.role === 'super_admin'),
      catalog,
      items,
      itemById: Object.fromEntries(items.map((i) => [i.id, i])),
      unplaced: catalog.filter((c) => !placed.has(c.enterprise_id)),
      history,
      users,
      userName: (id) => (id ? nameById.get(id) ?? 'Unknown' : '—'),
      baselineAt,
      live,
      reload,
    };
  }, [loading, error, catalog, tracking, actions, history, users, baselineAt, live, reload, authUserId]);

  // Tell people when a colleague assigns them an item.
  useEffect(() => {
    if (!pendingAssign.current.length || !value.me) return;
    const mine = pendingAssign.current.filter((a) => a.assigned_to === value.me!.id && a.assigned_by && a.assigned_by !== value.me!.id);
    pendingAssign.current = [];
    for (const a of mine.slice(0, 3)) {
      const ent = value.itemById[a.tracking_id]?.name;
      toast.ok(`🔔 ${value.userName(a.assigned_by).split(' ')[0]} assigned you: ${a.description}${ent ? ` (${ent})` : ''}`);
    }
    if (mine.length > 3) toast.ok(`🔔 ${mine.length - 3} more items assigned to you`);
  }, [value]);

  // Tell people when a colleague moves an enterprise (not for their own moves).
  useEffect(() => {
    if (!pending.current.length) return;
    const meId = value.me?.id;
    const ready = pending.current.filter((h) => value.itemById[h.tracking_id]);
    pending.current = pending.current.filter((h) => !value.itemById[h.tracking_id]).slice(-20);
    const others = ready.filter((h) => h.changed_by && h.changed_by !== meId);
    if (others.length > 3) {
      toast.ok(`${value.userName(others[0].changed_by)} updated ${others.length} enterprises`);
    } else {
      for (const h of others) {
        const who = value.userName(h.changed_by).split(' ')[0];
        const what = value.itemById[h.tracking_id].name;
        toast.ok(h.from_stage ? `${who} moved ${what} → ${STAGE[h.to_stage].short}` : `${who} placed ${what} in ${STAGE[h.to_stage].short}`);
      }
    }
  }, [value]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useData outside provider');
  return v;
}

/** Stage each tracking row was in at a point in time (null = not yet on the tracker). */
export function stagesAt(history: HistoryRow[], at: string): Map<string, StageKey> {
  const out = new Map<string, StageKey>();
  const cutoff = new Date(at).getTime();
  for (const h of history) {
    if (new Date(h.changed_at).getTime() <= cutoff) out.set(h.tracking_id, h.to_stage);
  }
  return out;
}

export function daysSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return String(e);
}
