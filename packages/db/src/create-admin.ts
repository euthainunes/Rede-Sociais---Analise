/**
 * Cria um membro da equipe e mostra o segredo do 2FA (uma única vez).
 * Uso: DATABASE_URL=... ADMIN_PASSWORD='...' pnpm --filter @veredito/db create-admin email@x.com "Nome" admin
 */
import { brand } from "@veredito/brand";
import { createStaff, otpauthUri, ROLES, type Role } from "./admin/index.ts";
import { createSql } from "./client.ts";

const [email, name, role = "admin"] = process.argv.slice(2);
const password = process.env.ADMIN_PASSWORD;
if (!process.env.DATABASE_URL || !email || !name || !password) {
  console.error('Uso: DATABASE_URL=... ADMIN_PASSWORD=... create-admin <email> "<nome>" [papel]');
  process.exit(1);
}
if (!(ROLES as readonly string[]).includes(role)) throw new Error(`Papel inválido. Use: ${ROLES.join(", ")}`);
const sql = createSql(process.env.DATABASE_URL, { max: 1 });
const { totpSecret } = await createStaff(sql, { email, name, role: role as Role, password });
console.log(`Criado ${email} (${role}).`);
console.log(`Cadastre no app autenticador (segredo): ${totpSecret}`);
console.log(`Ou use o URI: ${otpauthUri(totpSecret, email, brand.name)}`);
await sql.end();
