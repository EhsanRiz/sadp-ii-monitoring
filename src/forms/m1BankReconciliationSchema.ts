/**
 * M1 Bank Reconciliation — reconciles grant funds in vs. eligible expenditure
 * out, then matches against the bank statement balance with a documented
 * breakdown of the difference.
 *
 * Stored on m1_submissions.bank_reconciliation as the M1BankReconciliationResponses
 * shape below. Every "_pretty" / total field is COMPUTED at render time — not
 * stored — so the form and the printed PDF can never disagree.
 *
 * Canonical layout (matches the printed form, "RECONCILIATION OF GRANT BANK STATEMENT"):
 *
 *   MATCHING GRANT BENEFICIARY CONTRIBUTION            ← user input
 *   TOTAL GRANT FUNDS FROM SADP PMU                    ← user input
 *   Subtotal                                            ← computed (sum)
 *   LESS: TOTAL ELIGIBLE EXPENDITURE FOR GRANT FINANCING ← user input
 *   NET SURPLUS/DEFICIT OF FUNDS RECEIVED FROM ELIGIBLE EXPE ← computed
 *                                                       (subtotal − eligible)
 *   AMOUNT HELD IN GRANT BANK ACCOUNT                  ← either "attached"
 *                                                       (bank statement) or
 *                                                       a typed number
 *   BALANCE PER BANK STATEMENT                         ← user input
 *   DIFFERENCE                                          ← computed
 *                                                       (balance − net_surplus)
 *
 *   EXPLANATION OF DIFFERENCE:
 *     OPENING BALANCE                                  ← user input
 *     OWN DEPOSIT                                      ← user input
 *     INTEREST RECEIVED                                ← user input
 *     TOTAL RECEIPTS                                   ← user input
 *     LESS: BANK CHARGES                               ← user input
 *   TOTAL EXPLAINED DIFFERENCES                        ← computed
 *
 *   UNEXPLAINED DIFFERENCES (to be reimbursed to PMU)  ← computed
 *                                                       (difference − explained)
 *                                                       must equal 0
 *
 *   Project Leader signature + date                    ← user input
 */

export const M1_BR_SCHEMA_VERSION = 1;

export interface M1BankReconciliationResponses {
  // ----- header metadata -----
  milestone_number?: number;          // defaults to 1
  period_start?: string;              // ISO; usually mirrors m1_submissions.m1_period_start
  period_end?: string;                // ISO

  // ----- top section: funds in vs. expenditure -----
  matching_grant_beneficiary_contribution?: number;
  total_grant_funds_from_sadp_pmu?: number;
  total_eligible_expenditure?: number;

  // ----- bank-statement comparison -----
  /** "attached" if the user is filing a bank statement separately; otherwise a number is allowed. */
  amount_held_attached?: boolean;
  amount_held_value?: number;
  balance_per_bank_statement?: number;

  // ----- difference explanation -----
  opening_balance?: number;
  own_deposit?: number;
  interest_received?: number;
  total_receipts?: number;
  bank_charges?: number;

  // ----- signature -----
  project_leader_name?: string;
  project_leader_signed_date?: string;
}

const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** Subtotal = beneficiary contribution + SADP grant funds. */
export function computeBRSubtotal(r: M1BankReconciliationResponses): number {
  return n(r.matching_grant_beneficiary_contribution) + n(r.total_grant_funds_from_sadp_pmu);
}

/** Net surplus = subtotal − total eligible expenditure. Positive = funds left over. */
export function computeBRNetSurplus(r: M1BankReconciliationResponses): number {
  return computeBRSubtotal(r) - n(r.total_eligible_expenditure);
}

/**
 * Difference = balance per bank statement − net surplus.
 * On the printed form this is sometimes shown as a parenthesised
 * (negative) number when the bank balance is BELOW the expected net surplus,
 * i.e. money's missing.
 */
export function computeBRDifference(r: M1BankReconciliationResponses): number {
  return n(r.balance_per_bank_statement) - computeBRNetSurplus(r);
}

/** Total of all explanation line items, with bank charges SUBTRACTED. */
export function computeBRTotalExplained(r: M1BankReconciliationResponses): number {
  return (
    n(r.opening_balance) +
    n(r.own_deposit) +
    n(r.interest_received) +
    n(r.total_receipts) -
    n(r.bank_charges)
  );
}

/**
 * Unexplained difference = difference − total explained. SHOULD equal 0;
 * any non-zero amount is treated as "to be reimbursed to PMU".
 */
export function computeBRUnexplained(r: M1BankReconciliationResponses): number {
  return computeBRDifference(r) - computeBRTotalExplained(r);
}

export interface M1BRComputed {
  subtotal: number;
  netSurplus: number;
  difference: number;
  totalExplained: number;
  unexplained: number;
  reconciled: boolean;
}

export function computeBRAll(r: M1BankReconciliationResponses): M1BRComputed {
  const subtotal = computeBRSubtotal(r);
  const netSurplus = subtotal - n(r.total_eligible_expenditure);
  const difference = n(r.balance_per_bank_statement) - netSurplus;
  const totalExplained = computeBRTotalExplained(r);
  const unexplained = difference - totalExplained;
  return {
    subtotal,
    netSurplus,
    difference,
    totalExplained,
    unexplained,
    reconciled: Math.abs(unexplained) < 0.005, // tolerates rounding to half a cent
  };
}
