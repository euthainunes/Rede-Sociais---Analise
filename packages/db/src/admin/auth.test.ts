import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, hashPassword, otpauthUri, totp, verifyPassword, verifyTotp } from "./crypto.ts";
import { can } from "./rbac.ts";

describe("password", () => {
  it("hashes with scrypt and verifies", () => {
    const h = hashPassword("uma senha bem longa");
    expect(h.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(verifyPassword("uma senha bem longa", h)).toBe(true);
    expect(verifyPassword("outra senha qualquer", h)).toBe(false);
  });
  it("rejects short passwords", () => {
    expect(() => hashPassword("curta")).toThrow();
  });
});

describe("totp (RFC 6238)", () => {
  const rfcKey = Buffer.from("12345678901234567890");
  it("matches the RFC test vectors (SHA1, 8 digits)", () => {
    expect(totp(rfcKey, 59_000, 8)).toBe("94287082");
    expect(totp(rfcKey, 1111111109_000, 8)).toBe("07081804");
    expect(totp(rfcKey, 20000000000_000, 8)).toBe("65353130");
  });
  it("round-trips base32 and accepts ±1 step", () => {
    const secret = base32Encode(rfcKey);
    expect(base32Decode(secret).equals(rfcKey)).toBe(true);
    const t = 1_700_000_000_000;
    expect(verifyTotp(secret, totp(secret, t - 30_000), t)).toBe(true);
    expect(verifyTotp(secret, totp(secret, t - 90_000), t)).toBe(false);
    expect(verifyTotp(secret, "abc123", t)).toBe(false);
    expect(otpauthUri(secret, "a@b.c", "Veredito")).toContain(`secret=${secret}`);
  });
});

describe("rbac", () => {
  it("keeps the commercial firewall", () => {
    expect(can("editor", "commission:read")).toBe(false);
    expect(can("comercial", "scores:adjust")).toBe(false);
    expect(can("comercial", "content:write")).toBe(false);
    expect(can("editor_chefe", "content:publish")).toBe(true);
    expect(can("leitor", "catalog:write")).toBe(false);
  });
});
