/**
 * 4D Climate Solutions logo.
 *
 * If `/logo-4d.png` (or `/logo-4d.svg`) exists in public/, that file renders.
 * Otherwise we fall back to an SVG approximation of the cube mark + wordmark.
 *
 * To use the official PNG you uploaded:
 *   1. Drop the file at `public/logo-4d.png` in this repo
 *   2. Commit + push — Render auto-redeploys
 *   3. Component below will detect it via the <img onError> fallback
 */
import { useState } from 'react';

interface LogoProps {
  /** Compact = mark only (no wordmark). For favicons/headers tight on space. */
  compact?: boolean;
  className?: string;
}

const REAL_LOGO_SRC = '/logo-4d.png';

export function Logo({ compact = false, className }: LogoProps) {
  const [useReal, setUseReal] = useState(true);

  if (useReal) {
    // Try the real logo first; if the file isn't deployed yet, onError flips
    // to the SVG fallback so we never show a broken image.
    return (
      <img
        src={REAL_LOGO_SRC}
        alt="4D Climate Solutions"
        className={
          compact
            ? `h-8 w-8 object-contain ${className ?? ''}`
            : `h-10 max-w-[200px] object-contain ${className ?? ''}`
        }
        onError={() => setUseReal(false)}
      />
    );
  }

  if (compact) {
    return <FourDMark className={className} />;
  }
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <FourDMark className="h-8 w-8 shrink-0" />
      <div className="leading-tight">
        <div className="text-base font-bold text-primary tracking-tight">4D Climate</div>
        <div className="text-base font-bold text-primary tracking-tight -mt-0.5 italic">
          Solutions
        </div>
      </div>
    </div>
  );
}

/**
 * The three-cube hexagonal mark from the official logo, recreated as SVG
 * for use when the PNG isn't available. Cyan + lime + warm-brown faces.
 */
function FourDMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="4D Climate Solutions"
    >
      <polygon
        points="32,4 56,18 56,46 32,60 8,46 8,18"
        fill="none"
        stroke="#cccccc"
        strokeWidth="1.5"
      />
      <polygon points="32,12 48,21 32,30 16,21" fill="#8DC63F" />
      <polygon points="48,21 48,46 32,55 32,30" fill="#9B7456" />
      <polygon points="16,21 16,46 32,55 32,30" fill="#8BD2E0" />
    </svg>
  );
}
