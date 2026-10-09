# Etapa 6 — Arquitetura UX/UI

## 6.1 Princípios

1. **Resposta em 5 segundos**: o topo de cada página responde a pergunta da página (veredito, preço agora, para quem é, ação).
2. **Profundidade progressiva**: detalhes abaixo, em seções colapsáveis com âncoras — tudo no HTML (bom para SEO/GEO), sem depender de JS.
3. **Uma ação primária por contexto**: "Ver melhor oferta" é o CTA principal; demais lojas são secundárias.
4. **Honestidade visual**: rótulos de patrocínio, horário da coleta de preço, "dados insuficientes" quando for o caso.
5. **Mobile-first real**: layout desenhado em 360 px primeiro; desktop é expansão.
6. **Cada componente com estados**: carregando, vazio, erro, sem dados, sem permissão, processando, sucesso.
7. **Leveza**: nenhuma animação além de transições CSS curtas; nenhum carrossel automático.

## 6.2 Consumidor — telas-chave

### Home
```
HEADER  Logo · [🔎 Busca sempre visível] · Categorias · Ofertas · Comparar · Entrar
HERO    "O que você quer comprar?"  [ Ex.: celular bom para fotos até R$ 3.000 ]
        Atalhos: Celulares · Notebooks · Tablets · Smartwatches · Acessórios
DECIDA  "Não sabe qual escolher?" → [Responder 4 perguntas]   (consultor guiado)
OFERTAS "Preços realmente baixos hoje"  (desconto real vs. mediana 90 d, com selo)
GUIAS   Melhores celulares até R$ 2.000 · para jogos · para câmera
VS      iPhone 17 Pro vs Galaxy S26 Ultra · …
VÍDEOS  Reviews recentes
CONFIANÇA  "Como avaliamos" · "Como ganhamos dinheiro" · nº de produtos acompanhados
FOOTER
```

### Página de produto (ordem dos blocos no mobile)
```
Breadcrumb  Tecnologia › Celulares › Samsung
[Imagem otimizada, 1 principal + miniaturas]
Samsung Galaxy S26 Ultra              Nota Veredito 9,1 (metodologia v1.0) ⓘ
Veredito: "O mais completo para fotos e produtividade; caro para quem só usa redes sociais."
Seletor de variante: [256 GB] [512 GB] [1 TB]  ·  cores
PREÇO AGORA  R$ 7.299 à vista (Pix) · Amazon · coletado há 2 h
             🟢 Bom preço — 9% abaixo da mediana de 90 dias
             [ Ver melhor oferta ]   [🔔 Avise-me se baixar]  [+ Comparar]
PARA QUEM É ✓ …   PARA QUEM NÃO É ✗ …
OFERTAS     Loja · vendedor · preço à vista · parcelado · frete · [Ver oferta]  (ordem: preço total, depois confiabilidade)
NOTAS       Performance 9,3 ▮▮▮▮▮ · Câmera 9,1 · Bateria 8,8 · Tela 9,7 · Custo-benefício 7,9 · [Ajustar ao meu perfil]
PRÓS / CONTRAS
REVIEW      Resumo · Desempenho · Câmera · Bateria · Tela · Software · Construção · Uso · Custo-benefício
VÍDEO       Assista ao review (fachada leve: thumbnail + play; player só carrega no clique)
HISTÓRICO   Gráfico SVG (90 d padrão; 7 d/30 d/6 m/12 m) · mínimo, máximo, média · "Vale comprar agora?"
FICHA TÉCNICA  Tabela agrupada, com fonte/data por linha (tooltip)
ALTERNATIVAS   Mais barata · Premium · Melhor custo-benefício · Sucessor
COMPARAÇÕES    "vs" mais buscados
FAQ / PERGUNTAS  Respostas curtas (GEO)
Atualizado em … por [Autor] · Changelog · Reportar erro
```
Barra fixa inferior no mobile (aparece após rolar além do preço): `R$ 7.299 · [Ver oferta]`.

### Comparador
- Mobile: 2 colunas visíveis + coluna de atributo fixa; 3º/4º produto por swipe horizontal **dentro da tabela** (sem scroll horizontal da página).
- Toggle **"Mostrar só diferenças"**; vencedor por linha destacado.
- Bloco **"Melhor em"**: Preço · Performance · Câmera · Bateria · Tela · Custo-benefício.
- Conclusões automáticas: *"Se você prioriza câmera → Galaxy S26 Ultra (9,1 vs 8,7)"* — geradas por regra a partir das notas, nunca por texto livre de IA.
- CTA por coluna: melhor oferta de cada produto.
- Estado vazio: "Adicione produtos para comparar" + sugestões populares.

### Busca
- Autocomplete com produtos, categorias, marcas e **intenções** ("celular até 2000 → guia").
- Interpretação visível: `Entendemos: Celulares · até R$ 3.000 · prioridade câmera [editar]`.
- Resultados como cards; filtros em *drawer* no mobile, laterais no desktop.
- Topo: "Para essa busca, recomendamos" (até 3) — quando a intenção é clara.

### Consultor (fase 2)
- **Padrão: fluxo guiado** (4–6 perguntas com chips): uso, orçamento, sistema, tamanho, prioridades, marcas a evitar.
- **Opcional: conversa livre** com o mesmo motor.
- Resultado: Minha recomendação · Por quê (com fatos linkados) · Alternativa mais barata · Premium · Melhor custo-benefício · "O que eu evitaria" · [Comparar os 3] [Criar alerta].

### Ofertas
- Ordenações: Melhor oportunidade (padrão) · Maior desconto real · Maior queda recente · Menor preço · Melhor custo-benefício.
- Cada card mostra **desconto real** (vs. mediana 90 d) e, se diferente, o anunciado riscado com aviso: "A loja anuncia −40%; contra o histórico, −6%".

### Minha conta
- Alertas (preço-alvo, status, histórico de disparos) · Produtos acompanhados · Preferências de comunicação · Perfil de prioridades (Fit Score) · Privacidade (exportar, excluir).

## 6.3 Admin — padrões
- Layout SaaS: sidebar + tabelas densas + painéis laterais de edição.
- Edição de produto em abas: Básico · Variantes · Specs (com fonte/confiança) · Mídia · Notas · SEO · Relações · Ofertas · Histórico.
- Fila de matching: lado a lado "anúncio da loja" × "variante candidata" com score; atalhos de teclado (aceitar/rejeitar/criar).
- Workflow editorial em quadro (kanban) e por lista com filtros.
- Status financeiro como **timeline** (Estimada → Em validação → Aprovada → Faturada → Paga/Estornada).
- Em telas menores, tabelas viram listas de cards.

## 6.4 Design system

### Fundamentos (tokens)
| Token | Decisão |
|---|---|
| Tipografia | 1 família variável, auto-hospedada, `font-display: swap`, subset latin; fallback com métricas ajustadas (`size-adjust`) para CLS zero. Escala: 12/14/16/18/20/24/30/36. Corpo 16 px mínimo no mobile. |
| Cores | Neutros + 1 cor de marca + semânticas de preço: excelente, bom, normal, alto (sempre com ícone/rótulo, nunca só cor — acessibilidade). Tema claro e escuro via tokens CSS. |
| Espaçamento | Escala 4 px (4, 8, 12, 16, 24, 32, 48, 64). |
| Raio / sombra | 2 níveis cada. |
| Breakpoints | 360 (base), 640, 1024, 1280. |
| Movimento | ≤ 150 ms, `prefers-reduced-motion` respeitado. |
| Ícones | SVG inline sprite, conjunto mínimo. |

### Componentes base
Button, Link, Input, SearchBox, Select, Chips, Tabs, Badge, Tooltip (acessível), Card, Table/DataTable, Modal, Drawer, Toast, Pagination, Stepper, StatusTimeline, EmptyState, Skeleton, Breadcrumb, Accordion (`<details>` nativo).

### Componentes de domínio
`ProductCard` · `OfferRow` · `BestOfferCTA` · `PriceBadge` · `PriceHistoryChart` (SVG server-side) · `BuyNowVerdict` · `ScoreBar` · `ScoreBreakdown` · `FitScore` · `ComparisonTable` · `WinnerByCriterion` · `ProsCons` · `VerdictBox` · `SpecTable` (com fonte) · `AlternativesBlock` · `VideoFacade` · `AlertForm` · `ConsentBanner` · `AffiliateDisclosure` · `SponsoredLabel` · `AdvisorFlow` · `AIRecommendation` · `CommissionStatus` · `MatchingPair` · `PageScoreCard`.

### Estados obrigatórios por componente (exemplos)
| Componente | Estados |
|---|---|
| ProductCard | padrão, carregando, sem imagem, sem oferta, várias ofertas, indisponível, lançamento em breve |
| OfferRow | disponível, indisponível, queda de preço, melhor preço, expirada, desatualizada (> 24 h) |
| PriceHistoryChart | completo, dados insuficientes (< 30 dias), uma loja só, lacunas |
| AIRecommendation | perguntando, pensando (streaming), resultado, sem produto adequado, erro |

## 6.5 Ordem de design recomendada
1. Fundamentos e tokens → 2. Componentes de domínio (ProductCard, OfferRow, PriceBadge, ScoreBar) → 3. **Página de produto** → 4. Comparador → 5. Categoria/busca → 6. Home → 7. Guias → 8. Admin MVP (produto, matching, conteúdo) → 9. Consultor → 10. Estados e responsivo → 11. Protótipos dos fluxos.

Fluxos a prototipar primeiro: (1) Busca → produto → comparar → oferta → clique; (2) Guia "melhores" → produto → alerta; (3) Admin: cadastrar produto → importar ofertas → matching → publicar review.
