/**
 * SI-PRABU Clean Web Edition v3.0
 * Utilitas Parser & Formatter Angka Numerik Standar Indonesia & Internasional
 * Pengembang: emenje
 */

/**
 * Parsing teks/angka numerik menjadi number floating-point yang valid.
 * Menangani teks angka berformat Indonesia ("150.000,50", "150.000") maupun standar internasional ("150,000.50").
 * Mengembalikan null jika input tidak valid, NaN, atau Infinity.
 */
function parseIndonesianNumber(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : null;
  }

  let str = String(input).trim();
  if (!str) return null;

  // Bersihkan prefix mata uang dan karakter non-angka kecuali ., -, +, (, )
  str = str.replace(/^(rp\.?|idr)\s*/i, '').trim();

  // Tangani format negatif dalam tanda kurung: (150.000) -> -150000
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Jika setelah dibersihkan string kosong
  if (!str) return null;

  const hasDot = str.includes('.');
  const hasComma = str.includes(',');

  let normalized = str;

  if (hasDot && hasComma) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastComma > lastDot) {
      // Format Indonesia: 150.000,50 -> titik ribuan, koma desimal
      normalized = str.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // Format Inggris: 150,000.50 -> koma ribuan, titik desimal
      normalized = str.replace(/,/g, '');
    }
  } else if (hasComma) {
    // Hanya ada koma: bisa desimal "150,5" atau ribuan "150,000"
    const parts = str.split(',');
    const allTail3 = parts.slice(1).every(p => p.length === 3);
    if (parts.length > 1 && allTail3) {
      // Koma ribuan
      normalized = str.replace(/,/g, '');
    } else {
      // Koma desimal
      normalized = str.replace(/,/g, '.');
    }
  } else if (hasDot) {
    // Hanya ada titik: bisa ribuan "150.000" atau desimal "150.5"
    const parts = str.split('.');
    const allTail3 = parts.slice(1).every(p => p.length === 3);
    if (parts.length > 1 && allTail3) {
      // Titik ribuan: 150.000 atau 1.500.000
      normalized = str.replace(/\./g, '');
    } else {
      // Titik desimal
      normalized = str;
    }
  }

  // Hapus karakter non-digit selain satu titik desimal
  normalized = normalized.replace(/[^0-9.]/g, '');
  if (!normalized) return null;

  const num = Number(normalized);
  if (!Number.isFinite(num) || Number.isNaN(num)) return null;

  return isNegative ? -num : num;
}

/**
 * Format angka ke mata uang Rupiah / format Indonesia
 */
function formatRupiah(num, includePrefix = true) {
  const n = Number(num) || 0;
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(n);
  return includePrefix ? `Rp ${formatted}` : formatted;
}

module.exports = {
  parseIndonesianNumber,
  formatRupiah
};
