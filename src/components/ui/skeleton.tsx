import { cn } from '@/lib/utils';

/**
 * Shimmer placeholder while data loads. Use instead of plain "Loading…" text.
 *
 * <Skeleton className="h-8 w-24" />
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-muted',
        'bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--background))_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]',
        'animate-shimmer',
        className,
      )}
      {...props}
    />
  );
}
