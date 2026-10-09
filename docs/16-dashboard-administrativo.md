# Etapa 16 — Painel administrativo e dashboards

## 16.1 CMS / operação (seção 31)

| Área | Funções | Fase |
|---|---|---|
| Produtos | Criar/editar modelo, variantes, specs (com fonte/confiança), mídia, relações, SEO, status de ciclo de vida; detecção de duplicados | 1 |
| Categorias | Árvore, atributos, grupos, eixos de variante, faixas de preço, perfis de uso, perguntas do consultor | 1 |
| Marcas e lojas | Cadastro, confiabilidade, programas, termos | 1 |
| Ofertas | Lista por status; criar manual; fila de **matching**; histórico de preço da oferta | 1 |
| Feeds/ingestão | Fontes, execuções, erros, estatísticas | 1 |
| Conteúdo | Editor de blocos, workflow, agendamento, changelog, quality gate | 1 |
| Notas | Cálculo objetivo, ajustes editoriais com justificativa, versões de metodologia | 1 |
| Comparativos | Pares editoriais, portão de qualidade | 1 |
| SEO | Metadados, redirects, sitemaps, Page Scores, Search Console | 1 (básico) / 2 |
| Afiliados | Programas, tags, links, cliques, conversões, comissões, conciliação | 1 / 2 |
| IA | Fila de rascunhos gerados, diffs, resultado do verificador de fatos, custo | 2 |
| Leads & alertas | Leads, consentimentos, alertas ativos, envios, exportação para CRM | 1 / 2 |
| Alertas internos | Fila com severidade, responsável, SLA | 1 |
| Usuários & papéis | RBAC, 2FA obrigatório, sessões | 1 |
| Auditoria | Trilha de todas as ações sensíveis | 1 |

## 16.2 Dashboard executivo (seção 27)

```
PERÍODO [7d|30d|90d|custom]  · comparação com período anterior

NORTH STAR   Decisões Qualificadas/semana  ▲ 12%

RECEITA      Comissão (estimada | aprovada | paga) · por loja · por produto · por categoria · por conteúdo
AQUISIÇÃO    Usuários · sessões · novos · canal (orgânico, direto, social, IA, e-mail, pago) · CAC (pago)
CONTEÚDO     Páginas publicadas · tráfego · ranking médio · CTR orgânico · engajamento · top/bottom 10
AFILIADOS    Cliques · CTR afiliado · EPC · RPM · conversão · % receita com atribuição exata
SOCIAL       YouTube · Instagram · TikTok · Pinterest → sessões → cliques → receita (por post)
SEO          Impressões · cliques · posição · páginas indexadas · páginas com queda
QUALIDADE    % ofertas frescas (< 24 h) · links quebrados · produtos sem oferta · fila de matching
ALERTAS      Abertos por severidade
```

## 16.3 Dashboards especializados

| Dashboard | Perguntas que responde |
|---|---|
| **Afiliados** (Etapa 13.8) | Quais conteúdos/produtos/lojas geram dinheiro? EPC por loja? |
| **Conteúdo → receita** | Conteúdo → tráfego → clique → venda → comissão, por modelo de atribuição |
| **Google Ads** (fase 3) | Campanha → sessões → comportamento → clique afiliado → receita → ROAS |
| **YouTube / Social** | Vídeo/post → views → cliques no link → sessões → cliques afiliados → receita; formato e criador que mais rendem |
| **SEO** | Impressões, cliques, CTR, posição por cluster/página/consulta; cobertura; indexação |
| **Preços** | Produtos com maior queda, anomalias, frescor por fonte |
| **IA** | Sessões do consultor, taxa de conclusão, cliques pós-recomendação, custo por sessão, feedback |
| **Leads** | Cadastros, opt-in por finalidade, alertas ativos, disparos, abertura/clique |

## 16.4 Alertas internos (seção 32)

| Alerta | Regra (padrão ajustável) | Severidade |
|---|---|---|
| Preço desatualizado | Oferta exibida com `last_checked_at` > limite do programa | Alta |
| Produto sem oferta | Produto publicado sem oferta ativa há > 24 h | Média |
| Link quebrado | `link_check.outcome = broken` | Alta |
| Página não indexada | Página importante "descoberta/rastreada, não indexada" > 14 dias | Média |
| Queda de tráfego | −30% semana a semana em página/cluster com tráfego relevante | Alta |
| Queda de CTR | CTR orgânico −25% com posição estável | Média |
| Produto sem review | Produto com tráfego > X sem review publicada | Média |
| Conteúdo desatualizado | `next_review_at` vencido ou preço citado fora de ±15% | Média |
| Preço anormal | Variação > 60% vs. mediana ou preço abaixo de 30% da mediana (erro de preço) | Alta |
| Erro de integração | Execução de feed/import falhou ou volume −50% | Alta |
| Conversões divergentes | Conciliação > 1% | Média |
| Orçamento de IA | > 80% do orçamento diário | Média |
| Core Web Vitals | p75 de LCP/INP fora da meta por template | Alta |

Entrega: painel + e-mail/Slack diário com resumo; alertas altos em tempo real.

## 16.5 Page Scores (seção 41)

Cada URL indexável recebe diagnóstico semanal (worker `page-scores`) com nota 0–100 e recomendações:

| Score | Checagens (exemplos, cada uma com peso) |
|---|---|
| **SEO** | Title/description no tamanho, H1 único, canonical correto, indexável, no sitemap, JSON-LD válido, links internos de entrada ≥ 3, profundidade ≤ 3, sem canibalização, imagens com alt |
| **GEO** | Bloco "resumo para decisão" presente, perguntas-resposta, tabelas de fatos com fonte/data, entidades consistentes, data de atualização < 90 dias, autor identificado |
| **Performance** | p75 real (RUM) de LCP/INP/CLS por URL ou template; peso de JS/imagens |
| **UX** | CTA acima da dobra no mobile, tamanho de alvos de toque, contraste, ausência de layout shift em blocos dinâmicos, taxa de retorno rápido |
| **Conteúdo** | Elemento exclusivo (teste/dado/opinião), completude da estrutura de review, frescor, ausência de números soltos não verificados |
| **Conversão** | CTR afiliado da página vs. mediana do tipo, cliques na melhor oferta vs. outras |
| **Afiliado** | Ofertas ativas e frescas, links válidos, divulgação presente, % atribuição exata |

Exibição: `SEO 92 · GEO 87 · Performance 96 · Conteúdo 91 · Conversão 84 · Afiliado 95` + lista priorizada de correções ("Adicionar 2 links internos de guias da faixa", "Preço citado no texto difere 18% do atual").
