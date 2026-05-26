/**
 * M1 Financial Report — categorised line items with auto-computed 20/20/60
 * source-of-funds split.
 *
 * Mirrors the canonical FORMART FOR FINANCIAL REPORTS layout. Per row the
 * user fills Total Planned, Incurred, Date of Receipts, and Notes. The
 * derived columns (Beneficiary 20% / IFAD 20% / Grant IDA 60% / Difference)
 * are read-only and computed live from Incurred via computeFinancialSplit.
 * Footer totals come from computeFinancialTotals — both helpers live in
 * the schema file so the PDF renderer reuses identical logic.
 */
import { useMemo } from 'react';
import {
  M1_FR_CATEGORIES,
  type M1FinancialReportResponses,
  type M1FRLineItem,
  blankFRItem,
  computeFinancialSplit,
  computeFinancialDifference,
  computeFinancialTotals,
} from '@/forms/m1FinancialReportSchema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calculator } from 'lucide-react';

interface Props {
  responses: M1FinancialReportResponses;
  onChange: (next: M1FinancialReportResponses) => void;
  readOnly?: boolean;
}

const fmt = (n: number) =>
  Number.isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

export function M1FinancialReportFormRenderer({ responses, onChange, readOnly = false }: Props) {
  const items = responses.items ?? [];
  const totals = useMemo(() => computeFinancialTotals(items), [items]);

  const setHeader = <K extends keyof M1FinancialReportResponses>(k: K, v: M1FinancialReportResponses[K]) => {
    onChange({ ...responses, [k]: v });
  };
  const updateItem = (idx: number, patch: Partial<M1FRLineItem>) => {
    const next = items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    onChange({ ...responses, items: next });
  };
  const addRow = (category = 'I-A') => {
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    onChange({ ...responses, items: [...items, blankFRItem(id, category)] });
  };
  const deleteRow = (idx: number) => {
    onChange({ ...responses, items: items.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">M1 Financial Report — Header</CardTitle>
          <CardDescription>
            Report metadata that prints at the top of the financial-report PDF page.
            Reporting period defaults to the M1 period if you leave it blank.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="fr-report-number">Report number</Label>
            <Input
              id="fr-report-number"
              type="number"
              min={1}
              step={1}
              value={responses.report_number ?? ''}
              onChange={(e) => setHeader('report_number', e.target.value === '' ? undefined : Number(e.target.value))}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fr-period-start">Reporting period start</Label>
            <Input
              id="fr-period-start"
              type="date"
              value={responses.reporting_period_start ?? ''}
              onChange={(e) => setHeader('reporting_period_start', e.target.value || undefined)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fr-period-end">Reporting period end</Label>
            <Input
              id="fr-period-end"
              type="date"
              value={responses.reporting_period_end ?? ''}
              onChange={(e) => setHeader('reporting_period_end', e.target.value || undefined)}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fr-remitting">Remitting period</Label>
            <Input
              id="fr-remitting"
              value={responses.remitting_period ?? ''}
              onChange={(e) => setHeader('remitting_period', e.target.value || undefined)}
              placeholder="e.g. 2025/05/28 to 2025/10/22"
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fr-report-date">Reporting date</Label>
            <Input
              id="fr-report-date"
              type="date"
              value={responses.reporting_date ?? ''}
              onChange={(e) => setHeader('reporting_date', e.target.value || undefined)}
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-info" />
            Budget items
          </CardTitle>
          <CardDescription>
            One row per budget line. The Beneficiary / IFAD / Grant-IDA columns are
            auto-computed (20% / 20% / 60% of Incurred); Difference is Planned − Incurred.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No budget items yet. Click "Add row" to start.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left">
                    <th className="px-1 py-1.5 font-medium text-muted-foreground">Cat</th>
                    <th className="px-1 py-1.5 font-medium text-muted-foreground">Budget item</th>
                    <th className="px-1 py-1.5 font-medium text-muted-foreground text-right">Planned (M)</th>
                    <th className="px-1 py-1.5 font-medium text-muted-foreground text-right">Incurred (M)</th>
                    <th className="px-1 py-1.5 font-medium text-muted-foreground">Date</th>
                    <th className="px-1 py-1.5 font-medium text-muted-foreground text-right">Benef 20%</th>
                    <th className="px-1 py-1.5 font-medium text-muted-foreground text-right">IFAD 20%</th>
                    <th className="px-1 py-1.5 font-medium text-muted-foreground text-right">Grant 60%</th>
                    <th className="px-1 py-1.5 font-medium text-muted-foreground text-right">Diff</th>
                    <th className="px-1 py-1.5 font-medium text-muted-foreground">Notes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const split = computeFinancialSplit(it.incurred);
                    const diff = computeFinancialDifference(it);
                    return (
                      <tr key={it.id} className="border-t align-top">
                        <td className="p-1 w-[6%]">
                          <Select
                            value={it.category}
                            onValueChange={(v) => updateItem(idx, { category: v })}
                            disabled={readOnly}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {M1_FR_CATEGORIES.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.id}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1">
                          <Input
                            value={it.label}
                            onChange={(e) => updateItem(idx, { label: e.target.value })}
                            placeholder="e.g. Borehole drilling"
                            disabled={readOnly}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={it.total_planned || ''}
                            onChange={(e) => updateItem(idx, { total_planned: Number(e.target.value) || 0 })}
                            disabled={readOnly}
                            className="h-8 text-xs text-right tabular-nums"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={it.incurred || ''}
                            onChange={(e) => updateItem(idx, { incurred: Number(e.target.value) || 0 })}
                            disabled={readOnly}
                            className="h-8 text-xs text-right tabular-nums"
                          />
                        </td>
                        <td className="p-1">
                          <Input
                            type="date"
                            value={it.date_of_receipts}
                            onChange={(e) => updateItem(idx, { date_of_receipts: e.target.value })}
                            disabled={readOnly}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1 text-right tabular-nums text-muted-foreground">{fmt(split.beneficiary)}</td>
                        <td className="p-1 text-right tabular-nums text-muted-foreground">{fmt(split.ifad)}</td>
                        <td className="p-1 text-right tabular-nums text-muted-foreground">{fmt(split.grant_ida)}</td>
                        <td className={'p-1 text-right tabular-nums ' + (diff < 0 ? 'text-destructive' : 'text-muted-foreground')}>
                          {fmt(diff)}
                        </td>
                        <td className="p-1">
                          <Input
                            value={it.notes}
                            onChange={(e) => updateItem(idx, { notes: e.target.value })}
                            disabled={readOnly}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-1">
                          {!readOnly && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:bg-destructive/10"
                              onClick={() => deleteRow(idx)}
                              aria-label="Delete row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-tint-info/40 font-medium">
                    <td className="p-2 text-xs" colSpan={2}>Total</td>
                    <td className="p-2 text-xs text-right tabular-nums">{fmt(totals.totalPlanned)}</td>
                    <td className="p-2 text-xs text-right tabular-nums">{fmt(totals.totalIncurred)}</td>
                    <td />
                    <td className="p-2 text-xs text-right tabular-nums">{fmt(totals.beneficiary)}</td>
                    <td className="p-2 text-xs text-right tabular-nums">{fmt(totals.ifad)}</td>
                    <td className="p-2 text-xs text-right tabular-nums">{fmt(totals.grant_ida)}</td>
                    <td className={'p-2 text-xs text-right tabular-nums ' + (totals.totalDifference < 0 ? 'text-destructive' : '')}>
                      {fmt(totals.totalDifference)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              {M1_FR_CATEGORIES.map((c) => (
                <Button key={c.id} size="sm" variant="outline" onClick={() => addRow(c.id)}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add {c.id}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
