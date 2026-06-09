/**
 * Global command palette — ⌘K (Mac) / Ctrl+K (Windows/Linux) opens an
 * enterprise-search modal from anywhere in the app.
 *
 * Mounted once at AppShell level (single instance regardless of route).
 * Exposes `<CommandPaletteTrigger>` so the sidebar / mobile header can
 * render a visible "Search ⌘K" button for discoverability — keyboard
 * shortcuts are useless if users don't know about them.
 *
 * Search shape (v1):
 *   • Substring match (case-insensitive) on beneficiary_short_name,
 *     applicant_organisation_name, registration_number. For 273 rows on
 *     the live data, a plain Array.filter() is plenty fast — no fuzzy
 *     algorithm needed.
 *   • ↑/↓ moves the highlight; Enter selects; Esc closes.
 *   • Result row shows name + (type · district) so two enterprises with
 *     similar names are distinguishable.
 *
 * Reads `useEnterprises({})` so results are already RLS-scoped to the
 * caller's org (super_admin sees everything; 4D / RSDA each see their
 * own set).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, Sprout } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useEnterprises } from '@/lib/enterprises';
import { useDistricts, useEnterpriseTypes } from '@/lib/catalogs';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Context — lets any descendant (e.g. AppShell sidebar) open the palette
// ---------------------------------------------------------------------------

interface CommandPaletteContextValue {
  open: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    // No provider mounted — return a no-op so trigger buttons don't crash
    // outside the app shell (e.g. on the login page).
    return { open: () => {} };
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider — single instance mounted in AppShell
// ---------------------------------------------------------------------------

/**
 * Detect Mac so we can render the right shortcut hint (⌘K vs Ctrl+K). The
 * `userAgentData.platform` API isn't supported everywhere; fall back to
 * `navigator.platform`. Hooks render before mount so default to false.
 */
function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua =
    (navigator as unknown as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform;
  return /Mac|iPhone|iPod|iPad/i.test(ua ?? '');
}

interface ResultRow {
  id: string;
  name: string;
  org: string;
  district: string;
  type: string;
}

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const { data: enterprises } = useEnterprises({});
  const { data: districts } = useDistricts();
  const { data: types } = useEnterpriseTypes();

  // Stable context.open identity so memoised consumers don't churn.
  const open = useCallback(() => {
    setQuery('');
    setActiveIndex(0);
    setIsOpen(true);
  }, []);
  const ctx = useMemo<CommandPaletteContextValue>(() => ({ open }), [open]);

  // Build a denormalised list for fast filtering. Recomputes only when
  // catalog data changes.
  const allRows: ResultRow[] = useMemo(() => {
    const districtName = new Map((districts ?? []).map((d) => [d.id, d.name]));
    const typeName = new Map((types ?? []).map((t) => [t.id, t.name]));
    return (enterprises ?? []).map((e) => ({
      id: e.id,
      name: e.beneficiary_short_name,
      org: e.applicant_organisation_name ?? '',
      district: districtName.get(e.district_id) ?? '—',
      type: typeName.get(e.enterprise_type_id) ?? '—',
    }));
  }, [enterprises, districts, types]);

  // Filtered + capped to 50. A long list inside a dialog is unusable; we
  // expect the user to keep typing to narrow further.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allRows.slice(0, 50);
    return allRows
      .filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.org.toLowerCase().includes(q) ||
        r.id.toLowerCase().startsWith(q),
      )
      .slice(0, 50);
  }, [allRows, query]);

  // Reset highlight whenever the filtered set changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Global ⌘K / Ctrl+K handler. Bound once on the window so all routes
  // share the same shortcut.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        // Toggle so a second ⌘K closes the palette too.
        setIsOpen((v) => !v);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Focus the input when the modal opens.
  useEffect(() => {
    if (isOpen) {
      // Small delay so Radix's autofocus management doesn't fight us.
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  function commit(row: ResultRow) {
    setIsOpen(false);
    navigate(`/enterprises/${row.id}`);
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = filtered[activeIndex];
      if (row) commit(row);
    }
  }

  // Keep the highlighted row scrolled into view when navigating by keyboard.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <CommandPaletteContext.Provider value={ctx}>
      {children}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          hideClose
          className="p-0 max-w-xl"
          onKeyDown={onListKeyDown}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">Search enterprises</DialogTitle>
          <DialogDescription className="sr-only">
            Type a beneficiary or applicant name. Use the arrow keys to navigate;
            press Enter to open.
          </DialogDescription>

          <div className="flex items-center gap-2 border-b px-3 py-2.5">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search enterprises by name, applicant org, ID…"
              className="border-0 shadow-none focus-visible:ring-0 px-0 text-sm h-7"
            />
            <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No enterprises match. Try a different name or clear the search.
            </div>
          ) : (
            <ul ref={listRef} className="max-h-[55vh] overflow-y-auto py-1" role="listbox">
              {filtered.map((r, i) => (
                <li
                  key={r.id}
                  data-idx={i}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => commit(r)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 cursor-pointer',
                    i === activeIndex && 'bg-muted',
                  )}
                >
                  <Sprout className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {r.type} · {r.district}
                      {r.org && r.org !== r.name && <> · {r.org}</>}
                    </div>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-50 shrink-0" />
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between gap-2 border-t px-3 py-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border bg-muted px-1 font-mono">↑↓</kbd> navigate
              <kbd className="ml-2 rounded border bg-muted px-1 font-mono">↵</kbd> open
            </span>
            <span>{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
          </div>
        </DialogContent>
      </Dialog>
    </CommandPaletteContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Visible trigger — small button that opens the palette + shows the shortcut
// ---------------------------------------------------------------------------

interface CommandPaletteTriggerProps {
  /** Compact mode hides the placeholder text (mobile / narrow contexts). */
  compact?: boolean;
  className?: string;
}

export function CommandPaletteTrigger({ compact, className }: CommandPaletteTriggerProps) {
  const { open } = useCommandPalette();
  const label = isMac() ? '⌘K' : 'Ctrl+K';
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'inline-flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors',
        compact ? 'h-9 w-9 justify-center px-0' : '',
        className,
      )}
      aria-label="Search enterprises"
    >
      <Search className="h-3.5 w-3.5" />
      {!compact && (
        <>
          <span className="flex-1 text-left">Search…</span>
          <kbd className="pointer-events-none hidden md:inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1 font-mono text-[10px]">
            {label}
          </kbd>
        </>
      )}
    </button>
  );
}
