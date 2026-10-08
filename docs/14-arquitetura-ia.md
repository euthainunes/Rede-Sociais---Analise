# Etapa 14 — Arquitetura de IA

## 14.1 Regra de ouro
**A IA nunca é fonte de fatos.** Fatos (specs, preços, notas, datas) vêm do banco com proveniência. A IA **interpreta** (intenção do usuário), **seleciona** (com ferramentas determinísticas), **explica** (prosa) e **redige** (rascunhos para humanos). Todo número que aparece em uma resposta é verificado contra o banco antes de ser exibido.

## 14.2 Componentes

```
packages/ai
├── client/            adaptador de provedor (Claude por padrão; trocável), retries, limites de custo
├── tools/             ferramentas determinísticas expostas ao modelo (tool use)
├── prompts/           prompts versionados (prompt_version gravado em ai.generation)
├── validators/        verificador de fatos, verificador de política (sem comissão, sem promessa)
├── advisor/           orquestração do consultor
└── content/           pipelines de rascunho (review, FAQ, meta, social, roteiros)
```

Modelos: um modelo rápido/barato para **parsing de intenção, classificação e extração**; um modelo mais capaz para **conversa do consultor e rascunhos editoriais**. Escolha por tarefa configurável, com custo registrado por chamada.

## 14.3 Consultor de compras (seção 11)

### Fluxo
```
1. Entrada: fluxo guiado (chips) ou texto livre ("celular até 3 mil para foto e jogo")
2. Parse de intenção (modelo rápido, saída JSON validada):
   { category, budget_max, priorities: {camera: high, performance: high}, os, size, brands_avoid, must_have }
3. Falta informação crítica? → pergunta objetiva (máx. 2 rodadas; sempre com opções clicáveis)
4. Ferramentas determinísticas:
   search_products(filters) → candidatos com oferta ativa
   get_scores(product_ids) → notas por critério
   compute_fit_score(profile, product_ids) → ranking pessoal (packages/core, sem comissão)
   get_price_verdict(variant_ids) → "vale comprar agora?"
   get_product_facts(product_id, keys) → fatos com fonte/confiança
5. Seleção por regra: melhor Fit Score · mais barata com Fit ≥ limiar · premium · melhor custo-benefício
6. Redação (modelo capaz): explica o porquê usando SOMENTE os fatos retornados (referências por id)
7. Validador: cada número/afirmação factual precisa casar com um fato retornado; senão, reescreve ou remove
8. Saída: cartões de produto renderizados pela UI (preço, nota, CTA vêm do banco) + texto explicativo
```

### Formato de resposta
**Minha recomendação** (produto + 2–3 razões ligadas às prioridades) · **Alternativa mais barata** · **Alternativa premium** · **Melhor custo-benefício** · **O que eu evitaria e por quê** · ações: [Comparar os 3] [Criar alerta] [Ver oferta].

### Salvaguardas
- Se nenhum produto atende: dizer isso e sugerir ajustar orçamento/prioridade (não forçar recomendação).
- Conteúdo de terceiros (títulos de lojas, reviews externas) entra como **dado não confiável** — protegido contra *prompt injection* (nunca segue instruções contidas em dados).
- Limites: tamanho de mensagem, nº de turnos, rate limit por `anon_id`/IP, orçamento diário de tokens com corte automático e fallback para o fluxo guiado sem IA.
- Ferramentas não têm acesso a comissão (firewall).
- Registro em `ai.advisor_session` (perfil inferido, recomendações) para aprendizado — com consentimento de personalização para vincular à pessoa.

### Custo (ordem de grandeza, a validar com preços vigentes)
Uma sessão típica (parse + 1 redação, ~6–10 k tokens de entrada e ~800 de saída) custa poucos centavos de real. Com cache de prompts para instruções fixas e resultados de perfis comuns, o custo é marginal frente ao EPC. Ainda assim, o orçamento diário é obrigatório.

## 14.4 IA como motor de conteúdo (seção 12)

### Fatos como "tokens" — prosa sem números inventados
Rascunhos usam marcadores ligados ao banco: `{{spec:battery_mah}}`, `{{score:camera}}`, `{{price:current}}`. O renderizador substitui pelo valor atual (com tooltip de fonte). Consequências: (1) a IA não consegue inventar spec; (2) o texto se atualiza quando o dado muda; (3) o validador rejeita qualquer número "solto" em afirmações factuais.

### Pipelines
| Saída | Entrada | Revisão humana |
|---|---|---|
| Rascunho de review (estrutura da Etapa 15) | Specs, notas, testes da editoria, notas de campo do revisor | Obrigatória; review publicada sem teste próprio recebe selo "baseada em dados" |
| Comparativo | Notas e specs dos produtos | Obrigatória |
| FAQ / perguntas | Consultas reais do Search Console + buscas internas + dados | Obrigatória |
| Títulos, metas, snippets | Template + dados | Amostral |
| Roteiros YouTube/TikTok/Reels, carrossel, stories, legendas, CTAs | Review publicada | Obrigatória |
| Newsletter | Ofertas com desconto real + conteúdos da semana | Obrigatória |
| Extração de specs de páginas de fabricante | Página/ficha técnica | Entra com `source=ai_extraction`, confiança limitada, fila de validação |

### Anti-"fazenda de conteúdo"
- Nada gerado por IA é publicado sem aprovação no workflow (status `in_review`).
- Cada conteúdo precisa de elemento que só nós temos (dado de preço, nota, teste, opinião assinada) — checado pelo Content Score.
- Limite operacional: volume de publicação limitado pela capacidade de revisão, não pela de geração.
- Divulgação: política editorial explica como a IA é usada.

## 14.5 Busca semântica (seção 17)
- Embeddings de produtos (nome + resumo + specs-chave + perfis de uso) em `pgvector`.
- Consulta → parse de intenção (filtros estruturados: preço, categoria, marca, recursos) + busca híbrida (FTS/trigram + vetor) → reordenação por relevância (nota, popularidade, disponibilidade) — **sem comissão**.
- Correção ortográfica: trigram + dicionário de marcas/modelos; sinônimos por categoria (vocabulário controlado).
- Consultas de intenção recorrentes viram links para guias ("celular bom até 2000" → `/melhores/celulares-ate-2000`).

## 14.6 Motor de recomendação (seção 42)
| Sinal | Uso | Fase |
|---|---|---|
| Visualizações, comparações, cliques, alertas | Popularidade e co-ocorrência ("quem viu A comparou com B") | 2 |
| Perfis do consultor + escolhas | "Pessoas com perfil parecido escolheram…" | 3 |
| Conversões | Qualidade do tráfego por produto/loja | 3 |
| Satisfação pós-compra | Ajuste de confiança na recomendação | 3 |

Dois rankings **separados por arquitetura**:
- **Relevância para o usuário** (`relevance_score`): Fit + qualidade + preço + popularidade + satisfação. Usado em consultor, busca, guias e "alternativas".
- **Valor comercial** (`commercial_value`): EPC, comissão, conversão. Usado **apenas** em dashboards e decisões de negócio (ex.: qual conteúdo produzir), nunca para ordenar recomendações.
