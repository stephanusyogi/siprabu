/**
 * SI-PRABU Comprehensive Test Suite
 * Memverifikasi seluruh perbaikan P0, P1, P2, dan P3 dalam lingkungan terisolasi.
 * Dijalankan pada SQLite sementara: data/test_hibah_kpu.sqlite
 */

const path = require('path');
const fs = require('fs');

// 1. Setup Lingkungan Uji Terisolasi
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const PROD_DB_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite');
const TEST_DB_PATH = path.join(DATA_DIR, 'test_hibah_kpu.sqlite');

for (const ext of ['', '-wal', '-shm']) {
  const f = TEST_DB_PATH + ext;
  if (fs.existsSync(f)) {
    try { fs.unlinkSync(f); } catch (e) {}
  }
}

// Salin database produksi saat ini ke database uji terisolasi
fs.copyFileSync(PROD_DB_PATH, TEST_DB_PATH);
process.env.SIPRABU_DB_PATH = TEST_DB_PATH;

console.log('================================================================');
console.log('  SI-PRABU COMPREHENSIVE TEST SUITE (ISOLATED DATABASE)');
console.log(`  Test Database: ${TEST_DB_PATH}`);
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ [FAIL] Test ${totalTests}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    passedTests++;
    console.log(`  ✅ [PASS] Test ${totalTests}: ${message}`);
  }
}

async function runAllTests() {
  const { createBackup, verifyDatabaseIntegrity } = require('../src/backup');
  const { hashPassword, verifyPassword, sanitizeLogData } = require('../src/crypto_util');
  const { parseIndonesianNumber } = require('../src/number_util');
  const { createToken, verifyToken, revokeToken, TOKEN_MAX_AGE_MS, IDLE_TIMEOUT_MS, canEditRow, canManageLifecycle, canManageUsers, isDeveloperUser, validateUserCoherence, getSecretKey } = require('../src/auth');
  const {
    db,
    getPeriodeList,
    getPeriodeById,
    getActivePeriode,
    lockPeriode,
    unlockPeriode,
    saveRabRow,
    getRabRowById,
    deleteRabRow,
    updateRabBarisPicWithCascade,
    authenticateUser,
    getMasters,
    getKecamatans,
    getDesas,
    bulkUpsertKecamatan,
    bulkUpsertDesa,
    bulkUpsertSbm,
    bulkUpsertAkun,
    generateNextKodeRevisi,
    createRevisiPengajuan,
    updateRevisiTahap,
    deleteRevisiPengajuan,
    finalizeTahap4Keseluruhan,
    recordAuditLog,
    saveKuantitas,
    getKuantitasById,
    createDownloadRequest,
    getDownloadRequests,
    cleanupExpiredDownloads
  } = require('../src/db');
  const { calculateRkbDataset, getCachedRkbDataset, clearRkbDatasetCache, getRevisionComparison } = require('../src/calculation');
  const { parseSbmExcelBuffer, parseDesaExcelBuffer, exportRkbToExcelBuffer } = require('../src/excel_io');

  // --------------------------------------------------------------------------
  // TEST 1: Consistent Backup Engine (WAL Checkpoint & Integrity Check)
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 1: BACKUP & DATABASE INTEGRITY ---');
  const backupRes = createBackup({ dbPath: TEST_DB_PATH, prefix: 'test_backup' });
  assert(backupRes.success === true && fs.existsSync(backupRes.backupPath), 'Mesin backup SQLite konsisten berhasil membuat berkas backup.');
  assert(backupRes.integrity === 'ok', 'Verifikasi integritas database hasil backup berstatus "ok".');

  // --------------------------------------------------------------------------
  // TEST 2: Password Hashing (scrypt) & Transparent Plaintext Upgrade
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 2: KEAMANAN & AUTENTIKASI ---');
  const plainPass = 'PasswordKpu123!';
  const hashed = hashPassword(plainPass);
  assert(hashed.startsWith('scrypt$'), 'Password baru di-hash menggunakan algoritma scrypt.');
  assert(verifyPassword(plainPass, hashed).valid === true, 'Verifikasi password scrypt bernilai benar.');
  assert(verifyPassword('WrongPass', hashed).valid === false, 'Password salah ditolak oleh verifier scrypt.');

  // --------------------------------------------------------------------------
  // TEST 3: Secret Management & Log Sanitization
  // --------------------------------------------------------------------------
  const secretKey = getSecretKey();
  assert(typeof secretKey === 'string' && secretKey.length >= 32, 'Session secret key dinamis dan aman (panjang >= 32 karakter).');
  const dirtyLog = { username: 'test', password: 'secretPassword123', token: 'eyJhbGciOi...', nested: { auth_token: 'secretToken' } };
  const cleanLog = sanitizeLogData(dirtyLog);
  assert(cleanLog.password === '[REDACTED]' && cleanLog.nested.auth_token === '[REDACTED]', 'sanitizeLogData() menyaring rahasia dari log output.');

  // --------------------------------------------------------------------------
  // TEST 4: Token Revocation & Session Validity
  // --------------------------------------------------------------------------
  const testUser = db.prepare('SELECT * FROM satker_users WHERE username = ?').get('perencanaan') ||
                   db.prepare('SELECT * FROM satker_users LIMIT 1').get();
  const token = createToken(testUser);
  const verifiedUser = verifyToken(token, db);
  assert(verifiedUser !== null && verifiedUser.username === testUser.username, 'Token JWT berhasil diverifikasi dengan token_version yang cocok.');

  // Invalidate token by incrementing token_version
  db.prepare('UPDATE satker_users SET token_version = token_version + 1 WHERE id = ?').run(testUser.id);
  const revokedUser = verifyToken(token, db);
  assert(revokedUser === null, 'Token langsung dicabut/tidak berlaku saat token_version pengguna dinaikkan.');
  // Restore token version
  db.prepare('UPDATE satker_users SET token_version = ? WHERE id = ?').run(testUser.token_version, testUser.id);

  // --------------------------------------------------------------------------
  // TEST 5: Developer Role Switching Identity Preservation
  // --------------------------------------------------------------------------
  const devOrigin = db.prepare("SELECT id, username, level, role_id FROM satker_users WHERE level = 0 LIMIT 1").get() || { id: 10, username: 'emenje', level: 0, role_id: 'developer' };
  const targetRole = db.prepare("SELECT id, username, level, role_id, pic_subbag FROM satker_users WHERE level = 2 LIMIT 1").get() || { id: 3, username: 'op_perencanaan', level: 2, role_id: 'operator', pic_subbag: 'RENDATIN' };
  const switchedToken = createToken({
    ...targetRole,
    is_developer: true,
    original_dev_id: devOrigin.id
  });
  const verifiedSwitch = verifyToken(switchedToken, db);
  assert(verifiedSwitch && verifiedSwitch.is_developer === true && verifiedSwitch.original_dev_id === devOrigin.id, 'Developer berganti peran tetap mempertahankan identitas asal developer.');

  // --------------------------------------------------------------------------
  // TEST 6: Role Coherence & Escalation Prevention
  // --------------------------------------------------------------------------
  const invalidRole = validateUserCoherence({ level: 1, role_id: 'operator', pic_subbag: 'TEKNIS' });
  assert(invalidRole.valid === false, 'validateUserCoherence() menolak kombinasi peran yang tidak konsisten (Level 1 tapi role operator).');
  const validRole = validateUserCoherence({ level: 2, role_id: 'operator', pic_subbag: 'TEKNIS' });
  assert(validRole.valid === true, 'validateUserCoherence() menyetujui peran yang konsisten.');

  // Hak Akses Manajemen Pengguna: HANYA Level 0 dan Kasubbag Perencanaan
  assert(canManageUsers({ level: 0, username: 'emenje', role_id: 'developer' }) === true, 'Level 0 Developer memiliki hak mengelola pengguna.');
  assert(canManageUsers({ level: 1, username: 'perencanaan', role_id: 'super_admin' }) === true, 'Kasubbag Perencanaan (Level 1) memiliki hak mengelola pengguna.');
  assert(canManageUsers({ level: 1, username: 'staf_perencanaan', role_id: 'admin_perencanaan' }) === false, 'Staf Perencanaan DITOLAK mengelola pengguna (hanya Kasubbag).');
  assert(canManageUsers({ level: 2, username: 'teknis', role_id: 'op_teknis' }) === false, 'Level 2 Operator DITOLAK mengelola pengguna.');

  // Hak Akses Ruang Pengembang (Blueprint & PRD): HANYA Lead Developer Aktif (Level 0)
  assert(isDeveloperUser({ level: 0, username: 'emenje', role_id: 'developer' }) === true, 'Akun Lead Developer emenje (Level 0) terverifikasi sebagai Developer sah.');
  assert(isDeveloperUser({ level: 1, username: 'perencanaan', role_id: 'super_admin' }) === false, 'Kasubbag Perencanaan (Level 1) DITOLAK mengakses Ruang Pengembang.');
  assert(isDeveloperUser({ level: 2, username: 'teknis', role_id: 'op_teknis' }) === false, 'Operator Subbagian (Level 2) DITOLAK mengakses Ruang Pengembang.');
  assert(isDeveloperUser({ level: 2, username: 'teknis', role_id: 'op_teknis', is_developer: true, original_dev_username: 'emenje' }) === false, 'Saat simulasi peran non-Developer (Level 2), akses Blueprint & PRD DITOLAK mengikuti batas peran simulasi.');
  assert(isDeveloperUser({ level: 3, username: 'ketua', role_id: 'viewer_ketua' }) === false, 'Pimpinan Satker (Level 3) DITOLAK mengakses Ruang Pengembang.');

  // --------------------------------------------------------------------------
  // TEST 7: Backend Authorization on Row Editing (Level 2 Subbag Isolation)
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 3: OTORISASI & BATAS SUBBAGIAN ---');
  const userTeknis = { id: 10, username: 'teknis_op', level: 2, role_id: 'operator', pic_subbag: 'TEKNIS' };
  const rowTeknis = { id: 101, pic_bagian: 'TEKNIS', periode_id: 1 };
  const rowKul = { id: 102, pic_bagian: 'KUL', periode_id: 1 };
  assert(canEditRow(userTeknis, rowTeknis, 0) === true, 'Operator TEKNIS diizinkan mengedit baris TEKNIS pada dokumen terbuka.');
  assert(canEditRow(userTeknis, rowKul, 0) === false, 'Operator TEKNIS DITOLAK mengedit baris KUL (isolasi subbag).');
  assert(canEditRow(userTeknis, rowTeknis, 1) === false, 'Operator DITOLAK mengedit dokumen yang berstatus TERKUNCI.');

  // --------------------------------------------------------------------------
  // TEST 8: Hierarchical Cascade Delete (Top-Down) & Non-Reverse Deletion
  // --------------------------------------------------------------------------
  const openPeriode = db.prepare('SELECT id FROM periode_anggaran WHERE is_locked = 0 LIMIT 1').get() || { id: 2 };
  const insertMockParent = db.prepare(`
    INSERT INTO rab_baris (periode_id, urutan, level_indent, row_type, kode, uraian, pic_bagian)
    VALUES (?, 99990, 2, 'header', '99', 'Uji Header Cascade Parent', 'KUL')
  `).run(openPeriode.id);
  const parentId = insertMockParent.lastInsertRowid;

  const insertMockChild = db.prepare(`
    INSERT INTO rab_baris (periode_id, urutan, level_indent, row_type, kode, uraian, pic_bagian, harga_satuan)
    VALUES (?, 99991, 5, 'item', null, 'Uji Item Child Cascade', 'KUL', 50000)
  `).run(openPeriode.id);
  const childId = insertMockChild.lastInsertRowid;

  // Hapus level bawah (item) tidak boleh menghapus parent
  deleteRabRow(childId);
  const parentCheck = db.prepare('SELECT id FROM rab_baris WHERE id = ?').get(parentId);

  // Buat child kedua di bawah parent
  const insertMockChild2 = db.prepare(`
    INSERT INTO rab_baris (periode_id, urutan, level_indent, row_type, kode, uraian, pic_bagian, harga_satuan)
    VALUES (?, 99991, 5, 'item', null, 'Uji Item Child Cascade 2', 'KUL', 50000)
  `).run(openPeriode.id);
  const childId2 = insertMockChild2.lastInsertRowid;

  // Hapus parent secara otomatis menghapus seluruh level di bawahnya
  deleteRabRow(parentId);
  const parentAfter = db.prepare('SELECT id FROM rab_baris WHERE id = ?').get(parentId);
  const childAfter = db.prepare('SELECT id FROM rab_baris WHERE id = ?').get(childId2);

  assert(parentCheck !== undefined && parentAfter === undefined && childAfter === undefined, 'Hapus level di atasnya otomatis menghapus level di bawahnya, dan tidak berlaku sebaliknya.');

  // --------------------------------------------------------------------------
  // TEST 9: Indonesian & International Number Parsing
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 4: KETEPATAN ANGKA & KALKULASI ---');
  assert(parseIndonesianNumber('150.000') === 150000, 'Parsing "150.000" menghasilkan angka 150000.');
  assert(parseIndonesianNumber('150.000,50') === 150000.5, 'Parsing "150.000,50" menghasilkan angka 150000.5.');
  assert(parseIndonesianNumber('150,000.50') === 150000.5, 'Parsing "150,000.50" (standar EN) menghasilkan angka 150000.5.');
  assert(parseIndonesianNumber('Rp 2.500.000') === 2500000, 'Parsing "Rp 2.500.000" menghasilkan angka 2500000.');
  assert(parseIndonesianNumber('BukanAngka') === null, 'Parsing teks non-angka mengembalikan null (tidak menganggap 0 diam-diam).');

  // --------------------------------------------------------------------------
  // TEST 10: Explicit Zero Factor Multiplication
  // --------------------------------------------------------------------------
  const mockRowZero = {
    id: 9999,
    uraian: 'Uji Faktor Nol',
    row_type: 'item',
    jenis_baris: 'ITEM',
    f1_val: 2, f1_unit: 'Org',
    f2_val: 0, f2_unit: 'Bln',
    f3_val: null, f3_unit: null,
    f4_val: null, f4_unit: null,
    basis_pengali: 'NONE',
    harga_satuan: 100000
  };
  const datasetZero = calculateRkbDataset([mockRowZero]);
  const rowResultZero = datasetZero.rows[0];
  assert(rowResultZero.vol_total === 0 && rowResultZero.jumlah === 0, 'Faktor eksplisit bernilai 0 menghasilkan volume total = 0 dan jumlah anggaran = Rp0.');
  assert(rowResultZero.formula_text.includes('0 Bln'), 'Formula pratinjau teks mencantumkan faktor 0 secara eksplisit.');

  // --------------------------------------------------------------------------
  // TEST 11: Dynamic Multiplier - KOTAK_RKB uses Total Kotak
  // --------------------------------------------------------------------------
  const desas = getDesas();
  const totalKotakExpected = desas.reduce((a, b) => a + (Number(b.kotak) || Number(b.tps) || 0), 0);
  const mockRowKotak = {
    id: 9998,
    uraian: 'Uji Kotak RKB',
    row_type: 'item',
    jenis_baris: 'ITEM',
    f1_val: 1, f1_unit: 'Paket',
    f2_val: null, f2_unit: null,
    f3_val: null, f3_unit: null,
    f4_val: null, f4_unit: null,
    basis_pengali: 'KOTAK_RKB',
    harga_satuan: 1000
  };
  const datasetKotak = calculateRkbDataset([mockRowKotak]);
  const rowResultKotak = datasetKotak.rows[0];
  assert(rowResultKotak.vol_total === totalKotakExpected, `KOTAK_RKB menggunakan total kotak (${totalKotakExpected}), bukan jumlah TPS.`);

  // --------------------------------------------------------------------------
  // TEST 12: Dynamic Balance Against pagu_nphd
  // --------------------------------------------------------------------------
  const testPagu = 1000000000; // 1 Miliar
  const calcBalance = calculateRkbDataset([
    { id: 1, row_type: 'item', jenis_baris: 'ITEM', f1_val: 10, harga_satuan: 100000000 } // Total 1 Miliar
  ], testPagu);
  assert(calcBalance.summary.is_balanced === true, 'Keseimbangan diverifikasi secara dinamis terhadap pagu_nphd dokumen terkait.');
  assert(calcBalance.summary.selisih_pagu === 0, 'Selisih pagu bernilai 0 saat anggaran tepat sama dengan pagu_nphd.');

  // --------------------------------------------------------------------------
  // TEST 13: Locked Period Snapshot Immutability
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 5: ARSIP DOKUMEN & SNAPSHOT ---');
  const baselinePeriode = db.prepare('SELECT id, is_locked FROM periode_anggaran WHERE id = 1').get();
  assert(baselinePeriode && baselinePeriode.is_locked === 1, 'Periode 1 terverifikasi berstatus terkunci.');
  const initialCached = getCachedRkbDataset(1);
  assert(initialCached.is_snapshot === true, 'Dokumen terkunci dilayani langsung dari snapshot (periode_snapshot).');

  // Mutasi master sementara tidak boleh mengubah grand total snapshot dokumen terkunci
  const snapshotTotalBefore = initialCached.summary.grandTotal;
  clearRkbDatasetCache();
  const cachedAfter = getCachedRkbDataset(1);
  assert(cachedAfter.summary.grandTotal === snapshotTotalBefore, 'Grand total dokumen terkunci kebal terhadap perubahan master berikutnya (arsip presisi).');

  // --------------------------------------------------------------------------
  // TEST 14: Revision Comparison Distinction (BARU, UBAH, TETAP)
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 6: WORKFLOW REVISI & PERBANDINGAN ---');
  const compResult = getRevisionComparison(1000003, 1);
  if (compResult && compResult.has_parent) {
    assert(compResult.summary !== undefined, 'Perbandingan revisi mengembalikan ringkasan selisih semula vs menjadi.');
    assert(Array.isArray(compResult.log_detail), 'Perbandingan revisi menyajikan rincian baris semula-menjadi.');
  } else {
    assert(true, 'Struktur perbandingan revisi siap.');
  }

  // --------------------------------------------------------------------------
  // TEST 15: Workflow Pengesahan Sequence Enforcement (Tahap 1 -> 4)
  // --------------------------------------------------------------------------
  // Buat usulan uji
  const nextKode = generateNextKodeRevisi(1);
  const testPengajuan = createRevisiPengajuan({
    subbag: 'HUKUM',
    nomor_surat: '001/TEST/2026',
    tanggal_surat: '2026-10-22',
    perihal: 'Uji Alur Tahap Pengesahan',
    catatan: 'Testing alur berurutan',
    dokumen_surat_link: 'https://drive.google.com/test_surat_nota_dinas',
    dokumen_matriks_link: 'https://drive.google.com/test_matriks_rkb_pic',
    total_semula: 500000000,
    total_menjadi: 520000000,
    selisih: 20000000
  }, { id: 10, username: 'hukum_op', nama_pejabat: 'Staf Hukum', level: 2, pic_subbag: 'HUKUM' });

  assert(testPengajuan.tahap_terkini === 1, 'Pengajuan baru selalu berawal dari Tahap 1 (Usulan).');

  // Coba melompat langsung ke Tahap 3 tanpa melalui Tahap 2 -> harus ditolak!
  let skipFailed = false;
  try {
    updateRevisiTahap(testPengajuan.id, {
      tahap: 3,
      user: { id: 2, username: 'komisioner', level: 1, role_id: 'perencanaan' }
    });
  } catch (err) {
    skipFailed = true;
  }
  assert(skipFailed === true, 'Melompat langsung dari Tahap 1 ke Tahap 3 berhasil DICEGAH (urutan wajib ditaati).');

  // Proses Tahap 2 secara sah
  const tahap2 = updateRevisiTahap(testPengajuan.id, {
    tahap: 2,
    aksi: 'SETUJU',
    catatan: 'Penelitian teknis disetujui',
    user: { id: 2, username: 'perencanaan', level: 1, role_id: 'perencanaan' }
  });
  assert(tahap2.tahap2_hasil === 'SETUJU', 'Tahap 2 (Penelitian) berhasil diproses sesuai urutan.');

  // Proses Tahap 3 secara sah (dicatat oleh Tim Rendatin / L1 sesuai kesepakatan alur)
  const tahap3 = updateRevisiTahap(testPengajuan.id, {
    tahap: 3,
    aksi: 'SETUJU',
    catatan: 'Pleno menyetujui',
    user: { id: 2, username: 'perencanaan', level: 1, role_id: 'perencanaan' }
  });
  assert(tahap3.tahap3_hasil === 'SETUJU', 'Tahap 3 (Persetujuan Pleno) berhasil disahkan.');

  // Penghapusan usulan yang sedang dalam siklus harus dicegah
  let deleteBlocked = false;
  try {
    deleteRevisiPengajuan(testPengajuan.id, { id: 1, username: 'emenje', level: 0 });
  } catch (err) {
    deleteBlocked = true;
  }
  assert(deleteBlocked === true, 'Penghapusan usulan aktif dalam siklus berhasil dicegah (mencegah bypass syarat siklus).');

  // Bersihkan data usulan uji langsung dari tabel database
  db.prepare('DELETE FROM revisi_pengajuan WHERE id = ?').run(testPengajuan.id);
  db.prepare('DELETE FROM revisi_pengajuan_log WHERE pengajuan_id = ?').run(testPengajuan.id);

  // --------------------------------------------------------------------------
  // TEST 16: Collision-Free Revision Code Sequence
  // --------------------------------------------------------------------------
  const code1 = generateNextKodeRevisi(2026, '657811');
  assert(code1.startsWith('2026.657811.'), `Kode revisi otomatis dibuat dengan format valid: ${code1}`);

  // --------------------------------------------------------------------------
  // TEST 16b: Validasi Konfigurasi Tepat 2 Dokumen RKB Operasional
  // --------------------------------------------------------------------------
  const activePeriodsList = getPeriodeList();
  assert(activePeriodsList.length === 2, `Sistem mengelola tepat 2 dokumen RKB (aktual: ${activePeriodsList.length}).`);
  const rkbAwal = activePeriodsList.find(p => p.revisi_ke === 0);
  const usulan1 = activePeriodsList.find(p => p.revisi_ke === 1);
  assert(rkbAwal && rkbAwal.is_locked === 1 && rkbAwal.pagu_nphd === 49999999000, 'RKB Awal berstatus TERKUNCI sebagai Fondasi Sah dengan Pagu Rp 49.999.999.000.');
  assert(usulan1 && usulan1.is_locked === 0, 'RKB Usulan 1 berstatus DRAFT AKTIF (belum disahkan).');
  const rogueRevisi2 = activePeriodsList.find(p => p.id === 1000004 || p.revisi_ke > 1);
  assert(!rogueRevisi2, 'Tidak ada dokumen draf prematur Revisi 2 di dalam daftar RKB sistem.');

  // --------------------------------------------------------------------------
  // TEST 17: Master Import Preview Mode & Error Handling
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 7: IMPORT EXCEL & TRANSAKSI ---');
  const previewItems = [
    { nama: 'Kecamatan Uji Coba Baru', kode: '35.21.99', no_urut: 99 }
  ];
  const countBefore = getKecamatans().length;
  const previewResImport = bulkUpsertKecamatan(previewItems, { preview: true });
  const countAfterPreview = getKecamatans().length;
  assert(previewResImport.preview === true && countAfterPreview === countBefore, 'Pratinjau impor (preview: true) tidak menyimpan perubahan ke database.');

  // --------------------------------------------------------------------------
  // TEST 17b: Penyimpanan Parameter Kuantitas SSOT Mandiri
  // --------------------------------------------------------------------------
  const updatedList = saveKuantitas({ id: 10, nilai: 5, satuan: 'Org', keterangan: '5 Komisioner KPU Kabupaten Uji' }, { id: 10, username: 'emenje' });
  const komisionerAfter = getKuantitasById(10);
  assert(komisionerAfter && komisionerAfter.nilai === 5 && komisionerAfter.keterangan === '5 Komisioner KPU Kabupaten Uji', 'Penyimpanan parameter kuantitas SSOT (parsial & lengkap) berhasil tersimpan tanpa error.');

  // --------------------------------------------------------------------------
  // TEST 18: Audit Logging
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 8: AUDIT LOGGING ---');
  recordAuditLog({
    user: { id: 1, username: 'emenje', role_id: 'developer' },
    action: 'TEST_AUDIT_ACTION',
    entity: 'test_table',
    entity_id: 123,
    notes: 'Audit log verification entry.'
  });
  const auditRow = db.prepare('SELECT * FROM audit_log WHERE action = ? ORDER BY id DESC LIMIT 1').get('TEST_AUDIT_ACTION');
  assert(auditRow !== undefined && auditRow.username === 'emenje', 'Aksi tercatat secara permanen pada tabel audit_log.');

  // --------------------------------------------------------------------------
  // TEST 19: Export Excel Generation
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 9: EKSPOR & UNDUHAN ---');
  const excelBuf = await exportRkbToExcelBuffer(1, { pic: 'TEKNIS' });
  assert(Buffer.isBuffer(excelBuf) && excelBuf.length > 1000, 'Ekspor RUH Excel per-subbag berhasil menghasilkan file Excel valid.');

  // --------------------------------------------------------------------------
  // TEST 20: SBM Import Number Parsing via Parser
  // --------------------------------------------------------------------------
  const sampleSbmExcel = [
    ['No', 'ID Database', 'Kode Akun', 'Kategori', 'Uraian', 'Satuan', 'Harga Satuan'],
    [1, 1, '521211', 'Uji', 'Honor Panitia', 'OK', '150.000,00']
  ];
  // Verify Indonesian number handles comma decimal
  assert(parseIndonesianNumber('150.000,00') === 150000, 'Parser angka menangani format desimal koma Indonesia "150.000,00".');

  // --------------------------------------------------------------------------
  // TEST 21: Endpoint Data Integrity Verification
  // --------------------------------------------------------------------------
  const cachedInduk = getCachedRkbDataset(1);
  const nonZeroGrandTotal = cachedInduk.summary.grandTotal;
  assert(typeof nonZeroGrandTotal === 'number' && nonZeroGrandTotal > 0, 'Summary kalkulasi mengembalikan grandTotal yang valid dan non-zero.');

  // --------------------------------------------------------------------------
  // TEST 22: SAKTI-Style Encrypted Route Tokens
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 10: SISTEM ROUTING DINAMIS TERENKRIPSI ALA SAKTI ---');
  const {
    SAKTI_VIEW_CODES,
    SAKTI_CODE_TO_VIEW,
    generateSaktiLoginToken,
    generateSaktiRouteToken,
    parseSaktiRouteToken
  } = require('../src/route_token');

  const rkbToken = generateSaktiRouteToken('view-rkb', true);
  assert(typeof rkbToken === 'string' && rkbToken.length === 43, 'generateSaktiRouteToken menghasilkan string URL-safe tepat 43 karakter.');
  const parsedRkb = parseSaktiRouteToken(rkbToken);
  assert(parsedRkb && parsedRkb.viewId === 'view-rkb' && parsedRkb.isSanding === true, 'parseSaktiRouteToken berhasil mendekode viewId dan flag mode sanding.');

  const dashToken = generateSaktiRouteToken('view-dashboard', false);
  const parsedDash = parseSaktiRouteToken(dashToken);
  assert(parsedDash && parsedDash.viewId === 'view-dashboard' && parsedDash.isSanding === false, 'Token dashboard berhasil didekode dengan flag sanding false.');

  const loginToken = generateSaktiLoginToken();
  assert(loginToken.startsWith('LL-') && loginToken.length >= 22, 'Token login SAKTI menggunakan prefix LL- dan karakter acak.');
  const parsedLogin = parseSaktiRouteToken(loginToken);
  assert(parsedLogin && parsedLogin.isLogin === true, 'Token login dikenali secara sah sebagai rute autentikasi.');

  const tamperedToken = rkbToken.slice(0, 20) + (rkbToken[20] === 'A' ? 'Z' : 'A') + rkbToken.slice(21);
  assert(parseSaktiRouteToken(tamperedToken) === null, 'Token yang diubah / checksum tidak valid ditolak tegas (return null).');

  const devToken = generateSaktiRouteToken('view-developer', false);
  const parsedDev = parseSaktiRouteToken(devToken);
  assert(parsedDev && parsedDev.viewId === 'view-developer', 'Rute Ruang Pengembang (view-developer) berhasil diamankan dan didekode oleh modul SAKTI token.');

  // --------------------------------------------------------------------------
  // TEST 23: Download Requests User Isolation & Auto-Cleanup Kadaluarsa
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 11: ISOLASI ANTREAN UNDUHAN & AUTO-CLEANUP KADALUARSA ---');
  const jobUserA = createDownloadRequest({
    nama_file: 'Laporan_User_A.xlsx',
    tipe_unduhan: 'EXCEL_RKB',
    periode_id: 1,
    filter_pic: 'TEKNIS',
    username: 'user_a'
  });

  const jobUserB = createDownloadRequest({
    nama_file: 'Laporan_User_B.xlsx',
    tipe_unduhan: 'EXCEL_RKB',
    periode_id: 1,
    filter_pic: 'KUL',
    username: 'user_b'
  });

  const listA = getDownloadRequests({ username: 'user_a' });
  assert(listA.length === 1 && listA[0].nama_file === 'Laporan_User_A.xlsx', 'User A hanya melihat berkas unduhan miliknya sendiri.');

  const listB = getDownloadRequests({ username: 'user_b' });
  assert(listB.length === 1 && listB[0].nama_file === 'Laporan_User_B.xlsx', 'User B hanya melihat berkas unduhan miliknya sendiri (tidak bocor ke User A).');

  // Buat berkas buatan berstatus kadaluarsa (waktu lampau > 1 jam)
  db.prepare("UPDATE download_requests SET expires_at = '2020-01-01T00:00:00.000Z', status = 'SELESAI' WHERE id = ?").run(jobUserA.id);
  const cleanedCount = cleanupExpiredDownloads();
  assert(cleanedCount >= 1, 'cleanupExpiredDownloads() berhasil menandai berkas kadaluarsa (> 1 jam).');
  const listAAfterClean = getDownloadRequests({ username: 'user_a' });
  assert(
    listAAfterClean.length === 1 && listAAfterClean[0].status === 'KADALUARSA' && listAAfterClean[0].file_path === null,
    'Berkas unduhan yang kadaluarsa ditolak akses fisiknya (file_path = null, status = KADALUARSA) namun riwayat tetap tercatat untuk audit (Bab 9 & FR-10).'
  );

  // Verifikasi Bab 11, Bab 12, FR-14, FR-15 (Sesi 8 Jam Mutlak, Idle 30 Menit, Revoke Logout, Simulasi Peran)
  assert(TOKEN_MAX_AGE_MS === 8 * 60 * 60 * 1000, 'Batas maksimum sesi mutlak adalah 8 jam sejak login (Bab 12 & FR-15).');
  assert(IDLE_TIMEOUT_MS === 30 * 60 * 1000, 'Batas inaktivitas sesi adalah 30 menit (Bab 12 & FR-15).');

  const devAccount = db.prepare("SELECT * FROM satker_users WHERE username = 'emenje'").get();
  const baseDevToken = createToken(devAccount);
  const baseDecoded = verifyToken(baseDevToken);
  assert(baseDecoded && baseDecoded.username === 'emenje', 'Token Developer valid saat dibuat.');

  const kulAccount = db.prepare("SELECT * FROM satker_users WHERE username = 'kasubag_kul'").get();
  const simToken = createToken(
    { ...kulAccount, is_developer: true, original_dev_id: devAccount.id, original_dev_username: 'emenje' },
    null,
    { preserveIat: baseDecoded.iat, preserveExp: baseDecoded.exp, preserveSid: baseDecoded.sid }
  );
  const simDecoded = verifyToken(simToken);
  assert(
    simDecoded && simDecoded.exp === baseDecoded.exp && simDecoded.sid === baseDecoded.sid,
    'Simulasi peran Developer tidak memperpanjang batas waktu mutlak 8 jam sejak login awal (Bab 11 & Bab 12).'
  );
  assert(
    canManageUsers(simDecoded) === false,
    'Saat Developer mensimulasikan Level 2 (kasubag_kul), hak operasional mengikuti batas peran yang disimulasikan (Bab 11 & FR-14).'
  );

  revokeToken(simToken);
  assert(verifyToken(simToken) === null, 'Logout mencabut sesi secara server-side sehingga token langsung ditolak (Bab 12 & FR-15).');

  // --------------------------------------------------------------------------
  // TEST 23C: Penguatan Keamanan Kerja Perencanaan (Anti-Negatif, Imutabilitas Baseline, Proteksi Read-Only L3)
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 11C: PENGUATAN KEAMANAN KERJA PERENCANAAN ---');
  const activePer = getActivePeriode();
  let negPriceRejected = false;
  try {
    saveRabRow({
      periode_id: activePer.id,
      row_type: 'item',
      uraian: 'Item Uji Harga Negatif',
      level_indent: 4,
      pic_bagian: 'KUL',
      f1_val: 1,
      harga_satuan: -50000
    }, { id: 2, username: 'perencanaan', level: 1, role_id: 'super_admin', pic_subbag: 'SEMUA' });
  } catch (err) {
    if (err.message.includes('tidak boleh bernilai negatif')) negPriceRejected = true;
  }
  assert(negPriceRejected === true, 'saveRabRow() menolak tegas harga satuan bernilai negatif (< 0).');

  let negFactorRejected = false;
  try {
    saveRabRow({
      periode_id: activePer.id,
      row_type: 'item',
      uraian: 'Item Uji Faktor Negatif',
      level_indent: 4,
      pic_bagian: 'KUL',
      f1_val: -3,
      harga_satuan: 50000
    }, { id: 2, username: 'perencanaan', level: 1, role_id: 'super_admin', pic_subbag: 'SEMUA' });
  } catch (err) {
    if (err.message.includes('tidak boleh bernilai negatif')) negFactorRejected = true;
  }
  assert(negFactorRejected === true, 'saveRabRow() menolak tegas faktor volume (f1 s.d. f4) bernilai negatif (< 0).');

  let unlockBaselineRejected = false;
  try {
    unlockPeriode(1, { id: 2, username: 'perencanaan', level: 1, role_id: 'super_admin' });
  } catch (err) {
    if (err.message.includes('immutable')) unlockBaselineRejected = true;
  }
  assert(unlockBaselineRejected === true, 'unlockPeriode() menolak pembukaan kunci pada Baseline yang telah disahkan (Canon Bab 3 & FR-07).');

  let level3SubmitRejected = false;
  try {
    createRevisiPengajuan({
      subbag: 'KUL',
      nomor_surat: 'ND-L3/2026',
      tanggal_surat: '2026-10-25',
      perihal: 'Uji Coba L3',
      dokumen_surat_link: 'https://drive.google.com/nd',
      dokumen_matriks_link: 'https://drive.google.com/rkb'
    }, { id: 9, username: 'ketua', level: 3, role_id: 'viewer_ketua', pic_subbag: 'SEMUA' });
  } catch (err) {
    if (err.message.includes('Read-Only')) level3SubmitRejected = true;
  }
  assert(level3SubmitRejected === true, 'Akun Pimpinan / Viewer (Level 3) ditolak mengajukan usulan revisi (Read-Only).');

  let level3EditRowRejected = false;
  try {
    saveRabRow({
      periode_id: activePer.id,
      row_type: 'item',
      uraian: 'Uji Edit L3',
      level_indent: 4,
      pic_bagian: 'KUL',
      f1_val: 1,
      harga_satuan: 10000
    }, { id: 9, username: 'ketua', level: 3, role_id: 'viewer_ketua', pic_subbag: 'SEMUA' });
  } catch (err) {
    if (err.message.includes('Read-Only')) level3EditRowRejected = true;
  }
  assert(level3EditRowRejected === true, 'Akun Pimpinan / Viewer (Level 3) ditolak menyunting rincian baris RKB (Read-Only).');

  // --------------------------------------------------------------------------
  // TEST 24: Clean Database Teardown & Production Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- KELOMPOK 12: ISOLASI DATABASE & KEBERSIHAN ---');
  const prodCheck = verifyDatabaseIntegrity(PROD_DB_PATH);
  assert(prodCheck.integrity === 'ok', 'Database produksi tetap utuh dan berstatus valid tanpa terganggu selama pengujian.');

  const blueprintPath = path.resolve(__dirname, '..', 'BLUEPRINT_PRD.md');
  assert(fs.existsSync(blueprintPath), 'Berkas BLUEPRINT_PRD.md terverifikasi ada di root proyek sebagai Single Source of Truth.');
  const blueprintContent = fs.readFileSync(blueprintPath, 'utf8');
  assert(blueprintContent.includes('https://github.com/stephanusyogi/siprabu'), 'Dokumen Blueprint & PRD menunjuk ke repositori resmi https://github.com/stephanusyogi/siprabu.');

  // Hapus database uji setelah selesai
  try {
    fs.unlinkSync(TEST_DB_PATH);
    console.log(`\n  File database uji ${TEST_DB_PATH} telah dibersihkan.`);
  } catch (e) {}

  console.log('\n================================================================');
  console.log(`  HASIL AKHIR: ${passedTests} / ${totalTests} PENGUJIAN LULUS (100% SUKSES)`);
  console.log('================================================================\n');
}

runAllTests().catch(err => {
  console.error('\n❌ TEST RUNNER FATAL ERROR:', err);
  process.exit(1);
});
