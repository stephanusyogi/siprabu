const assert = require('assert');
const path = require('path');
const fs = require('fs');

process.env.DB_TYPE = 'sqlite';

const { db, createPeriode, autoBindRabSbm, saveSbm, autoBindRabVariables } = require('../src/db');
const { getRkbCalculatedDataset, clearRkbDatasetCache } = require('../src/calculation');

async function runSbmTests() {
  console.log('Testing SBM Auto-Binding & Real-time Synchronization...');

  // Use existing ID 20 (Honorarium Ketua PPK)
  const sbmKetuaPpk = db.prepare("SELECT * FROM master_sbm WHERE uraian = 'Honorarium Ketua PPK'").get();
  assert.ok(sbmKetuaPpk, 'SBM Honorarium Ketua PPK harus ada di master_sbm');
  const sbmId = Number(sbmKetuaPpk.id);
  const originalPrice = Number(sbmKetuaPpk.harga_satuan);

  // 2. Create test period (unlocked)
  const newPeriode = createPeriode({
    nama_periode: 'RKB Draft Test SBM',
    kode_singkat: 'RKB-TEST-SBM',
    pagu_nphd: 1000000000
  });
  const testPeriodeId = Number(newPeriode.id);

  // 3. Create sample rab_baris matching SBM (without sbm_id initially)
  const rowRes = db.prepare(`
    INSERT INTO rab_baris (
      periode_id, urutan, row_type, kode, uraian, level_indent, target_scope, kode_akun,
      f1_val, f1_unit, f1_var, f2_val, f2_unit, f2_var, f3_val, f3_unit, f3_var, f4_val, f4_unit, f4_var,
      basis_pengali, label_pengali_kab, label_pengali_adhoc, satuan_vol, harga_satuan
    ) VALUES (
      ?, 1, 'item', '1.1', 'Honorarium Ketua PPK', 4, 'PPK', '521213',
      1, 'Org', '', 8, 'Bln', '', 19, 'Kec', 'kec_ppk', NULL, '', '',
      'NONE', '', '', 'OB', ?
    )
  `).run(testPeriodeId, originalPrice);
  const rowId = Number(rowRes.lastInsertRowid);

  // 4. Test autoBindRabSbm
  const boundCount = autoBindRabSbm(testPeriodeId);
  assert.strictEqual(boundCount, 1, 'Harus berhasil mengikat 1 baris ke SBM');

  const rowAfter = db.prepare('SELECT sbm_id, harga_satuan FROM rab_baris WHERE id = ?').get(rowId);
  assert.strictEqual(Number(rowAfter.sbm_id), sbmId, 'sbm_id harus terisi ID Master SBM');
  console.log(`✅ Test 1: Auto-binding ke master_sbm (ID: ${sbmId}) berhasil!`);

  // 5. Calculate dataset
  clearRkbDatasetCache(testPeriodeId);
  let dataset = getRkbCalculatedDataset(testPeriodeId);
  let calcRow = dataset.rows.find(r => r.id === rowId);
  assert.strictEqual(Number(calcRow.harga_satuan), originalPrice);
  assert.strictEqual(Number(calcRow.computed_total), 1 * 8 * 19 * originalPrice);
  console.log(`✅ Test 2: Kalkulasi awal dengan SBM harga Rp ${originalPrice.toLocaleString('id-ID')} tepat!`);

  // 6. UPDATE Master SBM by +200.000
  const newPrice = originalPrice + 200000;
  saveSbm({
    id: sbmId,
    kode_akun: sbmKetuaPpk.kode_akun,
    kategori: sbmKetuaPpk.kategori,
    uraian: sbmKetuaPpk.uraian,
    satuan: sbmKetuaPpk.satuan,
    harga_satuan: newPrice,
    pagu_sbm: newPrice
  });

  // 7. Verify dynamic price update on unlocked period
  clearRkbDatasetCache(testPeriodeId);
  dataset = getRkbCalculatedDataset(testPeriodeId);
  calcRow = dataset.rows.find(r => r.id === rowId);
  assert.strictEqual(Number(calcRow.harga_satuan), newPrice, `Harga satuan harus otomatis naik ke Rp ${newPrice.toLocaleString('id-ID')}`);
  assert.strictEqual(Number(calcRow.computed_total), 1 * 8 * 19 * newPrice);
  console.log(`✅ Test 3: Saat Master SBM dinaikkan ke Rp ${newPrice.toLocaleString('id-ID')}, RKB draft otomatis berubah ke Rp ${(1 * 8 * 19 * newPrice).toLocaleString('id-ID')}!`);

  // Restore SBM original price
  saveSbm({
    id: sbmId,
    kode_akun: sbmKetuaPpk.kode_akun,
    kategori: sbmKetuaPpk.kategori,
    uraian: sbmKetuaPpk.uraian,
    satuan: sbmKetuaPpk.satuan,
    harga_satuan: originalPrice,
    pagu_sbm: originalPrice
  });

  // Cleanup test row and period
  db.prepare('DELETE FROM rab_baris WHERE periode_id = ?').run(testPeriodeId);
  db.prepare('DELETE FROM periode_anggaran WHERE id = ?').run(testPeriodeId);

  console.log('\n🎉 SEMUA PENGUJIAN SBM AUTO-BINDING & REAL-TIME SINKRONISASI BERHASIL 100%!');
}

runSbmTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
