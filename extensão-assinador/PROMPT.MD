Crie uma extensão Chrome (Manifest V3) chamada "Cripto Signer".

OBJETIVO:
A extensão deve funcionar exclusivamente como um módulo de assinatura de transações EVM.
Ela NÃO deve:
- Exibir saldo
- Fazer swap
- Criar rede
- Gerenciar tokens
- Ser custodial

Ela deve apenas:
- Importar seed phrase (12 palavras BIP39)
- Derivar private key EVM padrão
- Criptografar localmente com PIN 6 dígitos
- Assinar transações sob solicitação
- Retornar assinatura ao gateway

ARQUITETURA:

STACK:
- Manifest v3
- Ethers v6
- Web Crypto API
- Chrome storage.local
- Comunicação via window.postMessage
- Service Worker background

REGRAS CRÍTICAS DE SEGURANÇA:

1) Seed nunca pode ser armazenada.
2) Private key nunca pode ser armazenada em texto puro.
3) Deve ser criptografada com AES-256-GCM.
4) Derivação de chave usando PBKDF2:
   - 210000 iterations
   - SHA-256
5) Auto-lock após 5 minutos.
6) Limite de 5 tentativas de PIN.
7) Limpar chave descriptografada da memória após assinatura.

DERIVAÇÃO HD WALLET:

Caminho fixo:
m/44'/60'/0'/0/0

Suportar todas redes EVM:
Ethereum
Polygon
Arbitrum
Base
BNB Chain
Optimism
Linea
Gnosis

MANIFEST.JSON:

- manifest_version: 3
- permissions: storage
- background: service_worker
- popup
- content script

FLUXO 1 - PRIMEIRA ABERTURA:

Tela:
- Campo textarea seed
- Campo input PIN 6 dígitos
- Botão "Importar"

Validações:
- Validar BIP39
- PIN exatamente 6 números
- Confirmar seed válida antes de continuar

Processo:
1) Derivar private key via ethers:
   HDNodeWallet.fromPhrase(seed)
   derivePath("m/44'/60'/0'/0/0")

2) Criptografar private key usando:
   - PBKDF2
   - Salt aleatório 16 bytes
   - IV aleatório 12 bytes
   - AES-256-GCM

3) Salvar no storage.local:
{
 encryptedPrivateKey,
 salt,
 iv,
 attempts: 0,
 lockedUntil: null
}

4) Apagar seed da memória.

FLUXO 2 - ASSINATURA:

O gateway enviará:

window.postMessage({
  type: "CORVAX_SIGN_REQUEST",
  payload: {
    to,
    value,
    data,
    chainId,
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce
  }
});

A extensão deve:

1) Abrir popup pedindo PIN
2) Verificar tentativas
3) Se >=5 bloquear por 15 minutos
4) Derivar chave via PIN
5) Descriptografar private key
6) Criar wallet ethers
7) Assinar transação:
   wallet.signTransaction(tx)
8) Retornar:

window.postMessage({
  type: "CORVAX_SIGN_RESPONSE",
  signature
});

9) Limpar private key da memória.

AUTO LOCK:

- Implementar timer 5 minutos após unlock.
- Após 5 min destruir chave da memória.
- Exigir PIN novamente.

CONTENT SCRIPT:

- Escutar mensagens do site
- Repassar para background
- Retornar resposta

BACKGROUND:

- Gerenciar estado de lock
- Controlar tentativas
- Gerar assinatura
- Limpar memória

SEGURANÇA EXTRA:

- Não permitir execução inline.
- CSP rigoroso.
- Não expor nada no window global.
- Não usar eval.
- Não logar private key.

INTERFACE:

UI minimalista estilo fintech:
- Fundo escuro
- Botão principal azul
- Indicador de status: Locked / Ready

ENTREGAR:

- Estrutura completa de arquivos
- manifest.json
- background.js
- content.js
- popup.html
- popup.js
- crypto.js
- util.js
- Instruções para build
- Código pronto para rodar em produção

Sem pseudo código.
Sem explicações.
Somente código completo.

GARANTA QUE O SISTEMA DA EXTENSÃO, SEJA ANTI-DEBUGGING