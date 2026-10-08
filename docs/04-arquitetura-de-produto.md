# Etapa 4 — Arquitetura completa do produto

## 4.1 O engine e seus ambientes

```
ENGINE (núcleo compartilhado, configurável por vertical)
│
├── Catálogo ......... Vertical → Categoria → Produto → Variante → Oferta → Observação de preço
├── Editorial ........ Review, Comparativo, Guia, Explicador, Página de oferta, Vídeo
├── Decisão .......... Notas por critério, Fit Score, Comparador, Consultor, "Vale comprar agora?"
├── Comercial ........ Lojas, Programas de afiliados, Links, Cliques, Conversões, Comissões
├── Relacionamento ... Contas, Leads, Consentimentos, Alertas, Newsletter, CRM
├── Dados ............ Eventos, Atribuição, Qualidade de dados, Dashboards
└── Distribuição ..... SEO, GEO, YouTube, Social, Pinterest, Feeds

AMBIENTES
├── 01 Experiência do consumidor  (MVP)
├── 04 Admin / Operação           (MVP)
├── 02 Portal da marca/loja       (fase 3 — condicionado)
└── 03 Portal do creator          (fase 3 — condicionado)
```

A ordem dos ambientes reflete a recomendação do diagnóstico: o portal de marcas e o de creators só fazem sentido quando houver audiência e contratos que permitam redistribuir comissão.

## 4.2 Entidade central: Produto (modelo) e Variante

```
Produto (modelo)             ← review, notas, conteúdo, SEO, comparação
"Samsung Galaxy S26 Ultra"
│
├── Variantes                ← GTIN, preço, ofertas, histórico
│   ├── 256 GB · Preto
│   ├── 512 GB · Preto
│   └── 1 TB · Titânio
│
├── Especificações (por categoria, com fonte/confiança)
├── Notas por critério + metodologia
├── Mídia (imagens, vídeos)
└── Relações (sucessor, antecessor, concorrentes, acessórios)

Oferta (por variante × loja × vendedor)
├── preço à vista, preço parcelado, preço "de" anunciado
├── disponibilidade, frete, vendedor, condição
├── URL original, URL afiliada (gerada), programa
└── Observações de preço (série temporal)
```

## 4.3 Configuração de vertical (o que torna o engine multivertical)

Cada vertical/categoria é **dados**, não código:

| Configuração | Exemplo (Celulares) | Exemplo (Moda — futuro) |
|---|---|---|
| Grupos de atributos | Tela, Desempenho, Câmera, Bateria, Conectividade | Material, Tamanho, Caimento, Cuidados |
| Atributos (tipo, unidade, filtrável, comparável, "maior é melhor") | `battery_mah` (int, mAh, ↑) | `fabric` (enum) |
| Eixos de variante | armazenamento, cor | tamanho, cor |
| Critérios de nota + pesos padrão | Performance 20%, Câmera 20%, Bateria 15%… | Qualidade 30%, Conforto 25%… |
| Perfis de uso (para o consultor) | Fotografia, Jogos, Trabalho, Básico | Trabalho, Casual, Festa |
| Faixas de preço | até 1.000, 1.500, 2.000, 3.000, 5.000 | até 100, 200, 500 |
| Regras de matching | GTIN, MPN, modelo+armazenamento | SKU da marca + tamanho |
| Templates de conteúdo | Review de smartphone | Review de tênis |
| Perguntas do consultor | Orçamento, SO, tamanho, câmera… | Ocasião, estilo, tamanho |

Só a **lógica de cálculo de notas objetivas** (ex.: normalizar benchmark de CPU) é código, organizada como *plugins por categoria* com interface comum.

## 4.4 Módulos funcionais

| Módulo | Função | Fase |
|---|---|---|
| Catálogo | Cadastro e enriquecimento de produtos/variantes/specs | 1 |
| Ofertas & matching | Ingestão de feeds/APIs, matching com variante, atualização | 1 |
| Coleta de preço | Série temporal por oferta + agregação diária por variante | **1 (coleta)** / 2 (UI completa) |
| Editorial | Reviews, comparativos, guias, workflow | 1 |
| Notas & metodologia | Notas por critério, versão da metodologia | 1 |
| Comparador | 2–4 produtos, diferenças, vencedor por critério, conclusões automáticas | 1 |
| Busca | Texto + filtros + intenção simples (preço, uso, marca) | 1 (básica) / 2 (semântica) |
| Ofertas (página) | Ranking por desconto real, queda recente, oportunidade | 1 (com dados disponíveis) |
| Links & tracking | `/go/`, cliques, sub-IDs, atribuição | 1 |
| Leads & alertas | Cadastro, consentimento, alerta de preço | 1 (simples) / 2 (completo) |
| Consultor IA | Fluxo guiado + conversa, grounded em dados | 2 |
| Social/YouTube | Vídeos nas páginas, derivação de roteiros, tracking por conteúdo | 2 |
| Dashboards | Executivo, afiliados, conteúdo, SEO | 1 (básico) / 2 |
| Page Scores | Diagnóstico SEO/GEO/Perf/Conteúdo/Conversão por página | 2 |
| Personalização | Recomendações por comportamento | 3 |
| Portal marcas / creators | Self-service B2B | 3 (condicionado) |
| Novos verticais | Configuração + conteúdo | 4 |

## 4.5 Fluxo de valor

```
Atrair (SEO/GEO/vídeo/social)
  → Responder (veredito em 5 s)
    → Aprofundar (review, comparação, histórico)
      → Decidir (Fit Score, consultor, vale comprar agora?)
        → Agir (clique na melhor oferta | alerta | salvar)
          → Rastrear (clique, sub-ID, sessão, conteúdo)
            → Converter (varejista) → Comissão
              → Aprender (satisfação, conversão, comportamento)
                → Melhorar recomendação e conteúdo
```

## 4.6 Matriz entidade → tela → ação

| Entidade | Onde aparece | Ações principais |
|---|---|---|
| Produto | Busca, categoria, produto, comparador, guias, consultor | ver, comparar, acompanhar, compartilhar |
| Variante | Produto (seletor), ofertas, histórico | escolher, ver preço |
| Oferta | Produto, ofertas, comparador, alertas | clicar (sair), reportar problema |
| Loja | Ofertas, admin | ver confiabilidade, administrar |
| Conteúdo | Site, admin | ler, publicar, atualizar |
| Nota/Metodologia | Produto, comparador, página de metodologia | entender, contestar (feedback) |
| Alerta | Produto, conta, e-mail | criar, pausar, excluir |
| Clique | Analytics | rastrear, atribuir |
| Conversão/Comissão | Admin financeiro | importar, conciliar, auditar |
| Usuário/Lead | Conta, admin, CRM | gerenciar preferências, exportar/excluir dados |
