/**
 * Imagens de compartilhamento (Open Graph) geradas no servidor (backlog 5.6).
 * Um único layout: sobrancelha, título, até 3 destaques e rodapé com a marca. Sem fontes ou imagens externas.
 */
import { ImageResponse } from "next/og";
import { brand } from "@veredito/brand";

export const OG_SIZE = { width: 1200, height: 630 };

const C = { bg: "#ffffff", ink: "#101828", soft: "#475467", line: "#e4e7ec", brand: "#1f5eff", brandSoft: "#e8efff" };
export const LABEL_COLORS: Record<string, string> = { excellent: "#c4320a", good: "#067647", normal: "#b54708", high: "#b42318" };

export interface OgStat {
  label: string;
  value: string;
  color?: string;
}

/** `layout: "list"`: um destaque por linha (para nomes longos, como as escolhas de um guia). */
export function ogCard(opts: { eyebrow: string; title: string; stats?: OgStat[]; footnote?: string; layout?: "row" | "list" }) {
  const list = opts.layout === "list";
  const titleSize = opts.title.length > 48 ? 56 : 68;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: C.bg, padding: "64px 72px", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 28, color: C.brand, fontWeight: 700, textTransform: "uppercase", letterSpacing: 2 }}>{opts.eyebrow}</div>
        <div style={{ display: "flex", fontSize: titleSize, fontWeight: 800, color: C.ink, lineHeight: 1.1, marginTop: 20 }}>{opts.title}</div>
        <div style={{ display: "flex", flexDirection: list ? "column" : "row", gap: list ? 12 : 24, marginTop: "auto" }}>
          {(opts.stats ?? []).slice(0, 3).map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: list ? "row" : "column", alignItems: list ? "center" : "flex-start", padding: list ? "12px 24px" : "20px 28px", borderRadius: list ? 14 : 20, background: C.brandSoft, minWidth: 220 }}>
              <div style={{ display: "flex", fontSize: 24, color: C.soft, width: list ? 260 : undefined }}>{s.label}</div>
              <div style={{ display: "flex", fontSize: list ? 32 : 44, fontWeight: 800, color: s.color ?? C.ink, marginTop: list ? 0 : 6 }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 36, paddingTop: 24, borderTop: `2px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 44, height: 44, borderRadius: 10, background: C.brand, color: "#fff", fontSize: 30, fontWeight: 800, alignItems: "center", justifyContent: "center" }}>V</div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: C.ink }}>{brand.name}</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: C.soft }}>{opts.footnote ?? brand.tagline}</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
