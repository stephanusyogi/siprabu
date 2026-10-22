/**
 * SI-PRABU Clean Web Edition v3.0
 * Skrip Utilitas Sinkronisasi PIC Baris Revisi dari Dokumen Semula
 * Kompatibel dengan Audit Log & Perlindungan Dokumen Terkunci
 * Pengembang: emenje
 */

const { db, getPeriodeById, recordAuditLog } = require('../src/db');
const { clearRkbDatasetCache } = require('../src/calculation');

const targetPeriodeId = 1000003;
const sourcePeriodeId = 1;

console.log(`[RELOAD_PIC] Memeriksa dokumen target ID: ${targetPeriodeId}...`);
const targetPeriode = getPeriodeById(targetPeriodeId);
if (!targetPeriode) {
  console.error(`[RELOAD_PIC] Dokumen periode target ${targetPeriodeId} tidak ditemukan.`);
  process.exit(1);
}

const isForce = process.argv.includes('--force');
if (targetPeriode.is_locked && !isForce) {
  console.warn(`[PERINGATAN] Dokumen "${targetPeriode.nama_periode}" berstatus TERKUNCI (is_locked = 1).`);
  console.warn('Perubahan langsung pada dokumen terkunci dicegah demi menjaga integritas arsip.');
  console.warn('Jika memang diperlukan pemulihan data resmi, jalankan dengan flag: node scripts/reload_pic.js --force');
  process.exit(0);
}

console.log(`1. Sinkronisasi PIC untuk Periode ${targetPeriodeId} dari Periode ${sourcePeriodeId}...`);
const res = db.prepare(`
  UPDATE rab_baris
  SET pic_bagian = (
    SELECT p1.pic_bagian
    FROM rab_baris p1
    WHERE p1.id = rab_baris.semula_row_id
  )
  WHERE periode_id = ? AND semula_row_id IS NOT NULL
`).run(targetPeriodeId);

console.log(`Updated rows in Periode ${targetPeriodeId}:`, res.changes);

// Invalidate cache setelah perubahan
clearRkbDatasetCache(targetPeriodeId);

// Catat ke audit log
recordAuditLog({
  user: { id: 0, username: 'system_cli', role_id: 'developer' },
  action: 'UTILITY_RELOAD_PIC',
  entity: 'rab_baris',
  entity_id: targetPeriodeId,
  notes: `Sinkronisasi PIC baris revisi dari periode ${sourcePeriodeId} (${res.changes} baris terupdate).`
});

console.log('Periode 1 counts:');
console.table(db.prepare('SELECT pic_bagian, count(*) as count FROM rab_baris WHERE periode_id=? GROUP BY pic_bagian').all(sourcePeriodeId));

console.log(`Periode ${targetPeriodeId} counts:`);
console.table(db.prepare('SELECT pic_bagian, count(*) as count FROM rab_baris WHERE periode_id=? GROUP BY pic_bagian').all(targetPeriodeId));
console.log('[RELOAD_PIC] Selesai.');
