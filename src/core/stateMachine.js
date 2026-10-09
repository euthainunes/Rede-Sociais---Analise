// Estados do jogo e transições permitidas (§9.3). Transição inválida é ignorada com aviso.

export const TRANSITIONS = {
  PLAYING: { pause: 'PAUSED', blur: 'PAUSED', die: 'DYING', win: 'COMPLETE' },
  PAUSED: { resume: 'PLAYING', restart: 'PLAYING' },
  DYING: { respawn: 'PLAYING', gameover: 'GAMEOVER' },
  GAMEOVER: { retry: 'PLAYING' },
  COMPLETE: { retry: 'PLAYING' },
};

export class StateMachine {
  constructor(initial, transitions = TRANSITIONS, onChange = () => {}) {
    this.state = initial;
    this.transitions = transitions;
    this.onChange = onChange;
    this.time = 0; // tempo no estado atual
  }

  send(action) {
    const next = this.transitions[this.state]?.[action];
    if (!next) return false;
    const from = this.state;
    this.state = next;
    this.time = 0;
    this.onChange(from, next, action);
    return true;
  }

  is(state) {
    return this.state === state;
  }
}
