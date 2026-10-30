/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Export Excel (XLSX) Multi-Sheet Resmi (Format Standar Detail 16 Segmen KPU Ngawi)
 * Pengembang Resmi: emenje
 */

const ExcelJS = require('exceljs');
const XLSX = require('xlsx');
const { db, getRabRows, getPeriodeById, getMasters, getKecamatans, getPenandatanganList, getActivePeriode, getLatestRatifiedPeriode } = require('./db');
const { calculateRkbDataset, getCachedRkbDataset, getRevisionComparison, getWilayahData, filterAndPruneRkbDataset } = require('./calculation');
const { parseIndonesianNumber } = require('./number_util');

const SUBBAG_LABEL_MAP = {
  KUL: 'Keuangan, Umum & Logistik (KUL)',
  RENDATIN: 'Perencanaan, Data & Informasi (RENDATIN)',
  TEKNIS: 'Teknis Penyelenggaraan Pemilu (TEKNIS)',
  HUKUM: 'Hukum (HUKUM)',
  PARSDM: 'Partisipasi Masyarakat & SDM (PARSDM)'
};

/**
 * Helper mengembalikan data subbagian dan pejabat penandatangan resmi
 */
function getSubbagSignatureInfo(picCode) {
  const code = (picCode || 'KUL').toUpperCase();
  let dbSub = null;
  try {
    dbSub = db.prepare('SELECT * FROM master_subbagian WHERE kode = ?').get(code);
  } catch (e) {}

  const defaults = {
    KUL: {
      nama: 'Keuangan, Umum dan Logistik',
      divisiKasubag: 'Divisi / Kasubag Keuangan Umum dan Logistik',
      kasubag_nama: 'NURFANTI',
      kasubag_nip: '19820914 200902 1 004',
      kasubag_jabatan: 'Kepala Subbagian Keuangan, Umum dan Logistik',
      komisioner_nama: 'SAMSU MUSTAKIM',
      komisioner_jabatan: 'Ketua Divisi Keuangan, Umum, Rumah Tangga dan Logistik'
    },
    RENDATIN: {
      nama: 'Perencanaan, Data dan Informasi',
      divisiKasubag: 'Divisi / Kasubag Perencanaan, Data dan Informasi',
      kasubag_nama: 'MOHAMMAD NOOR JIHAN',
      kasubag_nip: '19840101 200912 1 001',
      kasubag_jabatan: 'Kepala Subbagian Perencanaan, Data dan Informasi',
      komisioner_nama: 'PUTRA ADI WIBOWO SW',
      komisioner_jabatan: 'Ketua Divisi Perencanaan, Data dan Informasi'
    },
    TEKNIS: {
      nama: 'Teknis Penyelenggaraan Pemilu',
      divisiKasubag: 'Divisi / Kasubag Teknis Penyelenggaraan Pemilu',
      kasubag_nama: 'DWI ARDIANI',
      kasubag_nip: '19780512 200801 1 015',
      kasubag_jabatan: 'Kepala Subbagian Teknis dan Hukum',
      komisioner_nama: 'MUHAMMAD PRASETYO NUGROHO',
      komisioner_jabatan: 'Ketua Divisi Teknis Penyelenggaraan Pemilu'
    },
    HUKUM: {
      nama: 'Hukum',
      divisiKasubag: 'Divisi / Kasubag Hukum',
      kasubag_nama: 'DWI ARDIANI',
      kasubag_nip: '19780512 200801 1 015',
      kasubag_jabatan: 'Kepala Subbagian Teknis dan Hukum',
      komisioner_nama: 'SUDARSONO',
      komisioner_jabatan: 'Ketua Divisi Hukum dan Pengawasan'
    },
    PARSDM: {
      nama: 'Partisipasi Masyarakat dan SDM',
      divisiKasubag: 'Divisi / Kasubag Partisipasi Masyarakat dan SDM',
      kasubag_nama: 'DEVI',
      kasubag_nip: '19810320 200902 2 007',
      kasubag_jabatan: 'Kepala Subbagian Partisipasi Masyarakat dan SDM',
      komisioner_nama: 'JEANNI TRIANGGALUH PRAMINTO',
      komisioner_jabatan: 'Ketua Divisi Sosialisasi, Pendidikan Pemilih, Parmas dan SDM'
    }
  };

  const def = defaults[code] || defaults.KUL;
  if (!dbSub) return def;

  return {
    nama: dbSub.nama || def.nama,
    divisiKasubag: `Divisi / Kasubag ${dbSub.nama || def.nama}`,
    kasubag_nama: dbSub.kasubag_nama || def.kasubag_nama,
    kasubag_nip: dbSub.kasubag_nip || def.kasubag_nip,
    kasubag_jabatan: dbSub.kasubag_jabatan || def.kasubag_jabatan,
    komisioner_nama: dbSub.komisioner_nama || def.komisioner_nama,
    komisioner_jabatan: dbSub.komisioner_jabatan || def.komisioner_jabatan
  };
}

/**
 * Menambahkan blok tanda tangan resmi sesuai Bab 22 Canon Master Blueprint:
 * - Jika PIC (Perencanaan Divisi): Ketua Divisi di Kiri, Kasubag terkait di Kanan
 * - Jika signContext === 'PLENO' (Pengesahan Pleno): Ketua KPU bersama 4 Anggota KPU lainnya (5 Komisioner)
 * - Jika Full (Pengusulan, Pelaporan, dan Arsip Lembaga - Default): Ketua KPU saja di Kanan (Kolom I:K)
 */
function appendOfficialSignature(ws, { isPic, filterPic, tanggalUnduh, settings, signContext = 'LEMBAGA', colLeftMerge = 'B:F', colRightMerge = 'H:K' }) {
  if (isPic) {
    const subInfo = getSubbagSignatureInfo(filterPic);

    // Baris Center 1: Kota & Tanggal Unduh
    const rowDate = ws.addRow([]);
    rowDate.height = 20;
    ws.mergeCells(`A${rowDate.number}:K${rowDate.number}`);
    const cDate = ws.getCell(`A${rowDate.number}`);
    cDate.value = `Ngawi, ${tanggalUnduh}`;
    cDate.alignment = { horizontal: 'center', vertical: 'middle' };
    cDate.font = { name: 'Calibri', size: 11, bold: false, color: { argb: 'FF000000' } };

    // Baris Center 2: Divisi / Kasubag [Subbag]
    const rowDiv = ws.addRow([]);
    rowDiv.height = 20;
    ws.mergeCells(`A${rowDiv.number}:K${rowDiv.number}`);
    const cDiv = ws.getCell(`A${rowDiv.number}`);
    cDiv.value = subInfo.divisiKasubag;
    cDiv.alignment = { horizontal: 'center', vertical: 'middle' };
    cDiv.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };

    // Baris Jabatan: Kiri (Komisioner), Kanan (Kasubag)
    const rowJab = ws.addRow([]);
    rowJab.height = 20;
    const [lStart, lEnd] = colLeftMerge.split(':');
    ws.mergeCells(`${lStart}${rowJab.number}:${lEnd}${rowJab.number}`);
    const cJabKom = ws.getCell(`${lStart}${rowJab.number}`);
    cJabKom.value = subInfo.komisioner_jabatan;
    cJabKom.alignment = { horizontal: 'center', vertical: 'middle' };
    cJabKom.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF000000' } };

    const [rStart, rEnd] = colRightMerge.split(':');
    ws.mergeCells(`${rStart}${rowJab.number}:${rEnd}${rowJab.number}`);
    const cJabKas = ws.getCell(`${rStart}${rowJab.number}`);
    cJabKas.value = subInfo.kasubag_jabatan;
    cJabKas.alignment = { horizontal: 'center', vertical: 'middle' };
    cJabKas.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF000000' } };

    // Space Tanda Tangan Basah (Tinggi 28pt)
    const rowSpace = ws.addRow([]);
    rowSpace.height = 28;

    // Baris Nama Pejabat
    const rowNama = ws.addRow([]);
    rowNama.height = 22;
    // Kiri: Komisioner (Non-ASN, Tanpa Garis Bawah, Tanpa NIP)
    ws.mergeCells(`${lStart}${rowNama.number}:${lEnd}${rowNama.number}`);
    const cNamaKom = ws.getCell(`${lStart}${rowNama.number}`);
    cNamaKom.value = subInfo.komisioner_nama;
    cNamaKom.alignment = { horizontal: 'center', vertical: 'middle' };
    cNamaKom.font = { name: 'Calibri', size: 11, bold: true, underline: false, color: { argb: 'FF000000' } };

    // Kanan: Kasubag (ASN, Ada Garis Bawah)
    ws.mergeCells(`${rStart}${rowNama.number}:${rEnd}${rowNama.number}`);
    const cNamaKas = ws.getCell(`${rStart}${rowNama.number}`);
    cNamaKas.value = subInfo.kasubag_nama;
    cNamaKas.alignment = { horizontal: 'center', vertical: 'middle' };
    cNamaKas.font = { name: 'Calibri', size: 11, bold: true, underline: true, color: { argb: 'FF000000' } };

    // Baris NIP
    const rowNip = ws.addRow([]);
    rowNip.height = 18;
    // Kiri: Kosong (Komisioner Tanpa NIP)
    ws.mergeCells(`${lStart}${rowNip.number}:${lEnd}${rowNip.number}`);
    const cNipKom = ws.getCell(`${lStart}${rowNip.number}`);
    cNipKom.value = '';

    // Kanan: NIP Kasubag
    ws.mergeCells(`${rStart}${rowNip.number}:${rEnd}${rowNip.number}`);
    const cNipKas = ws.getCell(`${rStart}${rowNip.number}`);
    cNipKas.value = subInfo.kasubag_nip ? `NIP. ${subInfo.kasubag_nip}` : '';
    cNipKas.alignment = { horizontal: 'center', vertical: 'middle' };
    cNipKas.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };

    return ws.rowCount;
  } else if (String(signContext || '').toUpperCase() === 'PLENO') {
    // Bab 22.1: Pengesahan Pleno -> Ketua KPU bersama 4 Anggota KPU lainnya
    const namaKetua = (settings && settings.nama_ketua) || 'SAMSU MUSTAKIM';
    const komRendatin = getSubbagSignatureInfo('RENDATIN').komisioner_nama;
    const komTeknis = getSubbagSignatureInfo('TEKNIS').komisioner_nama;
    const komHukum = getSubbagSignatureInfo('HUKUM').komisioner_nama;
    const komParsdm = getSubbagSignatureInfo('PARSDM').komisioner_nama;

    const rowDate = ws.addRow([]);
    rowDate.height = 20;
    ws.mergeCells(`A${rowDate.number}:K${rowDate.number}`);
    const cDate = ws.getCell(`A${rowDate.number}`);
    cDate.value = `NGAWI, ${tanggalUnduh}`;
    cDate.alignment = { horizontal: 'center', vertical: 'middle' };
    cDate.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };

    const rowTitle = ws.addRow([]);
    rowTitle.height = 20;
    ws.mergeCells(`A${rowTitle.number}:K${rowTitle.number}`);
    const cTitle = ws.getCell(`A${rowTitle.number}`);
    cTitle.value = 'KOMISI PEMILIHAN UMUM KABUPATEN NGAWI';
    cTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    cTitle.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };

    // Ketua KPU di Tengah
    const rowKetuaJab = ws.addRow([]);
    rowKetuaJab.height = 18;
    ws.mergeCells(`E${rowKetuaJab.number}:G${rowKetuaJab.number}`);
    const cKJab = ws.getCell(`E${rowKetuaJab.number}`);
    cKJab.value = 'KETUA,';
    cKJab.alignment = { horizontal: 'center', vertical: 'middle' };
    cKJab.font = { name: 'Calibri', size: 10.5, bold: true };

    const spaceKetua = ws.addRow([]);
    spaceKetua.height = 26;

    const rowKetuaNama = ws.addRow([]);
    rowKetuaNama.height = 20;
    ws.mergeCells(`E${rowKetuaNama.number}:G${rowKetuaNama.number}`);
    const cKNama = ws.getCell(`E${rowKetuaNama.number}`);
    cKNama.value = namaKetua;
    cKNama.alignment = { horizontal: 'center', vertical: 'middle' };
    cKNama.font = { name: 'Calibri', size: 11, bold: true };

    // 4 Anggota Komisioner KPU
    const rowAnggotaJab = ws.addRow([]);
    rowAnggotaJab.height = 18;
    ws.mergeCells(`B${rowAnggotaJab.number}:F${rowAnggotaJab.number}`);
    ws.mergeCells(`H${rowAnggotaJab.number}:K${rowAnggotaJab.number}`);
    ws.getCell(`B${rowAnggotaJab.number}`).value = 'ANGGOTA,';
    ws.getCell(`H${rowAnggotaJab.number}`).value = 'ANGGOTA,';
    ['B', 'H'].forEach(col => {
      ws.getCell(`${col}${rowAnggotaJab.number}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`${col}${rowAnggotaJab.number}`).font = { name: 'Calibri', size: 10.5, bold: true };
    });

    const spaceAnggota1 = ws.addRow([]);
    spaceAnggota1.height = 26;

    const rowAnggotaNama1 = ws.addRow([]);
    rowAnggotaNama1.height = 20;
    ws.mergeCells(`B${rowAnggotaNama1.number}:F${rowAnggotaNama1.number}`);
    ws.mergeCells(`H${rowAnggotaNama1.number}:K${rowAnggotaNama1.number}`);
    ws.getCell(`B${rowAnggotaNama1.number}`).value = komRendatin;
    ws.getCell(`H${rowAnggotaNama1.number}`).value = komTeknis;
    ['B', 'H'].forEach(col => {
      ws.getCell(`${col}${rowAnggotaNama1.number}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`${col}${rowAnggotaNama1.number}`).font = { name: 'Calibri', size: 11, bold: true };
    });

    const rowAnggotaJab2 = ws.addRow([]);
    rowAnggotaJab2.height = 18;
    ws.mergeCells(`B${rowAnggotaJab2.number}:F${rowAnggotaJab2.number}`);
    ws.mergeCells(`H${rowAnggotaJab2.number}:K${rowAnggotaJab2.number}`);
    ws.getCell(`B${rowAnggotaJab2.number}`).value = 'ANGGOTA,';
    ws.getCell(`H${rowAnggotaJab2.number}`).value = 'ANGGOTA,';
    ['B', 'H'].forEach(col => {
      ws.getCell(`${col}${rowAnggotaJab2.number}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`${col}${rowAnggotaJab2.number}`).font = { name: 'Calibri', size: 10.5, bold: true };
    });

    const spaceAnggota2 = ws.addRow([]);
    spaceAnggota2.height = 26;

    const rowAnggotaNama2 = ws.addRow([]);
    rowAnggotaNama2.height = 20;
    ws.mergeCells(`B${rowAnggotaNama2.number}:F${rowAnggotaNama2.number}`);
    ws.mergeCells(`H${rowAnggotaNama2.number}:K${rowAnggotaNama2.number}`);
    ws.getCell(`B${rowAnggotaNama2.number}`).value = komHukum;
    ws.getCell(`H${rowAnggotaNama2.number}`).value = komParsdm;
    ['B', 'H'].forEach(col => {
      ws.getCell(`${col}${rowAnggotaNama2.number}`).alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getCell(`${col}${rowAnggotaNama2.number}`).font = { name: 'Calibri', size: 11, bold: true };
    });

    return ws.rowCount;
  } else {
    // Bab 22.1 & 22.2: Pengusulan, Pelaporan, dan Arsip Lembaga -> Ketua KPU saja di Kolom I:K
    const signR1 = ws.rowCount + 1;
    const rowDate = ws.addRow(['', '', '', '', '', '', '', '', `NGAWI, ${tanggalUnduh}`]);
    rowDate.height = 20;
    const rowTitle1 = ws.addRow(['', '', '', '', '', '', '', '', 'Ketua Komisi Pemilihan Umum']);
    rowTitle1.height = 18;
    const rowTitle2 = ws.addRow(['', '', '', '', '', '', '', '', 'Kabupaten Ngawi,']);
    rowTitle2.height = 18;

    const signSpace1 = ws.addRow([]);
    signSpace1.height = 26;

    const namaKetua = (settings && settings.nama_ketua) || 'SAMSU MUSTAKIM';
    const rowNama = ws.addRow(['', '', '', '', '', '', '', '', namaKetua]);
    rowNama.height = 22;
    const signEndRow = ws.rowCount;

    [signR1, signR1 + 1, signR1 + 2, signEndRow].forEach((rNum, idx) => {
      ws.mergeCells(`I${rNum}:K${rNum}`);
      const c = ws.getCell(`I${rNum}`);
      c.alignment = { vertical: 'middle', horizontal: 'center' };
      if (idx < 3) {
        c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
      } else {
        c.font = { name: 'Calibri', size: 12, bold: true, underline: false, color: { argb: 'FF000000' } };
      }
    });

    return signEndRow;
  }
}

/**
 * Helper menyisipkan signature riwayat file / audit log sistem di bawah lembar kerja
 * Selalu diletakkan di bagian bawah DILUAR area print resmi dokumen
 */
function appendAuditSignature(ws, { periode, statusLabel, tanggalUnduh, filterPic, filterSasaran, now = new Date() }) {
  const b1 = ws.addRow([]);
  b1.height = 14;
  const b2 = ws.addRow([]);
  b2.height = 14; // 2 baris kosong pemisah setelah batas cetak resmi

  const hasFilter = Boolean(filterPic || filterSasaran);
  const picDisplay = filterPic ? (SUBBAG_LABEL_MAP[filterPic] || filterPic) : 'SEMUA';

  const jamWib = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).format(now);
  const timestampFull = `${tanggalUnduh} Pukul ${jamWib} WIB`;

  const hRow1 = ws.addRow(['[PENANDA RIWAYAT FILE & AUDIT LOG SISTEM - BUKAN MERUPAKAN BAGIAN DOKUMEN RESMI]']);
  const hRow2 = ws.addRow([`Nama Dokumen RKB   : ${periode ? periode.nama_periode : 'RKB KPU Kabupaten Ngawi Pilkada 2029'} (Versi: ${periode ? (periode.versi_revisi || 'Induk') : '-'})`]);
  const hRow3 = ws.addRow([`Status Lembar Kerja: ${statusLabel || 'DRAFT AKTIF (LEMBAR KERJA)'} | Dasar Pengesahan: ${periode ? (periode.dasar_pengesahan || 'Kertas Kerja Penyusunan') : '-'}`]);
  const hRow4 = ws.addRow([`Waktu & Tanggal Unduh: ${timestampFull}${hasFilter ? ` | Cakupan Filter: PIC=${picDisplay}, Sasaran=${filterSasaran || 'SEMUA'}` : ''}`]);
  const hRow5 = ws.addRow(['Aplikasi: SI-PRABU (Sistem Perencanaan dan Belanja Terpadu) v3.0 | Pengembang: emenje']);

  [hRow1, hRow2, hRow3, hRow4, hRow5].forEach(hr => {
    hr.height = 16;
    const c = hr.getCell(1);
    c.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF666666' } };
  });
}

/**
 * Menyeimbangkan halaman penutup agar bebas orphan signature
 * dan memastikan Total Pagu Belanja & Tanda Tangan didampingi baris belanja yang proporsional.
 * Halaman-halaman sebelumnya dibiarkan mengalir secara alami mengikuti driver printer
 * agar terhindar dari konflik page break ganda (halaman yang hanya berisi 1 baris).
 */
function applyProportionalPageBreaksAndBorders(ws, dataStartRow, dataEndRow, options = {}) {
  const {
    maxCols = 11, // Kolom A s.d. K
    pageCapacity = 550, // Estimasi kapasitas vertikal halaman normal A4 Landscape (~24-25 baris)
    endingBlockHeight = 164, // Total Pagu Belanja (28pt) + Spacer (16pt) + Tanda Tangan (120pt)
    minFinalRows = 12, // Minimal baris belanja yang menemani Total & TTD di halaman penutup
    firstPageHeaderHeight = 86
  } = options;

  const totalRows = dataEndRow - dataStartRow + 1;
  if (totalRows <= minFinalRows) {
    ws.rowBreaks = [];
    return [];
  }

  // Hitung akumulasi tinggi baris secara alami untuk mendeteksi kapasitas halaman terakhir
  let currentAccumulated = firstPageHeaderHeight; // Halaman 1 (Judul + Header)
  for (let r = dataStartRow; r <= dataEndRow; r++) {
    const rH = ws.getRow(r).height || 20;
    if (currentAccumulated + rH > pageCapacity) {
      currentAccumulated = 28 + rH; // Halaman berikutnya diawali repeating header 28pt
    } else {
      currentAccumulated += rH;
    }
  }

  const remainingSpace = pageCapacity - currentAccumulated;
  const dataHeightOnLastPage = currentAccumulated - 28;
  const isOverflow = (remainingSpace < endingBlockHeight);
  const isTooFewRows = (dataHeightOnLastPage < minFinalRows * 20);
  const pageBreaks = [];

  // Jika sisa ruang di halaman akhir tidak cukup untuk Total Belanja + TTD (overflow / orphan signature),
  // ATAU jika baris belanja di halaman penutup terlalu sedikit (< minFinalRows baris, terlihat lowong):
  // Pasang TEPAT 1 manual page break agar minFinalRows baris belanja ikut menyeberang ke halaman penutup
  if ((isOverflow || isTooFewRows) && totalRows >= minFinalRows + 6) {
    const breakRow = Math.max(dataStartRow + 4, dataEndRow - minFinalRows);
    pageBreaks.push(breakRow);
    ws.rowBreaks = [{ id: breakRow, max: maxCols, man: 1 }];

    // Garis penutup tebal MEDIUM BLACK pada baris break penyeimbang tersebut
    for (let c = 1; c <= maxCols; c++) {
      const cell = ws.getCell(breakRow, c);
      const curr = cell.border || {};
      cell.border = {
        top: curr.top,
        bottom: { style: 'medium', color: { argb: 'FF000000' } },
        left: curr.left,
        right: curr.right
      };
    }
  } else {
    ws.rowBreaks = [];
  }

  return pageBreaks;
}

// ============================================================================
// SHARED PRESENTATION & DOCUMENT HEADERS FOR REKAP & RUH SHEETS
// ============================================================================

function applyPresentationHeader(row, colsCount = 6) {
  row.height = 28;
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

function applySectionBanner(ws, text, colsCount = 6) {
  const r = ws.addRow([text]);
  r.height = 24;
  ws.mergeCells(`A${r.number}:${String.fromCharCode(64 + colsCount)}${r.number}`);
  const cell = r.getCell(1);
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  return r;
}

function applyDocumentHeader(ws, subTitle, colsCount = 6) {
  ws.addRow(['KOMISI PEMILIHAN UMUM KABUPATEN NGAWI']);
  ws.addRow([subTitle.toUpperCase()]);
  ws.addRow(['BELANJA HIBAH DALAM RANGKA PEMILIHAN BUPATI DAN WAKIL BUPATI 2029']);
  ws.addRow([]); // Baris 4: Spasi kosong pemisah sebelum header tabel

  const lastColLetter = String.fromCharCode(64 + colsCount);
  ws.mergeCells(`A1:${lastColLetter}1`);
  ws.mergeCells(`A2:${lastColLetter}2`);
  ws.mergeCells(`A3:${lastColLetter}3`);

  ws.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
  ws.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell('A2').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF006699' } };
  ws.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell('A3').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF333333' } };
  ws.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

  ws.getRow(1).height = 24;
  ws.getRow(2).height = 24;
  ws.getRow(3).height = 22;
  ws.getRow(4).height = 10;
}

function appendKetuaSignatureBlock(ws, targetCol, tgl, ketua) {
  const b1 = ws.addRow([]);
  b1.height = 16;
  const colNum = typeof targetCol === 'number' ? targetCol : (targetCol.charCodeAt(0) - 64);
  
  const r1 = ws.addRow([]);
  r1.height = 20;
  r1.getCell(colNum).value = `NGAWI, ${tgl}`;
  r1.getCell(colNum).font = { name: 'Calibri', size: 11, bold: true };
  r1.getCell(colNum).alignment = { horizontal: 'center', vertical: 'middle' };

  const r2 = ws.addRow([]);
  r2.height = 20;
  r2.getCell(colNum).value = 'Ketua Komisi Pemilihan Umum';
  r2.getCell(colNum).font = { name: 'Calibri', size: 11, bold: true };
  r2.getCell(colNum).alignment = { horizontal: 'center', vertical: 'middle' };

  const r3 = ws.addRow([]);
  r3.height = 20;
  r3.getCell(colNum).value = 'Kabupaten Ngawi,';
  r3.getCell(colNum).font = { name: 'Calibri', size: 11, bold: true };
  r3.getCell(colNum).alignment = { horizontal: 'center', vertical: 'middle' };

  const rSpace = ws.addRow([]);
  rSpace.height = 32;

  const r7 = ws.addRow([]);
  r7.height = 22;
  r7.getCell(colNum).value = ketua;
  r7.getCell(colNum).font = { name: 'Calibri', size: 12, bold: true, underline: false };
  r7.getCell(colNum).alignment = { horizontal: 'center', vertical: 'middle' };

  return ws.rowCount;
}

// ============================================================================
// MODULAR REKAP SHEET BUILDERS (OPSI A: PER TAB & OPSI B: BUKU KOMPILASI 5 MODUL)
// ============================================================================

function buildSheetRekapEksekutif(wb, ctx) {
  const { summary, grandTotal, targetPeriode, periode, statusLabel, tanggalUnduh, namaKetua, filterPic, filterSasaran, wilSummary } = ctx;
  const sas = summary.bySasaran || {};

  const ws = wb.addWorksheet('Rekap_Eksekutif', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1
    }
  });

  applyDocumentHeader(ws, 'RESUME EKSEKUTIF ALOKASI ANGGARAN PILKADA TAHUN 2029', 6);

  // KARTU INDIKATOR MAKRO EKSEKUTIF
  const totalPenyelenggara = (sas.KAB || 0) + (sas.PPK || 0) + (sas.PPS || 0) + (sas.PANTARLIH || 0) + (sas.TPS || 0);
  const totalBadanAdHoc = (sas.PPK || 0) + (sas.PPS || 0) + (sas.PANTARLIH || 0) + (sas.TPS || 0);
  const valPeserta = sas.PESERTA || 0;

  const cardHeaderRow = ws.addRow([
    'TOTAL PAGU BELANJA', '',
    'OPERASIONAL & LOGISTIK KAB.',
    'ALOKASI BADAN AD HOC',
    'FASILITASI PESERTA PEMILIHAN', '', ''
  ]);
  const cardValRow = ws.addRow([
    grandTotal, '',
    sas.KAB || 0,
    totalBadanAdHoc,
    valPeserta, '', ''
  ]);
  const cardSubRow = ws.addRow([
    '100.00% Alokasi Terdistribusi Penuh', '',
    `${(((sas.KAB || 0) / grandTotal) * 100).toFixed(2)}% Satker KPU Kab. Ngawi`,
    `${(((totalBadanAdHoc) / grandTotal) * 100).toFixed(2)}% PPK, PPS, KPPS & Pantarlih`,
    `${(((valPeserta) / grandTotal) * 100).toFixed(2)}% Paslon & Parpol (Debat, APK, dll)`, '', ''
  ]);

  cardHeaderRow.height = 20;
  cardValRow.height = 26;
  cardSubRow.height = 20;

  const rH = cardHeaderRow.number;
  const rV = cardValRow.number;
  const rS = cardSubRow.number;

  ws.mergeCells(`A${rH}:B${rH}`); ws.mergeCells(`A${rV}:B${rV}`); ws.mergeCells(`A${rS}:B${rS}`);
  ws.mergeCells(`E${rH}:F${rH}`); ws.mergeCells(`E${rV}:F${rV}`); ws.mergeCells(`E${rS}:F${rS}`);

  ['A', 'B'].forEach(col => {
    [rH, rV, rS].forEach(r => {
      ws.getCell(`${col}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
    });
  });
  ws.getCell(`A${rH}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0369A1' } };
  ws.getCell(`A${rV}`).font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF0284C7' } };
  ws.getCell(`A${rV}`).numFmt = '#,##0';
  ws.getCell(`A${rS}`).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF075985' } };
  ws.getCell(`A${rH}`).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell(`A${rV}`).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell(`A${rS}`).alignment = { vertical: 'middle', horizontal: 'center' };

  [rH, rV, rS].forEach(r => {
    ws.getCell(`C${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
  });
  ws.getCell(`C${rH}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF6B21A8' } };
  ws.getCell(`C${rV}`).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF7E22CE' } };
  ws.getCell(`C${rV}`).numFmt = '#,##0';
  ws.getCell(`C${rS}`).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF581C87' } };
  ws.getCell(`C${rH}`).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell(`C${rV}`).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell(`C${rS}`).alignment = { vertical: 'middle', horizontal: 'center' };

  [rH, rV, rS].forEach(r => {
    ws.getCell(`D${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
  });
  ws.getCell(`D${rH}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
  ws.getCell(`D${rV}`).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF16A34A' } };
  ws.getCell(`D${rV}`).numFmt = '#,##0';
  ws.getCell(`D${rS}`).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF14532D' } };
  ws.getCell(`D${rH}`).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell(`D${rV}`).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell(`D${rS}`).alignment = { vertical: 'middle', horizontal: 'center' };

  ['E', 'F'].forEach(col => {
    [rH, rV, rS].forEach(r => {
      ws.getCell(`${col}${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    });
  });
  ws.getCell(`E${rH}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } };
  ws.getCell(`E${rV}`).font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFD97706' } };
  ws.getCell(`E${rV}`).numFmt = '#,##0';
  ws.getCell(`E${rS}`).font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF78350F' } };
  ws.getCell(`E${rH}`).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell(`E${rV}`).alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getCell(`E${rS}`).alignment = { vertical: 'middle', horizontal: 'center' };

  const bCard = ws.addRow([]);
  bCard.height = 12;

  // TABEL 1: DISTRIBUSI SASARAN & PENERIMA LAPANGAN
  applySectionBanner(ws, 'I. DISTRIBUSI ANGGARAN BERDASARKAN TINGKATAN SASARAN DAN PENERIMA LAPANGAN', 6);
  const hRow1 = ws.addRow(['No', 'Tingkatan Sasaran Anggaran', 'Entitas Unit / Wilayah Sasaran', 'Pagu Anggaran (Rp)', 'Porsi (%)', 'Ruang Lingkup Kegiatan & Keterangan Belanja']);
  applyPresentationHeader(hRow1, 6);

  const wil = wilSummary || {};
  const jmlKec = wil.jumlah_ppk || 19;
  const jmlDesa = wil.jumlah_pps || 217;
  const jmlTps = wil.jumlah_tps || 1393;
  const jmlPantarlih = wil.jumlah_pantarlih || 2784;
  const jmlPetugasTps = (wil.vars && wil.vars.petugas_tps) ? wil.vars.petugas_tps : (jmlTps * 9);

  const dataSasaran = [
    { title: 'Tingkat Satker Kabupaten (KPU Kab. Ngawi)', entitas: '1 Satker KPU Kab. Ngawi', val: sas.KAB || 0, desc: 'Pengadaan logistik utama (surat suara, kotak, bilik), bimtek komprehensif, sosialisasi sentral, advokasi sengketa hukum, dan operasional satker' },
    { title: 'Tingkat Kecamatan (PPK)', entitas: `${Number(jmlKec).toLocaleString('id-ID')} Kantor PPK se-Kabupaten`, val: sas.PPK || 0, desc: `Operasional kesekretariatan ${Number(jmlKec).toLocaleString('id-ID')} PPK, belanja ATK, konsumsi rapat kerja/pleno, dan dukungan administrasi rekapitulasi tingkat kecamatan` },
    { title: 'Tingkat Desa / Kelurahan (PPS)', entitas: `${Number(jmlDesa).toLocaleString('id-ID')} Kantor PPS se-Kabupaten`, val: sas.PPS || 0, desc: `Operasional sekretariat ${Number(jmlDesa).toLocaleString('id-ID')} PPS, pengumuman DPS/DPT, distribusi logistik desa, dan honorarium PPS se-Kabupaten Ngawi` },
    { title: 'Petugas Pemutakhiran Data Pemilih (Pantarlih)', entitas: `${Number(jmlPantarlih).toLocaleString('id-ID')} Petugas Lapangan`, val: sas.PANTARLIH || 0, desc: 'Perlengkapan coklit door-to-door, dokumen kerja sensus pemilih, dan supervisi pemutakhiran data pemilih berkelanjutan' },
    { title: 'Tingkat Tempat Pemungutan Suara (TPS)', entitas: `${Number(jmlTps).toLocaleString('id-ID')} TPS (${Number(jmlPetugasTps).toLocaleString('id-ID')} Petugas)`, val: sas.TPS || 0, desc: 'Honorarium KPPS dan Petugas Ketertiban Linmas per TPS, operasional KPPS, serta pembuatan tenda TPS' }
  ];

  dataSasaran.forEach((d, idx) => {
    const pct = ((d.val / grandTotal) * 100).toFixed(2) + '%';
    const r = ws.addRow([idx + 1, d.title, d.entitas, d.val, pct, d.desc]);
    r.height = 20;
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
  const totPenyRow = ws.addRow(['', 'SUBTOTAL PENYELENGGARA PEMILIHAN (1 s.d 5):', 'Seluruh Wilayah Kabupaten Ngawi', totalPenyelenggara, pctPenyelenggara, 'Akumulasi anggaran seluruh tingkatan penyelenggara (KPU, PPK, PPS, KPPS, Pantarlih)']);
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
  const pesertaRow = ws.addRow(['6', 'Fasilitasi Peserta Pemilihan', 'Paslon & Partai Politik', valPeserta, pctPeserta, 'Pencetakan & pemasangan APK, bahan kampanye paslon, debat publik terbuka, fasilitasi iklan media massa, dan audit KAP']);
  pesertaRow.height = 22;
  for (let c = 1; c <= 6; c++) {
    pesertaRow.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
    pesertaRow.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
  }
  pesertaRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
  pesertaRow.getCell(4).numFmt = '#,##0';
  pesertaRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  pesertaRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

  const grandTotRow = ws.addRow(['', 'TOTAL PAGU BELANJA:', 'Hibah NPHD Pilkada 2029', grandTotal, '100.00%', 'Anggaran berimbang (100% balance) siap dilaksanakan dan dipertanggungjawabkan']);
  grandTotRow.height = 26;
  grandTotRow.font = { name: 'Calibri', size: 11.5, bold: true };
  grandTotRow.getCell(4).numFmt = '#,##0';
  grandTotRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  grandTotRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 6; c++) {
    grandTotRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
    grandTotRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'double', color: { argb: 'FF000000' } } };
  }

  // TABEL 2: DUA PILAR UTAMA
  const bTab2 = ws.addRow([]);
  bTab2.height = 14;
  applySectionBanner(ws, 'II. KOMPOSISI DUA PILAR UTAMA ANGGARAN PILKADA', 6);
  const hRow2 = ws.addRow(['No', 'Pilar Komponen Anggaran', 'Rincian Komponen Pelaksanaan', 'Pagu Anggaran (Rp)', 'Porsi (%)', 'Arah Kebijakan Anggaran']);
  applyPresentationHeader(hRow2, 6);

  const banner = summary.banner || {};
  const totPilarTahapan = (banner.tahapanTotal || 0) + (banner.operasionalTotal || 0) || 26614699000;
  const totPilarHonor = banner.honorTotal || 23385300000;

  const dataPilar = [
    { no: '1', title: 'Tahapan Persiapan & Pelaksanaan', rincian: '28 Komponen Kegiatan Teknis & Non-Tahapan', val: totPilarTahapan, desc: 'Membiayai seluruh belanja barang, pengadaan logistik utama, sewa gedung/gudang, sosialisasi, bimbingan teknis, dan administrasi perkantoran' },
    { no: '2', title: 'Honorarium Badan Penyelenggara Ad Hoc & Pokja', rincian: 'PPK, PPS, KPPS, Pantarlih, dan Kelompok Kerja Pemilihan', val: totPilarHonor, desc: 'Alokasi khusus imbalan jasa dan keringat ribuan petugas pemilu di tingkat kecamatan, desa, hingga garda terdepan TPS se-Kabupaten Ngawi' }
  ];

  dataPilar.forEach(d => {
    const pct = ((d.val / grandTotal) * 100).toFixed(2) + '%';
    const r = ws.addRow([d.no, d.title, d.rincian, d.val, pct, d.desc]);
    r.height = 20;
    for (let c = 1; c <= 6; c++) {
      r.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    }
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(4).numFmt = '#,##0';
    r.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const totPilarRow = ws.addRow(['', 'TOTAL KESELURUHAN DUA PILAR (1 + 2):', '100% Seluruh Komponen Pelaksanaan', (totPilarTahapan + totPilarHonor), '100.00%', 'Komposisi seimbang antara pelaksanaan kegiatan teknis dan kesejahteraan penyelenggara lapangan']);
  totPilarRow.height = 26;
  totPilarRow.font = { name: 'Calibri', size: 11.5, bold: true };
  totPilarRow.getCell(4).numFmt = '#,##0';
  totPilarRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' };
  totPilarRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 6; c++) {
    totPilarRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
    totPilarRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'double', color: { argb: 'FF000000' } } };
  }

  const signEndEksekutif = appendKetuaSignatureBlock(ws, 5, tanggalUnduh, namaKetua);
  ws.columns = [
    { width: 6 },
    { width: 38 },
    { width: 32 },
    { width: 24 },
    { width: 14 },
    { width: 52 }
  ];
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.4, right: 0.4, top: 0.35, bottom: 0.4, header: 0.2, footer: 0.25 },
    printArea: `A1:F${signEndEksekutif}`,
    printTitlesRow: '10:10'
  };
  ws.headerFooter = {
    oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
    evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
  };
  appendAuditSignature(ws, { periode: targetPeriode || periode, statusLabel, tanggalUnduh, filterPic, filterSasaran, now: ctx.now });
  return ws;
}

function buildSheetRekapKegiatan(wb, ctx) {
  const { rows, grandTotal, targetPeriode, periode, statusLabel, tanggalUnduh, namaKetua, filterPic, filterSasaran } = ctx;

  const ws = wb.addWorksheet('Rekap_Kegiatan_RKB', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  applyDocumentHeader(ws, 'REKAPITULASI PROGRAM DAN KEGIATAN SESUAI TINGKATAN (LEVEL RKB)', 5);

  const hRowKegiatan = ws.addRow(['Kode', 'Uraian Program / Kegiatan (Level RKB)', 'Pagu Anggaran (Rp)', 'Porsi (%)', 'PIC Subbag Utama']);
  applyPresentationHeader(hRowKegiatan, 5);

  function addLevelHeader(wsK, kode, uraian, totalVal, isLevel1 = false) {
    const pct = grandTotal > 0 ? (((totalVal / grandTotal) * 100).toFixed(2) + '%') : '0.00%';
    const r = wsK.addRow([kode, uraian, totalVal, pct, isLevel1 ? 'Kelompok Makro' : 'Kelompok Tahapan']);
    r.height = isLevel1 ? 34 : 30;
    const bgColor = isLevel1 ? 'FF1E293B' : 'FF334155';
    for (let c = 1; c <= 5; c++) {
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
      r.getCell(c).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      r.getCell(c).border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    }
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(3).numFmt = '#,##0';
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    return r;
  }

  function addSubtotalRow(wsK, label, totalVal, note = '') {
    const pct = grandTotal > 0 ? (((totalVal / grandTotal) * 100).toFixed(2) + '%') : '0.00%';
    const r = wsK.addRow(['', label, totalVal, pct, note]);
    r.height = 24;
    for (let c = 1; c <= 5; c++) {
      r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      r.getCell(c).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF1E293B' } };
      r.getCell(c).border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    }
    r.getCell(3).numFmt = '#,##0';
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    return r;
  }

  function addItemRow(wsK, it) {
    const val = it.computed_total || 0;
    const pct = grandTotal > 0 ? (((val / grandTotal) * 100).toFixed(2) + '%') : '0.00%';
    const r = wsK.addRow([it.kode || '', '    ' + (it.uraian || ''), val, pct, it.pic_bagian || '-']);
    r.height = 26;
    for (let c = 1; c <= 5; c++) {
      r.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
      r.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    }
    r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(3).numFmt = '#,##0';
    r.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
    r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    return r;
  }

  // --- BAGIAN A: KEBUTUHAN BARANG DAN JASA ---
  const secA = (rows || []).find(r => r.is_header && Number(r.level_indent) === 0 && r.kode === 'A');
  if (secA) {
    addLevelHeader(ws, secA.kode, secA.uraian, secA.computed_total, true);
    const childrenA = (rows || []).filter(r => (r.parent_tree_id === secA.tree_id || r.parent_tree_id === 'row_' + secA.id) && Number(r.level_indent) === 1);
    childrenA.forEach(tahapan => {
      addLevelHeader(ws, tahapan.kode, tahapan.uraian, tahapan.computed_total, false);
      const actItems = (rows || []).filter(r => (r.parent_tree_id === tahapan.tree_id || r.parent_tree_id === 'row_' + tahapan.id) && (r.tree_level === 3 || (r.is_header && Number(r.level_indent) === 2)));
      actItems.forEach(it => addItemRow(ws, it));
      addSubtotalRow(ws, `SUBTOTAL ${tahapan.uraian.toUpperCase()} (${tahapan.kode.replace(/\./g, '')}):`, tahapan.computed_total, `${actItems.length} Kegiatan`);
    });
    const subTotA = addSubtotalRow(ws, 'SUBTOTAL KEBUTUHAN BARANG DAN JASA (A):', secA.computed_total, '28 Kegiatan & Operasional');
    for (let c = 1; c <= 5; c++) {
      subTotA.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    }
  }

  // --- BAGIAN B: HONORARIUM KELOMPOK KERJA DAN PENYELENGGARA PEMILIHAN ---
  const secB = (rows || []).find(r => r.is_header && Number(r.level_indent) === 0 && r.kode === 'B');
  if (secB) {
    addLevelHeader(ws, secB.kode, secB.uraian, secB.computed_total, true);
    const childrenB = (rows || []).filter(r => (r.parent_tree_id === secB.tree_id || r.parent_tree_id === 'row_' + secB.id) && Number(r.level_indent) === 1);
    childrenB.forEach(tahapan => {
      addLevelHeader(ws, tahapan.kode, tahapan.uraian, tahapan.computed_total, false);
      const actItems = (rows || []).filter(r => (r.parent_tree_id === tahapan.tree_id || r.parent_tree_id === 'row_' + tahapan.id) && (r.tree_level === 3 || (r.is_header && Number(r.level_indent) === 2)));
      if (actItems.length > 0) {
        actItems.forEach(it => addItemRow(ws, it));
        addSubtotalRow(ws, `SUBTOTAL ${tahapan.uraian.toUpperCase()} (${tahapan.kode.replace(/\./g, '')}):`, tahapan.computed_total, 'PPK, PPS, KPPS & Pantarlih');
      } else {
        const valPokja = tahapan.computed_total || 0;
        const pctPokja = grandTotal > 0 ? (((valPokja / grandTotal) * 100).toFixed(2) + '%') : '0.00%';
        const rPokja = ws.addRow([
          'Pokja',
          '    Honorarium Kelompok Kerja (Pokja) Pemilihan (11 Bidang Pokja)',
          valPokja,
          pctPokja,
          'KUL / Lintas Subbag'
        ]);
        rPokja.height = 24;
        for (let c = 1; c <= 5; c++) {
          rPokja.getCell(c).font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };
          rPokja.getCell(c).border = { bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } }, left: { style: 'thin', color: { argb: 'FFE5E7EB' } }, right: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
        }
        rPokja.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        rPokja.getCell(3).numFmt = '#,##0';
        rPokja.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
        rPokja.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        rPokja.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

        addSubtotalRow(ws, `SUBTOTAL ${tahapan.uraian.toUpperCase()} (${tahapan.kode.replace(/\./g, '')}):`, valPokja, '11 Bidang Pokja');
      }
    });
    const subTotB = addSubtotalRow(ws, 'SUBTOTAL HONORARIUM KELOMPOK KERJA & PENYELENGGARA (B):', secB.computed_total, 'Pokja & Badan Ad Hoc');
    for (let c = 1; c <= 5; c++) {
      subTotB.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    }
  }

  const lastDataRowNumberKegiatan = ws.rowCount;
  applyProportionalPageBreaksAndBorders(ws, 6, lastDataRowNumberKegiatan, {
    maxCols: 5,
    pageCapacity: 550,
    endingBlockHeight: 164,
    minFinalRows: 8,
    firstPageHeaderHeight: 108
  });

  const grandTotL3 = ws.addRow(['', 'TOTAL REKAPITULASI PROGRAM & KEGIATAN (LEVEL RKB):', grandTotal, '100.00%', '100% Balance']);
  grandTotL3.height = 28;
  grandTotL3.font = { name: 'Calibri', size: 11.5, bold: true };
  grandTotL3.getCell(3).numFmt = '#,##0';
  grandTotL3.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
  grandTotL3.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  grandTotL3.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 5; c++) {
    grandTotL3.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
    grandTotL3.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'double', color: { argb: 'FF000000' } } };
  }

  const signEndKegiatan = appendKetuaSignatureBlock(ws, 4, tanggalUnduh, namaKetua);
  ws.columns = [
    { width: 10 },
    { width: 64 },
    { width: 24 },
    { width: 14 },
    { width: 24 }
  ];
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
    printArea: `A1:E${signEndKegiatan}`,
    printTitlesRow: '5:5'
  };
  ws.headerFooter = {
    oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
    evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
  };
  appendAuditSignature(ws, { periode: targetPeriode || periode, statusLabel, tanggalUnduh, filterPic, filterSasaran, now: ctx.now });
  return ws;
}

function buildSheetRekapSubbag(wb, ctx) {
  const { summary, grandTotal, targetPeriode, periode, statusLabel, tanggalUnduh, namaKetua, filterPic, filterSasaran } = ctx;

  const ws = wb.addWorksheet('Rekap_Subbagian', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 }
    },
    headerFooter: {
      oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
      evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
    }
  });

  applyDocumentHeader(ws, 'DISTRIBUSI PORTOFOLIO DAN TANGGUNG JAWAB SUBBAGIAN (PIC)', 5);

  const hRowSubbag = ws.addRow(['No', 'Subbagian Penanggung Jawab (PIC)', 'Pagu Kelolaan (Rp)', 'Porsi (%)', 'Fokus Utama Tanggung Jawab & Portofolio Belanja']);
  applyPresentationHeader(hRowSubbag, 5);

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
    const r = ws.addRow([idx + 1, p.name, val, pct, p.desc]);
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

  const totPicRow = ws.addRow(['', 'TOTAL SELURUH SUBBAGIAN (1 s.d 5):', totPicSum, '100.00%', 'Alokasi terbagi proporsional sesuai tugas pokok dan fungsi 5 subbagian KPU Kabupaten Ngawi']);
  totPicRow.height = 26;
  totPicRow.font = { name: 'Calibri', size: 11.5, bold: true };
  totPicRow.getCell(3).numFmt = '#,##0';
  totPicRow.getCell(3).alignment = { horizontal: 'right', vertical: 'middle' };
  totPicRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 5; c++) {
    totPicRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
    totPicRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'double', color: { argb: 'FF000000' } } };
  }

  const signEndSubbag = appendKetuaSignatureBlock(ws, 4, tanggalUnduh, namaKetua);
  ws.columns = [
    { width: 6 },
    { width: 36 },
    { width: 24 },
    { width: 14 },
    { width: 68 }
  ];
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
    printArea: `A1:E${signEndSubbag}`,
    printTitlesRow: '5:5'
  };
  ws.headerFooter = {
    oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
    evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
  };
  appendAuditSignature(ws, { periode: targetPeriode || periode, statusLabel, tanggalUnduh, filterPic, filterSasaran, now: ctx.now });
  return ws;
}

function buildSheetRekapBas(wb, ctx) {
  const { summary, akunMap, grandTotal, targetPeriode, periode, statusLabel, tanggalUnduh, namaKetua, filterPic, filterSasaran } = ctx;

  const ws = wb.addWorksheet('Rekap_Akun_BAS', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 }
    },
    headerFooter: {
      oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
      evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
    }
  });

  applyDocumentHeader(ws, 'REKAPITULASI JENIS BELANJA MAKRO (BAGAN AKUN STANDAR - BAS)', 6);

  const hRowBas = ws.addRow(['No', 'Kode Akun', 'Uraian Akun Belanja (BAS)', 'Kelompok Kategori Belanja', 'Pagu Anggaran (Rp)', 'Porsi (%)']);
  applyPresentationHeader(hRowBas, 6);

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
    const r = ws.addRow([counterAkun++, kd, akunMap[kd] || 'Belanja', getAkunCategory(kd), val, pct]);
    r.height = 20;
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

  const lastDataRowNumberBas = ws.rowCount;
  applyProportionalPageBreaksAndBorders(ws, 6, lastDataRowNumberBas, {
    maxCols: 6,
    pageCapacity: 550,
    endingBlockHeight: 164,
    minFinalRows: 6,
    firstPageHeaderHeight: 108
  });

  const totAkunRow = ws.addRow(['', '', 'TOTAL REKAPITULASI BAGAN AKUN STANDAR (BAS):', 'Seluruh Akun Belanja', totAkunSum, '100.00%']);
  totAkunRow.height = 26;
  totAkunRow.font = { name: 'Calibri', size: 11.5, bold: true };
  totAkunRow.getCell(5).numFmt = '#,##0';
  totAkunRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' };
  totAkunRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 6; c++) {
    totAkunRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } };
    totAkunRow.getCell(c).border = { top: { style: 'thin', color: { argb: 'FF000000' } }, bottom: { style: 'double', color: { argb: 'FF000000' } } };
  }

  const signEndBas = appendKetuaSignatureBlock(ws, 5, tanggalUnduh, namaKetua);
  ws.columns = [
    { width: 6 },
    { width: 14 },
    { width: 44 },
    { width: 38 },
    { width: 24 },
    { width: 14 }
  ];
  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
    printArea: `A1:F${signEndBas}`,
    printTitlesRow: '5:5'
  };
  ws.headerFooter = {
    oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
    evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
  };
  appendAuditSignature(ws, { periode: targetPeriode || periode, statusLabel, tanggalUnduh, filterPic, filterSasaran, now: ctx.now });
  return ws;
}

function buildSheetRekapSumberDana(wb, ctx) {
  const { activeData, targetPeriode, periode, mode, pic, statusLabel, tanggalUnduh, ttdList } = ctx;

  const ws1 = wb.addWorksheet('Rekap_Sumber_Dana', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.4, right: 0.4, top: 0.35, bottom: 0.4, header: 0.2, footer: 0.25 }
    },
    headerFooter: {
      oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
      evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
    }
  });
  ws1.views = [{ showGridLines: true }];

  // Header Judul 3 Baris Resmi
  ws1.mergeCells('A1:F1');
  ws1.getCell('A1').value = 'KOMISI PEMILIHAN UMUM KABUPATEN NGAWI';
  ws1.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
  ws1.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('A2:F2');
  ws1.getCell('A2').value = `REKAPITULASI SUMBER DANA ANGGARAN (${mode === 'pelaksanaan' ? 'BASELINE SAH' : 'RKB AKTIF'})`;
  ws1.getCell('A2').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF006699' } };
  ws1.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('A3:F3');
  ws1.getCell('A3').value = 'BELANJA HIBAH DALAM RANGKA PEMILIHAN BUPATI DAN WAKIL BUPATI 2029';
  ws1.getCell('A3').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF333333' } };
  ws1.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.getRow(1).height = 24;
  ws1.getRow(2).height = 24;
  ws1.getRow(3).height = 22;
  ws1.addRow([]); // Baris 4: Spasi kosong
  ws1.getRow(4).height = 10;

  // Bagian 1: Distribusi per Subbagian Pelaksana
  ws1.getCell('A5').value = 'I. REKAPITULASI DISTRIBUSI PER SUBBAGIAN PELAKSANA';
  ws1.getCell('A5').font = { name: 'Calibri', size: 11, bold: true };
  ws1.getRow(5).height = 24;

  const subbagHeaders = ['No', 'Subbagian Pelaksana', 'Alokasi APBD Kab (Rp)', 'Alokasi APBD Prov (Rp)', 'Total Anggaran (Rp)', 'Porsi Prov (%)'];
  ws1.getRow(6).values = subbagHeaders;
  ws1.getRow(6).height = 28;
  ws1.getRow(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  ws1.getRow(6).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 6; c++) {
    ws1.getCell(6, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  }

  const subbags = ['KUL', 'RENDATIN', 'TEKNIS', 'HUKUM', 'PARSDM'];
  const bySubbagCost = activeData.summary?.byCostSharingBySubbag || {};
  let rIdx = 7;
  let totalKabSubbag = 0;
  let totalProvSubbag = 0;
  let totalAllSubbag = 0;

  subbags.forEach((sbg, idx) => {
    const kabVal = bySubbagCost[sbg]?.KABUPATEN || 0;
    const provVal = bySubbagCost[sbg]?.PROVINSI || 0;
    const totVal = kabVal + provVal;
    const pctProv = totVal > 0 ? (provVal / totVal) : 0;

    totalKabSubbag += kabVal;
    totalProvSubbag += provVal;
    totalAllSubbag += totVal;

    const row = ws1.getRow(rIdx++);
    row.height = 20;
    row.values = [idx + 1, sbg, kabVal, provVal, totVal, pctProv];
    row.font = { name: 'Calibri', size: 10 };
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).numFmt = '#,##0';
    row.getCell(6).numFmt = '0.00%';
    row.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
  });

  const totalSubbagRow = ws1.getRow(rIdx++);
  totalSubbagRow.height = 24;
  const pctProvTotalSub = totalAllSubbag > 0 ? (totalProvSubbag / totalAllSubbag) : 0;
  totalSubbagRow.values = ['', 'TOTAL REKAPITULASI SUBBAGIAN', totalKabSubbag, totalProvSubbag, totalAllSubbag, pctProvTotalSub];
  totalSubbagRow.font = { name: 'Calibri', size: 10, bold: true };
  totalSubbagRow.getCell(3).numFmt = '#,##0';
  totalSubbagRow.getCell(4).numFmt = '#,##0';
  totalSubbagRow.getCell(5).numFmt = '#,##0';
  totalSubbagRow.getCell(6).numFmt = '0.00%';
  for (let c = 1; c <= 6; c++) {
    totalSubbagRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  }

  // Bagian 2: Distribusi per Sasaran (Pemisah 14pt)
  ws1.getRow(rIdx).height = 14;
  rIdx++;
  ws1.getCell(`A${rIdx}`).value = 'II. REKAPITULASI DISTRIBUSI PER KELOMPOK SASARAN';
  ws1.getCell(`A${rIdx}`).font = { name: 'Calibri', size: 11, bold: true };
  ws1.getRow(rIdx).height = 24;
  rIdx++;

  const sasHeaders = ['No', 'Kelompok Sasaran', 'Alokasi APBD Kab (Rp)', 'Alokasi APBD Prov (Rp)', 'Total Anggaran (Rp)', 'Porsi Prov (%)'];
  ws1.getRow(rIdx).values = sasHeaders;
  ws1.getRow(rIdx).height = 28;
  ws1.getRow(rIdx).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  ws1.getRow(rIdx).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 6; c++) {
    ws1.getCell(rIdx, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  }
  rIdx++;

  const sasList = [
    { code: 'KAB', label: '1. KPU Kabupaten Ngawi (Satker)' },
    { code: 'PPK', label: '2. PPK (19 Kecamatan)' },
    { code: 'PPS', label: '3. PPS (217 Desa / Kelurahan)' },
    { code: 'PANTARLIH', label: '4. Pantarlih / PPDP' },
    { code: 'TPS', label: '5. TPS (KPPS & Linmas)' },
    { code: 'PESERTA', label: '6. Peserta Pemilihan (Paslon)' }
  ];
  const bySasCost = activeData.summary?.byCostSharingBySasaran || {};
  let totalKabSas = 0;
  let totalProvSas = 0;
  let totalAllSas = 0;

  sasList.forEach((s, idx) => {
    const kabVal = bySasCost[s.code]?.KABUPATEN || 0;
    const provVal = bySasCost[s.code]?.PROVINSI || 0;
    const totVal = kabVal + provVal;
    const pctProv = totVal > 0 ? (provVal / totVal) : 0;

    totalKabSas += kabVal;
    totalProvSas += provVal;
    totalAllSas += totVal;

    const row = ws1.getRow(rIdx++);
    row.height = 20;
    row.values = [idx + 1, s.label, kabVal, provVal, totVal, pctProv];
    row.font = { name: 'Calibri', size: 10 };
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(3).numFmt = '#,##0';
    row.getCell(4).numFmt = '#,##0';
    row.getCell(5).numFmt = '#,##0';
    row.getCell(6).numFmt = '0.00%';
    row.getCell(5).font = { name: 'Calibri', size: 10, bold: true };
  });

  const totalSasRow = ws1.getRow(rIdx++);
  totalSasRow.height = 24;
  const pctProvTotalSas = totalAllSas > 0 ? (totalProvSas / totalAllSas) : 0;
  totalSasRow.values = ['', 'TOTAL REKAPITULASI SASARAN', totalKabSas, totalProvSas, totalAllSas, pctProvTotalSas];
  totalSasRow.font = { name: 'Calibri', size: 10, bold: true };
  totalSasRow.getCell(3).numFmt = '#,##0';
  totalSasRow.getCell(4).numFmt = '#,##0';
  totalSasRow.getCell(5).numFmt = '#,##0';
  totalSasRow.getCell(6).numFmt = '0.00%';
  for (let c = 1; c <= 6; c++) {
    totalSasRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  }

  // Blok Tanda Tangan Resmi Dokumen Rekap
  const ttds = ttdList || [];
  const ketuaTtd = ttds.find(p => p.id === 'KETUA') || { nama_pejabat: 'SAMSU MUSTAKIM' };
  const kpaTtd = ttds.find(p => p.id === 'SEKRETARIS') || { nama_pejabat: 'BUDI RAHAYU', nip: '19830503 200902 1 002' };

  ws1.getRow(rIdx).height = 16;
  rIdx++;
  ws1.getRow(rIdx).height = 20;
  ws1.mergeCells(`B${rIdx}:C${rIdx}`);
  ws1.getCell(`B${rIdx}`).value = 'Mengetahui,';
  ws1.getCell(`B${rIdx}`).alignment = { horizontal: 'center' };

  ws1.mergeCells(`E${rIdx}:F${rIdx}`);
  ws1.getCell(`E${rIdx}`).value = `Ngawi, ${tanggalUnduh}`;
  ws1.getCell(`E${rIdx}`).alignment = { horizontal: 'center' };

  rIdx++;
  ws1.getRow(rIdx).height = 24;
  ws1.mergeCells(`B${rIdx}:C${rIdx}`);
  ws1.getCell(`B${rIdx}`).value = 'Ketua Komisi Pemilihan Umum\nKabupaten Ngawi';
  ws1.getCell(`B${rIdx}`).font = { name: 'Calibri', size: 10, bold: true };
  ws1.getCell(`B${rIdx}`).alignment = { horizontal: 'center', wrapText: true };

  ws1.mergeCells(`E${rIdx}:F${rIdx}`);
  ws1.getCell(`E${rIdx}`).value = 'Sekretaris KPU Kabupaten Ngawi\nSelaku Kuasa Pengguna Anggaran (KPA)';
  ws1.getCell(`E${rIdx}`).font = { name: 'Calibri', size: 10, bold: true };
  ws1.getCell(`E${rIdx}`).alignment = { horizontal: 'center', wrapText: true };

  rIdx++;
  const spaceRowCost1 = ws1.getRow(rIdx);
  spaceRowCost1.height = 32;

  rIdx++;
  ws1.getRow(rIdx).height = 22;
  ws1.mergeCells(`B${rIdx}:C${rIdx}`);
  ws1.getCell(`B${rIdx}`).value = ketuaTtd.nama_pejabat;
  ws1.getCell(`B${rIdx}`).font = { name: 'Calibri', size: 10, bold: true, underline: true };
  ws1.getCell(`B${rIdx}`).alignment = { horizontal: 'center' };

  ws1.mergeCells(`E${rIdx}:F${rIdx}`);
  ws1.getCell(`E${rIdx}`).value = kpaTtd.nama_pejabat;
  ws1.getCell(`E${rIdx}`).font = { name: 'Calibri', size: 10, bold: true, underline: true };
  ws1.getCell(`E${rIdx}`).alignment = { horizontal: 'center' };

  rIdx++;
  ws1.getRow(rIdx).height = 18;
  ws1.mergeCells(`E${rIdx}:F${rIdx}`);
  ws1.getCell(`E${rIdx}`).value = `NIP. ${kpaTtd.nip || '-'}`;
  ws1.getCell(`E${rIdx}`).font = { name: 'Calibri', size: 9 };
  ws1.getCell(`E${rIdx}`).alignment = { horizontal: 'center' };

  ws1.columns = [
    { width: 6 },
    { width: 38 },
    { width: 24 },
    { width: 24 },
    { width: 26 },
    { width: 16 }
  ];

  const signEndRowCost1 = rIdx;
  ws1.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: { left: 0.4, right: 0.4, top: 0.35, bottom: 0.4, header: 0.2, footer: 0.25 },
    printArea: `A1:F${signEndRowCost1}`,
    printTitlesRow: '6:6'
  };
  appendAuditSignature(ws1, { periode: targetPeriode || periode, statusLabel, tanggalUnduh, filterPic: pic, filterSasaran: mode, now: ctx.now });
  return ws1;
}

function buildSheetRincianSharingProv(wb, ctx) {
  const { activeData, targetPeriode, periode, mode, pic, statusLabel, tanggalUnduh } = ctx;

  const ws2 = wb.addWorksheet('Rincian_Sharing_Prov', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 }
    },
    headerFooter: {
      oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
      evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
    }
  });
  ws2.views = [{ showGridLines: true }];

  ws2.mergeCells('A1:I1');
  ws2.getCell('A1').value = 'KOMISI PEMILIHAN UMUM KABUPATEN NGAWI';
  ws2.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
  ws2.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

  ws2.mergeCells('A2:I2');
  ws2.getCell('A2').value = 'DAFTAR ITEM BELANJA BERSUMBER APBD PROVINSI (SHARING)';
  ws2.getCell('A2').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF065F46' } };
  ws2.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

  ws2.mergeCells('A3:I3');
  ws2.getCell('A3').value = 'BELANJA HIBAH DALAM RANGKA PEMILIHAN BUPATI DAN WAKIL BUPATI 2029';
  ws2.getCell('A3').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF333333' } };
  ws2.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

  ws2.getRow(1).height = 24;
  ws2.getRow(2).height = 24;
  ws2.getRow(3).height = 22;
  ws2.addRow([]); // Baris 4: Spasi kosong
  ws2.getRow(4).height = 10;

  const provHeaders = ['No', 'Kode Akun', 'Uraian Rincian Belanja', 'PIC', 'Sasaran', 'Volume', 'Satuan', 'Harga Satuan (Rp)', 'Total Anggaran (Rp)'];
  ws2.getRow(5).values = provHeaders;
  ws2.getRow(5).height = 28;
  ws2.getRow(5).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  ws2.getRow(5).alignment = { horizontal: 'center', vertical: 'middle' };
  for (let c = 1; c <= 9; c++) {
    ws2.getCell(5, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
  }

  const provItems = (activeData.rows || []).filter(r => !r.is_header && (r.cost_sharing || '').toUpperCase() === 'PROVINSI');
  let pIdx = 6;
  let totalProvItems = 0;
  provItems.forEach((it, idx) => {
    const tot = Number(it.computed_total || it.jumlah) || 0;
    totalProvItems += tot;
    const row = ws2.getRow(pIdx++);
    row.height = 20;
    row.values = [
      idx + 1,
      it.kode_akun || '-',
      it.uraian || '-',
      it.pic_bagian || '-',
      it.target_scope || 'KAB',
      it.vol_total || it.computed_volume || 1,
      it.satuan_vol || '',
      it.harga_satuan || 0,
      tot
    ];
    row.font = { name: 'Calibri', size: 10 };
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).numFmt = '#,##0.##';
    row.getCell(8).numFmt = '#,##0';
    row.getCell(9).numFmt = '#,##0';
    row.getCell(9).font = { name: 'Calibri', size: 10, bold: true };
  });

  if (provItems.length > 0) {
    const lastDataRowNumberProv = ws2.rowCount;
    applyProportionalPageBreaksAndBorders(ws2, 6, lastDataRowNumberProv, {
      maxCols: 9,
      pageCapacity: 550,
      endingBlockHeight: 164,
      minFinalRows: 6,
      firstPageHeaderHeight: 108
    });
  }

  const totalProvItemRow = ws2.getRow(pIdx++);
  totalProvItemRow.height = 26;
  totalProvItemRow.values = ['', '', 'TOTAL BELANJA APBD PROVINSI', '', '', '', '', '', totalProvItems];
  totalProvItemRow.font = { name: 'Calibri', size: 10, bold: true };
  totalProvItemRow.getCell(9).numFmt = '#,##0';
  for (let c = 1; c <= 9; c++) {
    totalProvItemRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
  }

  ws2.columns = [
    { width: 6 },
    { width: 14 },
    { width: 44 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 20 },
    { width: 24 }
  ];

  const signEndRowCost2 = pIdx;
  ws2.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
    printArea: `A1:I${signEndRowCost2}`,
    printTitlesRow: '5:5'
  };
  appendAuditSignature(ws2, { periode: targetPeriode || periode, statusLabel, tanggalUnduh, filterPic: pic, filterSasaran: mode, now: ctx.now });
  return ws2;
}

/**
 * Ekspor Rekapitulasi Perencanaan / Pelaksanaan Anggaran ke format Excel
 * Opsi A: Mengunduh sheet modul aktif yang sedang dilihat di layar
 * Opsi B: Mengunduh Buku Kompilasi 5 Sheet Rekap Lengkap tanpa rincian RUH / Kertas Kerja
 */
async function exportRekapToExcelBuffer(periodeId, { pic = 'SEMUA', mode = 'perencanaan', tab = 'EKSEKUTIF', fullCompilation = false } = {}) {
  const targetPeriode = (periodeId ? getPeriodeById(periodeId) : null)
    || (mode === 'pelaksanaan' ? getLatestRatifiedPeriode() : (getActivePeriode() || getLatestRatifiedPeriode()));
  if (!targetPeriode) {
    throw new Error('Dokumen RKB sumber rekap tidak ditemukan.');
  }

  const fullDataset = getCachedRkbDataset(targetPeriode.id);
  const activeData = (pic && pic !== 'SEMUA')
    ? filterAndPruneRkbDataset(fullDataset, { pic })
    : fullDataset;

  const summary = activeData.summary || {};
  const rows = activeData.rows || [];
  const grandTotal = Number(summary.grandTotal) || 1;

  const masters = getMasters ? getMasters() : {};
  const settings = masters.settings || {};
  const namaKetua = settings.nama_ketua || 'SAMSU MUSTAKIM';
  const masterAkuns = masters.akuns || [];
  const akunMap = {};
  masterAkuns.forEach(a => { akunMap[a.kode] = a.uraian; });

  const wilSummary = getWilayahData ? getWilayahData() : {};
  const ttdList = getPenandatanganList ? getPenandatanganList() : [];

  const now = new Date();
  const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const tanggalUnduh = `${now.getDate()} ${bulanIndo[now.getMonth()]} ${now.getFullYear()}`;

  let statusLabel = 'DRAFT AKTIF (LEMBAR KERJA)';
  if (targetPeriode && targetPeriode.is_locked) {
    if (targetPeriode.tahap_revisi === 'PRA_NPHD') statusLabel = `ARSIP PRA-NPHD (${targetPeriode.dasar_pengesahan || 'USULAN'})`;
    else if (targetPeriode.dasar_pengesahan === 'NPHD' || targetPeriode.tahap_revisi === 'RKB_AWAL') statusLabel = 'TERKUNCI (NPHD SAH - BASELINE)';
    else statusLabel = `TERKUNCI PASCA-NPHD (${targetPeriode.dasar_pengesahan || 'BA TAPD'})`;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'SI-PRABU KPU Kabupaten Ngawi';
  wb.created = now;

  const ctx = {
    summary,
    rows,
    grandTotal,
    targetPeriode,
    periode: targetPeriode,
    statusLabel,
    tanggalUnduh,
    namaKetua,
    filterPic: pic,
    filterSasaran: mode,
    wilSummary,
    ttdList,
    akunMap,
    activeData,
    mode,
    pic,
    now
  };

  const provItems = (activeData.rows || []).filter(r => !r.is_header && (r.cost_sharing || '').toUpperCase() === 'PROVINSI');

  if (fullCompilation) {
    // Opsi B: Buku Kompilasi 5 Sheet Rekapitulasi Lengkap Murni
    buildSheetRekapEksekutif(wb, ctx);
    buildSheetRekapKegiatan(wb, ctx);
    buildSheetRekapSubbag(wb, ctx);
    buildSheetRekapBas(wb, ctx);
    buildSheetRekapSumberDana(wb, ctx);
    if (provItems.length > 0) {
      buildSheetRincianSharingProv(wb, ctx);
    }
  } else {
    // Opsi A: Unduh Tab / Modul Aktif Saja
    const targetTab = (tab || 'EKSEKUTIF').toUpperCase();
    if (targetTab === 'EKSEKUTIF') {
      buildSheetRekapEksekutif(wb, ctx);
    } else if (targetTab === 'KEGIATAN') {
      buildSheetRekapKegiatan(wb, ctx);
    } else if (targetTab === 'SUBBAGIAN') {
      buildSheetRekapSubbag(wb, ctx);
    } else if (targetTab === 'AKUN_BAS') {
      buildSheetRekapBas(wb, ctx);
    } else if (targetTab === 'COST_SHARING' || targetTab === 'SUMBER_DANA') {
      buildSheetRekapSumberDana(wb, ctx);
      if (provItems.length > 0) {
        buildSheetRincianSharingProv(wb, ctx);
      }
    } else {
      buildSheetRekapEksekutif(wb, ctx);
    }
  }

  return await wb.xlsx.writeBuffer();
}

/**
 * Menghasilkan buffer XLSX untuk download RUH Belanja Multi-Sheet
 * Format Standar Detail 16 Segmen KPU Kabupaten Ngawi
 * @param {number} periodeId
 * @param {object} options { pic, sasaran, scope }
 * @returns {Promise<Buffer>}
 */
async function exportRkbToExcelBuffer(periodeId, options = {}) {
  const periode = getPeriodeById(periodeId);
  const { rows, summary } = getCachedRkbDataset(periodeId);
  const masters = getMasters ? getMasters() : {};
  const settings = masters.settings || {};
  const namaKetua = settings.nama_ketua || 'SAMSU MUSTAKIM';
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

  const opt = options || {};
  // Filter Baris jika parameter pic atau sasaran aktif
  let filterPic = opt.pic && opt.pic !== 'SEMUA' ? opt.pic.toUpperCase() : null;
  if (filterPic === 'PERENCANAAN') filterPic = 'RENDATIN';
  if (filterPic === 'KEUANGAN') filterPic = 'KUL';
  if (filterPic === 'PARMAS') filterPic = 'PARSDM';
  const filterSasaran = opt.sasaran && opt.sasaran !== 'ALL' ? opt.sasaran.toUpperCase() : null;
  const hasFilter = Boolean(filterPic || filterSasaran);
  const isPicDownload = Boolean(filterPic);

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
  wb.creator = 'emenje';
  wb.lastModifiedBy = 'SI-PRABU v3.0';
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
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 }
    },
    headerFooter: {
      oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
      evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
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
  ws1.addRow(['BELANJA HIBAH DALAM RANGKA PEMILIHAN BUPATI DAN WAKIL BUPATI 2029']);
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

  // Latar Header Format Detail 16 Segmen (#0099CC), font putih tebal 11pt
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
    // Menjamin setiap baris memiliki garis bawah hitam yang jelas (penutup tabel otomatis pada setiap halaman cetak)
    let hTop = undefined;
    let hBottom = { style: 'thin', color: { argb: 'FF000000' } }; // Garis bawah hitam solid (penutup tabel)

    if (treeLvl === 1) {
      hTop = { style: 'medium', color: { argb: 'FF000000' } };
      hBottom = { style: 'thin', color: { argb: 'FF000000' } };
    } else if (treeLvl === 2) {
      hTop = { style: 'thin', color: { argb: 'FF000000' } };
      hBottom = { style: 'thin', color: { argb: 'FF000000' } };
    } else if (treeLvl === 3) {
      hTop = { style: 'thin', color: { argb: 'FF666666' } };
      hBottom = { style: 'thin', color: { argb: 'FF000000' } };
    } else if (treeLvl === 4 || treeLvl === 5.5) {
      hBottom = { style: 'thin', color: { argb: 'FF000000' } };
    } else if (treeLvl === 5) {
      hTop = { style: 'thin', color: { argb: 'FF666666' } };
      hBottom = { style: 'thin', color: { argb: 'FF000000' } };
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
      // Level 3: Kegiatan (1..28) - Format Output: FONT MERAH TEGAS (#FF0000) Bold 13pt!
      for (let c = 1; c <= 11; c++) {
        excelRow.getCell(c).font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFF0000' } };
      }
    } else if (treeLvl === 4) {
      // Level 4: Sub-Kegiatan - Format SubOutput: FONT UNGU / MAGENTA (#CC00CC) Bold 12.5pt!
      for (let c = 1; c <= 11; c++) {
        excelRow.getCell(c).font = { name: 'Calibri', size: 12.5, bold: true, color: { argb: 'FFCC00CC' } };
      }
    } else if (treeLvl === 5) {
      // Level 5: Akun BAS 6-Digit (521211, dll) - Format Akun: Font Hitam Bold 12pt
      for (let c = 1; c <= 11; c++) {
        excelRow.getCell(c).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
      }
    } else if (treeLvl === 5.5) {
      // Level 5.5: Sub-Header Item / Komponen - Format Komponen: FONT COKLAT KEEMASAN / GOLD (#CC9900) Bold 12pt!
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
  // KALKULASI PEMBAGIAN HALAMAN PROPORSIONAL & GARIS PENUTUP BAWAH TABEL (SSOT)
  // Menjamin setiap halaman cetak terisi proporsional, bebas orphan signature,
  // dan memiliki garis penutup tabel tebal/medium hitam pada setiap halaman cetak.
  // ==========================================================================
  const lastDataRowNumber = ws1.rowCount;
  applyProportionalPageBreaksAndBorders(ws1, 5, lastDataRowNumber, {
    maxCols: 11,
    pageCapacity: 550,
    endingBlockHeight: 164,
    minFinalRows: 12
  });

  // BARIS TOTAL PAGU BELANJA (Format Standar FA Detail: Latar Cyan #00FFFF, Teks Hitam Bold, Tanpa 'RUH')
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

  const cyanHeaderFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00FFFF' } }; // CYAN RESMI

  // Latar dan border total label (A:J)
  for (let c = 1; c <= 10; c++) {
    const cCell = ws1.getCell(totalRowNumber, c);
    cCell.fill = cyanHeaderFill;
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
  totalValCell.fill = cyanHeaderFill;
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

  // AREA TANDA TANGAN RESMI
  const signEndRow = appendOfficialSignature(ws1, {
    isPic: isPicDownload,
    filterPic,
    tanggalUnduh,
    settings,
    colLeftMerge: 'B:F',
    colRightMerge: 'H:K'
  });

  // Set Print Area Resmi Dokumen: Hanya dari Baris 1 sampai Baris Akhir Tanda Tangan
  ws1.pageSetup.printArea = `A1:K${signEndRow}`;

  // FOOTER PENANDA RIWAYAT FILE & AUDIT SISTEM (Diletakkan di bawah DILUAR area print)
  appendAuditSignature(ws1, { periode, statusLabel, tanggalUnduh, filterPic, filterSasaran });

  // LEBAR KOLOM DIRAPATKAN STANDAR RESMI FA 16 DETAIL
  // Kolom A sampai D membentuk kesatuan header "Nomor" ramping (Total 12.5), Kolom E adalah "Kode" (9.5)
  const colWidths1 = [2.8, 3.0, 3.2, 3.5, 9.5, 52.0, 22.0, 10.5, 10.5, 17.0, 19.0, 3.5, 6.5, 12.0, 12.0];
  colWidths1.forEach((w, i) => {
    ws1.getColumn(i + 1).width = w;
  });

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
    headerRow2.height = 28;
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
      if (treeLvl === 1) dRow.height = 34;
      else if (treeLvl === 2) dRow.height = 30;
      else if (treeLvl === 3) dRow.height = 26;
      else if (treeLvl === 4) dRow.height = 24;
      else if (treeLvl === 5 || treeLvl === 5.5) dRow.height = 23;
      else dRow.height = 20; // Level 6 (Item): 20pt (Standard RUH_Belanja_Resmi)

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
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
      printArea: `A1:P${kertasKerjaEndRow}`,
      printTitlesRow: '1:1'
    };
    ws2.headerFooter = {
      oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
      evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
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
      // Hanya evaluasi baris belanja riil (bukan header)
      if (r.is_header) return;

      // Jika difilter PIC, hanya evaluasi baris belanja milik PIC tersebut
      if (filterPic) {
        let rPic = (r.pic_bagian || '').toUpperCase();
        if (rPic === 'PERENCANAAN') rPic = 'RENDATIN';
        if (rPic === 'KEUANGAN') rPic = 'KUL';
        if (rPic === 'PARMAS') rPic = 'PARSDM';
        if (rPic !== filterPic) return;
      }

      const diff = revByRowId[r.id];
      if (diff && (diff.status !== 'TETAP' || diff.diff !== 0 || diff.catatan)) {
        revisedRowIds.add(r.id);
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

    ws3.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }];

    ws3.addRow(['KOMISI PEMILIHAN UMUM KABUPATEN NGAWI']);
    ws3.addRow(['MATRIKS PERUBAHAN RENCANA USULAN HALAMAN BELANJA (SEMULA - MENJADI)']);
    ws3.addRow(['BELANJA HIBAH DALAM RANGKA PEMILIHAN BUPATI DAN WAKIL BUPATI 2029']);
    const blankHeader3 = ws3.addRow([]);
    blankHeader3.height = 10;

    ws3.getRow(1).height = 24;
    ws3.getRow(2).height = 24;
    ws3.getRow(3).height = 22;

    ws3.mergeCells('A1:K1');
    ws3.mergeCells('A2:K2');
    ws3.mergeCells('A3:K3');

    ws3.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
    ws3.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    ws3.getCell('A2').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF006699' } };
    ws3.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    ws3.getCell('A3').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF333333' } };
    ws3.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

    const headersSheet3 = [
      'Kode', 'Uraian Kegiatan / Akun / Rincian Belanja',
      'Semula (Vol)', 'Semula (Harga)', 'Semula (Jumlah Rp)',
      'Menjadi (Vol)', 'Menjadi (Harga)', 'Menjadi (Jumlah Rp)',
      'Selisih (+/- Rp)', 'Status Perubahan', 'Alasan / Catatan Justifikasi',
      'No', 'Level'
    ];

    const hRow3 = ws3.addRow(headersSheet3);
    hRow3.height = 28;
    hRow3.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0099CC' } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (colNum > 11) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF64748B' } };
      }
    });

    if (sheet3Rows.length === 0) {
      const nihilRow = ws3.addRow([]);
      nihilRow.height = 36;
      ws3.mergeCells(`A${nihilRow.number}:K${nihilRow.number}`);
      const cNihil = ws3.getCell(`A${nihilRow.number}`);
      cNihil.value = 'NIHIL';
      cNihil.alignment = { horizontal: 'center', vertical: 'middle' };
      cNihil.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
      for (let c = 1; c <= 11; c++) {
        ws3.getCell(nihilRow.number, c).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      }
    } else {
      let totSemula = 0;
      let totMenjadi = 0;
      let totSelisih = 0;

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

        if (isItem) {
          totSemula += (diffInfo.semula_jumlah || 0);
          totMenjadi += (diffInfo.menjadi_jumlah || 0);
          totSelisih += (diffInfo.diff || 0);
        }

        const rowValues = [
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
          diffInfo.catatan || '',
          r.urutan || (idx + 1), // Col L: No (di luar print area)
          `L${treeLvl}`          // Col M: Level (di luar print area)
        ];

        const mRow = ws3.addRow(rowValues);
        // Ketinggian baris berjenjang proporsional mempedomani RUH_Belanja_Resmi
        if (treeLvl === 1) mRow.height = 34;
        else if (treeLvl === 2) mRow.height = 30;
        else if (treeLvl === 3) mRow.height = 26;
        else if (treeLvl === 4) mRow.height = 24;
        else if (treeLvl === 5 || treeLvl === 5.5) mRow.height = 23;
        else mRow.height = 20; // Level 6 (Item riil): 20pt

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
        mRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        mRow.getCell(3).numFmt = '#,##0';
        mRow.getCell(4).numFmt = '#,##0';
        mRow.getCell(5).numFmt = '#,##0';
        mRow.getCell(6).numFmt = '#,##0';
        mRow.getCell(7).numFmt = '#,##0';
        mRow.getCell(8).numFmt = '#,##0';
        mRow.getCell(9).numFmt = '#,##0';
        mRow.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
        mRow.getCell(11).alignment = { horizontal: 'left', vertical: 'middle' };
        mRow.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
        mRow.getCell(13).alignment = { horizontal: 'center', vertical: 'middle' };

        if (!isItem) {
          mRow.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
          mRow.getCell(2).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
        }

        if (diffInfo.status === 'BERTAMBAH') {
          mRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          mRow.getCell(10).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF166534' } };
        } else if (diffInfo.status === 'BERKURANG') {
          mRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          mRow.getCell(10).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF991B1B' } };
        } else if (diffInfo.status === 'BARU') {
          mRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3E8FF' } };
          mRow.getCell(10).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF6B21A8' } };
        }
      });

      // Penyeimbang anti-orphan signature: pastikan TTD tidak terdampar sendirian di halaman terakhir
      const lastDataRowNumber3 = ws3.rowCount;
      applyProportionalPageBreaksAndBorders(ws3, 6, lastDataRowNumber3, {
        maxCols: 11,
        pageCapacity: 550,
        endingBlockHeight: 164,
        minFinalRows: 8,
        firstPageHeaderHeight: 108
      });

      // Total Row Perubahan
      const totalRow3 = ws3.addRow([
        '', 'JUMLAH TOTAL PERUBAHAN', '', '', totSemula, '', '', totMenjadi, totSelisih, '', '', '', ''
      ]);
      totalRow3.height = 26;
      ws3.mergeCells(`A${totalRow3.number}:B${totalRow3.number}`);
      const cTotLabel = ws3.getCell(`A${totalRow3.number}`);
      cTotLabel.alignment = { horizontal: 'center', vertical: 'middle' };
      cTotLabel.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };

      totalRow3.getCell(5).numFmt = '#,##0';
      totalRow3.getCell(8).numFmt = '#,##0';
      totalRow3.getCell(9).numFmt = '#,##0';

      for (let c = 1; c <= 11; c++) {
        const cell = totalRow3.getCell(c);
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'double', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
        };
      }
    }

    // 1 baris kosong sebelum tanda tangan
    const blankAfterTable3 = ws3.addRow([]);
    blankAfterTable3.height = 16;

    // Tanda Tangan Resmi Matriks Revisi
    const signEndRow3 = appendOfficialSignature(ws3, {
      isPic: isPicDownload,
      filterPic,
      tanggalUnduh,
      settings,
      colLeftMerge: 'A:E',
      colRightMerge: 'G:K'
    });

    ws3.columns = [
      { width: 12 }, // A: Kode
      { width: 50 }, // B: Uraian Kegiatan / Akun / Rincian Belanja
      { width: 12 }, // C: Semula (Vol)
      { width: 14 }, // D: Semula (Harga)
      { width: 18 }, // E: Semula (Jumlah Rp)
      { width: 12 }, // F: Menjadi (Vol)
      { width: 14 }, // G: Menjadi (Harga)
      { width: 18 }, // H: Menjadi (Jumlah Rp)
      { width: 18 }, // I: Selisih (+/- Rp)
      { width: 16 }, // J: Status Perubahan
      { width: 35 }, // K: Alasan / Catatan Justifikasi
      { width: 8 },  // L: No (di luar print area)
      { width: 8 }   // M: Level (di luar print area)
    ];

    ws3.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
      printArea: `A1:K${signEndRow3}`,
      printTitlesRow: '5:5'
    };
    ws3.headerFooter = {
      oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
      evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
    };
    appendAuditSignature(ws3, { periode, statusLabel, tanggalUnduh, filterPic, filterSasaran });
  } else {
    ws3.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }];
    ws3.addRow(['KOMISI PEMILIHAN UMUM KABUPATEN NGAWI']);
    ws3.addRow(['MATRIKS PERUBAHAN RENCANA USULAN HALAMAN BELANJA (SEMULA - MENJADI)']);
    ws3.addRow(['BELANJA HIBAH DALAM RANGKA PEMILIHAN BUPATI DAN WAKIL BUPATI 2029']);
    const blankHeader3 = ws3.addRow([]);
    blankHeader3.height = 10;

    ws3.getRow(1).height = 24;
    ws3.getRow(2).height = 24;
    ws3.getRow(3).height = 22;

    ws3.mergeCells('A1:G1');
    ws3.mergeCells('A2:G2');
    ws3.mergeCells('A3:G3');

    ws3.getCell('A1').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
    ws3.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    ws3.getCell('A2').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF006699' } };
    ws3.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    ws3.getCell('A3').font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF333333' } };
    ws3.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

    const headersSheet3 = [
      'Kode', 'Uraian Kegiatan / Akun / Rincian Belanja',
      'Semula (Jumlah Rp)', 'Menjadi (Jumlah Rp)', 'Selisih (+/- Rp)',
      'Status Perubahan', 'Alasan / Catatan Justifikasi', 'No', 'Level'
    ];
    const hRow3 = ws3.addRow(headersSheet3);
    hRow3.height = 28;
    hRow3.eachCell((cell, colNum) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0099CC' } };
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (colNum > 7) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF64748B' } };
      }
    });

    const baseRow = ws3.addRow(['-', 'Tidak ada data perubahan (Baseline Awal)', 0, summary.grandTotal || 0, 0, 'BASELINE_AWAL', 'Dokumen Penetapan Induk', '-', '-']);
    baseRow.height = 22;

    const blankAfter3 = ws3.addRow([]);
    blankAfter3.height = 16;

    const signEndRow3 = appendOfficialSignature(ws3, {
      isPic: isPicDownload,
      filterPic,
      tanggalUnduh,
      settings,
      colLeftMerge: 'A:C',
      colRightMerge: 'E:G'
    });

    ws3.columns = [
      { width: 12 }, { width: 50 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 35 }, { width: 8 }, { width: 8 }
    ];

    ws3.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
      printArea: `A1:G${signEndRow3}`,
      printTitlesRow: '5:5'
    };
    ws3.headerFooter = {
      oddFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N',
      evenFooter: '&C&"Calibri,Regular"&10Halaman &P dari &N'
    };
    appendAuditSignature(ws3, { periode, statusLabel, tanggalUnduh, filterPic, filterSasaran });
  }

  // ==========================================================================
  // SHEET REKAPITULASI RESMI (VERSI PRESENTASI EKSEKUTIF MULTI-SHEET)
  // Dipisahkan ke masing-masing sheet tematis agar mudah dibaca, dianalisa,
  // dan dipresentasikan dengan lebar kolom presisi dan tanpa tumpang tindih layout.
  // Hanya dibuat untuk unduhan Dokumen Utuh (Non-PIC)
  // 1. Rekap_Eksekutif: Kartu Indikator Makro, Tabel 1 Sasaran & Tabel 2 Pilar
  // 2. Rekap_Kegiatan_RKB: Tabel 3 Murni Hierarki Level RKB (Tanpa No & Kluster)
  // 3. Rekap_Subbagian: Tabel 4 Distribusi 5 Portofolio Subbagian (PIC)
  // 4. Rekap_Akun_BAS: Tabel 5 Bagan Akun Standar (Rujukan Dashboard & Keuangan)
  // ==========================================================================
  if (!isPicDownload) {
    const ctx = {
      summary,
      rows,
      grandTotal: summary.grandTotal || 1,
      targetPeriode: periode,
      periode,
      statusLabel,
      tanggalUnduh,
      namaKetua,
      filterPic,
      filterSasaran,
      wilSummary: getWilayahData ? getWilayahData() : {},
      akunMap,
      now
    };
    buildSheetRekapEksekutif(wb, ctx);
    buildSheetRekapKegiatan(wb, ctx);
    buildSheetRekapSubbag(wb, ctx);
    buildSheetRekapBas(wb, ctx);
  }

  // Return Buffer XLSX ExcelJS
  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

/**
 * Ekspor Data Master SBM ke Format Excel Resmi
 */
async function exportSbmToExcelBuffer() {
  const { getSbmList } = require('./db');
  const sbms = getSbmList();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'emenje';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Master_SBM', {
    views: [{ showGridLines: true }]
  });

  // Title
  ws.mergeCells('A1:I1');
  ws.getCell('A1').value = 'KPU KABUPATEN NGAWI - STANDAR BIAYA MASUKAN (SBM)';
  ws.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:I2');
  ws.getCell('A2').value = `Katalog Resmi Tarif Satuan Biaya, Honorarium & Pagu Batas Tertinggi (Total: ${sbms.length} Komponen Biaya)`;
  ws.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  ws.getRow(2).height = 22;

  ws.getRow(3).height = 10;

  // Header Row at Row 4
  const headerRow = ws.getRow(4);
  headerRow.values = [
    'No',
    'ID Database',
    'Kode Akun',
    'Kategori',
    'Uraian Standar Biaya Masukan',
    'Satuan',
    'Batas Pagu Tarif (Rp)',
    'Dasar Hukum / Regulasi',
    'Keterangan'
  ];
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Data rows
  let rowIdx = 5;
  for (let i = 0; i < sbms.length; i++) {
    const s = sbms[i];
    const r = ws.getRow(rowIdx);
    r.values = [
      i + 1,
      s.id,
      s.kode_akun || '521211',
      s.kategori || 'Umum',
      s.uraian || '',
      s.satuan || '',
      Number(s.harga_satuan || s.pagu_sbm) || 0,
      `${s.jenis_regulasi || 'SBM'} ${s.dasar_hukum || ''}`.trim(),
      s.keterangan || ''
    ];
    r.height = 20;

    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    r.getCell(7).numFmt = '#,##0';
    r.getCell(8).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(9).alignment = { vertical: 'middle', horizontal: 'left' };

    const isEven = i % 2 === 1;
    r.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9.5 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }
    });

    rowIdx++;
  }

  ws.columns = [
    { width: 6 },
    { width: 12 },
    { width: 14 },
    { width: 18 },
    { width: 45 },
    { width: 12 },
    { width: 22 },
    { width: 35 },
    { width: 25 }
  ];

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
    printTitlesRow: '4:4',
    printArea: `A1:I${rowIdx - 1}`
  };

  return await workbook.xlsx.writeBuffer();
}

/**
 * Parsing Buffer Excel SBM untuk Update Masal
 */
function parseSbmExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (!rawRows || rawRows.length === 0) return [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = (rawRows[i] || []).map(c => String(c || '').toLowerCase().trim());
    const hasUraian = row.some(c => c.includes('uraian'));
    const hasSatuan = row.some(c => c.includes('satuan'));
    const hasKategori = row.some(c => c.includes('kategori'));
    if (hasUraian && (hasSatuan || hasKategori)) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) headerIdx = 0;
  const headers = (rawRows[headerIdx] || []).map(c => String(c || '').toLowerCase().trim());

  const colMap = {
    id: headers.findIndex(h => h.includes('id') || h === 'id database'),
    kode_akun: headers.findIndex(h => h.includes('kode akun') || h.includes('akun')),
    kategori: headers.findIndex(h => h.includes('kategori')),
    uraian: headers.findIndex(h => h.includes('uraian') || h.includes('nama biaya') || h.includes('standar biaya')),
    satuan: headers.findIndex(h => h.includes('satuan')),
    harga_satuan: headers.findIndex(h => h.includes('harga') || h.includes('tarif') || h.includes('pagu') || h.includes('besaran')),
    jenis_regulasi: headers.findIndex(h => h.includes('jenis regulasi') || h.includes('regulasi')),
    dasar_hukum: headers.findIndex(h => h.includes('dasar hukum') || h.includes('dasar')),
    keterangan: headers.findIndex(h => h.includes('keterangan') || h.includes('catatan'))
  };

  const parsedItems = [];
  const errors = [];
  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const uraianVal = colMap.uraian !== -1 ? String(row[colMap.uraian] || '').trim() : '';
    if (!uraianVal) continue;

    const idVal = colMap.id !== -1 && row[colMap.id] ? Number(row[colMap.id]) : undefined;
    const kodeAkunVal = colMap.kode_akun !== -1 ? String(row[colMap.kode_akun] || '521211').trim() : '521211';
    const kategoriVal = colMap.kategori !== -1 ? String(row[colMap.kategori] || 'Umum').trim() : 'Umum';
    const satuanVal = colMap.satuan !== -1 ? String(row[colMap.satuan] || 'OK').trim() : 'OK';
    
    let rawHarga = colMap.harga_satuan !== -1 ? row[colMap.harga_satuan] : 0;
    let hargaVal = parseIndonesianNumber(rawHarga, { defaultValue: 0 });
    if (hargaVal === null || isNaN(hargaVal) || hargaVal < 0) {
      errors.push({ baris: r + 1, error: `Nilai harga satuan tidak valid: "${rawHarga}" pada rincian "${uraianVal}"` });
      hargaVal = 0;
    }

    const jenisReg = colMap.jenis_regulasi !== -1 ? String(row[colMap.jenis_regulasi] || 'SBM').trim() : 'SBM';
    const dasarHukumVal = colMap.dasar_hukum !== -1 ? String(row[colMap.dasar_hukum] || '').trim() : '';
    const ketVal = colMap.keterangan !== -1 ? String(row[colMap.keterangan] || '').trim() : '';

    parsedItems.push({
      id: idVal,
      kode_akun: kodeAkunVal,
      kategori: kategoriVal,
      uraian: uraianVal,
      satuan: satuanVal,
      harga_satuan: hargaVal,
      pagu_sbm: hargaVal,
      jenis_regulasi: jenisReg,
      dasar_hukum: dasarHukumVal,
      keterangan: ketVal
    });
  }

  parsedItems.errors = errors;
  return parsedItems;
}

/**
 * Ekspor Data Master BAS ke Format Excel Resmi
 */
async function exportBasToExcelBuffer() {
  const { getAkunList } = require('./db');
  const akuns = getAkunList();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'emenje';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Master_BAS', {
    views: [{ showGridLines: true }]
  });

  // Title
  ws.mergeCells('A1:F1');
  ws.getCell('A1').value = 'KPU KABUPATEN NGAWI - BAGAN AKUN STANDAR (BAS)';
  ws.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0369A1' } };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:F2');
  ws.getCell('A2').value = `Kodifikasi Akun 6 Digit Standar Akuntansi Pemerintah (SAP) Belanja Hibah Pilkada (Total: ${akuns.length} Akun)`;
  ws.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  ws.getRow(2).height = 22;

  ws.getRow(3).height = 10;

  // Header Row at Row 4
  const headerRow = ws.getRow(4);
  headerRow.values = [
    'No',
    'ID Database',
    'Kode Akun (6 Digit)',
    'Uraian Akun BAS',
    'Kelompok Belanja',
    'Kategori Belanja',
    'Keterangan'
  ];
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0369A1' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Data rows
  let rowIdx = 5;
  for (let i = 0; i < akuns.length; i++) {
    const a = akuns[i];
    const r = ws.getRow(rowIdx);
    r.values = [
      i + 1,
      a.id,
      a.kode || '',
      a.uraian || '',
      a.kelompok || '',
      a.kategori_dn || a.kode || '',
      a.keterangan || ''
    ];
    r.height = 20;

    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(4).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };

    const isEven = i % 2 === 1;
    r.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9.5 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }
    });

    rowIdx++;
  }

  ws.columns = [
    { width: 6 },
    { width: 12 },
    { width: 18 },
    { width: 45 },
    { width: 28 },
    { width: 16 },
    { width: 28 }
  ];

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
    printTitlesRow: '4:4',
    printArea: `A1:G${rowIdx - 1}`
  };

  return await workbook.xlsx.writeBuffer();
}

/**
 * Parsing Buffer Excel BAS untuk Update Masal
 */
function parseBasExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (!rawRows || rawRows.length === 0) return [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = (rawRows[i] || []).map(c => String(c || '').toLowerCase().trim());
    const hasKode = row.some(c => c.includes('kode'));
    const hasUraian = row.some(c => c.includes('uraian'));
    if (hasKode && hasUraian) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) headerIdx = 0;
  const headers = (rawRows[headerIdx] || []).map(c => String(c || '').toLowerCase().trim());

  const colMap = {
    id: headers.findIndex(h => h.includes('id') || h === 'id database'),
    kode: headers.findIndex(h => h.includes('kode akun') || h.includes('kode bas') || h === 'kode'),
    uraian: headers.findIndex(h => h.includes('uraian') || h.includes('nama akun')),
    kelompok: headers.findIndex(h => h.includes('kelompok')),
    kategori_dn: headers.findIndex(h => h.includes('kategori')),
    keterangan: headers.findIndex(h => h.includes('keterangan') || h.includes('catatan'))
  };

  const parsedItems = [];
  const errors = [];
  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const kodeRaw = colMap.kode !== -1 ? String(row[colMap.kode] || '').trim() : '';
    const kodeVal = kodeRaw.replace(/[^0-9]/g, '').trim();
    const uraianVal = colMap.uraian !== -1 ? String(row[colMap.uraian] || '').trim() : '';
    if (!kodeRaw && !uraianVal) continue;

    if (!kodeVal || kodeVal.length < 5 || kodeVal.length > 7) {
      errors.push({ baris: r + 1, error: `Format Kode Akun BAS tidak valid: "${kodeRaw}" pada rincian "${uraianVal}"` });
      continue;
    }
    if (!uraianVal) {
      errors.push({ baris: r + 1, error: `Uraian nama akun BAS tidak boleh kosong pada kode ${kodeVal}` });
      continue;
    }

    const idVal = colMap.id !== -1 && row[colMap.id] ? Number(row[colMap.id]) : undefined;
    const kelompokVal = colMap.kelompok !== -1 ? String(row[colMap.kelompok] || '521 - Belanja Barang').trim() : '521 - Belanja Barang';
    const kategoriVal = colMap.kategori_dn !== -1 ? String(row[colMap.kategori_dn] || kodeVal).trim() : kodeVal;
    const ketVal = colMap.keterangan !== -1 ? String(row[colMap.keterangan] || '').trim() : '';

    parsedItems.push({
      id: idVal,
      kode: kodeVal,
      uraian: uraianVal,
      kelompok: kelompokVal,
      kategori_dn: kategoriVal,
      keterangan: ketVal
    });
  }

  parsedItems.errors = errors;
  return parsedItems;
}

/**
 * Ekspor Data Master Desa & TPS (217 PPS) ke Format Excel Resmi
 */
async function exportDesaToExcelBuffer() {
  const { getDesas } = require('./db');
  const desas = getDesas();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'emenje';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Master_Desa_TPS', {
    views: [{ showGridLines: true }]
  });

  // Title
  ws.mergeCells('A1:N1');
  ws.getCell('A1').value = 'KPU KABUPATEN NGAWI - MASTER DESA / KELURAHAN & TPS (217 PPS)';
  ws.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:N2');
  const totalTps = desas.reduce((a, b) => a + Math.round(Number(b.tps) || 0), 0);
  const totalDpt = desas.reduce((a, b) => a + Math.round(Number(b.pemilih) || 0), 0);
  ws.getCell('A2').value = `Basis Data Wilayah & Badan Adhoc PPS se-Kabupaten Ngawi (Total: ${desas.length} Desa/Kelurahan, ${totalTps} TPS, ${totalDpt} Pemilih DPT)`;
  ws.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  ws.getRow(2).height = 22;

  ws.getRow(3).height = 10;

  // Header Row at Row 4
  const headerRow = ws.getRow(4);
  headerRow.values = [
    'No',
    'ID Database',
    'No Urut',
    'ID Kec',
    'Nama Kecamatan',
    'Nama Desa / Kelurahan',
    'TPS',
    'Pantarlih',
    'Pemilih (DPT)',
    'Kotak Suara',
    'Rohaniwan',
    'Ketua PPS',
    'Sekretaris PPS',
    'NIP Sekretaris'
  ];
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Data rows
  let rowIdx = 5;
  for (let i = 0; i < desas.length; i++) {
    const d = desas[i];
    const r = ws.getRow(rowIdx);
    r.values = [
      i + 1,
      d.id,
      d.no_urut || (i + 1),
      d.kecamatan_id,
      d.kecamatan_nama || '',
      d.nama || '',
      Math.round(Number(d.tps) || 0),
      Math.round(Number(d.pantarlih) || 0),
      Math.round(Number(d.pemilih) || 0),
      Math.round(Number(d.kotak) || Number(d.tps) || 0),
      Math.round(Number(d.rohaniwan) || 1),
      d.ketua_nama || '',
      d.sekretaris_nama || '',
      d.sekretaris_nip || ''
    ];
    r.height = 20;

    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(7).numFmt = '#,##0';
    r.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(8).numFmt = '#,##0';
    r.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
    r.getCell(9).numFmt = '#,##0';
    r.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(10).numFmt = '#,##0';
    r.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(12).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(13).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(14).alignment = { vertical: 'middle', horizontal: 'left' };

    const isEven = i % 2 === 1;
    r.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9.5 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }
    });

    rowIdx++;
  }

  ws.columns = [
    { width: 6 },
    { width: 12 },
    { width: 10 },
    { width: 10 },
    { width: 22 },
    { width: 26 },
    { width: 10 },
    { width: 12 },
    { width: 16 },
    { width: 12 },
    { width: 12 },
    { width: 24 },
    { width: 24 },
    { width: 22 }
  ];

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
    printTitlesRow: '4:4',
    printArea: `A1:N${rowIdx - 1}`
  };

  return await workbook.xlsx.writeBuffer();
}

/**
 * Parsing Buffer Excel Desa & TPS untuk Update Masal
 */
function parseDesaExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (!rawRows || rawRows.length === 0) return [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = (rawRows[i] || []).map(c => String(c || '').toLowerCase().trim());
    const hasDesa = row.some(c => c.includes('desa') || c.includes('kelurahan'));
    const hasTps = row.some(c => c === 'tps' || c.includes('jumlah tps'));
    if (hasDesa && (hasTps || row.some(c => c.includes('kecamatan')))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) headerIdx = 0;
  const headers = (rawRows[headerIdx] || []).map(c => String(c || '').toLowerCase().trim());

  const colMap = {
    id: headers.findIndex(h => h.includes('id database') || h === 'id'),
    no_urut: headers.findIndex(h => h.includes('no urut') || h === 'urut'),
    kecamatan_id: headers.findIndex(h => h.includes('id kec')),
    kecamatan_nama: headers.findIndex(h => h.includes('nama kecamatan') || h === 'kecamatan'),
    nama: headers.findIndex(h => h.includes('nama desa') || h.includes('desa') || h.includes('kelurahan')),
    tps: headers.findIndex(h => h === 'tps' || h.includes('jumlah tps')),
    pantarlih: headers.findIndex(h => h.includes('pantarlih')),
    pemilih: headers.findIndex(h => h.includes('pemilih') || h.includes('dpt')),
    kotak: headers.findIndex(h => h.includes('kotak')),
    rohaniwan: headers.findIndex(h => h.includes('rohaniwan')),
    ketua_nama: headers.findIndex(h => h.includes('ketua pps') || h.includes('ketua')),
    sekretaris_nama: headers.findIndex(h => h.includes('sekretaris pps') || h.includes('sekretaris')),
    sekretaris_nip: headers.findIndex(h => h.includes('nip'))
  };

  const parsedItems = [];
  const errors = [];
  const knownKecamatans = getKecamatans();
  const kecMapById = new Map(knownKecamatans.map(k => [k.id, k]));
  const kecMapByName = new Map(knownKecamatans.map(k => [k.nama.toLowerCase().trim(), k]));

  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const namaVal = colMap.nama !== -1 ? String(row[colMap.nama] || '').trim() : '';
    if (!namaVal) continue;

    const idVal = colMap.id !== -1 && row[colMap.id] ? Number(row[colMap.id]) : undefined;
    const noUrutVal = colMap.no_urut !== -1 && row[colMap.no_urut] ? parseIndonesianNumber(row[colMap.no_urut], { defaultValue: undefined }) : undefined;
    const kecIdVal = colMap.kecamatan_id !== -1 && row[colMap.kecamatan_id] ? parseIndonesianNumber(row[colMap.kecamatan_id], { defaultValue: undefined }) : undefined;
    const kecNamaVal = colMap.kecamatan_nama !== -1 ? String(row[colMap.kecamatan_nama] || '').trim() : '';

    // Validasi referensi Kecamatan
    let matchedKec = null;
    if (kecIdVal && kecMapById.has(kecIdVal)) {
      matchedKec = kecMapById.get(kecIdVal);
    } else if (kecNamaVal && kecMapByName.has(kecNamaVal.toLowerCase())) {
      matchedKec = kecMapByName.get(kecNamaVal.toLowerCase());
    } else if (kecIdVal || kecNamaVal) {
      errors.push({ baris: r + 1, error: `Referensi Kecamatan tidak ditemukan: ID "${kecIdVal || '-'}" / Nama "${kecNamaVal || '-'}" untuk Desa "${namaVal}"` });
    }

    const rawTps = colMap.tps !== -1 ? row[colMap.tps] : 0;
    const rawTpsParsed = parseIndonesianNumber(rawTps, { defaultValue: 0 });
    const tpsVal = rawTpsParsed !== null && !isNaN(rawTpsParsed) ? Math.round(rawTpsParsed) : null;
    if (tpsVal === null || isNaN(tpsVal) || tpsVal < 0) {
      errors.push({ baris: r + 1, error: `Jumlah TPS tidak valid: "${rawTps}" pada Desa "${namaVal}"` });
    }

    const rawPantarlih = colMap.pantarlih !== -1 ? row[colMap.pantarlih] : 0;
    const rawPanParsed = parseIndonesianNumber(rawPantarlih, { defaultValue: 0 });
    const pantarlihVal = rawPanParsed !== null && !isNaN(rawPanParsed) ? Math.round(rawPanParsed) : 0;

    const rawPemilih = colMap.pemilih !== -1 ? row[colMap.pemilih] : 0;
    const rawPemParsed = parseIndonesianNumber(rawPemilih, { defaultValue: 0 });
    const pemilihVal = rawPemParsed !== null && !isNaN(rawPemParsed) ? Math.round(rawPemParsed) : 0;

    const rawKotak = colMap.kotak !== -1 ? row[colMap.kotak] : tpsVal;
    const rawKotakParsed = parseIndonesianNumber(rawKotak, { defaultValue: (tpsVal || 0) });
    const kotakVal = rawKotakParsed !== null && !isNaN(rawKotakParsed) ? Math.round(rawKotakParsed) : (tpsVal || 0);

    const rawRohaniwan = colMap.rohaniwan !== -1 ? row[colMap.rohaniwan] : 1;
    const rawRohParsed = parseIndonesianNumber(rawRohaniwan, { defaultValue: 1 });
    const rohaniwanVal = rawRohParsed !== null && !isNaN(rawRohParsed) ? Math.round(rawRohParsed) : 1;

    const ketuaVal = colMap.ketua_nama !== -1 ? String(row[colMap.ketua_nama] || '').trim() : '';
    const sekVal = colMap.sekretaris_nama !== -1 ? String(row[colMap.sekretaris_nama] || '').trim() : '';
    const nipVal = colMap.sekretaris_nip !== -1 ? String(row[colMap.sekretaris_nip] || '').trim() : '';

    parsedItems.push({
      id: idVal,
      no_urut: noUrutVal,
      kecamatan_id: matchedKec ? matchedKec.id : kecIdVal,
      kecamatan_nama: matchedKec ? matchedKec.nama : kecNamaVal,
      nama: namaVal,
      tps: tpsVal || 0,
      pantarlih: pantarlihVal || 0,
      pemilih: pemilihVal || 0,
      kotak: kotakVal !== null ? kotakVal : (tpsVal || 0),
      rohaniwan: rohaniwanVal !== null ? rohaniwanVal : 1,
      ketua_nama: ketuaVal,
      sekretaris_nama: sekVal,
      sekretaris_nip: nipVal
    });
  }

  parsedItems.errors = errors;
  return parsedItems;
}

/**
 * Ekspor Data Master Kecamatan & PPK (19 PPK) ke Format Excel Resmi (Tanpa Camat)
 */
async function exportKecamatanToExcelBuffer() {
  const { getKecamatans, getDesas } = require('./db');
  const kecamatans = getKecamatans();
  const desas = getDesas();

  const desaByKec = {};
  for (const d of desas) {
    if (!desaByKec[d.kecamatan_id]) desaByKec[d.kecamatan_id] = [];
    desaByKec[d.kecamatan_id].push(d);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'emenje';
  workbook.created = new Date();

  const ws = workbook.addWorksheet('Master_Kecamatan_PPK', {
    views: [{ showGridLines: true }]
  });

  // Title
  ws.mergeCells('A1:J1');
  ws.getCell('A1').value = 'KPU KABUPATEN NGAWI - MASTER KECAMATAN & PENYELENGGARA PPK (19 KECAMATAN)';
  ws.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:J2');
  ws.getCell('A2').value = `Basis Data Kewilayahan Penyelenggara Pemilu Adhoc Tingkat Kecamatan (Total: ${kecamatans.length} Kecamatan, ${kecamatans.length * 5} Komisioner PPK, ${kecamatans.length * 3} Sekretariat PPK)`;
  ws.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
  ws.getRow(2).height = 22;

  ws.getRow(3).height = 10;

  // Header Row at Row 4
  const headerRow = ws.getRow(4);
  headerRow.values = [
    'No',
    'ID Database',
    'No Urut',
    'Kode Wilayah',
    'Nama Kecamatan (PPK)',
    'Ketua PPK',
    'Sekretaris PPK',
    'NIP Sekretaris',
    'Jumlah Desa',
    'Total TPS'
  ];
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Data rows
  let rowIdx = 5;
  for (let i = 0; i < kecamatans.length; i++) {
    const k = kecamatans[i];
    const kecDesas = desaByKec[k.id] || [];
    const totalTps = kecDesas.reduce((a, b) => a + (Number(b.tps) || 0), 0);

    const r = ws.getRow(rowIdx);
    r.values = [
      i + 1,
      k.id,
      k.no_urut || (i + 1),
      k.kode || '',
      k.nama || '',
      k.ketua_ppk || k.ketua_nama || '',
      k.sekretaris_ppk || k.sekretaris_nama || '',
      k.sekretaris_nip || '',
      kecDesas.length,
      totalTps
    ];
    r.height = 20;

    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(5).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(6).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(7).alignment = { vertical: 'middle', horizontal: 'left' };
    r.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };

    const isEven = i % 2 === 1;
    r.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9.5 };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
      if (isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' }
        };
      }
    });

    rowIdx++;
  }

  ws.columns = [
    { width: 6 },
    { width: 12 },
    { width: 10 },
    { width: 16 },
    { width: 28 },
    { width: 26 },
    { width: 26 },
    { width: 24 },
    { width: 14 },
    { width: 14 }
  ];

  ws.pageSetup = {
    orientation: 'landscape',
    paperSize: 9,
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.5, header: 0.2, footer: 0.3 },
    printTitlesRow: '4:4',
    printArea: `A1:J${rowIdx - 1}`
  };

  return await workbook.xlsx.writeBuffer();
}

/**
 * Parsing Buffer Excel Kecamatan & PPK untuk Update Masal (Tanpa Camat)
 */
function parseKecamatanExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1 });
  if (!rawRows || rawRows.length === 0) return [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = (rawRows[i] || []).map(c => String(c || '').toLowerCase().trim());
    const hasKec = row.some(c => c.includes('kecamatan'));
    if (hasKec && (row.some(c => c.includes('ketua')) || row.some(c => c.includes('sekretaris')) || row.some(c => c.includes('kode')))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) headerIdx = 0;
  const headers = (rawRows[headerIdx] || []).map(c => String(c || '').toLowerCase().trim());

  const colMap = {
    id: headers.findIndex(h => h.includes('id database') || h === 'id'),
    no_urut: headers.findIndex(h => h.includes('no urut') || h === 'urut'),
    kode: headers.findIndex(h => h.includes('kode wil') || h.includes('kode')),
    nama: headers.findIndex(h => h.includes('nama kecamatan') || h === 'kecamatan'),
    ketua_ppk: headers.findIndex(h => h.includes('ketua ppk') || h.includes('ketua')),
    sekretaris_ppk: headers.findIndex(h => h.includes('sekretaris ppk') || h.includes('sekretaris')),
    sekretaris_nip: headers.findIndex(h => h.includes('nip'))
  };

  const parsedItems = [];
  const errors = [];
  for (let r = headerIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const namaVal = colMap.nama !== -1 ? String(row[colMap.nama] || '').trim() : '';
    if (!namaVal) continue;

    const idVal = colMap.id !== -1 && row[colMap.id] ? Number(row[colMap.id]) : undefined;
    const noUrutVal = colMap.no_urut !== -1 && row[colMap.no_urut] ? parseIndonesianNumber(row[colMap.no_urut], { defaultValue: undefined }) : undefined;
    const kodeVal = colMap.kode !== -1 ? String(row[colMap.kode] || '').trim() : '';
    const ketuaVal = colMap.ketua_ppk !== -1 ? String(row[colMap.ketua_ppk] || '').trim() : '';
    const sekVal = colMap.sekretaris_ppk !== -1 ? String(row[colMap.sekretaris_ppk] || '').trim() : '';
    const nipVal = colMap.sekretaris_nip !== -1 ? String(row[colMap.sekretaris_nip] || '').trim() : '';

    parsedItems.push({
      id: idVal,
      no_urut: noUrutVal,
      kode: kodeVal,
      nama: namaVal,
      ketua_ppk: ketuaVal,
      sekretaris_ppk: sekVal,
      sekretaris_nip: nipVal
    });
  }

  parsedItems.errors = errors;
  return parsedItems;
}

/**
 * Ekspor Rekapitulasi Sumber Dana / Cost Sharing (APBD Kab vs Prov) ke format Excel
 * Meneruskan panggilan ke generator resmi exportRekapToExcelBuffer (Tab COST_SHARING)
 */
async function exportCostSharingToExcelBuffer(periodeId, { pic = 'SEMUA', mode = 'perencanaan' } = {}) {
  return await exportRekapToExcelBuffer(periodeId, { pic, mode, tab: 'COST_SHARING', fullCompilation: false });
}

module.exports = {
  exportRkbToExcelBuffer,
  exportRekapToExcelBuffer,
  exportCostSharingToExcelBuffer,
  exportSbmToExcelBuffer,
  parseSbmExcelBuffer,
  exportBasToExcelBuffer,
  parseBasExcelBuffer,
  exportDesaToExcelBuffer,
  parseDesaExcelBuffer,
  exportKecamatanToExcelBuffer,
  parseKecamatanExcelBuffer,
  appendOfficialSignature,
  getSubbagSignatureInfo
};
