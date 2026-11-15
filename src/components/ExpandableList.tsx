/**
 * A list that shows its first few rows and expands the rest inline on demand —
 * no inner scrollbar, so the page scrolls as one and the mouse wheel never gets
 * trapped. Used by the Summary queue cards.
 */
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

export function ExpandableList({ items, initial = 5 }: { items: ReactNode[]; initial?: number }) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, initial);

  return (
    <>
      <ul className="divide-y">{shown}</ul>
      {items.length > initial && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-center gap-1.5 border-t px-4 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-brand"
        >
          {open ? 'Show fewer' : `Show all ${items.length}`}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
    </>
  );
}
