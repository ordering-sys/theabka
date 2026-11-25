import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * Artwork for the "pavilion" template decor (Blush Pavilion): a blossom canopy,
 * fluted ivory pillars, a gold monogram crest, a garden pavilion in gold line
 * art and a balustrade. Invitation pages and template previews only, never
 * host-app chrome. Everything is decorative (aria-hidden).
 */

const PINKS = ["#F2B8B5", "#F7CBC6", "#E9A3A6", "#FBDDD6", "#F4C2BD", "#FFFFFF"];
const GOLD = "#B8893A";

/** [x, y, size] in a 390 × 180 box; fixed so server and client render the same. */
const CANOPY: [number, number, number][] = [
  [-8, -6, 40], [24, 6, 30], [50, -10, 36], [78, 10, 26], [104, -4, 32], [130, 6, 24], [156, -8, 30],
  [184, 4, 26], [208, -6, 34], [236, 8, 26], [262, -4, 32], [288, 10, 24], [314, -8, 36], [342, 4, 30],
  [364, -6, 38], [0, 34, 28], [26, 44, 22], [356, 36, 28], [334, 48, 20], [-4, 70, 26], [18, 92, 18],
  [364, 74, 26], [350, 98, 18], [4, 124, 20], [370, 128, 20], [10, 156, 16], [372, 160, 14],
  [60, 36, 18], [310, 34, 18], [120, 28, 16], [250, 26, 16],
];
const LEAVES: [number, number, number][] = [
  [40, 28, 20], [96, 22, -30], [170, 24, 15], [226, 26, -20], [300, 22, 30], [14, 108, 60], [360, 112, -60], [30, 140, 40],
];

function Blossom({ x, y, size, rotate, color }: { x: number; y: number; size: number; rotate: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 20}) rotate(${rotate} 10 10)`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="10" cy="5" rx="3.6" ry="5" fill={color} transform={`rotate(${a} 10 10)`} />
      ))}
      <circle cx="10" cy="10" r="2.2" fill="#D9A441" />
    </g>
  );
}

/** Blossoms hanging from the top edge. Fills its box's width; place it `absolute inset-x-0 top-0`. */
export function BlossomCanopy({ className, sparse = false }: { className?: string; sparse?: boolean }) {
  const points = sparse ? CANOPY.filter((_, i) => i % 2 === 0) : CANOPY;
  return (
    <svg aria-hidden viewBox="0 0 390 180" preserveAspectRatio="xMidYMin slice" className={cn("pointer-events-none", className)}>
      {LEAVES.map(([x, y, r], i) => (
        <path key={`l${i}`} d="M0 5 Q9 -3 18 5 Q9 13 0 5 Z" fill="#9DB89A" transform={`translate(${x} ${y}) rotate(${r} 9 5)`} />
      ))}
      {points.map(([x, y, s], i) => (
        <Blossom key={i} x={x} y={y} size={s} rotate={(i * 29) % 72} color={PINKS[i % PINKS.length]} />
      ))}
    </svg>
  );
}

/** One fluted ivory pillar with a capital. Size it with `className` (e.g. `w-[54px]`). */
export function Pillar({ side, className, style }: { side: "left" | "right"; className?: string; style?: CSSProperties }) {
  const shade = side === "left" ? "inset -6px 0 10px rgba(138,106,31,0.12)" : "inset 6px 0 10px rgba(138,106,31,0.12)";
  return (
    <div aria-hidden className={cn("pointer-events-none flex flex-col", className)} style={style}>
      <div className="h-[22px] shrink-0 bg-[#FFFDF9] shadow-[inset_0_-1px_0_#D9BE8A,0_4px_8px_rgba(138,106,31,0.12)]" />
      <div className="mx-1 h-2.5 shrink-0 bg-[#F6ECE2]" />
      <div
        className="mx-[7px] grow"
        style={{ background: "repeating-linear-gradient(90deg, #FFFDF9 0px, #FFFDF9 6px, #EFE2D6 6px, #EFE2D6 8px)", boxShadow: shade }}
      />
    </div>
  );
}

/** Shield-shaped gold crest with the couple's initials. */
export function MonogramCrest({ first, second, className }: { first: string; second: string; className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-[170px] w-[150px]", className)}>
      <svg width="150" height="170" viewBox="0 0 150 170" className="absolute inset-0">
        <path d="M14 22 Q75 4 136 22 L136 92 Q136 140 75 164 Q14 140 14 92 Z" fill="#FFFCF7" stroke={GOLD} strokeWidth="2" />
        <path d="M24 30 Q75 16 126 30 L126 92 Q126 132 75 152 Q24 132 24 92 Z" fill="none" stroke={GOLD} strokeWidth="0.9" />
        <path d="M2 26 Q10 8 26 14 M148 26 Q140 8 124 14 M60 8 Q75 -4 90 8 M60 160 Q75 172 90 160" fill="none" stroke={GOLD} strokeWidth="1.6" />
        <circle cx="75" cy="4" r="3" fill={GOLD} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pb-3 font-serif text-[58px] font-semibold tracking-[-6px] italic" style={{ color: GOLD }}>
        {first}
        <span className="ml-0.5 text-[44px] text-maroon">{second}</span>
      </div>
    </div>
  );
}

/** Garden pavilion in gold line art. 300 × 330; scale it with `className` width. */
export function PavilionLineArt({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 300 330" className={cn("pointer-events-none", className)}>
      <g fill="none" stroke={GOLD}>
        <path d="M150 8 L150 26" strokeWidth="1.4" />
        <path d="M20 110 Q150 10 280 110 Z" fill="rgba(255,246,240,0.85)" strokeWidth="1.4" />
        <path d="M60 110 Q150 40 240 110 M100 110 Q150 60 200 110 M150 30 L150 110" strokeWidth="0.8" opacity="0.6" />
        <path d="M12 110 L288 110 L288 122 L12 122 Z" fill="#FFF8F3" strokeWidth="1.2" />
        <path d="M12 122 Q30 136 48 122 Q66 136 84 122 Q102 136 120 122 Q138 136 156 122 Q174 136 192 122 Q210 136 228 122 Q246 136 264 122 Q276 132 288 122" strokeWidth="1" />
        <rect x="28" y="122" width="12" height="176" fill="#FFF8F3" strokeWidth="1" />
        <rect x="260" y="122" width="12" height="176" fill="#FFF8F3" strokeWidth="1" />
        <rect x="94" y="122" width="10" height="176" fill="#FFF8F3" strokeWidth="0.9" opacity="0.85" />
        <rect x="196" y="122" width="10" height="176" fill="#FFF8F3" strokeWidth="0.9" opacity="0.85" />
        <path d="M104 298 L104 190 Q150 140 196 190 L196 298" strokeWidth="1.2" />
        <path d="M150 150 L150 176" strokeWidth="0.8" />
        <path d="M0 298 L300 298 L300 312 L0 312 Z" fill="#FFF8F3" strokeWidth="1.2" />
        <path d="M-10 312 L310 312 L310 330 L-10 330 Z" fill="#FBEFE8" strokeWidth="1" />
      </g>
      <circle cx="150" cy="8" r="4" fill={GOLD} />
      <path d="M140 176 Q150 168 160 176 Q150 190 140 176 Z" fill="#E9A3A6" />
    </svg>
  );
}

/** Row of ivory balusters along the bottom edge. */
export function Balustrade({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none flex items-end justify-around border-t border-[#D9BE8A] bg-[#FFF8F3] px-[18%]", className)}>
      {Array.from({ length: 9 }, (_, i) => (
        <span
          key={i}
          className="mb-1.5 h-[44px] w-3.5 rounded-[7px_7px_3px_3px] shadow-[inset_0_0_0_1px_#E3CFA6]"
          style={{ background: "linear-gradient(90deg, #F3E5D8, #FFFDF9 50%, #F3E5D8)" }}
        />
      ))}
    </div>
  );
}

/** Arched panel lines for one opening door (Premium cover). Mirror the right door with `-scale-x-100`. */
export function DoorArch({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 195 844" preserveAspectRatio="none" className={cn("pointer-events-none", className)}>
      <g fill="none" stroke={GOLD} vectorEffect="non-scaling-stroke">
        <path d="M24 820 L24 300 Q24 150 171 120 L171 820 Z" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        <path d="M36 808 L36 306 Q36 170 159 138 L159 808 Z" strokeWidth="0.8" opacity="0.7" vectorEffect="non-scaling-stroke" />
        <path d="M60 560 L135 560 L135 740 L60 740 Z" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

/** Blush sky behind the pavilion artwork. */
export const PAVILION_SKY = "linear-gradient(180deg, #F6CFCB 0%, #F9DDD5 30%, #FCE9DF 60%, #FDF3EA 100%)";
/** Soft blush page behind the invitation's white cards. */
export const PAVILION_PAGE = "linear-gradient(180deg, #FDF3EE 0%, #FBE4DE 100%)";
/** Gold seal gradient for the doors' monogram. */
export const PAVILION_SEAL = "radial-gradient(circle at 35% 30%, #F5DFA0 0%, #C9A24B 50%, #8A6A1F 100%)";
