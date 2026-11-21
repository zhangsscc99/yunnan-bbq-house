// Single source of truth for star ratings (HUD live indicator + results panel).
// See docs/GAME-DESIGN.md §4.

export type StarRating = 1 | 2 | 3;

export interface StarInput {
  money: number;
  target: number;
  served: number;
  angry: number;
  waste: number;
}

export function calcStars({ money, target, served, angry, waste }: StarInput): StarRating {
  if (served <= 0 || angry >= 3) return 1;
  const r = target > 0 ? money / target : 0;
  if (r >= 1 && angry === 0 && waste <= 1) return 3;
  if (r >= 1 || (r >= 0.7 && angry <= 1)) return 2;
  return 1;
}
