/**
 * SI-PRABU Clean Web Edition v3.0
 * CLI Utilitas Backup Database (MySQL phpMyAdmin Dump / SQL Backup & Google Drive Cloud)
 * Pengembang: emenje & Stephanus Yogi
 * 
 * Penggunaan:
 *   node scripts/backup.js [label]               -> Backup lokal
 *   node scripts/backup.js --gdrive [label]      -> Backup lokal + Upload ke Google Drive
 *   node scripts/backup.js --list                -> Daftar backup lokal
 *   node scripts/backup.js --list-gdrive         -> Daftar backup di Google Drive
 */

const { db } = require('../src/db');
const {
  createDatabaseBackup,
  listBackups,
  executeBackupToGoogleDrive,
  listGoogleDriveBackups
} = require('../src/backup');

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list-gdrive')) {
    console.log('Membaca daftar backup di Google Drive...');
    const list = await listGoogleDriveBackups();
    console.log(`Ditemukan ${list.length} berkas backup di Google Drive:`);
    console.table(list.map(f => ({
      id: f.id,
      nama: f.name,
      ukuran: `${(Number(f.size || 0) / 1024).toFixed(2)} KB`,
      waktu: f.createdTime
    })));
    return;
  }

  if (args.includes('--list')) {
    const list = listBackups();
    console.log('Daftar Backup Database Lokal:');
    console.table(list);
    return;
  }

  const isGdrive = args.includes('--gdrive');
  const labelArgs = args.filter(a => !a.startsWith('--'));
  const label = labelArgs[0] || (isGdrive ? 'gdrive_cli' : 'manual_cli');

  if (isGdrive) {
    console.log(`[GDRIVE] Membuat backup database & mengunggah ke Google Drive dengan label "${label}"...`);
    const res = await executeBackupToGoogleDrive(db, label);
    console.log(`\n🎉 Backup berhasil dibuat dan diunggah ke Google Drive:`);
    console.log(`- File Lokal  : ${res.filename}`);
    console.log(`- Path Lokal  : ${res.localPath}`);
    console.log(`- Size        : ${(res.sizeBytes / 1024).toFixed(2)} KB`);
    console.log(`- GDrive ID   : ${res.gdrive.fileId}`);
    console.log(`- GDrive Link : ${res.gdrive.webViewLink}`);
    return;
  }

  console.log(`Membuat backup database lokal dengan label "${label}"...`);
  const res = createDatabaseBackup(db, label);
  console.log(`\n✅ Backup berhasil dibuat (Engine: ${res.engine.toUpperCase()}):`);
  console.log(`- File : ${res.filename}`);
  console.log(`- Path : ${res.backupPath}`);
  console.log(`- Size : ${(res.sizeBytes / 1024).toFixed(2)} KB`);
}

main().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Gagal membuat backup:', err.message);
  process.exit(1);
});
