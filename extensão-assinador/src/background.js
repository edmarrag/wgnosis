// src/background.js
import { ethers } from 'ethers';
import { encryptPrivateKey, decryptPrivateKey } from './crypto.js';

// State (In-memory, ephemeral)
let session = {
  decryptedKey: null,
  expiry: null
};

let pendingRequest = null;

function hashStringDjb2(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function makeContentScriptId(originPattern) {
  const h = hashStringDjb2(originPattern).toString(16);
  return `corvax_bridge_${h}`;
}

async function getEnabledOrigins() {
  const { enabledOrigins } = await chrome.storage.local.get(['enabledOrigins']);
  if (!Array.isArray(enabledOrigins)) return [];
  return enabledOrigins.filter((v) => typeof v === 'string');
}

async function setEnabledOrigins(origins) {
  await chrome.storage.local.set({ enabledOrigins: origins });
}

async function ensureRegisteredContentScripts() {
  const enabledOrigins = await getEnabledOrigins();
  const expected = new Map();
  for (const originPattern of enabledOrigins) {
    expected.set(makeContentScriptId(originPattern), originPattern);
  }

  let registered = [];
  try {
    registered = await chrome.scripting.getRegisteredContentScripts();
  } catch (_) {
    return;
  }

  const registeredById = new Map();
  for (const cs of registered) {
    if (cs && typeof cs.id === 'string') registeredById.set(cs.id, cs);
  }

  for (const [id, originPattern] of expected.entries()) {
    if (registeredById.has(id)) continue;
    try {
      await chrome.scripting.registerContentScripts([
        {
          id,
          js: ['content.js'],
          matches: [originPattern],
          runAt: 'document_start'
        }
      ]);
    } catch (_) {
    }
  }

  const toRemove = [];
  for (const cs of registered) {
    if (!cs || typeof cs.id !== 'string') continue;
    if (!cs.id.startsWith('corvax_bridge_')) continue;
    if (expected.has(cs.id)) continue;
    toRemove.push(cs.id);
  }
  if (toRemove.length) {
    try {
      await chrome.scripting.unregisterContentScripts({ ids: toRemove });
    } catch (_) {
    }
  }
}

async function enableSite(originPattern) {
  if (typeof originPattern !== 'string' || !originPattern.startsWith('http')) {
    throw new Error('Origin inválida');
  }

  const id = makeContentScriptId(originPattern);
  const enabledOrigins = await getEnabledOrigins();
  if (!enabledOrigins.includes(originPattern)) {
    enabledOrigins.push(originPattern);
    await setEnabledOrigins(enabledOrigins);
  }

  try {
    const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
    if (Array.isArray(registered) && registered.length) return;
  } catch (_) {
  }

  await chrome.scripting.registerContentScripts([
    {
      id,
      js: ['content.js'],
      matches: [originPattern],
      runAt: 'document_start'
    }
  ]);
}

async function disableSite(originPattern) {
  if (typeof originPattern !== 'string') {
    throw new Error('Origin inválida');
  }
  const id = makeContentScriptId(originPattern);

  const enabledOrigins = await getEnabledOrigins();
  const next = enabledOrigins.filter((o) => o !== originPattern);
  await setEnabledOrigins(next);

  try {
    await chrome.scripting.unregisterContentScripts({ ids: [id] });
  } catch (_) {
  }
}

// Constants
const AUTO_LOCK_DELAY_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Setup Alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoLock') {
    lockSession();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  ensureRegisteredContentScripts().catch(() => {});
});

// Open Side Panel on Action Click
try {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error(error));
  }
} catch (e) {
  // SidePanel may not be available in some Chrome versions
  console.error('sidePanel API unavailable', e);
}

function lockSession() {
  session.decryptedKey = null;
  session.expiry = null;
  chrome.runtime.sendMessage({ type: 'SESSION_LOCKED' }).catch(() => {});
  console.log('Session auto-locked');
}

function updateSessionActivity() {
  if (session.decryptedKey) {
    session.expiry = Date.now() + AUTO_LOCK_DELAY_MS;
    chrome.alarms.create('autoLock', { delayInMinutes: 5 });
  }
}

// Message Handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  if (type === 'SIGN_REQUEST_FROM_CONTENT') {
    try {
      handleSignRequest(payload, sender);
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ error: err.message });
    }
    return false;
  } else if (type === 'GET_ADDRESS_FROM_CONTENT') {
    try {
      handleGetAddress(sender);
      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ error: err.message });
    }
    return false;
  } else if (type === 'GET_STATE') {
    getStorageState().then(state => sendResponse({ 
      isInitialized: !!state.encryptedPrivateKey,
      isLocked: !session.decryptedKey,
      pendingRequest,
      lockedUntil: state.lockedUntil
    }));
    return true;
  } else if (type === 'IMPORT_SEED') {
    handleImportSeed(payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  } else if (type === 'UNLOCK') {
    handleUnlock(payload).then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  } else if (type === 'APPROVE_SIGNATURE') {
    handleApproveSignature().then(sendResponse).catch(err => sendResponse({ error: err.message }));
    return true;
  } else if (type === 'ENABLE_SITE') {
    enableSite(payload?.originPattern)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ error: err?.message || 'Falha ao ativar site' }));
    return true;
  } else if (type === 'DISABLE_SITE') {
    disableSite(payload?.originPattern)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ error: err?.message || 'Falha ao desativar site' }));
    return true;
  } else if (type === 'REJECT_SIGNATURE') {
    handleRejectSignature();
    sendResponse({ success: true });
    return true;
  }
});

async function getStorageState() {
  const data = await chrome.storage.local.get(['encryptedPrivateKey', 'salt', 'iv', 'attempts', 'lockedUntil']);
  return data;
}

async function handleSignRequest(payload, sender) {
  pendingRequest = {
    ...payload,
    origin: sender.url,
    tabId: sender.tab?.id
  };
  try {
    chrome.runtime.sendMessage({ type: 'NEW_SIGN_REQUEST' }).catch(()=>{});
  } catch(_) {}
  
  // Open Side Panel
  // Note: chrome.sidePanel.open requires a windowId or tabId and user gesture.
  // We can't easily force open side panel from background without user interaction on some browsers versions,
  // but if we are handling a message, we might. However, Side Panel API is restrictive.
  // Best practice: Notify user to open panel or use the bubble notification if available.
  // For now, let's try to open it if we have a windowId.
  if (sender.tab && sender.tab.windowId) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId })
        .catch(err => console.error('Failed to open side panel:', err));
  }
}

async function handleImportSeed({ seed, pin }) {
  // Validate is done in UI, but we double check or assume UI did it.
  // Actually, deriving key and encrypting should happen here or in UI?
  // Requirement says "Importar seed ... Derivar ... Criptografar ... Salvar".
  // To avoid sending Seed to background if possible, we can do it in UI.
  // But if we do it in UI, we just send the encrypted blob to Background to save.
  // Let's assume the UI does the heavy lifting of encryption to keep the Seed in the UI context only (and clear it there).
  // Wait, if UI does it, Background just saves it.
  
  // Re-reading Fluxo 1:
  // "3) Salvar no storage.local"
  
  // Let's accept the Encrypted blob from UI.
  const { encryptedPrivateKey, salt, iv } = seed; // Payload is actually the encrypted data
  
  await chrome.storage.local.set({
    encryptedPrivateKey,
    salt,
    iv,
    attempts: 0,
    lockedUntil: null
  });
  
  return { success: true };
}

async function handleUnlock({ pin }) {
  const state = await getStorageState();
  
  // Check Lockout
  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    throw new Error(`Wallet locked until ${new Date(state.lockedUntil).toLocaleTimeString()}`);
  }
  
  // If lockout expired, reset attempts? 
  // Usually yes, or we reset after successful login.
  if (state.lockedUntil && Date.now() >= state.lockedUntil) {
    await chrome.storage.local.set({ lockedUntil: null, attempts: 0 });
    state.attempts = 0;
  }

  try {
    const decryptedKey = await decryptPrivateKey(
      state.encryptedPrivateKey,
      pin,
      state.salt,
      state.iv
    );
    
    // Success
    session.decryptedKey = decryptedKey;
    updateSessionActivity();
    
    // Reset attempts
    await chrome.storage.local.set({ attempts: 0 });
    
    return { success: true };
  } catch (e) {
    // Increment attempts
    const newAttempts = (state.attempts || 0) + 1;
    const updates = { attempts: newAttempts };
    
    if (newAttempts >= MAX_ATTEMPTS) {
      updates.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
    
    await chrome.storage.local.set(updates);
    throw new Error(updates.lockedUntil ? 'Too many attempts. Locked for 15 min.' : 'Invalid PIN');
  }
}

async function handleApproveSignature() {
  if (!session.decryptedKey) {
    throw new Error('Wallet locked');
  }
  if (!pendingRequest) {
    throw new Error('No pending request');
  }

  try {
    const wallet = new ethers.Wallet(session.decryptedKey);

    // Handle different request types: 'login' (signMessage) or 'transaction' (signTransaction)
    if (pendingRequest.type === 'login') {
      const msg = pendingRequest.message || 'Connect';
      const signature = await wallet.signMessage(msg);
      if (pendingRequest.tabId) {
        chrome.tabs.sendMessage(pendingRequest.tabId, {
          type: 'CORVAX_SIGN_RESPONSE',
          signature
        }).catch(err => console.error('Failed to send to tab', err));
      }
      return { signature };
    }

    // Transaction signing
    const pr = pendingRequest.transaction ? pendingRequest.transaction : pendingRequest;
    // Map chain string to numeric chainId if necessary
    const chainMap = {
      'ETHEREUM': 1, 'ETH': 1,
      'BSC': 56, 'BNB': 56, 'BINANCE SMART CHAIN': 56, 'BNB CHAIN': 56,
      'POLYGON': 137, 'MATIC': 137, 'POLYGON POS': 137,
      'ARBITRUM': 42161,
      'OPTIMISM': 10,
      'BASE': 8453,
      'GNOSIS': 100,
      'LINEA': 59144
    };
    let chainIdResolved = pendingRequest.chainId || pr.chainId;
    if (!chainIdResolved && pendingRequest.chain) {
      const key = String(pendingRequest.chain).toUpperCase().trim();
      chainIdResolved = chainMap[key];
    }
    const tx = {
      to: pr.to,
      data: pr.data,
      // BigNumberish accepted: hex string OK
      value: pr.value,
      chainId: chainIdResolved,
      nonce: pr.nonce,
      gasLimit: pr.gasLimit,
      gasPrice: pr.gasPrice,
      maxFeePerGas: pr.maxFeePerGas,
      maxPriorityFeePerGas: pr.maxPriorityFeePerGas
    };

    // Ensure type set if EIP-1559 fields present
    if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
      tx.type = 2;
    }

    const signedTransaction = await wallet.signTransaction(tx);

    if (pendingRequest.tabId) {
      chrome.tabs.sendMessage(pendingRequest.tabId, {
        type: 'CORVAX_SIGN_RESPONSE',
        signedTransaction
      }).catch(err => console.error('Failed to send to tab', err));
    }
    return { signedTransaction };
  } catch (e) {
    console.error(e);
    throw e;
  } finally {
    // Cleanup
    pendingRequest = null;
    // Rule 39: Clear key from memory? 
    // If we strictly follow "Clear after signature", we should:
    // session.decryptedKey = null;
    // session.expiry = null;
    // chrome.alarms.clear('autoLock');
    // But we discussed keeping session. 
    // Let's stick to session for UX, unless user explicitly requested "One-time sign".
    // Re-reading Rule 39: "Limpar chave descriptografada da memória após assinatura."
    // It is listed under Critical Security Rules.
    // I will clear it.
    lockSession(); 
  }
}

function handleRejectSignature() {
  pendingRequest = null;
}

function handleGetAddress(sender) {
  if (!session.decryptedKey) {
    // Try to open side panel to let user unlock
    if (sender.tab && sender.tab.windowId) {
      try {
        chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(()=>{});
      } catch (_) {}
    }
    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'CORVAX_GET_ADDRESS_RESPONSE',
        error: 'Wallet locked'
      }).catch(()=>{});
    }
    return;
  }
  try {
    const wallet = new ethers.Wallet(session.decryptedKey);
    if (sender.tab && sender.tab.windowId) {
      try {
        chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch(()=>{});
      } catch (_) {}
    }
    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'CORVAX_GET_ADDRESS_RESPONSE',
        address: wallet.address
      }).catch(()=>{});
    }
  } catch (e) {
    if (sender.tab && sender.tab.id) {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: 'CORVAX_GET_ADDRESS_RESPONSE',
        error: 'Failed to derive address'
      }).catch(()=>{});
    }
  }
}
