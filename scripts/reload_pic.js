const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/hibah_kpu.sqlite');
const db = new DatabaseSync(dbPath);

console.log('1. Reloading PIC for Periode 1000003 from Periode 1...');
const res = db.prepare(`
  UPDATE rab_baris
  SET pic_bagian = (
    SELECT p1.pic_bagian
    FROM rab_baris p1
    WHERE p1.id = rab_baris.semula_row_id
  )
  WHERE periode_id = 1000003 AND semula_row_id IS NOT NULL
`).run();
console.log('Updated rows in Periode 1000003:', res.changes);

console.log('Periode 1 counts:');
console.table(db.prepare('SELECT pic_bagian, count(*) as count FROM rab_baris WHERE periode_id=1 GROUP BY pic_bagian').all());

console.log('Periode 1000003 counts:');
console.table(db.prepare('SELECT pic_bagian, count(*) as count FROM rab_baris WHERE periode_id=1000003 GROUP BY pic_bagian').all());
