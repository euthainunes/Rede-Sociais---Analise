// Efeitos sonoros "chiptune" gerados na hora com Web Audio (sem arquivos de áudio).
// O áudio só começa após a primeira interação (exigência dos navegadores). Tecla M liga/desliga.

const SOUNDS = {
  jump: [{ type: 'square', from: 300, to: 620, dur: 0.12, vol: 0.12 }],
  coin: [{ type: 'square', from: 990, to: 990, dur: 0.05, vol: 0.1 }, { type: 'square', from: 1320, to: 1320, dur: 0.12, vol: 0.1, delay: 0.05 }],
  zap: [{ type: 'triangle', from: 700, to: 1400, dur: 0.1, vol: 0.14 }],
  convert: [{ type: 'square', from: 520, to: 1040, dur: 0.15, vol: 0.1 }, { type: 'square', from: 780, to: 1560, dur: 0.15, vol: 0.08, delay: 0.08 }],
  hurt: [{ type: 'sawtooth', from: 400, to: 110, dur: 0.25, vol: 0.14 }],
  bump: [{ type: 'square', from: 160, to: 90, dur: 0.08, vol: 0.16 }],
  urna: [{ type: 'square', from: 660, to: 660, dur: 0.06, vol: 0.1 }, { type: 'square', from: 440, to: 440, dur: 0.06, vol: 0.1, delay: 0.07 }, { type: 'square', from: 220, to: 220, dur: 0.18, vol: 0.1, delay: 0.14 }],
  checkpoint: [{ type: 'triangle', from: 523, to: 523, dur: 0.12, vol: 0.14 }, { type: 'triangle', from: 659, to: 659, dur: 0.12, vol: 0.14, delay: 0.12 }, { type: 'triangle', from: 784, to: 784, dur: 0.25, vol: 0.14, delay: 0.24 }],
  deliver: [{ type: 'square', from: 784, to: 784, dur: 0.08, vol: 0.1 }, { type: 'square', from: 1047, to: 1047, dur: 0.16, vol: 0.1, delay: 0.08 }],
  die: [{ type: 'square', from: 494, to: 120, dur: 0.6, vol: 0.14 }],
  clock: [{ type: 'sine', from: 880, to: 880, dur: 0.1, vol: 0.12 }, { type: 'sine', from: 880, to: 880, dur: 0.1, vol: 0.12, delay: 0.2 }],
  win: [523, 659, 784, 1047].map((f, i) => ({ type: 'square', from: f, to: f, dur: 0.15, vol: 0.1, delay: i * 0.13 })),
  select: [{ type: 'square', from: 880, to: 880, dur: 0.04, vol: 0.08 }],
};

export class Sfx {
  constructor() {
    this.ctx = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('brwar.mute') === '1'; } catch { /* sem armazenamento */ }
    const unlock = () => {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      this.ctx?.resume?.();
    };
    addEventListener('keydown', (e) => { unlock(); if (e.code === 'KeyM') this.toggle(); });
    addEventListener('pointerdown', unlock);
  }

  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem('brwar.mute', this.muted ? '1' : '0'); } catch { /* idem */ }
  }

  play(name) {
    const ctx = this.ctx;
    if (!ctx || this.muted || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    for (const n of SOUNDS[name] ?? []) {
      const t0 = now + (n.delay ?? 0);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = n.type;
      osc.frequency.setValueAtTime(n.from, t0);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, n.to), t0 + n.dur);
      gain.gain.setValueAtTime(n.vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + n.dur + 0.02);
    }
  }
}

/** Versão silenciosa (testes no Node). */
export const NO_SFX = { play() {}, toggle() {}, muted: true };
