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
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
  PageNumber,
  PageBreak,
  ImageRun,
  UnderlineType,
  TabStopType
} = require('docx');

const KPU_LOGO_PATH = path.resolve(__dirname, '../../public/assets/kpu_logo_official.png');

// Dimensi A4 Standar Dinas
const PAGE_A4 = {
  width: 11906,  // 210 mm
  height: 16838 // 297 mm
};

// Margin Dinas Standar Tata Naskah Dinas: Kiri 2.5 cm, Kanan 2.0 cm, Atas 2.0 cm, Bawah 2.0 cm
const MARGIN_DINAS = {
  top: 1134,
  bottom: 1134,
  left: 1440,
  right: 1134
};

// Lebar Efektif Pengetikan A4: 11906 - 1440 - 1134 = 9332 dxa
const CONTENT_WIDTH = 9332;

const BORDER_NONE = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
};

const BORDER_TABLE_SOLID = {
  top: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  left: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
  right: { style: BorderStyle.SINGLE, size: 6, color: '000000' }
};

const BORDER_TABLE_LIGHT = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' }
};

// Border garis hitam tebal solid tepat di bawah sel Kop Surat
const BORDER_KOP_CELL = {
  top: BORDER_NONE.top,
  left: BORDER_NONE.left,
  right: BORDER_NONE.right,
  bottom: { style: BorderStyle.SINGLE, size: 24, color: '000000' } // 3pt solid black rule persis KAK Stiker
};

/**
 * Membangun KOP SURAT KPU RESMI KABUPATEN NGAWI
 * Berdasarkan Referensi Dokumen Nyata: KAK Stiker Nomor Kotak Suara.pdf
 * GARIS HORISONTAL TEBAL SOLID TERLETAK PERSIS DI BAWAH KOP
 */
function buildKopKpuResmi() {
  const logoBuf = fs.existsSync(KPU_LOGO_PATH) ? fs.readFileSync(KPU_LOGO_PATH) : null;
  const logoCellWidth = 1400; // dxa
  const textCellWidth = CONTENT_WIDTH - logoCellWidth;

  const logoChildren = logoBuf
    ? [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [
            new ImageRun({
              data: logoBuf,
              transformation: { width: 66, height: 75 } // Rasio proporsional Logo KPU RI
            })
          ]
        })
      ]
    : [];

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    borders: BORDER_NONE,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            width: { size: logoCellWidth, type: WidthType.DXA },
            margins: { bottom: 100, top: 0, left: 0, right: 60 },
            borders: BORDER_KOP_CELL,
            verticalAlign: 'center',
            children: logoChildren
          }),
          new TableCell({
            width: { size: textCellWidth, type: WidthType.DXA },
            margins: { bottom: 100, top: 0, left: 30, right: 0 },
            borders: BORDER_KOP_CELL,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 15, line: 240 },
                children: [
                  new TextRun({
                    text: 'KOMISI PEMILIHAN UMUM',
                    bold: true,
                    size: 27, // 13.5 pt
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
                    text: 'KABUPATEN NGAWI',
                    bold: true,
                    size: 29, // 14.5 pt
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
                    text: 'Jl. Untung Suropati No. 48 Ngawi',
                    size: 19, // 9.5 pt
                    font: 'Cambria',
                    color: '000000'
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 30, line: 200 },
                children: [
                  new TextRun({
                    text: 'Telp (0351) 743832                               Fax (0351) 748687',
                    size: 18, // 9 pt
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
  });
}

/**
 * Paragraph Cambria dengan Spasi Nyaman (Tidak Terlalu Rapat)
 */
function p(text, opts = {}) {
  const runs = Array.isArray(text)
    ? text
    : [
        new TextRun({
          text: String(text ?? ''),
          bold: Boolean(opts.bold),
          italics: Boolean(opts.italic),
          underline: opts.underline ? { type: UnderlineType.SINGLE } : undefined,
          size: opts.size || 21, // 10.5 pt standar naskah dinas
          color: opts.color || '000000',
          font: 'Cambria'
        })
      ];

  return new Paragraph({
    alignment: opts.align || AlignmentType.JUSTIFIED,
    spacing: {
      before: opts.before ?? 20,
      after: opts.after ?? 30,
      line: opts.line ?? 240
    },
    indent: opts.firstLine ? { firstLine: opts.firstLine } : (opts.left ? { left: opts.left, hanging: opts.hanging } : undefined),
    keepNext: Boolean(opts.keepNext),
    keepLines: Boolean(opts.keepLines),
    children: runs
  });
}

/**
 * Paragraf Penomoran Hierarkis Naskah Dinas Resmi (True Native Hanging Indent)
 * Menjamin baris kedua dan seterusnya RATA LURUS 100% dengan huruf pertama setelah nomor:
 * - Level 1 (1., 2., 3.): Prefix di 0 dxa, TabStop & Teks di 400 dxa, Baris 2+ di 400 dxa.
 * - Level 2 (a., b., c.): Prefix di 400 dxa, TabStop & Teks di 800 dxa, Baris 2+ di 800 dxa.
 * - Level 3 (1), 2) / •): Prefix di 800 dxa, TabStop & Teks di 1200 dxa, Baris 2+ di 1200 dxa.
 */
function pNumbered(prefix, content, opts = {}) {
  const level = opts.level || 1;
  const numWidth = opts.numWidth || 360; // 0.25 inci
  const indentWidth = opts.indentWidth !== undefined ? opts.indentWidth : ((level - 1) * 360);
  const contentWidth = CONTENT_WIDTH - indentWidth - numWidth;

  const cleanPrefix = String(prefix ?? '').trim();
  const numRun = new TextRun({
    text: cleanPrefix,
    bold: opts.boldPrefix !== undefined ? opts.boldPrefix : (opts.boldNum !== undefined ? opts.boldNum : true),
    size: opts.size || 21,
    color: opts.prefixColor || opts.color || '000000',
    font: 'Cambria'
  });

  let textRuns = [];
  if (Array.isArray(content)) {
    textRuns = content;
  } else if (typeof content === 'string') {
    textRuns = [
      new TextRun({
        text: content,
        bold: Boolean(opts.boldText || opts.bold),
        italics: Boolean(opts.italic),
        size: opts.size || 21,
        color: opts.color || '000000',
        font: 'Cambria'
      })
    ];
  }

  const cells = [];
  if (indentWidth > 0) {
    cells.push(new TableCell({
      width: { size: indentWidth, type: WidthType.DXA },
      borders: BORDER_NONE,
      margins: { top: 0, bottom: 20, left: 0, right: 0 },
      children: [new Paragraph({ children: [] })]
    }));
  }
  cells.push(new TableCell({
    width: { size: numWidth, type: WidthType.DXA },
    borders: BORDER_NONE,
    margins: { top: 0, bottom: 20, left: 0, right: 0 },
    children: [new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: {
        before: opts.before ?? 4,
        after: opts.after ?? 6,
        line: opts.line ?? 240
      },
      keepNext: Boolean(opts.keepNext),
      children: [numRun]
    })]
  }));
  cells.push(new TableCell({
    width: { size: contentWidth, type: WidthType.DXA },
    borders: BORDER_NONE,
    margins: { top: 0, bottom: 20, left: 0, right: 0 },
    children: [new Paragraph({
      alignment: opts.align || AlignmentType.JUSTIFIED,
      spacing: {
        before: opts.before ?? 4,
        after: opts.after ?? 6,
        line: opts.line ?? 240
      },
      keepNext: Boolean(opts.keepNext),
      keepLines: true,
      children: textRuns
    })]
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [new TableRow({ children: cells })]
  });
}

function pNum(numStr, content, opts = {}) {
  return pNumbered(numStr, content, { level: 1, ...opts });
}

function pSubNum(alphaStr, content, opts = {}) {
  return pNumbered(alphaStr, content, { level: 2, ...opts });
}

function pContinuation(content, opts = {}) {
  const level = opts.level || 1;
  const numWidth = opts.numWidth || 360;
  const indentWidth = opts.indentWidth !== undefined ? opts.indentWidth : ((level - 1) * 360);
  const totalIndent = indentWidth + numWidth;
  const contentWidth = CONTENT_WIDTH - totalIndent;

  let textRuns = [];
  if (Array.isArray(content)) {
    textRuns = content;
  } else if (typeof content === 'string') {
    textRuns = [
      new TextRun({
        text: content,
        bold: Boolean(opts.boldText || opts.bold),
        italics: Boolean(opts.italic),
        size: opts.size || 21,
        color: opts.color || '000000',
        font: 'Cambria'
      })
    ];
  }

  const cells = [
    new TableCell({
      width: { size: totalIndent, type: WidthType.DXA },
      borders: BORDER_NONE,
      margins: { top: 0, bottom: 20, left: 0, right: 0 },
      children: [new Paragraph({ children: [] })]
    }),
    new TableCell({
      width: { size: contentWidth, type: WidthType.DXA },
      borders: BORDER_NONE,
      margins: { top: 0, bottom: 20, left: 0, right: 0 },
      children: [new Paragraph({
        alignment: opts.align || AlignmentType.JUSTIFIED,
        spacing: {
          before: opts.before ?? 4,
          after: opts.after ?? 6,
          line: opts.line ?? 240
        },
        keepNext: Boolean(opts.keepNext),
        keepLines: true,
        children: textRuns
      })]
    })
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: BORDER_NONE,
    rows: [new TableRow({ children: cells })]
  });
}

function pBab(romawiStr, judulStr, opts = {}) {
  if (typeof judulStr === 'object' && judulStr !== null) {
    opts = judulStr;
    judulStr = '';
  }
  if (!judulStr && romawiStr && (romawiStr.includes(':') || romawiStr.includes('.'))) {
    const splitChar = romawiStr.includes(':') ? ':' : '.';
    const parts = romawiStr.split(splitChar);
    romawiStr = parts[0].trim();
    judulStr = parts.slice(1).join(splitChar).trim();
  } else if (!judulStr) {
    judulStr = '';
  }
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: {
      before: opts.before ?? 60,
      after: opts.after ?? 25,
      line: opts.line ?? 240
    },
    keepNext: true,
    keepLines: true,
    children: [
      new TextRun({
        text: romawiStr ? (romawiStr.endsWith('.') || romawiStr.endsWith(':') ? `${romawiStr} ` : `${romawiStr}: `) : '',
        bold: true,
        size: opts.size || 21,
        font: 'Cambria',
        color: opts.color || '000000'
      }),
      new TextRun({
        text: String(judulStr || '').toUpperCase(),
        bold: true,
        size: opts.size || 21,
        font: 'Cambria',
        color: opts.color || '000000'
      })
    ]
  });
}

function pSubBab(alphaStr, judulStr, opts = {}) {
  if (!judulStr && alphaStr && (alphaStr.includes(':') || alphaStr.includes('.'))) {
    const splitChar = alphaStr.includes(':') ? ':' : '.';
    const parts = alphaStr.split(splitChar);
    alphaStr = parts[0].trim();
    judulStr = parts.slice(1).join(splitChar).trim();
  } else if (!judulStr) {
    judulStr = '';
  }
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: {
      before: opts.before ?? 80,
      after: opts.after ?? 30,
      line: 250
    },
    keepNext: true,
    keepLines: true,
    indent: {
      left: 200,
      hanging: 200
    },
    children: [
      new TextRun({
        text: `${alphaStr}. `,
        bold: true,
        size: opts.size || 22,
        font: 'Cambria',
        color: '000000'
      }),
      new TextRun({
        text: judulStr,
        bold: true,
        size: opts.size || 22,
        font: 'Cambria',
        color: '000000'
      })
    ]
  });
}

/**
 * Running Header BERSIH (TANPA GARIS, karena garis hanya ada di bawah KOP)
 */
function buildRunningHeader(textStr) {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: textStr,
            size: 16,
            italics: true,
            color: '64748B',
            font: 'Cambria'
          })
        ]
      })
    ]
  });
}

/**
 * Running Footer dengan Nomor Halaman
 */
function buildRunningFooter(titleStr) {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 80, after: 0 },
        children: [
          new TextRun({ text: 'Halaman ', size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ text: ' dari ', size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, font: 'Cambria', color: '64748B' }),
          new TextRun({ text: ` — ${titleStr}`, size: 15, italics: true, color: '94A3B8', font: 'Cambria' })
        ]
      })
    ]
  });
}

/**
 * Standar Section Naskah Dinas KPU:
 * - Halaman 1 memiliki Kop Surat dengan Garis Hitam Solid 3pt langsung di bawah Kop.
 * - Halaman 1 TIDAK MEMILIKI running header di atas Kop Surat (titlePage: true).
 * - Halaman 2+ memiliki Running Header BERSIH (tanpa garis horizontal).
 * - Seluruh halaman memiliki Footer Nomor Halaman.
 */
function createStandardDinasSection(titleStr, children, extraProps = {}) {
  const footerObj = buildRunningFooter(titleStr);
  return {
    properties: {
      page: {
        size: PAGE_A4,
        margin: MARGIN_DINAS
      },
      titlePage: true,
      ...extraProps
    },
    headers: {
      default: buildRunningHeader(titleStr)
    },
    footers: {
      default: footerObj,
      first: footerObj
    },
    children: children
  };
}

module.exports = {
  PAGE_A4,
  MARGIN_DINAS,
  CONTENT_WIDTH,
  BORDER_NONE,
  BORDER_TABLE_SOLID,
  BORDER_TABLE_LIGHT,
  BORDER_KOP_CELL,
  buildKopKpuResmi,
  buildRunningHeader,
  buildRunningFooter,
  createStandardDinasSection,
  p,
  pNumbered,
  pNum,
  pSubNum,
  pContinuation,
  pBab,
  pSubBab
};
