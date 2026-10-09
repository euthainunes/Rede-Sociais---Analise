# Etapa 11 — Arquitetura de GEO (Generative Engine Optimization)

## 11.1 Objetivo
Ser **a fonte citada** por ChatGPT, Gemini, Claude, Perplexity e AI Overviews quando alguém pergunta "qual celular comprar até R$ 3.000?" ou "o S26 Ultra vale a pena?". Mecanismos generativos privilegiam conteúdo **claro, factual, atual, estruturado e com autoridade identificável**.

## 11.2 Princípios de conteúdo extraível

1. **Resposta primeiro**: cada página e cada seção começam com uma resposta de 1–3 frases autocontida (sem "como vimos acima").
2. **Blocos de pergunta → resposta** com títulos em forma de pergunta real: "O Galaxy S26 Ultra vale a pena?", "Para quem não é?", "Qual a melhor alternativa mais barata?".
3. **Fatos com unidade, data e fonte** em tabelas HTML reais (`<table>`), não imagens: "Bateria: 5.000 mAh (fabricante, verificado em 02/10/2026)".
4. **Afirmações comparativas explícitas**: "Em bateria, o A dura ~2 h a mais que o B no nosso teste de streaming".
5. **Nomes de entidades consistentes** (sempre "Samsung Galaxy S26 Ultra", não variações).
6. **Datas visíveis**: "Atualizado em", "Preço coletado em".
7. **Números próprios e citáveis**: desconto real, índice de preços, notas por critério — informação que só existe aqui (o que dá motivo para citar).

## 11.3 Bloco padrão "Resumo para decisão" (topo de toda página de produto)

```
O que é: smartphone topo de linha da Samsung lançado em {data}.
Para quem é: quem prioriza câmera com zoom, caneta e produtividade.
Para quem não é: quem quer um celular compacto ou gastar menos de R$ 5.000.
Principal vantagem: melhor zoom óptico da categoria (nota de câmera 9,1).
Principal desvantagem: preço e tamanho.
Preço hoje: R$ 7.299 (Amazon, 08/10/2026 14:32) — 9% abaixo da mediana de 90 dias.
Melhor alternativa: {produto} (mais barato) · {produto} (iOS).
Vale a pena? Sim, se {condição}; caso contrário, {alternativa}.
```
Esse bloco é gerado a partir dos dados (não texto livre) e é revisado pela editoria.

## 11.4 Camada técnica para mecanismos de IA

| Item | Decisão |
|---|---|
| Rastreadores de IA | **Decisão de negócio necessária.** Recomendação: permitir crawlers de **busca/citação** (ex.: OAI-SearchBot, PerplexityBot, Claude-SearchBot/ClaudeBot, Googlebot) e avaliar caso a caso os de **treinamento** (GPTBot, Google-Extended, CCBot). Citação gera tráfego; treino não. Revisar trimestralmente. |
| `llms.txt` | Publicar `/llms.txt` com descrição do site, metodologia e links para hubs principais (custo baixo, adoção ainda incerta) |
| HTML semântico | `<article>`, `<section>`, títulos hierárquicos, tabelas reais, listas reais |
| Dados estruturados | Mesmo JSON-LD da Etapa 10 — LLMs e AI Overviews se apoiam no índice dos buscadores |
| Bing | Bing Webmaster Tools + IndexNow (busca do ChatGPT e outros dependem de índices como o do Bing) |
| Páginas de dados | Índice público de preços, tabelas de specs comparáveis, metodologia — conteúdos "de referência" com alta chance de citação |
| Desempenho | Páginas rápidas e sem JS obrigatório (alguns crawlers não executam JS) |

## 11.5 Autoridade e entidade da marca
- Página "Sobre" com equipe real, contato, política editorial e de correções.
- Presença consistente da marca (mesmo nome, logo, descrição) em YouTube, redes, Wikidata (quando elegível), imprensa.
- Menções em fontes de terceiros (PR de dados: "Índice Veredito mostra que smartphones caíram X% após o lançamento do sucessor").

## 11.6 Medição de GEO
- Tráfego de referência de IA (`chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `copilot` etc.) como canal `ai_referral` próprio.
- Painel mensal de **citações**: conjunto fixo de ~100 perguntas de decisão por categoria executado periodicamente em assistentes com busca; registrar se e como somos citados (manual na fase 1–2; automatizado depois, respeitando termos de uso das ferramentas).
- **GEO Score por página** (Etapa 16): presença do bloco de resumo, perguntas-resposta, tabelas de fatos com fonte/data, entidades consistentes, frescor.
