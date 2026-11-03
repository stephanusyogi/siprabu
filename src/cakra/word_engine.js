/**
 * CAKRA — Mesin Generator Word (.DOCX) Hulu ke Hilir (Tahap 1 s.d. 18)
 * Menggunakan library resmi `docx` untuk menghasilkan dokumen naskah dinas KPU Kabupaten Ngawi
 * lengkap Kop Surat, Pembukaan Berita Acara formal, Tabel Rincian Item, Pasal Kontrak, & Tanda Tangan
 * Pengembang: emenje
 */

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
  ShadingType
} = require('docx');

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

function pText(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: { before: opts.before ?? 60, after: opts.after ?? 80, line: 276 },
    children: [
      new TextRun({
        text: String(text ?? ''),
        bold: Boolean(opts.bold),
        italics: Boolean(opts.italic),
        underline: opts.underline ? {} : undefined,
        size: opts.size || 22, // 11pt default
        font: 'Arial',
        color: opts.color || '000000'
      })
    ]
  });
}

function pLabelValue(label, value) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 32, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        children: [pText(label, { bold: true, size: 20, before: 20, after: 20 })]
      }),
      new TableCell({
        width: { size: 3, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        children: [pText(':', { bold: true, size: 20, before: 20, after: 20 })]
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        borders: BORDER_NONE,
        children: [pText(value, { size: 20, before: 20, after: 20 })]
      })
    ]
  });
}

function buildKopSuratKpu(settings) {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: (settings.nama_satker || 'KOMISI PEMILIHAN UMUM KABUPATEN NGAWI').toUpperCase(),
          bold: true,
          size: 28,
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: `${settings.alamat_satker || 'Jl. Untung Suropati No. 48 Ngawi'} — Telp. ${settings.telp_satker || '(0351) 743832'}`,
          size: 19,
          font: 'Arial'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 180 },
      border: {
        bottom: { style: BorderStyle.DOUBLE, size: 14, color: '000000', space: 6 }
      },
      children: [
        new TextRun({
          text: `Laman: ${settings.website_satker || 'kab-ngawi.kpu.go.id'} | Pos-el: ${settings.email_satker || 'kab_ngawi@kpu.go.id'}`,
          italics: true,
          size: 18,
          font: 'Arial'
        })
      ]
    })
  ];
}

function buildTabelItemDocx(items, modeHarga = 'kontrak') {
  const headerTitles = ['No', 'Uraian Barang / Jasa & Spesifikasi Teknis', 'Vol', 'Satuan', 'TKDN / PDN', 'Harga Satuan (Rp)', 'Jumlah Harga (Rp)'];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headerTitles.map(title => new TableCell({
      borders: BORDER_TABLE,
      shading: { fill: '0F172A', type: ShadingType.CLEAR },
      children: [pText(title, { bold: true, size: 19, align: AlignmentType.CENTER, color: 'FFFFFF', before: 40, after: 40 })]
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

    return new TableRow({
      children: [
        new TableCell({ borders: BORDER_TABLE, children: [pText(idx + 1, { size: 19, align: AlignmentType.CENTER })] }),
        new TableCell({ borders: BORDER_TABLE, children: [
          pText(it.uraian_item, { bold: true, size: 19, after: 20 }),
          pText(`Spesifikasi: ${it.spesifikasi_teknis || '-'}`, { size: 18, italic: true, before: 0 })
        ] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText(it.volume, { size: 19, align: AlignmentType.CENTER })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText(it.satuan, { size: 19, align: AlignmentType.CENTER })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText(`${it.status_pdn} (${it.persen_tkdn || 0}%)`, { size: 18, align: AlignmentType.CENTER })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(hrgSat, false), { size: 19, align: AlignmentType.RIGHT })] }),
        new TableCell({ borders: BORDER_TABLE, children: [pText(formatRupiah(jml, false), { bold: true, size: 19, align: AlignmentType.RIGHT })] })
      ]
    });
  });

  const totalRow = new TableRow({
    children: [
      new TableCell({
        columnSpan: 6,
        borders: BORDER_TABLE,
        shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
        children: [pText('TOTAL NILAI (TERMASUK PAJAK)', { bold: true, size: 20, align: AlignmentType.RIGHT })]
      }),
      new TableCell({
        borders: BORDER_TABLE,
        shading: { fill: 'FEF3C7', type: ShadingType.CLEAR },
        children: [pText(formatRupiah(totalSemua), { bold: true, size: 20, align: AlignmentType.RIGHT })]
      })
    ]
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows, totalRow]
  });
}

function buildBlokTandaTangan(kiri, kanan, kota, tanggalStr) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: kiri ? [
              pText('', { before: 120 }),
              pText(kiri.judulAtas || 'PIHAK KEDUA / PENYEDIA', { bold: true, size: 20, align: AlignmentType.CENTER, after: 20 }),
              pText(kiri.subJudul || '', { bold: true, size: 20, align: AlignmentType.CENTER, after: 600 }),
              pText(kiri.nama || '-', { bold: true, underline: true, size: 20, align: AlignmentType.CENTER, after: 20 }),
              pText(kiri.identitas || '', { size: 19, align: AlignmentType.CENTER })
            ] : []
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: BORDER_NONE,
            children: [
              pText(`${kota || 'Ngawi'}, ${formatTanggalIndo(tanggalStr)}`, { size: 20, align: AlignmentType.CENTER, before: 120, after: 20 }),
              pText(kanan.judulAtas || 'PEJABAT PEMBUAT KOMITMEN (PPK)', { bold: true, size: 20, align: AlignmentType.CENTER, after: 20 }),
              pText(kanan.subJudul || 'KPU KABUPATEN NGAWI', { bold: true, size: 20, align: AlignmentType.CENTER, after: 600 }),
              pText(kanan.nama || '-', { bold: true, underline: true, size: 20, align: AlignmentType.CENTER, after: 20 }),
              pText(kanan.identitas || '', { size: 19, align: AlignmentType.CENTER })
            ]
          })
        ]
      })
    ]
  });
}

/**
 * Konten Spesifik & Pasal Hukum Berdasarkan Nomor Tahap (1 s.d. 18)
 */
function buildStageSpecificSections(stageNo, ctx, tahapRow, keu) {
  const { paket, penyedia, ppk, kpa, pejabatPengadaan, timTeknis, settings } = ctx;
  const infoHari = formatHariTanggalBeritaAcara(tahapRow?.tanggal_dokumen || paket.tgl_mulai_kerja);
  const isKonstruksi = String(paket.jenis_pengadaan || '').includes('Konstruksi');
  const paragraphs = [];

  switch (stageNo) {
    case 1:
      paragraphs.push(
        pText('A. LATAR BELAKANG & IDENTIFIKASI KEBUTUHAN ANGGARAN (DIPA / RKB)', { bold: true, before: 140 }),
        pText(`1. Berdasarkan DIPA Satker ${settings.nama_satker} Nomor ${settings.nomor_dipa} Tahun Anggaran ${paket.tahun_anggaran} pada Mata Anggaran Kegiatan (MAK) ${paket.kode_akun_mak} (${paket.nama_akun_mak}), diperlukan pengadaan "${paket.nama_paket}" dengan Pagu Anggaran sebesar ${formatRupiah(paket.nilai_pagu)} (${terbilangRupiah(paket.nilai_pagu)}).`),
        pText(`2. Pemeriksaan ketersediaan Barang Milik Negara (BMN) / Persediaan / Kondisi Gedung dan Bangunan eksisting menunjukkan bahwa kebutuhan tersebut wajib dipenuhi untuk menunjang kelancaran operasional dan tahapan kegiatan pada Subbagian ${paket.pic_subbag}.`),
        pText(`3. Sesuai Pasal 65 Peraturan Presiden Nomor 46 Tahun 2025, paket pengadaan ini dialokasikan untuk memberdayakan Usaha Mikro, Usaha Kecil, dan Koperasi (UMK-Koperasi) serta mengutamakan Produk Dalam Negeri (PDN).`)
      );
      break;

    case 2:
      paragraphs.push(
        pText('A. PENETAPAN JENIS, CARA PENGADAAN, DAN PEMAKETAN PBJ', { bold: true, before: 140 }),
        pText(`1. Jenis Pengadaan ditetapkan sebagai: ${paket.jenis_pengadaan} (${isKonstruksi ? 'Mengacu Lampiran II/III Peraturan LKPP Nomor 3 Tahun 2026' : 'Mengacu Lampiran I Peraturan LKPP Nomor 3 Tahun 2026'}).`),
        pText(`2. Cara Pengadaan dilaksanakan melalui: ${paket.cara_pengadaan} dengan Metode Pemilihan: ${paket.metode_pemilihan} (${paket.fitur_spse}).`),
        pText(`3. Pemaketan dilakukan dengan berorientasi pada keluaran/output, ketersediaan pelaku usaha dalam negeri/lokal Kabupaten Ngawi (${isKonstruksi ? 'Segmentasi Subkualifikasi Usaha Kecil K1/K2/K3 atau Menengah/Besar sesuai Pasal 4 Perlem 3/2026' : 'Alokasi UMK-Koperasi'}), serta tidak memecah paket untuk menghindari Tender/Seleksi.`)
      );
      break;

    case 3:
      paragraphs.push(
        pText('A. PENYUSUNAN RENCANA UMUM PENGADAAN (RUP) & PENGUMUMAN SIRUP', { bold: true, before: 140 }),
        pText(`1. Paket pengadaan ini telah disusun dalam Rencana Umum Pengadaan (RUP) dengan Kode RUP: ${paket.kode_rup || 'RUP-2026-657811'} untuk diumumkan oleh Kuasa Pengguna Anggaran (Sekretaris KPU Kabupaten Ngawi) pada aplikasi SIRUP LKPP.`),
        pText(`2. Rincian jadwal perencanaan pemilihan dan pelaksanaan kontrak mengacu pada tabel rincian di bawah ini.`)
      );
      break;

    case 4:
      paragraphs.push(
        pText(`A. KERANGKA ACUAN KERJA (KAK), SPESIFIKASI TEKNIS${isKonstruksi ? ', DED, & RANCANGAN KONSEPTUAL SMKK' : ' & PDN/TKDN'}`, { bold: true, before: 140 }),
        pText(`1. Uraian Pekerjaan: ${paket.uraian_pekerjaan || paket.nama_paket}.`),
        pText(`2. Kewajiban Prioritas Produk Dalam Negeri (PDN) & TKDN sesuai Pasal 66 Peraturan Presiden Nomor 46 Tahun 2025 ditetapkan pada tingkat: ${paket.prioritas_pdn_level} (Target TKDN ${paket.persen_tkdn_target}% + BMP ${paket.persen_bmp_target}%).`),
        pText(`3. Waktu Pelaksanaan Pekerjaan: selama ${paket.masa_pelaksanaan_hari} (${terbilangRupiah(paket.masa_pelaksanaan_hari).replace(' Rupiah', '')}) hari kalender terhitung sejak tanggal mulai kerja (${formatTanggalIndo(paket.tgl_mulai_kerja)} s.d. ${formatTanggalIndo(paket.tgl_selesai_kontrak)}).`)
      );
      if (isKonstruksi) {
        paragraphs.push(
          pText(`4. Khusus Konstruksi (Lampiran II Perlem LKPP 3/2026): Dilengkapi Gambar Rencana Teknis / Detailed Engineering Design (DED) serta Rancangan Konseptual Sistem Manajemen Keselamatan Konstruksi (SMKK) dengan penetapan Tingkat Risiko Keselamatan Konstruksi, identifikasi bahaya, dan kewajiban perlindungan BPJS Ketenagakerjaan Sektor Jasa Konstruksi.`)
        );
      }
      break;

    case 5:
      paragraphs.push(
        pText('A. BERITA ACARA ANALISA PASAR & DOKUMEN PENILAIAN PPK ATAS KATALOG ELEKTRONIK', { bold: true, before: 140 }),
        pText(`${infoHari.kalimatFormal}, Pejabat Pembuat Komitmen (PPK) ${settings.nama_satker} telah melaksanakan Analisa Pasar dan Penilaian PPK atas ketersediaan barang/jasa pada Katalog Elektronik sesuai Pasal 8 Peraturan LKPP Nomor 2 Tahun 2026:`),
        pText(`1. Status Ketersediaan pada Katalog Elektronik v6: ${paket.tersedia_di_katalog}.`),
        pText(`2. Hasil Penilaian PPK & Pertimbangan Teknis/Pasar: ${paket.alasan_penilaian_ppk_katalog || 'Produk tersedia dan memenuhi spesifikasi teknis, volume, waktu, serta efisiensi harga.'}`),
        pText(`3. Tautan / Referensi Produk Katalog Pembanding: ${paket.link_produk_katalog_1 || '-'} ${paket.link_produk_katalog_2 ? 'dan ' + paket.link_produk_katalog_2 : ''}.`)
      );
      break;

    case 6:
      paragraphs.push(
        pText(`A. PENETAPAN ${paket.jenis_kertas_harga.toUpperCase()}${isKonstruksi ? ' BERBASIS ENGINEER ESTIMATE (EE) & AHSP' : ''}`, { bold: true, before: 140 }),
        pText(`${infoHari.kalimatFormal}, PPK menetapkan ${paket.jenis_kertas_harga} untuk paket "${paket.nama_paket}" sebesar ${formatRupiah(paket.nilai_hps)} (${terbilangRupiah(paket.nilai_hps)}) sudah termasuk pajak-pajak yang berlaku${isKonstruksi ? ' dan Biaya Penerapan SMKK (Keselamatan Konstruksi)' : ''}.`),
        pText(`Dasar Hukum: Pasal 26 Perpres Nomor 46 Tahun 2025, Pasal 9 Peraturan LKPP Nomor 2 Tahun 2026, serta ${isKonstruksi ? 'Lampiran II/III' : 'Lampiran I'} Peraturan LKPP Nomor 3 Tahun 2026.`)
      );
      break;

    case 7:
      paragraphs.push(
        pText('A. RANCANGAN KONTRAK, SSUK, DAN SYARAT-SYARAT KHUSUS KONTRAK (SSKK)', { bold: true, before: 140 }),
        pText(`1. Jenis Kontrak: ${paket.jenis_kontrak} | Bentuk Kontrak: ${paket.bentuk_kontrak} (Pasal 27 & Pasal 28 Perpres Nomor 46 Tahun 2025; Pengadaan Langsung Pekerjaan Konstruksi s.d. Rp400 Juta menggunakan SPK).`),
        pText(`2. Ketentuan Uang Muka (Pasal 29 Perpres 46/2025): Persentase Uang Muka ditetapkan sebesar ${paket.persen_uang_muka || 0}% (${formatRupiah(keu.nilaiUangMuka)}). Apabila Penyedia Usaha Mikro/Kecil mengajukan Uang Muka untuk kontrak > Rp50 Juta, PPK memberikan minimal 50% (untuk kontrak Rp50–200 Juta) atau minimal 30% (untuk kontrak > Rp200 Juta s.d. Rp2,5 Miliar).`),
        pText(`3. Sanksi Denda Keterlambatan: ditetapkan sebesar 1‰ (satu permil) per hari dari ${paket.basis_denda || 'nilai kontrak sebelum PPN'}.${isKonstruksi ? ' Untuk Pekerjaan Konstruksi berlaku Masa Pemeliharaan minimal 180 hari kalender (6 bulan) untuk pekerjaan permanen atau 90 hari kalender (3 bulan) untuk semi-permanen dengan Retensi Pemeliharaan 5% (Rp ' + keu.nilaiRetensi5Persen.toLocaleString('id-ID') + ') atau Jaminan Pemeliharaan 5%.' : ''}`)
      );
      break;

    case 8:
      paragraphs.push(
        pText('A. SURAT PERMINTAAN PEMILIHAN & BERITA ACARA REVIU DOKUMEN PERSIAPAN PENGADAAN (DPP)', { bold: true, before: 140 }),
        pText(`PPK menyerahkan Dokumen Persiapan Pengadaan (DPP) yang terdiri atas KAK/Spesifikasi Teknis${isKonstruksi ? '/DED & Rancangan Konseptual SMKK' : ''}, ${paket.jenis_kertas_harga}, dan Rancangan Kontrak (${paket.bentuk_kontrak}) kepada ${paket.pelaksana_pemilihan} (${pejabatPengadaan.nama_lengkap || 'Pejabat Pengadaan'}) untuk dilaksanakan proses pemilihan penyedia sesuai ketentuan Peraturan LKPP Nomor 2 Tahun 2026 dan Nomor 3 Tahun 2026.`)
      );
      break;

    case 9:
      paragraphs.push(
        pText('A. BERITA ACARA EVALUASI, KLARIFIKASI, NEGOSIASI TEKNIS/HARGA & HASIL PEMILIHAN (BAHPL / BAHP / E-PURCHASING)', { bold: true, before: 140 }),
        pText(`${infoHari.kalimatFormal}, telah dilaksanakan evaluasi kualifikasi (${isKonstruksi ? 'NIB, SBU Jasa Konstruksi, Sisa Kemampuan Paket SKP = KP - P, dan Rencana Keselamatan Konstruksi / RKK' : 'NIB, KBLI, dan Spesifikasi Teknis'}) serta klarifikasi dan negosiasi teknis dan harga terhadap Calon Penyedia: ${penyedia.nama_perusahaan || '-'} (${penyedia.alamat || 'Ngawi'}, NPWP: ${penyedia.npwp || '-'}).`),
        pText(`1. Nilai ${paket.jenis_kertas_harga}: ${formatRupiah(paket.nilai_hps)}.`),
        pText(`2. Nilai Penawaran Awal Penyedia: ${formatRupiah(paket.nilai_penawaran_awal || paket.nilai_hps)}.`),
        pText(`3. Nilai Hasil Negosiasi Akhir yang Disepakati: ${formatRupiah(paket.nilai_kontrak)} (${terbilangRupiah(paket.nilai_kontrak)}), menghasilkan efisiensi sebesar ${formatRupiah(keu.efisiensiTerhadapHps)}.`)
      );
      break;

    case 10:
      paragraphs.push(
        pText('A. BERITA ACARA REVIU HASIL PEMILIHAN OLEH PPK & DEKLARASI BENEFICIAL OWNERSHIP (BO)', { bold: true, before: 140 }),
        pText(`1. PPK telah melakukan reviu atas Berita Acara Hasil Pemilihan dan menyatakan bahwa proses pemilihan telah sesuai dengan Dokumen Persiapan Pengadaan (DPP) serta nilai hasil negosiasi tidak melampaui Pagu/HPS.`),
        pText(`2. Validasi Pemilik Manfaat (Beneficial Ownership / BO) sesuai Pasal 8 Peraturan LKPP Nomor 3 Tahun 2026: Pemilik Manfaat tercatat atas nama ${penyedia.bo_nama_pemilik_manfaat || penyedia.nama_direktur || '-'} (NIK: ${penyedia.bo_nik_pemilik_manfaat || penyedia.nik_direktur || '-'}, Status: ${penyedia.bo_hubungan || 'Pemilik Langsung'}) serta tidak masuk dalam Daftar Hitam Nasional.`)
      );
      break;

    case 11:
      paragraphs.push(
        pText('A. SURAT PENUNJUKAN PENYEDIA BARANG/JASA (SPPBJ) & VERIFIKASI JAMINAN PELAKSANAAN', { bold: true, before: 140 }),
        pText(`PPK menunjuk Penyedia: ${penyedia.nama_perusahaan} (Direktur/Penandatangan: ${penyedia.nama_direktur}) untuk melaksanakan pekerjaan "${paket.nama_paket}" dengan nilai kontrak sebesar ${formatRupiah(paket.nilai_kontrak)} (${terbilangRupiah(paket.nilai_kontrak)}).`),
        pText(`Kewajiban Jaminan Pelaksanaan 5% (Pasal 16 Perlem 2/2026 & Perlem 3/2026): ${paket.wajib_jaminan_pelaksanaan ? 'Wajib menyerahkan Jaminan Pelaksanaan 5% sebesar ' + formatRupiah(keu.nilaiJaminanPelaksanaan) : 'Dikecualikan dari Jaminan Pelaksanaan sesuai ketentuan nilai/jenis pengadaan (Pengadaan Langsung B/JL s.d. Rp200 Juta, Pengadaan Langsung Konstruksi s.d. Rp400 Juta, atau Jasa Konsultansi)'}.`)
      );
      break;

    case 12:
      paragraphs.push(
        pText('A. BERITA ACARA RAPAT PERSIAPAN PENANDATANGANAN KONTRAK (PRE-AWARD MEETING)', { bold: true, before: 140 }),
        pText(`${infoHari.kalimatFormal}, PPK dan Penyedia (${penyedia.nama_perusahaan}) telah melaksanakan Rapat Persiapan Penandatanganan Kontrak dengan kesepakatan finalisasi naskah ${paket.bentuk_kontrak}, jadwal pelaksanaan selama ${paket.masa_pelaksanaan_hari} hari kalender, nomor rekening pembayaran (${penyedia.nama_bank} No. Rek: ${penyedia.no_rekening} a.n. ${penyedia.atas_nama_rekening}),${isKonstruksi ? ' reviu Rencana Keselamatan Konstruksi (RKK),' : ''} serta kesiapan pelaksanaan pekerjaan.`)
      );
      break;

    case 13:
      paragraphs.push(
        pText(`A. NASKAH KONTRAK FINAL: ${paket.bentuk_kontrak.toUpperCase()} (${paket.jenis_kontrak.toUpperCase()})`, { bold: true, before: 140 }),
        pText(`${infoHari.kalimatFormal}, yang bertanda tangan di bawah ini:`),
        pText(`I. ${ppk.nama_lengkap}, NIP. ${ppk.nip}, Pejabat Pembuat Komitmen ${settings.nama_satker}, berkedudukan di ${settings.alamat_satker}, selanjutnya disebut PIHAK KESATU (PPK); dan`),
        pText(`II. ${penyedia.nama_direktur}, ${penyedia.jabatan_penandatangan} ${penyedia.nama_perusahaan}, NPWP ${penyedia.npwp}, Akta/NIB/SBU: ${penyedia.no_akta_pendirian || penyedia.nib}, berkedudukan di ${penyedia.alamat}, selanjutnya disebut PIHAK KEDUA (PENYEDIA).`),
        pText(`Kedua belah pihak sepakat mengikatkan diri dalam ${paket.bentuk_kontrak} untuk melaksanakan paket "${paket.nama_paket}" dengan Nilai Kontrak sebesar ${formatRupiah(paket.nilai_kontrak)} (${terbilangRupiah(paket.nilai_kontrak)}) selama ${paket.masa_pelaksanaan_hari} hari kalender (${formatTanggalIndo(paket.tgl_mulai_kerja)} s.d. ${formatTanggalIndo(paket.tgl_selesai_kontrak)}).`)
      );
      break;

    case 14:
      paragraphs.push(
        pText(`A. PENYERAHAN LOKASI KERJA${isKonstruksi ? ' (MC-0)' : ''}, SPMK / SPP, PROGRAM MUTU${isKonstruksi ? ', RKK, BPJS KONSTRUKSI' : ''} & PCM`, { bold: true, before: 140 }),
        pText(`PPK menyerahkan lokasi kerja kepada ${penyedia.nama_perusahaan} dan memerintahkan untuk memulai pelaksanaan pekerjaan terhitung mulai tanggal ${formatTanggalIndo(paket.tgl_mulai_kerja)} s.d. ${formatTanggalIndo(paket.tgl_selesai_kontrak)} (${paket.masa_pelaksanaan_hari} hari kalender) sesuai Program Mutu${isKonstruksi ? ' dan Rencana Keselamatan Konstruksi (RKK)' : ''} yang telah disahkan dalam Rapat Persiapan Pelaksanaan Kontrak (PCM).`)
      );
      if (isKonstruksi) {
        paragraphs.push(
          pText(`Khusus Pekerjaan Konstruksi (Lampiran II Bab VII Perlem 3/2026): Penyedia telah menyerahkan bukti pembayaran BPJS Ketenagakerjaan Sektor Jasa Konstruksi paling lambat 1 (satu) hari kerja sebelum mobilisasi, serta melaksanakan pemeriksaan bersama awal (Mutual Check 0% / MC-0).`)
        );
      }
      break;

    case 15:
      paragraphs.push(
        pText('A. LAPORAN PENGENDALIAN PELAKSANAAN KONTRAK, ADENDUM/CCO, & PEMANTAUAN KONTRAK KRITIS (SCM)', { bold: true, before: 140 }),
        pText(`1. Realisasi fisik pelaksanaan pekerjaan mencapai 100% sesuai spesifikasi teknis dan kuantitas kontrak pada tanggal ${formatTanggalIndo(paket.tgl_realisasi_selesai)}.`),
        pText(`2. Jumlah hari keterlambatan: ${keu.hariTerlambat} hari kalender (Denda keterlambatan 1‰: ${formatRupiah(keu.totalDenda)}).`),
        pText(`3. Pengendalian Kontrak Kritis${isKonstruksi ? ' (Periode I rencana fisik 0-70% batas kritis deviasi 10%; Periode II rencana fisik 70-100% batas kritis deviasi 5%)' : ''}: ${paket.catatan_khusus_ppk || 'Pelaksanaan berjalan tertib sesuai ketentuan kontrak.'}`)
      );
      break;

    case 16:
      paragraphs.push(
        pText(`A. BERITA ACARA PEMERIKSAAN HASIL PEKERJAAN (BAPHP) & SERAH TERIMA PEKERJAAN (${isKonstruksi ? 'BAST PERTAMA / PHO & BAST AKHIR / FHO' : 'BAST PPK - PENYEDIA'})`, { bold: true, before: 140 }),
        pText(`${infoHari.kalimatFormal}, Pejabat Pembuat Komitmen (PPK) ${settings.nama_satker} (${ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN, S.Kom.'}) telah melakukan pemeriksaan fisik, kuantitas, dan spesifikasi atas pekerjaan "${paket.nama_paket}" yang dilaksanakan oleh ${penyedia.nama_perusahaan}, dengan kesimpulan: PEKERJAAN TELAH SELESAI 100% (SERATUS PERSEN) DALAM KONDISI BAIK DAN SESUAI KONTRAK.`),
        pText(`Selanjutnya PIHAK KEDUA (${penyedia.nama_perusahaan}) menyerahkan hasil pekerjaan kepada PIHAK KESATU (PPK ${settings.nama_satker}).`)
      );
      if (isKonstruksi) {
        paragraphs.push(
          pText(`Ketentuan Masa Pemeliharaan Konstruksi (PHO ke FHO): Terhitung sejak tanggal Serah Terima Pertama Pekerjaan (Provisional Hand-Over / PHO), Penyedia wajib melaksanakan pemeliharaan hasil pekerjaan selama Masa Pemeliharaan (minimal 180 hari kalender untuk pekerjaan permanen atau 90 hari kalender untuk pekerjaan semi-permanen) hingga ditandatanganinya Berita Acara Serah Terima Akhir Pekerjaan (Final Hand-Over / FHO).`)
        );
      }
      break;

    case 17:
      paragraphs.push(
        pText('A. BERITA ACARA SERAH TERIMA PPK KEPADA KPA (INPUT BMN/PERSEDIAAN SAKTI) & BERITA ACARA PEMBAYARAN (BAP / SPBy)', { bold: true, before: 140 }),
        pText(`1. Penyerahan Aset/Barang/Bangunan: PPK menyerahkan hasil pengadaan kepada Kuasa Pengguna Anggaran / Sekretaris KPU Kabupaten Ngawi (${kpa.nama_lengkap}) untuk dicatat dalam penatausahaan BMN / Persediaan pada aplikasi SAKTI.`),
        pText(`2. Perhitungan Pencairan Tagihan Pembayaran (SPBy / SPP-LS):`),
        pText(`   • Nilai Bruto Kontrak : ${formatRupiah(keu.nilaiKontrak)}`),
        pText(`   • Dasar Pengenaan Pajak (DPP) : ${formatRupiah(keu.dpp)}`),
        pText(`   • Potongan PPN (${paket.tarif_ppn}%) : ${formatRupiah(keu.ppn)}`),
        pText(`   • Potongan ${paket.jenis_pph} : ${formatRupiah(keu.pph)}`),
        pText(`   • Potongan Denda Keterlambatan (1‰ x ${keu.hariTerlambat} hari) : ${formatRupiah(keu.totalDenda)}`),
        ...(isKonstruksi ? [
          pText(`   • Nilai Retensi Pemeliharaan 5% Konstruksi : ${formatRupiah(keu.nilaiRetensi5Persen)} (Apabila ditahan Retensi 5% maka dibayar 95% saat PHO yaitu ${formatRupiah(keu.nilaiBersihDenganRetensi5)}; apabila menyerahkan Jaminan Pemeliharaan 5% maka dibayar 100% yaitu ${formatRupiah(keu.nilaiBersihDiterimaPenyedia)})`)
        ] : []),
        pText(`   • NILAI BERSIH DITERIMA PENYEDIA (NETTO 100%) : ${formatRupiah(keu.nilaiBersihDiterimaPenyedia)} (${terbilangRupiah(keu.nilaiBersihDiterimaPenyedia)}) melalui ${penyedia.nama_bank} No. Rek: ${penyedia.no_rekening} a.n. ${penyedia.atas_nama_rekening}.`)
      );
      break;

    case 18:
    default:
      paragraphs.push(
        pText('A. FORMULIR & SERTIFIKAT PENILAIAN KINERJA PENYEDIA OLEH PPK (BAB V PERLEM LKPP 3/2026)', { bold: true, before: 140 }),
        pText(`Berdasarkan hasil pelaksanaan kontrak dan BAST Nomor ${ctx.tahaps.find(t => t.no_tahap === 16)?.nomor_dokumen || '-'}, PPK melakukan evaluasi kinerja terhadap Penyedia ${penyedia.nama_perusahaan} dengan rincian nilai:`),
        pText(`1. Aspek Kualitas dan Kuantitas (Bobot 30%) : Skor ${paket.skor_kualitas ?? 3} -> Nilai Terbobot: ${(Number(paket.skor_kualitas ?? 3) * 0.3).toFixed(2)}`),
        pText(`2. Aspek Biaya (Bobot 20%) : Skor ${paket.skor_biaya ?? 3} -> Nilai Terbobot: ${(Number(paket.skor_biaya ?? 3) * 0.2).toFixed(2)}`),
        pText(`3. Aspek Waktu (Bobot 30%) : Skor ${paket.skor_waktu ?? 3} -> Nilai Terbobot: ${(Number(paket.skor_waktu ?? 3) * 0.3).toFixed(2)}`),
        pText(`4. Aspek Layanan (Bobot 20%) : Skor ${paket.skor_layanan ?? 3} -> Nilai Terbobot: ${(Number(paket.skor_layanan ?? 3) * 0.2).toFixed(2)}`),
        pText(`TOTAL SKOR KINERJA AKHIR: ${Number(paket.nilai_kinerja_akhir || 3).toFixed(2)} — PREDIKAT: ${(paket.predikat_kinerja || 'SANGAT BAIK').toUpperCase()} (${Number(paket.nilai_kinerja_akhir || 3) >= 2.5 ? 'Memenuhi syarat Repeat Order sesuai Pasal 38 Perpres 46/2025' : 'Catatan Evaluasi'}).`, { bold: true })
      );
      break;
  }

  return paragraphs;
}

function buildSectionForStage(stageNo, ctx) {
  const { paket, items, tahaps, penyedia, ppk, kpa, pejabatPengadaan, settings } = ctx;
  const def = DEFINISI_18_TAHAP.find(d => d.no === stageNo) || DEFINISI_18_TAHAP[0];
  const tahapRow = tahaps.find(t => Number(t.no_tahap) === stageNo) || {
    no_tahap: stageNo,
    nama_tahap: def.nama,
    nomor_dokumen: `${String(stageNo).padStart(3, '0')}/PPK-PBJ/KPU-NGW/2026`,
    tanggal_dokumen: paket.tgl_mulai_kerja
  };
  const keu = hitungKeuanganKontrak(paket);

  // Tentukan pihak penandatangan kiri sesuai tahap
  let pihakKiri = null;
  if ([8, 9].includes(stageNo)) {
    pihakKiri = {
      judulAtas: 'PEJABAT PENGADAAN / POKJA',
      subJudul: settings.nama_satker || 'KPU KABUPATEN NGAWI',
      nama: pejabatPengadaan.nama_lengkap || 'INDRAYU FATIKA MAHARDIKA',
      identitas: pejabatPengadaan.nip && pejabatPengadaan.nip !== '-' ? `NIP. ${pejabatPengadaan.nip}` : `Sertifikat: ${pejabatPengadaan.no_sertifikat_pbj || '-'}`
    };
  } else if ([12, 13, 14, 15, 16].includes(stageNo)) {
    pihakKiri = {
      judulAtas: 'UNTUK DAN ATAS NAMA PENYEDIA',
      subJudul: (penyedia.nama_perusahaan || 'PENYEDIA').toUpperCase(),
      nama: penyedia.nama_direktur || '-',
      identitas: penyedia.jabatan_penandatangan || 'Direktur'
    };
  } else if ([1, 3, 17].includes(stageNo)) {
    pihakKiri = {
      judulAtas: 'MENGETAHUI / MENYETUJUI:',
      subJudul: 'KUASA PENGGUNA ANGGARAN (SEKRETARIS KPU)',
      nama: kpa.nama_lengkap || 'BUDI RAHAYU, S.IP., M.Si.',
      identitas: `NIP. ${kpa.nip || '-'}`
    };
  }

  const pihakKanan = {
    judulAtas: 'PEJABAT PEMBUAT KOMITMEN (PPK)',
    subJudul: (settings.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase(),
    nama: ppk.nama_lengkap || 'MOHAMMAD NOOR JIHAN, S.Kom.',
    identitas: `NIP. ${ppk.nip || '-'} | Sertifikat: ${ppk.no_sertifikat_pbj || '-'}`
  };

  const modeHargaTabel = stageNo <= 8 ? 'hps' : 'kontrak';

  return {
    properties: {
      page: {
        margin: { top: 1134, right: 1134, bottom: 1134, left: 1417 } // Standar Naskah Dinas (Kiri 2.5cm, lainnya 2cm)
      }
    },
    children: [
      ...buildKopSuratKpu(settings),
      pText(`DOKUMEN TAHAP ${String(stageNo).padStart(2, '0')} — ${def.nama.toUpperCase()}`, {
        bold: true, size: 24, align: AlignmentType.CENTER, before: 60, after: 20
      }),
      pText(`NOMOR: ${tahapRow.nomor_dokumen || '-'}`, {
        bold: true, size: 21, align: AlignmentType.CENTER, before: 0, after: 160
      }),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          pLabelValue('Nama Paket Pengadaan', paket.nama_paket),
          pLabelValue('Kode RUP & Mata Anggaran (MAK)', `${paket.kode_rup || '-'} | MAK ${paket.kode_akun_mak} (${paket.nama_akun_mak})`),
          pLabelValue('Jenis & Metode Pengadaan', `${paket.jenis_pengadaan} — ${paket.cara_pengadaan} / ${paket.metode_pemilihan} (${paket.fitur_spse})`),
          pLabelValue('Bentuk & Jenis Kontrak', `${paket.bentuk_kontrak} (${paket.jenis_kontrak})`),
          pLabelValue('Nilai Pagu / HPS / Kontrak', `Pagu: ${formatRupiah(paket.nilai_pagu)} | ${paket.jenis_kertas_harga}: ${formatRupiah(paket.nilai_hps)} | Kontrak: ${formatRupiah(paket.nilai_kontrak)}`),
          pLabelValue('Pelaksana / Penyedia', `${penyedia.nama_perusahaan || '-'} (${penyedia.kualifikasi_usaha || 'UMK'}) — NPWP: ${penyedia.npwp || '-'}`)
        ]
      }),

      ...buildStageSpecificSections(stageNo, ctx, tahapRow, keu),

      pText('B. TABEL RINCIAN ITEM BARANG/JASA, SPESIFIKASI TEKNIS, DAN HARGA', { bold: true, before: 180, after: 80 }),
      buildTabelItemDocx(items, modeHargaTabel),
      pText(`Terbilang: # ${terbilangRupiah(modeHargaTabel === 'hps' ? paket.nilai_hps : paket.nilai_kontrak)} #`, {
        bold: true, italic: true, size: 20, before: 80, after: 140
      }),

      pText('Demikian dokumen administrasi pengadaan ini dibuat dengan sebenarnya dalam rangkap secukupnya untuk dipergunakan sebagaimana mestinya sesuai ketentuan peraturan perundang-undangan pengadaan barang/jasa pemerintah.', {
        before: 80, after: 120
      }),

      buildBlokTandaTangan(pihakKiri, pihakKanan, settings.kota_satker || 'Ngawi', tahapRow.tanggal_dokumen || paket.tgl_mulai_kerja)
    ]
  };
}

/**
 * Generate Buffer Word (.DOCX) untuk 1 Tahap Tertentu (1-18) atau "ALL" (Dokumen Gabungan 18 Tahap Hulu-Hilir)
 */
async function generateWordBuffer(ctx, modeOrStage = 13) {
  const stageNum = Number(modeOrStage);
  let sections = [];

  if (modeOrStage === 'ALL' || isNaN(stageNum)) {
    // Gabungkan seluruh tahap yang tidak di-bypass dalam 1 file Word Master Hulu-Hilir
    for (const def of DEFINISI_18_TAHAP) {
      const tRow = ctx.tahaps.find(t => Number(t.no_tahap) === def.no);
      if (tRow && tRow.status_tahap === 'Bypass') continue;
      sections.push(buildSectionForStage(def.no, ctx));
    }
  } else {
    sections.push(buildSectionForStage(stageNum, ctx));
  }

  const doc = new Document({
    creator: 'CAKRA KPU Kabupaten Ngawi (by emenje)',
    title: `Dokumen Pengadaan CAKRA - ${ctx.paket.nama_paket}`,
    sections
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

module.exports = {
  generateWordBuffer
};
