/**
 * Script Otomasi Deploy Naskah Dokumen Simulasi Tahap 17:
 * "PENGAJUAN PEMBAYARAN TAGIHAN (SPP-LS, BAP, BAST PPK KE KPA, DAN PEMOTONGAN DENDA KE KAS NEGARA)"
 * Standar Tata Naskah Dinas Resmi KPU Kabupaten Ngawi (Layout Manual Professional)
 * Penasihat Teknis PBJ & Arsitek Sistem SI-PRABU (emenje)
 */

const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  PageBreak,
  Header,
  Footer,
  PageNumber
} = require('docx');

const dbPengadaan = require('./db_pengadaan');
const {
  PAGE_A4,
  MARGIN_DINAS,
  BORDER_NONE,
  BORDER_TABLE_SOLID,
  BORDER_TABLE_LIGHT,
  buildKopKpuResmi,
  buildRunningHeader,
  buildRunningFooter,
  p,
  pBab,
  pSubBab,
  pNumbered,
  pNum,
  pSubNum,
  pContinuation
} = require('./kpu_doc_theme');

// generatePanduanTahap17 omitted

const BORDER_TABLE = BORDER_TABLE_SOLID;

// Helper Sel Header Tabel dengan Padding Presisi
function makeHeaderCell(text, widthPercent, align = AlignmentType.CENTER) {
  return new TableCell({
    borders: BORDER_TABLE,
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
    margins: { top: 90, bottom: 90, left: 110, right: 110 },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text,
            bold: true,
            size: 18,
            font: 'Cambria',
            color: '0F172A'
          })
        ]
      })
    ]
  });
}

// Helper Sel Data Tabel dengan Padding Presisi
function makeDataCell(text, widthPercent, isBold = false, align = AlignmentType.LEFT, color = '0F172A') {
  return new TableCell({
    borders: BORDER_TABLE,
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    margins: { top: 75, bottom: 75, left: 110, right: 110 },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 0, after: 0, line: 230 },
        children: [
          new TextRun({
            text,
            bold: isBold,
            size: 17.5,
            font: 'Cambria',
            color
          })
        ]
      })
    ]
  });
}

// Kop Surat Perusahaan Penyedia (Compact & Elegan)
function buildKopPenyedia() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.DOUBLE, size: 18, color: '1E3A8A' }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { bottom: 100, top: 0, left: 0, right: 0 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: 'CV. GRAFIKA PRATAMA NGAWI',
                    bold: true,
                    size: 24,
                    font: 'Cambria',
                    color: '1E3A8A'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: 'PERCETAKAN, PENGADAAN ALAT TULIS KANTOR, KOMPUTER & PERALATAN ELEKTRONIK',
                    bold: true,
                    size: 17,
                    font: 'Cambria',
                    color: '0F172A'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 40 },
                children: [
                  new TextRun({
                    text: 'Jl. PB. Sudirman No. 88, Beran, Ngawi | Telp: (0351) 749882 | Email: grafikapratama.ngawi@gmail.com\nNPWP: 01.445.882.9-646.000 | NIB: 9120004510283',
                    size: 15.5,
                    font: 'Cambria',
                    color: '475569'
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

// Kop Surat SPP-LS APBN (Kemenkeu / KPU RI)
function buildKopSppApbn() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.DOUBLE, size: 18, color: '000000' }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { bottom: 100, top: 0, left: 0, right: 0 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 15 },
                children: [
                  new TextRun({
                    text: 'KOMISI PEMILIHAN UMUM REPUBLIK INDONESIA',
                    bold: true,
                    size: 21,
                    font: 'Cambria',
                    color: '000000'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 15 },
                children: [
                  new TextRun({
                    text: 'SURAT PERMINTAAN PEMBAYARAN LANGSUNG (SPP-LS)',
                    bold: true,
                    size: 23,
                    font: 'Cambria',
                    color: '000000'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 30 },
                children: [
                  new TextRun({
                    text: 'SATUAN KERJA: KPU KABUPATEN NGAWI (KODE: 657811) | TAHUN ANGGARAN 2026',
                    bold: true,
                    size: 16.5,
                    font: 'Cambria',
                    color: '475569'
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

// Kop Surat Nota Dinas KPU
function buildKopNotaDinas() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.SINGLE, size: 24, color: '000000' }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            margins: { bottom: 80, top: 0, left: 0, right: 0 },
            borders: {
              top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
              bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 15 },
                children: [
                  new TextRun({
                    text: 'KOMISI PEMILIHAN UMUM KABUPATEN NGAWI',
                    bold: true,
                    size: 23,
                    font: 'Cambria',
                    color: '000000'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 20 },
                children: [
                  new TextRun({
                    text: 'NOTA DINAS',
                    bold: true,
                    size: 25,
                    font: 'Cambria',
                    color: '000000'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 30 },
                children: [
                  new TextRun({
                    text: 'NOMOR: 017/ND-KPA/PBJ-2026-001/VI/2026',
                    bold: true,
                    size: 18,
                    font: 'Cambria',
                    color: '1E3A8A'
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}


// =============================================================================
// 1. DOKUMEN 01: SURAT PERMOHONAN PEMBAYARAN & KUITANSI (PENYEDIA)
// =============================================================================

// 1A. Halaman 1: Surat Permohonan Pembayaran 100% (Pas 1 Halaman)
function buildDoc1PermohonanChildren() {
  return [
    buildKopPenyedia(),

    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: 'Ngawi, 11 Juni 2026',
          font: 'Cambria',
          size: 19
        })
      ]
    }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 14, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              margins: { top: 0, bottom: 20, left: 0, right: 0 },
              children: [p('Nomor', { bold: true, size: 19 })]
            }),
            new TableCell({
              width: { size: 46, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              margins: { top: 0, bottom: 20, left: 0, right: 0 },
              children: [p(': 042/GP-NGW/TAG-PBJ/VI/2026', { size: 19 })]
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              margins: { top: 0, bottom: 20, left: 0, right: 0 },
              children: [
                p('Kepada Yth.', { bold: true, size: 19, before: 0, after: 10 }),
                p('Pejabat Pembuat Komitmen (PPK)', { bold: true, size: 19, before: 0, after: 10 }),
                p('KPU Kabupaten Ngawi', { size: 19, before: 0, after: 10 }),
                p('Jl. Untung Suropati No. 48, Ngawi', { size: 19, before: 0, after: 10 })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 14, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              margins: { top: 0, bottom: 20, left: 0, right: 0 },
              children: [p('Lampiran', { bold: true, size: 19 })]
            }),
            new TableCell({
              width: { size: 46, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              margins: { top: 0, bottom: 20, left: 0, right: 0 },
              children: [p(': 1 (Satu) Berkas Tagihan Lengkap', { size: 19 })]
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [p('')]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              width: { size: 14, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              margins: { top: 0, bottom: 40, left: 0, right: 0 },
              children: [p('Perihal', { bold: true, size: 19 })]
            }),
            new TableCell({
              width: { size: 46, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              margins: { top: 0, bottom: 40, left: 0, right: 0 },
              children: [
                p('Permohonan Pembayaran 100% Pengadaan Perangkat Pengolah Data & PC Server Operasional TA 2026', {
                  bold: true,
                  size: 19,
                  color: '0F172A',
                  before: 0,
                  after: 20
                })
              ]
            }),
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [p('')]
            })
          ]
        })
      ]
    }),

    p('Dengan hormat,', { size: 19, before: 20, after: 15 }),
    p('Sehubungan dengan telah diselesaikannya seluruh kewajiban pekerjaan pengadaan barang berdasarkan Surat Pesanan (Kontrak) Nomor: 013/SP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026 tanggal 27 Mei 2026, serta Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP) Nomor: 016/BAPHP/PBJ-2026-001/PPK/VI/2026 dan Berita Acara Serah Terima Pertama Pekerjaan (BAST) Nomor: 016/BAST/PBJ-2026-001/PPK/VI/2026 tanggal 10 Juni 2026, bersama ini kami sampaikan hal-hal sebagai berikut:', { size: 19, before: 10, after: 20, line: 230 }),

    pNum('1.', 'Seluruh barang berupa 1 (satu) Unit PC Server Tower Dell PowerEdge T350 dan 3 (tiga) Unit PC Workstation Dell OptiPlex 7020 telah diserahkan dalam kondisi lengkap, berfungsi normal, dan bersegel pabrikan utuh.', { size: 18.5, before: 8, after: 12 }),
    pNum('2.', 'Terhadap keterlambatan penyerahan 1 (satu) unit PC Server selama 1 (satu) hari kalender (tiba tanggal 10 Juni 2026 dari batas akhir 09 Juni 2026), kami menyatakan tunduk dan bersedia dipotong sanksi denda keterlambatan sebesar Rp 56.568,- (Lima Puluh Enam Ribu Lima Ratus Enam Puluh Delapan Rupiah) untuk disetorkan langsung ke Kas Negara pada Akun PNBP 425161.', { size: 18.5, before: 8, after: 12 }),
    pNum('3.', 'Kami mengajukan permohonan pembayaran sebesar 100% dari Nilai Kontrak yaitu Rp 138.000.000,- (Seratus Tiga Puluh Delapan Juta Rupiah) bruto termasuk PPN 11%, dengan hak pembayaran bersih sebelum pajak sebesar Rp 137.943.432,- (setelah dipotong denda keterlambatan Rp 56.568,-).', { size: 18.5, before: 8, after: 12 }),
    pNum('4.', 'Pembayaran mohon ditransfer langsung melalui mekanisme SPM-LS ke rekening operasional perusahaan kami pada Bank BRI Cabang Ngawi Nomor Rekening: 0058-01-002481-30-8 atas nama CV. GRAFIKA PRATAMA NGAWI (NPWP: 01.445.882.9-646.000).', { size: 18.5, before: 8, after: 15 }),

    p('Sebagai kelengkapan berkas penagihan pembayaran penyedia, terlampir kami sampaikan dokumen persyaratan sebagai berikut:', { size: 18.5, before: 10, after: 10 }),
    pNum('1.', 'Kuitansi Pembayaran 100% Asli bermeterai cukup Rp 10.000,- yang telah ditandatangani sah;', { size: 18, before: 6, after: 8 }),
    pNum('2.', 'Salinan Faktur Pajak Elektronik (e-Faktur) yang sah dan tervalidasi DJP;', { size: 18, before: 6, after: 8 }),
    pNum('3.', 'Salinan Surat Keterangan / Identitas Rekening Bank Penyedia (Halaman Depan Buku Tabungan) pada Bank BRI Cabang Ngawi Nomor Rekening: 0058-01-002481-30-8 atas nama CV. GRAFIKA PRATAMA NGAWI; dan', { size: 18, before: 6, after: 8 }),
    pNum('4.', 'Sertifikat Garansi Resmi Pabrikan / ATPM selama 365 hari kalender s.d. 10 Juni 2027 (Opsional).', { size: 18, before: 6, after: 12 }),

    p('(Catatan: Dokumen Surat Pesanan/Kontrak, BAPHP, dan BAST tidak perlu dilampirkan kembali oleh penyedia karena merupakan dokumen internal satker yang telah diterbitkan dan diarsipkan oleh PPK KPU Kabupaten Ngawi).', { italic: true, size: 16.5, color: '475569', before: 5, after: 15 }),
    p('Demikian permohonan pembayaran ini kami sampaikan. Atas kerja sama dan kepercayaan yang diberikan, kami ucapkan terima kasih.', { size: 18.5, before: 10, after: 20 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [p('')]
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 20, after: 0 },
                  children: [
                    new TextRun({ text: 'Hormat kami,', font: 'Cambria', size: 18 }),
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 80 },
                  children: [
                    new TextRun({ text: 'CV. GRAFIKA PRATAMA NGAWI', bold: true, font: 'Cambria', size: 19, color: '1E3A8A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'BAMBANG SUDARMANTO', bold: true, underline: {}, font: 'Cambria', size: 19 }),
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'Direktur', font: 'Cambria', size: 17, color: '475569' })
                  ]
                })
              ]
            })
          ]
        })
      ]
    })
  ];
}

// 1B. Halaman 2: Kuitansi Pembayaran Sah (Pas 1 Halaman)
function buildDoc1KuitansiChildren() {
  return [
    buildKopKpuResmi(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 20 },
      children: [
        new TextRun({
          text: 'KUITANSI / BUKTI PEMBAYARAN',
          bold: true,
          size: 23,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: 'NOMOR: 016/KUIT/PBJ-2026-001/PPK/VI/2026',
          bold: true,
          size: 18,
          font: 'Cambria',
          color: '1E3A8A'
        })
      ]
    }),

    new Table({
      borders: BORDER_TABLE_SOLID,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeHeaderCell('TAHUN ANGGARAN', 28, AlignmentType.LEFT),
            makeDataCell('2026 (DIPA KPU Kabupaten Ngawi)', 72, true)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('MATA ANGGARAN (MAK)', 28, AlignmentType.LEFT),
            makeDataCell('532111 (Belanja Modal Peralatan dan Mesin)', 72, true)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('TELAH TERIMA DARI', 28, AlignmentType.LEFT),
            makeDataCell('Kuasa Pengguna Anggaran / Pejabat Pembuat Komitmen KPU Kabupaten Ngawi', 72)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('UANG SEJUMLAH', 28, AlignmentType.LEFT),
            makeDataCell('Rp 138.000.000,- (Seratus Tiga Puluh Delapan Juta Rupiah)', 72, true, AlignmentType.LEFT, '1E3A8A')
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('UNTUK PEMBAYARAN', 28, AlignmentType.LEFT),
            makeDataCell('Pembayaran Prestasi Pekerjaan 100% Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi TA 2026 berdasarkan Surat Pesanan No. 013/SP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026 tanggal 27 Mei 2026 dan Berita Acara Serah Terima Pertama Pekerjaan (BAST) No. 016/BAST/PBJ-2026-001/PPK/VI/2026 tanggal 10 Juni 2026 (dengan pengenaan sanksi denda keterlambatan 1 hari sebesar Rp 56.568,- pada Akun PNBP 425161).', 72)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('HAK BERSIH PENYEDIA', 28, AlignmentType.LEFT),
            makeDataCell('Rp 137.943.432,- (Netto setelah dipotong denda keterlambatan Rp 56.568,- sebelum pemotongan PPN & PPh)', 72, true, AlignmentType.LEFT, '0F172A')
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('REKENING PENERIMA', 28, AlignmentType.LEFT),
            makeDataCell('Bank BRI Cabang Ngawi No. Rek: 0058-01-002481-30-8 a.n. CV. GRAFIKA PRATAMA NGAWI', 72, true)
          ]
        })
      ]
    }),

    p('', { before: 10, after: 10 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({ text: '' })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 20, after: 0 },
                  children: [new TextRun({ text: 'Ngawi, 11 Juni 2026', font: 'Cambria', size: 18 })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 10 },
                  children: [new TextRun({ text: 'Yang Menerima Pembayaran,', font: 'Cambria', size: 18 })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 30 },
                  children: [new TextRun({ text: 'CV. GRAFIKA PRATAMA NGAWI', bold: true, font: 'Cambria', size: 19, color: '1E3A8A' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                  children: [new TextRun({ text: '[ Meterai Rp 10.000,- ]', font: 'Cambria', size: 15, color: '64748B' })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: 'BAMBANG SUDARMANTO', bold: true, underline: {}, font: 'Cambria', size: 19 })]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [new TextRun({ text: 'Direktur', font: 'Cambria', size: 17, color: '475569' })]
                })
              ]
            })
          ]
        })
      ]
    })
  ];
}


// =============================================================================
// 2. DOKUMEN 02: BERITA ACARA PEMBAYARAN (BAP) & RESUME PENGUJIAN PPK
// =============================================================================

// 2A. Halaman 1: Komparisi, Konsiderans, Dasar Pembayaran, & Verifikasi Prestasi
function buildDoc2Page1Children() {
  return [
    buildKopKpuResmi(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 20 },
      children: [
        new TextRun({
          text: 'BERITA ACARA PEMBAYARAN (BAP)',
          bold: true,
          size: 23,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: 'NOMOR: 016/BAP/PBJ-2026-001/PPK/VI/2026',
          bold: true,
          size: 18,
          font: 'Cambria',
          color: '1E3A8A'
        })
      ]
    }),

    p('Pada hari ini, Kamis tanggal Sebelas bulan Juni tahun Dua Ribu Dua Puluh Enam (11-06-2026), bertempat di Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jalan Untung Suropati Nomor 48 Ngawi, kami yang bertanda tangan di bawah ini:', { size: 19, before: 10, after: 15, line: 230 }),
    pNum('1.', 'MOHAMMAD NOOR JIHAN, Jabatan Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi Tahun Anggaran 2026 berdasarkan Keputusan Kuasa Pengguna Anggaran KPU Kabupaten Ngawi Nomor: SK-02/KPA/KPU-NGW/I/2026, bertindak untuk dan atas nama Kuasa Pengguna Anggaran KPU Kabupaten Ngawi, berkedudukan di Jl. Untung Suropati No. 48 Ngawi, selanjutnya disebut sebagai PIHAK KESATU.', { size: 18.5, before: 6, after: 10 }),
    pNum('2.', 'BAMBANG SUDARMANTO, Jabatan Direktur CV. GRAFIKA PRATAMA NGAWI, bertindak untuk dan atas nama CV. GRAFIKA PRATAMA NGAWI berdasarkan Akta Pendirian Nomor 12 tanggal 14 Agustus 2018, berkedudukan di Jl. PB. Sudirman No. 88 Ngawi, selanjutnya disebut sebagai PIHAK KEDUA.', { size: 18.5, before: 6, after: 15 }),

    p('Kedua belah pihak secara bersama-sama menerangkan dan menyepakati hal-hal sebagai berikut:', { size: 19, before: 10, after: 15 }),

    pBab('PASAL 1: DASAR PEMBAYARAN & KELENGKAPAN DOKUMEN', { size: 19, before: 15, after: 10 }),
    pNum('1.', 'Surat Pesanan (Kontrak E-Purchasing) Nomor: 013/SP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026 tanggal 27 Mei 2026;', { size: 18, before: 5, after: 8 }),
    pNum('2.', 'Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP) Nomor: 016/BAPHP/PBJ-2026-001/PPK/VI/2026 tanggal 10 Juni 2026 dengan kesimpulan barang diterima lengkap 100% memenuhi spesifikasi teknis;', { size: 18, before: 5, after: 8 }),
    pNum('3.', 'Berita Acara Serah Terima Pertama Pekerjaan (BAST) Nomor: 016/BAST/PBJ-2026-001/PPK/VI/2026 tanggal 10 Juni 2026; dan', { size: 18, before: 5, after: 8 }),
    pNum('4.', 'Surat Permohonan Pembayaran dari PIHAK KEDUA Nomor: 042/GP-NGW/TAG-PBJ/VI/2026 tanggal 11 Juni 2026.', { size: 18, before: 5, after: 15 }),

    pBab('PASAL 2: VERIFIKASI PRESTASI PEKERJAAN & PENGENAAN SANKSI DENDA', { size: 19, before: 15, after: 10 }),
    pNum('1.', 'Prestasi fisik pekerjaan pengadaan telah diselesaikan 100% (seratus persen) dalam kondisi baik, lengkap, dan berfungsi normal sesuai spesifikasi teknis kontrak.', { size: 18, before: 5, after: 8 }),
    pNum('2.', 'Sebanyak 3 (tiga) unit PC Workstation diserahkan tepat waktu pada tanggal 09 Juni 2026 dan berfungsi penuh secara mandiri (dibuktikan dengan STTBS No. 016/STTBS/PBJ-2026-001/PPK/VI/2026 tanggal 09 Juni 2026).', { size: 18, before: 5, after: 8 }),
    pNum('3.', 'Sebanyak 1 (satu) unit PC Server diserahkan pada tanggal 10 Juni 2026 (terlambat 1 hari kalender dari batas akhir masa kontrak tanggal 09 Juni 2026).', { size: 18, before: 5, after: 8 }),
    pNum('4.', 'Sesuai ketentuan Pasal 79 ayat (4) huruf b Perpres No. 12/2021 dan SSKK Surat Pesanan, terhadap keterlambatan penyerahan 1 unit PC Server tersebut dikenakan sanksi denda keterlambatan bagian kontrak sebesar 1‰ per hari dari DPP bagian pekerjaan yang terlambat (1/1.000 × Rp 56.567.568,- × 1 hari = Rp 56.568,-) untuk disetorkan langsung ke Kas Negara pada Akun PNBP 425161.', { size: 18, before: 5, after: 15 })
  ];
}

// 2B. Halaman 2: Tabel Rekonsiliasi Keuangan, Rekening, Penutup, & Blok Tanda Tangan
function buildDoc2Page2Children() {
  return [
    pBab('PASAL 3: REKONSILIASI PERHITUNGAN PEMBAYARAN & POTONGAN RESMI', { size: 19, before: 10, after: 10 }),
    p('PIHAK KESATU dan PIHAK KEDUA menyepakati rekonsiliasi perhitungan pembayaran tagihan belanja modal pengadaan dengan rincian perhitungan matematis sebagai berikut:', { size: 18.5, before: 5, after: 15, line: 230 }),

    new Table({
      borders: BORDER_TABLE_SOLID,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeHeaderCell('NO', 6),
            makeHeaderCell('URAIAN KOMPONEN KEUANGAN', 40),
            makeHeaderCell('DASAR REKONSILIASI / KLAUSUL', 26),
            makeHeaderCell('JUMLAH (RP)', 28, AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('1', 6, true, AlignmentType.CENTER),
            makeDataCell('Nilai Kontrak Bruto (100% Selesai)', 40, true),
            makeDataCell('Surat Pesanan No. 013/SP/...', 26),
            makeDataCell('Rp 138.000.000,-', 28, true, AlignmentType.RIGHT, '1E3A8A')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('2', 6, false, AlignmentType.CENTER),
            makeDataCell('Dasar Pengenaan Pajak (DPP)', 40),
            makeDataCell('100 / 111 × Nilai Bruto', 26),
            makeDataCell('Rp 124.324.324,-', 28, false, AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('3', 6, false, AlignmentType.CENTER),
            makeDataCell('DPP Bagian Terlambat (PC Server)', 40),
            makeDataCell('1 Unit PC Server Tower Dell T350', 26),
            makeDataCell('Rp 56.567.568,-', 28, false, AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('4', 6, true, AlignmentType.CENTER),
            makeDataCell('Potongan Denda Keterlambatan (1 Hari)', 40, true, AlignmentType.LEFT, 'B91C1C'),
            makeDataCell('1‰ × 1 hari × DPP Server (Akun PNBP 425161)', 26, true, AlignmentType.LEFT, 'B91C1C'),
            makeDataCell('- Rp 56.568,-', 28, true, AlignmentType.RIGHT, 'B91C1C')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('5', 6, true, AlignmentType.CENTER),
            makeDataCell('HAK PEMBAYARAN NETTO SEBELUM PAJAK', 40, true, AlignmentType.LEFT, '0F172A'),
            makeDataCell('Bruto Kontrak - Denda Keterlambatan', 26, true),
            makeDataCell('Rp 137.943.432,-', 28, true, AlignmentType.RIGHT, '0F172A')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('6', 6, false, AlignmentType.CENTER),
            makeDataCell('Potongan PPN Dalam Negeri (11%)', 40, false, AlignmentType.LEFT, 'B91C1C'),
            makeDataCell('Dipungut KPPN / WAPU (Akun 411211)', 26),
            makeDataCell('- Rp 13.675.676,-', 28, false, AlignmentType.RIGHT, 'B91C1C')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('7', 6, false, AlignmentType.CENTER),
            makeDataCell('Potongan PPh Pasal 22 (1,5%)', 40, false, AlignmentType.LEFT, 'B91C1C'),
            makeDataCell('Dipungut KPPN / WAPU (Akun 411122)', 26),
            makeDataCell('- Rp 1.864.865,-', 28, false, AlignmentType.RIGHT, 'B91C1C')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('8', 6, true, AlignmentType.CENTER),
            makeDataCell('TOTAL POTONGAN RESMI SPM', 40, true, AlignmentType.LEFT, 'B91C1C'),
            makeDataCell('Denda Keterlambatan + PPN + PPh 22', 26, true, AlignmentType.LEFT, 'B91C1C'),
            makeDataCell('- Rp 15.597.109,-', 28, true, AlignmentType.RIGHT, 'B91C1C')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('9', 6, true, AlignmentType.CENTER),
            makeDataCell('JUMLAH NETTO KAS DITERIMA PENYEDIA (SP2D)', 40, true, AlignmentType.LEFT, '15803D'),
            makeDataCell('Hak Bersih Ditransfer ke Rekening Penyedia', 26, true, AlignmentType.LEFT, '15803D'),
            makeDataCell('Rp 122.402.891,-', 28, true, AlignmentType.RIGHT, '15803D')
          ]
        })
      ]
    }),

    p('Terbilang Netto SP2D: "Seratus Dua Puluh Dua Juta Empat Ratus Dua Ribu Delapan Ratus Sembilan Puluh Satu Rupiah".', { italic: true, size: 17, color: '1E3A8A', before: 8, after: 12 }),

    pBab('PASAL 4: TATA CARA & REKENING PEMBAYARAN', { size: 19, before: 12, after: 8 }),
    p('Pembayaran hak tagihan netto dibayarkan melalui penerbitan SPM-LS KPPN Madiun yang langsung ditransfer ke rekening operasional PIHAK KEDUA pada Bank BRI Cabang Ngawi Nomor Rekening: 0058-01-002481-30-8 atas nama CV. GRAFIKA PRATAMA NGAWI.', { size: 18, before: 4, after: 12, line: 230 }),

    pBab('PASAL 5: PENUTUP', { size: 19, before: 12, after: 8 }),
    p('Demikian Berita Acara Pembayaran ini dibuat dan ditandatangani oleh kedua belah pihak dalam rangkap 3 (tiga) bermeterai cukup untuk dipergunakan sebagaimana mestinya.', { size: 18, before: 4, after: 20 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PIHAK KEDUA,', font: 'Cambria', size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CV. GRAFIKA PRATAMA NGAWI', bold: true, font: 'Cambria', size: 19, color: '1E3A8A' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 15, after: 50 }, children: [new TextRun({ text: '[ Meterai Rp 10.000,- ]', font: 'Cambria', size: 15, color: '64748B' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BAMBANG SUDARMANTO', bold: true, underline: {}, font: 'Cambria', size: 19 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Direktur', font: 'Cambria', size: 17, color: '475569' })] })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'PIHAK KESATU,', font: 'Cambria', size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 75 }, children: [new TextRun({ text: 'PEJABAT PEMBUAT KOMITMEN', bold: true, font: 'Cambria', size: 19, color: '1E3A8A' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MOHAMMAD NOOR JIHAN', bold: true, underline: {}, font: 'Cambria', size: 19 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIP. 19840101 200912 1 001', font: 'Cambria', size: 17, color: '475569' })] })
              ]
            })
          ]
        })
      ]
    })
  ];
}


// =============================================================================
// 3. DOKUMEN 03: BAST PPK KE KPA & NOTA DINAS PELIMPAHAN BMN
// =============================================================================

// 3A. Halaman 1: BAST PPK ke KPA (Komparisi, Konsiderans, & Pasal 1)
function buildDoc3BastPage1Children() {
  return [
    buildKopKpuResmi(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 20 },
      children: [
        new TextRun({
          text: 'BERITA ACARA SERAH TERIMA HASIL PENGADAAN',
          bold: true,
          size: 23,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 20 },
      children: [
        new TextRun({
          text: 'DARI PEJABAT PEMBUAT KOMITMEN KEPADA KUASA PENGGUNA ANGGARAN',
          bold: true,
          size: 19,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: 'NOMOR: 017/BAST-KPA/PBJ-2026-001/PPK/VI/2026',
          bold: true,
          size: 18,
          font: 'Cambria',
          color: '1E3A8A'
        })
      ]
    }),

    p('Pada hari ini, Kamis tanggal Sebelas bulan Juni tahun Dua Ribu Dua Puluh Enam (11-06-2026), bertempat di Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jalan Untung Suropati Nomor 48 Ngawi, kami yang bertanda tangan di bawah ini:', { size: 19, before: 10, after: 15, line: 230 }),
    pNum('1.', 'MOHAMMAD NOOR JIHAN, Jabatan Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi Tahun Anggaran 2026, berdasarkan Keputusan KPA KPU Kabupaten Ngawi Nomor: SK-02/KPA/KPU-NGW/I/2026 tanggal 02 Januari 2026, bertindak untuk dan atas nama Kuasa Pengguna Anggaran KPU Kabupaten Ngawi, berkedudukan di Jl. Untung Suropati No. 48 Ngawi, selanjutnya disebut sebagai PIHAK KESATU.', { size: 18.5, before: 6, after: 10 }),
    pNum('2.', 'BUDI RAHAYU, NIP. 19830503 200902 1 002, Pangkat/Golongan: Pembina (IV/a), Jabatan Kuasa Pengguna Anggaran (KPA) / Sekretaris KPU Kabupaten Ngawi, bertindak untuk dan atas nama Satuan Kerja KPU Kabupaten Ngawi (Kode Satker: 657811), berkedudukan di Jl. Untung Suropati No. 48 Ngawi, selanjutnya disebut sebagai PIHAK KEDUA.', { size: 18.5, before: 6, after: 15 }),

    p('Mengingat ketentuan Pasal 57 Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah sebagaimana telah diubah dengan Peraturan Presiden Nomor 12 Tahun 2021 dan Peraturan Presiden Nomor 46 Tahun 2025, serta Peraturan Menteri Keuangan Nomor 181/PMK.05/2022 tentang Tata Cara Pelaksanaan Sistem Akuntansi dan Pelaporan Keuangan Instansi berbasis Elektronik, kedua belah pihak menyatakan sepakat:', { size: 19, before: 10, after: 15, line: 230 }),

    pBab('PASAL 1: PENYERAHAN HASIL PEKERJAAN PENGADAAN', { size: 19, before: 15, after: 10 }),
    p('PIHAK KESATU menyerahkan kepada PIHAK KEDUA, dan PIHAK KEDUA menerima penyerahan hasil pengadaan barang berupa Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi TA 2026 (MAK 532111) yang dilaksanakan oleh CV. GRAFIKA PRATAMA NGAWI berdasarkan Surat Pesanan Nomor: 013/SP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026 tanggal 27 Mei 2026 dan telah diserahterimakan secara sah melalui BAST Nomor: 016/BAST/PBJ-2026-001/PPK/VI/2026 tanggal 10 Juni 2026.', { size: 18.5, before: 5, after: 15, line: 230 })
  ];
}

// 3B. Halaman 2: BAST PPK ke KPA (Tabel Aset BMN, Pasal 3, Penutup, & Blok Tanda Tangan)
function buildDoc3BastPage2Children() {
  return [
    pBab('PASAL 2: RINCIAN ASET BARANG MILIK NEGARA (BMN) YANG DISERAHKAN', { size: 19, before: 10, after: 10 }),
    p('Adapun rincian barang hasil pengadaan yang diserahkan untuk dicatat dalam Penatausahaan BMN Satuan Kerja KPU Kabupaten Ngawi adalah sebagai berikut:', { size: 18.5, before: 5, after: 15, line: 230 }),

    new Table({
      borders: BORDER_TABLE_SOLID,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeHeaderCell('NO', 6),
            makeHeaderCell('URAIAN NAMA BARANG / SPESIFIKASI', 36),
            makeHeaderCell('VOL', 8),
            makeHeaderCell('SAT', 8),
            makeHeaderCell('HARGA SATUAN (RP)', 20, AlignmentType.RIGHT),
            makeHeaderCell('TOTAL HARGA (RP)', 22, AlignmentType.RIGHT)
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('1', 6, true, AlignmentType.CENTER),
            makeDataCell('PC Server Tower Database Operasional SIDALIH & Logistik\nMerk: Dell PowerEdge T350, Dual Intel Xeon Silver, 64GB DDR4 ECC, 2x 1.92TB NVMe RAID-1, Dual PSU Redundant, Win Server 2025 Std', 36),
            makeDataCell('1', 8, false, AlignmentType.CENTER),
            makeDataCell('Unit', 8, false, AlignmentType.CENTER),
            makeDataCell('Rp 62.790.000,-', 20, false, AlignmentType.RIGHT),
            makeDataCell('Rp 62.790.000,-', 22, true, AlignmentType.RIGHT, '1E3A8A')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('2', 6, true, AlignmentType.CENTER),
            makeDataCell('PC Workstation Operasional Pengolah Data SIDALIH\nMerk: Dell OptiPlex Tower Plus 7020, Intel Core i7-14700, 32GB DDR5, 1TB NVMe Gen4, LED 24" FHD, Win 11 Pro, UPS 1200VA', 36),
            makeDataCell('3', 8, false, AlignmentType.CENTER),
            makeDataCell('Unit', 8, false, AlignmentType.CENTER),
            makeDataCell('Rp 25.070.000,-', 20, false, AlignmentType.RIGHT),
            makeDataCell('Rp 75.210.000,-', 22, true, AlignmentType.RIGHT, '1E3A8A')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('TOTAL', 58, true, AlignmentType.CENTER),
            makeDataCell('', 0, false),
            makeDataCell('', 0, false),
            makeDataCell('4 Unit', 0, true, AlignmentType.CENTER),
            makeDataCell('Total Nilai BMN:', 20, true, AlignmentType.RIGHT),
            makeDataCell('Rp 138.000.000,-', 22, true, AlignmentType.RIGHT, '0F172A')
          ]
        })
      ]
    }),

    p('Terbilang Total Nilai Aset BMN: "Seratus Tiga Puluh Delapan Juta Rupiah (Termasuk PPN 11%)".', { italic: true, size: 17, color: '1E3A8A', before: 8, after: 12 }),

    pBab('PASAL 3: PENYERAHAN DOKUMEN PENDUKUNG & PENGALIHAN TANGGUNG JAWAB', { size: 19, before: 12, after: 8 }),
    pNum('1.', 'Bersamaan dengan penyerahan barang sebagaimana dimaksud pada Pasal 2, PIHAK KESATU menyerahkan kepada PIHAK KEDUA seluruh dokumen pendukung berupa buku manual pengoperasian (manual book), CD master driver perangkat, dan Sertifikat Garansi Resmi ATPM selama 365 (tiga ratus enam puluh lima) hari kalender terhitung sejak tanggal serah terima sampai dengan tanggal 10 Juni 2027.', { size: 18, before: 5, after: 8 }),
    pNum('2.', 'Dengan ditandatanganinya Berita Acara ini, maka hak, penguasaan fisik, pemeliharaan, serta pemanfaatan barang hasil pengadaan beralih sepenuhnya dari PIHAK KESATU (PPK) kepada PIHAK KEDUA (KPA/KPB) untuk dipergunakan dalam rangka menunjang kelancaran tugas pokok dan fungsi operasional Satuan Kerja KPU Kabupaten Ngawi.', { size: 18, before: 5, after: 15 }),

    p('Demikian Berita Acara Serah Terima PPK kepada KPA ini dibuat dan ditandatangani dengan sebenarnya untuk dipergunakan sebagaimana mestinya.', { size: 18, before: 10, after: 20 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Yang Menyerahkan,', font: 'Cambria', size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: 'PEJABAT PEMBUAT KOMITMEN', bold: true, font: 'Cambria', size: 19, color: '1E3A8A' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MOHAMMAD NOOR JIHAN', bold: true, underline: {}, font: 'Cambria', size: 19 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIP. 19840101 200912 1 001', font: 'Cambria', size: 17, color: '475569' })] })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Yang Menerima,', font: 'Cambria', size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [new TextRun({ text: 'KUASA PENGGUNA ANGGARAN', bold: true, font: 'Cambria', size: 19, color: '1E3A8A' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BUDI RAHAYU', bold: true, underline: {}, font: 'Cambria', size: 19 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIP. 19830503 200902 1 002', font: 'Cambria', size: 17, color: '475569' })] })
              ]
            })
          ]
        })
      ]
    })
  ];
}

// 3C. Halaman 3: NOTA DINAS KPA KEPADA KASUBBAG KUL (Pas 1 Halaman)
function buildDoc3NotaDinasChildren() {
  return [
    buildKopNotaDinas(),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 15, left: 0, right: 0 }, children: [p('Yth.', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 86, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 15, left: 0, right: 0 }, children: [p(': Kepala Subbagian Keuangan, Umum dan Logistik KPU Kabupaten Ngawi', { size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 15, left: 0, right: 0 }, children: [p('Dari', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 86, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 15, left: 0, right: 0 }, children: [p(': Kuasa Pengguna Anggaran (KPA) / Kuasa Pengguna Barang (KPB)', { size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 15, left: 0, right: 0 }, children: [p('Tanggal', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 86, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 15, left: 0, right: 0 }, children: [p(': 11 Juni 2026', { size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 15, left: 0, right: 0 }, children: [p('Sifat', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 86, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 15, left: 0, right: 0 }, children: [p(': Segera / Penting', { size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 15, left: 0, right: 0 }, children: [p('Lampiran', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 86, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 15, left: 0, right: 0 }, children: [p(': 1 (Satu) Berkas Salinan BAST PPK ke KPA', { size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 30, left: 0, right: 0 }, children: [p('Perihal', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 86, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, margins: { top: 0, bottom: 30, left: 0, right: 0 }, children: [p('Pelimpahan Pengelolaan, Pendistribusian, dan Penatausahaan BMN Hasil Pengadaan TA 2026', { bold: true, size: 18, color: '0F172A' })] })
          ]
        })
      ]
    }),

    pNum('1.', 'Dasar Pelaksanaan:', { boldNum: true, size: 18, before: 6, after: 4 }),
    pSubNum('a.', 'Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah jo. Perpres Nomor 12 Tahun 2021 dan Perpres Nomor 46 Tahun 2025;', { size: 17.5, before: 2, after: 4 }),
    pSubNum('b.', 'Peraturan Menteri Keuangan Nomor 181/PMK.05/2016 jo. PMK Nomor 181/PMK.05/2022 tentang Tata Cara Pelaksanaan Sistem Akuntansi dan Pelaporan Keuangan Instansi Berbasis Akrual; dan', { size: 17.5, before: 2, after: 4 }),
    pSubNum('c.', 'Berita Acara Serah Terima Hasil Pengadaan dari PPK kepada KPA Nomor: 017/BAST-KPA/PBJ-2026-001/PPK/VI/2026 tanggal 11 Juni 2026.', { size: 17.5, before: 2, after: 8 }),

    pNum('2.', 'Sehubungan dengan telah diselesaikannya serah terima hasil pengadaan paket Pengadaan Perangkat Pengolah Data dan PC Server Operasional (MAK 532111) dari Pejabat Pembuat Komitmen (PPK) kepada Kuasa Pengguna Anggaran (KPA), bersama ini dilimpahkan aset Barang Milik Negara (BMN) berupa:', { boldNum: true, size: 18, before: 6, after: 4 }),
    pSubNum('a.', '1 (satu) Unit PC Server Tower Dell PowerEdge T350 (Nilai Kapitalisasi BMN: Rp 62.790.000,-); dan', { size: 17.5, before: 2, after: 4 }),
    pSubNum('b.', '3 (tiga) Unit PC Workstation Dell OptiPlex Tower Plus 7020 (Nilai Kapitalisasi BMN: Rp 75.210.000,-),', { size: 17.5, before: 2, after: 4 }),
    pContinuation('dengan Total Nilai Perolehan Aset BMN sebesar Rp 138.000.000,- (Seratus Tiga Puluh Delapan Juta Rupiah) termasuk PPN 11%, dalam kondisi baru, baik, lengkap, dan berfungsi normal.', { level: 2, size: 17.5, before: 2, after: 8 }),

    pNum('3.', 'Berkenaan dengan hal tersebut di atas, diinstruksikan kepada Kepala Subbagian Keuangan, Umum dan Logistik untuk:', { boldNum: true, size: 18, before: 6, after: 4 }),
    pSubNum('a.', 'Menerima penguasaan fisik barang di gudang/ruang kerja dan memeriksa kelengkapan master driver serta sertifikat garansi resmi ATPM selama 365 hari kalender s.d. 10 Juni 2027;', { size: 17.5, before: 2, after: 4 }),
    pSubNum('b.', 'Menugaskan Pengurus Barang / Operator SAKTI Modul Aset Tetap untuk mencatat transaksi perolehan BMN pada Aplikasi SAKTI guna penerbitan Nomor Urut Pendaftaran (NUP) dan pencetakan Label Barcode BMN; dan', { size: 17.5, before: 2, after: 4 }),
    pSubNum('c.', 'Mendistribusikan perangkat tersebut ke unit pengguna akhir (Subbagian Rendatin) untuk operasional SIDALIH dan Logistik Pemilu, serta menerbitkan Berita Acara Pendistribusian Internal dan Daftar Barang Ruangan (DBR).', { size: 17.5, before: 2, after: 8 }),

    pNum('4.', 'Demikian Nota Dinas ini disampaikan untuk dipedomani dan dilaksanakan sebagaimana mestinya dengan penuh tanggung jawab.', { boldNum: true, size: 18, before: 6, after: 15 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                p('Tembusan Yth.:', { bold: true, size: 17, before: 0, after: 4 }),
                p('1. Pejabat Pembuat Komitmen (PPK);', { size: 16.5, before: 0, after: 3 }),
                p('2. Pengurus Barang Pengguna KPU Kab. Ngawi.', { size: 16.5, before: 0, after: 0 })
              ]
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'KUASA PENGGUNA ANGGARAN,', bold: true, font: 'Cambria', size: 18, color: '1E3A8A' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 75 }, children: [new TextRun({ text: 'KPU KABUPATEN NGAWI', bold: true, font: 'Cambria', size: 17 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BUDI RAHAYU', bold: true, underline: {}, font: 'Cambria', size: 19 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIP. 19830503 200902 1 002', font: 'Cambria', size: 17, color: '475569' })] })
              ]
            })
          ]
        })
      ]
    })
  ];
}


// =============================================================================
// 4. DOKUMEN 04: SPP-LS & LEMBAR PENGUJIAN TAGIHAN PPSPM
// =============================================================================

// 4A. Halaman 1: Formulir Resmi SPP-LS APBN SAKTI (Pas 1 Halaman)
function buildDoc4SppPage1Children() {
  return [
    buildKopSppApbn(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 120 },
      children: [
        new TextRun({
          text: 'NOMOR SPP: 00045/SPP-LS/657811/2026 | TANGGAL: 12 JUNI 2026',
          bold: true,
          size: 18,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),

    new Table({
      borders: BORDER_TABLE_SOLID,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeHeaderCell('KEMENTERIAN / LEMBAGA', 30, AlignmentType.LEFT),
            makeDataCell('076 — KOMISI PEMILIHAN UMUM', 70, true)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('UNIT ORGANISASI / SATKER', 30, AlignmentType.LEFT),
            makeDataCell('01 — KPU PROVINSI / KPU KABUPATEN/KOTA | 657811 — KPU KABUPATEN NGAWI', 70)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('PROGRAM / KEGIATAN', 30, AlignmentType.LEFT),
            makeDataCell('076.01.GG (Program Pengawasan & Penyelenggaraan Pemilu) / 4323 (Dukungan Manajemen KPU)', 70)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('KRO / RO / KOMPONEN', 30, AlignmentType.LEFT),
            makeDataCell('4323.EBA (Layanan Perkantoran) / 002 (Operasional dan Pemeliharaan Kantor)', 70)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('KODE AKUN BELANJA (MAK)', 30, AlignmentType.LEFT),
            makeDataCell('532111 — Belanja Modal Peralatan dan Mesin', 70, true, AlignmentType.LEFT, '1E3A8A')
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('PAGU DIPA / REALISASI / SISA', 30, AlignmentType.LEFT),
            makeDataCell('Pagu DIPA: Rp 145.000.000,- | Realisasi SPP: Rp 138.000.000,- | Sisa Pagu: Rp 7.000.000,-', 70, true)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('DASAR PEMBAYARAN', 30, AlignmentType.LEFT),
            makeDataCell('Surat Pesanan No. 013/SP/PBJ-2026-001 tgl 27-05-2026, BAPHP No. 016/BAPHP tgl 10-06-2026, BAST No. 016/BAST tgl 10-06-2026, BAP No. 016/BAP tgl 11-06-2026', 70)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('NAMA PENERIMA / BANK', 30, AlignmentType.LEFT),
            makeDataCell('CV. GRAFIKA PRATAMA NGAWI (NPWP: 01.445.882.9-646.000)\nBank BRI Cabang Ngawi — No. Rekening: 0058-01-002481-30-8', 70, true)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('JUMLAH BRUTO TAGIHAN', 30, AlignmentType.LEFT),
            makeDataCell('Rp 138.000.000,- (Seratus Tiga Puluh Delapan Juta Rupiah)', 70, true, AlignmentType.LEFT, '1E3A8A')
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('POTONGAN RESMI SPM', 30, AlignmentType.LEFT),
            makeDataCell('1. Akun PNBP 425161 (Denda Keterlambatan 1 Hari) : Rp 56.568,-\n2. Akun Pajak 411122 (PPh Pasal 22 1,5%) : Rp 1.864.865,-\n3. Akun Pajak 411211 (PPN Dalam Negeri 11%) : Rp 13.675.676,-\nTOTAL POTONGAN RESMI: Rp 15.597.109,-', 70, false, AlignmentType.LEFT, 'B91C1C')
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('JUMLAH NETTO SP2D', 30, AlignmentType.LEFT),
            makeDataCell('Rp 122.402.891,- (Seratus Dua Puluh Dua Juta Empat Ratus Dua Ribu Delapan Ratus Sembilan Puluh Satu Rupiah)', 70, true, AlignmentType.LEFT, '15803D')
          ]
        })
      ]
    }),

    p('', { before: 10, after: 10 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 55, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [p('')]
            }),
            new TableCell({
              width: { size: 45, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Ngawi, 12 Juni 2026', font: 'Cambria', size: 18 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 75 }, children: [new TextRun({ text: 'PEJABAT PEMBUAT KOMITMEN', bold: true, font: 'Cambria', size: 19, color: '1E3A8A' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MOHAMMAD NOOR JIHAN', bold: true, underline: {}, font: 'Cambria', size: 19 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIP. 19840101 200912 1 001', font: 'Cambria', size: 17, color: '475569' })] })
              ]
            })
          ]
        })
      ]
    })
  ];
}

// 4B. Halaman 2: Lembar Pengujian Tagihan oleh PPSPM (Pas 1 Halaman)
function buildDoc4PengujianPage2Children() {
  return [
    buildKopKpuResmi(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 20 },
      children: [
        new TextRun({
          text: 'LEMBAR HASIL PENGUJIAN DOKUMEN PEMBAYARAN OLEH PPSPM',
          bold: true,
          size: 22,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text: 'MENGUJI BERKAS SPP-LS NOMOR: 00045/SPP-LS/657811/2026 TANGGAL 12 JUNI 2026',
          bold: true,
          size: 17.5,
          font: 'Cambria',
          color: '1E3A8A'
        })
      ]
    }),

    p('Pejabat Penandatangan Surat Perintah Membayar (PPSPM) Satker KPU Kabupaten Ngawi telah melakukan pengujian terhadap kelengkapan dan keabsahan berkas tagihan SPP-LS Nomor: 00045/SPP-LS/657811/2026 berdasarkan PMK Nomor 210/PMK.05/2019 jo. PMK Nomor 62 Tahun 2023 dengan hasil sebagai berikut:', { size: 17.5, before: 5, after: 10, line: 220 }),

    new Table({
      borders: BORDER_TABLE_SOLID,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            makeHeaderCell('NO', 6),
            makeHeaderCell('ASPEK & DOKUMEN PENGUJIAN TAGIHAN', 58),
            makeHeaderCell('STANDAR UJI', 18),
            makeHeaderCell('HASIL', 18, AlignmentType.CENTER)
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('1', 6, true, AlignmentType.CENTER),
            makeDataCell('Kesesuaian Pagu DIPA No. DIPA-076.01.2.657811/2026 tgl 01-12-2025 MAK 532111 (Pagu Rp 145.000.000,- | Realisasi SPP Rp 138.000.000,- | Sisa Pagu Rp 7.000.000,-)', 58),
            makeDataCell('PMK 62/2023', 18),
            makeDataCell('MEMENUHI', 18, true, AlignmentType.CENTER, '15803D')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('2', 6, true, AlignmentType.CENTER),
            makeDataCell('Keabsahan Surat Pesanan No. 013/SP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026 tgl 27-05-2026 (Rp 138.000.000,-) & BAST No. 016/BAST/PBJ-2026-001/PPK/VI/2026 tgl 10-06-2026', 58),
            makeDataCell('Perpres 12/2021', 18),
            makeDataCell('MEMENUHI', 18, true, AlignmentType.CENTER, '15803D')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('3', 6, true, AlignmentType.CENTER),
            makeDataCell('Keabsahan BAPHP No. 016/BAPHP/PBJ-2026-001/PPK/VI/2026 tgl 10-06-2026 & BA Uji Komisioning 24 Jam (4 Unit PC Lulus Uji 100%)', 58),
            makeDataCell('Perlem LKPP 3/2026', 18),
            makeDataCell('MEMENUHI', 18, true, AlignmentType.CENTER, '15803D')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('4', 6, true, AlignmentType.CENTER),
            makeDataCell('Akurasi Pemotongan Denda Keterlambatan 1 Hari Server Dell T350 (DPP Rp 56.567.568,-): 1‰ = Rp 56.568,- disetor ke Kas Negara Akun PNBP 425161', 58),
            makeDataCell('PER-5/PB/2022', 18),
            makeDataCell('MEMENUHI', 18, true, AlignmentType.CENTER, '15803D')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('5', 6, true, AlignmentType.CENTER),
            makeDataCell('e-Faktur Pajak No. 010.000-26.00000001 tgl 11-06-2026: PPN 11% Rp 13.675.676,- (Akun 411211) & Bukti Potong PPh 22 1,5% Rp 1.864.865,- (Akun 411122)', 58),
            makeDataCell('UU HPP', 18),
            makeDataCell('MEMENUHI', 18, true, AlignmentType.CENTER, '15803D')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('6', 6, true, AlignmentType.CENTER),
            makeDataCell('Kuitansi Tagihan No. 016/KUIT/PBJ-2026-001/PPK/VI/2026 tgl 11-06-2026 bermeterai Rp 10.000,- & Kesesuaian Rek. Bank BRI Ngawi 0058-01-002481-30-8 a.n. CV. GRAFIKA PRATAMA NGAWI', 58),
            makeDataCell('PMK 210/2019', 18),
            makeDataCell('MEMENUHI', 18, true, AlignmentType.CENTER, '15803D')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('7', 6, true, AlignmentType.CENTER),
            makeDataCell('Sertifikat Garansi Resmi Dell Service Tag No. DLL-PWR-T350-NGW-2026 selama 365 Hari Kalender s.d. 10-06-2027 (Klausul Bebas Retensi 5%)', 58),
            makeDataCell('SSKK Kontrak', 18),
            makeDataCell('MEMENUHI', 18, true, AlignmentType.CENTER, '15803D')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('8', 6, true, AlignmentType.CENTER),
            makeDataCell('Berita Acara Serah Terima PPK ke KPA No. 017/BAST-KPA/PBJ-2026-001/PPK/VI/2026 tgl 11-06-2026 (Serah Terima 4 Unit Aset BMN Rp 138.000.000,-)', 58),
            makeDataCell('Perpres 16/2018', 18),
            makeDataCell('MEMENUHI', 18, true, AlignmentType.CENTER, '15803D')
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('9', 6, true, AlignmentType.CENTER),
            makeDataCell('Perekaman Riwayat BAST pada Aplikasi SAKTI Modul Komitmen (ID Kontrak KTR-2026-657811-001) dan Modul Aset Tetap/BMN guna Penerbitan NUP', 58),
            makeDataCell('PMK 181/2022', 18),
            makeDataCell('MEMENUHI', 18, true, AlignmentType.CENTER, '15803D')
          ]
        })
      ]
    }),

    p('KESIMPULAN PENGUJIAN: Seluruh persyaratan pengujian formal dan material dinyatakan LENGKAP DAN BENAR. Diterbitkan Surat Perintah Membayar Langsung (SPM-LS) Nomor: 00045/SPM-LS/657811/2026 tanggal 12 Juni 2026 untuk diajukan ke KPPN Madiun.', { bold: true, size: 17, color: '15803D', before: 8, after: 15, line: 220 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Yang Mengajukan SPP-LS,', font: 'Cambria', size: 17.5 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: 'PEJABAT PEMBUAT KOMITMEN', bold: true, font: 'Cambria', size: 18, color: '1E3A8A' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MOHAMMAD NOOR JIHAN', bold: true, underline: {}, font: 'Cambria', size: 18.5 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIP. 19840101 200912 1 001', font: 'Cambria', size: 16.5, color: '475569' })] })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Telah Diuji & Disetujui Penerbitan SPM-LS,', font: 'Cambria', size: 17.5 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 }, children: [new TextRun({ text: 'PEJABAT PENANDATANGAN SPM (PPSPM)', bold: true, font: 'Cambria', size: 18, color: '1E3A8A' })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NURFANTI SULISTYO  W', bold: true, underline: {}, font: 'Cambria', size: 18.5 })] }),
                new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'NIP. 198410122010122002', font: 'Cambria', size: 16.5, color: '475569' })] })
              ]
            })
          ]
        })
      ]
    })
  ];
}


// =============================================================================
// 0. DOKUMEN 00: BUNDEL LENGKAP DOKUMEN TAHAP 17 (COVER + 2 DOKUMEN SAH INTERNAL)
// =============================================================================

function buildCoverBundelChildren() {
  return [
    buildKopKpuResmi(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 40 },
      children: [
        new TextRun({
          text: 'BUNDEL DOKUMEN PENATAUSAHAAN BMN & PENGAJUAN SPP-LS',
          bold: true,
          size: 24,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 140 },
      children: [
        new TextRun({
          text: 'TAHAP 17: BAST PPK KE KPA, NOTA DINAS SAKTI BMN, & PENGAJUAN SPP-LS APBN',
          bold: true,
          size: 19,
          font: 'Cambria',
          color: '1E3A8A'
        })
      ]
    }),

    new Table({
      borders: BORDER_TABLE_SOLID,
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            makeHeaderCell('SATUAN KERJA', 32, AlignmentType.LEFT),
            makeDataCell('KOMISI PEMILIHAN UMUM KABUPATEN NGAWI (KODE: 657811)', 68, true)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('NAMA PAKET PENGADAAN', 32, AlignmentType.LEFT),
            makeDataCell('Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi', 68, true)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('KODE RUP / MAK DIPA', 32, AlignmentType.LEFT),
            makeDataCell('RUP: 58219401 | MAK: 532111 (Belanja Modal Peralatan dan Mesin)', 68)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('NILAI KONTRAK BRUTO', 32, AlignmentType.LEFT),
            makeDataCell('Rp 138.000.000,- (Termasuk PPN 11%)', 68, true, AlignmentType.LEFT, '1E3A8A')
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('TOTAL ASET BMN DISERAHKAN', 32, AlignmentType.LEFT),
            makeDataCell('Rp 138.000.000,- (1 Unit PC Server & 3 Unit PC Workstation Dell)', 68, true, AlignmentType.LEFT, '15803D')
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('NILAI PENCAIRAN BRUTO SPP-LS', 32, AlignmentType.LEFT),
            makeDataCell('Rp 138.000.000,- (Pagu Belanja Modal APBN TA 2026)', 68)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('SANKSI DENDA KETERLAMBATAN', 32, AlignmentType.LEFT),
            makeDataCell('Rp 56.568,- (1 Hari Kalender PC Server disetor ke Akun PNBP 425161)', 68, true, AlignmentType.LEFT, 'B91C1C')
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('NETTO TRANSFER KAS SP2D', 32, AlignmentType.LEFT),
            makeDataCell('Rp 122.402.891,- (Setelah Pajak PPN/PPh 22 & Denda)', 68, true, AlignmentType.LEFT, '15803D')
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('PENYEDIA PENERIMA PEMBAYARAN', 32, AlignmentType.LEFT),
            makeDataCell('CV. GRAFIKA PRATAMA NGAWI (Bank BRI: 0058-01-002481-30-8)', 68)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('PEJABAT PEMBUAT KOMITMEN', 32, AlignmentType.LEFT),
            makeDataCell('MOHAMMAD NOOR JIHAN (NIP. 19840101 200912 1 001)', 68, true)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('KUASA PENGGUNA ANGGARAN', 32, AlignmentType.LEFT),
            makeDataCell('BUDI RAHAYU (NIP. 19830503 200902 1 002)', 68, true)
          ]
        }),
        new TableRow({
          children: [
            makeHeaderCell('PEJABAT PENANDATANGAN SPM', 32, AlignmentType.LEFT),
            makeDataCell('NURFANTI SULISTYO  W (NIP. 198410122010122002)', 68, true)
          ]
        })
      ]
    }),

    p('', { before: 8, after: 8 }),
    pBab('DAFTAR ISI DOKUMEN BUNDEL TAHAP 17 (URUSAN INTERNAL SATKER):', { size: 19, before: 10, after: 8 }),
    pNum('1.', 'Dokumen 01: Berita Acara Serah Terima PPK kepada KPA No. 017/BAST-KPA/PBJ-2026-001/PPK/VI/2026 & Nota Dinas KPA Pelimpahan BMN No. 017/ND-KPA/PBJ-2026-001/VI/2026 (3 Halaman: Hal 1 BAST Narasi, Hal 2 Tabel Aset Rp 138jt & TTD, Hal 3 Nota Dinas KPA ke Kasubbag KUL).', { size: 18, before: 4, after: 6 }),
    pNum('2.', 'Dokumen 02: Surat Permintaan Pembayaran Langsung (SPP-LS) No. 00045/SPP-LS/657811/2026 & Lembar Hasil Pengujian Tagihan oleh PPSPM (2 Halaman: Hal 1 Formulir SPP-LS APBN SAKTI, Hal 2 Lembar Uji Tagihan PPSPM 9 Kriteria).', { size: 18, before: 4, after: 6 })
  ];
}


// =============================================================================

module.exports = {
  makeHeaderCell,
  makeDataCell,
  buildKopPenyedia,
  buildKopSppApbn,
  buildKopNotaDinas,
  buildDoc1PermohonanChildren,
  buildDoc1KuitansiChildren,
  buildDoc2Page1Children,
  buildDoc2Page2Children,
  buildDoc3BastPage1Children,
  buildDoc3BastPage2Children,
  buildDoc3NotaDinasChildren,
  buildDoc4SppPage1Children,
  buildDoc4PengujianPage2Children,
  buildCoverBundelChildren
};
