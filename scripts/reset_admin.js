/**
 * SI-PRABU Clean Web Edition v3.0
 * Skrip Aman Pemulihan / Penetapan Password Pengguna & Konfigurasi Auth CLI
 * Pengembang: emenje
 * 
 * Penggunaan:
 *   node scripts/reset_admin.js                                   -> Reset password pengembang 'emenje' (generate acak)
 *   node scripts/reset_admin.js <username> <new_password>         -> Tetapkan password baru untuk pengguna tertentu
 *   node scripts/reset_admin.js --status                          -> Tampilkan status akun & konfigurasi auth
 *   node scripts/reset_admin.js --enable-google [clientId]        -> Aktifkan Google Sign-In
 *   node scripts/reset_admin.js --disable-google                  -> Nonaktifkan Google Sign-In
 */

const { db, recordAuditLog } = require('../src/db');
const { hashPassword } = require('../src/crypto_util');
const crypto = require('node:crypto');

async function main() {
  const args = process.argv.slice(2);

  // Status check
  if (args.includes('--status')) {
    console.log('=== STATUS PENGGUNA & AUTH SI-PRABU ===');
    const users = db.prepare('SELECT id, username, nama_pejabat, role_id, level, pic_subbag, email, is_active FROM satker_users').all();
    console.table(users);
    const settings = db.prepare("SELECT key, value FROM settings_satker WHERE key LIKE 'google_%'").all();
    console.log('Pengaturan Google SSO:');
    console.table(settings);
    return;
  }

  // Enable Google SSO
  if (args.includes('--enable-google')) {
    const idx = args.indexOf('--enable-google');
    const clientId = (args[idx + 1] && !args[idx + 1].startsWith('--')) 
      ? args[idx + 1] 
      : '824065065347-t7vi42nu00u298v3vljo5i0hmcgb67vg.apps.googleusercontent.com';
    db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES ('google_auth_enabled', '1')").run();
    db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES ('google_client_id', ?)").run(clientId);
    console.log(`[SUCCESS] Google Sign-In diaktifkan dengan Client ID: ${clientId}`);
    return;
  }

  // Disable Google SSO
  if (args.includes('--disable-google')) {
    db.prepare("INSERT OR REPLACE INTO settings_satker (key, value) VALUES ('google_auth_enabled', '0')").run();
    console.log('[SUCCESS] Google Sign-In dinonaktifkan.');
    return;
  }

  let targetUsername = 'emenje';
  let newPassword = process.env.ADMIN_RESET_PASSWORD || '';

  if (args.length >= 2 && !args[0].startsWith('--')) {
    targetUsername = args[0];
    newPassword = args[1];
  } else if (args.length === 1 && !args[0].startsWith('--')) {
    const existing = db.prepare('SELECT id FROM satker_users WHERE username = ?').get(args[0]);
    if (existing) {
      targetUsername = args[0];
    } else {
      newPassword = args[0];
    }
  }

  let isGenerated = false;
  if (!newPassword || args.includes('--generate')) {
    newPassword = crypto.randomBytes(12).toString('base64url') + '@Kpu26!';
    isGenerated = true;
  }

  const targetUser = db.prepare('SELECT * FROM satker_users WHERE username = ?').get(targetUsername);
  if (!targetUser) {
    console.error(`[RESET-ADMIN] Akun "${targetUsername}" tidak ditemukan di database.`);
    process.exit(1);
  }

  const hashed = hashPassword(newPassword);
  db.prepare(`
    UPDATE satker_users 
    SET password = ?, token_version = COALESCE(token_version, 1) + 1, is_active = 1
    WHERE username = ?
  `).run(hashed, targetUsername);

  recordAuditLog({
    user: { id: targetUser.id, username: targetUser.username, role_id: targetUser.role_id },
    action: 'RESET_USER_PASSWORD',
    entity: 'satker_users',
    entity_id: targetUser.id,
    notes: `Password akun "${targetUsername}" berhasil direset via skrip CLI.`
  });

  console.log('------------------------------------------------------------');
  console.log(` Sukses: Password untuk akun "${targetUsername}" diperbarui.`);
  console.log(' Sesi aktif sebelumnya telah dicabut (token_version di-increment).');
  if (isGenerated) {
    console.log(` Kredensial baru yang di-generate: ${newPassword}`);
    console.log(' Harap simpan kredensial ini di tempat aman.');
  } else {
    console.log(' Password yang dikonfigurasi telah berhasil diterapkan.');
  }
  console.log('------------------------------------------------------------');
}

main().catch(err => {
  console.error('[RESET-ADMIN] Gagal:', err.message);
  process.exit(1);
});
