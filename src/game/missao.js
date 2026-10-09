// Operação Liberta o Mito — laço e regras das fases (Patrício, objetivos, Zap, Fé, 72h, pneu, mapa, Checagem).

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
import { NO_SFX } from './sfx.js';

export const STATES = {
  TITLE: { start: 'MAP' },
  MAP: { enter: 'MISSION', back: 'TITLE' },
  MISSION: { go: 'PLAYING', back: 'MAP' },
  PLAYING: { pause: 'PAUSED', blur: 'PAUSED', die: 'DYING', awake: 'GAMEOVER', win: 'CHECAGEM' },
  PAUSED: { resume: 'PLAYING', restart: 'MISSION', map: 'MAP' },
  DYING: { respawn: 'PLAYING', gameover: 'GAMEOVER' },
  GAMEOVER: { retry: 'MISSION', map: 'MAP' },
  CHECAGEM: { next: 'MAP', retry: 'MISSION' },
};

const SAVE_KEY = 'brwar.missao.v1';
const HOURS72 = 72 * 3600;
const HOURS_PER_SECOND = 3600; // 1 segundo de jogo = 1 hora no relógio do Patrício
const ENEMY_KINDS = {
  M: { kind: 'militante', speed: 32, convertible: true },
  N: { kind: 'sindicalista', speed: 26, convertible: true },
  K: { kind: 'checador', speed: 38, convertible: false },
  G: { kind: 'fiscal', speed: 30, convertible: false },
};
const URNA_LABELS = ['Vazia', 'Só voto', '0 erros', 'Auditada', 'Nada aqui', 'Tudo certo?!'];
const CONVEYOR_SPEED = 45; // px/s das esteiras rolantes
export const FISCAL_VIEW = { range: 96, height: 20 };

/** O Fiscal enxerga à frente dele, na mesma altura (atordoado ele não vê nada). */
export function fiscalSees(e, p) {
  if (e.kind !== 'fiscal' || e.state !== 'walk') return false;
  const dx = (p.x + p.w / 2 - (e.x + e.w / 2)) * e.dir;
  return dx > -6 && dx < FISCAL_VIEW.range && Math.abs(p.y + p.h / 2 - (e.y + e.h / 2)) < FISCAL_VIEW.height;
}

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
  const urnas = new Map();
  level.map.rows.forEach((row, ty) => [...row].forEach((ch, tx) => ch === 'Q' && urnas.set(`${tx},${ty}`, { tx, ty, open: false, bump: 0 })));
  return {
    level,
    // área de coleta alta: pega a marmita mesmo passando por cima dela
    marmitas: (P.m ?? []).map((pt, i) => at(pt, { id: `m${i}`, x: pt.x + 1, y: pt.y - 24, w: 14, h: 40, drawX: pt.x + 3, drawY: pt.y + 8, taken: false })),
    // área de entrega generosa: o acampado pega a marmita no ar
    acampados: (P.a ?? []).map((pt, i) => at(pt, { id: `a${i}`, x: pt.x - 4, y: pt.y - 40, w: 24, h: 56, fed: false, timer: 0 })),
    notinhas: (P.n ?? []).map((pt, i) => at(pt, { id: `n${i}`, x: pt.x + 1, y: pt.y - 16, w: 14, h: 32, drawX: pt.x + 3, drawY: pt.y + 6, taken: false })),
    caixas: (P.D ?? []).map((pt, i) => at(pt, { id: `d${i}`, x: pt.x - 2, y: pt.y - 12, w: 20, h: 28, drawX: pt.x, drawY: pt.y - 12, cooldown: 0 })),
    pendrives: (P.p ?? []).map((pt, i) => at(pt, { id: `p${i}`, x: pt.x + 4, y: pt.y + 4, w: 8, h: 8, taken: false })),
    chargers: (P.z ?? []).map((pt, i) => at(pt, { id: `z${i}`, x: pt.x + 4, y: pt.y + 6, w: 8, h: 10, taken: false })),
    enemies: Object.entries(ENEMY_KINDS).flatMap(([ch, cfg]) => (P[ch] ?? []).map((pt) => createEnemy(cfg.kind, pt.x, pt.y, cfg))),
    urnas,
    zaps: [],
    session: { fe: FE.max, lives: 3, score: 0, votes: 0, zap: PATRICIO_STATS.ammo, carrying: 0, delivered: 0, opened: 0, notinhas: 0, deposited: 0, provas: 0, time: 0, hours72: HOURS72, maxX: 0 },
  };
}

export class MissaoGame {
  /** levels: [{ data, mission, checagem }]; deps opcionais: input, sfx, prerender (para testes sem tela). */
  constructor(canvas, { levels, titleScreen, input, sfx = NO_SFX, prerender = () => null, startState }) {
    this.canvas = canvas;
    this.ctx = canvas?.getContext('2d');
    if (this.ctx) this.ctx.imageSmoothingEnabled = false;
    this.input = input;
    this.levels = levels;
    this.titleScreen = titleScreen;
    this.sfx = sfx;
    this.prerender = prerender;
    this.levelCanvases = {};
    this.messages = new MessageSystem(MESSAGES_MISSAO, { cooldown: 6 });
    this.save = readSave();
    this.unlocked = Math.min(this.save.unlocked ?? 0, levels.length - 1);
    this.levelIndex = this.unlocked;
    this.mapCursor = this.levelIndex;
    this.debug = false;
    this.fps = 60;
    this.time = 0;
    this.fsm = new StateMachine(startState ?? 'TITLE', STATES);
    this.startLevel();
  }

  get current() { return this.levels[this.levelIndex]; }
  get levelData() { return this.current.data; }

  // ---------- ciclo de vida ----------
  startLevel() {
    Object.assign(this, createRun(this.levelData));
    const id = this.levelData.id;
    if (!(id in this.levelCanvases)) this.levelCanvases[id] = this.prerender(this.level);
    this.levelCanvas = this.levelCanvases[id];
    this.checkpoint = { ...this.level.entities.spawn };
    this.spawnPlayer();
    this.camera = { x: 0, y: this.level.map.pixelH - VIEW_H };
    this.snapCamera();
    this.floats = [];
    this.dialog = null;
    this.result = null;
    this.gateCooldown = 0;
    this.hintsShown = new Set();
    this.clockResets = 0;
    this.clockFlash = 0;
  }

  spawnPlayer() {
    this.player = createPlayer(PATRICIO_STATS, this.checkpoint.x, this.checkpoint.y);
    Object.assign(this.player, { invuln: 0, hurtTimer: 0, throwTimer: 0, prayTimer: 0, zapCooldown: 0 });
    for (const pr of this.level.entities.promessas) Object.assign(pr, { state: 'idle', y: pr.homeY, vy: 0, solid: true, timer: 0 });
    this.zaps = [];
  }

  // ---------- objetivo da fase ----------
  objectiveProgress() {
    const o = this.levelData.objective;
    const s = this.session;
    return o.type === 'marmitas' ? s.delivered : o.type === 'depositos' ? s.deposited : s.opened;
  }
  objectiveDone() {
    return this.objectiveProgress() >= this.levelData.objective.meta;
  }
  objectiveText() {
    const o = this.levelData.objective;
    const s = this.session;
    const carrying = o.type === 'marmitas' && s.carrying ? ` · na mão ${s.carrying}`
      : o.type === 'depositos' && s.notinhas ? ` · no bolso ${s.notinhas}` : '';
    return `${o.label} ${this.objectiveProgress()}/${o.meta}${carrying}`;
  }

  /** Fala do Patrício (caixa de diálogo fixa no topo da tela, longe do cenário). */
  say(event, priority = 'normal') {
    const t = this.messages.say(event, 'any', priority);
    if (t) this.dialog = { speaker: 'Patrício', text: t, ttl: 3 };
  }

  /** Mensagem de outra voz: o Grupo da Família ou uma dica de jogo. */
  tell(speaker, text, ttl = 3.5) {
    this.dialog = { speaker, text, ttl };
  }

  /** Próximo alvo do objetivo (para a seta que guia o jogador). */
  objectiveTarget() {
    const p = this.player;
    const s = this.session;
    const type = this.levelData.objective.type;
    const nearest = (list) => {
      let best = null;
      for (const it of list) {
        const d = Math.abs(it.x - p.x) + Math.abs(it.y - p.y) * 0.5;
        if (!best || d < best.d) best = { d, x: it.x + it.w / 2, y: it.y };
      }
      return best;
    };
    if (this.objectiveDone()) { const F = this.level.entities.finish; return { x: F.x + 24, y: F.y + 8, kind: 'chegada' }; }
    if (type === 'marmitas') {
      if (s.carrying > 0) return { ...nearest(this.acampados.filter((a) => !a.fed).map((a) => ({ ...a, y: a.y + 24, h: 16 }))), kind: 'acampado' };
      return { ...nearest(this.marmitas.filter((m) => !m.taken).map((m) => ({ x: m.drawX, y: m.drawY, w: 10, h: 6 }))), kind: 'marmita' };
    }
    if (type === 'urnas') return { ...nearest([...this.urnas.values()].filter((u) => !u.open).map((u) => ({ x: u.tx * TILE, y: u.ty * TILE, w: 16, h: 16 }))), kind: 'urna' };
    if (type === 'depositos') {
      if (s.notinhas > 0) return { ...nearest(this.caixas.map((c) => ({ x: c.drawX, y: c.drawY, w: 16, h: 28 }))), kind: 'caixa' };
      return { ...nearest(this.notinhas.filter((n) => !n.taken).map((n) => ({ x: n.drawX, y: n.drawY, w: 10, h: 7 }))), kind: 'notinha' };
    }
    return null;
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
        if (ready && (inp.confirmPressed || inp.throwPressed)) { this.sfx.play('select'); this.fsm.send('start'); }
        break;
      case 'MAP':
        if (inp.leftPressed && this.mapCursor > 0) { this.mapCursor--; this.sfx.play('select'); }
        if (inp.rightPressed && this.mapCursor < this.unlocked) { this.mapCursor++; this.sfx.play('select'); }
        if (ready && (inp.confirmPressed || inp.throwPressed)) {
          this.levelIndex = this.mapCursor;
          this.startLevel();
          this.sfx.play('select');
          this.fsm.send('enter');
        } else if (ready && inp.pausePressed) this.fsm.send('back');
        break;
      case 'MISSION':
        if (ready && (inp.confirmPressed || inp.throwPressed)) { this.startLevel(); this.fsm.send('go'); this.say('start', 'high'); }
        else if (ready && inp.pausePressed) this.fsm.send('back');
        break;
      case 'PLAYING':
        if (inp.pausePressed) { this.fsm.send('pause'); return; }
        this.updatePlaying(inp, dt);
        break;
      case 'PAUSED':
        if (inp.pausePressed || inp.confirmPressed) this.fsm.send('resume');
        else if (inp.restartPressed) this.fsm.send('restart');
        else if (inp.throwPressed) this.fsm.send('map');
        break;
      case 'DYING':
        if (this.fsm.time > 1) {
          if (this.session.lives > 0) { this.fsm.send('respawn'); this.spawnPlayer(); this.snapCamera(); }
          else this.fsm.send('gameover');
        }
        break;
      case 'GAMEOVER':
        if (this.fsm.time > 0.8 && (inp.confirmPressed || inp.restartPressed)) this.fsm.send('retry');
        else if (this.fsm.time > 0.8 && inp.pausePressed) this.fsm.send('map');
        break;
      case 'CHECAGEM':
        if (this.fsm.time > 0.8 && inp.confirmPressed) this.fsm.send('next');
        else if (this.fsm.time > 0.8 && inp.restartPressed) this.fsm.send('retry');
        break;
    }
    for (const f of this.floats) { f.ttl -= dt; f.y -= 18 * dt; }
    this.floats = this.floats.filter((f) => f.ttl > 0);
    if (this.dialog && (this.dialog.ttl -= dt) <= 0) this.dialog = null;
    this.clockFlash = Math.max(0, this.clockFlash - dt);
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
      this.clockResets++;
      this.clockFlash = 1.5;
      // só a primeira vez vira mensagem; depois, só o relógio pisca (menos interrupção)
      if (this.clockResets === 1) this.tell('Grupo da Família', 'Faltam 72 horas. Agora vai. (De novo.)');
      this.sfx.play('clock');
    }

    // dicas do level design, mostradas uma vez quando o Patrício passa pela coluna
    for (const h of this.levelData.hints ?? []) {
      if (!this.hintsShown.has(h.col) && p.x >= h.col * TILE) { this.hintsShown.add(h.col); this.tell('Dica', h.text, 4.5); }
    }

    // temporizadores do jogador
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurtTimer = Math.max(0, p.hurtTimer - dt);
    p.throwTimer = Math.max(0, p.throwTimer - dt);
    p.prayTimer = Math.max(0, p.prayTimer - dt);
    p.zapCooldown = Math.max(0, p.zapCooldown - dt);
    for (const u of this.urnas.values()) u.bump = Math.max(0, u.bump - dt);
    const locked = p.hurtTimer > 0 || p.prayTimer > 0;
    const control = locked ? { left: false, right: false, down: false, jumpPressed: false, jumpHeld: false } : inp;

    for (const pr of E.promessas) {
      for (const ev of updatePromessa(pr, dt, p.standingOn === pr, map.pixelH)) if (ev === 'promessa:shake') this.say('promessa');
    }
    // esteiras rolantes empurram quem está em cima (aplicado como "plataforma" sob os pés)
    if (p.onGround && !p.standingOn) {
      const under = map.at(Math.floor((p.x + p.w / 2) / TILE), Math.floor((p.y + p.h + 1) / TILE));
      if (under === '>' || under === '<') p.standingOn = { dx: (under === '>' ? 1 : -1) * CONVEYOR_SPEED * dt, dy: 0, conveyor: true };
    }
    const prevBottom = p.y + p.h;
    for (const ev of updatePlayer(p, control, dt, map, E.promessas)) {
      if (ev === 'jump') this.sfx.play('jump');
      if (ev.type === 'ceiling') this.headbutt(ev.tx, ev.ty);
    }

    // compartilhar corrente de Zap
    if (!locked && inp.throwPressed) {
      if (s.zap > 0 && p.zapCooldown === 0 && this.zaps.filter((z) => z.alive).length < ZAP.maxAlive) {
        s.zap--;
        p.zapCooldown = ZAP.cooldown;
        p.throwTimer = 0.2;
        this.zaps.push(createZap(p.facing > 0 ? p.x + p.w : p.x - 9, p.y + 6, p.facing));
        this.sfx.play('zap');
      } else if (s.zap === 0) this.float(p.x + 5, p.y - 6, 'Sem bateria', '#ff6a6a');
    }

    // inimigos
    for (const e of this.enemies) {
      updateEnemy(e, dt, map);
      if (!isActive(e) || !overlaps(p, e)) continue;
      const stomp = p.vy > 0 && prevBottom <= e.y + 6;
      if (stomp) {
        p.vy = -0.7 * jumpVelocity(PATRICIO_STATS.jumpTiles);
        if (convertEnemy(e)) this.onConvert(e, SCORE.stomp);
        else if (e.state === 'walk') {
          stunEnemy(e);
          this.sfx.play('bump');
          this.float(e.x + 5, e.y - 6, e.kind === 'fiscal' ? 'Fiscalização adiada' : 'Checagem adiada', '#9ad8ff');
        }
      } else if (e.state === 'walk') {
        const event = e.kind === 'checador' ? 'checador' : e.kind === 'fiscal' ? 'fiscal' : 'hurt';
        this.hurt(e.kind === 'checador' ? FE.hitChecador : FE.hitEnemy, e.x < p.x ? 1 : -1, event);
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
    for (const v of E.votes) if (!v.taken && overlaps(p, v)) { v.taken = true; s.votes++; s.score += SCORE.vote; this.float(v.x + 4, v.y - 2, '+10'); this.sfx.play('coin'); }
    for (const m of this.marmitas) if (!m.taken && overlaps(p, m)) { m.taken = true; s.carrying++; this.float(m.drawX + 5, m.drawY - 4, '+1 marmita', '#ffffff'); this.sfx.play('coin'); }
    for (const c of this.chargers) if (!c.taken && overlaps(p, c)) { c.taken = true; s.zap += FE.ammoPickup; this.float(c.x + 4, c.y - 4, `+${FE.ammoPickup} Zap`, '#7cf27c'); this.sfx.play('coin'); }
    for (const n of this.notinhas) {
      if (n.taken || !overlaps(p, n)) continue;
      if (s.notinhas >= FE.bolsoMax) {
        if (this.gateCooldown === 0) { this.gateCooldown = 2; this.say('bolso', 'high'); this.float(p.x + 5, p.y - 8, 'Bolso cheio!', '#ff6a6a'); }
        continue;
      }
      n.taken = true;
      s.notinhas++;
      this.float(n.drawX + 5, n.drawY - 4, '+1 notinha', '#7cf27c');
      this.sfx.play('coin');
    }
    for (const c of this.caixas) {
      c.cooldown = Math.max(0, c.cooldown - dt);
      if (!s.notinhas || c.cooldown > 0 || !overlaps(p, c)) continue;
      c.cooldown = 1;
      const flagra = this.enemies.find((e) => fiscalSees(e, p));
      if (flagra) {
        // o Fiscal viu: notinhas confiscadas, Fé abalada
        this.float(c.x + 10, c.y - 8, `Fiscal viu! −${s.notinhas} notinhas`, '#ff6a6a');
        s.notinhas = 0;
        s.fe = Math.max(0, s.fe - FE.hitFlagra);
        this.say('flagra', 'high');
        this.sfx.play('hurt');
      } else {
        const n = Math.min(s.notinhas, this.levelData.objective.meta - s.deposited);
        s.deposited += n;
        s.notinhas -= n;
        s.score += SCORE.deposito * n;
        this.float(c.x + 10, c.y - 8, `Depósito fracionado +${n}`, '#7cf27c');
        this.say('deposito', 'high');
        this.sfx.play('deliver');
      }
    }
    for (const d of this.pendrives) {
      if (!d.taken && overlaps(p, d)) { d.taken = true; s.provas++; s.score += SCORE.pendrive; this.float(d.x + 4, d.y - 4, 'Prova da fraude!'); this.say('pendrive', 'high'); this.sfx.play('coin'); }
    }
    for (const a of this.acampados) {
      a.timer += dt;
      if (!a.fed && s.carrying > 0 && overlaps(p, a)) {
        a.fed = true;
        a.timer = 0;
        s.carrying--;
        s.delivered++;
        s.score += SCORE.marmita;
        this.float(a.x + 9, a.y + 24, `Marmita ${s.delivered}/${this.levelData.objective.meta}`, '#7cf27c');
        this.say('marmita', 'high');
        this.sfx.play('deliver');
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
        this.float(cp.x + 8, cp.y - 4, 'Fé restaurada', '#f5d000');
        this.say('checkpoint', 'high');
        this.sfx.play('checkpoint');
      }
    }
    // chegada (portão / sala): só com o objetivo cumprido
    if (overlaps(p, E.finish)) {
      if (this.objectiveDone()) this.complete();
      else if (this.gateCooldown === 0) {
        this.gateCooldown = 3;
        this.say(this.levelData.objective.type === 'marmitas' ? 'gate' : 'objetivo', 'high');
        const o = this.levelData.objective;
        this.float(E.finish.x + 24, E.finish.y - 8, `Faltam ${o.meta - this.objectiveProgress()} (${o.label.toLowerCase()})`, '#ff6a6a');
      }
    }

    if (s.fe <= 0) { s.fe = 0; this.sfx.play('die'); this.fsm.send('awake'); return; }
    if (p.y > map.pixelH + 8) this.die();
    this.updateCamera(dt);
  }

  /** Cabeçada por baixo num bloco: se for urna fechada, "audita" (abre). */
  headbutt(tx, ty) {
    const u = this.urnas.get(`${tx},${ty}`);
    if (!u) return;
    u.bump = 0.15;
    if (u.open) { this.sfx.play('bump'); return; }
    u.open = true;
    const s = this.session;
    s.opened++;
    s.votes++;
    s.score += SCORE.urna + SCORE.vote;
    this.float(tx * TILE + 8, ty * TILE - 6, URNA_LABELS[s.opened % URNA_LABELS.length], '#ffffff');
    this.say('urna', s.opened === 1 ? 'high' : 'normal');
    this.sfx.play('urna');
  }

  onConvert(e, points) {
    this.session.score += points;
    this.float(e.x + 5, e.y - 8, this.messages.pick('convert', 'any'));
    this.sfx.play('convert');
  }

  hurt(amount, dir, event) {
    const p = this.player;
    if (p.invuln > 0) return;
    this.session.fe = Math.max(0, this.session.fe - amount);
    p.invuln = FE.invulnerable;
    p.hurtTimer = 0.25;
    p.vx = dir * 150;
    p.vy = -200;
    this.float(p.x + 5, p.y - 8, `−${amount} Fé`, '#ff6a6a');
    this.say(event, 'high');
    this.sfx.play('hurt');
  }

  die() {
    this.session.lives--;
    this.say('death', 'high');
    this.sfx.play('die');
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
    if (newRecord) records[key] = { score: s.score, time: Math.round(s.time * 10) / 10, date: new Date().toISOString().slice(0, 10) };
    // libera a próxima fase jogável
    const next = Math.min(this.levelIndex + 1, this.levels.length - 1);
    this.unlocked = Math.max(this.unlocked, next);
    this.save.unlocked = this.unlocked;
    this.mapCursor = next;
    writeSave(this.save);
    const h = HEADLINES_MISSAO[key] ?? HEADLINES_MISSAO.complete;
    this.result = { timeBonus, newRecord, headline: h[Math.floor(Math.random() * h.length)] };
    this.sfx.play('win');
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
  run(render, drawRotate) {
    addEventListener('blur', () => this.fsm.send('blur'));
    document.addEventListener('visibilitychange', () => document.hidden && this.fsm.send('blur'));
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
        render(this.ctx, this);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
