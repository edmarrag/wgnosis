// src/popup.js
import { encryptPrivateKey } from './crypto.js';
import { validatePin, antiDebugging, getErrorMessage } from './util.js';
import { ethers } from 'ethers';

// Enable anti-debugging
antiDebugging();

// DOM Elements
const views = {
  loading: document.getElementById('view-loading'),
  setup: document.getElementById('view-setup'),
  unlock: document.getElementById('view-unlock'),
  sign: document.getElementById('view-sign'),
  idle: document.getElementById('view-idle')
};

const statusBadge = document.getElementById('statusBadge');

const settingsBtn = document.getElementById('settingsBtn');
let settingsOpen = false;
let hasEnabledSite = false;

const siteAccessEls = {
  pill: document.getElementById('siteAccessPill'),
  card: document.getElementById('siteAccessCard'),
  form: document.getElementById('siteForm'),
  enabledInfo: document.getElementById('siteEnabledInfo'),
  enabledHost: document.getElementById('enabledSiteHost'),
  manualInput: document.getElementById('manualSiteInput'),
  manualEnableBtn: document.getElementById('btnManualEnable'),
  manualError: document.getElementById('manualSiteError')
};

// State
let currentState = {
  isInitialized: false,
  isLocked: true,
  pendingRequest: null
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('Popup initialized');
    await loadState();
    await initSiteUi();
    render();
  } catch (e) {
    console.error('Initialization error:', e);
    // Fallback to setup if state cannot be loaded (or show error)
    document.body.innerHTML = `<div style="padding: 20px; color: red;">Error: ${e.message}</div>`;
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'NEW_SIGN_REQUEST') {
    loadState().then(render).catch(()=>{});
  }
});

async function loadState() {
  try {
    // Timeout race to prevent hanging
    const response = await Promise.race([
      chrome.runtime.sendMessage({ type: 'GET_STATE' }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for background')), 2000))
    ]);

    if (response) {
        currentState = response;
    } else {
        console.warn('Empty response from background');
        // If empty response, assumes uninitialized
        currentState.isInitialized = false;
    }
  } catch (e) {
    console.error('Failed to load state:', e);
    // If background is sleeping or error, assume uninitialized to allow setup
    currentState.isInitialized = false;
    
    // Optional: Show error in UI if it's not a timeout (or even if it is)
    // document.getElementById('statusBadge').textContent = 'Offline';
  }
  updateStatus();
}

async function getActiveTabUrl() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs && tabs[0];
  const tabId = tab && tab.id;
  if (tab && typeof tab.url === 'string' && tab.url) {
    return tab.url;
  }
  if (!tabId) return null;
  return null;
}

function setManualSiteError(message) {
  if (!siteAccessEls.manualError) return;
  siteAccessEls.manualError.textContent = message || '';
}

function toOriginPattern(input) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Informe um domínio ou URL.');

  const withScheme = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  let u;
  try {
    u = new URL(withScheme);
  } catch (_) {
    throw new Error('URL inválida.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('Use apenas http/https.');
  }
  return `${u.origin}/*`;
}

function setSiteEnabledUi(originPattern) {
  if (!siteAccessEls.pill || !siteAccessEls.form || !siteAccessEls.enabledInfo || !siteAccessEls.enabledHost) return;
  siteAccessEls.pill.textContent = 'ATIVO';
  siteAccessEls.pill.className = 'pill enabled';
  siteAccessEls.form.style.display = 'none';
  siteAccessEls.enabledInfo.style.display = 'block';
  const host = (() => {
    try {
      return new URL(originPattern.replace('/*', '/')).hostname;
    } catch (_) {
      return originPattern;
    }
  })();
  siteAccessEls.enabledHost.textContent = `Ativo para: ${host}`;
}

function setSiteDisabledUi() {
  if (!siteAccessEls.pill || !siteAccessEls.form || !siteAccessEls.enabledInfo) return;
  siteAccessEls.pill.textContent = 'INATIVO';
  siteAccessEls.pill.className = 'pill';
  siteAccessEls.form.style.display = 'block';
  siteAccessEls.enabledInfo.style.display = 'none';
}

async function initSiteUi() {
  setManualSiteError('');
  setSiteDisabledUi();
  try {
    const { lastEnabledOriginPattern } = await chrome.storage.local.get(['lastEnabledOriginPattern']);
    if (typeof lastEnabledOriginPattern === 'string' && lastEnabledOriginPattern) {
      hasEnabledSite = true;
      setSiteEnabledUi(lastEnabledOriginPattern);
      return;
    }
  } catch (_) {
  }

  hasEnabledSite = false;

  try {
    const url = await getActiveTabUrl();
    if (!url || !siteAccessEls.manualInput) return;
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
    siteAccessEls.manualInput.value = u.origin;
  } catch (_) {
  }
}

function updateSettingsVisibility() {
  const isIdle = currentState.isInitialized && !currentState.isLocked && !currentState.pendingRequest;
  if (settingsBtn) {
    settingsBtn.style.display = isIdle ? 'inline-flex' : 'none';
  }

  if (!siteAccessEls.card) return;

  if (hasEnabledSite) {
    siteAccessEls.card.style.display = (isIdle && settingsOpen) ? 'block' : 'none';
    if (!isIdle) settingsOpen = false;
    return;
  }

  siteAccessEls.card.style.display = 'block';
  settingsOpen = false;
}

function updateStatus() {
  if (currentState.lockedUntil && currentState.lockedUntil > Date.now()) {
    statusBadge.textContent = 'LOCKED (Time)';
    statusBadge.className = 'status-badge locked';
  } else if (currentState.isLocked) {
    statusBadge.textContent = 'LOCKED';
    statusBadge.className = 'status-badge locked';
  } else {
    statusBadge.textContent = 'READY';
    statusBadge.className = 'status-badge ready';
  }
}

function showView(viewName) {
  Object.values(views).forEach(el => el.classList.remove('active'));
  views[viewName].classList.add('active');
}

function render() {
  if (!currentState.isInitialized) {
    showView('setup');
    updateSettingsVisibility();
    return;
  }

  if (currentState.pendingRequest) {
    // If we have a pending request, we need to handle it.
    // If locked, we MUST unlock first.
    if (currentState.isLocked) {
      showView('unlock');
    } else {
      renderSignRequest();
      showView('sign');
    }
    updateSettingsVisibility();
  } else {
    // No request
    if (currentState.isLocked) {
      showView('unlock');
    } else {
      showView('idle');
    }
    updateSettingsVisibility();
  }
}

settingsBtn?.addEventListener('click', async () => {
  settingsOpen = !settingsOpen;
  updateSettingsVisibility();
});

siteAccessEls.manualEnableBtn?.addEventListener('click', async () => {
  setManualSiteError('');
  const btn = siteAccessEls.manualEnableBtn;
  const inputEl = siteAccessEls.manualInput;
  if (!btn || !inputEl) return;

  btn.disabled = true;
  btn.textContent = 'Processando...';
  try {
    const originPattern = toOriginPattern(inputEl.value);
    const granted = await chrome.permissions.request({ origins: [originPattern] });
    if (!granted) {
      setManualSiteError('Permissão negada pelo usuário.');
      return;
    }
    const res = await chrome.runtime.sendMessage({
      type: 'ENABLE_SITE',
      payload: { originPattern }
    });
    if (res && res.error) throw new Error(res.error);
    await chrome.storage.local.set({ lastEnabledOriginPattern: originPattern });
    hasEnabledSite = true;
    setSiteEnabledUi(originPattern);
    updateSettingsVisibility();
  } catch (e) {
    setManualSiteError(getErrorMessage(e));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Ativar';
  }
});

function renderSignRequest() {
  const req = currentState.pendingRequest || {};
  const pr = req.transaction || req;
  const toAddr = pr.to || '';
  document.getElementById('txTo').textContent = toAddr ? `${toAddr.substring(0, 10)}...${toAddr.substring(toAddr.length - 4)}` : 'Contract Call';
  document.getElementById('txOrigin').textContent = req.origin ? new URL(req.origin).hostname : 'Unknown';
  const chainIdNum = typeof req.chainId === 'string' ? parseInt(req.chainId) : (req.chainId || null);
  document.getElementById('txChainId').textContent = chainIdNum || '—';
  const chainName = (() => {
    const c = (req.chain || '').toString().toUpperCase().trim();
    if (!c && chainIdNum != null) {
      const map = {1:'ETHEREUM',56:'BSC',137:'POLYGON',42161:'ARBITRUM',10:'OPTIMISM',8453:'BASE',100:'GNOSIS',59144:'LINEA'};
      return map[chainIdNum] || 'ETHEREUM';
    }
    if (c === 'POLYGON POS' || c === 'MATIC') return 'POLYGON';
    if (c === 'BSC' || c === 'BNB CHAIN' || c === 'BINANCE SMART CHAIN') return 'BSC';
    if (c === 'ETH') return 'ETHEREUM';
    return c || 'ETHEREUM';
  })();
  const feeCurrency = (() => {
    switch (chainName) {
      case 'POLYGON': return 'MATIC';
      case 'BSC': return 'BNB';
      case 'GNOSIS': return 'xDAI';
      default: return 'ETH';
    }
  })();
  document.getElementById('txChainName').textContent = chainName;
  document.getElementById('txFeeCurrency').textContent = feeCurrency;
  const toBig = (v) => {
    if (v == null) return null;
    try {
      if (typeof v === 'string') return v.startsWith('0x') ? ethers.toBigInt(v) : ethers.toBigInt(v);
      return ethers.toBigInt(v);
    } catch (_) { return null; }
  };
  const gasLimit = toBig(pr.gasLimit);
  const gasPrice = toBig(pr.gasPrice);
  const maxFeePerGas = toBig(pr.maxFeePerGas);
  const maxPriorityFeePerGas = toBig(pr.maxPriorityFeePerGas);
  document.getElementById('txGasLimit').textContent = gasLimit ? gasLimit.toString() : '—';
  let priceLabel = '—';
  if (maxFeePerGas && maxPriorityFeePerGas) {
    priceLabel = `${ethers.formatUnits(maxFeePerGas, 'gwei')} Gwei (max), prioridade ${ethers.formatUnits(maxPriorityFeePerGas, 'gwei')} Gwei`;
  } else if (gasPrice) {
    priceLabel = `${ethers.formatUnits(gasPrice, 'gwei')} Gwei`;
  }
  document.getElementById('txGasPrice').textContent = priceLabel;
  let estimated = '—';
  const effective = maxFeePerGas || gasPrice;
  if (gasLimit && effective) {
    const feeWei = gasLimit * effective;
    estimated = `${ethers.formatEther(feeWei)} ${feeCurrency}`;
  }
  document.getElementById('txEstimatedFee').textContent = estimated;
  const valBig = toBig(pr.value);
  if (valBig && valBig > 0n) {
    document.getElementById('txValue').textContent = `${ethers.formatEther(valBig)} ${feeCurrency}`;
  } else {
    document.getElementById('txValue').textContent = 'Transferência de Token';
  }
}

// Event Listeners

// SETUP
document.getElementById('btnImport').addEventListener('click', async () => {
  console.log('Botão Importar clicado');
  const btn = document.getElementById('btnImport');
  const originalText = btn.textContent;
  btn.textContent = 'Processando...';
  btn.disabled = true;

  const seed = document.getElementById('setupSeed').value.trim();
  const pin = document.getElementById('setupPin').value.trim();
  const errorEl = document.getElementById('setupError');

  errorEl.textContent = '';

  try {
      if (!seed) throw new Error('A Seed Phrase é obrigatória.');
      if (!pin) throw new Error('O PIN é obrigatório.');

      console.log('Validando Mnemonic...');
      // Ethers v6 check
      if (!ethers.Mnemonic.isValidMnemonic(seed)) {
        throw new Error('Seed Phrase inválida. Verifique se são 12 palavras em inglês.');
      }

      console.log('Validando PIN...');
      if (!validatePin(pin)) {
        throw new Error('PIN deve ter exatamente 6 números.');
      }

    console.log('Derivando carteira...');
    // 1. Derive Private Key
    const wallet = ethers.Wallet.fromPhrase(seed);
    const privateKey = wallet.privateKey;

    console.log('Criptografando...');
    // 2. Encrypt
    const encryptedData = await encryptPrivateKey(privateKey, pin);

    console.log('Enviando para background...');
    // 3. Send to Background
    const res = await chrome.runtime.sendMessage({
      type: 'IMPORT_SEED',
      payload: {
        seed: encryptedData,
        pin
      }
    });
    
    if (res && res.error) {
        throw new Error(res.error);
    }

    console.log('Sucesso. Recarregando estado...');
    // Reload state
    await loadState();
    render();

  } catch (e) {
    console.error('Erro na importação:', e);
    errorEl.textContent = getErrorMessage(e);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// UNLOCK
document.getElementById('btnUnlock').addEventListener('click', async () => {
  const pin = document.getElementById('unlockPin').value.trim();
  const errorEl = document.getElementById('unlockError');

  errorEl.textContent = '';

  if (!validatePin(pin)) {
    errorEl.textContent = 'PIN deve ter 6 dígitos.';
    return;
  }

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'UNLOCK',
      payload: { pin }
    });

    if (res.error) throw new Error(res.error);

    await loadState();
    render();

  } catch (e) {
    errorEl.textContent = getErrorMessage(e);
  }
});

// SIGN
document.getElementById('btnApprove').addEventListener('click', async () => {
  const errorEl = document.getElementById('signError');
  errorEl.textContent = 'Assinando...';

  try {
    const res = await chrome.runtime.sendMessage({
      type: 'APPROVE_SIGNATURE'
    });

    if (res.error) throw new Error(res.error);

    // Close window on success
    window.close();

  } catch (e) {
    errorEl.textContent = getErrorMessage(e);
  }
});

document.getElementById('btnReject').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'REJECT_SIGNATURE' });
  window.close();
});
