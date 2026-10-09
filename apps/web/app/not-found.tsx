import Link from "next/link";

export default function NotFound() {
  return (
    <section style={{ marginTop: 48 }}>
      <h1>Página não encontrada</h1>
      <p>O produto ou página pode ter mudado de endereço.</p>
      <p><Link href="/celulares">Ver celulares</Link> · <Link href="/buscar">Buscar</Link></p>
    </section>
  );
}
