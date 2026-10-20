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
  getUsers,
  authenticateUser,
  getMasters,
  updateSettings
} = require('./src/db');

const { calculateRkbDataset } = require('./src/calculation');
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

  res.writeHead(200, { 'Content-Type': contentType });
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

    // 2. ME / PROFIL USER AKTIF
    if (pathname === '/api/me' && method === 'GET') {
      const user = getUserFromReq(req);
      if (!user) {
        return sendJson(res, 401, { error: 'Sesi login telah berakhir atau tidak valid.' });
      }
      return sendJson(res, 200, { user });
    }

    // 3. DAFTAR USERS (Untuk demo switch user / info peran)
    if (pathname === '/api/users' && method === 'GET') {
      return sendJson(res, 200, { users: getUsers() });
    }

    // 4. DAFTAR PERIODE / SIKLUS
    if (pathname === '/api/periodes' && method === 'GET') {
      const periodes = getPeriodeList();
      return sendJson(res, 200, { periodes });
    }

    // 5. PERIODE AKTIF
    if (pathname === '/api/periodes/active' && method === 'GET') {
      const active = getActivePeriode();
      return sendJson(res, 200, { periode: active });
    }

    // 6. KUNCI PERIODE (LOCK)
    const lockMatch = pathname.match(/^\/api\/periodes\/(\d+)\/lock$/);
    if (lockMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!canManageLifecycle(user)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Kasubbag Perencanaan dan Pengembang yang dapat mengunci NPHD.' });
      }
      const id = Number(lockMatch[1]);
      const updated = lockPeriode(id);
      return sendJson(res, 200, { success: true, periode: updated });
    }

    // 7. BUKA KUNCI PERIODE (UNLOCK)
    const unlockMatch = pathname.match(/^\/api\/periodes\/(\d+)\/unlock$/);
    if (unlockMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!canManageLifecycle(user)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Kasubbag Perencanaan dan Pengembang yang dapat membuka kunci.' });
      }
      const id = Number(unlockMatch[1]);
      const updated = unlockPeriode(id);
      return sendJson(res, 200, { success: true, periode: updated });
    }

    // 8. UPDATE LEGALITAS PERIODE (SK / BA TAPD)
    const legalMatch = pathname.match(/^\/api\/periodes\/(\d+)\/legalitas$/);
    if (legalMatch && method === 'POST') {
      const user = getUserFromReq(req);
      if (!canManageLifecycle(user)) {
        return sendJson(res, 403, { error: 'Akses ditolak. Hanya Perencanaan yang dapat mengubah legalitas pengesahan.' });
      }
      const id = Number(legalMatch[1]);
      const body = await parseJsonBody(req);
      const updated = updatePeriodeLegalitas(id, body);
      return sendJson(res, 200, { success: true, periode: updated });
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

      // Ambil seluruh baris untuk periode ini
      const rawRows = getRabRows(periodeId, { pic, target_scope, search });
      const { rows, summary } = calculateRkbDataset(rawRows);

      return sendJson(res, 200, {
        periode,
        summary,
        rows
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
    if (exportMatch && method === 'GET') {
      const periodeId = Number(exportMatch[1]);
      const periode = getPeriodeById(periodeId);
      if (!periode) return sendJson(res, 404, { error: 'Dokumen tidak ditemukan.' });

      const buffer = exportRkbToExcelBuffer(periodeId);
      const filename = `RKB_${(periode.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}.xlsx`;

      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length
      });
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
