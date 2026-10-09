// Seleção de frases sem repetição ("saco embaralhado") e com intervalo mínimo entre balões (§6.2).

export class MessageSystem {
  constructor(messages, { random = Math.random, cooldown = 4 } = {}) {
    this.messages = messages;
    this.random = random;
    this.cooldown = cooldown;
    this.bags = new Map();
    this.last = new Map();
    this.sinceLast = Infinity;
  }

  update(dt) {
    this.sinceLast += dt;
  }

  /** Próxima frase para o evento/personagem, sem repetir até esgotar o saco. */
  pick(event, character) {
    const key = `${event}|${character}`;
    let bag = this.bags.get(key);
    if (!bag || bag.length === 0) {
      const pool = this.messages.filter((m) => m.event === event && (m.character === 'any' || m.character === character)).map((m) => m.text);
      if (pool.length === 0) return null;
      bag = shuffle(pool, this.random);
      // a primeira do novo saco não pode repetir a última mostrada
      if (bag.length > 1 && bag[bag.length - 1] === this.last.get(key)) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
      this.bags.set(key, bag);
    }
    const text = bag.pop();
    this.last.set(key, text);
    return text;
  }

  /** Igual a pick, mas respeita o intervalo mínimo (exceto prioridade alta). */
  say(event, character, priority = 'normal') {
    if (priority !== 'high' && this.sinceLast < this.cooldown) return null;
    const text = this.pick(event, character);
    if (text) this.sinceLast = 0;
    return text;
  }
}

function shuffle(list, random) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
