/**
 * /ask — curated questions library (Layer 1 of Ask the data).
 *
 * Layout:
 *   ┌── search box  + category filter chips ──┐
 *   │  question cards grid                    │
 *   │  ┌── selected question result panel ──┐ │
 *   │  │  SQL preview + run button          │ │
 *   │  │  Sortable result table             │ │
 *   │  │  Download CSV                      │ │
 *   │  └────────────────────────────────────┘ │
 *   └──────────────────────────────────────────┘
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';
import {
  CURATED_QUESTIONS, CATEGORY_META,
  type QuestionCategory, type CuratedQuestion, type CuratedColumn,
} from '@/data/curated-questions';
import { useRunCuratedQuery, formatCell, rowsToCsv } from '@/lib/ask';
import { cn } from '@/lib/utils';
import { Search, Play, Download, X, ChevronDown, ChevronUp } from 'lucide-react';

export function AskPage() {
  const { isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<QuestionCategory | 'all'>('all');
  const [selected, setSelected] = useState<CuratedQuestion | null>(null);
  const [showSql, setShowSql] = useState(false);
  const run = useRunCuratedQuery();
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const resultRef = useRef<HTMLDivElement | null>(null);

  // Whenever the user picks a question, smooth-scroll the result panel
  // into view so they don't have to chase the answer down the page.
  useEffect(() => {
    if (!selected) return;
    // Wait a tick for the result Card to render.
    const id = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    return () => window.clearTimeout(id);
  }, [selected]);

  const visibleQuestions = useMemo(() => {
    const lower = search.trim().toLowerCase();
    return CURATED_QUESTIONS.filter((q) => {
      if (q.requiresSuperAdmin && !isSuperAdmin) return false;
      if (activeCategory !== 'all' && q.category !== activeCategory) return false;
      if (lower) {
        const hay = `${q.title} ${q.description} ${q.category}`.toLowerCase();
        if (!hay.includes(lower)) return false;
      }
      return true;
    });
  }, [search, activeCategory, isSuperAdmin]);

  const grouped = useMemo(() => {
    const groups: Record<string, CuratedQuestion[]> = {};
    for (const q of visibleQuestions) {
      (groups[q.category] ??= []).push(q);
    }
    return groups;
  }, [visibleQuestions]);

  function runQuestion(q: CuratedQuestion) {
    setSelected(q);
    setSortKey(null);
    setShowSql(false);
    run.mutate(q.sql, {
      onError: (e: unknown) => {
        toast.error('Query failed', {
          description: e instanceof Error ? e.message : 'unknown error',
        });
      },
    });
  }

  function downloadCsv() {
    if (!selected || !run.data) return;
    const cols = selected.columns ?? run.data.columns.map((k) => ({ key: k, label: k }));
    const csv = rowsToCsv(run.data.rows, cols);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selected.id}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const sortedRows = useMemo(() => {
    if (!run.data || !sortKey) return run.data?.rows ?? [];
    const rows = [...run.data.rows];
    rows.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const aNum = Number(av), bNum = Number(bv);
      if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [run.data, sortKey, sortDir]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Ask the data</h1>
        <p className="text-sm text-muted-foreground">
          Pre-built questions about progress, money, compliance, and data quality.
          Every result is RLS-scoped to what you can see — 4D staff get 4D data, etc.
        </p>
      </header>

      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Search + category chips */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions… (e.g. budget, district, overdue)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground mr-1">Quick pick:</span>
            <div className="min-w-[260px] flex-1">
              <Select
                value={selected?.id ?? ''}
                onValueChange={(id) => {
                  const q = visibleQuestions.find((x) => x.id === id)
                        ?? CURATED_QUESTIONS.find((x) => x.id === id);
                  if (q) runQuestion(q);
                }}
              >
                <SelectTrigger><SelectValue placeholder="What do you want to know?" /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_META) as QuestionCategory[]).map((cat) => {
                    const items = visibleQuestions.filter((q) => q.category === cat);
                    if (items.length === 0) return null;
                    return (
                      <SelectGroup key={cat}>
                        <SelectLabel>{CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}</SelectLabel>
                        {items.map((q) => (
                          <SelectItem key={q.id} value={q.id}>{q.title}</SelectItem>
                        ))}
                      </SelectGroup>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CategoryChip active={activeCategory === 'all'} label="All categories" onClick={() => setActiveCategory('all')} />
            {(Object.keys(CATEGORY_META) as QuestionCategory[]).map((c) => (
              <CategoryChip
                key={c}
                active={activeCategory === c}
                label={`${CATEGORY_META[c].emoji} ${CATEGORY_META[c].label}`}
                onClick={() => setActiveCategory(c)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Result panel — sits at top of content so the answer is
          always visible without scrolling past the question grid. */}
      <div ref={resultRef}>
      {selected && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {selected.title}
                </CardTitle>
                <CardDescription>{selected.description}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowSql((v) => !v)}>
                  {showSql ? <><ChevronUp className="h-3 w-3 mr-1.5" />Hide SQL</> : <><ChevronDown className="h-3 w-3 mr-1.5" />Show SQL</>}
                </Button>
                <Button variant="outline" size="sm" onClick={() => runQuestion(selected)} disabled={run.isPending}>
                  <Play className="h-3 w-3 mr-1.5" />Re-run
                </Button>
                {run.data && run.data.rows.length > 0 && (
                  <Button variant="outline" size="sm" onClick={downloadCsv}>
                    <Download className="h-3 w-3 mr-1.5" />CSV
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => { setSelected(null); run.reset(); }}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {showSql && (
              <pre className="mt-3 max-h-64 overflow-auto rounded-md border bg-muted/30 p-3 text-[11px] whitespace-pre-wrap font-mono leading-relaxed">{selected.sql.trim()}</pre>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {run.isPending && (
              <div className="space-y-2">
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
                <Skeleton className="h-8" />
              </div>
            )}
            {run.error && (
              <div className="rounded-md bg-destructive/5 border border-destructive/30 p-3 text-sm text-destructive">
                {(run.error as Error).message}
              </div>
            )}
            {run.data && <ResultTable
              rows={sortedRows}
              cols={selected.columns ?? run.data.columns.map((k) => ({ key: k, label: k }))}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={(k) => {
                if (sortKey === k) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
                else { setSortKey(k); setSortDir('asc'); }
              }}
              duration_ms={run.data.duration_ms}
            />}
          </CardContent>
        </Card>
      )}
      </div>

      {visibleQuestions.length === 0 && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">
          No questions match your filter.
        </CardContent></Card>
      )}

      {(Object.keys(grouped) as QuestionCategory[]).map((c) => (
        <section key={c} className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {grouped[c].map((q) => (
              <button
                key={q.id}
                onClick={() => runQuestion(q)}
                className={cn(
                  'text-left rounded-lg border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                  selected?.id === q.id && 'border-primary ring-1 ring-primary/30 bg-tint-success/30',
                )}
              >
                <div className="font-medium leading-tight">{q.title}</div>
                <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{q.description}</div>
              </button>
            ))}
          </div>
        </section>
      ))}

    </div>
  );
}

function CategoryChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'text-xs px-3 py-1.5 rounded-full border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >{label}</button>
  );
}

function ResultTable({
  rows, cols, sortKey, sortDir, onSort, duration_ms,
}: {
  rows: Record<string, unknown>[];
  cols: CuratedColumn[];
  sortKey: string | null;
  sortDir: 'asc' | 'desc';
  onSort: (k: string) => void;
  duration_ms: number;
}) {
  if (rows.length === 0) {
    return <div className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/20">
      No rows returned. {duration_ms}ms.
    </div>;
  }
  return (
    <div className="space-y-2">
      <div className="text-[11px] text-muted-foreground">
        {rows.length}{rows.length >= 500 ? '+ (capped at 500)' : ''} row{rows.length === 1 ? '' : 's'} · {duration_ms}ms
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              {cols.map((c) => {
                const isSorted = sortKey === c.key;
                const numeric = c.format === 'number' || c.format === 'currency' || c.format === 'percent';
                return (
                  <th
                    key={c.key}
                    onClick={() => onSort(c.key)}
                    className={cn(
                      'p-2 cursor-pointer select-none transition-colors hover:bg-muted/60',
                      numeric ? 'text-right' : 'text-left',
                      isSorted && 'text-primary font-semibold',
                    )}
                  >
                    {c.label}{isSorted && (sortDir === 'asc' ? ' ↑' : ' ↓')}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t transition-colors hover:bg-muted/20">
                {cols.map((c) => {
                  const numeric = c.format === 'number' || c.format === 'currency' || c.format === 'percent';
                  return (
                    <td key={c.key} className={cn('p-2', numeric ? 'text-right tabular-nums' : '')}>
                      {formatCell(r[c.key], c.format)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
