/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Engine Perhitungan RKB & Rollup Hierarki Anggaran
 * Pengembang: emenje
 */

const { db } = require('./db');

// Cache wilayah & kuantitas
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
    petugas_tps: 0
  };
  for (const v of variabels) kabVars[v.kode] = 0;

  for (const d of desaList) {
    let custom = {};
    try { custom = JSON.parse(d.custom_vars || '{}'); } catch (e) { custom = {}; }
    const tpsCount = Number(d.tps) || 0;
    const vars = {
      tps: tpsCount,
      kotak: Number(d.kotak) || 0,
      pantarlih: Number(d.pantarlih) || 0,
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
    jumlah_tps: desaList.reduce((acc, d) => acc + (Number(d.tps) || 0), 0),
    vars: kabVars,
    kecList,
    desaList,
    desaByKec
  };
}

function getKuantitasMap() {
  const list = db.prepare('SELECT * FROM master_kuantitas ORDER BY id').all();
  const agg = db.prepare('SELECT COUNT(*) as jmlDesa, SUM(tps) as sumTps, SUM(pantarlih) as sumPantarlih FROM master_desa').get() || {};
  const livePantarlih = Number(agg.sumPantarlih) || 2537;
  const liveDesa = Number(agg.jmlDesa) || 217;
  const liveTps = Number(agg.sumTps) || 1374;
  const liveKec = Number(db.prepare('SELECT COUNT(*) as cnt FROM master_kecamatan').get()?.cnt) || 19;

  const map = {};
  for (const k of list) {
    if (k.kode === 'pantarlih') {
      k.nilai = livePantarlih;
    } else if (k.kode === 'tps_rkb') {
      k.nilai = Number(k.nilai) || 1371;
    } else if (k.kode === 'desa_pps') {
      k.nilai = liveDesa;
    } else if (k.kode === 'kec_ppk') {
      k.nilai = liveKec;
    }
    map[k.kode] = k;
  }
  return map;
}

function resolveVarValue(varCode, fallbackVal, contextType, entityData, kabSummary, kuantitasMap) {
  if (!varCode || varCode === 'MANUAL' || varCode === 'FIXED') {
    const n = Number(fallbackVal);
    return (fallbackVal !== null && fallbackVal !== '' && !Number.isNaN(n) && n > 0) ? n : 1;
  }
  if (varCode === 'PPK' || varCode === 'kec_ppk') {
    if (contextType === 'KAB') return kabSummary.jumlah_ppk;
    return 1;
  }
  if (varCode === 'PPS' || varCode === 'desa_pps') {
    if (contextType === 'KAB') return kabSummary.jumlah_pps;
    if (contextType === 'PPK') return entityData ? entityData.jumlah_desa : 1;
    return 1;
  }
  if (varCode === 'TPS_RKB' || varCode === 'tps_rkb') {
    if (contextType === 'KAB') return (kuantitasMap && kuantitasMap.tps_rkb) ? Number(kuantitasMap.tps_rkb.nilai) || 1371 : 1371;
    if (entityData && entityData.vars) return Number(entityData.vars.tps) || 0;
    return 0;
  }
  if (varCode === 'KOTAK_RKB') {
    if (contextType === 'KAB') return (kuantitasMap && kuantitasMap.tps_rkb) ? Number(kuantitasMap.tps_rkb.nilai) || 1371 : 1371;
    if (entityData && entityData.vars) return Number(entityData.vars.kotak) || 0;
    return 0;
  }

  const lowerCode = String(varCode).toLowerCase();
  if (lowerCode === 'ppk_ketua') return contextType === 'KAB' ? kabSummary.jumlah_ppk * 1 : 1;
  if (lowerCode === 'ppk_anggota') return contextType === 'KAB' ? kabSummary.jumlah_ppk * 4 : 4;
  if (lowerCode === 'ppk_komisioner') return contextType === 'KAB' ? kabSummary.jumlah_ppk * 5 : 5;
  if (lowerCode === 'ppk_sekretaris') return contextType === 'KAB' ? kabSummary.jumlah_ppk * 1 : 1;
  if (lowerCode === 'ppk_staf') return contextType === 'KAB' ? kabSummary.jumlah_ppk * 2 : 2;
  if (lowerCode === 'ppk_sekretariat') return contextType === 'KAB' ? kabSummary.jumlah_ppk * 3 : 3;

  if (lowerCode === 'pps_ketua') return contextType === 'KAB' ? kabSummary.jumlah_pps * 1 : (entityData ? entityData.jumlah_desa * 1 : 1);
  if (lowerCode === 'pps_anggota') return contextType === 'KAB' ? kabSummary.jumlah_pps * 2 : (entityData ? entityData.jumlah_desa * 2 : 2);
  if (lowerCode === 'pps_komisioner') return contextType === 'KAB' ? kabSummary.jumlah_pps * 3 : (entityData ? entityData.jumlah_desa * 3 : 3);
  if (lowerCode === 'pps_sekretaris') return contextType === 'KAB' ? kabSummary.jumlah_pps * 1 : (entityData ? entityData.jumlah_desa * 1 : 1);
  if (lowerCode === 'pps_staf') return contextType === 'KAB' ? kabSummary.jumlah_pps * 2 : (entityData ? entityData.jumlah_desa * 2 : 2);
  if (lowerCode === 'pps_sekretariat') return contextType === 'KAB' ? kabSummary.jumlah_pps * 3 : (entityData ? entityData.jumlah_desa * 3 : 3);

  if (kuantitasMap && kuantitasMap[varCode]) {
    return Number(kuantitasMap[varCode].nilai) || 1;
  }
  const n = Number(fallbackVal);
  return (!Number.isNaN(n) && n > 0) ? n : 1;
}

function computeRowFactors(r, contextType = 'KAB', entityData = null) {
  if (!cachedWilayah) cachedWilayah = getWilayahData();
  if (!cachedKuantitas) cachedKuantitas = getKuantitasMap();

  const kabSummary = cachedWilayah;
  const kuantitasMap = cachedKuantitas;
  const isAdhoc = contextType !== 'KAB';

  if (
    r.f1_val !== null &&
    r.f1_val !== '' &&
    r.f1_val !== undefined &&
    Number(r.f1_val) === 0 &&
    (!r.f1_var || r.f1_var === 'MANUAL')
  ) {
    return {
      baseFactor: 0,
      mult: 0,
      volume: 0,
      parts: [`0 ${r.f1_unit || ''}`.trim()],
      formulaText: `0 ${r.f1_unit || ''}`.trim(),
      harga_satuan: Number(r.harga_satuan) || 0,
      total_anggaran: 0
    };
  }

  const parts = [];
  let baseFactor = 1;

  const factorSpecs = [
    { val: r.f1_val, unit: r.f1_unit, varCode: r.f1_var },
    { val: r.f2_val, unit: r.f2_unit, varCode: r.f2_var },
    { val: r.f3_val, unit: r.f3_unit, varCode: r.f3_var },
    { val: r.f4_val, unit: r.f4_unit, varCode: r.f4_var }
  ];

  for (const fs of factorSpecs) {
    if (fs.varCode && fs.varCode !== '' && fs.varCode !== 'MANUAL') {
      const vNum = resolveVarValue(fs.varCode, fs.val, contextType, entityData, kabSummary, kuantitasMap);
      baseFactor *= vNum;
      const uLbl = fs.unit || (kuantitasMap[fs.varCode] ? kuantitasMap[fs.varCode].satuan : fs.varCode);
      parts.push(`${Number(vNum).toLocaleString('id-ID')} ${uLbl}`.trim());
    } else if (fs.val !== null && fs.val !== '' && fs.val !== undefined && Number(fs.val) > 0) {
      const vNum = Number(fs.val);
      baseFactor *= vNum;
      parts.push(`${vNum.toLocaleString('id-ID')} ${fs.unit || ''}`.trim());
    }
  }

  let mult = 1;
  if (!r.basis_pengali || r.basis_pengali === 'NONE') {
    mult = 1;
  } else if (r.basis_pengali === 'TPS_RKB' || r.basis_pengali === 'tps_rkb') {
    if (contextType === 'KAB') {
      mult = (kuantitasMap && kuantitasMap.tps_rkb) ? Number(kuantitasMap.tps_rkb.nilai) || 1371 : 1371;
    } else {
      mult = (entityData && entityData.vars) ? Number(entityData.vars.tps) || 0 : 0;
    }
  } else if (r.basis_pengali === 'KOTAK_RKB') {
    if (contextType === 'KAB') {
      mult = (kuantitasMap && kuantitasMap.tps_rkb) ? Number(kuantitasMap.tps_rkb.nilai) || 1371 : 1371;
    } else {
      mult = (entityData && entityData.vars) ? Number(entityData.vars.kotak) || 0 : 0;
    }
  } else if (contextType === 'KAB') {
    if (r.basis_pengali === 'PPK') mult = kabSummary.jumlah_ppk;
    else if (r.basis_pengali === 'PPS') mult = kabSummary.jumlah_pps;
    else if (r.basis_pengali === 'FIXED') mult = 1;
    else if (kabSummary.vars && r.basis_pengali in kabSummary.vars) mult = Number(kabSummary.vars[r.basis_pengali]) || 0;
    else mult = resolveVarValue(r.basis_pengali, 1, contextType, entityData, kabSummary, kuantitasMap);
  } else if (contextType === 'PPK') {
    if (r.basis_pengali === 'PPK') mult = 1;
    else if (r.basis_pengali === 'PPS') mult = entityData ? entityData.jumlah_desa : 1;
    else if (r.basis_pengali === 'FIXED') mult = 1;
    else if (entityData && entityData.vars && r.basis_pengali in entityData.vars) mult = Number(entityData.vars[r.basis_pengali]) || 0;
    else mult = resolveVarValue(r.basis_pengali, 1, contextType, entityData, kabSummary, kuantitasMap);
  } else if (contextType === 'PPS') {
    if (r.basis_pengali === 'PPS') mult = 1;
    else if (r.basis_pengali === 'FIXED') mult = 1;
    else if (entityData && entityData.vars && r.basis_pengali in entityData.vars) mult = Number(entityData.vars[r.basis_pengali]) || 0;
    else mult = resolveVarValue(r.basis_pengali, 1, contextType, entityData, kabSummary, kuantitasMap);
  }

  const label = isAdhoc ? (r.label_pengali_adhoc || r.label_pengali_kab || '') : (r.label_pengali_kab || '');
  if (r.basis_pengali && r.basis_pengali !== 'NONE' && (label || r.basis_pengali !== 'FIXED')) {
    parts.push(`${Number(mult).toLocaleString('id-ID')} ${label}`.trim());
  }

  const volume = baseFactor * mult;
  const harga = Number(r.harga_satuan) || 0;
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
 * Menghitung seluruh rollup hierarki RKB secara hierarkis presisi
 */
function calculateRkbDataset(rawRows) {
  let grandTotal = 0;
  let totalItems = 0;
  const bySubbag = { KUL: 0, RENDATIN: 0, TEKNIS: 0, HUKUM: 0, PARSDM: 0 };
  const byAkun = {};
  const bySasaran = { KAB: 0, PPK: 0, PPS: 0, TPS: 0, PANTARLIH: 0, PESERTA: 0 };

  // 1. Hitung seluruh baris item (level_indent === 4)
  const processedRows = rawRows.map(r => {
    const isItem = r.row_type !== 'header' && (Number(r.level_indent) === 4);
    if (!isItem) {
      return {
        ...r,
        computed_volume: null,
        computed_formula: '',
        computed_total: 0
      };
    }

    const calc = computeRowFactors(r, 'KAB');
    totalItems++;
    grandTotal += calc.total_anggaran;

    // Normalisasi PIC
    let pic = (r.pic_bagian || 'KUL').toUpperCase();
    if (pic === 'PERENCANAAN') pic = 'RENDATIN';
    if (pic === 'PARMAS') pic = 'PARSDM';
    if (!bySubbag[pic]) bySubbag[pic] = 0;
    bySubbag[pic] += calc.total_anggaran;

    // Akun
    const akun = r.kode_akun || '521211';
    if (!byAkun[akun]) byAkun[akun] = 0;
    byAkun[akun] += calc.total_anggaran;

    // Sasaran
    const sas = (r.target_scope || 'KAB').toUpperCase();
    if (!bySasaran[sas]) bySasaran[sas] = 0;
    bySasaran[sas] += calc.total_anggaran;

    return {
      ...r,
      computed_volume: calc.volume,
      computed_formula: calc.formulaText,
      computed_total: calc.total_anggaran
    };
  });

  // 2. Rollup subtotals hierarki presisi:
  // Untuk setiap baris header (level_indent < 4 atau level 41),
  // totalnya adalah jumlah seluruh item (level_indent === 4) setelahnya sampai bertemu header setingkat atau lebih tinggi
  for (let i = 0; i < processedRows.length; i++) {
    const r = processedRows[i];
    if (Number(r.level_indent) !== 4) {
      const lvl = Number(r.level_indent);
      let sum = 0;
      for (let j = i + 1; j < processedRows.length; j++) {
        const nextLvl = Number(processedRows[j].level_indent);
        if (nextLvl <= lvl) break;
        if (nextLvl === 4) {
          sum += processedRows[j].computed_total;
        }
      }
      r.computed_total = sum;
    }
  }

  return {
    rows: processedRows,
    summary: {
      grandTotal,
      totalItems,
      totalRows: processedRows.length,
      bySubbag,
      byAkun,
      bySasaran
    }
  };
}

module.exports = {
  getWilayahData,
  getKuantitasMap,
  resolveVarValue,
  computeRowFactors,
  calculateRkbDataset
};
