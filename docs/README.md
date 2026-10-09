# Veredito — Plataforma de Commerce Intelligence e Afiliados

> Nome fictício provisório. Documentação estratégica e de arquitetura (Etapas 1–19). Decisões tomadas em [decisoes.md](./decisoes.md); a implementação (Etapa 20) começou — ver o README da raiz.

**Tese:** não construir uma máquina de páginas, e sim uma **máquina de decisões de compra**. Responder "qual produto faz sentido para mim, e é hora de comprar?", não só "onde está mais barato?".

## Resumo executivo

1. **Foco antes de amplitude.** Começar só com smartphones no Brasil e ser a melhor experiência de decisão do mercado; depois notebooks, tablets e o resto de tecnologia; outros verticais só depois de validar o RPM.
2. **Diferencial difícil de copiar:** *Motor de Decisão* = Fit Score pessoal + "Vale comprar agora?" com histórico multiloja próprio + firewall comercial público + memória de decisões. O histórico de preço começa a ser coletado **no dia 1**, porque o tempo não se compra depois.
3. **Arquitetura simples:** Next.js (RSC/ISR) + PostgreSQL (JSONB, FTS, pgvector, particionamento) + worker com fila no próprio Postgres. Sem microsserviços. Custo inicial de infraestrutura entre R$ 300 e R$ 1.500 por mês.
4. **Modelo de dados:** Produto (modelo) → Variante → Oferta (loja × vendedor) → Observação de preço, com atributos configuráveis por categoria e proveniência (`source`, `last_verified_at`, `confidence`) em cada fato.
5. **A IA nunca é fonte de fatos.** Ela interpreta, seleciona por ferramentas determinísticas e escreve. Os números vêm do banco e passam por um verificador.
6. **Riscos críticos:** dependência do Google, comissões baixas em celulares, termos dos programas (e-mail, atualização de preço, sub-afiliação) e dispersão de escopo. As mitigações estão na Etapa 1.
7. **North Star:** Decisões Qualificadas por Semana (DQS).
8. **Economia (cenário base):** RPM ≈ R$ 76 por mil sessões, ou seja, cerca de 132 mil sessões/mês para R$ 10 mil e 1,3 milhão de sessões/mês para R$ 100 mil. A alavanca mais barata é o RPM (CTR e comissão), não o tráfego.
9. **Roadmap:** o portal de marcas e a rede de creators passam para a fase 3, **condicionados** a validação jurídica (sub-afiliação) e a ter audiência.

## Índice

| Etapa | Documento |
|---|---|
| 1 | [Diagnóstico estratégico + benchmarking](./01-diagnostico-estrategico.md) |
| 2 | [Posicionamento](./02-posicionamento.md) |
| 3 | [Diferenciais competitivos + North Star](./03-diferenciais-competitivos.md) |
| 4 | [Arquitetura do produto](./04-arquitetura-de-produto.md) |
| 5 | [Mapa de páginas](./05-mapa-de-paginas.md) |
| 6 | [Arquitetura UX/UI + design system](./06-arquitetura-ux-ui.md) |
| 7 | [Arquitetura técnica](./07-arquitetura-tecnica.md) |
| 8 | [Modelo de banco de dados](./08-modelo-de-dados.md) |
| 9 | [Arquitetura de APIs](./09-arquitetura-de-apis.md) |
| 10 | [SEO](./10-arquitetura-seo.md) |
| 11 | [GEO](./11-arquitetura-geo.md) |
| 12 | [Analytics e atribuição](./12-arquitetura-analytics.md) |
| 13 | [Afiliados](./13-arquitetura-afiliados.md) |
| 14 | [IA](./14-arquitetura-ia.md) |
| 15 | [Conteúdo e metodologias (notas e preço)](./15-arquitetura-conteudo.md) |
| 16 | [Painel administrativo e dashboards](./16-dashboard-administrativo.md) |
| 17 | [Modelo financeiro](./17-modelo-financeiro.md) |
| 18 | [Roadmap](./18-roadmap.md) |
| 19 | [Backlog priorizado](./19-backlog-priorizado.md) |
| 20 | [RAG — conhecimento, busca híbrida e fundamentação](./20-rag.md) |
| — | [Decisões D1–D8](./decisoes.md) |
| A | [Segurança, LGPD e jurídico](./anexo-a-seguranca-lgpd-juridico.md) |

## Decisões

Todas as decisões D1–D8 foram tomadas; ver [decisoes.md](./decisoes.md).
