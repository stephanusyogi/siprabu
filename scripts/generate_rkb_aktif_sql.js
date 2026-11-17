const fs = require('fs');
const path = require('path');
const { db, getActivePeriode } = require('../src/db');

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
}

function generateRkbAktifSql() {
  const p = getActivePeriode();
  const periodeId = p.id;
  console.log(`[EXPORT-SQL] Mengekspor RKB Aktif: Periode ${periodeId} (${p.nama_periode})...`);

  const rows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC').all(periodeId);
  const kuantitas = db.prepare('SELECT * FROM master_kuantitas').all();

  let sql = `-- ============================================================================\n`;
  sql += `-- SINKRONISASI RKB AKTIF SI-PRABU KPU KABUPATEN NGAWI (LOCAL -> ONLINE)\n`;
  sql += `-- Periode ID: ${periodeId} (${p.nama_periode})\n`;
  sql += `-- Waktu Ekspor: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n`;
  sql += `-- Total Baris Belanja: ${rows.length}\n`;
  sql += `-- ============================================================================\n\n`;

  sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

  // 1. Sinkronisasi Periode Anggaran
  const pCols = Object.keys(p);
  sql += `-- 1. Data Periode Anggaran Aktif\n`;
  sql += `REPLACE INTO \`periode_anggaran\` (${pCols.map(c => `\`${c}\``).join(', ')})\nVALUES (${pCols.map(c => escapeSql(p[c])).join(', ')});\n\n`;

  // 2. Sinkronisasi Master Kuantitas SSOT
  if (kuantitas && kuantitas.length > 0) {
    const kCols = Object.keys(kuantitas[0]);
    sql += `-- 2. Master Kuantitas SSOT\n`;
    for (const k of kuantitas) {
      sql += `REPLACE INTO \`master_kuantitas\` (${kCols.map(c => `\`${c}\``).join(', ')}) VALUES (${kCols.map(c => escapeSql(k[c])).join(', ')});\n`;
    }
    sql += `\n`;
  }

  // 3. Bersihkan dan Isi rab_baris
  sql += `-- 3. Rincian Belanja RKB Aktif (Periode ${periodeId})\n`;
  sql += `DELETE FROM \`rab_baris\` WHERE \`periode_id\` = ${periodeId};\n\n`;

  if (rows.length > 0) {
    const cols = Object.keys(rows[0]);
    const colList = cols.map(c => `\`${c}\``).join(', ');
    const chunkSize = 100;

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      sql += `INSERT INTO \`rab_baris\` (${colList})\nVALUES\n`;
      const valStrings = chunk.map(r => `  (${cols.map(c => escapeSql(r[c])).join(', ')})`);
      sql += valStrings.join(',\n') + `;\n\n`;
    }
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n\n`;
  sql += `-- Selesai: ${rows.length} baris belanja siap diimpor di server online.\n`;

  const outputPath = path.resolve(__dirname, `rkb_aktif_${periodeId}_sync.sql`);
  fs.writeFileSync(outputPath, sql, 'utf8');

  console.log(`[EXPORT-SQL] Berhasil disimpan di: ${outputPath} (${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB)`);
  return outputPath;
}

generateRkbAktifSql();
process.exit(0);
