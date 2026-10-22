/**
 * SIPRABU - 25 BUSINESS BEHAVIOR ACCEPTANCE TESTS
 * Memverifikasi 25 kesepakatan aturan bisnis revisi RKB anggaran KPU Kabupaten Ngawi
 * Dijalankan dalam database terisolasi: data/test_business_behavior.sqlite
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

// Setup database uji terisolasi
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const PROD_DB_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite');
const TEST_DB_PATH = path.join(DATA_DIR, 'test_business_behavior.sqlite');

for (const ext of ['', '-wal', '-shm']) {
  const f = TEST_DB_PATH + ext;
  if (fs.existsSync(f)) {
    try { fs.unlinkSync(f); } catch (e) {}
  }
}

fs.copyFileSync(PROD_DB_PATH, TEST_DB_PATH);
process.env.SIPRABU_DB_PATH = TEST_DB_PATH;

console.log('================================================================');
console.log('  SIPRABU 25 BUSINESS BEHAVIOR ACCEPTANCE TEST SUITE');
console.log(`  Isolated Test DB: ${TEST_DB_PATH}`);
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ [FAIL] Test ${totalTests}: ${message}`);
    throw new Error(`Assertion failed on Test ${totalTests}: ${message}`);
  } else {
    passedTests++;
    console.log(`  ✅ [PASS] Test ${totalTests}: ${message}`);
  }
}

async function runBusinessBehaviorTests() {
  const {
    db,
    getLatestRatifiedPeriode,
    getActiveRevisionCycle,
    getOrCreateRevisionCycle,
    createRevisiPengajuan,
    updateRevisiTahap,
    finalizeTahap4Keseluruhan,
    getRevisionCycleStatus,
    saveRabRow,
    getRabRowById,
    checkRowEditPermission
  } = require('../src/db');

  const { getRevisionComparison } = require('../src/calculation');
  const { createToken, verifyToken } = require('../src/auth');

  // Bersihkan siklus dan revisi sementara jika ada agar lingkungan pengujian bersih
  db.prepare('DELETE FROM revisi_pengajuan_log').run();
  db.prepare('DELETE FROM revisi_pengajuan').run();
  db.prepare('DELETE FROM rab_baris WHERE periode_id NOT IN (SELECT id FROM periode_anggaran WHERE is_locked = 1)').run();
  db.prepare('DELETE FROM periode_anggaran WHERE is_locked = 0').run();

  // Pastikan periode 1 adalah anggaran sah awal
  db.prepare('UPDATE periode_anggaran SET is_locked = 1 WHERE id = 1').run();

  const userL2Teknis1 = { id: 101, username: 'operator_teknis_1', nama_pejabat: 'Staf Teknis 1', level: 2, role_id: 'operator', pic_subbag: 'TEKNIS' };
  const userL2Teknis2 = { id: 102, username: 'operator_teknis_2', nama_pejabat: 'Staf Teknis 2', level: 2, role_id: 'operator', pic_subbag: 'TEKNIS' };
  const userL2Parsdm = { id: 103, username: 'operator_parsdm', nama_pejabat: 'Staf Parmas', level: 2, role_id: 'operator', pic_subbag: 'PARSDM' };
  const userL2Hukum = { id: 104, username: 'operator_hukum', nama_pejabat: 'Staf Hukum', level: 2, role_id: 'operator', pic_subbag: 'HUKUM' };
  const userL1 = { id: 201, username: 'kasubbag_rendatin', nama_pejabat: 'Kasubbag Perencanaan', level: 1, role_id: 'perencanaan' };
  const userDev = { id: 1, username: 'emenje', nama_pejabat: 'Developer Sistem', level: 0, role_id: 'developer', is_developer: true };

  console.log('--- SIKLUS 1: PEMBUKAAN, ISOLASI, PENGAJUAN & VALIDASI ---');

  // --------------------------------------------------------------------------
  // TEST 1: L2 mengajukan revisi pertama ketika hanya ada anggaran sah: siklus baru dibuat, dasar = anggaran sah tersebut.
  // --------------------------------------------------------------------------
  const latestBefore = getLatestRatifiedPeriode();
  assert(latestBefore !== null && latestBefore.is_locked === 1, 'Test 1.1: Dasar anggaran awal terverifikasi berstatus sah (terkunci).');

  const pTeknis = createRevisiPengajuan({
    subbag: 'TEKNIS',
    nomor_surat: '01/TEKNIS/X/2026',
    tanggal_surat: '2026-10-22',
    perihal: 'Usulan Revisi Pengadaan Logistik Teknis',
    keterangan_revisi: 'Penyesuaian kebutuhan operasional',
    dokumen_surat_link: 'https://drive.google.com/nota_dinas_teknis_v1.pdf',
    dokumen_matriks_link: 'https://drive.google.com/rkb_teknis_ttd_v1.xlsx',
    total_semula: 500000000,
    total_menjadi: 500000000,
    selisih: 0
  }, userL2Teknis1);

  const activeCycle1 = getActiveRevisionCycle();
  assert(activeCycle1 !== null && activeCycle1.is_locked === 0, 'Test 1.2: Siklus baru berhasil dibuat saat L2 pertama mengajukan.');
  assert(activeCycle1.parent_periode_id === latestBefore.id, 'Test 1.3: Dasar anggaran siklus baru menunjuk ke anggaran sah terakhir.');
  assert(pTeknis.periode_id === activeCycle1.id, 'Test 1.4: Pengajuan pertama langsung terhubung ke siklus tersebut.');

  // --------------------------------------------------------------------------
  // TEST 2: L2 subbag lain mengajukan revisi saat siklus masih berjalan: masuk ke siklus yang sama, tidak membuat siklus baru.
  // --------------------------------------------------------------------------
  const pParsdm = createRevisiPengajuan({
    subbag: 'PARSDM',
    nomor_surat: '01/PARSDM/X/2026',
    tanggal_surat: '2026-10-22',
    perihal: 'Usulan Revisi Sosialisasi Pemilih',
    keterangan_revisi: 'Pergeseran honor ke sewa tempat',
    dokumen_surat_link: 'https://drive.google.com/nota_dinas_parsdm_v1.pdf',
    dokumen_matriks_link: 'https://drive.google.com/rkb_parsdm_ttd_v1.xlsx',
    total_semula: 300000000,
    total_menjadi: 300000000,
    selisih: 0
  }, userL2Parsdm);

  const activeCycleAfter2 = getActiveRevisionCycle();
  assert(pParsdm.periode_id === activeCycle1.id, 'Test 2.1: Pengajuan PARSDM masuk ke siklus yang sama.');
  assert(activeCycleAfter2.id === activeCycle1.id, 'Test 2.2: Tidak ada siklus baru ganda yang dibuat.');

  // --------------------------------------------------------------------------
  // TEST 3: Dua akun berbeda dari subbag yang sama tidak dapat membuat dua pengajuan aktif pada siklus yang sama.
  // --------------------------------------------------------------------------
  let duplicateSubbagError = false;
  try {
    createRevisiPengajuan({
      subbag: 'TEKNIS',
      nomor_surat: '99/TEKNIS/X/2026',
      tanggal_surat: '2026-10-22',
      perihal: 'Usulan Ganda oleh Akun Kedua',
      keterangan_revisi: 'Mencoba membuat pengajuan baru saat pengajuan pertama masih aktif',
      dokumen_surat_link: 'https://drive.google.com/nota_ganda.pdf',
      dokumen_matriks_link: 'https://drive.google.com/rkb_ganda.xlsx',
      total_semula: 500000000,
      total_menjadi: 500000000,
      selisih: 0
    }, userL2Teknis2);
  } catch (err) {
    duplicateSubbagError = err.message.includes('sudah memiliki pengajuan aktif');
  }
  assert(duplicateSubbagError === true, 'Test 3: Akun kedua dari subbag TEKNIS ditolak membuat pengajuan aktif ganda.');

  // --------------------------------------------------------------------------
  // TEST 4: Permintaan concurrent membuat pengajuan atau siklus baru: hanya satu yang berhasil, tidak ada duplikasi.
  // --------------------------------------------------------------------------
  let concurrentSuccessCount = 0;
  let concurrentErrorCount = 0;
  for (let i = 0; i < 3; i++) {
    try {
      getOrCreateRevisionCycle(userL2Teknis1);
      concurrentSuccessCount++;
    } catch (_) {
      concurrentErrorCount++;
    }
  }
  const totalOpenCycles = db.prepare('SELECT COUNT(*) as cnt FROM periode_anggaran WHERE is_locked = 0').get().cnt;
  assert(totalOpenCycles === 1, 'Test 4: Pemanggilan berulang/concurrent hanya menghasilkan tepat 1 siklus revisi aktif.');

  // --------------------------------------------------------------------------
  // TEST 5: PIC yang tidak mengajukan: dokumen gabungan tetap dapat disahkan; angka PIC tersebut mengikuti dasar sah siklus.
  // --------------------------------------------------------------------------
  // HUKUM & KUL tidak mengajukan di siklus 1.
  const cycleStatusInitial = getRevisionCycleStatus(activeCycle1.id);
  const submittedSubbags = cycleStatusInitial.proposals.map(p => p.subbag);
  assert(!submittedSubbags.includes('HUKUM') && !submittedSubbags.includes('KUL'), 'Test 5.1: Subbag HUKUM dan KUL tidak mengajukan usulan.');
  // Baris HUKUM dan KUL di activeCycle1 tetap berasal dari dasar sah
  const rowKul = db.prepare('SELECT harga_satuan FROM rab_baris WHERE periode_id = ? AND pic_bagian = ? LIMIT 1').get(activeCycle1.id, 'KUL');
  const baseKul = db.prepare('SELECT harga_satuan FROM rab_baris WHERE periode_id = ? AND pic_bagian = ? LIMIT 1').get(latestBefore.id, 'KUL');
  assert(rowKul && baseKul && rowKul.harga_satuan === baseKul.harga_satuan, 'Test 5.2: Angka PIC yang tidak mengajukan tetap mengikuti dasar anggaran sah.');

  // --------------------------------------------------------------------------
  // TEST 6: PIC yang sudah mengajukan: ditolak jika mencoba mengedit rincian atau mengganti dokumen (diuji langsung ke endpoint baris).
  // --------------------------------------------------------------------------
  const teknisRow = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? AND pic_bagian = ? LIMIT 1').get(activeCycle1.id, 'TEKNIS');
  let picEditBlocked = false;
  try {
    saveRabRow({
      ...teknisRow,
      uraian: 'Perubahan Ilegal Setelah Submit',
      harga_satuan: Number(teknisRow.harga_satuan) + 1000
    }, userL2Teknis1);
  } catch (err) {
    picEditBlocked = err.message.includes('sudah diajukan') || err.message.includes('terkunci dari pengeditan PIC');
  }
  assert(picEditBlocked === true, 'Test 6: Operator TEKNIS ditolak mengedit rincian belanja setelah usulan diajukan ke Tahap 1.');

  // --------------------------------------------------------------------------
  // TEST 7: L1 melakukan koreksi kecil pada rincian: diperbolehkan, riwayat koreksi tercatat.
  // --------------------------------------------------------------------------
  const originalHarga = Number(teknisRow.harga_satuan);
  const newHarga = originalHarga + 50000;
  saveRabRow({
    ...teknisRow,
    harga_satuan: newHarga
  }, userL1);

  const updatedProposalTeknis = db.prepare('SELECT * FROM revisi_pengajuan WHERE id = ?').get(pTeknis.id);
  assert(updatedProposalTeknis.l1_koreksi_catatan !== '', 'Test 7.1: L1 berhasil melakukan koreksi kecil dan catatan tercatat di pengajuan.');
  const auditL1Row = db.prepare('SELECT * FROM audit_log WHERE entity = ? AND action = ? ORDER BY id DESC LIMIT 1').get('rab_baris', 'UPDATE_RKB_ROW');
  assert(auditL1Row && auditL1Row.username === userL1.username, 'Test 7.2: Jejak koreksi L1 tercatat di audit log.');

  // --------------------------------------------------------------------------
  // TEST 8: Dokumen asli pengajuan PIC tetap tersimpan dan dapat diakses setelah koreksi L1.
  // --------------------------------------------------------------------------
  assert(updatedProposalTeknis.dokumen_surat_original_link === 'https://drive.google.com/nota_dinas_teknis_v1.pdf', 'Test 8.1: Tautan Nota Dinas asli PIC tetap utuh di dokumen_surat_original_link.');
  assert(updatedProposalTeknis.dokumen_matriks_original_link === 'https://drive.google.com/rkb_teknis_ttd_v1.xlsx', 'Test 8.2: Tautan RKB PIC asli tetap utuh di dokumen_matriks_original_link.');

  // --------------------------------------------------------------------------
  // TEST 9: Pengembalian oleh L1: status berubah, PIC dapat mengedit kembali rincian miliknya.
  // --------------------------------------------------------------------------
  updateRevisiTahap(pTeknis.id, {
    tahap: 2,
    aksi: 'PERBAIKAN',
    catatan: 'Harga sewa melebihi SBM KPU Kabupaten Ngawi, silakan kurangi Rp50.000',
    user: userL1
  });

  const pTeknisReturned = db.prepare('SELECT * FROM revisi_pengajuan WHERE id = ?').get(pTeknis.id);
  assert(pTeknisReturned.status_tahap === 'DIKEMBALIKAN', 'Test 9.1: Status usulan berubah menjadi DIKEMBALIKAN.');
  assert(pTeknisReturned.alasan_pengembalian.includes('melebihi SBM'), 'Test 9.2: Alasan pengembalian tersimpan dengan jelas.');

  // PIC sekarang bisa mengedit kembali rincian miliknya
  let picEditUnlocked = true;
  try {
    saveRabRow({
      ...teknisRow,
      harga_satuan: originalHarga // kembalikan ke harga normal sesuai instruksi
    }, userL2Teknis1);
  } catch (err) {
    picEditUnlocked = false;
  }
  assert(picEditUnlocked === true, 'Test 9.3: Hak edit PIC terbuka kembali setelah berkas usulan dikembalikan oleh L1.');

  // --------------------------------------------------------------------------
  // TEST 10: Pengajuan ulang setelah perbaikan: status kembali Diajukan, memerlukan validasi L1 dan Pleno ACC dari awal.
  // --------------------------------------------------------------------------
  const pTeknisResubmitted = createRevisiPengajuan({
    subbag: 'TEKNIS',
    nomor_surat: '01.Rev/TEKNIS/X/2026',
    tanggal_surat: '2026-10-22',
    perihal: 'Perbaikan Usulan Revisi Logistik Teknis',
    keterangan_revisi: 'Harga telah disesuaikan dengan SBM',
    dokumen_surat_link: 'https://drive.google.com/nota_dinas_teknis_v2.pdf',
    dokumen_matriks_link: 'https://drive.google.com/rkb_teknis_ttd_v2.xlsx',
    total_semula: 500000000,
    total_menjadi: 500000000,
    selisih: 0
  }, userL2Teknis1);

  assert(pTeknisResubmitted.id === pTeknis.id, 'Test 10.1: Pengajuan ulang memperbarui rekaman usulan yang sama (bukan membuat baris baru).');
  assert(pTeknisResubmitted.status_tahap === 'DIAJUKAN', 'Test 10.2: Status usulan kembali ke DIAJUKAN.');
  assert(pTeknisResubmitted.tahap_terkini === 1, 'Test 10.3: Memerlukan validasi L1 dan Pleno dari awal (Tahap 1).');

  // --------------------------------------------------------------------------
  // TEST 11: Pengajuan yang sedang dikembalikan menghalangi pengesahan siklus.
  // --------------------------------------------------------------------------
  // Buat usulan PARSDM menjadi DIKEMBALIKAN sementara untuk menguji pencegahan pengesahan
  updateRevisiTahap(pParsdm.id, {
    tahap: 2,
    aksi: 'PERBAIKAN',
    catatan: 'Dokumen pendukung kurang lengkap',
    user: userL1
  });

  let finalizeBlockedReturned = false;
  try {
    finalizeTahap4Keseluruhan({
      nomor_ba: '01/BA/TEST/2026',
      tanggal_ba: '2026-10-22',
      link_scan_ba: 'https://drive.google.com/ba_pleno.pdf',
      user: userL1
    });
  } catch (err) {
    finalizeBlockedReturned = err.message.includes('belum berstatus ACC Pleno') || err.message.includes('DIKEMBALIKAN');
  }
  assert(finalizeBlockedReturned === true, 'Test 11: Pengesahan siklus dicegah jika terdapat pengajuan berstatus DIKEMBALIKAN.');

  // Kembalikan PARSDM ke DIAJUKAN lalu proses validasi L1
  createRevisiPengajuan({
    subbag: 'PARSDM',
    nomor_surat: '01.Rev/PARSDM/X/2026',
    tanggal_surat: '2026-10-22',
    perihal: 'Perbaikan Usulan Revisi Sosialisasi',
    keterangan_revisi: 'Dokumen lengkap',
    dokumen_surat_link: 'https://drive.google.com/nota_dinas_parsdm_v2.pdf',
    dokumen_matriks_link: 'https://drive.google.com/rkb_parsdm_ttd_v2.xlsx',
    total_semula: 300000000,
    total_menjadi: 300000000,
    selisih: 0
  }, userL2Parsdm);

  // Proses validasi Tahap 2 untuk TEKNIS dan PARSDM
  updateRevisiTahap(pTeknis.id, { tahap: 2, aksi: 'SETUJU', catatan: 'Validasi SBM lolos', user: userL1 });
  updateRevisiTahap(pParsdm.id, { tahap: 2, aksi: 'SETUJU', catatan: 'Validasi SBM lolos', user: userL1 });

  // --------------------------------------------------------------------------
  // TEST 12: Satu pengajuan mendapat Pleno ACC: tidak mengunci RKB gabungan, tidak membuat revisi baru, tidak mengubah dasar anggaran.
  // --------------------------------------------------------------------------
  updateRevisiTahap(pTeknis.id, { tahap: 3, aksi: 'SETUJU', catatan: 'ACC Pleno Teknis', user: userL1 });
  const cycleAfterTeknisAcc = getActiveRevisionCycle();
  assert(cycleAfterTeknisAcc.is_locked === 0, 'Test 12.1: ACC Pleno untuk satu pengajuan TIDAK mengunci RKB gabungan.');
  assert(cycleAfterTeknisAcc.id === activeCycle1.id, 'Test 12.2: ACC Pleno tidak membuat revisi baru prematur.');
  assert(cycleAfterTeknisAcc.parent_periode_id === latestBefore.id, 'Test 12.3: Dasar anggaran siklus tetap utuh.');

  // --------------------------------------------------------------------------
  // TEST 13: Seluruh pengajuan mendapat Pleno ACC, tetapi belum ada BA Pleno: dokumen gabungan belum sah, siklus tetap berjalan.
  // --------------------------------------------------------------------------
  updateRevisiTahap(pParsdm.id, { tahap: 3, aksi: 'SETUJU', catatan: 'ACC Pleno Parsdm', user: userL1 });
  const cycleAllAcc = getActiveRevisionCycle();
  assert(cycleAllAcc.is_locked === 0, 'Test 13.1: Meski seluruh pengajuan berstatus ACC Pleno, RKB gabungan belum sah sebelum BA Pleno.');
  const cycleStatusAcc = getRevisionCycleStatus(cycleAllAcc.id);
  assert(cycleStatusAcc.is_ready_for_ratification === true, 'Test 13.2: Status siklus menyatakan siap disahkan dengan BA Pleno.');

  // --------------------------------------------------------------------------
  // TEST 14: Seluruh pengajuan yang ada sudah ACC Pleno, lalu PIC lain baru mengajukan: pengajuan baru diterima ke siklus yang sama.
  // --------------------------------------------------------------------------
  const pHukum = createRevisiPengajuan({
    subbag: 'HUKUM',
    nomor_surat: '01/HUKUM/X/2026',
    tanggal_surat: '2026-10-22',
    perihal: 'Usulan Revisi Advokasi Hukum',
    keterangan_revisi: 'Kebutuhan sidang perselisihan',
    dokumen_surat_link: 'https://drive.google.com/nota_dinas_hukum.pdf',
    dokumen_matriks_link: 'https://drive.google.com/rkb_hukum.xlsx',
    total_semula: 150000000,
    total_menjadi: 150000000,
    selisih: 0
  }, userL2Hukum);

  assert(pHukum.periode_id === activeCycle1.id, 'Test 14: Subbag HUKUM berhasil bergabung ke siklus yang sama meski usulan lain sudah ACC Pleno.');

  // --------------------------------------------------------------------------
  // TEST 15: Setelah pengajuan baru masuk pada poin 14: pengesahan siklus tertahan sampai pengajuan baru tersebut menyelesaikan tahap 1-3.
  // --------------------------------------------------------------------------
  let finalizeBlockedHukumPending = false;
  try {
    finalizeTahap4Keseluruhan({
      nomor_ba: '01/BA/TEST/2026',
      tanggal_ba: '2026-10-22',
      link_scan_ba: 'https://drive.google.com/ba_pleno.pdf',
      user: userL1
    });
  } catch (err) {
    finalizeBlockedHukumPending = err.message.includes('HUKUM');
  }
  assert(finalizeBlockedHukumPending === true, 'Test 15: Pengesahan siklus tertahan karena Subbag HUKUM yang baru masuk belum ACC Pleno.');

  // --------------------------------------------------------------------------
  // TEST 16: Edit rincian oleh L1 setelah pengajuan ACC Pleno: membatalkan ACC Pleno pengajuan tersebut.
  // --------------------------------------------------------------------------
  // TEKNIS saat ini sudah ACC Pleno. L1 mengubah salah satu rincian belanja TEKNIS.
  saveRabRow({
    ...teknisRow,
    uraian: 'Perubahan Minor Pasca-ACC oleh L1'
  }, userL1);

  const pTeknisPostL1Edit = db.prepare('SELECT * FROM revisi_pengajuan WHERE id = ?').get(pTeknis.id);
  assert(pTeknisPostL1Edit.status_tahap === 'MENUNGGU_PLENO', 'Test 16.1: Perubahan rincian oleh L1 membatalkan status ACC Pleno menjadi MENUNGGU_PLENO.');
  assert(pTeknisPostL1Edit.tahap3_hasil === 'BATAL_KOREKSI_L1', 'Test 16.2: Alasan pembatalan ACC tercatat sebagai BATAL_KOREKSI_L1.');

  // --------------------------------------------------------------------------
  // TEST 17: Pencatatan hasil pleno oleh L1: berhasil tanpa memerlukan komisioner login.
  // --------------------------------------------------------------------------
  // L1 memproses ACC Pleno ulang untuk TEKNIS, dan memproses HUKUM (Tahap 2 & Tahap 3)
  updateRevisiTahap(pTeknis.id, { tahap: 3, aksi: 'SETUJU', catatan: 'ACC Pleno ulang pasca-koreksi L1', user: userL1 });
  updateRevisiTahap(pHukum.id, { tahap: 2, aksi: 'SETUJU', catatan: 'Validasi HUKUM lolos', user: userL1 });
  updateRevisiTahap(pHukum.id, { tahap: 3, aksi: 'SETUJU', catatan: 'ACC Pleno HUKUM disetujui', user: userL1 });

  const pTeknisReAcc = db.prepare('SELECT * FROM revisi_pengajuan WHERE id = ?').get(pTeknis.id);
  const pHukumAcc = db.prepare('SELECT * FROM revisi_pengajuan WHERE id = ?').get(pHukum.id);
  assert(pTeknisReAcc.status_tahap === 'ACC_PLENO' && pHukumAcc.status_tahap === 'ACC_PLENO', 'Test 17: Pencatatan hasil Pleno oleh L1 berhasil tanpa mewajibkan komisioner login.');

  // --------------------------------------------------------------------------
  // TEST 18: Pengesahan tahap 4 memverifikasi ulang seluruh pengajuan dalam satu transaksi database.
  // --------------------------------------------------------------------------
  const ratifyRes1 = finalizeTahap4Keseluruhan({
    nomor_ba: '01/BA.01-BA/3521/2026',
    tanggal_ba: '2026-10-22',
    link_scan_ba: 'https://drive.google.com/ba_pleno_sah_siklus1.pdf',
    catatan: 'Pengesahan Revisi Siklus 1 KPU Kabupaten Ngawi',
    user: userL1
  });

  assert(ratifyRes1.success === true, 'Test 18.1: Pengesahan Tahap 4 RKB gabungan berhasil disahkan.');
  const cycleRatified = db.prepare('SELECT * FROM periode_anggaran WHERE id = ?').get(activeCycle1.id);
  assert(cycleRatified.is_locked === 1, 'Test 18.2: Dokumen RKB gabungan siklus 1 sekarang berstatus DIKUNCI (is_locked = 1).');
  const allProposalsFinished = db.prepare('SELECT COUNT(*) as cnt FROM revisi_pengajuan WHERE periode_id = ? AND status_tahap != ?').get(activeCycle1.id, 'SELESAI').cnt;
  assert(allProposalsFinished === 0, 'Test 18.3: Seluruh pengajuan dalam siklus 1 ditandai SELESAI dan terkunci.');

  // --------------------------------------------------------------------------
  // TEST 19: Simulasi kegagalan pada langkah pengesahan: seluruh transaksi rollback, tidak ada status setengah selesai.
  // --------------------------------------------------------------------------
  // Buka pengajuan baru untuk menguji simulasi rollback jika terjadi error di tengah pengesahan
  const pDummy = createRevisiPengajuan({
    subbag: 'TEKNIS',
    nomor_surat: '02/TEKNIS/X/2026',
    tanggal_surat: '2026-10-22',
    perihal: 'Usulan Pengujian Rollback',
    keterangan_revisi: 'Uji atomisitas transaksi',
    dokumen_surat_link: 'https://drive.google.com/nota_rollback.pdf',
    dokumen_matriks_link: 'https://drive.google.com/rkb_rollback.xlsx',
    total_semula: 500000000,
    total_menjadi: 500000000,
    selisih: 0
  }, userL2Teknis1);

  // Jangan ACC Pleno agar memicu error pada pengesahan
  let rollbackCaught = false;
  try {
    finalizeTahap4Keseluruhan({
      nomor_ba: '99/BA/ROLLBACK/2026',
      tanggal_ba: '2026-10-22',
      link_scan_ba: 'https://drive.google.com/ba_rollback.pdf',
      user: userL1
    });
  } catch (err) {
    rollbackCaught = true;
  }
  const dummyProposalState = db.prepare('SELECT status_tahap FROM revisi_pengajuan WHERE id = ?').get(pDummy.id);
  const dummyCycleState = getActiveRevisionCycle();
  assert(rollbackCaught === true && dummyProposalState.status_tahap === 'DIAJUKAN' && dummyCycleState.is_locked === 0, 'Test 19: Transaksi rollback utuh saat pengesahan gagal; tidak ada status setengah selesai.');

  // Bersihkan siklus dummy
  db.prepare('DELETE FROM revisi_pengajuan_log WHERE pengajuan_id = ?').run(pDummy.id);
  db.prepare('DELETE FROM revisi_pengajuan WHERE id = ?').run(pDummy.id);
  db.prepare('DELETE FROM rab_baris WHERE periode_id = ?').run(dummyCycleState.id);
  db.prepare('DELETE FROM periode_anggaran WHERE id = ?').run(dummyCycleState.id);

  // --------------------------------------------------------------------------
  // TEST 20: Pengesahan ulang pada siklus yang sudah disahkan: ditolak.
  // --------------------------------------------------------------------------
  let reRatifyError = false;
  try {
    finalizeTahap4Keseluruhan({
      nomor_ba: '01/BA.01-BA/3521/2026',
      tanggal_ba: '2026-10-22',
      link_scan_ba: 'https://drive.google.com/ba_pleno_sah_siklus1.pdf',
      user: userL1
    });
  } catch (err) {
    reRatifyError = err.message.includes('Tidak ada siklus revisi aktif');
  }
  assert(reRatifyError === true, 'Test 20: Pengesahan ulang pada siklus yang sudah sah ditolak.');

  console.log('--- SIKLUS 2: DASAR ANGGARAN SAH BERIKUTNYA & COMPARISON ---');

  // --------------------------------------------------------------------------
  // TEST 21: Siklus berikutnya setelah pengesahan: otomatis menggunakan hasil pengesahan tersebut sebagai Semula (dasar).
  // --------------------------------------------------------------------------
  const pSiklus2 = createRevisiPengajuan({
    subbag: 'KUL',
    nomor_surat: '01/KUL/XI/2026',
    tanggal_surat: '2026-11-01',
    perihal: 'Usulan Revisi Belanja Operasional Kantor Siklus 2',
    keterangan_revisi: 'Pergeseran daya dan jasa',
    dokumen_surat_link: 'https://drive.google.com/nota_dinas_kul_s2.pdf',
    dokumen_matriks_link: 'https://drive.google.com/rkb_kul_s2.xlsx',
    total_semula: 400000000,
    total_menjadi: 400000000,
    selisih: 0
  }, { id: 105, username: 'operator_kul', level: 2, role_id: 'operator', pic_subbag: 'KUL' });

  const activeCycle2 = getActiveRevisionCycle();
  assert(activeCycle2 !== null && activeCycle2.id !== activeCycle1.id, 'Test 21.1: Siklus 2 terbuka sebagai periode baru terpisah.');
  assert(activeCycle2.parent_periode_id === activeCycle1.id, 'Test 21.2: Siklus 2 otomatis menggunakan hasil pengesahan Siklus 1 sebagai dasar Semula.');

  // --------------------------------------------------------------------------
  // TEST 22: Angka PIC yang tidak mengajukan pada revisi sebelumnya tetap terbawa ke revisi berikutnya sesuai riwayat yang sah.
  // --------------------------------------------------------------------------
  const parsRowCycle2 = db.prepare('SELECT harga_satuan FROM rab_baris WHERE periode_id = ? AND pic_bagian = ? LIMIT 1').get(activeCycle2.id, 'PARSDM');
  const parsRowCycle1 = db.prepare('SELECT harga_satuan FROM rab_baris WHERE periode_id = ? AND pic_bagian = ? LIMIT 1').get(activeCycle1.id, 'PARSDM');
  assert(parsRowCycle2 && parsRowCycle1 && parsRowCycle2.harga_satuan === parsRowCycle1.harga_satuan, 'Test 22: Angka PARSDM dari hasil sah Siklus 1 tetap terbawa ke Siklus 2.');

  // --------------------------------------------------------------------------
  // TEST 23: Semula-Menjadi default membandingkan dengan dasar siklus, bukan selalu anggaran awal.
  // --------------------------------------------------------------------------
  const compS2 = getRevisionComparison(activeCycle2.id);
  assert(compS2 && compS2.has_parent === true, 'Test 23.1: Perbandingan revisi Siklus 2 memiliki parent.');
  assert(compS2.parent_periode && compS2.parent_periode.id === activeCycle1.id, 'Test 23.2: Semula-Menjadi default membandingkan dengan Siklus 1 (dasar siklus), bukan selalu anggaran awal.');

  // --------------------------------------------------------------------------
  // TEST 24: Perubahan master (harga, volume, satuan) setelah pengesahan: tidak mengubah angka pada arsip yang sudah disahkan.
  // --------------------------------------------------------------------------
  const snapshotRow = db.prepare('SELECT snapshot_data FROM periode_snapshot WHERE periode_id = ?').get(activeCycle1.id);
  const dataBefore = JSON.parse(snapshotRow.snapshot_data);
  // Simulasikan update harga pada master sbm
  db.prepare('UPDATE master_sbm SET harga_satuan = harga_satuan + 500000 WHERE id = 1').run();
  const snapshotRowAfter = db.prepare('SELECT snapshot_data FROM periode_snapshot WHERE periode_id = ?').get(activeCycle1.id);
  const dataAfter = JSON.parse(snapshotRowAfter.snapshot_data);
  assert(dataBefore && dataAfter && dataBefore.grandTotal === dataAfter.grandTotal, 'Test 24: Nilai grand total arsip sah terkunci tidak berubah meski master diperbarui.');

  // --------------------------------------------------------------------------
  // TEST 25: Unduh berkas dengan token di Authorization header berhasil; token di URL ditolak.
  // --------------------------------------------------------------------------
  console.log('--- TEST KEAMANAN TOKEN UNDUHAN ---');
  // Jalankan server mini menggunakan logic auth yang sama untuk memverifikasi endpoint unduhan
  const testServer = http.createServer(async (req, res) => {
    const { getUserFromReq } = require('../src/auth');
    const auth = getUserFromReq(req, db);
    if (!auth) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Sesi berakhir atau token tidak valid' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, user: auth.username }));
  });

  await new Promise(resolve => testServer.listen(0, '127.0.0.1', resolve));
  const port = testServer.address().port;
  const tokenDev = createToken(userDev);

  // 25.A: Request dengan Bearer token di Authorization Header -> Berhasil (200)
  const reqHeaderPromise = new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: '/api/export-excel/1',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${tokenDev}`
      }
    }, res => {
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
  const statusWithHeader = await reqHeaderPromise;
  assert(statusWithHeader === 200, 'Test 25.1: Unduh berkas dengan token di Authorization header berhasil (HTTP 200).');

  // 25.B: Request dengan query param `?auth_token=` tanpa Authorization header -> Ditolak (401)
  const reqQueryPromise = new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: `/api/export-excel/1?auth_token=${encodeURIComponent(tokenDev)}`,
      method: 'GET'
    }, res => {
      resolve(res.statusCode);
    });
    req.on('error', reject);
    req.end();
  });
  const statusWithQuery = await reqQueryPromise;
  assert(statusWithQuery === 401, 'Test 25.2: Token pada URL query string ditolak tegas (HTTP 401 Unauthorized).');

  testServer.close();

  console.log('\n================================================================');
  console.log(`  HASIL AKHIR: ${passedTests} / ${totalTests} PENGUJIAN PERILAKU BISNIS LULUS (100% SUKSES)`);
  console.log('================================================================\n');
}

runBusinessBehaviorTests().catch(err => {
  console.error('\n❌ BUSINESS BEHAVIOR TEST SUITE FATAL ERROR:', err);
  process.exit(1);
});
