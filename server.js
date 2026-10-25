/**
 * SI-PRABU Clean Web Edition v3.0
 * Server Utama Node.js (Siap untuk Hostinger Cloud / hPanel & Local Development)
 * Pengembang Resmi: emenje
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

// Muat .env otomatis jika ada
const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        if (process.env[k] === undefined) {
          process.env[k] = v;
        }
      }
    }
  } catch (e) {}
}

const {
  db,
  getPeriodeList,
  getPeriodeById,
  getActivePeriode,
  lockPeriode,
  unlockPeriode,
  updatePeriodeLegalitas,
  createPeriode,
  clonePeriodeToRevision,
  getRabRows,
  getRabRowById,
  saveRabRow,
  deleteRabRow,
  updateRabBarisPicWithCascade,
  updateRabBarisSasaranWithCascade,
  reorderRow,
  getMasterReferenceVersion,
  previewStagedRkbOps,
  commitStagedRkbOps,
  getUsers,
  getUserById,
  saveUser,
  deleteUser,
  toggleUserStatus,
  authenticateUser,
  authenticateGoogleUser,
  getMasters,
  updateSettings,
  syncPrimaryKuantitas,
  getKuantitasList,
  saveKuantitas,
  getPaslonList,
  savePaslon,
  deletePaslon,
  getRegulasiList,
  saveRegulasi,
  deleteRegulasi,
  getKecamatans,
  saveKecamatan,
  deleteKecamatan,
  bulkUpsertKecamatan,
  getDesas,
  saveDesa,
  deleteDesa,
  bulkUpsertDesa,
  getSbmList,
  getSbmById,
  saveSbm,
  deleteSbm,
  bulkUpsertSbm,
  getAkunList,
  getAkunById,
  saveAkun,
  deleteAkun,
  bulkUpsertAkun,
  createDownloadRequest,
  getDownloadRequests,
  getDownloadRequestById,
  updateDownloadRequest,
  cleanupExpiredDownloads,
  getSubbagUsulanList,
  getSubbagUsulan,
  submitSubbagUsulan,
  validateSubbagUsulan,
  rejectSubbagUsulan,
  saveCatatanPlenoSubbag,
  formatWaktuSakti,
  generateNextKodeRevisi,
  createRevisiPengajuan,
  getRevisiPengajuanList,
  getRevisiPengajuanById,
  updateRevisiTahap,
  deleteRevisiPengajuan,
  finalizeTahap4Keseluruhan,
  updatePostRatificationLinks,
  getArsipRevisiList,
  getLatestRatifiedPeriode,
  getActiveRevisionCycle,
  getOrCreateRevisionCycle,
  getRevisionCycleStatus,
  getRevisiPengajuanHistory,
  recordAuditLog
} = require('./src/db');

const { calculateRkbDataset, getCachedRkbDataset, clearRkbDatasetCache, getRevisionComparison, getRevisionSummary, filterAndPruneRkbDataset, auditRkbIntegrity } = require('./src/calculation');
const { createToken, verifyToken, revokeToken, getUserFromReq, canEditRow, canManageLifecycle, canManageUsers, isDeveloperUser } = require('./src/auth');
const { 
  exportRkbToExcelBuffer, 
  exportSbmToExcelBuffer, 
  parseSbmExcelBuffer, 
  exportBasToExcelBuffer, 
  parseBasExcelBuffer,
  exportDesaToExcelBuffer,
  parseDesaExcelBuffer,
  exportKecamatanToExcelBuffer,
  parseKecamatanExcelBuffer
} = require('./src/excel_io');

const PORT = process.env.PORT || 3456;
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const DOWNLOADS_DIR = path.resolve(__dirname, 'data', 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Background Worker untuk Antrean Unduhan SAKTI Kemenkeu
async function processDownloadJob(jobId) {
  try {
    const job = getDownloadRequestById(jobId);
    if (!job || job.status !== 'DIPROSES') return;

    let buffer;

    if (job.tipe_unduhan === 'ZIP_SUBBAGIAN') {
      const periode = getPeriodeById(job.periode_id);
      const subbags = [
        { code: 'KUL', filename: `1_RUH_KUL_Keuangan_Umum_Logistik_${(periode?.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx` },
        { code: 'RENDATIN', filename: `2_RUH_RENDATIN_Perencanaan_Data_Informasi_${(periode?.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx` },
        { code: 'TEKNIS', filename: `3_RUH_TEKNIS_Teknis_Penyelenggaraan_Pemilu_${(periode?.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx` },
        { code: 'HUKUM', filename: `4_RUH_HUKUM_Hukum_${(periode?.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx` },
        { code: 'PARSDM', filename: `5_RUH_PARSDM_Partisipasi_Masyarakat_SDM_${(periode?.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx` }
      ];

      const archiver = require('archiver');
      const buffers = [];
      for (const s of subbags) {
        const buf = await exportRkbToExcelBuffer(job.periode_id, { pic: s.code });
        buffers.push({ name: s.filename, data: buf });
      }

      buffer = await new Promise((resolve, reject) => {
        const archive = archiver('zip', { zlib: { level: 6 } });
        const bufs = [];
        archive.on('data', d => bufs.push(d));
        archive.on('end', () => resolve(Buffer.concat(bufs)));
        archive.on('error', err => reject(err));
        for (const b of buffers) {
          archive.append(b.data, { name: b.name });
        }
        archive.finalize();
      });
    } else {
      // Standar RUH Excel
      const query = {};
      if (job.filter_pic && job.filter_pic !== 'SEMUA') query.pic = job.filter_pic;
      if (job.filter_sasaran && job.filter_sasaran !== 'ALL') query.sasaran = job.filter_sasaran;
      buffer = await exportRkbToExcelBuffer(job.periode_id, query);
    }

    const cleanName = (job.nama_file || 'Laporan.xlsx').replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    const diskFilename = `${job.request_id}_${cleanName}`;
    const targetPath = path.join(DOWNLOADS_DIR, diskFilename);

    fs.writeFileSync(targetPath, buffer);

    updateDownloadRequest(job.id, {
      status: 'SELESAI',
      file_path: targetPath,
      file_size: buffer.length
    });
    console.log(`[DOWNLOAD QUEUE] Permintaan #${job.id} (${job.nama_file}) selesai diproses (${buffer.length} bytes).`);
  } catch (err) {
    console.error(`[DOWNLOAD QUEUE] Gagal memproses permintaan #${jobId}:`, err);
    try {
      updateDownloadRequest(jobId, {
        status: 'GAGAL',
        error_message: err.message || 'Gagal menghasilkan berkas unduhan'
      });
    } catch (e) {}
  }
}

// Auto-cleanup unduhan kadaluarsa setiap 1 menit (otomatis membersihkan history dan file kadaluarsa)
setInterval(() => {
  try {
    const cleaned = cleanupExpiredDownloads();
    if (cleaned > 0) {
      console.log(`[DOWNLOAD CLEANUP] ${cleaned} riwayat dan berkas unduhan kadaluarsa telah dibersihkan otomatis.`);
    }
  } catch (e) {}
}, 60 * 1000);

// MIME types map
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

// Helper kirim JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Content-Disposition'
  });
  res.end(JSON.stringify(data));
}

// Helper parsing JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // Max 10MB
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', err => reject(err));
  });
}

// Serve static files
function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  safePath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    // Fallback to index.html for Single Page App navigation
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      return fs.createReadStream(indexPath).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('404 Not Found');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  fs.createReadStream(filePath).pipe(res);
}

// Rate Limiter untuk Percobaan Login Gagal (Maksimal 5x dalam 15 menit per IP)
const loginAttempts = new Map();
function checkLoginRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSec };
  }
  if (now - record.firstAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

function recordFailedLogin(ip) {
  const now = Date.now();
  let record = loginAttempts.get(ip);
  if (!record || (now - record.firstAttempt > 15 * 60 * 1000)) {
    record = { count: 1, firstAttempt: now, lockedUntil: 0 };
  } else {
    record.count++;
  }
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
  }
  loginAttempts.set(ip, record);
}

function recordSuccessfulLogin(ip) {
  loginAttempts.delete(ip);
}

// Handler request utama
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = parsedUrl.pathname;
  const query = Object.fromEntries(parsedUrl.searchParams.entries());
  const method = req.method.toUpperCase();

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'Content-Disposition'
    });
    return res.end();
  }

  try {
    // ========================================================================
    // API ROUTES
    // ========================================================================

    // 1. AUTH / LOGIN
    if (pathname === '/api/login' && method === 'POST') {
      const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1').split(',')[0].trim();
      const rateCheck = checkLoginRateLimit(clientIp);
      if (!rateCheck.allowed) {
        return sendJson(res, 429, { error: `Terlalu banyak percobaan login gagal. Silakan coba lagi dalam ${Math.ceil(rateCheck.remainingSec / 60)} menit.` });
      }

      const { username, password } = await parseJsonBody(req);
      if (!username) {
        return sendJson(res, 400, { error: 'Username wajib diisi.' });
      }
      if (!password) {
        return sendJson(res, 400, { error: 'Password wajib diisi.' });
      }

      // Verifikasi menggunakan mekanisme hash scrypt dan verifikasi aman tanpa backdoor
      const user = authenticateUser(username, password);

      if (!user) {
        recordFailedLogin(clientIp);
        return sendJson(res, 401, { error: 'Username atau password salah.' });
      }

      recordSuccessfulLogin(clientIp);

      const isDev = Boolean(user.level === 0 || user.role_id === 'developer' || user.username === 'emenje');
      if (isDev) {
        user.is_developer = true;
      }

      const token = createToken(user);
      return sendJson(res, 200, {
        success: true,
        token,
        user,
        is_developer: isDev,
        message: user.level === 0 ? 'Selamat datang Pengembang (Level 0). Mode Bebas Ganti Peran Aktif.' : undefined
      });
    }

    // 1a. GOOGLE OAUTH: GET CONFIG
    if (pathname === '/api/auth/google/config' && method === 'GET') {
      const settings = getMasters().settings || {};
      const clientId = (settings.google_client_id || process.env.GOOGLE_CLIENT_ID || '').trim();
      const enabled = (settings.google_auth_enabled === '1' || settings.google_auth_enabled === 'true') && Boolean(clientId);
      return sendJson(res, 200, {
        enabled,
        client_id: clientId,
        allowed_domains: settings.google_allowed_domains || 'kpu.go.id,gmail.com'
      });
    }

    // 1b. GOOGLE OAUTH: VERIFIKASI TOKEN ID GOOGLE
    if (pathname === '/api/auth/google' && method === 'POST') {
      const { credential } = await parseJsonBody(req);
      if (!credential) {
        return sendJson(res, 400, { error: 'Kredensial token Google wajib dikirimkan.' });
      }

      try {
        const settings = getMasters().settings || {};
        const clientId = (settings.google_client_id || process.env.GOOGLE_CLIENT_ID || '').trim();
        const isAuthEnabled = (settings.google_auth_enabled === '1' || settings.google_auth_enabled === 'true');

        if (!isAuthEnabled || !clientId) {
          return sendJson(res, 403, { error: 'Autentikasi Google Sign-In sedang dinonaktifkan oleh Administrator.' });
        }

        const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
        const googleRes = await fetch(verifyUrl);
        if (!googleRes.ok) {
          return sendJson(res, 401, { error: 'Token Google tidak valid atau telah kedaluwarsa.' });
        }

        const googlePayload = await googleRes.json();
        const email = (googlePayload.email || '').trim().toLowerCase();
        if (!email) {
          return sendJson(res, 400, { error: 'Gagal membaca email dari akun Google Anda.' });
        }

        // Validasi audience, expiration, dan email_verified
        if (!googlePayload.aud || googlePayload.aud !== clientId) {
          return sendJson(res, 401, { error: 'Kredensial token Google tidak cocok dengan Client ID aplikasi ini.' });
        }

        const nowSec = Math.floor(Date.now() / 1000);
        if (googlePayload.exp && googlePayload.exp < nowSec) {
          return sendJson(res, 401, { error: 'Token Google telah kedaluwarsa.' });
        }

        const isEmailVerified = googlePayload.email_verified === true || googlePayload.email_verified === 'true';
        if (!isEmailVerified) {
          return sendJson(res, 401, { error: 'Email Google Anda belum terverifikasi oleh Google.' });
        }

        const allowedDomainsRaw = (settings.google_allowed_domains || '').trim();
        if (allowedDomainsRaw && allowedDomainsRaw !== '*') {
          const allowed = allowedDomainsRaw.split(',').map(d => d.trim().toLowerCase()).filter(Boolean);
          const emailDomain = email.split('@')[1] || '';
          if (allowed.length > 0 && !allowed.includes(emailDomain)) {
            return sendJson(res, 403, { 
              error: `Domain email "@${emailDomain}" tidak diizinkan. Hanya email domain: ${allowed.join(', ')}.` 
            });
          }
        }

        const user = authenticateGoogleUser(googlePayload);
        if (!user) {
          return sendJson(res, 403, {
            error: `Akun Google (${email}) belum terdaftar pada Manajemen Pengguna SIPRABU. Silakan hubungi Administrator Satker untuk mendaftarkan email Anda.`
          });
        }

        const token = createToken(user);
        return sendJson(res, 200, {
          success: true,
          token,
          user,
          message: `Selamat datang, ${user.nama_pejabat}! Berhasil masuk via Google.`
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Gagal memverifikasi akun Google: ' + err.message });
      }
    }

    // 1c. POST /api/switch-user (Ganti Peran Bebas - HANYA PENGEMBANG / LEVEL 0)
    if (pathname === '/api/switch-user' && method === 'POST') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      // HANYA DEVELOPER (LEVEL 0 ATAU SESI ASAL DEVELOPER) YANG BISA GANTI PERAN
      const isDeveloper = Boolean(currentUser.level === 0 || currentUser.role_id === 'developer' || currentUser.is_developer === true || currentUser.username === 'emenje');
      if (!isDeveloper) {
        return sendJson(res, 403, { error: 'Akses ditolak. Fitur ganti peran bebas hanya diizinkan untuk Akun Pengembang (Level 0).' });
      }

      const { username } = await parseJsonBody(req);
      const targetUser = db.prepare('SELECT * FROM satker_users WHERE username = ? AND is_active = 1').get(username);
      if (!targetUser) return sendJson(res, 404, { error: 'Pengguna target tidak ditemukan atau dinonaktifkan.' });

      // Tetap sematkan is_developer: true dan simpan identitas asal developer (tidak memperpanjang batas waktu mutlak 8 jam)
      const originalDevId = currentUser.original_dev_id || currentUser.id;
      const originalDevUsername = currentUser.original_dev_username || (currentUser.level === 0 ? currentUser.username : 'emenje');
      const token = createToken({
        ...targetUser,
        is_developer: true,
        original_dev_id: originalDevId,
        original_dev_username: originalDevUsername,
        dev_token_version: currentUser.dev_token_version || currentUser.token_version
      }, null, {
        preserveIat: currentUser.iat,
        preserveExp: currentUser.exp,
        preserveSid: currentUser.sid
      });

      recordAuditLog({
        user_id: targetUser.id,
        username: targetUser.username,
        role_id: targetUser.role_id,
        action: 'SWITCH_ROLE_SIMULATION',
        target_type: 'satker_users',
        target_id: targetUser.id,
        notes: `Developer (${originalDevUsername}) beralih simulasi peran ke ${targetUser.username} (Level ${targetUser.level} - ${targetUser.jabatan})`,
        user: { ...targetUser, is_developer: true, original_dev_id: originalDevId, original_dev_username: originalDevUsername }
      });

      return sendJson(res, 200, {
        success: true,
        token,
        user: {
          id: targetUser.id,
          username: targetUser.username,
          nama_pejabat: targetUser.nama_pejabat,
          jabatan: targetUser.jabatan,
          role_id: targetUser.role_id,
          level: targetUser.level,
          pic_subbag: targetUser.pic_subbag,
          email: targetUser.email || '',
          avatar_url: targetUser.avatar_url || '',
          is_developer: true,
          original_dev_id: originalDevId,
          original_dev_username: originalDevUsername
        }
      });
    }

    // 1d. POST /api/logout (Pencabutan Sesi Server-Side - Bab 12 & FR-15)
    if (pathname === '/api/logout' && method === 'POST') {
      const currentUser = getUserFromReq(req);
      const authHeader = req.headers['authorization'] || req.headers['Authorization'] || '';
      const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (rawToken) {
        revokeToken(rawToken);
      }
      if (currentUser) {
        recordAuditLog({
          user_id: currentUser.id,
          username: currentUser.username,
          role_id: currentUser.role_id,
          action: 'LOGOUT',
          target_type: 'session',
          target_id: currentUser.id,
          notes: `Sesi pengguna diakhiri (Logout manual / Timeout inaktivitas)`,
          user: currentUser
        });
      }
      return sendJson(res, 200, { success: true, message: 'Sesi berhasil diakhiri.' });
    }

    // 2. ME / PROFIL USER AKTIF
    if (pathname === '/api/me' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) {
        return sendJson(res, 401, { error: 'Sesi login telah berakhir atau tidak valid.' });
      }
      return sendJson(res, 200, { user });
    }

    // 3. DAFTAR & MANAJEMEN PENGGUNA SATKER & DEVELOPER
    if (pathname === '/api/users' && method === 'GET') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      return sendJson(res, 200, { users: getUsers() });
    }

    if (pathname === '/api/users' && method === 'POST') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (!canManageUsers(currentUser)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Pengelolaan pengguna hanya diizinkan untuk Akun Developer dan Kasubbag Perencanaan.' });
      }

      const body = await parseJsonBody(req);

      // Level 1 tidak boleh membuat akun level 0 (developer) atau mengedit akun developer
      if (currentUser.level === 1) {
        if (Number(body.level) === 0) {
          return sendJson(res, 403, { error: 'Hanya Akun Developer yang berwenang menetapkan peran Developer.' });
        }
        if (body.id) {
          const target = getUserById(body.id);
          if (target && target.level === 0) {
            return sendJson(res, 403, { error: 'Akun Developer dilindungi dan tidak dapat diubah oleh Level 1.' });
          }
        }
      }

      try {
        const saved = saveUser(body);
        return sendJson(res, 200, { success: true, user: saved, message: `Akun "${saved.username}" berhasil disimpan.` });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    const delUserMatch = pathname.match(/^\/api\/users\/(\d+)$/);
    if (delUserMatch && method === 'DELETE') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (!canManageUsers(currentUser)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Penghapusan pengguna hanya diizinkan untuk Akun Developer dan Kasubbag Perencanaan.' });
      }

      const targetId = Number(delUserMatch[1]);
      const target = getUserById(targetId);
      if (!target) return sendJson(res, 404, { error: 'Pengguna tidak ditemukan.' });

      if (currentUser.level === 1 && target.level === 0) {
        return sendJson(res, 403, { error: 'Akun Developer dilindungi dan tidak dapat dihapus.' });
      }

      try {
        const result = deleteUser(targetId, currentUser.id);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    const toggleUserMatch = pathname.match(/^\/api\/users\/(\d+)\/toggle$/);
    if (toggleUserMatch && method === 'POST') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (!canManageUsers(currentUser)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Pengaktifan pengguna hanya diizinkan untuk Akun Developer dan Kasubbag Perencanaan.' });
      }

      const targetId = Number(toggleUserMatch[1]);
      try {
        const result = toggleUserStatus(targetId);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 3b. ENDPOINT KHUSUS LEAD DEVELOPER: BLUEPRINT & PRD ARSITEKTUR
    if (pathname === '/api/developer/blueprint' && method === 'GET') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (!isDeveloperUser(currentUser)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Menu ini hanya dapat diakses oleh Akun Pengembang (Lead Developer).' });
      }

      const blueprintPath = path.resolve(__dirname, 'BLUEPRINT_PRD.md');
      let content = '';
      let mtime = null;
      try {
        if (fs.existsSync(blueprintPath)) {
          content = fs.readFileSync(blueprintPath, 'utf8');
          const stat = fs.statSync(blueprintPath);
          mtime = stat.mtime;
        } else {
          content = '# BLUEPRINT & PRD ARSITEKTUR SI-PRABU\n\nDokumen blueprint belum diinisialisasi.';
        }
      } catch (err) {
        return sendJson(res, 500, { error: 'Gagal membaca berkas blueprint: ' + err.message });
      }

      return sendJson(res, 200, {
        success: true,
        filename: 'BLUEPRINT_PRD.md',
        last_modified: mtime,
        content
      });
    }

    if (pathname === '/api/developer/blueprint' && (method === 'PUT' || method === 'POST')) {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (!isDeveloperUser(currentUser)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Menu ini hanya dapat diakses oleh Akun Pengembang (Lead Developer).' });
      }

      const body = await parseJsonBody(req);
      if (!body || typeof body.content !== 'string') {
        return sendJson(res, 400, { error: 'Konten dokumen blueprint tidak valid.' });
      }

      const blueprintPath = path.resolve(__dirname, 'BLUEPRINT_PRD.md');
      try {
        fs.writeFileSync(blueprintPath, body.content, 'utf8');
        return sendJson(res, 200, { success: true, message: 'Dokumen Blueprint & PRD berhasil diperbarui.' });
      } catch (err) {
        return sendJson(res, 500, { error: 'Gagal menyimpan dokumen blueprint: ' + err.message });
      }
    }

    // 4. DAFTAR PERIODE / SIKLUS
    if (pathname === '/api/periodes' && method === 'GET') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const rawPeriodes = getPeriodeList();
      const periodes = rawPeriodes.filter(p => p.id !== 1000004 && !String(p.nama_periode || '').includes('Revisi 2') && p.versi_revisi !== 'Revisi 2');
      for (const p of periodes) {
        const data = getCachedRkbDataset(p.id);
        p.total_pagu = data.summary.grandTotal;
        if (p.revisi_ke > 0) {
          p.comparison_summary = getRevisionSummary(p.id);
        }
      }
      return sendJson(res, 200, { periodes });
    }

    // 5. PERIODE AKTIF
    if (pathname === '/api/periodes/active' && method === 'GET') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const active = getActivePeriode();
      if (active) {
        const data = getCachedRkbDataset(active.id);
        active.total_pagu = data.summary.grandTotal;
        if (active.revisi_ke > 0) {
          active.comparison_summary = getRevisionSummary(active.id);
        }
      }
      return sendJson(res, 200, { periode: active });
    }

    // 6. KUNCI PERIODE (LOCK)
    const lockMatch = pathname.match(/^\/api\/periodes\/(\d+)\/lock$/);
    if (lockMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (Number(user.level) !== 0) {
        return sendJson(res, 403, { error: 'Penguncian dan pengesahan siklus RKB wajib dilakukan melalui menu Pengesahan BA Pleno (Tahap 4) setelah seluruh pengajuan PIC berstatus ACC Pleno.' });
      }
      const id = Number(lockMatch[1]);
      const body = await parseJsonBody(req);
      const updated = lockPeriode(id, body, user);
      clearRkbDatasetCache();
      return sendJson(res, 200, { success: true, message: 'Dokumen berhasil dikunci (Mode Read-Only).', periode: updated });
    }

    // 7. BUKA KUNCI PERIODE (UNLOCK)
    const unlockMatch = pathname.match(/^\/api\/periodes\/(\d+)\/unlock$/);
    if (unlockMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (Number(user.level) !== 0) {
        return sendJson(res, 403, { error: 'Akses ditolak. Baseline RKB yang telah disahkan dan terkunci bersifat immutable (permanen) sesuai Canon Bab 3 & FR-07 dan tidak dapat dibuka kuncinya kembali.' });
      }
      const id = Number(unlockMatch[1]);
      try {
        const updated = unlockPeriode(id, user);
        clearRkbDatasetCache();
        return sendJson(res, 200, { success: true, message: 'Kunci dokumen berhasil dibuka. Dokumen kini berstatus LEMBAR KERJA AKTIF.', periode: updated });
      } catch (err) {
        return sendJson(res, 403, { error: err.message });
      }
    }

    // 8. UPDATE LEGALITAS PERIODE (SK / BA TAPD)
    const legalMatch = pathname.match(/^\/api\/periodes\/(\d+)\/legalitas$/);
    if (legalMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || !canManageLifecycle(user)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan yang dapat mengubah legalitas pengesahan.' });
      }
      const id = Number(legalMatch[1]);
      const existingPeriode = getPeriodeById(id);
      if (existingPeriode && Number(existingPeriode.is_locked) === 1 && Number(user.level) !== 0) {
        return sendJson(res, 403, { error: 'Dokumen baseline telah disahkan dan terkunci. Untuk memperbarui tautan dokumen arsip, gunakan fitur Koreksi Tautan Pasca-Pengesahan.' });
      }
      const body = await parseJsonBody(req);
      const updated = updatePeriodeLegalitas(id, body, user);
      clearRkbDatasetCache();
      return sendJson(res, 200, { success: true, message: 'Dasar legalitas dokumen berhasil diperbarui.', periode: updated });
    }

    // 9. BUAT USULAN REVISI (CLONE DARI DOKUMEN YANG TELAH TERKUNCI)
    const cloneMatch = pathname.match(/^\/api\/periodes\/(\d+)\/clone-revision$/);
    if (cloneMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!canManageLifecycle(user)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan yang dapat membuat usulan revisi RKB baru.' });
      }
      const sourceId = Number(cloneMatch[1]);
      const body = await parseJsonBody(req);
      const newPeriode = clonePeriodeToRevision(sourceId, body);
      return sendJson(res, 200, { success: true, periode: newPeriode });
    }

    // 10. QUERY RKB BARIS & CALCULATIONS
    const rkbMatch = pathname.match(/^\/api\/rkb\/(\d+)$/);
    if (rkbMatch && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      const periodeId = Number(rkbMatch[1]);
      let { pic, target_scope, search } = query;
      
      if (user.level > 0 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
        // Enforce subbag scoping: User hanya melihat subbag yang ditugaskan
        pic = user.pic_subbag;
      }
      
      const periode = getPeriodeById(periodeId);
      if (!periode) {
        return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });
      }

      // 1. Ambil dataset & summary INDUK dokumen via in-memory cache super cepat
      const fullResult = getCachedRkbDataset(periodeId);
      const docSummary = fullResult.summary;
      const subbagSummaries = docSummary.subbagSummaries || {};

      // 2. Active subbag & summary sesuai level dan wewenang pengguna
      const activeSubbag = (pic && pic !== 'SEMUA') ? pic : null;
      const activeSummary = (activeSubbag && subbagSummaries[activeSubbag])
        ? subbagSummaries[activeSubbag]
        : docSummary;

      // 3. Filter & Prune baris untuk lembar kerja workbench secara presisi (buang header kosong / bukan PIC)
      const hasFilter = Boolean((pic && pic !== 'SEMUA') || (target_scope && target_scope !== 'ALL') || (search && search.trim()));
      let rows, filteredSummary;

      if (hasFilter) {
        const pruned = filterAndPruneRkbDataset(fullResult, { pic, target_scope, search });
        rows = pruned.rows;
        filteredSummary = pruned.summary;
      } else {
        rows = fullResult.rows;
        filteredSummary = docSummary;
      }

      const compareWith = query.compare_with ? Number(query.compare_with) : null;
      const revision_comparison = getRevisionComparison(periodeId, compareWith, fullResult);
      const refMeta = getMasterReferenceVersion();

      return sendJson(res, 200, {
        periode,
        summary: docSummary,
        active_summary: activeSummary,
        subbag_summaries: subbagSummaries,
        filtered_summary: filteredSummary,
        scoped_pic: activeSubbag,
        is_user_scoped: Boolean(user && user.level > 0 && user.pic_subbag && user.pic_subbag !== 'SEMUA'),
        user_pic: (user && user.pic_subbag) || 'SEMUA',
        rows,
        revision_comparison,
        reference_version: refMeta.version,
        reference_summary: refMeta.summary
      });
    }

    // 10a. STAGED DRAFT BUFFER PREVIEW & BATCH COMMIT RKB (BAB 18.8 CANON)
    const previewStagedMatch = pathname.match(/^\/api\/rkb\/(\d+)\/preview-staged$/);
    if (previewStagedMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      const periodeId = Number(previewStagedMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });

      const body = await parseJsonBody(req);
      const ops = Array.isArray(body.ops) ? body.ops : [];
      let { pic, target_scope, search, compare_with } = body;

      if (user.level > 0 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
        pic = user.pic_subbag;
      }

      try {
        const preview = previewStagedRkbOps(periodeId, ops, user);
        const fullResult = preview.afterDataset;
        const docSummary = fullResult.summary;
        const subbagSummaries = docSummary.subbagSummaries || {};
        const activeSubbag = (pic && pic !== 'SEMUA') ? pic : null;
        const activeSummary = (activeSubbag && subbagSummaries[activeSubbag])
          ? subbagSummaries[activeSubbag]
          : docSummary;

        const hasFilter = Boolean((pic && pic !== 'SEMUA') || (target_scope && target_scope !== 'ALL') || (search && String(search).trim()));
        let rows, filteredSummary;
        if (hasFilter) {
          const pruned = filterAndPruneRkbDataset(fullResult, { pic, target_scope, search });
          rows = pruned.rows;
          filteredSummary = pruned.summary;
        } else {
          rows = fullResult.rows;
          filteredSummary = docSummary;
        }

        const compareWith = compare_with ? Number(compare_with) : null;
        const revision_comparison = getRevisionComparison(periodeId, compareWith, fullResult);

        return sendJson(res, 200, {
          ok: true,
          periode,
          summary: docSummary,
          active_summary: activeSummary,
          subbag_summaries: subbagSummaries,
          filtered_summary: filteredSummary,
          scoped_pic: activeSubbag,
          is_user_scoped: Boolean(user && user.level > 0 && user.pic_subbag && user.pic_subbag !== 'SEMUA'),
          user_pic: (user && user.pic_subbag) || 'SEMUA',
          rows,
          revision_comparison,
          staged_diff: preview.staged_diff,
          temp_id_map: preview.tempIdMap,
          last_affected_row_id: preview.lastAffectedRowId,
          reference_version: preview.reference_version,
          reference_summary: preview.reference_summary
        });
      } catch (err) {
        const status = err.message.includes('Akses ditolak') || err.message.includes('terkunci') || err.message.includes('TERKUNCI') ? 403 : 400;
        return sendJson(res, status, { error: err.message });
      }
    }

    const commitStagedMatch = pathname.match(/^\/api\/rkb\/(\d+)\/commit-staged$/);
    if (commitStagedMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      const periodeId = Number(commitStagedMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });

      const body = await parseJsonBody(req);
      const ops = Array.isArray(body.ops) ? body.ops : [];

      try {
        const result = commitStagedRkbOps(periodeId, ops, {
          expected_reference_version: body.expected_reference_version || null,
          acknowledge_reference_change: Boolean(body.acknowledge_reference_change),
          catatan_simpan: body.catatan_simpan || ''
        }, user);

        if (!result.committed && result.reference_changed) {
          return sendJson(res, 409, {
            ok: false,
            committed: false,
            reference_changed: true,
            reference_version: result.reference_version,
            reference_summary: result.reference_summary,
            staged_diff: result.staged_diff,
            error: result.message
          });
        }

        clearRkbDatasetCache();
        return sendJson(res, 200, {
          ok: true,
          committed: true,
          reference_version: result.reference_version,
          reference_summary: result.reference_summary,
          staged_diff: result.staged_diff,
          last_affected_row_id: result.lastAffectedRowId,
          message: result.message
        });
      } catch (err) {
        const status = err.message.includes('Akses ditolak') || err.message.includes('terkunci') || err.message.includes('TERKUNCI') ? 403 : 400;
        return sendJson(res, status, { error: err.message });
      }
    }

    // 10b. QUICK UPDATE PIC & KODE AKUN (INLINE SPREADSHEET SHORTCUT)
    const quickPicMatch = pathname.match(/^\/api\/rkb\/(\d+)\/quick-pic$/);
    if (quickPicMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const periodeId = Number(quickPicMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });
      if (Number(periode.is_locked) === 1) return sendJson(res, 403, { error: 'Dokumen berstatus terkunci.' });

      // Operator tidak boleh memindahkan PIC / Subbagian
      if (user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Operator tidak berwenang memindahkan PIC / Subbagian.' });
      }

      const body = await parseJsonBody(req);
      const { row_id, pic_bagian, cascade } = body;
      const storedRow = getRabRowById(Number(row_id));
      if (!storedRow || storedRow.periode_id !== periodeId) {
        return sendJson(res, 404, { error: 'Baris RKB tidak ditemukan pada periode ini.' });
      }

      const result = updateRabBarisPicWithCascade(periodeId, Number(row_id), pic_bagian, cascade !== false, user);
      clearRkbDatasetCache();
      return sendJson(res, 200, {
        ok: true,
        message: `PIC baris berhasil diperbarui (${result.count} baris terupdate).`,
        count: result.count,
        updatedIds: result.updatedIds,
        pic_bagian: result.pic_bagian
      });
    }

    const quickSasaranMatch = pathname.match(/^\/api\/rkb\/(\d+)\/quick-sasaran$/);
    if (quickSasaranMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const periodeId = Number(quickSasaranMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });
      if (Number(periode.is_locked) === 1) return sendJson(res, 403, { error: 'Dokumen berstatus terkunci.' });

      const body = await parseJsonBody(req);
      const { row_id, target_scope, cascade } = body;
      const storedRow = getRabRowById(Number(row_id));
      if (!storedRow || storedRow.periode_id !== periodeId) {
        return sendJson(res, 404, { error: 'Baris RKB tidak ditemukan pada periode ini.' });
      }
      if (!canEditRow(user, storedRow, periode.is_locked)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Anda tidak berwenang mengedit baris ini.' });
      }

      try {
        const result = updateRabBarisSasaranWithCascade(periodeId, Number(row_id), target_scope, cascade !== false, user);
        clearRkbDatasetCache();
        return sendJson(res, 200, {
          ok: true,
          message: `Sasaran baris berhasil diperbarui (${result.count} baris terupdate).`,
          count: result.count,
          updatedIds: result.updatedIds,
          target_scope: result.target_scope
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    const auditIntegritasMatch = pathname.match(/^\/api\/rkb\/(\d+)\/audit-integritas$/);
    if (auditIntegritasMatch && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const periodeId = Number(auditIntegritasMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });

      const report = auditRkbIntegrity(periodeId);
      return sendJson(res, 200, { ok: true, report });
    }

    const quickAkunMatch = pathname.match(/^\/api\/rkb\/(\d+)\/quick-akun$/);
    if (quickAkunMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const periodeId = Number(quickAkunMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });
      if (Number(periode.is_locked) === 1) return sendJson(res, 403, { error: 'Dokumen berstatus terkunci.' });

      const body = await parseJsonBody(req);
      const { row_id, kode_akun } = body;
      const storedRow = getRabRowById(Number(row_id));
      if (!storedRow || storedRow.periode_id !== periodeId) {
        return sendJson(res, 404, { error: 'Baris RKB tidak ditemukan pada periode ini.' });
      }
      if (!canEditRow(user, storedRow, periode.is_locked)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Anda tidak berwenang mengedit baris ini.' });
      }

      try {
        checkRowEditPermission(periodeId, storedRow.pic_bagian, user);
        db.prepare('UPDATE rab_baris SET kode_akun = ? WHERE id = ? AND periode_id = ?').run(kode_akun, row_id, periodeId);
        recordAuditLog({
          user,
          action: 'QUICK_UPDATE_AKUN',
          entity: 'rab_baris',
          entity_id: row_id,
          old_values: { kode_akun: storedRow.kode_akun },
          new_values: { kode_akun },
          notes: `Kode akun baris RKB [${row_id}] diubah menjadi ${kode_akun}.`
        });
        clearRkbDatasetCache();
        return sendJson(res, 200, { ok: true, message: 'Kode Akun berhasil diperbarui.' });
      } catch (err) {
        return sendJson(res, 403, { error: err.message });
      }
    }

    const quickCatatanMatch = pathname.match(/^\/api\/rkb\/(\d+)\/quick-catatan$/);
    if (quickCatatanMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const periodeId = Number(quickCatatanMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });
      if (Number(periode.is_locked) === 1) return sendJson(res, 403, { error: 'Dokumen berstatus terkunci.' });

      const body = await parseJsonBody(req);
      const { row_id, catatan_revisi_baris } = body;
      const storedRow = getRabRowById(Number(row_id));
      if (!storedRow || storedRow.periode_id !== periodeId) {
        return sendJson(res, 404, { error: 'Baris RKB tidak ditemukan pada periode ini.' });
      }
      if (!canEditRow(user, storedRow, periode.is_locked)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Anda tidak berwenang mengedit baris ini.' });
      }

      try {
        checkRowEditPermission(periodeId, storedRow.pic_bagian, user);
        db.prepare('UPDATE rab_baris SET catatan_revisi_baris = ? WHERE id = ? AND periode_id = ?').run(catatan_revisi_baris || '', row_id, periodeId);
        recordAuditLog({
          user,
          action: 'QUICK_UPDATE_CATATAN',
          entity: 'rab_baris',
          entity_id: row_id,
          old_values: { catatan_revisi_baris: storedRow.catatan_revisi_baris || '' },
          new_values: { catatan_revisi_baris: catatan_revisi_baris || '' },
          notes: `Catatan justifikasi baris RKB [${row_id}] diperbarui.`
        });
        clearRkbDatasetCache();
        return sendJson(res, 200, { ok: true, message: 'Catatan justifikasi revisi berhasil disimpan.' });
      } catch (err) {
        return sendJson(res, 403, { error: err.message });
      }
    }

    // 10c. RESUME SASARAN CEPAT (PENYELENGGARA VS PESERTA)
    const resumeSasaranMatch = pathname.match(/^\/api\/rkb\/(\d+)\/resume-sasaran$/);
    if (resumeSasaranMatch && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const periodeId = Number(resumeSasaranMatch[1]);
      const rawRows = getRabRows(periodeId);
      const { summary } = calculateRkbDataset(rawRows);
      return sendJson(res, 200, { ok: true, resume: summary });
    }

    // 10d. WORKFLOW PENGUSULAN REVISI SUBBAG & VALIDASI RENDATIN
    // GET /api/rkb/:id/usulan-subbag
    const usulanListMatch = pathname.match(/^\/api\/rkb\/(\d+)\/usulan-subbag$/);
    if (usulanListMatch && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const periodeId = Number(usulanListMatch[1]);
      const list = getSubbagUsulanList(periodeId);
      
      // Hitung perbandingan Semula vs Menjadi per subbag secara real-time
      const comparison = getRevisionComparison(periodeId);
      const subbagDeltas = {};
      if (comparison && comparison.has_parent) {
        for (const item of (comparison.log_detail || [])) {
          const sub = (item.pic_bagian || '').toUpperCase();
          if (!subbagDeltas[sub]) {
            subbagDeltas[sub] = { delta: 0, items: 0 };
          }
          subbagDeltas[sub].delta += (item.diff || 0);
          subbagDeltas[sub].items++;
        }
      }

      // Hitung stats
      const stats = {
        total: list.length,
        draft: list.filter(u => u.status === 'DRAFT').length,
        diajukan: list.filter(u => u.status === 'DIAJUKAN').length,
        valid: list.filter(u => u.status === 'VALID').length,
        dikembalikan: list.filter(u => u.status === 'DIKEMBALIKAN' || u.status === 'DITOLAK_PLENO').length,
        disetujui: list.filter(u => u.status === 'DISETUJUI_PLENO').length
      };

      // Gabungkan info delta ke list
      const enrichedList = list.map(u => ({
        ...u,
        subbag_kode: u.subbag,
        status_usulan: u.status,
        catatan_koreksi: u.alasan_pengembalian || '',
        delta: subbagDeltas[u.subbag]?.delta || 0,
        changed_items_count: subbagDeltas[u.subbag]?.items || 0
      }));

      // Jika user operator atau komisioner dengan pic spesifik, hanya kirim usulan subbagnya
      const resultList = (user && user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA')
        ? enrichedList.filter(u => u.subbag === user.pic_subbag)
        : enrichedList;

      return sendJson(res, 200, {
        usulan: resultList,
        usulan_list: resultList,
        stats,
        user_pic: user?.pic_subbag || 'SEMUA'
      });
    }

    // POST /api/rkb/:id/usulan-subbag/ajukan
    const usulanAjukanMatch = pathname.match(/^\/api\/rkb\/(\d+)\/usulan-subbag\/ajukan$/);
    if (usulanAjukanMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (Number(user.level) === 3) {
        return sendJson(res, 403, { error: 'Akses ditolak. Akun Pimpinan / Viewer (Level 3) bersifat Read-Only dan tidak dapat mengajukan usulan revisi.' });
      }
      const periodeId = Number(usulanAjukanMatch[1]);
      const body = await parseJsonBody(req);
      
      let subbag = (body.subbag || body.subbag_kode || '').toUpperCase();
      if (user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
        subbag = user.pic_subbag; // Force subbag to user's assigned subbag
      }
      if (!subbag) return sendJson(res, 400, { error: 'Subbagian pengusul wajib ditentukan.' });

      try {
        const usulan = submitSubbagUsulan({
          periodeId,
          subbag,
          gdrive_link: body.gdrive_link,
          catatan_usulan: body.catatan_usulan,
          user,
          total_semula: body.total_semula,
          total_menjadi: body.total_menjadi
        });
        return sendJson(res, 200, { success: true, message: `Usulan revisi Subbagian ${subbag} berhasil diajukan ke Tim Rendatin!`, usulan });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // POST /api/rkb/:id/usulan-subbag/validasi
    const usulanValidasiMatch = pathname.match(/^\/api\/rkb\/(\d+)\/usulan-subbag\/validasi$/);
    if (usulanValidasiMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Tim Rendatin (Level 1) yang berwenang menyatakan valid.' });
      }
      const periodeId = Number(usulanValidasiMatch[1]);
      const body = await parseJsonBody(req);
      const subbag = (body.subbag || body.subbag_kode || '').toUpperCase();
      try {
        const usulan = validateSubbagUsulan({ periodeId, subbag, user });
        return sendJson(res, 200, { success: true, message: `Usulan Subbagian ${subbag} dinyatakan VALID dan siap dibahas di Sidang Pleno.`, usulan });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // POST /api/rkb/:id/usulan-subbag/kembalikan
    const usulanKembalikanMatch = pathname.match(/^\/api\/rkb\/(\d+)\/usulan-subbag\/kembalikan$/);
    if (usulanKembalikanMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Tim Rendatin (Level 1) yang berwenang mengembalikan usulan.' });
      }
      const periodeId = Number(usulanKembalikanMatch[1]);
      const body = await parseJsonBody(req);
      const subbag = (body.subbag || body.subbag_kode || '').toUpperCase();
      const alasan = body.alasan_pengembalian || body.alasan || '';
      try {
        const usulan = rejectSubbagUsulan({ periodeId, subbag, alasan_pengembalian: alasan, user });
        return sendJson(res, 200, { success: true, message: `Usulan Subbagian ${subbag} dikembalikan ke PIC untuk perbaikan berkas.`, usulan });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // POST /api/rkb/:id/usulan-subbag/catatan-pleno
    const usulanCatatanPlenoMatch = pathname.match(/^\/api\/rkb\/(\d+)\/usulan-subbag\/catatan-pleno$/);
    if (usulanCatatanPlenoMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Tim Rendatin (Level 1) yang dapat membubuhkan catatan pleno.' });
      }
      const periodeId = Number(usulanCatatanPlenoMatch[1]);
      const body = await parseJsonBody(req);
      const subbag = (body.subbag || body.subbag_kode || '').toUpperCase();
      try {
        const usulan = saveCatatanPlenoSubbag({ periodeId, subbag, catatan_pleno: body.catatan_pleno, user });
        return sendJson(res, 200, { success: true, message: `Catatan hasil pleno untuk Subbag ${subbag} berhasil disimpan.`, usulan });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // ========================================================================
    // SIKLUS PROSES REVISI MANDIRI (STANDAR SAKTI KEMENKEU 4-TAHAP WORKFLOW)
    // ========================================================================

    // 1. GET /api/revisi/monitoring & /api/revisi/pengajuan
    if ((pathname === '/api/revisi/monitoring' || pathname === '/api/revisi/pengajuan') && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      let subbagFilter = query.subbag || '';
      // PIC Level 2 hanya dapat memantau usulan subbagnya sendiri
      if (user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
        subbagFilter = user.pic_subbag;
      }
      const list = getRevisiPengajuanList({
        subbag: subbagFilter,
        status: query.status || '',
        search: query.search || '',
        periode_id: query.periode_id || null
      });
      return sendJson(res, 200, { success: true, data: list, user_subbag: user ? user.pic_subbag : 'SEMUA' });
    }

    // 1b. GET /api/revisi/status-siklus (Status Siklus Revisi, Dasar Anggaran, & Kesiapan Pengesahan)
    if (pathname === '/api/revisi/status-siklus' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const pId = query.periode_id ? Number(query.periode_id) : null;
      const statusSiklus = getRevisionCycleStatus(pId);
      return sendJson(res, 200, { success: true, data: statusSiklus });
    }

    // 1c. GET /api/rekap/perencanaan & GET /api/rekap/pelaksanaan (Bab 21 Canon Master Blueprint)
    const rekapMatch = pathname.match(/^\/api\/rekap\/(perencanaan|pelaksanaan)$/);
    if (rekapMatch && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      const mode = rekapMatch[1]; // 'perencanaan' | 'pelaksanaan'
      const role = (user.role_id || '').toLowerCase();
      const uname = (user.username || '').toLowerCase();
      const isKetua = role === 'ketua_kpu' || uname === 'ketua' || uname === 'ketua_kpu';
      const isSekretaris = role === 'sekretaris' || uname === 'sekretaris' || role === 'viewer_sekretaris';
      const isDivPerencanaan = role === 'komisioner_rendatin' || uname === 'divisi_rendatin' || uname === 'komisioner';

      if (mode === 'pelaksanaan') {
        // Bab 21.4: Rekap Pelaksanaan dikunci khusus untuk Ketua KPU, Sekretaris KPU, dan Level 1 (serta Level 0)
        const canAccessPelaksanaan = user.level <= 1 || isKetua || isSekretaris;
        if (!canAccessPelaksanaan) {
          return sendJson(res, 403, { error: 'Akses ditolak. Menu Rekap Pelaksanaan dikunci khusus untuk Ketua KPU, Sekretaris KPU, dan Tim Perencanaan (Level 1).' });
        }
      }

      const targetPeriode = mode === 'pelaksanaan'
        ? getLatestRatifiedPeriode()
        : (getActivePeriode() || getLatestRatifiedPeriode());

      if (!targetPeriode) {
        return sendJson(res, 404, { error: 'Dokumen RKB sumber rekap tidak ditemukan.' });
      }

      const canViewAll = user.level <= 1 || isKetua || isSekretaris || isDivPerencanaan || (user.pic_subbag === 'SEMUA');
      let filterPic = query.pic || 'SEMUA';
      if (!canViewAll && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
        filterPic = user.pic_subbag;
      }

      const fullDataset = getCachedRkbDataset(targetPeriode.id);
      const activeData = (filterPic && filterPic !== 'SEMUA')
        ? filterAndPruneRkbDataset(fullDataset, { pic: filterPic })
        : fullDataset;

      // Bangun Rekap Kegiatan RKB (Hanya sampai Level 3: L1 Makro [level_indent=0], L2 Kelompok Tahapan [level_indent=1], L3 Kegiatan [level_indent=2])
      const kegiatanRows = (activeData.rows || []).filter(r => r.is_header && Number(r.level_indent) <= 2).map(r => ({
        id: r.id,
        urutan: r.urutan,
        kode: r.kode || '-',
        uraian: r.uraian || '-',
        level_indent: r.level_indent,
        pic_bagian: r.pic_bagian || '-',
        target_scope: r.target_scope || 'KAB',
        jumlah: r.computed_total || 0
      }));

      const masters = getMasters();
      const akunMap = {};
      (masters.akuns || []).forEach(a => { akunMap[a.kode] = a; });

      return sendJson(res, 200, {
        ok: true,
        mode,
        can_view_all: canViewAll,
        filter_pic: filterPic,
        periode: {
          id: targetPeriode.id,
          nama_periode: targetPeriode.nama_periode,
          versi_revisi: targetPeriode.versi_revisi,
          fase_perencanaan: targetPeriode.fase_perencanaan || targetPeriode.tahap_revisi || 'PRA_NPHD',
          dasar_pengesahan: targetPeriode.dasar_pengesahan || 'BA Pleno Komisioner',
          nomor_ba_tapd: targetPeriode.nomor_ba_tapd || '-',
          tanggal_ba_tapd: targetPeriode.tanggal_ba_tapd || '-',
          is_locked: targetPeriode.is_locked
        },
        summary: activeData.summary,
        doc_summary: fullDataset.summary,
        kegiatan_rows: kegiatanRows,
        akun_map: akunMap
      });
    }

    // 2. POST /api/revisi/pengajuan (Submit Usulan Revisi Subbag Baru)
    if (pathname === '/api/revisi/pengajuan' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu untuk mengajukan usulan revisi.' });
      if (Number(user.level) === 3) {
        return sendJson(res, 403, { error: 'Akses ditolak. Akun Pimpinan / Viewer (Level 3) bersifat Read-Only dan tidak dapat mengajukan usulan revisi.' });
      }

      const body = await parseJsonBody(req);
      // Jika user adalah PIC Level 2, paksa subbag sesuai dengan wewenangnya
      if (user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
        body.subbag = user.pic_subbag;
      }

      try {
        const item = createRevisiPengajuan(body, user);
        return sendJson(res, 201, {
          success: true,
          message: `Usulan Revisi [${item.kode_revisi}] berhasil diajukan dan diteruskan ke Tim Rendatin untuk Tahap 2 (Penelitian).`,
          data: item
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 3. GET /api/revisi/pengajuan/:id (Detail Usulan Revisi)
    const revisiDetailMatch = pathname.match(/^\/api\/revisi\/pengajuan\/(\d+)$/);
    if (revisiDetailMatch && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const id = Number(revisiDetailMatch[1]);
      const item = getRevisiPengajuanById(id);
      if (!item) return sendJson(res, 404, { error: 'Data usulan revisi tidak ditemukan.' });
      if (user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA' && String(item.subbag || '').toUpperCase() !== String(user.pic_subbag).toUpperCase()) {
        return sendJson(res, 403, { error: `Akses ditolak. Anda hanya berhak melihat detail pengajuan revisi milik Subbagian ${user.pic_subbag}.` });
      }
      return sendJson(res, 200, { success: true, data: item });
    }

    // 3b. GET /api/revisi/pengajuan/:id/history (Log Riwayat Pengajuan, Pengembalian & Pleno)
    // Bab 6 Canon: Akses resume proses lengkap dan audit rinci hanya untuk Kasubag Rendatin dan Developer
    const revisiHistoryMatch = pathname.match(/^\/api\/revisi\/pengajuan\/(\d+)\/history$/);
    if (revisiHistoryMatch && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const canSeeDetailedAudit = user.level === 0 || (user.level === 1 && (user.username === 'perencanaan' || user.username === 'kasubbag_rendatin' || user.role_id === 'super_admin' || user.role_id === 'perencanaan'));
      if (!canSeeDetailedAudit) {
        return sendJson(res, 200, { success: true, data: [], history: [], restricted: true });
      }
      const id = Number(revisiHistoryMatch[1]);
      const history = getRevisiPengajuanHistory(id);
      return sendJson(res, 200, { success: true, data: history, history });
    }

    // 4. POST /api/revisi/pengajuan/:id/tahap (Proses Tahap 2, 3, atau 4)
    const revisiTahapMatch = pathname.match(/^\/api\/revisi\/pengajuan\/(\d+)\/tahap$/);
    if (revisiTahapMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      const id = Number(revisiTahapMatch[1]);
      const body = await parseJsonBody(req);
      const targetTahap = Number(body.tahap);

      // Verifikasi otorisasi per tahap (Bab 4.2 Canon: Tahap 2 & Tahap 3 dioperasikan di sistem oleh akun Perencanaan Level 1)
      if (targetTahap === 2 && user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Tahap 2 (Penelitian Teknis) hanya berhak diproses oleh Tim Rendatin / Perencanaan (Level 1).' });
      }
      if (targetTahap === 3 && user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Tahap 3 (Pencatatan Hasil Sidang Pleno) hanya berhak dioperasikan di sistem oleh Tim Rendatin / Perencanaan (Level 1).' });
      }
      if (targetTahap === 4 && user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Tahap 4 (Penetapan & Pengesahan) hanya berhak diproses oleh Tim Rendatin / Perencanaan (Level 1).' });
      }

      try {
        const updated = updateRevisiTahap(id, {
          tahap: targetTahap,
          aksi: body.aksi || 'SETUJU',
          catatan: body.catatan || '',
          nomor_penetapan: body.nomor_penetapan || '',
          tanggal_penetapan: body.tanggal_penetapan || '',
          user
        });
        clearRkbDatasetCache();
        return sendJson(res, 200, {
          success: true,
          message: targetTahap === 4 ? `Revisi [${updated.kode_revisi}] resmi disahkan dan versi RKB berhasil dikunci (Locked History).` : `Tahap ${targetTahap} berhasil diproses.`,
          data: updated
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 5. DELETE /api/revisi/pengajuan/:id (Batalkan Usulan)
    if (revisiDetailMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (Number(user.level) === 3) {
        return sendJson(res, 403, { error: 'Akses ditolak. Akun Pimpinan / Viewer (Level 3) bersifat Read-Only.' });
      }
      const id = Number(revisiDetailMatch[1]);
      try {
        deleteRevisiPengajuan(id, user);
        return sendJson(res, 200, { success: true, message: 'Usulan revisi berhasil dibatalkan.' });
      } catch (err) {
        const status = err.message.includes('Akses ditolak') ? 403 : 400;
        return sendJson(res, status, { error: err.message });
      }
    }

    // 6. GET /api/revisi/arsip (Monitoring Migrasi Data / Arsip Versi RKB Terkunci)
    if (pathname === '/api/revisi/arsip' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const arsipList = getArsipRevisiList();
      return sendJson(res, 200, { success: true, data: arsipList });
    }

    // 6b. GET /api/revisi/tahap4-info (Info Siklus RKB Aktif & Kesiapan Pengesahan Tahap 4)
    if (pathname === '/api/revisi/tahap4-info' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      const cycleStatus = getRevisionCycleStatus(query.periode_id ? Number(query.periode_id) : null);
      const activePeriode = cycleStatus.siklus_aktif;
      const dataset = activePeriode ? getCachedRkbDataset(activePeriode.id) : null;
      const totalPagu = dataset?.summary?.grandTotal || 0;
      const belanjaItems = (dataset?.rows || []).filter(r => r.jenis_baris === 'ITEM');

      return sendJson(res, 200, {
        success: true,
        periode: activePeriode,
        dasar_anggaran: cycleStatus.dasar_anggaran,
        total_pagu: totalPagu,
        total_items: belanjaItems.length,
        proposals: cycleStatus.proposals,
        subbag_status: cycleStatus.subbag_status,
        siap_pengesahan: cycleStatus.siap_pengesahan,
        is_ready_for_ratification: cycleStatus.siap_pengesahan,
        belum_acc_list: cycleStatus.belum_acc_list,
        pending_subbags: cycleStatus.pending_subbags
      });
    }

    // 6c. POST /api/revisi/pengesahan-tahap4-keseluruhan (Tahap 4 Sistem: Kunci RKB Draf Keseluruhan & Lampirkan BA Pleno)
    if (pathname === '/api/revisi/pengesahan-tahap4-keseluruhan' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Pengesahan Tahap 4 (Penguncian RKB & BA Pleno) hanya dapat dilakukan oleh Tim Rendatin / Perencanaan (Level 1).' });
      }

      const body = await parseJsonBody(req);
      try {
        const result = finalizeTahap4Keseluruhan({
          nomor_ba: body.nomor_ba,
          tanggal_ba: body.tanggal_ba,
          link_scan_ba: body.link_scan_ba,
          rkb_final_link: body.rkb_final_link || '',
          kak_gabungan_link: body.kak_gabungan_link || '',
          fase_perencanaan: body.fase_perencanaan || '',
          dasar_pengesahan: body.dasar_pengesahan || '',
          verifikasi_manual: Boolean(body.verifikasi_manual),
          strict_tahap4: Boolean(body.strict_tahap4),
          catatan: body.catatan,
          user
        });
        clearRkbDatasetCache();
        return sendJson(res, 200, {
          success: true,
          message: `RKB Siklus berhasil DIKUNCI RESMI secara keseluruhan dengan Berita Acara Pleno ${result.nomor_ba}. Hasilnya menjadi dasar anggaran berikutnya!`,
          data: result
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 6d. POST /api/periodes/:id/koreksi-tautan (Koreksi Tautan Pasca-Pengesahan oleh Kasubag Rendatin, Bab 4.3 & Bab 14)
    const koreksiTautanMatch = pathname.match(/^\/api\/(?:periodes|revisi\/arsip)\/(\d+)\/koreksi-tautan$/);
    if (koreksiTautanMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const targetPeriodeId = Number(koreksiTautanMatch[1]);
      const body = await parseJsonBody(req);
      try {
        const updated = updatePostRatificationLinks(targetPeriodeId, {
          gdrive_link_pleno: body.gdrive_link_pleno,
          rkb_final_link: body.rkb_final_link,
          kak_gabungan_link: body.kak_gabungan_link,
          catatan: body.catatan
        }, user);
        return sendJson(res, 200, {
          success: true,
          message: 'Tautan dokumen arsip pasca-pengesahan berhasil diperbarui dan dicatat pada Audit Log.',
          data: updated
        });
      } catch (err) {
        const status = err.message.includes('Akses ditolak') ? 403 : 400;
        return sendJson(res, status, { error: err.message });
      }
    }

    // 7. GET /api/revisi/preview-subbag (Estimasi Semula - Menjadi untuk Form Pengajuan)
    if (pathname === '/api/revisi/preview-subbag' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      let subbag = (query.subbag || (user ? user.pic_subbag : 'TEKNIS') || 'TEKNIS').toUpperCase();
      if (subbag === 'SEMUA') subbag = 'TEKNIS';

      const activePeriode = getActivePeriode();
      const dataset = getCachedRkbDataset(activePeriode ? activePeriode.id : 1);
      const filtered = filterAndPruneRkbDataset(dataset, { pic: subbag });

      const belanjaItems = (filtered.rows || []).filter(r => r.jenis_baris === 'ITEM');
      const totalAnggaran = filtered.summary?.grandTotal || belanjaItems.reduce((acc, it) => acc + (Number(it.jumlah) || 0), 0);
      const countKegiatan = (filtered.rows || []).filter(r => r.jenis_baris === 'HEADER' && r.level_indent === 1).length;
      const countItem = belanjaItems.length;

      return sendJson(res, 200, {
        subbag,
        periode_id: activePeriode ? activePeriode.id : 1,
        nama_periode: activePeriode ? activePeriode.nama_periode : 'RKB Aktif',
        total_anggaran: totalAnggaran,
        total_kegiatan: countKegiatan,
        total_item: countItem,
        items_sample: belanjaItems.slice(0, 15).map(it => ({
          kode: it.kode,
          uraian: it.uraian,
          volume: it.vol_total,
          satuan: it.satuan_vol,
          harga: it.harga_satuan,
          total: it.jumlah
        }))
      });
    }

    // GET /api/rkb/:id/matriks-semula-menjadi
    const matriksMatch = pathname.match(/^\/api\/rkb\/(\d+)\/matriks-semula-menjadi$/);
    if (matriksMatch && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const periodeId = Number(matriksMatch[1]);
      const comparison = getRevisionComparison(periodeId);
      let details = comparison.log_detail || [];

      // Filter subbag jika user adalah operator dengan pic tertentu
      let filterPic = query.subbag || '';
      if (user && user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
        filterPic = user.pic_subbag;
      }

      if (filterPic && filterPic !== 'SEMUA') {
        details = details.filter(d => (d.pic_bagian || '').toUpperCase() === filterPic.toUpperCase());
      }

      const mappedRows = details.map((d, index) => ({
        id: d.row_id || `diff-${index}`,
        kode_tahapan: d.kode || d.kode_akun || '-',
        uraian: d.uraian || '-',
        pic_bagian: d.pic_bagian || 'SEMUA',
        total_semula: d.semula_jumlah || 0,
        total_menjadi: d.menjadi_jumlah || 0,
        selisih: d.diff || 0,
        status_perubahan: d.status || 'BERUBAH',
        vol_semula: d.semula_vol || 0,
        satuan_semula: d.semula_satuan || '',
        harga_semula: d.semula_harga || 0,
        vol_menjadi: d.menjadi_vol || 0,
        satuan_menjadi: d.menjadi_satuan || '',
        harga_menjadi: d.menjadi_harga || 0
      }));

      return sendJson(res, 200, {
        has_parent: comparison.has_parent,
        parent_periode: comparison.parent_periode,
        filter_subbag: filterPic || 'SEMUA',
        summary: comparison.summary,
        rows: mappedRows,
        details: mappedRows
      });
    }

    // 11. SIMPAN / UPDATE BARIS RKB
    const saveRowMatch = pathname.match(/^\/api\/rkb\/(\d+)\/row$/);
    if (saveRowMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      const periodeId = Number(saveRowMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });

      const row = await parseJsonBody(req);
      row.periode_id = periodeId;

      if (row.id) {
        const storedRow = getRabRowById(Number(row.id));
        if (!storedRow || storedRow.periode_id !== periodeId) {
          return sendJson(res, 404, { error: 'Baris RKB tidak ditemukan pada periode ini.' });
        }
        if (!canEditRow(user, storedRow, periode.is_locked)) {
          if (periode.is_locked) {
            return sendJson(res, 403, { error: 'Dokumen RKB ini berstatus TERKUNCI (NPHD Sah). Perubahan hanya dapat dilakukan melalui menu "Buat Usulan Revisi" di Pusat Siklus.' });
          }
          return sendJson(res, 403, { error: `Akses ditolak. Anda login sebagai PIC ${user.pic_subbag}, tidak berwenang mengedit baris PIC ${storedRow.pic_bagian || '-'}.` });
        }
        // Operator tidak boleh memindahkan PIC baris
        if (user.level > 1 && row.pic_bagian && row.pic_bagian !== user.pic_subbag) {
          return sendJson(res, 403, { error: 'Akses ditolak. Operator tidak berwenang memindahkan PIC ke subbagian lain.' });
        }
      } else {
        if (periode.is_locked) {
          return sendJson(res, 403, { error: 'Dokumen RKB ini berstatus TERKUNCI (NPHD Sah).' });
        }
        if (user.level > 1) {
          row.pic_bagian = user.pic_subbag;
        }
      }

      try {
        const saved = saveRabRow(row, user);
        clearRkbDatasetCache();
        return sendJson(res, 200, { success: true, row: saved });
      } catch (err) {
        const status = err.message.includes('Akses ditolak') || err.message.includes('terkunci') ? 403 : 400;
        return sendJson(res, status, { error: err.message });
      }
    }

    // 11b. GESER URUTAN BARIS (REORDERING: UP / DOWN)
    const reorderMatch = pathname.match(/^\/api\/rkb\/(\d+)\/reorder$/);
    if (reorderMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      const periodeId = Number(reorderMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });
      if (periode.is_locked && user.level > 0) {
        return sendJson(res, 403, { error: 'Dokumen RKB berstatus TERKUNCI.' });
      }

      const body = await parseJsonBody(req);
      const { row_id, direction } = body;
      const storedRow = getRabRowById(Number(row_id));
      if (!storedRow || storedRow.periode_id !== periodeId) {
        return sendJson(res, 404, { error: 'Baris RKB tidak ditemukan pada periode ini.' });
      }
      if (!canEditRow(user, storedRow, periode.is_locked)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Anda tidak berwenang menggeser urutan baris ini.' });
      }

      try {
        const result = reorderRow(periodeId, row_id, direction, user);
        clearRkbDatasetCache();
        if (!result) {
          return sendJson(res, 400, { error: 'Baris sudah berada di batas awal atau akhir grup induknya.' });
        }
        return sendJson(res, 200, { ok: true, success: true });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 12. HAPUS BARIS RKB
    const delRowMatch = pathname.match(/^\/api\/rkb\/row\/(\d+)$/);
    if (delRowMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });

      const rowId = Number(delRowMatch[1]);
      const row = getRabRowById(rowId);
      if (!row) return sendJson(res, 404, { error: 'Baris RKB tidak ditemukan.' });

      const periode = getPeriodeById(row.periode_id);
      if (!canEditRow(user, row, periode ? periode.is_locked : 0)) {
        if (periode && periode.is_locked) {
          return sendJson(res, 403, { error: 'Dokumen RKB ini berstatus TERKUNCI (NPHD Sah).' });
        }
        return sendJson(res, 403, { error: 'Akses ditolak untuk menghapus baris ini.' });
      }

      try {
        const result = deleteRabRow(rowId, user);
        clearRkbDatasetCache(row.periode_id);
        return sendJson(res, 200, {
          success: true,
          count: result.count,
          deletedCount: result.count,
          deletedIds: result.deletedIds
        });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 13. MASTER DATA LENGKAP (SSOT)
    if (pathname === '/api/masters' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const masters = getMasters();
      return sendJson(res, 200, masters);
    }

    // 13b. MASTER PASLON (BASIS DATA PRIMER PILKADA)
    if (pathname === '/api/master/paslon' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      return sendJson(res, 200, getPaslonList());
    }
    if (pathname === '/api/master/paslon' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data Paslon.' });
      }
      const body = await parseJsonBody(req);
      const list = savePaslon(body, user);
      return sendJson(res, 200, { success: true, list });
    }
    const delPaslonMatch = pathname.match(/^\/api\/master\/paslon\/(\d+)$/);
    if (delPaslonMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      deletePaslon(Number(delPaslonMatch[1]), user);
      return sendJson(res, 200, { success: true, list: getPaslonList() });
    }

    // 13b-jdih. MASTER REGULASI & DASAR HUKUM (JDIH PENYUSUNAN & PELAKSANAAN ANGGARAN - BAB 8.1)
    if (pathname === '/api/master/regulasi' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      return sendJson(res, 200, getRegulasiList());
    }
    if (pathname === '/api/master/regulasi' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Level 0 (Pengembang) dan Level 1 (Perencanaan) yang dapat mengelola katalog Regulasi JDIH.' });
      }
      try {
        const body = await parseJsonBody(req);
        const list = saveRegulasi(body, user);
        return sendJson(res, 200, { success: true, list, message: 'Produk hukum JDIH berhasil disimpan.' });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }
    const delRegMatch = pathname.match(/^\/api\/master\/regulasi\/(\d+)$/);
    if (delRegMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Level 0 dan Level 1 yang dapat menghapus produk hukum JDIH.' });
      }
      deleteRegulasi(Number(delRegMatch[1]), user);
      return sendJson(res, 200, { success: true, list: getRegulasiList() });
    }

    // 13b. MASTER KUANTITAS (SSOT)
    if (pathname === '/api/master/kuantitas' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      return sendJson(res, 200, getKuantitasList());
    }
    if (pathname === '/api/master/kuantitas' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Tim Perencanaan dan Pengembang yang dapat mengubah parameter SSOT.' });
      }
      try {
        const body = await parseJsonBody(req);
        const list = saveKuantitas(body, user);
        clearRkbDatasetCache();
        return sendJson(res, 200, { success: true, list, message: 'Parameter SSOT berhasil diperbarui!' });
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 13c. MASTER KECAMATAN (19 PPK)
    if (pathname === '/api/master/kecamatan' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      return sendJson(res, 200, getKecamatans());
    }
    if (pathname === '/api/master/kecamatan' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data Kecamatan.' });
      }
      const body = await parseJsonBody(req);
      const list = saveKecamatan(body, user);
      return sendJson(res, 200, { success: true, list });
    }
    const delKecMatch = pathname.match(/^\/api\/master\/kecamatan\/(\d+)$/);
    if (delKecMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      try {
        deleteKecamatan(Number(delKecMatch[1]), user);
        return sendJson(res, 200, { success: true, list: getKecamatans() });
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    }
    if (pathname === '/api/master/kecamatan/export' && (method === 'GET' || method === 'HEAD')) {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu untuk mengunduh data master.' });
      const buffer = await exportKecamatanToExcelBuffer();
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Master_Kecamatan_PPK_KPU_Ngawi.xlsx"',
        'Content-Length': buffer.length
      });
      if (method === 'HEAD') return res.end();
      return res.end(buffer);
    }
    if (pathname === '/api/master/kecamatan/import' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data Kecamatan.' });
      }
      const body = await parseJsonBody(req);
      if (!body.file_base64) {
        return sendJson(res, 400, { error: 'Berkas Excel wajib diunggah (base64).' });
      }
      const isPreview = Boolean(body.preview || query.preview === 'true');
      const buf = Buffer.from(body.file_base64, 'base64');
      const items = parseKecamatanExcelBuffer(buf);
      if (items.errors && items.errors.length > 0) {
        return sendJson(res, 400, {
          error: `Terdapat ${items.errors.length} baris bermasalah pada berkas: ${items.errors[0].error}`,
          errors: items.errors
        });
      }
      if (!items || items.length === 0) {
        return sendJson(res, 400, { error: 'Tidak ada baris data Kecamatan/PPK yang valid ditemukan dalam berkas Excel.' });
      }
      const result = bulkUpsertKecamatan(items, { preview: isPreview, user });
      if (isPreview) {
        return sendJson(res, 200, result);
      }
      clearRkbDatasetCache();
      return sendJson(res, 200, {
        success: true,
        processed: result.processed,
        inserted: result.inserted,
        updated: result.updated,
        list: getKecamatans(),
        message: `Berhasil mengupdate masal ${result.processed} data Kecamatan/PPK (${result.inserted} baru, ${result.updated} diperbarui).`
      });
    }

    // 13d. MASTER DESA / KELURAHAN (217 PPS, TPS, PEMILIH, PANTARLIH)
    if (pathname === '/api/master/desa' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      const kecId = query.kecamatan_id ? Number(query.kecamatan_id) : null;
      return sendJson(res, 200, getDesas(kecId));
    }
    if (pathname === '/api/master/desa' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data Desa.' });
      }
      const body = await parseJsonBody(req);
      const list = saveDesa(body, user);
      return sendJson(res, 200, { success: true, list });
    }
    const delDesaMatch = pathname.match(/^\/api\/master\/desa\/(\d+)$/);
    if (delDesaMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      deleteDesa(Number(delDesaMatch[1]), user);
      return sendJson(res, 200, { success: true, list: getDesas() });
    }
    if (pathname === '/api/master/desa/export' && (method === 'GET' || method === 'HEAD')) {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu untuk mengunduh data master.' });
      const buffer = await exportDesaToExcelBuffer();
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Master_Desa_TPS_KPU_Ngawi.xlsx"',
        'Content-Length': buffer.length
      });
      if (method === 'HEAD') return res.end();
      return res.end(buffer);
    }
    if (pathname === '/api/master/desa/import' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data Desa.' });
      }
      const body = await parseJsonBody(req);
      if (!body.file_base64) {
        return sendJson(res, 400, { error: 'Berkas Excel wajib diunggah (base64).' });
      }
      const isPreview = Boolean(body.preview || query.preview === 'true');
      const buf = Buffer.from(body.file_base64, 'base64');
      const items = parseDesaExcelBuffer(buf);
      if (items.errors && items.errors.length > 0) {
        return sendJson(res, 400, {
          error: `Terdapat ${items.errors.length} baris bermasalah pada berkas: ${items.errors[0].error}`,
          errors: items.errors
        });
      }
      if (!items || items.length === 0) {
        return sendJson(res, 400, { error: 'Tidak ada baris data Desa/TPS yang valid ditemukan dalam berkas Excel.' });
      }
      const result = bulkUpsertDesa(items, { preview: isPreview, user });
      if (isPreview) {
        return sendJson(res, 200, result);
      }
      clearRkbDatasetCache();
      return sendJson(res, 200, {
        success: true,
        processed: result.processed,
        inserted: result.inserted,
        updated: result.updated,
        list: getDesas(),
        message: `Berhasil mengupdate masal ${result.processed} data Desa/TPS (${result.inserted} baru, ${result.updated} diperbarui).`
      });
    }

    // 13e. MASTER STANDAR BIAYA MASUKAN (SBM)
    if (pathname === '/api/master/sbm' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      return sendJson(res, 200, getSbmList());
    }
    if (pathname === '/api/master/sbm' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data SBM.' });
      }
      const body = await parseJsonBody(req);
      const saved = saveSbm(body, user);
      clearRkbDatasetCache();
      return sendJson(res, 200, { success: true, item: saved, list: getSbmList() });
    }
    const delSbmMatch = pathname.match(/^\/api\/master\/sbm\/(\d+)$/);
    if (delSbmMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      deleteSbm(Number(delSbmMatch[1]), user);
      clearRkbDatasetCache();
      return sendJson(res, 200, { success: true, list: getSbmList() });
    }
    if (pathname === '/api/master/sbm/export' && (method === 'GET' || method === 'HEAD')) {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu untuk mengunduh data master.' });
      const buffer = await exportSbmToExcelBuffer();
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Master_SBM_KPU_Ngawi.xlsx"',
        'Content-Length': buffer.length
      });
      if (method === 'HEAD') return res.end();
      return res.end(buffer);
    }
    if (pathname === '/api/master/sbm/import' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      const body = await parseJsonBody(req);
      if (!body.file_base64) {
        return sendJson(res, 400, { error: 'Berkas Excel wajib diunggah (base64).' });
      }
      const isPreview = Boolean(body.preview || query.preview === 'true');
      const buf = Buffer.from(body.file_base64, 'base64');
      const items = parseSbmExcelBuffer(buf);
      if (items.errors && items.errors.length > 0) {
        return sendJson(res, 400, {
          error: `Terdapat ${items.errors.length} baris bermasalah pada berkas: ${items.errors[0].error}`,
          errors: items.errors
        });
      }
      if (!items || items.length === 0) {
        return sendJson(res, 400, { error: 'Tidak ada baris data SBM yang valid ditemukan dalam berkas Excel.' });
      }
      const result = bulkUpsertSbm(items, { preview: isPreview, user });
      if (isPreview) {
        return sendJson(res, 200, result);
      }
      clearRkbDatasetCache();
      return sendJson(res, 200, {
        success: true,
        processed: result.processed,
        inserted: result.inserted,
        updated: result.updated,
        list: getSbmList(),
        message: `Berhasil mengupdate masal ${result.processed} data SBM (${result.inserted} baru, ${result.updated} diperbarui).`
      });
    }

    // 13f. MASTER BAGAN AKUN STANDAR (BAS)
    if (pathname === '/api/master/akun' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      return sendJson(res, 200, getAkunList());
    }
    if (pathname === '/api/master/akun' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data BAS.' });
      }
      const body = await parseJsonBody(req);
      const saved = saveAkun(body, user);
      clearRkbDatasetCache();
      return sendJson(res, 200, { success: true, item: saved, list: getAkunList() });
    }
    const delAkunMatch = pathname.match(/^\/api\/master\/akun\/(\d+)$/);
    if (delAkunMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      deleteAkun(Number(delAkunMatch[1]), user);
      clearRkbDatasetCache();
      return sendJson(res, 200, { success: true, list: getAkunList() });
    }
    if (pathname === '/api/master/akun/export' && (method === 'GET' || method === 'HEAD')) {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu untuk mengunduh data master.' });
      const buffer = await exportBasToExcelBuffer();
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Master_BAS_KPU_Ngawi.xlsx"',
        'Content-Length': buffer.length
      });
      if (method === 'HEAD') return res.end();
      return res.end(buffer);
    }
    if (pathname === '/api/master/akun/import' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      const body = await parseJsonBody(req);
      if (!body.file_base64) {
        return sendJson(res, 400, { error: 'Berkas Excel wajib diunggah (base64).' });
      }
      const isPreview = Boolean(body.preview || query.preview === 'true');
      const buf = Buffer.from(body.file_base64, 'base64');
      const items = parseBasExcelBuffer(buf);
      if (items.errors && items.errors.length > 0) {
        return sendJson(res, 400, {
          error: `Terdapat ${items.errors.length} baris bermasalah pada berkas: ${items.errors[0].error}`,
          errors: items.errors
        });
      }
      if (!items || items.length === 0) {
        return sendJson(res, 400, { error: 'Tidak ada baris data akun BAS yang valid ditemukan dalam berkas Excel.' });
      }
      const result = bulkUpsertAkun(items, { preview: isPreview, user });
      if (isPreview) {
        return sendJson(res, 200, result);
      }
      clearRkbDatasetCache();
      return sendJson(res, 200, {
        success: true,
        processed: result.processed,
        inserted: result.inserted,
        updated: result.updated,
        list: getAkunList(),
        message: `Berhasil mengupdate masal ${result.processed} akun BAS (${result.inserted} baru, ${result.updated} diperbarui).`
      });
    }

    // 13e. SISTEM ANTREAN UNDUHAN / MONITORING REPORT (SAKTI KEMENKEU STYLE)
    if (pathname === '/api/download-requests' && method === 'GET') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) {
        // Jika belum login / sesi tidak valid, kembalikan daftar bersih (kosong)
        return sendJson(res, 200, []);
      }

      // Filter per-user: hanya user yang mendownload yang bisa melihat riwayatnya
      const requests = getDownloadRequests({
        search: query.search || '',
        tanggal_mulai: query.tanggal_mulai || '',
        tanggal_selesai: query.tanggal_selesai || '',
        username: currentUser.username
      });
      return sendJson(res, 200, requests);
    }
    if (pathname === '/api/download-requests' && method === 'POST') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Silakan login terlebih dahulu untuk mengajukan antrean unduh berkas.' });
      }

      const body = await parseJsonBody(req);
      if (!body.nama_file) {
        return sendJson(res, 400, { error: 'Nama file unduhan wajib disertakan.' });
      }
      if (currentUser.level === 2 && body.tipe_unduhan === 'ZIP_SUBBAGIAN') {
        return sendJson(res, 403, { error: 'Akses ditolak. Paket ZIP 5 Subbagian hanya dapat diunduh oleh Tim Perencanaan, Komisioner, atau Pengembang.' });
      }
      if (currentUser.level === 2 && currentUser.pic_subbag && currentUser.pic_subbag !== 'SEMUA') {
        body.filter_pic = currentUser.pic_subbag;
      }
      body.user_id = currentUser.id;
      body.username = currentUser.username;
      body.user = currentUser;

      const job = createDownloadRequest(body);
      // Jalankan worker secara asinkron di latar belakang
      setImmediate(() => processDownloadJob(job.id));
      return sendJson(res, 201, { success: true, request: job });
    }
    const dlFileMatch = pathname.match(/^\/api\/download-requests\/(\d+)\/file$/);
    if (dlFileMatch && (method === 'GET' || method === 'HEAD')) {
      const currentUser = getUserFromReq(req);
      if (!currentUser) {
        return sendJson(res, 401, { error: 'Silakan login terlebih dahulu untuk mengunduh berkas.' });
      }

      const reqId = Number(dlFileMatch[1]);
      const job = getDownloadRequestById(reqId);
      if (!job) return sendJson(res, 404, { error: 'Antrean unduhan tidak ditemukan.' });

      // Verifikasi hak unduh: pengguna hanya boleh mengunduh berkas buatannya sendiri (isolasi total per-user)
      if (job.username !== currentUser.username) {
        return sendJson(res, 403, { error: 'Akses ditolak. Anda hanya berhak mengunduh berkas permintaan Anda sendiri.' });
      }

      if (job.status === 'KADALUARSA' || (job.expires_at && new Date(job.expires_at) < new Date())) {
        cleanupExpiredDownloads();
        return sendJson(res, 410, { error: 'Berkas unduhan telah kedaluwarsa (> 1 jam). Riwayat unduhan tetap tercatat untuk audit.' });
      }

      if (job.status !== 'SELESAI' || !job.file_path || !fs.existsSync(job.file_path)) {
        return sendJson(res, 400, { error: 'Berkas unduhan sedang diproses atau gagal dibuat.' });
      }

      updateDownloadRequest(job.id, { downloaded_at: new Date().toISOString() });

      const stat = fs.statSync(job.file_path);
      const isZip = job.tipe_unduhan === 'ZIP_SUBBAGIAN' || job.nama_file.endsWith('.zip');
      const contentType = isZip ? 'application/zip' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${job.nama_file}"`,
        'Content-Length': stat.size
      });

      if (method === 'HEAD') return res.end();
      return fs.createReadStream(job.file_path).pipe(res);
    }

    // 14. SETTINGS SATKER
    if (pathname === '/api/settings' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah pengaturan.' });
      }
      const body = await parseJsonBody(req);
      const updated = updateSettings(body, user);
      return sendJson(res, 200, { success: true, message: 'Pengaturan Satker berhasil disimpan.', settings: updated });
    }

    // 15. DOWNLOAD / EXPORT EXCEL
    const exportMatch = pathname.match(/^\/api\/export-excel\/(\d+)$/);
    if (exportMatch && (method === 'GET' || method === 'HEAD')) {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu untuk mengunduh laporan.' });

      const periodeId = Number(exportMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen tidak ditemukan.' });

      // Enforce Level 2 operator subbag boundaries (backend protection)
      if (user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
        query.pic = user.pic_subbag;
      }

      const buffer = await exportRkbToExcelBuffer(periodeId, query);
      const filterSuffix = (query.pic && query.pic !== 'SEMUA' ? `_${query.pic}` : '') + (query.sasaran && query.sasaran !== 'ALL' ? `_${query.sasaran}` : '');
      const filename = `RUH_Belanja_${(periode.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}${filterSuffix}_${Date.now()}.xlsx`;

      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length
      });
      if (method === 'HEAD') return res.end();
      return res.end(buffer);
    }

    // 15b. DOWNLOAD / EXPORT ZIP BUNDLE 5 SUBBAGIAN TERPECAH (1-KLIK SEMUA KASUBAG)
    const exportZipMatch = pathname.match(/^\/api\/export-excel-zip\/(\d+)$/);
    if (exportZipMatch && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu untuk mengunduh laporan.' });

      // Tolak Operator Level 2 agar tidak mengekspor paket ZIP seluruh subbagian
      if (user.level === 2) {
        return sendJson(res, 403, { error: 'Akses ditolak. Paket ZIP 5 Subbagian hanya dapat diunduh oleh Tim Perencanaan, Komisioner, atau Pengembang.' });
      }

      const periodeId = Number(exportZipMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen tidak ditemukan.' });

      const subbags = [
        { code: 'KUL', filename: `1_RUH_KUL_Keuangan_Umum_Logistik_${(periode.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx` },
        { code: 'RENDATIN', filename: `2_RUH_RENDATIN_Perencanaan_Data_Informasi_${(periode.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx` },
        { code: 'TEKNIS', filename: `3_RUH_TEKNIS_Teknis_Penyelenggaraan_Pemilu_${(periode.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx` },
        { code: 'HUKUM', filename: `4_RUH_HUKUM_Hukum_${(periode.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx` },
        { code: 'PARSDM', filename: `5_RUH_PARSDM_Partisipasi_Masyarakat_SDM_${(periode.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}.xlsx` }
      ];

      // Generate buffers terlebih dahulu agar jika terjadi error tidak merusak response stream
      const buffers = [];
      for (const s of subbags) {
        const buf = await exportRkbToExcelBuffer(periodeId, { pic: s.code });
        buffers.push({ name: s.filename, data: buf });
      }

      const archiver = require('archiver');
      const filename = `Paket_RUH_5_Subbagian_${(periode.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.zip`;

      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      });

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.on('error', err => {
        console.error('Archive error:', err);
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
      archive.pipe(res);

      for (const b of buffers) {
        archive.append(b.data, { name: b.name });
      }

      await archive.finalize();
      return;
    }

    // ========================================================================
    // STATIC ASSETS (FRONTEND)
    // ========================================================================
    return serveStatic(req, res, pathname);

  } catch (err) {
    console.error('Server error:', err);
    if (!res.headersSent) {
      return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
    } else {
      res.end();
    }
  }
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`  SI-PRABU Clean Web Edition v3.0 (KPU Kabupaten Ngawi)`);
  console.log(`  Server aktif di port: ${PORT}`);
  console.log(`  URL Lokal: http://localhost:${PORT}`);
  console.log(`  Pengembang Resmi: emenje`);
  console.log(`================================================================`);
});
