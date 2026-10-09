// Missão Patriota — laço e regras da fase (Patrício, marmitas, Zap, Fé, 72h, pneu, Checagem).

import { VIEW_W, VIEW_H, STEP, TILE, jumpVelocity } from '../config/constants.js';
import { PATRICIO_STATS, FE, SCORE } from '../data/missao/characters.js';
import { MESSAGES_MISSAO, HEADLINES_MISSAO } from '../data/missao/messages.js';
import { loadLevel } from '../core/level.js';
import { createPlayer, updatePlayer } from '../core/player.js';
import { updatePromessa } from '../core/platforms.js';
import { overlaps } from '../core/physics.js';
import { createEnemy, updateEnemy, convertEnemy, stunEnemy, isActive } from '../core/enemy.js';
import { createZap, updateZap, ZAP } from '../core/zap.js';
import { MessageSystem } from '../core/messages.js';
import { StateMachine } from '../core/stateMachine.js';
import { Input } from './input.js';
import { prerenderLevel } from './render.js';
import { renderMissao, drawRotate } from './missaoRender.js';

export const STATES = {
  TITLE: { start: 'MISSION' },
  MISSION: { go: 'PLAYING' },
  PLAYING: { pause: 'PAUSED', blur: 'PAUSED', die: 'DYING', awake: 'GAMEOVER', win: 'CHECAGEM' },
  PAUSED: { resume: 'PLAYING', restart: 'MISSION' },
  DYING: { respawn: 'PLAYING', gameover: 'GAMEOVER' },
  GAMEOVER: { retry: 'MISSION' },
  CHECAGEM: { retry: 'MISSION' },
};

const SAVE_KEY = 'brwar.missao.v1';
const HOURS72 = 72 * 3600;
const HOURS_PER_SECOND = 3600; // 1 segundo de jogo = 1 hora no relógio do Patrício
const ENEMY_KINDS = {
  M: { kind: 'militante', speed: 32, convertible: true },
  N: { kind: 'sindicalista', speed: 26, convertible: true },
  K: { kind: 'checador', speed: 38, convertible: false },
};

function readSave() {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY)) ?? {}; } catch { return {}; }
}
function writeSave(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* sem armazenamento: segue sem salvar */ }
}

/** Monta o estado inicial de uma fase (puro: usado pelo jogo e pelos testes). */
export function createRun(levelData) {
  const level = loadLevel(levelData);
  const P = level.entities.points;
  const at = (pt, extra = {}) => ({ x: pt.x, y: pt.y, w: 16, h: 16, ...extra });
  return {
    level,
    // área de coleta alta: pega a marmita mesmo passando por cima dela
    marmitas: (P.m ?? []).map((pt, i) => at(pt, { id: `m${i}`, x: pt.x + 1, y: pt.y - 24, w: 14, h: 40, drawX: pt.x + 3, drawY: pt.y + 8, taken: false })),
    // área de entrega generosa: o acampado pega a marmita no ar, mesmo com o Patrício pulando por cima
    acampados: (P.a ?? []).map((pt, i) => at(pt, { id: `a${i}`, x: pt.x - 4, y: pt.y - 40, w: 24, h: 56, fed: false, timer: 0 })),
    pendrives: (P.p ?? []).map((pt, i) => at(pt, { id: `p${i}`, x: pt.x + 4, y: pt.y + 4, w: 8, h: 8, taken: false })),
    chargers: (P.z ?? []).map((pt, i) => at(pt, { id: `z${i}`, x: pt.x + 4, y: pt.y + 6, w: 8, h: 10, taken: false })),
    enemies: Object.entries(ENEMY_KINDS).flatMap(([ch, cfg]) => (P[ch] ?? []).map((pt) => createEnemy(cfg.kind, pt.x, pt.y, cfg))),
    zaps: [],
    session: { fe: FE.max, lives: 3, score: 0, votes: 0, zap: PATRICIO_STATS.ammo, carrying: 0, delivered: 0, provas: 0, time: 0, hours72: HOURS72, maxX: 0 },
  };
}

export class MissaoGame {
  constructor(canvas, levelData, { titleScreen, missionData, checagemData }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.input = new Input(canvas);
    this.levelData = levelData;
    this.titleScreen = titleScreen;
    this.missionData = missionData;
    this.checagemData = checagemData;
    this.messages = new MessageSystem(MESSAGES_MISSAO);
    this.save = readSave();
    this.debug = new URLSearchParams(location.search).has('debug');
    this.fps = 60;
    this.time = 0;
    const skip = new URLSearchParams(location.search).has('jogar');
    this.fsm = new StateMachine(skip ? 'PLAYING' : 'TITLE', STATES);
    this.startLevel();
    addEventListener('blur', () => this.fsm.send('blur'));
    document.addEventListener('visibilitychange', () => document.hidden && this.fsm.send('blur'));
  }

  // ---------- ciclo de vida ----------
  startLevel() {
    Object.assign(this, createRun(this.levelData));
    if (!this.levelCanvas) this.levelCanvas = prerenderLevel(this.level);
    this.checkpoint = { ...this.level.entities.spawn };
    this.spawnPlayer();
    this.camera = { x: 0, y: this.level.map.pixelH - VIEW_H };
    this.snapCamera();
    this.floats = [];
    this.balloon = null;
    this.banner = null;
    this.headline = null;
    this.result = null;
    this.gateCooldown = 0;
  }

  spawnPlayer() {
    this.player = createPlayer(PATRICIO_STATS, this.checkpoint.x, this.checkpoint.y);
    Object.assign(this.player, { invuln: 0, hurtTimer: 0, throwTimer: 0, prayTimer: 0, zapCooldown: 0 });
    for (const pr of this.level.entities.promessas) Object.assign(pr, { state: 'idle', y: pr.homeY, vy: 0, solid: true, timer: 0 });
    this.zaps = [];
  }

  say(event, priority = 'normal') {
    const t = this.messages.say(event, 'any', priority);
    if (t) this.balloon = { text: t, ttl: 2.6 };
  }

  float(x, y, text, color = '#f5d000') {
    this.floats.push({ x, y, text, color, ttl: 0.9 });
  }

  // ---------- simulação ----------
  step(dt) {
    const inp = this.input.frame();
    this.time += dt;
    this.fsm.time += dt;
    this.messages.update(dt);
    if (inp.debugPressed) this.debug = !this.debug;
    const ready = this.fsm.time > 0.4;

    switch (this.fsm.state) {
      case 'TITLE':
        if (ready && (inp.confirmPressed || inp.throwPressed)) this.fsm.send('start');
        break;
      case 'MISSION':
        if (ready && (inp.confirmPressed || inp.throwPressed)) { this.startLevel(); this.fsm.send('go'); this.say('start', 'high'); }
        break;
      case 'PLAYING':
        if (inp.pausePressed) { this.fsm.send('pause'); return; }
        this.updatePlaying(inp, dt);
        break;
      case 'PAUSED':
        if (inp.pausePressed || inp.confirmPressed) this.fsm.send('resume');
        else if (inp.restartPressed) this.fsm.send('restart');
        break;
      case 'DYING':
        if (this.fsm.time > 1) {
          if (this.session.lives > 0) { this.fsm.send('respawn'); this.spawnPlayer(); this.snapCamera(); }
          else { this.headline = HEADLINES_MISSAO.gameover[0]; this.fsm.send('gameover'); }
        }
        break;
      case 'GAMEOVER':
      case 'CHECAGEM':
        if (this.fsm.time > 0.8 && (inp.confirmPressed || inp.restartPressed)) this.fsm.send('retry');
        break;
    }
    for (const f of this.floats) { f.ttl -= dt; f.y -= 18 * dt; }
    this.floats = this.floats.filter((f) => f.ttl > 0);
    if (this.balloon && (this.balloon.ttl -= dt) <= 0) this.balloon = null;
    if (this.banner && (this.banner.ttl -= dt) <= 0) this.banner = null;
  }

  updatePlaying(inp, dt) {
    const p = this.player;
    const s = this.session;
    const E = this.level.entities;
    const map = this.level.map;
    s.time += dt;
    this.gateCooldown = Math.max(0, this.gateCooldown - dt);

    // relógio das 72 horas: quando zera, recomeça
    s.hours72 -= HOURS_PER_SECOND * dt;
    if (s.hours72 <= 0) {
      s.hours72 = HOURS72;
      this.banner = { label: 'GRUPO', text: 'FALTAM 72 HORAS. AGORA VAI. (DE NOVO)', ttl: 2.5 };
      this.say('clock', 'high');
    }

    // temporizadores do jogador
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    p.throwTimer = Math.max(0, p.throwTimer - dt);
    p.prayTimer = Math.max(0, p.prayTimer - dt);
    p.zapCooldown = Math.max(0, p.zapCooldown - dt);
    const locked = p.hurtTimer > 0 || p.prayTimer > 0;
    const control = locked ? { left: false, right: false, down: false, jumpPressed: false, jumpHeld: false } : inp;

    for (const pr of E.promessas) {
      for (const ev of updatePromessa(pr, dt, p.standingOn === pr, map.pixelH)) if (ev === 'promessa:shake') this.say('promessa');
    }
    const prevBottom = p.y + p.h;
    updatePlayer(p, control, dt, map, E.promessas);

    // compartilhar corrente de Zap
    if (!locked && inp.throwPressed) {
      if (s.zap > 0 && p.zapCooldown === 0 && this.zaps.filter((z) => z.alive).length < ZAP.maxAlive) {
        s.zap--;
        p.zapCooldown = ZAP.cooldown;
        p.throwTimer = 0.2;
        this.zaps.push(createZap(p.facing > 0 ? p.x + p.w : p.x - 9, p.y + 6, p.facing));
      } else if (s.zap === 0) this.float(p.x + 5, p.y - 6, 'SEM BATERIA', '#ff6a6a');
    }

    // inimigos
    for (const e of this.enemies) {
      updateEnemy(e, dt, map);
      if (!isActive(e) || !overlaps(p, e)) continue;
      const stomp = p.vy > 0 && prevBottom <= e.y + 6;
      if (stomp) {
        p.vy = -0.7 * jumpVelocity(PATRICIO_STATS.jumpTiles);
        if (convertEnemy(e)) this.onConvert(e, SCORE.stomp);
        else if (e.state === 'walk') { stunEnemy(e); this.float(e.x + 5, e.y - 6, 'CHECAGEM ADIADA', '#9ad8ff'); }
      } else if (e.state === 'walk') {
        this.hurt(e.kind === 'checador' ? FE.hitChecador : FE.hitEnemy, e.x < p.x ? 1 : -1, e.kind === 'checador' ? 'checador' : 'hurt');
      }
    }

    // correntes de Zap
    const active = this.enemies.filter((e) => e.state === 'walk');
    const spawned = [];
    for (const z of this.zaps) {
      for (const ev of updateZap(z, dt, map, p, active)) {
        if (ev.type === 'convert' && convertEnemy(ev.enemy)) this.onConvert(ev.enemy, SCORE.convert * (ev.gen + 1));
        if (ev.type === 'spawn') spawned.push(...ev.zaps);
        if (ev.type === 'checked') this.float(ev.x, ev.y - 4, 'FAKE!', '#ff4040');
        if (ev.type === 'self' && p.invuln === 0) this.hurt(FE.hitZapSelf, -p.facing, 'zapSelf');
      }
    }
    this.zaps = [...this.zaps.filter((z) => z.alive), ...spawned].slice(0, ZAP.maxAlive);

    // coletáveis e objetivo
    const tileX = Math.floor(p.x / TILE);
    if (tileX > s.maxX) { s.score += tileX - s.maxX; s.maxX = tileX; }
    for (const v of E.votes) if (!v.taken && overlaps(p, v)) { v.taken = true; s.votes++; s.score += SCORE.vote; this.float(v.x + 4, v.y - 2, '+10'); }
    for (const m of this.marmitas) if (!m.taken && overlaps(p, m)) { m.taken = true; s.carrying++; this.float(m.drawX + 5, m.drawY - 4, '+1 MARMITA', '#ffffff'); }
    for (const c of this.chargers) if (!c.taken && overlaps(p, c)) { c.taken = true; s.zap += FE.ammoPickup; this.float(c.x + 4, c.y - 4, `+${FE.ammoPickup} ZAP`, '#7cf27c'); }
    for (const d of this.pendrives) {
      if (!d.taken && overlaps(p, d)) { d.taken = true; s.provas++; s.score += SCORE.pendrive; this.float(d.x + 4, d.y - 4, 'PROVA DA FRAUDE!'); this.say('pendrive', 'high'); }
    }
    for (const a of this.acampados) {
      a.timer += dt;
      if (!a.fed && s.carrying > 0 && overlaps(p, a)) {
        a.fed = true;
        a.timer = 0;
        s.carrying--;
        s.delivered++;
        s.score += SCORE.marmita;
        this.float(a.x + 5, a.y - 8, `MARMITA ${s.delivered}/${this.levelData.marmitasMeta}`, '#7cf27c');
        this.say('marmita', 'high');
      }
    }
    // pneu sagrado (checkpoint): o Patrício se ajoelha e reza; a Fé é restaurada
    for (const cp of E.checkpoints) {
      if (!cp.active && overlaps(p, cp)) {
        E.checkpoints.forEach((c) => (c.active = false));
        cp.active = true;
        this.checkpoint = { x: cp.spawnX, y: cp.spawnY };
        s.score += SCORE.checkpoint;
        s.fe = FE.max;
        p.prayTimer = 0.8;
        p.vx = 0;
        this.float(cp.x + 8, cp.y - 4, 'FÉ RESTAURADA', '#f5d000');
        this.say('checkpoint', 'high');
      }
    }
    // portão do quartel
    if (overlaps(p, E.finish)) {
      if (s.delivered >= this.levelData.marmitasMeta) this.complete();
      else if (this.gateCooldown === 0) {
        this.gateCooldown = 3;
        this.say('gate', 'high');
        this.float(E.finish.x + 24, E.finish.y - 8, `FALTAM ${this.levelData.marmitasMeta - s.delivered} MARMITAS`, '#ff6a6a');
      }
    }

    if (s.fe <= 0) { s.fe = 0; this.fsm.send('awake'); return; }
    if (p.y > map.pixelH + 8) this.die();
    this.updateCamera(dt);
  }

  onConvert(e, points) {
    this.session.score += points;
    this.float(e.x + 5, e.y - 8, this.messages.pick('convert', 'any'));
  }

  hurt(amount, dir, event) {
    const p = this.player;
    if (p.invuln > 0) return;
    this.session.fe = Math.max(0, this.session.fe - amount);
    p.invuln = FE.invulnerable;
    p.hurtTimer = 0.25;
    p.vx = dir * 150;
    p.vy = -200;
    this.float(p.x + 5, p.y - 8, `-${amount} FÉ`, '#ff6a6a');
    this.say(event, 'high');
  }

  die() {
    this.session.lives--;
    this.say('death', 'high');
    this.fsm.send('die');
  }

  complete() {
    const s = this.session;
    const timeBonus = Math.min(3000, Math.max(0, Math.round((this.levelData.targetTime - s.time) * 20)));
    s.score += SCORE.complete + timeBonus;
    const key = this.levelData.id;
    const records = (this.save.records ??= {});
    const prev = records[key];
    const newRecord = !prev || s.score > prev.score;
    if (newRecord) {
      records[key] = { score: s.score, time: Math.round(s.time * 10) / 10, date: new Date().toISOString().slice(0, 10) };
      writeSave(this.save);
    }
    const h = HEADLINES_MISSAO.complete;
    this.result = { timeBonus, newRecord, headline: h[Math.floor(Math.random() * h.length)] };
    this.fsm.send('win');
  }

  // ---------- câmera ----------
  updateCamera(dt) {
    const p = this.player;
    const target = p.x + p.w / 2 + p.facing * 40 - VIEW_W / 2;
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
      if (this.input.touchMode && innerHeight > innerWidth) {
        this.fsm.send('blur');
        drawRotate(this.ctx);
      } else {
        let steps = 0;
        while (acc >= STEP && steps < 5) { this.step(STEP); acc -= STEP; steps++; }
        if (steps === 5) acc = 0;
        renderMissao(this.ctx, this);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
