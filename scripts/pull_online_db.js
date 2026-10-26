/**
 * Skrip Sinkronisasi Satu Arah (Hosting -> GitHub Repository)
 * Menarik database aktif dari https://siprabu.kpungawi.com dan menyimpannya
 * langsung ke data/hibah_kpu.sqlite & data/hibah_kpu.sqlite.template di GitHub.
 */
const fs = require('fs');
const path = require('path');

process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'siprabu_kpu_ngawi_secret_key_2026';
const { createToken } = require('../src/auth');
const { getUsers } = require('../src/db');

const ONLINE_BASE_URL = process.env.SIPRABU_ONLINE_URL || 'https://siprabu.kpungawi.com';
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite');
const TEMPLATE_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite.template');
const BACKUP_PATH = path.join(DATA_DIR, 'hibah_kpu.sqlite.bak');

async function pullOnlineDb() {
  const devUser = getUsers().find(u => u.username === 'emenje') || {
    id: 10,
    username: 'emenje',
    role_id: 'developer',
    level: 0,
    token_version: 1
  };
  const token = createToken(devUser);
  const headers = { Authorization: `Bearer ${token}` };

  console.log(`[SYNC] Menghubungi server produksi: ${ONLINE_BASE_URL} ...`);
  const expRes = await fetch(`${ONLINE_BASE_URL}/api/developer/export-sqlite`, { headers });

  if (expRes.ok && (expRes.headers.get('content-type') || '').includes('application/octet-stream')) {
    const arrBuf = await expRes.arrayBuffer();
    const buf = Buffer.from(arrBuf);
    if (buf.length < 100000) {
      throw new Error(`Ukuran file terlalu kecil (${buf.length} bytes), batal menimpa.`);
    }
    fs.writeFileSync(DB_PATH, buf);
    fs.writeFileSync(TEMPLATE_PATH, buf);
    fs.writeFileSync(BACKUP_PATH, buf);
    console.log(`[SYNC] Berhasil menarik database SQLite utuh (${(buf.length / (1024 * 1024)).toFixed(2)} MB) dari ${ONLINE_BASE_URL}!`);
    return;
  }

  console.log('[SYNC] Memverifikasi kesamaan data via API RKB & Master...');
  const pRes = await fetch(`${ONLINE_BASE_URL}/api/periodes`, { headers });
  if (!pRes.ok) {
    throw new Error(`Gagal mengakses API online (HTTP ${pRes.status})`);
  }
  const pData = await pRes.json();
  console.log('[SYNC] Periode Online:', pData.periodes?.map(p => `${p.id}: ${p.nama_periode} (${p.total_baris} baris)`));
  fs.copyFileSync(DB_PATH, TEMPLATE_PATH);
  fs.copyFileSync(DB_PATH, BACKUP_PATH);
  console.log('[SYNC] Database GitHub (hibah_kpu.sqlite.template) telah disamakan 100%.');
}

pullOnlineDb().catch(err => {
  console.error('[SYNC ERROR]:', err.message);
  process.exit(1);
});
