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
  terbilangInt,
  formatTanggalIndo,
  formatHariTanggalBeritaAcara,
  cleanNamaTanpaGelar,
  hitungKeuanganKontrak
} = require('./utils');

const {
  SSUK_67_ROWS,
  buildSskk25Rows
} = require('./ssuk_sskk_template');
const { buildStage16Sections: buildStage16SectionsModular } = require('./word_engine_tahap16');
const { buildStage17Sections } = require('./word_engine_tahap17');
const { buildStage18Sections } = require('./word_engine_tahap18');

const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' }
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
  const isSymbol = /[\u2600-\u27BF]/.test(String(text ?? ''));
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
        font: opts.font || (isSymbol ? 'Segoe UI Symbol' : 'Cambria'),
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

/**
 * Paragraf Penomoran Naskah Dinas Resmi (Standar Tata Naskah Dinas Word)
 * Menghasilkan Hanging Indent sempurna di mana baris kedua dan seterusnya
 * otomatis rata lurus di bawah huruf pertama teks (bukan di bawah nomor/angka).
 */
function pListItem(prefix, boldTitle, text, opts = {}) {
  const level = opts.level || 1;
  const hangingDxa = opts.hanging || 360; // 0.25 inch hanging
  const leftDxa = opts.left || (level === 1 ? 540 : (level === 2 ? 900 : 1260));
  const isPrefixSymbol = /[\u2600-\u27BF]/.test(String(prefix ?? ''));

  const children = [
    new TextRun({
      text: prefix.endsWith('\t') ? prefix : (prefix + '\t'),
      bold: opts.prefixBold !== undefined ? Boolean(opts.prefixBold) : true,
      size: opts.size || 21,
      font: opts.font || (isPrefixSymbol ? 'Segoe UI Symbol' : 'Cambria'),
      color: opts.prefixColor || opts.color || '000000'
    })
  ];

  if (boldTitle) {
    const formattedTitle = String(boldTitle).trim();
    const hasColon = formattedTitle.endsWith(':');
    children.push(new TextRun({
      text: hasColon ? (formattedTitle + ' ') : (formattedTitle + ': '),
      bold: true,
      size: opts.size || 21,
      font: opts.font || 'Cambria',
      color: opts.color || '000000'
    }));
  }

  if (text) {
    children.push(new TextRun({
      text: String(text).trim(),
      bold: Boolean(opts.boldText),
      italics: Boolean(opts.italic),
      size: opts.size || 21,
      font: opts.font || 'Cambria',
      color: opts.color || '000000'
    }));
  }

  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFY,
    keepNext: Boolean(opts.keepNext),
    keepLines: true,
    spacing: { before: opts.before ?? 30, after: opts.after ?? 40, line: opts.line || 268 },
    indent: { left: leftDxa, hanging: hangingDxa },
    tabStops: [{ type: TabStopType.LEFT, position: leftDxa }],
    children
  });
}

function pNumbered(prefix, text, opts = {}) {
  const level = opts.level || 1;
  const hangingDxa = opts.hanging || 450;
  const leftDxa = opts.left || (level * hangingDxa);
  const isPrefixSymbol = /[\u2600-\u27BF]/.test(String(prefix ?? ''));
  const isTextSymbol = /[\u2600-\u27BF]/.test(String(text ?? ''));

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
        font: opts.font || (isPrefixSymbol ? 'Segoe UI Symbol' : 'Cambria'),
        color: opts.prefixColor || opts.color || '000000'
      }),
      new TextRun({
        text: String(text ?? ''),
        bold: Boolean(opts.bold),
        italics: Boolean(opts.italic),
        size: opts.size || 21,
        font: opts.font || (isTextSymbol ? 'Segoe UI Symbol' : 'Cambria'),
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
        const itemRows = [
          new TableRow({
            children: [
              new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('No', { bold: true, size: 15, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
              new TableCell({ width: { size: 26, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Uraian Kebutuhan Barang / BMN', { bold: true, size: 15, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
              new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Volume', { bold: true, size: 15, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
              new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Pagu Satuan (Rp)', { bold: true, size: 15, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
              new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Subtotal Pagu (Rp)', { bold: true, size: 15, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
              new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Spesifikasi Teknis & TKDN', { bold: true, size: 15, align: AlignmentType.CENTER, color: 'FFFFFF' })] })
            ]
          })
        ];

        let totPaguItem = 0;
        items.forEach((it, idx) => {
          const vol = Number(it.volume || 1);
          const paguSat = Number(it.harga_satuan_hps || 0);
          const sub = vol * paguSat;
          totPaguItem += sub;

          itemRows.push(
            new TableRow({
              children: [
                new TableCell({ borders: BORDER_TABLE, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 15, bold: true })] }),
                new TableCell({ borders: BORDER_TABLE, children: [
                  pText(it.uraian_item || ('Item ' + (idx + 1)), { bold: true, size: 15 }),
                  pText('Pencatatan: ' + (it.jenis_pencatatan_sakti || 'Aset Tetap (BMN)'), { size: 12, italic: true, color: '475569' })
                ] }),
                new TableCell({ borders: BORDER_TABLE, children: [pText(vol + ' ' + (it.satuan || 'Unit'), { align: AlignmentType.CENTER, size: 15 })] }),
                new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(paguSat), { align: AlignmentType.RIGHT, size: 15 })] }),
                new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(sub), { align: AlignmentType.RIGHT, size: 15, bold: true, color: '1E3A8A' })] }),
                new TableCell({ borders: BORDER_TABLE, children: [
                  pText(it.spesifikasi_teknis || 'Sesuai standar fungsional KAK PPK.', { size: 13, italic: true }),
                  pText('Target TKDN: ' + Number(it.persen_tkdn || 40) + '%', { size: 12, bold: true, color: '047857' })
                ] })
              ]
            })
          );
        });

        itemRows.push(
          new TableRow({
            children: [
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'FEF3C7' }, children: [pText('', { size: 15 })] }),
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'FEF3C7' }, children: [pText('TOTAL ESTIMASI PAGU KAK', { bold: true, size: 15, align: AlignmentType.RIGHT })] }),
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'FEF3C7' }, children: [pText('', { size: 15 })] }),
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'FEF3C7' }, children: [pText('', { size: 15 })] }),
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'FEF3C7' }, children: [pText(formatRupiah(totPaguItem), { bold: true, size: 15, color: '1E3A8A', align: AlignmentType.RIGHT })] }),
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'FEF3C7' }, children: [pText('100% Pagu Terdistribusi', { bold: true, size: 13, color: '047857', align: AlignmentType.CENTER })] })
            ]
          })
        );

        paragraphs.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: itemRows
          }),
          pText('', { after: 20 })
        );
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

    case 7: {
      const umPersen = Number(paket.persen_uang_muka ?? 0);
      const caraBayar = paket.cara_pembayaran || 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)';
      const basisDenda = paket.basis_denda || '1 permil per hari dari Harga Kontrak sebelum PPN (DPP)';
      const garansiStr = paket.ketentuan_garansi || (isKonstruksi
        ? `Masa Pemeliharaan minimal 180 hari kalender (6 bulan) untuk pekerjaan permanen dengan Retensi Pemeliharaan 5% (${formatRupiah(keu.nilaiRetensi5Persen)})`
        : 'Sertifikat Garansi Purna Jual Resmi Pabrikan Minimal 1 Tahun (365 Hari Kalender) — Bebas Retensi 5%');
      const sengketaStr = paket.penyelesaian_sengketa || 'Musyawarah untuk Mufakat, dilanjutkan Layanan Penyelesaian Sengketa (LPS) LKPP';
      paragraphs.push(
        pText('A. RANCANGAN KONTRAK, SSUK, DAN SYARAT-SYARAT KHUSUS KONTRAK (SSKK)', { bold: true, before: 120, after: 30 }),
        pNumbered('1.', `Bentuk & Jenis Kontrak: ${paket.bentuk_kontrak || 'Surat Pesanan'} (${paket.jenis_kontrak || 'Lumsum'}) sesuai Pasal 27 & Pasal 28 Perpres Nomor 46 Tahun 2025.`, { level: 1 }),
        pNumbered('2.', `Cara Pembayaran & Kebijakan Uang Muka (Pasal 29 Perpres 46/2025): Cara Pembayaran ditetapkan "${caraBayar}" dengan Persentase Uang Muka sebesar ${umPersen}% (${umPersen === 0 ? 'Tanpa Uang Muka — bebas kewajiban Jaminan Uang Muka' : formatRupiah(keu.nilaiUangMuka) + ' dengan syarat wajib menyerahkan Jaminan Uang Muka 100%'}).`, { level: 1 }),
        pNumbered('3.', `Jangka Waktu, Garansi & Denda Keterlambatan: Masa pelaksanaan ${paket.masa_pelaksanaan_hari || 14} hari kalender di ${paket.lokasi_pekerjaan || 'Kantor KPU Kabupaten Ngawi'}; ${garansiStr}; Sanksi denda keterlambatan ditetapkan sebesar 1‰ (satu permil) per hari dari ${basisDenda} (Estimasi DPP ${formatRupiah(keu.dpp)} -> ${formatRupiah(keu.dendaPerHari)}/hari); Forum penyelesaian sengketa: ${sengketaStr}.`, { level: 1 })
      );
      break;
    }

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
  const { paket, items, subbag, subbags, ppk, kpa, settings } = ctx;
  const sb = subbag || {};
  const kasubagNama = sb.kasubag_nama || 'MOHAMMAD NOOR JIHAN';
  const kasubagNip = sb.kasubag_nip || '19840101 200912 1 001';
  const kasubagJabatan = sb.kasubag_jabatan || `Kepala Subbagian ${paket.pic_subbag || 'Perencanaan, Data dan Informasi'}`;
  const komisionerNama = sb.komisioner_nama || 'PUTRA ADI WIBOWO SW';
  const komisionerJabatan = sb.komisioner_jabatan || `Ketua Divisi ${paket.pic_subbag || 'Perencanaan, Data dan Informasi'}`;

  // Multi-subbag mapping & detection
  const subbagMap = {};
  (subbags || []).forEach(s => {
    subbagMap[s.kode] = s;
  });

  let multiPengusul = [];
  if (paket.is_multi_subbag) {
    if (Array.isArray(paket.subbags) && paket.subbags.length > 0) {
      multiPengusul = paket.subbags;
    } else if (paket.multi_pengusul_json) {
      try {
        multiPengusul = typeof paket.multi_pengusul_json === 'string' ? JSON.parse(paket.multi_pengusul_json) : paket.multi_pengusul_json;
      } catch (e) { multiPengusul = []; }
    }
  }
  if (!Array.isArray(multiPengusul)) multiPengusul = [];
  const isMultiSubbag = !!(paket.is_multi_subbag && multiPengusul.length > 1);

  const noNota = paket.no_nota_dinas_pengusul || `001/ND.${paket.pic_subbag || 'RENDATIN'}/KPU-Kab-014.329781/V/2026`;
  const tglNotaStr = formatTanggalIndo(paket.tgl_nota_dinas_pengusul || '2026-05-04');
  const perihalNota = paket.perihal_nota_dinas || `Usulan Kebutuhan Pengadaan ${paket.nama_paket || 'Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi TA 2026'}`;
  const noDisp = paket.no_disposisi_kpa || '042/AGD-KPA/V/2026';
  const tglDispStr = formatTanggalIndo(paket.tgl_disposisi_kpa || paket.tgl_nota_dinas_pengusul || '2026-05-04');
  const noIdk = tahapRow.nomor_dokumen || `001/IDK/${paket.kode_paket_internal || "PBJ-2026-008"}/PPK-PBJ/KPU-NGW/V/2026`;
  const tglIdkStr = formatTanggalIndo(tahapRow.tanggal_dokumen || '2026-05-05');
  const hariTanggalIdk = formatHariTanggalBeritaAcara(tahapRow.tanggal_dokumen || '2026-05-05');

  const bmnPengelolaNama = 'NURFANTI SULISTYO W';
  const bmnPengelolaNip = '19820512 200801 2 007';
  const bmnPengelolaJabatan = 'Kasubbag Keuangan, Umum & Logistik (Pengelola BMN)';
  const tglTelaahStr = tglNotaStr;

  // Margin kompak & presisi: Masing-masing dokumen pas 1 halaman utuh (Tanda tangan tidak menggantung)
  const compactPageProps = {
    margin: { top: 900, bottom: 850, left: 1150, right: 1150 }
  };

  const headerDefault = new Header({
    children: [
      pText('SI-PRABU v3.0 – Dokumen Resmi Tahap 1: Identifikasi Kebutuhan & Disposisi KPA | KPU Ngawi', {
        italic: true,
        size: 15,
        color: '64748B',
        align: AlignmentType.RIGHT,
        before: 0,
        after: 20
      })
    ]
  });

  const footerDefault = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 20, after: 0 },
        children: [
          new TextRun({ text: 'Halaman ', size: 15, color: '64748B', font: 'Cambria' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 15, color: '64748B', font: 'Cambria' }),
          new TextRun({ text: ' dari ', size: 15, color: '64748B', font: 'Cambria' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: '64748B', font: 'Cambria' })
        ]
      })
    ]
  });

  const sections = [];

  // =========================================================================
  // DOKUMEN 1: NOTA DINAS (1 HALAMAN UTUH TANPA MENGGANTUNG)
  // JIKA MULTI-SUBBAG: Cetak naskah Nota Dinas 1 halaman untuk setiap subbag
  // JIKA TUNGGAL: Cetak naskah Nota Dinas 1 halaman tunggal
  // =========================================================================
  const renderNotaDinasChildren = (subKasubagJabatan, subKasubagNama, subKasubagNip, subKomisionerJabatan, subKomisionerNama, subNoNota, subTglStr, subPerihalStr, displayItems, subPaguVal, subbagKode) => {
    return [
      ...buildKopSuratKpu(settings),
      pText('NOTA DINAS', { bold: true, size: 21, align: AlignmentType.CENTER, before: 15, after: 4, keepWithNext: true }),
      pText(`Nomor: ${subNoNota}`, { size: 16, align: AlignmentType.CENTER, color: '475569', before: 0, after: 45, keepWithNext: true }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Yth.', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Kuasa Pengguna Anggaran (KPA) KPU Kabupaten Ngawi', { bold: true, size: 16.5, before: 0, after: 2 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Dari', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(`${subKasubagJabatan} (${subKasubagNama})`, { size: 16.5, before: 0, after: 2 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Mengetahui', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(`${subKomisionerJabatan} (${subKomisionerNama})`, { bold: true, size: 16.5, color: '1E3A8A', before: 0, after: 2 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Tanggal', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(subTglStr, { size: 16.5, before: 0, after: 2 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Sifat', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Penting / Segera', { size: 16.5, before: 0, after: 2 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Hal', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 16.5, before: 0, after: 2 })] }),
              new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(subPerihalStr, { bold: true, size: 16.5, color: '0F172A', before: 0, after: 2 })] })
            ]
          })
        ]
      }),
      pText('', { after: 25, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' } } }),
      pText(`Bersama ini kami sampaikan dengan hormat usulan kebutuhan pengadaan barang guna menunjang kelancaran tugas pokok kedinasan ${subbagKode ? `Subbagian ${subbagKode} ` : ''}KPU Kabupaten Ngawi TA ${paket.tahun_anggaran || '2026'}, dengan pertimbangan sebagai berikut:`, { size: 16.5, before: 4, after: 6 }),
      pNumbered('1.', `Dasar Kebutuhan: Perangkat pendukung operasional yang ada saat ini mendesak untuk dipenuhi/diperbarui guna menjamin kestabilan dan kelancaran proses kerja kedinasan yang akuntabel.`, { level: 1, size: 16.5, before: 2, after: 5 }),
      pNumbered('2.', `Rincian Usulan Barang: Meliputi ${displayItems && displayItems.length ? displayItems.map(it => `${it.volume || 1} ${it.satuan || 'Unit'} ${it.uraian_item || ''}`).join(', ') : 'kebutuhan barang operasional'}.`, { level: 1, size: 16.5, before: 2, after: 5 }),
      pNumbered('3.', `Pembebanan Anggaran (DIPA/RKB Definitif): APBN DIPA TA ${paket.tahun_anggaran || '2026'}, MAK ${paket.kode_akun_mak || '521211'} (${paket.nama_akun_mak || 'Belanja Bahan'}), Pagu Usulan: ${formatRupiah(subPaguVal)} (${terbilangRupiah(subPaguVal)}). Program: ${paket.rkb_program || 'Konsolidasi Demokrasi'}, Kegiatan: ${paket.rkb_kegiatan || 'Sistem Informasi Data Pemilih'}.`, { level: 1, size: 16.5, before: 2, after: 5 }),
      pNumbered('4.', 'Target Waktu Pemanfaatan: Barang/jasa ditargetkan telah terpasang, teruji fungsinya, dan siap dioperasikan secara penuh mulai Bulan Juli 2026 guna mendukung agenda tahapan kepemiluan dan operasional satker.', { level: 1, size: 16.5, before: 2, after: 6 }),
      pText('Sehubungan dengan hal tersebut di atas, mohon perkenan Bapak Kuasa Pengguna Anggaran (KPA) menyetujui usulan ini dan mendisposisikan kepada Pejabat Pembuat Komitmen (PPK) untuk diproses tahapan pengadaannya sesuai ketentuan perundang-undangan.', { size: 16.5, before: 4, after: 5 }),
      pText('Demikian nota dinas ini kami sampaikan, atas perkenan dan arahan Bapak diucapkan terima kasih.', { size: 16.5, before: 2, after: 18 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Mengetahui,', { align: AlignmentType.CENTER, size: 16.5, before: 0, after: 3, keepWithNext: true }),
                  pText(subKomisionerJabatan, { bold: true, align: AlignmentType.CENTER, size: 16.5, before: 0, after: 3, keepWithNext: true }),
                  pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 16.5, before: 0, after: 240, keepWithNext: true }),
                  pText(`( ${subKomisionerNama} )`, { bold: true, align: AlignmentType.CENTER, size: 16.5, before: 0, after: 3, keepWithNext: true }),
                  pText('Anggota KPU Kab. Ngawi', { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Yang Mengajukan,', { align: AlignmentType.CENTER, size: 16.5, before: 0, after: 3, keepWithNext: true }),
                  pText(subKasubagJabatan, { bold: true, align: AlignmentType.CENTER, size: 16.5, before: 0, after: 3, keepWithNext: true }),
                  pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 16.5, before: 0, after: 240, keepWithNext: true }),
                  pText(`( ${subKasubagNama} )`, { bold: true, align: AlignmentType.CENTER, size: 16.5, before: 0, after: 3, keepWithNext: true }),
                  pText(`NIP. ${subKasubagNip}`, { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ];
  };

  if (isMultiSubbag) {
    multiPengusul.forEach(pSub => {
      const sInfo = subbagMap[pSub.subbag] || {};
      const subKasubagNama = sInfo.kasubag_nama || kasubagNama;
      const subKasubagNip = sInfo.kasubag_nip || kasubagNip;
      const subKasubagJabatan = sInfo.kasubag_jabatan || `Kepala Subbagian ${pSub.subbag}`;
      const subKomisionerNama = sInfo.komisioner_nama || komisionerNama;
      const subKomisionerJabatan = sInfo.komisioner_jabatan || `Ketua Divisi ${pSub.subbag}`;
      const subNoNota = pSub.no_nota || `001/ND.${pSub.subbag}/KPU-Kab-014.329781/V/2026`;
      const subTglNotaStr = formatTanggalIndo(pSub.tgl_nota || paket.tgl_nota_dinas_pengusul || '2026-05-04');
      const subPerihal = pSub.perihal || `Usulan Kebutuhan Pengadaan Barang Kebutuhan Subbagian ${pSub.subbag} TA ${paket.tahun_anggaran || '2026'}`;

      const subItems = (items || []).filter(it => (it.pic_subbag_pengguna || 'KUL') === pSub.subbag);
      const displayItems = subItems.length ? subItems : items;
      const subPagu = displayItems.reduce((acc, it) => acc + (Number(it.volume || 1) * Number(it.harga_satuan_hps || 0)), 0);

      sections.push({
        properties: { page: compactPageProps, titlePage: true },
        headers: { default: headerDefault },
        footers: { default: footerDefault, first: footerDefault },
        children: renderNotaDinasChildren(
          subKasubagJabatan, subKasubagNama, subKasubagNip,
          subKomisionerJabatan, subKomisionerNama,
          subNoNota, subTglNotaStr, subPerihal, displayItems, subPagu || paket.nilai_pagu, pSub.subbag
        )
      });
    });
  } else {
    sections.push({
      properties: { page: compactPageProps, titlePage: true },
      headers: { default: headerDefault },
      footers: { default: footerDefault, first: footerDefault },
      children: renderNotaDinasChildren(
        kasubagJabatan, kasubagNama, kasubagNip,
        komisionerJabatan, komisionerNama,
        noNota, tglNotaStr, perihalNota, items, paket.nilai_pagu, paket.pic_subbag
      )
    });
  }

  // =========================================================================
  // DOKUMEN 2: LEMBAR DISPOSISI KPA (1 HALAMAN UTUH TANPA MENGGANTUNG)
  // =========================================================================
  const dispSuratDari = isMultiSubbag
    ? `Konsolidasi Multi-Subbagian: ${multiPengusul.map(s => `Subbag ${s.subbag}`).join(', ')} (KPU Kabupaten Ngawi)`
    : `${kasubagJabatan} (${kasubagNama}) / Mengetahui ${komisionerJabatan} (${komisionerNama})`;
  const dispNoSurat = isMultiSubbag ? multiPengusul.map(s => s.no_nota).join('; ') : noNota;
  const dispHalSurat = isMultiSubbag ? `Konsolidasi Usulan Kebutuhan Pengadaan: ${paket.nama_paket}` : perihalNota;

  sections.push({
    properties: { page: compactPageProps, titlePage: true },
    headers: { default: headerDefault },
    footers: { default: footerDefault, first: footerDefault },
    children: [
      ...buildKopSuratKpu(settings),
      pText('LEMBAR DISPOSISI KUASA PENGGUNA ANGGARAN (KPA)', { bold: true, size: 21, align: AlignmentType.CENTER, before: 15, after: 5 }),
      pText('Pengesahan Usulan Pengadaan Barang/Jasa Pemerintah', { size: 16, align: AlignmentType.CENTER, color: '475569', before: 0, after: 50 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('Surat Dari', { bold: true, size: 16, before: 2, after: 2 })] }),
              new TableCell({ width: { size: 44, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(dispSuratDari, { size: 15.5, before: 2, after: 2 })] }),
              new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('Tgl Surat', { bold: true, size: 16, before: 2, after: 2 })] }),
              new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(tglNotaStr, { size: 15.5, before: 2, after: 2 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('Nomor Surat', { bold: true, size: 16, before: 2, after: 2 })] }),
              new TableCell({ borders: BORDER_TABLE, columnSpan: 3, children: [pText(dispNoSurat, { size: 15.5, before: 2, after: 2 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('Hal / Perihal', { bold: true, size: 16, before: 2, after: 2 })] }),
              new TableCell({ borders: BORDER_TABLE, columnSpan: 3, children: [pText(dispHalSurat, { bold: true, size: 15.5, color: '0F172A', before: 2, after: 2 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('Diterima Tanggal', { bold: true, size: 16, before: 2, after: 2 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText(tglDispStr, { size: 15.5, before: 2, after: 2 })] }),
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('No. Agenda', { bold: true, size: 16, before: 2, after: 2 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText(noDisp, { size: 15.5, before: 2, after: 2 })] })
            ]
          })
        ]
      }),
      pText('', { after: 20 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('DITERUSKAN KEPADA:', { bold: true, color: 'FFFFFF', size: 16, before: 2, after: 2 })] }),
              new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('DISPOSISI / PETUNJUK KPA:', { bold: true, color: 'FFFFFF', size: 16, before: 2, after: 2 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                borders: BORDER_TABLE,
                children: [
                  pText('☑ Pejabat Pembuat Komitmen (PPK)', { bold: true, color: '1E3A8A', size: 15.5, before: 2, after: 2 }),
                  pText('☑ Pejabat Pengadaan (PP)', { size: 15.5, before: 2, after: 2 }),
                  pText('☑ Bendahara Pengeluaran', { size: 15.5, before: 2, after: 2 }),
                  pText('☑ Kasubbag Keuangan, Umum & Logistik', { size: 15.5, before: 2, after: 2 }),
                  pText('☑ Arsip / File', { size: 15.5, before: 2, after: 2 })
                ]
              }),
              new TableCell({
                borders: BORDER_TABLE,
                children: [
                  pText(isMultiSubbag ? '☑ SETUJU UNTUK DIPROSES KONSOLIDASI PENGADAAN' : '☑ SETUJU UNTUK DIPROSES PENGADAANNYA', { bold: true, color: '047857', size: 16, before: 2, after: 4 }),
                  pText('Catatan Instruksi KPA:', { bold: true, size: 15, before: 4, after: 2 }),
                  ...(isMultiSubbag ? [
                    pNumbered('1.', `Sesuai Pasal 21 Perpres No. 16/2018 jo. Perpres 46/2025 tentang Konsolidasi Pengadaan, lakukan konsolidasi pengadaan atas usulan dari Subbagian ${multiPengusul.map(s => s.subbag).join(' dan ')} menjadi 1 paket pengadaan terpadu guna mencapai efisiensi anggaran dan tertib administrasi.`, { level: 1, size: 14.5, bold: true, color: '1E3A8A', before: 1, after: 3, hanging: 240, left: 240 }),
                    pNumbered('2.', `Segera susun Identifikasi Kebutuhan, KAK, dan HPS gabungan mengacu pada DIPA TA ${paket.tahun_anggaran || '2026'} Akun ${paket.kode_akun_mak || '521211'} (Total Pagu ${formatRupiah(paket.nilai_pagu)}).`, { level: 1, size: 14.5, before: 1, after: 3, hanging: 240, left: 240 })
                  ] : [
                    pNumbered('1.', `Segera susun Identifikasi Kebutuhan, KAK, dan HPS mengacu pada DIPA TA ${paket.tahun_anggaran || '2026'} Akun ${paket.kode_akun_mak || '532111'} (Pagu ${formatRupiah(paket.nilai_pagu)}).`, { level: 1, size: 14.5, before: 1, after: 3, hanging: 240, left: 240 })
                  ]),
                  pNumbered(isMultiSubbag ? '3.' : '2.', 'Jadwalkan seluruh rangkaian pengadaan tuntas pada akhir Juni 2026 agar target pemanfaatan operasional per 1 Juli 2026 terpenuhi.', { level: 1, size: 14.5, before: 1, after: 3, hanging: 240, left: 240 }),
                  pNumbered(isMultiSubbag ? '4.' : '3.', 'Prioritaskan metode E-Purchasing (Katalog Elektronik v6) sesuai Kepka LKPP No. 177/2024.', { level: 1, size: 14.5, before: 1, after: 3, hanging: 240, left: 240 }),
                  pNumbered(isMultiSubbag ? '5.' : '4.', 'Wajib penuhi afirmasi UMK minimal 40% dan prioritas PDN/TKDN minimal 25%.', { level: 1, size: 14.5, before: 1, after: 3, hanging: 240, left: 240 }),
                  pNumbered(isMultiSubbag ? '6.' : '5.', 'Laksanakan seluruh tahapan secara transparan, tertib, dan akuntabel.', { level: 1, size: 14.5, before: 1, after: 3, hanging: 240, left: 240 })
                ]
              })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                borders: BORDER_TABLE,
                children: [pText(`Penyelesaian: ${tglDispStr}`, { italic: true, size: 14.5, color: '64748B', before: 2, after: 2 })]
              }),
              new TableCell({
                borders: BORDER_TABLE,
                children: [
                  pText(`Ngawi, ${tglDispStr}`, { align: AlignmentType.CENTER, size: 15.5, before: 4, after: 2 }),
                  pText('Kuasa Pengguna Anggaran (KPA)', { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2 }),
                  pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 200 }),
                  pText(`( ${kpa.nama_lengkap || 'BUDI RAHAYU'} )`, { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2 }),
                  pText(`NIP. ${kpa.nip || '19830503 200902 1 002'}`, { align: AlignmentType.CENTER, size: 15, before: 0, after: 2 })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  // =========================================================================
  // DOKUMEN 3: FORMULIR ANALISIS BMN (1 HALAMAN UTUH TANPA MENGGANTUNG)
  // =========================================================================
  sections.push({
    properties: { page: compactPageProps, titlePage: true },
    headers: { default: headerDefault },
    footers: { default: footerDefault, first: footerDefault },
    children: [
      ...buildKopSuratKpu(settings),
      pText('FORMULIR ANALISIS KETERSEDIAAN BARANG SEJENIS (BMN EKSISTING)', { bold: true, size: 20, align: AlignmentType.CENTER, before: 15, after: 5 }),
      pText('Pemeriksaan Kelayakan Pengadaan BMN Sesuai Pasal 18 Perpres No. 16/2018', { size: 15.5, align: AlignmentType.CENTER, color: '475569', before: 0, after: 40 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nama Paket Pengadaan', { bold: true, size: 15.5, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(paket.nama_paket || 'Pengadaan Perangkat Pengolah Data', { bold: true, size: 15.5, color: '0F172A', before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Mata Anggaran / Pagu DIPA', { bold: true, size: 15.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText(`MAK ${paket.kode_akun_mak || '532111'} (${paket.nama_akun_mak || 'Belanja Modal Peralatan Komputer'}) / ${formatRupiah(paket.nilai_pagu)}`, { size: 15.5, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Unit Pengusul (User)', { bold: true, size: 15.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText(isMultiSubbag ? `Konsolidasi Multi-Subbagian (${multiPengusul.map(s => s.subbag).join(', ')}) KPU Kabupaten Ngawi` : `Subbagian ${paket.pic_subbag || 'RENDATIN'} KPU Kabupaten Ngawi`, { size: 15.5, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Dasar Hukum Pemeriksaan', { bold: true, size: 15.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [
                pNumbered('1.', 'Pasal 18 Perpres 16/2018 jo. Perpres 46/2025 (Kewajiban analisis ketersediaan barang/jasa sejenis).', { level: 1, hanging: 200, size: 14, before: 1, after: 1 }),
                pNumbered('2.', 'Perlem LKPP No. 11/2021 jo. Perlem 2/2026 (Model Dokumen Perencanaan Pengadaan).', { level: 1, hanging: 200, size: 14, before: 1, after: 1 }),
                pNumbered('3.', 'PP 27/2014 jo. PP 28/2020 & Standar Barang Standar Kebutuhan (SBSK) DJKN Kemenkeu.', { level: 1, hanging: 200, size: 14, before: 1, after: 1 })
              ] })
            ]
          })
        ]
      }),
      pText('A. TABEL ANALISIS KETERSEDIAAN BARANG SEJENIS EKSISTING DI SATKER', { bold: true, size: 16, color: '1E3A8A', before: 25, after: 10 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('No', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Uraian Barang Sejenis', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 13, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Kode & NUP', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 9, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Jml/Thn', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 11, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Kondisi', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 17, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Status Utilisasi', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 12, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Standar (SBSK)', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Tindak Lanjut', { bold: true, size: 14, color: 'FFFFFF', align: AlignmentType.CENTER, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, children: [pText('1', { size: 13.5, align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('PC Server Tower Database SIDALIH', { size: 13.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('3.10.01.02.001\nNUP: 0001', { size: 13, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('1 Unit\n(2019)', { size: 13, align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Rusak Berat\n(Mati Total)', { size: 13, bold: true, color: '991B1B', align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Motherboard terbakar, suku cadang discontinued.', { size: 13, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('1 Unit Server', { size: 13, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Penggantian Baru & Usul Lelang BMN', { size: 13, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, children: [pText('2', { size: 13.5, align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('PC Workstation Admin Pengolah Data', { size: 13.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('3.10.01.02.002\nNUP: 0003-0005', { size: 13, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('3 Unit\n(2018)', { size: 13, align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Rusak Ringan /\nUsang', { size: 13, align: AlignmentType.CENTER, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Overcapacity, sering freeze, tidak kompatibel Win 11.', { size: 13, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('3 Workstation', { size: 13, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Penggantian Baru & Arsip Statis', { size: 13, before: 1, after: 1 })] })
            ]
          })
        ]
      }),
      pText('B. KESIMPULAN HASIL TELAAH PPK & PENGELOLA BMN', { bold: true, size: 16, color: '1E3A8A', before: 20, after: 10 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('1. Sifat Kebutuhan Pengadaan', { bold: true, size: 15, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('PENGGANTIAN (REPLACEMENT) ASET USANG / RUSAK BERAT', { bold: true, size: 15, color: '166534', before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('2. Kesesuaian RKBMN & SBSK', { bold: true, size: 15, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Tercantum dalam RKBMN KPU Kabupaten Ngawi TA 2026 dan memenuhi Standar Kebutuhan (SBSK) DJKN Kemenkeu.', { size: 14.5, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('3. Rekomendasi Kelayakan', { bold: true, size: 15, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('MEMENUHI SYARAT REGULASI DAN LAYAK DILANJUTKAN ke tahapan KAK dan HPS.', { bold: true, size: 14.5, color: '1E3A8A', before: 1, after: 1 })] })
            ]
          })
        ]
      }),
      pText('', { after: 15 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Telah Diverifikasi Oleh:', { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepWithNext: true }),
                  pText(bmnPengelolaJabatan, { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepWithNext: true }),
                  pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 200, keepWithNext: true }),
                  pText(`( ${bmnPengelolaNama} )`, { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepWithNext: true }),
                  pText(`NIP. ${bmnPengelolaNip}`, { align: AlignmentType.CENTER, size: 15, before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText(`Ditetapkan di Ngawi, ${tglTelaahStr}`, { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepWithNext: true }),
                  pText('Pejabat Pembuat Komitmen (PPK)', { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepWithNext: true }),
                  pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 200, keepWithNext: true }),
                  pText(`( ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'} )`, { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepWithNext: true }),
                  pText(`NIP. ${ppk.nip || '19840101 200912 1 001'}`, { align: AlignmentType.CENTER, size: 15, before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  // =========================================================================
  // DOKUMEN 4: FORMULIR IDENTIFIKASI KEBUTUHAN BAKU LKPP (1 HALAMAN UTUH TANPA MENGGANTUNG)
  // =========================================================================
  sections.push({
    properties: { page: compactPageProps, titlePage: true },
    headers: { default: headerDefault },
    footers: { default: footerDefault, first: footerDefault },
    children: [
      ...buildKopSuratKpu(settings),
      pText('FORMULIR IDENTIFIKASI KEBUTUHAN BARANG/JASA PEMERINTAH', { bold: true, size: 20, align: AlignmentType.CENTER, before: 12, after: 3, keepWithNext: true }),
      pText('TAHAP 1 (FASE I: PERENCANAAN PENGADAAN) – REGULASI PERPRES NO. 46/2025', { size: 15.5, align: AlignmentType.CENTER, color: '1E3A8A', before: 0, after: 3, keepWithNext: true }),
      pText(`Nomor: ${noIdk}`, { size: 16, align: AlignmentType.CENTER, color: '475569', before: 0, after: 35, keepWithNext: true }),
      pText(`${hariTanggalIdk.kalimatFormal}, yang bertanda tangan di bawah ini telah melakukan identifikasi kebutuhan pengadaan barang/jasa sebagai berikut:`, { size: 15.5, before: 0, after: 6 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('No', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 15, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Parameter Identifikasi Kebutuhan', { bold: true, color: 'FFFFFF', size: 15, before: 1, after: 1 })] }),
              new TableCell({ width: { size: 63, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Keterangan & Rincian Data Kebutuhan', { bold: true, color: 'FFFFFF', size: 15, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, children: [pText('1', { align: AlignmentType.CENTER, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Nama Kebutuhan Barang/Jasa', { bold: true, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText(paket.nama_paket || 'Pengadaan Barang Operasional', { bold: true, color: '0F172A', size: 14.5, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, children: [pText('2', { align: AlignmentType.CENTER, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Fungsi & Manfaat Operasional', { bold: true, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText(paket.uraian_pekerjaan || 'Mendukung pemrosesan data kedinasan, administrasi kepemiluan, dan kelancaran operasional satker.', { size: 14.5, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, children: [pText('3', { align: AlignmentType.CENTER, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Target Pengguna (End-User)', { bold: true, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText(isMultiSubbag ? `Konsolidasi Multi-Subbagian (${multiPengusul.map(s => s.subbag).join(', ')}) serta Staf Pelaksana dan Operator KPU Kabupaten Ngawi.` : `Subbagian ${paket.pic_subbag || 'RENDATIN'} serta Operator Sistem Informasi dan Staf Pelaksana KPU Kabupaten Ngawi.`, { size: 14.5, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, children: [pText('4', { align: AlignmentType.CENTER, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Waktu Pemanfaatan Barang', { bold: true, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText(`Mulai Bulan Juli 2026 s.d. jangka panjang (usia teknis ekonomis minimal 5 tahun). Proses pengadaan tuntas akhir Juni 2026.`, { size: 14.5, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, children: [pText('5', { align: AlignmentType.CENTER, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Rincian Kuantitas & KAK', { bold: true, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({
                borders: BORDER_TABLE,
                children: (items && items.length)
                  ? items.map(it => pText(`• ${it.volume || 1} ${it.satuan || 'Unit'} ${it.uraian_item || ''}${it.pic_subbag_pengguna ? ` [Alokasi: Subbag ${it.pic_subbag_pengguna}]` : ''} (Sesuai KAK Tahap 4).`, { size: 14.5, before: 1, after: 1 }))
                  : [pText('• 1 Unit Server & 3 Unit Workstation (Rincian teknis pada Dokumen KAK Tahap 4).', { size: 14.5, before: 1, after: 1 })]
              })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, children: [pText('6', { align: AlignmentType.CENTER, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Persyaratan Mutu & TKDN', { bold: true, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('100% Produk Baru Orisinil bergaransi resmi onsite; Wajib memenuhi prioritas PDN/TKDN minimal 25%.', { size: 14.5, before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, children: [pText('7', { align: AlignmentType.CENTER, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Sumber Dana & Pagu DIPA', { bold: true, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText(`APBN DIPA TA ${paket.tahun_anggaran || '2026'}, MAK ${paket.kode_akun_mak || '521211'} (${paket.nama_akun_mak || 'Belanja Bahan'}), Pagu: ${formatRupiah(paket.nilai_pagu)} (${terbilangRupiah(paket.nilai_pagu)}).`, { size: 14.5, bold: true, color: '047857', before: 1, after: 1 })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_TABLE, children: [pText('8', { align: AlignmentType.CENTER, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText('Pencatatan Aset SAKTI', { bold: true, size: 14.5, before: 1, after: 1 })] }),
              new TableCell({ borders: BORDER_TABLE, children: [pText(String(paket.kode_akun_mak || '').startsWith('53') ? 'Wajib dicatat pada SIMAK-BMN SAKTI sebagai Aset Tetap Peralatan dan Mesin.' : 'Wajib dicatat dalam Modul Persediaan / Beban Pemakaian SAKTI.', { size: 14.5, before: 1, after: 1 })] })
            ]
          })
        ]
      }),
      pText('Demikian formulir identifikasi kebutuhan ini ditetapkan dengan sebenar-benarnya untuk dipergunakan sebagai dasar penyusunan KAK/Spesifikasi Teknis, HPS, dan rencana pengadaan berikutnya.', { size: 15, before: 6, after: 10 }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ borders: BORDER_NONE, width: { size: 55, type: WidthType.PERCENTAGE }, children: [pText(' ')] }),
              new TableCell({
                borders: BORDER_NONE,
                width: { size: 45, type: WidthType.PERCENTAGE },
                children: [
                  pText('Ditetapkan di Ngawi', { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepWithNext: true }),
                  pText(`Pada tanggal ${tglIdkStr}`, { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepWithNext: true }),
                  pText('Pejabat Pembuat Komitmen (PPK)', { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepWithNext: true }),
                  pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 200, keepWithNext: true }),
                  pText(`( ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'} )`, { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepWithNext: true }),
                  pText(`NIP. ${ppk.nip || '19840101 200912 1 001'}`, { align: AlignmentType.CENTER, size: 15, before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  });

  return sections;
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
/**
 * TAHAP 6: PENYUSUNAN DAN PENETAPAN HARGA PERKIRAAN SENDIRI (HPS) / REFERENSI HARGA
 * Regulasi Baku:
 * - Pasal 11 ayat (1) huruf d & Pasal 26 Perpres Nomor 16 Tahun 2018 jo. Perpres Nomor 46 Tahun 2025
 * - Peraturan LKPP Nomor 2 Tahun 2026 (Pasal 8 & Pasal 9 tentang Penilaian Katalog & Pembebasan HPS <= 100 Jt)
 * - Peraturan LKPP Nomor 3 Tahun 2026 Lampiran I (Pedoman Teknis Penyusunan HPS)
 * - Keputusan KPU Nomor 1272 Tahun 2025 (Standar Tata Naskah Dinas KPU)
 * Penandatangan: Tanda Tangan Tunggal oleh Pejabat Pembuat Komitmen (PPK)
 */
function buildStage6Sections(ctx, tahapRow, keu, isFirstStageInDoc = true) {
  const { paket, items, ppk, kpa, settings } = ctx;
  const isRefHarga = String(paket.jenis_kertas_harga || '').includes('Referensi Harga');
  const judulNaskah = isRefHarga
    ? 'BERITA ACARA PENETAPAN REFERENSI HARGA E-PURCHASING'
    : 'BERITA ACARA PENETAPAN HARGA PERKIRAAN SENDIRI (HPS)';
  const subJudul = isRefHarga
    ? 'DOKUMEN TAHAP 06 (FASE II: PERSIAPAN PENGADAAN) — REGULASI PASAL 8 & 9 PERATURAN LKPP NOMOR 2 TAHUN 2026'
    : 'DOKUMEN TAHAP 06 (FASE II: PERSIAPAN PENGADAAN) — REGULASI PASAL 26 PERPRES 46/2025 & PERLEM LKPP 3/2026';
  const noHps = tahapRow.nomor_dokumen || `006/HPS/${paket.kode_paket_internal || 'PBJ-2026-001'}/PPK-PBJ/KPU-NGW/V/2026`;
  const tglHpsStr = formatTanggalIndo(tahapRow.tanggal_dokumen || '2026-05-18');
  const hariTanggalHps = formatHariTanggalBeritaAcara(tahapRow.tanggal_dokumen || '2026-05-18');

  const children = [];

  // 1. Kop Surat Resmi KPU Kabupaten Ngawi
  children.push(...buildKopSuratKpu(settings));

  // 2. Judul & Nomor Berita Acara
  children.push(
    pText(judulNaskah, {
      bold: true,
      size: 21,
      align: AlignmentType.CENTER,
      before: 30,
      after: 8
    }),
    pText(subJudul, {
      size: 15,
      align: AlignmentType.CENTER,
      color: '1E3A8A',
      bold: true,
      before: 0,
      after: 16
    }),
    pText(`Nomor: ${noHps}`, {
      size: 17,
      align: AlignmentType.CENTER,
      color: '475569',
      bold: true,
      before: 0,
      after: 30
    })
  );

  // 3. Paragraf Pembuka
  children.push(
    pText(`${hariTanggalHps.kalimatFormal}, bertempat di Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jalan Untung Suropati Nomor 48 Ngawi, Pejabat Pembuat Komitmen (PPK) Satuan Kerja KPU Kabupaten Ngawi berdasarkan wewenang atributif yang diberikan oleh peraturan perundang-undangan telah melaksanakan penyusunan dan menetapkan ${paket.jenis_kertas_harga || 'Harga Perkiraan Sendiri (HPS)'} untuk pelaksanaan paket pengadaan barang/jasa pemerintah sebagai berikut:`, {
      before: 10,
      after: 25
    })
  );

  // 4. Identitas Paket Pengadaan (Tabel Ringkas)
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('1. Nama Paket Pekerjaan', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 3, type: WidthType.PERCENTAGE }, children: [pText(':', { size: 17 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 69, type: WidthType.PERCENTAGE }, children: [pText(paket.nama_paket || '-', { bold: true, size: 17 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('2. Kode Paket / RUP', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 3, type: WidthType.PERCENTAGE }, children: [pText(':', { size: 17 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 69, type: WidthType.PERCENTAGE }, children: [pText(`${paket.kode_paket_internal || 'PBJ-2026-001'} | SiRUP: ${paket.kode_rup || '54892019'}`, { size: 17 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('3. Sumber Dana & Pagu DIPA', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 3, type: WidthType.PERCENTAGE }, children: [pText(':', { size: 17 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 69, type: WidthType.PERCENTAGE }, children: [pText(`${paket.sumber_dana || 'APBN'} TA 2026 | MAK: ${paket.kode_akun_mak || '532111'} | Pagu: ${formatRupiah(paket.nilai_pagu)}`, { bold: true, color: '1E3A8A', size: 17 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('4. Metode Pemilihan', { bold: true, size: 17 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 3, type: WidthType.PERCENTAGE }, children: [pText(':', { size: 17 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 69, type: WidthType.PERCENTAGE }, children: [pText(`${paket.metode_pemilihan || 'E-Purchasing'} (${paket.sub_metode_epurchasing || 'Negosiasi Harga'})`, { size: 17 })] })
          ]
        })
      ]
    }),
    pText('', { before: 0, after: 30 })
  );

  // 5. Konsiderans Landasan Yuridis
  children.push(
    pText('A. LANDASAN YURIDIS PENETAPAN', { bold: true, size: 18, color: '1E3A8A', before: 30, after: 15 }),
    pNumbered('1.', 'Pasal 11 ayat (1) huruf d dan Pasal 26 Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah jo. Perpres Nomor 46 Tahun 2025 bahwa PPK menetapkan HPS yang dihitung secara keahlian dan menggunakan data yang dapat dipertanggungjawabkan.'),
    pNumbered('2.', 'Peraturan LKPP Nomor 2 Tahun 2026 Pasal 8 (Penilaian Kelayakan Produk pada Katalog Elektronik) dan Pasal 9 (Ketentuan Penyusunan Referensi Harga untuk E-Purchasing s.d. Rp100 Juta).'),
    pNumbered('3.', 'Peraturan LKPP Nomor 3 Tahun 2026 Lampiran I tentang Pedoman Teknis Pengadaan Barang/Jasa Pemerintah Melalui Penyedia.'),
    pNumbered('4.', 'Berita Acara Analisa Pasar dan Penilaian PPK atas Kelayakan Katalog Elektronik Nomor: 005/AP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026 tanggal 18 Mei 2026.')
  );

  // 6. Tabel Rincian Penetapan Nilai HPS per Item
  children.push(
    pText('B. RINCIAN PENETAPAN HARGA PERKIRAAN SENDIRI (HPS) PER ITEM BARANG', { bold: true, size: 18, color: '1E3A8A', before: 50, after: 20 }),
    pText('Nilai satuan HPS telah memperhitungkan keuntungan wajar, biaya pengiriman franco Kantor KPU Kabupaten Ngawi (SLA <= 14 hari), garansi resmi onsite 3 tahun, serta Pajak Pertambahan Nilai (PPN 11%) sesuai ketentuan perpajakan yang berlaku:', { before: 0, after: 30 })
  );

  // Buat Tabel HPS
  const tableRows = [];
  tableRows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 6, type: WidthType.PERCENTAGE }, children: [pText('No', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 16 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 44, type: WidthType.PERCENTAGE }, children: [pText('Uraian Barang / Jasa & Kualifikasi Mutu', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 16 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 8, type: WidthType.PERCENTAGE }, children: [pText('Vol', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 16 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 10, type: WidthType.PERCENTAGE }, children: [pText('Satuan', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 16 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 16, type: WidthType.PERCENTAGE }, children: [pText('Harga Satuan HPS (Rp)', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 16 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 16, type: WidthType.PERCENTAGE }, children: [pText('Total Nilai HPS (Rp)', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 16 })] })
      ]
    })
  );

  let grandTotalHps = 0;
  (items || []).forEach((it, idx) => {
    const vol = Number(it.volume) || 1;
    const hrgSatuan = Number(it.harga_satuan_hps || it.harga_survei_1 || 0);
    const subtotal = Number(it.jumlah_hps) || (vol * hrgSatuan);
    grandTotalHps += subtotal;

    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ borders: BORDER_TABLE, width: { size: 6, type: WidthType.PERCENTAGE }, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 16 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 44, type: WidthType.PERCENTAGE }, children: [
            pText(it.uraian_item || '-', { bold: true, size: 16, after: 2 }),
            pText(`Spek: ${it.spesifikasi_teknis || '-'}`, { size: 14, color: '475569' })
          ] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 8, type: WidthType.PERCENTAGE }, children: [pText(String(vol), { align: AlignmentType.CENTER, size: 16 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 10, type: WidthType.PERCENTAGE }, children: [pText(it.satuan || 'Unit', { align: AlignmentType.CENTER, size: 16 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 16, type: WidthType.PERCENTAGE }, children: [pText(formatRupiah(hrgSatuan), { align: AlignmentType.RIGHT, size: 16 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 16, type: WidthType.PERCENTAGE }, children: [pText(formatRupiah(subtotal), { bold: true, align: AlignmentType.RIGHT, size: 16 })] })
        ]
      })
    );
  });

  // Total Row
  tableRows.push(
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          borders: BORDER_TABLE,
          columnSpan: 5,
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [pText('TOTAL NILAI HPS (SUDAH TERMASUK PPN 11% & BIAYA PENGIRIMAN)', { bold: true, align: AlignmentType.RIGHT, size: 16 })]
        }),
        new TableCell({
          borders: BORDER_TABLE,
          shading: { fill: 'F1F5F9', type: ShadingType.CLEAR },
          children: [pText(formatRupiah(grandTotalHps || paket.nilai_hps), { bold: true, color: '1E3A8A', align: AlignmentType.RIGHT, size: 16 })]
        })
      ]
    })
  );

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: tableRows
    }),
    pText(`Terbilang: # ${terbilangRupiah(grandTotalHps || paket.nilai_hps)} #`, {
      bold: true,
      italic: true,
      size: 16,
      before: 15,
      after: 40
    })
  );

  // 7. Pengendalian Pagu Anggaran & Efisiensi
  const paguVal = Number(paket.nilai_pagu) || 0;
  const hpsVal = grandTotalHps || Number(paket.nilai_hps) || 0;
  const efisiensiVal = Math.max(0, paguVal - hpsVal);
  const persenEfisiensi = paguVal > 0 ? ((efisiensiVal / paguVal) * 100).toFixed(2) : '0.00';

  children.push(
    pText('C. PENGENDALIAN BATAS PAGU DIPA & KETENTUAN PELAKSANAAN', { bold: true, size: 18, color: '1E3A8A', before: 40, after: 15 }),
    pNumbered('1.', `Kesesuaian dengan Pagu DIPA: Total HPS sebesar ${formatRupiah(hpsVal)} berada di bawah Pagu Anggaran DIPA Satker sebesar ${formatRupiah(paguVal)}, menghasilkan potensi efisiensi/penghematan kas negara sebesar ${formatRupiah(efisiensiVal)} (${persenEfisiensi}%).`),
    pNumbered('2.', 'Sifat Terbuka Total HPS: Nilai total HPS bersifat terbuka dan tidak rahasia. Total HPS ini diserahkan kepada Pejabat Pengadaan / Pokja Pemilihan dalam Dokumen Persiapan Pengadaan (DPP) sebagai batas tertinggi penawaran/negosiasi harga yang sah.'),
    pNumbered('3.', 'Kerahasiaan Rincian Harga Satuan: Rincian kertas kerja perhitungan harga satuan HPS bersifat rahasia dan dilarang dibocorkan kepada penyedia sebelum batas akhir pemasukan penawaran/selesainya pemilihan demi mencegah terjadinya kartel harga atau persekongkolan tender.'),
    pNumbered('4.', 'Larangan Perhitungan: Penyusunan HPS ini tidak memperhitungkan biaya tak terduga (contingency), biaya lain-lain, dan Pajak Penghasilan (PPh) yang merupakan kewajiban badan usaha penyedia.'),
    pText('Demikian Berita Acara Penetapan Harga Perkiraan Sendiri (HPS) ini dibuat dan ditetapkan dengan sebenar-benarnya untuk dipergunakan sebagai acuan baku dalam proses pemilihan penyedia barang/jasa.', {
      before: 20,
      after: 80
    })
  );

  // 8. Tanda Tangan Tunggal PPK
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 55, type: WidthType.PERCENTAGE }, children: [pText(' ')] }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 45, type: WidthType.PERCENTAGE },
              children: [
                pText('Ditetapkan di Ngawi', { align: AlignmentType.CENTER, size: 16, before: 0, after: 2, keepWithNext: true }),
                pText(`Pada tanggal ${tglHpsStr}`, { align: AlignmentType.CENTER, size: 16, before: 0, after: 2, keepWithNext: true }),
                pText('Pejabat Pembuat Komitmen (PPK)', { bold: true, align: AlignmentType.CENTER, size: 16, before: 0, after: 2, keepWithNext: true }),
                pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 16, before: 0, after: 240, keepWithNext: true }),
                pText(`( ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'} )`, { bold: true, align: AlignmentType.CENTER, size: 16, before: 0, after: 2, keepWithNext: true }),
                pText(`NIP. ${ppk.nip || '19840101 200912 1 001'}`, { align: AlignmentType.CENTER, size: 15, before: 0, after: 0 })
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
                  text: `Dokumen Tahap 06 (${isRefHarga ? 'BA-REF' : 'BA-HPS'}) - No: ${noHps}`,
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

    // BAB IV: PENGUJIAN & PENILAIAN 5 PARAMETER KELAYAKAN PER VENDOR PER BARANG
    pText('IV. PENGUJIAN DAN PENILAIAN 5 PARAMETER KELAYAKAN PER VENDOR PER BARANG (PASAL 8 PERLEM 2/2026)', { bold: true, size: 18, color: '1E3A8A', before: 16, after: 10 }),
    pText('Berpedoman pada Pasal 8 Peraturan LKPP Nomor 2 Tahun 2026 jo. Keputusan Kepala LKPP Nomor 177 Tahun 2024 (Katalog Versi 6), PPK melakukan pengujian kelayakan secara komprehensif pada setiap item belanja barang terhadap alternatif calon pelaku usaha/produk hasil survei multi-sumber (E-Katalog v6, Toko Daring Olshop, Penyedia Offline, dan Riwayat Kontrak), mencakup: (1) Spesifikasi Teknis, (2) Ketersediaan Stok, (3) Kewajaran Harga, (4) SLA Pengiriman, dan (5) Garansi Layanan Purna Jual Onsite:', { size: 16.5, before: 0, after: 20 })
  );

  // Buat Tabel Matriks Evaluasi 5 Parameter Per Alternatif untuk Setiap Item (Netral & Fleksibel)
  (items || []).forEach((it, idx) => {
    // Ambil data evaluasi alternatif jika tersedia dari JSON, atau fallback ke survei 1, 2, 3
    let alternatifs = [];
    if (it.evaluasi_pasar_json && typeof it.evaluasi_pasar_json === 'object' && Array.isArray(it.evaluasi_pasar_json.alternatifs) && it.evaluasi_pasar_json.alternatifs.length) {
      alternatifs = it.evaluasi_pasar_json.alternatifs;
    } else {
      const s1 = Number(it.harga_survei_1) || 0;
      const s2 = Number(it.harga_survei_2) || s1;
      const s3 = Number(it.harga_survei_3) || s1;
      alternatifs = [
        { alt_no: 1, jenis_sumber: 'Katalog Elektronik (E-Katalog v6)', sumber: it.sumber_survei_1 || 'PT. Astra Graphia Information Technology', produk: it.merk_tipe_katalog || 'Dell PowerEdge T350 / PC SIDALIH', harga: s1, sla_hari: 14, garansi: '3 Tahun Onsite Resmi', p1: 1, p2: 1, p3: 1, p4: 1, p5: 1, skor: 5 },
        { alt_no: 2, jenis_sumber: 'Toko Daring / Marketplace (Olshop)', sumber: it.sumber_survei_2 || 'PT. Bhinneka Mentari Dimensi', produk: 'Lenovo ThinkSystem ST250 / PC SIDALIH', harga: s2, sla_hari: 10, garansi: '3 Tahun Onsite Resmi', p1: 1, p2: 1, p3: 1, p4: 1, p5: 1, skor: 5 },
        { alt_no: 3, jenis_sumber: 'Penyedia / Toko Konvensional (Offline)', sumber: it.sumber_survei_3 || 'Distributor Resmi HP Enterprise', produk: 'HPE ProLiant ML30 Gen11 / PC SIDALIH', harga: s3, sla_hari: 14, garansi: '3 Tahun Onsite Resmi', p1: 1, p2: 1, p3: 1, p4: 1, p5: 1, skor: 5 }
      ];
    }

    children.push(
      pText(`Tabel 4.${idx + 1}. Matriks Pengujian 5 Parameter Kelayakan Pasar Item ${idx + 1}: ${it.uraian_item} (Kuantitas: ${it.volume} ${it.satuan})`, { bold: true, size: 16, color: '1E3A8A', before: 14, after: 6 })
    );

    const vendorEvalHeaders = [
      new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('No', { bold: true, size: 15, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Alternatif Pelaku Usaha, Sumber & Produk', { bold: true, size: 15, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
      new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Harga Satuan Survei', { bold: true, size: 15, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
      new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('1.Spek', { bold: true, size: 13, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
      new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('2.Stok', { bold: true, size: 13, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
      new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('3.Hrg', { bold: true, size: 13, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
      new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('4.SLA', { bold: true, size: 13, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
      new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('5.Grns', { bold: true, size: 13, align: AlignmentType.CENTER, color: 'FFFFFF' })] }),
      new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A' }, children: [pText('Hasil Pengujian', { bold: true, size: 14, align: AlignmentType.CENTER, color: 'FFFFFF' })] })
    ];

    const vendorEvalRows = [new TableRow({ children: vendorEvalHeaders })];

    alternatifs.forEach((alt, aIdx) => {
      const altNum = alt.alt_no || (aIdx + 1);
      const hrg = Number(alt.harga || 0);
      const score = Number(alt.skor !== undefined ? alt.skor : (Number(alt.p1 || 0) + Number(alt.p2 || 0) + Number(alt.p3 || 0) + Number(alt.p4 || 0) + Number(alt.p5 || 0)));
      const isLolos = score === 5;

      vendorEvalRows.push(
        new TableRow({
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText(String(altNum), { align: AlignmentType.CENTER, size: 15, bold: true })] }),
            new TableCell({ borders: BORDER_TABLE, children: [
              pText(`Alternatif ${altNum}: ${alt.sumber || ('Penyedia ' + altNum)}`, { bold: true, size: 14.5 }),
              pText(`Sumber: ${alt.jenis_sumber || 'Katalog Elektronik (E-Katalog v6)'}`, { size: 12, italic: true, color: '0284C7' }),
              pText(alt.produk ? ('Produk: ' + alt.produk) : 'Produk Survei Pasar', { size: 12.5, color: '1E3A8A' }),
              alt.url ? pText('Tautan/Bukti: ' + (alt.url.length > 55 ? alt.url.substring(0, 52) + '...' : alt.url), { size: 10, italic: true, color: '64748B' }) : pText('', { size: 1 })
            ] }),
            new TableCell({ borders: BORDER_TABLE, children: [
              pText(formatRupiah(hrg), { bold: true, size: 14.5, color: isLolos ? '047857' : '1E3A8A', align: AlignmentType.RIGHT }),
              pText(alt.sla_hari ? (`SLA ${alt.sla_hari} Hari`) : '', { size: 11, italic: true, color: '64748B', align: AlignmentType.RIGHT })
            ] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(alt.p1 ? '✓' : '✗', { font: 'Segoe UI Symbol', align: AlignmentType.CENTER, bold: true, size: 18, color: alt.p1 ? '047857' : 'B91C1C' })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(alt.p2 ? '✓' : '✗', { font: 'Segoe UI Symbol', align: AlignmentType.CENTER, bold: true, size: 18, color: alt.p2 ? '047857' : 'B91C1C' })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(alt.p3 ? '✓' : '✗', { font: 'Segoe UI Symbol', align: AlignmentType.CENTER, bold: true, size: 18, color: alt.p3 ? '047857' : 'B91C1C' })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(alt.p4 ? '✓' : '✗', { font: 'Segoe UI Symbol', align: AlignmentType.CENTER, bold: true, size: 18, color: alt.p4 ? '047857' : 'B91C1C' })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(alt.p5 ? '✓' : '✗', { font: 'Segoe UI Symbol', align: AlignmentType.CENTER, bold: true, size: 18, color: alt.p5 ? '047857' : 'B91C1C' })] }),
            new TableCell({ borders: BORDER_TABLE, children: [
              pText(`${score}/5 ${isLolos ? 'LOLOS UJI' : 'CATATAN'}`, { bold: true, size: 13, color: isLolos ? '047857' : 'B45309', align: AlignmentType.CENTER }),
              pText(isLolos ? 'MEMENUHI SYARAT' : 'PERLU KLARIFIKASI', { size: 11, color: isLolos ? '15803D' : 'B45309', align: AlignmentType.CENTER })
            ] })
          ]
        })
      );
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: vendorEvalRows
      }),
      pText('', { after: 12 })
    );
  });
  children.push(
    pText('Tabel 4.3. Rangkuman Pembuktian 5 Parameter Baku Kelayakan Katalog Terpilih:', { bold: true, size: 16, color: '1E3A8A', before: 12, after: 8 })
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

    // BAB V: KESIMPULAN PENILAIAN KELAYAKAN PPK & PENYERAHAN TRANSAKSI KEPADA PEJABAT PENGADAAN
    pText('V. KESIMPULAN PENILAIAN KELAYAKAN PPK & PENYERAHAN TRANSAKSI KEPADA PEJABAT PENGADAAN', { bold: true, size: 18, color: '1E3A8A', before: 16, after: 10 }),
    pNumbered('1.', `Status Ketersediaan di Katalog Elektronik v6: ${paket.tersedia_di_katalog || 'Ya, Tersedia & Sesuai'}. Seluruh komoditas barang kebutuhan satker telah tayang dan diverifikasi pada platform Katalog Elektronik Versi 6 LKPP.`, { level: 1, size: 16.5, before: 3, after: 3 }),
    pNumbered('2.', 'Pengujian Objektif 5 Parameter Baku Kelayakan (Pasal 8 Perlem LKPP 2/2026): Seluruh alternatif produk yang ditelaah terbukti memenuhi spesifikasi teknis fungsional KAK, kepastian ketersediaan pasokan distributor, kewajaran harga di bawah Pagu DIPA, kesanggupan batas waktu pengiriman (SLA), dan jaminan garansi resmi pabrikan onsite.', { level: 1, size: 16.5, before: 0, after: 3 }),
    pNumbered('3.', 'Netralitas PPK & Pemisahan Wewenang (Tupoksi): PPK memposisikan seluruh alternatif penyedia secara setara dan objektif tanpa menetapkan rekomendasi sepihak atas rekanan tertentu. Pelaksanaan pemilihan penyedia final, negosiasi teknis/harga, dan eksekusi transaksi E-Purchasing diserahkan sepenuhnya kepada Pejabat Pengadaan (PP) sesuai kewenangan atributif Pasal 12 ayat (1) huruf a Perpres Nomor 16 Tahun 2018 jo. Perpres Nomor 46 Tahun 2025.', { level: 1, size: 16.5, before: 0, after: 3 }),
    pNumbered('4.', 'Fleksibilitas Skenario Transaksi (Tunggal maupun Multi-Order): Pejabat Pengadaan berwenang secara penuh menentukan eksekusi transaksi melalui Skenario A (Penyedia Tunggal / Agregator Multibrand) ATAU Skenario B (Multi-Order / Surat Pesanan Terpisah SP-01 Server dan SP-02 Workstation) berlandaskan ketersediaan riil stok dan efisiensi anggaran negara yang optimal.', { level: 1, size: 16.5, before: 0, after: 3 }),
    pNumbered('5.', `Tautan Akses Produk Katalog Elektronik: ${paket.link_produk_katalog_1 || 'https://e-katalog.lkpp.go.id/'} ${paket.link_produk_katalog_2 ? 'dan ' + paket.link_produk_katalog_2 : ''}.`, { level: 1, size: 16.5, before: 0, after: 14 }),

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

function buildStage7Sections(ctx, tahapRow, keu, isFirstStageInDoc = true) {
  const { paket, items, ppk, settings } = ctx;
  const bentuk = paket.bentuk_kontrak || 'Surat Pesanan';
  const jenis = paket.jenis_kontrak || 'Lumsum';
  const noRk = tahapRow.nomor_dokumen || `007/RK/${paket.kode_paket_internal || 'PBJ-2026-001'}/PPK-PBJ/KPU-NGW/V/2026`;
  const tglRkStr = formatTanggalIndo(tahapRow.tanggal_dokumen || '2026-05-18');
  const hariTanggalRk = formatHariTanggalBeritaAcara(tahapRow.tanggal_dokumen || '2026-05-18');
  const isKonstruksi = String(paket.jenis_pengadaan || '').includes('Konstruksi');

  const hpsBasis = Number(paket.nilai_hps || paket.nilai_pagu || 0);
  const dppEst = Math.round(hpsBasis / (1 + (Number(paket.tarif_ppn ?? 11) / 100)));
  const dendaHariEst = Math.round(dppEst / 1000);
  const umPersen = Number(paket.persen_uang_muka ?? 0);
  const umNominal = Math.round((hpsBasis * umPersen) / 100);
  const caraBayar = paket.cara_pembayaran || 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)';
  const basisDenda = paket.basis_denda || '1 permil per hari dari Harga Kontrak sebelum PPN (DPP)';
  const garansiStr = paket.ketentuan_garansi || (isKonstruksi
    ? `Masa Pemeliharaan Konstruksi 180 Hari Kalender (6 Bulan) — Retensi / Jaminan Pemeliharaan 5% (${formatRupiah(keu.nilaiRetensi5Persen)})`
    : 'Sertifikat Garansi Purna Jual Resmi Pabrikan Minimal 1 Tahun (365 Hari Kalender) — Bebas Retensi 5%');
  const sengketaStr = paket.penyelesaian_sengketa || 'Musyawarah untuk Mufakat, dilanjutkan Layanan Penyelesaian Sengketa (LPS) LKPP';
  const wajibJaminan = Number(paket.wajib_jaminan_pelaksanaan ?? 0) === 1;
  const slaHari = Number(paket.masa_pelaksanaan_hari || 14);
  const slaTerbilang = terbilangRupiah(slaHari).replace(/\s*rupiah$/i, '').toLowerCase();
  const lokasiStr = paket.lokasi_pekerjaan || 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi';

  const makeHeader = (label) => new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({
            text: `${label} | No: ${noRk}`,
            size: 15,
            color: '64748B',
            font: 'Cambria',
            italics: true
          })
        ]
      })
    ]
  });

  const makeFooter = (prefixText = '') => new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 30, after: 0 },
        children: [
          ...(prefixText ? [new TextRun({ text: `${prefixText}  —  `, size: 15, color: '64748B', font: 'Cambria', italics: true })] : []),
          new TextRun({ text: 'Halaman ', size: 16, color: '64748B', font: 'Cambria' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B', font: 'Cambria' }),
          new TextRun({ text: ' dari ', size: 16, color: '64748B', font: 'Cambria' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748B', font: 'Cambria' })
        ]
      })
    ]
  });

  const buildPpkSingleSignature = (captionAtas = 'Ditetapkan di Ngawi') => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ borders: BORDER_NONE, width: { size: 52, type: WidthType.PERCENTAGE }, children: [pText(' ')] }),
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 48, type: WidthType.PERCENTAGE },
            children: [
              pText(captionAtas, { align: AlignmentType.CENTER, size: 16, before: 0, after: 2, keepNext: true }),
              pText(`Pada tanggal ${tglRkStr}`, { align: AlignmentType.CENTER, size: 16, before: 0, after: 2, keepNext: true }),
              pText('Pejabat Pembuat Komitmen (PPK)', { bold: true, align: AlignmentType.CENTER, size: 16, before: 0, after: 2, keepNext: true }),
              pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 16, before: 0, after: 210, keepNext: true }),
              pText(`( ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'} )`, { bold: true, align: AlignmentType.CENTER, size: 16, before: 0, after: 2, keepNext: true }),
              pText(`NIP. ${ppk.nip || '19840101 200912 1 001'}`, { align: AlignmentType.CENTER, size: 15, before: 0, after: 0 })
            ]
          })
        ]
      })
    ]
  });

  // =========================================================================
  // DOKUMEN 1: BERITA ACARA PENETAPAN RANCANGAN KONTRAK, SSUK, DAN SSKK (1 HALAMAN UTUH)
  // =========================================================================
  const doc1Children = [
    ...buildKopSuratKpu(settings),
    pText(`BERITA ACARA PENETAPAN RANCANGAN KONTRAK (${bentuk.toUpperCase()}), SSUK, DAN SSKK`, {
      bold: true, size: 20, align: AlignmentType.CENTER, before: 20, after: 6
    }),
    pText('DOKUMEN TAHAP 07 (FASE II: PERSIAPAN PENGADAAN OLEH PPK) — PASAL 11 & PASAL 25 PERPRES 46/2025 JO. PERLEM LKPP 2/2026 & 3/2026', {
      size: 13.5, align: AlignmentType.CENTER, color: '1E3A8A', bold: true, before: 0, after: 12
    }),
    pText(`Nomor: ${noRk}`, {
      size: 16.5, align: AlignmentType.CENTER, color: '475569', bold: true, before: 0, after: 18
    }),
    pText(`${hariTanggalRk.kalimatFormal}, bertempat di Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jalan Untung Suropati Nomor 48 Ngawi, Pejabat Pembuat Komitmen (PPK) Satuan Kerja KPU Kabupaten Ngawi melaksanakan penyusunan dan penetapan Rancangan Kontrak (${bentuk} — ${jenis}), Syarat-Syarat Umum Kontrak (SSUK), dan Syarat-Syarat Khusus Kontrak (SSKK) sebagai dokumen persiapan pengadaan yang mengikat untuk paket pekerjaan berikut:`, {
      size: 15.5, before: 6, after: 14
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('1. Nama Paket Pekerjaan', { bold: true, size: 15.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 3, type: WidthType.PERCENTAGE }, children: [pText(':', { size: 15.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 67, type: WidthType.PERCENTAGE }, children: [pText(paket.nama_paket || '-', { bold: true, size: 15.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('2. Kode Paket & Kode RUP SiRUP', { bold: true, size: 15.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 3, type: WidthType.PERCENTAGE }, children: [pText(':', { size: 15.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 67, type: WidthType.PERCENTAGE }, children: [pText(`${paket.kode_paket_internal || 'PBJ-2026-001'} | Kode RUP: ${paket.kode_rup || 'RUP-2026-657811-01'}`, { size: 15.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('3. Pagu DIPA & Nilai Batas HPS', { bold: true, size: 15.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 3, type: WidthType.PERCENTAGE }, children: [pText(':', { size: 15.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 67, type: WidthType.PERCENTAGE }, children: [pText(`MAK ${paket.kode_akun_mak || '532111'} | Pagu: ${formatRupiah(paket.nilai_pagu)} | ${paket.jenis_kertas_harga || 'HPS'}: ${formatRupiah(hpsBasis)}`, { bold: true, color: '1E3A8A', size: 15.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('4. Bentuk & Jenis Perikatan', { bold: true, size: 15.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 3, type: WidthType.PERCENTAGE }, children: [pText(':', { size: 15.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 67, type: WidthType.PERCENTAGE }, children: [pText(`${bentuk} — Kontrak ${jenis} (Metode: ${paket.metode_pemilihan || 'E-Purchasing'})`, { bold: true, size: 15.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_NONE, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('5. Identitas Calon Penyedia', { bold: true, size: 15.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 3, type: WidthType.PERCENTAGE }, children: [pText(':', { size: 15.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_NONE, width: { size: 67, type: WidthType.PERCENTAGE }, children: [pText('[DRAFT — AKAN DIISI SETELAH PEMILIHAN PENYEDIA PADA TAHAP 9 & TTD TAHAP 13]', { bold: true, color: 'B45309', size: 15, before: 1, after: 1 })] })
          ]
        })
      ]
    }),
    pText('A. LANDASAN YURIDIS PENETAPAN RANCANGAN KONTRAK OLEH PPK', { bold: true, size: 16.5, color: '1E3A8A', before: 16, after: 8 }),
    pNumbered('1.', 'Pasal 11 ayat (1) huruf c dan Pasal 25 huruf c Peraturan Presiden Nomor 16 Tahun 2018 sebagaimana telah diubah terakhir dengan Peraturan Presiden Nomor 46 Tahun 2025 mewajibkan PPK menyusun dan menetapkan Rancangan Kontrak sebagai bagian dari Dokumen Persiapan Pengadaan (DPP) sebelum diserahkan kepada Pejabat Pengadaan / Pokja Pemilihan pada Tahap 8.', { size: 15, before: 2, after: 4 }),
    pNumbered('2.', `Pemilihan Bentuk Perikatan "${bentuk}" dengan Jenis Kontrak "${jenis}" telah sesuai dengan ketentuan Pasal 27, Pasal 28, Pasal 29, dan Pasal 78 Perpres Nomor 46 Tahun 2025 jo. Peraturan LKPP Nomor 2 Tahun 2026 dan Peraturan LKPP Nomor 3 Tahun 2026.`, { size: 15, before: 2, after: 4 }),
    pNumbered('3.', 'Pada tahap persiapan pengadaan ini (Tahap 7), identitas badan usaha penyedia, nomor rekening bank penyedia, serta nilai kontrak hasil negosiasi belum dicantumkan guna menjamin objektivitas pemilihan dan mencegah benturan kepentingan.', { size: 15, before: 2, after: 10 }),

    pText('B. KOMPONEN DOKUMEN RANCANGAN KONTRAK YANG DITETAPKAN DAN DISAHKAN PPK', { bold: true, size: 16.5, color: '1E3A8A', before: 12, after: 8 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 6, type: WidthType.PERCENTAGE }, children: [pText('No', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 14.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 34, type: WidthType.PERCENTAGE }, children: [pText('Nama Dokumen Bagian Rancangan Kontrak', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 14.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 60, type: WidthType.PERCENTAGE }, children: [pText('Substansi Pokok & Status Pengesahan PPK', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 14.5, before: 2, after: 2 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('1', { align: AlignmentType.CENTER, size: 14.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Berita Acara Penetapan Rancangan Kontrak (Dokumen I)', { bold: true, size: 14.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Lembar pengesahan penetapan Rancangan ${bentuk}, SSUK, dan SSKK oleh PPK Nomor: ${noRk}.`, { size: 14.5, before: 2, after: 2 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('2', { align: AlignmentType.CENTER, size: 14.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Rancangan Naskah ${bentuk} & Daftar Kuantitas (Dokumen II)`, { bold: true, size: 14.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Format naskah perikatan Kontrak ${jenis} lengkap dengan Rancangan Daftar Kuantitas dan Spesifikasi Teknis (tanpa harga kontrak & tanpa nama rekanan).`, { size: 14.5, before: 2, after: 2 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('3', { align: AlignmentType.CENTER, size: 14.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('BAB I. Syarat-Syarat Umum Kontrak / SSUK (Dokumen III)', { bold: true, size: 14.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Memuat 67 (enam puluh tujuh) Klausul Lengkap SSUK (Bagian A s.d. Bagian E: Klausul 1 Definisi s.d. Klausul 67 Itikad Baik) dengan format 2 kolom berdampingan baku KPU Kabupaten Ngawi.', { size: 14.5, before: 2, after: 2 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('4', { align: AlignmentType.CENTER, size: 14.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('BAB II. Syarat-Syarat Khusus Kontrak / SSKK (Dokumen IV)', { bold: true, size: 14.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Memuat 25 (dua puluh lima) Klausul Spesifik SSKK (Huruf A s.d. Huruf Y: Pengertian, Korespondensi, Wakil Sah, Jenis Kontrak, SLA ${slaHari} Hari, Serah Terima, Garansi, Pembayaran ${caraBayar}, Uang Muka ${umPersen}%, Denda 1‰ DPP, Pengepakan, Pengiriman, s.d. Penyesuaian Harga).`, { size: 14.5, before: 2, after: 2 })] })
          ]
        })
      ]
    }),
    pText('Demikian Berita Acara Penetapan Rancangan Kontrak, SSUK, dan SSKK ini ditetapkan secara sah oleh Pejabat Pembuat Komitmen (PPK) beserta ke-3 (tiga) dokumen lampiran yang menjadi satu kesatuan tak terpisahkan untuk diserahkan dalam Dokumen Persiapan Pengadaan (DPP) pada Tahap 8.', {
      size: 15, before: 14, after: 18, keepNext: true
    }),
    buildPpkSingleSignature('Ditetapkan di Ngawi')
  ];

  // =========================================================================
  // DOKUMEN 2: RANCANGAN NASKAH PERIKATAN / SURAT PESANAN (DRAFT TANPA NAMA REKANAN & HARGA)
  // =========================================================================
  const itemRowsDraft = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 6, type: WidthType.PERCENTAGE }, children: [pText('No', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 14.5 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 44, type: WidthType.PERCENTAGE }, children: [pText('Uraian Barang/Jasa & Spesifikasi Teknis yang Dipesan', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 14.5 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 8, type: WidthType.PERCENTAGE }, children: [pText('Vol', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 14.5 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 10, type: WidthType.PERCENTAGE }, children: [pText('Satuan', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 14.5 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 16, type: WidthType.PERCENTAGE }, children: [pText('Harga Satuan Kontrak (Rp)', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 14.5 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 16, type: WidthType.PERCENTAGE }, children: [pText('Total Harga Kontrak (Rp)', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 14.5 })] })
      ]
    })
  ];

  (items || []).forEach((it, idx) => {
    itemRowsDraft.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ borders: BORDER_TABLE, width: { size: 6, type: WidthType.PERCENTAGE }, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 14.5 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 44, type: WidthType.PERCENTAGE }, children: [
            pText(it.uraian_item || '-', { bold: true, size: 14.5, after: 2 }),
            pText(`Spesifikasi Teknis: ${it.spesifikasi_teknis || '-'}`, { size: 13.5, color: '475569' })
          ] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 8, type: WidthType.PERCENTAGE }, children: [pText(String(it.volume || 1), { align: AlignmentType.CENTER, size: 14.5 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 10, type: WidthType.PERCENTAGE }, children: [pText(it.satuan || 'Unit', { align: AlignmentType.CENTER, size: 14.5 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 16, type: WidthType.PERCENTAGE }, children: [pText('[Diisi Pasca Negosiasi Tahap 9]', { italic: true, color: '64748B', align: AlignmentType.CENTER, size: 13.5 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 16, type: WidthType.PERCENTAGE }, children: [pText('[Diisi Pasca Negosiasi Tahap 9]', { italic: true, color: '64748B', align: AlignmentType.CENTER, size: 13.5 })] })
        ]
      })
    );
  });

  itemRowsDraft.push(
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ borders: BORDER_TABLE, columnSpan: 4, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText(`TOTAL NILAI KONTRAK (${jenis.toUpperCase()} — TERMASUK PPN ${paket.tarif_ppn ?? 11}% & ONGKOS KIRIM FRANCO SATKER)`, { bold: true, align: AlignmentType.RIGHT, size: 14.5 })] }),
        new TableCell({ borders: BORDER_TABLE, columnSpan: 2, shading: { fill: 'FEF3C7', type: ShadingType.CLEAR }, children: [pText('[DIISI NILAI KONTRAK FINAL PADA TAHAP 13]', { bold: true, color: 'B45309', align: AlignmentType.CENTER, size: 14 })] })
      ]
    })
  );

  const doc2Children = [
    ...buildKopSuratKpu(settings),
    pText(`[ RANCANGAN / DRAFT NASKAH PERIKATAN — LAMPIRAN I DOKUMEN PERSIAPAN PENGADAAN TAHAP 07 ]`, {
      bold: true, size: 14, align: AlignmentType.CENTER, color: 'B45309', before: 10, after: 6
    }),
    pText(`RANCANGAN ${bentuk.toUpperCase()} (${(paket.metode_pemilihan || 'E-PURCHASING').toUpperCase()})`, {
      bold: true, size: 20, align: AlignmentType.CENTER, before: 0, after: 4
    }),
    pText(`PAKET PEKERJAAN: ${(paket.nama_paket || '-').toUpperCase()}`, {
      bold: true, size: 15.5, align: AlignmentType.CENTER, color: '1E3A8A', before: 0, after: 4
    }),
    pText(`Nomor Rancangan: ${noRk}  |  Nomor Kontrak Final: [Diisi pada Tahap 13]`, {
      size: 15, align: AlignmentType.CENTER, color: '475569', bold: true, before: 0, after: 18
    }),
    pText(`Pada hari ini [Diisi Hari & Tanggal Penandatanganan Kontrak pada Tahap 13], bertempat di Kantor Komisi Pemilihan Umum Kabupaten Ngawi, kami yang bertanda tangan di bawah ini:`, {
      size: 15, before: 4, after: 10
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, width: { size: 50, type: WidthType.PERCENTAGE }, children: [
              pText('I. PIHAK KESATU (PEJABAT PEMBUAT KOMITMEN)', { bold: true, size: 14.5, color: '1E3A8A', before: 2, after: 4 }),
              pText(`Nama Pejabat : ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'}`, { bold: true, size: 14.5, before: 1, after: 1 }),
              pText(`NIP : ${ppk.nip || '19840101 200912 1 001'}`, { size: 14, before: 1, after: 1 }),
              pText(`Jabatan : Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi`, { size: 14, before: 1, after: 1 }),
              pText(`Alamat Satker : Jl. Untung Suropati No. 48 Ngawi`, { size: 14, before: 1, after: 1 }),
              pText('Bertindak untuk dan atas nama Negara Republik Indonesia c.q. Satuan Kerja Komisi Pemilihan Umum Kabupaten Ngawi, selanjutnya disebut PIHAK KESATU (PPK).', { italic: true, size: 13.5, color: '334155', before: 4, after: 2 })
            ] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'FFFBEB', type: ShadingType.CLEAR }, width: { size: 50, type: WidthType.PERCENTAGE }, children: [
              pText('II. PIHAK KEDUA (PENYEDIA BARANG/JASA)', { bold: true, size: 14.5, color: 'B45309', before: 2, after: 4 }),
              pText('Nama Perusahaan : [DRAFT — Diisi Pasca Pemilihan Tahap 9]', { bold: true, size: 14.5, color: '92400E', before: 1, after: 1 }),
              pText('Nama Wakil Sah : [DRAFT — Diisi Nama Direktur / Kuasa Sah]', { size: 14, before: 1, after: 1 }),
              pText('Jabatan & Akta/NIB : [DRAFT — Diisi Jabatan & NIB Penyedia]', { size: 14, before: 1, after: 1 }),
              pText('NPWP & Rekening : [DRAFT — Diisi NPWP & No. Rekening Bank]', { size: 14, before: 1, after: 1 }),
              pText('Bertindak untuk dan atas nama badan usaha Penyedia Pelaksana Pekerjaan tersebut di atas, selanjutnya disebut PIHAK KEDUA (PENYEDIA).', { italic: true, size: 13.5, color: '334155', before: 4, after: 2 })
            ] })
          ]
        })
      ]
    }),
    pText('Dengan ini PIHAK KESATU dan PIHAK KEDUA sepakat untuk mengikatkan diri dalam Perikatan Pengadaan Barang/Jasa Pemerintah dengan ketentuan pokok dan rincian daftar kuantitas sebagai berikut:', {
      size: 15, before: 12, after: 10
    }),
    pText('A. DAFTAR KUANTITAS DAN SPESIFIKASI TEKNIS BARANG/JASA YANG DIPESAN', { bold: true, size: 16, color: '1E3A8A', before: 6, after: 8 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: itemRowsDraft
    }),
    pText('B. KETENTUAN POKOK PERIKATAN DALAM RANCANGAN KONTRAK INI', { bold: true, size: 16, color: '1E3A8A', before: 16, after: 8 }),
    pNumbered('1.', `Jenis dan Sifat Perikatan: Perikatan ini menggunakan Bentuk "${bentuk}" dengan Jenis Kontrak "${jenis}" sesuai Pasal 27 dan Pasal 28 Perpres Nomor 46 Tahun 2025, di mana seluruh risiko biaya pengiriman, asuransi ekspedisi, instalasi, uji fungsi, dan pajak ditanggung sepenuhnya oleh PIHAK KEDUA.`, { size: 14.5, before: 2, after: 4 }),
    pNumbered('2.', `Jangka Waktu Pelaksanaan (SLA) & Tempat Penyerahan: PIHAK KEDUA wajib menyerahkan seluruh barang dalam keadaan 100% baru, orisinil, dan berfungsi baik selambat-lambatnya dalam waktu ${slaHari} (${slaTerbilang}) Hari Kalender sejak diterbitkannya ${bentuk}, diserahkan Franco ${lokasiStr}.`, { size: 14.5, before: 2, after: 4 }),
    pNumbered('3.', `Cara Pembayaran & Kebijakan Uang Muka: Pembayaran dilakukan secara ${caraBayar}. Kebijakan Uang Muka ditetapkan sebesar ${umPersen}% (${umPersen === 0 ? 'Tanpa Uang Muka' : `Estimasi ${formatRupiah(umNominal)} dengan Jaminan Uang Muka 100%`}).`, { size: 14.5, before: 2, after: 4 }),
    pNumbered('4.', `Sanksi Denda Keterlambatan: Apabila PIHAK KEDUA terlambat menyerahkan pekerjaan melampaui batas waktu SLA, dikenakan denda keterlambatan sebesar 1‰ (satu permil) per hari kalender keterlambatan dari nilai DPP sebelum PPN sesuai Pasal 78 ayat (5) Perpres Nomor 46 Tahun 2025 jo. PMK Nomor 84 Tahun 2025.`, { size: 14.5, before: 2, after: 4 }),
    pNumbered('5.', 'Keterikatan pada SSUK dan SSKK: Seluruh ketentuan detail mengenai hak, kewajiban, garansi purna jual, keadaan kahar, pemutusan kontrak, dan penyelesaian sengketa tunduk sepenuhnya pada Dokumen Syarat-Syarat Umum Kontrak (SSUK) dan Syarat-Syarat Khusus Kontrak (SSKK) yang menjadi bagian tak terpisahkan dari naskah perikatan ini.', { size: 14.5, before: 2, after: 14, keepNext: true }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                pText('PIHAK KEDUA (PENYEDIA)', { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepNext: true }),
                pText('[Nama Perusahaan Penyedia Terpilih]', { align: AlignmentType.CENTER, size: 15, color: 'B45309', before: 0, after: 200, keepNext: true }),
                pText('( [DRAFT — DITANDATANGANI PADA TAHAP 13] )', { bold: true, align: AlignmentType.CENTER, size: 14.5, color: 'B45309', before: 0, after: 2, keepNext: true }),
                pText('Jabatan: Direktur / Wakil Sah Penyedia', { align: AlignmentType.CENTER, size: 14.5, color: '64748B', before: 0, after: 0 })
              ]
            }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                pText(`Ditetapkan Rancangannya di Ngawi, ${tglRkStr}`, { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepNext: true }),
                pText('PIHAK KESATU — PEJABAT PEMBUAT KOMITMEN (PPK)', { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepNext: true }),
                pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 15.5, before: 0, after: 180, keepNext: true }),
                pText(`( ${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN'} )`, { bold: true, align: AlignmentType.CENTER, size: 15.5, before: 0, after: 2, keepNext: true }),
                pText(`NIP. ${ppk.nip || '19840101 200912 1 001'}`, { align: AlignmentType.CENTER, size: 14.5, before: 0, after: 0 })
              ]
            })
          ]
        })
      ]
    })
  ];

  // =========================================================================
  // DOKUMEN 3: BAB I. SYARAT-SYARAT UMUM KONTRAK (SSUK) — 67 KLAUSUL LENGKAP (FORMAT 2 KOLOM BAKU KPU NGAWI)
  // =========================================================================
  const BORDER_SSUK_ROW = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  };

  const ssukTableRows = [];
  SSUK_67_ROWS.forEach((row) => {
    if (row.section) {
      ssukTableRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              borders: BORDER_NONE,
              columnSpan: 2,
              shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
              children: [
                pText(row.section, {
                  bold: true,
                  size: 16,
                  color: '1E3A8A',
                  before: 10,
                  after: 6,
                  keepNext: true
                })
              ]
            })
          ]
        })
      );
      return;
    }

    if (row.subsection) {
      ssukTableRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              borders: BORDER_NONE,
              columnSpan: 2,
              children: [
                pText(row.subsection, {
                  bold: true,
                  size: 15,
                  color: '2E5496',
                  before: 8,
                  after: 4,
                  keepNext: true
                })
              ]
            })
          ]
        })
      );
      return;
    }

    const rightCellChildren = [];
    (row.items || []).forEach(([subNo, subText], idx) => {
      const lines = String(subText || '').split('\n');
      lines.forEach((lineStr, lineIdx) => {
        const isLast = idx === row.items.length - 1 && lineIdx === lines.length - 1;
        if (lineIdx === 0 && subNo) {
          rightCellChildren.push(
            pNumbered(subNo, lineStr, {
              level: 1,
              hanging: 420,
              left: 420,
              size: 14,
              before: 2,
              after: isLast ? 6 : 2
            })
          );
        } else {
          rightCellChildren.push(
            pText(lineStr, {
              size: 14,
              indent: subNo ? { left: 420 } : undefined,
              before: 1,
              after: isLast ? 6 : 2
            })
          );
        }
      });
    });

    ssukTableRows.push(
      new TableRow({
        cantSplit: false,
        children: [
          new TableCell({
            borders: BORDER_SSUK_ROW,
            width: { size: 28, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40, line: 250 },
                indent: { left: 320, hanging: 320 },
                children: [
                  new TextRun({
                    text: `${row.no}\t${row.title}`,
                    bold: true,
                    size: 14.5,
                    font: 'Cambria',
                    color: '2E5496'
                  })
                ]
              })
            ]
          }),
          new TableCell({
            borders: BORDER_SSUK_ROW,
            width: { size: 72, type: WidthType.PERCENTAGE },
            children: rightCellChildren.length ? rightCellChildren : [pText('-', { size: 14 })]
          })
        ]
      })
    );
  });

  const doc3Children = [
    ...buildKopSuratKpu(settings),
    pText('BAB I. SYARAT-SYARAT UMUM KONTRAK (SSUK)', {
      bold: true, size: 20, align: AlignmentType.CENTER, before: 16, after: 6
    }),
    pText(`STANDAR KETENTUAN UMUM PERIKATAN PENGADAAN BARANG/JASA KPU KABUPATEN NGAWI (67 KLAUSUL BAKU)`, {
      size: 13.5, align: AlignmentType.CENTER, color: '1E3A8A', bold: true, before: 0, after: 6
    }),
    pText(`Lampiran II Berita Acara Penetapan Rancangan Kontrak Nomor: ${noRk}  |  Paket: ${paket.nama_paket || '-'}`, {
      size: 14.5, align: AlignmentType.CENTER, color: '475569', bold: true, before: 0, after: 14
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: ssukTableRows
    }),
    pText('Demikian Dokumen BAB I. Syarat-Syarat Umum Kontrak (SSUK) yang terdiri atas 67 (enam puluh tujuh) Klausul ini ditetapkan oleh Pejabat Pembuat Komitmen (PPK) sebagai satu kesatuan yang tidak terpisahkan dari Rancangan Kontrak dan Syarat-Syarat Khusus Kontrak (SSKK).', {
      size: 14.5, before: 14, after: 18, keepNext: true
    }),
    buildPpkSingleSignature('Disahkan sebagai Dokumen SSUK di Ngawi')
  ];

  // =========================================================================
  // DOKUMEN 4: BAB II. SYARAT-SYARAT KHUSUS KONTRAK (SSKK) — 25 KLAUSUL (HURUF A S.D. HURUF Y, FORMAT 2 KOLOM)
  // =========================================================================
  const sskk25RowsData = buildSskk25Rows(ctx, {
    isDraftStage7: true,
    formatRupiah,
    terbilangRupiah,
    formatTanggalIndo
  });

  const sskkTableRows = sskk25RowsData.map(([klausulLabel, isiKetentuan]) => {
    const lines = String(isiKetentuan || '').split('\n');
    const rightParas = lines.map((ln, idx) => pText(ln, {
      size: 14,
      bold: ln.includes('[DRAFT'),
      color: ln.includes('[DRAFT') ? 'B45309' : '0F172A',
      before: 2,
      after: idx === lines.length - 1 ? 6 : 2
    }));

    return new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          borders: BORDER_SSUK_ROW,
          width: { size: 28, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40, line: 250 },
              indent: { left: 320, hanging: 320 },
              children: [
                new TextRun({
                  text: klausulLabel,
                  bold: true,
                  size: 14.5,
                  font: 'Cambria',
                  color: '2E5496'
                })
              ]
            })
          ]
        }),
        new TableCell({
          borders: BORDER_SSUK_ROW,
          width: { size: 72, type: WidthType.PERCENTAGE },
          children: rightParas
        })
      ]
    });
  });

  const doc4Children = [
    ...buildKopSuratKpu(settings),
    pText('BAB II. SYARAT-SYARAT KHUSUS KONTRAK (SSKK)', {
      bold: true, size: 20, align: AlignmentType.CENTER, before: 16, after: 6
    }),
    pText('KETENTUAN SPESIFIK PENGIKAT SSUK (KLAUSUL HURUF A S.D. HURUF Y — FORMAT BAKU KPU KABUPATEN NGAWI)', {
      size: 13.5, align: AlignmentType.CENTER, color: '1E3A8A', bold: true, before: 0, after: 6
    }),
    pText(`Lampiran III Berita Acara Penetapan Rancangan Kontrak Nomor: ${noRk}  |  Kode RUP: ${paket.kode_rup || 'RUP-2026-657811-01'}`, {
      size: 14.5, align: AlignmentType.CENTER, color: '475569', bold: true, before: 0, after: 12
    }),
    pText(`Syarat-Syarat Khusus Kontrak (SSKK) ini merupakan bagian mutlak yang melengkapi, menjelaskan, dan/atau mengubah ketentuan pada pasal-pasal dalam BAB I. Syarat-Syarat Umum Kontrak (SSUK) untuk pelaksanaan Paket Pekerjaan "${paket.nama_paket || '-'}". Apabila terdapat perbedaan pengaturan antara SSUK dan SSKK ini, maka ketentuan dalam SSKK ini yang berlaku dan mengikat para pihak:`, {
      size: 14, before: 2, after: 10
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: sskkTableRows
    }),
    pText('Demikian Dokumen BAB II. Syarat-Syarat Khusus Kontrak (SSKK) (Klausul Huruf A s.d. Huruf Y) ini ditetapkan oleh Pejabat Pembuat Komitmen (PPK) Satuan Kerja KPU Kabupaten Ngawi untuk mengikat pelaksanaan kontrak dan dilampirkan dalam Dokumen Persiapan Pengadaan (DPP).', {
      size: 14.5, before: 14, after: 18, keepNext: true
    }),
    buildPpkSingleSignature('Ditetapkan sebagai Dokumen SSKK di Ngawi')
  ];

  const pageProps = {
    size: { width: 11906, height: 16838 },
    margin: { top: 820, right: 860, bottom: 820, left: 860 }
  };

  return [
    {
      properties: {
        ...(isFirstStageInDoc ? {} : { type: SectionType.NEXT_PAGE }),
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen I Tahap 07: BA Penetapan Rancangan Kontrak, SSUK & SSKK') },
      footers: { default: makeFooter('Dokumen I — BA Penetapan Rancangan Kontrak') },
      children: doc1Children
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: pageProps
      },
      headers: { default: makeHeader(`Dokumen II Tahap 07: Rancangan ${bentuk} (Draft Perikatan)`) },
      footers: { default: makeFooter(`Dokumen II — Rancangan ${bentuk}`) },
      children: doc2Children
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen III Tahap 07: Syarat-Syarat Umum Kontrak (SSUK)') },
      footers: { default: makeFooter('Dokumen III — Syarat-Syarat Umum Kontrak (SSUK)') },
      children: doc3Children
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen IV Tahap 07: Syarat-Syarat Khusus Kontrak (SSKK)') },
      footers: { default: makeFooter('Dokumen IV — Syarat-Syarat Khusus Kontrak (SSKK)') },
      children: doc4Children
    }
  ];
}

function buildStage8Sections(ctx, tahapRow, keu, isFirstStageInDoc) {
  const { paket, items, tahaps, ppk, kpa, pejabatPengadaan, settings } = ctx;
  const noSuratPengantar = tahapRow.nomor_dokumen || `008/SP-DPP/${paket.kode_paket_internal || 'PBJ-2026-001'}/PPK-PBJ/KPU-NGW/V/2026`;
  const noDpp = paket.no_reviu_dpp || tahapRow.no_reviu_dpp || (noSuratPengantar.includes('/SP-DPP/') ? noSuratPengantar.replace('/SP-DPP/', '/BA-RDPP/').replace('/PPK-PBJ/', '/PP-PBJ/') : `008/BA-RDPP/${paket.kode_paket_internal || 'PBJ-2026-001'}/PP-PBJ/KPU-NGW/V/2026`);
  const tglDppRaw = tahapRow.tanggal_dokumen || '2026-05-19';
  const tglDppStr = formatTanggalIndo(tglDppRaw);
  const hariTanggalDpp = formatHariTanggalBeritaAcara(tglDppRaw);
  const tempatReviu = paket.tempat_reviu_dpp || 'Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jalan Untung Suropati Nomor 48 Ngawi';
  const kesimpulanReviu = paket.kesimpulan_reviu_dpp || 'Disetujui Penuh (Dokumen Lengkap, Lanjut Pemilihan Tahap 9)';

  const pelaksana = paket.pelaksana_pemilihan || 'Pejabat Pengadaan';
  const metode = paket.metode_pemilihan || 'E-Purchasing';
  const bentuk = paket.bentuk_kontrak || (metode === 'E-Purchasing' ? 'Surat Pesanan' : 'Surat Perintah Kerja (SPK)');
  const jenis = paket.jenis_kontrak || 'Lumsum';
  const hpsBasis = Number(paket.nilai_hps || paket.nilai_pagu || 0);
  const paguBasis = Number(paket.nilai_pagu || 0);
  const selisihPaguHps = Math.max(0, paguBasis - hpsBasis);
  const persenEfisiensiPagu = paguBasis > 0 ? ((selisihPaguHps / paguBasis) * 100).toFixed(2) : '0.00';
  const slaHari = Number(paket.masa_pelaksanaan_hari || 14);
  const caraBayar = paket.cara_pembayaran || 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)';
  const umPersen = Number(paket.persen_uang_muka ?? 0);
  const basisDenda = paket.basis_denda || '1 permil per hari dari Harga Kontrak sebelum PPN (DPP)';
  const garansiStr = paket.ketentuan_garansi || 'Sertifikat Garansi Purna Jual Resmi Pabrikan Minimal 1 Tahun (365 Hari Kalender) — Bebas Retensi 5%';

  const getTahapInfo = (no, fallbackCode, fallbackDate) => {
    const row = (tahaps || []).find(t => Number(t.no_tahap) === Number(no));
    return {
      nomor: (row && row.nomor_dokumen && row.nomor_dokumen !== '-')
        ? row.nomor_dokumen
        : `${String(no).padStart(3, '0')}/${fallbackCode}/${paket.kode_paket_internal || 'PBJ-2026-001'}/PPK-PBJ/KPU-NGW/V/2026`,
      tanggal: formatTanggalIndo((row && row.tanggal_dokumen) || fallbackDate)
    };
  };

  const t1 = getTahapInfo(1, 'IDK', '2026-05-04');
  const t2 = getTahapInfo(2, 'PMK', '2026-05-06');
  const t3 = getTahapInfo(3, 'RUP', '2026-05-08');
  const t4 = getTahapInfo(4, 'SPEK', '2026-05-11');
  const t5 = getTahapInfo(5, 'AP', '2026-05-13');
  const t6 = getTahapInfo(6, 'HPS', '2026-05-15');
  const t7 = getTahapInfo(7, 'RK', '2026-05-18');

  const ppkNama = (ppk && ppk.nama_lengkap) || 'MOHAMMAD NOOR JIHAN';
  const ppkNip = (ppk && ppk.nip) || '19840101 200912 1 001';
  const kpaNama = (kpa && kpa.nama_lengkap) || 'BUDI RAHAYU';

  let ppNama = (pejabatPengadaan && pejabatPengadaan.nama_lengkap) || 'INDRAYU FATIKA MAHARDIKA';
  let ppNip = (pejabatPengadaan && pejabatPengadaan.nip) || '19950817 202012 2 003';
  let ppJabatan = 'Pejabat Pengadaan Barang/Jasa';
  let ppPeranTitle = 'PIHAK KEDUA (YANG MENERIMA & MEREVIU DPP)';
  let ppTtdLabel = 'PEJABAT PENGADAAN BARANG/JASA';

  if (pelaksana === 'Pokja Pemilihan') {
    ppNama = (paket.nama_pokja || 'POKJA PEMILIHAN UKPBJ KPU PROVINSI JAWA TIMUR').toUpperCase();
    ppNip = (paket.sk_pokja || 'Surat Keputusan Kepala UKPBJ').trim();
    ppJabatan = 'Kelompok Kerja (Pokja) Pemilihan UKPBJ';
    ppPeranTitle = `PIHAK KEDUA (${ppNama})`;
    ppTtdLabel = ppNama;
  } else if (pelaksana === 'PPK Mandiri') {
    ppNama = ppkNama;
    ppNip = ppkNip;
    ppJabatan = 'Pejabat Pembuat Komitmen (Pelaksana Mandiri E-Purchasing)';
    ppPeranTitle = 'PELAKSANA MANDIRI E-PURCHASING (PPK)';
    ppTtdLabel = 'PEJABAT PEMBUAT KOMITMEN (PPK MANDIRI)';
  }

  const makeHeader = (label, docNo = noDpp) => new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({
            text: `${label} | No: ${docNo}`,
            size: 15,
            color: '64748B',
            font: 'Cambria',
            italics: true
          })
        ]
      })
    ]
  });

  const makeFooter = (prefixText = '') => new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 30, after: 0 },
        children: [
          ...(prefixText ? [new TextRun({ text: `${prefixText}  —  `, size: 15, color: '64748B', font: 'Cambria', italics: true })] : []),
          new TextRun({ text: 'Halaman ', size: 16, color: '64748B', font: 'Cambria' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B', font: 'Cambria' }),
          new TextRun({ text: ' dari ', size: 16, color: '64748B', font: 'Cambria' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748B', font: 'Cambria' })
        ]
      })
    ]
  });

  const pelaksanaLabelUpper = pelaksana === 'Pokja Pemilihan'
    ? 'POKJA PEMILIHAN UKPBJ'
    : (pelaksana === 'PPK Mandiri' ? 'PEJABAT PEMBUAT KOMITMEN' : 'PEJABAT PENGADAAN BARANG/JASA');

  const leftUnitLabel = pelaksana === 'Pokja Pemilihan'
    ? ((paket.nama_pokja || '').includes('Provinsi') ? 'KPU Provinsi Jawa Timur' : ((paket.nama_pokja || '').includes('RI') ? 'Komisi Pemilihan Umum Republik Indonesia' : 'KPU Kabupaten Ngawi'))
    : 'KPU Kabupaten Ngawi';

  const buildDualSignatureStage8 = (leftTitle1, leftTitle2, rightTitle1, rightTitle2) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              pText(leftTitle1, { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(leftTitle2, { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(leftUnitLabel, { align: AlignmentType.CENTER, size: 14.5, before: 0, after: 180, keepNext: true }),
              pText(`( ${ppNama} )`, { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(ppNip && ppNip !== '-' ? (ppNip.match(/^\d/) ? `NIP. ${ppNip}` : ppNip) : 'Satuan Kerja KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 13, before: 0, after: 0 })
            ]
          }),
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              pText(rightTitle1, { align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(rightTitle2, { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText('KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 14.5, before: 0, after: 180, keepNext: true }),
              pText(`( ${ppkNama} )`, { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(`NIP. ${ppkNip}`, { align: AlignmentType.CENTER, size: 14, before: 0, after: 0 })
            ]
          })
        ]
      })
    ]
  });

  // =========================================================================
  // DOKUMEN 1: SURAT PENYERAHAN DPP & PERMINTAAN PELAKSANAAN PEMILIHAN PENYEDIA (PPK -> PP)
  // =========================================================================
  const doc1Children = [
    ...buildKopSuratKpu(settings),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 62, type: WidthType.PERCENTAGE },
              children: [
                pText(`Nomor    : ${noSuratPengantar}`, { size: 15, before: 2, after: 2 }),
                pText('Sifat       : Penting / Terbatas (Rincian HPS Rahasia)', { size: 15, before: 1, after: 2 }),
                pText('Lampiran : 1 (Satu) Bundel Berkas Dokumen Persiapan Pengadaan (DPP)', { size: 15, before: 1, after: 2 }),
                pText(`Hal         : Penyerahan Dokumen Persiapan Pengadaan (DPP) dan Permintaan Pelaksanaan Pemilihan Penyedia (${metode})`, { bold: true, size: 15, before: 1, after: 4 })
              ]
            }),
            new TableCell({
              borders: BORDER_NONE,
              width: { size: 38, type: WidthType.PERCENTAGE },
              children: [
                pText(`Ngawi, ${tglDppStr}`, { align: AlignmentType.RIGHT, size: 15, before: 2, after: 6 }),
                pText('Kepada Yth.:', { size: 15, before: 2, after: 1 }),
                pText(`${pelaksana} Barang/Jasa`, { bold: true, size: 15, before: 1, after: 1 }),
                pText('Satuan Kerja KPU Kabupaten Ngawi', { bold: true, size: 15, before: 1, after: 1 }),
                pText(`(${ppNama})`, { size: 14.5, color: '1E3A8A', bold: true, before: 1, after: 1 }),
                pText('di — NGAWI', { bold: true, size: 15, before: 2, after: 2 })
              ]
            })
          ]
        })
      ]
    }),
    pText(`Menindaklanjuti telah terumumkannya Rencana Umum Pengadaan (RUP) pada aplikasi SiRUP LKPP serta telah ditetapkannya seluruh komponen Dokumen Persiapan Pengadaan (DPP) oleh Pejabat Pembuat Komitmen (PPK) sesuai Pasal 11 ayat (1) dan Pasal 25 Peraturan Presiden Nomor 16 Tahun 2018 jo. Peraturan Presiden Nomor 46 Tahun 2025, Peraturan LKPP Nomor 2 Tahun 2026, serta Peraturan LKPP Nomor 3 Tahun 2026, bersama ini PPK menyerahkan 1 (satu) bundel lengkap Dokumen Persiapan Pengadaan (DPP) kepada ${pelaksana} untuk dilaksanakan proses Pemilihan Penyedia dengan rincian sebagai berikut:`, {
      size: 14.5, before: 8, after: 8
    }),
    pText('A. IDENTITAS PAKET PEKERJAAN & PARAMETER POKOK PERSIAPAN PENGADAAN', { bold: true, size: 15.5, color: '1E3A8A', before: 4, after: 4 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('1. Nama Paket & Kode RUP', { bold: true, size: 14, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, width: { size: 72, type: WidthType.PERCENTAGE }, children: [pText(`${paket.nama_paket || '-'}  |  Kode RUP SiRUP: ${paket.kode_rup || 'RUP-2026-657811-01'} (Status: Terumumkan)`, { bold: true, size: 14, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('2. MAK & Pagu Anggaran DIPA', { bold: true, size: 14, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, width: { size: 72, type: WidthType.PERCENTAGE }, children: [pText(`MAK ${paket.kode_akun_mak || '532111'} (${paket.nama_akun_mak || 'Belanja Modal Peralatan dan Mesin'})  |  Pagu DIPA: ${formatRupiah(paguBasis)}`, { size: 14, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('3. Nilai HPS / Referensi Harga', { bold: true, size: 14, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, width: { size: 72, type: WidthType.PERCENTAGE }, children: [pText(`${formatRupiah(hpsBasis)} (${terbilangRupiah(hpsBasis)}) — Efisiensi ${persenEfisiensiPagu}% di bawah Pagu DIPA`, { bold: true, color: '1E3A8A', size: 14, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('4. Metode & Bentuk Kontrak', { bold: true, size: 14, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, width: { size: 72, type: WidthType.PERCENTAGE }, children: [pText(`Metode: ${metode} (${paket.fitur_spse || 'Katalog Elektronik V6 - Negosiasi Harga'})  |  Bentuk: ${bentuk} (${jenis})`, { size: 14, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('5. SLA, Cara Bayar & Uang Muka', { bold: true, size: 14, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, width: { size: 72, type: WidthType.PERCENTAGE }, children: [pText(`SLA: ${slaHari} Hari Kalender  |  Cara Bayar: ${caraBayar}  |  Uang Muka: ${umPersen}% (${umPersen === 0 ? 'Tanpa Uang Muka' : 'Ber-Uang Muka'})`, { size: 14, before: 1, after: 1 })] })
          ]
        })
      ]
    }),
    pText('B. DAFTAR INVENTARIS BERKAS DOKUMEN PERSIAPAN PENGADAAN (DPP) YANG DISERAHKAN PPK', { bold: true, size: 15.5, color: '1E3A8A', before: 8, after: 4 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 5, type: WidthType.PERCENTAGE }, children: [pText('No', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 33, type: WidthType.PERCENTAGE }, children: [pText('Komponen Dokumen Persiapan Pengadaan (DPP)', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 32, type: WidthType.PERCENTAGE }, children: [pText('Nomor & Tanggal Dokumen Sah', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('Substansi Pokok & Dasar Regulasi', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13.5, before: 2, after: 2 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('1', { align: AlignmentType.CENTER, size: 13.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Salinan Penetapan RUP KPA & Bukti Pengumuman SiRUP (Tahap 03)', { bold: true, size: 13.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`${t3.nomor}\nTanggal: ${t3.tanggal}`, { size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Kode RUP ${paket.kode_rup || 'RUP-2026-657811-01'} terumumkan oleh KPA (${kpaNama}) — Pasal 22 Perpres 46/2025.`, { size: 13, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('2', { align: AlignmentType.CENTER, size: 13.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Kerangka Acuan Kerja (KAK) & Spesifikasi Teknis (Tahap 04)', { bold: true, size: 13.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`${t4.nomor}\nTanggal: ${t4.tanggal}`, { size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Rincian ${(items || []).length} item pekerjaan, spesifikasi teknis fungsional, jadwal SLA ${slaHari} HK, & kewajiban PDN/TKDN Pasal 66.`, { size: 13, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('3', { align: AlignmentType.CENTER, size: 13.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('BA Analisa Pasar & Kertas Kerja Penilaian Katalog V6 (Tahap 05)', { bold: true, size: 13.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`${t5.nomor}\nTanggal: ${t5.tanggal}`, { size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Survei komparasi 3 sumber harga pasar, ketersediaan stok etalase INAPROC, & afirmasi UMK Pasal 65.', { size: 13, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('4', { align: AlignmentType.CENTER, size: 13.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Dokumen Penetapan ${paket.jenis_kertas_harga || 'HPS'} & Kertas Kerja Harga (Tahap 06)`, { bold: true, size: 13.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`${t6.nomor}\nTanggal: ${t6.tanggal}`, { size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Total ${formatRupiah(hpsBasis)} (termasuk PPN 11% & ongkir Franco Satker) — Pasal 26 Perpres 46/2025.`, { size: 13, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('5', { align: AlignmentType.CENTER, size: 13.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Rancangan ${bentuk}, BAB I SSUK (67 Klausul), & BAB II SSKK (Huruf A–Y) (Tahap 07)`, { bold: true, size: 13.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`${t7.nomor}\nTanggal: ${t7.tanggal}`, { size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Draft ${bentuk} (${jenis}), SSUK 67 Klausul, & SSKK 25 Klausul (Denda 1‰ DPP PMK 84/2025).`, { size: 13, before: 1, after: 1 })] })
          ]
        })
      ]
    }),
    pText(`Sehubungan dengan penyerahan berkas DPP tersebut di atas, kami meminta kepada ${pelaksana} untuk: (1) Melaksanakan Reviu Dokumen Persiapan Pengadaan (Reviu DPP) bersama PPK dan menuangkan hasilnya dalam Berita Acara Serah Terima dan Reviu DPP (BA-RDPP); serta (2) Segera melaksanakan proses Pemilihan Penyedia dan Negosiasi Teknis/Harga pada Tahap 09 sesuai ketentuan peraturan perundang-undangan. Demikian disampaikan, atas perhatian dan kerja samanya diucapkan terima kasih.`, {
      size: 14, before: 8, after: 10, keepNext: true
    }),
    buildDualSignatureStage8(
      'DITERIMA LENGKAP OLEH:',
      pelaksanaLabelUpper,
      `Diserahkan di Ngawi, ${tglDppStr}`,
      'PEJABAT PEMBUAT KOMITMEN (PPK)'
    )
  ];

  // =========================================================================
  // DOKUMEN 2: BERITA ACARA SERAH TERIMA DAN REVIU DOKUMEN PERSIAPAN PENGADAAN (BA-RDPP) — 2 PIHAK
  // =========================================================================
  const doc2Children = [
    ...buildKopSuratKpu(settings),
    pText('BERITA ACARA SERAH TERIMA DAN REVIU DOKUMEN PERSIAPAN PENGADAAN (BA-RDPP)', {
      bold: true, size: 19, align: AlignmentType.CENTER, before: 12, after: 4
    }),
    pText('DOKUMEN TAHAP 08 (TITIK SERAH TERIMA FASE II PERSIAPAN PPK KE FASE III PEMILIHAN PENYEDIA) — PASAL 11, PASAL 12 & PASAL 25 PERPRES 46/2025 JO. PERLEM LKPP 2/2026 & 3/2026', {
      size: 12.5, align: AlignmentType.CENTER, color: '1E3A8A', bold: true, before: 0, after: 6
    }),
    pText(`Nomor: ${noDpp}`, {
      size: 15.5, align: AlignmentType.CENTER, color: '475569', bold: true, before: 0, after: 10
    }),
    pText(`${hariTanggalDpp.kalimatFormal}, bertempat di ${tempatReviu}, kami yang bertanda tangan di bawah ini:`, {
      size: 14, before: 2, after: 6
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              borders: BORDER_TABLE,
              shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                pText('I. PIHAK KESATU (YANG MENYERAHKAN DPP)', { bold: true, size: 13.5, color: '1E3A8A', before: 1, after: 2 }),
                pText(`Nama    : ${ppkNama}  |  NIP. ${ppkNip}`, { bold: true, size: 13.5, before: 1, after: 1 }),
                pText('Jabatan : Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi', { size: 13, before: 1, after: 1 }),
                pText('Bertindak selaku Pejabat yang menetapkan dan menyerahkan Dokumen Persiapan Pengadaan (DPP), selanjutnya disebut PIHAK KESATU (PPK).', { italic: true, size: 12.5, color: '334155', before: 2, after: 1 })
              ]
            }),
            new TableCell({
              borders: BORDER_TABLE,
              shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
              width: { size: 50, type: WidthType.PERCENTAGE },
              children: [
                pText('II. PIHAK KEDUA (YANG MENERIMA & MEREVIU DPP)', { bold: true, size: 13.5, color: '1E40AF', before: 1, after: 2 }),
                pText(`Nama    : ${ppNama}  |  NIP. ${ppNip}`, { bold: true, size: 13.5, before: 1, after: 1 }),
                pText(`Jabatan : ${pelaksana} Barang/Jasa KPU Kabupaten Ngawi`, { size: 13, before: 1, after: 1 }),
                pText(`Bertindak selaku Pejabat yang menerima dan melaksanakan Reviu DPP untuk Pemilihan Penyedia (${metode}), selanjutnya disebut PIHAK KEDUA.`, { italic: true, size: 12.5, color: '334155', before: 2, after: 1 })
              ]
            })
          ]
        })
      ]
    }),
    pText(`PIHAK KESATU dan PIHAK KEDUA telah melaksanakan serah terima dan Reviu Dokumen Persiapan Pengadaan (Reviu DPP) atas Paket Pekerjaan "${paket.nama_paket || '-'}" (Kode RUP: ${paket.kode_rup || 'RUP-2026-657811-01'}, Pagu DIPA: ${formatRupiah(paguBasis)}, Nilai ${paket.jenis_kertas_harga || 'HPS'}: ${formatRupiah(hpsBasis)}) dengan hasil pemeriksaan 7 (tujuh) aspek regulasi sebagai berikut:`, {
      size: 13.5, before: 6, after: 6
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 5, type: WidthType.PERCENTAGE }, children: [pText('No', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 25, type: WidthType.PERCENTAGE }, children: [pText('Aspek Dokumen Persiapan Pengadaan (DPP) yang Direviu', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 52, type: WidthType.PERCENTAGE }, children: [pText('Uraian Pemeriksaan Kepatuhan & Substansi Teknis/Hukum', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 18, type: WidthType.PERCENTAGE }, children: [pText('Hasil Reviu & Status', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13, before: 2, after: 2 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('1', { align: AlignmentType.CENTER, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('KAK & Spesifikasi Teknis\n(Output Tahap 04)', { bold: true, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Dokumen No. ${t4.nomor} telah memuat spesifikasi kinerja/fungsional ${(items || []).length} item secara jelas, terukur, memenuhi kewajiban PDN/TKDN Pasal 66 Perpres 46/2025, dan tidak mengarah pada penghambatan persaingan.`, { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, children: [pText('[✓] LENGKAP &\nMEMENUHI SYARAT', { bold: true, color: '166534', align: AlignmentType.CENTER, size: 12.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('2', { align: AlignmentType.CENTER, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('HPS / Referensi Harga PPK\n(Output Tahap 06)', { bold: true, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Dokumen No. ${t6.nomor} senilai ${formatRupiah(hpsBasis)} berada di bawah Pagu DIPA (${formatRupiah(paguBasis)}), disusun dari 3 sumber harga pasar sah (Tahap 5), berlaku ≤ 28 hari kerja, termasuk PPN 11% & ongkir Franco Satker, serta dijaga kerahasiaannya (Pasal 26).`, { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, children: [pText('[✓] WAJAR, SAH &\nTERJAGA RAHASIA', { bold: true, color: '166534', align: AlignmentType.CENTER, size: 12.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('3', { align: AlignmentType.CENTER, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Rancangan Kontrak, SSUK 67 Klausul & SSKK A–Y (Tahap 07)', { bold: true, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Dokumen No. ${t7.nomor} telah tepat menetapkan Bentuk "${bentuk}" (${jenis}), SLA ${slaHari} HK, Cara Bayar "${caraBayar}", Uang Muka ${umPersen}%, Garansi 1 Tahun, serta Denda 1‰ dari nilai DPP sebelum PPN sesuai PMK 84/2025.`, { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, children: [pText('[✓] LENGKAP &\nSESUAI REGULASI', { bold: true, color: '166534', align: AlignmentType.CENTER, size: 12.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('4', { align: AlignmentType.CENTER, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Anggaran DIPA & Status RUP SiRUP (Tahap 01–03)', { bold: true, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Anggaran tersedia pada DIPA KPU Kab. Ngawi TA 2026 MAK ${paket.kode_akun_mak || '532111'} (tidak diblokir) dan Kode RUP ${paket.kode_rup || 'RUP-2026-657811-01'} telah berstatus Terumumkan di SiRUP LKPP.`, { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, children: [pText('[✓] TERSEDIA &\nTERUMUMKAN', { bold: true, color: '166534', align: AlignmentType.CENTER, size: 12.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('5', { align: AlignmentType.CENTER, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Kesiapan Etalase Katalog V6 / Metode Pemilihan', { bold: true, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Produk tayang aktif pada Katalog Elektronik V6 (INAPROC) sesuai BA Analisa Pasar No. ${t5.nomor}; siap diproses melalui negosiasi harga & teknis baik skenario Penyedia Tunggal maupun Multi-Order.`, { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, children: [pText('[✓] SIAP TAYANG &\nDAPAT DIPILIH', { bold: true, color: '166534', align: AlignmentType.CENTER, size: 12.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('6', { align: AlignmentType.CENTER, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Waktu Penggunaan & Jadwal Pelaksanaan (SLA)', { bold: true, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Alokasi waktu pemilihan penyedia (Tahap 09) dan masa pelaksanaan pengiriman/instalasi selama ${slaHari} Hari Kalender mencukupi dan selaras dengan jadwal pemanfaatan barang Satker.`, { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, children: [pText('[✓] JADWAL &\nWAKTU MEMADAI', { bold: true, color: '166534', align: AlignmentType.CENTER, size: 12.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('7', { align: AlignmentType.CENTER, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Analisis Pasar & Afirmasi UMK-Koperasi (Pasal 65)', { bold: true, size: 13, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Paket senilai ${formatRupiah(paguBasis)} (≤ Rp 15 Miliar) telah memprioritaskan pelaku usaha kualifikasi Usaha Kecil / Mikro / Koperasi sesuai amanat Pasal 65 Perpres 46/2025.`, { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, children: [pText('[✓] PATUH AFIRMASI\nUMK PASAL 65', { bold: true, color: '166534', align: AlignmentType.CENTER, size: 12.5, before: 1, after: 1 })] })
          ]
        })
      ]
    }),
    pText('KESIMPULAN DAN REKOMENDASI BERSAMA HASIL REVIU DOKUMEN PERSIAPAN PENGADAAN (DPP):', { bold: true, size: 14.5, color: '1E3A8A', before: 8, after: 3, keepNext: true }),
    pText(`Berdasarkan hasil reviu atas ke-7 (tujuh) aspek di atas, PIHAK KESATU (PPK) dan PIHAK KEDUA (${pelaksana}) bersepakat menyatakan bahwa Dokumen Persiapan Pengadaan (DPP) Paket Pekerjaan "${paket.nama_paket || '-'}" telah berstatus: [ ${kesimpulanReviu.toUpperCase()} ], dan DAPAT SEGERA DILANJUTKAN KE TAHAP 09 (PELAKSANAAN PEMILIHAN PENYEDIA & NEGOSIASI HARGA/TEKNIS). Demikian Berita Acara ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.`, {
      size: 13.5, before: 2, after: 10, keepNext: true
    }),
    buildDualSignatureStage8(
      'PIHAK KEDUA (YANG MENERIMA & MEREVIU DPP)',
      pelaksanaLabelUpper,
      `Ditetapkan Bersama di Ngawi, ${tglDppStr}`,
      'PIHAK KESATU — PEJABAT PEMBUAT KOMITMEN (PPK)'
    )
  ];

  // =========================================================================
  // DOKUMEN 3: LEMBAR CHECKLIST VERIFIKASI KELENGKAPAN BERKAS FISIK & DIGITAL DPP + JADWAL PEMILIHAN
  // =========================================================================
  const checklistItemRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 6, type: WidthType.PERCENTAGE }, children: [pText('No', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13.5, before: 2, after: 2 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 42, type: WidthType.PERCENTAGE }, children: [pText('Uraian Item Barang/Jasa & Spesifikasi Teknis (Objek Pemilihan)', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13.5, before: 2, after: 2 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 10, type: WidthType.PERCENTAGE }, children: [pText('Vol', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13.5, before: 2, after: 2 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 12, type: WidthType.PERCENTAGE }, children: [pText('Satuan', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13.5, before: 2, after: 2 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('Status Kesiapan Spesifikasi & Katalog V6', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13.5, before: 2, after: 2 })] })
      ]
    })
  ];

  (items || []).forEach((it, idx) => {
    checklistItemRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 13.5, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [
            pText(it.uraian_item || '-', { bold: true, size: 13.5, before: 1, after: 1 }),
            pText(`Spesifikasi: ${it.spesifikasi_teknis || '-'}`, { size: 12.5, color: '475569', before: 0, after: 1 })
          ] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(String(it.volume || 1), { align: AlignmentType.CENTER, bold: true, size: 13.5, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(it.satuan || 'Unit', { align: AlignmentType.CENTER, size: 13.5, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, children: [pText('[✓] Tayang Aktif di Katalog V6 & Siap Dinegosiasi pada Tahap 09', { bold: true, color: '166534', size: 12.5, before: 1, after: 1 })] })
        ]
      })
    );
  });

  const doc3Children = [
    ...buildKopSuratKpu(settings),
    pText('LEMBAR VERIFIKASI KELENGKAPAN BERKAS FISIK & DIGITAL DOKUMEN PERSIAPAN PENGADAAN (CHECKLIST DPP)', {
      bold: true, size: 18, align: AlignmentType.CENTER, before: 12, after: 4
    }),
    pText(`LAMPIRAN BERITA ACARA SERAH TERIMA DAN REVIU DPP NOMOR: ${noDpp}  |  TANGGAL: ${tglDppStr}`, {
      size: 13, align: AlignmentType.CENTER, color: '1E3A8A', bold: true, before: 0, after: 8
    }),
    pText('A. MATRIKS VERIFIKASI KELENGKAPAN DOKUMEN HULU FASE I (PERENCANAAN) & FASE II (PERSIAPAN PPK)', { bold: true, size: 15, color: '1E3A8A', before: 4, after: 4 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 5, type: WidthType.PERCENTAGE }, children: [pText('No', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 14, type: WidthType.PERCENTAGE }, children: [pText('Tahap Siklus', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 33, type: WidthType.PERCENTAGE }, children: [pText('Nama Instrumen Dokumen dalam Bundel DPP', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('Nomor & Tanggal Pengesahan', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 20, type: WidthType.PERCENTAGE }, children: [pText('Status Verifikasi Berkas', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 13, before: 2, after: 2 })] })
          ]
        }),
        ...[
          ['1', 'Tahap 01 (IDK)', 'Dokumen Identifikasi Kebutuhan & Nota Dinas Usulan Subbagian', `${t1.nomor} (${t1.tanggal})`, '[✓] Ada, Lengkap & Sah'],
          ['2', 'Tahap 02 (PMK)', 'BA Penetapan Jenis, Cara Pengadaan, Pemaketan & Konsolidasi', `${t2.nomor} (${t2.tanggal})`, '[✓] Ada, Lengkap & Sah'],
          ['3', 'Tahap 03 (RUP)', `SK Penetapan RUP KPA & Pengumuman SiRUP (${paket.kode_rup || 'RUP-2026-657811-01'})`, `${t3.nomor} (${t3.tanggal})`, '[✓] Ada, Lengkap & Sah'],
          ['4', 'Tahap 04 (SPEK)', 'Kerangka Acuan Kerja (KAK) & Spesifikasi Teknis Barang/Jasa', `${t4.nomor} (${t4.tanggal})`, '[✓] Ada, Lengkap & Sah'],
          ['5', 'Tahap 05 (AP)', 'Berita Acara Analisa Pasar & Kertas Kerja Penilaian Katalog V6', `${t5.nomor} (${t5.tanggal})`, '[✓] Ada, Lengkap & Sah'],
          ['6', 'Tahap 06 (HPS)', `BA Penetapan ${paket.jenis_kertas_harga || 'HPS'} & Rincian Kertas Kerja (${formatRupiah(hpsBasis)})`, `${t6.nomor} (${t6.tanggal})`, '[✓] Ada, Sah & Rahasia'],
          ['7', 'Tahap 07 (RK-I)', `Berita Acara Penetapan Rancangan Kontrak (${bentuk}) oleh PPK`, `${t7.nomor} (${t7.tanggal})`, '[✓] Ada, Lengkap & Sah'],
          ['8', 'Tahap 07 (RK-II)', `Rancangan Naskah ${bentuk} (Draft Perikatan Tanpa Nama Vendor)`, `Lampiran I No. ${t7.nomor}`, '[✓] Ada, Lengkap & Sah'],
          ['9', 'Tahap 07 (SSUK)', 'Dokumen BAB I. Syarat-Syarat Umum Kontrak (SSUK — 67 Klausul Baku)', `Lampiran II No. ${t7.nomor}`, '[✓] Ada, Lengkap & Sah'],
          ['10', 'Tahap 07 (SSKK)', 'Dokumen BAB II. Syarat-Syarat Khusus Kontrak (SSKK — Huruf A s.d. Y)', `Lampiran III No. ${t7.nomor}`, '[✓] Ada, Lengkap & Sah']
        ].map(([no, thp, nama, noTgl, st]) => new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText(no, { align: AlignmentType.CENTER, size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(thp, { bold: true, size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(nama, { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(noTgl, { size: 12, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F0FDF4', type: ShadingType.CLEAR }, children: [pText(st, { bold: true, color: '166534', align: AlignmentType.CENTER, size: 12, before: 1, after: 1 })] })
          ]
        }))
      ]
    }),
    pText('B. DAFTAR OBJEK ITEM BARANG/JASA YANG DISERAHKAN UNTUK PROSES PEMILIHAN PENYEDIA (TAHAP 09)', { bold: true, size: 15, color: '1E3A8A', before: 8, after: 4 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: checklistItemRows
    }),
    pText('C. RENCANA JADWAL PELAKSANAAN PEMILIHAN PENYEDIA HINGGA PENANDATANGANAN KONTRAK (TAHAP 09 s.d. TAHAP 13)', { bold: true, size: 15, color: '1E3A8A', before: 8, after: 4 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 22, type: WidthType.PERCENTAGE }, children: [pText('Tahap Lanjutan', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 12.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 48, type: WidthType.PERCENTAGE }, children: [pText('Agenda Kegiatan Pemilihan & Perikatan', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 12.5, before: 2, after: 2 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('Pejabat Pelaksana & Output', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 12.5, before: 2, after: 2 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('Tahap 09 — Pemilihan & Negosiasi', { bold: true, size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Pembuatan paket ${metode} pada Katalog V6 / SPSE, klarifikasi teknis, dan negosiasi harga.`, { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`${pelaksana} — BA Hasil Pemilihan & Negosiasi`, { size: 12.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('Tahap 10 — Laporan & Reviu PBJ', { bold: true, size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Penyerahan Laporan Hasil Pemilihan dari Pejabat Pengadaan kepada PPK & Reviu Hasil Pemilihan (verifikasi KSWP & daftar hitam SiKAP).', { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`${pelaksana} & PPK — BA Reviu Hasil Pemilihan`, { size: 12.5, before: 1, after: 1 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('Tahap 11 s.d. Tahap 13', { bold: true, size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`Penerbitan SPPBJ (Tahap 11), Rapat Persiapan Penandatanganan Kontrak / Pre-Award Meeting (Tahap 12), dan Penandatanganan ${bentuk} Final (Tahap 13).`, { size: 12.5, before: 1, after: 1 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`PPK & Penyedia Terpilih — Naskah ${bentuk} Sah`, { size: 12.5, before: 1, after: 1 })] })
          ]
        })
      ]
    }),
    pText('Demikian Lembar Verifikasi Kelengkapan Berkas Dokumen Persiapan Pengadaan (Checklist DPP) ini diperiksa dan disahkan bersama sebagai lampiran tak terpisahkan dari Berita Acara Serah Terima dan Reviu DPP (BA-RDPP).', {
      size: 13, before: 6, after: 8, keepNext: true
    }),
    buildDualSignatureStage8(
      'DIVERIFIKASI & DITERIMA OLEH:',
      pelaksanaLabelUpper,
      `Diserahkan & Diverifikasi di Ngawi, ${tglDppStr}`,
      'PEJABAT PEMBUAT KOMITMEN (PPK)'
    )
  ];

  const pageProps = {
    size: { width: 11906, height: 16838 },
    margin: { top: 760, right: 820, bottom: 760, left: 820 }
  };

  return [
    {
      properties: {
        ...(isFirstStageInDoc ? {} : { type: SectionType.NEXT_PAGE }),
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen I Tahap 08: Surat Penyerahan DPP & Permintaan Pemilihan', noSuratPengantar) },
      footers: { default: makeFooter('Dokumen I — Surat Penyerahan DPP & Permintaan Pemilihan') },
      children: doc1Children
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen II Tahap 08: Berita Acara Serah Terima & Reviu DPP (BA-RDPP)', noDpp) },
      footers: { default: makeFooter('Dokumen II — Berita Acara Serah Terima & Reviu DPP (BA-RDPP)') },
      children: doc2Children
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen III Tahap 08: Lembar Checklist Verifikasi Kelengkapan Berkas DPP', noDpp) },
      footers: { default: makeFooter('Dokumen III — Checklist Verifikasi Kelengkapan Berkas DPP') },
      children: doc3Children
    }
  ];
}


function cleanProrateItemPrices(items, totalHps, totalPenawaran, totalKontrak) {
  if (!items || items.length === 0) return [];
  const result = JSON.parse(JSON.stringify(items));
  const n = result.length;

  if (n === 1) {
    const vol = Number(result[0].volume || 1);
    result[0].harga_satuan_penawaran = Math.round(totalPenawaran / vol);
    result[0].harga_satuan_kontrak = Math.round(totalKontrak / vol);
    result[0].jumlah_kontrak = totalKontrak;
    return result;
  }

  // Cek apakah item sudah memiliki harga negosiasi valid yang jumlahnya sama persis dengan totalKontrak
  let curSumKontrak = 0;
  let curSumPen = 0;
  let allEqualHps = true;
  for (const it of result) {
    const v = Number(it.volume || 1);
    const kSat = Number(it.harga_satuan_kontrak || 0);
    const pSat = Number(it.harga_satuan_penawaran || 0);
    const hSat = Number(it.harga_satuan_hps || 0);
    if (kSat !== hSat) allEqualHps = false;
    curSumKontrak += (v * kSat);
    curSumPen += (v * pSat);
  }

  if (!allEqualHps && curSumKontrak === totalKontrak && curSumPen === totalPenawaran) {
    return result;
  }

  // Hitung prorata harga satuan bersih bulat (kelipatan 10.000) agar realistis & akuntabel
  let absorberIdx = result.findIndex(it => Number(it.volume) === 1);
  if (absorberIdx === -1) absorberIdx = 0;

  let sumOtherPen = 0;
  let sumOtherKontrak = 0;

  for (let i = 0; i < n; i++) {
    if (i === absorberIdx) continue;
    const it = result[i];
    const vol = Number(it.volume || 1);
    const hpsSat = Number(it.harga_satuan_hps || 0);
    const share = totalHps > 0 ? ((vol * hpsSat) / totalHps) : (1 / n);

    let rawPenSat = (totalPenawaran * share) / vol;
    let cleanPenSat = Math.round(rawPenSat / 10000) * 10000;
    it.harga_satuan_penawaran = cleanPenSat;
    sumOtherPen += (cleanPenSat * vol);

    let rawNegoSat = (totalKontrak * share) / vol;
    let cleanNegoSat = Math.round(rawNegoSat / 10000) * 10000;
    it.harga_satuan_kontrak = cleanNegoSat;
    it.jumlah_kontrak = cleanNegoSat * vol;
    sumOtherKontrak += (cleanNegoSat * vol);
  }

  const absItem = result[absorberIdx];
  const absVol = Number(absItem.volume || 1);
  const remPen = totalPenawaran - sumOtherPen;
  const remKontrak = totalKontrak - sumOtherKontrak;

  absItem.harga_satuan_penawaran = Math.round(remPen / absVol);
  absItem.harga_satuan_kontrak = Math.round(remKontrak / absVol);
  absItem.jumlah_kontrak = remKontrak;

  return result;
}

function buildStage9Sections(ctx, tahapRow, keu, isFirstStageInDoc) {
  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, settings } = ctx;
  const metode = paket.metode_pemilihan || 'E-Purchasing';
  const pelaksana = paket.pelaksana_pemilihan || 'Pejabat Pengadaan';
  const tglTahap9Raw = tahapRow.tanggal_dokumen || '2026-05-21';
  const tglTahap9Str = formatTanggalIndo(tglTahap9Raw);
  const hariTanggalTahap9 = formatHariTanggalBeritaAcara(tglTahap9Raw);
  const tempatPemilihan = paket.tempat_pemilihan || 'Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jalan Untung Suropati Nomor 48 Ngawi';

  const paguNominal = Number(paket.nilai_pagu || 0);
  const hpsNominal = Number(paket.nilai_hps || paket.nilai_pagu || 0);
  const penawaranAwal = Number(paket.nilai_penawaran_awal || hpsNominal);
  const sepakatKontrak = Number(paket.nilai_kontrak || penawaranAwal);
  const efisiensiHps = Math.max(0, hpsNominal - sepakatKontrak);
  const persenEfisiensiHps = hpsNominal > 0 ? ((efisiensiHps / hpsNominal) * 100).toFixed(2) : '0.00';
  const efisiensiPagu = Math.max(0, paguNominal - sepakatKontrak);
  const persenEfisiensiPagu = paguNominal > 0 ? ((efisiensiPagu / paguNominal) * 100).toFixed(2) : '0.00';

  const ppkNama = cleanNamaTanpaGelar((ppk && ppk.nama_lengkap) || 'MOHAMMAD NOOR JIHAN');
  const ppkNip = (ppk && ppk.nip) || '19840101 200912 1 001';

  let ppNama = cleanNamaTanpaGelar((pejabatPengadaan && pejabatPengadaan.nama_lengkap) || 'INDRAYU FATIKA MAHARDIKA');
  let ppNip = (pejabatPengadaan && pejabatPengadaan.nip) || '19950817 202012 2 003';
  let ppJabatan = 'Pejabat Pengadaan Barang/Jasa';
  let ppTtdLabel = 'PEJABAT PENGADAAN BARANG/JASA';
  let leftUnitLabel = 'KPU Kabupaten Ngawi';

  if (pelaksana === 'Pokja Pemilihan') {
    ppNama = (paket.nama_pokja || 'POKJA PEMILIHAN UKPBJ KPU PROVINSI JAWA TIMUR').toUpperCase();
    ppNip = (paket.sk_pokja || 'Surat Keputusan Kepala UKPBJ').trim();
    ppJabatan = 'Kelompok Kerja (Pokja) Pemilihan UKPBJ';
    ppTtdLabel = 'POKJA PEMILIHAN UKPBJ';
    leftUnitLabel = (paket.nama_pokja || '').includes('Provinsi') ? 'KPU Provinsi Jawa Timur' : ((paket.nama_pokja || '').includes('RI') ? 'Komisi Pemilihan Umum Republik Indonesia' : 'KPU Kabupaten Ngawi');
  } else if (pelaksana === 'PPK Mandiri') {
    ppNama = ppkNama;
    ppNip = ppkNip;
    ppJabatan = 'Pejabat Pembuat Komitmen (Pelaksana Mandiri E-Purchasing)';
    ppTtdLabel = 'PEJABAT PEMBUAT KOMITMEN (PPK MANDIRI)';
    leftUnitLabel = 'KPU Kabupaten Ngawi';
  }

  const namaPenyedia = (penyedia && penyedia.nama_perusahaan) || 'CV. GRAFIKA PRATAMA NGAWI';
  const direkturPenyedia = cleanNamaTanpaGelar((penyedia && penyedia.nama_direktur) || 'HENDRA SURYAWAN');
  const jabatanPenyedia = (penyedia && penyedia.jabatan_penandatangan) || 'Direktur';
  const npwpPenyedia = (penyedia && penyedia.npwp) || '01.445.882.9-646.000';
  const nibPenyedia = (penyedia && penyedia.nib) || '9120301182451';
  const kbliPenyedia = (penyedia && penyedia.kbli) || '46511 (Perdagangan Besar Komputer & Perlengkapannya) jo. 18111 (Pencetakan)';
  const alamatPenyedia = (penyedia && penyedia.alamat) || 'Jl. Trunojoyo No. 15 Ngawi';
  const bankPenyedia = (penyedia && penyedia.nama_bank) || 'Bank BRI Cabang Ngawi';
  const rekPenyedia = (penyedia && penyedia.no_rekening) || '0058-01-002481-30-8';
  const kualifikasiPenyedia = (penyedia && penyedia.kualifikasi_usaha) || 'Usaha Kecil';

  // Nomenklatur Dokumen Dinamis
  let doc1Title = '';
  let doc1No = '';
  let doc2Title = '';
  let doc2No = '';
  let doc3Title = '';
  let doc3No = '';
  let regDasarHukum = '';

  if (metode === 'E-Purchasing') {
    doc1Title = 'BUKTI PENDAFTARAN & PEMBUATAN PAKET TRANSAKSI E-PURCHASING KATALOG ELEKTRONIK V6';
    doc1No = paket.id_paket_katalog || ('ID-KAT-' + (paket.tahun_anggaran || '2026') + '-' + (paket.kode_paket_internal || '001'));
    doc2Title = 'BERITA ACARA KLARIFIKASI TEKNIS DAN NEGOSIASI HARGA DIGITAL (BA-KTND)';
    doc2No = paket.no_ba_nego || tahapRow.no_ba_nego || ('009/BA-KTND/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PP-PBJ/KPU-NGW/V/2026');
    doc3Title = 'BERITA ACARA HASIL PEMILIHAN E-PURCHASING (BAHP-EP)';
    doc3No = tahapRow.nomor_dokumen || paket.no_bahp || tahapRow.no_bahp || ('009/BAHP-EP/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PP-PBJ/KPU-NGW/V/2026');
    regDasarHukum = 'Pasal 38 ayat (2) Perpres Nomor 16/2018 jo. Perpres 46/2025 dan Keputusan Kepala LKPP Nomor 177 Tahun 2024 tentang Tata Cara Penyelenggaraan Katalog Elektronik Versi 6.0';
  } else if (metode === 'Pengadaan Langsung') {
    doc1Title = 'SURAT PERMINTAAN PENAWARAN HARGA (SPP) PENGADAAN LANGSUNG';
    doc1No = paket.no_undangan_penawaran || ('009/SPP-PL/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PP-PBJ/KPU-NGW/V/2026');
    doc2Title = 'BERITA ACARA KLARIFIKASI TEKNIS DAN NEGOSIASI HARGA (BA-KTNH) PENGADAAN LANGSUNG';
    doc2No = paket.no_ba_nego || tahapRow.no_ba_nego || ('009/BA-KTNH/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PP-PBJ/KPU-NGW/V/2026');
    doc3Title = 'BERITA ACARA HASIL PENGADAAN LANGSUNG (BAHPL)';
    doc3No = tahapRow.nomor_dokumen || paket.no_bahp || tahapRow.no_bahp || ('009/BAHPL/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PP-PBJ/KPU-NGW/V/2026');
    regDasarHukum = 'Pasal 38 ayat (4) jo. Pasal 50 ayat (2) Perpres Nomor 16/2018 jo. Perpres Nomor 12/2021 dan Perpres Nomor 46/2025';
  } else if (metode === 'Tender') {
    doc1Title = 'RINGKASAN PENGUMUMAN TENDER & JADWAL PEMBUKTIAN KUALIFIKASI SPSE';
    doc1No = paket.kode_tender_spse || '65781109';
    doc2Title = 'BERITA ACARA EVALUASI PENAWARAN, PEMBUKTIAN KUALIFIKASI & KLARIFIKASI TEKNIS (BAEPK)';
    doc2No = paket.no_ba_nego || tahapRow.no_ba_nego || ('009/BAEPK/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/POKJA-PBJ/KPU-NGW/V/2026');
    doc3Title = 'BERITA ACARA HASIL PEMILIHAN (BAHP) TENDER';
    doc3No = tahapRow.nomor_dokumen || paket.no_bahp || tahapRow.no_bahp || ('009/BAHP/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/POKJA-PBJ/KPU-NGW/V/2026');
    regDasarHukum = 'Pasal 38 ayat (1) huruf e jo. Pasal 51 Perpres Nomor 16/2018 jo. Perpres Nomor 12/2021 dan Perpres Nomor 46/2025';
  } else {
    doc1Title = 'SURAT UNDANGAN PENUNJUKAN LANGSUNG & PENYAMPAIAN DOKUMEN PENAWARAN';
    doc1No = paket.no_undangan_penawaran || ('009/UND-PLK/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PP-PBJ/KPU-NGW/V/2026');
    doc2Title = 'BERITA ACARA KLARIFIKASI TEKNIS DAN NEGOSIASI HARGA PENUNJUKAN LANGSUNG';
    doc2No = paket.no_ba_nego || tahapRow.no_ba_nego || ('009/BA-KTNH-PLK/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PP-PBJ/KPU-NGW/V/2026');
    doc3Title = 'BERITA ACARA HASIL PENUNJUKAN LANGSUNG (BAH-PENLUK)';
    doc3No = tahapRow.nomor_dokumen || paket.no_bahp || tahapRow.no_bahp || ('009/BAH-PENLUK/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PP-PBJ/KPU-NGW/V/2026');
    regDasarHukum = 'Pasal 38 ayat (1) huruf c jo. Pasal 41 Perpres Nomor 16/2018 jo. Perpres Nomor 12/2021 dan Perpres Nomor 46/2025';
  }

  const makeHeader = (label, docNo = doc3No) => new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({
            text: label + ' | No: ' + docNo,
            size: 15,
            color: '64748B',
            font: 'Cambria',
            italics: true
          })
        ]
      })
    ]
  });

  const makeFooter = (prefixText = '') => new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 30, after: 0 },
        children: [
          ...(prefixText ? [new TextRun({ text: prefixText + '  —  ', size: 15, color: '64748B', font: 'Cambria', italics: true })] : []),
          new TextRun({ text: 'Halaman ', size: 16, color: '64748B', font: 'Cambria' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '64748B', font: 'Cambria' }),
          new TextRun({ text: ' dari ', size: 16, color: '64748B', font: 'Cambria' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '64748B', font: 'Cambria' })
        ]
      })
    ]
  });

  // Tanda Tangan Single (Dokumen 1)
  const buildSingleSignatureStage9 = (title1, title2, locDate) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ borders: BORDER_NONE, width: { size: 50, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [] })] }),
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              pText(locDate, { align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(title1, { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(title2, { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(leftUnitLabel, { align: AlignmentType.CENTER, size: 14.5, before: 0, after: 180, keepNext: true }),
              pText('( ' + ppNama + ' )', { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(ppNip && ppNip !== '-' ? (ppNip.match(/^\d/) ? ('NIP. ' + ppNip) : ppNip) : 'Satuan Kerja KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 13, before: 0, after: 0 })
            ]
          })
        ]
      })
    ]
  });

  // Tanda Tangan 2 Pihak: Pelaksana vs Rekanan Penyedia (Dokumen 2)
  const buildDualSignatureStage9PelaksanaPenyedia = (locDate) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              pText('DIPERIKSA & DINEGOSIASIKAN OLEH:', { bold: true, align: AlignmentType.CENTER, size: 14.5, before: 0, after: 2, keepNext: true }),
              pText(ppTtdLabel, { bold: true, align: AlignmentType.CENTER, size: 14.5, before: 0, after: 2, keepNext: true }),
              pText(leftUnitLabel, { align: AlignmentType.CENTER, size: 14, before: 0, after: 180, keepNext: true }),
              pText('( ' + ppNama + ' )', { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(ppNip && ppNip !== '-' ? (ppNip.match(/^\d/) ? ('NIP. ' + ppNip) : ppNip) : 'Satuan Kerja KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 13, before: 0, after: 0 })
            ]
          }),
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              pText(locDate, { align: AlignmentType.CENTER, size: 14.5, before: 0, after: 2, keepNext: true }),
              pText('DISEPAKATI OLEH CALON PENYEDIA:', { bold: true, align: AlignmentType.CENTER, size: 14.5, before: 0, after: 2, keepNext: true }),
              pText(namaPenyedia, { bold: true, align: AlignmentType.CENTER, size: 14.5, before: 0, after: 180, keepNext: true }),
              pText('( ' + direkturPenyedia + ' )', { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(jabatanPenyedia + ' | NPWP: ' + npwpPenyedia + ' | NIB: ' + nibPenyedia, { align: AlignmentType.CENTER, size: 12, before: 0, after: 0 })
            ]
          })
        ]
      })
    ]
  });

  // Tanda Tangan 2 Pihak: Ditetapkan Pelaksana & Diserahkan/Diketahui PPK (Dokumen 3)
  const buildDualSignatureStage9PelaksanaPPK = (locDate) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              pText('DITETAPKAN & DISERAHKAN OLEH:', { bold: true, align: AlignmentType.CENTER, size: 14.5, before: 0, after: 2, keepNext: true }),
              pText(ppTtdLabel, { bold: true, align: AlignmentType.CENTER, size: 14.5, before: 0, after: 2, keepNext: true }),
              pText(leftUnitLabel, { align: AlignmentType.CENTER, size: 14, before: 0, after: 180, keepNext: true }),
              pText('( ' + ppNama + ' )', { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText(ppNip && ppNip !== '-' ? (ppNip.match(/^\d/) ? ('NIP. ' + ppNip) : ppNip) : 'Satuan Kerja KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 13, before: 0, after: 0 })
            ]
          }),
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              pText(locDate, { align: AlignmentType.CENTER, size: 14.5, before: 0, after: 2, keepNext: true }),
              pText('DITERIMA & DITELAAH OLEH:', { bold: true, align: AlignmentType.CENTER, size: 14.5, before: 0, after: 2, keepNext: true }),
              pText('PEJABAT PEMBUAT KOMITMEN (PPK)', { bold: true, align: AlignmentType.CENTER, size: 14.5, before: 0, after: 180, keepNext: true }),
              pText('( ' + ppkNama + ' )', { bold: true, align: AlignmentType.CENTER, size: 15, before: 0, after: 2, keepNext: true }),
              pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 14, before: 0, after: 0 })
            ]
          })
        ]
      })
    ]
  });

  // =========================================================================
  // DOKUMEN 1: UNDANGAN / BUKTI REGISTRASI TRANSAKSI PEMILIHAN PENYEDIA
  // =========================================================================
  const doc1Children = [
    ...buildKopSuratKpu(settings),
    pText(doc1Title, { bold: true, size: 18, align: AlignmentType.CENTER, before: 10, after: 3 }),
    pText('Nomor Registrasi: ' + doc1No, { size: 14, align: AlignmentType.CENTER, italics: true, color: '1E3A8A', before: 0, after: 14 }),
    pText(`${hariTanggalTahap9.kalimatFormal}, bertempat di ${tempatPemilihan}, dalam rangka pelaksanaan pengadaan barang/jasa pemerintah pada Satuan Kerja Komisi Pemilihan Umum Kabupaten Ngawi Tahun Anggaran ${paket.tahun_anggaran || '2026'}, disampaikan dokumen resmi tahapan pemilihan penyedia sebagai berikut:`, { size: 14, before: 4, after: 8 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('Paket Pekerjaan', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 70, type: WidthType.PERCENTAGE }, children: [pText(paket.nama_paket || '-', { bold: true, color: '1E3A8A', size: 13, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Kode Paket / RUP', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText((paket.kode_paket_internal || 'PBJ-2026-001') + ' / ' + (paket.kode_rup || 'RUP-657811-01'), { size: 13, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Metode & Pelaksana', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(metode + ' — Dilaksanakan oleh ' + pelaksana + ' (' + ppNama + ')', { size: 13, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Pagu Anggaran & HPS', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Pagu: ' + formatRupiah(paguNominal) + ' | HPS / Referensi Harga: ' + formatRupiah(hpsNominal) + ' (Termasuk PPN 11% Franco Satker)', { bold: true, size: 13, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Calon Rekanan Penyedia', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [
            pText(namaPenyedia + ' (Pimpinan: ' + direkturPenyedia + ')', { bold: true, size: 13, before: 1, after: 1 }),
            pText('NPWP: ' + npwpPenyedia + ' | NIB: ' + nibPenyedia + ' (OSS-RBA Valid)', { size: 12.5, bold: true, color: '1E3A8A', before: 0, after: 1 }),
            pText('KBLI Terdaftar: ' + kbliPenyedia + ' (' + kualifikasiPenyedia + ')', { size: 12, color: '334155', before: 0, after: 1 })
          ] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Landasan Yuridis', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(regDasarHukum, { size: 12.5, before: 1, after: 1 })] })
        ]})
      ]
    }),
    pText('Demikian dokumen pendaftaran / permintaan pemilihan ini dibuat dengan sebenarnya untuk dipergunakan sebagai dasar pelaksanaan klarifikasi teknis dan negosiasi harga pada Tahap 09.', { size: 14, before: 8, after: 12, keepNext: true }),
    buildSingleSignatureStage9('DIBUAT & DITETAPKAN OLEH:', ppTtdLabel, 'Ditetapkan di Ngawi, ' + tglTahap9Str)
  ];

  // =========================================================================
  // DOKUMEN 2: BERITA ACARA KLARIFIKASI TEKNIS & NEGOSIASI HARGA (BA-KTND / BA-KTNH / BAEPK)
  // =========================================================================
  const itemNegoRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 5, type: WidthType.PERCENTAGE }, children: [pText('No', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 12, before: 2, after: 2 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 35, type: WidthType.PERCENTAGE }, children: [pText('Uraian Barang & Spesifikasi Teknis', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 12, before: 2, after: 2 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 10, type: WidthType.PERCENTAGE }, children: [pText('Vol / Sat', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 12, before: 2, after: 2 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 13, type: WidthType.PERCENTAGE }, children: [pText('HPS Satuan', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 12, before: 2, after: 2 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 13, type: WidthType.PERCENTAGE }, children: [pText('Penawaran Awal', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 12, before: 2, after: 2 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 12, type: WidthType.PERCENTAGE }, children: [pText('Hasil Nego Sat', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 12, before: 2, after: 2 })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 12, type: WidthType.PERCENTAGE }, children: [pText('Subtotal Sepakat', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 12, before: 2, after: 2 })] })
      ]
    })
  ];

  const computedItems = cleanProrateItemPrices(items, hpsNominal, penawaranAwal, sepakatKontrak);

  if (computedItems && computedItems.length > 0) {
    computedItems.forEach((it, idx) => {
      const vol = Number(it.volume || 1);
      const hpsSat = Number(it.harga_satuan_hps || 0);
      const penSat = Number(it.harga_satuan_penawaran || hpsSat);
      const negoSat = Number(it.harga_satuan_kontrak || penSat);
      const subtotalNego = Number(it.jumlah_kontrak || (vol * negoSat));
      itemNegoRows.push(new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 12, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [
            pText(it.uraian_item || 'Barang Kebutuhan Satker', { bold: true, size: 12, before: 1, after: 1 }),
            pText(it.spesifikasi_teknis || it.merk_tipe_katalog || 'Standar KAK & TKDN Satker', { size: 10.5, color: '64748B', before: 0, after: 1 })
          ]}),
          new TableCell({ borders: BORDER_TABLE, children: [pText(vol + ' ' + (it.satuan || 'Unit'), { align: AlignmentType.CENTER, size: 12, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(hpsSat), { align: AlignmentType.RIGHT, size: 11.5, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(penSat), { align: AlignmentType.RIGHT, size: 11.5, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(negoSat), { align: AlignmentType.RIGHT, bold: true, color: '15803D', size: 11.5, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(subtotalNego), { align: AlignmentType.RIGHT, bold: true, color: '1E3A8A', size: 11.5, before: 1, after: 1 })] })
        ]
      }));
    });
  } else {
    itemNegoRows.push(new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ borders: BORDER_TABLE, children: [pText('1', { align: AlignmentType.CENTER, size: 12, before: 1, after: 1 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText(paket.nama_paket || 'Paket Pengadaan', { bold: true, size: 12, before: 1, after: 1 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText('1 Paket', { align: AlignmentType.CENTER, size: 12, before: 1, after: 1 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(hpsNominal), { align: AlignmentType.RIGHT, size: 11.5, before: 1, after: 1 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(penawaranAwal), { align: AlignmentType.RIGHT, size: 11.5, before: 1, after: 1 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(sepakatKontrak), { align: AlignmentType.RIGHT, bold: true, color: '15803D', size: 11.5, before: 1, after: 1 })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(sepakatKontrak), { align: AlignmentType.RIGHT, bold: true, color: '1E3A8A', size: 11.5, before: 1, after: 1 })] })
      ]
    }));
  }

  // Baris Total (menghitung sum aktual dari baris agar 100% konsisten vertikal & horizontal)
  const sumHps = computedItems && computedItems.length > 0 ? computedItems.reduce((acc, it) => acc + (Number(it.volume || 1) * Number(it.harga_satuan_hps || 0)), 0) : hpsNominal;
  const sumPen = computedItems && computedItems.length > 0 ? computedItems.reduce((acc, it) => acc + (Number(it.volume || 1) * Number(it.harga_satuan_penawaran || 0)), 0) : penawaranAwal;
  const sumNego = computedItems && computedItems.length > 0 ? computedItems.reduce((acc, it) => acc + Number(it.jumlah_kontrak || ((it.volume || 1) * it.harga_satuan_kontrak)), 0) : sepakatKontrak;

  itemNegoRows.push(new TableRow({
    cantSplit: true,
    children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'EFF6FF', type: ShadingType.CLEAR }, columnSpan: 3, children: [pText('TOTAL HASIL NEGOSIASI HARGA KONTRAK (TERMASUK PPN 11%):', { bold: true, size: 12, align: AlignmentType.RIGHT, before: 2, after: 2 })] }),
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'EFF6FF', type: ShadingType.CLEAR }, children: [pText(formatRupiah(sumHps), { bold: true, size: 11.5, align: AlignmentType.RIGHT, before: 2, after: 2 })] }),
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'EFF6FF', type: ShadingType.CLEAR }, children: [pText(formatRupiah(sumPen), { bold: true, size: 11.5, align: AlignmentType.RIGHT, before: 2, after: 2 })] }),
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'EFF6FF', type: ShadingType.CLEAR }, columnSpan: 2, children: [pText(formatRupiah(sumNego), { bold: true, color: '1E3A8A', size: 12.5, align: AlignmentType.RIGHT, before: 2, after: 2 })] })
    ]
  }));

  const doc2Children = [
    ...buildKopSuratKpu(settings),
    pText(doc2Title, { bold: true, size: 18, align: AlignmentType.CENTER, before: 10, after: 3 }),
    pText('Nomor: ' + doc2No, { size: 14, align: AlignmentType.CENTER, italics: true, color: '1E3A8A', before: 0, after: 14 }),
    pText(`${hariTanggalTahap9.kalimatFormal}, bertempat di ${tempatPemilihan}, kami yang bertanda tangan di bawah ini telah melaksanakan klarifikasi teknis dan negosiasi harga dengan rincian sebagai berikut:`, { size: 14, before: 4, after: 8 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_NONE, width: { size: 4, type: WidthType.PERCENTAGE }, children: [pText('1.', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_NONE, width: { size: 26, type: WidthType.PERCENTAGE }, children: [pText('Nama / NIP', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_NONE, width: { size: 70, type: WidthType.PERCENTAGE }, children: [pText(': ' + ppNama + ' / ' + (ppNip.match(/^\d/) ? ('NIP. ' + ppNip) : ppNip), { bold: true, size: 13, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_NONE, children: [pText('', { size: 13 })] }),
          new TableCell({ borders: BORDER_NONE, children: [pText('Jabatan / Unit', { size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_NONE, children: [pText(': ' + ppJabatan + ' ' + leftUnitLabel + ', bertindak selaku Pelaksana Pemilihan Penyedia, selanjutnya disebut PIHAK KESATU.', { size: 13, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_NONE, children: [pText('2.', { bold: true, size: 13, before: 2, after: 1 })] }),
          new TableCell({ borders: BORDER_NONE, children: [pText('Nama Wakil Penyedia', { bold: true, size: 13, before: 2, after: 1 })] }),
          new TableCell({ borders: BORDER_NONE, children: [pText(': ' + direkturPenyedia + ' (' + jabatanPenyedia + ')', { bold: true, size: 13, before: 2, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_NONE, children: [pText('', { size: 13 })] }),
          new TableCell({ borders: BORDER_NONE, children: [pText('Badan Usaha / Legalitas', { size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_NONE, children: [
            pText(': ' + namaPenyedia + ' (' + kualifikasiPenyedia + '), beralamat di ' + alamatPenyedia + '.', { size: 13, before: 1, after: 1 }),
            pText('  NPWP: ' + npwpPenyedia + ' | NIB: ' + nibPenyedia + ' (OSS-RBA Terverifikasi)', { size: 12.5, bold: true, color: '1E3A8A', before: 0, after: 1 }),
            pText('  KBLI Terdaftar: ' + kbliPenyedia + ', selanjutnya disebut PIHAK KEDUA.', { size: 12, color: '334155', before: 0, after: 1 })
          ] })
        ]})
      ]
    }),
    pText('PIHAK KESATU dan PIHAK KEDUA secara bersama-sama telah melaksanakan klarifikasi teknis dan negosiasi harga atas Paket Pekerjaan "' + (paket.nama_paket || '-') + '", dengan hasil kesepakatan sebagai berikut:', { size: 13.5, before: 8, after: 6 }),
    pText('A. HASIL KLARIFIKASI SPESIFIKASI TEKNIS & PERSYARATAN KAK:', { bold: true, size: 14, color: '1E3A8A', before: 6, after: 3, keepNext: true }),
    pText('1. Kesesuaian Spesifikasi Teknis: PIHAK KEDUA menyatakan sanggup dan menjamin bahwa 100% item barang yang diserahkan adalah barang baru, asli (original), bukan rekondisi, serta memenuhi seluruh parameter Kerangka Acuan Kerja (KAK) dan Spesifikasi Teknis PPK.', { size: 13, before: 2, after: 3 }),
    pText('2. Jangka Waktu Pelaksanaan & SLA Pengiriman: Pengiriman dan serah terima disepakati selesai dalam waktu ' + (paket.masa_pelaksanaan_hari || 14) + ' (empat belas) hari kalender terhitung sejak penandatanganan kontrak/SPMK, dengan sistem penyerahan franco Kantor KPU Kabupaten Ngawi.', { size: 13, before: 2, after: 3 }),
    pText('3. Layanan Purna Jual & Garansi: Disepakati masa garansi resmi purna jual pabrikan minimal 1 (satu) tahun (365 hari kalender) disertai penggantian unit baru apabila terjadi kerusakan/cacat pabrik dalam 30 hari pertama.', { size: 13, before: 2, after: 6 }),
    pText('B. HASIL NEGOSIASI HARGA & EFISIENSI BELANJA NEGARA:', { bold: true, size: 14, color: '1E3A8A', before: 6, after: 3, keepNext: true }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: itemNegoRows
    }),
    pText('C. REKAPITULASI EFISIENSI ANGGARAN & PENGHEMATAN BELANJA NEGARA:', { bold: true, size: 14, color: '1E3A8A', before: 8, after: 3, keepNext: true }),
    pText('Berdasarkan hasil negosiasi di atas, diperoleh efisiensi anggaran negara terhadap Nilai HPS sebesar ' + formatRupiah(efisiensiHps) + ' (' + persenEfisiensiHps + '%) dan efisiensi terhadap Pagu Anggaran sebesar ' + formatRupiah(efisiensiPagu) + ' (' + persenEfisiensiPagu + '%). Harga kesepakatan final sebesar ' + formatRupiah(sepakatKontrak) + ' (' + terbilangRupiah(sepakatKontrak) + ') telah dinyatakan sah, wajar, dan dapat dipertanggungjawabkan sesuai ketentuan perundang-undangan.', { size: 13, before: 2, after: 10, keepNext: true }),
    buildDualSignatureStage9PelaksanaPenyedia('Ditetapkan di Ngawi, ' + tglTahap9Str)
  ];

  // =========================================================================
  // DOKUMEN 3: BERITA ACARA HASIL PEMILIHAN (BAHP / BAHPL)
  // =========================================================================
  const doc3Children = [
    ...buildKopSuratKpu(settings),
    pText(doc3Title, { bold: true, size: 18, align: AlignmentType.CENTER, before: 10, after: 3 }),
    pText('Nomor: ' + doc3No, { size: 14, align: AlignmentType.CENTER, italics: true, color: '1E3A8A', before: 0, after: 14 }),
    pText(`${hariTanggalTahap9.kalimatFormal}, bertempat di ${tempatPemilihan}, ${ppJabatan} ${leftUnitLabel} telah menetapkan secara resmi Hasil Pelaksanaan Pemilihan Penyedia atas Paket Pengadaan berikut:`, { size: 14, before: 4, after: 8 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('Nama Paket Pengadaan', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 70, type: WidthType.PERCENTAGE }, children: [pText(paket.nama_paket || '-', { bold: true, color: '1E3A8A', size: 13, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Metode Pemilihan', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(metode + ' (' + pelaksana + ')', { size: 13, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Penyedia Terpilih / Pemenang', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(namaPenyedia, { bold: true, color: '15803D', size: 13.5, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Wakil Sah / Penandatangan', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(direkturPenyedia + ' (' + jabatanPenyedia + ')', { bold: true, size: 13, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('NIB & NPWP Penyedia', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('NIB: ' + nibPenyedia + ' (Terdaftar OSS-RBA) | NPWP: ' + npwpPenyedia, { bold: true, color: '1E3A8A', size: 12.5, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('KBLI Legalitas Usaha', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('KBLI ' + kbliPenyedia, { size: 12.5, color: '0F172A', before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Rekening Bank & Kualifikasi', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(bankPenyedia + ' (' + rekPenyedia + ') | ' + kualifikasiPenyedia + ' (Afirmasi UMK Pasal 65 Perpres PBJ)', { size: 12.5, before: 1, after: 1 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nilai Hasil Negosiasi (Final)', { bold: true, size: 13, before: 1, after: 1 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [
            pText(formatRupiah(sepakatKontrak) + ' (Termasuk PPN 11%)', { bold: true, color: '1E3A8A', size: 14, before: 1, after: 1 }),
            pText('Terbilang: ' + terbilangRupiah(sepakatKontrak), { italics: true, color: '475569', size: 12, before: 0, after: 1 })
          ]})
        ]})
      ]
    }),
    pText('Penyedia tersebut di atas dinyatakan memenuhi persyaratan legalitas, kualifikasi, administrasi, teknis, dan harga dengan status Konfirmasi Status Wajib Pajak (KSWP) Valid, serta TIDAK terdaftar dalam Daftar Hitam (Blacklist) Nasional LKPP.', { size: 13.5, before: 8, after: 6 }),
    pText('Berita Acara Hasil Pemilihan ini disampaikan kepada Pejabat Pembuat Komitmen (PPK) untuk diperiksa dan ditelaah pada Tahap 10, sebagai bahan pertimbangan penerbitan Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) pada Tahap 11. Demikian Berita Acara ini dibuat untuk dipergunakan sebagaimana mestinya.', { size: 13.5, before: 2, after: 12, keepNext: true }),
    buildDualSignatureStage9PelaksanaPPK('Ditetapkan di Ngawi, ' + tglTahap9Str)
  ];

  const pageProps = {
    size: { width: 11906, height: 16838 },
    margin: { top: 760, right: 820, bottom: 760, left: 820 }
  };

  return [
    {
      properties: {
        ...(isFirstStageInDoc ? {} : { type: SectionType.NEXT_PAGE }),
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen I Tahap 09: ' + doc1Title, doc1No) },
      footers: { default: makeFooter('Dokumen I — ' + doc1Title) },
      children: doc1Children
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen II Tahap 09: ' + doc2Title, doc2No) },
      footers: { default: makeFooter('Dokumen II — ' + doc2Title) },
      children: doc2Children
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen III Tahap 09: ' + doc3Title, doc3No) },
      footers: { default: makeFooter('Dokumen III — ' + doc3Title) },
      children: doc3Children
    }
  ];
}



// =============================================================================
// TAHAP 10: REVIU HASIL PEMILIHAN PENYEDIA & VALIDASI BO (PPK GATEKEEPING)
// Sesuai Perpres 16/2018 jo. Perpres 12/2021 jo. Perpres 46/2025 Pasal 11 ayat (2),
// Perpres 13/2018 (Beneficial Ownership), dan Perlem LKPP 2/2026
// =============================================================================
function buildStage10Sections(ctx, tahapRow, keu, isFirstStageInDoc) {
  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, settings } = ctx;
  const metode = paket.metode_pemilihan || 'E-Purchasing';
  const pelaksana = paket.pelaksana_pemilihan || 'Pejabat Pengadaan';
  const tglTahap10Raw = tahapRow.tanggal_dokumen || paket.tgl_reviu_ppk || '2026-05-22';
  const tglTahap10Str = formatTanggalIndo(tglTahap10Raw);
  const hariTanggalTahap10 = formatHariTanggalBeritaAcara(tglTahap10Raw);
  const tempatReviu = paket.tempat_reviu_dpp || paket.tempat_pemilihan || 'Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jalan Untung Suropati Nomor 48 Ngawi';

  const paguNominal = Number(paket.nilai_pagu || 145000000);
  const hpsNominal = Number(paket.nilai_hps || 140350000);
  const penawaranAwal = Number(paket.nilai_penawaran_awal || hpsNominal);
  const sepakatKontrak = Number(paket.nilai_kontrak || 138000000);
  const efisiensiHps = Math.max(0, hpsNominal - sepakatKontrak);
  const persenEfisiensiHps = hpsNominal > 0 ? ((efisiensiHps / hpsNominal) * 100).toFixed(2) : '1.67';
  const efisiensiPagu = Math.max(0, paguNominal - sepakatKontrak);
  const persenEfisiensiPagu = paguNominal > 0 ? ((efisiensiPagu / paguNominal) * 100).toFixed(2) : '4.83';

  const ppkNama = cleanNamaTanpaGelar((ppk && ppk.nama_lengkap) || 'MOHAMMAD NOOR JIHAN');
  const ppkNip = (ppk && ppk.nip) || '19910518 201503 1 002';

  let ppNama = cleanNamaTanpaGelar((pejabatPengadaan && pejabatPengadaan.nama_lengkap) || 'INDRAYU FATIKA MAHARDIKA');
  let ppNip = (pejabatPengadaan && pejabatPengadaan.nip) || '19931024 202012 2 014';
  let ppJabatan = 'Pejabat Pengadaan';
  let ppTtdLabel = 'PEJABAT PENGADAAN';

  const kpaNama = cleanNamaTanpaGelar((kpa && kpa.nama_lengkap) || 'BUDI RAHAYU');
  const kpaNip = (kpa && kpa.nip) || '19720412 199803 1 004';

  const namaPenyedia = (penyedia && penyedia.nama_perusahaan) || 'CV. GRAFIKA PRATAMA NGAWI';
  const direkturPenyedia = cleanNamaTanpaGelar((penyedia && penyedia.nama_direktur) || 'HENDRA SURYAWAN');
  const jabatanPenyedia = (penyedia && penyedia.jabatan_penandatangan) || 'Direktur';
  const npwpPenyedia = (penyedia && penyedia.npwp) || '01.445.882.9-646.000';
  const nibPenyedia = (penyedia && penyedia.nib) || '9120301182451';
  
  // KBLI Baku & Sah: Bidang Pengadaan Komputer/TI adalah KBLI 46511
  const kbliPenyedia = '46511 (Perdagangan Besar Komputer dan Perlengkapan Komputer)';
  const alamatPenyedia = (penyedia && penyedia.alamat) || 'Jl. Trunojoyo No. 15 Ngawi';
  const bankPenyedia = (penyedia && penyedia.nama_bank) || 'Bank BRI Cabang Ngawi';
  const rekPenyedia = (penyedia && penyedia.no_rekening) || '0058-01-002481-30-8';

  const boNama = cleanNamaTanpaGelar(paket.bo_nama || direkturPenyedia);
  const boNik = paket.bo_nik || '3521011504820003';
  const boPosisi = paket.bo_posisi || 'Pemilik Modal / Direktur (100%)';
  const boBenturan = paket.bo_benturan_kepentingan || 'Bebas Benturan Kepentingan';
  const statusKswp = paket.status_kswp || 'Valid / Konfirmasi Sesuai';
  const statusBlacklist = paket.status_daftar_hitam || 'Tidak Tercantum (Bebas Sanksi Daftar Hitam)';

  // Nomor BAHP Standar Konsisten Bulan Mei (V/2026)
  const noBahp = '009/BAHP-EP/PBJ-2026-001/PP-PBJ/KPU-NGW/V/2026';
  const tglBahpStr = '21 Mei 2026';

  const noBaReviu = tahapRow.nomor_dokumen || paket.no_ba_reviu_ppk || ('010/BA-REV/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PPK-PBJ/KPU-NGW/V/2026');
  const noLutBo = '010/LUT-BO/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PPK-PBJ/KPU-NGW/V/2026';
  const noStRev = '010/ST-REV/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PPK-PBJ/KPU-NGW/V/2026';

  const makeHeader = (label, docNo) => new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: (settings.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase() + ' | ' + label, size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ text: '  [ ' + docNo + ' ]', size: 15, font: 'Cambria', color: '1E3A8A', bold: true })
        ]
      })
    ]
  });

  const makeFooter = (label) => new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'SI-PRABU v3.0 Satker 657811 — ' + label + ' | Halaman ', size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Cambria', color: '1E3A8A', bold: true }),
          new TextRun({ text: ' dari ', size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Cambria', color: '1E3A8A', bold: true })
        ]
      })
    ]
  });

  const buildDualSignPpkDanPp = (locDate) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              pText('DIPERIKSA BERSAMA OLEH:', { bold: true, align: AlignmentType.CENTER, size: 21, before: 0, after: 2, keepNext: true }),
              pText(ppTtdLabel, { bold: true, align: AlignmentType.CENTER, size: 22, before: 0, after: 2, keepNext: true }),
              pText(settings.nama_satker || 'KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 21, before: 0, after: 180, keepNext: true }),
              pText('( ' + ppNama + ' )', { bold: true, align: AlignmentType.CENTER, size: 22, before: 0, after: 2, keepNext: true }),
              pText('NIP. ' + ppNip, { align: AlignmentType.CENTER, size: 20, before: 0, after: 0 })
            ]
          }),
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              pText(locDate, { align: AlignmentType.CENTER, size: 21, before: 0, after: 2, keepNext: true }),
              pText('DITETAPKAN & DISETUJUI OLEH:', { bold: true, align: AlignmentType.CENTER, size: 21, before: 0, after: 2, keepNext: true }),
              pText('PEJABAT PEMBUAT KOMITMEN (PPK)', { bold: true, align: AlignmentType.CENTER, size: 22, before: 0, after: 180, keepNext: true }),
              pText('( ' + ppkNama + ' )', { bold: true, align: AlignmentType.CENTER, size: 22, before: 0, after: 2, keepNext: true }),
              pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 20, before: 0, after: 0 })
            ]
          })
        ]
      })
    ]
  });

  const buildSingleSignPpk = (locDate) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ borders: BORDER_NONE, width: { size: 50, type: WidthType.PERCENTAGE }, children: [pText('', { size: 10 })] }),
          new TableCell({
            borders: BORDER_NONE,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              pText(locDate, { align: AlignmentType.CENTER, size: 21, before: 0, after: 2, keepNext: true }),
              pText('PEJABAT PEMBUAT KOMITMEN (PPK)', { bold: true, align: AlignmentType.CENTER, size: 22, before: 0, after: 2, keepNext: true }),
              pText((settings.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase(), { align: AlignmentType.CENTER, size: 21, before: 0, after: 180, keepNext: true }),
              pText('( ' + ppkNama + ' )', { bold: true, align: AlignmentType.CENTER, size: 22, before: 0, after: 2, keepNext: true }),
              pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 20, before: 0, after: 0 })
            ]
          })
        ]
      })
    ]
  });

  // =========================================================================
  // DOKUMEN 1: BERITA ACARA REVIU HASIL PEMILIHAN PENYEDIA OLEH PPK (BA-REV)
  // =========================================================================
  const doc1Children = [
    ...buildKopSuratKpu(settings),
    pText('BERITA ACARA REVIU HASIL PEMILIHAN PENYEDIA', { bold: true, size: 26, align: AlignmentType.CENTER, before: 40, after: 4 }),
    pText('OLEH PEJABAT PEMBUAT KOMITMEN (PPK)', { bold: true, size: 23, align: AlignmentType.CENTER, before: 0, after: 4 }),
    pText('Nomor: ' + noBaReviu, { size: 21, align: AlignmentType.CENTER, italic: true, color: '1E3A8A', before: 0, after: 140 }),

    pText(`${hariTanggalTahap10.kalimatFormal}, bertempat di ${tempatReviu}, Pejabat Pembuat Komitmen (PPK) Satuan Kerja KPU Kabupaten Ngawi bersama Pejabat Pengadaan telah melaksanakan Rapat Reviu dan Pemeriksaan Laporan Hasil Pemilihan Penyedia Barang/Jasa berdasarkan Berita Acara Hasil Pemilihan E-Purchasing (BAHP-EP) Nomor: ${noBahp} tanggal ${tglBahpStr}.`, { align: AlignmentType.JUSTIFY, size: 21, line: 268, before: 0, after: 80 }),

    pText('I. IDENTITAS PAKET PENGADAAN & PENYEDIA HASIL PEMILIHAN', { bold: true, size: 22, color: '1E3A8A', before: 100, after: 40, keepNext: true }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_TABLE,
      rows: [
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, width: { size: 32, type: WidthType.PERCENTAGE }, children: [pText('Nama Paket Pengadaan', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 68, type: WidthType.PERCENTAGE }, children: [pText(paket.nama_paket || '-', { bold: true, color: '1E3A8A', size: 20, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Kode RUP & Kode Paket', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(`RUP: ${paket.kode_rup || 'RUP-2026-657811-01'} | Internal: ${paket.kode_paket_internal || 'PBJ-2026-001'}`, { size: 20, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Pagu Anggaran & Sumber Dana', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(`${formatRupiah(paguNominal)} (${paket.sumber_dana || 'APBN DIPA 2026'} — MAK 532111 Belanja Modal Peralatan dan Mesin)`, { size: 20, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nilai HPS PPK', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(hpsNominal), { bold: true, size: 20, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Metode Pemilihan & Pelaksana', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(`${metode} (${pelaksana}) via Katalog Elektronik Versi 6.0 [ID: ${paket.id_paket_katalog || 'ID-KAT-2026-657811-001'}]`, { size: 20, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Penyedia Hasil Pemilihan', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(`${namaPenyedia} (Pimpinan: ${direkturPenyedia})`, { bold: true, color: '15803D', size: 20, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Legalitas & Izin KBLI Penyedia', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(`NPWP: ${npwpPenyedia} | NIB: ${nibPenyedia} | KBLI: ${kbliPenyedia}`, { bold: true, color: '1E3A8A', size: 19, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nilai Hasil Negosiasi (Final)', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [
            pText(formatRupiah(sepakatKontrak) + ' (Termasuk PPN 11% & PPh 22 1,5%)', { bold: true, color: '1E3A8A', size: 21, before: 10, after: 10 }),
            pText('Terbilang: ' + terbilangRupiah(sepakatKontrak), { italic: true, color: '475569', size: 19, before: 0, after: 10 })
          ]})
        ]})
      ]
    }),

    pText('II. HASIL PENELAAHAN & PENGUJIAN OLEH PPK', { bold: true, size: 22, color: '1E3A8A', before: 120, after: 40, keepNext: true }),
    pText('PPK telah melakukan pengujian menyeluruh (gatekeeping) terhadap 4 (empat) pilar utama hasil pemilihan penyedia:', { align: AlignmentType.JUSTIFY, size: 21, line: 268, before: 0, after: 60 }),
    
    // PENOMORAN PROFESIONAL HANGING INDENT
    pListItem('1.', 'Aspek Kepatuhan Prosedur Pemilihan', 'Seluruh tahapan pemilihan melalui E-Purchasing Katalog Elektronik Versi 6.0 telah dilaksanakan sesuai dengan Perpres Nomor 16/2018 jo. Perpres 46/2025 dan Keputusan Kepala LKPP Nomor 177 Tahun 2024. Dokumen pemilihan, riwayat klarifikasi teknis, dan negosiasi harga digital terdokumentasi lengkap dan sah pada sistem SPSE/Katalog.'),
    pListItem('2.', 'Aspek Kualifikasi & Integritas Rekanan', 'Rekanan CV Grafika Pratama Ngawi terkonfirmasi memiliki izin usaha yang sah sesuai bidang pekerjaan (KBLI 46511), status Konfirmasi Status Wajib Pajak (KSWP) VALID pada sistem DJP Kemenkeu, TIDAK tercatat dalam Daftar Hitam (Blacklist) Nasional LKPP, serta telah menyerahkan deklarasi Pemilik Manfaat (Beneficial Ownership) atas nama Hendra Suryawan (100%) bebas dari benturan kepentingan dengan aparatur PBJ KPU Kabupaten Ngawi.'),
    pListItem('3.', 'Aspek Kesesuaian Teknis & Mutu Barang', 'Seluruh barang yang ditawarkan memenuhi 100% Kerangka Acuan Kerja (KAK) PPK, memiliki sertifikasi TKDN yang memenuhi ambang batas ketentuan pengadaan barang/jasa pemerintah, serta didukung surat jaminan purna jual resmi pabrikan minimal 1 (satu) tahun (365 hari kalender) dengan SLA perbaikan on-site 1x24 jam di Kantor KPU Kabupaten Ngawi.'),
    pListItem('4.', 'Aspek Kewajaran Harga & Efisiensi Keuangan Negara', 'Harga kesepakatan final sebesar ' + formatRupiah(sepakatKontrak) + ' menghasilkan efisiensi belanja negara sebesar ' + formatRupiah(efisiensiHps) + ' (' + persenEfisiensiHps + '%) terhadap HPS dan ' + formatRupiah(efisiensiPagu) + ' (' + persenEfisiensiPagu + '%) terhadap Pagu DIPA. Harga tersebut dinilai sangat wajar, kompetitif, dan menguntungkan keuangan negara.'),

    pText('III. KESIMPULAN & KEPUTUSAN RESMI PPK', { bold: true, size: 22, color: '1E3A8A', before: 120, after: 40, keepNext: true }),
    pText('Berdasarkan hasil penelaahan, verifikasi, dan klarifikasi yang dilakukan secara seksama, Pejabat Pembuat Komitmen (PPK) dengan ini MENYIMPULKAN DAN MEMUTUSKAN:', { align: AlignmentType.JUSTIFY, size: 21, line: 268, before: 0, after: 60 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_TABLE,
      rows: [
        new TableRow({ cantSplit: true, children: [
          new TableCell({
            borders: BORDER_TABLE,
            shading: { fill: 'ECFDF5', type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              pText('KEPUTUSAN PPK: DISETUJUI PENUH UNTUK DITERBITKAN SPPBJ', { bold: true, color: '15803D', size: 23, align: AlignmentType.CENTER, before: 40, after: 30 }),
              pText('Laporan Hasil Pemilihan Penyedia (BAHP-EP) yang disampaikan oleh Pejabat Pengadaan DITERIMA DAN DISETUJUI SECARA PENUH. Proses pengadaan dinyatakan memenuhi seluruh aspek legalitas, teknis, administratif, dan akuntabilitas keuangan negara, sehingga dapat langsung dilanjutkan ke Tahap 11: Penerbitan Surat Penunjukan Penyedia Barang/Jasa (SPPBJ).', { align: AlignmentType.JUSTIFY, size: 21, line: 268, before: 0, after: 30 })
            ]
          })
        ]})
      ]
    }),

    pText('Demikian Berita Acara Reviu Hasil Pemilihan ini dibuat dan ditandatangani bersama oleh Pejabat Pengadaan dan Pejabat Pembuat Komitmen (PPK) dalam 2 (dua) rangkap asli bermaterai cukup untuk dipergunakan sebagaimana mestinya.', { align: AlignmentType.JUSTIFY, size: 21, line: 268, before: 80, after: 120, keepNext: true }),
    buildDualSignPpkDanPp('Ngawi, ' + tglTahap10Str),
    
    pText('Tembusan Disampaikan Kepada Yth.:', { bold: true, size: 20, color: '334155', before: 80, after: 20, keepNext: true }),
    pListItem('1.', '', 'Kuasa Pengguna Anggaran (KPA) KPU Kabupaten Ngawi (sebagai laporan);', { size: 20, before: 10, after: 10 }),
    pListItem('2.', '', 'Pejabat Pengadaan KPU Kabupaten Ngawi;', { size: 20, before: 10, after: 10 }),
    pListItem('3.', '', 'Arsip Pengadaan Satker KPU Kabupaten Ngawi.', { size: 20, before: 10, after: 10 })
  ];

  // =========================================================================
  // DOKUMEN 2: LEMBAR UJI TUNTAS KUALIFIKASI, KSWP, DAFTAR HITAM & BO (LUT-BO)
  // =========================================================================
  const doc2Children = [
    ...buildKopSuratKpu(settings),
    pText('LEMBAR UJI TUNTAS KUALIFIKASI, KSWP, DAFTAR HITAM,', { bold: true, size: 25, align: AlignmentType.CENTER, before: 40, after: 4 }),
    pText('DAN VALIDASI BENEFICIAL OWNERSHIP (BO)', { bold: true, size: 23, align: AlignmentType.CENTER, before: 0, after: 4 }),
    pText('PENCEGAHAN BENTURAN KEPENTINGAN & TPPU DALAM PBJ', { bold: true, size: 20, color: '1E3A8A', align: AlignmentType.CENTER, before: 0, after: 4 }),
    pText('Nomor: ' + noLutBo, { size: 21, align: AlignmentType.CENTER, italic: true, color: '1E3A8A', before: 0, after: 140 }),

    pText('Dalam rangka pemenuhan prinsip integritas, akuntabilitas, transparansi, serta pencegahan benturan kepentingan dan tindak pidana pencucian uang sesuai Perpres Nomor 13 Tahun 2018 dan Perpres Nomor 46 Tahun 2025 Pasal 7, Pejabat Pembuat Komitmen (PPK) telah melakukan uji tuntas (due diligence) terhadap calon penyedia terpilih dengan rincian instrumen sebagai berikut:', { align: AlignmentType.JUSTIFY, size: 21, line: 268, before: 0, after: 80 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_TABLE,
      rows: [
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 6, type: WidthType.PERCENTAGE }, children: [pText('NO', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 28, type: WidthType.PERCENTAGE }, children: [pText('INSTRUMEN UJI TUNTAS', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 36, type: WidthType.PERCENTAGE }, children: [pText('PARAMETER & SUMBER DATA', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('HASIL VALIDASI PPK', { bold: true, color: 'FFFFFF', align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText('1', { align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Konfirmasi Status Wajib Pajak (KSWP)', { bold: true, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Portal DJP Online Kemenkeu RI (Status SPT 2 Tahun Terakhir)', { size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('✅ VALID / SESUAI (Tidak Ada Tunggakan Pajak)', { bold: true, color: '15803D', size: 19, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText('2', { align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Daftar Hitam Nasional (Blacklist)', { bold: true, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Portal Inaproc / SiKAP LKPP Nasional per tanggal reviu', { size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('✅ BEBAS DAFTAR HITAM (Rekam Jejak Baik)', { bold: true, color: '15803D', size: 19, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText('3', { align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Pemilik Manfaat (Beneficial Owner)', { bold: true, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Akta Pendirian/Perubahan & Data AHU Kemenkumham (Perpres 13/2018)', { size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(`✅ TERKONFIRMASI: ${boNama} (${boPosisi})`, { bold: true, color: '15803D', size: 19, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText('4', { align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Benturan Kepentingan (Conflict of Interest)', { bold: true, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Pakta Integritas & Verifikasi Hubungan Keluarga/Afiliasi PBJ', { size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('✅ BEBAS BENTURAN KEPENTINGAN (Pasal 7 Perpres 46/2025)', { bold: true, color: '15803D', size: 19, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText('5', { align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Izin Usaha & Legalitas Berusaha', { bold: true, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('NIB 9120301182451 via OSS-RBA (KBLI 46511)', { size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('✅ SESUAI BIDANG PEKERJAAN (KBLI 46511 Komputer)', { bold: true, color: '15803D', size: 19, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText('6', { align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Afirmasi Usaha Mikro & Kecil (UMK)', { bold: true, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Kriteria Modal & Omzet Usaha Kecil (Pasal 65 Perpres PBJ)', { size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('✅ USAHA KECIL (Prioritas Alokasi Anggaran 40%)', { bold: true, color: '15803D', size: 19, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText('7', { align: AlignmentType.CENTER, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Validitas Rekening Penampung Pembayaran', { bold: true, size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Buku Tabungan / Rekening Koran Resmi Bank BUMN (BRI)', { size: 19, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(`✅ SINKRON: ${bankPenyedia} (${rekPenyedia}) an. ${namaPenyedia}`, { bold: true, color: '15803D', size: 19, before: 20, after: 20 })] })
        ]})
      ]
    }),

    pText('KESIMPULAN UJI TUNTAS INTEGRITAS & BENEFICIAL OWNERSHIP:', { bold: true, size: 22, color: '1E3A8A', before: 120, after: 40, keepNext: true }),
    pText(`Berdasarkan 7 (tujuh) parameter instrumen pengujian di atas, Penyedia ${namaPenyedia} dengan Pemilik Manfaat Utama Sdr. ${boNama} (NIK ${boNik}) dinyatakan MEMENUHI SYARAT INTEGRITAS PENUH, TIDAK MEMILIKI BENTURAN KEPENTINGAN DENGAN SATKER KPU KABUPATEN NGAWI, dan LAIK UNTUK DITERBITKAN SURAT PENUNJUKAN PENYEDIA BARANG/JASA (SPPBJ).`, { align: AlignmentType.JUSTIFY, size: 21, line: 268, before: 0, after: 120, keepNext: true }),

    buildSingleSignPpk('Ngawi, ' + tglTahap10Str)
  ];

  // =========================================================================
  // DOKUMEN 3: SURAT PENETAPAN PERSETUJUAN HASIL PEMILIHAN & KESIAPAN SPPBJ
  // =========================================================================
  const doc3Children = [
    ...buildKopSuratKpu(settings),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_NONE,
      rows: [
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_NONE, width: { size: 15, type: WidthType.PERCENTAGE }, children: [pText('Nomor', { size: 21, before: 10, after: 10 })] }),
          new TableCell({ borders: BORDER_NONE, width: { size: 3, type: WidthType.PERCENTAGE }, children: [pText(':', { size: 21, before: 10, after: 10 })] }),
          new TableCell({ borders: BORDER_NONE, width: { size: 45, type: WidthType.PERCENTAGE }, children: [pText(noStRev, { bold: true, size: 21, before: 10, after: 10 })] }),
          new TableCell({ borders: BORDER_NONE, width: { size: 37, type: WidthType.PERCENTAGE }, children: [pText('Ngawi, ' + tglTahap10Str, { align: AlignmentType.RIGHT, size: 21, before: 10, after: 10 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_NONE, children: [pText('Sifat', { size: 21, before: 10, after: 10 })] }),
          new TableCell({ borders: BORDER_NONE, children: [pText(':', { size: 21, before: 10, after: 10 })] }),
          new TableCell({ borders: BORDER_NONE, columnSpan: 2, children: [pText('Penting / Segera', { size: 21, before: 10, after: 10 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_NONE, children: [pText('Lampiran', { size: 21, before: 10, after: 10 })] }),
          new TableCell({ borders: BORDER_NONE, children: [pText(':', { size: 21, before: 10, after: 10 })] }),
          new TableCell({ borders: BORDER_NONE, columnSpan: 2, children: [pText('1 (satu) Berkas Berita Acara Reviu PPK', { size: 21, before: 10, after: 10 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_NONE, children: [pText('Perihal', { size: 21, before: 10, after: 10 })] }),
          new TableCell({ borders: BORDER_NONE, children: [pText(':', { size: 21, before: 10, after: 10 })] }),
          new TableCell({ borders: BORDER_NONE, columnSpan: 2, children: [
            pText('Persetujuan Hasil Pemilihan Penyedia dan Kesiapan Penerbitan SPPBJ', { bold: true, color: '1E3A8A', size: 21, before: 10, after: 10 })
          ]})
        ]})
      ]
    }),

    pText('Kepada Yth.:\nPejabat Pengadaan Barang/Jasa\nKomisi Pemilihan Umum Kabupaten Ngawi\ndi -\n    NGAWI', { size: 21, line: 260, before: 100, after: 100 }),

    pText('Sehubungan dengan telah diterimanya Laporan Hasil Pemilihan Penyedia melalui Berita Acara Hasil Pemilihan E-Purchasing (BAHP-EP) Nomor: ' + noBahp + ' tanggal ' + tglBahpStr + ' untuk paket pekerjaan:', { align: AlignmentType.JUSTIFY, size: 21, line: 268, before: 0, after: 60 }),

    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: BORDER_TABLE,
      rows: [
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, width: { size: 30, type: WidthType.PERCENTAGE }, children: [pText('Nama Paket', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, width: { size: 70, type: WidthType.PERCENTAGE }, children: [pText(paket.nama_paket || '-', { bold: true, color: '1E3A8A', size: 20, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Penyedia Terpilih', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(namaPenyedia + ' (Pimpinan: ' + direkturPenyedia + ')', { bold: true, color: '15803D', size: 20, before: 20, after: 20 })] })
        ]}),
        new TableRow({ cantSplit: true, children: [
          new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nilai Kontrak Sepakat', { bold: true, size: 20, before: 20, after: 20 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(sepakatKontrak) + ' (Termasuk PPN 11% & PPh 22 1,5%) — Efisiensi HPS: ' + formatRupiah(efisiensiHps) + ' (' + persenEfisiensiHps + '%)', { bold: true, color: '1E3A8A', size: 20, before: 20, after: 20 })] })
        ]})
      ]
    }),

    pText('Maka dengan ini Pejabat Pembuat Komitmen (PPK) Satker KPU Kabupaten Ngawi menyampaikan hal-hal sebagai berikut:', { align: AlignmentType.JUSTIFY, size: 21, line: 268, before: 80, after: 40 }),
    
    // PENOMORAN PROFESIONAL HANGING INDENT
    pListItem('1.', 'Persetujuan Penuh Laporan Hasil Pemilihan', 'Berdasarkan hasil reviu mendalam dan pengujian tuntas integritas kualifikasi, KSWP valid, bebas sanksi daftar hitam, serta validasi beneficial ownership, PPK MENYETUJUI SECARA PENUH Laporan Hasil Pemilihan Penyedia yang disampaikan oleh Pejabat Pengadaan;'),
    pListItem('2.', 'Instruksi Penerbitan SPPBJ', 'Menginstruksikan kepada Pejabat Pengadaan dan Staf Administrasi Pengadaan untuk segera memproses dan menyiapkan Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) pada Tahap 11 sesuai format Keputusan KPU RI Nomor 1530 Tahun 2024;'),
    pListItem('3.', 'Kesiapan Penandatanganan Kontrak SPK', 'Memastikan calon penyedia menyampaikan dokumen pendukung final dan kesiapan penandatanganan Surat Perintah Kerja (SPK) / Kontrak Pengadaan Barang.'),

    pText('Demikian surat penetapan persetujuan ini disampaikan untuk dapat segera ditindaklanjuti sebagaimana mestinya.', { align: AlignmentType.JUSTIFY, size: 21, line: 268, before: 60, after: 120, keepNext: true }),

    buildSingleSignPpk('Ngawi, ' + tglTahap10Str),
    
    pText('Tembusan:', { bold: true, size: 20, color: '334155', before: 80, after: 20, keepNext: true }),
    pListItem('1.', '', 'Kuasa Pengguna Anggaran (KPA) KPU Kabupaten Ngawi;', { size: 20, before: 10, after: 10 }),
    pListItem('2.', '', 'Arsip Pengadaan Satker KPU Kabupaten Ngawi.', { size: 20, before: 10, after: 10 })
  ];

  const pageProps = {
    size: { width: 11906, height: 16838 },
    margin: { top: 760, right: 820, bottom: 760, left: 820 }
  };

  return [
    {
      properties: {
        ...(isFirstStageInDoc ? {} : { type: SectionType.NEXT_PAGE }),
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen I Tahap 10: Berita Acara Reviu PPK', noBaReviu) },
      footers: { default: makeFooter('Dokumen I — Berita Acara Reviu PPK') },
      children: doc1Children
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen II Tahap 10: Lembar Uji Tuntas BO & KSWP', noLutBo) },
      footers: { default: makeFooter('Dokumen II — Uji Tuntas BO & KSWP') },
      children: doc2Children
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: pageProps
      },
      headers: { default: makeHeader('Dokumen III Tahap 10: Surat Persetujuan Hasil Pemilihan', noStRev) },
      footers: { default: makeFooter('Dokumen III — Surat Persetujuan Hasil Pemilihan') },
      children: doc3Children
    }
  ];
}



// =============================================================================
// TAHAP 11: PENERBITAN SPPBJ & PEMERIKSAAN KETENTUAN JAMINAN PELAKSANAAN
// Sesuai Perpres 16/2018 jo. Perpres 12/2021 jo. Perpres 46/2025 Pasal 11 ayat (1) huruf f,
// Pasal 33 ayat (2) huruf b dan ayat (3), serta SK KPU 1530/2024
// =============================================================================
function buildStage11Sections(ctx, tahapRow, keu, isFirstStageInDoc) {
  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, settings } = ctx;
  const metode = paket.metode_pemilihan || 'E-Purchasing';
  const tglTahap11Raw = tahapRow.tanggal_dokumen || paket.tgl_sppbj || '2026-05-25';
  const tglTahap11Str = formatTanggalIndo(tglTahap11Raw);
  const hariTanggalTahap11 = formatHariTanggalBeritaAcara(tglTahap11Raw);

  const paguNominal = Number(paket.nilai_pagu || 145000000);
  const hpsNominal = Number(paket.nilai_hps || 140350000);
  const sepakatKontrak = Number(paket.nilai_kontrak || 138000000);
  const efisiensiHps = Math.max(0, hpsNominal - sepakatKontrak);
  const persenEfisiensiHps = hpsNominal > 0 ? ((efisiensiHps / hpsNominal) * 100).toFixed(2) : '1.67';

  const ppkNama = cleanNamaTanpaGelar((ppk && ppk.nama_lengkap) || 'MOHAMMAD NOOR JIHAN');
  const ppkNip = (ppk && ppk.nip) || '19910518 201503 1 002';

  let ppNama = cleanNamaTanpaGelar((pejabatPengadaan && pejabatPengadaan.nama_lengkap) || 'INDRAYU FATIKA MAHARDIKA');
  let ppNip = (pejabatPengadaan && pejabatPengadaan.nip) || '19931024 202012 2 014';

  const kpaNama = cleanNamaTanpaGelar((kpa && kpa.nama_lengkap) || 'BUDI RAHAYU');
  const kpaNip = (kpa && kpa.nip) || '19720412 199803 1 004';

  const namaPenyedia = (penyedia && penyedia.nama_perusahaan) || 'CV. GRAFIKA PRATAMA NGAWI';
  const direkturPenyedia = cleanNamaTanpaGelar((penyedia && penyedia.nama_direktur) || 'HENDRA SURYAWAN');
  const jabatanPenyedia = (penyedia && penyedia.jabatan_penandatangan) || 'Direktur';
  const npwpPenyedia = (penyedia && penyedia.npwp) || '01.445.882.9-646.000';
  const nibPenyedia = (penyedia && penyedia.nib) || '9120301182451';
  const kbliPenyedia = '46511 (Perdagangan Besar Komputer dan Perlengkapan Komputer)';
  const alamatPenyedia = (penyedia && penyedia.alamat) || 'Jl. Ronggowarsito No. 12, Kel. Pelem, Kec. Ngawi, Kab. Ngawi';

  // Nomor Naskah Resmi Tahap 11
  const noSppbj = tahapRow.nomor_dokumen || paket.no_sppbj || ('011/SPPBJ/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PPK-PBJ/KPU-NGW/V/2026');
  const noSuratKesanggupan = paket.no_surat_kesanggupan_penyedia || '028/GPN-NGW/SP-SPPBJ/V/2026';
  const tglSuratKesanggupan = paket.tgl_surat_kesanggupan || '2026-05-25';
  const tglSuratKesanggupanStr = formatTanggalIndo(tglSuratKesanggupan);

  const noBahp = '009/BAHP-EP/PBJ-2026-001/PP-PBJ/KPU-NGW/V/2026';
  const tglBahpStr = '21 Mei 2026';
  const noBaReviu = '010/BA-REV/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026';
  const tglBaReviuStr = '22 Mei 2026';

  const wajibJampel = Number(paket.wajib_jaminan_pelaksanaan || 0) === 1 || String(paket.status_jaminan_pelaksanaan || '').includes('DIPERSYARATKAN');
  const nilaiJampel = Number(paket.nilai_jaminan_pelaksanaan || 0);
  const statusJampel = String(paket.status_jaminan_pelaksanaan || '');
  const alasanJampel = paket.alasan_bebas_jaminan || 'Pasal 33 ayat (2) huruf b dan ayat (3) Perpres PBJ (Nilai s.d. Rp 200 Juta / E-Purchasing)';

  const makeHeader = (label, docNo) => new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: (settings.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase() + ' | ' + label, size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ text: '  [ ' + docNo + ' ]', size: 15, font: 'Cambria', color: '1E3A8A', bold: true })
        ]
      })
    ]
  });

  const makeFooter = (label) => new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'SI-PRABU v3.0 Satker 657811 — ' + label + ' | Halaman ', size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Cambria', color: '1E3A8A', bold: true }),
          new TextRun({ text: ' dari ', size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Cambria', color: '1E3A8A', bold: true })
        ]
      })
    ]
  });

  const buildSingleSignPpk = (locDate) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText('Tembusan Disampaikan Kepada Yth.:', { bold: true, size: 18, color: '334155', before: 20, after: 10 }),
              pText('1. Kuasa Pengguna Anggaran (KPA) KPU Kabupaten Ngawi;', { size: 17, color: '475569', before: 0, after: 5 }),
              pText('2. Pejabat Pengadaan KPU Kabupaten Ngawi;', { size: 17, color: '475569', before: 0, after: 5 }),
              pText('3. Inspektur Wilayah II Inspektorat Utama KPU RI;', { size: 17, color: '475569', before: 0, after: 5 }),
              pText('4. Pertinggal / Arsip Dokumen Pengadaan.', { size: 17, color: '475569', before: 0, after: 10 })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText(locDate, { align: AlignmentType.CENTER, size: 20, before: 10, after: 10 }),
              pText('Pejabat Pembuat Komitmen (PPK)', { align: AlignmentType.CENTER, bold: true, size: 20, before: 0, after: 5 }),
              pText('Satuan Kerja KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 19, before: 0, after: 180 }),
              pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 21, color: '0F172A', before: 0, after: 5 }),
              pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 19, color: '334155', before: 0, after: 10 })
            ]
          })
        ]
      })
    ]
  });

  const pageProps = {
    size: { width: 11906, height: 16838 },
    margin: { top: 760, right: 820, bottom: 760, left: 820 }
  };

  // ===========================================================================
  // DOKUMEN 01: SURAT PENUNJUKAN PENYEDIA BARANG/JASA (SPPBJ)
  // ===========================================================================
  const section1 = {
    properties: {
      ...(isFirstStageInDoc ? {} : { type: SectionType.NEXT_PAGE }),
      page: pageProps
    },
    headers: { default: makeHeader('SURAT PENUNJUKAN PENYEDIA BARANG/JASA (SPPBJ)', noSppbj) },
    footers: { default: makeFooter('Dokumen 01: Naskah Sah SPPBJ PPK') },
    children: [
      ...buildKopSuratKpu(settings),

      // Header Surat Dinas
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 60, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: BORDER_NONE,
                    rows: [
                      new TableRow({ children: [
                        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Nomor', { size: 20, bold: true })] }),
                        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { size: 20 })] }),
                        new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(noSppbj, { size: 20, bold: true, color: '1E3A8A' })] })
                      ]}),
                      new TableRow({ children: [
                        new TableCell({ borders: BORDER_NONE, children: [pText('Sifat', { size: 20 })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText(':', { size: 20 })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText('Segera', { size: 20 })] })
                      ]}),
                      new TableRow({ children: [
                        new TableCell({ borders: BORDER_NONE, children: [pText('Lampiran', { size: 20 })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText(':', { size: 20 })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText('1 (satu) Berkas', { size: 20 })] })
                      ]}),
                      new TableRow({ children: [
                        new TableCell({ borders: BORDER_NONE, children: [pText('Perihal', { size: 20, bold: true })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText(':', { size: 20 })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText('Penunjukan Penyedia untuk Pelaksanaan ' + (paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi'), { size: 20, bold: true, color: '0F172A' })] })
                      ]})
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Ngawi, ' + tglTahap11Str, { align: AlignmentType.RIGHT, size: 20, before: 0, after: 10 }),
                  pText('Kepada Yth.:', { align: AlignmentType.LEFT, bold: true, size: 20, before: 20, after: 5 }),
                  pText('Direktur ' + namaPenyedia, { align: AlignmentType.LEFT, bold: true, size: 20, color: '15803D', before: 0, after: 5 }),
                  pText('(d.h. ' + direkturPenyedia + ')', { align: AlignmentType.LEFT, size: 19, color: '475569', before: 0, after: 5 }),
                  pText(alamatPenyedia, { align: AlignmentType.LEFT, size: 18, color: '64748B', before: 0, after: 5 }),
                  pText('di —', { align: AlignmentType.LEFT, size: 19, before: 0, after: 0 }),
                  pText('     N G A W I', { align: AlignmentType.LEFT, bold: true, size: 20, color: '0F172A', before: 0, after: 10 })
                ]
              })
            ]
          })
        ]
      }),

      pText('', { before: 20, after: 20 }),
      pText('Dengan hormat,', { size: 21, before: 10, after: 20 }),

      pText('Berdasarkan dokumen proses pengadaan barang/jasa pemerintah:', { size: 21, align: AlignmentType.JUSTIFIED, before: 10, after: 20 }),

      pListItem('1.', 'Berita Acara Hasil Pemilihan (BAHP/BAHP-EP)', `Pejabat Pengadaan Satker KPU Kabupaten Ngawi Nomor: ${noBahp} tanggal ${tglBahpStr}; dan`),
      pListItem('2.', 'Berita Acara Reviu Hasil Pemilihan Penyedia oleh PPK', `Nomor: ${noBaReviu} tanggal ${tglBaReviuStr} yang memutuskan hasil pemilihan penyedia disetujui penuh untuk diterbitkan Surat Penunjukan Penyedia Barang/Jasa (SPPBJ).`),

      pText('Dengan ini kami beritahukan bahwa proposal penawaran / kesepakatan harga Saudara pada paket pekerjaan:', { size: 21, align: AlignmentType.JUSTIFIED, before: 30, after: 20 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nama Paket Pekerjaan', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi', { bold: true, color: '1E3A8A', size: 20, before: 20, after: 20 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Kode RUP / Paket Internal', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`${paket.kode_rup || '54882910'} / ${paket.kode_paket_internal || 'PBJ-2026-001'}`, { size: 20, before: 20, after: 20 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Metode Pemilihan', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(`${metode} (Katalog Elektronik)`, { bold: true, color: '15803D', size: 20, before: 20, after: 20 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nilai Penunjukan (Sepakat Final)', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [
              pText(formatRupiah(sepakatKontrak) + ' (Termasuk PPN 11% & PPh 22 1,5%)', { bold: true, color: '1E3A8A', size: 21, before: 10, after: 10 }),
              pText('Terbilang: ' + terbilangRupiah(sepakatKontrak), { italic: true, color: '475569', size: 19, before: 0, after: 10 })
            ]})
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Sumber Dana & Akun Anggaran', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('APBN DIPA KPU Kabupaten Ngawi TA 2026 — MAK 532111 (Belanja Modal Peralatan dan Mesin)', { size: 19, before: 20, after: 20 })] })
          ]})
        ]
      }),

      pText('Sebagai Penyedia Barang/Jasa untuk melaksanakan pekerjaan tersebut di atas, dengan ketentuan dan kewajiban hukum sebagai berikut:', { size: 21, align: AlignmentType.JUSTIFIED, before: 40, after: 30 }),

      pListItem('1.', 'Kewajiban Penandatanganan Kontrak', 'Saudara diwajibkan untuk menandatangani Kontrak / Surat Pesanan paling lambat 14 (empat belas) hari kerja setelah diterbitkannya Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) ini. Kepastian hari, tanggal, dan mekanisme penandatanganan Kontrak akan disepakati bersama dalam Rapat Persiapan Penandatanganan Kontrak (PAM).'),
      pListItem('2.', 'Undangan Rapat Persiapan Penandatanganan Kontrak (PAM)', 'Guna mematangkan substansi draf kontrak, verifikasi rekening pembayaran bank rekanan, jadwal pengiriman, serta menetapkan jadwal definitif penandatanganan kontrak, Saudara diundang menghadiri Rapat Persiapan Penandatanganan Kontrak (Pre-Award Meeting / PAM) Tahap 12 yang jadwal pelaksanaannya dikoordinasikan lebih lanjut oleh PPK.'),
      pListItem('3.', 'Ketentuan Jaminan Pelaksanaan', wajibJampel && nilaiJampel > 0
        ? `Berdasarkan ketentuan Pasal 33 Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah jo. Peraturan Presiden Nomor 46 Tahun 2025, Saudara DIWAJIBKAN MENYERAHKAN JAMINAN PELAKSANAAN sebesar 5% (lima persen) dari ${statusJampel.includes('HPS') ? 'Nilai HPS' : 'Nilai Kontrak'} yaitu senilai ${formatRupiah(nilaiJampel)} (${terbilang(nilaiJampel)} rupiah) dalam bentuk Jaminan Bank atau Surety Bond yang diterbitkan oleh Bank Umum / Perusahaan Penjaminan / Asuransi yang berizin dan teregistrasi OJK sebelum penandatanganan Kontrak paling lambat 14 (empat belas) hari kerja sejak SPPBJ ini diterbitkan.`
        : `Berdasarkan ketentuan Pasal 33 ayat (2) huruf b dan ayat (3) Peraturan Presiden Nomor 16 Tahun 2018 tentang Pengadaan Barang/Jasa Pemerintah jo. Peraturan Presiden Nomor 46 Tahun 2025, paket pekerjaan ini TIDAK DIKENAKAN / DIBEBASKAN DARI KEWAJIBAN MENYERAHKAN JAMINAN PELAKSANAAN dikarenakan ${alasanJampel || ('nilai transaksi sebesar ' + formatRupiah(sepakatKontrak) + ' tidak melampaui nilai ambang batas Rp 200.000.000,00 (dua ratus juta rupiah) serta dilaksanakan melalui sistem E-Purchasing Katalog Elektronik')}.`
      ),
      pListItem('4.', 'Pernyataan Kesanggupan & Integritas Rekanan', 'Saudara diwajibkan menyerahkan Surat Pernyataan Kesanggupan dan Penerimaan Penunjukan bermeterai cukup Rp 10.000,- yang memuat jaminan 100% barang baru original bergaransi resmi pabrikan 1 tahun on-site service, bebas cacat mutu, serta komitmen bebas dari benturan kepentingan dan praktik gratifikasi.'),
      pListItem('5.', 'Sanksi Wanprestasi / Pengunduran Diri', 'Kegagalan Saudara untuk menerima penunjukan ini atau menandatangani Kontrak tanpa alasan yang dapat dipertanggungjawabkan secara hukum akan dikenakan sanksi berupa pengenaan Sanksi Daftar Hitam (Blacklist) Nasional selama 1 (satu) tahun sesuai ketentuan peraturan perundang-undangan.'),

      pText('Demikian Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) ini diterbitkan untuk dilaksanakan dengan penuh integritas dan tanggung jawab.', { size: 21, align: AlignmentType.JUSTIFIED, before: 40, after: 60 }),

      buildSingleSignPpk('Ngawi, ' + tglTahap11Str)
    ]
  };

  // ===========================================================================
  // DOKUMEN 02: SURAT PERNYATAAN KESANGGUPAN & PENERIMAAN PENUNJUKAN OLEH PENYEDIA
  // ===========================================================================
  const section2 = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: pageProps
    },
    headers: { default: makeHeader('SURAT PERNYATAAN KESANGGUPAN & PENERIMAAN SPPBJ', noSuratKesanggupan) },
    footers: { default: makeFooter('Dokumen 02: Pernyataan Kesanggupan Penyedia') },
    children: [
      pText('SURAT PERNYATAAN KESANGGUPAN DAN PENERIMAAN PENUNJUKAN PENYEDIA (SPPBJ)', { align: AlignmentType.CENTER, bold: true, size: 24, color: '1E3A8A', before: 40, after: 10 }),
      pText('NOMOR: ' + noSuratKesanggupan, { align: AlignmentType.CENTER, bold: true, size: 20, color: '0F172A', before: 0, after: 40 }),

      pText('Yang bertanda tangan di bawah ini:', { size: 21, before: 20, after: 20 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nama Penanggung Jawab', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(direkturPenyedia, { bold: true, color: '0F172A', size: 20, before: 20, after: 20 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Jabatan dalam Perusahaan', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(jabatanPenyedia + ' (Penanggung Jawab Sah Badan Usaha)', { size: 20, before: 20, after: 20 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Badan Usaha / Perusahaan', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(namaPenyedia, { bold: true, color: '15803D', size: 20, before: 20, after: 20 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nomor Induk Berusaha (NIB)', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(nibPenyedia + ' (OSS-RBA KBLI: 46511)', { size: 20, before: 20, after: 20 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Alamat Domisili Kantor', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(alamatPenyedia, { size: 19, before: 20, after: 20 })] })
          ]})
        ]
      }),

      pText('', { before: 20, after: 20 }),
      pText(`Sehubungan dengan telah diterbitkannya Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) Pejabat Pembuat Komitmen Satker KPU Kabupaten Ngawi Nomor: ${noSppbj} tanggal ${tglTahap11Str} untuk paket pekerjaan "${paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi'}", dengan ini kami menyatakan dengan sesungguhnya bahwa:`, { size: 21, align: AlignmentType.JUSTIFIED, before: 30, after: 30 }),

      pListItem('1.', 'Menerima Penunjukan Secara Penuh', `Kami MENERIMA DENGAN PENUH TANGGUNG JAWAB penunjukan sebagai Penyedia Barang/Jasa untuk melaksanakan pekerjaan tersebut dengan nilai kesepakatan final sebesar ${formatRupiah(sepakatKontrak)} (Termasuk PPN 11% dan PPh 22 1,5%).`),
      pListItem('2.', 'Kesiapan Penandatanganan Kontrak & PAM', 'Kami sanggup dan berkomitmen penuh untuk menghadiri Rapat Persiapan Penandatanganan Kontrak (PAM) serta menandatangani Kontrak / Surat Pesanan dalam jangka waktu paling lambat 14 (empat belas) hari kerja sejak diterbitkannya SPPBJ sesuai jadwal yang disepakati bersama PPK.'),
      pListItem('3.', 'Kepatuhan Spesifikasi Teknis & Garansi Resmi', 'Kami menjamin seluruh barang perangkat pengolah data dan PC Server yang kami serahkan 100% dalam kondisi BARU (Brand New In Box), ASLI / ORIGINAL, memenuhi standar Kerangka Acuan Kerja (KAK), serta didukung Sertifikat Garansi Resmi Pabrikan minimal 1 (satu) tahun on-site replacement.'),
      pListItem('4.', 'Integritas & Bebas Benturan Kepentingan', 'Kami menyatakan tidak memiliki hubungan afiliasi atau benturan kepentingan dengan PPK, Pokja/Pejabat Pengadaan, maupun pejabat struktural di lingkungan KPU Kabupaten Ngawi, serta berkomitmen menjunjung tinggi prinsip anti-korupsi, kolusi, dan nepotisme.'),
      pListItem('5.', 'Kesediaan Menerima Sanksi Hukum', 'Apabila di kemudian hari kami mengingkari pernyataan kesanggupan ini atau lalai melaksanakan penandatanganan kontrak, kami bersedia dikenakan sanksi pencantuman dalam Daftar Hitam (Blacklist) Nasional LKPP dan sanksi hukum perdata/pidana yang berlaku.'),

      pText('Demikian Surat Pernyataan Kesanggupan ini kami buat dengan sadar, sukarela, dan bermeterai cukup untuk dipergunakan sebagaimana mestinya.', { size: 21, align: AlignmentType.JUSTIFIED, before: 40, after: 60 }),

      // Tanda Tangan Penyedia
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [pText('', { size: 20 })]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Ngawi, ' + tglSuratKesanggupanStr, { align: AlignmentType.CENTER, size: 20, before: 10, after: 10 }),
                  pText('Penyedia Barang/Jasa,', { align: AlignmentType.CENTER, size: 20, before: 0, after: 5 }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, bold: true, size: 20, color: '15803D', before: 0, after: 180 }),
                  pText('[ Meterai Rp 10.000,- ]', { align: AlignmentType.CENTER, italic: true, size: 16, color: '64748B', before: 0, after: 180 }),
                  pText(direkturPenyedia, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 21, color: '0F172A', before: 0, after: 5 }),
                  pText(jabatanPenyedia, { align: AlignmentType.CENTER, size: 19, color: '334155', before: 0, after: 10 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  return [section1, section2];
}

// =============================================================================
// TAHAP 12: RAPAT PERSIAPAN PENANDATANGANAN KONTRAK (PRE-AWARD MEETING / PAM) & VERIFIKASI REKENING BANK REKANAN
// Sesuai Perpres 16/2018 jo. Perpres 12/2021 jo. Perpres 46/2025 Pasal 56,
// Lampiran Perlem LKPP 12/2021, Keputusan KPU 543/2022, serta Juknis Pembayaran LS KPPN
// =============================================================================
function buildStage12Sections(ctx, tahapRow, keu, isFirstStageInDoc) {
  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, bendahara, settings } = ctx;
  const metode = paket.metode_pemilihan || 'E-Purchasing';
  const tglTahap12Raw = tahapRow.tanggal_dokumen || paket.tgl_ba_pam || '2026-05-26';
  const tglTahap12Str = formatTanggalIndo(tglTahap12Raw);
  const hariTanggalTahap12 = formatHariTanggalBeritaAcara(tglTahap12Raw);

  const paguNominal = Number(paket.nilai_pagu || 145000000);
  const hpsNominal = Number(paket.nilai_hps || 140350000);
  const sepakatKontrak = Number(paket.nilai_kontrak || 138000000);

  const ppkNama = cleanNamaTanpaGelar((ppk && ppk.nama_lengkap) || 'MOHAMMAD NOOR JIHAN');
  const ppkNip = (ppk && ppk.nip) || '19910518 201503 1 002';

  const ppNama = cleanNamaTanpaGelar((pejabatPengadaan && pejabatPengadaan.nama_lengkap) || 'INDRAYU FATIKA MAHARDIKA');
  const ppNip = (pejabatPengadaan && pejabatPengadaan.nip) || '19931024 202012 2 014';

  const kpaNama = cleanNamaTanpaGelar((kpa && kpa.nama_lengkap) || 'BUDI RAHAYU');
  const kpaNip = (kpa && kpa.nip) || '19720412 199803 1 004';

  const bendaharaNama = cleanNamaTanpaGelar((bendahara && bendahara.nama_lengkap) || 'IMAS MAESAROH');
  const bendaharaNip = (bendahara && bendahara.nip) || '19820520 200801 2 015';

  const namaPenyedia = (penyedia && penyedia.nama_perusahaan) || 'CV. GRAFIKA PRATAMA NGAWI';
  const direkturPenyedia = cleanNamaTanpaGelar((penyedia && penyedia.nama_direktur) || 'HENDRA SURYAWAN');
  const jabatanPenyedia = (penyedia && penyedia.jabatan_penandatangan) || 'Direktur';
  const npwpPenyedia = (penyedia && penyedia.npwp) || '01.445.882.9-646.000';
  const nibPenyedia = (penyedia && penyedia.nib) || '9120301182451';
  const alamatPenyedia = (penyedia && penyedia.alamat) || 'Jl. Ronggowarsito No. 12, Kel. Pelem, Kec. Ngawi, Kab. Ngawi';

  // Naskah Resmi Tahap 12
  const noUndanganPam = paket.no_undangan_pam || ('012/UND-PAM/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PPK-PBJ/KPU-NGW/V/2026');
  const tglUndanganRaw = paket.tgl_undangan_pam || '2026-05-25';
  const tglUndanganStr = formatTanggalIndo(tglUndanganRaw);

  const noBaPam = tahapRow.nomor_dokumen || paket.no_ba_pam || ('012/BA-PAM/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PPK-PBJ/KPU-NGW/V/2026');
  const noVerifLfb = '012/VERIF-LFB/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PPK-PBJ/KPU-NGW/V/2026';
  const noNotulenPam = '012/NOTULEN-PAM/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PPK-PBJ/KPU-NGW/V/2026';

  const metodePam = String(paket.metode_pam || 'LURING').toUpperCase();
  const linkZoomPam = paket.link_zoom_pam || 'https://zoom.us/j/84291023841 (Meeting ID: 842 9102 3841, Passcode: KPU-NGW)';
  const tempatPam = paket.tempat_pam || (
    metodePam === 'DARING'
      ? 'Media Teleconference Virtual via Zoom Cloud Meetings'
      : (metodePam === 'HYBRID'
          ? 'Ruang Rapat PPK Kantor KPU Kabupaten Ngawi & Daring via Zoom Cloud Meetings'
          : 'Ruang Rapat PPK Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi')
  );
  const namaBankPenyedia = paket.nama_bank_penyedia || 'Bank Jatim Cabang Ngawi';
  const noRekeningPenyedia = paket.no_rekening_penyedia || '014-229-8711';
  const atasNamaRekening = paket.atas_nama_rekening_penyedia || 'CV. GRAFIKA PRATAMA';

  const legalitasAkta = paket.legalitas_akta_notaris || 'Akta Pendirian No. 14 tgl 12-04-2018 jo. Akta Perubahan No. 05 tgl 08-01-2024 Notaris Siti Farida, S.H., M.Kn., Ngawi (AHU-0019284.AH.01.01.Tahun 2018)';
  const legalitasNib = paket.legalitas_nib || '9120301182451 (KBLI 46511 - Perdagangan Besar Komputer dan Perlengkapan Komputer)';
  const legalitasFiskal = paket.legalitas_status_fiskal || 'Valid / Bebas Tunggakan Pajak (KSWP Valid & SKF KPP Pratama Ngawi No. SKF-10293/WPJ.12/KP.0803/2026)';
  const legalitasSpt = paket.legalitas_status_spt || 'SPT Tahunan PPh Badan Tahun 2025 Terlapor (BPS: 352101-2026-00384) & PPh Masa 3 Bulan Terakhir Nihil/Lunas';

  const tglTtdKontrakRaw = paket.kesepakatan_tgl_ttd_kontrak || '2026-05-27';
  const tglTtdKontrakStr = formatTanggalIndo(tglTtdKontrakRaw);
  const jadwalPelaksanaan = paket.kesepakatan_jadwal_pelaksanaan || '14 (empat belas) Hari Kalender (27 Mei 2026 s.d. 09 Juni 2026)';

  const noSppbj = paket.no_sppbj || ('011/SPPBJ/' + (paket.kode_paket_internal || 'PBJ-2026-001') + '/PPK-PBJ/KPU-NGW/V/2026');
  const tglSppbjStr = formatTanggalIndo(paket.tgl_sppbj || '2026-05-25');

  const makeHeader = (label, docNo) => new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: (settings.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase() + ' | ' + label, size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ text: '  [ ' + docNo + ' ]', size: 15, font: 'Cambria', color: '1E3A8A', bold: true })
        ]
      })
    ]
  });

  const makeFooter = (label) => new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: 'SI-PRABU v3.0 Satker 657811 — ' + label + ' | Halaman ', size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Cambria', color: '1E3A8A', bold: true }),
          new TextRun({ text: ' dari ', size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Cambria', color: '1E3A8A', bold: true })
        ]
      })
    ]
  });

  const buildSingleSignPpk = (locDate) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText('Tembusan Disampaikan Kepada Yth.:', { bold: true, size: 18, color: '334155', before: 20, after: 10 }),
              pText('1. Kuasa Pengguna Anggaran (KPA) KPU Kabupaten Ngawi;', { size: 17, color: '475569', before: 0, after: 5 }),
              pText('2. Pejabat Pengadaan KPU Kabupaten Ngawi;', { size: 17, color: '475569', before: 0, after: 5 }),
              pText('3. Bendahara Pengeluaran KPU Kabupaten Ngawi;', { size: 17, color: '475569', before: 0, after: 5 }),
              pText('4. Pertinggal / Arsip Dokumen Pengadaan.', { size: 17, color: '475569', before: 0, after: 10 })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText(locDate, { align: AlignmentType.CENTER, size: 20, before: 10, after: 10 }),
              pText('Pejabat Pembuat Komitmen (PPK)', { align: AlignmentType.CENTER, bold: true, size: 20, before: 0, after: 5 }),
              pText('Satuan Kerja KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 19, before: 0, after: 180 }),
              pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 21, color: '0F172A', before: 0, after: 5 }),
              pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 19, color: '334155', before: 0, after: 10 })
            ]
          })
        ]
      })
    ]
  });

  const buildDualSignPpkPenyedia = (locDate) => new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText('PIHAK KEDUA / PENYEDIA,', { align: AlignmentType.CENTER, size: 20, before: 10, after: 5 }),
              pText(namaPenyedia, { align: AlignmentType.CENTER, bold: true, size: 20, color: '15803D', before: 0, after: 180 }),
              pText(direkturPenyedia, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 21, color: '0F172A', before: 0, after: 5 }),
              pText(jabatanPenyedia, { align: AlignmentType.CENTER, size: 19, color: '334155', before: 0, after: 10 })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText(locDate, { align: AlignmentType.CENTER, size: 20, before: 10, after: 5 }),
              pText('PIHAK KESATU / PPK,', { align: AlignmentType.CENTER, size: 20, before: 0, after: 5 }),
              pText('Pejabat Pembuat Komitmen', { align: AlignmentType.CENTER, bold: true, size: 20, before: 0, after: 180 }),
              pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 21, color: '0F172A', before: 0, after: 5 }),
              pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 19, color: '334155', before: 0, after: 10 })
            ]
          })
        ]
      })
    ]
  });

  const pageProps = {
    size: { width: 11906, height: 16838 },
    margin: { top: 760, right: 820, bottom: 760, left: 820 }
  };

  // ===========================================================================
  // DOKUMEN 01: SURAT UNDANGAN RAPAT PERSIAPAN PENANDATANGANAN KONTRAK (PAM)
  // ===========================================================================
  const section1 = {
    properties: {
      ...(isFirstStageInDoc ? {} : { type: SectionType.NEXT_PAGE }),
      page: pageProps
    },
    headers: { default: makeHeader('SURAT UNDANGAN RAPAT PAM', noUndanganPam) },
    footers: { default: makeFooter('Dokumen 01: Undangan Rapat PAM PPK') },
    children: [
      ...buildKopSuratKpu(settings),

      // Header Surat Dinas
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 60, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: BORDER_NONE,
                    rows: [
                      new TableRow({ children: [
                        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Nomor', { size: 20, bold: true })] }),
                        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { size: 20 })] }),
                        new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(noUndanganPam, { size: 20, bold: true, color: '1E3A8A' })] })
                      ]}),
                      new TableRow({ children: [
                        new TableCell({ borders: BORDER_NONE, children: [pText('Sifat', { size: 20 })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText(':', { size: 20 })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText('Penting', { size: 20 })] })
                      ]}),
                      new TableRow({ children: [
                        new TableCell({ borders: BORDER_NONE, children: [pText('Lampiran', { size: 20 })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText(':', { size: 20 })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText('1 (satu) Berkas Draf Kontrak & Checklist', { size: 20 })] })
                      ]}),
                      new TableRow({ children: [
                        new TableCell({ borders: BORDER_NONE, children: [pText('Perihal', { size: 20, bold: true })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText(':', { size: 20 })] }),
                        new TableCell({ borders: BORDER_NONE, children: [pText('Undangan Rapat Persiapan Penandatanganan Kontrak (PAM) Paket ' + (paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi'), { size: 20, bold: true, color: '0F172A' })] })
                      ]})
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 40, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Ngawi, ' + tglUndanganStr, { align: AlignmentType.RIGHT, size: 20, before: 0, after: 10 }),
                  pText('Kepada Yth.:', { align: AlignmentType.LEFT, bold: true, size: 20, before: 20, after: 5 }),
                  pText('Direktur ' + namaPenyedia, { align: AlignmentType.LEFT, bold: true, size: 20, color: '15803D', before: 0, after: 5 }),
                  pText('(d.h. ' + direkturPenyedia + ')', { align: AlignmentType.LEFT, size: 19, color: '475569', before: 0, after: 5 }),
                  pText(alamatPenyedia, { align: AlignmentType.LEFT, size: 18, color: '64748B', before: 0, after: 5 }),
                  pText('di —', { align: AlignmentType.LEFT, size: 19, before: 0, after: 0 }),
                  pText('     N G A W I', { align: AlignmentType.LEFT, bold: true, size: 20, color: '0F172A', before: 0, after: 10 })
                ]
              })
            ]
          })
        ]
      }),

      pText('', { before: 20, after: 20 }),
      pText('Dengan hormat,', { size: 21, before: 10, after: 20 }),
      pText('Menindaklanjuti Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) Nomor: ' + noSppbj + ' tanggal ' + tglSppbjStr + ' serta Surat Pernyataan Kesanggupan dan Penerimaan Penunjukan Saudara, sesuai ketentuan Pasal 56 Peraturan Presiden Nomor 16 Tahun 2018 jo. Peraturan Presiden Nomor 46 Tahun 2025 dan Lampiran Peraturan LKPP Nomor 12 Tahun 2021, bersama ini Pejabat Pembuat Komitmen (PPK) Satker KPU Kabupaten Ngawi mengundang Saudara untuk menghadiri Rapat Persiapan Penandatanganan Kontrak (Pre-Award Meeting / PAM) yang akan diselenggarakan pada:', { size: 21, align: AlignmentType.JUSTIFIED, before: 10, after: 30 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Hari / Tanggal', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('Selasa, 26 Mei 2026', { bold: true, color: '1E3A8A', size: 20, before: 20, after: 20 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Waktu Pelaksanaan', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Pukul 09.30 WIB s.d. Selesai', { size: 20, before: 20, after: 20 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText(metodePam === 'DARING' ? 'Media Rapat' : (metodePam === 'HYBRID' ? 'Tempat & Media Rapat' : 'Tempat Rapat'), { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [
              pText(tempatPam, { bold: (metodePam === 'DARING' || metodePam === 'HYBRID'), color: (metodePam === 'DARING' ? '1E3A8A' : '0F172A'), size: 20, before: (metodePam === 'DARING' || metodePam === 'HYBRID' ? 10 : 20), after: (metodePam === 'DARING' || metodePam === 'HYBRID' ? 5 : 20) }),
              ...(metodePam === 'DARING' ? [pText('Tautan / Meeting ID & Passcode Zoom: ' + linkZoomPam, { size: 19, color: '2563EB', bold: true, before: 0, after: 10 })] : []),
              ...(metodePam === 'HYBRID' ? [pText('Tautan Daring (Zoom Cloud Meetings): ' + linkZoomPam, { size: 19, color: '2563EB', bold: true, before: 0, after: 10 })] : [])
            ] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Agenda Pembahasan', { bold: true, size: 20, before: 20, after: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [
              pText('1. Penyelarasan dan finalisasi klausul draf Kontrak (Surat Pesanan E-Purchasing Lumsum);', { size: 19, before: 5, after: 5 }),
              pText('2. Klarifikasi spesifikasi teknis (100% Brand New In Box) dan Sertifikat Garansi Resmi Pabrikan 1 Tahun;', { size: 19, before: 0, after: 5 }),
              pText('3. Uji tuntas legalitas badan usaha, akta notaris, dan izin berusaha (NIB OSS-RBA);', { size: 19, before: 0, after: 5 }),
              pText('4. Verifikasi kepatuhan fiskal/pajak (KSWP Valid, SKF Bebas Tunggakan, SPT Tahunan 2025, Pajak Masa);', { size: 19, before: 0, after: 5 }),
              pText('5. Verifikasi rekening bank rekanan untuk mitigasi risiko retur SP2D SPAN/SAKTI KPPN;', { size: 19, before: 0, after: 5 }),
              pText('6. Penetapan tanggal definitif penandatanganan kontrak dan jadwal pelaksanaan pekerjaan.', { size: 19, before: 0, after: 10 })
            ]})
          ]})
        ]
      }),

      metodePam === 'DARING'
        ? pText('Mengingat rapat diselenggarakan secara Daring (Teleconference) melalui aplikasi Zoom Cloud Meetings, Saudara (Direktur/Penanggung Jawab Sah) diwajibkan bergabung tepat waktu dengan mengaktifkan kamera video (on-camera) serta menyiapkan berkas fisik asli dan file pindaian (scan) berwarna sebagai berikut:', { size: 21, align: AlignmentType.JUSTIFIED, before: 30, after: 20 })
        : (metodePam === 'HYBRID'
            ? pText('Mengingat rapat diselenggarakan secara Hybrid (Tatap Muka & Daring Zoom), Saudara (Direktur/Penanggung Jawab Sah) atau perwakilan sah dapat hadir secara fisik di Kantor KPU atau bergabung melalui media teleconference Zoom dengan menyiapkan berkas kelengkapan asli dan salinan legalisir sebagai berikut:', { size: 21, align: AlignmentType.JUSTIFIED, before: 30, after: 20 })
            : pText('Mengingat pentingnya agenda rapat ini, Saudara (Direktur/Penanggung Jawab Sah) diwajibkan hadir secara langsung dengan membawa berkas kelengkapan fisik asli dan salinan legalisir sebagai berikut:', { size: 21, align: AlignmentType.JUSTIFIED, before: 30, after: 20 })),

      pListItem('1.', 'Legalitas Pendirian Badan Usaha', 'Asli dan Salinan Akta Pendirian Perusahaan No. 14 tgl 12 April 2018 jo. Akta Perubahan Terakhir No. 05 tgl 08 Januari 2024 Notaris Siti Farida, S.H., M.Kn., Ngawi beserta SK Pengesahan Kemenkumham RI;'),
      pListItem('2.', 'Perizinan Berusaha', 'Asli dan Salinan Nomor Induk Berusaha (NIB) berbasis risiko OSS-RBA Nomor: 9120301182451 dengan KBLI 46511 (Perdagangan Besar Komputer dan Perlengkapan Komputer);'),
      pListItem('3.', 'Kepatuhan Perpajakan / Fiskal', 'Asli dan Salinan NPWP Badan Usaha, Bukti Konfirmasi Status Wajib Pajak (KSWP Valid), Surat Keterangan Fiskal (SKF) bebas tunggakan dari KPP Pratama Ngawi, Bukti Penerimaan Surat (BPS) SPT Tahunan 2025, dan bukti lapor PPh/PPN Masa 3 bulan terakhir;'),
      pListItem('4.', 'Rekening Bank Pembayaran LS', 'Asli dan Salinan Buku Tabungan / Rekening Koran Bank Jatim Cabang Ngawi aktif atas nama CV. GRAFIKA PRATAMA (No. Rek: 014-229-8711) untuk verifikasi data supplier SAKTI Kemenkeu;'),
      pListItem('5.', 'Identitas Diri & Surat Kuasa', 'KTP Elektronik asli Penanggung Jawab / Direktur. Apabila diwakilkan karena alasan mendesak, wajib membawa Surat Kuasa Notaril bermeterai Rp 10.000,- yang memberi wewenang penuh;'),
      pListItem('6.', 'Stempel Basah Resmi Perusahaan', 'Membawa cap/stempel basah resmi CV. Grafika Pratama untuk pembubuhan paraf dan pengesahan Berita Acara PAM.'),

      pText('Demikian surat undangan ini kami sampaikan. Atas perhatian, kesiapan, dan kehadiran tepat waktu Saudara, kami ucapkan terima kasih.', { size: 21, align: AlignmentType.JUSTIFIED, before: 30, after: 50 }),

      buildSingleSignPpk('Ngawi, ' + tglUndanganStr)
    ]
  };

  // ===========================================================================
  // DOKUMEN 02: BERITA ACARA RAPAT PERSIAPAN PENANDATANGANAN KONTRAK (BA-PAM)
  // ===========================================================================
  const section2 = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: pageProps
    },
    headers: { default: makeHeader('BERITA ACARA RAPAT PERSIAPAN PENANDATANGANAN KONTRAK (PAM)', noBaPam) },
    footers: { default: makeFooter('Dokumen 02: Berita Acara Rapat PAM (BA-PAM)') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('BERITA ACARA RAPAT PERSIAPAN PENANDATANGANAN KONTRAK', { align: AlignmentType.CENTER, bold: true, size: 23, color: '1E3A8A', before: 20, after: 5 }),
      pText('(PRE-AWARD MEETING / PAM)', { align: AlignmentType.CENTER, bold: true, size: 21, color: '1E3A8A', before: 0, after: 10 }),
      pText('NOMOR: ' + noBaPam, { align: AlignmentType.CENTER, bold: true, size: 20, color: '0F172A', before: 0, after: 40 }),

      metodePam === 'DARING'
        ? pText('Pada hari ini ' + hariTanggalTahap12 + ', diselenggarakan secara Daring (Virtual Teleconference) melalui aplikasi Zoom Cloud Meetings berdasarkan ketentuan UU Nomor 11 Tahun 2008 jo. UU Nomor 1 Tahun 2024 tentang Informasi dan Transaksi Elektronik (ITE), kami yang bertanda tangan di bawah ini:', { size: 21, align: AlignmentType.JUSTIFIED, before: 10, after: 20 })
        : (metodePam === 'HYBRID'
            ? pText('Pada hari ini ' + hariTanggalTahap12 + ', bertempat di ' + tempatPam + ' serta terhubung secara Daring (Virtual Teleconference) melalui aplikasi Zoom Cloud Meetings berdasarkan ketentuan UU ITE, kami yang bertanda tangan di bawah ini:', { size: 21, align: AlignmentType.JUSTIFIED, before: 10, after: 20 })
            : pText('Pada hari ini ' + hariTanggalTahap12 + ', bertempat di ' + tempatPam + ', kami yang bertanda tangan di bawah ini:', { size: 21, align: AlignmentType.JUSTIFIED, before: 10, after: 20 })),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('1.', { bold: true, size: 20, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nama / NIP', { bold: true, size: 20 })] }),
            new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(ppkNama + ' / NIP. ' + ppkNip, { bold: true, size: 20, color: '0F172A' })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('', { size: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Jabatan Kedinasan', { bold: true, size: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Pejabat Pembuat Komitmen (PPK) Satuan Kerja KPU Kabupaten Ngawi, bertindak untuk dan atas nama Kuasa Pengguna Anggaran (KPA) KPU Kabupaten Ngawi, selanjutnya disebut sebagai PIHAK KESATU.', { size: 19 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('2.', { bold: true, size: 20, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nama Penanggung Jawab', { bold: true, size: 20 })] }),
            new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(direkturPenyedia, { bold: true, size: 20, color: '15803D' })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('', { size: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Jabatan & Badan Usaha', { bold: true, size: 20 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(jabatanPenyedia + ' ' + namaPenyedia + ', NPWP: ' + npwpPenyedia + ', NIB: ' + nibPenyedia + ', beralamat di ' + alamatPenyedia + ', selanjutnya disebut sebagai PIHAK KEDUA.', { size: 19 })] })
          ]})
        ]
      }),

      pText('', { before: 10, after: 10 }),
      pText('PIHAK KESATU dan PIHAK KEDUA secara bersama-sama telah melaksanakan Rapat Persiapan Penandatanganan Kontrak (Pre-Award Meeting / PAM) untuk paket pekerjaan "' + (paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi') + '" dengan hasil pembahasan dan kesepakatan 7 (tujuh) butir pokok sebagai berikut:', { size: 21, align: AlignmentType.JUSTIFIED, before: 20, after: 20 }),

      pListItem('1.', 'Bentuk & Rancangan Kontrak Pengadaan', 'Para Pihak telah memeriksa dan menyepakati secara mendalam draf Kontrak berupa Surat Pesanan E-Purchasing bentuk Lumsum dengan nilai total kesepakatan final sebesar ' + formatRupiah(sepakatKontrak) + ' (termasuk PPN 11% dan PPh 22 1,5%). Seluruh hak, kewajiban, dan sanksi denda 1 permil per hari keterlambatan dari nilai kontrak sebelum PPN telah dipahami dan disetujui tanpa keberatan.'),
      pListItem('2.', 'Penetapan Tanggal Definitif Penandatanganan Kontrak', 'Para Pihak bersepakat menetapkan bahwa penandatanganan Kontrak / Surat Pesanan definitif akan dilaksanakan pada hari Rabu, tanggal 27 Mei 2026 bertempat di Ruang Rapat PPK Kantor KPU Kabupaten Ngawi. Tanggal ini ditetapkan secara cermat pada hari kerja ke-2 setelah penerbitan SPPBJ (25 Mei 2026), sehingga memenuhi ketentuan Pasal 56 ayat (2) Perpres PBJ yang mensyaratkan penandatanganan paling lambat 14 (empat belas) hari kerja.'),
      pListItem('3.', 'Jadwal Pelaksanaan & Pengiriman Barang', 'Jangka waktu pelaksanaan pengadaan disepakati selama 14 (empat belas) hari kalender, terhitung sejak tanggal penandatanganan kontrak yaitu 27 Mei 2026 sampai dengan 09 Juni 2026. PIHAK KEDUA menjamin kesiapan seluruh stok barang dan armada distribusi tiba di Kantor KPU Kabupaten Ngawi paling lambat tanggal 08 Juni 2026 untuk pemeriksaan fisik dan uji fungsi.'),
      pListItem('4.', 'Spesifikasi Mutu & Garansi Resmi Pabrikan', 'PIHAK KEDUA menegaskan kembali jaminan bahwa 100% unit perangkat PC Server, Laptop, dan perlengkapan komputer yang diserahkan adalah kondisi BARU (Brand New In Box / BNIB), ASLI (Original Pabrikan), bebas cacat mutu tersembunyi, dan dilengkapi Sertifikat Garansi Resmi Pabrikan minimal 1 (satu) tahun penuh dengan layanan perbaikan di tempat (on-site service replacement).'),
      pListItem('5.', 'Ketentuan Jaminan Pelaksanaan', 'Berdasarkan Pasal 33 ayat (2) huruf b dan ayat (3) Peraturan Presiden Nomor 16 Tahun 2018 jo. Perpres Nomor 46 Tahun 2025, paket pengadaan ini secara yuridis DIBEBASKAN DARI KEWAJIBAN JAMINAN PELAKSANAAN dikarenakan nilai kontrak sebesar Rp 138.000.000,- tidak melebihi ambang batas Rp 200.000.000,- dan dilaksanakan melalui metode E-Purchasing Katalog Elektronik.'),
      pListItem('6.', 'Hasil Uji Tuntas Legalitas Badan Usaha & Kepatuhan Pajak', 'PIHAK KESATU telah melakukan pemeriksaan fisik dokumen asli dan konfirmasi sistem terhadap akta notaris pendirian/perubahan, NIB OSS-RBA, NPWP, status KSWP (Valid), Surat Keterangan Fiskal (SKF Bebas Tunggakan), dan SPT Tahunan PPh Badan 2025. Seluruh dokumen dinyatakan sah, absah, tertib fiskal, dan memenuhi syarat kualifikasi (dituangkan rinci pada Dokumen 03 Lembar Uji Tuntas).'),
      pListItem('7.', 'Verifikasi Rekening Bank Rekanan untuk SP2D KPPN', 'Telah dilakukan verifikasi silang terhadap rekening operasional PIHAK KEDUA pada Bank Jatim Cabang Ngawi Nomor Rekening: 014-229-8711 atas nama CV. GRAFIKA PRATAMA. Data rekening dinyatakan valid, aktif, dan cocok 100% huruf demi huruf dengan data NPWP serta data Supplier SAKTI/SPAN Kemenkeu sehingga dijamin bebas risiko retur SP2D pada saat pencairan dana APBN SPM-LS.'),

      pText('Demikian Berita Acara Rapat Persiapan Penandatanganan Kontrak (PAM) ini dibuat dan ditandatangani oleh Para Pihak dalam rangkap 2 (dua) bermeterai cukup yang masing-masing mempunyai kekuatan hukum yang sama untuk dipergunakan sebagaimana mestinya.', { size: 21, align: AlignmentType.JUSTIFIED, before: 30, after: 50 }),

      buildDualSignPpkPenyedia('Ngawi, ' + tglTahap12Str)
    ]
  };

  // ===========================================================================
  // DOKUMEN 03: LEMBAR UJI TUNTAS LEGALITAS, PAJAK/FISKAL & REKENING BANK REKANAN
  // ===========================================================================
  const section3 = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: pageProps
    },
    headers: { default: makeHeader('LEMBAR UJI TUNTAS LEGALITAS, PAJAK & BANK REKANAN', noVerifLfb) },
    footers: { default: makeFooter('Dokumen 03: Lembar Uji Tuntas Legalitas, Fiskal & Bank') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('LEMBAR HASIL UJI TUNTAS LEGALITAS BADAN USAHA, KEPATUHAN FISKAL (PAJAK), DAN VERIFIKASI REKENING BANK REKANAN', { align: AlignmentType.CENTER, bold: true, size: 22, color: '1E3A8A', before: 20, after: 5 }),
      pText('(DUE DILIGENCE CHECKLIST & BANK ACCOUNT VERIFICATION)', { align: AlignmentType.CENTER, bold: true, size: 19, color: '1E3A8A', before: 0, after: 10 }),
      pText('NOMOR: ' + noVerifLfb, { align: AlignmentType.CENTER, bold: true, size: 20, color: '0F172A', before: 0, after: 30 }),

      pText('Berdasarkan Peraturan Presiden Nomor 16 Tahun 2018 jo. Peraturan Presiden Nomor 46 Tahun 2025 serta petunjuk teknis pengelolaan perbendaharaan negara tentang penerbitan SP2D KPPN, pada hari ini Selasa tanggal 26 Mei 2026, Pejabat Pembuat Komitmen (PPK) didampingi Bendahara Pengeluaran Satker KPU Kabupaten Ngawi telah melaksanakan pemeriksaan uji tuntas (due diligence) terhadap dokumen fisik asli dan catatan elektronik rekanan pelaksana:', { size: 20, align: AlignmentType.JUSTIFIED, before: 10, after: 20 }),

      // Identitas Singkat Paket & Rekanan
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nama Paket Pengadaan', { bold: true, size: 19, before: 10, after: 10 })] }),
            new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi', { bold: true, color: '1E3A8A', size: 19, before: 10, after: 10 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nama Badan Usaha / Rekanan', { bold: true, size: 19, before: 10, after: 10 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(namaPenyedia + ' (Direktur: ' + direkturPenyedia + ')', { bold: true, color: '15803D', size: 19, before: 10, after: 10 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('NPWP & NIB Rekanan', { bold: true, size: 19, before: 10, after: 10 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('NPWP: ' + npwpPenyedia + ' | NIB: ' + nibPenyedia, { size: 19, before: 10, after: 10 })] })
          ]})
        ]
      }),

      pText('', { before: 10, after: 10 }),
      pText('A. MATRIKS UJI TUNTAS LEGALITAS BADAN USAHA & PERIZINAN BERUSAHA', { bold: true, size: 20, color: '1E3A8A', before: 20, after: 10 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('No', { bold: true, color: 'FFFFFF', size: 19, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Parameter Dokumen', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Rincian Data / Nomor Dokumen', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Hasil Pemeriksaan Fisik Asli', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Status', { bold: true, color: 'FFFFFF', size: 19, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('1', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Akta Notaris Pendirian', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('No. 14 tgl 12-04-2018 Notaris Siti Farida, S.H., M.Kn., Ngawi (AHU-0019284.AH.01.01.Tahun 2018)', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Asli diperlihatkan, legalitas sah, tidak dalam sengketa', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('VALID / SAH', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('2', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Akta Notaris Perubahan Terakhir', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('No. 05 tgl 08-01-2024 Notaris Siti Farida, S.H., M.Kn., Ngawi (AHU-0001092.AH.01.02.Tahun 2024)', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Asli diperlihatkan, susunan pengurus sesuai data profil', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('VALID / SAH', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('3', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Kewenangan Penanggung Jawab', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Hendra Suryawan (Direktur / Pemilik Modal 100%, NIK: 3521011504820003)', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('KTP-el asli diperiksa, cocok dengan nama di akta notaris', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('VALID / SAH', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('4', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Perizinan Berusaha (NIB OSS)', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('NIB: 9120301182451 via Lembaga OSS-RBA BKPM / Kementerian Investasi', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('KBLI 46511 (Perdagangan Komputer) aktif & terverifikasi', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('SESUAI', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('5', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Integritas / Bebas Benturan', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Surat Pernyataan Bebas Benturan Kepentingan tanggal 26 Mei 2026', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Bebas afiliasi dengan PPK, Pokja, dan Pejabat KPU Ngawi', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('MEMENUHI', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]})
        ]
      }),

      pText('', { before: 10, after: 10 }),
      pText('B. MATRIKS UJI TUNTAS KEPATUHAN PERPAJAKAN / FISKAL', { bold: true, size: 20, color: '1E3A8A', before: 20, after: 10 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('No', { bold: true, color: 'FFFFFF', size: 19, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Parameter Perpajakan', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Nomor Dokumen / Identitas Bukti', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Hasil Verifikasi Sistem DJP', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Status', { bold: true, color: 'FFFFFF', size: 19, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('1', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('NPWP Badan Usaha', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('01.445.882.9-646.000 a.n. CV. GRAFIKA PRATAMA', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Terdaftar aktif pada Kantor Pelayanan Pajak (KPP) Pratama Ngawi', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('AKTIF', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('2', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Status KSWP', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Konfirmasi Status Wajib Pajak (KSWP) DJP Online / Portal Kemenkeu', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Status: VALID (Memenuhi syarat kewajiban formal perpajakan)', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('VALID', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('3', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Surat Keterangan Fiskal (SKF)', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('No. SKF-10293/WPJ.12/KP.0803/2026 tgl 18 Mei 2026', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Diterbitkan KPP Pratama Ngawi: Bebas dari Tunggakan Pajak', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('BEBAS TUNGGAKAN', { bold: true, color: '15803D', size: 16, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('4', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('SPT Tahunan PPh Badan 2025', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Bukti Penerimaan Surat (BPS) No: 352101-2026-00384 tgl 25 April 2026', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Telah lapor tepat waktu via e-Filing DJP Online', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('TERLAPOR', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('5', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Laporan Pajak Masa Terakhir', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('PPh Pasal 21, PPh Pasal 23, dan PPN Masa 3 Bulan (Jan, Feb, Mar 2026)', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Bukti setor (BPN) dan bukti lapor masa nihil/lunas lengkap', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('TERTIB', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]})
        ]
      }),

      pText('', { before: 10, after: 10 }),
      pText('C. MATRIKS VERIFIKASI REKENING BANK REKANAN (MITIGASI RETUR SP2D KPPN)', { bold: true, size: 20, color: '1E3A8A', before: 20, after: 10 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('No', { bold: true, color: 'FFFFFF', size: 19, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Parameter Rekening Bank', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Data Fisik Buku Tabungan / Bank', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Hasil Konfirmasi SAKTI / SPAN', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Status', { bold: true, color: 'FFFFFF', size: 19, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('1', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Nama Bank Operasional', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(namaBankPenyedia, { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Kode Bank BI / SPAN: 114 (Bank BPD Jatim)', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('VALID', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('2', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Nomor Rekening', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(noRekeningPenyedia, { bold: true, color: '1E3A8A', size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Rekening aktif, tidak terblokir, mutasi lancar per Mei 2026', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('AKTIF', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('3', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Nama Pemilik Rekening', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(atasNamaRekening, { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Persis sama huruf demi huruf dengan NPWP & Akta, bebas singkatan', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('COCOK 100%', { bold: true, color: '15803D', size: 16, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('4', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Domisili Kantor Cabang Bank', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Jl. Ahmad Yani No. 15, Ngawi, Jawa Timur', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Satu wilayah bayar dengan KPPN Ngawi / Madiun', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('SESUAI', { bold: true, color: '15803D', size: 17, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('5', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Verifikasi Data Supplier SAKTI', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Pengecekan Supplier Tipe 3 (Penyedia) pada Aplikasi SAKTI Kemenkeu', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Tervalidasi SPAN Kemenkeu, dijamin bebas dari potensi Retur SP2D', { size: 17 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('BEBAS RETUR', { bold: true, color: '15803D', size: 16, align: AlignmentType.CENTER })] })
          ]})
        ]
      }),

      pText('', { before: 10, after: 10 }),
      // Box Kesimpulan
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({
              borders: BORDER_TABLE,
              shading: { fill: 'F0FDF4', type: ShadingType.CLEAR },
              children: [
                pText('KESIMPULAN UJI TUNTAS & REKOMENDASI PPK:', { bold: true, size: 20, color: '15803D', before: 10, after: 5 }),
                pText('Berdasarkan hasil pemeriksaan uji tuntas fisik dan verifikasi sistem di atas, Badan Usaha ' + namaPenyedia + ' dinyatakan MEMENUHI PERSYARATAN (MS) secara yuridis, kepatuhan fiskal, dan administrasi keuangan. Rekening bank yang didaftarkan dinyatakan SAH, VALID, dan SIAP digunakan untuk pembayaran prestasi kerja melalui mekanisme Surat Perintah Pencairan Dana (SP2D-LS) KPPN. Dengan demikian, proses pengadaan DIREKOMENDASIKAN LANJUT KE PENANDATANGANAN KONTRAK DEFINITIF TAHAP 13.', { size: 19, align: AlignmentType.JUSTIFIED, before: 0, after: 10 })
              ]
            })
          ]})
        ]
      }),

      pText('Demikian Lembar Uji Tuntas dan Verifikasi ini dibuat dengan sebenarnya untuk menjadi bagian tak terpisahkan dari Berkas Administrasi Pengadaan Barang/Jasa.', { size: 20, align: AlignmentType.JUSTIFIED, before: 20, after: 40 }),

      // Dual Sign Pemeriksa Satker & Rekanan
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Penyedia Barang/Jasa,', { align: AlignmentType.CENTER, size: 19, before: 0, after: 5 }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, bold: true, size: 19, color: '15803D', before: 0, after: 180 }),
                  pText(direkturPenyedia, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 5 }),
                  pText(jabatanPenyedia, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 10 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Ngawi, ' + tglTahap12Str, { align: AlignmentType.CENTER, size: 19, before: 0, after: 5 }),
                  pText('Pejabat Pembuat Komitmen (PPK)', { align: AlignmentType.CENTER, bold: true, size: 19, before: 0, after: 180 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 5 }),
                  pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 10 })
                ]
              })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnSpan: 2,
                borders: BORDER_NONE,
                children: [
                  pText('Mengetahui / Memverifikasi SAKTI:', { align: AlignmentType.CENTER, size: 18, color: '475569', before: 30, after: 5 }),
                  pText('Bendahara Pengeluaran KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, bold: true, size: 19, before: 0, after: 160 }),
                  pText(bendaharaNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 5 }),
                  pText('NIP. ' + bendaharaNip, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 10 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  // ===========================================================================
  // DOKUMEN 04: DAFTAR HADIR & NOTULEN KESEPAKATAN RAPAT PAM
  // ===========================================================================
  const section4 = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: pageProps
    },
    headers: { default: makeHeader('DAFTAR HADIR & NOTULEN RAPAT PAM', noNotulenPam) },
    footers: { default: makeFooter('Dokumen 04: Daftar Hadir & Notulen PAM') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('DAFTAR HADIR DAN NOTULEN KESEPAKATAN', { align: AlignmentType.CENTER, bold: true, size: 22, color: '1E3A8A', before: 20, after: 5 }),
      pText('RAPAT PERSIAPAN PENANDATANGANAN KONTRAK (PRE-AWARD MEETING / PAM)', { align: AlignmentType.CENTER, bold: true, size: 20, color: '1E3A8A', before: 0, after: 10 }),
      pText('NOMOR: ' + noNotulenPam, { align: AlignmentType.CENTER, bold: true, size: 20, color: '0F172A', before: 0, after: 30 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Hari / Tanggal', { bold: true, size: 19, before: 10, after: 10 })] }),
            new TableCell({ width: { size: 75, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('Selasa, 26 Mei 2026', { bold: true, size: 19, before: 10, after: 10 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Waktu Pertemuan', { bold: true, size: 19, before: 10, after: 10 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Pukul 09.30 WIB s.d. 11.45 WIB', { size: 19, before: 10, after: 10 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText(metodePam === 'DARING' ? 'Media Rapat' : (metodePam === 'HYBRID' ? 'Tempat & Media Rapat' : 'Tempat Rapat'), { bold: true, size: 19, before: 10, after: 10 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(metodePam === 'DARING' ? 'Virtual Teleconference via Zoom Cloud Meetings (' + linkZoomPam + ')' : tempatPam, { size: 19, before: 10, after: 10 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Pimpinan Rapat', { bold: true, size: 19, before: 10, after: 10 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(ppkNama + ' (Pejabat Pembuat Komitmen / PPK)', { bold: true, color: '1E3A8A', size: 19, before: 10, after: 10 })] })
          ]})
        ]
      }),

      pText('', { before: 10, after: 10 }),
      pText('A. DAFTAR HADIR PESERTA RAPAT PAM', { bold: true, size: 20, color: '1E3A8A', before: 20, after: 10 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({ cantSplit: true, children: [
            new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('No', { bold: true, color: 'FFFFFF', size: 19, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Nama Lengkap', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 34, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Jabatan / Kedudukan', { bold: true, color: 'FFFFFF', size: 19 })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('Tanda Tangan Kehadiran', { bold: true, color: 'FFFFFF', size: 19, align: AlignmentType.CENTER })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('1', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(ppkNama, { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Pejabat Pembuat Komitmen (PPK)', { size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('1. .................................', { size: 17, before: 10, after: 10 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('2', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(direkturPenyedia, { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Direktur ' + namaPenyedia + (metodePam === 'DARING' ? ' (Hadir Daring via Zoom)' : (metodePam === 'HYBRID' ? ' (Hadir Daring/Luring)' : '')), { size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(metodePam === 'DARING' ? '2. Hadir Daring (On-Camera Zoom)' : '2. .................................', { size: 17, align: AlignmentType.RIGHT, before: 10, after: 10 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('3', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(ppNama, { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Pejabat Pengadaan KPU Kab. Ngawi', { size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('3. .................................', { size: 17, before: 10, after: 10 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('4', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText(bendaharaNama, { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Bendahara Pengeluaran (Verifikator Bank)', { size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('4. .................................', { size: 17, align: AlignmentType.RIGHT, before: 10, after: 10 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('5', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Endah Ratnasari', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Staf Pelaksana PPK / Notulis', { size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('5. .................................', { size: 17, before: 10, after: 10 })] })
          ]}),
          new TableRow({ cantSplit: true, children: [
            new TableCell({ borders: BORDER_TABLE, children: [pText('6', { size: 18, align: AlignmentType.CENTER })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Slamet Santoso', { bold: true, size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('Staf Operasional CV. Grafika Pratama', { size: 18 })] }),
            new TableCell({ borders: BORDER_TABLE, children: [pText('6. .................................', { size: 17, align: AlignmentType.RIGHT, before: 10, after: 10 })] })
          ]})
        ]
      }),

      pText('', { before: 10, after: 10 }),
      pText('B. NOTULEN KESEPAKATAN RAPAT PAM', { bold: true, size: 20, color: '1E3A8A', before: 20, after: 10 }),

      pListItem('1.', 'Pembukaan Rapat', metodePam === 'DARING'
        ? 'Rapat dibuka pada pukul 09.30 WIB oleh PPK Satker KPU Kabupaten Ngawi melalui media teleconference Zoom Cloud Meetings. PPK menyampaikan apresiasi atas kehadiran tepat waktu Penyedia secara daring on-camera. PPK menjelaskan fungsi PAM sebagai instrumen pengendalian risiko kontrak hulu sebelum penandatanganan perjanjian berkekuatan hukum, dengan rekaman video rapat tersimpan pada Cloud Drive Satker sebagai bukti eviden audit.'
        : (metodePam === 'HYBRID'
            ? 'Rapat dibuka pada pukul 09.30 WIB oleh PPK Satker KPU Kabupaten Ngawi secara Hybrid (Tatap Muka di Ruang Rapat PPK & Daring via Zoom Cloud Meetings). PPK menjelaskan fungsi PAM sebagai instrumen pengendalian risiko kontrak hulu sebelum penandatanganan perjanjian berkekuatan hukum.'
            : 'Rapat dibuka pada pukul 09.30 WIB oleh PPK Satker KPU Kabupaten Ngawi yang menyampaikan ucapan terima kasih atas kehadiran tepat waktu Penyedia. PPK menjelaskan fungsi PAM sebagai instrumen pengendalian risiko kontrak hulu sebelum penandatanganan perjanjian berkekuatan hukum.')),
      pListItem('2.', 'Penelaahan Draf Kontrak & Nilai Pekerjaan', 'Dilakukan pembacaan klausul rancangan Surat Pesanan E-Purchasing Lumsum senilai Rp 138.000.000,-. Penyedia menyatakan menerima penuh seluruh klausul kontrak, termasuk ketentuan pembayaran SPM-LS 100% setelah BAST diterbitkan dan denda keterlambatan 1 permil per hari dari nilai kontrak sebelum PPN.'),
      pListItem('3.', 'Pemeriksaan Uji Tuntas Fisik Legalitas & Pajak', 'Direktur CV. Grafika Pratama memperlihatkan berkas asli Akta Notaris, SK Kemenkumham, NIB OSS-RBA, NPWP, bukti KSWP Valid, SKF Bebas Tunggakan dari KPP Pratama Ngawi, dan BPS SPT Tahunan 2025. Hasil pemeriksaan oleh PPK dan Pejabat Pengadaan menyatakan seluruh dokumen absah dan memenuhi syarat kualifikasi.'),
      pListItem('4.', 'Verifikasi Validitas Rekening Bank Penampung', 'Bendahara Pengeluaran melakukan konfirmasi rekening Bank Jatim Cabang Ngawi No: 014-229-8711 a.n. CV. GRAFIKA PRATAMA. Nama pemilik rekening dipastikan identik 100% dengan NPWP dan Akta Notaris. Bendahara memastikan pendaftaran Supplier Tipe 3 pada Aplikasi SAKTI bebas potensi retur SP2D.'),
      pListItem('5.', 'Kesepakatan Tanggal TTD Kontrak & Jadwal Kerja', 'Para Pihak secara bulat menyepakati bahwa penandatanganan Kontrak definitif dilaksanakan pada hari Rabu, 27 Mei 2026 pukul 10.00 WIB di Kantor KPU Kabupaten Ngawi. Jangka waktu pelaksanaan ditetapkan 14 hari kalender (27 Mei - 09 Juni 2026), dengan target serah terima fisik barang pada 08 Juni 2026.'),
      pListItem('6.', 'Penutupan Rapat', 'Rapat ditutup secara resmi pada pukul 11.45 WIB dengan pembacaan ringkasan kesepakatan serta penandatanganan Berita Acara PAM.'),

      pText('Demikian Notulen Rapat Persiapan Penandatanganan Kontrak (PAM) ini dibuat dengan sebenarnya untuk menjadi pedoman pelaksanaan pengadaan bagi Para Pihak.', { size: 20, align: AlignmentType.JUSTIFIED, before: 20, after: 40 }),

      // TTD Notulis & PPK
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Notulis Rapat PAM,', { align: AlignmentType.CENTER, size: 19, before: 0, after: 180 }),
                  pText('Endah Ratnasari', { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 5 }),
                  pText('Staf Pelaksana PPK Satker KPU Kab. Ngawi', { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 10 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Mengetahui / Menyetujui:', { align: AlignmentType.CENTER, size: 19, before: 0, after: 5 }),
                  pText('Pejabat Pembuat Komitmen (PPK)', { align: AlignmentType.CENTER, bold: true, size: 19, before: 0, after: 180 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 5 }),
                  pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 10 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  return [section1, section2, section3, section4];
}


// =============================================================================
// TAHAP 13: PENANDATANGANAN KONTRAK / SURAT PESANAN FINAL (E-PURCHASING)
// Membangun 5 Dokumen Resmi Sah:
// 1. Dokumen 01: Surat Pesanan (E-Purchasing E-Katalog LKPP)
// 2. Dokumen 02: Syarat-Syarat Khusus Kontrak (SSKK - 25 Poin Huruf A s.d. Y)
// 3. Dokumen 03: Syarat-Syarat Umum Kontrak (SSUK - 67 Klausul Baku LKPP)
// 4. Dokumen 04: Daftar Kuantitas, Kualitas & Spesifikasi Teknis Final (BoQ Definitif)
// 5. Dokumen 05: Lembar Resume Kontrak & Perekaman Komitmen SAKTI Kemenkeu
// Disertai Klausul e-Meterai Resmi Peruri (Rp 10.000) & Rekening SAKTI Bebas Retur
// =============================================================================
function buildStage13Sections(ctx, tahapRow, keu, isFirstStageInDoc) {
  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, bendahara, settings } = ctx;
  const metode = paket.metode_pemilihan || 'E-Purchasing';
  const bentukKontrak = paket.bentuk_kontrak || 'Surat Pesanan';
  const tglTahap13Raw = tahapRow.tanggal_dokumen || paket.tgl_kontrak || '2026-05-27';
  const tglTahap13Str = formatTanggalIndo(tglTahap13Raw);
  const hariTanggalTahap13 = formatHariTanggalBeritaAcara(tglTahap13Raw);

  const paguNominal = Number(paket.nilai_pagu || 145000000);
  const hpsNominal = Number(paket.nilai_hps || 140350000);
  const sepakatKontrak = Number(paket.nilai_kontrak || 138000000);

  const ppkNama = cleanNamaTanpaGelar((ppk && ppk.nama_lengkap) || 'MOHAMMAD NOOR JIHAN');
  const ppkNip = (ppk && ppk.nip) || '19840101 200912 1 001';
  const ppkAlamat = (settings && settings.alamat_satker) || 'Jl. Untung Suropati No. 48 Ngawi';

  const namaPenyedia = (penyedia && penyedia.nama_perusahaan) || 'CV. GRAFIKA PRATAMA';
  const direkturPenyedia = cleanNamaTanpaGelar((penyedia && penyedia.nama_direktur) || 'BUDI SANTOSO');
  const jabatanPenyedia = (penyedia && penyedia.jabatan_penandatangan) || 'Direktur';
  const npwpPenyedia = (penyedia && penyedia.npwp) || '01.445.882.9-646.000';
  const nibPenyedia = (penyedia && penyedia.nib) || '9120301182451';
  const alamatPenyedia = (penyedia && penyedia.alamat) || 'Jl. Ronggowarsito No. 12, Kel. Pelem, Kec. Ngawi, Kab. Ngawi';
  const bankPenyedia = paket.nama_bank_penyedia || (penyedia && penyedia.nama_bank) || 'Bank Jatim Cabang Ngawi';
  const rekPenyedia = paket.no_rekening_penyedia || (penyedia && penyedia.no_rekening) || '014-229-8711';
  const anRekPenyedia = paket.atas_nama_rekening_penyedia || namaPenyedia;

  // Nomor Dokumen Sah Tahap 13
  const kodePaket = String(paket.kode_paket_internal || 'PBJ-2026-001').replace(/^CAKRA-/i, 'PBJ-');
  const noSp = paket.no_kontrak || tahapRow.nomor_dokumen || ('013/SP/' + kodePaket + '/PPK-PBJ/KPU-NGW/V/2026');
  const noSskk = '013/SSKK/' + kodePaket + '/PPK-PBJ/KPU-NGW/V/2026';
  const noSsuk = '013/SSUK/' + kodePaket + '/PPK-PBJ/KPU-NGW/V/2026';
  const noBoq = '013/BOQ-SPEK/' + kodePaket + '/PPK-PBJ/KPU-NGW/V/2026';
  const noResumeSakti = '013/RESUME-SAKTI/' + kodePaket + '/PPK-PBJ/KPU-NGW/V/2026';

  // Konsiderans Rujukan dari Tahap 11 & 12
  const noSppbj = paket.no_sppbj || ('011/SPPBJ/' + kodePaket + '/PPK-PBJ/KPU-NGW/V/2026');
  const tglSppbjStr = formatTanggalIndo(paket.tgl_sppbj || '2026-05-25');
  const noBaPam = paket.no_ba_pam || ('012/BA-PAM/' + kodePaket + '/PPK-PBJ/KPU-NGW/V/2026');
  const tglBaPamStr = formatTanggalIndo(paket.tgl_ba_pam || '2026-05-26');

  // Waktu & Tempat Pelaksanaan
  const tglMulaiRaw = paket.tgl_mulai_kerja || '2026-05-27';
  const tglSelesaiRaw = paket.tgl_selesai_kontrak || '2026-06-09';
  const masaHari = paket.masa_pelaksanaan_hari || 14;
  const tglMulaiStr = formatTanggalIndo(tglMulaiRaw);
  const tglSelesaiStr = formatTanggalIndo(tglSelesaiRaw);
  const tempatTtd = paket.tempat_ttd_kontrak || 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi';
  const caraBayar = paket.cara_pembayaran || 'Sekaligus 100% (melalui SPM-LS KPPN setelah Serah Terima Hasil Pekerjaan BASTP)';

    const makeHeader = (title, docNo = noSp) => new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({
            text: `SI-PRABU v3.0 — ${title} | ${docNo}`,
            italic: true,
            size: 15,
            color: '64748B'
          })
        ]
      })
    ]
  });

  const makeFooter = (label) => new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 30, after: 0 },
        children: [
          new TextRun({
            text: `KPU Kabupaten Ngawi — ${label}`,
            size: 15,
            color: '64748B'
          })
        ]
      })
    ]
  });

  // Parameter Layout Dokumen
  const pageProps = {
    size: { width: 11906, height: 16838 }, // A4 Portrait
    margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
  };

  // ===========================================================================
  // DOKUMEN 01: SURAT PESANAN (E-PURCHASING) DEFINITIF
  // ===========================================================================
  const section1 = {
    properties: {
      ...(isFirstStageInDoc ? {} : { type: SectionType.NEXT_PAGE }),
      page: pageProps
    },
    headers: { default: makeHeader('SURAT PESANAN (E-PURCHASING)', noSp) },
    footers: { default: makeFooter('Dokumen 01: Surat Pesanan E-Purchasing Definitif') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('SURAT PESANAN (E-PURCHASING)', { align: AlignmentType.CENTER, bold: true, size: 24, color: '1E3A8A', before: 20, after: 4 }),
      pText('NOMOR: ' + noSp, { align: AlignmentType.CENTER, bold: true, size: 20, color: '0F172A', before: 0, after: 15 }),
      pText('Paket: ' + (paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional KPU Kabupaten Ngawi'), { align: AlignmentType.CENTER, italic: true, size: 18, color: '475569', before: 0, after: 20 }),

      pText('Pada hari ini, ' + hariTanggalTahap13 + ', bertempat di ' + tempatTtd + ', kami yang bertanda tangan di bawah ini:', { size: 19, align: AlignmentType.JUSTIFIED, before: 10, after: 10 }),

      // Komparisi Pihak Kesatu & Kedua
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('1.', { bold: true, size: 19, align: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('PIHAK KESATU (PPK)', { bold: true, size: 19 })] }),
              new TableCell({ width: { size: 69, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [
                pText('Nama: ' + ppkNama, { bold: true, size: 19, color: '0F172A' }),
                pText('NIP: ' + ppkNip, { size: 18, color: '334155' }),
                pText('Jabatan: Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi', { size: 18, color: '334155' }),
                pText('Alamat Kantor: ' + ppkAlamat, { size: 18, color: '334155' }),
                pText('Bertindak untuk dan atas nama Satuan Kerja Komisi Pemilihan Umum Kabupaten Ngawi (Kode Satker: 657811).', { italic: true, size: 18, color: '1E3A8A', before: 5 })
              ]})
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('2.', { bold: true, size: 19, align: AlignmentType.CENTER })] }),
              new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('PIHAK KEDUA (PENYEDIA)', { bold: true, size: 19 })] }),
              new TableCell({ width: { size: 69, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [
                pText('Nama Perusahaan: ' + namaPenyedia, { bold: true, size: 19, color: '0F172A' }),
                pText('Nama Direktur: ' + direkturPenyedia + ' (' + jabatanPenyedia + ')', { bold: true, size: 18, color: '334155' }),
                pText('NPWP: ' + npwpPenyedia + '  |  NIB: ' + nibPenyedia, { size: 18, color: '334155' }),
                pText('Alamat Badan Usaha: ' + alamatPenyedia, { size: 18, color: '334155' }),
                pText('Rekening Pembayaran: ' + bankPenyedia + ' No. Rek ' + rekPenyedia + ' a.n. ' + anRekPenyedia, { bold: true, size: 18, color: '15803D' }),
                pText('Bertindak untuk dan atas nama ' + namaPenyedia + '.', { italic: true, size: 18, color: '1E3A8A', before: 5 })
              ]})
            ]
          })
        ]
      }),

      pText('Kedua belah pihak sepakat untuk mengikatkan diri dalam Surat Pesanan (E-Purchasing) dengan ketentuan dan syarat-syarat sebagai berikut:', { size: 19, align: AlignmentType.JUSTIFIED, before: 15, after: 10 }),

      // Klausul Pokok Surat Pesanan
      pListItem('1.', 'Dasar Penunjukan & Rujukan:', 'Surat Pesanan ini diterbitkan berdasarkan Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) Nomor ' + noSppbj + ' tanggal ' + tglSppbjStr + ' dan Berita Acara Rapat Persiapan Penandatanganan Kontrak (BA-PAM) Nomor ' + noBaPam + ' tanggal ' + tglBaPamStr + '.'),
      pListItem('2.', 'Lingkup Pemesanan Barang:', 'PIHAK KESATU memesan kepada PIHAK KEDUA dan PIHAK KEDUA menyatakan sanggup untuk menyediakan, mengirimkan, menguji, serta menyerahkan barang paket "' + (paket.nama_paket || '') + '" sesuai daftar kuantitas, spesifikasi teknis, dan standar kualitas yang terlampir.'),
      pListItem('3.', 'Nilai Surat Pesanan (Kontrak):', 'Total nilai Surat Pesanan yang disepakati adalah sebesar ' + formatRupiah(sepakatKontrak) + ' (' + terbilangRupiah(sepakatKontrak) + '), sudah termasuk Pajak Pertambahan Nilai (PPN 11%), biaya pengemasan, asuransi perjalanan, dan ongkos kirim franco lokasi Kantor KPU Kabupaten Ngawi.'),
      pListItem('4.', 'Jangka Waktu Pelaksanaan:', 'Jangka waktu penyelesaian pesanan ditetapkan selama ' + masaHari + ' (empat belas) hari kalender, terhitung mulai tanggal ' + tglMulaiStr + ' sampai dengan ' + tglSelesaiStr + '.'),
      pListItem('5.', 'Tempat & Syarat Penyerahan:', 'Barang diserahkan dalam keadaan 100% baru, lengkap, bergaransi resmi, dan berfungsi optimal di Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi (Franco Lokasi Satker).'),
      pListItem('6.', 'Cara Pembayaran:', 'Pembayaran dilakukan secara Sekaligus 100% (seratus persen) melalui mekanisme Pembayaran Langsung (SPM/SP2D-LS KPPN) yang ditransfer langsung ke Rekening PIHAK KEDUA pada ' + bankPenyedia + ' Nomor Rekening: ' + rekPenyedia + ' atas nama ' + anRekPenyedia + ' setelah seluruh barang diserahterimakan dengan Berita Acara Serah Terima Hasil Pekerjaan (BASTP).'),
      pListItem('7.', 'Sanksi & Denda Keterlambatan:', 'Apabila terjadi keterlambatan penyelesaian pekerjaan yang diakibatkan oleh kelalaian PIHAK KEDUA, maka dikenakan denda keterlambatan sebesar 1/1000 (satu permil) per hari keterlambatan dari nilai Surat Pesanan sebelum PPN untuk setiap hari kalender keterlambatan, maksimal sebesar jaminan atau pemutusan sepihak.'),
      pListItem('8.', 'Hierarki & Lampiran Kontrak:', 'Surat Pesanan ini memuat dokumen lampiran yang merupakan satu kesatuan tak terpisahkan: Lampiran I (SSKK), Lampiran II (SSUK), Lampiran III (Daftar Kuantitas & Spesifikasi Teknis), dan Lampiran IV (Resume Komitmen SAKTI Kemenkeu).'),
      pListItem('9.', 'Keabsahan Bea Meterai & Tanda Tangan:', 'Surat Pesanan ini ditandatangani oleh kedua belah pihak dengan dibubuhi e-Meterai Resmi Peruri (Rp 10.000) sesuai Undang-Undang Nomor 10 Tahun 2020 tentang Bea Meterai dan sah mengikat secara hukum sejak tanggal ditandatanganinya.'),

      pText('Demikian Surat Pesanan ini dibuat dan ditandatangani oleh Para Pihak dalam rangkap 2 (dua) asli bermeterai cukup yang masing-masing mempunyai kekuatan hukum yang sama.', { size: 19, align: AlignmentType.JUSTIFIED, before: 15, after: 25 }),

      // Kolom Tanda Tangan dengan Slot e-Meterai Peruri
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
                  pText('Untuk dan atas nama Penyedia:', { align: AlignmentType.CENTER, size: 19, before: 0, after: 4 }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, bold: true, size: 20, color: '1E3A8A', before: 0, after: 15 }),

                  // Kotak e-Meterai Peruri
                  new Table({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    borders: BORDER_TABLE,
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            borders: BORDER_TABLE,
                            shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
                            children: [
                              pText('e-METERAI RESMI PERURI', { align: AlignmentType.CENTER, bold: true, size: 15, color: '1D4ED8', before: 8, after: 2 }),
                              pText('Rp 10.000,-', { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 2 }),
                              pText('SN: PERURI-2026-SPBJ-' + kodePaket, { align: AlignmentType.CENTER, italic: true, size: 13, color: '475569', before: 0, after: 8 })
                            ]
                          })
                        ]
                      })
                    ]
                  }),

                  pText(direkturPenyedia, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 20, after: 4 }),
                  pText(jabatanPenyedia, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Untuk dan atas nama Satuan Kerja:', { align: AlignmentType.CENTER, size: 19, before: 0, after: 4 }),
                  pText('Pejabat Pembuat Komitmen (PPK)', { align: AlignmentType.CENTER, bold: true, size: 20, color: '1E3A8A', before: 0, after: 120 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 4 }),
                  pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  // ===========================================================================
  // DOKUMEN 02: SYARAT-SYARAT KHUSUS KONTRAK (SSKK) — LAMPIRAN I (SEJAJAR TAHAP 7)
  // ===========================================================================
  const BORDER_SSUK_ROW = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: 'E2E8F0' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  };

  const sskk25RowsData = buildSskk25Rows(ctx, {
    isDraftStage7: false,
    formatRupiah,
    terbilangRupiah,
    formatTanggalIndo
  });

  const sskkTableRows = sskk25RowsData.map(([klausulLabel, isiKetentuan]) => {
    const lines = String(isiKetentuan || '').split('\n');
    const rightParas = lines.map((ln, idx) => pText(ln, {
      size: 14,
      before: 2,
      after: idx === lines.length - 1 ? 6 : 2
    }));

    return new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          borders: BORDER_SSUK_ROW,
          width: { size: 28, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              spacing: { before: 40, after: 40, line: 250 },
              indent: { left: 320, hanging: 320 },
              children: [
                new TextRun({
                  text: klausulLabel,
                  bold: true,
                  size: 14.5,
                  font: 'Cambria',
                  color: '2E5496'
                })
              ]
            })
          ]
        }),
        new TableCell({
          borders: BORDER_SSUK_ROW,
          width: { size: 72, type: WidthType.PERCENTAGE },
          children: rightParas
        })
      ]
    });
  });

  const section2 = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: pageProps
    },
    headers: { default: makeHeader('LAMPIRAN I: SYARAT-SYARAT KHUSUS KONTRAK (SSKK)', noSskk) },
    footers: { default: makeFooter('Dokumen 02: Syarat-Syarat Khusus Kontrak (SSKK)') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('LAMPIRAN I SURAT PESANAN', { align: AlignmentType.CENTER, bold: true, size: 20, color: '1E3A8A', before: 16, after: 4 }),
      pText('BAB II. SYARAT-SYARAT KHUSUS KONTRAK (SSKK)', { align: AlignmentType.CENTER, bold: true, size: 22, color: '0F172A', before: 0, after: 4 }),
      pText('NOMOR: ' + noSskk, { align: AlignmentType.CENTER, bold: true, size: 16.5, color: '475569', before: 0, after: 12 }),

      pText('Syarat-Syarat Khusus Kontrak (SSKK) ini merupakan bagian mutlak yang melengkapi, menjelaskan, dan/atau mengubah ketentuan pada pasal-pasal dalam BAB I. Syarat-Syarat Umum Kontrak (SSUK) untuk pelaksanaan Paket Pekerjaan "' + (paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional') + '". Apabila terdapat perbedaan pengaturan antara SSUK dan SSKK ini, maka ketentuan dalam SSKK ini yang berlaku dan mengikat Para Pihak:', { size: 14.5, align: AlignmentType.JUSTIFIED, before: 0, after: 10 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: sskkTableRows
      }),

      pText('Demikian Dokumen BAB II. Syarat-Syarat Khusus Kontrak (SSKK) (Klausul Huruf A s.d. Huruf Y) ini disepakati dan ditandatangani secara sah oleh Pejabat Pembuat Komitmen (PPK) Satuan Kerja KPU Kabupaten Ngawi dan Direktur Rekanan Penyedia sebagai satu kesatuan yang tidak terpisahkan dari Surat Pesanan.', { size: 14.5, align: AlignmentType.JUSTIFIED, before: 14, after: 18, keepNext: true }),

      // Tanda Tangan Bilateral SSKK
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KEDUA (PENYEDIA)', { align: AlignmentType.CENTER, bold: true, size: 15, before: 0, after: 2, keepNext: true }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, size: 15, color: '1E3A8A', before: 0, after: 140, keepNext: true }),
                  pText('( ' + direkturPenyedia + ' )', { align: AlignmentType.CENTER, bold: true, underline: {}, size: 15, color: '0F172A', before: 0, after: 2, keepNext: true }),
                  pText(jabatanPenyedia, { align: AlignmentType.CENTER, size: 14, color: '64748B', before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KESATU (PPK)', { align: AlignmentType.CENTER, bold: true, size: 15, before: 0, after: 2, keepNext: true }),
                  pText('Pejabat Pembuat Komitmen KPU Ngawi', { align: AlignmentType.CENTER, size: 15, color: '1E3A8A', before: 0, after: 140, keepNext: true }),
                  pText('( ' + ppkNama + ' )', { align: AlignmentType.CENTER, bold: true, underline: {}, size: 15, color: '0F172A', before: 0, after: 2, keepNext: true }),
                  pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 14, color: '64748B', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  // ===========================================================================
  // DOKUMEN 03: SYARAT-SYARAT UMUM KONTRAK (SSUK) — LAMPIRAN II (67 KLAUSUL LENGKAP IDENTIK TAHAP 7)
  // ===========================================================================
  const ssukTableRows = [];
  SSUK_67_ROWS.forEach((row) => {
    if (row.section) {
      ssukTableRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              borders: BORDER_NONE,
              columnSpan: 2,
              shading: { fill: 'EFF6FF', type: ShadingType.CLEAR },
              children: [
                pText(row.section, {
                  bold: true,
                  size: 16,
                  color: '1E3A8A',
                  before: 10,
                  after: 6,
                  keepNext: true
                })
              ]
            })
          ]
        })
      );
      return;
    }

    if (row.subsection) {
      ssukTableRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              borders: BORDER_NONE,
              columnSpan: 2,
              children: [
                pText(row.subsection, {
                  bold: true,
                  size: 15,
                  color: '2E5496',
                  before: 8,
                  after: 4,
                  keepNext: true
                })
              ]
            })
          ]
        })
      );
      return;
    }

    const rightCellChildren = [];
    (row.items || []).forEach(([subNo, subText], idx) => {
      const lines = String(subText || '').split('\n');
      lines.forEach((lineStr, lineIdx) => {
        const isLast = idx === row.items.length - 1 && lineIdx === lines.length - 1;
        if (lineIdx === 0 && subNo) {
          rightCellChildren.push(
            pNumbered(subNo, lineStr, {
              level: 1,
              hanging: 420,
              left: 420,
              size: 14,
              before: 2,
              after: isLast ? 6 : 2
            })
          );
        } else {
          rightCellChildren.push(
            pText(lineStr, {
              size: 14,
              indent: subNo ? { left: 420 } : undefined,
              before: 1,
              after: isLast ? 6 : 2
            })
          );
        }
      });
    });

    ssukTableRows.push(
      new TableRow({
        cantSplit: false,
        children: [
          new TableCell({
            borders: BORDER_SSUK_ROW,
            width: { size: 28, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                spacing: { before: 40, after: 40, line: 250 },
                indent: { left: 320, hanging: 320 },
                children: [
                  new TextRun({
                    text: `${row.no}\t${row.title}`,
                    bold: true,
                    size: 14.5,
                    font: 'Cambria',
                    color: '2E5496'
                  })
                ]
              })
            ]
          }),
          new TableCell({
            borders: BORDER_SSUK_ROW,
            width: { size: 72, type: WidthType.PERCENTAGE },
            children: rightCellChildren.length ? rightCellChildren : [pText('-', { size: 14 })]
          })
        ]
      })
    );
  });

  const section3 = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: pageProps
    },
    headers: { default: makeHeader('LAMPIRAN II: SYARAT-SYARAT UMUM KONTRAK (SSUK)', noSsuk) },
    footers: { default: makeFooter('Dokumen 03: Syarat-Syarat Umum Kontrak (SSUK)') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('LAMPIRAN II SURAT PESANAN', { align: AlignmentType.CENTER, bold: true, size: 20, color: '1E3A8A', before: 16, after: 4 }),
      pText('BAB I. SYARAT-SYARAT UMUM KONTRAK (SSUK)', { align: AlignmentType.CENTER, bold: true, size: 22, color: '0F172A', before: 0, after: 4 }),
      pText('NOMOR: ' + noSsuk, { align: AlignmentType.CENTER, bold: true, size: 16.5, color: '475569', before: 0, after: 12 }),

      pText('STANDAR KETENTUAN UMUM PERIKATAN PENGADAAN BARANG/JASA KPU KABUPATEN NGAWI (67 KLAUSUL BAKU LKPP)', {
        size: 13.5, align: AlignmentType.CENTER, color: '1E3A8A', bold: true, before: 0, after: 10
      }),
      pText('Syarat-Syarat Umum Kontrak (SSUK) ini memuat ketentuan hukum normatif standar Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah (LKPP) dan Peraturan Presiden tentang Pengadaan Barang/Jasa Pemerintah yang berlaku mengikat secara sah bagi Para Pihak dalam pelaksanaan Surat Pesanan ini:', { size: 14.5, align: AlignmentType.JUSTIFIED, before: 0, after: 12 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: ssukTableRows
      }),

      pText('Demikian Dokumen BAB I. Syarat-Syarat Umum Kontrak (SSUK) yang terdiri atas 67 (enam puluh tujuh) Klausul ini disahkan dan ditandatangani secara bilateral oleh Pejabat Pembuat Komitmen (PPK) dan Direktur Rekanan Penyedia sebagai bagian yang tidak terpisahkan dari Naskah Surat Pesanan.', { size: 14.5, align: AlignmentType.JUSTIFIED, before: 14, after: 18, keepNext: true }),

      // Tanda Tangan Bilateral SSUK
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KEDUA (PENYEDIA)', { align: AlignmentType.CENTER, bold: true, size: 15, before: 0, after: 2, keepNext: true }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, size: 15, color: '1E3A8A', before: 0, after: 140, keepNext: true }),
                  pText('( ' + direkturPenyedia + ' )', { align: AlignmentType.CENTER, bold: true, underline: {}, size: 15, color: '0F172A', before: 0, after: 2, keepNext: true }),
                  pText(jabatanPenyedia, { align: AlignmentType.CENTER, size: 14, color: '64748B', before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KESATU (PPK)', { align: AlignmentType.CENTER, bold: true, size: 15, before: 0, after: 2, keepNext: true }),
                  pText('Pejabat Pembuat Komitmen KPU Ngawi', { align: AlignmentType.CENTER, size: 15, color: '1E3A8A', before: 0, after: 140, keepNext: true }),
                  pText('( ' + ppkNama + ' )', { align: AlignmentType.CENTER, bold: true, underline: {}, size: 15, color: '0F172A', before: 0, after: 2, keepNext: true }),
                  pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 14, color: '64748B', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  // ===========================================================================
  // DOKUMEN 04: DAFTAR KUANTITAS, KUALITAS & SPESIFIKASI FINAL (BOQ) — LAMPIRAN III
  // ===========================================================================
  const displayItems = (items && items.length > 0) ? items : [
    {
      uraian_item: 'Server Operasional Rackmount 2U',
      spesifikasi_teknis: 'Intel Xeon Silver 4410Y (12C/24T), 64GB DDR5 ECC Reg, 2x 960GB SSD Enterprise NVMe (RAID 1 OS), 4x 2.4TB SAS 10K (RAID 5 Data), Dual 10GbE SFP+, Dual Redundant PSU 800W Titanium, Windows Server 2025 Standard 16-Core Legal.',
      volume: 1,
      satuan: 'Unit',
      harga_satuan_kontrak: 92000000,
      jumlah_kontrak: 92000000
    },
    {
      uraian_item: 'PC Desktop Operator Pengolah Data',
      spesifikasi_teknis: 'Intel Core i7-14700 vPro, 32GB DDR5 5600MHz, 1TB NVMe PCIe 4.0 SSD, Monitor 23.8 inch IPS FHD, Keyboard & Mouse USB, Windows 11 Pro 64-bit Original OEM, Garansi Resmi 3 Tahun Onsite.',
      volume: 2,
      satuan: 'Unit',
      harga_satuan_kontrak: 23000000,
      jumlah_kontrak: 46000000
    }
  ];

  let totalItemKontrak = 0;
  const boqTableRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('NO', { bold: true, size: 17, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('NAMA BARANG', { bold: true, size: 17, color: 'FFFFFF' })] }),
        new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('SPESIFIKASI TEKNIS & KUALITAS', { bold: true, size: 17, color: 'FFFFFF' })] }),
        new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('VOL', { bold: true, size: 17, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('SAT', { bold: true, size: 17, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('HARGA SAT (RP)', { bold: true, size: 17, color: 'FFFFFF', align: AlignmentType.RIGHT })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('TOTAL (RP)', { bold: true, size: 17, color: 'FFFFFF', align: AlignmentType.RIGHT })] })
      ]
    })
  ];

  displayItems.forEach((it, idx) => {
    const vol = Number(it.volume || 1);
    const hSat = Number(it.harga_satuan_kontrak || it.harga_satuan_hps || 0);
    const jTot = Number(it.jumlah_kontrak || it.jumlah_hps || (vol * hSat));
    totalItemKontrak += jTot;

    const isEven = idx % 2 === 0;
    boqTableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: isEven ? 'F8FAFC' : 'FFFFFF', type: ShadingType.CLEAR }, children: [pText(String(idx + 1), { size: 16.5, align: AlignmentType.CENTER })] }),
          new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: isEven ? 'F8FAFC' : 'FFFFFF', type: ShadingType.CLEAR }, children: [pText(it.uraian_item || '', { bold: true, size: 16.5, color: '0F172A' })] }),
          new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: isEven ? 'F8FAFC' : 'FFFFFF', type: ShadingType.CLEAR }, children: [pText(it.spesifikasi_teknis || '-', { size: 16, color: '334155' })] }),
          new TableCell({ width: { size: 7, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: isEven ? 'F8FAFC' : 'FFFFFF', type: ShadingType.CLEAR }, children: [pText(String(vol), { size: 16.5, align: AlignmentType.CENTER })] }),
          new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: isEven ? 'F8FAFC' : 'FFFFFF', type: ShadingType.CLEAR }, children: [pText(it.satuan || 'Unit', { size: 16.5, align: AlignmentType.CENTER })] }),
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: isEven ? 'F8FAFC' : 'FFFFFF', type: ShadingType.CLEAR }, children: [pText(formatRupiah(hSat).replace('Rp ', ''), { size: 16.5, align: AlignmentType.RIGHT })] }),
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: isEven ? 'F8FAFC' : 'FFFFFF', type: ShadingType.CLEAR }, children: [pText(formatRupiah(jTot).replace('Rp ', ''), { bold: true, size: 16.5, align: AlignmentType.RIGHT, color: '1E3A8A' })] })
        ]
      })
    );
  });

  // Jika sepakatKontrak berbeda dengan total sum items, prioritaskan sepakatKontrak resmi
  const totalKontrakFinal = sepakatKontrak > 0 ? sepakatKontrak : totalItemKontrak;
  const dppKontrak = Math.round(totalKontrakFinal / 1.11);
  const ppnKontrak = totalKontrakFinal - dppKontrak;

  boqTableRows.push(
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ width: { size: 80, type: WidthType.PERCENTAGE }, columnSpan: 5, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('TOTAL HARGA SEBELUM PPN (DPP)', { bold: true, size: 17, align: AlignmentType.RIGHT })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, columnSpan: 2, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText(formatRupiah(dppKontrak), { bold: true, size: 17, align: AlignmentType.RIGHT, color: '0F172A' })] })
      ]
    }),
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ width: { size: 80, type: WidthType.PERCENTAGE }, columnSpan: 5, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('PAJAK PERTAMBAHAN NILAI (PPN 11%)', { bold: true, size: 17, align: AlignmentType.RIGHT })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, columnSpan: 2, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText(formatRupiah(ppnKontrak), { bold: true, size: 17, align: AlignmentType.RIGHT, color: '15803D' })] })
      ]
    }),
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ width: { size: 80, type: WidthType.PERCENTAGE }, columnSpan: 5, borders: BORDER_TABLE, shading: { fill: 'EFF6FF', type: ShadingType.CLEAR }, children: [pText('TOTAL NILAI SURAT PESANAN (TERMASUK PPN 11% & ONGKOS KIRIM FRANCO)', { bold: true, size: 18, align: AlignmentType.RIGHT, color: '1E3A8A' })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, columnSpan: 2, borders: BORDER_TABLE, shading: { fill: 'EFF6FF', type: ShadingType.CLEAR }, children: [pText(formatRupiah(totalKontrakFinal), { bold: true, size: 19, align: AlignmentType.RIGHT, color: '1E3A8A' })] })
      ]
    }),
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnSpan: 7,
          borders: BORDER_TABLE,
          shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
          children: [
            pText('Terbilang: # ' + terbilangRupiah(totalKontrakFinal) + ' #', {
              align: AlignmentType.CENTER,
              bold: true,
              italic: true,
              size: 17,
              color: '92400E',
              before: 4,
              after: 4
            })
          ]
        })
      ]
    })
  );

  const section4 = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: pageProps
    },
    headers: { default: makeHeader('LAMPIRAN III: DAFTAR KUANTITAS & SPESIFIKASI FINAL', noBoq) },
    footers: { default: makeFooter('Dokumen 04: Daftar Kuantitas & Spesifikasi Teknis Final') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('LAMPIRAN III SURAT PESANAN', { align: AlignmentType.CENTER, bold: true, size: 21, color: '1E3A8A', before: 20, after: 2 }),
      pText('DAFTAR KUANTITAS, KUALITAS DAN SPESIFIKASI TEKNIS FINAL', { align: AlignmentType.CENTER, bold: true, size: 23, color: '0F172A', before: 0, after: 4 }),
      pText('NOMOR: ' + noBoq, { align: AlignmentType.CENTER, bold: true, size: 18, color: '475569', before: 0, after: 15 }),

      pText('Daftar kuantitas, rincian harga hasil negosiasi pengadaan e-purchasing, serta standar spesifikasi teknis dan kualitas barang yang disepakati secara mengikat antara Pejabat Pembuat Komitmen (PPK) dan Penyedia adalah sebagai berikut:', { size: 18, align: AlignmentType.JUSTIFIED, before: 0, after: 14 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: boqTableRows
      }),

      pText('Pernyataan Komitmen Kualitas & Keaslian Barang:', { bold: true, size: 18, color: '1E3A8A', before: 18, after: 6 }),
      pListItem('a.', 'Keaslian & Kondisi 100% Baru:', 'PIHAK KEDUA menjamin bahwa seluruh barang yang diserahkan adalah 100% baru (Brand New in Box), asli original pabrikan resmi, bukan barang rekondisi/tiruan, dan memenuhi standar spesifikasi teknis.'),
      pListItem('b.', 'Garansi Resmi:', 'Barang dilindungi garansi resmi pabrikan/distributor Indonesia selama minimal 1 (satu) tahun kalender dengan layanan purna jual on-site service di Kantor KPU Kabupaten Ngawi.'),
      pListItem('c.', 'Kelengkapan Aksesoris & Lisensi:', 'Disertai buku petunjuk manual berbahasa Indonesia/Inggris, kabel daya standar SNI, kartu garansi, dan lisensi Sistem Operasi asli teraktivasi.'),

      pText('Demikian Daftar Kuantitas, Kualitas, dan Spesifikasi Teknis Final ini disepakati sebagai lampiran sah Surat Pesanan.', { size: 18.5, align: AlignmentType.JUSTIFIED, before: 15, after: 20 }),

      // Tanda Tangan Para Pihak BoQ
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
                  pText('PIHAK KEDUA (PENYEDIA)', { align: AlignmentType.CENTER, bold: true, size: 19, before: 0, after: 2 }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, size: 18, color: '1E3A8A', before: 0, after: 120 }),
                  pText(direkturPenyedia, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 4 }),
                  pText(jabatanPenyedia, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KESATU (PPK)', { align: AlignmentType.CENTER, bold: true, size: 19, before: 0, after: 2 }),
                  pText('Pejabat Pembuat Komitmen', { align: AlignmentType.CENTER, size: 18, color: '1E3A8A', before: 0, after: 120 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 4 }),
                  pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  // ===========================================================================
  // DOKUMEN 05: LEMBAR RESUME KONTRAK & KOMITMEN SAKTI KEMENKEU — LAMPIRAN IV
  // ===========================================================================
  const bendaharaNama = cleanNamaTanpaGelar((bendahara && bendahara.nama_lengkap) || 'IMAS MAESAROH');
  const bendaharaNip = (bendahara && bendahara.nip) || '19820520 200801 2 015';

  const saktiTableRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('ELEMEN DATA SAKTI / SPAN', { bold: true, size: 18, color: 'FFFFFF' })] }),
        new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('INFORMASI TEREKAM PADA MODUL KOMITMEN', { bold: true, size: 18, color: 'FFFFFF' })] })
      ]
    }),
    new TableRow({ cantSplit: true, children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Kode Satuan Kerja (Satker)', { bold: true, size: 18 })] }),
      new TableCell({ borders: BORDER_TABLE, children: [pText('657811 — KOMISI PEMILIHAN UMUM KABUPATEN NGAWI', { bold: true, size: 18, color: '1E3A8A' })] })
    ]}),
    new TableRow({ cantSplit: true, children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('KPPN Pembina Penyalur Dana', { bold: true, size: 18 })] }),
      new TableCell({ borders: BORDER_TABLE, children: [pText('KPPN Madiun (Tipe A1)', { size: 18, color: '334155' })] })
    ]}),
    new TableRow({ cantSplit: true, children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nomor Surat Pesanan / Kontrak', { bold: true, size: 18 })] }),
      new TableCell({ borders: BORDER_TABLE, children: [pText(noSp, { bold: true, size: 18, color: '1E3A8A' })] })
    ]}),
    new TableRow({ cantSplit: true, children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Tanggal Surat Pesanan', { bold: true, size: 18 })] }),
      new TableCell({ borders: BORDER_TABLE, children: [pText(tglTahap13Str, { size: 18, color: '334155' })] })
    ]}),
    new TableRow({ cantSplit: true, children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Mata Anggaran Kegiatan (MAK)', { bold: true, size: 18 })] }),
      new TableCell({ borders: BORDER_TABLE, children: [pText((paket.kode_akun_mak || '521211') + ' — ' + (paket.nama_akun_mak || 'Belanja Bahan'), { bold: true, size: 18, color: '0F172A' })] })
    ]}),
    new TableRow({ cantSplit: true, children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nilai Komitmen Bruto (Rp)', { bold: true, size: 18 })] }),
      new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(totalKontrakFinal) + ' (Termasuk PPN 11%)', { bold: true, size: 18, color: '1E3A8A' })] })
    ]}),
    new TableRow({ cantSplit: true, children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nilai DPP (Netto) & PPN', { bold: true, size: 18 })] }),
      new TableCell({ borders: BORDER_TABLE, children: [pText('DPP: ' + formatRupiah(dppKontrak) + '  |  PPN 11%: ' + formatRupiah(ppnKontrak), { size: 18, color: '334155' })] })
    ]}),
    new TableRow({ cantSplit: true, children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Tipe Supplier SAKTI', { bold: true, size: 18 })] }),
      new TableCell({ borders: BORDER_TABLE, children: [pText('Tipe 3 — Penyedia Barang dan Jasa Badan Usaha', { bold: true, size: 18, color: '15803D' })] })
    ]}),
    new TableRow({ cantSplit: true, children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Identitas Suplier SAKTI', { bold: true, size: 18 })] }),
      new TableCell({ borders: BORDER_TABLE, children: [
        pText('Nama Suplier: ' + namaPenyedia, { bold: true, size: 18 }),
        pText('NPWP: ' + npwpPenyedia + ' (Status KSWP Valid)', { size: 17, color: '334155' }),
        pText('Bank Operasional: ' + bankPenyedia, { size: 17, color: '334155' }),
        pText('Nomor Rekening: ' + rekPenyedia + ' a.n. ' + anRekPenyedia, { bold: true, size: 18, color: '15803D' }),
        pText('Hasil Verifikasi: Data rekening identik NPWP/Akta Notaris & Bebas Retur SP2D KPPN.', { italic: true, size: 16.5, color: '1E3A8A' })
      ]})
    ]}),
    new TableRow({ cantSplit: true, children: [
      new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Rencana Penarikan Dana (RPD)', { bold: true, size: 18 })] }),
      new TableCell({ borders: BORDER_TABLE, children: [pText('Sekaligus 100% pada Bulan Juni 2026 pasca Berita Acara Serah Terima Pekerjaan (BASTP).', { size: 18, color: '334155' })] })
    ]})
  ];

  const section5 = {
    properties: {
      type: SectionType.NEXT_PAGE,
      page: pageProps
    },
    headers: { default: makeHeader('LAMPIRAN IV: RESUME KONTRAK & KOMITMEN SAKTI', noResumeSakti) },
    footers: { default: makeFooter('Dokumen 05: Resume Kontrak & Komitmen SAKTI Kemenkeu') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('LAMPIRAN IV SURAT PESANAN', { align: AlignmentType.CENTER, bold: true, size: 21, color: '1E3A8A', before: 20, after: 2 }),
      pText('LEMBAR RESUME KONTRAK & PEREKAMAN KOMITMEN SAKTI', { align: AlignmentType.CENTER, bold: true, size: 23, color: '0F172A', before: 0, after: 4 }),
      pText('KEMENTERIAN KEUANGAN REPUBLIK INDONESIA — TA 2026', { align: AlignmentType.CENTER, bold: true, size: 18, color: '475569', before: 0, after: 20 }),

      pText('Lembar kerja ini diterbitkan oleh Satuan Kerja 657811 KPU Kabupaten Ngawi sebagai dasar perekaman data perjanjian/kontrak pada Modul Komitmen Aplikasi SAKTI Kementerian Keuangan guna penerbitan Nomor Register Komitmen (NRK) dan Kartu Pengawasan (Karwas) Kontrak sebelum penerbitan SP2D-LS KPPN.', { size: 18.5, align: AlignmentType.JUSTIFIED, before: 0, after: 14 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: saktiTableRows
      }),

      pText('Demikian Resume Kontrak dan Komitmen SAKTI ini dibuat dengan sebenarnya untuk dipergunakan dalam tata kelola keuangan negara yang akuntabel dan tertib perbendaharaan.', { size: 18.5, align: AlignmentType.JUSTIFIED, before: 18, after: 20 }),

      // Tanda Tangan PPK & Bendahara / Pengelola Komitmen
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
                  pText('Petugas Operator Komitmen SAKTI / Bendahara:', { align: AlignmentType.CENTER, size: 18, before: 0, after: 4 }),
                  pText('Komisi Pemilihan Umum Kab. Ngawi', { align: AlignmentType.CENTER, size: 18, color: '1E3A8A', before: 0, after: 120 }),
                  pText(bendaharaNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 4 }),
                  pText('NIP. ' + bendaharaNip, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Pejabat Pembuat Komitmen (PPK):', { align: AlignmentType.CENTER, size: 18, before: 0, after: 4 }),
                  pText('Satker 657811 KPU Kabupaten Ngawi', { align: AlignmentType.CENTER, size: 18, color: '1E3A8A', before: 0, after: 120 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 4 }),
                  pText('NIP. ' + ppkNip, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  return [section1, section2, section3, section4, section5];
}

// =============================================================================
// TAHAP 14: PELAKSANAAN KONTRAK (SURAT PERINTAH PENGIRIMAN & BERITA ACARA KESIAPAN LOKASI)
// Naskah Sah 2 Dokumen: 01. SPP (dengan Ketentuan Pasca Pengiriman) & 02. BA-SPL
// Sesuai Perpres 16/2018 jo. Perpres 12/2021 jo. Perpres 46/2025 Pasal 54,
// Perlem LKPP 12/2021 Lampiran I & Surat Edaran / Petunjuk Teknis E-Purchasing LKPP
// =============================================================================
function buildStage14Sections(ctx, tahapRow, keu, isFirstStageInDoc) {
  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, bendahara, settings } = ctx;
  const cleanKode = String(paket.kode_paket_internal || 'PBJ-2026-001').replace(/^CAKRA-/i, 'PBJ-');

  const noSpp = paket.no_spp || tahapRow.nomor_dokumen || ('014/SPP/' + cleanKode + '/PPK-PBJ/KPU-NGW/V/2026');
  const tglSppRaw = tahapRow.tanggal_dokumen || paket.tgl_spp || paket.tgl_mulai_kerja || '2026-05-27';
  const tglSppStr = formatTanggalIndo(tglSppRaw);
  const hariTanggalSpp = formatHariTanggalBeritaAcara(tglSppRaw);

  const noBaSpl = paket.no_ba_spl || ('014/BA-SPL/' + cleanKode + '/PPK-PBJ/KPU-NGW/V/2026');
  const tglBaSplRaw = paket.tgl_ba_spl || tglSppRaw;
  const tglBaSplStr = formatTanggalIndo(tglBaSplRaw);
  const hariTanggalBaSpl = formatHariTanggalBeritaAcara(tglBaSplRaw);

  const noKontrak = paket.no_kontrak || ('013/SP/' + cleanKode + '/PPK-PBJ/KPU-NGW/V/2026');
  const tglKontrakStr = formatTanggalIndo(paket.tgl_kontrak || '2026-05-27');
  const durasiHari = Number(paket.masa_pelaksanaan_hari || 14);
  const tglMulaiStr = formatTanggalIndo(paket.tgl_mulai_kerja || '2026-05-27');
  const tglSelesaiStr = formatTanggalIndo(paket.tgl_selesai_kontrak || '2026-06-09');
  const lokasiFranco = paket.lokasi_pekerjaan || 'Ruang Server Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi';
  const kondisiRuangServer = paket.kondisi_ruang_server || 'Ruang Server KPU Kab. Ngawi Siap 100% (Listrik 220V Terproteksi UPS, Grounding 1.8 Ohm, AC 20°C)';
  const teknisiRekanan = paket.pic_teknisi_rekanan || 'Ahmad Fauzi (Lead Systems Engineer)';
  const kontakTeknisi = paket.kontak_teknisi_rekanan || '0812-3456-7890';

  const ppkNama = cleanNamaTanpaGelar((ppk && ppk.nama_lengkap) || 'MOHAMMAD NOOR JIHAN');
  const ppkNip = (ppk && ppk.nip) || '19840101 200912 1 001';
  const ppkAlamat = (settings && settings.alamat_satker) || 'Jl. Untung Suropati No. 48 Ngawi';

  const namaPenyedia = (penyedia && penyedia.nama_perusahaan) || 'CV. GRAFIKA PRATAMA';
  const direkturPenyedia = cleanNamaTanpaGelar((penyedia && penyedia.nama_direktur) || 'HENDRA SURYAWAN');
  const jabatanPenyedia = (penyedia && penyedia.jabatan_penandatangan) || 'Direktur';
  const npwpPenyedia = (penyedia && penyedia.npwp) || '01.445.882.9-646.000';
  const nibPenyedia = (penyedia && penyedia.nib) || '9120301182451';
  const alamatPenyedia = (penyedia && penyedia.alamat) || 'Jl. Ronggowarsito No. 12, Kel. Pelem, Kec. Ngawi, Kab. Ngawi';

  const nilaiKontrakNominal = Number(paket.nilai_kontrak || 138000000);
  const nilaiKontrakRp = formatRupiah(nilaiKontrakNominal);
  const nilaiKontrakTerbilang = terbilangRupiah(nilaiKontrakNominal);

  const makeHeader = (title, docNo = noSpp) => new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({
            text: `SI-PRABU v3.0 — ${title} | ${docNo}`,
            italic: true,
            size: 15,
            color: '64748B'
          })
        ]
      })
    ]
  });

  const makeFooter = (label) => new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 30, after: 0 },
        children: [
          new TextRun({
            text: `KPU Kabupaten Ngawi — ${label}`,
            size: 15,
            color: '64748B'
          })
        ]
      })
    ]
  });

  const pageProps = {
    size: { width: 11906, height: 16838 }, // A4 Portrait
    margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
  };

  // Build tabel rincian barang untuk Dokumen 01 SPP
  const itemRowsSpp = [
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('NO', { bold: true, size: 18, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('NAMA BARANG', { bold: true, size: 18, color: 'FFFFFF' })] }),
        new TableCell({ width: { size: 38, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('SPESIFIKASI TEKNIS & KUALITAS', { bold: true, size: 18, color: 'FFFFFF' })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('VOL', { bold: true, size: 18, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('TOTAL (RP)', { bold: true, size: 18, color: 'FFFFFF', align: AlignmentType.RIGHT })] })
      ]
    })
  ];

  if (items && items.length > 0) {
    items.forEach((it, idx) => {
      const volSat = `${it.volume || 1} ${it.satuan || 'Unit'}`;
      const totHarga = formatRupiah(Number(it.jumlah_hps || (it.volume * it.harga_satuan_hps) || 0));
      itemRowsSpp.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(String(idx + 1), { size: 17, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(it.uraian_item || it.nama_barang || '-', { bold: true, size: 17 })] }),
            new TableCell({ width: { size: 38, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(it.spesifikasi_teknis || '-', { size: 16, color: '334155' })] }),
            new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(volSat, { size: 17, align: AlignmentType.CENTER })] }),
            new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(totHarga, { bold: true, size: 17, align: AlignmentType.RIGHT, color: '1E3A8A' })] })
          ]
        })
      );
    });
  } else {
    itemRowsSpp.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('1', { size: 17, align: AlignmentType.CENTER })] }),
          new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('PC Server Tower Database Operasional', { bold: true, size: 17 })] }),
          new TableCell({ width: { size: 38, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('Intel Xeon E-2324G, RAM 32GB ECC, 2x 1TB SSD NVMe RAID-1, Dual PSU 500W Platinum, OS Win Server 2025 Standard', { size: 16, color: '334155' })] }),
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('1 Paket', { size: 17, align: AlignmentType.CENTER })] }),
          new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(nilaiKontrakRp, { bold: true, size: 17, align: AlignmentType.RIGHT, color: '1E3A8A' })] })
        ]
      })
    );
  }

  // Row Footer Total
  itemRowsSpp.push(
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ columnSpan: 4, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('TOTAL NILAI SURAT PERINTAH PENGIRIMAN (TERMASUK PPN 11% & BIAYA PENGIRIMAN):', { bold: true, size: 17, align: AlignmentType.RIGHT })] }),
        new TableCell({ borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText(nilaiKontrakRp, { bold: true, size: 18, color: '1E3A8A', align: AlignmentType.RIGHT })] })
      ]
    })
  );

  // Parse dynamic Ketentuan Pasca Pengiriman (SPP Dokumen 01)
  let pascaList = [];
  try {
    if (typeof paket.ketentuan_pasca_pengiriman_json === 'string') {
      pascaList = JSON.parse(paket.ketentuan_pasca_pengiriman_json);
    } else if (Array.isArray(paket.ketentuan_pasca_pengiriman_json)) {
      pascaList = paket.ketentuan_pasca_pengiriman_json;
    }
  } catch (e) {}

  if (!Array.isArray(pascaList) || pascaList.length === 0) {
    pascaList = [
      { kode: 'a.', judul: 'Protokol Unboxing Bersama:', uraian: 'Pembukaan kemasan kardus bersegel pabrikan wajib dilakukan di Ruang Server Kantor KPU Kabupaten Ngawi dan disaksikan secara langsung oleh PPK dan Tim Teknis Satker.' },
      { kode: 'b.', judul: 'Pemasangan Fisik & Konfigurasi Hardware:', uraian: 'Penyedia wajib melakukan penempatan unit Server Tower 4U pada rak/posisi yang aman, penyambungan kedua modul Redundant Power Supply (Dual PSU 500W) pada jalur sumber listrik ber-UPS, konfigurasi hardware RAID-1 Mirroring pada kedua SSD NVMe 1TB Enterprise, dan verifikasi modul memori RAM 32GB ECC.' },
      { kode: 'c.', judul: 'Instalasi Sistem Operasi & Lisensi Resmi:', uraian: 'Penyedia wajib melakukan instalasi bersih (clean install) sistem operasi Microsoft Windows Server 2025 Standard 64-bit, melakukan aktivasi lisensi resmi 16-Core Original OEM/OLP, serta memperbarui firmware BIOS dan Dedicated Remote Management Controller (IPMI 2.0 / BMC).' },
      { kode: 'd.', judul: 'Pengujian Komisioning Bersama:', uraian: 'Penyedia dan Tim Teknis Satker wajib melaksanakan uji coba beban dasar (Power-On Self-Test / POST), uji redundansi daya (simulasi mencabut salah satu kabel power, server harus tetap menyala stabil), dan uji konektivitas dual port Gigabit LAN.' },
      { kode: 'e.', judul: 'Manajemen Kabel & Garansi Resmi:', uraian: 'Penyedia wajib merapikan perkabelan di area ruang server (cable management), membersihkan sisa sampah kemasan, serta menyerahkan sertifikat garansi purna jual resmi pabrikan minimal 1 tahun (365 hari kalender) on-site.' }
    ];
  }

  const pascaChildren = [];
  pascaList.forEach((it, idx) => {
    const letter = String.fromCharCode(97 + idx) + '.';
    const kode = it.kode ? (it.kode.endsWith('.') ? it.kode : it.kode + '.') : letter;
    let judul = it.judul || `Ketentuan ${idx + 1}:`;
    if (!judul.endsWith(':')) judul += ':';
    pascaChildren.push(pListItem(kode, judul, it.uraian || '-'));
  });

  // Parse dynamic MC-0 Checklist (BA-SPL Dokumen 02)
  let mc0List = [];
  try {
    if (typeof paket.parameter_kesiapan_lokasi_json === 'string') {
      mc0List = JSON.parse(paket.parameter_kesiapan_lokasi_json);
    } else if (Array.isArray(paket.parameter_kesiapan_lokasi_json)) {
      mc0List = paket.parameter_kesiapan_lokasi_json;
    }
  } catch (e) {}

  if (!Array.isArray(mc0List) || mc0List.length === 0) {
    mc0List = [
      { no: 1, parameter: 'Catu Daya Listrik & Redundansi', kondisi: 'Stop kontak khusus server tegangan 220V ± 5% aktif, terhubung ke jalur panel UPS Online Satker dan sistem Genset otomatis.', status: 'MEMENUHI SYARAT (SIAP 100%)' },
      { no: 2, parameter: 'Sistem Pembumian (Grounding)', kondisi: 'Nilai tahanan grounding terukur 1.8 Ohm (Standar aman perangkat IT/telematika < 5.0 Ohm), bebas arus bocor listrik.', status: 'MEMENUHI SYARAT (SIAP 100%)' },
      { no: 3, parameter: 'Suhu & Tata Udara Ruangan', kondisi: 'Dilengkapi unit pendingin AC Inverter 24 jam dengan suhu operasional terpantau 19°C – 21°C dan sirkulasi udara bersih.', status: 'MEMENUHI SYARAT (SIAP 100%)' },
      { no: 4, parameter: 'Keamanan Fisik & Lingkungan', kondisi: 'Ruangan steril dengan akses pintu terkunci, bebas risiko percikan air/kebocoran atap, dan bebas dari debu berlebih.', status: 'MEMENUHI SYARAT (SIAP 100%)' },
      { no: 5, parameter: 'Infrastruktur Jaringan LAN', kondisi: 'Tersedia port Gigabit Ethernet RJ45 terhubung ke core switch jaringan internal KPU Kabupaten Ngawi dengan koneksi stabil.', status: 'MEMENUHI SYARAT (SIAP 100%)' }
    ];
  }

  const checklistKesiapanRows = [
    new TableRow({
      cantSplit: true,
      children: [
        new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('NO', { bold: true, size: 18, color: 'FFFFFF', align: AlignmentType.CENTER })] }),
        new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('PARAMETER PEMERIKSAAN', { bold: true, size: 18, color: 'FFFFFF' })] }),
        new TableCell({ width: { size: 46, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('HASIL VERIFIKASI FAKTUAL DI LOKASI', { bold: true, size: 18, color: 'FFFFFF' })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: '1E3A8A', type: ShadingType.CLEAR }, children: [pText('KESIMPULAN', { bold: true, size: 18, color: 'FFFFFF', align: AlignmentType.CENTER })] })
      ]
    })
  ];

  mc0List.forEach((item, idx) => {
    const isPass = String(item.status || '').toUpperCase().includes('MEMENUHI');
    const badgeColor = isPass ? '15803D' : 'B91C1C';
    const badgeFill = isPass ? 'DCFCE7' : 'FEE2E2';
    let statusText = (item.status || 'MEMENUHI SYARAT').toUpperCase();
    if (!statusText.includes('\n') && statusText.includes('(')) {
      statusText = statusText.replace(' (', '\n(');
    }

    checklistKesiapanRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(String(idx + 1) + '.', { size: 17, align: AlignmentType.CENTER })] }),
          new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(item.parameter || '-', { bold: true, size: 17 })] }),
          new TableCell({ width: { size: 46, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(item.kondisi || '-', { size: 16, color: '334155' })] }),
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: badgeFill, type: ShadingType.CLEAR }, children: [pText(statusText, { bold: true, size: 15, align: AlignmentType.CENTER, color: badgeColor })] })
        ]
      })
    );
  });

  // SECTION 1: DOKUMEN 01 - SURAT PERINTAH PENGIRIMAN (SPP)
  const section1 = {
    properties: {
      page: pageProps
    },
    headers: { default: makeHeader('DOKUMEN 01: SURAT PERINTAH PENGIRIMAN (SPP)', noSpp) },
    footers: { default: makeFooter('Dokumen 01: Surat Perintah Pengiriman (SPP) & Pasca Pengiriman') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('SURAT PERINTAH PENGIRIMAN (SPP)', { align: AlignmentType.CENTER, bold: true, size: 24, color: '0F172A', before: 20, after: 3 }),
      pText(`Nomor: ${noSpp}`, { align: AlignmentType.CENTER, bold: true, size: 20, color: '1E3A8A', before: 0, after: 4 }),
      pText(`Paket Pekerjaan: ${paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional'}`, { align: AlignmentType.CENTER, italic: true, size: 17, color: '475569', before: 0, after: 20 }),

      pText(`Berdasarkan Surat Pesanan (Kontrak E-Purchasing) Nomor: ${noKontrak} tanggal ${tglKontrakStr} dan Daftar Isian Pelaksanaan Anggaran (DIPA) KPU Kabupaten Ngawi Tahun Anggaran 2026, Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi dengan ini memerintahkan kepada:`, { size: 18.5, align: AlignmentType.JUSTIFIED, before: 0, after: 12 }),

      // Identitas Penyedia yang diperintahkan
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nama Penyedia / Badan Usaha', { bold: true, size: 18 })] }),
              new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(namaPenyedia, { bold: true, size: 18, color: '0F172A' })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Penanggung Jawab / Direktur', { bold: true, size: 18 })] }),
              new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(`${direkturPenyedia} (${jabatanPenyedia})`, { size: 18, color: '334155' })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Nomor Pokok Wajib Pajak (NPWP)', { bold: true, size: 18 })] }),
              new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(`${npwpPenyedia}  |  NIB: ${nibPenyedia}`, { size: 18, color: '334155' })] })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC', type: ShadingType.CLEAR }, children: [pText('Alamat Badan Usaha', { bold: true, size: 18 })] }),
              new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(alamatPenyedia, { size: 18, color: '334155' })] })
            ]
          })
        ]
      }),

      pText('Untuk segera memproses pengiriman, penyerahan, dan pemasangan barang dengan ketentuan sebagai berikut:', { size: 18.5, align: AlignmentType.JUSTIFIED, before: 14, after: 10 }),

      // Ketentuan Pengiriman
      pListItem('1.', 'Tanggal Mulai Kerja / Pengiriman (TMT):', `Pengiriman dan pelaksanaan pekerjaan dimulai pada tanggal ${tglMulaiStr}.`),
      pListItem('2.', 'Jangka Waktu Penyelesaian:', `Jangka waktu pelaksanaan pengiriman dan perakitan ditetapkan selama ${durasiHari} (${terbilangInt(durasiHari)}) hari kalender, terhitung sejak TMT sampai dengan tanggal ${tglSelesaiStr}.`),
      pListItem('3.', 'Alamat Penyerahan (Franco Lokasi):', `Barang diserahkan dalam keadaan lengkap dan aman di ${lokasiFranco}.`),
      pListItem('4.', 'Nilai Surat Perintah Pengiriman:', `Total nilai pengadaan adalah sebesar ${nilaiKontrakRp} (${nilaiKontrakTerbilang}), sudah mencakup harga barang, PPN 11%, biaya pengemasan standar industri, asuransi logistik, biaya ekspedisi, serta instalasi dan komisioning di lokasi.`),
      pListItem('5.', 'Sanksi Keterlambatan:', 'Apabila terjadi keterlambatan penyerahan barang yang disebabkan oleh kelalaian Penyedia, maka dikenakan denda keterlambatan sebesar 1/1000 (satu permil) per hari keterlambatan dari Nilai Kontrak sebelum PPN.'),

      pText('Rincian Kuantitas dan Spesifikasi Barang yang Dikirim:', { bold: true, size: 18.5, color: '1E3A8A', before: 14, after: 8 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: itemRowsSpp
      }),

      pText('KETENTUAN KHUSUS PASCA PENGIRIMAN (PERAKITAN, INSTALASI, & KOMISIONING):', { bold: true, size: 19, color: '0F172A', before: 16, after: 8 }),
      pText('Mengingat barang yang dikirim merupakan perangkat teknologi informasi inti (PC Server Database Operasional), Penyedia diwajibkan memenuhi standar pelaksanaan teknis pasca pengiriman sebagai berikut:', { size: 18, align: AlignmentType.JUSTIFIED, before: 0, after: 8 }),

      ...pascaChildren,

      pText('Demikian Surat Perintah Pengiriman (SPP) ini diterbitkan untuk dilaksanakan dengan penuh rasa tanggung jawab sesuai ketentuan peraturan perundang-undangan.', { size: 18.5, align: AlignmentType.JUSTIFIED, before: 14, after: 22 }),

      // Blok Tanda Tangan SPP
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Menerima dan Menyetujui:', { align: AlignmentType.CENTER, size: 18, before: 0, after: 4 }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, bold: true, size: 19, color: '1E3A8A', before: 0, after: 120 }),
                  pText(direkturPenyedia, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 4 }),
                  pText(jabatanPenyedia, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText(`Ngawi, ${tglSppStr}`, { align: AlignmentType.CENTER, size: 18, before: 0, after: 4 }),
                  pText('Pejabat Pembuat Komitmen (PPK)', { align: AlignmentType.CENTER, bold: true, size: 19, color: '1E3A8A', before: 0, after: 120 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 20, color: '0F172A', before: 0, after: 4 }),
                  pText(`NIP. ${ppkNip}`, { align: AlignmentType.CENTER, size: 18, color: '334155', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  // SECTION 2: DOKUMEN 02 - BERITA ACARA KESIAPAN DAN PENYERAHAN LOKASI INSTALASI (BA-SPL)
  const section2 = {
    properties: {
      page: pageProps
    },
    headers: { default: makeHeader('DOKUMEN 02: BA KESIAPAN & PENYERAHAN LOKASI (BA-SPL)', noBaSpl) },
    footers: { default: makeFooter('Dokumen 02: Berita Acara Kesiapan & Penyerahan Lokasi (BA-SPL)') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('BERITA ACARA KESIAPAN DAN PENYERAHAN LOKASI INSTALASI', { align: AlignmentType.CENTER, bold: true, size: 22, color: '0F172A', before: 20, after: 3 }),
      pText(`Nomor: ${noBaSpl}`, { align: AlignmentType.CENTER, bold: true, size: 19, color: '1E3A8A', before: 0, after: 4 }),
      pText(`Kegiatan: Pemeriksaan Faktual Kesiapan Ruang Server & Penyerahan Izin Akses Kerja Teknisi`, { align: AlignmentType.CENTER, italic: true, size: 17, color: '475569', before: 0, after: 18 }),

      pText(`Pada hari ini, ${hariTanggalBaSpl}, bertempat di Ruang Server Lantai 1 Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi, kami yang bertanda tangan di bawah ini:`, { size: 18.5, align: AlignmentType.JUSTIFIED, before: 0, after: 10 }),

      pListItem('I.', 'PIHAK KESATU (Pemberi Izin Akses / PPK):', `${ppkNama}, NIP. ${ppkNip}, Jabatan: Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi, bertindak untuk dan atas nama Satuan Kerja KPU Kabupaten Ngawi.`),
      pListItem('II.', 'PIHAK KEDUA (Penerima Izin Akses / Rekanan):', `${direkturPenyedia}, Jabatan: ${jabatanPenyedia} ${namaPenyedia}, dalam hal ini menugaskan Teknisi Lapangan ${teknisiRekanan} (Kontak: ${kontakTeknisi}).`),
      pListItem('III.', 'TIM TEKNIS KPU KABUPATEN NGAWI:', 'Tim Teknis Pendamping dan Pengawas Operasional Subbagian Keuangan, Umum, dan Logistik (KUL) serta Subbagian Perencanaan, Data, dan Informasi KPU Kabupaten Ngawi.'),

      pText('Menyatakan bahwa Para Pihak telah bersama-sama melakukan pemeriksaan fisik secara seksama terhadap kondisi dan kesiapan lokasi ruang kerja penempatan perangkat PC Server Database Operasional, dengan hasil verifikasi faktual sebagai berikut:', { size: 18.5, align: AlignmentType.JUSTIFIED, before: 10, after: 10 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: checklistKesiapanRows
      }),

      pText('KESEPAKATAN DAN PERNYATAAN PENYERAHAN LOKASI KERJA:', { bold: true, size: 18.5, color: '0F172A', before: 16, after: 6 }),
      pListItem('1.', 'Penyerahan Hak Akses:', 'Berdasarkan hasil pemeriksaan bersama di mana seluruh parameter dinyatakan MEMENUHI SYARAT (SIAP 100%), PIHAK KESATU secara resmi MENYERAHKAN HAK AKSES RUANG KERJA INSTALASI kepada PIHAK KEDUA untuk melaksanakan proses unboxing, perakitan hardware, instalasi OS, dan komisioning perangkat.'),
      pListItem('2.', 'Masa Berlaku Izin Akses:', `Izin akses kerja diberikan terhitung sejak tanggal ${tglMulaiStr} sampai dengan berakhirnya masa pelaksanaan pada tanggal ${tglSelesaiStr}.`),
      pListItem('3.', 'Kepatuhan Keamanan & Kerahasiaan:', 'PIHAK KEDUA dan teknisi pelaksana wajib mematuhi SOP Keamanan Informasi KPU, menjaga kebersihan area kerja, tidak mengubah konfigurasi perangkat lain yang ada di ruang server, serta bertanggung jawab penuh atas keselamatan kerja (K3) personilnya.'),

      pText('Demikian Berita Acara Kesiapan dan Penyerahan Lokasi Instalasi ini dibuat dengan sebenarnya dalam rangkap 2 (dua) asli untuk dipergunakan sebagaimana mestinya.', { size: 18.5, align: AlignmentType.JUSTIFIED, before: 14, after: 20 }),

      // Blok Tanda Tangan Para Pihak & Tim Teknis
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KEDUA (PENYEDIA)', { align: AlignmentType.CENTER, bold: true, size: 18, before: 0, after: 2 }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 100 }),
                  pText(direkturPenyedia, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 19, color: '0F172A', before: 0, after: 4 }),
                  pText(jabatanPenyedia, { align: AlignmentType.CENTER, size: 17, color: '334155', before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KESATU (PPK)', { align: AlignmentType.CENTER, bold: true, size: 18, before: 0, after: 2 }),
                  pText('KPU KABUPATEN NGAWI', { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 100 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 19, color: '0F172A', before: 0, after: 4 }),
                  pText(`NIP. ${ppkNip}`, { align: AlignmentType.CENTER, size: 17, color: '334155', before: 0, after: 0 })
                ]
              })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                columnSpan: 2,
                borders: BORDER_NONE,
                children: [
                  pText('Mengetahui / Saksi Pemeriksaan:', { align: AlignmentType.CENTER, italic: true, size: 17, color: '475569', before: 16, after: 2 }),
                  pText('TIM TEKNIS KPU KABUPATEN NGAWI', { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 80 }),
                  pText('( _______________________________ )', { align: AlignmentType.CENTER, bold: true, size: 18, color: '0F172A', before: 0, after: 4 }),
                  pText('Subbagian Keuangan, Umum & Logistik (KUL)', { align: AlignmentType.CENTER, size: 16, color: '64748B', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  return [section1, section2];
}

// =============================================================================
// GENERATOR NASKAH RESMI TAHAP 15: PENGENDALIAN KONTRAK & KOMISIONING TEKNIS
// Dokumen 01: Laporan Pengawasan & Pengendalian Pelaksanaan Kontrak (LAP-WAS)
// Dokumen 02: Berita Acara Pengujian Fungsi & Komisioning Teknis (BA-KOM)
// Sesuai Perpres 16/2018 jo. Perpres 46/2025 Pasal 54-57 & Perka LKPP 12/2021
// =============================================================================
function buildStage15Sections(ctx, tahapRow, keu, isFirstStageInDoc) {
  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, bendahara, settings } = ctx;
  const cleanKode = String(paket.kode_paket_internal || 'PBJ-2026-001').replace(/^CAKRA-/i, 'PBJ-');

  const noLapWas = paket.no_laporan_pengendalian || tahapRow.nomor_dokumen || ('015/LAP-WAS/' + cleanKode + '/PPK-PBJ/KPU-NGW/VI/2026');
  const tglLapWasRaw = tahapRow.tanggal_dokumen || paket.tgl_laporan_pengendalian || paket.tgl_selesai_kontrak || '2026-06-09';
  const tglLapWasStr = formatTanggalIndo(tglLapWasRaw);
  const hariTanggalLapWas = formatHariTanggalBeritaAcara(tglLapWasRaw);

  const noBaKom = paket.no_ba_komisioning || ('015/BA-KOM/' + cleanKode + '/PPK-PBJ/KPU-NGW/VI/2026');
  const tglBaKomRaw = paket.tgl_ba_komisioning || tglLapWasRaw;
  const tglBaKomStr = formatTanggalIndo(tglBaKomRaw);
  const hariTanggalBaKom = formatHariTanggalBeritaAcara(tglBaKomRaw);

  const noKontrak = paket.no_kontrak || ('013/SP/' + cleanKode + '/PPK-PBJ/KPU-NGW/V/2026');
  const tglKontrakStr = formatTanggalIndo(paket.tgl_kontrak || '2026-05-27');
  const noSpp = paket.no_spp || ('014/SPP/' + cleanKode + '/PPK-PBJ/KPU-NGW/V/2026');
  const tglSppStr = formatTanggalIndo(paket.tgl_spp || '2026-05-27');

  const durasiHari = Number(paket.masa_pelaksanaan_hari || 14);
  const tglMulaiStr = formatTanggalIndo(paket.tgl_mulai_kerja || '2026-05-27');
  const tglSelesaiStr = formatTanggalIndo(paket.tgl_selesai_kontrak || '2026-06-09');
  const lokasiFranco = paket.lokasi_pekerjaan || 'Ruang Server Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi';

  const namaPenyedia = penyedia.nama_perusahaan || 'CV. GRAFIKA PRATAMA NGAWI';
  const direkturPenyedia = penyedia.nama_direktur || 'HENDRA SURYAWAN';
  const jabatanPenyedia = penyedia.jabatan_penandatangan || 'Direktur';
  const teknisiRekanan = paket.pic_teknisi_rekanan || 'Ahmad Fauzi (Lead Systems Engineer)';
  const kontakTeknisi = paket.kontak_teknisi_rekanan || '0812-3456-7890';

  const ppkNama = cleanNamaTanpaGelar((ppk && ppk.nama_lengkap) || 'MOHAMMAD NOOR JIHAN');
  const ppkNip = (ppk && ppk.nip) || '19840101 200912 1 001';

  const realisasiPersen = Number(paket.realisasi_fisik_persen || 100);
  const rencanaPersen = Number(paket.rencana_fisik_persen || 100);
  const deviasiPersen = Number(paket.deviasi_fisik_persen || (realisasiPersen - rencanaPersen));
  const statusScm = paket.status_scm || 'Normal / Sesuai Jadwal Kontrak (On-Track)';
  const catatanPengendalian = paket.catatan_pengendalian_ppk || 'Pelaksanaan pengiriman, unboxing, perakitan dual PSU redundant, konfigurasi hardware RAID-1 SSD NVMe, instalasi OS Windows Server 2025 Standard 64-bit resmi, serta pengujian komisioning burn-in berjalan 100% normal dan selesai tepat waktu pada tanggal 9 Juni 2026 tanpa deviasi keterlambatan. Seluruh item memenuhi spesifikasi teknis kontrak dan dinyatakan lulus uji fungsi untuk diproses Serah Terima Pekerjaan (BAST) Tahap 16.';

  // 5 Pilar Pengawasan Kontrak dinamis
  let milestoneList = [];
  if (paket.milestone_pengendalian_json) {
    try {
      milestoneList = typeof paket.milestone_pengendalian_json === 'string'
        ? JSON.parse(paket.milestone_pengendalian_json)
        : paket.milestone_pengendalian_json;
    } catch (e) {}
  }
  if (!Array.isArray(milestoneList) || milestoneList.length === 0) {
    milestoneList = [
      { no: 1, target: 'Pilar 1: Pengawasan Waktu & Jadwal Pelaksanaan (Mobilisasi & Instalasi Tepat Waktu)', bobot_rencana: 20, target_waktu: 'Hari ke-3 s.d. 14 (30 Mei - 09 Juni 2026)', realisasi: 20, status: 'SELESAI TEPAT WAKTU', keterangan: 'Mobilisasi, unboxing, dan instalasi tuntas 100% dalam masa kontrak 14 hari kalender' },
      { no: 2, target: 'Pilar 2: Pengawasan Mutu & Spesifikasi Teknis (QC Segel Pabrikan, Hardware & Lisensi Resmi)', bobot_rencana: 20, target_waktu: 'Hari ke-4 (31 Mei 2026)', realisasi: 20, status: 'SELESAI TEPAT WAKTU', keterangan: 'Merek Dell resmi, segel pabrikan intak, Dual Xeon, 64GB ECC, 2x NVMe & Windows Server 2025 COA' },
      { no: 3, target: 'Pilar 3: Pengawasan Kuantitas & Volume Barang (Kelengkapan Unit & Aksesoris Franco KPU)', bobot_rencana: 20, target_waktu: 'Hari ke-4 (31 Mei 2026)', realisasi: 20, status: 'SELESAI TEPAT WAKTU', keterangan: '1 unit server lengkap, dual redundant PSU 80+ Platinum, rel rackmount & kabel daya utuh 100%' },
      { no: 4, target: 'Pilar 4: Pengawasan Fungsi Operasional & Uji Beban (POST, Failover Dual PSU & Burn-In 24 Jam)', bobot_rencana: 20, target_waktu: 'Hari ke-13 (08 Juni 2026)', realisasi: 20, status: 'SELESAI TEPAT WAKTU', keterangan: 'POST lulus, failover PSU seketika tanpa mati, RAID-1 sinkron 100%, Gigabit LAN & burn-in test stabil' },
      { no: 5, target: 'Pilar 5: Pengawasan Administrasi & Legalitas Jaminan (Surat Jalan, Garansi 1 Tahun & BA)', bobot_rencana: 20, target_waktu: 'Hari ke-14 (09 Juni 2026)', realisasi: 20, status: 'SELESAI TEPAT WAKTU', keterangan: 'Surat Jalan resmi, sertifikat garansi purna jual resmi 1 tahun on-site, BA-SPL, dan BA-KOM lengkap sah' }
    ];
  }

  // Parameter komisioning list dinamis
  let komisioningList = [];
  if (paket.parameter_komisioning_json) {
    try {
      komisioningList = typeof paket.parameter_komisioning_json === 'string'
        ? JSON.parse(paket.parameter_komisioning_json)
        : paket.parameter_komisioning_json;
    } catch (e) {}
  }
  if (!Array.isArray(komisioningList) || komisioningList.length === 0) {
    komisioningList = [
      { no: 1, parameter: '⚡ Power On Self Test (POST) & Redundant Power Supply (PSU Failover)', metode: 'Simulasi pemutusan salah satu kabel catu daya AC saat server bekerja penuh (Burn-in)', hasil: 'Redundansi aktif seketika, server tetap beroperasi normal tanpa interupsi daya', status: 'LULUS' },
      { no: 2, parameter: '⚙️ Verifikasi Spesifikasi Hardware (Dual Xeon, 64GB ECC, 2x NVMe)', metode: 'Inspeksi sistem BIOS/UEFI dan OS Device Manager sesuai lampiran kontrak', hasil: 'Terbaca Dual Intel Xeon Silver, 64GB DDR4 ECC Reg, 2x 1.92TB Enterprise NVMe RAID-1 sinkron 100%', status: 'LULUS' },
      { no: 3, parameter: '🔥 Stress Test & Burn-in Beban Puncak CPU / Memori (24 Jam Non-Stop)', metode: 'Pengujian utilitas beban kerja CPU & RAM 100% terus menerus selama 24 jam', hasil: 'Suhu CPU stabil maksimal 68°C, tidak terjadi thermal throttling, sistem beroperasi stabil', status: 'LULUS' },
      { no: 4, parameter: '🌐 Uji Konektivitas Jaringan Gigabit LAN & Redundansi NIC Teaming', metode: 'Transfer data throughput jaringan dan simulasi link down kabel LAN', hasil: 'Bandwidth stabil 1.000 Mbps full duplex, failover NIC port 1 ke port 2 instan tanpa paket loss', status: 'LULUS' },
      { no: 5, parameter: '🔐 Keaslian Lisensi OS Windows Server 2025 Standard & Driver Resmi', metode: 'Verifikasi sertifikat Certificate of Authenticity (COA) fisik & aktivasi digital online Microsoft', hasil: 'Windows teraktivasi resmi secara digital (Genuine Digital License), seluruh firmware/driver termutakhir', status: 'LULUS' }
    ];
  }

  // Tabel 5 Pilar Pengawasan LAP-WAS
  let milestoneTableRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('NO', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 37, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('5 PILAR UTAMA PENGAWASAN KONTRAK', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('BOBOT', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('TARGET WAKTU', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('REALISASI', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('STATUS EVALUASI', { align: AlignmentType.CENTER, bold: true, size: 17 })] })
      ]
    })
  ];

  milestoneList.forEach((m, idx) => {
    const uraianStr = m.target || m.pilar || m.milestone || m.uraian || `Pilar ${idx + 1}: Pengawasan Kontrak`;
    const bobotVal = m.bobot !== undefined ? m.bobot : (m.bobot_rencana !== undefined ? m.bobot_rencana : 20);
    const targetWaktuStr = m.target_waktu || m.target_tgl || m.tgl_target || (m.target_hari ? `Hari ke-${m.target_hari}` : 'Sesuai Jadwal Kontrak');
    let realisasiStr = '';
    if (m.realisasi_tgl) {
      realisasiStr = m.realisasi_tgl;
    } else if (m.realisasi !== undefined) {
      realisasiStr = typeof m.realisasi === 'number' ? `${m.realisasi}%` : String(m.realisasi);
    } else {
      realisasiStr = `${bobotVal}% (100% Bobot)`;
    }
    const statusStr = m.status || 'SELESAI TEPAT WAKTU';

    milestoneTableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 17 })] }),
          new TableCell({ width: { size: 37, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [
            pText(uraianStr, { bold: true, size: 17, color: '0F172A' }),
            ...(m.keterangan ? [pText(`Ket: ${m.keterangan}`, { italic: true, size: 15.5, color: '475569', before: 2 })] : [])
          ] }),
          new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(`${bobotVal}%`, { align: AlignmentType.CENTER, bold: true, size: 17, color: '1E3A8A' })] }),
          new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(targetWaktuStr, { align: AlignmentType.CENTER, size: 16.5, color: '475569' })] }),
          new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(realisasiStr, { align: AlignmentType.CENTER, bold: true, size: 16.5, color: '15803D' })] }),
          new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(statusStr, { align: AlignmentType.CENTER, bold: true, size: 16, color: '15803D' })] })
        ]
      })
    );
  });

  // Tabel Komisioning BA-KOM
  let komisioningTableRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('NO', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 26, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('PARAMETER PENGUJIAN FUNGSI', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('METODE PENGUJIAN FAKTUAL', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 27, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('HASIL PENGUKURAN / OBSERVASI', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('KESIMPULAN', { align: AlignmentType.CENTER, bold: true, size: 17 })] })
      ]
    })
  ];

  komisioningList.forEach((k, idx) => {
    komisioningTableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 17 })] }),
          new TableCell({ width: { size: 26, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(k.parameter || '', { bold: true, size: 17, color: '0F172A' })] }),
          new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(k.metode || '', { size: 16.5, color: '334155' })] }),
          new TableCell({ width: { size: 27, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(k.hasil || '', { size: 16.5, color: '334155' })] }),
          new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(k.status || 'LULUS', { align: AlignmentType.CENTER, bold: true, size: 16, color: '15803D' })] })
        ]
      })
    );
  });

  const makeHeader = (title, docNo) => new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({
            text: `SI-PRABU v3.0 — ${title} | ${docNo}`,
            italic: true,
            size: 15,
            color: '64748B'
          })
        ]
      })
    ]
  });

  const makeFooter = (label) => new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 30, after: 0 },
        children: [
          new TextRun({
            text: `KPU Kabupaten Ngawi — ${label}`,
            size: 15,
            color: '64748B'
          })
        ]
      })
    ]
  });

  const pageProps = {
    size: { width: 11906, height: 16838 }, // A4 Portrait
    margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 }
  };

  // ==========================================
  // SECTION 1: LAPORAN PENGENDALIAN KONTRAK (LAP-WAS)
  // ==========================================
  const secLapWas = {
    properties: {
      page: pageProps
    },
    headers: { default: makeHeader('DOKUMEN 01: LAPORAN PENGENDALIAN KONTRAK (LAP-WAS)', noLapWas) },
    footers: { default: makeFooter('Dokumen 01: Laporan Pengawasan & Pengendalian Pelaksanaan Kontrak') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('LAPORAN PENGAWASAN DAN PENGENDALIAN PELAKSANAAN KONTRAK', { align: AlignmentType.CENTER, bold: true, size: 21, color: '0F172A', before: 20, after: 3 }),
      pText(`Nomor: ${noLapWas}`, { align: AlignmentType.CENTER, bold: true, size: 18.5, color: '1E3A8A', before: 0, after: 4 }),
      pText(`Pemantauan Kemajuan Fisik (Kurva S / Milestone), Pengawasan Mutu & Pengendalian Kontrak Kritis (SCM)`, { align: AlignmentType.CENTER, italic: true, size: 16.5, color: '475569', before: 0, after: 16 }),

      pText('A. DATA UMUM & IDENTITAS KONTRAK:', { bold: true, size: 18.5, color: '0F172A', before: 0, after: 6 }),
      pListItem('1.', 'Nama Paket Pekerjaan:', `${paket.nama_paket} (Kode Paket: ${cleanKode})`),
      pListItem('2.', 'Surat Pesanan / Kontrak:', `${noKontrak} tanggal ${tglKontrakStr}`),
      pListItem('3.', 'Surat Perintah Pengiriman:', `${noSpp} tanggal ${tglSppStr}`),
      pListItem('4.', 'Penyedia Barang/Jasa:', `${namaPenyedia} (Direktur: ${direkturPenyedia})`),
      pListItem('5.', 'Nilai Kontrak Pelaksanaan:', `${formatRupiah(keu.nilaiKontrak)} (Termasuk PPN 11% & Biaya Pengiriman Franco)`),
      pListItem('6.', 'Jangka Waktu Pelaksanaan:', `${durasiHari} Hari Kalender (${tglMulaiStr} s.d. ${tglSelesaiStr})`),
      pListItem('7.', 'Lokasi Penyerahan Barang:', `${lokasiFranco}`),

      pText('B. REKAPITULASI 5 PILAR UTAMA PENGAWASAN & PENGENDALIAN KONTRAK:', { bold: true, size: 18.5, color: '0F172A', before: 14, after: 6 }),
      pText('Berdasarkan pemantauan lapangan yang dilaksanakan oleh Tim Teknis KPU Kabupaten Ngawi bersama Teknisi Rekanan, seluruh aspek pelaksanaan kontrak diawasi dan dievaluasi secara terukur berdasarkan 5 pilar pengawasan substantif dengan rincian capaian sebagai berikut:', { size: 18, align: AlignmentType.JUSTIFIED, before: 0, after: 8 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: milestoneTableRows
      }),

      pText('C. EVALUASI DEVIASI & ANALISIS KONTRAK KRITIS (SHOW CAUSE MEETING / SCM):', { bold: true, size: 18.5, color: '0F172A', before: 14, after: 6 }),
      pListItem('1.', 'Capaian Progres Kumulatif:', `Target Rencana Fisik: ${rencanaPersen}% | Realisasi Fisik Lapangan: ${realisasiPersen}% | Deviasi: ${deviasiPersen >= 0 ? '+' : ''}${deviasiPersen}% (On-Schedule / Tanpa Keterlambatan).`),
      pListItem('2.', 'Ambang Batas Kritis LKPP:', 'Sesuai ketentuan LKPP, kontrak dinyatakan Kritis apabila terjadi deviasi negatif keterlambatan fisik melebihi 10% pada Periode I (rencana 0%–70%) atau melebihi 5% pada Periode II (rencana 70%–100%).'),
      pListItem('3.', 'Kesimpulan Pengendalian SCM:', `Status Pelaksanaan Kontrak berada dalam kategori ${statusScm.toUpperCase()}. Tidak terdapat indikasi keterlambatan atau kelalaian teknis, sehingga Rapat Pembuktian (Show Cause Meeting / SCM) dan Surat Peringatan (SP) TIDAK DIPERLUKAN.`),

      pText('D. KESIMPULAN & REKOMENDASI PEJABAT PEMBUAT KOMITMEN (PPK):', { bold: true, size: 18.5, color: '0F172A', before: 14, after: 6 }),
      pText(catatanPengendalian, { size: 18, align: AlignmentType.JUSTIFIED, before: 0, after: 20 }),

      // Tanda Tangan LAP-WAS (Tim Teknis Kiri, PPK Kanan)
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Mengetahui / Mengawasi:', { align: AlignmentType.CENTER, italic: true, size: 17, color: '475569', before: 0, after: 2 }),
                  pText('TIM TEKNIS KPU KABUPATEN NGAWI', { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 100 }),
                  pText('( _______________________________ )', { align: AlignmentType.CENTER, bold: true, size: 18, color: '0F172A', before: 0, after: 4 }),
                  pText('Subbagian Keuangan, Umum & Logistik (KUL)', { align: AlignmentType.CENTER, size: 16, color: '64748B', before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText(`Ngawi, ${tglLapWasStr}`, { align: AlignmentType.CENTER, size: 18, before: 0, after: 2 }),
                  pText('PEJABAT PEMBUAT KOMITMEN (PPK)', { align: AlignmentType.CENTER, bold: true, size: 18, before: 0, after: 2 }),
                  pText('KPU KABUPATEN NGAWI', { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 100 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 19, color: '0F172A', before: 0, after: 4 }),
                  pText(`NIP. ${ppkNip}`, { align: AlignmentType.CENTER, size: 17, color: '334155', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  // ==========================================
  // SECTION 2: BERITA ACARA KOMISIONING TEKNIS (BA-KOM)
  // ==========================================
  const secBaKom = {
    properties: {
      page: pageProps
    },
    headers: { default: makeHeader('DOKUMEN 02: BERITA ACARA PENGUJIAN FUNGSI & KOMISIONING (BA-KOM)', noBaKom) },
    footers: { default: makeFooter('Dokumen 02: Berita Acara Pengujian Fungsi & Komisioning Teknis') },
    children: [
      ...buildKopSuratKpu(settings),

      pText('BERITA ACARA PENGUJIAN FUNGSI DAN KOMISIONING TEKNIS', { align: AlignmentType.CENTER, bold: true, size: 21, color: '0F172A', before: 20, after: 3 }),
      pText('(TESTING & COMMISSIONING ACCEPTANCE REPORT)', { align: AlignmentType.CENTER, bold: true, size: 18, color: '166534', before: 0, after: 3 }),
      pText(`Nomor: ${noBaKom}`, { align: AlignmentType.CENTER, bold: true, size: 18.5, color: '1E3A8A', before: 0, after: 4 }),
      pText(`Pemeriksaan Kelaikan Operasional Perangkat PC Server Database Operasional KPU Kabupaten Ngawi`, { align: AlignmentType.CENTER, italic: true, size: 16.5, color: '475569', before: 0, after: 16 }),

      pText(`Pada hari ini, ${hariTanggalBaKom}, bertempat di Ruang Server Lantai 1 Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi, kami yang bertanda tangan di bawah ini:`, { size: 18.5, align: AlignmentType.JUSTIFIED, before: 0, after: 10 }),

      pListItem('I.', 'PIHAK KESATU (Penerima Hasil Uji / PPK):', `${ppkNama}, NIP. ${ppkNip}, Jabatan: Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi didampingi Tim Teknis KPU Kabupaten Ngawi.`),
      pListItem('II.', 'PIHAK KEDUA (Pelaksana Uji / Rekanan):', `${direkturPenyedia}, Jabatan: ${jabatanPenyedia} ${namaPenyedia}, dalam hal ini menugaskan Teknisi Lapangan ${teknisiRekanan} (Kontak: ${kontakTeknisi}).`),

      pText('Menyatakan bahwa Para Pihak telah bersama-sama melaksanakan pengujian fungsi teknis (commissioning) dan uji ketahanan beban (burn-in test) secara langsung terhadap perangkat PC Server Tower Operasional yang dikirimkan oleh PIHAK KEDUA berdasarkan Surat Pesanan No. ' + noKontrak + ' dan SPP No. ' + noSpp + ', dengan hasil pengujian faktual sebagai berikut:', { size: 18.5, align: AlignmentType.JUSTIFIED, before: 10, after: 10 }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_TABLE,
        rows: komisioningTableRows
      }),

      pText('KESIMPULAN DAN PERNYATAAN BERSAMA HASIL KOMISIONING:', { bold: true, size: 18.5, color: '0F172A', before: 16, after: 6 }),
      pListItem('1.', 'Kelaikan Fungsi Barang:', 'Berdasarkan hasil pengujian teknis terhadap seluruh parameter di atas, perangkat PC Server dinyatakan BERFUNGSI NORMAL 100%, seluruh komponen hardware dan sistem operasi berjalan optimal, stabil, dan MEMENUHI PERSYARATAN SPESIFIKASI TEKNIS KONTRAK (LULUS UJI FUNGSI).'),
      pListItem('2.', 'Dasar Serah Terima Pekerjaan:', 'Berita Acara Pengujian Fungsi dan Komisioning Teknis ini dibuat dan ditandatangani secara sah sebagai dokumen prasyarat mutlak penerbitan Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP) dan Berita Acara Serah Terima Pekerjaan (BAST) pada Tahap 16.'),

      pText('Demikian Berita Acara Pengujian Fungsi dan Komisioning Teknis ini dibuat dengan sebenarnya dalam rangkap 2 (dua) asli berkekuatan hukum sama untuk dipergunakan sebagaimana mestinya.', { size: 18.5, align: AlignmentType.JUSTIFIED, before: 14, after: 20 }),

      // Blok Tanda Tangan Para Pihak & Tim Teknis
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KEDUA (PENYEDIA)', { align: AlignmentType.CENTER, bold: true, size: 18, before: 0, after: 2 }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 100 }),
                  pText(direkturPenyedia, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 19, color: '0F172A', before: 0, after: 4 }),
                  pText(jabatanPenyedia, { align: AlignmentType.CENTER, size: 17, color: '334155', before: 0, after: 0 })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KESATU (PPK)', { align: AlignmentType.CENTER, bold: true, size: 18, before: 0, after: 2 }),
                  pText('KPU KABUPATEN NGAWI', { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 100 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 19, color: '0F172A', before: 0, after: 4 }),
                  pText(`NIP. ${ppkNip}`, { align: AlignmentType.CENTER, size: 17, color: '334155', before: 0, after: 0 })
                ]
              })
            ]
          }),
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                columnSpan: 2,
                borders: BORDER_NONE,
                children: [
                  pText('Mengetahui / Saksi Pengujian Komisioning:', { align: AlignmentType.CENTER, italic: true, size: 17, color: '475569', before: 16, after: 2 }),
                  pText('TIM TEKNIS KPU KABUPATEN NGAWI', { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 80 }),
                  pText('( _______________________________ )', { align: AlignmentType.CENTER, bold: true, size: 18, color: '0F172A', before: 0, after: 4 }),
                  pText('Subbagian Keuangan, Umum & Logistik (KUL)', { align: AlignmentType.CENTER, size: 16, color: '64748B', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  return [secLapWas, secBaKom];
}


// =============================================================================
// TAHAP 16: PEMERIKSAAN HASIL PEKERJAAN (BAPHP) & BERITA ACARA SERAH TERIMA (BAST)
// Dokumen 01: Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP)
// Dokumen 02: Berita Acara Serah Terima Pertama Pekerjaan (BAST)
// Sesuai Pasal 57 Perpres 16/2018 jo. Perpres 46/2025 & Perka LKPP 12/2021
// =============================================================================
function buildStage16Sections(ctx, tahapRow, keu, isFirstStageInDoc) {
  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, bendahara, settings } = ctx;
  const cleanKode = String(paket.kode_paket_internal || 'PBJ-2026-001').replace(/^CAKRA-/i, 'PBJ-');

  const noBaphp = paket.no_baphp || tahapRow.nomor_dokumen || ('016/BAPHP/' + cleanKode + '/PPK/VI/2026');
  const tglBaphpRaw = tahapRow.tanggal_dokumen || paket.tgl_baphp || paket.tgl_selesai_kontrak || '2026-06-09';
  const tglBaphpStr = formatTanggalIndo(tglBaphpRaw);
  const infoHariBaphp = formatHariTanggalBeritaAcara(tglBaphpRaw);
  const hariTanggalBaphp = `${infoHariBaphp.hari} tanggal ${infoHariBaphp.tanggalKata} bulan ${infoHariBaphp.bulan} tahun ${infoHariBaphp.tahunKata} (${tglBaphpStr})`;

  const noBast = paket.no_bast || ('016/BAST/' + cleanKode + '/PPK/VI/2026');
  const tglBastRaw = paket.tgl_bast || tglBaphpRaw;
  const tglBastStr = formatTanggalIndo(tglBastRaw);
  const infoHariBast = formatHariTanggalBeritaAcara(tglBastRaw);
  const hariTanggalBast = `${infoHariBast.hari} tanggal ${infoHariBast.tanggalKata} bulan ${infoHariBast.bulan} tahun ${infoHariBast.tahunKata} (${tglBastStr})`;

  const noKontrak = paket.no_kontrak || ('013/SP/' + cleanKode + '/PPK-PBJ/KPU-NGW/V/2026');
  const tglKontrakStr = formatTanggalIndo(paket.tgl_kontrak || '2026-05-27');
  const noSpp = paket.no_spp || ('014/SPP/' + cleanKode + '/PPK/V/2026');
  const tglSppStr = formatTanggalIndo(paket.tgl_spp || '2026-05-27');
  const noBaSpl = paket.no_ba_spl || ('014/BA-SPL/' + cleanKode + '/PPK/V/2026');
  const noLapWas = paket.no_laporan_pengendalian || ('015/LAP-WAS/' + cleanKode + '/PPK/VI/2026');
  const tglLapWasStr = formatTanggalIndo(paket.tgl_laporan_pengendalian || '2026-06-08');
  const noBaKom = paket.no_ba_komisioning || ('015/BA-KOM/' + cleanKode + '/PPK/VI/2026');
  const tglBaKomStr = formatTanggalIndo(paket.tgl_ba_komisioning || '2026-06-08');

  const durasiHari = Number(paket.masa_pelaksanaan_hari || 14);
  const tglMulaiStr = formatTanggalIndo(paket.tgl_mulai_kerja || '2026-05-27');
  const tglSelesaiStr = formatTanggalIndo(paket.tgl_selesai_kontrak || '2026-06-09');
  const lokasiFranco = paket.lokasi_pekerjaan || 'Ruang Server Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi';

  const namaPenyedia = penyedia.nama_perusahaan || 'CV. GRAFIKA PRATAMA NGAWI';
  const direkturPenyedia = penyedia.nama_direktur || 'HENDRA SURYAWAN';
  const jabatanPenyedia = penyedia.jabatan_penandatangan || 'Direktur';
  const teknisiRekanan = paket.pic_teknisi_rekanan || 'Ahmad Fauzi (Lead Systems Engineer)';

  const ppkNama = cleanNamaTanpaGelar((ppk && ppk.nama_lengkap) || 'MOHAMMAD NOOR JIHAN');
  const ppkNip = (ppk && ppk.nip) || '19840101 200912 1 001';
  const kpaNama = cleanNamaTanpaGelar((kpa && kpa.nama_lengkap) || 'BUDI RAHAYU');
  const kpaNip = (kpa && kpa.nip) || '19750824 200501 1 003';

  const nilaiKontrakRp = Number(paket.nilai_kontrak || 138000000);
  const nilaiKontrakStr = formatRupiah(nilaiKontrakRp);
  const hariTerlambat = Number(paket.hari_terlambat || 0);
  const dendaRp = Number(paket.denda_keterlambatan_rp || 0);
  const masaGaransiHari = Number(paket.masa_garansi_hari || 365);
  const tglMulaiGaransiStr = formatTanggalIndo(paket.tgl_mulai_garansi || tglBastRaw);
  const tglSelesaiGaransiStr = formatTanggalIndo(paket.tgl_selesai_garansi || '2027-06-09');

  // Titik Kritis Pemeriksaan BAPHP dinamis
  let baphpList = [];
  if (paket.parameter_pemeriksaan_baphp_json) {
    try {
      baphpList = typeof paket.parameter_pemeriksaan_baphp_json === 'string'
        ? JSON.parse(paket.parameter_pemeriksaan_baphp_json)
        : paket.parameter_pemeriksaan_baphp_json;
    } catch (e) {}
  }
  if (!Array.isArray(baphpList) || baphpList.length === 0) {
    baphpList = [
      { no: 1, titik_kritis: 'Verifikasi Kuantitas & Keutuhan Fisik Barang', standar: '1 Unit PC Server & 3 Unit PC Workstation lengkap segel pabrikan utuh', hasil: 'Diterima utuh 100% lengkap tanpa cacat fisik atau cacat logistik', status: 'MEMENUHI SYARAT' },
      { no: 2, titik_kritis: 'Kesesuaian Spesifikasi Teknis & Komponen Inti', standar: 'Dell PowerEdge T350, Dual Xeon, 64GB ECC, 2x 1.92TB NVMe RAID-1, Dual PSU', hasil: 'Spesifikasi hardware identik 100% dengan KAK & Surat Pesanan', status: 'MEMENUHI SYARAT' },
      { no: 3, titik_kritis: 'Validasi Uji Fungsi & Stabilitas Operasional', standar: 'Burn-in test 24 jam non-stop, redundansi PSU failover, stabilitas jaringan LAN', hasil: 'Sistem lulus uji beban puncak 24 jam tanpa error (BA-KOM terlampir)', status: 'MEMENUHI SYARAT' },
      { no: 4, titik_kritis: 'Legalitas Lisensi OS & Sertifikat Garansi Resmi', standar: 'Windows Server 2025 Standard COA digital aktif online, garansi pabrikan 1 tahun', hasil: 'Lisensi original teraktivasi digital, sertifikat garansi resmi ATPM sah', status: 'MEMENUHI SYARAT' },
      { no: 5, titik_kritis: 'Kelengkapan Dokumen Serah Terima & Manual', standar: 'Surat jalan, manual operasional bahasa Indonesia, CD driver/recovery firmware', hasil: 'Seluruh bundel dokumentasi teknis dan panduan operasional diserahkan lengkap', status: 'MEMENUHI SYARAT' }
    ];
  }

  // Tabel 5 Titik Kritis BAPHP
  let baphpTableRows = [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('NO', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('TITIK KRITIS PEMERIKSAAN BAPHP', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('STANDAR KONTRAK / KAK', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 23, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('HASIL PEMERIKSAAN FAKTUAL', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
        new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('KESIMPULAN', { align: AlignmentType.CENTER, bold: true, size: 17 })] })
      ]
    })
  ];

  baphpList.forEach((b, idx) => {
    const statusStr = String(b.status || 'MEMENUHI SYARAT').toUpperCase();
    const statusColor = statusStr.includes('TIDAK') || statusStr.includes('GAGAL') ? 'DC2626' : (statusStr.includes('PERBAIKAN') || statusStr.includes('PENDING') ? 'D97706' : '15803D');
    baphpTableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 17 })] }),
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(b.titik_kritis || b.parameter || '', { bold: true, size: 17, color: '0F172A' })] }),
          new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(b.standar || b.metode || '', { size: 16.5, color: '334155' })] }),
          new TableCell({ width: { size: 23, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(b.hasil || '', { size: 16.5, color: '334155' })] }),
          new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(b.status || 'MEMENUHI SYARAT', { align: AlignmentType.CENTER, bold: true, size: 16, color: statusColor })] })
        ]
      })
    );
  });

  // Builder Tabel Rincian Barang BAPHP & BAST (Menghasilkan instance TableRow fresh)
  function buildRincianBarangTableRows() {
    const rows = [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('NO', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
          new TableCell({ width: { size: 38, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('NAMA BARANG / DESKRIPSI SPESIFIKASI', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
          new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('VOLUME', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
          new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('HARGA SATUAN (RP)', { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
          new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('TOTAL HARGA (RP)', { align: AlignmentType.CENTER, bold: true, size: 17 })] })
        ]
      })
    ];

    (items || []).forEach((it, idx) => {
      const vol = Number(it.volume || 1);
      const hargaSat = Number(it.harga_satuan_kontrak || it.harga_satuan_hps || 0);
      const totHarga = vol * hargaSat;
      const namaBarang = it.uraian_item || it.merk_tipe_katalog || it.nama_barang || it.nama_item || 'Barang Pengadaan';
      const spekRingkas = it.spesifikasi_ringkas || ((it.merk_tipe_katalog && it.merk_tipe_katalog !== namaBarang ? `[${it.merk_tipe_katalog}] ` : '') + (it.spesifikasi_teknis ? it.spesifikasi_teknis.slice(0, 180) + '...' : ''));
      rows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ width: { size: 5, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 17 })] }),
            new TableCell({ width: { size: 38, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [
              pText(namaBarang, { bold: true, size: 17, color: '0F172A' }),
              ...(spekRingkas ? [pText(spekRingkas, { italic: true, size: 15, color: '475569', before: 2 })] : [])
            ] }),
            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(`${vol} ${it.satuan || 'Unit'}`, { align: AlignmentType.CENTER, bold: true, size: 17 })] }),
            new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(formatRupiah(hargaSat), { align: AlignmentType.RIGHT, size: 17 })] }),
            new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(formatRupiah(totHarga), { align: AlignmentType.RIGHT, bold: true, size: 17 })] })
          ]
        })
      );
    });

    // Baris Total DPP, PPN, dan Total Kontrak
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ width: { size: 58, type: WidthType.PERCENTAGE }, columnSpan: 3, borders: BORDER_TABLE, shading: { fill: 'F8FAFC' }, children: [pText('TOTAL NILAI KONTRAK SEBELUM PPN (DPP)', { bold: true, align: AlignmentType.RIGHT, size: 17 })] }),
          new TableCell({ width: { size: 42, type: WidthType.PERCENTAGE }, columnSpan: 2, borders: BORDER_TABLE, shading: { fill: 'F8FAFC' }, children: [pText(formatRupiah(Math.round(nilaiKontrakRp / 1.11)), { bold: true, align: AlignmentType.RIGHT, size: 17 })] })
        ]
      }),
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ width: { size: 58, type: WidthType.PERCENTAGE }, columnSpan: 3, borders: BORDER_TABLE, shading: { fill: 'F8FAFC' }, children: [pText('PAJAK PERTAMBAHAN NILAI (PPN 11%)', { bold: true, align: AlignmentType.RIGHT, size: 17 })] }),
          new TableCell({ width: { size: 42, type: WidthType.PERCENTAGE }, columnSpan: 2, borders: BORDER_TABLE, shading: { fill: 'F8FAFC' }, children: [pText(formatRupiah(nilaiKontrakRp - Math.round(nilaiKontrakRp / 1.11)), { bold: true, align: AlignmentType.RIGHT, size: 17 })] })
        ]
      }),
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({ width: { size: 58, type: WidthType.PERCENTAGE }, columnSpan: 3, borders: BORDER_TABLE, shading: { fill: 'EFF6FF' }, children: [pText('TOTAL NILAI KONTRAK TERMASUK PPN 11% (LUMPSUM)', { bold: true, align: AlignmentType.RIGHT, size: 17.5, color: '1E3A8A' })] }),
          new TableCell({ width: { size: 42, type: WidthType.PERCENTAGE }, columnSpan: 2, borders: BORDER_TABLE, shading: { fill: 'EFF6FF' }, children: [pText(formatRupiah(nilaiKontrakRp), { bold: true, align: AlignmentType.RIGHT, size: 17.5, color: '1E3A8A' })] })
        ]
      })
    );
    return rows;
  }

  // Builder Tabel Rekonsiliasi Pembayaran Kontrak & Potongan Denda (Khusus Bendahara / Penerbit SPM / Operator SAKTI)
  function buildRekonsiliasiPembayaranTable(nilaiKontrak, denda) {
    const dppKontrak = Math.round(nilaiKontrak / 1.11);
    const ppnKontrak = nilaiKontrak - dppKontrak;
    const hakBersih = nilaiKontrak - denda;

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      alignment: AlignmentType.CENTER,
      borders: BORDER_TABLE,
      rows: [
        new TableRow({
          tableHeader: true,
          cantSplit: true,
          children: [
            new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('KOMPONEN PEMBAYARAN & POTONGAN', { align: AlignmentType.CENTER, bold: true, size: 16.5 })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('NILAI RUPIAH (RP)', { align: AlignmentType.CENTER, bold: true, size: 16.5 })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: 'F1F5F9' }, borders: BORDER_TABLE, children: [pText('KETERANGAN AKUNTANSI / SAKTI', { align: AlignmentType.CENTER, bold: true, size: 16.5 })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('1. Nilai Bruto Kontrak (Prestasi Fisik 100%)', { bold: true, size: 16.5, color: '0F172A' })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText(formatRupiah(nilaiKontrak), { align: AlignmentType.RIGHT, bold: true, size: 16.5 })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, children: [pText('Beban Pagu Anggaran MAK 532111', { size: 15.5, color: '334155' })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC' }, children: [pText('   • Dasar Pengenaan Pajak (DPP sebelum PPN)', { size: 16, color: '475569' })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC' }, children: [pText(formatRupiah(dppKontrak), { align: AlignmentType.RIGHT, size: 16 })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC' }, children: [pText('Dasar Perhitungan Kewajaran & Denda', { size: 15.5, color: '64748B' })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC' }, children: [pText('   • Pajak Pertambahan Nilai (PPN 11%)', { size: 16, color: '475569' })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC' }, children: [pText(formatRupiah(ppnKontrak), { align: AlignmentType.RIGHT, size: 16 })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F8FAFC' }, children: [pText('Kewajiban Pungut Pajak Instansi Pemerintah', { size: 15.5, color: '64748B' })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: denda > 0 ? 'FEF2F2' : 'F8FAFC' }, children: [pText('2. Potongan Sanksi Denda Keterlambatan (Pasal 2 BAST)', { bold: true, size: 16.5, color: denda > 0 ? 'DC2626' : '0F172A' })] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: denda > 0 ? 'FEF2F2' : 'F8FAFC' }, children: [pText(denda > 0 ? `(${formatRupiah(denda)})` : 'Rp 0,-', { align: AlignmentType.RIGHT, bold: true, size: 16.5, color: denda > 0 ? 'DC2626' : '15803D' })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: denda > 0 ? 'FEF2F2' : 'F8FAFC' }, children: [pText(denda > 0 ? 'Potongan SPM Akun 425161 (Setor Kas Negara)' : 'Nihil / Tepat Waktu', { size: 15.5, color: denda > 0 ? 'B91C1C' : '15803D' })] })
          ]
        }),
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'EFF6FF' }, children: [
              pText('HAK BERSIH PEMBAYARAN PENYEDIA (NETTO)', { bold: true, size: 17, color: '1E3A8A' }),
              pText('(Sebelum pemotongan PPh sesuai ketentuan perpajakan)', { italic: true, size: 14.5, color: '475569', before: 2 })
            ] }),
            new TableCell({ width: { size: 25, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'EFF6FF' }, children: [pText(formatRupiah(hakBersih), { align: AlignmentType.RIGHT, bold: true, size: 17.5, color: '1E3A8A' })] }),
            new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'EFF6FF' }, children: [pText('Nilai Bersih SPP/SPM-LS ke Rekening Penyedia', { bold: true, size: 15.5, color: '1E3A8A' })] })
          ]
        })
      ]
    });
  }

  const makeHeader = (title, docNo) => new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 0, after: 30 },
        children: [
          new TextRun({
            text: `SI-PRABU v3.0 — ${title} | ${docNo}`,
            italic: true,
            size: 15,
            font: 'Cambria',
            color: '64748B'
          })
        ]
      })
    ]
  });

  const makeFooter = (label, docNo) => new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 20, after: 0 },
        children: [
          new TextRun({
            text: `Dokumen Sah Tahap 16 (${label}) | Hal. `,
            size: 15,
            font: 'Cambria',
            color: '64748B'
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            size: 15,
            font: 'Cambria',
            color: '64748B'
          }),
          new TextRun({
            text: ' dari ',
            size: 15,
            font: 'Cambria',
            color: '64748B'
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            size: 15,
            font: 'Cambria',
            color: '64748B'
          })
        ]
      })
    ]
  });

  // =========================================================================
  // DOKUMEN 01: BERITA ACARA PEMERIKSAAN HASIL PEKERJAAN (BAPHP)
  // =========================================================================
  const secBaphp = {
    properties: {
      page: {
        margin: { top: 1200, right: 1200, bottom: 1200, left: 1400 },
        size: { width: 11906, height: 16838 }
      }
    },
    headers: {
      default: makeHeader('BERITA ACARA PEMERIKSAAN HASIL PEKERJAAN (BAPHP)', noBaphp)
    },
    footers: {
      default: makeFooter('BAPHP Tahap 16', noBaphp)
    },
    children: [
      ...buildKopSuratKpu(settings),
      pText('BERITA ACARA PEMERIKSAAN HASIL PEKERJAAN (BAPHP)', {
        align: AlignmentType.CENTER,
        bold: true,
        size: 21,
        color: '0F172A',
        before: 60,
        after: 4
      }),
      pText(`Nomor: ${noBaphp}`, {
        align: AlignmentType.CENTER,
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 0,
        after: 120
      }),
      pText(`Pada hari ini, ${hariTanggalBaphp}, bertempat di ${lokasiFranco}, kami yang bertanda tangan di bawah ini:`, {
        align: AlignmentType.JUSTIFY,
        size: 18,
        line: 270,
        before: 0,
        after: 40
      }),

      // Pihak-pihak Pemeriksa
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('1.', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Nama', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 69, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(ppkNama, { bold: true, size: 17, color: '0F172A' })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('', { size: 17 })] }),
              new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('NIP', { size: 17 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { size: 17 })] }),
              new TableCell({ width: { size: 69, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(ppkNip, { size: 17 })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('', { size: 17 })] }),
              new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Jabatan', { size: 17 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { size: 17 })] }),
              new TableCell({ width: { size: 69, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Pejabat Pembuat Komitmen (PPK) / Koordinator Tim Pemeriksa Teknis Pengadaan KPU Kabupaten Ngawi', { size: 17 })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('2.', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Nama Teknisi Rekanan', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 69, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(teknisiRekanan, { bold: true, size: 17, color: '0F172A' })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('', { size: 17 })] }),
              new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Badan Usaha Penyedia', { size: 17 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { size: 17 })] }),
              new TableCell({ width: { size: 69, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(namaPenyedia, { size: 17 })] })
            ]
          })
        ]
      }),

      pText('A. RUJUKAN DOKUMEN & DASAR PELAKSANAAN PEMERIKSAAN:', {
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 120,
        after: 30
      }),
      pText('Pemeriksaan hasil pekerjaan ini dilaksanakan dengan mempedomani ketentuan perundang-undangan dan instrumen kontrak sah sebagai berikut:', {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        before: 0,
        after: 20
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: 'Pasal 57 Perpres No. 16/2018 jo. Perpres No. 12/2021 jo. Perpres No. 46/2025 tentang Pengadaan Barang/Jasa Pemerintah;', size: 17, font: 'Cambria' })]
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: 'Peraturan LKPP No. 12 Tahun 2021 tentang Pedoman Pelaksanaan Pengadaan Barang/Jasa Pemerintah Melalui Penyedia;', size: 17, font: 'Cambria' })]
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: 'Keputusan KPU No. 1493 Tahun 2024 tentang Pedoman Teknis Pengadaan Barang/Jasa di Lingkungan Komisi Pemilihan Umum;', size: 17, font: 'Cambria' })]
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: `Surat Pesanan (Kontrak) Nomor: ${noKontrak} tanggal ${tglKontrakStr};`, size: 17, font: 'Cambria' })]
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: `Surat Perintah Pengiriman (SPP) Nomor: ${noSpp} tanggal ${tglSppStr};`, size: 17, font: 'Cambria' })]
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: `Berita Acara Serah Terima Lokasi (BA-SPL) Nomor: ${noBaSpl} tanggal ${tglSppStr};`, size: 17, font: 'Cambria' })]
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: `Laporan Pengawasan & Pengendalian Kemajuan Kontrak (LAP-WAS) Nomor: ${noLapWas} tanggal ${tglLapWasStr};`, size: 17, font: 'Cambria' })]
      }),
      new Paragraph({
        bullet: { level: 0 },
        children: [new TextRun({ text: `Berita Acara Pengujian Fungsi & Komisioning Teknis (BA-KOM) Nomor: ${noBaKom} tanggal ${tglBaKomStr} dengan hasil LULUS 100%.`, size: 17, font: 'Cambria' })]
      }),

      pText('B. HASIL VERIFIKASI 5 TITIK KRITIS PEMERIKSAAN FAKTUAL:', {
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 120,
        after: 30
      }),
      pText('Berdasarkan pengujian teknis, pengukuran fisik, dan penelaahan administratif yang dilakukan secara bersama-sama di lokasi Franco Kantor KPU Kabupaten Ngawi, diperoleh hasil verifikasi 5 (lima) titik kritis sebagai berikut:', {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        before: 0,
        after: 30
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: BORDER_TABLE,
        rows: baphpTableRows
      }),

      pText('C. RINCIAN PERANGKAT HASIL PEKERJAAN YANG DIPERIKSA:', {
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 60,
        after: 30,
        pageBreakBefore: true
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: BORDER_TABLE,
        rows: buildRincianBarangTableRows()
      }),

      pText('D. KESIMPULAN & REKOMENDASI HASIL PEMERIKSAAN:', {
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 120,
        after: 30
      }),
      pText(`Berdasarkan hasil pemeriksaan fisik, verifikasi kuantitas, kesesuaian spesifikasi teknis, pengujian komisioning burn-in 24 jam non-stop, serta kelengkapan administrasi dan garansi resmi, Tim Teknis Pemeriksa Pengadaan KPU Kabupaten Ngawi berkesimpulan bahwa:`, {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        line: 270,
        before: 0,
        after: 20
      }),
      (() => {
        const anyTidakMemenuhi = baphpList.some(b => String(b.status || '').toUpperCase().includes('TIDAK') || String(b.status || '').toUpperCase().includes('GAGAL'));
        const anyPerluPerbaikan = baphpList.some(b => String(b.status || '').toUpperCase().includes('PERBAIKAN') || String(b.status || '').toUpperCase().includes('PENDING'));

        let p1 = '1. PEKERJAAN TELAH SELESAI 100% (SERATUS PERSEN) DENGAN KONDISI BAIK, BERFUNGSI SEMPURNA, DAN SESUAI DENGAN SPESIFIKASI TEKNIS SERTA VOLUME YANG DITETAPKAN DALAM KONTRAK.';
        let p2 = '2. Hasil pekerjaan pengadaan dinyatakan DITERIMA DENGAN LENGKAP DAN BAIK, serta DIREKOMENDASIKAN KEPADA PEJABAT PEMBUAT KOMITMEN (PPK) UNTUK SEGERA DITERBITKAN BERITA ACARA SERAH TERIMA PERTAMA PEKERJAAN (BAST).';
        let c1 = '15803D';
        let c2 = '1E3A8A';

        if (anyTidakMemenuhi) {
          p1 = '1. PEKERJAAN BELUM DAPAT DITERIMA KARENA TERDAPAT KETIDAKSESUAIAN SPESIFIKASI TEKNIS ATAU CACAT FISIK PADA KOMPONEN BARANG.';
          p2 = '2. Hasil pekerjaan pengadaan dinyatakan DITOLAK / DITANGGUHKAN, serta DIREKOMENDASIKAN KEPADA PENYEDIA UNTUK MELAKUKAN PENGGANTIAN UNIT BARANG BARU SESUAI KETENTUAN KONTRAK.';
          c1 = 'DC2626';
          c2 = 'DC2626';
        } else if (anyPerluPerbaikan) {
          p1 = '1. PEKERJAAN DITERIMA BERSYARAT DENGAN CATATAN PENYEMPURNAAN DAN PERBAIKAN MINOR SECARA TEKNIS.';
          p2 = '2. Penyedia diberikan tenggang waktu perbaikan selama 7 (tujuh) hari kalender terhitung sejak penandatanganan BAPHP ini sebelum Berita Acara Serah Terima (BAST) diterbitkan.';
          c1 = 'D97706';
          c2 = '1E3A8A';
        }

        return new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: BORDER_NONE,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  borders: BORDER_NONE,
                  children: [
                    pText(p1, { bold: true, size: 17.5, color: c1, before: 10, after: 10 }),
                    pText(p2, { bold: true, size: 17.5, color: c2, before: 0, after: 80 })
                  ]
                })
              ]
            })
          ]
        });
      })(),
      pText('Demikian Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP) ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya.', {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        before: 0,
        after: 100
      }),

      // Tanda Tangan BAPHP
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 48, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Penyedia Barang/Jasa:', { align: AlignmentType.CENTER, size: 17, color: '475569', before: 0, after: 2 }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, bold: true, size: 17.5, color: '1E3A8A', before: 0, after: 0 }),
                  pText('Teknisi Pelaksana / Lead Engineer,', { align: AlignmentType.CENTER, italic: true, size: 16.5, before: 0, after: 80 }),
                  pText(teknisiRekanan, { align: AlignmentType.CENTER, bold: true, size: 18, color: '0F172A', before: 0, after: 4 }),
                  pText('Sertifikasi Teknisi Resmi Pabrikan Dell EMC', { align: AlignmentType.CENTER, size: 16, color: '64748B', before: 0, after: 0 })
                ]
              }),
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('', { size: 17 })] }),
              new TableCell({
                width: { size: 48, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('Pejabat Pembuat Komitmen (PPK)', { align: AlignmentType.CENTER, size: 17, color: '475569', before: 0, after: 2 }),
                  pText((settings.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase(), { align: AlignmentType.CENTER, bold: true, size: 17.5, color: '1E3A8A', before: 0, after: 0 }),
                  pText('Koordinator Tim Pemeriksa Teknis,', { align: AlignmentType.CENTER, italic: true, size: 16.5, before: 0, after: 80 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, size: 18, color: '0F172A', before: 0, after: 4 }),
                  pText(`NIP. ${ppkNip}`, { align: AlignmentType.CENTER, size: 16, color: '64748B', before: 0, after: 0 })
                ]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 100, type: WidthType.PERCENTAGE },
                columnSpan: 3,
                borders: BORDER_NONE,
                children: [
                  pText('Saksi / Tim Teknis Pemeriksa Pengadaan KPU Kabupaten Ngawi:', { align: AlignmentType.CENTER, italic: true, size: 17, color: '475569', before: 60, after: 2 }),
                  pText('TIM TEKNIS SUBBAGIAN RENDATIN KPU NGAWI', { align: AlignmentType.CENTER, bold: true, size: 17.5, color: '1E3A8A', before: 0, after: 80 }),
                  pText('( _______________________________ )', { align: AlignmentType.CENTER, bold: true, size: 18, color: '0F172A', before: 0, after: 4 }),
                  pText('Pranata Komputer / Pengelola TI Satker KPU Kab. Ngawi', { align: AlignmentType.CENTER, size: 16, color: '64748B', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  // =========================================================================
  // DOKUMEN 02: BERITA ACARA SERAH TERIMA PERTAMA PEKERJAAN (BAST)
  // =========================================================================
  const secBast = {
    properties: {
      page: {
        margin: { top: 1200, right: 1200, bottom: 1200, left: 1400 },
        size: { width: 11906, height: 16838 }
      }
    },
    headers: {
      default: makeHeader('BERITA ACARA SERAH TERIMA PERTAMA PEKERJAAN (BAST)', noBast)
    },
    footers: {
      default: makeFooter('BAST Tahap 16', noBast)
    },
    children: [
      ...buildKopSuratKpu(settings),
      pText('BERITA ACARA SERAH TERIMA PERTAMA PEKERJAAN (BAST)', {
        align: AlignmentType.CENTER,
        bold: true,
        size: 21,
        color: '0F172A',
        before: 60,
        after: 4
      }),
      pText(`Nomor: ${noBast}`, {
        align: AlignmentType.CENTER,
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 0,
        after: 120
      }),
      pText(`Pada hari ini, ${hariTanggalBast}, bertempat di ${lokasiFranco}, kami yang bertanda tangan di bawah ini:`, {
        align: AlignmentType.JUSTIFY,
        size: 18,
        line: 270,
        before: 0,
        after: 40
      }),

      // Pihak-pihak BAST
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('1.', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Nama', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 71, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(ppkNama, { bold: true, size: 17, color: '0F172A' })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('', { size: 17 })] }),
              new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('NIP', { size: 17 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { size: 17 })] }),
              new TableCell({ width: { size: 71, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(ppkNip, { size: 17 })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('', { size: 17 })] }),
              new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Jabatan', { size: 17 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { size: 17 })] }),
              new TableCell({ width: { size: 71, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Pejabat Pembuat Komitmen (PPK) KPU Kabupaten Ngawi, bertindak untuk dan atas nama Kuasa Pengguna Anggaran KPU Kabupaten Ngawi yang berkedudukan di Jl. Untung Suropati No. 48 Ngawi, selanjutnya disebut sebagai PIHAK KESATU.', { size: 17, line: 240 })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('2.', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Nama', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { bold: true, size: 17 })] }),
              new TableCell({ width: { size: 71, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(direkturPenyedia, { bold: true, size: 17, color: '0F172A' })] })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('', { size: 17 })] }),
              new TableCell({ width: { size: 22, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('Jabatan', { size: 17 })] }),
              new TableCell({ width: { size: 3, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(':', { size: 17 })] }),
              new TableCell({ width: { size: 71, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText(`${jabatanPenyedia} ${namaPenyedia}, bertindak untuk dan atas nama ${namaPenyedia} yang berkedudukan di Jl. PB Sudirman No. 12 Ngawi, selanjutnya disebut sebagai PIHAK KEDUA.`, { size: 17, line: 240 })] })
            ]
          })
        ]
      }),

      pText('Berdasarkan Surat Pesanan (Kontrak) Nomor: ' + noKontrak + ' tanggal ' + tglKontrakStr + ' dan Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP) Nomor: ' + noBaphp + ' tanggal ' + tglBaphpStr + ', kedua belah pihak secara bersama-sama sepakat mengikatkan diri dalam Berita Acara Serah Terima Pertama Pekerjaan ini dengan ketentuan dan syarat-syarat sebagai berikut:', {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        line: 270,
        before: 60,
        after: 40
      }),

      // 5 PASAL KESEPAKATAN BAST
      pText('PASAL 1: PENYERAHAN DAN PENERIMAAN HASIL PEKERJAAN', {
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 60,
        after: 10
      }),
      pText(`PIHAK KEDUA menyerahkan kepada PIHAK KESATU dan PIHAK KESATU menerima dengan baik, lengkap, dan sempurna hasil pekerjaan pengadaan "${paket.nama_paket}" yang telah terpasang dan beroperasi optimal di ${lokasiFranco} dengan rincian barang serah terima sebagai berikut:`, {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        line: 270,
        before: 0,
        after: 30
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: BORDER_TABLE,
        rows: buildRincianBarangTableRows()
      }),

      pText('PASAL 2: KEPATUHAN WAKTU PELAKSANAAN & EVALUASI DENDA KETERLAMBATAN', {
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 60,
        after: 10,
        pageBreakBefore: true
      }),
      pText(`Jangka waktu pelaksanaan pekerjaan ditetapkan selama ${durasiHari} (${terbilangInt(durasiHari)}) hari kalender terhitung sejak tanggal ${tglMulaiStr} sampai dengan tanggal ${tglSelesaiStr}. ${
        (() => {
          let rincianLate = [];
          if (paket.realisasi_item_bast_json) {
            try {
              const pItems = typeof paket.realisasi_item_bast_json === 'string'
                ? JSON.parse(paket.realisasi_item_bast_json)
                : paket.realisasi_item_bast_json;
              if (Array.isArray(pItems)) {
                pItems.forEach(it => {
                  if (Number(it.hari_terlambat || 0) > 0) {
                    const dendaNilai = it.denda_rp !== undefined ? it.denda_rp : (it.denda_item || 0);
                    rincianLate.push(`${it.uraian_item || it.nama_item || 'Item'} (terlambat ${it.hari_terlambat} hari kalender, denda bagian kontrak ${formatRupiah(dendaNilai)})`);
                  }
                });
              }
            } catch (e) {}
          }

          if (rincianLate.length > 0) {
            return `Realisasi penyelesaian fisik dan serah terima pekerjaan diselesaikan pada tanggal ${tglBastStr}. Berdasarkan verifikasi kedatangan barang, terdapat penyerahan bertahap (parsial) dengan kronologis sebagai berikut:\n` +
              `a. Bagian pekerjaan berupa 3 (tiga) Unit PC Workstation Operasional Pengolah Data SIDALIH telah diserahkan tepat waktu pada tanggal ${tglSelesaiStr} dalam kondisi lengkap dan berfungsi penuh secara mandiri, sebagaimana dibuktikan dengan Surat Tanda Terima Barang Sementara (STTBS) Nomor: 016/STTBS/${cleanKode}/PPK/VI/2026 tanggal ${tglSelesaiStr} (Keterlambatan = 0 hari, Denda = Rp 0,-).\n` +
              `b. Bagian pekerjaan berupa 1 (satu) Unit PC Server Tower Database Operasional SIDALIH & Logistik diserahkan pada tanggal ${tglBastStr}, sehingga mengalami keterlambatan penyerahan selama 1 (satu) hari kalender dari batas waktu kontrak tanggal ${tglSelesaiStr}.\n` +
              `Sesuai ketentuan Pasal 79 ayat (4) huruf b Perpres Nomor 16 Tahun 2018 jo. Perpres Nomor 12 Tahun 2021 dan klausul SSKK Surat Pesanan, karena bagian pekerjaan yang diserahkan terlebih dahulu telah dapat berfungsi dan dimanfaatkan secara mandiri oleh PPK, maka sanksi denda keterlambatan dikenakan sebesar 1‰ (satu permil) per hari dari Nilai Bagian Kontrak sebelum PPN (DPP) atas item yang terlambat dengan total denda sebesar ${formatRupiah(dendaRp)} (${terbilangRupiah(dendaRp)}). Sanksi denda keterlambatan tersebut disetor ke Kas Negara sebagai Penerimaan Negara Bukan Pajak (PNBP) Akun 425161 melalui mekanisme pemotongan langsung pada pengajuan Surat Perintah Membayar Langsung (SPM-LS).`;
          } else if (hariTerlambat > 0) {
            return `Realisasi penyelesaian fisik dan serah terima pekerjaan diselesaikan pada tanggal ${tglBastStr} (terdapat keterlambatan selama ${hariTerlambat} hari kalender dari batas waktu kontrak tanggal ${tglSelesaiStr}). Sesuai ketentuan Pasal 79 ayat (4) huruf a Perpres Nomor 16 Tahun 2018 jo. Perpres Nomor 12 Tahun 2021 dan klausul Surat Pesanan, PIHAK KEDUA dikenakan sanksi denda keterlambatan sebesar 1‰ (satu permil) per hari dari Nilai Kontrak sebelum PPN (DPP) dengan total denda sebesar ${formatRupiah(dendaRp)} (${terbilangRupiah(dendaRp)}) yang disetor ke Kas Negara (Akun 425161) melalui pemotongan langsung pada pengajuan SPM-LS.`;
          } else {
            return `Realisasi penyelesaian fisik dan serah terima pekerjaan diselesaikan pada tanggal ${tglBastStr} (tepat waktu / 0 hari keterlambatan), sehingga PIHAK KEDUA dibebaskan dari sanksi denda keterlambatan sebesar Rp 0,- (Nihil Rupiah).`;
          }
        })()
      }`, {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        line: 270,
        before: 0,
        after: 40
      }),

      pText('PASAL 3: NILAI KONTRAK, REKONSILIASI PEMBAYARAN DAN HAK BERSIH PENYEDIA', {
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 60,
        after: 10
      }),
      pText(`(1) Nilai Kontrak pengadaan sebagaimana tercantum dalam Surat Pesanan Nomor: ${noKontrak} tanggal ${tglKontrakStr} adalah sebesar ${nilaiKontrakStr} (${terbilangRupiah(nilaiKontrakRp)}) termasuk PPN 11%.`, {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        line: 270,
        before: 0,
        after: 20
      }),
      pText(`(2) Atas penyelesaian prestasi pekerjaan sebesar 100% (seratus persen) dan dengan memperhitungkan kewajiban sanksi denda keterlambatan sebagaimana ditetapkan pada Pasal 2 di atas, PIHAK KESATU dan PIHAK KEDUA menyepakati rekonsiliasi perhitungan pembayaran tagihan (sebagai pedoman definitif bagi Bendahara Pengeluaran, Pejabat Penandatangan SPM, dan Operator SAKTI) dengan rincian sebagai berikut:`, {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        line: 270,
        before: 0,
        after: 30
      }),
      buildRekonsiliasiPembayaranTable(nilaiKontrakRp, dendaRp),
      pText(`(3) Pembayaran hak bersih sebesar ${formatRupiah(nilaiKontrakRp - dendaRp)} (${terbilangRupiah(nilaiKontrakRp - dendaRp)}) akan dibayarkan secara sekaligus 100% (lunas) melalui mekanisme Surat Perintah Membayar Langsung (SPM-LS) yang diterbitkan oleh Penerbit SPM KPU Kabupaten Ngawi kepada Kantor Pelayanan Perbendaharaan Negara (KPPN) Madiun untuk disalurkan langsung ke rekening resmi PIHAK KEDUA setelah seluruh dokumen pertanggungjawaban dinyatakan lengkap dan sah.`, {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        line: 270,
        before: 30,
        after: 40
      }),

      pText('PASAL 4: JAMINAN PURNA JUAL & MASA PEMELIHARAAN (GARANSI)', {
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 60,
        after: 10
      }),
      pText(`PIHAK KEDUA memberikan Jaminan Purna Jual Resmi Pabrikan selama ${masaGaransiHari} (tiga ratus enam puluh lima) hari kalender, terhitung sejak tanggal ${tglMulaiGaransiStr} sampai dengan tanggal ${tglSelesaiGaransiStr}. Selama masa garansi/pemeliharaan ini, PIHAK KEDUA wajib menyediakan layanan perbaikan teknis di lokasi (onsite) dengan Service Level Agreement (SLA) respon perbaikan maksimal 1x24 jam sejak laporan kerusakan diterima tanpa membebankan biaya suku cadang dan jasa teknisi. Sesuai ketentuan dokumen pengadaan dan kepemilikan sertifikat garansi resmi ATPM, pengadaan ini dibebaskan dari pemotongan uang retensi 5%.`, {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        line: 270,
        before: 0,
        after: 40
      }),

      pText('PASAL 5: PENUTUP & KEKUATAN HUKUM', {
        bold: true,
        size: 18,
        color: '1E3A8A',
        before: 60,
        after: 10
      }),
      pText('Berita Acara Serah Terima Pertama Pekerjaan ini dibuat dan ditandatangani oleh kedua belah pihak dalam rangkap 2 (dua) asli bermeterai cukup Rp 10.000,- dan memiliki kekuatan hukum yang sama bagi masing-masing pihak untuk dipergunakan sebagai kelengkapan dokumen pembayaran dan penatausahaan Barang Milik Negara (BMN).', {
        align: AlignmentType.JUSTIFY,
        size: 17.5,
        line: 270,
        before: 0,
        after: 80
      }),

      // Tanda Tangan BAST
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        alignment: AlignmentType.CENTER,
        borders: BORDER_NONE,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              new TableCell({
                width: { size: 48, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KEDUA', { align: AlignmentType.CENTER, bold: true, size: 17.5, color: '1E3A8A', before: 0, after: 2 }),
                  pText(namaPenyedia, { align: AlignmentType.CENTER, bold: true, size: 17, color: '0F172A', before: 0, after: 0 }),
                  pText(jabatanPenyedia + ',', { align: AlignmentType.CENTER, italic: true, size: 16.5, before: 0, after: 10 }),
                  new Table({
                    width: { size: 60, type: WidthType.PERCENTAGE },
                    alignment: AlignmentType.CENTER,
                    borders: BORDER_TABLE,
                    rows: [
                      new TableRow({
                        children: [
                          new TableCell({
                            width: { size: 100, type: WidthType.PERCENTAGE },
                            borders: BORDER_TABLE,
                            shading: { fill: 'F8FAFC' },
                            children: [
                              pText('METERAI ELEKTRONIK', { align: AlignmentType.CENTER, bold: true, size: 14, color: '64748B', before: 10, after: 2 }),
                              pText('Rp 10.000,-', { align: AlignmentType.CENTER, bold: true, size: 16, color: '0F172A', before: 0, after: 10 })
                            ]
                          })
                        ]
                      })
                    ]
                  }),
                  pText(direkturPenyedia, { align: AlignmentType.CENTER, bold: true, size: 18, color: '0F172A', before: 20, after: 4 }),
                  pText('Penyedia Barang/Jasa Sah Terdaftar SPSE', { align: AlignmentType.CENTER, size: 16, color: '64748B', before: 0, after: 0 })
                ]
              }),
              new TableCell({ width: { size: 4, type: WidthType.PERCENTAGE }, borders: BORDER_NONE, children: [pText('', { size: 17 })] }),
              new TableCell({
                width: { size: 48, type: WidthType.PERCENTAGE },
                borders: BORDER_NONE,
                children: [
                  pText('PIHAK KESATU', { align: AlignmentType.CENTER, bold: true, size: 17.5, color: '1E3A8A', before: 0, after: 2 }),
                  pText('PEJABAT PEMBUAT KOMITMEN (PPK)', { align: AlignmentType.CENTER, bold: true, size: 17, color: '0F172A', before: 0, after: 0 }),
                  pText((settings.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase(), { align: AlignmentType.CENTER, italic: true, size: 16.5, before: 0, after: 70 }),
                  pText(ppkNama, { align: AlignmentType.CENTER, bold: true, size: 18, color: '0F172A', before: 0, after: 4 }),
                  pText(`NIP. ${ppkNip}`, { align: AlignmentType.CENTER, size: 16, color: '64748B', before: 0, after: 0 })
                ]
              })
            ]
          })
        ]
      })
    ]
  };

  // =========================================================================
  // DOKUMEN 03: SURAT TANDA TERIMA BARANG SEMENTARA (STTBS - PARSIAL)
  // Dilampirkan resmi sebagai bukti kedatangan fisik barang parsial tepat waktu
  // =========================================================================
  const noSttbs = paket.no_sttbs || ('016/STTBS/' + cleanKode + '/PPK/VI/2026');
  const tglSttbs = '2026-06-09';
  const waktuSttbs = '14.30 WIB';
  const noSj = '088/SJ-GP/VI/2026';
  const tglSj = '2026-06-09';
  const namaPenerima = 'Pengurus Barang / Pejabat Pemeriksa Pengadaan KPU Ngawi';
  const namaPenyerah = `Petugas Logistik / Ekspedisi ${namaPenyedia}`;
  const catatanSttbs = 'Barang diterima secara fisik parsial dalam kondisi baik dan tersegel pabrikan utuh. Pemeriksaan uji fungsi komisioning penuh (BAPHP) dan Berita Acara Serah Terima (BAST) definitif akan diterbitkan setelah seluruh barang (termasuk sisa item) tiba lengkap 100%.';

  const selectedItemsSttbs = (items || []).filter(it => {
    const name = (it.uraian_item || it.nama_barang || it.nama_item || '').toLowerCase();
    return name.includes('workstation') || !name.includes('server');
  });

  const sttbsTableRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('NO', { bold: true, align: AlignmentType.CENTER, size: 17, before: 6, after: 6 })] }),
        new TableCell({ width: { size: 44, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('NAMA BARANG / ITEM PEKERJAAN', { bold: true, align: AlignmentType.CENTER, size: 17, before: 6, after: 6 })] }),
        new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('VOL DITERIMA', { bold: true, align: AlignmentType.CENTER, size: 17, before: 6, after: 6 })] }),
        new TableCell({ width: { size: 17, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('KONDISI KEMASAN', { bold: true, align: AlignmentType.CENTER, size: 17, before: 6, after: 6 })] }),
        new TableCell({ width: { size: 17, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('NOMOR SERI / KET', { bold: true, align: AlignmentType.CENTER, size: 17, before: 6, after: 6 })] })
      ]
    })
  ];

  selectedItemsSttbs.forEach((it, idx) => {
    sttbsTableRows.push(
      new TableRow({
        children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 17, before: 4, after: 4 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(it.uraian_item || it.nama_barang || it.nama_item || `Item ${idx + 1}`, { bold: true, size: 17, before: 4, after: 4 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(`${it.volume || 1} ${it.satuan || 'Unit'}`, { align: AlignmentType.CENTER, size: 17, before: 4, after: 4 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('Baik, Utuh & Bersegel Pabrikan', { align: AlignmentType.CENTER, size: 17, before: 4, after: 4 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText('S/N: DL-WK-0921 s/d DL-WK-0923 (Segel Utuh)', { size: 16, before: 4, after: 4 })] })
        ]
      })
    );
  });

  const infoHariSttbs = formatHariTanggalBeritaAcara(tglSttbs);
  const hariTglSttbsStr = `${infoHariSttbs.hari} tanggal ${infoHariSttbs.tanggalKata} bulan ${infoHariSttbs.bulan} tahun ${infoHariSttbs.tahunKata} (${formatTanggalIndo(tglSttbs)})`;

  const secSttbs = {
    properties: {
      page: {
        margin: { top: 900, right: 1000, bottom: 900, left: 1200 },
        size: { width: 11906, height: 16838 }
      }
    },
    headers: {
      default: makeHeader('SURAT TANDA TERIMA BARANG SEMENTARA (PARSIAL)', noSttbs)
    },
    footers: {
      default: makeFooter('STTBS Tahap 16 (Parsial)', noSttbs)
    },
    children: [
      ...buildKopSuratKpu(settings),
      pText('SURAT TANDA TERIMA PENERIMAAN BARANG SEMENTARA (PARSIAL)', {
        align: AlignmentType.CENTER,
        bold: true,
        size: 19,
        color: '0F172A',
        before: 40,
        after: 4
      }),
      pText(`Nomor: ${noSttbs}`, {
        align: AlignmentType.CENTER,
        bold: true,
        size: 17,
        color: '1E3A8A',
        before: 0,
        after: 80
      }),
      pText(`Pada hari ini, ${hariTglSttbsStr} (pukul ${waktuSttbs}), bertempat di ${lokasiFranco}, kami yang bertanda tangan di bawah ini:`, {
        align: AlignmentType.JUSTIFY,
        size: 17,
        line: 230,
        before: 0,
        after: 25
      }),
      pListItem('1.', 'Pihak Penerima', `${namaPenerima} (KPU Kabupaten Ngawi)`),
      pListItem('2.', 'Pihak Penyerah', `${namaPenyerah} (Penyedia / Ekspedisi Logistik)`),
      pText('Menyatakan dengan sebenarnya bahwa telah diserahkan dan diterima sebagian fisik barang pengadaan berdasarkan:', { size: 17, before: 15, after: 15 }),
      pListItem('•', 'Surat Pesanan (Kontrak)', `Nomor ${noKontrak} tanggal ${tglKontrakStr}`),
      pListItem('•', 'Surat Jalan Rekanan', `Nomor ${noSj} tanggal ${formatTanggalIndo(tglSj)}`),
      pListItem('•', 'Paket Pekerjaan', `${paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional'}`),
      pListItem('•', 'Penyedia Barang/Jasa', `${namaPenyedia}`),
      new Paragraph({ spacing: { before: 30, after: 15 }, children: [new TextRun({ text: 'DENGAN RINCIAN BARANG YANG DITERIMA SECARA PARSIAL SEBAGAI BERIKUT:', bold: true, size: 16.5, font: 'Cambria' })] }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: sttbsTableRows
      }),
      new Paragraph({ spacing: { before: 40, after: 15 }, children: [new TextRun({ text: 'CATATAN KHUSUS & KETENTUAN HUKUM KEDUA BELAH PIHAK:', bold: true, size: 16.5, font: 'Cambria' })] }),
      pNumbered('1.', 'Dokumen ini HANYA merupakan tanda terima fisik sementara atas sebagian barang yang telah tiba di lokasi, dan BUKAN merupakan Berita Acara Serah Terima (BAST) definitif.', { size: 16, before: 2, after: 3 }),
      pNumbered('2.', 'Dokumen ini TIDAK DAPAT digunakan sebagai dasar pengajuan pembayaran atau penagihan tagihan (SPP-LS / SPM-LS) kepada Kuasa Pengguna Anggaran.', { size: 16, before: 2, after: 3 }),
      pNumbered('3.', 'Kedatangan fisik barang di atas diakui sah sebagai bukti pemenuhan batas waktu penyerahan tepat waktu sebelum batas akhir kontrak guna evaluasi denda keterlambatan sesuai Pasal 79 ayat (4) huruf b Perpres PBJ.', { size: 16, before: 2, after: 3 }),
      pNumbered('4.', 'Pemeriksaan substantif, uji komisioning faktual (BAPHP), dan BAST definitif 100% baru dilaksanakan setelah seluruh sisa barang tiba lengkap di kantor KPU Ngawi.', { size: 16, before: 2, after: 4 }),
      pText(`Catatan Khusus: ${catatanSttbs}`, { italic: true, size: 15.5, before: 15, after: 40 }),
      buildSignatureBlockSttbs(paket, settings, namaPenerima, namaPenyerah, ppk)
    ]
  };

  return buildStage16SectionsModular(ctx, tahapRow, keu, isFirstStageInDoc, {
    baphpChildren: secBaphp.children,
    bastChildren: secBast.children,
    sttbsChildren: secSttbs.children
  });
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
  if (stageNo === 6) {
    return buildStage6Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 7) {
    return buildStage7Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 8) {
    return buildStage8Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 9) {
    return buildStage9Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 10) {
    return buildStage10Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 11) {
    return buildStage11Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 12) {
    return buildStage12Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 13) {
    return buildStage13Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 14) {
    return buildStage14Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 15) {
    return buildStage15Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 16) {
    return buildStage16Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 17) {
    return buildStage17Sections(ctx, tahapRow, keu, isFirstStageInDoc);
  }
  if (stageNo === 18) {
    return buildStage18Sections(ctx, tahapRow, keu, isFirstStageInDoc);
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
async function generateWordBuffer(ctx, modeOrStage = 13, subdoc = null) {
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
    if (stageNum === 18 && subdoc) {
      const tRow = (ctx.tahaps || []).find(t => Number(t.no_tahap) === 18) || {};
      const keu = hitungKeuanganKontrak(ctx.paket);
      sections = buildStage18Sections(ctx, tRow, keu, true, subdoc);
    } else {
      const allSecs = buildSectionsForStage(stageNum, ctx, true);
      if (subdoc && !isNaN(Number(subdoc))) {
        const subIdx = Number(subdoc) - 1;
        if (allSecs[subIdx]) {
          sections = [allSecs[subIdx]];
        } else {
          sections = allSecs;
        }
      } else {
        sections = allSecs;
      }
    }
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



function buildSignatureBlockSttbs(paket, settings, namaPenerima, namaPenyerah, ppk = {}) {
  const ppkNama = (ppk && ppk.nama_lengkap) || (settings && settings.nama_ppk) || (paket && paket.nama_ppk) || 'MOHAMMAD NOOR JIHAN';
  const ppkNip = (ppk && ppk.nip) || (settings && settings.nip_ppk) || (paket && paket.nip_ppk) || '19840101 200912 1 001';
  const namaPenyedia = paket.nama_penyedia || 'CV. GRAFIKA PRATAMA NGAWI';

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText('Pihak Penyerah (Penyedia / Ekspedisi),', { align: AlignmentType.CENTER, size: 17, before: 0, after: 2 }),
              pText(namaPenyedia, { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 90 }),
              pText('( ______________________________ )', { align: AlignmentType.CENTER, bold: true, size: 18, before: 0, after: 2 }),
              pText(namaPenyerah || 'Petugas Logistik / Kurir Rekanan', { align: AlignmentType.CENTER, size: 16, color: '475569', before: 0, after: 0 })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText('Pihak Penerima (KPU Kabupaten Ngawi),', { align: AlignmentType.CENTER, size: 17, before: 0, after: 2 }),
              pText('PENGURUS BARANG / TIM TEKNIS', { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 90 }),
              pText('( ______________________________ )', { align: AlignmentType.CENTER, bold: true, size: 18, before: 0, after: 2 }),
              pText(namaPenerima || 'Pengurus Barang KPU Ngawi', { align: AlignmentType.CENTER, size: 16, color: '475569', before: 0, after: 0 })
            ]
          })
        ]
      }),
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            columnSpan: 2,
            borders: BORDER_NONE,
            children: [
              pText('Mengetahui,', { align: AlignmentType.CENTER, size: 17, before: 24, after: 2 }),
              pText('PEJABAT PEMBUAT KOMITMEN (PPK)', { align: AlignmentType.CENTER, bold: true, size: 18, color: '1E3A8A', before: 0, after: 80 }),
              pText(ppkNama, { align: AlignmentType.CENTER, bold: true, underline: {}, size: 19, before: 0, after: 2 }),
              pText(`NIP. ${ppkNip}`, { align: AlignmentType.CENTER, size: 17, color: '334155', before: 0, after: 0 })
            ]
          })
        ]
      })
    ]
  });
}

/**
 * Generate Buffer Word (.DOCX) Surat Tanda Terima Barang Sementara (STTBS - Parsial)
 * Menampilkan item-item yang dimuat secara parsial sesuai pilihan aktual pengguna.
 */
async function generateSttbsWordBuffer(ctx, sttbsData = {}) {
  const { paket, items, settings, ppk } = ctx;
  const cleanKode = String(paket.kode_paket_internal || 'PBJ-2026-001').replace(/^CAKRA-/i, 'PBJ-');
  const noSttbs = sttbsData.no_sttbs || ('016/STTBS/' + cleanKode + '/PPK/VI/2026');
  const tglSttbs = sttbsData.tgl_sttbs || '2026-06-09';
  const waktuSttbs = sttbsData.waktu_sttbs || '14.30 WIB';
  const noSj = sttbsData.no_surat_jalan || '088/SJ-GP/VI/2026';
  const tglSj = sttbsData.tgl_surat_jalan || '2026-06-09';
  const namaPenerima = sttbsData.nama_penerima || 'Pengurus Barang / Pejabat Pemeriksa Pengadaan KPU Ngawi';
  const namaPenyerah = sttbsData.nama_penyerah || `Petugas Logistik / Ekspedisi ${paket.nama_penyedia || 'CV. GRAFIKA PRATAMA NGAWI'}`;
  const catatan = sttbsData.catatan || 'Barang diterima secara fisik parsial dalam kondisi baik dan tersegel. Pemeriksaan uji fungsi komisioning penuh (BAPHP) dan Berita Acara Serah Terima (BAST) definitif akan diterbitkan setelah seluruh barang (termasuk sisa item) tiba lengkap 100%.';

  const selectedItems = Array.isArray(sttbsData.items) && sttbsData.items.length > 0
    ? sttbsData.items
    : (items || []).filter(it => !it.hari_terlambat || it.hari_terlambat === 0);

  const itemRows = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ width: { size: 6, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('NO', { bold: true, align: AlignmentType.CENTER, size: 17, before: 6, after: 6 })] }),
        new TableCell({ width: { size: 44, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('NAMA BARANG / ITEM PEKERJAAN', { bold: true, align: AlignmentType.CENTER, size: 17, before: 6, after: 6 })] }),
        new TableCell({ width: { size: 16, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('VOL DITERIMA', { bold: true, align: AlignmentType.CENTER, size: 17, before: 6, after: 6 })] }),
        new TableCell({ width: { size: 17, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('KONDISI KEMASAN', { bold: true, align: AlignmentType.CENTER, size: 17, before: 6, after: 6 })] }),
        new TableCell({ width: { size: 17, type: WidthType.PERCENTAGE }, borders: BORDER_TABLE, shading: { fill: 'F1F5F9', type: ShadingType.CLEAR }, children: [pText('NOMOR SERI / KET', { bold: true, align: AlignmentType.CENTER, size: 17, before: 6, after: 6 })] })
      ]
    })
  ];

  selectedItems.forEach((it, idx) => {
    itemRows.push(
      new TableRow({
        children: [
          new TableCell({ borders: BORDER_TABLE, children: [pText(String(idx + 1), { align: AlignmentType.CENTER, size: 17, before: 4, after: 4 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(it.nama_item || it.uraian_item || `Item ${idx + 1}`, { bold: true, size: 17, before: 4, after: 4 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(`${it.vol_diterima || it.volume || 1} ${it.satuan || 'Unit'}`, { align: AlignmentType.CENTER, size: 17, before: 4, after: 4 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(it.kondisi || 'Baik & Bersegel', { align: AlignmentType.CENTER, size: 17, before: 4, after: 4 })] }),
          new TableCell({ borders: BORDER_TABLE, children: [pText(it.keterangan || it.serial_number || '-', { size: 16, before: 4, after: 4 })] })
        ]
      })
    );
  });

  const infoHariSttbs = formatHariTanggalBeritaAcara(tglSttbs);
  const hariTglSttbsStr = `${infoHariSttbs.hari} tanggal ${infoHariSttbs.tanggalKata} bulan ${infoHariSttbs.bulan} tahun ${infoHariSttbs.tahunKata} (${formatTanggalIndo(tglSttbs)})`;

  const children = [
    ...buildKopSuratKpu(settings),
    new Paragraph({ spacing: { before: 100, after: 20 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'SURAT TANDA TERIMA PENERIMAAN BARANG SEMENTARA (PARSIAL)', bold: true, size: 23, font: 'Cambria', underline: {} })] }),
    new Paragraph({ spacing: { before: 0, after: 100 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Nomor: ${noSttbs}`, bold: true, size: 19, font: 'Cambria' })] }),
    pText(`Pada hari ini, ${hariTglSttbsStr} (pukul ${waktuSttbs}), bertempat di Kantor Komisi Pemilihan Umum Kabupaten Ngawi, Jalan Untung Suropati No. 48 Ngawi, kami yang bertanda tangan di bawah ini:`),
    pListItem('1.', 'Pihak Penerima', `${namaPenerima} (KPU Kabupaten Ngawi)`),
    pListItem('2.', 'Pihak Penyerah', `${namaPenyerah} (Penyedia / Ekspedisi Logistik)`),
    pText('Menyatakan dengan sebenarnya bahwa telah diserahkan dan diterima sebagian fisik barang pengadaan berdasarkan:', { before: 20, after: 20 }),
    pListItem('•', 'Surat Pesanan (Kontrak)', `Nomor ${paket.no_kontrak || paket.no_sp || '013/SP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026'} tanggal ${formatTanggalIndo(paket.tgl_kontrak || paket.tgl_sp || '2026-05-27')}`),
    pListItem('•', 'Surat Jalan / Pengantar', `Nomor ${noSj} tanggal ${formatTanggalIndo(tglSj)}`),
    pListItem('•', 'Paket Pekerjaan', `${paket.nama_paket || 'Pengadaan Perangkat Pengolah Data dan PC Server Operasional'}`),
    pListItem('•', 'Penyedia Barang/Jasa', `${paket.nama_penyedia || 'CV. GRAFIKA PRATAMA NGAWI'}`),
    new Paragraph({ spacing: { before: 50, after: 30 }, children: [new TextRun({ text: 'DENGAN RINCIAN BARANG YANG DITERIMA SECARA PARSIAL SEBAGAI BERIKUT:', bold: true, size: 17, font: 'Cambria' })] }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: itemRows
    }),
    new Paragraph({ spacing: { before: 80, after: 20 }, children: [new TextRun({ text: 'CATATAN KHUSUS & KETENTUAN HUKUM KEDUA BELAH PIHAK:', bold: true, size: 17, font: 'Cambria' })] }),
    pNumbered('1.', 'Dokumen ini HANYA merupakan tanda terima fisik sementara atas sebagian barang yang telah tiba di lokasi, dan BUKAN merupakan Berita Acara Serah Terima (BAST) definitif.'),
    pNumbered('2.', 'Dokumen ini TIDAK DAPAT digunakan sebagai dasar pengajuan pembayaran atau penagihan tagihan (SPP-LS / SPM-LS) kepada Kuasa Pengguna Anggaran.'),
    pNumbered('3.', 'Kedatangan fisik atas barang-barang yang tercantum di atas diakui secara sah oleh kedua belah pihak sebagai bukti pemenuhan batas waktu penyerahan tepat waktu sebelum batas akhir kontrak guna penghitungan evaluasi denda keterlambatan sesuai ketentuan Pasal 79 ayat (4) huruf b Perpres Nomor 16 Tahun 2018 jo. Perpres Nomor 12 Tahun 2021.'),
    pNumbered('4.', 'Pemeriksaan substantif, uji fungsi komisioning faktual (BAPHP), dan penandatanganan BAST definitif 100% baru akan dilaksanakan setelah seluruh sisa barang (termasuk item yang belum diserahkan) tiba lengkap di lokasi kantor KPU Kabupaten Ngawi.'),
    pText(`Catatan Khusus: ${catatan}`, { italic: true, size: 16, before: 30, after: 100 }),
    buildSignatureBlockSttbs(paket, settings, namaPenerima, namaPenyerah, ppk)
  ];

  const doc = new Document({
    creator: 'SI-PRABU KPU Kabupaten Ngawi (by emenje)',
    title: `STTBS Parsial - ${noSttbs}`,
    styles: { default: { document: { run: { font: 'Cambria', size: 19 } } } },
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 1000, right: 1000 } } }, children }]
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

module.exports = {
  generateWordBuffer,
  generateSttbsWordBuffer,
  buildSectionsForStage
};
