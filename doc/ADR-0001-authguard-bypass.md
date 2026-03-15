# ADR-0001 — Bypass de Onboarding/KYC no AuthGuard (Dev)

Status: Aceito  
Data: 2026-03-14

## Contexto
Precisamos visualizar o sistema com todas as funcionalidades sem realizar os passos de conexão de carteira, autenticação SIWE, cadastro (Signup) e verificação de identidade (KYC). Em ambiente de desenvolvimento, esses passos atrasam validação de UI/UX e inspeção de recursos.

## Decisão
Introduzir um bypass controlado por variável de ambiente que, ao clicar em “Connect wallet” na Home (`/`), ativa um estado local e faz o `AuthGuard` renderizar o conteúdo diretamente, ignorando as verificações de conexão, autenticação, Signup e KYC.

## Implementação
- Env: `VITE_DEV_SKIP_WALLET_ON_HOME="true"` adicionada em [.env](file:///c:/Users/edima/OneDrive/Área%20de%20Trabalho/Gnosispay/ui/.env#L6).
- Lógica no guard: [AuthGuard.tsx](file:///c:/Users/edima/OneDrive/Área%20de%20Trabalho/Gnosispay/ui/src/components/AuthGuard.tsx#L168-L186).
  - Detecta Home e flag de env; ao clicar no botão, ativa `bypass`.
  - Com `bypass` ativo, o guard retorna `children`, liberando a aplicação.

## Alternativas Consideradas
1. Mockar `useAccount`/`useAuth` para simular estados conectados/autenticados.
   - Prós: comportamento mais próximo do real.
   - Contras: aumenta complexidade, risco de efeitos colaterais e divergência entre dev e prod.
2. Seed de usuário e token de teste persistente.
   - Prós: fluxos realistas para e2e.
   - Contras: exige backend preparado; manutenção de tokens e segurança adicional.

## Consequências
- Positivas: acelera avaliação de telas e menus, permite navegar no app completo rapidamente.
- Negativas: componentes que dependem de estados reais podem se comportar diferente; bypass é temporário por reload.

## Segurança e Compliance
- Apenas para desenvolvimento; não usar em produção.
- Não expõe dados sensíveis, não registra PII em logs.
- Mantém compliance (PCI/LGPD) ao evitar uso em ambientes produtivos.

## Rollback
- Definir `VITE_DEV_SKIP_WALLET_ON_HOME="false"` (ou remover).
- Reiniciar aplicação; fluxo padrão volta imediatamente.

