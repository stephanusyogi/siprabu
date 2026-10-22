/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Engine Perhitungan RKB, Rollup Hierarki Anggaran, Snapshot Arsip & Perbandingan Revisi
 * Pengembang: emenje
 */

const { db } = require('./db');
const { parseIndonesianNumber } = require('./number_util');

// Cache memori internal wilayah & kuantitas
let cachedWilayah = null;
let cachedKuantitas = null;

function getWilayahData() {
  const variabels = db.prepare('SELECT * FROM master_variabel ORDER BY id').all();
  const kecList = db.prepare('SELECT * FROM master_kecamatan ORDER BY no_urut, id').all();
  const desaList = db.prepare(`
    SELECT d.*, k.nama as kecamatan_nama, k.no_urut as kecamatan_no
    FROM master_desa d
    JOIN master_kecamatan k ON d.kecamatan_id = k.id
    ORDER BY k.no_urut, d.no_urut, d.id
  `).all();

  const desaByKec = {};
  const kabVars = {
    ketua_kpps: 0,
    anggota_kpps: 0,
    kpps: 0,
    linmas: 0,
    petugas_tps: 0,
    tps: 0,
    kotak: 0,
    pantarlih: 0,
    pemilih: 0
  };
  for (const v of variabels) kabVars[v.kode] = 0;

  let totalKotak = 0;
  let totalPemilih = 0;
  let totalPantarlih = 0;

  for (const d of desaList) {
    let custom = {};
    try { custom = JSON.parse(d.custom_vars || '{}'); } catch (e) { custom = {}; }
    const tpsCount = Number(d.tps) || 0;
    const kotakCount = d.kotak !== null && d.kotak !== undefined ? (Number(d.kotak) || 0) : tpsCount;
    const pantarlihCount = Number(d.pantarlih) || (tpsCount > 0 ? tpsCount * 2 : 0);
    const pemilihCount = Number(d.pemilih) || 0;

    totalKotak += kotakCount;
    totalPemilih += pemilihCount;
    totalPantarlih += pantarlihCount;

    const vars = {
      tps: tpsCount,
      kotak: kotakCount,
      pantarlih: pantarlihCount,
      pemilih: pemilihCount,
      rohaniwan: Number(d.rohaniwan) || 0,
      ...custom,
      ketua_kpps: tpsCount * 1,
      anggota_kpps: tpsCount * 6,
      kpps: tpsCount * 7,
      linmas: tpsCount * 2,
      petugas_tps: tpsCount * 9
    };

    for (const v of variabels) {
      if (vars[v.kode] === undefined) vars[v.kode] = 0;
      vars[v.kode] = Number(vars[v.kode]) || 0;
      kabVars[v.kode] = (kabVars[v.kode] || 0) + vars[v.kode];
    }
    kabVars.tps += tpsCount;
    kabVars.kotak += kotakCount;
    kabVars.pantarlih += pantarlihCount;
    kabVars.pemilih += pemilihCount;
    kabVars.ketua_kpps += vars.ketua_kpps;
    kabVars.anggota_kpps += vars.anggota_kpps;
    kabVars.kpps += vars.kpps;
    kabVars.linmas += vars.linmas;
    kabVars.petugas_tps += vars.petugas_tps;

    d.vars = vars;
    if (!desaByKec[d.kecamatan_id]) desaByKec[d.kecamatan_id] = [];
    desaByKec[d.kecamatan_id].push(d);
  }

  return {
    jumlah_ppk: kecList.length,
    jumlah_pps: desaList.length,
    jumlah_tps: kabVars.tps,
    jumlah_kotak: totalKotak,
    jumlah_pantarlih: totalPantarlih,
    jumlah_pemilih: totalPemilih,
    vars: kabVars,
    kecList,
    desaList,
    desaByKec
  };
}

function getKuantitasMap() {
  const list = db.prepare('SELECT * FROM master_kuantitas ORDER BY id').all();
  let agg = {};
  try {
    agg = db.prepare(`
      SELECT COUNT(*) as jmlDesa, 
             COALESCE(SUM(tps), 0) as sumTps, 
             COALESCE(SUM(kotak), 0) as sumKotak,
             COALESCE(SUM(pantarlih), 0) as sumPantarlih, 
             COALESCE(SUM(pemilih), 0) as sumPemilih 
      FROM master_desa
    `).get() || {};
  } catch (e) {}

  const livePantarlih = agg.sumPantarlih !== null && agg.sumPantarlih !== undefined ? Number(agg.sumPantarlih) : 0;
  const liveDesa = agg.jmlDesa !== null && agg.jmlDesa !== undefined ? Number(agg.jmlDesa) : 0;
  const liveTps = agg.sumTps !== null && agg.sumTps !== undefined ? Number(agg.sumTps) : 0;
  const liveKotak = agg.sumKotak !== null && agg.sumKotak !== undefined ? Number(agg.sumKotak) : liveTps;
  const livePemilih = agg.sumPemilih !== null && agg.sumPemilih !== undefined ? Number(agg.sumPemilih) : 0;
  
  let liveKec = 0;
  try {
    liveKec = Number(db.prepare('SELECT COUNT(*) as cnt FROM master_kecamatan').get()?.cnt) || 0;
  } catch (e) {}

  let livePaslon = 0;
  try {
    livePaslon = Number(db.prepare('SELECT COUNT(*) as cnt FROM master_paslon').get()?.cnt) || 0;
  } catch (e) {}

  const map = {};
  for (const k of list) {
    if (k.kode === 'pantarlih') {
      k.nilai = livePantarlih;
    } else if (k.kode === 'tps_rkb') {
      k.nilai = liveTps;
    } else if (k.kode === 'kotak_rkb') {
      k.nilai = liveKotak;
    } else if (k.kode === 'desa_pps') {
      k.nilai = liveDesa;
    } else if (k.kode === 'kec_ppk') {
      k.nilai = liveKec;
    } else if (k.kode === 'pemilih_dpt' || k.kode === 'dpt') {
      k.nilai = livePemilih;
    } else if (k.kode === 'paslon') {
      k.nilai = livePaslon;
    } else if (k.kode === 'kpps_ketua') {
      k.nilai = liveTps * 1;
    } else if (k.kode === 'kpps_anggota') {
      k.nilai = liveTps * 6;
    } else if (k.kode === 'linmas_tps') {
      k.nilai = liveTps * 2;
    } else if (k.kode === 'petugas_tps') {
      k.nilai = liveTps * 9;
    } else if (k.kode === 'kpps_all') {
      k.nilai = liveTps * 7;
    } else if (k.kode === 'ppk_ketua') {
      k.nilai = liveKec * 1;
    } else if (k.kode === 'ppk_anggota') {
      k.nilai = liveKec * 4;
    } else if (k.kode === 'ppk_komisioner') {
      k.nilai = liveKec * 5;
    } else if (k.kode === 'pps_ketua') {
      k.nilai = liveDesa * 1;
    } else if (k.kode === 'pps_anggota') {
      k.nilai = liveDesa * 2;
    } else if (k.kode === 'pps_komisioner') {
      k.nilai = liveDesa * 3;
    }
    map[k.kode] = k;
  }
  return map;
}

function resolveVarValue(varCode, fallbackVal, contextType, entityData, kabSummary, kuantitasMap) {
  if (!varCode || varCode === 'MANUAL' || varCode === 'FIXED') {
    const parsed = parseIndonesianNumber(fallbackVal);
    // Jika user eksplisit memasukkan angka (termasuk 0), gunakan angka tersebut
    return parsed !== null ? parsed : 1;
  }

  const cleanCode = String(varCode).trim().replace(/^@/, '').toLowerCase();

  if (cleanCode === 'ppk' || cleanCode === 'kec_ppk') {
    if (contextType === 'KAB') return kabSummary ? kabSummary.jumlah_ppk : 0;
    return 1;
  }
  if (cleanCode === 'pps' || cleanCode === 'desa_pps') {
    if (contextType === 'KAB') return kabSummary ? kabSummary.jumlah_pps : 0;
    if (contextType === 'PPK') return entityData ? (entityData.jumlah_desa || (entityData.desaList ? entityData.desaList.length : 1)) : 1;
    return 1;
  }
  if (cleanCode === 'tps_rkb' || cleanCode === 'tps') {
    if (contextType === 'KAB') {
      if (kuantitasMap && kuantitasMap.tps_rkb && kuantitasMap.tps_rkb.nilai !== undefined && kuantitasMap.tps_rkb.nilai !== null) {
        return Number(kuantitasMap.tps_rkb.nilai) || 0;
      }
      return kabSummary ? kabSummary.jumlah_tps : 0;
    }
    if (entityData && entityData.vars) return Number(entityData.vars.tps) || 0;
    return 0;
  }
  if (cleanCode === 'kotak_rkb' || cleanCode === 'kotak') {
    if (contextType === 'KAB') {
      if (kuantitasMap && kuantitasMap.kotak_rkb && kuantitasMap.kotak_rkb.nilai !== undefined && kuantitasMap.kotak_rkb.nilai !== null) {
        return Number(kuantitasMap.kotak_rkb.nilai) || 0;
      }
      return kabSummary ? (kabSummary.jumlah_kotak !== undefined ? kabSummary.jumlah_kotak : kabSummary.jumlah_tps) : 0;
    }
    if (entityData && entityData.vars) return Number(entityData.vars.kotak) || 0;
    return 0;
  }

  // Hierarki Adhoc
  if (cleanCode === 'ppk_ketua') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_ppk * 1 : 0) : 1;
  if (cleanCode === 'ppk_anggota') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_ppk * 4 : 0) : 4;
  if (cleanCode === 'ppk_komisioner') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_ppk * 5 : 0) : 5;
  if (cleanCode === 'ppk_sekretaris') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_ppk * 1 : 0) : 1;
  if (cleanCode === 'ppk_staf') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_ppk * 2 : 0) : 2;
  if (cleanCode === 'ppk_sekretariat') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_ppk * 3 : 0) : 3;

  if (cleanCode === 'pps_ketua') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_pps * 1 : 0) : 1;
  if (cleanCode === 'pps_anggota') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_pps * 2 : 0) : 2;
  if (cleanCode === 'pps_komisioner') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_pps * 3 : 0) : 3;
  if (cleanCode === 'pps_sekretaris') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_pps * 1 : 0) : 1;
  if (cleanCode === 'pps_staf') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_pps * 2 : 0) : 2;
  if (cleanCode === 'pps_sekretariat') return contextType === 'KAB' ? (kabSummary ? kabSummary.jumlah_pps * 3 : 0) : 3;

  if (kuantitasMap && (kuantitasMap[cleanCode] || kuantitasMap[varCode])) {
    const item = kuantitasMap[cleanCode] || kuantitasMap[varCode];
    const mVal = item.nilai;
    // Nilai 0 di master tetap dipertahankan sebagai 0
    return (mVal !== null && mVal !== undefined && !Number.isNaN(Number(mVal))) ? Number(mVal) : 0;
  }

  const parsed = parseIndonesianNumber(fallbackVal);
  return parsed !== null ? parsed : 1;
}

function computeRowFactors(r, contextType = 'KAB', entityData = null, kabSummary = null, kuantitasMap = null) {
  if (!kabSummary) {
    if (!cachedWilayah) cachedWilayah = getWilayahData();
    kabSummary = cachedWilayah;
  }
  if (!kuantitasMap) {
    if (!cachedKuantitas) cachedKuantitas = getKuantitasMap();
    kuantitasMap = cachedKuantitas;
  }

  const isAdhoc = contextType !== 'KAB';

  const factorSpecs = [
    { val: r.f1_val, unit: r.f1_unit, varCode: r.f1_var },
    { val: r.f2_val, unit: r.f2_unit, varCode: r.f2_var },
    { val: r.f3_val, unit: r.f3_unit, varCode: r.f3_var },
    { val: r.f4_val, unit: r.f4_unit, varCode: r.f4_var }
  ];

  const parts = [];
  let baseFactor = 1;
  let hasExplicitZero = false;
  let activeFactorsCount = 0;

  for (let i = 0; i < factorSpecs.length; i++) {
    const fs = factorSpecs[i];
    let varCode = (fs.varCode && fs.varCode !== '' && fs.varCode !== 'MANUAL' && fs.varCode !== 'FIXED') ? fs.varCode : null;
    const unitTrimmed = String(fs.unit || '').trim();
    const unitLower = unitTrimmed.toLowerCase();

    // AUTO-BINDING CERDAS: Jika baris belum memiliki varCode eksplisit di database, cocokkan secara cerdas dengan satuan atau uraian
    if (!varCode) {
      if (unitLower === 'paslon') {
        const uLower = String(r.uraian || '').toLowerCase();
        if (uLower.includes('perseorangan')) {
          varCode = 'paslon_perseorangan';
        } else if (uLower.includes('bakal')) {
          varCode = 'bakal_paslon';
        } else {
          varCode = 'paslon';
        }
      } else if (unitLower === 'parpol' || unitLower === 'partai' || unitLower.includes('parpol')) {
        varCode = 'parpol';
      } else if (unitLower === 'komisioner') {
        varCode = 'komisioner';
      } else if (unitLower === 'pemilih') {
        varCode = 'dpt';
      }
    }

    const hasVar = Boolean(varCode);
    const hasVal = fs.val !== null && fs.val !== undefined && String(fs.val).trim() !== '';

    // Faktor yang benar-benar kosong diabaikan (bukan pengali)
    if (!hasVar && !hasVal) {
      continue;
    }

    activeFactorsCount++;
    let vNum = 1;
    let unitLabel = fs.unit || '';

    if (hasVar) {
      vNum = resolveVarValue(varCode, fs.val, contextType, entityData, kabSummary, kuantitasMap);
      const cleanKey = String(varCode).trim().replace(/^@/, '').toLowerCase();
      if (!unitLabel && kuantitasMap && (kuantitasMap[cleanKey] || kuantitasMap[varCode])) {
        const m = kuantitasMap[cleanKey] || kuantitasMap[varCode];
        unitLabel = m.satuan || varCode;
      }
    } else {
      const parsed = parseIndonesianNumber(fs.val);
      vNum = parsed !== null ? parsed : 0;
    }

    // Jika nilai faktor adalah 0, perkalian harus menjadi 0 (jangan diabaikan!)
    if (vNum === 0) {
      hasExplicitZero = true;
      baseFactor = 0;
      parts.push(`0 ${unitLabel}`.trim());
    } else {
      baseFactor *= vNum;
      parts.push(`${Number(vNum).toLocaleString('id-ID')} ${unitLabel}`.trim());
    }
  }

  if (activeFactorsCount === 0) {
    baseFactor = 1;
  } else if (hasExplicitZero) {
    baseFactor = 0;
  }

  // Basis Pengali
  let mult = 1;
  const basis = (r.basis_pengali || 'NONE').toUpperCase();

  if (!basis || basis === 'NONE' || basis === 'FIXED') {
    mult = 1;
  } else if (basis === 'TPS_RKB') {
    if (contextType === 'KAB') {
      mult = kuantitasMap && kuantitasMap.tps_rkb ? Number(kuantitasMap.tps_rkb.nilai) || kabSummary.jumlah_tps : kabSummary.jumlah_tps;
    } else {
      mult = entityData && entityData.vars ? Number(entityData.vars.tps) || 0 : 0;
    }
  } else if (basis === 'KOTAK_RKB') {
    if (contextType === 'KAB') {
      const kotakVal = kuantitasMap && kuantitasMap.kotak_rkb 
        ? Number(kuantitasMap.kotak_rkb.nilai) 
        : (kabSummary ? kabSummary.jumlah_kotak : 0);
      mult = kotakVal;
    } else {
      mult = entityData && entityData.vars ? Number(entityData.vars.kotak) || 0 : 0;
    }
  } else if (contextType === 'KAB') {
    if (basis === 'PPK' || basis === 'KEC_PPK') mult = kabSummary.jumlah_ppk;
    else if (basis === 'PPS' || basis === 'DESA_PPS') mult = kabSummary.jumlah_pps;
    else if (kabSummary.vars && r.basis_pengali in kabSummary.vars) mult = Number(kabSummary.vars[r.basis_pengali]) || 0;
    else mult = resolveVarValue(r.basis_pengali, 1, contextType, entityData, kabSummary, kuantitasMap);
  } else if (contextType === 'PPK') {
    if (basis === 'PPK') mult = 1;
    else if (basis === 'PPS') mult = entityData ? entityData.jumlah_desa : 1;
    else if (entityData && entityData.vars && r.basis_pengali in entityData.vars) mult = Number(entityData.vars[r.basis_pengali]) || 0;
    else mult = resolveVarValue(r.basis_pengali, 1, contextType, entityData, kabSummary, kuantitasMap);
  } else if (contextType === 'PPS') {
    if (basis === 'PPS') mult = 1;
    else if (entityData && entityData.vars && r.basis_pengali in entityData.vars) mult = Number(entityData.vars[r.basis_pengali]) || 0;
    else mult = resolveVarValue(r.basis_pengali, 1, contextType, entityData, kabSummary, kuantitasMap);
  }

  const label = isAdhoc ? (r.label_pengali_adhoc || r.label_pengali_kab || '') : (r.label_pengali_kab || '');
  if (basis && basis !== 'NONE' && (label || basis !== 'FIXED')) {
    parts.push(`${Number(mult).toLocaleString('id-ID')} ${label}`.trim());
  }

  const volume = baseFactor * mult;
  const hargaParsed = parseIndonesianNumber(r.harga_satuan);
  const harga = (hargaParsed !== null && hargaParsed >= 0) ? hargaParsed : 0;
  const total = volume * harga;

  return {
    baseFactor,
    mult,
    volume,
    parts,
    formulaText: parts.join(' x ') || '-',
    harga_satuan: harga,
    total_anggaran: total
  };
}

/**
 * Menghitung tingkat hierarki (rank) untuk nesting & rollup
 */
function getHierarchyRank(row) {
  if (!row || row.row_type !== 'header') return 99;
  const lvl = Number(row.level_indent ?? 2);
  if (lvl === 0) return 10;                     // Level 0 (Grand Title: A, B)
  if (lvl === 1) return 20;                     // Level 1 (Tahapan/Operasional: I, II)
  if (lvl === 2) return 30;                     // Level 2 (Kegiatan 1..28)
  if (lvl >= 21 && lvl <= 29) return 40 + (lvl - 20); // Level 4 (4.1..4.9)
  if (lvl === 3) return 50;                     // Akun Belanja (5xxxxx)
  if (lvl === 4 || lvl === 41) return 61;       // Header 1 di bawah Akun
  if (lvl === 42) return 62;                    // Sub-Header di bawah Header 1
  return 45;
}

/**
 * Menghitung seluruh rollup hierarki RKB secara hierarkis presisi (SAKTI standard)
 */
function calculateRkbDataset(rawRows, paguNphd = null) {
  let grandTotal = 0;
  let totalItems = 0;
  const bySubbag = { KUL: 0, RENDATIN: 0, TEKNIS: 0, HUKUM: 0, PARSDM: 0 };
  const byAkun = {};
  const bySasaran = { KAB: 0, PPK: 0, PPS: 0, TPS: 0, PANTARLIH: 0, PESERTA: 0 };

  const subbagSummaries = {
    KUL: { pic: 'KUL', grandTotal: 0, totalItems: 0, bySasaran: { KAB: 0, PPK: 0, PPS: 0, TPS: 0, PANTARLIH: 0, PESERTA: 0 }, byAkun: {}, bySubbag: { KUL: 0 } },
    RENDATIN: { pic: 'RENDATIN', grandTotal: 0, totalItems: 0, bySasaran: { KAB: 0, PPK: 0, PPS: 0, TPS: 0, PANTARLIH: 0, PESERTA: 0 }, byAkun: {}, bySubbag: { RENDATIN: 0 } },
    TEKNIS: { pic: 'TEKNIS', grandTotal: 0, totalItems: 0, bySasaran: { KAB: 0, PPK: 0, PPS: 0, TPS: 0, PANTARLIH: 0, PESERTA: 0 }, byAkun: {}, bySubbag: { TEKNIS: 0 } },
    HUKUM: { pic: 'HUKUM', grandTotal: 0, totalItems: 0, bySasaran: { KAB: 0, PPK: 0, PPS: 0, TPS: 0, PANTARLIH: 0, PESERTA: 0 }, byAkun: {}, bySubbag: { HUKUM: 0 } },
    PARSDM: { pic: 'PARSDM', grandTotal: 0, totalItems: 0, bySasaran: { KAB: 0, PPK: 0, PPS: 0, TPS: 0, PANTARLIH: 0, PESERTA: 0 }, byAkun: {}, bySubbag: { PARSDM: 0 } }
  };

  // 1. Hitung seluruh baris item (level_indent === 4 dan row_type !== 'header')
  const processedRows = rawRows.map(r => {
    const isItem = r.row_type === 'item' || (r.row_type !== 'header' && (r.level_indent === undefined || Number(r.level_indent) === 4));
    if (!isItem) {
      return {
        ...r,
        is_header: true,
        hierarchy_rank: getHierarchyRank(r),
        computed_volume: null,
        vol_total: null,
        computed_formula: '',
        formula_text: '',
        computed_total: 0,
        jumlah: 0
      };
    }

    const calc = computeRowFactors(r, 'KAB');
    totalItems++;
    grandTotal += calc.total_anggaran;

    // Normalisasi PIC
    let pic = (r.pic_bagian || 'KUL').toUpperCase();
    if (pic === 'PERENCANAAN') pic = 'RENDATIN';
    if (pic === 'KEUANGAN') pic = 'KUL';
    if (pic === 'PARMAS') pic = 'PARSDM';
    if (!bySubbag[pic]) bySubbag[pic] = 0;
    bySubbag[pic] += calc.total_anggaran;

    // Akun
    const akun = r.kode_akun || '521211';
    if (!byAkun[akun]) byAkun[akun] = 0;
    byAkun[akun] += calc.total_anggaran;

    // Sasaran Alokasi
    const sas = (r.target_scope || 'KAB').toUpperCase();
    if (bySasaran[sas] !== undefined) bySasaran[sas] += calc.total_anggaran;
    else bySasaran.KAB += calc.total_anggaran;

    // Subbag summary per-PIC
    if (subbagSummaries[pic]) {
      subbagSummaries[pic].grandTotal += calc.total_anggaran;
      subbagSummaries[pic].totalItems++;
      if (subbagSummaries[pic].bySasaran[sas] !== undefined) {
        subbagSummaries[pic].bySasaran[sas] += calc.total_anggaran;
      }
      if (!subbagSummaries[pic].byAkun[akun]) subbagSummaries[pic].byAkun[akun] = 0;
      subbagSummaries[pic].byAkun[akun] += calc.total_anggaran;
      subbagSummaries[pic].bySubbag[pic] += calc.total_anggaran;
    }

    return {
      ...r,
      is_header: false,
      hierarchy_rank: 99,
      computed_volume: calc.volume,
      vol_total: calc.volume,
      computed_formula: calc.formulaText,
      formula_text: calc.formulaText,
      computed_total: calc.total_anggaran,
      jumlah: calc.total_anggaran,
      harga_satuan: calc.harga_satuan
    };
  });

  // 2. Tentukan tree_id dan parent_tree_id
  let curL0 = null, curL1 = null, curL2 = null, curL3 = null, curH1 = null;
  const allRowsWithTree = processedRows.map((r, idx) => {
    let treeId = `row_${r.id || idx}`;
    let parentTreeId = null;

    if (r.is_header) {
      const rank = r.hierarchy_rank;
      if (rank === 10) { curL0 = treeId; curL1 = null; curL2 = null; curL3 = null; curH1 = null; parentTreeId = null; }
      else if (rank === 20) { curL1 = treeId; curL2 = null; curL3 = null; curH1 = null; parentTreeId = curL0; }
      else if (rank === 30) { curL2 = treeId; curL3 = null; curH1 = null; parentTreeId = curL1 || curL0; }
      else if (rank === 50) { curL3 = treeId; curH1 = null; parentTreeId = curL2 || curL1 || curL0; }
      else if (rank === 61) { curH1 = treeId; parentTreeId = curL3 || curL2 || curL1 || curL0; }
      else if (rank === 62) { parentTreeId = curH1 || curL3 || curL2 || curL1 || curL0; }
      else { parentTreeId = curL2 || curL1 || curL0; }
    } else {
      parentTreeId = curH1 || curL3 || curL2 || curL1 || curL0;
    }

    return {
      ...r,
      tree_id: treeId,
      parent_tree_id: parentTreeId
    };
  });

  // 3. Rollup vertikal
  const rowByTreeId = {};
  allRowsWithTree.forEach(r => { rowByTreeId[r.tree_id] = r; });

  const totalsByTreeId = {};
  allRowsWithTree.forEach(r => {
    if (!r.is_header) {
      let cur = r.parent_tree_id;
      while (cur && rowByTreeId[cur]) {
        totalsByTreeId[cur] = (totalsByTreeId[cur] || 0) + r.computed_total;
        cur = rowByTreeId[cur].parent_tree_id;
      }
    }
  });

  // Pasang computed_total pada baris header
  const finalRows = allRowsWithTree.map(r => {
    if (r.is_header) {
      const tot = totalsByTreeId[r.tree_id] || 0;
      return {
        ...r,
        computed_total: tot,
        jumlah: tot
      };
    }
    return r;
  });

  // Hitung jumlah anak (child_count)
  const childCountMap = {};
  for (const r of finalRows) {
    if (r.parent_tree_id) {
      childCountMap[r.parent_tree_id] = (childCountMap[r.parent_tree_id] || 0) + 1;
    }
  }
  for (const r of finalRows) {
    r.child_count = childCountMap[r.tree_id] || 0;
    r.has_children = r.child_count > 0;
  }

  // Hitung metrik Banner Dashboard
  const tahapanTotal = finalRows
    .filter(r => r.is_header && r.level_indent === 0 && (r.uraian || '').includes('TAHAPAN'))
    .reduce((acc, r) => acc + (r.computed_total || 0), 0);
  const operasionalTotal = finalRows
    .filter(r => r.is_header && r.level_indent === 0 && (r.uraian || '').includes('OPERASIONAL'))
    .reduce((acc, r) => acc + (r.computed_total || 0), 0);
  const honorTotal = byAkun['521213'] || 0;
  const totalLevelPps = (bySasaran.PPS || 0) + (bySasaran.PANTARLIH || 0) + (bySasaran.TPS || 0);

  // Validasi Keseimbangan terhadap Pagu NPHD yang sesungguhnya (bukan angka hardcoded)
  const paguTarget = Number(paguNphd);
  const isPaguSet = Number.isFinite(paguTarget) && paguTarget > 0;
  const isBalance = isPaguSet ? Math.abs(grandTotal - paguTarget) < 0.01 : false;
  const selisihPagu = isPaguSet ? grandTotal - paguTarget : null;

  return {
    rows: finalRows,
    summary: {
      grandTotal,
      totalItems,
      totalRows: finalRows.length,
      paguNphd: isPaguSet ? paguTarget : 0,
      is_pagu_set: isPaguSet,
      is_balance: isBalance,
      is_balanced: isBalance,
      selisih_pagu: selisihPagu,
      balance_label: isPaguSet ? (isBalance ? 'Seimbang (Match Pagu NPHD)' : `Selisih Rp ${Number(selisihPagu).toLocaleString('id-ID')}`) : 'Pagu NPHD Belum Dikonfigurasi',
      bySubbag,
      byAkun,
      bySasaran,
      subbagSummaries,
      banner: {
        totalPagu: grandTotal,
        paguNphd: isPaguSet ? paguTarget : 0,
        tahapanTotal,
        operasionalTotal,
        honorTotal,
        penyelenggara: {
          kab: bySasaran.KAB || 0,
          ppk: bySasaran.PPK || 0,
          pps: bySasaran.PPS || 0,
          pantarlih: bySasaran.PANTARLIH || 0,
          tps: bySasaran.TPS || 0,
          peserta: bySasaran.PESERTA || 0,
          totalLevelPps
        },
        is_pagu_set: isPaguSet,
        is_balance: isBalance,
        is_balanced: isBalance,
        selisih_pagu: selisihPagu
      }
    }
  };
}

// Cache in-memory untuk kalkulasi dataset RKB per periode agar super cepat (response < 10ms)
const datasetCache = new Map();

function getCachedRkbDataset(periodeId) {
  return getRkbCalculatedDataset(periodeId);
}

function getRkbCalculatedDataset(periodeId) {
  const key = Number(periodeId);
  if (datasetCache.has(key)) {
    return datasetCache.get(key);
  }

  // 1. Periksa apakah dokumen berstatus terkunci dan memiliki snapshot tersimpan di database
  try {
    const snapRow = db.prepare('SELECT snapshot_data FROM periode_snapshot WHERE periode_id = ?').get(key);
    if (snapRow && snapRow.snapshot_data) {
      const snap = JSON.parse(snapRow.snapshot_data);
      if (snap && snap.rows && snap.summary) {
        const result = {
          rows: snap.rows,
          summary: snap.summary,
          is_snapshot: true,
          snapshot_meta: snap.meta || {}
        };
        datasetCache.set(key, result);
        return result;
      }
    }
  } catch (err) {
    console.warn(`[SNAPSHOT] Peringatan saat membaca snapshot periode ${key}:`, err.message);
  }

  // 2. Jika bukan arsip bersnapshot (misal draft aktif), hitung secara dinamis
  const periode = db.prepare('SELECT id, pagu_nphd, is_locked FROM periode_anggaran WHERE id = ?').get(key);
  const rawRows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan ASC, id ASC').all(key);
  const result = calculateRkbDataset(rawRows, periode ? periode.pagu_nphd : null);
  datasetCache.set(key, result);
  return result;
}

/**
 * Memfilter dataset RKB secara presisi berdasarkan PIC, Sasaran, dan Pencarian.
 * Hanya menyertakan item yang cocok dan header yang memiliki anak item yang cocok (ancestor inclusion).
 * Header yang kosong (0 rupiah / tidak memiliki item untuk PIC terkait) otomatis dipangkas (pruned).
 */
function filterAndPruneRkbDataset(fullDataset, { pic = 'SEMUA', target_scope = 'ALL', search = '' } = {}) {
  let filterPic = (pic && pic !== 'SEMUA') ? pic.toUpperCase() : null;
  if (filterPic === 'PERENCANAAN') filterPic = 'RENDATIN';
  if (filterPic === 'KEUANGAN') filterPic = 'KUL';
  if (filterPic === 'PARMAS') filterPic = 'PARSDM';

  const filterSasaran = (target_scope && target_scope !== 'ALL') ? target_scope.toUpperCase() : null;
  const searchQ = (search && search.trim()) ? search.trim().toLowerCase() : null;

  const { rows, summary: docSummary } = fullDataset;

  // Jika tidak ada filter apa pun, kembalikan salinan aman dataset asli
  if (!filterPic && !filterSasaran && !searchQ) {
    return {
      rows: [...rows],
      summary: { ...docSummary }
    };
  }

  const rowByTreeId = {};
  const rowById = {};
  rows.forEach(r => {
    rowByTreeId[r.tree_id] = r;
    rowById[r.id] = r;
  });

  // Helper cek kecocokan pencarian pada baris atau leluhurnya
  function rowOrAncestorMatchesSearch(r, query) {
    if (!query) return true;
    let cur = r;
    while (cur) {
      const hay = `${cur.kode || ''} ${cur.uraian || ''} ${cur.kode_akun || ''}`.toLowerCase();
      if (hay.includes(query)) return true;
      cur = cur.parent_tree_id ? rowByTreeId[cur.parent_tree_id] : null;
    }
    return false;
  }

  const matchingRowIds = new Set();
  const summaryBySubbag = { KUL: 0, RENDATIN: 0, TEKNIS: 0, HUKUM: 0, PARSDM: 0 };
  const summaryByAkun = {};
  const summaryBySasaran = { KAB: 0, PPK: 0, PPS: 0, TPS: 0, PANTARLIH: 0, PESERTA: 0 };
  let grandTotal = 0;
  let totalItems = 0;

  rows.forEach(r => {
    if (r.is_header) return;

    let rPic = (r.pic_bagian || 'KUL').toUpperCase();
    if (rPic === 'PERENCANAAN') rPic = 'RENDATIN';
    if (rPic === 'KEUANGAN') rPic = 'KUL';
    if (rPic === 'PARMAS') rPic = 'PARSDM';

    if (filterPic && rPic !== filterPic) return;
    if (filterSasaran && (r.target_scope || '').toUpperCase() !== filterSasaran) return;
    if (searchQ && !rowOrAncestorMatchesSearch(r, searchQ)) return;

    matchingRowIds.add(r.id);
    totalItems++;
    const tot = Number(r.computed_total) || 0;
    grandTotal += tot;

    summaryBySubbag[rPic] = (summaryBySubbag[rPic] || 0) + tot;

    const akun = r.kode_akun || '521211';
    summaryByAkun[akun] = (summaryByAkun[akun] || 0) + tot;

    const sas = (r.target_scope || 'KAB').toUpperCase();
    summaryBySasaran[sas] = (summaryBySasaran[sas] || 0) + tot;
  });

  // Himpun tree_id dari seluruh item yang cocok dan seluruh leluhur (ancestor)-nya
  const includedTreeIds = new Set();
  matchingRowIds.forEach(id => {
    const r = rowById[id];
    if (!r) return;
    includedTreeIds.add(r.tree_id);
    let cur = r.parent_tree_id;
    while (cur && rowByTreeId[cur]) {
      includedTreeIds.add(cur);
      cur = rowByTreeId[cur].parent_tree_id;
    }
  });

  // Hitung ulang subtotal vertikal (rollup) untuk header yang lolos filter
  const rollupMap = {};
  rows.filter(r => matchingRowIds.has(r.id)).forEach(item => {
    let cur = item.parent_tree_id;
    while (cur && rowByTreeId[cur]) {
      rollupMap[cur] = (rollupMap[cur] || 0) + (item.computed_total || 0);
      cur = rowByTreeId[cur].parent_tree_id;
    }
  });

  // Pruning baris: Hanya ambil baris yang ada di includedTreeIds
  const prunedRows = rows
    .filter(r => includedTreeIds.has(r.tree_id))
    .map(r => {
      if (r.is_header) {
        return {
          ...r,
          computed_total: rollupMap[r.tree_id] || 0
        };
      }
      return r;
    });

  // Perbarui child_count dan has_children pada baris yang telah dipangkas
  const childCountMap = {};
  for (const r of prunedRows) {
    if (r.parent_tree_id) {
      childCountMap[r.parent_tree_id] = (childCountMap[r.parent_tree_id] || 0) + 1;
    }
  }
  for (const r of prunedRows) {
    r.child_count = childCountMap[r.tree_id] || 0;
    r.has_children = r.child_count > 0;
  }

  const filteredSummary = {
    grandTotal,
    totalItems,
    totalRows: prunedRows.length,
    bySubbag: summaryBySubbag,
    byAkun: summaryByAkun,
    bySasaran: summaryBySasaran
  };

  return { rows: prunedRows, summary: filteredSummary };
}

function clearRkbDatasetCache(periodeId = null) {
  cachedWilayah = null;
  cachedKuantitas = null;
  if (periodeId !== null && periodeId !== undefined) {
    datasetCache.delete(Number(periodeId));
  } else {
    datasetCache.clear();
  }
}

/**
 * Menghitung perbandingan Semula - Menjadi untuk Dokumen Revisi RKB
 * Mendeteksi item baru, berubah (meski nominal tetap), bertambah, berkurang, dan dihapus.
 */
function getRevisionComparison(periodeId, targetComparisonPeriodeId = null, precomputedCurrCalc = null) {
  const periode = db.prepare('SELECT * FROM periode_anggaran WHERE id = ?').get(Number(periodeId));
  if (!periode) {
    return {
      has_parent: false,
      is_rkb_awal: false,
      parent_periode: null,
      summary: null,
      by_row_id: {},
      log_detail: []
    };
  }

  let compPeriode = null;
  if (targetComparisonPeriodeId) {
    compPeriode = db.prepare('SELECT * FROM periode_anggaran WHERE id = ?').get(Number(targetComparisonPeriodeId));
  } else if (periode.parent_periode_id) {
    compPeriode = db.prepare('SELECT * FROM periode_anggaran WHERE id = ?').get(Number(periode.parent_periode_id));
  } else {
    // Cari RKB Awal di Peta Siklus yang bukan dokumen saat ini
    compPeriode = db.prepare(`
      SELECT * FROM periode_anggaran 
      WHERE (revisi_ke = 0 OR versi_revisi = 'RKB Awal' OR parent_periode_id IS NULL)
        AND id != ?
      ORDER BY id ASC LIMIT 1
    `).get(periode.id);
  }

  const isRkbAwal = Boolean(periode.revisi_ke === 0 || periode.versi_revisi === 'RKB Awal' || !periode.parent_periode_id);

  if (!compPeriode || compPeriode.id === periode.id) {
    return {
      has_parent: false,
      is_rkb_awal: isRkbAwal,
      parent_periode: null,
      summary: null,
      by_row_id: {},
      log_detail: []
    };
  }

  const parentCalc = getCachedRkbDataset(compPeriode.id);
  const currCalc = precomputedCurrCalc || getCachedRkbDataset(periode.id);

  const parentMap = {};
  const parentBySignature = {};
  for (const pr of parentCalc.rows) {
    parentMap[pr.id] = pr;
    if (!pr.is_header) {
      const sig = `${pr.kode || ''}|${(pr.uraian || '').trim().toLowerCase()}|${pr.kode_akun || ''}`;
      parentBySignature[sig] = pr;
    }
  }

  const byRowId = {};
  const logDetail = [];
  let totalSemula = parentCalc.summary.grandTotal;
  let totalMenjadi = currCalc.summary.grandTotal;
  let deltaBertambah = 0;
  let deltaBerkurang = 0;

  const matchedParentIds = new Set();

  for (const cr of currCalc.rows) {
    // Cari semulaRow: pertama via semula_row_id, kedua via signature kode+uraian+akun jika tidak ada id
    let semulaRow = null;
    if (cr.semula_row_id && parentMap[cr.semula_row_id]) {
      semulaRow = parentMap[cr.semula_row_id];
      matchedParentIds.add(cr.semula_row_id);
    } else if (!cr.is_header) {
      const sig = `${cr.kode || ''}|${(cr.uraian || '').trim().toLowerCase()}|${cr.kode_akun || ''}`;
      if (parentBySignature[sig] && !matchedParentIds.has(parentBySignature[sig].id)) {
        semulaRow = parentBySignature[sig];
        matchedParentIds.add(semulaRow.id);
      }
    }

    const sVol = semulaRow ? semulaRow.computed_volume : null;
    const sHarga = semulaRow ? Number(semulaRow.harga_satuan) || 0 : null;
    const sJml = semulaRow ? semulaRow.computed_total : 0;
    const mJml = cr.computed_total || 0;
    const diff = mJml - sJml;

    let status = 'TETAP';
    if (!semulaRow) {
      status = 'BARU';
      if (!cr.is_header) deltaBertambah += diff;
    } else if (diff > 0) {
      status = 'BERTAMBAH';
      if (!cr.is_header) deltaBertambah += diff;
    } else if (diff < 0) {
      status = 'BERKURANG';
      if (!cr.is_header) deltaBerkurang += Math.abs(diff);
    } else {
      // diff === 0, tapi periksa apakah ada perubahan volume, harga, uraian, akun, atau PIC
      const volChanged = sVol !== cr.computed_volume;
      const hargaChanged = sHarga !== (Number(cr.harga_satuan) || 0);
      const uraianChanged = (semulaRow.uraian || '').trim() !== (cr.uraian || '').trim();
      const akunChanged = (semulaRow.kode_akun || '') !== (cr.kode_akun || '');
      const picChanged = (semulaRow.pic_bagian || '') !== (cr.pic_bagian || '');
      if (volChanged || hargaChanged || uraianChanged || akunChanged || picChanged) {
        status = 'BERUBAH';
      }
    }

    const hasCatatan = Boolean(cr.catatan_revisi_baris && cr.catatan_revisi_baris.trim());

    if (status !== 'TETAP' || hasCatatan) {
      const itemDiff = {
        row_id: cr.id,
        tree_id: cr.tree_id,
        status,
        diff,
        semula_vol: sVol,
        semula_satuan: semulaRow ? (semulaRow.satuan_vol || '') : '',
        semula_formula: semulaRow ? (semulaRow.computed_formula || '') : '',
        semula_harga: sHarga,
        semula_jumlah: sJml,
        menjadi_vol: cr.computed_volume,
        menjadi_satuan: cr.satuan_vol || '',
        menjadi_formula: cr.computed_formula || '',
        menjadi_harga: Number(cr.harga_satuan) || 0,
        menjadi_jumlah: mJml,
        catatan: cr.catatan_revisi_baris || ''
      };

      byRowId[cr.id] = itemDiff;

      if (status !== 'TETAP' && !cr.is_header) {
        logDetail.push({
          ...itemDiff,
          kode: cr.kode || '',
          uraian: cr.uraian,
          kode_akun: cr.kode_akun || '',
          pic_bagian: cr.pic_bagian || ''
        });
      }
    }
  }

  // Akuntansi baris yang dihapus dari dokumen induk (Baseline)
  for (const pr of parentCalc.rows) {
    if (!matchedParentIds.has(pr.id) && !pr.is_header && (pr.computed_total || 0) > 0) {
      const diff = -pr.computed_total;
      deltaBerkurang += pr.computed_total;
      logDetail.push({
        row_id: null,
        tree_id: pr.tree_id,
        status: 'DIHAPUS',
        diff,
        semula_vol: pr.computed_volume,
        semula_satuan: pr.satuan_vol || '',
        semula_formula: pr.computed_formula || '',
        semula_harga: Number(pr.harga_satuan) || 0,
        semula_jumlah: pr.computed_total,
        menjadi_vol: 0,
        menjadi_satuan: '',
        menjadi_formula: '',
        menjadi_harga: 0,
        menjadi_jumlah: 0,
        catatan: 'Baris rincian belanja dihapus dari dokumen semula',
        kode: pr.kode || '',
        uraian: pr.uraian,
        kode_akun: pr.kode_akun || '',
        pic_bagian: pr.pic_bagian || ''
      });
    }
  }

  return {
    has_parent: true,
    is_rkb_awal: false,
    parent_periode: {
      id: compPeriode.id,
      nama: compPeriode.nama_periode,
      versi_revisi: compPeriode.versi_revisi,
      dasar_pengesahan: compPeriode.dasar_pengesahan,
      total_pagu: totalSemula
    },
    summary: {
      totalSemula,
      totalMenjadi,
      netSelisih: totalMenjadi - totalSemula,
      deltaBertambah,
      deltaBerkurang,
      totalPerubahanItems: logDetail.length
    },
    by_row_id: byRowId,
    log_detail: logDetail
  };
}

function getRevisionSummary(periodeId, targetComparisonPeriodeId = null) {
  const comp = getRevisionComparison(periodeId, targetComparisonPeriodeId);
  return {
    has_parent: comp.has_parent,
    parent_periode: comp.parent_periode,
    summary: comp.summary,
    total_baru: (comp.log_detail || []).filter(x => x.status === 'BARU').length,
    total_perubahan: (comp.log_detail || []).length
  };
}

module.exports = {
  getWilayahData,
  getKuantitasMap,
  resolveVarValue,
  computeRowFactors,
  getHierarchyRank,
  calculateRkbDataset,
  getCachedRkbDataset,
  getRkbCalculatedDataset,
  filterAndPruneRkbDataset,
  clearRkbDatasetCache,
  getRevisionComparison,
  getRevisionSummary
};
