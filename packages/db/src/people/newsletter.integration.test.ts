/** Edições da newsletter contra Postgres real (TEST_DATABASE_URL). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../client.ts";
import { createTestDatabase } from "../test-db.ts";
import { createStaff, ForbiddenError, type Staff } from "../admin/index.ts";
import { buildEditionDraft, getEdition, isoWeek, previewEdition, sendEdition, updateEdition } from "./index.ts";

const url = process.env.TEST_DATABASE_URL;

describe("isoWeek", () => {
  it("computes ISO weeks", () => {
    expect(isoWeek(new Date("2026-10-09T12:00:00Z"))).toBe("2026-W41");
    expect(isoWeek(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
  });
});

describe.skipIf(!url)("newsletter (Postgres)", () => {
  let sql: Sql;
  let drop: () => Promise<void>;
  let editor: Staff;
  let chief: Staff;

  beforeAll(async () => {
    ({ sql, drop } = await createTestDatabase(url!, "news"));
    await sql`UPDATE commerce.offer SET last_checked_at = now()`;
    await sql`UPDATE editorial.content SET published_at = now() - interval '2 days' WHERE url_path = '/melhores/celulares-ate-3000'`;
    editor = { email: "ed@ex.com", name: "Editora", role: "editor", id: (await createStaff(sql, { email: "ed@ex.com", name: "Editora", role: "editor", password: "senha-longa-de-teste-123" })).id };
    chief = { email: "chefe@ex.com", name: "Chefe", role: "editor_chefe", id: (await createStaff(sql, { email: "chefe@ex.com", name: "Chefe", role: "editor_chefe", password: "senha-longa-de-teste-123" })).id };
    const subs: [string, string][] = [["a@ex.com", "subscribed"], ["b@ex.com", "subscribed"], ["c@ex.com", "unsubscribed"], ["d@ex.com", "pending"]];
    for (const [email, status] of subs) {
      await sql`INSERT INTO people.person (id, email, newsletter_status) VALUES (gen_random_uuid(), ${email}, ${status})`;
    }
  }, 60_000);
  afterAll(async () => {
    await drop?.();
  });

  it("builds one draft per week with real-discount deals and fresh content", async () => {
    const now = new Date();
    const a = await buildEditionDraft(sql, editor, now);
    const b = await buildEditionDraft(sql, editor, now);
    expect(a.created).toBe(true);
    expect(b).toEqual({ id: a.id, created: false });
    const e = (await getEdition(sql, a.id))!;
    expect(e.items.some((i) => i.kind === "deal")).toBe(true);
    expect(e.items.some((i) => i.kind === "content" && i.title.includes("até R$ 3.000"))).toBe(true);
    expect(e.items.every((i) => i.url.includes("utm_source=newsletter") && !/\/go\/|\.example\/produto/.test(i.url))).toBe(true);
  });

  it("lets editors edit but only chiefs send; sends once to confirmed subscribers", async () => {
    const [e] = await sql<{ id: string; items: unknown[] }[]>`SELECT id, items FROM editorial.newsletter_edition LIMIT 1`;
    await updateEdition(sql, editor, e!.id, { subject: "Assunto revisado pela editora", intro: "Intro revisada.", include: e!.items.map((_, i) => i !== 0) });
    const preview = await previewEdition(sql, e!.id);
    expect(preview!.html).toContain("Assunto revisado pela editora");
    await expect(sendEdition(sql, editor, e!.id)).rejects.toBeInstanceOf(ForbiddenError);
    expect(await sendEdition(sql, chief, e!.id)).toEqual({ recipients: 2 });
    await expect(sendEdition(sql, chief, e!.id)).rejects.toThrow(/já foi enviada/);
    const out = await sql<{ to_email: string; headers: Record<string, string> }[]>`SELECT to_email, headers FROM ops.email_outbox WHERE kind = 'newsletter' ORDER BY to_email`;
    expect(out.map((o) => o.to_email)).toEqual(["a@ex.com", "b@ex.com"]);
    expect(out.every((o) => o.headers["List-Unsubscribe"]?.includes("/api/descadastrar?t="))).toBe(true);
    await expect(updateEdition(sql, editor, e!.id, { subject: "Outro assunto qualquer", intro: "", include: [true] })).rejects.toThrow(/rascunhos/);
  });
});
