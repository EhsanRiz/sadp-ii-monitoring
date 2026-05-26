/**
 * M1 Bank Reconciliation — fixed-field form with live-computed totals.
 *
 * Three sections:
 *   1. Top — funds in vs. eligible expenditure → Net Surplus (computed)
 *   2. Middle — bank statement balance, Difference vs. Net Surplus (computed)
 *   3. Bottom — explanation of the difference, Total Explained (computed),
 *      Unexplained Differences (computed; must reach 0).
 *
 * The "must reach 0" reconciled state is shown prominently. If the form
 * doesn't balance, the Unexplained row turns destructive red — same
 * affordance as the printed paper form's red "to be reimbursed to PMU" text.
 */
import { useMemo } from 'react';
import {
  computeBRAll,
  type M1BankReconciliationResponses,
} from '@/forms/m1BankReconciliationSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  responses: M1BankReconciliationResponses;
  onChange: (next: M1BankReconciliationResponses) => void;
  readOnly?: boolean;
}

const fmt = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

export function M1BankReconciliationFormRenderer({ responses, onChange, readOnly = false }: Props) {
  const c = useMemo(() => computeBRAll(responses), [responses]);

  const setNum = (k: keyof M1BankReconciliationResponses, v: string) => {
    onChange({ ...responses, [k]: v === '' ? undefined : Number(v) });
  };
  const setStr = (k: keyof M1BankReconciliationResponses, v: string) => {
    onChange({ ...responses, [k]: v || undefined });
  };
  const setBool = (k: keyof M1BankReconciliationResponses, v: boolean) => {
    onChange({ ...responses, [k]: v });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reconciliation of grant bank statement</CardTitle>
          <CardDescription>
            Matching grant beneficiary contribution + SADP grant funds, less eligible
            expenditure, vs. the balance held in the grant bank account at end of period.
            Every computed total updates as you type.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="br-milestone">Milestone</Label>
              <Input
                id="br-milestone"
                type="number"
                min={1}
                step={1}
                value={responses.milestone_number ?? 1}
                onChange={(e) => setNum('milestone_number', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Period</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={responses.period_start ?? ''}
                  onChange={(e) => setStr('period_start', e.target.value)}
                  disabled={readOnly}
                  className="text-xs"
                />
                <span className="text-muted-foreground self-center">to</span>
                <Input
                  type="date"
                  value={responses.period_end ?? ''}
                  onChange={(e) => setStr('period_end', e.target.value)}
                  disabled={readOnly}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 1 — funds in vs. expenditure */}
          <div className="rounded-md border">
            <Row
              label="Matching grant beneficiary contribution"
              value={responses.matching_grant_beneficiary_contribution}
              onChange={(v) => setNum('matching_grant_beneficiary_contribution', v)}
              readOnly={readOnly}
            />
            <Row
              label="Total grant funds from SADP PMU"
              value={responses.total_grant_funds_from_sadp_pmu}
              onChange={(v) => setNum('total_grant_funds_from_sadp_pmu', v)}
              readOnly={readOnly}
            />
            <ComputedRow label="Subtotal" value={c.subtotal} tone="info" />
            <Row
              label="Less: Total eligible expenditure for grant financing"
              value={responses.total_eligible_expenditure}
              onChange={(v) => setNum('total_eligible_expenditure', v)}
              readOnly={readOnly}
            />
            <ComputedRow
              label="Net surplus / (deficit) of funds received from eligible expenditure"
              value={c.netSurplus}
              tone="info"
              bold
            />
          </div>

          {/* Section 2 — bank statement comparison */}
          <div className="rounded-md border">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b">
              <div className="text-sm font-medium">Amount held in grant bank account</div>
              <label className="text-xs flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={!!responses.amount_held_attached}
                  onChange={(e) => setBool('amount_held_attached', e.target.checked)}
                  disabled={readOnly}
                />
                <span>Bank statement attached</span>
              </label>
            </div>
            <Row
              label="Balance per bank statement"
              value={responses.balance_per_bank_statement}
              onChange={(v) => setNum('balance_per_bank_statement', v)}
              readOnly={readOnly}
            />
            <ComputedRow
              label="Difference (balance − net surplus)"
              value={c.difference}
              tone={Math.abs(c.difference) < 0.005 ? 'success' : 'warning'}
              bold
            />
          </div>

          {/* Section 3 — explanation breakdown */}
          <div className="rounded-md border">
            <div className="px-3 py-2 border-b bg-muted/30 text-sm font-medium">
              Explanation of difference
            </div>
            <Row
              label="Opening balance"
              value={responses.opening_balance}
              onChange={(v) => setNum('opening_balance', v)}
              readOnly={readOnly}
            />
            <Row
              label="Own deposit"
              value={responses.own_deposit}
              onChange={(v) => setNum('own_deposit', v)}
              readOnly={readOnly}
            />
            <Row
              label="Interest received"
              value={responses.interest_received}
              onChange={(v) => setNum('interest_received', v)}
              readOnly={readOnly}
            />
            <Row
              label="Total receipts"
              value={responses.total_receipts}
              onChange={(v) => setNum('total_receipts', v)}
              readOnly={readOnly}
            />
            <Row
              label="Less: Bank charges"
              value={responses.bank_charges}
              onChange={(v) => setNum('bank_charges', v)}
              readOnly={readOnly}
            />
            <ComputedRow label="Total explained differences" value={c.totalExplained} tone="info" bold />
          </div>

          {/* Final unexplained — must be 0 */}
          <div
            className={cn(
              'rounded-md border p-4 flex items-center justify-between gap-3',
              c.reconciled
                ? 'border-success/40 bg-success/10'
                : 'border-destructive/40 bg-destructive/5',
            )}
          >
            <div className="flex items-center gap-2">
              {c.reconciled ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
              <div>
                <div className="text-sm font-medium">
                  Unexplained differences{' '}
                  <span className="text-xs text-muted-foreground font-normal">(to be reimbursed to PMU)</span>
                </div>
                {!c.reconciled && (
                  <p className="text-xs text-destructive mt-0.5">
                    This must reach 0 before the M1 can be approved.
                  </p>
                )}
              </div>
            </div>
            <div className={'text-2xl tabular-nums font-semibold ' + (c.reconciled ? 'text-success' : 'text-destructive')}>
              {fmt(c.unexplained)}
            </div>
          </div>

          {/* Signature block */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2 border-t">
            <div className="space-y-1.5">
              <Label htmlFor="br-leader-name">Project leader (principal applicant)</Label>
              <Input
                id="br-leader-name"
                value={responses.project_leader_name ?? ''}
                onChange={(e) => setStr('project_leader_name', e.target.value)}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="br-signed-date">Signature date</Label>
              <Input
                id="br-signed-date"
                type="date"
                value={responses.project_leader_signed_date ?? ''}
                onChange={(e) => setStr('project_leader_signed_date', e.target.value)}
                disabled={readOnly}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border-b last:border-b-0">
      <div className="text-sm flex-1">{label}</div>
      <Input
        type="number"
        step="0.01"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={readOnly}
        className="w-40 text-right tabular-nums h-9"
        placeholder="0.00"
      />
    </div>
  );
}

function ComputedRow({
  label,
  value,
  tone = 'info',
  bold,
}: {
  label: string;
  value: number;
  tone?: 'info' | 'success' | 'warning';
  bold?: boolean;
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-success/10 text-success'
      : tone === 'warning'
        ? 'bg-warning/10 text-warning'
        : 'bg-tint-info/40 text-foreground';
  return (
    <div className={'flex items-center justify-between gap-3 px-3 py-2 border-b last:border-b-0 ' + toneClass}>
      <div className={'text-sm flex-1 ' + (bold ? 'font-medium' : '')}>{label}</div>
      <div className={'w-40 text-right tabular-nums px-3 py-1 ' + (bold ? 'font-semibold' : '')}>{fmt(value)}</div>
    </div>
  );
}
