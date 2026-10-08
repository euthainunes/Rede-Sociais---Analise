import { describe, expect, it } from "vitest";
import { autoConclusions, comparisonRows, winnersByCriterion, type ComparedProduct } from "./compare.ts";

const sc = (camera: number, battery: number) => ({
  methodologyVersion: "v1.0",
  overall: null,
  criteria: {
    camera: { key: "camera", objective: camera, adjust: 0, final: camera, evidence: [] },
    battery: { key: "battery", objective: battery, adjust: 0, final: battery, evidence: [] },
  },
});
const products: ComparedProduct[] = [
  { id: "a", name: "A", scores: sc(9.1, 8.0), price: 7000 },
  { id: "b", name: "B", scores: sc(8.7, 8.05), price: 6000 },
];

describe("compare", () => {
  it("finds winners and ties", () => {
    const w = winnersByCriterion(products, ["camera", "battery"]);
    expect(w.find((x) => x.criterion === "camera")!.productId).toBe("a");
    expect(w.find((x) => x.criterion === "battery")!.productId).toBeNull();
    expect(w.find((x) => x.criterion === "price")!.productId).toBe("b");
  });

  it("writes rule-based conclusions", () => {
    const c = autoConclusions(products, ["camera", "battery"], { camera: "Câmera", battery: "Bateria" });
    expect(c).toEqual(["Se você prioriza câmera → A.", "Se você quer gastar menos → B."]);
  });

  it("flags differing rows", () => {
    const rows = comparisonRows([{ ram: 8, nfc: true }, { ram: 12, nfc: true }], ["ram", "nfc"]);
    expect(rows.map((r) => r.differs)).toEqual([true, false]);
  });
});
