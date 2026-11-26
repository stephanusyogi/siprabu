/**
 * SI-PRABU — Modul Word Builders Khusus Tahap 18
 * "PENILAIAN KINERJA PENYEDIA OLEH PPK (SIKAP LKPP) & PENUTUPAN KONTRAK (CONTRACT CLOSE-OUT)"
 * Standar Tata Naskah Dinas Resmi KPU Kabupaten Ngawi (Layout Manual Professional)
 * Penasihat Teknis PBJ & Arsitek Sistem SI-PRABU (emenje)
 */

const {
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
  UnderlineType
} = require('docx');

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

// Helper Baris Identitas (Label - Titik Dua - Nilai) Tanpa Border
function makeLabelValRow(label, val, widthLabel = 32, widthVal = 68, isValBold = false) {
  return new TableRow({
    children: [
      new TableCell({
        borders: BORDER_NONE,
        width: { size: widthLabel, type: WidthType.PERCENTAGE },
        margins: { top: 35, bottom: 35, left: 20, right: 20 },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({ text: label, font: 'Cambria', size: 18, color: '334155' })
            ]
          })
        ]
      }),
      new TableCell({
        borders: BORDER_NONE,
        width: { size: 3, type: WidthType.PERCENTAGE },
        margins: { top: 35, bottom: 35, left: 20, right: 20 },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({ text: ':', font: 'Cambria', size: 18, bold: true, color: '334155' })
            ]
          })
        ]
      }),
      new TableCell({
        borders: BORDER_NONE,
        width: { size: widthVal - 3, type: WidthType.PERCENTAGE },
        margins: { top: 35, bottom: 35, left: 20, right: 20 },
        children: [
          new Paragraph({
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({ text: val, font: 'Cambria', size: 18, bold: isValBold, color: '0F172A' })
            ]
          })
        ]
      })
    ]
  });
}

// =============================================================================
// 1. COVER BUNDEL LENGKAP TAHAP 18
// =============================================================================
function buildCoverBundelTahap18Children(ctx) {
  const { paket, settings } = ctx || {};
  const namaPaket = paket?.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi';
  const kodePaket = paket?.kode_paket_internal || 'PBJ-2026-001';
  const tahunAnggaran = settings?.tahun_anggaran || '2026';

  return [
    new Paragraph({ spacing: { before: 400, after: 200 } }),
    buildKopKpuResmi(),
    new Paragraph({ spacing: { before: 300, after: 200 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
      children: [
        new TextRun({
          text: 'BUNDEL DOKUMEN RESMI TAHAP 18',
          bold: true,
          size: 26,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [
        new TextRun({
          text: 'PENILAIAN KINERJA PENYEDIA (SIKAP LKPP) OLEH PEJABAT PEMBUAT KOMITMEN',
          bold: true,
          size: 20,
          font: 'Cambria',
          color: '1E3A8A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 200 },
      children: [
        new TextRun({
          text: 'SATUAN KERJA KOMISI PEMILIHAN UMUM KABUPATEN NGAWI',
          bold: true,
          size: 22,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 300 },
      children: [
        new TextRun({
          text: 'TAHUN ANGGARAN ' + tahunAnggaran,
          bold: true,
          size: 20,
          font: 'Cambria',
          color: '475569'
        })
      ]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_TABLE_SOLID,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: BORDER_TABLE_SOLID,
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
              margins: { top: 160, bottom: 160, left: 180, right: 180 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 60 },
                  children: [
                    new TextRun({ text: 'INFORMASI PAKET PENGADAAN', bold: true, size: 18, font: 'Cambria', color: '1E3A8A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                  children: [
                    new TextRun({ text: namaPaket, bold: true, size: 20, font: 'Cambria', color: '0F172A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: `Kode Paket: ${kodePaket} | Nilai Kontrak: Rp 138.000.000,-`, font: 'Cambria', size: 17, color: '334155' })
                  ]
                })
              ]
            })
          ]
        })
      ]
    }),
    new Paragraph({ spacing: { before: 200, after: 100 } }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_TABLE_LIGHT,
      rows: [
        new TableRow({
          children: [
            makeHeaderCell('NO', 8),
            makeHeaderCell('KODE BERKAS', 24),
            makeHeaderCell('URAIAN NASKAH DOKUMEN HUKUM SAH', 48),
            makeHeaderCell('PENANDATANGAN', 20)
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('1.', 8, false, AlignmentType.CENTER),
            makeDataCell('DOKUMEN 01', 24, true, AlignmentType.CENTER, '1E3A8A'),
            makeDataCell('Formulir Evaluasi & Lembar Penilaian Kinerja Penyedia (Standar SIKaP LKPP — 4 Aspek: Kualitas, Biaya, Waktu, Layanan)', 48),
            makeDataCell('PPK', 20, true, AlignmentType.CENTER)
          ]
        }),
        new TableRow({
          children: [
            makeDataCell('2.', 8, false, AlignmentType.CENTER),
            makeDataCell('DOKUMEN 02', 24, true, AlignmentType.CENTER, '1E3A8A'),
            makeDataCell('Sertifikat Penilaian Kinerja Penyedia / Surat Keterangan Kinerja (SKKP) Predikat SANGAT BAIK (Skor 2,70 / 3,00)', 48),
            makeDataCell('PPK', 20, true, AlignmentType.CENTER)
          ]
        })
      ]
    }),
    new Paragraph({ spacing: { before: 200, after: 100 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 0 },
      children: [
        new TextRun({
          text: 'PENGADAAN BARANG/JASA PEMERINTAH BERSIH, TRANSPARAN, DAN AKUNTABEL',
          bold: true,
          italic: true,
          size: 16,
          font: 'Cambria',
          color: '64748B'
        })
      ]
    })
  ];
}

// =============================================================================
// 2. DOKUMEN 01: FORMULIR LEMBAR EVALUASI & PENILAIAN KINERJA SIKAP LKPP
// =============================================================================
function buildDoc1FormulirKinerjaChildren(ctx) {
  const { paket, penyedia, settings } = ctx || {};
  const cleanKode = String(paket?.kode_paket_internal || 'PBJ-2026-001').replace(/^CAKRA-/i, 'PBJ-');
  const noDok = `018/PKP/${cleanKode}/PPK/VI/2026`;
  const tglDokStr = '12 Juni 2026';
  const namaDirektur = 'BAMBANG SUDARMANTO';

  // Helper Sel Header Compact
  const makeHCell = (text, widthPercent, align = AlignmentType.CENTER) => new TableCell({
    borders: BORDER_TABLE,
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text, bold: true, size: 16.5, font: 'Cambria', color: '0F172A' })
        ]
      })
    ]
  });

  // Helper Sel Data Compact
  const makeDCell = (text, widthPercent, isBold = false, align = AlignmentType.LEFT, color = '0F172A') => new TableCell({
    borders: BORDER_TABLE,
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    margins: { top: 35, bottom: 35, left: 70, right: 70 },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { before: 0, after: 0, line: 195 },
        children: [
          new TextRun({ text, bold: isBold, size: 16, font: 'Cambria', color })
        ]
      })
    ]
  });

  return [
    buildKopKpuResmi(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60, after: 15 },
      children: [
        new TextRun({
          text: 'LEMBAR EVALUASI DAN PENILAIAN KINERJA PENYEDIA',
          bold: true,
          size: 19,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 15 },
      children: [
        new TextRun({
          text: 'STANDAR SISTEM INFORMASI KINERJA PENYEDIA (SIKaP) LKPP',
          bold: true,
          size: 16.5,
          font: 'Cambria',
          color: '1E3A8A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: `Nomor: ${noDok}`,
          bold: true,
          size: 16.5,
          font: 'Cambria',
          color: '334155'
        })
      ]
    }),

    p('Berdasarkan Pasal 11 ayat (1) huruf n Perpres 16/2018 jo. Perpres 46/2025 serta Peraturan LKPP Nomor 4 Tahun 2021 tentang Pembinaan Pelaku Usaha PBJ, PPK Satker KPU Kabupaten Ngawi menetapkan hasil evaluasi dan penilaian kinerja akhir Penyedia:'),

    // Tabel Identitas Kontrak & Rekanan (2 Kolom / 4 Baris Ringkas)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 15, bottom: 15, left: 10, right: 10 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'Paket: ', font: 'Cambria', size: 16, color: '475569' }),
                    new TextRun({ text: 'Pengadaan PC Server & Workstation', font: 'Cambria', size: 16, bold: true, color: '0F172A' })
                  ]
                })
              ]
            }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 15, bottom: 15, left: 10, right: 10 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'Kontrak: ', font: 'Cambria', size: 16, color: '475569' }),
                    new TextRun({ text: '013/SP/PBJ-2026-001/PPK-PBJ/V/2026', font: 'Cambria', size: 16, bold: true, color: '0F172A' })
                  ]
                })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 15, bottom: 15, left: 10, right: 10 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'Penyedia: ', font: 'Cambria', size: 16, color: '475569' }),
                    new TextRun({ text: `CV. GRAFIKA PRATAMA NGAWI (${namaDirektur})`, font: 'Cambria', size: 16, bold: true, color: '0F172A' })
                  ]
                })
              ]
            }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 15, bottom: 15, left: 10, right: 10 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'Nilai Kontrak: ', font: 'Cambria', size: 16, color: '475569' }),
                    new TextRun({ text: 'Rp 138.000.000,- (PPN 11%)', font: 'Cambria', size: 16, bold: true, color: '1E3A8A' })
                  ]
                })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 15, bottom: 15, left: 10, right: 10 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'BAST 100%: ', font: 'Cambria', size: 16, color: '475569' }),
                    new TextRun({ text: '016/BAST/PBJ-2026-001/VI/2026 (10 Juni)', font: 'Cambria', size: 16, bold: true, color: '0F172A' })
                  ]
                })
              ]
            }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: { top: 15, bottom: 15, left: 10, right: 10 },
              children: [
                new Paragraph({
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'Sanksi Denda: ', font: 'Cambria', size: 16, color: '475569' }),
                    new TextRun({ text: '1 Hari Rp 56.568,- (Setor Kas Negara Akun 425161)', font: 'Cambria', size: 16, bold: true, color: 'B91C1C' })
                  ]
                })
              ]
            })
          ]
        })
      ]
    }),

    pBab('MATRIKS PENILAIAN EMPAT ASPEK KINERJA PENYEDIA (SKOR 0 S.D. 3)'),

    // Tabel Matriks 4 Aspek Penilaian Kinerja
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_TABLE_SOLID,
      rows: [
        new TableRow({
          children: [
            makeHCell('NO', 5),
            makeHCell('ASPEK PENILAIAN & INDIKATOR KINERJA', 43),
            makeHCell('BOBOT', 11),
            makeHCell('SKOR', 12),
            makeHCell('TERBOBOT', 13),
            makeHCell('CATATAN EVALUASI PPK', 16)
          ]
        }),
        new TableRow({
          children: [
            makeDCell('1.', 5, false, AlignmentType.CENTER),
            makeDCell('KUALITAS & KUANTITAS: Dell T350 & OptiPlex 100% lengkap, uji fungsi 24 jam lulus, garansi 365 hari onsite.', 43),
            makeDCell('30%', 11, true, AlignmentType.CENTER),
            makeDCell('3 (Sangat Baik)', 12, true, AlignmentType.CENTER, '15803D'),
            makeDCell('0,90', 13, true, AlignmentType.CENTER, '1E3A8A'),
            makeDCell('Barang baru & asli 100%', 16, false, AlignmentType.LEFT)
          ]
        }),
        new TableRow({
          children: [
            makeDCell('2.', 5, false, AlignmentType.CENTER),
            makeDCell('BIAYA: Kepatuhan nilai kontrak katalog, tanpa eskalasi sepihak, dan kepatuhan pemotongan sanksi denda Rp 56.568,-.', 43),
            makeDCell('20%', 11, true, AlignmentType.CENTER),
            makeDCell('3 (Sangat Baik)', 12, true, AlignmentType.CENTER, '15803D'),
            makeDCell('0,60', 13, true, AlignmentType.CENTER, '1E3A8A'),
            makeDCell('Tertib finansial penuh', 16, false, AlignmentType.LEFT)
          ]
        }),
        new TableRow({
          children: [
            makeDCell('3.', 5, false, AlignmentType.CENTER),
            makeDCell('WAKTU: 3 Workstation tepat waktu (09 Juni). 1 PC Server terlambat 1 hari (10 Juni) dengan denda disetor Kas Negara.', 43),
            makeDCell('30%', 11, true, AlignmentType.CENTER),
            makeDCell('2 (Baik)', 12, true, AlignmentType.CENTER, 'B45309'),
            makeDCell('0,60', 13, true, AlignmentType.CENTER, '1E3A8A'),
            makeDCell('Selesai dengan denda', 16, false, AlignmentType.LEFT)
          ]
        }),
        new TableRow({
          children: [
            makeDCell('4.', 5, false, AlignmentType.CENTER),
            makeDCell('LAYANAN: Sikap kooperatif, teknisi pendamping uji komisioning hadir, kelengkapan berkas penagihan sah.', 43),
            makeDCell('20%', 11, true, AlignmentType.CENTER),
            makeDCell('3 (Sangat Baik)', 12, true, AlignmentType.CENTER, '15803D'),
            makeDCell('0,60', 13, true, AlignmentType.CENTER, '1E3A8A'),
            makeDCell('Responsif & profesional', 16, false, AlignmentType.LEFT)
          ]
        }),
        new TableRow({
          children: [
            makeDCell('', 5, false, AlignmentType.CENTER),
            makeDCell('TOTAL SKOR KINERJA AKHIR (SKALA 0 S.D. 3,00)', 43, true, AlignmentType.RIGHT, '0F172A'),
            makeDCell('100%', 11, true, AlignmentType.CENTER, '0F172A'),
            makeDCell('—', 12, true, AlignmentType.CENTER),
            makeDCell('2,70', 13, true, AlignmentType.CENTER, '1E3A8A'),
            makeDCell('PREDIKAT:\nSANGAT BAIK', 16, true, AlignmentType.CENTER, '15803D')
          ]
        })
      ]
    }),

    pBab('KESIMPULAN EVALUASI & REKOMENDASI PEJABAT PEMBUAT KOMITMEN'),
    pNumbered('1.', 'Konversi Nilai Kinerja SIKaP: Skor akhir 2,70 / 3,00 setara dengan 90,00 (Kategori SANGAT BAIK / Bintang 5 SIKaP LKPP).', { level: 1 }),
    pNumbered('2.', 'Rekomendasi Repeat Order: Memenuhi syarat normatif Repeat Order sesuai Pasal 38 Perpres 16/2018 jo. Perpres 46/2025.', { level: 1 }),
    pNumbered('3.', 'Kewajiban Garansi: Penyedia terikat garansi resmi pabrikan selama 365 hari kalender (10 Juni 2026 s.d. 10 Juni 2027).', { level: 1 }),

    new Paragraph({ spacing: { before: 40, after: 15 } }),

    // Blok Tanda Tangan PPK
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 55, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [] })]
            }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 15 },
                  children: [
                    new TextRun({ text: `Ngawi, ${tglDokStr}`, font: 'Cambria', size: 17 })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 15 },
                  children: [
                    new TextRun({ text: 'Pejabat Pembuat Komitmen (PPK)', bold: true, font: 'Cambria', size: 17, color: '1E3A8A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 150 },
                  children: [
                    new TextRun({ text: 'KPU Kabupaten Ngawi', bold: true, font: 'Cambria', size: 17, color: '1E3A8A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 15 },
                  children: [
                    new TextRun({
                      text: 'MOHAMMAD NOOR JIHAN',
                      bold: true,
                      underline: { type: UnderlineType.SINGLE },
                      font: 'Cambria',
                      size: 17,
                      color: '0F172A'
                    })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'NIP. 19840101 200912 1 001', font: 'Cambria', size: 16, color: '475569' })
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

// =============================================================================
// 3. DOKUMEN 02: SERTIFIKAT PENILAIAN KINERJA PENYEDIA (SKKP)
// =============================================================================
function buildDoc2SertifikatKinerjaChildren(ctx) {
  const { paket, penyedia } = ctx || {};
  const cleanKode = String(paket?.kode_paket_internal || 'PBJ-2026-001').replace(/^CAKRA-/i, 'PBJ-');
  const noSkkp = `018/SKKP/${cleanKode}/PPK/VI/2026`;
  const tglDokStr = '12 Juni 2026';

  return [
    buildKopKpuResmi(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 40 },
      children: [
        new TextRun({
          text: 'SURAT KETERANGAN KINERJA PENYEDIA',
          bold: true,
          size: 24,
          font: 'Cambria',
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: '(SERTIFIKAT KINERJA RESMI SIKaP LKPP)',
          bold: true,
          size: 18,
          font: 'Cambria',
          color: '1E3A8A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 220 },
      children: [
        new TextRun({
          text: `Nomor: ${noSkkp}`,
          bold: true,
          size: 18,
          font: 'Cambria',
          color: '475569'
        })
      ]
    }),

    p('Yang bertanda tangan di bawah ini:'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        makeLabelValRow('Nama', 'MOHAMMAD NOOR JIHAN', 25, 75, true),
        makeLabelValRow('NIP', '19840101 200912 1 001', 25, 75, false),
        makeLabelValRow('Jabatan', 'Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi', 25, 75, false),
        makeLabelValRow('Alamat Kantor', 'Jl. Untung Suropati No. 48, Ngawi, Jawa Timur', 25, 75, false)
      ]
    }),

    new Paragraph({ spacing: { before: 100, after: 60 } }),
    p('Dengan ini menerangkan dengan sebenarnya bahwa penyedia barang/jasa:'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        makeLabelValRow('Nama Perusahaan', penyedia?.nama_perusahaan || 'CV. GRAFIKA PRATAMA NGAWI', 25, 75, true),
        makeLabelValRow('Nama Pimpinan', penyedia?.nama_direktur || 'BAMBANG SUDARMANTO', 25, 75, true),
        makeLabelValRow('Alamat Domisili', 'Jl. PB. Sudirman No. 12 Ngawi', 25, 75, false),
        makeLabelValRow('NPWP Perusahaan', '01.234.567.8-646.000', 25, 75, false),
        makeLabelValRow('Nama Pekerjaan', paket?.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi', 25, 75, true),
        makeLabelValRow('Nomor Kontrak', '013/SP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026', 25, 75, false),
        makeLabelValRow('Nilai Kontrak', 'Rp 138.000.000,- (Seratus tiga puluh delapan juta rupiah)', 25, 75, false),
        makeLabelValRow('Masa Pelaksanaan', '11 Mei 2026 s.d. 09 Juni 2026 (Realisasi BAST: 10 Juni 2026)', 25, 75, false)
      ]
    }),

    new Paragraph({ spacing: { before: 120, after: 60 } }),
    p('Telah menyelesaikan seluruh kewajiban kontraktual pengadaan dengan baik dan berdasarkan hasil evaluasi kinerja Sistem Informasi Kinerja Penyedia (SIKaP) LKPP, penyedia tersebut memperoleh predikat:'),

    // Kotak Piagam Predikat
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_TABLE_SOLID,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: BORDER_TABLE_SOLID,
              width: { size: 100, type: WidthType.PERCENTAGE },
              shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
              margins: { top: 140, bottom: 140, left: 160, right: 160 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                  children: [
                    new TextRun({ text: 'PREDIKAT KINERJA PENYEDIA:', bold: true, size: 18, font: 'Cambria', color: '166534' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                  children: [
                    new TextRun({ text: '⭐⭐⭐⭐⭐ SANGAT BAIK ⭐⭐⭐⭐⭐', bold: true, size: 24, font: 'Cambria', color: '15803D' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'Total Skor Kinerja: 2,70 / 3,00 (Kualitas: 3 | Biaya: 3 | Waktu: 2 | Layanan: 3)', bold: true, size: 17, font: 'Cambria', color: '1E3A8A' }),
                    new TextRun({ text: ' — Direkomendasikan Repeat Order', italic: true, size: 17, font: 'Cambria', color: '166534' })
                  ]
                })
              ]
            })
          ]
        })
      ]
    }),

    new Paragraph({ spacing: { before: 100, after: 40 } }),
    p('Surat Keterangan Kinerja ini diberikan kepada penyedia jasa yang bersangkutan untuk dipergunakan sebagai portofolio rekam jejak pada aplikasi SIKaP LKPP, kualifikasi tender/e-purchasing, serta pembinaan pelaku usaha PBJ Pemerintah.'),

    new Paragraph({ spacing: { before: 80, after: 40 } }),

    // Blok Tanda Tangan PPK
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [] })]
            }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20 },
                  children: [
                    new TextRun({ text: `Ngawi, ${tglDokStr}`, font: 'Cambria', size: 18 })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20 },
                  children: [
                    new TextRun({ text: 'Pejabat Pembuat Komitmen (PPK)', bold: true, font: 'Cambria', size: 18, color: '1E3A8A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 260 },
                  children: [
                    new TextRun({ text: 'KPU Kabupaten Ngawi', bold: true, font: 'Cambria', size: 18, color: '1E3A8A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20 },
                  children: [
                    new TextRun({
                      text: 'MOHAMMAD NOOR JIHAN',
                      bold: true,
                      underline: { type: UnderlineType.SINGLE },
                      font: 'Cambria',
                      size: 18,
                      color: '0F172A'
                    })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'NIP. 19840101 200912 1 001', font: 'Cambria', size: 17, color: '475569' })
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

// =============================================================================
// 4. DOKUMEN 03: BERITA ACARA PENYELESAIAN & PENUTUPAN KONTRAK (BAPPK)
// =============================================================================
function buildDoc3PenutupanKontrakChildren(ctx) {
  const { paket, penyedia, settings } = ctx || {};
  const cleanKode = String(paket?.kode_paket_internal || 'PBJ-2026-001').replace(/^CAKRA-/i, 'PBJ-');
  const noBappk = `018/BAPPK/${cleanKode}/PPK/VI/2026`;
  const tglDokStr = '12 Juni 2026';

  return [
    buildKopKpuResmi(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 30 },
      children: [
        new TextRun({
          text: 'BERITA ACARA PENYELESAIAN DAN PENUTUPAN KONTRAK PENGADAAN',
          bold: true,
          size: 20,
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
          text: '(CONTRACT CLOSE-OUT REPORT / BAPPK)',
          bold: true,
          size: 17,
          font: 'Cambria',
          color: '1E3A8A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 120 },
      children: [
        new TextRun({
          text: `Nomor: ${noBappk}`,
          bold: true,
          size: 18,
          font: 'Cambria',
          color: '334155'
        })
      ]
    }),

    p('Pada hari ini, Jumat tanggal Dua Belas bulan Juni tahun Dua Ribu Dua Puluh Enam (12-06-2026), bertempat di Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jalan Untung Suropati Nomor 48 Ngawi, kami yang bertanda tangan di bawah ini:'),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        makeLabelValRow('1. MOHAMMAD NOOR JIHAN', 'Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi, bertindak untuk dan atas nama Kuasa Pengguna Anggaran KPU Kabupaten Ngawi, berkedudukan di Jl. Untung Suropati No. 48 Ngawi, selanjutnya disebut sebagai PIHAK KESATU.', 28, 72, false),
        makeLabelValRow('2. BAMBANG SUDARMANTO', 'Direktur CV. GRAFIKA PRATAMA NGAWI, bertindak untuk dan atas nama CV. GRAFIKA PRATAMA NGAWI, berkedudukan di Jl. PB. Sudirman No. 12 Ngawi, selanjutnya disebut sebagai PIHAK KEDUA.', 28, 72, false)
      ]
    }),

    p('PIHAK KESATU dan PIHAK KEDUA secara bersama-sama menerangkan dan menyatakan sepakat atas hal-hal sebagai berikut:'),

    pNumbered('1.', 'Penyelesaian Prestasi Fisik Pekerjaan: PIHAK KEDUA telah menyelesaikan dan menyerahkan seluruh barang pengadaan berupa 1 unit PC Server Dell PowerEdge T350 dan 3 unit PC Workstation Dell OptiPlex Tower dalam kondisi 100% baru, lengkap, beroperasi normal, dan lulus uji fungsi komisioning 24 jam non-stop sesuai BAPHP dan BAST Nomor 016/BAST/PBJ-2026-001/PPK/VI/2026 tanggal 10 Juni 2026.', { level: 1 }),
    pNumbered('2.', 'Realisasi Keuangan & Pelunasan Sanksi Denda Keterlambatan: Sesuai Berita Acara Pembayaran (BAP) Nomor 016/BAP/PBJ-2026-001/PPK/VI/2026 tanggal 11 Juni 2026, PIHAK KEDUA dikenakan sanksi denda keterlambatan 1 hari atas 1 unit PC Server sebesar Rp 56.568,- yang telah lunas disetorkan ke Kas Negara pada Akun Penerimaan Negara Bukan Pajak (PNBP) 425161. Pembayaran netto hak tagih sebesar Rp 137.943.432,- telah diajukan melalui SPP-LS KPU Ngawi dan dicairkan oleh KPPN Madiun via transfer langsung ke Rekening Bank BRI PIHAK KEDUA Nomor 0058-01-002481-30-8.', { level: 1 }),
    pNumbered('3.', 'Penatausahaan Aset BMN: Seluruh barang pengadaan telah diserahterimakan dari PPK kepada KPA melalui BAST KPA Nomor 017/BAST-KPA/PBJ-2026-001/VI/2026 tanggal 11 Juni 2026 dan telah didaftarkan pada Modul Aset Tetap Aplikasi SAKTI Kementerian Keuangan Republik Indonesia.', { level: 1 }),
    pNumbered('4.', 'Jaminan Purna Jual & Masa Garansi: PIHAK KEDUA menjamin masa garansi resmi pabrikan selama 365 (tiga ratus enam puluh lima) hari kalender terhitung sejak 10 Juni 2026 sampai dengan 10 Juni 2027 dengan Service Level Agreement (SLA) respon onsite 1x24 jam.', { level: 1 }),
    pNumbered('5.', 'Penilaian Kinerja Penyedia: Berdasarkan evaluasi SIKaP LKPP, PIHAK KEDUA memperoleh predikat SANGAT BAIK dengan total skor kinerja 2,70 (skala 3,00) dan direkomendasikan untuk Repeat Order (Pesanan Berulang) sesuai Pasal 38 Perpres 16/2018 jo. Perpres 46/2025.', { level: 1 }),
    pNumbered('6.', 'Pernyataan Penutupan Kontrak (Close-Out Contract): Dengan terpenuhinya seluruh hak dan kewajiban hukum, administratif, fisik, dan finansial para pihak, maka Surat Pesanan / Kontrak Nomor 013/SP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026 tanggal 11 Mei 2026 dengan ini dinyatakan RESMI SELESAI, TUNTAS, DAN DITUTUP. Kedua belah pihak saling melepaskan dari segala bentuk tuntutan hukum atau klaim finansial di kemudian hari.', { level: 1 }),

    p('Demikian Berita Acara Penyelesaian dan Penutupan Kontrak Pengadaan (BAPPK) ini dibuat dan ditandatangani oleh kedua belah pihak dalam rangkap 2 (dua) asli bermeterai cukup yang masing-masing mempunyai kekuatan hukum yang sama.'),

    new Paragraph({ spacing: { before: 80, after: 40 } }),

    // Blok Tanda Tangan Berdampingan (PIHAK KEDUA & PIHAK KESATU)
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({
          children: [
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20 },
                  children: [
                    new TextRun({ text: 'PIHAK KEDUA', bold: true, font: 'Cambria', size: 18, color: '1E3A8A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20 },
                  children: [
                    new TextRun({ text: 'CV. GRAFIKA PRATAMA NGAWI', bold: true, font: 'Cambria', size: 18, color: '0F172A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                  children: [
                    new TextRun({ text: '[ Meterai Rp 10.000,- ]', italic: true, font: 'Cambria', size: 15, color: '64748B' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 180 },
                  children: []
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20 },
                  children: [
                    new TextRun({
                      text: 'BAMBANG SUDARMANTO',
                      bold: true,
                      underline: { type: UnderlineType.SINGLE },
                      font: 'Cambria',
                      size: 18,
                      color: '0F172A'
                    })
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
            }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20 },
                  children: [
                    new TextRun({ text: 'PIHAK KESATU', bold: true, font: 'Cambria', size: 18, color: '1E3A8A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20 },
                  children: [
                    new TextRun({ text: 'Pejabat Pembuat Komitmen (PPK)', bold: true, font: 'Cambria', size: 18, color: '0F172A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                  children: [
                    new TextRun({ text: 'KPU Kabupaten Ngawi', bold: true, font: 'Cambria', size: 18, color: '1E3A8A' })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 180 },
                  children: []
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 20 },
                  children: [
                    new TextRun({
                      text: 'MOHAMMAD NOOR JIHAN',
                      bold: true,
                      underline: { type: UnderlineType.SINGLE },
                      font: 'Cambria',
                      size: 18,
                      color: '0F172A'
                    })
                  ]
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { before: 0, after: 0 },
                  children: [
                    new TextRun({ text: 'NIP. 19840101 200912 1 001', font: 'Cambria', size: 17, color: '475569' })
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

module.exports = {
  makeHeaderCell,
  makeDataCell,
  makeLabelValRow,
  buildCoverBundelTahap18Children,
  buildDoc1FormulirKinerjaChildren,
  buildDoc2SertifikatKinerjaChildren,
  buildDoc3PenutupanKontrakChildren
};
