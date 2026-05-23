/**
 * 4D Climate Solutions logo. Renders the official PNGs in public/.
 *   - /logo-4d.png      → full lockup (cube + "4D Climate Solutions" wordmark)
 *   - /logo-4d-mark.png → cube logomark only (for compact spots)
 */
interface LogoProps {
  /** Compact = cube mark only (no wordmark). For tight headers/favicons. */
  compact?: boolean;
  className?: string;
}

export function Logo({ compact = false, className }: LogoProps) {
  if (compact) {
    return (
      <img
        src="/logo-4d-mark.png"
        alt="4D Climate Solutions"
        className={`h-8 w-8 object-contain ${className ?? ''}`}
      />
    );
  }
  return (
    <img
      src="/logo-4d.png"
      alt="4D Climate Solutions"
      className={`h-12 max-w-[220px] object-contain ${className ?? ''}`}
    />
  );
}
