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

export function dateBR(iso: string): string {
  return new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function dateTimeBR(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
