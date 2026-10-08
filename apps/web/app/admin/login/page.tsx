import { brand } from "@veredito/brand";
import { loginAction } from "../actions";
import { Flash } from "../Flash";
import { adminSql } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  const sp = await searchParams;
  return (
    <main className="wrap" style={{ maxWidth: 420, marginTop: 64 }}>
      <h1>{brand.name} · Painel</h1>
      {!adminSql() ? (
        <p className="flash erro">O painel precisa de banco de dados. Configure <code>DATABASE_URL</code>, rode as migrações e crie um usuário com <code>pnpm --filter @veredito/db create-admin</code>.</p>
      ) : (
        <form action={loginAction} className="stack">
          <Flash sp={sp} />
          <label>E-mail<input type="email" name="email" required autoComplete="username" /></label>
          <label>Senha<input type="password" name="password" required autoComplete="current-password" minLength={12} /></label>
          <label>Código do autenticador (2FA)<input type="text" name="code" required inputMode="numeric" pattern="\d{6}" autoComplete="one-time-code" maxLength={6} /></label>
          <button className="btn btn-primary" type="submit">Entrar</button>
        </form>
      )}
    </main>
  );
}
