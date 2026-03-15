// src/content.js

// Listen for messages from the Page (Gateway)
let lastRequestOrigin = null;

window.addEventListener('message', (event) => {
  // We only accept messages from ourselves or the page
  if (event.source !== window) return;
  
  if (event.data.type === 'CORVAX_SIGN_REQUEST') {
    lastRequestOrigin = typeof event.origin === 'string' ? event.origin : null;
    // Forward to Background
    chrome.runtime.sendMessage({
      type: 'SIGN_REQUEST_FROM_CONTENT',
      payload: event.data.payload
    });
  } else if (event.data.type === 'CORVAX_GET_ADDRESS_REQUEST') {
    lastRequestOrigin = typeof event.origin === 'string' ? event.origin : null;
    chrome.runtime.sendMessage({
      type: 'GET_ADDRESS_FROM_CONTENT'
    });
  }
});

// Listen for messages from Background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CORVAX_SIGN_RESPONSE') {
    const payload = {
      type: 'CORVAX_SIGN_RESPONSE',
      error: message.error
    };
    // Pass-through fields depending on operation
    if (message.signature) payload.signature = message.signature;
    if (message.signedTransaction) payload.signedTransaction = message.signedTransaction;
    if (message.hash) payload.hash = message.hash;
    window.postMessage(payload, lastRequestOrigin || '*');
  } else if (message.type === 'CORVAX_GET_ADDRESS_RESPONSE') {
    const payload = {
      type: 'CORVAX_GET_ADDRESS_RESPONSE',
      error: message.error,
      address: message.address
    };
    window.postMessage(payload, lastRequestOrigin || '*');
  }
});

// Removed unsafe-eval anti-debugging to comply with MV3 CSP
