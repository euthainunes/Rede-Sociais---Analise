# Etapa 17 — Modelo financeiro

> **Aviso:** todas as premissas abaixo são hipóteses de planejamento. As taxas de comissão de eletrônicos variam por programa, categoria e período e devem ser levantadas programa a programa antes de qualquer decisão de investimento. O modelo deve ser recalibrado com dados reais após 60–90 dias de operação.

## 17.1 Fórmula

```
Receita = Sessões × CTR afiliado × Conversão no varejista × Ticket médio × Comissão efetiva

EPC  (receita por clique)      = Conversão × Ticket × Comissão
RPM  (receita por mil sessões) = 1.000 × CTR × EPC
```
- **CTR afiliado**: sessões com ≥ 1 clique de saída / sessões.
- **Conversão**: pedidos atribuídos / cliques (inclui compras "halo" — outros itens comprados na mesma janela).
- **Ticket médio**: valor médio do pedido atribuído (menor que o preço do celular por causa do halo de itens baratos).
- **Comissão efetiva**: comissão / valor do pedido, ponderada pelo mix real de lojas e categorias.

## 17.2 Cenários

| Premissa | Conservador | Base | Agressivo |
|---|---|---|---|
| CTR afiliado | 6% | 10% | 15% |
| Conversão (pedido/clique) | 2,0% | 3,0% | 4,0% |
| Ticket médio atribuído | R$ 700 | R$ 900 | R$ 1.100 |
| Comissão efetiva | 2,0% | 2,8% | 3,2% |
| **EPC** | **R$ 0,28** | **R$ 0,76** | **R$ 1,41** |
| **RPM (por mil sessões)** | **R$ 16,80** | **R$ 75,60** | **R$ 211,20** |

## 17.3 O que é preciso para cada meta mensal

Sessões/mês necessárias (cliques e pedidos/mês entre parênteses):

| Meta | Conservador | Base | Agressivo |
|---|---|---|---|
| **R$ 10 mil** | 595 mil (36 mil cliques · 714 pedidos) | 132 mil (13 mil · 397) | 47 mil (7 mil · 284) |
| **R$ 50 mil** | 3,0 M (179 mil · 3,6 mil) | 661 mil (66 mil · 2,0 mil) | 237 mil (36 mil · 1,4 mil) |
| **R$ 100 mil** | 6,0 M (357 mil · 7,1 mil) | 1,3 M (132 mil · 4,0 mil) | 474 mil (71 mil · 2,8 mil) |
| **R$ 500 mil** | 29,8 M (1,8 M · 35,7 mil) | 6,6 M (661 mil · 19,8 mil) | 2,4 M (355 mil · 14,2 mil) |
| **R$ 1 milhão** | 59,5 M (3,6 M · 71,4 mil) | 13,2 M (1,3 M · 39,7 mil) | 4,7 M (710 mil · 28,4 mil) |

GMV atribuído correspondente no cenário base: R$ 0,36 M (meta 10 mil) · R$ 1,8 M · R$ 3,6 M · R$ 17,9 M · R$ 35,7 M.

**Leitura:** a alavanca mais barata é o **RPM**, não o tráfego. Passar de CTR 6% para 10% e de comissão 2% para 2,8% reduz em ~4,5× o tráfego necessário. Por isso a métrica norte é decisão qualificada (que puxa CTR e conversão) e a operação comercial deve buscar negociações diretas (comissão).

> Em R$ 500 mil–1 M/mês, só afiliados exigem audiência de grande publisher (6–13 M sessões no cenário base). Nesse patamar, receitas complementares (mídia direta, newsletter patrocinada, parcerias com marcas, dados agregados) tornam-se necessárias — sempre separadas da recomendação editorial.

## 17.4 Custos mensais estimados

| Item | Fase 1 (lançamento) | Fase 2 (~500 mil sessões) | Fase 3 (~2–5 M sessões) |
|---|---|---|---|
| Infraestrutura (web, banco, worker, Redis, e-mail, Sentry) | R$ 300–1.000 | R$ 1.000–3.000 | R$ 3.000–10.000 |
| LLM (consultor + produção de conteúdo) | R$ 100–500 | R$ 500–3.000 | R$ 3.000–10.000 |
| Ferramentas (SEO, design, analytics, BI) | R$ 500–1.500 | R$ 1.500–3.000 | R$ 3.000–6.000 |
| Produtos para teste (parte revendida) | R$ 0–3.000 | R$ 3.000–8.000 | R$ 8.000–20.000 |
| Conteúdo (editores/redatores/vídeo) | fundadores + 1 freela | 2–3 pessoas | 5–10 pessoas |
| Mídia paga | 0 | testes pontuais | por ROAS positivo |

Margem: afiliados tem margem bruta alta (> 80% depois de infra/ferramentas); o custo dominante é **pessoas** (conteúdo, dados, engenharia). Ponto de equilíbrio depende do tamanho da equipe — com equipe enxuta de 3–4 pessoas, o break-even no cenário base fica em torno de ~0,6–1,0 M sessões/mês.

## 17.5 Métricas a monitorar desde o primeiro clique
1. EPC real por loja e categoria (substitui as premissas).
2. CTR afiliado por tipo de página (produto, guia, vs, ofertas, consultor).
3. Comissão efetiva real (mix).
4. % de receita de compras halo.
5. Tempo clique → pedido (janela do cookie importa).

O modelo será mantido como planilha/notebook versionado (`docs/financeiro/` — a criar) alimentado pelos dados reais da Etapa 12.
