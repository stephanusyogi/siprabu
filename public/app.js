/**
 * SI-PRABU Clean Web Edition v3.0
 * Frontend Application Client
 * Pengembang Resmi: emenje
 */

// STATE APLIKASI
const AppState = {
  currentUser: null,
  usersList: [],
  currentPeriode: null,
  periodesList: [],
  rkbData: null,
  masters: null,
  activeView: 'view-dashboard',
  treeExpandLevel: 2, // 1=L1, 2=L2 (default), 3=L3, 4=L4, 5=Akun, 6=Buka Semua
  treeNodeOverrides: {},
  selectedRowId: null,
  revisionViewMode: 'STANDARD', // 'STANDARD' | 'SANDING'
  filters: {
    pic: 'SEMUA',
    sasaran: 'ALL',
    search: ''
  },
  searchDebounceTimer: null
};

// ============================================================================
// UTILITIES & API CLIENT
// ============================================================================

function formatRupiah(num) {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return 'Rp 0';
  return 'Rp ' + Number(num).toLocaleString('id-ID');
}

function formatNumber(num) {
  if (num === null || num === undefined || Number.isNaN(Number(num))) return '0';
  return Number(num).toLocaleString('id-ID');
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('siprabu_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  if (res.status === 401) {
    console.warn('Unauthorized request');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data;
}

// ============================================================================
// INISIALISASI APLIKASI
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initAuth();
    await loadMasters();
    await loadPeriodes();
    await loadRkbData();
    renderAllViews();
  } catch (err) {
    console.error('Initialization error:', err);
    alert('Terjadi kesalahan inisialisasi: ' + err.message);
  }
});

async function initAuth() {
  const usersRes = await apiFetch('/api/users');
  AppState.usersList = usersRes.users || [];

  const switcher = document.getElementById('user-switcher');
  if (switcher) {
    switcher.innerHTML = AppState.usersList.map(u => `
      <option value="${u.username}">[Level ${u.level}] ${u.nama_pejabat} (${u.username})</option>
    `).join('');
  }

  const savedToken = localStorage.getItem('siprabu_token');
  let loggedInUser = null;

  if (savedToken) {
    try {
      const meRes = await apiFetch('/api/me');
      loggedInUser = meRes.user;
    } catch (e) {
      localStorage.removeItem('siprabu_token');
    }
  }

  if (!loggedInUser) {
    const defaultUser = AppState.usersList.find(u => u.username === 'perencanaan') || AppState.usersList[0];
    if (defaultUser) {
      await performLogin(defaultUser.username, defaultUser.username === 'emenje' ? 'emenje123' : 'perencanaan123');
    }
  } else {
    AppState.currentUser = loggedInUser;
    updateUserNavbar();
  }
}

async function performLogin(username, password) {
  const res = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  localStorage.setItem('siprabu_token', res.token);
  AppState.currentUser = res.user;
  updateUserNavbar();
}

function updateUserNavbar() {
  const user = AppState.currentUser;
  if (!user) return;

  const namaEl = document.getElementById('user-nama-pejabat');
  const roleEl = document.getElementById('user-role-badge');
  const avatarEl = document.getElementById('user-avatar');
  const switcher = document.getElementById('user-switcher');

  if (namaEl) namaEl.textContent = user.nama_pejabat;
  if (switcher) switcher.value = user.username;

  if (roleEl) {
    roleEl.textContent = `Level ${user.level}: ${user.role}`;
    if (user.level === 0) roleEl.className = 'user-role badge badge-primary';
    else if (user.level === 1) roleEl.className = 'user-role badge badge-success';
    else if (user.level === 2) roleEl.className = 'user-role badge badge-warning';
    else roleEl.className = 'user-role badge badge-secondary';
  }

  if (avatarEl) {
    if (user.username === 'emenje') avatarEl.textContent = '👨‍💻';
    else if (user.level === 0) avatarEl.textContent = '👑';
    else if (user.level === 1) avatarEl.textContent = '📑';
    else if (user.level === 2) avatarEl.textContent = '💼';
    else avatarEl.textContent = '👤';
  }
}

async function switchUser(username) {
  const targetUser = AppState.usersList.find(u => u.username === username);
  if (!targetUser) return;
  const pass = username === 'emenje' ? 'emenje123' : `${username}123`;
  try {
    await performLogin(username, pass);
    await loadRkbData();
    renderAllViews();
  } catch (err) {
    alert('Gagal berganti user: ' + err.message);
  }
}

function logout() {
  localStorage.removeItem('siprabu_token');
  location.reload();
}

// ============================================================================
// DATA LOADERS
// ============================================================================

async function loadMasters() {
  AppState.masters = await apiFetch('/api/masters');
}

async function loadPeriodes() {
  const res = await apiFetch('/api/periodes');
  AppState.periodesList = res.periodes || [];
  if (!AppState.currentPeriode && AppState.periodesList.length > 0) {
    AppState.currentPeriode = AppState.periodesList[0];
  }
}

async function loadRkbData() {
  if (!AppState.currentPeriode) return;
  const periodeId = AppState.currentPeriode.id;

  const queryParams = new URLSearchParams();
  if (AppState.filters.pic !== 'SEMUA') queryParams.append('pic', AppState.filters.pic);
  if (AppState.filters.sasaran !== 'ALL') queryParams.append('target_scope', AppState.filters.sasaran);
  if (AppState.filters.search.trim()) queryParams.append('search', AppState.filters.search.trim());

  const url = `/api/rkb/${periodeId}?${queryParams.toString()}`;
  AppState.rkbData = await apiFetch(url);
}

function updateContextNavbar() {
  const p = AppState.currentPeriode;
  if (!p) return;

  const docEl = document.getElementById('context-nama-dokumen');
  if (docEl) docEl.textContent = p.nama_periode;
  const badge = document.getElementById('context-badge-status');
  const dot = document.getElementById('context-dot');
  const banner = document.getElementById('global-lock-banner');

  if (p.is_locked) {
    if (badge) {
      badge.textContent = '🔒 TERKUNCI (NPHD SAH)';
      badge.className = 'context-status badge badge-danger';
    }
    if (dot) dot.className = 'pulse-dot locked';
    if (banner) {
      banner.style.display = 'flex';
      const lockTitle = document.getElementById('lock-banner-title');
      if (lockTitle) lockTitle.textContent = `DOKUMEN ${(p.versi_revisi || '').toUpperCase()} TELAH DIKUNCI (NPHD SAH)`;
    }
  } else {
    if (badge) {
      badge.textContent = '🟢 DRAFT AKTIF';
      badge.className = 'context-status badge badge-success';
    }
    if (dot) dot.className = 'pulse-dot active';
    if (banner) banner.style.display = 'none';
  }
}

// ============================================================================
// SIDEBAR & VIEW SWITCHER
// ============================================================================

function toggleSidebarFolder(folderId, event) {
  if (event) event.stopPropagation();
  const el = document.getElementById(folderId);
  if (el) el.classList.toggle('collapsed');
}

function switchView(viewId) {
  AppState.activeView = viewId;
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
  });

  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.add('active');

  if (viewId === 'view-dashboard') renderDashboard();
  else if (viewId === 'view-siklus') renderSiklus();
  else if (viewId === 'view-rkb') renderRkbTable();
  else if (viewId === 'view-master') renderMasterTabs();
  else if (viewId === 'view-settings') renderSettings();
  else if (viewId === 'view-referensi') switchRefTab('ref-sbm');
}

function switchRefTab(tabId) {
  document.querySelectorAll('.ref-tab-pane').forEach(el => el.style.display = 'none');
  const target = document.getElementById(tabId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('#view-referensi .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `btn-tab-${tabId}`);
  });
}

function renderAllViews() {
  updateContextNavbar();
  renderDashboard();
  renderSiklus();
  renderRkbTable();
  renderMasterTabs();
  renderSettings();
}

// ============================================================================
// VIEW 1: DASHBOARD KPI EKSEKUTIF
// ============================================================================

function renderDashboard() {
  if (!AppState.rkbData) return;
  const { summary, periode } = AppState.rkbData;

  document.getElementById('kpi-total-pagu').textContent = formatRupiah(summary.grandTotal);
  document.getElementById('kpi-total-items').textContent = formatNumber(summary.totalItems);
  document.getElementById('kpi-status-revisi').textContent = periode.versi_revisi;
  document.getElementById('badge-total-items').textContent = formatNumber(summary.totalItems);

  // Subbag Cards
  const sub = summary.bySubbag || {};
  document.getElementById('pagu-subbag-kul').textContent = formatRupiah(sub.KUL || 0);
  document.getElementById('pagu-subbag-rendatin').textContent = formatRupiah(sub.RENDATIN || 0);
  document.getElementById('pagu-subbag-teknis').textContent = formatRupiah(sub.TEKNIS || 0);
  document.getElementById('pagu-subbag-hukum').textContent = formatRupiah(sub.HUKUM || 0);
  document.getElementById('pagu-subbag-parsdm').textContent = formatRupiah(sub.PARSDM || 0);

  // Progress Bar Subbag
  const total = summary.grandTotal || 1;
  const setBar = (id, val) => {
    const pct = ((val / total) * 100).toFixed(1);
    const bar = document.getElementById(id);
    if (bar) bar.style.width = `${pct}%`;
  };
  setBar('bar-subbag-kul', sub.KUL || 0);
  setBar('bar-subbag-rendatin', sub.RENDATIN || 0);
  setBar('bar-subbag-teknis', sub.TEKNIS || 0);
  setBar('bar-subbag-hukum', sub.HUKUM || 0);
  setBar('bar-subbag-parsdm', sub.PARSDM || 0);

  // Sasaran KPI
  const sas = summary.bySasaran || {};
  const paguAdhoc = (sas.PPK || 0) + (sas.PPS || 0) + (sas.TPS || 0) + (sas.PANTARLIH || 0);
  document.getElementById('kpi-pagu-kab').textContent = formatRupiah(sas.KAB || 0);
  document.getElementById('kpi-pagu-adhoc').textContent = formatRupiah(paguAdhoc);
  document.getElementById('kpi-pagu-peserta').textContent = formatRupiah(sas.PESERTA || 0);

  const pctAdhoc = summary.grandTotal > 0 ? ((paguAdhoc / summary.grandTotal) * 100).toFixed(2) : '0';
  document.getElementById('kpi-pct-adhoc').textContent = `${pctAdhoc}% (PPK, PPS, TPS, Pantarlih)`;

  // Satker Details
  if (AppState.masters && AppState.masters.settings) {
    const s = AppState.masters.settings;
    document.getElementById('dash-nama-satker').textContent = s.nama_satker;
    document.getElementById('dash-nama-kpa').textContent = s.kpa_nama;
    document.getElementById('dash-nip-kpa').textContent = s.kpa_nip;
    document.getElementById('dash-nama-ppkom').textContent = s.ppkom_nama;
    document.getElementById('dash-nama-bendahara').textContent = s.bendahara_nama;
    document.getElementById('satker-name-header').textContent = s.nama_satker.toUpperCase();
  }
}

// ============================================================================
// VIEW 2: PUSAT SIKLUS & RIWAYAT REVISI
// ============================================================================

function renderSiklus() {
  const container = document.getElementById('siklus-tree-container');
  if (!container) return;

  const periodes = AppState.periodesList;
  const current = AppState.currentPeriode;

  container.innerHTML = periodes.map(p => {
    const isCurrent = current && current.id === p.id;
    return `
      <div class="siklus-node ${isCurrent ? 'active-node' : ''}">
        <div class="siklus-header">
          <div class="siklus-title">
            <span class="icon">${p.is_locked ? '🔒' : '📄'}</span>
            <strong>${p.nama_periode}</strong>
            <span class="badge ${p.is_locked ? 'badge-danger' : 'badge-success'}">
              ${p.is_locked ? 'TERKUNCI' : 'DRAFT AKTIF'}
            </span>
            ${isCurrent ? '<span class="badge badge-primary">DIBUKA SAAT INI</span>' : ''}
          </div>
          <div class="siklus-actions">
            <button class="btn btn-sm btn-outline-primary" onclick="selectPeriode(${p.id})">
              ${isCurrent ? 'Sedang Dibuka' : 'Buka Dokumen'}
            </button>
            <button class="btn btn-sm btn-secondary" onclick="exportExcelPeriode(${p.id})">
              📥 Excel
            </button>
          </div>
        </div>
        <div class="siklus-details">
          <span>Versi: <b>${p.versi_revisi}</b></span> |
          <span>Dasar: <b>${p.dasar_pengesahan || 'NPHD'}</b></span> |
          <span>Total Baris: <b>${formatNumber(p.total_baris)}</b></span> |
          <span>Items Belanja: <b>${formatNumber(p.total_items)}</b></span>
        </div>
        ${p.catatan_revisi ? `<div class="siklus-catatan">${p.catatan_revisi}</div>` : ''}
      </div>
    `;
  }).join('');
}

async function selectPeriode(periodeId) {
  const p = AppState.periodesList.find(x => x.id === periodeId);
  if (!p) return;
  AppState.currentPeriode = p;
  AppState.treeNodeOverrides = {};
  await loadRkbData();
  renderAllViews();
}

async function toggleLockPeriode(periodeId, lockState) {
  const user = AppState.currentUser;
  if (!user || user.level > 1) {
    alert('Hanya Ketua KPU (Level 0) atau KPA/Sekretaris (Level 1) yang berwenang mengunci atau membuka kunci dokumen.');
    return;
  }

  const promptMsg = lockState
    ? 'Apakah Anda yakin ingin MENGUNCI dokumen RKB ini? Setelah dikunci, rincian belanja tidak dapat diedit secara langsung.'
    : 'Buka kunci dokumen RKB ini untuk mengizinkan perubahan langsung?';

  if (!confirm(promptMsg)) return;

  try {
    const res = await apiFetch(`/api/periodes/${periodeId}/lock`, {
      method: 'POST',
      body: JSON.stringify({ is_locked: lockState })
    });
    alert(res.message);
    await loadPeriodes();
    AppState.currentPeriode = AppState.periodesList.find(x => x.id === periodeId);
    await loadRkbData();
    renderAllViews();
  } catch (err) {
    alert('Gagal mengubah status kunci: ' + err.message);
  }
}

// ============================================================================
// VIEW 3: RKB KABUPATEN (TREE HIERARKI SAKTI & SEMULA-MENJADI)
// ============================================================================

function setTreeExpandLevel(lvl) {
  AppState.treeExpandLevel = Number(lvl) || 2;
  AppState.treeNodeOverrides = {};
  ['btnTreeL1', 'btnTreeL2', 'btnTreeL3', 'btnTreeL4', 'btnTreeAkun', 'btnTreeAll'].forEach((id, idx) => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', (idx + 1) === AppState.treeExpandLevel);
  });
  renderRkbTable();
}

function toggleTreeNode(treeId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const currentExpanded = isNodeExpanded(treeId);
  AppState.treeNodeOverrides[treeId] = !currentExpanded;
  renderRkbTable();
}

function isNodeExpanded(treeId, treeLevel) {
  if (AppState.filters.search.trim()) {
    return true;
  }
  if (treeId in AppState.treeNodeOverrides) {
    return Boolean(AppState.treeNodeOverrides[treeId]);
  }
  return (treeLevel || 3) < (AppState.treeExpandLevel || 2);
}

function toggleRevisionSandingMode(checked) {
  AppState.revisionViewMode = checked ? 'SANDING' : 'STANDARD';
  renderRkbTable();
}

function selectRow(rowId) {
  AppState.selectedRowId = Number(rowId);
  const rows = AppState.rkbData?.rows || [];
  const row = rows.find(r => Number(r.id) === Number(rowId));
  const pill = document.querySelector('.sakti-selected-pill');
  const actBox = document.getElementById('saktiActionButtons');
  const user = AppState.currentUser;
  const isLocked = Boolean(AppState.currentPeriode?.is_locked);
  const canEdit = checkCanEditRow(user, row, isLocked);

  if (!row) {
    if (pill) pill.textContent = 'Belum Ada Baris Dipilih';
    if (actBox) {
      actBox.innerHTML = !isLocked ? `<button class="btn btn-primary btn-sm" onclick="openAddRowModal()">➕ Rekam Baris Belanja</button>` : '';
    }
    return;
  }

  const cleanUraian = (row.uraian || '').substring(0, 50);
  const lvlLabel = row.is_header ? `Level ${row.level_indent}` : 'Detail Belanja';
  if (pill) pill.innerHTML = `<strong>[${row.kode || lvlLabel}]</strong> ${cleanUraian}`;

  if (actBox) {
    let btns = '';
    if (row.is_header) {
      if (row.level_indent === 0) {
        btns += `<button class="btn btn-primary btn-sm" onclick="openAddRowModal()">➕ Rekam Sub-Level</button>`;
      } else if (row.level_indent === 1) {
        btns += `<button class="btn btn-primary btn-sm" onclick="openAddRowModal()">➕ Rekam Kegiatan</button>`;
      } else if (row.level_indent === 2 || (row.level_indent >= 21 && row.level_indent <= 25)) {
        btns += `<button class="btn btn-success btn-sm" onclick="openAddRowModal()">➕ Tambah Detail Belanja</button>`;
      } else if (row.level_indent === 3) {
        btns += `<button class="btn btn-success btn-sm" onclick="openAddRowModal()">➕ Tambah Detail Belanja (Multi-Faktor)</button>`;
      }
    } else {
      if (canEdit) {
        btns += `<button class="btn btn-primary btn-sm" onclick="openRowModal(${row.id})">✏️ Ubah Rincian</button>`;
        btns += `<button class="btn btn-outline-danger btn-sm" onclick="deleteRow(${row.id})">🗑️ Hapus</button>`;
      }
    }
    actBox.innerHTML = btns;
  }

  document.querySelectorAll('#rkb-table-body tr').forEach(tr => tr.classList.remove('table-row-selected'));
  const activeTr = document.getElementById(`row-${rowId}`);
  if (activeTr) activeTr.classList.add('table-row-selected');
}

function renderRkbTable() {
  if (!AppState.rkbData) return;
  const { rows, summary, periode, revision_comparison } = AppState.rkbData;
  const user = AppState.currentUser;
  const isLocked = Boolean(periode.is_locked);
  const hasParentRev = Boolean(revision_comparison && revision_comparison.has_parent);
  const isSanding = hasParentRev && AppState.revisionViewMode === 'SANDING';

  // Total footer
  const tfootTotal = document.getElementById('rkb-tfoot-total');
  if (tfootTotal) tfootTotal.textContent = formatRupiah(summary.grandTotal);

  // Banner Audit Pagu Induk
  const bTotal = document.getElementById('rkbBannerTotalPagu');
  const bTahapan = document.getElementById('rkbBannerTahapan');
  const bOperasional = document.getElementById('rkbBannerOperasional');
  const bHonor = document.getElementById('rkbBannerHonor');

  if (bTotal) bTotal.textContent = formatRupiah(summary.grandTotal);
  if (bTahapan) bTahapan.textContent = formatRupiah(summary.banner?.tahapanTotal || 20112930269);
  if (bOperasional) bOperasional.textContent = formatRupiah(summary.banner?.operasionalTotal || 6496893731);
  if (bHonor) bHonor.textContent = formatRupiah(summary.banner?.honorTotal || 23385300000);

  // Stepper Header
  const stepperTitle = document.getElementById('rkb-stepper-title');
  const stepperSub = document.getElementById('rkb-stepper-sub');
  if (stepperTitle) stepperTitle.textContent = periode.nama_periode;
  if (stepperSub) {
    stepperSub.innerHTML = `Versi: <strong>${periode.versi_revisi}</strong> | Status: ${isLocked ? '<span class="badge badge-danger">🔒 Terkunci (NPHD Sah)</span>' : '<span class="badge badge-success">🟢 Draft Aktif</span>'} | Dasar: <strong>${periode.dasar_pengesahan || 'NPHD'}</strong>`;
  }

  // Revision Sanding Toggle Visibility
  const lblSanding = document.getElementById('lblToggleSanding');
  if (lblSanding) {
    lblSanding.style.display = hasParentRev ? 'inline-flex' : 'none';
  }

  // Revision Pills
  const revisionPills = document.getElementById('rkb-revision-pills');
  if (revisionPills) {
    let pillsHtml = AppState.periodesList.map(item => `
      <button class="btn btn-sm ${item.id === periode.id ? 'btn-primary' : 'btn-secondary'}" onclick="selectPeriode(${item.id})">
        ${item.is_locked ? '🔒' : '📄'} ${item.versi_revisi}
      </button>
    `).join('');

    if (user && (user.level === 0 || user.level === 1)) {
      pillsHtml += `
        <button class="btn btn-sm btn-outline-primary" onclick="openRevisionModal()" title="Buat Dokumen Revisi Baru">
          ➕ Buat Revisi Baru
        </button>
      `;
    }
    revisionPills.innerHTML = pillsHtml;
  }

  // Quick Actions (Kunci / Buka Kunci)
  const quickActions = document.getElementById('rkb-quick-actions');
  if (quickActions) {
    let actionsHtml = '';
    if (user && (user.level === 0 || user.level === 1)) {
      if (isLocked) {
        actionsHtml += `
          <button class="btn btn-sm btn-warning" onclick="toggleLockPeriode(${periode.id}, false)">
            🔓 Buka Kunci
          </button>
        `;
      } else {
        actionsHtml += `
          <button class="btn btn-sm btn-danger" onclick="toggleLockPeriode(${periode.id}, true)">
            🔒 Kunci NPHD
          </button>
        `;
      }
    }
    quickActions.innerHTML = actionsHtml;
  }

  // Strip 6 Tingkat Penyelenggara
  const sas = summary.bySasaran || {};
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = formatRupiah(val);
  };
  setEl('strip-pagu-kab', sas.KAB || 0);
  setEl('strip-pagu-ppk', sas.PPK || 0);
  setEl('strip-pagu-pps', sas.PPS || 0);
  setEl('strip-pagu-pantarlih', sas.PANTARLIH || 0);
  setEl('strip-pagu-tps', sas.TPS || 0);
  setEl('strip-pagu-peserta', sas.PESERTA || 0);
  const totalLevelPps = (sas.PPS || 0) + (sas.PANTARLIH || 0) + (sas.TPS || 0);
  setEl('strip-pagu-total-pps', totalLevelPps);

  const btnTambah = document.getElementById('btn-tambah-baris');
  if (btnTambah) {
    btnTambah.disabled = isLocked || (user && user.level === 3);
  }

  // Table Thead Switcher
  const thead = document.getElementById('rkb-table-head');
  if (thead) {
    if (isSanding) {
      thead.innerHTML = `
        <tr>
          <th class="col-no" style="width: 50px;">No</th>
          <th class="col-kode" style="width: 90px;">Kode</th>
          <th class="col-uraian">Uraian Kegiatan / Komponen / Akun / Detail Item</th>
          <th class="text-right" style="width: 170px; background: #f8fafc;">SEMULA<br><span style="font-size:10px;font-weight:500;color:#64748b;">(Vol × Harga = Jumlah)</span></th>
          <th class="text-right" style="width: 170px; background: #eff6ff;">MENJADI<br><span style="font-size:10px;font-weight:500;color:#1e40af;">(Vol × Harga = Jumlah)</span></th>
          <th class="text-right" style="width: 150px; background: #fffbeb;">SELISIH (+/-)<br><span style="font-size:10px;font-weight:500;color:#92400e;">Bertambah / Berkurang</span></th>
          <th style="width: 140px;">Status & Catatan</th>
        </tr>
      `;
    } else {
      thead.innerHTML = `
        <tr>
          <th class="col-no">No</th>
          <th class="col-kode">Kode</th>
          <th class="col-uraian">Uraian Komponen / Akun / Rincian Belanja</th>
          <th class="col-pic">PIC Subbag</th>
          <th class="col-sasaran">Sasaran</th>
          <th class="col-formula">Rincian Perhitungan (Faktor x Pengali)</th>
          <th class="col-vol text-right">Vol</th>
          <th class="col-sat">Satuan</th>
          <th class="col-harga text-right">Harga Satuan (Rp)</th>
          <th class="col-total text-right">Jumlah Anggaran (Rp)</th>
          <th class="col-aksi text-center">Aksi</th>
        </tr>
      `;
    }
  }

  const tbody = document.getElementById('rkb-table-body');
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${isSanding ? 7 : 11}" class="text-center" style="padding: 30px;">Tidak ada data baris yang cocok dengan filter.</td></tr>`;
    return;
  }

  // Pre-compute Tree Hierarchy Parent Map
  const parentMap = {};
  const nodeLevelMap = {};
  for (const r of rows) {
    parentMap[r.tree_id] = r.parent_tree_id;
    nodeLevelMap[r.tree_id] = r.tree_level;
  }

  // Search auto-expand
  const searchQ = (AppState.filters.search || '').trim().toLowerCase();
  const searchExpandedSet = new Set();
  if (searchQ) {
    for (const r of rows) {
      const hay = `${r.kode || ''} ${r.uraian || ''} ${r.kode_akun || ''} ${r.target_scope || ''} ${r.pic_bagian || ''}`.toLowerCase();
      if (hay.includes(searchQ)) {
        let p = r.parent_tree_id;
        while (p) {
          searchExpandedSet.add(p);
          p = parentMap[p];
        }
      }
    }
  }

  const isRowVisible = (treeId, parentTreeId) => {
    if (searchQ) return true;
    let p = parentTreeId;
    while (p) {
      const pLvl = nodeLevelMap[p] || 1;
      const isExp = (p in AppState.treeNodeOverrides) ? Boolean(AppState.treeNodeOverrides[p]) : (pLvl < (AppState.treeExpandLevel || 2));
      if (!isExp) return false;
      p = parentMap[p];
    }
    return true;
  };

  const revByRowId = (revision_comparison && revision_comparison.by_row_id) || {};

  let rowsHtml = '';
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    if (!isRowVisible(r.tree_id, r.parent_tree_id)) continue;

    const lvl = Number(r.level_indent);
    const isItem = !r.is_header;
    const isExpanded = isNodeExpanded(r.tree_id, r.tree_level);
    const isSelected = AppState.selectedRowId === r.id;

    const toggleChevron = r.has_children
      ? `<button type="button" class="tree-toggle-btn" onclick="toggleTreeNode('${r.tree_id}', event)" title="${isExpanded ? 'Lipat baris ini' : 'Buka cabang ini'}">${isExpanded ? '▾' : '▸'}</button>`
      : `<span style="display:inline-block;width:24px;"></span>`;

    const pic = (r.pic_bagian || 'KUL').toUpperCase();
    const picChip = `<span class="pic-chip pic-${pic}" onclick="openQuickPicModal(${r.id}, event)" title="Klik untuk mengubah Subbagian PIC">${pic}</span>`;

    const targetSas = (r.target_scope || 'KAB').toUpperCase();
    const sasChip = `<span class="scope-chip scope-${targetSas}">${targetSas}</span>`;

    const canEdit = checkCanEditRow(user, r, isLocked);

    if (isSanding) {
      const diffInfo = revByRowId[r.id] || {
        status: 'TETAP', diff: 0,
        semula_vol: r.computed_volume, semula_harga: r.harga_satuan, semula_jumlah: r.computed_total,
        menjadi_vol: r.computed_volume, menjadi_harga: r.harga_satuan, menjadi_jumlah: r.computed_total,
        catatan: ''
      };

      let badgeClass = 'diff-tetap';
      let badgeLabel = '⚪ Tetap';
      if (diffInfo.status === 'BERTAMBAH') { badgeClass = 'diff-bertambah'; badgeLabel = '🟢 Bertambah'; }
      else if (diffInfo.status === 'BERKURANG') { badgeClass = 'diff-berkurang'; badgeLabel = '🔴 Berkurang'; }
      else if (diffInfo.status === 'BARU') { badgeClass = 'diff-baru'; badgeLabel = '✨ Baru'; }

      rowsHtml += `
        <tr id="row-${r.id}" class="${r.is_header ? 'rkb-row-lvl-' + lvl : ''} ${isSelected ? 'table-row-selected' : ''}" onclick="selectRow(${r.id})">
          <td class="col-no text-center" style="font-family: var(--font-mono); font-size: 11px;">${r.urutan || (idx + 1)}</td>
          <td class="col-kode" style="font-family: var(--font-mono); font-weight: 700;">${r.kode || ''}</td>
          <td class="col-uraian" style="padding-left: ${r.effective_indent || 0}px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              ${toggleChevron}
              ${r.is_akun_row ? `<span class="akun-badge-inline" onclick="openQuickAkunModal(${r.id}, event)">[${r.kode_akun || r.kode || '521211'}]</span>` : ''}
              <span>${escHtml(r.uraian || '')}</span>
            </div>
          </td>
          <td class="text-right" style="font-family: var(--font-mono); background: #f8fafc;">
            ${isItem && diffInfo.semula_vol ? `${formatNumber(diffInfo.semula_vol)} ${diffInfo.semula_satuan || ''}<br>` : ''}
            <strong>${formatRupiah(diffInfo.semula_jumlah)}</strong>
          </td>
          <td class="text-right" style="font-family: var(--font-mono); background: #eff6ff;">
            ${isItem && diffInfo.menjadi_vol ? `${formatNumber(diffInfo.menjadi_vol)} ${diffInfo.menjadi_satuan || ''}<br>` : ''}
            <strong>${formatRupiah(diffInfo.menjadi_jumlah)}</strong>
          </td>
          <td class="text-right" style="font-family: var(--font-mono); background: #fffbeb; font-weight: 700; color: ${diffInfo.diff > 0 ? '#15803d' : (diffInfo.diff < 0 ? '#b91c1c' : '#64748b')};">
            ${diffInfo.diff > 0 ? '+' : ''}${formatRupiah(diffInfo.diff)}
          </td>
          <td>
            <span class="diff-badge ${badgeClass}">${badgeLabel}</span>
            ${diffInfo.catatan ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">${escHtml(diffInfo.catatan)}</div>` : ''}
          </td>
        </tr>
      `;
    } else {
      let aksiHtml = '';
      if (isItem) {
        if (canEdit) {
          aksiHtml = `
            <button class="btn btn-sm btn-primary" onclick="openRowModal(${r.id})" title="Edit Rincian">✏️</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteRow(${r.id})" title="Hapus">🗑️</button>
          `;
        } else {
          aksiHtml = `<span class="text-muted" style="font-size: 11px;">🔒 Read-Only</span>`;
        }
      }

      rowsHtml += `
        <tr id="row-${r.id}" class="${r.is_header ? 'rkb-row-lvl-' + lvl : ''} ${isSelected ? 'table-row-selected' : ''}" onclick="selectRow(${r.id})">
          <td class="col-no text-center" style="font-family: var(--font-mono); font-size: 11px;">${r.urutan || (idx + 1)}</td>
          <td class="col-kode" style="font-family: var(--font-mono); font-weight: 700;">${r.kode || ''}</td>
          <td class="col-uraian" style="padding-left: ${r.effective_indent || 0}px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              ${toggleChevron}
              ${r.is_akun_row ? `<span class="akun-badge-inline" onclick="openQuickAkunModal(${r.id}, event)" title="Klik untuk mengubah Akun Belanja ini">[${r.kode_akun || r.kode || '521211'}]</span>` : ''}
              <span>${escHtml(r.uraian || '')}</span>
            </div>
          </td>
          <td class="col-pic">${isItem ? picChip : ''}</td>
          <td class="col-sasaran">${isItem ? sasChip : ''}</td>
          <td class="col-formula" style="font-family: var(--font-mono); font-size: 11px; color: ${isItem ? '#475569' : 'inherit'};">
            ${isItem ? (r.computed_formula || '-') : ''}
          </td>
          <td class="col-vol text-right" style="font-family: var(--font-mono); font-weight: 600;">
            ${isItem && r.computed_volume !== null ? formatNumber(r.computed_volume) : ''}
          </td>
          <td class="col-sat">${isItem ? (r.satuan_vol || '') : ''}</td>
          <td class="col-harga text-right" style="font-family: var(--font-mono);">
            ${isItem && r.harga_satuan ? formatRupiah(r.harga_satuan) : ''}
          </td>
          <td class="col-total text-right" style="font-family: var(--font-mono); font-weight: 700;">
            ${formatRupiah(r.computed_total || 0)}
          </td>
          <td class="col-aksi text-center">${aksiHtml}</td>
        </tr>
      `;
    }
  }

  tbody.innerHTML = rowsHtml;
}

function checkCanEditRow(user, row, isLocked) {
  if (!user || isLocked) return false;
  if (user.level === 0 || user.level === 1) return true;
  if (user.level === 3) return false;
  if (user.level === 2) {
    const userSub = (user.pic_subbag || '').toUpperCase();
    const rowPic = (row.pic_bagian || '').toUpperCase();
    return userSub === rowPic;
  }
  return false;
}

function applyRkbFilters() {
  AppState.filters.pic = document.getElementById('filter-pic').value;
  AppState.filters.sasaran = document.getElementById('filter-sasaran').value;
  loadRkbData().then(() => renderRkbTable());
}

function handleSearchDebounce() {
  clearTimeout(AppState.searchDebounceTimer);
  AppState.searchDebounceTimer = setTimeout(() => {
    AppState.filters.search = document.getElementById('filter-search').value;
    loadRkbData().then(() => renderRkbTable());
  }, 250);
}

// ============================================================================
// RESUME CEPAT SASARAN MODAL
// ============================================================================

function openResumeSasaranModal() {
  if (!AppState.rkbData) return;
  const { summary } = AppState.rkbData;
  const sas = summary.bySasaran || {};
  const total = summary.grandTotal || 49999999000;

  const dataSasaran = [
    { title: '🏢 1. KPU Kabupaten', scope: 'KAB', entitas: 'Satker KPU Kab. Ngawi', val: sas.KAB || 0, desc: 'Operasional satker, logistik sentral, bimtek, sosialisasi, advokasi hukum' },
    { title: '🏛️ 2. PPK (19 Kecamatan)', scope: 'PPK', entitas: '19 Kecamatan', val: sas.PPK || 0, desc: 'Operasional sekretariat PPK, honorarium PPK & sekretariat 19 kecamatan' },
    { title: '🏘️ 3. PPS Murni (217 Desa)', scope: 'PPS', entitas: '217 Desa / Kelurahan', val: sas.PPS || 0, desc: 'Operasional sekretariat PPS, honorarium PPS & sekretariat 217 desa' },
    { title: '📋 4. Pantarlih / PPDP', scope: 'PANTARLIH', entitas: '2.537 Petugas', val: sas.PANTARLIH || 0, desc: 'Honorarium petugas pemutakhiran data pemilih (di bawah koordinasi PPS)' },
    { title: '🗳️ 5. TPS (KPPS + Linmas)', scope: 'TPS', entitas: '1.371 TPS', val: sas.TPS || 0, desc: 'Honorarium KPPS (7 org) dan Linmas (2 org) per TPS se-Kabupaten Ngawi' },
    { title: '🎯 6. Peserta Pemilihan', scope: 'PESERTA', entitas: 'Paslon & Parpol', val: sas.PESERTA || 0, desc: 'Bahan kampanye, alat peraga kampanye (APK), fasilitasi debat paslon, audit KAP' }
  ];

  const totalPenyelenggara = (sas.KAB || 0) + (sas.PPK || 0) + (sas.PPS || 0) + (sas.PANTARLIH || 0) + (sas.TPS || 0);
  const pctPenyelenggara = ((totalPenyelenggara / total) * 100).toFixed(2);

  const tbody = document.getElementById('resume-sasaran-tbody');
  if (tbody) {
    let rowsHtml = dataSasaran.map(d => {
      const pct = ((d.val / total) * 100).toFixed(2);
      return `
        <tr>
          <td><strong>${d.title}</strong></td>
          <td><span class="scope-chip scope-${d.scope}">${d.entitas}</span></td>
          <td class="text-right" style="font-family: var(--font-mono); font-weight: 700;">${formatRupiah(d.val)}</td>
          <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">${pct}%</td>
          <td style="font-size: 11.5px; color: var(--text-muted);">${d.desc}</td>
        </tr>
      `;
    }).join('');

    rowsHtml += `
      <tr style="background: #f0fdf4; font-weight: 700; border-top: 2px solid #86efac;">
        <td colspan="2">📦 TOTAL ALOKASI PENYELENGGARA (1 s.d 5):</td>
        <td class="text-right" style="font-family: var(--font-mono); color: #166534;">${formatRupiah(totalPenyelenggara)}</td>
        <td class="text-right" style="font-family: var(--font-mono); color: #166534;">${pctPenyelenggara}%</td>
        <td style="font-size: 11.5px; color: #166534;">Akumulasi anggaran seluruh tingkatan penyelenggara pilkada</td>
      </tr>
    `;

    tbody.innerHTML = rowsHtml;
  }

  const elTotRp = document.getElementById('resume-sasaran-total-rp');
  if (elTotRp) elTotRp.textContent = formatRupiah(total);

  document.getElementById('modal-resume-sasaran').style.display = 'flex';
}

function closeResumeSasaranModal() {
  document.getElementById('modal-resume-sasaran').style.display = 'none';
}

// ============================================================================
// QUICK PIC & QUICK AKUN SHORTCUTS
// ============================================================================

function openQuickPicModal(rowId, event) {
  if (event) event.stopPropagation();
  const row = (AppState.rkbData?.rows || []).find(r => r.id === rowId);
  if (!row) return;

  document.getElementById('quick-pic-row-id').value = row.id;
  document.getElementById('quick-pic-uraian').textContent = `[${row.kode || '-'}] ${row.uraian}`;
  document.getElementById('quick-pic-select').value = (row.pic_bagian || 'KUL').toUpperCase();
  document.getElementById('modal-quick-pic').style.display = 'flex';
}

function closeQuickPicModal() {
  document.getElementById('modal-quick-pic').style.display = 'none';
}

async function submitQuickPic() {
  const rowId = Number(document.getElementById('quick-pic-row-id').value);
  const pic = document.getElementById('quick-pic-select').value;
  const periodeId = AppState.currentPeriode.id;

  try {
    await apiFetch(`/api/rkb/${periodeId}/quick-pic`, {
      method: 'POST',
      body: JSON.stringify({ row_id: rowId, pic_bagian: pic })
    });
    closeQuickPicModal();
    await loadRkbData();
    renderAllViews();
  } catch (err) {
    alert('Gagal mengubah PIC: ' + err.message);
  }
}

function openQuickAkunModal(rowId, event) {
  if (event) event.stopPropagation();
  const row = (AppState.rkbData?.rows || []).find(r => r.id === rowId);
  if (!row) return;

  document.getElementById('quick-akun-row-id').value = row.id;
  document.getElementById('quick-akun-uraian').textContent = `[${row.kode || '-'}] ${row.uraian}`;
  document.getElementById('quick-akun-select').value = row.kode_akun || '521211';
  document.getElementById('modal-quick-akun').style.display = 'flex';
}

function closeQuickAkunModal() {
  document.getElementById('modal-quick-akun').style.display = 'none';
}

async function submitQuickAkun() {
  const rowId = Number(document.getElementById('quick-akun-row-id').value);
  const akun = document.getElementById('quick-akun-select').value;
  const periodeId = AppState.currentPeriode.id;

  try {
    await apiFetch(`/api/rkb/${periodeId}/quick-akun`, {
      method: 'POST',
      body: JSON.stringify({ row_id: rowId, kode_akun: akun })
    });
    closeQuickAkunModal();
    await loadRkbData();
    renderAllViews();
  } catch (err) {
    alert('Gagal mengubah Akun: ' + err.message);
  }
}

// ============================================================================
// MODAL: FORM TAMBAH / EDIT BARIS BELANJA
// ============================================================================

function openRowModal(rowId) {
  const row = AppState.rkbData.rows.find(r => r.id === rowId);
  if (!row) return;

  document.getElementById('modal-row-title').textContent = 'Edit Rincian Belanja RKB';
  document.getElementById('modal-row-id').value = row.id;
  document.getElementById('modal-row-level').value = row.level_indent || 4;
  document.getElementById('modal-uraian').value = row.uraian;
  document.getElementById('modal-pic').value = row.pic_bagian || 'KUL';
  document.getElementById('modal-sasaran').value = row.target_scope || 'KAB';

  const akunSelect = document.getElementById('modal-akun');
  if (AppState.masters && AppState.masters.akuns) {
    akunSelect.innerHTML = AppState.masters.akuns.map(a => `
      <option value="${a.kode}" ${a.kode === row.kode_akun ? 'selected' : ''}>[${a.kode}] ${a.uraian}</option>
    `).join('');
  }

  document.getElementById('modal-harga').value = row.harga_satuan || 0;
  document.getElementById('modal-f1-val').value = row.f1_val !== null ? row.f1_val : '';
  document.getElementById('modal-f1-unit').value = row.f1_unit || '';
  document.getElementById('modal-f2-val').value = row.f2_val !== null ? row.f2_val : '';
  document.getElementById('modal-f2-unit').value = row.f2_unit || '';
  document.getElementById('modal-f3-val').value = row.f3_val !== null ? row.f3_val : '';
  document.getElementById('modal-f3-unit').value = row.f3_unit || '';
  document.getElementById('modal-f4-val').value = row.f4_val !== null ? row.f4_val : '';
  document.getElementById('modal-f4-unit').value = row.f4_unit || '';
  document.getElementById('modal-basis-pengali').value = row.basis_pengali || 'NONE';
  document.getElementById('modal-satuan-vol').value = row.satuan_vol || 'Paket';

  calculateModalTotal();
  document.getElementById('modal-row').style.display = 'flex';
}

function openAddRowModal() {
  document.getElementById('modal-row-title').textContent = 'Tambah Rincian Belanja Baru';
  document.getElementById('modal-row-id').value = '';
  document.getElementById('modal-row-level').value = '4';
  document.getElementById('modal-uraian').value = '';
  document.getElementById('modal-pic').value = 'KUL';
  document.getElementById('modal-sasaran').value = 'KAB';

  const akunSelect = document.getElementById('modal-akun');
  if (AppState.masters && AppState.masters.akuns) {
    akunSelect.innerHTML = AppState.masters.akuns.map(a => `
      <option value="${a.kode}">[${a.kode}] ${a.uraian}</option>
    `).join('');
  }

  document.getElementById('modal-harga').value = 0;
  document.getElementById('modal-f1-val').value = 1;
  document.getElementById('modal-f1-unit').value = 'Keg';
  document.getElementById('modal-f2-val').value = '';
  document.getElementById('modal-f2-unit').value = '';
  document.getElementById('modal-f3-val').value = '';
  document.getElementById('modal-f3-unit').value = '';
  document.getElementById('modal-f4-val').value = '';
  document.getElementById('modal-f4-unit').value = '';
  document.getElementById('modal-basis-pengali').value = 'NONE';
  document.getElementById('modal-satuan-vol').value = 'Paket';

  calculateModalTotal();
  document.getElementById('modal-row').style.display = 'flex';
}

function closeRowModal() {
  document.getElementById('modal-row').style.display = 'none';
}

function calculateModalTotal() {
  const f1 = Number(document.getElementById('modal-f1-val').value) || 1;
  const f1u = document.getElementById('modal-f1-unit').value || '';
  const f2 = Number(document.getElementById('modal-f2-val').value) || 1;
  const f2u = document.getElementById('modal-f2-unit').value || '';
  const f3 = Number(document.getElementById('modal-f3-val').value) || 1;
  const f3u = document.getElementById('modal-f3-unit').value || '';
  const f4 = Number(document.getElementById('modal-f4-val').value) || 1;
  const f4u = document.getElementById('modal-f4-unit').value || '';

  const basis = document.getElementById('modal-basis-pengali').value;
  let mult = 1;
  let multLabel = '';
  if (basis === 'PPK') { mult = 19; multLabel = '19 Kec'; }
  else if (basis === 'PPS') { mult = 217; multLabel = '217 Desa'; }
  else if (basis === 'TPS_RKB') { mult = 1371; multLabel = '1.371 TPS'; }

  const parts = [];
  if (document.getElementById('modal-f1-val').value) parts.push(`${f1} ${f1u}`.trim());
  if (document.getElementById('modal-f2-val').value) parts.push(`${f2} ${f2u}`.trim());
  if (document.getElementById('modal-f3-val').value) parts.push(`${f3} ${f3u}`.trim());
  if (document.getElementById('modal-f4-val').value) parts.push(`${f4} ${f4u}`.trim());
  if (multLabel) parts.push(multLabel);

  const totalVol = f1 * (document.getElementById('modal-f2-val').value ? f2 : 1) * 
                        (document.getElementById('modal-f3-val').value ? f3 : 1) * 
                        (document.getElementById('modal-f4-val').value ? f4 : 1) * mult;
  const harga = Number(document.getElementById('modal-harga').value) || 0;
  const totalAnggaran = totalVol * harga;

  document.getElementById('modal-preview-formula').textContent = parts.join(' x ') || '-';
  document.getElementById('modal-preview-volume').textContent = formatNumber(totalVol) + ' ' + (document.getElementById('modal-satuan-vol').value || '');
  document.getElementById('modal-preview-total').textContent = formatRupiah(totalAnggaran);
}

async function submitRowForm() {
  const rowId = document.getElementById('modal-row-id').value;
  const periodeId = AppState.currentPeriode.id;

  const payload = {
    id: rowId ? Number(rowId) : undefined,
    uraian: document.getElementById('modal-uraian').value,
    pic_bagian: document.getElementById('modal-pic').value,
    target_scope: document.getElementById('modal-sasaran').value,
    kode_akun: document.getElementById('modal-akun').value,
    harga_satuan: Number(document.getElementById('modal-harga').value) || 0,
    f1_val: document.getElementById('modal-f1-val').value ? Number(document.getElementById('modal-f1-val').value) : null,
    f1_unit: document.getElementById('modal-f1-unit').value,
    f2_val: document.getElementById('modal-f2-val').value ? Number(document.getElementById('modal-f2-val').value) : null,
    f2_unit: document.getElementById('modal-f2-unit').value,
    f3_val: document.getElementById('modal-f3-val').value ? Number(document.getElementById('modal-f3-val').value) : null,
    f3_unit: document.getElementById('modal-f3-unit').value,
    f4_val: document.getElementById('modal-f4-val').value ? Number(document.getElementById('modal-f4-val').value) : null,
    f4_unit: document.getElementById('modal-f4-unit').value,
    basis_pengali: document.getElementById('modal-basis-pengali').value,
    satuan_vol: document.getElementById('modal-satuan-vol').value,
    level_indent: 4
  };

  try {
    await apiFetch(`/api/rkb/${periodeId}/row`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    closeRowModal();
    await loadRkbData();
    renderAllViews();
  } catch (err) {
    alert('Gagal menyimpan baris: ' + err.message);
  }
}

async function deleteRow(rowId) {
  if (!confirm('Apakah Anda yakin ingin menghapus baris belanja ini?')) return;
  try {
    await apiFetch(`/api/rkb/row/${rowId}`, { method: 'DELETE' });
    await loadRkbData();
    renderAllViews();
  } catch (err) {
    alert('Gagal menghapus baris: ' + err.message);
  }
}

// ============================================================================
// MODAL: BUAT USULAN REVISI
// ============================================================================

function openRevisionModal() {
  document.getElementById('modal-revisi').style.display = 'flex';
}

function closeRevisionModal() {
  document.getElementById('modal-revisi').style.display = 'none';
}

async function submitRevisionForm() {
  const currentId = AppState.currentPeriode.id;
  const payload = {
    nama_periode: document.getElementById('rev-nama-periode').value,
    versi_revisi: document.getElementById('rev-versi').value,
    dasar_pengesahan: document.getElementById('rev-dasar').value,
    nomor_ba_tapd: document.getElementById('rev-nomor-ba').value,
    tanggal_ba_tapd: document.getElementById('rev-tanggal-ba').value,
    catatan_revisi: document.getElementById('rev-catatan').value
  };

  try {
    const res = await apiFetch(`/api/periodes/${currentId}/clone-revision`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    closeRevisionModal();
    alert(`Usulan revisi baru "${res.periode.versi_revisi}" berhasil dibuat! Dokumen revisi baru ini sekarang AKTIF dan siap disesuaikan.`);
    await loadPeriodes();
    AppState.currentPeriode = res.periode;
    await loadRkbData();
    renderAllViews();
    switchView('view-rkb');
  } catch (err) {
    alert('Gagal menerbitkan usulan revisi: ' + err.message);
  }
}

function downloadExcel() {
  if (!AppState.currentPeriode) return;
  const url = `/api/export-excel/${AppState.currentPeriode.id}`;
  window.open(url, '_blank');
}

function exportExcelPeriode(periodeId) {
  const url = `/api/export-excel/${periodeId}`;
  window.open(url, '_blank');
}

// ============================================================================
// VIEW 4: MASTER DATA WILAYAH & AKUN (SSOT)
// ============================================================================

function switchMasterTab(tabId) {
  document.querySelectorAll('#view-master .tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('#view-master .tab-btn').forEach(el => el.classList.remove('active'));

  const content = document.getElementById(tabId);
  if (content) content.classList.add('active');

  const btn = document.querySelector(`#view-master .tab-btn[onclick*="${tabId}"]`);
  if (btn) btn.classList.add('active');
}

function renderMasterTabs() {
  if (!AppState.masters) return;
  const { kecamatans, desas, akuns, sbms, kuantitas } = AppState.masters;

  const desaByKec = {};
  for (const d of desas) {
    if (!desaByKec[d.kecamatan_id]) desaByKec[d.kecamatan_id] = [];
    desaByKec[d.kecamatan_id].push(d);
  }

  // 1. TAB MASTER PPK (19 KECAMATAN)
  const tbodyPpk = document.getElementById('table-master-ppk');
  if (tbodyPpk) {
    tbodyPpk.innerHTML = kecamatans.map((k, idx) => {
      const kecDesas = desaByKec[k.id] || [];
      const totalTps = kecDesas.reduce((a, b) => a + (Number(b.tps) || 0), 0);
      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td class="text-center" style="font-family: var(--font-mono); font-weight: 700;">${k.no_urut || (idx + 1)}</td>
          <td><strong>${k.nama}</strong></td>
          <td>${k.ketua_nama || '-'}</td>
          <td>${k.sekretaris_nama || '-'}</td>
          <td style="font-family: var(--font-mono);">${k.sekretaris_nip || '-'}</td>
          <td class="text-center"><span class="badge badge-secondary">${kecDesas.length} Desa</span></td>
          <td class="text-center"><span class="badge badge-primary">${formatNumber(totalTps)} TPS</span></td>
        </tr>
      `;
    }).join('');
  }

  // 2. TAB MASTER PPS (217 DESA / KELURAHAN)
  const selectPpsKec = document.getElementById('filter-pps-kec');
  if (selectPpsKec && selectPpsKec.options.length <= 1) {
    selectPpsKec.innerHTML = '<option value="ALL">-- Semua Kecamatan (217 Desa) --</option>' +
      kecamatans.map(k => `<option value="${k.id}">Kecamatan ${k.nama}</option>`).join('');
  }
  filterMasterPps();

  // 3. TAB AKUN
  const tbodyAkun = document.getElementById('table-master-akun');
  if (tbodyAkun) {
    tbodyAkun.innerHTML = akuns.map(a => `
      <tr>
        <td><code style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${a.kode}</code></td>
        <td><strong>${a.uraian}</strong></td>
        <td>${a.kelompok || '-'}</td>
        <td>${a.kategori_dn || '-'}</td>
      </tr>
    `).join('');
  }

  // 4. TAB SBM
  const tbodySbm = document.getElementById('table-master-sbm');
  if (tbodySbm) {
    tbodySbm.innerHTML = sbms.map(s => `
      <tr>
        <td><span class="badge badge-secondary">${s.kategori}</span></td>
        <td><strong>${s.uraian}</strong></td>
        <td>${s.satuan}</td>
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">${formatRupiah(s.nominal)}</td>
      </tr>
    `).join('');
  }

  // 5. TAB KUANTITAS
  const tbodyKuan = document.getElementById('table-master-kuantitas');
  if (tbodyKuan) {
    tbodyKuan.innerHTML = kuantitas.map(q => `
      <tr>
        <td><code style="font-family: var(--font-mono); font-weight: 700;">${q.kode}</code></td>
        <td><strong>${q.uraian}</strong></td>
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: var(--primary);">${formatNumber(q.nilai)}</td>
        <td>${q.satuan || ''}</td>
      </tr>
    `).join('');
  }
}

function filterMasterPps() {
  if (!AppState.masters) return;
  const { kecamatans, desas } = AppState.masters;
  const kecId = document.getElementById('filter-pps-kec')?.value || 'ALL';
  const keyword = (document.getElementById('search-pps-name')?.value || '').toLowerCase().trim();

  const kecMap = {};
  for (const k of kecamatans) kecMap[k.id] = k.nama;

  const filtered = desas.filter(d => {
    const matchKec = kecId === 'ALL' || String(d.kecamatan_id) === String(kecId);
    const matchName = d.nama.toLowerCase().includes(keyword) || (kecMap[d.kecamatan_id] || '').toLowerCase().includes(keyword);
    return matchKec && matchName;
  });

  const countBadge = document.getElementById('pps-count-badge');
  if (countBadge) countBadge.textContent = `${filtered.length} Desa`;

  const tbody = document.getElementById('table-master-pps');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 20px;">Tidak ada desa/kelurahan yang cocok.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((d, idx) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td><strong>Kecamatan ${kecMap[d.kecamatan_id] || '-'}</strong></td>
      <td><strong>${d.nama}</strong></td>
      <td>${d.ketua_nama || '-'}</td>
      <td class="text-center"><span class="badge badge-primary">${formatNumber(d.tps)} TPS</span></td>
      <td class="text-center"><span class="badge badge-secondary">${formatNumber(d.pantarlih || d.tps)} Petugas</span></td>
      <td class="text-center"><span class="badge badge-secondary">${formatNumber(d.kotak || (Number(d.tps) * 2))} Kotak</span></td>
    </tr>
  `).join('');
}

// ============================================================================
// VIEW 5: PENGATURAN SATKER & PEJABAT PENANDATANGAN
// ============================================================================

function renderSettings() {
  if (!AppState.masters || !AppState.masters.settings) return;
  const s = AppState.masters.settings;

  document.getElementById('set-nama-satker').value = s.nama_satker || '';
  document.getElementById('set-kode-satker').value = s.kode_satker || '';
  document.getElementById('set-kpa-nama').value = s.kpa_nama || '';
  document.getElementById('set-kpa-nip').value = s.kpa_nip || '';
  document.getElementById('set-kpa-jabatan').value = s.kpa_jabatan || '';
  document.getElementById('set-ppkom-nama').value = s.ppkom_nama || '';
  document.getElementById('set-ppkom-nip').value = s.ppkom_nip || '';
  document.getElementById('set-ppkom-jabatan').value = s.ppkom_jabatan || '';
  document.getElementById('set-bendahara-nama').value = s.bendahara_nama || '';
  document.getElementById('set-bendahara-nip').value = s.bendahara_nip || '';
  document.getElementById('set-bendahara-jabatan').value = s.bendahara_jabatan || '';
  document.getElementById('set-ketua-nama').value = s.ketua_kpu_nama || '';
  document.getElementById('set-ketua-jabatan').value = s.ketua_kpu_jabatan || '';
  document.getElementById('set-kota').value = s.kota_penandatangan || '';
}

async function saveSettingsForm() {
  const payload = {
    nama_satker: document.getElementById('set-nama-satker').value,
    kode_satker: document.getElementById('set-kode-satker').value,
    kpa_nama: document.getElementById('set-kpa-nama').value,
    kpa_nip: document.getElementById('set-kpa-nip').value,
    kpa_jabatan: document.getElementById('set-kpa-jabatan').value,
    ppkom_nama: document.getElementById('set-ppkom-nama').value,
    ppkom_nip: document.getElementById('set-ppkom-nip').value,
    ppkom_jabatan: document.getElementById('set-ppkom-jabatan').value,
    bendahara_nama: document.getElementById('set-bendahara-nama').value,
    bendahara_nip: document.getElementById('set-bendahara-nip').value,
    bendahara_jabatan: document.getElementById('set-bendahara-jabatan').value,
    ketua_kpu_nama: document.getElementById('set-ketua-nama').value,
    ketua_kpu_jabatan: document.getElementById('set-ketua-jabatan').value,
    kota_penandatangan: document.getElementById('set-kota').value
  };

  try {
    const res = await apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    alert(res.message);
    await loadMasters();
    renderAllViews();
  } catch (err) {
    alert('Gagal menyimpan pengaturan: ' + err.message);
  }
}
