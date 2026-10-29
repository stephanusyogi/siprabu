const assert = require('assert');
process.env.DB_TYPE = 'sqlite';

const { db, saveUser, getUsers, updateUserRoleMode, getMenuMatrix, saveMenuMatrix, checkRowEditPermission } = require('../src/db');
const { createToken, verifyToken } = require('../src/auth');

async function testSaktiRoleAndMenuMatrix() {
  console.log('Testing SAKTI Role Switcher, Kumulatif Preference, & Menu Matrix...');

  // Cleanup prior test user if exists
  const existingTestUser = db.prepare('SELECT id FROM satker_users WHERE username = ?').get('test_multi_role_operator');
  if (existingTestUser) {
    db.prepare('DELETE FROM satker_user_roles WHERE user_id = ?').run(existingTestUser.id);
    db.prepare('DELETE FROM satker_users WHERE id = ?').run(existingTestUser.id);
  }

  // 1. Buat pengguna uji coba multi-peran (misal User merangkap TEKNIS dan HUKUM)
  const testUser = saveUser({
    username: 'test_multi_role_operator',
    password: 'password123',
    nama_pejabat: 'Budi Multi Role, S.H.',
    nip: '199001012015011001',
    jabatan: 'Operator Teknis & Hukum',
    email: 'budi_multi@kpu.go.id',
    is_active: 1,
    role_mode: 'SWITCH',
    roles: [
      { level: 2, pic: 'TEKNIS', mode_akses: 'EDITOR', is_default: 1, label_peran: 'Operator Teknis' },
      { level: 2, pic: 'HUKUM', mode_akses: 'EDITOR', is_default: 0, label_peran: 'Operator Hukum' }
    ]
  });

  try {
    assert.ok(testUser, 'User multi-role harus berhasil dibuat');
    assert.strictEqual(testUser.roles.length, 2, 'User harus memiliki 2 peran');
    assert.strictEqual(testUser.role_mode, 'SWITCH', 'Default role_mode harus SWITCH');
    console.log('✅ Test 1: User multi-role berhasil dibuat dengan 2 peran.');

    // 2. Verifikasi Token dalam mode SWITCH
    const tokenSwitch = createToken(testUser);
    const verifiedSwitch = verifyToken(tokenSwitch, db);
    assert.strictEqual(verifiedSwitch.role_mode, 'SWITCH');
    assert.strictEqual(verifiedSwitch.pic_subbag, 'TEKNIS', 'Pada mode SWITCH, peran aktif adalah default (TEKNIS)');
    console.log('✅ Test 2: Token SAKTI (mode SWITCH) membawa peran aktif default.');

    // 3. Uji Otorisasi Edit pada mode SWITCH (ala SAKTI)
    const draftPeriode = db.prepare('SELECT id FROM periode_anggaran WHERE is_locked = 0 LIMIT 1').get();
    if (draftPeriode) {
      // Sebagai TEKNIS aktif: edit TEKNIS harus diizinkan
      assert.doesNotThrow(() => {
        checkRowEditPermission(draftPeriode.id, 'TEKNIS', verifiedSwitch);
      }, 'Harus diizinkan edit TEKNIS');

      // Sebagai TEKNIS aktif: edit HUKUM harus ditolak karena sedang tidak aktif sebagai HUKUM
      assert.throws(() => {
        checkRowEditPermission(draftPeriode.id, 'HUKUM', verifiedSwitch);
      }, /Akses ditolak.*Operator TEKNIS tidak berwenang/);
      console.log('✅ Test 3: Mode SWITCH membatasi edit hanya pada peran aktif (ala SAKTI).');
    }

    // 4. Ubah preferensi ke KUMULATIF
    updateUserRoleMode(testUser.id, 'KUMULATIF');
    const userKumulatif = getUsers().find(u => u.id === testUser.id);
    assert.strictEqual(userKumulatif.role_mode, 'KUMULATIF');

    const tokenKumulatif = createToken(userKumulatif);
    const verifiedKumulatif = verifyToken(tokenKumulatif, db);
    assert.strictEqual(verifiedKumulatif.role_mode, 'KUMULATIF');

    if (draftPeriode) {
      // Pada mode KUMULATIF: edit TEKNIS diizinkan
      assert.doesNotThrow(() => {
        checkRowEditPermission(draftPeriode.id, 'TEKNIS', verifiedKumulatif);
      }, 'Harus diizinkan edit TEKNIS pada mode kumulatif');

      // Pada mode KUMULATIF: edit HUKUM juga diizinkan tanpa perlu switch peran!
      assert.doesNotThrow(() => {
        checkRowEditPermission(draftPeriode.id, 'HUKUM', verifiedKumulatif);
      }, 'Harus diizinkan edit HUKUM pada mode kumulatif');

      // Namun subbag yang TIDAK dimiliki (misal KUL) tetap ditolak tegas!
      assert.throws(() => {
        checkRowEditPermission(draftPeriode.id, 'KUL', verifiedKumulatif);
      }, /Akses ditolak/);
      console.log('✅ Test 4: Mode KUMULATIF mengizinkan seluruh peran yang dimiliki (TEKNIS & HUKUM) tanpa kebocoran ke KUL.');
    }

    // 5. Uji Matriks Hak Akses Menu & Anti-Lockout Guard
    const matrix = getMenuMatrix();
    assert.ok(Array.isArray(matrix) && matrix.length > 0, 'Matriks menu harus ada');
    const menuMatrixRow = matrix.find(m => m.menu_key === 'view-menu-matrix');
    assert.ok(menuMatrixRow, 'Menu view-menu-matrix harus terdaftar di matriks');

    // Coba update matriks menu
    const updatedItems = matrix.map(item => ({
      ...item,
      allow_l0: 0, // Coba matikan developer (akan dilindungi oleh guard)
      allow_l2: item.menu_key === 'view-rkb' ? 1 : 0
    }));

    saveMenuMatrix(updatedItems);
    const matrixAfter = getMenuMatrix();
    const devRow = matrixAfter.find(m => m.menu_key === 'view-dashboard');
    assert.strictEqual(Number(devRow.allow_l0), 1, 'Developer Level 0 tidak boleh bisa di-uncheck');
    console.log('✅ Test 5: Matriks menu dinamis berhasil di-update dengan proteksi anti-lockout.');

  } finally {
    // Cleanup test user
    db.prepare('DELETE FROM satker_user_roles WHERE user_id = ?').run(testUser.id);
    db.prepare('DELETE FROM satker_users WHERE id = ?').run(testUser.id);
  }

  console.log('\n🎉 SEMUA PENGUJIAN SAKTI ROLE SWITCHER, MODE KUMULATIF, & MENU MATRIX SUKSES 100%!');
}

testSaktiRoleAndMenuMatrix().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
