# Arquitetura de RAG

O RAG (geração aumentada por recuperação) alimenta o consultor de compras e, depois, os rascunhos editoriais e a busca semântica. A regra central vem da Etapa 14: **a IA nunca é fonte de fatos.**

## 1. Duas camadas de conhecimento

| Camada | O que é | Como é recuperada | Onde vive |
|---|---|---|---|
| **1. Fatos estruturados** | Specs, notas, preço atual, rótulo "vale comprar agora?", com fonte, data e confiança | **Ferramentas determinísticas** que consultam o catálogo (`CatalogPort.getFacts`), nunca busca vetorial | Tabelas `catalog`, `pricing`, `editorial.product_score` |
| **2. Conhecimento editorial** | Reviews, guias, comparativos, metodologia e FAQs **publicados e revisados** | **Busca híbrida** (vetor + palavra-chave) | `ai.knowledge_document`, `ai.knowledge_chunk` |

Por que separar: números (preço, mAh, notas) precisam ser exatos e atuais, e embeddings são ruins para isso. O texto editorial traz contexto, opinião e evidência de teste, e é aí que a busca semântica ajuda.

Ficam **fora** do índice: textos de lojas, reviews de terceiros, conteúdo em rascunho e qualquer coisa não revisada.

## 2. Pipeline

```
Conteúdo publicado (editorial.content)
  → CatalogService.knowledgeDocuments()        documentos com produtos e categoria
  → chunkDocument()                            por seção, ~1.800 caracteres, sobreposição de 200,
                                               cabeçalho contextual "Título › Seção"
  → Embedder.embed(kind="document")            Voyage (produção) | Hashing (dev/teste/offline)
  → KnowledgeStore.upsert()                    pgvector HNSW (cosseno) + tsvector em português
```

Consulta:

```
Pergunta do usuário
  → parseIntent()                     categoria, orçamento, prioridades, SO, restrições (determinístico)
  → seleção de produtos por Fit Score (determinística, sem comissão)
  → retrieve(query, filtro = categoria + produtos escolhidos)
       ├─ vectorSearch (top 20)
       ├─ keywordSearch (top 20; websearch_to_tsquery, com fallback para OR)
       └─ Reciprocal Rank Fusion (k = 60) + no máximo 2 trechos por documento
  → getFacts(produtos) → só fatos com confiança ≥ 0,7
  → buildGroundedContext()            [F1..Fn] fatos, [D1..Dn] trechos delimitados como dados
  → LLM redige a explicação, citando [F#]/[D#]
  → validateGrounding()               todo número com unidade (8 GB, 120 Hz, 9%) e todo número > 10
                                      precisa existir num fato ou trecho; citações precisam existir
       ├─ ok          → exibe (modo "llm")
       ├─ falhou      → 1 nova tentativa com o erro apontado
       └─ falhou de novo / recusa / sem chave / orçamento esgotado → explicação por template (modo "template")
```

## 3. Implementação

| Peça | Arquivo |
|---|---|
| Tipos (documento, trecho, fato, interfaces) | `packages/ai/src/rag/types.ts` |
| Chunking por seção com hash de conteúdo | `packages/ai/src/rag/chunker.ts` |
| Embedders (Hashing, Voyage) e fábrica por ambiente | `packages/ai/src/rag/embedder.ts` |
| Store em memória (dev/testes, BM25 simplificado) | `packages/ai/src/rag/memory-store.ts` |
| Store Postgres (pgvector + FTS português) | `packages/db/src/knowledge-store.ts` |
| Indexação e busca híbrida com RRF | `packages/ai/src/rag/pipeline.ts` |
| Contexto citável e verificador de fundamentação | `packages/ai/src/rag/grounding.ts` |
| Consultor (intenção → seleção → RAG → redação → verificação) | `packages/ai/src/advisor/` |
| Cliente Claude com orçamento diário e fallback de recusa | `packages/ai/src/llm.ts` |
| Tabelas | `packages/db/migrations/0002_rag_partitions_roles.sql` |
| Reindexação | `pnpm --filter @veredito/db index-knowledge` |

## 4. Segurança do RAG

- **Prompt injection:** os trechos entram como `<documento>` e o prompt de sistema diz que o conteúdo ali é dado, não instrução. Só conteúdo próprio e revisado é indexado.
- **Firewall comercial:** nem as portas do consultor nem o índice têm acesso a comissão. No banco, os papéis `veredito_ranking` e `veredito_editorial` não leem as tabelas de comissão.
- **Custo:** orçamento diário (`AI_DAILY_BUDGET_USD`) com corte automático para o modo template. A seleção de produtos não usa o LLM, então o consultor continua funcionando mesmo sem IA.

## 5. Avaliação (próximo passo)

- `ai.retrieval_log` guarda a consulta, os trechos devolvidos, os ranks e o relatório do verificador.
- Conjunto de avaliação: cerca de 100 perguntas reais por categoria, com a resposta esperada (produto e trecho). Métricas: recall@4 da recuperação, taxa de aprovação no verificador e taxa de clique pós-recomendação.
- Trocar o embedder (Hashing → Voyage) exige reindexar. O modelo usado fica gravado em `ai.knowledge_document.embedding_model`.

## 6. Configuração

```
EMBEDDINGS_PROVIDER=voyage        # hashing (padrão, offline) | voyage
VOYAGE_API_KEY=...
EMBEDDINGS_DIMENSION=1024         # precisa bater com vector(1024) na migração
ANTHROPIC_API_KEY=...             # sem chave: consultor em modo template
AI_MODEL=claude-opus-5-5
AI_DAILY_BUDGET_USD=20
```
