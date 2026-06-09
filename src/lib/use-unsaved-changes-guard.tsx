/**
 * Unsaved-changes guards.
 *
 * Two flavours:
 *
 *   1. `useUnsavedChangesGuard(dirty, message)` — standalone hook for a page
 *      that owns a single form. Blocks in-app navigation (via the data
 *      router's `useBlocker`) AND browser-level navigation (refresh, tab
 *      close) while `dirty` is true.
 *
 *   2. `<UnsavedChangesProvider>` + `useRegisterDirty(key, dirty)` — for a
 *      page that has multiple independent forms (e.g. EnterpriseDetailPage,
 *      where the Details cover-page form and the Lifecycle editor are
 *      separate components). The provider aggregates each child's dirty
 *      flag and prompts ONCE on navigation, so the user doesn't see two
 *      confirmation dialogs in a row.
 *
 * Both rely on the data router (createBrowserRouter) — see main.tsx for
 * the router setup. Using a plain BrowserRouter would make `useBlocker`
 * throw at runtime.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useBlocker } from 'react-router-dom';

const DEFAULT_MESSAGE = 'You have unsaved changes — leave anyway?';

// ---------------------------------------------------------------------------
// Browser-level guard (refresh / close / external nav)
// ---------------------------------------------------------------------------

function useBeforeUnloadGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the message but still show a generic
      // "Leave site?" dialog as long as we touch returnValue.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
}

// ---------------------------------------------------------------------------
// Standalone guard — single form on a page
// ---------------------------------------------------------------------------

export function useUnsavedChangesGuard(
  dirty: boolean,
  message = DEFAULT_MESSAGE,
): void {
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(message)) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, message]);

  useBeforeUnloadGuard(dirty);
}

// ---------------------------------------------------------------------------
// Provider + register hook — multiple forms on the same page
// ---------------------------------------------------------------------------

interface DirtyContextValue {
  setRegionDirty: (key: string, dirty: boolean) => void;
}

const DirtyContext = createContext<DirtyContextValue | null>(null);

interface UnsavedChangesProviderProps {
  children: ReactNode;
  message?: string;
}

/**
 * Renders a context that aggregates dirty flags from any descendant
 * component that calls `useRegisterDirty(key, dirty)`. When any region is
 * dirty AND the user attempts to navigate away (in-app or browser-level),
 * one confirmation dialog is shown.
 */
export function UnsavedChangesProvider({
  children,
  message = DEFAULT_MESSAGE,
}: UnsavedChangesProviderProps) {
  // Map of region key → dirty boolean. A region is "in" the map only when
  // it's dirty (delete on clean) so `Object.keys(...).length === 0` ⇒
  // nothing is dirty.
  const [regions, setRegions] = useState<Record<string, true>>({});

  const setRegionDirty = useCallback((key: string, dirty: boolean) => {
    setRegions((prev) => {
      const isCurrentlyDirty = prev[key] === true;
      if (isCurrentlyDirty === dirty) return prev; // no-op
      const next = { ...prev };
      if (dirty) next[key] = true;
      else delete next[key];
      return next;
    });
  }, []);

  const dirty = Object.keys(regions).length > 0;

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (window.confirm(message)) blocker.proceed();
      else blocker.reset();
    }
  }, [blocker, message]);

  useBeforeUnloadGuard(dirty);

  // Stable identity for the context value so consumers don't re-render on
  // every dirty flag change.
  const ctx = useMemo<DirtyContextValue>(() => ({ setRegionDirty }), [setRegionDirty]);

  return <DirtyContext.Provider value={ctx}>{children}</DirtyContext.Provider>;
}

/**
 * Register a region's dirty flag with the nearest UnsavedChangesProvider.
 *
 * If there is no provider in the tree, this is a no-op — useful so forms
 * can be hosted as either a child of a multi-form page (Details + Lifecycle)
 * or as a standalone page (MonitoringVisitEditPage uses
 * `useUnsavedChangesGuard` directly).
 *
 * `key` should be stable per region (e.g. `'details'`, `'lifecycle'`).
 */
export function useRegisterDirty(key: string, dirty: boolean): void {
  const ctx = useContext(DirtyContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setRegionDirty(key, dirty);
    return () => {
      // On unmount, clear this region's dirty state so we don't leak it
      // across route changes.
      ctx.setRegionDirty(key, false);
    };
  }, [ctx, key, dirty]);
}
