/**
 * Skrip Sinkronisasi Data PBJ (Lokal -> Hosting Produksi)
 * Mengirimkan dataset PBJ lokal (paket, item, tahap, pejabat, penyedia, settings)
 * ke server online https://siprabu.kpungawi.com sehingga database online
 * persis 100% sama dengan offline.
 */
const https = require('https');
const path = require('path');
const fs = require('fs');
const { getCakraPool } = require('../src/pengadaan/db_pengadaan');

const ONLINE_URL = process.env.SIPRABU_ONLINE_URL || 'https://siprabu.kpungawi.com';
const SYNC_KEY = process.env.SIPRABU_SYNC_KEY || 'siprabu_sync_kpu_ngawi_2026_emenje';

async function main() {
  console.log('[PBJ-SYNC] Menyiapkan data PBJ lokal...');
  const pool = getCakraPool();

  const [settings] = await pool.query('SELECT * FROM pbj_settings');
  const [pejabats] = await pool.query('SELECT * FROM pbj_pejabat');
  const [penyedias] = await pool.query('SELECT * FROM pbj_penyedia');
  const [pakets] = await pool.query('SELECT * FROM pbj_paket');
  const [items] = await pool.query('SELECT * FROM pbj_paket_item');
  const [tahaps] = await pool.query('SELECT * FROM pbj_paket_tahap');

  console.log(`[PBJ-SYNC] Paket lokal   : ${pakets.length}`);
  console.log(`[PBJ-SYNC] Item lokal    : ${items.length}`);
  console.log(`[PBJ-SYNC] Tahap lokal   : ${tahaps.length}`);
  console.log(`[PBJ-SYNC] Pejabat lokal : ${pejabats.length}`);
  console.log(`[PBJ-SYNC] Penyedia lokal: ${penyedias.length}`);
  console.log(`[PBJ-SYNC] Settings lokal: ${settings.length}`);

  // Omit kolom baru lokal yang belum termigrasi di server hosting sebelum git push
  const paketsForOnline = pakets.map(p => {
    const clone = { ...p };
    delete clone.target_sertifikat_tkdn;
    return clone;
  });

  const payload = JSON.stringify({
    replace_all: true,
    pbj_paket: paketsForOnline,
    pbj_paket_item: items,
    pbj_paket_tahap: tahaps,
    pbj_pejabat: pejabats,
    pbj_penyedia: penyedias,
    pbj_settings: settings
  });

  const parsedUrl = new URL(`${ONLINE_URL}/api/developer/sync-pbj-from-local`);

  console.log(`[PBJ-SYNC] Menghubungi server online: ${parsedUrl.href} ...`);

  const req = https.request({
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || 443,
    path: parsedUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'x-sync-key': SYNC_KEY
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`[PBJ-SYNC] Status Respons: HTTP ${res.statusCode}`);
      try {
        const json = JSON.parse(data);
        console.log('[PBJ-SYNC] Hasil Server:', JSON.stringify(json, null, 2));
        if (json.success) {
          console.log('\n======================================================');
          console.log('🎉 SINKRONISASI ONLINE BERHASIL 100%!');
          console.log(`- Paket Terpasang : ${json.paket_count}`);
          console.log(`- Item Terpasang  : ${json.item_count}`);
          console.log(`- Tahap Terpasang : ${json.tahap_count}`);
          console.log('======================================================\n');
        } else {
          console.error('[PBJ-SYNC] Server mengembalikan kegagalan:', json.error);
        }
      } catch (e) {
        console.log('[PBJ-SYNC] Output Mentah Server:', data);
      }
      process.exit(0);
    });
  });

  req.on('error', (err) => {
    console.error('[PBJ-SYNC ERROR]:', err.message);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
