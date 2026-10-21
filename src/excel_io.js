/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Export Excel (XLSX) Multi-Sheet
 * Pengembang Resmi: emenje
 */

const XLSX = require('xlsx');
const { getRabRows, getPeriodeById, getMasters } = require('./db');
const { calculateRkbDataset, getRevisionComparison } = require('./calculation');

/**
 * Menghasilkan buffer XLSX untuk download RUH Belanja Multi-Sheet
 * @param {number} periodeId
 * @param {object} options { pic, sasaran, scope }
 */
function exportRkbToExcelBuffer(periodeId, options = {}) {
  const periode = getPeriodeById(periodeId);
  const rawRows = getRabRows(periodeId);
  const { rows, summary } = calculateRkbDataset(rawRows);
  const masters = getMasters ? getMasters() : {};
  const settings = masters.settings || {};
  const masterAkuns = masters.akuns || [];

  // Peta deskripsi akun untuk resume
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

    const matchingIds = new Set();
    rows.forEach(r => {
      if (!r.is_header) {
        let matchPic = true;
        let matchSas = true;
        if (filterPic && (r.pic_bagian || '').toUpperCase() !== filterPic) matchPic = false;
        if (filterSasaran && (r.target_scope || '').toUpperCase() !== filterSasaran) matchSas = false;
        if (matchPic && matchSas) matchingIds.add(r.id);
      }
    });

    const includedTreeIds = new Set();
    matchingIds.forEach(id => {
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

  const wb = XLSX.utils.book_new();

  // ==========================================================================
  // SHEET 1: RUH_Belanja_Resmi (Format Cetak Siap Print)
  // Urutan Kolom:
  // Kode | Uraian Komponen / Akun / Rincian Belanja | Rincian Perhitungan |
  // Volume | Satuan | Harga Satuan | Jumlah (Rp) | [Kolom Kosong] | No | PIC | Sasaran
  // ==========================================================================
  const filterLabel = hasFilter ? ` [Filter: ${filterPic ? 'PIC ' + filterPic : ''}${filterPic && filterSasaran ? ' & ' : ''}${filterSasaran ? 'Sasaran ' + filterSasaran : ''}]` : '';

  const sheet1Data = [
    ['KOMISI PEMILIHAN UMUM KABUPATEN NGAWI'],
    [`RENCANA USULAN HALAMAN (RUH) BELANJA${filterLabel}`],
    [`Program / Dokumen: ${periode ? periode.nama_periode : 'Pilkada 2024'} | Versi: ${periode ? periode.versi_revisi : '-'} | Status: ${statusLabel}`],
    [`Dasar Pengesahan: ${periode ? (periode.dasar_pengesahan || 'Kertas Kerja Penyusunan') : '-'} | Tanggal Unduh: ${new Date().toLocaleDateString('id-ID')}`],
    [],
    [
      'Kode',
      'Uraian Komponen / Akun / Rincian Belanja',
      'Rincian Perhitungan',
      'Volume',
      'Satuan',
      'Harga Satuan',
      'Jumlah (Rp)',
      '', // Kolom Kosong (Spacer cetak agar pas batas margin)
      'No',
      'PIC',
      'Sasaran'
    ]
  ];

  function getIndentPrefix(level) {
    if (level === 1) return '';
    if (level === 2) return '  ';
    if (level === 3) return '    ';
    if (level === 4) return '      ';
    if (level === 5) return '        ';
    if (level === 5.5) return '          ';
    return '            '; // L6 Rincian Belanja
  }

  exportRows.forEach((r, idx) => {
    const isItem = !r.is_header;
    const treeLvl = r.tree_level || (isItem ? 6 : (r.level_indent === 0 ? 1 : (r.level_indent === 1 ? 2 : (r.level_indent === 2 ? 3 : (r.level_indent === 3 ? 5 : 4)))));
    const indent = getIndentPrefix(treeLvl);

    sheet1Data.push([
      r.kode || '',
      indent + (r.uraian || ''),
      isItem ? (r.computed_formula || '') : '',
      isItem && r.computed_volume !== null ? r.computed_volume : '',
      isItem ? (r.satuan_vol || '') : '',
      isItem && r.harga_satuan ? r.harga_satuan : '',
      r.computed_total || 0,
      '', // Kolom Kosong
      r.urutan || (idx + 1),
      r.pic_bagian || '',
      r.target_scope || ''
    ]);
  });

  // Hitung total dari baris yang diekspor
  const displayedTotal = hasFilter
    ? exportRows.filter(r => !r.is_header).reduce((acc, cur) => acc + (cur.computed_total || 0), 0)
    : summary.grandTotal;

  sheet1Data.push([
    '',
    'TOTAL PAGU RUH BELANJA' + (hasFilter ? ' (SESUAI FILTER)' : ''),
    '',
    '',
    '',
    '',
    displayedTotal,
    '',
    '',
    '',
    ''
  ]);

  // Lembar Tanda Tangan Tunggal: KETUA KPU (sesuai arahan user)
  const kotaTtd = settings.kota_ttd || 'Ngawi';
  const tglTtdStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const ketuaNama = settings.ketua_kpu_nama || 'SAMSU MUSTAKIM';

  sheet1Data.push([]);
  sheet1Data.push([]);
  sheet1Data.push(['', '', '', '', `${kotaTtd}, ${tglTtdStr}`]);
  sheet1Data.push(['', '', '', '', 'Ketua Komisi Pemilihan Umum']);
  sheet1Data.push(['', '', '', '', 'Kabupaten Ngawi,']);
  sheet1Data.push([]);
  sheet1Data.push([]);
  sheet1Data.push([]);
  sheet1Data.push(['', '', '', '', ketuaNama]);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  ws1['!cols'] = [
    { wch: 12 }, // Kode
    { wch: 52 }, // Uraian Komponen / Akun / Detail
    { wch: 32 }, // Rincian Perhitungan
    { wch: 10 }, // Volume
    { wch: 10 }, // Satuan
    { wch: 16 }, // Harga Satuan
    { wch: 20 }, // Jumlah (Rp)
    { wch: 4 },  // Kolom Kosong (Spacer)
    { wch: 6 },  // No
    { wch: 12 }, // PIC
    { wch: 12 }  // Sasaran
  ];

  applyNumericFormatting(ws1);
  XLSX.utils.book_append_sheet(wb, ws1, 'RUH_Belanja_Resmi');

  // ==========================================================================
  // SHEET 2: Data_Kertas_Kerja (Tabel Flat untuk Analisis Data)
  // ==========================================================================
  const sheet2Data = [
    [
      'No',
      'Level',
      'Kode',
      'Uraian Komponen / Akun / Rincian Belanja',
      'Volume',
      'Satuan',
      'Rincian Perhitungan',
      'Harga Satuan (Rp)',
      'Jumlah Anggaran (Rp)',
      'PIC Subbag',
      'Sasaran',
      'Kode Akun',
      'Catatan Revisi'
    ]
  ];

  exportRows.forEach((r, idx) => {
    const isItem = !r.is_header;
    const treeLvl = r.tree_level || (isItem ? 6 : (r.level_indent === 0 ? 1 : (r.level_indent === 1 ? 2 : (r.level_indent === 2 ? 3 : (r.level_indent === 3 ? 5 : 4)))));

    sheet2Data.push([
      r.urutan || (idx + 1),
      `L${treeLvl}`,
      r.kode || '',
      r.uraian || '',
      isItem && r.computed_volume !== null ? r.computed_volume : '',
      isItem ? (r.satuan_vol || '') : '',
      isItem ? (r.computed_formula || '') : '',
      isItem && r.harga_satuan ? r.harga_satuan : '',
      r.computed_total || 0,
      r.pic_bagian || '',
      r.target_scope || '',
      r.kode_akun || '',
      isItem ? (r.catatan_revisi_baris || '') : ''
    ]);
  });

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [
    { wch: 6 },  // No
    { wch: 8 },  // Level
    { wch: 10 }, // Kode
    { wch: 50 }, // Uraian
    { wch: 10 }, // Volume
    { wch: 10 }, // Satuan
    { wch: 32 }, // Rincian Perhitungan
    { wch: 16 }, // Harga
    { wch: 20 }, // Jumlah
    { wch: 12 }, // PIC
    { wch: 12 }, // Sasaran
    { wch: 10 }, // Akun
    { wch: 35 }  // Catatan
  ];

  applyNumericFormatting(ws2);
  XLSX.utils.book_append_sheet(wb, ws2, 'Data_Kertas_Kerja');

  // ==========================================================================
  // SHEET 3: Matriks_Revisi (Hanya Data Terevisi Beserta Rute Utamanya)
  // ==========================================================================
  const revComp = getRevisionComparison(periodeId);
  if (revComp && revComp.has_parent) {
    const parent = revComp.parent_periode;
    const revByRowId = revComp.by_row_id || {};

    const rowByTreeId = {};
    const rowById = {};
    rows.forEach(r => {
      rowByTreeId[r.tree_id] = r;
      rowById[r.id] = r;
    });

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

    // 3. Filter baris matriks: hanya memuat rute utama dan rincian yang direvisi
    const sheet3Rows = rows.filter(r => includedTreeIds.has(r.tree_id));

    const sheet3Data = [
      ['MATRIKS PERUBAHAN RENCANA USULAN HALAMAN BELANJA (SEMULA - MENJADI)'],
      ['KPU KABUPATEN NGAWI - PILKADA SERENTAK'],
      [`Dokumen Semula: ${parent.nama || parent.versi_revisi}  ==>  Dokumen Menjadi: ${periode.nama_periode} (${periode.versi_revisi})`],
      [`Dasar Hukum: ${periode.dasar_pengesahan || '-'} | Nomor: ${periode.nomor_ba_tapd || '-'} | Tanggal: ${periode.tanggal_ba_tapd || '-'}`],
      [`Catatan Dokumen: ${periode.catatan_revisi || '-'}`],
      [],
      [
        'No',
        'Level',
        'Kode',
        'Uraian Kegiatan / Akun / Rincian Belanja',
        'Semula (Vol)',
        'Semula (Harga)',
        'Semula (Jumlah Rp)',
        'Menjadi (Vol)',
        'Menjadi (Harga)',
        'Menjadi (Jumlah Rp)',
        'Selisih (+/- Rp)',
        'Status Perubahan',
        'Alasan / Catatan Justifikasi Perubahan'
      ]
    ];

    sheet3Rows.forEach((r, idx) => {
      const isItem = !r.is_header;
      const treeLvl = r.tree_level || (isItem ? 6 : (r.level_indent === 0 ? 1 : (r.level_indent === 1 ? 2 : (r.level_indent === 2 ? 3 : (r.level_indent === 3 ? 5 : 4)))));
      const indent = getIndentPrefix(treeLvl);

      const diffInfo = revByRowId[r.id] || {
        status: isItem ? 'TETAP' : 'BAGIAN_RUTE',
        diff: 0,
        semula_vol: r.computed_volume,
        semula_harga: r.harga_satuan,
        semula_jumlah: r.computed_total,
        menjadi_vol: r.computed_volume,
        menjadi_harga: r.harga_satuan,
        menjadi_jumlah: r.computed_total,
        catatan: r.catatan_revisi_baris || ''
      };

      sheet3Data.push([
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
      ]);
    });

    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
    ws3['!cols'] = [
      { wch: 6 },  // No
      { wch: 8 },  // Level
      { wch: 10 }, // Kode
      { wch: 45 }, // Uraian
      { wch: 12 }, // Semula Vol
      { wch: 15 }, // Semula Harga
      { wch: 20 }, // Semula Jumlah
      { wch: 12 }, // Menjadi Vol
      { wch: 15 }, // Menjadi Harga
      { wch: 20 }, // Menjadi Jumlah
      { wch: 20 }, // Selisih
      { wch: 16 }, // Status
      { wch: 40 }  // Alasan Catatan
    ];

    applyNumericFormatting(ws3);
    XLSX.utils.book_append_sheet(wb, ws3, 'Matriks_Revisi');
  } else {
    const sheet3Data = [
      ['MATRIKS PERUBAHAN RENCANA USULAN HALAMAN BELANJA (SEMULA - MENJADI)'],
      ['KPU KABUPATEN NGAWI - PILKADA SERENTAK'],
      [`Dokumen: ${periode ? (periode.nama_periode || periode.versi_revisi) : 'Baseline Awal'}`],
      ['Status: DOKUMEN BASELINE AWAL (NPHD INDUK)'],
      ['Keterangan: Dokumen ini merupakan RUH Belanja Induk Baseline awal, belum memiliki pembanding revisi sebelumnya.'],
      [],
      ['No', 'Level', 'Kode', 'Uraian Kegiatan / Akun / Rincian Belanja', 'Semula (Jumlah Rp)', 'Menjadi (Jumlah Rp)', 'Selisih (+/- Rp)', 'Status Perubahan', 'Alasan / Catatan Justifikasi Perubahan'],
      ['-', '-', '-', 'Tidak ada data perubahan (Baseline Awal)', 0, summary.grandTotal || 0, 0, 'BASELINE_AWAL', 'Dokumen Penetapan Induk']
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
    ws3['!cols'] = [
      { wch: 6 }, { wch: 8 }, { wch: 10 }, { wch: 45 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 40 }
    ];
    applyNumericFormatting(ws3);
    XLSX.utils.book_append_sheet(wb, ws3, 'Matriks_Revisi');
  }

  // ==========================================================================
  // SHEET 4: Rekap_Alokasi (Resume Sesuai Bentuk Resume RKB Awal)
  // ==========================================================================
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

  const sheet4Data = [
    ['RESUME ALOKASI ANGGARAN RUH BELANJA'],
    [`Dokumen: ${periode ? periode.nama_periode : 'Pilkada 2024'} | Versi: ${periode ? periode.versi_revisi : '-'}`],
    [`Total Pagu: Rp ${grandTotal.toLocaleString('id-ID')}`],
    [],
    ['=== 1. RESUME SASARAN ANGGARAN (FORMAT RKB AWAL) ==='],
    ['No', 'Kelompok Sasaran', 'Entitas / Satuan Alokasi', 'Pagu Anggaran (Rp)', 'Persentase (%)', 'Keterangan Ruang Lingkup']
  ];

  dataSasaran.forEach((d, idx) => {
    const pct = ((d.val / grandTotal) * 100).toFixed(2) + '%';
    sheet4Data.push([
      idx + 1,
      d.title,
      d.entitas,
      d.val,
      pct,
      d.desc
    ]);
  });

  sheet4Data.push([
    '',
    'TOTAL ALOKASI PENYELENGGARA (1 s.d 5):',
    'Akumulasi Seluruh Tingkatan',
    totalPenyelenggara,
    pctPenyelenggara,
    'Akumulasi anggaran seluruh tingkatan penyelenggara pemilihan'
  ]);

  sheet4Data.push([
    '6',
    'Peserta Pemilihan',
    'Paslon & Parpol',
    valPeserta,
    pctPeserta,
    'Bahan kampanye, alat peraga kampanye (APK), fasilitasi debat paslon, audit KAP'
  ]);

  sheet4Data.push([
    '',
    'TOTAL PAGU RUH BELANJA:',
    'Hibah NPHD Pilkada',
    grandTotal,
    '100.00%',
    '100% BALANCE'
  ]);

  sheet4Data.push([]);
  sheet4Data.push(['=== 2. REKAPITULASI TAHAPAN PROGRAM ===']);
  sheet4Data.push(['Tahapan Program', 'Pagu Anggaran (Rp)', 'Persentase (%)']);

  const banner = summary.banner || {};
  const tahapItems = [
    { label: 'Tahapan I: Persiapan & Pelaksanaan', val: banner.tahapanTotal || 0 },
    { label: 'Tahapan II: Operasional Kantor', val: banner.operasionalTotal || 0 },
    { label: 'Honorarium Pokja & Adhoc', val: banner.honorTotal || 0 }
  ];

  tahapItems.forEach(t => {
    const pct = grandTotal > 0 ? ((t.val / grandTotal) * 100).toFixed(2) + '%' : '0%';
    sheet4Data.push([t.label, t.val, pct]);
  });
  sheet4Data.push(['TOTAL TAHAPAN:', grandTotal, '100.00%']);

  sheet4Data.push([]);
  sheet4Data.push(['=== 3. REKAPITULASI PER SUBBAGIAN PELAKSANA (PIC) ===']);
  sheet4Data.push(['Subbag Pelaksana (PIC)', 'Pagu Anggaran (Rp)', 'Persentase (%)']);

  const subbagFullNames = {
    KUL: 'Keuangan, Umum & Logistik (KUL)',
    RENDATIN: 'Perencanaan, Data & Informasi (RENDATIN)',
    TEKNIS: 'Teknis Penyelenggaraan Pemilu (TEKNIS)',
    HUKUM: 'Hukum (HUKUM)',
    PARSDM: 'Partisipasi Masyarakat & SDM (PARSDM)'
  };

  for (const [pic, amt] of Object.entries(summary.bySubbag || {})) {
    const pct = grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(2) + '%' : '0%';
    const label = subbagFullNames[pic] || pic;
    sheet4Data.push([label, amt, pct]);
  }

  sheet4Data.push([]);
  sheet4Data.push(['=== 4. REKAPITULASI PER KODE AKUN (BAS 6-DIGIT) ===']);
  sheet4Data.push(['Kode Akun', 'Uraian Akun Belanja', 'Pagu Anggaran (Rp)', 'Persentase (%)']);

  for (const [ak, amt] of Object.entries(summary.byAkun || {})) {
    const pct = grandTotal > 0 ? ((amt / grandTotal) * 100).toFixed(2) + '%' : '0%';
    const desc = akunMap[ak] || 'Belanja';
    sheet4Data.push([ak, desc, amt, pct]);
  }

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);
  ws4['!cols'] = [
    { wch: 6 },  // No / Kode
    { wch: 35 }, // Kelompok / Uraian
    { wch: 28 }, // Entitas
    { wch: 22 }, // Pagu (Rp)
    { wch: 15 }, // Persentase
    { wch: 50 }  // Keterangan
  ];

  applyNumericFormatting(ws4);
  XLSX.utils.book_append_sheet(wb, ws4, 'Rekap_Alokasi');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Terapkan format angka numerik standar Excel (#,##0)
 */
function applyNumericFormatting(ws) {
  for (const cellAddress in ws) {
    if (cellAddress[0] === '!') continue;
    const cell = ws[cellAddress];
    if (cell && typeof cell.v === 'number') {
      cell.z = '#,##0';
    }
  }
}

module.exports = {
  exportRkbToExcelBuffer
};
