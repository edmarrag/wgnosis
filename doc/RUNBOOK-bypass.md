## Runbook — Bypass de Onboarding/KYC (Dev)

### Objetivo
Habilitar/desabilitar rapidamente o bypass de etapas (Connect, SIWE, Signup, KYC) para visualizar o app completo em desenvolvimento.

### Habilitar
1. Editar [.env](file:///c:/Users/edima/OneDrive/Área%20de%20Trabalho/Gnosispay/ui/.env#L6) e garantir:  
   `VITE_DEV_SKIP_WALLET_ON_HOME="true"`
2. Iniciar o app em modo desenvolvimento.
3. Acessar `/` (Home) e clicar em “Connect wallet”.
4. O app deve liberar as telas sem exigir Signup/KYC.

### Desabilitar
1. Definir `VITE_DEV_SKIP_WALLET_ON_HOME="false"` (ou remover a variável).
2. Reiniciar a aplicação.
3. O fluxo volta a exigir conexão/autenticação/onboarding.

### Como funciona
- Clique em “Connect wallet” na Home ativa um estado local `bypass` no guard.  
- Com `bypass` ativo, [AuthGuard.tsx](file:///c:/Users/edima/OneDrive/Área%20de%20Trabalho/Gnosispay/ui/src/components/AuthGuard.tsx#L168-L186) retorna `children` e ignora checagens.
- O estado é reiniciado ao recarregar a página.

### Validações
- Segurança: não registrar dados sensíveis, não usar em produção.
- Observabilidade: sem logs adicionais, comportamento restrito ao dev.

### Problemas Comuns
- “Ainda aparece Complete Signup/KYC”: verifique se a env está “true” e se o clique foi feito na Home.
- “Após reload volta a exigir etapas”: é esperado; clique novamente em “Connect wallet”.
- “Componentes dependentes de estados reais parecem inconsistentes”: o bypass não altera `isConnected`/`isAuthenticated`; use fluxo real se necessário.

### Scripts úteis
- `pnpm dev` — iniciar ambiente de desenvolvimento.
- `pnpm preview` — não recomendado para validar bypass (use dev).

