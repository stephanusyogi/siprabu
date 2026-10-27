const https = require('https');
const fs = require('fs');
const path = require('path');

const rowsFile = path.join(__dirname, 'rows_to_restore.json');
if (!fs.existsSync(rowsFile)) {
  console.error('File rows_to_restore.json tidak ditemukan!');
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(rowsFile, 'utf8'));
console.log(`[RESTORASI] Memuat ${rows.length} baris belanja PARSDM untuk dipulihkan...`);

const payload = JSON.stringify({
  periode_id: 1000003,
  rows: rows
});

const options = {
  hostname: 'siprabu.kpungawi.com',
  port: 443,
  path: '/api/developer/restore-lost-rows',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'x-sync-key': process.env.SIPRABU_SYNC_KEY || 'siprabu_sync_kpu_ngawi_2026_emenje'
  }
};

console.log('[RESTORASI] Mengirim permintaan restorasi ke https://siprabu.kpungawi.com/api/developer/restore-lost-rows ...');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`[RESTORASI] Status Response: HTTP ${res.statusCode}`);
    try {
      const json = JSON.parse(data);
      console.log('[RESTORASI] Hasil:', JSON.stringify(json, null, 2));
      if (json.success) {
        console.log(`\n🎉 RESTORASI BERHASIL 100%!`);
        console.log(`- Jumlah baris dipulihkan : ${json.restored_count}`);
        console.log(`- Total baris RKB Aktif   : ${json.total_rows}`);
        console.log(`- Pagu Akhir Seimbang     : Rp ${(json.grand_total || 0).toLocaleString('id-ID')}`);
      } else {
        console.error('Restorasi gagal:', json.error);
      }
    } catch (e) {
      console.log('Raw output:', data);
    }
  });
});

req.on('error', (err) => {
  console.error('[RESTORASI ERROR]:', err.message);
});

req.write(payload);
req.end();
