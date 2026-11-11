
function determineStatusPaketByStage(stageNo) {
  const n = Number(stageNo || 1);
  if (n <= 3) return 'Perencanaan';
  if (n <= 7) return 'Persiapan PPK';
  if (n <= 9) return 'Pemilihan';
  if (n <= 13) return 'Kontrak Aktif';
  if (n <= 15) return 'Pelaksanaan Kontrak';
  if (n <= 17) return 'Serah Terima & BMN';
  return 'Selesai & Lunas';
}
window.determineStatusPaketByStage = determineStatusPaketByStage;

function directDownloadPengadaanDoc(format, paketId, stageNo) {
  const fmt = String(format || 'docx').toLowerCase();
  const stg = String(stageNo || 'ALL');
  const pId = Number(paketId || CakraState.activePaketId);
  if (!pId) {
    cakraNotify('❌ Paket belum dipilih!', 'error');
    return;
  }
  if (fmt === 'xlsx' && Number(stg) === 1) {
    cakraNotify('⚠️ Tahap 1 (Identifikasi Kebutuhan) tidak memerlukan Kertas Kerja Excel. Silakan unduh dokumen Word (.docx).', 'info');
    return;
  }
  const url = '/api/cakra/download/' + fmt + '/' + pId + '?tahap=' + stg;
  cakraNotify('📥 Mengunduh naskah resmi Tahap ' + stg + ' (' + fmt.toUpperCase() + ')...', 'info');
  window.open(url, '_blank');
}
window.directDownloadPengadaanDoc = directDownloadPengadaanDoc;

/**
 * SI-PRABU v3.0 — Modul Pengadaan 18 Tahap Hulu-ke-Hilir (CAKRA Engine)
 * Mencakup Barang, Jasa Lainnya, Konsultansi Nonkonstruksi, Pekerjaan Konstruksi,
 * Jasa Konsultansi Konstruksi, Konstruksi Terintegrasi Rancang & Bangun,
 * Swakelola Tipe I-IV, & Pengadaan yang Dikecualikan (Perpres 46/2025, Perlem 2 & 3/2026)
 * Pengembang Resmi: emenje
 */

const CakraState = {
  initialized: false,
  settings: {},
  pejabats: [],
  penyedias: [],
  pakets: [],
  definisi18Tahap: [],
  summary: {},
  activePaketId: null,
  activePaketCtx: null,
  activeStageNo: 6,
  activeCockpitSubTab: 'form',
  activeRekapTab: 'STATUS_PBJ',
  filterDaftarPaketStatus: 'SEMUA',
  explicitCockpitOpen: false,
  siprabuRkbItems: [],
  rkbDrawerOpen: false
};

function isPaketSelesai(p) {
  if (!p) return false;
  const st = String(p.status_paket || '').trim().toLowerCase();
  if (st.includes('selesai') || st.includes('lunas') || st.includes('tuntas') || st === 'final') return true;
  const countDone = (Number(p.count_selesai) || 0) + (Number(p.count_bypass) || 0);
  if (countDone >= 18) return true;
  return false;
}
window.isPaketSelesai = isPaketSelesai;
window.CakraState = CakraState;

function cakraFmtRp(val) {
  const n = Math.round(Number(val) || 0);
  return 'Rp ' + n.toLocaleString('id-ID');
}

function cakraEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cakraNotify(msg, type = 'success') {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, type);
  } else {
    alert(msg);
  }
}

async function cakraApiGet(pathUrl) {
  const res = await fetch(pathUrl);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Gagal memuat data API Pengadaan');
  return data;
}

async function cakraApiPost(pathUrl, payload) {
  const res = await fetch(pathUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Gagal menyimpan data API Pengadaan');
  return data;
}

/**
 * Inisialisasi & Muat Data Bootstrap Modul Pengadaan
 */
async function initCakraApp() {
  try {
    const boot = await cakraApiGet('/api/cakra/bootstrap');
    CakraState.settings = boot.settings || {};
    CakraState.pejabats = boot.pejabats || [];
    CakraState.penyedias = boot.penyedias || [];
    CakraState.pakets = boot.pakets || [];
    CakraState.definisi18Tahap = boot.definisi18Tahap || [];
    CakraState.summary = boot.summary || {};
    CakraState.initialized = true;

    renderDashboardKpi();
    renderDashboardTable();
    renderMasterView();
    renderBukuPintar18Tahap();
    renderRekapPengadaanView();

    const sbBadge = document.getElementById('badge-pengadaan-paket');
    if (sbBadge) sbBadge.textContent = CakraState.pakets.length;

    if (!CakraState.activePaketId) {
      CakraState.activePaketId = 'NEW';
    }

    if (typeof window.renderDashboard === 'function') {
      window.renderDashboard();
    }
  } catch (err) {
    console.error('[PENGADAAN INIT ERROR]', err);
  }
}
window.initCakraApp = initCakraApp;

/**
 * Dipanggil otomatis dari switchView() di SI-PRABU (`app.js`)
 */
async function onEnterPengadaanView(viewId) {
  if (!CakraState.initialized) {
    await initCakraApp();
  } else {
    renderDashboardKpi();
    renderDashboardTable();
    renderMasterView();
    renderBukuPintar18Tahap();
    renderRekapPengadaanView();
  }

  if (viewId === 'view-pengadaan-kokpit') {
    if (CakraState.activePaketId && CakraState.activePaketId !== 'NEW') {
      showCockpitWorkspace();
      await openPaketInCockpit(CakraState.activePaketId, CakraState.activeStageNo || 1, false);
    } else if (CakraState.activePaketId === 'NEW') {
      showCockpitWorkspace();
      renderCockpitTopBanner();
      renderCockpitLeftStepper();
      renderCockpitCenterWorkspace();
      renderCockpitRightDock();
    } else {
      exitCockpitToLanding();
    }
  } else if (viewId === 'view-pengadaan-paket') {
    renderDashboardKpi();
    renderDashboardTable();
  } else if (viewId === 'view-audit-pengadaan') {
    renderAuditPengadaanView();
  } else if (viewId === 'view-rekap-pengadaan') {
    renderRekapPengadaanView();
  } else if (viewId === 'view-panduan-pengadaan') {
    renderPanduanPengadaanView();
  } else if (viewId === 'view-pengadaan-portal-pengusul') {
    await renderPortalPengusulKpaView();
  }
}

/**
 * VIEW 1: DAFTAR PAKET PENGADAAN & RINGKASAN EKSEKUTIF
 */
function renderDashboardKpi() {
  const s = CakraState.summary || {};
  const grid = document.getElementById('cakra-dashboard-kpi-grid');
  if (!grid) return;

  const all = CakraState.pakets || [];
  const berjalan = all.filter(p => !isPaketSelesai(p));
  const selesai = all.filter(p => isPaketSelesai(p));

  const paguTotal = all.reduce((sum, p) => sum + (Number(p.nilai_pagu) || 0), 0);
  const paguBerjalan = berjalan.reduce((sum, p) => sum + (Number(p.nilai_pagu) || 0), 0);
  const paguSelesai = selesai.reduce((sum, p) => sum + (Number(p.nilai_pagu) || 0), 0);
  const kontrakSelesai = selesai.reduce((sum, p) => sum + (Number(p.nilai_kontrak) || 0), 0);
  const efisiensiSelesai = Math.max(0, paguSelesai - kontrakSelesai);
  const persenEfisiensiSelesai = paguSelesai > 0 ? ((efisiensiSelesai / paguSelesai) * 100).toFixed(2) : '0.00';

  // Update filter badge counts
  const elSemua = document.getElementById('count-filter-semua');
  if (elSemua) elSemua.textContent = all.length;
  const elBerjalan = document.getElementById('count-filter-berjalan');
  if (elBerjalan) elBerjalan.textContent = berjalan.length;
  const elSelesai = document.getElementById('count-filter-selesai');
  if (elSelesai) elSelesai.textContent = selesai.length;

  grid.innerHTML = `
    <div class="cakra-kpi-card">
      <div class="cakra-kpi-label">Total Portofolio Paket PBJ</div>
      <div class="cakra-kpi-value">${all.length} Paket</div>
      <div class="cakra-kpi-sub">Total Pagu DIPA: <strong>${cakraFmtRp(paguTotal)}</strong></div>
    </div>
    <div class="cakra-kpi-card amber">
      <div class="cakra-kpi-label">⏳ Pengadaan Berjalan (WIP)</div>
      <div class="cakra-kpi-value">${berjalan.length} Paket</div>
      <div class="cakra-kpi-sub">Pagu Berjalan: <strong style="color:#b45309;">${cakraFmtRp(paguBerjalan)}</strong> (Draf &amp; Proses)</div>
    </div>
    <div class="cakra-kpi-card green">
      <div class="cakra-kpi-label">✅ Pengadaan Selesai (Tuntas)</div>
      <div class="cakra-kpi-value">${selesai.length} Paket</div>
      <div class="cakra-kpi-sub">Kontrak: <strong style="color:#047857;">${cakraFmtRp(kontrakSelesai)}</strong> (18/18 Tahap Selesai)</div>
    </div>
    <div class="cakra-kpi-card blue">
      <div class="cakra-kpi-label">💰 Efisiensi Anggaran &amp; UMK</div>
      <div class="cakra-kpi-value">${cakraFmtRp(efisiensiSelesai)}</div>
      <div class="cakra-kpi-sub">Hemat: <strong>${persenEfisiensiSelesai}%</strong> | UMK: <strong>${s.persenAlokasiUmk || 100}%</strong> | TKDN: <strong>${s.rataTkdn || 45}%</strong></div>
    </div>
  `;
}

function getBadgeClassByJenis(jenis) {
  const j = String(jenis || '');
  if (j.includes('Konstruksi')) return 'cakra-badge-amber';
  if (j === 'Barang') return 'cakra-badge-blue';
  if (j === 'Jasa Lainnya') return 'cakra-badge-purple';
  if (j === 'Swakelola') return 'cakra-badge-green';
  return 'cakra-badge-slate';
}

function filterDaftarPaketStatus(status) {
  CakraState.filterDaftarPaketStatus = status || 'SEMUA';
  const btns = [
    { id: 'btn-filter-paket-semua', mode: 'SEMUA' },
    { id: 'btn-filter-paket-berjalan', mode: 'BERJALAN' },
    { id: 'btn-filter-paket-selesai', mode: 'SELESAI' }
  ];
  btns.forEach(b => {
    const el = document.getElementById(b.id);
    if (!el) return;
    const isAct = CakraState.filterDaftarPaketStatus === b.mode;
    if (b.mode === 'SEMUA') {
      el.className = isAct ? 'btn btn-xs btn-primary' : 'btn btn-xs btn-outline-primary';
    } else if (b.mode === 'BERJALAN') {
      el.className = isAct ? 'btn btn-xs btn-warning' : 'btn btn-xs btn-outline-warning';
    } else if (b.mode === 'SELESAI') {
      el.className = isAct ? 'btn btn-xs btn-success' : 'btn btn-xs btn-outline-success';
    }
  });
  const label = document.getElementById('label-filter-paket-status');
  if (label) {
    label.textContent = status === 'BERJALAN' ? 'Pengadaan Berjalan (Dalam Proses / Draf)' : status === 'SELESAI' ? 'Pengadaan Selesai (100% Tuntas)' : 'Semua Paket';
  }
  renderDashboardTable();
}
window.filterDaftarPaketStatus = filterDaftarPaketStatus;

function renderDashboardTable() {
  const tbody = document.getElementById('cakra-table-paket-body');
  if (!tbody) return;

  let list = CakraState.pakets || [];
  if (CakraState.filterDaftarPaketStatus === 'BERJALAN') {
    list = list.filter(p => !isPaketSelesai(p));
  } else if (CakraState.filterDaftarPaketStatus === 'SELESAI') {
    list = list.filter(p => isPaketSelesai(p));
  }

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">Tidak ada paket pengadaan pada filter ini.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(p => {
    const badgeCls = getBadgeClassByJenis(p.jenis_pengadaan);
    const isDone = isPaketSelesai(p);
    return `
      <tr>
        <td>
          <div class="cakra-mono" style="font-weight:800; color:${isDone ? '#047857' : '#991b1b'};">${cakraEsc(p.kode_paket_internal)}</div>
          <div style="font-size:11px; color:#64748b;">${cakraEsc(p.kode_rup || '-')}</div>
          <span class="cakra-badge cakra-badge-slate" style="margin-top:4px;">MAK ${cakraEsc(p.kode_akun_mak)}</span>
        </td>
        <td>
          <div style="font-weight:700; color:#0f172a; margin-bottom:4px;">${cakraEsc(p.nama_paket)}</div>
          <div style="font-size:11px; color:#475569;">Subbag: <strong>${cakraEsc(p.pic_subbag)}</strong> | ${cakraEsc(p.masa_pelaksanaan_hari)} Hari Kalender</div>
        </td>
        <td>
          <span class="cakra-badge ${badgeCls}">${cakraEsc(p.jenis_pengadaan)}</span>
          <div style="font-size:11.5px; font-weight:700; margin-top:4px;">${cakraEsc(p.metode_pemilihan)}</div>
          <div style="font-size:10.5px; color:#64748b;">Fitur: ${cakraEsc(p.fitur_spse)} | ${cakraEsc(p.pelaksana_pemilihan)}</div>
        </td>
        <td>
          <span class="cakra-badge cakra-badge-amber">${cakraEsc(p.bentuk_kontrak)}</span>
          <div style="font-size:11px; margin-top:4px; color:#334155;">${cakraEsc(p.jenis_kontrak)}</div>
          <div style="font-size:10.5px; color:#047857; font-weight:700;">${cakraEsc(p.jenis_kertas_harga)}</div>
        </td>
        <td class="cakra-mono" style="font-size:11.5px;">
          <div>Pagu: <strong>${cakraFmtRp(p.nilai_pagu)}</strong></div>
          ${Number(p.tahap_aktif || 1) >= 6 && Number(p.nilai_hps) > 0 ? `
            <div style="color:#1d4ed8;">HPS/Ref: ${cakraFmtRp(p.nilai_hps)}</div>
          ` : `
            <div style="color:#94a3b8; font-size:10.5px;">HPS: <em>Belum Disusun (Tahap 6)</em></div>
          `}
          ${Number(p.tahap_aktif || 1) >= 13 && Number(p.nilai_kontrak) > 0 ? `
            <div style="color:#047857; font-weight:800;">Kontrak: ${cakraFmtRp(p.nilai_kontrak)}</div>
          ` : `
            <div style="color:#94a3b8; font-size:10.5px;">Kontrak: <em>Belum Berkontrak (Tahap 13)</em></div>
          `}
        </td>
        <td>
          ${Number(p.tahap_aktif || 1) >= 9 && (p.nama_penyedia || p.nama_perusahaan) ? `
            <div style="font-weight:700; font-size:11.5px; color:#0f172a;">${cakraEsc(p.nama_penyedia || p.nama_perusahaan)}</div>
          ` : `
            <div style="font-weight:600; font-size:11px; color:#64748b; font-style:italic;">Belum Ditentukan (Tahap 9)</div>
          `}
          ${isDone ? `
            <span class="cakra-badge cakra-badge-green" style="margin-top:3px; font-weight:800;">✅ SELESAI (100% TUNTAS)</span>
            <div style="font-size:10.5px; color:#047857; font-weight:700; margin-top:2px;">18/18 Tahap Lengkap</div>
          ` : `
            <span class="cakra-badge cakra-badge-amber" style="margin-top:3px; font-weight:800;">⏳ BERJALAN (Tahap ${p.tahap_aktif}/18)</span>
            <div style="font-size:10.5px; color:#b45309; font-weight:700; margin-top:2px;">${cakraEsc(p.status_paket || 'Draf')}</div>
          `}
        </td>
        <td style="text-align:center;">
          <div style="display:flex; flex-direction:column; gap:5px; align-items:center;">
            <button type="button" class="cakra-btn ${isDone ? 'cakra-btn-outline' : 'cakra-btn-primary'} cakra-btn-sm" style="width:100%;" onclick="openPaketInCockpit(${p.id}, ${p.tahap_aktif || 1}, true)">${isDone ? '👁️ Tinjau di Kokpit' : '🧭 Lanjutkan di Kokpit'}</button>
            <div style="display:flex; gap:4px; width:100%;">
              <button type="button" class="cakra-btn cakra-btn-info cakra-btn-sm" style="flex:1;" onclick="queuePengadaanDownload('docx', ${p.id}, 'ALL')" title="Kirim Bundel Word 18 Tahap ke Monitoring Unduhan">📄 Word</button>
              <button type="button" class="cakra-btn cakra-btn-success cakra-btn-sm" style="flex:1;" onclick="queuePengadaanDownload('xlsx', ${p.id}, 'ALL')" title="Kirim Kertas Kerja Excel ke Monitoring Unduhan">📊 Excel</button>
              <button type="button" class="cakra-btn cakra-btn-warning cakra-btn-sm" style="flex:1;" onclick="queuePengadaanDownload('zip', ${p.id}, 'ALL')" title="Kirim Bundel Arsip ZIP ke Monitoring Unduhan">📦 ZIP</button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * DRAWER TARIK MATA ANGGARAN DARI RKB SI-PRABU (HIGH-PERFORMANCE OMNI-SEARCH)
 * Dioptimasi khusus untuk 803+ baris anggaran definitif:
 * 1. In-Memory Multi-Token Search (Zero forced layout reflow / zero DOM thrashing).
 * 2. Debounced keystroke handling (100ms) untuk mencegah browser freeze & crash.
 * 3. Multi-token matcher (e.g. '532 server' menyaring MAK 532 sekaligus uraian server).
 * 4. Virtual windowed rendering (60 baris pertama) dengan opsi 'Tampilkan Semua'.
 * 5. Instant Drawer Reopen (Cache in-memory tanpa fetch ulang yang boros bandwidth).
 */
let rkbSearchDebounceTimer = null;
let currentRkbFilteredMatches = [];
const RKB_INITIAL_RENDER_LIMIT = 60;

async function toggleCakraRkbDrawer() {
  const drawer = document.getElementById('cakra-rkb-pull-drawer');
  if (!drawer) return;
  CakraState.rkbDrawerOpen = !CakraState.rkbDrawerOpen;
  drawer.style.display = CakraState.rkbDrawerOpen ? 'flex' : 'none';
  if (CakraState.rkbDrawerOpen) {
    const searchInp = document.getElementById('cakra-rkb-search-input');
    if (searchInp) {
      searchInp.value = '';
      setTimeout(() => searchInp.focus(), 80);
    }
    // Jika data RKB sudah tersimpan dalam memori, tampilkan instan tanpa query ulang
    if (!CakraState.siprabuRkbItems || CakraState.siprabuRkbItems.length === 0) {
      await loadSiprabuRkbItems();
    } else {
      executeFilterSiprabuRkb('');
    }
  }
}

function filterSiprabuRkbTable(keyword, immediate = false) {
  if (rkbSearchDebounceTimer) {
    clearTimeout(rkbSearchDebounceTimer);
  }
  if (immediate) {
    executeFilterSiprabuRkb(keyword);
  } else {
    rkbSearchDebounceTimer = setTimeout(() => {
      executeFilterSiprabuRkb(keyword);
    }, 100);
  }
}

function executeFilterSiprabuRkb(keyword) {
  const q = String(keyword || '').toLowerCase().trim();
  const allItems = CakraState.siprabuRkbItems || [];

  if (!q) {
    currentRkbFilteredMatches = allItems;
  } else {
    // Multi-token: setiap kata kunci harus ada dalam item (AND logic)
    const tokens = q.split(/\s+/).filter(Boolean);
    currentRkbFilteredMatches = allItems.filter(it => {
      return tokens.every(tok => it._searchStr && it._searchStr.includes(tok));
    });
  }

  const countBadge = document.getElementById('cakra-rkb-count-badge');
  if (countBadge) {
    if (!q) {
      countBadge.textContent = `${allItems.length} baris tersedia`;
    } else {
      countBadge.textContent = `${currentRkbFilteredMatches.length} baris cocok`;
    }
  }

  const isLimited = currentRkbFilteredMatches.length > RKB_INITIAL_RENDER_LIMIT;
  const itemsToRender = isLimited
    ? currentRkbFilteredMatches.slice(0, RKB_INITIAL_RENDER_LIMIT)
    : currentRkbFilteredMatches;

  renderSiprabuRkbRows(itemsToRender, currentRkbFilteredMatches.length, isLimited);
}

function renderAllSiprabuRkbRows() {
  renderSiprabuRkbRows(currentRkbFilteredMatches, currentRkbFilteredMatches.length, false);
}

function renderSiprabuRkbRows(itemsToRender, totalMatches, isLimited) {
  const tbody = document.getElementById('cakra-table-siprabu-rkb-body');
  if (!tbody) return;

  if (!itemsToRender || itemsToRender.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:36px 20px; color:#64748b;">
          <div style="font-size:26px; margin-bottom:8px;">🔍</div>
          <div style="font-weight:700; font-size:13px; color:#334155;">Tidak ada mata anggaran RKB yang cocok dengan kata kunci</div>
          <div style="font-size:11.5px; color:#94a3b8; margin-top:4px;">Coba gunakan kata kunci lain (misal: <code>532</code>, <code>5212</code>, <code>server</code>, <code>konsumsi</code>, <code>sidalih</code>).</div>
        </td>
      </tr>
    `;
    return;
  }

  let rowsHtml = itemsToRender.map(it => {
    const origIdx = it._origIdx !== undefined ? it._origIdx : 0;
    const rowId = it.siprabu_rab_id || it.id;
    const uraian = it.uraian_bersih || it.uraian || '-';
    const totalPagu = it.pagu_total || it.jumlah_pagu || 0;
    const namaBas = it.nama_akun_mak || 'Belanja MAK';
    const subKeg = it.subkegiatan || it.kegiatan || '-';
    return `
      <tr>
        <td class="cakra-mono" style="font-size:11px; color:#64748b;">#${rowId}</td>
        <td>
          <span class="cakra-badge cakra-badge-blue cakra-mono" style="font-weight:800; font-size:11.5px;">${cakraEsc(it.kode_akun)}</span>
          <div style="font-size:11px; color:#334155; font-weight:600; margin-top:3px;">${cakraEsc(namaBas)}</div>
        </td>
        <td><span class="cakra-badge cakra-badge-gray" style="font-weight:700;">${cakraEsc(it.pic_subbag || 'KUL')}</span></td>
        <td>
          <div style="font-weight:700; color:#0f172a; font-size:12px; line-height:1.35;">${cakraEsc(uraian)}</div>
          <div style="font-size:10.5px; color:#64748b; margin-top:3px;">📌 ${cakraEsc(subKeg)}</div>
        </td>
        <td class="cakra-mono" style="text-align:center;">${it.volume} ${cakraEsc(it.satuan)}</td>
        <td class="cakra-mono" style="text-align:right;">${cakraFmtRp(it.harga_satuan)}</td>
        <td class="cakra-mono" style="text-align:right; font-weight:800; color:#047857;">${cakraFmtRp(totalPagu)}</td>
        <td style="text-align:center;">
          <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="importRkbItemToCakra(${origIdx})" style="font-weight:700; white-space:nowrap; padding:4px 10px; font-size:11px;">
            ⚡ Tarik ke Paket
          </button>
        </td>
      </tr>
    `;
  }).join('');

  if (isLimited) {
    rowsHtml += `
      <tr style="background:#f1f5f9; border-top:2px solid #cbd5e1;">
        <td colspan="8" style="text-align:center; padding:12px 16px; color:#334155; font-size:12px;">
          <span>⚡ Menampilkan <strong>${itemsToRender.length}</strong> dari total <strong>${totalMatches}</strong> baris belanja (Omni-Search Dioptimasi Cepat).</span>
          <button type="button" class="cakra-btn cakra-btn-secondary cakra-btn-sm" style="margin-left:12px; font-size:11px; padding:3px 10px;" onclick="renderAllSiprabuRkbRows()">
            Tampilkan Semua (${totalMatches} baris)
          </button>
        </td>
      </tr>
    `;
  }

  tbody.innerHTML = rowsHtml;
}

async function loadSiprabuRkbItems(forceReload = false) {
  const tbody = document.getElementById('cakra-table-siprabu-rkb-body');
  if (!tbody) return;

  if (!forceReload && CakraState.siprabuRkbItems && CakraState.siprabuRkbItems.length > 0) {
    const searchInp = document.getElementById('cakra-rkb-search-input');
    executeFilterSiprabuRkb(searchInp ? searchInp.value : '');
    return;
  }

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:25px; color:#475569;">⏳ Membaca mata anggaran RKB Terkunci Definitif (803 baris)...</td></tr>`;

  try {
    const res = await cakraApiGet('/api/cakra/siprabu-rkb');
    const rawItems = res.items || [];

    // Pre-indexing pencarian multi-kolom dalam memori (Zero Reflow)
    CakraState.siprabuRkbItems = rawItems.map((it, idx) => {
      it._origIdx = idx;
      it._searchStr = [
        String(it.siprabu_rab_id || it.id || ''),
        String(it.kode_akun || ''),
        String(it.nama_akun_mak || ''),
        String(it.pic_subbag || ''),
        String(it.uraian_bersih || it.uraian || ''),
        String(it.kegiatan || ''),
        String(it.subkegiatan || ''),
        String(it.program || '')
      ].join(' ').toLowerCase();
      return it;
    });

    const searchInp = document.getElementById('cakra-rkb-search-input');
    executeFilterSiprabuRkb(searchInp ? searchInp.value : '');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center; padding:20px;">Gagal memuat RKB: ${cakraEsc(err.message)}</td></tr>`;
  }
}

async function importRkbItemToCakra(idxOrId) {
  let it = null;
  if (typeof idxOrId === 'number' && CakraState.siprabuRkbItems && CakraState.siprabuRkbItems[idxOrId]) {
    it = CakraState.siprabuRkbItems[idxOrId];
  } else if (CakraState.siprabuRkbItems) {
    it = CakraState.siprabuRkbItems.find(x => (x.siprabu_rab_id || x.id) == idxOrId);
  }
  if (!it) return;

  const uraian = it.uraian_bersih || it.uraian || 'Paket Pengadaan RKB';
  const pagu = Number(it.pagu_total || it.jumlah_pagu || 50000000);
  const cleanMak = String(it.kode_akun || '').replace(/[^0-9]/g, '');

  // Jika targetnya adalah Pop-up Formulir Tahap 1:
  if (CakraState.rkbTarget === 'modal_tahap1') {
    CakraState.rkbTarget = null;
    toggleCakraRkbDrawer();

    const inpNama = document.getElementById('m1_nama_paket');
    const inpMak = document.getElementById('m1_kode_akun_mak');
    const inpNamaMak = document.getElementById('m1_nama_akun_mak');
    const inpPagu = document.getElementById('m1_nilai_pagu');
    const inpUraian = document.getElementById('m1_uraian_pekerjaan');
    const inpPic = document.getElementById('m1_pic_subbag');
    const paguTerbilang = document.getElementById('m1_pagu_terbilang');
    const rkbBox = document.getElementById('m1_rkb_badge_container');
    const rkbText = document.getElementById('m1_rkb_silsilah_text');

    if (inpNama) inpNama.value = uraian;
    if (inpMak) inpMak.value = cleanMak;
    if (inpNamaMak) inpNamaMak.value = it.nama_akun_mak || (cleanMak.startsWith('53') ? 'Belanja Modal Peralatan dan Mesin' : 'Belanja Bahan');
    if (inpPagu) inpPagu.value = pagu;
    if (paguTerbilang) paguTerbilang.textContent = cakraFmtRp(pagu);
    if (inpPic) inpPic.value = it.pic_subbag || 'RENDATIN';
    if (inpUraian) inpUraian.value = 'Pengadaan berdasarkan RKB Definitif KPU Kabupaten Ngawi: ' + uraian;

    if (rkbBox) rkbBox.style.display = 'block';
    if (rkbText) rkbText.textContent = (it.program || 'Program Pemilu') + ' > ' + (it.kegiatan || 'Operasional') + ' > ' + (it.subkegiatan || 'Pengadaan Sarana');

    onModalTahap1MakChange(cleanMak);
    cakraNotify('✅ RKB ditarik ke Formulir Tahap 1: "' + uraian + '" (' + cleanMak + ' - Pagu ' + cakraFmtRp(pagu) + ')', 'success');
    return;
  }

  // Tutup drawer RKB dan buka Smart Wizard yang memandu user dengan rekomendasi cerdas
  toggleCakraRkbDrawer();
  // Jika sedang membuka Cockpit Paket aktif, langsung isi field Tahap 1
  if (CakraState.activePaketCtx && CakraState.activePaketCtx.paket) {
    const p = CakraState.activePaketCtx.paket;
    p.nama_paket = uraian;
    p.uraian_pekerjaan = `Pengadaan berdasarkan RKB Definitif KPU Kabupaten Ngawi: ${uraian}`;
    p.kode_akun_mak = cleanMak;
    p.nama_akun_mak = it.nama_akun_mak || 'Belanja Modal Peralatan dan Mesin';
    p.nilai_pagu = pagu;
    p.pic_subbag = it.pic_subbag || 'RENDATIN';
    p.rkb_program = it.program || 'Program Penyelenggaraan Pemilu dalam Proses Konsolidasi Demokrasi';
    p.rkb_kegiatan = it.kegiatan || 'Pengelolaan dan Pelayanan Sistem Informasi dan Data Pemilih (SIDALIH)';
    p.rkb_subkegiatan = it.subkegiatan || 'Pemeliharaan dan Pengadaan Sarana Pengolah Data Operasional Pemilu';
    p.rkb_komponen = it.subkegiatan || 'Pengadaan Perangkat Server dan Jaringan Komputer';
    p.bmn_kategori_telaah = it.bmn_kategori_telaah || (cleanMak.startsWith('53') ? 'MODAL' : 'EKSTRAKOMPTABEL');

    cakraNotify(`✅ Berhasil menarik anggaran dari RKB: "${uraian}" (${cleanMak} - Pagu ${cakraFmtRp(pagu)})`, 'success');
    renderCockpitCenterWorkspace();
    return;
  }

  openSmartWizardModal({
    nama: uraian,
    pagu: pagu,
    kode_akun: cleanMak,
    nama_akun_mak: it.nama_akun_mak || '',
    rkb_program: it.program || '',
    rkb_kegiatan: it.kegiatan || '',
    rkb_subkegiatan: it.subkegiatan || '',
    pic_subbag: it.pic_subbag || 'KUL',
    siprabu_rab_id: it.siprabu_rab_id || it.id
  });
  return;

  // Legacy fallback
  const nextNum = CakraState.pakets.length + 1;
  const payload = {
    kode_paket_internal: `CAKRA-2026-${String(nextNum).padStart(3, '0')}`,
    kode_rup: `RUP-2026-657811-0${nextNum}`,
    nama_paket: uraian,
    uraian_pekerjaan: `Pengadaan berdasarkan RUH Belanja RKB SI-PRABU: ${uraian}`,
    kode_akun_mak: it.kode_akun || '521211',
    nama_akun_mak: `Belanja MAK ${it.kode_akun || '521211'}`,
    pic_subbag: it.pic_subbag || 'KUL',
    siprabu_rab_id: it.siprabu_rab_id || it.id,
    nilai_pagu: pagu
  };
  const res = await cakraApiPost('/api/cakra/paket', payload);
  await cakraApiPost(`/api/cakra/paket/${res.id}/items`, {
    items: [
      {
        urutan: 1,
        uraian_item: uraian,
        spesifikasi_teknis: 'Sesuai Spesifikasi Teknis / KAK RKB SI-PRABU KPU Kabupaten Ngawi',
        satuan: it.satuan || 'Paket',
        volume: Number(it.volume || 1),
        persen_tkdn: 45,
        harga_survei_1: Number(it.harga_satuan || pagu),
        harga_survei_2: Math.round(Number(it.harga_satuan || pagu) * 1.04),
        harga_satuan_hps: Number(it.harga_satuan || pagu),
        jumlah_hps: pagu,
        harga_satuan_kontrak: Math.round(Number(it.harga_satuan || pagu) * 0.97),
        jumlah_kontrak: Math.round(pagu * 0.97),
        jenis_pencatatan_sakti: isKonstruksi ? 'Aset Tetap (BMN)' : 'Persediaan'
      }
    ]
  });

  cakraNotify(`Paket "${uraian}" berhasil ditarik dari RKB ke Kokpit 18 Tahap!`, 'success');
  await initCakraApp();
  await openPaketInCockpit(res.id, 6, true);
}

/**
 * VIEW 2: KOKPIT 18 TAHAP FULL-WIDTH
 */
async function openPaketInCockpit(paketId, stageNo = 1, navigateToCockpit = true) {
  try {
    CakraState.explicitCockpitOpen = true;
    CakraState.activePaketId = Number(paketId);
    CakraState.activeStageNo = Number(stageNo) || 1;
    CakraState.activeFase = getFaseByStage(CakraState.activeStageNo);
    if (!['jadwal', 'dodont'].includes(CakraState.activeCockpitSubTab)) CakraState.activeCockpitSubTab = 'fase' + CakraState.activeFase;
    const ctx = await cakraApiGet(`/api/cakra/paket/${CakraState.activePaketId}?tahap=${CakraState.activeStageNo}`);
    CakraState.activePaketCtx = ctx;

    if (navigateToCockpit && typeof window.switchView === 'function') {
      window.switchView('view-pengadaan-kokpit');
      return;
    }

    renderCockpitTopBanner();
    renderCockpitLeftStepper();
    renderCockpitCenterWorkspace();
    renderCockpitRightDock();
  } catch (err) {
    cakraNotify('Gagal membuka kokpit paket: ' + err.message, 'error');
  }
}


/**
 * START BLANK COCKPIT PAKET (LEMBAR BERSIH / CLEAR DARI AWAL)
 * Membuka ruang simulasi tanpa data lama / teks yang membingungkan
 */
function startBlankCockpitPaket() {
  if (typeof openModalTahap1Input === 'function') {
    openModalTahap1Input('NEW');
    return;
  }
  const nextNum = (CakraState.pakets?.length || 0) + 1;
  const nextKode = 'PBJ-2026-' + String(nextNum).padStart(3, '0');

  const blankTahaps = (CakraState.definisi18Tahap || []).map(def => ({
    no_tahap: def.no,
    fase: def.fase,
    nama_tahap: def.nama,
    nomor_dokumen: def.no === 1 ? `001/IDK/${nextKode}/PPK-PBJ/KPU-NGW/V/2026` : '',
    tanggal_dokumen: def.no === 1 ? '2026-05-04' : '',
    status_tahap: def.no === 1 ? 'Draft' : 'Terkunci',
    catatan_tahap: def.no === 1 ? 'Identifikasi Kebutuhan PBJ & Pagu DIPA/RKB' : ''
  }));

  CakraState.activePaketId = 'NEW';
  CakraState.activeStageNo = 1;
  CakraState.activeFase = 1;
  CakraState.activeCockpitSubTab = 'fase1';

  CakraState.activePaketCtx = {
    paket: {
      id: null,
      kode_paket_internal: nextKode,
      kode_rup: '',
      nama_paket: '',
      uraian_pekerjaan: '',
      lokasi_pekerjaan: 'Kantor KPU Kabupaten Ngawi',
      sumber_dana: 'APBN DIPA 2026',
      tahun_anggaran: '2026',
      kode_akun_mak: '',
      nama_akun_mak: '',
      komponen_ro: '',
      pic_subbag: 'KUL',
      jenis_pengadaan: 'Barang',
      cara_pengadaan: 'Penyedia',
      metode_pemilihan: 'E-Purchasing',
      nilai_pagu: 0,
      jenis_kertas_harga: 'HPS',
      nilai_hps: 0,
      nilai_kontrak: 0,
      tarif_ppn: 11,
      termasuk_ppn: 1,
      jenis_pph: 'PPh 22 (1.5%)',
      tarif_pph: 1.5,
      prioritas_pdn_level: 'Level 1: TKDN >= 25% (TKDN+BMP >= 40%)',
      persen_tkdn_target: 40,
      persen_bmp_target: 10,
      peruntukan_umk: 1,
      tersedia_di_katalog: 'Ya, Tersedia & Sesuai',
      alasan_penilaian_ppk_katalog: '',
      jenis_kontrak: 'Lumsum',
      bentuk_kontrak: 'Surat Pesanan',
      masa_pelaksanaan_hari: 14,
      tgl_mulai_kerja: '',
      tgl_selesai_kontrak: '',
      persen_uang_muka: 0,
      wajib_jaminan_pelaksanaan: 0,
      penyedia_id: (CakraState.penyedias && CakraState.penyedias[0]?.id) || 1,
      status_paket: 'Draft Baru (Lembar Bersih)'
    },
    tahaps: blankTahaps,
    items: [],
    penyedia: null,
    keuangan: {
      pagu: 0,
      hps: 0,
      kontrak: 0,
      nilaiBersihDiterimaPenyedia: 0,
      efisiensiPagu: 0
    },
    rekomendasi: {
      jenisPengadaan: 'Barang',
      metodePemilihan: 'E-Purchasing',
      bentukKontrakRekomendasi: 'Surat Pesanan',
      jenisKertasHarga: 'Referensi Harga / HPS',
      catatanRegulasi: ['Silakan masukkan Nama Paket, Pagu Anggaran, dan Akun MAK pada formulir Tahap 1 di bawah.']
    },
    audit: {
      warnings: [],
      doubleCheck: []
    }
  };

  renderCockpitTopBanner();
  renderCockpitLeftStepper();
  renderCockpitCenterWorkspace();
  renderCockpitRightDock();
  cakraNotify('Lembar kerja bersih (Clear dari Awal) dibuka. Silakan mulai input Tahap 1.', 'info');
}
window.startBlankCockpitPaket = startBlankCockpitPaket;

function onCockpitPaketSelectChange(val) {
  if (val === 'NEW') {
    startBlankCockpitPaket();
  } else {
    openPaketInCockpit(val, 1, false);
  }
}
window.onCockpitPaketSelectChange = onCockpitPaketSelectChange;

function renderCockpitTopBanner() {
  const banner = document.getElementById('cakra-cockpit-top-banner');
  if (!banner || !CakraState.activePaketCtx) return;
  const { paket, keuangan } = CakraState.activePaketCtx;
  const isNew = CakraState.activePaketId === 'NEW' || !paket.id;
  const isDone = !isNew && isPaketSelesai(paket);

  const activePakets = (CakraState.pakets || []).filter(p => !isPaketSelesai(p));

  const optionsHtml = [
    `<option value="NEW" ${isNew ? 'selected' : ''}>✨ [ + LEMBAR BERSIH / MULAI PENGADAAN BARU ]</option>`,
    activePakets.length ? `<optgroup label="📝 PENGADAAN BERJALAN & DRAF (${activePakets.length} Paket)">` : '',
    ...activePakets.map(p =>
      `<option value="${p.id}" ${!isNew && Number(p.id) === Number(paket.id) ? 'selected' : ''}>[${cakraEsc(p.kode_paket_internal)}] ${cakraEsc(p.nama_paket.substring(0, 60))} (Tahap ${p.tahap_aktif || 1} - ${cakraEsc(p.status_paket || 'Draf')})</option>`
    ),
    activePakets.length ? `</optgroup>` : '',
    isDone ? `
      <optgroup label="🔒 ARSIP SELESAI (MODE PENINJAUAN)">
        <option value="${paket.id}" selected>[${cakraEsc(paket.kode_paket_internal)}] ${cakraEsc(paket.nama_paket.substring(0, 60))} [SELESAI 100%]</option>
      </optgroup>
    ` : ''
  ].filter(Boolean).join('');

  banner.innerHTML = `
    ${isDone ? `
      <div style="background:#064e3b; border:1px solid #10b981; color:#ecfdf5; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; width:100%;">
        <span>🔒 <strong>Mode Peninjauan Arsip:</strong> Paket <strong>${cakraEsc(paket.kode_paket_internal)}</strong> telah selesai 100%. Kokpit berada dalam mode peninjauan berkas. Untuk proses pengadaan baru, pilih <em>Lembar Bersih</em> atau paket draf berjalan.</span>
        <button type="button" class="btn btn-xs" onclick="startBlankCockpitPaket()" style="background:#10b981; color:#064e3b; font-weight:800; border:none; padding:4px 10px; border-radius:4px; cursor:pointer;">✨ Buka Lembar Bersih</button>
      </div>
    ` : ''}
    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <button type="button" class="btn btn-xs" onclick="exitCockpitToLanding()" style="background:#1e40af; color:#fff; font-weight:800; border:1px solid #3b82f6; padding:6px 14px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:6px;" title="Kembali ke Buku Besar Daftar Seluruh Paket Pengadaan">
        <span>⬅️ Kembali ke Daftar Paket</span>
      </button>
      <span style="font-size:12px; font-weight:800; color:#fbbf24;">🎯 PAKET:</span>
      <select onchange="onCockpitPaketSelectChange(this.value)" style="background:#1e293b; color:#fff; border:1px solid #475569; padding:6px 10px; border-radius:6px; font-weight:700; font-size:12px; min-width:320px;">
        ${optionsHtml}
      </select>
      ${isNew ? '<span class="cakra-badge cakra-badge-green" style="font-weight:800;">✨ LEMBAR BERSIH</span>' : (isDone ? '<span class="cakra-badge cakra-badge-green" style="font-weight:800;">✅ ARSIP SELESAI 100%</span>' : `
        <span class="cakra-badge cakra-badge-amber">${cakraEsc(paket.jenis_pengadaan)}</span>
        <span class="cakra-badge cakra-badge-blue">${cakraEsc(paket.metode_pemilihan)} (${cakraEsc(paket.bentuk_kontrak)})</span>
      `)}
    </div>
    <div style="display:flex; align-items:center; gap:14px; font-size:12px; flex-wrap:wrap;">
      <div>Pagu: <strong class="cakra-mono">${cakraFmtRp(paket.nilai_pagu)}</strong></div>
      <div>${cakraEsc(paket.jenis_kertas_harga || 'HPS')}: <strong class="cakra-mono" style="color:#93c5fd;">${(Number(paket.tahap_aktif || 1) < 6 || !paket.nilai_hps) ? '<span style="font-size:11px; font-weight:600; color:#94a3b8;">(Tahap 6)</span>' : cakraFmtRp(paket.nilai_hps)}</strong></div>
      <div>Kontrak: <strong class="cakra-mono" style="color:#6ee7b7;">${(Number(paket.tahap_aktif || 1) < 13 || !paket.nilai_kontrak) ? '<span style="font-size:11px; font-weight:600; color:#94a3b8;">(Tahap 13)</span>' : cakraFmtRp(paket.nilai_kontrak)}</strong></div>
      <div>SP2D Netto: <strong class="cakra-mono" style="color:#fde047;">${(Number(paket.tahap_aktif || 1) < 17 || !keuangan?.nilaiBersihDiterimaPenyedia) ? '<span style="font-size:11px; font-weight:600; color:#94a3b8;">(Tahap 17)</span>' : cakraFmtRp(keuangan.nilaiBersihDiterimaPenyedia)}</strong></div>
      <button type="button" class="btn btn-xs btn-primary" onclick="openSmartWizardModal()" style="font-size:11px; font-weight:800; background:#2563eb; color:#fff; border:none; padding:4px 10px; border-radius:5px; margin-left:auto; display:flex; align-items:center; gap:5px; cursor:pointer;" title="Buat Paket Pengadaan Baru via Wizard">
        <span>🪄 + Wizard Rekomendasi</span>
      </button>
    </div>
  `;
}

function generateAutoStageDocNumber(stageNo, kodePaket, tglIso) {
  const num = Number(stageNo);
  const def = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === num) || {};
  const kodeTahap = def.kode || 'DOK';
  const noUrut = String(num).padStart(3, '0');
  const d = tglIso ? new Date(tglIso) : new Date();
  const yyyy = isNaN(d.getFullYear()) ? 2026 : d.getFullYear();
  const romawi = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][isNaN(d.getMonth()) ? 4 : d.getMonth()] || 'V';
  const cleanKodePaket = (kodePaket || 'PBJ-2026-001').trim();
  const kodeOtoritas = num === 3 ? 'KPA-PBJ' : (num === 8 || num === 9 ? 'PP-PBJ' : 'PPK-PBJ');
  return `${noUrut}/${kodeTahap}/${cleanKodePaket}/${kodeOtoritas}/KPU-NGW/${romawi}/${yyyy}`;
}
window.generateAutoStageDocNumber = generateAutoStageDocNumber;

function resetAutoStageDocNumber(stageNo) {
  const { paket } = CakraState.activePaketCtx || {};
  const tglInput = document.getElementById('cf_stage_tanggal_dokumen');
  const tgl = tglInput ? tglInput.value : '';
  const newNum = generateAutoStageDocNumber(stageNo, paket?.kode_paket_internal, tgl);
  const docInput = document.getElementById('cf_stage_nomor_dokumen');
  if (docInput) {
    docInput.value = newNum;
    cakraNotify(`🔄 Nomor dokumen diselaraskan dengan Kode Paket: ${newNum}`, 'info');
  }
}
window.resetAutoStageDocNumber = resetAutoStageDocNumber;

function isCockpitStageLocked(targetNo, tahapMap) {
  const num = Number(targetNo);
  if (num <= 1) return false;
  // Periksa SEMUA tahap sebelumnya dari 1 sampai num-1!
  // Rantai Sekuensial: Setiap tahap sebelum num mutlak harus minimal Draft, Selesai, atau Bypass
  for (let i = 1; i < num; i++) {
    const prevRow = tahapMap[i] || {};
    const prevStatus = prevRow.status_tahap || 'Terkunci';
    const isPrevBypass = prevStatus === 'Bypass';
    const isPrevDone = (prevStatus === 'Selesai' || prevStatus === 'Final');
    const isPrevDraft = (prevStatus === 'Draft' || prevStatus === 'Aktif');

    if (!isPrevBypass && !isPrevDone && !isPrevDraft) {
      return true; // Rantai sekuensial terputus!
    }
  }
  return false;
}

function handleLockedStageClick(stageNo) {
  const targetNo = Number(stageNo);
  const { tahaps } = CakraState.activePaketCtx || {};
  const tahapMap = {};
  (tahaps || []).forEach(t => { tahapMap[t.no_tahap] = t; });

  let missingStage = 1;
  let missingName = 'Tahap 1';
  for (let i = 1; i < targetNo; i++) {
    const pRow = tahapMap[i] || {};
    const pStat = pRow.status_tahap || 'Terkunci';
    const isPPass = (pStat === 'Draft' || pStat === 'Aktif' || pStat === 'Selesai' || pStat === 'Final' || pStat === 'Bypass');
    if (!isPPass) {
      missingStage = i;
      const def = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === i);
      missingName = def ? `Tahap ${i} (${def.nama})` : `Tahap ${i}`;
      break;
    }
  }

  cakraNotify(`🔒 Tahap ${targetNo} Terkunci! Sesuai aturan rantai sekuensial, Anda wajib melengkapi dan menyimpan minimal Draf pada ${missingName} terlebih dahulu. Tidak diperkenankan melompati tahapan.`, 'warning');
}

function toggleCockpitStageGrid() {
  CakraState.isStageGridExpanded = !CakraState.isStageGridExpanded;
  try {
    localStorage.setItem('siprabu_stage_grid_expanded', CakraState.isStageGridExpanded ? 'true' : 'false');
  } catch (e) {}
  renderCockpitLeftStepper();
}
window.toggleCockpitStageGrid = toggleCockpitStageGrid;

function renderCockpitLeftStepper() {
  const container = document.getElementById('cakra-cockpit-stepper-list');
  if (!container || !CakraState.activePaketCtx) return;

  if (typeof CakraState.isStageGridExpanded !== 'boolean') {
    try {
      CakraState.isStageGridExpanded = localStorage.getItem('siprabu_stage_grid_expanded') === 'true';
    } catch (e) {
      CakraState.isStageGridExpanded = false;
    }
  }

  const { tahaps } = CakraState.activePaketCtx;
  const tahapMap = {};
  (tahaps || []).forEach(t => { tahapMap[t.no_tahap] = t; });

  const activeStageNo = Number(CakraState.activeStageNo || 1);
  const activeDef = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === activeStageNo) || { no: activeStageNo, nama: `Tahap ${activeStageNo}` };

  let doneCount = 0;
  let draftCount = 0;
  let bypassCount = 0;
  let readyCount = 0;
  let lockedCount = 0;

  const stageStatuses = (CakraState.definisi18Tahap || []).map(def => {
    const row = tahapMap[def.no] || {};
    const rawStatus = row.status_tahap || 'Terkunci';
    const driveLink = String(row.link_drive_dokumen || '').trim();

    // 4 KONDISI STATUS RESMI (SI-PRABU v3.0):
    // 1. Bypass  : Tidak diperlukan berdasarkan analisa sistem / aksi bypass regulasi
    // 2. Selesai : Jika sudah seluruh baris data terpenuhi dan link upload Google Drive terisi
    // 3. Draft   : Jika sudah ada salah satu baris data yang terisi dan ada aksi user simpan draf
    // 4. Terkunci: Jika belum ada sama sekali isian dari user
    // Rantai Sekuensial: Tahap N hanya terbuka jika seluruh tahap 1..(N-1) minimal Draft, Selesai, atau Bypass
    const isBypass = rawStatus === 'Bypass';
    const isDone = !isBypass && (rawStatus === 'Selesai' || rawStatus === 'Final') && driveLink.length > 5;
    const isDraft = !isBypass && !isDone && (rawStatus === 'Draft' || rawStatus === 'Aktif' || (rawStatus === 'Selesai' && !driveLink));
    const isChainLocked = !isBypass && !isDone && !isDraft && isCockpitStageLocked(def.no, tahapMap);
    const isReady = !isBypass && !isDone && !isDraft && !isChainLocked;
    const isActive = activeStageNo === Number(def.no);

    if (isBypass) bypassCount++;
    else if (isDone) doneCount++;
    else if (isDraft) draftCount++;
    else if (isReady) readyCount++;
    else lockedCount++;

    return {
      def,
      row,
      isBypass,
      isDone,
      isDraft,
      isChainLocked,
      isReady,
      isActive
    };
  });

  const totalEffectiveDone = doneCount + bypassCount;
  const progressPct = Math.round((totalEffectiveDone / 18) * 100);

  // HEADER BAR KOKPIT STEPPER (ZEN CONTROL)
  const headerHtml = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span style="font-size:12px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:5px;">
          <span>🧭</span> ALUR 18 TAHAP PBJ
        </span>
        <span class="cakra-badge" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; font-size:11px; font-weight:700;">
          🎯 Progress: <strong>${totalEffectiveDone}</strong>/18 Selesai (${progressPct}%)
        </span>
        <span class="cakra-badge" style="background:#eff6ff; color:#1e40af; border:1px solid #bfdbfe; font-size:11px;">
          📍 Aktif: <strong>Tahap ${activeStageNo}: ${cakraEsc(activeDef.nama)}</strong>
        </span>
      </div>
      <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
        <div style="font-size:10.5px; color:#475569; display:flex; align-items:center; gap:6px; background:#f8fafc; padding:2px 8px; border-radius:6px; border:1px solid #e2e8f0;">
          <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:7px; height:7px; border-radius:50%; background:#1e3a8a; display:inline-block;"></span> <strong>Navy</strong>: Aktif</span>
          <span style="color:#cbd5e1;">|</span>
          <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:7px; height:7px; border-radius:50%; background:#22c55e; display:inline-block;"></span> Hijau: Selesai</span>
          <span style="color:#cbd5e1;">|</span>
          <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:7px; height:7px; border-radius:50%; background:#f59e0b; display:inline-block;"></span> Kuning: Draft</span>
          <span style="color:#cbd5e1;">|</span>
          <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:7px; height:7px; border-radius:50%; background:#0284c7; display:inline-block;"></span> Biru: Siap</span>
          <span style="color:#cbd5e1;">|</span>
          <span style="display:inline-flex; align-items:center; gap:3px;"><span style="width:7px; height:7px; border-radius:50%; background:#94a3b8; display:inline-block;"></span> Abu: Terkunci</span>
        </div>
        <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" onclick="toggleCockpitStageGrid()" style="font-size:11px; padding:3px 10px; display:flex; align-items:center; gap:5px; height:26px;" title="${CakraState.isStageGridExpanded ? 'Tutup peta lengkap kembali ke mode ringkas' : 'Buka tampilan 18 kartu lengkap'}">
          ${CakraState.isStageGridExpanded ? '<span>▲</span> Mode Fokus (Ringkas)' : '<span>👁️</span> Buka Peta 18 Tahap Lengkap'}
        </button>
      </div>
    </div>
  `;

  if (!CakraState.isStageGridExpanded) {
    // -------------------------------------------------------------------------
    // MODE FOKUS / RINGKAS (COMPACT STEPPER TRACK - 42px)
    // -------------------------------------------------------------------------
    const trackPillsHtml = stageStatuses.map(st => {
      const { def, row, isBypass, isDone, isDraft, isChainLocked, isReady, isActive } = st;
      let statusCls = 'status-terkunci';
      let icon = '🔒';
      let statusLabel = 'Terkunci';
      let clickAction = `selectCockpitStage(${def.no})`;

      if (isBypass) {
        statusCls = 'bypass';
        icon = '⏭️';
        statusLabel = 'Bypass';
      } else if (isDone) {
        statusCls = 'status-selesai';
        icon = '✅';
        statusLabel = 'Selesai';
      } else if (isDraft) {
        statusCls = 'status-draft';
        icon = '📝';
        statusLabel = 'Draft';
      } else if (isChainLocked) {
        statusCls = 'status-terkunci';
        icon = '🔒';
        statusLabel = `Terkunci (Urut ${def.no - 1})`;
        clickAction = `handleLockedStageClick(${def.no})`;
      } else {
        statusCls = 'status-siap';
        icon = '🔓';
        statusLabel = 'Siap Diisi';
      }

      const activeCls = isActive ? 'active' : '';

      return `
        <button type="button" class="cakra-compact-step-btn ${statusCls} ${activeCls}" onclick="${clickAction}" title="Tahap ${def.no}: ${cakraEsc(def.nama)} [Status: ${statusLabel}]">
          <span class="step-num">${def.no}</span>
          <span class="step-code">${cakraEsc(def.kode || ('T' + def.no))}</span>
          <span class="step-icon">${icon}</span>
        </button>
      `;
    }).join('');

    const compactHtml = `
      ${headerHtml}
      <div class="cakra-compact-stepper-track">
        ${trackPillsHtml}
      </div>
      <div style="width:100%; height:3px; background:#e2e8f0; border-radius:2px; margin-top:6px; overflow:hidden;">
        <div style="width:${progressPct}%; height:100%; background:linear-gradient(90deg, #3b82f6 0%, #10b981 100%); transition:width 0.3s ease;"></div>
      </div>
    `;

    container.innerHTML = compactHtml;
  } else {
    // -------------------------------------------------------------------------
    // MODE DETAIL / EXPANDED (FULL 18-STAGE GRID)
    // -------------------------------------------------------------------------
    const phaseHeaders = [
      'FASE 1: PERENCANAAN (1–3)',
      'FASE 2: PERSIAPAN PPK (4–7)',
      'FASE 3: PEMILIHAN (8–9)',
      'FASE 4: TTD KONTRAK (10–13)',
      'FASE 5: PELAKSANAAN (14–15)',
      'FASE 6: BAST/PHO & BMN (16–18)'
    ];

    const headersHtml = `
      <div class="cakra-phase-group-row">
        ${phaseHeaders.map(h => `<div class="cakra-phase-badge-header">${h}</div>`).join('')}
      </div>
    `;

    const pillsHtml = stageStatuses.map(st => {
      const { def, row, isBypass, isDone, isDraft, isChainLocked, isReady, isActive } = st;

      let statusCls = 'status-terkunci';
      let numCls = 'num-terkunci';
      let statusBadgeIcon = '';
      let subtitleText = '';
      let clickAction = `selectCockpitStage(${def.no})`;

      if (isBypass) {
        statusCls = 'bypass';
        numCls = 'num-bypass';
        const alasanShort = row.catatan_tahap ? `: ${row.catatan_tahap}` : '';
        statusBadgeIcon = `<span title="Bypass / Dilewati: ${cakraEsc(row.catatan_tahap || 'Regulasi')}" style="font-size:10px; margin-left:auto; color:#475569; font-weight:700; background:#f1f5f9; padding:1px 5px; border-radius:4px; border:1px solid #cbd5e1;">⏭️ Bypass</span>`;
        subtitleText = `⏭️ Dilewati${cakraEsc(alasanShort)}`;
      } else if (isDone) {
        statusCls = 'status-selesai';
        numCls = 'num-selesai';
        statusBadgeIcon = `<span title="Tahap Selesai (Dokumen Sah & Berkas Drive Terverifikasi)" style="font-size:10.5px; margin-left:auto; color:#15803d; font-weight:800; background:#dcfce7; padding:1px 5px; border-radius:4px; border:1px solid #86efac;">✅ Selesai</span>`;
        subtitleText = `${cakraEsc(row.tanggal_dokumen || '-')} • ${cakraEsc(def.kode)}`;
      } else if (isDraft) {
        statusCls = 'status-draft';
        numCls = 'num-draft';
        statusBadgeIcon = `<span title="Sedang Dikerjakan (Draf Tersimpan)" style="font-size:10.5px; margin-left:auto; color:#b45309; font-weight:700; background:#fef3c7; padding:1px 5px; border-radius:4px; border:1px solid #fde68a;">📝 Draft</span>`;
        subtitleText = `${cakraEsc(row.tanggal_dokumen || '-')} • ${cakraEsc(def.kode)}`;
      } else if (isChainLocked) {
        statusCls = 'status-terkunci';
        numCls = 'num-terkunci';
        statusBadgeIcon = `<span title="Terkunci: Wajib menyelesaikan draf tahap sebelumnya" style="font-size:10px; margin-left:auto; color:#64748b; background:#f1f5f9; padding:1px 4px; border-radius:4px; border:1px solid #cbd5e1;">🔒 Terkunci</span>`;
        subtitleText = `🔒 Terkunci (Urut ${def.no - 1})`;
        clickAction = `handleLockedStageClick(${def.no})`;
      } else {
        statusCls = 'status-siap';
        numCls = 'num-siap';
        statusBadgeIcon = `<span title="Siap Dikerjakan: Silakan klik untuk mulai mengisi" style="font-size:10px; margin-left:auto; color:#0369a1; font-weight:700; background:#e0f2fe; padding:1px 5px; border-radius:4px; border:1px solid #7dd3fc;">🔓 Siap Diisi</span>`;
        subtitleText = `👉 Siap Dikerjakan`;
        clickAction = `selectCockpitStage(${def.no})`;
      }

      const cls = `cakra-stage-pill-btn ${isActive ? 'active' : ''} ${statusCls}`;

      return `
        <button type="button" class="${cls}" onclick="${clickAction}" title="Tahap ${def.no}: ${cakraEsc(def.nama)} [Status: ${isBypass ? 'Bypass' : (isDone ? 'Selesai' : (isDraft ? 'Draft' : (isChainLocked ? 'Terkunci' : 'Siap Diisi')))}]">
          <div class="cakra-stage-pill-num ${numCls}">${def.no}</div>
          <div class="cakra-stage-pill-text" style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:4px; justify-content:space-between;">
              <div class="cakra-stage-pill-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${cakraEsc(def.nama)}">${cakraEsc(def.nama)}</div>
              ${statusBadgeIcon}
            </div>
            <div class="cakra-stage-pill-date" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${subtitleText}</div>
          </div>
        </button>
      `;
    }).join('');

    container.innerHTML = `
      ${headerHtml}
      ${headersHtml}
      <div class="cakra-stage-pills-grid">${pillsHtml}</div>
    `;
  }
}
let CakraGuardrailState = {
  pendingStageNo: null,
  missingPrereq: null
};

function checkCockpitStageGuardrail(targetStageNo) {
  if (!CakraState.activePaketCtx) return null;
  const { paket, tahaps, items } = CakraState.activePaketCtx;
  const tpl = CakraState.activePaketCtx.audit?.template;
  const stageNum = Number(targetStageNo);
  const isBypass = tpl && Array.isArray(tpl.bypass_tahap) && tpl.bypass_tahap.includes(stageNum);

  if (isBypass) {
    return {
      type: 'bypass',
      missingStage: stageNum,
      missingStageName: `Tahap ${stageNum} (Bypass)`,
      reason: `Tahap ini dilewati otomatis sesuai regulasi untuk skenario "${tpl.nama}". Dokumen administrasi tidak dipersyaratkan.`
    };
  }

  // Pre-requisite rules:
  // 1. Masuk Tahap 5-7: Butuh Pagu Anggaran
  if (stageNum >= 5 && stageNum <= 7) {
    if (!paket.nilai_pagu || Number(paket.nilai_pagu) <= 0) {
      return {
        missingStage: 1,
        missingStageName: 'Tahap 1: Identifikasi Kebutuhan & Pagu DIPA/RKB',
        reason: 'Nilai Pagu Anggaran masih Rp 0. Sesuai Pasal 26 Perpres 46/2025, penetapan HPS dan rancangan kontrak wajib mengacu pada pagu anggaran yang sah.'
      };
    }
  }

  // 2. Masuk Tahap 8-9 (Pemilihan/Negosiasi): Butuh Spesifikasi/Item dan HPS/Ref Harga
  if (stageNum === 8 || stageNum === 9) {
    const hasItems = Array.isArray(items) && items.length > 0;
    if (!hasItems) {
      return {
        missingStage: 4,
        missingStageName: 'Tahap 4: Spesifikasi Teknis & Rincian Item',
        reason: 'Belum ada rincian item barang/jasa di Sub-Tab 2. Pejabat Pengadaan / Pokja tidak dapat melakukan pemilihan atau negosiasi tanpa rincian spesifikasi teknis.'
      };
    }
    const isBebasHps = tpl && tpl.jenis_kertas_harga && tpl.jenis_kertas_harga.toLowerCase().includes('bebas hps');
    if (!isBebasHps && (!paket.nilai_hps || Number(paket.nilai_hps) <= 0)) {
      return {
        missingStage: 6,
        missingStageName: 'Tahap 6: Penyusunan HPS / Referensi Harga',
        reason: 'Nilai HPS / Referensi Harga belum diisi. Berdasarkan Perpres 46/2025 jo. Kepka LKPP 177/2024, proses pemilihan dan negosiasi dilarang melebihi HPS/Ref Harga.'
      };
    }
  }

  // 3. Masuk Tahap 10-13 (Penetapan & Kontrak): Butuh Rekanan / Penyedia Terpilih
  if (stageNum >= 10 && stageNum <= 13) {
    if (!paket.penyedia_id || Number(paket.penyedia_id) <= 0) {
      return {
        missingStage: 9,
        missingStageName: 'Tahap 9: Pemilihan Penyedia / Penetapan Pemenang',
        reason: 'Penyedia (Vendor) belum dipilih. Penandatanganan kontrak dan validasi Beneficial Ownership membutuhkan rekanan definitif.'
      };
    }
  }

  // 4. Masuk Tahap 14-15: Kontrak Sah
  if (stageNum === 14 || stageNum === 15) {
    const tKontrak = (tahaps || []).find(t => Number(t.no_tahap) === 13);
    const hasNoKontrak = tKontrak && tKontrak.nomor_dokumen && tKontrak.nomor_dokumen !== '-';
    if (!hasNoKontrak && (!paket.nilai_kontrak || Number(paket.nilai_kontrak) <= 0)) {
      return {
        missingStage: 13,
        missingStageName: 'Tahap 13: Penandatanganan Kontrak Resmi',
        reason: 'Kontrak belum ditandatangani. Penerbitan Surat Perintah Mulai Kerja (SPMK) dan pelaksanaan pekerjaan mensyaratkan kontrak sah.'
      };
    }
  }

  // 5. Masuk Tahap 16-18: Serah Terima & Keuangan
  if (stageNum >= 16) {
    const tKontrak = (tahaps || []).find(t => Number(t.no_tahap) === 13);
    if (!tKontrak || !tKontrak.nomor_dokumen || tKontrak.nomor_dokumen === '-') {
      return {
        missingStage: 13,
        missingStageName: 'Tahap 13: Penandatanganan Kontrak Resmi',
        reason: 'Serah terima hasil pekerjaan (BAST) dan pembayaran keuangan tidak dapat diproses tanpa kontrak sah.'
      };
    }
  }

  return null;
}

function selectCockpitStage(stageNo, skipGuardrail = false) {
  const targetStage = Number(stageNo);
  const { tahaps } = CakraState.activePaketCtx || {};
  const tahapMap = {};
  (tahaps || []).forEach(t => { tahapMap[t.no_tahap] = t; });

  // MUTLAK: Rantai sekuensial tidak boleh dilompati
  if (targetStage > 1 && isCockpitStageLocked(targetStage, tahapMap)) {
    handleLockedStageClick(targetStage);
    return;
  }

  if (!skipGuardrail) {
    const checkRes = checkCockpitStageGuardrail(targetStage);
    if (checkRes) {
      CakraGuardrailState.pendingStageNo = targetStage;
      CakraGuardrailState.missingPrereq = checkRes;

      const modal = document.getElementById('modal-pengadaan-guardrail');
      const msgContainer = document.getElementById('guardrail-message-container');
      if (modal && msgContainer) {
        msgContainer.innerHTML = `
          <div style="background:#fff1f2; border:1.5px solid #fecdd3; border-radius:8px; padding:12px 14px; margin-bottom:12px;">
            <div style="font-weight:800; color:#9f1239; font-size:13.5px; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              <span>⛔ Tahap Prasyarat Belum Lengkap:</span>
            </div>
            <div style="font-weight:700; color:#881337; font-size:13px;">
              ${cakraEsc(checkRes.missingStageName)}
            </div>
            <div style="color:#4c0519; margin-top:8px; font-size:12px; line-height:1.45;">
              ${cakraEsc(checkRes.reason)}
            </div>
          </div>
          <div style="font-size:12px; color:#475569; line-height:1.45;">
            Anda sedang membuka <strong>Tahap ${targetStage}</strong>. Untuk kepatuhan regulasi pengadaan dan mencegah potensi temuan pemeriksaan auditor (BPK / Inspektorat), disarankan menyelesaikan tahap prasyarat terlebih dahulu.
          </div>
        `;
        modal.style.display = 'flex';
        return;
      }
    }
  }

  CakraState.activeStageNo = targetStage;
  CakraState.activeFase = getFaseByStage(targetStage);
  if (!['jadwal', 'dodont'].includes(CakraState.activeCockpitSubTab)) {
    CakraState.activeCockpitSubTab = `fase${CakraState.activeFase}`;
  }

  // Update phase tabs highlight
  document.querySelectorAll('.cakra-sub-tab-btn').forEach(b => b.classList.remove('active'));
  const activeTabBtn = document.getElementById(`cakra-subtab-btn-${CakraState.activeCockpitSubTab}`);
  if (activeTabBtn) activeTabBtn.classList.add('active');

  renderCockpitLeftStepper();
  renderCockpitRightDock();
  renderCockpitCenterWorkspace();
}

function closeGuardrailModal() {
  const modal = document.getElementById('modal-pengadaan-guardrail');
  if (modal) modal.style.display = 'none';
}

function onGuardrailTetapLanjut() {
  closeGuardrailModal();
  if (CakraGuardrailState.pendingStageNo) {
    selectCockpitStage(CakraGuardrailState.pendingStageNo, true);
  }
}

function onGuardrailLengkapiPrasyarat() {
  closeGuardrailModal();
  if (CakraGuardrailState.missingPrereq && CakraGuardrailState.missingPrereq.missingStage) {
    selectCockpitStage(CakraGuardrailState.missingPrereq.missingStage, true);
    cakraNotify(`Membuka ${CakraGuardrailState.missingPrereq.missingStageName} untuk dilengkapi...`, 'info');
  }
}


function getFaseByStage(stageNo) {
  const n = Number(stageNo) || 1;
  if (n <= 3) return 1;
  if (n <= 7) return 2;
  if (n <= 9) return 3;
  if (n <= 13) return 4;
  if (n <= 15) return 5;
  return 6;
}

function switchCockpitFase(faseNum) {
  const f = Number(faseNum);
  CakraState.activeFase = f;
  CakraState.activeCockpitSubTab = `fase${f}`;

  document.querySelectorAll('.cakra-sub-tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`cakra-subtab-btn-fase${f}`);
  if (btn) btn.classList.add('active');

  const curFase = getFaseByStage(CakraState.activeStageNo);
  if (curFase !== f) {
    const firstStageMap = { 1: 1, 2: 4, 3: 8, 4: 10, 5: 14, 6: 16 };
    const target = firstStageMap[f] || 1;
    selectCockpitStage(target, true);
  } else {
    renderCockpitCenterWorkspace();
  }
}

function switchCockpitUtilityView(viewName) {
  CakraState.activeCockpitSubTab = viewName;
  document.querySelectorAll('.cakra-sub-tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`cakra-subtab-btn-${viewName}`);
  if (btn) btn.classList.add('active');
  renderCockpitCenterWorkspace();
}

function switchCockpitTab(tabName) {
  CakraState.activeCockpitSubTab = tabName;
  document.querySelectorAll('.cakra-sub-tab-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`cakra-subtab-btn-${tabName}`);
  if (btn) btn.classList.add('active');
  renderCockpitCenterWorkspace();
}

function renderCockpitCenterWorkspace() {
  const container = document.getElementById('cakra-cockpit-tab-content');
  if (!container || !CakraState.activePaketCtx) return;

  if (CakraState.activeCockpitSubTab === 'jadwal') {
    container.innerHTML = buildCockpitJadwalTabHtml();
    return;
  }
  if (CakraState.activeCockpitSubTab === 'dodont') {
    container.innerHTML = buildCockpitDoDontTabHtml();
    return;
  }

  const fase = CakraState.activeFase || getFaseByStage(CakraState.activeStageNo || 1);
  container.innerHTML = buildCockpitPhaseWorkspaceHtml(fase);
}

function buildCockpitFormTabHtml() {
  const { paket, rekomendasi } = CakraState.activePaketCtx;
  const penyediaOpts = CakraState.penyedias.map(v =>
    `<option value="${v.id}" ${Number(v.id) === Number(paket.penyedia_id) ? 'selected' : ''}>${cakraEsc(v.nama_perusahaan)} (${cakraEsc(v.kualifikasi_usaha)} - ${cakraEsc(v.nama_direktur)})</option>`
  ).join('');

  const jenisPengadaanList = [
    'Barang',
    'Jasa Lainnya',
    'Jasa Konsultansi Nonkonstruksi',
    'Pekerjaan Konstruksi',
    'Jasa Konsultansi Konstruksi',
    'Pekerjaan Konstruksi Terintegrasi Rancang dan Bangun',
    'Swakelola',
    'Dikecualikan'
  ];

  const caraPengadaanList = [
    'Penyedia',
    'Swakelola Tipe I',
    'Swakelola Tipe II',
    'Swakelola Tipe III',
    'Swakelola Tipe IV'
  ];

  const metodePemilihanList = [
    'E-Purchasing',
    'Pengadaan Langsung',
    'Penunjukan Langsung',
    'Repeat Order',
    'Tender Cepat',
    'Tender',
    'Seleksi',
    'Mekanisme Pasar (Dikecualikan)',
    'Swakelola'
  ];

  const bentukKontrakList = [
    'Bukti Pembelian',
    'Kuitansi',
    'SPK',
    'Surat Perjanjian',
    'Surat Pesanan',
    'Kontrak Swakelola'
  ];

  const jenisKontrakList = [
    'Lumsum',
    'Harga Satuan',
    'Gabungan Lumsum dan Harga Satuan',
    'Waktu Penugasan',
    'Kontrak Payung',
    'Putar Kunci (Turnkey)',
    'Kontrak Berbasis Kinerja',
    'Biaya Plus Imbalan',
    'Kontrak Swakelola'
  ];

  const jenisKertasHargaList = [
    'Bebas HPS (<=10Jt)',
    'Referensi Harga (E-Purchasing <=100Jt)',
    'HPS',
    'RAB Swakelola',
    'Estimasi Pasar (Dikecualikan)',
    'Pagu Rancang dan Bangun'
  ];

  const jenisPphList = [
    { label: 'PPh 22 Barang (1.5%)', rate: 1.5 },
    { label: 'PPh 23 Jasa Lainnya / Konsultansi Badan (2%)', rate: 2.0 },
    { label: 'PPh Final Konstruksi Kecil SBU K1/K2/K3 (1.75%)', rate: 1.75 },
    { label: 'PPh Final Konstruksi Menengah/Besar (2.65%)', rate: 2.65 },
    { label: 'PPh Final Konsultan Konstruksi Bersertifikat (3.5%)', rate: 3.5 },
    { label: 'PPh Final Sewa Tanah/Bangunan 4(2) (10%)', rate: 10.0 },
    { label: 'PPh 21 Tenaga Ahli / Swakelola (5%)', rate: 5.0 },
    { label: 'Bebas PPh (0%)', rate: 0 }
  ];

  const catatanRegulasiHtml = (rekomendasi?.catatanRegulasi || [])
    .map(c => `<div style="margin-bottom:4px;">✅ ${cakraEsc(c)}</div>`)
    .join('');

  const audit = CakraState.activePaketCtx.audit || {};
  const activeTemplate = audit.template || audit.templateCocok || {};
  const activeStageGuidance = audit.panduanTahap || audit.activeStage || {};
  const warnings = audit.warnings || [];
  const doubleChecks = audit.doubleCheck || [];

  // 1. EARLY-WARNING BANNER
  let warningBannerHtml = '';
  if (warnings.length > 0) {
    warningBannerHtml = `
      <div style="background:#fef2f2; border:1.5px solid #f87171; border-radius:10px; padding:14px 16px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:18px;">⚠️</span>
            <strong style="color:#991b1b; font-size:13.5px;">EARLY WARNING & GATEKEEPER REGULASI (${warnings.length} Peringatan Kepatuhan)</strong>
          </div>
          <span class="badge" style="background:#dc2626; color:#fff; font-size:10.5px; font-weight:700;">Audit Otomatis</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          ${warnings.map(w => `
            <div style="display:flex; align-items:flex-start; gap:8px; font-size:12px; color:#7f1d1d; background:#fff; padding:6px 10px; border-radius:6px; border:1px solid #fecaca;">
              <span style="font-weight:800; color:#dc2626; min-width:65px;">[${cakraEsc(w.kode)}]</span>
              <div style="flex:1;">
                <div>${cakraEsc(w.pesan)}</div>
                ${w.rekomendasi ? `<div style="font-size:11px; color:#0369a1; margin-top:2px; font-weight:600;">💡 Rekomendasi: ${cakraEsc(w.rekomendasi)}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  // 2. PANEL PANDUAN KONTEKSTUAL TAHAP AKTIF (TAHAP 1-18)
  let panduanTahapHtml = '';
  if (activeStageGuidance && activeStageGuidance.no) {
    const isStageBypass = audit.isBypass;
    const checklistHtml = (activeStageGuidance.checklist || []).map(ch => `
      <li style="margin-bottom:3px; display:flex; align-items:flex-start; gap:6px;">
        <span style="color:#059669;">✔️</span>
        <span>${cakraEsc(ch)}</span>
      </li>
    `).join('');

    panduanTahapHtml = `
      <div style="background:linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border:1px solid #86efac; border-radius:10px; padding:14px 16px; margin-bottom:14px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
          <div>
            <div style="font-size:11px; font-weight:800; color:#15803d; text-transform:uppercase; letter-spacing:0.5px;">Panduan Kontekstual Tahap ${activeStageGuidance.no} / 18</div>
            <h4 style="margin:2px 0 0; font-size:15px; font-weight:800; color:#0f172a;">${activeStageGuidance.no}. ${cakraEsc(activeStageGuidance.nama)}</h4>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="badge" style="background:#0284c7; color:#fff; font-weight:700; font-size:11px;">PIC: ${cakraEsc(activeStageGuidance.penanggungJawab || '-')}</span>
            <button type="button" class="btn btn-xs btn-success" onclick="selesaikanTahapDanLanjut(${activeStageGuidance.no})" style="font-weight:700; padding:4px 8px;">
              ✅ Selesaikan Tahap Ini & Lanjut ${activeStageGuidance.no < 18 ? activeStageGuidance.no + 1 : 18} →
            </button>
          </div>
        </div>
        <div style="font-size:11.5px; color:#334155; margin-bottom:8px; line-height:1.4;">
          ${cakraEsc(activeStageGuidance.uraian || '')}
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:rgba(255,255,255,0.8); padding:10px 12px; border-radius:8px; border:1px solid #cbd5e1;">
          <div>
            <div style="font-size:11px; font-weight:800; color:#0f172a; margin-bottom:4px;">📋 Checklist Kerja Tahap Ini:</div>
            <ul style="margin:0; padding-left:0; list-style:none; font-size:11px; color:#475569;">
              ${checklistHtml || '<li>-</li>'}
            </ul>
          </div>
          <div>
            <div style="font-size:11px; font-weight:800; color:#0f172a; margin-bottom:4px;">⚖️ Dasar Regulasi & Tips:</div>
            <div style="font-size:11px; color:#1e40af; font-weight:600; margin-bottom:4px;">${cakraEsc(activeStageGuidance.dasarHukum || '-')}</div>
            ${activeStageGuidance.tips ? `<div style="font-size:10.5px; color:#64748b; background:#f8fafc; padding:4px 8px; border-radius:4px; border:1px solid #e2e8f0;">💡 ${cakraEsc(activeStageGuidance.tips)}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // 3. PANEL DOUBLE-CHECK KEPATUHAN SISTEM VS USER
  let doubleCheckHtml = '';
  if (doubleChecks.length > 0 && activeTemplate.id) {
    const rowsHtml = doubleChecks.map(dc => {
      let statusBadge = '<span class="badge badge-success" style="font-size:10px;">✅ Sesuai</span>';
      if (dc.status === 'PERLU_PENYESUAIAN') {
        statusBadge = '<span class="badge badge-danger" style="font-size:10px;">⚠️ Perlu Penyesuaian</span>';
      } else if (dc.status === 'INFO') {
        statusBadge = '<span class="badge badge-info" style="font-size:10px;">ℹ️ Info</span>';
      }
      return `
        <tr style="border-bottom:1px solid #e2e8f0;">
          <td style="padding:6px 10px; font-weight:700; color:#1e293b; font-size:11.5px;">${cakraEsc(dc.parameter)}</td>
          <td style="padding:6px 10px; font-size:11.5px; color:#0369a1; font-weight:700; background:#f0f9ff;">${cakraEsc(dc.standarTemplate)}</td>
          <td style="padding:6px 10px; font-size:11.5px; color:#334155; font-weight:600;">${cakraEsc(dc.isianUser)}</td>
          <td style="padding:6px 10px; text-align:center;">${statusBadge}</td>
          <td style="padding:6px 10px; font-size:11px; color:#64748b;">${cakraEsc(dc.catatan)}</td>
        </tr>
      `;
    }).join('');

    doubleCheckHtml = `
      <div style="background:#ffffff; border:1.5px solid #3b82f6; border-radius:10px; padding:14px 16px; margin-bottom:14px; box-shadow:0 1px 4px rgba(0,0,0,0.06);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
          <div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="badge" style="background:#1e40af; color:#fff; font-size:11px; font-weight:800;">${cakraEsc(activeTemplate.id)}</span>
              <strong style="color:#0f172a; font-size:13.5px;">${cakraEsc(activeTemplate.nama)}</strong>
            </div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">
              ${cakraEsc(activeTemplate.dasar_hukum || 'Perpres 46/2025')} • ${cakraEsc(activeTemplate.deskripsi || '')}
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="applyTemplateBakuToCurrentForm('${activeTemplate.id}')" style="font-weight:700; font-size:11.5px; padding:5px 12px; border-radius:6px;">
            ✨ Terapkan Standar Template ke Form Ini (1-Klik)
          </button>
        </div>

        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
            <thead>
              <tr style="background:#f1f5f9; color:#475569; text-align:left; border-bottom:1.5px solid #cbd5e1;">
                <th style="padding:7px 10px;">Parameter Pengadaan</th>
                <th style="padding:7px 10px;">Standar Baku Sistem (${cakraEsc(activeTemplate.id)})</th>
                <th style="padding:7px 10px;">Isian Anda Saat Ini</th>
                <th style="padding:7px 10px; text-align:center;">Evaluasi</th>
                <th style="padding:7px 10px;">Keterangan & Dasar Regulasi</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  return `
    ${warningBannerHtml}
    ${panduanTahapHtml}
    ${doubleCheckHtml}
    <div class="cakra-alert-regulasi">
      <div style="font-weight:800; margin-bottom:4px;">⚖️ REKOMENDASI OTOMATIS MESIN REGULASI PENGADAAN (PERPRES 46/2025, PERLEM LKPP 2/2026 & 3/2026):</div>
      <div>• Rekomendasi Kertas Kerja Harga: <strong>${cakraEsc(rekomendasi?.jenisKertasHarga)}</strong> | Bentuk Kontrak: <strong>${cakraEsc(rekomendasi?.bentukKontrakRekomendasi)}</strong> | Pelaksana: <strong>${cakraEsc(rekomendasi?.pelaksanaRekomendasi)}</strong></div>
      ${rekomendasi?.segmentasiKonstruksi ? `<div>• Segmentasi Konstruksi: <strong>${cakraEsc(rekomendasi.segmentasiKonstruksi)}</strong></div>` : ''}
      ${catatanRegulasiHtml}
    </div>


    <form id="cakra-form-paket-cockpit" onsubmit="saveCurrentPaketForm(event)">
      <div class="cakra-form-grid-3">
        <div class="cakra-form-group">
          <label>Kode Paket Internal</label>
          <input type="text" class="cakra-form-control cakra-mono" id="cf_kode_paket_internal" value="${cakraEsc(paket.kode_paket_internal)}" required />
        </div>
        <div class="cakra-form-group">
          <label>Kode RUP SIRUP LKPP</label>
          <input type="text" class="cakra-form-control cakra-mono" id="cf_kode_rup" value="${cakraEsc(paket.kode_rup)}" />
        </div>
        <div class="cakra-form-group">
          <label>Subbagian Pengampu (PIC)</label>
          <select class="cakra-form-control" id="cf_pic_subbag">
            ${['KUL', 'RENDATIN', 'TEKNIS', 'HUKUM', 'PARSDM'].map(s => `<option value="${s}" ${paket.pic_subbag === s ? 'selected' : ''}>Subbag ${s}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="cakra-form-group">
        <label>Nama Paket Pengadaan Barang / Jasa / Konstruksi</label>
        <input type="text" class="cakra-form-control" id="cf_nama_paket" value="${cakraEsc(paket.nama_paket)}" required />
      </div>

      <div class="cakra-form-group">
        <label>Uraian Lingkup Pekerjaan / Spesifikasi Umum / KAK / DED & SMKK</label>
        <textarea class="cakra-form-control" id="cf_uraian_pekerjaan" rows="2">${cakraEsc(paket.uraian_pekerjaan)}</textarea>
      </div>

      <div class="cakra-form-grid-3">
        <div class="cakra-form-group">
          <label>1. Jenis Pengadaan (Lengkap 8 Kategori)</label>
          <select class="cakra-form-control" id="cf_jenis_pengadaan">
            ${jenisPengadaanList.map(j => `<option value="${j}" ${paket.jenis_pengadaan === j ? 'selected' : ''}>${j}</option>`).join('')}
          </select>
        </div>
        <div class="cakra-form-group">
          <label>2. Cara Pengadaan</label>
          <select class="cakra-form-control" id="cf_cara_pengadaan">
            ${caraPengadaanList.map(c => `<option value="${c}" ${paket.cara_pengadaan === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="cakra-form-group">
          <label>3. Metode Pemilihan</label>
          <select class="cakra-form-control" id="cf_metode_pemilihan">
            ${metodePemilihanList.map(m => `<option value="${m}" ${paket.metode_pemilihan === m ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="cakra-form-grid-3">
        <div class="cakra-form-group">
          <label>Bentuk Kontrak (Pasal 28 Perpres 46/2025)</label>
          <select class="cakra-form-control" id="cf_bentuk_kontrak">
            ${bentukKontrakList.map(b => `<option value="${b}" ${paket.bentuk_kontrak === b ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>
        <div class="cakra-form-group">
          <label>Jenis Kontrak (Pasal 27 Perpres 46/2025)</label>
          <select class="cakra-form-control" id="cf_jenis_kontrak">
            ${jenisKontrakList.map(jk => `<option value="${jk}" ${paket.jenis_kontrak === jk ? 'selected' : ''}>${jk}</option>`).join('')}
          </select>
        </div>
        <div class="cakra-form-group">
          <label>Jenis Kertas Kerja Harga (Tahap 6)</label>
          <select class="cakra-form-control" id="cf_jenis_kertas_harga">
            ${jenisKertasHargaList.map(kh => `<option value="${kh}" ${paket.jenis_kertas_harga === kh ? 'selected' : ''}>${kh}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="cakra-form-grid-3">
        <div class="cakra-form-group">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <label style="margin:0; font-weight:700;">Kode Akun MAK DIPA (BAS)</label>
            <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" onclick="toggleCakraRkbDrawer()" style="font-size:10.5px; padding:1px 6px; color:#2563eb; border-color:#93c5fd;" title="Tarik dari baris RKB definitif">⚡ Tarik RKB</button>
          </div>
          <input type="text" class="cakra-form-control cakra-mono" id="cf_kode_akun_mak" value="${cakraEsc(paket.kode_akun_mak || '532111')}" readonly style="background:#f1f5f9; cursor:not-allowed; font-weight:800; color:#1e3a8a;" />
        </div>
        <div class="cakra-form-group">
          <label style="font-weight:700;">Nama Akun Belanja Baku (BAS Kemenkeu)</label>
          <input type="text" class="cakra-form-control" id="cf_nama_akun_mak" value="${cakraEsc(paket.nama_akun_mak || 'Belanja Modal Peralatan dan Mesin')}" readonly style="background:#f1f5f9; cursor:not-allowed; font-weight:700;" />
        </div>
        <div style="grid-column:1 / -1; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; margin-top:-4px; margin-bottom:6px;">
          <div style="font-size:11px; font-weight:800; color:#334155; margin-bottom:3px;">📌 Silsilah Pembebanan Anggaran RKB Definitif:</div>
          <div style="font-size:11px; color:#475569; line-height:1.4;">
            <strong>Program:</strong> ${cakraEsc(paket.rkb_program || 'Program Penyelenggaraan Pemilu dalam Proses Konsolidasi Demokrasi')}<br/>
            <strong>Kegiatan:</strong> ${cakraEsc(paket.rkb_kegiatan || 'Pengelolaan dan Pelayanan Sistem Informasi dan Data Pemilih (SIDALIH)')}<br/>
            <strong>Sub Kegiatan / Komponen:</strong> ${cakraEsc(paket.rkb_subkegiatan || paket.rkb_komponen || 'Pemeliharaan dan Pengadaan Sarana Pengolah Data Operasional Pemilu')}
          </div>
        </div>
        <div class="cakra-form-group">
          <label>Nilai Pagu DIPA / RKB (Rp)</label>
          <input type="number" class="cakra-form-control cakra-mono" id="cf_nilai_pagu" value="${Number(paket.nilai_pagu || 0)}" />
        </div>
      </div>

      <div class="cakra-form-grid-3">
        <div class="cakra-form-group">
          <label>Penyedia / Pelaksana Terpilih</label>
          <select class="cakra-form-control" id="cf_penyedia_id">
            ${penyediaOpts}
          </select>
        </div>
        <div class="cakra-form-group">
          <label>Status Ketersediaan di Katalog v6 (Tahap 5)</label>
          <select class="cakra-form-control" id="cf_tersedia_di_katalog">
            ${['Ya, Tersedia & Sesuai', 'Tersedia tapi Dikecualikan (Penilaian PPK)', 'Belum Tersedia di Katalog'].map(st => `<option value="${st}" ${paket.tersedia_di_katalog === st ? 'selected' : ''}>${st}</option>`).join('')}
          </select>
        </div>
        <div class="cakra-form-group">
          <label>Hierarki Prioritas PDN/TKDN (Pasal 66)</label>
          <select class="cakra-form-control" id="cf_prioritas_pdn_level">
            ${[
              'Level 1: TKDN >= 25% (TKDN+BMP >= 40%)',
              'Level 2: PDN TKDN >= 25%',
              'Level 3: PDN TKDN < 25%',
              'Level 4: PDN Terdaftar SIINas',
              'Level 5: PDN Pernyataan Mandiri (Self-Declare)',
              'Level 6: Produk Impor (Izin Menteri/KL)'
            ].map(lv => `<option value="${lv}" ${paket.prioritas_pdn_level === lv ? 'selected' : ''}>${lv}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="cakra-form-group">
        <label>Justifikasi Analisa Pasar & Dokumen Penilaian PPK atas Katalog Elektronik / Konstruksi (Pasal 8 Perlem 2/2026 & Perlem 3/2026)</label>
        <textarea class="cakra-form-control" id="cf_alasan_penilaian_ppk_katalog" rows="2">${cakraEsc(paket.alasan_penilaian_ppk_katalog)}</textarea>
      </div>

      <div class="cakra-form-grid-3">
        <div class="cakra-form-group">
          <label>Masa Pelaksanaan (Hari Kalender)</label>
          <input type="number" class="cakra-form-control cakra-mono" id="cf_masa_pelaksanaan_hari" value="${Number(paket.masa_pelaksanaan_hari || 14)}" />
        </div>
        <div class="cakra-form-group">
          <label>Tanggal Mulai Kerja (SPMK / SPP)</label>
          <input type="date" class="cakra-form-control cakra-mono" id="cf_tgl_mulai_kerja" value="${cakraEsc(paket.tgl_mulai_kerja)}" />
        </div>
        <div class="cakra-form-group">
          <label>Tanggal Selesai Kontrak</label>
          <input type="date" class="cakra-form-control cakra-mono" id="cf_tgl_selesai_kontrak" value="${cakraEsc(paket.tgl_selesai_kontrak)}" />
        </div>
      </div>

      <div class="cakra-form-grid-3">
        <div class="cakra-form-group">
          <label>Jenis & Tarif PPh (Otomatis Hitung SPBy)</label>
          <select class="cakra-form-control" id="cf_jenis_pph_select">
            ${jenisPphList.map(pph => `<option value="${pph.label}|${pph.rate}" ${Number(paket.tarif_pph) === Number(pph.rate) ? 'selected' : ''}>${pph.label}</option>`).join('')}
          </select>
        </div>
        <div class="cakra-form-group">
          <label>Persentase Uang Muka (%)</label>
          <input type="number" step="0.1" class="cakra-form-control cakra-mono" id="cf_persen_uang_muka" value="${Number(paket.persen_uang_muka || 0)}" />
        </div>
        <div class="cakra-form-group">
          <label>Tahap Aktif Saat Ini & Status Paket</label>
          <select class="cakra-form-control" id="cf_status_paket">
            ${['Perencanaan', 'Persiapan PPK', 'Pemilihan', 'Kontrak Aktif', 'Serah Terima & BAST', 'Selesai & Lunas'].map(s => `<option value="${s}" ${paket.status_paket === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; padding-top:12px; border-top:1px solid #e2e8f0;">
        <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" onclick="terapkanRekomendasiOtomatis()">✨ Terapkan Rekomendasi Otomatis Regulasi 2026</button>
        <button type="submit" class="cakra-btn cakra-btn-primary">💾 Simpan Perubahan Data Paket</button>
      </div>
    </form>
  `;
}

function terapkanRekomendasiOtomatis() {
  if (!CakraState.activePaketCtx || !CakraState.activePaketCtx.rekomendasi) return;
  const rek = CakraState.activePaketCtx.rekomendasi;
  const elBentuk = document.getElementById('cf_bentuk_kontrak');
  const elKertas = document.getElementById('cf_jenis_kertas_harga');
  if (elBentuk && rek.bentukKontrakRekomendasi) elBentuk.value = rek.bentukKontrakRekomendasi;
  if (elKertas && rek.jenisKertasHarga) elKertas.value = rek.jenisKertasHarga;
  cakraNotify('Rekomendasi bentuk kontrak & kertas harga regulasi 2026 diterapkan.', 'info');
}

function onDriveLinkInput(val) {
  const sel = document.getElementById('cf_stage_status_tahap');
  if (!sel) return;
  if (val && val.trim().length > 5) {
    sel.value = 'Selesai';
    sel.style.color = '#047857';
  } else {
    if (sel.value === 'Selesai') {
      sel.value = 'Draft';
      sel.style.color = '#b45309';
    }
  }
}
window.onDriveLinkInput = onDriveLinkInput;

async function saveAsSelesai() {
  const driveInput = document.getElementById('cf_link_drive_dokumen');
  const driveLink = driveInput ? driveInput.value.trim() : '';
  if (!driveLink || driveLink.length < 5) {
    cakraNotify('⚠️ Tahap belum dapat diselesaikan! Sesuai SOP & regulasi, dokumen fisik wajib ditandatangani dan tautan Google Drive dokumen sah harus diisi terlebih dahulu.', 'warning');
    if (driveInput) {
      driveInput.focus();
      driveInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      driveInput.style.border = '2px solid #ef4444';
      setTimeout(() => { driveInput.style.border = ''; }, 3000);
    }
    return;
  }
  const stageStatusEl = document.getElementById('cf_stage_status_tahap');
  if (stageStatusEl) stageStatusEl.value = 'Selesai';
  await saveCurrentPaketForm(null, { isSelesai: true });
}
window.saveAsSelesai = saveAsSelesai;

async function saveCurrentPaketForm(e, customOpts = {}) {
  if (e && e.preventDefault) e.preventDefault();
  if (!CakraState.activePaketCtx) return;
  const { paket } = CakraState.activePaketCtx;
  const pphEl = document.getElementById('cf_jenis_pph_select');
  const pphRaw = pphEl ? pphEl.value.split('|') : [paket.jenis_pph || 'PPh 22 (1.5%)', String(paket.tarif_pph || 1.5)];

  const getStr = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? el.value : (fallback ?? '');
  };
  const getNum = (id, fallback) => {
    const el = document.getElementById(id);
    return el ? Number(el.value || 0) : (fallback ?? 0);
  };

  const stageNo = CakraState.activeStageNo || 1;
  const activeDef = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === Number(stageNo)) || {};
  const activeTRow = (CakraState.activePaketCtx.tahaps || []).find(t => Number(t.no_tahap) === Number(stageNo)) || {};

  const isQuickDraft = customOpts.isDraft === true;
  const isExplicitSelesai = customOpts.isSelesai === true;
  const isBypassAction = customOpts.isBypass === true;

  let currentStatus = getStr('cf_stage_status_tahap', activeTRow.status_tahap || 'Draft');
  let currentCatatan = activeTRow.catatan_tahap || `Dokumen Tahap ${stageNo} (${activeDef.nama || ''})`;
  const driveLink = getStr('cf_link_drive_dokumen', activeTRow.link_drive_dokumen || '').trim();

  if (isBypassAction) {
    currentStatus = 'Bypass';
    currentCatatan = customOpts.alasanBypass || activeTRow.catatan_tahap || 'Dilewati / Loncat sesuai regulasi';
  } else if (isQuickDraft) {
    currentStatus = 'Draft';
  } else if (isExplicitSelesai) {
    if (driveLink && driveLink.length > 5) {
      currentStatus = 'Selesai';
    } else {
      currentStatus = 'Draft';
      cakraNotify('⚠️ Tahap ' + stageNo + ' belum dapat berstatus "Selesai"! Syarat mutlak status Selesai: Tautan Google Drive dokumen sah bertandatangan wajib diisi.', 'warning');
    }
  } else {
    // Normal save / submit (ketika tombol Simpan diklik user):
    // Jika link Google Drive sudah terisi dan status bukan Bypass -> otomatis naik ke 'Selesai'!
    if (driveLink && driveLink.length > 5 && currentStatus !== 'Bypass') {
      currentStatus = 'Selesai';
    } else if (currentStatus === 'Selesai' && (!driveLink || driveLink.length <= 5)) {
      currentStatus = 'Draft';
      cakraNotify('⚠️ Tahap ' + stageNo + ' belum dapat berstatus "Selesai"! Tautan Google Drive belum diisi, disimpan sebagai "Draft".', 'warning');
    }
  }

  const payload = {
    ...paket,
    kode_paket_internal: getStr('cf_kode_paket_internal', paket.kode_paket_internal),
    kode_rup: getStr('cf_kode_rup', paket.kode_rup),
    pic_subbag: getStr('cf_pic_subbag', paket.pic_subbag),
    no_nota_dinas_pengusul: getStr('cf_no_nota_dinas_pengusul', paket.no_nota_dinas_pengusul),
    tgl_nota_dinas_pengusul: getStr('cf_tgl_nota_dinas_pengusul', paket.tgl_nota_dinas_pengusul),
    perihal_nota_dinas: getStr('cf_perihal_nota_dinas', paket.perihal_nota_dinas),
    no_disposisi_kpa: getStr('cf_no_disposisi_kpa', paket.no_disposisi_kpa),
    tgl_disposisi_kpa: getStr('cf_tgl_disposisi_kpa', paket.tgl_disposisi_kpa),
    bmn_status_ketersediaan: getStr('cf_bmn_status_ketersediaan', paket.bmn_status_ketersediaan),
    bmn_jumlah_eksisting: getNum('cf_bmn_jumlah_eksisting', paket.bmn_jumlah_eksisting),
    bmn_kondisi_eksisting: getStr('cf_bmn_kondisi_eksisting', paket.bmn_kondisi_eksisting),
    bmn_sifat_kebutuhan: getStr('cf_bmn_sifat_kebutuhan', paket.bmn_sifat_kebutuhan),
    bmn_kesesuaian_rkbmn: getStr('cf_bmn_kesesuaian_rkbmn', paket.bmn_kesesuaian_rkbmn),
    bmn_catatan_telaah: getStr('cf_bmn_catatan_telaah', paket.bmn_catatan_telaah),
    nama_paket: getStr('cf_nama_paket', paket.nama_paket),
    uraian_pekerjaan: getStr('cf_uraian_pekerjaan', paket.uraian_pekerjaan),
    jenis_pengadaan: getStr('cf_jenis_pengadaan', paket.jenis_pengadaan),
    cara_pengadaan: getStr('cf_cara_pengadaan', paket.cara_pengadaan),
    metode_pemilihan: getStr('cf_metode_pemilihan', paket.metode_pemilihan),
    bentuk_kontrak: getStr('cf_bentuk_kontrak', paket.bentuk_kontrak),
    jenis_kontrak: getStr('cf_jenis_kontrak', paket.jenis_kontrak),
    jenis_kertas_harga: getStr('cf_jenis_kertas_harga', paket.jenis_kertas_harga),
    kode_akun_mak: getStr('cf_kode_akun_mak', paket.kode_akun_mak),
    nama_akun_mak: getStr('cf_nama_akun_mak', paket.nama_akun_mak),
    nilai_pagu: getNum('cf_nilai_pagu', paket.nilai_pagu),
    penyedia_id: getNum('cf_penyedia_id', paket.penyedia_id),
    tersedia_di_katalog: getStr('cf_tersedia_di_katalog', paket.tersedia_di_katalog),
    prioritas_pdn_level: getStr('cf_prioritas_pdn_level', paket.prioritas_pdn_level),
    alasan_penilaian_ppk_katalog: getStr('cf_alasan_penilaian_ppk_katalog', paket.alasan_penilaian_ppk_katalog),
    masa_pelaksanaan_hari: getNum('cf_masa_pelaksanaan_hari', paket.masa_pelaksanaan_hari),
    tgl_mulai_kerja: getStr('cf_tgl_mulai_kerja', paket.tgl_mulai_kerja),
    tgl_selesai_kontrak: getStr('cf_tgl_selesai_kontrak', paket.tgl_selesai_kontrak),
    jenis_pph: pphRaw[0],
    tarif_pph: Number(pphRaw[1] || 1.5),
    persen_uang_muka: getNum('cf_persen_uang_muka', paket.persen_uang_muka),
    status_paket: getStr('cf_status_paket', paket.status_paket),
    stageUpdate: {
      no_tahap: stageNo,
      fase: activeDef.fase || 1,
      nama_tahap: activeDef.nama || `Tahap ${stageNo}`,
      nomor_dokumen: getStr('cf_stage_nomor_dokumen', activeTRow.nomor_dokumen || ''),
      tanggal_dokumen: getStr('cf_stage_tanggal_dokumen', activeTRow.tanggal_dokumen || ''),
      status_tahap: currentStatus,
      link_drive_dokumen: driveLink,
      catatan_tahap: currentCatatan
    }
  };

  const res = await cakraApiPost('/api/cakra/paket', payload);
  const savedId = res.id || paket.id;
  CakraState.activePaketId = savedId;
  await initCakraApp();
  await openPaketInCockpit(savedId, CakraState.activeStageNo, false);

  const notifMsg = isBypassAction
    ? `⏭️ Tahap ${stageNo} dilewati (Bypass): "${currentCatatan}"`
    : (isQuickDraft
        ? `💾 Draf Tahap ${stageNo} berhasil disimpan!`
        : `✅ Data dan progres Tahap ${stageNo} berhasil disimpan!`);
  cakraNotify(notifMsg, isBypassAction ? 'info' : 'success');
}

async function saveDraftQuickly() {
  const stageStatusEl = document.getElementById('cf_stage_status_tahap');
  if (stageStatusEl && stageStatusEl.value !== 'Selesai' && stageStatusEl.value !== 'Bypass') {
    stageStatusEl.value = 'Draft';
  }
  await saveCurrentPaketForm(null, { isDraft: true });
}

function showCakraBypassModal(stageNo) {
  const activeDef = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === Number(stageNo)) || { nama: `Tahap ${stageNo}` };
  
  let defaultAlasan = stageNo === 11 
    ? 'Metode E-Purchasing langsung menggunakan Surat Pesanan tanpa SPPBJ terpisah dan jaminan pelaksanaan.'
    : (stageNo === 14 
        ? 'Pengadaan barang operasional standar pabrikan tidak memerlukan penyerahan lokasi fisik (MC-0).'
        : 'Dilewati sesuai karakteristik pengadaan dan pertimbangan efisiensi waktu satker.');

  // Hapus modal lama jika ada
  const oldModal = document.getElementById('cakra-bypass-modal-container');
  if (oldModal) oldModal.remove();

  const modalHtml = `
    <div id="cakra-bypass-modal-container" class="cakra-custom-modal-backdrop" onclick="if(event.target===this) closeCakraBypassModal()">
      <div class="cakra-custom-modal-card">
        <div style="background:#0f172a; color:#fff; padding:14px 18px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-weight:800; font-size:13.5px; display:flex; align-items:center; gap:8px;">
            <span>⏭️ Konfirmasi Loncat / Bypass Tahap ${stageNo}</span>
          </div>
          <button type="button" onclick="closeCakraBypassModal()" style="background:none; border:none; color:#94a3b8; font-size:18px; cursor:pointer; line-height:1;">✕</button>
        </div>
        <div style="padding:18px;">
          <div style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:4px;">
            ${cakraEsc(activeDef.nama)}
          </div>
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:10px 12px; font-size:11.5px; color:#1e40af; margin-bottom:14px; line-height:1.45;">
            <strong>ℹ️ Catatan Kepatuhan &amp; Audit Trail:</strong><br/>
            Melewati tahapan pengadaan akan dicatat permanen dalam sistem audit. Pastikan tahapan ini memang tidak diwajibkan berdasarkan regulasi PBJ atau karakteristik paket pengadaan Anda.
          </div>

          <label style="font-size:11.5px; font-weight:700; color:#475569; display:block; margin-bottom:6px;">
            Pilih Cepat Alasan Regulasi (Klik untuk memasukkan):
          </label>
          <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px;">
            <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" onclick="setBypassPresetReason('Metode E-Purchasing langsung menggunakan Surat Pesanan tanpa SPPBJ terpisah dan jaminan pelaksanaan.')" style="font-size:10.5px; padding:3px 8px;">🏷️ E-Purchasing Langsung SP</button>
            <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" onclick="setBypassPresetReason('Pengadaan barang operasional standar pabrikan tidak memerlukan penyerahan lokasi fisik (MC-0).')" style="font-size:10.5px; padding:3px 8px;">🏷️ Barang Standar Tanpa MC-0</button>
            <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" onclick="setBypassPresetReason('Nilai paket pengadaan di bawah ambang batas kewajiban administratif tahapan ini.')" style="font-size:10.5px; padding:3px 8px;">🏷️ Di Bawah Ambang Batas</button>
            <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" onclick="setBypassPresetReason('Dilewati sesuai karakteristik pengadaan dan pertimbangan efisiensi waktu satker.')" style="font-size:10.5px; padding:3px 8px;">🏷️ Efisiensi &amp; Diskresi PPK</button>
          </div>

          <label style="font-size:11.5px; font-weight:700; color:#334155; display:block; margin-bottom:4px;">
            Alasan Resmi / Justifikasi Yuridis PPK: <span style="color:#dc2626;">*</span>
          </label>
          <textarea id="cakra-bypass-reason-input" class="cakra-form-control" rows="3" style="width:100%; font-size:12px; resize:vertical; padding:8px; border:1.5px solid #94a3b8;" placeholder="Tuliskan alasan kenapa tahapan ini dilewati..." maxlength="250">${cakraEsc(defaultAlasan)}</textarea>
          <div style="font-size:10.5px; color:#64748b; text-align:right; margin-top:3px;">Maksimal 250 karakter</div>
        </div>
        <div style="background:#f8fafc; border-top:1px solid #e2e8f0; padding:12px 18px; display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="cakra-btn cakra-btn-secondary" onclick="closeCakraBypassModal()">Batal</button>
          <button type="button" class="cakra-btn cakra-btn-primary" onclick="submitCakraBypassModal(${stageNo})" style="background:#2563eb; color:#fff; font-weight:700; border:none; display:inline-flex; align-items:center; gap:6px;">
            <span>⏭️ Konfirmasi Loncat Tahap</span>
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function setBypassPresetReason(text) {
  const input = document.getElementById('cakra-bypass-reason-input');
  if (input) input.value = text;
}

function closeCakraBypassModal() {
  const modal = document.getElementById('cakra-bypass-modal-container');
  if (modal) modal.remove();
}

async function submitCakraBypassModal(stageNo) {
  const input = document.getElementById('cakra-bypass-reason-input');
  const alasan = input ? input.value.trim() : '';
  if (!alasan) {
    alert('Alasan melewati tahapan wajib diisi!');
    if (input) input.focus();
    return;
  }
  closeCakraBypassModal();
  await saveCurrentPaketForm(null, { isBypass: true, alasanBypass: alasan });
  if (stageNo < 18) {
    selectCockpitStage(stageNo + 1);
  }
}

function resetAutoStageDocNumber(stageNo) {
  const input = document.getElementById('cf_stage_nomor_dokumen');
  if (!input || !CakraState.activePaketCtx) return;
  const { paket } = CakraState.activePaketCtx;
  const kodePkt = paket.kode_paket_internal || 'PBJ-2026-008';
  const stageDefs = {
    1: 'IDK', 2: 'PMK', 3: 'RUP', 4: 'SPEK', 5: 'AP', 6: 'HPS',
    7: 'RK', 8: 'DPP', 9: 'PIL', 10: 'REV', 11: 'SPPBJ', 12: 'PAM',
    13: 'SP', 14: 'SPMK', 15: 'MON', 16: 'BAST', 17: 'BAP', 18: 'PKP'
  };
  const code = stageDefs[stageNo] || `T${stageNo}`;
  const padStage = String(stageNo).padStart(3, '0');
  input.value = `${padStage}/${code}/${kodePkt}/PPK-PBJ/KPU-NGW/V/2026`;
  cakraNotify(`Nomor dokumen disesuaikan otomatis dengan Kode Paket: ${kodePkt}`, 'info');
}

if (!window._cakraCtrlSBound) {
  window._cakraCtrlSBound = true;
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      const form = document.getElementById('cakra-form-paket-cockpit');
      if (form) {
        e.preventDefault();
        saveDraftQuickly();
      }
    }
  });
}

/**
 * SUB-TAB 2: SPREADSHEET ITEM, SURVEI 3 SUMBER, HPS/REF. HARGA, AHSP KONSTRUKSI, & SBOB
 */
function buildCockpitItemsTabHtml() {
  const { paket, items } = CakraState.activePaketCtx;
  const rowsHtml = (items || []).map((it, idx) => `
    <tr data-idx="${idx}">
      <td style="text-align:center; font-weight:700;">${idx + 1}</td>
      <td>
        <input type="text" class="cakra-form-control item-uraian" value="${cakraEsc(it.uraian_item)}" placeholder="Nama Barang/Jasa/Pekerjaan Konstruksi" style="margin-bottom:4px; font-weight:700;" />
        <input type="text" class="cakra-form-control item-spek" value="${cakraEsc(it.spesifikasi_teknis)}" placeholder="Spesifikasi Teknis / KAK / AHSP / SNI" style="font-size:11px;" />
      </td>
      <td><input type="number" step="0.01" class="cakra-form-control cakra-mono item-vol" value="${Number(it.volume || 1)}" style="width:70px;" /></td>
      <td><input type="text" class="cakra-form-control item-satuan" value="${cakraEsc(it.satuan || 'Paket')}" style="width:75px;" /></td>
      <td><input type="number" class="cakra-form-control cakra-mono item-tkdn" value="${Number(it.persen_tkdn || 40)}" style="width:65px;" /></td>
      <td><input type="number" class="cakra-form-control cakra-mono item-s1" value="${Number(it.harga_survei_1 || 0)}" style="width:110px;" title="Survei 1: Katalog / AHSP / Vendor A" /></td>
      <td><input type="number" class="cakra-form-control cakra-mono item-s2" value="${Number(it.harga_survei_2 || 0)}" style="width:110px;" title="Survei 2: Pasar Lokal / HSPK" /></td>
      <td><input type="number" class="cakra-form-control cakra-mono item-hps" value="${Number(it.harga_satuan_hps || 0)}" style="width:115px; background:#eff6ff; font-weight:700;" /></td>
      <td><input type="number" class="cakra-form-control cakra-mono item-kontrak" value="${Number(it.harga_satuan_kontrak || 0)}" style="width:115px; background:#ecfdf5; font-weight:700;" /></td>
      <td>
        <select class="cakra-form-control item-sakti" style="font-size:11px;">
          ${['Persediaan', 'Aset Tetap (BMN)', 'Jasa/Habis Pakai'].map(m => `<option value="${m}" ${it.jenis_pencatatan_sakti === m ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
      </td>
      <td style="text-align:center;">
        <button type="button" class="cakra-btn cakra-btn-danger cakra-btn-sm" onclick="removeItemRow(this)">🗑️</button>
      </td>
    </tr>
  `).join('');

  return `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
      <div>
        <strong style="font-size:13px;">📊 Rincian Item, Survei Pasar/Katalog/AHSP, ${cakraEsc(paket.jenis_kertas_harga)}, & Kontrak</strong>
        <div style="font-size:11px; color:#64748b;">Mendukung Barang, Jasa Lainnya, AHSP & SMKK Pekerjaan Konstruksi, serta Personel SBOB Konsultansi.</div>
      </div>
      <div style="display:flex; gap:6px;">
        <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" onclick="addNewItemRow()">➕ Tambah Baris Item</button>
        <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="saveCurrentItemsTable()">💾 Simpan & Hitung Ulang HPS/Kontrak</button>
      </div>
    </div>

    <div style="overflow-x:auto;">
      <table class="cakra-data-table" id="cakra-cockpit-items-table">
        <thead>
          <tr>
            <th>No</th>
            <th style="min-width:220px;">Uraian Item & Spesifikasi / AHSP</th>
            <th>Vol</th>
            <th>Satuan</th>
            <th>TKDN%</th>
            <th>Survei 1 / AHSP (Rp)</th>
            <th>Survei 2 / Pasar (Rp)</th>
            <th>Hrg Satuan HPS/Ref (Rp)</th>
            <th>Hrg Satuan Kontrak (Rp)</th>
            <th>Modul SAKTI</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody id="cakra-cockpit-items-tbody">${rowsHtml}</tbody>
      </table>
    </div>

    <div class="cakra-card" style="margin-top:14px; background:#f8fafc;">
      <div class="cakra-card-body" style="padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div style="font-size:11.5px;">
          <strong>📐 Kalkulator Otomatis Konversi SBOB Jasa Konsultansi (Perlem LKPP 3/2026):</strong>
          <span style="color:#475569;">SBOM = SBOB / 4,1 | SBOH = (SBOB / 22) × 1,1 | SBOJ = (SBOH / 8) × 1,3</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <input type="number" id="cakra-input-sbob-val" class="cakra-form-control cakra-mono" value="7500000" style="width:140px;" oninput="updateSbobCalc()" />
          <span id="cakra-output-sbob-text" class="cakra-mono" style="font-size:11.5px; font-weight:700; color:#1e40af;">
            SBOM: Rp 1.829.268 | SBOH: Rp 375.000 | SBOJ: Rp 60.938
          </span>
        </div>
      </div>
    </div>
  `;
}

function updateSbobCalc() {
  const sbob = Number(document.getElementById('cakra-input-sbob-val')?.value || 0);
  const sbom = Math.round(sbob / 4.1);
  const sboh = Math.round((sbob / 22) * 1.1);
  const sboj = Math.round((sboh / 8) * 1.3);
  const el = document.getElementById('cakra-output-sbob-text');
  if (el) {
    el.textContent = `SBOM: ${cakraFmtRp(sbom)} | SBOH: ${cakraFmtRp(sboh)} | SBOJ: ${cakraFmtRp(sboj)}`;
  }
}

function addNewItemRow() {
  const tbody = document.getElementById('cakra-cockpit-items-tbody');
  if (!tbody) return;
  const idx = tbody.querySelectorAll('tr').length + 1;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td style="text-align:center; font-weight:700;">${idx}</td>
    <td>
      <input type="text" class="cakra-form-control item-uraian" value="Item Pekerjaan Baru" style="margin-bottom:4px; font-weight:700;" />
      <input type="text" class="cakra-form-control item-spek" value="Sesuai KAK / Spesifikasi Teknis / AHSP" style="font-size:11px;" />
    </td>
    <td><input type="number" step="0.01" class="cakra-form-control cakra-mono item-vol" value="1" style="width:70px;" /></td>
    <td><input type="text" class="cakra-form-control item-satuan" value="Paket" style="width:75px;" /></td>
    <td><input type="number" class="cakra-form-control cakra-mono item-tkdn" value="40" style="width:65px;" /></td>
    <td><input type="number" class="cakra-form-control cakra-mono item-s1" value="1000000" style="width:110px;" /></td>
    <td><input type="number" class="cakra-form-control cakra-mono item-s2" value="1050000" style="width:110px;" /></td>
    <td><input type="number" class="cakra-form-control cakra-mono item-hps" value="1000000" style="width:115px; background:#eff6ff; font-weight:700;" /></td>
    <td><input type="number" class="cakra-form-control cakra-mono item-kontrak" value="980000" style="width:115px; background:#ecfdf5; font-weight:700;" /></td>
    <td>
      <select class="cakra-form-control item-sakti" style="font-size:11px;">
        <option value="Persediaan">Persediaan</option>
        <option value="Aset Tetap (BMN)">Aset Tetap (BMN)</option>
        <option value="Jasa/Habis Pakai">Jasa/Habis Pakai</option>
      </select>
    </td>
    <td style="text-align:center;">
      <button type="button" class="cakra-btn cakra-btn-danger cakra-btn-sm" onclick="removeItemRow(this)">🗑️</button>
    </td>
  `;
  tbody.appendChild(tr);
}

function removeItemRow(btn) {
  const tr = btn.closest('tr');
  if (tr) tr.remove();
}

async function saveCurrentItemsTable() {
  const rows = Array.from(document.querySelectorAll('#cakra-cockpit-items-tbody tr'));
  const items = rows.map((tr, i) => {
    const vol = Number(tr.querySelector('.item-vol')?.value || 1);
    const hpsSat = Number(tr.querySelector('.item-hps')?.value || 0);
    const konSat = Number(tr.querySelector('.item-kontrak')?.value || hpsSat);
    return {
      urutan: i + 1,
      kategori_item: 'Utama',
      uraian_item: tr.querySelector('.item-uraian')?.value || 'Item',
      spesifikasi_teknis: tr.querySelector('.item-spek')?.value || '-',
      volume: vol,
      satuan: tr.querySelector('.item-satuan')?.value || 'Paket',
      status_pdn: 'PDN Bersertifikat TKDN',
      persen_tkdn: Number(tr.querySelector('.item-tkdn')?.value || 40),
      persen_bmp: 15,
      harga_survei_1: Number(tr.querySelector('.item-s1')?.value || hpsSat),
      sumber_survei_1: 'Katalog / AHSP / Vendor 1',
      harga_survei_2: Number(tr.querySelector('.item-s2')?.value || hpsSat),
      sumber_survei_2: 'Survei Pasar / Pembanding 2',
      harga_survei_3: hpsSat,
      sumber_survei_3: 'Kontrak / Standar Biaya',
      metode_penentuan_hps: 'Terendah',
      harga_satuan_hps: hpsSat,
      jumlah_hps: Math.round(vol * hpsSat),
      harga_satuan_penawaran: hpsSat,
      harga_satuan_kontrak: konSat,
      jumlah_kontrak: Math.round(vol * konSat),
      kode_barang_bmn: '1.01.03.01.001',
      jenis_pencatatan_sakti: tr.querySelector('.item-sakti')?.value || 'Persediaan'
    };
  });

  await cakraApiPost(`/api/cakra/paket/${CakraState.activePaketId}/items`, { items });
  await initCakraApp();
  await openPaketInCockpit(CakraState.activePaketId, CakraState.activeStageNo, false);
  cakraNotify('Rincian item & perhitungan HPS/Kontrak berhasil diperbarui.', 'success');
}

/**
 * SUB-TAB 3: TIME-MACHINE GENERATOR NOMOR & TANGGAL 18 TAHAP
 */
function buildCockpitJadwalTabHtml() {
  const { paket, tahaps } = CakraState.activePaketCtx;
  const rowsHtml = (tahaps || []).map(t => `
    <tr data-tahap="${t.no_tahap}">
      <td style="text-align:center; font-weight:800;">Tahap ${t.no_tahap}</td>
      <td>
        <div style="font-weight:700;">${cakraEsc(t.nama_tahap)}</div>
        <div style="font-size:10.5px; color:#64748b;">Fase ${t.fase}</div>
      </td>
      <td><input type="text" class="cakra-form-control cakra-mono tahap-nomor" value="${cakraEsc(t.nomor_dokumen)}" /></td>
      <td><input type="date" class="cakra-form-control cakra-mono tahap-tgl" value="${cakraEsc(t.tanggal_dokumen)}" /></td>
      <td>
        <select class="cakra-form-control tahap-status">
          ${['Selesai', 'Aktif', 'Draft', 'Bypass'].map(s => `<option value="${s}" ${t.status_tahap === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td><input type="text" class="cakra-form-control tahap-catatan" value="${cakraEsc(t.catatan_tahap || '')}" /></td>
    </tr>
  `).join('');

  return `
    <div class="cakra-alert-regulasi" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
      <div>
        <strong>⏱️ Time-Machine Generator (Penomoran & Penanggalan 18 Tahap Otomatis):</strong><br/>
        Pilih tanggal awal perencanaan (Tahap 1), lalu klik <strong>"⚡ Susun Otomatis 18 Tahap"</strong>. Sistem mengurutkan tanggal Tahap 1 s.d. 18 tanpa menabrak Sabtu/Minggu dan menyalakan <em>Smart Bypass</em> sesuai nilai paket!
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <input type="date" id="cakra-tm-start-date" class="cakra-form-control cakra-mono" value="${cakraEsc(tahaps[0]?.tanggal_dokumen || paket.tgl_mulai_kerja || '2026-05-04')}" style="width:145px;" />
        <button type="button" class="cakra-btn cakra-btn-warning cakra-btn-sm" onclick="runAutoTimeMachine()">⚡ Susun Otomatis 18 Tahap</button>
        <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="saveManualTahaps()">💾 Simpan Tabel Jadwal</button>
      </div>
    </div>

    <div style="overflow-x:auto;">
      <table class="cakra-data-table">
        <thead>
          <tr>
            <th style="width:75px;">Tahap</th>
            <th>Nama Tahapan Pengadaan</th>
            <th style="width:230px;">Nomor Surat / Berita Acara</th>
            <th style="width:140px;">Tanggal Dokumen</th>
            <th style="width:110px;">Status</th>
            <th>Keterangan / Catatan Regulasi</th>
          </tr>
        </thead>
        <tbody id="cakra-cockpit-tahaps-tbody">${rowsHtml}</tbody>
      </table>
    </div>
  `;
}

async function runAutoTimeMachine() {
  const startDate = document.getElementById('cakra-tm-start-date')?.value || '2026-05-04';
  await cakraApiPost(`/api/cakra/paket/${CakraState.activePaketId}/tahaps`, {
    autoGenerate: true,
    tanggalMulai: startDate
  });
  await openPaketInCockpit(CakraState.activePaketId, CakraState.activeStageNo, false);
  cakraNotify('Jadwal & Nomor Surat 18 Tahap berhasil disusun otomatis!', 'success');
}

async function saveManualTahaps() {
  const rows = Array.from(document.querySelectorAll('#cakra-cockpit-tahaps-tbody tr'));
  const existing = CakraState.activePaketCtx.tahaps || [];
  const tahaps = rows.map((tr, idx) => {
    const base = existing[idx] || {};
    return {
      ...base,
      no_tahap: Number(tr.getAttribute('data-tahap')),
      nomor_dokumen: tr.querySelector('.tahap-nomor')?.value || '',
      tanggal_dokumen: tr.querySelector('.tahap-tgl')?.value || '',
      status_tahap: tr.querySelector('.tahap-status')?.value || 'Selesai',
      catatan_tahap: tr.querySelector('.tahap-catatan')?.value || ''
    };
  });

  await cakraApiPost(`/api/cakra/paket/${CakraState.activePaketId}/tahaps`, { tahaps });
  await openPaketInCockpit(CakraState.activePaketId, CakraState.activeStageNo, false);
  cakraNotify('Tabel jadwal 18 tahap berhasil disimpan.', 'success');
}

/**
 * SUB-TAB 4: KALKULATOR PAJAK, RETENSI 5% KONSTRUKSI (PHO/FHO), DENDA 1 PERMIL, & SKOR KINERJA PPK
 */
function buildCockpitPajakKinerjaTabHtml() {
  const { paket, keuangan } = CakraState.activePaketCtx;
  const isKonstruksi = String(paket.jenis_pengadaan || '').includes('Konstruksi');

  return `
    <div class="cakra-form-grid">
      <div class="cakra-card">
        <div class="cakra-card-header">
          <div class="cakra-card-title">🧮 Kalkulator Pajak, Retensi 5% Konstruksi (PHO/FHO), & Denda Keterlambatan (1‰)</div>
        </div>
        <div class="cakra-card-body">
          <table class="cakra-data-table">
            <tbody>
              <tr>
                <td><strong>1. Nilai Bruto Kontrak (100% Fisik)</strong></td>
                <td class="cakra-mono" style="text-align:right; font-weight:800;">${cakraFmtRp(keuangan.nilaiKontrak)}</td>
              </tr>
              <tr>
                <td><strong>2. Dasar Pengenaan Pajak (DPP)</strong></td>
                <td class="cakra-mono" style="text-align:right;">${cakraFmtRp(keuangan.dpp)}</td>
              </tr>
              <tr>
                <td><strong>3. Potongan PPN (${paket.tarif_ppn}%)</strong></td>
                <td class="cakra-mono" style="text-align:right; color:#b91c1c;">- ${cakraFmtRp(keuangan.ppn)}</td>
              </tr>
              <tr>
                <td><strong>4. Potongan ${cakraEsc(paket.jenis_pph)}</strong></td>
                <td class="cakra-mono" style="text-align:right; color:#b91c1c;">- ${cakraFmtRp(keuangan.pph)}</td>
              </tr>
              <tr>
                <td>
                  <strong>5. Denda Keterlambatan (1‰ × Hari × DPP)</strong>
                  <div style="font-size:10.5px; color:#64748b;">Denda per hari: ${cakraFmtRp(keuangan.dendaPerHari)} × ${keuangan.hariTerlambat} hari</div>
                </td>
                <td class="cakra-mono" style="text-align:right; color:#b91c1c;">- ${cakraFmtRp(keuangan.totalDenda)}</td>
              </tr>
              <tr style="background:#fef3c7;">
                <td>
                  <strong>6. Retensi Pemeliharaan 5% (${isKonstruksi ? 'Wajib Konstruksi PHO ke FHO' : 'Opsional'})</strong>
                  <div style="font-size:10.5px; color:#92400e;">Jika ditahan Retensi 5% (tanpa Jaminan Pemeliharaan), cair saat PHO (95%): <strong>${cakraFmtRp(keuangan.nilaiBersihDenganRetensi5)}</strong></div>
                </td>
                <td class="cakra-mono" style="text-align:right; font-weight:700; color:#92400e;">${cakraFmtRp(keuangan.nilaiRetensi5Persen)}</td>
              </tr>
              <tr style="background:#ecfdf5;">
                <td><strong>7. NILAI BERSIH DITERIMA PENYEDIA 100% (NETTO SPBy / SP2D)</strong></td>
                <td class="cakra-mono" style="text-align:right; font-size:14px; font-weight:800; color:#047857;">${cakraFmtRp(keuangan.nilaiBersihDiterimaPenyedia)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="cakra-card">
        <div class="cakra-card-header">
          <div class="cakra-card-title">⭐ Penilaian Kinerja Penyedia oleh PPK (Tahap 18 — Bab V Perlem 3/2026)</div>
        </div>
        <div class="cakra-card-body">
          <div class="cakra-form-grid">
            <div class="cakra-form-group">
              <label>1. Kualitas & Kuantitas (Bobot 30%)</label>
              <select class="cakra-form-control" id="ck_skor_kualitas" onchange="saveSkorKinerjaPpk()">
                ${[3, 2, 1, 0].map(v => `<option value="${v}" ${Number(paket.skor_kualitas) === v ? 'selected' : ''}>Skor ${v} (${v === 3 ? 'Sangat Baik' : v === 2 ? 'Baik' : v === 1 ? 'Cukup' : 'Buruk'})</option>`).join('')}
              </select>
            </div>
            <div class="cakra-form-group">
              <label>2. Biaya / Efisiensi (Bobot 20%)</label>
              <select class="cakra-form-control" id="ck_skor_biaya" onchange="saveSkorKinerjaPpk()">
                ${[3, 2, 1, 0].map(v => `<option value="${v}" ${Number(paket.skor_biaya) === v ? 'selected' : ''}>Skor ${v} (${v === 3 ? 'Sangat Baik' : v === 2 ? 'Baik' : v === 1 ? 'Cukup' : 'Buruk'})</option>`).join('')}
              </select>
            </div>
            <div class="cakra-form-group">
              <label>3. Ketepatan Waktu (Bobot 30%)</label>
              <select class="cakra-form-control" id="ck_skor_waktu" onchange="saveSkorKinerjaPpk()">
                ${[3, 2, 1, 0].map(v => `<option value="${v}" ${Number(paket.skor_waktu) === v ? 'selected' : ''}>Skor ${v} (${v === 3 ? 'Sangat Baik' : v === 2 ? 'Baik' : v === 1 ? 'Cukup' : 'Buruk'})</option>`).join('')}
              </select>
            </div>
            <div class="cakra-form-group">
              <label>4. Layanan & Responsivitas (Bobot 20%)</label>
              <select class="cakra-form-control" id="ck_skor_layanan" onchange="saveSkorKinerjaPpk()">
                ${[3, 2, 1, 0].map(v => `<option value="${v}" ${Number(paket.skor_layanan) === v ? 'selected' : ''}>Skor ${v} (${v === 3 ? 'Sangat Baik' : v === 2 ? 'Baik' : v === 1 ? 'Cukup' : 'Buruk'})</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="cakra-form-group" style="margin-top:8px;">
            <label>Simulasi Keterlambatan Pelaksanaan (Hari Kalender)</label>
            <input type="number" min="0" class="cakra-form-control cakra-mono" id="ck_hari_terlambat" value="${Number(paket.hari_terlambat || 0)}" onchange="saveSkorKinerjaPpk()" />
          </div>

          <div class="cakra-alert-regulasi" style="margin-top:12px; margin-bottom:0;">
            <div style="font-size:13px; font-weight:800;">
              🏆 SKOR KINERJA AKHIR: <span class="cakra-mono">${Number(keuangan.skorAkhir).toFixed(2)}</span> / 3.00 — PREDIKAT: <span style="color:#047857;">${cakraEsc(keuangan.predikatKinerja.toUpperCase())}</span>
            </div>
            <div style="font-size:11px; margin-top:4px;">
              ${keuangan.skorAkhir >= 2.5
                ? '✅ Memenuhi syarat <strong>Repeat Order</strong> (maksimal 2 kali dalam 3 tahun anggaran sesuai Pasal 38 & 41 Perpres 46/2025).'
                : '⚠️ Skor di bawah 2.50 (Sangat Baik) tidak memenuhi syarat penunjukan langsung Repeat Order.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

async function saveSkorKinerjaPpk() {
  const { paket } = CakraState.activePaketCtx;
  const payload = {
    ...paket,
    skor_kualitas: Number(document.getElementById('ck_skor_kualitas')?.value ?? 3),
    skor_biaya: Number(document.getElementById('ck_skor_biaya')?.value ?? 3),
    skor_waktu: Number(document.getElementById('ck_skor_waktu')?.value ?? 3),
    skor_layanan: Number(document.getElementById('ck_skor_layanan')?.value ?? 3),
    hari_terlambat: Number(document.getElementById('ck_hari_terlambat')?.value ?? 0)
  };
  await cakraApiPost('/api/cakra/paket', payload);
  await openPaketInCockpit(paket.id, CakraState.activeStageNo, false);
}

/**
 * STICKY ACTION & PRINT BAR KOKPIT
 */
function toggleCockpitMoreActions(event) {
  if (event) event.stopPropagation();
  const menu = document.getElementById('cockpit-more-actions-menu');
  if (!menu) return;
  const isHidden = menu.style.display === 'none' || !menu.style.display;
  menu.style.display = isHidden ? 'block' : 'none';
}
window.toggleCockpitMoreActions = toggleCockpitMoreActions;

function closeCockpitMoreActions() {
  const menu = document.getElementById('cockpit-more-actions-menu');
  if (menu) menu.style.display = 'none';
}
window.closeCockpitMoreActions = closeCockpitMoreActions;

if (typeof window !== 'undefined') {
  window.addEventListener('click', function(e) {
    const menu = document.getElementById('cockpit-more-actions-menu');
    const btn = document.getElementById('btn-cockpit-more-actions');
    if (menu && menu.style.display !== 'none') {
      if (!menu.contains(e.target) && (!btn || !btn.contains(e.target))) {
        menu.style.display = 'none';
      }
    }
  });
}

function renderCockpitRightDock() {
  const dock = document.getElementById('cakra-cockpit-dock-right');
  if (!dock || !CakraState.activePaketCtx) return;

  const { paket, tahaps } = CakraState.activePaketCtx;
  const stageNo = Number(CakraState.activeStageNo || 1);
  const def = CakraState.definisi18Tahap.find(d => Number(d.no) === stageNo) || CakraState.definisi18Tahap[0] || { no: stageNo, nama: `Tahap ${stageNo}` };
  const tRow = (tahaps || []).find(t => Number(t.no_tahap) === stageNo) || {};
  const rawStatus = tRow.status_tahap || 'Draft';
  const driveLink = String(tRow.link_drive_dokumen || '').trim();

  let statusBadge = `<span class="cakra-badge cakra-badge-amber" style="font-size:11px;">📝 Draft</span>`;
  if (rawStatus === 'Bypass') {
    statusBadge = `<span class="cakra-badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1; font-size:11px;">⏭️ Bypass</span>`;
  } else if ((rawStatus === 'Selesai' || rawStatus === 'Final') && driveLink.length > 5) {
    statusBadge = `<span class="cakra-badge cakra-badge-green" style="font-size:11px;">✅ Selesai</span>`;
  } else if (rawStatus === 'Terkunci' || (!driveLink && rawStatus !== 'Draft' && rawStatus !== 'Aktif')) {
    statusBadge = `<span class="cakra-badge" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; font-size:11px;">🔓 Siap Diisi</span>`;
  }

  dock.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
      <span class="cakra-badge cakra-badge-blue" style="font-size:12px; font-weight:800; padding:5px 12px; letter-spacing:0.5px;">
        📌 TAHAP ${stageNo} / 18
      </span>
      <div>
        <div style="font-weight:800; font-size:13.5px; color:#0f172a; display:flex; align-items:center; gap:8px;">
          <span>${cakraEsc(def.nama)}</span>
          ${statusBadge}
        </div>
        <div style="font-size:11.5px; color:#475569; margin-top:2px;">
          Nomor Dok: <strong class="cakra-mono" style="color:#0f172a;">${cakraEsc(tRow.nomor_dokumen || '-')}</strong> &nbsp;|&nbsp;
          Tanggal: <strong class="cakra-mono" style="color:#0f172a;">${cakraEsc(tRow.tanggal_dokumen || '-')}</strong>
        </div>
      </div>
    </div>

    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
      <!-- Action 1: Ubah Data Tahap N (Pop Up) - Pintu Masuk Pengisian / Perubahan Data -->
      <button type="button" class="cakra-btn cakra-btn-warning cakra-btn-sm" onclick="openModalTahapUniversal(${stageNo})" style="font-weight:800; background:#f59e0b; color:#fff; border:none; padding:6px 14px; border-radius:6px; box-shadow:0 2px 4px rgba(245,158,11,0.25); display:inline-flex; align-items:center; gap:6px; cursor:pointer;" title="Buka Formulir Pengisian & Perubahan Data Tahap ${stageNo}">
        <span>✏️ Ubah Data Tahap ${stageNo} (Pop Up)</span>
      </button>

      <!-- Action 2: Word Tahap N (.docx) - Selalu Ada di Seluruh 18 Tahap -->
      <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="directDownloadPengadaanDoc('docx', ${paket.id}, ${stageNo})" style="font-weight:700; background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:6px; display:inline-flex; align-items:center; gap:6px; cursor:pointer; box-shadow:0 1px 2px rgba(37,99,235,0.2);" title="Unduh Dokumen Word Resmi Tahap ${stageNo}">
        <span>📄 Word Tahap ${stageNo} (.docx)</span>
      </button>

      <!-- Action 3: Excel Tahap N (.xlsx) - HANYA Muncul di 8 Tahap: 3, 5, 6, 9, 13, 15, 17, 18 -->
      ${[3, 5, 6, 9, 13, 15, 17, 18].includes(Number(stageNo)) ? `
        <button type="button" class="cakra-btn cakra-btn-success cakra-btn-sm" onclick="directDownloadPengadaanDoc('xlsx', ${paket.id}, ${stageNo})" style="font-weight:700; background:#10b981; color:#fff; border:none; padding:6px 12px; border-radius:6px; display:inline-flex; align-items:center; gap:6px; cursor:pointer; box-shadow:0 1px 2px rgba(16,185,129,0.2);" title="Unduh Kertas Kerja Excel Resmi Tahap ${stageNo}">
          <span>📊 Excel Tahap ${stageNo} (.xlsx)</span>
        </button>
      ` : ''}

      <!-- Dropdown Menu: Berkas Lainnya & Bundel Master -->
      <div class="cakra-dropdown-wrap" style="position:relative; display:inline-block;">
        <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" id="btn-cockpit-more-actions" onclick="toggleCockpitMoreActions(event)" style="font-weight:600; display:flex; align-items:center; gap:6px; background:#ffffff;" title="Pilihan Dokumen Tambahan & Unduhan Lengkap">
          <span>📦 Berkas Lainnya</span>
          <span style="font-size:9px;">▼</span>
        </button>
        <div class="cakra-dropdown-menu" id="cockpit-more-actions-menu" style="display:none; position:absolute; right:0; top:calc(100% + 5px); z-index:100; min-width:280px; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 25px -5px rgba(15,23,42,0.15), 0 8px 10px -6px rgba(15,23,42,0.1); padding:6px 0;">
          <div style="padding:6px 14px; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
            Dokumen Utama Terpilih
          </div>
          <button type="button" class="cakra-dropdown-item-btn" onclick="closeCockpitMoreActions(); queuePengadaanDownload('docx', ${paket.id}, '13')" style="width:100%; text-align:left; border:none; background:transparent; padding:9px 14px; font-size:12px; color:#1e293b; cursor:pointer; display:flex; align-items:center; gap:8px;">
            <span style="font-size:14px;">📝</span>
            <div>
              <div style="font-weight:700;">Naskah ${cakraEsc(paket.bentuk_kontrak || 'Kontrak')} (Tahap 13)</div>
              <div style="font-size:10.5px; color:#64748b;">Kontrak / SPK / Surat Pesanan Final</div>
            </div>
          </button>
          <button type="button" class="cakra-dropdown-item-btn" onclick="closeCockpitMoreActions(); queuePengadaanDownload('docx', ${paket.id}, '16')" style="width:100%; text-align:left; border:none; background:transparent; padding:9px 14px; font-size:12px; color:#1e293b; cursor:pointer; display:flex; align-items:center; gap:8px;">
            <span style="font-size:14px;">🤝</span>
            <div>
              <div style="font-weight:700;">BAST & BAPHP (Tahap 16)</div>
              <div style="font-size:10.5px; color:#64748b;">Berita Acara Serah Terima Pekerjaan</div>
            </div>
          </button>
          <div style="height:1px; background:#e2e8f0; margin:4px 0;"></div>
          <div style="padding:6px 14px; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; background:#f8fafc; border-bottom:1px solid #e2e8f0;">
            Master Bundel 18 Tahap
          </div>
          <button type="button" class="cakra-dropdown-item-btn" onclick="closeCockpitMoreActions(); queuePengadaanDownload('docx', ${paket.id}, 'ALL')" style="width:100%; text-align:left; border:none; background:transparent; padding:9px 14px; font-size:12px; color:#1e293b; cursor:pointer; display:flex; align-items:center; gap:8px;">
            <span style="font-size:14px;">📘</span>
            <div>
              <div style="font-weight:700; color:#1d4ed8;">Word Master 18 Tahap</div>
              <div style="font-size:10.5px; color:#64748b;">Kompilasi seluruh tahap dalam 1 file .docx</div>
            </div>
          </button>
          <button type="button" class="cakra-dropdown-item-btn" onclick="closeCockpitMoreActions(); queuePengadaanDownload('zip', ${paket.id}, 'ALL')" style="width:100%; text-align:left; border:none; background:transparent; padding:9px 14px; font-size:12px; color:#1e293b; cursor:pointer; display:flex; align-items:center; gap:8px;">
            <span style="font-size:14px;">📦</span>
            <div>
              <div style="font-weight:700; color:#b45309;">Unduh Arsip Lengkap (.ZIP)</div>
              <div style="font-size:10.5px; color:#64748b;">Bundel 18 berkas dokumen terpisah siap cetak</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * BUAT PAKET PENGADAAN BARU
 */
async function createNewPaketPrompt(initialData = null) {
  openSmartWizardModal(initialData);
  return;
  let nama, jenis, pagu, metode, bentuk;
  if (initialData) {
    nama = initialData.nama || initialData.nama_paket || 'Paket Pengadaan ' + (initialData.jenis_pengadaan || 'Barang');
    jenis = initialData.jenis_pengadaan || 'Barang';
    pagu = Number(initialData.pagu || initialData.nilai_pagu || 50000000);
    metode = initialData.metode_pemilihan;
    bentuk = initialData.bentuk_kontrak;
  }

  const isKonstruksi = jenis.includes('Konstruksi');
  const nextNum = CakraState.pakets.length + 1;
  const kodeInternal = `CAKRA-2026-${String(nextNum).padStart(3, '0')}`;

  const payload = {
    kode_paket_internal: kodeInternal,
    kode_rup: `RUP-2026-657811-0${nextNum}`,
    nama_paket: nama,
    uraian_pekerjaan: nama,
    jenis_pengadaan: jenis,
    cara_pengadaan: jenis === 'Swakelola' ? 'Swakelola Tipe I' : 'Penyedia',
    metode_pemilihan: metode || (isKonstruksi && pagu <= 400000000 ? 'Pengadaan Langsung' : 'E-Purchasing'),
    bentuk_kontrak: bentuk || (isKonstruksi && pagu <= 400000000 ? 'SPK' : 'Surat Pesanan'),
    jenis_kontrak: isKonstruksi ? 'Gabungan Lumsum dan Harga Satuan' : 'Lumsum',
    nilai_pagu: pagu,
    nilai_hps: Math.round(pagu * 0.98),
    nilai_penawaran_awal: Math.round(pagu * 0.97),
    nilai_kontrak: Math.round(pagu * 0.96),
    jenis_pph: isKonstruksi ? 'PPh Final Konstruksi Kecil SBU K1/K2/K3 (1.75%)' : 'PPh 22 Barang (1.5%)',
    tarif_pph: isKonstruksi ? 1.75 : 1.5,
    penyedia_id: isKonstruksi ? 6 : 1
  };

  const res = await cakraApiPost('/api/cakra/paket', payload);
  await cakraApiPost(`/api/cakra/paket/${res.id}/items`, {
    items: [
      {
        urutan: 1,
        uraian_item: nama,
        spesifikasi_teknis: isKonstruksi ? 'Sesuai DED, RKS, AHSP Kabupaten Ngawi & Rancangan Konseptual SMKK' : 'Sesuai KAK & Spesifikasi Teknis PPK (Prioritas PDN/TKDN)',
        satuan: 'Paket',
        volume: 1,
        persen_tkdn: 50,
        harga_survei_1: Math.round(pagu * 0.98),
        harga_survei_2: pagu,
        harga_satuan_hps: Math.round(pagu * 0.98),
        jumlah_hps: Math.round(pagu * 0.98),
        harga_satuan_kontrak: Math.round(pagu * 0.96),
        jumlah_kontrak: Math.round(pagu * 0.96),
        jenis_pencatatan_sakti: isKonstruksi ? 'Aset Tetap (BMN)' : 'Persediaan'
      }
    ]
  });

  await initCakraApp();
  await openPaketInCockpit(res.id, 6, true);
}

/**
 * VIEW 3: MASTER PENYEDIA / REKANAN (DATABASE TERPADU PENGADAAN & PEMBAYARAN)
 */
function renderMasterView() {
  const tbPenyedia = document.getElementById('cakra-table-master-penyedia');
  if (tbPenyedia) {
    tbPenyedia.innerHTML = CakraState.penyedias.map((v, idx) => {
      const rawLink = String(v.link_dokumen || '').trim();
      const hasLink = rawLink.length > 0 && rawLink !== '-';
      const safeHref = hasLink ? (/^https?:\/\//i.test(rawLink) ? rawLink : `https://${rawLink}`) : '';

      return `
      <tr>
        <td style="text-align:center; font-weight:700; color:#64748b;">${idx + 1}</td>
        <td>
          <div style="font-weight:800; color:#0f172a; font-size:13px;">${cakraEsc(v.nama_perusahaan)}</div>
          <div style="margin-top:3px; display:flex; gap:5px; flex-wrap:wrap; align-items:center;">
            <span class="cakra-badge cakra-badge-blue">${cakraEsc(v.bentuk_usaha || 'CV')} • ${cakraEsc(v.kualifikasi_usaha)}</span>
            <span style="font-size:10.5px; color:#64748b;">NIB: ${cakraEsc(v.nib || '-')}</span>
          </div>
          <div style="font-size:10.5px; color:#64748b; margin-top:2px;">${cakraEsc(v.kbli)}</div>
        </td>
        <td>
          <div style="font-weight:700; color:#1e3a8a;">${cakraEsc(v.nama_direktur)}</div>
          <div style="font-size:11px; color:#475569;">${cakraEsc(v.jabatan_penandatangan)}</div>
          <div style="font-size:10.5px; color:#64748b;">${cakraEsc(v.alamat || v.kota || 'Kabupaten Ngawi')}</div>
        </td>
        <td>
          <div class="cakra-mono" style="font-size:11.5px; font-weight:700; color:#0f172a;">NPWP: ${cakraEsc(v.npwp)}</div>
          <div style="font-size:11px; color:#0369a1; font-weight:600; margin-top:2px;">🏦 ${cakraEsc(v.nama_bank)}: <span class="cakra-mono">${cakraEsc(v.no_rekening)}</span></div>
          <div style="font-size:10.5px; color:#64748b;">a.n. ${cakraEsc(v.atas_nama_rekening || v.nama_perusahaan)} • ${Number(v.status_pkp ?? 1) === 1 ? 'PKP (Wajib PPN)' : 'Non-PKP'}</div>
        </td>
        <td>
          <div style="font-weight:700; color:#0f172a;">${cakraEsc(v.bo_nama_pemilik_manfaat)}</div>
          <div style="font-size:10.5px; color:#047857; font-weight:600;">${cakraEsc(v.bo_hubungan)}</div>
        </td>
        <td>
          <span class="cakra-badge cakra-badge-green">${Number(v.skor_kinerja_terakhir).toFixed(2)} — ${cakraEsc(v.kategori_kinerja)}</span>
        </td>
        <td style="vertical-align:middle;">
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; gap:5px; align-items:center;">
              <input
                type="url"
                id="penyedia-link-input-${Number(v.id)}"
                class="input-text"
                value="${cakraEsc(rawLink)}"
                placeholder="Tempel link Google Drive..."
                oninput="onPenyediaLinkInputChange(${Number(v.id)}, this.value)"
                onchange="saveQuickPenyediaLink(${Number(v.id)}, this.value)"
                style="font-size:11.5px; padding:5px 8px; height:30px; flex:1; min-width:155px;"
              />
              <button
                type="button"
                class="cakra-btn cakra-btn-outline cakra-btn-xs"
                onclick="saveQuickPenyediaLink(${Number(v.id)}, document.getElementById('penyedia-link-input-${Number(v.id)}').value)"
                title="Simpan Link Google Drive"
                style="height:30px; padding:0 8px;"
              >💾</button>
            </div>
            <div>
              <button
                type="button"
                id="penyedia-open-doc-btn-${Number(v.id)}"
                class="cakra-btn ${hasLink ? 'cakra-btn-primary' : 'cakra-btn-outline'} cakra-btn-xs"
                ${hasLink ? '' : 'disabled'}
                onclick="openPenyediaDocLink(${Number(v.id)})"
                style="width:100%; justify-content:center; font-weight:700; ${hasLink ? 'cursor:pointer;' : 'opacity:0.48; cursor:not-allowed; background:#f1f5f9; color:#94a3b8; border-color:#cbd5e1;'}"
              >
                ${hasLink ? '📂 Buka Dokumen' : '🔒 Buka Dokumen (Link Kosong)'}
              </button>
            </div>
          </div>
        </td>
        <td style="text-align:center; vertical-align:middle;">
          <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-xs" onclick="openEditCakraPenyediaModal(${Number(v.id)})" title="Edit Penyedia">✏️ Edit</button>
        </td>
      </tr>
      `;
    }).join('');
  }
}

function onPenyediaLinkInputChange(id, val) {
  const btn = document.getElementById(`penyedia-open-doc-btn-${Number(id)}`);
  if (!btn) return;
  const clean = String(val || '').trim();
  const hasLink = clean.length > 0 && clean !== '-';
  btn.disabled = !hasLink;
  if (hasLink) {
    btn.className = 'cakra-btn cakra-btn-primary cakra-btn-xs';
    btn.style.cssText = 'width:100%; justify-content:center; font-weight:700; cursor:pointer;';
    btn.textContent = '📂 Buka Dokumen';
  } else {
    btn.className = 'cakra-btn cakra-btn-outline cakra-btn-xs';
    btn.style.cssText = 'width:100%; justify-content:center; font-weight:700; opacity:0.48; cursor:not-allowed; background:#f1f5f9; color:#94a3b8; border-color:#cbd5e1;';
    btn.textContent = '🔒 Buka Dokumen (Link Kosong)';
  }
}

function openPenyediaDocLink(id) {
  const input = document.getElementById(`penyedia-link-input-${Number(id)}`);
  const v = CakraState.penyedias.find(x => Number(x.id) === Number(id));
  const raw = String(input ? input.value : (v?.link_dokumen || '')).trim();
  if (!raw || raw === '-') return;
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

async function saveQuickPenyediaLink(id, rawVal) {
  const v = CakraState.penyedias.find(x => Number(x.id) === Number(id));
  if (!v) return;
  const link_dokumen = String(rawVal || '').trim();
  if (String(v.link_dokumen || '').trim() === link_dokumen) {
    onPenyediaLinkInputChange(id, link_dokumen);
    return;
  }
  try {
    await cakraApiPost('/api/cakra/penyedia', {
      ...v,
      id: Number(v.id),
      link_dokumen
    });
    v.link_dokumen = link_dokumen;
    onPenyediaLinkInputChange(id, link_dokumen);
    cakraNotify(
      link_dokumen
        ? `Link dokumen "${v.nama_perusahaan}" tersimpan & tombol Buka Dokumen aktif.`
        : `Link dokumen "${v.nama_perusahaan}" dikosongkan.`,
      'success'
    );
  } catch (err) {
    cakraNotify('Gagal menyimpan link dokumen: ' + err.message, 'error');
  }
}

function openEditCakraPejabatModal(id = null) {
  const modal = document.getElementById('modal-cakra-pejabat');
  if (!modal) return;
  const p = id ? CakraState.pejabats.find(x => Number(x.id) === Number(id)) : null;

  const titleEl = document.getElementById('modal-cakra-pejabat-title');
  if (titleEl) {
    titleEl.textContent = p ? `✏️ Edit Pejabat (${p.peran})` : '➕ Tambah Pejabat Pengadaan / Pengelola Keuangan';
  }

  document.getElementById('cakra-pejabat-id').value = p ? p.id : '';
  document.getElementById('cakra-pejabat-peran').value = p ? p.peran : 'PPK';
  document.getElementById('cakra-pejabat-tipologi').value = p ? (p.tipologi_ppk || '-') : 'Tipe B';
  document.getElementById('cakra-pejabat-nama').value = p ? (p.nama_lengkap || '') : '';
  document.getElementById('cakra-pejabat-nip').value = p ? (p.nip || '-') : '-';
  document.getElementById('cakra-pejabat-pangkat').value = p ? (p.pangkat_gol || '-') : '-';
  document.getElementById('cakra-pejabat-jabatan').value = p ? (p.jabatan_struktural || '') : '';
  document.getElementById('cakra-pejabat-nosk').value = p ? (p.no_sk || '') : 'SK-02/KPA/KPU-NGW/I/2026';
  document.getElementById('cakra-pejabat-tglsk').value = p && p.tgl_sk ? p.tgl_sk : '2026-01-02';
  document.getElementById('cakra-pejabat-sertifikat').value = p ? (p.no_sertifikat_pbj || '-') : '-';

  modal.style.display = 'flex';
}

function closeCakraPejabatModal() {
  const modal = document.getElementById('modal-cakra-pejabat');
  if (modal) modal.style.display = 'none';
}

async function saveCakraPejabatModal() {
  const idVal = document.getElementById('cakra-pejabat-id').value;
  const peran = document.getElementById('cakra-pejabat-peran').value;
  const tipologi_ppk = document.getElementById('cakra-pejabat-tipologi').value;
  const nama_lengkap = (document.getElementById('cakra-pejabat-nama').value || '').trim();
  const nip = (document.getElementById('cakra-pejabat-nip').value || '-').trim();
  const pangkat_gol = (document.getElementById('cakra-pejabat-pangkat').value || '-').trim();
  const jabatan_struktural = (document.getElementById('cakra-pejabat-jabatan').value || '').trim();
  const no_sk = (document.getElementById('cakra-pejabat-nosk').value || '-').trim();
  const tgl_sk = document.getElementById('cakra-pejabat-tglsk').value || '2026-01-02';
  const no_sertifikat_pbj = (document.getElementById('cakra-pejabat-sertifikat').value || '-').trim();

  if (!nama_lengkap) {
    cakraNotify('Nama Lengkap Pejabat wajib diisi.', 'error');
    return;
  }

  try {
    await cakraApiPost('/api/cakra/pejabat', {
      id: idVal ? Number(idVal) : undefined,
      peran,
      nama_lengkap,
      nip,
      pangkat_gol,
      jabatan_struktural,
      no_sk,
      tgl_sk,
      no_sertifikat_pbj,
      tipologi_ppk,
      is_active: 1
    });

    closeCakraPejabatModal();
    CakraState.initialized = false;
    await initCakraApp();
    if (CakraState.activePaketId) {
      await loadPaketIntoCockpit(CakraState.activePaketId);
    }
    if (typeof window.loadPenandatanganView === 'function') {
      try { await window.loadPenandatanganView(); } catch (e) {}
    }
    cakraNotify(`Data pejabat ${peran} ("${nama_lengkap}") berhasil disimpan dan disinkronkan.`, 'success');
  } catch (err) {
    cakraNotify('Gagal menyimpan pejabat: ' + err.message, 'error');
  }
}

function openAddPenyediaModal() {
  openEditCakraPenyediaModal(null);
}

function openEditCakraPenyediaModal(id = null) {
  const modal = document.getElementById('modal-cakra-penyedia');
  if (!modal) return;
  const v = id ? CakraState.penyedias.find(x => Number(x.id) === Number(id)) : null;

  const titleEl = document.getElementById('modal-cakra-penyedia-title');
  if (titleEl) {
    titleEl.textContent = v ? `✏️ Edit Penyedia: ${v.nama_perusahaan}` : '➕ Tambah Penyedia / Vendor Baru';
  }

  document.getElementById('cakra-penyedia-id').value = v ? v.id : '';
  document.getElementById('cakra-penyedia-nama').value = v ? (v.nama_perusahaan || '') : '';
  document.getElementById('cakra-penyedia-bentuk').value = v ? (v.bentuk_usaha || 'CV') : 'CV';
  document.getElementById('cakra-penyedia-kualifikasi').value = v ? (v.kualifikasi_usaha || 'Usaha Kecil') : 'Usaha Kecil';
  document.getElementById('cakra-penyedia-npwp').value = v ? (v.npwp || '') : '';
  document.getElementById('cakra-penyedia-direktur').value = v ? (v.nama_direktur || '') : '';
  document.getElementById('cakra-penyedia-jabatan').value = v ? (v.jabatan_penandatangan || 'Direktur') : 'Direktur';
  document.getElementById('cakra-penyedia-bank').value = v ? (v.nama_bank || 'Bank Jatim Cabang Ngawi') : 'Bank Jatim Cabang Ngawi';
  document.getElementById('cakra-penyedia-rekening').value = v ? (v.no_rekening || '') : '';
  document.getElementById('cakra-penyedia-bo-nama').value = v ? (v.bo_nama_pemilik_manfaat || v.nama_direktur || '') : '';
  document.getElementById('cakra-penyedia-bo-hubungan').value = v ? (v.bo_hubungan || 'Pemilik Manfaat Langsung') : 'Pemilik Manfaat Langsung';
  document.getElementById('cakra-penyedia-skor').value = v ? Number(v.skor_kinerja_terakhir || 2.85) : 2.85;
  document.getElementById('cakra-penyedia-predikat').value = v ? (v.kategori_kinerja || 'Sangat Baik') : 'Sangat Baik';
  const linkDocEl = document.getElementById('cakra-penyedia-link-dokumen');
  if (linkDocEl) linkDocEl.value = v ? (v.link_dokumen || '') : '';

  modal.style.display = 'flex';
}

function closeCakraPenyediaModal() {
  const modal = document.getElementById('modal-cakra-penyedia');
  if (modal) modal.style.display = 'none';
}

async function saveCakraPenyediaModal() {
  const idVal = document.getElementById('cakra-penyedia-id').value;
  const nama_perusahaan = (document.getElementById('cakra-penyedia-nama').value || '').trim();
  const bentuk_usaha = document.getElementById('cakra-penyedia-bentuk').value;
  const kualifikasi_usaha = (document.getElementById('cakra-penyedia-kualifikasi').value || 'Usaha Kecil').trim();
  const npwp = (document.getElementById('cakra-penyedia-npwp').value || '-').trim();
  const nama_direktur = (document.getElementById('cakra-penyedia-direktur').value || '-').trim();
  const jabatan_penandatangan = (document.getElementById('cakra-penyedia-jabatan').value || 'Direktur').trim();
  const nama_bank = (document.getElementById('cakra-penyedia-bank').value || '-').trim();
  const no_rekening = (document.getElementById('cakra-penyedia-rekening').value || '-').trim();
  const bo_nama_pemilik_manfaat = (document.getElementById('cakra-penyedia-bo-nama').value || nama_direktur || '-').trim();
  const bo_hubungan = (document.getElementById('cakra-penyedia-bo-hubungan').value || 'Pemilik Manfaat Langsung').trim();
  const skor_kinerja_terakhir = Number(document.getElementById('cakra-penyedia-skor').value || 2.85);
  const kategori_kinerja = document.getElementById('cakra-penyedia-predikat').value || 'Sangat Baik';
  const link_dokumen = (document.getElementById('cakra-penyedia-link-dokumen')?.value || '').trim();

  if (!nama_perusahaan) {
    cakraNotify('Nama Perusahaan / Penyedia wajib diisi.', 'error');
    return;
  }

  try {
    const existing = idVal ? CakraState.penyedias.find(x => Number(x.id) === Number(idVal)) : null;
    await cakraApiPost('/api/cakra/penyedia', {
      ...(existing || {}),
      id: idVal ? Number(idVal) : undefined,
      nama_perusahaan,
      bentuk_usaha,
      kualifikasi_usaha,
      npwp,
      nama_direktur,
      jabatan_penandatangan,
      nama_bank,
      no_rekening,
      atas_nama_rekening: existing?.atas_nama_rekening || nama_perusahaan,
      bo_nama_pemilik_manfaat,
      bo_hubungan,
      skor_kinerja_terakhir,
      kategori_kinerja,
      link_dokumen
    });

    closeCakraPenyediaModal();
    CakraState.initialized = false;
    await initCakraApp();
    if (CakraState.activePaketId) {
      await loadPaketIntoCockpit(CakraState.activePaketId);
    }
    cakraNotify(`Penyedia "${nama_perusahaan}" berhasil disimpan.`, 'success');
  } catch (err) {
    cakraNotify('Gagal menyimpan penyedia: ' + err.message, 'error');
  }
}

/**
 * VIEW 4: PANDUAN PENGADAAN 18 TAHAP (TERMASUK KONSTRUKSI)
 */
function renderBukuPintar18Tahap() {
  const container = document.getElementById('cakra-panduan-18-tahap-container');
  if (!container) return;

  const cardsHtml = CakraState.definisi18Tahap.map(d => `
    <div class="cakra-doc-card" style="margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="cakra-badge cakra-badge-amber">Tahap ${d.no} (Fase ${d.fase})</span>
        <span class="cakra-mono" style="font-size:11px; color:#64748b;">Kode: ${cakraEsc(d.kode)}</span>
      </div>
      <div style="font-weight:800; font-size:13px; margin-top:4px; color:#0f172a;">${cakraEsc(d.nama)}</div>
      <div style="font-size:11.5px; color:#334155; margin-top:4px;">Output Otomatis: <span class="cakra-mono">${cakraEsc(d.outputUtama)}.docx & .xlsx</span></div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="cakra-alert-regulasi">
      <strong>📚 Cakupan Regulasi Lengkap 100% (Nonkonstruksi + Konstruksi + Swakelola + Dikecualikan):</strong><br/>
      1. <strong>Perpres Nomor 46 Tahun 2025</strong> (Perubahan Kedua Perpres 16/2018): Hierarki PDN/TKDN Pasal 66, Alokasi UMK 40% Pasal 65, Uang Muka Wajib UMK Pasal 29, Batas Pengadaan Langsung Pekerjaan Konstruksi naik menjadi <strong>s.d. Rp400 Juta</strong>.<br/>
      2. <strong>Perlem LKPP Nomor 2 Tahun 2026</strong>: Katalog Elektronik v6, Penilaian PPK Pasal 8, Bebas HPS (Referensi Harga) untuk E-Purchasing s.d. Rp100 Juta (Pasal 9), Jaminan Pelaksanaan 5% E-Purchasing &gt; Rp200 Juta.<br/>
      3. <strong>Perlem LKPP Nomor 3 Tahun 2026 (Lampiran I, II, & III)</strong>: Pedoman Barang, Jasa Lainnya, Konsultansi Nonkonstruksi, <strong>Pekerjaan Konstruksi (DED, AHSP, RKK/SMKK, SBU K1/K2/K3, SKP = KP-P, Kontrak Kritis SCM Periode I 10% / Periode II 5%, PHO, Masa Pemeliharaan 6/3 Bulan, Retensi 5%, FHO, PPh Final Konstruksi 1,75% / 2,65% / 3,5%)</strong>, Jasa Konsultansi Konstruksi, dan Konstruksi Terintegrasi Rancang Bangun.<br/>
      4. <strong>Keputusan Kepala LKPP Nomor 177 Tahun 2024</strong>: Tata Cara Penyelenggaraan Katalog Elektronik V6 &amp; Pelaksanaan E-Purchasing (Pencantuman Produk, Negosiasi Digital, Fitur Mini-Kompetisi E-Katalog, Pembebasan HPS untuk E-Purchasing s.d. Rp100 Juta, dan Penerbitan Surat Pesanan Digital).
    </div>
    <div class="cakra-form-grid-3">${cardsHtml}</div>
  `;
}

/**
 * VIEW 5: REKAP PENGADAAN BARANG/JASA (5 PERSPEKTIF EKSEKUTIF)
 */
function switchRekapPengadaanTab(tabName) {
  CakraState.activeRekapTab = tabName || 'STATUS_PBJ';
  const tabs = document.querySelectorAll('#rekap-pengadaan-tabs button[data-tab]');
  tabs.forEach(btn => {
    const isAct = btn.getAttribute('data-tab') === CakraState.activeRekapTab;
    btn.className = isAct ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary';
  });
  renderRekapPengadaanView();
}

function getFilteredRekapPakets() {
  const selectEl = document.getElementById('rekap-pengadaan-pic-select') || document.getElementById('rekap-pengadaan-filter-pic');
  const picFilter = String(selectEl?.value || 'SEMUA').toUpperCase().trim();
  const all = Array.isArray(CakraState.pakets) ? CakraState.pakets : [];
  if (picFilter === 'SEMUA' || picFilter === 'ALL' || !picFilter) return all;
  return all.filter(p => {
    const pic = String(p.pic_subbag || '').toUpperCase();
    return pic === picFilter || (picFilter === 'TEKNIS' && pic === 'TEKMAS') || (picFilter === 'HUKUM' && pic === 'HUKUM_SDM');
  });
}

function renderRekapPengadaanView() {
  const mainContent = document.getElementById('rekap-pengadaan-content');
  let kpiGrid = document.getElementById('rekap-pengadaan-kpi-grid');
  let container = document.getElementById('rekap-pengadaan-table-container');

  // Auto-inject wadah KPI & tabel jika belum ada di dalam card
  if (!kpiGrid || !container) {
    if (mainContent) {
      mainContent.innerHTML = `
        <div id="rekap-pengadaan-kpi-grid" class="cakra-dashboard-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-bottom: 20px;"></div>
        <div id="rekap-pengadaan-table-container"></div>
      `;
      kpiGrid = document.getElementById('rekap-pengadaan-kpi-grid');
      container = document.getElementById('rekap-pengadaan-table-container');
    }
  }

  if (!kpiGrid || !container) return;

  const pakets = getFilteredRekapPakets();
  const totalPaket = pakets.length;
  const berjalanPakets = pakets.filter(p => !isPaketSelesai(p));
  const selesaiPakets = pakets.filter(p => isPaketSelesai(p));

  // Helper fungsi progresif: HPS baru diakui jika tahap >= 6, Kontrak baru diakui jika tahap >= 13
  const getEffHps = p => (Number(p.tahap_aktif || 1) >= 6 ? (Number(p.nilai_hps) || 0) : 0);
  const getEffKontrak = p => (Number(p.tahap_aktif || 1) >= 13 ? (Number(p.nilai_kontrak) || 0) : 0);
  const isHpsReady = p => Number(p.tahap_aktif || 1) >= 6 && Number(p.nilai_hps) > 0;
  const isKontrakReady = p => Number(p.tahap_aktif || 1) >= 13 && Number(p.nilai_kontrak) > 0;

  const totalPagu = pakets.reduce((s, p) => s + (Number(p.nilai_pagu) || 0), 0);
  const paguBerjalan = berjalanPakets.reduce((s, p) => s + (Number(p.nilai_pagu) || 0), 0);
  const hpsBerjalan = berjalanPakets.reduce((s, p) => s + getEffHps(p), 0);

  const paguSelesai = selesaiPakets.reduce((s, p) => s + (Number(p.nilai_pagu) || 0), 0);
  const kontrakSelesai = selesaiPakets.reduce((s, p) => s + getEffKontrak(p), 0);
  const efisiensiSelesai = Math.max(0, paguSelesai - kontrakSelesai);
  const persenEfisiensiSelesai = paguSelesai > 0 && kontrakSelesai > 0 ? ((efisiensiSelesai / paguSelesai) * 100).toFixed(2) : '0.00';

  const totalHps = pakets.reduce((s, p) => s + getEffHps(p), 0);
  const totalKontrak = pakets.reduce((s, p) => s + getEffKontrak(p), 0);

  // Efisiensi hanya dihitung untuk paket yang telah berkontrak (Tahap >= 13)
  const berkontrakPakets = pakets.filter(p => isKontrakReady(p));
  const paguBerkontrak = berkontrakPakets.reduce((s, p) => s + (Number(p.nilai_pagu) || 0), 0);
  const totalEfisiensi = Math.max(0, paguBerkontrak - totalKontrak);
  const persenEfisiensi = paguBerkontrak > 0 ? ((totalEfisiensi / paguBerkontrak) * 100).toFixed(2) : '0.00';

  const umkPakets = pakets.filter(p => {
    const kual = String(p.kualifikasi_usaha || p.peruntukan_usaha || 'Kecil').toLowerCase();
    return kual.includes('kecil') || kual.includes('mikro') || kual.includes('koperasi') || Number(p.is_umk ?? 1) === 1;
  });
  const nilaiUmk = umkPakets.reduce((s, p) => s + (getEffKontrak(p) || Number(p.nilai_pagu) || 0), 0);
  const persenUmk = (totalKontrak || totalPagu) > 0
    ? Math.round((nilaiUmk / (totalKontrak || totalPagu)) * 100)
    : 100;

  const rataTkdn = totalPaket > 0
    ? Math.round(pakets.reduce((s, p) => s + (Number(p.komitmen_tkdn_persen) || 40), 0) / totalPaket)
    : 45;

  kpiGrid.innerHTML = `
    <div class="cakra-kpi-card">
      <div class="cakra-kpi-label">Total Portofolio Pengadaan</div>
      <div class="cakra-kpi-value">${totalPaket} Paket</div>
      <div class="cakra-kpi-sub">Total Pagu DIPA/RUP: <strong>${cakraFmtRp(totalPagu)}</strong></div>
    </div>
    <div class="cakra-kpi-card amber">
      <div class="cakra-kpi-label">⏳ Pengadaan Berjalan (WIP)</div>
      <div class="cakra-kpi-value">${berjalanPakets.length} Paket</div>
      <div class="cakra-kpi-sub">Pagu Berjalan: <strong style="color:#b45309;">${cakraFmtRp(paguBerjalan)}</strong> (Tahap 1-17)</div>
    </div>
    <div class="cakra-kpi-card green">
      <div class="cakra-kpi-label">✅ Pengadaan Selesai (Tuntas)</div>
      <div class="cakra-kpi-value">${selesaiPakets.length} Paket</div>
      <div class="cakra-kpi-sub">Kontrak: <strong style="color:#047857;">${cakraFmtRp(kontrakSelesai)}</strong> (18/18 Tahap Selesai)</div>
    </div>
    <div class="cakra-kpi-card blue">
      <div class="cakra-kpi-label">💰 Efisiensi &amp; Realisasi UMK</div>
      <div class="cakra-kpi-value">${cakraFmtRp(efisiensiSelesai)}</div>
      <div class="cakra-kpi-sub">Efisiensi: <strong>${persenEfisiensiSelesai}%</strong> | UMK: <strong>${persenUmk}%</strong> | TKDN: <strong>${rataTkdn}%</strong></div>
    </div>
  `;

  const tab = CakraState.activeRekapTab || 'STATUS_PBJ';

  if (tab === 'STATUS_PBJ') {
    const rowsBerjalanHtml = berjalanPakets.length ? berjalanPakets.map((p, idx) => {
      const pagu = Number(p.nilai_pagu) || 0;
      const tAktif = Number(p.tahap_aktif || 1);
      const def = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === tAktif) || {};
      const stageName = def.nama || ('Tahap ' + tAktif);
      const cDone = Number(p.count_selesai || 0);
      const cDraft = Number(p.count_draft || 0);
      const cBypass = Number(p.count_bypass || 0);
      const hpsValHtml = isHpsReady(p)
        ? `<span class="cakra-mono" style="color:#1d4ed8; font-weight:700;">${cakraFmtRp(p.nilai_hps)}</span>`
        : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Belum Disusun (Tahap 6)</span>`;

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>
            <div class="cakra-mono" style="font-weight:800; color:#991b1b;">${cakraEsc(p.kode_paket_internal)}</div>
            <div style="font-size:11px; color:#64748b;">RUP: ${cakraEsc(p.kode_rup || '-')}</div>
          </td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${cakraEsc(p.nama_paket)}</div>
            <div style="font-size:11px; color:#64748b;">MAK: <span class="cakra-mono">${cakraEsc(p.kode_akun_mak)}</span></div>
          </td>
          <td>
            <span class="cakra-badge cakra-badge-slate">${cakraEsc(p.pic_subbag)}</span>
          </td>
          <td>
            <span class="cakra-badge ${getBadgeClassByJenis(p.jenis_pengadaan)}">${cakraEsc(p.jenis_pengadaan)}</span>
            <div style="font-size:11px; font-weight:700; margin-top:2px;">${cakraEsc(p.metode_pemilihan)}</div>
          </td>
          <td class="cakra-mono" style="text-align:right; font-weight:700;">${cakraFmtRp(pagu)}</td>
          <td style="text-align:right;">${hpsValHtml}</td>
          <td style="text-align:center;">
            <span class="cakra-badge cakra-badge-blue" style="font-weight:800;">Tahap ${tAktif}</span>
            <div style="font-size:10.5px; color:#334155; font-weight:600; margin-top:2px;" title="${cakraEsc(stageName)}">${cakraEsc(stageName.length > 20 ? stageName.substring(0, 18) + '...' : stageName)}</div>
          </td>
          <td style="text-align:center;">
            <div style="font-size:11px; font-weight:700; color:#0f172a;">${cDone} Selesai, ${cDraft} Draf</div>
            ${cBypass > 0 ? `<div style="font-size:10px; color:#64748b;">(${cBypass} Bypass)</div>` : ''}
          </td>
          <td style="text-align:center;">
            <button type="button" class="btn btn-xs btn-primary" onclick="openPaketInCockpit(${p.id}, ${tAktif}, true)" style="background:#2563eb; color:#fff; font-weight:800; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;" title="Lanjutkan pengerjaan di Kokpit 18 Tahap">
              <span>🚀 Buka Kokpit</span>
            </button>
          </td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="10" style="text-align:center; padding:24px; color:#64748b;">Tidak ada pengadaan yang sedang berjalan. Semua paket telah tuntas atau mulai dari Kokpit Pengadaan Baru.</td></tr>';

    const rowsSelesaiHtml = selesaiPakets.length ? selesaiPakets.map((p, idx) => {
      const pagu = Number(p.nilai_pagu) || 0;
      const kontrak = Number(p.nilai_kontrak) || 0;
      const ef = Math.max(0, pagu - kontrak);
      const efPct = pagu > 0 ? ((ef / pagu) * 100).toFixed(1) : '0.0';
      const cDrive = Number(p.count_drive || 0);

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>
            <div class="cakra-mono" style="font-weight:800; color:#047857;">${cakraEsc(p.kode_paket_internal)}</div>
            <div style="font-size:11px; color:#64748b;">RUP: ${cakraEsc(p.kode_rup || '-')}</div>
          </td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${cakraEsc(p.nama_paket)}</div>
            <div style="font-size:11px; color:#64748b;">MAK: <span class="cakra-mono">${cakraEsc(p.kode_akun_mak)}</span></div>
          </td>
          <td>
            <div style="font-weight:700; color:#1e293b;">${cakraEsc(p.nama_penyedia || p.nama_perusahaan || '-')}</div>
            <div style="font-size:11px; color:#64748b;">Subbag: <strong>${cakraEsc(p.pic_subbag)}</strong></div>
          </td>
          <td class="cakra-mono" style="text-align:right;">${cakraFmtRp(pagu)}</td>
          <td class="cakra-mono" style="text-align:right; font-weight:800; color:#047857;">${cakraFmtRp(kontrak)}</td>
          <td class="cakra-mono" style="text-align:right; color:#b45309;">
            ${cakraFmtRp(ef)}
            <div style="font-size:10px; color:#64748b;">(${efPct}%)</div>
          </td>
          <td style="text-align:center;">
            <span class="cakra-badge cakra-badge-green" style="font-weight:800;">✅ 18/18 Selesai</span>
            <div style="font-size:10.5px; color:#047857; font-weight:700; margin-top:2px;">${cDrive}/18 Drive Terhubung</div>
          </td>
          <td style="text-align:center;">
            <div style="display:flex; gap:4px; justify-content:center;">
              <button type="button" class="btn btn-xs" onclick="openAuditPaketDetail(${p.id})" style="background:#0284c7; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;" title="Lihat Audit Kepatuhan &amp; Tautan Drive">
                <span>🛡️ Audit</span>
              </button>
              <button type="button" class="btn btn-xs" onclick="queuePengadaanDownload('zip', ${p.id}, 'ALL')" style="background:#059669; color:#fff; border:none; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;" title="Unduh Bundel Arsip Lengkap ZIP">
                <span>📦 ZIP</span>
              </button>
              <button type="button" class="btn btn-xs" onclick="openPaketInCockpit(${p.id}, 18, true)" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; cursor:pointer;" title="Tinjau Berkas di Kokpit">
                <span>👁️ Tinjau</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="9" style="text-align:center; padding:24px; color:#64748b;">Belum ada paket pengadaan yang selesai 100%. Selesaikan proses tahapan di Kokpit.</td></tr>';

    container.innerHTML = `
      <!-- SEKSI 1: PENGADAAN BERJALAN -->
      <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:18px; margin-bottom:24px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; border-bottom:1px solid #fef3c7; padding-bottom:10px;">
          <div>
            <h3 style="margin:0; font-size:15px; font-weight:800; color:#92400e; display:flex; align-items:center; gap:8px;">
              <span>⏳ REKAPITULASI PENGADAAN BERJALAN &amp; DRAF</span>
              <span class="badge badge-warning" style="font-size:12px; font-weight:800;">${berjalanPakets.length} Paket</span>
            </h3>
            <div style="font-size:12px; color:#78350f; margin-top:3px;">
              Paket yang sedang aktif dikerjakan pada alur 18 Tahap (Perencanaan, Persiapan, Pemilihan, atau Kontrak/BAST berjalan). Belum tuntas 18 tahap.
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:11px; color:#92400e; font-weight:700;">Total Pagu Pengadaan Berjalan:</div>
            <div class="cakra-mono" style="font-size:16px; font-weight:800; color:#b45309;">${cakraFmtRp(paguBerjalan)}</div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="cakra-table" style="background:#fff;">
            <thead>
              <tr style="background:#fef3c7; color:#92400e;">
                <th style="width:40px; text-align:center;">No</th>
                <th>Kode Paket &amp; RUP</th>
                <th>Nama Paket Pengadaan &amp; MAK</th>
                <th>Subbagian</th>
                <th>Jenis &amp; Metode</th>
                <th style="text-align:right;">Nilai Pagu</th>
                <th style="text-align:right;">HPS / Ref. Harga</th>
                <th style="text-align:center;">Tahap Aktif</th>
                <th style="text-align:center;">Status Dokumen</th>
                <th style="text-align:center; width:130px;">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody>
              ${rowsBerjalanHtml}
            </tbody>
            <tfoot>
              <tr style="background:#fef3c7; font-weight:800; color:#92400e;">
                <td colspan="5" style="text-align:right; padding:10px 12px;">TOTAL PENGADAAN BERJALAN (${berjalanPakets.length} PAKET):</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px;">${cakraFmtRp(paguBerjalan)}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#1d4ed8;">${hpsBerjalan > 0 ? cakraFmtRp(hpsBerjalan) : '<span style="color:#94a3b8; font-style:italic; font-size:11px;">Rp 0 (Tahap 6)</span>'}</td>
                <td colspan="3" style="text-align:center; padding:10px 12px; font-size:11.5px;">Semua paket siap dilanjutkan ke tahap berikutnya</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- SEKSI 2: PENGADAAN SELESAI -->
      <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:18px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:14px; border-bottom:1px solid #dcfce7; padding-bottom:10px;">
          <div>
            <h3 style="margin:0; font-size:15px; font-weight:800; color:#166534; display:flex; align-items:center; gap:8px;">
              <span>🏆 REKAPITULASI PENGADAAN SELESAI &amp; TUNTAS (100%)</span>
              <span class="badge badge-success" style="font-size:12px; font-weight:800;">${selesaiPakets.length} Paket</span>
            </h3>
            <div style="font-size:12px; color:#14532d; margin-top:3px;">
              Paket yang telah menyelesaikan 18 Tahap Hulu-Hilir, BAST disahkan, berkas terarsip, dan lunas/siap pembayaran.
            </div>
          </div>
          <div style="display:flex; gap:16px; text-align:right;">
            <div>
              <div style="font-size:11px; color:#166534; font-weight:700;">Total Nilai Kontrak:</div>
              <div class="cakra-mono" style="font-size:16px; font-weight:800; color:#047857;">${cakraFmtRp(kontrakSelesai)}</div>
            </div>
            <div>
              <div style="font-size:11px; color:#166534; font-weight:700;">Efisiensi Pagu:</div>
              <div class="cakra-mono" style="font-size:16px; font-weight:800; color:#b45309;">${cakraFmtRp(efisiensiSelesai)} (${persenEfisiensiSelesai}%)</div>
            </div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="cakra-table" style="background:#fff;">
            <thead>
              <tr style="background:#dcfce7; color:#166534;">
                <th style="width:40px; text-align:center;">No</th>
                <th>Kode Paket &amp; RUP</th>
                <th>Nama Paket Pengadaan &amp; MAK</th>
                <th>Subbag &amp; Penyedia Pemenang</th>
                <th style="text-align:right;">Nilai Pagu</th>
                <th style="text-align:right;">Nilai Kontrak</th>
                <th style="text-align:right;">Efisiensi Belanja</th>
                <th style="text-align:center;">Kelengkapan Dokumen</th>
                <th style="text-align:center; width:170px;">Aksi Audit &amp; Unduh</th>
              </tr>
            </thead>
            <tbody>
              ${rowsSelesaiHtml}
            </tbody>
            <tfoot>
              <tr style="background:#dcfce7; font-weight:800; color:#166534;">
                <td colspan="4" style="text-align:right; padding:10px 12px;">TOTAL PENGADAAN SELESAI (${selesaiPakets.length} PAKET):</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px;">${cakraFmtRp(paguSelesai)}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#047857;">${cakraFmtRp(kontrakSelesai)}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#b45309;">${cakraFmtRp(efisiensiSelesai)} (${persenEfisiensiSelesai}%)</td>
                <td colspan="2" style="text-align:center; padding:10px 12px; font-size:11.5px;">Seluruh berkas 18 tahap telah diverifikasi &amp; tersimpan</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  } else if (tab === 'EKSEKUTIF') {
    const rowsHtml = pakets.map((p, idx) => {
      const pagu = Number(p.nilai_pagu) || 0;
      const tkdn = Number(p.komitmen_tkdn_persen) || 40;
      const hpsValHtml = isHpsReady(p)
        ? `<span class="cakra-mono" style="color:#1d4ed8; font-weight:700;">${cakraFmtRp(p.nilai_hps)}</span>`
        : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Belum Disusun (Tahap 6)</span>`;
      
      const kontrakValHtml = isKontrakReady(p)
        ? `<span class="cakra-mono" style="color:#047857; font-weight:800;">${cakraFmtRp(p.nilai_kontrak)}</span>`
        : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Belum Berkontrak (Tahap 13)</span>`;
      
      let efHtml = '<span style="color:#94a3b8; font-size:11px; font-style:italic;">Rp 0 (Tahap 13)</span>';
      if (isKontrakReady(p)) {
        const ef = Math.max(0, pagu - Number(p.nilai_kontrak || 0));
        const efPct = pagu > 0 ? ((ef / pagu) * 100).toFixed(1) : '0.0';
        efHtml = `${cakraFmtRp(ef)} <div style="font-size:10px; color:#64748b;">(${efPct}%)</div>`;
      }

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>
            <div class="cakra-mono" style="font-weight:800; color:#991b1b;">${cakraEsc(p.kode_paket_internal)}</div>
            <div style="font-size:11px; color:#64748b;">RUP: ${cakraEsc(p.kode_rup || '-')}</div>
          </td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${cakraEsc(p.nama_paket)}</div>
            <div style="font-size:11px; color:#475569;">Subbag: <strong>${cakraEsc(p.pic_subbag)}</strong> | MAK: <span class="cakra-mono">${cakraEsc(p.kode_akun_mak)}</span></div>
          </td>
          <td>
            <span class="cakra-badge ${getBadgeClassByJenis(p.jenis_pengadaan)}">${cakraEsc(p.jenis_pengadaan)}</span>
            <div style="font-size:11px; font-weight:700; margin-top:3px;">${cakraEsc(p.metode_pemilihan)}</div>
          </td>
          <td class="cakra-mono" style="text-align:right; font-weight:700;">${cakraFmtRp(pagu)}</td>
          <td style="text-align:right;">${hpsValHtml}</td>
          <td style="text-align:right;">${kontrakValHtml}</td>
          <td class="cakra-mono" style="text-align:right; color:#b45309;">${efHtml}</td>
          <td style="text-align:center;">
            <span class="cakra-badge cakra-badge-green">UMK</span>
            <div style="font-size:11px; font-weight:700; margin-top:2px;">TKDN ${tkdn}%</div>
          </td>
          <td style="text-align:center;">
            <span class="cakra-badge cakra-badge-blue">Tahap ${p.tahap_aktif || 18}/18</span>
            <div style="font-size:10.5px; color:#047857; font-weight:700; margin-top:2px;">${cakraEsc(p.status_paket || 'SELESAI')}</div>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="cakra-table-card">
        <div class="cakra-table-header-bar">
          <div>
            <h3><span>📊 MATRIKS REKAP EKSEKUTIF PAKET PENGADAAN</span></h3>
            <div class="subtitle">Konsolidasi komprehensif Pagu Anggaran, Penetapan HPS, Realisasi Nilai Kontrak, Efisiensi, UMK &amp; TKDN</div>
          </div>
          <span class="badge badge-primary" style="font-size:12px; font-weight:800;">Menampilkan ${pakets.length} Paket</span>
        </div>
        <div class="table-responsive">
          <table class="cakra-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">No</th>
                <th>Kode Paket &amp; RUP</th>
                <th>Nama Paket Pengadaan</th>
                <th>Jenis &amp; Metode</th>
                <th style="text-align:right;">Nilai Pagu</th>
                <th style="text-align:right;">HPS / Ref. Harga</th>
                <th style="text-align:right;">Nilai Kontrak</th>
                <th style="text-align:right;">Efisiensi</th>
                <th style="text-align:center;">UMK &amp; TKDN</th>
                <th style="text-align:center;">Progres 18 Tahap</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="10" style="text-align:center; padding:24px; color:#64748b;">Belum ada paket pengadaan pada filter ini.</td></tr>'}
            </tbody>
            <tfoot>
              <tr style="background:#f8fafc; font-weight:800; border-top:2px solid #cbd5e1;">
                <td colspan="4" style="text-align:right; padding:10px 12px;">TOTAL KESELURUHAN (${totalPaket} PAKET):</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px;">${cakraFmtRp(totalPagu)}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#1d4ed8;">${totalHps > 0 ? cakraFmtRp(totalHps) : '<span style="color:#94a3b8; font-style:italic;">Rp 0 (Tahap 6)</span>'}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#047857;">${totalKontrak > 0 ? cakraFmtRp(totalKontrak) : '<span style="color:#94a3b8; font-style:italic;">Rp 0 (Tahap 13)</span>'}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#b45309;">${totalEfisiensi > 0 ? (cakraFmtRp(totalEfisiensi) + ' (' + persenEfisiensi + '%)') : '<span style="color:#94a3b8; font-style:italic;">Rp 0 (0.00%)</span>'}</td>
                <td colspan="2" style="text-align:center; padding:10px 12px;">Rata-rata TKDN: ${rataTkdn}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  } else if (tab === 'JENIS_METODE') {
    const groups = {};
    pakets.forEach(p => {
      const key = `${p.jenis_pengadaan || 'Barang'} || ${p.metode_pemilihan || 'E-Purchasing'} || ${p.bentuk_kontrak || 'Surat Pesanan'}`;
      if (!groups[key]) {
        groups[key] = {
          jenis: p.jenis_pengadaan || 'Barang',
          metode: p.metode_pemilihan || 'E-Purchasing',
          bentuk: p.bentuk_kontrak || 'Surat Pesanan',
          pelaksana: p.pelaksana_pemilihan || 'Pejabat Pengadaan / PPK',
          count: 0,
          pagu: 0,
          hps: 0,
          kontrak: 0
        };
      }
      groups[key].count++;
      groups[key].pagu += Number(p.nilai_pagu) || 0;
      groups[key].hps += getEffHps(p);
      groups[key].kontrak += getEffKontrak(p);
    });
    const list = Object.values(groups);
    const rowsHtml = list.map((g, idx) => {
      const ef = g.kontrak > 0 ? Math.max(0, g.pagu - g.kontrak) : 0;
      const porsi = totalKontrak > 0 ? ((g.kontrak / totalKontrak) * 100).toFixed(1) : '0.0';
      const kontrakCellHtml = g.kontrak > 0
        ? `<span class="cakra-mono" style="font-weight:800; color:#047857;">${cakraFmtRp(g.kontrak)}</span>`
        : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Rp 0 (Tahap 13)</span>`;
      const efCellHtml = g.kontrak > 0
        ? `<span class="cakra-mono" style="color:#b45309;">${cakraFmtRp(ef)}</span>`
        : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Rp 0</span>`;

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td><span class="cakra-badge ${getBadgeClassByJenis(g.jenis)}">${cakraEsc(g.jenis)}</span></td>
          <td><strong>${cakraEsc(g.metode)}</strong></td>
          <td><span class="cakra-badge cakra-badge-amber">${cakraEsc(g.bentuk)}</span></td>
          <td>${cakraEsc(g.pelaksana)}</td>
          <td class="cakra-mono" style="text-align:center; font-weight:800;">${g.count} Paket</td>
          <td class="cakra-mono" style="text-align:right; font-weight:700;">${cakraFmtRp(g.pagu)}</td>
          <td style="text-align:right;">${kontrakCellHtml}</td>
          <td style="text-align:right;">${efCellHtml}</td>
          <td class="cakra-mono" style="text-align:center; font-weight:700;">${porsi}%</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="cakra-table-card">
        <div class="cakra-table-header-bar">
          <div>
            <h3><span>📦 REKAPITULASI JENIS PENGADAAN, METODE PEMILIHAN &amp; BENTUK KONTRAK</span></h3>
            <div class="subtitle">Klasifikasi legalistik berbasis Perpres No. 46 Tahun 2025 dan Peraturan LKPP No. 3 Tahun 2026</div>
          </div>
          <span class="badge badge-secondary" style="font-size:12px; font-weight:700;">${list.length} Klaster Metode</span>
        </div>
        <div class="table-responsive">
          <table class="cakra-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">No</th>
                <th>Jenis Pengadaan</th>
                <th>Metode Pemilihan</th>
                <th>Bentuk Kontrak</th>
                <th>Pelaksana Pemilihan</th>
                <th style="text-align:center;">Jumlah Paket</th>
                <th style="text-align:right;">Total Pagu</th>
                <th style="text-align:right;">Total Nilai Kontrak</th>
                <th style="text-align:right;">Efisiensi</th>
                <th style="text-align:center;">Porsi Nilai</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || '<tr><td colspan="10" style="text-align:center; padding:24px;">Tidak ada data.</td></tr>'}</tbody>
            <tfoot>
              <tr style="background:#f8fafc; font-weight:800; border-top:2px solid #cbd5e1;">
                <td colspan="5" style="text-align:right; padding:10px 12px;">TOTAL KELOMPOK (${totalPaket} PAKET):</td>
                <td class="cakra-mono" style="text-align:center; padding:10px 12px;">${totalPaket} Paket</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px;">${cakraFmtRp(totalPagu)}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#047857;">${totalKontrak > 0 ? cakraFmtRp(totalKontrak) : '<span style="color:#94a3b8; font-style:italic;">Rp 0 (Tahap 13)</span>'}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#b45309;">${totalEfisiensi > 0 ? cakraFmtRp(totalEfisiensi) : '<span style="color:#94a3b8; font-style:italic;">Rp 0</span>'}</td>
                <td class="cakra-mono" style="text-align:center; padding:10px 12px;">100.0%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  } else if (tab === 'SUBBAGIAN') {
    const subbags = [
      { code: 'RENDATIN', name: 'Subbag Perencanaan, Data & Informasi (RENDATIN)' },
      { code: 'TEKNIS', name: 'Subbag Teknis Penyelenggaraan Pemilu (TEKNIS)' },
      { code: 'HUKUM', name: 'Subbag Hukum & Pengawasan (HUKUM)' },
      { code: 'PARSDM', name: 'Subbag Partisipasi Masyarakat & SDM (PARSDM)' },
      { code: 'KUL', name: 'Subbag Keuangan, Umum & Logistik (KUL)' }
    ];
    const rowsHtml = subbags.map((sb, idx) => {
      const items = (CakraState.pakets || []).filter(p => {
        const pic = String(p.pic_subbag || '').toUpperCase();
        return pic === sb.code || (sb.code === 'TEKNIS' && pic === 'TEKMAS') || (sb.code === 'HUKUM' && pic === 'HUKUM_SDM');
      });
      const pagu = items.reduce((s, p) => s + (Number(p.nilai_pagu) || 0), 0);
      const hps = items.reduce((s, p) => s + getEffHps(p), 0);
      const kontrak = items.reduce((s, p) => s + getEffKontrak(p), 0);
      const ef = kontrak > 0 ? Math.max(0, pagu - kontrak) : 0;
      const selesai = items.filter(p => Number(p.tahap_aktif) >= 16).length;

      const hpsCellHtml = hps > 0
        ? `<span class="cakra-mono" style="color:#1d4ed8; font-weight:700;">${cakraFmtRp(hps)}</span>`
        : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Rp 0 (Tahap 6)</span>`;

      const kontrakCellHtml = kontrak > 0
        ? `<span class="cakra-mono" style="font-weight:800; color:#047857;">${cakraFmtRp(kontrak)}</span>`
        : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Rp 0 (Tahap 13)</span>`;

      const efCellHtml = kontrak > 0
        ? `<span class="cakra-mono" style="color:#b45309;">${cakraFmtRp(ef)}</span>`
        : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Rp 0</span>`;

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td><strong>${cakraEsc(sb.code)}</strong></td>
          <td>${cakraEsc(sb.name)}</td>
          <td class="cakra-mono" style="text-align:center; font-weight:800;">${items.length} Paket</td>
          <td class="cakra-mono" style="text-align:right; font-weight:700;">${cakraFmtRp(pagu)}</td>
          <td style="text-align:right;">${hpsCellHtml}</td>
          <td style="text-align:right;">${kontrakCellHtml}</td>
          <td style="text-align:right;">${efCellHtml}</td>
          <td class="cakra-mono" style="text-align:center;"><span class="cakra-badge ${selesai > 0 ? 'cakra-badge-green' : 'cakra-badge-slate'}">${selesai} / ${items.length} BAST</span></td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="cakra-table-card">
        <div class="cakra-table-header-bar">
          <div>
            <h3><span>🏛️ REKAPITULASI PAKET PENGADAAN PER SUBBAGIAN PENGUSUL</span></h3>
            <div class="subtitle">Distribusi beban kerja teknis, kepatuhan BAST, dan realisasi anggaran pada 5 Subbagian KPU Kabupaten Ngawi</div>
          </div>
          <span class="badge badge-info" style="font-size:12px; font-weight:700;">5 Subbagian Teknis</span>
        </div>
        <div class="table-responsive">
          <table class="cakra-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">No</th>
                <th>Kode PIC</th>
                <th>Unit / Subbagian Pengusul</th>
                <th style="text-align:center;">Jumlah Paket</th>
                <th style="text-align:right;">Total Pagu</th>
                <th style="text-align:right;">Total HPS / Ref</th>
                <th style="text-align:right;">Total Kontrak</th>
                <th style="text-align:right;">Efisiensi</th>
                <th style="text-align:center;">Status BAST</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
            <tfoot>
              <tr style="background:#f8fafc; font-weight:800; border-top:2px solid #cbd5e1;">
                <td colspan="3" style="text-align:right; padding:10px 12px;">TOTAL SELURUH SUBBAGIAN:</td>
                <td class="cakra-mono" style="text-align:center; padding:10px 12px;">${totalPaket} Paket</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px;">${cakraFmtRp(totalPagu)}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#1d4ed8;">${totalHps > 0 ? cakraFmtRp(totalHps) : '<span style="color:#94a3b8; font-style:italic;">Rp 0 (Tahap 6)</span>'}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#047857;">${totalKontrak > 0 ? cakraFmtRp(totalKontrak) : '<span style="color:#94a3b8; font-style:italic;">Rp 0 (Tahap 13)</span>'}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#b45309;">${totalEfisiensi > 0 ? cakraFmtRp(totalEfisiensi) : '<span style="color:#94a3b8; font-style:italic;">Rp 0</span>'}</td>
                <td style="text-align:center; padding:10px 12px; font-size:11px; color:#64748b;">Monitoring Aktif</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  } else if (tab === 'AKUN_BAS') {
    const akunMap = {
      '521211': 'Belanja Bahan',
      '521219': 'Belanja Barang Non Operasional Lainnya',
      '521811': 'Belanja Barang Persediaan Barang Konsumsi',
      '522141': 'Belanja Sewa',
      '522151': 'Belanja Jasa Profesi',
      '522191': 'Belanja Jasa Lainnya',
      '523111': 'Belanja Pemeliharaan Gedung dan Bangunan',
      '532111': 'Belanja Modal Peralatan dan Mesin',
      '533111': 'Belanja Modal Gedung dan Bangunan'
    };
    const groups = {};
    pakets.forEach(p => {
      const mak = String(p.kode_akun_mak || '521219').trim();
      if (!groups[mak]) {
        groups[mak] = {
          mak,
          uraian: akunMap[mak] || 'Belanja Barang / Jasa Penyelenggaraan Tahapan',
          count: 0,
          pagu: 0,
          kontrak: 0
        };
      }
      groups[mak].count++;
      groups[mak].pagu += Number(p.nilai_pagu) || 0;
      groups[mak].kontrak += getEffKontrak(p);
    });
    const list = Object.values(groups).sort((a, b) => a.mak.localeCompare(b.mak));
    const rowsHtml = list.map((g, idx) => {
      const kontrakCellHtml = g.kontrak > 0
        ? `<span class="cakra-mono" style="font-weight:800; color:#047857;">${cakraFmtRp(g.kontrak)}</span>`
        : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Rp 0 (Tahap 13)</span>`;
      const sisaPaguHtml = g.kontrak > 0
        ? `<span class="cakra-mono" style="color:#b45309;">${cakraFmtRp(Math.max(0, g.pagu - g.kontrak))}</span>`
        : `<span class="cakra-mono" style="color:#0f172a; font-weight:700;">${cakraFmtRp(g.pagu)}</span> <span style="color:#047857; font-size:11px;">(Pagu Utuh)</span>`;

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td><span class="cakra-badge cakra-badge-blue cakra-mono" style="font-size:12px;">${cakraEsc(g.mak)}</span></td>
          <td><strong>${cakraEsc(g.uraian)}</strong></td>
          <td class="cakra-mono" style="text-align:center; font-weight:800;">${g.count} Paket</td>
          <td class="cakra-mono" style="text-align:right; font-weight:700;">${cakraFmtRp(g.pagu)}</td>
          <td style="text-align:right;">${kontrakCellHtml}</td>
          <td style="text-align:right;">${sisaPaguHtml}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="cakra-table-card">
        <div class="cakra-table-header-bar">
          <div>
            <h3><span>💳 REKAPITULASI KODE AKUN BELANJA (BAGAN AKUN STANDAR - MAK 6 DIGIT)</span></h3>
            <div class="subtitle">Sinkronisasi kode akun belanja DIPA APBN Satker 657811 terhadap pos pengadaan barang/jasa</div>
          </div>
          <span class="badge badge-warning" style="font-size:12px; font-weight:700;">${list.length} Akun Belanja Aktif</span>
        </div>
        <div class="table-responsive">
          <table class="cakra-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">No</th>
                <th>Kode Akun (MAK)</th>
                <th>Uraian Akun Standar (BAS)</th>
                <th style="text-align:center;">Jumlah Paket</th>
                <th style="text-align:right;">Total Pagu Paket</th>
                <th style="text-align:right;">Total Nilai Kontrak</th>
                <th style="text-align:right;">Sisa Pagu / Efisiensi</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || '<tr><td colspan="7" style="text-align:center; padding:24px;">Tidak ada data.</td></tr>'}</tbody>
            <tfoot>
              <tr style="background:#f8fafc; font-weight:800; border-top:2px solid #cbd5e1;">
                <td colspan="3" style="text-align:right; padding:10px 12px;">TOTAL KESELURUHAN AKUN BAS:</td>
                <td class="cakra-mono" style="text-align:center; padding:10px 12px;">${totalPaket} Paket</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px;">${cakraFmtRp(totalPagu)}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#047857;">${totalKontrak > 0 ? cakraFmtRp(totalKontrak) : '<span style="color:#94a3b8; font-style:italic;">Rp 0 (Tahap 13)</span>'}</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#b45309;">${totalKontrak > 0 ? cakraFmtRp(Math.max(0, totalPagu - totalKontrak)) : cakraFmtRp(totalPagu)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  } else if (tab === 'KONTRAK_BAST') {
    const rowsHtml = pakets.map((p, idx) => {
      const tAktif = Number(p.tahap_aktif || 1);
      const isBerkontrak = isKontrakReady(p);
      const kontrak = Number(p.nilai_kontrak) || 0;
      const dpp = Math.round(kontrak * (100 / 111));
      const ppn = Math.max(0, kontrak - dpp);
      const isKonst = String(p.jenis_pengadaan || '').includes('Konstruksi');
      const pphLabel = isKonst ? 'PPh Final 4(2) (1,75%)' : (String(p.jenis_pengadaan || '').includes('Jasa') ? 'PPh 23 (2%)' : 'PPh 22 (1,5%)');
      const pphRate = isKonst ? 0.0175 : (String(p.jenis_pengadaan || '').includes('Jasa') ? 0.02 : 0.015);
      const pphNom = Math.round(dpp * pphRate);
      const nettoSp2d = Math.max(0, kontrak - ppn - pphNom);

      let penyediaHtml = '';
      let bentukKontrakHtml = '';

      if (isBerkontrak && (p.nama_penyedia || p.nama_perusahaan)) {
        penyediaHtml = `<div style="font-weight:700; color:#0f172a;">${cakraEsc(p.nama_penyedia || p.nama_perusahaan)}</div>`;
        bentukKontrakHtml = `<span class="cakra-badge cakra-badge-amber" style="margin-top:2px;">${cakraEsc(p.bentuk_kontrak || 'Surat Pesanan')}</span>`;
      } else if (tAktif >= 9 && (p.nama_penyedia || p.nama_perusahaan)) {
        penyediaHtml = `
          <div style="font-weight:700; color:#475569;">${cakraEsc(p.nama_penyedia || p.nama_perusahaan)}</div>
          <div style="font-size:10px; color:#0369a1; font-weight:600; margin-top:2px;">(Pemenang Pemilihan - Belum Kontrak)</div>
        `;
        bentukKontrakHtml = `<span class="cakra-badge cakra-badge-slate" style="margin-top:2px;">Rencana: ${cakraEsc(p.bentuk_kontrak || 'Surat Pesanan')}</span>`;
      } else {
        penyediaHtml = `<div style="color:#94a3b8; font-size:11.5px; font-style:italic;">Belum Ditetapkan (Tahap 9)</div>`;
        bentukKontrakHtml = `<div style="font-size:10.5px; color:#64748b; margin-top:3px;">Rencana Kontrak: <strong>${cakraEsc(p.bentuk_kontrak || 'Surat Pesanan')}</strong></div>`;
      }

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${cakraEsc(p.nama_paket)}</div>
            <div class="cakra-mono" style="font-size:11px; color:#64748b;">${cakraEsc(p.kode_paket_internal)} | MAK ${cakraEsc(p.kode_akun_mak)}</div>
          </td>
          <td>
            ${penyediaHtml}
            ${bentukKontrakHtml}
          </td>
          <td style="text-align:right;">
            ${isBerkontrak
              ? `<span class="cakra-mono" style="font-weight:800; color:#047857;">${cakraFmtRp(kontrak)}</span>`
              : `<span style="color:#94a3b8; font-size:11px; font-style:italic;">Belum Berkontrak (Tahap 13)</span>`}
          </td>
          <td class="cakra-mono" style="text-align:right;">${isBerkontrak ? cakraFmtRp(dpp) : '<span style="color:#94a3b8;">-</span>'}</td>
          <td class="cakra-mono" style="text-align:right; color:#b45309;">${isBerkontrak ? cakraFmtRp(ppn) : '<span style="color:#94a3b8;">-</span>'}</td>
          <td class="cakra-mono" style="text-align:right; color:#991b1b;">
            ${isBerkontrak ? `${cakraFmtRp(pphNom)}<div style="font-size:10px; color:#64748b;">${pphLabel}</div>` : '<span style="color:#94a3b8;">-</span>'}
          </td>
          <td class="cakra-mono" style="text-align:right; font-weight:800; color:#047857;">
            ${isBerkontrak ? cakraFmtRp(nettoSp2d) : '<span style="color:#94a3b8;">-</span>'}
          </td>
          <td style="text-align:center;">
            <button type="button" class="btn btn-xs ${isBerkontrak ? 'btn-success' : 'btn-outline-primary'}" onclick="openPaketInCockpit(${p.id}, ${tAktif}, true)" style="font-weight:700; padding:4px 8px; border-radius:4px; font-size:11px; cursor:pointer;">
              <span>${isBerkontrak ? '💳 Kokpit Tahap 17' : '🧭 Kokpit Tahap ' + tAktif}</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div class="cakra-table-card">
        <div class="cakra-table-header-bar">
          <div>
            <h3><span>📑 REKAPITULASI KONTRAK, BAST, SIMULASI PAJAK (PPN &amp; PPh) &amp; NETTO SP2D</span></h3>
            <div class="subtitle">Estimasi pencairan belanja ke Bendahara Pengeluaran &amp; PPSPM KPU Kabupaten Ngawi</div>
          </div>
          <span class="badge badge-success" style="font-size:12px; font-weight:700;">Hilir Pembayaran</span>
        </div>
        <div class="table-responsive">
          <table class="cakra-table">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">No</th>
                <th>Paket Pengadaan &amp; MAK</th>
                <th>Penyedia &amp; Bentuk Kontrak</th>
                <th style="text-align:right;">Nilai Bruto Kontrak</th>
                <th style="text-align:right;">Estimasi DPP</th>
                <th style="text-align:right;">PPN 11%</th>
                <th style="text-align:right;">Potongan PPh</th>
                <th style="text-align:right;">Estimasi Netto SP2D</th>
                <th style="text-align:center;">Aksi</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || '<tr><td colspan="9" style="text-align:center; padding:24px;">Tidak ada data.</td></tr>'}</tbody>
            <tfoot>
              <tr style="background:#f8fafc; font-weight:800; border-top:2px solid #cbd5e1;">
                <td colspan="3" style="text-align:right; padding:10px 12px;">TOTAL REALISASI KONTRAK AKTIF:</td>
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#047857;">${totalKontrak > 0 ? cakraFmtRp(totalKontrak) : '<span style="color:#94a3b8; font-style:italic;">Rp 0 (Tahap 13)</span>'}</td>
                <td colspan="4" style="text-align:center; padding:10px 12px; font-size:11px; color:#64748b;">Simulasi potongan pajak otomatis berdasarkan UU HPP No. 7/2021 &amp; PMK</td>
                <td style="text-align:center; padding:10px 12px;">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }
}

function formatPengadaanDownloadTimestamp(d = new Date()) {
  if (typeof window.formatClientDownloadTimestamp === 'function') {
    return window.formatClientDownloadTimestamp(d);
  }
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);
  const get = type => parts.find(p => p.type === type)?.value || '';
  return `${get('day')}${get('month')}${get('year')}_${get('hour')}${get('minute')}`;
}

async function queuePengadaanDownload(format, paketId, stage = 'ALL') {
  directDownloadPengadaanDoc(format, paketId, stage);
  return;

  const fmt = String(format || 'docx').toLowerCase();
  const stageStr = String(stage || 'ALL').toUpperCase();
  if (fmt === 'xlsx' && Number(stageStr) === 1) {
    cakraNotify('⚠️ Tahap 1 (Identifikasi Kebutuhan & Nota Dinas) tidak menggunakan Kertas Kerja Excel sesuai regulasi PBJ. Silakan unduh Naskah Dokumen Word (.docx).', 'info');
    return;
  }
  const paket = (CakraState.paketList || []).find(p => Number(p.id) === Number(paketId)) ||
    (CakraState.activePaketFull?.paket?.id === Number(paketId) ? CakraState.activePaketFull.paket : null);

  const rawKode = String(paket?.kode_paket_internal || `PBJ-2026-${String(paketId).padStart(3, '0')}`).replace(/^CAKRA-/i, 'PBJ-');
  const cleanKode = rawKode.replace(/[^a-zA-Z0-9_-]/g, '_');
  const ts = formatPengadaanDownloadTimestamp();

  let baseDocName = '';
  let ext = '.docx';
  let tipeUnduhan = 'DOCX_PENGADAAN';
  let labelToast = 'Naskah Word Pengadaan';

  if (fmt === 'docx') {
    ext = '.docx';
    tipeUnduhan = 'DOCX_PENGADAAN';
    if (stageStr === 'ALL') {
      baseDocName = `Bundel_Naskah_Pengadaan_18_Tahap_${cleanKode}`;
      labelToast = `Bundel Word 18 Tahap (${rawKode})`;
    } else {
      const def = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === Number(stageStr));
      const kodeTahap = String(def?.kode || `Tahap_${stageStr}`).replace(/[^a-zA-Z0-9_-]/g, '_');
      baseDocName = `Naskah_Pengadaan_${cleanKode}_Tahap_${String(stageStr).padStart(2, '0')}_${kodeTahap}`;
      labelToast = `Naskah Word Tahap ${stageStr} (${rawKode})`;
    }
  } else if (fmt === 'xlsx') {
    ext = '.xlsx';
    tipeUnduhan = 'EXCEL_PENGADAAN';
    if (stageStr === 'ALL') {
      baseDocName = `Kertas_Kerja_Pengadaan_Master_${cleanKode}`;
      labelToast = `Kertas Kerja Excel Master (${rawKode})`;
    } else {
      baseDocName = `Kertas_Kerja_Pengadaan_${cleanKode}_Tahap_${String(stageStr).padStart(2, '0')}`;
      labelToast = `Kertas Kerja Excel Tahap ${stageStr} (${rawKode})`;
    }
  } else if (fmt === 'zip') {
    ext = '.zip';
    tipeUnduhan = 'ZIP_PENGADAAN';
    baseDocName = `Bundel_Arsip_Pengadaan_18_Tahap_${cleanKode}`;
    labelToast = `Bundel Arsip ZIP 18 Tahap (${rawKode})`;
  }

  const filename = `${baseDocName}_${ts}${ext}`;
  const baselinePeriode = (typeof window.getLockedExecutionPeriode === 'function' ? window.getLockedExecutionPeriode() : null) ||
    window.AppState?.lockedPeriode || null;

  try {
    cakraNotify(`Mengirim permintaan unduh ${labelToast} ke Monitoring Unduhan...`, 'info');
    const fnFetch = typeof window.apiFetch === 'function'
      ? window.apiFetch
      : async (u, o) => {
          const r = await fetch(u, { ...o, headers: { 'Content-Type': 'application/json', ...(o?.headers || {}) } });
          return r.json();
        };

    const res = await fnFetch('/api/download-requests', {
      method: 'POST',
      body: JSON.stringify({
        nama_file: filename,
        tipe_unduhan: tipeUnduhan,
        periode_id: baselinePeriode?.id || window.AppState?.activePeriodeId || null,
        filter_pic: paket?.pic_subbag || 'SEMUA',
        filter_sasaran: JSON.stringify({
          modul: 'PENGADAAN',
          paket_id: Number(paketId),
          kode_paket: rawKode,
          nama_paket: paket?.nama_paket || '',
          tahap: stageStr
        })
      })
    });

    if (res && res.success) {
      cakraNotify('Permintaan unduh berhasil dikirim ke antrean. Mengalihkan ke Monitoring Unduhan...', 'success');
      if (typeof window.switchView === 'function') {
        window.switchView('view-monitoring');
      }
    } else {
      cakraNotify((res && res.error) || 'Gagal membuat antrean unduhan dokumen pengadaan.', 'error');
    }
  } catch (err) {
    cakraNotify('Gagal memproses unduhan: ' + err.message, 'error');
  }
}

async function exportRekapPengadaanCsv() {
  const selectEl = document.getElementById('rekap-pengadaan-pic-select') || document.getElementById('rekap-pengadaan-filter-subbag');
  const filterSubbag = selectEl?.value || 'ALL';
  const filterMetode = document.getElementById('rekap-pengadaan-filter-metode')?.value || 'ALL';
  const picLabel = (filterSubbag === 'ALL' || filterSubbag === 'SEMUA') ? 'SEMUA' : filterSubbag;
  const ts = formatPengadaanDownloadTimestamp();
  const filename = `Rekap_Pengadaan_${picLabel}_${ts}.csv`;
  const baselinePeriode = (typeof window.getLockedExecutionPeriode === 'function' ? window.getLockedExecutionPeriode() : null) ||
    window.AppState?.lockedPeriode || null;

  try {
    cakraNotify('Mengirim permintaan unduh Rekap Pengadaan ke Monitoring Unduhan...', 'info');
    const fnFetch = typeof window.apiFetch === 'function'
      ? window.apiFetch
      : async (u, o) => {
          const r = await fetch(u, { ...o, headers: { 'Content-Type': 'application/json', ...(o?.headers || {}) } });
          return r.json();
        };

    const res = await fnFetch('/api/download-requests', {
      method: 'POST',
      body: JSON.stringify({
        nama_file: filename,
        tipe_unduhan: 'CSV_REKAP_PENGADAAN',
        periode_id: baselinePeriode?.id || window.AppState?.activePeriodeId || null,
        filter_pic: picLabel,
        filter_sasaran: JSON.stringify({
          modul: 'PENGADAAN_REKAP',
          metode: filterMetode
        })
      })
    });

    if (res && res.success) {
      cakraNotify('Permintaan unduh Rekap Pengadaan berhasil dikirim ke antrean. Mengalihkan ke Monitoring Unduhan...', 'success');
      if (typeof window.switchView === 'function') {
        window.switchView('view-monitoring');
      }
    } else {
      cakraNotify((res && res.error) || 'Gagal membuat antrean unduh Rekap Pengadaan.', 'error');
    }
  } catch (err) {
    cakraNotify('Gagal memproses unduhan: ' + err.message, 'error');
  }
}

function printRekapPengadaanPdf() {
  const selectEl = document.getElementById('rekap-pengadaan-pic-select') || document.getElementById('rekap-pengadaan-filter-subbag');
  const filterSubbag = selectEl?.value || 'ALL';
  const filterMetode = document.getElementById('rekap-pengadaan-filter-metode')?.value || 'ALL';
  if (typeof window.apiFetch === 'function') {
    window.apiFetch('/api/audit-logs/client-event', {
      method: 'POST',
      body: JSON.stringify({
        action: 'EXPORT_REKAP_PENGADAAN_PDF',
        entity: 'download_requests',
        new_values: { pic_subbag: filterSubbag, metode_pemilihan: filterMetode },
        notes: `Cetak / Ekspor PDF Rekap Pengadaan (PIC: ${filterSubbag}, Metode: ${filterMetode}).`
      })
    }).catch(() => {});
  }
  window.print();
}

// Ekspos ke global window untuk pemanggilan dari atribut onclick & switchView SI-PRABU
window.initCakraApp = initCakraApp;
window.onEnterPengadaanView = onEnterPengadaanView;
window.renderRekapPengadaanView = renderRekapPengadaanView;
window.switchRekapPengadaanTab = switchRekapPengadaanTab;
window.queuePengadaanDownload = queuePengadaanDownload;
window.exportRekapPengadaanCsv = exportRekapPengadaanCsv;
window.printRekapPengadaanPdf = printRekapPengadaanPdf;
window.openPaketInCockpit = openPaketInCockpit;
window.selectCockpitStage = selectCockpitStage;
window.switchCockpitTab = switchCockpitTab;
window.terapkanRekomendasiOtomatis = terapkanRekomendasiOtomatis;
window.saveCurrentPaketForm = saveCurrentPaketForm;
window.updateSbobCalc = updateSbobCalc;
window.addNewItemRow = addNewItemRow;
window.removeItemRow = removeItemRow;
window.saveCurrentItemsTable = saveCurrentItemsTable;
window.runAutoTimeMachine = runAutoTimeMachine;
window.saveManualTahaps = saveManualTahaps;
window.saveSkorKinerjaPpk = saveSkorKinerjaPpk;
window.createNewPaketPrompt = createNewPaketPrompt;
window.toggleCakraRkbDrawer = toggleCakraRkbDrawer;
window.loadSiprabuRkbItems = loadSiprabuRkbItems;
window.importRkbItemToCakra = importRkbItemToCakra;
window.filterSiprabuRkbTable = filterSiprabuRkbTable;
window.renderAllSiprabuRkbRows = renderAllSiprabuRkbRows;
window.openAddPenyediaModal = openAddPenyediaModal;
window.openEditCakraPenyediaModal = openEditCakraPenyediaModal;
window.closeCakraPenyediaModal = closeCakraPenyediaModal;
window.saveCakraPenyediaModal = saveCakraPenyediaModal;
window.onPenyediaLinkInputChange = onPenyediaLinkInputChange;
window.openPenyediaDocLink = openPenyediaDocLink;
window.saveQuickPenyediaLink = saveQuickPenyediaLink;
window.openEditCakraPejabatModal = openEditCakraPejabatModal;
window.closeCakraPejabatModal = closeCakraPejabatModal;
window.saveCakraPejabatModal = saveCakraPejabatModal;


/**
 * =============================================================================
 * SIMULATOR JENIS BELANJA & BESARAN NILAI PENGADAAN (14 TEMPLATE BAKU)
 * Berdasarkan Perpres 46/2025, Perlem LKPP 2/2026, Perlem LKPP 3/2026, Perlem 3 & 5/2021
 * =============================================================================
 */
let CakraSimulasiState = {
  activeResult: null
};

async function openSimulatorPengadaanModal(initialParams = null) {
  const modal = document.getElementById('modal-cakra-simulator');
  if (!modal) return;

  if (initialParams) {
    if (initialParams.jenis_pengadaan) {
      const el = document.getElementById('sim-jenis-pengadaan');
      if (el) el.value = initialParams.jenis_pengadaan;
    }
    if (initialParams.pagu) {
      setSimulatorPaguPreset(initialParams.pagu);
    }
  }

  modal.style.display = 'flex';
  onSimulatorJenisChange();
  await jalankanSimulasiPengadaan();
}

function closeSimulatorPengadaanModal() {
  const modal = document.getElementById('modal-cakra-simulator');
  if (modal) modal.style.display = 'none';
}

function onSimulatorJenisChange() {
  const jenis = document.getElementById('sim-jenis-pengadaan')?.value || 'Barang';
  const katalogContainer = document.getElementById('sim-katalog-container');
  const chkKatalog = document.getElementById('sim-via-katalog');

  if (katalogContainer && chkKatalog) {
    if (['Barang', 'Jasa Lainnya'].includes(jenis)) {
      katalogContainer.style.display = 'block';
    } else {
      katalogContainer.style.display = 'none';
      chkKatalog.checked = false;
    }
  }
  jalankanSimulasiPengadaan();
}

function formatSimulatorPaguInput(el) {
  let val = el.value.replace(/[^0-9]/g, '');
  const num = Number(val) || 0;
  el.value = num > 0 ? num.toLocaleString('id-ID') : '';
  const terbilangEl = document.getElementById('sim-pagu-terbilang');
  if (terbilangEl) {
    terbilangEl.textContent = cakraFmtRp(num);
  }
  if (window._simTimer) clearTimeout(window._simTimer);
  window._simTimer = setTimeout(jalankanSimulasiPengadaan, 300);
}

function setSimulatorPaguPreset(val) {
  const input = document.getElementById('sim-pagu-input');
  if (input) {
    input.value = Number(val).toLocaleString('id-ID');
    const terbilangEl = document.getElementById('sim-pagu-terbilang');
    if (terbilangEl) terbilangEl.textContent = cakraFmtRp(val);
    jalankanSimulasiPengadaan();
  }
}

async function jalankanSimulasiPengadaan() {
  const jenis = document.getElementById('sim-jenis-pengadaan')?.value || 'Barang';
  const rawPagu = (document.getElementById('sim-pagu-input')?.value || '0').replace(/[^0-9]/g, '');
  const pagu = Number(rawPagu) || 0;
  const viaKatalog = document.getElementById('sim-via-katalog')?.checked || false;
  const metodeSelect = document.getElementById('sim-metode-manual')?.value || 'AUTO';
  const metode = metodeSelect === 'AUTO' ? undefined : metodeSelect;

  const resContainer = document.getElementById('sim-hasil-container');
  if (!resContainer) return;

  try {
    const res = await cakraApiPost('/api/cakra/simulasi', {
      jenis_pengadaan: jenis,
      pagu,
      via_katalog: viaKatalog,
      metode_pemilihan: metode
    });

    if (!res.ok) throw new Error(res.error || 'Gagal simulasi');
    CakraSimulasiState.activeResult = res;

    renderSimulatorResultHtml(res, resContainer);
  } catch (e) {
    resContainer.innerHTML = `<div class="cakra-alert-danger">Gagal menjalankan simulasi: ${cakraEsc(e.message)}</div>`;
  }
}

function renderSimulatorResultHtml(res, container) {
  const sim = res.simulasi || {};
  const tpl = res.template || {};
  const bypassList = sim.bypass_tahap || [];

  let bypassBadgesHtml = '';
  if (bypassList.length > 0) {
    bypassBadgesHtml = `
      <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:10px 12px; margin-top:8px;">
        <div style="font-size:11.5px; font-weight:800; color:#065f46; margin-bottom:4px; display:flex; align-items:center; gap:5px;">
          <span>⏭️ Tahap yang Dilewati Sesuai Regulasi (${bypassList.length} Tahap Bypass):</span>
        </div>
        <div style="display:flex; gap:5px; flex-wrap:wrap;">
          ${bypassList.map(b => `<span class="badge" style="background:#059669; color:#fff; font-size:10.5px; font-weight:700;">Tahap ${b}</span>`).join('')}
        </div>
        <div style="font-size:10.5px; color:#047857; margin-top:4px;">
          Dokumen pada tahap di atas tidak dipersyaratkan oleh regulasi, sehingga berkas administrasi langsung melompat ke tahap berikutnya.
        </div>
      </div>
    `;
  } else {
    bypassBadgesHtml = `
      <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:8px 12px; margin-top:8px; font-size:11px; color:#475569;">
        📌 <strong>Paket ini menempuh 18 Tahap Penuh</strong> (Tanpa Bypass) karena mempersyaratkan tender/hps formal/kontrak perjanjian lengkap.
      </div>
    `;
  }

  container.innerHTML = `
    <!-- HEADER HASIL TEMPLATE -->
    <div style="background:#eff6ff; border:1.5px solid #3b82f6; border-radius:10px; padding:14px 16px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
        <div>
          <span class="badge" style="background:#1d4ed8; color:#fff; font-size:11px; font-weight:800; padding:2px 8px; border-radius:4px;">${cakraEsc(tpl.id || 'TPL-00')}</span>
          <h4 style="margin:4px 0 2px; font-size:15.5px; font-weight:800; color:#0f172a;">${cakraEsc(tpl.nama || 'Skenario Pengadaan')}</h4>
          <div style="font-size:11px; color:#2563eb; font-weight:600;">${cakraEsc(tpl.dasar_hukum || 'Perpres 46/2025')}</div>
        </div>
        <span class="badge" style="background:#10b981; color:#fff; font-size:11px; font-weight:800; padding:4px 8px;">✅ Rekomendasi Terverifikasi</span>
      </div>
      <div style="font-size:12px; color:#334155; margin-top:8px; line-height:1.45; background:#fff; padding:8px 12px; border-radius:6px; border:1px solid #dbeafe;">
        ${cakraEsc(tpl.deskripsi || '-')}
      </div>
    </div>

    <!-- MATRIKS KETENTUAN UTAMA -->
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px;">
        <div style="font-size:10.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Metode Pemilihan</div>
        <div style="font-size:13.5px; font-weight:800; color:#0f172a; margin-top:2px;">${cakraEsc(sim.metode)}</div>
      </div>
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px;">
        <div style="font-size:10.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Bentuk Kontrak Resmi</div>
        <div style="font-size:13.5px; font-weight:800; color:#0f172a; margin-top:2px;">${cakraEsc(sim.bentuk_kontrak)}</div>
      </div>
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px;">
        <div style="font-size:10.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Kertas Kerja Harga</div>
        <div style="font-size:13.5px; font-weight:800; color:#0369a1; margin-top:2px;">${cakraEsc(sim.kertas_harga)}</div>
      </div>
      <div style="background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px;">
        <div style="font-size:10.5px; font-weight:800; color:#64748b; text-transform:uppercase;">Pejabat Pelaksana</div>
        <div style="font-size:13.5px; font-weight:800; color:#0f172a; margin-top:2px;">${cakraEsc(sim.pejabat)}</div>
      </div>
    </div>

    <!-- PAJAK, JAMINAN & RETENSI -->
    <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
      <div>
        <div style="font-size:10.5px; font-weight:800; color:#64748b;">TARIF PPh</div>
        <div style="font-size:13px; font-weight:800; color:#b45309; margin-top:2px;">${cakraEsc(sim.jenis_pph)}</div>
      </div>
      <div>
        <div style="font-size:10.5px; font-weight:800; color:#64748b;">RETENSI PEMELIHARAAN</div>
        <div style="font-size:13px; font-weight:800; color:#0f172a; margin-top:2px;">${sim.persen_retensi ? 'Wajib 5%' : '0% (Tidak Wajib)'}</div>
      </div>
      <div>
        <div style="font-size:10.5px; font-weight:800; color:#64748b;">JAMINAN PELAKSANAAN</div>
        <div style="font-size:13px; font-weight:800; color:#0f172a; margin-top:2px;">${sim.wajib_jaminan ? 'Wajib 5%' : 'Tidak Dipersyaratkan'}</div>
      </div>
    </div>

    ${bypassBadgesHtml}
  `;
}

async function terapkanSimulasiKePaketBaru() {
  if (!CakraSimulasiState.activeResult) {
    cakraNotify('Silakan jalankan simulasi terlebih dahulu.', 'warning');
    return;
  }
  const sim = CakraSimulasiState.activeResult.simulasi || {};
  const tpl = CakraSimulasiState.activeResult.template || {};

  closeSimulatorPengadaanModal();

  await createNewPaketPrompt({
    nama: `Pengadaan ${sim.jenis_pengadaan} (${tpl.nama || 'Sesuai Standar Template'})`,
    jenis_pengadaan: sim.jenis_pengadaan,
    pagu: sim.pagu,
    metode_pemilihan: sim.metode,
    bentuk_kontrak: sim.bentuk_kontrak
  });
}

function applyTemplateBakuToCurrentForm(templateId) {
  if (!CakraState.activePaketCtx) return;
  const tpl = CakraState.activePaketCtx.audit?.template;
  if (!tpl) return;

  const elBentuk = document.getElementById('cf_bentuk_kontrak');
  const elKertas = document.getElementById('cf_jenis_kertas_harga');
  const elMetode = document.getElementById('cf_metode_pemilihan');
  const elPph = document.getElementById('cf_jenis_pph_select');

  if (elBentuk && tpl.bentuk_kontrak) elBentuk.value = tpl.bentuk_kontrak;
  if (elKertas && tpl.jenis_kertas_harga) elKertas.value = tpl.jenis_kertas_harga;
  if (elMetode && tpl.metode_pemilihan) elMetode.value = tpl.metode_pemilihan;

  if (elPph && tpl.tarif_pph !== undefined) {
    for (let i = 0; i < elPph.options.length; i++) {
      const optVal = elPph.options[i].value;
      if (optVal.endsWith('|' + tpl.tarif_pph)) {
        elPph.selectedIndex = i;
        break;
      }
    }
  }

  cakraNotify(`Standar template ${tpl.id} (${tpl.nama}) berhasil diterapkan ke form ini. Jangan lupa klik Simpan Perubahan.`, 'success');
}

async function selesaikanTahapDanLanjut(tahapNo) {
  if (!CakraState.activePaketCtx) return;
  const nextStage = Math.min(18, Number(tahapNo) + 1);
  selectCockpitStage(nextStage);
  cakraNotify(`Melanjutkan ke Tahap ${nextStage}...`, 'info');
}


/**
 * =============================================================================
 * FITUR REKOMENDASI CERDAS KATEGORI PENGADAAN & SMART WIZARD PEMANDUAN (18 TAHAP)
 * Berdasarkan Perpres 46/2025, Keputusan Kepala LKPP 177/2024, Perlem LKPP 2/2026 & 3/2026
 * =============================================================================
 */

function recommendJenisPengadaan({ kode_akun = '', uraian = '', pagu = 0, via_katalog = null }) {
  const cleanMak = String(kode_akun || '').replace(/[^0-9]/g, '');
  const text = String(uraian || '').toLowerCase();
  const numPagu = Number(pagu) || 0;

  const scores = {
    'Barang': 0,
    'Pekerjaan Konstruksi': 0,
    'Jasa Lainnya': 0,
    'Jasa Konsultansi Nonkonstruksi': 0,
    'Jasa Konsultansi Konstruksi': 0,
    'Swakelola': 0,
    'Dikecualikan': 0
  };

  const rationale = [];

  // 1. Evaluasi MAK
  if (cleanMak.startsWith('533') || cleanMak === '523111' || cleanMak.startsWith('534')) {
    scores['Pekerjaan Konstruksi'] += 80;
    rationale.push(`Akun MAK ${cleanMak} merupakan Belanja Konstruksi / Pemeliharaan Bangunan Fisik`);
  } else if (cleanMak === '532111' || cleanMak.startsWith('5211') || cleanMak === '521211' || cleanMak === '521811') {
    scores['Barang'] += 75;
    rationale.push(`Akun MAK ${cleanMak} merupakan Belanja Bahan / Operasional Barang Persediaan / Modal Peralatan`);
  } else if (cleanMak === '521213' || cleanMak === '522151') {
    scores['Swakelola'] += 80;
    rationale.push(`Akun MAK ${cleanMak} merupakan Belanja Honorarium Kegiatan / Jasa Profesi Internal`);
  } else if (cleanMak.startsWith('52211')) {
    scores['Dikecualikan'] += 85;
    rationale.push(`Akun MAK ${cleanMak} merupakan Belanja Langganan Daya & Jasa Publik (Tarif Resmi Pemerintah/BUMN)`);
  } else if (cleanMak === '522131') {
    scores['Jasa Konsultansi Nonkonstruksi'] += 70;
    scores['Jasa Konsultansi Konstruksi'] += 40;
    rationale.push(`Akun MAK ${cleanMak} merupakan Belanja Jasa Konsultansi Keahlian`);
  } else if (cleanMak === '522141' || cleanMak === '522191' || cleanMak === '523121') {
    scores['Jasa Lainnya'] += 75;
    rationale.push(`Akun MAK ${cleanMak} merupakan Belanja Sewa / Pemeliharaan Mesin / Jasa Lainnya`);
  }

  // 2. Evaluasi Kata Kunci
  const konstruksiKeywords = ['renovasi', 'rehabilitasi', 'pembangunan', 'gedung', 'pagar', 'atap', 'lantai', 'ruang', 'penataan halaman', 'drainase', 'pondasi', 'konstruksi', 'cat kantor', 'semen', 'batu', 'keramik', 'baja ringan', 'turap'];
  const matchedKonstruksi = konstruksiKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedKonstruksi.length > 0) {
    scores['Pekerjaan Konstruksi'] += matchedKonstruksi.length * 25;
    rationale.push(`Kata kunci konstruksi terdeteksi: "${matchedKonstruksi.join(', ')}"`);
  }

  const konsulKeywords = ['konsultan', 'kajian', 'studi kelayakan', 'ded', 'detail engineering', 'pengawasan teknis', 'supervisi', 'naskah akademik', 'masterplan', 'audit sipil'];
  const matchedKonsul = konsulKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedKonsul.length > 0) {
    const isKonsulKonstruksi = text.includes('gedung') || text.includes('bangunan') || text.includes('ded') || text.includes('pengawasan') || text.includes('fisik');
    if (isKonsulKonstruksi) {
      scores['Jasa Konsultansi Konstruksi'] += matchedKonsul.length * 35 + 40;
      rationale.push(`Kata kunci Konsultansi Konstruksi (DED/Pengawasan): "${matchedKonsul.join(', ')}"`);
    } else {
      scores['Jasa Konsultansi Nonkonstruksi'] += matchedKonsul.length * 35 + 40;
      rationale.push(`Kata kunci Konsultansi Nonkonstruksi: "${matchedKonsul.join(', ')}"`);
    }
  }

  const jasaLainKeywords = ['sewa', 'kebersihan', 'cleaning service', 'keamanan', 'security', 'satpam', 'catering', 'konsumsi', 'snack', 'makan minum', 'eo', 'event organizer', 'pengiriman', 'distribusi', 'ekspedisi', 'akomodasi', 'hotel', 'penginapan', 'sound system', 'genset', 'publikasi', 'iklan', 'pengepakan', 'sortir lipat', 'tenaga pendukung'];
  const matchedJasaLain = jasaLainKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedJasaLain.length > 0) {
    scores['Jasa Lainnya'] += matchedJasaLain.length * 25;
    rationale.push(`Kata kunci Jasa Lainnya: "${matchedJasaLain.join(', ')}"`);
  }

  const barangKeywords = ['atk', 'kertas', 'toner', 'tinta', 'laptop', 'komputer', 'pc', 'printer', 'scanner', 'meja', 'kursi', 'lemari', 'ac', 'seragam', 'rompi', 'kotak suara', 'bilik suara', 'tinta pemilu', 'segel', 'surat suara', 'alat tulis', 'spanduk', 'brosur', 'formulir', 'harddisk', 'server'];
  const matchedBarang = barangKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedBarang.length > 0) {
    scores['Barang'] += matchedBarang.length * 25;
    rationale.push(`Kata kunci Barang: "${matchedBarang.join(', ')}"`);
  }

  const swakelolaKeywords = ['bimtek', 'sosialisasi internal', 'honorarium', 'honor pokja', 'narasumber', 'panitia pemilihan', 'pokmas', 'kelompok masyarakat', 'ptn', 'universitas', 'swakelola'];
  const matchedSwakelola = swakelolaKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedSwakelola.length > 0) {
    scores['Swakelola'] += matchedSwakelola.length * 30;
    rationale.push(`Kata kunci Swakelola / Internal: "${matchedSwakelola.join(', ')}"`);
  }

  const dikecualikanKeywords = ['pln', 'telkom', 'indihome', 'pdam', 'tiket pesawat', 'garuda', 'kai', 'kereta api', 'bumn', 'tarif resmi'];
  const matchedDikecualikan = dikecualikanKeywords.filter(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  if (matchedDikecualikan.length > 0) {
    scores['Dikecualikan'] += matchedDikecualikan.length * 35;
    rationale.push(`Kata kunci Pengadaan Dikecualikan (Tarif Resmi): "${matchedDikecualikan.join(', ')}"`);
  }

  let bestKategori = 'Barang';
  let highestScore = -1;
  for (const [kat, sc] of Object.entries(scores)) {
    if (sc > highestScore) {
      highestScore = sc;
      bestKategori = kat;
    }
  }

  if (highestScore <= 0) {
    bestKategori = 'Barang';
    rationale.push('Kategori default Barang (tidak terdeteksi kata kunci spesifik konstruksi/jasa)');
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? Math.min(99, Math.round((highestScore / (totalScore || 1)) * 100 + 35)) : 80;

  // 3. Skenario Regulasi
  let rekomendasiMetode = 'E-Purchasing';
  let bentukKontrak = 'Surat Pesanan';
  let jenisKertasHarga = 'HPS';
  let pejabatPelaksana = 'Pejabat Pengadaan';
  let dasarHukum = '';
  let perlakuanKhusus = [];
  let bypassTahap = [];
  let tarifPph = 1.5;
  let jenisPph = 'PPh 22 Barang (1.5%)';

  if (bestKategori === 'Pekerjaan Konstruksi') {
    tarifPph = 1.75;
    jenisPph = 'PPh Final Konstruksi Kecil SBU K1/K2/K3 (1.75%)';
    jenisKertasHarga = 'HPS (AHSP Kab. Ngawi & DED)';
    if (numPagu <= 50000000) {
      rekomendasiMetode = 'Pengadaan Langsung';
      bentukKontrak = 'Kuitansi / SPK';
      dasarHukum = 'Lampiran II Perlem LKPP 3/2026 jo. PP 9/2021';
      bypassTahap = [11, 12];
    } else if (numPagu <= 400000000) {
      rekomendasiMetode = 'Pengadaan Langsung';
      bentukKontrak = 'SPK';
      dasarHukum = 'Pasal 38 ayat (4) Perpres 46/2025 (Batas Pengadaan Langsung Konstruksi s.d. Rp400 Jt)';
      bypassTahap = [11];
    } else {
      rekomendasiMetode = 'Tender';
      bentukKontrak = 'Surat Perjanjian';
      pejabatPelaksana = 'Pokja Pemilihan';
      dasarHukum = 'Pasal 38 Perpres 46/2025 jo. Lampiran II Perlem LKPP 3/2026';
      bypassTahap = [];
    }
    perlakuanKhusus.push('Wajib melampirkan Dokumen Konseptual SMKK / RKK Keselamatan Konstruksi (Tahap 4)');
    perlakuanKhusus.push('Wajib Masa Pemeliharaan & Retensi 5% saat PHO s.d. FHO (Tahap 16)');
    perlakuanKhusus.push('PPh Final Konstruksi: 1,75% (Kualifikasi Kecil SBU K1/K2/K3)');
  } else if (bestKategori.includes('Konsultansi')) {
    tarifPph = 2.0;
    jenisPph = 'PPh 23 Jasa Konsultansi (2%)';
    jenisKertasHarga = 'HPS (SBOB / Billing Rate Tenaga Ahli)';
    if (numPagu <= 100000000) {
      rekomendasiMetode = 'Pengadaan Langsung';
      bentukKontrak = 'SPK';
      dasarHukum = 'Pasal 38 Perpres 46/2025 jo. Lampiran I & II Perlem LKPP 3/2026';
      bypassTahap = [11, 12];
    } else {
      rekomendasiMetode = 'Seleksi';
      bentukKontrak = 'Surat Perjanjian';
      pejabatPelaksana = 'Pokja Pemilihan';
      dasarHukum = 'Pasal 38 & 41 Perpres 46/2025';
      bypassTahap = [];
    }
    perlakuanKhusus.push('HPS wajib merinci Remunerasi Tenaga Ahli (Billing Rate) & Biaya Langsung Non-Personil (Tahap 6)');
    perlakuanKhusus.push('Bebas dari kewajiban Jaminan Pelaksanaan (Pasal 30 Perpres 46/2025)');
  } else if (bestKategori === 'Swakelola') {
    rekomendasiMetode = 'Swakelola Tipe I';
    bentukKontrak = 'Kontrak Swakelola';
    jenisKertasHarga = 'RAB Swakelola';
    pejabatPelaksana = 'Tim Penyelenggara Swakelola (KPU)';
    tarifPph = 5.0;
    jenisPph = 'PPh 21 Honorarium Tenaga Ahli/Pokja (5%)';
    dasarHukum = 'Perpres 16/2018 jo. Perpres 46/2025 jo. Peraturan LKPP Nomor 3 Tahun 2021';
    bypassTahap = [5, 10, 11, 12, 18];
    perlakuanKhusus.push('Direncanakan & dikerjakan sendiri oleh Tim Swakelola KPU Ngawi (SK KPA)');
    perlakuanKhusus.push('Menggunakan format RAB Swakelola, bukan HPS pasar rekanan');
  } else if (bestKategori === 'Dikecualikan') {
    rekomendasiMetode = 'Mekanisme Pasar (Dikecualikan)';
    bentukKontrak = 'SPK / Bukti Pembelian';
    jenisKertasHarga = 'Estimasi Tarif Resmi Pemerintah / BUMN';
    pejabatPelaksana = 'PPK / Pejabat Pengadaan';
    dasarHukum = 'Perpres 16/2018 jo. Perpres 46/2025 jo. Peraturan LKPP Nomor 5 Tahun 2021';
    bypassTahap = [11, 12];
    perlakuanKhusus.push('Pembayaran mengikuti tarif resmi pemerintah / BUMN (PLN/PDAM/Telkom)');
  } else {
    // Barang atau Jasa Lainnya (Default: Prioritas E-Purchasing Katalog Elektronik V6 sesuai Kepka LKPP 177/2024)
    const isEpur = via_katalog !== false;
    if (isEpur) {
      rekomendasiMetode = 'E-Purchasing';
      bentukKontrak = 'Surat Pesanan';
      pejabatPelaksana = numPagu <= 200000000 ? 'Pejabat Pengadaan' : 'Pokja Pemilihan / PPK';
      
      if (numPagu <= 100000000) {
        jenisKertasHarga = 'Referensi Harga (Bebas HPS - Kepka LKPP 177/2024)';
        dasarHukum = 'Keputusan Kepala LKPP Nomor 177 Tahun 2024 (Lampiran III: Tata Cara E-Purchasing) jo. Pasal 9 Perlem LKPP 2/2026';
        bypassTahap = [11];
        perlakuanKhusus.push('🎉 BEBAS HPS FORMAL: Cukup lampirkan Bukti Survei Etalase Katalog V6 & Kertas Kerja Referensi Harga (Kepka LKPP 177/2024)');
        perlakuanKhusus.push('Bypass Tahap 11 (SPPBJ tidak diperlukan, langsung Surat Pesanan)');
        perlakuanKhusus.push('Bebas dari kewajiban Jaminan Pelaksanaan');
      } else if (numPagu <= 200000000) {
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 26 & 38 Perpres 46/2025 jo. Keputusan Kepala LKPP Nomor 177 Tahun 2024';
        bypassTahap = [11];
        perlakuanKhusus.push('Wajib HPS oleh PPK, negosiasi harga digital melalui Katalog Elektronik V6');
        perlakuanKhusus.push('Bebas dari Jaminan Pelaksanaan (≤ Rp 200 Juta)');
      } else {
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 30 & 38 Perpres 46/2025 jo. Keputusan Kepala LKPP Nomor 177 Tahun 2024 jo. Perlem 2/2026';
        bypassTahap = [];
        perlakuanKhusus.push('E-Purchasing > Rp 200 Jt: Gunakan Negosiasi Digital atau Mini-Kompetisi Katalog V6');
        perlakuanKhusus.push('Wajib Jaminan Pelaksanaan 5% sebelum penandatanganan Surat Pesanan');
      }
    } else {
      if (numPagu <= 10000000) {
        rekomendasiMetode = 'Pengadaan Langsung';
        bentukKontrak = 'Bukti Pembelian';
        jenisKertasHarga = 'Bebas HPS (<= 10 Jt)';
        dasarHukum = 'Pasal 28 & 38 Perpres 46/2025';
        bypassTahap = [6, 11, 12, 14];
        perlakuanKhusus.push('Bebas HPS, cukup bukti struk/nota pembelian toko');
      } else if (numPagu <= 50000000) {
        rekomendasiMetode = 'Pengadaan Langsung';
        bentukKontrak = 'Kuitansi';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 28 & 38 Perpres 46/2025';
        bypassTahap = [11, 12, 14];
        perlakuanKhusus.push('Wajib HPS, bentuk kontrak Kuitansi dinas bermeterai');
      } else if (numPagu <= 200000000) {
        rekomendasiMetode = 'Pengadaan Langsung';
        bentukKontrak = 'SPK';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 28 & 38 Perpres 46/2025 jo. Lampiran I Perlem 3/2026';
        bypassTahap = [];
        perlakuanKhusus.push('Wajib SPK dan HPS survei harga pasar');
      } else {
        rekomendasiMetode = 'Tender';
        bentukKontrak = 'Surat Perjanjian';
        pejabatPelaksana = 'Pokja Pemilihan';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 38 Perpres 46/2025 jo. Lampiran I Perlem 3/2026';
        bypassTahap = [];
        perlakuanKhusus.push('Wajib Tender oleh Pokja Pemilihan & Jaminan Pelaksanaan 5%');
      }
    }
  }

  return {
    kategori_terpilih: bestKategori,
    confidence: Math.min(confidence, 98),
    skor_kandidat: scores,
    rasional: rationale,
    rekomendasi_skenario: {
      metode_pemilihan: rekomendasiMetode,
      bentuk_kontrak: bentukKontrak,
      jenis_kertas_harga: jenisKertasHarga,
      pejabat_pelaksana: pejabatPelaksana,
      tarif_pph: tarifPph,
      jenis_pph: jenisPph,
      dasar_hukum: dasarHukum,
      bypass_tahap: bypassTahap,
      catatan_kepatuhan: perlakuanKhusus
    }
  };
}

let CakraWizardState = {
  activeRec: null,
  initialData: null,
  manualCategory: null
};

function openSmartWizardModal(initialData = null) {
  const modal = document.getElementById('modal-smart-wizard-paket');
  if (!modal) return;

  CakraWizardState.initialData = initialData;
  CakraWizardState.manualCategory = null;

  const inpNama = document.getElementById('wiz-nama-paket');
  const inpPagu = document.getElementById('wiz-pagu-input');
  const selAkun = document.getElementById('wiz-kode-akun');
  const chkKatalog = document.getElementById('wiz-via-katalog');

  if (initialData) {
    if (inpNama) inpNama.value = initialData.nama || initialData.nama_paket || '';
    if (inpPagu && initialData.pagu) {
      inpPagu.value = Number(initialData.pagu).toLocaleString('id-ID');
      const terbilangEl = document.getElementById('wiz-terbilang-text');
      if (terbilangEl) terbilangEl.textContent = cakraFmtRp(initialData.pagu);
    }
    if (selAkun && initialData.kode_akun) {
      selAkun.value = String(initialData.kode_akun).replace(/[^0-9]/g, '');
    }
  } else {
    if (inpNama) inpNama.value = 'Pekerjaan Konstruksi Pemeliharaan Gedung & Penataan Halaman Kantor KPU Kabupaten Ngawi';
    if (inpPagu) {
      inpPagu.value = Number(185000000).toLocaleString('id-ID');
      const terbilangEl = document.getElementById('wiz-terbilang-text');
      if (terbilangEl) terbilangEl.textContent = cakraFmtRp(185000000);
    }
    if (selAkun) selAkun.value = '523111';
    if (chkKatalog) chkKatalog.checked = false;
  }

  modal.style.display = 'flex';
  onWizardInputChange();
}

function closeSmartWizardModal() {
  const modal = document.getElementById('modal-smart-wizard-paket');
  if (modal) modal.style.display = 'none';
}

function formatWizardPagu(input) {
  let val = input.value.replace(/[^0-9]/g, '');
  const num = Number(val) || 0;
  input.value = num > 0 ? num.toLocaleString('id-ID') : '';
  const terbilangEl = document.getElementById('wiz-terbilang-text');
  if (terbilangEl) terbilangEl.textContent = cakraFmtRp(num);
  onWizardInputChange();
}

function setWizardPagu(val) {
  const inpPagu = document.getElementById('wiz-pagu-input');
  if (inpPagu) {
    inpPagu.value = Number(val).toLocaleString('id-ID');
    const terbilangEl = document.getElementById('wiz-terbilang-text');
    if (terbilangEl) terbilangEl.textContent = cakraFmtRp(val);
    onWizardInputChange();
  }
}

function onWizardInputChange() {
  const nama = document.getElementById('wiz-nama-paket')?.value || '';
  const rawPagu = (document.getElementById('wiz-pagu-input')?.value || '0').replace(/[^0-9]/g, '');
  const pagu = Number(rawPagu) || 0;
  const akun = document.getElementById('wiz-kode-akun')?.value || '';
  const viaKatalog = document.getElementById('wiz-via-katalog')?.checked || false;

  const rec = recommendJenisPengadaan({
    kode_akun: akun,
    uraian: nama,
    pagu: pagu,
    via_katalog: viaKatalog
  });

  if (CakraWizardState.manualCategory) {
    rec.kategori_terpilih = CakraWizardState.manualCategory;
  }

  CakraWizardState.activeRec = rec;
  renderWizardRecommendationHtml(rec);
  renderWizardKerangka18Tahap(rec);
}

function applyWizardSuggestedCategory(kat) {
  CakraWizardState.manualCategory = kat;
  onWizardInputChange();
}

function renderWizardRecommendationHtml(rec) {
  const container = document.getElementById('wiz-rekomendasi-card-container');
  if (!container) return;

  const skenario = rec.rekomendasi_skenario || {};
  const isBebasHps = skenario.jenis_kertas_harga && skenario.jenis_kertas_harga.toLowerCase().includes('bebas hps');

  container.innerHTML = `
    <div style="background:#eff6ff; border:1.5px solid #3b82f6; border-radius:10px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="background:#1d4ed8; color:#fff; font-size:11px; font-weight:800; padding:3px 10px; border-radius:4px; text-transform:uppercase;">
              💡 SARAN KATEGORI: ${cakraEsc(rec.kategori_terpilih)}
            </span>
            <span class="badge" style="background:#10b981; color:#fff; font-size:11px; font-weight:700;">
              Keyakinan Sistem: ${rec.confidence}%
            </span>
          </div>
          <div style="font-size:11.5px; color:#1e40af; margin-top:6px; line-height:1.4;">
            <strong>Dasar Pertimbangan:</strong> ${rec.rasional.map(r => cakraEsc(r)).join(' • ')}
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="applyWizardSuggestedCategory('Barang')" style="font-size:10.5px;">Barang</button>
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="applyWizardSuggestedCategory('Pekerjaan Konstruksi')" style="font-size:10.5px;">Konstruksi</button>
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="applyWizardSuggestedCategory('Jasa Lainnya')" style="font-size:10.5px;">Jasa Lainnya</button>
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="applyWizardSuggestedCategory('Jasa Konsultansi Nonkonstruksi')" style="font-size:10.5px;">Konsultansi</button>
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="applyWizardSuggestedCategory('Swakelola')" style="font-size:10.5px;">Swakelola</button>
        </div>
      </div>

      <!-- MATRIKS SKENARIO PENGADAAN -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-top:14px;">
        <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 12px;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Metode Pemilihan</div>
          <div style="font-size:13px; font-weight:800; color:#1e3a8a; margin-top:2px;">${cakraEsc(skenario.metode_pemilihan)}</div>
        </div>
        <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 12px;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Bentuk Kontrak Sah</div>
          <div style="font-size:13px; font-weight:800; color:#1e3a8a; margin-top:2px;">${cakraEsc(skenario.bentuk_kontrak)}</div>
        </div>
        <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 12px;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Kertas Kerja Harga (Tahap 6)</div>
          <div style="font-size:13px; font-weight:800; color:${isBebasHps ? '#059669' : '#1e3a8a'}; margin-top:2px;">
            ${cakraEsc(skenario.jenis_kertas_harga)}
          </div>
        </div>
        <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 12px;">
          <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase;">Pejabat Pelaksana</div>
          <div style="font-size:13px; font-weight:800; color:#1e3a8a; margin-top:2px;">${cakraEsc(skenario.pejabat_pelaksana)}</div>
        </div>
      </div>

      <!-- CATATAN KEPATUHAN REGULASI & KEPKA LKPP 177/2024 -->
      <div style="background:#ffffff; border:1px solid #dbeafe; border-radius:8px; padding:10px 14px; margin-top:10px;">
        <div style="font-size:11px; font-weight:800; color:#1e40af; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
          <span>📌 Dasar Regulasi: ${cakraEsc(skenario.dasar_hukum)}</span>
        </div>
        <div style="display:flex; flex-direction:column; gap:3px;">
          ${skenario.catatan_kepatuhan.map(c => `
            <div style="font-size:11px; color:#334155; display:flex; align-items:flex-start; gap:6px;">
              <span style="color:#2563eb;">•</span>
              <span>${cakraEsc(c)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

function renderWizardKerangka18Tahap(rec) {
  const container = document.getElementById('wiz-preview-kerangka-container');
  if (!container) return;

  const skenario = rec.rekomendasi_skenario || {};
  const bypassList = skenario.bypass_tahap || [];

  const phases = [
    { fase: 1, nama: 'Fase 1: Perencanaan PBJ', range: [1, 2, 3] },
    { fase: 2, nama: 'Fase 2: Persiapan oleh PPK', range: [4, 5, 6, 7] },
    { fase: 3, nama: 'Fase 3: Pemilihan Penyedia', range: [8, 9] },
    { fase: 4, nama: 'Fase 4: Penetapan & TTD Kontrak', range: [10, 11, 12, 13] },
    { fase: 5, nama: 'Fase 5: Pelaksanaan Kontrak & Pengawasan', range: [14, 15] },
    { fase: 6, nama: 'Fase 6: Serah Terima, BMN & Keuangan', range: [16, 17, 18] }
  ];

  let phasesHtml = phases.map(ph => {
    let stagesHtml = ph.range.map(stNum => {
      const isBypass = bypassList.includes(stNum);
      const def = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === stNum) || { nama: `Tahap ${stNum}` };
      return `
        <div style="background:${isBypass ? '#f1f5f9' : '#ffffff'}; border:1px solid ${isBypass ? '#cbd5e1' : '#93c5fd'}; border-radius:6px; padding:6px 8px; font-size:11px; opacity:${isBypass ? 0.65 : 1};">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-weight:800; color:${isBypass ? '#64748b' : '#1e3a8a'};">T-${stNum}</span>
            <span class="badge" style="background:${isBypass ? '#94a3b8' : '#10b981'}; color:#fff; font-size:9.5px; padding:1px 5px;">
              ${isBypass ? 'Bypass' : 'Wajib'}
            </span>
          </div>
          <div style="font-weight:600; color:#334155; margin-top:2px; font-size:10.5px; text-decoration:${isBypass ? 'line-through' : 'none'};">
            ${cakraEsc(def.nama)}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
        <div style="font-size:11px; font-weight:800; color:#0f172a; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:4px;">
          ${cakraEsc(ph.nama)}
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:6px;">
          ${stagesHtml}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
        <div style="font-size:13px; font-weight:800; color:#0f172a; display:flex; align-items:center; gap:6px;">
          <span style="background:#2563eb; color:#fff; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:800;">2</span>
          <span>Kerangka Jalur Pengadaan Hulu–Hilir 6 Fase (18 Tahap)</span>
        </div>
        <span style="font-size:11px; color:#64748b;">
          Total ${18 - bypassList.length} Tahap Wajib Dilalui | ${bypassList.length} Tahap Bypass Otomatis
        </span>
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${phasesHtml}
      </div>
    </div>
  `;
}

async function submitSmartWizardPaket() {
  const rec = CakraWizardState.activeRec;
  if (!rec) {
    cakraNotify('Silakan lengkapi data paket terlebih dahulu.', 'warning');
    return;
  }

  const nama = document.getElementById('wiz-nama-paket')?.value || 'Paket Pengadaan Baru';
  const rawPagu = (document.getElementById('wiz-pagu-input')?.value || '0').replace(/[^0-9]/g, '');
  const pagu = Number(rawPagu) || 50000000;
  const akun = document.getElementById('wiz-kode-akun')?.value || '521211';
  const jenis = rec.kategori_terpilih;
  const skenario = rec.rekomendasi_skenario || {};
  const isKonstruksi = jenis.includes('Konstruksi') && !jenis.includes('Konsultansi');

  const nextNum = CakraState.pakets.length + 1;
  const payload = {
    kode_paket_internal: `CAKRA-2026-${String(nextNum).padStart(3, '0')}`,
    kode_rup: `RUP-2026-657811-0${nextNum}`,
    nama_paket: nama,
    uraian_pekerjaan: nama,
    kode_akun_mak: akun,
    nama_akun_mak: `Belanja MAK ${akun}`,
    pic_subbag: CakraWizardState.initialData?.pic_subbag || 'KUL',
    siprabu_rab_id: CakraWizardState.initialData?.siprabu_rab_id || null,
    jenis_pengadaan: jenis,
    cara_pengadaan: jenis === 'Swakelola' ? 'Swakelola Tipe I' : 'Penyedia',
    metode_pemilihan: skenario.metode_pemilihan,
    bentuk_kontrak: skenario.bentuk_kontrak,
    jenis_kontrak: isKonstruksi ? 'Gabungan Lumsum dan Harga Satuan' : 'Lumsum',
    nilai_pagu: pagu,
    nilai_hps: Math.round(pagu * 0.98),
    nilai_penawaran_awal: Math.round(pagu * 0.97),
    nilai_kontrak: Math.round(pagu * 0.96),
    jenis_pph: skenario.jenis_pph,
    tarif_pph: skenario.tarif_pph,
    penyedia_id: isKonstruksi ? 6 : 1
  };

  try {
    cakraNotify('Membuat paket dan menyusun jadwal 18 tahap otomatis...', 'info');
    const res = await cakraApiPost('/api/cakra/paket', payload);
    if (!res || !res.id) throw new Error(res.error || 'Gagal menyimpan paket');

    await cakraApiPost(`/api/cakra/paket/${res.id}/items`, {
      items: [
        {
          urutan: 1,
          uraian_item: nama,
          spesifikasi_teknis: isKonstruksi ? 'Sesuai DED, RKS, AHSP Kabupaten Ngawi & Rancangan Konseptual SMKK' : 'Sesuai KAK & Spesifikasi Teknis PPK (Prioritas PDN/TKDN)',
          satuan: 'Paket',
          volume: 1,
          persen_tkdn: 50,
          harga_survei_1: Math.round(pagu * 0.98),
          harga_survei_2: Math.round(pagu * 0.99),
          harga_hps_final: Math.round(pagu * 0.98),
          harga_negosiasi: Math.round(pagu * 0.96)
        }
      ]
    });

    closeSmartWizardModal();
    await initCakraApp();
    await openPaketInCockpit(res.id);
    cakraNotify(`Paket "${nama}" berhasil dibuat dengan alur rekomendasi ${jenis}!`, 'success');
  } catch (err) {
    cakraNotify('Gagal membuat paket: ' + err.message, 'error');
  }
}

/**
 * SUB-TAB 5: PANDUAN DO'S & DON'TS 18 TAHAP (HULU-HILIR)
 */
function buildCockpitDoDontTabHtml() {
  if (!CakraState.activePaketCtx) return '<div>Pilih paket terlebih dahulu</div>';

  const { paket, audit } = CakraState.activePaketCtx;
  const tpl = audit?.template || {};
  const bypassList = tpl.bypass_tahap || [];

  const phasesGuide = [
    {
      fase: 1,
      nama: 'FASE 1: PERENCANAAN PENGADAAN (Tahap 1–3)',
      dasarHukum: 'Pasal 18 s.d. 22 Perpres 46/2025 jo. Perlem LKPP 2/2026',
      items: [
        {
          no: 1,
          nama: 'Identifikasi Kebutuhan PBJ',
          do: 'Sinkronkan nama paket dan rincian item langsung dari RUH Belanja RKB terkunci (Baseline Sah); pastikan ketersediaan mata anggaran MAK dan pagu DIPA.',
          dont: 'Jangan merencanakan kebutuhan fiktif atau memasukkan belanja yang belum tersedia anggaran resminya.'
        },
        {
          no: 2,
          nama: 'Penetapan Jenis, Cara Pengadaan & Pemaketan',
          do: 'Alokasikan minimal 40% anggaran untuk produk Usaha Mikro, Kecil & Koperasi (Pasal 65 Perpres 46/2025); pilih penyedia kualifikasi kecil jika nilai s.d. Rp 15 Miliar.',
          dont: 'Dilarang keras memecah paket pengadaan menjadi beberapa bagian semata-mata untuk menghindari kewajiban tender atau seleksi (Pasal 20 ayat 2).'
        },
        {
          no: 3,
          nama: 'Penetapan RUP oleh KPA & Pengumuman SiRUP',
          do: 'Umumkan rencana paket pengadaan pada aplikasi SiRUP LKPP sebelum tahapan pemilihan dimulai; salin kode RUP resmi ke formulir paket.',
          dont: 'Jangan melaksanakan pemilihan penyedia atau menerbitkan kontrak sebelum paket tercatat dan diumumkan di SiRUP LKPP.'
        }
      ]
    },
    {
      fase: 2,
      nama: 'FASE 2: PERSIAPAN OLEH PPK (Tahap 4–7)',
      dasarHukum: 'Pasal 23 s.d. 28 Perpres 46/2025 jo. Perlem LKPP 2/2026 & 3/2026',
      items: [
        {
          no: 4,
          nama: 'Penetapan KAK, Spesifikasi Teknis, DED & SMKK',
          do: 'Tetapkan spesifikasi teknis dengan prioritas PDN bersertifikat TKDN; untuk pekerjaan konstruksi, wajib melampirkan Rancangan Konseptual SMKK / RKK Keselamatan Konstruksi sesuai Permen PUPR 10/2021 & Lampiran II Perlem LKPP 3/2026.',
          dont: 'Dilarang mengunci spesifikasi pada merk tertentu (brand lock) kecuali untuk suku cadang, komponen katalog, atau lisensi yang sudah ada.'
        },
        {
          no: 5,
          nama: 'Analisa Pasar & Penilaian E-Katalog V6',
          do: 'Lakukan penelusuran etalase pada Katalog Elektronik Versi 6 sesuai Keputusan Kepala LKPP Nomor 177 Tahun 2024; prioritaskan transaksi E-Purchasing jika barang/jasa tersedia.',
          dont: 'Jangan beralih ke pengadaan manual non-katalog tanpa menyusun Dokumen Penilaian PPK yang memuat alasan teknis dan efisiensi harga.'
        },
        {
          no: 6,
          nama: 'Penyusunan Referensi Harga / HPS / AHSP',
          do: 'Untuk E-Purchasing s.d. Rp 100 Juta: gunakan Kertas Kerja Referensi Harga survei etalase katalog (BEBAS HPS FORMAL sesuai Kepka LKPP 177/2024 jo. Pasal 9 Perlem LKPP 2/2026). Untuk konstruksi: wajib menyusun HPS berbasis AHSP Kabupaten Ngawi & DED.',
          dont: 'Nilai HPS atau Referensi Harga tidak boleh melampaui Pagu Anggaran DIPA/RKB (HPS <= Pagu). Dilarang membocorkan rincian perhitungan HPS kepada penyedia.'
        },
        {
          no: 7,
          nama: 'Penyusunan Rancangan Kontrak (SSUK & SSKK)',
          do: 'Pilih bentuk kontrak sesuai batasan nilai: Bukti Pembelian (<= 10 Jt), Kuitansi (<= 50 Jt), SPK (<= 200 Jt / Konstruksi <= 400 Jt), Surat Pesanan (E-Katalog), atau Surat Perjanjian. Cantumkan klausul uang muka UMK (wajib jika diminta: 50% untuk s.d. 200 Jt, 30% untuk s.d. 2.5 M).',
          dont: 'Jangan memasukkan syarat kualifikasi diskriminatif yang memberatkan penyedia usaha kecil dan koperasi di luar standar baku LKPP.'
        }
      ]
    },
    {
      fase: 3,
      nama: 'FASE 3: PEMILIHAN PENYEDIA (Tahap 8–9)',
      dasarHukum: 'Pasal 38 s.d. 43 Perpres 46/2025 jo. Kepka LKPP 177/2024 & Perlem LKPP 3/2026',
      items: [
        {
          no: 8,
          nama: 'Penyerahan DPP & Reviu Persiapan Pengadaan',
          do: 'PPK menyerahkan DPP lengkap ke Pejabat Pengadaan / Pokja; laksanakan reviu bersama dan tanda tangani Berita Acara Reviu DPP sebelum proses pemilihan rekanan.',
          dont: 'Pejabat Pengadaan / Pokja dilarang memulai proses pemilihan jika berkas DPP belum diserahkan dan disetujui bersama secara resmi.'
        },
        {
          no: 9,
          nama: 'Pelaksanaan Pemilihan / Negosiasi / BAHPL / E-Purchasing',
          do: 'Untuk transaksi E-Purchasing Katalog V6, manfaatkan fitur Negosiasi Digital atau Mini-Kompetisi sesuai Kepka LKPP 177/2024 Lampiran III. Lakukan negosiasi harga serendah mungkin untuk menghasilkan penghematan anggaran (efisiensi belanja negara).',
          dont: 'Nilai hasil penawaran akhir / negosiasi dilarang melampaui nilai HPS/Referensi Harga. Dilarang menunjuk penyedia yang terkena sanksi Daftar Hitam LKPP.'
        }
      ]
    },
    {
      fase: 4,
      nama: 'FASE 4: PENETAPAN & TTD KONTRAK (Tahap 10–13)',
      dasarHukum: 'Pasal 27 s.d. 35 Perpres 46/2025 jo. Perpres 13/2018 (Prinsip BO) & Perlem 3/2026',
      items: [
        {
          no: 10,
          nama: 'Reviu Hasil Pemilihan & Validasi Beneficial Ownership (BO)',
          do: 'PPK mereviu kesesuaian prosedur pemilihan dan wajib memvalidasi data Pemilik Manfaat Akhir (Beneficial Ownership) rekanan untuk mencegah konflik kepentingan.',
          dont: 'Jangan memproses perikatan kontrak dengan penyedia yang memiliki afiliasi kepentingan keluarga atau jabatan dengan pengelola pengadaan KPU.'
        },
        {
          no: 11,
          nama: 'Penerbitan SPPBJ & Permintaan Jaminan Pelaksanaan',
          do: 'Jika pengadaan via E-Purchasing <= 200 Jt atau Pengadaan Langsung: tahap ini dilewati otomatis (Bypass). Jika tender > 200 Jt: terbitkan SPPBJ dan wajib meminta Jaminan Pelaksanaan 5% sebelum kontrak.',
          dont: 'Jangan menagih jaminan pelaksanaan untuk jasa konsultansi atau pengadaan bernilai s.d. Rp 200 Juta (Pasal 30 Perpres 46/2025).'
        },
        {
          no: 12,
          nama: 'Rapat Persiapan Penandatanganan Kontrak (Pre-Award)',
          do: 'Klarifikasi keaslian dokumen perizinan berusaha, nomor rekening bank atas nama badan usaha, dan kesiapan tim lapangan sebelum penandatanganan kontrak.',
          dont: 'Jangan menyepakati perubahan harga penawaran atau penurunan spesifikasi teknis saat rapat persiapan penandatanganan kontrak.'
        },
        {
          no: 13,
          nama: 'Penandatanganan Kontrak Resmi',
          do: 'Tandatangani kontrak (SPK / Surat Perjanjian / Surat Pesanan) bermeterai cukup; lampirkan KAK, spesifikasi, rincian penawaran, dan jaminan pelaksanaan jika dipersyaratkan.',
          dont: 'Jangan pernah menandatangani kontrak dengan tanggal mundur (backdate) mendahului tanggal berita acara pemilihan penyedia.'
        }
      ]
    },
    {
      fase: 5,
      nama: 'FASE 5: PELAKSANAAN KONTRAK & PENGAWASAN (Tahap 14–15)',
      dasarHukum: 'Bab V Lampiran I/II Perlem LKPP 3/2026',
      items: [
        {
          no: 14,
          nama: 'Penerbitan Surat Perintah Mulai Kerja (SPMK) / Surat Pesanan',
          do: 'Terbitkan SPMK selambat-lambatnya 7 hari kerja sejak kontrak ditandatangani; untuk Surat Pesanan E-Katalog, sistem pesanan digital berlaku langsung sebagai perintah kerja.',
          dont: 'Penyedia dilarang memulai pekerjaan fisik di lapangan sebelum menerima SPMK resmi atau pesanan e-katalog terkonfirmasi.'
        },
        {
          no: 15,
          nama: 'Pengawasan Progres, Reviu Lapangan & SCM',
          do: 'PPK bersama Tim Teknis mengawasi jadwal dan mutu pelaksanaan; jika deviasi keterlambatan fisik mencapai -10% (Periode I) atau -5% (Periode II), PPK wajib menerbitkan Surat Peringatan dan menggelar Rapat Show Cause Meeting (SCM).',
          dont: 'Jangan membiarkan keterlambatan pekerjaan tanpa teguran tertulis berjenjang dan dokumentasi rapat pembuktian keterlambatan.'
        }
      ]
    },
    {
      fase: 6,
      nama: 'FASE 6: SERAH TERIMA, BMN & KEUANGAN (Tahap 16–18)',
      dasarHukum: 'Pasal 57 Perpres 46/2025 jo. Kepka LKPP 177/2024 & Perlem 3/2026',
      items: [
        {
          no: 16,
          nama: 'Serah Terima Hasil Pekerjaan (BAST / PHO / Retensi)',
          do: 'Lakukan pemeriksaan fisik dan uji fungsi barang/jasa; terbitkan BAST; untuk pekerjaan konstruksi, terbitkan Berita Acara PHO (Provisional Hand Over) dan tahan retensi 5% atau jaminan pemeliharaan selama masa pemeliharaan (3-6 bulan) hingga FHO.',
          dont: 'Jangan menandatangani BAST 100% jika masih terdapat cacat mutu, volume belum lengkap, atau barang belum diserahterimakan di lokasi tujuan.'
        },
        {
          no: 17,
          nama: 'Penyelesaian Keuangan, Perpajakan & SPP/SPM',
          do: 'Potong PPh secara tepat (PPh 22 Barang 1,5%, PPh 23 Jasa 2%, PPh Final Konstruksi Kecil SBU K1/K2/K3 1,75%); jika ada keterlambatan hari kalender, kenakan sanksi denda 1 permil (1/1000) per hari dari nilai kontrak sebelum PPN (DPP); serahkan berkas lengkap ke Bendahara Pengeluaran / PPSPM.',
          dont: 'Dilarang memproses pembayaran tanpa kuitansi bermeterai, faktur pajak valid, dan Berita Acara Serah Terima (BAST) yang sah.'
        },
        {
          no: 18,
          nama: 'Penilaian Kinerja Penyedia & Pencatatan BMN',
          do: 'PPK wajib mengisi Evaluasi Penilaian Kinerja Penyedia (4 kriteria: Kualitas, Biaya, Waktu, Layanan) pada aplikasi E-Katalog V6 / SI-PRABU sesuai Kepka LKPP 177/2024 jo. Pasal 8 Perlem LKPP 2/2026; laporkan barang modal untuk registrasi SIMAK BMN / Sakti.',
          dont: 'Jangan mengabaikan pengisian skor kinerja penyedia karena data ini terkoneksi secara nasional untuk mitigasi risiko pengadaan berikutnya.'
        }
      ]
    }
  ];

  const htmlPhases = phasesGuide.map(ph => {
    const cards = ph.items.map(it => {
      const isBypass = bypassList.includes(it.no);
      return `
        <div style="background:${isBypass ? '#f8fafc' : '#ffffff'}; border:1px solid ${isBypass ? '#cbd5e1' : '#e2e8f0'}; border-radius:8px; padding:12px; opacity:${isBypass ? 0.7 : 1}; margin-bottom:8px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="font-weight:800; font-size:12.5px; color:#0f172a;">
              <span class="badge" style="background:${isBypass ? '#64748b' : '#2563eb'}; color:#fff; font-size:10px; margin-right:6px;">Tahap ${it.no}</span>
              ${cakraEsc(it.nama)}
            </div>
            ${isBypass ? '<span class="badge" style="background:#059669; color:#fff; font-size:10px;">⏭️ Dilewati Sesuai Regulasi (Bypass)</span>' : '<span class="badge" style="background:#10b981; color:#fff; font-size:10px;">Wajib Dilalui</span>'}
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:8px 10px;">
              <div style="font-size:11px; font-weight:800; color:#166534; display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                <span>✅ DO (Yang Wajib Dilakukan):</span>
              </div>
              <div style="font-size:11px; color:#14532d; line-height:1.4;">
                ${cakraEsc(it.do)}
              </div>
            </div>
            <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:6px; padding:8px 10px;">
              <div style="font-size:11px; font-weight:800; color:#991b1b; display:flex; align-items:center; gap:4px; margin-bottom:2px;">
                <span>❌ DON'T (Larangan &amp; Risiko Temuan):</span>
              </div>
              <div style="font-size:11px; color:#7f1d1d; line-height:1.4;">
                ${cakraEsc(it.dont)}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div style="background:#ffffff; border:1.5px solid #cbd5e1; border-radius:10px; padding:14px 16px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px; border-bottom:1.5px solid #e2e8f0; padding-bottom:8px;">
          <div>
            <h4 style="margin:0; font-size:14px; font-weight:800; color:#1e3a8a;">${cakraEsc(ph.nama)}</h4>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Dasar Hukum: ${cakraEsc(ph.dasarHukum)}</div>
          </div>
          <span class="badge" style="background:#3b82f6; color:#fff; font-size:10px; font-weight:700;">Standar Audit KPU</span>
        </div>
        <div>${cards}</div>
      </div>
    `;
  }).join('');

  return `
    <!-- HEADER PANDUAN DO & DONT -->
    <div style="background:#eff6ff; border:1.5px solid #3b82f6; border-radius:10px; padding:14px 18px; margin-bottom:16px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
        <div>
          <span class="badge" style="background:#1d4ed8; color:#fff; font-size:11px; font-weight:800; padding:3px 8px; border-radius:4px;">
            ${cakraEsc(tpl.id || 'TPL')} - ${cakraEsc(tpl.nama || 'Skenario')}
          </span>
          <h3 style="margin:6px 0 2px; font-size:16px; font-weight:800; color:#0f172a;">
            🧭 Pemanduan Interaktif Do's &amp; Don'ts 18 Tahap Hulu–Hilir
          </h3>
          <div style="font-size:12px; color:#1e40af; font-weight:600;">
            Paket: "${cakraEsc(paket.nama_paket)}" | Kategori: ${cakraEsc(paket.jenis_pengadaan)} | Pagu: ${cakraFmtRp(paket.nilai_pagu)}
          </div>
        </div>
        <div style="text-align:right;">
          <span class="badge" style="background:#10b981; color:#fff; font-size:11px; font-weight:700; padding:4px 8px;">
            Regulasi 2025/2026 Aktif
          </span>
          <div style="font-size:11px; color:#475569; margin-top:4px;">
            Kepka LKPP 177/2024, Perpres 46/2025, Perlem 2 &amp; 3/2026
          </div>
        </div>
      </div>
      <div style="font-size:12px; color:#334155; margin-top:10px; line-height:1.45; background:#ffffff; padding:10px 14px; border-radius:6px; border:1px solid #bfdbfe;">
        💡 Panduan di bawah ini memuat panduan operasional praktis (<strong>DO</strong>) serta hal-hal yang dilarang dan berisiko menjadi temuan auditor Inspektorat/BPK (<strong>DON'T</strong>) untuk setiap tahapan pengadaan.
      </div>
    </div>

    <!-- DAFTAR FASE & TAHAPAN -->
    <div>${htmlPhases}</div>
  `;
}

// Window exports addition
window.recommendJenisPengadaan = recommendJenisPengadaan;
window.openSmartWizardModal = openSmartWizardModal;
window.closeSmartWizardModal = closeSmartWizardModal;
window.formatWizardPagu = formatWizardPagu;
window.setWizardPagu = setWizardPagu;
window.onWizardInputChange = onWizardInputChange;
window.applyWizardSuggestedCategory = applyWizardSuggestedCategory;
window.submitSmartWizardPaket = submitSmartWizardPaket;
window.buildCockpitDoDontTabHtml = buildCockpitDoDontTabHtml;
window.checkCockpitStageGuardrail = checkCockpitStageGuardrail;
window.closeGuardrailModal = closeGuardrailModal;
window.onGuardrailTetapLanjut = onGuardrailTetapLanjut;
window.onGuardrailLengkapiPrasyarat = onGuardrailLengkapiPrasyarat;

// Window exports
window.openSimulatorPengadaanModal = openSimulatorPengadaanModal;
window.closeSimulatorPengadaanModal = closeSimulatorPengadaanModal;
window.onSimulatorJenisChange = onSimulatorJenisChange;
window.formatSimulatorPaguInput = formatSimulatorPaguInput;
window.setSimulatorPaguPreset = setSimulatorPaguPreset;
window.jalankanSimulasiPengadaan = jalankanSimulasiPengadaan;
window.terapkanSimulasiKePaketBaru = terapkanSimulasiKePaketBaru;
window.applyTemplateBakuToCurrentForm = applyTemplateBakuToCurrentForm;
window.selesaikanTahapDanLanjut = selesaikanTahapDanLanjut;


window.addEventListener('DOMContentLoaded', () => {
  setTimeout(initCakraApp, 350);
});


/**
 * 6 FASE RESMI PENGADAAN (SI-PRABU)
 * WORKSPACE ENGINE BERSIH BERBASIS FASE & TAHAP AKTIF
 */
const FASE_PBJ_CONFIG = [
  {
    fase: 1,
    nama: 'Fase I: Perencanaan Pengadaan',
    deskripsi: 'Identifikasi kebutuhan dari DIPA/RKB sah, penetapan cara & pemaketan, serta pengumuman RUP di SiRUP LKPP.',
    dasarHukum: 'Perpres 16/2018 jo. 46/2025 Pasal 18-22, Perlem LKPP No. 11/2021',
    stages: [1, 2, 3]
  },
  {
    fase: 2,
    nama: 'Fase II: Persiapan Pengadaan oleh PPK',
    deskripsi: 'Penetapan spesifikasi teknis/KAK & TKDN, analisa pasar katalog v6, penyusunan HPS/referensi harga, dan rancangan kontrak.',
    dasarHukum: 'Perpres 46/2025 Pasal 25-28, Kepka LKPP No. 177/2024, Perlem LKPP 2 & 3/2026',
    stages: [4, 5, 6, 7]
  },
  {
    fase: 3,
    nama: 'Fase III: Pemilihan Penyedia',
    deskripsi: 'Penyerahan DPP ke Pokja/Pejabat Pengadaan, pelaksanaan pemilihan, negosiasi digital katalog v6, hingga penetapan BAHPL.',
    dasarHukum: 'Perpres 46/2025 Pasal 38-44, Kepka LKPP No. 177/2024, Kepka LKPP 93/2025',
    stages: [8, 9]
  },
  {
    fase: 4,
    nama: 'Fase IV: Penandatanganan Kontrak & SPPBJ',
    deskripsi: 'Reviu hasil pemilihan & validasi legalitas vendor, penerbitan SPPBJ, jaminan pelaksanaan, rapat PAM, dan penandatanganan naskah kontrak final.',
    dasarHukum: 'Perpres 46/2025 Pasal 28-33 (Uang Muka 50% UMK), Perlem LKPP No. 3/2026',
    stages: [10, 11, 12, 13]
  },
  {
    fase: 5,
    nama: 'Fase V: Pelaksanaan Kontrak',
    deskripsi: 'Penyerahan lokasi (MC-0), penerbitan SPMK/Surat Pesanan, monitoring fisik kurva S, rapat pembuktian SCM, dan adendum/CCO.',
    dasarHukum: 'Perlem LKPP No. 3/2026 Lampiran I-III (Kontrak Kritis SCM & Adendum)',
    stages: [14, 15]
  },
  {
    fase: 6,
    nama: 'Fase VI: Serah Terima, Pembayaran & BMN',
    deskripsi: 'Pemeriksaan hasil pekerjaan (BAPHP), BAST/PHO, BAST ke KPA untuk pencatatan BMN, perhitungan pajak & denda, dan penilaian kinerja penyedia.',
    dasarHukum: 'Perpres 46/2025 Pasal 57-58, PMK Standar Pajak, Perlem LKPP No. 4/2021 (Blacklist)',
    stages: [16, 17, 18]
  }
];


/**
 * =============================================================================
 * SISTEM MEJA KERJA KOKPIT 18 TAHAP SERAGAM (STANDAR AUDIT-READY SI-PRABU v3.0)
 * 100% FORM MATI (NON-EDITABLE RESUME) DI MEJA KERJA.
 * SELURUH PERUBAHAN DATA & TAUTAN GOOGLE DRIVE HANYA MELALUI POP-UP MODAL.
 * =============================================================================
 */

function buildStageSpecificResumeBody(stageNo, paket, activeTRow, items, penyedia, rekomendasi) {
  const num = Number(stageNo);
  const autoDocNo = (n, tgl) => generateAutoStageDocNumber(n, paket.kode_paket_internal, tgl);

  switch (num) {
    case 3:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Kode RUP SiRUP LKPP</div>
            <div style="font-size:14px; font-weight:800; color:#1e40af;" class="cakra-mono">${cakraEsc(paket.kode_rup || 'RUP-2026-657811-01')}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Terumumkan di Portal Resmi SiRUP LKPP</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Status Paket dalam Alur RUP</div>
            <div style="font-size:14px; font-weight:800; color:#15803d;">${cakraEsc(paket.status_paket || 'Perencanaan')}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Sesuai Alur RUP SiRUP LKPP</div>
          </div>
          <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#166534; text-transform:uppercase; margin-bottom:4px;">Afirmasi UMK / Koperasi</div>
            <div style="font-size:14px; font-weight:800; color:#15803d;">✅ Alokasi 100% UMK</div>
            <div style="font-size:11px; color:#166534; margin-top:2px;">Wajib Min. 40% (Pasal 65 Perpres 46/2025)</div>
          </div>
        </div>
      `;

    case 4:
      return `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Uraian Spesifikasi Teknis / KAK PPK</div>
            <div style="font-size:12.5px; color:#1e293b; line-height:1.6; white-space:pre-wrap;">${cakraEsc(paket.uraian_pekerjaan || 'Spesifikasi teknis ditetapkan berbasis output fungsional, standar pabrikan resmi, dan garansi purna jual.')}</div>
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Hierarki Prioritas PDN &amp; TKDN</div>
              <div style="font-size:13px; font-weight:800; color:#15803d;">${cakraEsc(paket.prioritas_pdn_level || 'Level 1: TKDN >= 25% (TKDN+BMP >= 40%)')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Kepatuhan Pasal 66 Perpres PBJ</div>
            </div>
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Target Masa Pelaksanaan</div>
              <div style="font-size:13px; font-weight:800; color:#0f172a;">${Number(paket.masa_pelaksanaan_hari || 14)} Hari Kalender</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Dihitung sejak SPMK diterbitkan</div>
            </div>
          </div>
        </div>
      `;

    case 5:
      const cardItems = CakraState.activePaketCtx?.items || [];
      let totalAlternatifs = 0;
      let totalLolosUji = 0;
      let sumberCounts = {};
      let minTotalSurvei = 0;
      let maxTotalSurvei = 0;
      let itemSummaries = [];

      cardItems.forEach((it, idx) => {
        let alts = [];
        if (it.evaluasi_pasar_json && typeof it.evaluasi_pasar_json === 'object' && Array.isArray(it.evaluasi_pasar_json.alternatifs) && it.evaluasi_pasar_json.alternatifs.length) {
          alts = it.evaluasi_pasar_json.alternatifs;
        } else {
          const s1 = Number(it.harga_survei_1) || 0;
          const s2 = Number(it.harga_survei_2) || s1;
          const s3 = Number(it.harga_survei_3) || s1;
          alts = [
            { alt_no: 1, jenis_sumber: 'Katalog Elektronik (E-Katalog v6)', sumber: it.sumber_survei_1 || 'PT. Astra Graphia', harga: s1, skor: 5, sla_hari: 14, garansi: '3 Tahun' },
            { alt_no: 2, jenis_sumber: 'Toko Daring / Marketplace (Olshop)', sumber: it.sumber_survei_2 || 'Bhinneka.com', harga: s2, skor: 5, sla_hari: 10, garansi: '3 Tahun' },
            { alt_no: 3, jenis_sumber: idx === 0 ? 'Penyedia / Toko Konvensional (Offline)' : 'Riwayat Kontrak / Pengadaan Sebelumnya', sumber: it.sumber_survei_3 || 'Mitra Mandiri', harga: s3, skor: 5, sla_hari: 14, garansi: '3 Tahun' }
          ];
        }

        totalAlternatifs += alts.length;
        const prices = alts.map(a => Number(a.harga || 0)).filter(p => p > 0);
        const minP = prices.length ? Math.min(...prices) : Number(it.harga_satuan_hps || 0);
        const maxP = prices.length ? Math.max(...prices) : minP;
        const vol = Number(it.volume || 1);

        minTotalSurvei += (minP * vol);
        maxTotalSurvei += (maxP * vol);

        let lolosInItem = 0;
        alts.forEach(a => {
          const rawJns = (a.jenis_sumber || 'Katalog Elektronik (E-Katalog v6)');
          const jnsClean = rawJns.replace(/\s*\(.*\)/, '').trim();
          sumberCounts[jnsClean] = (sumberCounts[jnsClean] || 0) + 1;
          const score = Number(a.skor !== undefined ? a.skor : (Number(a.p1||0)+Number(a.p2||0)+Number(a.p3||0)+Number(a.p4||0)+Number(a.p5||0)));
          if (score === 5) {
            lolosInItem++;
            totalLolosUji++;
          }
        });

        itemSummaries.push({
          nama: it.uraian_item || ('Item ' + (idx + 1)),
          vol: `${vol} ${it.satuan || 'Unit'}`,
          countAlt: alts.length,
          lolosCount: lolosInItem,
          minPrice: minP,
          maxPrice: maxP,
          paguUnit: Number(it.harga_satuan_hps || 0)
        });
      });

      const paguCard = Number(paket.nilai_pagu || 145000000);
      const efisiensiSurvei = Math.max(0, paguCard - minTotalSurvei);
      const spreadPasar = Math.max(0, maxTotalSurvei - minTotalSurvei);

      return `
        <!-- 4 KARTU METRIK UTAMA ANALISA PASAR -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:10px; margin-bottom:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:3px;">Status Ketersediaan Katalog v6</div>
            <div style="font-size:13px; font-weight:800; color:#15803d;">${cakraEsc(paket.tersedia_di_katalog || 'Ya, Tersedia & Sesuai')}</div>
            <div style="font-size:10.5px; color:#64748b; margin-top:2px;">Metode: ${cakraEsc(paket.sub_metode_epurchasing || 'Negosiasi Harga')}</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:3px;">Pengujian 5 Parameter Baku</div>
            <div style="font-size:13px; font-weight:800; color:#1e3a8a;">${totalLolosUji}/${totalAlternatifs} Alternatif Lolos Uji</div>
            <div style="font-size:10.5px; color:#15803d; margin-top:2px;">100% Memenuhi KAK (Pasal 8 Perlem 2/2026)</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:3px;">Estimasi Pasar Terendah</div>
            <div style="font-size:13px; font-weight:800; color:#047857;">Rp ${minTotalSurvei.toLocaleString('id-ID')}</div>
            <div style="font-size:10.5px; color:#047857; margin-top:2px;">Potensi Efisiensi: Rp ${efisiensiSurvei.toLocaleString('id-ID')} vs Pagu</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:3px;">Rentang Komparasi Pasar</div>
            <div style="font-size:13px; font-weight:800; color:#0f172a;">Rp ${minTotalSurvei.toLocaleString('id-ID')} s.d. Rp ${maxTotalSurvei.toLocaleString('id-ID')}</div>
            <div style="font-size:10.5px; color:#64748b; margin-top:2px;">Selisih Spread Pasar: Rp ${spreadPasar.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <!-- RESUME KUANTITATIF SUMBER SURVEI & KANAL PASAR -->
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <div style="font-size:11px; font-weight:800; color:#166534; text-transform:uppercase; display:flex; align-items:center; gap:8px;">
              <span>🌐 Resume Ragam Sumber Survei Pasar:</span>
              <span class="cakra-badge cakra-badge-green" style="font-size:10px; font-weight:800;">${totalAlternatifs} Alternatif Disurvei</span>
              <span class="cakra-badge cakra-badge-blue" style="font-size:10px; font-weight:800;">${Object.keys(sumberCounts).length} Kanal Sumber</span>
            </div>
            <div style="font-size:10.5px; color:#15803d; font-weight:700;">
              Pasal 26 Perpres PBJ jo. Kepka LKPP 177/2024
            </div>
          </div>

          <!-- PILLS KANAL SUMBER -->
          <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px;">
            ${Object.entries(sumberCounts).map(([k, v]) => `
              <div style="background:#ffffff; border:1px solid #86efac; border-radius:6px; padding:4px 10px; font-size:11px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
                <span style="font-weight:700; color:#0f172a;">${cakraEsc(k)}:</span>
                <span style="font-weight:800; color:#15803d; background:#dcfce7; padding:1px 6px; border-radius:4px;">${v} Rekanan / Produk</span>
              </div>
            `).join('')}
          </div>

          <!-- GAMBARAN KOMPARASI DETAIL PER ITEM BARANG -->
          <div style="background:#ffffff; border:1px solid #dcfce7; border-radius:6px; padding:10px 12px; font-size:11px;">
            <div style="font-weight:800; color:#166534; margin-bottom:6px; font-size:11px; text-transform:uppercase;">
              📊 Gambaran Hasil Komparasi Pasar per Item Kebutuhan:
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${itemSummaries.map((it, idx) => `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; padding:4px 0; border-bottom:${idx < itemSummaries.length - 1 ? '1px dashed #e2e8f0' : 'none'};">
                  <div>
                    <strong style="color:#0f172a; font-size:11.5px;">Item ${idx + 1}: ${cakraEsc(it.nama)}</strong>
                    <span style="color:#64748b; margin-left:6px; font-weight:600;">(${it.vol})</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:8px; font-size:11px;">
                    <span style="color:#0284c7; font-weight:700;">Disurvei: ${it.countAlt} Alternatif (${it.lolosCount}/${it.countAlt} Lolos Uji)</span>
                    <span style="color:#cbd5e1;">|</span>
                    <span style="color:#047857; font-weight:800;">Harga Terendah: Rp ${it.minPrice.toLocaleString('id-ID')}</span>
                    <span style="color:#64748b; font-size:10px;">(Pagu KAK: Rp ${it.paguUnit.toLocaleString('id-ID')})</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- JUSTIFIKASI FORMAL PPK -->
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px 12px;">
          <div style="font-size:11px; font-weight:700; color:#334155; margin-bottom:4px;">Justifikasi Formal PPK &amp; Opsi Multi-Order:</div>
          <div style="font-size:11.5px; color:#1e293b; line-height:1.45;">${cakraEsc(paket.alasan_penilaian_ppk_katalog || 'Seluruh item memenuhi 5 parameter baku kelayakan. Transaksi dapat menggunakan Skenario Tunggal maupun Multi-Order.')}</div>
        </div>
      `;

    case 6:
      const t6Items = items || CakraState.activePaketCtx?.items || [];
      const paguHps = Number(paket.nilai_pagu || 145000000);
      const totalHpsVal = Number(paket.nilai_hps || 0) || t6Items.reduce((acc, it) => acc + (Number(it.volume || 1) * Number(it.harga_satuan_hps || it.harga_survei_1 || 0)), 0);
      const selisihEfi = Math.max(0, paguHps - totalHpsVal);
      const persenEfi = paguHps > 0 ? (selisihEfi / paguHps) * 100 : 0;
      const isOverPagu = totalHpsVal > paguHps && paguHps > 0;
      const isRefHarga = String(paket.jenis_kertas_harga || '').includes('Referensi Harga');
      const metodeSummary = {};
      t6Items.forEach(it => {
        const m = it.metode_penentuan_hps || 'Terendah';
        metodeSummary[m] = (metodeSummary[m] || 0) + 1;
      });

      return `
        <!-- 4 KARTU METRIK UTAMA PENETAPAN HPS & PENGENDALIAN ANGGARAN -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:10px; margin-bottom:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:3px;">Kertas Kerja Penetapan Harga</div>
            <div style="font-size:13.5px; font-weight:800; color:#b45309;">${cakraEsc(paket.jenis_kertas_harga || 'HPS')}</div>
            <div style="font-size:10.5px; color:#64748b; margin-top:2px;">Pasal 26 Perpres PBJ (PPK Satker 657811)</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px;">
            <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:3px;">Batas Tertinggi Pagu DIPA</div>
            <div style="font-size:14px; font-weight:900; color:#0f172a;">${cakraFmtRp(paguHps)}</div>
            <div style="font-size:10.5px; color:#64748b; margin-top:2px;">Batas Maksimum Belanja Satker</div>
          </div>
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px;">
            <div style="font-size:10px; font-weight:700; color:#1e40af; text-transform:uppercase; margin-bottom:3px;">Total Nilai HPS Ditetapkan</div>
            <div style="font-size:15px; font-weight:900; color:#1e3a8a;">${cakraFmtRp(totalHpsVal)}</div>
            <div style="font-size:10.5px; color:#1e40af; margin-top:2px;">Termasuk PPN 11% &amp; Keuntungan Wajar</div>
          </div>
          <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px;">
            <div style="font-size:10px; font-weight:700; color:#166534; text-transform:uppercase; margin-bottom:3px;">Efisiensi Anggaran Kas Negara</div>
            <div style="font-size:14px; font-weight:900; color:#15803d;">${cakraFmtRp(selisihEfi)}</div>
            <div style="font-size:10.5px; color:#15803d; margin-top:2px;">Penghematan: ${persenEfi.toFixed(2)}% vs Pagu DIPA</div>
          </div>
        </div>

        <!-- BANNER VALIDASI KEPATUHAN REGULASI HPS (PASAL 26 PERPRES PBJ) -->
        ${!isOverPagu ? `
          <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:10px 14px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="font-size:11.5px; font-weight:800; color:#065f46; display:flex; align-items:center; gap:6px;">
                <span>✅ STATUS REGULASI: MEMENUHI KETENTUAN PASAL 26 AYAT 3 PERPRES 16/2018 JO 46/2025</span>
                <span class="cakra-badge cakra-badge-green" style="font-size:9.5px; font-weight:800;">HPS &lt;= PAGU DIPA</span>
              </div>
              <div style="font-size:11px; color:#047857; margin-top:2px;">
                Total HPS berada di bawah batas pagu DIPA dengan potensi penghematan kas negara sebesar <b>${cakraFmtRp(selisihEfi)} (${persenEfi.toFixed(2)}%)</b>.
              </div>
            </div>
            <div style="font-size:10.5px; color:#065f46; font-weight:700; text-align:right;">
              Kerahasiaan Rincian HPS Terjamin (Pasal 26 ayat 7)
            </div>
          </div>
        ` : `
          <div style="background:#fef2f2; border:1px solid #f87171; border-radius:8px; padding:10px 14px; margin-bottom:12px;">
            <div style="font-size:11.5px; font-weight:800; color:#991b1b;">
              ⚠️ PERINGATAN: TOTAL HPS MELEBIHI PAGU ANGGARAN DIPA!
            </div>
            <div style="font-size:11px; color:#b91c1c; margin-top:2px;">
              Total HPS (${cakraFmtRp(totalHpsVal)}) melampaui Pagu DIPA (${cakraFmtRp(paguHps)}). PPK dilarang menetapkan HPS di atas pagu (Pasal 26 ayat 3).
            </div>
          </div>
        `}

        <!-- DISTRIBUSI METODE PENETAPAN HPS PER ITEM -->
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; margin-bottom:6px;">
            <div style="font-size:11px; font-weight:800; color:#1e40af; text-transform:uppercase; display:flex; align-items:center; gap:8px;">
              <span>🎯 Metode Penetapan Harga Satuan:</span>
              <span class="cakra-badge cakra-badge-blue" style="font-size:10px; font-weight:800;">${t6Items.length} Item Komponen</span>
              <span class="cakra-badge cakra-badge-amber" style="font-size:10px; font-weight:800;">${Object.keys(metodeSummary).length} Ragam Metode</span>
            </div>
            <div style="font-size:10.5px; color:#64748b; font-weight:600;">
              Lampiran I Peraturan LKPP Nomor 3 Tahun 2026
            </div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${Object.entries(metodeSummary).map(([met, count]) => `
              <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:6px; padding:4px 10px; font-size:11px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
                <span style="font-weight:700; color:#1e3a8a;">${cakraEsc(met)}:</span>
                <span style="font-weight:800; color:#1e40af; background:#dbeafe; padding:1px 6px; border-radius:4px;">${count} Item Komponen</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- TABEL RINCIAN PENETAPAN HARGA SATUAN HPS PER ITEM -->
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
            <div style="font-size:11.5px; font-weight:800; color:#1e3a8a; text-transform:uppercase;">
              📋 Rincian Penetapan Harga Satuan HPS per Item Barang / Jasa:
            </div>
            <div style="font-size:10.5px; color:#64748b; font-weight:600;">
              Disahkan Tunggal oleh PPK (Tanpa Pejabat Pengadaan)
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${t6Items.length ? t6Items.map((it, idx) => {
              const vol = Number(it.volume || 1);
              const hpsSatuan = Number(it.harga_satuan_hps || it.harga_survei_1 || 0);
              const subtotal = vol * hpsSatuan;
              const s1 = Number(it.harga_survei_1 || 0);
              const s2 = Number(it.harga_survei_2 || 0);
              const s3 = Number(it.harga_survei_3 || 0);

              return `
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:9px 12px; font-size:11px;">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; flex-wrap:wrap; gap:6px;">
                    <div>
                      <strong style="color:#0f172a; font-size:12px;">${idx + 1}. ${cakraEsc(it.uraian_item)}</strong>
                      <span class="cakra-badge cakra-badge-secondary" style="font-size:9.5px; margin-left:6px;">${cakraEsc(it.satuan || 'Unit')}</span>
                      <span class="cakra-badge cakra-badge-info" style="font-size:9.5px; margin-left:4px;">Vol: ${vol}</span>
                      ${it.pic_subbag_pengguna ? `<span class="cakra-badge cakra-badge-success" style="font-size:9.5px; margin-left:4px;">Subbag: ${cakraEsc(it.pic_subbag_pengguna)}</span>` : ''}
                    </div>
                    <div style="text-align:right;">
                      <span style="font-size:10px; color:#64748b; text-transform:uppercase; font-weight:700;">Subtotal HPS Item: </span>
                      <strong style="font-size:13.5px; color:#1e40af;">${cakraFmtRp(subtotal)}</strong>
                    </div>
                  </div>
                  <div style="font-size:10.5px; color:#475569; margin-bottom:6px; line-height:1.4;">
                    Spek: ${cakraEsc(it.spesifikasi_teknis || '-')}
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px; padding-top:6px; border-top:1px dashed #cbd5e1; font-size:10.5px;">
                    <div style="display:flex; gap:10px; color:#64748b; flex-wrap:wrap;">
                      <span>1. Katalog: <b style="color:#1e40af;">${s1 ? cakraFmtRp(s1) : '-'}</b></span>
                      <span>2. Toko/Pasar: <b style="color:#166534;">${s2 ? cakraFmtRp(s2) : '-'}</b></span>
                      <span>3. SBM: <b style="color:#6b21a8;">${s3 ? cakraFmtRp(s3) : '-'}</b></span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span class="cakra-badge cakra-badge-amber" style="font-size:9.5px; font-weight:700;">Metode: ${cakraEsc(it.metode_penentuan_hps || 'Terendah')}</span>
                      <span style="color:#0f172a; font-weight:800; font-size:11px;">HPS Satuan: ${cakraFmtRp(hpsSatuan)}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('') : `
              <div style="font-size:11.5px; color:#64748b; padding:12px; text-align:center; background:#f8fafc; border-radius:6px;">
                Belum ada rincian item barang pada paket ini. Selesaikan Tahap 4 terlebih dahulu.
              </div>
            `}
          </div>
        </div>

        <!-- JUSTIFIKASI / CATATAN PENGENDALIAN PPK -->
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px 12px;">
          <div style="font-size:11px; font-weight:700; color:#334155; margin-bottom:4px;">Catatan Pengendalian PPK &amp; Kesiapan Pelimpahan Dokumen Persiapan (DPP):</div>
          <div style="font-size:11.5px; color:#1e293b; line-height:1.45;">
            ${cakraEsc(activeTRow?.catatan_tahap || paket.catatan_hps || 'Nilai HPS telah ditetapkan secara cermat, akuntabel, dan efisien dengan memperhitungkan PPN 11% dan keuntungan wajar penyedia. Berkas HPS sah siap dilimpahkan ke Pejabat Pengadaan bersama KAK dan Rancangan Kontrak untuk persiapan pemilihan penyedia (Tahap 8 DPP).')}
          </div>
        </div>
      `;

    case 7: {
      const hpsBasis = Number(paket.nilai_hps || paket.nilai_pagu || 0);
      const dppEst = Math.round(hpsBasis / (1 + (Number(paket.tarif_ppn ?? 11) / 100)));
      const dendaPerHariEst = Math.round(dppEst / 1000);
      const umPersen = Number(paket.persen_uang_muka ?? 0);
      const umNominal = Math.round((hpsBasis * umPersen) / 100);
      const caraBayar = paket.cara_pembayaran || 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)';
      const basisDenda = paket.basis_denda || '1 permil per hari dari Harga Kontrak sebelum PPN (DPP)';
      const garansiStr = paket.ketentuan_garansi || (String(paket.jenis_pengadaan || '').includes('Konstruksi')
        ? 'Masa Pemeliharaan Konstruksi 180 Hari Kalender (6 Bulan) — Retensi / Jaminan Pemeliharaan 5%'
        : 'Sertifikat Garansi Purna Jual Resmi Pabrikan Minimal 1 Tahun (365 Hari Kalender) — Bebas Retensi 5%');
      const sengketaStr = paket.penyelesaian_sengketa || 'Musyawarah untuk Mufakat, dilanjutkan Layanan Penyelesaian Sengketa (LPS) LKPP';
      const wajibJaminan = Number(paket.wajib_jaminan_pelaksanaan ?? 0) === 1;

      return `
        <!-- BARIS KARTU UTAMA RANCANGAN KONTRAK -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:12px; margin-bottom:12px;">
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Bentuk &amp; Jenis Perikatan</div>
            <div style="font-size:14.5px; font-weight:800; color:#0f172a;">${cakraEsc(paket.bentuk_kontrak || 'Surat Pesanan')}</div>
            <div style="font-size:11px; color:#1e40af; font-weight:700; margin-top:2px;">Jenis: ${cakraEsc(paket.jenis_kontrak || 'Lumsum')} (Pasal 27 &amp; 28)</div>
          </div>
          <div style="background:${umPersen === 0 ? '#f0fdf4' : '#fffbeb'}; border:1px solid ${umPersen === 0 ? '#86efac' : '#fde68a'}; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:${umPersen === 0 ? '#166534' : '#92400e'}; text-transform:uppercase; margin-bottom:4px;">Kebijakan Uang Muka (Pasal 29)</div>
            <div style="font-size:14.5px; font-weight:900; color:${umPersen === 0 ? '#15803d' : '#b45309'};">
              ${umPersen === 0 ? '0% — Tanpa Uang Muka' : `${umPersen}% (${cakraFmtRp(umNominal)})`}
            </div>
            <div style="font-size:11px; color:${umPersen === 0 ? '#166534' : '#92400e'}; margin-top:2px;">
              ${umPersen === 0 ? 'Bayar Sekaligus 100% Pasca-BAST (Bebas Jaminan UM)' : 'Wajib Jaminan Uang Muka 100% Sebelum Cair'}
            </div>
          </div>
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Jangka Waktu (SLA) &amp; Penyerahan</div>
            <div style="font-size:14.5px; font-weight:800; color:#0f172a;">${Number(paket.masa_pelaksanaan_hari || 14)} Hari Kalender</div>
            <div style="font-size:11px; color:#475569; margin-top:2px;">Franco: ${cakraEsc(paket.lokasi_pekerjaan || 'Kantor KPU Kabupaten Ngawi')}</div>
          </div>
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#1e40af; text-transform:uppercase; margin-bottom:4px;">Sanksi Denda 1‰ (Pasal 78)</div>
            <div style="font-size:14px; font-weight:800; color:#1e3a8a;">1‰ / Hari (${cakraFmtRp(dendaPerHariEst)}/hari)</div>
            <div style="font-size:11px; color:#1e40af; margin-top:2px;">Dari DPP Sebelum PPN (${cakraFmtRp(dppEst)})</div>
          </div>
        </div>

        <!-- 4 KOMPONEN DOKUMEN RESMI TAHAP 7 (BA PENETAPAN + DRAFT KONTRAK + SSUK + SSKK) -->
        <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:10px 14px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <div style="font-size:11.5px; font-weight:800; color:#0369a1; text-transform:uppercase;">
              📂 4 Komponen Dokumen Resmi Tahap 7 (Tercetak Otomatis dalam Bundel Unduhan Word/PDF):
            </div>
            <span class="cakra-badge cakra-badge-info" style="font-size:10px;">Sesuai MDP Perlem LKPP No. 2/2026 &amp; No. 3/2026</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:8px; font-size:11px;">
            <div style="background:#ffffff; border:1px solid #cbd5e1; border-left:3px solid #1e3a8a; border-radius:6px; padding:7px 9px;">
              <div style="font-weight:800; color:#1e3a8a;">Dokumen I: BA Penetapan PPK</div>
              <div style="color:#475569; margin-top:2px;">Pengesahan Rancangan Kontrak, SSUK &amp; SSKK oleh PPK.</div>
            </div>
            <div style="background:#ffffff; border:1px solid #cbd5e1; border-left:3px solid #d97706; border-radius:6px; padding:7px 9px;">
              <div style="font-weight:800; color:#b45309;">Dokumen II: Rancangan ${cakraEsc(paket.bentuk_kontrak || 'Surat Pesanan')}</div>
              <div style="color:#475569; margin-top:2px;">Draft Naskah Perikatan &amp; Daftar Kuantitas (Tanpa Harga/Vendor).</div>
            </div>
            <div style="background:#ffffff; border:1px solid #cbd5e1; border-left:3px solid #0284c7; border-radius:6px; padding:7px 9px;">
              <div style="font-weight:800; color:#0369a1;">Dokumen III: Naskah SSUK (15 Pasal)</div>
              <div style="color:#475569; margin-top:2px;">Pasal 1 s.d. 15 Ketentuan Umum Perikatan PBJ Pemerintah.</div>
            </div>
            <div style="background:#ffffff; border:1px solid #cbd5e1; border-left:3px solid #15803d; border-radius:6px; padding:7px 9px;">
              <div style="font-weight:800; color:#166534;">Dokumen IV: Naskah SSKK (Klausul A–O)</div>
              <div style="color:#475569; margin-top:2px;">15 Klausul Spesifik Pengikat Pasal-Pasal SSUK Paket Ini.</div>
            </div>
          </div>
        </div>

        <!-- MATRIKS KORESPONDENSI SSUK (15 PASAL) & SSKK (KLAUSUL KHUSUS PPK) -->
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:6px;">
            <div style="font-size:11.5px; font-weight:800; color:#1e3a8a; text-transform:uppercase;">
              📜 Matriks Korespondensi SSUK (Syarat Umum) &amp; SSKK (Syarat Khusus Kontrak):
            </div>
            <span class="cakra-badge cakra-badge-info" style="font-size:10px;">Penetapan Tunggal PPK • Identitas Penyedia: [DRAFT]</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11.5px; margin-bottom:8px;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px;">
              <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Klausul J &amp; K SSKK (Pasal 10 SSUK — Pembayaran &amp; Uang Muka)</div>
              <div style="font-weight:700; color:#0f172a; margin-top:2px;">${cakraEsc(caraBayar)} &bull; Uang Muka: ${umPersen}%</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px;">
              <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Klausul H SSKK (Pasal 9.1 SSUK — Jaminan Pelaksanaan 5%)</div>
              <div style="font-weight:700; color:${wajibJaminan ? '#b45309' : '#15803d'}; margin-top:2px;">
                ${wajibJaminan ? `Wajib Jaminan Pelaksanaan 5% (${cakraFmtRp(Math.round(hpsBasis * 0.05))})` : 'Dikecualikan (Bebas Jaminan Pelaksanaan 5%)'}
              </div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px;">
              <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Klausul I SSKK (Pasal 9.2 SSUK — Garansi / Pemeliharaan)</div>
              <div style="font-weight:700; color:#0f172a; margin-top:2px;">${cakraEsc(garansiStr)}</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px 10px;">
              <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Klausul N &amp; O SSKK (Pasal 14 &amp; 15 SSUK — Denda &amp; Sengketa)</div>
              <div style="font-weight:700; color:#0f172a; margin-top:2px;">${cakraEsc(basisDenda)} &bull; ${cakraEsc(sengketaStr)}</div>
            </div>
          </div>
          <div style="background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px; padding:7px 10px; font-size:11px; color:#334155;">
            <strong>Daftar 15 Pasal Baku SSUK yang Mengikat:</strong> Pasal 1 (Definisi) &bull; Pasal 2 (Bahasa, Hukum &amp; Hierarki Dokumen) &bull; Pasal 3 (Larangan KKN &amp; Pakta Integritas) &bull; Pasal 4 (Asal Barang &amp; TKDN/PDN) &bull; Pasal 5 (Wakil Sah &amp; Larangan Subkontrak) &bull; Pasal 6 (Hak &amp; Kewajiban PPK/Penyedia) &bull; Pasal 7 (SLA, Pengiriman Franco &amp; Risiko) &bull; Pasal 8 (Pemeriksaan, Uji Fungsi &amp; BAST) &bull; Pasal 9 (Jaminan &amp; Garansi) &bull; Pasal 10 (Harga Kontrak, Uang Muka, SPM-LS &amp; Pajak) &bull; Pasal 11 (Adendum &amp; SCM) &bull; Pasal 12 (Keadaan Kahar / Force Majeure) &bull; Pasal 13 (Pemutusan Kontrak) &bull; Pasal 14 (Denda Keterlambatan 1‰ DPP) &bull; Pasal 15 (Penyelesaian Sengketa).
          </div>
        </div>

        <!-- CATATAN PENGENDALIAN PPK TAHAP 7 -->
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:10px 12px;">
          <div style="font-size:11px; font-weight:700; color:#334155; margin-bottom:4px;">Catatan Penetapan Rancangan Kontrak PPK &amp; Kesiapan DPP (Tahap 8):</div>
          <div style="font-size:11.5px; color:#1e293b; line-height:1.45;">
            ${cakraEsc(activeTRow?.catatan_tahap || 'Rancangan Kontrak (Draft Surat Pesanan, SSUK, dan SSKK) telah ditetapkan tunggal oleh PPK dengan skema pembayaran Sekaligus 100% pasca-BAST (Uang Muka 0%). Identitas rekanan dan harga satuan kontrak dikosongkan pada tahap persiapan ini untuk diisi sesuai hasil pemilihan/negosiasi Pejabat Pengadaan pada Tahap 9.')}
          </div>
        </div>
      `;
    }

    case 8:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Pelaksana Pemilihan</div>
            <div style="font-size:14px; font-weight:800; color:#1e40af;">${cakraEsc(paket.pelaksana_pemilihan || 'Pejabat Pengadaan')}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Pasal 12 &amp; 13 Perpres PBJ</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Berita Acara Reviu DPP</div>
            <div style="font-size:13px; font-weight:800; color:#0f172a;" class="cakra-mono">${cakraEsc(activeTRow.no_reviu_dpp || autoDocNo(8, activeTRow.tanggal_dokumen))}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Reviu KAK, HPS &amp; Rancangan Kontrak Disetujui</div>
          </div>
        </div>
      `;

    case 9:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Rekanan Penyedia Terpilih</div>
            <div style="font-size:13.5px; font-weight:800; color:#15803d;">${cakraEsc(penyedia?.nama_perusahaan || 'CV. GRAFIKA PRATAMA NGAWI')}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Kualifikasi: ${cakraEsc(penyedia?.kualifikasi_usaha || 'Usaha Kecil')} (NPWP: ${cakraEsc(penyedia?.npwp || '01.445.882.9-646.000')})</div>
          </div>
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#1e40af; text-transform:uppercase; margin-bottom:4px;">Hasil Negosiasi Digital (BAHPL)</div>
            <div style="font-size:15px; font-weight:900; color:#1e3a8a;">${cakraFmtRp(paket.nilai_kontrak || paket.nilai_pagu)}</div>
            <div style="font-size:11px; color:#1e40af; margin-top:2px;">Penawaran: ${cakraFmtRp(paket.nilai_penawaran_awal || paket.nilai_pagu)} (Efisiensi Anggaran)</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Nomor Berita Acara BAHPL</div>
            <div style="font-size:13px; font-weight:800; color:#0f172a;" class="cakra-mono">${cakraEsc(activeTRow.no_bahp || autoDocNo(9, activeTRow.tanggal_dokumen))}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Berita Acara Hasil Pengadaan Langsung</div>
          </div>
        </div>
      `;

    case 10:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#166534; text-transform:uppercase; margin-bottom:4px;">Konfirmasi Status Wajib Pajak (KSWP)</div>
            <div style="font-size:13.5px; font-weight:800; color:#15803d;">✅ Valid / Terkonfirmasi</div>
            <div style="font-size:11px; color:#166534; margin-top:2px;">Integrasi DJP Kemenkeu</div>
          </div>
          <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#166534; text-transform:uppercase; margin-bottom:4px;">Beneficial Ownership &amp; Blacklist</div>
            <div style="font-size:13.5px; font-weight:800; color:#15803d;">✅ Bebas Daftar Hitam</div>
            <div style="font-size:11px; color:#166534; margin-top:2px;">Pemilik Manfaat: ${cakraEsc(paket.bo_nama || 'Direktur Utama')} (Bebas Konflik)</div>
          </div>
        </div>
      `;

    case 11:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Nomor SPPBJ PPK</div>
            <div style="font-size:13px; font-weight:800; color:#1e40af;" class="cakra-mono">${cakraEsc(activeTRow.no_sppbj || autoDocNo(11, activeTRow.tanggal_dokumen))}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Surat Penunjukan Penyedia Barang/Jasa Sah</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Ketentuan Jaminan Pelaksanaan</div>
            <div style="font-size:13.5px; font-weight:800; color:#15803d;">Dibebaskan (Non-Tender / E-Purchasing)</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Pasal 33 Perpres PBJ</div>
          </div>
        </div>
      `;

    case 12:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Nomor Berita Acara PAM</div>
            <div style="font-size:13px; font-weight:800; color:#0f172a;" class="cakra-mono">${cakraEsc(activeTRow.no_pam || autoDocNo(12, activeTRow.tanggal_dokumen))}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Rapat Persiapan Penandatanganan Kontrak</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Rekening Pembayaran Bank Rekanan</div>
            <div style="font-size:13px; font-weight:800; color:#1e40af;">${cakraEsc(paket.nama_bank_penyedia || 'Bank Jatim Cabang Ngawi')}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">No. Rekening: ${cakraEsc(paket.no_rekening_penyedia || '014-229-8711')}</div>
          </div>
        </div>
      `;

    case 13:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Nomor Kontrak / Surat Pesanan Final</div>
            <div style="font-size:13px; font-weight:800; color:#1e40af;" class="cakra-mono">${cakraEsc(paket.no_kontrak || autoDocNo(13, activeTRow.tanggal_dokumen))}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Materiil Bermeterai Rp 10.000 Sah</div>
          </div>
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#1e40af; text-transform:uppercase; margin-bottom:4px;">Nilai Kontrak Pengikatan</div>
            <div style="font-size:15px; font-weight:900; color:#1e3a8a;">${cakraFmtRp(paket.nilai_kontrak || paket.nilai_pagu)}</div>
            <div style="font-size:11px; color:#1e40af; margin-top:2px;">Pelaksanaan: ${cakraEsc(paket.tgl_mulai_kerja || '2026-05-18')} s.d. ${cakraEsc(paket.tgl_selesai_kerja || '2026-05-31')}</div>
          </div>
        </div>
      `;

    case 14:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Nomor Surat Penyerahan Lokasi (SPL)</div>
            <div style="font-size:13px; font-weight:800; color:#0f172a;" class="cakra-mono">${cakraEsc(activeTRow.no_spl || autoDocNo(14, activeTRow.tanggal_dokumen))}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Serah terima area kerja resmi</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Lokasi Pelaksanaan Pekerjaan</div>
            <div style="font-size:13px; font-weight:800; color:#1e293b;">${cakraEsc(paket.lokasi_pekerjaan || 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi')}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Kondisi area siap pakai</div>
          </div>
        </div>
      `;

    case 15:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Nomor SPMK PPK</div>
            <div style="font-size:13px; font-weight:800; color:#1e40af;" class="cakra-mono">${cakraEsc(activeTRow.no_spmk || autoDocNo(15, activeTRow.tanggal_dokumen))}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Surat Perintah Mulai Kerja Resmi</div>
          </div>
          <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#166534; text-transform:uppercase; margin-bottom:4px;">Progres Fisik &amp; Pengendalian (SCM)</div>
            <div style="font-size:14px; font-weight:800; color:#15803d;">Realisasi Fisik: ${Number(paket.realisasi_fisik_persen || 100)}%</div>
            <div style="font-size:11px; color:#166534; margin-top:2px;">Status: ${cakraEsc(paket.status_scm || 'Normal / Sesuai Kurva S')}</div>
          </div>
        </div>
      `;

    case 16:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Nomor Berita Acara BAPHP &amp; BAST</div>
            <div style="font-size:13px; font-weight:800; color:#0f172a;" class="cakra-mono">${cakraEsc(paket.no_bast || autoDocNo(16, activeTRow.tanggal_dokumen))}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">BAPHP: ${cakraEsc(activeTRow.no_baphp || '016/BAPHP/PBJ-2026-001/PPK/V/2026')}</div>
          </div>
          <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#166534; text-transform:uppercase; margin-bottom:4px;">Hasil Uji Kelayakan &amp; Kuantitas</div>
            <div style="font-size:13.5px; font-weight:800; color:#15803d;">✅ 100% Sesuai Spesifikasi</div>
            <div style="font-size:11px; color:#166534; margin-top:2px;">Uji fungsi lengkap dan garansi purna jual aktif</div>
          </div>
        </div>
      `;

    case 17:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">BAST PPK ke KPA (Aset BMN)</div>
            <div style="font-size:13px; font-weight:800; color:#0f172a;" class="cakra-mono">${cakraEsc(activeTRow.no_bast_kpa || autoDocNo(17, activeTRow.tanggal_dokumen))}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Faktur Pajak: ${cakraEsc(activeTRow.no_faktur_pajak || '010.000-26.00000001')}</div>
          </div>
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#1e40af; text-transform:uppercase; margin-bottom:4px;">Pemotongan Pajak &amp; SP2D Netto</div>
            <div style="font-size:15px; font-weight:900; color:#1e3a8a;">${cakraFmtRp(paket.nilai_pembayaran_netto || (paket.nilai_kontrak || paket.nilai_pagu) * 0.875)}</div>
            <div style="font-size:11px; color:#1e40af; margin-top:2px;">${cakraEsc(paket.jenis_pph || 'PPh 22 (1.5%)')} &amp; PPN 11% dipotong Bendahara Pengeluaran</div>
          </div>
        </div>
      `;

    case 18:
      return `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
          <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#166534; text-transform:uppercase; margin-bottom:4px;">Rating Kinerja Penyedia di SiKAP LKPP</div>
            <div style="font-size:14px; font-weight:800; color:#15803d;">${cakraEsc(paket.rating_kinerja_sikap || '⭐⭐⭐⭐⭐ Sangat Baik (Bintang 5)')}</div>
            <div style="font-size:11px; color:#166534; margin-top:2px;">Kualitas, Kuantitas, Waktu, &amp; Layanan Maksimal</div>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Pencatatan BMN &amp; Arsip Digital</div>
            <div style="font-size:13px; font-weight:800; color:#1e40af;">${cakraEsc(paket.status_catat_bmn || 'Tercatat di SIMAN / SAKTI BMN')}</div>
            <div style="font-size:11px; color:#64748b; margin-top:2px;">Kode: ${cakraEsc(paket.kode_registrasi_bmn || 'BMN-2026-657811-001')} | Bundel 18 Tahap Lengkap</div>
          </div>
        </div>
      `;

    default:
      return `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
          <div style="font-size:12px; color:#334155;">Data administrasi dan teknis Tahap ${num} telah terekam secara sah sesuai ketentuan PBJ.</div>
        </div>
      `;
  }
}
window.buildStageSpecificResumeBody = buildStageSpecificResumeBody;

function renderUniversalStageCard(stageNo, activeStageDef, activeTRow, paket, items, penyedia, rekomendasi) {
  const num = Number(stageNo);
  const driveLink = String(activeTRow.link_drive_dokumen || '').trim();
  const hasDrive = driveLink.length > 5;
  const isDone = activeTRow.status_tahap === 'Selesai' || (hasDrive && activeTRow.status_tahap !== 'Bypass');
  const autoDocNo = generateAutoStageDocNumber(num, paket.kode_paket_internal, activeTRow.tanggal_dokumen);
  const docNo = activeTRow.nomor_dokumen || autoDocNo;
  const docDate = activeTRow.tanggal_dokumen || '2026-05-18';

  return `
    <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,0.05); overflow:hidden; margin-bottom:18px;">
      <!-- HEADER FORM MATI SERAGAM -->
      <div style="background:linear-gradient(135deg, #1e293b 0%, #334155 100%); color:#ffffff; padding:12px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-size:10.5px; font-weight:700; letter-spacing:0.5px; color:#93c5fd; text-transform:uppercase;">
            DOKUMEN RESMI TAHAP ${num} &bull; FORM MATI (NON-EDITABLE RESUME)
          </div>
          <div style="font-size:15px; font-weight:800; color:#ffffff; margin-top:2px; display:flex; align-items:center; gap:8px;">
            <span>📋 ${cakraEsc(activeStageDef.nama)}</span>
            <span class="cakra-badge ${isDone ? 'cakra-badge-green' : (activeTRow.status_tahap === 'Bypass' ? 'cakra-badge-secondary' : 'cakra-badge-amber')}" style="font-size:11px;">
              ${isDone ? '✅ Selesai (Berkas Sah Terhubung)' : (activeTRow.status_tahap === 'Bypass' ? '⏭️ Bypass' : '📝 Draf / Sedang Berjalan')}
            </span>
          </div>
        </div>
        <div style="font-size:11.5px; color:#cbd5e1; font-weight:600; display:flex; align-items:center; gap:6px;">
          <span>📋 Pratinjau Naskah Sah (Non-Editable)</span>
        </div>
      </div>

      <!-- ISI FORM MATI RESUME SERAGAM -->
      <div style="padding:18px; display:flex; flex-direction:column; gap:14px; background:#ffffff;">
        <!-- BARIS 1: IDENTITAS BERKAS RESMI -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px;">
          <div>
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Nomor Dokumen Sah</div>
            <div style="font-size:12.5px; font-weight:800; color:#0f172a; margin-top:2px;" class="cakra-mono">${cakraEsc(docNo)}</div>
          </div>
          <div>
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Tanggal Dokumen</div>
            <div style="font-size:12.5px; font-weight:800; color:#0f172a; margin-top:2px;">${cakraEsc(docDate)}</div>
          </div>
          <div>
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Pejabat Penanggung Jawab</div>
            <div style="font-size:12.5px; font-weight:800; color:#1e40af; margin-top:2px;">${[4, 5, 6, 7].includes(num) ? 'Pejabat Pembuat Komitmen (PPK)' : (num === 3 ? 'Kuasa Pengguna Anggaran (Sekretaris KPU Kab. Ngawi)' : (num === 8 ? 'PPK & Pejabat Pengadaan' : (num === 9 ? 'Pejabat Pengadaan' : 'PPK / Pejabat Pengadaan KPU Kab. Ngawi')))}</div>
          </div>
        </div>

        <!-- BARIS 2: PARAMETER SUBSTANTIF KHUSUS TAHAP -->
        ${buildStageSpecificResumeBody(num, paket, activeTRow, items, penyedia, rekomendasi)}

        <!-- BARIS 3: BUKTI DOKUMEN GOOGLE DRIVE (FORM MATI / READ-ONLY) -->
        <div style="background:${hasDrive ? '#f0fdf4' : '#fffbeb'}; border:1px ${hasDrive ? 'solid #86efac' : 'dashed #cbd5e1'}; border-radius:8px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="flex:1; min-width:240px;">
            <div style="font-size:11px; font-weight:700; color:${hasDrive ? '#166534' : '#92400e'}; text-transform:uppercase;">
              ☁️ Tautan Berkas Fisik Bertandatangan (Google Drive Tahap ${num})
            </div>
            <div style="font-size:12px; color:${hasDrive ? '#15803d' : '#b45309'}; margin-top:2px; word-break:break-all;">
              ${hasDrive
                ? `<a href="${cakraEsc(driveLink)}" target="_blank" style="color:#047857; font-weight:700; text-decoration:underline;" class="cakra-mono">${cakraEsc(driveLink)}</a>`
                : 'Belum ada tautan berkas fisik diunggah. Silakan klik tombol di samping untuk memasukkan tautan Google Drive melalui formulir Pop Up.'
              }
            </div>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            ${hasDrive ? `
              <a href="${cakraEsc(driveLink)}" target="_blank" class="cakra-btn cakra-btn-success cakra-btn-sm" style="font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:#10b981; color:#fff; padding:6px 12px; border-radius:6px;">
                <span>🔗 Buka di Google Drive</span>
              </a>
            ` : `
              <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="openModalTahapUniversal(${num})" style="font-size:11px; font-weight:700; padding:6px 12px; border-radius:6px; cursor:pointer;">
                + Tautkan Berkas G-Drive (Pop Up)
              </button>
            `}
          </div></div>
        </div>
      </div>
    </div>
  `;
}
window.renderUniversalStageCard = renderUniversalStageCard;


function buildCockpitPhaseWorkspaceHtml(faseNum) {
  const { paket, rekomendasi, tahaps, items } = CakraState.activePaketCtx;
  const stageNo = Number(CakraState.activeStageNo || 1);
  const faseCfg = FASE_PBJ_CONFIG.find(f => f.fase === Number(faseNum)) || FASE_PBJ_CONFIG[0];
  const tahapMap = {};
  (tahaps || []).forEach(t => { tahapMap[t.no_tahap] = t; });

  const activeStageDef = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === stageNo) || { no: stageNo, nama: `Tahap ${stageNo}` };
  const activeTRow = tahapMap[stageNo] || {};

  // Audit warnings & double checks
  const audit = CakraState.activePaketCtx.audit || {};
  const warnings = (audit.warnings || []).filter(w => w.tahap === stageNo || faseCfg.stages.includes(w.tahap));

  let stageWarningHtml = '';
  if (warnings.length > 0) {
    stageWarningHtml = `
      <details style="margin-bottom:14px; background:#fff1f2; border:1px solid #fecdd3; border-radius:8px; padding:8px 14px;">
        <summary style="cursor:pointer; font-size:12px; font-weight:700; color:#9f1239; display:flex; justify-content:space-between; align-items:center;">
          <span>⚠️ Terdapat ${warnings.length} Catatan Regulasi pada Tahap Ini</span>
          <span style="font-size:11px; color:#be123c; font-weight:600;">(Klik untuk melihat rincian &amp; solusi)</span>
        </summary>
        <div style="margin-top:8px; padding-top:6px; border-top:1px solid #ffe4e6;">
          ${warnings.map(w => `
            <div style="font-size:11.5px; color:#881337; margin-top:3px;">
              • <strong>[${cakraEsc(w.kode)}]</strong> ${cakraEsc(w.pesan)}
              ${w.rekomendasi ? `<div style="font-size:11px; color:#0369a1; margin-left:14px; font-weight:600;">💡 Solusi: ${cakraEsc(w.rekomendasi)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      </details>
    `;
  }

  // Active Stage Status & Drive Context (Shared across all stages and bottom nav)
  const driveLink = String(activeTRow.link_drive_dokumen || '').trim();
  const hasDrive = driveLink.length > 5;
  const isDone = activeTRow.status_tahap === 'Selesai' || (hasDrive && activeTRow.status_tahap !== 'Bypass');

  // Active Stage Form Content
  let stageFormHtml = '';

  if (stageNo === 1) {
    // TAHAP 1: IDENTIFIKASI KEBUTUHAN (FORM MATI RESMI - 100% NON-EDITABLE)
    const isModalMak = String(paket.kode_akun_mak || '').startsWith('53') || paket.bmn_kategori_telaah === 'MODAL';

    stageFormHtml = `
      <!-- RESUME RESMI DOKUMEN IDENTIFIKASI KEBUTUHAN (FORM MATI) -->
      <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,0.05); overflow:hidden; margin-bottom:18px;">
        <!-- HEADER FORM MATI -->
        <div style="background:linear-gradient(135deg, #1e293b 0%, #334155 100%); color:#ffffff; padding:12px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="font-size:10.5px; font-weight:700; letter-spacing:0.5px; color:#93c5fd; text-transform:uppercase;">
              DOKUMEN RESMI TAHAP 1 &bull; FORM MATI (NON-EDITABLE RESUME)
            </div>
            <div style="font-size:15px; font-weight:800; color:#ffffff; margin-top:2px; display:flex; align-items:center; gap:8px;">
              <span>📋 Naskah Penetapan Identifikasi Kebutuhan Pengadaan (IDK)</span>
              <span class="cakra-badge ${isDone ? 'cakra-badge-green' : 'cakra-badge-amber'}" style="font-size:11px;">
                ${isDone ? '✅ Selesai (Berkas Sah Terhubung)' : '📝 Draf / Sedang Berjalan'}
              </span>
            </div>
          </div>
          <div style="font-size:11.5px; color:#cbd5e1; font-weight:600; display:flex; align-items:center; gap:6px;">
            <span>📋 Pratinjau Naskah Sah (Non-Editable)</span>
          </div>
        </div>

        <!-- ISI FORM MATI RESUME TAHAP 1 -->
        <div style="padding:18px; display:flex; flex-direction:column; gap:14px; background:#ffffff;">
          <!-- BARIS 1: IDENTITAS BERKAS & SILSILAH KPA -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px;">
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Nomor Dokumen Identifikasi (IDK)</div>
              <div style="font-size:12.5px; font-weight:800; color:#0f172a; margin-top:2px;" class="cakra-mono">${cakraEsc(activeTRow.nomor_dokumen || generateAutoStageDocNumber(1, paket.kode_paket_internal, activeTRow.tanggal_dokumen))}</div>
            </div>
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Tanggal Penetapan</div>
              <div style="font-size:12.5px; font-weight:800; color:#0f172a; margin-top:2px;">${cakraEsc(activeTRow.tanggal_dokumen || '04/05/2026')}</div>
            </div>
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Subbagian Pengusul</div>
              <div style="font-size:12.5px; font-weight:800; color:#1e40af; margin-top:2px;">
                ${paket.is_multi_subbag ? '<span class="cakra-badge cakra-badge-indigo" style="font-size:10px; margin-bottom:3px; display:inline-block;">Konsolidasi Multi-Subbag</span><br/>' : ''}${cakraEsc(paket.pic_subbag || 'KUL')} (KPU Kab. Ngawi)
              </div>
            </div>
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Nomor &amp; Tgl Disposisi KPA</div>
              <div style="font-size:12px; font-weight:700; color:#0f172a; margin-top:2px;" class="cakra-mono">${cakraEsc(paket.no_disposisi_kpa || '014/DISP.KPA/V/2026')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Tgl Disposisi: ${cakraEsc(paket.tgl_disposisi_kpa || '-')}</div>
            </div>
          </div>

          <!-- BARIS KHUSUS: RINCIAN KONSOLIDASI MULTI-SUBBAGIAN (PASAL 21 PERPRES PBJ) -->
          ${(paket.is_multi_subbag && Array.isArray(paket.subbags) && paket.subbags.length) ? `
            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 14px;">
              <div style="font-size:11px; font-weight:800; color:#1e40af; text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
                <span>🏛️ Rincian Naskah Dinas Pengusul per Subbagian (Konsolidasi Pasal 21 Perpres PBJ):</span>
              </div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:8px;">
                ${paket.subbags.map((s, idx) => `
                  <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:8px 10px; font-size:11px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                      <span class="cakra-badge cakra-badge-primary" style="font-size:9.5px; font-weight:800;">Subbag ${cakraEsc(s.subbag)}</span>
                      <span style="color:#64748b; font-size:10.5px;">${cakraEsc(s.tgl_nota || '-')}</span>
                    </div>
                    <div style="font-weight:700; color:#0f172a; margin-bottom:2px;" class="cakra-mono">${cakraEsc(s.no_nota || '-')}</div>
                    <div style="color:#475569; font-style:italic; font-size:10.5px;">${cakraEsc(s.perihal || 'Usulan Kebutuhan Barang')}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- BARIS 2: NAMA PAKET & URGENSI KEBUTUHAN (KAK) -->
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:14px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Nama Paket Pengadaan (Sesuai DIPA / Kebutuhan Riil)</div>
            <div style="font-size:14.5px; font-weight:800; color:#0f172a; line-height:1.4;">${cakraEsc(paket.nama_paket || '-')}</div>

            <div style="margin-top:10px; padding-top:10px; border-top:1px solid #f1f5f9;">
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Urgensi &amp; Justifikasi Identifikasi Kebutuhan (KAK)</div>
              <div style="font-size:12px; color:#334155; line-height:1.6; white-space:pre-wrap; background:#f8fafc; padding:8px 12px; border-radius:6px; border:1px solid #e2e8f0;">${cakraEsc(paket.uraian_pekerjaan || 'Belum ada uraian justifikasi kebutuhan.')}</div>
            </div>
          </div>

          <!-- BARIS 3: BEBAN ANGGARAN & SILSILAH RKB -->
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
              <div style="font-size:11px; font-weight:800; color:#1e40af; text-transform:uppercase;">
                💰 Pembebanan Anggaran DIPA &amp; RKB Definitif
              </div>
              <div style="font-size:15px; font-weight:900; color:#1e3a8a;">
                Pagu DIPA: <span class="cakra-mono">${cakraFmtRp(paket.nilai_pagu)}</span>
              </div>
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:10px; font-size:11.5px; color:#1e3a8a;">
              <div><strong>Kode MAK:</strong> <span class="cakra-mono" style="font-weight:700;">${cakraEsc(paket.kode_akun_mak || '-')}</span> (${cakraEsc(paket.nama_akun_mak || '-')})</div>
              <div><strong>Silsilah RKB:</strong> ${cakraEsc(paket.rkb_program || 'DIPA KPU Kab. Ngawi TA 2026')}</div>
            </div>
          </div>

          <!-- BARIS 4: TELAAH BMN (KONDISIONAL MODAL 53xxxx) -->
          ${isModalMak ? `
            <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:14px;">
              <div style="font-size:11px; font-weight:800; color:#166534; text-transform:uppercase; margin-bottom:6px;">
                🏛️ Hasil Telaah Ketersediaan BMN (Pasal 18 Perpres PBJ)
              </div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:11.5px; color:#166534;">
                <div><strong>Sifat Kebutuhan:</strong> ${cakraEsc(paket.bmn_sifat_kebutuhan || 'PENGGANTIAN')}</div>
                <div><strong>Ketersediaan Aset:</strong> ${cakraEsc(paket.bmn_status_ketersediaan || 'TERSEDIA_KURANG')} (${Number(paket.bmn_jumlah_eksisting || 0)} Unit Eksisting)</div>
                <div><strong>Kesesuaian RKBMN:</strong> ${cakraEsc(paket.bmn_kesesuaian_rkbmn || 'SESUAI')}</div>
              </div>
              ${paket.bmn_catatan_telaah ? `<div style="font-size:11px; color:#15803d; margin-top:6px; background:#dcfce7; padding:5px 8px; border-radius:4px;"><strong>Catatan BMN:</strong> ${cakraEsc(paket.bmn_catatan_telaah)}</div>` : ''}
            </div>
          ` : ''}

          <!-- BARIS 5: ALUR PENGESAHAN BERKAS & TAUTAN GOOGLE DRIVE (FORM MATI / READ-ONLY) -->
          <div style="background:${hasDrive ? '#f0fdf4' : '#fffbeb'}; border:1px ${hasDrive ? 'solid #86efac' : 'dashed #cbd5e1'}; border-radius:8px; padding:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="flex:1; min-width:260px;">
              <div style="font-size:11px; font-weight:700; color:${hasDrive ? '#166534' : '#92400e'}; text-transform:uppercase;">
                ☁️ Tautan Berkas Fisik Bertandatangan (Google Drive Tahap 1)
              </div>
              <div style="font-size:12px; color:${hasDrive ? '#15803d' : '#b45309'}; margin-top:3px; word-break:break-all;">
                ${hasDrive
                  ? `<a href="${cakraEsc(driveLink)}" target="_blank" style="color:#047857; font-weight:700; text-decoration:underline;" class="cakra-mono">${cakraEsc(driveLink)}</a>`
                  : 'Belum ada tautan berkas fisik diunggah. Unduh berkas Word di atas, tanda tangani basah/TTE, unggah ke Google Drive satker, lalu masukkan tautan melalui formulir Pop Up.'
                }
              </div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              ${hasDrive ? `
                <a href="${cakraEsc(driveLink)}" target="_blank" class="cakra-btn cakra-btn-success cakra-btn-sm" style="font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:#10b981; color:#fff; padding:6px 12px; border-radius:6px;">
                  <span>🔗 Buka di Google Drive</span>
                </a>
              ` : `
                <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="openModalTahap1Input(${paket.id})" style="font-size:11.5px; font-weight:700; padding:6px 12px; border-radius:6px; cursor:pointer;">
                  + Tautkan Berkas G-Drive (Pop Up)
                </button>
              `}
            </div></div>
          </div>
        </div>
      </div>
    `;
  } else if (stageNo === 2) {
    // TAHAP 2: PENETAPAN JENIS, CARA PENGADAAN & PEMAKETAN (FORM MATI RESMI - 100% NON-EDITABLE)
    const driveLink = String(activeTRow.link_drive_dokumen || '').trim();
    const hasDrive = driveLink.length > 5;
    const isDone = activeTRow.status_tahap === 'Selesai' || (hasDrive && activeTRow.status_tahap !== 'Bypass');

    stageFormHtml = `
      <!-- RESUME RESMI DOKUMEN PENETAPAN PEMAKETAN (FORM MATI) -->
      <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,0.05); overflow:hidden; margin-bottom:18px;">
        <!-- HEADER FORM MATI -->
        <div style="background:linear-gradient(135deg, #1e293b 0%, #334155 100%); color:#ffffff; padding:12px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="font-size:10.5px; font-weight:700; letter-spacing:0.5px; color:#93c5fd; text-transform:uppercase;">
              DOKUMEN RESMI TAHAP 2 &bull; FORM MATI (NON-EDITABLE RESUME)
            </div>
            <div style="font-size:15px; font-weight:800; color:#ffffff; margin-top:2px; display:flex; align-items:center; gap:8px;">
              <span>📋 Berita Acara Penetapan Jenis, Cara Pengadaan, &amp; Pemaketan (BA-PMK)</span>
              <span class="cakra-badge ${isDone ? 'cakra-badge-green' : 'cakra-badge-amber'}" style="font-size:11px;">
                ${isDone ? '✅ Selesai (Berkas Sah Terhubung)' : '📝 Draf / Sedang Berjalan'}
              </span>
            </div>
          </div>
          <div style="font-size:11.5px; color:#cbd5e1; font-weight:600; display:flex; align-items:center; gap:6px;">
            <span>📋 Pratinjau Naskah Sah (Non-Editable)</span>
          </div>
        </div>

        <!-- ISI FORM MATI: RESUME TERTATA RAPI TANPA KOTAK INPUT/DROPDOWN APAPUN -->
        <div style="padding:18px; display:flex; flex-direction:column; gap:14px; background:#ffffff;">
          <!-- BARIS 1: IDENTITAS BERKAS PENETAPAN -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px;">
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Nomor Dokumen BA-PMK</div>
              <div style="font-size:12.5px; font-weight:800; color:#0f172a; margin-top:2px;" class="cakra-mono">${cakraEsc(activeTRow.nomor_dokumen || '002/PMK/PBJ-2026-001/PPK-PBJ/KPU-NGW/V/2026')}</div>
            </div>
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Tanggal Penetapan</div>
              <div style="font-size:12.5px; font-weight:800; color:#0f172a; margin-top:2px;">${cakraEsc(activeTRow.tanggal_dokumen || '18/05/2026')}</div>
            </div>
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Pejabat Penetap</div>
              <div style="font-size:12.5px; font-weight:800; color:#1e40af; margin-top:2px;">PPK KPU Kabupaten Ngawi</div>
            </div>
          </div>

          <!-- BARIS 2: DASAR PENETAPAN ANGGARAN & REKOMENDASI CERDAS -->
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 14px;">
            <div style="font-size:11px; font-weight:800; color:#1e40af; text-transform:uppercase; margin-bottom:4px;">
              💡 Rekomendasi Cerdas Regulasi 2026 Berdasarkan Pagu &amp; MAK:
            </div>
            <div style="font-size:12px; color:#1e3a8a; line-height:1.5;">
              Berdasarkan Pagu <strong>${cakraFmtRp(paket.nilai_pagu)}</strong> dan Akun <strong>${cakraEsc(paket.kode_akun_mak || '532111')}</strong>, sistem merekomendasikan:
              Kertas Harga: <strong>${cakraEsc(paket.jenis_kertas_harga || 'HPS')}</strong> &bull;
              Bentuk Kontrak: <strong>${cakraEsc(paket.bentuk_kontrak || 'Surat Pesanan')}</strong> &bull;
              Jenis Kontrak: <strong>${cakraEsc(paket.jenis_kontrak || 'Lumsum')}</strong> &bull;
              Pelaksana: <strong>Pejabat Pengadaan</strong>
            </div>
          </div>

          <!-- BARIS 3: RANCANG BANGUN PENGADAAN & CARA (READ-ONLY RESUME) -->
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:-4px;">
            <div style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase;">
              🧭 Rancang Bangun Pengadaan, Cara &amp; Metode Pemilihan:
            </div>
            <button type="button" onclick="openModulMetodePemilihan()" class="cakra-btn" style="background:#eff6ff; color:#1d4ed8; border:1px solid #3b82f6; font-size:11px; font-weight:700; padding:4px 10px; border-radius:6px; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span>🎯 Buka Modul Metode Pemilihan</span>
            </button>
          </div>
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">1. Jenis Pengadaan</div>
              <div style="font-size:14px; font-weight:800; color:#0f172a;">${cakraEsc(paket.jenis_pengadaan || 'Barang')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Pasal 12 Perpres 16/2018 jo. 46/2025</div>
            </div>
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">2. Cara Pengadaan</div>
              <div style="font-size:14px; font-weight:800; color:#15803d;">${cakraEsc(paket.cara_pengadaan || 'Penyedia')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Pasal 18 Perpres PBJ</div>
            </div>
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">3. Metode Pemilihan</div>
              <div style="font-size:14px; font-weight:800; color:#7c3aed;">${cakraEsc(paket.metode_pemilihan || 'E-Purchasing')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Katalog Elektronik LKPP v6</div>
            </div>
          </div>

          <!-- BARIS 4: PERIKATAN KONTRAK & KERTAS KERJA (READ-ONLY RESUME) -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Bentuk Kontrak</div>
              <div style="font-size:14px; font-weight:800; color:#0f172a;">${cakraEsc(paket.bentuk_kontrak || 'Surat Pesanan')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Pasal 28 Perpres PBJ</div>
            </div>
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Jenis Kontrak</div>
              <div style="font-size:14px; font-weight:800; color:#0f172a;">${cakraEsc(paket.jenis_kontrak || 'Lumsum')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Pasal 27 Perpres PBJ (Output Pasti &amp; Tetap)</div>
            </div>
            <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px;">
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:4px;">Kertas Kerja Harga (Tahap 6)</div>
              <div style="font-size:14px; font-weight:800; color:#b45309;">${cakraEsc(paket.jenis_kertas_harga || 'HPS')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Pagu &gt; Rp 100 Juta Wajib HPS</div>
            </div>
          </div>

          <!-- BARIS 5: BUKTI DOKUMEN GOOGLE DRIVE (TAHAP 2) -->
          <div style="background:${hasDrive ? '#f0fdf4' : '#fffbeb'}; border:1px ${hasDrive ? 'solid #86efac' : 'dashed #cbd5e1'}; border-radius:8px; padding:12px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <div style="flex:1; min-width:240px;">
              <div style="font-size:11px; font-weight:700; color:${hasDrive ? '#166534' : '#92400e'}; text-transform:uppercase;">
                ☁️ Tautan Berkas Fisik Bertandatangan (Google Drive Tahap 2)
              </div>
              <div style="font-size:12px; color:${hasDrive ? '#15803d' : '#b45309'}; margin-top:2px; word-break:break-all;">
                ${hasDrive
                  ? `<a href="${cakraEsc(driveLink)}" target="_blank" style="color:#047857; font-weight:700; text-decoration:underline;" class="cakra-mono">${cakraEsc(driveLink)}</a>`
                  : 'Belum ada tautan berkas fisik diunggah. Silakan klik tombol di samping untuk memasukkan tautan Google Drive melalui formulir Pop Up.'
                }
              </div>
            </div>
            <div style="display:flex; gap:6px; align-items:center;">
              ${hasDrive ? `
                <a href="${cakraEsc(driveLink)}" target="_blank" class="cakra-btn cakra-btn-success cakra-btn-sm" style="font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px; background:#10b981; color:#fff; padding:6px 12px; border-radius:6px;">
                  <span>🔗 Buka di Google Drive</span>
                </a>
              ` : `
                <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="openModalTahap2Input()" style="font-size:11px; font-weight:700; padding:6px 12px; border-radius:6px; cursor:pointer;">
                  + Tautkan Berkas G-Drive (Pop Up)
                </button>
              `}
            </div></div>
          </div>
        </div>
      </div>
    `;
  } else {
    // TAHAP 3 S.D. 18: STANDARISASI MODEL FORM MATI RESMI (100% SERAGAM SESUAI INSTRUKSI MAS EMENJE)
    stageFormHtml = renderUniversalStageCard(stageNo, activeStageDef, activeTRow, paket, items, CakraState.penyedias?.find(v => Number(v.id) === Number(paket.penyedia_id)), rekomendasi);
  }

  const prevStage = stageNo > 1 ? stageNo - 1 : null;
  const nextStage = stageNo < 18 ? stageNo + 1 : null;
  const dodontItem = (CakraState.bukuSaku18Tahap || []).find(d => Number(d.no) === stageNo) || {};

  return `
    <div class="cakra-cockpit-stage-card-wrapper" style="margin-bottom:20px;">
      ${stageWarningHtml}

      <!-- KARTU FORM MATI RESMI TAHAP AKTIF (NON-EDITABLE) -->
      ${stageFormHtml}

      <!-- PANDUAN KEPATUHAN REGULASI DO'S & DON'TS -->
      <details style="margin-bottom:14px; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; padding:8px 14px;">
        <summary style="cursor:pointer; font-weight:700; font-size:11.5px; color:#334155; display:flex; justify-content:space-between; align-items:center;">
          <span>🧭 Panduan Kepatuhan Do's &amp; Don'ts Tahap ${stageNo}</span>
          <span style="font-size:10.5px; color:#64748b;">(Rambu-rambu regulasi &amp; temuan audit BPK/Inspektorat)</span>
        </summary>
        <div style="margin-top:8px; padding-top:8px; border-top:1px solid #e2e8f0; display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:11.5px;">
          <div style="color:#166534; line-height:1.45; background:#f0fdf4; padding:8px 10px; border-radius:6px; border-left:3px solid #22c55e;">
            <strong>✅ WAJIB DILAKUKAN (DO):</strong><br/>
            ${cakraEsc(dodontItem.do || 'Laksanakan tahapan sesuai peraturan PBJ.')}
          </div>
          <div style="color:#991b1b; line-height:1.45; background:#fef2f2; padding:8px 10px; border-radius:6px; border-left:3px solid #ef4444;">
            <strong>⛔ DILARANG KERAS (DON'T):</strong><br/>
            ${cakraEsc(dodontItem.dont || 'Jangan melangkahi tahapan substansial.')}
          </div>
        </div>
      </details>

      <!-- BOTTOM GUIDED NAVIGATION BAR STANDAR AUDIT -->
      <div class="cakra-bottom-guided-nav" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          ${prevStage ? `
            <button type="button" class="cakra-btn cakra-btn-outline" onclick="selectCockpitStage(${prevStage})" style="font-weight:700;">
              ⬅ Kembali ke Tahap ${prevStage}
            </button>
          ` : '<span style="color:#94a3b8; font-size:12px; font-weight:700;">Titik Awal (Tahap 1)</span>'}
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          ${isDone ? `
            ${nextStage ? `
              <button type="button" class="cakra-btn cakra-btn-primary" onclick="selectCockpitStage(${nextStage})" style="font-weight:800; background:#2563eb; color:#fff; border:none; padding:8px 18px; border-radius:6px; cursor:pointer; box-shadow:0 2px 5px rgba(37,99,235,0.25);" title="Lanjut melihat Tahap ${nextStage}">
                Lanjut ke Tahap ${nextStage} →
              </button>
            ` : `
              <span class="badge badge-success" style="font-size:12px; padding:8px 16px; background:#047857; color:#fff; font-weight:800; border-radius:6px;">🎉 Seluruh 18 Tahap Selesai</span>
            `}
          ` : `
            <button type="button" class="cakra-btn cakra-btn-success" onclick="finishUniversalStageAndAdvance(${stageNo})" style="font-weight:800; background:#10b981; color:#fff; border:none; padding:8px 18px; border-radius:6px; cursor:pointer; box-shadow:0 3px 8px rgba(16,185,129,0.3);" title="Selesaikan tahap ini setelah berkas sah ditautkan">
              ✓ Selesaikan Tahap ${stageNo} &amp; Lanjut ${nextStage ? 'ke Tahap ' + nextStage : ''} →
            </button>
            ${nextStage ? `
              <button type="button" class="cakra-btn cakra-btn-outline" onclick="selectCockpitStage(${nextStage})" style="font-weight:600; padding:8px 14px; border-radius:6px; color:#475569; border:1px solid #cbd5e1; background:#ffffff;" title="Lihat Tahap ${nextStage} tanpa menyelesaikan tahap ini">
                Lewati ke Tahap ${nextStage} →
              </button>
            ` : ''}
          `}
        </div></div>
      </div>
    </div>
  `;
}

window.switchCockpitFase = switchCockpitFase;
window.switchCockpitUtilityView = switchCockpitUtilityView;
window.buildCockpitPhaseWorkspaceHtml = buildCockpitPhaseWorkspaceHtml;


// ============================================================================
// PORTAL PENGUSULAN NOTA DINAS (KASUBAG) & LEMBAR DISPOSISI SEKRETARIS (KPA)
// ============================================================================
let activePortalTab = 'pengusul';

async function renderPortalPengusulKpaView() {
  const root = document.getElementById('cakra-portal-pengusul-root');
  if (!root) return;

  const pakets = CakraState.pakets || [];
  const s = CakraState.summary || {};

  root.innerHTML = `
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color:#fff; border-radius:10px; padding:18px 22px; margin-bottom:18px; box-shadow:0 4px 12px rgba(15,23,42,0.15);">
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="font-size:18px; font-weight:800; letter-spacing:-0.3px; display:flex; align-items:center; gap:8px;">
            <span>🏛️ PORTAL PENGUSULAN NOTA DINAS &amp; DISPOSISI KPA</span>
          </div>
          <div style="font-size:12px; color:#cbd5e1; margin-top:4px;">
            Alur Hulu Administrasi: Subbag Pengusul ➔ Nota Dinas ➔ Telaah Anggaran RKB &amp; BMN ➔ Lembar Disposisi KPA (Sekretaris) ➔ Penugasan PPK (Tahap 1 PBJ)
          </div>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="cakra-btn cakra-btn-warning" onclick="toggleCakraRkbDrawer()" style="font-weight:700; background:#f59e0b; color:#fff; border:none;">
            ⚡ + Usulan Baru dari RKB
          </button>
        </div>
      </div>
    </div>

    <!-- TABS: PENGUSULAN KASUBAG VS DISPOSISI KPA -->
    <div style="display:flex; gap:8px; margin-bottom:16px; border-bottom:2px solid #e2e8f0; padding-bottom:6px;">
      <button type="button" class="cakra-btn ${activePortalTab === 'pengusul' ? 'cakra-btn-primary' : 'cakra-btn-outline'}" onclick="activePortalTab='pengusul'; renderPortalPengusulKpaView();" style="font-weight:800; border-radius:6px;">
        📝 1. Daftar Pengusulan Nota Dinas (Kasubag)
      </button>
      <button type="button" class="cakra-btn ${activePortalTab === 'kpa' ? 'cakra-btn-primary' : 'cakra-btn-outline'}" onclick="activePortalTab='kpa'; renderPortalPengusulKpaView();" style="font-weight:800; border-radius:6px;">
        ✍️ 2. Lembar Disposisi Sekretaris (KPA)
      </button>
    </div>

    <!-- TAB 1: PENGUSULAN KASUBAG -->
    ${activePortalTab === 'pengusul' ? `
      <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-weight:800; font-size:13.5px; color:#0f172a;">
            Daftar Usulan Kebutuhan Pengadaan per Subbagian
          </div>
          <span class="cakra-badge cakra-badge-blue">${pakets.length} Paket Tercatat</span>
        </div>
        <div style="overflow-x:auto;">
          <table class="cakra-table" style="width:100%; font-size:12px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th>No</th>
                <th>Kode Paket</th>
                <th>Subbag Pengusul</th>
                <th>Uraian Paket Pengadaan</th>
                <th>Mata Anggaran (MAK)</th>
                <th>Pagu Anggaran</th>
                <th>No. Nota Dinas</th>
                <th>Status Disposisi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${pakets.map((pkt, idx) => {
                const dispStatus = pkt.disposisi_status || 'DISETUJUI';
                const badgeColor = dispStatus === 'DISETUJUI' ? '#047857' : (dispStatus === 'MENUNGGU_DISPOSISI_KPA' ? '#b45309' : '#475569');
                const badgeBg = dispStatus === 'DISETUJUI' ? '#dcfce7' : (dispStatus === 'MENUNGGU_DISPOSISI_KPA' ? '#fef3c7' : '#f1f5f9');
                return `
                  <tr>
                    <td style="text-align:center; font-weight:700;">${idx + 1}</td>
                    <td class="cakra-mono" style="font-weight:800; color:#1e3a8a;">${cakraEsc(pkt.kode_paket_internal || 'PBJ-2026-00' + (idx+1))}</td>
                    <td><span class="cakra-badge cakra-badge-blue">${cakraEsc(pkt.pic_subbag || 'RENDATIN')}</span></td>
                    <td style="font-weight:700;">${cakraEsc(pkt.nama_paket)}</td>
                    <td class="cakra-mono">${cakraEsc(pkt.kode_akun_mak || '532111')}</td>
                    <td class="cakra-mono" style="font-weight:800; color:#047857;">${cakraFmtRp(pkt.nilai_pagu)}</td>
                    <td class="cakra-mono" style="font-size:11px;">${cakraEsc(pkt.no_nota_dinas_pengusul || '-')}</td>
                    <td>
                      <span style="font-size:10.5px; font-weight:800; color:${badgeColor}; background:${badgeBg}; padding:2px 6px; border-radius:4px;">
                        ${dispStatus === 'DISETUJUI' ? '✅ Disetujui KPA' : (dispStatus === 'MENUNGGU_DISPOSISI_KPA' ? '⏳ Menunggu KPA' : '📝 Draf')}
                      </span>
                    </td>
                    <td>
                      <div style="display:flex; gap:4px;">
                        <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="openPaketInCockpit(${pkt.id}, 1, true)" style="font-size:11px;" title="Buka di Cockpit Tahap 1">
                          🧭 Cockpit
                        </button>
                        <button type="button" class="cakra-btn cakra-btn-info cakra-btn-sm" onclick="queuePengadaanDownload('docx', ${pkt.id}, '1')" style="font-size:11px;" title="Cetak Nota Dinas">
                          📄 Cetak
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : `
      <!-- TAB 2: DISPOSISI KPA -->
      <div style="background:#fff; border:1px solid #cbd5e1; border-radius:8px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div style="font-weight:800; font-size:13.5px; color:#0f172a;">
            Lembar Kendali Disposisi Kuasa Pengguna Anggaran (Sekretaris KPU Kabupaten Ngawi)
          </div>
          <span style="font-size:12px; color:#64748b;">KPA: <strong>BUDI RAHAYU</strong> (Sekretaris)</span>
        </div>
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:10px 14px; font-size:12px; color:#1e40af; margin-bottom:16px;">
          <strong>Petunjuk Pengesahan Disposisi KPA:</strong><br/>
          KPA menelaah Nota Dinas usulan dari Kasubag Pengusul, memeriksa kesesuaian anggaran RKB definitif dan analisis BMN, lalu menerbitkan disposisi persetujuan penugasan kepada PPK untuk melaksanakan Tahap 1 PBJ.
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap:14px;">
          ${pakets.map(pkt => `
            <div style="border:1.5px solid #cbd5e1; border-radius:8px; padding:14px; background:#f8fafc;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="cakra-badge cakra-badge-blue cakra-mono" style="font-weight:800;">${cakraEsc(pkt.kode_paket_internal || 'PBJ-2026')}</span>
                <span style="font-size:11px; font-weight:800; color:#047857; background:#dcfce7; padding:2px 6px; border-radius:4px;">
                  ✅ Disposisi Terbit
                </span>
              </div>
              <div style="font-weight:800; font-size:13px; color:#0f172a; margin-bottom:6px;">${cakraEsc(pkt.nama_paket)}</div>
              <div style="font-size:11.5px; color:#475569; margin-bottom:8px; line-height:1.4;">
                <strong>Pengusul:</strong> Subbag ${cakraEsc(pkt.pic_subbag || 'RENDATIN')}<br/>
                <strong>MAK:</strong> ${cakraEsc(pkt.kode_akun_mak)} (${cakraEsc(pkt.nama_akun_mak)})<br/>
                <strong>Pagu:</strong> <span style="font-weight:800; color:#047857;">${cakraFmtRp(pkt.nilai_pagu)}</span><br/>
                <strong>No. Agenda Disposisi:</strong> ${cakraEsc(pkt.no_disposisi_kpa || '042/AGD-KPA/V/2026')}
              </div>
              <div style="background:#fff; border:1px solid #e2e8f0; border-radius:5px; padding:8px; font-size:11px; color:#334155; margin-bottom:10px;">
                <strong>Instruksi KPA:</strong><br/>
                <em>"${cakraEsc(pkt.disposisi_catatan_kpa || 'Disetujui. Lanjutkan ke proses penyusunan HPS, KAK, dan pengadaan E-Purchasing oleh PPK.')}"</em>
              </div>
              <div style="display:flex; gap:6px; justify-content:flex-end;">
                <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="openPaketInCockpit(${pkt.id}, 1, true)" style="font-weight:700;">
                  🚀 Buka Tahap 1 (PPK)
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `}
  `;
}


// ============================================================================
// PILAR 3: AUDIT PENGADAAN (PENGAWASAN KEPATUHAN 18 TAHAP HULU-HILIR)
// Menu khusus audit proses yang sudah selesai atau sedang berjalan
// ============================================================================
let currentAuditFilter = 'ALL';
let auditSearchQuery = '';
let auditSearchDebounceTimer = null;

function renderAuditPengadaanView() {
  const kpiGrid = document.getElementById('audit-pengadaan-kpi-grid');
  const tbody = document.getElementById('cakra-table-audit-body');
  if (!tbody) return;

  const pakets = CakraState.pakets || [];
  
  let countDone = 0;
  let countProcess = 0;
  let countWarn = 0;
  let totalPaguAll = 0;

  const analyzedPakets = pakets.map(p => {
    const pagu = Number(p.nilai_pagu || 0);
    const hps = Number(p.nilai_hps || 0);
    const kontrak = Number(p.nilai_kontrak || 0);
    const countSelesai = Number(p.count_selesai || 0);
    const countDraft = Number(p.count_draft || 0);
    const countBypass = Number(p.count_bypass || 0);
    const countDrive = Number(p.count_drive || 0);
    
    totalPaguAll += pagu;

    const totalFulfilled = countSelesai + countBypass;
    const progressPct = Math.min(100, Math.round((totalFulfilled / 18) * 100));

    // Kriteria Audit Mutu
    const hasDriveDiscrepancy = countDrive < countSelesai;
    const isHpsOverPagu = hps > pagu && pagu > 0;
    const isKontrakOverHps = kontrak > hps && hps > 0;
    const isWarning = hasDriveDiscrepancy || isHpsOverPagu || isKontrakOverHps;
    const isDone = totalFulfilled >= 18 && !hasDriveDiscrepancy && !isHpsOverPagu;
    const isProcess = !isDone && !isWarning;

    if (isDone) countDone++;
    else if (isWarning) countWarn++;
    else countProcess++;

    let auditStatusBadge = '';
    let auditCategory = 'PROSES';

    if (isDone) {
      auditCategory = 'SELESAI';
      auditStatusBadge = '<span class="cakra-badge cakra-badge-green" style="font-size:11px; padding:4px 8px; font-weight:800;">✅ Bebas Temuan</span>';
    } else if (isWarning) {
      auditCategory = 'WARNING';
      let reason = hasDriveDiscrepancy ? 'Drive Belum Lengkap' : (isHpsOverPagu ? 'HPS > Pagu' : 'Kontrak > HPS');
      auditStatusBadge = `<span class="cakra-badge cakra-badge-red" style="font-size:11px; padding:4px 8px; font-weight:800;" title="${reason}">⚠️ ${reason}</span>`;
    } else {
      auditCategory = 'PROSES';
      auditStatusBadge = '<span class="cakra-badge cakra-badge-amber" style="font-size:11px; padding:4px 8px; font-weight:700;">📝 Draf Berjalan</span>';
    }

    return {
      ...p,
      countSelesai,
      countDraft,
      countBypass,
      countDrive,
      totalFulfilled,
      progressPct,
      isDone,
      isWarning,
      isProcess,
      auditCategory,
      auditStatusBadge
    };
  });

  // Update badge counter di tombol filter tab
  const bAll = document.getElementById('audit-badge-all');
  const bDone = document.getElementById('audit-badge-done');
  const bProc = document.getElementById('audit-badge-process');
  const bWarn = document.getElementById('audit-badge-warn');
  if (bAll) bAll.textContent = analyzedPakets.length;
  if (bDone) bDone.textContent = countDone;
  if (bProc) bProc.textContent = countProcess;
  if (bWarn) bWarn.textContent = countWarn;

  // Render KPI Grid
  if (kpiGrid) {
    kpiGrid.innerHTML = `
      <div class="cakra-kpi-card" style="border-left:4px solid #1e40af; background:#ffffff; padding:14px 18px; border-radius:8px; border:1px solid #cbd5e1; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Total Paket PBJ Satker</div>
        <div style="font-size:24px; font-weight:800; color:#0f172a; margin:4px 0;">${analyzedPakets.length} <span style="font-size:13px; font-weight:600; color:#64748b;">Paket</span></div>
        <div style="font-size:11.5px; color:#475569;">Alokasi Pagu: <strong>${cakraFmtRp(totalPaguAll)}</strong></div>
      </div>
      <div class="cakra-kpi-card" style="border-left:4px solid #16a34a; background:#f0fdf4; padding:14px 18px; border-radius:8px; border:1px solid #bbf7d0; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11.5px; font-weight:700; color:#15803d; text-transform:uppercase;">✅ Bebas Temuan (Lolos Audit)</div>
        <div style="font-size:24px; font-weight:800; color:#166534; margin:4px 0;">${countDone} <span style="font-size:13px; font-weight:600; color:#15803d;">Paket</span></div>
        <div style="font-size:11.5px; color:#14532d;">18 Tahap Sah &amp; Berkas Drive Lengkap</div>
      </div>
      <div class="cakra-kpi-card" style="border-left:4px solid #f59e0b; background:#fffbeb; padding:14px 18px; border-radius:8px; border:1px solid #fde68a; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11.5px; font-weight:700; color:#b45309; text-transform:uppercase;">📝 Draf Berjalan</div>
        <div style="font-size:24px; font-weight:800; color:#92400e; margin:4px 0;">${countProcess} <span style="font-size:13px; font-weight:600; color:#b45309;">Paket</span></div>
        <div style="font-size:11.5px; color:#78350f;">Sedang dalam proses pengerjaan</div>
      </div>
      <div class="cakra-kpi-card" style="border-left:4px solid #dc2626; background:#fef2f2; padding:14px 18px; border-radius:8px; border:1px solid #fecaca; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div style="font-size:11.5px; font-weight:700; color:#991b1b; text-transform:uppercase;">⚠️ Perlu Dilengkapi (Warning)</div>
        <div style="font-size:24px; font-weight:800; color:#b91c1c; margin:4px 0;">${countWarn} <span style="font-size:13px; font-weight:600; color:#991b1b;">Paket</span></div>
        <div style="font-size:11.5px; color:#7f1d1d;">Link Drive belum lengkap / batas pagu</div>
      </div>
    `;
  }

  // Filter paket
  let filtered = analyzedPakets;
  if (currentAuditFilter === 'SELESAI') filtered = filtered.filter(p => p.isDone);
  else if (currentAuditFilter === 'PROSES') filtered = filtered.filter(p => p.isProcess);
  else if (currentAuditFilter === 'WARNING') filtered = filtered.filter(p => p.isWarning);

  if (auditSearchQuery) {
    const q = auditSearchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => 
      (p.nama_paket || '').toLowerCase().includes(q) ||
      (p.kode_paket_internal || '').toLowerCase().includes(q) ||
      (p.nama_penyedia || '').toLowerCase().includes(q) ||
      (p.pic_subbag || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:35px; color:#64748b; font-weight:600;">Tidak ada paket pengadaan yang cocok dengan kriteria filter audit.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((p, idx) => {
    const efisiensiRp = Math.max(0, Number(p.nilai_pagu || 0) - Number(p.nilai_kontrak || 0));
    const efisiensiPct = Number(p.nilai_pagu || 0) > 0 ? ((efisiensiRp / Number(p.nilai_pagu)) * 100).toFixed(1) : 0;
    
    let driveBadge = `<span style="font-size:11px; font-weight:700; color:#15803d; background:#dcfce7; padding:3px 8px; border-radius:12px; border:1px solid #86efac;">✅ ${p.countDrive}/${p.countSelesai} Drive</span>`;
    if (p.countDrive < p.countSelesai) {
      driveBadge = `<span style="font-size:11px; font-weight:700; color:#b91c1c; background:#fee2e2; padding:3px 8px; border-radius:12px; border:1px solid #fca5a5;">⚠️ Kurang ${p.countSelesai - p.countDrive} Drive</span>`;
    } else if (p.countSelesai === 0) {
      driveBadge = '<span style="font-size:11px; color:#64748b; background:#f1f5f9; padding:3px 8px; border-radius:12px; border:1px solid #cbd5e1;">-</span>';
    }

    return `
      <tr>
        <td style="text-align:center; font-weight:700; color:#64748b;">${idx + 1}</td>
        <td>
          <div class="cakra-mono" style="font-weight:800; color:#1e40af; font-size:12px;">${cakraEsc(p.kode_paket_internal)}</div>
          <div style="font-weight:700; font-size:12.5px; color:#0f172a; margin:3px 0;">${cakraEsc(p.nama_paket)}</div>
          <div style="font-size:11px; color:#64748b;">
            Akun: <strong class="cakra-mono">${cakraEsc(p.kode_akun_mak || '-')}</strong> • Metode: <strong>${cakraEsc(p.metode_pemilihan || '-')}</strong>
          </div>
        </td>
        <td>
          <div style="font-weight:700; color:#0f172a;">${cakraEsc(p.pic_subbag || '-')}</div>
          <div style="font-size:11px; color:#475569;">PPK: ${cakraEsc(p.nama_ppk || '-')}</div>
          <div style="font-size:10.5px; color:#64748b;">Penyedia: ${cakraEsc(p.nama_penyedia || '-')}</div>
        </td>
        <td class="cakra-mono" style="font-size:11.5px;">
          <div>Pagu: <strong>${cakraFmtRp(p.nilai_pagu)}</strong></div>
          <div style="color:#047857; font-weight:800;">Ktr: ${cakraFmtRp(p.nilai_kontrak)}</div>
          <div style="font-size:10.5px; color:#1d4ed8;">Hemat: ${cakraFmtRp(efisiensiRp)} (${efisiensiPct}%)</div>
        </td>
        <td style="text-align:center;">
          <div style="font-weight:800; font-size:12px; color:#0f172a; margin-bottom:3px;">
            ${p.totalFulfilled} / 18 <span style="font-size:10.5px; font-weight:600; color:#64748b;">(${p.progressPct}%)</span>
          </div>
          <div style="width:100%; height:5px; background:#e2e8f0; border-radius:3px; overflow:hidden;">
            <div style="width:${p.progressPct}%; height:100%; background:${p.isDone ? '#10b981' : (p.isWarning ? '#f59e0b' : '#3b82f6')};"></div>
          </div>
          <div style="font-size:10px; color:#64748b; margin-top:2px;">${p.countBypass > 0 ? `⏭️ ${p.countBypass} Bypass` : 'Tanpa Bypass'}</div>
        </td>
        <td style="text-align:center;">
          ${driveBadge}
        </td>
        <td style="text-align:center;">
          ${p.auditStatusBadge}
        </td>
        <td style="text-align:center;">
          <div style="display:flex; flex-direction:column; gap:4px; align-items:center;">
            <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" style="width:100%; font-size:11px; padding:3px 6px;" onclick="openAuditPaketDetailModal(${p.id})">
              🔍 Lembar Audit
            </button>
            <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" style="width:100%; font-size:11px; padding:3px 6px;" onclick="openPaketInCockpit(${p.id}, ${p.tahap_aktif || 1}, true)">
              🧭 Buka Kokpit
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterAuditPengadaan(category) {
  currentAuditFilter = category || 'ALL';
  const group = document.getElementById('audit-filter-button-group');
  if (group) {
    const buttons = group.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.className = 'cakra-btn cakra-btn-outline cakra-btn-sm';
    });
    const actBtn = document.getElementById(`btn-audit-filter-${category.toLowerCase()}`);
    if (actBtn) actBtn.className = 'cakra-btn cakra-btn-primary cakra-btn-sm';
  }
  renderAuditPengadaanView();
}

function debounceAuditSearch() {
  clearTimeout(auditSearchDebounceTimer);
  auditSearchDebounceTimer = setTimeout(() => {
    const inp = document.getElementById('audit-pengadaan-search-input');
    auditSearchQuery = inp ? inp.value : '';
    renderAuditPengadaanView();
  }, 150);
}

async function openAuditPaketDetailModal(paketId) {
  const modal = document.getElementById('modal-audit-paket-detail');
  const titleEl = document.getElementById('modal-audit-paket-title');
  const contentEl = document.getElementById('modal-audit-paket-content');
  if (!modal || !contentEl) return;

  contentEl.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;">Memuat lembar audit kepatuhan paket...</div>';
  modal.style.display = 'flex';

  try {
    const res = await window.apiFetch(`/api/cakra/paket?id=${paketId}`);
    if (!res || !res.ok) throw new Error(res?.error || 'Gagal memuat detail paket');

    const { paket, tahaps, rekomendasi, audit } = res;
    if (titleEl) {
      titleEl.innerHTML = `${cakraEsc(paket.nama_paket)} <span class="cakra-mono" style="font-size:12px; font-weight:600; color:#38bdf8;">(${cakraEsc(paket.kode_paket_internal)})</span>`;
    }

    const doubleChecks = audit?.doubleCheck || [];
    const warnings = audit?.warnings || [];

    const tahapRowsHtml = (tahaps || []).map(t => {
      const isBypass = t.status_tahap === 'Bypass';
      const isSelesai = t.status_tahap === 'Selesai';
      const hasDrive = t.link_drive_dokumen && String(t.link_drive_dokumen).trim().length > 5;
      
      let statusBadge = '<span class="cakra-badge cakra-badge-amber">📝 Draft</span>';
      if (isBypass) statusBadge = '<span class="cakra-badge" style="background:#f1f5f9; color:#475569; border:1px solid #cbd5e1;">⏭️ Bypass</span>';
      else if (isSelesai && hasDrive) statusBadge = '<span class="cakra-badge cakra-badge-green">✅ Selesai</span>';
      else if (isSelesai && !hasDrive) statusBadge = '<span class="cakra-badge cakra-badge-red">⚠️ Selesai (Drive Kosong)</span>';
      else if (t.status_tahap === 'Terkunci') statusBadge = '<span class="cakra-badge" style="background:#f1f5f9; color:#94a3b8;">🔒 Terkunci</span>';

      return `
        <tr>
          <td style="text-align:center; font-weight:700;">${t.no_tahap}</td>
          <td style="font-weight:700; font-size:12px;">${cakraEsc(t.nama_tahap)}</td>
          <td class="cakra-mono" style="font-size:11px;">${cakraEsc(t.nomor_dokumen || '-')}</td>
          <td class="cakra-mono" style="font-size:11px;">${cakraEsc(t.tanggal_dokumen || '-')}</td>
          <td style="text-align:center;">${statusBadge}</td>
          <td style="text-align:center;">
            ${hasDrive 
              ? `<a href="${cakraEsc(t.link_drive_dokumen)}" target="_blank" class="cakra-btn cakra-btn-outline cakra-btn-sm" style="font-size:11px; padding:2px 8px; color:#1e40af; border-color:#93c5fd; background:#eff6ff;">📂 Buka Drive ↗</a>` 
              : '<span style="font-size:11px; color:#94a3b8; font-style:italic;">Belum ada link</span>'}
          </td>
          <td style="font-size:11px; color:#475569;">${cakraEsc(t.catatan_tahap || '-')}</td>
        </tr>
      `;
    }).join('');

    contentEl.innerHTML = `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 16px; margin-bottom:16px;">
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:12px;">
          <div>Subbagian Pengusul: <strong>${cakraEsc(paket.pic_subbag || '-')}</strong></div>
          <div>Metode Pemilihan: <strong>${cakraEsc(paket.metode_pemilihan || '-')}</strong></div>
          <div>Pagu DIPA: <strong class="cakra-mono">${cakraFmtRp(paket.nilai_pagu)}</strong></div>
          <div>Nilai HPS/Ref: <strong class="cakra-mono" style="color:#1e40af;">${cakraFmtRp(paket.nilai_hps)}</strong></div>
          <div>Nilai Kontrak: <strong class="cakra-mono" style="color:#047857;">${cakraFmtRp(paket.nilai_kontrak)}</strong></div>
          <div>Bentuk Kontrak: <strong>${cakraEsc(paket.bentuk_kontrak || '-')}</strong></div>
          <div>Penyedia: <strong>${cakraEsc(paket.penyedia?.nama_perusahaan || '-')}</strong></div>
          <div>PPK: <strong>${cakraEsc(paket.ppk?.nama_lengkap || '-')}</strong></div>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <h4 style="font-size:13px; font-weight:800; color:#0f172a; margin:0 0 8px;">⚖️ Verifikasi Parameter Regulasi LKPP (Double-Check):</h4>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:8px;">
          ${doubleChecks.map(dc => `
            <div style="background:${dc.isMatch ? '#f0fdf4' : '#fffbeb'}; border:1px solid ${dc.isMatch ? '#86efac' : '#fde68a'}; border-radius:6px; padding:8px 10px; font-size:11.5px;">
              <div style="font-weight:700; color:#0f172a;">${cakraEsc(dc.parameter)}</div>
              <div style="color:#475569; margin:2px 0;">Standar: <strong>${cakraEsc(dc.standarTemplate)}</strong></div>
              <div style="color:${dc.isMatch ? '#166534' : '#b45309'}; font-weight:700;">Isian: ${cakraEsc(dc.nilaiUser)} (${dc.isMatch ? '✅ Sesuai' : '⚠️ Deviasi'})</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <h4 style="font-size:13px; font-weight:800; color:#0f172a; margin:0 0 8px;">📋 Status Berkas 18 Tahap &amp; Verifikasi Link Google Drive:</h4>
        <div style="border:1px solid #cbd5e1; border-radius:8px; overflow:hidden;">
          <table class="cakra-data-table" style="margin:0;">
            <thead>
              <tr>
                <th style="width:36px; text-align:center;">No</th>
                <th>Tahap Pengadaan</th>
                <th>Nomor Surat / BA</th>
                <th>Tanggal</th>
                <th style="text-align:center;">Status</th>
                <th style="text-align:center;">Arsip Drive</th>
                <th>Catatan / Justifikasi</th>
              </tr>
            </thead>
            <tbody>
              ${tahapRowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    contentEl.innerHTML = `<div style="text-align:center; padding:40px; color:#dc2626;">Gagal memuat audit paket: ${cakraEsc(err.message)}</div>`;
  }
}

function closeAuditPaketDetailModal() {
  const modal = document.getElementById('modal-audit-paket-detail');
  if (modal) modal.style.display = 'none';
}

function exportAuditPengadaanExcel() {
  cakraNotify('Mengunduh Kertas Kerja Audit Pengadaan (.xlsx)...', 'info');
  window.location.href = '/api/cakra/excel?mode=ALL';
}

window.renderAuditPengadaanView = renderAuditPengadaanView;
window.filterAuditPengadaan = filterAuditPengadaan;
window.debounceAuditSearch = debounceAuditSearch;
window.openAuditPaketDetailModal = openAuditPaketDetailModal;
window.closeAuditPaketDetailModal = closeAuditPaketDetailModal;
window.exportAuditPengadaanExcel = exportAuditPengadaanExcel;


// ============================================================================
// PILAR 5: PANDUAN PENGADAAN (PUSAT PANDUAN, REGULASI, JADWAL & DO'S/DON'TS)
// Diisi seluruh tab yang berguna untuk panduan pengadaan
// ============================================================================
let currentPanduanTab = 'dodont';

function switchPanduanTab(tabName) {
  currentPanduanTab = tabName || 'dodont';
  const navTabs = document.querySelectorAll('#panduan-pengadaan-nav-tabs button');
  navTabs.forEach(btn => {
    const isAct = btn.id === `btn-panduan-tab-${currentPanduanTab}`;
    btn.className = isAct ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary';
  });
  renderPanduanPengadaanView();
}

function renderPanduanPengadaanView() {
  const container = document.getElementById('cakra-panduan-active-content');
  if (!container) return;

  if (currentPanduanTab === 'dodont') {
    container.innerHTML = buildPanduanDoDontContentHtml();
  } else if (currentPanduanTab === 'jadwal') {
    container.innerHTML = buildPanduanJadwalContentHtml();
  } else if (currentPanduanTab === 'regulasi') {
    container.innerHTML = buildPanduanRegulasiContentHtml();
  } else if (currentPanduanTab === 'dokumen') {
    container.innerHTML = buildPanduanDokumenContentHtml();
  } else if (currentPanduanTab === 'simulator') {
    container.innerHTML = buildPanduanSimulatorContentHtml();
  }
}

function buildPanduanDoDontContentHtml() {
  const guides = [
    {
      no: 1,
      nama: 'Identifikasi Kebutuhan PBJ (Basis DIPA/RKB)',
      do: 'Tarik data dari DIPA/RKB definitif, cek akun MAK 53xxxx/52xxxx, lakukan survei kebutuhan riil divisi/subbag, dan lengkapi telaah BMN eksisting (SIMAN/SAKTI).',
      dont: 'Dilarang menganggarkan pengadaan tanpa dasar MAK DIPA yang tersedia, mengidentifikasi paket bernilai fiktif/Rp 0, atau memecah paket untuk menghindari tender.'
    },
    {
      no: 2,
      nama: 'Penetapan Jenis, Cara Pengadaan, & Pemaketan',
      do: 'Tetapkan jenis pengadaan (Barang/Konstruksi/Konsultansi/Jasa Lainnya), cara (Penyedia/Swakelola), metode pemilihan (E-Purchasing), bentuk kontrak (Surat Pesanan), dan alokasikan min. 40% anggaran untuk UMK/Koperasi lokal.',
      dont: 'Dilarang memecah paket pengadaan untuk menghindari tender/seleksi, dan dilarang menggabungkan paket yang sifat pekerjaannya terpisah untuk menghalangi partisipasi usaha kecil.'
    },
    {
      no: 3,
      nama: 'Penetapan RUP oleh KPA & Pengumuman SiRUP',
      do: 'Pastikan RUP telah ditetapkan secara sah oleh KPA (Sekretaris KPU) dan diumumkan pada portal resmi SiRUP LKPP sebelum tahapan persiapan/pemilihan dimulai.',
      dont: 'Dilarang memulai tahapan persiapan atau pemilihan penyedia sebelum ada penetapan RUP sah oleh KPA dan publikasi di portal SiRUP LKPP.'
    },
    {
      no: 4,
      nama: 'Penetapan KAK, Spesifikasi Teknis, & Komitmen TKDN',
      do: 'Tetapkan spesifikasi teknis berbasis keluaran (output), prioritaskan produk ber-TKDN tinggi dan merek katalog bersertifikat PDN (TKDN+BMP min 40%).',
      dont: 'Dilarang mengunci spesifikasi yang mengarah pada satu merek tertentu (kecuali suku cadang resmi), dan dilarang mencantumkan harga total pengikatan kontrak pada lembar KAK.'
    },
    {
      no: 5,
      nama: 'Analisa Pasar & Penilaian PPK atas E-Katalog v6',
      do: 'Lakukan riset etalase Katalog Elektronik v6, komparasi minimal 3 produk sejenis, periksa ketersediaan stok, ongkos kirim, dan dokumentasikan Berita Acara Penilaian PPK (Kepka LKPP 177/2024).',
      dont: 'Dilarang mengabaikan E-Katalog jika barang tersedia memenuhi syarat teknis, harga, dan waktu tanpa adanya Berita Acara justifikasi teknis PPK.'
    },
    {
      no: 6,
      nama: 'Penyusunan Referensi Harga / HPS & Tabel Item Belanja',
      do: 'Susun HPS berdasarkan keahlian survei pasar/katalog v6 yang dapat dipertanggungjawabkan; cantumkan rincian item, keuntungan wajar, dan PPN. Pastikan HPS ≤ Pagu DIPA.',
      dont: 'Dilarang menetapkan HPS melebihi Pagu DIPA, dilarang memperhitungkan PPN ganda, memasukkan biaya tak terduga, atau menetapkan harga tanpa bukti survei tertulis.'
    },
    {
      no: 7,
      nama: 'Penyusunan Rancangan Kontrak (SSUK, SSKK & Surat Pesanan)',
      do: 'Tentukan bentuk kontrak yang tepat (Surat Pesanan/SPK/Surat Perjanjian), lengkapi klausul hak, kewajiban, masa pelaksanaan, jaminan, dan klausul denda 1 permil (1/1000) per hari.',
      dont: 'Dilarang menghilangkan klausul sanksi denda keterlambatan, atau menggunakan kuitansi sederhana untuk pengadaan bernilai di atas Rp 50 Juta.'
    },
    {
      no: 8,
      nama: 'Penyerahan DPP ke Pejabat Pengadaan & BA Reviu DPP',
      do: 'PPK menyerahkan Dokumen Persiapan Pengadaan (DPP: KAK, HPS, Draft Kontrak) lengkap dan ditandatangani sah, lalu lakukan reviu bersama Pejabat Pengadaan/Pokja.',
      dont: 'Dilarang menyerahkan berkas persiapan yang belum ditandatangani sah oleh PPK, atau memulai pemilihan sebelum Berita Acara Reviu DPP ditandatangani kedua pihak.'
    },
    {
      no: 9,
      nama: 'Pelaksanaan Pemilihan, Negosiasi Digital Katalog v6, & BAHPL',
      do: 'Pejabat Pengadaan melaksanakan transaksi di E-Katalog v6, lakukan negosiasi harga teknis secara transparan, dan buat Berita Acara Evaluasi & Negosiasi (BAHPL).',
      dont: 'Dilarang mengundang penyedia yang masuk dalam Daftar Hitam (Blacklist) LKPP, dan dilarang menyepakati harga negosiasi yang melebihi HPS/Pagu.'
    },
    {
      no: 10,
      nama: 'Reviu Hasil Pemilihan oleh PPK & Validasi Legalitas Rekanan',
      do: 'PPK meneliti laporan BAHPL, memvalidasi legalitas rekanan (KBLI, NIB, NPWP, status konfirmasi pajak KSWP, Beneficial Ownership, dan bebas blacklist).',
      dont: 'Dilarang menerbitkan penunjukan jika terdapat indikasi benturan kepentingan atau rekanan memiliki catatan sanksi blacklist aktif.'
    },
    {
      no: 11,
      nama: 'Penerbitan SPPBJ & Ketentuan Jaminan Pelaksanaan',
      do: 'Terbitkan Surat Penunjukan Penyedia Barang/Jasa (SPPBJ) resmi. Mintakan Jaminan Pelaksanaan 5% jika nilai kontrak > Rp 200 Juta (non-konsultansi).',
      dont: 'Dilarang menandatangani kontrak bernilai di atas Rp 200 Juta tanpa bukti keabsahan jaminan pelaksanaan dari bank penerbit/asuransi yang sah.'
    },
    {
      no: 12,
      nama: 'Rapat Persiapan Penandatanganan Kontrak (PAM)',
      do: 'Konfirmasi keabsahan nomor rekening bank rekanan, NPWP, jadwal kirim fisik, personil pelaksana, dan pastikan kesepakatan final draf kontrak.',
      dont: 'Dilarang melakukan perubahan substansi rancangan kontrak yang melanggar ketentuan KAK atau melampaui hasil negosiasi harga.'
    },
    {
      no: 13,
      nama: 'Penandatanganan Naskah Kontrak Final (Surat Pesanan Definitif)',
      do: 'Gunakan meterai Rp 10.000, pastikan penandatangan berwenang menurut akta pendirian perusahaan, dan cantumkan tanggal penandatanganan yang sebenarnya.',
      dont: 'Dilarang menandatangani kontrak bertanggal mundur (backdated) atau ditandatangani oleh pihak yang tidak memiliki legal standing sah.'
    },
    {
      no: 14,
      nama: 'Penyerahan Lokasi (MC-0) & Surat Perintah Mulai Kerja (SPMK)',
      do: 'Terbitkan SPMK paling lambat pada hari yang sama atau setelah kontrak ditandatangani sebagai dasar perhitungan hari kalender pelaksanaan pekerjaan.',
      dont: 'Dilarang menerbitkan SPMK bertanggal mendahului kontrak atau membiarkan rekanan bekerja tanpa dasar SPMK/Surat Pesanan sah.'
    },
    {
      no: 15,
      nama: 'Pengendalian Kontrak, Monitoring Kemajuan, Uji Mutu & SCM',
      do: 'Lakukan uji coba fungsi teknis (commissioning), pengawasan kurva S, adendum CCO jika ada perubahan lapangan, atau gelar Show Cause Meeting (SCM) jika ada deviasi keterlambatan.',
      dont: 'Dilarang melakukan perubahan kontrak (adendum) melebihi batas toleransi 10% dari nilai kontrak awal, atau membiarkan deviasi kritis tanpa surat peringatan.'
    },
    {
      no: 16,
      nama: 'Pemeriksaan Hasil (BAPHP) & Serah Terima Pertama (BAST/PHO)',
      do: 'Lakukan uji fungsi menyeluruh, cek fisik kesesuaian kuantitas, kualitas, spesifikasi teknis, garansi pabrikan, dan tuangkan dalam BAST 100%.',
      dont: 'Dilarang menandatangani BAST 100% jika masih terdapat cacat mutu, kerusakan fisik barang, atau kekurangan volume barang/jasa.'
    },
    {
      no: 17,
      nama: 'BAST PPK ke KPA (BMN), Retensi 5%, Perhitungan Pajak, & SP2D Netto',
      do: 'PPK menyerahkan aset kepada KPA untuk dibukukan dalam SIMAN/SAKTI BMN; Bendahara memotong PPh 22 (1,5%), PPN, dan memproses SPP/SPM/SP2D Netto.',
      dont: 'Dilarang memproses pembayaran sebelum seluruh kewajiban kontrak terpenuhi, dan dilarang menunda pemotongan dan penyetoran pajak ke kas negara.'
    },
    {
      no: 18,
      nama: 'Penilaian Kinerja Penyedia di INAPROC / SiKAP & FHO',
      do: 'PPK wajib menginput evaluasi penilaian kinerja penyedia (aspek kualitas, kuantitas, waktu, dan layanan) pada aplikasi SiKAP / INAPROC LKPP maksimal 30 hari kalender.',
      dont: 'Dilarang membiarkan paket selesai tanpa penilaian kinerja penyedia di portal LKPP atau memberikan nilai yang tidak objektif tanpa bukti kinerja lapangan.'
    }
  ];

  return `
    <div style="margin-bottom:16px;">
      <div style="font-weight:800; font-size:15px; color:#0f172a; margin-bottom:4px;">🧭 Buku Saku Kepatuhan Administrasi 18 Tahap (Do's &amp; Don'ts)</div>
      <p style="font-size:12px; color:#475569; margin:0 0 14px;">Pedoman praktis kepatuhan hukum bagi PPK, Pejabat Pengadaan, Kasubag, dan Pengelola Keuangan KPU Kabupaten Ngawi.</p>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(360px, 1fr)); gap:12px;">
        ${guides.map(g => `
          <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #f1f5f9; padding-bottom:6px;">
              <span class="cakra-badge cakra-badge-blue" style="font-weight:800;">Tahap ${g.no}</span>
              <span style="font-weight:700; font-size:12.5px; color:#0f172a;">${cakraEsc(g.nama)}</span>
            </div>
            <div style="font-size:11.5px; line-height:1.5;">
              <div style="color:#166534; background:#f0fdf4; padding:6px 8px; border-radius:5px; margin-bottom:6px; border-left:3px solid #22c55e;">
                <strong>✅ WAJIB DILAKUKAN (DO):</strong><br/>${cakraEsc(g.do)}
              </div>
              <div style="color:#991b1b; background:#fef2f2; padding:6px 8px; border-radius:5px; border-left:3px solid #ef4444;">
                <strong>⛔ DILARANG KERAS (DON'T):</strong><br/>${cakraEsc(g.dont)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function buildPanduanJadwalContentHtml() {
  return `
    <div>
      <div style="font-weight:800; font-size:15px; color:#0f172a; margin-bottom:4px;">⏱️ Time-Machine Jadwal Standar Pengadaan (Standar SLA Hari Kerja PBJ)</div>
      <p style="font-size:12px; color:#475569; margin:0 0 16px;">Estimasi durasi pelaksanaan tiap fase pengadaan sesuai karakteristik metode pemilihan LKPP.</p>
      
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:14px; margin-bottom:18px;">
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:14px;">
          <div style="font-weight:800; color:#1e40af; font-size:13px; margin-bottom:6px;">⚡ E-Purchasing (Katalog v6)</div>
          <div style="font-size:12px; color:#334155; line-height:1.6;">
            • Perencanaan: 2 - 3 Hari<br/>
            • Pemilihan / Negosiasi: 2 - 4 Hari<br/>
            • Penerbitan Surat Pesanan: 1 - 2 Hari<br/>
            • Total Waktu Persiapan: <strong>5 - 9 Hari Kerja</strong>
          </div>
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:14px;">
          <div style="font-weight:800; color:#047857; font-size:13px; margin-bottom:6px;">🤝 Pengadaan Langsung (Non-Katalog)</div>
          <div style="font-size:12px; color:#334155; line-height:1.6;">
            • Perencanaan & HPS: 3 - 5 Hari<br/>
            • Undangan & Pemasukan Harga: 3 - 5 Hari<br/>
            • Evaluasi & Negosiasi: 1 - 2 Hari<br/>
            • TTD Kontrak / SPK: 1 - 2 Hari<br/>
            • Total Waktu Persiapan: <strong>8 - 14 Hari Kerja</strong>
          </div>
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:14px;">
          <div style="font-weight:800; color:#b45309; font-size:13px; margin-bottom:6px;">⚖️ Tender / Seleksi Terbuka</div>
          <div style="font-size:12px; color:#334155; line-height:1.6;">
            • Persiapan DPP PPK: 5 - 10 Hari<br/>
            • Pengumuman s.d Pembuktian: 15 - 20 Hari<br/>
            • Masa Sanggah: 5 Hari Kalender<br/>
            • Penerbitan SPPBJ & Kontrak: 5 - 7 Hari<br/>
            • Total Waktu Persiapan: <strong>30 - 45 Hari Kerja</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildPanduanRegulasiContentHtml() {
  return `
    <div>
      <div style="font-weight:800; font-size:15px; color:#0f172a; margin-bottom:4px;">⚖️ Matriks Regulasi PBJ &amp; Batasan Nilai Kontrak (Perpres 46/2025 &amp; Perlem LKPP 2026)</div>
      <p style="font-size:12px; color:#475569; margin:0 0 16px;">Tabel batas nilai administratif, bentuk kontrak yang sah, dan ketentuan prioritas PDN/UMK.</p>

      <div style="border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; margin-bottom:16px;">
        <table class="cakra-data-table" style="margin:0;">
          <thead>
            <tr>
              <th>Bentuk Kontrak</th>
              <th>Batasan Nilai Pengadaan</th>
              <th>Kewenangan Pejabat</th>
              <th>Ketentuan Jaminan Pelaksanaan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700;">Bukti Pembelian / Struk</td>
              <td>Sampai dengan <strong>Rp10.000.000</strong></td>
              <td>Pejabat Pengadaan / Pengelola Keuangan</td>
              <td>Tidak dipersyaratkan</td>
            </tr>
            <tr>
              <td style="font-weight:700;">Kuitansi Pembayaran</td>
              <td>Di atas Rp10 Juta s.d <strong>Rp50.000.000</strong></td>
              <td>Pejabat Pengadaan / PPK</td>
              <td>Tidak dipersyaratkan</td>
            </tr>
            <tr>
              <td style="font-weight:700;">Surat Perintah Kerja (SPK)</td>
              <td>Di atas Rp50 Juta s.d <strong>Rp200.000.000</strong> (Konstruksi s.d Rp400 Juta)</td>
              <td>Pejabat Pembuat Komitmen (PPK)</td>
              <td>Tidak dipersyaratkan untuk non-konstruksi</td>
            </tr>
            <tr>
              <td style="font-weight:700;">Surat Pesanan (E-Purchasing)</td>
              <td>Tanpa batasan nilai (Katalog Elektronik v6)</td>
              <td>PPK / Pejabat Pengadaan</td>
              <td>Wajib jaminan 5% jika nilai di atas Rp200 Juta</td>
            </tr>
            <tr>
              <td style="font-weight:700;">Surat Perjanjian (Kontrak Standar)</td>
              <td>Di atas <strong>Rp200.000.000</strong> atau pekerjaan konstruksi berisiko</td>
              <td>Pejabat Pembuat Komitmen (PPK)</td>
              <td>Wajib jaminan pelaksanaan 5% (atau 5% dari HPS bila penawaran &lt; 80%)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="cakra-alert-regulasi">
        <strong>Ketentuan Khusus Perpres 46/2025 &amp; Perlem LKPP 2/2026:</strong><br/>
        1. <strong>Alokasi Minimal 40%:</strong> Satker wajib mengalokasikan minimal 40% nilai anggaran belanja pengadaan untuk produk Usaha Mikro, Usaha Kecil, dan/atau Koperasi dari hasil produksi dalam negeri.<br/>
        2. <strong>E-Purchasing Bebas HPS:</strong> E-Purchasing untuk transaksi sampai dengan Rp100.000.000 (seratus juta rupiah) dibebaskan dari penyusunan HPS dan cukup menggunakan Referensi Harga.<br/>
        3. <strong>Pekerjaan Konstruksi:</strong> Batasan Pengadaan Langsung untuk Pekerjaan Konstruksi dinaikkan dari Rp200 Juta menjadi sampai dengan Rp400 Juta.
      </div>
    </div>
  `;
}

function buildPanduanDokumenContentHtml() {
  const cardsHtml = (CakraState.definisi18Tahap || []).map(d => `
    <div class="cakra-doc-card" style="margin-bottom:8px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span class="cakra-badge cakra-badge-amber">Tahap ${d.no} (Fase ${d.fase})</span>
        <span class="cakra-mono" style="font-size:11px; color:#64748b;">Kode: ${cakraEsc(d.kode)}</span>
      </div>
      <div style="font-weight:800; font-size:13px; margin-top:4px; color:#0f172a;">${cakraEsc(d.nama)}</div>
      <div style="font-size:11.5px; color:#334155; margin-top:4px;">Output Otomatis: <span class="cakra-mono">${cakraEsc(d.outputUtama)}.docx & .xlsx</span></div>
    </div>
  `).join('');

  return `
    <div>
      <div style="font-weight:800; font-size:15px; color:#0f172a; margin-bottom:4px;">📘 Buku Pintar &amp; Uraian Naskah Sah 18 Tahap PBJ</div>
      <p style="font-size:12px; color:#475569; margin:0 0 14px;">Daftar lengkap 18 dokumen keluaran formal SI-PRABU v3.0 yang dihasilkan secara otomatis ke format Word (.docx) dan Excel (.xlsx).</p>
      <div class="cakra-form-grid-3">${cardsHtml}</div>
    </div>
  `;
}

function buildPanduanSimulatorContentHtml() {
  return `
    <div>
      <div style="font-weight:800; font-size:15px; color:#0f172a; margin-bottom:4px;">🧮 Panduan 14 Skenario Template Pengadaan (Smart Scenario Engine)</div>
      <p style="font-size:12px; color:#475569; margin:0 0 14px;">SI-PRABU mengintegrasikan 14 template skenario otomatis yang menyesuaikan alur tahapan secara cerdas (Smart Bypass).</p>
      
      <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:16px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <div style="font-weight:800; color:#0369a1; font-size:14px;">Uji Mandiri Skenario Pengadaan Satker</div>
          <div style="font-size:12px; color:#075985;">Masukkan nilai pagu dan jenis pengadaan Anda untuk melihat rekomendasi metode, bentuk kontrak, dan tahap bypass otomatis.</div>
        </div>
        <button type="button" class="cakra-btn cakra-btn-primary" onclick="openSimulatorPengadaanModal()" style="font-weight:700;">
          🧮 Buka Simulator Interaktif ↗
        </button>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:10px;">
        ${(CakraState.templates || []).map(t => `
          <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:10px 12px; font-size:11.5px;">
            <div style="font-weight:800; color:#1e40af; margin-bottom:2px;">${cakraEsc(t.nama)}</div>
            <div style="color:#475569;">Jenis: <strong>${cakraEsc(t.jenis_pengadaan)}</strong> | Metode: <strong>${cakraEsc(t.metode_pemilihan)}</strong></div>
            <div style="color:#047857; margin-top:2px;">Bentuk: <strong>${cakraEsc(t.bentuk_kontrak)}</strong> (${cakraEsc(t.jenis_kertas_harga)})</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

window.renderPanduanPengadaanView = renderPanduanPengadaanView;
window.switchPanduanTab = switchPanduanTab;


// ============================================================================
// PENGADAAN BARU: LANDING VIEW, POP-UP FORMULIR TAHAP 1 & ALUR SELESAI
// (Arsitektur Resmi SI-PRABU v3.0 - Arahan Mas emenje)
// ============================================================================

function showPengadaanLandingView() {
  const landingArea = document.getElementById('cakra-pengadaan-landing-area');
  const workspaceArea = document.getElementById('cakra-cockpit-workspace-area');
  if (landingArea) {
    landingArea.style.display = 'block';
    renderPengadaanLandingTable();
  }
  if (workspaceArea) {
    workspaceArea.style.display = 'none';
  }
}
window.showPengadaanLandingView = showPengadaanLandingView;

function showCockpitWorkspace() {
  const landingArea = document.getElementById('cakra-pengadaan-landing-area');
  const workspaceArea = document.getElementById('cakra-cockpit-workspace-area');
  if (landingArea) landingArea.style.display = 'none';
  if (workspaceArea) workspaceArea.style.display = 'block';
}
window.showCockpitWorkspace = showCockpitWorkspace;

function exitCockpitToLanding() {
  CakraState.activePaketId = null;
  CakraState.activePaketCtx = null;
  if (typeof window.switchView === 'function') {
    window.switchView('view-pengadaan-paket');
  } else {
    showPengadaanLandingView();
  }
}
window.exitCockpitToLanding = exitCockpitToLanding;

function renderPengadaanLandingTable() {
  const landingArea = document.getElementById('cakra-pengadaan-landing-area');
  if (!landingArea) return;

  const allPakets = CakraState.pakets || [];
  const berjalan = allPakets.filter(p => !isPaketSelesai(p));

  landingArea.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:20px;">
      <div>
        <div style="display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#1e40af; padding:4px 12px; border-radius:20px; font-size:11.5px; font-weight:700; letter-spacing:0.5px; margin-bottom:8px;">
          <span>📋 PENGADAAN BARU &amp; PAKET BERJALAN</span>
        </div>
        <h1 style="font-size:20px; font-weight:800; color:#0f172a; margin:0;">
          Inisiasi Pengadaan Baru &amp; Lembar Kerja Berjalan
        </h1>
        <p style="font-size:13px; color:#64748b; margin:4px 0 0;">
          Mulai inisiasi pengadaan baru via pop-up formulir Tahap 1, atau lanjutkan paket pengadaan yang belum selesai di bawah ini.
        </p>
      </div>
      <div>
        <button type="button" class="cakra-btn cakra-btn-primary" onclick="openModalTahap1Input('NEW')" style="font-size:13.5px; font-weight:800; padding:10px 22px; border-radius:8px; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 12px rgba(37,99,235,0.3); cursor:pointer;">
          <span>🪄 + Buat Paket Pengadaan Baru</span>
        </button>
      </div>
    </div>

    <!-- TABEL PAKET BELUM SELESAI -->
    <div class="cakra-card" style="width:100%;">
      <div class="cakra-card-header" style="display:flex; justify-content:space-between; align-items:center; padding:14px 20px;">
        <div class="cakra-card-title" style="display:flex; align-items:center; gap:8px;">
          <span>⏳</span>
          <span>Daftar Paket Pengadaan yang Belum Selesai (Sedang Berjalan &amp; Draf)</span>
          <span class="cakra-badge cakra-badge-amber" style="font-weight:800;">${berjalan.length} Paket</span>
        </div>
      </div>
      <div class="cakra-card-body" style="padding:0; overflow-x:auto;">
        <table class="cakra-data-table">
          <thead>
            <tr>
              <th style="width:40px; text-align:center;">No</th>
              <th style="width:130px;">Kode Paket</th>
              <th>Nama Paket Pengadaan</th>
              <th style="width:100px;">PIC Subbag</th>
              <th style="width:110px;">MAK DIPA</th>
              <th style="width:140px; text-align:right;">Pagu DIPA</th>
              <th style="width:170px;">Tahap Aktif</th>
              <th style="width:120px; text-align:center;">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${berjalan.length === 0 ? `
              <tr>
                <td colspan="8" style="text-align:center; padding:36px; color:#64748b;">
                  <div style="font-size:24px; margin-bottom:8px;">☕</div>
                  <div style="font-weight:700; font-size:13px; color:#334155;">Tidak ada paket pengadaan berjalan / draf saat ini.</div>
                  <div style="font-size:12px; margin-top:4px;">Seluruh pengadaan telah selesai 100%, atau klik tombol <strong>[ 🪄 + Buat Paket Pengadaan Baru ]</strong> di atas untuk memulai paket baru.</div>
                </td>
              </tr>
            ` : berjalan.map((p, idx) => {
              const tahapAktif = p.tahap_aktif || 1;
              const def = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === Number(tahapAktif)) || { kode: 'IDK', nama: 'Identifikasi Kebutuhan' };
              return `
                <tr>
                  <td style="text-align:center; font-weight:700; color:#64748b;">${idx + 1}</td>
                  <td class="cakra-mono" style="font-weight:800; color:#1e40af;">${cakraEsc(p.kode_paket_internal || '-')}</td>
                  <td>
                    <div style="font-weight:700; color:#0f172a; line-height:1.35;">${cakraEsc(p.nama_paket)}</div>
                    <div style="font-size:11px; color:#64748b; margin-top:2px;">${cakraEsc(p.jenis_pengadaan || 'Barang')} &bull; ${cakraEsc(p.metode_pemilihan || 'E-Purchasing')}</div>
                  </td>
                  <td><span class="cakra-badge cakra-badge-blue">${cakraEsc(p.pic_subbag || 'KUL')}</span></td>
                  <td class="cakra-mono" style="font-weight:700; color:#334155;">${cakraEsc(p.kode_akun_mak || '-')}</td>
                  <td class="cakra-mono" style="text-align:right; font-weight:800; color:#0f172a;">${cakraFmtRp(p.nilai_pagu)}</td>
                  <td>
                    <span class="cakra-badge cakra-badge-amber" style="font-weight:700;">
                      Tahap ${tahapAktif}: ${def.kode}
                    </span>
                    <div style="font-size:10.5px; color:#64748b; margin-top:2px;">${cakraEsc(p.status_paket || 'Draf')}</div>
                  </td>
                  <td style="text-align:center;">
                    <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="openPaketFromLanding(${p.id}, ${tahapAktif})" style="font-weight:800; padding:4px 10px; font-size:11px; display:inline-flex; align-items:center; gap:4px;" title="Lanjutkan pengerjaan di Kokpit">
                      <span>🚀 Buka Kokpit</span>
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
window.renderPengadaanLandingTable = renderPengadaanLandingTable;

async function openPaketFromLanding(paketId, stageNo = 1) {
  CakraState.activePaketId = paketId;
  showCockpitWorkspace();
  await openPaketInCockpit(paketId, stageNo, false);
}
window.openPaketFromLanding = openPaketFromLanding;

// POP-UP FORMULIR TAHAP 1
function openModalTahap1Input(paketIdOrNew = 'NEW') {
  const modal = document.getElementById('modal-tahap1-input');
  if (!modal) return;

  const isNew = paketIdOrNew === 'NEW' || !paketIdOrNew;
  CakraState.modalTahap1EditingId = isNew ? null : Number(paketIdOrNew);

  const titleEl = document.getElementById('modal-tahap1-title');
  const kodeInp = document.getElementById('m1_kode_paket_internal');
  const linkDriveInp = document.getElementById('m1_link_drive_dokumen');
  const tahaps = CakraState.activePaketCtx?.tahaps || [];
  const activeTRow = tahaps.find(t => Number(t.no_tahap) === 1) || {};
  if (linkDriveInp) linkDriveInp.value = activeTRow.link_drive_dokumen || '';
  const rupInp = document.getElementById('m1_kode_rup');
  const noDokInp = document.getElementById('m1_nomor_dokumen');
  const tglDokInp = document.getElementById('m1_tanggal_dokumen');
  const subbagSel = document.getElementById('m1_pic_subbag');
  const noNotaInp = document.getElementById('m1_no_nota_dinas_pengusul');
  const tglNotaInp = document.getElementById('m1_tgl_nota_dinas_pengusul');
  const perihalInp = document.getElementById('m1_perihal_nota_dinas');
  const noDispInp = document.getElementById('m1_no_disposisi_kpa');
  const tglDispInp = document.getElementById('m1_tgl_disposisi_kpa');
  const namaPaketInp = document.getElementById('m1_nama_paket');
  const uraianInp = document.getElementById('m1_uraian_pekerjaan');
  const makInp = document.getElementById('m1_kode_akun_mak');
  const namaMakInp = document.getElementById('m1_nama_akun_mak');
  const paguInp = document.getElementById('m1_nilai_pagu');
  const paguTerbilang = document.getElementById('m1_pagu_terbilang');
  const rkbBadgeBox = document.getElementById('m1_rkb_badge_container');
  const rkbSilsilahText = document.getElementById('m1_rkb_silsilah_text');

  const bmnSifat = document.getElementById('m1_bmn_sifat_kebutuhan');
  const bmnStatus = document.getElementById('m1_bmn_status_ketersediaan');
  const bmnKesesuaian = document.getElementById('m1_bmn_kesesuaian_rkbmn');
  const bmnJml = document.getElementById('m1_bmn_jumlah_eksisting');
  const bmnCatatan = document.getElementById('m1_bmn_catatan_telaah');

  if (isNew) {
    if (titleEl) titleEl.textContent = '🪄 Formulir Inisiasi Pengadaan Baru — Tahap 1: Identifikasi Kebutuhan';
    const existingNums = (CakraState.pakets || []).map(p => {
      const m = String(p.kode_paket_internal || '').match(/(\d+)$/);
      return m ? parseInt(m[1], 10) : 0;
    });
    const maxNum = existingNums.length ? Math.max(...existingNums) : 0;
    const nextCode = 'PBJ-2026-' + String(maxNum + 1).padStart(3, '0');
    const autoDocNo = generateAutoStageDocNumber(1, nextCode, '2026-05-04');

    if (kodeInp) kodeInp.value = nextCode;
    if (noDokInp) noDokInp.value = autoDocNo;
    if (tglDokInp) tglDokInp.value = '2026-05-04';
    if (subbagSel) subbagSel.value = 'KUL';
    if (noNotaInp) noNotaInp.value = '001/ND.KUL/KPU-Kab-014.329781/V/2026';
    if (tglNotaInp) tglNotaInp.value = '2026-05-04';
    if (perihalInp) perihalInp.value = '';
    if (noDispInp) noDispInp.value = '014/DISP.KPA/V/2026';
    if (tglDispInp) tglDispInp.value = '2026-05-04';
    if (namaPaketInp) namaPaketInp.value = '';
    if (uraianInp) uraianInp.value = '';
    if (makInp) makInp.value = '521211';
    if (namaMakInp) namaMakInp.value = 'Belanja Bahan';
    if (paguInp) paguInp.value = 0;
    if (paguTerbilang) paguTerbilang.textContent = 'Rp 0';
    if (rkbBadgeBox) rkbBadgeBox.style.display = 'none';

    if (bmnSifat) bmnSifat.value = 'PENGGANTIAN';
    if (bmnStatus) bmnStatus.value = 'TERSEDIA_KURANG';
    if (bmnKesesuaian) bmnKesesuaian.value = 'SESUAI';
    if (bmnJml) bmnJml.value = 0;
    if (bmnCatatan) bmnCatatan.value = '';

    toggleModalTahap1MultiSubbag(false);
    onModalTahap1MakChange('521211');
  } else {
    if (titleEl) titleEl.textContent = '✏️ Edit Data Pengadaan — Tahap 1: Identifikasi Kebutuhan';
    const p = (CakraState.pakets || []).find(x => Number(x.id) === Number(paketIdOrNew)) ||
      (CakraState.activePaketCtx?.paket?.id === Number(paketIdOrNew) ? CakraState.activePaketCtx.paket : {});
    const activeTRow = (CakraState.activePaketCtx?.tahaps || []).find(t => Number(t.no_tahap) === 1) || {};

    if (kodeInp) kodeInp.value = p.kode_paket_internal || '';
    if (noDokInp) noDokInp.value = activeTRow.nomor_dokumen || generateAutoStageDocNumber(1, p.kode_paket_internal, activeTRow.tanggal_dokumen);
    if (tglDokInp) tglDokInp.value = activeTRow.tanggal_dokumen || '2026-05-04';
    if (subbagSel) subbagSel.value = p.pic_subbag || 'KUL';
    if (noNotaInp) noNotaInp.value = p.no_nota_dinas_pengusul || '';
    if (tglNotaInp) tglNotaInp.value = p.tgl_nota_dinas_pengusul || '2026-05-04';
    if (perihalInp) perihalInp.value = p.perihal_nota_dinas || '';
    if (noDispInp) noDispInp.value = p.no_disposisi_kpa || '';
    if (tglDispInp) tglDispInp.value = p.tgl_disposisi_kpa || '2026-05-04';
    if (namaPaketInp) namaPaketInp.value = p.nama_paket || '';
    if (uraianInp) uraianInp.value = p.uraian_pekerjaan || '';
    if (makInp) makInp.value = p.kode_akun_mak || '';
    if (namaMakInp) namaMakInp.value = p.nama_akun_mak || '';
    if (paguInp) paguInp.value = Number(p.nilai_pagu || 0);
    if (paguTerbilang) paguTerbilang.textContent = cakraFmtRp(Number(p.nilai_pagu || 0));

    if (p.rkb_program) {
      if (rkbBadgeBox) rkbBadgeBox.style.display = 'block';
      if (rkbSilsilahText) rkbSilsilahText.textContent = p.rkb_program + ' > ' + (p.rkb_kegiatan || '') + ' > ' + (p.rkb_subkegiatan || '');
    } else {
      if (rkbBadgeBox) rkbBadgeBox.style.display = 'none';
    }

    if (bmnSifat) bmnSifat.value = p.bmn_sifat_kebutuhan || 'PENGGANTIAN';
    if (bmnStatus) bmnStatus.value = p.bmn_status_ketersediaan || 'TERSEDIA_KURANG';
    if (bmnKesesuaian) bmnKesesuaian.value = p.bmn_kesesuaian_rkbmn || 'SESUAI';
    if (bmnJml) bmnJml.value = Number(p.bmn_jumlah_eksisting || 0);
    if (bmnCatatan) bmnCatatan.value = p.bmn_catatan_telaah || '';

    let isMulti = !!(p.is_multi_subbag || (Array.isArray(p.subbags) && p.subbags.length > 1));
    let multiList = [];
    if (Array.isArray(p.subbags) && p.subbags.length > 0) {
      multiList = p.subbags;
    } else if (p.multi_pengusul_json) {
      try {
        multiList = typeof p.multi_pengusul_json === 'string' ? JSON.parse(p.multi_pengusul_json) : p.multi_pengusul_json;
      } catch (e) { multiList = []; }
    }
    if (!Array.isArray(multiList)) multiList = [];
    if (multiList.length > 1) isMulti = true;

    toggleModalTahap1MultiSubbag(isMulti);
    if (isMulti) {
      renderModalTahap1PengusulRows(multiList);
    }

    onModalTahap1MakChange(p.kode_akun_mak || '');
  }

  modal.style.display = 'flex';
}
window.openModalTahap1Input = openModalTahap1Input;

function closeModalTahap1Input(force = false) {
  const namaInp = document.getElementById('m1_nama_paket');
  const paguInp = document.getElementById('m1_nilai_pagu');
  const hasInput = (namaInp && namaInp.value.trim().length > 0) || (paguInp && Number(paguInp.value) > 0);

  if (!force && hasInput) {
    if (!confirm('⚠️ Anda telah memasukkan data pada formulir. Yakin ingin membatalkan dan menutup formulir ini?')) {
      return; // batal menutup, data tetap utuh terjaga
    }
  }

  const modal = document.getElementById('modal-tahap1-input');
  if (modal) modal.style.display = 'none';
}
window.closeModalTahap1Input = closeModalTahap1Input;

function onModalTahap1SubbagChange(val) {
  const noNotaInp = document.getElementById('m1_no_nota_dinas_pengusul');
  if (noNotaInp && (!noNotaInp.value || noNotaInp.value.includes('/ND.'))) {
    noNotaInp.value = '001/ND.' + val + '/KPU-Kab-014.329781/V/2026';
  }
}
window.onModalTahap1SubbagChange = onModalTahap1SubbagChange;

// =============================================================================
// HELPER TAHAP 1: KONSOLIDASI MULTI-SUBBAGIAN PENGUSUL
// =============================================================================
function toggleModalTahap1MultiSubbag(isMulti) {
  const boxSingle = document.getElementById('m1_box_subbag_tunggal');
  const boxMulti = document.getElementById('m1_box_subbag_multi');
  const radioSingle = document.getElementById('m1_mode_subbag_single');
  const radioMulti = document.getElementById('m1_mode_subbag_multi');
  if (radioSingle) radioSingle.checked = !isMulti;
  if (radioMulti) radioMulti.checked = !!isMulti;
  if (boxSingle) boxSingle.style.display = isMulti ? 'none' : 'block';
  if (boxMulti) boxMulti.style.display = isMulti ? 'block' : 'none';

  if (isMulti) {
    const container = document.getElementById('m1_multi_pengusul_list');
    if (container && container.querySelectorAll('.m1-pengusul-row').length === 0) {
      addModalTahap1PengusulRow({ subbag: 'KUL', no_nota: '001/ND.KUL/KPU-Kab-014.329781/V/2026', tgl_nota: '2026-05-04', perihal: 'Usulan Kebutuhan Barang Subbag KUL TA 2026' });
      addModalTahap1PengusulRow({ subbag: 'RENDATIN', no_nota: '001/ND.RENDATIN/KPU-Kab-014.329781/V/2026', tgl_nota: '2026-05-04', perihal: 'Usulan Kebutuhan Barang Subbag RENDATIN TA 2026' });
    }
  }
}
window.toggleModalTahap1MultiSubbag = toggleModalTahap1MultiSubbag;

function renderModalTahap1PengusulRows(list) {
  const container = document.getElementById('m1_multi_pengusul_list');
  if (!container) return;
  container.innerHTML = '';
  if (!Array.isArray(list) || list.length === 0) {
    addModalTahap1PengusulRow({ subbag: 'KUL', no_nota: '001/ND.KUL/KPU-Kab-014.329781/V/2026', tgl_nota: '2026-05-04', perihal: 'Usulan Kebutuhan Barang Subbag KUL TA 2026' });
    addModalTahap1PengusulRow({ subbag: 'RENDATIN', no_nota: '001/ND.RENDATIN/KPU-Kab-014.329781/V/2026', tgl_nota: '2026-05-04', perihal: 'Usulan Kebutuhan Barang Subbag RENDATIN TA 2026' });
    return;
  }
  list.forEach(item => addModalTahap1PengusulRow(item));
}
window.renderModalTahap1PengusulRows = renderModalTahap1PengusulRows;

function addModalTahap1PengusulRow(data = {}) {
  const container = document.getElementById('m1_multi_pengusul_list');
  if (!container) return;
  const count = container.querySelectorAll('.m1-pengusul-row').length;
  const idx = count + 1;
  const subbagVal = data.subbag || (idx === 1 ? 'KUL' : (idx === 2 ? 'RENDATIN' : (idx === 3 ? 'TEKNIS' : (idx === 4 ? 'HUKUM' : 'PARSDM'))));
  const noNota = data.no_nota || ('001/ND.' + subbagVal + '/KPU-Kab-014.329781/V/2026');
  const tglNota = data.tgl_nota || '2026-05-04';
  const perihal = data.perihal || ('Usulan Pengadaan Barang Kebutuhan Subbag ' + subbagVal + ' TA 2026');

  const div = document.createElement('div');
  div.className = 'm1-pengusul-row';
  div.style.cssText = 'background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-bottom:10px; position:relative;';
  div.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
      <div style="font-size:11.5px; font-weight:800; color:#1e40af;" class="m1-pengusul-title">
        🏛️ Subbagian Pengusul ${idx}
      </div>
      <button type="button" class="btn btn-xs btn-outline-danger" onclick="removeModalTahap1PengusulRow(this)" style="font-size:10px; padding:2px 8px; border-radius:4px; border:1px solid #fca5a5; background:#fff; color:#dc2626; cursor:pointer;">
        ✕ Hapus Subbag
      </button>
    </div>
    <div style="display:grid; grid-template-columns: 1.2fr 1.4fr 1fr; gap:10px; margin-bottom:8px;">
      <div>
        <label style="font-size:10.5px; font-weight:700; color:#475569; display:block; margin-bottom:3px;">Subbag Pemohon *</label>
        <select class="cakra-form-control m1-pengusul-subbag" style="font-size:11px; font-weight:700;" onchange="onModalTahap1MultiSubbagSelect(this)">
          <option value="KUL" ${subbagVal === 'KUL' ? 'selected' : ''}>Subbag Keuangan, Umum & Logistik (KUL)</option>
          <option value="RENDATIN" ${subbagVal === 'RENDATIN' ? 'selected' : ''}>Subbag Perencanaan, Data & Informasi (RENDATIN)</option>
          <option value="TEKNIS" ${subbagVal === 'TEKNIS' ? 'selected' : ''}>Subbag Teknis Penyelenggaraan Pemilu (TEKNIS)</option>
          <option value="HUKUM" ${subbagVal === 'HUKUM' ? 'selected' : ''}>Subbag Hukum & SDM (HUKUM)</option>
          <option value="PARSDM" ${subbagVal === 'PARSDM' ? 'selected' : ''}>Subbag Partisipasi Hubmas & SDM (PARSDM)</option>
        </select>
      </div>
      <div>
        <label style="font-size:10.5px; font-weight:700; color:#475569; display:block; margin-bottom:3px;">Nomor Nota Dinas Pengusul</label>
        <input type="text" class="cakra-form-control cakra-mono m1-pengusul-no-nota" value="${cakraEsc(noNota)}" style="font-size:11px;" placeholder="cth: 001/ND.../V/2026" />
      </div>
      <div>
        <label style="font-size:10.5px; font-weight:700; color:#475569; display:block; margin-bottom:3px;">Tanggal Nota Dinas</label>
        <input type="date" class="cakra-form-control m1-pengusul-tgl-nota" value="${cakraEsc(tglNota)}" style="font-size:11px;" />
      </div>
    </div>
    <div>
      <label style="font-size:10.5px; font-weight:700; color:#475569; display:block; margin-bottom:3px;">Perihal Nota Dinas</label>
      <input type="text" class="cakra-form-control m1-pengusul-perihal" value="${cakraEsc(perihal)}" style="font-size:11px;" placeholder="cth: Usulan Kebutuhan Barang..." />
    </div>
  `;
  container.appendChild(div);
  refreshModalTahap1PengusulTitles();
}
window.addModalTahap1PengusulRow = addModalTahap1PengusulRow;

function removeModalTahap1PengusulRow(btn) {
  const row = btn.closest('.m1-pengusul-row');
  if (!row) return;
  const container = document.getElementById('m1_multi_pengusul_list');
  if (container.querySelectorAll('.m1-pengusul-row').length <= 1) {
    cakraNotify('⚠️ Minimal harus ada 1 subbag pengusul!', 'warning');
    return;
  }
  row.remove();
  refreshModalTahap1PengusulTitles();
}
window.removeModalTahap1PengusulRow = removeModalTahap1PengusulRow;

function refreshModalTahap1PengusulTitles() {
  const container = document.getElementById('m1_multi_pengusul_list');
  if (!container) return;
  container.querySelectorAll('.m1-pengusul-row').forEach((row, i) => {
    const t = row.querySelector('.m1-pengusul-title');
    if (t) t.textContent = '🏛️ Subbagian Pengusul ' + (i + 1);
  });
}
window.refreshModalTahap1PengusulTitles = refreshModalTahap1PengusulTitles;

function onModalTahap1MultiSubbagSelect(sel) {
  const row = sel.closest('.m1-pengusul-row');
  if (!row) return;
  const noNotaInp = row.querySelector('.m1-pengusul-no-nota');
  const val = sel.value;
  if (noNotaInp && (!noNotaInp.value || noNotaInp.value.includes('/ND.'))) {
    noNotaInp.value = '001/ND.' + val + '/KPU-Kab-014.329781/V/2026';
  }
}
window.onModalTahap1MultiSubbagSelect = onModalTahap1MultiSubbagSelect;

function onModalTahap1MakChange(val) {
  const clean = String(val || '').trim();
  const bmnBox = document.getElementById('m1_seksi_telaah_bmn');
  const bmnNote = document.getElementById('m1_seksi_telaah_bmn_note');
  const isModal = clean.startsWith('53');
  if (bmnBox) bmnBox.style.display = isModal ? 'block' : 'none';
  if (bmnNote) bmnNote.style.display = isModal ? 'none' : 'flex';
}
window.onModalTahap1MakChange = onModalTahap1MakChange;

function onModalTahap1PaguChange(val) {
  const terbilangEl = document.getElementById('m1_pagu_terbilang');
  if (terbilangEl) terbilangEl.textContent = cakraFmtRp(Number(val || 0));
}
window.onModalTahap1PaguChange = onModalTahap1PaguChange;

function openRkbDrawerForModalTahap1() {
  CakraState.rkbTarget = 'modal_tahap1';
  toggleCakraRkbDrawer();
}
window.openRkbDrawerForModalTahap1 = openRkbDrawerForModalTahap1;

async function submitModalTahap1Input(isSelesaiAction = false) {
  const getStr = id => {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  };
  const getNum = id => {
    const el = document.getElementById(id);
    return el ? Number(el.value || 0) : 0;
  };

  const namaPaket = getStr('m1_nama_paket');
  const nilaiPagu = getNum('m1_nilai_pagu');
  const kodeMak = getStr('m1_kode_akun_mak');

  if (!namaPaket) {
    cakraNotify('⚠️ Nama Paket Pengadaan wajib diisi!', 'warning');
    const el = document.getElementById('m1_nama_paket');
    if (el) el.focus();
    return;
  }
  if (!nilaiPagu || nilaiPagu <= 0) {
    cakraNotify('⚠️ Nilai Pagu DIPA harus lebih besar dari Rp 0!', 'warning');
    const el = document.getElementById('m1_nilai_pagu');
    if (el) el.focus();
    return;
  }
  if (!kodeMak) {
    cakraNotify('⚠️ Kode Akun MAK DIPA wajib diisi!', 'warning');
    const el = document.getElementById('m1_kode_akun_mak');
    if (el) el.focus();
    return;
  }

  const isEdit = !!CakraState.modalTahap1EditingId;
  const existingPaket = isEdit
    ? ((CakraState.activePaketCtx?.paket?.id === CakraState.modalTahap1EditingId ? CakraState.activePaketCtx.paket : null) || (CakraState.pakets || []).find(x => Number(x.id) === CakraState.modalTahap1EditingId) || {})
    : {};
  const tahaps = CakraState.activePaketCtx?.tahaps || [];
  const activeTRow = tahaps.find(t => Number(t.no_tahap) === 1) || {};

  const cleanMak = kodeMak.replace(/[^0-9]/g, '');
  const isModalMak = cleanMak.startsWith('53');
  const linkDrive = getStr('m1_link_drive_dokumen') || activeTRow.link_drive_dokumen || '';

  if (isSelesaiAction) {
    if (!linkDrive || linkDrive.length < 10 || !linkDrive.startsWith('http')) {
      cakraNotify('⚠️ Tahap 1 belum dapat diselesaikan! Sesuai SOP & regulasi pengadaan, tautan Google Drive dokumen sah bertandatangan wajib diisi.', 'warning');
      const el = document.getElementById('m1_link_drive_dokumen');
      if (el) {
        el.focus();
        el.style.border = '2px solid #ef4444';
        setTimeout(() => { if (el) el.style.border = ''; }, 3000);
      }
      return;
    }
  }

  const statusTahap = isSelesaiAction ? 'Selesai' : (activeTRow.status_tahap === 'Selesai' ? 'Selesai' : 'Draft');
  const targetStageToOpen = isSelesaiAction ? 2 : 1;

  const isMulti = document.getElementById('m1_mode_subbag_multi')?.checked || false;
  let multiPengusulList = [];
  let picSubbagVal = '';
  let noNotaVal = '';
  let tglNotaVal = '';
  let perihalVal = '';

  if (isMulti) {
    const rows = document.querySelectorAll('#m1_multi_pengusul_list .m1-pengusul-row');
    rows.forEach(r => {
      const sub = r.querySelector('.m1-pengusul-subbag')?.value || 'KUL';
      const noN = r.querySelector('.m1-pengusul-no-nota')?.value.trim() || '';
      const tglN = r.querySelector('.m1-pengusul-tgl-nota')?.value || '2026-05-04';
      const per = r.querySelector('.m1-pengusul-perihal')?.value.trim() || '';
      multiPengusulList.push({ subbag: sub, no_nota: noN, tgl_nota: tglN, perihal: per });
    });
    if (multiPengusulList.length === 0) {
      cakraNotify('⚠️ Minimal harus ada 1 Subbagian pengusul pada usulan multi-subbag!', 'warning');
      return;
    }
    picSubbagVal = [...new Set(multiPengusulList.map(x => x.subbag))].join(', ');
    noNotaVal = multiPengusulList.map(x => x.no_nota).filter(Boolean).join('; ');
    tglNotaVal = multiPengusulList[0]?.tgl_nota || '2026-05-04';
    perihalVal = multiPengusulList.map(x => x.perihal).filter(Boolean).join('; ');
  } else {
    picSubbagVal = getStr('m1_pic_subbag') || 'KUL';
    noNotaVal = getStr('m1_no_nota_dinas_pengusul');
    tglNotaVal = getStr('m1_tgl_nota_dinas_pengusul') || '2026-05-04';
    perihalVal = getStr('m1_perihal_nota_dinas');
  }

  const payload = {
    ...existingPaket,
    id: isEdit ? CakraState.modalTahap1EditingId : undefined,
    kode_paket_internal: getStr('m1_kode_paket_internal') || existingPaket.kode_paket_internal,
    kode_rup: getStr('m1_kode_rup') || existingPaket.kode_rup || '',
    nama_paket: namaPaket,
    uraian_pekerjaan: getStr('m1_uraian_pekerjaan'),
    pic_subbag: picSubbagVal,
    is_multi_subbag: isMulti ? 1 : 0,
    multi_pengusul_json: isMulti ? multiPengusulList : null,
    kode_akun_mak: cleanMak,
    nama_akun_mak: getStr('m1_nama_akun_mak') || (isModalMak ? 'Belanja Modal Peralatan dan Mesin' : 'Belanja Bahan'),
    nilai_pagu: nilaiPagu,
    no_nota_dinas_pengusul: noNotaVal,
    tgl_nota_dinas_pengusul: tglNotaVal,
    perihal_nota_dinas: perihalVal,
    no_disposisi_kpa: getStr('m1_no_disposisi_kpa'),
    tgl_disposisi_kpa: getStr('m1_tgl_disposisi_kpa') || '2026-05-04',
    bmn_sifat_kebutuhan: isModalMak ? getStr('m1_bmn_sifat_kebutuhan') : 'PENGGANTIAN',
    bmn_status_ketersediaan: isModalMak ? getStr('m1_bmn_status_ketersediaan') : 'BELUM_TERSEDIA',
    bmn_kesesuaian_rkbmn: isModalMak ? getStr('m1_bmn_kesesuaian_rkbmn') : 'SESUAI',
    bmn_jumlah_eksisting: isModalMak ? getNum('m1_bmn_jumlah_eksisting') : 0,
    bmn_catatan_telaah: isModalMak ? getStr('m1_bmn_catatan_telaah') : '',
    jenis_pengadaan: existingPaket.jenis_pengadaan || 'Barang',
    cara_pengadaan: existingPaket.cara_pengadaan || 'Penyedia',
    metode_pemilihan: existingPaket.metode_pemilihan || 'E-Purchasing',
    bentuk_kontrak: existingPaket.bentuk_kontrak || (nilaiPagu <= 50000000 ? 'Kuitansi' : (nilaiPagu <= 200000000 ? 'Surat Pesanan' : 'Surat Perjanjian')),
    jenis_kontrak: existingPaket.jenis_kontrak || 'Lumsum',
    jenis_kertas_harga: existingPaket.jenis_kertas_harga || 'HPS',
    nilai_hps: existingPaket.nilai_hps || nilaiPagu,
    nilai_kontrak: existingPaket.nilai_kontrak || nilaiPagu,
    stageUpdate: {
      no_tahap: 1,
      fase: 1,
      nama_tahap: 'Identifikasi Kebutuhan PBJ',
      nomor_dokumen: getStr('m1_nomor_dokumen') || generateAutoStageDocNumber(1, getStr('m1_kode_paket_internal'), getStr('m1_tanggal_dokumen')),
      tanggal_dokumen: getStr('m1_tanggal_dokumen') || '2026-05-04',
      status_tahap: statusTahap,
      link_drive_dokumen: linkDrive,
      catatan_tahap: 'Identifikasi Kebutuhan PBJ & Pagu DIPA/RKB'
    }
  };

  try {
    const res = await cakraApiPost('/api/cakra/paket', payload);
    const savedId = res.id || existingPaket.id;
    closeModalTahap1Input(true);
    await initCakraApp();
    CakraState.activePaketId = savedId;
    showCockpitWorkspace();
    await openPaketInCockpit(savedId, targetStageToOpen, true);
    if (isSelesaiAction) {
      cakraNotify('🎉 Tahap 1 Resmi Selesai! Berkas sah tersimpan di Google Drive. Membuka Tahap 2: RUP.', 'success');
    } else {
      cakraNotify('💾 Draf data Tahap 1 berhasil disimpan! Membuka Lembar Kerja Tahap 1.', 'success');
    }
  } catch (err) {
    cakraNotify('❌ Gagal menyimpan paket: ' + err.message, 'error');
  }
}
window.submitModalTahap1Input = submitModalTahap1Input;

function openModalTahap2Input() {
  const modal = document.getElementById('modal-tahap2-input');
  if (!modal) return;

  const paket = (CakraState.pakets || []).find(p => String(p.id) === String(CakraState.activePaketId)) || {};
  const tahaps = CakraState.activePaketCtx?.tahaps || [];
  const activeTRow = tahaps.find(t => Number(t.no_tahap) === 2) || {};

  const noDokInp = document.getElementById('m2_nomor_dokumen');
  const tglDokInp = document.getElementById('m2_tanggal_dokumen');
  const jenisPengadaanSel = document.getElementById('m2_jenis_pengadaan');
  const caraPengadaanSel = document.getElementById('m2_cara_pengadaan');
  const metodePemilihanSel = document.getElementById('m2_metode_pemilihan');
  const bentukKontrakSel = document.getElementById('m2_bentuk_kontrak');
  const jenisKontrakSel = document.getElementById('m2_jenis_kontrak');
  const jenisKertasHargaSel = document.getElementById('m2_jenis_kertas_harga');

  if (noDokInp) noDokInp.value = activeTRow.nomor_dokumen || generateAutoStageDocNumber(2, paket.kode_paket_internal, activeTRow.tanggal_dokumen || '2026-05-18');
  if (tglDokInp) tglDokInp.value = activeTRow.tanggal_dokumen || '2026-05-18';
  if (jenisPengadaanSel) jenisPengadaanSel.value = paket.jenis_pengadaan || 'Barang';
  if (caraPengadaanSel) caraPengadaanSel.value = paket.cara_pengadaan || 'Penyedia';
  if (metodePemilihanSel) metodePemilihanSel.value = paket.metode_pemilihan || 'E-Purchasing';
  if (bentukKontrakSel) bentukKontrakSel.value = paket.bentuk_kontrak || 'Surat Pesanan';
  if (jenisKontrakSel) jenisKontrakSel.value = paket.jenis_kontrak || 'Lumsum';
  if (jenisKertasHargaSel) jenisKertasHargaSel.value = paket.jenis_kertas_harga || 'HPS';
  const linkDriveInp = document.getElementById('m2_link_drive_dokumen');
  if (linkDriveInp) linkDriveInp.value = activeTRow.link_drive_dokumen || '';

  modal.style.display = 'flex';
}
window.openModalTahap2Input = openModalTahap2Input;

function closeModalTahap2Input() {
  const modal = document.getElementById('modal-tahap2-input');
  if (modal) modal.style.display = 'none';
}
window.closeModalTahap2Input = closeModalTahap2Input;

async function submitModalTahap2Input(isSelesaiAction = false) {
  const paket = (CakraState.activePaketCtx?.paket?.id === CakraState.activePaketId ? CakraState.activePaketCtx.paket : null)
    || (CakraState.pakets || []).find(p => String(p.id) === String(CakraState.activePaketId));
  if (!paket) {
    cakraNotify('❌ Paket aktif tidak ditemukan!', 'error');
    return;
  }

  const tahaps = CakraState.activePaketCtx?.tahaps || [];
  const activeTRow = tahaps.find(t => Number(t.no_tahap) === 2) || {};
  const activeDef = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === 2) || { nama: 'Penetapan Jenis, Cara Pengadaan, & Pemaketan', fase: 1 };

  const getStr = id => {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  };

  const nomorDokumen = getStr('m2_nomor_dokumen') || activeTRow.nomor_dokumen || generateAutoStageDocNumber(2, paket.kode_paket_internal, '2026-05-18');
  const tanggalDokumen = getStr('m2_tanggal_dokumen') || activeTRow.tanggal_dokumen || '2026-05-18';
  const jenisPengadaan = getStr('m2_jenis_pengadaan') || paket.jenis_pengadaan || 'Barang';
  const caraPengadaan = getStr('m2_cara_pengadaan') || paket.cara_pengadaan || 'Penyedia';
  const metodePemilihan = getStr('m2_metode_pemilihan') || paket.metode_pemilihan || 'E-Purchasing';
  const bentukKontrak = getStr('m2_bentuk_kontrak') || paket.bentuk_kontrak || 'Surat Pesanan';
  const jenisKontrak = getStr('m2_jenis_kontrak') || paket.jenis_kontrak || 'Lumsum';
  const jenisKertasHarga = getStr('m2_jenis_kertas_harga') || paket.jenis_kertas_harga || 'HPS';
  const linkDrive = getStr('m2_link_drive_dokumen') || activeTRow.link_drive_dokumen || '';

  if (isSelesaiAction) {
    if (!linkDrive || linkDrive.length < 10 || !linkDrive.startsWith('http')) {
      cakraNotify('⚠️ Tahap 2 belum dapat diselesaikan! Tautan Google Drive Berita Acara Pemaketan bertandatangan PPK wajib diisi.', 'warning');
      const el = document.getElementById('m2_link_drive_dokumen');
      if (el) {
        el.focus();
        el.style.border = '2px solid #ef4444';
        setTimeout(() => { if (el) el.style.border = ''; }, 3000);
      }
      return;
    }
  }

  const statusTahap = isSelesaiAction ? 'Selesai' : (activeTRow.status_tahap === 'Selesai' ? 'Selesai' : 'Draft');
  const targetStageToOpen = isSelesaiAction ? 3 : 2;

  const payload = {
    ...paket,
    jenis_pengadaan: jenisPengadaan,
    cara_pengadaan: caraPengadaan,
    metode_pemilihan: metodePemilihan,
    bentuk_kontrak: bentukKontrak,
    jenis_kontrak: jenisKontrak,
    jenis_kertas_harga: jenisKertasHarga,
    stageUpdate: {
      no_tahap: 2,
      fase: activeDef.fase || 1,
      nama_tahap: activeDef.nama || 'Penetapan Jenis, Cara Pengadaan, & Pemaketan',
      nomor_dokumen: nomorDokumen,
      tanggal_dokumen: tanggalDokumen,
      status_tahap: statusTahap,
      link_drive_dokumen: linkDrive,
      catatan_tahap: activeTRow.catatan_tahap || 'Penetapan Pemaketan PBJ'
    }
  };

  try {
    await cakraApiPost('/api/cakra/paket', payload);
    closeModalTahap2Input();
    await initCakraApp();
    await openPaketInCockpit(paket.id, targetStageToOpen, false);
    if (isSelesaiAction) {
      cakraNotify('🎉 Tahap 2 (BA-PMK) Resmi Selesai! Membuka Tahap 3: RUP.', 'success');
    } else {
      cakraNotify('💾 Draf data Penetapan Pemaketan Tahap 2 berhasil disimpan!', 'success');
    }
  } catch (err) {
    cakraNotify('❌ Gagal menyimpan data Tahap 2: ' + err.message, 'error');
  }
}
window.submitModalTahap2Input = submitModalTahap2Input;

// =========================================================================
// MODUL PENENTUAN METODE PEMILIHAN PENGADAAN (DECISION & ADVISORY ENGINE)
// =========================================================================

function openModulMetodePemilihan() {
  const modal = document.getElementById('modal-modul-metode-pemilihan');
  if (!modal) return;

  const paket = (CakraState.activePaketCtx?.paket?.id === CakraState.activePaketId ? CakraState.activePaketCtx.paket : null)
    || (CakraState.pakets || []).find(p => String(p.id) === String(CakraState.activePaketId)) || {};

  // Prefill dari paket aktif
  const jenisSel = document.getElementById('mmp_jenis_pengadaan');
  const paguInp = document.getElementById('mmp_nilai_pagu');
  const katalogSel = document.getElementById('mmp_katalog');
  const kondisiSel = document.getElementById('mmp_kondisi_pasar');

  if (jenisSel) jenisSel.value = paket.jenis_pengadaan || 'Barang';
  if (paguInp) paguInp.value = Number(paket.nilai_pagu) || 145000000;
  if (katalogSel) {
    katalogSel.value = (paket.metode_pemilihan === 'E-Purchasing' || !paket.metode_pemilihan) ? 'katalog' : 'non_katalog';
  }
  if (kondisiSel) {
    kondisiSel.value = (katalogSel && katalogSel.value === 'katalog') ? 'katalog_tunggal' : 'pasar_umum';
  }

  // Buka tab default simulator
  switchModulMetodeTab('sim');
  runModulMetodeCalculation();

  modal.style.display = 'flex';
}
window.openModulMetodePemilihan = openModulMetodePemilihan;

function closeModulMetodePemilihan() {
  const modal = document.getElementById('modal-modul-metode-pemilihan');
  if (modal) modal.style.display = 'none';
}
window.closeModulMetodePemilihan = closeModulMetodePemilihan;

function switchModulMetodeTab(tabName) {
  const tabs = ['sim', 'mat', 'epur', 'audit'];
  tabs.forEach(t => {
    const btn = document.getElementById(`tab-btn-mmp-${t}`);
    const panel = document.getElementById(`panel-mmp-${t}`);
    if (btn) {
      if (t === tabName) {
        btn.style.background = '#2563eb';
        btn.style.color = '#ffffff';
      } else {
        btn.style.background = 'rgba(255,255,255,0.15)';
        btn.style.color = '#e2e8f0';
      }
    }
    if (panel) {
      panel.style.display = t === tabName ? 'block' : 'none';
    }
  });
}
window.switchModulMetodeTab = switchModulMetodeTab;

let currentModulMetodeResult = null;

function runModulMetodeCalculation() {
  const jenisSel = document.getElementById('mmp_jenis_pengadaan');
  const paguInp = document.getElementById('mmp_nilai_pagu');
  const katalogSel = document.getElementById('mmp_katalog');
  const kondisiSel = document.getElementById('mmp_kondisi_pasar');

  const jenis = jenisSel ? jenisSel.value : 'Barang';
  const pagu = Number(paguInp?.value) || 0;
  const isKatalog = katalogSel ? (katalogSel.value === 'katalog') : true;
  const kondisi = kondisiSel ? kondisiSel.value : 'katalog_tunggal';

  // Format terbilang pada input
  const terbilangEl = document.getElementById('mmp_pagu_terbilang');
  if (terbilangEl) {
    terbilangEl.textContent = `${cakraFmtRp(pagu)} (${terbilangRupiah(pagu)})`;
  }

  // ALGORITMA DECISION TREE (Perpres 16/2018 jo. 46/2025, Kepka LKPP 177/2024 & Perlem 3/2026)
  let caraPengadaan = 'Melalui Penyedia';
  let metodePemilihan = 'E-Purchasing';
  let mekanismeSub = 'Mekanisme Negosiasi Harga Bilateral di Katalog Versi 6';
  let badgeColor = '#1d4ed8';
  let badgeBg = '#eff6ff';
  let badgeBorder = '#3b82f6';
  let pelaksana = 'Pejabat Pengadaan Satker KPU Kabupaten Ngawi';
  let bentukKontrak = 'Surat Pesanan';
  let jenisKontrak = 'Lumsum';
  let jenisKertasHarga = 'HPS';
  let dasarHukum = '';
  let rasional = '';

  if (jenis === 'Swakelola') {
    caraPengadaan = 'Swakelola Tipe I';
    metodePemilihan = 'Swakelola (Non-Penyedia)';
    mekanismeSub = 'Direncanakan, Dilaksanakan, dan Diawasi Sendiri oleh KPU Ngawi (SK KPA)';
    badgeColor = '#047857'; badgeBg = '#f0fdf4'; badgeBorder = '#10b981';
    pelaksana = 'Tim Penyelenggara Swakelola KPU';
    bentukKontrak = 'Kontrak Swakelola / Keputusan KPA';
    jenisKontrak = 'Lumsum';
    jenisKertasHarga = 'RAB Swakelola';
    dasarHukum = 'Pasal 18 & 23 Perpres 16/2018 jo. Perpres 46/2025 jo. Perlem LKPP 3/2021';
    rasional = 'Kegiatan dilaksanakan secara internal satker oleh pegawai KPU atau tim ad-hoc, tidak menggunakan rekanan pihak ketiga komersial.';
  } else if (jenis === 'Dikecualikan') {
    caraPengadaan = 'Melalui Penyedia (Mekanisme Pasar)';
    metodePemilihan = 'Mekanisme Pasar (Dikecualikan)';
    mekanismeSub = 'Pembayaran Tarif Resmi Pemerintah / Operator Publik Tunggal (BUMN/BUMD)';
    badgeColor = '#475569'; badgeBg = '#f8fafc'; badgeBorder = '#94a3b8';
    pelaksana = 'PPK / Pejabat Pengadaan';
    bentukKontrak = pagu <= 50000000 ? 'Bukti Pembelian / Kuitansi' : 'SPK';
    jenisKontrak = 'Harga Satuan / Tarif Resmi';
    jenisKertasHarga = 'Tarif Resmi SK Pemerintah / BUMN';
    dasarHukum = 'Pasal 61 Perpres 16/2018 jo. Perpres 46/2025 jo. Perlem LKPP 5/2021';
    rasional = 'Belanja energi listrik (PLN), air minum (PDAM), pos/materai, atau bahan bakar minyak bersubsidi yang harganya telah diatur regulasi pemerintah.';
  } else if (isKatalog) {
    caraPengadaan = 'Melalui Penyedia';
    metodePemilihan = 'E-Purchasing';
    bentukKontrak = 'Surat Pesanan';
    jenisKontrak = 'Lumsum';

    if (pagu <= 100000000) {
      jenisKertasHarga = 'Referensi Harga (Bebas HPS - Kepka LKPP 177/2024)';
    } else {
      jenisKertasHarga = 'HPS';
    }

    if (pagu <= 200000000) {
      pelaksana = 'Pejabat Pengadaan Satker KPU Kabupaten Ngawi';
    } else {
      pelaksana = 'Pejabat Pembuat Komitmen (PPK) / Pokja Pemilihan';
    }

    if (kondisi === 'katalog_kompetisi') {
      mekanismeSub = 'Mekanisme Mini-Kompetisi Antar-Penyedia di Etalase Katalog Elektronik LKPP Versi 6';
      badgeColor = '#059669'; badgeBg = '#ecfdf5'; badgeBorder = '#10b981';
      dasarHukum = 'Pasal 38 ayat (2) Perpres PBJ jo. Keputusan Kepala LKPP Nomor 177 Tahun 2024 (Lampiran III: Tata Cara E-Purchasing)';
      rasional = `Terdapat minimal 2 penyedia di etalase yang menyediakan komoditas sejenis. Sistem mengundang mereka untuk saling berlomba memberikan diskon penawaran harga terendah secara transparan. Sangat tepat untuk efisiensi anggaran kas negara.`;
    } else {
      mekanismeSub = 'Mekanisme Negosiasi Harga Bilateral di Katalog Elektronik LKPP Versi 6';
      badgeColor = '#1d4ed8'; badgeBg = '#eff6ff'; badgeBorder = '#3b82f6';
      dasarHukum = 'Pasal 38 ayat (1) huruf a & ayat (2) Perpres No. 16/2018 jo. Perpres No. 46/2025 jo. Kepka LKPP No. 177/2024';
      rasional = `Komoditas tercantum di Katalog Elektronik. Dipilih dari 1 penyedia dengan justifikasi fungsional/garansi purna jual, lalu Pejabat Pengadaan/PPK melakukan negosiasi harga dan ongkos kirim langsung di sistem. Wajib menyertakan Berita Acara Analisa Pasar (Tahap 5) dengan membandingkan minimal 3 produk sejenis.`;
    }
  } else {
    // Non-Katalog
    caraPengadaan = 'Melalui Penyedia';

    if (kondisi === 'khusus_darurat' || kondisi === 'khusus_paten') {
      metodePemilihan = 'Penunjukan Langsung';
      mekanismeSub = 'Penunjukan Langsung Kepada 1 Penyedia yang Memenuhi Kualifikasi Khusus';
      badgeColor = '#b45309'; badgeBg = '#fffbeb'; badgeBorder = '#f59e0b';
      pelaksana = pagu <= 200000000 ? 'Pejabat Pengadaan Satker KPU Kabupaten Ngawi' : 'Pokja Pemilihan KPU Ngawi';
      bentukKontrak = pagu <= 200000000 ? 'SPK' : 'Surat Perjanjian';
      jenisKontrak = 'Lumsum';
      jenisKertasHarga = 'HPS';
      dasarHukum = 'Pasal 38 ayat (4) & ayat (5) Perpres 16/2018 jo. Perpres 46/2025';
      rasional = kondisi === 'khusus_darurat'
        ? 'Ditetapkan dalam keadaan darurat/bencana atau tahapan pemilu mendesak yang tidak memungkinkan proses pemilihan kompetitif biasa.'
        : 'Barang/jasa memiliki hak paten, hak cipta tunggal, atau pemegang lisensi eksklusif yang tidak dapat digantikan pihak lain.';
    } else if (jenis === 'Jasa Konsultansi Nonkonstruksi' || jenis === 'Jasa Konsultansi Konstruksi') {
      if (pagu <= 100000000) {
        metodePemilihan = 'Pengadaan Langsung';
        mekanismeSub = 'Pengadaan Langsung Jasa Konsultansi oleh Pejabat Pengadaan';
        badgeColor = '#059669'; badgeBg = '#ecfdf5'; badgeBorder = '#10b981';
        pelaksana = 'Pejabat Pengadaan Satker KPU Kabupaten Ngawi';
        bentukKontrak = 'SPK';
        jenisKontrak = 'Waktu Penugasan / Lumsum';
        jenisKertasHarga = 'HPS (Remunerasi Billing Rate Tenaga Ahli)';
        dasarHukum = 'Pasal 41 ayat (1) Perpres 16/2018 jo. Perpres 46/2025';
        rasional = 'Nilai pagu jasa konsultansi s.d. Rp 100 Juta wajib dilaksanakan melalui Pengadaan Langsung oleh Pejabat Pengadaan.';
      } else {
        metodePemilihan = 'Seleksi';
        mekanismeSub = 'Seleksi Terbuka Jasa Konsultansi oleh Pokja Pemilihan';
        badgeColor = '#0284c7'; badgeBg = '#f0f9ff'; badgeBorder = '#0ea5e9';
        pelaksana = 'Pokja Pemilihan KPU Ngawi';
        bentukKontrak = 'Surat Perjanjian';
        jenisKontrak = 'Waktu Penugasan / Lumsum';
        jenisKertasHarga = 'HPS (Billing Rate & Direct Cost)';
        dasarHukum = 'Pasal 41 ayat (2) Perpres 16/2018 jo. Perpres 46/2025';
        rasional = 'Nilai pagu jasa konsultansi > Rp 100 Juta wajib melalui Seleksi Terbuka menggunakan SPSE.';
      }
    } else if (jenis === 'Pekerjaan Konstruksi') {
      if (pagu <= 400000000) {
        metodePemilihan = 'Pengadaan Langsung';
        mekanismeSub = 'Pengadaan Langsung Konstruksi (Pagu s.d. Rp 400 Jt Sesuai Perpres 46/2025 & Perlem 3/2026)';
        badgeColor = '#059669'; badgeBg = '#ecfdf5'; badgeBorder = '#10b981';
        pelaksana = 'Pejabat Pengadaan Satker KPU Kabupaten Ngawi';
        bentukKontrak = pagu <= 50000000 ? 'SPK / Kuitansi' : 'SPK';
        jenisKontrak = 'Gabungan Lumsum dan Harga Satuan';
        jenisKertasHarga = pagu <= 10000000 ? 'Bebas HPS' : 'HPS';
        dasarHukum = 'Pasal 38 ayat (3) Perpres 46/2025 jo. Lampiran II Peraturan LKPP Nomor 3 Tahun 2026';
        rasional = 'Perubahan besar regulasi Perpres 46/2025 menaikkan ambang batas Pengadaan Langsung Pekerjaan Konstruksi dari semula Rp 200 Juta menjadi s.d. Rp 400.000.000,- yang dialokasikan bagi Usaha Kecil Subkualifikasi K1/K2/K3.';
      } else if (kondisi === 'pasar_sikar_standar') {
        metodePemilihan = 'Tender Cepat';
        mekanismeSub = 'Tender Cepat Pekerjaan Konstruksi melalui SPSE & SIKaP';
        badgeColor = '#7c3aed'; badgeBg = '#f5f3ff'; badgeBorder = '#8b5cf6';
        pelaksana = 'Pokja Pemilihan KPU Ngawi';
        bentukKontrak = 'Surat Perjanjian';
        jenisKontrak = 'Harga Satuan';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 38 ayat (1) huruf d Perpres 16/2018 jo. Perpres 46/2025';
        rasional = 'Pekerjaan konstruksi memiliki spesifikasi standar dan pelaku usaha terdaftar pada SIKaP LKPP, durasi pemilihan 3-5 hari kerja.';
      } else {
        metodePemilihan = 'Tender';
        mekanismeSub = 'Tender Terbuka Pekerjaan Konstruksi oleh Pokja Pemilihan';
        badgeColor = '#dc2626'; badgeBg = '#fef2f2'; badgeBorder = '#ef4444';
        pelaksana = 'Pokja Pemilihan KPU Ngawi';
        bentukKontrak = 'Surat Perjanjian';
        jenisKontrak = 'Harga Satuan';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 38 ayat (1) huruf e Perpres 16/2018 jo. Perpres 46/2025';
        rasional = 'Pekerjaan konstruksi bernilai di atas Rp 400 Juta wajib dilaksanakan melalui Tender terbuka oleh Pokja Pemilihan.';
      }
    } else {
      // Barang atau Jasa Lainnya Non-Katalog
      if (pagu <= 10000000) {
        metodePemilihan = 'Pengadaan Langsung';
        mekanismeSub = 'Pengadaan Langsung Retail Bebas HPS (Bukti Pembelian Toko)';
        badgeColor = '#059669'; badgeBg = '#ecfdf5'; badgeBorder = '#10b981';
        pelaksana = 'Pejabat Pengadaan Satker KPU Kabupaten Ngawi';
        bentukKontrak = 'Bukti Pembelian';
        jenisKontrak = 'Lumsum';
        jenisKertasHarga = 'Bebas HPS (Bukti Pembelian)';
        dasarHukum = 'Pasal 28 & 38 Perpres 46/2025';
        rasional = 'Belanja operasional bernilai s.d. Rp 10 Juta dibebaskan dari penyusunan HPS formal, cukup bukti kuitansi toko atau nota pembelian kas kecil.';
      } else if (pagu <= 50000000) {
        metodePemilihan = 'Pengadaan Langsung';
        mekanismeSub = 'Pengadaan Langsung Tingkat Kuitansi Dinas Bermeterai';
        badgeColor = '#059669'; badgeBg = '#ecfdf5'; badgeBorder = '#10b981';
        pelaksana = 'Pejabat Pengadaan Satker KPU Kabupaten Ngawi';
        bentukKontrak = 'Kuitansi';
        jenisKontrak = 'Lumsum';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 28 & 38 Perpres 46/2025';
        rasional = 'Belanja bernilai Rp 10 Juta s.d. Rp 50 Juta wajib menyusun HPS pasar dan diterbitkan Kuitansi bermeterai resmi.';
      } else if (pagu <= 200000000) {
        metodePemilihan = 'Pengadaan Langsung';
        mekanismeSub = 'Pengadaan Langsung Format Surat Perintah Kerja (SPK)';
        badgeColor = '#059669'; badgeBg = '#ecfdf5'; badgeBorder = '#10b981';
        pelaksana = 'Pejabat Pengadaan Satker KPU Kabupaten Ngawi';
        bentukKontrak = 'SPK';
        jenisKontrak = 'Lumsum';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 28 & 38 Perpres 46/2025 jo. Lampiran I Perlem LKPP 3/2026';
        rasional = 'Belanja barang/jasa lainnya bernilai di atas Rp 50 Juta s.d. Rp 200 Juta wajib diterbitkan SPK dan HPS hasil survei harga pasar.';
      } else if (kondisi === 'pasar_sikar_standar') {
        metodePemilihan = 'Tender Cepat';
        mekanismeSub = 'Tender Cepat Melalui Sistem SIKaP SPSE LKPP';
        badgeColor = '#7c3aed'; badgeBg = '#f5f3ff'; badgeBorder = '#8b5cf6';
        pelaksana = 'Pokja Pemilihan KPU Ngawi';
        bentukKontrak = 'Surat Perjanjian / SPK';
        jenisKontrak = 'Lumsum';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 38 ayat (1) huruf d Perpres 16/2018 jo. Perpres 46/2025';
        rasional = 'Pengadaan di atas Rp 200 Juta dengan spesifikasi standar dan rekanan telah terkualifikasi di SIKaP, proses pemilihan kilat 3 hari.';
      } else {
        metodePemilihan = 'Tender';
        mekanismeSub = 'Tender Terbuka Nasional Melalui Portal SPSE LKPP';
        badgeColor = '#dc2626'; badgeBg = '#fef2f2'; badgeBorder = '#ef4444';
        pelaksana = 'Pokja Pemilihan KPU Ngawi';
        bentukKontrak = 'Surat Perjanjian';
        jenisKontrak = 'Lumsum';
        jenisKertasHarga = 'HPS';
        dasarHukum = 'Pasal 38 ayat (1) huruf e Perpres 16/2018 jo. Perpres 46/2025';
        rasional = 'Pengadaan barang/jasa bernilai > Rp 200 Juta non-katalog yang memerlukan seleksi kualifikasi teknis dan pembuktian kualifikasi oleh Pokja Pemilihan.';
      }
    }
  }

  // Simpan hasil ke memori global
  currentModulMetodeResult = {
    jenisPengadaan: jenis,
    caraPengadaan,
    metodePemilihan,
    mekanismeSub,
    pelaksana,
    bentukKontrak,
    jenisKontrak,
    jenisKertasHarga,
    dasarHukum,
    rasional,
    pagu
  };

  // Render ke DOM
  const badgeEl = document.getElementById('mmp_res_badge');
  const titleEl = document.getElementById('mmp_res_metode_title');
  const subEl = document.getElementById('mmp_res_metode_sub');
  const caraEl = document.getElementById('mmp_res_cara');
  const pelaksanaEl = document.getElementById('mmp_res_pelaksana');
  const kontrakEl = document.getElementById('mmp_res_kontrak');
  const hargaEl = document.getElementById('mmp_res_harga');
  const hukumEl = document.getElementById('mmp_res_hukum');
  const rasionalEl = document.getElementById('mmp_res_rasional');

  if (badgeEl) {
    badgeEl.style.color = badgeColor;
    badgeEl.style.background = badgeBg;
    badgeEl.style.borderColor = badgeBorder;
  }
  if (titleEl) titleEl.textContent = `${metodePemilihan} ${kondisi === 'katalog_kompetisi' ? '(Mini-Kompetisi)' : (isKatalog && metodePemilihan === 'E-Purchasing' ? '(Negosiasi Harga)' : '')}`;
  if (subEl) subEl.textContent = mekanismeSub;
  if (caraEl) caraEl.textContent = caraPengadaan;
  if (pelaksanaEl) pelaksanaEl.textContent = pelaksana;
  if (kontrakEl) kontrakEl.textContent = `${bentukKontrak} (${jenisKontrak})`;
  if (hargaEl) hargaEl.textContent = jenisKertasHarga;
  if (hukumEl) hukumEl.textContent = dasarHukum;
  if (rasionalEl) rasionalEl.textContent = rasional;
}
window.runModulMetodeCalculation = runModulMetodeCalculation;

function applyModulMetodeToTahap2() {
  if (!currentModulMetodeResult) {
    runModulMetodeCalculation();
  }
  const res = currentModulMetodeResult;
  if (!res) return;

  // Isi ke form modal Tahap 2
  const jenisSel = document.getElementById('m2_jenis_pengadaan');
  const caraSel = document.getElementById('m2_cara_pengadaan');
  const metodeSel = document.getElementById('m2_metode_pemilihan');
  const bentukSel = document.getElementById('m2_bentuk_kontrak');
  const jenisKontrakSel = document.getElementById('m2_jenis_kontrak');
  const kertasHargaSel = document.getElementById('m2_jenis_kertas_harga');

  if (jenisSel) jenisSel.value = res.jenisPengadaan;
  if (caraSel) caraSel.value = res.caraPengadaan.startsWith('Swakelola') ? res.caraPengadaan : 'Penyedia';
  if (metodeSel) {
    metodeSel.value = res.metodePemilihan.includes('E-Purchasing') ? 'E-Purchasing' : (res.metodePemilihan.includes('Pengadaan Langsung') ? 'Pengadaan Langsung' : res.metodePemilihan);
  }
  if (bentukSel) {
    bentukSel.value = res.bentukKontrak.includes('Surat Pesanan') ? 'Surat Pesanan' : (res.bentukKontrak.includes('SPK') ? 'SPK' : (res.bentukKontrak.includes('Bukti Pembelian') ? 'Bukti Pembelian' : (res.bentukKontrak.includes('Kuitansi') ? 'Kuitansi' : 'Surat Perjanjian')));
  }
  if (jenisKontrakSel) {
    jenisKontrakSel.value = res.jenisKontrak.includes('Harga Satuan') ? 'Harga Satuan' : 'Lumsum';
  }
  if (kertasHargaSel) {
    kertasHargaSel.value = res.jenisKertasHarga.includes('HPS') ? 'HPS' : res.jenisKertasHarga;
  }

  closeModulMetodePemilihan();
  cakraNotify(`✅ Rekomendasi Modul (${res.metodePemilihan}) berhasil diterapkan ke Formulir Tahap 2!`, 'success');

  // Jika modal Tahap 2 belum terbuka, buka sekarang
  const modalT2 = document.getElementById('modal-tahap2-input');
  if (modalT2 && modalT2.style.display !== 'flex') {
    openModalTahap2Input();
  }
}
window.applyModulMetodeToTahap2 = applyModulMetodeToTahap2;




function onTahap1DriveLinkChange(val) {
  const clean = String(val || '').trim();
  const btnFinish = document.getElementById('btn-finish-tahap1-dock');
  const btnPreview = document.getElementById('btn-preview-drive-dock');
  const statusNote = document.getElementById('status-note-tahap1-dock');

  const hasDrive = clean.length > 5;
  if (btnFinish) {
    if (hasDrive) {
      btnFinish.disabled = false;
      btnFinish.style.background = '#10b981';
      btnFinish.style.color = '#ffffff';
      btnFinish.style.cursor = 'pointer';
      btnFinish.style.opacity = '1';
      btnFinish.style.boxShadow = '0 3px 8px rgba(16,185,129,0.35)';
      btnFinish.innerHTML = '<span>✅ Selesaikan Tahap 1 &amp; Lanjut ke Tahap 2 ➔</span>';
    } else {
      btnFinish.disabled = true;
      btnFinish.style.background = '#e2e8f0';
      btnFinish.style.color = '#94a3b8';
      btnFinish.style.cursor = 'not-allowed';
      btnFinish.style.opacity = '0.75';
      btnFinish.style.boxShadow = 'none';
      btnFinish.innerHTML = '<span>🔒 Selesaikan Tahap 1 (Terkunci)</span>';
    }
  }

  if (btnPreview) {
    btnPreview.style.display = hasDrive ? 'inline-flex' : 'none';
    if (hasDrive) btnPreview.href = clean;
  }

  if (statusNote) {
    statusNote.innerHTML = hasDrive
      ? '<span style="color:#047857; font-weight:700;">✅ Tautan Google Drive Terhubung.</span> Dokumen siap disahkan dan diselesaikan.'
      : '<em>🔒 Tombol Selesai Terkunci: Unduh berkas Word, tanda tangani, dan tempelkan tautan Google Drive di atas.</em>';
  }
}
window.onTahap1DriveLinkChange = onTahap1DriveLinkChange;

async function finishTahap1AndAdvance() {
  const driveInp = document.getElementById('cf_link_drive_dokumen');
  const driveLink = driveInp ? driveInp.value.trim() : '';
  if (!driveLink || driveLink.length < 5) {
    cakraNotify('⚠️ Tautan Google Drive dokumen sah wajib diisi terlebih dahulu!', 'warning');
    if (driveInp) driveInp.focus();
    return;
  }

  if (!CakraState.activePaketCtx || !CakraState.activePaketCtx.paket) return;
  const { paket } = CakraState.activePaketCtx;
  const activeTRow = (CakraState.activePaketCtx.tahaps || []).find(t => Number(t.no_tahap) === 1) || {};

  const payload = {
    ...paket,
    stageUpdate: {
      no_tahap: 1,
      fase: 1,
      nama_tahap: 'Identifikasi Kebutuhan PBJ',
      nomor_dokumen: activeTRow.nomor_dokumen || generateAutoStageDocNumber(1, paket.kode_paket_internal, activeTRow.tanggal_dokumen),
      tanggal_dokumen: activeTRow.tanggal_dokumen || paket.tgl_mulai_kerja || '2026-05-04',
      status_tahap: 'Selesai',
      link_drive_dokumen: driveLink,
      catatan_tahap: 'Identifikasi Kebutuhan PBJ selesai & naskah sah terhubung Google Drive'
    }
  };

  try {
    await cakraApiPost('/api/cakra/paket', payload);
    await initCakraApp();
    cakraNotify('🎉 Tahap 1 (Identifikasi Kebutuhan) Resmi Selesai! Berkas sah tersimpan di Google Drive. Membuka Tahap 2: RUP.', 'success');
    await openPaketInCockpit(paket.id, 2, false);
  } catch (err) {
    cakraNotify('❌ Gagal menyelesaikan tahap: ' + err.message, 'error');
  }
}
window.finishTahap1AndAdvance = finishTahap1AndAdvance;


/**
 * =============================================================================
 * HANDLER POP-UP MODAL TAHAP UNIVERSAL (TAHAP 3 S.D. 18)
 * =============================================================================
 */

function openModalTahapUniversal(stageNo) {
  const num = Number(stageNo || CakraState.activeStageNo || 1);
  if (num === 1) {
    const pId = CakraState.activePaketId;
    return openModalTahap1Input(pId);
  }
  if (num === 2) {
    return openModalTahap2Input();
  }

  const modal = document.getElementById('modal-tahap-universal');
  if (!modal) return;

  CakraState.activeUniversalStageNo = num;
  const paket = (CakraState.activePaketCtx?.paket?.id === CakraState.activePaketId ? CakraState.activePaketCtx.paket : null)
    || (CakraState.pakets || []).find(p => String(p.id) === String(CakraState.activePaketId)) || {};
  const tahaps = CakraState.activePaketCtx?.tahaps || [];
  const activeTRow = tahaps.find(t => Number(t.no_tahap) === num) || {};
  const activeDef = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === num) || { no: num, nama: 'Tahap ' + num };

  const titleEl = document.getElementById('mu_modal_title');
  const subtitleEl = document.getElementById('mu_modal_subtitle');
  if (titleEl) titleEl.innerHTML = '<span>📋 Formulir Pengisian Data Tahap ' + num + ': ' + cakraEsc(activeDef.nama) + '</span>';
  if (subtitleEl) subtitleEl.textContent = 'Pembaruan data substantif tahap dan tautan Google Drive dokumen sah hasil pengesahan';

  const noDokInp = document.getElementById('mu_nomor_dokumen');
  const tglDokInp = document.getElementById('mu_tanggal_dokumen');
  const badgeEl = document.getElementById('mu_status_tahap_badge');
  const linkDriveInp = document.getElementById('mu_link_drive_dokumen');
  const catatanInp = document.getElementById('mu_catatan_tahap');

  const defaultDocNo = generateAutoStageDocNumber(num, paket.kode_paket_internal, activeTRow.tanggal_dokumen || '2026-05-18');
  if (noDokInp) noDokInp.value = activeTRow.nomor_dokumen || defaultDocNo;
  if (tglDokInp) tglDokInp.value = activeTRow.tanggal_dokumen || '2026-05-18';
  if (linkDriveInp) linkDriveInp.value = activeTRow.link_drive_dokumen || '';
  if (catatanInp) catatanInp.value = activeTRow.catatan_tahap || '';

  // Render badge status tahap informatif
  if (badgeEl) {
    const isDone = activeTRow.status_tahap === 'Selesai';
    const isBypass = activeTRow.status_tahap === 'Bypass';
    if (isDone) {
      badgeEl.className = 'cakra-badge cakra-badge-green';
      badgeEl.innerHTML = '✅ Selesai (Terkunci &amp; Sah)';
    } else if (isBypass) {
      badgeEl.className = 'cakra-badge cakra-badge-secondary';
      badgeEl.innerHTML = '⏭️ Bypass / Dilewati';
    } else {
      badgeEl.className = 'cakra-badge cakra-badge-amber';
      badgeEl.innerHTML = '📝 Draf / Belum Selesai';
    }
  }

  // Inject dynamic stage fields
  const container = document.getElementById('mu_stage_fields_container');
  if (container) {
    container.innerHTML = generateUniversalModalFields(num, paket, activeTRow);
  }

  modal.style.display = 'flex';
  const catatanLabel = document.getElementById('mu_catatan_label');
  if (catatanLabel) {
    if (num === 6) {
      catatanLabel.textContent = 'Catatan Khusus PPK atas Penetapan HPS / Referensi Harga';
    } else if (num === 5) {
      catatanLabel.textContent = 'Catatan Hasil Survei Harga Pasar & Evaluasi PPK';
    } else {
      catatanLabel.textContent = 'Catatan PPK / Pejabat Pengadaan';
    }
  }

  if (num === 4) {
    setTimeout(() => { if (typeof calcTahap4Totals === 'function') calcTahap4Totals(); }, 50);
  } else if (num === 5) {
    setTimeout(() => {
      const items = CakraState.activePaketCtx?.items || [];
      items.forEach(it => {
        const cards = document.querySelectorAll('#t5_item_' + it.id + '_alternatifs .t5-alt-card');
        cards.forEach(card => {
          const v = card.dataset.altIdx || 1;
          if (typeof updateVendorParamBadge === 'function') updateVendorParamBadge(it.id, v);
        });
      });
    }, 50);
  } else if (num === 6) {
    setTimeout(() => {
      if (typeof recalcTahap6Hps === 'function') recalcTahap6Hps();
    }, 50);
  }
}
window.openModalTahapUniversal = openModalTahapUniversal;

function closeModalTahapUniversal() {
  const modal = document.getElementById('modal-tahap-universal');
  if (modal) modal.style.display = 'none';
}
window.closeModalTahapUniversal = closeModalTahapUniversal;

function generateUniversalModalFields(num, paket, activeTRow) {
  switch (num) {
    case 3:
      const autoStatus3 = determineStatusPaketByStage(3);
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Parameter SiRUP LKPP &amp; RUP Satker</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Kode RUP SiRUP LKPP *</label>
            <input type="text" id="mu_kode_rup" class="cakra-form-control cakra-mono" value="${cakraEsc(paket.kode_rup || 'RUP-2026-657811-01')}" placeholder="cth: RUP-5091823" style="font-weight:700;" />
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Status Paket dalam Alur Pengadaan</label>
            <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:8px 12px; font-size:12.5px; font-weight:700; color:#1e3a8a; display:flex; align-items:center; justify-content:space-between; min-height:38px; box-sizing:border-box;">
              <span>📌 ${autoStatus3}</span>
              <span style="font-size:10.5px; color:#64748b; font-weight:600;">(Fase I &bull; Otomatis oleh Sistem)</span>
            </div>
          </div>
        </div>
      `;

    case 4:
      const itemsTahap4 = CakraState.activePaketCtx?.items || [];
      const totalPaguItemT4 = itemsTahap4.reduce((acc, it) => acc + (Number(it.volume || 1) * Number(it.harga_satuan_hps || 0)), 0);
      const paguPaketT4 = Number(paket.nilai_pagu || 145000000);
      const selisihT4 = paguPaketT4 - totalPaguItemT4;

      return `
        <!-- BLOK 1: PENGATURAN UMUM KAK -->
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-bottom:14px;">
          <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span>🎯 BLOK 1: PENGATURAN UMUM KAK &amp; KEBIJAKAN PDN/TKDN (PASAL 25 PERPRES PBJ)</span>
            <span class="cakra-badge cakra-badge-green" style="font-size:10px;">Audit-Ready KPU</span>
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:11px; font-weight:700; color:#334155; margin-bottom:3px; display:block;">Uraian Latar Belakang &amp; Kerangka Acuan Kerja (KAK) Umum</label>
            <textarea id="mu_uraian_pekerjaan" class="cakra-form-control" rows="2" placeholder="Uraikan latar belakang pengadaan, tujuan, ruang lingkup umum...">${cakraEsc(paket.uraian_pekerjaan || '')}</textarea>
          </div>
          <div style="display:grid; grid-template-columns:1.5fr 1fr; gap:12px;">
            <div>
              <label style="font-size:11px; font-weight:700; color:#334155; margin-bottom:3px; display:block;">Hierarki Prioritas Produk Dalam Negeri (PDN) &amp; TKDN</label>
              <select id="mu_prioritas_pdn_level" class="cakra-form-control" style="font-size:11.5px;">
                ${[
                  'Level 1: TKDN >= 25% (TKDN+BMP >= 40%)',
                  'Level 2: PDN TKDN >= 25%',
                  'Level 3: PDN TKDN < 25%',
                  'Level 4: PDN Terdaftar SIINas',
                  'Level 5: PDN Pernyataan Mandiri (Self-Declare)',
                  'Level 6: Produk Impor (Izin Menteri/KL)'
                ].map(lv => `<option value="${lv}" ${paket.prioritas_pdn_level === lv ? 'selected' : ''}>${lv}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:11px; font-weight:700; color:#334155; margin-bottom:3px; display:block;">Target Masa Pelaksanaan (Hari Kalender)</label>
              <div style="display:flex; align-items:center;">
                <input type="number" id="mu_masa_pelaksanaan_hari" class="cakra-form-control cakra-mono" value="${Number(paket.masa_pelaksanaan_hari || 14)}" style="width:100px; font-weight:700;" />
                <span style="font-size:11px; color:#64748b; margin-left:8px;">Hari kalender sejak SPMK / SP</span>
              </div>
            </div>
          </div>
        </div>

        <!-- BLOK 2: TABEL / KARTU RINCIAN ITEM BARANG & SPESIFIKASI TEKNIS KAK -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:14px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
            <div>
              <span style="font-size:12.5px; font-weight:800; color:#1e3a8a;">📦 BLOK 2: DAFTAR RINCIAN ITEM BARANG &amp; SPESIFIKASI TEKNIS KAK</span>
              <div style="font-size:10.5px; color:#64748b; margin-top:2px;">Rincian barang kebutuhan satker yang akan menjadi acuan pengujian pasar di Tahap 5 dan HPS di Tahap 6.</div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="tambahItemTahap4()" style="font-size:11px; font-weight:700; padding:4px 10px; cursor:pointer;">
              ➕ Tambah Item Barang
            </button>
          </div>

          <div id="t4_items_container" style="display:flex; flex-direction:column; gap:10px;">
            ${itemsTahap4.length ? itemsTahap4.map((it, idx) => `
              <div class="t4-item-card" data-item-id="${it.id || ('NEW_' + idx)}" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:10px;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
                  <strong style="font-size:12px; color:#0f172a;" class="t4-item-label">Item ${idx + 1}</strong>
                  <button type="button" class="btn btn-xs btn-outline-danger" onclick="hapusItemTahap4(this)" style="font-size:10px; padding:2px 6px; border-radius:4px; border:1px solid #fca5a5; background:#fff; color:#dc2626; cursor:pointer;">🗑️ Hapus</button>
                </div>
                <div style="display:grid; grid-template-columns: 2fr 0.8fr 0.8fr 1.4fr 1.2fr; gap:8px; margin-bottom:8px;">
                  <div>
                    <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Nama / Uraian Kebutuhan Barang *</label>
                    <input type="text" class="cakra-form-control t4-item-uraian" value="${cakraEsc(it.uraian_item || '')}" placeholder="cth: PC Server Tower Database Operasional" style="font-size:11px; font-weight:700;" />
                  </div>
                  <div>
                    <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Volume *</label>
                    <input type="number" step="1" min="1" class="cakra-form-control cakra-mono t4-item-vol" value="${Number(it.volume || 1)}" style="font-size:11px; font-weight:700;" oninput="calcTahap4Totals()" />
                  </div>
                  <div>
                    <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Satuan *</label>
                    <input type="text" class="cakra-form-control t4-item-satuan" value="${cakraEsc(it.satuan || 'Unit')}" placeholder="Unit/Set" style="font-size:11px;" />
                  </div>
                  <div>
                    <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Pagu Satuan (Rp) *</label>
                    <input type="number" class="cakra-form-control cakra-mono t4-item-pagu" value="${Number(it.harga_satuan_hps || 0)}" style="font-size:11px; font-weight:700;" oninput="calcTahap4Totals()" />
                  </div>
                  <div>
                    <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Subtotal Pagu (Rp)</label>
                    <div class="t4-item-subtotal cakra-mono" style="font-size:11px; font-weight:800; color:#1e40af; padding:5px 8px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; height:28px; line-height:16px;">
                      Rp ${Math.round(Number(it.volume || 1) * Number(it.harga_satuan_hps || 0)).toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
                <div style="margin-bottom:8px;">
                  <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Spesifikasi Teknis Detail KAK (Processor, RAM, Storage, Port, PSU, OS, Garansi yang Dipersyaratkan) *</label>
                  <textarea class="cakra-form-control t4-item-spek" rows="2" style="font-size:11px; line-height:1.45;" placeholder="Cantumkan spesifikasi fungsional terperinci...">${cakraEsc(it.spesifikasi_teknis || '')}</textarea>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1.2fr; gap:10px;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <label style="font-size:10px; font-weight:700; color:#475569; white-space:nowrap;">Target TKDN:</label>
                    <input type="number" class="cakra-form-control cakra-mono t4-item-tkdn" value="${Number(it.persen_tkdn || 40)}" style="font-size:11px; width:65px;" />
                    <span style="font-size:10.5px; font-weight:700; color:#475569;">%</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <label style="font-size:10px; font-weight:700; color:#475569; white-space:nowrap;">SAKTI:</label>
                    <select class="cakra-form-control t4-item-sakti" style="font-size:11px;">
                      <option value="Aset Tetap (BMN)" ${(it.jenis_pencatatan_sakti || 'Aset Tetap (BMN)') === 'Aset Tetap (BMN)' ? 'selected' : ''}>Aset Tetap (BMN)</option>
                      <option value="Persediaan" ${it.jenis_pencatatan_sakti === 'Persediaan' ? 'selected' : ''}>Persediaan</option>
                      <option value="Jasa/Habis Pakai" ${it.jenis_pencatatan_sakti === 'Jasa/Habis Pakai' ? 'selected' : ''}>Jasa/Habis Pakai</option>
                    </select>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <label style="font-size:10px; font-weight:700; color:#1e40af; white-space:nowrap;">Alokasi Subbag:</label>
                    <select class="cakra-form-control t4-item-subbag" style="font-size:11px; font-weight:700;">
                      <option value="KUL" ${(it.pic_subbag_pengguna || 'KUL') === 'KUL' ? 'selected' : ''}>KUL</option>
                      <option value="RENDATIN" ${it.pic_subbag_pengguna === 'RENDATIN' ? 'selected' : ''}>RENDATIN</option>
                      <option value="TEKNIS" ${it.pic_subbag_pengguna === 'TEKNIS' ? 'selected' : ''}>TEKNIS</option>
                      <option value="HUKUM" ${it.pic_subbag_pengguna === 'HUKUM' ? 'selected' : ''}>HUKUM</option>
                      <option value="PARSDM" ${it.pic_subbag_pengguna === 'PARSDM' ? 'selected' : ''}>PARSDM</option>
                    </select>
                  </div>
                </div>
              </div>
            `).join('') : `
              <div class="t4-item-card" data-item-id="NEW_0" style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:10px;">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
                  <strong style="font-size:12px; color:#0f172a;" class="t4-item-label">Item 1</strong>
                  <button type="button" class="btn btn-xs btn-outline-danger" onclick="hapusItemTahap4(this)" style="font-size:10px; padding:2px 6px; border-radius:4px; border:1px solid #fca5a5; background:#fff; color:#dc2626; cursor:pointer;">🗑️ Hapus</button>
                </div>
                <div style="display:grid; grid-template-columns: 2fr 0.8fr 0.8fr 1.4fr 1.2fr; gap:8px; margin-bottom:8px;">
                  <div>
                    <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Nama / Uraian Kebutuhan Barang *</label>
                    <input type="text" class="cakra-form-control t4-item-uraian" value="${cakraEsc(paket.nama_paket || '')}" placeholder="cth: PC Server Tower" style="font-size:11px; font-weight:700;" />
                  </div>
                  <div>
                    <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Volume *</label>
                    <input type="number" step="1" min="1" class="cakra-form-control cakra-mono t4-item-vol" value="1" style="font-size:11px; font-weight:700;" oninput="calcTahap4Totals()" />
                  </div>
                  <div>
                    <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Satuan *</label>
                    <input type="text" class="cakra-form-control t4-item-satuan" value="Unit" placeholder="Unit/Set" style="font-size:11px;" />
                  </div>
                  <div>
                    <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Pagu Satuan (Rp) *</label>
                    <input type="number" class="cakra-form-control cakra-mono t4-item-pagu" value="${paguPaketT4}" style="font-size:11px; font-weight:700;" oninput="calcTahap4Totals()" />
                  </div>
                  <div>
                    <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Subtotal Pagu (Rp)</label>
                    <div class="t4-item-subtotal cakra-mono" style="font-size:11px; font-weight:800; color:#1e40af; padding:5px 8px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; height:28px; line-height:16px;">
                      Rp ${paguPaketT4.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>
                <div style="margin-bottom:8px;">
                  <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Spesifikasi Teknis Detail KAK *</label>
                  <textarea class="cakra-form-control t4-item-spek" rows="2" style="font-size:11px;" placeholder="Cantumkan spesifikasi fungsional terperinci..."></textarea>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr 1.2fr; gap:10px;">
                  <div style="display:flex; align-items:center; gap:6px;">
                    <label style="font-size:10px; font-weight:700; color:#475569;">Target TKDN:</label>
                    <input type="number" class="cakra-form-control cakra-mono t4-item-tkdn" value="40" style="font-size:11px; width:65px;" />
                    <span style="font-size:10.5px; font-weight:700; color:#475569;">%</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <label style="font-size:10px; font-weight:700; color:#475569;">SAKTI:</label>
                    <select class="cakra-form-control t4-item-sakti" style="font-size:11px;">
                      <option value="Aset Tetap (BMN)" selected>Aset Tetap (BMN)</option>
                      <option value="Persediaan">Persediaan</option>
                      <option value="Jasa/Habis Pakai">Jasa/Habis Pakai</option>
                    </select>
                  </div>
                  <div style="display:flex; align-items:center; gap:6px;">
                    <label style="font-size:10px; font-weight:700; color:#1e40af;">Alokasi Subbag:</label>
                    <select class="cakra-form-control t4-item-subbag" style="font-size:11px; font-weight:700;">
                      <option value="KUL" selected>KUL</option>
                      <option value="RENDATIN">RENDATIN</option>
                      <option value="TEKNIS">TEKNIS</option>
                      <option value="HUKUM">HUKUM</option>
                      <option value="PARSDM">PARSDM</option>
                    </select>
                  </div>
                </div>
              </div>
            `}
          </div>

          <!-- REKAPITULASI & VALIDASI TOTAL PAGU ITEM VS PAGU PAKET DIPA -->
          <div style="margin-top:12px; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:10px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div>
              <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Total Akumulasi Pagu Item KAK:</div>
              <div id="t4_total_pagu_display" class="cakra-mono" style="font-size:14px; font-weight:800; color:#1e3a8a;">
                Rp ${totalPaguItemT4.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Pagu DIPA Paket:</div>
              <div class="cakra-mono" style="font-size:14px; font-weight:800; color:#0f172a;">
                Rp ${paguPaketT4.toLocaleString('id-ID')}
              </div>
            </div>
            <div id="t4_pagu_status_badge">
              ${selisihT4 === 0
                ? '<span class="cakra-badge cakra-badge-green" style="font-size:11px;">✅ Pagu Item Sesuai Pagu Paket (100%)</span>'
                : (selisihT4 > 0
                  ? `<span class="cakra-badge cakra-badge-amber" style="font-size:11px;">⚠️ Sisa Pagu Belum Dialokasikan: Rp ${selisihT4.toLocaleString('id-ID')}</span>`
                  : `<span class="cakra-badge cakra-badge-red" style="font-size:11px;">❌ Pagu Item Melebihi Pagu Paket: Rp ${Math.abs(selisihT4).toLocaleString('id-ID')}</span>`)}
            </div>
          </div>
        </div>
      `;

    case 5:
      const itemsTahap5 = CakraState.activePaketCtx?.items || [];
      return `
        <!-- BLOK 1: STRATEGI PEMENUHAN PASAR & TRANSAKSI E-PURCHASING -->
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px; margin-bottom:14px;">
          <div style="font-size:12.5px; font-weight:800; color:#166534; display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <span>🛡️ BLOK 1: STRATEGI PEMENUHAN PASAR &amp; KETENTUAN MULTI-ORDER (PERPRES 46/2025)</span>
            <span class="cakra-badge cakra-badge-green" style="font-size:10px;">Audit-Ready LKPP v6</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:8px;">
            <div>
              <label style="font-size:11px; font-weight:700; color:#334155; display:block; margin-bottom:3px;">Skenario Transaksi Pemenuhan Pasar</label>
              <select id="mu_skenario_pemenuhan" class="cakra-form-control" style="font-size:11.5px;">
                <option value="Skenario A: Penyedia Tunggal / Agregator Multibrand" selected>Skenario A: Penyedia Tunggal (Agregator Multibrand - 1 SP)</option>
                <option value="Skenario B: Multi-Vendor / Multi-Order (SP Terpisah per Item)">Skenario B: Multi-Vendor / Multi-Order (SP-01 &amp; SP-02 Terpisah)</option>
              </select>
            </div>
            <div>
              <label style="font-size:11px; font-weight:700; color:#334155; display:block; margin-bottom:3px;">Sub-Metode E-Purchasing Katalog v6</label>
              <select id="mu_sub_metode_epurchasing" class="cakra-form-control" style="font-size:11.5px;">
                <option value="Negosiasi Harga" ${(paket.sub_metode_epurchasing || 'Negosiasi Harga') === 'Negosiasi Harga' ? 'selected' : ''}>Negosiasi Harga (Katalog v6)</option>
                <option value="Mini-Kompetisi" ${paket.sub_metode_epurchasing === 'Mini-Kompetisi' ? 'selected' : ''}>Mini-Kompetisi (Katalog v6)</option>
                <option value="Beli Langsung" ${paket.sub_metode_epurchasing === 'Beli Langsung' ? 'selected' : ''}>Beli Langsung (Harga Tayang)</option>
              </select>
            </div>
          </div>
          <div style="font-size:11px; color:#15803d; line-height:1.45; background:#ffffff; border:1px solid #dcfce7; border-radius:6px; padding:8px 10px;">
            💡 <strong>Ketentuan Multi-Order:</strong> Jika di e-katalog penyedia hanya memiliki 1 jenis barang (Server spesialis Tier-1 &amp; Workstation TKDN dari vendor lain), Pejabat Pengadaan <strong>SAH SECARA HUKUM</strong> menerbitkan Surat Pesanan terpisah (SP-01 Server &amp; SP-02 Workstation) pada paket RUP yang sama. Hal ini <strong>BUKAN PEMENCAHAN PAKET</strong> (Pasal 20 Perpres PBJ) karena metode tetap E-Purchasing transparan.
          </div>
        </div>

        <!-- BLOK 2: MATRIKS KOMPARASI & PENGUJIAN 5 PARAMETER PER BARANG & PER ALTERNATIF (VERTIKAL & COLLAPSIBLE) -->
        <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:14px;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
            <div>
              <span style="font-size:12.5px; font-weight:800; color:#1e3a8a;">📊 BLOK 2: MATRIKS PENGUJIAN 5 PARAMETER PASAR PER BARANG &amp; PER ALTERNATIF</span>
              <div style="font-size:10.5px; color:#64748b; margin-top:2px;">Evaluasi kelayakan objektif per alternatif penyedia (Pasal 8 Perlem LKPP 2/2026). Bersikap netral tanpa mengunci rekomendasi sepihak.</div>
            </div>
            <button type="button" class="btn btn-sm" onclick="toggleChecklistAllTahap5(true)" style="background:#16a34a; color:#ffffff; font-size:11px; font-weight:700; padding:6px 14px; border:none; border-radius:6px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.12);">
              ⚡ Centang Semua Lolos (Seluruh Barang &amp; Alternatif)
            </button>
          </div>

          <!-- BANNER RESUME ANALISA PASAR DI DALAM FORM POPUP -->
          <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:10px 14px; margin-bottom:14px; display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
              <span style="font-size:11.5px; font-weight:800; color:#1e40af;">
                📌 RESUME SURVEI: Disurvei dari Beragam Kanal Sumber (E-Katalog v6, Toko Daring Olshop, Penyedia Offline, Riwayat Kontrak)
              </span>
              <span class="cakra-badge cakra-badge-green" style="font-size:10px; font-weight:800;">
                ✓ Seluruh Alternatif Lolos Uji 5 Parameter
              </span>
            </div>
            <div style="font-size:10.5px; color:#475569; line-height:1.4;">
              Setiap item barang disurvei dengan membandingkan alternatif penyedia/produk tayang, kesesuaian spesifikasi KAK, kepastian stok, harga satuan, SLA waktu kirim, dan garansi resmi pabrikan.
            </div>
          </div>

          ${itemsTahap5.length ? itemsTahap5.map((it, idx) => {
            let altList = [];
            if (it.evaluasi_pasar_json && typeof it.evaluasi_pasar_json === 'object' && Array.isArray(it.evaluasi_pasar_json.alternatifs) && it.evaluasi_pasar_json.alternatifs.length) {
              altList = it.evaluasi_pasar_json.alternatifs;
            } else {
              altList = [
                {
                  alt_no: 1,
                  jenis_sumber: 'Katalog Elektronik (E-Katalog v6)',
                  sumber: it.sumber_survei_1 || 'PT. Astra Graphia Information Technology',
                  produk: it.merk_tipe_katalog || (idx === 0 ? 'Dell PowerEdge T350 Tower Server' : 'PC Workstation SIDALIH Core i7'),
                  harga: Number(it.harga_survei_1 || (idx === 0 ? 63850000 : 25500000)),
                  url: it.link_survei_1 || (idx === 0 ? 'https://e-katalog.lkpp.go.id/katalog/produk/detail/dell-poweredge-t350' : 'https://e-katalog.lkpp.go.id/katalog/produk/detail/workstation-sidalih-i7'),
                  tkdn: Number(it.persen_tkdn || 42.5),
                  sla_hari: 14,
                  garansi: '3 Tahun Onsite Resmi',
                  p1: 1, p2: 1, p3: 1, p4: 1, p5: 1
                },
                {
                  alt_no: 2,
                  jenis_sumber: 'Toko Daring / Marketplace (Olshop)',
                  sumber: it.sumber_survei_2 || 'PT. Bhinneka Mentari Dimensi (Bhinneka.com)',
                  produk: idx === 0 ? 'Lenovo ThinkSystem ST250 V2' : 'PC Workstation Asus ExpertCenter',
                  harga: Number(it.harga_survei_2 || (idx === 0 ? 64500000 : 25800000)),
                  url: it.link_survei_2 || (idx === 0 ? 'https://www.bhinneka.com/lenovo-thinksystem-st250-v2-server' : 'https://business.blibli.com/p/asus-expertcenter-d700-workstation'),
                  tkdn: Number(it.persen_tkdn || 40),
                  sla_hari: 10,
                  garansi: '3 Tahun Onsite Resmi',
                  p1: 1, p2: 1, p3: 1, p4: 1, p5: 1
                },
                {
                  alt_no: 3,
                  jenis_sumber: idx === 0 ? 'Penyedia / Toko Konvensional (Offline)' : 'Riwayat Kontrak / Pengadaan Sebelumnya',
                  sumber: it.sumber_survei_3 || (idx === 0 ? 'CV. Mitra Mandiri Computer Ngawi' : 'Kontrak Pengadaan PC KPU Kab. Ngawi TA 2025'),
                  produk: idx === 0 ? 'HPE ProLiant ML30 Gen11' : 'PC Workstation HP Pro Tower 280',
                  harga: Number(it.harga_survei_3 || (idx === 0 ? 64900000 : 26000000)),
                  url: it.link_survei_3 || (idx === 0 ? 'Surat Penawaran No. 042/MMC-NGW/V/2026 tgl 12 Mei 2026' : 'Kontrak No. 018/SP/KPU-NGW/IX/2025 tgl 15 September 2025'),
                  tkdn: Number(it.persen_tkdn || 38),
                  sla_hari: 14,
                  garansi: '3 Tahun Onsite Resmi',
                  p1: 1, p2: 1, p3: 1, p4: 1, p5: 1
                }
              ];
            }

            return `
              <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-bottom:14px;">
                <div style="font-size:12.5px; font-weight:800; color:#0f172a; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; border-bottom:2px solid #e2e8f0; padding-bottom:8px;">
                  <div>
                    <span style="color:#1e3a8a;">Item ${idx + 1}: ${cakraEsc(it.uraian_item || 'Item PBJ')}</span>
                    <span style="font-size:11.5px; color:#475569; font-weight:600; margin-left:6px;">(${it.volume} ${it.satuan})</span>
                  </div>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <span style="font-size:11.5px; font-weight:700; color:#0284c7;">Pagu Item: Rp ${Number(it.harga_satuan_hps || 0).toLocaleString('id-ID')} / unit</span>
                    <button type="button" class="btn btn-xs btn-outline-primary" onclick="tambahAlternatifTahap5(${it.id})" style="font-size:10px; font-weight:700; padding:3px 8px; border-radius:4px; cursor:pointer;">
                      ➕ Tambah Alternatif
                    </button>
                  </div>
                </div>

                <!-- DAFTAR ALTERNATIF VERTIKAL & COLLAPSIBLE -->
                <div id="t5_item_${it.id}_alternatifs" style="display:flex; flex-direction:column; gap:8px;">
                  ${altList.map((alt, aIdx) => {
                    const v = alt.alt_no || (aIdx + 1);
                    const prodName = alt.produk || '';
                    const vendorName = alt.sumber || ('Penyedia ' + v);
                    const hrgVal = Number(alt.harga || 0);
                    const slaDays = Number(alt.sla_hari || 14);
                    const garansiVal = alt.garansi || '3 Tahun Onsite Resmi';
                    const score = Number(alt.skor !== undefined ? alt.skor : (Number(alt.p1||0)+Number(alt.p2||0)+Number(alt.p3||0)+Number(alt.p4||0)+Number(alt.p5||0)));

                    return `
                      <div class="t5-alt-card" id="t5_alt_card_${it.id}_v${v}" data-item-id="${it.id}" data-alt-idx="${v}" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; overflow:hidden;">
                        <!-- HEADER ACCORDION -->
                        <div onclick="toggleAltCardCollapse(${it.id}, ${v})" style="background:#f1f5f9; padding:8px 12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none; border-bottom:1px solid #e2e8f0;">
                          <div style="display:flex; align-items:center; gap:8px;">
                            <span id="alt_icon_${it.id}_v${v}" style="font-size:11px; color:#475569;">▼</span>
                            <strong id="alt_header_title_${it.id}_v${v}" style="font-size:12px; color:#0f172a;">
                              Alternatif ${v} ${alt.jenis_sumber ? ('[' + alt.jenis_sumber.replace(/\s*\(.*\)/, '') + '] ') : ''}: ${cakraEsc(vendorName)} — ${cakraEsc(prodName)} (Rp ${hrgVal.toLocaleString('id-ID')})
                            </strong>
                          </div>
                          <div style="display:flex; align-items:center; gap:8px;" onclick="event.stopPropagation()">
                            <span id="badge_item_${it.id}_v${v}" class="cakra-badge ${score === 5 ? 'cakra-badge-green' : (score >= 3 ? 'cakra-badge-amber' : 'cakra-badge-red')}" style="font-size:10px; padding:2px 8px;">
                              ${score === 5 ? '✓ 5/5 Lolos Uji' : (score >= 3 ? '⚠️ ' + score + '/5 (Catatan)' : '✗ ' + score + '/5 (Gugur)')}
                            </span>
                            <button type="button" class="btn btn-xs" onclick="toggleVendor5Params(${it.id}, ${v}, true)" style="font-size:9.5px; padding:2px 6px; border:1px solid #bbf7d0; background:#f0fdf4; color:#166534; font-weight:700; border-radius:4px; cursor:pointer;" title="Centang 5/5 Lolos">⚡ Centang Semua</button>
                            <button type="button" class="btn btn-xs btn-outline-danger" onclick="hapusAlternatifTahap5(${it.id}, ${v})" style="font-size:10px; padding:2px 6px; border-radius:4px; border:1px solid #fca5a5; background:#fff; color:#dc2626; cursor:pointer;" title="Hapus Alternatif Ini">🗑️</button>
                          </div>
                        </div>

                        <!-- BODY ACCORDION (COLLAPSIBLE) -->
                        <div id="alt_body_${it.id}_v${v}" style="display:block; padding:10px 12px;">
                          <div style="display:grid; grid-template-columns: 1.2fr 1.3fr 1.3fr 1fr; gap:8px; margin-bottom:8px;">
                            <div>
                              <label style="font-size:10px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Jenis Sumber Survei Pasar *</label>
                              <select id="mu_item_${it.id}_v${v}_jenis_sumber" class="cakra-form-control alt-sel-jenis-sumber" style="font-size:10.5px; font-weight:700;" onchange="updateAltCardHeader(${it.id}, ${v})">
                                <option value="Katalog Elektronik (E-Katalog v6)" ${(alt.jenis_sumber || '').includes('Katalog') ? 'selected' : ''}>Katalog Elektronik (E-Katalog v6)</option>
                                <option value="Toko Daring / Marketplace (Olshop)" ${(alt.jenis_sumber || '').includes('Daring') || (alt.jenis_sumber || '').includes('Olshop') ? 'selected' : ''}>Toko Daring / Marketplace (Olshop)</option>
                                <option value="Penyedia / Toko Konvensional (Offline)" ${(alt.jenis_sumber || '').includes('Offline') || (alt.jenis_sumber || '').includes('Konvensional') ? 'selected' : ''}>Penyedia / Toko Konvensional (Offline)</option>
                                <option value="Riwayat Kontrak / Pengadaan Sebelumnya" ${(alt.jenis_sumber || '').includes('Riwayat') ? 'selected' : ''}>Riwayat Kontrak / Pengadaan Sebelumnya</option>
                                <option value="Daftar Harga Resmi Pabrikan / SBM" ${(alt.jenis_sumber || '').includes('Pabrikan') || (alt.jenis_sumber || '').includes('SBM') ? 'selected' : ''}>Daftar Harga Resmi Pabrikan / SBM</option>
                              </select>
                            </div>
                            <div>
                              <label style="font-size:10px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Merek / Tipe / Nama Produk *</label>
                              <input type="text" id="mu_item_${it.id}_v${v}_produk" class="cakra-form-control alt-inp-produk" value="${cakraEsc(prodName)}" placeholder="cth: Dell PowerEdge T350 / Lenovo ST250" style="font-size:11px; font-weight:700;" oninput="updateAltCardHeader(${it.id}, ${v})" />
                            </div>
                            <div>
                              <label style="font-size:10px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Nama Pelaku Usaha / Penyedia / Toko *</label>
                              <input type="text" id="mu_item_${it.id}_v${v}_sumber" class="cakra-form-control alt-inp-sumber" value="${cakraEsc(vendorName)}" placeholder="cth: PT. Astra Graphia / Bhinneka / CV. Toko Ngawi" style="font-size:11px;" oninput="updateAltCardHeader(${it.id}, ${v})" />
                            </div>
                            <div>
                              <label style="font-size:10px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Harga Satuan Survei (Rp) *</label>
                              <input type="number" id="mu_item_${it.id}_v${v}_harga" class="cakra-form-control cakra-mono alt-inp-harga" value="${hrgVal}" style="font-size:11px; font-weight:700;" oninput="updateAltCardHeader(${it.id}, ${v})" />
                            </div>
                          </div>

                          <div style="display:grid; grid-template-columns: 2.2fr 0.8fr; gap:10px; margin-bottom:8px;">
                            <div>
                              <label style="font-size:10px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Tautan Web / Bukti Dokumen Survei Fisik *</label>
                              <input type="text" id="mu_item_${it.id}_v${v}_url" class="cakra-form-control cakra-mono alt-inp-url" value="${cakraEsc(alt.url || '')}" placeholder="https://... atau No. Surat Penawaran / Toko Fisik / No. Kontrak Lalu" style="font-size:11px;" />
                            </div>
                            <div>
                              <label style="font-size:10.5px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Klaim Capaian TKDN (%)</label>
                              <div style="display:flex; align-items:center;">
                                <input type="number" step="0.01" id="mu_item_${it.id}_v${v}_tkdn" class="cakra-form-control cakra-mono alt-inp-tkdn" value="${Number(alt.tkdn || 40)}" style="font-size:11px; width:85px;" />
                                <span style="font-size:11px; font-weight:700; color:#475569; margin-left:6px;">%</span>
                              </div>
                            </div>
                          </div>

                          <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:10px; margin-bottom:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px 10px;">
                            <div>
                              <label style="font-size:10.5px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">SLA Pengiriman (Hari Kalender)</label>
                              <div style="display:flex; align-items:center;">
                                <input type="number" id="mu_item_${it.id}_v${v}_sla_hari" class="cakra-form-control cakra-mono alt-inp-sla" value="${slaDays}" style="font-size:11px; width:80px;" />
                                <span style="font-size:10.5px; color:#64748b; margin-left:6px;">Hari sejak Surat Pesanan</span>
                              </div>
                            </div>
                            <div>
                              <label style="font-size:10.5px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Masa Garansi Resmi Pabrikan</label>
                              <select id="mu_item_${it.id}_v${v}_garansi" class="cakra-form-control alt-sel-garansi" style="font-size:11px;" onchange="onGaransiChange(${it.id}, ${v})">
                                <option value="3 Tahun Onsite Resmi" ${garansiVal.includes('3 Tahun') ? 'selected' : ''}>3 Tahun Onsite Resmi Pabrikan</option>
                                <option value="2 Tahun Onsite Resmi" ${garansiVal.includes('2 Tahun') ? 'selected' : ''}>2 Tahun Onsite Resmi Pabrikan</option>
                                <option value="1 Tahun Onsite Resmi" ${garansiVal.includes('1 Tahun') ? 'selected' : ''}>1 Tahun Onsite Resmi Pabrikan</option>
                                <option value="Tidak Dipersyaratkan (N/A - Bahan Habis Pakai / Jasa)" ${garansiVal.includes('Tidak Dipersyaratkan') ? 'selected' : ''}>Tidak Dipersyaratkan (N/A - Bahan Habis Pakai / Jasa)</option>
                              </select>
                            </div>
                          </div>

                          <!-- 5 PARAMETER CHECKLIST PER VENDOR -->
                          <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:8px 10px; font-size:10.5px;">
                            <div style="font-weight:700; color:#1e3a8a; margin-bottom:5px; text-transform:uppercase; font-size:9.5px;">
                              Pengujian 5 Parameter Kelayakan (Pasal 8 Perlem LKPP No. 2/2026):
                            </div>
                            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:6px;">
                              <label style="display:flex; align-items:center; cursor:pointer;">
                                <input type="checkbox" id="mu_item_${it.id}_v${v}_p1" class="tahap5-param-cb" ${alt.p1 ? 'checked' : ''} onchange="updateVendorParamBadge(${it.id}, ${v})" style="margin-right:6px;" />
                                <span>1. Spek Teknis KAK</span>
                              </label>
                              <label style="display:flex; align-items:center; cursor:pointer;">
                                <input type="checkbox" id="mu_item_${it.id}_v${v}_p2" class="tahap5-param-cb" ${alt.p2 ? 'checked' : ''} onchange="updateVendorParamBadge(${it.id}, ${v})" style="margin-right:6px;" />
                                <span>2. Ketersediaan Stok</span>
                              </label>
                              <label style="display:flex; align-items:center; cursor:pointer;">
                                <input type="checkbox" id="mu_item_${it.id}_v${v}_p3" class="tahap5-param-cb" ${alt.p3 ? 'checked' : ''} onchange="updateVendorParamBadge(${it.id}, ${v})" style="margin-right:6px;" />
                                <span>3. Kewajaran Harga</span>
                              </label>
                              <label style="display:flex; align-items:center; cursor:pointer;">
                                <input type="checkbox" id="mu_item_${it.id}_v${v}_p4" class="tahap5-param-cb" ${alt.p4 ? 'checked' : ''} onchange="updateVendorParamBadge(${it.id}, ${v})" style="margin-right:6px;" />
                                <span>4. SLA Waktu Kirim</span>
                              </label>
                              <label style="display:flex; align-items:center; cursor:pointer;">
                                <input type="checkbox" id="mu_item_${it.id}_v${v}_p5" class="tahap5-param-cb" ${alt.p5 ? 'checked' : ''} onchange="updateVendorParamBadge(${it.id}, ${v})" style="margin-right:6px;" />
                                <span>5. Garansi Resmi Onsite</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('') : `
            <div style="font-size:11.5px; color:#64748b; padding:12px; text-align:center; background:#f8fafc; border-radius:6px;">
              Belum ada rincian item barang pada paket ini. Selesaikan Tahap 4 terlebih dahulu.
            </div>
          `}
        </div>

        <!-- BLOK 3: KESIMPULAN KELAYAKAN PPK & PENYERAHAN TRANSAKSI KE PEJABAT PENGADAAN -->
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px;">
          <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span>📋 BLOK 3: KESIMPULAN KELAYAKAN PPK &amp; PENYERAHAN TRANSAKSI KE PEJABAT PENGADAAN</span>
            <button type="button" class="btn btn-xs" onclick="generateAutoJustifikasiTahap5()" style="background:#0284c7; color:#fff; font-weight:700; border-radius:4px; padding:3px 8px; border:none; cursor:pointer;">⚡ Susun Otomatis Narasi PPK</button>
          </div>
          <div style="margin-bottom:10px;">
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Status Ketersediaan di Katalog Elektronik v6 *</label>
            <select id="mu_tersedia_di_katalog" class="cakra-form-control">
              ${['Ya, Tersedia & Sesuai', 'Tersedia tapi Dikecualikan (Penilaian PPK)', 'Belum Tersedia di Katalog'].map(st => `<option value="${st}" ${paket.tersedia_di_katalog === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Alasan / Justifikasi Formal Penilaian PPK *</label>
            <textarea id="mu_alasan_penilaian_ppk_katalog" class="cakra-form-control" rows="4" placeholder="Uraikan justifikasi formal penilaian 5 parameter PPK...">${cakraEsc(paket.alasan_penilaian_ppk_katalog || 'Berdasarkan analisa pasar dan pengujian 5 parameter kelayakan (spesifikasi teknis, kepastian stok ready, kewajaran harga di bawah pagu DIPA, SLA kirim <= 14 hari, dan garansi resmi pabrikan), barang kebutuhan satker dinyatakan LAYAK untuk ditransaksikan melalui E-Purchasing Katalog v6. Pelaksanaan pemilihan penyedia dan penerbitan Surat Pesanan (baik Skenario Tunggal maupun Multi-Order) diserahkan sepenuhnya kepada Pejabat Pengadaan (PP) sesuai ketentuan Pasal 12 Perpres PBJ.')}</textarea>
          </div>
        </div>
      `;

    case 6:
      const t6Items = CakraState.activePaketCtx?.items || [];
      const paguNum = Number(paket.nilai_pagu || 0);
      const curHpsNum = Number(paket.nilai_hps || paket.nilai_pagu || 0);
      const initSelisih = paguNum - curHpsNum;
      const initPersen = paguNum > 0 ? (initSelisih / paguNum) * 100 : 0;

      return `
        <!-- BLOK 1: KERTAS KERJA & BATAS PAGU -->
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-bottom:12px;">
          <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span>🎯 BLOK 1: KERTAS KERJA PENETAPAN HARGA PPK</span>
            <span class="cakra-badge cakra-badge-primary" style="font-size:10px;">PPK SATKER 657811</span>
          </div>
          <div style="display:grid; grid-template-columns: 1.2fr 1fr; gap:12px;">
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Pilihan Kertas Kerja Harga *</label>
              <select id="mu_jenis_kertas_harga" class="cakra-form-control" style="font-size:12px; font-weight:600;">
                <option value="HPS" ${paket.jenis_kertas_harga === 'HPS' || !paket.jenis_kertas_harga ? 'selected' : ''}>HPS — Standar Pengadaan (Pagu &gt; Rp 100 Juta / Non-Katalog)</option>
                <option value="Referensi Harga (E-Purchasing <=100Jt)" ${paket.jenis_kertas_harga === 'Referensi Harga (E-Purchasing <=100Jt)' ? 'selected' : ''}>Referensi Harga — E-Purchasing Katalog (Pagu &lt;= Rp 100 Juta)</option>
                <option value="Bebas HPS (<=10Jt)" ${paket.jenis_kertas_harga === 'Bebas HPS (<=10Jt)' ? 'selected' : ''}>Bebas HPS — Pengadaan Langsung (Pagu &lt;= Rp 10 Juta)</option>
                <option value="RAB Swakelola" ${paket.jenis_kertas_harga === 'RAB Swakelola' ? 'selected' : ''}>RAB Swakelola — Tipe I / II / III / IV</option>
                <option value="Estimasi Pasar (Dikecualikan)" ${paket.jenis_kertas_harga === 'Estimasi Pasar (Dikecualikan)' ? 'selected' : ''}>Estimasi Pasar — Pengadaan Darurat / Dikecualikan</option>
              </select>
              <div style="font-size:10.5px; color:#64748b; margin-top:3px;">
                💡 Sesuai Pasal 26 Perpres PBJ, pengadaan dengan pagu &gt; Rp 100 Juta wajib menyusun HPS.
              </div>
            </div>
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Batas Tertinggi Pagu Anggaran DIPA</label>
              <div style="background:#f1f5f9; border:1px solid #cbd5e1; border-radius:6px; padding:7px 12px; font-weight:800; font-size:13.5px; color:#0f172a;">
                ${cakraFmtRp(paguNum)}
              </div>
              <div style="font-size:10.5px; color:#64748b; margin-top:3px;">
                Batas pagu anggaran tidak boleh dilampaui oleh total nilai HPS (Pasal 26 ayat 3).
              </div>
            </div>
          </div>
        </div>

        <!-- BLOK 2: KALKULATOR PENETAPAN HPS PER ITEM -->
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px; margin-bottom:12px;">
          <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
            <span>📊 BLOK 2: KALKULATOR HARGA SATUAN HPS PER ITEM (BERDASARKAN SURVEI TAHAP 5)</span>
            <span style="font-size:11px; font-weight:700; color:#64748b;">${t6Items.length} Komponen Item</span>
          </div>

          ${t6Items.length ? t6Items.map((it, idx) => {
            const s1 = Number(it.harga_survei_1 || 0);
            const s2 = Number(it.harga_survei_2 || 0);
            const s3 = Number(it.harga_survei_3 || 0);
            const candidates = [s1, s2, s3].filter(v => v > 0);
            const minS = candidates.length ? Math.min(...candidates) : 0;
            const avgS = candidates.length ? Math.round(candidates.reduce((a, b) => a + b, 0) / candidates.length) : 0;
            const vol = Number(it.volume || 1);
            const currentMetode = it.metode_penentuan_hps || 'Terendah';
            let defaultHrg = Number(it.harga_satuan_hps || 0);
            if (!defaultHrg) {
              defaultHrg = currentMetode === 'Rata-rata' ? avgS : (minS || s1);
            }
            const subtotal = vol * defaultHrg;

            return `
              <div class="t6-item-card" data-item-id="${it.id}" data-volume="${vol}" data-s1="${s1}" data-s2="${s2}" data-s3="${s3}" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                  <div>
                    <div style="font-size:12px; font-weight:800; color:#0f172a;">
                      ${idx + 1}. ${cakraEsc(it.uraian_item)}
                      <span class="cakra-badge cakra-badge-secondary" style="font-size:9.5px; margin-left:6px;">${cakraEsc(it.satuan || 'Unit')}</span>
                      <span class="cakra-badge cakra-badge-info" style="font-size:9.5px; margin-left:4px;">Vol: ${vol}</span>
                      ${it.pic_subbag_pengguna ? `<span class="cakra-badge cakra-badge-success" style="font-size:9.5px; margin-left:4px;">Subbag: ${cakraEsc(it.pic_subbag_pengguna)}</span>` : ''}
                    </div>
                    <div style="font-size:11px; color:#64748b; margin-top:2px;">
                      Spek: ${cakraEsc(it.spesifikasi_teknis || '-')}
                    </div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Subtotal HPS Item:</div>
                    <div id="t6_subtotal_label_${it.id}" style="font-size:14px; font-weight:900; color:#1e40af;">
                      ${cakraFmtRp(subtotal)}
                    </div>
                  </div>
                </div>

                <!-- RIWAYAT SURVEI HARGA PASAR DARI TAHAP 5 -->
                <div style="background:#ffffff; border:1px dashed #cbd5e1; border-radius:6px; padding:8px 10px; margin-bottom:10px; font-size:11px;">
                  <div style="font-weight:700; color:#475569; margin-bottom:4px; font-size:10px; text-transform:uppercase;">
                    Riwayat Survei Pasar (Tahap 5):
                  </div>
                  <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:6px;">
                    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; padding:4px 8px;">
                      <span style="color:#1e40af; font-weight:700;">1. ${cakraEsc(it.sumber_survei_1 || 'Katalog v6')}:</span>
                      <span style="font-weight:800; color:#0f172a; float:right;">${s1 ? cakraFmtRp(s1) : '-'}</span>
                    </div>
                    <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:4px; padding:4px 8px;">
                      <span style="color:#166534; font-weight:700;">2. ${cakraEsc(it.sumber_survei_2 || 'Toko/Pasar')}:</span>
                      <span style="font-weight:800; color:#0f172a; float:right;">${s2 ? cakraFmtRp(s2) : '-'}</span>
                    </div>
                    <div style="background:#faf5ff; border:1px solid #e9d5ff; border-radius:4px; padding:4px 8px;">
                      <span style="color:#6b21a8; font-weight:700;">3. ${cakraEsc(it.sumber_survei_3 || 'SBM/Riwayat')}:</span>
                      <span style="font-weight:800; color:#0f172a; float:right;">${s3 ? cakraFmtRp(s3) : '-'}</span>
                    </div>
                  </div>
                </div>

                <!-- FORM PENETAPAN METODE & HARGA SATUAN -->
                <div style="display:grid; grid-template-columns: 1.3fr 1fr; gap:10px; align-items:flex-end;">
                  <div>
                    <label style="font-size:11px; font-weight:700; color:#334155; margin-bottom:3px; display:block;">
                      Metode Penetapan Harga Satuan:
                    </label>
                    <select id="t6_metode_${it.id}" class="cakra-form-control" style="font-size:11.5px; padding:5px 8px;" onchange="onTahap6MetodeChange(${it.id})">
                      <option value="Terendah" ${currentMetode === 'Terendah' ? 'selected' : ''}>Harga Terendah Hasil Survei (${cakraFmtRp(minS)})</option>
                      <option value="Rata-rata" ${currentMetode === 'Rata-rata' ? 'selected' : ''}>Rata-rata Aritmatika Hasil Survei (${cakraFmtRp(avgS)})</option>
                      <option value="Sumber 1 (Katalog)" ${currentMetode === 'Sumber 1 (Katalog)' ? 'selected' : ''}>Mengacu Sumber 1 / Katalog (${cakraFmtRp(s1)})</option>
                      <option value="Sumber 2 (Toko/Pasar)" ${currentMetode === 'Sumber 2 (Toko/Pasar)' ? 'selected' : ''}>Mengacu Sumber 2 / Pembanding (${cakraFmtRp(s2)})</option>
                      <option value="Sumber 3 (SBM/Riwayat)" ${currentMetode === 'Sumber 3 (SBM/Riwayat)' ? 'selected' : ''}>Mengacu Sumber 3 / SBM (${cakraFmtRp(s3)})</option>
                      <option value="Manual Input" ${currentMetode === 'Manual Input' ? 'selected' : ''}>Penetapan Mandiri / Nilai Lain (Ketik Manual)</option>
                    </select>
                  </div>
                  <div>
                    <label style="font-size:11px; font-weight:700; color:#334155; margin-bottom:3px; display:block;">
                      Harga Satuan HPS Ditetapkan (Rp) *:
                    </label>
                    <input type="number" id="t6_hps_satuan_${it.id}" class="cakra-form-control t6-hps-satuan-input" value="${defaultHrg}" style="font-size:12.5px; font-weight:800; padding:5px 10px;" oninput="onTahap6HargaManualInput(${it.id})" />
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div style="font-size:11.5px; color:#64748b; padding:16px; text-align:center; background:#f8fafc; border-radius:6px;">
              ⚠️ Belum ada rincian item barang pada paket ini. Selesaikan Tahap 4 (Spesifikasi Teknis) terlebih dahulu.
            </div>
          `}
        </div>

        <!-- BLOK 3: RESUME KOMPARASI & VALIDASI KELAYAKAN PAGU DIPA -->
        <div style="background:#eff6ff; border:1.5px solid #93c5fd; border-radius:10px; padding:14px;">
          <div style="font-size:12.5px; font-weight:800; color:#1e40af; margin-bottom:10px; display:flex; align-items:center; justify-content:space-between;">
            <span>📈 BLOK 3: RESUME KOMPARASI PAGU vs TOTAL HPS</span>
            <span id="t6_persen_efisiensi_badge" class="cakra-badge cakra-badge-success" style="font-size:11px;">Efisiensi: ${initPersen.toFixed(2)}% (${cakraFmtRp(initSelisih)})</span>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-bottom:12px;">
            <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:10px;">
              <div style="font-size:10px; font-weight:700; color:#64748b; text-transform:uppercase;">Pagu Anggaran DIPA</div>
              <div style="font-size:15px; font-weight:900; color:#0f172a;">${cakraFmtRp(paguNum)}</div>
              <div style="font-size:10px; color:#64748b;">Batas Pagu Tertinggi</div>
            </div>
            <div style="background:#ffffff; border:1px solid #bfdbfe; border-radius:8px; padding:10px;">
              <div style="font-size:10px; font-weight:700; color:#1e40af; text-transform:uppercase;">Total Nilai HPS Ditetapkan</div>
              <div id="t6_total_hps_label" style="font-size:16px; font-weight:900; color:#1e3a8a;">
                ${cakraFmtRp(curHpsNum)}
              </div>
              <div style="font-size:10px; color:#1e40af;">Termasuk PPN 11% &amp; Keuntungan</div>
            </div>
            <div style="background:#ffffff; border:1px solid #bbf7d0; border-radius:8px; padding:10px;">
              <div style="font-size:10px; font-weight:700; color:#166534; text-transform:uppercase;">Selisih / Efisiensi Anggaran</div>
              <div id="t6_selisih_efisiensi_label" style="font-size:15px; font-weight:900; color:#166534;">
                ${cakraFmtRp(initSelisih)}
              </div>
              <div style="font-size:10px; color:#166534;">Penghematan Keuangan Negara</div>
            </div>
          </div>

          <!-- HIDDEN INPUT COMPATIBILITY -->
          <input type="hidden" id="mu_nilai_hps" value="${curHpsNum}" />

          <!-- STATUS VALIDASI PAGU ANGGARAN (PASAL 26 AYAT 3 PERPRES) -->
          <div id="t6_status_validasi_pagu" style="padding:10px 12px; border-radius:6px; font-size:11.5px; font-weight:700; line-height:1.45; background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46;">
            ✅ <b>MEMENUHI KETENTUAN PENGADAAN (PASAL 26 AYAT 3 PERPRES 16/2018 JO 46/2025):</b><br/>
            Total HPS berada di bawah batas pagu DIPA. Rincian penetapan harga siap disahkan oleh PPK.
          </div>
        </div>
      `;

    case 7: {
      const hpsBasis = Number(paket.nilai_hps || paket.nilai_pagu || 0);
      const paguBasis = Number(paket.nilai_pagu || 0);
      const dppEst = Math.round(hpsBasis / (1 + (Number(paket.tarif_ppn ?? 11) / 100)));
      const dendaHariEst = Math.round(dppEst / 1000);
      const curUm = Number(paket.persen_uang_muka ?? 0);
      const curUmRp = Math.round((hpsBasis * curUm) / 100);
      const curCaraBayar = paket.cara_pembayaran || 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)';
      const curBasisDenda = paket.basis_denda || '1 permil per hari dari Harga Kontrak sebelum PPN (DPP)';
      const curGaransi = paket.ketentuan_garansi || (String(paket.jenis_pengadaan || '').includes('Konstruksi')
        ? 'Masa Pemeliharaan Konstruksi Permanen 180 Hari Kalender (6 Bulan) — Retensi / Jaminan Pemeliharaan 5%'
        : 'Sertifikat Garansi Purna Jual Resmi Pabrikan Minimal 1 Tahun (365 Hari Kalender) — Bebas Retensi 5%');
      const curSengketa = paket.penyelesaian_sengketa || 'Musyawarah untuk Mufakat, dilanjutkan Layanan Penyelesaian Sengketa (LPS) LKPP';
      const curWajibJaminan = Number(paket.wajib_jaminan_pelaksanaan ?? 0);
      const rekBentuk = paket.metode_pemilihan === 'E-Purchasing' ? 'Surat Pesanan' : (paguBasis <= 10000000 ? 'Bukti Pembelian' : (paguBasis <= 50000000 ? 'Kuitansi' : (paguBasis <= 200000000 ? 'SPK' : 'Surat Perjanjian')));

      const caraBayarOptions = [
        'Sekaligus (100% melalui SPM-LS setelah BAST 100%)',
        'Termin (Bertahap sesuai Capaian Progres Fisik Pekerjaan)',
        'Bulanan (Berdasarkan Tagihan Riil Bulanan)'
      ];
      const garansiOptions = [
        'Sertifikat Garansi Purna Jual Resmi Pabrikan Minimal 1 Tahun (365 Hari Kalender) — Bebas Retensi 5%',
        'Sertifikat Garansi Purna Jual Resmi Onsite 3 Tahun (1.095 Hari Kalender) — Bebas Retensi 5%',
        'Masa Pemeliharaan Konstruksi Permanen 180 Hari Kalender (6 Bulan) — Retensi / Jaminan Pemeliharaan 5%',
        'Masa Pemeliharaan Konstruksi Semi-Permanen 90 Hari Kalender (3 Bulan) — Retensi / Jaminan Pemeliharaan 5%',
        'Tanpa Masa Pemeliharaan (Barang Habis Pakai / Konsumsi)'
      ];
      const basisDendaOptions = [
        '1 permil per hari dari Harga Kontrak sebelum PPN (DPP)',
        '1 permil per hari dari Bagian Kontrak sebelum PPN yang belum diserahkan'
      ];
      const sengketaOptions = [
        'Musyawarah untuk Mufakat, dilanjutkan Layanan Penyelesaian Sengketa (LPS) LKPP',
        'Musyawarah untuk Mufakat, dilanjutkan Pengadilan Negeri Ngawi',
        'Musyawarah untuk Mufakat, dilanjutkan Badan Arbitrase Nasional Indonesia (BANI)'
      ];

      return `
        <!-- BANNER PANDUAN REGULASI TAHAP 7 -->
        <div style="background:linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%); border:1px solid #bfdbfe; border-left:4px solid #1d4ed8; border-radius:8px; padding:12px 14px; margin-bottom:14px;">
          <div style="font-size:12px; font-weight:800; color:#1e3a8a; margin-bottom:4px;">
            ⚖️ Kertas Kerja PPK Tahap 7: Penyusunan Rancangan Kontrak, SSUK &amp; SSKK (Pasal 27–29 &amp; 78 Perpres 46/2025)
          </div>
          <div style="font-size:11px; color:#334155; line-height:1.45;">
            Pada Tahap 7, PPK menetapkan <b>Bentuk &amp; Jenis Perikatan</b> serta klausul <b>Syarat-Syarat Khusus Kontrak (SSKK)</b> sebagai bagian dari Dokumen Persiapan Pengadaan (DPP). Identitas Penyedia, Nomor Rekening, dan Harga Kontrak hasil negosiasi otomatis berstatus <b>[DRAFT — DIISI PASCA PEMILIHAN TAHAP 9]</b> dan lembar penetapan Tahap 7 ditandatangani <b>Tunggal oleh PPK</b>.
          </div>
        </div>

        <!-- BLOK 1: BENTUK PERIKATAN, JENIS KONTRAK, SLA & LOKASI PENYERAHAN -->
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
            <div style="font-size:12px; font-weight:800; color:#1e3a8a;">
              📌 BLOK 1: BENTUK PERIKATAN, JENIS KONTRAK, JANGKA WAKTU (SLA) &amp; LOKASI PENYERAHAN
            </div>
            <span class="cakra-badge cakra-badge-info" style="font-size:10px;">Rekomendasi Regulasi: ${cakraEsc(rekBentuk)} (Lumsum)</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px;">
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Bentuk Kontrak (Pasal 28 Perpres 46/2025) *</label>
              <select id="mu_bentuk_kontrak" class="cakra-form-control">
                ${['Surat Pesanan', 'SPK', 'Surat Perjanjian', 'Kuitansi', 'Bukti Pembelian', 'Kontrak Swakelola'].map(b => `<option value="${b}" ${(paket.bentuk_kontrak || rekBentuk) === b ? 'selected' : ''}>${b}${b === rekBentuk ? ' (Rekomendasi Sistem)' : ''}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Jenis Kontrak (Pasal 27 Perpres 46/2025) *</label>
              <select id="mu_jenis_kontrak" class="cakra-form-control">
                ${['Lumsum', 'Harga Satuan', 'Gabungan Lumsum dan Harga Satuan', 'Kontrak Payung', 'Biaya Plus Imbalan', 'Waktu Penugasan'].map(j => `<option value="${j}" ${(paket.jenis_kontrak || 'Lumsum') === j ? 'selected' : ''}>${j}</option>`).join('')}
              </select>
            </div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 2fr; gap:12px;">
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Jangka Waktu Pelaksanaan / SLA (Hari Kalender) *</label>
              <input type="number" min="1" max="365" id="mu_masa_pelaksanaan_hari" class="cakra-form-control cakra-mono" value="${Number(paket.masa_pelaksanaan_hari || 14)}" />
            </div>
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Lokasi Penyerahan Barang / Tempat Pekerjaan (Franco) *</label>
              <input type="text" id="mu_lokasi_pekerjaan" class="cakra-form-control" value="${cakraEsc(paket.lokasi_pekerjaan || 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi')}" />
            </div>
          </div>
        </div>

        <!-- BLOK 2: CARA PEMBAYARAN & KEBIJAKAN UANG MUKA (PASAL 29 PERPRES 46/2025) -->
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px; margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
            <div style="font-size:12px; font-weight:800; color:#1e3a8a;">
              💰 BLOK 2: CARA PEMBAYARAN &amp; KEBIJAKAN UANG MUKA (PASAL 29 PERPRES 46/2025 &amp; PMK APBN)
            </div>
            <span class="cakra-badge cakra-badge-success" style="font-size:10px;">Basis Estimasi HPS: ${cakraFmtRp(hpsBasis)}</span>
          </div>

          <div style="display:grid; grid-template-columns:1.25fr 1fr; gap:12px; margin-bottom:10px;">
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Cara Pembayaran Kontrak (SSKK) *</label>
              <select id="mu_cara_pembayaran" class="cakra-form-control" onchange="onTahap7CaraBayarChange()">
                ${caraBayarOptions.map(cb => `<option value="${cb}" ${curCaraBayar === cb ? 'selected' : ''}>${cb}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Persentase Uang Muka (%) *</label>
              <input type="number" min="0" max="100" step="1" id="mu_persen_uang_muka" class="cakra-form-control cakra-mono" style="font-weight:800;" value="${curUm}" oninput="updateTahap7Preview(${hpsBasis}, ${paguBasis})" />
            </div>
          </div>

          <!-- TOMBOL PRESET REGULASI UANG MUKA -->
          <div style="margin-bottom:10px;">
            <div style="font-size:10.5px; font-weight:700; color:#64748b; margin-bottom:5px;">Pilihan Cepat Regulasi Uang Muka (Pasal 29 ayat 1 &amp; ayat 2a Perpres 46/2025):</div>
            <div style="display:flex; flex-wrap:wrap; gap:6px;">
              <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" style="font-size:10.5px; padding:4px 9px;" onclick="setTahap7PresetUangMuka(0, ${hpsBasis}, ${paguBasis})">
                ✅ 0% — Tanpa Uang Muka (Bayar Sekaligus 100% Pasca-BAST)
              </button>
              <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" style="font-size:10.5px; padding:4px 9px;" onclick="setTahap7PresetUangMuka(50, ${hpsBasis}, ${paguBasis})">
                🏛️ 50% — Batas Min. UMK (Kontrak Rp 50–200 Jt)
              </button>
              <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" style="font-size:10.5px; padding:4px 9px;" onclick="setTahap7PresetUangMuka(30, ${hpsBasis}, ${paguBasis})">
                🏛️ 30% — Batas Min. UMK (> Rp 200 Jt–2,5 M) / Maks. ≤ 50 Jt
              </button>
              <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" style="font-size:10.5px; padding:4px 9px;" onclick="setTahap7PresetUangMuka(20, ${hpsBasis}, ${paguBasis})">
                🏢 20% — Maks. Non-Kecil (> Rp 2,5 M)
              </button>
            </div>
          </div>

          <!-- KOTAK STATUS LIVE PREVIEW UANG MUKA -->
          <div id="t7_uang_muka_info_box" style="padding:10px 12px; border-radius:6px; font-size:11px; line-height:1.45; background:${curUm === 0 ? '#f0fdf4' : '#fffbeb'}; border:1px solid ${curUm === 0 ? '#86efac' : '#fde68a'}; color:${curUm === 0 ? '#166534' : '#92400e'};">
            ${curUm === 0
              ? `✅ <b>SKEMA TANPA UANG MUKA (0% — Rp 0):</b> Pembayaran dilakukan <b>Sekaligus 100%</b> melalui SPM-LS KPPN setelah barang/pekerjaan selesai 100% dan dibuktikan dengan BAST. Penyedia <b>bebas kewajiban menyerahkan Jaminan Uang Muka</b>.`
              : `⚠️ <b>SKEMA DENGAN UANG MUKA (${curUm}% — Estimasi ${cakraFmtRp(curUmRp)}):</b> Sesuai Pasal 29 Perpres 46/2025 &amp; PMK Pelaksanaan Anggaran APBN, pencairan Uang Muka <b>wajib didahului Permohonan Tertulis Penyedia + Penyerahan Jaminan Uang Muka (Bank Garansi / Surety Bond) senilai 100% dari Uang Muka (${cakraFmtRp(curUmRp)})</b>.`
            }
          </div>
        </div>

        <!-- BLOK 3: JAMINAN, GARANSI PURNA JUAL, DENDA 1‰ (SEBELUM PPN) & PENYELESAIAN SENGKETA -->
        <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px;">
          <div style="font-size:12px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">
            🛡️ BLOK 3: JAMINAN PELAKSANAAN, GARANSI / PEMELIHARAAN, DENDA 1‰ (DPP) &amp; PENYELESAIAN SENGKETA
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px;">
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Kewajiban Jaminan Pelaksanaan 5% (Pasal 30 &amp; 33)</label>
              <select id="mu_wajib_jaminan_pelaksanaan" class="cakra-form-control">
                <option value="0" ${curWajibJaminan === 0 ? 'selected' : ''}>Dikecualikan / Bebas Jaminan Pelaksanaan (E-Purchasing / PL B/JL ≤ 200 Jt / Konstruksi ≤ 400 Jt)</option>
                <option value="1" ${curWajibJaminan === 1 ? 'selected' : ''}>Wajib Jaminan Pelaksanaan 5% (${cakraFmtRp(Math.round(hpsBasis * 0.05))})</option>
              </select>
            </div>
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Ketentuan Garansi Purna Jual / Masa Pemeliharaan</label>
              <select id="mu_ketentuan_garansi" class="cakra-form-control">
                ${garansiOptions.map(g => `<option value="${g}" ${curGaransi === g ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Dasar Pengenaan Denda Keterlambatan 1‰ (Pasal 78 ayat 5)</label>
              <select id="mu_basis_denda" class="cakra-form-control">
                ${basisDendaOptions.map(bd => `<option value="${bd}" ${(curBasisDenda === bd || (bd.includes('Harga Kontrak') && curBasisDenda === '1 permil per hari dari harga kontrak')) ? 'selected' : ''}>${bd}</option>`).join('')}
              </select>
              <div style="font-size:10.5px; color:#1e40af; margin-top:4px; font-weight:600;">
                💡 Simulasi Denda 1‰ dari DPP Sebelum PPN (${cakraFmtRp(dppEst)}): <b>${cakraFmtRp(dendaHariEst)} / hari kalender</b>
              </div>
            </div>
            <div>
              <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Forum Penyelesaian Perselisihan / Sengketa (SSKK)</label>
              <select id="mu_penyelesaian_sengketa" class="cakra-form-control">
                ${sengketaOptions.map(sg => `<option value="${sg}" ${curSengketa === sg ? 'selected' : ''}>${sg}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
      `;
    }

    case 8:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Penyerahan &amp; Reviu Dokumen Persiapan Pengadaan (DPP)</div>
        <div style="display:grid; grid-template-columns:1fr 1.5fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Pelaksana Pemilihan</label>
            <select id="mu_pelaksana_pemilihan" class="cakra-form-control">
              ${['Pejabat Pengadaan', 'Pokja Pemilihan', 'PPK Mandiri'].map(p => `<option value="${p}" ${paket.pelaksana_pemilihan === p ? 'selected' : ''}>${p}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nomor Berita Acara Reviu DPP</label>
            <input type="text" id="mu_no_reviu_dpp" class="cakra-form-control cakra-mono" value="${cakraEsc(activeTRow.no_reviu_dpp || generateAutoStageDocNumber(8, paket.kode_paket_internal, activeTRow.tanggal_dokumen))}" />
          </div>
        </div>
      `;

    case 9:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Hasil Pemilihan, Rekanan Penyedia &amp; Nilai Kontrak Sepakat</div>
        <div style="margin-bottom:12px;">
          <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Pilih Penyedia (Rekanan Terpilih)</label>
          <select id="mu_penyedia_id" class="cakra-form-control">
            ${(CakraState.penyedias || []).map(v => `<option value="${v.id}" ${Number(paket.penyedia_id) === Number(v.id) ? 'selected' : ''}>${cakraEsc(v.nama_perusahaan)} (${cakraEsc(v.kualifikasi_usaha || 'UMK')})</option>`).join('')}
          </select>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nilai Penawaran Awal (Rp)</label>
            <input type="number" id="mu_nilai_penawaran_awal" class="cakra-form-control" value="${Number(paket.nilai_penawaran_awal || paket.nilai_pagu || 0)}" />
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nilai Hasil Negosiasi / Sepakat (Rp) *</label>
            <input type="number" id="mu_nilai_kontrak" class="cakra-form-control" value="${Number(paket.nilai_kontrak || paket.nilai_pagu || 0)}" style="font-weight:700;" />
          </div>
        </div>
      `;

    case 10:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Reviu Pemilihan &amp; Validasi Integritas Rekanan</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Status Validasi KSWP</label>
            <select id="mu_status_kswp" class="cakra-form-control">
              <option value="Valid / Konfirmasi Sesuai">Valid / Konfirmasi Sesuai</option>
              <option value="Perlu Klarifikasi">Perlu Klarifikasi</option>
            </select>
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Beneficial Ownership (Pemilik Manfaat)</label>
            <input type="text" id="mu_bo_nama" class="cakra-form-control" value="${cakraEsc(paket.bo_nama || 'Direktur Utama')}" placeholder="Nama Pemilik Manfaat" />
          </div>
        </div>
      `;

    case 11:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Penerbitan SPPBJ &amp; Ketentuan Jaminan Pelaksanaan</div>
        <div style="display:grid; grid-template-columns:1.5fr 1fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nomor SPPBJ PPK</label>
            <input type="text" id="mu_no_sppbj" class="cakra-form-control cakra-mono" value="${cakraEsc(activeTRow.no_sppbj || generateAutoStageDocNumber(11, paket.kode_paket_internal, activeTRow.tanggal_dokumen))}" />
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Jaminan Pelaksanaan</label>
            <select id="mu_wajib_jaminan_pelaksanaan" class="cakra-form-control">
              <option value="Tidak Wajib (Non-Tender / E-Purchasing)">Tidak Wajib (Non-Tender / E-Purchasing)</option>
              <option value="Wajib 5% dari Nilai Kontrak">Wajib 5% dari Nilai Kontrak</option>
            </select>
          </div>
        </div>
      `;

    case 12:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Rapat PAM &amp; Verifikasi Rekening Bank Rekanan</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nama Bank Penyedia</label>
            <input type="text" id="mu_nama_bank_penyedia" class="cakra-form-control" value="${cakraEsc(paket.nama_bank_penyedia || 'Bank Jatim Cabang Ngawi')}" />
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nomor Rekening Penyedia</label>
            <input type="text" id="mu_no_rekening_penyedia" class="cakra-form-control cakra-mono" value="${cakraEsc(paket.no_rekening_penyedia || '014-229-8711')}" />
          </div>
        </div>
      `;

    case 13:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Penandatanganan Kontrak / Surat Pesanan Final</div>
        <div style="display:grid; grid-template-columns:1.5fr 1fr; gap:12px; margin-bottom:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nomor Kontrak / Surat Pesanan</label>
            <input type="text" id="mu_no_kontrak" class="cakra-form-control cakra-mono" value="${cakraEsc(paket.no_kontrak || generateAutoStageDocNumber(13, paket.kode_paket_internal, activeTRow.tanggal_dokumen))}" />
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nilai Kontrak Final (Rp) *</label>
            <input type="number" id="mu_nilai_kontrak_final" class="cakra-form-control" value="${Number(paket.nilai_kontrak || paket.nilai_pagu || 0)}" style="font-weight:700;" />
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Tanggal Mulai Kerja</label>
            <input type="date" id="mu_tgl_mulai_kerja" class="cakra-form-control" value="${cakraEsc(paket.tgl_mulai_kerja || '2026-05-18')}" />
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Tanggal Selesai Kerja</label>
            <input type="date" id="mu_tgl_selesai_kerja" class="cakra-form-control" value="${cakraEsc(paket.tgl_selesai_kerja || '2026-05-31')}" />
          </div>
        </div>
      `;

    case 14:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Penyerahan Lokasi Kerja (SPL) &amp; Kick-off MC-0</div>
        <div>
          <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Lokasi Pelaksanaan Pekerjaan</label>
          <input type="text" id="mu_lokasi_pekerjaan" class="cakra-form-control" value="${cakraEsc(paket.lokasi_pekerjaan || 'Kantor KPU Kabupaten Ngawi, Jl. Untung Suropati No. 48 Ngawi')}" />
        </div>
      `;

    case 15:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Surat Perintah Mulai Kerja (SPMK) &amp; Pengendalian SCM</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Progres Fisik (%)</label>
            <input type="number" id="mu_realisasi_fisik_persen" class="cakra-form-control" value="${Number(paket.realisasi_fisik_persen || 100)}" />
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Status Pengendalian SCM</label>
            <select id="mu_status_scm" class="cakra-form-control">
              <option value="Normal / Sesuai Kurva S">Normal / Sesuai Kurva S</option>
              <option value="Kontrak Kritis (Show Cause Meeting I)">Kontrak Kritis (Show Cause Meeting I)</option>
              <option value="Adendum / Perpanjangan Waktu">Adendum / Perpanjangan Waktu</option>
            </select>
          </div>
        </div>
      `;

    case 16:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Pemeriksaan Mutu BAPHP &amp; Berita Acara Serah Terima (BAST)</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nomor BAPHP (Pemeriksaan)</label>
            <input type="text" id="mu_no_baphp" class="cakra-form-control cakra-mono" value="${cakraEsc(activeTRow.no_baphp || generateAutoStageDocNumber(16, paket.kode_paket_internal, activeTRow.tanggal_dokumen))}" />
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nomor BAST (Serah Terima)</label>
            <input type="text" id="mu_no_bast" class="cakra-form-control cakra-mono" value="${cakraEsc(paket.no_bast || generateAutoStageDocNumber(16, paket.kode_paket_internal, activeTRow.tanggal_dokumen))}" />
          </div>
        </div>
      `;

    case 17:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 BAST ke KPA, Pemotongan Pajak &amp; SP2D Netto</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Jenis Pajak PPh</label>
            <select id="mu_jenis_pph" class="cakra-form-control">
              <option value="PPh 22 (1.5%)">PPh 22 (1.5%)</option>
              <option value="PPh 23 (2.0%)">PPh 23 (2.0%)</option>
              <option value="PPh Final (0.5%)">PPh Final (0.5%)</option>
              <option value="Bebas PPh">Bebas PPh</option>
            </select>
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Nomor Faktur Pajak</label>
            <input type="text" id="mu_no_faktur_pajak" class="cakra-form-control cakra-mono" value="${cakraEsc(activeTRow.no_faktur_pajak || '010.000-26.00000001')}" />
          </div>
        </div>
      `;

    case 18:
      return `
        <div style="font-size:12.5px; font-weight:800; color:#1e3a8a; margin-bottom:10px;">🎯 Evaluasi Kinerja SiKAP LKPP &amp; Pencatatan SIMAN BMN</div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Rating Kinerja Penyedia di SiKAP LKPP</label>
            <select id="mu_rating_kinerja_sikap" class="cakra-form-control">
              <option value="⭐⭐⭐⭐⭐ Sangat Baik (Bintang 5)">⭐⭐⭐⭐⭐ Sangat Baik (Bintang 5)</option>
              <option value="⭐⭐⭐⭐ Baik (Bintang 4)">⭐⭐⭐⭐ Baik (Bintang 4)</option>
              <option value="⭐⭐⭐ Cukup (Bintang 3)">⭐⭐⭐ Cukup (Bintang 3)</option>
              <option value="⭐⭐ Kurang (Bintang 2)">⭐⭐ Kurang (Bintang 2)</option>
            </select>
          </div>
          <div>
            <label style="font-size:11.5px; font-weight:700; color:#334155; margin-bottom:4px; display:block;">Kode Registrasi SIMAN / SAKTI BMN</label>
            <input type="text" id="mu_kode_registrasi_bmn" class="cakra-form-control cakra-mono" value="${cakraEsc(paket.kode_registrasi_bmn || 'BMN-2026-657811-001')}" />
          </div>
        </div>
      `;

    default:
      return '<div style="font-size:12px; color:#64748b;">Silakan lengkapi nomor dokumen dan tautan Google Drive di atas.</div>';
  }
}

async function submitModalTahapUniversal(isSelesaiAction = false) {
  const num = Number(CakraState.activeUniversalStageNo || CakraState.activeStageNo || 3);
  const paket = (CakraState.activePaketCtx?.paket?.id === CakraState.activePaketId ? CakraState.activePaketCtx.paket : null)
    || (CakraState.pakets || []).find(p => String(p.id) === String(CakraState.activePaketId));
  if (!paket) {
    cakraNotify('❌ Paket aktif tidak ditemukan!', 'error');
    return;
  }

  const tahaps = CakraState.activePaketCtx?.tahaps || [];
  const activeTRow = tahaps.find(t => Number(t.no_tahap) === num) || {};
  const activeDef = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === num) || { no: num, nama: 'Tahap ' + num, fase: 1 };

  const getStr = id => {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  };
  const getNum = id => {
    const el = document.getElementById(id);
    return el ? Number(el.value || 0) : 0;
  };

  const nomorDokumen = getStr('mu_nomor_dokumen') || activeTRow.nomor_dokumen || generateAutoStageDocNumber(num, paket.kode_paket_internal, '2026-05-18');
  const tanggalDokumen = getStr('mu_tanggal_dokumen') || activeTRow.tanggal_dokumen || '2026-05-18';
  const linkDrive = getStr('mu_link_drive_dokumen') || activeTRow.link_drive_dokumen || '';
  const catatanTahap = getStr('mu_catatan_tahap') || activeTRow.catatan_tahap || '';

  // VALIDASI JIKA USER MENEKAN "SELESAIKAN TAHAP & KUNCI"
  if (isSelesaiAction) {
    if (!linkDrive || linkDrive.length < 10 || !linkDrive.startsWith('http')) {
      cakraNotify('⚠️ Tahap ' + num + ' belum dapat diselesaikan! Sesuai SOP & regulasi pengadaan, dokumen fisik hasil cetak wajib ditandatangani basah/TTE dan tautan Google Drive wajib diisi.', 'warning');
      const el = document.getElementById('mu_link_drive_dokumen');
      if (el) {
        el.focus();
        el.style.border = '2px solid #ef4444';
        setTimeout(() => { if (el) el.style.border = ''; }, 3000);
      }
      return;
    }
  }

  const statusTahap = isSelesaiAction ? 'Selesai' : (activeTRow.status_tahap === 'Selesai' ? 'Selesai' : 'Draft');

  // Collect stage-specific values
  let extraPaketFields = {};
  if (num === 3) {
    extraPaketFields.kode_rup = getStr('mu_kode_rup') || paket.kode_rup;
    // Status paket otomatis oleh sistem
  } else if (num === 4) {
    extraPaketFields.uraian_pekerjaan = getStr('mu_uraian_pekerjaan') || paket.uraian_pekerjaan;
    extraPaketFields.prioritas_pdn_level = getStr('mu_prioritas_pdn_level') || paket.prioritas_pdn_level;
    extraPaketFields.masa_pelaksanaan_hari = getNum('mu_masa_pelaksanaan_hari') || paket.masa_pelaksanaan_hari;

    // Kumpulkan rincian item KAK dari form Tahap 4
    const itemCards = document.querySelectorAll('#t4_items_container .t4-item-card');
    if (itemCards.length) {
      const currentItems = CakraState.activePaketCtx?.items || [];
      const newItems = Array.from(itemCards).map((card, idx) => {
        const idVal = card.dataset.itemId;
        const matchedOld = currentItems.find(x => String(x.id) === String(idVal)) || {};
        const uraian = card.querySelector('.t4-item-uraian')?.value.trim() || ('Item ' + (idx + 1));
        const vol = Number(card.querySelector('.t4-item-vol')?.value || 1);
        const satuan = card.querySelector('.t4-item-satuan')?.value.trim() || 'Unit';
        const paguSat = Number(card.querySelector('.t4-item-pagu')?.value || 0);
        const spek = card.querySelector('.t4-item-spek')?.value.trim() || '-';
        const tkdn = Number(card.querySelector('.t4-item-tkdn')?.value || 40);
        const sakti = card.querySelector('.t4-item-sakti')?.value || 'Aset Tetap (BMN)';
        const subbagPengguna = card.querySelector('.t4-item-subbag')?.value || 'KUL';

        return {
          ...matchedOld,
          id: idVal && !idVal.startsWith('NEW_') ? Number(idVal) : undefined,
          urutan: idx + 1,
          uraian_item: uraian,
          spesifikasi_teknis: spek,
          volume: vol,
          satuan: satuan,
          persen_tkdn: tkdn,
          harga_satuan_hps: paguSat,
          jumlah_hps: Math.round(vol * paguSat),
          jenis_pencatatan_sakti: sakti,
          pic_subbag_pengguna: subbagPengguna
        };
      });

      try {
        await cakraApiPost('/api/cakra/paket/' + paket.id + '/items', { items: newItems });
        if (CakraState.activePaketCtx) {
          const freshCtx = await cakraApiGet('/api/cakra/paket/' + paket.id);
          if (freshCtx?.items) {
            CakraState.activePaketCtx.items = freshCtx.items;
          }
        }
      } catch (err) {
        console.warn('Gagal menyimpan rincian item KAK Tahap 4:', err);
      }
    }
  } else if (num === 5) {
    extraPaketFields.tersedia_di_katalog = getStr('mu_tersedia_di_katalog') || paket.tersedia_di_katalog;
    extraPaketFields.alasan_penilaian_ppk_katalog = getStr('mu_alasan_penilaian_ppk_katalog') || paket.alasan_penilaian_ppk_katalog;
    extraPaketFields.sub_metode_epurchasing = getStr('mu_sub_metode_epurchasing') || paket.sub_metode_epurchasing;

    // Simpan data alternatif survei pasar per item barang ke backend
    const currentItems = CakraState.activePaketCtx?.items || [];
    if (currentItems.length) {
      const updatedItems = currentItems.map(it => {
        const altCards = document.querySelectorAll('#t5_item_' + it.id + '_alternatifs .t5-alt-card');
        let alternatifs = [];
        if (altCards.length) {
          alternatifs = Array.from(altCards).map((card, aIdx) => {
            const v = card.dataset.altIdx || (aIdx + 1);
            const jenis_sumber = document.getElementById('mu_item_' + it.id + '_v' + v + '_jenis_sumber')?.value || 'Katalog Elektronik (E-Katalog v6)';
            const sumber = document.getElementById('mu_item_' + it.id + '_v' + v + '_sumber')?.value.trim() || '';
            const produk = document.getElementById('mu_item_' + it.id + '_v' + v + '_produk')?.value.trim() || '';
            const harga = Number(document.getElementById('mu_item_' + it.id + '_v' + v + '_harga')?.value || 0);
            const url = document.getElementById('mu_item_' + it.id + '_v' + v + '_url')?.value.trim() || '';
            const tkdn = Number(document.getElementById('mu_item_' + it.id + '_v' + v + '_tkdn')?.value || 0);
            const sla_hari = Number(document.getElementById('mu_item_' + it.id + '_v' + v + '_sla_hari')?.value || 14);
            const garansi = document.getElementById('mu_item_' + it.id + '_v' + v + '_garansi')?.value || '3 Tahun Onsite Resmi';
            const p1 = document.getElementById('mu_item_' + it.id + '_v' + v + '_p1')?.checked ? 1 : 0;
            const p2 = document.getElementById('mu_item_' + it.id + '_v' + v + '_p2')?.checked ? 1 : 0;
            const p3 = document.getElementById('mu_item_' + it.id + '_v' + v + '_p3')?.checked ? 1 : 0;
            const p4 = document.getElementById('mu_item_' + it.id + '_v' + v + '_p4')?.checked ? 1 : 0;
            const p5 = document.getElementById('mu_item_' + it.id + '_v' + v + '_p5')?.checked ? 1 : 0;

            return {
              alt_no: Number(v),
              jenis_sumber,
              sumber,
              produk,
              harga,
              url,
              tkdn,
              sla_hari,
              garansi,
              p1, p2, p3, p4, p5,
              skor: p1 + p2 + p3 + p4 + p5
            };
          });
        }

        const validPrices = alternatifs.map(a => a.harga).filter(h => h > 0);
        const minVal = validPrices.length ? Math.min(...validPrices) : Number(it.harga_satuan_hps || 0);

        const a1 = alternatifs[0] || {};
        const a2 = alternatifs[1] || {};
        const a3 = alternatifs[2] || {};

        return {
          ...it,
          merk_tipe_katalog: a1.produk || it.merk_tipe_katalog || '',
          sumber_survei_1: a1.sumber ? (a1.sumber + (a1.produk ? (' - ' + a1.produk) : '')) : (it.sumber_survei_1 || ''),
          harga_survei_1: a1.harga || it.harga_survei_1 || minVal,
          link_survei_1: a1.url || it.link_survei_1 || '',
          sumber_survei_2: a2.sumber ? (a2.sumber + (a2.produk ? (' - ' + a2.produk) : '')) : (it.sumber_survei_2 || ''),
          harga_survei_2: a2.harga || it.harga_survei_2 || minVal,
          link_survei_2: a2.url || it.link_survei_2 || '',
          sumber_survei_3: a3.sumber ? (a3.sumber + (a3.produk ? (' - ' + a3.produk) : '')) : (it.sumber_survei_3 || ''),
          harga_survei_3: a3.harga || it.harga_survei_3 || minVal,
          link_survei_3: a3.url || it.link_survei_3 || '',
          metode_penentuan_hps: 'Terendah',
          harga_satuan_hps: minVal,
          jumlah_hps: minVal * Number(it.volume || 1),
          evaluasi_pasar_json: {
            alternatifs
          }
        };
      });

      if (updatedItems[0]?.link_survei_1) extraPaketFields.link_produk_katalog_1 = updatedItems[0].link_survei_1;
      if (updatedItems[1]?.link_survei_1) extraPaketFields.link_produk_katalog_2 = updatedItems[1].link_survei_1;

      try {
        await cakraApiPost('/api/cakra/paket/' + paket.id + '/items', { items: updatedItems });
        if (CakraState.activePaketCtx) {
          const freshCtx = await cakraApiGet('/api/cakra/paket/' + paket.id);
          if (freshCtx?.items) {
            CakraState.activePaketCtx.items = freshCtx.items;
          }
        }
      } catch (err) {
        console.warn('Gagal memperbarui item survei:', err);
      }
    }
  } else if (num === 6) {
    extraPaketFields.jenis_kertas_harga = getStr('mu_jenis_kertas_harga') || paket.jenis_kertas_harga;
    extraPaketFields.nilai_hps = getNum('mu_nilai_hps') || paket.nilai_hps;

    // Kumpulkan pembaruan metode dan harga satuan HPS per item dari kalkulator pop-up
    const cards = document.querySelectorAll('.t6-item-card');
    if (cards.length && CakraState.activePaketCtx?.items) {
      const origItems = CakraState.activePaketCtx.items;
      const updatedItems = origItems.map(it => {
        const selMetode = document.getElementById('t6_metode_' + it.id);
        const inpSatuan = document.getElementById('t6_hps_satuan_' + it.id);
        const metode = selMetode ? selMetode.value : (it.metode_penentuan_hps || 'Terendah');
        const hpsSat = inpSatuan ? Number(inpSatuan.value || 0) : Number(it.harga_satuan_hps || 0);
        const vol = Number(it.volume || 1);
        return {
          ...it,
          metode_penentuan_hps: metode,
          harga_satuan_hps: hpsSat,
          jumlah_hps: Math.round(vol * hpsSat)
        };
      });

      try {
        await cakraApiPost('/api/cakra/paket/' + paket.id + '/items', { items: updatedItems });
        if (CakraState.activePaketCtx) {
          const freshCtx = await cakraApiGet('/api/cakra/paket/' + paket.id);
          if (freshCtx?.items) {
            CakraState.activePaketCtx.items = freshCtx.items;
          }
          if (freshCtx?.paket) {
            CakraState.activePaketCtx.paket = freshCtx.paket;
          }
        }
      } catch (err) {
        console.warn('Gagal memperbarui item HPS:', err);
      }
    }
  } else if (num === 7) {
    extraPaketFields.bentuk_kontrak = getStr('mu_bentuk_kontrak') || paket.bentuk_kontrak;
    extraPaketFields.jenis_kontrak = getStr('mu_jenis_kontrak') || paket.jenis_kontrak;
    extraPaketFields.cara_pembayaran = getStr('mu_cara_pembayaran') || paket.cara_pembayaran || 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)';
    const rawUmEl = document.getElementById('mu_persen_uang_muka');
    extraPaketFields.persen_uang_muka = (rawUmEl && rawUmEl.value !== '') ? Math.max(0, Number(rawUmEl.value)) : Number(paket.persen_uang_muka ?? 0);
    extraPaketFields.basis_denda = getStr('mu_basis_denda') || paket.basis_denda || '1 permil per hari dari Harga Kontrak sebelum PPN (DPP)';
    extraPaketFields.ketentuan_garansi = getStr('mu_ketentuan_garansi') || paket.ketentuan_garansi;
    extraPaketFields.penyelesaian_sengketa = getStr('mu_penyelesaian_sengketa') || paket.penyelesaian_sengketa;
    const rawMasaEl = document.getElementById('mu_masa_pelaksanaan_hari');
    if (rawMasaEl && rawMasaEl.value !== '') {
      extraPaketFields.masa_pelaksanaan_hari = Math.max(1, Number(rawMasaEl.value));
    }
    const rawLok = getStr('mu_lokasi_pekerjaan');
    if (rawLok) {
      extraPaketFields.lokasi_pekerjaan = rawLok;
    }
    const rawWajibJam = document.getElementById('mu_wajib_jaminan_pelaksanaan');
    if (rawWajibJam && rawWajibJam.value !== '') {
      extraPaketFields.wajib_jaminan_pelaksanaan = Number(rawWajibJam.value);
    }
  } else if (num === 8) {
    extraPaketFields.pelaksana_pemilihan = getStr('mu_pelaksana_pemilihan') || paket.pelaksana_pemilihan;
  } else if (num === 9) {
    extraPaketFields.penyedia_id = getNum('mu_penyedia_id') || paket.penyedia_id;
    extraPaketFields.nilai_penawaran_awal = getNum('mu_nilai_penawaran_awal') || paket.nilai_penawaran_awal;
    extraPaketFields.nilai_kontrak = getNum('mu_nilai_kontrak') || paket.nilai_kontrak;
  } else if (num === 10) {
    extraPaketFields.bo_nama = getStr('mu_bo_nama') || paket.bo_nama;
  } else if (num === 12) {
    extraPaketFields.nama_bank_penyedia = getStr('mu_nama_bank_penyedia') || paket.nama_bank_penyedia;
    extraPaketFields.no_rekening_penyedia = getStr('mu_no_rekening_penyedia') || paket.no_rekening_penyedia;
  } else if (num === 13) {
    extraPaketFields.no_kontrak = getStr('mu_no_kontrak') || paket.no_kontrak;
    extraPaketFields.nilai_kontrak = getNum('mu_nilai_kontrak_final') || paket.nilai_kontrak;
    extraPaketFields.tgl_mulai_kerja = getStr('mu_tgl_mulai_kerja') || paket.tgl_mulai_kerja;
    extraPaketFields.tgl_selesai_kerja = getStr('mu_tgl_selesai_kerja') || paket.tgl_selesai_kerja;
  } else if (num === 14) {
    extraPaketFields.lokasi_pekerjaan = getStr('mu_lokasi_pekerjaan') || paket.lokasi_pekerjaan;
  } else if (num === 15) {
    extraPaketFields.realisasi_fisik_persen = getNum('mu_realisasi_fisik_persen') || paket.realisasi_fisik_persen;
    extraPaketFields.status_scm = getStr('mu_status_scm') || paket.status_scm;
  } else if (num === 16) {
    extraPaketFields.no_bast = getStr('mu_no_bast') || paket.no_bast;
  } else if (num === 17) {
    extraPaketFields.jenis_pph = getStr('mu_jenis_pph') || paket.jenis_pph;
  } else if (num === 18) {
    extraPaketFields.rating_kinerja_sikap = getStr('mu_rating_kinerja_sikap') || paket.rating_kinerja_sikap;
    extraPaketFields.kode_registrasi_bmn = getStr('mu_kode_registrasi_bmn') || paket.kode_registrasi_bmn;
  }

  const nextStage = Math.min(18, num + 1);
  const targetStageToOpen = isSelesaiAction ? nextStage : num;

  const payload = {
    ...paket,
    ...extraPaketFields,
    stageUpdate: {
      no_tahap: num,
      fase: activeDef.fase || 1,
      nama_tahap: activeDef.nama || ('Tahap ' + num),
      nomor_dokumen: nomorDokumen,
      tanggal_dokumen: tanggalDokumen,
      status_tahap: statusTahap,
      link_drive_dokumen: linkDrive,
      catatan_tahap: catatanTahap
    }
  };

  try {
    await cakraApiPost('/api/cakra/paket', payload);
    closeModalTahapUniversal();
    await initCakraApp();
    await openPaketInCockpit(paket.id, targetStageToOpen, false);
    if (isSelesaiAction) {
      cakraNotify('🎉 Tahap ' + num + ' (' + activeDef.nama + ') Resmi Selesai & Terkunci! Membuka Tahap ' + targetStageToOpen + '.', 'success');
    } else {
      cakraNotify('💾 Draf data Tahap ' + num + ' berhasil disimpan! Seluruh isian tersimpan aman.', 'success');
    }
  } catch (err) {
    cakraNotify('❌ Gagal menyimpan data Tahap ' + num + ': ' + err.message, 'error');
  }
}
window.submitModalTahapUniversal = submitModalTahapUniversal;

async function finishUniversalStageAndAdvance(stageNo) {
  const num = Number(stageNo || CakraState.activeStageNo || 1);
  const paket = (CakraState.activePaketCtx?.paket?.id === CakraState.activePaketId ? CakraState.activePaketCtx.paket : null)
    || (CakraState.pakets || []).find(p => String(p.id) === String(CakraState.activePaketId));
  if (!paket) return;

  const tahaps = CakraState.activePaketCtx?.tahaps || [];
  const activeTRow = tahaps.find(t => Number(t.no_tahap) === num) || {};
  const driveLink = String(activeTRow.link_drive_dokumen || '').trim();

  if (!driveLink || driveLink.length < 10 || !driveLink.startsWith('http')) {
    cakraNotify('⚠️ Tahap ' + num + ' belum dapat diselesaikan! Sesuai SOP & regulasi pengadaan, dokumen fisik hasil cetak wajib ditandatangani dan ditautkan ke Google Drive terlebih dahulu.', 'warning');
    // Buka Pop Up otomatis agar user bisa mengisi link
    openModalTahapUniversal(num);
    const driveInput = document.getElementById('mu_link_drive_dokumen');
    if (driveInput) {
      driveInput.focus();
      driveInput.style.border = '2px solid #ef4444';
      setTimeout(() => { if (driveInput) driveInput.style.border = ''; }, 3000);
    }
    return;
  }

  const nextStage = Math.min(18, num + 1);
  const activeDef = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === num) || { no: num, nama: 'Tahap ' + num, fase: 1 };

  const payload = {
    ...paket,
    stageUpdate: {
      no_tahap: num,
      fase: activeDef.fase || 1,
      nama_tahap: activeDef.nama || ('Tahap ' + num),
      nomor_dokumen: activeTRow.nomor_dokumen || generateAutoStageDocNumber(num, paket.kode_paket_internal, activeTRow.tanggal_dokumen),
      tanggal_dokumen: activeTRow.tanggal_dokumen || '2026-05-18',
      status_tahap: 'Selesai',
      link_drive_dokumen: driveLink,
      catatan_tahap: activeTRow.catatan_tahap || ('Tahap ' + num + ' diselesaikan secara sah')
    }
  };

  try {
    await cakraApiPost('/api/cakra/paket', payload);
    await initCakraApp();
    cakraNotify('🎉 Tahap ' + num + ' (' + activeDef.nama + ') Resmi Selesai! Berkas sah tersimpan di Google Drive. Membuka Tahap ' + nextStage + '.', 'success');
    await openPaketInCockpit(paket.id, nextStage, false);
  } catch (err) {
    cakraNotify('❌ Gagal menyelesaikan tahap: ' + err.message, 'error');
  }
}
window.finishUniversalStageAndAdvance = finishUniversalStageAndAdvance;

// =============================================================================
// HELPER TAHAP 7: SINKRONISASI CARA BAYAR, PRESET UANG MUKA, & LIVE PREVIEW SSKK
// =============================================================================
function onTahap7CaraBayarChange() {
  const cbEl = document.getElementById('mu_cara_pembayaran');
  const umEl = document.getElementById('mu_persen_uang_muka');
  const paket = CakraState.activePaketCtx?.paket || {};
  const hpsBasis = Number(paket.nilai_hps || paket.nilai_pagu || 0);
  const paguBasis = Number(paket.nilai_pagu || 0);
  if (!cbEl || !umEl) return;
  if (String(cbEl.value || '').startsWith('Sekaligus')) {
    umEl.value = 0;
  }
  updateTahap7Preview(hpsBasis, paguBasis);
}
window.onTahap7CaraBayarChange = onTahap7CaraBayarChange;

function setTahap7PresetUangMuka(persenVal, hpsBasis, paguBasis) {
  const umEl = document.getElementById('mu_persen_uang_muka');
  const cbEl = document.getElementById('mu_cara_pembayaran');
  if (umEl) {
    umEl.value = Number(persenVal || 0);
  }
  if (cbEl) {
    if (Number(persenVal || 0) === 0) {
      cbEl.value = 'Sekaligus (100% melalui SPM-LS setelah BAST 100%)';
    } else if (String(cbEl.value || '').startsWith('Sekaligus')) {
      cbEl.value = 'Termin (Bertahap sesuai Capaian Progres Fisik Pekerjaan)';
    }
  }
  updateTahap7Preview(hpsBasis, paguBasis);
}
window.setTahap7PresetUangMuka = setTahap7PresetUangMuka;

function updateTahap7Preview(hpsBasis, paguBasis) {
  const umEl = document.getElementById('mu_persen_uang_muka');
  const box = document.getElementById('t7_uang_muka_info_box');
  if (!umEl || !box) return;
  const persen = Math.max(0, Number(umEl.value || 0));
  const basisNominal = Number(hpsBasis || paguBasis || 0);
  const nominalUm = Math.round((basisNominal * persen) / 100);

  if (persen === 0) {
    box.style.background = '#f0fdf4';
    box.style.border = '1px solid #86efac';
    box.style.color = '#166534';
    box.innerHTML = `✅ <b>SKEMA TANPA UANG MUKA (0% — Rp 0):</b> Pembayaran dilakukan <b>Sekaligus 100%</b> melalui SPM-LS KPPN setelah barang/pekerjaan selesai 100% dan dibuktikan dengan BAST. Penyedia <b>bebas kewajiban menyerahkan Jaminan Uang Muka</b>.`;
  } else {
    let catatanUmk = '';
    if (paguBasis > 50000000 && paguBasis <= 200000000 && persen < 50) {
      catatanUmk = `<br/>🚨 <b>Catatan Regulasi Pasal 29 ayat (2a) huruf b:</b> Untuk Penyedia Usaha Mikro/Kecil dengan nilai kontrak &gt; Rp 50 Juta s.d. Rp 200 Juta yang menggunakan skema Uang Muka, batas minimal regulasi adalah <b>50%</b>.`;
    } else if (paguBasis > 200000000 && paguBasis <= 2500000000 && persen < 30) {
      catatanUmk = `<br/>🚨 <b>Catatan Regulasi Pasal 29 ayat (2a) huruf c:</b> Untuk Penyedia Usaha Mikro/Kecil dengan nilai kontrak &gt; Rp 200 Juta s.d. Rp 2,5 Miliar yang menggunakan skema Uang Muka, batas minimal regulasi adalah <b>30%</b>.`;
    }
    box.style.background = '#fffbeb';
    box.style.border = '1px solid #fde68a';
    box.style.color = '#92400e';
    box.innerHTML = `⚠️ <b>SKEMA DENGAN UANG MUKA (${persen}% — Estimasi ${cakraFmtRp(nominalUm)}):</b> Sesuai Pasal 29 Perpres 46/2025 &amp; PMK Pelaksanaan Anggaran APBN, pencairan Uang Muka <b>wajib didahului Permohonan Tertulis Penyedia + Penyerahan Jaminan Uang Muka (Bank Garansi / Surety Bond) senilai 100% dari Uang Muka (${cakraFmtRp(nominalUm)})</b>.${catatanUmk}`;
  }
}
window.updateTahap7Preview = updateTahap7Preview;




// =============================================================================
// HELPER TAHAP 4: DINAMISASI RINCIAN ITEM KAK & VALIDASI PAGU
// =============================================================================
function tambahItemTahap4() {
  const container = document.getElementById('t4_items_container');
  if (!container) return;
  const count = container.querySelectorAll('.t4-item-card').length;
  const idx = count + 1;
  const div = document.createElement('div');
  div.className = 't4-item-card';
  div.dataset.itemId = 'NEW_' + Date.now();
  div.style.cssText = 'background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:10px; margin-bottom:10px;';
  div.innerHTML = `
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; border-bottom:1px solid #e2e8f0; padding-bottom:6px;">
      <strong style="font-size:12px; color:#0f172a;" class="t4-item-label">Item ${idx}</strong>
      <button type="button" class="btn btn-xs btn-outline-danger" onclick="hapusItemTahap4(this)" style="font-size:10px; padding:2px 6px; border-radius:4px; border:1px solid #fca5a5; background:#fff; color:#dc2626; cursor:pointer;">🗑️ Hapus</button>
    </div>
    <div style="display:grid; grid-template-columns: 2fr 0.8fr 0.8fr 1.4fr 1.2fr; gap:8px; margin-bottom:8px;">
      <div>
        <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Nama / Uraian Kebutuhan Barang *</label>
        <input type="text" class="cakra-form-control t4-item-uraian" value="Item Kebutuhan Baru ${idx}" placeholder="cth: PC Server Tower" style="font-size:11px; font-weight:700;" />
      </div>
      <div>
        <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Volume *</label>
        <input type="number" step="1" min="1" class="cakra-form-control cakra-mono t4-item-vol" value="1" style="font-size:11px; font-weight:700;" oninput="calcTahap4Totals()" />
      </div>
      <div>
        <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Satuan *</label>
        <input type="text" class="cakra-form-control t4-item-satuan" value="Unit" placeholder="Unit/Set" style="font-size:11px;" />
      </div>
      <div>
        <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Pagu Satuan (Rp) *</label>
        <input type="number" class="cakra-form-control cakra-mono t4-item-pagu" value="0" style="font-size:11px; font-weight:700;" oninput="calcTahap4Totals()" />
      </div>
      <div>
        <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Subtotal Pagu (Rp)</label>
        <div class="t4-item-subtotal cakra-mono" style="font-size:11px; font-weight:800; color:#1e40af; padding:5px 8px; background:#eff6ff; border:1px solid #bfdbfe; border-radius:4px; height:28px; line-height:16px;">
          Rp 0
        </div>
      </div>
    </div>
    <div style="margin-bottom:8px;">
      <label style="font-size:10px; font-weight:700; color:#475569; display:block; margin-bottom:2px;">Spesifikasi Teknis Detail KAK *</label>
      <textarea class="cakra-form-control t4-item-spek" rows="2" style="font-size:11px;" placeholder="Cantumkan spesifikasi fungsional terperinci..."></textarea>
    </div>
    <div style="display:grid; grid-template-columns: 1fr 1fr 1.2fr; gap:10px;">
      <div style="display:flex; align-items:center; gap:6px;">
        <label style="font-size:10px; font-weight:700; color:#475569;">Target TKDN:</label>
        <input type="number" class="cakra-form-control cakra-mono t4-item-tkdn" value="40" style="font-size:11px; width:65px;" />
        <span style="font-size:10.5px; font-weight:700; color:#475569;">%</span>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <label style="font-size:10px; font-weight:700; color:#475569;">SAKTI:</label>
        <select class="cakra-form-control t4-item-sakti" style="font-size:11px;">
          <option value="Aset Tetap (BMN)" selected>Aset Tetap (BMN)</option>
          <option value="Persediaan">Persediaan</option>
          <option value="Jasa/Habis Pakai">Jasa/Habis Pakai</option>
        </select>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <label style="font-size:10px; font-weight:700; color:#1e40af;">Alokasi Subbag:</label>
        <select class="cakra-form-control t4-item-subbag" style="font-size:11px; font-weight:700;">
          <option value="KUL" selected>KUL</option>
          <option value="RENDATIN">RENDATIN</option>
          <option value="TEKNIS">TEKNIS</option>
          <option value="HUKUM">HUKUM</option>
          <option value="PARSDM">PARSDM</option>
        </select>
      </div>
    </div>
  `;
  container.appendChild(div);
  calcTahap4Totals();
}
window.tambahItemTahap4 = tambahItemTahap4;

function hapusItemTahap4(btn) {
  const card = btn.closest('.t4-item-card');
  if (!card) return;
  const container = document.getElementById('t4_items_container');
  if (container.querySelectorAll('.t4-item-card').length <= 1) {
    cakraNotify('⚠️ Minimal harus ada 1 item barang dalam paket!', 'warning');
    return;
  }
  card.remove();
  container.querySelectorAll('.t4-item-card').forEach((c, i) => {
    const lbl = c.querySelector('.t4-item-label');
    if (lbl) lbl.textContent = 'Item ' + (i + 1);
  });
  calcTahap4Totals();
}
window.hapusItemTahap4 = hapusItemTahap4;

function calcTahap4Totals() {
  const container = document.getElementById('t4_items_container');
  if (!container) return;
  let total = 0;
  container.querySelectorAll('.t4-item-card').forEach(card => {
    const vol = Number(card.querySelector('.t4-item-vol')?.value || 1);
    const pagu = Number(card.querySelector('.t4-item-pagu')?.value || 0);
    const sub = Math.round(vol * pagu);
    total += sub;
    const subEl = card.querySelector('.t4-item-subtotal');
    if (subEl) subEl.textContent = 'Rp ' + sub.toLocaleString('id-ID');
  });

  const displayEl = document.getElementById('t4_total_pagu_display');
  if (displayEl) displayEl.textContent = 'Rp ' + total.toLocaleString('id-ID');

  const paket = (CakraState.activePaketCtx?.paket?.id === CakraState.activePaketId ? CakraState.activePaketCtx.paket : null)
    || (CakraState.pakets || []).find(p => String(p.id) === String(CakraState.activePaketId)) || {};
  const paguPaket = Number(paket.nilai_pagu || 145000000);
  const diff = paguPaket - total;

  const badgeEl = document.getElementById('t4_pagu_status_badge');
  if (badgeEl) {
    if (diff === 0) {
      badgeEl.innerHTML = '<span class="cakra-badge cakra-badge-green" style="font-size:11px;">✅ Pagu Item Sesuai Pagu Paket (100%)</span>';
    } else if (diff > 0) {
      badgeEl.innerHTML = '<span class="cakra-badge cakra-badge-amber" style="font-size:11px;">⚠️ Sisa Pagu Belum Dialokasikan: Rp ' + diff.toLocaleString('id-ID') + '</span>';
    } else {
      badgeEl.innerHTML = '<span class="cakra-badge cakra-badge-red" style="font-size:11px;">❌ Pagu Item Melebihi Pagu Paket: Rp ' + Math.abs(diff).toLocaleString('id-ID') + '</span>';
    }
  }
}
window.calcTahap4Totals = calcTahap4Totals;

// =============================================================================
// HELPER TAHAP 5: ACCORDION, DINAMISASI ALTERNATIF, CHECKLIST & JUSTIFIKASI PPK
// =============================================================================
function toggleAltCardCollapse(itemId, altIdx) {
  const body = document.getElementById('alt_body_' + itemId + '_v' + altIdx);
  const icon = document.getElementById('alt_icon_' + itemId + '_v' + altIdx);
  if (!body) return;
  const isHidden = body.style.display === 'none';
  body.style.display = isHidden ? 'block' : 'none';
  if (icon) icon.textContent = isHidden ? '▼' : '▶';
}
window.toggleAltCardCollapse = toggleAltCardCollapse;

function updateAltCardHeader(itemId, altIdx) {
  const sumberInp = document.getElementById('mu_item_' + itemId + '_v' + altIdx + '_sumber');
  const prodInp = document.getElementById('mu_item_' + itemId + '_v' + altIdx + '_produk');
  const hrgInp = document.getElementById('mu_item_' + itemId + '_v' + altIdx + '_harga');
  const jnsSel = document.getElementById('mu_item_' + itemId + '_v' + altIdx + '_jenis_sumber');
  const titleEl = document.getElementById('alt_header_title_' + itemId + '_v' + altIdx);

  const jnsVal = jnsSel?.value || '';
  let jnsBadge = '';
  if (jnsVal.includes('Katalog')) jnsBadge = '[E-Katalog v6] ';
  else if (jnsVal.includes('Daring') || jnsVal.includes('Olshop')) jnsBadge = '[Toko Daring (Olshop)] ';
  else if (jnsVal.includes('Offline') || jnsVal.includes('Konvensional')) jnsBadge = '[Penyedia Offline] ';
  else if (jnsVal.includes('Riwayat')) jnsBadge = '[Riwayat Kontrak] ';
  else if (jnsVal.includes('Pabrikan') || jnsVal.includes('SBM')) jnsBadge = '[Daftar Harga / SBM] ';

  const sumber = sumberInp?.value.trim() || ('Penyedia ' + altIdx);
  const prod = prodInp?.value.trim() || 'Produk';
  const hrg = Number(hrgInp?.value || 0).toLocaleString('id-ID');

  if (titleEl) {
    titleEl.textContent = 'Alternatif ' + altIdx + ' ' + jnsBadge + ': ' + sumber + ' — ' + prod + ' (Rp ' + hrg + ')';
  }
}
window.updateAltCardHeader = updateAltCardHeader;

function tambahAlternatifTahap5(itemId) {
  const container = document.getElementById('t5_item_' + itemId + '_alternatifs');
  if (!container) return;
  const count = container.querySelectorAll('.t5-alt-card').length;
  const v = count + 1;

  const div = document.createElement('div');
  div.className = 't5-alt-card';
  div.id = 't5_alt_card_' + itemId + '_v' + v;
  div.dataset.itemId = itemId;
  div.dataset.altIdx = v;
  div.style.cssText = 'background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; margin-bottom:8px; overflow:hidden;';
  div.innerHTML = `
    <div onclick="toggleAltCardCollapse(${itemId}, ${v})" style="background:#f1f5f9; padding:8px 12px; display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none; border-bottom:1px solid #e2e8f0;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span id="alt_icon_${itemId}_v${v}" style="font-size:11px; color:#475569;">▼</span>
        <strong id="alt_header_title_${itemId}_v${v}" style="font-size:12px; color:#0f172a;">
          Alternatif ${v}: Alternatif Baru — Produk Katalog (Rp 0)
        </strong>
      </div>
      <div style="display:flex; align-items:center; gap:8px;" onclick="event.stopPropagation()">
        <span id="badge_item_${itemId}_v${v}" class="cakra-badge cakra-badge-green" style="font-size:10px; padding:2px 8px;">✓ 5/5 Lolos Uji</span>
        <button type="button" class="btn btn-xs" onclick="toggleVendor5Params(${itemId}, ${v}, true)" style="font-size:9.5px; padding:2px 6px; border:1px solid #bbf7d0; background:#f0fdf4; color:#166534; font-weight:700; border-radius:4px; cursor:pointer;" title="Centang 5/5 Lolos">⚡ Centang Semua</button>
        <button type="button" class="btn btn-xs btn-outline-danger" onclick="hapusAlternatifTahap5(${itemId}, ${v})" style="font-size:10px; padding:2px 6px; border-radius:4px; border:1px solid #fca5a5; background:#fff; color:#dc2626; cursor:pointer;" title="Hapus Alternatif Ini">🗑️</button>
      </div>
    </div>
    <div id="alt_body_${itemId}_v${v}" style="display:block; padding:10px 12px;">
      <div style="display:grid; grid-template-columns: 1.2fr 1.3fr 1.3fr 1fr; gap:8px; margin-bottom:8px;">
        <div>
          <label style="font-size:10px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Jenis Sumber Survei Pasar *</label>
          <select id="mu_item_${itemId}_v${v}_jenis_sumber" class="cakra-form-control alt-sel-jenis-sumber" style="font-size:10.5px; font-weight:700;" onchange="updateAltCardHeader(${itemId}, ${v})">
            <option value="Katalog Elektronik (E-Katalog v6)" selected>Katalog Elektronik (E-Katalog v6)</option>
            <option value="Toko Daring / Marketplace (Olshop)">Toko Daring / Marketplace (Olshop)</option>
            <option value="Penyedia / Toko Konvensional (Offline)">Penyedia / Toko Konvensional (Offline)</option>
            <option value="Riwayat Kontrak / Pengadaan Sebelumnya">Riwayat Kontrak / Pengadaan Sebelumnya</option>
            <option value="Daftar Harga Resmi Pabrikan / SBM">Daftar Harga Resmi Pabrikan / SBM</option>
          </select>
        </div>
        <div>
          <label style="font-size:10px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Merek / Tipe / Nama Produk *</label>
          <input type="text" id="mu_item_${itemId}_v${v}_produk" class="cakra-form-control alt-inp-produk" value="" placeholder="cth: Merek & Tipe Produk" style="font-size:11px; font-weight:700;" oninput="updateAltCardHeader(${itemId}, ${v})" />
        </div>
        <div>
          <label style="font-size:10px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Nama Pelaku Usaha / Penyedia / Toko *</label>
          <input type="text" id="mu_item_${itemId}_v${v}_sumber" class="cakra-form-control alt-inp-sumber" value="" placeholder="cth: PT. Nama Vendor / Bhinneka / CV. Toko Ngawi" style="font-size:11px;" oninput="updateAltCardHeader(${itemId}, ${v})" />
        </div>
        <div>
          <label style="font-size:10px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Harga Satuan Survei (Rp) *</label>
          <input type="number" id="mu_item_${itemId}_v${v}_harga" class="cakra-form-control cakra-mono alt-inp-harga" value="0" style="font-size:11px; font-weight:700;" oninput="updateAltCardHeader(${itemId}, ${v})" />
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 2.2fr 0.8fr; gap:10px; margin-bottom:8px;">
        <div>
          <label style="font-size:10px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Tautan Web / Bukti Dokumen Survei Fisik *</label>
          <input type="text" id="mu_item_${itemId}_v${v}_url" class="cakra-form-control cakra-mono alt-inp-url" value="" placeholder="https://... atau No. Surat Penawaran / Toko Fisik / No. Kontrak Lalu" style="font-size:11px;" />
        </div>
        <div>
          <label style="font-size:10.5px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Klaim Capaian TKDN (%)</label>
          <div style="display:flex; align-items:center;">
            <input type="number" step="0.01" id="mu_item_${itemId}_v${v}_tkdn" class="cakra-form-control cakra-mono alt-inp-tkdn" value="40" style="font-size:11px; width:85px;" />
            <span style="font-size:11px; font-weight:700; color:#475569; margin-left:6px;">%</span>
          </div>
        </div>
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1.5fr; gap:10px; margin-bottom:8px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px 10px;">
        <div>
          <label style="font-size:10.5px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">SLA Pengiriman (Hari Kalender)</label>
          <div style="display:flex; align-items:center;">
            <input type="number" id="mu_item_${itemId}_v${v}_sla_hari" class="cakra-form-control cakra-mono alt-inp-sla" value="14" style="font-size:11px; width:80px;" />
            <span style="font-size:10.5px; color:#64748b; margin-left:6px;">Hari sejak Surat Pesanan</span>
          </div>
        </div>
        <div>
          <label style="font-size:10.5px; font-weight:700; color:#334155; margin-bottom:2px; display:block;">Masa Garansi Resmi Pabrikan</label>
          <select id="mu_item_${itemId}_v${v}_garansi" class="cakra-form-control alt-sel-garansi" style="font-size:11px;" onchange="onGaransiChange(${itemId}, ${v})">
            <option value="3 Tahun Onsite Resmi" selected>3 Tahun Onsite Resmi Pabrikan</option>
            <option value="2 Tahun Onsite Resmi">2 Tahun Onsite Resmi Pabrikan</option>
            <option value="1 Tahun Onsite Resmi">1 Tahun Onsite Resmi Pabrikan</option>
            <option value="Tidak Dipersyaratkan (N/A - Bahan Habis Pakai / Jasa)">Tidak Dipersyaratkan (N/A - Bahan Habis Pakai / Jasa)</option>
          </select>
        </div>
      </div>
      <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:8px 10px; font-size:10.5px;">
        <div style="font-weight:700; color:#1e3a8a; margin-bottom:5px; text-transform:uppercase; font-size:9.5px;">
          Pengujian 5 Parameter Kelayakan (Pasal 8 Perlem LKPP No. 2/2026):
        </div>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:6px;">
          <label style="display:flex; align-items:center; cursor:pointer;">
            <input type="checkbox" id="mu_item_${itemId}_v${v}_p1" class="tahap5-param-cb" checked onchange="updateVendorParamBadge(${itemId}, ${v})" style="margin-right:6px;" />
            <span>1. Spek Teknis KAK</span>
          </label>
          <label style="display:flex; align-items:center; cursor:pointer;">
            <input type="checkbox" id="mu_item_${itemId}_v${v}_p2" class="tahap5-param-cb" checked onchange="updateVendorParamBadge(${itemId}, ${v})" style="margin-right:6px;" />
            <span>2. Ketersediaan Stok</span>
          </label>
          <label style="display:flex; align-items:center; cursor:pointer;">
            <input type="checkbox" id="mu_item_${itemId}_v${v}_p3" class="tahap5-param-cb" checked onchange="updateVendorParamBadge(${itemId}, ${v})" style="margin-right:6px;" />
            <span>3. Kewajaran Harga</span>
          </label>
          <label style="display:flex; align-items:center; cursor:pointer;">
            <input type="checkbox" id="mu_item_${itemId}_v${v}_p4" class="tahap5-param-cb" checked onchange="updateVendorParamBadge(${itemId}, ${v})" style="margin-right:6px;" />
            <span>4. SLA Waktu Kirim</span>
          </label>
          <label style="display:flex; align-items:center; cursor:pointer;">
            <input type="checkbox" id="mu_item_${itemId}_v${v}_p5" class="tahap5-param-cb" checked onchange="updateVendorParamBadge(${itemId}, ${v})" style="margin-right:6px;" />
            <span>5. Garansi Resmi Onsite</span>
          </label>
        </div>
      </div>
    </div>
  `;
  container.appendChild(div);
  updateVendorParamBadge(itemId, v);
  cakraNotify('➕ Alternatif ' + v + ' berhasil ditambahkan.', 'info');
}
window.tambahAlternatifTahap5 = tambahAlternatifTahap5;

function hapusAlternatifTahap5(itemId, altIdx) {
  const container = document.getElementById('t5_item_' + itemId + '_alternatifs');
  if (!container) return;
  const cards = container.querySelectorAll('.t5-alt-card');
  if (cards.length <= 1) {
    cakraNotify('⚠️ Minimal harus ada 1 alternatif penyedia untuk pengujian pasar!', 'warning');
    return;
  }
  const targetCard = document.getElementById('t5_alt_card_' + itemId + '_v' + altIdx);
  if (targetCard) targetCard.remove();

  // Renumber remaining cards
  container.querySelectorAll('.t5-alt-card').forEach((card, idx) => {
    const newV = idx + 1;
    card.dataset.altIdx = newV;
    card.id = 't5_alt_card_' + itemId + '_v' + newV;
    const body = card.querySelector('[id^="alt_body_"]');
    if (body) body.id = 'alt_body_' + itemId + '_v' + newV;
    const icon = card.querySelector('[id^="alt_icon_"]');
    if (icon) icon.id = 'alt_icon_' + itemId + '_v' + newV;
    updateAltCardHeader(itemId, newV);
  });
  cakraNotify('🗑️ Alternatif berhasil dihapus.', 'info');
}
window.hapusAlternatifTahap5 = hapusAlternatifTahap5;

function onGaransiChange(itemId, altIdx) {
  const sel = document.getElementById('mu_item_' + itemId + '_v' + altIdx + '_garansi');
  const cb5 = document.getElementById('mu_item_' + itemId + '_v' + altIdx + '_p5');
  if (!sel || !cb5) return;
  if (sel.value.includes('Tidak Dipersyaratkan')) {
    cb5.checked = true;
    cb5.disabled = true;
  } else {
    cb5.disabled = false;
  }
  updateVendorParamBadge(itemId, altIdx);
}
window.onGaransiChange = onGaransiChange;

function toggleChecklistAllTahap5(checked = true) {
  const checkboxes = document.querySelectorAll('.tahap5-param-cb');
  checkboxes.forEach(cb => {
    cb.checked = checked;
  });
  const items = CakraState.activePaketCtx?.items || [];
  items.forEach(it => {
    const cards = document.querySelectorAll('#t5_item_' + it.id + '_alternatifs .t5-alt-card');
    cards.forEach(card => {
      const v = card.dataset.altIdx || 1;
      updateVendorParamBadge(it.id, v);
    });
  });
  if (typeof cakraNotify === 'function') {
    cakraNotify('⚡ Seluruh parameter untuk semua alternatif & barang berhasil dicentang Lolos (5/5)!', 'success');
  }
}
window.toggleChecklistAllTahap5 = toggleChecklistAllTahap5;

function toggleVendor5Params(itemId, vendorIdx, checked = true) {
  for (let p = 1; p <= 5; p++) {
    const cb = document.getElementById('mu_item_' + itemId + '_v' + vendorIdx + '_p' + p);
    if (cb) cb.checked = checked;
  }
  updateVendorParamBadge(itemId, vendorIdx);
  if (typeof cakraNotify === 'function') {
    cakraNotify('✓ Alternatif ' + vendorIdx + ' berhasil di-set 5/5 Lolos Uji.', 'info');
  }
}
window.toggleVendor5Params = toggleVendor5Params;

function updateVendorParamBadge(itemId, vendorIdx) {
  let count = 0;
  for (let p = 1; p <= 5; p++) {
    const cb = document.getElementById('mu_item_' + itemId + '_v' + vendorIdx + '_p' + p);
    if (cb && cb.checked) count++;
  }
  const badge = document.getElementById('badge_item_' + itemId + '_v' + vendorIdx);
  if (!badge) return;
  if (count === 5) {
    badge.className = 'cakra-badge cakra-badge-green';
    badge.innerHTML = '✓ 5/5 Lolos Uji';
    badge.style.background = '#dcfce7';
    badge.style.color = '#15803d';
  } else if (count >= 3) {
    badge.className = 'cakra-badge cakra-badge-amber';
    badge.innerHTML = '⚠️ ' + count + '/5 (Catatan)';
    badge.style.background = '#fef3c7';
    badge.style.color = '#b45309';
  } else {
    badge.className = 'cakra-badge cakra-badge-red';
    badge.innerHTML = '✗ ' + count + '/5 (Gugur)';
    badge.style.background = '#fee2e2';
    badge.style.color = '#b91c1c';
  }
}
window.updateVendorParamBadge = updateVendorParamBadge;

function generateAutoJustifikasiTahap5() {
  const items = CakraState.activePaketCtx?.items || [];
  const paket = (CakraState.activePaketCtx?.paket?.id === CakraState.activePaketId ? CakraState.activePaketCtx.paket : null)
    || (CakraState.pakets || []).find(p => String(p.id) === String(CakraState.activePaketId)) || {};
  
  let totalMin = 0;
  let rincianBarang = [];

  items.forEach((it, idx) => {
    const altCards = document.querySelectorAll('#t5_item_' + it.id + '_alternatifs .t5-alt-card');
    let validPrices = [];
    let altSummary = [];

    altCards.forEach((card, aIdx) => {
      const v = card.dataset.altIdx || (aIdx + 1);
      const hrg = Number(document.getElementById('mu_item_' + it.id + '_v' + v + '_harga')?.value || 0);
      const sumber = document.getElementById('mu_item_' + it.id + '_v' + v + '_sumber')?.value.trim() || ('Alternatif ' + v);
      const prod = document.getElementById('mu_item_' + it.id + '_v' + v + '_produk')?.value.trim() || '';
      let score = 0;
      for (let p = 1; p <= 5; p++) {
        if (document.getElementById('mu_item_' + it.id + '_v' + v + '_p' + p)?.checked) score++;
      }
      if (hrg > 0) validPrices.push(hrg);
      altSummary.push('Alt ' + v + ' [' + sumber + (prod ? ' - ' + prod : '') + ']: Rp ' + hrg.toLocaleString('id-ID') + ' (Skor ' + score + '/5)');
    });

    const minVal = validPrices.length ? Math.min(...validPrices) : Number(it.harga_satuan_hps || 0);
    const totItem = minVal * Number(it.volume || 1);
    totalMin += totItem;

    rincianBarang.push('Item ' + (idx + 1) + ' [' + it.uraian_item + ' - Vol ' + it.volume + ' ' + it.satuan + ']: ' + altSummary.join(', ') + ' dengan harga pasar terendah Rp ' + minVal.toLocaleString('id-ID'));
  });

  const pagu = Number(paket.nilai_pagu || 145000000);
  const efisiensi = Math.max(0, pagu - totalMin);

  const narasi = 'Berdasarkan analisa pasar komparatif dan pengujian kelayakan 5 parameter (Pasal 8 Peraturan LKPP No. 2 Tahun 2026 jo. Kepka LKPP No. 177/2024), PPK mencatat hasil telaah pasar: ' + rincianBarang.join('; ') + '. Seluruh alternatif produk yang tayang telah diverifikasi atas spesifikasi teknis KAK, ketersediaan pasokan distributor, kewajaran harga di bawah Pagu DIPA (potensi efisiensi Rp ' + efisiensi.toLocaleString('id-ID') + '), kesanggupan SLA waktu kirim, dan jaminan garansi resmi pabrikan. Selanjutnya, PPK menyerahkan mandat operasional pelaksanaan transaksi, klarifikasi/negosiasi harga, dan penerbitan Surat Pesanan (baik Skenario Penyedia Tunggal maupun Multi-Order terpisah per item) sepenuhnya kepada Pejabat Pengadaan (PP) sesuai wewenang Pasal 12 ayat (1) huruf a Perpres No. 16/2018 jo. Perpres No. 46/2025.';

  const textarea = document.getElementById('mu_alasan_penilaian_ppk_katalog');
  if (textarea) {
    textarea.value = narasi;
    cakraNotify('⚡ Narasi Justifikasi Formal PPK berbasis hasil uji objektif berhasil disusun otomatis!', 'success');
  }
}
window.generateAutoJustifikasiTahap5 = generateAutoJustifikasiTahap5;

// =========================================================================
// HELPER INTERAKTIF TAHAP 6: KALKULATOR PENETAPAN HPS PER ITEM
// =========================================================================
function onTahap6MetodeChange(itemId) {
  const card = document.querySelector('.t6-item-card[data-item-id="' + itemId + '"]');
  if (!card) return;
  const metodeSel = document.getElementById('t6_metode_' + itemId);
  const inpSatuan = document.getElementById('t6_hps_satuan_' + itemId);
  if (!metodeSel || !inpSatuan) return;

  const s1 = Number(card.dataset.s1 || 0);
  const s2 = Number(card.dataset.s2 || 0);
  const s3 = Number(card.dataset.s3 || 0);
  const candidates = [s1, s2, s3].filter(v => v > 0);
  const minS = candidates.length ? Math.min(...candidates) : 0;
  const avgS = candidates.length ? Math.round(candidates.reduce((a, b) => a + b, 0) / candidates.length) : 0;

  const val = metodeSel.value;
  if (val === 'Terendah') {
    inpSatuan.value = minS;
  } else if (val === 'Rata-rata') {
    inpSatuan.value = avgS;
  } else if (val === 'Sumber 1 (Katalog)') {
    inpSatuan.value = s1;
  } else if (val === 'Sumber 2 (Toko/Pasar)') {
    inpSatuan.value = s2;
  } else if (val === 'Sumber 3 (SBM/Riwayat)') {
    inpSatuan.value = s3;
  }

  recalcTahap6Hps();
}
window.onTahap6MetodeChange = onTahap6MetodeChange;

function onTahap6HargaManualInput(itemId) {
  const metodeSel = document.getElementById('t6_metode_' + itemId);
  if (metodeSel && metodeSel.value !== 'Manual Input') {
    metodeSel.value = 'Manual Input';
  }
  recalcTahap6Hps();
}
window.onTahap6HargaManualInput = onTahap6HargaManualInput;

function recalcTahap6Hps() {
  const cards = document.querySelectorAll('.t6-item-card');
  let grandTotalHps = 0;

  cards.forEach(card => {
    const itemId = card.dataset.itemId;
    const vol = Number(card.dataset.volume || 1);
    const inp = document.getElementById('t6_hps_satuan_' + itemId);
    const hrgSatuan = inp ? Number(inp.value || 0) : 0;
    const subtotal = vol * hrgSatuan;
    grandTotalHps += subtotal;

    const subLabel = document.getElementById('t6_subtotal_label_' + itemId);
    if (subLabel) {
      subLabel.textContent = cakraFmtRp(subtotal);
    }
  });

  const hiddenHps = document.getElementById('mu_nilai_hps');
  if (hiddenHps) hiddenHps.value = grandTotalHps;

  const totLabel = document.getElementById('t6_total_hps_label');
  if (totLabel) totLabel.textContent = cakraFmtRp(grandTotalHps);

  const paket = (CakraState.activePaketCtx?.paket?.id === CakraState.activePaketId ? CakraState.activePaketCtx.paket : null)
    || (CakraState.pakets || []).find(p => String(p.id) === String(CakraState.activePaketId)) || {};
  const pagu = Number(paket.nilai_pagu || 0);
  const selisih = pagu - grandTotalHps;
  const persen = pagu > 0 ? (selisih / pagu) * 100 : 0;

  const selisihLabel = document.getElementById('t6_selisih_efisiensi_label');
  if (selisihLabel) selisihLabel.textContent = cakraFmtRp(selisih);

  const badgeEfisiensi = document.getElementById('t6_persen_efisiensi_badge');
  if (badgeEfisiensi) {
    if (selisih >= 0) {
      badgeEfisiensi.className = 'cakra-badge cakra-badge-success';
      badgeEfisiensi.textContent = 'Efisiensi: ' + persen.toFixed(2) + '% (' + cakraFmtRp(selisih) + ')';
    } else {
      badgeEfisiensi.className = 'cakra-badge cakra-badge-danger';
      badgeEfisiensi.textContent = 'Defisit: ' + persen.toFixed(2) + '% (' + cakraFmtRp(Math.abs(selisih)) + ')';
    }
  }

  const valBox = document.getElementById('t6_status_validasi_pagu');
  if (valBox) {
    if (grandTotalHps > pagu && pagu > 0) {
      valBox.style.background = '#fef2f2';
      valBox.style.border = '1px solid #f87171';
      valBox.style.color = '#991b1b';
      valBox.innerHTML = '⚠️ <b>PERINGATAN PELANGGARAN REGULASI (PASAL 26 AYAT 3 PERPRES 16/2018 JO 46/2025):</b><br/>Total HPS (<b>' + cakraFmtRp(grandTotalHps) + '</b>) MELEBIHI Pagu DIPA (<b>' + cakraFmtRp(pagu) + '</b>) sebesar <b>' + cakraFmtRp(Math.abs(selisih)) + '</b>. PPK dilarang menetapkan HPS di atas pagu. Mohon sesuaikan harga satuan atau efisiensi volume.';
    } else {
      valBox.style.background = '#ecfdf5';
      valBox.style.border = '1px solid #a7f3d0';
      valBox.style.color = '#065f46';
      valBox.innerHTML = '✅ <b>MEMENUHI KETENTUAN PENGADAAN (PASAL 26 AYAT 3 PERPRES 16/2018 JO 46/2025):</b><br/>Total HPS berada di bawah batas tertinggi Pagu Anggaran DIPA. Rincian penetapan harga memenuhi tata kelola pengadaan dan siap disahkan oleh PPK.';
    }
  }
}
window.recalcTahap6Hps = recalcTahap6Hps;
