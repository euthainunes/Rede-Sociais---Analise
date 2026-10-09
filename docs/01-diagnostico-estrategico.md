# Etapa 1 — Diagnóstico estratégico

> Codinome provisório do projeto: **Veredito** (ver Etapa 2 para opções de marca).
> Escopo inicial: tecnologia (celulares, notebooks, tablets, smartwatches, acessórios). Arquitetura: engine multivertical.

## 1.1 Leitura crítica em uma frase

A visão está correta no **objetivo** (vender decisão, não links) e no **modelo de dados** (Product canônico → várias Offers), mas é **ampla demais para o estágio**: mistura uma publisher editorial, um comparador de preços, uma rede de afiliados B2B2C (marcas + creators), uma IA de compra e uma plataforma de dados. Cada um desses é uma empresa. O risco número um não é técnico — é **dispersão de foco antes de existir audiência**.

A recomendação central deste diagnóstico:

1. **Ganhar o direito de existir em um nicho estreito** (smartphones no Brasil, R$ 1.000–R$ 8.000) com a melhor experiência de decisão do mercado.
2. **Começar a coletar dados proprietários no dia 1** (preço por oferta, comportamento de decisão), mesmo que a interface que os usa venha depois — histórico de preço não se recupera retroativamente.
3. **Adiar tudo que depende de escala que ainda não existe** (portal de marcas, rede de creators, DW, white-label).

## 1.2 Oportunidades

| # | Oportunidade | Por que é real |
|---|---|---|
| O1 | **Desconto real vs. desconto anunciado** | O consumidor brasileiro desconfia de "preço de/por" (a "Black Fraude"). Calcular desconto contra mediana histórica é um diferencial verificável e muito compartilhável. |
| O2 | **Decisão personalizada** ("o que faz sentido para mim") | Comparadores tradicionais respondem "onde está mais barato"; publishers respondem "o que é bom". Quase ninguém cruza perfil do usuário × dados × preço no momento. |
| O3 | **Fragmentação de varejo no Brasil** | Amazon, Mercado Livre, Magalu/KaBuM, Shopee, Casas Bahia, lojas oficiais: preços divergem muito e mudam rápido — valor real em consolidar. |
| O4 | **IA generativa como nova porta de entrada** | ChatGPT, Gemini, Perplexity e AI Overviews precisam de fontes estruturadas, atualizadas e verificáveis. Um site com dados limpos e entidades claras vira fonte citada (GEO). |
| O5 | **Conteúdo em vídeo + dados** | Reviewers de YouTube têm confiança mas não têm dados de preço vivos; comparadores têm dados mas não têm confiança. Unir os dois é raro. |
| O6 | **Alertas de preço como ativo de retenção** | Alertas criam um canal próprio (e-mail/push) independente do Google e dão sinal de intenção forte. |
| O7 | **Engine multivertical** | Se a camada "categoria → atributos → critérios de nota" for configuração, cada novo vertical custa conteúdo, não reengenharia. |

## 1.3 Riscos (priorizados)

| # | Risco | Severidade | Mitigação |
|---|---|---|---|
| R1 | **Dependência do Google orgânico.** Os updates de 2023–2024 (Helpful Content incorporado ao core, Product Reviews, *site reputation abuse*, *scaled content abuse*) derrubaram grande parte dos sites de afiliados. | Crítica | Diferenciação por dados próprios e evidência de primeira mão; canais próprios (e-mail, alertas, YouTube); marca buscada pelo nome. |
| R2 | **Comissões baixas em eletrônicos.** Smartphones costumam ter as menores taxas dos programas brasileiros, e alguns programas excluem ou limitam a categoria. | Alta | Modelar receita com taxa **efetiva** conservadora; buscar mix com acessórios/halo; negociar direto com lojas oficiais; validar tabela de cada programa antes de qualquer projeção. |
| R3 | **Termos dos programas de afiliados.** Ex.: programas como o Amazon Associados costumam exigir atualização de preço em janela curta com horário exibido, proibir links de afiliado em e-mail/PDF/offline e restringir uso/armazenamento de dados da API. Redistribuir comissão para creators (sub-afiliação) costuma ser **proibido** sem acordo. | Crítica | Revisão jurídica por programa; e-mails de alerta apontam para o **nosso** site, nunca direto ao varejista; rede de creators só com contratos diretos com lojas/redes que permitam sub-afiliação. |
| R4 | **Dados de preço**: scraping de varejistas tem risco jurídico (termos de uso) e técnico (bloqueio). | Alta | Priorizar feeds/APIs oficiais de redes de afiliados (que já entregam preço) e APIs de produto; scraping apenas onde permitido; nunca depender de uma fonte só. |
| R5 | **Escopo** (marcas + creators + IA + DW no mesmo plano). | Alta | Roadmap com portões de validação (Etapa 18); o MVP só termina quando o funil consumidor → clique estiver provado. |
| R6 | **Confiança editorial**: notas arbitrárias ou contaminadas por comissão destroem a marca e violam diretrizes do Google sobre reviews. | Alta | Metodologia pública e versionada; "firewall comercial" na arquitetura (o ranking não lê comissão); selo "testado por nós" vs. "análise baseada em dados". |
| R7 | **IA alucinando especificações/preços.** | Alta | Fatos sempre renderizados a partir do banco; IA só escreve prosa com referências a fatos (Etapa 14). |
| R8 | **Atribuição incompleta**: muitos programas não devolvem venda por clique (só por tag ou agregado). | Média | Modelo de "nível de fidelidade de atribuição" por programa (Etapa 13) e alocação estatística quando não houver sub-ID. |
| R9 | **Merchant Center / Google Ads**: Shopping exige, em regra, que o anunciante seja o vendedor; o programa CSS (comparadores) é restrito a mercados específicos. Ads tem política contra *bridge pages*. | Média | Tratar Merchant Center como **não aplicável** até validação de política; Ads só para páginas com valor próprio claro (comparador, histórico). |
| R10 | **LGPD / CDC / CONAR**: perfilamento para recomendação, cookies, publicidade não identificada, afirmações de preço. | Média | Privacy by design (Anexo A), divulgação clara de afiliados, "preço sujeito a alteração" com horário da coleta. |
| R11 | **Custo operacional de conteúdo** de qualidade. | Média | Foco em poucas páginas excelentes; IA como assistente de produção com revisão humana; dados reaproveitados em todos os formatos. |
| R12 | **Commoditização pela IA** (assistentes de compra nativos no ChatGPT/Google). | Estratégica | Ser a fonte que eles citam (GEO) + ter o que eles não têm: histórico de preço próprio, metodologia, testes, comunidade, alertas. |

## 1.4 Funcionalidades ausentes na especificação

1. **Variantes de produto.** "iPhone 17 Pro 256 GB Azul" ≠ "iPhone 17 Pro 512 GB". Ofertas e preços se ligam à **variante**; reviews e notas ao **modelo**. Sem isso, o histórico de preço fica errado.
2. **Matching de ofertas** (qual anúncio da loja corresponde a qual variante): regras por GTIN/EAN → MPN → título normalizado → revisão humana. É o coração da qualidade do comparador.
3. **Seller vs. marketplace**: no Mercado Livre/Shopee/Amazon o vendedor muda. Precisamos registrar vendedor, se é loja oficial, condição (novo/recondicionado/importado), frete e parcelamento — que mudam a decisão no Brasil.
4. **Preço à vista (Pix) vs. parcelado**: no Brasil isso é central e deve ser modelado separadamente.
5. **Ciclo de vida do produto**: lançado, em venda, descontinuado, sucessor (link "Existe uma versão mais nova").
6. **Página de metodologia e de editores (E-E-A-T)**: autores reais, credenciais, como testamos.
7. **Correções e changelog editorial** por página ("Atualizado em…: preço e recomendação revisados").
8. **Feedback do usuário pós-clique** ("Comprou? Como foi?") — dado de satisfação para o motor de recomendação.
9. **Página de "não compre agora"** — quando um sucessor está prestes a ser lançado. Gera confiança.
10. **Ferramenta de "quanto custa por ano"** (atualizações de software, durabilidade da bateria) — custo total de propriedade.
11. **Política de conteúdo patrocinado** formal antes de vender qualquer patrocínio.
12. **Detecção de bots/fraude de cliques** — tráfego automatizado enviado a varejistas pode violar termos e contaminar métricas.

## 1.5 Problemas por dimensão

### UX
- Risco de excesso de informação na página de produto (18 seções). Precisa de **resposta em 5 segundos** no topo (veredito, para quem é, preço agora, ação) e profundidade progressiva abaixo.
- Comparador com 3+ produtos é ilegível no celular em tabela: requer layout próprio (linhas por atributo, colunas fixas, "mostrar só diferenças").
- Chat de IA como interface principal é lento para a maioria; deve ser **opcional**, com fluxo guiado (perguntas com botões) como padrão.
- CTA múltiplos (várias lojas) podem gerar paralisia: destacar **uma** melhor oferta com critério explícito ("menor preço total de loja confiável").

### SEO
- Páginas programáticas por faixa de preço × uso × marca explodem combinatoriamente → *thin content* e *scaled content abuse*. Precisa de **portão de qualidade** (Etapa 10).
- Páginas de produto de variantes podem canibalizar: uma URL canônica por modelo; variantes via parâmetro canônico.
- FAQ rich results foram restritos pelo Google (2023) a sites governamentais/saúde — marcação FAQ não deve ser tratada como alavanca de SERP.
- `AggregateRating` só com avaliações reais de usuários coletadas no site; a nota editorial vai em `Review`.

### GEO
- Conteúdo longo e narrativo é pouco "extraível". Cada página precisa de blocos de resposta curtos, tabelas de fatos com fonte e data, e entidades nomeadas de forma estável.
- Decisão estratégica sobre crawlers de IA (permitir citação vs. bloquear treino) precisa ser tomada explicitamente.

### Performance
- Gráficos de preço, comparadores e chat são os maiores riscos de JS. Gráfico deve ser SVG renderizado no servidor (zero JS para ver), interatividade opcional.
- Scripts de terceiros (GA4, Ads, Pinterest, TikTok, CMP) costumam ser o maior custo de INP: carregar só após consentimento e após interação/idle.

### Monetização
- A projeção depende da taxa de comissão efetiva e da conversão no varejista — ambas fora do nosso controle. Diversificar: alertas (retenção), newsletter patrocinada (fase 3), parcerias diretas com marcas.
- Risco de conflito: "destaque patrocinado" no mesmo espaço da recomendação editorial. Deve ser visualmente separado e rotulado.

### Afiliados
- Cookie de atribuição curto (ex.: 24h em alguns programas) — o clique precisa estar perto da compra; alertas e "vale comprar agora?" ajudam.
- Deep links quebram com frequência; monitoramento contínuo é obrigatório (Etapa 13).
- Limite de *tracking IDs/sub-IDs* por programa condiciona a granularidade de atribuição.

### Dados
- Sem matching confiável de ofertas, histórico de preço e comparador mostram dados errados — o pior cenário para uma marca de confiança.
- Specs vêm de fontes conflitantes (fabricante, loja, comunidade). Toda spec precisa de `source`, `last_verified_at`, `confidence`.

### Escalabilidade
- O gargalo não é banco nem servidor; é **operação editorial e de dados**. A arquitetura técnica pode ser simples (Postgres + app SSR + workers) até dezenas de milhões de pageviews/mês com CDN.
- Eventos de analytics crescem mais rápido que todo o resto: particionar desde o início e ter caminho claro para um banco colunar.

### Jurídico
- LGPD (consentimento, perfilamento, direitos do titular, encarregado), CDC (informação clara de preço, publicidade identificável), CONAR (publicidade de influenciadores — relevante para creators), Marco Civil (guarda de registros de acesso), propriedade intelectual (imagens de produto: usar kits de imprensa/APIs com licença; nunca copiar fotos de reviews de terceiros), uso de marcas registradas em URLs e anúncios.

### Dependência de plataformas
- Google (tráfego), programas de afiliados (receita e dados), YouTube/TikTok/Instagram (alcance), provedores de LLM (custo e disponibilidade).
- Mitigação: abstrair cada dependência atrás de um adaptador (afiliados, LLM, e-mail, analytics) e construir canais próprios.

## 1.6 Benchmarking conceitual (seção 46)

| Player | Faz melhor | Faz pior | Lição para nós |
|---|---|---|---|
| **Buscapé / Zoom** | Cobertura de lojas, comparação de preço, histórico, marca conhecida | Experiência genérica, pouca opinião, foco em "mais barato", páginas pesadas de anúncios | Preço é commodity; diferenciar em decisão e confiança. |
| **Google Shopping** | Escala, frescor de preço, insights de "preço típico" em alguns mercados | Não opina, favorece quem anuncia, sem contexto de uso | Não competir em cobertura; competir em julgamento. |
| **Wirecutter** | Metodologia, testes reais, recomendação clara ("nossa escolha / econômica / premium") | Lento para atualizar, cobertura limitada, sem dados de preço vivos | Copiar o **formato de decisão**, não o volume. |
| **GSMArena** | Banco de specs completo e padronizado, comparador técnico | UX datada, pouca orientação para leigos, sem preço local | Specs são base, não produto. |
| **RTINGS** | Notas por uso derivadas de testes mensuráveis, metodologia pública e versionada | Nicho, interface densa | Referência para **metodologia transparente de notas**. |
| **TechRadar / The Verge** | Autoridade, jornalismo, reviews com opinião | Monetização agressiva em listas, conteúdo diluído | Opinião editorial forte vende confiança. |
| **Tecnoblog / Canaltech / TecMundo / Olhar Digital** | Audiência BR, notícias rápidas | Notícia é custosa e efêmera; pouca ferramenta de decisão | Não entrar em notícias; entrar em decisão. |
| **Pelando / Promobit** (comunidades de ofertas) | Comunidade, velocidade, validação social de ofertas | Pouca análise de "faz sentido para mim?" | Alertas e desconto real; possivelmente comunidade na fase 3. |
| **Amazon** | Reviews de usuários em escala, conveniência | Reviews manipuláveis, viés para o próprio marketplace | Nossa neutralidade entre lojas é diferencial. |
| **YouTubers de tecnologia** | Confiança, prova visual, primeira mão | Sem preço vivo, sem comparação estruturada, links soltos | Integrar vídeo + dados; parcerias com creators. |
| **Keepa / CamelCamelCamel** | Histórico de preço profundo (Amazon) | Uma loja só, sem opinião | Histórico multiloja + opinião. |
| **ChatGPT / Perplexity / Google AI Mode (compras)** | Conversa natural, síntese | Dados de preço locais imprecisos, pouca metodologia | Ser a fonte que eles citam; oferecer o que eles não têm (histórico, alertas, testes). |

**O que ninguém faz bem no Brasil:**
1. Responder "vale comprar **agora**?" com dados de histórico multiloja.
2. Expor desconto real vs. anunciado de forma sistemática.
3. Personalizar a nota ao perfil do usuário ("para você, este é 8,9; na média, 8,2").
4. Separar publicamente nota editorial de interesse comercial.
5. Unir prova de vídeo, dados técnicos e preço vivo na mesma página.

## 1.7 Melhorias propostas (resumo — detalhadas nas etapas seguintes)

1. **Modelo Produto → Variante → Oferta → Observação de preço** (Etapa 8).
2. **Coleta de preço desde o MVP**, interface de histórico na fase 2 (Etapa 18).
3. **Nota em duas camadas**: nota editorial objetiva (metodologia pública) + **Fit Score** pessoal (pesos do usuário) (Etapa 15).
4. **Firewall comercial** técnico: serviço de ranking não tem acesso a campos de comissão; auditoria registrada (Etapa 14).
5. **Fatos renderizados do banco** em todo conteúdo, inclusive o gerado por IA (Etapa 14/15).
6. **Portão de qualidade** para páginas programáticas (Etapa 10).
7. **Fidelidade de atribuição por programa** (Etapa 13).
8. **E-mail/alertas apontam para o nosso site**, nunca para o link afiliado direto (Etapa 13).
9. **Portal de marcas e rede de creators condicionados** a validação jurídica e de audiência (Etapa 18).
10. **Página "Como ganhamos dinheiro"** e rótulos de patrocínio desde o dia 1.
