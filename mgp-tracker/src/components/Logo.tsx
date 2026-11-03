export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="4D Climate Solutions">
      <rect width="32" height="32" rx="7" fill="#006838" />
      <text x="16" y="21.5" fontFamily="Arial,Helvetica,sans-serif" fontSize="13" fontWeight="700" fill="#fff" textAnchor="middle">
        4D
      </text>
      <rect x="7" y="25" width="18" height="2.5" rx="1.2" fill="#8DC63F" />
    </svg>
  );
}
