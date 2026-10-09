import { Flash } from "../../../Flash";
import { ContentForm } from "../ContentForm";
import { requireStaff } from "@/lib/admin";

export default async function NewContent({ searchParams }: { searchParams: Promise<{ erro?: string; ok?: string }> }) {
  await requireStaff("content:write");
  return (
    <>
      <h1>Novo conteúdo</h1>
      <Flash sp={await searchParams} />
      <ContentForm canWrite v={{ kind: "review", title: "", products: "", evidence: "hands_on", intro: "", sections: "## Resumo\n\n## Para quem é\n\n## Desempenho\n\n## Câmera\n\n## Bateria\n\n## Tela\n\n## Software\n\n## Custo-benefício\n", picks: "" }} />
    </>
  );
}
