/**
 * Dashboard rollup for the enterprise lifecycle finances (step 4).
 *
 * Reads district_finance_rollup (migration 340) and shows:
 *   - stage distribution across the cohort (M1 / M2 / Graduated),
 *   - farmer-contribution progress by district (contributed vs outstanding),
 *   - total SADP funds disbursed but not yet reported.
 *
 * Self-contained so the dashboard only has to render <FinanceRollupCard/>.
 * Renders nothing until at least one enterprise has finance data entered.
 */
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useDistrictFinanceRollup, sumRollup } from '@/lib/finance-rollup';
import { formatLsl } from '@/lib/stage-finances';

function Tile({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'primary' | 'success' | 'warning' }) {
  const toneClass =
    tone === 'primary' ? 'text-primary'
    : tone === 'success' ? 'text-success'
    : tone === 'warning' ? 'text-warning'
    : 'text-foreground';
  return (
    <div className="rounded-lg border bg-background/60 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

export function FinanceRollupCard() {
  const { data, isLoading } = useDistrictFinanceRollup();
  if (isLoading || !data) return null;

  const totals = sumRollup(data);
  if (totals.tracked === 0) return null; // nothing imported/entered yet

  const pctContributed = totals.farmer_contract > 0
    ? Math.round((totals.farmer_contributed / totals.farmer_contract) * 100)
    : 0;
  const outstanding = Math.max(0, totals.farmer_contract - totals.farmer_contributed);

  const chartData = data
    .filter((r) => r.farmer_contract > 0)
    .map((r) => ({
      district: r.district,
      Contributed: r.farmer_contributed,
      Outstanding: Math.max(0, r.farmer_contract - r.farmer_contributed),
    }))
    .sort((a, b) => (b.Contributed + b.Outstanding) - (a.Contributed + a.Outstanding));

  return (
    <Card className="transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Lifecycle &amp; finances</CardTitle>
        <CardDescription className="text-xs">
          Stage of each enterprise and farmer contribution progress. Amounts in Maloti (M).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Tile label="In M1" value={String(totals.in_m1)} />
          <Tile label="In M2" value={String(totals.in_m2)} tone="primary" />
          <Tile label="Graduated" value={String(totals.graduated)} tone="success" />
          <Tile label="Finances tracked" value={`${totals.tracked}/${totals.enterprises}`} />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Tile label="Farmer contributed" value={formatLsl(totals.farmer_contributed)} tone="success" />
          <Tile label="Outstanding" value={formatLsl(outstanding)} tone="warning" />
          <Tile label="SADP yet to report" value={formatLsl(totals.yet_to_report)} />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Farmer contribution by district</span>
            <span className="tabular-nums">{pctContributed}% of contract received</span>
          </div>
          {chartData.length > 0 && (
            <ResponsiveContainer width="100%" height={Math.max(160, chartData.length * 38)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
                barCategoryGap={10}
              >
                <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatLsl(Number(v))}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis
                  type="category"
                  dataKey="district"
                  width={88}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <Tooltip
                  formatter={(v) => formatLsl(Number(v))}
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--popover-foreground))',
                    fontSize: 12,
                  }}
                  cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Contributed" stackId="a" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Outstanding" stackId="a" fill="hsl(var(--warning))" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
