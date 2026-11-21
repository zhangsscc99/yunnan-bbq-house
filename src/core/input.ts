// Unified input: keyboard (WASD/arrows + Space/Enter) merges with the touch
// joystick + action button that ui/controls.ts drives into this object.
// Game code reads `move` (normalised vec2, x→right, y→down-screen = +z)
// and consumes edge-triggered `action`.

import * as THREE from 'three';

export class Input {
  /** continuous move vector, |v| ≤ 1 */
  readonly move = new THREE.Vector2();
  /** joystick contribution (controls.ts writes this) */
  readonly stick = new THREE.Vector2();
  private keys = new Set<string>();
  private actionQueued = 0;
  private _onFirstGesture: (() => void) | null = null;

  attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('pointerdown', this.onGesture, { passive: true });
  }

  onFirstGesture(cb: () => void): void {
    this._onFirstGesture = cb;
  }

  private onGesture = (): void => {
    this._onFirstGesture?.();
    this._onFirstGesture = null;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    this.keys.add(k);
    this.onGesture();
    if (k === ' ' || k === 'enter') {
      this.queueAction();
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  /** ui/controls.ts calls this on the big button */
  pressAction(): void {
    this.queueAction();
    this.onGesture();
  }

  // presses are counted, not flagged: two taps inside one (slow) frame must
  // still become two actions (chop ×3), drained one per consumeAction()
  private queueAction(): void {
    this.actionQueued = Math.min(this.actionQueued + 1, 4);
  }

  /** non-destructive: number of queued presses (≤ 4); safe to call on any frame */
  peekAction(): number {
    return this.actionQueued;
  }

  /**
   * edge-triggered: true once per queued press. DESTRUCTIVE — call it only when a
   * simulation step is really about to run (inside the fixed-step loop). Calling it
   * on a frame that runs zero steps drops the press (B-063); use peekAction() there.
   */
  consumeAction(): boolean {
    if (this.actionQueued <= 0) return false;
    this.actionQueued -= 1;
    return true;
  }

  update(): void {
    let x = this.stick.x;
    let y = this.stick.y;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    this.move.set(x, y);
    if (this.move.lengthSq() > 1) this.move.normalize();
  }
}
