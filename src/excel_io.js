/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Export & Import Excel (XLSX)
 * Pengembang: emenje
 */

const XLSX = require('xlsx');
const { getRabRows, saveRabRow, clearRabRows, getPeriodeById, getMasters } = require('./db');
const { calculateRkbDataset, getRevisionComparison } = require('./calculation');

/**
 * Menghasilkan buffer XLSX untuk download RKB
 */
function exportRkbToExcelBuffer(periodeId) {
  const periode = getPeriodeById(periodeId);
  const rawRows = getRabRows(periodeId);
  const { rows, summary } = calculateRkbDataset(rawRows);
  const settings = (getMasters && getMasters().settings) ? getMasters().settings : {};

  let statusLabel = 'DRAFT AKTIF (LEMBAR KERJA)';
  if (periode && periode.is_locked) {
    if (periode.tahap_revisi === 'PRA_NPHD') statusLabel = `ARSIP PRA-NPHD (${periode.dasar_pengesahan || 'USULAN'})`;
    else if (periode.dasar_pengesahan === 'NPHD' || periode.tahap_revisi === 'RKB_AWAL') statusLabel = 'TERKUNCI (NPHD SAH - BASELINE)';
    else statusLabel = `TERKUNCI PASCA-NPHD (${periode.dasar_pengesahan || 'BA TAPD'})`;
  }

  // 1. Data Sheet RKB_KABUPATEN
  const rkbData = [
    ['SISTEM INFORMASI PERENCANAAN ANGGARAN & BIAYA TERPADU (SI-PRABU)'],
    [`RENCANA KEBUTUHAN BIAYA (RKB) - ${periode ? periode.nama_periode : 'KPU KABUPATEN NGAWI'}`],
    [`Versi: ${periode ? periode.versi_revisi : '-'} | Dasar: ${periode ? (periode.dasar_pengesahan || '-') : '-'} | Status: ${statusLabel}`],
    [],
    [
      'No', 'Leveling RKB', 'Kode', 'Uraian Komponen / Akun / Rincian Belanja',
      'Vol', 'Satuan', 'Rincian Perhitungan (Faktor x Pengali)',
      'Harga Satuan (Rp)', 'Jumlah Anggaran (Rp)',
      'PIC Subbag', 'Sasaran', 'Akun', 'Catatan / Alasan Revisi'
    ]
  ];

  function getRkbLevelName(lvl) {
    const n = Number(lvl);
    if (n === 0) return 'L1 - Bagian Utama (A/B)';
    if (n === 1) return 'L2 - Tahapan (I/II)';
    if (n === 2) return 'L3 - 28 Komponen Kegiatan';
    if (n >= 21 && n <= 25) return 'L4 - Sub-Komponen';
    if (n === 3) return 'L5 - Akun BAS (6 Digit)';
    if (n === 41 || n === 42) return 'Header Sub-Akun';
    return 'L6 - Rincian Belanja';
  }

  rows.forEach((r, idx) => {
    const isItem = Number(r.level_indent) === 4;
    rkbData.push([
      r.urutan || (idx + 1),
      getRkbLevelName(r.level_indent),
      r.kode || '',
      r.uraian || '',
      isItem ? r.computed_volume : '',
      r.satuan_vol || '',
      isItem ? r.computed_formula : '',
      isItem ? r.harga_satuan : '',
      r.computed_total || 0,
      r.pic_bagian || '',
      r.target_scope || '',
      r.kode_akun || '',
      isItem ? (r.catatan_revisi_baris || '') : ''
    ]);
  });

  // Tanda Tangan Resmi (Urutan Hierarki: Ketua, Sekretaris, PPK, BP)
  const kota = settings.kota_ttd || 'NGAWI';
  const tglTtd = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  rkbData.push([]);
  rkbData.push([]);
  rkbData.push(['', '', '', '', '', '', '', '', `${kota}, ${tglTtd}`]);
  rkbData.push([]);
  rkbData.push(['', '', '1. Mengetahui / Menyetujui:', '', '', '', '', '', '2. Kuasa Pengguna Anggaran (KPA):']);
  rkbData.push(['', '', 'Ketua KPU Kabupaten Ngawi,', '', '', '', '', '', 'Sekretaris KPU Kabupaten Ngawi,']);
  rkbData.push([]);
  rkbData.push([]);
  rkbData.push([]);
  rkbData.push(['', '', settings.ketua_kpu_nama || 'SAMSU MUSTAKIM', '', '', '', '', '', settings.kpa_nama || 'BUDI RAHAYU']);
  rkbData.push(['', '', '', '', '', '', '', '', `NIP. ${settings.kpa_nip || '19830503 200902 1 002'}`]);
  rkbData.push([]);
  rkbData.push(['', '', '3. Pejabat Pembuat Komitmen (PPK):', '', '', '', '', '', '4. Bendahara Pengeluaran (BP):']);
  rkbData.push(['', '', 'Kepala Sub Bagian Perencanaan, Data & Informasi', '', '', '', '', '', 'Bendahara Pengeluaran,']);
  rkbData.push([]);
  rkbData.push([]);
  rkbData.push([]);
  rkbData.push(['', '', settings.ppkom_nama || 'MOHAMMAD NOOR JIHAN', '', '', '', '', '', settings.bp_nama || 'IMAS MAESAROH']);
  rkbData.push(['', '', `NIP. ${settings.ppkom_nip || '19840101 200912 1 001'}`, '', '', '', '', '', `NIP. ${settings.bp_nip || '19850615 200902 2 013'}`]);

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
    { wch: 10 }, // Akun
    { wch: 35 }  // Catatan / Alasan Revisi
  ];

  wsSum['!cols'] = [
    { wch: 25 },
    { wch: 25 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, wsRkb, 'RKB_KABUPATEN');
  XLSX.utils.book_append_sheet(wb, wsSum, 'RINGKASAN_PAGU');

  // 3. Data Sheet MATRIKS_SEMULA_MENJADI (Jika dokumen merupakan revisi dari versi sebelumnya)
  const revComp = getRevisionComparison(periodeId);
  if (revComp && revComp.has_parent) {
    const parent = revComp.parent_periode;
    const matriksData = [
      ['MATRIKS PERUBAHAN RENCANA KEBUTUHAN BIAYA (SEMULA - MENJADI)'],
      ['KPU KABUPATEN NGAWI - PILKADA SERENTAK (PAGU Rp 49.999.999.000)'],
      [`Dokumen Semula: ${parent.nama || parent.versi_revisi}  ==>  Dokumen Menjadi: ${periode.nama_periode} (${periode.versi_revisi})`],
      [`Dasar Hukum: ${periode.dasar_pengesahan || '-'} | Nomor: ${periode.nomor_ba_tapd || '-'} | Tanggal: ${periode.tanggal_ba_tapd || '-'}`],
      [`Catatan Dokumen: ${periode.catatan_revisi || '-'}`],
      [],
      [
        'No', 'Kode', 'Uraian Kegiatan / Akun / Rincian Belanja',
        'Semula (Vol)', 'Semula (Harga)', 'Semula (Jumlah Rp)',
        'Menjadi (Vol)', 'Menjadi (Harga)', 'Menjadi (Jumlah Rp)',
        'Selisih (+/- Rp)', 'Status Perubahan', 'Alasan / Catatan Justifikasi Perubahan'
      ]
    ];

    const revByRowId = revComp.by_row_id || {};
    rows.forEach((r, idx) => {
      const isItem = Number(r.level_indent) === 4;
      const diffInfo = revByRowId[r.id] || {
        status: 'TETAP', diff: 0,
        semula_vol: r.computed_volume, semula_harga: r.harga_satuan, semula_jumlah: r.computed_total,
        menjadi_vol: r.computed_volume, menjadi_harga: r.harga_satuan, menjadi_jumlah: r.computed_total,
        catatan: r.catatan_revisi_baris || ''
      };

      matriksData.push([
        r.urutan || (idx + 1),
        r.kode || '',
        r.uraian || '',
        isItem && diffInfo.semula_vol !== null ? diffInfo.semula_vol : '',
        isItem && diffInfo.semula_harga ? diffInfo.semula_harga : '',
        diffInfo.semula_jumlah || 0,
        isItem && diffInfo.menjadi_vol !== null ? diffInfo.menjadi_vol : '',
        isItem && diffInfo.menjadi_harga ? diffInfo.menjadi_harga : '',
        diffInfo.menjadi_jumlah || 0,
        diffInfo.diff || 0,
        diffInfo.status,
        diffInfo.catatan || ''
      ]);
    });

    const wsMatriks = XLSX.utils.aoa_to_sheet(matriksData);
    wsMatriks['!cols'] = [
      { wch: 6 },  // No
      { wch: 10 }, // Kode
      { wch: 45 }, // Uraian
      { wch: 12 }, // Semula Vol
      { wch: 15 }, // Semula Harga
      { wch: 20 }, // Semula Jumlah
      { wch: 12 }, // Menjadi Vol
      { wch: 15 }, // Menjadi Harga
      { wch: 20 }, // Menjadi Jumlah
      { wch: 20 }, // Selisih
      { wch: 14 }, // Status
      { wch: 40 }  // Alasan Catatan
    ];
    XLSX.utils.book_append_sheet(wb, wsMatriks, 'MATRIKS_SEMULA_MENJADI');
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  exportRkbToExcelBuffer
};
