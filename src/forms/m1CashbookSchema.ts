/**
 * M1 Cashbook — single-entry ledger of money in (credit) and money out
 * (debit) during the Milestone 1 reporting period.
 *
 * Stored on m1_submissions.cashbook as:
 *   {
 *     opening_balance: number,            // M, defaults to 0
 *     opening_balance_date?: string,      // ISO; defaults to m1_period_start
 *     currency: 'LSL',                    // documentary; always Loti for now
 *     entries: M1CashbookEntry[],
 *   }
 *
 * The form deliberately does NOT pre-define a list of budget codes — the user
 * types whatever code matches their procurement plan or financial report.
 * Once the business-plan module is built, this can tighten into a foreign-key
 * select; for now it's free text so partners can adopt their own coding.
 *
 * Computed-but-not-stored:
 *   - running balance (= opening_balance + Σ credits − Σ debits up to that
 *     row, ordered by date)
 *   - per-budget-code spend (= Σ debits grouped by budget_code)
 *   - footer totals (Σ credits, Σ debits, closing balance)
 *
 * Per-row validation enforced in the form:
 *   - date required
 *   - item required
 *   - amount must be non-negative
 *   - a row should have credit XOR debit; both zero is allowed (for memo rows
 *     like "narrative-only notes" that some SPs include) but both > 0 is not.
 */

export const M1_CASHBOOK_SCHEMA_VERSION = 1;

export interface M1CashbookEntry {
  /** UUID-like row id so React keys stay stable across reorders / inserts. */
  id: string;
  /** ISO date (yyyy-mm-dd). Drives the running-balance sort order in the PDF. */
  date: string;
  /** Short label for the activity ("Borehole drilling", "Shadenet purchase"). */
  item: string;
  /** Budget code from the procurement plan ("A.1", "B.2.1", etc.). Free text. */
  budget_code: string;
  /** Supplier or counterparty name (or "Self" for own-contribution credits). */
  supplier: string;
  /** Optional longer description, often the invoice/voucher number + notes. */
  description: string;
  /** Money in (M). Use this for grant payments received, beneficiary contributions, etc. */
  credit: number;
  /** Money out (M). Use this for actual payments made to suppliers / labour / transport. */
  debit: number;
}

export interface M1CashbookResponses {
  opening_balance?: number;
  opening_balance_date?: string;
  currency?: 'LSL';
  entries?: M1CashbookEntry[];
}

/**
 * Column order for the spreadsheet view AND the PDF table. Kept in one place
 * so they can't drift apart.
 */
/**
 * Column order for the spreadsheet view AND the PDF table. Single source of
 * truth so they can't drift apart. Matches the printed SADP-II cashbook
 * template: 5 user-input columns followed by 5 numeric columns (2 entered,
 * 3 computed).
 */
export const CASHBOOK_COLUMNS = [
  { id: 'date',           label: 'Date',           width: '8%',  align: 'left'  as const },
  { id: 'item',           label: 'Item',           width: '14%', align: 'left'  as const },
  { id: 'budget_code',    label: 'Budget',         width: '7%',  align: 'left'  as const },
  { id: 'supplier',       label: 'Supplier',       width: '12%', align: 'left'  as const },
  { id: 'description',    label: 'Description',    width: '14%', align: 'left'  as const },
  { id: 'credit',         label: 'Credit (M)',     width: '8%',  align: 'right' as const },
  { id: 'debit',          label: 'Debit (M)',      width: '8%',  align: 'right' as const },
  { id: 'accum',          label: 'Accum (M)',      width: '9%',  align: 'right' as const },
  { id: 'balance',        label: 'Balance (M)',    width: '9%',  align: 'right' as const },
  { id: 'budget_balance', label: 'Budget bal (M)', width: '11%', align: 'right' as const },
] as const;

/**
 * Compute the running balance for each entry. Sorts a defensive copy by date
 * ascending, then folds. Returns a map keyed by row.id so the caller can
 * lookup without re-sorting.
 *
 * Caller-supplied opening_balance defaults to 0.
 */
export function computeRunningBalances(
  entries: M1CashbookEntry[],
  openingBalance: number,
): Map<string, number> {
  // Stable sort by date; entries with identical/missing dates keep input order.
  const indexed = entries.map((e, i) => ({ e, i }));
  indexed.sort((a, b) => {
    const da = a.e.date ?? '';
    const db = b.e.date ?? '';
    if (da !== db) return da < db ? -1 : 1;
    return a.i - b.i;
  });
  const balances = new Map<string, number>();
  let running = openingBalance;
  for (const { e } of indexed) {
    running += (Number(e.credit) || 0) - (Number(e.debit) || 0);
    balances.set(e.id, running);
  }
  return balances;
}

/**
 * Running ACCUM column — cumulative sum of DEBITS only, in date order.
 * Tracks "how much have we spent total so far" — separate from running
 * Balance (which is the bank-account-style net position).
 *
 * Mirrors the ACCUM column in the printed SADP-II cashbook template.
 */
export function computeRunningAccum(entries: M1CashbookEntry[]): Map<string, number> {
  const indexed = entries.map((e, i) => ({ e, i }));
  indexed.sort((a, b) => {
    const da = a.e.date ?? '';
    const db = b.e.date ?? '';
    if (da !== db) return da < db ? -1 : 1;
    return a.i - b.i;
  });
  const accum = new Map<string, number>();
  let running = 0;
  for (const { e } of indexed) {
    running += Number(e.debit) || 0;
    accum.set(e.id, running);
  }
  return accum;
}

/**
 * Optional BUDGET BALANCE column — remaining budget per row's budget_code.
 * If a per-code planned amount is supplied (e.g. derived from the Financial
 * Report's Total Planned), this returns Planned − cumulative debits for
 * that code, computed in date order. Returns NaN-valued entries for rows
 * whose budget_code has no planned amount on file, so callers can render
 * a blank cell.
 *
 * The printed paper form leaves this column empty by default; we compute
 * it only when the Financial Report has data to anchor against.
 */
export function computeBudgetBalances(
  entries: M1CashbookEntry[],
  plannedByCode: Map<string, number>,
): Map<string, number> {
  const indexed = entries.map((e, i) => ({ e, i }));
  indexed.sort((a, b) => {
    const da = a.e.date ?? '';
    const db = b.e.date ?? '';
    if (da !== db) return da < db ? -1 : 1;
    return a.i - b.i;
  });
  const spentByCode = new Map<string, number>();
  const out = new Map<string, number>();
  for (const { e } of indexed) {
    const code = (e.budget_code || '').trim();
    const planned = plannedByCode.get(code);
    if (planned === undefined) {
      out.set(e.id, NaN);
      continue;
    }
    const prevSpent = spentByCode.get(code) ?? 0;
    const nextSpent = prevSpent + (Number(e.debit) || 0);
    spentByCode.set(code, nextSpent);
    out.set(e.id, planned - nextSpent);
  }
  return out;
}

/** Totals for the footer row. */
export function computeCashbookTotals(
  entries: M1CashbookEntry[],
  openingBalance: number,
): { totalCredits: number; totalDebits: number; closingBalance: number } {
  const totalCredits = entries.reduce((s, e) => s + (Number(e.credit) || 0), 0);
  const totalDebits = entries.reduce((s, e) => s + (Number(e.debit) || 0), 0);
  return {
    totalCredits,
    totalDebits,
    closingBalance: openingBalance + totalCredits - totalDebits,
  };
}

/**
 * Group debits by budget code so the PDF can render a "Spend per budget code"
 * footer table. Credits aren't included because budget codes are spend
 * categories — credits are money INTO the cash account.
 */
export function computeBudgetCodeSpend(
  entries: M1CashbookEntry[],
): Array<{ code: string; spent: number }> {
  const tally = new Map<string, number>();
  for (const e of entries) {
    const code = (e.budget_code || '').trim() || '(uncoded)';
    tally.set(code, (tally.get(code) ?? 0) + (Number(e.debit) || 0));
  }
  return Array.from(tally.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([code, spent]) => ({ code, spent }));
}

/** Build a fresh blank entry. Caller must provide an id (e.g. crypto.randomUUID()). */
export function blankEntry(id: string): M1CashbookEntry {
  return {
    id,
    date: '',
    item: '',
    budget_code: '',
    supplier: '',
    description: '',
    credit: 0,
    debit: 0,
  };
}
