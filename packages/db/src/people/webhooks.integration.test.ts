/** Webhooks para CRM contra Postgres real (TEST_DATABASE_URL) e um receptor HTTP local. */
import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../client.ts";
import { createTestDatabase } from "../test-db.ts";
import { createStaff, ForbiddenError, ValidationError, type Staff } from "../admin/index.ts";
import {
  confirmNewsletter, createWebhookEndpoint, deletePerson, deliverWebhooks, listWebhookEndpoints, requestNewsletter,
  requestPriceAlert, retryWebhookDelivery, sendWebhookTest, setWebhookEndpointActive, signWebhook, unsubscribeAll,
} from "./index.ts";

const url = process.env.TEST_DATABASE_URL;

type Hit = { headers: Record<string, string | string[] | undefined>; body: string };

describe.skipIf(!url)("webhooks de CRM (Postgres)", () => {
  let sql: Sql;
  let drop: () => Promise<void>;
  let server: Server;
  let base: string;
  let admin: Staff;
  const hits: Hit[] = [];
  let failNext = 0;
  const net = { allowPrivate: true, timeoutMs: 3000 };

  const tokenFor = async (email: string, kind: string) => {
    const [m] = await sql<{ text_body: string }[]>`SELECT text_body FROM ops.email_outbox WHERE to_email = ${email} AND kind = ${kind} ORDER BY created_at DESC LIMIT 1`;
    return decodeURIComponent(m!.text_body.match(/[?&]t=([^\s&]+)/)![1]!);
  };
  const deliveries = () => sql<{ event: string; status: string; attempts: number; payload: Record<string, unknown>; last_error: string | null; next_attempt_at: Date }[]>`
    SELECT event, status, attempts, payload, last_error, next_attempt_at FROM ops.webhook_delivery ORDER BY created_at`;

  beforeAll(async () => {
    ({ sql, drop } = await createTestDatabase(url!, "hooks"));
    await sql`UPDATE commerce.offer SET last_checked_at = now()`;
    admin = { email: "adm@ex.com", name: "Adm", role: "admin", id: (await createStaff(sql, { email: "adm@ex.com", name: "Adm", role: "admin", password: "senha-longa-de-teste-123" })).id };
    server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        hits.push({ headers: req.headers, body });
        if (failNext > 0) {
          failNext--;
          res.writeHead(503).end();
        } else res.writeHead(204).end();
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  }, 60_000);
  afterAll(async () => {
    server?.closeAllConnections();
    await new Promise((r) => server?.close(r));
    await drop?.();
  });

  it("only admins manage endpoints; URLs must be https and public", async () => {
    const editor: Staff = { ...admin, role: "editor" };
    await expect(createWebhookEndpoint(sql, editor, { name: "CRM", url: "https://crm.example.com/hook", events: ["newsletter.subscribed"] })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(createWebhookEndpoint(sql, admin, { name: "CRM", url: "http://127.0.0.1/hook", events: ["newsletter.subscribed"] })).rejects.toBeInstanceOf(ValidationError);
    await expect(createWebhookEndpoint(sql, admin, { name: "CRM", url: "https://crm.example.com/hook", events: ["nada"] })).rejects.toThrow(/evento/);
  });

  it("signs and delivers person events once per real transition", async () => {
    const { secret } = await createWebhookEndpoint(sql, admin, { name: "CRM", url: `${base}/hook`, events: ["newsletter.subscribed", "person.unsubscribed", "person.deleted", "price_alert.activated"] }, net);
    await requestNewsletter(sql, "ana@exemplo.com");
    const token = await tokenFor("ana@exemplo.com", "confirm_newsletter");
    expect(await confirmNewsletter(sql, token)).toBe(true);
    expect(await confirmNewsletter(sql, token)).toBe(true); // link aberto de novo: sem segundo evento
    // Pessoa já confirmada: o alerta nasce ativo e vira evento.
    expect((await requestPriceAlert(sql, { email: "ana@exemplo.com", productSlug: "orbita-s9", kind: "any_drop" })).status).toBe("active");

    expect(await deliverWebhooks(sql, net)).toMatchObject({ delivered: 2, retried: 0 });
    expect(hits.map((h) => h.headers["x-veredito-event"])).toEqual(["newsletter.subscribed", "price_alert.activated"]);
    const h = hits[0]!;
    expect(h.headers["x-veredito-signature"]).toBe(signWebhook(secret, Number(h.headers["x-veredito-timestamp"]), h.body));
    const body = JSON.parse(h.body);
    expect(body.data.person).toMatchObject({ email: "ana@exemplo.com", newsletter_status: "subscribed" });
    expect(JSON.parse(hits[1]!.body).data.product.url).toMatch(/\/celulares\/orbita-s9$/);

    const [p] = await sql<{ id: string }[]>`SELECT id FROM people.person WHERE email = 'ana@exemplo.com'`;
    await unsubscribeAll(sql, p!.id);
    await unsubscribeAll(sql, p!.id); // segundo clique não gera evento
    expect((await deliveries()).filter((d) => d.event === "person.unsubscribed")).toHaveLength(1);
  });

  it("retries with backoff, then gives up; failed deliveries can be resent", async () => {
    hits.length = 0;
    failNext = 1;
    let now = new Date();
    const clock = { ...net, now: () => now };
    expect(await deliverWebhooks(sql, clock)).toMatchObject({ retried: 1 });
    let [d] = (await deliveries()).filter((x) => x.event === "person.unsubscribed");
    expect(d).toMatchObject({ status: "queued", attempts: 1, last_error: "HTTP 503" });
    expect(d!.next_attempt_at.getTime() - now.getTime()).toBeCloseTo(60_000, -3);
    expect(await deliverWebhooks(sql, clock)).toMatchObject({ delivered: 0, retried: 0 }); // ainda não venceu
    now = new Date(now.getTime() + 61_000);
    expect(await deliverWebhooks(sql, clock)).toMatchObject({ delivered: 1 });

    // Endpoint fora do ar: 6 tentativas e desiste.
    failNext = 100;
    const [ep] = await listWebhookEndpoints(sql, admin);
    await sendWebhookTest(sql, admin, ep!.id);
    for (let i = 0; i < 6; i++) {
      await deliverWebhooks(sql, clock);
      now = new Date(now.getTime() + 13 * 3_600_000);
    }
    const ping = (await sql<{ id: string; status: string; attempts: number }[]>`SELECT id, status, attempts FROM ops.webhook_delivery WHERE event = 'ping'`)[0]!;
    expect(ping).toMatchObject({ status: "failed", attempts: 6 });
    failNext = 0;
    await retryWebhookDelivery(sql, admin, ping.id);
    expect(await deliverWebhooks(sql, clock)).toMatchObject({ delivered: 1 });
    await expect(retryWebhookDelivery(sql, admin, ping.id)).rejects.toBeInstanceOf(ValidationError);
  });

  it("LGPD deletion: CRM is told, then the e-mail leaves our queue too", async () => {
    hits.length = 0;
    const [p] = await sql<{ id: string }[]>`SELECT id FROM people.person WHERE email = 'ana@exemplo.com'`;
    await deletePerson(sql, p!.id);
    await deliverWebhooks(sql, net);
    const sent = JSON.parse(hits.find((h) => h.headers["x-veredito-event"] === "person.deleted")!.body);
    expect(sent.data.person).toEqual({ id: p!.id, email: "ana@exemplo.com" });
    const left = await sql<{ payload: unknown }[]>`SELECT payload FROM ops.webhook_delivery WHERE person_id = ${p!.id}`;
    expect(JSON.stringify(left)).not.toContain("ana@exemplo.com");
  });

  it("disabled endpoints get nothing", async () => {
    const [ep] = await listWebhookEndpoints(sql, admin);
    await setWebhookEndpointActive(sql, admin, ep!.id, false);
    await requestNewsletter(sql, "bia@exemplo.com");
    await confirmNewsletter(sql, await tokenFor("bia@exemplo.com", "confirm_newsletter"));
    expect((await deliveries()).filter((d) => d.status === "queued")).toHaveLength(0);
  });
});
