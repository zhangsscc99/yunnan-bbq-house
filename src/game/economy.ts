// Buffet-mode economy model (docs/GAME-DESIGN.md §2.0):
//  - Fixed upfront admission revenue = seats * BIZ.entryFee (¥79.9/guest); dish prices are always ¥0.
//  - Service mistakes (raw / burnt / long wait / timeout) NEVER deduct money — only satisfaction & stars.
//  - Optional tip uses BIZ.entryFee as base (NOT dish price) and scales strictly with satisfaction & cook window.
//  - Dining occupancy follows the 90-min -> 300s compression ratio (dineDuration = sessionSeconds / seats).
//  - Exposes live state on window.__econ for UI lanes & E2E verification.

import { BIZ, COOK, ECON } from '../config.ts';
import type { GamePhase } from './types.ts';
import type { StarRating } from './stars.ts';

export interface EconSnapshot {
  entryFee: number;       // ¥79.9
  entryRevenue: number;   // seats * entryFee (fixed opening admission income)
  tips: number;           // cumulative tips (satisfaction-based, dish-independent)
  money: number;          // entryRevenue + tips
  served: number;         // guests served
  seats: number;          // active dining seats (= level.maxDiners)
  targetGuests: number;   // level target guest count
  satisfaction: number;   // 0..100 integer percentage
  turnRate: number;       // served / seats (2 decimal places)
  earlyLeaves: number;    // dissatisfied early departures
  stars: StarRating;      // live monotonic star rating (1 | 2 | 3)
  phase: GamePhase;       // 'menu' | 'playing' | 'results'
}

/** Round currency to 2 decimals to eliminate IEEE-754 drift (e.g. 3 * 79.9 -> 239.7). */
export function roundMoney(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Upfront buffet admission income collected once at level start: seats * ¥79.9. */
export function calcEntryRevenue(seats: number, entryFee = BIZ.entryFee): number {
  return roundMoney(Math.max(0, seats) * entryFee);
}

/** Table turnover rate = served guests / active seats. */
export function calcTurnRate(served: number, seats: number): number {
  if (seats <= 0) return 0;
  return Number((Math.max(0, served) / seats).toFixed(2));
}

/**
 * Per-guest compressed buffet dining occupancy cap (seconds):
 * 90 real minutes compressed into BIZ.sessionSeconds (300s) divided across active seats
 * (Lv.1: 300 / 3 = 100s ≈ 30 real min; Lv.2: 300 / 4 = 75s ≈ 22.5 real min).
 */
export function calcDineDuration(seats: number): number {
  return Math.max(15, Math.round(BIZ.sessionSeconds / Math.max(1, seats)));
}

/**
 * Post-serve eating duration before normal happy departure:
 * capped by remaining compressed dining occupancy so total stay never exceeds dineDuration.
 */
export function calcEatDuration(dineDuration: number, dineElapsed: number): number {
  const nominal = Math.max(COOK.eatTime, Math.round(dineDuration * ECON.eatFractionOfDine));
  const remaining = Math.max(COOK.eatTime, dineDuration - Math.max(0, dineElapsed));
  return Math.min(nominal, remaining);
}

/**
 * Buffet service tip:
 * Base = BIZ.entryFee (¥79.9), strictly independent of dish price (all dishes are ¥0).
 * Only awarded when store satisfaction >= ECON.tipMinSatisfaction (60%), scaled by satisfaction%
 * and halved in the over-cook warning window.
 */
export function calcServiceTip(satisfaction: number, cookWindow: 'perfect' | 'over'): number {
  if (satisfaction < ECON.tipMinSatisfaction) return 0;
  const satFactor = Math.max(0, Math.min(1, satisfaction / ECON.satisfactionMax));
  const windowMult = cookWindow === 'over' ? COOK.overTipMult : 1;
  return Math.round(BIZ.entryFee * ECON.tipRate * satFactor * windowMult);
}

export function clampSatisfaction(v: number): number {
  return Math.max(0, Math.min(ECON.satisfactionMax, Math.round(v)));
}

export function publishEcon(snapshot: EconSnapshot): void {
  (window as unknown as Record<string, unknown>).__econ = snapshot;
}
