import Link from "next/link";
import { breadcrumbJsonLd } from "@/lib/seo";
import { JsonLd } from "./JsonLd";

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <>
      <nav aria-label="Você está em" className="small muted" style={{ marginTop: 16 }}>
        {items.map((it, i) => (
          <span key={it.path}>
            {i > 0 && " › "}
            {i < items.length - 1 ? <Link href={it.path}>{it.name}</Link> : <span aria-current="page">{it.name}</span>}
          </span>
        ))}
      </nav>
      <JsonLd data={breadcrumbJsonLd(items)} />
    </>
  );
}
