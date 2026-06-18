/**
 * Service-worker registration + update prompt.
 *
 * Field tablets keep the installed PWA open for hours, so the default
 * "update on next full restart" behaviour meant fixes could sit undelivered
 * for days. Here we:
 *
 *   1. Register the SW immediately.
 *   2. Poll for a new deploy every 60s (an open app would otherwise never
 *      notice one) AND whenever the tab regains focus / comes back online.
 *   3. When a new version is ready, show a persistent "Reload" toast instead
 *      of auto-reloading — a field officer filling a visit must not lose
 *      unsaved input to a surprise reload. They reload when it's safe.
 */
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

const UPDATE_POLL_MS = 60_000;

export function initPwa(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        // Only worth checking when we actually have a connection.
        if (navigator.onLine) registration.update().catch(() => {});
      };
      setInterval(check, UPDATE_POLL_MS);
      window.addEventListener('online', check);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
    onNeedRefresh() {
      toast('A new version is available', {
        description: 'Reload to get the latest fixes. Your saved work is safe.',
        duration: Infinity,
        action: {
          label: 'Reload',
          onClick: () => void updateSW(true),
        },
      });
    },
  });
}
