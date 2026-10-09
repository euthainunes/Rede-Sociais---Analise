# Etapa 15 — Arquitetura de conteúdo e metodologias

## 15.1 Tipos de conteúdo

| Tipo | Objetivo | Intenção de busca | Frequência de revisão |
|---|---|---|---|
| Review (na página do produto) | Veredito sobre um produto | "{produto} vale a pena", "{produto} review" | a cada 90 dias ou evento (preço, update, sucessor) |
| Comparação "vs" | Decidir entre 2–3 | "{A} vs {B}" | 90 dias |
| Guia "melhores" | Escolher dentro de uma faixa/uso | "melhor celular até 2000" | 30–60 dias |
| Explicador | Educar (topo de funil) | "quanto de RAM precisa" | 12 meses |
| Página de ofertas / post de oferta | Momento de compra | "promoção {produto}" | contínuo (dados) |
| Índice de preços | Referência, PR, GEO | "preço de celular está caindo?" | mensal |
| Vídeo | Prova visual, alcance | YouTube | por lançamento |
| Ativos sociais | Distribuição | — | por review |

Conteúdo é **estruturado em blocos** (`editorial.content.body` JSON): blocos de texto + blocos de dados vivos (tabela de specs, preço atual, gráfico, card de produto, comparação, prós/contras). Assim o mesmo conteúdo alimenta web, e-mail, social e respostas do consultor.

## 15.2 Estrutura da review (seção 5)
1. **Resumo** (veredito em 2–3 frases + nota geral)
2. **Para quem é** / **Para quem NÃO é**
3. **Principais pontos positivos** / **negativos**
4. **Desempenho** · **Câmera** · **Bateria** · **Tela** · **Software** (inclui política de atualizações) · **Construção** · **Experiência de uso**
5. **Custo-benefício** (com preço atual e histórico)
6. **Comparações** e **Concorrentes** (blocos de dados)
7. **Nossa avaliação** (notas por critério + link para metodologia + versão)
8. Metadados: autor, revisor, nível de evidência (`hands_on` | `data_based`), data de teste, changelog

## 15.3 Metodologia de notas (transparente e explicável)

### Estrutura
```
Nota geral = Σ (peso_critério × nota_critério)            pesos públicos por categoria (versão v1.0)
Nota_critério = nota_objetiva (0–10) + ajuste_editorial   ajuste ∈ [−0,5; +0,5], justificativa obrigatória e pública
```

### Pesos padrão — Celulares v1.0 (proposta)
| Critério | Peso | Insumos objetivos |
|---|---|---|
| Desempenho | 20% | Benchmarks de CPU/GPU (fontes citadas), RAM, estabilidade térmica (teste próprio quando houver) |
| Câmera | 20% | Sensores/ópticas, testes próprios padronizados (cenas fixas), referências de laboratórios citadas |
| Bateria | 15% | Capacidade, teste de autonomia padronizado (quando houver), velocidade de carga |
| Tela | 15% | Tipo, resolução, brilho medido/declarado, taxa de atualização |
| Software e atualizações | 10% | Anos de atualização de SO e segurança prometidos, bloatware |
| Construção | 10% | Materiais, IP, peso, proteção |
| Custo-benefício | 10% | Ver abaixo |

### Normalização
- Cada insumo é convertido para 0–10 por **percentil dentro da categoria nos últimos 24 meses** (ex.: bateria 5.000 mAh no percentil 70 → 7,0), com curvas documentadas.
- Notas são **relativas ao mercado atual**: recalculadas trimestralmente; a página mostra "nota no lançamento" e "nota hoje" quando mudarem.
- Insumos ausentes: critério marcado "dados insuficientes" e peso redistribuído (explicado na página).

### Custo-benefício
`custo_benefício = f(nota_sem_cb / preço_atual)` comparado com a curva de referência da categoria (regressão nota × log(preço)). Acima da curva = bom custo-benefício. Recalculado quando o preço muda; por isso é o único critério volátil e é sinalizado como tal.

### Fit Score (pessoal)
`Fit = Σ (peso_usuário × nota_critério)` com pesos derivados das prioridades (alta = 3, média = 2, baixa = 1, normalizados); restrições obrigatórias (`must_have`, tamanho, SO, orçamento) eliminam ou penalizam. Mostrado ao lado da nota geral com explicação.

### Governança
- Metodologia publicada em `/metodologia/{categoria}` com versão e changelog.
- Mudança de metodologia → recálculo de todas as notas da categoria e registro.
- Ajustes editoriais são auditados; comercial não tem permissão de escrita.

## 15.4 Metodologia de preço ("Vale comprar agora?") — seção 7

Base: série diária por variante (menor preço à vista entre lojas confiáveis, excluindo anomalias).

| Rótulo | Regra (v1.0) | Requisito mínimo |
|---|---|---|
| 🔥 Excelente preço | Preço atual ≤ menor preço dos últimos 90 dias × 1,02 **ou** percentil ≤ 10% da série de 90 dias | ≥ 30 dias de dados e ≥ 20 observações |
| 🟢 Bom preço | ≤ mediana de 90 dias × 0,95 | idem |
| 🟡 Preço normal | entre 0,95 e 1,05 × mediana de 90 dias | idem |
| 🔴 Preço alto | > mediana de 90 dias × 1,05 | idem |
| Dados insuficientes | menos que o mínimo | mostrar só preço atual e mínimo observado |

Frase gerada: *"O preço atual está 14% abaixo da mediana dos últimos 90 dias e 3% acima do menor preço já registrado."* — mediana em vez de média para resistir a picos.

Sinais adicionais (quando houver dados): proximidade de datas promocionais históricas, lançamento de sucessor anunciado, tendência de 30 dias.

**Desconto real** (página de ofertas): `1 − preço_atual / mediana_90d`. Exibido ao lado do desconto anunciado (`1 − preço / preço_de`) quando a diferença > 10 p.p.

Ranking "Melhor oportunidade" em `/ofertas`: `desconto_real × qualidade (nota) × confiabilidade da loja × disponibilidade`, sem comissão.

## 15.5 Workflow editorial (seção 31)
```
Rascunho → Revisão → Aprovado → Publicado → Atualização necessária ↺
```
- `needs_update` é disparado automaticamente por: `next_review_at` vencido, mudança de nota > 0,3, produto descontinuado, sucessor lançado, preço citado fora de ±15%, queda de tráfego/CTR.
- Toda publicação grava revisão e changelog visível ("Atualizado em…: o que mudou").

## 15.6 Distribuição (seções 25–26)
Cada review publicada gera um **pacote de distribuição** (rascunhos IA + revisão): roteiro de vídeo longo, 3 roteiros curtos (TikTok/Reels/Shorts), carrossel (5–8 telas a partir de notas/prós/contras), stories, legenda + CTA, sugestão de thumbnail, cortes sugeridos do vídeo longo, pin para Pinterest — cada um com seu short link para atribuição.
