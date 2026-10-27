const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

function convertSqliteTypeToMysql(colName, colType, notNull = false, dflt = null, isPk = false) {
  const type = (colType || 'TEXT').toUpperCase();
  const lowerCol = colName.toLowerCase();

  let nullClause = notNull ? ' NOT NULL' : ' NULL';
  let defaultClause = '';
  if (dflt !== null && dflt !== undefined) {
    if (dflt.toUpperCase() === 'CURRENT_TIMESTAMP') {
      defaultClause = ' DEFAULT CURRENT_TIMESTAMP';
    } else if (dflt.startsWith("'") && dflt.endsWith("'")) {
      defaultClause = ` DEFAULT ${dflt}`;
    } else {
      defaultClause = ` DEFAULT ${dflt}`;
    }
  }

  // Primary key integer
  if (isPk && (type === 'INTEGER' || type === 'INT')) {
    return 'INT NOT NULL AUTO_INCREMENT';
  }

  // Kolom identitas teks & kode
  if (
    lowerCol === 'id' && (type.includes('VARCHAR') || type.includes('TEXT'))
  ) {
    return `VARCHAR(64)${nullClause}${defaultClause || ''}`;
  }

  // Kolom boolean / flag status
  if (
    lowerCol.startsWith('is_') || lowerCol.startsWith('has_') ||
    lowerCol.endsWith('_locked') || lowerCol === 'status' || lowerCol === 'active'
  ) {
    if (type === 'INTEGER' || type === 'INT' || type === 'TINYINT' || type === 'BOOLEAN') {
      return `TINYINT(1)${nullClause}${defaultClause || ' DEFAULT 0'}`;
    }
    return `VARCHAR(50)${nullClause}${defaultClause || ''}`;
  }

  // Kolom teks yang TIDAK BOLEH dikonversi ke DOUBLE (misal: f1_unit, f1_var, pic_bagian, row_type)
  const isExplicitTextColumn = (
    lowerCol.endsWith('_unit') || lowerCol.endsWith('_var') ||
    lowerCol === 'f1_unit' || lowerCol === 'f2_unit' || lowerCol === 'f3_unit' || lowerCol === 'f4_unit' ||
    lowerCol === 'f1_var' || lowerCol === 'f2_var' || lowerCol === 'f3_var' || lowerCol === 'f4_var' ||
    lowerCol === 'row_type' || lowerCol === 'target_scope' || lowerCol === 'basis_pengali' ||
    lowerCol === 'satuan_vol' || lowerCol === 'pic_bagian' || lowerCol === 'sifat_biaya' ||
    lowerCol === 'jenis_biaya' || lowerCol === 'uraian' || lowerCol === 'catatan' ||
    lowerCol.includes('nama') || lowerCol.includes('kode') || lowerCol.includes('nip') ||
    lowerCol.includes('nomor') || lowerCol.includes('token') || lowerCol.includes('keterangan')
  );

  if (isExplicitTextColumn) {
    if (lowerCol === 'uraian' || lowerCol.includes('catatan') || lowerCol.includes('keterangan') || lowerCol.includes('json') || lowerCol.includes('values') || lowerCol.includes('payload')) {
      return `LONGTEXT${nullClause}`;
    }
    if (lowerCol === 'kode' || lowerCol === 'kode_akun' || lowerCol.includes('nip') || lowerCol.includes('unit') || lowerCol.includes('var') || lowerCol.length <= 10) {
      return `VARCHAR(50)${nullClause}${defaultClause || (notNull ? '' : ' DEFAULT NULL')}`;
    }
    return `VARCHAR(255)${nullClause}${defaultClause || (notNull ? '' : ' DEFAULT NULL')}`;
  }

  // Tipe teks standar SQLite
  if (type === 'TEXT' || type.includes('VARCHAR') || type.includes('CHAR')) {
    if (
      lowerCol.includes('kode') || lowerCol.includes('nip') || lowerCol.includes('unit') || lowerCol.includes('var') ||
      lowerCol.includes('pic') || lowerCol.includes('key') || lowerCol.includes('satuan') ||
      lowerCol.includes('nama') || lowerCol.includes('judul') || lowerCol.includes('tahap') ||
      lowerCol === 'row_type' || lowerCol === 'target_scope' || lowerCol === 'basis_pengali'
    ) {
      return `VARCHAR(255)${nullClause}${defaultClause || (notNull ? '' : ' DEFAULT NULL')}`;
    }
    return `LONGTEXT${nullClause}`;
  }

  // Kolom numerik pecahan (harga, pagu, f1_val s.d. f4_val, diff, jumlah, total)
  if (
    type === 'REAL' || type === 'FLOAT' || type === 'DOUBLE' ||
    lowerCol === 'f1_val' || lowerCol === 'f2_val' || lowerCol === 'f3_val' || lowerCol === 'f4_val' ||
    lowerCol.includes('harga') || lowerCol.includes('pagu') || lowerCol.includes('total') ||
    lowerCol.includes('semula') || lowerCol.includes('menjadi') || lowerCol.includes('diff') ||
    lowerCol.includes('jumlah')
  ) {
    if (type === 'INTEGER' || type === 'INT') {
      if (lowerCol.includes('harga') || lowerCol.includes('pagu') || lowerCol.includes('total') || lowerCol.includes('jumlah')) {
        return `DOUBLE${nullClause}${defaultClause || ' DEFAULT 0'}`;
      }
      return `INT${nullClause}${defaultClause || (notNull ? '' : ' DEFAULT NULL')}`;
    }
    return `DOUBLE${nullClause}${defaultClause || ' DEFAULT 0'}`;
  }

  if (type === 'INTEGER' || type === 'INT') {
    return `INT${nullClause}${defaultClause || (notNull ? '' : ' DEFAULT NULL')}`;
  }

  return `VARCHAR(255)${nullClause}${defaultClause || (notNull ? '' : ' DEFAULT NULL')}`;
}

function exportSqliteToMysql(customDbPath = null, customOutPath = null) {
  const dbPath = customDbPath || path.resolve(__dirname, '../data/hibah_kpu.sqlite');
  const outPath = customOutPath || path.resolve(__dirname, '../siprabu_siap_phpmyadmin.sql');

  const db = new DatabaseSync(dbPath);
  try {
    db.exec('PRAGMA wal_checkpoint(PASSIVE);');
  } catch (e) {}

  const tables = db.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log('Found tables:', tables.map(t => t.name));

  let sqlOutput = `-- ============================================================================
-- SI-PRABU MySQL Dump
-- Tanggal Ekspor: ${new Date().toISOString()}
-- Kompatibel dengan MySQL 5.7+ / MySQL 8.0+ / MariaDB (phpMyAdmin)
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+07:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

`;

  for (const t of tables) {
    const tableName = t.name;
    console.log(`Exporting table: ${tableName}`);

    const cols = db.prepare(`PRAGMA table_info('${tableName}')`).all();
    const indices = db.prepare(`PRAGMA index_list('${tableName}')`).all();

    const pkCols = cols.filter(c => c.pk > 0).sort((a, b) => a.pk - b.pk);
    const hasSingleIntegerPk = pkCols.length === 1 && (pkCols[0].type.toUpperCase() === 'INTEGER' || pkCols[0].type.toUpperCase() === 'INT');

    sqlOutput += `-- ----------------------------------------------------------------------------\n`;
    sqlOutput += `-- Struktur Tabel: \`${tableName}\`\n`;
    sqlOutput += `-- ----------------------------------------------------------------------------\n`;
    sqlOutput += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
    sqlOutput += `CREATE TABLE \`${tableName}\` (\n`;

    const colDefs = [];
    for (const c of cols) {
      const isPk = c.pk > 0;
      const isAutoPk = isPk && hasSingleIntegerPk;
      const mysqlType = convertSqliteTypeToMysql(c.name, c.type, c.notnull === 1, c.dflt_value, isAutoPk);
      colDefs.push(`  \`${c.name}\` ${mysqlType}`);
    }

    if (pkCols.length > 0) {
      colDefs.push(`  PRIMARY KEY (${pkCols.map(p => `\`${p.name}\``).join(', ')})`);
    }

    for (const idx of indices) {
      if (idx.origin === 'pk') continue;
      const idxInfo = db.prepare(`PRAGMA index_info('${idx.name}')`).all();
      const colNames = idxInfo.map(i => `\`${i.name}\``).join(', ');
      if (idx.unique === 1) {
        colDefs.push(`  UNIQUE KEY \`${idx.name}\` (${colNames})`);
      } else {
        colDefs.push(`  KEY \`${idx.name}\` (${colNames})`);
      }
    }

    sqlOutput += colDefs.join(',\n');
    sqlOutput += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // Dump Data
    const rows = db.prepare(`SELECT * FROM \`${tableName}\``).all();
    if (rows.length > 0) {
      sqlOutput += `-- Data untuk tabel: \`${tableName}\` (${rows.length} baris)\n`;
      const colNames = cols.map(c => `\`${c.name}\``).join(', ');

      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        sqlOutput += `INSERT INTO \`${tableName}\` (${colNames}) VALUES\n`;

        const valLines = chunk.map(row => {
          const vals = cols.map(c => {
            const v = row[c.name];
            if (v === null || v === undefined) return 'NULL';
            if (typeof v === 'number') return v;
            const str = String(v)
              .replace(/\\/g, '\\\\')
              .replace(/'/g, "\\'")
              .replace(/\r/g, '\\r')
              .replace(/\n/g, '\\n')
              .replace(/\0/g, '\\0');
            return `'${str}'`;
          });
          return `(${vals.join(', ')})`;
        });

        sqlOutput += valLines.join(',\n') + ';\n';
      }
    }
  }

  sqlOutput += `
COMMIT;
SET FOREIGN_KEY_CHECKS = 1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
`;

  fs.writeFileSync(outPath, sqlOutput, 'utf8');
  const templatePath = path.resolve(__dirname, '../data/hibah_kpu.sqlite.template');
  try {
    fs.copyFileSync(dbPath, templatePath);
  } catch (e) {}
  console.log('Successfully generated MySQL dump at:', outPath);
  console.log('File size:', (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2), 'MB');
  return { outPath, tableCount: tables.length };
}

if (require.main === module) {
  exportSqliteToMysql();
}

module.exports = {
  convertSqliteTypeToMysql,
  exportSqliteToMysql
};
