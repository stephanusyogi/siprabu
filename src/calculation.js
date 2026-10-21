/**
 * SI-PRABU Clean Web Edition v3.0
 * Modul Engine Perhitungan RKB, Rollup Hierarki Anggaran & Perbandingan Revisi
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
function calculateRkbDataset(rawRows) {
  let grandTotal = 0;
  let totalItems = 0;
  const bySubbag = { KUL: 0, RENDATIN: 0, TEKNIS: 0, HUKUM: 0, PARSDM: 0 };
  const byAkun = {};
  const bySasaran = { KAB: 0, PPK: 0, PPS: 0, TPS: 0, PANTARLIH: 0, PESERTA: 0 };

  // 1. Hitung seluruh baris item (level_indent === 4 dan row_type !== 'header')
  const processedRows = rawRows.map(r => {
    const isItem = r.row_type !== 'header' && (Number(r.level_indent) === 4);
    if (!isItem) {
      return {
        ...r,
        is_header: true,
        hierarchy_rank: getHierarchyRank(r),
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
      is_header: false,
      hierarchy_rank: 99,
      computed_volume: calc.volume,
      computed_formula: calc.formulaText,
      computed_total: calc.total_anggaran
    };
  });

  // 2. Build Tree Hierarchy (tree_id, parent_tree_id, tree_level, effective_indent, has_children)
  const headerStack = [];
  for (let idx = 0; idx < processedRows.length; idx++) {
    const row = processedRows[idx];
    const rowId = String(row.id || idx);
    row.tree_id = row.is_header ? `h_${rowId}` : `i_${rowId}`;

    if (row.is_header) {
      const lvl = Number(row.level_indent ?? 2);
      let treeLvl = 3;
      if (lvl === 0) treeLvl = 1;
      else if (lvl === 1) treeLvl = 2;
      else if (lvl === 2) treeLvl = 3;
      else if (lvl >= 21 && lvl <= 25) treeLvl = 4;
      else if (lvl === 3) treeLvl = 5;
      else if (lvl === 41 || lvl === 42) treeLvl = 5.5;
      row.tree_level = treeLvl;

      const rank = row.hierarchy_rank;
      while (headerStack.length > 0 && headerStack[headerStack.length - 1].rank >= rank) {
        headerStack.pop();
      }

      const parentNode = headerStack.length > 0 ? headerStack[headerStack.length - 1] : null;
      row.parent_tree_id = parentNode ? parentNode.tree_id : null;

      if (lvl === 3) {
        row.effective_indent = parentNode ? Math.max(parentNode.effective_indent, 28) : 28;
        row.is_akun_row = true;
        row.is_sub_header = false;
      } else if (lvl === 41 || lvl === 42) {
        row.effective_indent = parentNode ? (parentNode.effective_indent + 14) : 42;
        row.is_akun_row = false;
        row.is_sub_header = true;
      } else {
        row.effective_indent = lvl === 0 ? 0 : (lvl === 1 ? 14 : (lvl === 2 ? 28 : (lvl >= 21 && lvl <= 25 ? (28 + (lvl - 20) * 14) : 42)));
        row.is_akun_row = false;
        row.is_sub_header = false;
      }

      headerStack.push({
        rank,
        tree_id: row.tree_id,
        tree_level: treeLvl,
        effective_indent: row.effective_indent
      });
    } else {
      row.tree_level = 6;
      row.is_item_row = true;
      const parentNode = headerStack.length > 0 ? headerStack[headerStack.length - 1] : null;
      row.parent_tree_id = parentNode ? parentNode.tree_id : null;
      row.effective_indent = parentNode ? (parentNode.effective_indent + 14) : 42;
    }
  }

  // Hitung jumlah anak (child_count) dan has_children
  const childCountMap = {};
  for (const row of processedRows) {
    if (row.parent_tree_id) {
      childCountMap[row.parent_tree_id] = (childCountMap[row.parent_tree_id] || 0) + 1;
    }
  }
  for (const row of processedRows) {
    row.child_count = childCountMap[row.tree_id] || 0;
    row.has_children = row.child_count > 0;
  }

  // 3. Rollup Subtotals Hierarkis Presisi:
  // Setiap baris header menjumlahkan seluruh item detail di bawah cabangnya sampai bertemu header setingkat atau lebih tinggi
  for (let i = 0; i < processedRows.length; i++) {
    const r = processedRows[i];
    if (r.is_header) {
      const curRank = r.hierarchy_rank;
      let sum = 0;
      for (let j = i + 1; j < processedRows.length; j++) {
        const next = processedRows[j];
        if (next.is_header && next.hierarchy_rank <= curRank) break;
        if (!next.is_header) {
          sum += next.computed_total;
        }
      }
      r.computed_total = sum;
    }
  }

  // 4. Hitung Anti-Miskonsepsi Banner Metrics:
  // Tahapan 1-17, Operasional 18-28, dan Honor Adhoc + Pokja
  let tahapanTotal = 0;
  let operasionalTotal = 0;
  let honorTotal = 0;

  for (const r of processedRows) {
    if (r.is_header) {
      if (r.level_indent === 1 && r.kode === 'I.' && r.uraian.includes('TAHAPAN')) {
        tahapanTotal = r.computed_total;
      } else if (r.level_indent === 1 && r.kode === 'II.' && r.uraian.includes('OPERASIONAL')) {
        operasionalTotal = r.computed_total;
      } else if (r.level_indent === 0 && r.kode === 'B' && r.uraian.includes('HONORARIUM')) {
        honorTotal = r.computed_total;
      }
    }
  }

  const totalLevelPps = (bySasaran.PPS || 0) + (bySasaran.PANTARLIH || 0) + (bySasaran.TPS || 0);

  return {
    rows: processedRows,
    summary: {
      grandTotal,
      totalItems,
      totalRows: processedRows.length,
      bySubbag,
      byAkun,
      bySasaran,
      banner: {
        totalPagu: grandTotal,
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
        is_balance: grandTotal === 49999999000
      }
    }
  };
}

// Cache in-memory untuk kalkulasi dataset RKB per periode agar super cepat (response < 10ms)
const datasetCache = new Map();

function getCachedRkbDataset(periodeId) {
  const key = Number(periodeId);
  if (datasetCache.has(key)) {
    return datasetCache.get(key);
  }
  const rawRows = db.prepare('SELECT * FROM rab_baris WHERE periode_id = ? ORDER BY urutan, id').all(key);
  const result = calculateRkbDataset(rawRows);
  datasetCache.set(key, result);
  return result;
}

function clearRkbDatasetCache(periodeId = null) {
  if (periodeId !== null && periodeId !== undefined) {
    datasetCache.delete(Number(periodeId));
  } else {
    datasetCache.clear();
  }
}

/**
 * Menghitung perbandingan Semula - Menjadi untuk Dokumen Revisi RKB
 * Dioptimalkan dengan caching memori dan pemadatan payload (compact diff)
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

  // Tentukan Dokumen Pembanding (Baseline SSOT):
  // Aturan Tata Kelola Anggaran: Dokumen pembanding default adalah "RKB Awal" di Peta Siklus (revisi_ke = 0).
  let compPeriode = null;
  if (targetComparisonPeriodeId) {
    compPeriode = db.prepare('SELECT * FROM periode_anggaran WHERE id = ?').get(Number(targetComparisonPeriodeId));
  } else {
    // Cari RKB Awal di Peta Siklus yang bukan dokumen saat ini
    compPeriode = db.prepare(`
      SELECT * FROM periode_anggaran 
      WHERE (revisi_ke = 0 OR versi_revisi = 'RKB Awal' OR parent_periode_id IS NULL)
        AND id != ?
      ORDER BY id ASC LIMIT 1
    `).get(periode.id);

    // Fallback: jika dokumen saat ini turunan bertingkat dan tidak ada RKB Awal lain yang terdaftar selain parent
    if (!compPeriode && periode.parent_periode_id) {
      compPeriode = db.prepare('SELECT * FROM periode_anggaran WHERE id = ?').get(Number(periode.parent_periode_id));
    }
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

  // Gunakan cached dataset untuk parent dan current (tanpa double-fetching dan double-calculation)
  const parentCalc = getCachedRkbDataset(compPeriode.id);
  const currCalc = precomputedCurrCalc || getCachedRkbDataset(periode.id);

  const parentMap = {};
  for (const pr of parentCalc.rows) {
    parentMap[pr.id] = pr;
  }

  const byRowId = {};
  const logDetail = [];
  let totalSemula = parentCalc.summary.grandTotal;
  let totalMenjadi = currCalc.summary.grandTotal;
  let deltaBertambah = 0;
  let deltaBerkurang = 0;

  const matchedParentIds = new Set();

  for (const cr of currCalc.rows) {
    if (cr.semula_row_id) {
      matchedParentIds.add(cr.semula_row_id);
    }
    const semulaRow = cr.semula_row_id ? parentMap[cr.semula_row_id] : null;
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
    }

    const hasCatatan = Boolean(cr.catatan_revisi_baris && cr.catatan_revisi_baris.trim());

    // Pemadatan payload: hanya kirim rincian baris jika status !== TETAP atau ada catatan!
    // Untuk baris TETAP tanpa catatan, client sudah memiliki fallback otomatis.
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
          kode_akun: cr.kode_akun || ''
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
        status: 'BERKURANG',
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
        kode_akun: pr.kode_akun || ''
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

/**
 * Ringkasan cepat perbandingan revisi (khusus Pusat Siklus & Matriks Dashboard)
 * Hanya memuat angka rekapitulasi tanpa baris individual (payload < 1 KB)
 */
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
  clearRkbDatasetCache,
  getRevisionComparison,
  getRevisionSummary
};
