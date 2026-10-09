/**
 * Interpretação determinística de intenção para busca e consultor ("celular até 3 mil para foto e jogo").
 * Funciona sem LLM; o LLM pode refinar depois, mas a saída sempre passa por este formato validado.
 */
import type { Priority, UserProfile } from "@veredito/core";

export interface ParsedIntent {
  category: string | null;
  budgetMax: number | null;
  priorities: Partial<Record<string, Priority>>;
  exclude: Record<string, string[]>;
  mustHave: string[];
  ranges: Record<string, { min?: number; max?: number }>;
  brands: string[];
  /** Termos que sobraram para busca textual. */
  freeText: string;
  /** Pontos que ainda precisam ser perguntados ao usuário. */
  missing: ("budget" | "use")[];
}

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const CATEGORY_WORDS: Record<string, string[]> = {
  celulares: ["celular", "celulares", "smartphone", "smartphones", "iphone", "telefone"],
  notebooks: ["notebook", "notebooks", "laptop", "macbook"],
  tablets: ["tablet", "tablets", "ipad"],
  smartwatches: ["smartwatch", "relogio inteligente", "apple watch"],
};

const PRIORITY_WORDS: [RegExp, string][] = [
  [/\b(foto|fotos|camera|cameras|fotografia|selfie|video|videos|filmar)\b/, "camera"],
  [/\b(jogo|jogos|jogar|games?|gamer|desempenho|rapido|performance)\b/, "performance"],
  [/\b(bateria|autonomia|dura o dia|carregamento)\b/, "battery"],
  [/\b(tela|brilho|amoled|oled)\b/, "display"],
  [/\b(atualizac|suporte longo|durar anos)\w*/, "software"],
  [/\b(resistente|agua|ip68|robusto)\b/, "build"],
  [/\b(barato|custo beneficio|economico|em conta)\b/, "value"],
];

const KNOWN_BRANDS = ["samsung", "apple", "motorola", "xiaomi", "realme", "asus", "lenovo", "dell", "acer", "lg", "google", "oneplus", "nebula", "orbita"];

/** "até 3 mil", "até R$ 3.000", "3000 reais", "máximo 2,5 mil" */
export function parseBudget(q: string): number | null {
  const s = norm(q);
  const m = s.match(/(?:ate|max(?:imo)?|menos de|abaixo de|no maximo)\s*(?:r\$\s*)?(\d+(?:[.,]\d+)?)\s*(mil|k)?/) ??
    s.match(/(?:r\$\s*)(\d+(?:[.,]\d+)?)\s*(mil|k)?/) ??
    s.match(/(\d+(?:[.,]\d+)?)\s*(mil|k)?\s*reais/);
  if (!m) return null;
  let raw = m[1]!;
  const thousands = Boolean(m[2]);
  if (/^\d{1,3}\.\d{3}$/.test(raw)) raw = raw.replace(".", "");
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n)) return null;
  const v = thousands ? n * 1000 : n;
  return v >= 100 ? Math.round(v) : null;
}

export function parseIntent(query: string, defaultCategory: string | null = null): ParsedIntent {
  const s = norm(query);
  let category = defaultCategory;
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) if (words.some((w) => s.includes(w))) category = cat;

  const priorities: Partial<Record<string, Priority>> = {};
  for (const [re, key] of PRIORITY_WORDS) if (re.test(s)) priorities[key] = "high";

  const exclude: Record<string, string[]> = {};
  if (/\b(iphone|ios)\b/.test(s)) exclude.os = ["android"];
  else if (/\bandroid\b/.test(s)) exclude.os = ["ios"];

  const mustHave: string[] = [];
  if (/\b5g\b/.test(s)) mustHave.push("five_g");
  if (/\bnfc\b/.test(s)) mustHave.push("nfc");

  const ranges: Record<string, { min?: number; max?: number }> = {};
  if (/\b(pequeno|compacto|menor)\b/.test(s)) ranges.screen_inches = { max: 6.3 };

  const brands = KNOWN_BRANDS.filter((b) => new RegExp(`\\b${b}\\b`).test(s));
  if (/\biphone\b/.test(s) && !brands.includes("apple")) brands.push("apple");

  const budgetMax = parseBudget(query);
  const missing: ParsedIntent["missing"] = [];
  if (budgetMax == null && !priorities.value) missing.push("budget");
  if (Object.keys(priorities).length === 0) missing.push("use");

  const freeText = s
    .replace(/(?:ate|max(?:imo)?|menos de|abaixo de|no maximo)\s*(?:r\$\s*)?\d+(?:[.,]\d+)?\s*(mil|k)?/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { category, budgetMax, priorities, exclude, mustHave, ranges, brands, freeText, missing };
}

export function intentToProfile(i: ParsedIntent): UserProfile {
  return { priorities: i.priorities, budgetMax: i.budgetMax, exclude: i.exclude, mustHave: i.mustHave, ranges: i.ranges };
}
