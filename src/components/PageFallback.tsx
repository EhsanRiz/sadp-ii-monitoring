import { Loader2 } from 'lucide-react';

/**
 * Suspense fallback for lazy-loaded routes. Intentionally minimal — a centered
 * spinner — so the split chunk (PDF renderer, charts, admin) loads behind it
 * without layout shift.
 */
export function PageFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground" role="status" aria-label="Loading">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  );
}
