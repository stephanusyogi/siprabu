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

    hasil.push({
      paket_id: paket.id,
      no_tahap: def.no,
      fase: def.fase,
      nama_tahap: def.nama,
      nomor_dokumen: nomorDokumen,
      tanggal_dokumen: tglIso,
      status_tahap: isBypass ? 'Bypass' : (def.no <= (paket.tahap_aktif || 18) ? 'Selesai' : 'Draft'),
      catatan_tahap: isBypass ? 'Dilewati otomatis sesuai matriks regulasi 2025/2026' : `Dokumen Tahap ${def.no} (${def.nama})`
    });
  }

  return hasil;
}

module.exports = {
  NAMA_BULAN,
  NAMA_HARI,
  ANGKA_ROMAWI_BULAN,
  DEFINISI_18_TAHAP,
  formatRupiah,
  terbilangInt,
  terbilangRupiah,
  formatTanggalIndo,
  formatHariTanggalBeritaAcara,
  hitungKeuanganKontrak,
  hitungKonversiSbob,
  evaluasiJalurRegulasi,
  susunJadwal18TahapOtomatis
};
