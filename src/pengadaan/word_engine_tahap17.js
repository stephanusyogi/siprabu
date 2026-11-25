/**
 * SI-PRABU — Modul Word Engine Khusus Tahap 17
 * "PENATAUSAHAAN ASET BMN (BAST PPK KE KPA) & PENGAJUAN SPM-LS KPPN"
 * Standar Tata Naskah Dinas Resmi KPU Kabupaten Ngawi (Layout Manual Professional)
 * Menghasilkan 2 Dokumen Sah Terpadu Hubungan Internal Satker:
 * 1. Dokumen 01: Berita Acara Serah Terima PPK kepada KPA (BAST PPK ke KPA) & Nota Dinas BMN SAKTI (3 Halaman)
 * 2. Dokumen 02: Surat Permintaan Pembayaran Langsung (SPP-LS) & Lembar Pengujian Tagihan PPSPM (2 Halaman)
 */

const {
  Paragraph,
  PageBreak
} = require('docx');

const {
  PAGE_A4,
  MARGIN_DINAS,
  buildRunningHeader,
  buildRunningFooter
} = require('../../scratch/kpu_doc_theme');

const {
  buildDoc3BastPage1Children,
  buildDoc3BastPage2Children,
  buildDoc3NotaDinasChildren,
  buildDoc4SppPage1Children,
  buildDoc4PengujianPage2Children
} = require('../../scratch/deploy_tahap17_simulation_folder');

function buildStage17Sections(ctx, tahapRow, keu, isFirstStageInDoc) {
  const footerText = 'KPU KABUPATEN NGAWI | TAHUN ANGGARAN 2026';
  const footer = buildRunningFooter(footerText);

  // 1. SECTION DOKUMEN 01: BAST PPK KE KPA & NOTA DINAS PELIMPAHAN BMN (Pas 3 Halaman)
  const secDoc1 = {
    properties: {
      page: {
        size: PAGE_A4,
        margin: MARGIN_DINAS
      },
      titlePage: true
    },
    headers: {
      default: buildRunningHeader('DOKUMEN 01: BAST PPK KE KPA & NOTA DINAS BMN SAKTI — TAHAP 17')
    },
    footers: {
      default: footer,
      first: footer
    },
    children: [
      ...buildDoc3BastPage1Children(),
      new Paragraph({ children: [new PageBreak()] }),
      ...buildDoc3BastPage2Children(),
      new Paragraph({ children: [new PageBreak()] }),
      ...buildDoc3NotaDinasChildren()
    ]
  };

  // 2. SECTION DOKUMEN 02: SPP-LS & LEMBAR PENGUJIAN PPSPM (Pas 2 Halaman)
  const secDoc2 = {
    properties: {
      page: {
        size: PAGE_A4,
        margin: MARGIN_DINAS
      },
      titlePage: true
    },
    headers: {
      default: buildRunningHeader('DOKUMEN 02: SPP-LS & PENGUJIAN TAGIHAN PPSPM — TAHAP 17')
    },
    footers: {
      default: footer,
      first: footer
    },
    children: [
      ...buildDoc4SppPage1Children(),
      new Paragraph({ children: [new PageBreak()] }),
      ...buildDoc4PengujianPage2Children()
    ]
  };

  return [secDoc1, secDoc2];
}

module.exports = {
  buildStage17Sections
};
