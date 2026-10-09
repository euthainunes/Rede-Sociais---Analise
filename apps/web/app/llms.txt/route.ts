import { brand } from "@veredito/brand";
import { categories } from "@veredito/core";
import { catalog } from "@/lib/data";

export const revalidate = 3600;

/** /llms.txt — mapa do site para mecanismos generativos (docs/11 §11.4). */
export async function GET() {
  const guides = await catalog().listContent("best_list");
  const lines = [
    `# ${brand.name}`,
    "",
    `> ${brand.description}`,
    "",
    "Todas as notas seguem metodologia pública e versionada. Preços têm loja e horário de coleta. Comissões de afiliados não influenciam notas nem rankings.",
    "",
    "## Metodologia",
    ...Object.values(categories).map((c) => `- [Como avaliamos ${c.name.toLowerCase()}](${brand.url}/metodologia/${c.slug})`),
    `- [Como analisamos preços](${brand.url}/metodologia/precos)`,
    `- [Como ganhamos dinheiro](${brand.url}/como-ganhamos-dinheiro)`,
    "",
    "## Categorias",
    ...Object.values(categories).map((c) => `- [${c.name}](${brand.url}/${c.slug})`),
    "",
    "## Guias",
    ...guides.map((g) => `- [${g.title}](${brand.url}${g.path})`),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
