import { cn } from '@/lib/utils';
import { Check, Clock, Circle, FileEdit } from 'lucide-react';
import type { SubmissionStatus } from '@/types/database';

const STYLES = {
  draft:     { label: 'Draft',       cls: 'bg-info/10 text-info border-info/30',                icon: FileEdit },
  submitted: { label: 'Submitted',   cls: 'bg-warning/15 text-warning border-warning/40',       icon: Clock },
  approved:  { label: 'Approved',    cls: 'bg-success/15 text-success border-success/40',       icon: Check },
  not_started: { label: 'Not started', cls: 'bg-muted text-muted-foreground border-muted-foreground/30', icon: Circle },
} as const;

export type StatusBadgeKind = SubmissionStatus | 'not_started';

/** Colored, icon-prefixed status badge. Use anywhere we surface a workflow state. */
export function StatusBadge({
  status,
  className,
}: {
  status: SubmissionStatus | null | undefined;
  className?: string;
}) {
  const kind: StatusBadgeKind = status ?? 'not_started';
  const { label, cls, icon: Icon } = STYLES[kind];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        cls,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
