/**
 * SI-PRABU Clean Web Edition v3.0
 * Skrip Sinkronisasi & Pembaruan Database Pengguna di Direktori Office Master
 * Path Target: D:\OFFICE\2026\Aplikasi\Si Prabu\Database
 */

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const xlsx = require('xlsx');
const { hashPassword } = require('../src/crypto_util');

const TARGET_DIR = path.resolve('D:/OFFICE/2026/Aplikasi/Si Prabu/Database');
const SQLITE_FILE = path.join(TARGET_DIR, 'hibah_kpu.sqlite');

async function run() {
  console.log('=== MEMULAI PEMBARUAN DATABASE USER DI OFFICE MASTER ===');
  console.log('Target Direktori:', TARGET_DIR);

  if (!fs.existsSync(TARGET_DIR)) {
    console.error('Direktori target tidak ditemukan!');
    process.exit(1);
  }

  // 1. Backup file SQLite
  const bakSqlite = path.join(TARGET_DIR, `hibah_kpu.sqlite.bak_${Date.now()}`);
  if (fs.existsSync(SQLITE_FILE)) {
    fs.copyFileSync(SQLITE_FILE, bakSqlite);
    console.log('[1/4] Backup SQLite berhasil dibuat:', path.basename(bakSqlite));
  } else {
    console.error('File hibah_kpu.sqlite tidak ditemukan di target!');
    process.exit(1);
  }

  // 2. Buka SQLite target dan migrasikan tabel satker_users
  const db = new DatabaseSync(SQLITE_FILE);

  // Pastikan kolom token_version ada
  try {
    db.exec('ALTER TABLE satker_users ADD COLUMN token_version INTEGER DEFAULT 1;');
    console.log('[2/4] Kolom token_version berhasil ditambahkan ke satker_users.');
  } catch (e) {
    // Kolom sudah ada
  }

  // Migrasikan seluruh password plaintext menjadi hash scrypt
  const users = db.prepare('SELECT id, username, password FROM satker_users').all();
  let migratedCount = 0;
  const updStmt = db.prepare('UPDATE satker_users SET password = ?, token_version = COALESCE(token_version, 1) WHERE id = ?');

  for (const u of users) {
    if (u.password && !u.password.startsWith('scrypt$')) {
      const hashed = hashPassword(u.password);
      updStmt.run(hashed, u.id);
      migratedCount++;
    }
  }
  console.log(`[2/4] Enkripsi Scrypt selesai: ${migratedCount} akun dimigrasikan ke hash scrypt.`);

  // Pastikan konfigurasi Google SSO disinkronkan
  try {
    db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES ('google_auth_enabled', '1')").run();
    db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES ('google_client_id', '824065065347-t7vi42nu00u298v3vljo5i0hmcgb67vg.apps.googleusercontent.com')").run();
    db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES ('google_allowed_domains', 'kpungawi.com,kpu.go.id,gmail.com')").run();
    console.log('[2/4] Konfigurasi Google SSO di settings_satker berhasil disinkronkan.');
  } catch (e) {
    console.warn('[2/4] Gagal update settings_satker:', e.message);
  }

  // Verifikasi integritas database
  const check = db.prepare('PRAGMA integrity_check').get();
  console.log('[2/4] Status Integritas SQLite:', check.integrity_check);

  // 3. Ambil data pengguna terbaru dari SQLite
  const latestUsers = db.prepare(`
    SELECT id, username, password, nama_pejabat, jabatan, role_id, level, pic_subbag, is_active, created_at, email, google_id, avatar_url, token_version 
    FROM satker_users 
    ORDER BY level ASC, id ASC
  `).all();

  // 4. Perbarui file Excel di direktori target
  console.log('[3/4] Memperbarui berkas-berkas Excel terkait database pengguna...');

  // 4a. 05_PENGGUNA_DAN_HAK_AKSES.xlsx
  const file05 = path.join(TARGET_DIR, '05_PENGGUNA_DAN_HAK_AKSES.xlsx');
  if (fs.existsSync(file05)) {
    try {
      const wb05 = xlsx.readFile(file05);
      const ws05 = xlsx.utils.json_to_sheet(latestUsers);
      wb05.Sheets['DAFTAR_PENGGUNA_SATKER'] = ws05;
      xlsx.writeFile(wb05, file05);
      console.log('  -> Berhasil memperbarui 05_PENGGUNA_DAN_HAK_AKSES.xlsx');
    } catch (e) {
      console.warn('  -> Gagal update 05_PENGGUNA_DAN_HAK_AKSES.xlsx:', e.message);
    }
  }

  // 4b. DATABASE_USER_DAN_PASSWORD.xlsx
  const fileUserPass = path.join(TARGET_DIR, 'DATABASE_USER_DAN_PASSWORD.xlsx');
  if (fs.existsSync(fileUserPass)) {
    try {
      const wb = xlsx.readFile(fileUserPass);
      wb.Sheets['RAW_TABLE_SATKER_USERS'] = xlsx.utils.json_to_sheet(latestUsers);
      xlsx.writeFile(wb, fileUserPass);
      console.log('  -> Berhasil memperbarui DATABASE_USER_DAN_PASSWORD.xlsx (sheet RAW_TABLE_SATKER_USERS)');
    } catch (e) {
      console.warn('  -> Gagal update DATABASE_USER_DAN_PASSWORD.xlsx:', e.message);
    }
  }

  // 4c. DAFTAR_AKUN_USER_DAN_PASSWORD_BARU.xlsx
  const fileUserPassBaru = path.join(TARGET_DIR, 'DAFTAR_AKUN_USER_DAN_PASSWORD_BARU.xlsx');
  if (fs.existsSync(fileUserPassBaru)) {
    try {
      const wb = xlsx.readFile(fileUserPassBaru);
      wb.Sheets['RAW_TABLE_SATKER_USERS'] = xlsx.utils.json_to_sheet(latestUsers);
      xlsx.writeFile(wb, fileUserPassBaru);
      console.log('  -> Berhasil memperbarui DAFTAR_AKUN_USER_DAN_PASSWORD_BARU.xlsx (sheet RAW_TABLE_SATKER_USERS)');
    } catch (e) {
      console.warn('  -> Gagal update DAFTAR_AKUN_USER_DAN_PASSWORD_BARU.xlsx:', e.message);
    }
  }

  // 4d. 00_SELURUH_DATABASE_SIPRABU_MASTER.xlsx
  const fileMasterAll = path.join(TARGET_DIR, '00_SELURUH_DATABASE_SIPRABU_MASTER.xlsx');
  if (fs.existsSync(fileMasterAll)) {
    try {
      const wb = xlsx.readFile(fileMasterAll);
      if (wb.Sheets['satker_users']) {
        wb.Sheets['satker_users'] = xlsx.utils.json_to_sheet(latestUsers);
        xlsx.writeFile(wb, fileMasterAll);
        console.log('  -> Berhasil memperbarui 00_SELURUH_DATABASE_SIPRABU_MASTER.xlsx (sheet satker_users)');
      }
    } catch (e) {
      console.warn('  -> Gagal update 00_SELURUH_DATABASE_SIPRABU_MASTER.xlsx:', e.message);
    }
  }

  console.log('[4/4] Seluruh pembaruan database user di Office Master selesai 100%!');
  console.log('===============================================================');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
