const assert = require('assert');
const { getCakraPool, savePaket, getPaketFullById } = require('../src/pengadaan/db_pengadaan');

async function testGelombang1() {
  console.log('=== TEST GELOMBANG 1: TAHAP 2 & TAHAP 3 ===');
  const pool = getCakraPool();

  // Ambil paket 1
  const ctxBefore = await getPaketFullById(1);
  assert(ctxBefore && ctxBefore.paket, 'Paket 1 harus ditemukan');
  console.log('✅ Paket 1 terdeteksi:', ctxBefore.paket.nama_paket);

  // 1. Simpan Tahap 2 via Universal Modal Payload
  const payloadT2 = {
    ...ctxBefore.paket,
    jenis_pengadaan: 'Barang',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: 'E-Purchasing',
    bentuk_kontrak: 'Surat Pesanan',
    jenis_kontrak: 'Lumsum',
    jenis_kertas_harga: 'HPS',
    peruntukan_umk: 1,
    prioritas_pdn_level: 'Level 1: TKDN >= 25% (TKDN+BMP >= 40%)',
    stageUpdate: {
      no_tahap: 2,
      fase: 1,
      nama_tahap: 'Penetapan Jenis, Cara Pengadaan, & Pemaketan',
      nomor_dokumen: '002/PMK/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026',
      tanggal_dokumen: '2026-05-18',
      status_tahap: 'Selesai',
      link_drive_dokumen: 'https://drive.google.com/file/d/test-tahap2/view?usp=sharing',
      catatan_tahap: 'Penetapan Pemaketan PBJ Afirmasi UMK 100% dan PDN',
      tahap_data: {
        no_lak_umk: '002/LAK-UMK/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026',
        alokasi_umk_persen: '100%',
        justifikasi_umk: 'Paket bernilai di bawah ambang batas Rp 15 Miliar (Pasal 65 Perpres 16/2018 jo. Perpres 46/2025) dan kemampuan teknis penyedia UMK lokal/regional Jawa Timur memenuhi kualifikasi.',
        komitmen_pdn: 'Prioritas Produk Dalam Negeri (PDN) bersertifikat TKDN valid (Pasal 66 Perpres PBJ)'
      }
    }
  };

  const idT2 = await savePaket(payloadT2);
  const ctxAfterT2 = await getPaketFullById(idT2);
  const t2Row = (ctxAfterT2.tahaps || []).find(t => Number(t.no_tahap) === 2);
  assert(t2Row, 'Tahap 2 harus ditemukan di tahaps');
  assert.strictEqual(t2Row.status_tahap, 'Selesai', 'Tahap 2 harus berstatus Selesai');
  assert.strictEqual(t2Row.nomor_dokumen, '002/PMK/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026');
  assert(t2Row.tahap_data && t2Row.tahap_data.no_lak_umk === '002/LAK-UMK/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026', 'Tahap data no_lak_umk harus tersimpan');
  console.log('✅ [PASS] Tahap 2 tersimpan di Universal Modal dan DB dengan data Afirmasi UMK:', t2Row.tahap_data.alokasi_umk_persen);

  // 2. Simpan Tahap 3 via Universal Modal Payload
  const payloadT3 = {
    ...ctxAfterT2.paket,
    kode_rup: 'RUP-2026-657811-01',
    stageUpdate: {
      no_tahap: 3,
      fase: 1,
      nama_tahap: 'Penyusunan RUP & Pengumuman SiRUP',
      nomor_dokumen: '043/KPA/SK-RUP/V/2026',
      tanggal_dokumen: '2026-05-19',
      status_tahap: 'Selesai',
      link_drive_dokumen: 'https://drive.google.com/file/d/test-tahap3/view?usp=sharing',
      catatan_tahap: 'SK KPA Penetapan RUP dan Bukti Tayang SiRUP LKPP Terumumkan',
      tahap_data: {
        no_sk_kpa_rup: '043/KPA/SK-RUP/V/2026',
        tgl_sk_kpa_rup: '2026-05-19',
        id_paket_sirup: '51982736',
        tgl_pengumuman_sirup: '2026-05-19',
        status_pengumuman_sirup: 'Terumumkan / Tayang Publik',
        link_sirup_lkpp: 'https://sirup.lkpp.go.id/sirup/ro/paket/penyedia/51982736',
        no_bukti_sirup: '003/BKT-SiRUP/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026'
      }
    }
  };

  const idT3 = await savePaket(payloadT3);
  const ctxAfterT3 = await getPaketFullById(idT3);
  const t3Row = (ctxAfterT3.tahaps || []).find(t => Number(t.no_tahap) === 3);
  assert(t3Row, 'Tahap 3 harus ditemukan di tahaps');
  assert.strictEqual(t3Row.status_tahap, 'Selesai', 'Tahap 3 harus berstatus Selesai');
  assert.strictEqual(t3Row.nomor_dokumen, '043/KPA/SK-RUP/V/2026');
  assert(t3Row.tahap_data && t3Row.tahap_data.id_paket_sirup === '51982736', 'Tahap data id_paket_sirup harus tersimpan');
  console.log('✅ [PASS] Tahap 3 tersimpan di Universal Modal dan DB dengan ID SiRUP LKPP:', t3Row.tahap_data.id_paket_sirup);

  console.log('🎉 SELURUH VERIFIKASI GELOMBANG 1 LULUS 100%!');
}

testGelombang1().then(() => process.exit(0)).catch(err => {
  console.error('❌ Test Gelombang 1 Gagal:', err);
  process.exit(1);
});
