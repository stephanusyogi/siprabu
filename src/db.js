/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Database SQLite Terpadu (DatabaseSync built-in Node.js v22+)
 * Pengembang: emenje
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
const { hashPassword, verifyPassword, sanitizeLogData } = require('./crypto_util');
const { parseIndonesianNumber } = require('./number_util');
const { validateUserCoherence, normalizePic } = require('./auth');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.SIPRABU_DB_PATH || path.join(DATA_DIR, 'hibah_kpu.sqlite');
const BACKUP_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite.bak');
const TEMPLATE_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite.template');

// Jika file database belum ada, pulihkan dari template atau backup
if (!fs.existsSync(DB_PATH)) {
  if (fs.existsSync(BACKUP_PATH)) {
    try { fs.copyFileSync(BACKUP_PATH, DB_PATH); } catch (e) {}
  } else if (fs.existsSync(TEMPLATE_PATH)) {
    try { fs.copyFileSync(TEMPLATE_PATH, DB_PATH); } catch (e) {}
  }
}

const db = new DatabaseSync(DB_PATH);
module.exports.db = db;

// Helper safe add column
function safeAddColumn(table, colDef) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef};`);
  } catch (e) {
    // Column already exists
  }
}

/**
 * Format waktu eksplisit zona waktu Asia/Jakarta (WIB)
 */
function getJakartaTimeString(d = new Date()) {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')} WIB`;
}

function formatWaktuSakti(d = new Date()) {
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value || '';
  return `${get('day')}-${get('month')}-${get('year')} ${get('hour')}:${get('minute')}`;
}

/**
 * Catat log audit ke tabel audit_log tanpa merekam password atau token
 */
function recordAuditLog({
  user = null,
  ip = '',
  action = '',
  entity = '',
  entity_id = '',
  old_values = null,
  new_values = null,
  status = 'SUCCESS',
  notes = ''
}) {
  try {
    const cleanOld = old_values ? JSON.stringify(sanitizeLogData(old_values)) : null;
    const cleanNew = new_values ? JSON.stringify(sanitizeLogData(new_values)) : null;
    const now = new Date();
    const waktuWib = getJakartaTimeString(now);
    const stmt = db.prepare(`
      INSERT INTO audit_log (
        waktu_wib, timestamp_ms, user_id, username, role_id, ip_address,
        action, entity, entity_id, old_values, new_values, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      waktuWib,
      now.getTime(),
      user?.id || null,
      user?.username || 'anonymous',
      user?.role_id || '-',
      ip || '',
      action,
      entity,
      String(entity_id || ''),
      cleanOld,
      cleanNew,
      status,
      notes || ''
    );
  } catch (err) {
    console.warn('[AUDIT] Gagal mencatat log audit:', err.message);
  }
}

function getAuditLogs({ limit = 100, offset = 0, action = '', entity = '', username = '' } = {}) {
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];
  if (action) {
    sql += ' AND action = ?';
    params.push(action);
  }
  if (entity) {
    sql += ' AND entity = ?';
    params.push(entity);
  }
  if (username) {
    sql += ' AND username = ?';
    params.push(username);
  }
  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit) || 100, Number(offset) || 0);
  return db.prepare(sql).all(...params);
}

// Inisialisasi DB & Migrasi Skema
function initDb() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  safeAddColumn('satker_users', 'token_version INTEGER DEFAULT 1');
  safeAddColumn('satker_users', 'email TEXT');
  safeAddColumn('satker_users', 'google_id TEXT');
  safeAddColumn('satker_users', 'avatar_url TEXT');
  safeAddColumn('periode_anggaran', 'pagu_nphd REAL DEFAULT 0');
  safeAddColumn('periode_anggaran', 'created_at TEXT DEFAULT CURRENT_TIMESTAMP');
  safeAddColumn('periode_anggaran', 'updated_at TEXT DEFAULT CURRENT_TIMESTAMP');
  safeAddColumn('download_requests', 'user_id INTEGER');
  safeAddColumn('download_requests', 'username TEXT');
  safeAddColumn('master_desa', 'pemilih INTEGER DEFAULT 0');
  safeAddColumn('master_desa', 'kotak INTEGER DEFAULT 0');
  safeAddColumn('master_kecamatan', 'kode TEXT DEFAULT ""');
  safeAddColumn('periode_anggaran', 'gdrive_link_pleno TEXT DEFAULT ""');
  safeAddColumn('periode_anggaran', 'catatan_pleno TEXT DEFAULT ""');

  // 1. Tabel Audit Log
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      waktu_wib TEXT NOT NULL,
      timestamp_ms INTEGER NOT NULL,
      user_id INTEGER,
      username TEXT,
      role_id TEXT,
      ip_address TEXT,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      entity_id TEXT,
      old_values TEXT,
      new_values TEXT,
      status TEXT DEFAULT 'SUCCESS',
      notes TEXT
    );
  `);

  // 2. Tabel Snapshot Periode (Arsip Terkunci Standar SAKTI)
  db.exec(`
    CREATE TABLE IF NOT EXISTS periode_snapshot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periode_id INTEGER UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      waktu_wib TEXT,
      is_migration_frozen INTEGER DEFAULT 0,
      notes TEXT,
      snapshot_data TEXT NOT NULL,
      FOREIGN KEY (periode_id) REFERENCES periode_anggaran(id) ON DELETE CASCADE
    );
  `);

  // 3. Tabel Download Requests
  db.exec(`
    CREATE TABLE IF NOT EXISTS download_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT UNIQUE,
      nama_file TEXT NOT NULL,
      tipe_unduhan TEXT NOT NULL,
      periode_id INTEGER,
      filter_pic TEXT,
      filter_sasaran TEXT,
      request_time TEXT,
      status TEXT DEFAULT 'DIPROSES',
      file_path TEXT,
      file_size INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      downloaded_at TEXT
    );
  `);

  // Reset pekerjaan download yang terputus saat startup server
  try {
    db.prepare("UPDATE download_requests SET status = 'GAGAL', error_message = 'Pekerjaan unduhan terputus akibat restart server.' WHERE status = 'DIPROSES'").run();
  } catch (e) {}

  // 4. Tabel Master Paslon
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_paslon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      no_urut INTEGER NOT NULL,
      nama_calon_bupati TEXT NOT NULL,
      nama_calon_wakil_bupati TEXT NOT NULL,
      partai_pengusung TEXT,
      slogan TEXT,
      keterangan TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Tabel Subbag Usulan Revisi
  db.exec(`
    CREATE TABLE IF NOT EXISTS subbag_usulan_revisi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      periode_id INTEGER NOT NULL,
      subbag TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      gdrive_link TEXT DEFAULT '',
      catatan_usulan TEXT DEFAULT '',
      alasan_pengembalian TEXT DEFAULT '',
      catatan_pleno TEXT DEFAULT '',
      total_semula REAL DEFAULT 0,
      total_menjadi REAL DEFAULT 0,
      submitted_at TEXT DEFAULT '',
      submitted_by TEXT DEFAULT '',
      validated_at TEXT DEFAULT '',
      validated_by TEXT DEFAULT '',
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(periode_id, subbag),
      FOREIGN KEY (periode_id) REFERENCES periode_anggaran(id) ON DELETE CASCADE
    );
  `);

  // 6. Tabel Siklus Pengajuan & Monitoring Revisi SAKTI (4 Tahap)
  db.exec(`
    CREATE TABLE IF NOT EXISTS revisi_pengajuan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kode_revisi TEXT UNIQUE,
      periode_id INTEGER NOT NULL,
      subbag TEXT NOT NULL,
      tahun_anggaran INTEGER DEFAULT 2026,
      kode_satker TEXT DEFAULT '657811',
      nama_satker TEXT DEFAULT 'KPU KABUPATEN NGAWI',
      nomor_surat TEXT NOT NULL,
      tanggal_surat TEXT NOT NULL,
      perihal TEXT NOT NULL,
      pejabat_pengusul TEXT NOT NULL,
      jabatan_pengusul TEXT DEFAULT '',
      nama_kpa TEXT DEFAULT 'Sekretaris KPU Kabupaten Ngawi',
      kewenangan TEXT DEFAULT 'KPU Kabupaten Ngawi',
      jenis_revisi TEXT DEFAULT 'Pergeseran Antar Rincian Output',
      keterangan_revisi TEXT DEFAULT '',
      dokumen_surat_link TEXT DEFAULT '',
      dokumen_matriks_link TEXT DEFAULT '',
      dokumen_dukung_lain TEXT DEFAULT '',
      validasi_sbm TEXT DEFAULT 'OK',
      total_semula REAL DEFAULT 0,
      total_menjadi REAL DEFAULT 0,
      selisih REAL DEFAULT 0,
      tahap_terkini INTEGER DEFAULT 1,
      status_tahap TEXT DEFAULT 'PROSES',
      tahap1_waktu TEXT DEFAULT '',
      tahap1_oleh TEXT DEFAULT '',
      tahap1_catatan TEXT DEFAULT '',
      tahap2_waktu TEXT DEFAULT '',
      tahap2_oleh TEXT DEFAULT '',
      tahap2_hasil TEXT DEFAULT '',
      tahap2_catatan TEXT DEFAULT '',
      tahap3_waktu TEXT DEFAULT '',
      tahap3_oleh TEXT DEFAULT '',
      tahap3_hasil TEXT DEFAULT '',
      tahap3_catatan TEXT DEFAULT '',
      tahap4_waktu TEXT DEFAULT '',
      tahap4_oleh TEXT DEFAULT '',
      nomor_penetapan TEXT DEFAULT '',
      tanggal_penetapan TEXT DEFAULT '',
      tahap4_catatan TEXT DEFAULT '',
      is_locked INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrasi kolom tambahan pada revisi_pengajuan
  safeAddColumn('revisi_pengajuan', "alasan_pengembalian TEXT DEFAULT ''");
  safeAddColumn('revisi_pengajuan', "l1_koreksi_catatan TEXT DEFAULT ''");
  safeAddColumn('revisi_pengajuan', "dokumen_matriks_original_link TEXT DEFAULT ''");
  safeAddColumn('revisi_pengajuan', "dokumen_surat_original_link TEXT DEFAULT ''");
  safeAddColumn('revisi_pengajuan', "siklus_ke INTEGER DEFAULT 1");

  // 6b. Tabel Log Riwayat Alur Siklus & Pengajuan Revisi
  db.exec(`
    CREATE TABLE IF NOT EXISTS revisi_pengajuan_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pengajuan_id INTEGER NOT NULL,
      periode_id INTEGER NOT NULL,
      subbag TEXT NOT NULL,
      tahap INTEGER NOT NULL,
      status TEXT NOT NULL,
      aksi TEXT NOT NULL,
      catatan TEXT DEFAULT '',
      alasan_pengembalian TEXT DEFAULT '',
      dokumen_surat_link TEXT DEFAULT '',
      dokumen_matriks_link TEXT DEFAULT '',
      total_semula REAL DEFAULT 0,
      total_menjadi REAL DEFAULT 0,
      selisih REAL DEFAULT 0,
      actor_id INTEGER,
      actor_username TEXT,
      actor_name TEXT,
      waktu_wib TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pengajuan_id) REFERENCES revisi_pengajuan(id) ON DELETE CASCADE
    );
  `);

  // Default settings untuk Google Sign-In jika belum ada
  try {
    const sIns = db.prepare('INSERT OR IGNORE INTO settings_satker (key, value) VALUES (?, ?)');
    sIns.run('google_client_id', process.env.GOOGLE_CLIENT_ID || '824065065347-t7vi42nu00u298v3vljo5i0hmcgb67vg.apps.googleusercontent.com');
    sIns.run('google_auth_enabled', '1');
    sIns.run('google_allowed_domains', 'gmail.com,kpungawi.com,kpu.go.id');
  } catch (e) {}

  // Migrasi password lama ke scrypt hash secara aman tanpa mereset akun
  migratePasswordsToScrypt();

  // Konfigurasi / Pemulihan Kata Sandi Admin via Environment Variable (P0 Mandate)
  try {
    const envAdminPass = (process.env.ADMIN_RESET_PASSWORD || process.env.ADMIN_PASSWORD || '').trim();
    if (envAdminPass) {
      const targetUser = (process.env.ADMIN_RESET_USER || 'perencanaan').trim();
      const existingUser = db.prepare('SELECT id, username FROM satker_users WHERE username = ?').get(targetUser);
      if (existingUser) {
        const hashed = hashPassword(envAdminPass);
        db.prepare('UPDATE satker_users SET password = ?, token_version = COALESCE(token_version, 1) + 1, is_active = 1 WHERE id = ?').run(hashed, existingUser.id);
        console.log(`[AUTH] Kata sandi akun "${targetUser}" berhasil dikonfigurasi melalui environment variable.`);
      }
    }
    const envDevPass = (process.env.DEV_PASSWORD || '').trim();
    if (envDevPass) {
      const devUser = db.prepare("SELECT id FROM satker_users WHERE username = 'emenje'").get();
      if (devUser) {
        const hashed = hashPassword(envDevPass);
        db.prepare('UPDATE satker_users SET password = ?, token_version = COALESCE(token_version, 1) + 1, is_active = 1 WHERE id = ?').run(hashed, devUser.id);
        console.log('[AUTH] Kata sandi akun pengembang "emenje" berhasil dikonfigurasi melalui environment variable.');
      }
    }
  } catch (e) {
    console.warn('[AUTH] Gagal menerapkan konfigurasi kata sandi environment:', e.message);
  }

  // Sinkronisasi status Google Sign-In via Environment Variable jika disediakan
  try {
    if (process.env.GOOGLE_AUTH_ENABLED !== undefined) {
      const isGoogleEn = (process.env.GOOGLE_AUTH_ENABLED === '1' || process.env.GOOGLE_AUTH_ENABLED === 'true') ? '1' : '0';
      db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES ('google_auth_enabled', ?)").run(isGoogleEn);
    }
    if (process.env.GOOGLE_CLIENT_ID) {
      db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES ('google_client_id', ?)").run(process.env.GOOGLE_CLIENT_ID.trim());
    }
  } catch (e) {}

  // Pastikan kotak di master_desa sinkron dengan tps jika masih 0
  try {
    db.prepare('UPDATE master_desa SET kotak = tps WHERE kotak IS NULL OR kotak = 0').run();
  } catch (e) {}

  // Selaraskan siklus RKB operasional (Hanya 2 RKB: Fondasi Sah dan Usulan 1 Draft Aktif)
  alignOperationalRkbCycles();

  // Buat snapshot beku untuk arsip lama yang belum memiliki snapshot
  freezeExistingLockedPeriods();
}

/**
 * Penyelarasan Siklus RKB Operasional (Mandat: Hanya 2 RKB: Fondasi Sah dan Usulan 1 Draft Aktif)
 * Dijalankan otomatis saat startup agar database produksi / remote selalu sinkron dengan aturan operasional.
 */
function alignOperationalRkbCycles() {
  try {
    // 1. Hapus draf/arsip prematur Revisi 2 (id = 1000004 atau nama memuat Revisi 2)
    const premature = db.prepare(`
      SELECT id FROM periode_anggaran
      WHERE id = 1000004 OR nama_periode LIKE '%Revisi 2%' OR versi_revisi = 'Revisi 2'
    `).all();
    for (const p of premature) {
      db.prepare('DELETE FROM rab_baris WHERE periode_id = ?').run(p.id);
      db.prepare('DELETE FROM subbag_usulan_revisi WHERE periode_id = ?').run(p.id);
      db.prepare('DELETE FROM periode_snapshot WHERE periode_id = ?').run(p.id);
      db.prepare('DELETE FROM revisi_pengajuan WHERE periode_id = ?').run(p.id);
      db.prepare('DELETE FROM periode_anggaran WHERE id = ?').run(p.id);
      console.log(`[STARTUP MIGRATION] Menghapus siklus prematur periode_id=${p.id}`);
    }

    // 2. Pastikan Usulan 1 (Periode 1000003) berstatus DRAFT AKTIF (is_locked = 0)
    const p3 = db.prepare('SELECT id, is_locked FROM periode_anggaran WHERE id = 1000003').get();
    if (p3) {
      if (p3.is_locked === 1) {
        db.prepare(`
          UPDATE periode_anggaran
          SET is_locked = 0, locked_at = '', nomor_ba_tapd = '', tanggal_ba_tapd = '',
              dasar_pengesahan = 'Kertas Kerja Penyusunan'
          WHERE id = 1000003
        `).run();
        console.log('[STARTUP MIGRATION] Membuka kunci Periode 1000003 menjadi DRAFT AKTIF');
      }
      // Hapus snapshot untuk 1000003 jika ada agar perhitungannya dinamis
      db.prepare('DELETE FROM periode_snapshot WHERE periode_id = 1000003').run();
    }

    // 2b. Bersihkan riwayat revisi dummy/sampel awal agar tabel Monitoring Siklus Proses Revisi bersih (0 riwayat dummy)
    db.prepare(`
      DELETE FROM revisi_pengajuan
      WHERE kode_revisi IN ('2026.657811.001', '2026.657811.002')
         OR nomor_surat IN ('01/KU.01.1-SD/3521/2024', '05/PP.01.2-SD/3521/2026')
    `).run();
    db.prepare('DELETE FROM revisi_pengajuan_log WHERE pengajuan_id NOT IN (SELECT id FROM revisi_pengajuan)').run();
    db.prepare(`
      DELETE FROM subbag_usulan_revisi
      WHERE gdrive_link LIKE '%test-subbag%' OR updated_at = '2026-10-21 20:27:35'
    `).run();

    // 3. Pastikan RKB Awal (Periode 1) berstatus Terkunci sebagai Fondasi Sah dengan Pagu Rp 49.999.999.000
    db.prepare(`
      UPDATE periode_anggaran
      SET is_locked = 1, pagu_nphd = 49999999000
      WHERE id = 1 AND (is_locked != 1 OR pagu_nphd != 49999999000 OR pagu_nphd IS NULL)
    `).run();

    // 4. Hubungkan variabel SSOT pada baris belanja draft aktif yang satuannya paslon
    const draftPeriods = db.prepare('SELECT id FROM periode_anggaran WHERE is_locked = 0').all();
    for (const dp of draftPeriods) {
      const paslonRows = db.prepare(`
        SELECT id, uraian, f1_unit, f1_var, f2_unit, f2_var, f3_unit, f3_var, f4_unit, f4_var
        FROM rab_baris
        WHERE periode_id = ? AND (
          LOWER(f1_unit) = 'paslon' OR LOWER(f2_unit) = 'paslon' OR LOWER(f3_unit) = 'paslon' OR LOWER(f4_unit) = 'paslon'
        )
      `).all(dp.id);

      for (const pr of paslonRows) {
        const uLower = String(pr.uraian || '').toLowerCase();
        let targetVar = 'paslon';
        if (uLower.includes('perseorangan')) targetVar = 'paslon_perseorangan';
        else if (uLower.includes('bakal')) targetVar = 'bakal_paslon';

        const updates = [];
        const params = [];
        for (let i = 1; i <= 4; i++) {
          if (String(pr[`f${i}_unit`] || '').toLowerCase() === 'paslon' && !pr[`f${i}_var`]) {
            updates.push(`f${i}_var = ?`);
            params.push(targetVar);
          }
        }
        if (updates.length > 0) {
          params.push(pr.id);
          db.prepare(`UPDATE rab_baris SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        }
      }

      // 5. Selaraskan baris anak di bawah PPK dan PPS agar selalu seragam mengikuti PIC PARSDM
      try {
        const ppkRow = db.prepare(`
          SELECT id, pic_bagian FROM rab_baris
          WHERE periode_id = ? AND kode = '1' AND uraian LIKE '%PPK%' AND (row_type = 'header' OR level_indent = 2)
        `).get(dp.id);
        if (ppkRow) {
          updateRabBarisPicWithCascade(dp.id, ppkRow.id, 'PARSDM', true);
        }
        const ppsRow = db.prepare(`
          SELECT id, pic_bagian FROM rab_baris
          WHERE periode_id = ? AND kode = '2' AND uraian = 'PPS' AND (row_type = 'header' OR level_indent = 2)
        `).get(dp.id);
        if (ppsRow) {
          updateRabBarisPicWithCascade(dp.id, ppsRow.id, 'PARSDM', true);
        }
      } catch (e) {
        console.warn('[MIGRATION] Gagal sinkronisasi baris turunan PPK/PPS:', e.message);
      }
    }
  } catch (err) {
    console.warn('[MIGRATION] Peringatan saat menyelaraskan siklus RKB:', err.message);
  }
}

/**
 * Migrasikan password teks lama ke scrypt hash
 */
function migratePasswordsToScrypt() {
  try {
    const users = db.prepare('SELECT id, username, password FROM satker_users').all();
    const upd = db.prepare('UPDATE satker_users SET password = ?, token_version = COALESCE(token_version, 1) WHERE id = ?');
    for (const u of users) {
      if (u.password && !u.password.startsWith('scrypt$')) {
        const hashed = hashPassword(u.password);
        upd.run(hashed, u.id);
      }
    }
  } catch (err) {
    console.warn('[MIGRATION] Gagal migrasi password ke scrypt:', err.message);
  }
}

/**
 * Bekukan snapshot untuk dokumen lama yang sudah berstatus terkunci
 */
function freezeExistingLockedPeriods() {
  try {
    const lockedPeriods = db.prepare('SELECT id, nama_periode FROM periode_anggaran WHERE is_locked = 1').all();
    const checkSnap = db.prepare('SELECT id FROM periode_snapshot WHERE periode_id = ?');
    for (const lp of lockedPeriods) {
      if (!checkSnap.get(lp.id)) {
        try {
          savePeriodeSnapshot(lp.id, null, true, 'Nilai dibekukan berdasarkan data saat migrasi. Angka perlu dicocokkan dengan dokumen pengesahan asli.');
          console.log(`[SNAPSHOT] Berhasil membekukan arsip migrasi untuk: ${lp.nama_periode} (ID: ${lp.id})`);
        } catch (e) {
          console.warn(`[SNAPSHOT] Gagal membekukan snapshot periode ${lp.id}:`, e.message);
        }
      }
    }
  } catch (err) {}
}

/**
 * Menyimpan snapshot arsip periode terkunci
 */
function savePeriodeSnapshot(periodeId, user = null, isMigrationFrozen = false, notes = '') {
  const periode = getPeriodeById(periodeId);
  if (!periode) return null;

  // Lazy require engine perhitungan agar terhindar dari siklus dependensi
  const { calculateRkbDataset, clearRkbDatasetCache } = require('./calculation');
  const rawRows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(periodeId);
  const calculated = calculateRkbDataset(rawRows, periode.pagu_nphd);

  // Ambil referensi master yang digunakan
  const masterVariabels = db.prepare('SELECT * FROM master_variabel ORDER BY id').all();
  const masterKuantitas = db.prepare('SELECT * FROM master_kuantitas ORDER BY id').all();
  const masterKecamatan = db.prepare('SELECT id, no_urut, nama, kode FROM master_kecamatan ORDER BY no_urut, id').all();
  const masterDesaSummary = db.prepare(`
    SELECT COUNT(*) as jmlDesa, 
           COALESCE(SUM(tps), 0) as sumTps, 
           COALESCE(SUM(kotak), 0) as sumKotak,
           COALESCE(SUM(pantarlih), 0) as sumPantarlih, 
           COALESCE(SUM(pemilih), 0) as sumPemilih 
    FROM master_desa
  `).get() || {};
  const masterPaslon = db.prepare('SELECT id, no_urut, nama_calon_bupati, nama_calon_wakil_bupati FROM master_paslon ORDER BY no_urut').all();

  const snapshotPayload = {
    periode_id: periode.id,
    nama_periode: periode.nama_periode,
    versi_revisi: periode.versi_revisi,
    revisi_ke: periode.revisi_ke,
    pagu_nphd: periode.pagu_nphd || 0,
    is_locked: 1,
    locked_at: periode.locked_at || new Date().toISOString(),
    legalitas: {
      dasar_pengesahan: periode.dasar_pengesahan,
      tahap_revisi: periode.tahap_revisi,
      nomor_ba_tapd: periode.nomor_ba_tapd,
      tanggal_ba_tapd: periode.tanggal_ba_tapd,
      nomor_surat_pengajuan_tapd: periode.nomor_surat_pengajuan_tapd,
      tanggal_surat_pengajuan_tapd: periode.tanggal_surat_pengajuan_tapd,
      nomor_surat_balasan_pemda: periode.nomor_surat_balasan_pemda,
      catatan_revisi: periode.catatan_revisi,
      gdrive_link_pleno: periode.gdrive_link_pleno,
      catatan_pleno: periode.catatan_pleno
    },
    master_references: {
      kecamatan_count: masterKecamatan.length,
      desa_count: masterDesaSummary.jmlDesa || 0,
      tps_count: masterDesaSummary.sumTps || 0,
      kotak_count: masterDesaSummary.sumKotak || 0,
      pantarlih_count: masterDesaSummary.sumPantarlih || 0,
      pemilih_count: masterDesaSummary.sumPemilih || 0,
      paslon_count: masterPaslon.length,
      variabel_list: masterVariabels,
      kuantitas_list: masterKuantitas,
      paslon_list: masterPaslon
    },
    rows: calculated.rows,
    summary: calculated.summary,
    meta: {
      created_at: new Date().toISOString(),
      created_by: user ? `${user.nama_pejabat} (${user.username})` : 'Sistem Arsip Otomatis',
      is_migration_frozen: Boolean(isMigrationFrozen),
      notice: isMigrationFrozen 
        ? 'Nilai dibekukan berdasarkan data saat migrasi. Angka perlu dicocokkan dengan dokumen pengesahan asli.' 
        : 'Dokumen resmi telah disahkan dan dikunci secara sah.',
      notes: notes || ''
    }
  };

  const waktuWib = getJakartaTimeString();
  const userName = user ? `${user.nama_pejabat} (${user.username})` : (isMigrationFrozen ? 'Sistem Migrasi' : 'Administrator');
  const jsonStr = JSON.stringify(snapshotPayload);

  db.prepare(`
    INSERT INTO periode_snapshot (periode_id, created_at, created_by, waktu_wib, is_migration_frozen, notes, snapshot_data)
    VALUES (?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?)
    ON CONFLICT(periode_id) DO UPDATE SET
      created_at = CURRENT_TIMESTAMP,
      created_by = excluded.created_by,
      waktu_wib = excluded.waktu_wib,
      is_migration_frozen = excluded.is_migration_frozen,
      notes = excluded.notes,
      snapshot_data = excluded.snapshot_data
  `).run(
    periodeId,
    userName,
    waktuWib,
    isMigrationFrozen ? 1 : 0,
    notes || '',
    jsonStr
  );

  clearRkbDatasetCache(periodeId);
  return snapshotPayload;
}

function getPeriodeSnapshot(periodeId) {
  const row = db.prepare('SELECT * FROM periode_snapshot WHERE periode_id = ?').get(Number(periodeId));
  if (!row) return null;
  try {
    return JSON.parse(row.snapshot_data);
  } catch (e) {
    return null;
  }
}

initDb();

// ============================================================================
// PERIODE / SIKLUS ANGGARAN
// ============================================================================

function getPeriodeList() {
  const periodes = db.prepare(`
    SELECT p.*,
      COALESCE((SELECT COUNT(*) FROM rab_baris WHERE periode_id = p.id AND row_type != 'header'), 0) as total_items,
      COALESCE((SELECT COUNT(*) FROM rab_baris WHERE periode_id = p.id), 0) as total_baris
    FROM periode_anggaran p
    WHERE p.id != 1000004 AND p.nama_periode NOT LIKE '%Revisi 2%' AND p.versi_revisi != 'Revisi 2'
    ORDER BY p.id ASC
  `).all();
  return periodes;
}

function getPeriodeById(id) {
  const p = db.prepare('SELECT * FROM periode_anggaran WHERE id = ?').get(id);
  if (!p) return null;
  const countRow = db.prepare('SELECT COUNT(*) as cnt, COUNT(CASE WHEN row_type != \'header\' THEN 1 END) as items FROM rab_baris WHERE periode_id = ?').get(id);
  p.total_baris = countRow ? Number(countRow.cnt || 0) : 0;
  p.total_items = countRow ? Number(countRow.items || 0) : 0;
  return p;
}

function getActivePeriode() {
  // RKB Aktif adalah versi RKB yang BELUM dikunci (is_locked = 0)
  let p = db.prepare("SELECT * FROM periode_anggaran WHERE tipe_dokumen = 'RKB' AND is_locked = 0 AND id != 1000004 AND nama_periode NOT LIKE '%Revisi 2%' ORDER BY id DESC LIMIT 1").get();
  if (!p) {
    p = db.prepare("SELECT * FROM periode_anggaran WHERE tipe_dokumen = 'RKB' AND is_locked = 1 AND id != 1000004 AND nama_periode NOT LIKE '%Revisi 2%' ORDER BY revisi_ke DESC, id DESC LIMIT 1").get();
  }
  if (!p) {
    p = db.prepare("SELECT * FROM periode_anggaran WHERE id != 1000004 AND nama_periode NOT LIKE '%Revisi 2%' ORDER BY id DESC LIMIT 1").get();
  }
  if (p) {
    return getPeriodeById(p.id);
  }
  return null;
}

/**
 * Mengambil RKB sah terakhir (dasar anggaran yang sah)
 */
function getLatestRatifiedPeriode() {
  let p = db.prepare("SELECT * FROM periode_anggaran WHERE tipe_dokumen = 'RKB' AND is_locked = 1 ORDER BY revisi_ke DESC, id DESC LIMIT 1").get();
  if (!p) {
    p = db.prepare("SELECT * FROM periode_anggaran WHERE is_locked = 1 ORDER BY id DESC LIMIT 1").get();
  }
  if (!p) {
    p = db.prepare("SELECT * FROM periode_anggaran ORDER BY id ASC LIMIT 1").get();
  }
  return p ? getPeriodeById(p.id) : null;
}

/**
 * Mengambil siklus revisi berjalan yang masih aktif (belum disahkan / is_locked = 0)
 */
function getActiveRevisionCycle() {
  const p = db.prepare("SELECT * FROM periode_anggaran WHERE tipe_dokumen = 'RKB' AND is_locked = 0 ORDER BY revisi_ke ASC, id ASC LIMIT 1").get();
  return p ? getPeriodeById(p.id) : null;
}

/**
 * Mendapatkan siklus revisi aktif atau membukanya secara atomik jika belum ada
 */
function getOrCreateRevisionCycle(user = null) {
  let active = getActiveRevisionCycle();
  if (active) return active;

  const base = getLatestRatifiedPeriode();
  if (!base) throw new Error('Tidak ditemukan dokumen RKB dasar yang sah.');

  const nextRev = (base.revisi_ke || 0) + 1;
  active = clonePeriodeToRevision(base.id, {
    nama_periode: `RKB KPU Kabupaten Ngawi (Revisi ${nextRev})`,
    versi_revisi: `Revisi ${nextRev}`,
    tahap_revisi: 'PASCA_NPHD',
    dasar_pengesahan: 'Kertas Kerja Penyusunan',
    catatan_revisi: `Siklus revisi ke-${nextRev} dibuka berdasarkan dasar sah ${base.versi_revisi || base.nama_periode}`
  }, false);

  recordAuditLog({
    user,
    action: 'OPEN_REVISION_CYCLE',
    entity: 'periode_anggaran',
    entity_id: active.id,
    notes: `Siklus revisi ke-${nextRev} (Periode ID: ${active.id}) dibuka berdasarkan dasar sah ${base.versi_revisi} (ID: ${base.id}).`
  });

  return active;
}

/**
 * Validasi otorisasi penyuntingan baris RKB berdasarkan siklus & status pengajuan PIC
 */
function checkRowEditPermission(periodeId, subbag, user = null) {
  if (!periodeId) return;
  const p = getPeriodeById(periodeId);
  if (!p) throw new Error('Dokumen periode RKB tidak ditemukan.');
  if (Number(p.is_locked) === 1) {
    throw new Error('Dokumen RKB ini berstatus terkunci, data tidak dapat diedit atau ditambah.');
  }

  const cleanSubbag = normalizePic(subbag || 'KUL');
  const proposal = db.prepare('SELECT * FROM revisi_pengajuan WHERE periode_id = ? AND subbag = ?').get(periodeId, cleanSubbag);

  if (user && user.level > 1) {
    // Level 2 (Operator Subbag):
    const userPic = normalizePic(user.pic_subbag);
    if (userPic !== cleanSubbag && userPic !== 'SEMUA') {
      throw new Error(`Akses ditolak. Operator ${userPic} tidak berwenang menyunting rincian belanja milik subbagian ${cleanSubbag}.`);
    }

    if (proposal) {
      if (['DIAJUKAN', 'MENUNGGU_PLENO', 'ACC_PLENO', 'SELESAI'].includes(proposal.status_tahap)) {
        throw new Error(`Akses ditolak. Rincian subbagian ${cleanSubbag} sudah diajukan ke Rendatin (Status: ${proposal.status_tahap}) dan terkunci dari pengeditan PIC.`);
      }
    }
  } else if (user && (user.level === 1 || user.level === 0)) {
    // Level 1 (Perencanaan) / Level 0 (Developer):
    // Catat koreksi kecil rincian belanja pada pengajuan yang sedang diproses
    if (proposal && proposal.status_tahap !== 'DRAFT') {
      const waktu = formatWaktuSakti();
      const koreksiMsg = `Koreksi rincian belanja dilakukan oleh ${user.username} pada ${waktu}`;
      db.prepare(`
        UPDATE revisi_pengajuan SET
          l1_koreksi_catatan = CASE 
            WHEN l1_koreksi_catatan IS NULL OR l1_koreksi_catatan = '' THEN ? 
            ELSE l1_koreksi_catatan || '; ' || ? 
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(koreksiMsg, koreksiMsg, proposal.id);

      logRevisiHistory({
        pengajuan_id: proposal.id,
        periode_id: periodeId,
        subbag: cleanSubbag,
        tahap: proposal.tahap_terkini,
        status: proposal.status_tahap,
        aksi: 'KOREKSI_RINCIAN_L1',
        catatan: koreksiMsg,
        user
      });
    }

    // Jika proposal sudah ACC_PLENO dan L1 menyunting rincian (Revisi Kecil),
    // ACC versi lama otomatis BATAL dan status kembali ke MENUNGGU_PLENO
    if (proposal && proposal.status_tahap === 'ACC_PLENO') {
      db.prepare(`
        UPDATE revisi_pengajuan SET
          status_tahap = 'MENUNGGU_PLENO',
          tahap3_hasil = 'BATAL_KOREKSI_L1',
          tahap3_catatan = 'ACC sebelumnya batal otomatis karena terdapat penyesuaian rincian oleh Perencanaan pasca-pleno. Wajib dibahas dan di-ACC pleno ulang.',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(proposal.id);

      logRevisiHistory({
        pengajuan_id: proposal.id,
        periode_id: periodeId,
        subbag: cleanSubbag,
        tahap: 2,
        status: 'MENUNGGU_PLENO',
        aksi: 'INVALIDASI_ACC_PASCA_KOREKSI',
        catatan: 'ACC Pleno dibatalkan otomatis akibat koreksi rincian oleh Perencanaan (Revisi Kecil). Perlu pembahasan pleno ulang.',
        user
      });

      recordAuditLog({
        user,
        action: 'INVALIDATE_ACC_PLENO',
        entity: 'revisi_pengajuan',
        entity_id: proposal.id,
        notes: `ACC Pleno untuk ${cleanSubbag} dibatalkan otomatis karena rincian baris diubah oleh Perencanaan (Revisi Kecil). Status kembali ke MENUNGGU_PLENO.`
      });
    }
  }
}

/**
 * Pencatatan log riwayat pengajuan & siklus revisi
 */
function logRevisiHistory({
  pengajuan_id,
  periode_id,
  subbag,
  tahap,
  status,
  aksi,
  catatan = '',
  alasan_pengembalian = '',
  dokumen_surat_link = '',
  dokumen_matriks_link = '',
  total_semula = 0,
  total_menjadi = 0,
  selisih = 0,
  user = null
}) {
  const waktuNow = formatWaktuSakti();
  const actorId = user ? user.id : null;
  const actorUsername = user ? user.username : 'system';
  const actorName = user ? (user.nama_pejabat || user.username) : 'System';

  try {
    db.prepare(`
      INSERT INTO revisi_pengajuan_log (
        pengajuan_id, periode_id, subbag, tahap, status, aksi,
        catatan, alasan_pengembalian, dokumen_surat_link, dokumen_matriks_link,
        total_semula, total_menjadi, selisih,
        actor_id, actor_username, actor_name, waktu_wib
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      pengajuan_id, periode_id, subbag, tahap, status, aksi,
      catatan, alasan_pengembalian, dokumen_surat_link, dokumen_matriks_link,
      total_semula, total_menjadi, selisih,
      actorId, actorUsername, actorName, waktuNow
    );
  } catch (err) {
    console.warn('[REVISI-LOG] Gagal mencatat riwayat log:', err.message);
  }
}

function getRevisiPengajuanHistory(pengajuanId) {
  return db.prepare('SELECT * FROM revisi_pengajuan_log WHERE pengajuan_id = ? ORDER BY id ASC').all(Number(pengajuanId));
}

function lockPeriode(id, details = {}, user = null) {
  const existing = getPeriodeById(id);
  if (!existing) throw new Error('Dokumen periode tidak ditemukan.');

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE periode_anggaran SET 
      is_locked = 1, 
      locked_at = ?,
      dasar_pengesahan = COALESCE(?, dasar_pengesahan),
      tahap_revisi = COALESCE(?, tahap_revisi),
      nomor_ba_tapd = COALESCE(?, nomor_ba_tapd),
      tanggal_ba_tapd = COALESCE(?, tanggal_ba_tapd),
      catatan_revisi = COALESCE(?, catatan_revisi),
      gdrive_link_pleno = COALESCE(?, gdrive_link_pleno),
      catatan_pleno = COALESCE(?, catatan_pleno)
    WHERE id = ?
  `).run(
    now, 
    details.dasar_pengesahan || null, 
    details.tahap_revisi || null, 
    details.nomor_ba_tapd || null, 
    details.tanggal_ba_tapd || null, 
    details.catatan_revisi || null, 
    details.gdrive_link_pleno || null,
    details.catatan_pleno || null,
    id
  );

  approveAllSubbagPleno(id);

  // Buat dan simpan snapshot resmi
  savePeriodeSnapshot(id, user, false, details.catatan_revisi || 'Penguncian Dokumen Resmi');

  recordAuditLog({
    user,
    action: 'LOCK_PERIODE',
    entity: 'periode_anggaran',
    entity_id: id,
    old_values: { is_locked: 0 },
    new_values: { is_locked: 1, locked_at: now, nomor_ba_tapd: details.nomor_ba_tapd },
    notes: `Dokumen "${existing.nama_periode}" resmi dikunci dan dibuatkan snapshot arsip.`
  });

  return getPeriodeById(id);
}

function unlockPeriode(id, user = null) {
  if (user && user.level > 1) {
    throw new Error('Akses ditolak. Pembukaan kunci dokumen hanya diizinkan untuk Tim Perencanaan (Level 1) atau Pengembang (Level 0).');
  }

  const existing = getPeriodeById(id);
  if (!existing) throw new Error('Dokumen periode tidak ditemukan.');

  db.prepare('UPDATE periode_anggaran SET is_locked = 0, locked_at = NULL WHERE id = ?').run(id);

  // Hapus snapshot agar dokumen kembali berstatus draft aktif
  db.prepare('DELETE FROM periode_snapshot WHERE periode_id = ?').run(id);

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache(id);
  } catch (e) {}

  recordAuditLog({
    user,
    action: 'UNLOCK_PERIODE',
    entity: 'periode_anggaran',
    entity_id: id,
    old_values: { is_locked: 1, locked_at: existing.locked_at },
    new_values: { is_locked: 0, locked_at: null },
    notes: `Dokumen "${existing.nama_periode}" dibuka kuncinya untuk perbaikan.`
  });

  return getPeriodeById(id);
}

function updatePeriodeLegalitas(id, {
  nama_periode, versi_revisi,
  nomor_ba_tapd, tanggal_ba_tapd, dasar_pengesahan, catatan_revisi,
  nomor_surat_pengajuan_tapd, tanggal_surat_pengajuan_tapd,
  nomor_surat_balasan_pemda, nomor_surat_pernyataan_7hari, tanggal_surat_pernyataan_7hari
}, user = null) {
  const current = getPeriodeById(id);
  if (!current) return null;

  db.prepare(`
    UPDATE periode_anggaran SET
      nama_periode = ?,
      versi_revisi = ?,
      nomor_ba_tapd = ?,
      tanggal_ba_tapd = ?,
      dasar_pengesahan = ?,
      catatan_revisi = ?,
      nomor_surat_pengajuan_tapd = ?,
      tanggal_surat_pengajuan_tapd = ?,
      nomor_surat_balasan_pemda = ?,
      nomor_surat_pernyataan_7hari = ?,
      tanggal_surat_pernyataan_7hari = ?
    WHERE id = ?
  `).run(
    nama_periode || current.nama_periode,
    versi_revisi || current.versi_revisi,
    nomor_ba_tapd !== undefined ? nomor_ba_tapd : current.nomor_ba_tapd,
    tanggal_ba_tapd !== undefined ? tanggal_ba_tapd : current.tanggal_ba_tapd,
    dasar_pengesahan || current.dasar_pengesahan || 'Kertas Kerja Penyusunan',
    catatan_revisi !== undefined ? catatan_revisi : current.catatan_revisi,
    nomor_surat_pengajuan_tapd !== undefined ? nomor_surat_pengajuan_tapd : (current.nomor_surat_pengajuan_tapd || ''),
    tanggal_surat_pengajuan_tapd !== undefined ? tanggal_surat_pengajuan_tapd : (current.tanggal_surat_pengajuan_tapd || ''),
    nomor_surat_balasan_pemda !== undefined ? nomor_surat_balasan_pemda : (current.nomor_surat_balasan_pemda || ''),
    nomor_surat_pernyataan_7hari !== undefined ? nomor_surat_pernyataan_7hari : (current.nomor_surat_pernyataan_7hari || ''),
    tanggal_surat_pernyataan_7hari !== undefined ? tanggal_surat_pernyataan_7hari : (current.tanggal_surat_pernyataan_7hari || ''),
    id
  );

  recordAuditLog({
    user,
    action: 'UPDATE_LEGALITAS',
    entity: 'periode_anggaran',
    entity_id: id,
    old_values: { nomor_ba_tapd: current.nomor_ba_tapd, dasar_pengesahan: current.dasar_pengesahan },
    new_values: { nomor_ba_tapd, dasar_pengesahan },
    notes: `Legalitas periode [${id}] diperbarui.`
  });

  return getPeriodeById(id);
}

function createPeriode({
  nama_periode, versi_revisi, tahap_revisi, dasar_pengesahan,
  nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi, parent_periode_id,
  kode_singkat, revisi_ke, sumber_dana, pagu_nphd
}) {
  const countRev = db.prepare("SELECT COUNT(*) as c FROM periode_anggaran WHERE tipe_dokumen = 'RKB'").get()?.c || 1;
  const calcRevisiKe = revisi_ke !== undefined ? revisi_ke : countRev;
  const calcKodeSingkat = kode_singkat || `RKB-REV-${calcRevisiKe}`;

  const res = db.prepare(`
    INSERT INTO periode_anggaran (
      nama_periode, versi_revisi, tahap_revisi, dasar_pengesahan,
      nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi, parent_periode_id,
      is_locked, sumber_dana, tipe_dokumen, jenis_agenda, kode_singkat, revisi_ke, pagu_nphd
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'RKB', 'PILKADA', ?, ?, ?)
  `).run(
    nama_periode || `RKB Revisi ${calcRevisiKe}`,
    versi_revisi || `Revisi ${calcRevisiKe}`,
    tahap_revisi || 'PASCA_NPHD',
    dasar_pengesahan || 'BA TAPD',
    nomor_ba_tapd || '',
    tanggal_ba_tapd || '',
    catatan_revisi || '',
    parent_periode_id || null,
    sumber_dana || 'KABUPATEN',
    calcKodeSingkat,
    calcRevisiKe,
    pagu_nphd !== undefined ? Number(pagu_nphd) : 0
  );
  return getPeriodeById(res.lastInsertRowid);
}

function clonePeriodeToRevision(sourcePeriodeId, {
  nama_periode, versi_revisi, tahap_revisi, dasar_pengesahan, nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi
}, insideTransaction = false) {
  const source = getPeriodeById(sourcePeriodeId);
  if (!source) throw new Error('Dokumen sumber tidak ditemukan.');

  const nextRev = (source.revisi_ke || 0) + 1;
  const defaultVersi = versi_revisi || `Revisi ${nextRev}`;

  if (!insideTransaction) db.exec('BEGIN TRANSACTION');
  let newPeriode = null;

  try {
    newPeriode = createPeriode({
      nama_periode: nama_periode || `RKB KPU Kabupaten Ngawi (${defaultVersi})`,
      versi_revisi: defaultVersi,
      tahap_revisi: tahap_revisi || 'PASCA_NPHD',
      dasar_pengesahan: dasar_pengesahan || 'BA TAPD',
      nomor_ba_tapd: nomor_ba_tapd || '',
      tanggal_ba_tapd: tanggal_ba_tapd || '',
      catatan_revisi: catatan_revisi || `Turunan revisi dari ${source.versi_revisi}`,
      parent_periode_id: source.id,
      revisi_ke: nextRev,
      kode_singkat: `RKB-REV-${nextRev}`,
      pagu_nphd: source.pagu_nphd || 0
    });

    const rows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(sourcePeriodeId);
    
    const insertStmt = db.prepare(`
      INSERT INTO rab_baris (
        periode_id, urutan, row_type, kode, uraian, level_indent, target_scope, kode_akun,
        f1_val, f1_unit, f1_var, f2_val, f2_unit, f2_var, f3_val, f3_unit, f3_var, f4_val, f4_unit, f4_var,
        basis_pengali, label_pengali_kab, label_pengali_adhoc, satuan_vol, harga_satuan,
        pic_bagian, sifat_biaya, jenis_biaya, blokir_rm, selalu_tampil_print, parent_rkb_row_id,
        catatan_realisasi, semula_row_id, semula_vol, semula_rincian, semula_satuan, semula_harga, semula_jumlah,
        catatan_revisi_baris, cost_sharing
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?
      )
    `);

    const idMap = {};
    for (const r of rows) {
      const parentNewId = r.parent_rkb_row_id && idMap[r.parent_rkb_row_id] ? idMap[r.parent_rkb_row_id] : null;
      const res = insertStmt.run(
        newPeriode.id, r.urutan, r.row_type, r.kode, r.uraian, r.level_indent, r.target_scope, r.kode_akun,
        r.f1_val, r.f1_unit, r.f1_var, r.f2_val, r.f2_unit, r.f2_var, r.f3_val, r.f3_unit, r.f3_var, r.f4_val, r.f4_unit, r.f4_var,
        r.basis_pengali, r.label_pengali_kab, r.label_pengali_adhoc, r.satuan_vol, r.harga_satuan,
        r.pic_bagian, r.sifat_biaya, r.jenis_biaya, r.blokir_rm, r.selalu_tampil_print, parentNewId,
        r.catatan_realisasi, r.semula_row_id || r.id, null, null, null, null, null,
        r.catatan_revisi_baris, r.cost_sharing
      );
      idMap[r.id] = res.lastInsertRowid;
    }

    if (!insideTransaction) db.exec('COMMIT');
  } catch (err) {
    if (!insideTransaction) db.exec('ROLLBACK');
    throw err;
  }

  return getPeriodeById(newPeriode.id);
}

// ============================================================================
// RAB BARIS CRUD & QUERY
// ============================================================================

function getRabRows(periodeId, { pic = 'SEMUA', target_scope = 'ALL', search = '' } = {}) {
  let sql = 'SELECT * FROM rab_baris WHERE periode_id = ?';
  const params = [periodeId];

  let p = pic ? normalizePic(pic) : 'SEMUA';
  if (p !== 'SEMUA') {
    sql += ' AND UPPER(pic_bagian) = ?';
    params.push(p);
  }

  if (target_scope && target_scope !== 'ALL') {
    sql += ' AND UPPER(target_scope) = ?';
    params.push(target_scope.toUpperCase());
  }

  if (search) {
    sql += ' AND (uraian LIKE ? OR kode LIKE ? OR kode_akun LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  sql += ' ORDER BY urutan ASC, id ASC';
  return db.prepare(sql).all(...params);
}

function getRabRowById(id) {
  return db.prepare('SELECT * FROM rab_baris WHERE id = ?').get(id);
}

function saveRabRow(row, actorUser = null) {
  const targetSubbag = normalizePic(row.pic_bagian || (row.id ? getRabRowById(row.id)?.pic_bagian : 'KUL') || 'KUL');
  checkRowEditPermission(row.periode_id, targetSubbag, actorUser);

  const cleanUraian = (row.uraian || '').trim();
  if (!cleanUraian) throw new Error('Uraian rincian belanja tidak boleh kosong.');

  const isHeader = row.row_type === 'header' || Number(row.level_indent) < 4;
  const f1 = isHeader ? null : parseIndonesianNumber(row.f1_val);
  const f2 = isHeader ? null : parseIndonesianNumber(row.f2_val);
  const f3 = isHeader ? null : parseIndonesianNumber(row.f3_val);
  const f4 = isHeader ? null : parseIndonesianNumber(row.f4_val);
  const harga = isHeader ? 0 : (parseIndonesianNumber(row.harga_satuan) || 0);

  if (row.id) {
    const existing = getRabRowById(row.id);
    if (!existing) throw new Error('Baris yang akan diedit tidak ditemukan.');

    if (existing.pic_bagian && normalizePic(existing.pic_bagian) !== targetSubbag) {
      checkRowEditPermission(row.periode_id, existing.pic_bagian, actorUser);
    }

    db.prepare(`
      UPDATE rab_baris SET
        urutan = COALESCE(?, urutan),
        row_type = ?,
        kode = ?,
        uraian = ?,
        level_indent = ?,
        target_scope = ?,
        kode_akun = ?,
        f1_val = ?, f1_unit = ?, f1_var = ?,
        f2_val = ?, f2_unit = ?, f2_var = ?,
        f3_val = ?, f3_unit = ?, f3_var = ?,
        f4_val = ?, f4_unit = ?, f4_var = ?,
        basis_pengali = ?,
        label_pengali_kab = ?,
        label_pengali_adhoc = ?,
        satuan_vol = ?,
        harga_satuan = ?,
        pic_bagian = ?,
        sifat_biaya = ?,
        jenis_biaya = ?,
        blokir_rm = ?,
        selalu_tampil_print = ?,
        parent_rkb_row_id = ?,
        catatan_revisi_baris = ?
      WHERE id = ?
    `).run(
      row.urutan !== undefined ? row.urutan : existing.urutan,
      row.row_type || existing.row_type,
      row.kode !== undefined ? row.kode : existing.kode,
      cleanUraian,
      row.level_indent !== undefined ? row.level_indent : existing.level_indent,
      row.target_scope || existing.target_scope,
      row.kode_akun || existing.kode_akun,
      f1, row.f1_unit || '', row.f1_var || '',
      f2, row.f2_unit || '', row.f2_var || '',
      f3, row.f3_unit || '', row.f3_var || '',
      f4, row.f4_unit || '', row.f4_var || '',
      row.basis_pengali || 'NONE',
      row.label_pengali_kab || '',
      row.label_pengali_adhoc || '',
      row.satuan_vol || '',
      harga,
      row.pic_bagian || existing.pic_bagian,
      row.sifat_biaya || existing.sifat_biaya,
      row.jenis_biaya || existing.jenis_biaya,
      row.blokir_rm !== undefined ? row.blokir_rm : existing.blokir_rm,
      row.selalu_tampil_print !== undefined ? row.selalu_tampil_print : existing.selalu_tampil_print,
      row.parent_rkb_row_id !== undefined ? row.parent_rkb_row_id : existing.parent_rkb_row_id,
      row.catatan_revisi_baris !== undefined ? row.catatan_revisi_baris : existing.catatan_revisi_baris,
      row.id
    );

    try {
      const { clearRkbDatasetCache } = require('./calculation');
      clearRkbDatasetCache(row.periode_id);
    } catch (e) {}

    recordAuditLog({
      user: actorUser,
      action: 'UPDATE_RKB_ROW',
      entity: 'rab_baris',
      entity_id: row.id,
      old_values: { uraian: existing.uraian, harga_satuan: existing.harga_satuan, pic: existing.pic_bagian },
      new_values: { uraian: cleanUraian, harga_satuan: harga, pic: row.pic_bagian || existing.pic_bagian },
      notes: `Baris RKB [${row.id}] diupdate.`
    });

    // Jika baris yang diedit adalah Header dan PIC-nya diubah, lakukan cascade ke seluruh baris anak ("level diatasnya dirubah, level dibawah mengikuti")
    const isHeaderRow = (existing.row_type === 'header' || Number(existing.level_indent) < 4);
    const newPicVal = row.pic_bagian ? normalizePic(row.pic_bagian) : existing.pic_bagian;
    const isPicChanged = newPicVal && existing.pic_bagian && newPicVal !== normalizePic(existing.pic_bagian);

    if (isHeaderRow && isPicChanged) {
      try {
        updateRabBarisPicWithCascade(existing.periode_id, row.id, newPicVal, true, actorUser);
      } catch (cascadeErr) {
        console.warn('[saveRabRow] Cascade PIC notice:', cascadeErr.message);
      }
    }

    return getRabRowById(row.id);
  } else {
    let urutan = row.urutan;
    if (urutan === undefined || urutan === null) {
      const maxU = db.prepare('SELECT MAX(urutan) as maxU FROM rab_baris WHERE periode_id = ?').get(row.periode_id)?.maxU || 0;
      urutan = maxU + 10;
    }

    const res = db.prepare(`
      INSERT INTO rab_baris (
        periode_id, urutan, row_type, kode, uraian, level_indent, target_scope, kode_akun,
        f1_val, f1_unit, f1_var, f2_val, f2_unit, f2_var, f3_val, f3_unit, f3_var, f4_val, f4_unit, f4_var,
        basis_pengali, label_pengali_kab, label_pengali_adhoc, satuan_vol, harga_satuan,
        pic_bagian, sifat_biaya, jenis_biaya, blokir_rm, selalu_tampil_print, parent_rkb_row_id,
        catatan_revisi_baris
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?
      )
    `).run(
      row.periode_id, urutan, row.row_type || (isHeader ? 'header' : 'item'), row.kode || '', cleanUraian, row.level_indent !== undefined ? row.level_indent : (isHeader ? 2 : 4), row.target_scope || 'KAB', row.kode_akun || '521211',
      f1, row.f1_unit || '', row.f1_var || '', f2, row.f2_unit || '', row.f2_var || '', f3, row.f3_unit || '', row.f3_var || '', f4, row.f4_unit || '', row.f4_var || '',
      row.basis_pengali || 'NONE', row.label_pengali_kab || '', row.label_pengali_adhoc || '', row.satuan_vol || '', harga,
      row.pic_bagian || 'KUL', row.sifat_biaya || 'NON_OPERASIONAL', row.jenis_biaya || 'LANGSUNG', row.blokir_rm || 0, row.selalu_tampil_print || 0, row.parent_rkb_row_id || null,
      row.catatan_revisi_baris || ''
    );

    try {
      const { clearRkbDatasetCache } = require('./calculation');
      clearRkbDatasetCache(row.periode_id);
    } catch (e) {}

    recordAuditLog({
      user: actorUser,
      action: 'CREATE_RKB_ROW',
      entity: 'rab_baris',
      entity_id: res.lastInsertRowid,
      new_values: { uraian: cleanUraian, harga_satuan: harga, pic: row.pic_bagian },
      notes: `Baris RKB baru ditambahkan ke periode ${row.periode_id}.`
    });

    return getRabRowById(res.lastInsertRowid);
  }
}

function deleteRabRow(id, actorUser = null) {
  const row = getRabRowById(id);
  if (!row) throw new Error('Baris RKB tidak ditemukan.');

  checkRowEditPermission(row.periode_id, row.pic_bagian, actorUser);

  // Dapatkan seluruh pohon keturunan dari kalkulasi hierarki riil
  const { getRkbCalculatedDataset, clearRkbDatasetCache } = require('./calculation');
  const dataset = getRkbCalculatedDataset(row.periode_id);

  const childrenMap = {};
  (dataset.rows || []).forEach(r => {
    if (r.parent_tree_id) {
      if (!childrenMap[r.parent_tree_id]) childrenMap[r.parent_tree_id] = [];
      childrenMap[r.parent_tree_id].push(r);
    }
  });

  const targetTreeId = `row_${id}`;
  const idsToDelete = [];
  const visitedIds = new Set();
  const queue = [targetTreeId];

  visitedIds.add(Number(id));
  idsToDelete.push(Number(id));

  // Jelajahi seluruh turunan (anak, cucu, cicit, dsb.) secara top-down (Cascade Delete)
  while (queue.length > 0) {
    const curTreeId = queue.shift();
    const children = childrenMap[curTreeId] || [];
    for (const child of children) {
      if (child.id && !visitedIds.has(Number(child.id))) {
        visitedIds.add(Number(child.id));
        idsToDelete.push(Number(child.id));
        queue.push(child.tree_id);
      }
    }
  }

  // Hapus seluruh baris terpilih dalam 1 transaksi atomik
  const delStmt = db.prepare('DELETE FROM rab_baris WHERE id = ?');
  db.exec('BEGIN TRANSACTION');
  try {
    for (const delId of idsToDelete) {
      delStmt.run(delId);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  try {
    clearRkbDatasetCache(row.periode_id);
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: 'DELETE_RKB_ROW',
    entity: 'rab_baris',
    entity_id: id,
    old_values: { kode: row.kode, uraian: row.uraian, total: row.harga_satuan, pic: row.pic_bagian },
    notes: idsToDelete.length > 1
      ? `Baris RKB [${row.kode || '-'}] ${row.uraian} beserta ${idsToDelete.length - 1} rincian di bawahnya berhasil dihapus (cascade delete: total ${idsToDelete.length} baris).`
      : `Baris RKB [${row.kode || '-'}] ${row.uraian} dihapus.`
  });

  return {
    success: true,
    count: idsToDelete.length,
    deletedCount: idsToDelete.length,
    deletedIds: idsToDelete
  };
}

function getRowHierarchyRank(row) {
  if (!row || row.row_type !== 'header') return 99;
  const lvl = Number(row.level_indent ?? 2);
  if (lvl === 0) return 10;
  if (lvl === 1) return 20;
  if (lvl === 2) return 30;
  if (lvl >= 21 && lvl <= 29) return 40 + (lvl - 20);
  if (lvl === 3) return 50;
  if (lvl === 4 || lvl === 41) return 61;
  if (lvl === 42) return 62;
  return 45;
}

function updateRabBarisPicWithCascade(periodeId, rowId, picBagian, cascade = true, actorUser = null) {
  const cleanPic = normalizePic(picBagian);
  const targetRow = getRabRowById(rowId);
  if (!targetRow) throw new Error('Baris tidak ditemukan.');

  checkRowEditPermission(periodeId, targetRow.pic_bagian, actorUser);
  checkRowEditPermission(periodeId, cleanPic, actorUser);

  const isHeader = (targetRow.row_type === 'header' || Number(targetRow.level_indent) < 4);

  // Jika bukan cascade atau baris yang diedit bukan Header (misal: rincian belanja riil/item),
  // HANYA update baris ini saja, TIDAK BOLEH mengubah baris level di atasnya / parent-nya ("tidak berlaku sebaliknya").
  if (!cascade || !isHeader) {
    db.prepare('UPDATE rab_baris SET pic_bagian = ? WHERE id = ?').run(cleanPic, rowId);
    try {
      const { clearRkbDatasetCache } = require('./calculation');
      if (typeof clearRkbDatasetCache === 'function') clearRkbDatasetCache(periodeId);
    } catch (e) {}
    return {
      success: true,
      updatedCount: 1,
      count: 1,
      updatedIds: [Number(rowId)],
      pic_bagian: cleanPic
    };
  }

  // Jika baris adalah HEADER dan cascade = true (Level di atasnya diubah):
  // SELURUH level di bawahnya (sub-kegiatan, akun belanja & rincian belanja riil) WAJIB mengikuti PIC baru.
  // Traversal mandiri berdasarkan urutan baris & hierarki rank (mencegah circular require)
  const allRows = db.prepare('SELECT id, urutan, kode, uraian, row_type, level_indent, pic_bagian FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(periodeId);
  const targetIdx = allRows.findIndex(r => r.id === Number(rowId));
  if (targetIdx === -1) throw new Error('Baris tidak ditemukan dalam periode ini.');

  const targetRank = getRowHierarchyRank(targetRow);
  const idsToUpdate = [Number(targetRow.id)];

  for (let i = targetIdx + 1; i < allRows.length; i++) {
    const child = allRows[i];
    const rRank = getRowHierarchyRank(child);
    if (rRank <= targetRank) break; // Berhenti jika mencapai header setara atau lebih tinggi
    idsToUpdate.push(Number(child.id));
  }

  const upd = db.prepare('UPDATE rab_baris SET pic_bagian = ? WHERE id = ?');
  db.exec('BEGIN TRANSACTION');
  try {
    idsToUpdate.forEach(id => upd.run(cleanPic, id));
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    if (typeof clearRkbDatasetCache === 'function') clearRkbDatasetCache(periodeId);
  } catch (e) {}

  return {
    success: true,
    updatedCount: idsToUpdate.length,
    count: idsToUpdate.length,
    updatedIds: idsToUpdate,
    pic_bagian: cleanPic
  };
}

function clearRabRows(periodeId) {
  const p = getPeriodeById(periodeId);
  if (p && Number(p.is_locked) === 1) {
    throw new Error('Dokumen terkunci tidak dapat dikosongkan.');
  }
  db.prepare('DELETE FROM rab_baris WHERE periode_id = ?').run(periodeId);
  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache(periodeId);
  } catch (e) {}
  return { success: true };
}

function reorderRow(periodeId, rowId, direction, actorUser = null) {
  const curItem = getRabRowById(rowId);
  if (!curItem) throw new Error('Baris tidak ditemukan.');

  checkRowEditPermission(periodeId, curItem.pic_bagian, actorUser);

  const rows = db.prepare('SELECT id, urutan, parent_rkb_row_id, pic_bagian FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(periodeId);
  const idx = rows.findIndex(r => r.id === Number(rowId));
  if (idx === -1) throw new Error('Baris tidak ditemukan.');

  const targetIdx = String(direction).toLowerCase() === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= rows.length) return false;

  const curRow = rows[idx];
  const swapRow = rows[targetIdx];
  checkRowEditPermission(periodeId, swapRow.pic_bagian, actorUser);

  const tempUrutan = curRow.urutan;
  const newUrutan = swapRow.urutan;

  db.prepare('UPDATE rab_baris SET urutan = ? WHERE id = ?').run(newUrutan, curRow.id);
  db.prepare('UPDATE rab_baris SET urutan = ? WHERE id = ?').run(tempUrutan, swapRow.id);

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache(periodeId);
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: 'REORDER_ROW',
    entity: 'rab_baris',
    entity_id: rowId,
    notes: `Pengurutan baris [${rowId}] ditukar ke arah ${direction}.`
  });

  return true;
}

// ============================================================================
// AUTH & USER MANAGEMENT
// ============================================================================

function getUsers() {
  return db.prepare('SELECT id, username, nama_pejabat, jabatan, role_id, level, pic_subbag, email, google_id, avatar_url, is_active, token_version FROM satker_users ORDER BY level ASC, id ASC').all();
}

function getUserById(id) {
  return db.prepare('SELECT id, username, nama_pejabat, jabatan, role_id, level, pic_subbag, email, google_id, avatar_url, is_active, token_version FROM satker_users WHERE id = ?').get(id);
}

function saveUser(userData, actorUser = null) {
  const id = userData.id ? Number(userData.id) : null;
  const username = (userData.username || '').trim().toLowerCase();
  const rawPassword = (userData.password || '').trim();
  const nama_pejabat = (userData.nama_pejabat || '').trim();
  const jabatan = (userData.jabatan || '').trim();
  const email = (userData.email || '').trim().toLowerCase();
  const role_id = (userData.role_id || 'op_teknis').trim();
  const level = Number(userData.level) !== undefined ? Number(userData.level) : 2;
  const pic_subbag = normalizePic(userData.pic_subbag || 'SEMUA');
  const is_active = userData.is_active !== undefined ? (Number(userData.is_active) ? 1 : 0) : 1;

  if (!username) throw new Error('Username tidak boleh kosong.');
  if (!id && !rawPassword) throw new Error('Password tidak boleh kosong untuk pengguna baru.');
  if (!nama_pejabat) throw new Error('Nama pejabat / pegawai tidak boleh kosong.');

  const coh = validateUserCoherence({ level, role_id, pic_subbag });
  if (!coh.valid) throw new Error(coh.error);

  let finalPassword = '';
  if (rawPassword) {
    finalPassword = rawPassword.startsWith('scrypt$') ? rawPassword : hashPassword(rawPassword);
  }

  if (id) {
    const existing = db.prepare('SELECT * FROM satker_users WHERE id = ?').get(id);
    if (!existing) throw new Error(`Pengguna dengan ID ${id} tidak ditemukan.`);

    const clash = db.prepare('SELECT id FROM satker_users WHERE username = ? AND id != ?').get(username, id);
    if (clash) throw new Error(`Username "${username}" sudah digunakan pengguna lain.`);

    if (existing.username === 'emenje' && level !== 0) {
      throw new Error('Tingkat akses akun developer "emenje" tidak dapat diturunkan.');
    }

    const passToSave = finalPassword || existing.password;
    const isSecurityChanged = Boolean(
      (rawPassword && passToSave !== existing.password) ||
      existing.role_id !== role_id ||
      existing.level !== level ||
      existing.is_active !== is_active
    );
    const nextTokenVer = isSecurityChanged ? (Number(existing.token_version || 1) + 1) : (Number(existing.token_version || 1));

    db.prepare(`
      UPDATE satker_users
      SET username = ?, password = ?, nama_pejabat = ?, jabatan = ?, email = ?, 
          role_id = ?, level = ?, pic_subbag = ?, is_active = ?, token_version = ?
      WHERE id = ?
    `).run(username, passToSave, nama_pejabat, jabatan, email, role_id, level, pic_subbag, is_active, nextTokenVer, id);

    recordAuditLog({
      user: actorUser,
      action: 'UPDATE_USER',
      entity: 'satker_users',
      entity_id: id,
      old_values: { username: existing.username, role_id: existing.role_id, level: existing.level, is_active: existing.is_active },
      new_values: { username, role_id, level, is_active },
      notes: isSecurityChanged ? 'Data pengguna diubah (sesi lama dicabut).' : 'Data pengguna diperbarui.'
    });

    return getUserById(id);
  } else {
    const exist = db.prepare('SELECT id FROM satker_users WHERE username = ?').get(username);
    if (exist) throw new Error(`Username "${username}" sudah terdaftar.`);

    const res = db.prepare(`
      INSERT INTO satker_users (username, password, nama_pejabat, jabatan, email, role_id, level, pic_subbag, is_active, token_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(username, finalPassword, nama_pejabat, jabatan, email, role_id, level, pic_subbag, is_active);

    recordAuditLog({
      user: actorUser,
      action: 'CREATE_USER',
      entity: 'satker_users',
      entity_id: res.lastInsertRowid,
      new_values: { username, role_id, level, is_active },
      notes: `Pengguna baru "${username}" dibuat.`
    });

    return getUserById(res.lastInsertRowid);
  }
}

function deleteUser(userId, currentUserId, actorUser = null) {
  const target = db.prepare('SELECT * FROM satker_users WHERE id = ?').get(userId);
  if (!target) throw new Error('Pengguna tidak ditemukan.');

  if (target.username === 'emenje') {
    throw new Error('Akun Developer Utama ("emenje") dilindungi dan tidak dapat dihapus.');
  }

  if (Number(userId) === Number(currentUserId)) {
    throw new Error('Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini.');
  }

  db.prepare('UPDATE satker_users SET is_active = 0, token_version = COALESCE(token_version, 1) + 1 WHERE id = ?').run(userId);
  db.prepare('DELETE FROM satker_users WHERE id = ?').run(userId);

  recordAuditLog({
    user: actorUser,
    action: 'DELETE_USER',
    entity: 'satker_users',
    entity_id: userId,
    old_values: { username: target.username, role_id: target.role_id },
    notes: `Pengguna "${target.username}" dihapus.`
  });

  return { success: true, message: `Akun "${target.username}" berhasil dihapus.` };
}

function toggleUserStatus(userId, actorUser = null) {
  const target = db.prepare('SELECT * FROM satker_users WHERE id = ?').get(userId);
  if (!target) throw new Error('Pengguna tidak ditemukan.');

  if (target.username === 'emenje') {
    throw new Error('Status Akun Developer Utama ("emenje") tidak dapat dinonaktifkan.');
  }

  const newStatus = target.is_active ? 0 : 1;
  const nextTokenVer = Number(target.token_version || 1) + 1;
  db.prepare('UPDATE satker_users SET is_active = ?, token_version = ? WHERE id = ?').run(newStatus, nextTokenVer, userId);

  recordAuditLog({
    user: actorUser,
    action: 'TOGGLE_USER_STATUS',
    entity: 'satker_users',
    entity_id: userId,
    old_values: { is_active: target.is_active },
    new_values: { is_active: newStatus },
    notes: `Status akun "${target.username}" diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'} (sesi lama dicabut).`
  });

  return { success: true, is_active: newStatus, message: `Status akun "${target.username}" diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}.` };
}

function authenticateUser(username, password) {
  if (!username || !password) return null;
  const u = db.prepare('SELECT * FROM satker_users WHERE username = ? AND is_active = 1').get(username);
  if (!u) return null;

  const result = verifyPassword(password, u.password);
  if (!result.valid) return null;

  // Transparent password upgrade to scrypt
  if (result.needsUpgrade) {
    try {
      const newHash = hashPassword(password);
      db.prepare('UPDATE satker_users SET password = ? WHERE id = ?').run(newHash, u.id);
    } catch (e) {}
  }

  return {
    id: u.id,
    username: u.username,
    nama_pejabat: u.nama_pejabat,
    jabatan: u.jabatan,
    role_id: u.role_id,
    level: u.level,
    pic_subbag: u.pic_subbag,
    email: u.email || '',
    avatar_url: u.avatar_url || '',
    token_version: u.token_version !== undefined ? Number(u.token_version) : 1
  };
}

function authenticateGoogleUser(googleProfile) {
  const email = (googleProfile.email || '').trim().toLowerCase();
  const sub = String(googleProfile.sub || '');
  if (!email && !sub) return null;

  let u = null;
  if (email && sub) {
    u = db.prepare('SELECT * FROM satker_users WHERE (google_id = ? OR LOWER(email) = ?) AND is_active = 1').get(sub, email);
  } else if (email) {
    u = db.prepare('SELECT * FROM satker_users WHERE LOWER(email) = ? AND is_active = 1').get(email);
  }

  if (!u) return null;

  try {
    if (!u.google_id && sub) {
      db.prepare('UPDATE satker_users SET google_id = ? WHERE id = ?').run(sub, u.id);
    }
    if (googleProfile.picture) {
      db.prepare('UPDATE satker_users SET avatar_url = ? WHERE id = ?').run(googleProfile.picture, u.id);
    }
  } catch (e) {}

  return {
    id: u.id,
    username: u.username,
    nama_pejabat: u.nama_pejabat,
    jabatan: u.jabatan,
    role_id: u.role_id,
    level: u.level,
    pic_subbag: u.pic_subbag,
    email: u.email || email,
    avatar_url: googleProfile.picture || u.avatar_url || '',
    token_version: u.token_version !== undefined ? Number(u.token_version) : 1
  };
}

// ============================================================================
// MASTER DATA & PENGATURAN
// ============================================================================

function getMasters() {
  const settingsRows = db.prepare('SELECT key, value FROM settings_satker').all();
  const settings = {};
  settingsRows.forEach(r => { settings[r.key] = r.value; });

  return {
    variabels: db.prepare('SELECT * FROM master_variabel ORDER BY id').all(),
    kuantitas: db.prepare('SELECT * FROM master_kuantitas ORDER BY id').all(),
    paslons: db.prepare('SELECT * FROM master_paslon ORDER BY no_urut ASC, id ASC').all(),
    kecamatans: db.prepare('SELECT * FROM master_kecamatan ORDER BY no_urut ASC, id ASC').all(),
    desas: db.prepare('SELECT * FROM master_desa ORDER BY no_urut ASC, id ASC').all(),
    sbms: db.prepare('SELECT * FROM master_sbm ORDER BY id ASC').all(),
    akuns: db.prepare('SELECT * FROM master_akun ORDER BY kode ASC').all(),
    subbagians: db.prepare('SELECT * FROM master_subbagian ORDER BY id').all(),
    settings
  };
}

function updateSettings(settingsObj, actorUser = null) {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings_satker (key, value) VALUES (?, ?)');
  db.exec('BEGIN TRANSACTION');
  try {
    for (const [k, v] of Object.entries(settingsObj)) {
      stmt.run(k, String(v));
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: 'UPDATE_SETTINGS',
    entity: 'settings_satker',
    notes: 'Pengaturan satker diperbarui.'
  });

  return getMasters().settings;
}

function syncPrimaryKuantitas() {
  try {
    const agg = db.prepare(`
      SELECT COUNT(*) as jmlDesa, 
             COALESCE(SUM(tps), 0) as sumTps, 
             COALESCE(SUM(kotak), 0) as sumKotak,
             COALESCE(SUM(pantarlih), 0) as sumPantarlih, 
             COALESCE(SUM(pemilih), 0) as sumPemilih 
      FROM master_desa
    `).get() || {};

    const livePantarlih = Number(agg.sumPantarlih) || 0;
    const liveDesa = Number(agg.jmlDesa) || 0;
    const liveTps = Number(agg.sumTps) || 0;
    const liveKotak = Number(agg.sumKotak) || liveTps;
    const livePemilih = Number(agg.sumPemilih) || 0;
    const liveKec = Number(db.prepare('SELECT COUNT(*) as cnt FROM master_kecamatan').get()?.cnt) || 0;
    const livePaslon = Number(db.prepare('SELECT COUNT(*) as cnt FROM master_paslon').get()?.cnt) || 0;

    const upd = db.prepare('UPDATE master_kuantitas SET nilai = ? WHERE kode = ?');

    upd.run(livePantarlih, 'pantarlih');
    upd.run(liveTps, 'tps_rkb');
    upd.run(liveKotak, 'kotak_rkb');
    upd.run(liveDesa, 'desa_pps');
    upd.run(liveKec, 'kec_ppk');
    upd.run(livePemilih, 'pemilih_dpt');
    upd.run(livePemilih, 'dpt');
    upd.run(livePaslon, 'paslon');

    upd.run(liveTps * 1, 'kpps_ketua');
    upd.run(liveTps * 6, 'kpps_anggota');
    upd.run(liveTps * 7, 'kpps_all');
    upd.run(liveTps * 2, 'linmas_tps');
    upd.run(liveTps * 9, 'petugas_tps');

    upd.run(liveKec * 1, 'ppk_ketua');
    upd.run(liveKec * 4, 'ppk_anggota');
    upd.run(liveKec * 5, 'ppk_komisioner');
    upd.run(liveKec * 1, 'ppk_sekretaris');
    upd.run(liveKec * 2, 'ppk_staf');
    upd.run(liveKec * 3, 'ppk_sekretariat');

    upd.run(liveDesa * 1, 'pps_ketua');
    upd.run(liveDesa * 2, 'pps_anggota');
    upd.run(liveDesa * 3, 'pps_komisioner');
    upd.run(liveDesa * 1, 'pps_sekretaris');
    upd.run(liveDesa * 2, 'pps_staf');
    upd.run(liveDesa * 3, 'pps_sekretariat');
  } catch (e) {
    console.warn('[SYNC-KUANTITAS] Peringatan sinkronisasi kuantitas:', e.message);
  }
}

function getKuantitasList() {
  return db.prepare('SELECT * FROM master_kuantitas ORDER BY id').all();
}

function getKuantitasById(id) {
  return db.prepare('SELECT * FROM master_kuantitas WHERE id = ?').get(id);
}

function saveKuantitas(data, actorUser = null) {
  const id = data.id ? Number(data.id) : null;
  let existing = null;
  if (id) {
    existing = db.prepare('SELECT * FROM master_kuantitas WHERE id = ?').get(id);
    if (!existing) throw new Error(`Parameter kuantitas dengan ID ${id} tidak ditemukan.`);
  }

  const kode = (data.kode || existing?.kode || '').trim().toLowerCase();
  const nama = (data.nama || existing?.nama || '').trim();
  const satuan = (data.satuan !== undefined ? data.satuan : (existing?.satuan || '')).trim();
  const parsedNilai = data.nilai !== undefined ? parseIndonesianNumber(data.nilai) : null;
  const nilai = parsedNilai !== null ? parsedNilai : (existing ? existing.nilai : 0);
  const kategori = (data.kategori || existing?.kategori || 'UMUM').trim();
  const keterangan = (data.keterangan !== undefined ? data.keterangan : (existing?.keterangan || '')).trim();

  if (!kode) throw new Error('Kode kuantitas tidak boleh kosong.');
  if (!nama) throw new Error('Nama kuantitas tidak boleh kosong.');

  if (id) {
    db.prepare(`
      UPDATE master_kuantitas 
      SET kode = ?, nama = ?, satuan = ?, nilai = ?, kategori = ?, keterangan = ?
      WHERE id = ?
    `).run(kode, nama, satuan, nilai, kategori, keterangan, id);
  } else {
    db.prepare(`
      INSERT INTO master_kuantitas (kode, nama, satuan, nilai, kategori, keterangan)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(kode, nama, satuan, nilai, kategori, keterangan);
  }

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: id ? 'UPDATE_KUANTITAS' : 'CREATE_KUANTITAS',
    entity: 'master_kuantitas',
    entity_id: id || kode,
    new_values: { kode, nama, nilai, satuan, keterangan },
    notes: `Master kuantitas ${kode} disimpan.`
  });

  return getKuantitasList();
}

// Master Paslon
function getPaslonList() {
  return db.prepare('SELECT * FROM master_paslon ORDER BY no_urut ASC, id ASC').all();
}

function savePaslon(data, actorUser = null) {
  const id = data.id ? Number(data.id) : null;
  const no_urut = Number(data.no_urut) || 1;
  const bupati = (data.nama_calon_bupati || '').trim();
  const wakil = (data.nama_calon_wakil_bupati || '').trim();
  const partai = (data.partai_pengusung || '').trim();
  const slogan = (data.slogan || '').trim();
  const ket = (data.keterangan || '').trim();

  if (!bupati) throw new Error('Nama calon bupati wajib diisi.');

  if (id) {
    db.prepare(`
      UPDATE master_paslon
      SET no_urut = ?, nama_calon_bupati = ?, nama_calon_wakil_bupati = ?, partai_pengusung = ?, slogan = ?, keterangan = ?
      WHERE id = ?
    `).run(no_urut, bupati, wakil, partai, slogan, ket, id);
  } else {
    db.prepare(`
      INSERT INTO master_paslon (no_urut, nama_calon_bupati, nama_calon_wakil_bupati, partai_pengusung, slogan, keterangan)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(no_urut, bupati, wakil, partai, slogan, ket);
  }

  syncPrimaryKuantitas();
  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: id ? 'UPDATE_PASLON' : 'CREATE_PASLON',
    entity: 'master_paslon',
    entity_id: id,
    notes: `Data Paslon No ${no_urut} (${bupati}) disimpan.`
  });

  return getPaslonList();
}

function deletePaslon(id, actorUser = null) {
  db.prepare('DELETE FROM master_paslon WHERE id = ?').run(id);
  syncPrimaryKuantitas();
  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: 'DELETE_PASLON',
    entity: 'master_paslon',
    entity_id: id,
    notes: `Paslon ID ${id} dihapus.`
  });

  return { success: true };
}

// Master Kecamatan
function getKecamatans() {
  return db.prepare('SELECT * FROM master_kecamatan ORDER BY no_urut ASC, id ASC').all();
}

function saveKecamatan(data, actorUser = null) {
  const id = data.id ? Number(data.id) : null;
  const nama = (data.nama || '').trim();
  const no_urut = data.no_urut ? Number(data.no_urut) : 1;
  const kode = (data.kode || '').trim();
  const ketua = (data.ketua_ppk || data.ketua_nama || '').trim();
  const sekretaris = (data.sekretaris_ppk || data.sekretaris_nama || '').trim();
  const nip = (data.sekretaris_nip || '').trim();

  if (!nama) throw new Error('Nama kecamatan tidak boleh kosong.');

  if (id) {
    db.prepare(`
      UPDATE master_kecamatan
      SET no_urut = ?, nama = ?, kode = ?, ketua_nama = ?, sekretaris_nama = ?, sekretaris_nip = ?
      WHERE id = ?
    `).run(no_urut, nama, kode, ketua, sekretaris, nip, id);
  } else {
    db.prepare(`
      INSERT INTO master_kecamatan (no_urut, nama, kode, ketua_nama, sekretaris_nama, sekretaris_nip)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(no_urut, nama, kode, ketua, sekretaris, nip);
  }

  syncPrimaryKuantitas();
  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  return getKecamatans();
}

function deleteKecamatan(id, actorUser = null) {
  db.prepare('DELETE FROM master_kecamatan WHERE id = ?').run(id);
  syncPrimaryKuantitas();
  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}
  return { success: true };
}

function bulkUpsertKecamatan(items, options = {}) {
  const isPreview = Boolean(options.preview);
  const errors = [];
  const wouldInsert = [];
  const wouldUpdate = [];

  const checkByIdStmt = db.prepare('SELECT id FROM master_kecamatan WHERE id = ?');
  const checkByNameStmt = db.prepare('SELECT id FROM master_kecamatan WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?))');

  const updateStmt = db.prepare(`
    UPDATE master_kecamatan
    SET no_urut = COALESCE(?, no_urut),
        nama = ?,
        kode = ?,
        ketua_nama = ?,
        sekretaris_nama = ?,
        sekretaris_nip = ?
    WHERE id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO master_kecamatan (no_urut, nama, kode, ketua_nama, sekretaris_nama, sekretaris_nip)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const rowNum = idx + 2;
    const cleanNama = (item.nama || '').trim();
    if (!cleanNama) continue;

    const noUrut = item.no_urut ? parseIndonesianNumber(item.no_urut) : null;
    const kode = (item.kode || '').trim();
    const ketua = (item.ketua_ppk || item.ketua_nama || '').trim();
    const sekretaris = (item.sekretaris_ppk || item.sekretaris_nama || '').trim();
    const nip = (item.sekretaris_nip || '').trim();

    let targetId = item.id ? checkByIdStmt.get(item.id)?.id : null;
    if (!targetId) {
      targetId = checkByNameStmt.get(cleanNama)?.id;
    }

    const payload = { id: targetId, no_urut: noUrut, nama: cleanNama, kode, ketua, sekretaris, nip };
    if (targetId) wouldUpdate.push(payload);
    else wouldInsert.push(payload);
  }

  if (isPreview) {
    return {
      preview: true,
      processed: wouldInsert.length + wouldUpdate.length,
      would_insert: wouldInsert.length,
      would_update: wouldUpdate.length,
      error_count: errors.length,
      errors,
      sample_changes: [...wouldInsert.slice(0, 5), ...wouldUpdate.slice(0, 5)]
    };
  }

  if (errors.length > 0) {
    throw new Error(`Impor Kecamatan dibatalkan: ${errors.length} baris bermasalah. Baris ${errors[0].baris}: ${errors[0].error}`);
  }

  db.exec('BEGIN TRANSACTION');
  try {
    for (const item of wouldUpdate) {
      updateStmt.run(item.no_urut, item.nama, item.kode, item.ketua, item.sekretaris, item.nip, item.id);
    }
    for (const item of wouldInsert) {
      insertStmt.run(item.no_urut || 1, item.nama, item.kode, item.ketua, item.sekretaris, item.nip);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  syncPrimaryKuantitas();
  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  return { success: true, processed: wouldInsert.length + wouldUpdate.length, inserted: wouldInsert.length, updated: wouldUpdate.length };
}

// Master Desa
function getDesas(kecamatanId = null) {
  let sql = `
    SELECT d.*, k.nama as kecamatan_nama, k.no_urut as kecamatan_no
    FROM master_desa d
    JOIN master_kecamatan k ON d.kecamatan_id = k.id
  `;
  const params = [];
  if (kecamatanId) {
    sql += ' WHERE d.kecamatan_id = ?';
    params.push(kecamatanId);
  }
  sql += ' ORDER BY k.no_urut ASC, d.no_urut ASC, d.id ASC';
  return db.prepare(sql).all(...params);
}

function saveDesa(data, actorUser = null) {
  const id = data.id ? Number(data.id) : null;
  const cleanNama = (data.nama || '').trim();
  const kecId = Number(data.kecamatan_id);
  const noUrut = data.no_urut ? Number(data.no_urut) : null;
  const tps = parseIndonesianNumber(data.tps) || 0;
  const kotak = parseIndonesianNumber(data.kotak) !== null ? parseIndonesianNumber(data.kotak) : tps;
  const pantarlih = parseIndonesianNumber(data.pantarlih) !== null ? parseIndonesianNumber(data.pantarlih) : (tps * 2);
  const pemilih = parseIndonesianNumber(data.pemilih) !== null ? parseIndonesianNumber(data.pemilih) : 0;
  const rohaniwan = parseIndonesianNumber(data.rohaniwan) !== null ? parseIndonesianNumber(data.rohaniwan) : 1;
  const ketua = (data.ketua_nama || '').trim();
  const sekretaris = (data.sekretaris_nama || '').trim();
  const nip = (data.sekretaris_nip || '').trim();

  if (!cleanNama) throw new Error('Nama desa tidak boleh kosong.');
  if (!kecId) throw new Error('Kecamatan wajib dipilih.');

  if (id) {
    db.prepare(`
      UPDATE master_desa
      SET no_urut = COALESCE(?, no_urut), kecamatan_id = ?, nama = ?, tps = ?, kotak = ?, pantarlih = ?, pemilih = ?, rohaniwan = ?, ketua_nama = ?, sekretaris_nama = ?, sekretaris_nip = ?
      WHERE id = ?
    `).run(noUrut, kecId, cleanNama, tps, kotak, pantarlih, pemilih, rohaniwan, ketua, sekretaris, nip, id);
  } else {
    db.prepare(`
      INSERT INTO master_desa (no_urut, kecamatan_id, nama, tps, kotak, pantarlih, pemilih, rohaniwan, ketua_nama, sekretaris_nama, sekretaris_nip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(noUrut || 1, kecId, cleanNama, tps, kotak, pantarlih, pemilih, rohaniwan, ketua, sekretaris, nip);
  }

  syncPrimaryKuantitas();
  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  return getDesas();
}

function deleteDesa(id, actorUser = null) {
  db.prepare('DELETE FROM master_desa WHERE id = ?').run(id);
  syncPrimaryKuantitas();
  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}
  return { success: true };
}

function bulkUpsertDesa(items, options = {}) {
  const isPreview = Boolean(options.preview);
  const errors = [];
  const wouldInsert = [];
  const wouldUpdate = [];

  const checkByIdStmt = db.prepare('SELECT id, kecamatan_id FROM master_desa WHERE id = ?');
  const checkByNameKecStmt = db.prepare('SELECT id FROM master_desa WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?)) AND kecamatan_id = ?');
  const checkKecByNameStmt = db.prepare('SELECT id FROM master_kecamatan WHERE LOWER(TRIM(nama)) = LOWER(TRIM(?))');

  const updateStmt = db.prepare(`
    UPDATE master_desa
    SET no_urut = COALESCE(?, no_urut),
        kecamatan_id = ?,
        nama = ?,
        tps = ?,
        kotak = ?,
        pantarlih = ?,
        pemilih = ?,
        rohaniwan = ?,
        ketua_nama = ?,
        sekretaris_nama = ?,
        sekretaris_nip = ?
    WHERE id = ?
  `);

  const insertStmt = db.prepare(`
    INSERT INTO master_desa (no_urut, kecamatan_id, nama, tps, kotak, pantarlih, pemilih, rohaniwan, ketua_nama, sekretaris_nama, sekretaris_nip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const rowNum = idx + 2;
    const cleanNama = (item.nama || '').trim();
    if (!cleanNama) continue;

    let kecId = Number(item.kecamatan_id);
    if (!kecId && item.kecamatan_nama) {
      const foundKec = checkKecByNameStmt.get(item.kecamatan_nama.trim());
      if (foundKec) kecId = foundKec.id;
    }

    if (!kecId) {
      errors.push({
        baris: rowNum,
        nama: cleanNama,
        error: `Kecamatan "${item.kecamatan_nama || item.kecamatan_id || '-'}" tidak ditemukan dalam database master.`
      });
      continue;
    }

    const tps = parseIndonesianNumber(item.tps);
    if (tps === null) {
      errors.push({ baris: rowNum, nama: cleanNama, error: `Jumlah TPS "${item.tps}" tidak valid.` });
      continue;
    }

    const kotak = parseIndonesianNumber(item.kotak) !== null ? parseIndonesianNumber(item.kotak) : tps;
    const pantarlih = parseIndonesianNumber(item.pantarlih) !== null ? parseIndonesianNumber(item.pantarlih) : (tps * 2);
    const pemilih = parseIndonesianNumber(item.pemilih) !== null ? parseIndonesianNumber(item.pemilih) : 0;
    const rohaniwan = parseIndonesianNumber(item.rohaniwan) !== null ? parseIndonesianNumber(item.rohaniwan) : 1;

    let targetId = item.id ? checkByIdStmt.get(item.id)?.id : null;
    if (!targetId) {
      targetId = checkByNameKecStmt.get(cleanNama, kecId)?.id;
    }

    const payload = {
      id: targetId,
      no_urut: item.no_urut ? parseIndonesianNumber(item.no_urut) : null,
      kecamatan_id: kecId,
      nama: cleanNama,
      tps,
      kotak,
      pantarlih,
      pemilih,
      rohaniwan,
      ketua_nama: (item.ketua_nama || '').trim(),
      sekretaris_nama: (item.sekretaris_nama || '').trim(),
      sekretaris_nip: (item.sekretaris_nip || '').trim()
    };

    if (targetId) wouldUpdate.push(payload);
    else wouldInsert.push(payload);
  }

  if (isPreview) {
    return {
      preview: true,
      processed: wouldInsert.length + wouldUpdate.length,
      would_insert: wouldInsert.length,
      would_update: wouldUpdate.length,
      error_count: errors.length,
      errors,
      sample_changes: [...wouldInsert.slice(0, 5), ...wouldUpdate.slice(0, 5)]
    };
  }

  if (errors.length > 0) {
    throw new Error(`Impor Desa dibatalkan: ${errors.length} baris tidak valid. Baris ${errors[0].baris}: ${errors[0].error}`);
  }

  db.exec('BEGIN TRANSACTION');
  try {
    for (const item of wouldUpdate) {
      updateStmt.run(item.no_urut, item.kecamatan_id, item.nama, item.tps, item.kotak, item.pantarlih, item.pemilih, item.rohaniwan, item.ketua_nama, item.sekretaris_nama, item.sekretaris_nip, item.id);
    }
    for (const item of wouldInsert) {
      insertStmt.run(item.no_urut || 1, item.kecamatan_id, item.nama, item.tps, item.kotak, item.pantarlih, item.pemilih, item.rohaniwan, item.ketua_nama, item.sekretaris_nama, item.sekretaris_nip);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  syncPrimaryKuantitas();
  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  return {
    success: true,
    processed: wouldInsert.length + wouldUpdate.length,
    inserted: wouldInsert.length,
    updated: wouldUpdate.length
  };
}

// Master SBM
function getSbmList() {
  return db.prepare('SELECT * FROM master_sbm ORDER BY id ASC').all();
}

function getSbmById(id) {
  return db.prepare('SELECT * FROM master_sbm WHERE id = ?').get(id);
}

function saveSbm(data, actorUser = null) {
  const id = data.id ? Number(data.id) : null;
  const kode_akun = (data.kode_akun || '521211').trim();
  const kategori = (data.kategori || 'Umum').trim();
  const uraian = (data.uraian || '').trim();
  const satuan = (data.satuan || 'OK').trim();
  const harga = parseIndonesianNumber(data.harga_satuan) || 0;
  const ket = (data.keterangan || '').trim();
  const pagu = parseIndonesianNumber(data.pagu_sbm) || harga;
  const regulasi = (data.jenis_regulasi || 'SBM').trim();
  const dasar = (data.dasar_hukum || 'PMK Standar Biaya Masukan').trim();

  if (!uraian) throw new Error('Uraian SBM tidak boleh kosong.');

  if (id) {
    db.prepare(`
      UPDATE master_sbm 
      SET kode_akun = ?, kategori = ?, uraian = ?, satuan = ?, harga_satuan = ?, keterangan = ?, pagu_sbm = ?, jenis_regulasi = ?, dasar_hukum = ?
      WHERE id = ?
    `).run(kode_akun, kategori, uraian, satuan, harga, ket, pagu, regulasi, dasar, id);
    return getSbmById(id);
  } else {
    const res = db.prepare(`
      INSERT INTO master_sbm (kode_akun, kategori, uraian, satuan, harga_satuan, keterangan, pagu_sbm, jenis_regulasi, dasar_hukum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(kode_akun, kategori, uraian, satuan, harga, ket, pagu, regulasi, dasar);
    return getSbmById(res.lastInsertRowid);
  }
}

function deleteSbm(id, actorUser = null) {
  return db.prepare('DELETE FROM master_sbm WHERE id = ?').run(id);
}

function bulkUpsertSbm(rows, options = {}) {
  const isPreview = Boolean(options.preview);
  const errors = [];
  const wouldInsert = [];
  const wouldUpdate = [];

  const checkByIdStmt = db.prepare('SELECT id FROM master_sbm WHERE id = ?');
  const checkByMatchStmt = db.prepare('SELECT id FROM master_sbm WHERE LOWER(TRIM(kategori)) = LOWER(TRIM(?)) AND LOWER(TRIM(uraian)) = LOWER(TRIM(?))');

  const updateStmt = db.prepare(`
    UPDATE master_sbm 
    SET kode_akun = ?, kategori = ?, uraian = ?, satuan = ?, harga_satuan = ?, keterangan = ?, pagu_sbm = ?, jenis_regulasi = ?, dasar_hukum = ?
    WHERE id = ?
  `);
  const insertStmt = db.prepare(`
    INSERT INTO master_sbm (kode_akun, kategori, uraian, satuan, harga_satuan, keterangan, pagu_sbm, jenis_regulasi, dasar_hukum)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let idx = 0; idx < rows.length; idx++) {
    const item = rows[idx];
    const rowNum = idx + 2;
    const cleanUraian = (item.uraian || '').trim();
    if (!cleanUraian) continue;

    const cleanKode = (item.kode_akun || '521211').trim();
    const cleanKat = (item.kategori || 'Umum').trim();
    const cleanSatuan = (item.satuan || 'OK').trim();
    const cleanHarga = parseIndonesianNumber(item.harga_satuan);
    if (cleanHarga === null) {
      errors.push({ baris: rowNum, uraian: cleanUraian, error: `Harga satuan "${item.harga_satuan}" tidak valid.` });
      continue;
    }

    const cleanKet = (item.keterangan || '').trim();
    const cleanPagu = parseIndonesianNumber(item.pagu_sbm) !== null ? parseIndonesianNumber(item.pagu_sbm) : cleanHarga;
    const cleanJenis = (item.jenis_regulasi || 'SBM').trim();
    const cleanDasar = (item.dasar_hukum || 'PMK Standar Biaya Masukan').trim();

    let targetId = item.id ? checkByIdStmt.get(item.id)?.id : null;
    if (!targetId) {
      targetId = checkByMatchStmt.get(cleanKat, cleanUraian)?.id;
    }

    const payload = {
      id: targetId,
      kode_akun: cleanKode,
      kategori: cleanKat,
      uraian: cleanUraian,
      satuan: cleanSatuan,
      harga_satuan: cleanHarga,
      keterangan: cleanKet,
      pagu_sbm: cleanPagu,
      jenis_regulasi: cleanJenis,
      dasar_hukum: cleanDasar
    };

    if (targetId) wouldUpdate.push(payload);
    else wouldInsert.push(payload);
  }

  if (isPreview) {
    return {
      preview: true,
      processed: wouldInsert.length + wouldUpdate.length,
      would_insert: wouldInsert.length,
      would_update: wouldUpdate.length,
      error_count: errors.length,
      errors,
      sample_changes: [...wouldInsert.slice(0, 5), ...wouldUpdate.slice(0, 5)]
    };
  }

  if (errors.length > 0) {
    throw new Error(`Impor SBM dibatalkan: ${errors.length} baris tidak valid. Baris ${errors[0].baris}: ${errors[0].error}`);
  }

  db.exec('BEGIN TRANSACTION');
  try {
    for (const item of wouldUpdate) {
      updateStmt.run(item.kode_akun, item.kategori, item.uraian, item.satuan, item.harga_satuan, item.keterangan, item.pagu_sbm, item.jenis_regulasi, item.dasar_hukum, item.id);
    }
    for (const item of wouldInsert) {
      insertStmt.run(item.kode_akun, item.kategori, item.uraian, item.satuan, item.harga_satuan, item.keterangan, item.pagu_sbm, item.jenis_regulasi, item.dasar_hukum);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { success: true, processed: wouldInsert.length + wouldUpdate.length, inserted: wouldInsert.length, updated: wouldUpdate.length };
}

// Master Akun (BAS)
function getAkunList() {
  return db.prepare('SELECT * FROM master_akun ORDER BY kode ASC').all();
}

function getAkunById(id) {
  return db.prepare('SELECT * FROM master_akun WHERE id = ?').get(id);
}

function saveAkun(data, actorUser = null) {
  const id = data.id ? Number(data.id) : null;
  const cleanKode = (data.kode || '').trim();
  const cleanUraian = (data.uraian || '').trim();
  const cleanKelompok = (data.kelompok || '521 - Belanja Barang').trim();
  const cleanKategori = (data.kategori_dn || cleanKode).trim();
  const cleanKet = (data.keterangan || '').trim();

  if (!cleanKode) throw new Error('Kode akun tidak boleh kosong.');
  if (!cleanUraian) throw new Error('Uraian akun tidak boleh kosong.');

  if (id) {
    db.prepare(`
      UPDATE master_akun
      SET kode = ?, uraian = ?, kelompok = ?, kategori_dn = ?, keterangan = ?
      WHERE id = ?
    `).run(cleanKode, cleanUraian, cleanKelompok, cleanKategori, cleanKet, id);
    return getAkunById(id);
  } else {
    const existing = db.prepare('SELECT id FROM master_akun WHERE kode = ?').get(cleanKode);
    if (existing) {
      db.prepare(`
        UPDATE master_akun
        SET uraian = ?, kelompok = ?, kategori_dn = ?, keterangan = ?
        WHERE id = ?
      `).run(cleanUraian, cleanKelompok, cleanKategori, cleanKet, existing.id);
      return getAkunById(existing.id);
    } else {
      const info = db.prepare(`
        INSERT INTO master_akun (kode, uraian, kelompok, kategori_dn, keterangan)
        VALUES (?, ?, ?, ?, ?)
      `).run(cleanKode, cleanUraian, cleanKelompok, cleanKategori, cleanKet);
      return getAkunById(info.lastInsertRowid);
    }
  }
}

function deleteAkun(id, actorUser = null) {
  return db.prepare('DELETE FROM master_akun WHERE id = ?').run(id);
}

function bulkUpsertAkun(rows, options = {}) {
  const isPreview = Boolean(options.preview);
  const errors = [];
  const wouldInsert = [];
  const wouldUpdate = [];

  const checkByKode = db.prepare('SELECT id FROM master_akun WHERE kode = ?');
  const updateStmt = db.prepare(`
    UPDATE master_akun
    SET uraian = ?, kelompok = ?, kategori_dn = ?, keterangan = ?
    WHERE id = ?
  `);
  const insertStmt = db.prepare(`
    INSERT INTO master_akun (kode, uraian, kelompok, kategori_dn, keterangan)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (let idx = 0; idx < rows.length; idx++) {
    const item = rows[idx];
    const rowNum = idx + 2;
    const cleanKode = (item.kode || '').trim();
    const cleanUraian = (item.uraian || '').trim();
    if (!cleanKode && !cleanUraian) continue;
    if (!cleanKode || !cleanUraian) {
      errors.push({ baris: rowNum, error: 'Kode dan uraian akun wajib diisi.' });
      continue;
    }

    const cleanKelompok = (item.kelompok || '521 - Belanja Barang').trim();
    const cleanKategori = (item.kategori_dn || cleanKode).trim();
    const cleanKet = (item.keterangan || '').trim();

    const existing = checkByKode.get(cleanKode);
    const payload = {
      id: existing ? existing.id : null,
      kode: cleanKode,
      uraian: cleanUraian,
      kelompok: cleanKelompok,
      kategori_dn: cleanKategori,
      keterangan: cleanKet
    };

    if (existing) wouldUpdate.push(payload);
    else wouldInsert.push(payload);
  }

  if (isPreview) {
    return {
      preview: true,
      processed: wouldInsert.length + wouldUpdate.length,
      would_insert: wouldInsert.length,
      would_update: wouldUpdate.length,
      error_count: errors.length,
      errors,
      sample_changes: [...wouldInsert.slice(0, 5), ...wouldUpdate.slice(0, 5)]
    };
  }

  if (errors.length > 0) {
    throw new Error(`Impor Akun dibatalkan: ${errors.length} baris tidak valid.`);
  }

  db.exec('BEGIN TRANSACTION');
  try {
    for (const item of wouldUpdate) {
      updateStmt.run(item.uraian, item.kelompok, item.kategori_dn, item.keterangan, item.id);
    }
    for (const item of wouldInsert) {
      insertStmt.run(item.kode, item.uraian, item.kelompok, item.kategori_dn, item.keterangan);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { success: true, processed: wouldInsert.length + wouldUpdate.length, inserted: wouldInsert.length, updated: wouldUpdate.length };
}

// Download Requests
function createDownloadRequest({ nama_file, tipe_unduhan, periode_id, filter_pic, filter_sasaran, user_id, username }) {
  const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const dateObj = new Date();
  const requestTime = formatWaktuSakti(dateObj);
  const expiresAt = new Date(dateObj.getTime() + 60 * 60 * 1000).toISOString();

  const stmt = db.prepare(`
    INSERT INTO download_requests (
      request_id, nama_file, tipe_unduhan, periode_id, filter_pic, filter_sasaran,
      request_time, status, expires_at, user_id, username
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DIPROSES', ?, ?, ?)
  `);

  const res = stmt.run(
    reqId,
    nama_file,
    tipe_unduhan || 'EXCEL_RKB',
    periode_id ? Number(periode_id) : null,
    filter_pic ? normalizePic(filter_pic) : 'SEMUA',
    filter_sasaran || 'ALL',
    requestTime,
    expiresAt,
    user_id || null,
    username || null
  );

  return getDownloadRequestById(res.lastInsertRowid);
}

function getDownloadRequests({ search = '', tanggal_mulai = '', tanggal_selesai = '', username = '' } = {}) {
  // 1. Bersihkan riwayat & berkas kadaluarsa secara proaktif dan otomatis
  cleanupExpiredDownloads();

  // 2. Isolasi ketat: jika username tidak ada, tolak / kembalikan kosong
  if (!username) {
    return [];
  }

  const now = new Date().toISOString();
  // Setiap user HANYA melihat riwayat unduhannya sendiri (tidak ada akses ke unduhan user lain)
  let sql = "SELECT * FROM download_requests WHERE username = ? AND status != 'KADALUARSA' AND (expires_at IS NULL OR expires_at >= ?)";
  const params = [username, now];

  if (search) {
    sql += ' AND (nama_file LIKE ? OR filter_pic LIKE ? OR request_id LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (tanggal_mulai) {
    sql += ' AND created_at >= ?';
    params.push(tanggal_mulai);
  }

  if (tanggal_selesai) {
    sql += ' AND created_at <= ?';
    params.push(`${tanggal_selesai} 23:59:59`);
  }

  sql += ' ORDER BY id DESC LIMIT 100';
  return db.prepare(sql).all(...params);
}

function getDownloadRequestById(id) {
  return db.prepare('SELECT * FROM download_requests WHERE id = ?').get(id);
}

function updateDownloadRequest(id, fields) {
  const updates = [];
  const params = [];

  for (const [key, val] of Object.entries(fields)) {
    updates.push(`${key} = ?`);
    params.push(val);
  }
  params.push(id);

  db.prepare(`UPDATE download_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  return getDownloadRequestById(id);
}

function cleanupExpiredDownloads() {
  const now = new Date().toISOString();
  // Ambil semua permintaan unduhan yang telah kadaluarsa (melewati expires_at atau berstatus KADALUARSA)
  const expired = db.prepare(`
    SELECT * FROM download_requests 
    WHERE (expires_at IS NOT NULL AND expires_at < ?) OR status = 'KADALUARSA'
  `).all(now);

  let cleaned = 0;
  for (const row of expired) {
    if (row.file_path && fs.existsSync(row.file_path)) {
      try {
        fs.unlinkSync(row.file_path);
        cleaned++;
      } catch (e) {}
    }
  }

  // Hapus riwayat secara permanen dari database agar tidak mengotori tabel riwayat unduhan
  db.prepare(`
    DELETE FROM download_requests 
    WHERE (expires_at IS NOT NULL AND expires_at < ?) OR status = 'KADALUARSA'
  `).run(now);

  return cleaned;
}

// Subbag Usulan Revisi
function getSubbagUsulanList(periodeId) {
  const usulans = db.prepare('SELECT * FROM subbag_usulan_revisi WHERE periode_id = ?').all(periodeId);
  const bySubbag = {};
  usulans.forEach(u => { bySubbag[u.subbag] = u; });

  const allSubbags = ['KUL', 'RENDATIN', 'TEKNIS', 'HUKUM', 'PARSDM'];
  return allSubbags.map(s => {
    if (bySubbag[s]) return bySubbag[s];
    return {
      periode_id: periodeId,
      subbag: s,
      status: 'DRAFT',
      gdrive_link: '',
      catatan_usulan: '',
      alasan_pengembalian: '',
      catatan_pleno: '',
      total_semula: 0,
      total_menjadi: 0,
      submitted_at: '',
      submitted_by: '',
      validated_at: '',
      validated_by: ''
    };
  });
}

function getSubbagUsulan(periodeId, subbag) {
  const cleanSubbag = normalizePic(subbag);
  return db.prepare('SELECT * FROM subbag_usulan_revisi WHERE periode_id = ? AND subbag = ?').get(periodeId, cleanSubbag);
}

function submitSubbagUsulan({ periodeId, subbag, gdrive_link, catatan_usulan, user, total_semula = 0, total_menjadi = 0 }) {
  const cleanSubbag = normalizePic(subbag);
  const now = formatWaktuSakti();
  const submitter = user ? `${user.nama_pejabat} (${user.username})` : 'PIC Subbag';

  db.prepare(`
    INSERT INTO subbag_usulan_revisi (
      periode_id, subbag, status, gdrive_link, catatan_usulan,
      total_semula, total_menjadi, submitted_at, submitted_by, updated_at
    ) VALUES (?, ?, 'DIAJUKAN', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(periode_id, subbag) DO UPDATE SET
      status = 'DIAJUKAN',
      gdrive_link = excluded.gdrive_link,
      catatan_usulan = excluded.catatan_usulan,
      total_semula = excluded.total_semula,
      total_menjadi = excluded.total_menjadi,
      submitted_at = excluded.submitted_at,
      submitted_by = excluded.submitted_by,
      alasan_pengembalian = '',
      updated_at = CURRENT_TIMESTAMP
  `).run(
    periodeId, cleanSubbag, gdrive_link || '', catatan_usulan || '',
    total_semula, total_menjadi, now, submitter
  );

  return getSubbagUsulan(periodeId, cleanSubbag);
}

function validateSubbagUsulan({ periodeId, subbag, user }) {
  const cleanSubbag = normalizePic(subbag);
  const now = formatWaktuSakti();
  const validator = user ? `${user.nama_pejabat} (${user.username})` : 'Tim Rendatin';

  db.prepare(`
    UPDATE subbag_usulan_revisi SET
      status = 'DIVALIDASI',
      validated_at = ?,
      validated_by = ?,
      alasan_pengembalian = '',
      updated_at = CURRENT_TIMESTAMP
    WHERE periode_id = ? AND subbag = ?
  `).run(now, validator, periodeId, cleanSubbag);

  return getSubbagUsulan(periodeId, cleanSubbag);
}

function rejectSubbagUsulan({ periodeId, subbag, alasan_pengembalian, user }) {
  const cleanSubbag = normalizePic(subbag);
  const now = formatWaktuSakti();
  const validator = user ? `${user.nama_pejabat} (${user.username})` : 'Tim Rendatin';

  db.prepare(`
    UPDATE subbag_usulan_revisi SET
      status = 'DIKEMBALIKAN',
      alasan_pengembalian = ?,
      validated_at = ?,
      validated_by = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE periode_id = ? AND subbag = ?
  `).run(alasan_pengembalian || 'Perlu perbaikan usulan anggaran', now, validator, periodeId, cleanSubbag);

  return getSubbagUsulan(periodeId, cleanSubbag);
}

function saveCatatanPlenoSubbag({ periodeId, subbag, catatan_pleno, user }) {
  const cleanSubbag = normalizePic(subbag);
  db.prepare(`
    UPDATE subbag_usulan_revisi SET
      catatan_pleno = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE periode_id = ? AND subbag = ?
  `).run(catatan_pleno || '', periodeId, cleanSubbag);

  return getSubbagUsulan(periodeId, cleanSubbag);
}

function approveAllSubbagPleno(periodeId) {
  db.prepare(`
    UPDATE subbag_usulan_revisi SET
      status = 'DISETUJUI_PLENO',
      updated_at = CURRENT_TIMESTAMP
    WHERE periode_id = ? AND status IN ('DIVALIDASI', 'DIAJUKAN')
  `).run(periodeId);
}

// Siklus Revisi Mandiri SAKTI (4 Tahap)
function generateNextKodeRevisi(tahun = 2026, kodeSatker = '657811') {
  const prefix = `${tahun}.${kodeSatker}.`;
  const allCodes = db.prepare('SELECT kode_revisi FROM revisi_pengajuan WHERE kode_revisi LIKE ?').all(`${prefix}%`);
  let maxSeq = 0;
  for (const row of allCodes) {
    if (row.kode_revisi && row.kode_revisi.startsWith(prefix)) {
      const seqStr = row.kode_revisi.substring(prefix.length);
      const seqNum = parseInt(seqStr, 10);
      if (!Number.isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }
  const nextSeq = maxSeq + 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

function createRevisiPengajuan(data, user) {
  const subbag = normalizePic(data.subbag || (user ? user.pic_subbag : 'RENDATIN') || 'RENDATIN');
  if (user && user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
    const userSub = normalizePic(user.pic_subbag);
    if (userSub !== subbag) {
      throw new Error(`Akses ditolak. Operator ${userSub} tidak berhak mengajukan usulan untuk ${subbag}.`);
    }
  }

  const nomorSurat = (data.nomor_surat || '').trim();
  const tanggalSurat = (data.tanggal_surat || '').trim();
  const perihal = (data.perihal || '').trim();
  const docSurat = (data.dokumen_surat_link || '').trim();
  const docMatriks = (data.dokumen_matriks_link || '').trim();

  if (!nomorSurat) throw new Error('Nomor surat / nota dinas usulan revisi wajib diisi.');
  if (!tanggalSurat) throw new Error('Tanggal surat usulan revisi wajib diisi.');
  if (!perihal) throw new Error('Perihal usulan revisi wajib diisi.');
  if (!docSurat) throw new Error('Dokumen Nota Dinas usulan revisi wajib dilampirkan.');
  if (!docMatriks) throw new Error('Dokumen RKB PIC yang sudah ditandatangani wajib dilampirkan.');

  const tahun = data.tahun_anggaran ? Number(data.tahun_anggaran) : 2026;
  const kodeSatker = data.kode_satker || '657811';
  const namaSatker = data.nama_satker || 'KPU KABUPATEN NGAWI';
  const pejabatPengusul = data.pejabat_pengusul || (user && user.nama_pejabat ? user.nama_pejabat : 'Kasubbag Pemrakarsa');
  const jabatanPengusul = data.jabatan_pengusul || (user && user.jabatan ? user.jabatan : `Kasubbag ${subbag}`);

  const totalSemula = Number(data.total_semula) || 0;
  const totalMenjadi = Number(data.total_menjadi) || totalSemula;
  const selisih = totalMenjadi - totalSemula;
  const waktuNow = formatWaktuSakti();
  const submitter = user ? `${user.nama_pejabat || user.username} (${user.username})` : pejabatPengusul;

  // 1. Tentukan siklus berjalan (atau buat baru jika belum ada)
  let cycle = null;
  if (data.periode_id) {
    cycle = getPeriodeById(Number(data.periode_id));
    if (!cycle || cycle.is_locked === 1) cycle = null;
  }
  if (!cycle) {
    cycle = getOrCreateRevisionCycle(user);
  }
  const periodeId = cycle.id;

  db.exec('BEGIN IMMEDIATE');
  try {
    // 2. Cek apakah subbag ini sudah punya pengajuan dalam siklus ini
    const existing = db.prepare('SELECT * FROM revisi_pengajuan WHERE periode_id = ? AND subbag = ?').get(periodeId, subbag);

    let proposalId = null;
    let kodeRevisi = null;

    if (existing) {
      // Jika statusnya DIKEMBALIKAN atau DRAFT, ini adalah pengajuan ulang / pembaruan yang sah
      if (existing.status_tahap === 'DIKEMBALIKAN' || existing.status_tahap === 'DRAFT') {
        proposalId = existing.id;
        kodeRevisi = existing.kode_revisi;

        db.prepare(`
          UPDATE revisi_pengajuan SET
            nomor_surat = ?,
            tanggal_surat = ?,
            perihal = ?,
            pejabat_pengusul = ?,
            jabatan_pengusul = ?,
            dokumen_surat_link = ?,
            dokumen_matriks_link = ?,
            dokumen_dukung_lain = COALESCE(?, dokumen_dukung_lain),
            total_semula = ?,
            total_menjadi = ?,
            selisih = ?,
            tahap_terkini = 1,
            status_tahap = 'DIAJUKAN',
            tahap1_waktu = ?,
            tahap1_oleh = ?,
            tahap1_catatan = ?,
            alasan_pengembalian = '',
            tahap2_hasil = '',
            tahap2_catatan = '',
            tahap3_hasil = '',
            tahap3_catatan = '',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          nomorSurat, tanggalSurat, perihal,
          pejabatPengusul, jabatanPengusul,
          docSurat, docMatriks, data.dokumen_dukung_lain || '',
          totalSemula, totalMenjadi, selisih,
          waktuNow, submitter, data.catatan_usulan || 'Pengajuan ulang pasca perbaikan',
          proposalId
        );

        logRevisiHistory({
          pengajuan_id: proposalId,
          periode_id: periodeId,
          subbag,
          tahap: 1,
          status: 'DIAJUKAN',
          aksi: 'PENGAJUAN_ULANG',
          catatan: data.catatan_usulan || 'Pengajuan ulang usulan revisi pasca perbaikan oleh PIC.',
          dokumen_surat_link: docSurat,
          dokumen_matriks_link: docMatriks,
          total_semula: totalSemula,
          total_menjadi: totalMenjadi,
          selisih,
          user
        });
      } else {
        throw new Error(`Subbagian ${subbag} sudah memiliki pengajuan aktif dalam siklus ini (Status: ${existing.status_tahap}). Pengajuan ganda tidak diizinkan.`);
      }
    } else {
      kodeRevisi = generateNextKodeRevisi(tahun, kodeSatker);
      const res = db.prepare(`
        INSERT INTO revisi_pengajuan (
          kode_revisi, periode_id, subbag, tahun_anggaran, kode_satker, nama_satker,
          nomor_surat, tanggal_surat, perihal, pejabat_pengusul, jabatan_pengusul,
          nama_kpa, kewenangan, jenis_revisi, keterangan_revisi,
          dokumen_surat_link, dokumen_matriks_link, dokumen_dukung_lain, validasi_sbm,
          dokumen_surat_original_link, dokumen_matriks_original_link,
          total_semula, total_menjadi, selisih,
          tahap_terkini, status_tahap,
          tahap1_waktu, tahap1_oleh, tahap1_catatan,
          alasan_pengembalian,
          is_locked
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?,
          ?, ?, ?,
          1, 'DIAJUKAN',
          ?, ?, ?,
          '',
          0
        )
      `).run(
        kodeRevisi, periodeId, subbag, tahun, kodeSatker, namaSatker,
        nomorSurat, tanggalSurat, perihal, pejabatPengusul, jabatanPengusul,
        data.nama_kpa || 'Sekretaris KPU Kabupaten Ngawi',
        data.kewenangan || 'KPU Kabupaten Ngawi',
        data.jenis_revisi || 'Pergeseran Antar Rincian Output',
        data.keterangan_revisi || '',
        docSurat, docMatriks, data.dokumen_dukung_lain || '',
        data.validasi_sbm || 'OK',
        docSurat, docMatriks,
        totalSemula, totalMenjadi, selisih,
        waktuNow, submitter, data.catatan_usulan || 'Pengajuan usulan revisi anggaran belanja subbagian'
      );
      proposalId = res.lastInsertRowid;

      logRevisiHistory({
        pengajuan_id: proposalId,
        periode_id: periodeId,
        subbag,
        tahap: 1,
        status: 'DIAJUKAN',
        aksi: 'PENGAJUAN_BARU',
        catatan: data.catatan_usulan || 'Pengajuan usulan revisi perdana oleh PIC.',
        dokumen_surat_link: docSurat,
        dokumen_matriks_link: docMatriks,
        total_semula: totalSemula,
        total_menjadi: totalMenjadi,
        selisih,
        user
      });
    }

    db.exec('COMMIT');

    recordAuditLog({
      user,
      action: 'CREATE_REVISI_PENGAJUAN',
      entity: 'revisi_pengajuan',
      entity_id: proposalId,
      new_values: { kode_revisi: kodeRevisi, subbag, nomor_surat: nomorSurat, perihal },
      notes: `Pengajuan usulan revisi ${kodeRevisi} untuk subbagian ${subbag} diajukan ke Rendatin.`
    });

    return getRevisiPengajuanById(proposalId);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function getRevisiPengajuanList({ subbag = '', status = '', search = '', periode_id = null } = {}) {
  let query = 'SELECT * FROM revisi_pengajuan WHERE 1=1';
  const params = [];

  if (periode_id) {
    query += ' AND (periode_id = ? OR periode_id IS NULL)';
    params.push(Number(periode_id));
  }

  const cleanSub = subbag ? normalizePic(subbag) : '';
  if (cleanSub && cleanSub !== 'SEMUA') {
    query += ' AND UPPER(subbag) = ?';
    params.push(cleanSub);
  }

  if (status) {
    query += ' AND status_tahap = ?';
    params.push(status);
  }

  if (search) {
    query += ' AND (kode_revisi LIKE ? OR nomor_surat LIKE ? OR perihal LIKE ? OR pejabat_pengusul LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ' ORDER BY id DESC';
  return db.prepare(query).all(...params);
}

function getRevisiPengajuanById(id) {
  return db.prepare('SELECT * FROM revisi_pengajuan WHERE id = ?').get(Number(id));
}

function updateRevisiTahap(id, { tahap, aksi, catatan = '', nomor_penetapan = '', tanggal_penetapan = '', user = null }) {
  const rev = getRevisiPengajuanById(id);
  if (!rev) throw new Error('Data pengajuan revisi tidak ditemukan.');

  if (rev.is_locked === 1 || rev.status_tahap === 'SELESAI') {
    throw new Error('Pengajuan revisi ini sudah disahkan (Tahap 4) dan terkunci, tidak dapat diproses ulang.');
  }

  const targetTahap = Number(tahap);
  const waktuNow = formatWaktuSakti();
  const userName = user ? `${user.nama_pejabat || user.username} (${user.username})` : 'Tim Rendatin';

  if (targetTahap === 2) {
    // Validasi L1
    if (user && user.level > 1 && !user.is_developer) {
      throw new Error('Akses ditolak. Validasi Tahap 2 hanya berhak diproses oleh Tim Rendatin / Perencanaan.');
    }
    if (rev.tahap_terkini < 1 && rev.status_tahap !== 'DIAJUKAN') {
      throw new Error('Pengajuan revisi belum diajukan oleh PIC (belum memenuhi Tahap 1).');
    }

    const isApproved = aksi === 'SETUJU';
    if (isApproved) {
      db.prepare(`
        UPDATE revisi_pengajuan SET
          tahap_terkini = 2,
          status_tahap = 'MENUNGGU_PLENO',
          tahap2_waktu = ?,
          tahap2_oleh = ?,
          tahap2_hasil = 'SETUJU',
          tahap2_catatan = ?,
          alasan_pengembalian = '',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(waktuNow, userName, catatan || 'Dokumen lengkap dan terverifikasi, diteruskan ke Rapat Pleno.', id);

      logRevisiHistory({
        pengajuan_id: id,
        periode_id: rev.periode_id,
        subbag: rev.subbag,
        tahap: 2,
        status: 'MENUNGGU_PLENO',
        aksi: 'VALIDASI_SETUJU',
        catatan: catatan || 'Validasi L1 disetujui, lanjut ke Pleno.',
        user
      });
    } else {
      // Dikembalikan untuk Perbaikan
      const reason = (catatan || '').trim();
      if (!reason) throw new Error('Alasan pengembalian untuk perbaikan wajib diisi.');

      db.prepare(`
        UPDATE revisi_pengajuan SET
          tahap_terkini = 1,
          status_tahap = 'DIKEMBALIKAN',
          tahap2_waktu = ?,
          tahap2_oleh = ?,
          tahap2_hasil = 'DIKEMBALIKAN',
          tahap2_catatan = ?,
          alasan_pengembalian = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(waktuNow, userName, reason, reason, id);

      logRevisiHistory({
        pengajuan_id: id,
        periode_id: rev.periode_id,
        subbag: rev.subbag,
        tahap: 2,
        status: 'DIKEMBALIKAN',
        aksi: 'DIKEMBALIKAN_PERBAIKAN',
        catatan: reason,
        alasan_pengembalian: reason,
        user
      });
    }

  } else if (targetTahap === 3) {
    // Pleno ACC (dicatat oleh L1 dalam sistem, komisioner untuk pemantauan/sidang)
    if (user && user.level > 1 && !user.is_developer) {
      throw new Error('Akses ditolak. Pencatatan hasil Pleno Tahap 3 dilakukan oleh Tim Rendatin / Perencanaan.');
    }
    if (rev.status_tahap !== 'MENUNGGU_PLENO' && rev.tahap2_hasil !== 'SETUJU') {
      throw new Error('Pengajuan usulan revisi harus melalui penelitian & validasi (Tahap 2) terlebih dahulu sebelum diteruskan ke Pleno (Tahap 3).');
    }

    const isApproved = aksi === 'SETUJU';
    if (isApproved) {
      db.prepare(`
        UPDATE revisi_pengajuan SET
          tahap_terkini = 3,
          status_tahap = 'ACC_PLENO',
          tahap3_waktu = ?,
          tahap3_oleh = ?,
          tahap3_hasil = 'SETUJU',
          tahap3_catatan = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(waktuNow, userName, catatan || 'Disetujui dalam Sidang Pleno Komisioner.', id);

      logRevisiHistory({
        pengajuan_id: id,
        periode_id: rev.periode_id,
        subbag: rev.subbag,
        tahap: 3,
        status: 'ACC_PLENO',
        aksi: 'ACC_PLENO',
        catatan: catatan || 'Hasil Sidang Pleno: Disetujui (ACC Pleno).',
        user
      });
    } else {
      // Pleno mengembalikan untuk perbaikan
      const reason = (catatan || '').trim();
      if (!reason) throw new Error('Alasan pengembalian untuk perbaikan wajib diisi.');

      db.prepare(`
        UPDATE revisi_pengajuan SET
          tahap_terkini = 1,
          status_tahap = 'DIKEMBALIKAN',
          tahap3_waktu = ?,
          tahap3_oleh = ?,
          tahap3_hasil = 'DIKEMBALIKAN',
          tahap3_catatan = ?,
          alasan_pengembalian = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(waktuNow, userName, reason, reason, id);

      logRevisiHistory({
        pengajuan_id: id,
        periode_id: rev.periode_id,
        subbag: rev.subbag,
        tahap: 3,
        status: 'DIKEMBALIKAN',
        aksi: 'PLENO_MENGEMBALIKAN',
        catatan: reason,
        alasan_pengembalian: reason,
        user
      });
    }

  } else if (targetTahap === 4) {
    throw new Error('Tahap 4 (Pengesahan Gabungan & BA Pleno) dilakukan untuk seluruh pengajuan dalam siklus sekaligus melalui menu Pengesahan Gabungan.');
  }

  recordAuditLog({
    user,
    action: `UPDATE_REVISI_TAHAP_${targetTahap}`,
    entity: 'revisi_pengajuan',
    entity_id: id,
    notes: `Tahap ${targetTahap} revisi [${rev.kode_revisi}] diproses: aksi ${aksi || 'SETUJU'}.`
  });

  return getRevisiPengajuanById(id);
}

function deleteRevisiPengajuan(id, user = null) {
  const rev = getRevisiPengajuanById(id);
  if (!rev) throw new Error('Data usulan revisi tidak ditemukan.');

  if (rev.status_tahap === 'SELESAI' || rev.is_locked === 1) {
    throw new Error('Usulan revisi yang telah disahkan (Tahap 4) tidak dapat dibatalkan atau dihapus.');
  }

  // Pengajuan yang sudah masuk ke siklus (DIAJUKAN, MENUNGGU_PLENO, ACC_PLENO, DIKEMBALIKAN) tidak boleh dihapus untuk mengakali syarat pengesahan siklus
  if (rev.status_tahap !== 'DRAFT') {
    throw new Error(`Pengajuan revisi yang telah masuk ke siklus (Status: ${rev.status_tahap}) tidak dapat dihapus untuk melewati proses pengesahan. Koordinasikan dengan L1 untuk dikembalikan bagi perbaikan.`);
  }

  db.prepare('DELETE FROM revisi_pengajuan WHERE id = ?').run(id);
  try {
    db.prepare('DELETE FROM revisi_pengajuan_log WHERE pengajuan_id = ?').run(id);
  } catch (e) {}

  recordAuditLog({
    user,
    action: 'DELETE_REVISI_PENGAJUAN',
    entity: 'revisi_pengajuan',
    entity_id: id,
    old_values: { kode_revisi: rev.kode_revisi, subbag: rev.subbag, perihal: rev.perihal },
    notes: `Usulan revisi ${rev.kode_revisi} dibatalkan.`
  });

  return { success: true };
}

function finalizeTahap4Keseluruhan({ nomor_ba, tanggal_ba, link_scan_ba = '', catatan = '', user = null }) {
  const noBa = (nomor_ba || '').trim();
  const tglBa = (tanggal_ba || '').trim();
  if (!noBa) throw new Error('Nomor Berita Acara Pleno (BA Pleno) wajib diisi.');
  if (!tglBa) throw new Error('Tanggal Berita Acara Pleno wajib diisi.');

  const waktuNow = formatWaktuSakti();
  const userName = user ? `${user.nama_pejabat || user.username} (${user.username})` : 'Tim Rendatin & Pleno KPU';

  db.exec('BEGIN IMMEDIATE');
  try {
    // 1. Dapatkan siklus revisi berjalan
    const cycle = getActiveRevisionCycle();
    if (!cycle) throw new Error('Tidak ada siklus revisi aktif yang siap disahkan.');
    if (cycle.is_locked === 1) throw new Error('Dokumen RKB siklus ini sudah berstatus terkunci.');

    // 2. Ambil seluruh pengajuan dalam siklus ini
    const proposals = db.prepare('SELECT * FROM revisi_pengajuan WHERE periode_id = ?').all(cycle.id);
    if (proposals.length === 0) {
      throw new Error('Pengesahan gabungan ditolak: Siklus ini belum memiliki pengajuan PIC untuk disahkan.');
    }

    // 3. Pastikan SEMUA pengajuan yang masuk berstatus ACC Pleno
    const pending = proposals.filter(p => p.status_tahap !== 'ACC_PLENO');
    if (pending.length > 0) {
      const details = pending.map(p => `${p.subbag} (${p.status_tahap})`).join(', ');
      throw new Error(`Pengesahan gabungan ditolak: Masih terdapat pengajuan yang belum berstatus ACC Pleno: ${details}.`);
    }

    // 4. Kunci dokumen RKB siklus ini
    db.prepare(`
      UPDATE periode_anggaran SET
        is_locked = 1,
        locked_at = ?,
        dasar_pengesahan = 'BA Pleno Komisioner',
        nomor_ba_tapd = ?,
        tanggal_ba_tapd = ?,
        catatan_revisi = ?,
        file_pendukung_path = ?,
        catatan_pleno = ?
      WHERE id = ?
    `).run(
      new Date().toISOString(),
      noBa,
      tglBa,
      catatan || `Pengesahan Berita Acara Pleno ${noBa}`,
      link_scan_ba,
      catatan,
      cycle.id
    );

    // 5. Finalisasi seluruh pengajuan dalam siklus
    db.prepare(`
      UPDATE revisi_pengajuan SET
        tahap_terkini = 4,
        status_tahap = 'SELESAI',
        tahap4_waktu = ?,
        tahap4_oleh = ?,
        nomor_penetapan = ?,
        tanggal_penetapan = ?,
        tahap4_catatan = ?,
        is_locked = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE periode_id = ?
    `).run(waktuNow, userName, noBa, tglBa, catatan || 'Disahkan berdasarkan Berita Acara Pleno.', cycle.id);

    // 6. Simpan snapshot arsip
    savePeriodeSnapshot(cycle.id, user, false, `Pengesahan Tahap 4 Keseluruhan BA Pleno ${noBa}`);

    // 7. Catat log riwayat pengesahan untuk setiap pengajuan
    for (const p of proposals) {
      logRevisiHistory({
        pengajuan_id: p.id,
        periode_id: cycle.id,
        subbag: p.subbag,
        tahap: 4,
        status: 'SELESAI',
        aksi: 'PENGESAHAN_BA_PLENO',
        catatan: `Disahkan melalui BA Pleno No: ${noBa} tanggal ${tglBa}.`,
        user
      });
    }

    // Sesuai aturan bisnis: jangan otomatis membuat siklus/pengajuan kosong berikutnya.
    // Siklus berikutnya akan dimulai saat ada pengajuan L2 berikutnya.

    db.exec('COMMIT');

    try {
      const { clearRkbDatasetCache } = require('./calculation');
      clearRkbDatasetCache();
    } catch (e) {}

    recordAuditLog({
      user,
      action: 'FINALIZE_TAHAP4_KESELURUHAN',
      entity: 'periode_anggaran',
      entity_id: cycle.id,
      new_values: { nomor_ba: noBa, tanggal_ba: tglBa, total_proposals: proposals.length },
      notes: `Pengesahan Berita Acara Pleno ${noBa} selesai. RKB ${cycle.nama_periode} resmi dikunci menjadi dasar anggaran berikutnya.`
    });

    return {
      success: true,
      locked_periode: getPeriodeById(cycle.id),
      nomor_ba: noBa,
      tanggal_ba: tglBa,
      total_pengajuan: proposals.length
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

function getRevisionCycleStatus(periodeId = null) {
  const baseRatified = getLatestRatifiedPeriode();
  let activeCycle = null;
  if (periodeId) {
    activeCycle = getPeriodeById(Number(periodeId));
  } else {
    activeCycle = getActiveRevisionCycle();
  }

  const allSubbags = ['KUL', 'RENDATIN', 'TEKNIS', 'HUKUM', 'PARSDM'];
  const proposals = activeCycle
    ? db.prepare('SELECT * FROM revisi_pengajuan WHERE periode_id = ? ORDER BY id ASC').all(activeCycle.id)
    : [];

  const proposalBySubbag = {};
  proposals.forEach(p => {
    proposalBySubbag[p.subbag] = p;
  });

  const subbagStatus = {};
  const belumAccList = [];

  for (const s of allSubbags) {
    const p = proposalBySubbag[s];
    if (!p) {
      subbagStatus[s] = {
        subbag: s,
        status: 'DRAFT',
        status_label: 'Belum Mengajukan',
        has_proposal: false,
        can_edit: activeCycle ? activeCycle.is_locked === 0 : false,
        is_acc: false
      };
    } else {
      const isAcc = p.status_tahap === 'ACC_PLENO' || p.status_tahap === 'SELESAI';
      if (!isAcc) {
        belumAccList.push({ subbag: s, status: p.status_tahap, kode_revisi: p.kode_revisi });
      }
      subbagStatus[s] = {
        subbag: s,
        proposal_id: p.id,
        kode_revisi: p.kode_revisi,
        status: p.status_tahap,
        tahap_terkini: p.tahap_terkini,
        status_label: p.status_tahap === 'ACC_PLENO' ? 'ACC Pleno' : (p.status_tahap === 'DIKEMBALIKAN' ? 'Dikembalikan untuk Perbaikan' : (p.status_tahap === 'MENUNGGU_PLENO' ? 'Valid (Menunggu Pleno)' : (p.status_tahap === 'SELESAI' ? 'Disahkan' : 'Diajukan'))),
        has_proposal: true,
        can_edit: p.status_tahap === 'DIKEMBALIKAN' || p.status_tahap === 'DRAFT',
        is_acc: isAcc,
        alasan_pengembalian: p.alasan_pengembalian || '',
        dokumen_surat_link: p.dokumen_surat_link,
        dokumen_matriks_link: p.dokumen_matriks_link,
        nomor_surat: p.nomor_surat,
        perihal: p.perihal
      };
    }
  }

  const siapPengesahan = proposals.length > 0 && proposals.every(p => p.status_tahap === 'ACC_PLENO');

  return {
    dasar_anggaran: baseRatified ? {
      id: baseRatified.id,
      nama_periode: baseRatified.nama_periode,
      versi_revisi: baseRatified.versi_revisi,
      revisi_ke: baseRatified.revisi_ke,
      nomor_ba: baseRatified.nomor_ba_tapd,
      tanggal_ba: baseRatified.tanggal_ba_tapd,
      is_locked: 1
    } : null,
    siklus_aktif: activeCycle ? {
      id: activeCycle.id,
      nama_periode: activeCycle.nama_periode,
      versi_revisi: activeCycle.versi_revisi,
      revisi_ke: activeCycle.revisi_ke,
      is_locked: activeCycle.is_locked,
      parent_periode_id: activeCycle.parent_periode_id
    } : null,
    total_pengajuan: proposals.length,
    proposals,
    subbag_status: subbagStatus,
    siap_pengesahan: siapPengesahan,
    is_ready_for_ratification: siapPengesahan,
    belum_acc_list: belumAccList,
    pending_subbags: belumAccList.map(b => b.subbag)
  };
}

function getArsipRevisiList() {
  const periodes = db.prepare(`
    SELECT p.*,
      COALESCE((SELECT COUNT(*) FROM rab_baris WHERE periode_id = p.id AND row_type != 'header'), 0) as total_items,
      COALESCE((SELECT COUNT(*) FROM rab_baris WHERE periode_id = p.id), 0) as total_baris,
      (SELECT snapshot_data FROM periode_snapshot WHERE periode_id = p.id) as snapshot_data
    FROM periode_anggaran p
    WHERE p.is_locked = 1
    ORDER BY p.id DESC
  `).all();

  return periodes.map(p => {
    let grandTotal = 0;
    let isMigrationFrozen = false;
    let notice = '';

    if (p.snapshot_data) {
      try {
        const snap = JSON.parse(p.snapshot_data);
        grandTotal = snap.summary?.grandTotal || 0;
        isMigrationFrozen = Boolean(snap.meta?.is_migration_frozen);
        notice = snap.meta?.notice || '';
      } catch (e) {}
    }

    return {
      id: p.id,
      nama_periode: p.nama_periode,
      versi_revisi: p.versi_revisi,
      revisi_ke: p.revisi_ke,
      dasar_pengesahan: p.dasar_pengesahan,
      tahap_revisi: p.tahap_revisi,
      nomor_ba_tapd: p.nomor_ba_tapd || '-',
      tanggal_ba_tapd: p.tanggal_ba_tapd || '-',
      locked_at: p.locked_at || p.created_at,
      total_items: p.total_items,
      total_baris: p.total_baris,
      total_anggaran: grandTotal,
      is_locked: 1,
      is_migration_frozen: isMigrationFrozen,
      notice,
      gdrive_link_pleno: p.gdrive_link_pleno || '',
      catatan_pleno: p.catatan_pleno || ''
    };
  });
}

module.exports = {
  db,
  safeAddColumn,
  getJakartaTimeString,
  formatWaktuSakti,
  recordAuditLog,
  getAuditLogs,
  savePeriodeSnapshot,
  getPeriodeSnapshot,
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
  clearRabRows,
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
  getKuantitasList,
  getKuantitasById,
  saveKuantitas,
  getPaslonList,
  savePaslon,
  deletePaslon,
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
  approveAllSubbagPleno,
  generateNextKodeRevisi,
  createRevisiPengajuan,
  getRevisiPengajuanList,
  getRevisiPengajuanById,
  updateRevisiTahap,
  deleteRevisiPengajuan,
  finalizeTahap4Keseluruhan,
  getArsipRevisiList,
  getLatestRatifiedPeriode,
  getActiveRevisionCycle,
  getOrCreateRevisionCycle,
  checkRowEditPermission,
  logRevisiHistory,
  getRevisiPengajuanHistory,
  getRevisionCycleStatus
};
