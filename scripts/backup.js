/**
 * SI-PRABU Clean Web Edition v3.0
 * CLI Utilitas Backup & Integrity Check Database SQLite
 * Pengembang: emenje
 * 
 * Penggunaan:
 *   node scripts/backup.js [label]
 *   node scripts/backup.js --list
 */

const { db } = require('../src/db');
const { createDatabaseBackup, listBackups } = require('../src/backup');

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--list')) {
    const list = listBackups();
    console.log('Daftar Backup Database:');
    console.table(list);
    return;
  }

  const label = args[0] || 'manual_cli';
  console.log(`Membuat backup database dengan label "${label}"...`);
  const res = createDatabaseBackup(db, label);
  console.log('Backup berhasil dibuat dan lolos uji integritas (PRAGMA integrity_check):');
  console.log(`- File : ${res.filename}`);
  console.log(`- Path : ${res.backupPath}`);
  console.log(`- Size : ${(res.sizeBytes / 1024).toFixed(2)} KB`);
}

main().catch(err => {
  console.error('Gagal membuat backup:', err.message);
  process.exit(1);
});
