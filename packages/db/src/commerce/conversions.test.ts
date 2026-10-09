import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { nextStatus, postbackToConversions, verifyPostbackSignature } from "./conversions.ts";

describe("commission status machine", () => {
  it("only moves forward or reverses", () => {
    expect(nextStatus(null, "estimated")).toBe("estimated");
    expect(nextStatus("estimated", "approved")).toBe("approved");
    expect(nextStatus("approved", "validating")).toBeNull(); // relatório atrasado
    expect(nextStatus("paid", "reversed")).toBe("reversed");
    expect(nextStatus("reversed", "approved")).toBeNull();
    expect(nextStatus("approved", "approved")).toBeNull();
  });
});

describe("postback", () => {
  it("verifies HMAC signatures", () => {
    const body = JSON.stringify({ transaction_id: "T1" });
    const secret = "segredo-da-rede-123456";
    const sig = createHmac("sha256", secret).update(body).digest("hex");
    expect(verifyPostbackSignature(body, sig, secret)).toBe(true);
    expect(verifyPostbackSignature(body, `sha256=${sig}`, secret)).toBe(true);
    expect(verifyPostbackSignature(`${body} `, sig, secret)).toBe(false);
    expect(verifyPostbackSignature(body, sig, undefined)).toBe(false);
    expect(verifyPostbackSignature(body, "zz", secret)).toBe(false);
  });
  it("maps payloads", () => {
    const c = postbackToConversions([{ transaction_id: "T9", click_ref: "abc", commission: "12.5", sale_amount: 500, status: "approved", date: "2026-10-01T10:00:00Z" }, { nope: 1 }]);
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ externalId: "T9", clickRef: "abc", commission: 12.5, orderValue: 500, status: "approved" });
  });
});
