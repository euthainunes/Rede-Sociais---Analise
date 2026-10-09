import { describe, expect, it } from "vitest";
import { assertPublicUrl, isPrivateIp, UnsafeUrlError } from "./net.ts";

describe("SSRF protection", () => {
  it("classifies private and public IPs", () => {
    for (const ip of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "172.20.0.1", "192.168.0.10", "100.64.1.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"]) {
      expect(isPrivateIp(ip), ip).toBe(true);
    }
    for (const ip of ["8.8.8.8", "172.32.0.1", "200.147.1.1", "2606:4700::1111"]) expect(isPrivateIp(ip), ip).toBe(false);
  });

  it("rejects http, credentials and internal hosts", async () => {
    await expect(assertPublicUrl("http://example.com/feed.csv")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicUrl("https://user:pass@example.com/x")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicUrl("https://127.0.0.1/x")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicUrl("https://[::1]/x")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicUrl("https://169.254.169.254/latest/meta-data")).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertPublicUrl("https://localhost/x")).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});
