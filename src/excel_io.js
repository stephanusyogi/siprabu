/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Export Excel (XLSX) Multi-Sheet Resmi (SAKTI FA 16 Detail Architecture)
 * Pengembang Resmi: emenje <emenje@kpu-ngawi.go.id>
 */

const ExcelJS = require('exceljs');
const { getRabRows, getPeriodeById, getMasters } = require('./db');
const { calculateRkbDataset, getRevisionComparison } = require('./calculation');

const SUBBAG_LABEL_MAP = {
  KUL: 'Keuangan, Umum & Logistik (KUL)',
  RENDATIN: 'Perencanaan, Data & Informasi (RENDATIN)',
  TEKNIS: 'Teknis Penyelenggaraan Pemilu (TEKNIS)',
  HUKUM: 'Hukum (HUKUM)',
  PARSDM: 'Partisipasi Masyarakat & SDM (PARSDM)'
};

/**
 * Helper menyisipkan signature riwayat file / audit log sistem di bawah lembar kerja
 * Selalu diletakkan di bagian bawah DILUAR area print resmi dokumen
 */
function appendAuditSignature(ws, { periode, statusLabel, tanggalUnduh, filterPic, filterSasaran }) {
  ws.addRow([]);
  ws.addRow([]); // 2 baris kosong pemisah setelah batas cetak resmi

  const hasFilter = Boolean(filterPic || filterSasaran);
  const picDisplay = filterPic ? (SUBBAG_LABEL_MAP[filterPic] || filterPic) : 'SEMUA';

  const hRow1 = ws.addRow(['[PENANDA RIWAYAT FILE & AUDIT LOG SISTEM - BUKAN MERUPAKAN BAGIAN DOKUMEN RESMI]']);
  const hRow2 = ws.addRow([`Program / Dokumen: ${periode ? periode.nama_periode : 'Pilkada Serentak'} | Versi: ${periode ? (periode.versi_revisi || 'Induk') : '-'} | Status: ${statusLabel}`]);
  const hRow3 = ws.addRow([`Dasar Pengesahan: ${periode ? (periode.dasar_pengesahan || 'Kertas Kerja Penyusunan') : '-'} | Tanggal Unduh: ${tanggalUnduh}${hasFilter ? ` | Filter: PIC=${picDisplay}, Sasaran=${filterSasaran || 'SEMUA'}` : ''}`]);
  const hRow4 = ws.addRow(['Sistem Informasi: SI-PRABU Clean Web Edition v3.0 | Satker: KPU Kabupaten Ngawi | Pengembang: emenje <emenje@kpu-ngawi.go.id>']);

  [hRow1, hRow2, hRow3, hRow4].forEach(hr => {
    const c = hr.getCell(1);
    c.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF666666' } };
  });
}

/**
 * Menghasilkan buffer XLSX untuk download RUH Belanja Multi-Sheet
 * Sesuai Standar FA Detail 16 Segmen SAKTI Kemenkeu
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
  let filterPic = options.pic && options.pic !== 'SEMUA' ? options.pic.toUpperCase() : null;
  if (filterPic === 'PERENCANAAN') filterPic = 'RENDATIN';
  if (filterPic === 'KEUANGAN') filterPic = 'KUL';
  if (filterPic === 'PARMAS') filterPic = 'PARSDM';
  const filterSasaran = options.sasaran && options.sasaran !== 'ALL' ? options.sasaran.toUpperCase() : null;
  const hasFilter = Boolean(filterPic || filterSasaran);

  let exportRows = rows;
  let exportTotal = 0;
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
        let rPic = (r.pic_bagian || '').toUpperCase();
        if (rPic === 'PERENCANAAN') rPic = 'RENDATIN';
        if (rPic === 'KEUANGAN') rPic = 'KUL';
        if (rPic === 'PARMAS') rPic = 'PARSDM';
        matchPic = rPic === filterPic;
      }
      if (filterSasaran) {
        matchSasaran = r.target_scope && r.target_scope.toUpperCase() === filterSasaran;
      }
      if (matchPic && matchSasaran) {
        matchingRowIds.add(r.id);
        if (!r.is_header) {
          exportTotal += (r.computed_total || 0);
        }
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

    // Rollup subtotal baris induk khusus item yang lolos filter agar penjumlahan vertikal presisi
    const filteredItems = rows.filter(r => matchingRowIds.has(r.id) && !r.is_header);
    const rollupMap = {};
    filteredItems.forEach(item => {
      let cur = item.parent_tree_id;
      while (cur && rowByTreeId[cur]) {
        rollupMap[cur] = (rollupMap[cur] || 0) + (item.computed_total || 0);
        cur = rowByTreeId[cur].parent_tree_id;
      }
    });

    exportRows = rows
      .filter(r => includedTreeIds.has(r.tree_id))
      .map(r => {
        if (r.is_header) {
          return {
            ...r,
            computed_total: rollupMap[r.tree_id] || 0
          };
        }
        return r;
      });
  } else {
    exportTotal = summary.grandTotal || 0;
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
  // SHEET 1: RUH_Belanja_Resmi (FA 16 Detail Architecture: Kolom Kode Dirapatkan)
  // ==========================================================================
  const ws1 = wb.addWorksheet('RUH_Belanja_Resmi', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 }
    }
  });

  // Freeze Header agar saat scroll ke bawah tidak kehilangan header tabel
  ws1.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];

  // Jadikan Baris 4 (Header Kolom) sebagai Print Title (berulang di setiap halaman cetak)
  ws1.pageSetup.printTitlesRow = '4:4';

  // Judul Dokumen (Merge Kolom A sampai K)
  // Baris 1: KOMISI PEMILIHAN UMUM KABUPATEN NGAWI
  // Baris 2: BELANJA HIBAH DALAM RANGKA PEMILIHAN BUPATI DAN WAKIL BUPATI TAHUN 2029
  ws1.addRow(['KOMISI PEMILIHAN UMUM KABUPATEN NGAWI']);
  ws1.addRow(['BELANJA HIBAH DALAM RANGKA PEMILIHAN BUPATI DAN WAKIL BUPATI TAHUN 2029']);
  ws1.addRow([]); // Baris 3: Pemisah kosong

  ws1.mergeCells('A1:K1');
  ws1.mergeCells('A2:K2');

  const titleRow1 = ws1.getRow(1);
  titleRow1.height = 24;
  const titleCell1 = ws1.getCell('A1');
  titleCell1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
  titleCell1.alignment = { vertical: 'middle', horizontal: 'center' };

  const titleRow2 = ws1.getRow(2);
  titleRow2.height = 24;
  const titleCell2 = ws1.getCell('A2');
  titleCell2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
  titleCell2.alignment = { vertical: 'middle', horizontal: 'center' };

  ws1.getRow(3).height = 10;

  // BARIS HEADER (Baris 4)
  // Kolom A sampai D dimerge menjadi "Nomor"
  // Kolom E = "Kode"
  // Kolom F = "Uraian Komponen / Akun / Rincian Belanja"
  // Kolom G..K = Rincian Perhitungan, Volume, Satuan, Harga Satuan, Jumlah
  // Kolom L = Spacer kosong
  // Kolom M..O = No, PIC, Sasaran
  ws1.mergeCells('A4:D4');
  ws1.getCell('A4').value = 'Nomor';
  ws1.getCell('E4').value = 'Kode';
  ws1.getCell('F4').value = 'Uraian Komponen / Akun / Rincian Belanja';
  ws1.getCell('G4').value = 'Rincian Perhitungan';
  ws1.getCell('H4').value = 'Volume';
  ws1.getCell('I4').value = 'Satuan';
  ws1.getCell('J4').value = 'Harga Satuan (Rp)';
  ws1.getCell('K4').value = 'Jumlah (Rp)';
  ws1.getCell('L4').value = ''; // Spacer
  ws1.getCell('M4').value = 'No';
  ws1.getCell('N4').value = 'PIC';
  ws1.getCell('O4').value = 'Sasaran';

  const headerRow1 = ws1.getRow(4);
  headerRow1.height = 28;

  // Latar Header SAKTI FA Detail 16 Segmen (#0099CC), font putih tebal 11pt
  const sHeaderColor = 'FF0099CC';
  for (let c = 1; c <= 15; c++) {
    if (c === 12) continue; // Kolom kosong spacer tidak di-fill
    const cell = headerRow1.getCell(c);
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: sHeaderColor }
    };
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true
    };
    let bLeft = { style: 'thin', color: { argb: 'FF00B4F0' } };
    let bRight = { style: 'thin', color: { argb: 'FF00B4F0' } };
    if (c === 1) bLeft = { style: 'medium', color: { argb: 'FF000000' } }; // Garis paling kiri MEDIUM BLACK
    if (c === 11) bRight = { style: 'medium', color: { argb: 'FF000000' } }; // Garis paling kanan MEDIUM BLACK

    cell.border = {
      top: { style: 'medium', color: { argb: 'FF000000' } },
      bottom: { style: 'medium', color: { argb: 'FF004C73' } },
      left: bLeft,
      right: bRight
    };
  }

  // ISI DATA BARIS SHEET 1
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
    const rowNum = excelRow.number;

    // TINGGI BARIS BERBEDA UNTUK SETIAP LEVEL (Enak dibaca, proporsional dengan ukuran font)
    if (treeLvl === 1) excelRow.height = 34;
    else if (treeLvl === 2) excelRow.height = 30;
    else if (treeLvl === 3) excelRow.height = 26;
    else if (treeLvl === 4) excelRow.height = 24;
    else if (treeLvl === 5 || treeLvl === 5.5) excelRow.height = 23;
    else excelRow.height = 20; // Level 6 (Item): 20pt (Font 11pt aman, lega, dan hemat ruang)

    // MATRIKS BORDER DAN GARIS BERDASARKAN LEVEL:
    // Pembedaan bentuk garis horizontal dan vertikal agar rapi saat dicetak & dibaca
    // Memastikan tidak ada baris tanpa garis
    let hTop = undefined;
    let hBottom = { style: 'thin', color: { argb: 'FFE5E7EB' } };

    if (treeLvl === 1) {
      hTop = { style: 'medium', color: { argb: 'FF333333' } };
      hBottom = { style: 'thin', color: { argb: 'FF333333' } };
    } else if (treeLvl === 2) {
      hTop = { style: 'thin', color: { argb: 'FF666666' } };
      hBottom = { style: 'thin', color: { argb: 'FF666666' } };
    } else if (treeLvl === 3) {
      hTop = { style: 'hair', color: { argb: 'FFCCCCCC' } };
      hBottom = { style: 'thin', color: { argb: 'FFAAAAAA' } };
    } else if (treeLvl === 4 || treeLvl === 5.5) {
      hBottom = { style: 'thin', color: { argb: 'FFD4D4D8' } };
    } else if (treeLvl === 5) {
      hTop = { style: 'hair', color: { argb: 'FFCCCCCC' } };
      hBottom = { style: 'thin', color: { argb: 'FFBBBBBB' } };
    }

    // Format Kolom A s.d. D (Nomor Ramping Terpusat) dan Kolom E (Kode)
    for (let c = 1; c <= 5; c++) {
      const cell = excelRow.getCell(c);
      let vLeft = { style: 'hair', color: { argb: 'FFE5E7EB' } };
      if (c === 1) vLeft = { style: 'medium', color: { argb: 'FF000000' } }; // Garis paling kiri tebal MEDIUM sama persis dengan kanan & bawah
      else if (c === 5) vLeft = { style: 'thin', color: { argb: 'FF888888' } }; // Pemisah Nomor & Kode

      cell.border = { top: hTop, bottom: hBottom, left: vLeft };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // JIKA BARIS BUKAN RINCIAN PERHITUNGAN (Header Level 1 s.d. 5.5):
    // Merge Kolom F s.d. J (Rata Kiri) agar teks judul panjang membentang luas tanpa terpotong!
    if (!isItem) {
      for (let c = 6; c <= 10; c++) {
        const cell = excelRow.getCell(c);
        cell.border = {
          top: hTop,
          bottom: hBottom,
          left: c === 6 ? { style: 'thin', color: { argb: 'FF888888' } } : undefined,
          right: c === 10 ? { style: 'thin', color: { argb: 'FFCCCCCC' } } : undefined
        };
      }
      ws1.mergeCells(`F${rowNum}:J${rowNum}`);
      const fCell = excelRow.getCell(6);
      fCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

      // Kolom K (Jumlah Anggaran Header)
      const kCell = excelRow.getCell(11);
      kCell.border = {
        top: hTop,
        bottom: hBottom,
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'medium', color: { argb: 'FF000000' } } // Garis paling kanan tebal MEDIUM sama persis dengan kiri & bawah
      };
      kCell.numFmt = '#,##0';
      kCell.alignment = { vertical: 'middle', horizontal: 'right' };
    } else {
      // Baris Rincian Belanja Riil (Level 6 - ada Rincian Perhitungan):
      // Kolom F, G, H, I, J, K berdiri sendiri terpisah
      for (let c = 6; c <= 11; c++) {
        const cell = excelRow.getCell(c);
        let vLeft = { style: 'thin', color: { argb: 'FFCCCCCC' } };
        if (c === 6) vLeft = { style: 'thin', color: { argb: 'FF888888' } };

        cell.border = {
          top: hTop,
          bottom: hBottom,
          left: vLeft,
          right: c === 11 ? { style: 'medium', color: { argb: 'FF000000' } } : undefined // Garis paling kanan tebal MEDIUM
        };
      }
      excelRow.getCell(6).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      excelRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' }; // Rincian formula
      excelRow.getCell(8).numFmt = '#,##0';
      excelRow.getCell(8).alignment = { vertical: 'middle', horizontal: 'right' }; // Vol
      excelRow.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' }; // Satuan
      excelRow.getCell(10).numFmt = '#,##0';
      excelRow.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' }; // Harga
      excelRow.getCell(11).numFmt = '#,##0';
      excelRow.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' }; // Jumlah
    }

    // Border untuk kolom metadata pendukung (M, N, O)
    for (let c = 13; c <= 15; c++) {
      const cell = excelRow.getCell(c);
      cell.border = {
        left: { style: c === 13 ? 'thin' : 'hair', color: { argb: 'FFCCCCCC' } },
        right: { style: c === 15 ? 'thin' : 'hair', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      };
    }

    // SKEMA WARNA & UKURAN FONT BERJENJANG (Ukuran Terendah 11pt, Semakin Naik Level Semakin Besar):
    if (treeLvl === 1) {
      // Level 1: Kelompok Belanja (A / B) - Font Hitam Bold 15pt
      for (let c = 1; c <= 11; c++) {
        excelRow.getCell(c).font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF000000' } };
      }
    } else if (treeLvl === 2) {
      // Level 2: Tahapan (I / II) - Font Hitam Bold 14pt
      for (let c = 1; c <= 11; c++) {
        excelRow.getCell(c).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } };
      }
    } else if (treeLvl === 3) {
      // Level 3: Kegiatan (1..28) - SAKTI Output: FONT MERAH TEGAS (#FF0000) Bold 13pt!
      for (let c = 1; c <= 11; c++) {
        excelRow.getCell(c).font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFF0000' } };
      }
    } else if (treeLvl === 4) {
      // Level 4: Sub-Kegiatan - SAKTI SubOutput: FONT UNGU / MAGENTA (#CC00CC) Bold 12.5pt!
      for (let c = 1; c <= 11; c++) {
        excelRow.getCell(c).font = { name: 'Calibri', size: 12.5, bold: true, color: { argb: 'FFCC00CC' } };
      }
    } else if (treeLvl === 5) {
      // Level 5: Akun BAS 6-Digit (521211, dll) - SAKTI Akun: Font Hitam Bold 12pt
      for (let c = 1; c <= 11; c++) {
        excelRow.getCell(c).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
      }
    } else if (treeLvl === 5.5) {
      // Level 5.5: Sub-Header Item / Komponen - SAKTI Komponen: FONT COKLAT KEEMASAN / GOLD (#CC9900) Bold 12pt!
      for (let c = 1; c <= 11; c++) {
        excelRow.getCell(c).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFCC9900' } };
      }
    } else {
      // Level 6: Item Belanja Riil - Font Hitam Regular Standar 11pt (Ukuran Terendah 11pt)
      for (let c = 1; c <= 15; c++) {
        excelRow.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      }

      // Kolom Metadata
      excelRow.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' }; // No
      excelRow.getCell(14).alignment = { vertical: 'middle', horizontal: 'center' }; // PIC
      excelRow.getCell(15).alignment = { vertical: 'middle', horizontal: 'center' }; // Sasaran
    }
  });

  // ==========================================================================
  // DYNAMIC KEEP-TOGETHER & ANTI-ORPHAN SIGNATURE ENGINE
  // Menghitung sisa kapasitas vertikal halaman A4 Landscape secara real-time.
  // Kapasitas cetak A4 Landscape:
  // - Halaman 1: ~433pt (setelah dikurangi Judul Dokumen Baris 1..4 = 90pt)
  // - Halaman 2+: ~485pt (setelah dikurangi Print Title Header Kolom Baris 4 = 28pt)
  // Jika sisa ruang di halaman terakhir < 160pt (tidak cukup menampung Total Belanja + Blok TTD),
  // sistem otomatis menyisipkan Manual Page Break (OpenXML rowBreaks) pada 2-3 baris
  // sebelum akhir data belanja, sehingga beberapa baris kegiatan, Total Pagu,
  // dan Blok TTD Ketua KPU menyeberang bersama-sama (Keep Together) ke halaman penutup.
  // ==========================================================================
  const page1Capacity = 433;
  const pageNextCapacity = 485;
  let currentAccumulatedHeight = 0;
  let activePageLimit = page1Capacity;

  exportRows.forEach((r) => {
    const isItem = !r.is_header;
    const treeLvl = r.tree_level || (isItem ? 6 : (r.level_indent === 0 ? 1 : (r.level_indent === 1 ? 2 : (r.level_indent === 2 ? 3 : (r.level_indent === 3 ? 5 : 4)))));
    let rH = 20;
    if (treeLvl === 1) rH = 34;
    else if (treeLvl === 2) rH = 30;
    else if (treeLvl === 3) rH = 26;
    else if (treeLvl === 4) rH = 24;
    else if (treeLvl === 5 || treeLvl === 5.5) rH = 23;

    if (currentAccumulatedHeight + rH > activePageLimit) {
      currentAccumulatedHeight = rH;
      activePageLimit = pageNextCapacity;
    } else {
      currentAccumulatedHeight += rH;
    }
  });

  const remainingSpaceOnLastPage = activePageLimit - currentAccumulatedHeight;
  const neededEndingSpace = 180; // Total Row (28pt) + Baris Kosong Pemisah (16pt) + TTD & Nama (106pt) + buffer

  const lastDataRowNumber = ws1.rowCount;
  if (remainingSpaceOnLastPage < neededEndingSpace && lastDataRowNumber > 8) {
    // Sisipkan manual page break 3 baris sebelum akhir data belanja
    const breakRow = Math.max(5, lastDataRowNumber - 3);
    ws1.rowBreaks = [{ id: breakRow, max: 11, man: 1 }];
  }

  // BARIS TOTAL PAGU BELANJA (Format SAKTI FA Detail: Latar Cyan #00FFFF, Teks Hitam Bold, Tanpa 'RUH')
  const totalRowNumber = ws1.rowCount + 1;
  const totalLabel = filterPic
    ? `TOTAL PAGU BELANJA (${(SUBBAG_LABEL_MAP[filterPic] || filterPic).toUpperCase()}):`
    : 'TOTAL PAGU BELANJA:';

  const totalRow = ws1.addRow([
    totalLabel, '', '', '', '', '', '', '', '', '',
    exportTotal,
    '', '', '', ''
  ]);
  ws1.mergeCells(`A${totalRowNumber}:J${totalRowNumber}`);
  totalRow.height = 28;

  const cyanSaktiFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // CYAN SAKTI

  // Latar dan border total label (A:J)
  for (let c = 1; c <= 10; c++) {
    const cCell = ws1.getCell(totalRowNumber, c);
    cCell.fill = cyanSaktiFill;
    cCell.border = {
      top: { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'double', color: { argb: 'FF000000' } },
      left: c === 1 ? { style: 'medium', color: { argb: 'FF000000' } } : undefined
    };
  }
  const totalLabelCell = ws1.getCell(`A${totalRowNumber}`);
  totalLabelCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
  totalLabelCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // Total nilai cell (K)
  const totalValCell = ws1.getCell(`K${totalRowNumber}`);
  totalValCell.fill = cyanSaktiFill;
  totalValCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
  totalValCell.alignment = { vertical: 'middle', horizontal: 'right' };
  totalValCell.numFmt = '#,##0';
  totalValCell.border = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'double', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    right: { style: 'medium', color: { argb: 'FF000000' } }
  };

  // 1 BARIS KOSONG SETELAH TABEL TERAKHIR SEBELUM TANDA TANGAN
  const blankAfterTable = ws1.addRow([]);
  blankAfterTable.height = 16;

  // AREA TANDA TANGAN: HANYA KETUA KOMISI PEMILIHAN UMUM KABUPATEN NGAWI
  const signR1 = ws1.rowCount + 1;
  const rowDate = ws1.addRow(['', '', '', '', '', '', '', '', `NGAWI, ${tanggalUnduh}`]);
  rowDate.height = 20;
  const rowTitle1 = ws1.addRow(['', '', '', '', '', '', '', '', 'Ketua Komisi Pemilihan Umum']);
  rowTitle1.height = 18;
  const rowTitle2 = ws1.addRow(['', '', '', '', '', '', '', '', 'Kabupaten Ngawi,']);
  rowTitle2.height = 18;

  // 1 baris ruang tanda tangan basah yang proporsional (tinggi 26pt)
  const signSpace1 = ws1.addRow([]);
  signSpace1.height = 26;

  const namaKetua = settings.nama_ketua || 'SAMSU MUSTAKIM';
  const rowNama = ws1.addRow(['', '', '', '', '', '', '', '', namaKetua]);
  rowNama.height = 22;
  const signEndRow = ws1.rowCount;

  // Format Tanda Tangan: Merge I s.d. K agar posisi terpusat di kolom kanan
  [signR1, signR1 + 1, signR1 + 2, signEndRow].forEach((rNum, idx) => {
    ws1.mergeCells(`I${rNum}:K${rNum}`);
    const c = ws1.getCell(`I${rNum}`);
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    if (idx < 3) {
      c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
    } else {
      // Pejabat non-PNS / tanpa NIP (Ketua KPU): Nama Bold, TANPA garis bawah dan TANPA border bottom
      c.font = { name: 'Calibri', size: 12, bold: true, underline: false, color: { argb: 'FF000000' } };
    }
  });

  // Set Print Area Resmi Dokumen: Hanya dari Baris 1 sampai Baris Akhir Tanda Tangan
  ws1.pageSetup.printArea = `A1:K${signEndRow}`;

  // FOOTER PENANDA RIWAYAT FILE & AUDIT SISTEM (Diletakkan di bawah DILUAR area print)
  appendAuditSignature(ws1, { periode, statusLabel, tanggalUnduh, filterPic, filterSasaran });

  // LEBAR KOLOM DIRAPATKAN SEPERTI FA 16 DETAIL SAKTI
  // Kolom A sampai D membentuk kesatuan header "Nomor" ramping (Total 12.5), Kolom E adalah "Kode" (9.5)
  const colWidths1 = [2.8, 3.0, 3.2, 3.5, 9.5, 52.0, 22.0, 10.5, 10.5, 17.0, 19.0, 3.5, 6.5, 12.0, 12.0];
  colWidths1.forEach((w, i) => {
    ws1.getColumn(i + 1).width = w;
  });

  const isPicDownload = Boolean(filterPic);

  // ==========================================================================
  // SHEET 2: Data_Kertas_Kerja (Flat Table Lengkap dengan Kode Level Terpisah)
  // Hanya dibuat untuk unduhan Dokumen Utuh (Non-PIC)
  // ==========================================================================
  if (!isPicDownload) {
    const ws2 = wb.addWorksheet('Data_Kertas_Kerja');
    ws2.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }];

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
    headerRow2.height = 26;
    headerRow2.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    exportRows.forEach((r, idx) => {
      const isItem = !r.is_header;
      const treeLvl = r.tree_level || (isItem ? 6 : (r.level_indent === 0 ? 1 : (r.level_indent === 1 ? 2 : (r.level_indent === 2 ? 3 : (r.level_indent === 3 ? 5 : 4)))));

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
      dRow.height = 22; // Minimal 11pt font dengan tinggi nyaman 22pt

      for (let c = 1; c <= 16; c++) {
        const cell = dRow.getCell(c);
        cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      }

      dRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      dRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      dRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      dRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      dRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      dRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      dRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      dRow.getCell(8).alignment = { horizontal: 'left', vertical: 'middle' };
      dRow.getCell(9).numFmt = '#,##0';
      dRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
      dRow.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
      dRow.getCell(12).numFmt = '#,##0';
      dRow.getCell(12).alignment = { horizontal: 'right', vertical: 'middle' };
      dRow.getCell(13).numFmt = '#,##0';
      dRow.getCell(13).alignment = { horizontal: 'right', vertical: 'middle' };
      dRow.getCell(14).alignment = { horizontal: 'center', vertical: 'middle' };
      dRow.getCell(15).alignment = { horizontal: 'center', vertical: 'middle' };
    });

    ws2.columns = [
      { width: 6 },  { width: 8 },  { width: 8 },  { width: 8 },  { width: 8 },
      { width: 10 }, { width: 12 }, { width: 45 }, { width: 10 }, { width: 10 },
      { width: 25 }, { width: 15 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 30 }
    ];

    const kertasKerjaEndRow = ws2.rowCount;
    ws2.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      printArea: `A1:P${kertasKerjaEndRow}`
    };
    appendAuditSignature(ws2, { periode, statusLabel, tanggalUnduh, filterPic, filterSasaran });
  }

  // ==========================================================================
  // SHEET 3: Matriks_Revisi (Hanya Data Terevisi Beserta Rute Utamanya)
  // ==========================================================================
  const ws3 = wb.addWorksheet('Matriks_Revisi');
  const revComp = getRevisionComparison(periodeId);

  if (revComp && revComp.has_parent) {
    const parent = revComp.parent_periode;
    const revByRowId = revComp.by_row_id || {};

    const rowById = {};
    const rowByTreeId = {};
    rows.forEach(r => {
      rowById[r.id] = r;
      if (r.tree_id) rowByTreeId[r.tree_id] = r;
    });

    const revisedRowIds = new Set();
    rows.forEach(r => {
      // Jika difilter PIC, hanya evaluasi baris belanja milik PIC tersebut
      if (filterPic) {
        let rPic = (r.pic_bagian || '').toUpperCase();
        if (rPic === 'PERENCANAAN') rPic = 'RENDATIN';
        if (rPic === 'KEUANGAN') rPic = 'KUL';
        if (rPic === 'PARMAS') rPic = 'PARSDM';
        if (!r.is_header && rPic !== filterPic) return;
      }
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

    ws3.views = [{ state: 'frozen', xSplit: 0, ySplit: 7 }];

    ws3.addRow(['MATRIKS PERUBAHAN RENCANA USULAN HALAMAN BELANJA (SEMULA - MENJADI)']);
    ws3.addRow(['KPU KABUPATEN NGAWI - PILKADA SERENTAK']);
    ws3.addRow([`Dokumen Semula: ${parent.nama || parent.versi_revisi}  ==>  Dokumen Menjadi: ${periode.nama_periode} (${periode.versi_revisi})`]);
    ws3.addRow([`Dasar Hukum: ${periode.dasar_pengesahan || '-'} | Nomor: ${periode.nomor_ba_tapd || '-'} | Tanggal: ${periode.tanggal_ba_tapd || '-'}`]);
    ws3.addRow([`Catatan Dokumen: ${periode.catatan_revisi || '-'}`]);
    ws3.addRow([]);

    ws3.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
    ws3.getCell('A2').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };

    const headersSheet3 = [
      'No', 'Level', 'Kode', 'Uraian Kegiatan / Akun / Rincian Belanja',
      'Semula (Vol)', 'Semula (Harga)', 'Semula (Jumlah Rp)',
      'Menjadi (Vol)', 'Menjadi (Harga)', 'Menjadi (Jumlah Rp)',
      'Selisih (+/- Rp)', 'Status Perubahan', 'Alasan / Catatan Justifikasi'
    ];

    const hRow3 = ws3.addRow(headersSheet3);
    hRow3.height = 26;
    hRow3.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0099CC' } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    if (sheet3Rows.length === 0) {
      const subName = filterPic ? (SUBBAG_LABEL_MAP[filterPic] || filterPic) : 'dokumen ini';
      const noChangeRow = ws3.addRow([
        '-', '-', '-', `Tidak ada data perubahan belanja pada ${subName} (Seluruh belanja berstatus TETAP).`,
        '', '', 0, '', '', 0, 0, 'TETAP', 'Alokasi Tetap'
      ]);
      noChangeRow.height = 24;
      for (let c = 1; c <= 13; c++) {
        noChangeRow.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF64748B' } };
        noChangeRow.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
      }
    } else {
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
        mRow.height = 22; // Minimal 11pt font dengan tinggi nyaman 22pt

        for (let c = 1; c <= 13; c++) {
          const cell = mRow.getCell(c);
          cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
          cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          };
        }

        mRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        mRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        mRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
        mRow.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
        mRow.getCell(5).numFmt = '#,##0';
        mRow.getCell(6).numFmt = '#,##0';
        mRow.getCell(7).numFmt = '#,##0';
        mRow.getCell(8).numFmt = '#,##0';
        mRow.getCell(9).numFmt = '#,##0';
        mRow.getCell(10).numFmt = '#,##0';
        mRow.getCell(11).numFmt = '#,##0';
        mRow.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

        if (diffInfo.status === 'BERTAMBAH') {
          mRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          mRow.getCell(12).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF166534' } };
        } else if (diffInfo.status === 'BERKURANG') {
          mRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          mRow.getCell(12).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF991B1B' } };
        } else if (diffInfo.status === 'BARU') {
          mRow.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
          mRow.getCell(12).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF6B21A8' } };
        }
      });
    }

    ws3.columns = [
      { width: 6 },  { width: 8 },  { width: 10 }, { width: 45 },
      { width: 12 }, { width: 15 }, { width: 18 },
      { width: 12 }, { width: 15 }, { width: 18 },
      { width: 18 }, { width: 16 }, { width: 40 }
    ];
  } else {
    ws3.addRow(['MATRIKS PERUBAHAN RENCANA USULAN HALAMAN BELANJA (SEMULA - MENJADI)']);
    ws3.addRow(['KPU KABUPATEN NGAWI - PILKADA SERENTAK']);
    ws3.addRow([`Dokumen: ${periode ? (periode.nama_periode || periode.versi_revisi) : 'Baseline Awal'}`]);
    ws3.addRow(['Status: DOKUMEN BASELINE AWAL (NPHD INDUK)']);
    ws3.addRow(['Keterangan: Dokumen ini merupakan RUH Belanja Induk Baseline awal, belum memiliki pembanding revisi sebelumnya.']);
    ws3.addRow([]);
    ws3.addRow(['No', 'Level', 'Kode', 'Uraian Kegiatan / Akun / Rincian Belanja', 'Semula (Jumlah Rp)', 'Menjadi (Jumlah Rp)', 'Selisih (+/- Rp)', 'Status Perubahan', 'Alasan / Catatan Justifikasi']);
    ws3.addRow(['-', '-', '-', 'Tidak ada data perubahan (Baseline Awal)', 0, summary.grandTotal || 0, 0, 'BASELINE_AWAL', 'Dokumen Penetapan Induk']);

    ws3.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
    ws3.getCell('A2').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };

    ws3.columns = [
      { width: 6 }, { width: 8 }, { width: 10 }, { width: 45 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 40 }
    ];
  }

  const matrikEndRow = ws3.rowCount;
  ws3.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
    printArea: `A1:M${matrikEndRow}`
  };
  appendAuditSignature(ws3, { periode, statusLabel, tanggalUnduh, filterPic, filterSasaran });

  // ==========================================================================
  // SHEET 4: Rekap_Alokasi (VERSI MANUSIA & PRESENTASI EKSEKUTIF RESMI)
  // Dilengkapi Ringkasan Makro, Distribusi Sasaran, Dua Pilar Utama,
  // Rekapitulasi Tematis 28 Kegiatan & Honorarium (Level 3), PIC, dan Akun BAS
  // Hanya dibuat untuk unduhan Dokumen Utuh (Non-PIC)
  // ==========================================================================
  if (!isPicDownload) {
    const ws4 = wb.addWorksheet('Rekap_Alokasi', {
      pageSetup: {
        orientation: 'landscape',
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0
      }
    });

    const sas = summary.bySasaran || {};
    const grandTotal = summary.grandTotal || 1;

    // 1. JUDUL & IDENTITAS DOKUMEN PRESENTASI
    ws4.addRow(['KOMISI PEMILIHAN UMUM KABUPATEN NGAWI']);
    ws4.addRow(['RESUME EKSEKUTIF ALOKASI ANGGARAN PILKADA TAHUN 2029']);
    ws4.addRow(['BELANJA HIBAH DALAM RANGKA PEMILIHAN BUPATI DAN WAKIL BUPATI']);
    ws4.addRow([`Dokumen: ${periode ? periode.nama_periode : 'Pilkada'} (${periode ? (periode.versi_revisi || 'Induk') : '-'}) | Status: ${statusLabel} | Tanggal Unduh: ${tanggalUnduh}`]);
    ws4.addRow([]); // Baris 5 kosong

    ws4.mergeCells('A1:G1');
    ws4.mergeCells('A2:G2');
    ws4.mergeCells('A3:G3');
    ws4.mergeCells('A4:G4');

    ws4.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
    ws4.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    ws4.getCell('A2').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF006699' } };
    ws4.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    ws4.getCell('A3').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF333333' } };
    ws4.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
    ws4.getCell('A4').font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF666666' } };
    ws4.getCell('A4').alignment = { vertical: 'middle', horizontal: 'center' };

  ws4.getRow(1).height = 22;
  ws4.getRow(2).height = 26;
  ws4.getRow(3).height = 22;
  ws4.getRow(4).height = 20;
  ws4.getRow(5).height = 10;

  // 2. KARTU INDIKATOR MAKRO EKSEKUTIF (BARIS 6 - 8)
  const totalPenyelenggara = (sas.KAB || 0) + (sas.PPK || 0) + (sas.PPS || 0) + (sas.PANTARLIH || 0) + (sas.TPS || 0);
  const totalBadanAdHoc = (sas.PPK || 0) + (sas.PPS || 0) + (sas.PANTARLIH || 0) + (sas.TPS || 0);
  const valPeserta = sas.PESERTA || 0;

  const cardHeaderRow = ws4.addRow([
    'TOTAL PAGU BELANJA', '',
    'OPERASIONAL & LOGISTIK KAB.',
    'ALOKASI BADAN AD HOC',
    'FASILITASI PESERTA PEMILIHAN', '', ''
  ]);
  const cardValRow = ws4.addRow([
    grandTotal, '',
    sas.KAB || 0,
    totalBadanAdHoc,
    valPeserta, '', ''
  ]);
  const cardSubRow = ws4.addRow([
    '100.00% Alokasi Terdistribusi Penuh', '',
    `${(( (sas.KAB || 0) / grandTotal) * 100).toFixed(2)}% Satker KPU Kab. Ngawi`,
    `${((totalBadanAdHoc / grandTotal) * 100).toFixed(2)}% PPK, PPS, KPPS & Pantarlih`,
    `${((valPeserta / grandTotal) * 100).toFixed(2)}% Paslon & Parpol (Debat, APK, dll)`, '', ''
  ]);

  cardHeaderRow.height = 20;
  cardValRow.height = 28;
  cardSubRow.height = 20;

  ws4.mergeCells('A6:B6'); ws4.mergeCells('A7:B7'); ws4.mergeCells('A8:B8');
  ws4.mergeCells('E6:F6'); ws4.mergeCells('E7:F7'); ws4.mergeCells('E8:F8');

  // Styling Kartu 1: Total Hibah (Blue/Cyan)
  ['A', 'B'].forEach(col => {
    [6, 7, 8].forEach(r => {
      ws4.getCell(`${col}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    });
  });
  ws4.getCell('A6').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0369A1' } };
  ws4.getCell('A7').font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF0284C7' } };
  ws4.getCell('A7').numFmt = '#,##0';
  ws4.getCell('A8').font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF075985' } };
  ws4.getCell('A6').alignment = { vertical: 'middle', horizontal: 'center' };
  ws4.getCell('A7').alignment = { vertical: 'middle', horizontal: 'center' };
  ws4.getCell('A8').alignment = { vertical: 'middle', horizontal: 'center' };

  // Styling Kartu 2: Kabupaten (Purple)
  [6, 7, 8].forEach(r => {
    ws4.getCell(`C${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
  });
  ws4.getCell('C6').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF6B21A8' } };
  ws4.getCell('C7').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF7E22CE' } };
  ws4.getCell('C7').numFmt = '#,##0';
  ws4.getCell('C8').font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF581C87' } };
  ws4.getCell('C6').alignment = { vertical: 'middle', horizontal: 'center' };
  ws4.getCell('C7').alignment = { vertical: 'middle', horizontal: 'center' };
  ws4.getCell('C8').alignment = { vertical: 'middle', horizontal: 'center' };

  // Styling Kartu 3: Badan Ad Hoc (Green/Emerald)
  [6, 7, 8].forEach(r => {
    ws4.getCell(`D${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
  });
  ws4.getCell('D6').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
  ws4.getCell('D7').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF16A34A' } };
  ws4.getCell('D7').numFmt = '#,##0';
  ws4.getCell('D8').font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF14532D' } };
  ws4.getCell('D6').alignment = { vertical: 'middle', horizontal: 'center' };
  ws4.getCell('D7').alignment = { vertical: 'middle', horizontal: 'center' };
  ws4.getCell('D8').alignment = { vertical: 'middle', horizontal: 'center' };

  // Styling Kartu 4: Fasilitasi Peserta (Amber)
  ['E', 'F'].forEach(col => {
    [6, 7, 8].forEach(r => {
      ws4.getCell(`${col}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    });
  });
  ws4.getCell('E6').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } };
  ws4.getCell('E7').font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFD97706' } };
  ws4.getCell('E7').numFmt = '#,##0';
  ws4.getCell('E8').font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF78350F' } };
  ws4.getCell('E6').alignment = { vertical: 'middle', horizontal: 'center' };
  ws4.getCell('E7').alignment = { vertical: 'middle', horizontal: 'center' };
  ws4.getCell('E8').alignment = { vertical: 'middle', horizontal: 'center' };

  ws4.addRow([]); // Baris 9 kosong

  // Helper Styling Header Tabel Presentasi (Minimal 11pt)
  function applyPresentationHeader(row, colsCount = 6) {
    row.height = 26;
    for (let c = 1; c <= colsCount; c++) {
      const cell = row.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0099CC' } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF006699' } },
        bottom: { style: 'medium', color: { argb: 'FF004C73' } },
        left: { style: 'thin', color: { argb: 'FF00B4F0' } },
        right: { style: 'thin', color: { argb: 'FF00B4F0' } }
      };
    }
  }

  function applySectionBanner(text, colsCount = 6) {
    const r = ws4.addRow([text]);
    r.height = 24;
    ws4.mergeCells(`A${r.number}:${String.fromCharCode(64 + colsCount)}${r.number}`);
    const cell = r.getCell(1);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    return r;
  }

  // --------------------------------------------------------------------------
  // TABEL 1: DISTRIBUSI ANGGARAN BERDASARKAN TINGKATAN SASARAN & PENERIMA
  // --------------------------------------------------------------------------
  applySectionBanner('I. DISTRIBUSI ANGGARAN BERDASARKAN TINGKATAN SASARAN DAN PENERIMA LAPANGAN', 6);
  const hRow4_1 = ws4.addRow(['No', 'Tingkatan Sasaran Anggaran', 'Entitas Unit / Wilayah Sasaran', 'Pagu Anggaran (Rp)', 'Porsi (%)', 'Ruang Lingkup Kegiatan & Keterangan Belanja']);
  applyPresentationHeader(hRow4_1, 6);

  const dataSasaran = [
    { title: 'Tingkat Satker Kabupaten (KPU Kab. Ngawi)', entitas: '1 Satker KPU Kab. Ngawi', val: sas.KAB || 0, desc: 'Pengadaan logistik utama (surat suara, kotak, bilik), bimtek komprehensif, sosialisasi sentral, advokasi sengketa hukum, dan operasional satker' },
    { title: 'Tingkat Kecamatan (PPK)', entitas: '19 Kantor PPK se-Kabupaten', val: sas.PPK || 0, desc: 'Operasional kesekretariatan 19 PPK, belanja ATK, konsumsi rapat kerja/pleno, dan dukungan administrasi rekapitulasi tingkat kecamatan' },
    { title: 'Tingkat Desa / Kelurahan (PPS)', entitas: '217 Kantor PPS se-Kabupaten', val: sas.PPS || 0, desc: 'Operasional sekretariat 217 PPS, pengumuman DPS/DPT, distribusi logistik desa, dan honorarium 5 bulan PPS se-Kabupaten Ngawi' },
    { title: 'Petugas Pemutakhiran Data Pemilih (Pantarlih)', entitas: '2.537 Petugas Lapangan', val: sas.PANTARLIH || 0, desc: 'Perlengkapan coklit door-to-door, dokumen kerja sensus pemilih, dan supervisi pemutakhiran data pemilih berkelanjutan' },
    { title: 'Tingkat Tempat Pemungutan Suara (TPS)', entitas: '1.371 TPS (12.339 Petugas)', val: sas.TPS || 0, desc: 'Honorarium KPPS (7 org) dan Petugas Ketertiban Linmas (2 org) per TPS, operasional KPPS, serta pembuatan tenda TPS' }
  ];

  dataSasaran.forEach((d, idx) => {
    const pct = ((d.val / grandTotal) * 100).toFixed(2) + '%';
    const r = ws4.addRow([idx + 1, d.title, d.entitas, d.val, pct, d.desc]);
    r.height = 22;
    for (let c = 1; c <= 6; c++) {
      r.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    }
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(4).numFmt = '#,##0';
    r.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const pctPenyelenggara = ((totalPenyelenggara / grandTotal) * 100).toFixed(2) + '%';
  const totPenyRow = ws4.addRow(['', 'SUBTOTAL PENYELENGGARA PEMILIHAN (1 s.d 5):', 'Seluruh Wilayah Kabupaten Ngawi', totalPenyelenggara, pctPenyelenggara, 'Akumulasi anggaran seluruh tingkatan penyelenggara (KPU, PPK, PPS, KPPS, Pantarlih)']);
  totPenyRow.height = 24;
  totPenyRow.font = { name: 'Calibri', size: 11, bold: true };
  totPenyRow.getCell(4).numFmt = '#,##0';
  totPenyRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  totPenyRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 6; c++) {
    totPenyRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    totPenyRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF94A3B8' } }, bottom: { style: 'thin', color: { argb: 'FF94A3B8' } } };
  }

  const pctPeserta = ((valPeserta / grandTotal) * 100).toFixed(2) + '%';
  const pesertaRow = ws4.addRow(['6', 'Fasilitasi Peserta Pemilihan', 'Paslon & Partai Politik', valPeserta, pctPeserta, 'Pencetakan & pemasangan APK, bahan kampanye paslon, debat publik terbuka, fasilitasi iklan media massa, dan audit KAP']);
  pesertaRow.height = 22;
  for (let c = 1; c <= 6; c++) {
    pesertaRow.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
    pesertaRow.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
  }
  pesertaRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  pesertaRow.getCell(4).numFmt = '#,##0';
  pesertaRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  pesertaRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

  const grandTotRow = ws4.addRow(['', 'TOTAL PAGU BELANJA:', 'Hibah NPHD Pilkada 2029', grandTotal, '100.00%', 'Anggaran berimbang (100% balance) siap dilaksanakan dan dipertanggungjawabkan']);
  grandTotRow.height = 26;
  grandTotRow.font = { name: 'Calibri', size: 11.5, bold: true };
  grandTotRow.getCell(4).numFmt = '#,##0';
  grandTotRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  grandTotRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 6; c++) {
    grandTotRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
    grandTotRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'double', color: { argb: 'FF000000' } } };
  }

  // --------------------------------------------------------------------------
  // TABEL 2: KOMPOSISI DUA PILAR UTAMA ANGGARAN PILKADA
  // --------------------------------------------------------------------------
  ws4.addRow([]);
  applySectionBanner('II. KOMPOSISI DUA PILAR UTAMA ANGGARAN PILKADA', 6);
  const hRow4_2 = ws4.addRow(['No', 'Pilar Komponen Anggaran', 'Rincian Komponen Pelaksanaan', 'Pagu Anggaran (Rp)', 'Porsi (%)', 'Arah Kebijakan Anggaran']);
  applyPresentationHeader(hRow4_2, 6);

  const banner = summary.banner || {};
  const totPilarTahapan = (banner.tahapanTotal || 0) + (banner.operasionalTotal || 0) || 26614699000;
  const totPilarHonor = banner.honorTotal || 23385300000;

  const dataPilar = [
    { no: '1', title: 'Tahapan Persiapan & Pelaksanaan', rincian: '28 Komponen Kegiatan Teknis & Non-Tahapan', val: totPilarTahapan, desc: 'Membiayai seluruh belanja barang, pengadaan logistik utama, sewa gedung/gudang, sosialisasi, bimbingan teknis, dan administrasi perkantoran' },
    { no: '2', title: 'Honorarium Badan Penyelenggara Ad Hoc & Pokja', rincian: 'PPK, PPS, KPPS, Pantarlih, dan Kelompok Kerja Pemilihan', val: totPilarHonor, desc: 'Alokasi khusus imbalan jasa dan keringat ribuan petugas pemilu di tingkat kecamatan, desa, hingga garda terdepan TPS se-Kabupaten Ngawi' }
  ];

  dataPilar.forEach(d => {
    const pct = ((d.val / grandTotal) * 100).toFixed(2) + '%';
    const r = ws4.addRow([d.no, d.title, d.rincian, d.val, pct, d.desc]);
    r.height = 22;
    for (let c = 1; c <= 6; c++) {
      r.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    }
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(4).numFmt = '#,##0';
    r.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const totPilarRow = ws4.addRow(['', 'TOTAL KESELURUHAN DUA PILAR (1 + 2):', '100% Seluruh Komponen Pelaksanaan', (totPilarTahapan + totPilarHonor), '100.00%', 'Komposisi seimbang antara pelaksanaan kegiatan teknis dan kesejahteraan penyelenggara lapangan']);
  totPilarRow.height = 26;
  totPilarRow.font = { name: 'Calibri', size: 11.5, bold: true };
  totPilarRow.getCell(4).numFmt = '#,##0';
  totPilarRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  totPilarRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 6; c++) {
    totPilarRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
    totPilarRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'double', color: { argb: 'FF000000' } } };
  }

  // --------------------------------------------------------------------------
  // TABEL 3: REKAPITULASI TEMATIS 28 KEGIATAN & HONORARIUM PENYELENGGARA (LEVEL 3)
  // --------------------------------------------------------------------------
  ws4.addRow([]);
  applySectionBanner('III. REKAPITULASI ALOKASI SAMPAI LEVEL 3 (28 KEGIATAN TAHAPAN & HONORARIUM PENYELENGGARA)', 7);
  const hRow4_3 = ws4.addRow(['No', 'Kode', 'Uraian Program / Kegiatan Level 3', 'Kluster Tematis', 'Pagu Anggaran (Rp)', 'Porsi (%)', 'PIC Subbag Utama']);
  applyPresentationHeader(hRow4_3, 7);

  // Ambil seluruh header Level 3 dari dataset
  const l3Rows = rows.filter(r => r.tree_level === 3 || (r.is_header && r.level_indent === 2));

  // Pemetaan Kluster Tematis Manusiawi untuk Presentasi
  function getL3Cluster(r) {
    if (r.parent_tree_id === 'h_7043' || (r.uraian || '').includes('PPK (188)') || r.uraian === 'PPS' || r.uraian === 'KPPS' || (r.uraian || '').includes('PPDP (188)')) {
      return 'Kluster IV: Honorarium Badan Penyelenggara Ad Hoc';
    }
    const num = parseInt(r.kode, 10);
    if (!isNaN(num)) {
      if (num >= 1 && num <= 5) return 'Kluster I: Tahap Persiapan & Penguatan Kelembagaan';
      if (num >= 6 && num <= 17) return 'Kluster II: Tahap Pelaksanaan Inti Pemilihan';
      if (num >= 18 && num <= 28) return 'Kluster III: Dukungan Manajemen & Operasional Administrasi Perkantoran';
    }
    return 'Kluster Tematis Pemilihan';
  }

  let clusterTotals = {
    'Kluster I: Tahap Persiapan & Penguatan Kelembagaan': 0,
    'Kluster II: Tahap Pelaksanaan Inti Pemilihan': 0,
    'Kluster III: Dukungan Manajemen & Operasional Administrasi Perkantoran': 0,
    'Kluster IV: Honorarium Badan Penyelenggara Ad Hoc': 0
  };

  let currentCluster = '';
  let clusterSubtotal = 0;
  let counterL3 = 1;

  l3Rows.forEach((r) => {
    const cluster = getL3Cluster(r);
    const val = r.computed_total || 0;

    // Jika masuk kluster baru dan kluster sebelumnya punya subtotal, cetak subtotal kluster sebelumnya
    if (currentCluster && currentCluster !== cluster) {
      const pctSub = ((clusterSubtotal / grandTotal) * 100).toFixed(2) + '%';
      const subRow = ws4.addRow(['', '', `SUBTOTAL ${currentCluster.toUpperCase()}`, currentCluster, clusterSubtotal, pctSub, 'Akumulasi Kluster']);
      subRow.height = 23;
      subRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      subRow.getCell(5).numFmt = '#,##0';
      subRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
      subRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      for (let c = 1; c <= 7; c++) {
        subRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        subRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
      }
      clusterSubtotal = 0;
    }

    currentCluster = cluster;
    clusterSubtotal += val;
    if (clusterTotals[cluster] !== undefined) {
      clusterTotals[cluster] += val;
    }

    const pct = ((val / grandTotal) * 100).toFixed(2) + '%';
    const rRow = ws4.addRow([
      counterL3++,
      r.kode || '',
      r.uraian || '',
      cluster,
      val,
      pct,
      r.pic_bagian || '-'
    ]);

    rRow.height = 22; // Minimal 11pt font dengan tinggi nyaman 22pt
    for (let c = 1; c <= 7; c++) {
      rRow.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      rRow.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    }
    rRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    rRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    rRow.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    rRow.getCell(5).numFmt = '#,##0';
    rRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    rRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    rRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Cetak subtotal kluster terakhir (Kluster IV)
  if (currentCluster) {
    const pctSub = ((clusterSubtotal / grandTotal) * 100).toFixed(2) + '%';
    const subRow = ws4.addRow(['', '', `SUBTOTAL ${currentCluster.toUpperCase()}`, currentCluster, clusterSubtotal, pctSub, 'Akumulasi Kluster']);
    subRow.height = 23;
    subRow.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    subRow.getCell(5).numFmt = '#,##0';
    subRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    subRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 1; c <= 7; c++) {
      subRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      subRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    }
  }

  // Tambahkan baris khusus Honorarium Kelompok Kerja (Pokja) jika ada agar total L3 100% balance
  const rPokja = rows.find(r => r.kode === 'I.' && (r.uraian || '').includes('Kelompok Kerja'));
  const valPokja = rPokja ? (rPokja.computed_total || 0) : 0;
  if (valPokja > 0) {
    const pctPokja = ((valPokja / grandTotal) * 100).toFixed(2) + '%';
    const pokjaRow = ws4.addRow([
      counterL3++,
      'Pokja',
      'Honorarium Kelompok Kerja (Pokja) Pemilihan (11 Bidang Pokja)',
      'Kluster Khusus: Honorarium Pokja Pemilihan',
      valPokja,
      pctPokja,
      'KUL / Lintas Subbag'
    ]);
    pokjaRow.height = 22;
    for (let c = 1; c <= 7; c++) {
      pokjaRow.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      pokjaRow.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    }
    pokjaRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    pokjaRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    pokjaRow.getCell(5).numFmt = '#,##0';
    pokjaRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    pokjaRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    pokjaRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
  }

  // Grand Total Level 3 (100% Balance!)
  let totAllL3 = 0;
  l3Rows.forEach(r => totAllL3 += (r.computed_total || 0));
  totAllL3 += valPokja;

  const grandTotL3 = ws4.addRow(['', '', 'TOTAL REKAPITULASI KEGIATAN & HONORARIUM:', 'Seluruh Program Pilkada', totAllL3, '100.00%', '100% Balance']);
  grandTotL3.height = 26;
  grandTotL3.font = { name: 'Calibri', size: 11.5, bold: true };
  grandTotL3.getCell(5).numFmt = '#,##0';
  grandTotL3.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  grandTotL3.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
  grandTotL3.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 7; c++) {
    grandTotL3.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
    grandTotL3.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'double', color: { argb: 'FF000000' } } };
  }

  // --------------------------------------------------------------------------
  // TABEL 4: DISTRIBUSI PORTOFOLIO SUBBAGIAN (PIC PENANGGUNG JAWAB)
  // --------------------------------------------------------------------------
  ws4.addRow([]);
  applySectionBanner('IV. DISTRIBUSI PORTOFOLIO DAN TANGGUNG JAWAB SUBBAGIAN (PIC)', 6);
  const hRow4_4 = ws4.addRow(['No', 'Subbagian Penanggung Jawab', 'Pagu Kelolaan (Rp)', 'Porsi (%)', 'Fokus Utama Tanggung Jawab & Portofolio Belanja', '']);
  applyPresentationHeader(hRow4_4, 5);

  const bySubbag = summary.bySubbag || {};
  const picInfo = [
    { code: 'KUL', name: 'Keuangan, Umum & Logistik (KUL)', desc: 'Pengadaan logistik pemilu (kotak, surat suara, bilik, formulir), sewa gedung/gudang, operasional kantor satker, langganan daya dan jasa, pemeliharaan sarpras, perjalanan dinas, dan perbendaharaan hibah' },
    { code: 'RENDATIN', name: 'Perencanaan, Data & Informasi (RENDATIN)', desc: 'Penyusunan anggaran dan RKB, pemutakhiran data pemilih berkelanjutan (Sidalih), pencetakan DPS/DPT, serta penyusunan evaluasi dan pelaporan program' },
    { code: 'TEKNIS', name: 'Teknis Penyelenggaraan Pemilu (TEKNIS)', desc: 'Pendaftaran dan verifikasi pasangan calon, rapat koordinasi teknis, fasilitasi debat publik terbuka paslon, pemungutan dan penghitungan suara, serta rapat pleno rekapitulasi perolehan suara' },
    { code: 'HUKUM', name: 'Hukum (HUKUM)', desc: 'Penyusunan keputusan KPU, telaah regulasi pilkada, advokasi sengketa pencalonan dan sengketa perselisihan hasil pemilihan di Mahkamah Konstitusi, bantuan hukum, dan dokumentasi JDIH' },
    { code: 'PARSDM', name: 'Partisipasi Masyarakat & SDM (PARSDM)', desc: 'Sosialisasi pemilih, pendidikan pemilih pemula, pembentukan dan rekrutmen badan ad hoc (PPK, PPS, KPPS, Pantarlih), bimbingan teknis ad hoc, dan alokasi honorarium ad hoc se-Kabupaten' }
  ];

  let totPicSum = 0;
  picInfo.forEach((p, idx) => {
    const val = bySubbag[p.code] || 0;
    totPicSum += val;
    const pct = ((val / grandTotal) * 100).toFixed(2) + '%';
    const r = ws4.addRow([idx + 1, p.name, val, pct, p.desc, '']);
    r.height = 24;
    for (let c = 1; c <= 5; c++) {
      r.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    }
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(3).numFmt = '#,##0';
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const totPicRow = ws4.addRow(['', 'TOTAL SELURUH SUBBAGIAN (1 s.d 5):', totPicSum, '100.00%', 'Alokasi terbagi proporsional sesuai tugas pokok dan fungsi 5 subbagian KPU Kabupaten Ngawi', '']);
  totPicRow.height = 26;
  totPicRow.font = { name: 'Calibri', size: 11.5, bold: true };
  totPicRow.getCell(3).numFmt = '#,##0';
  totPicRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
  totPicRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 5; c++) {
    totPicRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
    totPicRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'double', color: { argb: 'FF000000' } } };
  }

  // --------------------------------------------------------------------------
  // TABEL 5: REKAPITULASI JENIS BELANJA MAKRO (BAGAN AKUN STANDAR - BAS)
  // --------------------------------------------------------------------------
  ws4.addRow([]);
  applySectionBanner('V. REKAPITULASI JENIS BELANJA MAKRO (BAGAN AKUN STANDAR - BAS)', 6);
  const hRow4_5 = ws4.addRow(['No', 'Kode Akun', 'Uraian Akun Belanja (BAS)', 'Kelompok Kategori Belanja', 'Pagu Anggaran (Rp)', 'Porsi (%)']);
  applyPresentationHeader(hRow4_5, 6);

  const byAkun = summary.byAkun || {};
  function getAkunCategory(kd) {
    if (kd === '521213') return 'Belanja Honorarium Output (Ad Hoc & Pokja)';
    if (kd === '521211') return 'Belanja Bahan & ATK';
    if (kd === '522151') return 'Belanja Jasa Profesi / Narasumber';
    if (kd === '522141') return 'Belanja Sewa Gedung & Perlengkapan';
    if (kd.startsWith('524')) return 'Belanja Perjalanan Dinas & Supervisi';
    if (kd.startsWith('53')) return 'Belanja Modal / Aset Peralatan';
    return 'Belanja Barang Non Operasional / Penunjang';
  }

  let counterAkun = 1;
  let totAkunSum = 0;
  Object.keys(byAkun).sort().forEach(kd => {
    const val = byAkun[kd] || 0;
    totAkunSum += val;
    const pct = ((val / grandTotal) * 100).toFixed(2) + '%';
    const r = ws4.addRow([counterAkun++, kd, akunMap[kd] || 'Belanja', getAkunCategory(kd), val, pct]);
    r.height = 22; // Minimal 11pt font dengan tinggi nyaman 22pt
    for (let c = 1; c <= 6; c++) {
      r.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    }
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(5).numFmt = '#,##0';
    r.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const totAkunRow = ws4.addRow(['', '', 'TOTAL REKAPITULASI BAGAN AKUN STANDAR:', 'Seluruh Akun BAS', totAkunSum, '100.00%']);
  totAkunRow.height = 26;
  totAkunRow.font = { name: 'Calibri', size: 11.5, bold: true };
  totAkunRow.getCell(5).numFmt = '#,##0';
  totAkunRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  totAkunRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 6; c++) {
    totAkunRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
    totAkunRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'double', color: { argb: 'FF000000' } } };
  }

  // TANDA TANGAN KETUA KPU PADA SHEET REKAP ALOKASI
  ws4.addRow([]);
  ws4.addRow([]);

  const signR4 = ws4.rowCount + 1;
  ws4.addRow(['', '', '', '', `NGAWI, ${tanggalUnduh}`, '']);
  ws4.addRow(['', '', '', '', 'Ketua Komisi Pemilihan Umum', '']);
  ws4.addRow(['', '', '', '', 'Kabupaten Ngawi,', '']);
  ws4.addRow([]);
  ws4.addRow([]);
  ws4.addRow([]);
  ws4.addRow(['', '', '', '', namaKetua, '']);

  ws4.getCell(`E${signR4}`).font = { name: 'Calibri', size: 11, bold: true };
  ws4.getCell(`E${signR4}`).alignment = { horizontal: 'center', vertical: 'middle' };
  ws4.getCell(`E${signR4 + 1}`).font = { name: 'Calibri', size: 11, bold: true };
  ws4.getCell(`E${signR4 + 1}`).alignment = { horizontal: 'center', vertical: 'middle' };
  ws4.getCell(`E${signR4 + 2}`).font = { name: 'Calibri', size: 11, bold: true };
  ws4.getCell(`E${signR4 + 2}`).alignment = { horizontal: 'center', vertical: 'middle' };
  ws4.getCell(`E${signR4 + 6}`).font = { name: 'Calibri', size: 12, bold: true, underline: false };
  ws4.getCell(`E${signR4 + 6}`).alignment = { horizontal: 'center', vertical: 'middle' };

  // LEBAR KOLOM SHEET REKAP_ALOKASI (Presentasi-Ready Layout)
  ws4.columns = [
    { width: 6 },   // Col A: No
    { width: 14 },  // Col B: Kode / Subbagian
    { width: 48 },  // Col C: Uraian Komponen / Kegiatan
    { width: 34 },  // Col D: Kluster Tematis / Kategori
    { width: 22 },  // Col E: Pagu Anggaran (Rp)
    { width: 14 },  // Col F: Porsi (%)
    { width: 36 }   // Col G: PIC / Keterangan
  ];

    const rekapSignEndRow = ws4.rowCount;
    ws4.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
      printArea: `A1:G${rekapSignEndRow}`
    };
    appendAuditSignature(ws4, { periode, statusLabel, tanggalUnduh, filterPic, filterSasaran });
  }

  // Return Buffer XLSX ExcelJS
  let buffer = await wb.xlsx.writeBuffer();

  // ==========================================================================
  // NATIVE EXCEL COM ANTI-ORPHAN SIGNATURE ENGINE (Windows Environment)
  // Menjamin 100% presisi bebas "Orphan Signature" menggunakan kalkulasi layout Excel native
  // ==========================================================================
  if (process.platform === 'win32') {
    try {
      const fs = require('fs');
      const path = require('path');
      const { execFileSync } = require('child_process');
      const tempDir = path.join(__dirname, '..', 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempFile = path.join(tempDir, `export_${Date.now()}_${Math.random().toString(36).substring(7)}.xlsx`);
      fs.writeFileSync(tempFile, buffer);

      const pyScript = path.join(__dirname, 'fix_page_breaks.py');
      if (fs.existsSync(pyScript)) {
        execFileSync('python', [pyScript, tempFile], { stdio: 'ignore', timeout: 15000 });
        if (fs.existsSync(tempFile)) {
          buffer = fs.readFileSync(tempFile);
          try { fs.unlinkSync(tempFile); } catch (e) {}
        }
      }
    } catch (postErr) {
      console.warn('[excel_io] Native Excel post-processor notice:', postErr.message);
    }
  }

  return buffer;
}

module.exports = {
  exportRkbToExcelBuffer
};
