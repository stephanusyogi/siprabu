/**
 * SI-PRABU Clean Web Edition v3.0
 * Script Sinkronisasi RKB Aktif: Local MySQL -> Online Hostinger Cloud
 * Pengembang Resmi: emenje
 */

const https = require('https');
const http = require('http');
const { db, getActivePeriode } = require('../src/db');

async function pushRkbToOnline(targetUrl = 'https://siprabu.kpungawi.com') {
  console.log('================================================================');
  console.log('  SI-PRABU — Sinkronisasi RKB Aktif: Local -> Online');
  console.log(`  Target Server: ${targetUrl}`);
  console.log('================================================================');

  const activePeriode = getActivePeriode();
  const periodeId = activePeriode.id;
  console.log(`[1/3] Menyiapkan data RKB Aktif: Periode ID ${periodeId} (${activePeriode.nama_periode})...`);

  const rows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC').all(periodeId);
  const kuantitas = db.prepare('SELECT * FROM master_kuantitas').all();

  console.log(`      - Total Baris Belanja: ${rows.length}`);
  console.log(`      - Master Kuantitas SSOT: ${kuantitas.length} parameter`);

  const payload = JSON.stringify({
    periode: activePeriode,
    rab_baris: rows,
    master_kuantitas: kuantitas
  });

  const payloadSizeMb = (Buffer.byteLength(payload, 'utf8') / (1024 * 1024)).toFixed(2);
  console.log(`[2/3] Ukuran payload JSON: ${payloadSizeMb} MB. Mengirim ke ${targetUrl}...`);

  const syncKey = process.env.SIPRABU_SYNC_KEY || 'siprabu_sync_kpu_ngawi_2026_emenje';
  const urlObj = new URL(`${targetUrl}/api/developer/sync-rkb-from-local`);

  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
    path: urlObj.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload, 'utf8'),
      'x-sync-key': syncKey
    },
    timeout: 60000
  };

  const client = urlObj.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(options, res => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        console.log(`[3/3] HTTP Status: ${res.statusCode}`);
        try {
          const json = JSON.parse(responseBody);
          if (res.statusCode === 200 && json.success) {
            console.log('----------------------------------------------------------------');
            console.log('  BERHASIL 100%! RKB AKTIF BERHASIL DISINKRONKAN KE ONLINE.');
            console.log(`  Pesan: ${json.message}`);
            console.log(`  Total Baris: ${json.total_baris_disinkronkan || rows.length}`);
            console.log('----------------------------------------------------------------');
            resolve(json);
          } else {
            console.error('GAGAL: Server online menolak sinkronisasi:', json.error || responseBody);
            reject(new Error(json.error || responseBody));
          }
        } catch (e) {
          console.error('GAGAL: Respon server tidak valid:', responseBody.slice(0, 300));
          reject(e);
        }
      });
    });

    req.on('error', err => {
      console.error('Koneksi Error:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Koneksi ke server online timeout (60 detik).'));
    });

    req.write(payload);
    req.end();
  });
}

// Eksekusi jika dipanggil via node
if (require.main === module) {
  const target = process.argv[2] || 'https://siprabu.kpungawi.com';
  pushRkbToOnline(target)
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { pushRkbToOnline };
