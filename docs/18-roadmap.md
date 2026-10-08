# Etapa 18 — Roadmap MVP → escala

Este roadmap concilia o pedido (MVP → preços/IA/social → automação → verticais) com o documento anexo (marcas na fase 2, creators na fase 3). Mudança proposta: **o portal de marcas e a rede de creators vão para a fase 3 e ficam condicionados** a audiência e contratos que permitam redistribuir comissão; **a coleta de preço começa na fase 1**, porque histórico não se recupera depois.

Cada fase termina num **portão de validação** (métrica), não numa lista de telas.

## Fase 0 — Fundação (2–3 semanas)
- Fechar entidades centrais (Etapa 8) e regras de negócio (matching, preço, notas, firewall).
- Levantamento jurídico/comercial: termos e comissões de cada programa, LGPD (políticas, encarregado), marca (INPI) e domínio.
- Setup: monorepo, CI com orçamentos de performance, ambientes, banco, auth admin com 2FA.
- Design system v0 + página de produto em alta fidelidade.
- Metodologia v1.0 de notas para celulares e de preço.
- **Portão:** modelo de dados revisado, termos dos 3 primeiros programas validados.

## Fase 1 — MVP consumidor + operação (8–10 semanas)
**Escopo:** celulares (≈ 80–150 modelos relevantes no Brasil), depois notebooks.
- Home, vertical, categoria (filtros), produto (variantes, specs com fonte, notas, review, ofertas, alternativas), comparador (2–4), guias "melhores" (≈ 15 com portão de qualidade), comparações "vs" (≈ 20), ofertas (com dados disponíveis), busca (FTS + intenção simples), páginas de confiança (metodologia, como ganhamos dinheiro, autores).
- Ofertas de 3–5 programas, matching com fila humana, **coleta de preço a cada ciclo** (UI de histórico simples se ≥ 30 dias de dados).
- `/go/` com tracking completo, eventos próprios, GA4 com consentimento, dashboard básico (conteúdo → clique).
- Leads: newsletter (double opt-in) + alerta de preço simples (preço-alvo) + gestão de consentimento.
- Admin: produtos, categorias, ofertas, matching, conteúdo com workflow, SEO, links, alertas internos essenciais (preço desatualizado, link quebrado, sem oferta).
- SEO técnico completo, JSON-LD, sitemaps, robots, OG; Search Console e Bing configurados.
- **Portão (até 90 dias após lançamento):** páginas indexadas e ganhando impressões; CTR afiliado ≥ 6% nas páginas de produto/guia; ≥ 1 conversão confirmada por programa integrado; Core Web Vitals "bons" em ≥ 90% das URLs.

## Fase 2 — Decisão e retenção (meses 3–6)
- Histórico de preço completo (7 d → 12 m), rótulos, "vale comprar agora?", desconto real na página de ofertas, índice de preços.
- Alertas completos (queda, bom preço, volta ao estoque, lançamento), conta do usuário, preferências.
- **Consultor IA** (fluxo guiado + conversa) e Fit Score.
- Busca semântica + tolerância a erros (Typesense/Meilisearch + pgvector).
- YouTube integrado (vídeos nas páginas, short links), pacotes de distribuição social, tracking por post.
- Dashboards: executivo, afiliados, conteúdo → receita, SEO, social; Page Scores; CRM via webhooks.
- Novas categorias de tecnologia: notebooks, tablets, smartwatches, acessórios.
- **Portão:** DQS crescendo mês a mês; ≥ 15% dos usuários recorrentes com alerta ou conta; consultor com taxa de clique pós-recomendação ≥ página de guia.

## Fase 3 — Escala, automação e rede (meses 6–12)
- Personalização (recomendações por comportamento e perfil), "pessoas como você escolheram".
- Automação de conteúdo (rascunhos, revisões disparadas por eventos), enriquecimento de specs.
- Google Ads (com páginas de valor próprio), Pinterest (tag, catálogo, pins), Merchant Center **só se elegível**.
- Data warehouse (ClickHouse/BigQuery), modelos de atribuição completos.
- **Condicionado:** portal de marcas (catálogo, campanhas, comissão direta) e piloto de creators com contratos diretos — apenas se houver ≥ 3 marcas/lojas interessadas e validação jurídica/fiscal.
- Monetização complementar: newsletter patrocinada e parcerias diretas, sempre rotuladas.
- **Portão:** receita cobrindo custos operacionais; ≥ 30% do tráfego fora do Google orgânico (direto, e-mail, social, IA).

## Fase 4 — Novos verticais (12+ meses)
- Ativar 1 novo vertical por vez (sugestão: eletrodomésticos, por ticket alto e decisão racional; moda depois, pois exige outro tipo de conteúdo).
- Para cada vertical: configuração (atributos, critérios, perfis), metodologia própria, 1 editor especialista, conteúdo pilar.
- API pública / white-label se houver demanda B2B.
- **Portão por vertical:** ≥ 50% do RPM de tecnologia em 6 meses.

## Linha do tempo resumida

```
Mês   0    1    2    3    4    5    6    7    8    9   10   11   12
F0   ███
F1      ██████████
Coleta de preço  ▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶▶
F2                    ████████████████
F3                                    ██████████████████████████
F4                                                              ▶
```
