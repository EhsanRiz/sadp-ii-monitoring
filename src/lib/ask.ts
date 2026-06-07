/**
 * Hooks for "Ask the data" — Layer 1 (curated library).
 *
 * Every query goes through the run_safe_query() Postgres RPC (migration 280)
 * which validates SELECT-only, applies a 5-second statement timeout, and
 * bounds the result set to 500 rows. SECURITY INVOKER on the RPC means the
 * caller's RLS scoping applies automatically — a 4D field supervisor only
 * sees 4D data, etc.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface AskQueryResult {
  rows: Record<string, unknown>[];
  /** Column key order as returned by Postgres (best-effort — Postgres jsonb_agg
   *  doesn't promise order, so we derive from the union of keys in the first
   *  few rows). */
  columns: string[];
  /** Wall-clock time in ms. */
  duration_ms: number;
}

export function useRunCuratedQuery() {
  return useMutation({
    mutationFn: async (sql: string): Promise<AskQueryResult> => {
      const t0 = performance.now();
      const { data, error } = await supabase.rpc('run_safe_query', { p_sql: sql });
      const duration_ms = Math.round(performance.now() - t0);
      if (error) throw error;
      const rows = (data ?? []) as Record<string, unknown>[];
      const colSet = new Set<string>();
      for (const r of rows.slice(0, 10)) {
        for (const k of Object.keys(r)) colSet.add(k);
      }
      return { rows, columns: Array.from(colSet), duration_ms };
    },
  });
}

/** Format a value for display in the results table. */
export function formatCell(
  value: unknown,
  format?: 'number' | 'currency' | 'percent' | 'date' | 'datetime' | 'text',
): string {
  if (value === null || value === undefined) return '—';
  if (format === 'currency') {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return 'M ' + Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
  }
  if (format === 'percent') {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return n.toFixed(1) + '%';
  }
  if (format === 'number') {
    const n = Number(value);
    if (Number.isNaN(n)) return String(value);
    return n.toLocaleString('en-US');
  }
  if (format === 'date') {
    try {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch { return String(value); }
  }
  if (format === 'datetime') {
    try {
      const d = new Date(String(value));
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString();
    } catch { return String(value); }
  }
  return String(value);
}

/** Convert a result set into a CSV string. */
export function rowsToCsv(
  rows: Record<string, unknown>[],
  columns: { key: string; label: string }[],
): string {
  const header = columns.map((c) => csvCell(c.label)).join(',');
  const body = rows.map((r) =>
    columns.map((c) => csvCell(r[c.key])).join(','),
  ).join('\n');
  return header + '\n' + body;
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
