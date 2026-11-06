/**
 * CAKRA — Mesin Generator Excel (.XLSX) Hulu ke Hilir (Tahap 1 s.d. 18)
 * Menggunakan `exceljs` dengan formula aktif (=SUM, =ROUND, Pajak, Denda 1 permil, SBOB Konsultansi)
 * Pengembang: emenje
 */

const ExcelJS = require('exceljs');
const {
  formatTanggalIndo,
  terbilangRupiah,
  hitungKeuanganKontrak,
  hitungKonversiSbob
} = require('./utils');

const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'FF94A3B8' } },
  left: { style: 'thin', color: { argb: 'FF94A3B8' } },
  bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
  right: { style: 'thin', color: { argb: 'FF94A3B8' } }
};

const FILL_HEADER = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0F172A' }
};

const FILL_SUBHEADER = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFE2E8F0' }
};

const FILL_TOTAL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFEF3C7' }
};

function setupKopSheet(ws, settings, judulUtama, subJudul, paket, tahapRow, totalCols = 8) {
  ws.views = [{ showGridLines: true }];
  ws.pageSetup = { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const lastColLetter = ws.getColumn(totalCols).letter;

  ws.mergeCells(`A1:${lastColLetter}1`);
  ws.getCell('A1').value = (settings.nama_satker || 'KOMISI PEMILIHAN UMUM KABUPATEN NGAWI').toUpperCase();
  ws.getCell('A1').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells(`A2:${lastColLetter}2`);
  ws.getCell('A2').value = `${settings.alamat_satker || 'Jl. Untung Suropati No. 48 Ngawi'} | Telp: ${settings.telp_satker || '(0351) 743832'} | Email: ${settings.email_satker || 'kab_ngawi@kpu.go.id'}`;
  ws.getCell('A2').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.mergeCells(`A4:${lastColLetter}4`);
  ws.getCell('A4').value = judulUtama.toUpperCase();
  ws.getCell('A4').font = { name: 'Arial', size: 11, bold: true };
  ws.getCell('A4').alignment = { horizontal: 'center' };

  ws.mergeCells(`A5:${lastColLetter}5`);
  ws.getCell('A5').value = subJudul;
  ws.getCell('A5').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E40AF' } };
  ws.getCell('A5').alignment = { horizontal: 'center' };

  // Metadata Paket
  const metaRows = [
    ['Nama Paket Pengadaan', `: ${paket.nama_paket}`, 'Nomor Dokumen', `: ${tahapRow?.nomor_dokumen || '-'}`],
    ['Kode RUP / MAK DIPA', `: ${paket.kode_rup || '-'} / MAK ${paket.kode_akun_mak} (${paket.nama_akun_mak})`, 'Tanggal Dokumen', `: ${formatTanggalIndo(tahapRow?.tanggal_dokumen || paket.tgl_mulai_kerja)}`],
    ['Jenis & Metode PBJ', `: ${paket.jenis_pengadaan} — ${paket.metode_pemilihan} (${paket.fitur_spse})`, 'Nilai Pagu DIPA', `: Rp ${Number(paket.nilai_pagu || 0).toLocaleString('id-ID')}`]
  ];

  let rIdx = 7;
  for (const m of metaRows) {
    ws.getCell(`A${rIdx}`).value = m[0];
    ws.getCell(`A${rIdx}`).font = { name: 'Arial', size: 9, bold: true };
    ws.mergeCells(`B${rIdx}:D${rIdx}`);
    ws.getCell(`B${rIdx}`).value = m[1];
    ws.getCell(`B${rIdx}`).font = { name: 'Arial', size: 9 };

    ws.getCell(`E${rIdx}`).value = m[2];
    ws.getCell(`E${rIdx}`).font = { name: 'Arial', size: 9, bold: true };
    ws.mergeCells(`F${rIdx}:${lastColLetter}${rIdx}`);
    ws.getCell(`F${rIdx}`).value = m[3];
    ws.getCell(`F${rIdx}`).font = { name: 'Arial', size: 9 };
    rIdx++;
  }

  return rIdx + 1;
}

function appendTandaTanganPPK(ws, startRow, ppk, settings, tanggalStr, colKanan = 'F', pihakKiri = null, colKiri = 'B') {
  let r = startRow + 2;
  if (pihakKiri && pihakKiri.barisAtas) {
    ws.getCell(`${colKiri}${r}`).value = pihakKiri.barisAtas;
    ws.getCell(`${colKiri}${r}`).font = { name: 'Arial', size: 10 };
  }
  ws.getCell(`${colKanan}${r}`).value = `${settings.kota_satker || 'Ngawi'}, ${formatTanggalIndo(tanggalStr)}`;
  ws.getCell(`${colKanan}${r}`).font = { name: 'Arial', size: 10 };
  r++;
  if (pihakKiri) {
    ws.getCell(`${colKiri}${r}`).value = pihakKiri.judulAtas || '';
    ws.getCell(`${colKiri}${r}`).font = { name: 'Arial', size: 10, bold: true };
  }
  ws.getCell(`${colKanan}${r}`).value = 'Pejabat Pembuat Komitmen (PPK)';
  ws.getCell(`${colKanan}${r}`).font = { name: 'Arial', size: 10, bold: true };
  r++;
  if (pihakKiri) {
    ws.getCell(`${colKiri}${r}`).value = pihakKiri.subJudul || '';
    ws.getCell(`${colKiri}${r}`).font = { name: 'Arial', size: 10, bold: true };
  }
  ws.getCell(`${colKanan}${r}`).value = settings.nama_satker || 'KPU Kabupaten Ngawi';
  ws.getCell(`${colKanan}${r}`).font = { name: 'Arial', size: 10, bold: true };
  r += 4;
  // Baris Nama Pejabat (Kiri & Kanan pada baris `r` yang sama -> 100% Sejajar)
  if (pihakKiri) {
    ws.getCell(`${colKiri}${r}`).value = pihakKiri.nama || '-';
    ws.getCell(`${colKiri}${r}`).font = { name: 'Arial', size: 10, bold: true, underline: true };
  }
  ws.getCell(`${colKanan}${r}`).value = ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN';
  ws.getCell(`${colKanan}${r}`).font = { name: 'Arial', size: 10, bold: true, underline: true };
  r++;
  // Baris NIP / Identitas (Kiri & Kanan pada baris `r` yang sama -> 100% Sejajar)
  if (pihakKiri && pihakKiri.identitas) {
    ws.getCell(`${colKiri}${r}`).value = pihakKiri.identitas;
    ws.getCell(`${colKiri}${r}`).font = { name: 'Arial', size: 9 };
  }
  ws.getCell(`${colKanan}${r}`).value = `NIP. ${ppk.nip || '19840101 200912 1 001'}`;
  ws.getCell(`${colKanan}${r}`).font = { name: 'Arial', size: 9 };

  // Prinsip Anti Tanda Tangan Gantung & Kotak Paraf Footer pada Excel
  if (startRow <= 32) {
    // 1 Halaman utuh (memuat tanda tangan) -> kunci fitToHeight: 1 agar tidak ada tanda tangan gantung & tanpa kotak paraf
    ws.pageSetup = {
      ...(ws.pageSetup || {}),
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1
    };
    ws.headerFooter = {
      oddFooter: '&L&"Arial,Italic"&8Dokumen Pengadaan SI-PRABU KPU Kabupaten Ngawi&R&"Arial,Regular"&8Halaman &P dari &N'
    };
  } else {
    // Lebih dari 1 halaman -> pastikan halaman terakhir membawa baris rincian + Total + Tanda Tangan (anti gantung)
    // dan halaman pertama (di luar halaman tanda tangan) memuat Kotak Paraf pada footer
    const breakRow = Math.max(12, startRow - 6);
    ws.rowBreaks = [{ id: breakRow, max: 9, man: 1 }];
    const labelParafFooter = pihakKiri
      ? `[ PARAF KEDUA BELAH PIHAK — ${pihakKiri.judulAtas || 'PIHAK I'}: _________ | PPK: _________ ]`
      : `[ PARAF MANDIRI — PPK: _________ ]`;
    ws.headerFooter = {
      differentFirst: true,
      firstFooter: `&L&"Arial,Italic"&8Dokumen Pengadaan SI-PRABU&R&"Arial,Bold"&8${labelParafFooter}`,
      oddFooter: '&L&"Arial,Italic"&8Dokumen Pengadaan SI-PRABU KPU Kabupaten Ngawi&R&"Arial,Regular"&8Halaman &P dari &N'
    };
  }
}

/**
 * Generator Excel Berdasarkan Nomor Tahap (1 s.d. 18) atau "MASTER_WORKBOOK" (Seluruh Sheet dalam 1 File Excel)
 */
async function generateExcelBuffer(ctx, modeOrStage = 6) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SI-PRABU KPU Kabupaten Ngawi (by emenje)';
  wb.created = new Date();

  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, bendahara, settings } = ctx;
  const tahapMap = {};
  for (const t of tahaps) tahapMap[t.no_tahap] = t;

  const stageNum = Number(modeOrStage);
  const buildAll = modeOrStage === 'ALL' || isNaN(stageNum);

  if (!buildAll && stageNum === 1) {
    throw new Error('Tahap 1 (Identifikasi Kebutuhan & Nota Dinas) tidak menggunakan Kertas Kerja Excel sesuai regulasi PBJ.');
  }

  // -------------------------------------------------------------------------
  // SHEET 1: PEMAKETAN, SPESIFIKASI TEKNIS, & RUP (TAHAP 2, 3, 4)
  // -------------------------------------------------------------------------
  if (buildAll || [2, 3, 4].includes(stageNum)) {
    const ws = wb.addWorksheet('01_Pemaketan_Spek_RUP');
    ws.columns = [
      { width: 6 }, { width: 32 }, { width: 38 }, { width: 12 },
      { width: 10 }, { width: 22 }, { width: 14 }, { width: 18 }
    ];
    let rowIdx = setupKopSheet(
      ws, settings,
      'MATRIKS IDENTIFIKASI KEBUTUHAN, SPESIFIKASI TEKNIS (PDN/TKDN), & RUP',
      'Sesuai Perpres Nomor 46 Tahun 2025 & Lampiran I Perlem LKPP Nomor 3 Tahun 2026',
      paket, tahapMap[stageNum] || tahapMap[1], 8
    );

    const headers = ['No', 'Uraian Barang / Jasa', 'Spesifikasi Teknis / KAK', 'Satuan', 'Volume', 'Prioritas PDN / Merek Katalog', 'TKDN + BMP (%)', 'Estimasi Pagu / HPS (Rp)'];
    const hRow = ws.getRow(rowIdx);
    headers.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.fill = FILL_HEADER;
      c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = BORDER_THIN;
    });
    hRow.height = 26;
    rowIdx++;

    const firstItemRow = rowIdx;
    items.forEach((it, idx) => {
      const r = ws.getRow(rowIdx);
      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).value = it.uraian_item;
      r.getCell(3).value = it.spesifikasi_teknis;
      r.getCell(4).value = it.satuan;
      r.getCell(4).alignment = { horizontal: 'center' };
      r.getCell(5).value = Number(it.volume);
      r.getCell(5).numFmt = '#,##0';
      r.getCell(6).value = `${it.status_pdn} ${it.merk_tipe_katalog ? '(' + it.merk_tipe_katalog + ')' : ''}`;
      r.getCell(7).value = `${Number(it.persen_tkdn || 0)}% + ${Number(it.persen_bmp || 0)}%`;
      r.getCell(7).alignment = { horizontal: 'center' };
      r.getCell(8).value = Number(it.jumlah_hps || 0);
      r.getCell(8).numFmt = '#,##0';

      for (let c = 1; c <= 8; c++) {
        r.getCell(c).border = BORDER_THIN;
        r.getCell(c).font = { name: 'Arial', size: 9 };
        r.getCell(c).alignment = { ...r.getCell(c).alignment, vertical: 'top', wrapText: true };
      }
      rowIdx++;
    });
    const lastItemRow = rowIdx - 1;

    const totRow = ws.getRow(rowIdx);
    ws.mergeCells(`A${rowIdx}:G${rowIdx}`);
    totRow.getCell(1).value = 'TOTAL ESTIMASI ANGGARAN / PAGU RENCANA PENGADAAN';
    totRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
    totRow.getCell(1).alignment = { horizontal: 'right' };
    totRow.getCell(8).value = { formula: `SUM(H${firstItemRow}:H${lastItemRow})`, result: Number(paket.nilai_hps || 0) };
    totRow.getCell(8).numFmt = '#,##0';
    totRow.getCell(8).font = { name: 'Arial', size: 10, bold: true };
    for (let c = 1; c <= 8; c++) {
      totRow.getCell(c).fill = FILL_TOTAL;
      totRow.getCell(c).border = BORDER_THIN;
    }

    appendTandaTanganPPK(ws, rowIdx + 1, ppk, settings, tahapMap[1]?.tanggal_dokumen || paket.tgl_mulai_kerja, 'F', {
      barisAtas: 'Mengetahui / Menyetujui:',
      judulAtas: 'Kuasa Pengguna Anggaran (Sekretaris KPU)',
      subJudul: settings.nama_satker || 'KPU Kabupaten Ngawi',
      nama: kpa?.nama_lengkap || 'BUDI RAHAYU',
      identitas: `NIP. ${kpa?.nip || '19830503 200902 1 002'}`
    }, 'B');
  }

  // -------------------------------------------------------------------------
  // SHEET 2: ANALISA PASAR, REFERENSI HARGA (<=100JT), HPS, & RIWAYAT SURVEI (TAHAP 5 & 6)
  // -------------------------------------------------------------------------
  if (buildAll || [5, 6, 7, 8].includes(stageNum)) {
    const isRefHarga = String(paket.jenis_kertas_harga || '').includes('Referensi Harga');
    const judulKertas = isRefHarga
      ? 'KERTAS KERJA REFERENSI HARGA & ANALISA PASAR E-PURCHASING (<= RP 100 JUTA)'
      : 'KERTAS KERJA PENYUSUNAN HARGA PERKIRAAN SENDIRI (HPS) & RIWAYAT SURVEI PASAR';
    const subJudulKertas = isRefHarga
      ? 'Sesuai Pasal 8 & Pasal 9 Peraturan LKPP Nomor 2 Tahun 2026 (Dikecualikan dari HPS)'
      : 'Sesuai Pasal 26 Perpres Nomor 46 Tahun 2025 & Lampiran I Peraturan LKPP Nomor 3 Tahun 2026';

    const ws = wb.addWorksheet('06_Kertas_Kerja_HPS_RefHarga');
    ws.columns = [
      { width: 5 }, { width: 28 }, { width: 10 }, { width: 10 },
      { width: 16 }, { width: 16 }, { width: 16 }, { width: 15 },
      { width: 16 }, { width: 18 }
    ];

    let rowIdx = setupKopSheet(ws, settings, judulKertas, subJudulKertas, paket, tahapMap[6], 10);

    const headers = [
      'No', 'Uraian Barang / Jasa & Spesifikasi Singkat', 'Volume', 'Satuan',
      'Survei Sumber 1\n(Katalog / Vendor A)', 'Survei Sumber 2\n(Pembanding Pasar B)',
      'Survei Sumber 3\n(SBM / Kontrak Lalu)', 'Metode Penentuan',
      isRefHarga ? 'Harga Satuan Referensi (Rp)' : 'Harga Satuan HPS (Rp)',
      isRefHarga ? 'Jumlah Referensi Harga (Rp)' : 'Jumlah Total HPS (Rp)'
    ];

    const hRow = ws.getRow(rowIdx);
    headers.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.fill = FILL_HEADER;
      c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = BORDER_THIN;
    });
    hRow.height = 30;
    rowIdx++;

    const firstRow = rowIdx;
    items.forEach((it, idx) => {
      const r = ws.getRow(rowIdx);
      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).value = `${it.uraian_item}\n[Spek: ${it.spesifikasi_teknis || '-'}]`;
      r.getCell(3).value = Number(it.volume);
      r.getCell(3).numFmt = '#,##0';
      r.getCell(4).value = it.satuan;
      r.getCell(4).alignment = { horizontal: 'center' };
      r.getCell(5).value = Number(it.harga_survei_1 || 0);
      r.getCell(5).numFmt = '#,##0';
      r.getCell(6).value = Number(it.harga_survei_2 || 0);
      r.getCell(6).numFmt = '#,##0';
      r.getCell(7).value = Number(it.harga_survei_3 || 0);
      r.getCell(7).numFmt = '#,##0';
      r.getCell(8).value = it.metode_penentuan_hps || 'Terendah';
      r.getCell(8).alignment = { horizontal: 'center' };
      r.getCell(9).value = Number(it.harga_satuan_hps || 0);
      r.getCell(9).numFmt = '#,##0';
      r.getCell(10).value = {
        formula: `C${rowIdx}*I${rowIdx}`,
        result: Number(it.jumlah_hps || 0)
      };
      r.getCell(10).numFmt = '#,##0';

      for (let c = 1; c <= 10; c++) {
        r.getCell(c).border = BORDER_THIN;
        r.getCell(c).font = { name: 'Arial', size: 9 };
        r.getCell(c).alignment = { ...r.getCell(c).alignment, vertical: 'top', wrapText: true };
      }
      rowIdx++;
    });
    const lastRow = rowIdx - 1;

    // Total Row
    const totRow = ws.getRow(rowIdx);
    ws.mergeCells(`A${rowIdx}:I${rowIdx}`);
    totRow.getCell(1).value = isRefHarga ? 'TOTAL NILAI REFERENSI HARGA (TERMASUK PAJAK)' : 'TOTAL NILAI HARGA PERKIRAAN SENDIRI / HPS (TERMASUK PAJAK)';
    totRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
    totRow.getCell(1).alignment = { horizontal: 'right' };
    totRow.getCell(10).value = { formula: `SUM(J${firstRow}:J${lastRow})`, result: Number(paket.nilai_hps || 0) };
    totRow.getCell(10).numFmt = '#,##0';
    totRow.getCell(10).font = { name: 'Arial', size: 10, bold: true };
    for (let c = 1; c <= 10; c++) {
      totRow.getCell(c).fill = FILL_TOTAL;
      totRow.getCell(c).border = BORDER_THIN;
    }
    rowIdx++;

    // Terbilang Row
    ws.mergeCells(`A${rowIdx}:J${rowIdx}`);
    ws.getCell(`A${rowIdx}`).value = `Terbilang: # ${terbilangRupiah(paket.nilai_hps)} #`;
    ws.getCell(`A${rowIdx}`).font = { name: 'Arial', size: 9, bold: true, italic: true };
    ws.getCell(`A${rowIdx}`).border = BORDER_THIN;
    rowIdx += 2;

    // Tabel Referensi Konversi SBOB Konsultansi (Lampiran I Bab II Perlem 3/2026)
    const sbobSample = hitungKonversiSbob(7500000);
    ws.mergeCells(`A${rowIdx}:J${rowIdx}`);
    ws.getCell(`A${rowIdx}`).value = `Catatan Regulasi & Penilaian PPK atas Katalog Elektronik (Pasal 8 Perlem 2/2026): ${paket.tersedia_di_katalog} — ${paket.alasan_penilaian_ppk_katalog || '-'} | Rumus Konversi Konsultansi: SBOM = SBOB/4,1 (Rp ${sbobSample.sbom.toLocaleString('id-ID')}), SBOH = (SBOB/22)*1,1 (Rp ${sbobSample.sboh.toLocaleString('id-ID')}), SBOJ = (SBOH/8)*1,3 (Rp ${sbobSample.sboj.toLocaleString('id-ID')}).`;
    ws.getCell(`A${rowIdx}`).font = { name: 'Arial', size: 8, italic: true, color: { argb: 'FF334155' } };

    appendTandaTanganPPK(ws, rowIdx + 1, ppk, settings, tahapMap[6]?.tanggal_dokumen || paket.tgl_mulai_kerja, 'H', {
      judulAtas: 'Pejabat Pengadaan',
      subJudul: settings.nama_satker || 'KPU Kabupaten Ngawi',
      nama: pejabatPengadaan?.nama_lengkap || 'INDRAYU FATIKA MAHARDIKA',
      identitas: `NIP. ${pejabatPengadaan?.nip || '-'}`
    }, 'B');
  }

  // -------------------------------------------------------------------------
  // SHEET 3: EVALUASI, NEGOSIASI HARGA, & RINCIAN KONTRAK (TAHAP 9, 10, 11, 12, 13, 14, 15)
  // -------------------------------------------------------------------------
  if (buildAll || [9, 10, 11, 12, 13, 14, 15].includes(stageNum)) {
    const ws = wb.addWorksheet('09_13_Negosiasi_dan_Kontrak');
    ws.columns = [
      { width: 5 }, { width: 30 }, { width: 10 }, { width: 10 },
      { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 18 }
    ];

    let rowIdx = setupKopSheet(
      ws, settings,
      'BERITA ACARA & KERTAS KERJA EVALUASI / KLARIFIKASI & NEGOSIASI HARGA KONTRAK',
      `Penyedia: ${penyedia.nama_perusahaan || '-'} (${penyedia.kualifikasi_usaha || 'UMK'}) | Bentuk Kontrak: ${paket.bentuk_kontrak} (${paket.jenis_kontrak})`,
      paket, tahapMap[stageNum] || tahapMap[9], 9
    );

    const headers = [
      'No', 'Uraian Pekerjaan / Barang / Jasa', 'Volume', 'Satuan',
      'Harga Satuan HPS/Ref (Rp)', 'Harga Penawaran Penyedia (Rp)',
      'Harga Hasil Negosiasi/Kontrak (Rp)', 'Jumlah Harga Kontrak (Rp)', 'Selisih / Efisiensi (Rp)'
    ];
    const hRow = ws.getRow(rowIdx);
    headers.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.fill = FILL_HEADER;
      c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = BORDER_THIN;
    });
    hRow.height = 28;
    rowIdx++;

    const firstRow = rowIdx;
    items.forEach((it, idx) => {
      const r = ws.getRow(rowIdx);
      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).value = it.uraian_item;
      r.getCell(3).value = Number(it.volume);
      r.getCell(3).numFmt = '#,##0';
      r.getCell(4).value = it.satuan;
      r.getCell(4).alignment = { horizontal: 'center' };
      r.getCell(5).value = Number(it.harga_satuan_hps || 0);
      r.getCell(5).numFmt = '#,##0';
      r.getCell(6).value = Number(it.harga_satuan_penawaran || it.harga_satuan_hps || 0);
      r.getCell(6).numFmt = '#,##0';
      r.getCell(7).value = Number(it.harga_satuan_kontrak || 0);
      r.getCell(7).numFmt = '#,##0';
      r.getCell(8).value = { formula: `C${rowIdx}*G${rowIdx}`, result: Number(it.jumlah_kontrak || 0) };
      r.getCell(8).numFmt = '#,##0';
      r.getCell(9).value = {
        formula: `(C${rowIdx}*E${rowIdx})-H${rowIdx}`,
        result: Math.max(0, Number(it.jumlah_hps || 0) - Number(it.jumlah_kontrak || 0))
      };
      r.getCell(9).numFmt = '#,##0';

      for (let c = 1; c <= 9; c++) {
        r.getCell(c).border = BORDER_THIN;
        r.getCell(c).font = { name: 'Arial', size: 9 };
      }
      rowIdx++;
    });
    const lastRow = rowIdx - 1;

    const totRow = ws.getRow(rowIdx);
    ws.mergeCells(`A${rowIdx}:G${rowIdx}`);
    totRow.getCell(1).value = 'TOTAL NILAI KONTRAK / SURAT PESANAN HASIL NEGOSIASI';
    totRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
    totRow.getCell(1).alignment = { horizontal: 'right' };
    totRow.getCell(8).value = { formula: `SUM(H${firstRow}:H${lastRow})`, result: Number(paket.nilai_kontrak || 0) };
    totRow.getCell(8).numFmt = '#,##0';
    totRow.getCell(8).font = { name: 'Arial', size: 10, bold: true };
    totRow.getCell(9).value = { formula: `SUM(I${firstRow}:I${lastRow})`, result: Math.max(0, Number(paket.nilai_hps || 0) - Number(paket.nilai_kontrak || 0)) };
    totRow.getCell(9).numFmt = '#,##0';
    totRow.getCell(9).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF047857' } };
    for (let c = 1; c <= 9; c++) {
      totRow.getCell(c).fill = FILL_TOTAL;
      totRow.getCell(c).border = BORDER_THIN;
    }

    appendTandaTanganPPK(ws, rowIdx + 1, ppk, settings, tahapMap[13]?.tanggal_dokumen || paket.tgl_mulai_kerja, 'G', {
      judulAtas: 'Untuk dan Atas Nama Penyedia',
      subJudul: penyedia?.nama_perusahaan || 'Penyedia',
      nama: penyedia?.nama_direktur || '-',
      identitas: penyedia?.jabatan_penandatangan || 'Direktur'
    }, 'B');
  }

  // -------------------------------------------------------------------------
  // SHEET 4: BAST, RINCIAN BMN/PERSEDIAAN SAKTI, PAJAK, DENDA 1 PERMIL & SKOR KINERJA (TAHAP 16, 17, 18)
  // -------------------------------------------------------------------------
  if (buildAll || [16, 17, 18].includes(stageNum)) {
    const ws = wb.addWorksheet('17_18_BMN_Pajak_Denda_Kinerja');
    ws.columns = [
      { width: 6 }, { width: 32 }, { width: 22 }, { width: 16 },
      { width: 12 }, { width: 12 }, { width: 18 }, { width: 20 }
    ];

    let rowIdx = setupKopSheet(
      ws, settings,
      'LAMPIRAN BAST PPK KE KPA (INPUT BMN/PERSEDIAAN SAKTI), PERHITUNGAN PAJAK/DENDA, & SKOR KINERJA',
      `Penyedia: ${penyedia.nama_perusahaan || '-'} | NPWP: ${penyedia.npwp || '-'} | Rekening: ${penyedia.nama_bank || ''} ${penyedia.no_rekening || ''}`,
      paket, tahapMap[17] || tahapMap[16], 8
    );

    const headers = [
      'No', 'Nama Barang / Aset / Output Pekerjaan', 'Kode Barang BMN / Akun',
      'Modul SAKTI', 'Volume', 'Satuan', 'Harga Perolehan Satuan (Rp)', 'Total Nilai Perolehan (Rp)'
    ];
    const hRow = ws.getRow(rowIdx);
    headers.forEach((h, i) => {
      const c = hRow.getCell(i + 1);
      c.value = h;
      c.fill = FILL_HEADER;
      c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      c.border = BORDER_THIN;
    });
    hRow.height = 26;
    rowIdx++;

    const firstRow = rowIdx;
    items.forEach((it, idx) => {
      const r = ws.getRow(rowIdx);
      r.getCell(1).value = idx + 1;
      r.getCell(1).alignment = { horizontal: 'center' };
      r.getCell(2).value = it.uraian_item;
      r.getCell(3).value = it.kode_barang_bmn || '1.01.03.01.001';
      r.getCell(4).value = it.jenis_pencatatan_sakti || 'Persediaan';
      r.getCell(4).alignment = { horizontal: 'center' };
      r.getCell(5).value = Number(it.volume);
      r.getCell(5).numFmt = '#,##0';
      r.getCell(6).value = it.satuan;
      r.getCell(6).alignment = { horizontal: 'center' };
      r.getCell(7).value = Number(it.harga_satuan_kontrak || 0);
      r.getCell(7).numFmt = '#,##0';
      r.getCell(8).value = { formula: `E${rowIdx}*G${rowIdx}`, result: Number(it.jumlah_kontrak || 0) };
      r.getCell(8).numFmt = '#,##0';

      for (let c = 1; c <= 8; c++) {
        r.getCell(c).border = BORDER_THIN;
        r.getCell(c).font = { name: 'Arial', size: 9 };
      }
      rowIdx++;
    });

    // Blok Kalkulator Pajak, Uang Muka, Denda 1 permil & SP2D/SPBy Bersih
    const keu = hitungKeuanganKontrak(paket);
    rowIdx += 2;
    ws.mergeCells(`A${rowIdx}:E${rowIdx}`);
    ws.getCell(`A${rowIdx}`).value = 'RINCIAN PERHITUNGAN TAGIHAN, POTONGAN PAJAK, UANG MUKA, & DENDA (1‰)';
    ws.getCell(`A${rowIdx}`).font = { name: 'Arial', size: 10, bold: true };
    ws.getCell(`A${rowIdx}`).fill = FILL_SUBHEADER;

    ws.mergeCells(`F${rowIdx}:H${rowIdx}`);
    ws.getCell(`F${rowIdx}`).value = 'PENILAIAN KINERJA PENYEDIA OLEH PPK (BAB V PERLEM 3/2026)';
    ws.getCell(`F${rowIdx}`).font = { name: 'Arial', size: 10, bold: true };
    ws.getCell(`F${rowIdx}`).fill = FILL_SUBHEADER;
    rowIdx++;

    const rowsKeuKinerja = [
      ['1. Nilai Bruto Kontrak / Tagihan (100% Fisik)', keu.nilaiKontrak, 'Aspek 1: Kualitas & Kuantitas (Bobot 30%)', `Skor: ${paket.skor_kualitas ?? 3} (Nilai: ${(Number(paket.skor_kualitas ?? 3) * 0.3).toFixed(2)})`],
      ['2. Dasar Pengenaan Pajak (DPP)', keu.dpp, 'Aspek 2: Biaya (Bobot 20%)', `Skor: ${paket.skor_biaya ?? 3} (Nilai: ${(Number(paket.skor_biaya ?? 3) * 0.2).toFixed(2)})`],
      [`3. Potongan PPN (${paket.tarif_ppn || 0}%)`, keu.ppn, 'Aspek 3: Waktu (Bobot 30%)', `Skor: ${paket.skor_waktu ?? 3} (Nilai: ${(Number(paket.skor_waktu ?? 3) * 0.3).toFixed(2)})`],
      [`4. Potongan ${paket.jenis_pph || 'PPh'} (${paket.tarif_pph || 0}%)`, keu.pph, 'Aspek 4: Layanan (Bobot 20%)', `Skor: ${paket.skor_layanan ?? 3} (Nilai: ${(Number(paket.skor_layanan ?? 3) * 0.2).toFixed(2)})`],
      [`5. Denda Keterlambatan 1‰ (${keu.hariTerlambat} hari x Rp ${keu.dendaPerHari.toLocaleString('id-ID')})`, keu.totalDenda, 'TOTAL SKOR KINERJA AKHIR (0.00 - 3.00)', `${Number(paket.nilai_kinerja_akhir || 3).toFixed(2)} — ${paket.predikat_kinerja || 'Sangat Baik'}`],
      ['6. Retensi Pemeliharaan 5% Konstruksi (Saat PHO 95% / FHO 5%)', keu.nilaiRetensi5Persen, 'Opsi Cair 95% Saat PHO (Ditahan Retensi 5%)', `Rp ${keu.nilaiBersihDenganRetensi5.toLocaleString('id-ID')}`],
      ['7. NILAI BERSIH DITERIMA PENYEDIA 100% (NETTO SPBy/SP2D)', keu.nilaiBersihDiterimaPenyedia, 'Kelayakan Repeat Order (Pasal 38 Perpres 46/2025)', Number(paket.nilai_kinerja_akhir || 3) >= 2.5 ? 'LAYAK REPEAT ORDER (Sangat Baik)' : 'Tidak Memenuhi Syarat Repeat Order']
    ];

    for (const rk of rowsKeuKinerja) {
      ws.mergeCells(`A${rowIdx}:C${rowIdx}`);
      ws.getCell(`A${rowIdx}`).value = rk[0];
      ws.getCell(`A${rowIdx}`).font = { name: 'Arial', size: 9, bold: rk[0].startsWith('6.') };
      ws.getCell(`A${rowIdx}`).border = BORDER_THIN;

      ws.mergeCells(`D${rowIdx}:E${rowIdx}`);
      ws.getCell(`D${rowIdx}`).value = rk[1];
      ws.getCell(`D${rowIdx}`).numFmt = '#,##0';
      ws.getCell(`D${rowIdx}`).font = { name: 'Arial', size: 9, bold: rk[0].startsWith('6.') };
      ws.getCell(`D${rowIdx}`).border = BORDER_THIN;

      ws.mergeCells(`F${rowIdx}:G${rowIdx}`);
      ws.getCell(`F${rowIdx}`).value = rk[2];
      ws.getCell(`F${rowIdx}`).font = { name: 'Arial', size: 9, bold: rk[2].startsWith('TOTAL') };
      ws.getCell(`F${rowIdx}`).border = BORDER_THIN;

      ws.getCell(`H${rowIdx}`).value = rk[3];
      ws.getCell(`H${rowIdx}`).font = { name: 'Arial', size: 9, bold: rk[2].startsWith('TOTAL') };
      ws.getCell(`H${rowIdx}`).border = BORDER_THIN;
      rowIdx++;
    }

    appendTandaTanganPPK(ws, rowIdx + 1, ppk, settings, tahapMap[18]?.tanggal_dokumen || paket.tgl_realisasi_selesai, 'F', {
      barisAtas: 'Mengetahui / Menyetujui:',
      judulAtas: 'Kuasa Pengguna Anggaran (Sekretaris KPU)',
      subJudul: settings.nama_satker || 'KPU Kabupaten Ngawi',
      nama: kpa?.nama_lengkap || 'BUDI RAHAYU',
      identitas: `NIP. ${kpa?.nip || '19830503 200902 1 002'}`
    }, 'B');
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  generateExcelBuffer
};
