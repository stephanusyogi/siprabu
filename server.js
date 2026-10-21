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
  getMasters,
  updateSettings
} = require('./src/db');

const { calculateRkbDataset, getCachedRkbDataset, getRevisionComparison, getRevisionSummary } = require('./src/calculation');
const { createToken, verifyToken, getUserFromReq, canEditRow, canManageLifecycle } = require('./src/auth');
const { exportRkbToExcelBuffer } = require('./src/excel_io');

const PORT = process.env.PORT || 3456;
const PUBLIC_DIR = path.resolve(__dirname, 'public');

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

    // 13. MASTER DATA
    if (pathname === '/api/masters' && method === 'GET') {
      const masters = getMasters();
      return sendJson(res, 200, masters);
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

    // ========================================================================
    // STATIC ASSETS (FRONTEND)
    // ========================================================================
    return serveStatic(req, res, pathname);

  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
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
