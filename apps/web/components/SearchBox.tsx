"use client";
/**
 * Busca do cabeçalho com autocomplete (padrão combobox da WAI-ARIA).
 * Sem JavaScript continua sendo um formulário GET para /buscar. Setas navegam, Enter abre, Esc fecha.
 */
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = { kind: "product" | "category" | "brand" | "guide"; label: string; url: string; hint?: string };

const KIND_LABEL: Record<Item["kind"], string> = { product: "Produto", category: "Categoria", brand: "Marca", guide: "Conteúdo" };

export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    const t = setTimeout(async () => {
      ctrl.current?.abort();
      ctrl.current = new AbortController();
      try {
        const res = await fetch(`/api/sugestoes?q=${encodeURIComponent(term)}`, { signal: ctrl.current.signal });
        const data = (await res.json()) as { items: Item[] };
        setItems(data.items);
        setActive(-1);
      } catch {}
    }, 120);
    return () => clearTimeout(t);
  }, [q]);

  const expanded = open && items.length > 0;

  function go(item: Item) {
    setOpen(false);
    router.push(item.url);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!items.length) return;
      e.preventDefault();
      setOpen(true);
      setActive((i) => (e.key === "ArrowDown" ? (i + 1) % items.length : (i <= 0 ? items.length : i) - 1));
    } else if (e.key === "Enter" && expanded && active >= 0) {
      e.preventDefault();
      go(items[active]!);
    } else if (e.key === "Escape" && expanded) {
      // Primeiro Esc só fecha a lista; o segundo segue o padrão do navegador (limpa o campo).
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <form action="/buscar" className="search" role="search" onSubmit={() => setOpen(false)}>
      <label htmlFor="q" className="sr-only">Buscar</label>
      <input
        id="q" name="q" type="search" placeholder="Ex.: celular bom para fotos até 3 mil" autoComplete="off"
        role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={onKeyDown} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      />
      <button type="submit">Buscar</button>
      <ul id={listId} role="listbox" aria-label="Sugestões" className="suggest" hidden={!expanded}>
        {items.map((it, i) => (
          <li
            key={it.url} id={`${listId}-${i}`} role="option" aria-selected={i === active}
            // mousedown em vez de click: o blur do campo fecharia a lista antes do clique.
            onMouseDown={(e) => { e.preventDefault(); go(it); }} onMouseEnter={() => setActive(i)}
          >
            <span className="suggest-kind">{KIND_LABEL[it.kind]}</span>
            <span className="suggest-label">{it.label}</span>
            {it.hint && <span className="suggest-hint">{it.hint}</span>}
          </li>
        ))}
      </ul>
      <span className="sr-only" aria-live="polite">{expanded ? `${items.length} sugestões. Use as setas para escolher.` : ""}</span>
    </form>
  );
}
