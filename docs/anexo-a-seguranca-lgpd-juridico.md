# Anexo A — Segurança, LGPD, transparência e riscos jurídicos

> Este anexo é um guia de engenharia e produto, não parecer jurídico. Itens marcados ⚖️ exigem validação com advogado.

## A.1 Revisão de segurança (seção 38)

| Tema | Controle |
|---|---|
| Autenticação | Consumidor: link mágico/Google. Admin: senha forte + 2FA/passkey obrigatório, bloqueio progressivo, sessão curta, reautenticação para ações sensíveis (exportar leads, alterar papéis, segredos) |
| Autorização | RBAC por recurso/ação no servidor (nunca só na UI); permissões de banco por schema (firewall comercial); dados de uma marca nunca visíveis para outra (fase 3: `merchant_id` em toda consulta do portal + Row Level Security) |
| Rate limiting | Por IP + `anon_id` em busca, consultor, alertas, leads, `/go/`, `/api/e`; WAF do CDN para picos |
| Scraping abusivo | Bot management do CDN, limites por ASN, conteúdo de API pública só com chave; honeypots de preço para detectar cópia |
| XSS | React escapa por padrão; conteúdo do editor em blocos estruturados (sem HTML livre); sanitização de qualquer HTML importado; **CSP** estrita com nonce; `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| CSRF | Server Actions com verificação de origem; cookies `SameSite=Lax`; tokens em formulários públicos |
| SQL injection | Somente queries parametrizadas (ORM/SQL tagged); proibido concatenar SQL; lint |
| Open redirect | `/go/` e `/s/` só redirecionam para destinos armazenados |
| Exposição de API | Schemas de saída explícitos (sem vazar campos internos como comissão); paginação limitada; erros sem stack trace |
| Webhooks | HMAC + timestamp (anti-replay) + idempotência |
| Segredos | Gerenciador de segredos do provedor, rotação, nunca em logs/repositório; varredura de segredos no CI |
| Logs | Sem PII em texto claro (e-mail/IP com hash); retenção definida; acesso restrito |
| Backups | PITR + dump diário criptografado em outro provedor; teste de restauração mensal |
| Proteção de dados | TLS em tudo; criptografia em repouso do provedor; colunas sensíveis (telefone) criptografadas na aplicação |
| Dependências | Poucas, auditadas (Dependabot/Renovate + `npm audit` no CI) |
| IA | Proteção contra prompt injection (dados como não confiáveis, ferramentas só leitura, sem acesso a segredos), limites de custo |
| Admin | `noindex`, opcionalmente atrás de Cloudflare Access/allowlist; trilha de auditoria append-only |
| Incidentes | Plano de resposta, contato do encarregado, registro de incidentes (comunicação à ANPD quando aplicável ⚖️) |

## A.2 LGPD (seção 37)

| Requisito | Implementação |
|---|---|
| Base legal por finalidade ⚖️ | Analytics de terceiros, anúncios e personalização: **consentimento**. Alertas de preço: execução de serviço solicitado. Analytics próprio agregado e segurança/antifraude: legítimo interesse com minimização (avaliar com jurídico) |
| Banner de cookies | Leve (< 5 KB), opções "Aceitar", "Rejeitar" e "Personalizar" com mesmo destaque; nada não essencial carrega antes da escolha |
| Registro de consentimento | `people.consent` append-only com finalidade, versão da política, método, data |
| Gestão de preferências | `/conta/privacidade` e link no rodapé "Preferências de cookies" |
| Opt-in / opt-out | Double opt-in em e-mail; descadastro em 1 clique em todo envio; WhatsApp só com opt-in explícito |
| Direitos do titular | Acesso/exportação (JSON), correção, exclusão (anonimização de eventos), revogação — em autoatendimento + canal do encarregado |
| Minimização | Telefone opcional; sem CPF; IP truncado/hasheado; sem dados sensíveis |
| Retenção | Eventos detalhados 13 meses; leads inativos revisados após 24 meses; logs 6 meses |
| Perfilamento | Consultor e personalização explicados ("por que estou vendo isto"); RIPD (relatório de impacto) recomendado ⚖️ |
| Encarregado (DPO) | Nomeado e publicado na política de privacidade |
| Operadores | Contratos/DPAs com provedores (hospedagem, e-mail, LLM, analytics); preferir provedores que não treinam com dados enviados |
| Transferência internacional ⚖️ | Mapear provedores fora do Brasil e mecanismo de transferência |

## A.3 Transparência editorial (seção 36)
- Página **"Como ganhamos dinheiro"**: links de afiliado, que comissão não define nota/ranking, como funciona o firewall, política de patrocínio e de amostras recebidas.
- Aviso curto perto dos CTAs: "Podemos receber comissão se você comprar pelos links. Isso não muda nossa avaliação."
- Patrocínios futuros: rótulo "Patrocinado" visível, área separada da recomendação, nunca na posição de "nossa escolha".
- Produtos recebidos de marcas para teste: divulgados na review.
- Política de correções pública.

## A.4 Outros riscos jurídicos ⚖️
| Tema | Cuidado |
|---|---|
| CDC | Preço e disponibilidade são da loja: exibir horário da coleta e "sujeito a alteração"; não fazer promessa de preço |
| CONAR | Publicidade identificada (especialmente em vídeos/creators: #publi quando houver patrocínio) |
| Termos dos programas | Atualização de preço, uso de dados/imagens, links em e-mail, uso de marcas em anúncios pagos (muitos programas proíbem *brand bidding*) |
| Scraping | Somente onde termos permitem; preferir feeds/APIs oficiais |
| Imagens e marcas | Imagens de kits de imprensa/APIs com licença ou fotos próprias; uso nominativo de marcas; evitar logos de lojas sem autorização |
| Marco Civil | Guarda de registros de acesso a aplicações pelo prazo legal |
| Creators / split de comissão (fase 3) | Questões fiscais (emissão de nota, retenções), contratos, sub-afiliação permitida pelos programas |
| Comparação publicitária | Comparações objetivas e verificáveis, com fonte |
