import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./tokens.ts";

describe("signed tokens", () => {
  it("verifies action, person and expiry", () => {
    const t = signToken("confirm_alert", "p1", "a1", 1_000);
    expect(verifyToken(t, "confirm_alert", 1_001)).toMatchObject({ a: "confirm_alert", p: "p1", r: "a1" });
    expect(verifyToken(t, "unsubscribe", 1_001)).toBeNull();
    expect(verifyToken(t, "confirm_alert", 1_000 + 8 * 86_400)).toBeNull();
  });
  it("rejects tampering", () => {
    const t = signToken("manage", "p1");
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ a: "manage", p: "p2", e: 9_999_999_999 })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`, "manage")).toBeNull();
    expect(verifyToken(`${body}.x${sig!.slice(1)}`, "manage")).toBeNull();
    expect(verifyToken("lixo", "manage")).toBeNull();
  });
});
