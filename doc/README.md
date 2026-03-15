# Bypass de Onboarding e KYC (Ambiente de Desenvolvimento)

Este documento descreve a funcionalidade de bypass adicionada para permitir a visualização do sistema com todas as funcionalidades sem precisar conectar carteira (Connect), autenticar via SIWE, completar Signup ou KYC.

## Visão Geral
- Objetivo: acelerar a avaliação do app em desenvolvimento, pulando etapas de conexão e verificação.
- Escopo: somente ambiente de desenvolvimento; não deve ser usado em produção.
- Ativação: variável de ambiente `VITE_DEV_SKIP_WALLET_ON_HOME="true"`.
- Comportamento: ao clicar em “Connect wallet” na Home (`/`), o guard ativa um estado local e passa a renderizar o conteúdo da aplicação diretamente, ignorando as checagens de conexão, autenticação, Signup e KYC.

## Implementação
- Variável de ambiente adicionada: [env](file:///c:/Users/edima/OneDrive/Área%20de%20Trabalho/Gnosispay/ui/.env#L6).
- Ajustes de lógica: [AuthGuard.tsx](file:///c:/Users/edima/OneDrive/Área%20de%20Trabalho/Gnosispay/ui/src/components/AuthGuard.tsx#L168-L186).
  - Determina se está na Home (`/`), verifica `VITE_DEV_SKIP_WALLET_ON_HOME` e, ao clicar em “Connect wallet”, ativa um estado local `bypass`.
  - Com `bypass` ativo, o guard retorna o conteúdo dos filhos imediatamente, liberando o app.

## Detalhes de Comportamento
- Disparo: apenas ao clicar em “Connect wallet” na Home quando a env estiver habilitada.
- Persistência: o estado é local ao componente; um reload de página desativa o bypass até novo clique.
- Não altera `isConnected` nem `isAuthenticated`; apenas ignora as verificações do guard.

## Segurança
- Uso exclusivo em desenvolvimento. Não comitar builds com essa flag ativa para produção.
- Não expõe dados sensíveis, não grava logs de informações privadas.
- Mantém o princípio de menor privilégio em produção (desativado por padrão).

## Como habilitar
1. Verifique a env: [env](file:///c:/Users/edima/OneDrive/Área%20de%20Trabalho/Gnosispay/ui/.env#L6) com `VITE_DEV_SKIP_WALLET_ON_HOME="true"`.
2. Inicie o app em modo desenvolvimento.
3. Acesse `/` e clique em “Connect wallet”.

## Como desabilitar
1. Remova ou defina `VITE_DEV_SKIP_WALLET_ON_HOME="false"` na env.
2. Reinicie o app.
3. O fluxo padrão volta a exigir conexão, SIWE, Signup e KYC conforme o guard.

## Limitações e Trade-offs
- Não simula estados internos de `AuthContext`/`UserContext`; componentes que dependem explicitamente desses estados podem exibir pequenos desalinhamentos.
- Focado em navegação e UI geral; para testes e2e de autenticação real, utilize o fluxo normal.

## Referências
- Guard de autenticação: [AuthGuard.tsx](file:///c:/Users/edima/OneDrive/Área%20de%20Trabalho/Gnosispay/ui/src/components/AuthGuard.tsx).
- Variáveis de ambiente: [.env](file:///c:/Users/edima/OneDrive/Área%20de%20Trabalho/Gnosispay/ui/.env).

