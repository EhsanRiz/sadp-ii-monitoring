/**
 * M1 Cashbook spreadsheet-style line-item editor.
 *
 * One row per cash transaction during the Milestone 1 period:
 *   Date · Item · Budget code · Supplier · Description · Credit · Debit · (auto Balance)
 *
 * Computed-but-not-stored columns visible to the user:
 *   - per-row running Balance
 *   - footer Σ Credits / Σ Debits / Closing Balance
 *   - per-budget-code spend breakdown
 *
 * The form deliberately doesn't enforce that Credit XOR Debit is zero — the
 * user can submit a row with both zero (a memo row) but a per-row warning
 * lights up if both are > 0, which is almost always a typo.
 */
import { useEffect, useId, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Plus, Trash2, BookOpen, AlertTriangle } from 'lucide-react';
import {
  blankEntry,
  CASHBOOK_COLUMNS,
  computeRunningAccum,
  computeBudgetBalances,
  computeBudgetCodeSpend,
  computeCashbookTotals,
  computeRunningBalances,
  type M1CashbookEntry,
  type M1CashbookResponses,
} from '@/forms/m1CashbookSchema';

interface Props {
  responses: M1CashbookResponses;
  onChange: (next: M1CashbookResponses) => void;
  readOnly?: boolean;
}

/**
 * DD/MM/YYYY text date input. Native <input type="date"> follows the browser
 * locale (MM/DD/YYYY in US, DD/MM/YYYY in GB, etc.) and there's no portable
 * way to force a single format. Lesotho uses DD/MM/YYYY everywhere on paper,
 * so we render a plain text input that:
 *   - displays the date as DD/MM/YYYY
 *   - accepts DD/MM/YYYY as typed input
 *   - stores ISO yyyy-mm-dd in the underlying data via onChange
 *   - commits on blur (so half-typed values don't churn the running balance)
 */
function isoToDmy(iso: string | undefined | null): string {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}
function dmyToIso(dmy: string): string | null {
  // Accept dd/mm/yyyy, d/m/yyyy, dd-mm-yyyy, etc.
  const m = /^\s*(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\s*$/.exec(dmy);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const mon = Number(mm);
  if (day < 1 || day > 31 || mon < 1 || mon > 12) return null;
  return `${yyyy}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface DmyDateInputProps {
  value: string;   // ISO yyyy-mm-dd
  onChange: (iso: string) => void;
  disabled?: boolean;
  className?: string;
}
function DmyDateInput({ value, onChange, disabled, className }: DmyDateInputProps) {
  const [draft, setDraft] = useState(() => isoToDmy(value));
  // Sync from outside (e.g. after extraction populates the row).
  useEffect(() => { setDraft(isoToDmy(value)); }, [value]);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed === '') { onChange(''); return; }
    const iso = dmyToIso(trimmed);
    if (iso) { onChange(iso); setDraft(isoToDmy(iso)); }
    else {
      // Invalid input — revert display to last good value but don't change
      // stored data. The user can re-type.
      setDraft(isoToDmy(value));
    }
  };
  return (
    <Input
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/yyyy"
      pattern="\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={className}
    />
  );
}

/** Stable-enough id without pulling in uuid: 16 hex chars from crypto.getRandomValues. */
function makeId(): string {
  const buf = new Uint8Array(8);
  (globalThis.crypto ?? (globalThis as { msCrypto?: Crypto }).msCrypto)?.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function M1CashbookFormRenderer({ responses, onChange, readOnly = false }: Props) {
  const reactId = useId();
  const opening = responses.opening_balance ?? 0;
  const openingDate = responses.opening_balance_date ?? '';
  const entries = responses.entries ?? [];

  const balances = useMemo(() => computeRunningBalances(entries, opening), [entries, opening]);
  const accums = useMemo(() => computeRunningAccum(entries), [entries]);
  // Budget Balance column is empty by default (no planned-per-code map wired
  // from Financial Report yet). Passing an empty map yields NaN for every
  // row, which we render as a blank cell — matches the printed form
  // behaviour where the column exists for layout but isn't filled in.
  const budgetBalances = useMemo(
    () => computeBudgetBalances(entries, new Map<string, number>()),
    [entries],
  );
  const totals = useMemo(() => computeCashbookTotals(entries, opening), [entries, opening]);
  const byCode = useMemo(() => computeBudgetCodeSpend(entries), [entries]);

  function patch(p: Partial<M1CashbookResponses>) {
    onChange({ ...responses, ...p });
  }
  function patchEntry(id: string, p: Partial<M1CashbookEntry>) {
    const next = entries.map((e) => (e.id === id ? { ...e, ...p } : e));
    patch({ entries: next });
  }
  function addEntry() {
    patch({ entries: [...entries, blankEntry(makeId())] });
  }
  function removeEntry(id: string) {
    patch({ entries: entries.filter((e) => e.id !== id) });
  }

  return (
    <div className="space-y-4">
      {/* ----- Header card: period + opening balance ----- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Cashbook — opening position
          </CardTitle>
          <CardDescription>
            Set the opening balance (money on hand at the start of the period). The closing
            balance and running balance per row are computed automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${reactId}-open-date`}>Opening balance date</Label>
            <DmyDateInput
              value={openingDate}
              disabled={readOnly}
              onChange={(iso) => patch({ opening_balance_date: iso || undefined })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${reactId}-open-bal`}>Opening balance (M)</Label>
            <Input
              id={`${reactId}-open-bal`}
              type="number"
              step="0.01"
              min="0"
              value={opening || ''}
              disabled={readOnly}
              onChange={(e) => patch({ opening_balance: e.target.value === '' ? 0 : Number(e.target.value) })}
              placeholder="0.00"
              className="text-right tabular-nums"
            />
          </div>
        </CardContent>
      </Card>

      {/* ----- Entries table ----- */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Cash transactions</CardTitle>
              <CardDescription>
                {entries.length === 0
                  ? 'No transactions yet. Add a row for each payment in or out.'
                  : `${entries.length} ${entries.length === 1 ? 'transaction' : 'transactions'} · sorted by date for the running balance.`}
              </CardDescription>
            </div>
            {!readOnly && (
              <Button onClick={addEntry} size="sm">
                <Plus className="mr-1 h-3 w-3" /> Add row
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              No entries yet. {readOnly ? '' : 'Click "Add row" to record the first transaction.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    {CASHBOOK_COLUMNS.map((c) => (
                      <th
                        key={c.id}
                        style={{ width: c.width }}
                        className={cn('py-2 pr-2 font-medium', c.align === 'right' && 'text-right')}
                      >
                        {c.label}
                      </th>
                    ))}
                    {!readOnly && <th style={{ width: 36 }} aria-label="Actions"></th>}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const balance = balances.get(e.id) ?? 0;
                    const accum = accums.get(e.id) ?? 0;
                    const budgetBal = budgetBalances.get(e.id);
                    const credit = Number(e.credit) || 0;
                    const debit = Number(e.debit) || 0;
                    const bothPositive = credit > 0 && debit > 0;
                    return (
                      <tr key={e.id} className="border-b align-top hover:bg-muted/40">
                        <td className="py-1.5 pr-2">
                          <DmyDateInput
                            value={e.date}
                            disabled={readOnly}
                            onChange={(iso) => patchEntry(e.id, { date: iso })}
                            className="h-7 text-xs px-2"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            value={e.item}
                            disabled={readOnly}
                            onChange={(ev) => patchEntry(e.id, { item: ev.target.value })}
                            className="h-7 text-xs px-2"
                            placeholder="e.g. I-A"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            value={e.budget_code}
                            disabled={readOnly}
                            onChange={(ev) => patchEntry(e.id, { budget_code: ev.target.value })}
                            className="h-7 text-xs px-2"
                            placeholder="e.g. MATERIAL"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            value={e.supplier}
                            disabled={readOnly}
                            onChange={(ev) => patchEntry(e.id, { supplier: ev.target.value })}
                            className="h-7 text-xs px-2"
                            placeholder="Supplier"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            value={e.description}
                            disabled={readOnly}
                            onChange={(ev) => patchEntry(e.id, { description: ev.target.value })}
                            className="h-7 text-xs px-2"
                            placeholder="Voucher / note"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={e.credit || ''}
                            disabled={readOnly}
                            onChange={(ev) => patchEntry(e.id, { credit: ev.target.value === '' ? 0 : Number(ev.target.value) })}
                            className={cn('h-7 text-xs px-2 text-right tabular-nums', bothPositive && 'border-warning')}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={e.debit || ''}
                            disabled={readOnly}
                            onChange={(ev) => patchEntry(e.id, { debit: ev.target.value === '' ? 0 : Number(ev.target.value) })}
                            className={cn('h-7 text-xs px-2 text-right tabular-nums', bothPositive && 'border-warning')}
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">
                          {accum > 0 ? formatM(accum) : ''}
                        </td>
                        <td className={cn(
                          'py-1.5 pr-2 text-right tabular-nums font-medium',
                          balance < 0 && 'text-destructive',
                        )}>
                          {formatM(balance)}
                          {bothPositive && (
                            <div className="text-warning text-[10px] inline-flex items-center gap-0.5 ml-1">
                              <AlertTriangle className="h-2.5 w-2.5" /> both
                            </div>
                          )}
                        </td>
                        <td className={cn(
                          'py-1.5 pr-2 text-right tabular-nums text-muted-foreground',
                          typeof budgetBal === 'number' && budgetBal < 0 && 'text-destructive',
                        )}>
                          {typeof budgetBal === 'number' && Number.isFinite(budgetBal) ? formatM(budgetBal) : ''}
                        </td>
                        {!readOnly && (
                          <td className="py-1.5">
                            <button
                              type="button"
                              onClick={() => removeEntry(e.id)}
                              className="text-muted-foreground hover:text-destructive p-1"
                              aria-label="Remove row"
                              title="Remove row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* ----- footer totals ----- */}
                  <tr className="bg-muted/30 font-semibold">
                    <td colSpan={5} className="py-2 pr-2 text-right">Totals:</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{formatM(totals.totalCredits)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{formatM(totals.totalDebits)}</td>
                    <td className="py-2 pr-2 text-right tabular-nums">{formatM(totals.totalDebits)}</td>
                    <td className={cn(
                      'py-2 pr-2 text-right tabular-nums',
                      totals.closingBalance < 0 && 'text-destructive',
                    )}>
                      {formatM(totals.closingBalance)}
                    </td>
                    <td />
                    {!readOnly && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----- per-budget-code spend breakdown ----- */}
      {byCode.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Spend by budget code</CardTitle>
            <CardDescription>
              Computed from the debit column. Use this against the procurement plan to
              spot codes that have over- or under-spent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {byCode.map((b) => (
                <li key={b.code} className="flex items-center justify-between py-1.5">
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{b.code}</code>
                  <span className="tabular-nums">{formatM(b.spent)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatM(n: number): string {
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
