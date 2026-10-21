/**
 * SI-PRABU Clean Web Edition v3.0
 * Server Utama Node.js (Siap untuk Hostinger Cloud / hPanel & Local Development)
 * Pengembang Resmi: emenje
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

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
  reorderRow,
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
  getPaslonList,
  savePaslon,
  deletePaslon,
  getKecamatans,
  saveKecamatan,
  deleteKecamatan,
  getDesas,
  saveDesa,
  deleteDesa,
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
  cleanupExpiredDownloads
} = require('./src/db');

const { calculateRkbDataset, getCachedRkbDataset, clearRkbDatasetCache, getRevisionComparison, getRevisionSummary } = require('./src/calculation');
const { createToken, verifyToken, getUserFromReq, canEditRow, canManageLifecycle } = require('./src/auth');
const { exportRkbToExcelBuffer, exportSbmToExcelBuffer, parseSbmExcelBuffer, exportBasToExcelBuffer, parseBasExcelBuffer } = require('./src/excel_io');

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

// Auto-cleanup unduhan kadaluarsa setiap 5 menit
setInterval(() => {
  try {
    const cleaned = cleanupExpiredDownloads();
    if (cleaned > 0) {
      console.log(`[DOWNLOAD CLEANUP] ${cleaned} berkas unduhan kadaluarsa (> 1 jam) telah dibersihkan.`);
    }
  } catch (e) {}
}, 5 * 60 * 1000);

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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  try {
    // ========================================================================
    // API ROUTES
    // ========================================================================

    // 1. AUTH / LOGIN
    if (pathname === '/api/login' && method === 'POST') {
      const { username, password } = await parseJsonBody(req);
      if (!username || !password) {
        return sendJson(res, 400, { error: 'Username dan password wajib diisi.' });
      }
      const user = authenticateUser(username, password);
      if (!user) {
        return sendJson(res, 401, { error: 'Username atau password salah.' });
      }
      const token = createToken(user);
      return sendJson(res, 200, {
        success: true,
        token,
        user
      });
    }

    // 1a. GOOGLE OAUTH: GET CONFIG
    if (pathname === '/api/auth/google/config' && method === 'GET') {
      const settings = getMasters().settings || {};
      const clientId = (settings.google_client_id || process.env.GOOGLE_CLIENT_ID || '').trim();
      const enabled = (settings.google_auth_enabled === '1' || Boolean(clientId));
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

        const settings = getMasters().settings || {};
        const allowedDomainsRaw = (settings.google_allowed_domains || '').trim();
        if (allowedDomainsRaw) {
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
            error: `Akun Google (${email}) belum terdaftar sebagai operator atau pejabat KPU. Silakan hubungi Administrator Satker.`
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

    // 1b. SWITCH USER CEPAT (UNTUK SIMULASI / PENGUJIAN WEWENANG)
    if (pathname === '/api/switch-user' && method === 'POST') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (currentUser.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Beralih peran bebas hanya diizinkan untuk Pengembang (Level 0) dan Tim Perencanaan (Level 1).' });
      }

      const { username } = await parseJsonBody(req);
      const targetUser = db.prepare('SELECT * FROM satker_users WHERE username = ? AND is_active = 1').get(username);
      if (!targetUser) return sendJson(res, 404, { error: 'Pengguna target tidak ditemukan atau dinonaktifkan.' });

      const token = createToken(targetUser);
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
          pic_subbag: targetUser.pic_subbag
        }
      });
    }

    // 1c. DEV UTILITY: GIT STATUS (HANYA AKTIF DI LOCALHOST PENGEMBANG)
    if (pathname === '/api/dev/git-status' && method === 'GET') {
      const host = req.headers.host || '';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      if (!isLocal) {
        return sendJson(res, 200, { is_local: false });
      }

      try {
        const { execSync } = require('node:child_process');
        const branch = execSync('git branch --show-current', { cwd: __dirname, encoding: 'utf8' }).trim();
        const statusRaw = execSync('git status --porcelain', { cwd: __dirname, encoding: 'utf8' }).trim();
        const modifiedFiles = statusRaw ? statusRaw.split('\n').map(s => s.trim()).filter(Boolean) : [];
        let lastCommit = '';
        try {
          lastCommit = execSync('git log -1 --pretty=format:"%h - %s (%cr)"', { cwd: __dirname, encoding: 'utf8' }).trim();
        } catch (e) {}

        let unpushedCount = 0;
        try {
          const unpushed = execSync('git log @{u}..HEAD --oneline', { cwd: __dirname, encoding: 'utf8' }).trim();
          if (unpushed) unpushedCount = unpushed.split('\n').filter(Boolean).length;
        } catch (e) {}

        return sendJson(res, 200, {
          is_local: true,
          branch,
          last_commit: lastCommit,
          modified_files: modifiedFiles,
          unpushed_count: unpushedCount,
          clean: modifiedFiles.length === 0 && unpushedCount === 0
        });
      } catch (err) {
        return sendJson(res, 500, { is_local: true, error: err.message });
      }
    }

    // 1d. DEV UTILITY: GIT COMMIT & PUSH TO GITHUB (HANYA AKTIF DI LOCALHOST PENGEMBANG)
    if (pathname === '/api/dev/git-push' && method === 'POST') {
      const host = req.headers.host || '';
      const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
      if (!isLocal) {
        return sendJson(res, 403, { error: 'Akses ditolak. Fitur Git Push ke GitHub hanya dapat dijalankan di lingkungan lokal pengembang (Localhost).' });
      }

      const body = await parseJsonBody(req).catch(() => ({}));
      const msg = (body.message || '').trim() || 'feat: update berkala RKB & sistem siprabu';

      try {
        const { execSync } = require('node:child_process');
        execSync('git add -A', { cwd: __dirname });
        const status = execSync('git status --porcelain', { cwd: __dirname, encoding: 'utf8' }).trim();
        let commitOutput = '';
        if (status) {
          commitOutput = execSync(`git commit --author="emenje <jihanandro@users.noreply.github.com>" -m ${JSON.stringify(msg)}`, { cwd: __dirname, encoding: 'utf8' });
        }

        const pushOutput = execSync('git push origin main', { cwd: __dirname, encoding: 'utf8' });
        const lastCommit = execSync('git log -1 --pretty=format:"%h - %s (%cr)"', { cwd: __dirname, encoding: 'utf8' }).trim();

        return sendJson(res, 200, {
          success: true,
          message: 'Kode berhasil di-push ke GitHub (Branch main)!',
          last_commit: lastCommit,
          pushOutput: pushOutput.trim() || 'Up-to-date'
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Gagal melakukan Git Push: ' + err.message });
      }
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
      return sendJson(res, 200, { users: getUsers() });
    }

    if (pathname === '/api/users' && method === 'POST') {
      const currentUser = getUserFromReq(req);
      if (!currentUser) return sendJson(res, 401, { error: 'Silakan login terlebih dahulu.' });
      if (currentUser.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Pengelolaan pengguna hanya diizinkan untuk Akun Developer dan Tim Perencanaan (Level 1).' });
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
      if (currentUser.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Penghapusan pengguna hanya diizinkan untuk Akun Developer dan Tim Perencanaan.' });
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
      if (currentUser.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }

      const targetId = Number(toggleUserMatch[1]);
      try {
        const result = toggleUserStatus(targetId);
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { error: err.message });
      }
    }

    // 4. DAFTAR PERIODE / SIKLUS
    if (pathname === '/api/periodes' && method === 'GET') {
      const periodes = getPeriodeList();
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
      if (!canManageLifecycle(user)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Kasubbag Perencanaan dan Pengembang yang dapat mengunci dokumen.' });
      }
      const id = Number(lockMatch[1]);
      const body = await parseJsonBody(req);
      const updated = lockPeriode(id, body);
      return sendJson(res, 200, { success: true, message: 'Dokumen berhasil dikunci (Mode Read-Only).', periode: updated });
    }

    // 7. BUKA KUNCI PERIODE (UNLOCK)
    const unlockMatch = pathname.match(/^\/api\/periodes\/(\d+)\/unlock$/);
    if (unlockMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!canManageLifecycle(user)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Kasubbag Perencanaan dan Pengembang yang dapat membuka kunci dokumen.' });
      }
      const id = Number(unlockMatch[1]);
      const updated = unlockPeriode(id);
      return sendJson(res, 200, { success: true, message: 'Kunci dokumen berhasil dibuka. Dokumen kini berstatus LEMBAR KERJA AKTIF.', periode: updated });
    }

    // 8. UPDATE LEGALITAS PERIODE (SK / BA TAPD)
    const legalMatch = pathname.match(/^\/api\/periodes\/(\d+)\/legalitas$/);
    if (legalMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (user && !canManageLifecycle(user)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan yang dapat mengubah legalitas pengesahan.' });
      }
      const id = Number(legalMatch[1]);
      const body = await parseJsonBody(req);
      const updated = updatePeriodeLegalitas(id, body);
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
      const periodeId = Number(rkbMatch[1]);
      const { pic, target_scope, search } = query;
      
      const periode = getPeriodeById(periodeId);
      if (!periode) {
        return sendJson(res, 404, { error: 'Dokumen RKB tidak ditemukan.' });
      }

      // 1. Ambil dataset & summary INDUK dokumen via in-memory cache super cepat
      const fullResult = getCachedRkbDataset(periodeId);
      const docSummary = fullResult.summary;

      // 2. Jika ada filter (pic, target_scope, search), ambil baris terfilter khusus lembar kerja workbench
      const hasFilter = Boolean((pic && pic !== 'SEMUA') || (target_scope && target_scope !== 'ALL') || (search && search.trim()));
      let rows, filteredSummary = null;

      if (hasFilter) {
        const filteredRawRows = getRabRows(periodeId, { pic, target_scope, search });
        const filteredResult = calculateRkbDataset(filteredRawRows);
        rows = filteredResult.rows;
        filteredSummary = filteredResult.summary;
      } else {
        rows = fullResult.rows;
        filteredSummary = docSummary;
      }

      const compareWith = query.compare_with ? Number(query.compare_with) : null;
      const revision_comparison = getRevisionComparison(periodeId, compareWith, fullResult);

      return sendJson(res, 200, {
        periode,
        summary: docSummary,
        filtered_summary: filteredSummary,
        rows,
        revision_comparison
      });
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

      const body = await parseJsonBody(req);
      const { row_id, pic_bagian, cascade } = body;
      const result = updateRabBarisPicWithCascade(periodeId, Number(row_id), pic_bagian, cascade !== false);
      return sendJson(res, 200, {
        ok: true,
        message: `PIC baris berhasil diperbarui (${result.count} baris terupdate).`,
        count: result.count,
        updatedIds: result.updatedIds,
        pic_bagian: result.pic_bagian
      });
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
      db.prepare('UPDATE rab_baris SET kode_akun = ? WHERE id = ? AND periode_id = ?').run(kode_akun, row_id, periodeId);
      return sendJson(res, 200, { ok: true, message: 'Kode Akun berhasil diperbarui.' });
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
      db.prepare('UPDATE rab_baris SET catatan_revisi_baris = ? WHERE id = ? AND periode_id = ?').run(catatan_revisi_baris || '', row_id, periodeId);
      return sendJson(res, 200, { ok: true, message: 'Catatan justifikasi revisi berhasil disimpan.' });
    }

    // 10c. RESUME SASARAN CEPAT (PENYELENGGARA VS PESERTA)
    const resumeSasaranMatch = pathname.match(/^\/api\/rkb\/(\d+)\/resume-sasaran$/);
    if (resumeSasaranMatch && method === 'GET') {
      const periodeId = Number(resumeSasaranMatch[1]);
      const rawRows = getRabRows(periodeId);
      const { summary } = calculateRkbDataset(rawRows);
      return sendJson(res, 200, { ok: true, resume: summary });
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

      // Cek izin hak akses (RBAC)
      if (!canEditRow(user, row, periode.is_locked)) {
        if (periode.is_locked) {
          return sendJson(res, 403, { error: 'Dokumen RKB ini berstatus TERKUNCI (NPHD Sah). Perubahan hanya dapat dilakukan melalui menu "Buat Usulan Revisi" di Pusat Siklus.' });
        }
        return sendJson(res, 403, { error: `Akses ditolak. Anda login sebagai PIC ${user.pic_subbag}, tidak berwenang mengedit baris PIC ${row.pic_bagian || '-'}.` });
      }

      const saved = saveRabRow(row);
      return sendJson(res, 200, { success: true, row: saved });
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
      try {
        const result = reorderRow(periodeId, row_id, direction);
        return sendJson(res, 200, result);
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

      deleteRabRow(rowId);
      return sendJson(res, 200, { success: true });
    }

    // 13. MASTER DATA LENGKAP (SSOT)
    if (pathname === '/api/masters' && method === 'GET') {
      const masters = getMasters();
      return sendJson(res, 200, masters);
    }

    // 13b. MASTER PASLON (BASIS DATA PRIMER PILKADA)
    if (pathname === '/api/master/paslon' && method === 'GET') {
      return sendJson(res, 200, getPaslonList());
    }
    if (pathname === '/api/master/paslon' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data Paslon.' });
      }
      const body = await parseJsonBody(req);
      const list = savePaslon(body);
      return sendJson(res, 200, { success: true, list });
    }
    const delPaslonMatch = pathname.match(/^\/api\/master\/paslon\/(\d+)$/);
    if (delPaslonMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      deletePaslon(Number(delPaslonMatch[1]));
      return sendJson(res, 200, { success: true, list: getPaslonList() });
    }

    // 13c. MASTER KECAMATAN (19 PPK)
    if (pathname === '/api/master/kecamatan' && method === 'GET') {
      return sendJson(res, 200, getKecamatans());
    }
    if (pathname === '/api/master/kecamatan' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data Kecamatan.' });
      }
      const body = await parseJsonBody(req);
      const list = saveKecamatan(body);
      return sendJson(res, 200, { success: true, list });
    }
    const delKecMatch = pathname.match(/^\/api\/master\/kecamatan\/(\d+)$/);
    if (delKecMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      try {
        deleteKecamatan(Number(delKecMatch[1]));
        return sendJson(res, 200, { success: true, list: getKecamatans() });
      } catch (e) {
        return sendJson(res, 400, { error: e.message });
      }
    }

    // 13d. MASTER DESA / KELURAHAN (217 PPS, TPS, PEMILIH, PANTARLIH)
    if (pathname === '/api/master/desa' && method === 'GET') {
      const kecId = query.kecamatan_id ? Number(query.kecamatan_id) : null;
      return sendJson(res, 200, getDesas(kecId));
    }
    if (pathname === '/api/master/desa' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data Desa.' });
      }
      const body = await parseJsonBody(req);
      const list = saveDesa(body);
      return sendJson(res, 200, { success: true, list });
    }
    const delDesaMatch = pathname.match(/^\/api\/master\/desa\/(\d+)$/);
    if (delDesaMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      deleteDesa(Number(delDesaMatch[1]));
      return sendJson(res, 200, { success: true, list: getDesas() });
    }

    // 13e. MASTER STANDAR BIAYA MASUKAN (SBM)
    if (pathname === '/api/master/sbm' && method === 'GET') {
      return sendJson(res, 200, getSbmList());
    }
    if (pathname === '/api/master/sbm' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data SBM.' });
      }
      const body = await parseJsonBody(req);
      const saved = saveSbm(body);
      clearRkbDatasetCache();
      return sendJson(res, 200, { success: true, item: saved, list: getSbmList() });
    }
    const delSbmMatch = pathname.match(/^\/api\/master\/sbm\/(\d+)$/);
    if (delSbmMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      deleteSbm(Number(delSbmMatch[1]));
      clearRkbDatasetCache();
      return sendJson(res, 200, { success: true, list: getSbmList() });
    }
    if (pathname === '/api/master/sbm/export' && (method === 'GET' || method === 'HEAD')) {
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
      const buf = Buffer.from(body.file_base64, 'base64');
      const items = parseSbmExcelBuffer(buf);
      if (!items || items.length === 0) {
        return sendJson(res, 400, { error: 'Tidak ada baris data SBM yang valid ditemukan dalam berkas Excel.' });
      }
      const result = bulkUpsertSbm(items);
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
      return sendJson(res, 200, getAkunList());
    }
    if (pathname === '/api/master/akun' && method === 'POST') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan dan Pengembang yang dapat mengubah data BAS.' });
      }
      const body = await parseJsonBody(req);
      const saved = saveAkun(body);
      clearRkbDatasetCache();
      return sendJson(res, 200, { success: true, item: saved, list: getAkunList() });
    }
    const delAkunMatch = pathname.match(/^\/api\/master\/akun\/(\d+)$/);
    if (delAkunMatch && method === 'DELETE') {
      const user = getUserFromReq(req);
      if (!user || user.level > 1) {
        return sendJson(res, 403, { error: 'Akses ditolak.' });
      }
      deleteAkun(Number(delAkunMatch[1]));
      clearRkbDatasetCache();
      return sendJson(res, 200, { success: true, list: getAkunList() });
    }
    if (pathname === '/api/master/akun/export' && (method === 'GET' || method === 'HEAD')) {
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
      const buf = Buffer.from(body.file_base64, 'base64');
      const items = parseBasExcelBuffer(buf);
      if (!items || items.length === 0) {
        return sendJson(res, 400, { error: 'Tidak ada baris data akun BAS yang valid ditemukan dalam berkas Excel.' });
      }
      const result = bulkUpsertAkun(items);
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
      const requests = getDownloadRequests({
        search: query.search || '',
        tanggal_mulai: query.tanggal_mulai || '',
        tanggal_selesai: query.tanggal_selesai || ''
      });
      return sendJson(res, 200, requests);
    }
    if (pathname === '/api/download-requests' && method === 'POST') {
      const body = await parseJsonBody(req);
      if (!body.nama_file) {
        return sendJson(res, 400, { error: 'Nama file unduhan wajib disertakan.' });
      }
      const job = createDownloadRequest(body);
      // Jalankan worker secara asinkron di latar belakang
      setImmediate(() => processDownloadJob(job.id));
      return sendJson(res, 201, { success: true, request: job });
    }
    const dlFileMatch = pathname.match(/^\/api\/download-requests\/(\d+)\/file$/);
    if (dlFileMatch && (method === 'GET' || method === 'HEAD')) {
      const reqId = Number(dlFileMatch[1]);
      const job = getDownloadRequestById(reqId);
      if (!job) return sendJson(res, 404, { error: 'Antrean unduhan tidak ditemukan.' });

      if (job.status === 'KADALUARSA') {
        return sendJson(res, 410, { error: 'Berkas unduhan telah kadaluarsa (> 1 jam) dan terhapus otomatis.' });
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
      const updated = updateSettings(body);
      return sendJson(res, 200, { success: true, settings: updated });
    }

    // 15. DOWNLOAD / EXPORT EXCEL
    const exportMatch = pathname.match(/^\/api\/export-excel\/(\d+)$/);
    if (exportMatch && (method === 'GET' || method === 'HEAD')) {
      const periodeId = Number(exportMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen tidak ditemukan.' });

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
