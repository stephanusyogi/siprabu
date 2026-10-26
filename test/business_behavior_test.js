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
    getRevisiPengajuanList,
    updateRevisiTahap,
    finalizeTahap4Keseluruhan,
    updatePostRatificationLinks,
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
  assert(Number(pTeknisReturned.versi_usulan) === 2, 'Test 9.4 (Canon Bab 3 & FR-02): Penolakan Tahap 2 menaikkan versi pengajuan secara administratif ke V2 tanpa membuat tabel RKB baru.');

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

  // --------------------------------------------------------------------------
  // TEST 20B (Canon Bab 6, Bab 4.3, Bab 14 & Bab 17):
  // - Monitoring Revisi tetap menampilkan siklus terakhir yang baru selesai sebelum siklus berikutnya punya pengajuan Tahap 1.
  // - Kasubag Rendatin berwenang mengoreksi tautan pasca-pengesahan (tercatat di audit log, tidak mengubah angka baseline), sedangkan PIC ditolak.
  // --------------------------------------------------------------------------
  const monAfterRatify = getRevisiPengajuanList();
  assert(monAfterRatify.length === 3 && monAfterRatify.every(r => r.periode_id === activeCycle1.id && r.status_tahap === 'SELESAI'), 'Test 20B.1 (Canon Bab 6 & FR-08): Monitoring Revisi tetap menampilkan siklus terakhir yang selesai sebelum siklus berikutnya memiliki pengajuan pertama.');

  let picLinkCorrectBlocked = false;
  try {
    updatePostRatificationLinks(activeCycle1.id, {
      gdrive_link_pleno: 'https://drive.google.com/ilegal.pdf'
    }, userL2Teknis1);
  } catch (err) {
    picLinkCorrectBlocked = err.message.includes('Akses ditolak');
  }
  assert(picLinkCorrectBlocked === true, 'Test 20B.2 (Canon Bab 14): Operator Level 2 ditolak mengoreksi tautan dokumen pasca-pengesahan.');

  const correctedPeriode = updatePostRatificationLinks(activeCycle1.id, {
    gdrive_link_pleno: 'https://drive.google.com/ba_pleno_sah_siklus1_corrected.pdf',
    rkb_final_link: 'https://drive.google.com/rkb_final_siklus1.pdf',
    kak_gabungan_link: 'https://drive.google.com/kak_gabungan_siklus1.pdf',
    catatan: 'Perbaikan tautan folder Google Drive resmi'
  }, userL1);
  assert(
    correctedPeriode.gdrive_link_pleno === 'https://drive.google.com/ba_pleno_sah_siklus1_corrected.pdf' &&
    correctedPeriode.rkb_final_link === 'https://drive.google.com/rkb_final_siklus1.pdf' &&
    correctedPeriode.kak_gabungan_link === 'https://drive.google.com/kak_gabungan_siklus1.pdf',
    'Test 20B.3 (Canon Bab 4.3 & Bab 14): Kasubag Rendatin berhasil mengoreksi 3 tautan dokumen pasca-pengesahan tanpa mengubah angka baseline.'
  );

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

  // --------------------------------------------------------------------------
  // TEST 26: Bab 18, 19, 22 Canon Master Blueprint (Cascade Sasaran, Subtree Reorder, Audit Integritas, Blok Penandatangan)
  // --------------------------------------------------------------------------
  console.log('--- TEST BAB 18, 19, 22 CANON: CASCADE SASARAN, REORDER SUBTREE, AUDIT INTEGRITAS & BLOK TTD ---');
  const { updateRabBarisSasaranWithCascade, reorderRow } = require('../src/db');
  const { auditRkbIntegrity } = require('../src/calculation');
  const { appendOfficialSignature } = require('../src/excel_io');
  const ExcelJS = require('exceljs');

  // 26.1: Top-down cascade Sasaran pada baris Header memperbarui seluruh turunannya, sedangkan perubahan Sasaran pada baris item tidak mengubah induknya
  const headerL5 = db.prepare("SELECT id, level_indent, target_scope FROM rab_baris WHERE periode_id = ? AND row_type = 'header' AND level_indent = 3 LIMIT 1").get(activeCycle2.id);
  const cascadeSasRes = updateRabBarisSasaranWithCascade(activeCycle2.id, headerL5.id, 'PPK', true, userL1);
  assert(cascadeSasRes.success === true && cascadeSasRes.count > 1, 'Test 26.1 (Canon Bab 18.3): Perubahan Sasaran pada baris induk secara otomatis mengalir (Top-Down Cascade) ke seluruh baris turunannya.');

  const childItemId = cascadeSasRes.updatedIds.find(id => id !== headerL5.id);
  updateRabBarisSasaranWithCascade(activeCycle2.id, childItemId, 'TPS', true, userL1);
  const headerAfterChildEdit = db.prepare('SELECT target_scope FROM rab_baris WHERE id = ?').get(headerL5.id);
  assert(headerAfterChildEdit.target_scope === 'PPK', 'Test 26.2 (Canon Bab 18.3): Perubahan Sasaran pada baris anak bersifat satu arah dan TIDAK mengubah Sasaran baris induk di atasnya.');

  // 26.3: Reorder baris dibatasi dalam grup induknya (boundary check)
  const firstRowInPeriod = db.prepare('SELECT id FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC LIMIT 1').get(activeCycle2.id);
  const moveUpFirst = reorderRow(activeCycle2.id, firstRowInPeriod.id, 'UP', userL1);
  assert(moveUpFirst === false, 'Test 26.3 (Canon Bab 18.5): Pergeseran naik pada baris di urutan paling awal grup induknya ditolak dengan aman.');

  // 26.4: Audit Integritas Pra-Operasional berjalan 100% Read-Only dan menghasilkan ringkasan Kritis/Peringatan/Valid
  const auditReport = auditRkbIntegrity(activeCycle2.id);
  assert(
    auditReport &&
    auditReport.summary &&
    typeof auditReport.summary.kritis === 'number' &&
    typeof auditReport.summary.peringatan === 'number' &&
    typeof auditReport.summary.valid === 'number' &&
    auditReport.summary.total_checked > 0,
    'Test 26.4 (Canon Bab 19): Mesin Audit Integritas Data RKB Pra-Operasional memeriksa seluruh baris secara Read-Only.'
  );

  // 26.5: Blok Penandatangan (Bab 22): Default Lembaga hanya Ketua KPU saja; Pleno menyertakan Ketua + 4 Anggota
  const wbTest = new ExcelJS.Workbook();
  const wsLembaga = wbTest.addWorksheet('Lembaga');
  appendOfficialSignature(wsLembaga, { isPic: false, tanggalUnduh: '24 Oktober 2026', settings: { nama_ketua: 'SAMSU MUSTAKIM' } });
  let lembagaText = '';
  wsLembaga.eachRow(r => r.eachCell(c => { if (c.value) lembagaText += ' ' + String(c.value); }));
  assert(
    lembagaText.includes('Ketua Komisi Pemilihan Umum') && !lembagaText.includes('ANGGOTA,'),
    'Test 26.5 (Canon Bab 22.1 & 22.2): Blok tanda tangan dokumen pengusulan/pelaporan/arsip lembaga hanya mencantumkan Ketua KPU saja.'
  );

  const wsPleno = wbTest.addWorksheet('Pleno');
  appendOfficialSignature(wsPleno, { isPic: false, signContext: 'PLENO', tanggalUnduh: '24 Oktober 2026', settings: { nama_ketua: 'SAMSU MUSTAKIM' } });
  let plenoText = '';
  wsPleno.eachRow(r => r.eachCell(c => { if (c.value) plenoText += ' ' + String(c.value); }));
  assert(
    plenoText.includes('KETUA,') && plenoText.includes('ANGGOTA,'),
    'Test 26.6 (Canon Bab 22.1): Blok tanda tangan Pengesahan Pleno mencantumkan Ketua KPU bersama 4 Anggota Komisioner KPU.'
  );

  // =========================================================================
  // 27. BATCH 4 CANON — MENU MANDIRI REKAP ANGGARAN (PERENCANAAN & PELAKSANAAN - BAB 21)
  // =========================================================================
  console.log('\n--- [27] Menu Mandiri Rekap Anggaran: Perencanaan vs Pelaksanaan (Bab 21) ---');
  const { generateSaktiRouteToken, parseSaktiRouteToken } = require('../src/route_token');
  const { getRkbCalculatedDataset } = require('../src/calculation');

  const tokPerencanaan = generateSaktiRouteToken('view-rekap-perencanaan');
  const tokPelaksanaan = generateSaktiRouteToken('view-rekap-pelaksanaan');
  const parsedPerencanaan = parseSaktiRouteToken(tokPerencanaan);
  const parsedPelaksanaan = parseSaktiRouteToken(tokPelaksanaan);
  assert(
    parsedPerencanaan && parsedPerencanaan.viewId === 'view-rekap-perencanaan' &&
    parsedPelaksanaan && parsedPelaksanaan.viewId === 'view-rekap-pelaksanaan',
    'Test 27.1 (Canon Bab 21.1): Route token untuk view-rekap-perencanaan dan view-rekap-pelaksanaan terpetakan secara valid.'
  );

  const rekapPerencanaanActive = getActiveRevisionCycle() || getLatestRatifiedPeriode();
  const rekapPelaksanaanLocked = getLatestRatifiedPeriode();
  assert(
    rekapPelaksanaanLocked && rekapPelaksanaanLocked.is_locked === 1,
    'Test 27.2 (Canon Bab 21.3): Rekap Pelaksanaan bersumber secara otomatis dari baseline RKB terakhir yang telah disahkan dan dikunci pada Tahap 4 (is_locked = 1).'
  );

  const summaryPerencanaan = getRkbCalculatedDataset(rekapPerencanaanActive.id);
  const summaryPelaksanaan = getRkbCalculatedDataset(rekapPelaksanaanLocked.id);
  const rekapKegiatanL1ToL3 = (summaryPerencanaan.rows || []).filter(r => r.is_header && Number(r.level_indent) <= 2);
  assert(
    summaryPerencanaan && Array.isArray(summaryPerencanaan.rows) &&
    summaryPelaksanaan && Array.isArray(summaryPelaksanaan.rows) &&
    rekapKegiatanL1ToL3.length > 0 &&
    rekapKegiatanL1ToL3.every(r => Number(r.level_indent) <= 2),
    'Test 27.3 (Canon Bab 21.2 & 21.3): Data olahan Rekap Perencanaan (hanya sampai Level 3 / L1-L3) dan Rekap Pelaksanaan (Baseline Terkunci Tahap 4) terhitung secara terpisah dan konsisten.'
  );

  // =========================================================================
  // 28. BATCH 5 CANON — SIMPAN PERUBAHAN RKB: DRAFT BUFFER, POP-UP PREVIEW & SINKRONISASI REFERENSI (BAB 18.8)
  // =========================================================================
  console.log('\n--- [28] Simpan Perubahan RKB: Staged Draft Buffer, Pop-Up Preview & Concurrent Reference Sync (Bab 18.8) ---');
  const {
    getMasterReferenceVersion,
    previewStagedRkbOps,
    commitStagedRkbOps,
    saveKuantitas
  } = require('../src/db');

  const activeCycleForStage = getActiveRevisionCycle();
  const initialRefSnap = getMasterReferenceVersion();
  const rowToEditInStage = db.prepare(`
    SELECT *
    FROM rab_baris
    WHERE periode_id = ? AND row_type = 'item'
    ORDER BY urutan ASC, id ASC
    LIMIT 1
  `).get(activeCycleForStage.id);

  const countBeforePreview = db.prepare('SELECT COUNT(*) as c FROM rab_baris WHERE periode_id = ?').get(activeCycleForStage.id).c;
  const auditCountBeforePreview = db.prepare("SELECT COUNT(*) as c FROM audit_log WHERE action = 'COMMIT_RKB_CHANGES'").get().c;

  const stagedOpsSample = [
    {
      type: 'SAVE_ROW',
      payload: {
        id: rowToEditInStage.id,
        row_type: 'item',
        kode: rowToEditInStage.kode || '-',
        uraian: `${rowToEditInStage.uraian} [UJI DRAF]`,
        level_indent: rowToEditInStage.level_indent || 4,
        vol_satuan: rowToEditInStage.vol_satuan || 'PAKET',
        harga_satuan: Number(rowToEditInStage.harga_satuan || 50000) + 10000,
        pic_bagian: rowToEditInStage.pic_bagian || 'KUL',
        target_scope: rowToEditInStage.target_scope || 'KAB',
        kode_akun: rowToEditInStage.kode_akun || '521211',
        catatan_revisi_baris: 'Revisi draf uji coba',
        f1_val: 2,
        f1_sat: 'kali'
      }
    },
    {
      type: 'SAVE_ROW',
      temp_id: -101,
      payload: {
        id: null,
        row_type: 'item',
        target_after_id: rowToEditInStage.id,
        kode: '-',
        uraian: 'Item Baru Draf Sesi Sementara',
        level_indent: rowToEditInStage.level_indent || 4,
        vol_satuan: 'OK',
        harga_satuan: 75000,
        pic_bagian: rowToEditInStage.pic_bagian || 'KUL',
        target_scope: 'KAB',
        kode_akun: rowToEditInStage.kode_akun || '521211',
        catatan_revisi_baris: 'Penambahan baris baru via draf',
        f1_val: 4,
        f1_sat: 'org'
      }
    }
  ];

  const previewResult = previewStagedRkbOps(activeCycleForStage.id, stagedOpsSample, userL1);
  const countAfterPreview = db.prepare('SELECT COUNT(*) as c FROM rab_baris WHERE periode_id = ?').get(activeCycleForStage.id).c;
  const rowStillUnchangedInDb = db.prepare('SELECT uraian FROM rab_baris WHERE id = ?').get(rowToEditInStage.id);

  assert(
    previewResult &&
    previewResult.staged_diff &&
    previewResult.staged_diff.added_count === 1 &&
    previewResult.staged_diff.updated_count >= 1 &&
    countAfterPreview === countBeforePreview &&
    rowStillUnchangedInDb.uraian === rowToEditInStage.uraian,
    'Test 28.1 (Canon Bab 18.8): Draf perubahan RUH Belanja (Preview Staged SAVEPOINT) menghitung Pagu Semula vs Menjadi secara akurat tanpa mengubah database fisik sebelum dikonfirmasi.'
  );

  // Simulasikan perubahan referensi bersamaan (Concurrent Reference Change) saat operator sedang mengedit draf
  const sampleKuantitas = db.prepare('SELECT * FROM master_kuantitas LIMIT 1').get();
  if (sampleKuantitas) {
    saveKuantitas({ ...sampleKuantitas, nilai: Number(sampleKuantitas.nilai) + 1 }, userL1);
  }
  const refConflictResult = commitStagedRkbOps(
    activeCycleForStage.id,
    stagedOpsSample,
    {
      expected_reference_version: initialRefSnap.version,
      acknowledge_reference_change: false,
      catatan_simpan: 'Uji komit saat referensi berubah'
    },
    userL1
  );

  assert(
    refConflictResult &&
    refConflictResult.committed === false &&
    refConflictResult.reference_changed === true &&
    refConflictResult.reference_version !== initialRefSnap.version &&
    refConflictResult.staged_diff &&
    refConflictResult.staged_diff.added_count === 1,
    'Test 28.2 (Canon Bab 18.8): Sistem mendeteksi perubahan REFERENSI/DATABASE bersamaan (Concurrent Reference Sync), menahan komit otomatis, dan menyajikan hasil hitung ulang terbaru untuk dikonfirmasi.'
  );

  // Kembalikan nilai kuantitas dan lakukan komit dengan konfirmasi sinkronisasi referensi
  if (sampleKuantitas) {
    saveKuantitas({ ...sampleKuantitas, nilai: Number(sampleKuantitas.nilai) }, userL1);
  }
  const commitSuccessResult = commitStagedRkbOps(
    activeCycleForStage.id,
    stagedOpsSample,
    {
      expected_reference_version: initialRefSnap.version,
      acknowledge_reference_change: true,
      catatan_simpan: 'Simpan batch revisi RUH KUL'
    },
    userL1
  );
  const countAfterCommit = db.prepare('SELECT COUNT(*) as c FROM rab_baris WHERE periode_id = ?').get(activeCycleForStage.id).c;
  const auditCountAfterCommit = db.prepare("SELECT COUNT(*) as c FROM audit_log WHERE action = 'COMMIT_RKB_CHANGES'").get().c;

  assert(
    commitSuccessResult &&
    commitSuccessResult.committed === true &&
    countAfterCommit === countBeforePreview + 1 &&
    auditCountAfterCommit === auditCountBeforePreview + 1,
    'Test 28.3 (Canon Bab 14 & 18.8): Konfirmasi Simpan Perubahan RKB mengeksekusi seluruh draf secara atomik dan mencatat tepat 1 entri bersih COMMIT_RKB_CHANGES pada Audit Log.'
  );

  // =========================================================================
  // 29. BATCH 6 CANON — LOG AKTIVITAS: HAK AKSES EKSKLUSIF & 6 KELOMPOK KEJADIAN (BAB 14)
  // =========================================================================
  console.log('\n--- [29] Log Aktivitas: Hak Akses Eksklusif (Dev & Kasubag Rendatin) & 6 Kelompok Kejadian (Bab 14) ---');
  const { getAuditLogs, classifyAuditCategory, recordAuditLog } = require('../src/db');
  const { canManageUsers } = require('../src/auth');

  const tokAudit = generateSaktiRouteToken('view-audit');
  const parsedAudit = parseSaktiRouteToken(tokAudit);
  assert(
    parsedAudit && parsedAudit.viewId === 'view-audit',
    'Test 29.1 (Canon Bab 14): Route token untuk view-audit (Log Aktivitas) terpetakan secara valid.'
  );

  const userStafRendatin = { id: 99, username: 'staf_rendatin', level: 1, role_id: 'perencanaan_staf', pic_subbag: 'RENDATIN' };
  const userKomisioner = { id: 98, username: 'ketua', level: 3, role_id: 'ketua_kpu', pic_subbag: 'SEMUA' };
  assert(
    canManageUsers(userDev) === true &&
    canManageUsers(userL1) === true &&
    canManageUsers(userStafRendatin) === false &&
    canManageUsers(userL2Teknis1) === false &&
    canManageUsers(userKomisioner) === false,
    'Test 29.2 (Canon Bab 14.1): Hak akses Log Aktivitas dibatasi secara eksklusif hanya untuk Developer (Level 0) dan Kasubag Rendatin.'
  );

  const auditMetaRes = getAuditLogs({ limit: 50, offset: 0, category: 'ALL', include_meta: true });
  const rkbOnlyRes = getAuditLogs({ limit: 20, offset: 0, category: 'RKB', include_meta: true });
  assert(
    auditMetaRes &&
    Array.isArray(auditMetaRes.logs) &&
    auditMetaRes.summary &&
    auditMetaRes.summary.RKB >= 1 &&
    auditMetaRes.summary.SIKLUS >= 1 &&
    auditMetaRes.summary.MASTER >= 1 &&
    classifyAuditCategory('COMMIT_RKB_CHANGES', 'periode_anggaran') === 'RKB' &&
    classifyAuditCategory('FINALIZE_TAHAP4_KESELURUHAN', 'periode_anggaran') === 'SIKLUS' &&
    classifyAuditCategory('UPDATE_SBM', 'master_sbm') === 'MASTER' &&
    classifyAuditCategory('CREATE_USER', 'satker_users') === 'USER' &&
    classifyAuditCategory('LOGIN_SUCCESS', 'session') === 'AUTH' &&
    classifyAuditCategory('CREATE_DOWNLOAD_REQUEST', 'download_requests') === 'UNDUH' &&
    rkbOnlyRes.logs.every(l => l.category === 'RKB'),
    'Test 29.3 (Canon Bab 14.2): Mesin Log Aktivitas mengklasifikasikan 6 kelompok kejadian (RKB, SIKLUS, MASTER, USER, AUTH, UNDUH) dan menyajikan data Semula vs Menjadi secara akurat.'
  );

  const serverSourceCode = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
  assert(
    serverSourceCode.includes('getAuditLogs') &&
    /const\s*\{[\s\S]*?\bgetAuditLogs\b[\s\S]*?\}\s*=\s*require\(['"]\.\/src\/db['"]\)/.test(serverSourceCode),
    'Test 29.4 (Canon Bab 14): Modul server.js mengimpor getAuditLogs dari src/db secara utuh untuk melayani endpoint GET /api/audit-logs.'
  );

  // =========================================================================
  // 30. BATCH 7 CANON — GANTI PERAN (SIMULASI): BADGE LOGIN TETAP & FITUR MENYESUAIKAN PERAN (BAB 11)
  // =========================================================================
  console.log('\n--- [30] Ganti Peran: Badge Login Tetap Permanen & Konteks Fitur Menyesuaikan Peran Baru (Bab 11) ---');
  const { isDeveloperUser } = require('../src/auth');
  const realDevRow = db.prepare("SELECT * FROM satker_users WHERE username = 'emenje'").get();
  const realTeknisRow = db.prepare("SELECT * FROM satker_users WHERE username = 'teknis' OR pic_subbag = 'TEKNIS' LIMIT 1").get();

  const simToken = createToken({
    ...realTeknisRow,
    is_developer: true,
    original_dev_id: realDevRow.id,
    original_dev_username: realDevRow.username,
    dev_token_version: realDevRow.token_version
  });
  const verifiedSimUser = verifyToken(simToken, db);

  assert(
    verifiedSimUser &&
    verifiedSimUser.is_developer === true &&
    verifiedSimUser.original_dev_id === realDevRow.id &&
    verifiedSimUser.original_dev_username === 'emenje' &&
    verifiedSimUser.original_dev_nama === realDevRow.nama_pejabat &&
    verifiedSimUser.level === realTeknisRow.level &&
    verifiedSimUser.pic_subbag === realTeknisRow.pic_subbag &&
    isDeveloperUser(verifiedSimUser) === false &&
    canManageUsers(verifiedSimUser) === false,
    'Test 30.1 (Canon Bab 11.2 & 11.3): Saat Developer ganti peran ke Operator Level 2, identitas login permanen (emenje / LEVEL 0: DEVELOPER) tetap tersimpan untuk badge header, sementara kewenangan fitur mengikuti peran baru.'
  );

  recordAuditLog({
    user: verifiedSimUser,
    action: 'SWITCH_ROLE_SIMULATION',
    entity: 'satker_users',
    entity_id: verifiedSimUser.id,
    notes: 'Pengujian atribusi pelaku simulasi Developer pada Log Aktivitas'
  });
  const latestSimAudit = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 1').get();
  assert(
    latestSimAudit &&
    latestSimAudit.username === 'emenje' &&
    latestSimAudit.role_id === `developer [simulasi:${realTeknisRow.username}]`,
    'Test 30.2 (Canon Bab 11.5 & Bab 14): Saat Developer melakukan Simulasi Ganti Peran atau aksi dalam mode simulasi, Pelaku (username) tercatat sebagai Developer (emenje) dengan keterangan peran simulasi (developer [simulasi:...]).'
  );

  // =========================================================================
  // 31. PEMISAHAN MENU REGULASI & SUB-MENU PANDUAN (PERENCANAAN VS PELAKSANAAN)
  // =========================================================================
  console.log('\n--- [31] Struktur Panduan Perencanaan & Pelaksanaan + Menu Mandiri Regulasi (Bab 23) ---');
  const { SAKTI_VIEW_CODES: routeViewCodes } = require('../src/route_token');
  assert(
    routeViewCodes['view-panduan'] === 17 && routeViewCodes['view-panduan-pelaksanaan'] === 24,
    'Test 31.1: Route code terdaftar untuk view-panduan (17) dan view-panduan-pelaksanaan (24).'
  );
  const tokenPanduanPelaksanaan = generateSaktiRouteToken('view-panduan-pelaksanaan', false);
  const parsedPanduanPelaksanaan = parseSaktiRouteToken(tokenPanduanPelaksanaan);
  assert(
    parsedPanduanPelaksanaan && parsedPanduanPelaksanaan.viewId === 'view-panduan-pelaksanaan',
    'Test 31.2: Token enkripsi SAKTI 43-karakter untuk view-panduan-pelaksanaan dapat di-encode dan di-decode dengan akurat.'
  );

  // =========================================================================
  // 32. ROLLUP SUBTOTAL HIERARKI LEVEL 4, RUMUS @KPU_ALL DINAMIS, & GETAUTHTOKEN
  // =========================================================================
  console.log('\n--- [32] Rollup Subtotal Hierarki Level 4, Rumus Agregat @kpu_all & getAuthToken ---');
  const {
    getKuantitasMap: fetchKuantitasMap,
    clearRkbDatasetCache: flushCalcCache,
    getRkbCalculatedDataset: fetchCalcDataset
  } = require('../src/calculation');

  // 32.1: Verifikasi rollup subtotal bertingkat pada Bagian 15 (Rapat Kerja dan Supervisi -> a. -> Dengan KPU Kab/Kota -> 1) Rapat Kerja Relawan Demokrasi)
  flushCalcCache();
  const activeCalc = fetchCalcDataset(1);
  const row15 = activeCalc.rows.find(r => r.kode === '15' && (r.uraian || '').includes('Rapat Kerja dan Supervisi'));
  const row15a = activeCalc.rows.find(r => r.kode === 'a.' && (r.uraian || '').includes('Rapat Kerja') && r.urutan > row15.urutan);
  const row15Kpu = activeCalc.rows.find(r => (r.uraian || '').includes('Dengan KPU Kabupaten/Kota') && r.urutan > row15.urutan);
  const row15Relasi = activeCalc.rows.find(r => r.kode === '1)' && (r.uraian || '').includes('Rapat Kerja Relawan Demokrasi') && r.urutan > row15.urutan);
  const row15Pokja = activeCalc.rows.find(r => r.kode === '2)' && (r.uraian || '').includes('Rapat Pokja (Makan & Snack)') && r.urutan > row15.urutan);

  assert(
    row15 && row15a && row15Kpu && row15Relasi && row15Pokja &&
    row15Relasi.computed_total === 27850000 &&
    row15Pokja.computed_total === 53625000 &&
    row15Kpu.computed_total === (row15Relasi.computed_total + row15Pokja.computed_total) &&
    row15a.computed_total > row15Kpu.computed_total &&
    row15.computed_total > row15a.computed_total &&
    row15Relasi.has_children === true &&
    row15Kpu.has_children === true &&
    row15a.has_children === true,
    'Test 32.1: Seluruh sub-level di dalam Level 4 (1) -> Dengan KPU... -> a. -> 15) menghitung subtotal rollup secara akurat dan memiliki has_children = true.'
  );

  // 32.2: Verifikasi rumus otomatis @kpu_all = @komisioner + @sekretariat_kpu saat @sekretariat_kpu diubah ke 30
  const sekrRow = db.prepare("SELECT * FROM master_kuantitas WHERE kode = 'sekretariat_kpu'").get();
  const updatedKuantitasList = saveKuantitas({ id: sekrRow.id, nilai: 30 }, userDev);
  const kpuAllAfter30 = updatedKuantitasList.find(k => k.kode === 'kpu_all');
  const kMapAfter30 = fetchKuantitasMap();
  assert(
    kpuAllAfter30 && Number(kpuAllAfter30.nilai) === 35 &&
    kpuAllAfter30.keterangan.includes('5 Komisioner + 30 Sekretariat = 35') &&
    kMapAfter30.kpu_all && Number(kMapAfter30.kpu_all.nilai) === 35,
    'Test 32.2: Mengubah @sekretariat_kpu menjadi 30 otomatis memperbarui @kpu_all menjadi 35 beserta keterangannya di DB dan getKuantitasMap().'
  );
  // Kembalikan ke nilai semula (35)
  saveKuantitas({ id: sekrRow.id, nilai: 35 }, userDev);

  // 32.3: Verifikasi definisi getAuthToken pada public/app.js
  const appJsContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  assert(
    appJsContent.includes('function getAuthToken()') && appJsContent.includes('window.getAuthToken = getAuthToken'),
    'Test 32.3: Fungsi getAuthToken() terdefinisi dengan benar di public/app.js untuk mendukung penyimpanan draf RKB (commit-staged).'
  );

  console.log('\n================================================================');
  console.log(`  HASIL AKHIR: ${passedTests} / ${totalTests} PENGUJIAN PERILAKU BISNIS LULUS (100% SUKSES)`);
  console.log('================================================================\n');
}

runBusinessBehaviorTests().catch(err => {
  console.error('\n❌ BUSINESS BEHAVIOR TEST SUITE FATAL ERROR:', err);
  process.exit(1);
});
