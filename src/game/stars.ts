// Single source of truth for star ratings (HUD live indicator + results panel).
// Buffet mode (docs/GAME-DESIGN.md §2.0): monotonic in served guests (higher -> >= stars)
// and monotonic in satisfaction (lower -> <= stars).

export type StarRating = 1 | 2 | 3;

export interface StarInput {
  served: number;        // 已服务客数
  targetGuests?: number; // 目标服务客数
  target?: number;       // 兼容旧字段名（同 targetGuests）
  satisfaction: number;  // 门店满意度 0..100
  money?: number;        // 保留兼容（自助制不以营业额评星）
  angry?: number;        // 保留兼容
  waste?: number;        // 保留兼容
}

/**
 * Monotonic star rating mapping:
 *  - 3★: served >= 100% targetGuests AND satisfaction >= 85%
 *  - 2★: served >= 60% targetGuests  AND satisfaction >= 65%
 *  - 1★: otherwise (guaranteed floor 1★; low satisfaction or low guest count drops rating)
 */
export function calcStars({ served, targetGuests, target, satisfaction }: StarInput): StarRating {
  if (served <= 0) return 1;
  const goal = Math.max(1, targetGuests ?? target ?? 1);
  const ratio = served / goal;
  const sat = Math.max(0, Math.min(100, satisfaction));
  if (ratio >= 1.0 && sat >= 85) return 3;
  if (ratio >= 0.6 && sat >= 65) return 2;
  return 1;
}
