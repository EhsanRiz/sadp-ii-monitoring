/** 4D cube mark (square). */
export function Logo({ size = 32 }: { size?: number }) {
  return <img src="/4d-icon.png" width={size} height={size} alt="4D Climate Solutions" className="shrink-0" />;
}

/** Full 4D Climate Solutions logo with tagline. */
export function FullLogo({ height = 56 }: { height?: number }) {
  return <img src="/4d-logo.png" style={{ height }} className="w-auto max-w-none shrink-0" alt="4D Climate Solutions — creative · innovative · green · sustainable" />;
}
