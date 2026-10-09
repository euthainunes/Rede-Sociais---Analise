# Etapa 19 — Backlog priorizado

Priorização: **P0** = sem isso o MVP não valida a tese · **P1** = necessário no MVP, pode entrar no fim · **P2** = fase 2 · **P3** = fase 3+.
Esforço: P (≤ 2 dias), M (3–5 dias), G (1–2 semanas). Critério de corte (seção 40): *"Isso melhora a experiência ou gera valor mensurável?"*

## Épico 0 — Fundação
| # | Item | Prioridade | Esforço |
|---|---|---|---|
| 0.1 | Monorepo (web, worker, packages), TypeScript estrito, lint, CI | P0 | M |
| 0.2 | Banco + migrações do schema núcleo (catalog, commerce, pricing, editorial, people, analytics, ops) | P0 | G |
| 0.3 | Auth admin com 2FA + RBAC + auditoria | P0 | M |
| 0.4 | Design tokens + componentes base | P0 | M |
| 0.5 | Orçamentos de performance no CI (Lighthouse CI, tamanho de bundle) | P0 | P |
| 0.6 | Seeds: vertical Tecnologia, categoria Celulares (atributos, critérios, perfis) | P0 | M |
| 0.7 | Levantamento de termos/comissões dos programas | P0 | M (não técnico) |

## Épico 1 — Catálogo e ofertas
| # | Item | Prioridade | Esforço |
|---|---|---|---|
| 1.1 | CRUD de produto/variante/specs com proveniência | P0 | G |
| 1.2 | Adaptador da 1ª rede de afiliados (feed + link + sub-ID) | P0 | G |
| 1.3 | Pipeline de ingestão (raw → normalize → match → offer → observation) | P0 | G |
| 1.4 | Fila de matching no admin | P0 | M |
| 1.5 | Rollup diário de preço e `price_stats` | P0 | M |
| 1.6 | Adaptadores 2–3 (Amazon, Mercado Livre ou Magalu conforme termos) | P1 | G |
| 1.7 | Detecção de anomalia de preço | P1 | P |
| 1.8 | Checagem de links + alertas internos | P1 | M |

## Épico 2 — Experiência do consumidor
| # | Item | Prioridade | Esforço |
|---|---|---|---|
| 2.1 | Página de produto completa (mobile-first) | P0 | G |
| 2.2 | Categoria com filtros e facetas indexáveis | P0 | G |
| 2.3 | Comparador 2–4 com "só diferenças" e vencedor por critério | P0 | G |
| 2.4 | Guias "melhores" com portão de qualidade | P0 | M |
| 2.5 | Comparações "vs" editoriais | P1 | M |
| 2.6 | Busca FTS + autocomplete + intenção simples (preço/categoria/marca) | P0 | G |
| 2.7 | Home | P1 | M |
| 2.8 | Página de ofertas (desconto real quando há dados) | P1 | M |
| 2.9 | Páginas de confiança (metodologia, como ganhamos dinheiro, autores, sobre) | P0 | P |
| 2.10 | Barra fixa de CTA no mobile | P1 | P |
| 2.11 | Gráfico de preço SVG (≥ 30 dias de dados) | P1 | M |

## Épico 3 — Notas e conteúdo
| # | Item | Prioridade | Esforço |
|---|---|---|---|
| 3.1 | Motor de notas objetivas (`packages/core/scoring`) + ajustes editoriais | P0 | G |
| 3.2 | Editor de blocos com blocos de dados vivos | P0 | G |
| 3.3 | Workflow editorial + revisões + changelog | P0 | M |
| 3.4 | Primeiras 30–50 reviews + 15 guias + 20 vs (conteúdo) | P0 | G (contínuo) |
| 3.5 | Disparo automático de "atualização necessária" | P1 | M |

## Épico 4 — Afiliados, tracking e analytics
| # | Item | Prioridade | Esforço |
|---|---|---|---|
| 4.1 | `/go/` com geração de link, `click_ref`, bot filter, registro assíncrono | P0 | M |
| 4.2 | Coleta de eventos própria (`/api/e`) + schema tipado | P0 | M |
| 4.3 | Banner de consentimento leve + Consent Mode v2 + GA4 | P0 | M |
| 4.4 | Importação de conversões (idempotente) + máquina de estados de comissão | P1 | M |
| 4.5 | Dashboard básico (conteúdo → clique → receita) | P1 | M |
| 4.6 | Short links `/s/` para social/YouTube | P2 | P |
| 4.7 | Modelos de atribuição (first/last/linear/position) | P2 | M |

## Épico 5 — SEO/GEO
| # | Item | Prioridade | Esforço |
|---|---|---|---|
| 5.1 | Metadados por template + overrides | P0 | P |
| 5.2 | JSON-LD (Organization, WebSite, Breadcrumb, Product, Review, ItemList, Article) + testes | P0 | M |
| 5.3 | Sitemaps, robots, canonical, redirects automáticos | P0 | M |
| 5.4 | Linkagem interna automática | P0 | M |
| 5.5 | Bloco "Resumo para decisão" (GEO) | P0 | P |
| 5.6 | OG images dinâmicas | P1 | P |
| 5.7 | `llms.txt`, IndexNow, política de crawlers de IA | P1 | P |
| 5.8 | Integração Search Console + painel SEO | P2 | M |
| 5.9 | Page Scores | P2 | G |

## Épico 6 — Leads e alertas
| # | Item | Prioridade | Esforço |
|---|---|---|---|
| 6.1 | Newsletter double opt-in + registro de consentimento | P1 | M |
| 6.2 | Alerta de preço-alvo (e-mail para nossa página) | P1 | M |
| 6.3 | Conta do usuário + preferências + exportar/excluir dados | P1 | M |
| 6.4 | Alertas completos (queda, bom preço, estoque, lançamento) | P2 | M |
| 6.5 | Webhooks para CRM | P2 | M |

## Épico 7 — IA (fase 2)
| # | Item | Prioridade | Esforço |
|---|---|---|---|
| 7.1 | Adaptador LLM + registro de custo + orçamento | P2 | M |
| 7.2 | Ferramentas determinísticas (search, scores, fit, price verdict, facts) | P2 | G |
| 7.3 | Consultor guiado + conversa + validador de fatos | P2 | G |
| 7.4 | Rascunhos editoriais com fact tokens | P2 | G |
| 7.5 | Busca semântica | P2 | M |
| 7.6 | Pacote de distribuição social | P2 | M |

## Épico 8 — Fase 3+
Personalização · Google Ads · Pinterest · Merchant Center (se elegível) · DW · portal de marcas · piloto de creators · API pública · novos verticais.

## Ordem de execução das primeiras 6 sprints (2 semanas cada)
| Sprint | Entrega |
|---|---|
| S1 | 0.1–0.6 · design da página de produto |
| S2 | 1.1, 1.2, 1.3 (ingestão ponta a ponta para 1 rede) · 3.1 (notas) |
| S3 | 2.1 página de produto · 4.1 `/go/` · 4.2 eventos · 5.1–5.3 |
| S4 | 2.2 categoria · 2.6 busca · 1.4 matching · 3.2–3.3 editor/workflow |
| S5 | 2.3 comparador · 2.4 guias · 5.4–5.5 · 4.3 consentimento/GA4 · 2.9 |
| S6 | 2.7 home · 2.8 ofertas · 1.6 adaptadores · 6.1–6.2 · 4.4–4.5 · hardening, testes de carga, lançamento |

## Status de execução (atualizado em 09/10/2026)

| Item | Status |
|---|---|
| 0.1–0.6 Fundação (monorepo, schema, auth admin com 2FA, design tokens, seeds) | ✅ feito (Lighthouse CI ainda não) |
| 1.1 CRUD de produto/variante/specs com proveniência | ✅ |
| 1.2–1.3 Adaptadores e pipeline de ingestão | ✅ CSV manual + feeds agendados por URL (worker); APIs dos programas dependem de credenciais |
| 1.4 Fila de matching | ✅ |
| 1.5 Rollup diário | ✅ job `rollup-daily` a partir das observações |
| 1.7–1.8 Anomalias, checagem de links e alertas internos | ✅ anomalia pausa a oferta; `check-links`; alertas automáticos |
| 2.1–2.11 Experiência do consumidor | ✅ |
| 3.1–3.3 Notas, editor e workflow | ✅ editor por seções, sem editor visual |
| 4.1–4.3 `/go`, eventos próprios, consentimento e GA4 | ✅ |
| 4.4–4.5 Conversões e dashboard | ✅ importação CSV + postback assinado, comissões com histórico, receita por conteúdo/produto/canal/CTA/loja |
| 4.7 Modelos de atribuição multi-toque | ✅ jornada por sessão (com consentimento); último, primeiro, linear e por posição por canal no painel Receita |
| 5.1–5.5, 5.7 SEO/GEO | ✅ |
| 6.1–6.3 Newsletter, alerta de preço, conta e direitos LGPD | ✅ inclui a edição semanal (rascunho automático, revisão e envio pelo painel) |
| 6.4 Alertas completos | ✅ preço-alvo, queda, bom preço (volta ao estoque no backend) |
| 6.5 Webhooks para CRM | ✅ eventos de pessoas assinados (HMAC), fila com retentativas, painel com teste e reenvio |
| 7.1–7.5 IA (consultor, RAG, busca) | ✅ consultor, RAG e busca semântica (guias e análises com o trecho que responde; produtos citados sobem quando a busca não tem critérios) |

Próximos itens: Lighthouse CI (0.5).
