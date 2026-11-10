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
} = require('./db_pengadaan');

const {
  DEFINISI_18_TAHAP,
  TEMPLATES_PENGADAAN,
  PANDUAN_18_TAHAP,
  hitungKeuanganKontrak,
  hitungKonversiSbob,
  evaluasiJalurRegulasi,
  cariTemplatePengadaan,
  evaluasiAuditPaket,
  recommendJenisPengadaan
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
    await initDatabaseSchemaAndSeed();

    // 1. Bootstrap Data Dashboard & Master Pengadaan
    if (pathname === '/api/cakra/bootstrap' && method === 'GET') {
      const [settings, pejabats, penyedias, pakets] = await Promise.all([
        getSettingsMap(),
        getPejabatList(),
        getPenyediaList(),
        getPaketList()
      ]);

      let totalPagu = 0;
      let totalPaguBerkontrak = 0;
      let totalHps = 0;
      let totalKontrak = 0;
      let totalPaketUmk = 0;
      let nilaiKontrakUmk = 0;
      let sumTkdn = 0;

      for (const p of pakets) {
        totalPagu += Number(p.nilai_pagu || 0);
        const tAktif = Number(p.tahap_aktif || 1);
        const hps = tAktif >= 6 ? Number(p.nilai_hps || 0) : 0;
        const kontrak = tAktif >= 13 ? Number(p.nilai_kontrak || 0) : 0;

        totalHps += hps;
        if (kontrak > 0) {
          totalPaguBerkontrak += Number(p.nilai_pagu || 0);
          totalKontrak += kontrak;
          if (Number(p.peruntukan_umk) === 1) {
            totalPaketUmk++;
            nilaiKontrakUmk += kontrak;
          }
        }
        sumTkdn += Number(p.persen_tkdn_target || 0);
      }

      const totalEfisiensi = totalKontrak > 0 ? Math.max(0, totalPaguBerkontrak - totalKontrak) : 0;
      const persenAlokasiUmk = totalKontrak > 0 ? Number(((nilaiKontrakUmk / totalKontrak) * 100).toFixed(1)) : 100;
      const rataTkdn = pakets.length > 0 ? Number((sumTkdn / pakets.length).toFixed(1)) : 45;

      return sendJson(res, 200, {
        ok: true,
        settings,
        pejabats,
        penyedias,
        pakets,
        definisi18Tahap: DEFINISI_18_TAHAP,
        templates: TEMPLATES_PENGADAAN,
        panduanTahap: PANDUAN_18_TAHAP,
        summary: {
          jumlahPaket: pakets.length,
          totalPagu,
          totalHps,
          totalKontrak,
          totalEfisiensi,
          totalPaketUmk,
          persenAlokasiUmk,
          rataTkdn
        }
      });
    }

    // 1b. Daftar 14 Template Skenario Baku Pengadaan
    if (pathname === '/api/cakra/templates' && method === 'GET') {
      return sendJson(res, 200, {
        ok: true,
        templates: TEMPLATES_PENGADAAN,
        panduanTahap: PANDUAN_18_TAHAP
      });
    }

    // 1c. Simulator Interaktif Jenis Belanja & Besaran Nilai Pengadaan
    if (pathname === '/api/cakra/simulasi' && method === 'POST') {
      const body = await readJsonBody(req);
      const simPagu = Number(body.pagu || body.pagu_anggaran || body.nilai_pagu || 0);
      const simJenis = String(body.jenis_pengadaan || 'Barang').trim();
      const simViaKatalog = Boolean(body.via_katalog !== undefined ? body.via_katalog : (body.metode_pemilihan === 'E-Purchasing'));
      
      let simMetode = body.metode_pemilihan;
      if (!simMetode) {
        if (body.cara_pengadaan === 'Swakelola' || simJenis === 'Swakelola') {
          simMetode = 'Swakelola';
        } else if (simJenis === 'Dikecualikan') {
          simMetode = 'Mekanisme Pasar (Dikecualikan)';
        } else if (simViaKatalog && ['Barang', 'Jasa Lainnya'].includes(simJenis)) {
          simMetode = 'E-Purchasing';
        } else if (simJenis.includes('Konstruksi')) {
          simMetode = simPagu <= 400000000 ? 'Pengadaan Langsung' : 'Tender';
        } else if (simJenis.includes('Konsultansi')) {
          simMetode = simPagu <= 100000000 ? 'Pengadaan Langsung' : 'Seleksi';
        } else {
          simMetode = simPagu <= 200000000 ? 'Pengadaan Langsung' : 'Tender';
        }
      }

      const dummyPaket = {
        jenis_pengadaan: simJenis,
        pagu_anggaran: simPagu,
        nilai_pagu: simPagu,
        nilai_hps: simPagu,
        nilai_kontrak: simPagu,
        cara_pengadaan: body.cara_pengadaan || (simJenis === 'Swakelola' ? 'Swakelola' : 'Penyedia'),
        metode_pemilihan: simMetode,
        tahap_aktif: 1
      };

      const template = cariTemplatePengadaan(dummyPaket);
      const audit = evaluasiAuditPaket(dummyPaket, [], [], null, [], 1);
      const rekomendasi = evaluasiJalurRegulasi(dummyPaket);
      const keuangan = hitungKeuanganKontrak({
        ...dummyPaket,
        tarif_pph: template ? template.tarif_pph : 1.5,
        persen_retensi: template ? template.persen_retensi : 0
      });

      return sendJson(res, 200, {
        ok: true,
        template,
        rekomendasi,
        keuangan,
        audit,
        simulasi: {
          jenis_pengadaan: simJenis,
          pagu: simPagu,
          metode: simMetode,
          bentuk_kontrak: template ? template.bentuk_kontrak : 'SPK',
          kertas_harga: template ? template.jenis_kertas_harga : 'HPS Formal',
          pejabat: template ? template.pelaksana : 'Pejabat Pengadaan',
          tarif_pph: template ? template.tarif_pph : 1.5,
          jenis_pph: template ? template.jenis_pph : 'PPh 22 (1.5%)',
          persen_retensi: template ? template.persen_retensi : 0,
          wajib_jaminan: template ? template.wajib_jaminan_pelaksanaan : 0,
          bypass_tahap: template ? template.bypass_tahap : [],
          dasar_hukum: template ? template.dasar_hukum : 'Perpres 46/2025'
        }
      });
    }

    // 1d. Rekomendasi Cerdas Kategori Jenis Pengadaan (Smart AI/Rule Engine)
    if (pathname === '/api/cakra/rekomendasi' && method === 'POST') {
      const body = await readJsonBody(req);
      const resRekom = recommendJenisPengadaan({
        kode_akun: body.kode_akun || body.kode_akun_mak,
        uraian: body.uraian || body.nama_paket || body.uraian_pekerjaan,
        pagu: body.pagu || body.nilai_pagu,
        via_katalog: body.via_katalog
      });
      return sendJson(res, 200, { ok: true, ...resRekom });
    }

    // 2. Detail Lengkap 1 Paket
    if (pathname.startsWith('/api/cakra/paket/') && method === 'GET' && !pathname.endsWith('/items') && !pathname.endsWith('/tahaps')) {
      const id = Number(pathname.split('/').pop());
      const ctx = await getPaketFullById(id);
      if (!ctx) return sendJson(res, 404, { ok: false, error: 'Paket tidak ditemukan' });

      const keuangan = hitungKeuanganKontrak(ctx.paket);
      const rekomendasi = evaluasiJalurRegulasi(ctx.paket);
      const pejabats = await getPejabatList();
      const activeStage = Number(query.tahap || ctx.paket.tahap_aktif || 6);
      const audit = evaluasiAuditPaket(ctx.paket, ctx.tahaps, ctx.items, ctx.penyedia, pejabats, activeStage);
      const template = cariTemplatePengadaan(ctx.paket);

      return sendJson(res, 200, {
        ok: true,
        ...ctx,
        keuangan,
        rekomendasi,
        audit,
        template
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
    if (pathname.match(/^\/api\/cakra\/download\/docx\/\d+$/) && (method === 'GET' || method === 'HEAD')) {
      const paketId = Number(pathname.split('/').pop());
      const stage = query.tahap || '13';
      const ctx = await getPaketFullById(paketId);
      if (!ctx) return sendJson(res, 404, { ok: false, error: 'Paket tidak ditemukan' });

      const buffer = await generateWordBuffer(ctx, stage);
      const def = DEFINISI_18_TAHAP.find(d => d.no === Number(stage));
      const cleanKode = sanitizeFilename(String(ctx.paket.kode_paket_internal || '').replace(/^CAKRA-/i, 'PBJ-'));
      const suffix = stage === 'ALL'
        ? `Bundel_Naskah_Pengadaan_18_Tahap_${cleanKode}`
        : `Naskah_Pengadaan_${cleanKode}_Tahap_${String(stage).padStart(2, '0')}_${sanitizeFilename(def?.kode || 'DOK')}`;
      const filename = `${suffix}.docx`;

      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length
      });
      if (method === 'HEAD') return res.end();
      return res.end(buffer);
    }

    // 11. DOWNLOAD EXCEL (.XLSX) — Per Tahap (1-18) atau Master Workbook ("ALL")
    if (pathname.match(/^\/api\/cakra\/download\/xlsx\/\d+$/) && (method === 'GET' || method === 'HEAD')) {
      const paketId = Number(pathname.split('/').pop());
      const stage = query.tahap || 'ALL';
      if (Number(stage) === 1) {
        return sendJson(res, 400, { ok: false, error: 'Tahap 1 (Identifikasi Kebutuhan & Nota Dinas) tidak memiliki kertas kerja Excel sesuai regulasi PBJ.' });
      }
      const ctx = await getPaketFullById(paketId);
      if (!ctx) return sendJson(res, 404, { ok: false, error: 'Paket tidak ditemukan' });

      const buffer = await generateExcelBuffer(ctx, stage);
      const cleanKode = sanitizeFilename(String(ctx.paket.kode_paket_internal || '').replace(/^CAKRA-/i, 'PBJ-'));
      const suffix = stage === 'ALL'
        ? `Kertas_Kerja_Pengadaan_Master_${cleanKode}`
        : `Kertas_Kerja_Pengadaan_${cleanKode}_Tahap_${String(stage).padStart(2, '0')}`;
      const filename = `${suffix}.xlsx`;

      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length
      });
      if (method === 'HEAD') return res.end();
      return res.end(buffer);
    }

    // 12. DOWNLOAD BUNDEL ARSIP 1 PAKET UTUH (.ZIP)
    if (pathname.match(/^\/api\/cakra\/download\/zip\/\d+$/) && method === 'GET') {
      const paketId = Number(pathname.split('/').pop());
      const ctx = await getPaketFullById(paketId);
      if (!ctx) return sendJson(res, 404, { ok: false, error: 'Paket tidak ditemukan' });

      const cleanKode = sanitizeFilename(String(ctx.paket.kode_paket_internal || '').replace(/^CAKRA-/i, 'PBJ-'));
      const zipFilename = `Bundel_Arsip_Pengadaan_18_Tahap_${cleanKode}.zip`;
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`
      });

      const archive = archiver('zip', { zlib: { level: 6 } });
      archive.pipe(res);

      const xlsxMaster = await generateExcelBuffer(ctx, 'ALL');
      archive.append(xlsxMaster, { name: `00_Kertas_Kerja_Pengadaan_Master_${cleanKode}.xlsx` });

      const docxAll = await generateWordBuffer(ctx, 'ALL');
      archive.append(docxAll, { name: `00_Bundel_Naskah_Pengadaan_18_Tahap_${cleanKode}.docx` });

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

/**
 * Generator Buffer Berkas Pengadaan untuk Antrean Monitoring Unduhan SI-PRABU (`processDownloadJob`)
 */
async function generatePengadaanDownloadBuffer(job) {
  let meta = {};
  if (job.filter_sasaran && String(job.filter_sasaran).startsWith('{')) {
    try {
      meta = JSON.parse(job.filter_sasaran);
    } catch (e) {}
  }

  const paketId = Number(meta.paket_id || job.periode_id || 1);
  const stage = meta.tahap || 'ALL';

  if (job.tipe_unduhan === 'DOCX_PENGADAAN') {
    const ctx = await getPaketFullById(paketId);
    if (!ctx) throw new Error('Paket pengadaan tidak ditemukan.');
    return await generateWordBuffer(ctx, stage);
  }

  if (job.tipe_unduhan === 'EXCEL_PENGADAAN') {
    const ctx = await getPaketFullById(paketId);
    if (!ctx) throw new Error('Paket pengadaan tidak ditemukan.');
    return await generateExcelBuffer(ctx, stage);
  }

  if (job.tipe_unduhan === 'ZIP_PENGADAAN') {
    const ctx = await getPaketFullById(paketId);
    if (!ctx) throw new Error('Paket pengadaan tidak ditemukan.');
    const cleanKode = sanitizeFilename(String(ctx.paket.kode_paket_internal || '').replace(/^CAKRA-/i, 'PBJ-'));

    const xlsxMaster = await generateExcelBuffer(ctx, 'ALL');
    const docxAll = await generateWordBuffer(ctx, 'ALL');
    const stageDocs = [];
    for (const d of DEFINISI_18_TAHAP) {
      const docBuf = await generateWordBuffer(ctx, d.no);
      const fName = `Word_Per_Tahap/${String(d.no).padStart(2, '0')}_${sanitizeFilename(d.kode)}_${sanitizeFilename(d.nama)}.docx`;
      stageDocs.push({ name: fName, data: docBuf });
    }

    return await new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 6 } });
      const bufs = [];
      archive.on('data', d => bufs.push(d));
      archive.on('end', () => resolve(Buffer.concat(bufs)));
      archive.on('error', err => reject(err));

      archive.append(xlsxMaster, { name: `00_Kertas_Kerja_Pengadaan_Master_${cleanKode}.xlsx` });
      archive.append(docxAll, { name: `00_Bundel_Naskah_Pengadaan_18_Tahap_${cleanKode}.docx` });
      for (const sd of stageDocs) {
        archive.append(sd.data, { name: sd.name });
      }
      archive.finalize();
    });
  }

  if (job.tipe_unduhan === 'CSV_REKAP_PENGADAAN') {
    const allPakets = await getPaketList();
    const filterSubbag = (job.filter_pic && job.filter_pic !== 'SEMUA' && job.filter_pic !== 'ALL') ? job.filter_pic : 'ALL';
    const filterMetode = meta.metode || 'ALL';
    const pakets = (allPakets || []).filter(p => {
      if (filterSubbag !== 'ALL' && p.pic_subbag !== filterSubbag) return false;
      if (filterMetode !== 'ALL' && p.metode_pemilihan !== filterMetode) return false;
      return true;
    });

    const headers = [
      'No', 'Kode Paket', 'Kode RUP', 'Subbagian PIC', 'Kode Akun MAK',
      'Nama Paket', 'Jenis Pengadaan', 'Metode Pemilihan', 'Bentuk Kontrak',
      'Penyedia', 'Nilai Pagu', 'Nilai HPS', 'Nilai Kontrak', 'Efisiensi', 'Tahap Aktif', 'Status'
    ];
    const lines = [headers.join(';')];
    pakets.forEach((p, idx) => {
      const pagu = Number(p.nilai_pagu) || 0;
      const hps = Number(p.nilai_hps) || 0;
      const kontrak = Number(p.nilai_kontrak) || 0;
      const ef = Math.max(0, pagu - kontrak);
      const cleanKode = String(p.kode_paket_internal || '').replace(/^CAKRA-/i, 'PBJ-');
      const row = [
        idx + 1,
        `"${cleanKode.replace(/"/g, '""')}"`,
        `"${String(p.kode_rup || '').replace(/"/g, '""')}"`,
        `"${String(p.pic_subbag || '').replace(/"/g, '""')}"`,
        `"${String(p.kode_akun_mak || '').replace(/"/g, '""')}"`,
        `"${String(p.nama_paket || '').replace(/"/g, '""')}"`,
        `"${String(p.jenis_pengadaan || '').replace(/"/g, '""')}"`,
        `"${String(p.metode_pemilihan || '').replace(/"/g, '""')}"`,
        `"${String(p.bentuk_kontrak || '').replace(/"/g, '""')}"`,
        `"${String(p.nama_penyedia || p.nama_perusahaan || '').replace(/"/g, '""')}"`,
        pagu,
        hps,
        kontrak,
        ef,
        p.tahap_aktif || 18,
        `"${String(p.status_paket || 'SELESAI').replace(/"/g, '""')}"`
      ];
      lines.push(row.join(';'));
    });

    return Buffer.from('\uFEFF' + lines.join('\r\n'), 'utf8');
  }

  throw new Error(`Tipe unduhan pengadaan tidak dikenali: ${job.tipe_unduhan}`);
}

module.exports = {
  initDatabaseSchemaAndSeed,
  handleCakraApiRequest,
  generatePengadaanDownloadBuffer
};
