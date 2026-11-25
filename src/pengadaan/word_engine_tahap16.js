/**
 * SI-PRABU — Modul Word Engine Khusus Tahap 16
 * "PEMERIKSAAN (BAPHP) & SERAH TERIMA PEKERJAAN (BAST) SERTA PENYELESAIAN PENAGIHAN PENYEDIA (KUITANSI & BAP)"
 * Standar Tata Naskah Dinas Resmi KPU Kabupaten Ngawi (Layout Manual Professional)
 * Menghasilkan 4 Dokumen Sah Terpadu Hubungan PPK & Penyedia:
 * 1. Dokumen 01: Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP) (2 Halaman)
 * 2. Dokumen 02: Berita Acara Serah Terima Pertama Pekerjaan (BAST) (2 Halaman)
 * 3. Dokumen 03: Surat Permohonan Pembayaran 100% & Kuitansi Tagihan Penyedia (2 Halaman)
 * 4. Dokumen 04: Berita Acara Pembayaran (BAP) & Rekonsiliasi Denda Keterlambatan (2 Halaman)
 * (Add-On / Section 5: Surat Tanda Terima Barang Sementara / STTBS Parsial)
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
  buildDoc1PermohonanChildren,
  buildDoc1KuitansiChildren,
  buildDoc2Page1Children,
  buildDoc2Page2Children
} = require('../../scratch/deploy_tahap17_simulation_folder');

function buildStage16Sections(ctx, tahapRow, keu, isFirstStageInDoc, oldBuilders) {
  const footerText = 'KPU KABUPATEN NGAWI | TAHUN ANGGARAN 2026';
  const footer = buildRunningFooter(footerText);

  // Section 1: BAPHP (2 Halaman)
  const secBaphp = {
    properties: {
      page: { size: PAGE_A4, margin: MARGIN_DINAS },
      titlePage: true
    },
    headers: {
      default: buildRunningHeader('DOKUMEN 01: BERITA ACARA PEMERIKSAAN HASIL PEKERJAAN (BAPHP) — TAHAP 16')
    },
    footers: { default: footer, first: footer },
    children: oldBuilders.baphpChildren
  };

  // Section 2: BAST (2 Halaman)
  const secBast = {
    properties: {
      page: { size: PAGE_A4, margin: MARGIN_DINAS },
      titlePage: true
    },
    headers: {
      default: buildRunningHeader('DOKUMEN 02: BERITA ACARA SERAH TERIMA (BAST) — TAHAP 16')
    },
    footers: { default: footer, first: footer },
    children: oldBuilders.bastChildren
  };

  // Section 3: Permohonan Pembayaran & Kuitansi Tagihan 100% (2 Halaman)
  const secPermohonan = {
    properties: {
      page: { size: PAGE_A4, margin: MARGIN_DINAS },
      titlePage: true
    },
    headers: {
      default: buildRunningHeader('DOKUMEN 03: PERMOHONAN PEMBAYARAN & KUITANSI — TAHAP 16')
    },
    footers: { default: footer, first: footer },
    children: [
      ...buildDoc1PermohonanChildren(),
      new Paragraph({ children: [new PageBreak()] }),
      ...buildDoc1KuitansiChildren()
    ]
  };

  // Section 4: Berita Acara Pembayaran (BAP) & Rekonsiliasi Denda (2 Halaman)
  const secBap = {
    properties: {
      page: { size: PAGE_A4, margin: MARGIN_DINAS },
      titlePage: true
    },
    headers: {
      default: buildRunningHeader('DOKUMEN 04: BERITA ACARA PEMBAYARAN (BAP) — TAHAP 16')
    },
    footers: { default: footer, first: footer },
    children: [
      ...buildDoc2Page1Children(),
      new Paragraph({ children: [new PageBreak()] }),
      ...buildDoc2Page2Children()
    ]
  };

  const result = [secBaphp, secBast, secPermohonan, secBap];
  if (oldBuilders.sttbsChildren && oldBuilders.sttbsChildren.length > 0) {
    result.push({
      properties: {
        page: { size: PAGE_A4, margin: MARGIN_DINAS },
        titlePage: true
      },
      headers: {
        default: buildRunningHeader('LAMPIRAN KHUSUS: SURAT TANDA TERIMA BARANG SEMENTARA (STTBS) — TAHAP 16')
      },
      footers: { default: footer, first: footer },
      children: oldBuilders.sttbsChildren
    });
  }

  return result;
}

module.exports = {
  buildStage16Sections
};
