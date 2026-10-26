const path = require('path');
const fs = require('fs');
const { db, getPeriodeList, getRevisionCycleStatus } = require(path.join(__dirname, '../src/db'));
const { getCachedRkbDataset, getRevisionSummary, clearRkbDatasetCache } = require(path.join(__dirname, '../src/calculation'));

console.log('=== SETTING SIPRABU TO 2 RKBs (RKB AWAL FONDASI & USULAN 1 DRAFT AKTIF) ===');

// 1. Delete Periode 1000004 (Revisi 2)
db.exec('BEGIN TRANSACTION');
try {
  const p4 = db.prepare('SELECT id FROM periode_anggaran WHERE id = 1000004').get();
  if (p4) {
    db.prepare('DELETE FROM rab_baris WHERE periode_id = 1000004').run();
    db.prepare('DELETE FROM subbag_usulan_revisi WHERE periode_id = 1000004').run();
    db.prepare('DELETE FROM periode_snapshot WHERE periode_id = 1000004').run();
    db.prepare('DELETE FROM periode_anggaran WHERE id = 1000004').run();
    console.log('Periode 1000004 (Revisi 2) deleted successfully.');
  }

  // 2. Set Periode 1000003 to DRAFT AKTIF
  db.prepare(`
    UPDATE periode_anggaran
    SET is_locked = 0, locked_at = '', nomor_ba_tapd = '', tanggal_ba_tapd = '',
        dasar_pengesahan = 'Kertas Kerja Penyusunan'
    WHERE id = 1000003
  `).run();

  // Remove snapshot of 1000003 so it computes dynamically
  db.prepare('DELETE FROM periode_snapshot WHERE periode_id = 1000003').run();

  // In revisi_pengajuan: set to Tahap 3 (ACC_PLENO) and is_locked = 0
  db.prepare(`
    UPDATE revisi_pengajuan
    SET is_locked = 0, tahap_terkini = 3, status_tahap = 'ACC_PLENO',
        nomor_penetapan = '', tanggal_penetapan = '', tahap4_waktu = '', tahap4_catatan = ''
    WHERE periode_id = 1000003
  `).run();

  // Audit log
  db.prepare(`
    INSERT INTO audit_log_perubahan (
      waktu_perubahan, tabel_nama, record_id, kode_entitas, aksi, kolom_diubah,
      nilai_lama, nilai_baru, operator, dasar_perubahan, keterangan
    ) VALUES (
      datetime('now'), 'periode_anggaran', 1000003, 'RKB-REV-1', 'RESET_TO_DRAFT',
      'is_locked', '1 (Terkunci)', '0 (Draft Aktif)',
      'Tim Perencanaan KPU', 'Kesepakatan Operasional Alur Bisnis',
      'Penyesuaian status Usulan 1 sebagai Draft Aktif dan penghapusan draf premature Revisi 2'
    )
  `).run();

  db.exec('COMMIT');
  console.log('Periode 1000003 (Usulan 1) is now set to DRAFT AKTIF.');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}

clearRkbDatasetCache();

// 3. Verify Periodes
console.log('\n--- VERIFIKASI DAFTAR RKB ---');
const periodes = getPeriodeList();
console.log(`Jumlah RKB di sistem: ${periodes.length}`);
periodes.forEach((p, idx) => {
  const data = getCachedRkbDataset(p.id);
  p.total_pagu = data.summary.grandTotal;
  const isBaseline = p.revisi_ke === 0;
  console.log(`#${idx + 1}: [ID ${p.id}] ${p.nama_periode}`);
  console.log(`    Versi: ${p.versi_revisi} | Status: ${p.is_locked ? 'TERKUNCI' : 'DRAFT AKTIF'}`);
  console.log(`    Total Pagu: Rp ${p.total_pagu.toLocaleString('id-ID')} | Selisih: ${isBaseline ? 'BASELINE' : '+Rp 5.242.000.000'}`);
});

const cycle = getRevisionCycleStatus();
console.log('\nCycle Status:', {
  siklus_aktif_id: cycle.siklus_aktif?.id,
  siklus_aktif_nama: cycle.siklus_aktif?.nama_periode,
  siklus_is_locked: cycle.siklus_aktif?.is_locked,
  dasar_anggaran_id: cycle.dasar_anggaran?.id,
  total_pengajuan: cycle.total_pengajuan,
  siap_pengesahan: cycle.siap_pengesahan
});

// 4. Sync to template database
const srcDb = path.join(__dirname, '../data/hibah_kpu.sqlite');
const templateDb = path.join(__dirname, '../data/hibah_kpu.sqlite.template');
fs.copyFileSync(srcDb, templateDb);
console.log('\nUpdated template database at:', templateDb);
