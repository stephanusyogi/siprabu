/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Autentikasi & Otorisasi Berbasis Peran (RBAC) Terpadu & Terverifikasi
 * Pengembang: emenje
 */

const crypto = require('node:crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const SECRET_FILE = path.join(DATA_DIR, '.session_secret');

/**
 * Mendapatkan kunci rahasia HMAC untuk sesi.
 * Mengambil dari process.env.SESSION_SECRET atau file rahasia lokal terproteksi (tanpa kunci bawaan statis).
 */
function getSecretKey() {
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16) {
    return process.env.SESSION_SECRET.trim();
  }

  try {
    if (fs.existsSync(SECRET_FILE)) {
      const key = fs.readFileSync(SECRET_FILE, 'utf8').trim();
      if (key && key.length >= 32) return key;
    }
  } catch (e) {}

  // Generate kunci acak kriptografis 32-byte (256-bit)
  const newSecret = crypto.randomBytes(32).toString('hex');
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SECRET_FILE, newSecret, { mode: 0o600 });
  } catch (e) {
    console.warn('[AUTH] Gagal menyimpan file .session_secret:', e.message);
  }
  return newSecret;
}

// Masa berlaku token absolut: 8 jam sejak login (Bab 12 & FR-15 Canon Master Blueprint)
// Aktivitas pengguna dan simulasi peran TIDAK memperpanjang batas 8 jam ini.
const TOKEN_MAX_AGE_MS = 8 * 60 * 60 * 1000;

// Batas tidak aktif (idle timeout): 30 menit tanpa aktivitas (Bab 12 & FR-15)
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

// Pelacak aktivitas sesi & daftar pencabutan sesi (revocation list) di sisi server
const sessionLastActive = new Map();
const revokedSessions = new Set();

/**
 * Cabut sesi aktif di sisi server saat pengguna logout
 */
function revokeToken(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [str, sig] = parts;
  revokedSessions.add(sig);
  try {
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
    if (payload && payload.sid) {
      revokedSessions.add(payload.sid);
      sessionLastActive.delete(payload.sid);
    }
  } catch (e) {}
  sessionLastActive.delete(sig);
  return true;
}

/**
 * Normalisasi kode PIC subbagian
 */
function normalizePic(pic) {
  if (!pic) return 'KUL';
  const u = String(pic).trim().toUpperCase();
  if (u === 'PERENCANAAN') return 'RENDATIN';
  if (u === 'KEUANGAN') return 'KUL';
  if (u === 'PARMAS') return 'PARSDM';
  return u;
}

/**
 * Buat token session HMAC bertandatangan dengan masa berlaku absolut 8 jam dan token_version.
 * Mendukung pelestarian iat/exp/sid saat simulasi ganti peran agar tidak memperpanjang sesi 8 jam.
 */
function createToken(user, originalDevUser = null, options = {}) {
  const secretKey = getSecretKey();
  const isDev = Boolean(
    user.is_developer || 
    user.level === 0 || 
    user.role_id === 'developer' || 
    user.username === 'emenje' ||
    (originalDevUser && (originalDevUser.level === 0 || originalDevUser.username === 'emenje'))
  );

  const now = Date.now();
  const iat = (options.preserveIat && Number.isFinite(Number(options.preserveIat))) ? Number(options.preserveIat) : now;
  const exp = (options.preserveExp && Number.isFinite(Number(options.preserveExp))) ? Number(options.preserveExp) : (iat + TOKEN_MAX_AGE_MS);
  const sid = options.preserveSid || user.sid || crypto.randomBytes(12).toString('hex');

  const payload = {
    sid,
    id: user.id,
    username: user.username,
    nama_pejabat: user.nama_pejabat,
    jabatan: user.jabatan,
    role_id: user.role_id,
    level: user.level,
    pic_subbag: user.pic_subbag,
    is_developer: isDev,
    token_version: user.token_version !== undefined ? Number(user.token_version) : 1,
    iat,
    exp
  };

  // Jika developer berpindah peran untuk QC, sematkan identitas asli pengembang yang tervalidasi
  if (originalDevUser && isDev) {
    payload.original_dev_id = originalDevUser.id;
    payload.original_dev_username = originalDevUser.username || 'emenje';
    payload.dev_token_version = originalDevUser.token_version !== undefined ? Number(originalDevUser.token_version) : 1;
  } else if (user.original_dev_id && isDev) {
    payload.original_dev_id = user.original_dev_id;
    payload.original_dev_username = user.original_dev_username || 'emenje';
    payload.dev_token_version = user.dev_token_version;
  }

  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secretKey).update(str).digest('base64url');
  sessionLastActive.set(sid, now);
  return `${str}.${sig}`;
}

/**
 * Verifikasi token session dan periksa batas absolut 8 jam, idle 30 menit, pencabutan logout, serta versi token pengguna
 */
function verifyToken(token, dbInstance = null, options = {}) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [str, sig] = parts;

  if (revokedSessions.has(sig)) return null;

  const secretKey = getSecretKey();
  const expectedSig = crypto.createHmac('sha256', secretKey).update(str).digest('base64url');

  const bufSig = Buffer.from(sig);
  const bufExpected = Buffer.from(expectedSig);
  if (bufSig.length !== bufExpected.length || !crypto.timingSafeEqual(bufSig, bufExpected)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(str, 'base64url').toString('utf8'));
    const now = Date.now();
    const sessionKey = payload.sid || sig;

    if (revokedSessions.has(sessionKey)) return null;

    // 1. Periksa batas absolut 8 jam sejak login (expiration check)
    if (payload.exp && now > payload.exp) {
      sessionLastActive.delete(sessionKey);
      return null;
    }
    if (payload.iat && (now - payload.iat > TOKEN_MAX_AGE_MS)) {
      sessionLastActive.delete(sessionKey);
      return null;
    }

    // 2. Periksa batas tidak aktif (idle timeout 30 menit)
    const lastActive = sessionLastActive.get(sessionKey);
    if (lastActive !== undefined && (now - lastActive > IDLE_TIMEOUT_MS)) {
      sessionLastActive.delete(sessionKey);
      revokedSessions.add(sessionKey);
      return null;
    }
    if (options.touch !== false) {
      sessionLastActive.set(sessionKey, now);
    }

    // 3. Jika koneksi database diberikan, verifikasi integritas status user real-time
    if (dbInstance && payload.id) {
      const dbUser = dbInstance.prepare(`
        SELECT id, username, nama_pejabat, jabatan, role_id, level, pic_subbag, email, avatar_url, is_active, token_version
        FROM satker_users
        WHERE id = ?
      `).get(payload.id);

      // Tolak jika user tidak ditemukan atau nonaktif
      if (!dbUser || Number(dbUser.is_active) !== 1) {
        return null;
      }

      // Tolak jika token_version tidak cocok (misal password, peran, atau status baru diubah)
      const currentVer = dbUser.token_version !== undefined ? Number(dbUser.token_version) : 1;
      const tokenVer = payload.token_version !== undefined ? Number(payload.token_version) : 1;
      if (currentVer !== tokenVer) {
        return null;
      }

      // Jika sesi ini berasal dari peran hasil switch pengembang, verifikasi akun pengembang asal
      let origDev = null;
      if (payload.original_dev_id && payload.is_developer) {
        origDev = dbInstance.prepare(`
          SELECT id, username, nama_pejabat, avatar_url, is_active, token_version
          FROM satker_users
          WHERE id = ? AND is_active = 1
        `).get(payload.original_dev_id);

        if (!origDev) return null;
        const devVer = origDev.token_version !== undefined ? Number(origDev.token_version) : 1;
        if (payload.dev_token_version !== undefined && devVer !== Number(payload.dev_token_version)) {
          return null;
        }
      }

      return {
        ...dbUser,
        sid: payload.sid || null,
        iat: payload.iat || null,
        exp: payload.exp || null,
        is_developer: Boolean(payload.is_developer),
        original_dev_id: payload.original_dev_id || (payload.is_developer ? dbUser.id : null),
        original_dev_username: payload.original_dev_username || (origDev ? origDev.username : (payload.is_developer ? 'emenje' : null)),
        original_dev_nama: origDev ? origDev.nama_pejabat : (payload.is_developer ? dbUser.nama_pejabat : null),
        original_dev_avatar: origDev ? (origDev.avatar_url || '') : (payload.is_developer ? (dbUser.avatar_url || '') : null),
        dev_token_version: payload.dev_token_version || null
      };
    }

    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Ekstrak dan verifikasi pengguna dari header permintaan HTTP
 */
function getUserFromReq(req, dbInstance = null) {
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['cookie']) {
    const cookies = req.headers['cookie'].split(';');
    for (const c of cookies) {
      const [k, v] = c.trim().split('=');
      if (k === 'token' || k === 'siprabu_token') {
        token = v;
        break;
      }
    }
  }

  // Token sesi dilarang dikirim melalui URL query string demi keamanan (mencegah kebocoran di log/history)
  if (!token) return null;

  // Jika dbInstance tidak dikirim, gunakan default db dari ./db jika sudah tersedia
  if (!dbInstance) {
    try {
      dbInstance = require('./db').db;
    } catch (e) {}
  }

  return verifyToken(token, dbInstance);
}

/**
 * Helper izin edit baris RKB berdasarkan peran, kepemilikan data, dan status kunci
 */
function canEditRow(user, row, isPeriodeLocked) {
  if (!user) return false;
  // Jika periode terkunci, tidak ada yang boleh mengedit
  if (isPeriodeLocked) return false;

  // Level 0 (developer): Full access
  if (user.level === 0) return true;

  // Level 1 (Perencanaan): Full edit RKB
  if (user.level === 1) return true;

  // Level 2 (PIC Subbag): Hanya baris PIC miliknya
  if (user.level === 2) {
    const userPic = normalizePic(user.pic_subbag);
    const rowPic = normalizePic(row.pic_bagian);
    if (userPic === 'SEMUA') return true;
    return userPic === rowPic;
  }

  // Level 3 (Reviewer / Pejabat): Read-Only
  return false;
}

/**
 * Helper izin kelola siklus / kunci dokumen
 */
function canManageLifecycle(user) {
  if (!user) return false;
  return user.level === 0 || user.level === 1;
}

/**
 * Helper izin kelola pengguna: HANYA Level 0 (Developer) dan Kasubbag Perencanaan.
 * Saat simulasi peran aktif (user.level > 0), hak mengikuti peran yang sedang diuji (Bab 11 Canon).
 */
function canManageUsers(user) {
  if (!user) return false;
  if (user.level === 0 || user.role_id === 'developer' || user.username === 'emenje') return true;
  return Boolean(
    user.username === 'perencanaan' ||
    user.username === 'kasubbag_rendatin' ||
    user.username === 'kasubag_rendatin' ||
    (user.level === 1 && (user.role_id === 'super_admin' || user.role_id === 'perencanaan_kasubag'))
  );
}

/**
 * Helper validasi kecocokan level, role_id, dan pic_subbag saat simpan pengguna
 */
function validateUserCoherence(userData, isCreating = false) {
  const level = Number(userData.level);
  const roleId = String(userData.role_id || '').toLowerCase();
  const pic = normalizePic(userData.pic_subbag);

  if (Number.isNaN(level) || level < 0 || level > 3) {
    return { valid: false, error: 'Level pengguna tidak valid (harus 0, 1, 2, atau 3).' };
  }

  if (level === 0 && roleId !== 'developer') {
    return { valid: false, error: 'Pengguna Level 0 wajib memiliki role developer.' };
  }

  if (level === 1 && !['super_admin', 'perencanaan'].includes(roleId)) {
    return { valid: false, error: 'Pengguna Level 1 wajib memiliki role super_admin atau perencanaan.' };
  }

  if (level === 2) {
    const validPics = ['RENDATIN', 'TEKNIS', 'HUKUM', 'PARSDM', 'KUL'];
    if (!validPics.includes(pic)) {
      return { valid: false, error: `PIC Subbag untuk Level 2 harus salah satu dari: ${validPics.join(', ')}.` };
    }
  }

  return { valid: true };
}

/**
 * Helper verifikasi apakah pengguna aktif saat ini adalah Lead Developer (Level 0 / emenje).
 * Saat mode simulasi peran aktif (level > 0), akses Ruang Pengembang & Blueprint PRD ditutup
 * mengikuti batasan peran yang sedang disimulasikan.
 */
function isDeveloperUser(user) {
  if (!user) return false;
  return Boolean(
    Number(user.level) === 0 && (
      user.role_id === 'developer' || 
      user.username === 'emenje'
    )
  );
}

module.exports = {
  createToken,
  verifyToken,
  revokeToken,
  getUserFromReq,
  canEditRow,
  canManageLifecycle,
  canManageUsers,
  isDeveloperUser,
  validateUserCoherence,
  normalizePic,
  getSecretKey,
  TOKEN_MAX_AGE_MS,
  IDLE_TIMEOUT_MS
};
