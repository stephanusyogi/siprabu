/**
 * Skrip Sinkronisasi Satu Arah (Hosting -> GitHub Repository / Lokal)
 * Menarik database aktif dari https://siprabu.kpungawi.com dan menyimpannya
 * langsung ke berkas SQL dump siap-pakai phpMyAdmin (siprabu_siap_phpmyadmin.sql)
 * serta mengimpor dan menyelaraskan seluruh data RKB Aktif ke SQLite lokal (data/hibah_kpu.sqlite).
 */
const fs = require('fs');
const path = require('path');

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'siprabu_kpu_ngawi_secret_key_2026';
const { createToken } = require('../src/auth');
const { convertMysqlDumpToSqlite } = require('../src/backup');

const ONLINE_BASE_URL = process.env.SIPRABU_ONLINE_URL || 'https://siprabu.kpungawi.com';
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MYSQL_DUMP_PATH = path.resolve(__dirname, '..', 'siprabu_siap_phpmyadmin.sql');
const DB_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite');
const TEMPLATE_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite.template');
const BACKUP_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite.bak');
const SYNC_KEY = process.env.SIPRABU_SYNC_KEY || 'siprabu_sync_kpu_ngawi_2026_emenje';

async function pullOnlineDb() {
  const devUser = {
    id: 10,
    username: 'emenje',
    role_id: 'developer',
    level: 0,
    token_version: 1
  };
  const token = createToken(devUser);
  const headers = {
    Authorization: `Bearer ${token}`,
    'x-sync-key': SYNC_KEY
  };

  console.log(`[SYNC] Menghubungi server produksi: ${ONLINE_BASE_URL} ...`);
  try {
    // 1. Prioritaskan penarikan SQL Dump MySQL / phpMyAdmin
    const expMysqlRes = await fetch(`${ONLINE_BASE_URL}/api/developer/export-mysql`, { headers, signal: AbortSignal.timeout(30000) });

    if (expMysqlRes.ok) {
      const text = await expMysqlRes.text();
      if (text.length > 1000 && text.includes('INSERT INTO')) {
        fs.writeFileSync(MYSQL_DUMP_PATH, text, 'utf8');
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
        fs.writeFileSync(path.join(BACKUP_DIR, 'siprabu_online_latest.sql'), text, 'utf8');
        console.log(`[SYNC] Berhasil menarik Full MySQL Dump (${(text.length / (1024 * 1024)).toFixed(2)} MB) dari ${ONLINE_BASE_URL}!`);
        console.log(`[SYNC] Berkas siap diimpor ke phpMyAdmin: ${MYSQL_DUMP_PATH}`);

        // Konversi dan impor penuh seluruh tabel (termasuk RKB Aktif) ke database SQLite lokal
        console.log('[SYNC] Menyelaraskan seluruh data ke SQLite lokal...');
        convertMysqlDumpToSqlite(text, DB_PATH);
        fs.copyFileSync(DB_PATH, TEMPLATE_PATH);
        fs.copyFileSync(DB_PATH, BACKUP_PATH);

        const { getRkbCalculatedDataset, clearRkbDatasetCache } = require('../src/calculation');
        clearRkbDatasetCache();
        const calc = getRkbCalculatedDataset(1000003);
        console.log(`[SYNC] SQLite lokal berhasil diperbarui! RKB Aktif: ${calc.rows.length} baris, Pagu: Rp ${calc.summary.grandTotal.toLocaleString('id-ID')}`);
        return;
      }
    }

    // 2. Fallback jika server online masih berada di versi lama yang hanya menyediakan endpoint export-sqlite
    const expRes = await fetch(`${ONLINE_BASE_URL}/api/developer/export-sqlite`, { headers, signal: AbortSignal.timeout(30000) });

    if (expRes.ok) {
      const cType = expRes.headers.get('content-type') || '';
      if (cType.includes('application/sql') || cType.includes('text/plain')) {
        const text = await expRes.text();
        fs.writeFileSync(MYSQL_DUMP_PATH, text, 'utf8');
        console.log(`[SYNC] Berhasil menarik MySQL Dump dari ${ONLINE_BASE_URL}! Disimpan ke ${MYSQL_DUMP_PATH}`);

        convertMysqlDumpToSqlite(text, DB_PATH);
        fs.copyFileSync(DB_PATH, TEMPLATE_PATH);
        fs.copyFileSync(DB_PATH, BACKUP_PATH);
        clearRkbDatasetCache();
        const calc = getRkbCalculatedDataset(1000003);
        console.log(`[SYNC] SQLite lokal berhasil diperbarui! RKB Aktif: ${calc.rows.length} baris, Pagu: Rp ${calc.summary.grandTotal.toLocaleString('id-ID')}`);
        return;
      }

      if (cType.includes('application/octet-stream')) {
        const arrBuf = await expRes.arrayBuffer();
        const buf = Buffer.from(arrBuf);
        if (buf.length >= 100000) {
          fs.writeFileSync(DB_PATH, buf);
          fs.writeFileSync(TEMPLATE_PATH, buf);
          fs.writeFileSync(BACKUP_PATH, buf);
          clearRkbDatasetCache();
          console.log(`[SYNC] Berhasil menarik arsip database legacy (${(buf.length / (1024 * 1024)).toFixed(2)} MB) dari ${ONLINE_BASE_URL}!`);
          return;
        }
      }
    }

    if (expRes.status === 401 || expRes.status === 403) {
      console.log('[SYNC] Server online memerlukan otorisasi terbaru.');
    }
  } catch (err) {
    console.warn('[SYNC WARNING] Tidak dapat terhubung ke server online:', err.message);
  }

  console.log('[SYNC] Database lokal siap.');
}

pullOnlineDb().catch(err => {
  console.error('[SYNC ERROR]:', err.message);
  process.exit(1);
});
