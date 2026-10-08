# Etapa 10 — Arquitetura de SEO

## 10.1 Posição estratégica
O Google trata sites de afiliados com rigor (sistemas de reviews, conteúdo útil, abuso de conteúdo em escala, abuso de reputação de site). A estratégia não é "otimizar páginas", é **ser o melhor resultado para consultas de decisão** com evidência que outros não têm: dados de preço próprios, notas com metodologia, testes, autores reais.

## 10.2 SEO técnico

| Item | Implementação |
|---|---|
| Renderização | HTML completo no servidor (SSR/ISR); conteúdo principal nunca depende de JS |
| URLs | Limpas, estáveis, minúsculas, sem acento; 301 automático em mudança de slug (`editorial.redirect`) |
| Canonical | Autorreferente; variantes e filtros → canonical do modelo/categoria base |
| Facetas | Somente facetas com demanda aprovadas (marca, 5G, faixa de preço) são indexáveis com URL própria; demais `noindex,follow` e sem links rastreáveis desnecessários |
| Paginação | URLs `?pagina=2` autocanônicas, links `<a>` reais |
| Sitemaps | Índice + sitemaps por tipo (produtos, guias, comparações, categorias, vídeos, imagens) com `lastmod` real (mudança de conteúdo, não de preço trivial) |
| robots.txt | Bloqueia `/go/`, `/s/`, `/buscar`, `/admin`, `/api`, `/conta`; aponta sitemaps |
| Status codes | 404 real para inexistentes; 410 para removidos sem substituto; produto descontinuado continua no ar com sucessor destacado |
| hreflang | Não necessário (pt-BR único). Preparado no layout se houver expansão (pt-PT, es) |
| Open Graph / X Cards | Gerados por template; imagem OG dinâmica (produto + nota + preço) gerada no servidor e cacheada |
| Metadados | Templates por tipo com override editorial (ver 10.4) |
| Performance | Core Web Vitals como requisito (Etapa 7) |
| Indexação rápida | IndexNow (Bing/Yandex — relevante também para buscas de IA que usam Bing); Search Console API para monitoramento |
| Logs | Análise de logs de rastreamento (Googlebot) mensal: orçamento de rastreio em facetas |

## 10.3 Dados estruturados (JSON-LD)

| Página | Tipos | Regras |
|---|---|---|
| Todas | `Organization` (com logo, sameAs), `WebSite` + `SearchAction` (na home), `BreadcrumbList` | — |
| Produto | `Product` (name, brand, gtin, mpn, image, description), `offers` como `AggregateOffer` (lowPrice, highPrice, offerCount, priceCurrency) ou `Offer` por loja; `review` (`Review` com `author` Person, `reviewRating`, `positiveNotes`/`negativeNotes`) | **`AggregateRating` somente com avaliações reais de usuários coletadas no site** (nunca agregando notas de terceiros ou da própria editoria) |
| Review | `Review` dentro do `Product`; `Person` do autor com `url` para página de autor | Nota editorial ≠ AggregateRating |
| Guia "melhores" | `ItemList` (ListItem → URL do produto) + `Article` | Itens = produtos realmente recomendados |
| Comparação | `Article` + `ItemList` dos produtos comparados | — |
| Explicador | `Article` | — |
| Vídeo | `VideoObject` (thumbnail, uploadDate, duration, embedUrl) | — |
| FAQ | `FAQPage` **sem expectativa de rich result** (restrito pelo Google a sites gov/saúde desde 2023); manter perguntas no HTML pelo valor para usuários e GEO | — |
| Autor | `Person` / `ProfilePage` | — |

Validação automática no CI (testes de snapshot do JSON-LD + validador schema.org) e alerta para erros no Search Console.

## 10.4 SEO on-page — templates

| Tipo | Title (≤ 60) | Meta description (≤ 155) |
|---|---|---|
| Produto | `{Produto}: review, preço e vale a pena? \| Veredito` | `Nota {nota}/10. {veredito curto}. Menor preço hoje: R$ {preço} na {loja}. Histórico e alternativas.` |
| Guia | `Melhores celulares até R$ 2.000 em {mês ano} \| Veredito` | `Testamos e comparamos {n} modelos. Nossa escolha: {produto}. Veja a lista e o preço de hoje.` |
| Comparação | `{A} vs {B}: qual comprar? \| Veredito` | `{A} vence em {critérios}; {B} em {critérios}. Veja a comparação completa e o melhor preço.` |
| Histórico | `Histórico de preço do {Produto} \| Veredito` | `Menor preço: R$ {min}. Hoje: R$ {preço} ({±x}% vs média de 90 dias). Crie um alerta.` |

Datas no título só quando a página é realmente revisada naquele mês (`next_review_at` controla).

## 10.5 SEO semântico e entity SEO
- Cada produto, marca, categoria e autor é uma **entidade** com nome canônico, ID estável e `sameAs` (site oficial, Wikidata quando existir).
- Vocabulário controlado por categoria (sinônimos: "celular" = "smartphone"; "bateria que dura" → `battery_life`).
- Conteúdo cobre o **espaço de perguntas** da entidade (o que é, para quem, prós/contras, vs, preço, vale a pena, alternativas, problemas comuns).
- Página de autor com credenciais e lista de reviews (E-E-A-T); página de metodologia linkada em todas as notas.

## 10.6 Topic clusters

```
PILAR: /melhores/celulares  ("Melhores celulares de 2026")
├── Por preço:  até 1.000 · 1.500 · 2.000 · 3.000 · 5.000
├── Por uso:    jogos · câmera · bateria · trabalho · idosos · crianças
├── Por marca:  Samsung · Motorola · Xiaomi · Apple
├── Por recurso: 5G · tela pequena · carregamento rápido
├── Explicadores: quanto de RAM, o que é IP68, Snapdragon vs Dimensity
├── Comparações: iPhone vs Samsung · S26 vs S26 Ultra
└── Produtos (spokes): reviews individuais
```

## 10.7 Linkagem interna — regras automáticas + editoriais

| Origem | Links automáticos |
|---|---|
| Produto | Categoria e marca (breadcrumb) · 3 concorrentes diretos (mesma faixa ±20% e mesmo perfil) · sucessor/antecessor · comparações "vs" existentes · guias em que o produto aparece · histórico de preço |
| Guia | Todos os produtos listados · guias irmãos (faixa acima/abaixo, usos relacionados) · pilar |
| Comparação | Ambos os produtos · outras comparações dos mesmos produtos · guia da faixa |
| Explicador | Guias e produtos relevantes por atributo mencionado |
| Categoria | Guias pilar e principais facetas |

Âncoras descritivas e variadas (geradas de um conjunto controlado); limite de links por bloco; links editoriais no corpo prevalecem. Relatório de **páginas órfãs** e de profundidade de clique (meta: tudo importante a ≤ 3 cliques da home).

## 10.8 Conteúdo programático com portão de qualidade (seção 34)

Uma página programática (`/melhores/...`, `/comparar/a-vs-b`) **só é publicada e indexada** se passar no portão:

| Critério | Regra |
|---|---|
| Demanda | Volume de busca estimado ≥ limiar (ex.: 100/mês) **ou** consulta aparecendo no Search Console |
| Dados | ≥ 5 produtos qualificados (com nota, specs completas e oferta ativa) — para "vs": ambos com nota |
| Diferenciação | Introdução editorial e escolha "nossa recomendação" escritas/revisadas por humano |
| Unicidade | Conjunto de produtos com sobreposição < 70% com página irmã (senão consolida e faz canonical/301) |
| Frescor | Revisão agendada (`next_review_at`) |

Falhou → `noindex` (ou não publica). O resultado do portão fica em `editorial.content.quality_gate`.

## 10.9 Monitoramento
Search Console (API diária) → impressões, cliques, CTR, posição por página e consulta; cobertura e indexação; alertas internos de queda > 30% semana a semana por cluster; páginas "descobertas, não indexadas" como sinal de qualidade.
