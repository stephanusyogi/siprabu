/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Database Utama: Fullpoint MySQL & phpMyAdmin
 * Pengembang: emenje & Stephanus Yogi
 */

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { hashPassword, verifyPassword, sanitizeLogData } = require('./crypto_util');
const { parseIndonesianNumber } = require('./number_util');
const { validateUserCoherence, normalizePic } = require('./auth');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Muat .env otomatis jika ada agar CLI & script mandiri mengenali konfigurasi MySQL
const envPath = path.resolve(__dirname, '..', '.env');
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

// Standar Utama: Fullpoint MySQL & phpMyAdmin (SSOT)
// SQLite hanya dimuat secara lazy jika DB_TYPE disetel eksplisit ke 'sqlite' untuk unit test terisolasi
const USE_MYSQL = process.env.DB_TYPE !== 'sqlite';
let db;
let DatabaseSync = null;

function getSqliteDatabaseSync() {
  if (!DatabaseSync) {
    DatabaseSync = require('node:sqlite').DatabaseSync;
  }
  return DatabaseSync;
}

const DB_PATH = process.env.SIPRABU_DB_PATH || path.join(DATA_DIR, 'hibah_kpu.sqlite');

if (USE_MYSQL) {
  const { createMySQLDatabaseSync } = require('./mysql_sync');
  db = createMySQLDatabaseSync({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'siprabu_root_pass',
    database: process.env.DB_NAME || 'siprabu_db'
  });
  console.log(`[DB-ENGINE] Berjalan pada Full MySQL Database: ${process.env.DB_NAME || 'siprabu_db'} (${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306})`);
} else {
  const SqliteDB = getSqliteDatabaseSync();
  db = new SqliteDB(DB_PATH);
  console.log(`[DB-ENGINE] Mode Fallback / Pengujian SQLite Terisolasi Aktif: ${DB_PATH}`);
}

module.exports.db = db;
module.exports.USE_MYSQL = USE_MYSQL;

/**
 * Flush WAL ke file utama hibah_kpu.sqlite dan cadangkan ke PERSISTENT_DB_PATH & hibah_kpu.sqlite.bak
 * menjamin Durability (D dalam ACID) penuh serta kebal dari reset saat Git redeploy di Hosting.
 */
function checkpointAndSyncDatabase(mode = 'PASSIVE') {
  if (USE_MYSQL) return;
  try {
    const cleanMode = ['PASSIVE', 'FULL', 'RESTART', 'TRUNCATE'].includes(String(mode).toUpperCase())
      ? String(mode).toUpperCase()
      : 'PASSIVE';
    db.exec(`PRAGMA wal_checkpoint(${cleanMode});`);
    if (!process.env.SIPRABU_DB_PATH && fs.existsSync(DB_PATH) && fs.statSync(DB_PATH).size > 0) {
      try { fs.copyFileSync(DB_PATH, BACKUP_PATH); } catch (e) {}
      try { fs.copyFileSync(DB_PATH, PERSISTENT_DB_PATH); } catch (e) {}
      try { fs.copyFileSync(DB_PATH, TEMPLATE_PATH); } catch (e) {}
    }
  } catch (e) {
    console.warn('[DB-CHECKPOINT] Peringatan saat checkpoint WAL:', e.message);
  }
}
module.exports.checkpointAndSyncDatabase = checkpointAndSyncDatabase;

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
 * Klasifikasikan setiap entri audit_log ke dalam 6 kelompok kejadian utama (Bab 14 Canon):
 * 1. RKB    - Perubahan RUH Belanja RKB (Batch Commit & mutasi baris)
 * 2. SIKLUS - Alur Siklus & Revisi 4 Tahap (Pengajuan, Validasi, Pleno, Pengesahan Tahap 4, Tautan Pasca-Pengesahan)
 * 3. MASTER - Referensi & Database Master (PPK, PPS/TPS, Paslon, Kuantitas, SBM, BAS, Regulasi JDIH, Pengaturan Satker)
 * 4. USER   - Manajemen Pengguna & Hak Akses
 * 5. AUTH   - Autentikasi, Sesi & Simulasi Ganti Peran
 * 6. UNDUH  - Unduhan & Ekspor Dokumen Resmi
 */
function classifyAuditCategory(action = '', entity = '') {
  const act = String(action || '').toUpperCase();
  const ent = String(entity || '').toLowerCase();

  if (
    act === 'COMMIT_RKB_CHANGES' ||
    act.includes('_RKB_ROW') ||
    act === 'CASCADE_PIC_SUBBAG' ||
    act === 'CASCADE_SASARAN' ||
    act === 'REORDER_ROW' ||
    act === 'CLEAR_RKB_ROWS' ||
    ent === 'rab_baris'
  ) {
    return 'RKB';
  }

  if (
    act.includes('REVISI') ||
    act.includes('TAHAP4') ||
    act.includes('POST_RATIFICATION') ||
    act.includes('PERIODE') ||
    act.includes('USULAN') ||
    act.includes('PLENO') ||
    ent === 'revisi_pengajuan' ||
    ent === 'subbag_usulan_revisi' ||
    (ent === 'periode_anggaran' && act !== 'COMMIT_RKB_CHANGES')
  ) {
    return 'SIKLUS';
  }

  if (
    act.includes('KUANTITAS') ||
    act.includes('PASLON') ||
    act.includes('KECAMATAN') ||
    act.includes('DESA') ||
    act.includes('SBM') ||
    act.includes('AKUN') ||
    act.includes('REGULASI') ||
    act === 'UPDATE_SETTINGS' ||
    ent.startsWith('master_') ||
    ent === 'settings_satker'
  ) {
    return 'MASTER';
  }

  if (
    act === 'CREATE_USER' ||
    act === 'UPDATE_USER' ||
    act === 'DELETE_USER' ||
    act === 'TOGGLE_USER_STATUS' ||
    (ent === 'satker_users' && act !== 'SWITCH_ROLE_SIMULATION')
  ) {
    return 'USER';
  }

  if (
    act.startsWith('LOGIN_') ||
    act === 'LOGOUT' ||
    act === 'SWITCH_ROLE_SIMULATION' ||
    ent === 'session'
  ) {
    return 'AUTH';
  }

  if (
    act.includes('DOWNLOAD') ||
    act.includes('EXPORT') ||
    ent === 'download_requests'
  ) {
    return 'UNDUH';
  }

  return 'MASTER';
}

/**
 * Catat log audit ke tabel audit_log tanpa merekam password atau token.
 * Membedakan identitas asli pengembang (Level 0) dan peran simulasi saat pengujian (Bab 11 & FR-14 Canon).
 */
function recordAuditLog({
  user = null,
  user_id = null,
  username = '',
  role_id = '',
  ip = '',
  action = '',
  entity = '',
  entity_id = '',
  target_type = '',
  target_id = '',
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

    const resolvedUsername = user?.username || username || 'anonymous';
    const resolvedUserId = user?.id ?? user_id ?? null;
    const resolvedRole = user?.role_id || role_id || '-';
    const resolvedEntity = entity || target_type || 'system';
    const resolvedEntityId = String(entity_id !== '' && entity_id !== undefined && entity_id !== null ? entity_id : (target_id || ''));

    const isSimulated = Boolean(user?.original_dev_username && user.original_dev_username !== resolvedUsername);
    const actorUsername = isSimulated ? user.original_dev_username : resolvedUsername;
    const actorUserId = isSimulated ? (user.original_dev_id ?? resolvedUserId) : resolvedUserId;
    const roleRecorded = isSimulated
      ? `developer [simulasi:${resolvedUsername}]`
      : resolvedRole;
    const rawNotes = String(notes || '');
    const simPrefix = (isSimulated && !rawNotes.startsWith('[Identitas Asli:'))
      ? `[Identitas Asli: ${user.original_dev_username} | Peran Simulasi: ${resolvedUsername}] `
      : '';
    const finalNotes = simPrefix + rawNotes;

    const stmt = db.prepare(`
      INSERT INTO audit_log (
        waktu_wib, timestamp_ms, user_id, username, role_id, ip_address,
        action, entity, entity_id, old_values, new_values, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      waktuWib,
      now.getTime(),
      actorUserId,
      actorUsername,
      roleRecorded,
      ip || '',
      action,
      resolvedEntity,
      resolvedEntityId,
      cleanOld,
      cleanNew,
      status,
      finalNotes
    );
    // Pastikan setiap mutasi data langsung di-checkpoint ke penyimpanan persisten
    const cat = classifyAuditCategory(action, resolvedEntity);
    if (['RKB', 'MASTER', 'SIKLUS', 'USER'].includes(cat)) {
      checkpointAndSyncDatabase('PASSIVE');
    }
  } catch (err) {
    console.warn('[AUDIT] Gagal mencatat log audit:', err.message);
  }
}

function getAuditLogs({
  limit = 100,
  offset = 0,
  category = '',
  action = '',
  entity = '',
  username = '',
  search = '',
  date_start = '',
  date_end = '',
  include_meta = false
} = {}) {
  let allRows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC').all();

  const enriched = allRows.map(row => {
    const cat = classifyAuditCategory(row.action, row.entity);
    let oldObj = null;
    let newObj = null;
    if (row.old_values) {
      try { oldObj = JSON.parse(row.old_values); } catch (e) { oldObj = row.old_values; }
    }
    if (row.new_values) {
      try { newObj = JSON.parse(row.new_values); } catch (e) { newObj = row.new_values; }
    }

    // Normalisasi baris historis yang sebelumnya mencatat nama peran simulasi sebagai username utama
    let normUsername = row.username;
    let normRoleId = row.role_id || '-';
    const legacySimMatch = String(normRoleId).match(/^(.*?)\s*\[simulasi:([^\]]+)\]$/i);
    if (legacySimMatch) {
      const prefixRole = legacySimMatch[1].trim();
      const bracketVal = legacySimMatch[2].trim();
      // Jika di dalam bracket adalah 'emenje' sedangkan username di kolom adalah akun simulasi (misal 'kul' / 'perencanaan')
      if (bracketVal.toLowerCase() === 'emenje' && String(normUsername || '').toLowerCase() !== 'emenje') {
        const simulatedTarget = normUsername;
        normUsername = 'emenje';
        normRoleId = `developer [simulasi:${simulatedTarget}]`;
        try {
          db.prepare('UPDATE audit_log SET username = ?, role_id = ? WHERE id = ?').run(normUsername, normRoleId, row.id);
        } catch (_) {}
      } else if (prefixRole.toLowerCase() !== 'developer' && String(normUsername || '').toLowerCase() === 'emenje') {
        normRoleId = `developer [simulasi:${bracketVal}]`;
      }
    }

    return {
      ...row,
      username: normUsername,
      role_id: normRoleId,
      category: cat,
      old_values_obj: oldObj,
      new_values_obj: newObj
    };
  });

  const summary = {
    total: enriched.length,
    RKB: 0,
    SIKLUS: 0,
    MASTER: 0,
    USER: 0,
    AUTH: 0,
    UNDUH: 0
  };
  const userSet = new Set();
  enriched.forEach(r => {
    if (summary[r.category] !== undefined) summary[r.category]++;
    if (r.username) userSet.add(r.username);
  });

  let filtered = enriched;

  if (category && category !== 'ALL') {
    const cleanCat = String(category).toUpperCase();
    filtered = filtered.filter(r => r.category === cleanCat);
  }
  if (action && action !== 'ALL') {
    filtered = filtered.filter(r => r.action === action);
  }
  if (entity && entity !== 'ALL') {
    filtered = filtered.filter(r => r.entity === entity);
  }
  if (username && username !== 'ALL') {
    filtered = filtered.filter(r => String(r.username || '').toLowerCase() === String(username).toLowerCase());
  }
  if (date_start) {
    const startMs = new Date(`${date_start}T00:00:00+07:00`).getTime();
    if (!Number.isNaN(startMs)) {
      filtered = filtered.filter(r => Number(r.timestamp_ms || 0) >= startMs);
    }
  }
  if (date_end) {
    const endMs = new Date(`${date_end}T23:59:59.999+07:00`).getTime();
    if (!Number.isNaN(endMs)) {
      filtered = filtered.filter(r => Number(r.timestamp_ms || 0) <= endMs);
    }
  }
  if (search && String(search).trim() !== '') {
    const q = String(search).trim().toLowerCase();
    filtered = filtered.filter(r =>
      String(r.action || '').toLowerCase().includes(q) ||
      String(r.entity || '').toLowerCase().includes(q) ||
      String(r.username || '').toLowerCase().includes(q) ||
      String(r.role_id || '').toLowerCase().includes(q) ||
      String(r.notes || '').toLowerCase().includes(q) ||
      String(r.old_values || '').toLowerCase().includes(q) ||
      String(r.new_values || '').toLowerCase().includes(q)
    );
  }

  const totalFiltered = filtered.length;
  const lim = Math.max(1, Number(limit) || 100);
  const off = Math.max(0, Number(offset) || 0);
  const paged = filtered.slice(off, off + lim);

  if (include_meta) {
    return {
      logs: paged,
      total: totalFiltered,
      summary,
      distinct_users: Array.from(userSet).sort()
    };
  }
  return paged;
}

// Inisialisasi DB & Migrasi Skema
function initDb() {
  if (!USE_MYSQL) {
    try {
      db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = FULL;
        PRAGMA foreign_keys = ON;
      `);
    } catch (e) {}
  }

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
  safeAddColumn('periode_anggaran', 'fase_perencanaan TEXT DEFAULT "PRA_NPHD"');
  safeAddColumn('periode_anggaran', 'rkb_final_link TEXT DEFAULT ""');
  safeAddColumn('periode_anggaran', 'kak_gabungan_link TEXT DEFAULT ""');
  safeAddColumn('periode_anggaran', 'verifikasi_manual_tahap4 INTEGER DEFAULT 0');

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

  // 4b. Tabel Master Regulasi & Dasar Hukum (Katalog JDIH Penyusunan & Pelaksanaan Anggaran)
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_regulasi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kategori TEXT DEFAULT 'PEDOMAN_KPU',
      nomor_regulasi TEXT DEFAULT '',
      no_urut INTEGER DEFAULT 1,
      urutan INTEGER DEFAULT 1,
      jenis_produk TEXT DEFAULT 'KPT KPU',
      nomor_peraturan TEXT DEFAULT '',
      tahun INTEGER NOT NULL DEFAULT 2024,
      tentang TEXT NOT NULL DEFAULT '',
      instansi TEXT DEFAULT '',
      instansi_penetap TEXT DEFAULT '',
      lingkup_rkb TEXT DEFAULT '',
      pasal_kunci TEXT DEFAULT '',
      lingkup_anggaran TEXT DEFAULT 'PENYUSUNAN & PELAKSANAAN',
      status TEXT DEFAULT 'BERLAKU',
      status_berlaku TEXT DEFAULT 'Berlaku',
      modul_terkait TEXT DEFAULT '',
      abstrak TEXT DEFAULT '',
      tautan_dokumen TEXT DEFAULT '',
      file_pdf_nama TEXT DEFAULT '',
      file_pdf_base64 TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  safeAddColumn('master_regulasi', 'no_urut INTEGER DEFAULT 1');
  safeAddColumn('master_regulasi', "jenis_produk TEXT DEFAULT 'KPT KPU'");
  safeAddColumn('master_regulasi', "nomor_peraturan TEXT DEFAULT ''");
  safeAddColumn('master_regulasi', "lingkup_anggaran TEXT DEFAULT 'PENYUSUNAN & PELAKSANAAN'");
  safeAddColumn('master_regulasi', "status_berlaku TEXT DEFAULT 'Berlaku'");
  safeAddColumn('master_regulasi', "instansi_penetap TEXT DEFAULT ''");
  safeAddColumn('master_regulasi', "modul_terkait TEXT DEFAULT ''");
  safeAddColumn('master_regulasi', "abstrak TEXT DEFAULT ''");
  safeAddColumn('master_regulasi', "tautan_dokumen TEXT DEFAULT ''");
  safeAddColumn('master_regulasi', 'updated_at TEXT DEFAULT CURRENT_TIMESTAMP');
  seedMasterRegulasiJdih();

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

  // Migrasi kolom tambahan pada revisi_pengajuan (Bab 3, 4 & FR-02, FR-03 Canon)
  safeAddColumn('revisi_pengajuan', "alasan_pengembalian TEXT DEFAULT ''");
  safeAddColumn('revisi_pengajuan', "l1_koreksi_catatan TEXT DEFAULT ''");
  safeAddColumn('revisi_pengajuan', "dokumen_matriks_original_link TEXT DEFAULT ''");
  safeAddColumn('revisi_pengajuan', "dokumen_surat_original_link TEXT DEFAULT ''");
  safeAddColumn('revisi_pengajuan', "dokumen_kak_link TEXT DEFAULT ''");
  safeAddColumn('revisi_pengajuan', "dokumen_kak_original_link TEXT DEFAULT ''");
  safeAddColumn('revisi_pengajuan', "versi_usulan INTEGER DEFAULT 1");
  safeAddColumn('revisi_pengajuan', "konfirmasi_kebenaran INTEGER DEFAULT 1");
  safeAddColumn('revisi_pengajuan', "siklus_ke INTEGER DEFAULT 1");

  // 6b. Tabel Log Riwayat Alur Siklus & Pengajuan Revisi
  db.exec(`
    CREATE TABLE IF NOT EXISTS revisi_pengajuan_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pengajuan_id INTEGER NOT NULL,
      periode_id INTEGER NOT NULL,
      subbag TEXT NOT NULL,
      versi_usulan INTEGER DEFAULT 1,
      tahap INTEGER NOT NULL,
      status TEXT NOT NULL,
      aksi TEXT NOT NULL,
      catatan TEXT DEFAULT '',
      alasan_pengembalian TEXT DEFAULT '',
      dokumen_surat_link TEXT DEFAULT '',
      dokumen_matriks_link TEXT DEFAULT '',
      dokumen_kak_link TEXT DEFAULT '',
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
  safeAddColumn('revisi_pengajuan_log', 'versi_usulan INTEGER DEFAULT 1');
  safeAddColumn('revisi_pengajuan_log', "dokumen_kak_link TEXT DEFAULT ''");

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

  // Pastikan kotak di master_desa sinkron dengan tps jika masih 0, serta bulatkan angka pemilih/tps/pantarlih/kotak tanpa desimal (koma)
  try {
    db.prepare('UPDATE master_desa SET kotak = tps WHERE kotak IS NULL OR kotak = 0').run();
    db.prepare(`
      UPDATE master_desa
      SET pemilih = CAST(ROUND(COALESCE(pemilih, 0)) AS INTEGER),
          tps = CAST(ROUND(COALESCE(tps, 0)) AS INTEGER),
          pantarlih = CAST(ROUND(COALESCE(pantarlih, 0)) AS INTEGER),
          kotak = CAST(ROUND(COALESCE(kotak, tps, 0)) AS INTEGER),
          rohaniwan = CAST(ROUND(COALESCE(rohaniwan, 1)) AS INTEGER)
    `).run();
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
    // 1. Migrasi satu-kali (One-Time Seed) untuk struktur siklus awal, variabel Paslon & PIC default PPK/PPS.
    // Dijaga penuh dengan flag persisten 'operational_cycle_aligned_v1' agar saat server restart:
    // - TIDAK PERNAH menghapus siklus Revisi 2 atau revisi berikutnya
    // - TIDAK PERNAH membuka kembali kunci periode yang sudah disahkan pada Tahap 4
    // - TIDAK PERNAH mengosongkan nomor/tanggal BA
    // - TIDAK PERNAH menghapus audit_log atau audit_log_perubahan (Audit Log bersifat Immutable sesuai Bab 14 Canon)
    const alignedFlag = db.prepare("SELECT value FROM settings_satker WHERE key = 'operational_cycle_aligned_v1'").get();
    if (!alignedFlag || alignedFlag.value !== '1') {
      // Pastikan RKB Awal (Periode 1) berstatus Terkunci sebagai Fondasi Sah dengan Pagu Rp 49.999.999.000
      db.prepare(`
        UPDATE periode_anggaran
        SET is_locked = 1, pagu_nphd = 49999999000
        WHERE id = 1 AND (is_locked != 1 OR pagu_nphd != 49999999000 OR pagu_nphd IS NULL)
      `).run();

      // Normalisasi parameter Keterangan pada Master Paslon menjadi 'Jalur Parpol' atau 'Jalur Perseorangan'
      try {
        const allPaslons = db.prepare('SELECT id, partai_pengusung, keterangan FROM master_paslon').all();
        const updPaslon = db.prepare('UPDATE master_paslon SET keterangan = ?, partai_pengusung = ? WHERE id = ?');
        for (const p of allPaslons) {
          const normKet = normalizeJalurPaslon(p.keterangan, p.partai_pengusung);
          let normPartai = p.partai_pengusung || '';
          if (normKet === 'Jalur Parpol' && normPartai === 'Koalisi Parpol Non-Parlemen / Independen') {
            normPartai = 'Koalisi Parpol Non-Parlemen';
          }
          if (p.keterangan !== normKet || p.partai_pengusung !== normPartai) {
            updPaslon.run(normKet, normPartai, p.id);
          }
        }

        db.prepare("DELETE FROM master_kuantitas WHERE id > 10 AND kode IN ('paslon_parpol', 'bakal_paslon')").run();
        db.prepare(`
          UPDATE master_kuantitas
          SET kode = 'paslon_parpol',
              nama = 'Bakal Paslon Jalur Parpol',
              satuan = 'Paslon',
              kategori = 'PESERTA'
          WHERE id = 6
        `).run();
        db.prepare(`
          UPDATE master_kuantitas
          SET kode = 'paslon_perseorangan',
              nama = 'Bakal Paslon Jalur Perseorangan',
              satuan = 'Paslon',
              kategori = 'PESERTA'
          WHERE id = 7
        `).run();
        db.prepare(`
          UPDATE master_kuantitas
          SET kode = 'paslon',
              nama = 'Total Bakal Pasangan Calon (Paslon)',
              satuan = 'Paslon',
              kategori = 'PESERTA'
          WHERE id = 8
        `).run();
      } catch (e) {
        console.warn('[MIGRATION] Gagal normalisasi parameter Jalur Paslon:', e.message);
      }

      const draftPeriods = db.prepare('SELECT id FROM periode_anggaran WHERE is_locked = 0').all();
      for (const dp of draftPeriods) {
        db.prepare("UPDATE rab_baris SET f1_var = 'paslon' WHERE periode_id = ? AND f1_var = 'bakal_paslon'").run(dp.id);
        db.prepare("UPDATE rab_baris SET f2_var = 'paslon' WHERE periode_id = ? AND f2_var = 'bakal_paslon'").run(dp.id);
        db.prepare("UPDATE rab_baris SET f3_var = 'paslon' WHERE periode_id = ? AND f3_var = 'bakal_paslon'").run(dp.id);
        db.prepare("UPDATE rab_baris SET f4_var = 'paslon' WHERE periode_id = ? AND f4_var = 'bakal_paslon'").run(dp.id);

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
          else if (uLower.includes('jalur parpol') || uLower.includes('paslon parpol')) targetVar = 'paslon_parpol';

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
      try {
        db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES ('operational_cycle_aligned_v1', '1')").run();
      } catch (e) {}
    }

    // 2. Sinkronkan kuantitas primer SSOT (termasuk Jalur Parpol & Jalur Perseorangan dari Master Paslon)
    syncPrimaryKuantitas();

    // 3. Pastikan NIP Bendahara Pengeluaran pada settings_satker sinkron dengan bp_nip jika masih kosong
    try {
      db.prepare(`
        UPDATE settings_satker
        SET value = (SELECT value FROM settings_satker WHERE key = 'bp_nip')
        WHERE key = 'bendahara_nip' AND (value IS NULL OR value = '')
          AND EXISTS (SELECT 1 FROM settings_satker WHERE key = 'bp_nip' AND value != '')
      `).run();
    } catch (e) {}
  } catch (err) {
    console.warn('[MIGRATION] Peringatan saat menyelaraskan siklus RKB:', err.message);
  }
}

/**
 * Inisialisasi & Pemutakhiran Katalog JDIH Regulasi Penyusunan & Pelaksanaan Anggaran
 * Catatan Canon: NPHD adalah naskah perjanjian hibah daerah (bukan produk hukum/regulasi).
 */
function seedMasterRegulasiJdih() {
  try {
    // Pastikan NPHD tidak pernah masuk ke dalam daftar produk hukum / regulasi
    db.prepare("DELETE FROM master_regulasi WHERE UPPER(COALESCE(jenis_produk,'')) LIKE '%NPHD%' OR UPPER(COALESCE(nomor_peraturan,'')) LIKE '%NPHD%' OR UPPER(COALESCE(nomor_regulasi,'')) LIKE '%NPHD%' OR UPPER(COALESCE(tentang,'')) LIKE '%NASKAH PERJANJIAN HIBAH DAERAH%'").run();

    // Periksa apakah katalog JDIH 13 produk hukum sudah terisi lengkap
    const hasSeededJdih = db.prepare("SELECT COUNT(*) as c FROM master_regulasi WHERE nomor_peraturan != '' AND modul_terkait != ''").get();
    if (hasSeededJdih && Number(hasSeededJdih.c) >= 13) return;

    // Bersihkan baris lama yang belum termigrasi ke skema JDIH dan isi dengan 13 regulasi resmi Penyusunan & Pelaksanaan Anggaran
    db.prepare('DELETE FROM master_regulasi').run();

    const initialRegulasis = [
      {
        no_urut: 1,
        jenis_produk: 'UU / PERPPU',
        nomor_peraturan: 'UU Nomor 1 Tahun 2015 jo. UU Nomor 10 Tahun 2016 jo. UU Nomor 6 Tahun 2020',
        tahun: 2020,
        tentang: 'Penetapan Peraturan Pemerintah Pengganti Undang-Undang Nomor 1 Tahun 2014 tentang Pemilihan Gubernur, Bupati, dan Walikota Menjadi Undang-Undang',
        lingkup_anggaran: 'PENYUSUNAN & PELAKSANAAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Pemerintah RI & DPR RI',
        modul_terkait: 'Payung Hukum Pendanaan Pemilihan (APBD / Hibah Daerah)',
        abstrak: 'Mengatur landasan hukum penyelenggaraan Pemilihan Gubernur, Bupati, dan Wakil Bupati/Walikota secara serentak serta ketentuan Pasal 166 mengenai pendanaan kegiatan Pemilihan yang dibebankan pada APBD melalui mekanisme belanja hibah daerah.',
        tautan_dokumen: 'https://jdih.kpu.go.id/'
      },
      {
        no_urut: 2,
        jenis_produk: 'PP / PERPRES',
        nomor_peraturan: 'PP Nomor 12 Tahun 2019',
        tahun: 2019,
        tentang: 'Pengelolaan Keuangan Daerah',
        lingkup_anggaran: 'PENYUSUNAN & PELAKSANAAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Presiden Republik Indonesia',
        modul_terkait: 'Penganggaran, Pelaksanaan & Pertanggungjawaban Hibah Daerah',
        abstrak: 'Mengatur asas umum pengelolaan keuangan daerah, tata cara penganggaran belanja hibah pada APBD, pelaksanaan penatausahaan, hingga pelaporan dan pertanggungjawaban keuangan hibah daerah.',
        tautan_dokumen: 'https://peraturan.bpk.go.id/'
      },
      {
        no_urut: 3,
        jenis_produk: 'PERMENDAGRI',
        nomor_peraturan: 'Permendagri Nomor 54 Tahun 2019 jo. Permendagri Nomor 41 Tahun 2020',
        tahun: 2020,
        tentang: 'Pendanaan Kegiatan Pemilihan Gubernur, Bupati, dan Wali Kota yang Bersumber dari Anggaran Pendapatan dan Belanja Daerah',
        lingkup_anggaran: 'PENYUSUNAN & PELAKSANAAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Menteri Dalam Negeri RI',
        modul_terkait: 'Siklus Pra-NPHD, Pembahasan TAPD, Pencairan & Revisi RKB',
        abstrak: 'Pedoman utama penyusunan pengajuan kebutuhan pendanaan Pemilihan oleh KPU kepada Pemerintah Daerah, mekanisme pembahasan RKB bersama TAPD, tahapan pencairan dana hibah, perubahan/revisi rincian penggunaan dana hibah, serta pelaporan akhir penggunaan dana hibah.',
        tautan_dokumen: 'https://peraturan.bpk.go.id/'
      },
      {
        no_urut: 4,
        jenis_produk: 'PMK',
        nomor_peraturan: 'PMK Nomor 62 Tahun 2023',
        tahun: 2023,
        tentang: 'Perencanaan Anggaran, Pelaksanaan Anggaran, serta Akuntansi dan Pelaporan Keuangan',
        lingkup_anggaran: 'PENYUSUNAN & PELAKSANAAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Menteri Keuangan RI',
        modul_terkait: 'Kaidah Kertas Kerja RKA/RKB, Revisi Anggaran & Pelaksanaan Belanja',
        abstrak: 'Mengatur tata kelola penyusunan rincian kertas kerja anggaran berbasis kinerja, tata cara pergeseran/revisi anggaran antar rincian output/komponen, tata cara pengujian tagihan dan pembayaran beban anggaran, serta akuntansi pelaporan keuangan satker.',
        tautan_dokumen: 'https://jdih.kemenkeu.go.id/'
      },
      {
        no_urut: 5,
        jenis_produk: 'PMK',
        nomor_peraturan: 'PMK Nomor 49 Tahun 2023 / PMK Nomor 39 Tahun 2024',
        tahun: 2024,
        tentang: 'Standar Biaya Masukan (SBM) Tahun Anggaran',
        lingkup_anggaran: 'PENYUSUNAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Menteri Keuangan RI',
        modul_terkait: 'Referensi Standar Biaya Masukan (SBM) & Validasi Harga Satuan RKB',
        abstrak: 'Menetapkan satuan biaya berupa harga satuan, tarif, dan indeks yang digunakan untuk menyusun biaya komponen masukan kegiatan dalam RKB, baik yang berfungsi sebagai batas tertinggi (pagu tertinggi) maupun satuan biaya estimasi.',
        tautan_dokumen: 'https://jdih.kemenkeu.go.id/'
      },
      {
        no_urut: 6,
        jenis_produk: 'PMK',
        nomor_peraturan: 'PMK Nomor 181/PMK.05/2022 jo. PMK Nomor 204/PMK.05/2020',
        tahun: 2022,
        tentang: 'Tata Cara Pengelolaan Rekening Milik Satuan Kerja Lingkup Kementerian Negara/Lembaga dan Pengelolaan Hibah Langsung dalam Bentuk Uang',
        lingkup_anggaran: 'PELAKSANAAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Menteri Keuangan RI',
        modul_terkait: 'Rekening Hibah Pilkada, Registrasi Hibah, Revisi DIPA & Pengesahan SP2HL/MPHL-BJS',
        abstrak: 'Mengatur pembukaan dan pengelolaan Rekening Penampungan Dana Hibah Langsung (RPDHL) dan Rekening Penyaluran Dana Hibah pada satker KPU, mekanisme registrasi hibah, revisi penyesuaian pagu hibah, serta pengesahan belanja hibah ke KPPN.',
        tautan_dokumen: 'https://jdih.kemenkeu.go.id/'
      },
      {
        no_urut: 7,
        jenis_produk: 'KEP / PEDOMAN',
        nomor_peraturan: 'PMK Nomor 214/PMK.05/2013 jo. PER-13/PB/2023 & KEP-331/PB/2021',
        tahun: 2023,
        tentang: 'Kodefikasi Segmen Akun pada Bagan Akun Standar (BAS)',
        lingkup_anggaran: 'PENYUSUNAN & PELAKSANAAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Direktorat Jenderal Perbendaharaan Kemenkeu RI',
        modul_terkait: 'Referensi Bagan Akun Standar (BAS 6 Digit) & Rekap Akun BAS',
        abstrak: 'Pedoman penggunaan kode akun 6 digit (Belanja Bahan 521211, Belanja Barang Non Operasional Lainnya 521219, Honor Output Kegiatan 521213, Belanja Jasa Profesi 522151, Belanja Sewa 522141, dan Belanja Perjalanan Dinas 524111/524113) agar penyusunan RKB dan pembebanan SPJ selaras.',
        tautan_dokumen: 'https://djpb.kemenkeu.go.id/'
      },
      {
        no_urut: 8,
        jenis_produk: 'PKPU',
        nomor_peraturan: 'PKPU Nomor 2 Tahun 2024',
        tahun: 2024,
        tentang: 'Tahapan dan Jadwal Pemilihan Gubernur dan Wakil Gubernur, Bupati dan Wakil Bupati, serta Walikota dan Wakil Walikota',
        lingkup_anggaran: 'PENYUSUNAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Komisi Pemilihan Umum RI',
        modul_terkait: 'Struktur Tahapan Kegiatan RKB (L1–L3) & Volume Masa Kerja',
        abstrak: 'Menetapkan rincian tahapan persiapan dan tahapan penyelenggaraan Pemilihan beserta jadwal waktunya, yang menjadi dasar perhitungan frekuensi kegiatan, durasi masa kerja badan adhoc/pokja, dan jadwal distribusi kebutuhan anggaran.',
        tautan_dokumen: 'https://jdih.kpu.go.id/'
      },
      {
        no_urut: 9,
        jenis_produk: 'PKPU',
        nomor_peraturan: 'PKPU Nomor 8 Tahun 2022',
        tahun: 2022,
        tentang: 'Pembentukan dan Tata Kerja Badan Adhoc Penyelenggara Pemilihan Umum dan Pemilihan Gubernur dan Wakil Gubernur, Bupati dan Wakil Bupati, dan Walikota dan Wakil Walikota',
        lingkup_anggaran: 'PENYUSUNAN & PELAKSANAAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Komisi Pemilihan Umum RI',
        modul_terkait: 'Kuantitas SSOT Personil Adhoc (PPK, PPS, KPPS, Pantarlih & Sekretariat)',
        abstrak: 'Mengatur komposisi dan jumlah personil penyelenggara badan adhoc di tingkat Kecamatan (5 Komisioner PPK + 3 Sekretariat PPK), Desa/Kelurahan (3 Komisioner PPS + 3 Sekretariat PPS), Pantarlih, dan TPS (7 Anggota KPPS + 2 Petugas Ketertiban).',
        tautan_dokumen: 'https://jdih.kpu.go.id/'
      },
      {
        no_urut: 10,
        jenis_produk: 'KPT KPU',
        nomor_peraturan: 'Keputusan KPU Nomor 574 Tahun 2023 jo. Keputusan KPU Nomor 188 Tahun 2024',
        tahun: 2024,
        tentang: 'Pedoman Teknis Penyusunan Kebutuhan dan Penganggaran Pemilihan Gubernur dan Wakil Gubernur, Bupati dan Wakil Bupati, serta Walikota dan Wakil Walikota',
        lingkup_anggaran: 'PENYUSUNAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Komisi Pemilihan Umum RI',
        modul_terkait: 'RUH Belanja RKB, Standar Kebutuhan Barang/Jasa & Format KAK',
        abstrak: 'Standar baku struktur Rencana Kebutuhan Biaya (RKB) Pilkada di lingkungan KPU Provinsi dan KPU Kabupaten/Kota, mengatur nomenklatur kegiatan, rincian komponen barang/jasa per tahapan, serta penyusunan Kerangka Acuan Kerja (KAK).',
        tautan_dokumen: 'https://jdih.kpu.go.id/'
      },
      {
        no_urut: 11,
        jenis_produk: 'KPT KPU',
        nomor_peraturan: 'Keputusan KPU Nomor 472 Tahun 2022 jo. Surat Menkeu S-647/MK.02/2022',
        tahun: 2022,
        tentang: 'Satuan Biaya Masukan Lainnya (SBML) di Lingkungan KPU, KPU Provinsi, dan KPU Kabupaten/Kota dalam Rangka Tahapan Pemilihan',
        lingkup_anggaran: 'PENYUSUNAN & PELAKSANAAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Komisi Pemilihan Umum RI & Kementerian Keuangan RI',
        modul_terkait: 'Standar Honorarium Badan Adhoc (PPK, PPS, KPPS, Pantarlih), Pokja & Santunan',
        abstrak: 'Menetapkan besaran honorarium bulanan/kegiatan bagi Ketua dan Anggota PPK, Sekretaris dan Staf Sekretariat PPK, Ketua dan Anggota PPS, Sekretariat PPS, Pantarlih, KPPS, Petugas Ketertiban TPS, Kelompok Kerja (Pokja) Pemilihan, serta santunan kecelakaan kerja badan adhoc.',
        tautan_dokumen: 'https://jdih.kpu.go.id/'
      },
      {
        no_urut: 12,
        jenis_produk: 'KPT KPU',
        nomor_peraturan: 'Keputusan KPU Nomor 1394 Tahun 2023 & Keputusan KPU Nomor 1396 Tahun 2023',
        tahun: 2023,
        tentang: 'Petunjuk Teknis Pengelolaan, Pelaksanaan, dan Pertanggungjawaban Keuangan Dana Hibah Pemilihan di Lingkungan KPU',
        lingkup_anggaran: 'PELAKSANAAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Komisi Pemilihan Umum RI',
        modul_terkait: 'Rekap Pelaksanaan, Penyaluran Dana Adhoc, Bukti SPJ, Pajak & Pengembalian Sisa Hibah',
        abstrak: 'Pedoman operasional pelaksanaan anggaran hibah Pemilihan oleh KPA, PPK, dan Bendahara Pengeluaran, mencakup mekanisme penyaluran dana operasional dan honorarium ke PPK/PPS/KPPS, kelengkapan bukti pertanggungjawaban (SPJ), pemungutan pajak, pengesahan SAKTI, hingga pelaporan dan pengembalian sisa dana hibah.',
        tautan_dokumen: 'https://jdih.kpu.go.id/'
      },
      {
        no_urut: 13,
        jenis_produk: 'PP / PERPRES',
        nomor_peraturan: 'Perpres Nomor 16 Tahun 2018 jo. Perpres Nomor 12 Tahun 2021',
        tahun: 2021,
        tentang: 'Pengadaan Barang/Jasa Pemerintah',
        lingkup_anggaran: 'PELAKSANAAN',
        status_berlaku: 'Berlaku',
        instansi_penetap: 'Presiden Republik Indonesia',
        modul_terkait: 'Pelaksanaan Pengadaan Logistik Pemilihan, APK/BK & Kontrak Belanja Barang/Jasa',
        abstrak: 'Mengatur tata cara pemilihan penyedia, e-Purchasing melalui Katalog Elektronik, pengadaan langsung, tender cepat, pengelolaan kontrak oleh Pejabat Pembuat Komitmen (PPK), serta serah terima hasil pekerjaan barang/jasa dan logistik Pemilihan.',
        tautan_dokumen: 'https://jdih.lkpp.go.id/'
      }
    ];

    const ins = db.prepare(`
      INSERT INTO master_regulasi (
        kategori, nomor_regulasi, urutan, instansi, lingkup_rkb, pasal_kunci, status,
        no_urut, jenis_produk, nomor_peraturan, tahun, tentang,
        lingkup_anggaran, status_berlaku, instansi_penetap, modul_terkait, abstrak, tautan_dokumen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of initialRegulasis) {
      ins.run(
        r.jenis_produk,
        r.nomor_peraturan,
        r.no_urut,
        r.instansi_penetap,
        r.abstrak,
        r.modul_terkait,
        'BERLAKU',
        r.no_urut,
        r.jenis_produk,
        r.nomor_peraturan,
        r.tahun,
        r.tentang,
        r.lingkup_anggaran,
        r.status_berlaku,
        r.instansi_penetap,
        r.modul_terkait,
        r.abstrak,
        r.tautan_dokumen
      );
    }
  } catch (e) {
    console.warn('[JDIH SEED] Gagal inisialisasi master_regulasi:', e.message);
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
      fase_perencanaan: periode.fase_perencanaan || periode.tahap_revisi || 'PRA_NPHD',
      nomor_ba_tapd: periode.nomor_ba_tapd,
      tanggal_ba_tapd: periode.tanggal_ba_tapd,
      nomor_surat_pengajuan_tapd: periode.nomor_surat_pengajuan_tapd,
      tanggal_surat_pengajuan_tapd: periode.tanggal_surat_pengajuan_tapd,
      nomor_surat_balasan_pemda: periode.nomor_surat_balasan_pemda,
      catatan_revisi: periode.catatan_revisi,
      gdrive_link_pleno: periode.gdrive_link_pleno || periode.file_pendukung_path || '',
      rkb_final_link: periode.rkb_final_link || '',
      kak_gabungan_link: periode.kak_gabungan_link || '',
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
  let p = db.prepare("SELECT * FROM periode_anggaran WHERE tipe_dokumen = 'RKB' AND is_locked = 0 ORDER BY id DESC LIMIT 1").get();
  if (!p) {
    p = db.prepare("SELECT * FROM periode_anggaran WHERE tipe_dokumen = 'RKB' AND is_locked = 1 ORDER BY revisi_ke DESC, id DESC LIMIT 1").get();
  }
  if (!p) {
    p = db.prepare('SELECT * FROM periode_anggaran ORDER BY id DESC LIMIT 1').get();
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
 * Mendapatkan siklus revisi aktif atau membukanya secara atomik jika belum ada.
 * Bab 17 Canon Master Blueprint:
 * - Selesainya Tahap 4 tidak otomatis mengubah fase menjadi NPHD.
 * - Saat fase NPHD ditetapkan pada siklus sebelumnya, siklus berikutnya otomatis berfase PASCA_NPHD.
 * - Jika fase sebelumnya PRA_NPHD, siklus berikutnya tetap berfase PRA_NPHD.
 */
function getOrCreateRevisionCycle(user = null) {
  let active = getActiveRevisionCycle();
  if (active) return active;

  const base = getLatestRatifiedPeriode();
  if (!base) throw new Error('Tidak ditemukan dokumen RKB dasar yang sah.');

  const basePhase = (base.fase_perencanaan || base.tahap_revisi || 'PRA_NPHD').toUpperCase();
  const nextPhase = (basePhase === 'NPHD' || basePhase === 'PASCA_NPHD') ? 'PASCA_NPHD' : 'PRA_NPHD';

  const nextRev = (base.revisi_ke || 0) + 1;
  active = clonePeriodeToRevision(base.id, {
    nama_periode: `RKB KPU Kabupaten Ngawi (Revisi ${nextRev})`,
    versi_revisi: `Revisi ${nextRev}`,
    tahap_revisi: nextPhase,
    fase_perencanaan: nextPhase,
    dasar_pengesahan: 'Kertas Kerja Penyusunan',
    catatan_revisi: `Siklus revisi ke-${nextRev} dibuka berdasarkan dasar sah ${base.versi_revisi || base.nama_periode}`
  }, false);

  recordAuditLog({
    user,
    action: 'OPEN_REVISION_CYCLE',
    entity: 'periode_anggaran',
    entity_id: active.id,
    notes: `Siklus revisi ke-${nextRev} (Periode ID: ${active.id}, Fase: ${nextPhase}) dibuka berdasarkan dasar sah ${base.versi_revisi} (ID: ${base.id}).`
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

  if (user && Number(user.level) === 3) {
    throw new Error('Akses ditolak. Akun Pimpinan / Viewer (Level 3) bersifat Read-Only dan tidak dapat menyunting rincian RKB.');
  }

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
  versi_usulan = null,
  tahap,
  status,
  aksi,
  catatan = '',
  alasan_pengembalian = '',
  dokumen_surat_link = '',
  dokumen_matriks_link = '',
  dokumen_kak_link = '',
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
    let ver = Number(versi_usulan);
    if (!ver || ver < 1) {
      const pRow = db.prepare('SELECT versi_usulan FROM revisi_pengajuan WHERE id = ?').get(pengajuan_id);
      ver = pRow && pRow.versi_usulan ? Number(pRow.versi_usulan) : 1;
    }

    db.prepare(`
      INSERT INTO revisi_pengajuan_log (
        pengajuan_id, periode_id, subbag, versi_usulan, tahap, status, aksi,
        catatan, alasan_pengembalian, dokumen_surat_link, dokumen_matriks_link, dokumen_kak_link,
        total_semula, total_menjadi, selisih,
        actor_id, actor_username, actor_name, waktu_wib
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      pengajuan_id, periode_id, subbag, ver, tahap, status, aksi,
      catatan, alasan_pengembalian, dokumen_surat_link, dokumen_matriks_link, dokumen_kak_link,
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
  if (!user || Number(user.level) !== 0) {
    throw new Error('Akses ditolak. Baseline RKB yang telah disahkan dan terkunci bersifat immutable (permanen) sesuai Canon Bab 3 & FR-07 dan tidak dapat dibuka kuncinya kembali.');
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
  nama_periode, versi_revisi, tahap_revisi, fase_perencanaan, dasar_pengesahan,
  nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi, parent_periode_id,
  kode_singkat, revisi_ke, sumber_dana, pagu_nphd
}) {
  const countRev = db.prepare("SELECT COUNT(*) as c FROM periode_anggaran WHERE tipe_dokumen = 'RKB'").get()?.c || 1;
  const calcRevisiKe = revisi_ke !== undefined ? revisi_ke : countRev;
  const calcKodeSingkat = kode_singkat || `RKB-REV-${calcRevisiKe}`;
  const cleanFase = (fase_perencanaan || tahap_revisi || 'PRA_NPHD').toUpperCase();

  const res = db.prepare(`
    INSERT INTO periode_anggaran (
      nama_periode, versi_revisi, tahap_revisi, fase_perencanaan, dasar_pengesahan,
      nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi, parent_periode_id,
      is_locked, sumber_dana, tipe_dokumen, jenis_agenda, kode_singkat, revisi_ke, pagu_nphd
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'RKB', 'PILKADA', ?, ?, ?)
  `).run(
    nama_periode || `RKB Revisi ${calcRevisiKe}`,
    versi_revisi || `Revisi ${calcRevisiKe}`,
    tahap_revisi || cleanFase,
    cleanFase,
    dasar_pengesahan || 'BA Pleno Komisioner',
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
  nama_periode, versi_revisi, tahap_revisi, fase_perencanaan, dasar_pengesahan, nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi
}, insideTransaction = false) {
  const source = getPeriodeById(sourcePeriodeId);
  if (!source) throw new Error('Dokumen sumber tidak ditemukan.');

  const nextRev = (source.revisi_ke || 0) + 1;
  const defaultVersi = versi_revisi || `Revisi ${nextRev}`;
  const sourcePhase = (source.fase_perencanaan || source.tahap_revisi || 'PRA_NPHD').toUpperCase();
  const autoNextPhase = (sourcePhase === 'NPHD' || sourcePhase === 'PASCA_NPHD') ? 'PASCA_NPHD' : 'PRA_NPHD';
  const targetFase = (fase_perencanaan || tahap_revisi || autoNextPhase).toUpperCase();

  if (!insideTransaction) db.exec('BEGIN TRANSACTION');
  let newPeriode = null;

  try {
    newPeriode = createPeriode({
      nama_periode: nama_periode || `RKB KPU Kabupaten Ngawi (${defaultVersi})`,
      versi_revisi: defaultVersi,
      tahap_revisi: targetFase,
      fase_perencanaan: targetFase,
      dasar_pengesahan: dasar_pengesahan || 'Kertas Kerja Penyusunan',
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

    syncRkbReferenceLinks(newPeriode.id, true);

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

/**
 * Helper untuk memeriksa apakah baris anak boleh ikut diperbarui secara cascade oleh actorUser
 */
function canCascadeModifyChildRow(periodeId, childRow, actorUser = null) {
  if (!childRow) return false;
  const childPic = normalizePic(childRow.pic_bagian || 'KUL');
  const proposal = db.prepare('SELECT status_tahap FROM revisi_pengajuan WHERE periode_id = ? AND subbag = ?').get(periodeId, childPic);
  const isChildSubbagLocked = Boolean(proposal && ['DIAJUKAN', 'MENUNGGU_PLENO', 'ACC_PLENO', 'SELESAI'].includes(proposal.status_tahap));

  // Jika aktor adalah Operator Level 2: DILARANG menyentuh baris milik subbagian lain atau subbagian yang sudah diajukan/terkunci
  if (actorUser && Number(actorUser.level) > 1) {
    const actorPic = normalizePic(actorUser.pic_subbag);
    if (actorPic !== 'SEMUA' && actorPic !== childPic) {
      return false;
    }
    if (isChildSubbagLocked) {
      return false;
    }
    return true;
  }

  // Bahkan untuk Level 1 / sistem: saat propagasi otomatis kode akun L5, jangan mengubah baris subbagian yang sudah diajukan/terkunci tanpa izin eksplisit
  if (isChildSubbagLocked && (!actorUser || Number(actorUser.level) > 1)) {
    return false;
  }
  return true;
}

function ensureAccountHeaderForItem(periodeId, itemRowId, kodeAkun, actorUser = null) {
  if (!periodeId || !itemRowId || !kodeAkun) return null;
  const cleanKodeAkun = String(kodeAkun).trim();
  if (!cleanKodeAkun) return null;

  const allRows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(periodeId);
  const itemIdx = allRows.findIndex(r => r.id === Number(itemRowId));
  if (itemIdx === -1) return null;
  const itemRow = allRows[itemIdx];

  const akunInfo = db.prepare('SELECT kode, uraian FROM master_akun WHERE kode = ?').get(cleanKodeAkun);
  const akunUraian = akunInfo ? akunInfo.uraian : `Belanja ${cleanKodeAkun}`;

  // Cari induk struktural (L3 lvl<=2, L4 lvl 21..29, atau L5 Akun lvl=3) di atas item ini
  let nearestL3 = null;
  let nearestL4 = null;
  let enclosingAkun = null;

  for (let i = itemIdx - 1; i >= 0; i--) {
    const r = allRows[i];
    if (r.row_type !== 'header') continue;
    const lvl = Number(r.level_indent);
    if (lvl === 3) {
      if (!nearestL4) {
        enclosingAkun = r;
        break;
      }
      // Jika ada L4/sub-header di antara L5 dan item, cek apakah L4 tersebut punya L5 sendiri
      let l4HasOwnAkun = false;
      const l4Idx = allRows.findIndex(x => x.id === nearestL4.id);
      for (let j = l4Idx + 1; j <= itemIdx; j++) {
        if (allRows[j].row_type === 'header' && Number(allRows[j].level_indent) === 3) {
          l4HasOwnAkun = true;
          break;
        }
      }
      if (!l4HasOwnAkun) {
        enclosingAkun = r;
        break;
      }
    } else if (lvl >= 21 && lvl <= 29) {
      if (!nearestL4) nearestL4 = r;
    } else if (lvl <= 2) {
      nearestL3 = r;
      break;
    }
  }

  if (enclosingAkun) {
    // Jika sudah ada baris L5 Akun di atasnya dan kode akunnya berbeda, sinkronkan L5 Akun tersebut hanya untuk baris yang berhak diubah
    if (String(enclosingAkun.kode || '').trim() !== cleanKodeAkun) {
      const akunIdx = allRows.findIndex(r => r.id === enclosingAkun.id);
      const akunParentRank = nearestL4 ? getRowHierarchyRank(nearestL4) : (nearestL3 ? getRowHierarchyRank(nearestL3) : 30);
      if (canCascadeModifyChildRow(periodeId, enclosingAkun, actorUser)) {
        db.prepare('UPDATE rab_baris SET kode = ?, kode_akun = ?, uraian = ? WHERE id = ?').run(
          cleanKodeAkun, cleanKodeAkun, akunUraian, enclosingAkun.id
        );
      }
      for (let j = akunIdx + 1; j < allRows.length; j++) {
        const child = allRows[j];
        if (child.row_type === 'header') {
          if (Number(child.level_indent) === 3) break;
          if (getRowHierarchyRank(child) <= akunParentRank) break;
        }
        if (canCascadeModifyChildRow(periodeId, child, actorUser)) {
          db.prepare('UPDATE rab_baris SET kode_akun = ? WHERE id = ?').run(cleanKodeAkun, child.id);
        }
      }
    }
    return enclosingAkun.id;
  }

  // Belum ada baris L5 Akun yang menaungi rincian ini!
  // Cek apakah seluruh Kegiatan L3 belum memiliki baris L5 Akun sama sekali
  let anchorHeader = nearestL4 || nearestL3;
  if (nearestL3) {
    const l3Idx = allRows.findIndex(r => r.id === nearestL3.id);
    const l3Rank = getRowHierarchyRank(nearestL3);
    let l3HasAnyAkun = false;
    for (let j = l3Idx + 1; j < allRows.length; j++) {
      const child = allRows[j];
      if (child.row_type === 'header') {
        if (Number(child.level_indent) === 3) {
          l3HasAnyAkun = true;
          break;
        }
        if (getRowHierarchyRank(child) <= l3Rank && Number(child.level_indent) <= 2) break;
      }
    }
    if (!l3HasAnyAkun) {
      anchorHeader = nearestL3;
    }
  }

  const targetAfterUrutan = anchorHeader ? Number(anchorHeader.urutan) : Math.max(0, Number(itemRow.urutan) - 1);
  db.prepare('UPDATE rab_baris SET urutan = urutan + 1 WHERE periode_id = ? AND urutan > ?').run(periodeId, targetAfterUrutan);

  const insertRes = db.prepare(`
    INSERT INTO rab_baris (
      periode_id, urutan, row_type, kode, uraian, level_indent, target_scope, kode_akun,
      basis_pengali, harga_satuan, pic_bagian, sifat_biaya, jenis_biaya, blokir_rm, selalu_tampil_print, catatan_revisi_baris
    ) VALUES (?, ?, 'header', ?, ?, 3, 'ALL', ?, 'NONE', 0, ?, 'NON_OPERASIONAL', 'LANGSUNG', 0, 1, ?)
  `).run(
    periodeId,
    targetAfterUrutan + 1,
    cleanKodeAkun,
    akunUraian,
    cleanKodeAkun,
    itemRow.pic_bagian || (anchorHeader ? anchorHeader.pic_bagian : 'KUL') || 'KUL',
    `Rekam otomatis Akun BAS [${cleanKodeAkun}] menaungi rincian belanja`
  );

  // Sinkronkan kode_akun seluruh rincian di bawah anchorHeader yang dinaungi dan berhak diubah
  if (anchorHeader) {
    const updatedRows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(periodeId);
    const newAkunIdx = updatedRows.findIndex(r => r.id === Number(insertRes.lastInsertRowid));
    const anchorRank = getRowHierarchyRank(anchorHeader);
    if (newAkunIdx !== -1) {
      for (let j = newAkunIdx + 1; j < updatedRows.length; j++) {
        const child = updatedRows[j];
        if (child.row_type === 'header') {
          if (Number(child.level_indent) === 3) break;
          if (getRowHierarchyRank(child) <= anchorRank && Number(child.level_indent) <= 2) break;
          if (anchorRank > 30 && getRowHierarchyRank(child) <= anchorRank) break;
        }
        if (canCascadeModifyChildRow(periodeId, child, actorUser)) {
          db.prepare('UPDATE rab_baris SET kode_akun = ? WHERE id = ?').run(cleanKodeAkun, child.id);
        }
      }
    }
  }

  return Number(insertRes.lastInsertRowid);
}

function saveRabRow(row, actorUser = null, options = {}) {
  const { skipTransaction = false, skipAudit = false } = options;
  const existingForCheck = row.id ? getRabRowById(row.id) : null;
  const targetSubbag = normalizePic(row.pic_bagian || (existingForCheck ? existingForCheck.pic_bagian : 'KUL') || 'KUL');
  checkRowEditPermission(row.periode_id, targetSubbag, actorUser);

  const cleanUraian = (row.uraian || '').trim();
  if (!cleanUraian) throw new Error('Uraian rincian belanja tidak boleh kosong.');

  const expectedRkbVer = options.expected_rkb_version || row.expected_rkb_version || null;
  const forceOverwrite = Boolean(options.force_overwrite || row.force_overwrite);
  if (expectedRkbVer && !forceOverwrite) {
    const curVer = getRkbVersion(row.periode_id);
    if (expectedRkbVer !== curVer) {
      const err = new Error('Terdeteksi Konflik Perubahan: Data RKB telah diperbarui oleh pengguna lain sejak halaman ini dibuka. Muat ulang halaman terlebih dahulu.');
      err.statusCode = 409;
      err.rkb_conflict = true;
      err.current_rkb_version = curVer;
      throw err;
    }
  }

  // Jika menambah L5 Akun (level_indent === 3) dengan mode wrap_children dan di posisi induk sudah ada L5 Akun, gunakan update
  if (!row.id && Number(row.level_indent) === 3 && (row.anchor_mode === 'wrap_children' || row.wrap_children) && row.anchor_row_id) {
    const anchorRow = getRabRowById(Number(row.anchor_row_id));
    if (anchorRow && anchorRow.periode_id === row.periode_id) {
      const allRows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(row.periode_id);
      const anchorIdx = allRows.findIndex(r => r.id === anchorRow.id);
      if (anchorIdx !== -1) {
        if (Number(anchorRow.level_indent) === 3 && anchorRow.row_type === 'header') {
          row.id = anchorRow.id;
        } else if (anchorRow.row_type === 'header' && getRowHierarchyRank(anchorRow) < 50) {
          const nextRow = allRows[anchorIdx + 1];
          if (nextRow && nextRow.row_type === 'header' && Number(nextRow.level_indent) === 3) {
            row.id = nextRow.id;
          }
        } else {
          // anchorRow adalah L6 item atau L6-H sub-header: cari induk L3/L4/L5 di atasnya
          for (let i = anchorIdx - 1; i >= 0; i--) {
            const r = allRows[i];
            if (r.row_type !== 'header') continue;
            const lvl = Number(r.level_indent);
            if (lvl === 3) {
              row.id = r.id;
              break;
            }
            if (lvl <= 2 || (lvl >= 21 && lvl <= 29)) {
              row.anchor_row_id = r.id;
              break;
            }
          }
        }
      }
    }
  }

  const existing = row.id ? getRabRowById(row.id) : null;
  const effectiveRowType = row.row_type || (existing ? existing.row_type : (Number(row.level_indent) < 4 ? 'header' : 'item'));
  const effectiveLevelIndent = row.level_indent !== undefined ? Number(row.level_indent) : (existing ? Number(existing.level_indent) : 4);
  const isHeader = effectiveRowType === 'header' || effectiveLevelIndent < 4;

  const f1 = isHeader ? null : (row.f1_val !== undefined ? parseIndonesianNumber(row.f1_val) : (existing ? existing.f1_val : null));
  const f2 = isHeader ? null : (row.f2_val !== undefined ? parseIndonesianNumber(row.f2_val) : (existing ? existing.f2_val : null));
  const f3 = isHeader ? null : (row.f3_val !== undefined ? parseIndonesianNumber(row.f3_val) : (existing ? existing.f3_val : null));
  const f4 = isHeader ? null : (row.f4_val !== undefined ? parseIndonesianNumber(row.f4_val) : (existing ? existing.f4_val : null));
  const harga = isHeader ? 0 : (row.harga_satuan !== undefined ? (parseIndonesianNumber(row.harga_satuan) || 0) : (existing ? (Number(existing.harga_satuan) || 0) : 0));

  if (!isHeader) {
    if ((f1 !== null && f1 < 0) || (f2 !== null && f2 < 0) || (f3 !== null && f3 < 0) || (f4 !== null && f4 < 0)) {
      throw new Error('Faktor volume perhitungan (f1 s.d. f4) tidak boleh bernilai negatif.');
    }
    if (harga < 0) {
      throw new Error('Harga satuan rincian belanja tidak boleh bernilai negatif.');
    }
  }

  if (row.id) {
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
        catatan_revisi_baris = ?,
        cost_sharing = ?
      WHERE id = ?
    `).run(
      row.urutan !== undefined ? row.urutan : existing.urutan,
      effectiveRowType,
      row.kode !== undefined ? row.kode : existing.kode,
      cleanUraian,
      effectiveLevelIndent,
      row.target_scope || existing.target_scope,
      row.kode_akun || existing.kode_akun,
      f1,
      isHeader ? '' : (row.f1_unit !== undefined ? row.f1_unit : (existing.f1_unit || '')),
      isHeader ? '' : (row.f1_var !== undefined ? row.f1_var : (existing.f1_var || '')),
      f2,
      isHeader ? '' : (row.f2_unit !== undefined ? row.f2_unit : (existing.f2_unit || '')),
      isHeader ? '' : (row.f2_var !== undefined ? row.f2_var : (existing.f2_var || '')),
      f3,
      isHeader ? '' : (row.f3_unit !== undefined ? row.f3_unit : (existing.f3_unit || '')),
      isHeader ? '' : (row.f3_var !== undefined ? row.f3_var : (existing.f3_var || '')),
      f4,
      isHeader ? '' : (row.f4_unit !== undefined ? row.f4_unit : (existing.f4_unit || '')),
      isHeader ? '' : (row.f4_var !== undefined ? row.f4_var : (existing.f4_var || '')),
      isHeader ? 'NONE' : (row.basis_pengali !== undefined ? row.basis_pengali : (existing.basis_pengali || 'NONE')),
      isHeader ? '' : (row.label_pengali_kab !== undefined ? row.label_pengali_kab : (existing.label_pengali_kab || '')),
      isHeader ? '' : (row.label_pengali_adhoc !== undefined ? row.label_pengali_adhoc : (existing.label_pengali_adhoc || '')),
      isHeader ? '' : (row.satuan_vol !== undefined ? row.satuan_vol : (existing.satuan_vol || '')),
      harga,
      row.pic_bagian || existing.pic_bagian,
      row.sifat_biaya || existing.sifat_biaya,
      row.jenis_biaya || existing.jenis_biaya,
      row.blokir_rm !== undefined ? row.blokir_rm : existing.blokir_rm,
      row.selalu_tampil_print !== undefined ? row.selalu_tampil_print : existing.selalu_tampil_print,
      row.parent_rkb_row_id !== undefined ? row.parent_rkb_row_id : existing.parent_rkb_row_id,
      row.catatan_revisi_baris !== undefined ? row.catatan_revisi_baris : existing.catatan_revisi_baris,
      row.cost_sharing !== undefined ? (String(row.cost_sharing).toUpperCase().trim() === 'PROVINSI' ? 'PROVINSI' : 'KABUPATEN') : (existing.cost_sharing || 'KABUPATEN'),
      row.id
    );

    // Jika baris L5 Akun diupdate, sinkronkan kode_akun seluruh rincian yang dinaunginya (hanya yang berhak diubah oleh actorUser)
    if (isHeader && effectiveLevelIndent === 3 && (row.kode_akun || row.kode)) {
      const targetAkun = String(row.kode_akun || row.kode).trim();
      const allRows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(row.periode_id);
      const curIdx = allRows.findIndex(r => r.id === Number(row.id));
      if (curIdx !== -1) {
        let parentRank = 30;
        for (let i = curIdx - 1; i >= 0; i--) {
          if (allRows[i].row_type === 'header' && getRowHierarchyRank(allRows[i]) < 50) {
            parentRank = getRowHierarchyRank(allRows[i]);
            break;
          }
        }
        const childrenToSync = [];
        for (let j = curIdx + 1; j < allRows.length; j++) {
          const child = allRows[j];
          if (child.row_type === 'header') {
            if (Number(child.level_indent) === 3) break;
            if (getRowHierarchyRank(child) <= parentRank && Number(child.level_indent) <= 2) break;
            if (parentRank > 30 && getRowHierarchyRank(child) <= parentRank) break;
          }
          if (canCascadeModifyChildRow(row.periode_id, child, actorUser)) {
            childrenToSync.push(child);
          }
        }
        for (const child of childrenToSync) {
          checkRowEditPermission(row.periode_id, child.pic_bagian, actorUser);
          db.prepare('UPDATE rab_baris SET kode_akun = ? WHERE id = ?').run(targetAkun, child.id);
        }
      }
    }

    // Jika baris rincian belanja (L6) diedit dan diminta memastikan L5 Akun tersedia di atasnya
    if (!isHeader && row.ensure_akun_header) {
      ensureAccountHeaderForItem(row.periode_id, row.id, row.kode_akun || existing.kode_akun || '521211', actorUser);
    }

    try {
      const { clearRkbDatasetCache } = require('./calculation');
      clearRkbDatasetCache(row.periode_id);
    } catch (e) {}

    if (!skipAudit) {
      recordAuditLog({
        user: actorUser,
        action: 'UPDATE_RKB_ROW',
        entity: 'rab_baris',
        entity_id: row.id,
        old_values: { uraian: existing.uraian, harga_satuan: existing.harga_satuan, pic: existing.pic_bagian },
        new_values: { uraian: cleanUraian, harga_satuan: harga, pic: row.pic_bagian || existing.pic_bagian },
        notes: `Baris RKB [${row.id}] diupdate.`
      });
    }

    // Jika baris yang diedit adalah Header dan PIC-nya diubah, lakukan cascade ke seluruh baris anak ("level diatasnya dirubah, level dibawah mengikuti")
    const isHeaderRow = isHeader;
    const newPicVal = row.pic_bagian ? normalizePic(row.pic_bagian) : existing.pic_bagian;
    const isPicChanged = newPicVal && existing.pic_bagian && newPicVal !== normalizePic(existing.pic_bagian);

    if (isHeaderRow && isPicChanged) {
      try {
        updateRabBarisPicWithCascade(existing.periode_id, row.id, newPicVal, true, actorUser, { skipTransaction, skipAudit });
      } catch (cascadeErr) {
        console.warn('[saveRabRow] Cascade PIC notice:', cascadeErr.message);
      }
    }

    const newSasaranVal = row.target_scope ? String(row.target_scope).toUpperCase().trim() : existing.target_scope;
    const isSasaranChanged = newSasaranVal && existing.target_scope && newSasaranVal !== String(existing.target_scope).toUpperCase().trim();

    if (isHeaderRow && isSasaranChanged) {
      try {
        updateRabBarisSasaranWithCascade(existing.periode_id, row.id, newSasaranVal, true, actorUser, { skipTransaction, skipAudit });
      } catch (cascadeErr) {
        console.warn('[saveRabRow] Cascade Sasaran notice:', cascadeErr.message);
      }
    }

    const newCostSharingVal = row.cost_sharing ? (String(row.cost_sharing).toUpperCase().trim() === 'PROVINSI' ? 'PROVINSI' : 'KABUPATEN') : existing.cost_sharing;
    const isCostSharingChanged = newCostSharingVal && existing.cost_sharing && newCostSharingVal !== String(existing.cost_sharing).toUpperCase().trim();

    if (isHeaderRow && isCostSharingChanged) {
      try {
        updateRabBarisCostSharingWithCascade(existing.periode_id, row.id, newCostSharingVal, true, actorUser, { skipTransaction, skipAudit });
      } catch (cascadeErr) {
        console.warn('[saveRabRow] Cascade Cost Sharing notice:', cascadeErr.message);
      }
    }

    bumpRkbVersion(existing.periode_id);
    return getRabRowById(row.id);
  } else {
    let urutan = row.urutan;
    let resolvedBeforeUrutan = row.target_before_urutan;
    let resolvedAfterUrutan = row.target_after_urutan;

    // Resolusi posisi dinamis dari anchor_row_id atau target_after_id pada saat eksekusi transaksi
    const anchorId = row.anchor_row_id || row.target_after_id;
    if (anchorId) {
      const anchorRow = getRabRowById(Number(anchorId));
      if (anchorRow && anchorRow.periode_id === row.periode_id) {
        const mode = row.anchor_mode || (row.target_after_id ? 'after' : 'after_children');
        const allRows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(row.periode_id);
        const anchorIdx = allRows.findIndex(r => r.id === anchorRow.id);
        if (mode === 'before') {
          resolvedBeforeUrutan = anchorRow.urutan;
          resolvedAfterUrutan = undefined;
        } else if (mode === 'wrap_children' || mode === 'after') {
          resolvedAfterUrutan = anchorRow.urutan;
          resolvedBeforeUrutan = undefined;
        } else if (mode === 'after_children' && anchorIdx !== -1) {
          let lastChildU = anchorRow.urutan;
          const anchorRank = getRowHierarchyRank(anchorRow);
          if (anchorRow.row_type === 'header' || anchorRank < 99) {
            for (let i = anchorIdx + 1; i < allRows.length; i++) {
              const r = allRows[i];
              if (r.row_type === 'header' && getRowHierarchyRank(r) <= anchorRank) break;
              lastChildU = r.urutan;
            }
          }
          resolvedAfterUrutan = lastChildU;
          resolvedBeforeUrutan = undefined;
        }
      }
    }

    if (urutan === undefined || urutan === null) {
      if (resolvedBeforeUrutan !== undefined && resolvedBeforeUrutan !== null) {
        const targetBefore = Number(resolvedBeforeUrutan);
        db.prepare('UPDATE rab_baris SET urutan = urutan + 1 WHERE periode_id = ? AND urutan >= ?').run(row.periode_id, targetBefore);
        urutan = targetBefore;
      } else if (resolvedAfterUrutan !== undefined && resolvedAfterUrutan !== null) {
        const targetAfter = Number(resolvedAfterUrutan);
        db.prepare('UPDATE rab_baris SET urutan = urutan + 1 WHERE periode_id = ? AND urutan > ?').run(row.periode_id, targetAfter);
        urutan = targetAfter + 1;
      } else {
        const maxU = db.prepare('SELECT MAX(urutan) as maxU FROM rab_baris WHERE periode_id = ?').get(row.periode_id)?.maxU || 0;
        urutan = maxU + 10;
      }
    }

    const res = db.prepare(`
      INSERT INTO rab_baris (
        periode_id, urutan, row_type, kode, uraian, level_indent, target_scope, kode_akun,
        f1_val, f1_unit, f1_var, f2_val, f2_unit, f2_var, f3_val, f3_unit, f3_var, f4_val, f4_unit, f4_var,
        basis_pengali, label_pengali_kab, label_pengali_adhoc, satuan_vol, harga_satuan,
        pic_bagian, sifat_biaya, jenis_biaya, blokir_rm, selalu_tampil_print, parent_rkb_row_id,
        catatan_revisi_baris, cost_sharing
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?
      )
    `).run(
      row.periode_id, urutan, effectiveRowType, row.kode || '', cleanUraian, effectiveLevelIndent, row.target_scope || 'KAB', row.kode_akun || '521211',
      f1, row.f1_unit || '', row.f1_var || '', f2, row.f2_unit || '', row.f2_var || '', f3, row.f3_unit || '', row.f3_var || '', f4, row.f4_unit || '', row.f4_var || '',
      row.basis_pengali || 'NONE', row.label_pengali_kab || '', row.label_pengali_adhoc || '', row.satuan_vol || row.vol_satuan || '', harga,
      row.pic_bagian || 'KUL', row.sifat_biaya || 'NON_OPERASIONAL', row.jenis_biaya || 'LANGSUNG', row.blokir_rm || 0, row.selalu_tampil_print || 0, row.parent_rkb_row_id || null,
      row.catatan_revisi_baris || '',
      (row.cost_sharing && String(row.cost_sharing).toUpperCase().trim() === 'PROVINSI') ? 'PROVINSI' : 'KABUPATEN'
    );

    const insertedId = Number(res.lastInsertRowid);

    // Jika baris baru adalah L5 Akun (level_indent === 3) yang menaungi rincian di bawahnya, otomatis ikat kode_akun rincian di bawahnya yang berhak diubah
    if (isHeader && effectiveLevelIndent === 3 && (row.anchor_mode === 'wrap_children' || row.wrap_children)) {
      const targetAkun = String(row.kode_akun || row.kode || '521211').trim();
      const allRows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(row.periode_id);
      const curIdx = allRows.findIndex(r => r.id === insertedId);
      if (curIdx !== -1) {
        let parentRank = 30;
        for (let i = curIdx - 1; i >= 0; i--) {
          if (allRows[i].row_type === 'header' && getRowHierarchyRank(allRows[i]) < 50) {
            parentRank = getRowHierarchyRank(allRows[i]);
            break;
          }
        }
        const childrenToSync = [];
        for (let j = curIdx + 1; j < allRows.length; j++) {
          const child = allRows[j];
          if (child.row_type === 'header') {
            if (Number(child.level_indent) === 3) break;
            if (getRowHierarchyRank(child) <= parentRank && Number(child.level_indent) <= 2) break;
            if (parentRank > 30 && getRowHierarchyRank(child) <= parentRank) break;
          }
          if (canCascadeModifyChildRow(row.periode_id, child, actorUser)) {
            childrenToSync.push(child);
          }
        }
        for (const child of childrenToSync) {
          checkRowEditPermission(row.periode_id, child.pic_bagian, actorUser);
          db.prepare('UPDATE rab_baris SET kode_akun = ? WHERE id = ?').run(targetAkun, child.id);
        }
      }
    }

    // Jika baris baru adalah rincian belanja (L6) dan diminta memastikan L5 Akun tersedia di atasnya
    if (!isHeader && row.ensure_akun_header) {
      ensureAccountHeaderForItem(row.periode_id, insertedId, row.kode_akun || '521211', actorUser);
    }

    try {
      const { clearRkbDatasetCache } = require('./calculation');
      clearRkbDatasetCache(row.periode_id);
    } catch (e) {}

    if (!skipAudit) {
      recordAuditLog({
        user: actorUser,
        action: 'CREATE_RKB_ROW',
        entity: 'rab_baris',
        entity_id: insertedId,
        new_values: { uraian: cleanUraian, harga_satuan: harga, pic: row.pic_bagian },
        notes: `Baris RKB baru ditambahkan ke periode ${row.periode_id}.`
      });
    }

    bumpRkbVersion(row.periode_id);
    return getRabRowById(insertedId);
  }
}

function deleteRabRow(id, actorUser = null, options = {}) {
  const { skipTransaction = false, skipAudit = false } = options;
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

  // Verifikasi bahwa tidak ada baris turunan dalam idsToDelete yang melanggar batas subbagian atau terkunci pengajuan
  if (actorUser && idsToDelete.length > 1) {
    const checkedPics = new Set([normalizePic(row.pic_bagian)]);
    for (const delId of idsToDelete) {
      const childRow = getRabRowById(delId);
      if (childRow) {
        const childPic = normalizePic(childRow.pic_bagian);
        if (!checkedPics.has(childPic)) {
          checkRowEditPermission(row.periode_id, childPic, actorUser);
          checkedPics.add(childPic);
        }
      }
    }
  }

  // Hapus seluruh baris terpilih dalam 1 transaksi atomik
  const delStmt = db.prepare('DELETE FROM rab_baris WHERE id = ?');
  if (!skipTransaction) db.exec('BEGIN TRANSACTION');
  try {
    for (const delId of idsToDelete) {
      delStmt.run(delId);
    }
    if (!skipTransaction) db.exec('COMMIT');
  } catch (err) {
    if (!skipTransaction) db.exec('ROLLBACK');
    throw err;
  }

  try {
    clearRkbDatasetCache(row.periode_id);
  } catch (e) {}

  if (!skipAudit) {
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
  }

  bumpRkbVersion(row.periode_id);
  return {
    success: true,
    count: idsToDelete.length,
    deletedCount: idsToDelete.length,
    deletedIds: idsToDelete
  };
}

function getRowHierarchyRank(row) {
  if (!row || (row.row_type !== 'header' && !row.is_header)) return 99;
  const lvl = Number(row.level_indent ?? 2);
  const kode = String(row.kode || '').trim();
  const uraian = String(row.uraian || '').trim();
  if (lvl === 0) return 10;
  if (lvl === 1) return 20;
  if (lvl === 2) return 30;
  if (lvl === 21) {
    if (!kode && /^-\s/.test(uraian)) return 42;
    return 41;
  }
  if (lvl === 22) {
    const isNumbered = /^\d+[\)\.]/.test(kode) || /^\d+[\)\.]/.test(uraian);
    if (isNumbered) return 42;
    const isGroupParent = /^(dengan\s|ditingkat\s|pembentukan\s|pelantikan|pergantian\s+antar\s+waktu|penerimaan\s+dan\s+penelitian|penelitian\s+hasil\s+perbaikan|penelitian\s+persyaratan|perbaikan\s+syarat)/i.test(uraian);
    if (isGroupParent) return 41.5;
    return 42.5;
  }
  if (lvl === 23) return 43;
  if (lvl === 24) return 44;
  if (lvl >= 25 && lvl <= 29) return 40 + (lvl - 20);
  if (lvl === 3) return 50;
  if (lvl === 4 || lvl === 41) {
    if (/^[a-z][\.,]?$/i.test(kode)) {
      if (/^dalam\s+rangka/i.test(uraian)) return 60.5;
      return 41;
    }
    if (/^\d+[\)\.]?$/.test(kode)) return 60.2;
    return 61;
  }
  if (lvl === 42) return 62;
  return 45;
}

function updateRabBarisPicWithCascade(periodeId, rowId, picBagian, cascade = true, actorUser = null, options = {}) {
  const { skipTransaction = false } = options;
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
    if (actorUser && Number(actorUser.level) > 1 && !canCascadeModifyChildRow(periodeId, child, actorUser)) {
      continue;
    }
    if (actorUser) {
      checkRowEditPermission(periodeId, child.pic_bagian, actorUser);
    }
    idsToUpdate.push(Number(child.id));
  }

  const upd = db.prepare('UPDATE rab_baris SET pic_bagian = ? WHERE id = ?');
  if (!skipTransaction) db.exec('BEGIN TRANSACTION');
  try {
    idsToUpdate.forEach(id => upd.run(cleanPic, id));
    if (!skipTransaction) db.exec('COMMIT');
  } catch (err) {
    if (!skipTransaction) db.exec('ROLLBACK');
    throw err;
  }

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    if (typeof clearRkbDatasetCache === 'function') clearRkbDatasetCache(periodeId);
  } catch (e) {}

  bumpRkbVersion(periodeId);
  return {
    success: true,
    updatedCount: idsToUpdate.length,
    count: idsToUpdate.length,
    updatedIds: idsToUpdate,
    pic_bagian: cleanPic
  };
}

function updateRabBarisSasaranWithCascade(periodeId, rowId, targetScope, cascade = true, actorUser = null, options = {}) {
  const { skipTransaction = false } = options;
  const cleanSasaran = String(targetScope || 'KAB').toUpperCase().trim();
  const targetRow = getRabRowById(rowId);
  if (!targetRow) throw new Error('Baris tidak ditemukan.');

  checkRowEditPermission(periodeId, targetRow.pic_bagian, actorUser);

  const isHeader = (targetRow.row_type === 'header' || Number(targetRow.level_indent) < 4);

  if (!cascade || !isHeader || cleanSasaran === 'NONE' || cleanSasaran === 'ALL') {
    db.prepare('UPDATE rab_baris SET target_scope = ? WHERE id = ?').run(cleanSasaran, rowId);
    try {
      const { clearRkbDatasetCache } = require('./calculation');
      if (typeof clearRkbDatasetCache === 'function') clearRkbDatasetCache(periodeId);
    } catch (e) {}
    return {
      success: true,
      updatedCount: 1,
      count: 1,
      updatedIds: [Number(rowId)],
      target_scope: cleanSasaran
    };
  }

  const allRows = db.prepare('SELECT id, urutan, kode, uraian, row_type, level_indent, pic_bagian, target_scope FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(periodeId);
  const targetIdx = allRows.findIndex(r => r.id === Number(rowId));
  if (targetIdx === -1) throw new Error('Baris tidak ditemukan dalam periode ini.');

  const targetRank = getRowHierarchyRank(targetRow);
  const idsToUpdate = [Number(targetRow.id)];

  for (let i = targetIdx + 1; i < allRows.length; i++) {
    const child = allRows[i];
    const rRank = getRowHierarchyRank(child);
    if (rRank <= targetRank) break;
    if (!canCascadeModifyChildRow(periodeId, child, actorUser)) {
      continue;
    }
    if (actorUser) {
      checkRowEditPermission(periodeId, child.pic_bagian, actorUser);
    }
    idsToUpdate.push(Number(child.id));
  }

  const upd = db.prepare('UPDATE rab_baris SET target_scope = ? WHERE id = ?');
  if (!skipTransaction) db.exec('BEGIN TRANSACTION');
  try {
    idsToUpdate.forEach(id => upd.run(cleanSasaran, id));
    if (!skipTransaction) db.exec('COMMIT');
  } catch (err) {
    if (!skipTransaction) db.exec('ROLLBACK');
    throw err;
  }

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    if (typeof clearRkbDatasetCache === 'function') clearRkbDatasetCache(periodeId);
  } catch (e) {}

  bumpRkbVersion(periodeId);
  return {
    success: true,
    updatedCount: idsToUpdate.length,
    count: idsToUpdate.length,
    updatedIds: idsToUpdate,
    target_scope: cleanSasaran
  };
}

function updateRabBarisCostSharingWithCascade(periodeId, rowId, costSharing, cascade = true, actorUser = null, options = {}) {
  const { skipTransaction = false } = options;
  const cleanCost = (String(costSharing || '').toUpperCase().trim() === 'PROVINSI') ? 'PROVINSI' : 'KABUPATEN';
  const targetRow = getRabRowById(rowId);
  if (!targetRow) throw new Error('Baris tidak ditemukan.');

  checkRowEditPermission(periodeId, targetRow.pic_bagian, actorUser);

  const isHeader = (targetRow.row_type === 'header' || Number(targetRow.level_indent) < 4);

  if (!cascade || !isHeader) {
    db.prepare('UPDATE rab_baris SET cost_sharing = ? WHERE id = ?').run(cleanCost, rowId);
    try {
      const { clearRkbDatasetCache } = require('./calculation');
      if (typeof clearRkbDatasetCache === 'function') clearRkbDatasetCache(periodeId);
    } catch (e) {}
    return {
      success: true,
      updatedCount: 1,
      count: 1,
      updatedIds: [Number(rowId)],
      cost_sharing: cleanCost
    };
  }

  const allRows = db.prepare('SELECT id, urutan, kode, uraian, row_type, level_indent, pic_bagian, target_scope, cost_sharing FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(periodeId);
  const targetIdx = allRows.findIndex(r => r.id === Number(rowId));
  if (targetIdx === -1) throw new Error('Baris tidak ditemukan dalam periode ini.');

  const targetRank = getRowHierarchyRank(targetRow);
  const idsToUpdate = [Number(targetRow.id)];

  for (let i = targetIdx + 1; i < allRows.length; i++) {
    const child = allRows[i];
    const rRank = getRowHierarchyRank(child);
    if (rRank <= targetRank) break;
    if (!canCascadeModifyChildRow(periodeId, child, actorUser)) {
      continue;
    }
    if (actorUser) {
      checkRowEditPermission(periodeId, child.pic_bagian, actorUser);
    }
    idsToUpdate.push(Number(child.id));
  }

  const upd = db.prepare('UPDATE rab_baris SET cost_sharing = ? WHERE id = ?');
  if (!skipTransaction) db.exec('BEGIN TRANSACTION');
  try {
    idsToUpdate.forEach(id => upd.run(cleanCost, id));
    if (!skipTransaction) db.exec('COMMIT');
  } catch (err) {
    if (!skipTransaction) db.exec('ROLLBACK');
    throw err;
  }

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    if (typeof clearRkbDatasetCache === 'function') clearRkbDatasetCache(periodeId);
  } catch (e) {}

  bumpRkbVersion(periodeId);
  return {
    success: true,
    updatedCount: idsToUpdate.length,
    count: idsToUpdate.length,
    updatedIds: idsToUpdate,
    cost_sharing: cleanCost
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

function reorderRow(periodeId, rowId, direction, actorUser = null, options = {}) {
  const { skipTransaction = false, skipAudit = false } = options;
  const curItem = getRabRowById(rowId);
  if (!curItem) throw new Error('Baris tidak ditemukan.');

  checkRowEditPermission(periodeId, curItem.pic_bagian, actorUser);

  const rows = db.prepare('SELECT id, urutan, row_type, level_indent, parent_rkb_row_id, pic_bagian FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(periodeId);
  const idx = rows.findIndex(r => r.id === Number(rowId));
  if (idx === -1) throw new Error('Baris tidak ditemukan.');

  const curRow = rows[idx];
  const curRank = getRowHierarchyRank(curRow);
  const dir = String(direction).toLowerCase();

  // Tentukan rentang blok (subtree) dari baris terpilih: [idx .. curBlockEnd]
  let curBlockEnd = idx;
  if (curRow.row_type === 'header' || curRank < 99) {
    for (let i = idx + 1; i < rows.length; i++) {
      if (getRowHierarchyRank(rows[i]) <= curRank) break;
      curBlockEnd = i;
    }
  }

  // Tentukan batas parent group (induk terdekat dengan rank < curRank)
  let parentIdx = -1;
  let parentRank = 0;
  for (let i = idx - 1; i >= 0; i--) {
    const rRank = getRowHierarchyRank(rows[i]);
    if (rRank < curRank) {
      parentIdx = i;
      parentRank = rRank;
      break;
    }
  }

  let groupStart = parentIdx + 1;
  let groupEnd = rows.length - 1;
  if (parentIdx !== -1) {
    for (let i = parentIdx + 1; i < rows.length; i++) {
      if (getRowHierarchyRank(rows[i]) <= parentRank) {
        groupEnd = i - 1;
        break;
      }
    }
  }

  let siblingStart = -1;
  let siblingEnd = -1;

  if (dir === 'up') {
    if (idx <= groupStart) return false; // Sudah di paling atas grup induknya
    // Cari sibling sejajar tepat di atas dalam grup induk yang sama
    for (let i = idx - 1; i >= groupStart; i--) {
      const rRank = getRowHierarchyRank(rows[i]);
      if (rRank === curRank) {
        siblingStart = i;
        siblingEnd = idx - 1;
        break;
      }
      if (rRank < curRank) break;
    }
    if (siblingStart === -1) return false;
  } else {
    if (curBlockEnd >= groupEnd) return false; // Sudah di paling bawah grup induknya
    const nextIdx = curBlockEnd + 1;
    if (nextIdx > groupEnd) return false;
    const nextRank = getRowHierarchyRank(rows[nextIdx]);
    if (nextRank !== curRank) return false;
    siblingStart = nextIdx;
    siblingEnd = nextIdx;
    if (rows[nextIdx].row_type === 'header' || nextRank < 99) {
      for (let i = nextIdx + 1; i <= groupEnd; i++) {
        if (getRowHierarchyRank(rows[i]) <= nextRank) break;
        siblingEnd = i;
      }
    }
  }

  const swapRow = rows[siblingStart];
  checkRowEditPermission(periodeId, swapRow.pic_bagian, actorUser);

  // Susun ulang urutan dalam rentang gabungan kedua blok menggunakan nilai urutan yang ada
  const rangeStart = Math.min(idx, siblingStart);
  const rangeEnd = Math.max(curBlockEnd, siblingEnd);
  const existingUrutans = [];
  for (let i = rangeStart; i <= rangeEnd; i++) {
    existingUrutans.push(rows[i].urutan !== null && rows[i].urutan !== undefined ? Number(rows[i].urutan) : (i + 1) * 10);
  }
  // Pastikan urutan strictly increasing bila ada duplikat
  for (let i = 1; i < existingUrutans.length; i++) {
    if (existingUrutans[i] <= existingUrutans[i - 1]) {
      existingUrutans[i] = existingUrutans[i - 1] + 1;
    }
  }

  const curBlock = rows.slice(idx, curBlockEnd + 1);
  const siblingBlock = rows.slice(siblingStart, siblingEnd + 1);
  const reorderedBlock = dir === 'up'
    ? [...curBlock, ...siblingBlock]
    : [...siblingBlock, ...curBlock];

  const updStmt = db.prepare('UPDATE rab_baris SET urutan = ? WHERE id = ?');
  if (!skipTransaction) db.exec('BEGIN TRANSACTION');
  try {
    for (let i = 0; i < reorderedBlock.length; i++) {
      updStmt.run(existingUrutans[i], reorderedBlock[i].id);
    }
    if (!skipTransaction) db.exec('COMMIT');
  } catch (err) {
    if (!skipTransaction) db.exec('ROLLBACK');
    throw err;
  }

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache(periodeId);
  } catch (e) {}

  if (!skipAudit) {
    recordAuditLog({
      user: actorUser,
      action: 'REORDER_ROW',
      entity: 'rab_baris',
      entity_id: rowId,
      notes: `Pengurutan baris [${rowId}] (${curBlock.length} baris) ditukar ke arah ${direction}.`
    });
  }

  return true;
}

// ============================================================================
// STAGED DRAFT BUFFER, REFERENCE SYNC & BATCH COMMIT RKB (BAB 18.8 CANON)
// ============================================================================

function getMasterReferenceVersion() {
  try {
    const desaAgg = db.prepare(`
      SELECT COUNT(*) as cnt,
             COALESCE(SUM(tps), 0) as tps,
             COALESCE(SUM(kotak), 0) as kotak,
             COALESCE(SUM(pantarlih), 0) as pantarlih,
             COALESCE(SUM(pemilih), 0) as pemilih
      FROM master_desa
    `).get() || {};
    const kecCnt = db.prepare('SELECT COUNT(*) as cnt FROM master_kecamatan').get()?.cnt || 0;
    const paslonAgg = db.prepare("SELECT COUNT(*) as cnt, GROUP_CONCAT(keterangan, ',') as ket FROM master_paslon").get() || {};
    const kuantitasAgg = db.prepare('SELECT COUNT(*) as cnt, COALESCE(SUM(nilai), 0) as sumNilai FROM master_kuantitas').get() || {};
    const sbmAgg = db.prepare('SELECT COUNT(*) as cnt, COALESCE(SUM(harga_satuan), 0) as sumBesaran FROM master_sbm').get() || {};
    const akunCnt = db.prepare('SELECT COUNT(*) as cnt FROM master_akun').get()?.cnt || 0;

    const raw = [
      `kec:${kecCnt}`,
      `desa:${desaAgg.cnt}:${desaAgg.tps}:${desaAgg.kotak}:${desaAgg.pantarlih}:${desaAgg.pemilih}`,
      `paslon:${paslonAgg.cnt}:${paslonAgg.ket || ''}`,
      `kuant:${kuantitasAgg.cnt}:${kuantitasAgg.sumNilai}`,
      `sbm:${sbmAgg.cnt}:${sbmAgg.sumBesaran}`,
      `akun:${akunCnt}`
    ].join('|');

    const hash = crypto.createHash('sha1').update(raw).digest('hex').slice(0, 12);
    return {
      version: hash,
      summary: {
        kecamatan: Number(kecCnt),
        desa: Number(desaAgg.cnt || 0),
        tps: Number(desaAgg.tps || 0),
        kotak: Number(desaAgg.kotak || 0),
        pantarlih: Number(desaAgg.pantarlih || 0),
        pemilih: Number(desaAgg.pemilih || 0),
        paslon: Number(paslonAgg.cnt || 0),
        sbm_count: Number(sbmAgg.cnt || 0)
      }
    };
  } catch (e) {
    return { version: 'default', summary: {} };
  }
}

function getRkbVersion(periodeId) {
  try {
    const row = db.prepare(`
      SELECT 
        COUNT(*) AS c,
        COALESCE(MAX(id), 0) AS max_id,
        COALESCE(SUM(urutan), 0) AS sum_urutan,
        COALESCE(SUM(harga_satuan), 0) AS sum_harga,
        COALESCE(SUM(COALESCE(f1_val, 0) + COALESCE(f2_val, 0) + COALESCE(f3_val, 0) + COALESCE(f4_val, 0)), 0) AS sum_vol,
        COALESCE(SUM(length(uraian)), 0) AS sum_len
      FROM rab_baris
      WHERE periode_id = ?
    `).get(Number(periodeId)) || {};
    
    const p = db.prepare('SELECT is_locked, revisi_ke FROM periode_anggaran WHERE id = ?').get(Number(periodeId));
    const sRow = db.prepare("SELECT value FROM settings_satker WHERE key = ?").get(`rkb_ver_${periodeId}`);
    const vCounter = (sRow && sRow.value) ? sRow.value : '0';
    const raw = `${periodeId}:${row.c || 0}:${row.max_id || 0}:${row.sum_urutan || 0}:${row.sum_harga || 0}:${row.sum_vol || 0}:${row.sum_len || 0}:${p ? p.is_locked : 0}:${p ? p.revisi_ke : 0}:${vCounter}`;
    return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16);
  } catch (e) {
    return 'v0_default';
  }
}

function bumpRkbVersion(periodeId) {
  try {
    const key = `rkb_ver_${periodeId}`;
    const sRow = db.prepare("SELECT value FROM settings_satker WHERE key = ?").get(key);
    const cur = sRow ? Number(sRow.value) : 0;
    const next = (Number.isFinite(cur) ? cur : 0) + 1;
    try {
      db.prepare("REPLACE INTO settings_satker (key, value) VALUES (?, ?)").run(key, String(next));
    } catch (e) {
      db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES (?, ?)").run(key, String(next));
    }
    return next;
  } catch (e) {
    return 1;
  }
}

function executeStagedOpsInternal(periodeId, ops = [], actorUser = null) {
  const { getRkbCalculatedDataset, clearRkbDatasetCache } = require('./calculation');
  clearRkbDatasetCache(periodeId);

  const beforeDataset = getRkbCalculatedDataset(periodeId);
  const beforeRowsMap = new Map();
  (beforeDataset.rows || []).forEach(r => {
    beforeRowsMap.set(Number(r.id), { ...r });
  });

  const tempIdMap = {};
  const resolveId = (rawId) => {
    if (rawId === undefined || rawId === null || rawId === '') return undefined;
    const numId = Number(rawId);
    if (tempIdMap[rawId] !== undefined) return tempIdMap[rawId];
    if (tempIdMap[numId] !== undefined) return tempIdMap[numId];
    return numId;
  };

  let lastAffectedRowId = null;

  for (const op of (ops || [])) {
    if (!op || !op.type) continue;
    const type = String(op.type).toUpperCase();

    if (type === 'SAVE_ROW') {
      const payload = { ...(op.payload || {}) };
      payload.periode_id = periodeId;
      if (payload.id !== undefined && payload.id !== null && payload.id !== '') {
        payload.id = resolveId(payload.id);
      } else {
        delete payload.id;
      }
      if (payload.parent_rkb_row_id) {
        payload.parent_rkb_row_id = resolveId(payload.parent_rkb_row_id);
      }
      if (payload.anchor_row_id) {
        payload.anchor_row_id = resolveId(payload.anchor_row_id);
      }
      if (payload.target_after_id) {
        payload.target_after_id = resolveId(payload.target_after_id);
      }
      if (actorUser && actorUser.level > 1 && !payload.id && actorUser.pic_subbag && actorUser.pic_subbag !== 'SEMUA') {
        payload.pic_bagian = actorUser.pic_subbag;
      }
      const saved = saveRabRow(payload, actorUser, { skipTransaction: true, skipAudit: true });
      if (op.temp_id !== undefined && op.temp_id !== null && saved && saved.id) {
        tempIdMap[op.temp_id] = saved.id;
      }
      if (saved && saved.id) {
        lastAffectedRowId = saved.id;
      }
    } else if (type === 'DELETE_ROW') {
      const targetId = resolveId(op.row_id);
      if (targetId && getRabRowById(targetId)) {
        deleteRabRow(targetId, actorUser, { skipTransaction: true, skipAudit: true });
      }
    } else if (type === 'REORDER_ROW') {
      const targetId = resolveId(op.row_id);
      if (targetId && getRabRowById(targetId)) {
        reorderRow(periodeId, targetId, op.direction, actorUser, { skipTransaction: true, skipAudit: true });
        lastAffectedRowId = targetId;
      }
    } else if (type === 'QUICK_PIC') {
      const targetId = resolveId(op.row_id);
      if (targetId && getRabRowById(targetId)) {
        updateRabBarisPicWithCascade(periodeId, targetId, op.pic_bagian, op.cascade !== false, actorUser, { skipTransaction: true, skipAudit: true });
        lastAffectedRowId = targetId;
      }
    } else if (type === 'QUICK_SASARAN') {
      const targetId = resolveId(op.row_id);
      if (targetId && getRabRowById(targetId)) {
        updateRabBarisSasaranWithCascade(periodeId, targetId, op.target_scope, op.cascade !== false, actorUser, { skipTransaction: true, skipAudit: true });
        lastAffectedRowId = targetId;
      }
    } else if (type === 'QUICK_COST_SHARING') {
      const targetId = resolveId(op.row_id);
      if (targetId && getRabRowById(targetId)) {
        updateRabBarisCostSharingWithCascade(periodeId, targetId, op.cost_sharing, op.cascade !== false, actorUser, { skipTransaction: true, skipAudit: true });
        lastAffectedRowId = targetId;
      }
    } else if (type === 'QUICK_AKUN') {
      const targetId = resolveId(op.row_id);
      const storedRow = targetId ? getRabRowById(targetId) : null;
      if (storedRow && storedRow.periode_id === periodeId) {
        checkRowEditPermission(periodeId, storedRow.pic_bagian, actorUser);
        db.prepare('UPDATE rab_baris SET kode_akun = ? WHERE id = ? AND periode_id = ?').run(op.kode_akun, targetId, periodeId);
        lastAffectedRowId = targetId;
      }
    } else if (type === 'QUICK_CATATAN') {
      const targetId = resolveId(op.row_id);
      const storedRow = targetId ? getRabRowById(targetId) : null;
      if (storedRow && storedRow.periode_id === periodeId) {
        checkRowEditPermission(periodeId, storedRow.pic_bagian, actorUser);
        db.prepare('UPDATE rab_baris SET catatan_revisi_baris = ? WHERE id = ? AND periode_id = ?').run(op.catatan_revisi_baris || '', targetId, periodeId);
        lastAffectedRowId = targetId;
      }
    }
  }

  clearRkbDatasetCache(periodeId);
  const afterDataset = getRkbCalculatedDataset(periodeId);
  const afterRowsMap = new Map();
  (afterDataset.rows || []).forEach(r => {
    afterRowsMap.set(Number(r.id), { ...r });
  });

  // Hitung ringkasan perbedaan antara kondisi DB saat ini (Semula) vs kondisi Staged (Menjadi)
  const changes = [];
  let addedCount = 0;
  let updatedCount = 0;
  let deletedCount = 0;
  let reorderedCount = 0;

  for (const [id, afterRow] of afterRowsMap.entries()) {
    const beforeRow = beforeRowsMap.get(id);
    if (!beforeRow) {
      addedCount++;
      changes.push({
        id,
        status: 'BARU',
        row_type: afterRow.row_type,
        kode: afterRow.kode || '',
        uraian: afterRow.uraian || '',
        pic_bagian: afterRow.pic_bagian || '',
        target_scope: afterRow.target_scope || 'KAB',
        kode_akun: afterRow.kode_akun || '',
        semula_jumlah: 0,
        menjadi_jumlah: afterRow.is_header ? (afterRow.computed_total || 0) : (afterRow.jumlah || 0),
        selisih: afterRow.is_header ? 0 : (afterRow.jumlah || 0),
        detail: afterRow.is_header ? 'Komponen / Header Baru' : `${afterRow.formula_text || '-'} @ Rp ${(afterRow.harga_satuan || 0).toLocaleString('id-ID')}`
      });
    } else {
      const beforeVal = beforeRow.is_header ? 0 : (beforeRow.jumlah || 0);
      const afterVal = afterRow.is_header ? 0 : (afterRow.jumlah || 0);
      const isContentChanged = (
        (beforeRow.uraian || '') !== (afterRow.uraian || '') ||
        (beforeRow.kode || '') !== (afterRow.kode || '') ||
        (beforeRow.kode_akun || '') !== (afterRow.kode_akun || '') ||
        normalizePic(beforeRow.pic_bagian) !== normalizePic(afterRow.pic_bagian) ||
        String(beforeRow.target_scope || 'KAB').toUpperCase() !== String(afterRow.target_scope || 'KAB').toUpperCase() ||
        Number(beforeRow.harga_satuan || 0) !== Number(afterRow.harga_satuan || 0) ||
        Number(beforeRow.vol_total || 0) !== Number(afterRow.vol_total || 0) ||
        Number(beforeVal) !== Number(afterVal) ||
        (beforeRow.catatan_revisi_baris || '') !== (afterRow.catatan_revisi_baris || '')
      );
      const isOrderChanged = Number(beforeRow.urutan || 0) !== Number(afterRow.urutan || 0);

      if (isContentChanged) {
        updatedCount++;
        const diffs = [];
        if ((beforeRow.uraian || '') !== (afterRow.uraian || '')) diffs.push(`Uraian diubah`);
        if (normalizePic(beforeRow.pic_bagian) !== normalizePic(afterRow.pic_bagian)) diffs.push(`PIC: ${beforeRow.pic_bagian} → ${afterRow.pic_bagian}`);
        if (String(beforeRow.target_scope || 'KAB').toUpperCase() !== String(afterRow.target_scope || 'KAB').toUpperCase()) diffs.push(`Sasaran: ${beforeRow.target_scope} → ${afterRow.target_scope}`);
        if ((beforeRow.kode_akun || '') !== (afterRow.kode_akun || '')) diffs.push(`Akun: ${beforeRow.kode_akun} → ${afterRow.kode_akun}`);
        if (Number(beforeRow.vol_total || 0) !== Number(afterRow.vol_total || 0)) diffs.push(`Vol: ${beforeRow.vol_total || 0} → ${afterRow.vol_total || 0}`);
        if (Number(beforeRow.harga_satuan || 0) !== Number(afterRow.harga_satuan || 0)) diffs.push(`Harga: Rp ${(beforeRow.harga_satuan || 0).toLocaleString('id-ID')} → Rp ${(afterRow.harga_satuan || 0).toLocaleString('id-ID')}`);
        if ((beforeRow.catatan_revisi_baris || '') !== (afterRow.catatan_revisi_baris || '')) diffs.push(`Catatan diperbarui`);

        changes.push({
          id,
          status: 'DIUBAH',
          row_type: afterRow.row_type,
          kode: afterRow.kode || '',
          uraian: afterRow.uraian || '',
          pic_bagian: afterRow.pic_bagian || '',
          target_scope: afterRow.target_scope || 'KAB',
          kode_akun: afterRow.kode_akun || '',
          semula_jumlah: beforeVal,
          menjadi_jumlah: afterVal,
          selisih: afterVal - beforeVal,
          detail: diffs.join(' | ') || 'Perubahan atribut baris'
        });
      } else if (isOrderChanged) {
        reorderedCount++;
      }
    }
  }

  for (const [id, beforeRow] of beforeRowsMap.entries()) {
    if (!afterRowsMap.has(id)) {
      deletedCount++;
      const beforeVal = beforeRow.is_header ? 0 : (beforeRow.jumlah || 0);
      changes.push({
        id,
        status: 'DIHAPUS',
        row_type: beforeRow.row_type,
        kode: beforeRow.kode || '',
        uraian: beforeRow.uraian || '',
        pic_bagian: beforeRow.pic_bagian || '',
        target_scope: beforeRow.target_scope || 'KAB',
        kode_akun: beforeRow.kode_akun || '',
        semula_jumlah: beforeVal,
        menjadi_jumlah: 0,
        selisih: -beforeVal,
        detail: beforeRow.is_header ? 'Komponen / Header Dihapus' : 'Rincian Belanja Dihapus'
      });
    }
  }

  const paguSemula = beforeDataset.summary?.grandTotal || 0;
  const paguMenjadi = afterDataset.summary?.grandTotal || 0;

  return {
    beforeDataset,
    afterDataset,
    tempIdMap,
    lastAffectedRowId,
    staged_diff: {
      ops_count: (ops || []).length,
      added_count: addedCount,
      updated_count: updatedCount,
      deleted_count: deletedCount,
      reordered_count: reorderedCount,
      pagu_semula: paguSemula,
      pagu_menjadi: paguMenjadi,
      selisih_pagu: paguMenjadi - paguSemula,
      changes
    }
  };
}

function previewStagedRkbOps(periodeId, ops = [], actorUser = null) {
  const { clearRkbDatasetCache } = require('./calculation');
  const periode = getPeriodeById(periodeId);
  if (!periode) throw new Error('Dokumen RKB tidak ditemukan.');
  if (Number(periode.is_locked) === 1 && (!actorUser || actorUser.level > 0)) {
    throw new Error('Dokumen RKB berstatus TERKUNCI.');
  }

  let inTx = false;
  try {
    db.exec('BEGIN TRANSACTION');
    inTx = true;
  } catch (e) {
    try {
      db.exec('BEGIN');
      inTx = true;
    } catch (e2) {}
  }

  let hasSavepoint = false;
  try {
    db.exec('SAVEPOINT sp_rkb_staged_preview');
    hasSavepoint = true;
  } catch (e) {}

  try {
    const res = executeStagedOpsInternal(periodeId, ops, actorUser);
    const refMeta = getMasterReferenceVersion();
    if (hasSavepoint) {
      try { db.exec('ROLLBACK TO SAVEPOINT sp_rkb_staged_preview'); } catch (e) {}
      try { db.exec('RELEASE SAVEPOINT sp_rkb_staged_preview'); } catch (e) {}
    }
    if (inTx) {
      try { db.exec('ROLLBACK'); } catch (e) {}
    }
    clearRkbDatasetCache(periodeId);
    return {
      afterDataset: res.afterDataset,
      staged_diff: res.staged_diff,
      tempIdMap: res.tempIdMap,
      lastAffectedRowId: res.lastAffectedRowId,
      reference_version: refMeta.version,
      reference_summary: refMeta.summary,
      rkb_version: getRkbVersion(periodeId)
    };
  } catch (err) {
    if (hasSavepoint) {
      try { db.exec('ROLLBACK TO SAVEPOINT sp_rkb_staged_preview'); } catch (e) {}
      try { db.exec('RELEASE SAVEPOINT sp_rkb_staged_preview'); } catch (e) {}
    }
    if (inTx) {
      try { db.exec('ROLLBACK'); } catch (e) {}
    }
    clearRkbDatasetCache(periodeId);
    throw err;
  }
}

function commitStagedRkbOps(periodeId, ops = [], options = {}, actorUser = null) {
  const { clearRkbDatasetCache } = require('./calculation');
  const periode = getPeriodeById(periodeId);
  if (!periode) throw new Error('Dokumen RKB tidak ditemukan.');
  if (Number(periode.is_locked) === 1 && (!actorUser || actorUser.level > 0)) {
    throw new Error('Dokumen RKB berstatus TERKUNCI.');
  }
  if (!Array.isArray(ops) || ops.length === 0) {
    throw new Error('Tidak ada perubahan RKB yang perlu disimpan.');
  }

  const currentRef = getMasterReferenceVersion();
  const expectedRef = options.expected_reference_version || null;
  const ackRefChange = Boolean(options.acknowledge_reference_change);

  // Deteksi perubahan referensi bersamaan (Concurrent Reference Change Guard - Bab 18.8)
  if (expectedRef && expectedRef !== currentRef.version && !ackRefChange) {
    const preview = previewStagedRkbOps(periodeId, ops, actorUser);
    return {
      committed: false,
      reference_changed: true,
      reference_version: currentRef.version,
      reference_summary: currentRef.summary,
      staged_diff: preview.staged_diff,
      message: 'Terdeteksi pembaruan pada Data Referensi / Master selama Anda menyusun draf. Angka perhitungan telah disinkronkan dengan referensi terbaru. Silakan periksa ringkasan dan klik Konfirmasi Simpan kembali.'
    };
  }

  // Deteksi konflik tumpang tindih dokumen RKB (Optimistic Concurrency Control - Temuan 8)
  const currentRkbVer = getRkbVersion(periodeId);
  const expectedRkbVer = options.expected_rkb_version || null;
  const forceOverwrite = Boolean(options.force_overwrite);

  if (expectedRkbVer && expectedRkbVer !== currentRkbVer && !forceOverwrite) {
    const preview = previewStagedRkbOps(periodeId, ops, actorUser);
    return {
      committed: false,
      rkb_conflict: true,
      current_rkb_version: currentRkbVer,
      staged_diff: preview.staged_diff,
      message: 'Terdeteksi Konflik Perubahan: Data RKB telah diperbarui oleh pengguna lain sejak halaman ini dibuka. Muat ulang halaman untuk memuat perubahan terbaru atau simpan paksa untuk menimpa.'
    };
  }

  let inTx = false;
  try {
    db.exec('BEGIN TRANSACTION');
    inTx = true;
  } catch (e) {
    try {
      db.exec('BEGIN');
      inTx = true;
    } catch (e2) {}
  }

  let hasSavepoint = false;
  try {
    db.exec('SAVEPOINT sp_rkb_staged_commit');
    hasSavepoint = true;
  } catch (e) {}

  try {
    const res = executeStagedOpsInternal(periodeId, ops, actorUser);
    if (hasSavepoint) {
      try {
        db.exec('RELEASE SAVEPOINT sp_rkb_staged_commit');
      } catch (e) {
        // Abaikan jika database engine (seperti MySQL autocommit) sudah merilis savepoint otomatis
      }
    }
    if (inTx) {
      try {
        db.exec('COMMIT');
      } catch (e) {}
    }
    clearRkbDatasetCache(periodeId);

    const diff = res.staged_diff;
    const catatanSimpan = (options.catatan_simpan || '').trim();
    const summaryNotes = [
      `Simpan Perubahan RKB (${diff.ops_count} aksi: +${diff.added_count} baru, ~${diff.updated_count} diubah, -${diff.deleted_count} dihapus${diff.reordered_count ? `, ↕${diff.reordered_count} urutan` : ''}).`,
      `Pagu: Rp ${(diff.pagu_semula || 0).toLocaleString('id-ID')} → Rp ${(diff.pagu_menjadi || 0).toLocaleString('id-ID')} (Selisih: ${diff.selisih_pagu >= 0 ? '+' : ''}Rp ${(diff.selisih_pagu || 0).toLocaleString('id-ID')}).`,
      catatanSimpan ? `Catatan: ${catatanSimpan}` : ''
    ].filter(Boolean).join(' ');

    recordAuditLog({
      user: actorUser,
      action: 'COMMIT_RKB_CHANGES',
      entity: 'periode_anggaran',
      entity_id: periodeId,
      old_values: {
        pagu_semula: diff.pagu_semula,
        reference_version: expectedRef || currentRef.version
      },
      new_values: {
        pagu_menjadi: diff.pagu_menjadi,
        selisih_pagu: diff.selisih_pagu,
        added_count: diff.added_count,
        updated_count: diff.updated_count,
        deleted_count: diff.deleted_count,
        reordered_count: diff.reordered_count,
        reference_version: currentRef.version,
        catatan_simpan: catatanSimpan,
        changes: (diff.changes || []).slice(0, 50)
      },
      notes: summaryNotes
    });

    // Flush WAL & cadangkan langsung (ACID Durability)
    checkpointAndSyncDatabase('PASSIVE');

    bumpRkbVersion(periodeId);
    const newRkbVer = getRkbVersion(periodeId);

    return {
      committed: true,
      reference_changed: false,
      reference_version: currentRef.version,
      reference_summary: currentRef.summary,
      rkb_version: newRkbVer,
      staged_diff: diff,
      lastAffectedRowId: res.lastAffectedRowId,
      message: 'Seluruh perubahan RKB berhasil disimpan ke dalam database.'
    };
  } catch (err) {
    if (hasSavepoint) {
      try { db.exec('ROLLBACK TO SAVEPOINT sp_rkb_staged_commit'); } catch (e) {}
      try { db.exec('RELEASE SAVEPOINT sp_rkb_staged_commit'); } catch (e) {}
    }
    if (inTx) {
      try { db.exec('ROLLBACK'); } catch (e) {}
    }
    clearRkbDatasetCache(periodeId);
    throw err;
  }
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
  syncPrimaryKuantitas();
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
    regulasis: getRegulasiList(),
    settings
  };
}

function getRegulasiList() {
  try {
    return db.prepare('SELECT * FROM master_regulasi ORDER BY no_urut ASC, tahun DESC, id ASC').all();
  } catch (e) {
    return [];
  }
}

function saveRegulasi(data, actorUser = null) {
  const id = data.id ? Number(data.id) : null;
  const no_urut = Number(data.no_urut) || 1;
  const jenis_produk = String(data.jenis_produk || 'KPT KPU').trim();
  const nomor_peraturan = String(data.nomor_peraturan || '').trim();
  const tahun = Number(data.tahun) || new Date().getFullYear();
  const tentang = String(data.tentang || '').trim();
  const lingkup_anggaran = String(data.lingkup_anggaran || 'PENYUSUNAN & PELAKSANAAN').trim();
  const status_berlaku = String(data.status_berlaku || 'Berlaku').trim();
  const instansi_penetap = String(data.instansi_penetap || '').trim();
  const modul_terkait = String(data.modul_terkait || '').trim();
  const abstrak = String(data.abstrak || '').trim();
  const tautan_dokumen = String(data.tautan_dokumen || '').trim();

  if (!nomor_peraturan || !tentang) {
    throw new Error('Nomor Peraturan dan Judul/Tentang Regulasi wajib diisi.');
  }
  if (/nphd/i.test(jenis_produk) || /naskah perjanjian hibah daerah/i.test(tentang)) {
    throw new Error('NPHD adalah dokumen perjanjian hibah daerah, bukan produk hukum/regulasi JDIH.');
  }

  if (id) {
    db.prepare(`
      UPDATE master_regulasi
      SET kategori = ?, nomor_regulasi = ?, urutan = ?, instansi = ?, lingkup_rkb = ?, pasal_kunci = ?, status = ?,
          no_urut = ?, jenis_produk = ?, nomor_peraturan = ?, tahun = ?, tentang = ?,
          lingkup_anggaran = ?, status_berlaku = ?, instansi_penetap = ?, modul_terkait = ?,
          abstrak = ?, tautan_dokumen = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      jenis_produk, nomor_peraturan, no_urut, instansi_penetap, abstrak, modul_terkait, status_berlaku.toUpperCase(),
      no_urut, jenis_produk, nomor_peraturan, tahun, tentang,
      lingkup_anggaran, status_berlaku, instansi_penetap, modul_terkait,
      abstrak, tautan_dokumen, id
    );
  } else {
    db.prepare(`
      INSERT INTO master_regulasi (
        kategori, nomor_regulasi, urutan, instansi, lingkup_rkb, pasal_kunci, status,
        no_urut, jenis_produk, nomor_peraturan, tahun, tentang,
        lingkup_anggaran, status_berlaku, instansi_penetap, modul_terkait, abstrak, tautan_dokumen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      jenis_produk, nomor_peraturan, no_urut, instansi_penetap, abstrak, modul_terkait, status_berlaku.toUpperCase(),
      no_urut, jenis_produk, nomor_peraturan, tahun, tentang,
      lingkup_anggaran, status_berlaku, instansi_penetap, modul_terkait, abstrak, tautan_dokumen
    );
  }

  recordAuditLog({
    user: actorUser,
    action: id ? 'UPDATE_REGULASI_JDIH' : 'CREATE_REGULASI_JDIH',
    entity: 'master_regulasi',
    entity_id: id || nomor_peraturan,
    notes: `Produk hukum JDIH "${nomor_peraturan}" disimpan.`
  });

  return getRegulasiList();
}

function deleteRegulasi(id, actorUser = null) {
  db.prepare('DELETE FROM master_regulasi WHERE id = ?').run(Number(id));
  recordAuditLog({
    user: actorUser,
    action: 'DELETE_REGULASI_JDIH',
    entity: 'master_regulasi',
    entity_id: id,
    notes: `Produk hukum JDIH ID ${id} dihapus.`
  });
  return { success: true };
}

function updateSettings(settingsObj, actorUser = null) {
  const stmt = db.prepare('INSERT OR REPLACE INTO settings_satker (key, value) VALUES (?, ?)');
  const updSubbag = db.prepare(`
    UPDATE master_subbagian
    SET komisioner_nama = COALESCE(?, komisioner_nama),
        komisioner_jabatan = COALESCE(?, komisioner_jabatan),
        kasubag_nama = COALESCE(?, kasubag_nama),
        kasubag_nip = COALESCE(?, kasubag_nip),
        kasubag_jabatan = COALESCE(?, kasubag_jabatan)
    WHERE kode = ?
  `);
  db.exec('BEGIN TRANSACTION');
  try {
    for (const [k, v] of Object.entries(settingsObj)) {
      if (k === 'subbag_signatories' && v && typeof v === 'object') {
        for (const [subCode, sig] of Object.entries(v)) {
          if (sig && typeof sig === 'object') {
            updSubbag.run(
              sig.komisioner_nama !== undefined ? String(sig.komisioner_nama).trim() : null,
              sig.komisioner_jabatan !== undefined ? String(sig.komisioner_jabatan).trim() : null,
              sig.kasubag_nama !== undefined ? String(sig.kasubag_nama).trim() : null,
              sig.kasubag_nip !== undefined ? String(sig.kasubag_nip).trim() : null,
              sig.kasubag_jabatan !== undefined ? String(sig.kasubag_jabatan).trim() : null,
              String(subCode).toUpperCase()
            );
          }
        }
      } else {
        stmt.run(k, String(v));
      }
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

  recordAuditLog({
    user: actorUser,
    action: 'UPDATE_SETTINGS',
    entity: 'settings_satker',
    notes: 'Pengaturan satker & pejabat penandatangan dokumen perencanaan diperbarui.'
  });

  return getMasters().settings;
}

function normalizeJalurPaslon(ket, partai = '') {
  const k = String(ket || '').trim();
  if (k === 'Jalur Perseorangan' || k === 'Jalur Parpol') return k;
  if (
    k.toLowerCase().includes('perseorangan') ||
    String(partai || '').trim().toLowerCase().startsWith('perseorangan')
  ) {
    return 'Jalur Perseorangan';
  }
  return 'Jalur Parpol';
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

    const livePantarlih = Math.round(Number(agg.sumPantarlih) || 0);
    const liveDesa = Math.round(Number(agg.jmlDesa) || 0);
    const liveTps = Math.round(Number(agg.sumTps) || 0);
    const liveKotak = Math.round(Number(agg.sumKotak) || liveTps);
    const livePemilih = Math.round(Number(agg.sumPemilih) || 0);
    const liveSuratSuara = Math.round(livePemilih * 1.025);
    const liveKec = Number(db.prepare('SELECT COUNT(*) as cnt FROM master_kecamatan').get()?.cnt) || 0;
    const livePaslon = Number(db.prepare('SELECT COUNT(*) as cnt FROM master_paslon').get()?.cnt) || 0;
    const livePaslonParpol = Number(db.prepare("SELECT COUNT(*) as cnt FROM master_paslon WHERE keterangan = 'Jalur Parpol'").get()?.cnt) || 0;
    const livePaslonPerseorangan = Number(db.prepare("SELECT COUNT(*) as cnt FROM master_paslon WHERE keterangan = 'Jalur Perseorangan'").get()?.cnt) || 0;

    // Pastikan parameter SSOT kotak_rkb dan formasi per-TPS tersedia di master_kuantitas
    const ensureKuantitasParam = (kode, nama, satuan, defaultNilai, kategori, keterangan) => {
      const existing = db.prepare('SELECT id, nilai FROM master_kuantitas WHERE kode = ?').get(kode);
      if (!existing) {
        db.prepare(`
          INSERT INTO master_kuantitas (kode, nama, satuan, nilai, kategori, keterangan)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(kode, nama, satuan, defaultNilai, kategori, keterangan);
        return defaultNilai;
      }
      return Number(existing.nilai);
    };

    ensureKuantitasParam('kotak_rkb', 'Jumlah Kotak Suara RKB', 'Kotak', liveKotak, 'WILAYAH', 'Total Kotak Suara se-Kabupaten (Otomatis dari Master Desa & TPS)');
    ensureKuantitasParam('surat_suara', 'Kebutuhan Surat Suara (DPT + 2,5%)', 'Lembar', liveSuratSuara, 'LOGISTIK', `@dpt (${livePemilih.toLocaleString('id-ID')}) + 2,5% = ${liveSuratSuara.toLocaleString('id-ID')} Lembar`);
    const kppsKetuaPerTps = ensureKuantitasParam('kpps_ketua_tps', 'Formasi Ketua KPPS per TPS', 'Org', 1, 'PERSONIL', 'Jumlah Ketua KPPS di setiap TPS (Default: 1 Org/TPS)');
    const kppsAnggotaPerTps = ensureKuantitasParam('kpps_anggota_tps', 'Formasi Anggota KPPS per TPS', 'Org', 6, 'PERSONIL', 'Jumlah Anggota KPPS di setiap TPS (Default: 6 Org/TPS)');
    const linmasPerTps = ensureKuantitasParam('linmas_per_tps', 'Formasi Linmas / Ketertiban per TPS', 'Org', 2, 'PERSONIL', 'Jumlah Petugas Ketertiban (Linmas) di setiap TPS (Default: 2 Org/TPS)');

    const liveKomisioner = Number(db.prepare("SELECT nilai FROM master_kuantitas WHERE kode = 'komisioner'").get()?.nilai) || 0;
    const liveSekretariat = Number(db.prepare("SELECT nilai FROM master_kuantitas WHERE kode = 'sekretariat_kpu'").get()?.nilai) || 0;
    const liveKpuAll = liveKomisioner + liveSekretariat;
    const liveKppsAllPerTps = kppsKetuaPerTps + kppsAnggotaPerTps + linmasPerTps;

    const upd = db.prepare('UPDATE master_kuantitas SET nilai = ? WHERE kode = ?');
    const updWithKet = db.prepare('UPDATE master_kuantitas SET nilai = ?, keterangan = ? WHERE kode = ?');

    upd.run(livePantarlih, 'pantarlih');
    upd.run(liveTps, 'tps_rkb');
    updWithKet.run(liveKotak, `Total Kotak Suara se-Kabupaten (Otomatis dari Master Desa & TPS: ${liveKotak.toLocaleString('id-ID')} Kotak)`, 'kotak_rkb');
    upd.run(liveDesa, 'desa_pps');
    upd.run(liveKec, 'kec_ppk');
    upd.run(livePemilih, 'pemilih_dpt');
    upd.run(livePemilih, 'dpt');
    updWithKet.run(liveSuratSuara, `@dpt (${livePemilih.toLocaleString('id-ID')}) + 2,5% = ${liveSuratSuara.toLocaleString('id-ID')} Lembar`, 'surat_suara');
    updWithKet.run(livePaslonParpol, `Bakal Pasangan Calon Jalur Parpol (Otomatis dari Master Paslon Parameter Jalur Parpol: ${livePaslonParpol} Paslon)`, 'paslon_parpol');
    updWithKet.run(livePaslonPerseorangan, `Bakal Pasangan Calon Jalur Perseorangan (Otomatis dari Master Paslon Parameter Jalur Perseorangan: ${livePaslonPerseorangan} Paslon)`, 'paslon_perseorangan');
    updWithKet.run(livePaslon, `Total Bakal Pasangan Calon (Otomatis dari Master Paslon: ${livePaslonParpol} Jalur Parpol + ${livePaslonPerseorangan} Jalur Perseorangan = ${livePaslon} Paslon)`, 'paslon');
    updWithKet.run(liveKpuAll, `${liveKomisioner} Komisioner + ${liveSekretariat} Sekretariat = ${liveKpuAll} Org`, 'kpu_all');

    updWithKet.run(liveKppsAllPerTps, `${kppsKetuaPerTps} Ketua + ${kppsAnggotaPerTps} Anggota + ${linmasPerTps} Linmas = ${liveKppsAllPerTps} Org/TPS`, 'kpps_all');
    updWithKet.run(liveTps * kppsKetuaPerTps, `${kppsKetuaPerTps} Org × ${liveTps.toLocaleString('id-ID')} TPS = ${(liveTps * kppsKetuaPerTps).toLocaleString('id-ID')} Org`, 'kpps_ketua');
    updWithKet.run(liveTps * kppsAnggotaPerTps, `${kppsAnggotaPerTps} Org × ${liveTps.toLocaleString('id-ID')} TPS = ${(liveTps * kppsAnggotaPerTps).toLocaleString('id-ID')} Org`, 'kpps_anggota');
    updWithKet.run(liveTps * linmasPerTps, `${linmasPerTps} Org × ${liveTps.toLocaleString('id-ID')} TPS = ${(liveTps * linmasPerTps).toLocaleString('id-ID')} Org`, 'linmas_tps');
    updWithKet.run(liveTps * liveKppsAllPerTps, `${liveKppsAllPerTps} Org × ${liveTps.toLocaleString('id-ID')} TPS = ${(liveTps * liveKppsAllPerTps).toLocaleString('id-ID')} Org`, 'petugas_tps');

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

    syncRkbReferenceLinks();
  } catch (e) {
    console.warn('[SYNC-KUANTITAS] Peringatan sinkronisasi kuantitas:', e.message);
  }
}

/**
 * Sinkronisasi Otomatis Seluruh Link RKB terhadap Variabel Referensi SSOT
 * Memastikan setiap baris RKB pada dokumen draf aktif (is_locked = 0) yang berkaitan dengan
 * TPS, Kotak Suara, Pantarlih/PPDP, Penyelenggara Tingkat TPS (KPPS & Linmas), PPK, PPS,
 * Pemilih (DPT), Paslon, Parpol, dan Personil KPU selalu terikat ke @var SSOT dan memperbarui
 * nilai f1_val..f4_val secara reaktif setiap kali data Referensi berubah.
 */
function syncRkbReferenceLinks(targetPeriodeId = null, forceInitialHeuristics = false) {
  try {
    const kuantitasRows = db.prepare('SELECT kode, nilai, satuan FROM master_kuantitas').all();
    const kMap = {};
    for (const k of kuantitasRows) {
      kMap[String(k.kode || '').trim().toLowerCase()] = Number(k.nilai) || 0;
    }

    const seededFlag = db.prepare("SELECT value FROM settings_satker WHERE key = 'ssot_initial_links_seeded_v1'").get();
    const runHeuristics = Boolean(forceInitialHeuristics || !seededFlag || seededFlag.value !== '1');

    const liveTps = kMap.tps_rkb || 0;
    const liveKotak = kMap.kotak_rkb || liveTps;
    const livePantarlih = kMap.pantarlih || 0;
    const livePemilih = kMap.dpt || kMap.pemilih_dpt || 0;
    const kppsKetuaPerTps = kMap.kpps_ketua_tps ?? 1;
    const kppsAnggotaPerTps = kMap.kpps_anggota_tps ?? 6;
    const linmasPerTps = kMap.linmas_per_tps ?? 2;
    const kppsAllPerTps = kMap.kpps_all ?? (kppsKetuaPerTps + kppsAnggotaPerTps + linmasPerTps);
    const masaKerjaKpps = kMap.masa_kerja_kpps ?? 1;
    const masaKerjaPantarlih = kMap.masa_kerja_pantarlih ?? 1;
    const masaKerjaPpk = kMap.masa_kerja_ppk ?? 8;
    const masaKerjaPps = kMap.masa_kerja_pps ?? 8;
    const ppkAllPerKec = kMap.ppk_all ?? 8;
    const ppsAllPerDesa = kMap.pps_all ?? 6;

    const periods = targetPeriodeId
      ? db.prepare('SELECT id FROM periode_anggaran WHERE id = ? AND is_locked = 0').all(Number(targetPeriodeId))
      : db.prepare('SELECT id FROM periode_anggaran WHERE is_locked = 0').all();

    if (!periods.length) return;

    const updRowStmt = db.prepare(`
      UPDATE rab_baris
      SET f1_val = ?, f1_unit = ?, f1_var = ?,
          f2_val = ?, f2_unit = ?, f2_var = ?,
          f3_val = ?, f3_unit = ?, f3_var = ?,
          f4_val = ?, f4_unit = ?, f4_var = ?,
          basis_pengali = ?, label_pengali_kab = ?, target_scope = ?
      WHERE id = ?
    `);

    for (const p of periods) {
      const rows = db.prepare(`
        SELECT id, urutan, row_type, level_indent, kode, uraian, kode_akun,
               f1_val, f1_unit, f1_var,
               f2_val, f2_unit, f2_var,
               f3_val, f3_unit, f3_var,
               f4_val, f4_unit, f4_var,
               basis_pengali, label_pengali_kab, target_scope, satuan_vol
        FROM rab_baris
        WHERE periode_id = ?
        ORDER BY urutan ASC, id ASC
      `).all(p.id);

      let currentL2Uraian = '';
      let currentL41Uraian = '';

      for (const r of rows) {
        if (r.row_type === 'header') {
          if (Number(r.level_indent) === 2) {
            currentL2Uraian = String(r.uraian || '').trim();
            currentL41Uraian = '';
          } else if (Number(r.level_indent) === 41 || Number(r.level_indent) === 21) {
            currentL41Uraian = String(r.uraian || '').trim();
          }
          continue;
        }

        let f1_val = r.f1_val, f1_unit = r.f1_unit || '', f1_var = r.f1_var || '';
        let f2_val = r.f2_val, f2_unit = r.f2_unit || '', f2_var = r.f2_var || '';
        let f3_val = r.f3_val, f3_unit = r.f3_unit || '', f3_var = r.f3_var || '';
        let f4_val = r.f4_val, f4_unit = r.f4_unit || '', f4_var = r.f4_var || '';
        let basis_pengali = r.basis_pengali || 'FIXED';
        let label_pengali_kab = r.label_pengali_kab || '';
        let target_scope = r.target_scope || 'KAB';

        const uraianClean = String(r.uraian || '').trim();
        const uraianLower = uraianClean.toLowerCase();
        const l2Lower = currentL2Uraian.toLowerCase();
        const l41Lower = currentL41Uraian.toLowerCase();

        if (runHeuristics) {
          // 1. Honorarium Penyelenggara Tingkat TPS (3 KPPS > 521213: a. Ketua, b. Anggota, c. Linmas)
          if (String(r.kode_akun || '') === '521213' && l2Lower === 'kpps' && target_scope === 'TPS') {
            if (uraianLower.includes('ketua')) {
              f1_var = 'kpps_ketua_tps'; f1_val = kppsKetuaPerTps; f1_unit = f1_unit || 'Org';
              f2_var = 'masa_kerja_kpps'; f2_val = masaKerjaKpps; f2_unit = f2_unit || 'Bulan';
              f3_var = 'tps_rkb'; f3_val = liveTps; f3_unit = f3_unit || 'TPS';
              basis_pengali = 'FIXED'; label_pengali_kab = '';
            } else if (uraianLower.includes('anggota')) {
              f1_var = 'kpps_anggota_tps'; f1_val = kppsAnggotaPerTps; f1_unit = f1_unit || 'Org';
              f2_var = 'masa_kerja_kpps'; f2_val = masaKerjaKpps; f2_unit = f2_unit || 'Bulan';
              f3_var = 'tps_rkb'; f3_val = liveTps; f3_unit = f3_unit || 'TPS';
              basis_pengali = 'FIXED'; label_pengali_kab = '';
            } else if (uraianLower.includes('linmas')) {
              f1_var = 'linmas_per_tps'; f1_val = linmasPerTps; f1_unit = f1_unit || 'Org';
              f2_var = 'masa_kerja_kpps'; f2_val = masaKerjaKpps; f2_unit = f2_unit || 'Bulan';
              f3_var = 'tps_rkb'; f3_val = liveTps; f3_unit = f3_unit || 'TPS';
              basis_pengali = 'FIXED'; label_pengali_kab = '';
            }
          }

          // 2. Honorarium Pantarlih / PPDP (4 PPDP > Honor Pantarlih)
          if (uraianLower === 'honor pantarlih' || (String(r.kode_akun || '') === '521213' && l2Lower.includes('ppdp') && uraianLower.includes('pantarlih'))) {
            f1_var = 'masa_kerja_pantarlih'; f1_val = masaKerjaPantarlih; f1_unit = 'Bulan';
            f2_var = 'pantarlih'; f2_val = livePantarlih; f2_unit = 'Org';
            f3_val = null; f3_unit = ''; f3_var = '';
            basis_pengali = 'FIXED'; label_pengali_kab = ''; target_scope = 'PANTARLIH';
          }

          // 3. Perlengkapan & Konsumsi PPDP / Pantarlih (Kaos Coklit PPDP, Konsumsi Pleno DPS/DPTb PPDP, Rapid Test Snack PPDP)
          if (target_scope === 'PANTARLIH' && uraianLower === '-. ppdp') {
            if (String(f2_unit).toLowerCase() === 'buah' || String(f3_unit).toLowerCase() === 'tps' || String(r.satuan_vol || '').toLowerCase() === 'buah') {
              f1_var = 'pantarlih'; f1_val = livePantarlih; f1_unit = 'Org';
              f2_var = ''; f2_val = 1; f2_unit = 'Buah';
              f3_val = null; f3_unit = ''; f3_var = '';
              basis_pengali = 'FIXED'; label_pengali_kab = '';
            } else {
              f1_var = 'pantarlih'; f1_val = livePantarlih; f1_unit = 'Org';
              f2_var = ''; f2_val = 1; f2_unit = 'Keg';
              f3_val = null; f3_unit = ''; f3_var = '';
              basis_pengali = 'FIXED'; label_pengali_kab = '';
            }
          }
          if (l2Lower.includes('kesehatan') && (l41Lower === 'ppdp' || r.urutan === 1661) && uraianLower === '-. snack' && (basis_pengali === 'TPS_RKB' || f1_var === 'pantarlih')) {
            f1_var = 'pantarlih'; f1_val = livePantarlih; f1_unit = 'Org';
            f2_var = ''; f2_val = 1; f2_unit = 'Keg';
            basis_pengali = 'FIXED'; label_pengali_kab = ''; target_scope = 'PANTARLIH';
          }

          // 4. Kebutuhan Per-Petugas TPS (9 Org/TPS = @kpps_all) pada APD, Suplemen, Rapid Test, & Konsumsi KPPS
          if (basis_pengali === 'TPS_RKB' || f3_var === 'tps_rkb' || target_scope === 'TPS') {
            const u1 = String(f1_unit || '').trim().toLowerCase();
            const cleanF1Var = String(f1_var || '').trim();
            if ((!u1 || u1 === '0' || /^(org|orang)$/i.test(u1)) && (cleanF1Var === 'kpps_all' || ((!cleanF1Var || cleanF1Var === '0') && (Number(f1_val) === 9 || Number(f1_val) === kppsAllPerTps)))) {
              f1_var = 'kpps_all';
              f1_val = kppsAllPerTps;
              if (!u1 || u1 === '0') f1_unit = 'Org';
            }
            const u2 = String(f2_unit || '').trim().toLowerCase();
            const cleanF2Var = String(f2_var || '').trim();
            if ((!u2 || u2 === '0' || /^(org|orang)$/i.test(u2)) && (cleanF2Var === 'kpps_all' || ((!cleanF2Var || cleanF2Var === '0') && (Number(f2_val) === 9 || Number(f2_val) === kppsAllPerTps)))) {
              f2_var = 'kpps_all';
              f2_val = kppsAllPerTps;
              if (!u2 || u2 === '0') f2_unit = 'Org';
            }
          }

          // 5. Honorarium PPK & PPS (Masa Kerja PPK & Masa Kerja PPS)
          if (String(r.kode_akun || '') === '521213' && basis_pengali === 'PPK' && target_scope === 'PPK') {
            const u2 = String(f2_unit || '').trim().toLowerCase();
            const u3 = String(f3_unit || '').trim().toLowerCase();
            if (!u2 || u2 === '0' || /^(bulan|bln)$/i.test(u2)) {
              f2_var = 'masa_kerja_ppk'; f2_val = masaKerjaPpk;
              if (!u2 || u2 === '0') f2_unit = 'Bulan';
            } else if (!u3 || u3 === '0' || /^(bulan|bln)$/i.test(u3)) {
              f3_var = 'masa_kerja_ppk'; f3_val = masaKerjaPpk;
              if (!u3 || u3 === '0') f3_unit = 'Bulan';
            }
          }
          if (String(r.kode_akun || '') === '521213' && basis_pengali === 'PPS' && target_scope === 'PPS') {
            const u2 = String(f2_unit || '').trim().toLowerCase();
            const u3 = String(f3_unit || '').trim().toLowerCase();
            if (!u2 || u2 === '0' || /^(bulan|bln)$/i.test(u2)) {
              f2_var = 'masa_kerja_pps'; f2_val = masaKerjaPps;
              if (!u2 || u2 === '0') f2_unit = 'Bulan';
            } else if (!u3 || u3 === '0' || /^(bulan|bln)$/i.test(u3)) {
              f3_var = 'masa_kerja_pps'; f3_val = masaKerjaPps;
              if (!u3 || u3 === '0') f3_unit = 'Bulan';
            }
          }

          // 6. Baris Operasional/Bimtek/APD PPK (8 Org/Kec = @ppk_all) & PPS (6 Org/Desa = @pps_all)
          if (basis_pengali === 'PPK') {
            const u1 = String(f1_unit || '').trim().toLowerCase();
            const cleanF1Var = String(f1_var || '').trim();
            if ((!u1 || u1 === '0' || /^(org|orang)$/i.test(u1)) && (cleanF1Var === 'ppk_all' || ((!cleanF1Var || cleanF1Var === '0') && Number(f1_val) === 8))) {
              f1_var = 'ppk_all'; f1_val = ppkAllPerKec;
              if (!u1 || u1 === '0') f1_unit = 'Org';
            }
            const u2 = String(f2_unit || '').trim().toLowerCase();
            const cleanF2Var = String(f2_var || '').trim();
            if ((!u2 || u2 === '0' || /^(org|orang)$/i.test(u2)) && (cleanF2Var === 'ppk_all' || ((!cleanF2Var || cleanF2Var === '0') && Number(f2_val) === 8))) {
              f2_var = 'ppk_all'; f2_val = ppkAllPerKec;
              if (!u2 || u2 === '0') f2_unit = 'Org';
            }
          }
          if (basis_pengali === 'PPS') {
            const u1 = String(f1_unit || '').trim().toLowerCase();
            const cleanF1Var = String(f1_var || '').trim();
            if ((!u1 || u1 === '0' || /^(org|orang)$/i.test(u1)) && (cleanF1Var === 'pps_all' || ((!cleanF1Var || cleanF1Var === '0') && Number(f1_val) === 6))) {
              f1_var = 'pps_all'; f1_val = ppsAllPerDesa;
              if (!u1 || u1 === '0') f1_unit = 'Org';
            }
            const u2 = String(f2_unit || '').trim().toLowerCase();
            const cleanF2Var = String(f2_var || '').trim();
            if ((!u2 || u2 === '0' || /^(org|orang)$/i.test(u2)) && (cleanF2Var === 'pps_all' || ((!cleanF2Var || cleanF2Var === '0') && Number(f2_val) === 6))) {
              f2_var = 'pps_all'; f2_val = ppsAllPerDesa;
              if (!u2 || u2 === '0') f2_unit = 'Org';
            }
          }
        }

        // 7. Sinkronisasi nilai F1..F4 yang terikat ke @var SSOT
        const fVals = [f1_val, f2_val, f3_val, f4_val];
        const fUnits = [f1_unit, f2_unit, f3_unit, f3_unit !== undefined ? f4_unit : ''];
        const fVars = [f1_var, f2_var, f3_var, f4_var];

        for (let i = 0; i < 4; i++) {
          let uLow = String(fUnits[i] || '').trim().toLowerCase();
          if (uLow === '0') uLow = '';
          const vNum = Number(fVals[i]);
          let vCode = String(fVars[i] || '').trim();
          if (vCode === '0') vCode = '';

          if (!vCode && runHeuristics) {
            const satVolLow = String(r.satuan_vol || '').trim().toLowerCase();
            if ((uLow === 'tps' || satVolLow === 'tps') && vNum >= 100) {
              vCode = 'tps_rkb';
              if (!uLow) fUnits[i] = 'TPS';
            } else if ((uLow === 'kotak' || satVolLow === 'kotak' || uraianLower.includes('pengangkutan logistik')) && vNum >= 100) {
              vCode = 'kotak_rkb';
              if (!uLow) fUnits[i] = 'Kotak';
            } else if ((uLow === 'kec' || uLow === 'kecamatan' || satVolLow === 'kec' || satVolLow === 'kecamatan') && vNum >= 15) {
              vCode = 'kec_ppk';
              if (!uLow) fUnits[i] = 'Kec';
            } else if ((uLow === 'desa' || uLow === 'kelurahan' || satVolLow === 'desa' || satVolLow === 'kelurahan') && vNum >= 100) {
              vCode = 'desa_pps';
              if (!uLow) fUnits[i] = 'Desa';
            } else if (uLow === 'pemilih' || satVolLow === 'pemilih') {
              vCode = 'dpt';
              if (!uLow) fUnits[i] = 'Pemilih';
            } else if (uLow === 'lembar ss' || ((uLow === 'lembar' || satVolLow === 'lembar' || uLow.includes('lembar')) && vNum >= 100000 && (uraianLower.includes('surat suara') || uraianLower.includes('sortir')))) {
              vCode = 'surat_suara';
              if (!uLow) fUnits[i] = 'Lembar';
            } else if (uLow === 'paslon') {
              if (uraianLower.includes('perseorangan')) vCode = 'paslon_perseorangan';
              else if (uraianLower.includes('jalur parpol') || uraianLower.includes('paslon parpol')) vCode = 'paslon_parpol';
              else vCode = 'paslon';
            } else if (uLow === 'parpol' || uLow === 'partai' || uLow.includes('parpol')) {
              vCode = 'parpol';
            } else if (uLow === 'komisioner') {
              vCode = 'komisioner';
            } else if ((uLow === 'org' || uLow === 'orang') && target_scope === 'KAB' && basis_pengali === 'FIXED') {
              if (vNum === 40 && (uraianLower.includes('kpu') || uraianLower.includes('komisioner dan staf') || l41Lower.includes('kpu') || l2Lower.includes('administrasi') || l2Lower.includes('logistik') || l2Lower.includes('pemungutan') || l2Lower.includes('kesehatan'))) {
                vCode = 'kpu_all';
              } else if (vNum === 35 && (uraianLower.includes('sekretariat') || uraianLower.includes('kesekretariatan') || l41Lower.includes('lembur'))) {
                vCode = 'sekretariat_kpu';
              }
            }
          }

          if (vCode && vCode !== 'MANUAL' && vCode !== 'FIXED') {
            const cleanVar = vCode.replace(/^@/, '').toLowerCase();
            fVars[i] = cleanVar;
            if (kMap[cleanVar] !== undefined) {
              fVals[i] = kMap[cleanVar];
            }
          }
        }

        [f1_val, f2_val, f3_val, f4_val] = fVals;
        [f1_unit, f2_unit, f3_unit, f4_unit] = fUnits;
        [f1_var, f2_var, f3_var, f4_var] = fVars;

        // Bersihkan duplikasi label_pengali_kab pada baris FIXED (hanya saat inisialisasi awal)
        if (runHeuristics && basis_pengali === 'FIXED' && /^(tps|kotak)$/i.test(String(label_pengali_kab).trim())) {
          label_pengali_kab = '';
        }

        const isChanged = (
          f1_val !== r.f1_val || f1_unit !== (r.f1_unit || '') || f1_var !== (r.f1_var || '') ||
          f2_val !== r.f2_val || f2_unit !== (r.f2_unit || '') || f2_var !== (r.f2_var || '') ||
          f3_val !== r.f3_val || f3_unit !== (r.f3_unit || '') || f3_var !== (r.f3_var || '') ||
          f4_val !== r.f4_val || f4_unit !== (r.f4_unit || '') || f4_var !== (r.f4_var || '') ||
          basis_pengali !== (r.basis_pengali || 'FIXED') ||
          label_pengali_kab !== (r.label_pengali_kab || '') ||
          target_scope !== (r.target_scope || 'KAB')
        );

        if (isChanged) {
          updRowStmt.run(
            f1_val, f1_unit, f1_var,
            f2_val, f2_unit, f2_var,
            f3_val, f3_unit, f3_var,
            f4_val, f4_unit, f4_var,
            basis_pengali, label_pengali_kab, target_scope,
            r.id
          );
        }
      }
    }

    if (runHeuristics && !targetPeriodeId) {
      try {
        db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES ('ssot_initial_links_seeded_v1', '1')").run();
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[SYNC-RKB-LINKS] Peringatan sinkronisasi link RKB:', err.message);
  }
}

function getKuantitasList() {
  syncPrimaryKuantitas();
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

  syncPrimaryKuantitas();

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: id ? 'UPDATE_KUANTITAS' : 'CREATE_KUANTITAS',
    entity: 'master_kuantitas',
    entity_id: id || kode,
    old_values: existing ? { kode: existing.kode, nama: existing.nama, nilai: existing.nilai, satuan: existing.satuan } : null,
    new_values: { kode, nama, nilai, satuan, keterangan },
    notes: existing
      ? `Parameter kuantitas [${kode}] diubah: ${existing.nilai} ${existing.satuan || ''} → ${nilai} ${satuan || ''}.`
      : `Master kuantitas [${kode}] ditambahkan (${nilai} ${satuan || ''}).`
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
  const ket = normalizeJalurPaslon(data.keterangan, partai);

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
  syncPrimaryKuantitas();

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: id ? 'UPDATE_KECAMATAN' : 'CREATE_KECAMATAN',
    entity: 'master_kecamatan',
    entity_id: id || nama,
    new_values: { no_urut, nama, kode, ketua, sekretaris },
    notes: `Master Kecamatan "${nama}" disimpan.`
  });

  return getKecamatans();
}

function deleteKecamatan(id, actorUser = null) {
  db.prepare('DELETE FROM master_kecamatan WHERE id = ?').run(id);
  syncPrimaryKuantitas();
  syncPrimaryKuantitas();

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: 'DELETE_KECAMATAN',
    entity: 'master_kecamatan',
    entity_id: id,
    notes: `Master Kecamatan ID ${id} dihapus.`
  });

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
  syncPrimaryKuantitas();

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: options.user || null,
    action: 'BULK_IMPORT_KECAMATAN',
    entity: 'master_kecamatan',
    new_values: { inserted: wouldInsert.length, updated: wouldUpdate.length },
    notes: `Impor massal Kecamatan/PPK: ${wouldInsert.length} baru, ${wouldUpdate.length} diperbarui.`
  });

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
  const tps = Math.round(parseIndonesianNumber(data.tps) || 0);
  const kotak = parseIndonesianNumber(data.kotak) !== null ? Math.round(parseIndonesianNumber(data.kotak)) : tps;
  const pantarlih = parseIndonesianNumber(data.pantarlih) !== null ? Math.round(parseIndonesianNumber(data.pantarlih)) : (tps * 2);
  const pemilih = parseIndonesianNumber(data.pemilih) !== null ? Math.round(parseIndonesianNumber(data.pemilih)) : 0;
  const rohaniwan = parseIndonesianNumber(data.rohaniwan) !== null ? Math.round(parseIndonesianNumber(data.rohaniwan)) : 1;
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
  syncPrimaryKuantitas();

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: id ? 'UPDATE_DESA' : 'CREATE_DESA',
    entity: 'master_desa',
    entity_id: id || cleanNama,
    new_values: { nama: cleanNama, kecamatan_id: kecId, tps, kotak, pantarlih, pemilih },
    notes: `Master Desa "${cleanNama}" disimpan.`
  });

  return getDesas();
}

function deleteDesa(id, actorUser = null) {
  db.prepare('DELETE FROM master_desa WHERE id = ?').run(id);
  syncPrimaryKuantitas();
  syncPrimaryKuantitas();

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: actorUser,
    action: 'DELETE_DESA',
    entity: 'master_desa',
    entity_id: id,
    notes: `Master Desa ID ${id} dihapus.`
  });

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

    const rawTpsParsed = parseIndonesianNumber(item.tps);
    if (rawTpsParsed === null) {
      errors.push({ baris: rowNum, nama: cleanNama, error: `Jumlah TPS "${item.tps}" tidak valid.` });
      continue;
    }
    const tps = Math.round(rawTpsParsed);

    const kotak = parseIndonesianNumber(item.kotak) !== null ? Math.round(parseIndonesianNumber(item.kotak)) : tps;
    const pantarlih = parseIndonesianNumber(item.pantarlih) !== null ? Math.round(parseIndonesianNumber(item.pantarlih)) : (tps * 2);
    const pemilih = parseIndonesianNumber(item.pemilih) !== null ? Math.round(parseIndonesianNumber(item.pemilih)) : 0;
    const rohaniwan = parseIndonesianNumber(item.rohaniwan) !== null ? Math.round(parseIndonesianNumber(item.rohaniwan)) : 1;

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
  syncPrimaryKuantitas();

  try {
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache();
  } catch (e) {}

  recordAuditLog({
    user: options.user || null,
    action: 'BULK_IMPORT_DESA',
    entity: 'master_desa',
    new_values: { inserted: wouldInsert.length, updated: wouldUpdate.length },
    notes: `Impor massal Desa/TPS: ${wouldInsert.length} baru, ${wouldUpdate.length} diperbarui.`
  });

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
    const existingSbm = getSbmById(id);
    db.prepare(`
      UPDATE master_sbm 
      SET kode_akun = ?, kategori = ?, uraian = ?, satuan = ?, harga_satuan = ?, keterangan = ?, pagu_sbm = ?, jenis_regulasi = ?, dasar_hukum = ?
      WHERE id = ?
    `).run(kode_akun, kategori, uraian, satuan, harga, ket, pagu, regulasi, dasar, id);
    recordAuditLog({
      user: actorUser,
      action: 'UPDATE_SBM',
      entity: 'master_sbm',
      entity_id: id,
      old_values: existingSbm ? { kode_akun: existingSbm.kode_akun, kategori: existingSbm.kategori, uraian: existingSbm.uraian, satuan: existingSbm.satuan, harga_satuan: existingSbm.harga_satuan } : null,
      new_values: { kode_akun, kategori, uraian, satuan, harga_satuan: harga },
      notes: `Master SBM "${uraian}" diperbarui (Rp ${(existingSbm?.harga_satuan || 0).toLocaleString('id-ID')} → Rp ${(harga || 0).toLocaleString('id-ID')}).`
    });
    return getSbmById(id);
  } else {
    const res = db.prepare(`
      INSERT INTO master_sbm (kode_akun, kategori, uraian, satuan, harga_satuan, keterangan, pagu_sbm, jenis_regulasi, dasar_hukum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(kode_akun, kategori, uraian, satuan, harga, ket, pagu, regulasi, dasar);
    recordAuditLog({
      user: actorUser,
      action: 'CREATE_SBM',
      entity: 'master_sbm',
      entity_id: res.lastInsertRowid,
      new_values: { kode_akun, kategori, uraian, satuan, harga_satuan: harga },
      notes: `Master SBM baru "${uraian}" ditambahkan.`
    });
    return getSbmById(res.lastInsertRowid);
  }
}

function deleteSbm(id, actorUser = null) {
  const res = db.prepare('DELETE FROM master_sbm WHERE id = ?').run(id);
  recordAuditLog({
    user: actorUser,
    action: 'DELETE_SBM',
    entity: 'master_sbm',
    entity_id: id,
    notes: `Master SBM ID ${id} dihapus.`
  });
  return res;
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

  recordAuditLog({
    user: options.user || null,
    action: 'BULK_IMPORT_SBM',
    entity: 'master_sbm',
    new_values: { inserted: wouldInsert.length, updated: wouldUpdate.length, total_processed: wouldInsert.length + wouldUpdate.length },
    notes: `Impor massal SBM: ${wouldInsert.length} baru, ${wouldUpdate.length} diperbarui.`
  });

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
    recordAuditLog({
      user: actorUser,
      action: 'UPDATE_AKUN_BAS',
      entity: 'master_akun',
      entity_id: id,
      new_values: { kode: cleanKode, uraian: cleanUraian },
      notes: `Master Akun BAS [${cleanKode}] diperbarui.`
    });
    return getAkunById(id);
  } else {
    const existing = db.prepare('SELECT id FROM master_akun WHERE kode = ?').get(cleanKode);
    if (existing) {
      db.prepare(`
        UPDATE master_akun
        SET uraian = ?, kelompok = ?, kategori_dn = ?, keterangan = ?
        WHERE id = ?
      `).run(cleanUraian, cleanKelompok, cleanKategori, cleanKet, existing.id);
      recordAuditLog({
        user: actorUser,
        action: 'UPDATE_AKUN_BAS',
        entity: 'master_akun',
        entity_id: existing.id,
        new_values: { kode: cleanKode, uraian: cleanUraian },
        notes: `Master Akun BAS [${cleanKode}] diperbarui.`
      });
      return getAkunById(existing.id);
    } else {
      const info = db.prepare(`
        INSERT INTO master_akun (kode, uraian, kelompok, kategori_dn, keterangan)
        VALUES (?, ?, ?, ?, ?)
      `).run(cleanKode, cleanUraian, cleanKelompok, cleanKategori, cleanKet);
      recordAuditLog({
        user: actorUser,
        action: 'CREATE_AKUN_BAS',
        entity: 'master_akun',
        entity_id: info.lastInsertRowid,
        new_values: { kode: cleanKode, uraian: cleanUraian },
        notes: `Master Akun BAS baru [${cleanKode}] ditambahkan.`
      });
      return getAkunById(info.lastInsertRowid);
    }
  }
}

function deleteAkun(id, actorUser = null) {
  const res = db.prepare('DELETE FROM master_akun WHERE id = ?').run(id);
  recordAuditLog({
    user: actorUser,
    action: 'DELETE_AKUN_BAS',
    entity: 'master_akun',
    entity_id: id,
    notes: `Master Akun BAS ID ${id} dihapus.`
  });
  return res;
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

  recordAuditLog({
    user: options.user || null,
    action: 'BULK_IMPORT_AKUN_BAS',
    entity: 'master_akun',
    new_values: { inserted: wouldInsert.length, updated: wouldUpdate.length, total_processed: wouldInsert.length + wouldUpdate.length },
    notes: `Impor massal Akun BAS: ${wouldInsert.length} baru, ${wouldUpdate.length} diperbarui.`
  });

  return { success: true, processed: wouldInsert.length + wouldUpdate.length, inserted: wouldInsert.length, updated: wouldUpdate.length };
}

// Download Requests (Bab 9 & FR-10 Canon Master Blueprint)
function createDownloadRequest({ nama_file, tipe_unduhan, periode_id, filter_pic, filter_sasaran, user_id, username, user = null }) {
  const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const dateObj = new Date();
  const requestTime = formatWaktuSakti(dateObj);
  const expiresAt = new Date(dateObj.getTime() + 60 * 60 * 1000).toISOString();
  const cleanTipe = tipe_unduhan || 'EXCEL_RKB';
  const cleanPeriodeId = periode_id ? Number(periode_id) : null;
  const cleanPic = filter_pic ? normalizePic(filter_pic) : 'SEMUA';
  const cleanSasaran = filter_sasaran || 'ALL';
  const cleanUsername = username || (user ? user.username : null);
  const cleanUserId = user_id || (user ? user.id : null);

  const stmt = db.prepare(`
    INSERT INTO download_requests (
      request_id, nama_file, tipe_unduhan, periode_id, filter_pic, filter_sasaran,
      request_time, status, expires_at, user_id, username
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DIPROSES', ?, ?, ?)
  `);

  const res = stmt.run(
    reqId,
    nama_file,
    cleanTipe,
    cleanPeriodeId,
    cleanPic,
    cleanSasaran,
    requestTime,
    expiresAt,
    cleanUserId,
    cleanUsername
  );

  const created = getDownloadRequestById(res.lastInsertRowid);
  recordAuditLog({
    user: user || { id: cleanUserId, username: cleanUsername || 'anonymous', role_id: '-' },
    action: 'CREATE_DOWNLOAD_REQUEST',
    entity: 'download_requests',
    entity_id: created?.id || res.lastInsertRowid,
    new_values: {
      request_id: reqId,
      nama_file,
      tipe_unduhan: cleanTipe,
      periode_id: cleanPeriodeId,
      filter_pic: cleanPic,
      filter_sasaran: cleanSasaran,
      status: 'DIPROSES',
      expires_at: expiresAt
    },
    notes: `Permintaan unduhan [${cleanTipe}] "${nama_file}" (Siklus ID: ${cleanPeriodeId || '-'}, PIC: ${cleanPic}, Sasaran: ${cleanSasaran})`
  });

  return created;
}

function getDownloadRequests({ search = '', tanggal_mulai = '', tanggal_selesai = '', username = '', exclude_expired = false, exclude_failed = false } = {}) {
  // 1. Bersihkan berkas fisik yang telah kadaluarsa (> 1 jam) & tandai status KADALUARSA
  cleanupExpiredDownloads();

  // 2. Isolasi ketat: setiap pengguna hanya dapat melihat riwayat unduhan miliknya sendiri (Bab 9 & FR-10)
  if (!username) {
    return [];
  }

  let sql = `
    SELECT d.*,
           p.nama_periode AS siklus_nama,
           p.versi_revisi AS siklus_versi
    FROM download_requests d
    LEFT JOIN periode_anggaran p ON p.id = d.periode_id
    WHERE d.username = ?
  `;
  const params = [username];

  if (exclude_expired) {
    const now = new Date().toISOString();
    sql += " AND d.status != 'KADALUARSA' AND (d.expires_at IS NULL OR d.expires_at >= ?)";
    params.push(now);
  }

  if (exclude_failed) {
    sql += " AND d.status != 'GAGAL'";
  }

  if (search) {
    sql += ' AND (d.nama_file LIKE ? OR d.filter_pic LIKE ? OR d.request_id LIKE ? OR d.tipe_unduhan LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (tanggal_mulai) {
    sql += ' AND d.created_at >= ?';
    params.push(tanggal_mulai);
  }

  if (tanggal_selesai) {
    sql += ' AND d.created_at <= ?';
    params.push(`${tanggal_selesai} 23:59:59`);
  }

  sql += ' ORDER BY d.id DESC LIMIT 100';
  return db.prepare(sql).all(...params);
}

function getDownloadRequestById(id) {
  return db.prepare(`
    SELECT d.*,
           p.nama_periode AS siklus_nama,
           p.versi_revisi AS siklus_versi
    FROM download_requests d
    LEFT JOIN periode_anggaran p ON p.id = d.periode_id
    WHERE d.id = ?
  `).get(id);
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
  const updated = getDownloadRequestById(id);

  if (fields.status === 'SELESAI' || fields.status === 'GAGAL') {
    recordAuditLog({
      user: { id: updated?.user_id || null, username: updated?.username || 'system', role_id: '-' },
      action: fields.status === 'SELESAI' ? 'COMPLETE_DOWNLOAD_REQUEST' : 'FAIL_DOWNLOAD_REQUEST',
      entity: 'download_requests',
      entity_id: id,
      new_values: {
        status: fields.status,
        nama_file: updated?.nama_file,
        tipe_unduhan: updated?.tipe_unduhan,
        periode_id: updated?.periode_id,
        filter_pic: updated?.filter_pic,
        file_size: updated?.file_size || 0,
        error_message: updated?.error_message || null
      },
      status: fields.status === 'SELESAI' ? 'SUCCESS' : 'FAILED',
      notes: `Unduhan "${updated?.nama_file || id}" berstatus ${fields.status}.`
    });
  }

  return updated;
}

/**
 * Bab 9 & FR-10 Canon Master Blueprint:
 * File hasil unduhan .xlsx dan .zip kedaluwarsa tepat 1 jam setelah dibuat dan file fisiknya dihapus otomatis.
 * Akses ke URL file yang sudah kedaluwarsa ditolak oleh sistem, sedangkan riwayat/log unduhan tetap tercatat untuk keperluan audit.
 */
function cleanupExpiredDownloads() {
  const now = new Date().toISOString();
  const expired = db.prepare(`
    SELECT * FROM download_requests 
    WHERE (expires_at IS NOT NULL AND expires_at < ? AND status != 'KADALUARSA')
       OR (status = 'KADALUARSA' AND file_path IS NOT NULL)
  `).all(now);

  let cleaned = 0;
  for (const row of expired) {
    if (row.file_path && fs.existsSync(row.file_path)) {
      try {
        fs.unlinkSync(row.file_path);
      } catch (e) {}
    }
    db.prepare(`
      UPDATE download_requests
      SET status = 'KADALUARSA', file_path = NULL
      WHERE id = ?
    `).run(row.id);
    cleaned++;
  }

  return cleaned;
}

/**
 * Membersihkan secara permanen berkas unduhan yang gagal dan kadaluarsa
 */
function purgeFailedAndExpiredDownloads(username = null) {
  let sql = "DELETE FROM download_requests WHERE status IN ('GAGAL', 'KADALUARSA')";
  const params = [];
  if (username) {
    sql += " AND username = ?";
    params.push(username);
  }
  const res = db.prepare(sql).run(...params);
  return res.changes;
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
  if (user && Number(user.level) === 3) {
    throw new Error('Akses ditolak. Akun Pimpinan / Viewer (Level 3) bersifat Read-Only dan tidak dapat mengajukan usulan revisi.');
  }
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
  if (user && Number(user.level) === 3) {
    throw new Error('Akses ditolak. Akun Pimpinan / Viewer (Level 3) bersifat Read-Only dan tidak dapat mengajukan usulan revisi.');
  }
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
  const docKak = (data.dokumen_kak_link || data.dokumen_dukung_lain || '').trim();
  const konfirmasi = data.konfirmasi_kebenaran !== undefined ? Boolean(data.konfirmasi_kebenaran) : true;

  if (!nomorSurat) throw new Error('Nomor surat / nota dinas usulan revisi wajib diisi.');
  if (!tanggalSurat) throw new Error('Tanggal surat usulan revisi wajib diisi.');
  if (!perihal) throw new Error('Perihal usulan revisi wajib diisi.');
  if (!docSurat) throw new Error('Tautan Google Drive Nota Dinas bertanda tangan wajib dilampirkan.');
  if (!docMatriks) throw new Error('Tautan Google Drive RKB Hardcopy PIC bertanda tangan wajib dilampirkan.');
  if (data.strict_tahap1) {
    if (!docKak) throw new Error('Tautan Google Drive KAK bertanda tangan wajib dilampirkan.');
    if (!konfirmasi) throw new Error('Pernyataan konfirmasi kebenaran data wajib dicentang.');
  }

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
        const currentVer = Math.max(Number(existing.versi_usulan || 1), existing.status_tahap === 'DIKEMBALIKAN' ? 2 : 1);

        db.prepare(`
          UPDATE revisi_pengajuan SET
            nomor_surat = ?,
            tanggal_surat = ?,
            perihal = ?,
            pejabat_pengusul = ?,
            jabatan_pengusul = ?,
            dokumen_surat_link = ?,
            dokumen_matriks_link = ?,
            dokumen_kak_link = COALESCE(NULLIF(?, ''), dokumen_kak_link),
            dokumen_dukung_lain = COALESCE(NULLIF(?, ''), dokumen_dukung_lain),
            versi_usulan = ?,
            konfirmasi_kebenaran = ?,
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
          docSurat, docMatriks, docKak, docKak,
          currentVer, konfirmasi ? 1 : 0,
          totalSemula, totalMenjadi, selisih,
          waktuNow, submitter, data.catatan_usulan || `Pengajuan ulang pasca perbaikan (V${currentVer})`,
          proposalId
        );

        logRevisiHistory({
          pengajuan_id: proposalId,
          periode_id: periodeId,
          subbag,
          versi_usulan: currentVer,
          tahap: 1,
          status: 'DIAJUKAN',
          aksi: 'PENGAJUAN_ULANG',
          catatan: data.catatan_usulan || `Pengajuan ulang usulan revisi V${currentVer} pasca perbaikan oleh PIC.`,
          dokumen_surat_link: docSurat,
          dokumen_matriks_link: docMatriks,
          dokumen_kak_link: docKak,
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
          dokumen_surat_link, dokumen_matriks_link, dokumen_kak_link, dokumen_dukung_lain, validasi_sbm,
          dokumen_surat_original_link, dokumen_matriks_original_link, dokumen_kak_original_link,
          versi_usulan, konfirmasi_kebenaran,
          total_semula, total_menjadi, selisih,
          tahap_terkini, status_tahap,
          tahap1_waktu, tahap1_oleh, tahap1_catatan,
          alasan_pengembalian,
          is_locked
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?,
          1, ?,
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
        docSurat, docMatriks, docKak, docKak,
        data.validasi_sbm || 'OK',
        docSurat, docMatriks, docKak,
        konfirmasi ? 1 : 0,
        totalSemula, totalMenjadi, selisih,
        waktuNow, submitter, data.catatan_usulan || 'Pengajuan usulan revisi anggaran belanja subbagian (V1)'
      );
      proposalId = res.lastInsertRowid;

      logRevisiHistory({
        pengajuan_id: proposalId,
        periode_id: periodeId,
        subbag,
        versi_usulan: 1,
        tahap: 1,
        status: 'DIAJUKAN',
        aksi: 'PENGAJUAN_BARU',
        catatan: data.catatan_usulan || 'Pengajuan usulan revisi perdana (V1) oleh PIC.',
        dokumen_surat_link: docSurat,
        dokumen_matriks_link: docMatriks,
        dokumen_kak_link: docKak,
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

/**
 * Bab 6 & FR-08 Canon Master Blueprint:
 * Setelah Tahap 4 selesai, tabel Monitoring Revisi tetap menampilkan siklus terakhir yang baru selesai
 * sampai siklus berikutnya memiliki pengajuan Tahap 1 pertama.
 */
function getRevisiPengajuanList({ subbag = '', status = '', search = '', periode_id = null, all_cycles = false } = {}) {
  let query = 'SELECT * FROM revisi_pengajuan WHERE 1=1';
  const params = [];

  let targetPeriodeId = periode_id ? Number(periode_id) : null;
  if (!targetPeriodeId && !all_cycles) {
    const activeCycle = getActiveRevisionCycle();
    if (activeCycle) {
      const cnt = db.prepare('SELECT COUNT(*) as c FROM revisi_pengajuan WHERE periode_id = ?').get(activeCycle.id)?.c || 0;
      if (cnt > 0) {
        targetPeriodeId = activeCycle.id;
      }
    }
    if (!targetPeriodeId) {
      const latestWithProposals = db.prepare('SELECT MAX(periode_id) as maxPid FROM revisi_pengajuan').get()?.maxPid;
      if (latestWithProposals) {
        targetPeriodeId = Number(latestWithProposals);
      }
    }
  }

  if (targetPeriodeId) {
    query += ' AND (periode_id = ? OR periode_id IS NULL)';
    params.push(Number(targetPeriodeId));
  }

  const cleanSub = subbag ? normalizePic(subbag) : '';
  if (cleanSub && cleanSub !== 'SEMUA') {
    query += ' AND UPPER(subbag) = ?';
    params.push(cleanSub);
  }

  if (status) {
    if (status === 'PROSES') {
      query += " AND status_tahap IN ('PROSES', 'DIAJUKAN', 'MENUNGGU_PLENO', 'ACC_PLENO')";
    } else if (status === 'PERBAIKAN' || status === 'DIKEMBALIKAN') {
      query += " AND status_tahap IN ('PERBAIKAN', 'DIKEMBALIKAN')";
    } else {
      query += ' AND status_tahap = ?';
      params.push(status);
    }
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
  const curVer = Number(rev.versi_usulan || 1);

  if (targetTahap === 2) {
    // Validasi L1 (Bab 4.2 Canon: hanya akun Perencanaan L1 yang mengoperasikan di sistem)
    if (user && user.level > 1) {
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
        versi_usulan: curVer,
        tahap: 2,
        status: 'MENUNGGU_PLENO',
        aksi: 'VALIDASI_SETUJU',
        catatan: catatan || `Validasi L1 (V${curVer}) disetujui, lanjut ke Pleno.`,
        user
      });
    } else {
      // Dikembalikan untuk Perbaikan -> Versi administratif naik (V1 -> V2 -> V3 dst., Bab 3 & FR-02)
      const reason = (catatan || '').trim();
      if (!reason) throw new Error('Alasan pengembalian untuk perbaikan wajib diisi.');
      const nextVer = curVer + 1;

      db.prepare(`
        UPDATE revisi_pengajuan SET
          tahap_terkini = 1,
          status_tahap = 'DIKEMBALIKAN',
          versi_usulan = ?,
          tahap2_waktu = ?,
          tahap2_oleh = ?,
          tahap2_hasil = 'DIKEMBALIKAN',
          tahap2_catatan = ?,
          alasan_pengembalian = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nextVer, waktuNow, userName, reason, reason, id);

      logRevisiHistory({
        pengajuan_id: id,
        periode_id: rev.periode_id,
        subbag: rev.subbag,
        versi_usulan: curVer,
        tahap: 2,
        status: 'DIKEMBALIKAN',
        aksi: 'DIKEMBALIKAN_PERBAIKAN',
        catatan: `${reason} (Versi pengajuan naik ke V${nextVer})`,
        alasan_pengembalian: reason,
        user
      });
    }

  } else if (targetTahap === 3) {
    // Pleno ACC (Bab 4.2 Canon: dicatat oleh L1 dalam sistem, komisioner memantau/bersidang)
    if (user && user.level > 1) {
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
        versi_usulan: curVer,
        tahap: 3,
        status: 'ACC_PLENO',
        aksi: 'ACC_PLENO',
        catatan: catatan || `Hasil Sidang Pleno (V${curVer}): Disetujui (ACC Pleno).`,
        user
      });
    } else {
      // Pleno mengembalikan untuk perbaikan -> Versi administratif naik (V1 -> V2 -> V3 dst., Bab 3 & FR-02)
      const reason = (catatan || '').trim();
      if (!reason) throw new Error('Alasan pengembalian untuk perbaikan wajib diisi.');
      const nextVer = curVer + 1;

      db.prepare(`
        UPDATE revisi_pengajuan SET
          tahap_terkini = 1,
          status_tahap = 'DIKEMBALIKAN',
          versi_usulan = ?,
          tahap3_waktu = ?,
          tahap3_oleh = ?,
          tahap3_hasil = 'DIKEMBALIKAN',
          tahap3_catatan = ?,
          alasan_pengembalian = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(nextVer, waktuNow, userName, reason, reason, id);

      logRevisiHistory({
        pengajuan_id: id,
        periode_id: rev.periode_id,
        subbag: rev.subbag,
        versi_usulan: curVer,
        tahap: 3,
        status: 'DIKEMBALIKAN',
        aksi: 'PLENO_MENGEMBALIKAN',
        catatan: `${reason} (Versi pengajuan naik ke V${nextVer})`,
        alasan_pengembalian: reason,
        user
      });
    }

  } else if (targetTahap === 4) {
    throw new Error('Tahap 4 (Pengesahan Gabungan & BA Pleno) dilakukan untuk seluruh pengajuan dalam siklus sekaligus melalui menu Pengesahan Gabungan.');
  }

  const updatedRev = getRevisiPengajuanById(id);
  recordAuditLog({
    user,
    action: `UPDATE_REVISI_TAHAP_${targetTahap}`,
    entity: 'revisi_pengajuan',
    entity_id: id,
    old_values: {
      kode_revisi: rev.kode_revisi,
      subbag: rev.subbag,
      versi_usulan: rev.versi_usulan || 1,
      tahap_terkini: rev.tahap_terkini,
      status_tahap: rev.status_tahap
    },
    new_values: {
      kode_revisi: updatedRev.kode_revisi,
      subbag: updatedRev.subbag,
      versi_usulan: updatedRev.versi_usulan || 1,
      tahap_terkini: updatedRev.tahap_terkini,
      status_tahap: updatedRev.status_tahap,
      aksi: aksi || 'SETUJU',
      catatan: catatan || ''
    },
    notes: `Tahap ${targetTahap} revisi [${rev.kode_revisi} - ${rev.subbag}] diproses: ${aksi || 'SETUJU'} (${rev.status_tahap} → ${updatedRev.status_tahap}, V${rev.versi_usulan || 1} → V${updatedRev.versi_usulan || 1})${catatan ? ` | Catatan: ${catatan}` : ''}.`
  });

  return updatedRev;
}

function deleteRevisiPengajuan(id, user = null) {
  const rev = getRevisiPengajuanById(id);
  if (!rev) throw new Error('Data usulan revisi tidak ditemukan.');

  if (user && Number(user.level) === 3) {
    throw new Error('Akses ditolak. Akun Pimpinan / Viewer (Level 3) bersifat Read-Only.');
  }

  if (user && Number(user.level) === 2 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
    const userPic = normalizePic(user.pic_subbag);
    const revPic = normalizePic(rev.subbag);
    if (userPic !== revPic) {
      throw new Error(`Akses ditolak. Operator ${userPic} tidak berwenang membatalkan usulan milik subbagian ${revPic}.`);
    }
  }

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

function finalizeTahap4Keseluruhan({
  nomor_ba,
  tanggal_ba,
  link_scan_ba = '',
  rkb_final_link = '',
  kak_gabungan_link = '',
  fase_perencanaan = '',
  dasar_pengesahan = '',
  verifikasi_manual = false,
  strict_tahap4 = false,
  catatan = '',
  user = null
}) {
  const noBa = (nomor_ba || '').trim();
  const tglBa = (tanggal_ba || '').trim();
  const cleanLinkBa = (link_scan_ba || '').trim();
  const cleanLinkRkb = (rkb_final_link || '').trim();
  const cleanLinkKak = (kak_gabungan_link || '').trim();

  if (!noBa) throw new Error('Nomor Berita Acara Pleno (BA Pleno) wajib diisi.');
  if (!tglBa) throw new Error('Tanggal Berita Acara Pleno wajib diisi.');
  if (strict_tahap4) {
    if (!cleanLinkBa) throw new Error('Tautan Google Drive BA Pleno bertanda tangan wajib dilampirkan.');
    if (!cleanLinkRkb) throw new Error('Tautan Google Drive RKB Final bertanda tangan wajib dilampirkan.');
    if (!cleanLinkKak) throw new Error('Tautan Google Drive KAK Gabungan wajib dilampirkan.');
    if (!verifikasi_manual) throw new Error('Verifikasi manual sebelum pengesahan Tahap 4 wajib dicentang.');
  }

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

    // Bab 17: Selesainya Tahap 4 tidak otomatis mengubah fase menjadi NPHD; fase ditentukan eksplisit
    const validFases = ['PRA_NPHD', 'NPHD', 'PASCA_NPHD'];
    const rawFase = (fase_perencanaan || cycle.fase_perencanaan || cycle.tahap_revisi || 'PRA_NPHD').toUpperCase();
    const finalFase = validFases.includes(rawFase) ? rawFase : 'PRA_NPHD';
    const finalDasar = (dasar_pengesahan || 'BA Pleno Komisioner').trim();

    // 4. Kunci dokumen RKB siklus ini
    db.prepare(`
      UPDATE periode_anggaran SET
        is_locked = 1,
        locked_at = ?,
        fase_perencanaan = ?,
        tahap_revisi = ?,
        dasar_pengesahan = ?,
        nomor_ba_tapd = ?,
        tanggal_ba_tapd = ?,
        catatan_revisi = ?,
        file_pendukung_path = ?,
        gdrive_link_pleno = ?,
        rkb_final_link = ?,
        kak_gabungan_link = ?,
        verifikasi_manual_tahap4 = ?,
        catatan_pleno = ?
      WHERE id = ?
    `).run(
      new Date().toISOString(),
      finalFase,
      finalFase,
      finalDasar,
      noBa,
      tglBa,
      catatan || `Pengesahan Berita Acara Pleno ${noBa}`,
      cleanLinkBa,
      cleanLinkBa,
      cleanLinkRkb,
      cleanLinkKak,
      verifikasi_manual ? 1 : 0,
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
        versi_usulan: p.versi_usulan || 1,
        tahap: 4,
        status: 'SELESAI',
        aksi: 'PENGESAHAN_BA_PLENO',
        catatan: `Disahkan melalui BA Pleno No: ${noBa} tanggal ${tglBa} (Fase: ${finalFase}, Dasar: ${finalDasar}).`,
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
      new_values: {
        nomor_ba: noBa,
        tanggal_ba: tglBa,
        fase_perencanaan: finalFase,
        dasar_pengesahan: finalDasar,
        gdrive_link_pleno: cleanLinkBa,
        rkb_final_link: cleanLinkRkb,
        kak_gabungan_link: cleanLinkKak,
        total_proposals: proposals.length
      },
      notes: `Pengesahan Berita Acara Pleno ${noBa} selesai (Fase: ${finalFase}, Dasar: ${finalDasar}). RKB ${cycle.nama_periode} resmi dikunci menjadi dasar anggaran berikutnya.`
    });

    return {
      success: true,
      locked_periode: getPeriodeById(cycle.id),
      nomor_ba: noBa,
      tanggal_ba: tglBa,
      fase_perencanaan: finalFase,
      dasar_pengesahan: finalDasar,
      total_pengajuan: proposals.length
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Bab 4.3 & Bab 14 Canon Master Blueprint:
 * Koreksi tautan dokumen pasca-pengesahan hanya dapat dilakukan oleh Kasubag Rendatin
 * (atau Developer saat tidak simulasi) dan wajib tercatat di audit log tanpa mengubah angka baseline.
 */
function updatePostRatificationLinks(periodeId, { gdrive_link_pleno = '', rkb_final_link = '', kak_gabungan_link = '', catatan = '' } = {}, user = null) {
  const isKasubagRendatin = user && (
    user.level === 0 ||
    (user.level === 1 && (user.username === 'perencanaan' || user.username === 'kasubbag_rendatin' || user.role_id === 'super_admin' || user.role_id === 'perencanaan'))
  );
  if (!isKasubagRendatin) {
    throw new Error('Akses ditolak. Koreksi tautan dokumen pasca-pengesahan hanya berwenang dilakukan oleh Kasubag Rendatin.');
  }

  const existing = getPeriodeById(Number(periodeId));
  if (!existing) throw new Error('Periode arsip RKB tidak ditemukan.');
  if (Number(existing.is_locked) !== 1) {
    throw new Error('Koreksi tautan pasca-pengesahan hanya berlaku untuk dokumen RKB yang telah disahkan dan terkunci.');
  }

  const newBaLink = gdrive_link_pleno !== undefined ? String(gdrive_link_pleno).trim() : (existing.gdrive_link_pleno || existing.file_pendukung_path || '');
  const newRkbLink = rkb_final_link !== undefined ? String(rkb_final_link).trim() : (existing.rkb_final_link || '');
  const newKakLink = kak_gabungan_link !== undefined ? String(kak_gabungan_link).trim() : (existing.kak_gabungan_link || '');

  const oldValues = {
    gdrive_link_pleno: existing.gdrive_link_pleno || existing.file_pendukung_path || '',
    rkb_final_link: existing.rkb_final_link || '',
    kak_gabungan_link: existing.kak_gabungan_link || ''
  };

  db.prepare(`
    UPDATE periode_anggaran SET
      gdrive_link_pleno = ?,
      file_pendukung_path = ?,
      rkb_final_link = ?,
      kak_gabungan_link = ?
    WHERE id = ?
  `).run(newBaLink, newBaLink, newRkbLink, newKakLink, existing.id);

  // Perbarui metadata legalitas di snapshot tanpa mengubah angka baseline
  const snapRow = db.prepare('SELECT snapshot_data FROM periode_snapshot WHERE periode_id = ?').get(existing.id);
  if (snapRow && snapRow.snapshot_data) {
    try {
      const snap = JSON.parse(snapRow.snapshot_data);
      snap.legalitas = {
        ...(snap.legalitas || {}),
        gdrive_link_pleno: newBaLink,
        rkb_final_link: newRkbLink,
        kak_gabungan_link: newKakLink
      };
      db.prepare('UPDATE periode_snapshot SET snapshot_data = ? WHERE periode_id = ?').run(JSON.stringify(snap), existing.id);
    } catch (e) {}
  }

  recordAuditLog({
    user,
    action: 'UPDATE_POST_RATIFICATION_LINKS',
    entity: 'periode_anggaran',
    entity_id: existing.id,
    old_values: oldValues,
    new_values: {
      gdrive_link_pleno: newBaLink,
      rkb_final_link: newRkbLink,
      kak_gabungan_link: newKakLink
    },
    notes: `Koreksi tautan dokumen pasca-pengesahan pada "${existing.nama_periode}" oleh Kasubag Rendatin${catatan ? `: ${catatan}` : '.'}`
  });

  return getPeriodeById(existing.id);
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
        belumAccList.push({ subbag: s, status: p.status_tahap, kode_revisi: p.kode_revisi, versi_usulan: p.versi_usulan || 1 });
      }
      subbagStatus[s] = {
        subbag: s,
        proposal_id: p.id,
        kode_revisi: p.kode_revisi,
        versi_usulan: p.versi_usulan || 1,
        status: p.status_tahap,
        tahap_terkini: p.tahap_terkini,
        status_label: p.status_tahap === 'ACC_PLENO' ? 'ACC Pleno' : (p.status_tahap === 'DIKEMBALIKAN' ? 'Dikembalikan untuk Perbaikan' : (p.status_tahap === 'MENUNGGU_PLENO' ? 'Valid (Menunggu Pleno)' : (p.status_tahap === 'SELESAI' ? 'Disahkan' : 'Diajukan'))),
        has_proposal: true,
        can_edit: p.status_tahap === 'DIKEMBALIKAN' || p.status_tahap === 'DRAFT',
        is_acc: isAcc,
        alasan_pengembalian: p.alasan_pengembalian || '',
        dokumen_surat_link: p.dokumen_surat_link,
        dokumen_matriks_link: p.dokumen_matriks_link,
        dokumen_kak_link: p.dokumen_kak_link || p.dokumen_dukung_lain || '',
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
      fase_perencanaan: baseRatified.fase_perencanaan || baseRatified.tahap_revisi || 'PRA_NPHD',
      dasar_pengesahan: baseRatified.dasar_pengesahan || 'BA Pleno Komisioner',
      nomor_ba: baseRatified.nomor_ba_tapd,
      tanggal_ba: baseRatified.tanggal_ba_tapd,
      is_locked: 1
    } : null,
    siklus_aktif: activeCycle ? {
      id: activeCycle.id,
      nama_periode: activeCycle.nama_periode,
      versi_revisi: activeCycle.versi_revisi,
      revisi_ke: activeCycle.revisi_ke,
      fase_perencanaan: activeCycle.fase_perencanaan || activeCycle.tahap_revisi || 'PRA_NPHD',
      dasar_pengesahan: activeCycle.dasar_pengesahan || 'Kertas Kerja Penyusunan',
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

    const lockedDateStr = p.locked_at ? String(p.locked_at).slice(0, 10) : (p.created_at ? String(p.created_at).slice(0, 10) : '-');

    return {
      id: p.id,
      thang: 2029,
      kode_satker: '657811',
      deskripsi: p.nama_periode,
      nama_periode: p.nama_periode,
      versi_revisi: p.versi_revisi,
      revisi_ke: p.revisi_ke || 0,
      fase_perencanaan: p.fase_perencanaan || p.tahap_revisi || 'PRA_NPHD',
      dasar_pengesahan: p.dasar_pengesahan || 'BA Pleno Komisioner',
      tahap_revisi: p.tahap_revisi,
      nomor_ba_tapd: p.nomor_ba_tapd || '-',
      tanggal_ba_tapd: p.tanggal_ba_tapd || '-',
      tanggal_revisi: p.tanggal_ba_tapd || lockedDateStr,
      tanggal_penetapan: lockedDateStr,
      locked_at: p.locked_at || p.created_at,
      catatan_revisi: p.catatan_revisi || '',
      status_label: 'TERKUNCI SAH',
      total_items: p.total_items,
      total_baris: p.total_baris,
      total_anggaran: grandTotal,
      is_locked: 1,
      is_migration_frozen: isMigrationFrozen,
      notice,
      gdrive_link_pleno: p.gdrive_link_pleno || p.file_pendukung_path || '',
      rkb_final_link: p.rkb_final_link || '',
      kak_gabungan_link: p.kak_gabungan_link || '',
      catatan_pleno: p.catatan_pleno || ''
    };
  });
}

module.exports = {
  db,
  safeAddColumn,
  getJakartaTimeString,
  formatWaktuSakti,
  classifyAuditCategory,
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
  updateRabBarisSasaranWithCascade,
  updateRabBarisCostSharingWithCascade,
  canCascadeModifyChildRow,
  clearRabRows,
  reorderRow,
  getMasterReferenceVersion,
  getRkbVersion,
  bumpRkbVersion,
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
  syncRkbReferenceLinks,
  getKuantitasList,
  getKuantitasById,
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
  purgeFailedAndExpiredDownloads,
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
  updatePostRatificationLinks,
  getArsipRevisiList,
  getLatestRatifiedPeriode,
  getActiveRevisionCycle,
  getOrCreateRevisionCycle,
  checkRowEditPermission,
  logRevisiHistory,
  getRevisiPengajuanHistory,
  getRevisionCycleStatus,
  checkpointAndSyncDatabase,
  USE_MYSQL
};
