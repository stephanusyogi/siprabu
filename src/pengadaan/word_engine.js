/**
 * SI-PRABU — Mesin Generator Word (.DOCX) Hulu ke Hilir (Tahap 1 s.d. 18)
 * Menggunakan library resmi `docx` untuk menghasilkan dokumen naskah dinas KPU Kabupaten Ngawi
 * lengkap Kop Surat, Pembukaan Berita Acara formal, Tabel Rincian Item, Pasal Kontrak,
 * Kotak Paraf Footer (2 Pihak / Mandiri di luar halaman tanda tangan), & Anti Tanda Tangan Gantung
 * Pengembang: emenje
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
  Header,
  Footer,
  SectionType,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  TabStopType,
  PageNumber,
  ImageRun
} = require('docx');

const KPU_LOGO_PATH = path.join(__dirname, '../../public/assets/kpu_logo_official.png');

const {
  DEFINISI_18_TAHAP,
  formatRupiah,
  terbilangRupiah,
  formatTanggalIndo,
  formatHariTanggalBeritaAcara,
  hitungKeuanganKontrak
} = require('./utils');

const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
};

const BORDER_TABLE = {
  top: { style: BorderStyle.SINGLE, size: 6, color: '64748B' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: '64748B' },
  left: { style: BorderStyle.SINGLE, size: 6, color: '64748B' },
  right: { style: BorderStyle.SINGLE, size: 6, color: '64748B' }
};

const BORDER_PARAF = {
  top: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
  left: { style: BorderStyle.SINGLE, size: 6, color: '334155' },
  right: { style: BorderStyle.SINGLE, size: 6, color: '334155' }
};

function pText(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    keepNext: Boolean(opts.keepNext),
    keepLines: Boolean(opts.keepLines),
    pageBreakBefore: Boolean(opts.pageBreakBefore),
    spacing: { before: opts.before ?? 50, after: opts.after ?? 70, line: opts.line || 268 },
    indent: opts.indent || (opts.level ? { left: opts.level * (opts.hanging || 450), hanging: opts.hanging || 450 } : undefined),
    children: [
      new TextRun({
        text: String(text ?? ''),
        bold: Boolean(opts.bold),
        italics: Boolean(opts.italic),
        underline: opts.underline ? {} : undefined,
        size: opts.size || 21, // 10.5pt default agar proporsional & rapi
        font: 'Cambria',
        color: opts.color || '000000'
      })
    ]
  });
}

/**
 * Paragraf Penomoran Hierarkis Rapi (Word Native Hanging Indents)
 * Menjamin kesamaan jarak dari garis kiri antar number level layaknya dokumen Word profesional:
 * - Level 1 (1., 2., 3.): left = 450 dxa (~0.8 cm), hanging = 450 dxa
 * - Level 2 (a., b., c.): left = 900 dxa (~1.6 cm), hanging = 450 dxa (posisi nomor sejajar teks Level 1)
 * - Level 3 (1), 2) / •): left = 1350 dxa (~2.4 cm), hanging = 450 dxa (posisi nomor sejajar teks Level 2)
 * Seluruh baris kedua dan seterusnya otomatis rata lurus di bawah huruf pertama teks (hanging indent).
 */
function pNumbered(prefix, text, opts = {}) {
  const level = opts.level || 1;
  const hangingDxa = opts.hanging || 450;
  const leftDxa = opts.left || (level * hangingDxa);

  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    keepNext: Boolean(opts.keepNext),
    keepLines: Boolean(opts.keepLines),
    spacing: { before: opts.before ?? 28, after: opts.after ?? 38, line: opts.line || 268 },
    indent: { left: leftDxa, hanging: hangingDxa },
    tabStops: [{ type: TabStopType.LEFT, position: leftDxa }],
    children: [
      new TextRun({
        text: prefix.endsWith('\t') ? prefix : `${prefix}\t`,
        bold: opts.prefixBold !== undefined ? Boolean(opts.prefixBold) : true,
        size: opts.size || 21,
        font: 'Cambria',
        color: opts.prefixColor || opts.color || '000000'
      }),
      new TextRun({
        text: String(text ?? ''),
        bold: Boolean(opts.bold),
        italics: Boolean(opts.italic),
        size: opts.size || 21,
        font: 'Cambria',
        color: opts.color || '000000'
      })
    ]
  });
}

function pLabelValue(label, value) {
  return new TableRow({
    cantSplit: true,
    children: [
      new TableCell({
        width: { size: 32, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        children: [pText(label, { bold: true, size: 20, before: 16, after: 16, line: 240 })]
      }),
      new TableCell({
        width: { size: 3, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        children: [pText(':', { bold: true, size: 20, before: 16, after: 16, line: 240 })]
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        children: [pText(value, { size: 20, before: 16, after: 16, line: 240 })]
      })
    ]
  });
}

function buildKopSuratKpu(settings) {
  const borderKopCell = {
    top: BORDER_NONE.top,
    left: BORDER_NONE.left,
    right: BORDER_NONE.right,
    bottom: { style: BorderStyle.SINGLE, size: 24, color: '000000' } // 3pt solid black rule persis KAK Stiker
  };

  if (fs.existsSync(KPU_LOGO_PATH)) {
    const logoBuf = fs.readFileSync(KPU_LOGO_PATH);

    return [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 15, type: WidthType.PERCENTAGE },
                margins: { bottom: 100, top: 0, left: 0, right: 60 },
                borders: borderKopCell,
                verticalAlign: 'center',
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 0 },
                    children: [
                      new ImageRun({
                        data: logoBuf,
                        transformation: { width: 64, height: 73 }
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 85, type: WidthType.PERCENTAGE },
                margins: { bottom: 100, top: 0, left: 30, right: 0 },
                borders: borderKopCell,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 15, line: 240 },
                    children: [
                      new TextRun({
                        text: 'KOMISI PEMILIHAN UMUM',
                        bold: true,
                        size: 27,
                        font: 'Cambria',
                        color: '000000'
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 20, line: 240 },
                    children: [
                      new TextRun({
                        text: (settings?.nama_satker ? settings.nama_satker.replace(/^komisi pemilihan umum\s*/i, '') : 'KABUPATEN NGAWI').toUpperCase(),
                        bold: true,
                        size: 29,
                        font: 'Cambria',
                        color: '000000'
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 10, line: 210 },
                    children: [
                      new TextRun({
                        text: settings?.alamat_satker || 'Jl. Untung Suropati No. 48 Ngawi, Jawa Timur 63218',
                        size: 19,
                        font: 'Cambria',
                        color: '000000'
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 10, line: 200 },
                    children: [
                      new TextRun({
                        text: `Telepon ${settings?.telp_satker || '(0351) 743832'} | Faksimile ${settings?.fax_satker || '(0351) 748687'}`,
                        size: 17,
                        font: 'Cambria',
                        color: '000000'
                      })
                    ]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 0, after: 40, line: 200 },
                    children: [
                      new TextRun({
                        text: `Laman: ${settings?.website_satker || 'kab-ngawi.kpu.go.id'} | Pos-el: ${settings?.email_satker || 'kab_ngawi@kpu.go.id'}`,
                        size: 17,
                        italics: true,
                        font: 'Cambria',
                        color: '000000'
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }),
      new Paragraph({ spacing: { before: 0, after: 100 }, children: [] })
    ];
  }

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 30 },
      children: [
        new TextRun({
          text: (settings.nama_satker || 'KOMISI PEMILIHAN UMUM KABUPATEN NGAWI').toUpperCase(),
          bold: true,
          size: 27,
          font: 'Cambria'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 30 },
      children: [
        new TextRun({
          text: `${settings.alamat_satker || 'Jl. Untung Suropati No. 48 Ngawi'} — Telp. ${settings.telp_satker || '(0351) 743832'}`,
          size: 19,
          font: 'Cambria'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 140 },
      border: {
        bottom: { style: BorderStyle.DOUBLE, size: 14, color: '000000', space: 5 }
      },
      children: [
        new TextRun({
          text: `Laman: ${settings.website_satker || 'kab-ngawi.kpu.go.id'} | Pos-el: ${settings.email_satker || 'kab_ngawi@kpu.go.id'}`,
          italics: true,
          size: 18,
          font: 'Cambria'
        })
      ]
    })
  ];
}

/**
 * Tabel Rincian Item Barang/Jasa dengan Pengunci Anti Tanda Tangan Gantung (`keepNext` & `cantSplit`)
 */
function buildTabelItemDocx(items, modeHarga = 'kontrak', opts = {}) {
  const {
    lockWithSignature = true,
    showTotalRow = true,
    totalSemuaOverride = null,
    startIndex = 0
  } = opts;

  const headerTitles = ['No', 'Uraian Barang / Jasa & Spesifikasi Teknis', 'Vol', 'Satuan', 'TKDN / PDN', 'Harga Satuan (Rp)', 'Jumlah Harga (Rp)'];
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headerTitles.map(title => new TableCell({
      borders: BORDER_TABLE,
      shading: { fill: '0F172A', type: ShadingType.CLEAR },
      children: [pText(title, {
        bold: true,
        size: 18,
        align: AlignmentType.CENTER,
        color: 'FFFFFF',
        before: 30,
        after: 30,
        line: 230,
        keepNext: lockWithSignature,
        keepLines: true
      })]
    }))
  });

  let totalSemua = 0;
  const bodyRows = items.map((it, idx) => {
    const hrgSat = modeHarga === 'hps'
      ? Number(it.harga_satuan_hps || 0)
      : Number(it.harga_satuan_kontrak || it.harga_satuan_hps || 0);
    const jml = modeHarga === 'hps'
      ? Number(it.jumlah_hps || 0)
      : Number(it.jumlah_kontrak || it.jumlah_hps || 0);
    totalSemua += jml;

    // Kunci 2 baris item terakhir bersama baris TOTAL & Tanda Tangan agar tabel tidak terputus meninggalkan TTD gantung
    const keepRowWithNext = lockWithSignature && (idx >= Math.max(0, items.length - 2));

    return new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          borders: BORDER_TABLE,
          children: [pText(startIndex + idx + 1, { size: 18, align: AlignmentType.CENTER, before: 24, after: 24, line: 230, keepNext: keepRowWithNext, keepLines: true })]
        }),
        new TableCell({
          borders: BORDER_TABLE,
          children: [
            pText(it.uraian_item, { bold: true, size: 18, before: 24, after: 12, line: 230, keepNext: true, keepLines: true }),
            pText(`Spesifikasi: ${it.spesifikasi_teknis || '-'}`, { size: 17, italic: true, before: 0, after: 24, line: 220, keepNext: keepRowWithNext, keepLines: true })
          ]
        }),
        new TableCell({
          borders: BORDER_TABLE,
          children: [pText(it.volume, { size: 18, align: AlignmentType.CENTER, before: 24, after: 24, line: 230, keepNext: keepRowWithNext, keepLines: true })]
        }),
        new TableCell({
          borders: BORDER_TABLE,
          children: [pText(it.satuan, { size: 18, align: AlignmentType.CENTER, before: 24, after: 24, line: 230, keepNext: keepRowWithNext, keepLines: true })]
        }),
        new TableCell({
          borders: BORDER_TABLE,
          children: [pText(`${it.status_pdn} (${it.persen_tkdn || 0}%)`, { size: 17, align: AlignmentType.CENTER, before: 24, after: 24, line: 230, keepNext: keepRowWithNext, keepLines: true })]
        }),
        new TableCell({
          borders: BORDER_TABLE,
          children: [pText(formatRupiah(hrgSat, false), { size: 18, align: AlignmentType.RIGHT, before: 24, after: 24, line: 230, keepNext: keepRowWithNext, keepLines: true })]
        }),
        new TableCell({
          borders: BORDER_TABLE,
          children: [pText(formatRupiah(jml, false), { bold: true, size: 18, align: AlignmentType.RIGHT, before: 24, after: 24, line: 230, keepNext: keepRowWithNext, keepLines: true })]
        })
      ]
    });
  });

  const rows = [headerRow, ...bodyRows];

  if (showTotalRow) {
    const finalTotal = totalSemuaOverride !== null ? totalSemuaOverride : totalSemua;
    const totalRow = new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          columnSpan: 6,
          borders: BORDER_TABLE,
          shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
          children: [pText('TOTAL NILAI (TERMASUK PAJAK)', {
            bold: true,
            size: 19,
            align: AlignmentType.RIGHT,
            before: 30,
            after: 30,
            line: 230,
            keepNext: lockWithSignature,
            keepLines: true
          })]
        }),
        new TableCell({
          borders: BORDER_TABLE,
          shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
          children: [pText(formatRupiah(finalTotal), {
            bold: true,
            size: 19,
            align: AlignmentType.RIGHT,
            before: 30,
            after: 30,
            line: 230,
            keepNext: lockWithSignature,
            keepLines: true
          })]
        })
      ]
    });
    rows.push(totalRow);
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows
  });
}

/**
 * Blok Tanda Tangan Utuh & Sejajar Horizontal (Anti Terpotong Antar-Baris & Anti Tanda Tangan Gantung)
 */
function buildBlokTandaTangan(kiri, kanan, kota, tanggalStr) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Baris 1: Tanggal / Pengantar Atas (Dikunci `keepNext: true` agar tidak pernah terpisah dari Jabatan di bawahnya)
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText(kiri && kiri.barisAtas ? kiri.barisAtas : ' ', {
                size: 20,
                align: AlignmentType.CENTER,
                before: 80,
                after: 20,
                line: 240,
                keepNext: true,
                keepLines: true
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText(`${kota || 'Ngawi'}, ${formatTanggalIndo(tanggalStr)}`, {
                size: 20,
                align: AlignmentType.CENTER,
                before: 80,
                after: 20,
                line: 240,
                keepNext: true,
                keepLines: true
              })
            ]
          })
        ]
      }),
      // Baris 2: Jabatan Penandatangan + Ruang Tanda Tangan Basah (Dikunci `keepNext: true` ke Baris 3 Nama)
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: kiri ? [
              pText(kiri.judulAtas || 'PIHAK KEDUA / PENYEDIA', {
                bold: true,
                size: 20,
                align: AlignmentType.CENTER,
                before: 0,
                after: 20,
                line: 240,
                keepNext: true,
                keepLines: true
              }),
              pText(kiri.subJudul || '', {
                bold: true,
                size: 20,
                align: AlignmentType.CENTER,
                before: 0,
                after: 680,
                line: 240,
                keepNext: true,
                keepLines: true
              })
            ] : [
              pText(' ', {
                size: 20,
                before: 0,
                after: 680,
                line: 240,
                keepNext: true,
                keepLines: true
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText(kanan.judulAtas || 'PEJABAT PEMBUAT KOMITMEN (PPK)', {
                bold: true,
                size: 20,
                align: AlignmentType.CENTER,
                before: 0,
                after: 20,
                line: 240,
                keepNext: true,
                keepLines: true
              }),
              pText(kanan.subJudul || 'KPU KABUPATEN NGAWI', {
                bold: true,
                size: 20,
                align: AlignmentType.CENTER,
                before: 0,
                after: 680,
                line: 240,
                keepNext: true,
                keepLines: true
              })
            ]
          })
        ]
      }),
      // Baris 3: Nama Pejabat & NIP / Identitas (Terpisah dalam TableRow sendiri -> Dijamin 100% Sejajar Horizontal)
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: kiri ? [
              pText(kiri.nama || '-', {
                bold: true,
                underline: true,
                size: 20,
                align: AlignmentType.CENTER,
                before: 0,
                after: 20,
                line: 240,
                keepNext: true,
                keepLines: true
              }),
              pText(kiri.identitas || '', {
                size: 19,
                align: AlignmentType.CENTER,
                before: 0,
                after: 0,
                line: 240,
                keepLines: true
              })
            ] : [
              pText(' ', { size: 20, before: 0, after: 0, line: 240, keepLines: true })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText(kanan.nama || '-', {
                bold: true,
                underline: true,
                size: 20,
                align: AlignmentType.CENTER,
                before: 0,
                after: 20,
                line: 240,
                keepNext: true,
                keepLines: true
              }),
              pText(kanan.identitas || '', {
                size: 19,
                align: AlignmentType.CENTER,
                before: 0,
                after: 0,
                line: 240,
                keepLines: true
              })
            ]
          })
        ]
      })
    ]
  });
}

/**
 * Footer Kotak Paraf (Hanya untuk halaman di luar halaman yang ada tanda tangan):
 * - Jika ditandatangani 2 Pihak (`pihakKiri` ada): Kotak Paraf Kedua Belah Pihak (2 kolom).
 * - Jika ditandatangani 1 Pejabat (`pihakKiri` null): Kotak Paraf Mandiri (1 kolom PPK).
 */
function buildFooterKotakParaf(pihakKiri, pihakKanan, def, tahapRow, paket) {
  const docLabel = `Dokumen Tahap ${String(def.no).padStart(2, '0')} (${def.kode}) — No: ${tahapRow.nomor_dokumen || '-'}`;
  const paketLabel = `${paket.kode_paket_internal || 'PBJ'} | ${paket.nama_paket || ''}`.slice(0, 78);

  if (pihakKiri) {
    // Label kolom paraf kedua belah pihak sesuai peran tahap
    const labelParafSatu = pihakKiri.labelParafKiri || 'PIHAK KESATU (PPK)';
    const labelParafDua = pihakKiri.labelParafKanan || 'PIHAK KEDUA (PENYEDIA)';

    return new Footer({
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            // Baris 1: Judul Kotak Paraf Kedua Belah Pihak
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: 54, type: WidthType.PERCENTAGE },
                  borders: BORDER_NONE,
                  children: [
                    pText(docLabel, { size: 15, italic: true, color: '475569', before: 10, after: 10, line: 200 })
                  ]
                }),
                new TableCell({
                  width: { size: 46, type: WidthType.PERCENTAGE },
                  columnSpan: 2,
                  borders: BORDER_PARAF,
                  shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
                  children: [
                    pText('PARAF KEDUA BELAH PIHAK', {
                      bold: true,
                      size: 15,
                      align: AlignmentType.CENTER,
                      color: '0F172A',
                      before: 16,
                      after: 16,
                      line: 200
                    })
                  ]
                })
              ]
            }),
            // Baris 2: Nama Jabatan Pihak 1 & Pihak 2
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: 54, type: WidthType.PERCENTAGE },
                  borders: BORDER_NONE,
                  children: [
                    pText(paketLabel, { size: 14, italic: true, color: '64748B', before: 10, after: 10, line: 200 })
                  ]
                }),
                new TableCell({
                  width: { size: 23, type: WidthType.PERCENTAGE },
                  borders: BORDER_PARAF,
                  shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                  children: [
                    pText(labelParafSatu, {
                      bold: true,
                      size: 14,
                      align: AlignmentType.CENTER,
                      color: '1E293B',
                      before: 14,
                      after: 14,
                      line: 190
                    })
                  ]
                }),
                new TableCell({
                  width: { size: 23, type: WidthType.PERCENTAGE },
                  borders: BORDER_PARAF,
                  shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                  children: [
                    pText(labelParafDua, {
                      bold: true,
                      size: 14,
                      align: AlignmentType.CENTER,
                      color: '1E293B',
                      before: 14,
                      after: 14,
                      line: 190
                    })
                  ]
                })
              ]
            }),
            // Baris 3: Ruang Bubuh Paraf Basah Kedua Belah Pihak
            new TableRow({
              cantSplit: true,
              children: [
                new TableCell({
                  width: { size: 54, type: WidthType.PERCENTAGE },
                  borders: BORDER_NONE,
                  children: [
                    pText(' ', { size: 14, before: 110, after: 110, line: 200 })
                  ]
                }),
                new TableCell({
                  width: { size: 23, type: WidthType.PERCENTAGE },
                  borders: BORDER_PARAF,
                  children: [
                    pText(' ', { size: 16, align: AlignmentType.CENTER, before: 110, after: 110, line: 200 })
                  ]
                }),
                new TableCell({
                  width: { size: 23, type: WidthType.PERCENTAGE },
                  borders: BORDER_PARAF,
                  children: [
                    pText(' ', { size: 16, align: AlignmentType.CENTER, before: 110, after: 110, line: 200 })
                  ]
                })
              ]
            })
          ]
        })
      ]
    });
  }

  // Jika hanya ditandatangani 1 Pejabat -> Kotak Paraf Mandiri (KPA / PPK / PP)
  let labelPejabatMandiri = pihakKanan?.judulAtas || 'PEJABAT PEMBUAT KOMITMEN (PPK)';
  if (labelPejabatMandiri.includes('KUASA PENGGUNA ANGGARAN') || def.no === 3) {
    labelPejabatMandiri = 'KUASA PENGGUNA ANGGARAN (KPA)';
  } else if (labelPejabatMandiri.includes('PEJABAT PENGADAAN')) {
    labelPejabatMandiri = 'PEJABAT PENGADAAN (PPBJ)';
  } else if (!labelPejabatMandiri.includes('(PPK)')) {
    labelPejabatMandiri = `${labelPejabatMandiri} (PPK)`;
  }

  return new Footer({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText(docLabel, { size: 15, italic: true, color: '475569', before: 10, after: 10, line: 200 })
                ]
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                borders: BORDER_PARAF,
                shading: { fill: 'E2E8F0', type: ShadingType.CLEAR },
                children: [
                  pText('PARAF MANDIRI', {
                    bold: true,
                    size: 15,
                    align: AlignmentType.CENTER,
                    color: '0F172A',
                    before: 16,
                    after: 16,
                    line: 200
                  })
                ]
              })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText(paketLabel, { size: 14, italic: true, color: '64748B', before: 10, after: 10, line: 200 })
                ]
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                borders: BORDER_PARAF,
                shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
                children: [
                  pText(labelPejabatMandiri, {
                    bold: true,
                    size: 14,
                    align: AlignmentType.CENTER,
                    color: '1E293B',
                    before: 14,
                    after: 14,
                    line: 190
                  })
                ]
              })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 70, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText(' ', { size: 14, before: 110, after: 110, line: 200 })
                ]
              }),
              new TableCell({
                width: { size: 30, type: WidthType.PERCENTAGE },
                borders: BORDER_PARAF,
                children: [
                  pText(' ', { size: 16, align: AlignmentType.CENTER, before: 110, after: 110, line: 200 })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
}

/**
 * Footer Bersih Tanpa Kotak Paraf
 * Sesuai Kaidah Tata Naskah Dinas:
 * 1. Dokumen 1 lembar (seperti Tahap 3) TIDAK PERLU kotak paraf.
 * 2. Halaman yang memuat tanda tangan TIDAK PERLU kotak paraf.
 */
function buildFooterTanpaParaf(docLabel, paketLabel) {
  const children = [];
  if (docLabel) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 20, after: 0 },
        children: [
          new TextRun({
            text: docLabel,
            size: 14,
            italic: true,
            color: '64748B',
            font: 'Cambria'
          }),
          ...(paketLabel ? [
            new TextRun({
              text: ` | ${paketLabel}`,
              size: 13,
              italic: true,
              color: '94A3B8',
              font: 'Cambria'
            })
          ] : [])
        ]
      })
    );
  } else {
    children.push(
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({ text: '', size: 14, font: 'Cambria' })]
      })
    );
  }
  return new Footer({ children });
}

/**
 * Konten Spesifik & Pasal Hukum Berdasarkan Nomor Tahap (1 s.d. 18)
 */
function buildStageSpecificSections(stageNo, ctx, tahapRow, keu) {
  const { paket, items, penyedia, ppk, kpa, pejabatPengadaan, settings } = ctx;
  const infoHari = formatHariTanggalBeritaAcara(tahapRow?.tanggal_dokumen || paket.tgl_mulai_kerja);
  const isKonstruksi = String(paket.jenis_pengadaan || '').includes('Konstruksi');
  const paragraphs = [];

  switch (stageNo) {
    case 1:
      paragraphs.push(
        pText('A. LATAR BELAKANG & IDENTIFIKASI KEBUTUHAN ANGGARAN (DIPA / RKB)', { bold: true, before: 120 }),
        pText(`1. Berdasarkan DIPA Satker ${settings.nama_satker} Nomor ${settings.nomor_dipa} Tahun Anggaran ${paket.tahun_anggaran} pada Program "${paket.rkb_program || 'Program Penyelenggaraan Pemilu'}", Kegiatan "${paket.rkb_kegiatan || 'Pengelolaan Data Pemilih'}", Sub Kegiatan/Komponen "${paket.rkb_subkegiatan || paket.rkb_komponen || 'Pengadaan Sarana Pengolah Data'}", dan Mata Anggaran Kegiatan (MAK) ${paket.kode_akun_mak} (${paket.nama_akun_mak}), diperlukan pengadaan "${paket.nama_paket}" dengan Pagu Anggaran sebesar ${formatRupiah(paket.nilai_pagu)} (${terbilangRupiah(paket.nilai_pagu)}).`),
        pText(`2. Pemeriksaan ketersediaan Barang Milik Negara (BMN) / Persediaan / Kondisi Gedung dan Bangunan eksisting menunjukkan bahwa kebutuhan tersebut wajib dipenuhi untuk menunjang kelancaran operasional dan tahapan kegiatan pada Subbagian ${paket.pic_subbag}.`),
        pText(`3. Sesuai Pasal 65 Peraturan Presiden Nomor 46 Tahun 2025, paket pengadaan ini dialokasikan untuk memberdayakan Usaha Mikro, Usaha Kecil, dan Koperasi (UMK-Koperasi) serta mengutamakan Produk Dalam Negeri (PDN).`)
      );
      break;

    case 2:
      paragraphs.push(
        pText('A. PENETAPAN JENIS, CARA PENGADAAN, METODE PEMILIHAN, DAN PEMAKETAN PBJ', { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `Jenis Pengadaan: Ditetapkan sebagai ${paket.jenis_pengadaan} (${isKonstruksi ? 'Mengacu Lampiran II/III Peraturan LKPP Nomor 3 Tahun 2026' : 'Mengacu Lampiran I Peraturan LKPP Nomor 3 Tahun 2026'}). Ruang lingkup kebutuhan berupa penyediaan komoditas barang inventaris sarana penunjang operasional kantor.`, { level: 1 }),
        pNumbered('2.', `Cara Pengadaan: Ditetapkan dilaksanakan melalui ${paket.cara_pengadaan} berpedoman pada ketentuan Pasal 18 Peraturan Presiden Nomor 16 Tahun 2018 jo. Peraturan Presiden Nomor 46 Tahun 2025, karena komoditas barang yang dibutuhkan diproduksi dan didistribusikan oleh Pelaku Usaha berbadan hukum/badan usaha yang kompeten.`, { level: 1 }),
        pNumbered('3.', `Metode Pemilihan Penyedia: Ditetapkan menggunakan ${paket.metode_pemilihan} (${paket.fitur_spse || 'Katalog Elektronik Versi 6'}) berpedoman pada Pasal 38 ayat (1) huruf a dan Pasal 38 ayat (2) Peraturan Presiden Nomor 16 Tahun 2018 jo. Peraturan Presiden Nomor 46 Tahun 2025 serta Keputusan Kepala LKPP Nomor 177 Tahun 2024. Pelaksana pemilihan ditetapkan Pejabat Pengadaan Satker KPU Kabupaten Ngawi karena nilai paket pengadaan s.d. Rp 200.000.000,00 (Dua Ratus Juta Rupiah).`, { level: 1 }),
        pNumbered('4.', `Bentuk Kontrak: Ditetapkan berupa ${paket.bentuk_kontrak || 'Surat Pesanan'} dengan Jenis Kontrak ${paket.jenis_kontrak || 'Lumsum'}, mengacu pada ketentuan Pasal 27 Perpres PBJ sebagai instrumen perikatan resmi untuk transaksi E-Purchasing pada Katalog Elektronik.`, { level: 1 }),
        pNumbered('5.', `Kertas Kerja Penetapan Harga: Ditetapkan menyusun ${paket.jenis_kertas_harga || 'HPS'} (karena Pagu Anggaran ${formatRupiah(paket.nilai_pagu)} > Rp 100 Juta, wajib menyusun HPS resmi pada Tahap 6).`, { level: 1 }),
        pNumbered('6.', `Pemaketan Pengadaan: Dilakukan secara cermat dan bertanggung jawab dengan berorientasi pada keluaran/output, ketersediaan pelaku usaha terdaftar di Katalog Elektronik, komitmen pengutamaan Produk Dalam Negeri (PDN), alokasi Usaha Mikro, Kecil, dan Koperasi (UMK-Koperasi), serta ditegaskan TIDAK MEMECAH PENGADAAN untuk menghindari Tender/Seleksi atau merekayasa batas kewenangan pengadaan.`, { level: 1 })
      );
      break;

    case 3:
      paragraphs.push(
        pText('A. PENETAPAN RENCANA UMUM PENGADAAN (RUP) OLEH KUASA PENGGUNA ANGGARAN', { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `Berdasarkan hasil penyusunan perencanaan pengadaan yang diajukan oleh Pejabat Pembuat Komitmen (PPK), Kuasa Pengguna Anggaran (KPA) Satuan Kerja KPU Kabupaten Ngawi dengan ini MENETAPKAN Rencana Umum Pengadaan (RUP) untuk paket pekerjaan "${paket.nama_paket}" dengan Kode RUP: ${paket.kode_rup || 'RUP-2026-657811-01'} dan Pagu Anggaran sebesar ${formatRupiah(paket.nilai_pagu)} (${terbilangRupiah(paket.nilai_pagu)}) yang bersumber dari DIPA Satker KPU Kabupaten Ngawi Tahun Anggaran ${paket.tahun_anggaran || '2026'} (Mata Anggaran: MAK ${paket.kode_akun_mak}).`, { level: 1 }),
        pNumbered('2.', `Kuasa Pengguna Anggaran (KPA) telah MENGUMUMKAN Rencana Umum Pengadaan (RUP) paket ini secara resmi dan terbuka kepada masyarakat pada portal Sistem Informasi Rencana Umum Pengadaan (SiRUP LKPP) sesuai batas waktu dan ketentuan peraturan perundang-undangan.`, { level: 1 }),
        pNumbered('3.', `Menugaskan Pejabat Pembuat Komitmen (PPK) untuk melaksanakan tahapan persiapan pengadaan barang/jasa selanjutnya (penyusunan spesifikasi teknis/KAK, penetapan HPS, dan rancangan kontrak) berpedoman pada RUP yang telah ditetapkan dan diumumkan ini.`, { level: 1 }),
        pNumbered('4.', `Bukti tangkapan layar (screenshot) dan cetak status paket "Terumumkan" pada aplikasi SiRUP LKPP terlampir dan menjadi bagian yang tidak terpisahkan dari Surat Penetapan ini.`, { level: 1 })
      );
      break;

    case 4:
      paragraphs.push(
        pText(`A. KERANGKA ACUAN KERJA (KAK), SPESIFIKASI TEKNIS & KEPATUHAN TKDN`, { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `Ruang Lingkup & Latar Belakang: ${paket.uraian_pekerjaan || paket.nama_paket}. Kebutuhan ini didasarkan pada Formulir Identifikasi Kebutuhan dan Telaah Kelayakan BMN guna menjamin keandalan sistem pemrosesan data pemilih dan operasional KPU Kabupaten Ngawi.`, { level: 1 }),
        pNumbered('2.', `Kewajiban Pengutamaan Produk Dalam Negeri (PDN) & TKDN: Berpedoman pada Pasal 66 Peraturan Presiden Nomor 46 Tahun 2025, paket ini ditetapkan pada ${paket.prioritas_pdn_level} dengan Komitmen Target: ${paket.target_sertifikat_tkdn || ('TKDN ' + (paket.persen_tkdn_target || 42.5) + '% + BMP ' + (paket.persen_bmp_target || 10) + '%')}. Kewajiban ini mengikat sepanjang tersedia sekurang-kurangnya 3 (tiga) produk atau penyedia dalam negeri yang memenuhi spesifikasi teknis fungsional kebutuhan KPU.`, { level: 1 }),
        pNumbered('3.', `Waktu Pelaksanaan Pekerjaan: Selama ${paket.masa_pelaksanaan_hari} (${terbilangRupiah(paket.masa_pelaksanaan_hari).replace(' Rupiah', '')}) hari kalender terhitung sejak penerbitan Surat Pesanan (SP), mencakup pengiriman, perakitan/instalasi, konfigurasi RAID, uji coba fungsional, dan serah terima hasil pekerjaan.`, { level: 1 }),
        pNumbered('4.', `Jaminan Kualitas, Garansi & Layanan Purna Jual: Barang yang diserahkan wajib 100% Baru (Brand New in Box), bergaransi resmi pabrikan/distributor Indonesia (minimal 3 tahun onsite untuk server dan minimal 1 tahun onsite untuk workstation), serta menggunakan Sistem Operasi asli (Windows Server 2025 Standard dan Windows 11 Pro) yang teraktivasi secara legal.`, { level: 1 }),
        pNumbered('5.', `Klausul DED & SMKK: Sesuai Lampiran II Peraturan LKPP Nomor 3 Tahun 2026, persyaratan Detailed Engineering Design (DED) dan Dokumen Rancangan Konseptual SMKK dinyatakan TIDAK DIPERSYARATKAN (N/A) karena paket ini merupakan Pengadaan Barang.`, { level: 1 }),
        pText('B. TABEL RINCIAN SPESIFIKASI TEKNIS & KINERJA FUNGSIONAL BARANG', { bold: true, before: 100, after: 30 })
      );
      if (items && items.length) {
        items.forEach((it, idx) => {
          paragraphs.push(
            pNumbered(`${idx + 1}.`, `${it.uraian_item} (Kuantitas: ${it.volume} ${it.satuan})`, { bold: true, level: 1 }),
            pText(`Spesifikasi Teknis: ${it.spesifikasi_teknis || 'Sesuai standar fungsional KAK PPK.'}`, { italic: true, before: 10, after: 30, left: 360 })
          );
        });
      }

      const isBelanjaModal = String(paket.kode_akun_mak || '').startsWith('53');
      paragraphs.push(
        pText('C. SPESIFIKASI PENATAUSAHAAN BMN DAN REKONSILIASI APLIKASI SAKTI', { bold: true, before: 100, after: 30 }),
        pNumbered('1.', `Klasifikasi Penatausahaan Aset BMN: Berdasarkan Mata Anggaran Kegiatan (MAK ${paket.kode_akun_mak}), pengadaan ini diklasifikasikan sebagai ${isBelanjaModal ? 'Belanja Modal / Aset Tetap Intrakomptabel (PMK 181/PMK.06/2016 jo. PMK 47/2021)' : 'Belanja Barang / Ekstrakomptabel / Persediaan SAKTI'}.`, { level: 1 }),
        pNumbered('2.', isBelanjaModal
          ? `Kewajiban BMN Aset Tetap: Seluruh perangkat wajib dicatatkan ke dalam Aplikasi SAKTI Modul Aset Tetap (Peralatan dan Mesin Kodefikasi SIMAN/SAKTI: 3.10.01.02.xxx). Penyedia wajib melampirkan daftar nomor seri pabrik (Serial Number) per unit, faktur pajak resmi, petunjuk operasional, dan Berita Acara Penerimaan Barang yang memuat NUP sementara untuk rekonsiliasi BMN oleh Pengelola BMN Subbag KUL sebelum pembubuhan stiker/label barcode BMN.`
          : `Kewajiban BMN Ekstrakomptabel: Barang dicatatkan pada Modul Persediaan SAKTI dan didistribusikan menggunakan Surat Bukti Barang Keluar (SBBK) Persediaan.`, { level: 1 }),

        pText('D. SPESIFIKASI LAYANAN PURNA JUAL & SERVICE LEVEL AGREEMENT (SLA)', { bold: true, before: 100, after: 30 }),
        pNumbered('1.', `Jangka Waktu Garansi Resmi: Garansi resmi pabrikan/distributor tunggal di Indonesia minimal 3 (tiga) tahun Layanan di Tempat (3 Years Onsite Service NBD) untuk PC Server Tower dan minimal 1 (satu) tahun Layanan di Tempat untuk PC Workstation, mencakup penggantian suku cadang asli dan jasa teknisi di Kantor KPU Kabupaten Ngawi.`, { level: 1 }),
        pNumbered('2.', `Service Level Agreement (SLA): Penyedia wajib merespons aduan gangguan teknis selambat-lambatnya 1 x 24 jam hari kerja. Apabila penanganan jarak jauh tidak berhasil, teknisi wajib tiba di lokasi Kantor KPU Kabupaten Ngawi selambat-lambatnya 2 x 24 jam.`, { level: 1 }),
        pNumbered('3.', `Penggantian Unit Rusak Cacat Pabrik (Dead on Arrival - DOA): Apabila unit mengalami kerusakan fungsi atau cacat produksi dalam kurun waktu 14 (empat belas) hari kalender sejak uji coba fungsional, penyedia wajib melakukan penggantian unit baru (one-to-one unit replacement), bukan sekadar reparasi komponen.`, { level: 1 }),

        pText('E. SPESIFIKASI LEGALITAS LISENSI PERANGKAT LUNAK & HAK CIPTA', { bold: true, before: 100, after: 30 }),
        pNumbered('1.', `Keaslian Lisensi Software: Sistem operasi Microsoft Windows Server 2025 Standard dan Microsoft Windows 11 Pro wajib berupa lisensi asli (Original Equipment Manufacturer / Fully Packaged Product) yang teraktivasi resmi secara daring ke server prinsipal, bebas dari perangkat lunak ilegal/bajakan (Anti-Piracy Compliance).`, { level: 1 }),
        pNumbered('2.', `Pelepasan Tuntutan Hak Cipta (Indemnification): Penyedia menjamin bahwa seluruh barang dan perangkat lunak yang diserahkan bebas dari sengketa hak kekayaan intelektual (HAKI/paten), dan membebaskan KPU Kabupaten Ngawi dari segala bentuk gugatan hukum pihak ketiga.`, { level: 1 }),

        pText('F. SPESIFIKASI PENGADAAN BERKELANJUTAN (GREEN PROCUREMENT) & K3', { bold: true, before: 100, after: 30 }),
        pNumbered('1.', `Efisiensi Energi (Pasal 67 Perpres 46/2025): Catu daya (Power Supply) wajib memiliki sertifikasi efisiensi minimal 80 Plus Platinum (atau setara Energy Star) guna meminimalkan konsumsi energi listrik dan disipasi panas di ruang server KPU.`, { level: 1 }),
        pNumbered('2.', `Kenyamanan Akustik & Lingkungan: Emisi kebisingan kipas pendingin pada workstation saat beban normal di bawah 45 dB (desibel) dan komponen bebas dari zat berbahaya (RoHS Compliant).`, { level: 1 }),

        pText('G. SPESIFIKASI PENGEMASAN, PENGIRIMAN & UJI FUNGSI', { bold: true, before: 100, after: 30 }),
        pNumbered('1.', `Kondisi Fisik: Barang diserahkan dalam keadaan 100% Baru (Brand New In Box - BNIB), kemasan asli tersegel pabrik dengan pelindung busa guncangan dan plastik kedap air.`, { level: 1 }),
        pNumbered('2.', `Penyerahan Franco KPU Ngawi: Seluruh biaya pengangkutan, asuransi barang selama ekspedisi, dan biaya bongkar muat di Kantor KPU Kabupaten Ngawi ditanggung sepenuhnya oleh penyedia.`, { level: 1 }),
        pNumbered('3.', `Uji Fungsi (Testing & Commissioning): Serah terima fisik wajib disertai uji fungsi menyeluruh (pemeriksaan perangkat keras, konfigurasi RAID mirroring, uji nyala 24 jam, dan uji kecepatan komputasi) yang dituangkan dalam Berita Acara Uji Fungsi bersama Tim Teknis KPU Ngawi.`, { level: 1 })
      );
      break;

    case 5:
      paragraphs.push(
        pText('A. BERITA ACARA ANALISA PASAR & DOKUMEN PENILAIAN PPK ATAS KATALOG ELEKTRONIK', { bold: true, before: 120, after: 20 }),
        pText(`${infoHari.kalimatFormal}, Pejabat Pembuat Komitmen (PPK) ${settings.nama_satker} telah melaksanakan Analisa Pasar dan Penilaian PPK atas ketersediaan barang/jasa pada Katalog Elektronik sesuai Pasal 8 Peraturan LKPP Nomor 2 Tahun 2026:`, { before: 10, after: 30 }),
        pNumbered('1.', `Status Ketersediaan pada Katalog Elektronik v6: ${paket.tersedia_di_katalog}.`, { level: 1 }),
        pNumbered('2.', `Hasil Penilaian PPK & Pertimbangan Teknis/Pasar: ${paket.alasan_penilaian_ppk_katalog || 'Produk tersedia dan memenuhi spesifikasi teknis, volume, waktu, serta efisiensi harga.'}`, { level: 1 }),
        pNumbered('3.', `Tautan / Referensi Produk Katalog Pembanding: ${paket.link_produk_katalog_1 || '-'} ${paket.link_produk_katalog_2 ? 'dan ' + paket.link_produk_katalog_2 : ''}.`, { level: 1 })
      );
      break;

    case 6:
      paragraphs.push(
        pText(`A. PENETAPAN ${paket.jenis_kertas_harga.toUpperCase()}${isKonstruksi ? ' BERBASIS ENGINEER ESTIMATE (EE) & AHSP' : ''}`, { bold: true, before: 120, after: 20 }),
        pText(`${infoHari.kalimatFormal}, PPK menetapkan ${paket.jenis_kertas_harga} untuk paket "${paket.nama_paket}" sebesar ${formatRupiah(paket.nilai_hps)} (${terbilangRupiah(paket.nilai_hps)}) sudah termasuk pajak-pajak yang berlaku${isKonstruksi ? ' dan Biaya Penerapan SMKK (Keselamatan Konstruksi)' : ''}.`, { before: 10, after: 30 }),
        pNumbered('1.', `Penyusunan ${paket.jenis_kertas_harga} telah memperhitungkan harga pasar setempat Kabupaten Ngawi, referensi harga Katalog Elektronik, Standar Biaya Masukan (SBM), serta kewajiban perpajakan sesuai ketentuan yang berlaku.`, { level: 1 }),
        pNumbered('2.', `Dasar Hukum: Pasal 26 Perpres Nomor 46 Tahun 2025, Pasal 9 Peraturan LKPP Nomor 2 Tahun 2026, serta ${isKonstruksi ? 'Lampiran II/III' : 'Lampiran I'} Peraturan LKPP Nomor 3 Tahun 2026.`, { level: 1 })
      );
      break;

    case 7:
      paragraphs.push(
        pText('A. RANCANGAN KONTRAK, SSUK, DAN SYARAT-SYARAT KHUSUS KONTRAK (SSKK)', { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `Jenis Kontrak: ${paket.jenis_kontrak} | Bentuk Kontrak: ${paket.bentuk_kontrak} (Pasal 27 & Pasal 28 Perpres Nomor 46 Tahun 2025; Pengadaan Langsung Pekerjaan Konstruksi s.d. Rp400 Juta menggunakan SPK).`, { level: 1 }),
        pNumbered('2.', `Ketentuan Uang Muka (Pasal 29 Perpres 46/2025): Persentase Uang Muka ditetapkan sebesar ${paket.persen_uang_muka || 0}% (${formatRupiah(keu.nilaiUangMuka)}). Apabila Penyedia Usaha Mikro/Kecil mengajukan Uang Muka untuk kontrak > Rp50 Juta, PPK memberikan minimal 50% (untuk kontrak Rp50–200 Juta) atau minimal 30% (untuk kontrak > Rp200 Juta s.d. Rp2,5 Miliar).`, { level: 1 }),
        pNumbered('3.', `Sanksi Denda Keterlambatan: ditetapkan sebesar 1‰ (satu permil) per hari dari ${paket.basis_denda || 'nilai kontrak sebelum PPN'}.${isKonstruksi ? ' Untuk Pekerjaan Konstruksi berlaku Masa Pemeliharaan minimal 180 hari kalender (6 bulan) untuk pekerjaan permanen atau 90 hari kalender (3 bulan) untuk semi-permanen dengan Retensi Pemeliharaan 5% (Rp ' + keu.nilaiRetensi5Persen.toLocaleString('id-ID') + ') atau Jaminan Pemeliharaan 5%.' : ''}`, { level: 1 })
      );
      break;

    case 8:
      paragraphs.push(
        pText('A. SURAT PERMINTAAN PEMILIHAN & BERITA ACARA REVIU DOKUMEN PERSIAPAN PENGADAAN (DPP)', { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `PPK menyerahkan Dokumen Persiapan Pengadaan (DPP) yang terdiri atas KAK/Spesifikasi Teknis${isKonstruksi ? '/DED & Rancangan Konseptual SMKK' : ''}, ${paket.jenis_kertas_harga}, dan Rancangan Kontrak (${paket.bentuk_kontrak}) kepada ${paket.pelaksana_pemilihan} (${pejabatPengadaan.nama_lengkap || 'Pejabat Pengadaan'}) untuk dilaksanakan proses pemilihan penyedia sesuai ketentuan Peraturan LKPP Nomor 2 Tahun 2026 dan Nomor 3 Tahun 2026.`, { level: 1 }),
        pNumbered('2.', `Berdasarkan hasil Reviu DPP, dokumen persiapan dinyatakan lengkap, memenuhi ketentuan prioritas PDN/TKDN, serta siap dilanjutkan ke tahap pemilihan/negosiasi penyedia.`, { level: 1 })
      );
      break;

    case 9:
      paragraphs.push(
        pText('A. BERITA ACARA EVALUASI, KLARIFIKASI, NEGOSIASI TEKNIS/HARGA & HASIL PEMILIHAN (BAHPL / BAHP / E-PURCHASING)', { bold: true, before: 120, after: 20 }),
        pText(`${infoHari.kalimatFormal}, telah dilaksanakan evaluasi kualifikasi (${isKonstruksi ? 'NIB, SBU Jasa Konstruksi, Sisa Kemampuan Paket SKP = KP - P, dan Rencana Keselamatan Konstruksi / RKK' : 'NIB, KBLI, dan Spesifikasi Teknis'}) serta klarifikasi dan negosiasi teknis dan harga terhadap Calon Penyedia: ${penyedia.nama_perusahaan || '-'} (${penyedia.alamat || 'Ngawi'}, NPWP: ${penyedia.npwp || '-'}).`, { before: 10, after: 30 }),
        pNumbered('1.', `Nilai ${paket.jenis_kertas_harga}: ${formatRupiah(paket.nilai_hps)}.`, { level: 1 }),
        pNumbered('2.', `Nilai Penawaran Awal Penyedia: ${formatRupiah(paket.nilai_penawaran_awal || paket.nilai_hps)}.`, { level: 1 }),
        pNumbered('3.', `Nilai Hasil Negosiasi Akhir yang Disepakati: ${formatRupiah(paket.nilai_kontrak)} (${terbilangRupiah(paket.nilai_kontrak)}), menghasilkan efisiensi sebesar ${formatRupiah(keu.efisiensiTerhadapHps)}.`, { level: 1 })
      );
      break;

    case 10:
      paragraphs.push(
        pText('A. BERITA ACARA REVIU HASIL PEMILIHAN OLEH PPK & DEKLARASI BENEFICIAL OWNERSHIP (BO)', { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `PPK telah melakukan reviu atas Berita Acara Hasil Pemilihan dan menyatakan bahwa proses pemilihan telah sesuai dengan Dokumen Persiapan Pengadaan (DPP) serta nilai hasil negosiasi tidak melampaui Pagu/HPS.`, { level: 1 }),
        pNumbered('2.', `Validasi Pemilik Manfaat (Beneficial Ownership / BO) sesuai Pasal 8 Peraturan LKPP Nomor 3 Tahun 2026: Pemilik Manfaat tercatat atas nama ${penyedia.bo_nama_pemilik_manfaat || penyedia.nama_direktur || '-'} (NIK: ${penyedia.bo_nik_pemilik_manfaat || penyedia.nik_direktur || '-'}, Status: ${penyedia.bo_hubungan || 'Pemilik Langsung'}) serta tidak masuk dalam Daftar Hitam Nasional.`, { level: 1 })
      );
      break;

    case 11:
      paragraphs.push(
        pText('A. SURAT PENUNJUKAN PENYEDIA BARANG/JASA (SPPBJ) & VERIFIKASI JAMINAN PELAKSANAAN', { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `PPK menunjuk Penyedia: ${penyedia.nama_perusahaan} (Direktur/Penandatangan: ${penyedia.nama_direktur}) untuk melaksanakan pekerjaan "${paket.nama_paket}" dengan nilai kontrak sebesar ${formatRupiah(paket.nilai_kontrak)} (${terbilangRupiah(paket.nilai_kontrak)}).`, { level: 1 }),
        pNumbered('2.', `Kewajiban Jaminan Pelaksanaan 5% (Pasal 16 Perlem 2/2026 & Perlem 3/2026): ${paket.wajib_jaminan_pelaksanaan ? 'Wajib menyerahkan Jaminan Pelaksanaan 5% sebesar ' + formatRupiah(keu.nilaiJaminanPelaksanaan) : 'Dikecualikan dari Jaminan Pelaksanaan sesuai ketentuan nilai/jenis pengadaan (Pengadaan Langsung B/JL s.d. Rp200 Juta, Pengadaan Langsung Konstruksi s.d. Rp400 Juta, atau Jasa Konsultansi)'}.`, { level: 1 })
      );
      break;

    case 12:
      paragraphs.push(
        pText('A. BERITA ACARA RAPAT PERSIAPAN PENANDATANGANAN KONTRAK (PRE-AWARD MEETING)', { bold: true, before: 120, after: 30 }),
        pText(`${infoHari.kalimatFormal}, PPK dan Penyedia (${penyedia.nama_perusahaan}) telah melaksanakan Rapat Persiapan Penandatanganan Kontrak dengan kesepakatan finalisasi naskah ${paket.bentuk_kontrak}, jadwal pelaksanaan selama ${paket.masa_pelaksanaan_hari} hari kalender, nomor rekening pembayaran (${penyedia.nama_bank} No. Rek: ${penyedia.no_rekening} a.n. ${penyedia.atas_nama_rekening}),${isKonstruksi ? ' reviu Rencana Keselamatan Konstruksi (RKK),' : ''} serta kesiapan pelaksanaan pekerjaan.`, { before: 10, after: 30 }),
        pText(`Kedua belah pihak telah memeriksa kesesuaian spesifikasi teknis, kuantitas item, kewajiban perpajakan, serta sanksi keterlambatan sebelum penandatanganan naskah perikatan.`, { before: 10, after: 30 })
      );
      break;

    case 13:
      paragraphs.push(
        pText(`A. NASKAH KONTRAK FINAL: ${paket.bentuk_kontrak.toUpperCase()} (${paket.jenis_kontrak.toUpperCase()})`, { bold: true, before: 120, after: 30 }),
        pText(`${infoHari.kalimatFormal}, yang bertanda tangan di bawah ini:`, { before: 10, after: 20 }),
        pNumbered('I.', `${ppk.nama_lengkap}, NIP. ${ppk.nip}, Pejabat Pembuat Komitmen ${settings.nama_satker}, berkedudukan di ${settings.alamat_satker}, selanjutnya disebut PIHAK KESATU (PPK); dan`, { level: 1 }),
        pNumbered('II.', `${penyedia.nama_direktur}, ${penyedia.jabatan_penandatangan} ${penyedia.nama_perusahaan}, NPWP ${penyedia.npwp}, Akta/NIB/SBU: ${penyedia.no_akta_pendirian || penyedia.nib}, berkedudukan di ${penyedia.alamat}, selanjutnya disebut PIHAK KEDUA (PENYEDIA).`, { level: 1 }),
        pText(`Kedua belah pihak sepakat mengikatkan diri dalam ${paket.bentuk_kontrak} untuk melaksanakan paket "${paket.nama_paket}" dengan Nilai Kontrak sebesar ${formatRupiah(paket.nilai_kontrak)} (${terbilangRupiah(paket.nilai_kontrak)}) selama ${paket.masa_pelaksanaan_hari} hari kalender (${formatTanggalIndo(paket.tgl_mulai_kerja)} s.d. ${formatTanggalIndo(paket.tgl_selesai_kontrak)}).`, { before: 20, after: 40 })
      );
      break;

    case 14:
      paragraphs.push(
        pText(`A. PENYERAHAN LOKASI KERJA${isKonstruksi ? ' (MC-0)' : ''}, SPMK / SPP, PROGRAM MUTU${isKonstruksi ? ', RKK, BPJS KONSTRUKSI' : ''} & PCM`, { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `PPK menyerahkan lokasi kerja kepada ${penyedia.nama_perusahaan} dan memerintahkan untuk memulai pelaksanaan pekerjaan terhitung mulai tanggal ${formatTanggalIndo(paket.tgl_mulai_kerja)} s.d. ${formatTanggalIndo(paket.tgl_selesai_kontrak)} (${paket.masa_pelaksanaan_hari} hari kalender) sesuai Program Mutu${isKonstruksi ? ' dan Rencana Keselamatan Konstruksi (RKK)' : ''} yang telah disahkan dalam Rapat Persiapan Pelaksanaan Kontrak (PCM).`, { level: 1 }),
        pNumbered('2.', `Penyedia menyatakan sanggup menyelesaikan dan menyerahkan seluruh barang/jasa tepat waktu sesuai spesifikasi teknis yang ditetapkan dalam kontrak.`, { level: 1 })
      );
      if (isKonstruksi) {
        paragraphs.push(
          pNumbered('3.', `Khusus Pekerjaan Konstruksi (Lampiran II Bab VII Perlem 3/2026): Penyedia telah menyerahkan bukti pembayaran BPJS Ketenagakerjaan Sektor Jasa Konstruksi paling lambat 1 (satu) hari kerja sebelum mobilisasi, serta melaksanakan pemeriksaan bersama awal (Mutual Check 0% / MC-0).`, { level: 1 })
        );
      }
      break;

    case 15:
      paragraphs.push(
        pText('A. LAPORAN PENGENDALIAN PELAKSANAAN KONTRAK, ADENDUM/CCO, & PEMANTAUAN KONTRAK KRITIS (SCM)', { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `Realisasi fisik pelaksanaan pekerjaan mencapai 100% sesuai spesifikasi teknis dan kuantitas kontrak pada tanggal ${formatTanggalIndo(paket.tgl_realisasi_selesai)}.`, { level: 1 }),
        pNumbered('2.', `Jumlah hari keterlambatan: ${keu.hariTerlambat} hari kalender (Denda keterlambatan 1‰: ${formatRupiah(keu.totalDenda)}).`, { level: 1 }),
        pNumbered('3.', `Pengendalian Kontrak Kritis${isKonstruksi ? ' (Periode I rencana fisik 0-70% batas kritis deviasi 10%; Periode II rencana fisik 70-100% batas kritis deviasi 5%)' : ''}: ${paket.catatan_khusus_ppk || 'Pelaksanaan berjalan tertib sesuai ketentuan kontrak.'}`, { level: 1 })
      );
      break;

    case 16:
      paragraphs.push(
        pText(`A. BERITA ACARA PEMERIKSAAN HASIL PEKERJAAN (BAPHP) & SERAH TERIMA PEKERJAAN (${isKonstruksi ? 'BAST PERTAMA / PHO & BAST AKHIR / FHO' : 'BAST PPK - PENYEDIA'})`, { bold: true, before: 120, after: 30 }),
        pText(`${infoHari.kalimatFormal}, Pejabat Pembuat Komitmen (PPK) ${settings.nama_satker} (${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'}) telah melakukan pemeriksaan fisik, kuantitas, dan spesifikasi atas pekerjaan "${paket.nama_paket}" yang dilaksanakan oleh ${penyedia.nama_perusahaan}, dengan kesimpulan: PEKERJAAN TELAH SELESAI 100% (SERATUS PERSEN) DALAM KONDISI BAIK DAN SESUAI KONTRAK.`, { before: 10, after: 30 }),
        pText(`Selanjutnya PIHAK KEDUA (${penyedia.nama_perusahaan}) menyerahkan hasil pekerjaan kepada PIHAK KESATU (PPK ${settings.nama_satker}).`, { before: 10, after: 30 })
      );
      if (isKonstruksi) {
        paragraphs.push(
          pText(`Ketentuan Masa Pemeliharaan Konstruksi (PHO ke FHO): Terhitung sejak tanggal Serah Terima Pertama Pekerjaan (Provisional Hand-Over / PHO), Penyedia wajib melaksanakan pemeliharaan hasil pekerjaan selama Masa Pemeliharaan (minimal 180 hari kalender untuk pekerjaan permanen atau 90 hari kalender untuk pekerjaan semi-permanen) hingga ditandatanganinya Berita Acara Serah Terima Akhir Pekerjaan (Final Hand-Over / FHO).`, { before: 10, after: 30 })
        );
      }
      break;

    case 17:
      paragraphs.push(
        pText('A. BERITA ACARA SERAH TERIMA PPK KEPADA KPA (INPUT BMN/PERSEDIAAN SAKTI) & BERITA ACARA PEMBAYARAN (BAP / SPBy)', { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `Penyerahan Aset/Barang/Bangunan: PPK menyerahkan hasil pengadaan kepada Kuasa Pengguna Anggaran / Sekretaris KPU Kabupaten Ngawi (${kpa.nama_lengkap}) untuk dicatat dalam penatausahaan BMN / Persediaan pada aplikasi SAKTI.`, { level: 1 }),
        pNumbered('2.', `Perhitungan Pencairan Tagihan Pembayaran (SPBy / SPP-LS):`, { level: 1 }),
        pNumbered('•', `Nilai Bruto Kontrak : ${formatRupiah(keu.nilaiKontrak)}`, { level: 2 }),
        pNumbered('•', `Dasar Pengenaan Pajak (DPP) : ${formatRupiah(keu.dpp)}`, { level: 2 }),
        pNumbered('•', `Potongan PPN (${paket.tarif_ppn}%) : ${formatRupiah(keu.ppn)}`, { level: 2 }),
        pNumbered('•', `Potongan ${paket.jenis_pph} : ${formatRupiah(keu.pph)}`, { level: 2 }),
        pNumbered('•', `Potongan Denda Keterlambatan (1‰ x ${keu.hariTerlambat} hari) : ${formatRupiah(keu.totalDenda)}`, { level: 2 }),
        ...(isKonstruksi ? [
          pNumbered('•', `Nilai Retensi Pemeliharaan 5% Konstruksi : ${formatRupiah(keu.nilaiRetensi5Persen)} (Apabila ditahan Retensi 5% maka dibayar 95% saat PHO yaitu ${formatRupiah(keu.nilaiBersihDenganRetensi5)}; apabila menyerahkan Jaminan Pemeliharaan 5% maka dibayar 100% yaitu ${formatRupiah(keu.nilaiBersihDiterimaPenyedia)})`, { level: 2 })
        ] : []),
        pNumbered('•', `NILAI BERSIH DITERIMA PENYEDIA (NETTO 100%) : ${formatRupiah(keu.nilaiBersihDiterimaPenyedia)} (${terbilangRupiah(keu.nilaiBersihDiterimaPenyedia)}) melalui ${penyedia.nama_bank} No. Rek: ${penyedia.no_rekening} a.n. ${penyedia.atas_nama_rekening}.`, { level: 2, bold: true })
      );
      break;

    case 18:
    default:
      paragraphs.push(
        pText('A. FORMULIR & SERTIFIKAT PENILAIAN KINERJA PENYEDIA OLEH PPK (BAB V PERLEM LKPP 3/2026)', { bold: true, before: 120, after: 30 }),
        pText(`Berdasarkan hasil pelaksanaan kontrak dan BAST Nomor ${ctx.tahaps.find(t => t.no_tahap === 16)?.nomor_dokumen || '-'}, PPK melakukan evaluasi kinerja terhadap Penyedia ${penyedia.nama_perusahaan} dengan rincian nilai:`, { before: 10, after: 30 }),
        pNumbered('1.', `Aspek Kualitas dan Kuantitas (Bobot 30%) : Skor ${paket.skor_kualitas ?? 3} -> Nilai Terbobot: ${(Number(paket.skor_kualitas ?? 3) * 0.3).toFixed(2)}`, { level: 1 }),
        pNumbered('2.', `Aspek Biaya (Bobot 20%) : Skor ${paket.skor_biaya ?? 3} -> Nilai Terbobot: ${(Number(paket.skor_biaya ?? 3) * 0.2).toFixed(2)}`, { level: 1 }),
        pNumbered('3.', `Aspek Waktu (Bobot 30%) : Skor ${paket.skor_waktu ?? 3} -> Nilai Terbobot: ${(Number(paket.skor_waktu ?? 3) * 0.3).toFixed(2)}`, { level: 1 }),
        pNumbered('4.', `Aspek Layanan (Bobot 20%) : Skor ${paket.skor_layanan ?? 3} -> Nilai Terbobot: ${(Number(paket.skor_layanan ?? 3) * 0.2).toFixed(2)}`, { level: 1 }),
        pText(`TOTAL SKOR KINERJA AKHIR: ${Number(paket.nilai_kinerja_akhir || 3).toFixed(2)} — PREDIKAT: ${(paket.predikat_kinerja || 'SANGAT BAIK').toUpperCase()} (${Number(paket.nilai_kinerja_akhir || 3) >= 2.5 ? 'Memenuhi syarat Repeat Order sesuai Pasal 38 Perpres 46/2025' : 'Catatan Evaluasi'}).`, { bold: true, before: 40 })
      );
      break;
  }

  return paragraphs;
}

/**
 * Bagian B pada Halaman 1: Klausul Kepatuhan Hukum, Integritas & Pertanggungjawaban Kontrak/Pengadaan
 * Menjamin Halaman 1 terisi proporsional & berwibawa sebelum Halaman 2 (Tabel Rincian Item & Tanda Tangan)
 */
function buildStageLegalComplianceSection(stageNo, ctx, tahapRow, keu) {
  const { paket, penyedia, settings } = ctx;
  if (stageNo === 3) {
    return [
      pText('B. DASAR HUKUM DAN TANGGUNG JAWAB KUASA PENGGUNA ANGGARAN', { bold: true, before: 120, after: 30 }),
      pNumbered('1.', `Kewenangan penetapan dan pengumuman RUP ini berpedoman pada Pasal 9 ayat (1) huruf c dan huruf d juncto Pasal 10 ayat (1) Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah sebagaimana telah diubah terakhir dengan Peraturan Presiden Nomor 46 Tahun 2025, serta Pasal 5, Pasal 7, dan Pasal 8 Peraturan Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah (LKPP) Nomor 11 Tahun 2021 tentang Pedoman Perencanaan Pengadaan Barang/Jasa Pemerintah.`, { level: 1 }),
      pNumbered('2.', `Kuasa Pengguna Anggaran (KPA) bertanggung jawab secara formal dan materiil atas kebenaran penetapan Rencana Umum Pengadaan (RUP) ini sesuai DIPA dan Rencana Kerja Anggaran (RKA) Satker KPU Kabupaten Ngawi Tahun Anggaran ${paket.tahun_anggaran || '2026'}.`, { level: 1 })
    ];
  }
  return [
    pText('B. DASAR HUKUM, KETENTUAN KEPATUHAN, DAN INTEGRITAS PENGADAAN', { bold: true, before: 120, after: 30 }),
    pNumbered('1.', `Pelaksanaan tahapan ini berpedoman pada Peraturan Presiden Nomor 16 Tahun 2018 sebagaimana telah diubah terakhir dengan Peraturan Presiden Nomor 46 Tahun 2025 tentang Pengadaan Barang/Jasa Pemerintah, serta Peraturan LKPP Nomor 2 Tahun 2026 dan Peraturan LKPP Nomor 3 Tahun 2026.`, { level: 1 }),
    pNumbered('2.', `Para pihak yang terlibat dalam tahapan "${DEFINISI_18_TAHAP.find(d => d.no === stageNo)?.nama || ''}" pada Satker ${settings.nama_satker} terikat pada Pakta Integritas, bebas dari benturan kepentingan (conflict of interest), serta bertanggung jawab secara formal dan materiil atas kebenaran data, spesifikasi teknis, kewajaran harga, dan ketepatan mutu pekerjaan.`, { level: 1 }),
    pNumbered('3.', `Rincian komposisi item barang/jasa, spesifikasi teknis, capaian TKDN/PDN, serta nilai pengesahan tercantum secara lengkap dan mengikat pada Tabel Rincian Item Barang/Jasa di lembar pengesahan berikutnya.`, { level: 1 })
  ];
}

/**
 * DOKUMEN KHUSUS TAHAP 1: IDENTIFIKASI KEBUTUHAN BARANG/JASA (3-BAGIAN RESMI + AUDIT SHEET)
 * Mengacu PKPU No. 14/2020 & Standar Format Baku Lampiran I Peraturan LKPP No. 2/2026
 * 1. Nota Dinas Pengusul (Subbag PIC diketahui Ketua Divisi Terkait kepada KPA)
 * 2. Lembar Disposisi KPA (KPA Sekretaris KPU kepada PPK)
 * 3. Formulir Identifikasi Kebutuhan PBJ (Penetapan TUNGGAL oleh PPK)
 * 4. Lembar Catatan Referensi Regulasi & Audit Internal PBJ (Non-Cetak Resmi)
 */
function buildStage1Sections(ctx, tahapRow, keu, isFirstStageInDoc = true) {
  const { paket, items, subbag, ppk, kpa, settings } = ctx;
  const sb = subbag || {};
  const kasubagNama = sb.kasubag_nama || 'MOHAMMAD NOOR JIHAN';
  const kasubagNip = sb.kasubag_nip || '19840101 200912 1 001';
  const kasubagJabatan = sb.kasubag_jabatan || `Kepala Subbagian ${paket.pic_subbag || 'Perencanaan, Data dan Informasi'}`;
  const komisionerNama = sb.komisioner_nama || 'PUTRA ADI WIBOWO SW';
  const komisionerJabatan = sb.komisioner_jabatan || `Ketua Divisi ${paket.pic_subbag || 'Perencanaan, Data dan Informasi'}`;

  const noNota = paket.no_nota_dinas_pengusul || `001/ND.${paket.pic_subbag || 'RENDATIN'}/KPU-Kab-014.329781/V/2026`;
  const tglNotaStr = formatTanggalIndo(paket.tgl_nota_dinas_pengusul || '2026-05-04');
  const perihalNota = paket.perihal_nota_dinas || `Usulan Kebutuhan Pengadaan ${paket.nama_paket || 'Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi TA 2026'}`;
  const noDisp = paket.no_disposisi_kpa || '042/AGD-KPA/V/2026';
  const tglDispStr = formatTanggalIndo(paket.tgl_disposisi_kpa || paket.tgl_nota_dinas_pengusul || '2026-05-04');
  const noIdk = tahapRow.nomor_dokumen || `001/IDK/${paket.kode_paket_internal || "PBJ-2026-008"}/PPK-PBJ/KPU-NGW/V/2026`;
  const tglIdkStr = formatTanggalIndo(tahapRow.tanggal_dokumen || '2026-05-05');
  const hariTanggalIdk = formatHariTanggalBeritaAcara(tahapRow.tanggal_dokumen || '2026-05-05');

  const children = [];

  // =========================================================================
  // DOKUMEN 1: NOTA DINAS PENGUSULAN KEBUTUHAN PENGADAAN (SUBBAG PIC + DIVISI)
  // =========================================================================
  children.push(...buildKopSuratKpu(settings));
  children.push(
    pText('NOTA DINAS', { bold: true, size: 24, align: AlignmentType.CENTER, before: 30, after: 10 }),
    pText(`Nomor: ${noNota}`, { size: 18, align: AlignmentType.CENTER, color: '475569', before: 0, after: 120 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Yth.', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Kuasa Pengguna Anggaran (KPA) KPU Kabupaten Ngawi', { bold: true, size: 19 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Dari', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(`${kasubagJabatan} (${kasubagNama})`, { size: 19 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Mengetahui', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(`${komisionerJabatan} (${komisionerNama})`, { bold: true, size: 19, color: '1E3A8A' })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Tanggal', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(tglNotaStr, { size: 19 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Sifat', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Penting / Segera', { size: 19 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Hal', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 19 })] }),
            new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(perihalNota, { bold: true, size: 19, color: '0F172A' })] })
          ]
        })
      ]
    }),
    pText('', { after: 60, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' } } }),
    pText('Bersama ini kami sampaikan dengan hormat usulan kebutuhan pengadaan barang modal guna menunjang kelancaran tugas pokok kedinasan Komisi Pemilihan Umum Kabupaten Ngawi Tahun Anggaran ' + (paket.tahun_anggaran || '2026') + ', dengan rincian pertimbangan sebagai berikut:'),
    pNumbered('1.', `Dasar Kebutuhan: ${paket.uraian_pekerjaan || 'Perangkat pendukung kerja operasional yang ada saat ini telah melewati batas usia teknis ekonomis sehingga memerlukan peremajaan/pengadaan baru guna menjamin kestabilan dan kelancaran proses kerja.'}`, { level: 1 }),
    pNumbered('2.', `Rincian Usulan Barang: Kebutuhan pengadaan "${paket.nama_paket}" meliputi ${items && items.length ? items.map(it => `${it.volume || 1} ${it.satuan || 'Unit'} ${it.uraian_item || ''}`).join(', ') : 'peralatan operasional sesuai rincian KAK'}.`, { level: 1 }),
    pNumbered('3.', 'Pembebanan Anggaran (Silsilah RKB/DIPA Definitif): Alokasi anggaran telah dialokasikan secara sah pada dokumen perencanaan anggaran definitif Satuan Kerja KPU Kabupaten Ngawi Tahun Anggaran ' + (paket.tahun_anggaran || '2026') + ' dengan rincian hierarki:', { level: 1 }),
    pNumbered('a.', `Program : ${paket.rkb_program || 'Program Penyelenggaraan Pemilu dalam Proses Konsolidasi Demokrasi'}`, { level: 2 }),
    pNumbered('b.', `Kegiatan : ${paket.rkb_kegiatan || 'Pengelolaan dan Pelayanan Sistem Informasi dan Data Pemilih (SIDALIH)'}`, { level: 2 }),
    pNumbered('c.', `Sub Kegiatan / Komponen : ${paket.rkb_subkegiatan || paket.rkb_komponen || 'Pemeliharaan dan Pengadaan Sarana Pengolah Data Operasional Pemilu'}`, { level: 2 }),
    pNumbered('d.', `Mata Anggaran Kegiatan (MAK) : ${paket.kode_akun_mak || '532111'} – ${paket.nama_akun_mak || 'Belanja Modal Peralatan dan Mesin'}`, { level: 2, bold: true }),
    pNumbered('e.', `Nilai Pagu Anggaran : ${formatRupiah(paket.nilai_pagu)} (${terbilangRupiah(paket.nilai_pagu)}).`, { level: 2, bold: true }),
    pNumbered('4.', 'Target Waktu Pemanfaatan: Barang/jasa ditargetkan telah terpasang, teruji fungsinya, dan siap dioperasikan secara penuh mulai Bulan Juli 2026 guna mendukung agenda tahapan kepemiluan dan operasional satker.', { level: 1 }),
    pText('Sehubungan dengan hal tersebut di atas, mohon perkenan Bapak Kuasa Pengguna Anggaran (KPA) menyetujui usulan ini dan mendisposisikan kepada Pejabat Pembuat Komitmen (PPK) untuk diproses tahapan pengadaannya sesuai ketentuan perundang-undangan.'),
    pText('Demikian nota dinas ini kami sampaikan, atas perkenan dan arahan Bapak diucapkan terima kasih.', { before: 40, after: 100 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                pText('Mengetahui,', { align: AlignmentType.CENTER, before: 10, after: 10 }),
                pText(komisionerJabatan, { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, before: 0, after: 420 }),
                pText(`( ${komisionerNama} )`, { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText('Anggota KPU Kab. Ngawi', { align: AlignmentType.CENTER, before: 0, after: 10 })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                pText('Yang Mengajukan,', { align: AlignmentType.CENTER, before: 10, after: 10 }),
                pText(kasubagJabatan, { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, before: 0, after: 420 }),
                pText(`( ${kasubagNama} )`, { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText(`NIP. ${kasubagNip}`, { align: AlignmentType.CENTER, before: 0, after: 10 })
              ]
            })
          ]
        })
      ]
    }),
    pText('', { after: 120, pageBreakBefore: true })
  );

  // =========================================================================
  // DOKUMEN 2: LEMBAR DISPOSISI KPA KEPADA PPK
  // =========================================================================
  children.push(...buildKopSuratKpu(settings));
  children.push(
    pText('LEMBAR DISPOSISI KUASA PENGGUNA ANGGARAN (KPA)', { bold: true, size: 22, align: AlignmentType.CENTER, before: 30, after: 10 }),
    pText('Pengesahan Usulan Pengadaan Barang/Jasa Pemerintah', { size: 17, align: AlignmentType.CENTER, color: '475569', before: 0, after: 100 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('Surat Dari', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 44, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(`${kasubagJabatan} (${kasubagNama}) / Mengetahui ${komisionerJabatan} (${komisionerNama})`, { size: 17 })] }),
            new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('Tgl Surat', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(tglNotaStr, { size: 17 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('Nomor Surat', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, columnSpan: 3, children: [pText(noNota, { size: 17 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('Hal / Perihal', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, columnSpan: 3, children: [pText(perihalNota, { bold: true, size: 17, color: '0F172A' })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('Diterima Tanggal', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(tglDispStr, { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('No. Agenda', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(noDisp, { size: 17 })] })
          ]
        })
      ]
    }),
    pText('', { after: 40 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('DITERUSKAN KEPADA:', { bold: true, color: 'FFFFFF', size: 17 })] }),
            new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('DISPOSISI / PETUNJUK KPA:', { bold: true, color: 'FFFFFF', size: 17 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: BORDER_TABLE,
              children: [
                pText('☑ Pejabat Pembuat Komitmen (PPK)', { bold: true, color: '1E3A8A', size: 17 }),
                pText('☐ Pejabat Pengadaan (PP)', { size: 17 }),
                pText('☐ Bendahara Pengeluaran', { size: 17 }),
                pText('☐ Kasubbag Keuangan, Umum & Logistik (KUL)', { size: 17 }),
                pText('☐ Arsip / File', { size: 17 })
              ]
            }),
            new TableCell({
              borders: BORDER_TABLE,
              children: [
                pText('☑ SETUJU UNTUK DIPROSES PENGADAANNYA', { bold: true, color: '047857', size: 17 }),
                pText('Catatan Instruksi KPA:', { bold: true, size: 16, before: 20 }),
                pNumbered('1.', `Segera susun Identifikasi Kebutuhan, KAK, dan HPS mengacu pada DIPA TA ${paket.tahun_anggaran || '2026'} Akun ${paket.kode_akun_mak || '532111'} (Pagu ${formatRupiah(paket.nilai_pagu)}).`, { level: 1, size: 15, hanging: 300, left: 300 }),
                pNumbered('2.', 'Jadwalkan seluruh rangkaian pengadaan, pengiriman, dan instalasi tuntas pada akhir Juni 2026 agar target pemanfaatan operasional per 1 Juli 2026 terpenuhi.', { level: 1, size: 15, bold: true, color: '1E3A8A', hanging: 300, left: 300 }),
                pNumbered('3.', 'Prioritaskan metode E-Purchasing (Katalog Elektronik v6) sesuai Kepka LKPP No. 177/2024.', { level: 1, size: 15, hanging: 300, left: 300 }),
                pNumbered('4.', 'Wajib penuhi afirmasi UMK minimal 40% dan prioritas PDN/TKDN minimal 25%.', { level: 1, size: 15, hanging: 300, left: 300 }),
                pNumbered('5.', 'Laksanakan seluruh tahapan secara transparan, tertib, dan akuntabel.', { level: 1, size: 15, hanging: 300, left: 300 })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              borders: BORDER_TABLE,
              children: [pText(`Tanggal Penyelesaian Disposisi: ${tglDispStr}`, { italic: true, size: 15, color: '64748B' })]
            }),
            new TableCell({
              borders: BORDER_TABLE,
              children: [
                pText(`Ngawi, ${tglDispStr}`, { align: AlignmentType.CENTER, before: 10, after: 10 }),
                pText('Kuasa Pengguna Anggaran (KPA)', { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, before: 0, after: 420 }),
                pText(`( ${kpa.nama_lengkap || 'BUDI RAHAYU'} )`, { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText(`NIP. ${kpa.nip || '19830503 200902 1 002'}`, { align: AlignmentType.CENTER, before: 0, after: 10 })
              ]
            })
          ]
        })
      ]
    }),
    pText('', { after: 120, pageBreakBefore: true })
  );

  // =========================================================================
  // DOKUMEN 3: FORMULIR ANALISIS KETERSEDIAAN BARANG SEJENIS (BMN EKSISTING)
  // Sesuai Pasal 18 Perpres PBJ & Pedoman Teknis Perlem LKPP Perencanaan Pengadaan
  // =========================================================================
  const noBmnForm = `001/BMN-IDK-${String(paket.id || 1).padStart(3, '0')}/PPK-PBJ/KPU-NGW/V/2026`;
  const tglTelaahStr = formatTanggalIndo(paket.tgl_nota_dinas_pengusul || '2026-05-04');
  const bmnPengelolaNama = 'NURFANTI SULISTYO  W';
  const bmnPengelolaNip = '198410122010122002';
  const bmnPengelolaJabatan = 'Kepala Subbagian Keuangan, Umum dan Logistik (Pengelola BMN)';

  children.push(...buildKopSuratKpu(settings));
  children.push(
    pText('FORMULIR ANALISIS KETERSEDIAAN BARANG SEJENIS & TELAAH BMN EKSISTING', { bold: true, size: 21, align: AlignmentType.CENTER, before: 20, after: 10 }),
    pText('(Lampiran Wajib Identifikasi Kebutuhan Berdasarkan Pasal 18 Perpres PBJ & Pedoman Teknis Perlem LKPP)', { size: 16, italic: true, align: AlignmentType.CENTER, color: '475569', before: 0, after: 60 }),
    pText(`Nomor Berkas Telaah: ${noBmnForm}`, { bold: true, size: 18, align: AlignmentType.CENTER, color: '1E3A8A', before: 0, after: 100 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Satuan Kerja / Kode', { bold: true, size: 17 })] }),
            new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('KPU KABUPATEN NGAWI / 657811', { bold: true, size: 17 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nama Paket Pengadaan', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional', { bold: true, size: 17, color: '0F172A' })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Mata Anggaran / Pagu DIPA', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`MAK ${paket.kode_akun_mak || '532111'} (${paket.nama_akun_mak || 'Belanja Modal Peralatan Komputer Server'}) / ${formatRupiah(paket.nilai_pagu)}`, { size: 17 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Unit Pengusul (User)', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Subbagian ${paket.pic_subbag || 'Perencanaan, Data dan Informasi (RENDATIN)'}`, { size: 17 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Dasar Hukum Pemeriksaan', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [
              pNumbered('1.', 'Pasal 18 ayat (1) & (2) Perpres No. 16/2018 jo. Perpres No. 12/2021 jo. Perpres No. 46/2025 (Kewajiban analisis ketersediaan barang/jasa sejenis yang dimiliki satker).', { level: 1, hanging: 300, size: 15, before: 2, after: 2 }),
              pNumbered('2.', 'Peraturan LKPP No. 11/2021 jo. Perlem LKPP No. 2/2026 (Model Dokumen Perencanaan Pengadaan - Formulir Identifikasi Kebutuhan).', { level: 1, hanging: 300, size: 15, before: 2, after: 2 }),
              pNumbered('3.', 'PP No. 27/2014 jo. PP No. 28/2020 tentang Pengelolaan BMN/D & Standar Barang Standar Kebutuhan (SBSK) DJKN Kemenkeu.', { level: 1, hanging: 300, size: 15, before: 2, after: 2 })
            ] })
          ]
        })
      ]
    }),
    pText('A. TABEL ANALISIS KETERSEDIAAN BARANG SEJENIS EKSISTING DI SATKER', { bold: true, size: 18, color: '1E3A8A', before: 100, after: 30 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('No', { bold: true, size: 15, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Uraian Barang Sejenis', { bold: true, size: 15, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Kode BMN & NUP', { bold: true, size: 15, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Jml / Thn', { bold: true, size: 15, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Kondisi Fisik', { bold: true, size: 15, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Status Utilisasi', { bold: true, size: 15, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Standar (SBSK)', { bold: true, size: 15, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Gap', { bold: true, size: 15, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Tindak Lanjut', { bold: true, size: 15, color: 'FFFFFF', align: AlignmentType.CENTER })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('1', { size: 15, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('PC Server Tower Database SIDALIH / SIKAP', { size: 15 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('3.10.01.02.001\nNUP: 0001', { size: 14 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('1 Unit\n(TA 2019)', { size: 14, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Rusak Berat\n(Mati Total)', { size: 14, bold: true, color: '991B1B', align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Motherboard terbakar, suku cadang discontinued, tidak layak operasi.', { size: 14 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('1 Unit Server Berkinerja Tinggi', { size: 14 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Kurang 1 Unit', { size: 14, bold: true, color: '1E3A8A', align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Penggantian Baru (Replacement) & usulkan lelang BMN', { size: 14 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('2', { size: 15, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('PC Workstation Admin Pengolah Data', { size: 15 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('3.10.01.02.002\nNUP: 0003-0005', { size: 14 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('3 Unit\n(TA 2018)', { size: 14, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Rusak Ringan /\nUsang', { size: 14, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Overcapacity, sering freeze, tidak kompatibel Win 11 & SIDALIH v5.', { size: 14 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('3 Unit Workstation Min. Core i7', { size: 14 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Kurang 3 Unit', { size: 14, bold: true, color: '1E3A8A', align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Penggantian Baru & unit lama dialihkan arsip statis offline', { size: 14 })] })
          ]
        })
      ]
    }),
    pText('B. KESIMPULAN HASIL TELAAH PPK & PENGELOLA BMN', { bold: true, size: 18, color: '1E3A8A', before: 90, after: 30 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('1. Sifat Kebutuhan Pengadaan', { bold: true, size: 17 })] }),
            new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(paket.bmn_sifat_kebutuhan === 'PENGGANTIAN' ? 'PENGGANTIAN (REPLACEMENT) ASET USANG / RUSAK BERAT' : (paket.bmn_sifat_kebutuhan || 'PENGGANTIAN'), { bold: true, size: 17, color: '166534' })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('2. Kesesuaian RKBMN & SBSK', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(paket.bmn_kesesuaian_rkbmn || 'Tercantum dalam Rencana Kebutuhan BMN (RKBMN) KPU Kabupaten Ngawi TA 2026 dan memenuhi SBSK DJKN Kemenkeu.', { size: 17 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('3. Catatan Telaah Analisis BMN', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(paket.bmn_catatan_telaah || 'Berdasarkan data SIMAN/SAKTI BMN, server eksisting tidak ekonomis diperbaiki dan tidak mampu menampung beban kerja Pemilu 2026. Direkomendasikan penggantian unit baru.', { size: 16 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('4. Rekomendasi Kelayakan', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('MEMENUHI SYARAT REGULASI DAN LAYAK DILANJUTKAN ke tahapan penetapan Formulir Identifikasi Kebutuhan, Penyusunan KAK, dan HPS.', { bold: true, size: 17, color: '1E3A8A' })] })
          ]
        })
      ]
    }),
    pText('', { after: 60 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                pText('Telah Diverifikasi Oleh:', { align: AlignmentType.CENTER, before: 10, after: 10 }),
                pText(bmnPengelolaJabatan, { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, before: 0, after: 420 }),
                pText(`( ${bmnPengelolaNama} )`, { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText(`NIP. ${bmnPengelolaNip}`, { align: AlignmentType.CENTER, before: 0, after: 10 })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                pText(`Ditetapkan di Ngawi, ${tglTelaahStr}`, { align: AlignmentType.CENTER, before: 10, after: 10 }),
                pText('Pejabat Pembuat Komitmen (PPK)', { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, before: 0, after: 420 }),
                pText(`( ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'} )`, { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText(`NIP. ${ppk.nip || '19840101 200912 1 001'}`, { align: AlignmentType.CENTER, before: 0, after: 10 })
              ]
            })
          ]
        })
      ]
    }),
    pText('', { after: 120, pageBreakBefore: true })
  );

  // =========================================================================
  // DOKUMEN 4: FORMULIR IDENTIFIKASI KEBUTUHAN BAKU LKPP PERLEM 2/2026
  // =========================================================================
  children.push(...buildKopSuratKpu(settings));
  children.push(
    pText('FORMULIR IDENTIFIKASI KEBUTUHAN BARANG/JASA PEMERINTAH', { bold: true, size: 22, align: AlignmentType.CENTER, before: 30, after: 10 }),
    pText('TAHAP 1 (FASE I: PERENCANAAN PENGADAAN) — REGULASI PERPRES NO. 46/2025', { size: 17, align: AlignmentType.CENTER, color: '1E3A8A', before: 0, after: 30 }),
    pText(`Nomor: ${noIdk}`, { size: 18, align: AlignmentType.CENTER, color: '475569', before: 0, after: 100 }),
    pText(`${hariTanggalIdk.kalimatFormal}, yang bertanda tangan di bawah ini telah melakukan identifikasi kebutuhan pengadaan barang/jasa sebagai berikut:`),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('No', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 34, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Parameter Identifikasi Kebutuhan', { bold: true, color: 'FFFFFF' })] }),
            new TableCell({ width: { size: 60, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Keterangan & Rincian Data Kebutuhan', { bold: true, color: 'FFFFFF' })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('1', { align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Nama Kebutuhan Barang/Jasa', { bold: true })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional', { bold: true, color: '0F172A' })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('2', { align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Fungsi dan Manfaat Operasional', { bold: true })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(paket.uraian_pekerjaan || 'Mendukung stabilitas pemrosesan data kedinasan, rekapitulasi data kepemiluan, dan kelancaran operasional satker KPU Kabupaten Ngawi.')] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('3', { align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Target Pengguna (End-User)', { bold: true })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Subbagian ${paket.pic_subbag || 'RENDATIN'} serta Operator Sistem Informasi dan Staf Pelaksana KPU Kabupaten Ngawi.`)] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('4', { align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Waktu Pemanfaatan Barang', { bold: true })] }),
            new TableCell({
              borders: BORDER_TABLE,
              children: [
                pText('Mulai Bulan Juli 2026 sampai dengan jangka panjang (usia teknis ekonomis minimal 5 tahun: 2026 s.d. 2031).', { bold: true, color: '0F172A' }),
                pText(`Catatan Penjadwalan: Diusulkan pada ${tglNotaStr} dengan estimasi siklus pengadaan (persiapan, pemilihan e-purchasing, pengiriman pabrikan, instalasi jaringan, uji fungsi/commissioning, serah terima BAST, dan pencatatan BMN SAKTI) selesai pada akhir Juni 2026, sehingga siap dimanfaatkan secara operasional penuh untuk mendukung tahapan Pemutakhiran Data Pemilih Berkelanjutan (PDPB) Semester II TA ${paket.tahun_anggaran || '2026'}.`, { size: 16, color: '334155', before: 20 })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('5', { align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Rincian Kuantitas & Spesifikasi', { bold: true })] }),
            new TableCell({
              borders: BORDER_TABLE,
              children: (items && items.length)
                ? items.map(it => pText(`• ${it.volume || 1} ${it.satuan || 'Unit'} ${it.uraian_item || ''}: ${it.spesifikasi_teknis || 'Spesifikasi standar KAK'}.`, { size: 17 }))
                : [
                    pText('• 1 (satu) Unit PC Server Tower: Intel Xeon E-2324G, 32GB RAM ECC, 2x 1TB SSD RAID-1, Redundant PSU, Windows Server 2025.'),
                    pText('• 3 (tiga) Unit PC Workstation Admin: Intel Core i7-14700, 16GB RAM, 512GB SSD, Monitor 24" IPS, Windows 11 Pro.')
                  ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('6', { align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Persyaratan Mutu & Kualitas', { bold: true })] }),
            new TableCell({
              borders: BORDER_TABLE,
              children: [
                pNumbered('1.', 'Produk 100% orisinil bergaransi resmi pabrikan minimal 3 tahun onsite.', { level: 1, hanging: 300, size: 17, before: 2, after: 2 }),
                pNumbered('2.', 'Wajib memenuhi sertifikasi TKDN minimal 25% (TKDN + BMP >= 40%).', { level: 1, hanging: 300, size: 17, before: 2, after: 2 })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('7', { align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Ketersediaan Sumber Dana & DIPA', { bold: true })] }),
            new TableCell({
              borders: BORDER_TABLE,
              children: [
                pNumbered('•', `Sumber Dana: APBN DIPA KPU Kabupaten Ngawi TA ${paket.tahun_anggaran || '2026'}`, { level: 1, hanging: 240, size: 17, before: 2, after: 2 }),
                pNumbered('•', `Program: ${paket.rkb_program || 'Program Penyelenggaraan Pemilu dalam Proses Konsolidasi Demokrasi'}`, { level: 1, hanging: 240, size: 17, before: 2, after: 2 }),
                pNumbered('•', `Kegiatan: ${paket.rkb_kegiatan || 'Pengelolaan dan Pelayanan Sistem Informasi dan Data Pemilih (SIDALIH)'}`, { level: 1, hanging: 240, size: 17, before: 2, after: 2 }),
                pNumbered('•', `Sub Kegiatan / Komponen: ${paket.rkb_subkegiatan || paket.rkb_komponen || 'Pemeliharaan dan Pengadaan Sarana Pengolah Data Operasional Pemilu'}`, { level: 1, hanging: 240, size: 17, before: 2, after: 2 }),
                pNumbered('•', `Kode Akun MAK: ${paket.kode_akun_mak || '532111'} – ${paket.nama_akun_mak || 'Belanja Modal Peralatan dan Mesin'}`, { level: 1, hanging: 240, size: 17, bold: true, before: 2, after: 2 }),
                pNumbered('•', `Nilai Pagu Sah: ${formatRupiah(paket.nilai_pagu)} (${terbilangRupiah(paket.nilai_pagu)})`, { level: 1, hanging: 240, size: 17, bold: true, color: '047857', before: 2, after: 2 })
              ]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('8', { align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Pencatatan Barang Milik Negara (BMN)', { bold: true })] }),
            new TableCell({
              borders: BORDER_TABLE,
              children: [
                pText(String(paket.kode_akun_mak || '').startsWith('53') ? 'Wajib dicatat pada Buku Kuasa Pengguna Barang (SIMAK-BMN SAKTI) sebagai Aset Tetap Peralatan dan Mesin.' : 'Wajib dicatat dalam Modul Persediaan / Beban Pemakaian SAKTI.')
              ]
            })
          ]
        })
      ]
    }),
    pText('', { after: 60 }),
    pText('Demikian formulir identifikasi kebutuhan ini ditetapkan dengan sebenar-benarnya untuk dipergunakan sebagai dasar penyusunan KAK/Spesifikasi Teknis, HPS, dan rencana pengadaan berikutnya.', { after: 100 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 50, type: WidthType.PERCENTAGE }, children: [pText(' ')] }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                pText('Ditetapkan di Ngawi', { align: AlignmentType.CENTER, before: 10, after: 10 }),
                pText(`Pada tanggal ${tglIdkStr}`, { align: AlignmentType.CENTER, before: 0, after: 40 }),
                pText('Pejabat Pembuat Komitmen (PPK)', { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, before: 0, after: 420 }),
                pText(`( ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'} )`, { bold: true, align: AlignmentType.CENTER, before: 0, after: 10 }),
                pText(`NIP. ${ppk.nip || '19840101 200912 1 001'}`, { align: AlignmentType.CENTER, before: 0, after: 10 })
              ]
            })
          ]
        })
      ]
    })
  );

  return [
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }
        },
        titlePage: true
      },
      headers: {
        default: new Header({
          children: [
            pText('SI-PRABU v3.0 — Dokumen Resmi Tahap 1: Identifikasi Kebutuhan & Disposisi KPA | KPU Ngawi', {
              italic: true,
              size: 16,
              color: '64748B',
              align: AlignmentType.RIGHT,
              before: 0,
              after: 40
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 40, after: 0 },
              children: [
                new TextRun({ text: 'Halaman ', size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ text: ' dari ', size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748B', font: 'Cambria' })
              ]
            })
          ]
        }),
        first: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 40, after: 0 },
              children: [
                new TextRun({ text: 'Halaman ', size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ text: ' dari ', size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748B', font: 'Cambria' })
              ]
            })
          ]
        })
      },
      children
    }
  ];
}

/**
 * DOKUMEN KHUSUS TAHAP 2: BERITA ACARA PENETAPAN JENIS, CARA PENGADAAN, & PEMAKETAN PBJ (BA-PMK)
 * Sesuai Pasal 18, 20, 21, 22, 27, 28, & 65 Perpres No. 16/2018 jo. Perpres No. 46/2025
 * Format Baku Resmi KPU Kabupaten Ngawi — 1 Halaman Utuh Rapi & Berwibawa Siap Cetak/TTD
 */
function buildStage2Sections(ctx, tahapRow, keu, isFirstStageInDoc = true) {
  const { paket, ppk, settings } = ctx;
  const noPmk = tahapRow.nomor_dokumen || `002/PMK/${paket.kode_paket_internal || "PBJ-2026-001"}/PPK-PBJ/KPU-NGW/V/2026`;
  const tglPmkStr = formatTanggalIndo(tahapRow.tanggal_dokumen || '2026-05-18');
  const hariTanggalPmk = formatHariTanggalBeritaAcara(tahapRow.tanggal_dokumen || '2026-05-18');

  const children = [];

  // Kop Surat Resmi KPU Kabupaten Ngawi
  children.push(...buildKopSuratKpu(settings));

  // Judul & Nomor Berita Acara
  children.push(
    pText('BERITA ACARA PENETAPAN JENIS, CARA PENGADAAN, & PEMAKETAN (BA-PMK)', {
      bold: true,
      size: 22,
      align: AlignmentType.CENTER,
      before: 30,
      after: 8
    }),
    pText('DOKUMEN TAHAP 02 (FASE I: PERENCANAAN PENGADAAN) — REGULASI PERPRES NO. 46/2025', {
      size: 16,
      align: AlignmentType.CENTER,
      color: '1E3A8A',
      bold: true,
      before: 0,
      after: 20
    }),
    pText(`Nomor: ${noPmk}`, {
      size: 18,
      align: AlignmentType.CENTER,
      color: '475569',
      bold: true,
      before: 0,
      after: 80
    }),
    pText(
      `${hariTanggalPmk.kalimatFormal}, bertempat di Kantor Komisi Pemilihan Umum Kabupaten Ngawi, saya yang bertanda tangan di bawah ini:`,
      { before: 0, after: 40, size: 18 }
    ),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Nama', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN', { bold: true, size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_NONE, children: [pText('NIP', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(':', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(ppk.nip || '19840101 200912 1 001', { size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_NONE, children: [pText('Jabatan Kedinasan', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(':', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(`Pejabat Pembuat Komitmen (PPK) Satker ${settings.nama_satker || 'KPU Kabupaten Ngawi'}`, { size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_NONE, children: [pText('Dasar Pengangkatan', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(':', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(`Keputusan Kuasa Pengguna Anggaran (KPA) Satker ${settings.nama_satker || 'KPU Kabupaten Ngawi'} Tahun Anggaran ${paket.tahun_anggaran || '2026'}`, { size: 18 })] })
          ]
        })
      ]
    }),
    pText('', { after: 30 }),
    pText('Berdasarkan Rencana Kerja dan Anggaran serta DIPA Satuan Kerja yang telah disahkan, dengan ini menetapkan parameter jenis, cara pengadaan, dan strategi pemaketan untuk paket pengadaan di bawah ini:', { before: 10, after: 40, size: 18 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        pLabelValue('Nama Paket Pengadaan', paket.nama_paket),
        pLabelValue('Mata Anggaran (MAK DIPA)', `${paket.kode_akun_mak || '532111'} – ${paket.nama_akun_mak || 'Belanja Modal Peralatan dan Mesin'}`),
        pLabelValue('Nilai Pagu Anggaran DIPA', `${formatRupiah(paket.nilai_pagu)} (${terbilangRupiah(paket.nilai_pagu)})`),
        pLabelValue('Sumber Dana / TA', `APBN DIPA Satker ${settings.nama_satker || 'KPU Kabupaten Ngawi'} TA ${paket.tahun_anggaran || '2026'}`),
        pLabelValue('Pelaksana Pemilihan', `${paket.pelaksana_pemilihan || 'Pejabat Pengadaan'} ${settings.nama_satker || 'KPU Kabupaten Ngawi'}`)
      ]
    }),
    pText('', { after: 40 }),
    pText('BUTIR-BUTIR PENETAPAN STRATEGIS PEMAKETAN (PPK):', { bold: true, size: 18, color: '1E3A8A', before: 16, after: 10 }),
    pNumbered('1.', `Jenis Pengadaan: Ditetapkan sebagai ${paket.jenis_pengadaan || 'Barang'} (berpedoman pada Pasal 12 Perpres 16/2018 jo. Perpres 46/2025 dan Perlem LKPP Nomor 2 Tahun 2026).`, { level: 1, size: 16.5, before: 4, after: 4 }),
    pNumbered('2.', `Cara Pengadaan: Ditetapkan dilaksanakan melalui ${paket.cara_pengadaan || 'Penyedia'} berpedoman pada ketentuan Pasal 18 Perpres 16/2018 jo. Perpres 46/2025.`, { level: 1, size: 16.5, before: 0, after: 4 }),
    pNumbered('3.', `Metode Pemilihan Penyedia: Ditetapkan menggunakan ${paket.metode_pemilihan || 'E-Purchasing'} (${paket.fitur_spse || 'Katalog Elektronik LKPP v6'}) berpedoman pada ketentuan Pasal 38 ayat (1) huruf a dan ayat (2) Perpres PBJ serta Kepka LKPP No. 177/2024. Pelaksana pemilihan adalah Pejabat Pengadaan Satker KPU Kabupaten Ngawi karena nilai paket s.d. Rp 200.000.000,00.`, { level: 1, size: 16.5, before: 0, after: 4 }),
    pNumbered('4.', `Bentuk Kontrak & Bukti Transaksi: Ditetapkan menggunakan ${paket.bentuk_kontrak || 'Surat Pesanan'} dengan Jenis Kontrak: ${paket.jenis_kontrak || 'Lumsum'} (Pasal 27 & 28 Perpres PBJ).`, { level: 1, size: 16.5, before: 0, after: 4 }),
    pNumbered('5.', `Kertas Kerja Harga: Ditetapkan menyusun ${paket.jenis_kertas_harga || 'HPS'} (karena Pagu Anggaran ${formatRupiah(paket.nilai_pagu)} > Rp 100 Juta, wajib menyusun HPS resmi pada Tahap 6).`, { level: 1, size: 16.5, before: 0, after: 4 }),
    pNumbered('6.', `Pemaketan Pengadaan: Berorientasi pada keluaran (output), kepatuhan alokasi kuota minimal 40% anggaran belanja untuk Produk Usaha Mikro, Usaha Kecil & Koperasi (UMK) sesuai Pasal 65 Perpres 46/2025, komitmen TKDN/PDN, serta dipastikan tidak memecah paket pengadaan untuk menghindari kewajiban Tender terbuka.`, { level: 1, size: 16.5, before: 0, after: 4 }),
    pNumbered('7.', `Landasan Kepatuhan & Integritas: Pelaksanaan tahapan ini mematuhi Pakta Integritas PBJ, bebas dari benturan kepentingan (conflict of interest), dan berpedoman pada Perpres 16/2018 jo. Perpres 46/2025.`, { level: 1, size: 16.5, before: 0, after: 14 }),
    pText('Demikian Berita Acara Penetapan Jenis, Cara Pengadaan, dan Pemaketan ini dibuat dan ditetapkan dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagai pedoman pelaksanaan tahapan pengadaan selanjutnya.', { before: 14, after: 40, size: 16.5 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 50, type: WidthType.PERCENTAGE }, children: [pText(' ')] }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                pText('Ditetapkan di Ngawi', { align: AlignmentType.CENTER, before: 10, after: 6, size: 18 }),
                pText(`Pada tanggal ${tglPmkStr}`, { align: AlignmentType.CENTER, before: 0, after: 20, size: 18 }),
                pText('PEJABAT PEMBUAT KOMITMEN (PPK)', { bold: true, align: AlignmentType.CENTER, before: 0, after: 6, size: 18 }),
                pText(settings.nama_satker || 'KPU KABUPATEN NGAWI', { bold: true, align: AlignmentType.CENTER, before: 0, after: 380, size: 18 }),
                pText(`( ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'} )`, { bold: true, align: AlignmentType.CENTER, before: 0, after: 6, size: 18 }),
                pText(`NIP. ${ppk.nip || '19840101 200912 1 001'}`, { align: AlignmentType.CENTER, before: 0, after: 6, size: 18 })
              ]
            })
          ]
        })
      ]
    })
  );

  return [
    {
      properties: {
        page: {
          margin: { top: 1200, bottom: 1200, left: 1440, right: 1200 }
        },
        titlePage: true
      },
      headers: {
        default: new Header({
          children: [
            pText('SI-PRABU v3.0 — Dokumen Resmi Tahap 2: BA Penetapan Jenis, Cara Pengadaan & Pemaketan | KPU Ngawi', {
              italic: true,
              size: 16,
              color: '64748B',
              align: AlignmentType.RIGHT,
              before: 0,
              after: 30
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 30, after: 0 },
              children: [
                new TextRun({ text: 'Halaman ', size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ text: ' dari ', size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748B', font: 'Cambria' })
              ]
            })
          ]
        }),
        first: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 30, after: 0 },
              children: [
                new TextRun({ text: 'Halaman ', size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ text: ' dari ', size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748B', font: 'Cambria' })
              ]
            })
          ]
        })
      },
      children
    }
  ];
}

/**
 * Membangun Section Word untuk 1 Tahap:
 * - Section 1 (Halaman Non-Tanda Tangan): Kop Surat, Judul, Identitas Paket, Bagian A & Bagian B (+ item awal bila > 5 item),
 *   dilengkapi **Footer Kotak Paraf** (2 Pihak jika berdua, atau Paraf Mandiri jika 1 Pejabat).
 * - Section 2 (Halaman Tanda Tangan): Bagian C Tabel Rincian Item Barang/Jasa (atau item penutup + Total Nilai),
 *   Terbilang, Kalimat Penutup, dan Blok Tanda Tangan Utuh & Sejajar, **TANPA Kotak Paraf** di footer.
 */

/**
 * DOKUMEN KHUSUS TAHAP 5: BERITA ACARA ANALISA PASAR DAN PENILAIAN PPK ATAS KATALOG ELEKTRONIK (BA-AP)
 * Berpedoman pada:
 * - Pasal 38 ayat (1) & (2) Perpres No. 16/2018 jo. Perpres No. 46/2025 (Prioritas E-Purchasing)
 * - Pasal 8 Peraturan LKPP Nomor 2 Tahun 2026 (5 Parameter Baku Kelayakan Pemilihan Produk Katalog)
 * - Keputusan Kepala LKPP Nomor 177 Tahun 2024 (Katalog Elektronik Versi 6)
 * - Keputusan KPU Nomor 1272 Tahun 2025 (Pedoman Teknis Pengadaan Barang/Jasa KPU)
 * Format Baku Resmi KPU Kabupaten Ngawi — Akuntabel, Komprehensif, Siap Audit BPK/Inspektorat
 */
function buildStage5Sections(ctx, tahapRow, keu, isFirstStageInDoc = true) {
  const { paket, items, ppk, kpa, settings } = ctx;
  const noAp = tahapRow.nomor_dokumen || `005/AP/${paket.kode_paket_internal || "PBJ-2026-001"}/PPK-PBJ/KPU-NGW/V/2026`;
  const tglApStr = formatTanggalIndo(tahapRow.tanggal_dokumen || '2026-05-18');
  const hariTanggalAp = formatHariTanggalBeritaAcara(tahapRow.tanggal_dokumen || '2026-05-18');

  const children = [];

  // 1. Kop Surat Resmi KPU Kabupaten Ngawi
  children.push(...buildKopSuratKpu(settings));

  // 2. Judul & Nomor Berita Acara
  children.push(
    pText('BERITA ACARA ANALISA PASAR DAN PENILAIAN PPK ATAS KELAYAKAN KATALOG ELEKTRONIK', {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      before: 30,
      after: 8
    }),
    pText('DOKUMEN TAHAP 05 (FASE II: PERSIAPAN PENGADAAN) — REGULASI PERPRES 46/2025 & PASAL 8 PERLEM LKPP 2/2026', {
      size: 15,
      align: AlignmentType.CENTER,
      color: '1E3A8A',
      bold: true,
      before: 0,
      after: 16
    }),
    pText(`Nomor: ${noAp}`, {
      size: 17,
      align: AlignmentType.CENTER,
      color: '475569',
      bold: true,
      before: 0,
      after: 60
    }),
    pText(
      `${hariTanggalAp.kalimatFormal}, bertempat di Kantor Komisi Pemilihan Umum Kabupaten Ngawi, saya yang bertanda tangan di bawah ini:`,
      { before: 0, after: 30, size: 18 }
    ),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Nama', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 18 })] }),
            new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN', { bold: true, size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_NONE, children: [pText('NIP', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(':', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(ppk.nip || '19840101 200912 1 001', { size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_NONE, children: [pText('Jabatan Kedinasan', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(':', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(`Pejabat Pembuat Komitmen (PPK) Satker ${settings.nama_satker || 'KPU Kabupaten Ngawi'}`, { size: 18 })] })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_NONE, children: [pText('Dasar Pengangkatan', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(':', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_NONE, children: [pText(`Keputusan Kuasa Pengguna Anggaran (KPA) Satker ${settings.nama_satker || 'KPU Kabupaten Ngawi'} Tahun Anggaran ${paket.tahun_anggaran || '2026'}`, { size: 18 })] })
          ]
        })
      ]
    }),
    pText('', { after: 20 }),
    pText('Telah melaksanakan survei pasar dan analisa teknis-harga secara cermat, independen, dan akuntabel terhadap produk-produk teknologi informasi pada platform Katalog Elektronik (E-Katalog v6 LKPP), Toko Daring, dan pasar distributor resmi untuk paket pengadaan berikut:', { before: 10, after: 30, size: 18 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        pLabelValue('Nama Paket Pengadaan', paket.nama_paket),
        pLabelValue('Mata Anggaran (MAK DIPA)', `${paket.kode_akun_mak || '532111'} – ${paket.nama_akun_mak || 'Belanja Modal Peralatan dan Mesin'}`),
        pLabelValue('Nilai Pagu Anggaran DIPA', `${formatRupiah(paket.nilai_pagu)} (${terbilangRupiah(paket.nilai_pagu)})`),
        pLabelValue('Sumber Dana / TA', `APBN DIPA Satker ${settings.nama_satker || 'KPU Kabupaten Ngawi'} TA ${paket.tahun_anggaran || '2026'}`),
        pLabelValue('Pelaksana Pemilihan', `${paket.pelaksana_pemilihan || 'Pejabat Pengadaan'} ${settings.nama_satker || 'KPU Kabupaten Ngawi'}`)
      ]
    }),
    pText('', { after: 30 }),

    // BAB I: DASAR HUKUM DAN RUANG LINGKUP ANALISA PASAR
    pText('I. DASAR HUKUM DAN RUANG LINGKUP ANALISA PASAR', { bold: true, size: 18, color: '1E3A8A', before: 16, after: 10 }),
    pNumbered('1.', 'Pasal 38 ayat (1) huruf a dan ayat (2) Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah jo. Peraturan Presiden Nomor 46 Tahun 2025 menegaskan bahwa metode E-Purchasing wajib diprioritaskan untuk barang/jasa yang telah tercantum dalam Katalog Elektronik.', { level: 1, size: 16.5, before: 3, after: 3 }),
    pNumbered('2.', 'Pasal 8 Peraturan Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah (LKPP) Nomor 2 Tahun 2026 mewajibkan Pejabat Pembuat Komitmen (PPK) melakukan penilaian kelayakan produk katalog elektronik sebelum menetapkan referensi harga/HPS dan memerintahkan pelaksanaan transaksi e-purchasing.', { level: 1, size: 16.5, before: 0, after: 3 }),
    pNumbered('3.', 'Keputusan Kepala LKPP Nomor 177 Tahun 2024 tentang Tata Cara Penyelenggaraan Katalog Elektronik Versi 6 yang menjamin tata kelola transaksi digital terintegrasi, transparan, dan dapat diverifikasi secara daring.', { level: 1, size: 16.5, before: 0, after: 3 }),
    pNumbered('4.', 'Keputusan KPU Nomor 1272 Tahun 2025 tentang Pedoman Teknis Pengadaan Barang/Jasa di Lingkungan Komisi Pemilihan Umum.', { level: 1, size: 16.5, before: 0, after: 14 }),

    // BAB II: STRATEGI PEMENUHAN PASAR (SINGLE VENDOR VS MULTI-ORDER)
    pText('II. STRATEGI PEMENUHAN PASAR & KETENTUAN MULTI-ORDER (PENYEDIA TUNGGAL VS MULTI-VENDOR)', { bold: true, size: 18, color: '1E3A8A', before: 16, after: 10 }),
    pNumbered('1.', 'Kondisi Ketersediaan Produk di Pasar Katalog: Berdasarkan penelusuran pada Katalog Elektronik v6, komoditas perangkat keras teknologi informasi terbagi dalam dua kelompok spesialisasi, yaitu penyedia server enterprise (Tier-1 global/nasional) dan penyedia PC workstation bersertifikat TKDN/PDN.', { level: 1, size: 16.5, before: 3, after: 3 }),
    pNumbered('2.', 'Skenario Pemenuhan Transaksi Pasar: PPK menetapkan 2 (dua) opsi pemenuhan yang sah secara regulasi:', { level: 1, size: 16.5, before: 0, after: 3 }),
    pNumbered('a.', 'Skenario A (Penyedia Tunggal / Agregator Multibrand): Memilih penyedia terdaftar yang berstatus authorized reseller/distributor multibrand yang mampu memasok sekaligus PC Server Tower dan PC Workstation SIDALIH dalam 1 (satu) Surat Pesanan terintegrasi.', { level: 2, size: 16, before: 0, after: 2 }),
    pNumbered('b.', 'Skenario B (Multi-Order / Multi-Vendor dalam 1 RUP): Dalam hal masing-masing penyedia terbaik di katalog hanya memiliki/menyediakan 1 (satu) jenis barang yang memenuhi 5 parameter baku, maka Pejabat Pengadaan DIBENARKAN menerbitkan 2 (dua) Surat Pesanan terpisah (SP-01 untuk Server dan SP-02 untuk Workstation) di bawah paket RUP dan DIPA yang sama.', { level: 2, size: 16, before: 0, after: 3 }),
    pNumbered('3.', 'Justifikasi Kepatuhan Regulasi (Bukan Pemecahan Paket): Pemesanan terpisah (Multi-Order) pada Skenario B secara hukum BUKAN merupakan pemecahan paket pengadaan untuk menghindari tender sebagaimana dilarang dalam Pasal 20 Perpres PBJ, melainkan implementasi prinsip Value for Money dan efisiensi belanja pemerintah, karena seluruh pesanan tetap menggunakan metode E-Purchasing yang terbuka dan transparan.', { level: 1, size: 16.5, before: 0, after: 14 }),

    // BAB III: MATRIKS KOMPARASI 3 SUMBER PASAR PER ITEM BARANG
    pText('III. MATRIKS KOMPARASI 3 SUMBER PASAR PER ITEM BARANG', { bold: true, size: 18, color: '1E3A8A', before: 16, after: 10 }),
    pText('Hasil survei perbandingan harga pasar dari 3 (tiga) sumber resmi pada platform Katalog Elektronik LKPP v6 dan distributor terpercaya:', { size: 16.5, before: 0, after: 20 })
  );

  // Buat Tabel Komparasi 3 Sumber Pasar
  const compHeaderCells = [
    new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('No', { bold: true, size: 16, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
    new TableCell({ width: { size: 27, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Uraian Item & Vol', { bold: true, size: 16, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
    new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Sumber 1 (Vendor A)', { bold: true, size: 16, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
    new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Sumber 2 (Vendor B)', { bold: true, size: 16, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
    new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Sumber 3 (Vendor C)', { bold: true, size: 16, align: AlignmentType.CENTER, color: 'FFFFFF' })] })
  ];

  const compTableRows = [new TableRow({ children: compHeaderCells })];

  let totalPasarTerendah = 0;
  (items || []).forEach((it, idx) => {
    const s1 = Number(it.harga_survei_1) || 0;
    const s2 = Number(it.harga_survei_2) || s1;
    const s3 = Number(it.harga_survei_3) || s1;
    const valid = [s1, s2, s3].filter(v => v > 0);
    const minVal = valid.length ? Math.min(...valid) : 0;
    const avgVal = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : 0;
    const totalMinItem = minVal * Number(it.volume || 1);
    totalPasarTerendah += totalMinItem;

    compTableRows.push(
      new TableRow({
        children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 16 })] }),
          new TableCell({
            borders: BORDER_TABLE,
            children: [
              pText(it.uraian_item || 'Item PBJ', { bold: true, size: 16 }),
              pText(`Vol: ${it.volume} ${it.satuan} | Spek: ${(it.spesifikasi_teknis || '-').substring(0, 75)}...`, { size: 14, color: '475569', italic: true }),
              pText(`Harga Terendah: ${formatRupiah(minVal)} / unit`, { size: 14, bold: true, color: '047857' }),
              pText(`Total Pasar: ${formatRupiah(totalMinItem)}`, { size: 14, bold: true, color: '1E3A8A' })
            ]
          }),
          new TableCell({
            borders: BORDER_TABLE,
            children: [
              pText(it.sumber_survei_1 || 'Katalog Elektronik v6', { size: 14, bold: true }),
              pText(`${formatRupiah(s1)}`, { size: 16, bold: true, color: s1 === minVal ? '047857' : '000000' }),
              pText(s1 === minVal ? '[Harga Terendah]' : '', { size: 13, bold: true, color: '047857' })
            ]
          }),
          new TableCell({
            borders: BORDER_TABLE,
            children: [
              pText(it.sumber_survei_2 || 'Vendor Pembanding B', { size: 14, bold: true }),
              pText(`${formatRupiah(s2)}`, { size: 16, bold: true, color: s2 === minVal ? '047857' : '000000' }),
              pText(s2 === minVal ? '[Harga Terendah]' : '', { size: 13, bold: true, color: '047857' })
            ]
          }),
          new TableCell({
            borders: BORDER_TABLE,
            children: [
              pText(it.sumber_survei_3 || 'Vendor Pembanding C', { size: 14, bold: true }),
              pText(`${formatRupiah(s3)}`, { size: 16, bold: true, color: s3 === minVal ? '047857' : '000000' }),
              pText(s3 === minVal ? '[Harga Terendah]' : '', { size: 13, bold: true, color: '047857' })
            ]
          })
        ]
      })
    );
  });

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: compTableRows
    }),
    pText('', { after: 20 }),
    pText(`Total Estimasi Pengadaan Pasar (Harga Terendah Terverifikasi): ${formatRupiah(totalPasarTerendah)} (${terbilangRupiah(totalPasarTerendah)}).`, { bold: true, size: 17, color: '1E3A8A', before: 6, after: 4 }),
    pText(`Potensi Efisiensi terhadap Pagu Anggaran DIPA (${formatRupiah(paket.nilai_pagu)}): Sebesar ${formatRupiah(Math.max(0, Number(paket.nilai_pagu || 0) - totalPasarTerendah))} (${Number(paket.nilai_pagu) > 0 ? (((Math.max(0, Number(paket.nilai_pagu || 0) - totalPasarTerendah)) / Number(paket.nilai_pagu)) * 100).toFixed(2) : 0}%).`, { size: 16.5, italic: true, color: '047857', before: 0, after: 16 }),

    // BAB IV: PENGUJIAN & PENILAIAN 5 PARAMETER KELAYAKAN KATALOG ELEKTRONIK
    pText('IV. PENGUJIAN DAN PENILAIAN 5 PARAMETER KELAYAKAN KATALOG ELEKTRONIK (PASAL 8 PERLEM 2/2026)', { bold: true, size: 18, color: '1E3A8A', before: 16, after: 10 }),
    pText('PPK melakukan pengujian mendalam terhadap 5 (lima) parameter baku kelayakan sebelum menetapkan kesimpulan:', { size: 16.5, before: 0, after: 20 })
  );

  // Buat Tabel 5 Parameter
  const paramHeaderCells = [
    new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('No', { bold: true, size: 16, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
    new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Parameter Baku Kelayakan', { bold: true, size: 16, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
    new TableCell({ width: { size: 48, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Uraian Pengujian & Bukti Konfirmasi Pasar', { bold: true, size: 16, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
    new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Hasil Penilaian PPK', { bold: true, size: 16, align: AlignmentType.CENTER, color: 'FFFFFF' })] })
  ];

  const paramRows = [
    new TableRow({ children: paramHeaderCells }),
    new TableRow({
      children: [
        new TableCell({ borders: BORDER_TABLE, children: [pText('1', { align: AlignmentType.CENTER, size: 16, bold: true })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('Kesesuaian Spesifikasi Teknis & Kualitas', { bold: true, size: 16 }), pText('(Pasal 8 ayat 1 huruf a)', { size: 13, italic: true, color: '64748B' })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('Produk PC Server Tower memenuhi kriteria processor enterprise multi-core, memori ECC DDR4/DDR5 32GB, konfigurasi storage RAID-1 hardware mirroring, serta dual redundant power supply. PC Workstation memenuhi processor Core i7 Gen-14, 32GB RAM, SSD NVMe 1TB, kartu grafis dedicated, dan lisensi asli Microsoft Windows Server 2025 & Windows 11 Pro.', { size: 15.5 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('MEMENUHI & SESUAI 100%', { bold: true, size: 16, color: '047857' }), pText('(Lolos Uji Teknis)', { size: 13, italic: true })] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ borders: BORDER_TABLE, children: [pText('2', { align: AlignmentType.CENTER, size: 16, bold: true })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('Ketersediaan Produk & Kepastian Stok', { bold: true, size: 16 }), pText('(Pasal 8 ayat 1 huruf b)', { size: 13, italic: true, color: '64748B' })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('Telah dilakukan konfirmasi stok daring dan surat ketersediaan produk dari distributor resmi di Jawa Timur. Seluruh item berstatus ready stock di gudang penyedia/distributor dan sanggup dikirim dalam kurun waktu pelaksanaan kontrak.', { size: 15.5 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('TERSEDIA & READY STOCK', { bold: true, size: 16, color: '047857' }), pText('(Kepastian Pasokan Terjamin)', { size: 13, italic: true })] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ borders: BORDER_TABLE, children: [pText('3', { align: AlignmentType.CENTER, size: 16, bold: true })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('Kewajaran Harga & Struktur Pembiayaan', { bold: true, size: 16 }), pText('(Pasal 8 ayat 1 huruf c)', { size: 13, italic: true, color: '64748B' })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('Harga tayang pada platform e-Katalog v6 telah diverifikasi mencakup PPN 11%, margin keuntungan wajar, biaya pengemasan, asuransi, serta ongkos kirim franco Kantor KPU Kabupaten Ngawi. Harga berada di bawah pagu anggaran DIPA dan kompetitif dibanding survei pasar ritel lokal.', { size: 15.5 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('HARGA WAJAR & EFISIEN', { bold: true, size: 16, color: '047857' }), pText('(Di Bawah Pagu Anggaran)', { size: 13, italic: true })] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ borders: BORDER_TABLE, children: [pText('4', { align: AlignmentType.CENTER, size: 16, bold: true })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('Layanan Pengiriman & SLA Waktu Kirim', { bold: true, size: 16 }), pText('(Pasal 8 ayat 1 huruf d)', { size: 13, italic: true, color: '64748B' })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('Penyedia sanggup memenuhi Service Level Agreement (SLA) waktu pengiriman maksimal 14 (empat belas) hari kalender sejak Surat Pesanan diterbitkan, lengkap dengan asuransi pengiriman serta tenaga ekspedisi terlatih untuk penanganan perangkat elektronik sensitif.', { size: 15.5 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('SANGGUP MEMENUHI SLA', { bold: true, size: 16, color: '047857' }), pText('(Maksimal 14 Hari Kalender)', { size: 13, italic: true })] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ borders: BORDER_TABLE, children: [pText('5', { align: AlignmentType.CENTER, size: 16, bold: true })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('Jaminan Layanan Purna Jual & Garansi', { bold: true, size: 16 }), pText('(Pasal 8 ayat 1 huruf e)', { size: 13, italic: true, color: '64748B' })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('Perangkat didukung sertifikat garansi resmi pabrikan/distributor tunggal di Indonesia minimal 3 (tiga) tahun layanan di tempat (3-Years Onsite Service NBD) untuk PC Server Tower dan 1 (satu) tahun onsite untuk PC Workstation, didukung Authorized Service Center resmi yang mudah dijangkau di wilayah Karesidenan Madiun / Jawa Timur.', { size: 15.5 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('GARANSI ONSITE RESMI 3 TAHUN', { bold: true, size: 16, color: '047857' }), pText('(Layanan Purna Jual Lengkap)', { size: 13, italic: true })] })
      ]
    })
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: paramRows
    }),
    pText('', { after: 20 }),

    // BAB V: KESIMPULAN DAN REKOMENDASI PPK
    pText('V. KESIMPULAN DAN REKOMENDASI PEJABAT PEMBUAT KOMITMEN (PPK)', { bold: true, size: 18, color: '1E3A8A', before: 16, after: 10 }),
    pNumbered('1.', `Status Ketersediaan: ${paket.tersedia_di_katalog || 'Ya, Tersedia & Sesuai'}. Produk yang dibutuhkan telah tayang dan terverifikasi secara sah pada platform Katalog Elektronik LKPP v6.`, { level: 1, size: 16.5, before: 3, after: 3 }),
    pNumbered('2.', 'Pemenuhan 5 Parameter Baku: Berdasarkan hasil pengujian komprehensif, seluruh item barang dinyatakan Lolos Uji 5 Parameter Baku Kelayakan sesuai Pasal 8 Peraturan LKPP Nomor 2 Tahun 2026.', { level: 1, size: 16.5, before: 0, after: 3 }),
    pNumbered('3.', 'Rekomendasi Metode Pengadaan: PPK merekomendasikan pelaksanaan pengadaan paket ini dilanjutkan melalui metode E-PURCHASING KATALOG ELEKTRONIK dengan negosiasi teknis dan harga oleh Pejabat Pengadaan Satker KPU Kabupaten Ngawi.', { level: 1, size: 16.5, before: 0, after: 3 }),
    pNumbered('4.', 'Rekomendasi Transaksi Lapangan: Pejabat Pengadaan diberikan kewenangan untuk memilih penyedia tunggal agregator (Skenario A) ATAU memproses penerbitan 2 (dua) Surat Pesanan terpisah (Skenario B: Multi-Order) demi menjamin efisiensi belanja negara dan kualitas teknis terbaik.', { level: 1, size: 16.5, before: 0, after: 3 }),
    pNumbered('5.', `Tautan Referensi Produk Katalog Elektronik: ${paket.link_produk_katalog_1 || 'https://e-katalog.lkpp.go.id/'} ${paket.link_produk_katalog_2 ? 'dan ' + paket.link_produk_katalog_2 : ''}.`, { level: 1, size: 16.5, before: 0, after: 14 }),

    pText('Demikian Berita Acara Analisa Pasar dan Penilaian PPK ini dibuat dan ditandatangani dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagai dasar penyusunan HPS dan pelaksanaan E-Purchasing.', { before: 14, after: 40, size: 16.5 }),

    // Blok Tanda Tangan PPK
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                pText('Tembusan Disampaikan Kepada Yth:', { bold: true, size: 16, before: 0, after: 6 }),
                pText(`1. Kuasa Pengguna Anggaran (KPA) ${settings.nama_satker || 'KPU Kabupaten Ngawi'};`, { size: 15, before: 0, after: 2 }),
                pText('2. Pejabat Pengadaan Satker KPU Kabupaten Ngawi;', { size: 15, before: 0, after: 2 }),
                pText('3. Arsip / Pengendali Dokumen Pengadaan.', { size: 15, before: 0, after: 0 })
              ]
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: BORDER_NONE,
              children: [
                pText(`Ngawi, ${tglApStr}`, { align: AlignmentType.CENTER, size: 17, before: 0, after: 4 }),
                pText('Pejabat Pembuat Komitmen (PPK)', { bold: true, align: AlignmentType.CENTER, size: 17, before: 0, after: 2 }),
                pText((settings.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase(), { bold: true, align: AlignmentType.CENTER, size: 17, color: '1E3A8A', before: 0, after: 350 }),
                pText(ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN', { bold: true, underline: true, align: AlignmentType.CENTER, size: 18, before: 0, after: 2 }),
                pText(`NIP. ${ppk.nip || '19840101 200912 1 001'}`, { align: AlignmentType.CENTER, size: 16, before: 0, after: 0 })
              ]
            })
          ]
        })
      ]
    })
  );

  return [
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 900, right: 900, bottom: 900, left: 900 }
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 0, after: 30 },
              children: [
                new TextRun({
                  text: `Dokumen Tahap 05 (BA-AP) - No: ${noAp}`,
                  size: 15,
                  color: '64748B',
                  font: 'Cambria',
                  italics: true
                })
              ]
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              spacing: { before: 30, after: 0 },
              children: [
                new TextRun({ text: 'Halaman ', size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ text: ' dari ', size: 16, color: '64748B', font: 'Cambria' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748B', font: 'Cambria' })
              ]
            })
          ]
        })
      },
      children
    }
  ];
}

function buildSectionsForStage(stageNo, ctx, isFirstStageInDoc = true) {
  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, settings } = ctx;
  const def = DEFINISI_18_TAHAP.find(d => d.no === stageNo) || DEFINISI_18_TAHAP[0];
  const tahapRow = tahaps.find(t => Number(t.no_tahap) === stageNo) || {
    no_tahap: stageNo,
    nama_tahap: def.nama,
    nomor_dokumen: `${String(stageNo).padStart(3, '0')}/PPK-PBJ/KPU-NGW/2026`,
    tanggal_dokumen: paket.tgl_mulai_kerja
  };
  const keu = hitungKeuanganKontrak(paket);
  const docLabel = `Dokumen Tahap ${String(def.no).padStart(2, '0')} (${def.kode}) - No: ${tahapRow.nomor_dokumen || '-'}`;
  const paketLabel = `${paket.kode_paket_internal || 'PBJ'} | ${paket.nama_paket || ''}`.slice(0, 78);

  if (stageNo === 1) {
    return buildStage1Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 2) {
    return buildStage2Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 5) {
    return buildStage5Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }

  // Tentukan pihak penandatangan kiri & label Kotak Paraf sesuai tahap
  let pihakKiri = null;
  let pihakKanan = {
    judulAtas: 'PEJABAT PEMBUAT KOMITMEN (PPK)',
    subJudul: (settings.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase(),
    nama: ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN',
    identitas: `NIP. ${ppk.nip || '-'}`
  };

  if ([8, 9].includes(stageNo)) {
    pihakKiri = {
      judulAtas: 'PEJABAT PENGADAAN / POKJA',
      subJudul: settings.nama_satker || 'KPU KABUPATEN NGAWI',
      nama: pejabatPengadaan.nama_lengkap || 'INDRAYU FATIKA MAHARDIKA',
      identitas: `NIP. ${pejabatPengadaan.nip || '-'}`,
      labelParafKiri: 'PEJABAT PENGADAAN',
      labelParafKanan: 'PPK'
    };
  } else if ([12, 13, 14, 15, 16].includes(stageNo)) {
    pihakKiri = {
      judulAtas: 'UNTUK DAN ATAS NAMA PENYEDIA',
      subJudul: (penyedia.nama_perusahaan || 'PENYEDIA').toUpperCase(),
      nama: penyedia.nama_direktur || '-',
      identitas: penyedia.jabatan_penandatangan || 'Direktur',
      labelParafKiri: 'PIHAK KESATU (PPK)',
      labelParafKanan: 'PIHAK KEDUA (PENYEDIA)'
    };
  } else if (stageNo === 3) {
    // KHUSUS TAHAP 3: PENETAPAN TUNGGAL OLEH KUASA PENGGUNA ANGGARAN (KPA)
    // Sesuai Pasal 9 ayat (1) huruf c & d jo. Pasal 10 ayat (1) Perpres PBJ.
    // Menghilangkan tanda tangan PPK agar tidak timbul kesan memerlukan persetujuan bawahan.
    pihakKiri = null;
    pihakKanan = {
      judulAtas: 'KUASA PENGGUNA ANGGARAN',
      subJudul: (settings.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase(),
      nama: kpa.nama_lengkap || 'BUDI RAHAYU',
      identitas: `NIP. ${kpa.nip || '-'}`
    };
  } else if ([1, 17].includes(stageNo)) {
    pihakKiri = {
      judulAtas: 'MENGETAHUI / MENYETUJUI:',
      subJudul: 'KUASA PENGGUNA ANGGARAN (SEKRETARIS KPU)',
      nama: kpa.nama_lengkap || 'BUDI RAHAYU',
      identitas: `NIP. ${kpa.nip || '-'}`,
      labelParafKiri: 'KPA (SEKRETARIS)',
      labelParafKanan: 'PPK'
    };
  }

  const modeHargaTabel = stageNo <= 8 ? 'hps' : 'kontrak';
  const totalNilaiTabel = (items || []).reduce((acc, it) => {
    const jml = modeHargaTabel === 'hps'
      ? Number(it.jumlah_hps || 0)
      : Number(it.jumlah_kontrak || it.jumlah_hps || 0);
    return acc + jml;
  }, 0);

  // Apabila jumlah item sangat banyak (> 5 item), pecah tabel secara proporsional:
  // item awal di Section 1 (ber-Kotak Paraf), dan 3 item terakhir + Total + TTD di Section 2 (halaman tanda tangan)
  const allItems = Array.isArray(items) ? items : [];
  const splitTable = allItems.length > 5;
  const firstPageItems = splitTable ? allItems.slice(0, allItems.length - 3) : [];
  const signaturePageItems = splitTable ? allItems.slice(allItems.length - 3) : allItems;

  const pageMargin = {
    top: 1000,
    right: 1100,
    bottom: 1320,
    left: 1417,
    footer: 420
  };

  // SECTION 1: Halaman Non-Tanda Tangan (Dilengkapi Kotak Paraf pada Footer)
  const section1Children = [
    ...buildKopSuratKpu(settings),
    pText(stageNo === 3 ? 'SURAT PENETAPAN RENCANA UMUM PENGADAAN (RUP) OLEH KUASA PENGGUNA ANGGARAN (KPA) & PENGUMUMAN SIRUP LKPP' : `DOKUMEN TAHAP ${String(stageNo).padStart(2, '0')} — ${def.nama.toUpperCase()}`,  {
      bold: true, size: 23, align: AlignmentType.CENTER, before: 40, after: 20
    }),
    pText(`NOMOR: ${tahapRow.nomor_dokumen || '-'}`, {
      bold: true, size: 20, align: AlignmentType.CENTER, before: 0, after: 130
    }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        pLabelValue('Nama Paket Pengadaan', paket.nama_paket),
        pLabelValue('Kode RUP & Mata Anggaran (MAK)', `${paket.kode_rup || '-'} | MAK ${paket.kode_akun_mak} (${paket.nama_akun_mak})`),
        pLabelValue('Jenis & Metode Pengadaan', `${paket.jenis_pengadaan} — ${paket.cara_pengadaan} / ${paket.metode_pemilihan} (${paket.fitur_spse})`),
        pLabelValue('Bentuk & Jenis Kontrak', `${paket.bentuk_kontrak || 'Surat Pesanan'} (${paket.jenis_kontrak || 'Lumsum'})`),
        pLabelValue('Nilai Pagu / HPS / Kontrak', (() => {
          if (stageNo < 6) {
            return `Pagu DIPA: ${formatRupiah(paket.nilai_pagu)} (HPS disusun pada Tahap 6, Kontrak pada Tahap 13)`;
          } else if (stageNo < 13) {
            return `Pagu: ${formatRupiah(paket.nilai_pagu)} | ${paket.jenis_kertas_harga || 'HPS'}: ${formatRupiah(paket.nilai_hps || 0)} (Kontrak disusun pada Tahap 13)`;
          } else {
            return `Pagu: ${formatRupiah(paket.nilai_pagu)} | ${paket.jenis_kertas_harga || 'HPS'}: ${formatRupiah(paket.nilai_hps || 0)} | Kontrak: ${formatRupiah(paket.nilai_kontrak || 0)}`;
          }
        })()),
        pLabelValue(stageNo < 9 ? 'Pelaksana Pemilihan / Rekanan' : 'Pelaksana / Penyedia', (() => {
          if (stageNo < 9) {
            return `Pelaksana Pemilihan: ${paket.pelaksana_pemilihan || 'Pejabat Pengadaan'} (Penyedia belum ditentukan, dipilih pada Tahap 9)`;
          } else {
            return `${penyedia?.nama_perusahaan || 'Penyedia Terpilih'} (${penyedia?.kualifikasi_usaha || 'UMK'}) — NPWP: ${penyedia?.npwp || '-'}`;
          }
        })())
      ]
    }),

    ...buildStageSpecificSections(stageNo, ctx, tahapRow, keu),
    ...buildStageLegalComplianceSection(stageNo, ctx, tahapRow, keu)
  ];

  const stagesWithPricedTable = [6, 9, 13, 16];
  const hasItemTable = stagesWithPricedTable.includes(stageNo) || stageNo === 4;

  if (!hasItemTable) {
    // Untuk tahapan non-tabel harga (Tahap 3, 5, 7, 8, 10, 11, 12, 14, 15, 17, 18):
    // Dokumen langsung ditutup dengan kalimat penutup dan blok tanda tangan resmi tanpa memuat tabel harga Rp 0 kosong.
    section1Children.push(
      pText('Demikian dokumen administrasi pengadaan ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya sesuai ketentuan peraturan perundang-undangan pengadaan barang/jasa pemerintah.', {
        before: 60,
        after: 100,
        keepNext: true,
        keepLines: true
      }),
      buildBlokTandaTangan(
        pihakKiri,
        pihakKanan,
        settings.kota_satker || 'Ngawi',
        tahapRow.tanggal_dokumen || paket.tgl_mulai_kerja
      )
    );

    const sectionSingle = {
      properties: {
        ...(isFirstStageInDoc ? {} : { type: SectionType.NEXT_PAGE }),
        page: { margin: pageMargin }
      },
      footers: {
        // Sesuai Kaidah Tata Naskah Dinas:
        // 1. Dokumen 1 lembar TIDAK PERLU kotak paraf
        // 2. Halaman yang memuat tanda tangan TIDAK PERLU diparaf
        default: buildFooterTanpaParaf(docLabel, paketLabel)
      },
      children: section1Children
    };
    return [sectionSingle];
  }

  if (splitTable && firstPageItems.length > 0) {
    section1Children.push(
      pText('C. TABEL RINCIAN ITEM BARANG/JASA, SPESIFIKASI TEKNIS, DAN HARGA (BAGIAN 1)', {
        bold: true, before: 120, after: 60
      }),
      buildTabelItemDocx(firstPageItems, modeHargaTabel, {
        lockWithSignature: false,
        showTotalRow: false,
        startIndex: 0
      })
    );
  }

  const section1 = {
    properties: {
      ...(isFirstStageInDoc ? {} : { type: SectionType.NEXT_PAGE }),
      page: { margin: pageMargin }
    },
    footers: {
      // Halaman sebelum tanda tangan pada dokumen multi-halaman: Wajib Kotak Paraf
      default: buildFooterKotakParaf(pihakKiri, pihakKanan, def, tahapRow, paket)
    },
    children: section1Children
  };

  // SECTION 2: Halaman Lembar Pengesahan / Tanda Tangan (Didampingi Tabel Rincian Item & Total -> Bebas TTD Gantung, Tanpa Kotak Paraf)
  const nilaiTerbilang = modeHargaTabel === 'hps' ? (paket.nilai_hps || totalNilaiTabel) : (paket.nilai_kontrak || totalNilaiTabel);
  const section2 = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: { margin: pageMargin }
    },
    footers: {
      // Sesuai Kaidah Tata Naskah Dinas: Halaman yang memuat tanda tangan TIDAK PERLU diparaf
      default: buildFooterTanpaParaf(docLabel, paketLabel)
    },
    children: [
      pText(
        splitTable
          ? 'C. LANJUTAN TABEL RINCIAN ITEM BARANG/JASA, TOTAL NILAI, DAN PENGESAHAN'
          : 'C. TABEL RINCIAN ITEM BARANG/JASA, SPESIFIKASI TEKNIS, DAN HARGA',
        { bold: true, before: 40, after: 70, keepNext: true, keepLines: true }
      ),
      buildTabelItemDocx(signaturePageItems, modeHargaTabel, {
        lockWithSignature: true,
        showTotalRow: true,
        totalSemuaOverride: totalNilaiTabel,
        startIndex: splitTable ? firstPageItems.length : 0
      }),
      ...(nilaiTerbilang > 0 ? [
        pText(`Terbilang: # ${terbilangRupiah(nilaiTerbilang)} #`, {
          bold: true,
          italic: true,
          size: 20,
          before: 80,
          after: 120,
          keepNext: true,
          keepLines: true
        })
      ] : []),
      pText('Demikian dokumen administrasi pengadaan ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya sesuai ketentuan peraturan perundang-undangan pengadaan barang/jasa pemerintah.', {
        before: 60,
        after: 100,
        keepNext: true,
        keepLines: true
      }),
      buildBlokTandaTangan(
        pihakKiri,
        pihakKanan,
        settings.kota_satker || 'Ngawi',
        tahapRow.tanggal_dokumen || paket.tgl_mulai_kerja
      )
    ]
  };

  return [section1, section2];
}

/**
 * Generate Buffer Word (.DOCX) untuk 1 Tahap Tertentu (1-18) atau "ALL" (Dokumen Gabungan 18 Tahap Hulu-Hilir)
 */
async function generateWordBuffer(ctx, modeOrStage = 13) {
  const stageNum = Number(modeOrStage);
  let sections = [];

  if (modeOrStage === 'ALL' || isNaN(stageNum)) {
    // Gabungkan seluruh tahap yang tidak di-bypass dalam 1 file Word Master Hulu-Hilir
    let first = true;
    for (const def of DEFINISI_18_TAHAP) {
      const tRow = ctx.tahaps.find(t => Number(t.no_tahap) === def.no);
      if (tRow && tRow.status_tahap === 'Bypass') continue;
      sections.push(...buildSectionsForStage(def.no, ctx, first));
      first = false;
    }
  } else {
    sections.push(...buildSectionsForStage(stageNum, ctx, true));
  }

  const doc = new Document({
    creator: 'SI-PRABU KPU Kabupaten Ngawi (by emenje)',
    title: `Dokumen Pengadaan SI-PRABU - ${ctx.paket.nama_paket}`,
    styles: {
      default: {
        document: {
          run: {
            font: 'Cambria',
            size: 20
          }
        }
      }
    },
    sections
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

module.exports = {
  generateWordBuffer
};
