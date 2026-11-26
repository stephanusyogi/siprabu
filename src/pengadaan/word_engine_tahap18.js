/**
 * SI-PRABU — Modul Word Engine Khusus Tahap 18
 * "PENILAIAN KINERJA PENYEDIA OLEH PPK (SIKAP LKPP) & PENUTUPAN KONTRAK (CONTRACT CLOSE-OUT)"
 * Standar Tata Naskah Dinas Resmi KPU Kabupaten Ngawi (Layout Manual Professional)
 * Menghasilkan 3 Dokumen Sah Terpadu Penutupan Pengadaan:
 * 1. Dokumen 01: Formulir Lembar Evaluasi & Penilaian Kinerja Penyedia (Standar SIKaP LKPP — 4 Aspek Kinerja)
 * 2. Dokumen 02: Sertifikat Penilaian Kinerja Penyedia / Surat Keterangan Kinerja (SKKP)
 * 3. Dokumen 03: Berita Acara Penyelesaian dan Penutupan Kontrak Pengadaan (BAPPK / Close-Out Report)
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
} = require('./kpu_doc_theme');

const {
  buildCoverBundelTahap18Children,
  buildDoc1FormulirKinerjaChildren,
  buildDoc2SertifikatKinerjaChildren,
  buildDoc3PenutupanKontrakChildren
} = require('./word_builders_tahap18');

function buildStage18Sections(ctx, tahapRow, keu, isFirstStageInDoc, subdoc = null) {
  const footerText = 'KPU KABUPATEN NGAWI | TAHUN ANGGARAN 2026';
  const footer = buildRunningFooter(footerText);

  // 1. SECTION DOKUMEN 01: FORMULIR PENILAIAN KINERJA SIKAP (1 Halaman / Pas)
  const secDoc1 = {
    properties: {
      page: {
        size: PAGE_A4,
        margin: MARGIN_DINAS
      },
      titlePage: true
    },
    headers: {
      default: buildRunningHeader('DOKUMEN 01: FORMULIR EVALUASI KINERJA SIKAP LKPP — TAHAP 18')
    },
    footers: {
      default: footer,
      first: footer
    },
    children: [
      ...buildDoc1FormulirKinerjaChildren(ctx)
    ]
  };

  // 2. SECTION DOKUMEN 02: SERTIFIKAT PENILAIAN KINERJA PENYEDIA (SKKP) (1 Halaman / Piagam)
  const secDoc2 = {
    properties: {
      page: {
        size: PAGE_A4,
        margin: MARGIN_DINAS
      },
      titlePage: true
    },
    headers: {
      default: buildRunningHeader('DOKUMEN 02: SERTIFIKAT KINERJA PENYEDIA (SKKP) — TAHAP 18')
    },
    footers: {
      default: footer,
      first: footer
    },
    children: [
      ...buildDoc2SertifikatKinerjaChildren(ctx)
    ]
  };

  // 3. SECTION DOKUMEN 03: BERITA ACARA PENYELESAIAN & PENUTUPAN KONTRAK (BAPPK) (1-2 Halaman)
  const secDoc3 = {
    properties: {
      page: {
        size: PAGE_A4,
        margin: MARGIN_DINAS
      },
      titlePage: true
    },
    headers: {
      default: buildRunningHeader('DOKUMEN 03: BERITA ACARA PENUTUPAN KONTRAK (BAPPK) — TAHAP 18')
    },
    footers: {
      default: footer,
      first: footer
    },
    children: [
      ...buildDoc3PenutupanKontrakChildren(ctx)
    ]
  };

  // Filter jika meminta subdokumen tertentu
  if (subdoc === '1' || subdoc === 'dok1' || subdoc === 'kinerja') {
    return [secDoc1];
  }
  if (subdoc === '2' || subdoc === 'dok2' || subdoc === 'skkp') {
    return [secDoc2];
  }
  if (subdoc === '3' || subdoc === 'dok3' || subdoc === 'bappk' || subdoc === 'penutupan') {
    return [secDoc3];
  }

  // Jika subdoc === 'bundel' atau default stage 18: sertakan Cover Bundel di awal
  const secCover = {
    properties: {
      page: {
        size: PAGE_A4,
        margin: MARGIN_DINAS
      },
      titlePage: true
    },
    headers: {
      default: buildRunningHeader('BUNDEL RESMI TAHAP 18: PENILAIAN KINERJA & PENUTUPAN KONTRAK')
    },
    footers: {
      default: footer,
      first: footer
    },
    children: [
      ...buildCoverBundelTahap18Children(ctx)
    ]
  };

  return [secCover, secDoc1, secDoc2];
}

module.exports = {
  buildStage18Sections
};
