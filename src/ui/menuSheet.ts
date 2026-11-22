// Authentic store menu sheet (柳真真·云贵山岭烤肉 — 4 categories, 17 exact dishes).
// Self-contained data-wired overlay to avoid visual conflicts with lane/ui.

import { DISH_CATEGORIES, DISHES_BY_CATEGORY, DISH_LIST } from '../config.ts';
import type { Dish, DishCategory } from '../config.ts';
import { FOOD_ICONS } from './controls.ts';

const CSS = `
#bbq-menu-btn {
  position: absolute;
  top: max(50px, calc(env(safe-area-inset-top) + 46px));
  right: 8px;
  z-index: 8;
  appearance: none; -webkit-appearance: none;
  font: inherit; font-size: 12px; font-weight: 700;
  color: #f0c060;
  background: rgba(24, 16, 12, .86);
  border: 1.5px solid rgba(232, 180, 90, .62);
  border-radius: 10px;
  padding: 6px 11px;
  min-height: 32px;
  display: inline-flex; align-items: center; gap: 5px;
  cursor: pointer; pointer-events: auto;
  backdrop-filter: blur(8px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, .42);
}
#bbq-menu-btn .mb-cnt {
  font-size: 10px; font-weight: 800;
  padding: 1px 5px; border-radius: 7px;
  background: rgba(240, 192, 96, .2);
  color: #ffe299;
  font-variant-numeric: tabular-nums;
}

#bbq-menu-sheet {
  position: absolute; inset: 0; z-index: 30;
  display: none; align-items: center; justify-content: center;
  padding: max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: rgba(10, 7, 5, .74);
  backdrop-filter: blur(6px);
  pointer-events: auto;
}
#bbq-menu-sheet.open { display: flex; }

#bbq-menu-sheet .ms-panel {
  width: min(370px, 100%);
  max-height: 100%;
  display: flex; flex-direction: column;
  background: rgba(24, 16, 12, .96);
  border: 1.5px solid rgba(232, 180, 90, .7);
  border-radius: 16px;
  box-shadow: 0 14px 40px rgba(0, 0, 0, .65);
  overflow: hidden;
  color: #f5e8d8;
}
#bbq-menu-sheet .ms-head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid rgba(240, 192, 96, .22);
  flex: none;
}
#bbq-menu-sheet .ms-title {
  font-size: 15px; font-weight: 800; color: #f5e8d8; letter-spacing: .5px;
}
#bbq-menu-sheet .ms-sub {
  font-size: 10px; color: rgba(245, 232, 216, .66); margin-top: 1px;
}
#bbq-menu-sheet .ms-close {
  appearance: none; -webkit-appearance: none;
  font: inherit; font-size: 12px; font-weight: 700;
  color: #f0c060;
  background: rgba(240, 192, 96, .12);
  border: 1px solid rgba(240, 192, 96, .45);
  border-radius: 9px;
  padding: 6px 11px; min-height: 32px;
  cursor: pointer; flex: none;
}

#bbq-menu-sheet .ms-tabs {
  display: flex; flex-wrap: nowrap; gap: 4px;
  padding: 7px 10px;
  border-bottom: 1px solid rgba(240, 192, 96, .16);
  overflow-x: auto; flex: none;
}
#bbq-menu-sheet .ms-tab {
  appearance: none; -webkit-appearance: none;
  font: inherit; font-size: 11px; font-weight: 700;
  padding: 4px 8px; border-radius: 8px;
  border: 1px solid rgba(240, 192, 96, .28);
  background: rgba(34, 24, 18, .85);
  color: rgba(245, 232, 216, .82);
  white-space: nowrap; cursor: pointer; flex: none;
}
#bbq-menu-sheet .ms-tab.active {
  background: #f0c060; border-color: #ffe299; color: #241408;
}

#bbq-menu-sheet .ms-body {
  padding: 8px 10px 10px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 8px;
}
#bbq-menu-sheet .ms-sec {
  display: flex; flex-direction: column; gap: 5px;
}
#bbq-menu-sheet .ms-sec-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 2px 2px 3px;
  border-bottom: 1px dashed rgba(240, 192, 96, .28);
}
#bbq-menu-sheet .ms-sec-name {
  font-size: 12px; font-weight: 800; color: #f0c060; letter-spacing: .4px;
}
#bbq-menu-sheet .ms-sec-cnt {
  font-size: 10px; font-weight: 700; color: rgba(245, 232, 216, .65);
  font-variant-numeric: tabular-nums;
}

#bbq-menu-sheet .ms-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px;
}
#bbq-menu-sheet .ms-item {
  background: rgba(36, 25, 19, .9);
  border: 1px solid rgba(232, 180, 90, .24);
  border-radius: 9px;
  padding: 5px 7px;
  display: flex; flex-direction: column; gap: 3px;
  min-width: 0;
}
#bbq-menu-sheet .ms-item.has-note {
  grid-column: 1 / -1;
  border-color: rgba(232, 160, 72, .48);
  background: rgba(44, 30, 20, .94);
}
#bbq-menu-sheet .ms-row {
  display: flex; align-items: center; gap: 4px; min-width: 0;
}
#bbq-menu-sheet .ms-row svg.food-ico { width: 14px; height: 14px; flex: none; }
#bbq-menu-sheet .ms-name {
  font-size: 11.5px; font-weight: 700; color: #f5e8d8; line-height: 1.2;
  flex: 1 1 auto; min-width: 0;
}
#bbq-menu-sheet .menu-new {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 1px 4px; border-radius: 4px; flex: none;
  background: #c83e2b; color: #fff4e8;
  border: 1px solid #ff9c82;
  font-size: 9px; font-weight: 800; letter-spacing: .4px; line-height: 1.1;
}
#bbq-menu-sheet .ms-price {
  font-size: 11.5px; font-weight: 800; color: #f0c060;
  font-variant-numeric: tabular-nums; flex: none;
}
#bbq-menu-sheet .menu-note {
  display: flex; align-items: flex-start; gap: 4px;
  font-size: 10px; line-height: 1.3; color: #ffd49c;
}
#bbq-menu-sheet .menu-note .note-tag {
  flex: none; padding: 0 4px; border-radius: 3px;
  background: rgba(224, 96, 58, .28);
  border: 1px solid rgba(255, 146, 108, .55);
  color: #ffb899; font-size: 9px; font-weight: 800;
}
`;

export class MenuSheet {
  private triggerBtn: HTMLButtonElement;
  private sheetEl: HTMLElement;
  private tabsEl: HTMLElement;
  private bodyEl: HTMLElement;
  private activeFilter: DishCategory | 'all' = 'all';

  constructor(uiRoot: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    this.triggerBtn = document.createElement('button');
    this.triggerBtn.type = 'button';
    this.triggerBtn.id = 'bbq-menu-btn';
    this.triggerBtn.dataset.btn = 'menu';
    this.triggerBtn.innerHTML = `<span>门店菜单</span><span class="mb-cnt">${DISH_LIST.length}</span>`;
    this.triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.open('all');
    });
    uiRoot.appendChild(this.triggerBtn);

    this.sheetEl = document.createElement('div');
    this.sheetEl.id = 'bbq-menu-sheet';
    this.sheetEl.setAttribute('role', 'dialog');
    this.sheetEl.setAttribute('aria-label', '柳真真·云贵山岭烤肉门店菜单');
    this.sheetEl.innerHTML = `
      <div class="ms-panel">
        <div class="ms-head">
          <div>
            <div class="ms-title">柳真真·云贵山岭烤肉</div>
            <div class="ms-sub">真实门店菜单 · 4 大类目 · 共 ${DISH_LIST.length} 道菜品</div>
          </div>
          <button type="button" class="ms-close" data-btn="close-menu">关闭</button>
        </div>
        <div class="ms-tabs"></div>
        <div class="ms-body"></div>
      </div>`;
    uiRoot.appendChild(this.sheetEl);

    this.tabsEl = this.sheetEl.querySelector('.ms-tabs') as HTMLElement;
    this.bodyEl = this.sheetEl.querySelector('.ms-body') as HTMLElement;

    this.sheetEl.querySelector('[data-btn="close-menu"]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });
    this.sheetEl.addEventListener('click', (e) => {
      if (e.target === this.sheetEl) this.close();
    });

    this.render();
  }

  private render(): void {
    this.tabsEl.innerHTML = '';
    const tabEntries: { key: DishCategory | 'all'; label: string }[] = [
      { key: 'all', label: `全部 ${DISH_LIST.length}` },
      ...DISH_CATEGORIES.map((c) => ({ key: c, label: `${c} ${DISHES_BY_CATEGORY[c].length}` })),
    ];
    for (const tab of tabEntries) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `ms-tab${this.activeFilter === tab.key ? ' active' : ''}`;
      btn.dataset.menuTab = tab.key;
      btn.textContent = tab.label;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.activeFilter = tab.key;
        this.render();
      });
      this.tabsEl.appendChild(btn);
    }

    const cats = this.activeFilter === 'all' ? DISH_CATEGORIES : [this.activeFilter];
    this.bodyEl.innerHTML = cats.map((cat) => {
      const dishes = DISHES_BY_CATEGORY[cat];
      return `
        <section class="ms-sec" data-menu-category="${cat}">
          <div class="ms-sec-head">
            <span class="ms-sec-name">${cat}</span>
            <span class="ms-sec-cnt">${dishes.length} 道</span>
          </div>
          <div class="ms-grid">
            ${dishes.map((d) => this.renderItem(d)).join('')}
          </div>
        </section>`;
    }).join('');
  }

  private renderItem(d: Dish): string {
    const newBadge = d.isNew ? `<span class="menu-new">NEW</span>` : '';
    const noteHtml = d.note
      ? `<div class="menu-note"><span class="note-tag">提示</span><span>${d.note}</span></div>`
      : '';
    return `
      <div class="ms-item${d.note ? ' has-note' : ''}" data-menu-dish="${d.id}" data-category="${d.category}" data-is-new="${d.isNew ? 'true' : 'false'}">
        <div class="ms-row">
          ${FOOD_ICONS[d.id]}
          <span class="ms-name">${d.name}</span>
          ${newBadge}
          <span class="ms-price">¥${d.price}</span>
        </div>
        ${noteHtml}
      </div>`;
  }

  open(category: DishCategory | 'all' = 'all'): void {
    this.activeFilter = category;
    this.render();
    this.sheetEl.classList.add('open');
  }

  close(): void {
    this.sheetEl.classList.remove('open');
  }

  isOpen(): boolean {
    return this.sheetEl.classList.contains('open');
  }
}
