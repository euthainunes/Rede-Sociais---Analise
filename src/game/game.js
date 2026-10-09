// Laço do jogo: passo fixo de 60 Hz, estados, câmera e regras da fase.

import { VIEW_W, VIEW_H, STEP, TILE } from '../config/constants.js';
import { CHARACTERS } from '../data/characters.js';
import { MESSAGES } from '../data/messages.js';
import { loadLevel } from '../core/level.js';
import { createPlayer, updatePlayer } from '../core/player.js';
import { updatePromessa } from '../core/platforms.js';
import { overlaps } from '../core/physics.js';
import { MessageSystem } from '../core/messages.js';
import { StateMachine } from '../core/stateMachine.js';
import { Input } from './input.js';
import { prerenderLevel, renderGame, drawRotate } from './render.js';

const START_LIVES = 3;
const RECORD_KEY = 'brwar.save.v1';

function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(RECORD_KEY)) ?? {};
  } catch {
    return {};
  }
}
function writeSave(save) {
  try {
    localStorage.setItem(RECORD_KEY, JSON.stringify(save));
  } catch {
    /* aba anônima ou armazenamento bloqueado: o jogo segue sem salvar */
  }
}

export class Game {
  constructor(canvas, levelData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = new Input(canvas);
    this.levelData = levelData;
    this.messages = new MessageSystem(MESSAGES);
    this.save = loadSave();
    this.debug = new URLSearchParams(location.search).has('debug');
    this.fps = 60;
    this.time = 0;

    const requested = new URLSearchParams(location.search).get('p');
    this.characterId = CHARACTERS[requested] ? requested : this.save.lastCharacterId ?? 'capitao';

    this.fsm = new StateMachine('PLAYING');
    this.startLevel();

    addEventListener('blur', () => this.fsm.send('blur'));
    document.addEventListener('visibilitychange', () => document.hidden && this.fsm.send('blur'));
  }

  // ---------- ciclo de vida da fase ----------
  startLevel() {
    this.level = loadLevel(this.levelData);
    this.levelCanvas = prerenderLevel(this.level);
    this.session = { lives: START_LIVES, hp: CHARACTERS[this.characterId].hp, score: 0, votes: 0, time: 0, maxX: 0, newRecord: false };
    this.checkpoint = { ...this.level.entities.spawn };
    this.spawnPlayer();
    this.camera = { x: 0, y: this.level.map.pixelH - VIEW_H };
    this.snapCamera();
    this.floats = [];
    this.balloon = null;
    this.headline = null;
    this.say('start', 'high');
  }

  spawnPlayer() {
    this.player = createPlayer(CHARACTERS[this.characterId], this.checkpoint.x, this.checkpoint.y);
    for (const pr of this.level.entities.promessas) Object.assign(pr, { state: 'idle', y: pr.homeY, vy: 0, solid: true, timer: 0 });
  }

  swapCharacter() {
    this.characterId = this.characterId === 'capitao' ? 'llivre' : 'capitao';
    this.save.lastCharacterId = this.characterId;
    writeSave(this.save);
    const { x, y } = this.player;
    this.player = createPlayer(CHARACTERS[this.characterId], x, y);
    this.session.hp = this.player.character.hp;
    this.float(this.player.x + 5, this.player.y - 8, this.player.character.name, '#ffffff');
  }

  say(event, priority = 'normal') {
    const t = this.messages.say(event, this.characterId, priority);
    if (t) this.balloon = { text: t, ttl: 2.6 };
  }

  float(x, y, text, color = '#f5d000') {
    this.floats.push({ x, y, text, color, ttl: 0.8 });
  }

  // ---------- simulação ----------
  step(dt) {
    const inp = this.input.frame();
    this.time += dt;
    this.fsm.time += dt;
    this.messages.update(dt);
    if (inp.debugPressed) this.debug = !this.debug;

    switch (this.fsm.state) {
      case 'PLAYING':
        if (inp.pausePressed) { this.fsm.send('pause'); return; }
        if (inp.swapPressed) this.swapCharacter();
        if (inp.restartPressed) { this.spawnPlayer(); return; }
        this.updatePlaying(inp, dt);
        break;
      case 'PAUSED':
        if (inp.pausePressed || inp.confirmPressed) this.fsm.send('resume');
        else if (inp.restartPressed) { this.fsm.send('restart'); this.spawnPlayer(); }
        else if (inp.swapPressed) this.swapCharacter();
        break;
      case 'DYING':
        if (this.fsm.time > 0.9) {
          if (this.session.lives > 0) { this.fsm.send('respawn'); this.spawnPlayer(); this.snapCamera(); }
          else { this.headline = this.messages.pick('gameover', this.characterId); this.fsm.send('gameover'); }
        }
        break;
      case 'GAMEOVER':
      case 'COMPLETE':
        if (this.fsm.time > 0.6 && (inp.confirmPressed || inp.restartPressed)) { this.fsm.send('retry'); this.startLevel(); }
        else if (inp.swapPressed) this.swapCharacter();
        break;
    }

    for (const f of this.floats) { f.ttl -= dt; f.y -= 20 * dt; }
    this.floats = this.floats.filter((f) => f.ttl > 0);
    if (this.balloon && (this.balloon.ttl -= dt) <= 0) this.balloon = null;
  }

  updatePlaying(inp, dt) {
    const p = this.player;
    const E = this.level.entities;
    this.session.time += dt;

    // plataformas antes do jogador (para ele acompanhar o deslocamento)
    for (const pr of E.promessas) {
      const onTop = p.standingOn === pr;
      for (const ev of updatePromessa(pr, dt, onTop, this.level.map.pixelH)) if (ev === 'promessa:shake') this.say('promessa');
    }
    updatePlayer(p, inp, dt, this.level.map, E.promessas);

    // pontos por avanço: só a maior distância já alcançada (§5.4)
    const tileX = Math.floor(p.x / TILE);
    if (tileX > this.session.maxX) { this.session.score += tileX - this.session.maxX; this.session.maxX = tileX; }

    for (const v of E.votes) {
      if (!v.taken && overlaps(p, v)) {
        v.taken = true;
        this.session.votes++;
        this.session.score += 10;
        this.float(v.x + 4, v.y - 2, '+10');
      }
    }
    for (const cp of E.checkpoints) {
      if (!cp.active && overlaps(p, cp)) {
        E.checkpoints.forEach((c) => (c.active = false));
        cp.active = true;
        this.checkpoint = { x: cp.spawnX, y: cp.spawnY };
        this.session.score += 250;
        this.session.hp = p.character.hp;
        this.float(cp.x + 8, cp.y - 6, '+250 CHECKPOINT', '#7cf27c');
        this.say('checkpoint', 'high');
      }
    }
    if (overlaps(p, E.finish)) this.completeLevel();
    if (p.y > this.level.map.pixelH + 8) this.die();

    this.updateCamera(dt);
  }

  die() {
    this.session.lives--;
    this.balloon = null;
    this.say('death', 'high');
    this.fsm.send('die');
  }

  completeLevel() {
    const s = this.session;
    s.score += 2000 + Math.min(3000, Math.max(0, Math.round((this.levelData.targetTime - s.time) * 20)));
    const records = (this.save.records ??= {});
    const key = `${this.levelData.id}.${this.characterId}`;
    const prev = records[key];
    if (!prev || s.score > prev.score) {
      s.newRecord = true;
      records[key] = { score: s.score, time: Math.round(s.time * 10) / 10, date: new Date().toISOString().slice(0, 10) };
      writeSave(this.save);
    }
    this.headline = this.messages.pick('complete', this.characterId);
    this.fsm.send('win');
  }

  // ---------- câmera: segue com antecipação na direção do movimento ----------
  updateCamera(dt) {
    const p = this.player;
    const look = p.facing * 40;
    const target = p.x + p.w / 2 + look - VIEW_W / 2;
    this.camera.x += (target - this.camera.x) * Math.min(1, dt * 5);
    this.clampCamera();
  }

  snapCamera() {
    this.camera.x = this.player.x - VIEW_W / 3;
    this.clampCamera();
  }

  clampCamera() {
    this.camera.x = Math.max(0, Math.min(this.camera.x, this.level.map.pixelW - VIEW_W));
  }

  // ---------- laço ----------
  run() {
    let last = performance.now();
    let acc = 0;
    let fpsAcc = 0;
    let frames = 0;
    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      fpsAcc += dt;
      frames++;
      if (fpsAcc >= 0.5) { this.fps = frames / fpsAcc; fpsAcc = 0; frames = 0; }
      if (this.isPortrait()) {
        this.fsm.send('blur');
        drawRotate(this.ctx);
      } else {
        let steps = 0;
        while (acc >= STEP && steps < 5) { this.step(STEP); acc -= STEP; steps++; }
        if (steps === 5) acc = 0;
        renderGame(this.ctx, this);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  isPortrait() {
    return this.input.touchMode && innerHeight > innerWidth;
  }
}
