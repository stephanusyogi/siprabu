/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Export Excel (XLSX) Multi-Sheet Resmi (SAKTI Leveling & Color Architecture)
 * Pengembang Resmi: emenje <emenje@kpu-ngawi.go.id>
 */

const ExcelJS = require('exceljs');
const { getRabRows, getPeriodeById, getMasters } = require('./db');
const { calculateRkbDataset, getRevisionComparison } = require('./calculation');

/**
 * Menghasilkan buffer XLSX untuk download RUH Belanja Multi-Sheet
 * @param {number} periodeId
 * @param {object} options { pic, sasaran, scope }
 * @returns {Promise<Buffer>}
 */
async function exportRkbToExcelBuffer(periodeId, options = {}) {
  const periode = getPeriodeById(periodeId);
  const rawRows = getRabRows(periodeId);
  const { rows, summary } = calculateRkbDataset(rawRows);
  const masters = getMasters ? getMasters() : {};
  const settings = masters.settings || {};
  const masterAkuns = masters.akuns || [];

  const akunMap = {};
  masterAkuns.forEach(a => {
    akunMap[a.kode] = a.uraian;
  });

  let statusLabel = 'DRAFT AKTIF (LEMBAR KERJA)';
  if (periode && periode.is_locked) {
    if (periode.tahap_revisi === 'PRA_NPHD') statusLabel = `ARSIP PRA-NPHD (${periode.dasar_pengesahan || 'USULAN'})`;
    else if (periode.dasar_pengesahan === 'NPHD' || periode.tahap_revisi === 'RKB_AWAL') statusLabel = 'TERKUNCI (NPHD SAH - BASELINE)';
    else statusLabel = `TERKUNCI PASCA-NPHD (${periode.dasar_pengesahan || 'BA TAPD'})`;
  }

  // Filter Baris jika parameter pic atau sasaran aktif
  const filterPic = options.pic && options.pic !== 'SEMUA' ? options.pic.toUpperCase() : null;
  const filterSasaran = options.sasaran && options.sasaran !== 'ALL' ? options.sasaran.toUpperCase() : null;
  const hasFilter = Boolean(filterPic || filterSasaran);

  let exportRows = rows;
  if (hasFilter) {
    const rowByTreeId = {};
    const rowById = {};
    rows.forEach(r => {
      rowByTreeId[r.tree_id] = r;
      rowById[r.id] = r;
    });

    const matchingRowIds = new Set();
    rows.forEach(r => {
      let matchPic = true;
      let matchSasaran = true;
      if (filterPic) {
        matchPic = r.pic_bagian && r.pic_bagian.toUpperCase() === filterPic;
      }
      if (filterSasaran) {
        matchSasaran = r.target_scope && r.target_scope.toUpperCase() === filterSasaran;
      }
      if (matchPic && matchSasaran) {
        matchingRowIds.add(r.id);
      }
    });

    const includedTreeIds = new Set();
    matchingRowIds.forEach(id => {
      const r = rowById[id];
      if (!r) return;
      includedTreeIds.add(r.tree_id);
      let cur = r.parent_tree_id;
      while (cur && rowByTreeId[cur]) {
        includedTreeIds.add(cur);
        cur = rowByTreeId[cur].parent_tree_id;
      }
    });

    exportRows = rows.filter(r => includedTreeIds.has(r.tree_id));
  }

  // Bangun Workbook ExcelJS
  const wb = new ExcelJS.Workbook();
  wb.creator = 'emenje <emenje@kpu-ngawi.go.id>';
  wb.lastModifiedBy = 'SI-PRABU v3.0 (KPU Kabupaten Ngawi)';
  wb.created = new Date();
  wb.modified = new Date();

  // Helper Format Tanggal Indonesia
  const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const now = new Date();
  const tanggalUnduh = `${now.getDate()} ${bulanIndo[now.getMonth()]} ${now.getFullYear()}`;

  // ==========================================================================
  // SHEET 1: RUH_Belanja_Resmi (Kolom Terpisah per-Level & Tema SAKTI)
  // ==========================================================================
  const ws1 = wb.addWorksheet('RUH_Belanja_Resmi', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 }
    }
  });

  // Judul Dokumen
  ws1.addRow(['KOMISI PEMILIHAN UMUM KABUPATEN NGAWI']);
  ws1.addRow(['RENCANA USULAN HALAMAN (RUH) BELANJA']);
  ws1.addRow([`Program / Dokumen: ${periode ? periode.nama_periode : 'Pilkada Serentak'} | Versi: ${periode ? (periode.versi_revisi || 'Induk') : '-'} | Status: ${statusLabel}`]);
  ws1.addRow([`Dasar Pengesahan: ${periode ? (periode.dasar_pengesahan || 'Kertas Kerja Penyusunan') : '-'} | Tanggal Unduh: ${tanggalUnduh}${hasFilter ? ` | Filter: PIC=${filterPic || 'SEMUA'}, Sasaran=${filterSasaran || 'SEMUA'}` : ''}`]);
  ws1.addRow([]); // Baris 5 kosong

  ws1.getCell('A1').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  ws1.getCell('A2').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  ws1.getCell('A3').font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  ws1.getCell('A4').font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF475569' } };

  // Definisi Kolom Sheet 1 (Opsi A: Kolom Kode Terpisah per-Level)
  const headersSheet1 = [
    'Kelompok', // Col 1 (A) - Level 1 (A, B)
    'Tahapan',  // Col 2 (B) - Level 2 (I, II)
    'Kegiatan', // Col 3 (C) - Level 3 (1..28)
    'Sub-Keg',  // Col 4 (D) - Level 4 (a..d, -)
    'Akun BAS', // Col 5 (E) - Level 5 (52xxxx)
    'Uraian Komponen / Akun / Rincian Belanja', // Col 6 (F)
    'Rincian Perhitungan', // Col 7 (G)
    'Volume',              // Col 8 (H)
    'Satuan',              // Col 9 (I)
    'Harga Satuan (Rp)',   // Col 10 (J)
    'Jumlah (Rp)',         // Col 11 (K)
    '',                    // Col 12 (L) - Kolom Kosong Spacer
    'No',                  // Col 13 (M)
    'PIC',                 // Col 14 (N)
    'Sasaran'              // Col 15 (O)
  ];

  const headerRow1 = ws1.addRow(headersSheet1);
  headerRow1.height = 25;

  headerRow1.eachCell((cell, colNumber) => {
    if (colNumber === 12) return; // Kolom kosong spacer tidak di-fill
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF2563EB' } // SAKTI Vivid Blue
    };
    cell.font = {
      name: 'Calibri',
      size: 10,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colNumber === 6 ? 'left' : 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF1D4ED8' } },
      bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
      left: { style: 'thin', color: { argb: 'FF3B82F6' } },
      right: { style: 'thin', color: { argb: 'FF3B82F6' } }
    };
  });

  // Isi Data Baris Sheet 1
  exportRows.forEach((r, idx) => {
    const isItem = !r.is_header;
    const treeLvl = r.tree_level || (isItem ? 6 : (r.level_indent === 0 ? 1 : (r.level_indent === 1 ? 2 : (r.level_indent === 2 ? 3 : (r.level_indent === 3 ? 5 : 4)))));

    let colKelompok = '';
    let colTahapan = '';
    let colKegiatan = '';
    let colSubKeg = '';
    let colAkun = '';

    if (treeLvl === 1) colKelompok = r.kode || '';
    else if (treeLvl === 2) colTahapan = r.kode || '';
    else if (treeLvl === 3) colKegiatan = r.kode || '';
    else if (treeLvl === 4) colSubKeg = r.kode || '-';
    else if (treeLvl === 5) colAkun = r.kode_akun || r.kode || '';
    else if (treeLvl === 5.5) colSubKeg = r.kode || '-';

    const rowValues = [
      colKelompok,
      colTahapan,
      colKegiatan,
      colSubKeg,
      colAkun,
      r.uraian || '',
      isItem ? (r.computed_formula || '') : '',
      isItem && r.computed_volume !== null ? r.computed_volume : '',
      isItem ? (r.satuan_vol || '') : '',
      isItem && r.harga_satuan ? r.harga_satuan : '',
      r.computed_total || 0,
      '', // Kolom L: Kosong Spacer
      r.urutan || (idx + 1),
      r.pic_bagian || '',
      r.target_scope || ''
    ];

    const excelRow = ws1.addRow(rowValues);
    excelRow.height = isItem ? 20 : (treeLvl <= 2 ? 24 : 21);

    // Format & Styling per Level (Karakter SAKTI)
    if (treeLvl === 1) {
      // Level 1: Kelompok Belanja Utama (A / B) - SAKTI Yellow Highlight
      for (let c = 1; c <= 11; c++) {
        const cell = excelRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }; // Soft Pastel Yellow
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCA8A04' } },
          bottom: { style: 'medium', color: { argb: 'FFCA8A04' } }
        };
      }
      excelRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      excelRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      excelRow.getCell(11).numFmt = '#,##0';
      excelRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (treeLvl === 2) {
      // Level 2: Tahapan (I / II) - SAKTI Underlined Bold
      for (let c = 1; c <= 11; c++) {
        const cell = excelRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      }
      excelRow.getCell(2).font = { name: 'Calibri', size: 10.5, bold: true, underline: true, color: { argb: 'FF0F172A' } };
      excelRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      excelRow.getCell(6).font = { name: 'Calibri', size: 10.5, bold: true, underline: true, color: { argb: 'FF0F172A' } };
      excelRow.getCell(11).font = { name: 'Calibri', size: 10.5, bold: true, underline: true, color: { argb: 'FF0F172A' } };
      excelRow.getCell(11).numFmt = '#,##0';
      excelRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (treeLvl === 3) {
      // Level 3: Kegiatan (1..28) - SAKTI Output Bold
      for (let c = 1; c <= 11; c++) {
        const cell = excelRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } } };
      }
      excelRow.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      excelRow.getCell(3).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
      excelRow.getCell(11).numFmt = '#,##0';
      excelRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (treeLvl === 4) {
      // Level 4: Sub-Kegiatan / Header - SAKTI SubOutput
      for (let c = 1; c <= 11; c++) {
        const cell = excelRow.getCell(c);
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF334155' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFF8FAFC' } } };
      }
      excelRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      excelRow.getCell(11).numFmt = '#,##0';
      excelRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (treeLvl === 5) {
      // Level 5: Akun BAS 6-Digit (521211, dll) - SAKTI Akun Underlined
      for (let c = 1; c <= 11; c++) {
        const cell = excelRow.getCell(c);
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E3A8A' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } };
      }
      excelRow.getCell(5).font = { name: 'Calibri', size: 10, bold: true, underline: true, color: { argb: 'FF1E3A8A' } };
      excelRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      excelRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, underline: true, color: { argb: 'FF1E3A8A' } };
      excelRow.getCell(11).font = { name: 'Calibri', size: 10, bold: true, underline: true, color: { argb: 'FF1E3A8A' } };
      excelRow.getCell(11).numFmt = '#,##0';
      excelRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
    } else if (treeLvl === 5.5) {
      // Level 5.5: Sub-Header Item Teks (seperti a. Kantor/Inventaris)
      for (let c = 1; c <= 11; c++) {
        const cell = excelRow.getCell(c);
        cell.font = { name: 'Calibri', size: 9.5, italic: true, bold: true, color: { argb: 'FF475569' } };
        cell.border = { bottom: { style: 'thin', color: { argb: 'FFF8FAFC' } } };
      }
      excelRow.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      excelRow.getCell(11).numFmt = '#,##0';
      excelRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      // Level 6: Item Belanja Riil
      for (let c = 1; c <= 15; c++) {
        const cell = excelRow.getCell(c);
        cell.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF0F172A' } };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } } };
      }
      excelRow.getCell(8).numFmt = '#,##0'; // Vol
      excelRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' };
      excelRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' }; // Satuan
      excelRow.getCell(10).numFmt = '#,##0'; // Harga
      excelRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };
      excelRow.getCell(11).numFmt = '#,##0'; // Jumlah
      excelRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };

      // Kolom Metadata
      excelRow.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' }; // No
      excelRow.getCell(14).alignment = { vertical: 'middle', horizontal: 'center' }; // PIC
      excelRow.getCell(15).alignment = { vertical: 'middle', horizontal: 'center' }; // Sasaran
    }
  });

  // Baris Total Grand Total
  const totalRowNumber = ws1.rowCount + 1;
  const totalRow = ws1.addRow([
    'TOTAL PAGU RUH BELANJA:', '', '', '', '', '', '', '', '', '',
    summary.grandTotal || 0,
    '', '', '', ''
  ]);
  ws1.mergeCells(`A${totalRowNumber}:J${totalRowNumber}`);
  totalRow.height = 24;

  const totalLabelCell = ws1.getCell(`A${totalRowNumber}`);
  totalLabelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  totalLabelCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };

  const totalValCell = ws1.getCell(`K${totalRowNumber}`);
  totalValCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  totalValCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  totalValCell.alignment = { vertical: 'middle', horizontal: 'right' };
  totalValCell.numFmt = '#,##0';

  // Area Tanda Tangan: HANYA KETUA KPU KABUPATEN NGAWI
  ws1.addRow([]);
  const signDateRow = ws1.addRow(['', '', '', '', '', '', '', '', '', `NGAWI, ${tanggalUnduh}`]);
  const signTitle1 = ws1.addRow(['', '', '', '', '', '', '', '', '', 'Ketua Komisi Pemilihan Umum']);
  const signTitle2 = ws1.addRow(['', '', '', '', '', '', '', '', '', 'Kabupaten Ngawi,']);
  ws1.addRow([]);
  ws1.addRow([]);
  ws1.addRow([]);
  const namaKetua = settings.nama_ketua || 'SAMSU MUSTAKIM';
  const signName = ws1.addRow(['', '', '', '', '', '', '', '', '', namaKetua]);

  signDateRow.getCell(10).font = { name: 'Calibri', size: 10, bold: true };
  signTitle1.getCell(10).font = { name: 'Calibri', size: 10, bold: true };
  signTitle2.getCell(10).font = { name: 'Calibri', size: 10, bold: true };
  signName.getCell(10).font = { name: 'Calibri', size: 11, bold: true, underline: true };

  // Set Column Widths Sheet 1
  ws1.columns = [
    { width: 8 },  // Col A: Kelompok (A, B)
    { width: 8 },  // Col B: Tahapan (I., II.)
    { width: 8 },  // Col C: Kegiatan (1..28)
    { width: 10 }, // Col D: Sub-Kegiatan (a..d, -)
    { width: 11 }, // Col E: Akun BAS (521211, dll)
    { width: 48 }, // Col F: Uraian Komponen / Akun / Rincian Belanja
    { width: 22 }, // Col G: Rincian Perhitungan
    { width: 9 },  // Col H: Volume
    { width: 9 },  // Col I: Satuan
    { width: 16 }, // Col J: Harga Satuan
    { width: 18 }, // Col K: Jumlah (Rp)
    { width: 4 },  // Col L: Kolom Kosong Spacer
    { width: 6 },  // Col M: No
    { width: 11 }, // Col N: PIC
    { width: 11 }  // Col O: Sasaran
  ];

  // ==========================================================================
  // SHEET 2: Data_Kertas_Kerja (Flat Table Lengkap dengan Kode Level Terpisah)
  // ==========================================================================
  const ws2 = wb.addWorksheet('Data_Kertas_Kerja');

  // Siapkan peta leluhur (ancestor) untuk melengkapi kode level pada setiap item baris
  const rowByTreeId = {};
  rows.forEach(r => { rowByTreeId[r.tree_id] = r; });

  const headersSheet2 = [
    'No',
    'Level',
    'Kd_Kelompok',
    'Kd_Tahapan',
    'Kd_Kegiatan',
    'Kd_SubKeg',
    'Kd_Akun_BAS',
    'Uraian_Belanja',
    'Volume',
    'Satuan',
    'Rincian_Perhitungan',
    'Harga_Satuan',
    'Jumlah_Anggaran',
    'PIC_Subbag',
    'Sasaran',
    'Catatan_Revisi'
  ];

  const headerRow2 = ws2.addRow(headersSheet2);
  headerRow2.height = 22;
  headerRow2.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  exportRows.forEach((r, idx) => {
    const isItem = !r.is_header;
    const treeLvl = r.tree_level || (isItem ? 6 : (r.level_indent === 0 ? 1 : (r.level_indent === 1 ? 2 : (r.level_indent === 2 ? 3 : (r.level_indent === 3 ? 5 : 4)))));

    // Telusuri kode hierarki ke atas
    let kL1 = '';
    let kL2 = '';
    let kL3 = '';
    let kL4 = '';
    let kAkun = r.kode_akun || '';

    if (treeLvl === 1) kL1 = r.kode || '';
    else if (treeLvl === 2) kL2 = r.kode || '';
    else if (treeLvl === 3) kL3 = r.kode || '';
    else if (treeLvl === 4 || treeLvl === 5.5) kL4 = r.kode || '';

    let curP = r.parent_tree_id;
    while (curP && rowByTreeId[curP]) {
      const p = rowByTreeId[curP];
      const pLvl = p.tree_level;
      if (pLvl === 1 && !kL1) kL1 = p.kode || '';
      else if (pLvl === 2 && !kL2) kL2 = p.kode || '';
      else if (pLvl === 3 && !kL3) kL3 = p.kode || '';
      else if (pLvl === 4 && !kL4) kL4 = p.kode || '';
      else if (pLvl === 5 && !kAkun) kAkun = p.kode_akun || p.kode || '';
      curP = p.parent_tree_id;
    }

    const rValues = [
      r.urutan || (idx + 1),
      `L${treeLvl}`,
      kL1,
      kL2,
      kL3,
      kL4,
      kAkun,
      r.uraian || '',
      isItem && r.computed_volume !== null ? r.computed_volume : '',
      isItem ? (r.satuan_vol || '') : '',
      isItem ? (r.computed_formula || '') : '',
      isItem && r.harga_satuan ? r.harga_satuan : '',
      r.computed_total || 0,
      r.pic_bagian || '',
      r.target_scope || '',
      isItem ? (r.catatan_revisi_baris || '') : ''
    ];

    const dRow = ws2.addRow(rValues);
    dRow.height = 18;
    dRow.getCell(1).alignment = { horizontal: 'center' };
    dRow.getCell(2).alignment = { horizontal: 'center' };
    dRow.getCell(3).alignment = { horizontal: 'center' };
    dRow.getCell(4).alignment = { horizontal: 'center' };
    dRow.getCell(5).alignment = { horizontal: 'center' };
    dRow.getCell(6).alignment = { horizontal: 'center' };
    dRow.getCell(7).alignment = { horizontal: 'center' };
    dRow.getCell(9).numFmt = '#,##0';
    dRow.getCell(10).alignment = { horizontal: 'center' };
    dRow.getCell(12).numFmt = '#,##0';
    dRow.getCell(13).numFmt = '#,##0';
    dRow.getCell(14).alignment = { horizontal: 'center' };
    dRow.getCell(15).alignment = { horizontal: 'center' };
  });

  ws2.columns = [
    { width: 6 },  { width: 8 },  { width: 8 },  { width: 8 },  { width: 8 },
    { width: 10 }, { width: 12 }, { width: 45 }, { width: 10 }, { width: 10 },
    { width: 25 }, { width: 15 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 30 }
  ];

  // ==========================================================================
  // SHEET 3: Matriks_Revisi (Hanya Data Terevisi Beserta Rute Utamanya)
  // ==========================================================================
  const ws3 = wb.addWorksheet('Matriks_Revisi');
  const revComp = getRevisionComparison(periodeId);

  if (revComp && revComp.has_parent) {
    const parent = revComp.parent_periode;
    const revByRowId = revComp.by_row_id || {};

    const rowById = {};
    rows.forEach(r => { rowById[r.id] = r; });

    // 1. Identifikasi baris item yang berstatus REVISI
    const revisedRowIds = new Set();
    rows.forEach(r => {
      const diff = revByRowId[r.id];
      if (!r.is_header) {
        if (diff && (diff.status !== 'TETAP' || diff.diff !== 0 || diff.catatan)) {
          revisedRowIds.add(r.id);
        }
      } else {
        if (diff && (diff.status === 'BARU' || diff.catatan)) {
          revisedRowIds.add(r.id);
        }
      }
    });

    // 2. Kumpulkan seluruh rute utama (ancestor / parent-parent leveling)
    const includedTreeIds = new Set();
    revisedRowIds.forEach(id => {
      const r = rowById[id];
      if (!r) return;
      includedTreeIds.add(r.tree_id);
      let cur = r.parent_tree_id;
      while (cur && rowByTreeId[cur]) {
        includedTreeIds.add(cur);
        cur = rowByTreeId[cur].parent_tree_id;
      }
    });

    const sheet3Rows = rows.filter(r => includedTreeIds.has(r.tree_id));

    // Header Dokumen Sheet 3
    ws3.addRow(['MATRIKS PERUBAHAN RENCANA USULAN HALAMAN BELANJA (SEMULA - MENJADI)']);
    ws3.addRow(['KPU KABUPATEN NGAWI - PILKADA SERENTAK']);
    ws3.addRow([`Dokumen Semula: ${parent.nama || parent.versi_revisi}  ==>  Dokumen Menjadi: ${periode.nama_periode} (${periode.versi_revisi})`]);
    ws3.addRow([`Dasar Hukum: ${periode.dasar_pengesahan || '-'} | Nomor: ${periode.nomor_ba_tapd || '-'} | Tanggal: ${periode.tanggal_ba_tapd || '-'}`]);
    ws3.addRow([`Catatan Dokumen: ${periode.catatan_revisi || '-'}`]);
    ws3.addRow([]);

    ws3.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    ws3.getCell('A2').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };

    const headersSheet3 = [
      'No', 'Level', 'Kode', 'Uraian Kegiatan / Akun / Rincian Belanja',
      'Semula (Vol)', 'Semula (Harga)', 'Semula (Jumlah Rp)',
      'Menjadi (Vol)', 'Menjadi (Harga)', 'Menjadi (Jumlah Rp)',
      'Selisih (+/- Rp)', 'Status Perubahan', 'Alasan / Catatan Justifikasi'
    ];

    const hRow3 = ws3.addRow(headersSheet3);
    hRow3.height = 24;
    hRow3.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sheet3Rows.forEach((r, idx) => {
      const isItem = !r.is_header;
      const treeLvl = r.tree_level || (isItem ? 6 : (r.level_indent === 0 ? 1 : (r.level_indent === 1 ? 2 : (r.level_indent === 2 ? 3 : (r.level_indent === 3 ? 5 : 4)))));
      const indent = '  '.repeat(Math.max(0, treeLvl - 1));

      const diffInfo = revByRowId[r.id] || {
        status: isItem ? 'TETAP' : 'BAGIAN_RUTE',
        diff: 0,
        semula_vol: r.computed_volume, semula_harga: r.harga_satuan, semula_jumlah: r.computed_total,
        menjadi_vol: r.computed_volume, menjadi_harga: r.harga_satuan, menjadi_jumlah: r.computed_total,
        catatan: r.catatan_revisi_baris || ''
      };

      const rowValues = [
        r.urutan || (idx + 1),
        `L${treeLvl}`,
        r.kode || '',
        indent + (r.uraian || ''),
        isItem && diffInfo.semula_vol !== null ? diffInfo.semula_vol : '',
        isItem && diffInfo.semula_harga ? diffInfo.semula_harga : '',
        diffInfo.semula_jumlah || 0,
        isItem && diffInfo.menjadi_vol !== null ? diffInfo.menjadi_vol : '',
        isItem && diffInfo.menjadi_harga ? diffInfo.menjadi_harga : '',
        diffInfo.menjadi_jumlah || 0,
        diffInfo.diff || 0,
        diffInfo.status,
        diffInfo.catatan || ''
      ];

      const mRow = ws3.addRow(rowValues);
      mRow.height = 20;

      // Format Angka
      mRow.getCell(1).alignment = { horizontal: 'center' };
      mRow.getCell(2).alignment = { horizontal: 'center' };
      mRow.getCell(3).alignment = { horizontal: 'center' };
      mRow.getCell(5).numFmt = '#,##0';
      mRow.getCell(6).numFmt = '#,##0';
      mRow.getCell(7).numFmt = '#,##0';
      mRow.getCell(8).numFmt = '#,##0';
      mRow.getCell(9).numFmt = '#,##0';
      mRow.getCell(10).numFmt = '#,##0';
      mRow.getCell(11).numFmt = '#,##0';
      mRow.getCell(12).alignment = { horizontal: 'center' };

      // Highlight Status Perubahan SAKTI
      if (diffInfo.status === 'BERTAMBAH') {
        mRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Soft green
        mRow.getCell(12).font = { name: 'Calibri', bold: true, color: { argb: 'FF166534' } };
      } else if (diffInfo.status === 'BERKURANG') {
        mRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Soft red
        mRow.getCell(12).font = { name: 'Calibri', bold: true, color: { argb: 'FF991B1B' } };
      } else if (diffInfo.status === 'BARU') {
        mRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } }; // Soft purple
        mRow.getCell(12).font = { name: 'Calibri', bold: true, color: { argb: 'FF6B21A8' } };
      }
    });

    ws3.columns = [
      { width: 6 },  { width: 8 },  { width: 10 }, { width: 45 },
      { width: 12 }, { width: 15 }, { width: 18 },
      { width: 12 }, { width: 15 }, { width: 18 },
      { width: 18 }, { width: 16 }, { width: 40 }
    ];
  } else {
    // Dokumen Baseline Awal
    ws3.addRow(['MATRIKS PERUBAHAN RENCANA USULAN HALAMAN BELANJA (SEMULA - MENJADI)']);
    ws3.addRow(['KPU KABUPATEN NGAWI - PILKADA SERENTAK']);
    ws3.addRow([`Dokumen: ${periode ? (periode.nama_periode || periode.versi_revisi) : 'Baseline Awal'}`]);
    ws3.addRow(['Status: DOKUMEN BASELINE AWAL (NPHD INDUK)']);
    ws3.addRow(['Keterangan: Dokumen ini merupakan RUH Belanja Induk Baseline awal, belum memiliki pembanding revisi sebelumnya.']);
    ws3.addRow([]);
    ws3.addRow(['No', 'Level', 'Kode', 'Uraian Kegiatan / Akun / Rincian Belanja', 'Semula (Jumlah Rp)', 'Menjadi (Jumlah Rp)', 'Selisih (+/- Rp)', 'Status Perubahan', 'Alasan / Catatan Justifikasi']);
    ws3.addRow(['-', '-', '-', 'Tidak ada data perubahan (Baseline Awal)', 0, summary.grandTotal || 0, 0, 'BASELINE_AWAL', 'Dokumen Penetapan Induk']);

    ws3.columns = [
      { width: 6 }, { width: 8 }, { width: 10 }, { width: 45 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 40 }
    ];
  }

  // ==========================================================================
  // SHEET 4: Rekap_Alokasi (Resume Sesuai Bentuk Resume RKB Awal)
  // ==========================================================================
  const ws4 = wb.addWorksheet('Rekap_Alokasi');
  const sas = summary.bySasaran || {};
  const grandTotal = summary.grandTotal || 1;

  const dataSasaran = [
    { title: '1. KPU Kabupaten', scope: 'KAB', entitas: 'Satker KPU Kab. Ngawi', val: sas.KAB || 0, desc: 'Operasional satker, logistik sentral, bimtek, sosialisasi, advokasi hukum' },
    { title: '2. PPK (19 Kecamatan)', scope: 'PPK', entitas: '19 Kecamatan', val: sas.PPK || 0, desc: 'Operasional sekretariat PPK, honorarium PPK & sekretariat 19 kecamatan' },
    { title: '3. PPS Murni (217 Desa)', scope: 'PPS', entitas: '217 Desa / Kelurahan', val: sas.PPS || 0, desc: 'Operasional sekretariat PPS, honorarium PPS & sekretariat 217 desa' },
    { title: '4. Pantarlih / PPDP', scope: 'PANTARLIH', entitas: '2.537 Petugas', val: sas.PANTARLIH || 0, desc: 'Honorarium petugas pemutakhiran data pemilih (di bawah koordinasi PPS)' },
    { title: '5. TPS (KPPS + Linmas)', scope: 'TPS', entitas: '1.371 TPS', val: sas.TPS || 0, desc: 'Honorarium KPPS (7 org) dan Linmas (2 org) per TPS se-Kabupaten Ngawi' }
  ];

  const totalPenyelenggara = (sas.KAB || 0) + (sas.PPK || 0) + (sas.PPS || 0) + (sas.PANTARLIH || 0) + (sas.TPS || 0);
  const pctPenyelenggara = ((totalPenyelenggara / grandTotal) * 100).toFixed(2) + '%';
  const valPeserta = sas.PESERTA || 0;
  const pctPeserta = ((valPeserta / grandTotal) * 100).toFixed(2) + '%';

  ws4.addRow(['RESUME ALOKASI ANGGARAN RUH BELANJA']);
  ws4.addRow([`Dokumen: ${periode ? periode.nama_periode : 'Pilkada'} | Versi: ${periode ? periode.versi_revisi : '-'}`]);
  ws4.addRow([`Total Pagu Dokumen: Rp ${grandTotal.toLocaleString('id-ID')}`]);
  ws4.addRow([]);

  ws4.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  ws4.getCell('A2').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };

  // Tabel 1: Resume Sasaran Anggaran
  ws4.addRow(['=== 1. RESUME SASARAN ANGGARAN (FORMAT RKB AWAL) ===']);
  const hRow4_1 = ws4.addRow(['No', 'Kelompok Sasaran', 'Entitas / Satuan Alokasi', 'Pagu Anggaran (Rp)', 'Persentase (%)', 'Keterangan Ruang Lingkup']);
  hRow4_1.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    c.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  dataSasaran.forEach((d, idx) => {
    const pct = ((d.val / grandTotal) * 100).toFixed(2) + '%';
    const r = ws4.addRow([idx + 1, d.title, d.entitas, d.val, pct, d.desc]);
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(4).numFmt = '#,##0';
    r.getCell(5).alignment = { horizontal: 'center' };
  });

  const totPenyRow = ws4.addRow(['', 'TOTAL ALOKASI PENYELENGGARA (1 s.d 5):', 'Akumulasi Seluruh Tingkatan', totalPenyelenggara, pctPenyelenggara, 'Akumulasi anggaran seluruh tingkatan penyelenggara']);
  totPenyRow.font = { bold: true };
  totPenyRow.getCell(4).numFmt = '#,##0';
  totPenyRow.getCell(5).alignment = { horizontal: 'center' };

  const pesertaRow = ws4.addRow(['6', 'Peserta Pemilihan', 'Paslon & Parpol', valPeserta, pctPeserta, 'Bahan kampanye, APK, fasilitasi debat paslon, audit KAP']);
  pesertaRow.getCell(1).alignment = { horizontal: 'center' };
  pesertaRow.getCell(4).numFmt = '#,##0';
  pesertaRow.getCell(5).alignment = { horizontal: 'center' };

  const grandTotRow = ws4.addRow(['', 'TOTAL PAGU RUH BELANJA:', 'Hibah NPHD Pilkada', grandTotal, '100.00%', '100% BALANCE']);
  grandTotRow.font = { bold: true };
  grandTotRow.getCell(4).numFmt = '#,##0';
  grandTotRow.getCell(5).alignment = { horizontal: 'center' };

  // Tabel 2: Rekapitulasi Tahapan Program
  ws4.addRow([]);
  ws4.addRow(['=== 2. REKAPITULASI TAHAPAN PROGRAM ===']);
  const hRow4_2 = ws4.addRow(['Tahapan Program', 'Pagu Anggaran (Rp)', 'Persentase (%)', '', '', '']);
  hRow4_2.eachCell((c, idx) => {
    if (idx <= 3) {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      c.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  const banner = summary.banner || {};
  const tahapItems = [
    { name: 'I. Tahapan Persiapan dan Pelaksanaan', val: banner.tahapan1 || 0 },
    { name: 'II. Honorarium Penyelenggara Pemilihan', val: banner.honor || 0 }
  ];
  tahapItems.forEach(t => {
    const pct = ((t.val / grandTotal) * 100).toFixed(2) + '%';
    const r = ws4.addRow([t.name, t.val, pct, '', '', '']);
    r.getCell(2).numFmt = '#,##0';
    r.getCell(3).alignment = { horizontal: 'center' };
  });

  // Tabel 3: Rekapitulasi Subbagian PIC
  ws4.addRow([]);
  ws4.addRow(['=== 3. REKAPITULASI ALOKASI SUBBAGIAN (PIC) ===']);
  const hRow4_3 = ws4.addRow(['Subbagian / PIC', 'Pagu Anggaran (Rp)', 'Persentase (%)', '', '', '']);
  hRow4_3.eachCell((c, idx) => {
    if (idx <= 3) {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      c.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  const byPic = summary.byPic || {};
  const picNames = {
    KUL: 'Keuangan, Umum & Logistik (KUL)',
    TEKNIS: 'Teknis Penyelenggaraan Pemilu',
    RENDATIN: 'Perencanaan, Data & Informasi (Rendatin)',
    HUKUM: 'Hukum & SDM'
  };
  ['KUL', 'TEKNIS', 'RENDATIN', 'HUKUM'].forEach(p => {
    const val = byPic[p] || 0;
    const pct = ((val / grandTotal) * 100).toFixed(2) + '%';
    const r = ws4.addRow([picNames[p] || p, val, pct, '', '', '']);
    r.getCell(2).numFmt = '#,##0';
    r.getCell(3).alignment = { horizontal: 'center' };
  });

  // Tabel 4: Rekapitulasi Akun Belanja (BAS 6-Digit)
  ws4.addRow([]);
  ws4.addRow(['=== 4. REKAPITULASI AKUN BELANJA (BAGAN AKUN STANDAR) ===']);
  const hRow4_4 = ws4.addRow(['Kode Akun', 'Uraian Akun Belanja (BAS)', 'Pagu Anggaran (Rp)', 'Persentase (%)', '', '']);
  hRow4_4.eachCell((c, idx) => {
    if (idx <= 4) {
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      c.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    }
  });

  const byAkun = summary.byAkun || {};
  Object.keys(byAkun).sort().forEach(kd => {
    const val = byAkun[kd] || 0;
    const pct = ((val / grandTotal) * 100).toFixed(2) + '%';
    const r = ws4.addRow([kd, akunMap[kd] || 'Belanja', val, pct, '', '']);
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(3).numFmt = '#,##0';
    r.getCell(4).alignment = { horizontal: 'center' };
  });

  ws4.columns = [
    { width: 35 }, { width: 35 }, { width: 25 }, { width: 18 }, { width: 18 }, { width: 50 }
  ];

  // Return Buffer XLSX ExcelJS
  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  exportRkbToExcelBuffer
};
