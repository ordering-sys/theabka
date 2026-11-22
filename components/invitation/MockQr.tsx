import { cn } from "@/lib/cn";

/** Deterministic decorative QR pattern (not a real code). */
const qrCells = (() => {
  let seed = 5;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280), seed / 233280);
  const cells: boolean[] = [];
  for (let y = 0; y < 21; y++) {
    for (let x = 0; x < 21; x++) {
      const finder = [[0, 0], [14, 0], [0, 14]].find(([cx, cy]) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7);
      if (finder) {
        const dx = x - finder[0], dy = y - finder[1];
        cells.push(dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4));
      } else cells.push(rnd() > 0.5);
    }
  }
  return cells;
})();

export function MockQr({ className }: { className?: string }) {
  return (
    <div className={cn("grid grid-cols-[repeat(21,minmax(0,1fr))]", className)} aria-hidden>
      {qrCells.map((on, i) => (
        <div key={i} className={cn("aspect-square", on ? "bg-charcoal" : "bg-white")} />
      ))}
    </div>
  );
}
