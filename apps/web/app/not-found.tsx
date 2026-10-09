import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="code" aria-hidden="true">404</p>
      <h1>Página não encontrada</h1>
      <p className="lead">O produto ou página pode ter mudado de endereço.</p>
      <form action="/buscar" className="search search-lg search-page" role="search">
        <label htmlFor="q-404" className="sr-only">Buscar</label>
        <Icon name="search" className="search-icon" />
        <input id="q-404" name="q" type="search" placeholder="Buscar um celular, marca ou guia" />
        <button type="submit">Buscar</button>
      </form>
      <p className="row"><Link className="btn btn-dark" href="/celulares">Ver celulares</Link><Link className="btn btn-ghost" href="/ofertas">Ver ofertas</Link></p>
    </section>
  );
}
