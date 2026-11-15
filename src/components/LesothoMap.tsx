/**
 * Map of Lesotho — the real district boundaries (geoBoundaries ADM1, projected
 * to SVG) — with the three Central Region districts the tracker covers (Berea,
 * Maseru, Thaba-Tseka) tinted and marked with a circle.
 */
import data from '../lib/lesotho-districts.json';

interface DistrictShape {
  name: string;
  target: boolean;
  d: string;
  cx?: number;
  cy?: number;
}

const MAP = data as { W: number; H: number; districts: DistrictShape[] };

// Brand colour per target district.
const TARGET_COLOR: Record<string, string> = {
  Berea: '#00ADEF',
  Maseru: '#00A551',
  'Thaba-Tseka': '#A6CC38',
};

// Label placement tweaks (offset from the circle) so names clear the markers.
const LABEL_OFFSET: Record<string, { dx: number; dy: number; anchor: 'start' | 'middle' | 'end' }> = {
  Berea: { dx: 0, dy: -16, anchor: 'middle' },
  Maseru: { dx: -14, dy: 4, anchor: 'end' },
  'Thaba-Tseka': { dx: 0, dy: 26, anchor: 'middle' },
};

export function LesothoMap({ className = '' }: { className?: string }) {
  const targets = MAP.districts.filter((d) => d.target);
  return (
    <svg
      viewBox={`0 0 ${MAP.W} ${MAP.H + 26}`}
      className={className}
      role="img"
      aria-label="Map of Lesotho with the three Central Region districts — Berea, Maseru and Thaba-Tseka — marked"
    >
      <defs>
        <filter id="lm-soft" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Country — all districts, muted */}
      <g filter="url(#lm-soft)">
        {MAP.districts.map((d) => (
          <path key={d.name} d={d.d} fill="#e8ece2" stroke="#cdd6c2" strokeWidth="1" strokeLinejoin="round" />
        ))}
      </g>

      {/* Target districts — tinted fill */}
      {targets.map((d) => (
        <path key={`${d.name}-fill`} d={d.d} fill={TARGET_COLOR[d.name]} fillOpacity="0.22" stroke={TARGET_COLOR[d.name]} strokeWidth="1.5" strokeLinejoin="round" />
      ))}

      {/* Circle markers on each target district */}
      {targets.map((d) => (
        <g key={`${d.name}-mark`}>
          <circle cx={d.cx} cy={d.cy} r="11" fill="#ffffff" fillOpacity="0.9" stroke={TARGET_COLOR[d.name]} strokeWidth="3.5" />
          <circle cx={d.cx} cy={d.cy} r="3.5" fill={TARGET_COLOR[d.name]} />
        </g>
      ))}

      {/* Labels */}
      {targets.map((d) => {
        const o = LABEL_OFFSET[d.name];
        return (
          <text
            key={`${d.name}-label`}
            x={(d.cx ?? 0) + o.dx}
            y={(d.cy ?? 0) + o.dy}
            textAnchor={o.anchor}
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="15"
            fontWeight="700"
            fill="#15241c"
            stroke="#ffffff"
            strokeWidth="3.5"
            paintOrder="stroke"
          >
            {d.name}
          </text>
        );
      })}

      {/* North arrow (top-right corner) */}
      <g transform={`translate(${MAP.W - 22} 34)`}>
        <path d="M0 -13 L5.5 5 L0 0.5 L-5.5 5 Z" fill="#5b6a60" />
        <text x="0" y="20" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="11" fontWeight="600" fill="#8a988e">N</text>
      </g>

      {/* Caption */}
      <text x={MAP.W / 2} y={MAP.H + 16} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="14" fontWeight="600" fill="#5b6a60">
        Central Region · 3 districts
      </text>
    </svg>
  );
}
