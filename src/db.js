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

function lockPeriode(id) {
  const now = new Date().toISOString();
  db.prepare('UPDATE periode_anggaran SET is_locked = 1, locked_at = ? WHERE id = ?').run(now, id);
  return getPeriodeById(id);
}

function unlockPeriode(id) {
  db.prepare('UPDATE periode_anggaran SET is_locked = 0, locked_at = NULL WHERE id = ?').run(id);
  return getPeriodeById(id);
}

function updatePeriodeLegalitas(id, {
  nomor_ba_tapd, tanggal_ba_tapd, dasar_pengesahan, catatan_revisi,
  nomor_surat_pengajuan_tapd, tanggal_surat_pengajuan_tapd,
  nomor_surat_balasan_pemda, nomor_surat_pernyataan_7hari, tanggal_surat_pernyataan_7hari
}) {
  db.prepare(`
    UPDATE periode_anggaran SET
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
    nomor_ba_tapd || '',
    tanggal_ba_tapd || '',
    dasar_pengesahan || 'NPHD',
    catatan_revisi || '',
    nomor_surat_pengajuan_tapd || '',
    tanggal_surat_pengajuan_tapd || '',
    nomor_surat_balasan_pemda || '',
    nomor_surat_pernyataan_7hari || '',
    tanggal_surat_pernyataan_7hari || '',
    id
  );
  return getPeriodeById(id);
}

function createPeriode({
  nama_periode, versi_revisi, tahap_revisi, dasar_pengesahan,
  nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi, parent_periode_id
}) {
  const res = db.prepare(`
    INSERT INTO periode_anggaran (
      nama_periode, versi_revisi, tahap_revisi, dasar_pengesahan,
      nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi, parent_periode_id,
      is_locked, sumber_dana
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'KABUPATEN')
  `).run(
    nama_periode || 'RKB Baru',
    versi_revisi || 'Revisi Baru',
    tahap_revisi || 'REVISI',
    dasar_pengesahan || 'BA TAPD',
    nomor_ba_tapd || '',
    tanggal_ba_tapd || '',
    catatan_revisi || '',
    parent_periode_id || null
  );
  return getPeriodeById(res.lastInsertRowid);
}

function clonePeriodeToRevision(sourcePeriodeId, {
  nama_periode, versi_revisi, dasar_pengesahan, nomor_ba_tapd, tanggal_ba_tapd, catatan_revisi
}) {
  const source = getPeriodeById(sourcePeriodeId);
  if (!source) throw new Error('Dokumen sumber tidak ditemukan.');

  // Buat periode baru
  const newPeriode = createPeriode({
    nama_periode: nama_periode || `RKB ${versi_revisi} (Pergeseran Anggaran)`,
    versi_revisi: versi_revisi || 'Revisi 1',
    tahap_revisi: 'REVISI',
    dasar_pengesahan: dasar_pengesahan || 'BA TAPD',
    nomor_ba_tapd: nomor_ba_tapd || '',
    tanggal_ba_tapd: tanggal_ba_tapd || '',
    catatan_revisi: catatan_revisi || `Turunan revisi dari ${source.versi_revisi}`,
    parent_periode_id: source.id
  });

  // Kloning seluruh baris dari source ke periode baru
  const rows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(sourcePeriodeId);
  
  const idMap = {};
  for (const r of rows) {
    const parentNewId = r.parent_rkb_row_id && idMap[r.parent_rkb_row_id] ? idMap[r.parent_rkb_row_id] : null;
    const res = db.prepare(`
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
    `).run(
      newPeriode.id, r.urutan, r.row_type, r.kode, r.uraian, r.level_indent, r.target_scope, r.kode_akun,
      r.f1_val, r.f1_unit, r.f1_var, r.f2_val, r.f2_unit, r.f2_var, r.f3_val, r.f3_unit, r.f3_var, r.f4_val, r.f4_unit, r.f4_var,
      r.basis_pengali, r.label_pengali_kab, r.label_pengali_adhoc, r.satuan_vol, r.harga_satuan,
      r.pic_bagian, r.sifat_biaya, r.jenis_biaya, r.blokir_rm, r.selalu_tampil_print, parentNewId,
      r.catatan_realisasi, r.id, null, null, null, null, null,
      r.catatan_revisi_baris, r.cost_sharing
    );
    idMap[r.id] = res.lastInsertRowid;
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
    return getRabRowById(row.id);
  } else {
    // Cari urutan terbesar di periode_id ini
    const maxU = db.prepare('SELECT MAX(urutan) as maxU FROM rab_baris WHERE periode_id = ?').get(row.periode_id);
    const nextUrutan = (maxU && maxU.maxU ? maxU.maxU : 0) + 1;

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
      row.urutan || nextUrutan,
      row.row_type || (row.level_indent >= 4 ? 'item' : 'header'),
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
    return getRabRowById(res.lastInsertRowid);
  }
}

function deleteRabRow(id) {
  db.prepare('DELETE FROM rab_baris WHERE parent_rkb_row_id = ?').run(id);
  db.prepare('DELETE FROM rab_baris WHERE id = ?').run(id);
  return { success: true };
}

function clearRabRows(periodeId) {
  db.prepare('DELETE FROM rab_baris WHERE periode_id = ?').run(periodeId);
  return { success: true };
}

// ============================================================================
// AUTH & MASTER DATA
// ============================================================================

function getUsers() {
  return db.prepare('SELECT id, username, nama_pejabat, jabatan, role_id, level, pic_subbag, is_active FROM satker_users ORDER BY level ASC, id ASC').all();
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
    pic_subbag: u.pic_subbag
  };
}

function getMasters() {
  const akuns = db.prepare('SELECT * FROM master_akun ORDER BY kode ASC').all();
  const sbms = db.prepare('SELECT * FROM master_sbm ORDER BY id ASC').all();
  const kecamatans = db.prepare('SELECT * FROM master_kecamatan ORDER BY no_urut ASC, id ASC').all();
  const desas = db.prepare('SELECT * FROM master_desa ORDER BY no_urut ASC, id ASC').all();
  const kuantitas = db.prepare('SELECT * FROM master_kuantitas ORDER BY id ASC').all();
  
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
    settings,
    total_ppk: kecamatans.length,
    total_pps: desas.length,
    total_tps: desas.reduce((acc, d) => acc + (Number(d.tps) || 0), 0)
  };
}

function updateSettings(settingsObj) {
  for (const [k, v] of Object.entries(settingsObj)) {
    db.prepare('INSERT OR REPLACE INTO settings_satker (key, value) VALUES (?, ?)').run(k, String(v));
  }
  return getMasters().settings;
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
  clearRabRows,
  getUsers,
  authenticateUser,
  getMasters,
  updateSettings
};
