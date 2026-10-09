/** Alertas de preço, newsletter e LGPD contra Postgres real (TEST_DATABASE_URL). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../client.ts";
import { createTestDatabase } from "../test-db.ts";
import {
  cancelAlert, confirmAlert, confirmNewsletter, deletePerson, deliverOutbox, evaluatePriceAlerts, exportPersonData, getAccount,
  PeopleError, requestManageLink, requestNewsletter, requestPriceAlert, unsubscribeAll, verifyToken, type Mailer,
} from "./index.ts";

const url = process.env.TEST_DATABASE_URL;

/** Extrai o token do link do último e-mail enviado para o endereço. */
async function lastLinkToken(sql: Sql, email: string, kind: string): Promise<string> {
  const [m] = await sql<{ text_body: string }[]>`SELECT text_body FROM ops.email_outbox WHERE to_email = ${email} AND kind = ${kind} ORDER BY created_at DESC LIMIT 1`;
  return decodeURIComponent(m!.text_body.match(/[?&]t=([^\s&]+)/)![1]!);
}

describe.skipIf(!url)("alertas e newsletter (Postgres)", () => {
  let sql: Sql;
  let drop: () => Promise<void>;
  const email = "Maria.Teste@Exemplo.com";

  beforeAll(async () => {
    ({ sql, drop } = await createTestDatabase(url!, "people"));
    await sql`UPDATE commerce.offer SET last_checked_at = now()`; // ofertas "frescas"
  }, 60_000);
  afterAll(async () => {
    await drop?.();
  });

  it("validates input and products", async () => {
    await expect(requestPriceAlert(sql, { email: "nao-e-email", productSlug: "orbita-s9", kind: "any_drop" })).rejects.toBeInstanceOf(PeopleError);
    await expect(requestPriceAlert(sql, { email, productSlug: "nao-existe", kind: "any_drop" })).rejects.toMatchObject({ code: "not_found" });
    await expect(requestPriceAlert(sql, { email, productSlug: "orbita-s9", kind: "target_price" })).rejects.toMatchObject({ code: "invalid_input" });
  });

  it("double opt-in: alert stays pending until the e-mail link is clicked", async () => {
    const r = await requestPriceAlert(sql, { email, productSlug: "orbita-s9", kind: "target_price", targetPrice: 2000, ipHash: "ip1" });
    expect(r.status).toBe("pending");
    const token = await lastLinkToken(sql, "maria.teste@exemplo.com", "confirm_alert");
    expect(await confirmAlert(sql, token)).toMatchObject({ productPath: "/celulares/orbita-s9" });
    // Pessoa confirmada: próximos alertas já nascem ativos, sem novo e-mail de confirmação.
    const r2 = await requestPriceAlert(sql, { email, productSlug: "kaiju-volt", kind: "any_drop" });
    expect(r2.status).toBe("active");
    const [c] = await sql`SELECT count(*)::int AS n FROM people.consent c JOIN people.person p ON p.id = c.person_id WHERE p.email = 'maria.teste@exemplo.com' AND c.purpose = 'price_alerts' AND c.granted`;
    expect(c!.n).toBe(2);
  });

  it("rate-limits repeated requests per e-mail", async () => {
    await expect(Promise.all(Array.from({ length: 6 }, () => requestPriceAlert(sql, { email: "spam@exemplo.com", productSlug: "orbita-a5", kind: "any_drop" }))))
      .rejects.toMatchObject({ code: "rate_limited" });
  });

  it("notifies when the target price is reached, links to our page (never affiliate) and fulfils the alert", async () => {
    expect((await evaluatePriceAlerts(sql)).notified).toBe(0);
    await sql`UPDATE commerce.offer o SET price_cash = 1950, shipping_cost = 0 FROM catalog.product_variant v
              WHERE v.id = o.variant_id AND v.sku = 'v-orbita-s9-256gb' AND o.merchant_id = (SELECT id FROM commerce.merchant WHERE slug = 'loja-alfa')`;
    const r = await evaluatePriceAlerts(sql);
    expect(r.notified).toBe(1);
    const [m] = await sql<{ html: string; text_body: string; headers: Record<string, string>; subject: string }[]>`
      SELECT html, text_body, headers, subject FROM ops.email_outbox WHERE kind = 'price_alert' ORDER BY created_at DESC LIMIT 1`;
    expect(m!.subject).toContain("1.950");
    expect(m!.text_body).toContain("/celulares/orbita-s9?utm_source=alerta");
    expect(m!.html).not.toMatch(/\/go\/|loja-alfa\.example/);
    expect(m!.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    const [a] = await sql`SELECT status FROM people.price_alert WHERE kind = 'target_price' AND target_price = 2000`;
    expect(a!.status).toBe("fulfilled");
    expect((await evaluatePriceAlerts(sql)).notified).toBe(0); // não repete
  });

  it("delivers the outbox with retries", async () => {
    let fail = true;
    const mailer: Mailer = { name: "test", send: async () => { if (fail) throw new Error("smtp fora"); return { id: "ok" }; } };
    const first = await deliverOutbox(sql, mailer);
    expect(first.retried).toBeGreaterThan(0);
    fail = false;
    await sql`UPDATE ops.email_outbox SET next_attempt_at = now() WHERE status = 'queued'`;
    const second = await deliverOutbox(sql, mailer);
    expect(second.sent).toBe(first.retried);
  });

  it("newsletter double opt-in, manage link and one-click unsubscribe", async () => {
    await requestNewsletter(sql, "joao@exemplo.com");
    expect(await confirmNewsletter(sql, await lastLinkToken(sql, "joao@exemplo.com", "confirm_newsletter"))).toBe(true);
    await requestManageLink(sql, "joao@exemplo.com");
    await requestManageLink(sql, "ninguem@exemplo.com"); // não revela se existe
    const manage = verifyToken(await lastLinkToken(sql, "joao@exemplo.com", "manage_link"), "manage");
    const acc = await getAccount(sql, manage!.p);
    expect(acc!.person.newsletter_status).toBe("subscribed");
    await unsubscribeAll(sql, manage!.p);
    expect((await getAccount(sql, manage!.p))!.person.newsletter_status).toBe("unsubscribed");
  });

  it("exports and deletes personal data (LGPD)", async () => {
    const [p] = await sql<{ id: string }[]>`SELECT id FROM people.person WHERE email = 'maria.teste@exemplo.com'`;
    const acc = await getAccount(sql, p!.id);
    await cancelAlert(sql, p!.id, acc!.alerts[0]!.id);
    const data = await exportPersonData(sql, p!.id);
    expect(data.consents.length).toBeGreaterThan(0);
    expect(data.alerts.length).toBeGreaterThan(0);
    await deletePerson(sql, p!.id);
    const [after] = await sql`SELECT email, deleted_at FROM people.person WHERE id = ${p!.id}`;
    expect(after!.email).toBeNull();
    expect(after!.deleted_at).not.toBeNull();
    const [left] = await sql`SELECT (SELECT count(*) FROM people.price_alert WHERE person_id = ${p!.id})::int AS alerts, (SELECT count(*) FROM ops.email_outbox WHERE person_id = ${p!.id})::int AS emails`;
    expect(left).toEqual({ alerts: 0, emails: 0 });
    expect(await getAccount(sql, p!.id)).toBeNull();
  });
});
