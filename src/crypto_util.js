/**
 * SI-PRABU Clean Web Edition v3.0
 * Utilitas Kriptografi, Hashing Password (scrypt), dan Sanitasi Log
 * Pengembang: emenje
 */

const crypto = require('node:crypto');

const SCRYPT_KEYLEN = 64;
const SALT_LEN = 16;

/**
 * Hash password menggunakan scrypt dengan random salt unik
 * Format luaran: scrypt$<salt_hex>$<derived_key_hex>
 */
function hashPassword(plainPassword) {
  if (typeof plainPassword !== 'string' || !plainPassword) {
    throw new Error('Password wajib berupa teks dan tidak boleh kosong.');
  }
  const salt = crypto.randomBytes(SALT_LEN);
  const derivedKey = crypto.scryptSync(plainPassword, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

/**
 * Verifikasi password terhadap hash scrypt atau password teks lama (untuk migrasi transparan)
 */
function verifyPassword(plainPassword, storedPassword) {
  if (typeof plainPassword !== 'string' || typeof storedPassword !== 'string') {
    return { valid: false, needsUpgrade: false };
  }

  // 1. Format scrypt resmi
  if (storedPassword.startsWith('scrypt$')) {
    const parts = storedPassword.split('$');
    if (parts.length !== 3) {
      return { valid: false, needsUpgrade: false };
    }
    const [, saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const storedHash = Buffer.from(hashHex, 'hex');
    const derivedKey = crypto.scryptSync(plainPassword, salt, SCRYPT_KEYLEN);

    if (storedHash.length !== derivedKey.length) {
      return { valid: false, needsUpgrade: false };
    }
    const valid = crypto.timingSafeEqual(storedHash, derivedKey);
    return { valid, needsUpgrade: false };
  }

  // 2. Format teks lama (legacy plaintext) - kompatibel saat migrasi transparan
  const bufA = Buffer.from(plainPassword);
  const bufB = Buffer.from(storedPassword);
  let match = false;
  if (bufA.length === bufB.length) {
    match = crypto.timingSafeEqual(bufA, bufB);
  }
  return { valid: match, needsUpgrade: match };
}

/**
 * Sanitasi objek agar tidak ada password, token, atau secret yang bocor ke log
 */
function sanitizeLogData(data) {
  if (!data) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(item => sanitizeLogData(item));

  const SENSITIVE_KEYS = [
    'password', 'pass', 'pwd', 'token', 'secret', 'authorization', 'cookie',
    'kredensial', 'client_secret', 'refresh_token', 'access_token'
  ];

  const cleaned = {};
  for (const [k, v] of Object.entries(data)) {
    const lowerKey = k.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some(sk => lowerKey.includes(sk));
    if (isSensitive) {
      cleaned[k] = '[REDACTED]';
    } else if (typeof v === 'object' && v !== null) {
      cleaned[k] = sanitizeLogData(v);
    } else {
      cleaned[k] = v;
    }
  }
  return cleaned;
}

module.exports = {
  hashPassword,
  verifyPassword,
  sanitizeLogData
};
