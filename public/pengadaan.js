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
    if (CakraState.explicitCockpitOpen) {
      CakraState.explicitCockpitOpen = false;
      showCockpitWorkspace();
      if (CakraState.activePaketId && CakraState.activePaketId !== 'NEW') {
        await openPaketInCockpit(CakraState.activePaketId, CakraState.activeStageNo || 1, false);
      }
    } else if (CakraState.activePaketId && CakraState.activePaketId !== 'NEW') {
      showCockpitWorkspace();
      await openPaketInCockpit(CakraState.activePaketId, CakraState.activeStageNo || 1, false);
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
          <div style="color:#1d4ed8;">HPS/Ref: ${cakraFmtRp(p.nilai_hps)}</div>
          <div style="color:#047857; font-weight:800;">Kontrak: ${cakraFmtRp(p.nilai_kontrak)}</div>
        </td>
        <td>
          <div style="font-weight:700; font-size:11.5px;">${cakraEsc(p.nama_penyedia || p.nama_perusahaan || '-')}</div>
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
      <button type="button" class="btn btn-xs" onclick="exitCockpitToLanding()" style="background:#334155; color:#fff; font-weight:800; border:1px solid #64748b; padding:6px 12px; border-radius:6px; cursor:pointer; display:flex; align-items:center; gap:6px;" title="Kembali ke Meja Pengadaan & Daftar Paket Belum Selesai">
        <span>⬅️ Meja Pengadaan</span>
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
      <div>${cakraEsc(paket.jenis_kertas_harga || 'HPS')}: <strong class="cakra-mono" style="color:#93c5fd;">${cakraFmtRp(paket.nilai_hps)}</strong></div>
      <div>Kontrak: <strong class="cakra-mono" style="color:#6ee7b7;">${cakraFmtRp(paket.nilai_kontrak)}</strong></div>
      <div>SP2D Netto: <strong class="cakra-mono" style="color:#fde047;">${cakraFmtRp(keuangan?.nilaiBersihDiterimaPenyedia || 0)}</strong></div>
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
  return `${noUrut}/${kodeTahap}/${cleanKodePaket}/PPK-PBJ/KPU-NGW/${romawi}/${yyyy}`;
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
      <!-- Quick Save Action -->
      <button type="button" class="cakra-btn cakra-btn-warning cakra-btn-sm" onclick="saveDraftQuickly()" style="font-weight:800; background:#f59e0b; color:#fff; border:none; padding:5px 12px; border-radius:5px; box-shadow:0 1px 2px rgba(245,158,11,0.25); display:flex; align-items:center; gap:5px;" title="Simpan perubahan draf ke database (Ctrl + S)">
        <span>💾</span> <span>Simpan Draf</span>
      </button>

      <!-- Primary Action: Word Tahap N -->
      <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="queuePengadaanDownload('docx', ${paket.id}, '${stageNo}')" style="font-weight:700; display:flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(37,99,235,0.2);" title="Kirim Naskah Word Tahap ${stageNo} ke Monitoring Unduhan">
        <span>📄</span> <span>Word Tahap ${stageNo} (.docx)</span>
      </button>

      <!-- Secondary Action: Excel Tahap N (Hanya jika tahap bukan 1) -->
      ${stageNo !== 1 ? `
        <button type="button" class="cakra-btn cakra-btn-success cakra-btn-sm" onclick="queuePengadaanDownload('xlsx', ${paket.id}, '${stageNo}')" style="font-weight:700; display:flex; align-items:center; gap:6px;" title="Kirim Kertas Kerja Excel Tahap ${stageNo} ke Monitoring Unduhan">
          <span>📊</span> <span>Excel Tahap ${stageNo} (.xlsx)</span>
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

  const totalPagu = pakets.reduce((s, p) => s + (Number(p.nilai_pagu) || 0), 0);
  const paguBerjalan = berjalanPakets.reduce((s, p) => s + (Number(p.nilai_pagu) || 0), 0);
  const hpsBerjalan = berjalanPakets.reduce((s, p) => s + (Number(p.nilai_hps) || 0), 0);

  const paguSelesai = selesaiPakets.reduce((s, p) => s + (Number(p.nilai_pagu) || 0), 0);
  const kontrakSelesai = selesaiPakets.reduce((s, p) => s + (Number(p.nilai_kontrak) || 0), 0);
  const efisiensiSelesai = Math.max(0, paguSelesai - kontrakSelesai);
  const persenEfisiensiSelesai = paguSelesai > 0 ? ((efisiensiSelesai / paguSelesai) * 100).toFixed(2) : '0.00';

  const totalHps = pakets.reduce((s, p) => s + (Number(p.nilai_hps) || 0), 0);
  const totalKontrak = pakets.reduce((s, p) => s + (Number(p.nilai_kontrak) || 0), 0);
  const totalEfisiensi = Math.max(0, totalPagu - totalKontrak);
  const persenEfisiensi = totalPagu > 0 ? ((totalEfisiensi / totalPagu) * 100).toFixed(2) : '0.00';

  const umkPakets = pakets.filter(p => {
    const kual = String(p.kualifikasi_usaha || p.peruntukan_usaha || 'Kecil').toLowerCase();
    return kual.includes('kecil') || kual.includes('mikro') || kual.includes('koperasi') || Number(p.is_umk ?? 1) === 1;
  });
  const nilaiUmk = umkPakets.reduce((s, p) => s + (Number(p.nilai_kontrak || p.nilai_pagu) || 0), 0);
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
      const hps = Number(p.nilai_hps) || 0;
      const tAktif = Number(p.tahap_aktif || 1);
      const def = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === tAktif) || {};
      const stageName = def.nama || ('Tahap ' + tAktif);
      const cDone = Number(p.count_selesai || 0);
      const cDraft = Number(p.count_draft || 0);
      const cBypass = Number(p.count_bypass || 0);

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
          <td class="cakra-mono" style="text-align:right; color:#1d4ed8;">${cakraFmtRp(hps)}</td>
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
                <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#1d4ed8;">${cakraFmtRp(hpsBerjalan)}</td>
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
      const hps = Number(p.nilai_hps) || 0;
      const kontrak = Number(p.nilai_kontrak) || 0;
      const ef = Math.max(0, pagu - kontrak);
      const efPct = pagu > 0 ? ((ef / pagu) * 100).toFixed(1) : '0.0';
      const tkdn = Number(p.komitmen_tkdn_persen) || 40;
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
          <td class="cakra-mono" style="text-align:right;">${cakraFmtRp(pagu)}</td>
          <td class="cakra-mono" style="text-align:right; color:#1d4ed8;">${cakraFmtRp(hps)}</td>
          <td class="cakra-mono" style="text-align:right; font-weight:800; color:#047857;">${cakraFmtRp(kontrak)}</td>
          <td class="cakra-mono" style="text-align:right; color:#b45309;">
            ${cakraFmtRp(ef)}
            <div style="font-size:10px; color:#64748b;">(${efPct}%)</div>
          </td>
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
      <div style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
        <div style="font-weight:800; font-size:13.5px; color:#0f172a;">📊 Matriks Rekap Eksekutif Paket Pengadaan (Pagu, HPS, Kontrak, Efisiensi, UMK &amp; TKDN)</div>
        <span style="font-size:11.5px; color:#64748b;">Menampilkan ${pakets.length} Paket</span>
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
              <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#1d4ed8;">${cakraFmtRp(totalHps)}</td>
              <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#047857;">${cakraFmtRp(totalKontrak)}</td>
              <td class="cakra-mono" style="text-align:right; padding:10px 12px; color:#b45309;">${cakraFmtRp(totalEfisiensi)} (${persenEfisiensi}%)</td>
              <td colspan="2" style="text-align:center; padding:10px 12px;">Rata-rata TKDN: ${rataTkdn}%</td>
            </tr>
          </tfoot>
        </table>
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
      groups[key].hps += Number(p.nilai_hps) || 0;
      groups[key].kontrak += Number(p.nilai_kontrak) || 0;
    });
    const list = Object.values(groups);
    const rowsHtml = list.map((g, idx) => {
      const ef = Math.max(0, g.pagu - g.kontrak);
      const porsi = totalKontrak > 0 ? ((g.kontrak / totalKontrak) * 100).toFixed(1) : '0.0';
      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td><span class="cakra-badge ${getBadgeClassByJenis(g.jenis)}">${cakraEsc(g.jenis)}</span></td>
          <td><strong>${cakraEsc(g.metode)}</strong></td>
          <td><span class="cakra-badge cakra-badge-amber">${cakraEsc(g.bentuk)}</span></td>
          <td>${cakraEsc(g.pelaksana)}</td>
          <td class="cakra-mono" style="text-align:center; font-weight:800;">${g.count} Paket</td>
          <td class="cakra-mono" style="text-align:right;">${cakraFmtRp(g.pagu)}</td>
          <td class="cakra-mono" style="text-align:right; font-weight:800; color:#047857;">${cakraFmtRp(g.kontrak)}</td>
          <td class="cakra-mono" style="text-align:right; color:#b45309;">${cakraFmtRp(ef)}</td>
          <td class="cakra-mono" style="text-align:center; font-weight:700;">${porsi}%</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:10px; font-weight:800; font-size:13.5px; color:#0f172a;">📦 Rekapitulasi Berdasarkan Jenis Pengadaan, Metode Pemilihan &amp; Bentuk Kontrak (Perpres 46/2025 &amp; Perlem 3/2026)</div>
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
        </table>
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
      const hps = items.reduce((s, p) => s + (Number(p.nilai_hps) || 0), 0);
      const kontrak = items.reduce((s, p) => s + (Number(p.nilai_kontrak) || 0), 0);
      const ef = Math.max(0, pagu - kontrak);
      const selesai = items.filter(p => Number(p.tahap_aktif) >= 16).length;
      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td><strong>${cakraEsc(sb.code)}</strong></td>
          <td>${cakraEsc(sb.name)}</td>
          <td class="cakra-mono" style="text-align:center; font-weight:800;">${items.length} Paket</td>
          <td class="cakra-mono" style="text-align:right;">${cakraFmtRp(pagu)}</td>
          <td class="cakra-mono" style="text-align:right; color:#1d4ed8;">${cakraFmtRp(hps)}</td>
          <td class="cakra-mono" style="text-align:right; font-weight:800; color:#047857;">${cakraFmtRp(kontrak)}</td>
          <td class="cakra-mono" style="text-align:right; color:#b45309;">${cakraFmtRp(ef)}</td>
          <td class="cakra-mono" style="text-align:center;"><span class="cakra-badge cakra-badge-green">${selesai} / ${items.length} BAST</span></td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:10px; font-weight:800; font-size:13.5px; color:#0f172a;">🏛️ Rekapitulasi Paket Pengadaan Per Subbagian Pengusul (PIC Teknis)</div>
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
        </table>
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
      groups[mak].kontrak += Number(p.nilai_kontrak) || 0;
    });
    const list = Object.values(groups).sort((a, b) => a.mak.localeCompare(b.mak));
    const rowsHtml = list.map((g, idx) => {
      const ef = Math.max(0, g.pagu - g.kontrak);
      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td><span class="cakra-badge cakra-badge-blue cakra-mono" style="font-size:12px;">${cakraEsc(g.mak)}</span></td>
          <td><strong>${cakraEsc(g.uraian)}</strong></td>
          <td class="cakra-mono" style="text-align:center; font-weight:800;">${g.count} Paket</td>
          <td class="cakra-mono" style="text-align:right;">${cakraFmtRp(g.pagu)}</td>
          <td class="cakra-mono" style="text-align:right; font-weight:800; color:#047857;">${cakraFmtRp(g.kontrak)}</td>
          <td class="cakra-mono" style="text-align:right; color:#b45309;">${cakraFmtRp(ef)}</td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:10px; font-weight:800; font-size:13.5px; color:#0f172a;">💳 Rekapitulasi Pengadaan Berdasarkan Kode Akun Belanja (Bagan Akun Standar / MAK 6 Digit)</div>
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
        </table>
      </div>
    `;
  } else if (tab === 'KONTRAK_BAST') {
    const rowsHtml = pakets.map((p, idx) => {
      const kontrak = Number(p.nilai_kontrak) || 0;
      const dpp = Math.round(kontrak * (100 / 111));
      const ppn = Math.max(0, kontrak - dpp);
      const isKonst = String(p.jenis_pengadaan || '').includes('Konstruksi');
      const pphLabel = isKonst ? 'PPh Final 4(2) (1,75%)' : (String(p.jenis_pengadaan || '').includes('Jasa') ? 'PPh 23 (2%)' : 'PPh 22 (1,5%)');
      const pphRate = isKonst ? 0.0175 : (String(p.jenis_pengadaan || '').includes('Jasa') ? 0.02 : 0.015);
      const pphNom = Math.round(dpp * pphRate);
      const nettoSp2d = Math.max(0, kontrak - ppn - pphNom);

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>
            <div style="font-weight:700; color:#0f172a;">${cakraEsc(p.nama_paket)}</div>
            <div class="cakra-mono" style="font-size:11px; color:#64748b;">${cakraEsc(p.kode_paket_internal)} | MAK ${cakraEsc(p.kode_akun_mak)}</div>
          </td>
          <td>
            <div style="font-weight:700;">${cakraEsc(p.nama_penyedia || p.nama_perusahaan || '-')}</div>
            <span class="cakra-badge cakra-badge-amber" style="margin-top:2px;">${cakraEsc(p.bentuk_kontrak)}</span>
          </td>
          <td class="cakra-mono" style="text-align:right; font-weight:800;">${cakraFmtRp(kontrak)}</td>
          <td class="cakra-mono" style="text-align:right;">${cakraFmtRp(dpp)}</td>
          <td class="cakra-mono" style="text-align:right; color:#b45309;">${cakraFmtRp(ppn)}</td>
          <td class="cakra-mono" style="text-align:right; color:#991b1b;">
            ${cakraFmtRp(pphNom)}
            <div style="font-size:10px; color:#64748b;">${pphLabel}</div>
          </td>
          <td class="cakra-mono" style="text-align:right; font-weight:800; color:#047857;">${cakraFmtRp(nettoSp2d)}</td>
          <td style="text-align:center;">
            <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="openPaketInCockpit(${p.id}, 17, true)">💳 Kokpit Tahap 17</button>
          </td>
        </tr>
      `;
    }).join('');

    container.innerHTML = `
      <div style="margin-bottom:10px; font-weight:800; font-size:13.5px; color:#0f172a;">📑 Rekapitulasi Kontrak, BAST, Simulasi Pajak (PPN &amp; PPh) &amp; Nilai Bersih Siap Bayar (Hilir ke Bendahara/PPSPM)</div>
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
        </table>
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
          nama: 'Penyusunan RUP & Pengumuman SiRUP',
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

function buildCockpitPhaseWorkspaceHtml(faseNum) {
  const { paket, rekomendasi, tahaps, items } = CakraState.activePaketCtx;
  const stageNo = Number(CakraState.activeStageNo || 1);
  const faseCfg = FASE_PBJ_CONFIG.find(f => f.fase === Number(faseNum)) || FASE_PBJ_CONFIG[0];
  const tahapMap = {};
  (tahaps || []).forEach(t => { tahapMap[t.no_tahap] = t; });

  const activeStageDef = (CakraState.definisi18Tahap || []).find(d => Number(d.no) === stageNo) || { no: stageNo, nama: `Tahap ${stageNo}` };
  const activeTRow = tahapMap[stageNo] || {};

  // Mini stepper redundant dihilangkan demi menjaga area kerja tenang (Zen Focus)
  const miniStepperHtml = '';

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

  // Active Stage Form Content
  let stageFormHtml = '';

  if (stageNo === 1) {
    // TAHAP 1: IDENTIFIKASI KEBUTUHAN (FORM MATI RESMI - SESUAI ARAHAN MAS EMENJE)
    const isModalMak = String(paket.kode_akun_mak || '').startsWith('53') || paket.bmn_kategori_telaah === 'MODAL';
    const driveLink = String(activeTRow.link_drive_dokumen || '').trim();
    const hasDrive = driveLink.length > 5;
    const isDone = activeTRow.status_tahap === 'Selesai' || (hasDrive && activeTRow.status_tahap !== 'Bypass');

    stageFormHtml = `
      <!-- 1. RESUME RESMI DOKUMEN IDENTIFIKASI KEBUTUHAN (FORM MATI) -->
      <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:10px; box-shadow:0 1px 3px rgba(0,0,0,0.05); overflow:hidden; margin-bottom:18px;">
        <!-- HEADER FORM MATI -->
        <div style="background:linear-gradient(135deg, #1e293b 0%, #334155 100%); color:#ffffff; padding:12px 18px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <div style="font-size:10.5px; font-weight:700; letter-spacing:0.5px; color:#93c5fd; text-transform:uppercase;">
              DOKUMEN RESMI TAHAP 1 &bull; FORM MATI (NON-EDITABLE RESUME)
            </div>
            <div style="font-size:15px; font-weight:800; color:#ffffff; margin-top:2px; display:flex; align-items:center; gap:8px;">
              <span>📋 Identifikasi Kebutuhan &amp; Penetapan Anggaran</span>
              <span class="cakra-badge ${isDone ? 'cakra-badge-green' : 'cakra-badge-amber'}" style="font-size:11px;">
                ${isDone ? '✅ Selesai (Berkas Sah Terhubung)' : '📝 Draf / Sedang Berjalan'}
              </span>
            </div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button type="button" class="cakra-btn cakra-btn-warning cakra-btn-sm" onclick="openModalTahap1Input(${paket.id})" style="font-weight:800; background:#f59e0b; color:#fff; border:none; padding:6px 14px; border-radius:6px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 2px 4px rgba(245,158,11,0.3); cursor:pointer;">
              <span>✏️ Edit Data Tahap 1</span>
            </button>
          </div>
        </div>

        <!-- ISI FORM MATI: RESUME TERTATA RAPI SEPERTI DOKUMEN DINAS -->
        <div style="padding:18px; display:flex; flex-direction:column; gap:14px; background:#ffffff;">
          <!-- BARIS 1: IDENTITAS DOKUMEN & NASKAH DINAS PENGUSUL -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:12px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px;">
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Nomor Dokumen Tahap 1 (IDK)</div>
              <div style="font-size:12px; font-weight:800; color:#0f172a; margin-top:2px;" class="cakra-mono">${cakraEsc(activeTRow.nomor_dokumen || '-')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Tgl Dokumen: <strong>${cakraEsc(activeTRow.tanggal_dokumen || '-')}</strong></div>
            </div>
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Subbag Pemohon &amp; PIC</div>
              <div style="font-size:12.5px; font-weight:800; color:#1e40af; margin-top:2px;">Subbagian ${cakraEsc(paket.pic_subbag || 'KUL')}</div>
              <div style="font-size:11px; color:#475569; margin-top:2px;">Kode Paket: <strong class="cakra-mono">${cakraEsc(paket.kode_paket_internal || '-')}</strong></div>
            </div>
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Nota Dinas Pengusulan</div>
              <div style="font-size:12px; font-weight:700; color:#0f172a; margin-top:2px;" class="cakra-mono">${cakraEsc(paket.no_nota_dinas_pengusul || 'Belum diisi')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Tgl: ${cakraEsc(paket.tgl_nota_dinas_pengusul || '-')} | Perihal: ${cakraEsc(paket.perihal_nota_dinas || '-')}</div>
            </div>
            <div>
              <div style="font-size:10.5px; font-weight:700; color:#64748b; text-transform:uppercase;">Disposisi KPA (Sekretaris)</div>
              <div style="font-size:12px; font-weight:700; color:#0f172a; margin-top:2px;" class="cakra-mono">${cakraEsc(paket.no_disposisi_kpa || 'Belum diisi')}</div>
              <div style="font-size:11px; color:#64748b; margin-top:2px;">Tgl Disposisi: ${cakraEsc(paket.tgl_disposisi_kpa || '-')}</div>
            </div>
          </div>

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
        </div>
      </div>

      <!-- 2. ALUR PENGESAHAN BERKAS & PENYELESAIAN TAHAP 1 -->
      <div style="background:#ffffff; border:1.5px solid ${isDone ? '#10b981' : '#3b82f6'}; border-radius:10px; padding:16px 20px; box-shadow:0 2px 6px rgba(0,0,0,0.06); margin-bottom:16px;">
        <div style="font-size:13.5px; font-weight:800; color:#0f172a; margin-bottom:12px; display:flex; align-items:center; gap:8px;">
          <span style="background:${isDone ? '#10b981' : '#2563eb'}; color:#fff; width:24px; height:24px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:12px;">
            ${isDone ? '✓' : '⚡'}
          </span>
          <span>Alur Pengesahan Berkas &amp; Penyelesaian Tahap 1</span>
          ${isDone ? '<span class="cakra-badge cakra-badge-green" style="font-size:11px;">TAHAP 1 RESMI SELESAI</span>' : ''}
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1.6fr; gap:14px; align-items:start;">
          <!-- LANGKAH 1: UNDUH BERKAS WORD UNTUK TTD -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:12px 14px;">
            <div style="font-size:11.5px; font-weight:800; color:#1e293b; margin-bottom:4px;">
              1. Unduh Berkas Word untuk TTD
            </div>
            <div style="font-size:11px; color:#64748b; line-height:1.45; margin-bottom:10px;">
              Unduh naskah resmi ini, cetak, lalu mintakan tanda tangan basah atau TTE (Kasubbag Pengusul, PPK, dan Sekretaris/KPA).
            </div>
            <button type="button" class="cakra-btn cakra-btn-primary" onclick="queuePengadaanDownload('docx', ${paket.id}, 1)" style="font-weight:800; width:100%; justify-content:center; gap:6px; padding:7px 12px; border-radius:6px; font-size:12px; box-shadow:0 2px 4px rgba(37,99,235,0.25);">
              <span>📄 Unduh Dokumen Word (.docx) Tahap 1</span>
            </button>
          </div>

          <!-- LANGKAH 2: UNGGAH KE DRIVE & TEMPEL LINK -->
          <div style="background:#f0fdf4; border:1px solid #86efac; border-radius:8px; padding:12px 14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <div style="font-size:11.5px; font-weight:800; color:#166534;">
                2. Tempel Tautan Google Drive Dokumen Sah Bertandatangan
              </div>
              ${hasDrive ? '<span style="font-size:10.5px; font-weight:700; color:#15803d;">✅ Terhubung</span>' : '<span style="font-size:10.5px; font-weight:700; color:#b45309;">⚠️ Wajib Diisi</span>'}
            </div>
            <div style="font-size:11px; color:#15803d; line-height:1.45; margin-bottom:8px;">
              Pindai (scan) naskah bertandatangan menjadi PDF, unggah ke Google Drive satker, lalu tempel tautannya:
            </div>
            <div style="display:flex; gap:6px;">
              <input type="url" id="cf_link_drive_dokumen" class="cakra-form-control" value="${cakraEsc(driveLink)}" oninput="onTahap1DriveLinkChange(this.value)" placeholder="https://drive.google.com/file/d/..." style="font-size:11.5px; flex:1;" />
              <a id="btn-preview-drive-dock" href="${cakraEsc(driveLink || '#')}" target="_blank" rel="noopener noreferrer" class="cakra-btn cakra-btn-success cakra-btn-sm" style="font-weight:700; text-decoration:none; display:${hasDrive ? 'inline-flex' : 'none'}; align-items:center; gap:4px; white-space:nowrap; font-size:11px;">
                🔗 Buka Drive
              </a>
            </div>
          </div>
        </div>

        <!-- LANGKAH 3: TOMBOL SELESAI AKTIF / TERKUNCI -->
        <div style="margin-top:14px; padding-top:12px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div id="status-note-tahap1-dock" style="font-size:11.5px; color:${hasDrive ? '#047857' : '#94a3b8'};">
            ${hasDrive
              ? '<span style="color:#047857; font-weight:700;">✅ Tautan Google Drive Terhubung.</span> Dokumen siap disahkan dan diselesaikan.'
              : '<em>🔒 Tombol Selesai Terkunci: Lengkapi pengunduhan, tanda tangan, dan tautan Google Drive di Langkah 2 terlebih dahulu.</em>'
            }
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <button type="button" id="btn-finish-tahap1-dock" class="cakra-btn ${hasDrive ? 'cakra-btn-success' : 'cakra-btn-secondary'}" onclick="finishTahap1AndAdvance()" ${hasDrive ? '' : 'disabled'} style="font-weight:800; font-size:12.5px; background:${hasDrive ? '#10b981' : '#e2e8f0'}; color:${hasDrive ? '#fff' : '#94a3b8'}; border:none; padding:7px 18px; border-radius:6px; cursor:${hasDrive ? 'pointer' : 'not-allowed'}; box-shadow:${hasDrive ? '0 3px 8px rgba(16,185,129,0.35)' : 'none'}; display:inline-flex; align-items:center; gap:6px;">
              <span>${hasDrive ? '✅ Selesaikan Tahap 1 &amp; Lanjut ke Tahap 2 ➔' : '🔒 Selesaikan Tahap 1 (Terkunci)'}</span>
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (stageNo === 2) {
    // TAHAP 2: PENETAPAN JENIS, CARA PENGADAAN & PEMAKETAN
    const jenisPengadaanList = ['Barang', 'Jasa Lainnya', 'Jasa Konsultansi Nonkonstruksi', 'Pekerjaan Konstruksi', 'Jasa Konsultansi Konstruksi', 'Pekerjaan Konstruksi Terintegrasi Rancang dan Bangun', 'Swakelola', 'Dikecualikan'];
    const caraPengadaanList = ['Penyedia', 'Swakelola Tipe I', 'Swakelola Tipe II', 'Swakelola Tipe III', 'Swakelola Tipe IV'];
    const metodePemilihanList = ['E-Purchasing', 'Pengadaan Langsung', 'Penunjukan Langsung', 'Repeat Order', 'Tender Cepat', 'Tender', 'Seleksi', 'Mekanisme Pasar (Dikecualikan)', 'Swakelola'];
    const bentukKontrakList = ['Bukti Pembelian', 'Kuitansi', 'SPK', 'Surat Perjanjian', 'Surat Pesanan', 'Kontrak Swakelola'];

    stageFormHtml = `
      <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:12px 14px; margin-bottom:14px;">
        <div style="font-weight:800; color:#1e40af; font-size:12.5px; margin-bottom:4px;">💡 Rekomendasi Cerdas Regulasi 2026:</div>
        <div style="font-size:11.5px; color:#1e3a8a; line-height:1.45;">
          Berdasarkan Pagu <strong>${cakraFmtRp(paket.nilai_pagu)}</strong> dan Akun <strong>${cakraEsc(paket.kode_akun_mak || '-')}</strong>, sistem merekomendasikan:
          <strong>${cakraEsc(rekomendasi?.jenisKertasHarga || 'HPS')}</strong> |
          Bentuk Kontrak: <strong>${cakraEsc(rekomendasi?.bentukKontrakRekomendasi || 'SPK')}</strong> |
          Pelaksana: <strong>${cakraEsc(rekomendasi?.pelaksanaRekomendasi || 'PPK / Pejabat Pengadaan')}</strong>
        </div>
      </div>

      <div class="cakra-form-grid-3">
        <div class="cakra-form-group">
          <label>1. Jenis Pengadaan</label>
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

      <div class="cakra-form-grid-2">
        <div class="cakra-form-group">
          <label>Bentuk Kontrak (Pasal 28 Perpres 46/2025)</label>
          <select class="cakra-form-control" id="cf_bentuk_kontrak">
            ${bentukKontrakList.map(b => `<option value="${b}" ${paket.bentuk_kontrak === b ? 'selected' : ''}>${b}</option>`).join('')}
          </select>
        </div>
        <div class="cakra-form-group">
          <label>Pilihan Kertas Kerja Harga (Tahap 6)</label>
          <select class="cakra-form-control" id="cf_jenis_kertas_harga">
            ${['Bebas HPS (<=10Jt)', 'Referensi Harga (E-Purchasing <=100Jt)', 'HPS', 'RAB Swakelola', 'Estimasi Pasar (Dikecualikan)'].map(kh => `<option value="${kh}" ${paket.jenis_kertas_harga === kh ? 'selected' : ''}>${kh}</option>`).join('')}
          </select>
        </div>
      </div>
    `;
  } else if (stageNo === 3) {
    // TAHAP 3: PENYUSUNAN RUP & PENGUMUMAN SIRUP
    stageFormHtml = `
      <div class="cakra-form-grid-3">
        <div class="cakra-form-group">
          <label>Kode RUP SiRUP LKPP</label>
          <input type="text" class="cakra-form-control cakra-mono" id="cf_kode_rup" value="${cakraEsc(paket.kode_rup)}" placeholder="cth: RUP-5091823" />
        </div>
        <div class="cakra-form-group">
          <label>Status Paket dalam Alur RUP</label>
          <select class="cakra-form-control" id="cf_status_paket">
            ${['Perencanaan', 'Persiapan PPK', 'Pemilihan', 'Kontrak Aktif', 'Serah Terima & BAST', 'Selesai & Lunas'].map(s => `<option value="${s}" ${paket.status_paket === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="cakra-form-group">
          <label>Afirmasi UMK / Koperasi (Pasal 65 Perpres)</label>
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:7px 10px; font-size:12px; font-weight:700; color:#047857;">
            ✅ Alokasi UMK: ${(rekomendasi?.persenUmk || 100).toFixed(1)}% (Wajib Min. 40%)
          </div>
        </div>
      </div>

      <div class="cakra-form-group">
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:10px 14px; font-size:11.5px; color:#166534;">
          <strong>Panduan Tahap 3:</strong> Pastikan paket telah diumumkan pada portal SiRUP (sirup.lkpp.go.id) sebelum melanjutkan ke Fase II (Persiapan Pengadaan oleh PPK). Sistem akan memvalidasi Kode RUP ini pada dokumen Berita Acara RUP.
        </div>
      </div>
    `;
  } else if (stageNo === 4) {
    // TAHAP 4: KAK, SPESIFIKASI & TKDN
    stageFormHtml = `
      <div class="cakra-form-group">
        <label>Uraian Spesifikasi Teknis / Kerangka Acuan Kerja (KAK) / DED</label>
        <textarea class="cakra-form-control" id="cf_uraian_pekerjaan" rows="3">${cakraEsc(paket.uraian_pekerjaan)}</textarea>
      </div>
      <div class="cakra-form-group">
        <label>Hierarki Prioritas Produk Dalam Negeri (PDN) &amp; TKDN (Pasal 66)</label>
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
    `;
  } else if (stageNo === 5) {
    // TAHAP 5: ANALISA PASAR & PENILAIAN KATALOG V6
    stageFormHtml = `
      <div class="cakra-form-group">
        <label>Status Ketersediaan di Katalog Elektronik v6 (Kepka LKPP 177/2024)</label>
        <select class="cakra-form-control" id="cf_tersedia_di_katalog">
          ${['Ya, Tersedia & Sesuai', 'Tersedia tapi Dikecualikan (Penilaian PPK)', 'Belum Tersedia di Katalog'].map(st => `<option value="${st}" ${paket.tersedia_di_katalog === st ? 'selected' : ''}>${st}</option>`).join('')}
        </select>
      </div>
      <div class="cakra-form-group">
        <label>Alasan / Justifikasi Penilaian PPK (Jika Dikecualikan dari Katalog)</label>
        <textarea class="cakra-form-control" id="cf_alasan_penilaian_ppk_katalog" rows="2" placeholder="Wajib diisi jika produk tersedia di katalog namun PPK memilih metode non-katalog...">${cakraEsc(paket.alasan_penilaian_ppk_katalog || '')}</textarea>
      </div>
    `;
  } else if (stageNo === 6) {
    // TAHAP 6: TABEL ITEM & HPS (Spreadsheet Full)
    stageFormHtml = `
      <div style="margin-bottom:12px;">
        ${buildCockpitItemsTabHtml()}
      </div>
    `;
  } else if (stageNo === 17) {
    // TAHAP 17: PAJAK, RETENSI & SP2D (Kalkulator Keuangan)
    stageFormHtml = `
      <div style="margin-bottom:12px;">
        ${buildCockpitPajakKinerjaTabHtml()}
      </div>
    `;
  } else {
    // GENERAL STAGE FORM (Untuk Tahap 7-16 & 18)
    stageFormHtml = buildCockpitFormTabHtml();
  }

  // Do's & Don'ts for this stage
  const dodontItem = (CakraState.activePaketCtx?.audit?.panduanTahap || {})[stageNo] || {
    do: 'Laksanakan tahapan sesuai peraturan pengadaan yang berlaku dan simpan arsip dokumen secara tertib.',
    dont: 'Jangan melangkahi tahapan formal sebelum syarat substantif terpenuhi.'
  };

  // Previous & Next Stage numbers
  const prevStage = stageNo > 1 ? stageNo - 1 : null;
  const nextStage = stageNo < 18 ? stageNo + 1 : null;

  return `
    <!-- UNIFIED PHASE CONTEXT BAR (ZEN MINIMALIST) -->
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:12px; font-size:11.5px; color:#475569;">
      <div style="display:flex; align-items:center; gap:8px;">
        <span class="badge" style="background:#1e3a8a; color:#fff; font-weight:800; padding:3px 8px; border-radius:4px;">${cakraEsc(faseCfg.nama)}</span>
        <span style="font-weight:700; color:#1e293b;">${cakraEsc(faseCfg.deskripsi)}</span>
      </div>
      <div style="color:#64748b; font-size:11px;">
        ⚖️ ${cakraEsc(faseCfg.dasarHukum)}
      </div>
    </div>

    ${stageWarningHtml}

    <!-- FORM WORKSPACE TAHAP AKTIF -->
    <form id="cakra-form-paket-cockpit" onsubmit="saveCurrentPaketForm(event)">
      <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin-bottom:14px; box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid #e2e8f0; padding-bottom:10px; flex-wrap:wrap; gap:8px;">
          <div style="font-weight:800; font-size:14px; color:#0f172a; display:flex; align-items:center; gap:8px;">
            <span class="cakra-badge cakra-badge-blue">Tahap ${stageNo}</span>
            <span>${cakraEsc(activeStageDef.nama)}</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="display:flex; align-items:center; gap:4px;">
              <label style="font-size:11px; font-weight:700; color:#475569; margin:0;">Nomor Dok:</label>
              <input type="text" class="cakra-form-control cakra-mono" id="cf_stage_nomor_dokumen" value="${cakraEsc(activeTRow.nomor_dokumen || (activeTRow.status_tahap === 'Bypass' ? '-' : generateAutoStageDocNumber(stageNo, paket.kode_paket_internal, activeTRow.tanggal_dokumen)))}" placeholder="No. Dokumen" style="width:230px; font-size:11.5px; padding:3px 8px; height:28px;" />
              <button type="button" class="cakra-btn cakra-btn-secondary cakra-btn-sm" onclick="resetAutoStageDocNumber(${stageNo})" style="height:28px; padding:0 6px;" title="Reset ke format penomoran otomatis selaras Kode Paket">🔄</button>
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              <label style="font-size:11px; font-weight:700; color:#475569; margin:0;">Tgl:</label>
              <input type="date" class="cakra-form-control" id="cf_stage_tanggal_dokumen" value="${cakraEsc(activeTRow.tanggal_dokumen || (paket.tgl_mulai_kerja || '2026-05-04'))}" style="width:130px; font-size:11.5px; padding:3px 6px; height:28px;" />
            </div>
            <div style="display:flex; align-items:center; gap:4px;">
              <label style="font-size:11px; font-weight:700; color:#475569; margin:0;">Status:</label>
              ${(() => {
                const driveL = String(activeTRow.link_drive_dokumen || '').trim();
                const isDoneNow = (activeTRow.status_tahap === 'Selesai' || activeTRow.status_tahap === 'Final') || (driveL.length > 5 && activeTRow.status_tahap !== 'Bypass');
                return `
                  <select class="cakra-form-control" id="cf_stage_status_tahap" style="width:125px; font-size:11.5px; font-weight:700; padding:3px 6px; height:28px; color:${isDoneNow ? '#047857' : (activeTRow.status_tahap === 'Bypass' ? '#64748b' : '#b45309')};">
                    <option value="Draft" ${!isDoneNow && activeTRow.status_tahap !== 'Bypass' ? 'selected' : ''}>📝 Draft</option>
                    <option value="Selesai" ${isDoneNow ? 'selected' : ''}>✅ Selesai</option>
                    <option value="Bypass" ${activeTRow.status_tahap === 'Bypass' ? 'selected' : ''}>⏭️ Bypass</option>
                  </select>
                `;
              })()}
            </div>
            <button type="button" class="cakra-btn cakra-btn-warning cakra-btn-sm" onclick="saveDraftQuickly()" style="font-weight:700; background:#f59e0b; color:#fff; border:none; height:28px; padding:0 10px; border-radius:5px; display:inline-flex; align-items:center; gap:4px;" title="Simpan sebagai Draf (Ctrl + S)">
              <span>💾 Simpan Draf</span>
            </button>
            <button type="button" class="cakra-btn cakra-btn-secondary cakra-btn-sm" onclick="showCakraBypassModal(${stageNo})" style="font-weight:700; height:28px; padding:0 8px; border-radius:5px; display:inline-flex; align-items:center; gap:4px;" title="Lewati / Loncat tahap ini">
              <span>⏭️ Loncat</span>
            </button>
          </div>
        </div>

        ${stageFormHtml}
      </div>

      <!-- LINK GOOGLE DRIVE ACCORDION (ZEN CLEAN) -->
      <details style="margin-top:14px; margin-bottom:14px; border:1px solid #86efac; border-radius:8px; background:#f0fdf4; padding:10px 14px;">
        <summary style="cursor:pointer; font-weight:700; font-size:12px; color:#166534; display:flex; justify-content:space-between; align-items:center;">
          <span style="display:flex; align-items:center; gap:6px;">
            <span>☁️ Tautan Google Drive Dokumen Sah Bertandatangan</span>
          </span>
          <span style="font-size:11px; color:#15803d; font-weight:600;">
            ${activeTRow.link_drive_dokumen ? '✅ Tautan Drive Terhubung (Klik untuk ubah)' : '(Opsional: Isi setelah dokumen fisik ditandatangani)'}
          </span>
        </summary>
        <div style="margin-top:10px; padding-top:8px; border-top:1px solid #bbf7d0;">
          <div style="font-size:11.5px; color:#15803d; margin-bottom:6px;">
            *Syarat alur dinyatakan Selesai: Dokumen hasil unduhan telah ditandatangani dan diunggah ke Google Drive satker.
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <input type="url" class="cakra-form-control" id="cf_link_drive_dokumen" value="${cakraEsc(activeTRow.link_drive_dokumen || '')}" oninput="onDriveLinkInput(this.value)" placeholder="Tempel tautan Google Drive berkas sah (cth: https://drive.google.com/file/d/...)" style="flex:1; font-size:12px;" />
            ${activeTRow.link_drive_dokumen ? `
              <a href="${cakraEsc(activeTRow.link_drive_dokumen)}" target="_blank" rel="noopener noreferrer" class="cakra-btn cakra-btn-success cakra-btn-sm" style="display:inline-flex; align-items:center; gap:4px; text-decoration:none; white-space:nowrap; font-weight:700;">
                🔗 Buka Drive
              </a>
            ` : ''}
          </div>
        </div>
      </details>

      <!-- DO'S & DON'TS ACCORDION (ZEN CLEAN) -->
      <details style="margin-bottom:14px; border:1px solid #cbd5e1; border-radius:8px; background:#f8fafc; padding:8px 14px;">
        <summary style="cursor:pointer; font-weight:700; font-size:11.5px; color:#334155; display:flex; justify-content:space-between; align-items:center;">
          <span>🧭 Panduan Kepatuhan Do's &amp; Don'ts Tahap ${stageNo}</span>
          <span style="font-size:10.5px; color:#64748b;">(Rambu-rambu regulasi)</span>
        </summary>
        <div style="margin-top:8px; padding-top:8px; border-top:1px solid #e2e8f0; display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:11.5px;">
          <div style="color:#166534; line-height:1.45;">
            <strong>✅ DO (Wajib Dilakukan):</strong><br/>
            ${cakraEsc(dodontItem.do || 'Laksanakan tahapan sesuai peraturan PBJ.')}
          </div>
          <div style="color:#991b1b; line-height:1.45;">
            <strong>❌ DON'T (Dilarang Keras):</strong><br/>
            ${cakraEsc(dodontItem.dont || 'Jangan melangkahi tahapan substansial.')}
          </div>
        </div>
      </details>

      <!-- BOTTOM GUIDED NAVIGATION BAR -->
      <div class="cakra-bottom-guided-nav">
        <div>
          ${prevStage ? `
            <button type="button" class="cakra-btn cakra-btn-outline" onclick="selectCockpitStage(${prevStage})">
              ⬅ Kembali ke Tahap ${prevStage}
            </button>
          ` : '<span style="color:#94a3b8; font-size:12px;">Titik Awal (Tahap 1)</span>'}
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
          <button type="button" class="cakra-btn cakra-btn-warning" onclick="saveDraftQuickly()" style="font-weight:700; background:#f59e0b; color:#fff; border:none;" title="Simpan data yang sedang Anda ketik sekarang (Ctrl + S)">
            💾 Simpan Draf (Ctrl + S)
          </button>
          <button type="button" class="cakra-btn cakra-btn-secondary" onclick="showCakraBypassModal(${stageNo})" style="font-weight:700;" title="Lewati / Loncat tahap ini dengan alasan regulasi">
            ⏭️ Loncat / Bypass Tahap Ini
          </button>
          <button type="button" class="cakra-btn cakra-btn-success" onclick="saveAsSelesai()" style="font-weight:800; background:#10b981; color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer;" title="Selesaikan tahap ini setelah dokumen bertandatangan diunggah ke Google Drive">
            ✅ Selesaikan Tahap ${stageNo}
          </button>
          ${nextStage ? `
            <button type="button" class="cakra-btn cakra-btn-primary" onclick="selectCockpitStage(${nextStage})" style="font-weight:800;">
              Lanjut ke Tahap ${nextStage} ➔
            </button>
          ` : `
            <span class="badge badge-success" style="font-size:12px; padding:6px 12px; background:#047857; color:#fff;">🎉 Pengadaan Selesai (18/18)</span>
          `}</div>
      </div>
    </form>
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
    { no: 1, nama: 'Identifikasi Kebutuhan & Nota Dinas', do: 'Lakukan survei kebutuhan riil divisi/subbag sebelum menyusun nota dinas.', dont: 'Jangan memecah paket pengadaan untuk menghindari tender/lelang formal.' },
    { no: 2, nama: 'Perencanaan Pengadaan & RKB', do: 'Cek konsistensi pagu RKB definitif KPU Ngawi dan akun MAK yang sah.', dont: 'Dilarang menganggarkan pengadaan tanpa dasar MAK DIPA yang tersedia.' },
    { no: 3, nama: 'Input SiRUP LKPP & RUP Satker', do: 'Pastikan paket telah terumumkan di SiRUP LKPP sebelum pemilihan dimulai.', dont: 'Jangan memulai tahapan pemilihan penyedia sebelum RUP terbit di portal resmi.' },
    { no: 4, nama: 'Spesifikasi Teknis & KAK PPK', do: 'Prioritaskan produk ber-TKDN tinggi dan merek katalog bersertifikat PDN.', dont: 'Dilarang mengunci spesifikasi yang mengarah pada satu merek tertentu tanpa justifikasi teknis.' },
    { no: 5, nama: 'Penyusunan HPS / Standar Harga Pasar', do: 'Gunakan minimal 3 sumber harga pasar atau referensi katalog untuk paket non-tender.', dont: 'Dilarang memperhitungkan PPN ganda atau memasukkan biaya tak terduga ke dalam HPS.' },
    { no: 6, nama: 'Rancangan Kontrak & Kertas Kerja', do: 'Tentukan bentuk kontrak yang tepat (Bukti Pembelian, Kuitansi, SPK, atau Surat Perjanjian).', dont: 'Dilarang menggunakan kuitansi sederhana untuk pengadaan di atas Rp50 Juta.' },
    { no: 7, nama: 'Dokumen Persiapan Pengadaan (DPP)', do: 'PPK menyerahkan berkas persiapan lengkap ke Pejabat Pengadaan / Pokja.', dont: 'Dilarang menyerahkan dokumen persiapan yang belum ditandatangani sah oleh PPK.' },
    { no: 8, nama: 'Penyampaian Undangan & Pemilihan', do: 'Kirimkan undangan resmi via SPSE/Katalog atau surat tertulis resmi bagi non-tender.', dont: 'Dilarang mengundang penyedia yang masuk dalam Daftar Hitam (Blacklist) LKPP.' },
    { no: 9, nama: 'Evaluasi Penawaran & Negosiasi', do: 'Lakukan negosiasi harga teknis secara transparan dan buat Berita Acara Negosiasi.', dont: 'Dilarang menyepakati harga negosiasi yang melebihi pagu anggaran yang tersedia.' },
    { no: 10, nama: 'Berita Acara Hasil Pengadaan (BAHP)', do: 'Pejabat Pengadaan menetapkan pemenang dan melaporkan hasil ke PPK.', dont: 'Dilarang menerbitkan BAHP tanpa melampirkan kertas kerja evaluasi penawaran.' },
    { no: 11, nama: 'Surat Penetapan Penyedia (SPPBJ)', do: 'Terbitkan SPPBJ setelah masa sanggah selesai atau langsung untuk E-Purchasing.', dont: 'Dilarang menerbitkan SPPBJ jika penyedia tidak bersedia memperpanjang masa berlaku penawaran.' },
    { no: 12, nama: 'Rapat Persiapan Penandatanganan Kontrak', do: 'Konfirmasi keabsahan jaminan pelaksanaan (jika disyaratkan) dan NPWP/Rekening.', dont: 'Dilarang menandatangani kontrak jika jaminan pelaksanaan belum terverifikasi keasliannya.' },
    { no: 13, nama: 'Penandatanganan Kontrak / Surat Pesanan', do: 'Gunakan materai Rp10.000 dan pastikan penandatangan berwenang menurut akta pendirian.', dont: 'Dilarang menandatangani kontrak bertanggal mundur (backdated).' },
    { no: 14, nama: 'Surat Penyerahan Lokasi Kerja (SPL)', do: 'Lakukan serah terima lokasi secara tertulis untuk pekerjaan fisik/lapangan.', dont: 'Dilarang memulai pekerjaan lapangan tanpa serah terima area kerja resmi.' },
    { no: 15, nama: 'Surat Perintah Mulai Kerja (SPMK)', do: 'Terbitkan SPMK paling lambat 14 hari kerja setelah kontrak ditandatangani.', dont: 'Dilarang menerbitkan SPMK sebelum penyerahan lokasi kerja selesai dilakukan.' },
    { no: 16, nama: 'Berita Acara Serah Terima (BAST/BAPHP)', do: 'Lakukan uji fungsi, cek kuantitas, dan kualitas barang/jasa sebelum menandatangani BAST.', dont: 'Dilarang menandatangani BAST 100% jika masih terdapat cacat mutu atau kekurangan volume.' },
    { no: 17, nama: 'Verifikasi Pembayaran & SPP/SPM', do: 'Kelengkapan kuitansi, faktur pajak, NPWP, BAST, dan garansi wajib diverifikasi PPK.', dont: 'Dilarang memproses SPP pembayaran sebelum seluruh kewajiban kontrak terpenuhi.' },
    { no: 18, nama: 'Pencatatan BMN / KDP & Arsip Dokumen', do: 'Catat aset hasil pengadaan belanja modal ke SIMAK-BMN / SAKTI Kemenkeu.', dont: 'Dilarang menunda pencatatan BMN melewati tahun anggaran berjalan.' }
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
  showPengadaanLandingView();
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

    onModalTahap1MakChange(p.kode_akun_mak || '');
  }

  modal.style.display = 'flex';
}
window.openModalTahap1Input = openModalTahap1Input;

function closeModalTahap1Input() {
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

async function submitModalTahap1Input() {
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
    ? ((CakraState.pakets || []).find(x => Number(x.id) === CakraState.modalTahap1EditingId) || (CakraState.activePaketCtx?.paket || {}))
    : {};

  const cleanMak = kodeMak.replace(/[^0-9]/g, '');
  const isModalMak = cleanMak.startsWith('53');

  const payload = {
    ...existingPaket,
    id: isEdit ? CakraState.modalTahap1EditingId : undefined,
    kode_paket_internal: getStr('m1_kode_paket_internal') || existingPaket.kode_paket_internal,
    nama_paket: namaPaket,
    uraian_pekerjaan: getStr('m1_uraian_pekerjaan'),
    pic_subbag: getStr('m1_pic_subbag') || 'KUL',
    kode_akun_mak: cleanMak,
    nama_akun_mak: getStr('m1_nama_akun_mak') || (isModalMak ? 'Belanja Modal Peralatan dan Mesin' : 'Belanja Bahan'),
    nilai_pagu: nilaiPagu,
    no_nota_dinas_pengusul: getStr('m1_no_nota_dinas_pengusul'),
    tgl_nota_dinas_pengusul: getStr('m1_tgl_nota_dinas_pengusul') || '2026-05-04',
    perihal_nota_dinas: getStr('m1_perihal_nota_dinas'),
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
      status_tahap: 'Draft',
      catatan_tahap: 'Identifikasi Kebutuhan PBJ & Pagu DIPA/RKB'
    }
  };

  try {
    const res = await cakraApiPost('/api/cakra/paket', payload);
    const savedId = res.id || existingPaket.id;
    closeModalTahap1Input();
    await initCakraApp();
    CakraState.activePaketId = savedId;
    showCockpitWorkspace();
    await openPaketInCockpit(savedId, 1, false);
    cakraNotify('✅ Paket [' + payload.kode_paket_internal + '] berhasil disimpan! Membuka Lembar Kerja Tahap 1.', 'success');
  } catch (err) {
    cakraNotify('❌ Gagal menyimpan paket: ' + err.message, 'error');
  }
}
window.submitModalTahap1Input = submitModalTahap1Input;

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
