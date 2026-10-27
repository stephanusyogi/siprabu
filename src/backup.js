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

module.exports = {
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
