/**
 * CAKRA — Cetak Administrasi Kontrak & Rekam Pengadaan (KPU Kabupaten Ngawi)
 * Utilitas Format Angka, Terbilang Bahasa Indonesia, Tanggal Resmi, & Perhitungan Pajak/Denda/SBOB
 * Pengembang: emenje
 */

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const NAMA_HARI = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
];

const ANGKA_ROMAWI_BULAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function formatRupiah(num, withPrefix = true) {
  const n = Math.round(Number(num) || 0);
  const formatted = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return withPrefix ? `Rp ${formatted}` : formatted;
}

function terbilangInt(n) {
  n = Math.floor(Math.abs(Number(n) || 0));
  if (n === 0) return '';
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (n < 12) return satuan[n];
  if (n < 20) return `${terbilangInt(n - 10)} Belas`.trim();
  if (n < 100) return `${terbilangInt(Math.floor(n / 10))} Puluh ${terbilangInt(n % 10)}`.trim();
  if (n < 200) return `Seratus ${terbilangInt(n - 100)}`.trim();
  if (n < 1000) return `${terbilangInt(Math.floor(n / 100))} Ratus ${terbilangInt(n % 100)}`.trim();
  if (n < 2000) return `Seribu ${terbilangInt(n - 1000)}`.trim();
  if (n < 1000000) return `${terbilangInt(Math.floor(n / 1000))} Ribu ${terbilangInt(n % 1000)}`.trim();
  if (n < 1000000000) return `${terbilangInt(Math.floor(n / 1000000))} Juta ${terbilangInt(n % 1000000)}`.trim();
  if (n < 1000000000000) return `${terbilangInt(Math.floor(n / 1000000000))} Miliar ${terbilangInt(n % 1000000000)}`.trim();
  return `${terbilangInt(Math.floor(n / 1000000000000))} Triliun ${terbilangInt(n % 1000000000000)}`.trim();
}

function terbilangRupiah(num) {
  const n = Math.round(Number(num) || 0);
  if (n === 0) return 'Nol Rupiah';
  return `${terbilangInt(n).replace(/\s+/g, ' ')} Rupiah`;
}

function parseDateSafe(dateStr) {
  if (!dateStr) return new Date();
  const d = new Date(`${String(dateStr).substring(0, 10)}T08:00:00`);
  return isNaN(d.getTime()) ? new Date() : d;
}

function formatTanggalIndo(dateStr) {
  if (!dateStr) return '-';
  const d = parseDateSafe(dateStr);
  return `${d.getDate()} ${NAMA_BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function formatHariTanggalBeritaAcara(dateStr) {
  const d = parseDateSafe(dateStr);
  const hari = NAMA_HARI[d.getDay()];
  const tglKata = terbilangInt(d.getDate()) || 'Satu';
  const bulan = NAMA_BULAN[d.getMonth()];
  const tahunKata = terbilangInt(d.getFullYear());
  return {
    hari,
    tanggalAngka: d.getDate(),
    tanggalKata: tglKata,
    bulan,
    bulanRomawi: ANGKA_ROMAWI_BULAN[d.getMonth()],
    tahunAngka: d.getFullYear(),
    tahunKata,
    kalimatFormal: `Pada hari ini, ${hari} tanggal ${tglKata} bulan ${bulan} tahun ${tahunKata} (${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()})`
  };
}

/**
 * Kalkulasi Pajak, Uang Muka, Denda Keterlambatan (1 permil), & Nilai Bersih SAKTI
 * Sesuai Perpres 46/2025 & Lampiran I Perlem LKPP 3/2026
 */
function hitungKeuanganKontrak(paket) {
  const nilaiKontrak = Math.round(Number(paket.nilai_kontrak) || Number(paket.nilai_hps) || 0);
  const tarifPpn = Number(paket.tarif_ppn) || 0;
  const termasukPpn = Number(paket.termasuk_ppn) !== 0;
  const tarifPph = Number(paket.tarif_pph) || 0;
  const hariTerlambat = Math.max(0, parseInt(paket.hari_terlambat || 0, 10));
  const persenUangMuka = Number(paket.persen_uang_muka) || 0;

  let dpp = nilaiKontrak;
  let ppn = 0;

  if (tarifPpn > 0) {
    if (termasukPpn) {
      dpp = Math.round(nilaiKontrak / (1 + (tarifPpn / 100)));
      ppn = nilaiKontrak - dpp;
    } else {
      dpp = nilaiKontrak;
      ppn = Math.round(dpp * (tarifPpn / 100));
    }
  }

  const pph = Math.round(dpp * (tarifPph / 100));
  // Retensi 5% khusus Pekerjaan Konstruksi / Jasa yang mensyaratkan masa pemeliharaan (Lampiran II 7.1 Perlem 3/2026)
  const isKonstruksi = String(paket.jenis_pengadaan || '').includes('Konstruksi');
  const persenRetensi = Number(paket.persen_retensi ?? (isKonstruksi ? 5 : 0));
  const nilaiRetensi = Math.round((nilaiKontrak * persenRetensi) / 100);
  const nilaiRetensi5Persen = Math.round(nilaiKontrak * 0.05);

  // Denda 1 permil (1/1000) per hari dari nilai kontrak sebelum PPN (DPP)
  const dendaPerHari = Math.round(dpp / 1000);
  const totalDenda = dendaPerHari * hariTerlambat;
  const nilaiUangMuka = Math.round((nilaiKontrak * persenUangMuka) / 100);
  const nilaiJaminanPelaksanaan = Number(paket.wajib_jaminan_pelaksanaan) ? Math.round(nilaiKontrak * 0.05) : 0;
  const totalPotonganPajakDanDenda = ppn + pph + totalDenda;
  const nilaiBersihDiterimaPenyedia = nilaiKontrak - totalPotonganPajakDanDenda;
  const nilaiBersihDenganRetensi5 = nilaiBersihDiterimaPenyedia - nilaiRetensi5Persen;

  // Skor Kinerja PPK (0.00 - 3.00)
  const sKualitas = Number(paket.skor_kualitas ?? 3);
  const sBiaya = Number(paket.skor_biaya ?? 3);
  const sWaktu = Number(paket.skor_waktu ?? 3);
  const sLayanan = Number(paket.skor_layanan ?? 3);
  const skorAkhir = Number((sKualitas * 0.3 + sBiaya * 0.2 + sWaktu * 0.3 + sLayanan * 0.2).toFixed(2));
  let predikatKinerja = 'Sangat Baik';
  if (skorAkhir <= 0) predikatKinerja = 'Buruk';
  else if (skorAkhir < 2.0) predikatKinerja = 'Cukup';
  else if (skorAkhir < 2.5) predikatKinerja = 'Baik';

  return {
    nilaiPagu: Math.round(Number(paket.nilai_pagu) || 0),
    nilaiHps: Math.round(Number(paket.nilai_hps) || 0),
    nilaiKontrak,
    dpp,
    ppn,
    pph,
    persenRetensi,
    nilaiRetensi,
    nilaiRetensi5Persen,
    nilaiBersihDenganRetensi5,
    hariTerlambat,
    dendaPerHari,
    totalDenda,
    nilaiUangMuka,
    nilaiJaminanPelaksanaan,
    totalPotonganPajakDanDenda,
    nilaiBersihDiterimaPenyedia,
    skorAkhir,
    predikatKinerja,
    efisiensiTerhadapPagu: Math.max(0, Math.round(Number(paket.nilai_pagu) || 0) - nilaiKontrak),
    efisiensiTerhadapHps: Math.max(0, Math.round(Number(paket.nilai_hps) || 0) - nilaiKontrak)
  };
}

/**
 * Konversi Standar Biaya Konsultansi Nonkonstruksi (Lampiran I Bab II Perlem 3/2026)
 * SBOM = SBOB / 4.1
 * SBOH = (SBOB / 22) * 1.1
 * SBOJ = (SBOH / 8) * 1.3
 */
function hitungKonversiSbob(sbob) {
  const b = Number(sbob) || 0;
  const sbom = Math.round(b / 4.1);
  const sboh = Math.round((b / 22) * 1.1);
  const sboj = Math.round((sboh / 8) * 1.3);
  return { sbob: b, sbom, sboh, sboj };
}

/**
 * Decision Engine Regulasi 2025/2026 ("Smart Route & Bypass Recommender")
 */
function evaluasiJalurRegulasi(paket) {
  const pagu = Number(paket.nilai_pagu) || 0;
  const jenis = String(paket.jenis_pengadaan || 'Barang');
  const metode = String(paket.metode_pemilihan || 'E-Purchasing');
  const cara = String(paket.cara_pengadaan || 'Penyedia');

  let jenisKertasHarga = 'HPS';
  let bentukKontrak = 'SPK';
  let fiturSpse = 'Transaksional';
  let pelaksana = 'Pejabat Pengadaan';
  let wajibJaminan = 0;
  let minUangMukaUmk = 0;
  const bypassTahap = [];

  if (cara.startsWith('Swakelola')) {
    jenisKertasHarga = 'RAB Swakelola';
    bentukKontrak = cara === 'Swakelola Tipe I' ? 'SK Tim Swakelola' : 'Kontrak Swakelola';
    fiturSpse = 'Pencatatan';
    pelaksana = 'Tim Swakelola';
    bypassTahap.push(5, 10, 11, 12, 18);
  } else if (jenis === 'Dikecualikan') {
    jenisKertasHarga = 'Estimasi Pasar (Dikecualikan)';
    bentukKontrak = pagu <= 10000000 ? 'Bukti Pembelian' : (pagu <= 50000000 ? 'Kuitansi' : 'SPK');
    fiturSpse = 'Pencatatan';
    pelaksana = 'PPK';
    bypassTahap.push(11, 12);
  } else if (metode === 'E-Purchasing') {
    fiturSpse = 'Katalog v6';
    bentukKontrak = 'Surat Pesanan';
    jenisKertasHarga = pagu <= 100000000 ? 'Referensi Harga (E-Purchasing <=100Jt)' : 'HPS';
    pelaksana = pagu <= 200000000 ? 'Pejabat Pengadaan' : 'Pokja Pemilihan / PPK';
    wajibJaminan = pagu > 200000000 ? 1 : 0;
    if (pagu <= 200000000) bypassTahap.push(11);
  } else if (metode === 'Pengadaan Langsung') {
    pelaksana = 'Pejabat Pengadaan';
    if (jenis === 'Pekerjaan Konstruksi') {
      // Perubahan besar Perpres 46/2025 & Lampiran II Perlem 3/2026: Pengadaan Langsung Konstruksi s.d. Rp400 Juta!
      fiturSpse = pagu <= 50000000 ? 'Pencatatan' : 'Transaksional';
      bentukKontrak = pagu <= 10000000 ? 'Bukti Pembelian' : (pagu <= 50000000 ? 'Kuitansi / SPK' : 'SPK');
      jenisKertasHarga = pagu <= 10000000 ? 'Bebas HPS (<=10Jt)' : 'HPS (Engineer Estimate / AHSP)';
      wajibJaminan = 0;
    } else if (jenis === 'Jasa Konsultansi Nonkonstruksi' || jenis === 'Jasa Konsultansi Konstruksi') {
      fiturSpse = 'Transaksional';
      bentukKontrak = 'SPK';
      jenisKertasHarga = 'HPS';
    } else if (pagu <= 10000000) {
      fiturSpse = 'Pencatatan';
      bentukKontrak = 'Bukti Pembelian';
      jenisKertasHarga = 'Bebas HPS (<=10Jt)';
      bypassTahap.push(6, 8, 10, 11, 12, 14, 15);
    } else if (pagu <= 50000000) {
      fiturSpse = 'Pencatatan';
      bentukKontrak = 'Kuitansi';
      jenisKertasHarga = 'HPS';
      bypassTahap.push(11, 12, 14);
    } else {
      fiturSpse = 'Transaksional';
      bentukKontrak = 'SPK';
      jenisKertasHarga = 'HPS';
    }
  } else {
    // Tender / Seleksi / Penunjukan Langsung / Rancang Bangun
    fiturSpse = 'Transaksional';
    pelaksana = 'Pokja Pemilihan';
    if (jenis === 'Pekerjaan Konstruksi') {
      bentukKontrak = pagu <= 400000000 ? 'SPK' : 'Surat Perjanjian';
      jenisKertasHarga = 'HPS (Engineer Estimate / DED)';
      wajibJaminan = 1;
    } else if (jenis === 'Pekerjaan Konstruksi Terintegrasi Rancang dan Bangun') {
      bentukKontrak = 'Surat Perjanjian';
      jenisKertasHarga = 'Pagu Pekerjaan Rancang Bangun (Ketentuan PPK)';
      wajibJaminan = 1;
    } else {
      bentukKontrak = 'Surat Perjanjian';
      jenisKertasHarga = 'HPS';
      wajibJaminan = (jenis.includes('Konsultansi')) ? 0 : 1;
    }
  }

  // Segmentasi SBU Konstruksi (Pasal 4 Perlem 3/2026)
  let segmentasiKonstruksi = '-';
  if (jenis === 'Pekerjaan Konstruksi') {
    if (pagu <= 2000000000) segmentasiKonstruksi = 'Subkualifikasi Usaha Kecil 1 (K1) — Afirmasi Domisili Kab/Kota';
    else if (pagu <= 7500000000) segmentasiKonstruksi = 'Subkualifikasi Usaha Kecil 2 (K2) — Afirmasi Provinsi';
    else if (pagu <= 15000000000) segmentasiKonstruksi = 'Subkualifikasi Usaha Kecil 3 (K3)';
    else if (pagu <= 50000000000) segmentasiKonstruksi = 'Kualifikasi Usaha Menengah (M)';
    else segmentasiKonstruksi = 'Kualifikasi Usaha Besar (B)';
  } else if (jenis === 'Jasa Konsultansi Konstruksi') {
    if (pagu <= 1000000000) segmentasiKonstruksi = 'Kualifikasi Usaha Kecil';
    else if (pagu <= 2500000000) segmentasiKonstruksi = 'Kualifikasi Usaha Menengah';
    else segmentasiKonstruksi = 'Kualifikasi Usaha Besar';
  }

  // Aturan Uang Muka Wajib UMK (Pasal 29 Perpres 46/2025)
  if (Number(paket.peruntukan_umk) === 1 && pagu > 50000000) {
    if (pagu <= 200000000) minUangMukaUmk = 50;
    else if (pagu <= 2500000000) minUangMukaUmk = 30;
    else minUangMukaUmk = 30;
  }

  return {
    jenisKertasHarga,
    bentukKontrak,
    bentukKontrakRekomendasi: bentukKontrak,
    fiturSpse,
    pelaksana,
    pelaksanaRekomendasi: pelaksana,
    wajibJaminan,
    minUangMukaUmk,
    segmentasiKonstruksi,
    bypassTahap,
    catatanRegulasi: [
      `Jalur Pemilihan: ${metode} (${fiturSpse}) dilaksanakan oleh ${pelaksana}.`,
      `Bentuk Kontrak: ${bentukKontrak} | Kertas Kerja Harga: ${jenisKertasHarga}.`,
      ...(segmentasiKonstruksi !== '-' ? [`Segmentasi Konstruksi (Pasal 4 Perlem 3/2026): ${segmentasiKonstruksi} | Berlaku PHO, Masa Pemeliharaan 6/3 Bulan, Retensi 5%, & FHO.`] : [])
    ]
  };
}

/**
 * Generator Kronologi 18 Tahap Otomatis (Anti-Tabrakan Tanggal & Skip Akhir Pekan)
 */
const DEFINISI_18_TAHAP = [
  { no: 1, fase: 1, kode: 'IDK', nama: 'Identifikasi Kebutuhan PBJ (Basis DIPA/RKB)', outputUtama: '01_Form_Identifikasi_Kebutuhan', selisihHariKerja: 0 },
  { no: 2, fase: 1, kode: 'PMK', nama: 'Penetapan Jenis, Cara Pengadaan, & Pemaketan', outputUtama: '02_BA_Pemaketan_PBJ', selisihHariKerja: 1 },
  { no: 3, fase: 1, kode: 'RUP', nama: 'Penyusunan RUP & Pengumuman SIRUP', outputUtama: '03_Kertas_Kerja_RUP_SIRUP', selisihHariKerja: 1 },
  { no: 4, fase: 2, kode: 'SPEK', nama: 'Penetapan KAK, Spesifikasi Teknis, DED & SMKK (PDN/TKDN)', outputUtama: '04_Dokumen_KAK_Spesifikasi_DED_SMKK', selisihHariKerja: 1 },
  { no: 5, fase: 2, kode: 'AP', nama: 'Analisa Pasar & Penilaian PPK atas Katalog Elektronik', outputUtama: '05_BA_Analisa_Pasar_Penilaian_PPK', selisihHariKerja: 1 },
  { no: 6, fase: 2, kode: 'HPS', nama: 'Penyusunan Referensi Harga / HPS / AHSP / RAB Swakelola', outputUtama: '06_Kertas_Kerja_HPS_RefHarga_AHSP', selisihHariKerja: 1 },
  { no: 7, fase: 2, kode: 'RK', nama: 'Penyusunan Rancangan Kontrak (SSUK, SSKK, Bentuk Kontrak)', outputUtama: '07_Draft_Rancangan_Kontrak_SSKK', selisihHariKerja: 0 },
  { no: 8, fase: 3, kode: 'DPP', nama: 'Penyerahan DPP & Reviu Dokumen Persiapan Pengadaan', outputUtama: '08_Surat_Penyerahan_dan_BA_Reviu_DPP', selisihHariKerja: 1 },
  { no: 9, fase: 3, kode: 'PIL', nama: 'Pelaksanaan Pemilihan Penyedia / Negosiasi / BAHPL', outputUtama: '09_BA_Evaluasi_Negosiasi_BAHPL', selisihHariKerja: 2 },
  { no: 10, fase: 4, kode: 'REV', nama: 'Reviu Hasil Pemilihan (BAHP/BAHPL) oleh PPK & Validasi BO', outputUtama: '10_BA_Reviu_Hasil_Pemilihan_BO', selisihHariKerja: 1 },
  { no: 11, fase: 4, kode: 'SPPBJ', nama: 'Penerbitan SPPBJ & Permintaan Jaminan Pelaksanaan', outputUtama: '11_Surat_Penunjukan_Penyedia_SPPBJ', selisihHariKerja: 1 },
  { no: 12, fase: 4, kode: 'PAM', nama: 'Rapat Persiapan Penandatanganan Kontrak (Pre-Award)', outputUtama: '12_BA_Rapat_Persiapan_TTD_Kontrak', selisihHariKerja: 1 },
  { no: 13, fase: 4, kode: 'KTR', nama: 'Penandatanganan Naskah Kontrak Final', outputUtama: '13_Naskah_Kontrak_Final', selisihHariKerja: 1 },
  { no: 14, fase: 5, kode: 'SPMK', nama: 'Penyerahan Lokasi (MC-0), SPMK/SPP, Program Mutu, RKK & PCM', outputUtama: '14_SPMK_SPP_Program_Mutu_RKK_PCM', selisihHariKerja: 0 },
  { no: 15, fase: 5, kode: 'MON', nama: 'Pengendalian Kontrak, Monitoring, Adendum/CCO & SCM', outputUtama: '15_Laporan_Monitoring_CCO_SCM', selisihHariKerja: 5 },
  { no: 16, fase: 6, kode: 'BAST', nama: 'Pemeriksaan (BAPHP) & Serah Terima (BAST / PHO & FHO)', outputUtama: '16_BAPHP_dan_BAST_PHO_FHO', selisihHariKerja: 5 },
  { no: 17, fase: 6, kode: 'BAP', nama: 'BAST PPK ke KPA (BMN/Persediaan), Retensi 5% & Pembayaran SAKTI', outputUtama: '17_BAST_KPA_dan_BAP_SPBy_Pajak', selisihHariKerja: 1 },
  { no: 18, fase: 6, kode: 'PKP', nama: 'Penilaian Kinerja Penyedia oleh PPK (Skor 0-3)', outputUtama: '18_Sertifikat_Penilaian_Kinerja_PPK', selisihHariKerja: 1 }
];

function tambahHariKerja(dateObj, days) {
  const result = new Date(dateObj.getTime());
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      remaining--;
    }
  }
  // Pastikan tidak jatuh di Sabtu/Minggu walaupun days === 0
  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1);
  }
  return result;
}

function susunJadwal18TahapOtomatis(paket, tanggalMulaiPersiapan = '2026-05-04') {
  const evaluasi = evaluasiJalurRegulasi(paket);
  let cursorDate = parseDateSafe(tanggalMulaiPersiapan);
  while (cursorDate.getDay() === 0 || cursorDate.getDay() === 6) {
    cursorDate.setDate(cursorDate.getDate() + 1);
  }

  const masaKerja = Math.max(1, parseInt(paket.masa_pelaksanaan_hari || 14, 10));
  const nomorPaketUrut = String(paket.id || 1).padStart(2, '0');
  const hasil = [];

  for (const def of DEFINISI_18_TAHAP) {
    const isBypass = evaluasi.bypassTahap.includes(def.no);
    if (!isBypass && def.selisihHariKerja > 0) {
      if (def.no === 15) {
        cursorDate = tambahHariKerja(cursorDate, Math.max(1, Math.floor(masaKerja / 2)));
      } else if (def.no === 16) {
        cursorDate = tambahHariKerja(cursorDate, Math.max(1, Math.ceil(masaKerja / 2)));
      } else {
        cursorDate = tambahHariKerja(cursorDate, def.selisihHariKerja);
      }
    }

    const yyyy = cursorDate.getFullYear();
    const mm = String(cursorDate.getMonth() + 1).padStart(2, '0');
    const dd = String(cursorDate.getDate()).padStart(2, '0');
    const romawi = ANGKA_ROMAWI_BULAN[cursorDate.getMonth()];
    const tglIso = `${yyyy}-${mm}-${dd}`;
    const noUrutSurat = String(def.no).padStart(3, '0');
    const nomorDokumen = isBypass
      ? '-'
      : `${noUrutSurat}/${ def.kode }-${nomorPaketUrut}/PPK-PBJ/KPU-NGW/${romawi}/${yyyy}`;

    let stageStatus = 'Terkunci';
    let docNum = '';
    let docDate = '';

    if (isBypass) {
      stageStatus = 'Bypass';
      docNum = '-';
      docDate = tglIso;
    } else if (def.no === 1) {
      // Tahap 1 inisiasi awal paket: Draft
      stageStatus = 'Draft';
      docNum = nomorDokumen;
      docDate = tglIso;
    } else {
      // Tahap 2 s/d 18 (yang belum dikerjakan user): MUTLAK TERKUNCI dan belum ada isian
      stageStatus = 'Terkunci';
      docNum = '';
      docDate = '';
    }

    hasil.push({
      paket_id: paket.id,
      no_tahap: def.no,
      fase: def.fase,
      nama_tahap: def.nama,
      nomor_dokumen: docNum,
      tanggal_dokumen: docDate,
      status_tahap: stageStatus,
      link_drive_dokumen: null,
      catatan_tahap: isBypass ? 'Dilewati otomatis sesuai matriks regulasi 2025/2026' : (stageStatus === 'Draft' ? `Dokumen Tahap ${def.no} (${def.nama})` : '')
    });
  }

  return hasil;
}


/**
 * 14 TEMPLATE SKENARIO BAKU PENGADAAN (JENIS BELANJA × BESARAN NILAI)
 * Berdasarkan Perpres 46/2025, Perlem LKPP 2/2026, Perlem LKPP 3/2026 (Lampiran I, II, & III),
 * Perlem LKPP 3/2021 (Swakelola) & Perlem LKPP 5/2021 (Dikecualikan)
 */
const TEMPLATES_PENGADAAN = [
  {
    id: 'TPL-01',
    nama: 'Barang / Jasa Lainnya (≤ Rp 100 Jt via E-Purchasing Katalog v6)',
    kategori: 'E-PURCHASING',
    jenis_pengadaan: 'Barang',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'E-Purchasing',
    min_pagu: 0,
    max_pagu: 100000000,
    bentuk_kontrak: 'Surat Pesanan',
    jenis_kontrak: 'Lumsum',
    jenis_kertas_harga: 'Referensi Harga (E-Purchasing <=100Jt)',
    pelaksana: 'Pejabat Pengadaan',
    tarif_pph: 1.5,
    jenis_pph: 'PPh 22 Barang (1.5%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 0,
    bypass_tahap: [11],
    dasar_hukum: 'Pasal 9 & 38 Perpres 46/2025 jo. Keputusan Kepala LKPP No. 177 Tahun 2024 (Lampiran III: Tata Cara E-Purchasing V6) jo. Pasal 9 Perlem LKPP 2/2026',
    deskripsi: 'Pengadaan barang/jasa via Katalog v6 dengan nilai s.d. Rp 100 Juta dibebaskan dari penyusunan HPS formal (digantikan kertas kerja Referensi Harga & Bukti Survei Etalase Katalog V6 sesuai Kepka LKPP 177/2024) dan tidak memerlukan SPPBJ.'
  },
  {
    id: 'TPL-02',
    nama: 'Barang / Jasa Lainnya (> Rp 100 Jt s.d. Rp 200 Jt via E-Purchasing Katalog v6)',
    kategori: 'E-PURCHASING',
    jenis_pengadaan: 'Barang',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'E-Purchasing',
    min_pagu: 100000001,
    max_pagu: 200000000,
    bentuk_kontrak: 'Surat Pesanan',
    jenis_kontrak: 'Lumsum',
    jenis_kertas_harga: 'HPS',
    pelaksana: 'Pejabat Pengadaan',
    tarif_pph: 1.5,
    jenis_pph: 'PPh 22 Barang (1.5%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 0,
    bypass_tahap: [11],
    dasar_hukum: 'Pasal 26 & 38 Perpres 46/2025 jo. Keputusan Kepala LKPP No. 177 Tahun 2024 (Katalog V6) jo. Lampiran I Perlem LKPP 3/2026',
    deskripsi: 'Pengadaan barang/jasa via Katalog v6 di atas Rp 100 Juta wajib menyusun HPS oleh PPK. Untuk nilai s.d. Rp 200 Juta dilaksanakan oleh Pejabat Pengadaan dan dibebaskan dari Jaminan Pelaksanaan.'
  },
  {
    id: 'TPL-03',
    nama: 'Barang / Jasa Lainnya (> Rp 200 Jt via E-Purchasing Katalog v6)',
    kategori: 'E-PURCHASING',
    jenis_pengadaan: 'Barang',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'E-Purchasing',
    min_pagu: 200000001,
    max_pagu: 999999999999,
    bentuk_kontrak: 'Surat Pesanan',
    jenis_kontrak: 'Lumsum',
    jenis_kertas_harga: 'HPS',
    pelaksana: 'Pokja Pemilihan / PPK',
    tarif_pph: 1.5,
    jenis_pph: 'PPh 22 Barang (1.5%)',
    wajib_jaminan_pelaksanaan: 1,
    persen_retensi: 0,
    bypass_tahap: [],
    dasar_hukum: 'Pasal 30 & 38 Perpres 46/2025 jo. Keputusan Kepala LKPP No. 177 Tahun 2024 jo. Perlem LKPP 2/2026',
    deskripsi: 'E-Purchasing bernilai di atas Rp 200 Juta wajib menyusun HPS, dilaksanakan oleh Pokja/PPK, dan wajib meminta Jaminan Pelaksanaan sebesar 5% dari nilai kontrak sebelum penandatanganan kontrak/surat pesanan.'
  },
  {
    id: 'TPL-04',
    nama: 'Barang / Jasa Lainnya (≤ Rp 10 Jt Non-Katalog / Pengadaan Langsung Mikro)',
    kategori: 'PENGADAAN_LANGSUNG',
    jenis_pengadaan: 'Barang',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'Pengadaan Langsung',
    min_pagu: 0,
    max_pagu: 10000000,
    bentuk_kontrak: 'Bukti Pembelian',
    jenis_kontrak: 'Lumsum',
    jenis_kertas_harga: 'Bebas HPS (<=10Jt)',
    pelaksana: 'Pejabat Pengadaan',
    tarif_pph: 0,
    jenis_pph: 'Bebas PPh (0%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 0,
    bypass_tahap: [6, 8, 10, 11, 12, 14, 15],
    dasar_hukum: 'Pasal 26 ayat (7) & Pasal 28 Perpres 46/2025',
    deskripsi: 'Belanja operasional mikro s.d. Rp 10 Juta: dibebaskan dari kewajiban HPS, cukup menggunakan Bukti Pembelian/Nota Toko, dan otomatis melewati 7 tahapan formal (Bypass).'
  },
  {
    id: 'TPL-05',
    nama: 'Barang / Jasa Lainnya (> Rp 10 Jt s.d. Rp 50 Jt Non-Katalog / Kuitansi)',
    kategori: 'PENGADAAN_LANGSUNG',
    jenis_pengadaan: 'Barang',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'Pengadaan Langsung',
    min_pagu: 10000001,
    max_pagu: 50000000,
    bentuk_kontrak: 'Kuitansi',
    jenis_kontrak: 'Lumsum',
    jenis_kertas_harga: 'HPS',
    pelaksana: 'Pejabat Pengadaan',
    tarif_pph: 1.5,
    jenis_pph: 'PPh 22 Barang (1.5%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 0,
    bypass_tahap: [11, 12, 14],
    dasar_hukum: 'Pasal 28 Perpres 46/2025 jo. Lampiran I Perlem LKPP 3/2026',
    deskripsi: 'Pengadaan bernilai Rp 10 Jt s.d. Rp 50 Jt: wajib menyusun HPS oleh PPK, bentuk kontrak cukup Kuitansi dinas bermeterai, dan melewati SPPBJ, Pre-Award, serta SPMK.'
  },
  {
    id: 'TPL-06',
    nama: 'Barang / Jasa Lainnya (> Rp 50 Jt s.d. Rp 200 Jt Non-Katalog / SPK)',
    kategori: 'PENGADAAN_LANGSUNG',
    jenis_pengadaan: 'Barang',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'Pengadaan Langsung',
    min_pagu: 50000001,
    max_pagu: 200000000,
    bentuk_kontrak: 'SPK',
    jenis_kontrak: 'Lumsum',
    jenis_kertas_harga: 'HPS',
    pelaksana: 'Pejabat Pengadaan',
    tarif_pph: 1.5,
    jenis_pph: 'PPh 22 Barang (1.5%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 0,
    bypass_tahap: [],
    dasar_hukum: 'Pasal 28 & 38 Perpres 46/2025 jo. Lampiran I Perlem LKPP 3/2026',
    deskripsi: 'Pengadaan Langsung standar non-katalog Rp 50 Jt s.d. Rp 200 Jt: wajib menggunakan Surat Perintah Kerja (SPK), HPS lengkap 3 survei, dan menjalankan seluruh 18 tahapan pengadaan.'
  },
  {
    id: 'TPL-07',
    nama: 'Barang / Jasa Lainnya (> Rp 200 Jt Non-Katalog / Tender)',
    kategori: 'TENDER',
    jenis_pengadaan: 'Barang',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'Tender',
    min_pagu: 200000001,
    max_pagu: 999999999999,
    bentuk_kontrak: 'Surat Perjanjian',
    jenis_kontrak: 'Lumsum',
    jenis_kertas_harga: 'HPS',
    pelaksana: 'Pokja Pemilihan',
    tarif_pph: 1.5,
    jenis_pph: 'PPh 22 Barang (1.5%)',
    wajib_jaminan_pelaksanaan: 1,
    persen_retensi: 0,
    bypass_tahap: [],
    dasar_hukum: 'Pasal 28 & 38 Perpres 46/2025 jo. Lampiran I Perlem LKPP 3/2026',
    deskripsi: 'Pengadaan Barang/Jasa Lainnya di atas Rp 200 Juta non-katalog: wajib melalui Tender oleh Pokja Pemilihan, bentuk kontrak Surat Perjanjian, dan penyerahan Jaminan Pelaksanaan 5%.'
  },
  {
    id: 'TPL-08',
    nama: 'Pekerjaan Konstruksi (≤ Rp 50 Jt / Pengadaan Langsung Sederhana)',
    kategori: 'KONSTRUKSI',
    jenis_pengadaan: 'Pekerjaan Konstruksi',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'Pengadaan Langsung',
    min_pagu: 0,
    max_pagu: 50000000,
    bentuk_kontrak: 'Kuitansi / SPK',
    jenis_kontrak: 'Gabungan Lumsum dan Harga Satuan',
    jenis_kertas_harga: 'HPS (Engineer Estimate / AHSP)',
    pelaksana: 'Pejabat Pengadaan',
    tarif_pph: 1.75,
    jenis_pph: 'PPh Final Konstruksi Kecil SBU K1/K2/K3 (1.75%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 5,
    bypass_tahap: [11, 12],
    dasar_hukum: 'Lampiran II Perlem LKPP 3/2026 jo. PP 9/2021',
    deskripsi: 'Pekerjaan konstruksi skala kecil: wajib HPS berbasis Analisa Harga Satuan Pekerjaan (AHSP), PPh Final 1,75%, retensi pemeliharaan 5% saat PHO, dan pengawasan teknis.'
  },
  {
    id: 'TPL-09',
    nama: 'Pekerjaan Konstruksi (> Rp 50 Jt s.d. Rp 400 Jt — Perpres 46/2025)',
    kategori: 'KONSTRUKSI',
    jenis_pengadaan: 'Pekerjaan Konstruksi',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'Pengadaan Langsung',
    min_pagu: 50000001,
    max_pagu: 400000000,
    bentuk_kontrak: 'SPK',
    jenis_kontrak: 'Gabungan Lumsum dan Harga Satuan',
    jenis_kertas_harga: 'HPS (Engineer Estimate / AHSP)',
    pelaksana: 'Pejabat Pengadaan',
    tarif_pph: 1.75,
    jenis_pph: 'PPh Final Konstruksi Kecil SBU K1/K2/K3 (1.75%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 5,
    bypass_tahap: [],
    dasar_hukum: 'Pasal 38 Perpres 46/2025 jo. Lampiran II Perlem LKPP 3/2026',
    deskripsi: 'Ketentuan Perpres 46/2025: Pengadaan Langsung Konstruksi diperluas s.d. Rp 400 Juta dengan SPK, HPS (AHSP/DED), RKK SMKK, PHO, retensi 5% pemeliharaan (3-6 bulan), dan FHO.'
  },
  {
    id: 'TPL-10',
    nama: 'Pekerjaan Konstruksi (> Rp 400 Jt — Tender Konstruksi)',
    kategori: 'KONSTRUKSI',
    jenis_pengadaan: 'Pekerjaan Konstruksi',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'Tender',
    min_pagu: 400000001,
    max_pagu: 999999999999,
    bentuk_kontrak: 'Surat Perjanjian',
    jenis_kontrak: 'Harga Satuan',
    jenis_kertas_harga: 'HPS (Engineer Estimate / DED)',
    pelaksana: 'Pokja Pemilihan',
    tarif_pph: 1.75,
    jenis_pph: 'PPh Final Konstruksi Kecil SBU K1/K2/K3 (1.75%)',
    wajib_jaminan_pelaksanaan: 1,
    persen_retensi: 5,
    bypass_tahap: [],
    dasar_hukum: 'Pasal 28 & 38 Perpres 46/2025 jo. Lampiran II Perlem LKPP 3/2026',
    deskripsi: 'Pekerjaan konstruksi di atas Rp 400 Juta wajib melalui Tender oleh Pokja Pemilihan, Surat Perjanjian, Jaminan Pelaksanaan 5%, Kontrak Kritis SCM, dan Retensi 5% PHO ke FHO.'
  },
  {
    id: 'TPL-11',
    nama: 'Jasa Konsultansi (≤ Rp 100 Jt — Pengadaan Langsung)',
    kategori: 'KONSULTANSI',
    jenis_pengadaan: 'Jasa Konsultansi Nonkonstruksi',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'Pengadaan Langsung',
    min_pagu: 0,
    max_pagu: 100000000,
    bentuk_kontrak: 'SPK',
    jenis_kontrak: 'Waktu Penugasan',
    jenis_kertas_harga: 'HPS',
    pelaksana: 'Pejabat Pengadaan',
    tarif_pph: 2.0,
    jenis_pph: 'PPh 23 Jasa Lainnya / Konsultansi Badan (2%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 0,
    bypass_tahap: [],
    dasar_hukum: 'Pasal 38 Perpres 46/2025 jo. Lampiran I & II Perlem LKPP 3/2026',
    deskripsi: 'Jasa Konsultansi s.d. Rp 100 Juta melalui Pengadaan Langsung: HPS berbasis KAK & SBOB (Remunerasi Tenaga Ahli), bentuk kontrak SPK, dan tidak mensyaratkan Jaminan Pelaksanaan.'
  },
  {
    id: 'TPL-12',
    nama: 'Jasa Konsultansi (> Rp 100 Jt — Seleksi)',
    kategori: 'KONSULTANSI',
    jenis_pengadaan: 'Jasa Konsultansi Nonkonstruksi',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'Seleksi',
    min_pagu: 100000001,
    max_pagu: 999999999999,
    bentuk_kontrak: 'Surat Perjanjian',
    jenis_kontrak: 'Waktu Penugasan',
    jenis_kertas_harga: 'HPS',
    pelaksana: 'Pokja Pemilihan',
    tarif_pph: 2.0,
    jenis_pph: 'PPh 23 Jasa Lainnya / Konsultansi Badan (2%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 0,
    bypass_tahap: [],
    dasar_hukum: 'Pasal 38 & 41 Perpres 46/2025',
    deskripsi: 'Jasa Konsultansi di atas Rp 100 Juta wajib melalui Seleksi oleh Pokja Pemilihan dengan Surat Perjanjian dan evaluasi proposal teknis & biaya.'
  },
  {
    id: 'TPL-13',
    nama: 'Swakelola Tipe I–IV (Penyelenggaraan Internal KPU / Pokja / Instansi Lain)',
    kategori: 'SWAKELOLA',
    jenis_pengadaan: 'Swakelola',
    cara_pengadaan: 'Swakelola Tipe I',
    metode_pemilihan: 'Swakelola',
    min_pagu: 0,
    max_pagu: 999999999999,
    bentuk_kontrak: 'Kontrak Swakelola',
    jenis_kontrak: 'Kontrak Swakelola',
    jenis_kertas_harga: 'RAB Swakelola',
    pelaksana: 'Tim Swakelola',
    tarif_pph: 0,
    jenis_pph: 'PPh 21 Tenaga Ahli / Swakelola (5%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 0,
    bypass_tahap: [5, 10, 11, 12, 18],
    dasar_hukum: 'Perpres 16/2018 jo. 46/2025 jo. Peraturan LKPP Nomor 3 Tahun 2021',
    deskripsi: 'Kegiatan swakelola direncanakan dan dilaksanakan sendiri oleh KPU/Pokja atau K/L/PD lain: menggunakan RAB Swakelola, SK Tim Penyelenggara, dan bebas HPS/penyedia pasar.'
  },
  {
    id: 'TPL-14',
    nama: 'Pengadaan yang Dikecualikan (Hotel/Meeting, PLN/PDAM/Internet, Media)',
    kategori: 'DIKECUALIKAN',
    jenis_pengadaan: 'Dikecualikan',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'Mekanisme Pasar (Dikecualikan)',
    min_pagu: 0,
    max_pagu: 999999999999,
    bentuk_kontrak: 'SPK',
    jenis_kontrak: 'Lumsum',
    jenis_kertas_harga: 'Estimasi Pasar (Dikecualikan)',
    pelaksana: 'PPK / Pejabat Pengadaan',
    tarif_pph: 2.0,
    jenis_pph: 'PPh 23 Jasa Lainnya / Konsultansi Badan (2%)',
    wajib_jaminan_pelaksanaan: 0,
    persen_retensi: 0,
    bypass_tahap: [11, 12],
    dasar_hukum: 'Perpres 16/2018 jo. 46/2025 jo. Peraturan LKPP Nomor 5 Tahun 2021',
    deskripsi: 'Pengadaan barang/jasa tarif resmi atau praktik bisnis yang sudah mapan (sewa hotel/ruang rapat, tiket, utilitas): menggunakan kertas kerja estimasi pasar dan bentuk kontrak fleksibel.'
  }
];

/**
 * PANDUAN KERJA DETAIL 18 TAHAP (LENGKAP PEJABAT PIC, DASAR HUKUM, CHECKLIST & TIPS)
 */
const PANDUAN_18_TAHAP = {
  1: {
    fase: 1,
    faseNama: 'FASE 1: PERENCANAAN PENGADAAN (1–3)',
    nama: 'Identifikasi Kebutuhan PBJ (Basis DIPA/RKB)',
    pejabatPic: 'Pejabat Pembuat Komitmen (PPK)',
    dasarHukum: 'Pasal 18 & 19 Perpres 46/2025 jo. Bab II Perlem LKPP 2/2026',
    outputDokumen: '01_Form_Identifikasi_Kebutuhan.docx',
    checklist: [
      'Sinkronkan nama paket dan rincian item langsung dari RUH Belanja RKB terkunci (Baseline Sah).',
      'Tetapkan volume kebutuhan riil, spesifikasi mutu awal, dan waktu penggunaan barang/jasa.',
      'Pastikan ketersediaan mata anggaran (MAK 6 digit) dan kecukupan pagu DIPA/NPHD.'
    ],
    tips: 'Gunakan fitur "📥 Tarik Mata Anggaran dari RKB" di SI-PRABU agar kode akun, uraian belanja, dan pagu terintegrasi tanpa input ulang manual.'
  },
  2: {
    fase: 1,
    faseNama: 'FASE 1: PERENCANAAN PENGADAAN (1–3)',
    nama: 'Penetapan Jenis, Cara Pengadaan, & Pemaketan',
    pejabatPic: 'PPK & Kuasa Pengguna Anggaran (KPA)',
    dasarHukum: 'Pasal 20, 21, 22 Perpres 46/2025 jo. Bab III Perlem LKPP 2/2026',
    outputDokumen: '02_BA_Pemaketan_PBJ.docx',
    checklist: [
      'Pilih cara pengadaan: Melalui Penyedia atau Swakelola (Tipe I, II, III, atau IV).',
      'Tetapkan jenis pengadaan: Barang, Jasa Lainnya, Konsultansi, atau Pekerjaan Konstruksi.',
      'Dilarang keras memecah paket pengadaan untuk menghindari kewajiban tender/seleksi (Pasal 20 ayat 2).',
      'Pastikan alokasi minimal 40% anggaran belanja dialokasikan untuk Produk Usaha Mikro, Kecil & Koperasi (Pasal 65).'
    ],
    tips: 'Sistem otomatis merekomendasikan bentuk kontrak & kertas harga sesuai pagu dan jenis pengadaan yang dipilih.'
  },
  3: {
    fase: 1,
    faseNama: 'FASE 1: PERENCANAAN PENGADAAN (1–3)',
    nama: 'Penyusunan RUP & Pengumuman SIRUP',
    pejabatPic: 'Kuasa Pengguna Anggaran (KPA / Sekretaris KPU)',
    dasarHukum: 'Pasal 22 Perpres 46/2025 jo. Bab IV Perlem LKPP 2/2026',
    outputDokumen: '03_Kertas_Kerja_RUP_SIRUP.docx',
    checklist: [
      'Input rencana pengadaan ke aplikasi SiRUP LKPP resmi (https://sirup.lkpp.go.id).',
      'Catat dan input Kode RUP SiRUP resmi ke dalam data paket di SI-PRABU.',
      'Pastikan RUP telah terumumkan kepada publik sebelum tahap pelaksanaan pengadaan dimulai.'
    ],
    tips: 'Kode RUP wajib diisi sebelum masuk ke Fase 3 (Pemilihan Penyedia) agar terverifikasi audit PBJ.'
  },
  4: {
    fase: 2,
    faseNama: 'FASE 2: PERSIAPAN PPK (4–7)',
    nama: 'Penetapan KAK, Spesifikasi Teknis, DED & SMKK (PDN/TKDN)',
    pejabatPic: 'Pejabat Pembuat Komitmen (PPK)',
    dasarHukum: 'Pasal 25 & 66 Perpres 46/2025 jo. Bab I Lampiran I & II Perlem LKPP 3/2026',
    outputDokumen: '04_Dokumen_KAK_Spesifikasi_DED_SMKK.docx',
    checklist: [
      'Susun rincian spesifikasi teknis: mutu/kualitas, kuantitas volume, waktu pelaksanaan, dan lokasi penyerahan.',
      'Wajib prioritaskan Produk Dalam Negeri (PDN) ber-TKDN+BMP minimal 40% (Pasal 66).',
      'Khusus Pekerjaan Konstruksi: Lampirkan DED (Detail Engineering Design), AHSP, dan RKK SMKK Keselamatan Konstruksi.'
    ],
    tips: 'Isi tabel item pada Sub-Tab 2 di Kokpit untuk mencatat spesifikasi teknis dan komitmen persentase TKDN per item.'
  },
  5: {
    fase: 2,
    faseNama: 'FASE 2: PERSIAPAN PPK (4–7)',
    nama: 'Analisa Pasar & Penilaian PPK atas Katalog Elektronik v6',
    pejabatPic: 'Pejabat Pembuat Komitmen (PPK)',
    dasarHukum: 'Pasal 38 Perpres 46/2025 jo. Keputusan Kepala LKPP Nomor 177 Tahun 2024 (Lampiran I & II) jo. Pasal 8 & 9 Perlem LKPP 2/2026',
    outputDokumen: '05_BA_Analisa_Pasar_Penilaian_PPK.docx',
    checklist: [
      'Lakukan penelusuran etalase pada Katalog Elektronik Versi 6 (v6) sesuai ketentuan Kepka LKPP 177/2024.',
      'Jika produk tersedia dan memenuhi syarat teknis/waktu/harga, prioritaskan transaksi via E-Purchasing.',
      'Jika transaksi E-Purchasing bernilai s.d. Rp 100 Juta, dibebaskan dari penyusunan HPS formal (cukup referensi harga pasar/katalog).',
      'Jika tidak memilih E-Purchasing (misal karena spesifikasi khusus atau harga tidak kompetitif), wajib mengisi Dokumen Penilaian PPK.'
    ],
    tips: 'Dokumen Penilaian PPK melindungi pejabat pengadaan dari temuan auditor mengapa tidak memilih E-Purchasing Katalog.'
  },
  6: {
    fase: 2,
    faseNama: 'FASE 2: PERSIAPAN PPK (4–7)',
    nama: 'Penyusunan Referensi Harga / HPS / AHSP / RAB Swakelola',
    pejabatPic: 'Pejabat Pembuat Komitmen (PPK)',
    dasarHukum: 'Pasal 26 Perpres 46/2025 jo. Keputusan Kepala LKPP Nomor 177 Tahun 2024 (Pembebasan HPS E-Purchasing s.d. 100 Jt) jo. Pasal 9 Perlem 2/2026 & Bab II Lampiran I/II Perlem 3/2026',
    outputDokumen: '06_Kertas_Kerja_HPS_RefHarga_AHSP.docx & .xlsx',
    checklist: [
      'Paket ≤ Rp 10 Juta: Bebas HPS (cukup nota pembelian toko).',
      'E-Purchasing ≤ Rp 100 Juta: Bebas HPS (cukup Kertas Kerja Referensi Harga survei etalase katalog).',
      'Paket > Rp 10 Juta non-katalog: Wajib menyusun HPS berbasis minimal 2-3 sumber survei independen.',
      'Nilai HPS/Referensi Harga tidak boleh melebihi Pagu Anggaran DIPA/RKB (HPS <= Pagu).'
    ],
    tips: 'Gunakan Sub-Tab 2 Kokpit untuk memasukkan harga survei 1 dan survei 2; sistem otomatis menghitung HPS dan selisihnya.'
  },
  7: {
    fase: 2,
    faseNama: 'FASE 2: PERSIAPAN PPK (4–7)',
    nama: 'Penyusunan Rancangan Kontrak (SSUK, SSKK, Bentuk Kontrak)',
    pejabatPic: 'Pejabat Pembuat Komitmen (PPK)',
    dasarHukum: 'Pasal 27 & 28 Perpres 46/2025 jo. Bab III Lampiran I/II Perlem LKPP 3/2026',
    outputDokumen: '07_Draft_Rancangan_Kontrak_SSKK.docx',
    checklist: [
      'Tetapkan bentuk kontrak: Bukti Pembelian (≤ 10Jt), Kuitansi (≤ 50Jt), SPK (≤ 200Jt / Konstruksi ≤ 400Jt), atau Surat Perjanjian.',
      'Tetapkan klausul uang muka UMK (wajib jika diminta: 50% untuk s.d. 200Jt, 30% untuk s.d. 2.5M).',
      'Tetapkan klausul sanksi denda keterlambatan 1 permil (1/1000) per hari dari nilai kontrak sebelum PPN (DPP).',
      'Tetapkan syarat masa pemeliharaan & retensi 5% jika pekerjaan konstruksi.'
    ],
    tips: 'Draft kontrak ini akan diserahkan kepada Pejabat Pengadaan/Pokja untuk dijadikan lampiran dokumen pemilihan.'
  },
  8: {
    fase: 3,
    faseNama: 'FASE 3: PEMILIHAN PENYEDIA (8–9)',
    nama: 'Penyerahan DPP & Reviu Dokumen Persiapan Pengadaan',
    pejabatPic: 'PPK kepada Pejabat Pengadaan / Pokja Pemilihan',
    dasarHukum: 'Pasal 13 & 38 Perpres 46/2025 jo. Bab IV Lampiran I/II Perlem 3/2026',
    outputDokumen: '08_Surat_Penyerahan_dan_BA_Reviu_DPP.docx',
    checklist: [
      'PPK menyerahkan DPP lengkap: KAK/Spesifikasi, HPS/Ref. Harga, Rancangan Kontrak, dan Dokumen Anggaran DIPA/RKB.',
      'Pejabat Pengadaan / Pokja mereviu kelengkapan teknis, ketersediaan anggaran, dan rancangan kontrak.',
      'Penandatanganan Berita Acara Reviu Dokumen Persiapan Pengadaan (BA Reviu DPP).'
    ],
    tips: 'Pastikan tanggal Berita Acara Reviu DPP mendahului pengiriman undangan atau pembukaan etalase katalog.'
  },
  9: {
    fase: 3,
    faseNama: 'FASE 3: PEMILIHAN PENYEDIA (8–9)',
    nama: 'Pelaksanaan Pemilihan Penyedia / Negosiasi / BAHPL / E-Purchasing',
    pejabatPic: 'Pejabat Pengadaan / Pokja Pemilihan',
    dasarHukum: 'Pasal 38 s.d. 43 Perpres 46/2025 jo. Keputusan Kepala LKPP Nomor 177 Tahun 2024 (Lampiran III: E-Purchasing, Negosiasi & Mini-Kompetisi) jo. Bab IV Lampiran I/II Perlem LKPP 3/2026',
    outputDokumen: '09_BA_Evaluasi_Negosiasi_BAHPL.docx',
    checklist: [
      'Kirim undangan klarifikasi teknis & negosiasi harga kepada penyedia yang memenuhi kualifikasi usaha (UMK).',
      'Untuk transaksi E-Purchasing Katalog V6, lakukan negosiasi harga digital atau gunakan fitur Mini-Kompetisi (Kepka LKPP 177/2024).',
      'Lakukan negosiasi harga serendah mungkin untuk menghasilkan penghematan anggaran (efisiensi belanja).',
      'Nilai hasil negosiasi/penawaran akhir tidak boleh melebihi nilai HPS/Referensi Harga.',
      'Terbitkan Berita Acara Hasil Pengadaan Langsung (BAHPL) / Surat Pesanan Katalog.'
    ],
    tips: 'Nilai hasil negosiasi pada tahap ini menjadi angka baku Nilai Kontrak yang akan ditandatangani PPK.'
  },
  10: {
    fase: 4,
    faseNama: 'FASE 4: TTD KONTRAK & PENUNJUKAN (10–13)',
    nama: 'Reviu Hasil Pemilihan (BAHP/BAHPL) oleh PPK & Validasi BO',
    pejabatPic: 'Pejabat Pembuat Komitmen (PPK)',
    dasarHukum: 'Pasal 8 Perlem LKPP 3/2026 jo. Perpres 13/2018 (Prinsip Mengenali Pemilik Manfaat)',
    outputDokumen: '10_BA_Reviu_Hasil_Pemilihan_BO.docx',
    checklist: [
      'PPK menerima BAHPL dari Pejabat Pengadaan / Pokja Pemilihan.',
      'Reviu kesesuaian prosedur pemilihan dan kebenaran administrasi rekanan terpilih.',
      'Validasi identitas Beneficial Ownership (Pemilik Manfaat Akhir) penyedia untuk mencegah konflik kepentingan.',
      'Pastikan rekening bank penyedia berstatus aktif dan sesuai nama perusahaan/badan usaha.'
    ],
    tips: 'Data BO dapat diinput langsung di Master Penyedia SI-PRABU agar otomatis tertera di Berita Acara Tahap 10.'
  },
  11: {
    fase: 4,
    faseNama: 'FASE 4: TTD KONTRAK & PENUNJUKAN (10–13)',
    nama: 'Penerbitan SPPBJ & Permintaan Jaminan Pelaksanaan',
    pejabatPic: 'Pejabat Pembuat Komitmen (PPK)',
    dasarHukum: 'Pasal 30 & 31 Perpres 46/2025',
    outputDokumen: '11_Surat_Penunjukan_Penyedia_SPPBJ.docx',
    checklist: [
      'Terbitkan Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) resmi kepada rekanan pemenang.',
      'Jika nilai kontrak > Rp 200 Juta (Non-Konsultansi): Minta penyerahan Jaminan Pelaksanaan 5% sebelum kontrak diteken.',
      'Untuk paket Pengadaan Langsung ≤ Rp 50 Jt atau E-Purchasing ≤ Rp 200 Jt: Tahap ini dilewati otomatis (Bypass).'
    ],
    tips: 'Format SPPBJ mencantumkan batas waktu penandatanganan kontrak dan persyaratan jaminan pelaksanaan.'
  },
  12: {
    fase: 4,
    faseNama: 'FASE 4: TTD KONTRAK & PENUNJUKAN (10–13)',
    nama: 'Rapat Persiapan Penandatanganan Kontrak (Pre-Award)',
    pejabatPic: 'PPK bersama Direktur / Pimpinan Penyedia Terpilih',
    dasarHukum: 'Bab V Lampiran I/II Perlem LKPP 3/2026',
    outputDokumen: '12_BA_Rapat_Persiapan_TTD_Kontrak.docx',
    checklist: [
      'Konfirmasi draf naskah kontrak final, lampiran spesifikasi teknis, dan jadwal waktu pelaksanaan.',
      'Verifikasi keaslian Jaminan Pelaksanaan (apabila dipersyaratkan).',
      'Penandatanganan Berita Acara Pre-Award Meeting oleh kedua belah pihak.'
    ],
    tips: 'Tahap ini memastikan tidak ada perbedaan penafsiran isi kontrak antara PPK dan Penyedia sebelum meterai ditandatangani.'
  },
  13: {
    fase: 4,
    faseNama: 'FASE 4: TTD KONTRAK & PENUNJUKAN (10–13)',
    nama: 'Penandatanganan Naskah Kontrak Final',
    pejabatPic: 'PPK & Direktur Penyedia',
    dasarHukum: 'Pasal 28 & 32 Perpres 46/2025',
    outputDokumen: '13_Naskah_Kontrak_Final.docx',
    checklist: [
      'Cetak naskah kontrak (Surat Pesanan / Kuitansi / SPK / Surat Perjanjian) dalam rangkap secukupnya.',
      'Bubuhkan meterai resmi Rp 10.000 pada lembar tanda tangan kedua belah pihak.',
      'Pastikan posisi nama pejabat PPK dan Direktur Penyedia tercetak sejajar secara presisi.',
      'Bubuhkan paraf pada kotak paraf footer di setiap halaman naskah sebelum lembar tanda tangan.'
    ],
    tips: 'Generator Word SI-PRABU otomatis membuat nama pejabat sejajar dan menyertakan kotak paraf footer 2 pihak.'
  },
  14: {
    fase: 5,
    faseNama: 'FASE 5: PELAKSANAAN & PENGENDALIAN (14–15)',
    nama: 'Penyerahan Lokasi (MC-0), SPMK/SPP, Program Mutu, RKK & PCM',
    pejabatPic: 'PPK & Penyedia',
    dasarHukum: 'Bab VI Lampiran I/II Perlem LKPP 3/2026',
    outputDokumen: '14_SPMK_SPP_Program_Mutu_RKK_PCM.docx',
    checklist: [
      'Terbitkan Surat Perintah Mulai Kerja (SPMK) / Surat Pesanan Penyedia (SPP) resmi.',
      'Selenggarakan Rapat Persiapan Pelaksanaan Kontrak (Pre-Construction Meeting / PCM).',
      'Khusus Konstruksi: Lakukan serah terima lapangan dan pengukuran bersama 0% (Mutual Check 0 / MC-0).',
      'Sahkan Program Mutu dan Rencana Keselamatan Konstruksi (RKK SMKK).'
    ],
    tips: 'Tanggal SPMK menjadi penanda resmi hari kalender ke-1 dimulainya masa pelaksanaan pekerjaan.'
  },
  15: {
    fase: 5,
    faseNama: 'FASE 5: PELAKSANAAN & PENGENDALIAN (14–15)',
    nama: 'Pengendalian Kontrak, Monitoring, Adendum/CCO & SCM',
    pejabatPic: 'PPK, Tim Teknis / Pengawas & Penyedia',
    dasarHukum: 'Bab VI Lampiran I/II Perlem LKPP 3/2026',
    outputDokumen: '15_Laporan_Monitoring_CCO_SCM.docx',
    checklist: [
      'Lakukan pengawasan lapangan berkala terhadap pemenuhan mutu, volume, dan deviasi jadwal.',
      'Jika terjadi keterlambatan kritis (-10% periode I / -5% periode II): Segera selenggarakan Show Cause Meeting (SCM).',
      'Jika terdapat perubahan lapangan: Terbitkan Berita Acara Contract Change Order (CCO) & Adendum Kontrak.'
    ],
    tips: 'Dokumentasikan foto progres pekerjaan dan catatan pengawasan teknis sebagai lampiran Berita Acara.'
  },
  16: {
    fase: 6,
    faseNama: 'FASE 6: BAST, PEMBAYARAN & EVALUASI (16–18)',
    nama: 'Pemeriksaan (BAPHP) & Serah Terima (BAST / PHO & FHO)',
    pejabatPic: 'PPHP / PPK bersama Penyedia',
    dasarHukum: 'Pasal 57 Perpres 46/2025 jo. Bab VII Lampiran I/II Perlem LKPP 3/2026',
    outputDokumen: '16_BAPHP_dan_BAST_PHO_FHO.docx',
    checklist: [
      'Lakukan pemeriksaan fisik pekerjaan 100% dan terbitkan Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP).',
      'Terbitkan Berita Acara Serah Terima (BAST) Pekerjaan antara Penyedia dan PPK.',
      'Khusus Konstruksi: Terbitkan Berita Acara Serah Terima Pertama (PHO), tetapkan retensi 5% atau jaminan pemeliharaan, serta jadwalkan FHO setelah masa pemeliharaan (3-6 bulan).'
    ],
    tips: 'BAST Tahap 16 merupakan syarat mutlak dan dokumen sumber utama untuk pengajuan Surat Permintaan Pembayaran (SPP).'
  },
  17: {
    fase: 6,
    faseNama: 'FASE 6: BAST, PEMBAYARAN & EVALUASI (16–18)',
    nama: 'BAST PPK ke KPA (BMN/Persediaan), Retensi 5% & Pembayaran SAKTI',
    pejabatPic: 'PPK ke KPA & Bendahara Pengeluaran',
    dasarHukum: 'Pasal 57 Perpres 46/2025 jo. PMK 62/2023 & PMK 181/2022 (SAKTI)',
    outputDokumen: '17_BAST_KPA_dan_BAP_SPBy_Pajak.docx',
    checklist: [
      'Serah terima aset hasil pengadaan dari PPK kepada KPA (BAST PPK-KPA).',
      'Pencatatan aset pada aplikasi SAKTI Kemenkeu (Modul Persediaan atau Modul Aset Tetap BMN).',
      'Terbitkan Berita Acara Pembayaran (BAP) dan SPBy dengan kalkulasi potongan PPN (11%), PPh, retensi 5%, serta denda keterlambatan (1 permil) jika ada.',
      'Serahkan berkas tagihan lengkap kepada Bendahara Pengeluaran / Pejabat Penandatangan SPM (PPSPM).'
    ],
    tips: 'Sub-Tab 4 Kokpit menyediakan kalkulator instan DPP, PPN 11%, PPh, retensi 5%, denda 1‰, dan Netto SP2D.'
  },
  18: {
    fase: 6,
    faseNama: 'FASE 6: BAST, PEMBAYARAN & EVALUASI (16–18)',
    nama: 'Penilaian Kinerja Penyedia oleh PPK (Skor 0-3)',
    pejabatPic: 'Pejabat Pembuat Komitmen (PPK)',
    dasarHukum: 'Pasal 8 Perlem LKPP 2/2026 jo. Keputusan Kepala LKPP Nomor 177 Tahun 2024 (Evaluasi Kinerja Penyedia E-Katalog) jo. Bab VIII Lampiran I/II Perlem LKPP 3/2026',
    outputDokumen: '18_Sertifikat_Penilaian_Kinerja_PPK.docx',
    checklist: [
      'Isi evaluasi kinerja penyedia di sistem sebelum proses pembayaran rampung.',
      'Nilai 4 indikator bobot resmi: Kualitas (30%), Biaya (20%), Waktu (30%), Layanan (20%).',
      'Penyedia dengan skor >= 2.50 (Sangat Baik) berhak mendapatkan rekomendasi Repeat Order (maksimal 2 kali dalam 3 tahun).',
      'Cetak Sertifikat Penilaian Kinerja Penyedia sebagai arsip kepatuhan satker.'
    ],
    tips: 'Skor kinerja penyedia langsung tersimpan ke Master Penyedia SI-PRABU untuk rekam jejak pengadaan masa depan.'
  }
};

/**
 * Mencari Template Baku yang Paling Cocok Berdasarkan Data Paket
 */
function cariTemplatePengadaan(paket) {
  const pagu = Number(paket.nilai_pagu || paket.pagu_anggaran || paket.pagu || paket.nilai_hps || paket.nilai_kontrak || 0);
  const jenis = String(paket.jenis_pengadaan || 'Barang').trim();
  const cara = String(paket.cara_pengadaan || 'Penyedia').trim();
  const metode = String(paket.metode_pemilihan || 'E-Purchasing').trim();

  // 1. Swakelola
  if (cara.startsWith('Swakelola') || jenis === 'Swakelola') {
    return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-13') || TEMPLATES_PENGADAAN[12];
  }

  // 2. Dikecualikan
  if (jenis === 'Dikecualikan' || metode.includes('Dikecualikan') || metode.includes('Mekanisme Pasar')) {
    return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-14') || TEMPLATES_PENGADAAN[13];
  }

  // 3. Pekerjaan Konstruksi
  if (jenis.includes('Konstruksi') && !jenis.includes('Konsultansi')) {
    if (pagu <= 50000000) return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-08');
    if (pagu <= 400000000) return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-09');
    return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-10');
  }

  // 4. Jasa Konsultansi
  if (jenis.includes('Konsultansi')) {
    if (pagu <= 100000000) return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-11');
    return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-12');
  }

  // 5. Barang / Jasa Lainnya via E-Purchasing
  if (metode === 'E-Purchasing') {
    if (pagu <= 100000000) return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-01');
    if (pagu <= 200000000) return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-02');
    return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-03');
  }

  // 6. Barang / Jasa Lainnya Non-Katalog (Pengadaan Langsung & Tender)
  if (pagu <= 10000000) return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-04');
  if (pagu <= 50000000) return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-05');
  if (pagu <= 200000000) return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-06');
  return TEMPLATES_PENGADAAN.find(t => t.id === 'TPL-07');
}

/**
 * Evaluasi Audit Kepatuhan, Double-Check Sistem vs User, & Peringatan Dini (Early Warning Engine)
 */
function evaluasiAuditPaket(paket, tahaps = [], items = [], penyedia = null, pejabats = [], activeStageNo = 6) {
  const tpl = cariTemplatePengadaan(paket);
  const pagu = Number(paket.nilai_pagu || 0);
  const hps = Number(paket.nilai_hps || 0);
  const kontrak = Number(paket.nilai_kontrak || 0);
  const jenis = String(paket.jenis_pengadaan || 'Barang');
  const metode = String(paket.metode_pemilihan || 'E-Purchasing');
  const bentukKontrak = String(paket.bentuk_kontrak || 'SPK');
  const jenisKertas = String(paket.jenis_kertas_harga || 'HPS');
  const tarifPph = Number(paket.tarif_pph ?? 1.5);
  const isKonstruksi = jenis.includes('Konstruksi') && !jenis.includes('Konsultansi');

  // --- A. DOUBLE-CHECK TABLE (STANDAR TEMPLATE VS ISIAN USER) ---
  const doubleCheck = [
    {
      parameter: 'Metode Pemilihan',
      standarTemplate: tpl.metode_pemilihan,
      nilaiUser: metode,
      isMatch: metode === tpl.metode_pemilihan,
      keterangan: (metode === tpl.metode_pemilihan)
        ? 'Sesuai standar template regulasi'
        : `Deviasi: Regulasi merekomendasikan "${tpl.metode_pemilihan}" untuk ${tpl.nama}`
    },
    {
      parameter: 'Kertas Kerja Harga (Tahap 6)',
      standarTemplate: tpl.jenis_kertas_harga,
      nilaiUser: jenisKertas,
      isMatch: jenisKertas === tpl.jenis_kertas_harga || (tpl.id === 'TPL-01' && jenisKertas.includes('Referensi')),
      keterangan: (jenisKertas === tpl.jenis_kertas_harga || (tpl.id === 'TPL-01' && jenisKertas.includes('Referensi')))
        ? 'Sesuai standar template regulasi'
        : `Deviasi: Seharusnya menggunakan "${tpl.jenis_kertas_harga}"`
    },
    {
      parameter: 'Bentuk Kontrak (Tahap 13)',
      standarTemplate: tpl.bentuk_kontrak,
      nilaiUser: bentukKontrak,
      isMatch: bentukKontrak === tpl.bentuk_kontrak || (tpl.bentuk_kontrak === 'Kuitansi / SPK' && (bentukKontrak === 'Kuitansi' || bentukKontrak === 'SPK')),
      keterangan: (bentukKontrak === tpl.bentuk_kontrak || (tpl.bentuk_kontrak === 'Kuitansi / SPK' && (bentukKontrak === 'Kuitansi' || bentukKontrak === 'SPK')))
        ? 'Sesuai batasan nilai Pasal 28 Perpres 46/2025'
        : `Deviasi: Nilai ${pagu > 0 ? formatRupiah(pagu) : ''} seharusnya menggunakan "${tpl.bentuk_kontrak}"`
    },
    {
      parameter: 'Tarif PPh & Perpajakan (Tahap 17)',
      standarTemplate: `${tpl.jenis_pph} (${tpl.tarif_pph}%)`,
      nilaiUser: `${paket.jenis_pph || 'PPh'} (${tarifPph}%)`,
      isMatch: Math.abs(tarifPph - tpl.tarif_pph) < 0.01,
      keterangan: (Math.abs(tarifPph - tpl.tarif_pph) < 0.01)
        ? 'Sesuai ketentuan tarif perpajakan objek belanja'
        : `Deviasi: Objek ${jenis} standar pengenaan PPh adalah ${tpl.jenis_pph}`
    },
    {
      parameter: 'Jaminan Pelaksanaan (Tahap 11)',
      standarTemplate: tpl.wajib_jaminan_pelaksanaan ? 'Wajib 5% Nilai Kontrak' : 'Tidak Dipersyaratkan',
      nilaiUser: Number(paket.wajib_jaminan_pelaksanaan) ? 'Wajib 5% Nilai Kontrak' : 'Tidak Dipersyaratkan',
      isMatch: Number(paket.wajib_jaminan_pelaksanaan || 0) === Number(tpl.wajib_jaminan_pelaksanaan),
      keterangan: Number(paket.wajib_jaminan_pelaksanaan || 0) === Number(tpl.wajib_jaminan_pelaksanaan)
        ? 'Sesuai Pasal 30 Perpres 46/2025'
        : (tpl.wajib_jaminan_pelaksanaan ? 'Deviasi: Nilai > Rp 200 Jt wajib meminta Jaminan Pelaksanaan 5%' : 'Deviasi: Jaminan Pelaksanaan tidak dipersyaratkan untuk tier nilai ini')
    },
    {
      parameter: 'Retensi Pemeliharaan 5% (Tahap 16-17)',
      standarTemplate: tpl.persen_retensi > 0 ? `Wajib ${tpl.persen_retensi}% (PHO ke FHO)` : 'Tidak Dipersyaratkan (0%)',
      nilaiUser: Number(paket.persen_retensi || (isKonstruksi ? 5 : 0)) > 0 ? `${Number(paket.persen_retensi || (isKonstruksi ? 5 : 0))}% Retensi` : 'Tidak Ada (0%)',
      isMatch: isKonstruksi ? Number(paket.persen_retensi || 5) === 5 : true,
      keterangan: isKonstruksi
        ? 'Pekerjaan konstruksi wajib menahan Retensi 5% atau jaminan pemeliharaan dari PHO sampai FHO'
        : 'Pengadaan nonkonstruksi tidak mensyaratkan retensi pemeliharaan'
    }
  ];

  // --- B. EARLY-WARNING ENGINE (DETEKSI MASALAH & PROSES TERLEWAT) ---
  const warnings = [];

  // 1. Cek Pagu vs HPS vs Kontrak
  if (pagu <= 0) {
    warnings.push({
      kategori: 'Batas Anggaran',
      level: 'danger',
      tahap_terkait: 1,
      pesan: 'Nilai Pagu DIPA/RKB masih Rp 0! Masukkan nilai anggaran sebelum melanjutkan.',
      solusi: 'Isi nilai pagu di Formulir Paket atau tarik mata anggaran langsung dari RKB.'
    });
  }
  if (hps > pagu && pagu > 0) {
    warnings.push({
      kategori: 'Batas Anggaran',
      level: 'danger',
      tahap_terkait: 6,
      pesan: `Nilai HPS/Referensi Harga (${formatRupiah(hps)}) melampaui Pagu Anggaran DIPA/RKB (${formatRupiah(pagu)})! PPK dilarang menetapkan HPS di atas pagu.`,
      solusi: 'Sesuaikan volume atau harga survei pada Kertas Kerja HPS agar tidak melampaui pagu.'
    });
  }
  if (kontrak > hps && hps > 0) {
    warnings.push({
      kategori: 'Batas Anggaran',
      level: 'danger',
      tahap_terkait: 9,
      pesan: `Nilai Kontrak (${formatRupiah(kontrak)}) lebih tinggi dari HPS (${formatRupiah(hps)})! Hal ini melanggar prinsip pengadaan efisien.`,
      solusi: 'Lakukan negosiasi ulang atau revisi penawaran agar kontrak <= HPS.'
    });
  }

  // 2. Cek Batasan Nilai Pengadaan Langsung
  if (metode === 'Pengadaan Langsung' && !isKonstruksi && pagu > 200000000) {
    warnings.push({
      kategori: 'Kepatuhan Regulasi',
      level: 'danger',
      tahap_terkait: 2,
      pesan: `Pengadaan Langsung Barang/Jasa Lainnya dibatasi maksimal Rp 200 Juta (Pasal 38 Perpres 46/2025). Nilai paket ini ${formatRupiah(pagu)} wajib melalui Tender atau E-Purchasing!`,
      solusi: 'Ubah metode pemilihan ke "E-Purchasing" atau "Tender".'
    });
  }
  if (metode === 'Pengadaan Langsung' && isKonstruksi && pagu > 400000000) {
    warnings.push({
      kategori: 'Kepatuhan Regulasi',
      level: 'danger',
      tahap_terkait: 2,
      pesan: `Pengadaan Langsung Pekerjaan Konstruksi dibatasi maksimal Rp 400 Juta (Pasal 38 Perpres 46/2025). Nilai paket ini ${formatRupiah(pagu)} wajib melalui Tender Konstruksi!`,
      solusi: 'Ubah metode pemilihan ke "Tender".'
    });
  }

  // 3. Cek Kode RUP SiRUP
  if (!paket.kode_rup || String(paket.kode_rup).trim() === '' || String(paket.kode_rup).trim() === '-') {
    warnings.push({
      kategori: 'Kelengkapan Data',
      level: 'warning',
      tahap_terkait: 3,
      pesan: 'Kode RUP SiRUP LKPP belum diisi. Pastikan paket telah diumumkan pada SiRUP sebelum penunjukan penyedia.',
      solusi: 'Input kode paket SiRUP pada form paket atau Tahap 3.'
    });
  }

  // 4. Cek Penyedia & Beneficial Ownership (BO)
  if (!paket.penyedia_id || Number(paket.penyedia_id) <= 0) {
    warnings.push({
      kategori: 'Kelengkapan Data',
      level: 'warning',
      tahap_terkait: 9,
      pesan: 'Penyedia / Rekanan belum dipilih untuk paket ini.',
      solusi: 'Pilih penyedia pada Formulir Paket atau buat data rekanan baru di Master Penyedia.'
    });
  } else if (penyedia && (!penyedia.bo_nama_pemilik_manfaat || penyedia.bo_nama_pemilik_manfaat === '-')) {
    warnings.push({
      kategori: 'Kelengkapan Data',
      level: 'warning',
      tahap_terkait: 10,
      pesan: `Penyedia "${penyedia.nama_perusahaan}" belum melengkapi data Pemilik Manfaat (Beneficial Ownership) sesuai Pasal 8 Perlem LKPP 3/2026.`,
      solusi: 'Buka Master Penyedia lalu isi kolom Pemilik Manfaat (BO).'
    });
  }

  // 5. Cek Rincian Item (Tahap 4 & 6)
  if (!items || items.length === 0) {
    warnings.push({
      kategori: 'Kelengkapan Data',
      level: 'danger',
      tahap_terkait: 4,
      pesan: 'Belum ada rincian item barang/jasa/konstruksi di tabel Sub-Tab 2. Kertas kerja HPS dan naskah kontrak tidak dapat dicetak.',
      solusi: 'Buka Sub-Tab 2 di Kokpit lalu klik "➕ Tambah Baris Item".'
    });
  }

  // 6. Cek Penilaian Kinerja PPK saat Selesai
  const isSelesai = String(paket.status_paket || '').toLowerCase().includes('selesai') || Number(paket.tahap_aktif) >= 18;
  if (isSelesai && Number(paket.skor_kualitas ?? 3) === 0 && Number(paket.skor_biaya ?? 3) === 0) {
    warnings.push({
      kategori: 'Kepatuhan Regulasi',
      level: 'warning',
      tahap_terkait: 18,
      pesan: 'Paket berstatus selesai namun Penilaian Kinerja Penyedia oleh PPK (Tahap 18) belum dinilai.',
      solusi: 'Buka Sub-Tab 4 lalu berikan penilaian skor kinerja 4 indikator.'
    });
  }

  // 7. Cek Prasyarat Lompat Tahap & Kronologi Tanggal (1 s.d. activeStageNo)
  const tahapMap = {};
  (tahaps || []).forEach(t => { tahapMap[Number(t.no_tahap)] = t; });

  let prevDate = null;
  for (let s = 1; s <= 18; s++) {
    const tRow = tahapMap[s];
    const isBypass = tpl.bypass_tahap.includes(s) || (tRow && tRow.status_tahap === 'Bypass');

    if (!isBypass && tRow) {
      const curDateStr = tRow.tanggal_dokumen ? String(tRow.tanggal_dokumen).substring(0, 10) : '';

      // Cek apakah tahap sebelum activeStageNo masih Draft atau kosong
      if (s < activeStageNo) {
        const isNotDone = tRow.status_tahap === 'Draft' || !tRow.nomor_dokumen || tRow.nomor_dokumen === '-' || !curDateStr;
        if (isNotDone) {
          warnings.push({
            kategori: 'Lompat Tahap',
            level: 'warning',
            tahap_terkait: s,
            pesan: `Tahap ${s} (${tRow.nama_tahap}) belum diselesaikan (nomor surat/tanggal belum lengkap), padahal saat ini berada di Tahap ${activeStageNo}.`,
            solusi: `Lengkapi nomor surat dan tanggal pada Tahap ${s} di Sub-Tab 3 (Time-Machine).`
          });
        }
      }

      // Cek Tanggal Mundur (Backdate Check)
      if (curDateStr) {
        const curDate = new Date(curDateStr + 'T00:00:00');
        if (!isNaN(curDate.getTime())) {
          // Cek akhir pekan
          const day = curDate.getDay();
          if (day === 0 || day === 6) {
            warnings.push({
              kategori: 'Kronologi Tanggal',
              level: 'warning',
              tahap_terkait: s,
              pesan: `Tanggal Tahap ${s} (${formatTanggalIndo(curDateStr)}) jatuh pada hari ${day === 0 ? 'Minggu' : 'Sabtu'} (bukan hari kerja dinas).`,
              solusi: 'Geser tanggal dokumen ke hari Senin atau hari kerja terdekat.'
            });
          }

          // Cek urutan tanggal
          if (prevDate && curDate < prevDate) {
            warnings.push({
              kategori: 'Kronologi Tanggal',
              level: 'danger',
              tahap_terkait: s,
              pesan: `Tanggal Tahap ${s} (${formatTanggalIndo(curDateStr)}) lebih mundur dari tanggal tahap sebelumnya! Urutan kronologi administrasi terbalik.`,
              solusi: 'Susun ulang jadwal secara kronologis menggunakan tombol "⚡ Susun Otomatis 18 Tahap".'
            });
          }
          prevDate = curDate;
        }
      }
    }
  }

  // --- C. PANDUAN TAHAP AKTIF ---
  const activeDef = PANDUAN_18_TAHAP[activeStageNo] || PANDUAN_18_TAHAP[6];
  const activeTahapRow = tahapMap[activeStageNo] || {};
  const isStageBypass = tpl.bypass_tahap.includes(activeStageNo) || activeTahapRow.status_tahap === 'Bypass';
  const stageWarnings = warnings.filter(w => w.tahap_terkait === activeStageNo);

  const panduanTahap = {
    no_tahap: activeStageNo,
    fase: activeDef.fase,
    fase_nama: activeDef.faseNama,
    nama_tahap: activeDef.nama,
    pejabat_pic: activeDef.pejabatPic,
    dasar_hukum: activeDef.dasarHukum,
    output_dokumen: activeDef.outputDokumen,
    checklist: activeDef.checklist,
    tips: activeDef.tips,
    is_bypass: isStageBypass,
    status_sekarang: isStageBypass ? 'Bypass' : (activeTahapRow.status_tahap || 'Draft'),
    nomor_dokumen: activeTahapRow.nomor_dokumen || '-',
    tanggal_dokumen: activeTahapRow.tanggal_dokumen || '-',
    catatan_tahap: activeTahapRow.catatan_tahap || '',
    has_warning: stageWarnings.length > 0,
    warnings: stageWarnings
  };

  return {
    templateCocok: tpl,
    doubleCheck,
    warnings,
    panduanTahap,
    jumlahWarningKritis: warnings.filter(w => w.level === 'danger').length,
    jumlahWarningPeringatan: warnings.filter(w => w.level === 'warning').length,
    tertibRegulasi: warnings.filter(w => w.level === 'danger').length === 0
  };
}


/**
 * REKOMENDASI CERDAS KATEGORI JENIS PENGADAAN & SKENARIO REGULASI
 * Menganalisis MAK 6 digit dan kata kunci pada nama paket / uraian belanja
 * Berdasarkan Perpres 46/2025, Keputusan Kepala LKPP 177/2024, Perlem LKPP 2/2026 & 3/2026
 */
function recommendJenisPengadaan({ kode_akun = '', uraian = '', pagu = 0, via_katalog = null }) {
  const cleanMak = String(kode_akun || '').replace(/[^0-9]/g, '');
  const text = String(uraian || '').toLowerCase();
  const numPagu = Number(pagu) || 0;

  const scores = {
    'Barang': 0,
    'Pekerjaan Konstruksi': 0,
    'Jasa Lainnya': 0,
    'Jasa Konsultansi Nonkonstruksi': 0,
    'Jasa Konsultansi Konstruksi': 0,
    'Swakelola': 0,
    'Dikecualikan': 0
  };

  const rationale = [];

  // 1. Evaluasi Berdasarkan Kode Akun MAK 6-Digit
  if (cleanMak.startsWith('533') || cleanMak === '523111' || cleanMak.startsWith('534')) {
    scores['Pekerjaan Konstruksi'] += 80;
    rationale.push(`Akun MAK ${cleanMak} terdaftar sebagai Belanja Konstruksi / Pemeliharaan Bangunan Fisik`);
  } else if (cleanMak === '532111' || cleanMak.startsWith('5211') || cleanMak === '521211' || cleanMak === '521811') {
    scores['Barang'] += 75;
    rationale.push(`Akun MAK ${cleanMak} terdaftar sebagai Belanja Bahan / Operasional Barang Persediaan / Modal Peralatan`);
  } else if (cleanMak === '521213' || cleanMak === '522151') {
    scores['Swakelola'] += 80;
    rationale.push(`Akun MAK ${cleanMak} terdaftar sebagai Belanja Honorarium Kegiatan / Jasa Profesi Internal`);
  } else if (cleanMak.startsWith('52211')) {
    scores['Dikecualikan'] += 85;
    rationale.push(`Akun MAK ${cleanMak} terdaftar sebagai Belanja Langganan Daya & Jasa Publik (Tarif Resmi Pemerintah/BUMN)`);
  } else if (cleanMak === '522131') {
    scores['Jasa Konsultansi Nonkonstruksi'] += 70;
    scores['Jasa Konsultansi Konstruksi'] += 40;
    rationale.push(`Akun MAK ${cleanMak} terdaftar sebagai Belanja Jasa Konsultansi Keahlian`);
  } else if (cleanMak === '522141' || cleanMak === '522191' || cleanMak === '523121') {
    scores['Jasa Lainnya'] += 75;
    rationale.push(`Akun MAK ${cleanMak} terdaftar sebagai Belanja Sewa / Pemeliharaan Peralatan / Jasa Lainnya Non-Konsultan`);
  }

  // 2. Evaluasi Berdasarkan Kata Kunci Uraian Belanja
  const konstruksiKeywords = ['renovasi', 'rehabilitasi', 'pembangunan', 'gedung', 'pagar', 'atap', 'lantai', 'ruang', 'penataan halaman', 'drainase', 'pondasi', 'konstruksi', 'cat kantor', 'semen', 'batu', 'keramik', 'baja ringan', 'turap'];
  const matchedKonstruksi = konstruksiKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedKonstruksi.length > 0) {
    scores['Pekerjaan Konstruksi'] += matchedKonstruksi.length * 25;
    rationale.push(`Kata kunci konstruksi terdeteksi: "${matchedKonstruksi.join(', ')}"`);
  }

  const konsulKeywords = ['konsultan', 'kajian', 'studi kelayakan', 'ded', 'detail engineering', 'pengawasan teknis', 'supervisi', 'naskah akademik', 'masterplan', 'audit sipil'];
  const matchedKonsul = konsulKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedKonsul.length > 0) {
    const isKonsulKonstruksi = text.includes('gedung') || text.includes('bangunan') || text.includes('ded') || text.includes('pengawasan') || text.includes('fisik');
    if (isKonsulKonstruksi) {
      scores['Jasa Konsultansi Konstruksi'] += matchedKonsul.length * 35 + 40;
      rationale.push(`Kata kunci Jasa Konsultansi Konstruksi (DED/Pengawasan): "${matchedKonsul.join(', ')}"`);
    } else {
      scores['Jasa Konsultansi Nonkonstruksi'] += matchedKonsul.length * 35 + 40;
      rationale.push(`Kata kunci Jasa Konsultansi Nonkonstruksi: "${matchedKonsul.join(', ')}"`);
    }
  }

  const jasaLainKeywords = ['sewa', 'kebersihan', 'cleaning service', 'keamanan', 'security', 'satpam', 'catering', 'konsumsi', 'snack', 'makan minum', 'eo', 'event organizer', 'pengiriman', 'distribusi', 'ekspedisi', 'akomodasi', 'hotel', 'penginapan', 'sound system', 'genset', 'publikasi', 'iklan', 'pengepakan', 'sortir lipat', 'tenaga pendukung'];
  const matchedJasaLain = jasaLainKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedJasaLain.length > 0) {
    scores['Jasa Lainnya'] += matchedJasaLain.length * 25;
    rationale.push(`Kata kunci Jasa Lainnya: "${matchedJasaLain.join(', ')}"`);
  }

  const barangKeywords = ['atk', 'kertas', 'toner', 'tinta', 'laptop', 'komputer', 'pc', 'printer', 'scanner', 'meja', 'kursi', 'lemari', 'ac', 'seragam', 'rompi', 'kotak suara', 'bilik suara', 'tinta pemilu', 'segel', 'surat suara', 'alat tulis', 'spanduk', 'brosur', 'formulir', 'harddisk', 'server'];
  const matchedBarang = barangKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedBarang.length > 0) {
    scores['Barang'] += matchedBarang.length * 25;
    rationale.push(`Kata kunci Barang: "${matchedBarang.join(', ')}"`);
  }

  const swakelolaKeywords = ['bimtek', 'sosialisasi internal', 'honorarium', 'honor pokja', 'narasumber', 'panitia pemilihan', 'pokmas', 'kelompok masyarakat', 'ptn', 'universitas', 'swakelola'];
  const matchedSwakelola = swakelolaKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedSwakelola.length > 0) {
    scores['Swakelola'] += matchedSwakelola.length * 30;
    rationale.push(`Kata kunci Swakelola / Kegiatan Internal: "${matchedSwakelola.join(', ')}"`);
  }

  const dikecualikanKeywords = ['pln', 'telkom', 'indihome', 'pdam', 'tiket pesawat', 'garuda', 'kai', 'kereta api', 'bumn', 'tarif resmi'];
  const matchedDikecualikan = dikecualikanKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedDikecualikan.length > 0) {
    scores['Dikecualikan'] += matchedDikecualikan.length * 35;
    rationale.push(`Kata kunci Pengadaan Dikecualikan (Tarif Resmi/Publik): "${matchedDikecualikan.join(', ')}"`);
  }

  let bestKategori = 'Barang';
  let highestScore = -1;
  for (const [kat, sc] of Object.entries(scores)) {
    if (sc > highestScore) {
      highestScore = sc;
      bestKategori = kat;
    }
  }

  if (highestScore <= 0) {
    bestKategori = 'Barang';
    rationale.push('Kategori default Barang (tidak terdeteksi kata kunci spesifik konstruksi/jasa)');
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(99, Math.round((highestScore / (totalScore || 1)) * 100 + 35)) : 80;

  // 3. Penentuan Skenario Regulasi (Kepka LKPP 177/2024, Perpres 46/2025, Perlem 2/2026 & 3/2026)
  let rekomendasiMetode = 'E-Purchasing';
  let bentukKontrak = 'Surat Pesanan';
  let jenisKertasHarga = 'HPS';
  let pejabatPelaksana = 'Pejabat Pengadaan';
  let dasarHukum = '';
  let perlakuanKhusus = [];
  let bypassTahap = [];
  let tarifPph = 1.5;
  let jenisPph = 'PPh 22 Barang (1.5%)';

  if (bestKategori === 'Pekerjaan Konstruksi') {
    tarifPph = 1.75;
    jenisPph = 'PPh Final Konstruksi Kecil SBU K1/K2/K3 (1.75%)';
    jenisKertasHarga = 'HPS (AHSP Kab. Ngawi & DED)';
    if (numPagu <= 50000000) {
      rekomendasiMetode = 'Pengadaan Langsung';
      bentukKontrak = 'Kuitansi / SPK';
      dasarHukum = 'Lampiran II Perlem LKPP 3/2026 jo. PP 9/2021';
      bypassTahap = [11, 12];
    } else if (numPagu <= 400000000) {
      rekomendasiMetode = 'Pengadaan Langsung';
      bentukKontrak = 'SPK';
      dasarHukum = 'Pasal 38 ayat (4) Perpres 46/2025 (Batas Pengadaan Langsung Konstruksi s.d. Rp400 Jt)';
      bypassTahap = [11];
    } else {
      rekomendasiMetode = 'Tender';
      bentukKontrak = 'Surat Perjanjian';
      pejabatPelaksana = 'Pokja Pemilihan';
      dasarHukum = 'Pasal 38 Perpres 46/2025 jo. Lampiran II Perlem LKPP 3/2026';
      bypassTahap = [];
    }
    perlakuanKhusus.push('Wajib melampirkan Rancangan Konseptual SMKK / RKK Keselamatan Konstruksi (Tahap 4)');
    perlakuanKhusus.push('Wajib Masa Pemeliharaan & Retensi 5% saat PHO s.d. FHO (Tahap 16)');
    perlakuanKhusus.push('PPh Final Konstruksi: 1,75% (Kualifikasi Kecil SBU K1/K2/K3)');
  } else if (bestKategori.includes('Konsultansi')) {
    tarifPph = 2.0;
    jenisPph = 'PPh 23 Jasa Konsultansi (2%)';
    jenisKertasHarga = 'HPS (SBOB / Billing Rate Tenaga Ahli)';
    if (numPagu <= 100000000) {
      rekomendasiMetode = 'Pengadaan Langsung';
      bentukKontrak = 'SPK';
      dasarHukum = 'Pasal 38 Perpres 46/2025 jo. Lampiran I & II Perlem LKPP 3/2026';
      bypassTahap = [11, 12];
    } else {
      rekomendasiMetode = 'Seleksi';
      bentukKontrak = 'Surat Perjanjian';
      pejabatPelaksana = 'Pokja Pemilihan';
      dasarHukum = 'Pasal 38 & 41 Perpres 46/2025';
      bypassTahap = [];
    }
    perlakuanKhusus.push('HPS wajib merinci Remunerasi Tenaga Ahli (Billing Rate) & Biaya Langsung Non-Personil (Tahap 6)');
    perlakuanKhusus.push('Bebas dari kewajiban Jaminan Pelaksanaan (Pasal 30 Perpres 46/2025)');
  } else if (bestKategori === 'Swakelola') {
    rekomendasiMetode = 'Swakelola Tipe I';
    bentukKontrak = 'Kontrak Swakelola';
    jenisKertasHarga = 'RAB Swakelola';
    pejabatPelaksana = 'Tim Penyelenggara Swakelola (KPU)';
    tarifPph = 5.0;
    jenisPph = 'PPh 21 Honorarium Tenaga Ahli/Pokja (5%)';
    dasarHukum = 'Perpres 16/2018 jo. Perpres 46/2025 jo. Peraturan LKPP Nomor 3 Tahun 2021';
    bypassTahap = [5, 10, 11, 12, 18];
    perlakuanKhusus.push('Direncanakan & dikerjakan sendiri oleh Tim Swakelola KPU Ngawi (SK KPA)');
    perlakuanKhusus.push('Menggunakan format RAB Swakelola, bukan HPS pasar rekanan');
  } else if (bestKategori === 'Dikecualikan') {
    rekomendasiMetode = 'Mekanisme Pasar (Dikecualikan)';
    bentukKontrak = 'SPK / Bukti Pembelian';
    jenisKertasHarga = 'Estimasi Tarif Resmi Pemerintah / BUMN';
    pejabatPelaksana = 'PPK / Pejabat Pengadaan';
    dasarHukum = 'Perpres 16/2018 jo. Perpres 46/2025 jo. Peraturan LKPP Nomor 5 Tahun 2021';
    bypassTahap = [11, 12];
    perlakuanKhusus.push('Pembayaran mengikuti tarif resmi pemerintah / BUMN (PLN/PDAM/Telkom)');
  } else {
    // Barang atau Jasa Lainnya (Default: Prioritas E-Purchasing Katalog Elektronik V6 sesuai Kepka LKPP 177/2024)
    const isEpur = via_katalog !== false;
    if (isEpur) {
      rekomendasiMetode = 'E-Purchasing';
      bentukKontrak = 'Surat Pesanan';
      pejabatPelaksana = numPagu <= 200000000 ? 'Pejabat Pengadaan' : 'Pokja Pemilihan / PPK';
      
      if (numPagu <= 100000000) {
        jenisKertasHarga = 'Referensi Harga (Bebas HPS - Kepka LKPP 177/2024)';
        dasarHukum = 'Keputusan Kepala LKPP Nomor 177 Tahun 2024 (Lampiran III: Tata Cara E-Purchasing) jo. Pasal 9 Perlem LKPP 2/2026';
        bypassTahap = [11];
        perlakuanKhusus.push('🎉 BEBAS HPS FORMAL: Cukup lampirkan Bukti Survei Etalase Katalog V6 & Kertas Kerja Referensi Harga (Kepka LKPP 177/2024)');
        perlakuanKhusus.push('Bypass Tahap 11 (SPPBJ tidak diperlukan, langsung Surat Pesanan)');
        perlakuanKhusus.push('Bebas dari kewajiban Jaminan Pelaksanaan');
      } else if (numPagu <= 200000000) {
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 26 & 38 Perpres 46/2025 jo. Keputusan Kepala LKPP Nomor 177 Tahun 2024';
        bypassTahap = [11];
        perlakuanKhusus.push('Wajib HPS oleh PPK, negosiasi harga digital melalui Katalog Elektronik V6');
        perlakuanKhusus.push('Bebas dari Jaminan Pelaksanaan (≤ Rp 200 Juta)');
      } else {
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 30 & 38 Perpres 46/2025 jo. Keputusan Kepala LKPP Nomor 177 Tahun 2024 jo. Perlem 2/2026';
        bypassTahap = [];
        perlakuanKhusus.push('E-Purchasing > Rp 200 Jt: Gunakan Negosiasi Digital atau Mini-Kompetisi Katalog V6');
        perlakuanKhusus.push('Wajib Jaminan Pelaksanaan 5% sebelum penandatanganan Surat Pesanan');
      }
    } else {
      if (numPagu <= 10000000) {
        rekomendasiMetode = 'Pengadaan Langsung';
        bentukKontrak = 'Bukti Pembelian';
        jenisKertasHarga = 'Bebas HPS (<= 10 Jt)';
        dasarHukum = 'Pasal 28 & 38 Perpres 46/2025';
        bypassTahap = [6, 11, 12, 14];
        perlakuanKhusus.push('Bebas HPS, cukup bukti struk/nota pembelian toko');
      } else if (numPagu <= 50000000) {
        rekomendasiMetode = 'Pengadaan Langsung';
        bentukKontrak = 'Kuitansi';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 28 & 38 Perpres 46/2025';
        bypassTahap = [11, 12, 14];
        perlakuanKhusus.push('Wajib HPS, bentuk kontrak Kuitansi dinas bermeterai');
      } else if (numPagu <= 200000000) {
        rekomendasiMetode = 'Pengadaan Langsung';
        bentukKontrak = 'SPK';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 28 & 38 Perpres 46/2025 jo. Lampiran I Perlem 3/2026';
        bypassTahap = [];
        perlakuanKhusus.push('Wajib SPK dan HPS survei harga pasar');
      } else {
        rekomendasiMetode = 'Tender';
        bentukKontrak = 'Surat Perjanjian';
        pejabatPelaksana = 'Pokja Pemilihan';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 38 Perpres 46/2025 jo. Lampiran I Perlem 3/2026';
        bypassTahap = [];
        perlakuanKhusus.push('Wajib Tender oleh Pokja Pemilihan & Jaminan Pelaksanaan 5%');
      }
    }
  }

  return {
    kategori_terpilih: bestKategori,
    confidence: Math.min(confidence, 98),
    skor_kandidat: scores,
    rasional: rationale,
    rekomendasi_skenario: {
      metode_pemilihan: rekomendasiMetode,
      bentuk_kontrak: bentukKontrak,
      jenis_kertas_harga: jenisKertasHarga,
      pejabat_pelaksana: pejabatPelaksana,
      tarif_pph: tarifPph,
      jenis_pph: jenisPph,
      dasar_hukum: dasarHukum,
      bypass_tahap: bypassTahap,
      catatan_kepatuhan: perlakuanKhusus
    }
  };
}

module.exports = {
  recommendJenisPengadaan,
  NAMA_BULAN,
  NAMA_HARI,
  ANGKA_ROMAWI_BULAN,
  DEFINISI_18_TAHAP,
  TEMPLATES_PENGADAAN,
  PANDUAN_18_TAHAP,
  formatRupiah,
  terbilangInt,
  terbilangRupiah,
  formatTanggalIndo,
  formatHariTanggalBeritaAcara,
  hitungKeuanganKontrak,
  hitungKonversiSbob,
  evaluasiJalurRegulasi,
  susunJadwal18TahapOtomatis,
  cariTemplatePengadaan,
  evaluasiAuditPaket
};
