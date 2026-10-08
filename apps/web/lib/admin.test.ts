import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({}));
vi.mock("next/navigation", () => ({}));
vi.mock("@veredito/db", () => ({}));
vi.mock("@veredito/db/admin", () => ({}));

const { parseSections, sectionsToText } = await import("./admin.ts");

describe("admin section parsing", () => {
  it("round-trips markdown-like sections", () => {
    const raw = "## Resumo\nBom celular.\n\n## Câmera\nÓtima.\nDe noite também.";
    const s = parseSections(raw);
    expect(s).toEqual([{ heading: "Resumo", text: "Bom celular." }, { heading: "Câmera", text: "Ótima.\nDe noite também." }]);
    expect(parseSections(sectionsToText(s))).toEqual(s);
  });
});
