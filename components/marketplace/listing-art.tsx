import { cn } from "@/lib/cn";
import type { Category } from "@/lib/platforms/categories";

/**
 * Abstract illustrations generated from a listing's palette, used instead of
 * stock photography. Each category has its own simple motif, drawn from the
 * three palette colours so a listing always looks like itself.
 */

type Motif = (colors: { light: string; mid: string; dark: string; v: number }) => React.ReactNode;

const house: Motif = ({ mid, dark }) => (
  <g>
    <path d="M40 300 V170 L150 100 L260 170 V300 Z" fill={mid} />
    <rect x="260" y="160" width="110" height="140" rx="4" fill={dark} opacity="0.8" />
    <rect x="120" y="200" width="60" height="100" rx="30" fill="#fff" opacity="0.5" />
    <rect x="70" y="190" width="34" height="34" rx="3" fill="#fff" opacity="0.6" />
    <rect x="196" y="190" width="34" height="34" rx="3" fill="#fff" opacity="0.6" />
  </g>
);

const block: Motif = ({ mid, dark, v }) => (
  <g>
    <rect x="70" y={v % 2 ? 70 : 110} width="150" height="230" rx="4" fill={mid} />
    <rect x="220" y="150" width="120" height="150" rx="4" fill={dark} opacity="0.85" />
    {[0, 1, 2, 3, 4].map((r) =>
      [0, 1, 2].map((c) => (
        <rect
          key={`${r}-${c}`}
          x={88 + c * 44}
          y={(v % 2 ? 88 : 128) + r * 38}
          width="26"
          height="22"
          rx="2"
          fill="#fff"
          opacity={0.55 + ((r + c) % 3) * 0.12}
        />
      )),
    )}
    {[0, 1, 2].map((r) => (
      <rect key={r} x="240" y={170 + r * 38} width="80" height="18" rx="2" fill="#fff" opacity="0.35" />
    ))}
  </g>
);

const car: Motif = ({ mid, dark }) => (
  <g>
    <rect y="236" width="400" height="64" fill={mid} opacity="0.5" />
    <path d="M80 220 Q95 170 150 165 L250 165 Q300 168 322 215 L330 232 L72 232 Z" fill={dark} />
    <path d="M140 172 L175 172 L175 205 L112 205 Q120 180 140 172 Z" fill="#fff" opacity="0.55" />
    <path d="M185 172 L245 172 Q275 176 290 205 L185 205 Z" fill="#fff" opacity="0.55" />
    <circle cx="130" cy="235" r="22" fill="#2b2b2b" />
    <circle cx="130" cy="235" r="9" fill="#d9d9d9" />
    <circle cx="275" cy="235" r="22" fill="#2b2b2b" />
    <circle cx="275" cy="235" r="9" fill="#d9d9d9" />
  </g>
);

const scooter: Motif = ({ mid, dark }) => (
  <g>
    <rect y="248" width="400" height="52" fill={mid} opacity="0.5" />
    <path d="M140 200 Q175 196 205 214 L250 214 L262 186 L292 186" fill="none" stroke={dark} strokeWidth="12" strokeLinecap="round" />
    <path d="M120 214 Q126 176 166 178 L214 178 Q206 210 176 214 Z" fill={dark} />
    <circle cx="120" cy="240" r="30" fill="none" stroke="#2b2b2b" strokeWidth="9" />
    <circle cx="272" cy="240" r="30" fill="none" stroke="#2b2b2b" strokeWidth="9" />
    <rect x="150" y="160" width="58" height="16" rx="8" fill="#fff" opacity="0.7" />
  </g>
);

const road: Motif = ({ mid, dark }) => (
  <g>
    <path d="M0 300 L170 150 L230 150 L400 300 Z" fill={mid} />
    <path d="M196 160 L204 160 L214 200 L186 200 Z M182 220 L218 220 L230 270 L170 270 Z" fill="#fff" opacity="0.8" />
    <rect x="250" y="160" width="90" height="40" rx="14" fill={dark} />
    <rect x="262" y="166" width="66" height="16" rx="5" fill="#fff" opacity="0.5" />
    <circle cx="272" cy="202" r="9" fill="#2b2b2b" />
    <circle cx="320" cy="202" r="9" fill="#2b2b2b" />
    <ellipse cx="60" cy="150" rx="40" ry="60" fill="#7c9a74" opacity="0.5" />
  </g>
);

const plane: Motif = ({ mid, dark }) => (
  <g>
    <path d="M0 250 Q200 210 400 250 L400 300 L0 300 Z" fill={mid} opacity="0.55" />
    <path d="M70 178 L250 140 Q300 130 330 140 Q300 164 250 172 L120 200 Z" fill={dark} />
    <path d="M168 168 L150 100 L178 96 L224 156 Z" fill={dark} opacity="0.75" />
    <path d="M150 196 L134 236 L158 234 L192 190 Z" fill={dark} opacity="0.6" />
    <circle cx="300" cy="80" r="26" fill="#fff" opacity="0.65" />
  </g>
);

const mountain: Motif = ({ mid, dark }) => (
  <g>
    <path d="M0 300 L120 140 L200 240 L250 180 L400 300 Z" fill={mid} />
    <path d="M120 140 L160 193 L80 193 Z" fill="#fff" opacity="0.75" />
    <path d="M250 180 L400 300 L230 300 Z" fill={dark} opacity="0.7" />
    <circle cx="320" cy="76" r="30" fill="#fff" opacity="0.7" />
  </g>
);

const basket: Motif = ({ mid, dark }) => (
  <g>
    <circle cx="160" cy="130" r="30" fill="#d9534f" opacity="0.85" />
    <circle cx="210" cy="118" r="26" fill="#f0ad4e" opacity="0.9" />
    <circle cx="250" cy="138" r="24" fill="#5cb85c" opacity="0.85" />
    <path d="M100 150 L300 150 L280 260 L120 260 Z" fill={dark} />
    <path d="M112 175 L288 175 M116 200 L284 200 M120 225 L280 225" stroke="#fff" strokeOpacity="0.35" strokeWidth="4" />
    <path d="M140 150 Q200 70 260 150" fill="none" stroke={mid} strokeWidth="8" />
  </g>
);

const table: Motif = ({ mid, dark }) => (
  <g>
    <rect y="210" width="400" height="90" fill={mid} opacity="0.6" />
    <ellipse cx="200" cy="200" rx="120" ry="34" fill={dark} />
    <ellipse cx="160" cy="190" rx="34" ry="11" fill="#fff" opacity="0.9" />
    <ellipse cx="240" cy="190" rx="34" ry="11" fill="#fff" opacity="0.9" />
    <rect x="196" y="140" width="8" height="46" rx="3" fill="#fff" opacity="0.8" />
    <path d="M200 124 Q210 132 200 142 Q190 132 200 124 Z" fill="#f0ad4e" />
  </g>
);

const screen: Motif = ({ mid, dark }) => (
  <g>
    <rect x="95" y="80" width="210" height="140" rx="10" fill={dark} />
    <rect x="107" y="92" width="186" height="116" rx="4" fill="#fff" opacity="0.92" />
    {[0, 1, 2, 3, 4].map((i) => (
      <rect key={i} x={120 + (i % 2) * 14} y={106 + i * 20} width={60 + ((i * 37) % 90)} height="8" rx="4" fill={mid} />
    ))}
    <path d="M70 232 L330 232 L310 250 L90 250 Z" fill={mid} />
  </g>
);

const board: Motif = ({ mid, dark }) => (
  <g>
    <rect x="70" y="70" width="260" height="150" rx="8" fill={dark} />
    <rect x="82" y="82" width="236" height="126" rx="4" fill="#fff" opacity="0.14" />
    <path d="M110 120 L150 120 M110 145 L210 145 M110 170 L180 170" stroke="#fff" strokeOpacity="0.8" strokeWidth="6" strokeLinecap="round" />
    <circle cx="262" cy="140" r="26" fill="#fff" opacity="0.28" />
    <rect x="150" y="232" width="100" height="10" rx="5" fill={mid} />
    <path d="M186 242 L166 284 M214 242 L234 284" stroke={mid} strokeWidth="9" strokeLinecap="round" />
  </g>
);

const tools: Motif = ({ mid, dark }) => (
  <g>
    <rect y="248" width="400" height="52" fill={mid} opacity="0.5" />
    <path d="M118 236 L232 118" stroke={dark} strokeWidth="20" strokeLinecap="round" />
    <path d="M232 118 a30 30 0 1 1 42 42 l-24 -24 Z" fill={dark} />
    <path d="M286 236 L196 140" stroke={mid} strokeWidth="16" strokeLinecap="round" />
    <circle cx="196" cy="134" r="22" fill="none" stroke={dark} strokeWidth="12" />
  </g>
);

const mirror: Motif = ({ mid, dark }) => (
  <g>
    <rect y="240" width="400" height="60" fill={mid} opacity="0.5" />
    <ellipse cx="200" cy="140" rx="70" ry="86" fill={dark} />
    <ellipse cx="200" cy="140" rx="54" ry="70" fill="#fff" opacity="0.6" />
    <rect x="190" y="224" width="20" height="46" rx="8" fill={dark} />
    <rect x="160" y="262" width="80" height="14" rx="7" fill={dark} />
    <circle cx="316" cy="96" r="24" fill="#fff" opacity="0.55" />
  </g>
);

const cross: Motif = ({ mid, dark }) => (
  <g>
    <rect y="236" width="400" height="64" fill={mid} opacity="0.45" />
    <rect x="120" y="86" width="160" height="160" rx="18" fill={dark} />
    <rect x="186" y="122" width="28" height="88" rx="8" fill="#fff" opacity="0.92" />
    <rect x="156" y="152" width="88" height="28" rx="8" fill="#fff" opacity="0.92" />
  </g>
);

const paw: Motif = ({ mid, dark }) => (
  <g>
    <rect y="244" width="400" height="56" fill={mid} opacity="0.5" />
    <ellipse cx="200" cy="184" rx="60" ry="52" fill={dark} />
    <ellipse cx="146" cy="120" rx="24" ry="30" fill={dark} />
    <ellipse cx="186" cy="100" rx="22" ry="30" fill={dark} />
    <ellipse cx="228" cy="102" rx="22" ry="30" fill={dark} />
    <ellipse cx="264" cy="126" rx="24" ry="30" fill={dark} />
  </g>
);

const parcel: Motif = ({ mid, dark }) => (
  <g>
    <rect y="248" width="400" height="52" fill={mid} opacity="0.5" />
    <rect x="120" y="120" width="160" height="128" rx="6" fill={dark} />
    <rect x="120" y="120" width="160" height="34" rx="6" fill="#fff" opacity="0.28" />
    <rect x="188" y="120" width="24" height="128" fill="#fff" opacity="0.4" />
    <path d="M200 120 q-30 -34 -52 -14 q-16 16 12 24 M200 120 q30 -34 52 -14 q16 16 -12 24" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="7" />
  </g>
);

const camera: Motif = ({ mid, dark }) => (
  <g>
    <rect y="248" width="400" height="52" fill={mid} opacity="0.5" />
    <rect x="96" y="120" width="208" height="128" rx="16" fill={dark} />
    <rect x="152" y="98" width="72" height="26" rx="8" fill={dark} />
    <circle cx="200" cy="184" r="48" fill="#fff" opacity="0.25" />
    <circle cx="200" cy="184" r="32" fill="#fff" opacity="0.55" />
    <circle cx="272" cy="146" r="10" fill="#fff" opacity="0.7" />
  </g>
);

const desks: Motif = ({ mid, dark }) => (
  <g>
    <rect y="252" width="400" height="48" fill={mid} opacity="0.5" />
    {[0, 1].map((r) =>
      [0, 1, 2].map((c) => (
        <g key={`${r}-${c}`}>
          <rect x={64 + c * 104} y={126 + r * 76} width="84" height="12" rx="4" fill={dark} />
          <rect x={72 + c * 104} y={138 + r * 76} width="8" height="36" fill={dark} opacity="0.7" />
          <rect x={132 + c * 104} y={138 + r * 76} width="8" height="36" fill={dark} opacity="0.7" />
          <rect x={90 + c * 104} y={100 + r * 76} width="32" height="24" rx="3" fill="#fff" opacity="0.65" />
        </g>
      )),
    )}
  </g>
);

const stage: Motif = ({ mid, dark }) => (
  <g>
    <path d="M40 230 L200 96 L360 230 Z" fill={dark} />
    <rect x="40" y="230" width="320" height="18" rx="6" fill={mid} />
    <rect y="248" width="400" height="52" fill={mid} opacity="0.5" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <circle key={i} cx={92 + i * 44} cy={200 - (i % 2) * 26} r="9" fill="#fff" opacity="0.7" />
    ))}
  </g>
);

const MOTIFS: Record<Category, Motif> = {
  stays: house,
  hotels: block,
  car_rental: car,
  bikes: scooter,
  rides: road,
  flights: plane,
  experiences: mountain,
  groceries: basket,
  dining: table,
  it_projects: screen,
  tutoring: board,
  home_services: tools,
  beauty: mirror,
  healthcare: cross,
  pet_care: paw,
  courier: parcel,
  equipment: camera,
  coworking: desks,
  events: stage,
};

export function ListingArt({
  palette,
  variant = 0,
  category = "stays",
  className,
}: {
  palette: [string, string, string];
  variant?: number;
  category?: Category;
  className?: string;
}) {
  const [light, mid, dark] = palette;
  const v = Math.abs(variant) % 4;
  const id = `sky-${light.slice(1)}-${v}-${category}`;
  // `stays` alternates between a house and an apartment block so a row of
  // listings in the same category does not look copy-pasted.
  const motif = category === "stays" && (v === 0 || v === 2) ? block : (MOTIFS[category] ?? house);
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={cn("block h-full w-full", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor="#fbfaf7" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id})`} />
      <circle cx={v % 2 ? 320 : 90} cy="70" r="34" fill="#fff" opacity="0.7" />
      {motif({ light, mid, dark, v })}
      <rect y="288" width="400" height="12" fill={dark} opacity="0.3" />
    </svg>
  );
}
