/**
 * SI-PRABU Clean Web Edition v3.0
 * Skrip Aman Pemulihan / Penetapan Password Admin & Pengembang (Level 0)
 * Pengembang: emenje
 * 
 * Penggunaan:
 *   ADMIN_RESET_PASSWORD="PasswordBaru123!" node scripts/reset_admin.js
 *   atau: node scripts/reset_admin.js --generate
 */

const { db, recordAuditLog } = require('../src/db');
const { hashPassword } = require('../src/crypto_util');
const crypto = require('node:crypto');

async function main() {
  const args = process.argv.slice(2);
  let newPassword = process.env.ADMIN_RESET_PASSWORD || '';

  if (!newPassword && args.length > 0 && !args[0].startsWith('--')) {
    newPassword = args[0];
  }

  let isGenerated = false;
  if (!newPassword || args.includes('--generate')) {
    // Generate password aman acak
    newPassword = crypto.randomBytes(12).toString('base64url') + '@Kpu26!';
    isGenerated = true;
  }

  const adminUser = db.prepare("SELECT * FROM satker_users WHERE username = 'emenje'").get();
  if (!adminUser) {
    console.error('[RESET-ADMIN] Akun pengembang "emenje" tidak ditemukan di database.');
    process.exit(1);
  }

  const hashed = hashPassword(newPassword);
  db.prepare(`
    UPDATE satker_users 
    SET password = ?, token_version = COALESCE(token_version, 1) + 1, is_active = 1
    WHERE username = 'emenje'
  `).run(hashed);

  recordAuditLog({
    user: { id: adminUser.id, username: 'emenje', role_id: 'developer' },
    action: 'RESET_ADMIN_PASSWORD',
    entity: 'satker_users',
    entity_id: adminUser.id,
    notes: 'Password admin/pengembang berhasil direset via skrip pemulihan CLI.'
  });

  console.log('------------------------------------------------------------');
  console.log(' Sukses: Password untuk akun pengembang "emenje" diperbarui.');
  console.log(' Sesi aktif sebelumnya telah dicabut (token_version di-increment).');
  if (isGenerated) {
    // Tampilkan hanya sekali di stdout CLI lokal (bukan ke log file)
    console.log(` Kredensial baru yang di-generate: ${newPassword}`);
    console.log(' Harap simpan kredensial ini di tempat aman.');
  } else {
    console.log(' Password yang dikonfigurasi melalui environment telah diterapkan.');
  }
  console.log('------------------------------------------------------------');
}

main().catch(err => {
  console.error('[RESET-ADMIN] Gagal:', err.message);
  process.exit(1);
});
