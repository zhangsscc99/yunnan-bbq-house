// Shared inline SVG ingredient icons for HUD order cards & customer bubbles (no emoji — see ART-DIRECTION §5).
// Legacy virtual joystick (#bbq-stick) and action button (#bbq-act) were removed in Round 32 per GAME-DESIGN §0/§1.

import type { DishId } from '../config.ts';

export const FOOD_ICONS: Record<DishId, string> = {
  pork: `<svg class="food-ico" viewBox="0 0 24 24" data-food="pork" fill="none" stroke="#f0c060" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 21L21 3"/>
    <g transform="rotate(-45 12 12)">
      <rect x="5" y="9.2" width="4.2" height="5.6" rx="1.1" fill="#e8907c"/>
      <rect x="9.9" y="9.2" width="4.2" height="5.6" rx="1.1" fill="#f5d0b8"/>
      <rect x="14.8" y="9.2" width="4.2" height="5.6" rx="1.1" fill="#e8907c"/>
    </g>
  </svg>`,
  mushroom: `<svg class="food-ico" viewBox="0 0 24 24" data-food="mushroom" fill="none" stroke="#f0c060" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M9.2 13.5h5.6l.8 6.2a1.6 1.6 0 0 1-1.6 1.8h-4a1.6 1.6 0 0 1-1.6-1.8l.8-6.2z" fill="#f2ead6"/>
    <path d="M3.5 13.5a8.5 8.2 0 0 1 17 0c0 .8-.7 1.3-1.5 1.3H5c-.8 0-1.5-.5-1.5-1.3z" fill="#a97b4f"/>
    <circle cx="9.2" cy="9.4" r="1.1" fill="#f2ead6" stroke="none"/>
    <circle cx="14.5" cy="10.6" r="0.9" fill="#f2ead6" stroke="none"/>
  </svg>`,
  mixian: `<svg class="food-ico" viewBox="0 0 24 24" data-food="mixian" fill="none" stroke="#f0c060" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <ellipse cx="12" cy="13" rx="8.5" ry="6.5" fill="#e8c96a"/>
    <path d="M6.2 13c0-2.5 2.6-4.2 5.8-4.2s5.8 1.7 5.8 4.2-2.2 3.8-5.2 3.8c-2.4 0-4.1-1.1-4.1-2.6 0-1.3 1.4-2.1 3.3-2.1 1.5 0 2.5.6 2.5 1.4" stroke="#6b4b18" stroke-width="1.5"/>
    <path d="M5 10.2c1.8-3 5.2-4.8 9-4.5 2.4.2 4.5 1.2 5.6 2.8" stroke="#f0c060" stroke-width="1.8"/>
  </svg>`,
};
