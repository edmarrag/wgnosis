# PRD — Tradução PT-BR em todos os componentes (`src/components`)

## Objetivo
- Aplicar tradução para português brasileiro (PT-BR) em todos os textos visíveis aos usuários dos componentes em `src/components`, mantendo consistência, segurança e qualidade, sem introduzir novas bibliotecas neste ciclo.

## Escopo
- Incluso: componentes e subcomponentes em `src/components/**` (UI, modais, banners, navegação, transações, carteiras, alerts).
- Páginas: tratadas separadamente; este PRD foca nos componentes reutilizáveis.
- Excluso: logs internos, nomes de variáveis, mensagens técnicas não-visíveis ao usuário final; internacionalização completa com chaves/arquitetura multilíngue (planejada como fase posterior).

## Princípios e Regras
- Consistência: usar termos padronizados em todo o app (glossário abaixo).
- Reutilização: evitar duplicação; manter padrões já usados nos arquivos traduzidos recentemente.
- Segurança: não expor dados sensíveis em textos; evitar mensagens que induzam ações inseguras.
- Conformidade: respeitar PCI-DSS/LGPD; textos de erro não devem divulgar PII, tokens ou detalhes internos.
- Acessibilidade: textos claros, objetivos; evitar jargões desnecessários; títulos e botões descritivos.

## Glossário de Termos (PT-BR)
- Wallet → Carteira
- Safe → Safe (marca, manter original)
- Gas → Gás
- Address → Endereço
- Token → Token
- Transaction → Transação
- Queue → Fila
- Copy to clipboard → Copiar para a área de transferência
- Help Center → Central de Ajuda
- Legal, Terms and Policies → Jurídico, Termos e Políticas
- Withdraw → Retirar
- Add funds → Adicionar fundos
- Send funds → Enviar fundos
- Rewards → Recompensas
- Cards → Cartões
- Execute → Executar
- Custom token → Token personalizado
- Cooling down → Em resfriamento

## Requisitos Funcionais
- RF-01: Todos os textos visíveis (rótulos, títulos, botões, placeholders, mensagens de erro/aviso/sucesso) devem estar em PT-BR.
- RF-02: Mensagens condicionais (sucesso/erro) devem manter o contexto, sem revelar dados sensíveis.
- RF-03: Textos alt/aria-label devem ser traduzidos quando exibidos ao usuário.
- RF-04: Manter mensagens técnicas apenas se forem úteis ao usuário; caso contrário, simplificar.
- RF-05: Banners/alerts devem seguir a terminologia do glossário e tom consistente.

## Requisitos Não-Funcionais
- RNF-01: Segurança — textos não podem incluir PII, tokens, chaves ou detalhes de stack trace.
- RNF-02: Performance — alterações de texto não devem impactar renderização; evitar adicionar libs nesta fase.
- RNF-03: Manutenibilidade — padronizar terminologia; anotar termos recorrentes para futura i18n.
- RNF-04: Testabilidade — assegurar que testes de UI passem com novos textos (data-testid permanece).

## Componentes Prioritários (mapeamento)
- UI base: `ui/*` (alert, button, input, label, select, status-help-icon, partner-banner, iban-banner, phone-input, standard-alert, etc.).
- Navegação: `nav/header.tsx`, `nav/footer.tsx`.
- Transações: `transactions/*` (rows, modais, listas, tabs).
- Carteiras/Contas: `account/*`, `sign-in-wallets/*`, `safe-owners/*`.
- Modais críticos: `modals/*` (add-funds, send-funds, daily-limit, transaction-details, iban-integration, etc.).
- Fila de delay: `DelayModuleQueue/*`.
- Outros: `OnchainBalance`, `WithdrawFundsForm`, `pending-card-order`, `rewards`, `cards*`.

## Critérios de Aceite
- CA-01: Nenhum texto visível em inglês nos componentes após a revisão.
- CA-02: Mensagens mantêm clareza, não expõem dados sensíveis e seguem glossário.
- CA-03: Fluxos críticos (retirada, envio, fila, owners) com textos coerentes em todos estados (loading, erro, sucesso).
- CA-04: Testes automatizados e2e/Playwright continuam passando (ajustar asserts por texto quando necessário).

## Riscos e Mitigações
- Mudança de texto quebrar testes por string exata: usar `data-testid` e revisar asserts.
- Termos inconsistentes: adotar glossário e revisão cruzada.
- Ausência de i18n formal: documentar termos para futura migração; evitar “string espalhada” sem padrão.

## Dependências
- Nenhuma nova biblioteca nesta fase.
- Revisão de componentes com múltiplos estados (ex.: modais) exige percorrer todos paths condicionalmente.

## Plano de Implementação (Fase 1 — Tradução direta)
1. Levantamento de textos por grupo de componentes (UI, transações, conta, modais).
2. Aplicar tradução PT-BR mantendo `data-testid` e sem alterar lógica.
3. Ajustar alt/aria-label quando visíveis/úteis ao usuário.
4. Rodar testes e corrigir asserts sensíveis a texto.
5. Revisão final de consistência com glossário.

## Plano de Evolução (Fase 2 — i18n leve, opcional)
- Introduzir um pequeno dicionário central `src/i18n/pt-BR.ts` para termos recorrentes sem adicionar libs.
- Encaminhar futura migração para lib i18n (i18next/react-intl) se necessário, mantendo compatibilidade.

## Testes e Validação
- Smoke tests nas rotas que usam componentes traduzidos.
- Verificação manual de estados: vazio, loading, erro, sucesso.
- Garantir que mensagens de erro de rede/métodos usem “Erro”/“Falha...” conforme padrão.

## Métricas de Sucesso
- % de componentes sem textos em inglês (meta: 100%).
- Passagem de testes de UI sem regressões.
- Feedback interno: clareza e consistência dos termos.

## Rollout
- PR único por grupo (ex.: transações, modais, conta) ou PRs incrementais pequenos.
- Revisão de QA antes de merge.

## Referências
- Componentes já traduzidos: `WithdrawFundsForm`, `OnchainBalance`, `DelayModuleQueue`, `PendingTransactionItem`.
- Páginas já traduzidas (base para padrões): Home, Account, Cards, KYC, Reset, NotFound.

