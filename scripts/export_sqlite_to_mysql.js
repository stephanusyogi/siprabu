const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/hibah_kpu.sqlite');
const outPath = path.resolve(__dirname, '../siprabu_siap_phpmyadmin.sql');

const db = new DatabaseSync(dbPath);

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
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

`;

function convertSqliteTypeToMysql(type, colName, isPk, maxVal) {
  const t = (type || '').toUpperCase().trim();
  const lowerCol = colName.toLowerCase();

  if (isPk) {
    if (lowerCol === 'id' && (t === 'INTEGER' || t === 'INT' || t === '')) {
      return 'INT NOT NULL AUTO_INCREMENT';
    }
    return 'VARCHAR(191) NOT NULL';
  }

  if (lowerCol.includes('timestamp') || lowerCol.includes('time_ms') || lowerCol === 'ts' || (maxVal && maxVal > 2147483647)) {
    return 'BIGINT NULL DEFAULT NULL';
  }

  if (
    t === 'REAL' || t === 'FLOAT' || t === 'DOUBLE' ||
    lowerCol.includes('harga') || lowerCol.includes('pagu') || lowerCol.includes('total') ||
    lowerCol.includes('semula') || lowerCol.includes('menjadi') || lowerCol.includes('diff') ||
    lowerCol.includes('jumlah') || lowerCol.startsWith('f1_') || lowerCol.startsWith('f2_') ||
    lowerCol.startsWith('f3_') || lowerCol.startsWith('f4_')
  ) {
    if (t === 'INTEGER' || t === 'INT') {
      if (lowerCol.includes('harga') || lowerCol.includes('pagu') || lowerCol.includes('total')) {
        return 'DOUBLE NULL DEFAULT 0';
      }
      return 'INT NULL DEFAULT NULL';
    }
    return 'DOUBLE NULL DEFAULT 0';
  }

  if (t === 'INTEGER' || t === 'INT') return 'INT NULL DEFAULT NULL';
  if (t === 'BOOLEAN') return 'TINYINT(1) DEFAULT 0';
  if (t === 'TEXT') {
    if (
      lowerCol.includes('id') || lowerCol.includes('kode') || lowerCol.includes('status') ||
      lowerCol.includes('role') || lowerCol.includes('username') || lowerCol.includes('email') ||
      lowerCol.includes('nip') || lowerCol.includes('unit') || lowerCol.includes('var') ||
      lowerCol.includes('pic') || lowerCol.includes('key')
    ) {
      return 'VARCHAR(255) NULL DEFAULT NULL';
    }
    return 'LONGTEXT NULL';
  }
  return 'VARCHAR(255) NULL DEFAULT NULL';
}

for (const t of tables) {
  const tableName = t.name;
  console.log('Exporting table:', tableName);

  // Ambil info kolom
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all();
  
  sqlOutput += `\n-- --------------------------------------------------------\n`;
  sqlOutput += `-- Struktur dari tabel \`${tableName}\`\n`;
  sqlOutput += `-- --------------------------------------------------------\n\n`;
  sqlOutput += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
  sqlOutput += `CREATE TABLE \`${tableName}\` (\n`;

  const colDefs = [];
  let pkCol = null;

  for (const c of cols) {
    const isPk = c.pk === 1;
    if (isPk) pkCol = c.name;
    const mysqlType = convertSqliteTypeToMysql(c.type, c.name, isPk);
    colDefs.push(`  \`${c.name}\` ${mysqlType}`);
  }

  if (pkCol) {
    colDefs.push(`  PRIMARY KEY (\`${pkCol}\`)`);
  }

  sqlOutput += colDefs.join(',\n') + '\n';
  sqlOutput += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

  // Ambil data
  const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
  if (rows.length > 0) {
    sqlOutput += `-- Dumping data untuk tabel \`${tableName}\` (${rows.length} baris)\n`;
    
    // Batch insert 100 rows per statement
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const colNames = Object.keys(chunk[0]);
      
      sqlOutput += `INSERT INTO \`${tableName}\` (\`${colNames.join('`, `')}\`) VALUES\n`;
      
      const valLines = chunk.map(row => {
        const vals = colNames.map(col => {
          const v = row[col];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          // Escape string
          const escaped = String(v)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
            .replace(/\0/g, '\\0');
          return `'${escaped}'`;
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
const externalDbDir = 'D:/OFFICE/2026/Aplikasi/Si Prabu/Database';
if (fs.existsSync(externalDbDir)) {
  try {
    fs.writeFileSync(path.join(externalDbDir, 'siprabu_siap_phpmyadmin.sql'), sqlOutput, 'utf8');
  } catch (e) {}
}
const templatePath = path.resolve(__dirname, '../data/hibah_kpu.sqlite.template');
try {
  fs.copyFileSync(dbPath, templatePath);
} catch (e) {}
console.log('Successfully generated MySQL dump at:', outPath);
console.log('File size:', (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2), 'MB');
