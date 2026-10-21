/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Database SQLite Terpadu (DatabaseSync built-in Node.js v22+)
 * Pengembang: emenje
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.resolve(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite');
const db = new DatabaseSync(DB_PATH);

// Helper safe add column
function safeAddColumn(table, colDef) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${colDef};`);
  } catch (e) {
    // Column already exists
  }
}

// Inisialisasi DB
function initDb() {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  safeAddColumn('periode_anggaran', 'pagu_nphd REAL DEFAULT 0');
  safeAddColumn('periode_anggaran', 'created_at TEXT DEFAULT CURRENT_TIMESTAMP');
  safeAddColumn('periode_anggaran', 'updated_at TEXT DEFAULT CURRENT_TIMESTAMP');

  // 1. Tabel Download Requests (Sistem Antrean Unduh SAKTI Kemenkeu)
  db.exec(`
    CREATE TABLE IF NOT EXISTS download_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id TEXT UNIQUE,
      nama_file TEXT NOT NULL,
      tipe_unduhan TEXT NOT NULL,
      periode_id INTEGER,
      filter_pic TEXT,
      filter_sasaran TEXT,
      request_time TEXT,
      status TEXT DEFAULT 'DIPROSES',
      file_path TEXT,
      file_size INTEGER DEFAULT 0,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      expires_at TEXT,
      downloaded_at TEXT
    );
  `);

  // 2. Tabel Master Paslon (Basis Data Primer Pasangan Calon Pilkada)
  db.exec(`
    CREATE TABLE IF NOT EXISTS master_paslon (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      no_urut INTEGER NOT NULL,
      nama_calon_bupati TEXT NOT NULL,
      nama_calon_wakil_bupati TEXT NOT NULL,
      partai_pengusung TEXT,
      slogan TEXT,
      keterangan TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default 5 paslon jika kurang dari 5 (4 Parpol + 1 Perseorangan sesuai angka RKB 5 Bakal Calon)
  try {
    const cPaslon = db.prepare('SELECT COUNT(*) as cnt FROM master_paslon').get()?.cnt || 0;
    const insPaslon = db.prepare(`
      INSERT INTO master_paslon (no_urut, nama_calon_bupati, nama_calon_wakil_bupati, partai_pengusung, slogan, keterangan)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    if (cPaslon === 0) {
      insPaslon.run(1, 'H. ONY ANWAR HARSONO, S.T., M.H.', 'Dr. DWI RIANTO JATMIKO, M.H., M.Si.', 'PDI Perjuangan, Golkar, PKB, Gerindra, PKS, PAN, NasDem, Demokrat, Hanura, Perindo', 'Ngawi Bergerak Bersama Semesta Berkarya', 'Pasangan Calon Petahana (Parpol)');
      insPaslon.run(2, 'PASANGAN CALON NOMOR URUT 2', 'WAKIL BUPATI NOMOR URUT 2', 'Koalisi Parpol Non-Parlemen', 'Maju Bersama Rakyat', 'Kandidat Pilkada Ngawi (Parpol)');
      insPaslon.run(3, 'PASANGAN CALON NOMOR URUT 3', 'WAKIL BUPATI NOMOR URUT 3', 'Koalisi Bersatu Harapan Baru', 'Sejahtera & Bermartabat', 'Kandidat Pilkada Ngawi (Parpol)');
      insPaslon.run(4, 'PASANGAN CALON NOMOR URUT 4', 'WAKIL BUPATI NOMOR URUT 4', 'Koalisi Kerakyatan Mandiri', 'Ngawi Sejahtera Berkeadilan', 'Kandidat Pilkada Ngawi (Parpol)');
      insPaslon.run(5, 'PASANGAN CALON JALUR PERSEORANGAN', 'WAKIL BUPATI JALUR PERSEORANGAN', 'Perseorangan (Independen)', 'Mandiri Mengabdi untuk Rakyat', 'Pasangan Calon Jalur Perseorangan');
    } else if (cPaslon === 3) {
      insPaslon.run(4, 'PASANGAN CALON NOMOR URUT 4', 'WAKIL BUPATI NOMOR URUT 4', 'Koalisi Kerakyatan Mandiri', 'Ngawi Sejahtera Berkeadilan', 'Kandidat Pilkada Ngawi (Parpol)');
      insPaslon.run(5, 'PASANGAN CALON JALUR PERSEORANGAN', 'WAKIL BUPATI JALUR PERSEORANGAN', 'Perseorangan (Independen)', 'Mandiri Mengabdi untuk Rakyat', 'Pasangan Calon Jalur Perseorangan');
    }
  } catch (e) {}

  // 3. Kolom pemilih di master_desa (DPT per desa)
  safeAddColumn('master_desa', 'pemilih INTEGER DEFAULT 0');

  // Seed nilai pemilih di master_desa jika masih 0, proporsional berdasarkan TPS (total DPT: 701.425)
  try {
    const checkPem = db.prepare('SELECT SUM(pemilih) as sumPem FROM master_desa').get()?.sumPem || 0;
    if (checkPem === 0) {
      const desas = db.prepare('SELECT id, tps FROM master_desa ORDER BY id ASC').all();
      let accum = 0;
      const upd = db.prepare('UPDATE master_desa SET pemilih = ? WHERE id = ?');
      desas.forEach((d, idx) => {
        let p = 0;
        if (idx === desas.length - 1) {
          p = 701425 - accum;
        } else {
          p = Math.round((d.tps || 1) * (701425 / 1371));
          accum += p;
        }
        upd.run(p, d.id);
      });
    }
  } catch (e) {}

  // Pastikan user emenje ada
  try {
    const dev = db.prepare("SELECT id FROM satker_users WHERE username = 'emenje'").get();
    if (!dev) {
      db.prepare(`
        INSERT INTO satker_users 
          (username, password, nama_pejabat, jabatan, role_id, level, pic_subbag, is_active)
        VALUES ('emenje', 'emenje123', 'emenje (Pengembang Resmi)', 'Lead Developer & System Architect', 'developer', 0, 'SEMUA', 1)
      `).run();
    }
  } catch (e) {}

  // Sinkronisasi nomenklatur jabatan Kasubbag Hukum (menghilangkan duplikasi SDM dengan PARSDM)
  try {
    db.prepare(`
      UPDATE satker_users 
      SET jabatan = 'Kasubbag Hukum', pic_subbag = 'HUKUM' 
      WHERE username = 'hukum'
    `).run();
  } catch (e) {}

  // Sinkronisasi seluruh user operator satker ke 5 kode PIC resmi Dashboard
  try {
    db.prepare("UPDATE satker_users SET pic_subbag = 'RENDATIN' WHERE LOWER(pic_subbag) IN ('perencanaan', 'rendatin')").run();
    db.prepare("UPDATE satker_users SET pic_subbag = 'TEKNIS' WHERE LOWER(pic_subbag) IN ('teknis')").run();
    db.prepare("UPDATE satker_users SET pic_subbag = 'HUKUM' WHERE LOWER(pic_subbag) IN ('hukum')").run();
    db.prepare("UPDATE satker_users SET pic_subbag = 'PARSDM' WHERE LOWER(pic_subbag) IN ('parmas', 'parsdm')").run();
    db.prepare("UPDATE satker_users SET pic_subbag = 'KUL' WHERE LOWER(pic_subbag) IN ('keuangan', 'kul')").run();
  } catch (e) {}

  // 4. Integrasi Kolom Google Sign-In & Email Resmi pada satker_users
  safeAddColumn('satker_users', 'email TEXT');
  safeAddColumn('satker_users', 'google_id TEXT');
  safeAddColumn('satker_users', 'avatar_url TEXT');

  // Seed default email operator & pejabat satker jika kosong
  try {
    const defaultEmails = {
      emenje: 'noorjihan1184@gmail.com',
      perencanaan: 'rendatin@kpu-ngawi.go.id',
      staf_perencanaan: 'staf_rendatin@kpu-ngawi.go.id',
      op_perencanaan: 'op_rendatin@kpu-ngawi.go.id',
      admin: 'admin@kpu-ngawi.go.id',
      teknis: 'teknis@kpu-ngawi.go.id',
      hukum: 'hukum@kpu-ngawi.go.id',
      parmas: 'parsdm@kpu-ngawi.go.id',
      kul: 'keuangan@kpu-ngawi.go.id',
      kpa: 'kpa@kpu-ngawi.go.id',
      ppkom: 'ppkom@kpu-ngawi.go.id',
      bendahara: 'bendahara@kpu-ngawi.go.id',
      sekretaris: 'sekretaris@kpu-ngawi.go.id',
      komisioner: 'komisioner@kpu-ngawi.go.id'
    };
    const updEmail = db.prepare('UPDATE satker_users SET email = ? WHERE username = ? AND (email IS NULL OR email = "")');
    for (const [uname, em] of Object.entries(defaultEmails)) {
      updEmail.run(em, uname);
    }
  } catch (e) {}

  // Default settings untuk integrasi Google Sign-In
  try {
    const sIns = db.prepare('INSERT OR IGNORE INTO settings_satker (key, value) VALUES (?, ?)');
    sIns.run('google_client_id', process.env.GOOGLE_CLIENT_ID || '');
    sIns.run('google_auth_enabled', process.env.GOOGLE_CLIENT_ID ? '1' : '0');
    sIns.run('google_allowed_domains', 'kpu.go.id,gmail.com');
  } catch (e) {}

  // Otomatis jalankan sinkronisasi SSOT (Master Wilayah, DPT, Paslon -> master_kuantitas) saat inisialisasi
  try {
    syncPrimaryKuantitas();
  } catch (e) {}
}

initDb();

// ============================================================================
// PERIODE / SIKLUS ANGGARAN
// ============================================================================

function getPeriodeList() {
  const periodes = db.prepare(`
    SELECT p.*,
      COALESCE((SELECT COUNT(*) FROM rab_baris WHERE periode_id = p.id AND row_type != 'header'), 0) as total_items,
      COALESCE((SELECT COUNT(*) FROM rab_baris WHERE periode_id = p.id), 0) as total_baris
    FROM periode_anggaran p
    ORDER BY p.id ASC
  `).all();
  return periodes;
}

function getPeriodeById(id) {
  const p = db.prepare('SELECT * FROM periode_anggaran WHERE id = ?').get(id);
  if (!p) return null;
  const countRow = db.prepare('SELECT COUNT(*) as cnt, COUNT(CASE WHEN row_type != \'header\' THEN 1 END) as items FROM rab_baris WHERE periode_id = ?').get(id);
  p.total_baris = countRow ? Number(countRow.cnt || 0) : 0;
  p.total_items = countRow ? Number(countRow.items || 0) : 0;
  return p;
}

function getActivePeriode() {
  // RKB Aktif adalah versi RKB yang BELUM dikunci (is_locked = 0)
  let p = db.prepare("SELECT * FROM periode_anggaran WHERE tipe_dokumen = 'RKB' AND is_locked = 0 ORDER BY id DESC LIMIT 1").get();
  if (!p) {
    // Jika semua terkunci, ambil versi RKB terakhir
    p = db.prepare("SELECT * FROM periode_anggaran WHERE tipe_dokumen = 'RKB' ORDER BY id DESC LIMIT 1").get();
  }
  if (!p) {
    p = db.prepare("SELECT * FROM periode_anggaran ORDER BY id DESC LIMIT 1").get();
  }
  if (p) {
    return getPeriodeById(p.id);
  }
  return null;
}

function lockPeriode(id, details = {}) {
  const now = new Date().toISOString();
  if (details && (details.dasar_pengesahan || details.catatan_revisi || details.nomor_ba_tapd || details.tahap_revisi)) {
    db.prepare(`
      UPDATE periode_anggaran SET 
        is_locked = 1, 
        locked_at = ?,
        dasar_pengesahan = COALESCE(?, dasar_pengesahan),
        tahap_revisi = COALESCE(?, tahap_revisi),
        nomor_ba_tapd = COALESCE(?, nomor_ba_tapd),
        tanggal_ba_tapd = COALESCE(?, tanggal_ba_tapd),
        catatan_revisi = COALESCE(?, catatan_revisi)
      WHERE id = ?
    `).run(
      now, 
      details.dasar_pengesahan || null, 
      details.tahap_revisi || null, 
      details.nomor_ba_tapd || null, 
      details.tanggal_ba_tapd || null, 
      details.catatan_revisi || null, 
      id
    );
  } else {
    db.prepare('UPDATE periode_anggaran SET is_locked = 1, locked_at = ? WHERE id = ?').run(now, id);
  }
  return getPeriodeById(id);
}

function unlockPeriode(id) {
  db.prepare('UPDATE periode_anggaran SET is_locked = 0, locked_at = NULL WHERE id = ?').run(id);
  return getPeriodeById(id);
}

function updatePeriodeLegalitas(id, {
  nama_periode, versi_revisi,
  nomor_ba_tapd, tanggal_ba_tapd, dasar_pengesahan, catatan_revisi,
  nomor_surat_pengajuan_tapd, tanggal_surat_pengajuan_tapd,
  nomor_surat_balasan_pemda, nomor_surat_pernyataan_7hari, tanggal_surat_pernyataan_7hari
}) {
  const current = getPeriodeById(id);
  if (!current) return null;

  db.prepare(`
    UPDATE periode_anggaran SET
      nama_periode = ?,
      versi_revisi = ?,
      nomor_ba_tapd = ?,
      tanggal_ba_tapd = ?,
      dasar_pengesahan = ?,
      catatan_revisi = ?,
      nomor_surat_pengajuan_tapd = ?,
      tanggal_surat_pengajuan_tapd = ?,
      nomor_surat_balasan_pemda = ?,
      nomor_surat_pernyataan_7hari = ?,
      tanggal_surat_pernyataan_7hari = ?
    WHERE id = ?
  `).run(
    nama_periode || current.nama_periode,
    versi_revisi || current.versi_revisi,
    nomor_ba_tapd !== undefined ? nomor_ba_tapd : current.nomor_ba_tapd,
    tanggal_ba_tapd !== undefined ? tanggal_ba_tapd : current.tanggal_ba_tapd,
    dasar_pengesahan || current.dasar_pengesahan || 'Kertas Kerja Penyusunan',
    catatan_revisi !== undefined ? catatan_revisi : current.catatan_revisi,
    nomor_surat_pengajuan_tapd !== undefined ? nomor_surat_pengajuan_tapd : (current.nomor_surat_pengajuan_tapd || ''),
    tanggal_surat_pengajuan_tapd !== undefined ? tanggal_surat_pengajuan_tapd : (current.tanggal_surat_pengajuan_tapd || ''),
    nomor_surat_balasan_pemda !== undefined ? nomor_surat_balasan_pemda : (current.nomor_surat_balasan_pemda || ''),
    nomor_surat_pernyataan_7hari !== undefined ? nomor_surat_pernyataan_7hari : (current.nomor_surat_pernyataan_7hari || ''),
    tanggal_surat_pernyataan_7hari !== undefined ? tanggal_surat_pernyataan_7hari : (current.tanggal_surat_pernyataan_7hari || ''),
    id
  );
  return getPeriodeById(id);
}

function createPeriode({
  nama_periode, versi_revisi, tahap_revisi, dasar_pengesahan,
  nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi, parent_periode_id,
  kode_singkat, revisi_ke, sumber_dana
}) {
  const countRev = db.prepare("SELECT COUNT(*) as c FROM periode_anggaran WHERE tipe_dokumen = 'RKB'").get()?.c || 1;
  const calcRevisiKe = revisi_ke !== undefined ? revisi_ke : countRev;
  const calcKodeSingkat = kode_singkat || `RKB-REV-${calcRevisiKe}`;

  const res = db.prepare(`
    INSERT INTO periode_anggaran (
      nama_periode, versi_revisi, tahap_revisi, dasar_pengesahan,
      nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi, parent_periode_id,
      is_locked, sumber_dana, tipe_dokumen, jenis_agenda, kode_singkat, revisi_ke
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'RKB', 'PILKADA', ?, ?)
  `).run(
    nama_periode || `RKB Revisi ${calcRevisiKe}`,
    versi_revisi || `Revisi ${calcRevisiKe}`,
    tahap_revisi || 'PASCA_NPHD',
    dasar_pengesahan || 'BA TAPD',
    nomor_ba_tapd || '',
    tanggal_ba_tapd || '',
    catatan_revisi || '',
    parent_periode_id || null,
    sumber_dana || 'KABUPATEN',
    calcKodeSingkat,
    calcRevisiKe
  );
  return getPeriodeById(res.lastInsertRowid);
}

function clonePeriodeToRevision(sourcePeriodeId, {
  nama_periode, versi_revisi, tahap_revisi, dasar_pengesahan, nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi
}) {
  const source = getPeriodeById(sourcePeriodeId);
  if (!source) throw new Error('Dokumen sumber tidak ditemukan.');

  const nextRev = (source.revisi_ke || 0) + 1;
  const defaultVersi = versi_revisi || `Revisi ${nextRev}`;

  const newPeriode = createPeriode({
    nama_periode: nama_periode || `RKB KPU Kabupaten Ngawi (${defaultVersi})`,
    versi_revisi: defaultVersi,
    tahap_revisi: tahap_revisi || 'PASCA_NPHD',
    dasar_pengesahan: dasar_pengesahan || 'BA TAPD',
    nomor_ba_tapd: nomor_ba_tapd || '',
    tanggal_ba_tapd: tanggal_ba_tapd || '',
    catatan_revisi: catatan_revisi || `Turunan revisi dari ${source.versi_revisi}`,
    parent_periode_id: source.id,
    revisi_ke: nextRev,
    kode_singkat: `RKB-REV-${nextRev}`
  });

  // Kloning seluruh baris dari source ke periode baru secara efisien dalam transaksi
  const rows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(sourcePeriodeId);
  
  const insertStmt = db.prepare(`
    INSERT INTO rab_baris (
      periode_id, urutan, row_type, kode, uraian, level_indent, target_scope, kode_akun,
      f1_val, f1_unit, f1_var, f2_val, f2_unit, f2_var, f3_val, f3_unit, f3_var, f4_val, f4_unit, f4_var,
      basis_pengali, label_pengali_kab, label_pengali_adhoc, satuan_vol, harga_satuan,
      pic_bagian, sifat_biaya, jenis_biaya, blokir_rm, selalu_tampil_print, parent_rkb_row_id,
      catatan_realisasi, semula_row_id, semula_vol, semula_rincian, semula_satuan, semula_harga, semula_jumlah,
      catatan_revisi_baris, cost_sharing
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  db.exec('BEGIN TRANSACTION');
  try {
    const idMap = {};
    for (const r of rows) {
      const parentNewId = r.parent_rkb_row_id && idMap[r.parent_rkb_row_id] ? idMap[r.parent_rkb_row_id] : null;
      const res = insertStmt.run(
        newPeriode.id, r.urutan, r.row_type, r.kode, r.uraian, r.level_indent, r.target_scope, r.kode_akun,
        r.f1_val, r.f1_unit, r.f1_var, r.f2_val, r.f2_unit, r.f2_var, r.f3_val, r.f3_unit, r.f3_var, r.f4_val, r.f4_unit, r.f4_var,
        r.basis_pengali, r.label_pengali_kab, r.label_pengali_adhoc, r.satuan_vol, r.harga_satuan,
        r.pic_bagian, r.sifat_biaya, r.jenis_biaya, r.blokir_rm, r.selalu_tampil_print, parentNewId,
        r.catatan_realisasi, r.semula_row_id || r.id, null, null, null, null, null,
        r.catatan_revisi_baris, r.cost_sharing
      );
      idMap[r.id] = res.lastInsertRowid;
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return getPeriodeById(newPeriode.id);
}

// ============================================================================
// RAB BARIS CRUD & QUERY
// ============================================================================

function getRabRows(periodeId, { pic = 'SEMUA', target_scope = 'ALL', search = '' } = {}) {
  let query = 'SELECT * FROM rab_baris WHERE periode_id = ?';
  const params = [periodeId];

  // Normalisasi filter PIC
  if (pic && pic !== 'SEMUA') {
    let picSearch = pic.toUpperCase();
    if (picSearch === 'PERENCANAAN') picSearch = 'RENDATIN';
    if (picSearch === 'KEUANGAN') picSearch = 'KUL';
    if (picSearch === 'PARMAS') picSearch = 'PARSDM';
    query += ' AND (level_indent < 4 OR UPPER(pic_bagian) = ? OR UPPER(pic_bagian) LIKE ?)';
    params.push(picSearch, `%${picSearch}%`);
  }

  // Filter target_scope
  if (target_scope && target_scope !== 'ALL') {
    query += ' AND (level_indent < 4 OR UPPER(target_scope) = ?)';
    params.push(target_scope.toUpperCase());
  }

  // Filter search
  if (search && search.trim()) {
    query += ' AND (uraian LIKE ? OR kode LIKE ? OR kode_akun LIKE ?)';
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY urutan ASC, id ASC';
  return db.prepare(query).all(...params);
}

function getRabRowById(id) {
  return db.prepare('SELECT * FROM rab_baris WHERE id = ?').get(id);
}

function saveRabRow(row) {
  if (row.id) {
    const existing = db.prepare('SELECT * FROM rab_baris WHERE id = ?').get(row.id);
    if (!existing) {
      throw new Error(`Baris dengan id ${row.id} tidak ditemukan.`);
    }

    const finalUrutan = row.urutan !== undefined && row.urutan !== null ? Number(row.urutan) : existing.urutan;
    const finalRowType = row.row_type !== undefined ? row.row_type : existing.row_type;
    const finalKode = row.kode !== undefined ? row.kode : existing.kode;
    const finalUraian = row.uraian !== undefined ? row.uraian : existing.uraian;
    const finalLevel = row.level_indent !== undefined ? Number(row.level_indent) : existing.level_indent;
    const finalTarget = row.target_scope !== undefined ? row.target_scope : existing.target_scope;
    const finalAkun = row.kode_akun !== undefined ? row.kode_akun : existing.kode_akun;
    const finalPic = row.pic_bagian !== undefined ? row.pic_bagian : existing.pic_bagian;
    const finalParentId = row.parent_rkb_row_id !== undefined ? row.parent_rkb_row_id : existing.parent_rkb_row_id;
    const finalHarga = row.harga_satuan !== undefined ? (Number(row.harga_satuan) || 0) : existing.harga_satuan;
    const finalSatuan = row.satuan_vol !== undefined ? row.satuan_vol : existing.satuan_vol;
    const finalBasis = row.basis_pengali !== undefined ? row.basis_pengali : existing.basis_pengali;
    const finalLabelKab = row.label_pengali_kab !== undefined ? row.label_pengali_kab : existing.label_pengali_kab;
    const finalLabelAdhoc = row.label_pengali_adhoc !== undefined ? row.label_pengali_adhoc : existing.label_pengali_adhoc;
    const finalCatatan = row.catatan_revisi_baris !== undefined ? row.catatan_revisi_baris : existing.catatan_revisi_baris;
    const finalF1Val = row.f1_val !== undefined ? row.f1_val : existing.f1_val;
    const finalF1Unit = row.f1_unit !== undefined ? row.f1_unit : existing.f1_unit;
    const finalF1Var = row.f1_var !== undefined ? row.f1_var : existing.f1_var;
    const finalF2Val = row.f2_val !== undefined ? row.f2_val : existing.f2_val;
    const finalF2Unit = row.f2_unit !== undefined ? row.f2_unit : existing.f2_unit;
    const finalF2Var = row.f2_var !== undefined ? row.f2_var : existing.f2_var;
    const finalF3Val = row.f3_val !== undefined ? row.f3_val : existing.f3_val;
    const finalF3Unit = row.f3_unit !== undefined ? row.f3_unit : existing.f3_unit;
    const finalF3Var = row.f3_var !== undefined ? row.f3_var : existing.f3_var;
    const finalF4Val = row.f4_val !== undefined ? row.f4_val : existing.f4_val;
    const finalF4Unit = row.f4_unit !== undefined ? row.f4_unit : existing.f4_unit;
    const finalF4Var = row.f4_var !== undefined ? row.f4_var : existing.f4_var;

    db.prepare(`
      UPDATE rab_baris SET
        urutan = ?, row_type = ?, kode = ?, uraian = ?, level_indent = ?, target_scope = ?, kode_akun = ?,
        f1_val = ?, f1_unit = ?, f1_var = ?, f2_val = ?, f2_unit = ?, f2_var = ?,
        f3_val = ?, f3_unit = ?, f3_var = ?, f4_val = ?, f4_unit = ?, f4_var = ?,
        basis_pengali = ?, label_pengali_kab = ?, label_pengali_adhoc = ?, satuan_vol = ?, harga_satuan = ?,
        pic_bagian = ?, catatan_revisi_baris = ?, parent_rkb_row_id = ?
      WHERE id = ?
    `).run(
      finalUrutan, finalRowType, finalKode, finalUraian, finalLevel, finalTarget, finalAkun,
      finalF1Val, finalF1Unit, finalF1Var, finalF2Val, finalF2Unit, finalF2Var,
      finalF3Val, finalF3Unit, finalF3Var, finalF4Val, finalF4Unit, finalF4Var,
      finalBasis, finalLabelKab, finalLabelAdhoc, finalSatuan, finalHarga,
      finalPic, finalCatatan, finalParentId,
      row.id
    );
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache(existing.periode_id);
    return getRabRowById(row.id);
  } else {
    let finalUrutan;
    if (row.target_before_urutan !== undefined && row.target_before_urutan !== null && row.target_before_urutan !== '') {
      const targetU = Number(row.target_before_urutan);
      // Geser semua baris di target_before_urutan ke atas (+1) agar tersisip tepat di posisi targetU (sebelum baris target)
      db.prepare('UPDATE rab_baris SET urutan = urutan + 1 WHERE periode_id = ? AND urutan >= ?').run(row.periode_id, targetU);
      finalUrutan = targetU;
    } else if (row.target_after_urutan !== undefined && row.target_after_urutan !== null && row.target_after_urutan !== '') {
      const targetU = Number(row.target_after_urutan);
      // Geser semua baris di bawah target_after_urutan sebanyak +1 agar baris baru tersisip tepat di bawahnya
      db.prepare('UPDATE rab_baris SET urutan = urutan + 1 WHERE periode_id = ? AND urutan > ?').run(row.periode_id, targetU);
      finalUrutan = targetU + 1;
    } else if (row.urutan !== undefined && row.urutan !== null && row.urutan !== '') {
      finalUrutan = Number(row.urutan);
    } else {
      // Cari urutan terbesar di periode_id ini jika tidak ada baris rujukan
      const maxU = db.prepare('SELECT MAX(urutan) as maxU FROM rab_baris WHERE periode_id = ?').get(row.periode_id);
      finalUrutan = (maxU && maxU.maxU ? maxU.maxU : 0) + 1;
    }

    const res = db.prepare(`
      INSERT INTO rab_baris (
        periode_id, urutan, row_type, kode, uraian, level_indent, target_scope, kode_akun,
        f1_val, f1_unit, f1_var, f2_val, f2_unit, f2_var, f3_val, f3_unit, f3_var, f4_val, f4_unit, f4_var,
        basis_pengali, label_pengali_kab, label_pengali_adhoc, satuan_vol, harga_satuan,
        pic_bagian, catatan_revisi_baris
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `).run(
      row.periode_id,
      finalUrutan,
      row.row_type || (Number(row.level_indent) === 4 ? 'item' : 'header'),
      row.kode || '',
      row.uraian || '',
      row.level_indent !== undefined ? row.level_indent : 4,
      row.target_scope || 'KAB',
      row.kode_akun || '',
      row.f1_val !== undefined ? row.f1_val : null,
      row.f1_unit || '',
      row.f1_var || '',
      row.f2_val !== undefined ? row.f2_val : null,
      row.f2_unit || '',
      row.f2_var || '',
      row.f3_val !== undefined ? row.f3_val : null,
      row.f3_unit || '',
      row.f3_var || '',
      row.f4_val !== undefined ? row.f4_val : null,
      row.f4_unit || '',
      row.f4_var || '',
      row.basis_pengali || 'NONE',
      row.label_pengali_kab || '',
      row.label_pengali_adhoc || '',
      row.satuan_vol || '',
      row.harga_satuan !== undefined ? Number(row.harga_satuan) || 0 : 0,
      row.pic_bagian || 'KUL',
      row.catatan_revisi_baris || ''
    );
    const { clearRkbDatasetCache } = require('./calculation');
    clearRkbDatasetCache(row.periode_id);
    return getRabRowById(res.lastInsertRowid);
  }
}

function deleteRabRow(id) {
  const row = db.prepare('SELECT periode_id FROM rab_baris WHERE id = ?').get(id);
  db.prepare('DELETE FROM rab_baris WHERE parent_rkb_row_id = ?').run(id);
  db.prepare('DELETE FROM rab_baris WHERE id = ?').run(id);
  const { clearRkbDatasetCache } = require('./calculation');
  clearRkbDatasetCache(row ? row.periode_id : null);
  return { success: true };
}

/**
 * Update Subbag PIC baris belanja dengan dukungan Top-Down Cascade
 * - Jika target adalah level induk (Kegiatan/Akun) dan cascade=true:
 *   seluruh anak baris di bawahnya (sub-kegiatan, akun, rincian belanja) otomatis ikut terupdate.
 * - Jika target adalah rincian belanja (item level 4/6) atau cascade=false:
 *   hanya baris target tersebut yang terupdate (Bottom-Up Isolated, tidak mempengaruhi level di atasnya).
 */
function updateRabBarisPicWithCascade(periodeId, rowId, picBagian, cascade = true) {
  const target = db.prepare('SELECT * FROM rab_baris WHERE id = ? AND periode_id = ?').get(rowId, periodeId);
  if (!target) return { count: 0, updatedIds: [] };

  const targetPic = (picBagian || 'KUL').toUpperCase();

  // Jika tidak cascade atau baris bukan header (item leaf), update baris itu saja
  if (!cascade || target.row_type !== 'header') {
    db.prepare('UPDATE rab_baris SET pic_bagian = ? WHERE id = ? AND periode_id = ?').run(targetPic, rowId, periodeId);
    return { count: 1, updatedIds: [Number(rowId)], pic_bagian: targetPic };
  }

  // Cari seluruh anak baris di bawah pohon hirarki target
  const { getHierarchyRank } = require('./calculation');
  const allRows = db.prepare('SELECT id, urutan, row_type, level_indent FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(periodeId);
  const targetIdx = allRows.findIndex(r => r.id === Number(rowId));
  if (targetIdx === -1) {
    db.prepare('UPDATE rab_baris SET pic_bagian = ? WHERE id = ? AND periode_id = ?').run(targetPic, rowId, periodeId);
    return { count: 1, updatedIds: [Number(rowId)], pic_bagian: targetPic };
  }

  const targetRank = getHierarchyRank(target);
  const updatedIds = [target.id];

  for (let i = targetIdx + 1; i < allRows.length; i++) {
    const r = allRows[i];
    const rRank = getHierarchyRank(r);
    if (rRank <= targetRank) break; // Berhenti saat menemui saudara (sibling) atau level induk yang setara/lebih tinggi
    updatedIds.push(r.id);
  }

  const stmt = db.prepare('UPDATE rab_baris SET pic_bagian = ? WHERE id = ? AND periode_id = ?');
  db.exec('BEGIN TRANSACTION');
  try {
    for (const id of updatedIds) {
      stmt.run(targetPic, id, periodeId);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  const { clearRkbDatasetCache } = require('./calculation');
  clearRkbDatasetCache(periodeId);

  return { count: updatedIds.length, updatedIds, pic_bagian: targetPic };
}

function clearRabRows(periodeId) {
  db.prepare('DELETE FROM rab_baris WHERE periode_id = ?').run(periodeId);
  const { clearRkbDatasetCache } = require('./calculation');
  clearRkbDatasetCache(periodeId);
  return { success: true };
}

/**
 * Mengatur urutan baris RKB (Reordering: UP / DOWN)
 * Boundary-Safe: Baris hanya digeser di dalam lingkup induk (same parent_tree_id)
 * Mendukung pergeseran item mandiri maupun pohon komponen beserta anak-anaknya
 */
function reorderRow(periodeId, rowId, direction) {
  const pId = Number(periodeId);
  const targetId = Number(rowId);
  const dir = String(direction).toUpperCase(); // 'UP' or 'DOWN'

  const { calculateRkbDataset, clearRkbDatasetCache } = require('./calculation');
  const rawRows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(pId);
  if (rawRows.length === 0) throw new Error('Data tidak ditemukan.');

  const dataset = calculateRkbDataset(rawRows);
  const targetIdx = dataset.rows.findIndex(r => r.id === targetId);
  if (targetIdx === -1) throw new Error('Baris tidak ditemukan.');

  const targetRow = dataset.rows[targetIdx];
  const targetParent = targetRow.parent_tree_id;

  // Temukan semua saudara setingkat (siblings) yang berbagi parent_tree_id yang sama
  const siblings = dataset.rows.filter(r => r.parent_tree_id === targetParent);
  const siblingIdx = siblings.findIndex(r => r.id === targetId);

  if (siblingIdx === -1) throw new Error('Gagal memetakan hierarki baris.');

  if (dir === 'UP') {
    if (siblingIdx === 0) {
      throw new Error('Baris sudah berada di urutan teratas dalam kelompok komponen ini.');
    }
  } else if (dir === 'DOWN') {
    if (siblingIdx === siblings.length - 1) {
      throw new Error('Baris sudah berada di urutan terbawah dalam kelompok komponen ini.');
    }
  } else {
    throw new Error('Arah pergeseran tidak valid (gunakan UP atau DOWN).');
  }

  const partnerSibling = dir === 'UP' ? siblings[siblingIdx - 1] : siblings[siblingIdx + 1];

  // Identifikasi seluruh baris milik cabang target (target + seluruh keturunannya)
  // dan seluruh baris milik cabang partner (partner + seluruh keturunannya)
  function getBranchRowIds(startRow) {
    const ids = [startRow.id];
    const startIdx = dataset.rows.findIndex(r => r.id === startRow.id);
    const startRank = startRow.hierarchy_rank;
    for (let i = startIdx + 1; i < dataset.rows.length; i++) {
      const r = dataset.rows[i];
      if (r.is_header && r.hierarchy_rank <= startRank) break;
      if (r.parent_tree_id === startRow.parent_tree_id) break;
      ids.push(r.id);
    }
    return ids;
  }

  const targetBranchIds = getBranchRowIds(targetRow);
  const partnerBranchIds = getBranchRowIds(partnerSibling);

  let firstGroupIds, secondGroupIds;
  if (dir === 'UP') {
    firstGroupIds = partnerBranchIds; // partner awalnya di atas
    secondGroupIds = targetBranchIds;  // target awalnya di bawah
  } else {
    firstGroupIds = targetBranchIds;   // target awalnya di atas
    secondGroupIds = partnerBranchIds; // partner awalnya di bawah
  }

  const combinedIds = [...firstGroupIds, ...secondGroupIds];
  const combinedRows = combinedIds.map(id => rawRows.find(r => r.id === id));
  const allocatedUrutans = combinedRows.map(r => r.urutan).sort((a, b) => a - b);
  const swappedIds = [...secondGroupIds, ...firstGroupIds];

  db.exec('BEGIN TRANSACTION');
  try {
    const updateStmt = db.prepare('UPDATE rab_baris SET urutan = ? WHERE id = ?');
    for (let i = 0; i < swappedIds.length; i++) {
      updateStmt.run(allocatedUrutans[i], swappedIds[i]);
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  clearRkbDatasetCache(pId);
  return { success: true, moved_row_id: targetId, direction: dir };
}

// ============================================================================
// AUTH & MASTER DATA
// ============================================================================

function getUsers() {
  return db.prepare('SELECT id, username, nama_pejabat, jabatan, role_id, level, pic_subbag, email, google_id, avatar_url, is_active FROM satker_users ORDER BY level ASC, id ASC').all();
}

function getUserById(id) {
  return db.prepare('SELECT id, username, nama_pejabat, jabatan, role_id, level, pic_subbag, email, google_id, avatar_url, is_active FROM satker_users WHERE id = ?').get(id);
}

function saveUser(userData) {
  const id = userData.id ? Number(userData.id) : null;
  const username = (userData.username || '').trim().toLowerCase();
  const password = (userData.password || '').trim();
  const nama_pejabat = (userData.nama_pejabat || '').trim();
  const jabatan = (userData.jabatan || '').trim();
  const email = (userData.email || '').trim().toLowerCase();
  const role_id = (userData.role_id || 'op_teknis').trim();
  const level = Number(userData.level) !== undefined ? Number(userData.level) : 2;
  const pic_subbag = (userData.pic_subbag || 'SEMUA').trim();
  const is_active = userData.is_active !== undefined ? (Number(userData.is_active) ? 1 : 0) : 1;

  if (!username) throw new Error('Username tidak boleh kosong.');
  if (!id && !password) throw new Error('Password tidak boleh kosong untuk pengguna baru.');
  if (!nama_pejabat) throw new Error('Nama pejabat / pegawai tidak boleh kosong.');

  if (id) {
    const existing = db.prepare('SELECT * FROM satker_users WHERE id = ?').get(id);
    if (!existing) throw new Error(`Pengguna dengan ID ${id} tidak ditemukan.`);

    // Cek username bentrok
    const clash = db.prepare('SELECT id FROM satker_users WHERE username = ? AND id != ?').get(username, id);
    if (clash) throw new Error(`Username "${username}" sudah digunakan pengguna lain.`);

    // Proteksi akun emenje: tidak boleh diubah levelnya menjadi non-0
    if (existing.username === 'emenje' && level !== 0) {
      throw new Error('Tingkat akses akun developer "emenje" tidak dapat diturunkan.');
    }

    const finalPass = password || existing.password;

    db.prepare(`
      UPDATE satker_users
      SET username = ?, password = ?, nama_pejabat = ?, jabatan = ?, email = ?, role_id = ?, level = ?, pic_subbag = ?, is_active = ?
      WHERE id = ?
    `).run(username, finalPass, nama_pejabat, jabatan, email, role_id, level, pic_subbag, is_active, id);

    return getUserById(id);
  } else {
    const exist = db.prepare('SELECT id FROM satker_users WHERE username = ?').get(username);
    if (exist) throw new Error(`Username "${username}" sudah terdaftar.`);

    const res = db.prepare(`
      INSERT INTO satker_users (username, password, nama_pejabat, jabatan, email, role_id, level, pic_subbag, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, password, nama_pejabat, jabatan, email, role_id, level, pic_subbag, is_active);

    return getUserById(res.lastInsertRowid);
  }
}

function deleteUser(userId, currentUserId) {
  const target = db.prepare('SELECT * FROM satker_users WHERE id = ?').get(userId);
  if (!target) throw new Error('Pengguna tidak ditemukan.');

  if (target.username === 'emenje') {
    throw new Error('Akun Developer Utama ("emenje") dilindungi dan tidak dapat dihapus.');
  }

  if (Number(userId) === Number(currentUserId)) {
    throw new Error('Anda tidak dapat menghapus akun yang sedang Anda gunakan saat ini.');
  }

  db.prepare('DELETE FROM satker_users WHERE id = ?').run(userId);
  return { success: true, message: `Akun "${target.username}" berhasil dihapus.` };
}

function toggleUserStatus(userId) {
  const target = db.prepare('SELECT * FROM satker_users WHERE id = ?').get(userId);
  if (!target) throw new Error('Pengguna tidak ditemukan.');

  if (target.username === 'emenje') {
    throw new Error('Status Akun Developer Utama ("emenje") tidak dapat dinonaktifkan.');
  }

  const newStatus = target.is_active ? 0 : 1;
  db.prepare('UPDATE satker_users SET is_active = ? WHERE id = ?').run(newStatus, userId);
  return { success: true, is_active: newStatus, message: `Status akun "${target.username}" diubah menjadi ${newStatus ? 'Aktif' : 'Nonaktif'}.` };
}

function authenticateUser(username, password) {
  const u = db.prepare('SELECT * FROM satker_users WHERE username = ? AND password = ? AND is_active = 1').get(username, password);
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    nama_pejabat: u.nama_pejabat,
    jabatan: u.jabatan,
    role_id: u.role_id,
    level: u.level,
    pic_subbag: u.pic_subbag,
    email: u.email || '',
    avatar_url: u.avatar_url || ''
  };
}

function authenticateGoogleUser(googleProfile) {
  const email = (googleProfile.email || '').trim().toLowerCase();
  const sub = String(googleProfile.sub || '');
  if (!email && !sub) return null;

  // 1. Cari berdasarkan google_id atau email
  let u = null;
  if (email && sub) {
    u = db.prepare('SELECT * FROM satker_users WHERE (google_id = ? OR LOWER(email) = ?) AND is_active = 1').get(sub, email);
  } else if (email) {
    u = db.prepare('SELECT * FROM satker_users WHERE LOWER(email) = ? AND is_active = 1').get(email);
  }

  // 2. Fallback pencocokan khusus developer / lead architect emenje
  if (!u && email) {
    if (email === 'noorjihan1184@gmail.com' || email === 'emenje@kpu-ngawi.go.id') {
      u = db.prepare("SELECT * FROM satker_users WHERE username = 'emenje' AND is_active = 1").get();
    }
  }

  if (!u) return null;

  // Tautkan data google_id, email, atau avatar jika belum ada
  try {
    if (!u.google_id && sub) {
      db.prepare('UPDATE satker_users SET google_id = ? WHERE id = ?').run(sub, u.id);
    }
    if ((!u.email || u.email === '') && email) {
      db.prepare('UPDATE satker_users SET email = ? WHERE id = ?').run(email, u.id);
    }
    if (googleProfile.picture) {
      db.prepare('UPDATE satker_users SET avatar_url = ? WHERE id = ?').run(googleProfile.picture, u.id);
    }
  } catch (e) {}

  return {
    id: u.id,
    username: u.username,
    nama_pejabat: u.nama_pejabat,
    jabatan: u.jabatan,
    role_id: u.role_id,
    level: u.level,
    pic_subbag: u.pic_subbag,
    email: u.email || email,
    avatar_url: googleProfile.picture || u.avatar_url || ''
  };
}

function getMasters() {
  const akuns = db.prepare('SELECT * FROM master_akun ORDER BY kode ASC').all();
  const sbms = db.prepare('SELECT * FROM master_sbm ORDER BY id ASC').all();
  const kecamatans = db.prepare('SELECT * FROM master_kecamatan ORDER BY no_urut ASC, id ASC').all();
  const desas = db.prepare('SELECT * FROM master_desa ORDER BY no_urut ASC, id ASC').all();
  const kuantitas = db.prepare('SELECT * FROM master_kuantitas ORDER BY id ASC').all();
  let paslons = [];
  try {
    paslons = db.prepare('SELECT * FROM master_paslon ORDER BY no_urut ASC, id ASC').all();
  } catch (e) {}
  
  let settings = {};
  try {
    const sRows = db.prepare('SELECT key, value FROM settings_satker').all();
    for (const r of sRows) settings[r.key] = r.value;
  } catch (e) {}

  return {
    akuns,
    sbms,
    kecamatans,
    desas,
    kuantitas,
    paslons,
    settings,
    total_ppk: kecamatans.length,
    total_pps: desas.length,
    total_tps: desas.reduce((acc, d) => acc + (Number(d.tps) || 0), 0),
    total_pantarlih: desas.reduce((acc, d) => acc + (Number(d.pantarlih) || 0), 0),
    total_pemilih: desas.reduce((acc, d) => acc + (Number(d.pemilih) || 0), 0),
    total_paslon: paslons.length
  };
}

function updateSettings(settingsObj) {
  for (const [k, v] of Object.entries(settingsObj)) {
    db.prepare('INSERT OR REPLACE INTO settings_satker (key, value) VALUES (?, ?)').run(k, String(v));
  }
  return getMasters().settings;
}

// ============================================================================
// BASIS DATA PRIMER TERPADU (SSOT REAKTIF)
// ============================================================================

function syncPrimaryKuantitas() {
  let aggDesa = {};
  try {
    aggDesa = db.prepare('SELECT COUNT(*) as countDesa, SUM(tps) as sumTps, SUM(pantarlih) as sumPantarlih, SUM(pemilih) as sumPemilih FROM master_desa').get() || {};
  } catch (e) {}

  const countKec = db.prepare('SELECT COUNT(*) as countKec FROM master_kecamatan').get()?.countKec || 19;
  let countPaslon = 5;
  try {
    countPaslon = db.prepare('SELECT COUNT(*) as countPaslon FROM master_paslon').get()?.countPaslon || 5;
  } catch (e) {}

  const totalDesa = Number(aggDesa.countDesa) || 217;
  const totalTps = Number(aggDesa.sumTps) || 1374;
  const totalPantarlih = Number(aggDesa.sumPantarlih) || 2537;
  const totalPemilih = Number(aggDesa.sumPemilih) || 701425;

  const updateKuantitasStmt = db.prepare('UPDATE master_kuantitas SET nilai = ? WHERE kode = ?');
  updateKuantitasStmt.run(countKec, 'kec_ppk');
  updateKuantitasStmt.run(totalDesa, 'desa_pps');
  updateKuantitasStmt.run(totalTps, 'tps_rkb');
  updateKuantitasStmt.run(totalPantarlih, 'pantarlih');
  updateKuantitasStmt.run(totalPemilih, 'pemilih_dpt');
  updateKuantitasStmt.run(totalPemilih, 'dpt');
  updateKuantitasStmt.run(countPaslon, 'paslon');

  // Keterangan dinamis untuk paslon, TPS, dan DPT
  try {
    db.prepare("UPDATE master_kuantitas SET keterangan = ? WHERE kode = 'paslon'").run(`Total Pasangan Calon Tetap (Otomatis dari Database Master: ${countPaslon} Paslon)`);
    db.prepare("UPDATE master_kuantitas SET keterangan = ? WHERE kode = 'tps_rkb'").run(`Kuantitas TPS RKB (Otomatis dari Akumulasi Database 217 Desa: ${totalTps.toLocaleString('id-ID')} TPS)`);
    db.prepare("UPDATE master_kuantitas SET keterangan = ? WHERE kode = 'dpt'").run(`Jumlah DPT Pemilih (Otomatis dari Akumulasi Database 217 Desa: ${totalPemilih.toLocaleString('id-ID')} Pemilih)`);
  } catch (e) {}

  // Turunan personil PPK & PPS & TPS
  updateKuantitasStmt.run(countKec * 1, 'ppk_ketua');
  updateKuantitasStmt.run(countKec * 4, 'ppk_anggota');
  updateKuantitasStmt.run(countKec * 5, 'ppk_komisioner');
  updateKuantitasStmt.run(countKec * 1, 'ppk_sekretaris');
  updateKuantitasStmt.run(countKec * 2, 'ppk_staf');
  updateKuantitasStmt.run(countKec * 3, 'ppk_sekretariat');

  updateKuantitasStmt.run(totalDesa * 1, 'pps_ketua');
  updateKuantitasStmt.run(totalDesa * 2, 'pps_anggota');
  updateKuantitasStmt.run(totalDesa * 3, 'pps_komisioner');
  updateKuantitasStmt.run(totalDesa * 1, 'pps_sekretaris');
  updateKuantitasStmt.run(totalDesa * 2, 'pps_staf');
  updateKuantitasStmt.run(totalDesa * 3, 'pps_sekretariat');

  updateKuantitasStmt.run(totalTps * 1, 'kpps_ketua');
  updateKuantitasStmt.run(totalTps * 6, 'kpps_anggota');
  updateKuantitasStmt.run(totalTps * 2, 'linmas_tps');
  updateKuantitasStmt.run(totalTps * 9, 'petugas_tps');
  updateKuantitasStmt.run(totalTps * 7, 'kpps_all');

  return {
    totalKec: countKec,
    totalDesa,
    totalTps,
    totalPantarlih,
    totalPemilih,
    totalPaslon: countPaslon
  };
}

// Master Paslon CRUD
function getPaslonList() {
  return db.prepare('SELECT * FROM master_paslon ORDER BY no_urut ASC, id ASC').all();
}

function savePaslon(data) {
  const id = data.id ? Number(data.id) : null;
  const no_urut = Number(data.no_urut) || 1;
  const nama_calon_bupati = (data.nama_calon_bupati || '').trim();
  const nama_calon_wakil_bupati = (data.nama_calon_wakil_bupati || '').trim();
  const partai_pengusung = (data.partai_pengusung || '').trim();
  const slogan = (data.slogan || '').trim();
  const keterangan = (data.keterangan || '').trim();

  if (!nama_calon_bupati) throw new Error('Nama calon bupati tidak boleh kosong.');
  if (!nama_calon_wakil_bupati) throw new Error('Nama calon wakil bupati tidak boleh kosong.');

  if (id) {
    db.prepare(`
      UPDATE master_paslon
      SET no_urut = ?, nama_calon_bupati = ?, nama_calon_wakil_bupati = ?, partai_pengusung = ?, slogan = ?, keterangan = ?
      WHERE id = ?
    `).run(no_urut, nama_calon_bupati, nama_calon_wakil_bupati, partai_pengusung, slogan, keterangan, id);
  } else {
    db.prepare(`
      INSERT INTO master_paslon (no_urut, nama_calon_bupati, nama_calon_wakil_bupati, partai_pengusung, slogan, keterangan)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(no_urut, nama_calon_bupati, nama_calon_wakil_bupati, partai_pengusung, slogan, keterangan);
  }

  syncPrimaryKuantitas();
  return getPaslonList();
}

function deletePaslon(id) {
  db.prepare('DELETE FROM master_paslon WHERE id = ?').run(id);
  syncPrimaryKuantitas();
  return { success: true };
}

// Master Kecamatan CRUD
function getKecamatans() {
  return db.prepare('SELECT * FROM master_kecamatan ORDER BY no_urut ASC, id ASC').all();
}

function saveKecamatan(data) {
  const id = data.id ? Number(data.id) : null;
  const no_urut = Number(data.no_urut) || 1;
  const nama = (data.nama || '').trim();
  const kode = (data.kode || '').trim();
  const camat_nama = (data.camat_nama || '').trim();
  const ketua_ppk = (data.ketua_ppk || '').trim();
  const sekretaris_ppk = (data.sekretaris_ppk || '').trim();
  const sekretaris_nip = (data.sekretaris_nip || '').trim();

  if (!nama) throw new Error('Nama kecamatan tidak boleh kosong.');

  if (id) {
    db.prepare(`
      UPDATE master_kecamatan
      SET no_urut = ?, nama = ?, kode = ?, camat_nama = ?, ketua_ppk = ?, sekretaris_ppk = ?, sekretaris_nip = ?
      WHERE id = ?
    `).run(no_urut, nama, kode, camat_nama, ketua_ppk, sekretaris_ppk, sekretaris_nip, id);
  } else {
    db.prepare(`
      INSERT INTO master_kecamatan (no_urut, nama, kode, camat_nama, ketua_ppk, sekretaris_ppk, sekretaris_nip)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(no_urut, nama, kode, camat_nama, ketua_ppk, sekretaris_ppk, sekretaris_nip);
  }

  syncPrimaryKuantitas();
  return getKecamatans();
}

function deleteKecamatan(id) {
  const countDesa = db.prepare('SELECT COUNT(*) as cnt FROM master_desa WHERE kecamatan_id = ?').get()?.cnt || 0;
  if (countDesa > 0) {
    throw new Error(`Tidak dapat menghapus kecamatan ini karena masih memiliki ${countDesa} desa terdaftar.`);
  }
  db.prepare('DELETE FROM master_kecamatan WHERE id = ?').run(id);
  syncPrimaryKuantitas();
  return { success: true };
}

// Master Desa CRUD
function getDesas(kecamatanId = null) {
  let query = `
    SELECT d.*, k.nama as kecamatan_nama, k.no_urut as kecamatan_no
    FROM master_desa d
    LEFT JOIN master_kecamatan k ON d.kecamatan_id = k.id
  `;
  const params = [];
  if (kecamatanId) {
    query += ' WHERE d.kecamatan_id = ?';
    params.push(kecamatanId);
  }
  query += ' ORDER BY k.no_urut ASC, d.no_urut ASC, d.id ASC';
  return db.prepare(query).all(...params);
}

function saveDesa(data) {
  const id = data.id ? Number(data.id) : null;
  const no_urut = Number(data.no_urut) || 1;
  const kecamatan_id = Number(data.kecamatan_id);
  const nama = (data.nama || '').trim();
  const tps = Number(data.tps) || 0;
  const kotak = Number(data.kotak) || tps;
  const pantarlih = Number(data.pantarlih) || 0;
  const pemilih = Number(data.pemilih) || 0;
  const rohaniwan = Number(data.rohaniwan) || 1;
  const ketua_nama = (data.ketua_nama || '').trim();
  const sekretaris_nama = (data.sekretaris_nama || '').trim();
  const sekretaris_nip = (data.sekretaris_nip || '').trim();

  if (!nama) throw new Error('Nama desa/kelurahan tidak boleh kosong.');
  if (!kecamatan_id) throw new Error('Kecamatan harus dipilih.');

  if (id) {
    db.prepare(`
      UPDATE master_desa
      SET no_urut = ?, kecamatan_id = ?, nama = ?, tps = ?, kotak = ?, pantarlih = ?, pemilih = ?, rohaniwan = ?,
          ketua_nama = ?, sekretaris_nama = ?, sekretaris_nip = ?
      WHERE id = ?
    `).run(no_urut, kecamatan_id, nama, tps, kotak, pantarlih, pemilih, rohaniwan, ketua_nama, sekretaris_nama, sekretaris_nip, id);
  } else {
    db.prepare(`
      INSERT INTO master_desa (no_urut, kecamatan_id, nama, tps, kotak, pantarlih, pemilih, rohaniwan, ketua_nama, sekretaris_nama, sekretaris_nip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(no_urut, kecamatan_id, nama, tps, kotak, pantarlih, pemilih, rohaniwan, ketua_nama, sekretaris_nama, sekretaris_nip);
  }

  syncPrimaryKuantitas();
  return getDesas(kecamatan_id);
}

function deleteDesa(id) {
  db.prepare('DELETE FROM master_desa WHERE id = ?').run(id);
  syncPrimaryKuantitas();
  return { success: true };
}

// ============================================================================
// MASTER STANDAR BIAYA MASUKAN (SBM) CRUD & BULK UPSERT
// ============================================================================

function getSbmList() {
  return db.prepare('SELECT * FROM master_sbm ORDER BY id ASC').all();
}

function getSbmById(id) {
  return db.prepare('SELECT * FROM master_sbm WHERE id = ?').get(id);
}

function saveSbm(data) {
  const id = data.id ? Number(data.id) : null;
  const cleanKode = (data.kode_akun || '521211').trim();
  const cleanKat = (data.kategori || 'Umum').trim();
  const cleanUraian = (data.uraian || '').trim();
  const cleanSatuan = (data.satuan || 'OK').trim();
  const cleanHarga = Number(data.harga_satuan) || 0;
  const cleanKet = (data.keterangan || '').trim();
  const cleanPagu = Number(data.pagu_sbm) || cleanHarga;
  const cleanJenis = (data.jenis_regulasi || 'SBM').trim();
  const cleanDasar = (data.dasar_hukum || 'PMK Standar Biaya Masukan').trim();

  if (!cleanUraian) throw new Error('Uraian Standar Biaya Masukan tidak boleh kosong.');

  if (id) {
    db.prepare(`
      UPDATE master_sbm 
      SET kode_akun = ?, kategori = ?, uraian = ?, satuan = ?, harga_satuan = ?, keterangan = ?, pagu_sbm = ?, jenis_regulasi = ?, dasar_hukum = ?
      WHERE id = ?
    `).run(cleanKode, cleanKat, cleanUraian, cleanSatuan, cleanHarga, cleanKet, cleanPagu, cleanJenis, cleanDasar, id);
    return getSbmById(id);
  } else {
    const info = db.prepare(`
      INSERT INTO master_sbm (kode_akun, kategori, uraian, satuan, harga_satuan, keterangan, pagu_sbm, jenis_regulasi, dasar_hukum)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cleanKode, cleanKat, cleanUraian, cleanSatuan, cleanHarga, cleanKet, cleanPagu, cleanJenis, cleanDasar);
    return getSbmById(info.lastInsertRowid);
  }
}

function deleteSbm(id) {
  return db.prepare('DELETE FROM master_sbm WHERE id = ?').run(id);
}

function bulkUpsertSbm(rows) {
  let inserted = 0;
  let updated = 0;
  const checkByIdStmt = db.prepare('SELECT id FROM master_sbm WHERE id = ?');
  const checkByMatchStmt = db.prepare('SELECT id FROM master_sbm WHERE LOWER(TRIM(kategori)) = LOWER(TRIM(?)) AND LOWER(TRIM(uraian)) = LOWER(TRIM(?))');

  const updateStmt = db.prepare(`
    UPDATE master_sbm 
    SET kode_akun = ?, kategori = ?, uraian = ?, satuan = ?, harga_satuan = ?, keterangan = ?, pagu_sbm = ?, jenis_regulasi = ?, dasar_hukum = ?
    WHERE id = ?
  `);
  const insertStmt = db.prepare(`
    INSERT INTO master_sbm (kode_akun, kategori, uraian, satuan, harga_satuan, keterangan, pagu_sbm, jenis_regulasi, dasar_hukum)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const item of rows) {
      const cleanKode = (item.kode_akun || '521211').trim();
      const cleanKat = (item.kategori || 'Umum').trim();
      const cleanUraian = (item.uraian || '').trim();
      if (!cleanUraian) continue;
      const cleanSatuan = (item.satuan || 'OK').trim();
      const cleanHarga = Number(item.harga_satuan) || 0;
      const cleanKet = (item.keterangan || '').trim();
      const cleanPagu = Number(item.pagu_sbm) || cleanHarga;
      const cleanJenis = (item.jenis_regulasi || 'SBM').trim();
      const cleanDasar = (item.dasar_hukum || 'PMK Standar Biaya Masukan').trim();

      let targetId = item.id ? checkByIdStmt.get(item.id)?.id : null;
      if (!targetId) {
        targetId = checkByMatchStmt.get(cleanKat, cleanUraian)?.id;
      }

      if (targetId) {
        updateStmt.run(cleanKode, cleanKat, cleanUraian, cleanSatuan, cleanHarga, cleanKet, cleanPagu, cleanJenis, cleanDasar, targetId);
        updated++;
      } else {
        insertStmt.run(cleanKode, cleanKat, cleanUraian, cleanSatuan, cleanHarga, cleanKet, cleanPagu, cleanJenis, cleanDasar);
        inserted++;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { success: true, processed: inserted + updated, inserted, updated };
}

// ============================================================================
// MASTER BAGAN AKUN STANDAR (BAS) CRUD & BULK UPSERT
// ============================================================================

function getAkunList() {
  return db.prepare('SELECT * FROM master_akun ORDER BY kode ASC').all();
}

function getAkunById(id) {
  return db.prepare('SELECT * FROM master_akun WHERE id = ?').get(id);
}

function saveAkun(data) {
  const id = data.id ? Number(data.id) : null;
  const cleanKode = (data.kode || '').trim();
  const cleanUraian = (data.uraian || '').trim();
  const cleanKelompok = (data.kelompok || '521 - Belanja Barang').trim();
  const cleanKategori = (data.kategori_dn || cleanKode).trim();
  const cleanKet = (data.keterangan || '').trim();

  if (!cleanKode) throw new Error('Kode akun tidak boleh kosong.');
  if (!cleanUraian) throw new Error('Uraian akun tidak boleh kosong.');

  if (id) {
    db.prepare(`
      UPDATE master_akun
      SET kode = ?, uraian = ?, kelompok = ?, kategori_dn = ?, keterangan = ?
      WHERE id = ?
    `).run(cleanKode, cleanUraian, cleanKelompok, cleanKategori, cleanKet, id);
    return getAkunById(id);
  } else {
    const existing = db.prepare('SELECT id FROM master_akun WHERE kode = ?').get(cleanKode);
    if (existing) {
      db.prepare(`
        UPDATE master_akun
        SET uraian = ?, kelompok = ?, kategori_dn = ?, keterangan = ?
        WHERE id = ?
      `).run(cleanUraian, cleanKelompok, cleanKategori, cleanKet, existing.id);
      return getAkunById(existing.id);
    } else {
      const info = db.prepare(`
        INSERT INTO master_akun (kode, uraian, kelompok, kategori_dn, keterangan)
        VALUES (?, ?, ?, ?, ?)
      `).run(cleanKode, cleanUraian, cleanKelompok, cleanKategori, cleanKet);
      return getAkunById(info.lastInsertRowid);
    }
  }
}

function deleteAkun(id) {
  return db.prepare('DELETE FROM master_akun WHERE id = ?').run(id);
}

function bulkUpsertAkun(rows) {
  let inserted = 0;
  let updated = 0;
  const checkByKode = db.prepare('SELECT id FROM master_akun WHERE kode = ?');
  const updateStmt = db.prepare(`
    UPDATE master_akun
    SET uraian = ?, kelompok = ?, kategori_dn = ?, keterangan = ?
    WHERE id = ?
  `);
  const insertStmt = db.prepare(`
    INSERT INTO master_akun (kode, uraian, kelompok, kategori_dn, keterangan)
    VALUES (?, ?, ?, ?, ?)
  `);

  db.exec('BEGIN');
  try {
    for (const item of rows) {
      const cleanKode = (item.kode || '').trim();
      const cleanUraian = (item.uraian || '').trim();
      if (!cleanKode || !cleanUraian) continue;
      const cleanKelompok = (item.kelompok || '521 - Belanja Barang').trim();
      const cleanKategori = (item.kategori_dn || cleanKode).trim();
      const cleanKet = (item.keterangan || '').trim();

      const existing = checkByKode.get(cleanKode);
      if (existing) {
        updateStmt.run(cleanUraian, cleanKelompok, cleanKategori, cleanKet, existing.id);
        updated++;
      } else {
        insertStmt.run(cleanKode, cleanUraian, cleanKelompok, cleanKategori, cleanKet);
        inserted++;
      }
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return { success: true, processed: inserted + updated, inserted, updated };
}

// ============================================================================
// SISTEM MONITORING REPORT & ASYNC DOWNLOAD (SAKTI KEMENKEU STYLE)
// ============================================================================

function createDownloadRequest({ nama_file, tipe_unduhan, periode_id, filter_pic, filter_sasaran }) {
  const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  const dateObj = new Date();
  const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const tglStr = `${dateObj.getDate()} ${bulanIndo[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
  const jamStr = String(dateObj.getHours()).padStart(2, '0') + ':' + String(dateObj.getMinutes()).padStart(2, '0') + ':' + String(dateObj.getSeconds()).padStart(2, '0');
  const request_time = `${tglStr}, ${jamStr} GMT+7`;

  const expiresAt = new Date(dateObj.getTime() + 3600000).toISOString();

  const res = db.prepare(`
    INSERT INTO download_requests (
      request_id, nama_file, tipe_unduhan, periode_id, filter_pic, filter_sasaran,
      request_time, status, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'DIPROSES', ?)
  `).run(reqId, nama_file, tipe_unduhan, periode_id || null, filter_pic || null, filter_sasaran || null, request_time, expiresAt);

  return {
    id: res.lastInsertRowid,
    request_id: reqId,
    nama_file,
    status: 'DIPROSES',
    request_time,
    expires_at: expiresAt
  };
}

function getDownloadRequests({ search = '', tanggal_mulai = '', tanggal_selesai = '' } = {}) {
  cleanupExpiredDownloads();

  let query = 'SELECT * FROM download_requests WHERE 1=1';
  const params = [];

  if (search && search.trim()) {
    query += ' AND nama_file LIKE ?';
    params.push(`%${search.trim()}%`);
  }

  if (tanggal_mulai) {
    query += ' AND date(created_at) >= date(?)';
    params.push(tanggal_mulai);
  }

  if (tanggal_selesai) {
    query += ' AND date(created_at) <= date(?)';
    params.push(tanggal_selesai);
  }

  query += ' ORDER BY id DESC LIMIT 50';
  return db.prepare(query).all(...params);
}

function getDownloadRequestById(id) {
  return db.prepare('SELECT * FROM download_requests WHERE id = ?').get(id);
}

function updateDownloadRequest(id, fields) {
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    sets.push(`${k} = ?`);
    params.push(v);
  }
  params.push(id);
  db.prepare(`UPDATE download_requests SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  return getDownloadRequestById(id);
}

function cleanupExpiredDownloads() {
  const nowIso = new Date().toISOString();
  let expired = [];
  try {
    expired = db.prepare(`
      SELECT * FROM download_requests 
      WHERE status != 'KADALUARSA' AND (expires_at <= ? OR datetime(created_at, '+1 hour') <= datetime('now'))
    `).all(nowIso);

    for (const item of expired) {
      if (item.file_path && fs.existsSync(item.file_path)) {
        try {
          fs.unlinkSync(item.file_path);
        } catch (e) {}
      }
      db.prepare("UPDATE download_requests SET status = 'KADALUARSA', file_path = NULL WHERE id = ?").run(item.id);
    }
  } catch (e) {}
  return expired.length;
}

module.exports = {
  db,
  initDb,
  getPeriodeList,
  getPeriodeById,
  getActivePeriode,
  lockPeriode,
  unlockPeriode,
  updatePeriodeLegalitas,
  createPeriode,
  clonePeriodeToRevision,
  getRabRows,
  getRabRowById,
  saveRabRow,
  deleteRabRow,
  updateRabBarisPicWithCascade,
  clearRabRows,
  reorderRow,
  getUsers,
  getUserById,
  saveUser,
  deleteUser,
  toggleUserStatus,
  authenticateUser,
  authenticateGoogleUser,
  getMasters,
  updateSettings,
  syncPrimaryKuantitas,
  getPaslonList,
  savePaslon,
  deletePaslon,
  getKecamatans,
  saveKecamatan,
  deleteKecamatan,
  getDesas,
  saveDesa,
  deleteDesa,
  getSbmList,
  getSbmById,
  saveSbm,
  deleteSbm,
  bulkUpsertSbm,
  getAkunList,
  getAkunById,
  saveAkun,
  deleteAkun,
  bulkUpsertAkun,
  createDownloadRequest,
  getDownloadRequests,
  getDownloadRequestById,
  updateDownloadRequest,
  cleanupExpiredDownloads
};
