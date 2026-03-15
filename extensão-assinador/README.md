# Cripto Signer

Extensão Chrome não-custodial para assinatura de transações EVM.

## Estrutura do Projeto

- `src/`: Código fonte JavaScript
  - `background.js`: Service Worker (gerenciamento de estado, auto-lock)
  - `content.js`: Content Script (comunicação com a página)
  - `popup.js`: Lógica da UI (importação, PIN, assinatura)
  - `crypto.js`: Módulo de criptografia (PBKDF2, AES-GCM)
  - `util.js`: Utilitários e Anti-debugging
- `public/`: Arquivos estáticos
  - `manifest.json`: Manifesto da extensão (V3)
  - `popup.html`: Interface do usuário
- `dist/`: Build de produção (gerado pelo webpack)

## Pré-requisitos

- Node.js e npm instalados.

## Instalação e Build

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Gere o build de produção:
   ```bash
   npm run build
   ```

   Isso criará a pasta `dist/` com todos os arquivos necessários.

## Como Carregar no Chrome

1. Abra o Chrome e vá para `chrome://extensions/`.
2. Ative o "Modo do desenvolvedor" (canto superior direito).
3. Clique em "Carregar sem compactação".
4. Selecione a pasta `dist/` gerada no passo anterior.

## Funcionalidades de Segurança

- **Armazenamento Seguro**: Seed nunca é salva. Chave privada é criptografada com AES-256-GCM usando chave derivada de PIN via PBKDF2 (210k iterações).
- **Auto-Lock**: Bloqueio automático após 5 minutos de inatividade.
- **Anti-Brute Force**: Bloqueio de 15 minutos após 5 tentativas incorretas de PIN.
- **Anti-Debugging**: Proteções contra inspeção e depuração.
- **CSP Rigoroso**: Política de segurança de conteúdo restritiva.

## Uso

1. Clique no ícone da extensão para abrir.
2. Na primeira execução, importe sua Seed Phrase e defina um PIN.
3. Para assinar transações, o site deve enviar uma mensagem `postMessage` com o tipo `CORVAX_SIGN_REQUEST`.
