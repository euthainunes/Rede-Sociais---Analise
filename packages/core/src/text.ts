/** "Nébula Aurora X1 Pro" → "nebula-aurora-x1-pro" */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Lista de linhas de um textarea (uma por linha, sem vazias). */
export function lines(s: string | null | undefined): string[] {
  return (s ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}
