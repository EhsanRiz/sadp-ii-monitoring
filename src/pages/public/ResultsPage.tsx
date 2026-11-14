/**
 * Public "Results" page. Indicative/placeholder figures — written to be edited.
 * These are static so the public page needs no login; staff see live numbers in
 * the monitoring dashboard. 4D only.
 */
const HEADLINE = [
  { k: '164', v: 'enterprises supported' },
  { k: '3', v: 'districts (Maseru · Berea · Thaba-Tseka)' },
  { k: 'Round 3', v: 'current cohort' },
];

const BY_DISTRICT = [
  { district: 'Maseru', enterprises: 102 },
  { district: 'Berea', enterprises: 49 },
  { district: 'Thaba-Tseka', enterprises: 13 },
];

export function ResultsPage() {
  const max = Math.max(...BY_DISTRICT.map((d) => d.enterprises));
  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <span className="text-xs font-semibold uppercase tracking-wide text-primary">Results</span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight" style={{ textWrap: 'balance' }}>
        Progress across the programme
      </h1>
      <p className="mt-4 text-muted-foreground">
        A snapshot of the enterprises supported across the central region. Figures are indicative;
        staff see live, up-to-date numbers in the monitoring dashboard.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {HEADLINE.map((s) => (
          <div key={s.v} className="rounded-xl border bg-background p-5">
            <div className="text-3xl font-bold tabular-nums text-primary">{s.k}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
          </div>
        ))}
      </div>

      <h2 className="mt-12 text-xl font-semibold">Enterprises by district</h2>
      <div className="mt-5 space-y-3">
        {BY_DISTRICT.map((d) => (
          <div key={d.district}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium">{d.district}</span>
              <span className="tabular-nums text-muted-foreground">{d.enterprises}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round((d.enterprises / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm italic text-muted-foreground">
        [Placeholder figures — replace with the indicators and numbers you want to show publicly.]
      </p>
    </div>
  );
}
