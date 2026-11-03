-- ============================================================================
-- CAKRA (Cetak Administrasi Kontrak & Rekam Pengadaan) - KPU Kabupaten Ngawi
-- MySQL 8.0 / phpMyAdmin Full Initial Schema & Seed Data
-- Seluruh tabel menggunakan prefix `pbj_` agar 100% Plug-and-Play saat digabung ke SI-PRABU
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+07:00";

-- ----------------------------------------------------------------------------
-- 1. Tabel `pbj_settings` (Identitas Satker & Konfigurasi PPK)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pbj_settings` (
  `key` varchar(191) NOT NULL,
  `value` longtext DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

REPLACE INTO `pbj_settings` (`key`, `value`) VALUES
('nama_satker', 'KOMISI PEMILIHAN UMUM KABUPATEN NGAWI'),
('kode_satker', '657811'),
('alamat_satker', 'Jl. Untung Suropati No. 48 Ngawi'),
('kota_satker', 'Ngawi'),
('telp_satker', '(0351) 743832'),
('email_satker', 'kab_ngawi@kpu.go.id'),
('website_satker', 'kab-ngawi.kpu.go.id'),
('tahun_anggaran', '2026'),
('nomor_dipa', 'SP DIPA-076.01.2.657811/2026'),
('tanggal_dipa', '2025-11-24'),
('kode_program', '076.01.WA'),
('nama_program', 'Program Dukungan Manajemen & Penyelenggaraan Pemilu'),
('kode_kegiatan', '6639'),
('nama_kegiatan', 'Teknis Penyelenggaraan Pemilu / Pemilihan dan Dukungan Sekretariat'),
('tarif_ppn_default', '11'),
('target_umk_persen', '40'),
('target_pdn_tkdn_min', '25'),
('format_nomor_ppk', '{urut}/PPK-PBJ/KPU-NGW/{romawi}/{tahun}');

-- ----------------------------------------------------------------------------
-- 2. Tabel `pbj_pejabat` (KPA, PPK, Pejabat Pengadaan, Bendahara, PPSPM)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pbj_pejabat` (
  `id` int NOT NULL AUTO_INCREMENT,
  `peran` varchar(64) NOT NULL COMMENT 'KPA, PPK, PEJABAT_PENGADAAN, PPSPM, BENDAHARA, POKJA_UKPBJ, TIM_SWAKELOLA',
  `nama_lengkap` varchar(255) NOT NULL,
  `nip` varchar(64) DEFAULT '',
  `pangkat_gol` varchar(128) DEFAULT '',
  `jabatan_struktural` varchar(255) DEFAULT '',
  `no_sk` varchar(191) DEFAULT '',
  `tgl_sk` varchar(32) DEFAULT '',
  `no_sertifikat_pbj` varchar(191) DEFAULT '' COMMENT 'Wajib untuk PPK (Tipologi A/B/C) & Pejabat Pengadaan',
  `tipologi_ppk` varchar(32) DEFAULT 'Tipe C',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELETE FROM `pbj_pejabat` WHERE `id` = 6 OR `peran` = 'TIM_TEKNIS';

REPLACE INTO `pbj_pejabat` (`id`, `peran`, `nama_lengkap`, `nip`, `pangkat_gol`, `jabatan_struktural`, `no_sk`, `tgl_sk`, `no_sertifikat_pbj`, `tipologi_ppk`, `is_active`) VALUES
(1, 'KPA', 'BUDI RAHAYU, S.IP., M.Si.', '19830503 200902 1 002', 'Pembina (IV/a)', 'Sekretaris KPU Kabupaten Ngawi / Kuasa Pengguna Anggaran', 'SK-01/KPA/KPU-NGW/I/2026', '2026-01-02', '-', '-', 1),
(2, 'PPK', 'MOHAMMAD NOOR JIHAN, S.Kom.', '19840101 200912 1 001', 'Penata Tk. I (III/d)', 'Kepala Subbagian Perencanaan, Data dan Informasi / Pejabat Pembuat Komitmen', 'SK-02/KPA/KPU-NGW/I/2026', '2026-01-02', 'SERT-PPK-LKPP-2025-88412', 'Tipe B', 1),
(3, 'PEJABAT_PENGADAAN', 'INDRAYU FATIKA MAHARDIKA', '-', '-', 'Pejabat Pengadaan Barang/Jasa KPU Kabupaten Ngawi', 'SK-03/KPA/KPU-NGW/I/2026', '2026-01-02', 'SERT-PBJ-LKPP-2025-33109', '-', 1),
(4, 'BENDAHARA', 'IMAS MAESAROH, A.Md.', '19850615 200902 2 013', 'Penata Muda Tk. I (III/b)', 'Bendahara Pengeluaran KPU Kabupaten Ngawi', 'SK-04/KPA/KPU-NGW/I/2026', '2026-01-02', '-', '-', 1),
(5, 'PPSPM', 'NURFANTI SULISTYO W., S.E.', '19820914 200902 1 004', 'Penata Tk. I (III/d)', 'Kepala Subbagian Keuangan, Umum dan Logistik / PPSPM', 'SK-05/KPA/KPU-NGW/I/2026', '2026-01-02', '-', '-', 1);

-- ----------------------------------------------------------------------------
-- 3. Tabel `pbj_penyedia` (Direktori Penyedia/Vendor, UMK, Beneficial Ownership & Skor Kinerja)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pbj_penyedia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama_perusahaan` varchar(255) NOT NULL,
  `bentuk_usaha` varchar(64) DEFAULT 'CV' COMMENT 'PT, CV, UD, Koperasi, Perorangan, Hotel/BUMN, PTN/Ormas',
  `kualifikasi_usaha` varchar(64) DEFAULT 'Usaha Kecil' COMMENT 'Usaha Mikro, Usaha Kecil, Koperasi, Non-Kecil/Menengah/Besar',
  `npwp` varchar(64) DEFAULT '',
  `nib` varchar(64) DEFAULT '',
  `kbli` varchar(128) DEFAULT '',
  `status_pkp` tinyint(1) DEFAULT 1 COMMENT '1 = PKP (Pungut PPN), 0 = Non-PKP',
  `alamat` text,
  `kota` varchar(128) DEFAULT 'Ngawi',
  `email` varchar(191) DEFAULT '',
  `telepon` varchar(64) DEFAULT '',
  `nama_direktur` varchar(255) DEFAULT '',
  `jabatan_penandatangan` varchar(128) DEFAULT 'Direktur',
  `nik_direktur` varchar(64) DEFAULT '',
  `no_akta_pendirian` varchar(255) DEFAULT '',
  `nama_bank` varchar(128) DEFAULT 'Bank Jatim / BRI / BNI / Mandiri',
  `no_rekening` varchar(128) DEFAULT '',
  `atas_nama_rekening` varchar(255) DEFAULT '',
  `bo_nama_pemilik_manfaat` varchar(255) DEFAULT '' COMMENT 'Beneficial Ownership (Pasal 8 Perlem 3/2026)',
  `bo_nik_pemilik_manfaat` varchar(64) DEFAULT '',
  `bo_hubungan` varchar(128) DEFAULT 'Pemilik Langsung / Pengendali',
  `skor_kinerja_terakhir` decimal(4,2) DEFAULT 2.85,
  `kategori_kinerja` varchar(64) DEFAULT 'Sangat Baik' COMMENT 'Buruk, Cukup, Baik, Sangat Baik',
  `jumlah_repeat_order` int DEFAULT 0 COMMENT 'Maks 2x dalam 3 tahun (Pasal 38/41 Perpres 46/2025)',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

REPLACE INTO `pbj_penyedia` (`id`, `nama_perusahaan`, `bentuk_usaha`, `kualifikasi_usaha`, `npwp`, `nib`, `kbli`, `status_pkp`, `alamat`, `kota`, `email`, `telepon`, `nama_direktur`, `jabatan_penandatangan`, `nik_direktur`, `no_akta_pendirian`, `nama_bank`, `no_rekening`, `atas_nama_rekening`, `bo_nama_pemilik_manfaat`, `bo_nik_pemilik_manfaat`, `bo_hubungan`, `skor_kinerja_terakhir`, `kategori_kinerja`, `jumlah_repeat_order`) VALUES
(1, 'CV. GRAFIKA PRATAMA NGAWI', 'CV', 'Usaha Kecil', '01.445.882.9-646.000', '9120301182451', '18111 (Industri Pencetakan Umum)', 1, 'Jl. PB Sudirman No. 112, Margomulyo, Ngawi', 'Ngawi', 'grafikapratama.ngw@gmail.com', '081234567801', 'HENDRA SURYAWAN', 'Direktur', '3521091205820001', 'Akta No. 14 Tgl 12 Maret 2021 (Notaris Sri Wahyuni, S.H., M.Kn.)', 'Bank BRI Cabang Ngawi', '0058-01-002481-30-8', 'CV GRAFIKA PRATAMA NGAWI', 'HENDRA SURYAWAN', '3521091205820001', 'Pemilik Manfaat Tunggal (100%)', 2.90, 'Sangat Baik', 0),
(2, 'PT. MITRA SARANA DIGITAL NUSANTARA', 'PT', 'Usaha Kecil', '02.891.334.1-646.000', '8120019283741', '46511 (Perdagangan Besar Komputer & Perlengkapannya)', 1, 'Jl. Basuki Rahmat No. 45, Ngawi', 'Ngawi', 'sales@mitrasaranadigital.co.id', '081335889102', 'BAGUS PRASETYO, S.T.', 'Direktur Utama', '3521090811850003', 'Akta No. 08 Tgl 05 Agustus 2022 (Notaris Bambang Sutrisno, S.H.)', 'Bank Mandiri KCP Ngawi', '171-00-0992831-4', 'PT MITRA SARANA DIGITAL NUSANTARA', 'BAGUS PRASETYO, S.T.', '3521090811850003', 'Pemegang Saham Pengendali (85%)', 2.80, 'Sangat Baik', 1),
(3, 'UD. BERKAH BOGA SENTOSA', 'UD', 'Usaha Mikro', '09.112.450.3-646.000', '1220009182736', '56210 (Jasa Boga Untuk Suatu Event Tertentu)', 0, 'Jl. Ronggowarsito No. 19, Karangasri, Ngawi', 'Ngawi', 'berkahboga.ngawi@gmail.com', '085735112098', 'HJ. SITI AMINAH', 'Pemilik', '3521095504780002', 'NIB Berbasis Risiko No. 1220009182736', 'Bank Jatim Cabang Ngawi', '0192837465', 'HJ SITI AMINAH / UD BERKAH BOGA', 'HJ. SITI AMINAH', '3521095504780002', 'Pemilik Langsung (100%)', 2.75, 'Sangat Baik', 0),
(4, 'PT. HOTEL NGAWI INDAH PERMAI (AGRO TECHNO PARK / BALLROOM)', 'PT', 'Non-Kecil', '03.221.778.5-646.000', '9120400918231', '55110 (Hotel Bintang / Akomodasi MICE)', 1, 'Jl. Raya Solo - Ngawi KM 4, Watualang, Ngawi', 'Ngawi', 'reservation@ngawiindahhotel.com', '0351-749900', 'IR. RUDY HARTONO', 'General Manager', '3521090101750004', 'Akta No. 29 Tgl 18 Januari 2020', 'Bank BNI Cabang Ngawi', '0445891203', 'PT HOTEL NGAWI INDAH PERMAI', 'IR. RUDY HARTONO', '3521090101750004', 'Pengendali Korporasi', 2.95, 'Sangat Baik', 0),
(5, 'LPPM UNIVERSITAS NEGERI / TIM KAJIAN DEMOKRASI', 'PTN/Ormas', 'Swakelola', '00.112.334.5-611.000', '-', '72201 (Penelitian dan Pengembangan Ilmu Sosial & Demokrasi)', 0, 'Kampus Pusat Jl. Ketintang / Madiun-Ngawi', 'Surabaya / Ngawi', 'lppm@kampus.ac.id', '031-8280009', 'PROF. DR. HENDRO KUSUMO, M.Si.', 'Ketua Tim Pelaksana Swakelola', '3578041102700001', 'MoU KPU & Perguruan Tinggi No. 02/MoU/KPU/2026', 'Bank BNI', '0091827364', 'REKENING KERJASAMA LPPM', 'INSTANSI PEMERINTAH / PTN', '-', 'Swakelola Tipe II', 3.00, 'Sangat Baik', 0),
(6, 'CV. BANGUN KARYA MANDIRI NGAWI', 'CV', 'Usaha Kecil (SBU K1)', '01.778.991.2-646.000', '9120109928371', '41012 (Konstruksi Gedung Perkantoran & Gudang - BG002)', 1, 'Jl. Jaksa Agung Suprapto No. 27, Ngawi', 'Ngawi', 'bangunkaryamandiri.ngw@gmail.com', '081235998123', 'STEFANUS BAMBANG WIJAYA, S.T.', 'Direktur', '3521091408800002', 'Akta No. 22 Tgl 10 Februari 2021 | SBU BG002 Subkualifikasi K1', 'Bank Jatim Cabang Ngawi', '0192008812', 'CV BANGUN KARYA MANDIRI NGAWI', 'STEFANUS BAMBANG WIJAYA, S.T.', '3521091408800002', 'Pemilik Manfaat Tunggal (100%)', 2.90, 'Sangat Baik', 0);

-- ----------------------------------------------------------------------------
-- 4. Tabel `pbj_paket` (Tabel Induk SSOT Paket Pengadaan 18 Tahap Hulu-Hilir)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pbj_paket` (
  `id` int NOT NULL AUTO_INCREMENT,
  `kode_paket_internal` varchar(64) NOT NULL,
  `kode_rup` varchar(64) DEFAULT '',
  `nama_paket` varchar(500) NOT NULL,
  `uraian_pekerjaan` text,
  `lokasi_pekerjaan` varchar(255) DEFAULT 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi',
  `sumber_dana` varchar(64) DEFAULT 'APBN DIPA' COMMENT 'APBN DIPA, HIBAH PILKADA',
  `tahun_anggaran` varchar(10) DEFAULT '2026',
  `kode_akun_mak` varchar(64) DEFAULT '521211',
  `nama_akun_mak` varchar(255) DEFAULT 'Belanja Bahan',
  `komponen_ro` varchar(255) DEFAULT '6639.BDB.001.051.A',
  `pic_subbag` varchar(64) DEFAULT 'KUL' COMMENT 'KUL, RENDATIN, TEKNIS, HUKUM, PARSDM',
  `siprabu_rab_id` int DEFAULT NULL COMMENT 'Link ke tabel rab_baris di SI-PRABU jika ditarik dari RKB',
  
  -- Klasifikasi Jenis & Metode (Minus Konstruksi)
  `jenis_pengadaan` varchar(64) NOT NULL DEFAULT 'Barang' COMMENT 'Barang, Jasa Lainnya, Jasa Konsultansi Nonkonstruksi, Swakelola, Dikecualikan',
  `cara_pengadaan` varchar(64) NOT NULL DEFAULT 'Penyedia' COMMENT 'Penyedia, Swakelola Tipe I, Swakelola Tipe II, Swakelola Tipe III, Swakelola Tipe IV',
  `metode_pemilihan` varchar(128) NOT NULL DEFAULT 'E-Purchasing' COMMENT 'E-Purchasing, Pengadaan Langsung, Penunjukan Langsung, Repeat Order, Tender Cepat, Tender, Seleksi, Mekanisme Pasar (Dikecualikan), Swakelola',
  `sub_metode_epurchasing` varchar(128) DEFAULT 'Negosiasi Harga' COMMENT 'Pembelian Langsung, Negosiasi Harga, Mini Kompetisi, Toko Daring',
  `fitur_spse` varchar(64) DEFAULT 'Transaksional' COMMENT 'Transaksional, Pencatatan, Katalog v6',
  `pelaksana_pemilihan` varchar(64) DEFAULT 'Pejabat Pengadaan' COMMENT 'Pejabat Pengadaan, Pokja Pemilihan, PPK, Tim Swakelola',
  
  -- Nilai Anggaran, Referensi Harga, HPS & Kontrak
  `nilai_pagu` double NOT NULL DEFAULT 0,
  `jenis_kertas_harga` varchar(64) DEFAULT 'HPS' COMMENT 'Bebas HPS (<=10Jt), Referensi Harga (E-Purchasing <=100Jt), HPS, RAB Swakelola, Estimasi Pasar (Dikecualikan)',
  `nilai_hps` double DEFAULT 0,
  `nilai_penawaran_awal` double DEFAULT 0,
  `nilai_kontrak` double DEFAULT 0,
  `tarif_ppn` double DEFAULT 11,
  `termasuk_ppn` tinyint(1) DEFAULT 1,
  `jenis_pph` varchar(64) DEFAULT 'PPh 22 (1.5%)' COMMENT 'PPh 22 (1.5%), PPh 23 (2%), PPh Final 4(2) (10%), PPh 21 (5%), Bebas PPh',
  `tarif_pph` double DEFAULT 1.5,
  
  -- Kepatuhan PDN/TKDN & UMK-Koperasi (Perpres 46/2025 Pasal 65 & 66)
  `prioritas_pdn_level` varchar(128) DEFAULT 'Level 1: TKDN >= 25% (TKDN+BMP >= 40%)',
  `persen_tkdn_target` double DEFAULT 40,
  `persen_bmp_target` double DEFAULT 15,
  `peruntukan_umk` tinyint(1) DEFAULT 1 COMMENT '1 = UMK/Koperasi, 0 = Non-Kecil',
  
  -- Analisa Pasar & Penilaian PPK atas Katalog Elektronik (Pasal 8 Perlem 2/2026)
  `tersedia_di_katalog` varchar(64) DEFAULT 'Ya, Tersedia & Sesuai' COMMENT 'Ya, Tersedia & Sesuai | Tersedia tapi Dikecualikan (Penilaian PPK) | Belum Tersedia di Katalog',
  `alasan_penilaian_ppk_katalog` text COMMENT '5 Parameter Pasal 8 Perlem 2/2026 jika memilih di luar E-Purchasing',
  `link_produk_katalog_1` varchar(500) DEFAULT '',
  `link_produk_katalog_2` varchar(500) DEFAULT '',
  
  -- Rancangan Kontrak, Uang Muka & Jaminan (Fase 2 & 4)
  `jenis_kontrak` varchar(64) DEFAULT 'Lumsum' COMMENT 'Lumsum, Harga Satuan, Gabungan Lumsum & Harga Satuan, Kontrak Payung, Waktu Penugasan, Kontrak Swakelola',
  `bentuk_kontrak` varchar(64) DEFAULT 'SPK' COMMENT 'Bukti Pembelian, Kuitansi, SPK, Surat Perjanjian, Surat Pesanan, Kontrak Swakelola',
  `masa_pelaksanaan_hari` int DEFAULT 14,
  `tgl_mulai_kerja` varchar(32) DEFAULT '2026-05-18',
  `tgl_selesai_kontrak` varchar(32) DEFAULT '2026-05-31',
  `tgl_realisasi_selesai` varchar(32) DEFAULT '2026-05-30',
  `hari_terlambat` int DEFAULT 0,
  `basis_denda` varchar(64) DEFAULT 'Nilai Kontrak Sebelum PPN' COMMENT 'Nilai Kontrak Sebelum PPN, Nilai Bagian Kontrak Sebelum PPN',
  `persen_uang_muka` double DEFAULT 0 COMMENT 'Wajib min 50% (50-200Jt) atau 30% (200Jt-2.5M) jika UMK meminta',
  `nilai_uang_muka` double DEFAULT 0,
  `wajib_jaminan_pelaksanaan` tinyint(1) DEFAULT 0 COMMENT 'Wajib 5% untuk Surat Perjanjian / E-Purchasing > 200 Juta',
  `nilai_jaminan_pelaksanaan` double DEFAULT 0,
  `no_jaminan_pelaksanaan` varchar(191) DEFAULT '',
  `penerbit_jaminan` varchar(191) DEFAULT '',
  
  -- Relasi Pejabat & Penyedia
  `penyedia_id` int DEFAULT 1,
  `ppk_id` int DEFAULT 2,
  `pejabat_pengadaan_id` int DEFAULT 3,
  `kpa_id` int DEFAULT 1,
  `bendahara_id` int DEFAULT 4,
  `tim_teknis_id` int DEFAULT 6,
  
  -- Progres Tahapan (1 s.d. 18) & Evaluasi Kinerja Penyedia
  `tahap_aktif` int DEFAULT 6,
  `status_paket` varchar(64) DEFAULT 'Persiapan PPK' COMMENT 'Perencanaan, Persiapan PPK, Pemilihan, Kontrak Aktif, Serah Terima & BAST, Selesai & Lunas',
  `skor_kualitas` int DEFAULT 3 COMMENT 'Bobot 30% (0-3)',
  `skor_biaya` int DEFAULT 3 COMMENT 'Bobot 20% (0-3)',
  `skor_waktu` int DEFAULT 3 COMMENT 'Bobot 30% (0-3)',
  `skor_layanan` int DEFAULT 3 COMMENT 'Bobot 20% (0-3)',
  `nilai_kinerja_akhir` decimal(4,2) DEFAULT 3.00,
  `predikat_kinerja` varchar(64) DEFAULT 'Sangat Baik',
  `catatan_khusus_ppk` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kode_paket_internal` (`kode_paket_internal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Tabel `pbj_paket_item` (Rincian Barang/Jasa, Survei Pasar/Katalog 1-3, HPS, & Harga Kontrak)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pbj_paket_item` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paket_id` int NOT NULL,
  `urutan` int DEFAULT 1,
  `kategori_item` varchar(64) DEFAULT 'Utama' COMMENT 'Utama, Personel (SBOB), Non-Personel, Ongkos Kirim/Instalasi',
  `uraian_item` varchar(500) NOT NULL,
  `spesifikasi_teknis` text,
  `satuan` varchar(64) DEFAULT 'Paket',
  `volume` double NOT NULL DEFAULT 1,
  `status_pdn` varchar(64) DEFAULT 'PDN Bersertifikat TKDN',
  `persen_tkdn` double DEFAULT 45,
  `persen_bmp` double DEFAULT 15,
  `merk_tipe_katalog` varchar(255) DEFAULT '',
  
  -- Survei Harga Pasar / Katalog (3 Sumber Pembanding)
  `harga_survei_1` double DEFAULT 0 COMMENT 'Sumber 1: Katalog Elektronik / Vendor A',
  `sumber_survei_1` varchar(191) DEFAULT 'Katalog Elektronik v6',
  `harga_survei_2` double DEFAULT 0 COMMENT 'Sumber 2: Pembanding Katalog / Pasar B',
  `sumber_survei_2` varchar(191) DEFAULT 'Survei Pasar Lokal Ngawi',
  `harga_survei_3` double DEFAULT 0 COMMENT 'Sumber 3: Kontrak Terdahulu / SBM / Brosur',
  `sumber_survei_3` varchar(191) DEFAULT 'Standar Biaya / Kontrak Lalu',
  `metode_penentuan_hps` varchar(64) DEFAULT 'Terendah' COMMENT 'Terendah, Rata-rata, Sumber 1 (Katalog), SBOB Konsultansi',
  
  -- Harga Satuan HPS / Referensi, Penawaran, & Negosiasi/Kontrak
  `harga_satuan_hps` double DEFAULT 0,
  `jumlah_hps` double DEFAULT 0,
  `harga_satuan_penawaran` double DEFAULT 0,
  `harga_satuan_kontrak` double DEFAULT 0,
  `jumlah_kontrak` double DEFAULT 0,
  
  -- Pencatatan BMN / Persediaan SAKTI (Tahap 17)
  `kode_barang_bmn` varchar(128) DEFAULT '1.01.03.01.001 (Persediaan / BMN)',
  `jenis_pencatatan_sakti` varchar(64) DEFAULT 'Persediaan' COMMENT 'Persediaan, Aset Tetap (BMN), Jasa/Habis Pakai',
  PRIMARY KEY (`id`),
  KEY `idx_paket_id` (`paket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. Tabel `pbj_paket_tahap` (Rekam Kronologis Nomor Surat, Tanggal, & Status 18 Tahap)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pbj_paket_tahap` (
  `id` int NOT NULL AUTO_INCREMENT,
  `paket_id` int NOT NULL,
  `no_tahap` int NOT NULL COMMENT '1 s.d. 18 sesuai Panduan Hulu-Hilir CAKRA',
  `fase` int NOT NULL DEFAULT 1 COMMENT '1 s.d. 6',
  `nama_tahap` varchar(255) NOT NULL,
  `nomor_dokumen` varchar(191) DEFAULT '',
  `tanggal_dokumen` varchar(32) DEFAULT '',
  `status_tahap` varchar(32) DEFAULT 'Selesai' COMMENT 'Selesai, Aktif, Draft, Bypass',
  `catatan_tahap` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_paket_tahap` (`paket_id`, `no_tahap`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SEED DATA: 5 PAKET PERCONTOHAN RIIL KPU KABUPATEN NGAWI (MINUS KONSTRUKSI)
-- Mewakili seluruh jalur: E-Purchasing, Pengadaan Langsung Transaksional (SPK),
-- Pengadaan Langsung Pencatatan (<=50Jt), Swakelola, & PBJ Dikecualikan (Hotel/MICE)
-- ============================================================================

REPLACE INTO `pbj_paket` (
  `id`, `kode_paket_internal`, `kode_rup`, `nama_paket`, `uraian_pekerjaan`, `lokasi_pekerjaan`,
  `sumber_dana`, `tahun_anggaran`, `kode_akun_mak`, `nama_akun_mak`, `komponen_ro`, `pic_subbag`,
  `jenis_pengadaan`, `cara_pengadaan`, `metode_pemilihan`, `sub_metode_epurchasing`, `fitur_spse`, `pelaksana_pemilihan`,
  `nilai_pagu`, `jenis_kertas_harga`, `nilai_hps`, `nilai_penawaran_awal`, `nilai_kontrak`, `tarif_ppn`, `termasuk_ppn`, `jenis_pph`, `tarif_pph`,
  `prioritas_pdn_level`, `persen_tkdn_target`, `persen_bmp_target`, `peruntukan_umk`,
  `tersedia_di_katalog`, `alasan_penilaian_ppk_katalog`, `link_produk_katalog_1`, `link_produk_katalog_2`,
  `jenis_kontrak`, `bentuk_kontrak`, `masa_pelaksanaan_hari`, `tgl_mulai_kerja`, `tgl_selesai_kontrak`, `tgl_realisasi_selesai`, `hari_terlambat`,
  `persen_uang_muka`, `nilai_uang_muka`, `wajib_jaminan_pelaksanaan`, `nilai_jaminan_pelaksanaan`,
  `penyedia_id`, `ppk_id`, `pejabat_pengadaan_id`, `kpa_id`, `bendahara_id`, `tim_teknis_id`,
  `tahap_aktif`, `status_paket`, `skor_kualitas`, `skor_biaya`, `skor_waktu`, `skor_layanan`, `nilai_kinerja_akhir`, `predikat_kinerja`, `catatan_khusus_ppk`
) VALUES
(1, 'CAKRA-2026-001', 'RUP-2026-657811-01', 'Pengadaan Cetak Buku Panduan dan Formulir Sosialisasi Pendidikan Pemilih KPU Kabupaten Ngawi',
 'Pencetakan Buku Saku Panduan Pemilih Pemula, Leaflet Sosialisasi Demokrasi, dan Modul Pendidikan Pemilih Berkelanjutan Tahun Anggaran 2026.',
 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi',
 'APBN DIPA', '2026', '521211', 'Belanja Bahan (Cetakan & Penggandaan)', '6639.BDB.001.051.A', 'PARSDM',
 'Barang', 'Penyedia', 'E-Purchasing', 'Negosiasi Harga', 'Katalog v6', 'Pejabat Pengadaan',
 85000000, 'Referensi Harga (E-Purchasing <=100Jt)', 82450000, 82450000, 79920000, 11, 1, 'PPh 22 (1.5%)', 1.5,
 'Level 1: TKDN >= 25% (TKDN+BMP >= 40%)', 48.5, 15.0, 1,
 'Ya, Tersedia & Sesuai', 'Tersedia pada Etalase Katalog Elektronik v6 Kategori Barang Cetakan Kabupaten Ngawi dengan minimal 3 penyedia UMK lokal.', 'https://katalog.inaproc.id/produk/cetak-buku-panduan-kpu-01', 'https://katalog.inaproc.id/produk/cetak-leaflet-sosialisasi-02',
 'Lumsum', 'Surat Pesanan', 14, '2026-05-18', '2026-05-31', '2026-05-29', 0,
 0, 0, 0, 0,
 1, 2, 3, 1, 4, 6,
 18, 'Selesai & Lunas', 3, 3, 3, 3, 3.00, 'Sangat Baik',
 'Sesuai Pasal 9 Perlem LKPP Nomor 2 Tahun 2026, E-Purchasing dengan pagu paling banyak Rp100.000.000,- tidak diperlukan HPS dan menggunakan Referensi Harga dari minimal 2 sumber pembanding.'),

(2, 'CAKRA-2026-002', 'RUP-2026-657811-02', 'Pengadaan Jasa Pemeliharaan Jaringan, Server Lokal, dan Sewa Lisensi Keamanan Siber Satker KPU Kabupaten Ngawi',
 'Jasa pemeliharaan infrastruktur jaringan LAN/WLAN gedung sekretariat dan gudang logistik, penataan rak server, serta dukungan teknis sistem informasi selama 6 bulan.',
 'Gedung Sekretariat & Gudang KPU Kabupaten Ngawi',
 'APBN DIPA', '2026', '522191', 'Belanja Jasa Lainnya', '6639.BDB.001.052.B', 'RENDATIN',
 'Jasa Lainnya', 'Penyedia', 'Pengadaan Langsung', '-', 'Transaksional', 'Pejabat Pengadaan',
 165000000, 'HPS', 161505000, 160000000, 157620000, 11, 1, 'PPh 23 (2%)', 2.0,
 'Level 2: PDN TKDN >= 25%', 35.0, 10.0, 1,
 'Tersedia tapi Dikecualikan (Penilaian PPK)', 'Berdasarkan Analisa Pasar dan Penilaian PPK (Pasal 8 ayat 3 Perlem LKPP 2/2026), ruang lingkup kombinasi pemeliharaan jaringan spesifik, topologi lokal KPU Ngawi, dan SLA penanganan on-site < 2 jam tidak dapat dipenuhi oleh paket standar pada etalase katalog elektronik serta diperoleh efisiensi harga lebih baik melalui Pengadaan Langsung Transaksional SPSE.', '', '',
 'Lumsum', 'SPK', 30, '2026-06-08', '2026-07-07', '2026-07-06', 0,
 50, 78810000, 0, 0,
 2, 2, 3, 1, 4, 6,
 13, 'Kontrak Aktif', 3, 3, 3, 3, 3.00, 'Sangat Baik',
 'Penyedia Usaha Kecil mengajukan permohonan Uang Muka; sesuai Pasal 29 Perpres 46/2025 untuk kontrak Rp50 Juta s.d. Rp200 Juta wajib diberikan Uang Muka minimal 50% dengan menyerahkan Jaminan Uang Muka.'),

(3, 'CAKRA-2026-003', 'RUP-2026-657811-03', 'Belanja Konsumsi dan Jamuan Rapat Koordinasi Pemutakhiran Data Pemilih Berkelanjutan Triwulan II',
 'Penyediaan makan siang kotak dan kudapan (snack) rapat koordinasi lintas instansi (Dispendukcapil, Bakesbangpol, TNI/Polri, Parpol) di Aula KPU Kabupaten Ngawi.',
 'Aula Kantor KPU Kabupaten Ngawi',
 'APBN DIPA', '2026', '521211', 'Belanja Bahan (Konsumsi Rapat)', '6639.BDB.001.051.C', 'RENDATIN',
 'Barang', 'Penyedia', 'Pengadaan Langsung', '-', 'Pencatatan', 'Pejabat Pengadaan',
 22750000, 'HPS', 22750000, 22400000, 22050000, 0, 1, 'PPh 22 (1.5%)', 1.5,
 'Level 5: PDN Pernyataan Mandiri (Self-Declare)', 100.0, 0, 1,
 'Belum Tersedia di Katalog', 'Katering harian siap saji sesuai jadwal tahapan rapat dipesan melalui Pelaku Usaha Mikro lokal menggunakan Kuitansi dan dicatatkan pada Fitur Pencatatan SPSE (Pasal 3 Perlem 3/2026).', '', '',
 'Harga Satuan', 'Kuitansi', 3, '2026-06-15', '2026-06-17', '2026-06-17', 0,
 0, 0, 0, 0,
 3, 2, 3, 1, 4, 6,
 17, 'Serah Terima & BAST', 3, 3, 3, 3, 3.00, 'Sangat Baik',
 'Pengadaan Langsung Barang/Jasa Lainnya bernilai s.d. Rp50 Juta dilaksanakan menggunakan bentuk kontrak Kuitansi melalui Fitur Pencatatan SPSE.'),

(4, 'CAKRA-2026-004', 'RUP-2026-657811-04', 'Penyediaan Paket Meeting Fullboard Rapat Kerja Evaluasi Tahapan dan Tata Kelola Kelembagaan KPU Kabupaten Ngawi',
 'Paket akomodasi kamar, ruang sidang utama, ruang komisi, makan 3x dan coffee break 2x selama 2 hari 1 malam untuk 40 peserta.',
 'Kabupaten Ngawi',
 'APBN DIPA', '2026', '524119', 'Belanja Perjalanan Dinas Paket Meeting Dalam Kota', '6639.BDB.001.053.A', 'KUL',
 'Dikecualikan', 'Penyedia', 'Mekanisme Pasar (Dikecualikan)', '-', 'Pencatatan', 'PPK',
 38000000, 'Estimasi Pasar (Dikecualikan)', 36800000, 36000000, 35200000, 0, 1, 'PPh 23 (2%)', 2.0,
 'Level 5: PDN Pernyataan Mandiri (Self-Declare)', 100.0, 0, 0,
 'Tersedia tapi Dikecualikan (Penilaian PPK)', 'Termasuk Pengadaan Barang/Jasa yang Dikecualikan karena Praktik Bisnis yang Sudah Mapan (Jasa Hotel/Akomodasi MICE) sesuai Perlem LKPP Nomor 5 Tahun 2021 dan Pasal 61 Perpres 46/2025.', '', '',
 'Harga Satuan', 'SPK', 2, '2026-07-10', '2026-07-11', '2026-07-11', 0,
 0, 0, 0, 0,
 4, 2, 3, 1, 4, 6,
 9, 'Pemilihan', 3, 3, 3, 3, 3.00, 'Sangat Baik',
 'Mengacu pada Standar Biaya Masukan (SBM) PMK untuk Paket Fullboard Provinsi Jawa Timur dan mekanisme pasar hotel.'),

(5, 'CAKRA-2026-005', 'RUP-2026-657811-05', 'Swakelola Kajian Evaluasi Partisipasi Masyarakat dan Indeks Demokrasi Lokal Kabupaten Ngawi',
 'Pelaksanaan riset lapangan, pengumpulan kuesioner di 19 Kecamatan, FGD, dan penyusunan buku laporan kajian akademik partisipasi pemilih.',
 '19 Kecamatan di Wilayah Kabupaten Ngawi',
 'APBN DIPA', '2026', '522131', 'Belanja Jasa Konsultan / Kajian Swakelola', '6639.BDB.001.054.A', 'PARSDM',
 'Swakelola', 'Swakelola Tipe II', 'Swakelola', '-', 'Pencatatan', 'Tim Swakelola',
 65000000, 'RAB Swakelola', 64200000, 64200000, 64200000, 0, 1, 'PPh 21 (5%)', 5.0,
 'Level 5: PDN Pernyataan Mandiri (Self-Declare)', 100.0, 0, 1,
 'Belum Tersedia di Katalog', 'Dilaksanakan secara Swakelola Tipe II melalui kerjasama antara KPU Kabupaten Ngawi dengan Perguruan Tinggi Negeri sesuai Perlem LKPP Nomor 3 Tahun 2021 dan Pasal 47 Perpres 46/2025.', '', '',
 'Kontrak Swakelola', 'Kontrak Swakelola', 60, '2026-05-04', '2026-07-02', '2026-07-02', 0,
 0, 0, 0, 0,
 5, 2, 3, 1, 4, 6,
 6, 'Persiapan PPK', 3, 3, 3, 3, 3.00, 'Sangat Baik',
 'Bahan/material penunjang kegiatan Swakelola wajib menggunakan PDN dari UMK/Koperasi.'),

(6, 'CAKRA-2026-006', 'RUP-2026-657811-06', 'Pekerjaan Konstruksi Rehabilitasi Gudang Logistik Pemilu, Rangka Atap Baja Ringan, dan Penataan Ruang Server KPU Kabupaten Ngawi',
 'Rehabilitasi atap dan plafon gudang logistik pemilu, pengecatan dinding eksterior-interior, perbaikan lantai epoxy gudang, penataan partisi tahan api ruang server, serta penerapan Sistem Manajemen Keselamatan Konstruksi (SMKK Risiko Kecil).',
 'Gedung & Gudang Logistik KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi',
 'APBN DIPA', '2026', '533121', 'Belanja Modal Gedung dan Bangunan (Rehabilitasi Konstruksi)', '6639.BDB.002.055.A', 'KUL',
 'Pekerjaan Konstruksi', 'Penyedia', 'Pengadaan Langsung', '-', 'Transaksional', 'Pejabat Pengadaan',
 320000000, 'HPS', 316350000, 314000000, 310800000, 11, 1, 'PPh Final Konstruksi Kecil (1.75%)', 1.75,
 'Level 1: TKDN >= 25% (TKDN+BMP >= 40%)', 62.5, 15.0, 1,
 'Tersedia tapi Dikecualikan (Penilaian PPK)', 'Sesuai Lampiran II Peraturan LKPP Nomor 3 Tahun 2026 dan Perpres 46/2025, Pekerjaan Konstruksi dengan nilai sampai dengan Rp400.000.000,- dilaksanakan melalui Pengadaan Langsung Transaksional SPSE oleh Pejabat Pengadaan menggunakan bentuk kontrak SPK (Subkualifikasi Usaha Kecil K1, SBU BG002, SKP = KP - P).', '', '',
 'Gabungan Lumsum dan Harga Satuan', 'SPK', 45, '2026-06-01', '2026-07-15', '2026-07-14', 0,
 30, 93240000, 0, 0,
 6, 2, 3, 1, 4, 6,
 16, 'Serah Terima & BAST', 3, 3, 3, 3, 3.00, 'Sangat Baik',
 'Konstruksi Permanen: berlaku Serah Terima Pertama (PHO) 100% fisik, Masa Pemeliharaan 180 hari kalender (6 bulan), Retensi Pemeliharaan 5% (atau Jaminan Pemeliharaan 5%), Bukti BPJS Ketenagakerjaan Jasa Konstruksi, dan Serah Terima Akhir (FHO).');

-- ----------------------------------------------------------------------------
-- SEED ITEM RINCIAN UNTUK KE-5 PAKET
-- ----------------------------------------------------------------------------
REPLACE INTO `pbj_paket_item` (
  `id`, `paket_id`, `urutan`, `kategori_item`, `uraian_item`, `spesifikasi_teknis`, `satuan`, `volume`,
  `status_pdn`, `persen_tkdn`, `persen_bmp`, `merk_tipe_katalog`,
  `harga_survei_1`, `sumber_survei_1`, `harga_survei_2`, `sumber_survei_2`, `harga_survei_3`, `sumber_survei_3`,
  `metode_penentuan_hps`, `harga_satuan_hps`, `jumlah_hps`, `harga_satuan_penawaran`, `harga_satuan_kontrak`, `jumlah_kontrak`,
  `kode_barang_bmn`, `jenis_pencatatan_sakti`
) VALUES
-- Paket 1: Cetak Buku & Leaflet (E-Purchasing <= 100 Juta)
(1, 1, 1, 'Utama', 'Buku Saku Panduan Pendidikan Pemilih KPU Kabupaten Ngawi', 'Ukuran A5 (14.8 x 21 cm), Isi 64 halaman Art Paper 120 gr Full Color 4/4, Cover Art Carton 260 gr Laminasi Doff, Jilid Jahit Kawat', 'Buku', 1500, 'PDN Bersertifikat TKDN', 48.5, 15.0, 'Grafika Cetak Buku A5-64Hal Katalog v6', 45000, 'Katalog CV Grafika Pratama', 47500, 'Katalog PT Cetak Jaya', 46000, 'Kontrak Tahun 2025', 'Terendah', 45000, 67500000, 45000, 43600, 65400000, '1.01.03.01.003 (Cetakan)', 'Persediaan'),
(2, 1, 2, 'Utama', 'Leaflet Lipat 3 Sosialisasi Pemutakhiran Data Pemilih', 'Ukuran A4 Terbuka (21 x 29.7 cm), Art Paper 150 gr Full Color Bolak-Balik (4/4), Finishing Lipat 3 Presisi', 'Lembar', 2000, 'PDN Bersertifikat TKDN', 52.0, 15.0, 'Grafika Leaflet A4-150gr Katalog v6', 3725, 'Katalog CV Grafika Pratama', 4000, 'Katalog CV Media Cetak', 3900, 'Survei Pasar Ngawi', 'Terendah', 3725, 7450000, 3725, 3630, 7260000, '1.01.03.01.003 (Cetakan)', 'Persediaan'),
(3, 1, 3, 'Utama', 'Modul Kerja Fasilitator Sosialisasi Kecamatan (PPK/PPS)', 'Ukuran B5, Isi 100 halaman HVS 80 gr BW + 10 halaman sisipan warna, Cover Softcover Emboss Logo KPU, Jilid Perfect Binding', 'Buku', 150, 'PDN Bersertifikat TKDN', 46.0, 15.0, 'Grafika Modul B5-100Hal Katalog v6', 50000, 'Katalog CV Grafika Pratama', 53000, 'Katalog PT Cetak Jaya', 52000, 'Survei Pasar Ngawi', 'Terendah', 50000, 7500000, 50000, 48400, 7260000, '1.01.03.01.003 (Cetakan)', 'Persediaan'),

-- Paket 2: Pemeliharaan Jaringan & Keamanan Siber (Pengadaan Langsung > 50-200 Juta SPK)
(4, 2, 1, 'Utama', 'Jasa Pemeliharaan Berkala Jaringan LAN, Access Point, dan Mikrotik Core Router', 'Preventive & Corrective Maintenance 24 titik jaringan, 6 unit AP Enterprise, manajemen bandwidth, dan SLA respon gangguan < 2 jam selama 6 bulan', 'Bulan', 6, 'PDN TKDN >= 25%', 35.0, 10.0, 'Layanan Managed Network KPU', 12500000, 'PT Mitra Sarana Digital', 13200000, 'CV Nusantara Tech', 13000000, 'Survei Pasar Madiun-Ngawi', 'Terendah', 12500000, 75000000, 12400000, 12200000, 73200000, '5.2.2.1.9.1 (Jasa TI)', 'Jasa/Habis Pakai'),
(5, 2, 2, 'Utama', 'Pemeliharaan Server Lokal Backup Database (SI-PRABU, CAKRA & Sistem Internal)', 'Pengecekan RAID Storage, optimasi Docker & MySQL Server, penggantian thermal/fan, dan automated cloud-local encrypted backup selama 6 bulan', 'Bulan', 6, 'PDN TKDN >= 25%', 40.0, 10.0, 'Server Maintenance Pack', 8500000, 'PT Mitra Sarana Digital', 9000000, 'CV Nusantara Tech', 8800000, 'Riwayat Kontrak TI', 'Terendah', 8500000, 51000000, 8400000, 8270000, 49620000, '5.2.2.1.9.1 (Jasa TI)', 'Jasa/Habis Pakai'),
(6, 2, 3, 'Utama', 'Pengadaan & Konfigurasi Modul Endpoint Protection + Firewall Appliance Guard', 'Lisensi Endpoint Security 35 perangkat kerja Sekretariat KPU Ngawi + konfigurasi aturan proteksi web/aplikasi selama 1 tahun', 'Paket', 1, 'PDN TKDN >= 25%', 30.0, 10.0, 'CyberGuard Enterprise 35 Seats', 35505000, 'PT Mitra Sarana Digital', 37000000, 'Distributor Resmi', 36500000, 'Katalog Referensi TI', 'Terendah', 35505000, 35505000, 35200000, 34800000, 34800000, '1.03.05.02.001 (Software)', 'Aset Tetap (BMN)'),

-- Paket 3: Konsumsi Rapat Koordinasi (Pengadaan Langsung <= 50 Juta Kuitansi)
(7, 3, 1, 'Utama', 'Nasi Kotak Rapat Koordinasi Pemutakhiran Data Pemilih (Menu Lengkap)', 'Nasi Putih, Ayam Bakar/Goreng, Daging Lapis, Sambal Goreng Ati, Capcay/Urap, Kerupuk Udang, Buah Pisang/Jeruk, Air Mineral 330ml', 'Kotak', 350, 'PDN Self-Declare', 100.0, 0, 'Katering Lokal UMK Ngawi', 45000, 'UD Berkah Boga Sentosa', 46000, 'Katering Sari Rasa', 47000, 'SBM PMK Jawa Timur (Maks Rp47.000)', 'Terendah', 45000, 15750000, 44500, 44000, 15400000, '5.2.1.2.1.1 (Konsumsi)', 'Jasa/Habis Pakai'),
(8, 3, 2, 'Utama', 'Kudapan / Snack Kotak Rapat Koordinasi (3 Macam Kue + Air Mineral)', '2 Kue Basah Tradisional (Lemper/Sosis Solo & Kue Lumpur), 1 Roti Manis/Pastry, Kacang Oven, Air Mineral Gelas', 'Kotak', 350, 'PDN Self-Declare', 100.0, 0, 'Snack Lokal UMK Ngawi', 20000, 'UD Berkah Boga Sentosa', 20000, 'Katering Sari Rasa', 20000, 'SBM PMK Jawa Timur (Maks Rp20.000)', 'Terendah', 20000, 7000000, 19500, 19000, 6650000, '5.2.1.2.1.1 (Konsumsi)', 'Jasa/Habis Pakai'),

-- Paket 4: Paket Meeting Fullboard Hotel (PBJ Dikecualikan)
(9, 4, 1, 'Utama', 'Paket Fullboard Meeting Twin-Share (2 Hari 1 Malam)', 'Akomodasi kamar Twin-Share bintang 3/setara, Makan Pagi 1x, Makan Siang 2x, Makan Malam 1x, Coffee Break 2x, Ruang Ballroom & Sound System, Proyektor LED, Notepad & Pena', 'Orang/Paket', 40, 'PDN Self-Declare', 100.0, 0, 'Fullboard MICE Ngawi', 920000, 'Penawaran Resmi Hotel Ngawi Indah', 950000, 'Tarif Publish Hotel', 980000, 'SBM PMK Paket Fullboard Jatim', 'Terendah', 920000, 36800000, 900000, 880000, 35200000, '5.2.4.1.1.9 (Paket Meeting)', 'Jasa/Habis Pakai'),

-- Paket 5: Swakelola Kajian Evaluasi Partisipasi Masyarakat
(10, 5, 1, 'Personel (SBOB)', 'Tenaga Ahli Utama Riset Kepemiluan & Demokrasi (S2/S3 Pengalaman 5 Tahun)', 'Menyusun metodologi survei, instrumen kuesioner 19 kecamatan, analisis statistik, dan penulisan laporan akhir (2 Orang x 2 Bulan)', 'OB', 4, 'PDN Self-Declare', 100.0, 0, 'Swakelola Tipe II PTN', 7500000, 'Standar Biaya Masukan / Kontrak PTN', 7500000, 'SBM Konsultansi', 7500000, 'RAB Swakelola', 'SBOB Konsultansi', 7500000, 30000000, 7500000, 7500000, 30000000, '5.2.2.1.3.1 (Swakelola)', 'Jasa/Habis Pakai'),
(11, 5, 2, 'Personel (SBOB)', 'Enumerator Pengumpul Data Lapangan (19 Kecamatan se-Kabupaten Ngawi)', 'Melakukan wawancara responden di 19 kecamatan (19 Orang x 1 Bulan)', 'OB', 19, 'PDN Self-Declare', 100.0, 0, 'Enumerator Lapangan', 1200000, 'RAB Swakelola', 1200000, 'Standar Biaya KPU', 1200000, 'RAB Swakelola', 'SBOB Konsultansi', 1200000, 22800000, 1200000, 1200000, 22800000, '5.2.2.1.3.1 (Swakelola)', 'Jasa/Habis Pakai'),
(12, 5, 3, 'Non-Personel', 'Biaya Pelaksanaan FGD, Penggandaan Instrumen Kuesioner, dan Pencetakan Buku Laporan Kajian', 'Biaya langsung non-personel (17,75% dari total biaya <= batas maksimal 40% sesuai Lampiran I Perlem 3/2026)', 'Paket', 1, 'PDN Self-Declare', 100.0, 0, 'Non-Personel Swakelola', 11400000, 'RAB Swakelola', 11400000, 'Survei Pasar Lokal', 11400000, 'RAB Swakelola', 'Terendah', 11400000, 11400000, 11400000, 11400000, 11400000, '5.2.2.1.3.1 (Swakelola)', 'Persediaan'),

-- Paket 6: Pekerjaan Konstruksi Rehabilitasi Gudang Logistik & Ruang Server (Pengadaan Langsung Konstruksi s.d. Rp400 Juta - SPK)
(13, 6, 1, 'Utama', 'Pekerjaan Rehabilitasi Rangka Atap Baja Ringan C-75 & Penutup Atap Galvalum Gudang Logistik', 'Baja ringan C-75.075 SNI, Atap Spandek Galvalum 0.40 mm berperedam, Nok & Flashing lengkap terpasang sesuai AHSP/DED', 'm2', 420, 'PDN Bersertifikat TKDN', 65.0, 15.0, 'Baja Ringan & Galvalum SNI', 385000, 'AHSP Kab. Ngawi 2026', 395000, 'Survei Toko Material Ngawi', 390000, 'HSPK Provinsi Jawa Timur', 'Terendah', 385000, 161700000, 382000, 378000, 158760000, '1.03.02.01.001 (Gedung & Bangunan)', 'Aset Tetap (BMN)'),
(14, 6, 2, 'Utama', 'Pekerjaan Perbaikan Lantai Beton & Coating Epoxy Gudang Logistik Pemilu (Anti-Lembab)', 'Perataan screed beton K-225, primer + coating epoxy 500 micron tahan beban forklift/troli kotak suara', 'm2', 350, 'PDN Bersertifikat TKDN', 58.0, 15.0, 'Epoxy Floor Coating SNI', 245000, 'AHSP Kab. Ngawi 2026', 255000, 'Survei Aplikator Konstruksi', 250000, 'HSPK Provinsi Jawa Timur', 'Terendah', 245000, 85750000, 243000, 240000, 84000000, '1.03.02.01.001 (Gedung & Bangunan)', 'Aset Tetap (BMN)'),
(15, 6, 3, 'Utama', 'Pekerjaan Penataan Partisi Gypsum Tahan Api (Fire-Rated), Pintu Besi & Instalasi Kelistrikan Ruang Server', 'Partisi Gypsum Firestop 16mm rangka metal stud, Pintu Baja Emergency, Pembenahan Panel MCB & Grounding < 1 Ohm', 'Ls', 1, 'PDN Bersertifikat TKDN', 60.0, 15.0, 'Partisi & ME Ruang Server', 60400000, 'Engineer Estimate (EE) Perencana', 62000000, 'Survei Kontraktor Lokal', 61500000, 'HSPK Provinsi Jawa Timur', 'Terendah', 60400000, 60400000, 60000000, 59540000, 59540000, '1.03.02.01.001 (Gedung & Bangunan)', 'Aset Tetap (BMN)'),
(16, 6, 4, 'Utama', 'Penyelenggaraan Sistem Manajemen Keselamatan Konstruksi (SMKK Risiko Kecil & BPJS Jasa Konstruksi)', '9 Komponen Biaya Penerapan SMKK: Penyiapan RKK, Sosialisasi K3, APD Lengkap (Helm, Rompi, Sepatu Safety, Full Body Harness), Asuransi BPJS Ketenagakerjaan Jasa Konstruksi, P3K, dan Rambu K3', 'Ls', 1, 'PDN Self-Declare', 100.0, 0, 'SMKK Konstruksi Lampiran II Perlem 3/2026', 8500000, 'Rancangan Konseptual SMKK PPK', 8500000, 'Standar Biaya SMKK PUPR', 8500000, 'Tarif BPJS Konstruksi & APD', 'Terendah', 8500000, 8500000, 8500000, 8500000, 8500000, '1.03.02.01.001 (SMKK Konstruksi)', 'Aset Tetap (BMN)');

-- ----------------------------------------------------------------------------
-- SEED KRONOLOGI 18 TAHAP UNTUK PAKET #1 (CONTOH LENGKAP HULU-HILIR)
-- ----------------------------------------------------------------------------
REPLACE INTO `pbj_paket_tahap` (`paket_id`, `no_tahap`, `fase`, `nama_tahap`, `nomor_dokumen`, `tanggal_dokumen`, `status_tahap`, `catatan_tahap`) VALUES
(1, 1, 1, 'Identifikasi Kebutuhan PBJ (Basis DIPA/RKB)', '001/PPK-IDK/KPU-NGW/V/2026', '2026-05-04', 'Selesai', 'Sesuai DIPA 657811 Akun 521211 Subbag PARSDM'),
(1, 2, 1, 'Penetapan Jenis, Cara Pengadaan, & Pemaketan', '002/PPK-PMK/KPU-NGW/V/2026', '2026-05-05', 'Selesai', 'Jenis: Barang Cetakan | Cara: Penyedia (Alokasi UMK 100%)'),
(1, 3, 1, 'Penyusunan RUP & Pengumuman SIRUP', 'RUP-2026-657811-01', '2026-05-06', 'Selesai', 'Diumumkan pada aplikasi SIRUP LKPP oleh KPA'),
(1, 4, 2, 'Penetapan KAK & Spesifikasi Teknis (PDN/TKDN)', '004/PPK-SPEK/KPU-NGW/V/2026', '2026-05-07', 'Selesai', 'Wajib PDN bersertifikat TKDN >= 25% (TKDN+BMP >= 40%)'),
(1, 5, 2, 'Analisa Pasar & Penilaian PPK atas Katalog Elektronik', '005/PPK-AP/KPU-NGW/V/2026', '2026-05-08', 'Selesai', 'Tersedia di Katalog Elektronik v6 Etalase Barang Cetakan'),
(1, 6, 2, 'Penyusunan Referensi Harga / HPS / RAB', '006/PPK-REF/KPU-NGW/V/2026', '2026-05-11', 'Selesai', 'Referensi Harga Rp 82.450.000,- (Bebas HPS karena E-Purchasing <= Rp100 Juta sesuai Pasal 9 Perlem 2/2026)'),
(1, 7, 2, 'Penyusunan Rancangan Kontrak (Surat Pesanan & SSKK)', '007/PPK-RK/KPU-NGW/V/2026', '2026-05-11', 'Selesai', 'Kontrak Lumsum menggunakan Surat Pesanan Katalog v6'),
(1, 8, 3, 'Penyerahan DPP ke Pejabat Pengadaan & Reviu DPP', '008/PPK-DPP/KPU-NGW/V/2026', '2026-05-12', 'Selesai', 'Diserahkan kepada Pejabat Pengadaan (Nilai <= Rp200 Juta)'),
(1, 9, 3, 'Pelaksanaan Pemilihan / Negosiasi E-Purchasing', '009/PP-EPUR/KPU-NGW/V/2026', '2026-05-13', 'Selesai', 'Negosiasi Harga di Katalog v6 menghasilkan penghematan menjadi Rp 79.920.000,-'),
(1, 10, 4, 'Reviu Hasil Pemilihan oleh PPK & Validasi BO', '010/PPK-REV/KPU-NGW/V/2026', '2026-05-14', 'Selesai', 'Harga negosiasi di bawah Referensi Harga & Beneficial Ownership valid'),
(1, 11, 4, 'Penerbitan SPPBJ & Jaminan Pelaksanaan', '-', '2026-05-14', 'Bypass', 'Otomatis Bypass: E-Purchasing <= Rp200 Juta langsung menerbitkan Surat Pesanan tanpa SPPBJ & tanpa Jaminan Pelaksanaan'),
(1, 12, 4, 'Rapat Persiapan Penandatanganan Kontrak (Pre-Award)', '012/PPK-PAM/KPU-NGW/V/2026', '2026-05-15', 'Selesai', 'Konfirmasi desain cetak (dummy proof) dan jadwal pengiriman'),
(1, 13, 4, 'Penandatanganan Kontrak / Surat Pesanan Final', 'SP-013/PPK-PBJ/KPU-NGW/V/2026', '2026-05-18', 'Selesai', 'Surat Pesanan ditandatangani bersama CV. Grafika Pratama Ngawi'),
(1, 14, 5, 'Penyerahan Lokasi, SPP/SPMK, Program Mutu & PCM', 'SPP-014/PPK-PBJ/KPU-NGW/V/2026', '2026-05-18', 'Selesai', 'Surat Perintah Pengiriman (SPP) berlaku 14 hari kalender (s.d. 31 Mei 2026)'),
(1, 15, 5, 'Pengendalian Kontrak, Monitoring & Adendum/SCM', '015/PPK-MON/KPU-NGW/V/2026', '2026-05-25', 'Selesai', 'Progres cetak 100% tepat waktu, tidak ada Adendum maupun keterlambatan'),
(1, 16, 6, 'Pemeriksaan Hasil Pekerjaan (BAPHP) & BAST PPK-Penyedia', 'BAST-016/PPK-PBJ/KPU-NGW/V/2026', '2026-05-29', 'Selesai', 'Pemeriksaan fisik sesuai spesifikasi & kuantitas 100%'),
(1, 17, 6, 'BAST PPK ke KPA (BMN/Persediaan) & Pembayaran SAKTI', 'BAP-017/PPK-PBJ/KPU-NGW/VI/2026', '2026-06-02', 'Selesai', 'Dicatat di Persediaan SAKTI; DPP Rp 72.000.000, PPN Rp 7.920.000, PPh 22 Rp 1.080.000, Netto diterima Rp 70.920.000'),
(1, 18, 6, 'Penilaian Kinerja Penyedia oleh PPK (Skor 0-3)', 'PKP-018/PPK-PBJ/KPU-NGW/VI/2026', '2026-06-03', 'Selesai', 'Skor Akhir: 3.00 (Sangat Baik) — Layak untuk Repeat Order');

SET FOREIGN_KEY_CHECKS = 1;
