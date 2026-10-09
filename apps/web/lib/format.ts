const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const brl2 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const num = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function money(v: number | null | undefined, cents = false): string {
  if (v == null) return "—";
  return (cents ? brl2 : brl).format(v);
}

export function score(v: number | null | undefined): string {
  return v == null ? "—" : v.toFixed(1).replace(".", ",");
}

export function pct(v: number | null | undefined, signed = false): string {
  if (v == null) return "—";
  const s = `${num.format(Math.abs(v) * 100)}%`;
  return signed ? `${v < 0 ? "−" : "+"}${s}` : s;
}

export function formatSpec(value: unknown, unit?: string, enumValues?: { key: string; label: string }[]): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  const e = enumValues?.find((x) => x.key === value);
  if (e) return e.label;
  const v = typeof value === "number" ? num.format(value) : String(value);
  return unit ? `${v} ${unit}` : v;
}

/** Todas as datas do site e do painel saem no horário de Brasília, independente do fuso do servidor (UTC na Netlify). */
const TZ = "America/Sao_Paulo";
type When = Date | string;
const asDate = (d: When) => (d instanceof Date ? d : new Date(d.length === 10 ? `${d}T12:00:00Z` : d));

/** 09/10/2026 */
export function dateBR(d: When): string {
  return asDate(d).toLocaleDateString("pt-BR", { timeZone: TZ });
}

/** 09/10, 14:19 */
export function dateTimeBR(d: When): string {
  return asDate(d).toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/** 09/10/2026, 14:19:05 — para auditoria e registros. */
export function fullDateTimeBR(d: When): string {
  return asDate(d).toLocaleString("pt-BR", { timeZone: TZ });
}

/** 14:19 */
export function timeBR(d: When): string {
  return asDate(d).toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
