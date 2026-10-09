// Entrada unificada: teclado + botões de toque. Gera bordas (pressionado neste quadro).

import { VIEW_W, VIEW_H } from '../config/constants.js';

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'down', KeyS: 'down',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', KeyZ: 'jump',
  Escape: 'pause', KeyP: 'pause',
  Enter: 'confirm', KeyR: 'restart', KeyT: 'swap', Backquote: 'debug', F2: 'debug',
  KeyX: 'throw', KeyJ: 'throw',
};

// Botões de toque em coordenadas lógicas (mesmo layout de hud.drawTouchControls).
export const TOUCH_BUTTONS = [
  { action: 'left', x: 8, y: VIEW_H - 34, w: 26, h: 26 },
  { action: 'right', x: 40, y: VIEW_H - 34, w: 26, h: 26 },
  { action: 'jump', x: VIEW_W - 38, y: VIEW_H - 38, w: 30, h: 30 },
  { action: 'throw', x: VIEW_W - 72, y: VIEW_H - 32, w: 28, h: 26 },
  { action: 'pause', x: VIEW_W / 2 - 10, y: VIEW_H - 22, w: 20, h: 18 },
];

export class Input {
  constructor(canvas) {
    this.held = new Set();
    this.pressedQueue = new Set();
    this.pointers = new Map(); // pointerId -> action
    this.touchMode = matchMedia('(pointer: coarse)').matches;
    this.canvas = canvas;

    addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (!this.held.has(a)) this.pressedQueue.add(a);
      this.held.add(a);
    });
    addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.held.delete(a);
    });
    addEventListener('blur', () => this.held.clear());

    const onPointer = (e) => {
      if (e.pointerType === 'mouse' && !this.touchMode) {
        if (e.type === 'pointerdown') this.pressedQueue.add('confirm');
        return;
      }
      this.touchMode = true;
      e.preventDefault();
      const { x, y } = this.toLogical(e);
      const prev = this.pointers.get(e.pointerId);
      if (e.type === 'pointerup' || e.type === 'pointercancel') {
        this.pointers.delete(e.pointerId);
      } else {
        const btn = TOUCH_BUTTONS.find((b) => x >= b.x - 4 && x <= b.x + b.w + 4 && y >= b.y - 4 && y <= b.y + b.h + 4);
        const action = btn ? btn.action : (e.type === 'pointerdown' ? 'confirm' : null);
        if (action && action !== prev) this.pressedQueue.add(action);
        if (action) this.pointers.set(e.pointerId, action); else this.pointers.delete(e.pointerId);
      }
    };
    for (const t of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) canvas.addEventListener(t, onPointer, { passive: false });
  }

  toLogical(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * VIEW_W, y: ((e.clientY - r.top) / r.height) * VIEW_H };
  }

  isHeld(action) {
    if (this.held.has(action)) return true;
    for (const a of this.pointers.values()) if (a === action) return true;
    return false;
  }

  /** Lê e consome as bordas do quadro. Chamar uma vez por passo de simulação. */
  frame() {
    const pressed = this.pressedQueue;
    this.pressedQueue = new Set();
    return {
      left: this.isHeld('left'),
      right: this.isHeld('right'),
      down: this.isHeld('down'),
      jumpHeld: this.isHeld('jump'),
      jumpPressed: pressed.has('jump'),
      pausePressed: pressed.has('pause'),
      confirmPressed: pressed.has('confirm') || pressed.has('jump'),
      restartPressed: pressed.has('restart'),
      swapPressed: pressed.has('swap'),
      debugPressed: pressed.has('debug'),
      throwPressed: pressed.has('throw'),
    };
  }
}
