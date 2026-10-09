# Etapa 12 — Arquitetura de Analytics e Atribuição

## 12.1 Princípio
**Dado próprio primeiro, GA4 como espelho.** Todo evento relevante é registrado no nosso banco (`analytics.event`, `analytics.click`) e, quando houver consentimento, espelhado para GA4/Ads/Pinterest. Assim, decisões de negócio não dependem de amostragem, bloqueadores ou mudanças de terceiros.

```
Navegador ──sendBeacon──▶ /api/e ──▶ analytics.event (particionada)
                          │                 │
/go/* (servidor) ─────────┤                 ├─▶ rollups diários (worker) ─▶ dashboards
                          │                 │
                          └─▶ GA4 Measurement Protocol / gtag (com consentimento)
Programas de afiliados ──import/postback──▶ commerce.conversion ─▶ atribuição ─▶ receita por conteúdo
Search Console / YouTube / redes ──sync diário──▶ tabelas de métricas externas
```

## 12.2 Identidade
- `anon_id`: cookie first-party (1 ano) **somente após consentimento de analytics**; sem consentimento, eventos são registrados sem identificador persistente (sessão efêmera em memória/cookie de sessão), suficiente para contagens agregadas e cliques.
- `session_id`: 30 min de inatividade.
- `person_id`: quando logado ou após confirmação de e-mail; une jornadas anônimas anteriores (*stitching*) somente se houver consentimento.

## 12.3 Catálogo de eventos (schema tipado em `packages/analytics`)

| Evento | Quando | Parâmetros principais |
|---|---|---|
| `page_view` | toda página | page_type, path, content_id, product_id, referrer, utm |
| `view_product` | página de produto | product_id, variant_id, category, price_shown, price_label |
| `view_item_list` | categoria, guia, ofertas | list_id, items[] |
| `search` | busca enviada | q, interpretation, results_count |
| `search_result_click` | clique em resultado | q, product_id, position |
| `filter_apply` | filtro aplicado | filter_key, value |
| `comparison` | comparação exibida | product_ids[], source |
| `compare_add` | produto adicionado | product_id |
| `price_history_view` | gráfico aberto/alterado | product_id, range |
| `click_affiliate` / `outbound_click` | `/go/` (servidor) | click_ref, product_id, offer_id, merchant, cta_id, position, price_shown |
| `add_price_alert` | alerta criado | product_id, kind, target_price |
| `newsletter_signup` | inscrição confirmada | source |
| `ai_chat_start` | sessão do consultor | category, entry_point |
| `ai_recommendation` | recomendação exibida | advisor_session_id, product_ids, roles |
| `ai_recommendation_click` | clique em produto recomendado | product_id, role |
| `product_share` | compartilhar | product_id, channel |
| `video_click` | play no vídeo | video_id, product_id |
| `scroll_depth` | 25/50/75/100% (só templates editoriais) | percent |
| `feedback_submit` | erro reportado / pós-compra | kind |
| `web_vitals` | RUM | metric, value, page_type |

Nomes dos eventos do GA4 seguem a lista acima; para e-commerce recomendado do GA4 usa-se `view_item`/`select_item` como alias quando útil.

## 12.4 Integrações de marketing

| Ferramenta | Fase | Implementação |
|---|---|---|
| **GA4** | 1 | gtag carregado só após consentimento e em idle; Consent Mode v2; eventos-chave também via Measurement Protocol do servidor (clique afiliado) |
| **Google Ads** | 3 | Conversão = `click_affiliate` (micro) e conversão offline com valor = comissão importada (via `gclid` guardado na sessão, com consentimento `ads`); remarketing só com consentimento; páginas de destino com valor próprio (comparador, guias) para não cair em política de *bridge pages* |
| **Search Console** | 1–2 | API diária → `gsc_page_query_daily`; painel SEO |
| **Merchant Center** | 3 (condicional) | Feed preparado (título, descrição, preço, disponibilidade, imagem, marca, GTIN, categoria, URL, condição) **somente se** a política permitir para nosso modelo; caso contrário, foco em listagens gratuitas permitidas ou não usar |
| **Pinterest** | 3 | Tag com consentimento; catálogo a partir do feed de produtos; geração automática de pins (imagem + título + nota) a partir de guias/produtos |
| **YouTube** | 2 | Data API: vídeos, views, CTR; links na descrição via `/s/{code}` |
| **TikTok / Instagram** | 2 | Link na bio → `/s/{code}` por post/vídeo; APIs oficiais de insights quando disponíveis |
| **CRM** | 2 | Webhooks de saída (Etapa 9) |

## 12.5 Tracking por conteúdo social ("esse vídeo gerou quanto?")

Cada peça publicada recebe um **short link** (`/s/k3f9`) com `content_id`, `channel`, `external_post_id`, `campaign_id`, (`creator_id` no futuro). O short link redireciona para a página interna com UTMs padronizados (`utm_source=tiktok&utm_medium=social&utm_campaign={campanha}&utm_content={post_id}`). A sessão herda a origem; cliques em `/go/` herdam a sessão; conversões herdam o clique. Resultado: **post → sessões → cliques → pedidos → comissão**.

Para vídeos em que link não é clicável, usar código curto falado/na tela ("busque S26 no site") mapeado para o post como atribuição auxiliar.

## 12.6 Modelo de atribuição (seção 28)

### Jornada
Touchpoints = sessões (com canal/campanha/conteúdo de entrada) + visualizações de ativos de decisão (review, comparação, guia, consultor) + clique afiliado → conversão.

### Modelos suportados (calculados no worker, comparáveis lado a lado)
| Modelo | Regra |
|---|---|
| Last click | 100% para o último conteúdo antes do clique afiliado (padrão de receita "contábil") |
| First click | 100% para o primeiro touchpoint da pessoa na janela |
| Linear | Divisão igual entre conteúdos da jornada |
| Position-based | 40% primeiro, 40% último, 20% dividido no meio |

Janela padrão: 30 dias de jornada antes do clique; conversão ligada ao clique conforme fidelidade do programa.

### Fidelidade da conversão por programa
| Nível | Como liga a venda | Tratamento |
|---|---|---|
| `click` | Programa devolve sub-ID = `click_ref` | Atribuição exata |
| `tag` | Só tracking tag (ex.: por canal/tipo de página) | Venda ligada à tag; distribuída entre cliques daquela tag/dia/produto proporcionalmente |
| `aggregate` | Só total por período/produto | Alocação proporcional aos cliques do período, marcada como `allocated` |

Os dashboards mostram a **porcentagem da receita com atribuição exata** — transparência sobre a qualidade do dado.

## 12.7 Camada de dados para escala
- Fase 1–2: Postgres particionado + rollups diários (`analytics_daily_*`) + Metabase.
- Fase 3: exportação contínua de eventos para ClickHouse ou BigQuery; modelos de atribuição e recomendação rodam lá; Postgres mantém 90 dias quentes.
- Bots excluídos de todas as métricas (`is_bot`), com relatório próprio.
