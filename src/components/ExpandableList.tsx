/**
 * A list that shows its first few rows and expands the rest inline on demand —
 * no inner scrollbar, so the page scrolls as one and the mouse wheel never gets
 * trapped. Used by the Summary queue cards.
 *
 * When expanded, the "Show fewer" control is sticky to the bottom of the
 * viewport, so it floats above the long list and is always reachable without
 * scrolling to the very end. Collapsing scrolls the card back into view.
 */
import { useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function ExpandableList({ items, initial = 5 }: { items: ReactNode[]; initial?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const shown = open ? items : items.slice(0, initial);

  if (items.length <= initial) return <ul className="max-w-5xl divide-y">{shown}</ul>;

  const collapse = () => {
    setOpen(false);
    // Bring the card back into view so collapsing doesn't strand the viewport in whitespace.
    requestAnimationFrame(() => ref.current?.scrollIntoView({ block: 'nearest' }));
  };

  return (
    <div ref={ref} className="max-w-5xl">
      <ul className="divide-y">{shown}</ul>
      {open ? (
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/90 backdrop-blur-sm">
          <button
            onClick={collapse}
            className="flex w-full items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-slate-500 transition hover:text-brand"
          >
            Show fewer <ChevronUp size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 border-t px-4 py-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-brand"
        >
          Show all {items.length} <ChevronDown size={14} />
        </button>
      )}
    </div>
  );
}
