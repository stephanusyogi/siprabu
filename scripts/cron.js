/**
 * SI-PRABU Clean Web Edition v3.0
 * Cron Job Runner Khusus Hostinger hPanel (Node.js Cron Job)
 * Pengembang: emenje & Stephanus Yogi
 * 
 * Penggunaan di Hostinger Cron:
 *   scripts/cron.js
 */

const { db } = require('../src/db');
const { executeBackupToGoogleDrive } = require('../src/backup');

async function runCron() {
  const jakartaTime = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'full',
    timeStyle: 'long'
  }).format(new Date());

  console.log(`================================================================`);
  console.log(`  SI-PRABU CRON BACKUP ENGINE (HOSTINGER hPANEL)               `);
  console.log(`  Waktu Eksekusi: ${jakartaTime}`);
  console.log(`================================================================\n`);

  try {
    const res = await executeBackupToGoogleDrive(db, 'cron_hostinger');
    console.log(`[CRON] ✅ Berhasil membuat backup dan mengunggah ke Google Drive:`);
    console.log(`- File      : ${res.filename}`);
    console.log(`- Ukuran    : ${res.size}`);
    console.log(`- GDrive ID : ${res.fileId}`);
    console.log(`- GDrive URL: ${res.webViewLink}\n`);
    console.log(`🎉 Tugas Cron SI-PRABU Selesai dengan Sukses!`);
    process.exit(0);
  } catch (err) {
    console.error(`[CRON] ❌ Gagal menjalankan tugas cron:`, err.message);
    process.exit(1);
  }
}

runCron();

