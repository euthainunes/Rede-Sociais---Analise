# Decisões tomadas (D1–D8)

Registro das decisões pendentes listadas no `README.md`. Foram tomadas com autonomia delegada pela fundadora em 08/10/2026 e podem ser revistas.

| # | Decisão | Escolha | Por quê |
|---|---|---|---|
| D1 | Foco do lançamento | **Só celulares.** Notebooks, tablets, smartwatches e acessórios entram na fase 2 | Profundidade antes de amplitude. O engine já é multivertical: uma categoria nova é um arquivo de configuração em `packages/core/src/verticals/` |
| D2 | Stack | **Next.js 16 (App Router, RSC) + PostgreSQL 16 (pgvector, FTS, partições) + TypeScript ponta a ponta.** Migrações em **SQL puro** com o cliente `postgres` | SQL explícito no lugar do Drizzle: o modelo usa recursos de Postgres (partições, papéis, pgvector, colunas geradas) que ficam mais claros em SQL; um ORM pode entrar depois, sem retrabalho |
| D3 | Admin | **Admin próprio** (fase seguinte), sobre os mesmos serviços | Catálogo, matching, preço e notas são específicos do domínio; um CMS genérico ajudaria pouco |
| D4 | Programas de afiliados | Ordem: **1. Amazon Associados → 2. Mercado Livre Afiliados → 3. Awin (rede) → 4. Magalu/KaBuM → 5. Shopee** | Ver justificativas abaixo |
| D5 | Robôs de IA | **Liberar** robôs de busca/citação (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Claude-User). **Bloquear** robôs de treinamento (GPTBot, Google-Extended, CCBot, ClaudeBot, Bytespider) | Citação traz tráfego; treinamento não. Implementado em `apps/web/app/robots.ts`, para revisar a cada trimestre |
| D6 | Marca | **"Veredito"**, um nome fictício provisório, centralizado em `packages/brand/src/index.ts` | Trocar a marca é mudar um arquivo. Antes de definir o nome real: pesquisa no INPI, domínio `.com.br` e handles |
| D7 | Testes próprios | **Sim**, nos 20 modelos mais buscados. O restante recebe o selo "baseada em dados" | É o que diferencia as reviews para o Google (E-E-A-T) e para as citações em IA |
| D8 | Portais de marcas e creators | **Fase 3, com condições** | Depende de audiência e de contratos que permitam sub-afiliação (Etapa 1, R3) |

## D4 — Por que esta ordem de programas

1. **Amazon Associados (Brasil).** Tem a maior confiança do consumidor em eletrônicos, e o link funciona só com a tag, sem precisar de API. A limitação é a atribuição apenas por *tracking tag*. Por isso usamos uma tag por canal (`tagsByChannel`) e alocamos as vendas da tag entre os cliques. E-mails nunca levam link da Amazon.
2. **Mercado Livre Afiliados.** É o maior marketplace do país, com muitas lojas oficiais de celular. O link é gerado no painel do programa, então usamos o **adaptador por template** (`MERCADOLIVRE_LINK_TEMPLATE`) até haver integração por API.
3. **Awin.** É a única opção da lista com **sub-ID por clique (`clickref`) e feed de produtos**, o que dá atribuição exata e preços sem scraping. Ainda é preciso confirmar quais anunciantes de eletrônicos aprovam o site.
4. **Magalu / KaBuM.** São fortes em eletrônicos e informática; o KaBuM pesa para notebooks e acessórios na fase 2.
5. **Shopee.** É boa para acessórios e compras "halo". Para smartphones a prioridade é menor, porque a variação de vendedores dificulta o matching e a confiança.

Todos estão como `termsVerified: false` em `packages/integrations/src/affiliate/programs.ts`. Antes de ir para produção, é preciso conferir no painel de cada programa: comissão por categoria, idade máxima do preço exibido, armazenamento de histórico, links em e-mail e sub-afiliação.

## Ajustes em relação à documentação original

- **Orçamento de JavaScript (docs/07 §7.5):** o runtime do Next 16 (App Router) sozinho pesa cerca de 165 KB gzip. O alvo de "< 70 KB incluindo framework" não é atingível com essa stack. Novo alvo: **JavaScript próprio < 30 KB gzip** e nenhum script de terceiros antes do consentimento. Hoje o JS próprio é só o banner de consentimento (~1 KB); o conteúdo é renderizado no servidor e todas as interações (variante, período do gráfico, filtros, comparador, consultor) funcionam sem JavaScript. Se as medições de campo mostrarem INP ruim em aparelhos de entrada, a alternativa é migrar as páginas públicas para Astro, mantendo os pacotes `core/db/ai`.
- **Escala das notas:** o percentil dentro da categoria coloca o produto mediano em 5,0. Com o catálogo de demonstração de 10 modelos, as notas ficam muito espalhadas. A curva de normalização deve ser **calibrada com o catálogo real** (≥ 80 modelos) antes do lançamento. A calibração vira a metodologia v1.1, publicada com changelog.
