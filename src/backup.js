/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Backup & Pemulihan SQLite Konsisten (WAL Checkpoint & Integrity Verification)
 * Pengembang: emenje
 */

const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

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
 * Membuat backup SQLite yang konsisten (WAL flushed via checkpoint TRUNCATE)
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

  // 1. Flush WAL jika database instance aktif diberikan
  if (dbInstance && typeof dbInstance.prepare === 'function') {
    try {
      dbInstance.prepare('PRAGMA wal_checkpoint(TRUNCATE);').all();
    } catch (e) {
      console.warn('[BACKUP] Peringatan saat flush WAL:', e.message);
    }
  } else if (fs.existsSync(finalDbPath)) {
    try {
      const tempDb = new DatabaseSync(finalDbPath);
      tempDb.prepare('PRAGMA wal_checkpoint(TRUNCATE);').all();
      tempDb.close();
    } catch (e) {
      console.warn('[BACKUP] Peringatan saat temp checkpoint:', e.message);
    }
  }

  if (!fs.existsSync(finalDbPath)) {
    throw new Error(`File database sumber tidak ditemukan di ${finalDbPath}`);
  }

  const safeLabel = String(finalLabel).replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `hibah_kpu_${getJakartaTimestamp()}_${safeLabel}.sqlite`;
  const targetPath = path.join(BACKUP_DIR, filename);

  // 2. Salin database
  fs.copyFileSync(finalDbPath, targetPath);

  // 3. Verifikasi integritas backup
  let isOk = false;
  try {
    const verifyDb = new DatabaseSync(targetPath);
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

  // 4. Terapkan retensi backup (bersihkan backup lama berlebih)
  applyBackupRetention(finalRetention);

  const stats = fs.statSync(targetPath);
  return {
    success: true,
    filename,
    backupPath: targetPath,
    integrity: isOk ? 'ok' : 'failed',
    sizeBytes: stats.size,
    createdAt: new Date().toISOString()
  };
}

/**
 * Hapus backup lama jika melebihi batas retensi
 */
function applyBackupRetention(keepCount = DEFAULT_RETENTION_COUNT) {
  ensureBackupDir();
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('hibah_kpu_') && f.endsWith('.sqlite'))
      .map(f => {
        const fullPath = path.join(BACKUP_DIR, f);
        return { name: f, path: fullPath, mtime: fs.statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime); // Teranyar duluan

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
 * Daftar backup yang tersedia
 */
function listBackups() {
  ensureBackupDir();
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.sqlite'))
    .map(f => {
      const fullPath = path.join(BACKUP_DIR, f);
      const stat = fs.statSync(fullPath);
      return {
        filename: f,
        path: fullPath,
        sizeBytes: stat.size,
        modifiedAt: new Date(stat.mtimeMs).toISOString()
      };
    })
    .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt));
  return files;
}

/**
 * Pulihkan database dari file backup
 */
function restoreBackup(backupFilePath, targetDbPath = DEFAULT_DB_PATH) {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`File backup tidak ditemukan: ${backupFilePath}`);
  }

  // Verifikasi integritas sebelum pemulihan
  const verifyDb = new DatabaseSync(backupFilePath);
  const result = verifyDb.prepare('PRAGMA integrity_check;').all();
  verifyDb.close();

  if (!result || result[0]?.integrity_check !== 'ok') {
    throw new Error('File backup corrupt / tidak lolos PRAGMA integrity_check.');
  }

  // Jika target sedang ada, buat backup darurat dulu
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
    const verifyDb = new DatabaseSync(dbPath);
    const result = verifyDb.prepare('PRAGMA integrity_check;').all();
    verifyDb.close();
    const isOk = Array.isArray(result) && result.length > 0 && result[0].integrity_check === 'ok';
    return { integrity: isOk ? 'ok' : 'corrupt', details: result };
  } catch (err) {
    return { integrity: 'error', error: err.message };
  }
}

module.exports = {
  createDatabaseBackup,
  createBackup: createDatabaseBackup,
  verifyDatabaseIntegrity,
  listBackups,
  restoreBackup,
  applyBackupRetention,
  getJakartaTimestamp
};
