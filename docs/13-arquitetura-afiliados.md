# Etapa 13 — Arquitetura de afiliados

## 13.1 Desacoplamento
```
Produto ─▶ Variante ─▶ Oferta (loja × vendedor × condição)
                          └─▶ Programa de afiliados (rede, template de link, sub-ID, termos, fidelidade)
                                └─▶ Taxa de comissão (por categoria, vigência)  ← invisível ao ranking
```
O link afiliado **não é armazenado como verdade**: é **gerado no momento do clique** a partir de `url_original` + `link_template` + tag/sub-ID. Trocar de rede ou de tag não exige reprocessar ofertas.

## 13.2 Campos de cada oferta (seção 9)
Loja, vendedor, condição, preço à vista, preço parcelado (+ parcelas), preço anterior/"de", frete, disponibilidade, URL original, URL afiliada (gerada), programa, comissão estimada (calculada em `commerce`, fora do alcance do ranking), `last_checked_at`, `next_check_at`, status.

## 13.3 Adaptadores por programa (`packages/integrations/affiliate`)

Interface comum:
```ts
interface AffiliateAdapter {
  network: string
  fetchOffers(query: OfferQuery): AsyncIterable<RawOffer>         // feed/API
  buildAffiliateUrl(offer: Offer, ctx: ClickContext): string        // tag/sub-ID
  importConversions(since: Date): AsyncIterable<RawConversion>      // relatório/API
  verifyWebhook?(req: Request): Promise<RawConversion[]>            // postback
  terms: ProgramTerms                                               // max_price_age_h, allow_email_links...
}
```
Ordem sugerida de integração: (1) redes que agregam vários varejistas com feed de produtos e sub-ID (ex.: Awin, Lomadee, Rakuten — confirmar quais lojas estão em cada uma); (2) Amazon Associados; (3) Mercado Livre; (4) Magalu/KaBuM; (5) Shopee; (6) lojas oficiais de marca. **Validar termos, comissões e disponibilidade de API de cada programa antes de priorizar** — isso muda com frequência.

## 13.4 Regras de conformidade por programa (exemplos a validar juridicamente)
| Regra | Implementação |
|---|---|
| Idade máxima do preço exibido (ex.: 24 h) e exibição do horário | `terms.max_price_age_h`; oferta mais velha que o limite some do HTML e mostra "ver preço na loja" |
| Proibição de links afiliados em e-mail/PDF/offline | E-mails e alertas sempre linkam para **nossa** página; o clique afiliado acontece no site |
| Restrições a armazenar/exibir dados da API | Retenção configurável por fonte; histórico construído só com fontes que permitem |
| Proibição de sub-afiliação/redistribuição de comissão | Rede de creators só com contratos diretos/redes que permitam |
| Divulgação obrigatória | Aviso de afiliado visível perto dos CTAs + página "Como ganhamos dinheiro" |
| Proibição de cloaking/link enganoso | CTA indica a loja ("Ver na Amazon"); `rel="sponsored"` |

## 13.5 Tracking de cliques
Rota `/go/{produto}/{loja}` (Etapa 9.4) registra: produto, variante, oferta, loja, programa, página de origem, conteúdo de origem, tipo de página, CTA, posição, campanha/UTM, dispositivo, data/hora, sessão, `anon_id`, `person_id` (quando houver), preço e rótulo de preço exibidos, flag de bot.

`cta_id` padronizados: `hero_best_offer`, `sticky_bar`, `offers_table`, `compare_column`, `guide_pick_best`, `guide_pick_budget`, `deal_card`, `advisor_result`, `alert_email_landing`.

## 13.6 Conversões e comissões
- Importação diária por adaptador + postback quando disponível; `UNIQUE(program_id, external_id)` garante idempotência.
- Máquina de estados: `estimated → validating → approved → invoiced → paid` (ou `reversed` a partir de qualquer estado anterior a `paid`, e estorno pós-pagamento registrado como ajuste). Cada transição grava `commission_status_history` com ator e motivo.
- Conciliação mensal: total do programa × soma interna; divergência > 1% gera alerta.

## 13.7 Monitoramento de links (seção 33)
Worker `check-links`:
- Frequência por popularidade (top ofertas a cada 6 h; restante diário/semanal).
- HEAD/GET com user agent identificado e respeito a limites; segue redirects; registra cadeia.
- Detecta: 404/410, redirect para home/busca (produto removido), página "indisponível" (regras por loja), URL alterada (canônico novo), preço divergente acima de X% do feed.
- Saída: `ops.link_check` + atualização de `offer.status` + `ops.internal_alert` para o admin + revalidação da página.

## 13.8 Dashboard de afiliados (seção 10)
Métricas: cliques, CTR afiliado (sessões com clique/sessões e cliques/pageviews), sessões, produtos e lojas mais clicados, conversões (quando o programa fornece), receita, comissão por status, **EPC** (comissão/clique), **RPM** (comissão por mil sessões), receita por conteúdo, produto, canal, categoria, dispositivo, campanha, % de receita com atribuição exata.

Visão de funil:
```
Conteúdo ─▶ Sessões ─▶ Sessões com ativo de decisão ─▶ Cliques afiliados ─▶ Pedidos ─▶ Comissão aprovada
(por conteúdo: tráfego, CTR, EPC, RPM, receita, tendência)
```

## 13.9 Separação editorial × comercial (seção 36)
| Camada | Lê | Não lê |
|---|---|---|
| Ranking editorial / notas / consultor (relevância) | specs, notas, preço, disponibilidade, confiabilidade da loja, comportamento agregado | comissão, patrocínio |
| Comercial (dashboards, negociação) | tudo | — (não escreve em notas/rankings) |

Implementação: papel de banco `ranking_ro` sem permissão em `commerce.commission_rate`/`commission`; testes automatizados garantem que módulos de `packages/core/scoring` e `packages/ai/advisor` não importam nada de `commerce`; log de auditoria de qualquer alteração manual de ranking.

A escolha da **"melhor oferta"** entre lojas usa apenas: preço total (à vista + frete), disponibilidade, confiabilidade da loja/vendedor e condição — nunca comissão.
