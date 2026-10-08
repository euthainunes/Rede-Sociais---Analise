# Etapa 3 — Diferenciais competitivos e métrica norte

## 3.1 Tese: competir por **qualidade da decisão**

Um diferencial difícil de copiar precisa combinar **dados proprietários acumulados no tempo** + **metodologia** + **produto** + **confiança**. Nenhum deles isolado é defensável; juntos formam um fosso.

## 3.2 O diferencial: **Motor de Decisão Veredito**

Quatro componentes que se reforçam:

### 1. Fit Score (nota pessoal)
- Toda nota editorial é decomposta em notas por critério (performance, câmera, bateria, tela, software/atualizações, construção, custo-benefício).
- O usuário informa (ou o consultor infere) suas prioridades → pesos.
- **Fit Score = Σ (nota do critério × peso do usuário)** com penalidades por *dealbreakers* (ex.: "precisa de NFC", "tela até 6,3").
- Exibido como: *"Na média: 8,4 · Para você: 9,1 — porque você prioriza bateria e câmera."*
- Difícil de copiar porque exige notas por critério consistentes e metodologia pública para centenas de produtos.

### 2. Preço no tempo ("Vale comprar agora?")
- Histórico multiloja próprio (coletado desde o dia 1), por **variante**.
- Classificação baseada em mediana/percentil de 90 dias, desconto real vs. anunciado, sazonalidade (Black Friday, Dia do Consumidor, lançamentos).
- Aviso de ciclo de vida: "Sucessor esperado em ~2 meses; historicamente este modelo cai X% após o lançamento do sucessor" (só quando houver dados).
- Difícil de copiar porque **o tempo não se compra**: um concorrente que começar depois terá menos histórico.

### 3. Firewall comercial público
- O ranking editorial é calculado por um serviço que **não tem acesso** a comissão ou patrocínio (separação de schema/permissões).
- Página pública explica e mostra exemplos: "Nossa escolha #1 paga menos comissão que a #3."
- Difícil de copiar porque concorrentes dependentes de comissão não querem se expor.

### 4. Memória de decisões (aprendizado)
- Dados agregados: "pessoas com perfil parecido escolheram A (62%) e B (21%)"; satisfação pós-compra ("comprou? recomendaria?").
- Retroalimenta o consultor e o ranking de relevância (nunca o de comissão).
- Difícil de copiar porque é efeito de rede de dados.

### Resultado para o usuário
> "Com base no seu perfil e no que você valoriza, **este é o produto que eu compraria — e este é o momento/loja certos para comprar**."

## 3.3 Diferenciais de suporte

| Diferencial | Copiável? | Função |
|---|---|---|
| Desconto real vs. anunciado | Médio | Viralidade, confiança, PR (Black Friday) |
| Selo "testado por nós" vs. "baseado em dados" | Fácil de copiar o selo, difícil de sustentar | E-E-A-T, honestidade |
| Página "Não compre agora" | Fácil | Confiança contraintuitiva |
| Comparador "mostrar só diferenças" + vencedor por critério | Médio | UX |
| Vídeo + dados na mesma página | Médio | Conversão |
| Índice público de preços (ex.: "Índice Veredito de preços de smartphones") | Difícil (exige histórico) | Links naturais, imprensa, GEO |
| Dataset aberto/citável de specs | Médio | GEO, autoridade |

## 3.4 North Star Metric (seção 49)

### **Decisões Qualificadas por Semana (DQS)**

Número de **pares únicos (usuário, produto) por semana** em que o usuário:
1. consumiu ao menos um **ativo de decisão** do produto ou da categoria (review, comparador, histórico de preço, resultado do consultor IA, guia "melhores"), **e**
2. executou uma **ação de decisão**: clique de saída para oferta do produto, criação de alerta de preço, salvar/compartilhar comparação, ou aceitar recomendação do consultor.

Por que funciona:
- Não é tráfego (um usuário que lê e sai não conta).
- Não é só clique (alerta de preço e comparação salva também são decisões úteis — e não geram receita imediata, protegendo contra otimização puramente comercial).
- Correlaciona com receita (a maioria das DQS envolve clique) sem ser receita.

**Guardrails** (não podem piorar enquanto a DQS sobe):
- Taxa de retorno à SERP em < 10 s (pogo-sticking) nas páginas de decisão.
- Satisfação pós-compra (pesquisa "Comprou? Recomendaria?").
- % de cliques em ofertas que não são a "melhor oferta" indicada (sinal de que nossa recomendação de loja está errada).
- Conversão confirmada / clique (qualidade do tráfego enviado).

## 3.5 Árvore de métricas

| Estágio | Métricas |
|---|---|
| **Aquisição** | Sessões, usuários novos, % orgânico/direto/social/pago/e-mail, impressões e CTR no Search Console, citações em IA (monitoradas), buscas pela marca |
| **Ativação** | % de sessões que chegam a um ativo de decisão; % que interagem (filtro, comparar, gráfico, consultor); tempo até primeira ação de decisão |
| **Engajamento** | Páginas de decisão por sessão, comparações iniciadas, conversas com o consultor concluídas, scroll em reviews |
| **Monetização** | CTR afiliado (sessões com clique / sessões), EPC, RPM (receita por mil sessões), receita por conteúdo/produto/categoria/canal, taxa de conversão confirmada |
| **Retenção** | Usuários com alerta ativo, abertura/clique de alertas, usuários recorrentes em 30/90 dias, assinantes de newsletter, buscas pela marca |
| **Qualidade de dados** | % ofertas atualizadas < 24 h, % produtos com matching revisado, links quebrados, % specs com fonte |
