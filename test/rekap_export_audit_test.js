const assert = require('assert');
const ExcelJS = require('exceljs');
const { exportRekapToExcelBuffer, exportRkbToExcelBuffer } = require('../src/excel_io');
const { getActivePeriode, createDownloadRequest, getDownloadRequestById, db } = require('../src/db');

async function testRekapExports() {
  console.log('================================================================');
  console.log('  TESTING AUDIT & FITUR UNDUH EXCEL REKAPITULASI (OPSI A & B)');
  console.log('================================================================');

  const activePeriode = getActivePeriode();
  assert(activePeriode, 'Periode aktif harus ditemukan');
  const pId = activePeriode.id;

  // --------------------------------------------------------------------------
  // TEST 1: Opsi A - Unduh Tab 1 (Ringkasan Eksekutif)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 1] Menguji Opsi A: Tab Ringkasan Eksekutif...');
  const buf1 = await exportRekapToExcelBuffer(pId, { tab: 'EKSEKUTIF', fullCompilation: false });
  assert(Buffer.isBuffer(buf1) && buf1.length > 0, 'Buffer harus valid');
  const wb1 = new ExcelJS.Workbook();
  await wb1.xlsx.load(buf1);
  const sheetNames1 = wb1.worksheets.map(w => w.name);
  console.log('Sheet names:', sheetNames1);
  assert.strictEqual(sheetNames1.length, 1, 'Hanya 1 sheet untuk Opsi A Eksekutif');
  assert.strictEqual(sheetNames1[0], 'Rekap_Eksekutif');
  assert(!sheetNames1.includes('RUH_Belanja_Resmi'), 'Tidak boleh ada RUH_Belanja_Resmi');
  assert(!sheetNames1.includes('Data_Kertas_Kerja'), 'Tidak boleh ada Data_Kertas_Kerja');
  checkRowHeights(wb1.worksheets[0]);

  // --------------------------------------------------------------------------
  // TEST 2: Opsi A - Unduh Tab 2 (Rekap Kegiatan RKB)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 2] Menguji Opsi A: Tab Rekap Kegiatan RKB...');
  const buf2 = await exportRekapToExcelBuffer(pId, { tab: 'KEGIATAN', fullCompilation: false });
  const wb2 = new ExcelJS.Workbook();
  await wb2.xlsx.load(buf2);
  const sheetNames2 = wb2.worksheets.map(w => w.name);
  console.log('Sheet names:', sheetNames2);
  assert.strictEqual(sheetNames2.length, 1);
  assert.strictEqual(sheetNames2[0], 'Rekap_Kegiatan_RKB');
  assert(!sheetNames2.includes('RUH_Belanja_Resmi'));
  checkRowHeights(wb2.worksheets[0]);

  // --------------------------------------------------------------------------
  // TEST 3: Opsi A - Unduh Tab 3 (Rekap Subbagian)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 3] Menguji Opsi A: Tab Rekap Subbagian...');
  const buf3 = await exportRekapToExcelBuffer(pId, { tab: 'SUBBAGIAN', fullCompilation: false });
  const wb3 = new ExcelJS.Workbook();
  await wb3.xlsx.load(buf3);
  const sheetNames3 = wb3.worksheets.map(w => w.name);
  console.log('Sheet names:', sheetNames3);
  assert.strictEqual(sheetNames3.length, 1);
  assert.strictEqual(sheetNames3[0], 'Rekap_Subbagian');
  assert(!sheetNames3.includes('RUH_Belanja_Resmi'));
  checkRowHeights(wb3.worksheets[0]);

  // --------------------------------------------------------------------------
  // TEST 4: Opsi A - Unduh Tab 4 (Rekap Akun BAS)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 4] Menguji Opsi A: Tab Rekap Akun BAS...');
  const buf4 = await exportRekapToExcelBuffer(pId, { tab: 'AKUN_BAS', fullCompilation: false });
  const wb4 = new ExcelJS.Workbook();
  await wb4.xlsx.load(buf4);
  const sheetNames4 = wb4.worksheets.map(w => w.name);
  console.log('Sheet names:', sheetNames4);
  assert.strictEqual(sheetNames4.length, 1);
  assert.strictEqual(sheetNames4[0], 'Rekap_Akun_BAS');
  assert(!sheetNames4.includes('RUH_Belanja_Resmi'));
  checkRowHeights(wb4.worksheets[0]);

  // --------------------------------------------------------------------------
  // TEST 5: Opsi A - Unduh Tab 5 (Rekap Sumber Dana)
  // --------------------------------------------------------------------------
  console.log('\n[TEST 5] Menguji Opsi A: Tab Rekap Sumber Dana...');
  const buf5 = await exportRekapToExcelBuffer(pId, { tab: 'COST_SHARING', fullCompilation: false });
  const wb5 = new ExcelJS.Workbook();
  await wb5.xlsx.load(buf5);
  const sheetNames5 = wb5.worksheets.map(w => w.name);
  console.log('Sheet names:', sheetNames5);
  assert(sheetNames5.includes('Rekap_Sumber_Dana'));
  assert(!sheetNames5.includes('RUH_Belanja_Resmi'));
  wb5.worksheets.forEach(ws => checkRowHeights(ws));

  // --------------------------------------------------------------------------
  // TEST 6: Opsi B - Buku Kompilasi 5 Sheet Rekap Lengkap
  // --------------------------------------------------------------------------
  console.log('\n[TEST 6] Menguji Opsi B: Buku Kompilasi 5 Sheet Rekapitulasi...');
  const bufB = await exportRekapToExcelBuffer(pId, { fullCompilation: true });
  const wbB = new ExcelJS.Workbook();
  await wbB.xlsx.load(bufB);
  const sheetNamesB = wbB.worksheets.map(w => w.name);
  console.log('Sheet names Buku Kompilasi:', sheetNamesB);
  assert(sheetNamesB.includes('Rekap_Eksekutif'), 'Wajib memuat Rekap_Eksekutif');
  assert(sheetNamesB.includes('Rekap_Kegiatan_RKB'), 'Wajib memuat Rekap_Kegiatan_RKB');
  assert(sheetNamesB.includes('Rekap_Subbagian'), 'Wajib memuat Rekap_Subbagian');
  assert(sheetNamesB.includes('Rekap_Akun_BAS'), 'Wajib memuat Rekap_Akun_BAS');
  assert(sheetNamesB.includes('Rekap_Sumber_Dana'), 'Wajib memuat Rekap_Sumber_Dana');
  assert(!sheetNamesB.includes('RUH_Belanja_Resmi'), 'TIDAK BOLEH memuat RUH_Belanja_Resmi');
  assert(!sheetNamesB.includes('Data_Kertas_Kerja'), 'TIDAK BOLEH memuat Data_Kertas_Kerja');
  assert(!sheetNamesB.includes('Matriks_Revisi'), 'TIDAK BOLEH memuat Matriks_Revisi');
  wbB.worksheets.forEach(ws => checkRowHeights(ws));

  // --------------------------------------------------------------------------
  // TEST 7: Verifikasi RUH Belanja Utuh masih bekerja normal
  // --------------------------------------------------------------------------
  console.log('\n[TEST 7] Memastikan Unduh RUH Belanja Utuh tetap normal...');
  const bufRkb = await exportRkbToExcelBuffer(pId);
  const wbRkb = new ExcelJS.Workbook();
  await wbRkb.xlsx.load(bufRkb);
  const sheetNamesRkb = wbRkb.worksheets.map(w => w.name);
  console.log('Sheet names Dokumen Utuh RKB:', sheetNamesRkb);
  assert(sheetNamesRkb.includes('RUH_Belanja_Resmi'), 'Dokumen utuh RKB harus memuat RUH');
  assert(sheetNamesRkb.includes('Data_Kertas_Kerja'), 'Dokumen utuh RKB harus memuat Kertas Kerja');
  wbRkb.worksheets.forEach(ws => checkRowHeights(ws));

  // --------------------------------------------------------------------------
  // TEST 8: Verifikasi Download Request & Timestamp Format
  // --------------------------------------------------------------------------
  console.log('\n[TEST 8] Menguji format nama file dan integrasi monitoring unduhan...');
  const req = createDownloadRequest({
    nama_file: 'Buku_Rekap_5_Modul_perencanaan_RKB_SEMUA.xlsx',
    tipe_unduhan: 'EXCEL_REKAP',
    periode_id: pId,
    filter_pic: 'SEMUA',
    filter_sasaran: 'perencanaan|full_compilation',
    user_id: 1,
    username: 'emenje'
  });
  console.log('Created Download Request:', req.id, req.nama_file);
  const regexTimestamp = /_\d{8}_\d{4}\.xlsx$/;
  assert(regexTimestamp.test(req.nama_file), `Nama file ${req.nama_file} harus memiliki suffix _DDMMYYYY_HHmm.xlsx`);

  console.log('\n================================================================');
  console.log('  SEMUA PENGUJIAN OPSI A & B BERHASIL 100% SUKSES!');
  console.log('================================================================');
}

function checkRowHeights(ws) {
  let undefinedCount = 0;
  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row.height) {
      console.warn(`[WARN] Sheet '${ws.name}' Row ${r} undefined height!`);
      undefinedCount++;
    }
  }
  assert.strictEqual(undefinedCount, 0, `Sheet '${ws.name}' memiliki ${undefinedCount} baris dengan undefined height!`);
}

testRekapExports().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
