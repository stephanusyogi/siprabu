/**
 * SI-PRABU v3.0 — Modul Database Pengadaan (CAKRA Engine)
 * Terintegrasi Penuh pada Database Tunggal MySQL `siprabu_db` (Port 3306)
 * Pengembang Resmi: emenje
 */

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const {
  DEFINISI_18_TAHAP,
  evaluasiJalurRegulasi,
  susunJadwal18TahapOtomatis,
  cleanProrateItemPrices
} = require('./utils');

// Muat .env dari root siprabu_clean
const envPath = path.resolve(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.substring(0, idx).trim();
        const v = trimmed.substring(idx + 1).trim();
        if (process.env[k] === undefined) process.env[k] = v;
      }
    }
  } catch (e) {}
}

let cakraPool = null;

function getCakraPool() {
  if (!cakraPool) {
    cakraPool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'siprabu_root_pass',
      database: process.env.DB_NAME || 'siprabu_db',
      waitForConnections: true,
      connectionLimit: 10,
      multipleStatements: true,
      charset: 'utf8mb4',
      dateStrings: true
    });
  }
  return cakraPool;
}

async function seedRegulasiPengadaanToMasterRegulasi(pool) {
  try {
    // Bersihkan duplikat historis dari seed lama agar master_regulasi tersentralisasi di seedMasterRegulasiJdih() (src/db.js)
    await pool.query("DELETE FROM master_regulasi WHERE kategori = 'REGULASI_NASIONAL' OR no_urut >= 90");
  } catch (e) {
    // Abaikan jika tabel master_regulasi belum siap
  }
}

let schemaInitDone = false;

async function migratePejabatTanpaGelarOnce(pool) {
  try {
    const [flagRows] = await pool.query("SELECT `value` FROM pbj_settings WHERE `key` = 'pejabat_tanpa_gelar_v1'");
    if (!flagRows || !flagRows.length || flagRows[0].value !== '1') {
      await pool.query("DELETE FROM pbj_pejabat WHERE id = 6 OR peran = 'TIM_TEKNIS'");
      await pool.query(
        "UPDATE pbj_pejabat SET nama_lengkap = 'BUDI RAHAYU' WHERE peran = 'KPA' AND nama_lengkap LIKE 'BUDI RAHAYU,%'"
      );
      await pool.query(
        "UPDATE pbj_pejabat SET nama_lengkap = 'MOHAMMAD NOOR JIHAN', jabatan_struktural = 'Pejabat Pembuat Komitmen (PPK)' WHERE peran = 'PPK' AND (nama_lengkap LIKE 'MOHAMMAD NOOR JIHAN%' OR jabatan_struktural LIKE '%Perencanaan%')"
      );
      await pool.query(
        "UPDATE pbj_pejabat SET nama_lengkap = 'INDRAYU FATIKA MAHARDIKA', nip = '-', pangkat_gol = '-' WHERE peran = 'PEJABAT_PENGADAAN' AND nama_lengkap != 'INDRAYU FATIKA MAHARDIKA'"
      );
      await pool.query(
        "UPDATE pbj_pejabat SET nama_lengkap = 'IMAS MAESAROH' WHERE peran = 'BENDAHARA' AND nama_lengkap LIKE 'IMAS MAESAROH,%'"
      );
      await pool.query(
        "UPDATE pbj_pejabat SET nama_lengkap = 'NURFANTI SULISTYO W.' WHERE peran = 'PPSPM' AND nama_lengkap LIKE 'NURFANTI SULISTYO W.,%'"
      );
      await pool.query("REPLACE INTO pbj_settings (`key`, `value`) VALUES ('pejabat_tanpa_gelar_v1', '1')");
    }
  } catch (e) {}
}

async function ensurePenyediaLinkDokumenColumn(pool) {
  try {
    await pool.query("ALTER TABLE pbj_penyedia ADD COLUMN link_dokumen VARCHAR(500) DEFAULT ''");
  } catch (e) {
    // Abaikan jika kolom link_dokumen sudah ada
  }
}

async function ensurePaketTahapColumns(pool) {
  const cols = [
    "ALTER TABLE pbj_paket_tahap ADD COLUMN link_drive_dokumen TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_permohonan VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN tgl_permohonan VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_kuitansi VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN tgl_kuitansi VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN tgl_bap VARCHAR(32) DEFAULT NULL"
  ];
  for (const q of cols) {
    try {
      await pool.query(q);
    } catch (e) {}
  }
}

async function ensurePaketMissingColumns(pool) {
  const ddlStatements = [
    "ALTER TABLE pbj_paket ADD COLUMN no_nota_dinas_pengusul VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_nota_dinas_pengusul VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN perihal_nota_dinas VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_disposisi_kpa VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_disposisi_kpa VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
    "ALTER TABLE pbj_paket ADD COLUMN bmn_status_ketersediaan VARCHAR(64) DEFAULT 'TERSEDIA_RUSAK_BERAT'",
    "ALTER TABLE pbj_paket ADD COLUMN bmn_jumlah_eksisting INT DEFAULT 1",
    "ALTER TABLE pbj_paket ADD COLUMN bmn_kondisi_eksisting VARCHAR(255) DEFAULT '1 unit rusak berat / usang, 0 unit layak pakai'",
    "ALTER TABLE pbj_paket ADD COLUMN bmn_sifat_kebutuhan VARCHAR(64) DEFAULT 'PENGGANTIAN'",
    "ALTER TABLE pbj_paket ADD COLUMN bmn_kesesuaian_rkbmn VARCHAR(255) DEFAULT 'Tercantum dalam RKBMN TA 2026 / SAKTI Modul Aset'",
    "ALTER TABLE pbj_paket ADD COLUMN bmn_catatan_telaah TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN rkb_program VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN rkb_kegiatan VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN rkb_subkegiatan VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN rkb_komponen VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN bmn_kategori_telaah VARCHAR(50) DEFAULT 'MODAL'",
    "ALTER TABLE pbj_paket ADD COLUMN disposisi_status VARCHAR(50) DEFAULT 'DISETUJUI'",
    "ALTER TABLE pbj_paket ADD COLUMN disposisi_catatan_kpa TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN disposisi_tgl_diajukan DATE DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN disposisi_tgl_disposisi DATE DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN target_sertifikat_tkdn VARCHAR(255) DEFAULT 'TKDN 42.50% + Bobot Manfaat Perusahaan (BMP) 10.00%'",
    "ALTER TABLE pbj_paket ADD COLUMN is_multi_subbag TINYINT(1) DEFAULT 0",
    "ALTER TABLE pbj_paket ADD COLUMN multi_pengusul_json TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN cara_pembayaran VARCHAR(160) DEFAULT 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)'",
    "ALTER TABLE pbj_paket ADD COLUMN basis_denda VARCHAR(191) DEFAULT '1 permil per hari dari Harga Kontrak sebelum PPN (DPP)'",
    "ALTER TABLE pbj_paket ADD COLUMN ketentuan_garansi VARCHAR(255) DEFAULT 'Sertifikat Garansi Purna Jual Resmi Pabrikan Minimal 1 Tahun (365 Hari Kalender) — Bebas Retensi 5%'",
    "ALTER TABLE pbj_paket ADD COLUMN penyelesaian_sengketa VARCHAR(191) DEFAULT 'Musyawarah untuk Mufakat, dilanjutkan Layanan Penyelesaian Sengketa (LPS) LKPP'",
    "ALTER TABLE pbj_paket ADD COLUMN no_reviu_dpp VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN kesimpulan_reviu_dpp VARCHAR(191) DEFAULT 'Disetujui Penuh (Dokumen Lengkap, Lanjut Pemilihan Tahap 9)'",
    "ALTER TABLE pbj_paket ADD COLUMN tempat_reviu_dpp VARCHAR(255) DEFAULT 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi'",
    "ALTER TABLE pbj_paket ADD COLUMN nama_pokja VARCHAR(255) DEFAULT 'Pokja Pemilihan UKPBJ KPU Provinsi Jawa Timur'",
    "ALTER TABLE pbj_paket ADD COLUMN sk_pokja VARCHAR(255) DEFAULT 'Surat Keputusan Kepala UKPBJ KPU Provinsi Jawa Timur'",
    "ALTER TABLE pbj_paket ADD COLUMN id_paket_katalog VARCHAR(128) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_undangan_penawaran VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_surat_penawaran VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_surat_penawaran VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tempat_pemilihan VARCHAR(255) DEFAULT 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi'",
    "ALTER TABLE pbj_paket ADD COLUMN no_ba_nego VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_bahp VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN kode_tender_spse VARCHAR(64) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_ba_reviu_ppk VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_reviu_ppk VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN kesimpulan_reviu_ppk VARCHAR(191) DEFAULT 'Disetujui Penuh (Dokumen Lengkap, Lanjut SPPBJ Tahap 11)'",
    "ALTER TABLE pbj_paket ADD COLUMN status_kswp VARCHAR(100) DEFAULT 'Valid / Konfirmasi Sesuai'",
    "ALTER TABLE pbj_paket ADD COLUMN status_daftar_hitam VARCHAR(100) DEFAULT 'Tidak Tercantum (Bebas Sanksi Daftar Hitam)'",
    "ALTER TABLE pbj_paket ADD COLUMN bo_nama VARCHAR(191) DEFAULT 'Hendra Suryawan'",
    "ALTER TABLE pbj_paket ADD COLUMN bo_nik VARCHAR(64) DEFAULT '3521011504820003'",
    "ALTER TABLE pbj_paket ADD COLUMN bo_posisi VARCHAR(100) DEFAULT 'Pemilik Modal / Direktur (100%)'",
    "ALTER TABLE pbj_paket ADD COLUMN bo_benturan_kepentingan VARCHAR(100) DEFAULT 'Bebas Benturan Kepentingan'",
    "ALTER TABLE pbj_paket ADD COLUMN evaluasi_spek_sla VARCHAR(255) DEFAULT 'Sesuai 100% KAK & Garansi Resmi 1 Tahun Pabrikan'",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_reviu_ppk TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_sppbj VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_sppbj VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN status_jaminan_pelaksanaan VARCHAR(191) DEFAULT 'DIBEBASKAN (E-Purchasing / Nilai s.d. Rp 200 Juta)'",
    "ALTER TABLE pbj_paket ADD COLUMN alasan_bebas_jaminan VARCHAR(255) DEFAULT 'Pasal 33 ayat (2) huruf b dan ayat (3) Perpres PBJ jo. Kepka LKPP No. 177/2024'",
    "ALTER TABLE pbj_paket ADD COLUMN no_surat_kesanggupan_penyedia VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_surat_kesanggupan VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN batas_waktu_ttd_kontrak VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE pbj_paket MODIFY COLUMN batas_waktu_ttd_kontrak VARCHAR(100) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_sppbj TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_undangan_pam VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_undangan_pam VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_ba_pam VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_ba_pam VARCHAR(32) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tempat_pam VARCHAR(255) DEFAULT 'Ruang Rapat Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi'",
    "ALTER TABLE pbj_paket ADD COLUMN nama_bank_penyedia VARCHAR(191) DEFAULT 'Bank Jatim Cabang Ngawi'",
    "ALTER TABLE pbj_paket ADD COLUMN no_rekening_penyedia VARCHAR(100) DEFAULT '014-229-8711'",
    "ALTER TABLE pbj_paket ADD COLUMN atas_nama_rekening_penyedia VARCHAR(191) DEFAULT 'CV. GRAFIKA PRATAMA'",
    "ALTER TABLE pbj_paket ADD COLUMN legalitas_akta_notaris VARCHAR(255) DEFAULT 'Akta Notaris No. 14 tgl 12-04-2018 jo. Akta Perubahan No. 05 tgl 08-01-2024'",
    "ALTER TABLE pbj_paket ADD COLUMN legalitas_nib VARCHAR(255) DEFAULT '9120301182451 (KBLI 46511)'",
    "ALTER TABLE pbj_paket MODIFY COLUMN legalitas_nib VARCHAR(255) DEFAULT '9120301182451 (KBLI 46511)'",
    "ALTER TABLE pbj_paket ADD COLUMN legalitas_status_fiskal VARCHAR(255) DEFAULT 'Valid (KSWP Valid & SKF Bebas Tunggakan)'",
    "ALTER TABLE pbj_paket MODIFY COLUMN legalitas_status_fiskal VARCHAR(255) DEFAULT 'Valid (KSWP Valid & SKF Bebas Tunggakan)'",
    "ALTER TABLE pbj_paket ADD COLUMN legalitas_status_spt VARCHAR(255) DEFAULT 'Tertib (SPT Tahunan 2025 & Pajak Masa Terakhir Sesuai)'",
    "ALTER TABLE pbj_paket MODIFY COLUMN legalitas_status_spt VARCHAR(255) DEFAULT 'Tertib (SPT Tahunan 2025 & Pajak Masa Terakhir Sesuai)'",
    "ALTER TABLE pbj_paket MODIFY COLUMN legalitas_akta_notaris VARCHAR(500) DEFAULT NULL",
    "ALTER TABLE pbj_paket MODIFY COLUMN kesepakatan_jadwal_pelaksanaan VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN kesepakatan_tgl_ttd_kontrak VARCHAR(32) DEFAULT '2026-05-27'",
    "ALTER TABLE pbj_paket ADD COLUMN kesepakatan_jadwal_pelaksanaan VARCHAR(100) DEFAULT '14 Hari Kalender (27 Mei 2026 s.d. 09 Juni 2026)'",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_pam TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN metode_pam VARCHAR(50) DEFAULT 'LURING'",
    "ALTER TABLE pbj_paket ADD COLUMN link_zoom_pam VARCHAR(255) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_kontrak VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_kontrak VARCHAR(32) DEFAULT '2026-05-27'",
    "ALTER TABLE pbj_paket ADD COLUMN tempat_ttd_kontrak VARCHAR(255) DEFAULT 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi'",
    "ALTER TABLE pbj_paket ADD COLUMN jenis_meterai VARCHAR(100) DEFAULT 'e-Meterai Resmi Peruri (Rp 10.000)'",
    "ALTER TABLE pbj_paket ADD COLUMN ketentuan_denda VARCHAR(255) DEFAULT '1/1000 (satu permil) per hari keterlambatan dari Nilai Kontrak sebelum PPN'",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_kontrak TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket MODIFY COLUMN target_sertifikat_tkdn TEXT",
    "ALTER TABLE pbj_paket MODIFY COLUMN ketentuan_garansi TEXT",
    "ALTER TABLE pbj_paket MODIFY COLUMN penyelesaian_sengketa TEXT",
    "ALTER TABLE pbj_paket MODIFY COLUMN bmn_kondisi_eksisting TEXT",
    "ALTER TABLE pbj_paket MODIFY COLUMN bmn_kesesuaian_rkbmn TEXT",
    "ALTER TABLE pbj_paket MODIFY COLUMN tempat_reviu_dpp TEXT",
    "ALTER TABLE pbj_paket MODIFY COLUMN tempat_pemilihan TEXT",
    "ALTER TABLE pbj_paket MODIFY COLUMN evaluasi_spek_sla TEXT",
    "ALTER TABLE pbj_paket MODIFY COLUMN tempat_pam TEXT",
    "ALTER TABLE pbj_paket MODIFY COLUMN tempat_ttd_kontrak TEXT",
    "ALTER TABLE pbj_paket ADD COLUMN no_spp VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_spp VARCHAR(32) DEFAULT '2026-05-27'",
    "ALTER TABLE pbj_paket ADD COLUMN no_ba_spl VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_ba_spl VARCHAR(32) DEFAULT '2026-05-27'",
    "ALTER TABLE pbj_paket ADD COLUMN kondisi_ruang_server TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN pic_teknisi_rekanan VARCHAR(191) DEFAULT 'Ahmad Fauzi (Lead Systems Engineer)'",
    "ALTER TABLE pbj_paket ADD COLUMN kontak_teknisi_rekanan VARCHAR(64) DEFAULT '0812-3456-7890'",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_spp TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN parameter_kesiapan_lokasi_json TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN ketentuan_pasca_pengiriman_json TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_laporan_pengendalian VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_laporan_pengendalian VARCHAR(32) DEFAULT '2026-06-09'",
    "ALTER TABLE pbj_paket ADD COLUMN no_ba_komisioning VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_ba_komisioning VARCHAR(32) DEFAULT '2026-06-09'",
    "ALTER TABLE pbj_paket ADD COLUMN realisasi_fisik_persen DECIMAL(5,2) DEFAULT 100.00",
    "ALTER TABLE pbj_paket ADD COLUMN rencana_fisik_persen DECIMAL(5,2) DEFAULT 100.00",
    "ALTER TABLE pbj_paket ADD COLUMN deviasi_fisik_persen DECIMAL(5,2) DEFAULT 0.00",
    "ALTER TABLE pbj_paket ADD COLUMN status_scm VARCHAR(100) DEFAULT 'Normal / Sesuai Jadwal Kontrak (On-Track)'",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_pengendalian_ppk TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN parameter_komisioning_json TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN milestone_pengendalian_json TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_baphp VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_baphp VARCHAR(32) DEFAULT '2026-06-09'",
    "ALTER TABLE pbj_paket ADD COLUMN nama_tim_pemeriksa VARCHAR(191) DEFAULT 'Tim Teknis / Pejabat Pemeriksa Pengadaan KPU Ngawi'",
    "ALTER TABLE pbj_paket ADD COLUMN nip_tim_pemeriksa VARCHAR(64) DEFAULT '198503152010121002'",
    "ALTER TABLE pbj_paket ADD COLUMN kesimpulan_pemeriksaan_baphp VARCHAR(191) DEFAULT 'Diterima Penuh / Lulus 100% Memenuhi Spesifikasi Teknis & Volume'",
    "ALTER TABLE pbj_paket ADD COLUMN parameter_pemeriksaan_baphp_json TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_bast VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_bast VARCHAR(32) DEFAULT '2026-06-09'",
    "ALTER TABLE pbj_paket ADD COLUMN tempat_bast VARCHAR(255) DEFAULT 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi'",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_bast TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN status_denda VARCHAR(100) DEFAULT 'Nihil Denda (Pekerjaan Selesai 100% Tepat Waktu)'",
    "ALTER TABLE pbj_paket ADD COLUMN denda_keterlambatan_rp DECIMAL(15,2) DEFAULT 0.00",
    "ALTER TABLE pbj_paket ADD COLUMN realisasi_item_bast_json TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN masa_garansi_hari INT DEFAULT 365",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_mulai_garansi VARCHAR(32) DEFAULT '2026-06-09'",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_selesai_garansi VARCHAR(32) DEFAULT '2027-06-09'",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_laporan_pengendalian VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_ba_komisioning VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_baphp VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_bast VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_sppbj VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_ba_pam VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_undangan_pam VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_kontrak VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_spp VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_ba_spl VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_reviu_dpp VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_ba_nego VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_bahp VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_ba_reviu_ppk VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_item ADD COLUMN kode_barang_bmn VARCHAR(128) DEFAULT '1.01.03.01.001 (Persediaan / BMN)'",
    "ALTER TABLE pbj_paket_item ADD COLUMN jenis_pencatatan_sakti VARCHAR(64) DEFAULT 'Persediaan'",
    "ALTER TABLE pbj_paket_item ADD COLUMN evaluasi_pasar_json TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket_item ADD COLUMN pic_subbag_pengguna VARCHAR(64) DEFAULT 'KUL'",
    "ALTER TABLE pbj_paket ADD COLUMN no_bap VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_bap VARCHAR(32) DEFAULT '2026-06-11'",
    "ALTER TABLE pbj_paket ADD COLUMN no_spp_ls VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_spp_ls VARCHAR(32) DEFAULT '2026-06-12'",
    "ALTER TABLE pbj_paket ADD COLUMN no_spm_ls VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_spm_ls VARCHAR(32) DEFAULT '2026-06-12'",
    "ALTER TABLE pbj_paket ADD COLUMN no_bast_kpa VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_bast_kpa VARCHAR(32) DEFAULT '2026-06-11'",
    "ALTER TABLE pbj_paket ADD COLUMN no_faktur_pajak VARCHAR(191) DEFAULT '010.000-26.00000001'",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_faktur_pajak VARCHAR(32) DEFAULT '2026-06-11'",
    "ALTER TABLE pbj_paket ADD COLUMN nilai_pembayaran_netto DECIMAL(15,2) DEFAULT 137943432.00",
    "ALTER TABLE pbj_paket ADD COLUMN nilai_kas_sp2d DECIMAL(15,2) DEFAULT 122403891.00",
    "ALTER TABLE pbj_paket ADD COLUMN akun_denda_pnbp VARCHAR(32) DEFAULT '425161'",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_pembayaran TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN no_skkp VARCHAR(191) DEFAULT '018/SKKP/PBJ-2026-001/PPK/VI/2026'",
    "ALTER TABLE pbj_paket ADD COLUMN tgl_skkp VARCHAR(32) DEFAULT '2026-06-12'",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_kualitas TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_biaya TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_waktu TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN catatan_layanan TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket ADD COLUMN rekomendasi_repeat_order VARCHAR(100) DEFAULT 'MEMENUHI SYARAT REPEAT ORDER (RO)'",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_bap VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_spp_ls VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_bast_kpa VARCHAR(191) DEFAULT NULL",
    "ALTER TABLE pbj_paket_tahap ADD COLUMN no_skkp VARCHAR(191) DEFAULT NULL"
  ];

  try {
    await pool.query("SET SESSION innodb_strict_mode = OFF");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE pbj_paket ROW_FORMAT=DYNAMIC");
  } catch (e) {}
  try {
    await pool.query("ALTER TABLE pbj_paket_tahap ROW_FORMAT=DYNAMIC");
  } catch (e) {}

  for (const sql of ddlStatements) {
    try {
      await pool.query(sql);
    } catch (e) {
      if (!e.message.includes('Duplicate column') && !e.message.includes('already exists')) {
        if (sql.includes('VARCHAR')) {
          try {
            const textSql = sql.replace(/VARCHAR\(\d+\)/i, 'TEXT');
            await pool.query(textSql);
          } catch (e2) {
            console.warn('[DDL-WARN]', sql, '=>', e.message);
          }
        } else {
          console.warn('[DDL-WARN]', sql, '=>', e.message);
        }
      }
    }
  }

  // Migrasi satu kali perbaikan bug fallback Uang Muka 50% -> 0% pada paket E-Purchasing Barang Ready Stock (Paket 1)
  try {
    const [umFlags] = await pool.query("SELECT `value` FROM pbj_settings WHERE `key` = 'fix_uang_muka_epurchasing_v1'");
    if (!umFlags || !umFlags.length || umFlags[0].value !== '1') {
      await pool.query(
        "UPDATE pbj_paket SET persen_uang_muka = 0, nilai_uang_muka = 0, cara_pembayaran = COALESCE(NULLIF(cara_pembayaran, ''), 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)') WHERE metode_pemilihan = 'E-Purchasing'"
      );
      await pool.query("REPLACE INTO pbj_settings (`key`, `value`) VALUES ('fix_uang_muka_epurchasing_v1', '1')");
    }
  } catch (e) {}

  // Migrasi otomatis sinkronisasi skenario Tahap 16 BAPHP & BAST (Denda Parsial 1 Hari Rp 56.568 & Tanggal 10 Juni 2026)
  try {
    const [t16Flags] = await pool.query("SELECT `value` FROM pbj_settings WHERE `key` = 'sync_tahap16_bast_denda_v2'");
    if (!t16Flags || !t16Flags.length || t16Flags[0].value !== '1') {
      const defaultTitikKritisBaphp = [
        { no: 1, titik_kritis: 'Verifikasi Kuantitas & Keutuhan Fisik Barang', standar: '1 Unit PC Server & 3 Unit PC Workstation lengkap segel pabrikan utuh', hasil: 'Diterima utuh 100% lengkap tanpa cacat fisik atau cacat logistik', status: 'MEMENUHI SYARAT' },
        { no: 2, titik_kritis: 'Kesesuaian Spesifikasi Teknis & Komponen Inti', standar: 'Dell PowerEdge T350, Dual Xeon, 64GB ECC, 2x 1.92TB NVMe RAID-1, Dual PSU', hasil: 'Spesifikasi hardware identik 100% dengan KAK & Surat Pesanan', status: 'MEMENUHI SYARAT' },
        { no: 3, titik_kritis: 'Validasi Uji Fungsi & Stabilitas Operasional', standar: 'Burn-in test 24 jam non-stop, redundansi PSU failover, stabilitas jaringan LAN', hasil: 'Sistem lulus uji beban puncak 24 jam tanpa error (BA-KOM terlampir)', status: 'MEMENUHI SYARAT' },
        { no: 4, titik_kritis: 'Legalitas Lisensi OS & Sertifikat Garansi Resmi', standar: 'Windows Server 2025 Standard COA digital aktif online, garansi pabrikan 1 tahun', hasil: 'Lisensi original teraktivasi digital, sertifikat garansi resmi ATPM sah', status: 'MEMENUHI SYARAT' },
        { no: 5, titik_kritis: 'Kelengkapan Dokumen Serah Terima & Manual', standar: 'Surat jalan, manual operasional bahasa Indonesia, CD driver/recovery firmware', hasil: 'Seluruh bundel dokumentasi teknis dan panduan operasional diserahkan lengkap', status: 'MEMENUHI SYARAT' }
      ];

      const realisasiItemBast = [
        {
          id: 1,
          nama_item: 'PC Server Tower Database Operasional SIDALIH & Logistik',
          volume: 1,
          satuan: 'Unit',
          dpp: 56567568,
          nilai_item: 62790000,
          tgl_batas: '2026-06-09',
          tgl_realisasi: '2026-06-10',
          hari_terlambat: 1,
          denda_item: 56568,
          status: 'TERLAMBAT'
        },
        {
          id: 2,
          nama_item: 'PC Workstation Operasional Pengolah Data SIDALIH',
          volume: 3,
          satuan: 'Unit',
          dpp: 67756757,
          nilai_item: 75210000,
          tgl_batas: '2026-06-09',
          tgl_realisasi: '2026-06-09',
          hari_terlambat: 0,
          denda_item: 0,
          status: 'TEPAT_WAKTU'
        }
      ];

      const catatanBastDefault = 'Hasil pemeriksaan fisik faktual dan uji fungsi komisioning 24 jam non-stop atas pengadaan 1 unit PC Server Dell PowerEdge T350 dan 3 unit PC Workstation SIDALIH telah selesai 100% dalam kondisi baik, lengkap, dan beroperasi normal tanpa cacat. Seluruh spesifikasi teknis dan volume sesuai naskah kontrak Surat Pesanan No. 013/SP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026. Sebanyak 3 unit PC Workstation diserahkan tepat waktu pada 09 Juni 2026 dan berfungsi penuh secara mandiri (dibuktikan dengan Surat Tanda Terima Barang Sementara / STTBS No. 016/STTBS/PBJ-2026-001/PPK/VI/2026 tanggal 09 Juni 2026). Adapun 1 unit PC Server diserahkan pada 10 Juni 2026 (terlambat 1 hari kalender dari batas akhir 09 Juni 2026). Pemeriksaan fisik 100% (BAPHP) dan Serah Terima Pertama Pekerjaan (BAST) dilaksanakan pada hari Rabu tanggal 10 Juni 2026 setelah seluruh barang tiba lengkap. Sesuai ketentuan Pasal 79 ayat (4) huruf b Perpres No. 12/2021 dan SSKK Surat Pesanan, penyedia dikenakan sanksi denda keterlambatan bagian kontrak sebesar 1‰ per hari dari DPP bagian pekerjaan yang terlambat (1/1.000 × Rp 56.567.568,- × 1 hari = Rp 56.568,-). Penyedia memberikan jaminan garansi resmi pabrikan selama 365 hari kalender (10 Juni 2026 s.d. 10 Juni 2027) dengan SLA respon 1x24 jam onsite. Pengadaan dibebaskan dari retensi 5% dan berhak menerima pembayaran netto sebesar Rp 137.943.432,- (setelah dipotong denda Rp 56.568,-) melalui SPM-LS KPPN.';

      await pool.query(`
        UPDATE pbj_paket
        SET no_baphp = '016/BAPHP/PBJ-2026-001/PPK/VI/2026',
            tgl_baphp = '2026-06-10',
            nama_tim_pemeriksa = 'Tim Teknis / Pejabat Pemeriksa Pengadaan KPU Ngawi',
            nip_tim_pemeriksa = '198503152010121002',
            kesimpulan_pemeriksaan_baphp = 'Diterima Penuh / Lulus 100% Memenuhi Spesifikasi Teknis & Volume',
            parameter_pemeriksaan_baphp_json = ?,
            realisasi_item_bast_json = ?,
            no_bast = '016/BAST/PBJ-2026-001/PPK/VI/2026',
            tgl_bast = '2026-06-10',
            tempat_bast = 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi',
            catatan_bast = ?,
            status_denda = 'Dikenakan Denda Keterlambatan Bagian Kontrak Rp 56.568 (PC Server Tower Database Operasional (1 Hari - Denda Rp 56.568))',
            denda_keterlambatan_rp = 56568.00,
            tgl_realisasi_selesai = '2026-06-10',
            hari_terlambat = 1,
            masa_garansi_hari = 365,
            tgl_mulai_garansi = '2026-06-10',
            tgl_selesai_garansi = '2027-06-10'
        WHERE id = 1
      `, [JSON.stringify(defaultTitikKritisBaphp), JSON.stringify(realisasiItemBast), catatanBastDefault]);

      await pool.query(`
        UPDATE pbj_paket_tahap
        SET nomor_dokumen = '016/BAST/PBJ-2026-001/PPK/VI/2026',
            tanggal_dokumen = '2026-06-10',
            status_tahap = 'Draft',
            no_baphp = '016/BAPHP/PBJ-2026-001/PPK/VI/2026',
            no_bast = '016/BAST/PBJ-2026-001/PPK/VI/2026',
            catatan_tahap = 'Berita Acara Pemeriksaan Hasil Pekerjaan (BAPHP No. 016/BAPHP/PBJ-2026-001/PPK/VI/2026) dan Berita Acara Serah Terima Pertama Pekerjaan (BAST No. 016/BAST/PBJ-2026-001/PPK/VI/2026) telah terbit resmi bertanggal 10 Juni 2026 dengan hasil Lulus 100% (Denda Bagian Kontrak Rp 56.568,- & Garansi 1 Tahun). Disertai Lampiran Surat Tanda Terima Barang Sementara (STTBS No. 016/STTBS/PBJ-2026-001/PPK/VI/2026 tanggal 09 Juni 2026).'
        WHERE paket_id = 1 AND no_tahap = 16
      `);

      await pool.query("REPLACE INTO pbj_settings (`key`, `value`) VALUES ('sync_tahap16_bast_denda_v2', '1')");
      console.log('[DB-MIGRATE] Skenario Tahap 16 BAPHP & BAST Paket 1 berhasil disinkronkan ke DB.');
    }
  } catch (e) {
    console.warn('[DB-MIGRATE-WARN] Gagal migrasi Tahap 16:', e.message);
  }

  // Migrasi otomatis sinkronisasi skenario Tahap 17 Pengajuan Pembayaran (BAP, BAST KPA, SPP-LS & Potongan Denda Akun PNBP 425161)
  try {
    const [t17Flags] = await pool.query("SELECT `value` FROM pbj_settings WHERE `key` = 'sync_tahap17_pembayaran_v1'");
    if (!t17Flags || !t17Flags.length || t17Flags[0].value !== '1') {
      const catatanTahap17 = 'Berita Acara Pembayaran (BAP No. 017/BAP/PBJ-2026-001/PPK/VI/2026 tanggal 11 Juni 2026), BAST PPK ke KPA (No. 017/BAST-KPA/PBJ-2026-001/PPK/VI/2026 tanggal 11 Juni 2026), dan Surat Permintaan Pembayaran Langsung (SPP-LS No. 00045/SPP-LS/657811/2026 tanggal 12 Juni 2026) telah terbit resmi. Nilai Bruto Rp 138.000.000,- dipotong denda keterlambatan Rp 56.568,- ke Akun PNBP 425161 (Netto sebelum pajak Rp 137.943.432,- / Netto transfer kas SP2D Rp 122.403.891,- setelah dipotong PPN 11% Rp 13.675.676,- dan PPh 22 1,5% Rp 1.864.865,-). Seluruh aset telah diserahkan PPK kepada KPA untuk registrasi NUP BMN pada SAKTI Modul Aset Tetap.';

      await pool.query(`
        UPDATE pbj_paket
        SET no_bap = '017/BAP/PBJ-2026-001/PPK/VI/2026',
            tgl_bap = '2026-06-11',
            no_bast_kpa = '017/BAST-KPA/PBJ-2026-001/PPK/VI/2026',
            tgl_bast_kpa = '2026-06-11',
            no_spp_ls = '00045/SPP-LS/657811/2026',
            tgl_spp_ls = '2026-06-12',
            no_spm_ls = '00045/SPM-LS/657811/2026',
            tgl_spm_ls = '2026-06-12',
            no_faktur_pajak = '010.000-26.00000001',
            tgl_faktur_pajak = '2026-06-11',
            nilai_pembayaran_netto = 137943432.00,
            nilai_kas_sp2d = 122403891.00,
            akun_denda_pnbp = '425161',
            catatan_pembayaran = ?
        WHERE id = 1
      `, [catatanTahap17]);

      await pool.query(`
        UPDATE pbj_paket_tahap
        SET nomor_dokumen = '017/BAP/PBJ-2026-001/PPK/VI/2026',
            tanggal_dokumen = '2026-06-11',
            status_tahap = 'Draft',
            no_bap = '017/BAP/PBJ-2026-001/PPK/VI/2026',
            no_bast_kpa = '017/BAST-KPA/PBJ-2026-001/PPK/VI/2026',
            no_spp_ls = '00045/SPP-LS/657811/2026',
            catatan_tahap = ?
        WHERE paket_id = 1 AND no_tahap = 17
      `, [catatanTahap17]);

      await pool.query("REPLACE INTO pbj_settings (`key`, `value`) VALUES ('sync_tahap17_pembayaran_v1', '1')");
      console.log('[DB-MIGRATE] Skenario Tahap 17 Pembayaran BAP/SPP-LS Paket 1 berhasil disinkronkan ke DB.');
    }
  } catch (e) {
    console.warn('[DB-MIGRATE-WARN] Gagal migrasi Tahap 17:', e.message);
  }

  // Migrasi otomatis sinkronisasi skenario Tahap 18 SIKaP LKPP & SKKP (Penilaian Kinerja 4 Aspek & Rekomendasi Repeat Order)
  try {
    const [t18Flags] = await pool.query("SELECT `value` FROM pbj_settings WHERE `key` = 'sync_tahap18_sikap_skkp_v1'");
    if (!t18Flags || !t18Flags.length || t18Flags[0].value !== '1') {
      const catatanTahap18 = 'Penilaian Kinerja Penyedia pada Aplikasi SIKaP LKPP dan Penerbitan Sertifikat Kinerja Penyedia / Surat Keterangan Kinerja Penyedia (SKKP No. 018/SKKP/PBJ-2026-001/PPK/VI/2026 tanggal 12 Juni 2026) dengan skor total 2.70 (Predikat: SANGAT BAIK). Memenuhi syarat untuk pemberian rekomendasi Repeat Order (RO).';
      const catKualitas = 'Kualitas dan kuantitas barang 100% lulus uji fungsi tanpa cacat (BAPHP No. 016/BAPHP/PBJ-2026-001/PPK/VI/2026). Nilai Bobot 30% x 3 = 0,90.';
      const catBiaya = 'Realisasi anggaran 100% tertib, potongan denda Rp 56.568 disetor ke Kas Negara Akun PNBP 425161 (BAP No. 017/BAP/PBJ-2026-001/PPK/VI/2026). Nilai Bobot 20% x 3 = 0,60.';
      const catWaktu = 'Terdapat keterlambatan 1 hari kalender pada 1 unit server (diserahkan 10 Juni 2026) namun masih di bawah 50 hari kalender dan denda telah dipotong lunas (Perlem LKPP 4/2021). Nilai Bobot 30% x 2 = 0,60.';
      const catLayanan = 'Penyedia sangat kooperatif, teknisi bersertifikasi hadir mendampingi uji fungsi 24 jam dan menyerahkan jaminan purnajual garansi resmi 1 tahun. Nilai Bobot 20% x 3 = 0,60.';

      await pool.query(`
        UPDATE pbj_paket
        SET no_skkp = '018/SKKP/PBJ-2026-001/PPK/VI/2026',
            tgl_skkp = '2026-06-12',
            catatan_kualitas = ?,
            catatan_biaya = ?,
            catatan_waktu = ?,
            catatan_layanan = ?,
            rekomendasi_repeat_order = 'MEMENUHI SYARAT REPEAT ORDER (RO)',
            rating_sikap = 2.70
        WHERE id = 1
      `, [catKualitas, catBiaya, catWaktu, catLayanan]);

      await pool.query(`
        UPDATE pbj_paket_tahap
        SET nomor_dokumen = '018/SKKP/PBJ-2026-001/PPK/VI/2026',
            tanggal_dokumen = '2026-06-12',
            status_tahap = 'Draft',
            no_skkp = '018/SKKP/PBJ-2026-001/PPK/VI/2026',
            catatan_tahap = ?
        WHERE paket_id = 1 AND no_tahap = 18
      `, [catatanTahap18]);

      await pool.query("REPLACE INTO pbj_settings (`key`, `value`) VALUES ('sync_tahap18_sikap_skkp_v1', '1')");
      console.log('[DB-MIGRATE] Skenario Tahap 18 SIKaP LKPP & SKKP Paket 1 berhasil disinkronkan ke DB.');
    }
  } catch (e) {
    console.warn('[DB-MIGRATE-WARN] Gagal migrasi Tahap 18:', e.message);
  }
}


const SEED_KBLI_DATA = [
  { kode: '46511', judul: 'Perdagangan Besar Komputer dan Perlengkapan Komputer', sektor: 'G - Perdagangan Besar dan Eceran', kategori_pbj: 'Barang', deskripsi: 'Mencakup usaha perdagangan besar komputer, periferal komputer, server, workstation, laptop, printer, scanner, dan suku cadangnya.' },
  { kode: '46512', judul: 'Perdagangan Besar Piranti Lunak (Software)', sektor: 'G - Perdagangan Besar dan Eceran', kategori_pbj: 'Barang', deskripsi: 'Mencakup perdagangan besar piranti lunak standar (off-the-shelf software), sistem operasi, lisensi server, dan aplikasi perkantoran.' },
  { kode: '46521', judul: 'Perdagangan Besar Perlengkapan Telekomunikasi', sektor: 'G - Perdagangan Besar dan Eceran', kategori_pbj: 'Barang', deskripsi: 'Mencakup perdagangan besar perlengkapan telekomunikasi, switch, router, modem, akses poin, radio komunikasi (HT), dan jaringan telekomunikasi.' },
  { kode: '46590', judul: 'Perdagangan Besar Mesin, Peralatan dan Perlengkapan Lainnya', sektor: 'G - Perdagangan Besar dan Eceran', kategori_pbj: 'Barang', deskripsi: 'Mencakup perdagangan besar mesin kantor, mesin fotokopi, UPS industri, genset cadangan darurat, dan perlengkapan teknis.' },
  { kode: '46691', judul: 'Perdagangan Besar Alat Tulis dan Hasil Percetakan / Penerbitan', sektor: 'G - Perdagangan Besar dan Eceran', kategori_pbj: 'Barang', deskripsi: 'Mencakup usaha perdagangan besar buku, alat tulis kantor (ATK), kertas, map, amplop, dan perlengkapan administrasi perkantoran.' },
  { kode: '46499', judul: 'Perdagangan Besar Berbagai Macam Barang Lainnya YTDL', sektor: 'G - Perdagangan Besar dan Eceran', kategori_pbj: 'Barang', deskripsi: 'Mencakup perdagangan besar berbagai peralatan rumah tangga, mebeler kantor, brankas, meja kursi rapat, dan perlengkapan satker.' },
  { kode: '18111', judul: 'Industri Pencetakan Berbagai Macam Media Cetak', sektor: 'C - Industri Pengolahan', kategori_pbj: 'Barang', deskripsi: 'Mencakup pencetakan surat suara pemilu/pilkada, formulir C.Hasil, brosur, pamflet, poster, agenda, buku panduan teknis, dan media cetak sosialisasi.' },
  { kode: '18120', judul: 'Aktivitas Jasa Penunjang Pencetakan', sektor: 'C - Industri Pengolahan', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup jasa penjilidan, laminating, pemotongan presisi, pelipatan surat suara, pengepakan tersegel, dan finishing bahan cetakan.' },
  { kode: '62019', judul: 'Aktivitas Pemrograman Komputer Lainnya', sektor: 'J - Informasi dan Komunikasi', kategori_pbj: 'Jasa Konsultansi', deskripsi: 'Mencakup penulisan, modifikasi, pengujian, dan pemeliharaan aplikasi piranti lunak, portal web satker, integrasi API, dan sistem informasi kepegawaian/keuangan.' },
  { kode: '62020', judul: 'Aktivitas Konsultasi Komputer dan Manajemen Fasilitas Komputer', sektor: 'J - Informasi dan Komunikasi', kategori_pbj: 'Jasa Konsultansi', deskripsi: 'Mencakup konsultasi kebutuhan piranti keras dan lunak, audit keamanan siber, dan manajemen operasional ruang server (NOC/Datacenter).' },
  { kode: '62090', judul: 'Aktivitas Teknologi Informasi dan Jasa Komputer Lainnya', sektor: 'J - Informasi dan Komunikasi', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup jasa instalasi komputer, pemulihan data (disaster recovery), instalasi jaringan LAN/WLAN kantor, dan pemeliharaan perangkat IT.' },
  { kode: '63111', judul: 'Aktivitas Pengolahan Data', sektor: 'J - Informasi dan Komunikasi', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup pemrosesan data pemilih, tabulasi hasil, entri data verifikasi administrasi, dan layanan pemindaian dokumen arsip digital.' },
  { kode: '63112', judul: 'Aktivitas Hosting dan Fasilitas Terkait', sektor: 'J - Informasi dan Komunikasi', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup penyediaan infrastruktur web hosting, cloud server VPS, colocation server, streaming server, dan penyimpanan data cloud terenkripsi.' },
  { kode: '77305', judul: 'Aktivitas Penyewaan Mesin Kantor dan Peralatannya (Termasuk Komputer)', sektor: 'N - Aktivitas Penyewaan dan Sewa Guna Tanpa Hak Opsi', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup penyewaan mesin fotokopi operasional, komputer desktop, laptop rekapitulasi, printer kartu suara, scanner C.Hasil, dan proyektor presentasi.' },
  { kode: '77100', judul: 'Aktivitas Penyewaan dan Sewa Guna Usaha Tanpa Hak Opsi Mobil, Bus, Truk dan Sejenisnya', sektor: 'N - Aktivitas Penyewaan dan Sewa Guna Tanpa Hak Opsi', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup sewa armada mobil dinas operasional pimpinan, minibus monitoring tahapan, dan truk distribusi logistik bilik/kotak suara ke PPK/PPS.' },
  { kode: '49431', judul: 'Angkutan Bermotor untuk Barang Umum', sektor: 'H - Pengangkutan dan Pergudangan', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup jasa ekspedisi pengangkutan logistik pemilu/pilkada dari percetakan ke gudang KPU Kabupaten dan distribusi hingga ke tingkat TPS.' },
  { kode: '52291', judul: 'Jasa Pengurusan Transportasi (Freight Forwarding)', sektor: 'H - Pengangkutan dan Pergudangan', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup pengelolaan rantai pasok logistik, pengawalan distribusi bahan pemilu, penerimaan kargo udara/laut, dan konsolidasi pengiriman.' },
  { kode: '56210', judul: 'Jasa Boga untuk Suatu Event Tertentu (Event Catering)', sektor: 'I - Penyediaan Akomodasi dan Makan Minum', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup penyediaan makan dan minum prasmanan / kotak rapat koordinasi, bimbingan teknis PPK/PPS, rapat pleno terbuka rekapitulasi, dan adhoc.' },
  { kode: '56290', judul: 'Penyediaan Jasa Boga Periode Tertentu', sektor: 'I - Penyediaan Akomodasi dan Makan Minum', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup penyediaan makanan dan minuman harian bagi petugas piket posko pemilu, lembur penyusunan laporan keuangan, dan verifikasi faktual.' },
  { kode: '55110', judul: 'Hotel Bintang', sektor: 'I - Penyediaan Akomodasi dan Makan Minum', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup penyediaan fasilitas penginapan dan ruang pertemuan (meeting package) untuk konsolidasi regional, rakor stakeholder, dan debat publik calon.' },
  { kode: '82301', judul: 'Penyelenggara Pertemuan, Perjalanan Insentif, Konferensi dan Pameran (EO)', sektor: 'N - Aktivitas Jasa Penunjang Usaha Lainnya', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup perancangan, pengelolaan, sound system, panggung, tata cahaya (lighting), LED screen, dan dekorasi acara debat terbuka paslon atau deklarasi damai.' },
  { kode: '73100', judul: 'Periklanan (Advertising)', sektor: 'M - Aktivitas Profesional, Ilmiah dan Teknis', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup penayangan iklan sosialisasi pemilu/pilkada di media cetak lokal, radio, televisi swasta/daerah, baliho billboard jalan protokol, dan videotron.' },
  { kode: '41012', judul: 'Konstruksi Gedung Perkantoran / Bangunan Gedung Pemerintah', sektor: 'F - Konstruksi', kategori_pbj: 'Pekerjaan Konstruksi', deskripsi: 'Mencakup renovasi, rehabilitasi ringan/sedang gedung kantor KPU, aula rapat pleno, penataan ruang server tahan gempa/kebakaran, dan perbaikan atap gudang.' },
  { kode: '43211', judul: 'Instalasi Listrik', sektor: 'F - Konstruksi', kategori_pbj: 'Pekerjaan Konstruksi', deskripsi: 'Mencakup instalasi kelistrikan daya tinggi, pemasangan panel distribusi otomatis ATS/AMF genset, perbaikan grounding penangkal petir, dan instalasi UPS terpusat.' },
  { kode: '71101', judul: 'Aktivitas Arsitektur', sektor: 'M - Aktivitas Profesional, Ilmiah dan Teknis', kategori_pbj: 'Jasa Konsultansi', deskripsi: 'Mencakup jasa konsultansi perencanaan teknis renovasi gedung, gambar DED, RKS teknis, dan penyusunan Rencana Anggaran Biaya (EE/HPS Konsultan).' },
  { kode: '71102', judul: 'Aktivitas Keinsinyuran dan Konsultasi Teknis YBDI (Pengawasan Konstruksi)', sektor: 'M - Aktivitas Profesional, Ilmiah dan Teknis', kategori_pbj: 'Jasa Konsultansi', deskripsi: 'Mencakup jasa pengawasan konstruksi fisik gedung kantor/gudang logistik, verifikasi progres mingguan, dan penyusunan laporan kemajuan pekerjaan BAST.' },
  { kode: '80100', judul: 'Aktivitas Keamanan Swasta (Jasa Pengamanan / Satpam)', sektor: 'N - Aktivitas Administrasi Kantor & Keamanan', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup penyediaan personel satuan pengamanan (Satpam) 24 jam berlisensi Gada Pratama untuk kantor sekretariat KPU dan gudang logistik pemilu.' },
  { kode: '81210', judul: 'Aktivitas Kebersihan Umum Bangunan (Cleaning Service)', sektor: 'N - Aktivitas Jasa Kebersihan', kategori_pbj: 'Jasa Lainnya', deskripsi: 'Mencakup penyediaan jasa tenaga kebersihan kantor, perawatan taman, disinfeksi berkala, dan kebersihan ruang kerja.' }
];

async function ensureMasterKbliTableAndSeed(pool) {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS master_kbli (
        id INT NOT NULL AUTO_INCREMENT,
        kode VARCHAR(10) NOT NULL UNIQUE,
        judul VARCHAR(255) NOT NULL,
        sektor VARCHAR(128) DEFAULT '',
        kategori_pbj VARCHAR(64) DEFAULT 'Barang',
        deskripsi TEXT DEFAULT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    const [rows] = await pool.query('SELECT COUNT(*) AS cnt FROM master_kbli');
    if (!rows || !rows[0] || Number(rows[0].cnt) === 0) {
      for (const item of SEED_KBLI_DATA) {
        await pool.query(`
          INSERT INTO master_kbli (kode, judul, sektor, kategori_pbj, deskripsi, is_active)
          VALUES (?, ?, ?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            judul = VALUES(judul),
            sektor = VALUES(sektor),
            kategori_pbj = VALUES(kategori_pbj),
            deskripsi = VALUES(deskripsi),
            is_active = 1
        `, [item.kode, item.judul, item.sektor, item.kategori_pbj, item.deskripsi]);
      }
      console.log('[KBLI-INIT] master_kbli berhasil diinisialisasi & di-seed dengan 28 KBLI BPS 2020.');
    }
  } catch (err) {
    console.warn('[KBLI-INIT-WARN]', err.message);
  }
}

async function initDatabaseSchemaAndSeed() {
  if (schemaInitDone) return;
  const pool = getCakraPool();
  const sqlFilePath = path.resolve(__dirname, 'pengadaan_schema_seed.sql');

  try {
    const [sRows] = await pool.query('SELECT COUNT(*) AS cnt FROM pbj_settings');
    if (sRows && sRows[0] && sRows[0].cnt > 0) {
      await ensurePenyediaLinkDokumenColumn(pool);
      await ensurePaketTahapColumns(pool);
      await ensurePaketMissingColumns(pool);
      await migratePejabatTanpaGelarOnce(pool);
      await ensureAllPaketsHave18Stages();
      await seedRegulasiPengadaanToMasterRegulasi(pool);
      await ensureMasterKbliTableAndSeed(pool);
      schemaInitDone = true;
      return;
    }
  } catch (e) {
    // Tabel belum ada, jalankan inisialisasi dari pengadaan_schema_seed
  }

  let sqlContent = '';
  try {
    sqlContent = require('./pengadaan_schema_seed');
  } catch (e) {
    if (fs.existsSync(sqlFilePath)) {
      sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    }
  }

  if (sqlContent) {
    await pool.query(sqlContent);
    await ensurePenyediaLinkDokumenColumn(pool);
    await ensurePaketTahapColumns(pool);
    await migratePejabatTanpaGelarOnce(pool);
    await ensureAllPaketsHave18Stages();
    await seedRegulasiPengadaanToMasterRegulasi(pool);
    await ensureMasterKbliTableAndSeed(pool);
    schemaInitDone = true;
    console.log('[SI-PRABU PENGADAAN] Skema pbj_* & 6 Paket Percontohan KPU Kabupaten Ngawi berhasil dimuat ke siprabu_db.');
  }
}

async function ensureAllPaketsHave18Stages() {
  const pool = getCakraPool();
  // Migrasi kode paket legacy CAKRA- menjadi PBJ- agar nama dokumen unduhan resmi sesuai standar SI-PRABU
  try {
    await pool.query("UPDATE pbj_paket SET kode_paket_internal = REPLACE(kode_paket_internal, 'CAKRA-', 'PBJ-') WHERE kode_paket_internal LIKE 'CAKRA-%'");
  } catch (e) {}
  const [pakets] = await pool.query('SELECT * FROM pbj_paket ORDER BY id ASC');
  for (const p of pakets) {
    const [existing] = await pool.query('SELECT COUNT(*) AS cnt FROM pbj_paket_tahap WHERE paket_id = ?', [p.id]);
    if (!existing[0] || existing[0].cnt < 18) {
      const jadwal = susunJadwal18TahapOtomatis(p, p.tgl_mulai_kerja ? '2026-05-04' : '2026-05-04');
      for (const j of jadwal) {
        await pool.query(
          `INSERT IGNORE INTO pbj_paket_tahap (paket_id, no_tahap, fase, nama_tahap, nomor_dokumen, tanggal_dokumen, status_tahap, catatan_tahap)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [j.paket_id, j.no_tahap, j.fase, j.nama_tahap, j.nomor_dokumen, j.tanggal_dokumen, j.status_tahap, j.catatan_tahap]
        );
      }
    }
  }
}

async function getSettingsMap() {
  const pool = getCakraPool();
  const [rows] = await pool.query('SELECT `key`, `value` FROM pbj_settings');
  const map = {};
  for (const r of rows) map[r.key] = r.value;

  // Sinkronkan identitas satker dari settings_satker SI-PRABU jika tersedia
  try {
    const [sRows] = await pool.query('SELECT `key`, `value` FROM settings_satker');
    for (const sr of sRows) {
      if (sr.key === 'nama_satker' && sr.value) map.nama_satker = sr.value;
      if (sr.key === 'kode_satker' && sr.value) map.kode_satker = sr.value;
      if (sr.key === 'alamat_satker' && sr.value) map.alamat_satker = sr.value;
    }
  } catch (e) {}

  return map;
}

async function saveSettingsMap(payload) {
  const pool = getCakraPool();
  for (const [k, v] of Object.entries(payload || {})) {
    await pool.query('REPLACE INTO pbj_settings (`key`, `value`) VALUES (?, ?)', [k, String(v ?? '')]);
  }
  return getSettingsMap();
}

async function syncPejabatFromAdministrasi() {
  const pool = getCakraPool();
  try {
    const [sRows] = await pool.query('SELECT `key`, `value` FROM settings_satker');
    const s = {};
    sRows.forEach(r => { s[r.key] = r.value; });

    const [subRows] = await pool.query("SELECT kasubag_nama, kasubag_nip, kasubag_jabatan FROM master_subbagian WHERE kode = 'KUL' LIMIT 1");
    const kul = subRows[0] || {};

    if (s.kpa_nama) {
      await pool.query(
        "UPDATE pbj_pejabat SET nama_lengkap = ?, nip = ?, jabatan_struktural = COALESCE(NULLIF(?, ''), jabatan_struktural), no_sk = COALESCE(NULLIF(?, ''), no_sk), no_sertifikat_pbj = COALESCE(NULLIF(?, ''), no_sertifikat_pbj) WHERE peran = 'KPA'",
        [s.kpa_nama, s.kpa_nip || '-', s.kpa_jabatan || '', s.kpa_no_sk || '', s.kpa_sertifikat_pbj || '']
      );
    }
    if (s.ppkom_nama) {
      await pool.query(
        "UPDATE pbj_pejabat SET nama_lengkap = ?, nip = ?, jabatan_struktural = COALESCE(NULLIF(?, ''), jabatan_struktural), no_sk = COALESCE(NULLIF(?, ''), no_sk), no_sertifikat_pbj = COALESCE(NULLIF(?, ''), no_sertifikat_pbj) WHERE peran = 'PPK'",
        [s.ppkom_nama, s.ppkom_nip || '-', s.ppkom_jabatan || '', s.ppkom_no_sk || '', s.ppkom_sertifikat_pbj || '']
      );
    }
    if (s.ppbj_nama) {
      await pool.query(
        "UPDATE pbj_pejabat SET nama_lengkap = ?, nip = ?, jabatan_struktural = COALESCE(NULLIF(?, ''), jabatan_struktural), no_sk = COALESCE(NULLIF(?, ''), no_sk), no_sertifikat_pbj = COALESCE(NULLIF(?, ''), no_sertifikat_pbj) WHERE peran = 'PEJABAT_PENGADAAN'",
        [s.ppbj_nama, s.ppbj_nip || '-', s.ppbj_jabatan || '', s.ppbj_no_sk || '', s.ppbj_sertifikat_pbj || '']
      );
    }
    const bpNama = s.bp_nama || s.bendahara_nama;
    if (bpNama) {
      await pool.query(
        "UPDATE pbj_pejabat SET nama_lengkap = ?, nip = ?, jabatan_struktural = COALESCE(NULLIF(?, ''), jabatan_struktural), no_sk = COALESCE(NULLIF(?, ''), no_sk), no_sertifikat_pbj = COALESCE(NULLIF(?, ''), no_sertifikat_pbj) WHERE peran = 'BENDAHARA'",
        [bpNama, s.bp_nip || s.bendahara_nip || '-', s.bp_jabatan || s.bendahara_jabatan || '', s.bp_no_sk || '', s.bp_sertifikat_pbj || '']
      );
    }
    if (kul.kasubag_nama) {
      await pool.query(
        "UPDATE pbj_pejabat SET nama_lengkap = ?, nip = ?, jabatan_struktural = COALESCE(NULLIF(?, ''), jabatan_struktural) WHERE peran = 'PPSPM'",
        [kul.kasubag_nama, kul.kasubag_nip || '-', kul.kasubag_jabatan || '']
      );
    }
  } catch (e) {}
}

async function getPejabatList() {
  const pool = getCakraPool();
  await syncPejabatFromAdministrasi();
  const [rows] = await pool.query("SELECT * FROM pbj_pejabat WHERE peran != 'TIM_TEKNIS' ORDER BY id ASC");
  return rows;
}

async function savePejabat(data) {
  const pool = getCakraPool();
  const cleanPeran = String(data.peran || 'PPK').trim().toUpperCase();
  const cleanNama = String(data.nama_lengkap || '').trim();
  const cleanNip = String(data.nip || '-').trim();
  const cleanJabatan = String(data.jabatan_struktural || '').trim();

  let savedId;
  if (data.id) {
    await pool.query(
      `UPDATE pbj_pejabat SET peran=?, nama_lengkap=?, nip=?, pangkat_gol=?, jabatan_struktural=?, no_sk=?, tgl_sk=?, no_sertifikat_pbj=?, tipologi_ppk=?, is_active=? WHERE id=?`,
      [cleanPeran, cleanNama, cleanNip, data.pangkat_gol || '-', cleanJabatan, data.no_sk || '-', data.tgl_sk || '', data.no_sertifikat_pbj || '-', data.tipologi_ppk || '-', data.is_active ?? 1, data.id]
    );
    savedId = data.id;
  } else {
    const [res] = await pool.query(
      `INSERT INTO pbj_pejabat (peran, nama_lengkap, nip, pangkat_gol, jabatan_struktural, no_sk, tgl_sk, no_sertifikat_pbj, tipologi_ppk, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [cleanPeran, cleanNama, cleanNip, data.pangkat_gol || '-', cleanJabatan, data.no_sk || '-', data.tgl_sk || '', data.no_sertifikat_pbj || '-', data.tipologi_ppk || '-', 1]
    );
    savedId = res.insertId;
  }

  // Sinkronkan 2 arah ke settings_satker, master_subbagian, & satker_users agar menu Penandatangan & Pengguna selalu selaras
  try {
    if (cleanPeran === 'KPA') {
      await pool.query("REPLACE INTO settings_satker (`key`, `value`) VALUES ('kpa_nama', ?), ('kpa_nip', ?)", [cleanNama, cleanNip]);
      if (cleanJabatan) await pool.query("REPLACE INTO settings_satker (`key`, `value`) VALUES ('kpa_jabatan', ?)", [cleanJabatan]);
      await pool.query("UPDATE satker_users SET nama_pejabat = ?, nip = ? WHERE username = 'sekretaris'", [cleanNama, cleanNip]);
    } else if (cleanPeran === 'PPK') {
      await pool.query("REPLACE INTO settings_satker (`key`, `value`) VALUES ('ppkom_nama', ?), ('ppkom_nip', ?)", [cleanNama, cleanNip]);
      if (cleanJabatan) await pool.query("REPLACE INTO settings_satker (`key`, `value`) VALUES ('ppkom_jabatan', ?)", [cleanJabatan]);
      await pool.query("UPDATE satker_users SET nama_pejabat = ?, nip = ?, jabatan = COALESCE(NULLIF(?, ''), jabatan) WHERE username = 'ppk_ngawi'", [cleanNama, cleanNip, cleanJabatan]);
    } else if (cleanPeran === 'PEJABAT_PENGADAAN') {
      await pool.query("REPLACE INTO settings_satker (`key`, `value`) VALUES ('ppbj_nama', ?), ('ppbj_nip', ?)", [cleanNama, cleanNip]);
      if (cleanJabatan) await pool.query("REPLACE INTO settings_satker (`key`, `value`) VALUES ('ppbj_jabatan', ?)", [cleanJabatan]);
      await pool.query("UPDATE satker_users SET nama_pejabat = ?, nip = ?, jabatan = COALESCE(NULLIF(?, ''), jabatan) WHERE username = 'ppbj_ngawi'", [cleanNama, cleanNip, cleanJabatan]);
    } else if (cleanPeran === 'BENDAHARA') {
      await pool.query("REPLACE INTO settings_satker (`key`, `value`) VALUES ('bp_nama', ?), ('bp_nip', ?), ('bendahara_nama', ?), ('bendahara_nip', ?)", [cleanNama, cleanNip, cleanNama, cleanNip]);
      if (cleanJabatan) await pool.query("REPLACE INTO settings_satker (`key`, `value`) VALUES ('bp_jabatan', ?), ('bendahara_jabatan', ?)", [cleanJabatan, cleanJabatan]);
      await pool.query("UPDATE satker_users SET nama_pejabat = ?, nip = ?, jabatan = COALESCE(NULLIF(?, ''), jabatan) WHERE username = 'bp_ngawi'", [cleanNama, cleanNip, cleanJabatan]);
    } else if (cleanPeran === 'PPSPM') {
      await pool.query("UPDATE master_subbagian SET kasubag_nama = ?, kasubag_nip = ? WHERE kode = 'KUL'", [cleanNama, cleanNip]);
      await pool.query("UPDATE satker_users SET nama_pejabat = ?, nip = ? WHERE username = 'kul'", [cleanNama, cleanNip]);
    }
  } catch (e) {}

  return savedId;
}

async function getPenyediaList() {
  const pool = getCakraPool();
  const [rows] = await pool.query('SELECT * FROM pbj_penyedia ORDER BY id ASC');
  return rows;
}

async function savePenyedia(data) {
  const pool = getCakraPool();
  await ensurePenyediaLinkDokumenColumn(pool);
  if (data.id) {
    await pool.query(
      `UPDATE pbj_penyedia SET
        nama_perusahaan=?, bentuk_usaha=?, kualifikasi_usaha=?, npwp=?, nib=?, kbli=?, status_pkp=?,
        alamat=?, kota=?, email=?, telepon=?, nama_direktur=?, jabatan_penandatangan=?, nik_direktur=?,
        no_akta_pendirian=?, nama_bank=?, no_rekening=?, atas_nama_rekening=?,
        bo_nama_pemilik_manfaat=?, bo_nik_pemilik_manfaat=?, bo_hubungan=?,
        skor_kinerja_terakhir=?, kategori_kinerja=?, jumlah_repeat_order=?, link_dokumen=?
       WHERE id=?`,
      [
        data.nama_perusahaan, data.bentuk_usaha || 'CV', data.kualifikasi_usaha || 'Usaha Kecil',
        data.npwp || '', data.nib || '', data.kbli || '', Number(data.status_pkp ?? 1),
        data.alamat || '', data.kota || 'Ngawi', data.email || '', data.telepon || '',
        data.nama_direktur || '', data.jabatan_penandatangan || 'Direktur', data.nik_direktur || '',
        data.no_akta_pendirian || '', data.nama_bank || '', data.no_rekening || '', data.atas_nama_rekening || '',
        data.bo_nama_pemilik_manfaat || data.nama_direktur || '', data.bo_nik_pemilik_manfaat || data.nik_direktur || '',
        data.bo_hubungan || 'Pemilik Manfaat Langsung', Number(data.skor_kinerja_terakhir || 2.85),
        data.kategori_kinerja || 'Sangat Baik', Number(data.jumlah_repeat_order || 0),
        String(data.link_dokumen || '').trim(), data.id
      ]
    );
    return data.id;
  } else {
    const [res] = await pool.query(
      `INSERT INTO pbj_penyedia (
        nama_perusahaan, bentuk_usaha, kualifikasi_usaha, npwp, nib, kbli, status_pkp,
        alamat, kota, email, telepon, nama_direktur, jabatan_penandatangan, nik_direktur,
        no_akta_pendirian, nama_bank, no_rekening, atas_nama_rekening,
        bo_nama_pemilik_manfaat, bo_nik_pemilik_manfaat, bo_hubungan,
        skor_kinerja_terakhir, kategori_kinerja, jumlah_repeat_order, link_dokumen
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.nama_perusahaan, data.bentuk_usaha || 'CV', data.kualifikasi_usaha || 'Usaha Kecil',
        data.npwp || '', data.nib || '', data.kbli || '', Number(data.status_pkp ?? 1),
        data.alamat || '', data.kota || 'Ngawi', data.email || '', data.telepon || '',
        data.nama_direktur || '', data.jabatan_penandatangan || 'Direktur', data.nik_direktur || '',
        data.no_akta_pendirian || '', data.nama_bank || '', data.no_rekening || '', data.atas_nama_rekening || '',
        data.bo_nama_pemilik_manfaat || data.nama_direktur || '', data.bo_nik_pemilik_manfaat || data.nik_direktur || '',
        data.bo_hubungan || 'Pemilik Manfaat Langsung', Number(data.skor_kinerja_terakhir || 2.85),
        data.kategori_kinerja || 'Sangat Baik', Number(data.jumlah_repeat_order || 0),
        String(data.link_dokumen || '').trim()
      ]
    );
    return res.insertId;
  }
}


async function getKbliList() {
  const pool = getCakraPool();
  try {
    await ensureMasterKbliTableAndSeed(pool);
    const [rows] = await pool.query('SELECT * FROM master_kbli WHERE is_active = 1 ORDER BY kode ASC');
    return rows;
  } catch (err) {
    console.warn('Gagal load master_kbli:', err.message);
    return [];
  }
}

async function saveKbli(data) {
  const pool = getCakraPool();
  await ensureMasterKbliTableAndSeed(pool);
  const kode = String(data.kode || '').trim();
  const judul = String(data.judul || '').trim();
  const sektor = String(data.sektor || '').trim();
  const kategori_pbj = String(data.kategori_pbj || 'Barang').trim();
  const deskripsi = String(data.deskripsi || '').trim();
  const is_active = Number(data.is_active ?? 1);

  if (data.id) {
    await pool.query(
      `UPDATE master_kbli 
       SET kode = ?, judul = ?, sektor = ?, kategori_pbj = ?, deskripsi = ?, is_active = ?
       WHERE id = ?`,
      [kode, judul, sektor, kategori_pbj, deskripsi, is_active, Number(data.id)]
    );
    return data.id;
  } else {
    const [res] = await pool.query(
      `INSERT INTO master_kbli (kode, judul, sektor, kategori_pbj, deskripsi, is_active)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         judul = VALUES(judul), sektor = VALUES(sektor), kategori_pbj = VALUES(kategori_pbj), deskripsi = VALUES(deskripsi), is_active = 1`,
      [kode, judul, sektor, kategori_pbj, deskripsi, is_active]
    );
    return res.insertId;
  }
}

async function deleteKbli(id) {
  const pool = getCakraPool();
  await pool.query('UPDATE master_kbli SET is_active = 0 WHERE id = ?', [Number(id)]);
  return true;
}

async function getPaketList() {
  const pool = getCakraPool();
  const [rows] = await pool.query(`
    SELECT p.*,
           v.nama_perusahaan AS nama_penyedia,
           v.kualifikasi_usaha AS kualifikasi_penyedia,
           ppk.nama_lengkap AS nama_ppk,
           COALESCE(SUM(CASE WHEN t.status_tahap = 'Selesai' AND t.link_drive_dokumen IS NOT NULL AND LENGTH(TRIM(t.link_drive_dokumen)) > 5 THEN 1 ELSE 0 END), 0) AS count_selesai,
           COALESCE(SUM(CASE WHEN t.status_tahap = 'Draft' THEN 1 ELSE 0 END), 0) AS count_draft,
           COALESCE(SUM(CASE WHEN t.status_tahap = 'Bypass' THEN 1 ELSE 0 END), 0) AS count_bypass,
           COALESCE(SUM(CASE WHEN t.link_drive_dokumen IS NOT NULL AND LENGTH(TRIM(t.link_drive_dokumen)) > 5 THEN 1 ELSE 0 END), 0) AS count_drive
    FROM pbj_paket p
    LEFT JOIN pbj_penyedia v ON p.penyedia_id = v.id
    LEFT JOIN pbj_pejabat ppk ON p.ppk_id = ppk.id
    LEFT JOIN pbj_paket_tahap t ON p.id = t.paket_id
    GROUP BY p.id, v.nama_perusahaan, v.kualifikasi_usaha, ppk.nama_lengkap
    ORDER BY p.id ASC
  `);
  return rows;
}

async function getPaketFullById(paketId) {
  const pool = getCakraPool();
  await syncPejabatFromAdministrasi();
  const [pakets] = await pool.query('SELECT * FROM pbj_paket WHERE id = ?', [paketId]);
  if (!pakets.length) return null;
  const paket = pakets[0];
  if (paket.multi_pengusul_json && typeof paket.multi_pengusul_json === 'string') {
    try {
      paket.multi_pengusul_json = JSON.parse(paket.multi_pengusul_json);
    } catch (e) {
      paket.multi_pengusul_json = [];
    }
  } else if (!paket.multi_pengusul_json) {
    paket.multi_pengusul_json = [];
  }

  const [items] = await pool.query('SELECT * FROM pbj_paket_item WHERE paket_id = ? ORDER BY urutan ASC, id ASC', [paketId]);
  items.forEach(it => {
    if (it.evaluasi_pasar_json && typeof it.evaluasi_pasar_json === 'string') {
      try {
        it.evaluasi_pasar_json = JSON.parse(it.evaluasi_pasar_json);
      } catch (e) {
        it.evaluasi_pasar_json = null;
      }
    }
  });
  const [tahaps] = await pool.query('SELECT * FROM pbj_paket_tahap WHERE paket_id = ? ORDER BY no_tahap ASC', [paketId]);
  const [pejabats] = await pool.query("SELECT * FROM pbj_pejabat WHERE peran != 'TIM_TEKNIS'");
  const [penyedias] = await pool.query('SELECT * FROM pbj_penyedia WHERE id = ?', [paket.penyedia_id]);
  const settings = await getSettingsMap();

  const pejabatMap = {};
  for (const pj of pejabats) {
    pejabatMap[pj.id] = pj;
    if (!pejabatMap[pj.peran]) pejabatMap[pj.peran] = pj;
  }

  const [subbags] = await pool.query('SELECT * FROM master_subbagian');
  const subbag = (subbags || []).find(s => s.kode === paket.pic_subbag) || subbags[0] || {};

  return {
    paket,
    items,
    tahaps,
    subbag,
    subbags: subbags || [],
    penyedia: penyedias[0] || {},
    ppk: pejabatMap[paket.ppk_id] || pejabatMap['PPK'] || {},
    kpa: pejabatMap[paket.kpa_id] || pejabatMap['KPA'] || {},
    pejabatPengadaan: pejabatMap[paket.pejabat_pengadaan_id] || pejabatMap['PEJABAT_PENGADAAN'] || {},
    bendahara: pejabatMap[paket.bendahara_id] || pejabatMap['BENDAHARA'] || {},
    ppspm: pejabatMap['PPSPM'] || {},
    timTeknis: {},
    settings
  };
}

async function recalculatePaketTotals(paketId) {
  const pool = getCakraPool();
  const [items] = await pool.query('SELECT * FROM pbj_paket_item WHERE paket_id = ?', [paketId]);
  if (!items.length) return;

  let totalHps = 0;
  let totalPenawaran = 0;
  let totalKontrak = 0;

  for (const it of items) {
    const vol = Number(it.volume) || 0;
    const hrgHps = Number(it.harga_satuan_hps) || Number(it.harga_survei_1) || 0;
    const hrgPenawaran = Number(it.harga_satuan_penawaran) || hrgHps;
    const hrgKontrak = Number(it.harga_satuan_kontrak) || hrgPenawaran;

    const jmlHps = Math.round(vol * hrgHps);
    const jmlKontrak = Math.round(vol * hrgKontrak);

    totalHps += jmlHps;
    totalPenawaran += Math.round(vol * hrgPenawaran);
    totalKontrak += jmlKontrak;

    await pool.query(
      'UPDATE pbj_paket_item SET jumlah_hps = ?, jumlah_kontrak = ? WHERE id = ?',
      [jmlHps, jmlKontrak, it.id]
    );
  }

  await pool.query(
    'UPDATE pbj_paket SET nilai_hps = ?, nilai_penawaran_awal = ?, nilai_kontrak = ? WHERE id = ?',
    [totalHps, totalPenawaran, totalKontrak, paketId]
  );
}

function determineStatusPaketByStage(stageNo) {
  const n = Number(stageNo || 1);
  if (n <= 3) return 'Perencanaan';
  if (n <= 7) return 'Persiapan PPK';
  if (n <= 9) return 'Pemilihan';
  if (n <= 13) return 'Kontrak Aktif';
  if (n <= 15) return 'Pelaksanaan Kontrak';
  if (n <= 17) return 'Serah Terima & BMN';
  return 'Selesai & Lunas';
}

async function savePaket(data) {
  const pool = getCakraPool();
  const rekomendasi = evaluasiJalurRegulasi(data);

  // Hitung skor kinerja akhir (Kualitas 30%, Biaya 20%, Waktu 30%, Layanan 20%)
  const sKualitas = Number(data.skor_kualitas ?? 3);
  const sBiaya = Number(data.skor_biaya ?? 3);
  const sWaktu = Number(data.skor_waktu ?? 3);
  const sLayanan = Number(data.skor_layanan ?? 3);
  const nilaiKinerja = Number(((sKualitas * 0.3) + (sBiaya * 0.2) + (sWaktu * 0.3) + (sLayanan * 0.2)).toFixed(2));
  let predikat = 'Sangat Baik';
  if (nilaiKinerja === 0) predikat = 'Buruk';
  else if (nilaiKinerja < 2.0) predikat = 'Cukup';
  else if (nilaiKinerja < 2.5) predikat = 'Baik';

  if (data.id) {
    // Ambil data paket yang ada saat ini dari database untuk penggabungan aman (zero data loss)
    const [curRows] = await pool.query('SELECT * FROM pbj_paket WHERE id = ?', [data.id]);
    const cur = curRows[0] || {};
    const p = { ...cur, ...data };

    const cleanTahapAktif = Number(p.tahap_aktif || cur.tahap_aktif || 1);
    const cleanStatusPaket = determineStatusPaketByStage(cleanTahapAktif);

    await pool.query(
      `UPDATE pbj_paket SET
        kode_rup=?, nama_paket=?, uraian_pekerjaan=?, lokasi_pekerjaan=?,
        sumber_dana=?, tahun_anggaran=?, kode_akun_mak=?, nama_akun_mak=?, komponen_ro=?, pic_subbag=?,
        rkb_program=?, rkb_kegiatan=?, rkb_subkegiatan=?, rkb_komponen=?, bmn_kategori_telaah=?,
        disposisi_status=?, disposisi_catatan_kpa=?, disposisi_tgl_diajukan=?, disposisi_tgl_disposisi=?,
        no_nota_dinas_pengusul=?, tgl_nota_dinas_pengusul=?, perihal_nota_dinas=?, no_disposisi_kpa=?, tgl_disposisi_kpa=?,
        is_multi_subbag=?, multi_pengusul_json=?,
        bmn_status_ketersediaan=?, bmn_jumlah_eksisting=?, bmn_kondisi_eksisting=?, bmn_sifat_kebutuhan=?, bmn_kesesuaian_rkbmn=?, bmn_catatan_telaah=?,
        jenis_pengadaan=?, cara_pengadaan=?, metode_pemilihan=?, sub_metode_epurchasing=?, fitur_spse=?, pelaksana_pemilihan=?,
        nilai_pagu=?, jenis_kertas_harga=?, nilai_hps=?, nilai_penawaran_awal=?, nilai_kontrak=?,
        tarif_ppn=?, termasuk_ppn=?, jenis_pph=?, tarif_pph=?,
        prioritas_pdn_level=?, persen_tkdn_target=?, persen_bmp_target=?, target_sertifikat_tkdn=?, peruntukan_umk=?,
        tersedia_di_katalog=?, alasan_penilaian_ppk_katalog=?, link_produk_katalog_1=?, link_produk_katalog_2=?,
        jenis_kontrak=?, bentuk_kontrak=?, cara_pembayaran=?, basis_denda=?, ketentuan_garansi=?, penyelesaian_sengketa=?,
        no_reviu_dpp=?, kesimpulan_reviu_dpp=?, tempat_reviu_dpp=?,
        nama_pokja=?, sk_pokja=?,
        id_paket_katalog=?, no_undangan_penawaran=?, no_surat_penawaran=?, tgl_surat_penawaran=?,
        tempat_pemilihan=?, no_ba_nego=?, no_bahp=?, kode_tender_spse=?,
        no_ba_reviu_ppk=?, tgl_reviu_ppk=?, kesimpulan_reviu_ppk=?, status_kswp=?, status_daftar_hitam=?,
        bo_nama=?, bo_nik=?, bo_posisi=?, bo_benturan_kepentingan=?, evaluasi_spek_sla=?, catatan_reviu_ppk=?,
        masa_pelaksanaan_hari=?, tgl_mulai_kerja=?, tgl_selesai_kontrak=?, tgl_realisasi_selesai=?, hari_terlambat=?,
        persen_uang_muka=?, nilai_uang_muka=?, wajib_jaminan_pelaksanaan=?, nilai_jaminan_pelaksanaan=?,
        no_sppbj=?, tgl_sppbj=?, status_jaminan_pelaksanaan=?, alasan_bebas_jaminan=?,
        no_surat_kesanggupan_penyedia=?, tgl_surat_kesanggupan=?, batas_waktu_ttd_kontrak=?, catatan_sppbj=?,
        no_undangan_pam=?, tgl_undangan_pam=?, no_ba_pam=?, tgl_ba_pam=?, tempat_pam=?,
        metode_pam=?, link_zoom_pam=?,
        nama_bank_penyedia=?, no_rekening_penyedia=?, atas_nama_rekening_penyedia=?,
        legalitas_akta_notaris=?, legalitas_nib=?, legalitas_status_fiskal=?, legalitas_status_spt=?,
        kesepakatan_tgl_ttd_kontrak=?, kesepakatan_jadwal_pelaksanaan=?, catatan_pam=?,
        no_kontrak=?, tgl_kontrak=?, tempat_ttd_kontrak=?, jenis_meterai=?, ketentuan_denda=?, catatan_kontrak=?,
        no_spp=?, tgl_spp=?, no_ba_spl=?, tgl_ba_spl=?, kondisi_ruang_server=?, pic_teknisi_rekanan=?, kontak_teknisi_rekanan=?, catatan_spp=?,
        parameter_kesiapan_lokasi_json=?, ketentuan_pasca_pengiriman_json=?,
        no_laporan_pengendalian=?, tgl_laporan_pengendalian=?, no_ba_komisioning=?, tgl_ba_komisioning=?,
        realisasi_fisik_persen=?, rencana_fisik_persen=?, deviasi_fisik_persen=?, status_scm=?,
        catatan_pengendalian_ppk=?, parameter_komisioning_json=?, milestone_pengendalian_json=?,
        no_baphp=?, tgl_baphp=?, nama_tim_pemeriksa=?, nip_tim_pemeriksa=?, kesimpulan_pemeriksaan_baphp=?,
        parameter_pemeriksaan_baphp_json=?,
        no_bast=?, tgl_bast=?, tempat_bast=?, catatan_bast=?, status_denda=?, denda_keterlambatan_rp=?,
        masa_garansi_hari=?, tgl_mulai_garansi=?, tgl_selesai_garansi=?,
        penyedia_id=?, ppk_id=?, pejabat_pengadaan_id=?, kpa_id=?, bendahara_id=?, tim_teknis_id=?,
        tahap_aktif=?, status_paket=?, skor_kualitas=?, skor_biaya=?, skor_waktu=?, skor_layanan=?,
        nilai_kinerja_akhir=?, predikat_kinerja=?, catatan_khusus_ppk=?,
        no_skkp=?, tgl_skkp=?, catatan_kualitas=?, catatan_biaya=?, catatan_waktu=?, catatan_layanan=?, rekomendasi_repeat_order=?
       WHERE id=?`,
      [
        p.kode_rup || '', p.nama_paket || cur.nama_paket, p.uraian_pekerjaan || cur.uraian_pekerjaan || '', p.lokasi_pekerjaan || cur.lokasi_pekerjaan || 'Kantor KPU Kabupaten Ngawi',
        p.sumber_dana || cur.sumber_dana || 'APBN DIPA', p.tahun_anggaran || cur.tahun_anggaran || '2026', p.kode_akun_mak || cur.kode_akun_mak || '521211', p.nama_akun_mak || cur.nama_akun_mak || 'Belanja Bahan',
        p.komponen_ro || cur.komponen_ro || '', p.pic_subbag || cur.pic_subbag || 'KUL',
        p.rkb_program || cur.rkb_program || 'Program Penyelenggaraan Pemilu dalam Proses Konsolidasi Demokrasi',
        p.rkb_kegiatan || cur.rkb_kegiatan || 'Pengelolaan dan Pelayanan Sistem Informasi dan Data Pemilih (SIDALIH)',
        p.rkb_subkegiatan || cur.rkb_subkegiatan || 'Pemeliharaan dan Pengadaan Sarana Pengolah Data Operasional Pemilu',
        p.rkb_komponen || cur.rkb_komponen || 'Pengadaan Perangkat Server dan Jaringan Komputer',
        p.bmn_kategori_telaah || cur.bmn_kategori_telaah || (String(p.kode_akun_mak || '').startsWith('53') ? 'MODAL' : 'EKSTRAKOMPTABEL'),
        p.disposisi_status || cur.disposisi_status || 'DISETUJUI', p.disposisi_catatan_kpa || cur.disposisi_catatan_kpa || '', p.disposisi_tgl_diajukan || cur.disposisi_tgl_diajukan || null, p.disposisi_tgl_disposisi || cur.disposisi_tgl_disposisi || null,
        p.no_nota_dinas_pengusul || cur.no_nota_dinas_pengusul || '', p.tgl_nota_dinas_pengusul || cur.tgl_nota_dinas_pengusul || '', p.perihal_nota_dinas || cur.perihal_nota_dinas || '', p.no_disposisi_kpa || cur.no_disposisi_kpa || '', p.tgl_disposisi_kpa || cur.tgl_disposisi_kpa || '',
        Number(p.is_multi_subbag !== undefined ? p.is_multi_subbag : (cur.is_multi_subbag || 0)), typeof p.multi_pengusul_json === 'object' ? JSON.stringify(p.multi_pengusul_json) : (p.multi_pengusul_json || cur.multi_pengusul_json || null),
        p.bmn_status_ketersediaan || cur.bmn_status_ketersediaan || 'TERSEDIA_RUSAK_BERAT', Number(p.bmn_jumlah_eksisting ?? cur.bmn_jumlah_eksisting ?? 0), p.bmn_kondisi_eksisting || cur.bmn_kondisi_eksisting || '', p.bmn_sifat_kebutuhan || cur.bmn_sifat_kebutuhan || 'PENGGANTIAN', p.bmn_kesesuaian_rkbmn || cur.bmn_kesesuaian_rkbmn || '', p.bmn_catatan_telaah || cur.bmn_catatan_telaah || '',
        p.jenis_pengadaan || cur.jenis_pengadaan || 'Barang', p.cara_pengadaan || cur.cara_pengadaan || 'Penyedia', p.metode_pemilihan || cur.metode_pemilihan || 'E-Purchasing',
        p.sub_metode_epurchasing || cur.sub_metode_epurchasing || 'Negosiasi Harga', p.fitur_spse || cur.fitur_spse || rekomendasi.fiturSpse, p.pelaksana_pemilihan || cur.pelaksana_pemilihan || rekomendasi.pelaksana,
        Number(p.nilai_pagu ?? cur.nilai_pagu ?? 0), p.jenis_kertas_harga || cur.jenis_kertas_harga || rekomendasi.jenisKertasHarga,
        Number(p.nilai_hps ?? cur.nilai_hps ?? 0), Number(p.nilai_penawaran_awal ?? cur.nilai_penawaran_awal ?? 0), Number(p.nilai_kontrak ?? cur.nilai_kontrak ?? 0),
        Number(p.tarif_ppn ?? cur.tarif_ppn ?? 11), Number(p.termasuk_ppn ?? cur.termasuk_ppn ?? 1), p.jenis_pph || cur.jenis_pph || 'PPh 22 (1.5%)', Number(p.tarif_pph ?? cur.tarif_pph ?? 1.5),
        p.prioritas_pdn_level || cur.prioritas_pdn_level || 'Level 1: TKDN >= 25% (TKDN+BMP >= 40%)', Number(p.persen_tkdn_target ?? cur.persen_tkdn_target ?? 40), Number(p.persen_bmp_target ?? cur.persen_bmp_target ?? 15), p.target_sertifikat_tkdn || cur.target_sertifikat_tkdn || 'TKDN 42.50% + Bobot Manfaat Perusahaan (BMP) 10.00%', Number(p.peruntukan_umk ?? cur.peruntukan_umk ?? 1),
        p.tersedia_di_katalog || cur.tersedia_di_katalog || 'Ya, Tersedia & Sesuai', p.alasan_penilaian_ppk_katalog || cur.alasan_penilaian_ppk_katalog || '', p.link_produk_katalog_1 || cur.link_produk_katalog_1 || '', p.link_produk_katalog_2 || cur.link_produk_katalog_2 || '',
        p.jenis_kontrak || cur.jenis_kontrak || 'Lumsum', p.bentuk_kontrak || cur.bentuk_kontrak || rekomendasi.bentukKontrak,
        p.cara_pembayaran || cur.cara_pembayaran || 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)',
        p.basis_denda || cur.basis_denda || '1 permil per hari dari Harga Kontrak sebelum PPN (DPP)',
        p.ketentuan_garansi || cur.ketentuan_garansi || 'Sertifikat Garansi Purna Jual Resmi Pabrikan Minimal 1 Tahun (365 Hari Kalender) — Bebas Retensi 5%',
        p.penyelesaian_sengketa || cur.penyelesaian_sengketa || 'Musyawarah untuk Mufakat, dilanjutkan Layanan Penyelesaian Sengketa (LPS) LKPP',
        p.no_reviu_dpp || cur.no_reviu_dpp || null,
        p.kesimpulan_reviu_dpp || cur.kesimpulan_reviu_dpp || 'Disetujui Penuh (Dokumen Lengkap, Lanjut Pemilihan Tahap 9)',
        p.tempat_reviu_dpp || cur.tempat_reviu_dpp || 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi',
        p.nama_pokja || cur.nama_pokja || 'Pokja Pemilihan UKPBJ KPU Provinsi Jawa Timur',
        p.sk_pokja || cur.sk_pokja || 'Surat Keputusan Kepala UKPBJ KPU Provinsi Jawa Timur',
        p.id_paket_katalog || cur.id_paket_katalog || null,
        p.no_undangan_penawaran || cur.no_undangan_penawaran || null,
        p.no_surat_penawaran || cur.no_surat_penawaran || null,
        p.tgl_surat_penawaran || cur.tgl_surat_penawaran || null,
        p.tempat_pemilihan || cur.tempat_pemilihan || 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi',
        p.no_ba_nego || cur.no_ba_nego || null,
        p.no_bahp || cur.no_bahp || null,
        p.kode_tender_spse || cur.kode_tender_spse || null,
        p.no_ba_reviu_ppk || cur.no_ba_reviu_ppk || null,
        p.tgl_reviu_ppk || cur.tgl_reviu_ppk || null,
        p.kesimpulan_reviu_ppk || cur.kesimpulan_reviu_ppk || 'Disetujui Penuh (Dokumen Lengkap, Lanjut SPPBJ Tahap 11)',
        p.status_kswp || cur.status_kswp || 'Valid / Konfirmasi Sesuai',
        p.status_daftar_hitam || cur.status_daftar_hitam || 'Tidak Tercantum (Bebas Sanksi Daftar Hitam)',
        p.bo_nama || cur.bo_nama || 'Hendra Suryawan',
        p.bo_nik || cur.bo_nik || '3521011504820003',
        p.bo_posisi || cur.bo_posisi || 'Pemilik Modal / Direktur (100%)',
        p.bo_benturan_kepentingan || cur.bo_benturan_kepentingan || 'Bebas Benturan Kepentingan',
        p.evaluasi_spek_sla || cur.evaluasi_spek_sla || 'Sesuai 100% KAK & Garansi Resmi 1 Tahun Pabrikan',
        p.catatan_reviu_ppk || cur.catatan_reviu_ppk || null,
        Number(p.masa_pelaksanaan_hari ?? cur.masa_pelaksanaan_hari ?? 14),
        p.tgl_mulai_kerja || cur.tgl_mulai_kerja || '2026-05-18', p.tgl_selesai_kontrak || cur.tgl_selesai_kontrak || '2026-05-31', p.tgl_realisasi_selesai || cur.tgl_realisasi_selesai || '2026-05-30', Number(p.hari_terlambat ?? cur.hari_terlambat ?? 0),
        Number(p.persen_uang_muka ?? cur.persen_uang_muka ?? 0), Math.round(((Number(p.nilai_kontrak ?? cur.nilai_kontrak ?? 0) || Number(p.nilai_hps ?? cur.nilai_hps ?? 0) || Number(p.nilai_pagu ?? cur.nilai_pagu ?? 0)) * Number(p.persen_uang_muka ?? cur.persen_uang_muka ?? 0)) / 100),
        Number(p.wajib_jaminan_pelaksanaan !== undefined ? p.wajib_jaminan_pelaksanaan : (cur.wajib_jaminan_pelaksanaan !== undefined ? cur.wajib_jaminan_pelaksanaan : rekomendasi.wajibJaminan)),
        Number(p.nilai_jaminan_pelaksanaan !== undefined ? p.nilai_jaminan_pelaksanaan : (cur.nilai_jaminan_pelaksanaan !== undefined ? cur.nilai_jaminan_pelaksanaan : (Number(p.wajib_jaminan_pelaksanaan ?? cur.wajib_jaminan_pelaksanaan ?? rekomendasi.wajibJaminan) ? Math.round((Number(p.nilai_kontrak ?? cur.nilai_kontrak ?? 0) || Number(p.nilai_hps ?? cur.nilai_hps ?? 0)) * 0.05) : 0))),
        p.no_sppbj || cur.no_sppbj || null,
        p.tgl_sppbj || cur.tgl_sppbj || null,
        p.status_jaminan_pelaksanaan || cur.status_jaminan_pelaksanaan || 'DIBEBASKAN (E-Purchasing / Nilai s.d. Rp 200 Juta)',
        p.alasan_bebas_jaminan || cur.alasan_bebas_jaminan || 'Pasal 33 ayat (2) huruf b dan ayat (3) Perpres PBJ',
        p.no_surat_kesanggupan_penyedia || cur.no_surat_kesanggupan_penyedia || null,
        p.tgl_surat_kesanggupan || cur.tgl_surat_kesanggupan || null,
        p.batas_waktu_ttd_kontrak || cur.batas_waktu_ttd_kontrak || null,
        p.catatan_sppbj || cur.catatan_sppbj || null,
        p.no_undangan_pam || cur.no_undangan_pam || null,
        p.tgl_undangan_pam || cur.tgl_undangan_pam || null,
        p.no_ba_pam || cur.no_ba_pam || null,
        p.tgl_ba_pam || cur.tgl_ba_pam || null,
        p.tempat_pam || cur.tempat_pam || 'Ruang Rapat PPK KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi',
        p.metode_pam || cur.metode_pam || 'LURING',
        p.link_zoom_pam !== undefined ? p.link_zoom_pam : (cur.link_zoom_pam || null),
        p.nama_bank_penyedia || cur.nama_bank_penyedia || 'Bank Jatim Cabang Ngawi',
        p.no_rekening_penyedia || cur.no_rekening_penyedia || '014-229-8711',
        p.atas_nama_rekening_penyedia || cur.atas_nama_rekening_penyedia || 'CV. GRAFIKA PRATAMA',
        p.legalitas_akta_notaris || cur.legalitas_akta_notaris || 'Akta Pendirian No. 14 Tgl 12-04-2018 jo. Akta Perubahan No. 05 Tgl 08-01-2024 Notaris Siti Farida, S.H., M.Kn., Ngawi (AHU-0019284.AH.01.01.Tahun 2018)',
        p.legalitas_nib || cur.legalitas_nib || 'NIB: 9120301182451 (KBLI 46511 - Perdagangan Besar Komputer dan Perlengkapan Komputer)',
        p.legalitas_status_fiskal || cur.legalitas_status_fiskal || 'Valid / Bebas Tunggakan Pajak (KSWP Valid & SKF KPP Pratama Ngawi No. SKF-10293/WPJ.12/KP.0803/2026)',
        p.legalitas_status_spt || cur.legalitas_status_spt || 'SPT Tahunan PPh Badan Tahun 2025 Terlapor (BPS: 352101-2026-00384) & PPh Masa 3 Bulan Terakhir Nihil/Lunas',
        p.kesepakatan_tgl_ttd_kontrak || cur.kesepakatan_tgl_ttd_kontrak || '2026-05-27',
        p.kesepakatan_jadwal_pelaksanaan || cur.kesepakatan_jadwal_pelaksanaan || '14 (empat belas) Hari Kalender (27 Mei 2026 s.d. 09 Juni 2026)',
        p.catatan_pam || cur.catatan_pam || null,
        p.no_kontrak || cur.no_kontrak || null,
        p.tgl_kontrak || cur.tgl_kontrak || '2026-05-27',
        p.tempat_ttd_kontrak || cur.tempat_ttd_kontrak || 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi',
        p.jenis_meterai || cur.jenis_meterai || 'e-Meterai Resmi Peruri (Rp 10.000)',
        p.ketentuan_denda || cur.ketentuan_denda || '1/1000 (satu permil) per hari keterlambatan dari Nilai Kontrak sebelum PPN',
        p.catatan_kontrak || cur.catatan_kontrak || null,
        p.no_spp || cur.no_spp || null,
        p.tgl_spp || cur.tgl_spp || '2026-05-27',
        p.no_ba_spl || cur.no_ba_spl || null,
        p.tgl_ba_spl || cur.tgl_ba_spl || '2026-05-27',
        p.kondisi_ruang_server || cur.kondisi_ruang_server || 'Ruang Server KPU Kab. Ngawi Siap 100% (Listrik 220V Terproteksi UPS, Grounding 1.8 Ohm, AC 20°C)',
        p.pic_teknisi_rekanan || cur.pic_teknisi_rekanan || 'Ahmad Fauzi (Lead Systems Engineer)',
        p.kontak_teknisi_rekanan || cur.kontak_teknisi_rekanan || '0812-3456-7890',
        p.catatan_spp || cur.catatan_spp || null,
        p.parameter_kesiapan_lokasi_json !== undefined ? (typeof p.parameter_kesiapan_lokasi_json === 'string' ? p.parameter_kesiapan_lokasi_json : JSON.stringify(p.parameter_kesiapan_lokasi_json)) : cur.parameter_kesiapan_lokasi_json || null,
        p.ketentuan_pasca_pengiriman_json !== undefined ? (typeof p.ketentuan_pasca_pengiriman_json === 'string' ? p.ketentuan_pasca_pengiriman_json : JSON.stringify(p.ketentuan_pasca_pengiriman_json)) : cur.ketentuan_pasca_pengiriman_json || null,
        p.no_laporan_pengendalian || cur.no_laporan_pengendalian || null,
        p.tgl_laporan_pengendalian || cur.tgl_laporan_pengendalian || '2026-06-09',
        p.no_ba_komisioning || cur.no_ba_komisioning || null,
        p.tgl_ba_komisioning || cur.tgl_ba_komisioning || '2026-06-09',
        Number(p.realisasi_fisik_persen ?? cur.realisasi_fisik_persen ?? 100),
        Number(p.rencana_fisik_persen ?? cur.rencana_fisik_persen ?? 100),
        Number(p.deviasi_fisik_persen ?? cur.deviasi_fisik_persen ?? 0),
        p.status_scm || cur.status_scm || 'Normal / Sesuai Jadwal Kontrak (On-Track)',
        p.catatan_pengendalian_ppk || cur.catatan_pengendalian_ppk || null,
        p.parameter_komisioning_json !== undefined ? (typeof p.parameter_komisioning_json === 'string' ? p.parameter_komisioning_json : JSON.stringify(p.parameter_komisioning_json)) : cur.parameter_komisioning_json || null,
        p.milestone_pengendalian_json !== undefined ? (typeof p.milestone_pengendalian_json === 'string' ? p.milestone_pengendalian_json : JSON.stringify(p.milestone_pengendalian_json)) : cur.milestone_pengendalian_json || null,
        p.no_baphp || cur.no_baphp || null,
        p.tgl_baphp || cur.tgl_baphp || '2026-06-09',
        p.nama_tim_pemeriksa || cur.nama_tim_pemeriksa || 'Tim Teknis / Pejabat Pemeriksa Pengadaan KPU Ngawi',
        p.nip_tim_pemeriksa || cur.nip_tim_pemeriksa || '198503152010121002',
        p.kesimpulan_pemeriksaan_baphp || cur.kesimpulan_pemeriksaan_baphp || 'Diterima Penuh / Lulus 100% Memenuhi Spesifikasi Teknis & Volume',
        p.parameter_pemeriksaan_baphp_json !== undefined ? (typeof p.parameter_pemeriksaan_baphp_json === 'string' ? p.parameter_pemeriksaan_baphp_json : JSON.stringify(p.parameter_pemeriksaan_baphp_json)) : cur.parameter_pemeriksaan_baphp_json || null,
        p.no_bast || cur.no_bast || null,
        p.tgl_bast || cur.tgl_bast || '2026-06-09',
        p.tempat_bast || cur.tempat_bast || 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi',
        p.catatan_bast || cur.catatan_bast || null,
        p.status_denda || cur.status_denda || 'Nihil Denda (Pekerjaan Selesai 100% Tepat Waktu)',
        Number(p.denda_keterlambatan_rp ?? cur.denda_keterlambatan_rp ?? 0),
        Number(p.masa_garansi_hari ?? cur.masa_garansi_hari ?? 365),
        p.tgl_mulai_garansi || cur.tgl_mulai_garansi || '2026-06-09',
        p.tgl_selesai_garansi || cur.tgl_selesai_garansi || '2027-06-09',
        p.penyedia_id !== undefined ? (p.penyedia_id ? Number(p.penyedia_id) : null) : (cur.penyedia_id ? Number(cur.penyedia_id) : null), Number(p.ppk_id || cur.ppk_id || 2), Number(p.pejabat_pengadaan_id || cur.pejabat_pengadaan_id || 3), Number(p.kpa_id || cur.kpa_id || 1), Number(p.bendahara_id || cur.bendahara_id || 4), null,
        cleanTahapAktif, cleanStatusPaket,
        sKualitas, sBiaya, sWaktu, sLayanan, nilaiKinerja, predikat, p.catatan_khusus_ppk || cur.catatan_khusus_ppk || '',
        p.no_skkp || cur.no_skkp || '018/SKKP/PBJ-2026-001/PPK/VI/2026',
        p.tgl_skkp || cur.tgl_skkp || '2026-06-12',
        p.catatan_kualitas || cur.catatan_kualitas || '',
        p.catatan_biaya || cur.catatan_biaya || '',
        p.catatan_waktu || cur.catatan_waktu || '',
        p.catatan_layanan || cur.catatan_layanan || '',
        p.rekomendasi_repeat_order || cur.rekomendasi_repeat_order || (nilaiKinerja >= 2.50 ? 'MEMENUHI SYARAT REPEAT ORDER (RO)' : 'BELUM MEMENUHI SYARAT REPEAT ORDER'),
        data.id
      ]
    );

    if (data.stageUpdate && data.stageUpdate.no_tahap) {
      const su = data.stageUpdate;
      const stageNo = Number(su.no_tahap);
      let finalStatus = su.status_tahap || 'Draft';
      let driveLink = String(su.link_drive_dokumen || '').trim();

      // Dapatkan data tahap saat ini untuk melindungi tautan drive dan nomor dokumen yang sudah tersimpan
      const [existingStageRows] = await pool.query(
        'SELECT * FROM pbj_paket_tahap WHERE paket_id = ? AND no_tahap = ?',
        [data.id, stageNo]
      );
      const existingStage = existingStageRows[0] || {};

      // Jika link yang dikirim kosong, tapi di DB sudah pernah ada, jangan hapus yang ada di DB!
      if (!driveLink && existingStage.link_drive_dokumen) {
        driveLink = existingStage.link_drive_dokumen;
      }

      // HARD GATE: Status 'Selesai' HANYA SAH jika link drive dokumen terisi!
      if (finalStatus === 'Selesai' && (!driveLink || driveLink.length < 5)) {
        finalStatus = 'Draft';
      }

      await pool.query(
        `INSERT INTO pbj_paket_tahap (paket_id, no_tahap, fase, nama_tahap, nomor_dokumen, tanggal_dokumen, status_tahap, link_drive_dokumen, catatan_tahap, no_reviu_dpp, no_ba_nego, no_bahp, no_ba_reviu_ppk, no_sppbj, no_ba_pam, no_undangan_pam, no_kontrak, no_spp, no_ba_spl, no_laporan_pengendalian, no_ba_komisioning, no_baphp, no_bast, no_permohonan, tgl_permohonan, no_kuitansi, tgl_kuitansi, no_bap, tgl_bap, no_spp_ls, no_bast_kpa)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nomor_dokumen = VALUES(nomor_dokumen),
           tanggal_dokumen = VALUES(tanggal_dokumen),
           status_tahap = VALUES(status_tahap),
           link_drive_dokumen = VALUES(link_drive_dokumen),
           catatan_tahap = VALUES(catatan_tahap),
           no_reviu_dpp = VALUES(no_reviu_dpp),
           no_ba_nego = VALUES(no_ba_nego),
           no_bahp = VALUES(no_bahp),
           no_ba_reviu_ppk = VALUES(no_ba_reviu_ppk),
           no_sppbj = VALUES(no_sppbj),
           no_ba_pam = VALUES(no_ba_pam),
           no_undangan_pam = VALUES(no_undangan_pam),
           no_kontrak = VALUES(no_kontrak),
           no_spp = VALUES(no_spp),
           no_ba_spl = VALUES(no_ba_spl),
           no_laporan_pengendalian = VALUES(no_laporan_pengendalian),
           no_ba_komisioning = VALUES(no_ba_komisioning),
           no_baphp = VALUES(no_baphp),
           no_bast = VALUES(no_bast),
           no_permohonan = VALUES(no_permohonan),
           tgl_permohonan = VALUES(tgl_permohonan),
           no_kuitansi = VALUES(no_kuitansi),
           tgl_kuitansi = VALUES(tgl_kuitansi),
           no_bap = VALUES(no_bap),
           tgl_bap = VALUES(tgl_bap),
           no_spp_ls = VALUES(no_spp_ls),
           no_bast_kpa = VALUES(no_bast_kpa)`,
        [
          data.id, stageNo, Number(su.fase || 1), su.nama_tahap || existingStage.nama_tahap || '',
          su.nomor_dokumen || existingStage.nomor_dokumen || '',
          su.tanggal_dokumen || existingStage.tanggal_dokumen || '',
          finalStatus,
          driveLink,
          su.catatan_tahap || existingStage.catatan_tahap || '',
          su.no_reviu_dpp || existingStage.no_reviu_dpp || null,
          su.no_ba_nego || existingStage.no_ba_nego || null,
          su.no_bahp || existingStage.no_bahp || null,
          su.no_ba_reviu_ppk || existingStage.no_ba_reviu_ppk || null,
          su.no_sppbj || existingStage.no_sppbj || p.no_sppbj || null,
          su.no_ba_pam || existingStage.no_ba_pam || p.no_ba_pam || null,
          su.no_undangan_pam || existingStage.no_undangan_pam || p.no_undangan_pam || null,
          su.no_kontrak || existingStage.no_kontrak || p.no_kontrak || null,
          su.no_spp || existingStage.no_spp || p.no_spp || null,
          su.no_ba_spl || existingStage.no_ba_spl || p.no_ba_spl || null,
          su.no_laporan_pengendalian || existingStage.no_laporan_pengendalian || p.no_laporan_pengendalian || null,
          su.no_ba_komisioning || existingStage.no_ba_komisioning || p.no_ba_komisioning || null,
          su.no_baphp || existingStage.no_baphp || p.no_baphp || null,
          su.no_bast || existingStage.no_bast || p.no_bast || null,
          su.no_permohonan || existingStage.no_permohonan || null,
          su.tgl_permohonan || existingStage.tgl_permohonan || null,
          su.no_kuitansi || existingStage.no_kuitansi || null,
          su.tgl_kuitansi || existingStage.tgl_kuitansi || null,
          su.no_bap || existingStage.no_bap || p.no_bap || null,
          su.tgl_bap || existingStage.tgl_bap || p.tgl_bap || null,
          su.no_spp_ls || existingStage.no_spp_ls || p.no_spp_ls || null,
          su.no_bast_kpa || existingStage.no_bast_kpa || p.no_bast_kpa || null
        ]
      );

      // JIKA STATUS SELESAI: OTOMATIS BUKA TAHAP BERIKUTNYA & SINKRONKAN TAHAP AKTIF SERTA STATUS PAKET
      if (finalStatus === 'Selesai' && stageNo < 18) {
        const nextStageNo = stageNo + 1;
        // Buka tahap berikutnya dari 'Terkunci' menjadi 'Draft'
        await pool.query(
          `UPDATE pbj_paket_tahap SET status_tahap = 'Draft'
           WHERE paket_id = ? AND no_tahap = ? AND status_tahap = 'Terkunci'`,
          [data.id, nextStageNo]
        );
        const updatedTahapAktif = Math.max(cleanTahapAktif, nextStageNo);
        const updatedStatusPaket = determineStatusPaketByStage(updatedTahapAktif);
        await pool.query(
          `UPDATE pbj_paket SET tahap_aktif = ?, status_paket = ? WHERE id = ?`,
          [updatedTahapAktif, updatedStatusPaket, data.id]
        );
      } else if (finalStatus === 'Selesai' && stageNo === 18) {
        await pool.query(
          `UPDATE pbj_paket SET tahap_aktif = 18, status_paket = 'Selesai (18/18 Tahap)' WHERE id = ?`,
          [data.id]
        );
      }
      // Sinkronkan item rincian dengan harga penawaran & kontrak negosiasi pada Tahap 9
      if (stageNo === 9 && Number(p.nilai_kontrak) > 0) {
        const [curItems] = await pool.query('SELECT * FROM pbj_paket_item WHERE paket_id = ? ORDER BY urutan ASC, id ASC', [data.id]);
        if (curItems && curItems.length > 0) {
          const totHps = Number(p.nilai_hps || p.nilai_pagu || 0);
          const totPen = Number(p.nilai_penawaran_awal || totHps);
          const totNego = Number(p.nilai_kontrak || totPen);
          const prorated = cleanProrateItemPrices(curItems, totHps, totPen, totNego);
          for (const it of prorated) {
            await pool.query(
              'UPDATE pbj_paket_item SET harga_satuan_penawaran = ?, harga_satuan_kontrak = ?, jumlah_kontrak = ? WHERE id = ?',
              [it.harga_satuan_penawaran, it.harga_satuan_kontrak, it.jumlah_kontrak, it.id]
            );
          }
        }
      }
    }

    if (Array.isArray(data.items) && data.items.length > 0) {
      await savePaketItems(data.id, data.items);
    }

    return data.id;
  } else {
    const [cntRows] = await pool.query('SELECT COUNT(*) AS cnt FROM pbj_paket');
    const nextNum = (cntRows[0]?.cnt || 0) + 1;
    const kodeInternal = data.kode_paket_internal || `PBJ-2026-${String(nextNum).padStart(3, '0')}`;
    const kodeRup = data.kode_rup || `RUP-2026-657811-${String(nextNum).padStart(2, '0')}`;

    const [res] = await pool.query(
      `INSERT INTO pbj_paket (
        kode_paket_internal, kode_rup, nama_paket, uraian_pekerjaan, lokasi_pekerjaan,
        sumber_dana, tahun_anggaran, kode_akun_mak, nama_akun_mak, komponen_ro, pic_subbag,
        no_nota_dinas_pengusul, tgl_nota_dinas_pengusul, perihal_nota_dinas, no_disposisi_kpa, tgl_disposisi_kpa,
        is_multi_subbag, multi_pengusul_json,
        bmn_status_ketersediaan, bmn_jumlah_eksisting, bmn_kondisi_eksisting, bmn_sifat_kebutuhan, bmn_kesesuaian_rkbmn, bmn_catatan_telaah,
        siprabu_rab_id,
        jenis_pengadaan, cara_pengadaan, metode_pemilihan, sub_metode_epurchasing, fitur_spse, pelaksana_pemilihan,
        nilai_pagu, jenis_kertas_harga, nilai_hps, nilai_penawaran_awal, nilai_kontrak,
        tarif_ppn, termasuk_ppn, jenis_pph, tarif_pph,
        prioritas_pdn_level, persen_tkdn_target, persen_bmp_target, peruntukan_umk,
        tersedia_di_katalog, alasan_penilaian_ppk_katalog,
        jenis_kontrak, bentuk_kontrak, masa_pelaksanaan_hari, tgl_mulai_kerja, tgl_selesai_kontrak, tgl_realisasi_selesai,
        penyedia_id, ppk_id, pejabat_pengadaan_id, kpa_id, bendahara_id, tim_teknis_id,
        tahap_aktif, status_paket, nilai_kinerja_akhir, predikat_kinerja, catatan_khusus_ppk
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        kodeInternal, kodeRup, data.nama_paket || 'Paket Pengadaan Baru KPU Kabupaten Ngawi',
        data.uraian_pekerjaan || data.nama_paket || '', 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi',
        data.sumber_dana || 'APBN DIPA', data.tahun_anggaran || '2026', data.kode_akun_mak || '521211', data.nama_akun_mak || 'Belanja Bahan',
        data.komponen_ro || '6639.BDB.001.051.A', data.pic_subbag || 'KUL',
        data.no_nota_dinas_pengusul || '', data.tgl_nota_dinas_pengusul || '', data.perihal_nota_dinas || '', data.no_disposisi_kpa || '', data.tgl_disposisi_kpa || '',
        Number(data.is_multi_subbag || 0), typeof data.multi_pengusul_json === 'object' ? JSON.stringify(data.multi_pengusul_json) : (data.multi_pengusul_json || null),
        data.bmn_status_ketersediaan || 'TERSEDIA_RUSAK_BERAT', Number(data.bmn_jumlah_eksisting || 0), data.bmn_kondisi_eksisting || '', data.bmn_sifat_kebutuhan || 'PENGGANTIAN', data.bmn_kesesuaian_rkbmn || '', data.bmn_catatan_telaah || '',
        data.siprabu_rab_id || null,
        data.jenis_pengadaan || 'Barang', data.cara_pengadaan || 'Penyedia', data.metode_pemilihan || 'E-Purchasing',
        data.sub_metode_epurchasing || 'Negosiasi Harga', rekomendasi.fiturSpse, rekomendasi.pelaksana,
        Number(data.nilai_pagu || 0), rekomendasi.jenisKertasHarga,
        Number(data.nilai_hps || 0), Number(data.nilai_penawaran_awal || 0), Number(data.nilai_kontrak || 0),
        Number(data.tarif_ppn ?? 11), 1, data.jenis_pph || 'PPh 22 (1.5%)', Number(data.tarif_pph ?? 1.5),
        'Level 1: TKDN >= 25% (TKDN+BMP >= 40%)', 40, 15, 1,
        'Ya, Tersedia & Sesuai', 'Sesuai analisa pasar dan ketersediaan Katalog Elektronik v6.',
        data.jenis_kontrak || 'Lumsum', rekomendasi.bentukKontrak, Number(data.masa_pelaksanaan_hari || 14),
        '2026-05-18', '2026-05-31', '2026-05-30',
        data.penyedia_id ? Number(data.penyedia_id) : null, 2, 3, 1, 4, null,
        1, 'Perencanaan', 3.00, 'Sangat Baik', data.catatan_khusus_ppk || ''
      ]
    );

    const newId = res.insertId;
    const volAwal = Number(data.volume_awal || 1);
    const hargaAwal = Number(data.harga_satuan_awal || data.nilai_pagu || 0);
    await pool.query(
      `INSERT INTO pbj_paket_item (
        paket_id, urutan, kategori_item, uraian_item, spesifikasi_teknis, satuan, volume,
        harga_survei_1, harga_survei_2, harga_survei_3, harga_satuan_hps, jumlah_hps,
        harga_satuan_penawaran, harga_satuan_kontrak, jumlah_kontrak
      ) VALUES (?, 1, 'Utama', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId, data.nama_paket, data.spesifikasi_awal || 'Sesuai KAK dan Spesifikasi Teknis PPK KPU Kabupaten Ngawi',
        data.satuan_awal || 'Paket', volAwal,
        hargaAwal, Math.round(hargaAwal * 1.04), Math.round(hargaAwal * 1.02),
        0, 0,
        0, 0, 0
      ]
    );

    const [newPaketRows] = await pool.query('SELECT * FROM pbj_paket WHERE id = ?', [newId]);
    const jadwal = susunJadwal18TahapOtomatis(newPaketRows[0], '2026-05-04');
    for (const j of jadwal) {
      await pool.query(
        `INSERT INTO pbj_paket_tahap (paket_id, no_tahap, fase, nama_tahap, nomor_dokumen, tanggal_dokumen, status_tahap, catatan_tahap)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, j.no_tahap, j.fase, j.nama_tahap, j.nomor_dokumen, j.tanggal_dokumen, j.status_tahap, j.catatan_tahap]
      );
    }

    return newId;
  }
}

async function deletePaket(paketId) {
  const pool = getCakraPool();
  await pool.query('DELETE FROM pbj_paket_item WHERE paket_id = ?', [paketId]);
  await pool.query('DELETE FROM pbj_paket_tahap WHERE paket_id = ?', [paketId]);
  await pool.query('DELETE FROM pbj_paket WHERE id = ?', [paketId]);
}

async function savePaketItems(paketId, items) {
  const pool = getCakraPool();
  await pool.query('DELETE FROM pbj_paket_item WHERE paket_id = ?', [paketId]);

  let idx = 1;
  for (const it of (items || [])) {
    const vol = Number(it.volume) || 1;
    const s1 = Number(it.harga_survei_1) || 0;
    const s2 = Number(it.harga_survei_2) || s1;
    const s3 = Number(it.harga_survei_3) || s1;

    let hpsSatuan = Number(it.harga_satuan_hps) || 0;
    const candidates = [s1, s2, s3].filter(v => v > 0);
    if (it.metode_penentuan_hps === 'Terendah' && candidates.length > 0) {
      hpsSatuan = Math.min(...candidates);
    } else if (it.metode_penentuan_hps === 'Rata-rata' && candidates.length > 0) {
      hpsSatuan = Math.round(candidates.reduce((a, b) => a + b, 0) / candidates.length);
    } else if (it.metode_penentuan_hps === 'Sumber 1 (Katalog)' && s1 > 0) {
      hpsSatuan = s1;
    } else if (it.metode_penentuan_hps === 'Sumber 2 (Toko/Pasar)' && s2 > 0) {
      hpsSatuan = s2;
    } else if (it.metode_penentuan_hps === 'Sumber 3 (SBM/Riwayat)' && s3 > 0) {
      hpsSatuan = s3;
    } else if (!hpsSatuan) {
      hpsSatuan = candidates.length > 0 ? Math.min(...candidates) : s1;
    }

    const penawaranSatuan = Number(it.harga_satuan_penawaran) || hpsSatuan;
    const kontrakSatuan = Number(it.harga_satuan_kontrak) || penawaranSatuan;

    await pool.query(
      `INSERT INTO pbj_paket_item (
        paket_id, urutan, kategori_item, uraian_item, spesifikasi_teknis, satuan, volume,
        status_pdn, persen_tkdn, persen_bmp, merk_tipe_katalog,
        harga_survei_1, sumber_survei_1, harga_survei_2, sumber_survei_2, harga_survei_3, sumber_survei_3,
        metode_penentuan_hps, harga_satuan_hps, jumlah_hps,
        harga_satuan_penawaran, harga_satuan_kontrak, jumlah_kontrak,
        kode_barang_bmn, jenis_pencatatan_sakti, evaluasi_pasar_json, pic_subbag_pengguna
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paketId, idx++, it.kategori_item || 'Utama', it.uraian_item || 'Item Barang/Jasa',
        it.spesifikasi_teknis || '', it.satuan || 'Paket', vol,
        it.status_pdn || 'PDN Bersertifikat TKDN', Number(it.persen_tkdn ?? 45), Number(it.persen_bmp ?? 15), it.merk_tipe_katalog || '',
        s1, it.sumber_survei_1 || 'Katalog Elektronik v6',
        s2, it.sumber_survei_2 || 'Survei Pasar Lokal',
        s3, it.sumber_survei_3 || 'Standar Biaya / Kontrak Lalu',
        it.metode_penentuan_hps || 'Terendah', hpsSatuan, Math.round(vol * hpsSatuan),
        penawaranSatuan, kontrakSatuan, Math.round(vol * kontrakSatuan),
        it.kode_barang_bmn || '1.01.03.01.001', it.jenis_pencatatan_sakti || 'Persediaan',
        typeof it.evaluasi_pasar_json === 'object' ? JSON.stringify(it.evaluasi_pasar_json) : (it.evaluasi_pasar_json || null),
        it.pic_subbag_pengguna || 'KUL'
      ]
    );
  }

  await recalculatePaketTotals(paketId);
}

async function savePaketTahaps(paketId, tahaps) {
  const pool = getCakraPool();
  for (const t of (tahaps || [])) {
    await pool.query(
      `INSERT INTO pbj_paket_tahap (paket_id, no_tahap, fase, nama_tahap, nomor_dokumen, tanggal_dokumen, status_tahap, link_drive_dokumen, catatan_tahap)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         nama_tahap = VALUES(nama_tahap),
         nomor_dokumen = VALUES(nomor_dokumen),
         tanggal_dokumen = VALUES(tanggal_dokumen),
         status_tahap = VALUES(status_tahap),
         link_drive_dokumen = VALUES(link_drive_dokumen),
         catatan_tahap = VALUES(catatan_tahap)`,
      [
        paketId, Number(t.no_tahap), Number(t.fase || 1), t.nama_tahap || '',
        t.nomor_dokumen || '', t.tanggal_dokumen || '', t.status_tahap || 'Selesai',
        t.link_drive_dokumen || '', t.catatan_tahap || ''
      ]
    );
  }
}

async function autoGeneratePaketTahaps(paketId, tanggalMulai = '2026-05-04') {
  const pool = getCakraPool();
  const [pakets] = await pool.query('SELECT * FROM pbj_paket WHERE id = ?', [paketId]);
  if (!pakets.length) return [];
  const jadwal = susunJadwal18TahapOtomatis(pakets[0], tanggalMulai);
  await savePaketTahaps(paketId, jadwal);
  return jadwal;
}

/**
 * Tarik langsung mata anggaran RUH Belanja RKB dari tabel `rab_baris` di database yang sama (`siprabu_db`)
 * WAJIB bersumber dari Dokumen Terkunci Paling Baru (`is_locked = 1`) sesuai kesepakatan arsitektur.
 */
async function fetchRkbItemsFromSiprabu() {
  try {
    const pool = getCakraPool();

    // 1. Ambil Periode Terkunci Terakhir (is_locked = 1)
    const [lockedPeriodes] = await pool.query(`
      SELECT id, nama_periode, versi_revisi, revisi_ke
      FROM periode_anggaran
      WHERE is_locked = 1
      ORDER BY revisi_ke DESC, id DESC
      LIMIT 1
    `);
    const lockedPeriode = (lockedPeriodes && lockedPeriodes[0]) ? lockedPeriodes[0] : { id: 1, nama_periode: 'RKB Definitif Sah', versi_revisi: 'Baseline Kunci' };

    // 2. Muat Master Akun BAS untuk mapping nama resmi
    const [masterAkunRows] = await pool.query('SELECT kode, uraian FROM master_akun');
    const akunMap = {};
    (masterAkunRows || []).forEach(a => { akunMap[a.kode] = a.uraian; });

    // 3. Ambil seluruh baris RKB (header & item) untuk melacak silsilah berjenjang
    const [allRows] = await pool.query(`
      SELECT id, periode_id, urutan, row_type, kode, uraian, level_indent, kode_akun,
             f1_val, f2_val, f3_val, f4_val, satuan_vol, harga_satuan, pic_bagian
      FROM rab_baris
      WHERE periode_id = ?
      ORDER BY urutan ASC
    `, [lockedPeriode.id]);

    let currentProgram = 'Program Dukungan Manajemen dan Pelaksanaan Tugas Teknis KPU';
    let currentKegiatan = 'Tahapan Perencanaan dan Persiapan Pemilu';
    let currentKomponen = 'Rincian Kebutuhan Operasional Barang dan Jasa';

    const items = [];

    for (const r of allRows) {
      if (r.row_type === 'header') {
        if (r.level_indent === 0) {
          currentProgram = String(r.uraian || '').replace(/^[\d.)\s-]+/, '').trim() || currentProgram;
        } else if (r.level_indent === 1) {
          currentKegiatan = String(r.uraian || '').replace(/^[\d.)\s-]+/, '').trim() || currentKegiatan;
        } else if (r.level_indent === 2 || r.level_indent === 21) {
          currentKomponen = String(r.uraian || '').replace(/^[\d.)\s-]+/, '').trim() || currentKomponen;
        }
      } else if (r.row_type === 'item' && Number(r.harga_satuan) > 0) {
        const f1 = Number(r.f1_val) || 1;
        const f2 = Number(r.f2_val) || 1;
        const f3 = Number(r.f3_val) || 1;
        const f4 = Number(r.f4_val) || 1;
        const totalVol = f1 * f2 * f3 * f4;
        const paguTotal = Math.round(totalVol * (Number(r.harga_satuan) || 0));
        const kAkun = r.kode_akun || '521211';
        const namaBas = akunMap[kAkun] || 'Belanja Bahan';

        let bmnKategori = 'TIDAK_BERLAKU';
        if (kAkun.startsWith('53')) {
          bmnKategori = 'MODAL';
        } else if (kAkun === '521111' || kAkun === '521219' || kAkun.startsWith('523')) {
          bmnKategori = 'EKSTRAKOMPTABEL';
        }

        items.push({
          siprabu_rab_id: r.id,
          periode_id: r.periode_id,
          nama_dokumen_sumber: `${lockedPeriode.nama_periode} (${lockedPeriode.versi_revisi})`,
          program: currentProgram,
          kegiatan: currentKegiatan,
          subkegiatan: currentKomponen,
          kode_akun: kAkun,
          nama_akun_mak: namaBas,
          uraian_bersih: String(r.uraian || '').replace(/^[-.\d)\s]+/, '').trim(),
          volume: totalVol,
          satuan: r.satuan_vol || 'Paket',
          harga_satuan: Number(r.harga_satuan) || 0,
          pagu_total: paguTotal,
          pic_subbag: r.pic_bagian || 'KUL',
          bmn_kategori_telaah: bmnKategori
        });
      }
    }

    return items;
  } catch (e) {
    console.error('fetchRkbItemsFromSiprabu error:', e.message);
    return [];
  }
}

module.exports = {
  getCakraPool,
  initDatabaseSchemaAndSeed,
  ensurePaketMissingColumns,
  getSettingsMap,
  saveSettingsMap,
  getPejabatList,
  savePejabat,
  getPenyediaList,
  savePenyedia,
  getKbliList,
  saveKbli,
  deleteKbli,
  getPaketList,
  getPaketFullById,
  savePaket,
  determineStatusPaketByStage,
  deletePaket,
  savePaketItems,
  savePaketTahaps,
  autoGeneratePaketTahaps,
  fetchRkbItemsFromSiprabu
};
