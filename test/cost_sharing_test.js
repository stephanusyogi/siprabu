const assert = require('assert');
const { 
  db, 
  getActivePeriode, 
  getRabRows, 
  updateRabBarisCostSharingWithCascade,
  previewStagedRkbOps,
  commitStagedRkbOps
} = require('../src/db');
const { 
  calculateRkbDataset, 
  filterAndPruneRkbDataset, 
  clearRkbDatasetCache 
} = require('../src/calculation');

console.log('================================================================');
console.log('  TESTING FITUR SUMBER DANA COST SHARING (APBD KAB VS PROV)');
console.log('================================================================');

// 1. Verifikasi data awal
const activePeriode = getActivePeriode();
assert(activePeriode, 'Periode aktif harus ditemukan.');
const periodeId = activePeriode.id;

console.log(`\n[STEP 1] Menguji Periode Aktif ID: ${periodeId} (${activePeriode.nama_periode})`);

const rawRows = getRabRows(periodeId);
assert(rawRows.length > 0, 'Baris RKB harus ada.');
console.log(`Total baris RKB di DB: ${rawRows.length}`);

// Ambil dataset penuh
const fullDataset = calculateRkbDataset(rawRows);
const initialGrandTotal = fullDataset.summary.grandTotal;
const initialProvTotal = fullDataset.summary.byCostSharing?.PROVINSI || 0;
const initialKabTotal = fullDataset.summary.byCostSharing?.KABUPATEN || 0;
console.log(`Initial Grand Total Anggaran: Rp ${initialGrandTotal.toLocaleString('id-ID')}`);
assert(fullDataset.summary.byCostSharing, 'Summary harus memiliki field byCostSharing.');
console.log('Initial Summary byCostSharing:', fullDataset.summary.byCostSharing);

// 2. Cari sebuah Header L3 (Kegiatan) dengan anak rincian belanja
const headerL3 = fullDataset.rows.find(r => r.is_header && (r.level_indent === 2 || r.hierarchy_rank === 30) && r.child_count > 0);
assert(headerL3, 'Header Kegiatan L3 harus ditemukan.');
console.log(`\n[STEP 2] Memilih Header L3: [ID: ${headerL3.id}] [Kode: ${headerL3.kode}] ${headerL3.uraian}`);
console.log(`Anak turunan di bawah header ini: ${headerL3.child_count} baris, Subtotal: Rp ${headerL3.computed_total.toLocaleString('id-ID')}`);

// 3. Uji Cascade Update ke PROVINSI
console.log('\n[STEP 3] Mengubah Header L3 menjadi APBD Provinsi dengan Cascade...');
const updateRes = updateRabBarisCostSharingWithCascade(periodeId, headerL3.id, 'PROVINSI', true);
console.log(`Hasil Cascade: ${updateRes.updatedCount} baris diperbarui menjadi PROVINSI.`);
assert(updateRes.updatedCount > 1, 'Cascade harus memperbarui lebih dari 1 baris.');

// Refresh dataset pasca cascade
clearRkbDatasetCache();
const postUpdateRows = getRabRows(periodeId);
const postDataset = calculateRkbDataset(postUpdateRows);

console.log('Post Update Summary byCostSharing:', postDataset.summary.byCostSharing);
assert(postDataset.summary.byCostSharing.PROVINSI > 0, 'Porsi APBD Provinsi harus lebih dari 0.');
assert.strictEqual(
  postDataset.summary.grandTotal, 
  initialGrandTotal, 
  'Grand Total keseluruhan tidak boleh berubah meski ada sharing provinsi.'
);

// 4. Uji Filter Toolbar: APBD PROVINSI
console.log('\n[STEP 4] Menguji Filter Toolbar: [ cost_sharing: PROVINSI ]');
const provFiltered = filterAndPruneRkbDataset(postDataset, { cost_sharing: 'PROVINSI' });
console.log(`Baris yang lolos filter PROVINSI: ${provFiltered.rows.length}`);
console.log(`Grand Total porsi PROVINSI: Rp ${provFiltered.summary.grandTotal.toLocaleString('id-ID')}`);
assert(provFiltered.summary.grandTotal > 0, 'Total filter PROVINSI harus > 0.');
assert.strictEqual(
  provFiltered.summary.grandTotal, 
  postDataset.summary.byCostSharing.PROVINSI, 
  'Total filter PROVINSI harus persis sama dengan summary.byCostSharing.PROVINSI.'
);

// 5. Uji Filter Toolbar: APBD KABUPATEN
console.log('\n[STEP 5] Menguji Filter Toolbar: [ cost_sharing: KABUPATEN ]');
const kabFiltered = filterAndPruneRkbDataset(postDataset, { cost_sharing: 'KABUPATEN' });
console.log(`Baris yang lolos filter KABUPATEN: ${kabFiltered.rows.length}`);
console.log(`Grand Total porsi KABUPATEN: Rp ${kabFiltered.summary.grandTotal.toLocaleString('id-ID')}`);
assert(kabFiltered.summary.grandTotal > 0, 'Total filter KABUPATEN harus > 0.');
assert.strictEqual(
  kabFiltered.summary.grandTotal + provFiltered.summary.grandTotal, 
  initialGrandTotal, 
  'Penjumlahan Total Filter KAB + PROV harus tepat 100% sama dengan Grand Total awal.'
);

// 6. Uji Fitur Kosongkan / Reset ke APBD KABUPATEN dengan Cascade
console.log('\n[STEP 6] Menguji Fitur Kosongkan / Reset ke APBD Kabupaten dengan Cascade...');
const resetRes = updateRabBarisCostSharingWithCascade(periodeId, headerL3.id, 'KABUPATEN', true);
console.log(`Hasil Reset Cascade: ${resetRes.updatedCount} baris dikembalikan ke KABUPATEN.`);

clearRkbDatasetCache();
const postResetRows = getRabRows(periodeId);
const postResetDataset = calculateRkbDataset(postResetRows);
console.log('Post Reset Summary byCostSharing:', postResetDataset.summary.byCostSharing);
assert.strictEqual(
  postResetDataset.summary.byCostSharing.PROVINSI, 
  initialProvTotal, 
  'Porsi APBD Provinsi harus kembali ke nominal semula setelah direset.'
);
assert.strictEqual(
  postResetDataset.summary.byCostSharing.KABUPATEN, 
  initialKabTotal, 
  'Porsi APBD Kabupaten harus kembali ke nominal semula setelah direset.'
);

// 7. Uji Staging Ops: QUICK_COST_SHARING Preview & Commit
console.log('\n[STEP 7] Menguji Staging Buffer Preview & Commit (QUICK_COST_SHARING)...');
const sampleItem = postResetDataset.rows.find(r => !r.is_header && Number(r.computed_total) > 0);
assert(sampleItem, 'Item rincian belanja harus ditemukan.');
console.log(`Memilih item rincian: [ID: ${sampleItem.id}] ${sampleItem.uraian} (Rp ${sampleItem.computed_total.toLocaleString('id-ID')})`);

// Preview Staging Op
const stagedOps = [{
  type: 'QUICK_COST_SHARING',
  row_id: sampleItem.id,
  cost_sharing: 'PROVINSI',
  cascade: false
}];

const preview = previewStagedRkbOps(periodeId, stagedOps, { id: 1, level: 0, username: 'emenje' });
assert(preview && preview.afterDataset, 'Preview staged harus menghasilkan afterDataset.');
const previewCostProv = preview.afterDataset.summary.byCostSharing?.PROVINSI || 0;
console.log(`Preview Porsi Provinsi di draf buffer: Rp ${previewCostProv.toLocaleString('id-ID')}`);
assert.strictEqual(previewCostProv, initialProvTotal + sampleItem.computed_total, 'Draf buffer harus mencatat penambahan porsi Provinsi sesuai item.');

// Pastikan DB belum berubah saat baru di-preview (Isolasi SAVEPOINT)
const dbCheckBeforeCommit = getRabRows(periodeId).find(r => r.id === sampleItem.id);
assert.strictEqual(dbCheckBeforeCommit.cost_sharing, 'KABUPATEN', 'Database fisik tidak boleh berubah saat masih di-preview.');
console.log('✅ Isolasi SAVEPOINT Terverifikasi: DB fisik belum berubah sebelum commit.');

// Commit Staged Op
console.log('Menguji Commit Staged Op...');
commitStagedRkbOps(periodeId, stagedOps, { id: 1, level: 0, username: 'emenje' });
const dbCheckAfterCommit = getRabRows(periodeId).find(r => r.id === sampleItem.id);
assert.strictEqual(dbCheckAfterCommit.cost_sharing, 'PROVINSI', 'Database fisik harus terupdate setelah commit.');
console.log('✅ Commit Staged Op Berhasil: Database fisik terupdate menjadi PROVINSI.');

// Kembalikan item ke KABUPATEN agar data DB tetap bersih
updateRabBarisCostSharingWithCascade(periodeId, sampleItem.id, 'KABUPATEN', false);
clearRkbDatasetCache();
const finalCleanRows = getRabRows(periodeId);
const finalDataset = calculateRkbDataset(finalCleanRows);
assert.strictEqual(finalDataset.summary.byCostSharing.PROVINSI, initialProvTotal, 'Database harus kembali ke nilai awal porsi PROVINSI.');
assert.strictEqual(finalDataset.summary.byCostSharing.KABUPATEN, initialKabTotal, 'Database harus kembali ke nilai awal porsi KABUPATEN.');
assert.strictEqual(finalDataset.summary.grandTotal, initialGrandTotal, 'Grand Total akhir harus tetap utuh persis sama.');

console.log('\n================================================================');
console.log('  SEMUA 7 PENGUJIAN FITUR COST SHARING LULUS 100%!               ');
console.log('================================================================\n');
