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
  const kRows = db.prepare("SELECT kode, nilai FROM master_kuantitas WHERE kode IN ('kpps_ketua_tps', 'kpps_anggota_tps', 'linmas_per_tps')").all();
  const kForm = {};
  for (const kr of kRows) kForm[kr.kode] = Number(kr.nilai);
  const kppsKetuaPerTps = Number.isFinite(kForm.kpps_ketua_tps) ? kForm.kpps_ketua_tps : 1;
  const kppsAnggotaPerTps = Number.isFinite(kForm.kpps_anggota_tps) ? kForm.kpps_anggota_tps : 6;
  const linmasPerTps = Number.isFinite(kForm.linmas_per_tps) ? kForm.linmas_per_tps : 2;
  const kppsOnlyPerTps = kppsKetuaPerTps + kppsAnggotaPerTps;
  const petugasAllPerTps = kppsOnlyPerTps + linmasPerTps;

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
    const tpsCount = Math.round(Number(d.tps) || 0);
    const kotakCount = d.kotak !== null && d.kotak !== undefined ? Math.round(Number(d.kotak) || 0) : tpsCount;
    const pantarlihCount = Math.round(Number(d.pantarlih) || (tpsCount > 0 ? tpsCount * 2 : 0));
    const pemilihCount = Math.round(Number(d.pemilih) || 0);

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
      ketua_kpps: tpsCount * kppsKetuaPerTps,
      anggota_kpps: tpsCount * kppsAnggotaPerTps,
      kpps: tpsCount * kppsOnlyPerTps,
      linmas: tpsCount * linmasPerTps,
      petugas_tps: tpsCount * petugasAllPerTps
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

  const livePantarlih = agg.sumPantarlih !== null && agg.sumPantarlih !== undefined ? Math.round(Number(agg.sumPantarlih)) : 0;
  const liveDesa = agg.jmlDesa !== null && agg.jmlDesa !== undefined ? Math.round(Number(agg.jmlDesa)) : 0;
  const liveTps = agg.sumTps !== null && agg.sumTps !== undefined ? Math.round(Number(agg.sumTps)) : 0;
  const liveKotak = agg.sumKotak !== null && agg.sumKotak !== undefined ? Math.round(Number(agg.sumKotak)) : liveTps;
  const livePemilih = agg.sumPemilih !== null && agg.sumPemilih !== undefined ? Math.round(Number(agg.sumPemilih)) : 0;
  
  let liveKec = 0;
  try {
    liveKec = Number(db.prepare('SELECT COUNT(*) as cnt FROM master_kecamatan').get()?.cnt) || 0;
  } catch (e) {}

  let livePaslon = 0;
  let livePaslonParpol = 0;
  let livePaslonPerseorangan = 0;
  try {
    livePaslon = Number(db.prepare('SELECT COUNT(*) as cnt FROM master_paslon').get()?.cnt) || 0;
    livePaslonParpol = Number(db.prepare("SELECT COUNT(*) as cnt FROM master_paslon WHERE keterangan = 'Jalur Parpol'").get()?.cnt) || 0;
    livePaslonPerseorangan = Number(db.prepare("SELECT COUNT(*) as cnt FROM master_paslon WHERE keterangan = 'Jalur Perseorangan'").get()?.cnt) || 0;
  } catch (e) {}

  const map = {};
  for (const k of list) {
    map[k.kode] = k;
  }

  const liveKomisioner = map.komisioner && map.komisioner.nilai !== undefined ? (Number(map.komisioner.nilai) || 0) : 5;
  const liveSekretariat = map.sekretariat_kpu && map.sekretariat_kpu.nilai !== undefined ? (Number(map.sekretariat_kpu.nilai) || 0) : 35;
  const liveKpuAll = liveKomisioner + liveSekretariat;
  const kppsKetuaPerTps = map.kpps_ketua_tps && map.kpps_ketua_tps.nilai !== undefined ? (Number(map.kpps_ketua_tps.nilai) || 0) : 1;
  const kppsAnggotaPerTps = map.kpps_anggota_tps && map.kpps_anggota_tps.nilai !== undefined ? (Number(map.kpps_anggota_tps.nilai) || 0) : 6;
  const linmasPerTps = map.linmas_per_tps && map.linmas_per_tps.nilai !== undefined ? (Number(map.linmas_per_tps.nilai) || 0) : 2;
  const kppsAllPerTps = kppsKetuaPerTps + kppsAnggotaPerTps + linmasPerTps;

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
    } else if (k.kode === 'surat_suara') {
      const liveSuratSuara = Math.round(livePemilih * 1.025);
      k.nilai = liveSuratSuara;
      k.keterangan = `@dpt (${livePemilih.toLocaleString('id-ID')}) + 2,5% = ${liveSuratSuara.toLocaleString('id-ID')} Lembar`;
    } else if (k.kode === 'paslon' || k.kode === 'bakal_paslon') {
      k.nilai = livePaslon;
    } else if (k.kode === 'paslon_parpol') {
      k.nilai = livePaslonParpol;
    } else if (k.kode === 'paslon_perseorangan') {
      k.nilai = livePaslonPerseorangan;
    } else if (k.kode === 'kpu_all') {
      k.nilai = liveKpuAll;
      k.keterangan = `${liveKomisioner} Komisioner + ${liveSekretariat} Sekretariat = ${liveKpuAll} Org`;
    } else if (k.kode === 'kpps_ketua') {
      k.nilai = liveTps * kppsKetuaPerTps;
    } else if (k.kode === 'kpps_anggota') {
      k.nilai = liveTps * kppsAnggotaPerTps;
    } else if (k.kode === 'linmas_tps') {
      k.nilai = liveTps * linmasPerTps;
    } else if (k.kode === 'petugas_tps') {
      k.nilai = liveTps * kppsAllPerTps;
    } else if (k.kode === 'kpps_all') {
      k.nilai = kppsAllPerTps;
    } else if (k.kode === 'ppk_ketua') {
      k.nilai = liveKec * 1;
    } else if (k.kode === 'ppk_anggota') {
      k.nilai = liveKec * 4;
    } else if (k.kode === 'ppk_komisioner') {
      k.nilai = liveKec * 5;
    } else if (k.kode === 'ppk_sekretaris') {
      k.nilai = liveKec * 1;
    } else if (k.kode === 'ppk_staf') {
      k.nilai = liveKec * 2;
    } else if (k.kode === 'ppk_sekretariat') {
      k.nilai = liveKec * 3;
    } else if (k.kode === 'pps_ketua') {
      k.nilai = liveDesa * 1;
    } else if (k.kode === 'pps_anggota') {
      k.nilai = liveDesa * 2;
    } else if (k.kode === 'pps_komisioner') {
      k.nilai = liveDesa * 3;
    } else if (k.kode === 'pps_sekretaris') {
      k.nilai = liveDesa * 1;
    } else if (k.kode === 'pps_staf') {
      k.nilai = liveDesa * 2;
    } else if (k.kode === 'pps_sekretariat') {
      k.nilai = liveDesa * 3;
    }
    map[k.kode] = k;
  }
  if (!map.bakal_paslon && map.paslon) {
    map.bakal_paslon = map.paslon;
  }
  if (!map.kotak_rkb) {
    map.kotak_rkb = { kode: 'kotak_rkb', nama: 'Jumlah Kotak Suara Kabupaten', nilai: liveKotak, satuan: 'Kotak' };
  }
  if (!map.surat_suara) {
    map.surat_suara = { kode: 'surat_suara', nama: 'Kebutuhan Surat Suara (DPT + 2,5%)', nilai: Math.round(livePemilih * 1.025), satuan: 'Lembar' };
  }
  if (!map.kpps_ketua_tps) {
    map.kpps_ketua_tps = { kode: 'kpps_ketua_tps', nama: 'Ketua KPPS per TPS', nilai: kppsKetuaPerTps, satuan: 'Org' };
  }
  if (!map.kpps_anggota_tps) {
    map.kpps_anggota_tps = { kode: 'kpps_anggota_tps', nama: 'Anggota KPPS per TPS', nilai: kppsAnggotaPerTps, satuan: 'Org' };
  }
  if (!map.linmas_per_tps) {
    map.linmas_per_tps = { kode: 'linmas_per_tps', nama: 'Petugas Ketertiban (Linmas) per TPS', nilai: linmasPerTps, satuan: 'Org' };
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
      const rawNum = Number(parseIndonesianNumber(fs.val) || 0);
      if (unitLower === 'paslon') {
        const uLower = String(r.uraian || '').toLowerCase();
        if (uLower.includes('perseorangan')) {
          varCode = 'paslon_perseorangan';
        } else if (uLower.includes('jalur parpol') || uLower.includes('paslon parpol')) {
          varCode = 'paslon_parpol';
        } else {
          varCode = 'paslon';
        }
      } else if (unitLower === 'parpol' || unitLower === 'partai' || unitLower.includes('parpol')) {
        varCode = 'parpol';
      } else if (unitLower === 'komisioner') {
        varCode = 'komisioner';
      } else if (unitLower === 'pemilih') {
        varCode = 'dpt';
      } else if (unitLower === 'lembar ss' || ((unitLower === 'lembar' || unitLower.includes('lembar')) && rawNum >= 100000 && String(r.uraian || '').toLowerCase().includes('surat suara'))) {
        varCode = 'surat_suara';
      } else if (unitLower === 'tps' && rawNum >= 100) {
        varCode = 'tps_rkb';
      } else if (unitLower === 'kotak' && rawNum >= 100) {
        varCode = 'kotak_rkb';
      } else if (unitLower === 'pantarlih' || unitLower === 'ppdp') {
        varCode = 'pantarlih';
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
      if (cleanKey === 'dpt' || cleanKey === 'pemilih_dpt' || cleanKey === 'surat_suara' || unitLower === 'pemilih') {
        vNum = Math.round(Number(vNum) || 0);
      }
    } else {
      const parsed = parseIndonesianNumber(fs.val);
      vNum = parsed !== null ? parsed : 0;
      if (unitLower === 'pemilih') {
        vNum = Math.round(Number(vNum) || 0);
      }
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
  if (basis && basis !== 'NONE' && basis !== 'FIXED') {
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
 * Menghitung tingkat hierarki (rank) untuk nesting & rollup secara presisi sesuai struktur level RKB
 */
function getHierarchyRank(row) {
  if (!row || (row.row_type !== 'header' && !row.is_header)) return 99;
  const lvl = Number(row.level_indent ?? 2);
  const kode = String(row.kode || '').trim();
  const uraian = String(row.uraian || '').trim();
  if (lvl === 0) return 10;                     // Level 1 (Grand Title: A, B)
  if (lvl === 1) return 20;                     // Level 2 (Tahapan/Operasional: I, II)
  if (lvl === 2) return 30;                     // Level 3 (Kegiatan 1..28)
  if (lvl === 21) {
    if (!kode && /^-\s/.test(uraian)) return 42;
    return 41;                                  // Level 4.1 (a., b., c.)
  }
  if (lvl === 22) {
    const isNumbered = /^\d+[\)\.]/.test(kode) || /^\d+[\)\.]/.test(uraian);
    if (isNumbered) return 42;                  // Level 4.2 (1), 2), 3))
    const isGroupParent = /^(dengan\s|ditingkat\s|pembentukan\s|pelantikan|pergantian\s+antar\s+waktu|penerimaan\s+dan\s+penelitian|penelitian\s+hasil\s+perbaikan|penelitian\s+persyaratan|perbaikan\s+syarat)/i.test(uraian);
    if (isGroupParent) return 41.5;             // Group Induk di bawah a./b. yang membawahi 1), 2)
    return 42.5;                                // Sub-grup di bawah 1), 2)
  }
  if (lvl === 23) return 43;                    // Level 4.3 (a), b))
  if (lvl === 24) return 44;                    // Level 4.4 (b.1., -. Rapat)
  if (lvl >= 25 && lvl <= 29) return 40 + (lvl - 20);
  if (lvl === 3) return 50;                     // Level 5 (Akun Belanja 5xxxxx)
  if (lvl === 4 || lvl === 41) {
    if (/^[a-z][\.,]?$/i.test(kode)) {
      if (/^dalam\s+rangka/i.test(uraian)) return 60.5;
      return 41;
    }
    if (/^\d+[\)\.]?$/.test(kode)) return 60.2;
    return 61;                                  // Header Teks di bawah Akun
  }
  if (lvl === 42) return 62;                    // Sub-Header di bawah Header 1
  return 45;
}

function getTreeLevelFromRank(rank, isHeader) {
  if (!isHeader || rank >= 99) return 6;
  if (rank === 10) return 1;
  if (rank === 20) return 2;
  if (rank === 30) return 3;
  if (rank > 30 && rank < 50) return 4;
  if (rank === 50) return 5;
  return 5.5;
}

function getEffectiveIndentFromRank(rank, isHeader, depth = 0) {
  if (rank === 10) return 6;
  if (rank === 20) return 16;
  if (rank === 30) return 26;
  if (rank === 41) return 38;
  if (rank === 41.5) return 48;
  if (rank === 42) return 58;
  if (rank === 42.5) return 68;
  if (rank >= 43 && rank < 50) return 76;
  if (rank === 50) return Math.max(44, depth * 12 + 10);
  if (rank > 50 && rank < 99) return Math.max(56, depth * 12 + 14);
  return Math.max(58, depth * 12 + 16);
}

/**
 * Menyusun struktur pohon (tree_id, parent_tree_id, tree_level, effective_indent)
 * menggunakan Dynamic Rank Stack dan menghitung rollup subtotal vertikal ke seluruh level induk.
 */
function buildHierarchyTreeAndRollup(processedRows) {
  const headerStack = [];
  const allRowsWithTree = processedRows.map((r, idx) => {
    const isHeader = Boolean(r.is_header || r.row_type === 'header');
    const rank = isHeader ? getHierarchyRank(r) : 99;
    const treeId = `row_${r.id || idx}`;

    while (headerStack.length > 0 && headerStack[headerStack.length - 1].rank >= rank) {
      headerStack.pop();
    }

    const parentEntry = headerStack.length > 0 ? headerStack[headerStack.length - 1] : null;
    const parentTreeId = parentEntry ? parentEntry.treeId : null;
    const depth = headerStack.length;

    if (isHeader) {
      headerStack.push({ treeId, rank });
    }

    const treeLevel = getTreeLevelFromRank(rank, isHeader);
    const effectiveIndent = getEffectiveIndentFromRank(rank, isHeader, depth);
    const lvlNum = Number(r.level_indent);

    return {
      ...r,
      is_header: isHeader,
      hierarchy_rank: rank,
      tree_id: treeId,
      parent_tree_id: parentTreeId,
      tree_level: treeLevel,
      effective_indent: effectiveIndent,
      is_akun_row: isHeader && lvlNum === 3,
      is_sub_header: isHeader && (lvlNum === 41 || lvlNum === 42)
    };
  });

  const rowByTreeId = {};
  allRowsWithTree.forEach(r => { rowByTreeId[r.tree_id] = r; });

  const totalsByTreeId = {};
  allRowsWithTree.forEach(r => {
    if (!r.is_header) {
      const itemTotal = Number(r.computed_total) || 0;
      let cur = r.parent_tree_id;
      while (cur && rowByTreeId[cur]) {
        totalsByTreeId[cur] = (totalsByTreeId[cur] || 0) + itemTotal;
        cur = rowByTreeId[cur].parent_tree_id;
      }
    }
  });

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

  return finalRows;
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

  // 2 & 3. Bangun pohon hierarki berbasis stack rank & hitung rollup vertikal ke setiap level induk
  const finalRows = buildHierarchyTreeAndRollup(processedRows);

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
          rows: buildHierarchyTreeAndRollup(snap.rows),
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

/**
 * Bab 19 Canon Master Blueprint:
 * Audit Integritas Data RKB Pra-Operasional (100% Read-Only, Tanpa Mengubah Data Secara Otomatis)
 */
function auditRkbIntegrity(periodeId) {
  const key = Number(periodeId);
  const dataset = getRkbCalculatedDataset(key);
  const rows = dataset.rows || [];

  const akunRows = db.prepare('SELECT kode, uraian FROM master_akun').all();
  const validAkuns = new Map(akunRows.map(a => [String(a.kode).trim(), a.uraian]));
  const sbmRows = db.prepare('SELECT * FROM master_sbm').all();

  const rowByTreeId = {};
  rows.forEach(r => { rowByTreeId[r.tree_id] = r; });

  const findings = [];
  const rowStatusMap = new Map(); // row.id -> 'KRITIS' | 'PERINGATAN' | 'VALID'

  const markRowStatus = (rowId, severity) => {
    const cur = rowStatusMap.get(rowId) || 'VALID';
    if (severity === 'KRITIS') {
      rowStatusMap.set(rowId, 'KRITIS');
    } else if (severity === 'PERINGATAN' && cur !== 'KRITIS') {
      rowStatusMap.set(rowId, 'PERINGATAN');
    }
  };

  rows.forEach(r => {
    rowStatusMap.set(r.id, 'VALID');
  });

  // 1-5 Pemeriksaan per baris
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    const locLabel = `Baris #${r.urutan || (idx + 1)} [${r.kode || (r.is_header ? 'HEADER' : 'ITEM')}] ${r.uraian || ''}`;
    const parentRow = r.parent_tree_id ? rowByTreeId[r.parent_tree_id] : null;

    if (!r.is_header) {
      // 1. Audit Kuantitas: cek keterhubungan variabel @var atau basis_pengali untuk kata kunci SSOT
      const hasAnyVar = Boolean(
        (r.f1_var && r.f1_var !== 'MANUAL' && r.f1_var !== 'FIXED') ||
        (r.f2_var && r.f2_var !== 'MANUAL' && r.f2_var !== 'FIXED') ||
        (r.f3_var && r.f3_var !== 'MANUAL' && r.f3_var !== 'FIXED') ||
        (r.f4_var && r.f4_var !== 'MANUAL' && r.f4_var !== 'FIXED') ||
        (r.basis_pengali && r.basis_pengali !== 'NONE' && r.basis_pengali !== 'FIXED')
      );
      const combinedText = `${r.uraian || ''} ${r.f1_unit || ''} ${r.f2_unit || ''} ${r.f3_unit || ''} ${r.f4_unit || ''} ${r.satuan_vol || ''}`.toLowerCase();
      const ssotKeywords = [
        { kw: 'tps', ref: '@tps_rkb (Master TPS Desa)' },
        { kw: 'ppk', ref: '@kec_ppk (Master 19 Kecamatan)' },
        { kw: 'pps', ref: '@desa_pps (Master 217 Desa)' },
        { kw: 'pantarlih', ref: '@pantarlih (Master Pantarlih Desa)' },
        { kw: 'kpps', ref: '@kpps_ketua / @kpps_anggota (Master TPS)' },
        { kw: 'linmas', ref: '@linmas_tps (Master TPS)' },
        { kw: 'paslon', ref: '@paslon (Master Pasangan Calon)' }
      ];
      if (!hasAnyVar) {
        const matchedKw = ssotKeywords.find(k => new RegExp(`\\b${k.kw}\\b`, 'i').test(combinedText));
        if (matchedKw) {
          markRowStatus(r.id, 'PERINGATAN');
          findings.push({
            row_id: r.id,
            urutan: r.urutan || (idx + 1),
            tingkat: 'PERINGATAN',
            kategori: 'KUANTITAS',
            lokasi_baris: locLabel,
            jenis_masalah: 'Kuantitas Manual Tanpa Ikatan Variabel SSOT (@var)',
            nilai_ditemukan: r.computed_formula || `${r.computed_volume || 0} ${r.satuan_vol || ''}`,
            acuan_seharusnya: matchedKw.ref,
            panduan_perbaikan: `Hubungkan faktor pengali baris ini ke variabel ${matchedKw.ref} pada modal Edit Rincian agar otomatis mengikuti perubahan Master Data.`
          });
        }
      }

      // 2. Audit Harga Satuan (SBM)
      const harga = Number(r.harga_satuan) || 0;
      if (harga <= 0) {
        markRowStatus(r.id, 'KRITIS');
        findings.push({
          row_id: r.id,
          urutan: r.urutan || (idx + 1),
          tingkat: 'KRITIS',
          kategori: 'HARGA_SATUAN',
          lokasi_baris: locLabel,
          jenis_masalah: 'Harga Satuan Nol atau Tidak Valid',
          nilai_ditemukan: `Rp ${harga.toLocaleString('id-ID')}`,
          acuan_seharusnya: '> Rp 0 (Sesuai Standar Biaya Masukan / RKA)',
          panduan_perbaikan: 'Isi harga satuan belanja yang valid (> Rp 0) pada baris rincian ini.'
        });
      } else {
        const uLower = String(r.uraian || '').toLowerCase();
        const matchedSbm = sbmRows.find(s => {
          const sUraian = String(s.uraian || '').toLowerCase().trim();
          return sUraian.length >= 6 && (uLower.includes(sUraian) || sUraian.includes(uLower));
        });
        if (matchedSbm) {
          const batasSbm = Number(matchedSbm.pagu_sbm || matchedSbm.harga_satuan) || 0;
          if (batasSbm > 0 && harga > batasSbm) {
            markRowStatus(r.id, 'KRITIS');
            findings.push({
              row_id: r.id,
              urutan: r.urutan || (idx + 1),
              tingkat: 'KRITIS',
              kategori: 'HARGA_SATUAN',
              lokasi_baris: locLabel,
              jenis_masalah: 'Harga Satuan Melampaui Batas Pagu SBM',
              nilai_ditemukan: `Rp ${harga.toLocaleString('id-ID')}`,
              acuan_seharusnya: `Maks Rp ${batasSbm.toLocaleString('id-ID')} (${matchedSbm.uraian})`,
              panduan_perbaikan: `Turunkan harga satuan agar tidak melebihi pagu SBM (${matchedSbm.dasar_hukum || 'PMK SBM'}).`
            });
          }
        }
      }

      // 3. Audit Akun & Hierarki (L6 wajib memiliki kode akun 6-digit valid & berada di bawah induk)
      const kodeAkun = String(r.kode_akun || '').trim();
      if (!/^\d{6}$/.test(kodeAkun) || !validAkuns.has(kodeAkun)) {
        markRowStatus(r.id, 'KRITIS');
        findings.push({
          row_id: r.id,
          urutan: r.urutan || (idx + 1),
          tingkat: 'KRITIS',
          kategori: 'AKUN_HIERARKI',
          lokasi_baris: locLabel,
          jenis_masalah: 'Kode Akun BAS 6-Digit Tidak Terdaftar di Master BAS',
          nilai_ditemukan: kodeAkun || '(Kosong)',
          acuan_seharusnya: 'Kode Akun 6-Digit Terdaftar di Master BAS (misal: 521211, 521213)',
          panduan_perbaikan: 'Pilih Kode Akun 6-digit yang sah melalui tombol Ubah Akun atau Edit Rincian.'
        });
      }
      if (!parentRow) {
        markRowStatus(r.id, 'KRITIS');
        findings.push({
          row_id: r.id,
          urutan: r.urutan || (idx + 1),
          tingkat: 'KRITIS',
          kategori: 'AKUN_HIERARKI',
          lokasi_baris: locLabel,
          jenis_masalah: 'Baris Rincian Belanja (L6) Tanpa Induk Hierarki',
          nilai_ditemukan: 'Tidak memiliki baris induk (Orphan Item)',
          acuan_seharusnya: 'Berada di bawah Header Akun BAS (L5) / Sub-Komponen (L4)',
          panduan_perbaikan: 'Pindahkan urutan baris rincian ini ke bawah Header Akun BAS yang sesuai.'
        });
      }

      // 4. Audit Perhitungan Item (Volume x Harga Satuan === Total)
      const calc = computeRowFactors(r, 'KAB');
      const expectedTotal = Math.round(calc.volume * calc.harga_satuan);
      const actualTotal = Math.round(Number(r.computed_total) || 0);
      if (Math.abs(expectedTotal - actualTotal) > 1) {
        markRowStatus(r.id, 'KRITIS');
        findings.push({
          row_id: r.id,
          urutan: r.urutan || (idx + 1),
          tingkat: 'KRITIS',
          kategori: 'PERHITUNGAN',
          lokasi_baris: locLabel,
          jenis_masalah: 'Ketidaksesuaian Perkalian Volume x Harga Satuan',
          nilai_ditemukan: `Rp ${actualTotal.toLocaleString('id-ID')}`,
          acuan_seharusnya: `Rp ${expectedTotal.toLocaleString('id-ID')} (${calc.volume} x Rp ${calc.harga_satuan.toLocaleString('id-ID')})`,
          panduan_perbaikan: 'Buka dan simpan ulang baris rincian ini untuk menyinkronkan hasil perhitungan.'
        });
      }
    } else {
      // Baris Header: Cek Perhitungan Rollup Subtotal Induk terhadap anak langsungnya
      const directChildren = rows.filter(child => child.parent_tree_id === r.tree_id);
      if (directChildren.length > 0) {
        const sumChildren = Math.round(directChildren.reduce((acc, c) => acc + (Number(c.computed_total) || 0), 0));
        const headerTotal = Math.round(Number(r.computed_total) || 0);
        if (Math.abs(sumChildren - headerTotal) > 1) {
          markRowStatus(r.id, 'KRITIS');
          findings.push({
            row_id: r.id,
            urutan: r.urutan || (idx + 1),
            tingkat: 'KRITIS',
            kategori: 'PERHITUNGAN',
            lokasi_baris: locLabel,
            jenis_masalah: 'Subtotal Induk Tidak Sama Dengan Jumlah Rincian di Bawahnya',
            nilai_ditemukan: `Rp ${headerTotal.toLocaleString('id-ID')}`,
            acuan_seharusnya: `Rp ${sumChildren.toLocaleString('id-ID')}`,
            panduan_perbaikan: 'Periksa struktur hierarki di bawah induk ini agar tidak terjadi salah hitung atau penghitungan ganda.'
          });
        }
      }
    }

    // 5. Audit Konsistensi Data (PIC & Sasaran terhadap baris induk langsung untuk L3..L6)
    const rRank = r.hierarchy_rank || 99;
    if (parentRow && rRank >= 50 && (parentRow.hierarchy_rank || 10) >= 30) {
      const parentPic = String(parentRow.pic_bagian || '').toUpperCase().trim();
      const childPic = String(r.pic_bagian || '').toUpperCase().trim();
      if (parentPic && childPic && parentPic !== childPic) {
        markRowStatus(r.id, 'PERINGATAN');
        findings.push({
          row_id: r.id,
          urutan: r.urutan || (idx + 1),
          tingkat: 'PERINGATAN',
          kategori: 'KONSISTENSI_DATA',
          lokasi_baris: locLabel,
          jenis_masalah: 'Ketidakselarasan PIC Subbagian antara Induk dan Anak',
          nilai_ditemukan: `PIC Anak: ${childPic}`,
          acuan_seharusnya: `PIC Induk: ${parentPic} (${parentRow.kode || ''} ${parentRow.uraian || ''})`,
          panduan_perbaikan: `Gunakan fitur Ubah PIC dengan opsi Cascade pada baris induk atau sesuaikan PIC baris ini menjadi ${parentPic}.`
        });
      }
    }
  }

  let kritisCount = 0;
  let peringatanCount = 0;
  let validCount = 0;
  for (const status of rowStatusMap.values()) {
    if (status === 'KRITIS') kritisCount++;
    else if (status === 'PERINGATAN') peringatanCount++;
    else validCount++;
  }

  return {
    periode_id: key,
    summary: {
      kritis: findings.filter(f => f.tingkat === 'KRITIS').length,
      peringatan: findings.filter(f => f.tingkat === 'PERINGATAN').length,
      valid: validCount,
      baris_kritis: kritisCount,
      baris_peringatan: peringatanCount,
      total_checked: rows.length
    },
    findings
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
  getRevisionSummary,
  auditRkbIntegrity
};
