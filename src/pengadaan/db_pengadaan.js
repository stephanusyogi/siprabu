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
  susunJadwal18TahapOtomatis
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
  try {
    await pool.query("ALTER TABLE pbj_paket_tahap ADD COLUMN link_drive_dokumen TEXT DEFAULT NULL");
  } catch (e) {
    // Abaikan jika kolom link_drive_dokumen sudah ada
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
    "ALTER TABLE pbj_paket_item ADD COLUMN kode_barang_bmn VARCHAR(128) DEFAULT '1.01.03.01.001 (Persediaan / BMN)'",
    "ALTER TABLE pbj_paket_item ADD COLUMN jenis_pencatatan_sakti VARCHAR(64) DEFAULT 'Persediaan'",
    "ALTER TABLE pbj_paket_item ADD COLUMN evaluasi_pasar_json TEXT DEFAULT NULL",
    "ALTER TABLE pbj_paket_item ADD COLUMN pic_subbag_pengguna VARCHAR(64) DEFAULT 'KUL'"
  ];

  for (const sql of ddlStatements) {
    try {
      await pool.query(sql);
    } catch (e) {
      // Abaikan jika kolom sudah ada
    }
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
        jenis_kontrak=?, bentuk_kontrak=?, masa_pelaksanaan_hari=?, tgl_mulai_kerja=?, tgl_selesai_kontrak=?, tgl_realisasi_selesai=?, hari_terlambat=?,
        persen_uang_muka=?, nilai_uang_muka=?, wajib_jaminan_pelaksanaan=?, nilai_jaminan_pelaksanaan=?,
        penyedia_id=?, ppk_id=?, pejabat_pengadaan_id=?, kpa_id=?, bendahara_id=?, tim_teknis_id=?,
        tahap_aktif=?, status_paket=?, skor_kualitas=?, skor_biaya=?, skor_waktu=?, skor_layanan=?,
        nilai_kinerja_akhir=?, predikat_kinerja=?, catatan_khusus_ppk=?
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
        p.jenis_kontrak || cur.jenis_kontrak || 'Lumsum', p.bentuk_kontrak || cur.bentuk_kontrak || rekomendasi.bentukKontrak, Number(p.masa_pelaksanaan_hari ?? cur.masa_pelaksanaan_hari ?? 14),
        p.tgl_mulai_kerja || cur.tgl_mulai_kerja || '2026-05-18', p.tgl_selesai_kontrak || cur.tgl_selesai_kontrak || '2026-05-31', p.tgl_realisasi_selesai || cur.tgl_realisasi_selesai || '2026-05-30', Number(p.hari_terlambat ?? cur.hari_terlambat ?? 0),
        Number(p.persen_uang_muka ?? cur.persen_uang_muka ?? 0), Math.round((Number(p.nilai_kontrak ?? cur.nilai_kontrak ?? 0) * Number(p.persen_uang_muka ?? cur.persen_uang_muka ?? 0)) / 100),
        Number(p.wajib_jaminan_pelaksanaan ?? cur.wajib_jaminan_pelaksanaan ?? rekomendasi.wajibJaminan), Math.round(Number(p.nilai_kontrak ?? cur.nilai_kontrak ?? 0) * 0.05),
        p.penyedia_id !== undefined ? (p.penyedia_id ? Number(p.penyedia_id) : null) : (cur.penyedia_id ? Number(cur.penyedia_id) : null), Number(p.ppk_id || cur.ppk_id || 2), Number(p.pejabat_pengadaan_id || cur.pejabat_pengadaan_id || 3), Number(p.kpa_id || cur.kpa_id || 1), Number(p.bendahara_id || cur.bendahara_id || 4), null,
        cleanTahapAktif, cleanStatusPaket,
        sKualitas, sBiaya, sWaktu, sLayanan, nilaiKinerja, predikat, p.catatan_khusus_ppk || cur.catatan_khusus_ppk || '',
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
        `INSERT INTO pbj_paket_tahap (paket_id, no_tahap, fase, nama_tahap, nomor_dokumen, tanggal_dokumen, status_tahap, link_drive_dokumen, catatan_tahap)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           nomor_dokumen = VALUES(nomor_dokumen),
           tanggal_dokumen = VALUES(tanggal_dokumen),
           status_tahap = VALUES(status_tahap),
           link_drive_dokumen = VALUES(link_drive_dokumen),
           catatan_tahap = VALUES(catatan_tahap)`,
        [
          data.id, stageNo, Number(su.fase || 1), su.nama_tahap || existingStage.nama_tahap || '',
          su.nomor_dokumen || existingStage.nomor_dokumen || '',
          su.tanggal_dokumen || existingStage.tanggal_dokumen || '',
          finalStatus,
          driveLink,
          su.catatan_tahap || existingStage.catatan_tahap || ''
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
