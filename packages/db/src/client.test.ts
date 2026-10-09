import { describe, expect, it } from "vitest";
import { usesTransactionPooler } from "./client.ts";

describe("usesTransactionPooler", () => {
  it("detects Supabase transaction pooler and PgBouncer", () => {
    expect(usesTransactionPooler("postgresql://u:p@aws-0-us-east-2.pooler.supabase.com:6543/postgres", {})).toBe(true);
    expect(usesTransactionPooler("postgres://u:p@h:5432/db?pgbouncer=true", {})).toBe(true);
    expect(usesTransactionPooler("postgresql://u:p@aws-0-us-east-2.pooler.supabase.com:5432/postgres", {})).toBe(false);
    expect(usesTransactionPooler("postgres://localhost/db", {})).toBe(false);
  });
  it("respects an explicit override", () => {
    expect(usesTransactionPooler("postgres://h:6543/db", { DATABASE_PREPARE: "true" })).toBe(false);
    expect(usesTransactionPooler("postgres://h:5432/db", { DATABASE_PREPARE: "false" })).toBe(true);
  });
});
