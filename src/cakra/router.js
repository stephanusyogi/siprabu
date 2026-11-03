/**
 * SI-PRABU v3.0 — Router API Modul Pengadaan (CAKRA Engine)
 * Menangani endpoint `/api/cakra/*` untuk 18 Tahap Pengadaan Hulu-ke-Hilir
 * Pengembang Resmi: emenje
 */

const archiver = require('archiver');
const {
  initDatabaseSchemaAndSeed,
  getSettingsMap,
  saveSettingsMap,
  getPejabatList,
  savePejabat,
  getPenyediaList,
  savePenyedia,
  getPaketList,
  getPaketFullById,
  savePaket,
  deletePaket,
  savePaketItems,
  savePaketTahaps,
  autoGeneratePaketTahaps,
  fetchRkbItemsFromSiprabu
} = require('./db_cakra');

const {
  DEFINISI_18_TAHAP,
  hitungKeuanganKontrak,
  hitungKonversiSbob,
  evaluasiJalurRegulasi
} = require('./utils');

const { generateExcelBuffer } = require('./excel_engine');
const { generateWordBuffer } = require('./word_engine');

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 15 * 1024 * 1024) {
        reject(new Error('Payload terlalu besar'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(new Error('Format JSON tidak valid'));
      }
    });
    req.on('error', reject);
  });
}

function sanitizeFilename(str) {
  return String(str || 'Dokumen_Pengadaan')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 80);
}

async function handleCakraApiRequest(req, res, pathname, query = {}) {
  const method = req.method.toUpperCase();

  try {
    // 1. Bootstrap Data Dashboard & Master Pengadaan
    if (pathname === '/api/cakra/bootstrap' && method === 'GET') {
      const [settings, pejabats, penyedias, pakets] = await Promise.all([
        getSettingsMap(),
        getPejabatList(),
        getPenyediaList(),
        getPaketList()
      ]);

      let totalPagu = 0;
      let totalHps = 0;
      let totalKontrak = 0;
      let totalPaketUmk = 0;
      let nilaiKontrakUmk = 0;
      let sumTkdn = 0;

      for (const p of pakets) {
        totalPagu += Number(p.nilai_pagu || 0);
        totalHps += Number(p.nilai_hps || 0);
        totalKontrak += Number(p.nilai_kontrak || 0);
        sumTkdn += Number(p.persen_tkdn_target || 0);
        if (Number(p.peruntukan_umk) === 1) {
          totalPaketUmk++;
          nilaiKontrakUmk += Number(p.nilai_kontrak || 0);
        }
      }

      const persenAlokasiUmk = totalKontrak > 0 ? Number(((nilaiKontrakUmk / totalKontrak) * 100).toFixed(1)) : 100;
      const rataTkdn = pakets.length > 0 ? Number((sumTkdn / pakets.length).toFixed(1)) : 45;

      return sendJson(res, 200, {
        ok: true,
        settings,
        pejabats,
        penyedias,
        pakets,
        definisi18Tahap: DEFINISI_18_TAHAP,
        summary: {
          jumlahPaket: pakets.length,
          totalPagu,
          totalHps,
          totalKontrak,
          totalEfisiensi: Math.max(0, totalPagu - totalKontrak),
          totalPaketUmk,
          persenAlokasiUmk,
          rataTkdn
        }
      });
    }

    // 2. Detail Lengkap 1 Paket
    if (pathname.startsWith('/api/cakra/paket/') && method === 'GET' && !pathname.endsWith('/items') && !pathname.endsWith('/tahaps')) {
      const id = Number(pathname.split('/').pop());
      const ctx = await getPaketFullById(id);
      if (!ctx) return sendJson(res, 404, { ok: false, error: 'Paket tidak ditemukan' });

      const keuangan = hitungKeuanganKontrak(ctx.paket);
      const rekomendasi = evaluasiJalurRegulasi(ctx.paket);
      return sendJson(res, 200, {
        ok: true,
        ...ctx,
        keuangan,
        rekomendasi
      });
    }

    // 3. Simpan / Buat Paket Pengadaan
    if (pathname === '/api/cakra/paket' && method === 'POST') {
      const body = await readJsonBody(req);
      const savedId = await savePaket(body);
      const ctx = await getPaketFullById(savedId);
      return sendJson(res, 200, { ok: true, id: savedId, data: ctx });
    }

    // 4. Hapus Paket Pengadaan
    if (pathname.startsWith('/api/cakra/paket/') && method === 'DELETE') {
      const id = Number(pathname.split('/').pop());
      await deletePaket(id);
      return sendJson(res, 200, { ok: true });
    }

    // 5. Simpan Rincian Item Barang/Jasa & HPS/Kontrak
    if (pathname.match(/^\/api\/cakra\/paket\/\d+\/items$/) && method === 'POST') {
      const parts = pathname.split('/');
      const paketId = Number(parts[4]);
      const body = await readJsonBody(req);
      await savePaketItems(paketId, body.items || []);
      const ctx = await getPaketFullById(paketId);
      return sendJson(res, 200, {
        ok: true,
        data: ctx,
        keuangan: hitungKeuanganKontrak(ctx.paket),
        rekomendasi: evaluasiJalurRegulasi(ctx.paket)
      });
    }

    // 6. Simpan / Susun Otomatis Jadwal & Nomor Surat 18 Tahap ("Time-Machine")
    if (pathname.match(/^\/api\/cakra\/paket\/\d+\/tahaps$/) && method === 'POST') {
      const parts = pathname.split('/');
      const paketId = Number(parts[4]);
      const body = await readJsonBody(req);
      if (body.autoGenerate) {
        await autoGeneratePaketTahaps(paketId, body.tanggalMulai || '2026-05-04');
      } else {
        await savePaketTahaps(paketId, body.tahaps || []);
      }
      const ctx = await getPaketFullById(paketId);
      return sendJson(res, 200, { ok: true, data: ctx });
    }

    // 7. Tarik Daftar Item RKB dari Database SI-PRABU
    if (pathname === '/api/cakra/siprabu-rkb' && method === 'GET') {
      const items = await fetchRkbItemsFromSiprabu();
      return sendJson(res, 200, { ok: true, items });
    }

    // 8. Simpan Master Penyedia, Pejabat, & Pengaturan Satker
    if (pathname === '/api/cakra/penyedia' && method === 'POST') {
      const body = await readJsonBody(req);
      const id = await savePenyedia(body);
      const penyedias = await getPenyediaList();
      return sendJson(res, 200, { ok: true, id, penyedias });
    }

    if (pathname === '/api/cakra/pejabat' && method === 'POST') {
      const body = await readJsonBody(req);
      const id = await savePejabat(body);
      const pejabats = await getPejabatList();
      return sendJson(res, 200, { ok: true, id, pejabats });
    }

    if (pathname === '/api/cakra/settings' && method === 'POST') {
      const body = await readJsonBody(req);
      const settings = await saveSettingsMap(body);
      return sendJson(res, 200, { ok: true, settings });
    }

    // 9. Kalkulator Konversi SBOB Konsultansi
    if (pathname === '/api/cakra/kalkulator-sbob' && method === 'GET') {
      const sbob = Number(query.sbob || 7500000);
      return sendJson(res, 200, { ok: true, ...hitungKonversiSbob(sbob) });
    }

    // 10. DOWNLOAD WORD (.DOCX) — Per Tahap (1-18) atau Gabungan Hulu-Hilir ("ALL")
    if (pathname.match(/^\/api\/cakra\/download\/docx\/\d+$/) && method === 'GET') {
      const paketId = Number(pathname.split('/').pop());
      const stage = query.tahap || '13';
      const ctx = await getPaketFullById(paketId);
      if (!ctx) return sendJson(res, 404, { ok: false, error: 'Paket tidak ditemukan' });

      const buffer = await generateWordBuffer(ctx, stage);
      const def = DEFINISI_18_TAHAP.find(d => d.no === Number(stage));
      const suffix = stage === 'ALL'
        ? 'BUNDEL_LENGKAP_18_TAHAP_HULU_HILIR'
        : `Tahap_${String(stage).padStart(2, '0')}_${sanitizeFilename(def?.kode || 'DOK')}`;
      const filename = `${sanitizeFilename(ctx.paket.kode_paket_internal)}_${suffix}.docx`;

      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length
      });
      return res.end(buffer);
    }

    // 11. DOWNLOAD EXCEL (.XLSX) — Per Tahap (1-18) atau Master Workbook ("ALL")
    if (pathname.match(/^\/api\/cakra\/download\/xlsx\/\d+$/) && method === 'GET') {
      const paketId = Number(pathname.split('/').pop());
      const stage = query.tahap || 'ALL';
      const ctx = await getPaketFullById(paketId);
      if (!ctx) return sendJson(res, 404, { ok: false, error: 'Paket tidak ditemukan' });

      const buffer = await generateExcelBuffer(ctx, stage);
      const suffix = stage === 'ALL'
        ? 'KERTAS_KERJA_MASTER_HULU_HILIR'
        : `Kertas_Kerja_Tahap_${String(stage).padStart(2, '0')}`;
      const filename = `${sanitizeFilename(ctx.paket.kode_paket_internal)}_${suffix}.xlsx`;

      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length
      });
      return res.end(buffer);
    }

    // 12. DOWNLOAD BUNDEL ARSIP 1 PAKET UTUH (.ZIP)
    if (pathname.match(/^\/api\/cakra\/download\/zip\/\d+$/) && method === 'GET') {
      const paketId = Number(pathname.split('/').pop());
      const ctx = await getPaketFullById(paketId);
      if (!ctx) return sendJson(res, 404, { ok: false, error: 'Paket tidak ditemukan' });

      const zipFilename = `ARSIP_LENGKAP_${sanitizeFilename(ctx.paket.kode_paket_internal)}_HULU_HILIR.zip`;
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`
      });

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.pipe(res);

      const xlsxMaster = await generateExcelBuffer(ctx, 'ALL');
      archive.append(xlsxMaster, { name: `00_KERTAS_KERJA_EXCEL_MASTER_${sanitizeFilename(ctx.paket.kode_paket_internal)}.xlsx` });

      const docxAll = await generateWordBuffer(ctx, 'ALL');
      archive.append(docxAll, { name: `00_BUNDEL_WORD_18_TAHAP_GABUNGAN_${sanitizeFilename(ctx.paket.kode_paket_internal)}.docx` });

      for (const d of DEFINISI_18_TAHAP) {
        const docBuf = await generateWordBuffer(ctx, d.no);
        const fName = `Word_Per_Tahap/${String(d.no).padStart(2, '0')}_${sanitizeFilename(d.kode)}_${sanitizeFilename(d.nama)}.docx`;
        archive.append(docBuf, { name: fName });
      }

      await archive.finalize();
      return;
    }

    return sendJson(res, 404, { ok: false, error: 'Endpoint Pengadaan tidak ditemukan: ' + pathname });
  } catch (err) {
    console.error('[SI-PRABU PENGADAAN API ERROR]', err);
    return sendJson(res, 500, { ok: false, error: err.message || 'Kesalahan internal server pengadaan' });
  }
}

module.exports = {
  initDatabaseSchemaAndSeed,
  handleCakraApiRequest
};
