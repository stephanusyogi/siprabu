/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Backup & Pemulihan Database: Fullpoint MySQL & phpMyAdmin Dump
 * Pengembang: emenje & Stephanus Yogi
 */

const fs = require('fs');
const path = require('path');

let DatabaseSync = null;
function getSqliteDatabaseSync() {
  if (!DatabaseSync) {
    DatabaseSync = require('node:sqlite').DatabaseSync;
  }
  return DatabaseSync;
}

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DEFAULT_DB_PATH = process.env.SIPRABU_DB_PATH || path.join(DATA_DIR, 'hibah_kpu.sqlite');
const DEFAULT_RETENTION_COUNT = 10;

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Menghasilkan timestamp zona waktu Asia/Jakarta untuk penamaan file backup
 */
function getJakartaTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const dStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
  const tStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(d).replace(/:/g, '');
  return `${dStr}_${tStr}`;
}

/**
 * Menghasilkan SQL Dump standar MySQL / phpMyAdmin secara utuh dari koneksi database aktif
 */
function generateMySQLDump(dbInstance) {
  let dump = `-- ============================================================================
-- SI-PRABU MySQL / phpMyAdmin Full Database Dump
-- Diekspor: ${new Date().toISOString()} (WIB: ${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'long' }).format(new Date())})
-- Kompatibel Penuh: MySQL 5.7+ / MySQL 8.0+ / MariaDB / phpMyAdmin
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+07:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;\n\n`;

  let tableRows = [];
  try {
    tableRows = dbInstance.prepare("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'").all();
  } catch (e) {
    try {
      tableRows = dbInstance.prepare("SELECT table_name AS tbl FROM information_schema.tables WHERE table_schema = DATABASE()").all();
    } catch (e2) {}
  }

  const tableNames = tableRows.map(r => {
    const vals = Object.values(r);
    return vals[0];
  }).filter(Boolean);

  for (const table of tableNames) {
    dump += `-- --------------------------------------------------------\n`;
    dump += `-- Struktur dari tabel \`${table}\`\n`;
    dump += `-- --------------------------------------------------------\n\n`;
    dump += `DROP TABLE IF EXISTS \`${table}\`;\n`;

    try {
      const createRes = dbInstance.prepare(`SHOW CREATE TABLE \`${table}\``).get();
      if (createRes) {
        const createSql = createRes['Create Table'] || Object.values(createRes)[1] || '';
        dump += `${createSql};\n\n`;
      }
    } catch (e) {}

    try {
      const rows = dbInstance.prepare(`SELECT * FROM \`${table}\``).all();
      if (rows && rows.length > 0) {
        dump += `-- Data isi tabel \`${table}\`\n`;
        const colNames = Object.keys(rows[0]);
        const colsEscaped = colNames.map(c => `\`${c}\``).join(', ');

        const CHUNK_SIZE = 100;
        for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
          const chunk = rows.slice(i, i + CHUNK_SIZE);
          const valuesList = chunk.map(row => {
            const vals = colNames.map(col => {
              const val = row[col];
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return String(val);
              if (typeof val === 'boolean') return val ? '1' : '0';
              const escaped = String(val)
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'")
                .replace(/\r/g, '\\r')
                .replace(/\n/g, '\\n')
                .replace(/\0/g, '\\0');
              return `'${escaped}'`;
            });
            return `(${vals.join(', ')})`;
          });
          dump += `INSERT INTO \`${table}\` (${colsEscaped}) VALUES\n${valuesList.join(',\n')};\n\n`;
        }
      }
    } catch (e) {
      dump += `-- Catatan: Gagal mengekstrak data untuk tabel \`${table}\`: ${e.message}\n\n`;
    }
  }

  dump += `COMMIT;\nSET FOREIGN_KEY_CHECKS = 1;\n`;
  return dump;
}

/**
 * Membuat backup database (Dump SQL untuk MySQL/phpMyAdmin, atau VACUUM snapshot jika SQLite mode)
 */
function createDatabaseBackup(dbInstanceOrOptions = null, label = 'auto', dbPath = DEFAULT_DB_PATH, retention = DEFAULT_RETENTION_COUNT) {
  ensureBackupDir();

  let dbInstance = null;
  let finalLabel = label;
  let finalDbPath = dbPath;
  let finalRetention = retention;

  if (dbInstanceOrOptions && typeof dbInstanceOrOptions === 'object' && typeof dbInstanceOrOptions.prepare !== 'function') {
    dbInstance = dbInstanceOrOptions.db || null;
    finalLabel = dbInstanceOrOptions.label || dbInstanceOrOptions.prefix || label;
    finalDbPath = dbInstanceOrOptions.dbPath || DEFAULT_DB_PATH;
    finalRetention = dbInstanceOrOptions.retention || retention;
  } else {
    dbInstance = dbInstanceOrOptions;
  }

  const isMySQL = (process.env.DB_TYPE !== 'sqlite') && (!dbInstance || dbInstance.constructor.name === 'MySQLDatabaseSync');
  const safeLabel = String(finalLabel).replace(/[^a-zA-Z0-9_-]/g, '_');

  if (isMySQL) {
    const filename = `siprabu_mysql_${getJakartaTimestamp()}_${safeLabel}.sql`;
    const targetPath = path.join(BACKUP_DIR, filename);

    if (!dbInstance) {
      const { db } = require('./db');
      dbInstance = db;
    }

    const dumpContent = generateMySQLDump(dbInstance);
    fs.writeFileSync(targetPath, dumpContent, 'utf8');

    const stats = fs.statSync(targetPath);
    if (stats.size < 100) {
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      throw new Error('Hasil dump MySQL kosong atau terlalu kecil.');
    }

    applyBackupRetention(finalRetention);

    return {
      success: true,
      engine: 'mysql',
      filename,
      backupPath: targetPath,
      integrity: 'ok',
      sizeBytes: stats.size,
      createdAt: new Date().toISOString()
    };
  }

  // Fallback pengujian SQLite
  const filename = `hibah_kpu_${getJakartaTimestamp()}_${safeLabel}.sqlite`;
  const targetPath = path.join(BACKUP_DIR, filename);

  let usedVacuum = false;
  if (dbInstance && typeof dbInstance.exec === 'function') {
    try {
      dbInstance.prepare('PRAGMA wal_checkpoint(TRUNCATE);').all();
      const escapedPath = targetPath.replace(/'/g, "''");
      dbInstance.exec(`VACUUM INTO '${escapedPath}'`);
      usedVacuum = true;
    } catch (e) {
      console.warn('[BACKUP] VACUUM INTO pada db aktif gagal, beralih ke metode temp checkpoint:', e.message);
    }
  }

  if (!usedVacuum) {
    if (fs.existsSync(finalDbPath)) {
      try {
        const SqliteDB = getSqliteDatabaseSync();
        const tempDb = new SqliteDB(finalDbPath);
        tempDb.prepare('PRAGMA wal_checkpoint(TRUNCATE);').all();
        const escapedPath = targetPath.replace(/'/g, "''");
        try {
          tempDb.exec(`VACUUM INTO '${escapedPath}'`);
          usedVacuum = true;
        } catch (_) {}
        tempDb.close();
      } catch (e) {
        console.warn('[BACKUP] Peringatan saat temp checkpoint:', e.message);
      }
    }
    if (!usedVacuum && fs.existsSync(finalDbPath)) {
      fs.copyFileSync(finalDbPath, targetPath);
    }
  }

  let isOk = false;
  try {
    const SqliteDB = getSqliteDatabaseSync();
    const verifyDb = new SqliteDB(targetPath);
    const result = verifyDb.prepare('PRAGMA integrity_check;').all();
    verifyDb.close();
    isOk = Array.isArray(result) && result.length > 0 && result[0].integrity_check === 'ok';
  } catch (err) {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    throw new Error(`Verifikasi integritas backup gagal: ${err.message}`);
  }

  if (!isOk) {
    if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
    throw new Error('Verifikasi integritas backup gagal: PRAGMA integrity_check tidak menghasilkan "ok".');
  }

  applyBackupRetention(finalRetention);

  const stats = fs.statSync(targetPath);
  return {
    success: true,
    engine: 'sqlite',
    filename,
    backupPath: targetPath,
    integrity: isOk ? 'ok' : 'failed',
    sizeBytes: stats.size,
    createdAt: new Date().toISOString()
  };
}

/**
 * Hapus backup lama jika melebihi batas retensi (.sql dan .sqlite)
 */
function applyBackupRetention(keepCount = DEFAULT_RETENTION_COUNT) {
  ensureBackupDir();
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.sql') || f.endsWith('.sqlite'))
      .map(f => {
        const fullPath = path.join(BACKUP_DIR, f);
        return { name: f, path: fullPath, mtime: fs.statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > keepCount) {
      const toDelete = files.slice(keepCount);
      for (const item of toDelete) {
        try {
          fs.unlinkSync(item.path);
        } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('[BACKUP] Gagal menerapkan retensi backup:', e.message);
  }
}

/**
 * Daftar backup yang tersedia (.sql dan .sqlite)
 */
function listBackups() {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sql') || f.endsWith('.sqlite'))
    .map(f => {
      const fullPath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fullPath);
      return {
        filename: f,
        type: f.endsWith('.sql') ? 'MySQL Dump' : 'SQLite Archive',
        path: fullPath,
        sizeBytes: stat.size,
        modifiedAt: new Date(stat.mtimeMs).toISOString()
      };
    })
    .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  return files;
}

/**
 * Pulihkan database SQLite dari file backup (khusus pengujian legacy)
 */
function restoreBackup(backupFilePath, targetDbPath = DEFAULT_DB_PATH) {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`File backup tidak ditemukan: ${backupFilePath}`);
  }

  const SqliteDB = getSqliteDatabaseSync();
  const verifyDb = new SqliteDB(backupFilePath);
  const result = verifyDb.prepare('PRAGMA integrity_check;').all();
  verifyDb.close();

  if (!result || result[0]?.integrity_check !== 'ok') {
    throw new Error('File backup corrupt / tidak lolos PRAGMA integrity_check.');
  }

  if (fs.existsSync(targetDbPath)) {
    const emergencyPath = `${targetDbPath}.emergency_bak`;
    try { fs.copyFileSync(targetDbPath, emergencyPath); } catch (e) {}
  }

  fs.copyFileSync(backupFilePath, targetDbPath);
  return { success: true, restoredFrom: backupFilePath, target: targetDbPath };
}

function verifyDatabaseIntegrity(dbPath) {
  if (!fs.existsSync(dbPath)) return { integrity: 'not_found' };
  try {
    const SqliteDB = getSqliteDatabaseSync();
    const verifyDb = new SqliteDB(dbPath);
    const result = verifyDb.prepare('PRAGMA integrity_check;').all();
    verifyDb.close();
    const isOk = Array.isArray(result) && result.length > 0 && result[0].integrity_check === 'ok';
    return { integrity: isOk ? 'ok' : 'corrupt', details: result };
  } catch (err) {
    return { integrity: 'error', error: err.message };
  }
}


/**
 * Mengonversi teks MySQL/phpMyAdmin Dump menjadi SQLite Database (.sqlite)
 * Menangani konversi tipe data, timestamp default, autoincrement, dan escape string.
 */
function convertMysqlDumpToSqlite(mysqlDumpText, targetSqlitePath) {
  const tempPath = targetSqlitePath + '.temp_' + Date.now();
  if (fs.existsSync(tempPath)) {
    try { fs.unlinkSync(tempPath); } catch (e) {}
  }
  const SqliteDB = getSqliteDatabaseSync();
  const targetDb = new SqliteDB(tempPath);

  targetDb.exec("PRAGMA foreign_keys = OFF;");
  targetDb.exec("PRAGMA journal_mode = MEMORY;");
  targetDb.exec("PRAGMA synchronous = OFF;");

  const lines = mysqlDumpText.split('\n');
  const cleanStatements = [];
  let curr = '';

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed.startsWith('SET ') || trimmed.startsWith('START TRANSACTION') || trimmed.startsWith('COMMIT;')) {
      continue;
    }

    curr += line + '\n';
    if (trimmed.endsWith(';')) {
      cleanStatements.push(curr.trim());
      curr = '';
    }
  }

  targetDb.exec("BEGIN TRANSACTION;");

  for (let stmt of cleanStatements) {
    if (/^CREATE\s+TABLE/i.test(stmt)) {
      stmt = stmt.replace(/\)\s*ENGINE=[^;]+;/gi, ');');
      stmt = stmt.replace(/current_timestamp\(\)/gi, 'CURRENT_TIMESTAMP');
      stmt = stmt.replace(/`id`\s+int\(\d+\)\s+NOT\s+NULL\s+AUTO_INCREMENT\s*,/gi, '`id` INTEGER PRIMARY KEY AUTOINCREMENT,');
      stmt = stmt.replace(/PRIMARY\s+KEY\s*\(`id`\)\s*,?/gi, '');
      stmt = stmt.replace(/,\s*\);/g, ');');
    }

    if (/^INSERT\s+INTO/i.test(stmt)) {
      stmt = stmt.replace(/\\'/g, "''").replace(/\\"/g, '""');
    }

    try {
      targetDb.exec(stmt);
    } catch (err) {
      console.error('[CONVERT ERROR] Stmt failed:', stmt.slice(0, 100), err.message);
    }
  }

  targetDb.exec("COMMIT;");
  try {
    targetDb.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_periode_snapshot_periode_id ON periode_snapshot(periode_id);");
    targetDb.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_subbag_usulan_periode_subbag ON subbag_usulan_revisi(periode_id, subbag);");
  } catch (idxErr) {}
  targetDb.exec("PRAGMA integrity_check;");
  targetDb.close();

  // Salin file temporer ke targetPath agar kompatibel dengan file lock pada Windows
  fs.copyFileSync(tempPath, targetSqlitePath);
  try { fs.unlinkSync(tempPath); } catch (e) {}
  return true;
}


// ============================================================================
// GOOGLE DRIVE CLOUD AUTO-BACKUP MODULE (NATIVE NODE.JS - ZERO DEPENDENCY)
// Mendukung:
// 1. OAuth 2.0 User Token (Opsi B - Menggunakan Kuota 15GB+ Akun Pribadi)
// 2. Service Account JWT RS256 (Opsi A - Shared Drive / Workspace)
// ============================================================================

const crypto = require('crypto');

const DATA_DIR_PATH = path.resolve(__dirname, '..', 'data');
const GDRIVE_OAUTH_FILE = process.env.GDRIVE_OAUTH_PATH || path.join(DATA_DIR_PATH, 'gdrive_oauth.json');
const GDRIVE_SA_KEY_FILE = process.env.GDRIVE_KEY_PATH || path.join(DATA_DIR_PATH, 'siprabu-512318-8fdb26db96c4.json');
const DEFAULT_GDRIVE_FOLDER_ID = process.env.GDRIVE_FOLDER_ID || '1n0Br1SqX2Tl4lI0HP3faRr68ZnZB97oQ';

let cachedDriveToken = null;
let driveTokenExpiresAt = 0;

/**
 * Mendapatkan Access Token Google Drive:
 * Prioritas 1: OAuth 2.0 Refresh Token (Opsi B - Milik Pengguna/15GB+)
 * Prioritas 2: Service Account JWT RS256 (Opsi A - Shared Drive)
 */
async function getGoogleDriveAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedDriveToken && driveTokenExpiresAt > now + 300) {
    return cachedDriveToken;
  }

  // 1. Coba OAuth 2.0 User Token terlebih dahulu (Opsi B)
  // Mendukung dari Environment Variables (Hostinger hPanel) maupun file data/gdrive_oauth.json
  let oauthData = null;
  const envRefreshToken = (process.env.GOOGLE_REFRESH_TOKEN || process.env.GDRIVE_REFRESH_TOKEN || '').trim();
  const envClientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const envClientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();

  if (envRefreshToken && envClientId && envClientSecret) {
    oauthData = {
      client_id: envClientId,
      client_secret: envClientSecret,
      refresh_token: envRefreshToken
    };
  } else if (fs.existsSync(GDRIVE_OAUTH_FILE)) {
    try {
      oauthData = JSON.parse(fs.readFileSync(GDRIVE_OAUTH_FILE, 'utf8'));
    } catch (err) {
      console.warn('[GDRIVE-OAUTH] Peringatan pembacaan gdrive_oauth.json:', err.message);
    }
  }

  if (oauthData && oauthData.refresh_token && oauthData.client_id && oauthData.client_secret) {
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: oauthData.client_id,
          client_secret: oauthData.client_secret,
          refresh_token: oauthData.refresh_token,
          grant_type: 'refresh_token'
        })
      });
      const tokenRes = await res.json();
      if (tokenRes.access_token) {
        cachedDriveToken = tokenRes.access_token;
        driveTokenExpiresAt = now + (tokenRes.expires_in || 3600);
        return cachedDriveToken;
      } else {
        console.warn('[GDRIVE-OAUTH] Refresh token gagal:', tokenRes);
      }
    } catch (netErr) {
      console.warn('[GDRIVE-OAUTH] Gagal menghubungi Google OAuth endpoint:', netErr.message);
    }
  }

  // 2. Fallback ke Service Account JWT RS256 (Opsi A)
  if (!fs.existsSync(GDRIVE_SA_KEY_FILE)) {
    throw new Error(`Kredensial Google Drive tidak ditemukan. Siapkan ${path.basename(GDRIVE_OAUTH_FILE)} (OAuth B) atau ${path.basename(GDRIVE_SA_KEY_FILE)} (Service Account).`);
  }

  const key = JSON.parse(fs.readFileSync(GDRIVE_SA_KEY_FILE, 'utf8'));
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const toB64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsignedToken = `${toB64Url(header)}.${toB64Url(payload)}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(unsignedToken);
  const signature = sign.sign(key.private_key, 'base64url');
  const jwt = `${unsignedToken}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Gagal otentikasi Google Service Account: ${data.error_description || JSON.stringify(data)}`);
  }

  cachedDriveToken = data.access_token;
  driveTokenExpiresAt = now + (data.expires_in || 3600);
  return cachedDriveToken;
}

/**
 * Mengunggah berkas backup (.sql atau .sqlite) ke Google Drive
 */
async function uploadBackupToGoogleDrive(filePath, options = {}) {
  const folderId = options.folderId || DEFAULT_GDRIVE_FOLDER_ID;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Berkas backup tidak ditemukan: ${filePath}`);
  }

  const token = await getGoogleDriveAccessToken();
  const fileName = options.filename || path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  const boundary = '-------SIPRABU' + Date.now();
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: fileName,
    parents: [folderId]
  };

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaHeader = `${delimiter}Content-Type: application/octet-stream\r\n\r\n`;

  const bodyBuffer = Buffer.concat([
    Buffer.from(metadataPart, 'utf8'),
    Buffer.from(mediaHeader, 'utf8'),
    fileBuffer,
    Buffer.from(closeDelimiter, 'utf8')
  ]);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,size,createdTime,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Length': String(bodyBuffer.length)
    },
    body: bodyBuffer
  });

  const data = await res.json();
  if (!res.ok) {
    if (data.error && data.error.message && data.error.message.includes('storage quota')) {
      throw new Error(`[GDRIVE-QUOTA] Google Drive menolak unggahan service account pada folder Gmail pribadi (kuota 0 bytes). Silakan selesaikan setup OAuth2 (node scripts/gdrive_oauth_setup.js) agar upload menggunakan kuota akun pribadi.`);
    }
    throw new Error(`Gagal upload Google Drive: ${data.error?.message || JSON.stringify(data)}`);
  }

  // Terapkan retensi cloud (simpan 10 backup terakhir di GDrive)
  try {
    await applyGoogleDriveRetention(folderId, options.retention || 10);
  } catch (e) {
    console.warn('[GDRIVE] Gagal membersihkan retensi cloud:', e.message);
  }

  return {
    success: true,
    fileId: data.id,
    name: data.name,
    sizeBytes: Number(data.size || fileBuffer.length),
    createdTime: data.createdTime || new Date().toISOString(),
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`
  };
}

/**
 * Membaca daftar berkas backup yang tersimpan di Google Drive
 */
async function listGoogleDriveBackups(folderId = DEFAULT_GDRIVE_FOLDER_ID) {
  const token = await getGoogleDriveAccessToken();
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&supportsAllDrives=true&includeItemsFromAllDrives=true&orderBy=createdTime+desc&fields=files(id,name,size,createdTime,webViewLink)`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Gagal membaca daftar Google Drive: ${data.error?.message || JSON.stringify(data)}`);
  }
  return data.files || [];
}

/**
 * Menghapus berkas lama di Google Drive jika melebihi batas retensi
 */
async function applyGoogleDriveRetention(folderId = DEFAULT_GDRIVE_FOLDER_ID, keepCount = 10) {
  const files = await listGoogleDriveBackups(folderId);
  if (files.length <= keepCount) return 0;

  const token = await getGoogleDriveAccessToken();
  const toDelete = files.slice(keepCount);
  let deletedCount = 0;

  for (const f of toDelete) {
    try {
      const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?supportsAllDrives=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (delRes.ok) deletedCount++;
    } catch (e) {}
  }
  return deletedCount;
}

/**
 * Eksekusi One-Stop: Buat backup lokal & langsung unggah ke Google Drive
 */
async function executeBackupToGoogleDrive(dbInstance = null, label = 'cloud_auto') {
  const localRes = createDatabaseBackup(dbInstance, label);
  const gdriveRes = await uploadBackupToGoogleDrive(localRes.backupPath, {
    filename: localRes.filename
  });

  return {
    success: true,
    engine: localRes.engine,
    filename: localRes.filename,
    localPath: localRes.backupPath,
    sizeBytes: localRes.sizeBytes,
    gdrive: gdriveRes
  };
}

module.exports = {
  getGoogleDriveAccessToken,
  uploadBackupToGoogleDrive,
  listGoogleDriveBackups,
  applyGoogleDriveRetention,
  executeBackupToGoogleDrive,
  convertMysqlDumpToSqlite,
  createDatabaseBackup,
  createBackup: createDatabaseBackup,
  generateMySQLDump,
  verifyDatabaseIntegrity,
  listBackups,
  restoreBackup,
  applyBackupRetention,
  getJakartaTimestamp
};
