/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Export & Import Excel (XLSX)
 * Pengembang: emenje
 */

const XLSX = require('xlsx');
const { getRabRows, saveRabRow, clearRabRows, getPeriodeById } = require('./db');
const { calculateRkbDataset } = require('./calculation');

/**
 * Menghasilkan buffer XLSX untuk download RKB
 */
function exportRkbToExcelBuffer(periodeId) {
  const periode = getPeriodeById(periodeId);
  const rawRows = getRabRows(periodeId);
  const { rows, summary } = calculateRkbDataset(rawRows);

  // 1. Data Sheet RKB_KABUPATEN
  const rkbData = [
    ['SISTEM INFORMASI PERENCANAAN ANGGARAN & BIAYA TERPADU (SI-PRABU)'],
    [`RENCANA KEBUTUHAN BIAYA (RKB) - ${periode ? periode.nama_periode : 'KPU KABUPATEN NGAWI'}`],
    [`Versi: ${periode ? periode.versi_revisi : '-'} | Status: ${periode && periode.is_locked ? 'TERKUNCI (NPHD SAH)' : 'DRAFT AKTIF'}`],
    [],
    [
      'No', 'Level', 'Kode', 'Uraian Komponen / Akun / Rincian',
      'Vol', 'Satuan', 'Rincian Perhitungan (Faktor x Pengali)',
      'Harga Satuan (Rp)', 'Jumlah Anggaran (Rp)',
      'PIC Subbag', 'Sasaran', 'Akun'
    ]
  ];

  rows.forEach((r, idx) => {
    const isItem = Number(r.level_indent) === 4;
    rkbData.push([
      r.urutan || (idx + 1),
      r.level_indent,
      r.kode || '',
      r.uraian || '',
      isItem ? r.computed_volume : '',
      r.satuan_vol || '',
      isItem ? r.computed_formula : '',
      isItem ? r.harga_satuan : '',
      r.computed_total || 0,
      r.pic_bagian || '',
      r.target_scope || '',
      r.kode_akun || ''
    ]);
  });

  // 2. Data Sheet RINGKASAN_PAGU
  const summaryData = [
    ['RINGKASAN PAGU DOKUMEN RKB'],
    [`Dokumen: ${periode ? periode.nama_periode : '-'}`],
    [`Total Pagu: Rp ${summary.grandTotal.toLocaleString('id-ID')}`],
    [],
    ['=== DISTRIBUSI PER SUBBAG PELAKSANA ==='],
    ['Subbag PIC', 'Pagu Anggaran (Rp)', 'Persentase (%)']
  ];

  for (const [pic, amt] of Object.entries(summary.bySubbag)) {
    const pct = summary.grandTotal > 0 ? ((amt / summary.grandTotal) * 100).toFixed(2) + '%' : '0%';
    summaryData.push([pic, amt, pct]);
  }

  summaryData.push([]);
  summaryData.push(['=== DISTRIBUSI PER KODE AKUN (BAS) ===']);
  summaryData.push(['Kode Akun', 'Jumlah Anggaran (Rp)', 'Persentase (%)']);

  for (const [ak, amt] of Object.entries(summary.byAkun)) {
    const pct = summary.grandTotal > 0 ? ((amt / summary.grandTotal) * 100).toFixed(2) + '%' : '0%';
    summaryData.push([ak, amt, pct]);
  }

  summaryData.push([]);
  summaryData.push(['=== DISTRIBUSI SASARAN PENYELENGGARA ===']);
  summaryData.push(['Sasaran', 'Jumlah Anggaran (Rp)', 'Persentase (%)']);

  for (const [sas, amt] of Object.entries(summary.bySasaran)) {
    const pct = summary.grandTotal > 0 ? ((amt / summary.grandTotal) * 100).toFixed(2) + '%' : '0%';
    summaryData.push([sas, amt, pct]);
  }

  const wb = XLSX.utils.book_new();
  const wsRkb = XLSX.utils.aoa_to_sheet(rkbData);
  const wsSum = XLSX.utils.aoa_to_sheet(summaryData);

  // Set column widths
  wsRkb['!cols'] = [
    { wch: 6 },  // No
    { wch: 6 },  // Level
    { wch: 10 }, // Kode
    { wch: 50 }, // Uraian
    { wch: 10 }, // Vol
    { wch: 10 }, // Satuan
    { wch: 35 }, // Formula
    { wch: 18 }, // Harga
    { wch: 22 }, // Jumlah
    { wch: 12 }, // PIC
    { wch: 12 }, // Sasaran
    { wch: 10 }  // Akun
  ];

  wsSum['!cols'] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, wsRkb, 'RKB_KABUPATEN');
  XLSX.utils.book_append_sheet(wb, wsSum, 'RINGKASAN_PAGU');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  exportRkbToExcelBuffer
};
