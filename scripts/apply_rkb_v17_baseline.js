const path = require('path');
const fs = require('fs');
const { db, savePeriodeSnapshot, recordAuditLog } = require(path.join(__dirname, '../src/db'));
const { calculateRkbDataset, clearRkbDatasetCache, getRkbCalculatedDataset, getRevisionComparison } = require(path.join(__dirname, '../src/calculation'));

console.log('=== APPLYING SHEET RAB v1.7 AS BASELINE REFERENCE (RKB AWAL) ===');

// 1. Create a local backup first
const dbPath = path.join(__dirname, '../data/hibah_kpu.sqlite');
const backupPath = path.join(__dirname, `../data/hibah_kpu.sqlite.pre_v17_${Date.now()}`);
fs.copyFileSync(dbPath, backupPath);
console.log(`Backup created at: ${backupPath}`);

// 2. The 16 items that differ between Excel RAB v1.7 (1371 TPS/Kotak) and previous 1374
const factorUpdates = [
  { id: 7053, f1_val: 1, f1_unit: 'Org', f2_val: 1, f2_unit: 'Bulan', f3_val: 1371, f3_unit: 'TPS', basis: 'FIXED', label: 'TPS', harga: 900000 },
  { id: 7054, f1_val: 6, f1_unit: 'Org', f2_val: 1, f2_unit: 'Bulan', f3_val: 1371, f3_unit: 'TPS', basis: 'FIXED', label: 'TPS', harga: 850000 },
  { id: 7055, f1_val: 2, f1_unit: 'Org', f2_val: 1, f2_unit: 'Bulan', f3_val: 1371, f3_unit: 'TPS', basis: 'FIXED', label: 'TPS', harga: 650000 },
  { id: 6273, f1_val: 1, f1_unit: 'Buah', f2_val: 2, f2_unit: 'Keg', f3_val: 1371, f3_unit: 'Kotak', basis: 'FIXED', label: 'Kotak', harga: 16000 },
  { id: 6274, f1_val: 1, f1_unit: 'Buah', f2_val: 2, f2_unit: 'Keg', f3_val: 1371, f3_unit: 'Kotak', basis: 'FIXED', label: 'Kotak', harga: 15000 },
  { id: 5681, f1_val: 1, f1_unit: 'Org', f2_val: 1, f2_unit: 'Keg', f3_val: 1371, f3_unit: 'TPS', basis: 'FIXED', label: 'TPS', harga: 20000 },
  { id: 5710, f1_val: 3, f1_unit: 'Org', f2_val: 1, f2_unit: 'Keg', f3_val: 1371, f3_unit: 'TPS', basis: 'FIXED', label: 'TPS', harga: 25000 },
  { id: 5752, f1_val: 1, f1_unit: 'Org', f2_val: 1, f2_unit: 'Buah', f3_val: 1371, f3_unit: 'TPS', basis: 'FIXED', label: 'TPS', harga: 110000 },
  { id: 5760, f1_val: 1, f1_unit: 'Org', f2_val: 1371, f2_unit: 'TPS', f3_val: null, f3_unit: '', basis: 'FIXED', label: 'TPS', harga: 10000 },
  { id: 5761, f1_val: 1, f1_unit: 'Org', f2_val: 1371, f2_unit: 'TPS', f3_val: null, f3_unit: '', basis: 'FIXED', label: 'TPS', harga: 10000 },
  { id: 5808, f1_val: 1, f1_unit: 'Org', f2_val: 1371, f2_unit: 'TPS', f3_val: null, f3_unit: '', basis: 'FIXED', label: 'TPS', harga: 10000 },
  { id: 5852, f1_val: 1, f1_unit: 'Org', f2_val: 1371, f2_unit: 'TPS', f3_val: null, f3_unit: '', basis: 'FIXED', label: 'TPS', harga: 10000 },
  { id: 5853, f1_val: 1, f1_unit: 'Org', f2_val: 1371, f2_unit: 'TPS', f3_val: null, f3_unit: '', basis: 'FIXED', label: 'TPS', harga: 10000 },
  { id: 6197, f1_val: 3, f1_unit: 'Eks', f2_val: 1371, f2_unit: 'TPS', f3_val: null, f3_unit: '', basis: 'FIXED', label: 'TPS', harga: 8000 },
  { id: 6205, f1_val: 1, f1_unit: 'buah', f2_val: 1371, f2_unit: 'TPS', f3_val: null, f3_unit: '', basis: 'FIXED', label: 'TPS', harga: 50000 },
  { id: 6211, f1_val: 14, f1_unit: 'keping', f2_val: 1371, f2_unit: 'TPS', f3_val: null, f3_unit: '', basis: 'FIXED', label: 'TPS', harga: 1000 }
];

db.exec('BEGIN TRANSACTION');
try {
  // Update Periode 1 items
  const updateRowStmt = db.prepare(`
    UPDATE rab_baris
    SET f1_val = ?, f1_unit = ?, f2_val = ?, f2_unit = ?, f3_val = ?, f3_unit = ?,
        basis_pengali = ?, label_pengali_kab = ?, harga_satuan = ?
    WHERE id = ?
  `);

  const updateDerivedStmt = db.prepare(`
    UPDATE rab_baris
    SET f1_val = ?, f1_unit = ?, f2_val = ?, f2_unit = ?, f3_val = ?, f3_unit = ?,
        basis_pengali = ?, label_pengali_kab = ?, harga_satuan = ?
    WHERE semula_row_id = ?
  `);

  for (const u of factorUpdates) {
    updateRowStmt.run(u.f1_val, u.f1_unit, u.f2_val, u.f2_unit, u.f3_val, u.f3_unit, u.basis, u.label, u.harga, u.id);
    updateDerivedStmt.run(u.f1_val, u.f1_unit, u.f2_val, u.f2_unit, u.f3_val, u.f3_unit, u.basis, u.label, u.harga, u.id);
  }

  // Update periode_anggaran Periode 1
  db.prepare(`
    UPDATE periode_anggaran
    SET pagu_nphd = 49999999000,
        catatan_revisi = 'Dokumen Referensi Induk Perencanaan Pilkada KPU Ngawi (Pasca Review Provinsi v1.7)'
    WHERE id = 1
  `).run();

  // Also update pagu_nphd in derived periodes
  db.prepare(`
    UPDATE periode_anggaran
    SET pagu_nphd = 49999999000
    WHERE id IN (1000003, 1000004)
  `).run();

  // Record audit log
  db.prepare(`
    INSERT INTO audit_log_perubahan (
      waktu_perubahan, tabel_nama, record_id, kode_entitas, aksi, kolom_diubah,
      nilai_lama, nilai_baru, operator, dasar_perubahan, keterangan
    ) VALUES (
      datetime('now'), 'periode_anggaran', 1, 'RKB-KAB-AWAL', 'PENYESUAIAN_BASELINE',
      'pagu_nphd & rab_baris', 'Rp 50.023.114.000', 'Rp 49.999.999.000',
      'Tim Perencanaan KPU', 'Sheet RAB v1.7 Kertas Kerja Rincian Belanja Pasca Review Provinsi',
      'Penetapan resmi Pagu RKB Awal Rp 49.999.999.000 sesuai Sheet RAB v1.7 (TPS 1.371 / Kotak 1.371)'
    )
  `).run();
  db.exec('COMMIT');
} catch (e) {
  db.exec('ROLLBACK');
  throw e;
}

clearRkbDatasetCache();

// 3. Recalculate Periode 1 and update snapshot
const p1Rows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = 1 ORDER BY urutan ASC, id ASC').all();
const p1Result = calculateRkbDataset(p1Rows, 49999999000);

console.log('Periode 1 New Grand Total:', p1Result.summary.grandTotal);
console.log('Periode 1 Is Balance:', p1Result.summary.is_balance);
console.log('Periode 1 By Subbag:', p1Result.summary.bySubbag);

if (p1Result.summary.grandTotal !== 49999999000) {
  throw new Error(`Kalkulasi Periode 1 gagal: expected 49999999000, got ${p1Result.summary.grandTotal}`);
}

// Save snapshot for Periode 1
const snapshotPayloadP1 = JSON.stringify({
  rows: p1Result.rows,
  summary: p1Result.summary,
  meta: {
    frozen_at: new Date().toISOString(),
    is_migration_frozen: true,
    notice: 'Dokumen Sah RKB Awal Pilkada 2024 (Sheet RAB v1.7 Pasca Review Provinsi Rp 49.999.999.000)'
  }
});

const existingSnap1 = db.prepare('SELECT id FROM periode_snapshot WHERE periode_id = 1').get();
if (existingSnap1) {
  db.prepare("UPDATE periode_snapshot SET snapshot_data = ?, created_at = datetime('now') WHERE periode_id = 1").run(snapshotPayloadP1);
} else {
  db.prepare("INSERT INTO periode_snapshot (periode_id, snapshot_data, created_at) VALUES (1, ?, datetime('now'))").run(snapshotPayloadP1);
}
console.log('Snapshot Periode 1 successfully updated!');

// 4. Recalculate Periode 1000003 (Revisi 1) and update snapshot
clearRkbDatasetCache();
const p2Rows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = 1000003 ORDER BY urutan ASC, id ASC').all();
const p2Result = calculateRkbDataset(p2Rows, 49999999000);
console.log('Periode 1000003 (Revisi 1) Grand Total:', p2Result.summary.grandTotal);

const snapshotPayloadP2 = JSON.stringify({
  rows: p2Result.rows,
  summary: p2Result.summary,
  meta: {
    frozen_at: new Date().toISOString(),
    is_migration_frozen: true,
    notice: 'Pengesahan Revisi 1 (BA/TAPD/2026/05)'
  }
});
const existingSnap2 = db.prepare('SELECT id FROM periode_snapshot WHERE periode_id = 1000003').get();
if (existingSnap2) {
  db.prepare("UPDATE periode_snapshot SET snapshot_data = ?, created_at = datetime('now') WHERE periode_id = 1000003").run(snapshotPayloadP2);
} else {
  db.prepare("INSERT INTO periode_snapshot (periode_id, snapshot_data, created_at) VALUES (1000003, ?, datetime('now'))").run(snapshotPayloadP2);
}
console.log('Snapshot Periode 1000003 successfully updated!');

clearRkbDatasetCache();

// 5. Verify Revision Comparison
const comp1 = getRevisionComparison(1000003);
console.log('Comparison for Revisi 1:', {
  totalSemula: comp1.summary.totalSemula,
  totalMenjadi: comp1.summary.totalMenjadi,
  netSelisih: comp1.summary.netSelisih
});

console.log('\n=== BASELINE MIGRATION COMPLETED SUCCESSFULLY ===');
