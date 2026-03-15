// src/crypto.js

const PBKDF2_ITERATIONS = 210000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ALGO_NAME = 'AES-GCM';
const HASH_NAME = 'SHA-256';

/**
 * Generates a random salt
 * @returns {Uint8Array}
 */
export function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generates a random IV
 * @returns {Uint8Array}
 */
export function generateIV() {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Derives an AES-GCM key from a PIN and Salt using PBKDF2
 * @param {string} pin - The 6-digit PIN
 * @param {Uint8Array} salt - The salt
 * @returns {Promise<CryptoKey>}
 */
async function deriveKeyFromPin(pin, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: HASH_NAME,
    },
    keyMaterial,
    { name: ALGO_NAME, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts the private key with the PIN
 * @param {string} privateKey - The EVM private key
 * @param {string} pin - The 6-digit PIN
 * @returns {Promise<{encrypted: string, salt: string, iv: string}>} - Hex encoded strings
 */
export async function encryptPrivateKey(privateKey, pin) {
  const salt = generateSalt();
  const iv = generateIV();
  const key = await deriveKeyFromPin(pin, salt);
  const encoder = new TextEncoder();
  const data = encoder.encode(privateKey);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: ALGO_NAME,
      iv: iv,
    },
    key,
    data
  );

  return {
    encryptedPrivateKey: bufferToHex(encryptedBuffer),
    salt: bufferToHex(salt),
    iv: bufferToHex(iv)
  };
}

/**
 * Decrypts the private key using the PIN
 * @param {string} encryptedPrivateKeyHex - Hex string
 * @param {string} pin - The 6-digit PIN
 * @param {string} saltHex - Hex string
 * @param {string} ivHex - Hex string
 * @returns {Promise<string>} - The decrypted private key
 */
export async function decryptPrivateKey(encryptedPrivateKeyHex, pin, saltHex, ivHex) {
  const salt = hexToBuffer(saltHex);
  const iv = hexToBuffer(ivHex);
  const encryptedData = hexToBuffer(encryptedPrivateKeyHex);
  
  try {
    const key = await deriveKeyFromPin(pin, salt);
    
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: ALGO_NAME,
        iv: iv,
      },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (e) {
    throw new Error('Incorrect PIN or corrupted data');
  }
}

// Helpers for Hex conversion
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex) {
  if (hex.length % 2 !== 0) throw new Error('Invalid hex string');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
