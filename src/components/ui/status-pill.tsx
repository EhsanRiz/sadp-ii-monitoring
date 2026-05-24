import { cn } from '@/lib/utils';
import { Check, X, AlertTriangle, Minus, type LucideIcon } from 'lucide-react';

export type StatusPillTone = 'success' | 'warning' | 'destructive' | 'info' | 'neutral';

const TONE_CLASSES: Record<
  StatusPillTone,
  { idle: string; active: string; icon: LucideIcon }
> = {
  success: {
    idle: 'border-success/30 text-success hover:bg-success/10',
    active: 'bg-success text-success-foreground border-success shadow-sm',
    icon: Check,
  },
  warning: {
    idle: 'border-warning/40 text-warning hover:bg-warning/10',
    active: 'bg-warning text-warning-foreground border-warning shadow-sm',
    icon: AlertTriangle,
  },
  destructive: {
    idle: 'border-destructive/30 text-destructive hover:bg-destructive/10',
    active: 'bg-destructive text-destructive-foreground border-destructive shadow-sm',
    icon: X,
  },
  info: {
    idle: 'border-info/30 text-info hover:bg-info/10',
    active: 'bg-info text-info-foreground border-info shadow-sm',
    icon: Check,
  },
  neutral: {
    idle: 'border-muted-foreground/30 text-muted-foreground hover:bg-muted',
    active: 'bg-muted-foreground/80 text-background border-muted-foreground shadow-sm',
    icon: Minus,
  },
};

/**
 * Colored pill button for status selection (compliant / non-compliant / partial /
 * not-applicable, or yes / no / n-a). Acts like a radio button — selecting one
 * fills it with the tone color; unselected ones are outline-only.
 */
export function StatusPill({
  tone,
  active,
  disabled,
  onSelect,
  children,
  className,
  showIconWhenActive = true,
}: {
  tone: StatusPillTone;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  className?: string;
  showIconWhenActive?: boolean;
}) {
  const { idle, active: activeCls, icon: Icon } = TONE_CLASSES[tone];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        active ? activeCls : idle,
        className,
      )}
    >
      {active && showIconWhenActive && <Icon className="h-3 w-3" />}
      {children}
    </button>
  );
}
