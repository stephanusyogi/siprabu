/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Autentikasi & Otorisasi Berbasis Peran (RBAC)
 * Pengembang: emenje
 */

const crypto = require('node:crypto');
const { authenticateUser, getUsers } = require('./db');

// Secret key untuk token session
const SECRET_KEY = process.env.SESSION_SECRET || 'siprabu_kpu_ngawi_secret_key_2026';

// Buat token session HMAC
function createToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    nama_pejabat: user.nama_pejabat,
    jabatan: user.jabatan,
    role_id: user.role_id,
    level: user.level,
    pic_subbag: user.pic_subbag,
    ts: Date.now()
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET_KEY).update(str).digest('base64url');
  return `${str}.${sig}`;
}

// Verifikasi token session
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [str, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET_KEY).update(str).digest('base64url');
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
    // Token berlaku selama 7 hari
    const maxAge = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - payload.ts > maxAge) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

// Ekstrak user dari request (Header Authorization: Bearer <token> atau Cookie token=<token>)
function getUserFromReq(req) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['cookie']) {
    const cookies = req.headers['cookie'].split(';');
    for (const c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === 'token') {
        token = v;
        break;
      }
    }
  }
  if (!token) return null;
  return verifyToken(token);
}

// Helper periksa izin edit baris RKB
function canEditRow(user, row, isPeriodeLocked) {
  if (!user) return false;
  // Jika periode terkunci, TIDAK ADA yang boleh edit (kecuali pengembang resmi bila perlu)
  if (isPeriodeLocked) {
    return false;
  }

  // Level 0 (emenje): Full access
  if (user.level === 0) return true;

  // Level 1 (Perencanaan): Full edit RKB
  if (user.level === 1) return true;

  // Level 2 (PIC Subbag): Hanya baris PIC miliknya
  if (user.level === 2) {
    const userPic = (user.pic_subbag || '').toUpperCase();
    const rowPic = (row.pic_bagian || '').toUpperCase();

    if (userPic === 'SEMUA') return true;
    if (userPic === 'PERENCANAAN' && (rowPic === 'RENDATIN' || rowPic === 'PERENCANAAN')) return true;
    if (userPic === 'KEUANGAN' && (rowPic === 'KUL' || rowPic === 'KEUANGAN')) return true;
    if (userPic === 'PARMAS' && (rowPic === 'PARSDM' || rowPic === 'PARMAS')) return true;
    if (userPic === rowPic) return true;
    return false;
  }

  // Level 3 (Sekretaris / Komisioner): Read-Only
  return false;
}

// Helper periksa izin kunci / buka periode
function canManageLifecycle(user) {
  if (!user) return false;
  // Level 0 (emenje) & Level 1 (Perencanaan)
  return user.level === 0 || user.level === 1;
}

module.exports = {
  createToken,
  verifyToken,
  getUserFromReq,
  canEditRow,
  canManageLifecycle
};
