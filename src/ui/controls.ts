// Touch controls: left joystick (r=56, deadzone 8) + right action button
// (⌀72) whose icon follows the current interaction. Desktop keys handled
// in core/input.ts — this module only feeds the same Input object.

import { Input } from '../core/input.ts';

const CSS = `
#bbq-ctl { position: absolute; inset: 0; pointer-events: none; }
#bbq-stick {
  position: absolute; width: 128px; height: 128px; border-radius: 50%;
  left: 22px; bottom: calc(22px + env(safe-area-inset-bottom));
  background: rgba(24,16,12,.45); border: 1.5px solid rgba(232,180,90,.35);
  backdrop-filter: blur(6px); pointer-events: auto; touch-action: none;
  opacity: .85; transition: opacity .2s;
}
#bbq-stick .nub {
  position: absolute; width: 56px; height: 56px; border-radius: 50%;
  left: 36px; top: 36px;
  background: radial-gradient(circle at 35% 30%, rgba(245,232,216,.9), rgba(200,160,100,.75));
  box-shadow: 0 2px 8px rgba(0,0,0,.4);
}
#bbq-act {
  position: absolute; width: 72px; height: 72px; border-radius: 50%;
  right: 26px; bottom: calc(30px + env(safe-area-inset-bottom));
  background: rgba(24,16,12,.72); border: 2px solid rgba(232,180,90,.7);
  backdrop-filter: blur(8px); pointer-events: auto; touch-action: none;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 1px; color: #f5e8d8; transition: transform .08s, border-color .15s;
}
#bbq-act svg { width: 26px; height: 26px; }
#bbq-act .cap { font-size: 10px; font-weight: 600; color: rgba(245,232,216,.85);
  max-width: 66px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#bbq-act.on { border-color: #f0c060; }
#bbq-act:active { transform: scale(.92); }
#bbq-act.deny { border-color: #e05a3a; }
@media (min-width: 900px) {
  #bbq-stick { left: 34px; bottom: 34px; }
  #bbq-act { right: 40px; bottom: 40px; }
}
`;

// inline SVG action icons (no emoji — see ART-DIRECTION §5)
const ICONS: Record<string, string> = {
  grab: `<svg viewBox="0 0 24 24" fill="none" stroke="#f0c060" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5v-1a1.5 1.5 0 0 1 3 0V11m0-5a1.5 1.5 0 0 1 3 0v6.5m0-3a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1.6a6 6 0 0 1-4.8-2.4l-2.3-3a1.6 1.6 0 0 1 2.4-2L8 14.5"/>
  </svg>`,
  knife: `<svg viewBox="0 0 24 24" fill="none" stroke="#f0c060" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 20l6.5-6.5M20 4c-3 0-7 2.5-9 5.5l2.5 2.5C17 10.5 20 7 20 4z"/>
    <path d="M6.5 15.5L4 20l4.5-2.5"/>
  </svg>`,
  fire: `<svg viewBox="0 0 24 24" fill="none" stroke="#f0c060" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3c1 3-2 4.5-2 7a4 4 0 0 0 8 0c0-1.5-.8-2.6-1.6-3.8-.5 1-1.2 1.6-1.9 1.8C14.7 6.5 14 4.5 12 3z"/>
    <path d="M8 14a6.5 6.5 0 1 0 8 0"/>
  </svg>`,
  plate: `<svg viewBox="0 0 24 24" fill="none" stroke="#f0c060" stroke-width="1.9" stroke-linecap="round">
    <circle cx="12" cy="13" r="7"/><circle cx="12" cy="13" r="3.2"/>
    <path d="M12 4v2"/>
  </svg>`,
  serve: `<svg viewBox="0 0 24 24" fill="none" stroke="#f0c060" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 17h16M5 17a7 7 0 0 1 14 0M12 10V8.5M10.5 8.5h3"/>
    <path d="M3 20h18"/>
  </svg>`,
  bin: `<svg viewBox="0 0 24 24" fill="none" stroke="#f0c060" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13M10 11v5m4-5v5"/>
  </svg>`,
  none: `<svg viewBox="0 0 24 24" fill="none" stroke="rgba(245,232,216,.35)" stroke-width="1.9" stroke-linecap="round">
    <circle cx="12" cy="12" r="7" stroke-dasharray="3 3"/>
  </svg>`,
};

export class Controls {
  private stick: HTMLElement;
  private nub: HTMLElement;
  private act: HTMLElement;
  private actIcon: HTMLElement;
  private actCap: HTMLElement;
  private input: Input;
  private stickId = -1;
  private origin = { x: 0, y: 0 };
  private lastIcon = '';
  private lastCap = '';
  private deny = false;

  constructor(uiRoot: HTMLElement, input: Input) {
    this.input = input;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.id = 'bbq-ctl';
    uiRoot.appendChild(wrap);

    this.stick = document.createElement('div');
    this.stick.id = 'bbq-stick';
    this.nub = document.createElement('div');
    this.nub.className = 'nub';
    this.stick.appendChild(this.nub);
    wrap.appendChild(this.stick);

    this.act = document.createElement('div');
    this.act.id = 'bbq-act';
    this.actIcon = document.createElement('div');
    this.actIcon.innerHTML = ICONS.none;
    this.actIcon.style.display = 'flex';
    this.actCap = document.createElement('div');
    this.actCap.className = 'cap';
    this.act.appendChild(this.actIcon);
    this.act.appendChild(this.actCap);
    wrap.appendChild(this.act);

    this.bindStick();
    this.bindAction();
  }

  private bindStick(): void {
    const R = 56;      // travel radius px
    const DEAD = 8;
    const onMove = (e: PointerEvent): void => {
      if (e.pointerId !== this.stickId) return;
      const dx = e.clientX - this.origin.x;
      const dy = e.clientY - this.origin.y;
      const d = Math.hypot(dx, dy);
      const cl = Math.min(d, R);
      const nx = d > 0 ? dx / d : 0;
      const ny = d > 0 ? dy / d : 0;
      this.nub.style.transform = `translate(${nx * cl}px, ${ny * cl}px)`;
      if (d < DEAD) {
        this.input.stick.set(0, 0);
      } else {
        const k = Math.min(1, (d - DEAD) / (R - DEAD));
        this.input.stick.set(nx * k, ny * k);
      }
    };
    const onUp = (e: PointerEvent): void => {
      if (e.pointerId !== this.stickId) return;
      this.stickId = -1;
      this.input.stick.set(0, 0);
      this.nub.style.transform = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
    this.stick.addEventListener('pointerdown', (e) => {
      this.stickId = e.pointerId;
      const r = this.stick.getBoundingClientRect();
      this.origin.x = r.left + r.width / 2;
      this.origin.y = r.top + r.height / 2;
      this.stick.setPointerCapture?.(e.pointerId);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      onMove(e);
    });
  }

  private bindAction(): void {
    this.act.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.pressAction();
      this.act.classList.add('on');
      setTimeout(() => this.act.classList.remove('on'), 160);
    });
  }

  setAction(icon: string, caption: string, enabled: boolean, deny: boolean): void {
    if (icon !== this.lastIcon) {
      this.lastIcon = icon;
      this.actIcon.innerHTML = ICONS[icon] ?? ICONS.none;
    }
    if (caption !== this.lastCap) {
      this.lastCap = caption;
      this.actCap.textContent = caption;
    }
    this.act.style.opacity = enabled ? '1' : '0.55';
    if (deny !== this.deny) {
      this.deny = deny;
      this.act.classList.toggle('deny', deny);
    }
  }

  setVisible(v: boolean): void {
    this.stick.style.display = v ? 'block' : 'none';
    this.act.style.display = v ? 'flex' : 'none';
  }
}
