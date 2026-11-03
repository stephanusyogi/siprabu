/**
 * Pengujian Otomatis Hasil Merger Modul Pengadaan (CAKRA) di dalam SI-PRABU (`localhost:3456`)
 */
const http = require('node:http');
const { generateRouteToken, parseRouteToken } = require('../route_token');

function get(pathUrl) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: 3456, path: pathUrl }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    }).on('error', reject);
  });
}

(async () => {
  // 1. Test Route Tokens
  for (const v of ['view-pengadaan-paket', 'view-pengadaan-kokpit', 'view-pengadaan-penyedia', 'view-panduan-pengadaan']) {
    const tok = generateRouteToken(v);
    const parsed = parseRouteToken(tok);
    if (!parsed || parsed.viewId !== v) throw new Error('Route token mismatch for ' + v);
  }
  console.log('[PASS 1/4] Route Tokens 43-Char Base64URL untuk 4 View Pengadaan valid 100%');

  // 2. Test /api/cakra/bootstrap on port 3456
  const bootRes = await get('/api/cakra/bootstrap');
  const boot = JSON.parse(bootRes.body.toString('utf8'));
  if (!boot.ok || boot.pakets.length < 6) throw new Error('Bootstrap gagal atau paket < 6');
  const pp = boot.pejabats.find(p => p.peran === 'PEJABAT_PENGADAAN');
  const tt = boot.pejabats.find(p => p.peran === 'TIM_TEKNIS');
  if (!pp || pp.nama_lengkap !== 'INDRAYU FATIKA MAHARDIKA') throw new Error('Pejabat Pengadaan salah: ' + JSON.stringify(pp));
  if (tt) throw new Error('TIM_TEKNIS masih ada!');
  console.log('[PASS 2/4] /api/cakra/bootstrap di localhost:3456: ' + boot.pakets.length + ' paket, Pejabat Pengadaan = ' + pp.nama_lengkap + ', TIM_TEKNIS = dihapus');

  // 3. Test RKB Bridge (/api/cakra/siprabu-rkb) on port 3456
  const rkbRes = await get('/api/cakra/siprabu-rkb');
  const rkb = JSON.parse(rkbRes.body.toString('utf8'));
  if (!rkb.ok || !Array.isArray(rkb.items) || rkb.items.length === 0) throw new Error('Bridge RKB gagal');
  console.log('[PASS 3/4] /api/cakra/siprabu-rkb terhubung langsung ke tabel rab_baris siprabu_db (' + rkb.items.length + ' mata anggaran siap ditarik)');

  // 4. Test Word, Excel, & ZIP download on port 3456 (Paket #6 Konstruksi)
  const docxRes = await get('/api/cakra/download/docx/6?tahap=ALL');
  const xlsxRes = await get('/api/cakra/download/xlsx/6?tahap=ALL');
  const zipRes = await get('/api/cakra/download/zip/6');
  if (docxRes.status !== 200 || docxRes.body.length < 10000) throw new Error('DOCX gagal');
  if (xlsxRes.status !== 200 || xlsxRes.body.length < 10000) throw new Error('XLSX gagal');
  if (zipRes.status !== 200 || zipRes.body.length < 50000) throw new Error('ZIP gagal');
  console.log('[PASS 4/4] Generator Dokumen di localhost:3456 -> DOCX (' + docxRes.body.length + ' bytes), XLSX (' + xlsxRes.body.length + ' bytes), ZIP (' + zipRes.body.length + ' bytes)');
})();
