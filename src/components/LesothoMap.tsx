/**
 * A stylised map of Lesotho with the three Central Region districts the tracker
 * covers — Berea, Maseru and Thaba-Tseka — highlighted as adjacent regions in
 * the west-central lowlands/foothills. Schematic (not a precise cartographic
 * boundary); it's a landing-page illustration.
 */

interface District {
  id: string;
  name: string;
  path: string;
  fill: string;
  /** Label centre. */
  cx: number;
  cy: number;
}

// Approximate Lesotho silhouette — smoother Caledon border to the west (left),
// jagged Maloti/Drakensberg highlands to the east (right), pointed toward the SE.
const OUTLINE =
  'M150 70 C200 58 258 58 312 76 C338 85 360 104 374 132 C388 160 398 190 392 216 C386 242 366 262 344 280 C322 298 300 312 274 320 C246 329 214 330 186 324 C158 318 132 306 114 284 C96 262 86 232 86 202 C86 172 92 140 108 112 C120 92 132 80 150 70 Z';

const DISTRICTS: District[] = [
  // Berea — north-central lowlands.
  { id: 'berea', name: 'Berea', fill: '#00ADEF', cx: 185, cy: 146, path: 'M150 108 L214 104 L236 150 L210 186 L156 184 L134 146 Z' },
  // Maseru — western border, where the capital sits.
  { id: 'maseru', name: 'Maseru', fill: '#00A551', cx: 142, cy: 232, path: 'M114 188 L156 186 L188 206 L186 258 L150 282 L116 268 L100 224 Z' },
  // Thaba-Tseka — central highlands, east of the lowlands.
  { id: 'thabatseka', name: 'Thaba-Tseka', fill: '#A6CC38', cx: 262, cy: 204, path: 'M214 150 L300 150 L332 196 L300 254 L214 254 L190 206 L210 186 Z' },
];

export function LesothoMap({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 400"
      className={className}
      role="img"
      aria-label="Stylised map of Lesotho with the three Central Region districts — Berea, Maseru and Thaba-Tseka — highlighted"
    >
      <defs>
        <filter id="lm-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.12" />
        </filter>
      </defs>

      {/* Country (the other districts stay muted) */}
      <path d={OUTLINE} fill="#e8ece2" stroke="#cdd6c2" strokeWidth="2" filter="url(#lm-soft)" />

      {/* Highlighted districts */}
      {DISTRICTS.map((d) => (
        <path key={d.id} d={d.path} fill={d.fill} fillOpacity="0.92" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
      ))}

      {/* Capital marker (Maseru city) on the western border */}
      <circle cx="118" cy="240" r="5" fill="#ffffff" stroke="#00663a" strokeWidth="3" />

      {/* District labels — white halo keeps them legible on any fill */}
      {DISTRICTS.map((d) => (
        <text
          key={`${d.id}-label`}
          x={d.cx}
          y={d.cy}
          textAnchor="middle"
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
      ))}

      {/* North arrow */}
      <g transform="translate(372 300)" fill="#8a988e">
        <path d="M0 -14 L6 6 L0 1 L-6 6 Z" fill="#5b6a60" />
        <text x="0" y="22" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="12" fontWeight="600">N</text>
      </g>

      {/* Caption */}
      <text x="240" y="372" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="14" fontWeight="600" fill="#5b6a60">
        Central Region · 3 districts
      </text>
    </svg>
  );
}
