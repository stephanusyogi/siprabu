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

  // Sinkronisasi nomenklatur jabatan Kasubbag Hukum (menghilangkan duplikasi SDM dengan PARSDM)
  try {
    db.prepare(`
      UPDATE satker_users 
      SET jabatan = 'Kasubbag Hukum', pic_subbag = 'HUKUM' 
      WHERE username = 'hukum'
    `).run();
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
  return db.prepare('SELECT id, username, nama_pejabat, jabatan, role_id, level, pic_subbag, is_active FROM satker_users ORDER BY level ASC, id ASC').all();
}

function getUserById(id) {
  return db.prepare('SELECT id, username, nama_pejabat, jabatan, role_id, level, pic_subbag, is_active FROM satker_users WHERE id = ?').get(id);
}

function saveUser(userData) {
  const id = userData.id ? Number(userData.id) : null;
  const username = (userData.username || '').trim().toLowerCase();
  const password = (userData.password || '').trim();
  const nama_pejabat = (userData.nama_pejabat || '').trim();
  const jabatan = (userData.jabatan || '').trim();
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
      SET username = ?, password = ?, nama_pejabat = ?, jabatan = ?, role_id = ?, level = ?, pic_subbag = ?, is_active = ?
      WHERE id = ?
    `).run(username, finalPass, nama_pejabat, jabatan, role_id, level, pic_subbag, is_active, id);

    return getUserById(id);
  } else {
    const exist = db.prepare('SELECT id FROM satker_users WHERE username = ?').get(username);
    if (exist) throw new Error(`Username "${username}" sudah terdaftar.`);

    const res = db.prepare(`
      INSERT INTO satker_users (username, password, nama_pejabat, jabatan, role_id, level, pic_subbag, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, password, nama_pejabat, jabatan, role_id, level, pic_subbag, is_active);

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
  updateRabBarisPicWithCascade,
  clearRabRows,
  reorderRow,
  getUsers,
  getUserById,
  saveUser,
  deleteUser,
  toggleUserStatus,
  authenticateUser,
  getMasters,
  updateSettings
};
