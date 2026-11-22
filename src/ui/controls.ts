// Shared inline SVG ingredient icons for HUD order cards, menu sheet & customer bubbles
// (no emoji — see ART-DIRECTION §5). Keyed by all 17 real store DishIds, shaped by category
// and tinted by each dish's natural ingredient hue.

import { DISH_LIST } from '../config.ts';
import type { Dish, DishId } from '../config.ts';

function hexColor(hue: number): string {
  return `#${hue.toString(16).padStart(6, '0')}`;
}

function renderDishIcon(dish: Dish): string {
  const fill = hexColor(dish.hue);
  switch (dish.category) {
    case '真真牛':
      return `<svg class="food-ico" viewBox="0 0 24 24" data-food="${dish.id}" data-category="${dish.category}" fill="none" stroke="#f0c060" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 21L21 3"/>
        <g transform="rotate(-45 12 12)">
          <rect x="4.8" y="9.1" width="4.4" height="5.8" rx="1.1" fill="${fill}"/>
          <rect x="9.8" y="9.1" width="4.4" height="5.8" rx="1.1" fill="#e8c4ae"/>
          <rect x="14.8" y="9.1" width="4.4" height="5.8" rx="1.1" fill="${fill}"/>
        </g>
      </svg>`;
    case '云贵风味鸡':
      return `<svg class="food-ico" viewBox="0 0 24 24" data-food="${dish.id}" data-category="${dish.category}" fill="none" stroke="#f0c060" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 20L19 5"/>
        <ellipse cx="10.2" cy="13.8" rx="3.4" ry="2.7" transform="rotate(-45 10.2 13.8)" fill="${fill}"/>
        <ellipse cx="14.6" cy="9.4" rx="3.1" ry="2.5" transform="rotate(-45 14.6 9.4)" fill="${fill}"/>
      </svg>`;
    case '云贵菌类':
      return `<svg class="food-ico" viewBox="0 0 24 24" data-food="${dish.id}" data-category="${dish.category}" fill="none" stroke="#f0c060" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9.3 13.4h5.4l.8 6.1a1.5 1.5 0 0 1-1.5 1.8h-4a1.5 1.5 0 0 1-1.5-1.8l.8-6.1z" fill="#efe4cf"/>
        <path d="M3.6 13.4a8.4 8.0 0 0 1 16.8 0c0 .8-.7 1.3-1.5 1.3H5.1c-.8 0-1.5-.5-1.5-1.3z" fill="${fill}"/>
        <circle cx="9.2" cy="9.4" r="1.0" fill="#efe4cf" stroke="none"/>
        <circle cx="14.5" cy="10.4" r="0.85" fill="#efe4cf" stroke="none"/>
      </svg>`;
    case '特色时蔬':
      return `<svg class="food-ico" viewBox="0 0 24 24" data-food="${dish.id}" data-category="${dish.category}" fill="none" stroke="#f0c060" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M5 19C5.5 10.8 10.6 5.5 19.2 4.8c-.7 8.6-6 13.7-14.2 14.2z" fill="${fill}"/>
        <path d="M5 19L15.2 8.8" stroke="#e8e2c4" stroke-width="1.4"/>
      </svg>`;
  }
}

export const FOOD_ICONS: Record<DishId, string> = Object.fromEntries(
  DISH_LIST.map((d) => [d.id, renderDishIcon(d)]),
) as Record<DishId, string>;
