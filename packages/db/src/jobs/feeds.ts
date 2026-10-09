/** Cadastro de fontes de feed agendadas (usado pelo painel). */
import { randomUUID } from "node:crypto";
import type { Sql } from "../client.ts";
import { audit } from "../admin/audit.ts";
import type { Staff } from "../admin/auth.ts";
import { requirePermission, ValidationError } from "../admin/catalog.ts";
import { ensureMerchant, type FeedFormat } from "../admin/offers.ts";
import { assertPublicUrl, type NetOptions } from "./net.ts";

export async function addFeedSource(
  sql: Sql,
  staff: Staff,
  input: { merchantName: string; programKey?: string | null; url: string; format: FeedFormat; intervalMinutes: number },
  net: NetOptions = {},
): Promise<string> {
  requirePermission(staff, "offers:write");
  try {
    await assertPublicUrl(input.url, net);
  } catch (e) {
    throw new ValidationError([`URL recusada: ${e instanceof Error ? e.message : e}`]);
  }
  if (input.intervalMinutes < 30) throw new ValidationError(["intervalo mínimo de 30 minutos"]);
  const merchantId = await ensureMerchant(sql, staff, input.merchantName, input.programKey ?? null);
  const id = randomUUID();
  await sql`
    INSERT INTO ops.feed_source (id, merchant_id, url, format, interval_minutes, created_by)
    VALUES (${id}, ${merchantId}, ${input.url}, ${input.format}, ${input.intervalMinutes}, ${staff.id})
    ON CONFLICT (merchant_id, url) DO UPDATE SET format = EXCLUDED.format, interval_minutes = EXCLUDED.interval_minutes, active = true`;
  await audit(sql, staff, "feed_source.save", { type: "feed_source", id }, { after: { url: input.url, intervalMinutes: input.intervalMinutes } });
  return id;
}

export async function setFeedSourceActive(sql: Sql, staff: Staff, id: string, active: boolean) {
  requirePermission(staff, "offers:write");
  await sql`UPDATE ops.feed_source SET active = ${active} WHERE id = ${id}`;
  await audit(sql, staff, active ? "feed_source.enable" : "feed_source.disable", { type: "feed_source", id });
}

export async function listFeedSources(sql: Sql) {
  return sql<{ id: string; merchant: string; url: string; format: string; interval_minutes: number; active: boolean; last_run_at: Date | null; last_status: string | null; last_error: string | null }[]>`
    SELECT f.id, m.name AS merchant, f.url, f.format, f.interval_minutes, f.active, f.last_run_at, f.last_status, f.last_error
    FROM ops.feed_source f JOIN commerce.merchant m ON m.id = f.merchant_id ORDER BY m.name`;
}
