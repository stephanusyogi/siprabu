/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Route Token Dinamis Terenkripsi Ala SAKTI Kemenkeu (43-Char Base64URL)
 * Pengembang Resmi: emenje
 */

const crypto = require('crypto');

const SAKTI_VIEW_CODES = {
  'view-dashboard': 1,
  'view-rkb': 2,
  'view-siklus': 3,
  'view-revisi-pengajuan': 4,
  'view-revisi-validasi': 5,
  'view-revisi-tahap4': 6,
  'view-revisi-monitoring': 7,
  'view-revisi-arsip': 8,
  'view-db-ppk': 9,
  'view-db-pps': 10,
  'view-db-paslon': 11,
  'view-db-kuantitas': 12,
  'view-db-sbm': 13,
  'view-db-bas': 14,
  'view-db-regulasi': 15,
  'view-db-settings': 16,
  'view-settings': 16,
  'view-panduan': 17,
  'view-monitoring': 18,
  'view-users': 19,
  'view-developer': 20,
  'view-rekap-perencanaan': 21,
  'view-rekap-pelaksanaan': 22
};

const SAKTI_CODE_TO_VIEW = {
  1: 'view-dashboard',
  2: 'view-rkb',
  3: 'view-siklus',
  4: 'view-revisi-pengajuan',
  5: 'view-revisi-validasi',
  6: 'view-revisi-tahap4',
  7: 'view-revisi-monitoring',
  8: 'view-revisi-arsip',
  9: 'view-db-ppk',
  10: 'view-db-pps',
  11: 'view-db-paslon',
  12: 'view-db-kuantitas',
  13: 'view-db-sbm',
  14: 'view-db-bas',
  15: 'view-db-regulasi',
  16: 'view-db-settings',
  17: 'view-panduan',
  18: 'view-monitoring',
  19: 'view-users',
  20: 'view-developer',
  21: 'view-rekap-perencanaan',
  22: 'view-rekap-pelaksanaan'
};

const SAKTI_VIEW_TITLES = {
  'view-dashboard': 'Dashboard KPI Eksekutif',
  'view-rkb': 'RUH Belanja RKB Pilkada',
  'view-siklus': 'Pusat Siklus & Tata Kelola Anggaran',
  'view-revisi-pengajuan': 'Pengajuan Usulan Revisi (Tahap 1)',
  'view-revisi-validasi': 'Validasi & Telaah Usulan Revisi (Tahap 2-3)',
  'view-revisi-tahap4': 'Pengesahan BA Pleno Revisi (Tahap 4)',
  'view-revisi-monitoring': 'Monitoring Siklus & Matriks Revisi',
  'view-revisi-arsip': 'Arsip Digital BA & Dokumen Revisi',
  'view-db-ppk': 'Master Data PPK',
  'view-db-pps': 'Master Data PPS',
  'view-db-paslon': 'Master Data Pasangan Calon',
  'view-db-kuantitas': 'Master Database Kuantitas',
  'view-db-sbm': 'Master Standar Biaya Masukan (SBM)',
  'view-db-bas': 'Master Bagan Akun Standar (BAS)',
  'view-db-regulasi': 'Database Regulasi & Keputusan KPU',
  'view-db-settings': 'Pengaturan Sistem & Parameter',
  'view-settings': 'Pengaturan Sistem & Parameter',
  'view-panduan': 'Panduan Teknis & Penggunaan',
  'view-monitoring': 'Executive Real-Time Monitoring',
  'view-users': 'Manajemen Pengguna & Otoritas',
  'view-developer': 'Ruang Pengembang & Blueprint PRD',
  'view-rekap-perencanaan': 'Rekap Perencanaan Anggaran',
  'view-rekap-pelaksanaan': 'Rekap Pelaksanaan Anggaran (Baseline Sah)'
};

function bufferToBase64Url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

function generateSaktiLoginToken() {
  const bytes = crypto.randomBytes(15);
  return 'LL-' + bufferToBase64Url(bytes);
}

function generateSaktiRouteToken(viewId, isSanding = false) {
  const code = SAKTI_VIEW_CODES[viewId] || 1;
  const buf = Buffer.alloc(32);
  buf[0] = 0x53; // 'S' Magic Byte
  buf[1] = code;
  buf[2] = isSanding ? 1 : 0;
  const nowSec = Math.floor(Date.now() / 1000);
  buf.writeUInt32BE(nowSec, 3);
  crypto.randomBytes(23).copy(buf, 7);

  let sum1 = 0, sum2 = 0;
  for (let i = 0; i < 30; i++) {
    sum1 = (sum1 + buf[i]) % 255;
    sum2 = (sum2 + sum1) % 255;
  }
  buf[30] = sum1;
  buf[31] = sum2;

  return bufferToBase64Url(buf);
}

function parseSaktiRouteToken(tokenPath) {
  if (!tokenPath) return null;
  const clean = String(tokenPath).replace(/^\/+/, '').split('?')[0].split('#')[0];
  if (!clean) return null;
  if (clean.startsWith('LL-')) {
    return { isLogin: true };
  }
  if (clean.length !== 43) return null;
  try {
    const buf = base64UrlToBuffer(clean);
    if (!buf || buf.length !== 32) return null;
    if (buf[0] !== 0x53) return null;
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < 30; i++) {
      sum1 = (sum1 + buf[i]) % 255;
      sum2 = (sum2 + sum1) % 255;
    }
    if (buf[30] !== sum1 || buf[31] !== sum2) return null;
    const viewCode = buf[1];
    const isSanding = (buf[2] & 1) === 1;
    const viewId = SAKTI_CODE_TO_VIEW[viewCode];
    if (!viewId) return null;
    return { viewId, isSanding, isLogin: false };
  } catch (e) {
    return null;
  }
}

module.exports = {
  SAKTI_VIEW_CODES,
  SAKTI_CODE_TO_VIEW,
  SAKTI_VIEW_TITLES,
  generateSaktiLoginToken,
  generateSaktiRouteToken,
  parseSaktiRouteToken
};
