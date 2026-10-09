# Etapa 9 — Arquitetura de APIs

## 9.1 Princípios
- A maior parte das páginas lê o banco **diretamente em Server Components** (sem API intermediária) — menos latência, menos código.
- APIs HTTP existem para: (a) interações do cliente (busca, comparador, consultor, alertas, eventos); (b) integrações (webhooks, feeds); (c) futura API pública.
- REST + JSON, versionado em `/api/v1`. Validação de entrada com schema (Zod) compartilhado.
- Erros no formato `application/problem+json` (RFC 9457).
- Rate limit por IP + `anon_id`; respostas públicas com `Cache-Control` explícito.
- Mutações do admin usam **Server Actions** com verificação de papel + CSRF nativo (origin check) + auditoria.

## 9.2 Endpoints públicos

| Método | Rota | Função | Cache |
|---|---|---|---|
| GET | `/api/v1/search?q=&category=&filters=&sort=&page=` | Busca com interpretação de intenção; retorna `interpretation`, `facets`, `results`, `recommended[]` | `s-maxage=300` (anônimo) |
| GET | `/api/v1/autocomplete?q=` | Produtos, categorias, marcas, intenções | `s-maxage=600` |
| GET | `/api/v1/products/{slug}` | Produto + variantes + specs + notas + ofertas resumidas | `s-maxage=300, swr` |
| GET | `/api/v1/products/{slug}/offers?variant=` | Ofertas atuais (ordenadas por preço total e confiabilidade) | `s-maxage=120` |
| GET | `/api/v1/products/{slug}/price-history?variant=&range=90d` | Série diária + estatísticas + rótulo "vale comprar agora?" | `s-maxage=900` |
| GET | `/api/v1/compare?products=a,b,c` | Matriz de atributos, vencedor por critério, conclusões por regra | `s-maxage=600` |
| GET | `/api/v1/deals?category=&sort=opportunity` | Ofertas por desconto real/queda/oportunidade | `s-maxage=300` |
| POST | `/api/v1/fit-score` | Body: prioridades + produtos → Fit Score por produto (cálculo puro) | no-store |
| POST | `/api/v1/advisor/sessions` | Inicia sessão do consultor (categoria, respostas guiadas) | no-store |
| POST | `/api/v1/advisor/sessions/{id}/messages` | Mensagem → resposta em **SSE** (streaming) com cartões de produto | no-store |
| POST | `/api/v1/alerts` | Cria alerta (exige e-mail confirmado + consentimento) | no-store |
| GET/PATCH/DELETE | `/api/v1/me/alerts[/{id}]` | Gestão de alertas | privado |
| GET/PATCH | `/api/v1/me/preferences` | Prioridades, categorias, comunicação | privado |
| POST | `/api/v1/me/data-export` · DELETE `/api/v1/me` | Direitos do titular (LGPD) | privado |
| POST | `/api/v1/leads` | Newsletter/cadastro (double opt-in) | no-store |
| POST | `/api/v1/consent` | Registra escolha do banner | no-store |
| POST | `/api/e` | Coleta de eventos (beacon, lote ≤ 20 eventos, ≤ 16 KB) | no-store |
| POST | `/api/v1/feedback` | "Reportar erro", "Comprou? Como foi?" | no-store |
| GET | `/go/{productSlug}/{merchantSlug}?v=&cta=&pos=&src=` | Redirect de afiliado (ver 9.4) | no-store |
| GET | `/s/{code}` | Link curto de campanha/social → página interna com UTMs | no-store |

## 9.3 Endpoints de integração

| Método | Rota | Função |
|---|---|---|
| POST | `/api/webhooks/networks/{network}` | Postback/webhook de conversão (HMAC); grava `conversion` idempotente |
| POST | `/api/webhooks/email/{provider}` | Bounces, reclamações, aberturas |
| POST | `/api/internal/revalidate` | Chamado pelo worker (token interno) para `revalidateTag` |
| GET | `/feeds/merchant-center.xml` | (fase 3, só se política permitir) |
| GET | `/feeds/pinterest-catalog.csv` | Catálogo Pinterest (fase 3) |
| GET | `/rss/{tipo}.xml` | Reviews, guias, ofertas |
| Outbound | Webhooks para CRM | `lead.created`, `lead.updated`, `alert.created`, `alert.triggered`, `affiliate.clicked` (agregado por lead, só com consentimento), `consent.changed`, `person.deleted` — assinados com HMAC, retry exponencial, fila de mortos |

## 9.4 Redirect de afiliado `/go/{produto}/{loja}`

```
1. Resolve oferta ativa: produto (+ variante opcional) × loja → melhor oferta daquela loja.
   Nunca aceita URL de destino via parâmetro (impede open redirect).
2. Classifica bot (UA, headless, rate, ASN de data center). Bot → 302 para a página do produto, sem link afiliado.
3. Gera click_ref (ID curto, base62) e monta a URL afiliada pelo link_template do programa
   (tag por canal/tipo de página quando o programa só suporta tags; sub-ID = click_ref quando suporta).
4. Responde 302 imediatamente com headers: Cache-Control: no-store, X-Robots-Tag: noindex, Referrer-Policy: no-referrer-when-downgrade.
5. Grava o clique de forma assíncrona (waitUntil) + evento click_affiliate para GA4 via Measurement Protocol (se consentido).
6. Oferta indisponível/quebrada → página intermediária "Esta oferta acabou — veja outras lojas" (nunca 404 silencioso).
```
Links `/go/` no HTML levam `rel="sponsored nofollow"`. Latência alvo: < 50 ms no servidor.

## 9.5 Contratos (exemplo)

```jsonc
// GET /api/v1/products/samsung-galaxy-s26-ultra/price-history?variant=256gb-preto&range=90d
{
  "variant": "256gb-preto",
  "currency": "BRL",
  "series": [{ "day": "2026-07-10", "min": 7899.00, "median": 8199.00, "merchants": 5 }],
  "stats": {
    "current": { "price": 7299.00, "merchant": "amazon", "observedAt": "2026-10-08T14:32:00-03:00" },
    "minAllTime": 6999.00, "maxAllTime": 9499.00, "median90d": 8020.00,
    "change": { "7d": -0.04, "30d": -0.08, "90d": -0.11, "180d": null, "365d": null },
    "daysOfData": 96
  },
  "verdict": {
    "label": "good",                     // excellent | good | normal | high | insufficient_data
    "deltaVsMedian90d": -0.09,
    "text": "O preço atual está 9% abaixo da mediana dos últimos 90 dias.",
    "methodologyUrl": "/metodologia/precos"
  }
}
```

## 9.6 API pública futura (fase 4–5)
Chaves por parceiro, escopos (`catalog:read`, `prices:read`, `links:create`), quotas, documentação OpenAPI gerada a partir dos schemas Zod. Base para publishers/creators/white-label — respeitando os termos de cada programa sobre redistribuição de dados de preço.
