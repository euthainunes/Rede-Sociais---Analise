# Etapa 5 — Mapa de páginas

Convenções: URLs em minúsculas, sem acento, hífen como separador, sem barra final, sem IDs visíveis. Slugs estáveis; mudanças geram redirect 301 automático (tabela `redirects`).

## 5.1 Site público

| Tipo | URL | Indexável | Renderização | Fase |
|---|---|---|---|---|
| Home | `/` | sim | ISR | 1 |
| Vertical | `/tecnologia` | sim | ISR | 1 |
| Categoria | `/celulares` | sim | ISR | 1 |
| Categoria filtrada (facetas valiosas) | `/celulares/samsung`, `/celulares/5g` | só facetas aprovadas | ISR | 1 |
| Categoria filtrada (demais filtros) | `/celulares?ram=8&ordem=preco` | não (`noindex, follow`, canonical para base) | SSR | 1 |
| Produto (modelo) | `/celulares/samsung-galaxy-s26-ultra` | sim | ISR + tags | 1 |
| Variante | `/celulares/samsung-galaxy-s26-ultra?v=512gb-preto` | não (canonical no modelo) | ISR | 1 |
| Ficha técnica | `/celulares/samsung-galaxy-s26-ultra/ficha-tecnica` | sim (se houver demanda) | ISR | 2 |
| Histórico de preço | `/celulares/samsung-galaxy-s26-ultra/historico-de-precos` | sim | ISR (curto) | 2 |
| Review | seção da página do produto (âncora `#review`) | — | — | 1 |
| Comparação editorial (vs) | `/comparar/iphone-17-pro-vs-galaxy-s26-ultra` | sim (só pares com portão de qualidade) | ISR | 1 |
| Comparador livre | `/comparar?p=a,b,c` | não | SSR | 1 |
| Guia "melhores" | `/melhores/celulares-ate-2000` | sim | ISR | 1 |
| Guia por uso | `/melhores/celulares-para-jogos` | sim | ISR | 1 |
| Guia por marca | `/melhores/celulares-samsung` | sim | ISR | 1 |
| Explicador | `/guias/quanto-de-ram-um-celular-precisa` | sim | SSG | 1 |
| Ofertas | `/ofertas`, `/ofertas/celulares` | sim | ISR (5–15 min) | 1 |
| Marca | `/marcas/samsung` | sim | ISR | 1 |
| Loja | `/lojas/amazon` (confiabilidade, frete, políticas) | sim | ISR | 2 |
| Busca | `/buscar?q=` | não | SSR | 1 |
| Consultor | `/consultor` (e `/consultor/celulares`) | página sim; conversas não | SSR + streaming | 2 |
| Autor | `/autores/nome-sobrenome` | sim | SSG | 1 |
| Metodologia | `/metodologia`, `/metodologia/celulares` | sim | SSG | 1 |
| Como ganhamos dinheiro | `/como-ganhamos-dinheiro` | sim | SSG | 1 |
| Índice de preços | `/indice-de-precos/celulares` | sim | ISR diário | 2 |
| Vídeos | `/videos`, `/videos/slug` | sim | ISR | 2 |
| Sobre, contato, política editorial, privacidade, termos, cookies | `/sobre` etc. | sim | SSG | 1 |
| Minha conta | `/conta`, `/conta/alertas`, `/conta/preferencias`, `/conta/privacidade` | não | SSR | 1 |
| Redirect de afiliado | `/go/{produto}/{loja}` | não (`X-Robots-Tag: noindex`, bloqueado em robots) | Edge/Route handler | 1 |
| Link de campanha/social | `/s/{codigo}` | não | Edge | 2 |
| Vitrine de creator | `/@{creator}` | sim (se curada) | ISR | 3 |
| `sitemap.xml`, `robots.txt`, `llms.txt`, feeds RSS | — | — | gerado | 1 |

**Decisão de URL de produto:** `/{categoria}/{slug-do-modelo}` (como pedido). Se um produto mudar de categoria, 301. Prefixo do vertical (`/tecnologia/celulares/...`) **não** é usado na URL do produto — mais curto e estável; o vertical aparece no breadcrumb.

## 5.2 Admin (`/admin`, `noindex`, autenticação obrigatória)

```
/admin
├── /dashboard                 executivo
├── /catalogo
│   ├── /produtos              lista, edição, variantes, specs, mídia
│   ├── /categorias            árvore, atributos, critérios, perfis
│   ├── /marcas
│   └── /matching              fila de ofertas sem variante
├── /ofertas                   ofertas, lojas, programas, feeds, status
├── /precos                    séries, anomalias, fontes
├── /conteudo
│   ├── /reviews  /comparativos  /guias  /explicadores  /videos
│   ├── /workflow              quadro Rascunho → Revisão → Aprovado → Publicado → Atualizar
│   └── /ia                    fila de rascunhos gerados por IA
├── /seo                       metadados, redirects, page scores, Search Console
├── /afiliados                 links, cliques, conversões, comissões, conciliação
├── /analytics                 conteúdo → clique → receita, canais, social, campanhas
├── /leads                     leads, consentimentos, alertas, envios
├── /alertas-internos          fila de problemas operacionais
├── /configuracoes             usuários, papéis, integrações, segredos (somente referência)
└── /auditoria                 trilha de auditoria
```

## 5.3 Portais futuros (fase 3, condicionados)

```
/marca  (merchant)                       /creator
├── /dashboard                           ├── /dashboard
├── /produtos  /ofertas  /importacoes    ├── /marketplace
├── /campanhas  /comissoes               ├── /links  /vitrines  /colecoes
├── /conversoes  /analytics              ├── /vendas  /comissoes
├── /financeiro                          ├── /perfil
└── /configuracoes                       └── /configuracoes
```

## 5.4 Linkagem interna (estrutura de silos)

```
Home
 └── Vertical (Tecnologia)
      └── Categoria (Celulares) ──────────────┐
           ├── Guias "melhores" (hub) ─────────┤ links cruzados por faixa/uso/marca
           │     └── Produtos (spokes)         │
           ├── Produto ─── Comparações vs ─────┤
           │     ├── Concorrentes diretos      │
           │     ├── Sucessor / antecessor     │
           │     ├── Acessórios                │
           │     └── Histórico de preço        │
           └── Explicadores (topo de funil) ───┘
```
Regras automáticas na Etapa 10.
