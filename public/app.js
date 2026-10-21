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
  expandedNodes: new Set(),
  selectedRowId: null,
  targetAfterUrutan: null,
  filterTahapan: 'ALL', // 'ALL' | 'TAHAPAN_I' | 'TAHAPAN_II' | 'HONOR'
  filterPerubahan: 'ALL',
  revisionViewMode: 'STANDARD', // 'STANDARD' | 'SANDING'
  filters: {
    pic: 'SEMUA',
    sasaran: 'ALL',
    search: ''
  },
  searchDebounceTimer: null
};

// META DATA RESMI 5 SUBBAGIAN PELAKSANA KPU KABUPATEN NGAWI (SESUAI DASHBOARD)
const SUBBAG_META = {
  KUL: { code: 'KUL', name: 'Keuangan, Umum & Logistik (KUL)', color: '#3b82f6' },
  RENDATIN: { code: 'RENDATIN', name: 'Perencanaan, Data & Informasi (RENDATIN)', color: '#10b981' },
  TEKNIS: { code: 'TEKNIS', name: 'Teknis Penyelenggaraan Pemilu (TEKNIS)', color: '#8b5cf6' },
  HUKUM: { code: 'HUKUM', name: 'Hukum (HUKUM)', color: '#f59e0b' },
  PARSDM: { code: 'PARSDM', name: 'Partisipasi Masyarakat & SDM (PARSDM)', color: '#ec4899' }
};

// ============================================================================
// UTILITIES & DEFENSIVE DOM HELPERS
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

function setElText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text !== undefined && text !== null ? text : '';
}

function setElHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html !== undefined && html !== null ? html : '';
}

function setElVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val !== undefined && val !== null ? val : '';
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
    startServerClockTicker();
    await initAuth();
    await initGoogleAuth();
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
  await loadUsers();

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

async function loadUsers() {
  try {
    const usersRes = await apiFetch('/api/users');
    AppState.usersList = usersRes.users || [];

    setElText('badge-total-users', AppState.usersList.length);

    const switcher = document.getElementById('user-switcher');
    if (switcher) {
      switcher.innerHTML = AppState.usersList.map(u => `
        <option value="${u.username}" ${AppState.currentUser && AppState.currentUser.username === u.username ? 'selected' : ''}>[L${u.level}] ${u.nama_pejabat} (${u.username})</option>
      `).join('');
    }

    renderUsersTable();
  } catch (err) {
    console.warn('Gagal memuat daftar pengguna:', err.message);
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

  setElText('user-nama-pejabat', user.nama_pejabat);
  const switcher = document.getElementById('user-switcher');
  if (switcher) switcher.value = user.username;

  const roleEl = document.getElementById('user-role-badge');
  if (roleEl) {
    roleEl.textContent = `Level ${user.level}: ${user.role || user.role_id || 'User'}`;
    if (user.level === 0) {
      roleEl.className = 'user-role badge';
      roleEl.style.background = '#0f172a';
      roleEl.style.color = '#fff';
    } else if (user.level === 1) {
      roleEl.className = 'user-role badge badge-primary';
      roleEl.style.background = '';
      roleEl.style.color = '';
    } else if (user.level === 2) {
      roleEl.className = 'user-role badge badge-success';
      roleEl.style.background = '';
      roleEl.style.color = '';
    } else {
      roleEl.className = 'user-role badge badge-secondary';
      roleEl.style.background = '';
      roleEl.style.color = '';
    }
  }

  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) {
    if (user.username === 'emenje') avatarEl.textContent = '👨‍💻';
    else if (user.level === 0) avatarEl.textContent = '⚡';
    else if (user.level === 1) avatarEl.textContent = '👑';
    else if (user.level === 2) avatarEl.textContent = '🛠️';
    else avatarEl.textContent = '👔';
  }

  applyRolePermissionsToUI();
}

function applyRolePermissionsToUI() {
  const user = AppState.currentUser;
  if (!user) return;

  const roleBanner = document.getElementById('global-role-banner');
  if (roleBanner) {
    roleBanner.style.display = 'none';
  }

  // Wewenang Akses Menu Manajemen Pengguna di Sidebar
  const navUserMgmt = document.getElementById('nav-item-users');
  if (navUserMgmt) {
    if (user.level <= 1) {
      navUserMgmt.style.display = 'flex';
      navUserMgmt.removeAttribute('title');
    } else {
      navUserMgmt.style.display = 'none';
    }
  }

  // Wewenang Tambah Pengguna Button
  const btnTambahUser = document.getElementById('btn-tambah-user');
  if (btnTambahUser) {
    btnTambahUser.style.display = (user.level <= 1) ? 'inline-flex' : 'none';
  }
}

async function switchUser(username) {
  const targetUser = AppState.usersList.find(u => u.username === username);
  if (!targetUser) return;

  try {
    // Jika sedang login sebagai Developer (Level 0) atau Level 1, gunakan endpoint switch-user cepat
    if (AppState.currentUser && AppState.currentUser.level <= 1) {
      const res = await apiFetch('/api/switch-user', {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      localStorage.setItem('siprabu_token', res.token);
      AppState.currentUser = res.user;
    } else {
      const pwdMap = {
        emenje: 'emenje123',
        perencanaan: 'perencanaan123',
        staf_perencanaan: 'perencanaan123',
        op_perencanaan: 'perencanaan123',
        teknis: 'teknis123',
        hukum: 'hukum123',
        parmas: 'parmas123',
        kul: 'kul123',
        sekretaris: 'sekretaris123',
        komisioner: 'komisioner123'
      };
      const pass = pwdMap[username] || `${username}123`;
      await performLogin(username, pass);
    }

    updateUserNavbar();
    renderUsersTable();
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
// MODUL INTEGRASI GOOGLE SIGN-IN (OAUTH 2.0) & MODAL LOGIN
// ============================================================================

let googleAuthConfig = { enabled: false, client_id: '', allowed_domains: '' };

async function initGoogleAuth() {
  try {
    const res = await apiFetch('/api/auth/google/config');
    googleAuthConfig = res;
    renderGoogleButton();
  } catch (err) {
    console.warn('Gagal memuat konfigurasi Google Auth:', err.message);
  }
}

function renderGoogleButton() {
  const container = document.getElementById('google-btn-wrapper');
  const hint = document.getElementById('google-hint');
  if (!container) return;

  if (googleAuthConfig.client_id && window.google && window.google.accounts && window.google.accounts.id) {
    container.innerHTML = '';
    try {
      google.accounts.id.initialize({
        client_id: googleAuthConfig.client_id,
        callback: handleGoogleSignInCallback,
        auto_select: false
      });
      google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: 320
      });
      if (hint) {
        hint.innerHTML = `Domain diizinkan: <strong>${escapeHtml(googleAuthConfig.allowed_domains || 'kpu.go.id, gmail.com')}</strong>`;
      }
    } catch (e) {
      console.warn('GSI renderButton error:', e);
    }
  } else if (!googleAuthConfig.client_id) {
    container.innerHTML = `
      <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 10px 14px; border-radius: 8px; font-size: 11.5px; color: #64748b; width: 100%;">
        ℹ️ Google Client ID belum diatur.<br>
        Atur di menu <strong>Database ➔ Pengaturan Satker KPU</strong> untuk mengaktifkan Google Sign-In.
      </div>
    `;
    if (hint) hint.innerHTML = '';
  }
}

async function handleGoogleSignInCallback(response) {
  if (!response || !response.credential) {
    showToast('Gagal menerima token kredensial Google.', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential: response.credential })
    });

    if (res.success && res.token) {
      localStorage.setItem('siprabu_token', res.token);
      AppState.currentUser = res.user;
      updateUserNavbar();
      closeLoginModal();
      showToast(res.message || `Selamat datang, ${res.user.nama_pejabat}!`, 'success');
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } else {
      showToast(res.error || 'Login Google gagal.', 'error');
      alert(res.error || 'Login Google gagal.');
    }
  } catch (err) {
    showToast(err.message || 'Terjadi kesalahan saat verifikasi akun Google.', 'error');
    alert(err.message);
  }
}

function openLoginModal() {
  const m = document.getElementById('modal-login');
  if (m) {
    m.style.display = 'flex';
    renderGoogleButton();
  }
}

function closeLoginModal() {
  const m = document.getElementById('modal-login');
  if (m) m.style.display = 'none';
}

async function submitLocalLoginForm() {
  const username = document.getElementById('login-modal-username')?.value?.trim();
  const password = document.getElementById('login-modal-password')?.value;

  if (!username || !password) {
    showToast('Username dan kata sandi wajib diisi.', 'error');
    return;
  }

  try {
    await performLogin(username, password);
    closeLoginModal();
    showToast(`Berhasil login sebagai ${AppState.currentUser.nama_pejabat}!`, 'success');
    await loadMasters();
    await loadRkbData();
    renderAllViews();
  } catch (err) {
    showToast(err.message || 'Username atau kata sandi salah.', 'error');
    alert(err.message || 'Username atau kata sandi salah.');
  }
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
  if (!AppState.currentPeriode) {
    try {
      const actRes = await apiFetch('/api/periodes/active');
      if (actRes && actRes.periode) {
        AppState.currentPeriode = actRes.periode;
      }
    } catch (e) {}
    if (!AppState.currentPeriode && AppState.periodesList.length > 0) {
      AppState.currentPeriode = AppState.periodesList[AppState.periodesList.length - 1];
    }
  }
  if (AppState.currentPeriode) {
    const matched = AppState.periodesList.find(x => x.id === AppState.currentPeriode.id);
    if (matched) {
      AppState.currentPeriode = matched;
    }
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

  setElText('context-nama-dokumen', p.nama_periode);
  const badge = document.getElementById('context-badge-status');
  const dot = document.getElementById('context-dot');
  const banner = document.getElementById('global-lock-banner');

  const isPra = p.tahap_revisi === 'PRA_NPHD';
  const isNphdInduk = p.dasar_pengesahan === 'NPHD' || p.tahap_revisi === 'RKB_AWAL';

  if (p.is_locked) {
    if (badge) {
      if (isPra) {
        badge.textContent = `🔒 ARSIP PRA-NPHD (${p.dasar_pengesahan || 'USULAN'})`;
        badge.className = 'context-status badge badge-warning';
      } else if (isNphdInduk) {
        badge.textContent = '🏛️ NPHD SAH (BASELINE)';
        badge.className = 'context-status badge badge-danger';
      } else {
        badge.textContent = `🔒 REVISI TERKUNCI (${p.dasar_pengesahan || 'BA TAPD'})`;
        badge.className = 'context-status badge badge-info';
      }
    }
    if (dot) dot.className = 'pulse-dot locked';
    if (banner) {
      banner.style.display = 'flex';
      const faseTxt = isPra ? 'PRA-NPHD' : (isNphdInduk ? 'NPHD SAH' : 'PASCA-NPHD');
      setElText('lock-banner-title', `DOKUMEN ${(p.versi_revisi || '').toUpperCase()} TELAH DIKUNCI (${faseTxt})`);
      setElText('lock-banner-desc', `Dokumen RKB "${p.nama_periode}" berada dalam mode READ-ONLY (Dasar: ${p.dasar_pengesahan || '-'}). Perubahan rincian dapat dilakukan melalui "Buat Usulan Revisi Baru" atau Buka Kunci di Pusat Siklus.`);
    }
  } else {
    if (badge) {
      if (isPra) {
        badge.textContent = '🌿 DRAFT PRA-NPHD';
      } else if (isNphdInduk) {
        badge.textContent = '🟢 DRAFT NPHD INDUK';
      } else {
        badge.textContent = '🔄 DRAFT REVISI AKTIF';
      }
      badge.className = 'context-status badge badge-success';
    }
    if (dot) dot.className = 'pulse-dot active';
    if (banner) banner.style.display = 'none';
  }
}

// ============================================================================
// SIDEBAR & VIEW SWITCHER (SAKTI KEMENKEU STYLE)
// ============================================================================

function toggleSidebarFolder(folderId, event) {
  if (event) event.stopPropagation();
  const el = document.getElementById(folderId);
  if (el) el.classList.toggle('collapsed');
}

function toggleSidebarCollapse() {
  const sidebar = document.getElementById('main-sidebar');
  const btn = document.getElementById('sidebar-collapse-btn');
  if (!sidebar) return;
  sidebar.classList.toggle('collapsed');
  const isCollapsed = sidebar.classList.contains('collapsed');
  if (btn) {
    btn.innerHTML = isCollapsed ? '<span class="toggle-icon">❯</span>' : '<span class="toggle-icon">❮</span>';
    btn.title = isCollapsed ? 'Buka Menu (SAKTI Style)' : 'Lipat Menu (SAKTI Style)';
  }
}

function filterSidebarMenu() {
  const query = (document.getElementById('menu-search-input')?.value || '').toLowerCase().trim();
  const navItems = document.querySelectorAll('#sidebar-nav-menu .nav-item');
  const groups = document.querySelectorAll('#sidebar-nav-menu .sakti-tree-group');

  if (!query) {
    navItems.forEach(item => item.style.display = '');
    groups.forEach(g => {
      g.style.display = '';
    });
    return;
  }

  groups.forEach(g => {
    let hasMatch = false;
    const children = g.querySelectorAll('.nav-item');
    children.forEach(item => {
      const text = item.textContent.toLowerCase();
      if (text.includes(query)) {
        item.style.display = '';
        hasMatch = true;
      } else {
        item.style.display = 'none';
      }
    });
    if (hasMatch) {
      g.style.display = '';
      g.classList.remove('collapsed');
    } else {
      g.style.display = 'none';
    }
  });

  // Top level direct items
  document.querySelectorAll('#sidebar-nav-menu > .nav-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(query) ? '' : 'none';
  });
}

function startServerClockTicker() {
  function updateClock() {
    const now = new Date();
    const hariIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const bulanIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const hari = hariIndo[now.getDay()];
    const tanggal = now.getDate();
    const bulan = bulanIndo[now.getMonth()];
    const tahun = now.getFullYear();
    const jam = String(now.getHours()).padStart(2, '0');
    const menit = String(now.getMinutes()).padStart(2, '0');
    const detik = String(now.getSeconds()).padStart(2, '0');
    
    const clockText = `${hari}, ${tanggal} ${bulan} ${tahun} ${jam}:${menit}:${detik} (Waktu Server)`;
    const el = document.getElementById('server-clock-text');
    if (el) el.textContent = clockText;
  }
  updateClock();
  setInterval(updateClock, 1000);
}

function switchView(viewId) {
  AppState.activeView = viewId;
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => {
    const isActive = btn.getAttribute('data-view') === viewId;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      const parentGroup = btn.closest('.sakti-tree-group');
      if (parentGroup) parentGroup.classList.remove('collapsed');
    }
  });

  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.add('active');

  if (viewId === 'view-dashboard') renderDashboard();
  else if (viewId === 'view-siklus') renderSiklus();
  else if (viewId === 'view-rkb') renderRkbTable();
  else if (viewId === 'view-db-ppk') renderDbPpk();
  else if (viewId === 'view-db-pps') renderDbPps();
  else if (viewId === 'view-db-paslon') renderDbPaslon();
  else if (viewId === 'view-db-kuantitas') renderDbKuantitas();
  else if (viewId === 'view-db-sbm') renderDbSbm();
  else if (viewId === 'view-db-bas') renderDbBas();
  else if (viewId === 'view-db-regulasi') { /* static info */ }
  else if (viewId === 'view-db-settings' || viewId === 'view-settings') renderSettings();
  else if (viewId === 'view-panduan') { /* static info */ }
  else if (viewId === 'view-monitoring') loadMonitoringReport();
  else if (viewId === 'view-users') renderUsersTable();
}

function renderAllViews() {
  updateContextNavbar();
  renderDashboard();
  renderSiklus();
  renderRkbTable();
  renderDbPpk();
  renderDbPps();
  renderDbPaslon();
  renderDbKuantitas();
  renderDbSbm();
  renderDbBas();
  renderSettings();
  renderUsersTable();
  applyRolePermissionsToUI();
}

// ============================================================================
// VIEW 1: DASHBOARD KPI EKSEKUTIF
// ============================================================================

function renderDashboard() {
  if (!AppState.rkbData || !AppState.rkbData.summary) return;
  const { summary, periode } = AppState.rkbData;

  // Sinkronisasi pemilih versi dokumen di dashboard
  const pSelect = document.getElementById('dashboard-periode-select');
  if (pSelect && AppState.periodesList) {
    pSelect.innerHTML = AppState.periodesList.map(item => `
      <option value="${item.id}" ${item.id === periode.id ? 'selected' : ''}>
        ${item.is_locked ? '🔒' : '✏️'} ${item.versi_revisi} (${item.nama_periode})
      </option>
    `).join('');
  }

  setElText('kpi-total-pagu', formatRupiah(summary.grandTotal));
  setElText('kpi-total-items', formatNumber(summary.totalItems) + ' Baris');
  setElText('kpi-total-rows', formatNumber(summary.totalRows) + ' Total Komponen Hierarki');
  setElText('badge-total-items', formatNumber(summary.totalItems));
  setElText('kpi-status-dokumen', periode.is_locked ? 'Status: Terkunci (NPHD Sah)' : 'Status: Draft Aktif');

  const paguKab = (summary.bySasaran && summary.bySasaran.KAB) || 0;
  const paguAdhoc = ((summary.bySasaran && summary.bySasaran.PPK) || 0) +
                    ((summary.bySasaran && summary.bySasaran.PPS) || 0) +
                    ((summary.bySasaran && summary.bySasaran.TPS) || 0) +
                    ((summary.bySasaran && summary.bySasaran.PANTARLIH) || 0);

  setElText('kpi-pagu-kab', formatRupiah(paguKab));
  setElText('kpi-pagu-adhoc', formatRupiah(paguAdhoc));

  const pctKab = summary.grandTotal > 0 ? ((paguKab / summary.grandTotal) * 100).toFixed(2) : '0';
  const pctAdhoc = summary.grandTotal > 0 ? ((paguAdhoc / summary.grandTotal) * 100).toFixed(2) : '0';

  setElText('kpi-pct-kab', `${pctKab}% dari Pagu Total`);
  setElText('kpi-pct-adhoc', `${pctAdhoc}% (PPK, PPS, TPS, Pantarlih)`);

  // Subbag Distribution List
  const subbagList = document.getElementById('subbag-distribution-list');
  if (subbagList && summary.bySubbag) {
    subbagList.innerHTML = Object.entries(summary.bySubbag).map(([pic, amt]) => {
      const meta = SUBBAG_META[pic] || { name: pic, color: '#64748b' };
      const pct = summary.grandTotal > 0 ? ((amt / summary.grandTotal) * 100).toFixed(2) : '0';
      return `
        <div class="subbag-progress-item">
          <div class="subbag-meta">
            <span class="subbag-name">${meta.name}</span>
            <span class="subbag-amount">${formatRupiah(amt)} (${pct}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-bar" style="width: ${pct}%; background-color: ${meta.color};"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Sasaran Table
  const sasaranBody = document.getElementById('table-sasaran-body');
  if (sasaranBody && summary.bySasaran) {
    const sasaranOrder = ['KAB', 'PPK', 'PPS', 'TPS', 'PANTARLIH', 'PESERTA'];
    sasaranBody.innerHTML = sasaranOrder.map(s => {
      const amt = summary.bySasaran[s] || 0;
      const pct = summary.grandTotal > 0 ? ((amt / summary.grandTotal) * 100).toFixed(2) : '0';
      return `
        <tr>
          <td><span class="badge badge-sasaran-${s.toLowerCase()}">${s}</span></td>
          <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">${formatRupiah(amt)}</td>
          <td class="text-right" style="font-family: var(--font-mono);">${pct}%</td>
        </tr>
      `;
    }).join('');
  }

  // Akun BAS Table
  const akunBody = document.getElementById('table-akun-body');
  if (akunBody && summary.byAkun) {
    const akunsMap = {};
    if (AppState.masters && AppState.masters.akuns) {
      for (const a of AppState.masters.akuns) akunsMap[a.kode] = a.uraian;
    }
    const sortedAkun = Object.entries(summary.byAkun).sort((a, b) => a[0].localeCompare(b[0]));
    let totAkun = 0;
    const rowsHtml = sortedAkun.map(([code, amt]) => {
      totAkun += amt;
      const desc = akunsMap[code] || 'Belanja Terkait';
      const pct = summary.grandTotal > 0 ? ((amt / summary.grandTotal) * 100).toFixed(2) : '0';
      return `
        <tr>
          <td><code style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${code}</code></td>
          <td>${desc}</td>
          <td class="text-right" style="font-family: var(--font-mono); font-weight: 700;">${formatRupiah(amt)}</td>
          <td class="text-right" style="font-family: var(--font-mono);">${pct}%</td>
        </tr>
      `;
    }).join('');

    const totalRowHtml = `
      <tr style="background: rgba(14, 165, 233, 0.12); font-weight: 700; border-top: 2px solid var(--accent); border-bottom: 2px solid var(--accent);">
        <td colspan="2" style="font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL BAGAN AKUN STANDAR (BAS)</td>
        <td class="text-right" style="font-family: var(--font-mono); font-size: 1rem; color: var(--accent);">${formatRupiah(totAkun)}</td>
        <td class="text-right" style="font-family: var(--font-mono); font-size: 1rem; color: var(--accent);">100.00%</td>
      </tr>
    `;
    akunBody.innerHTML = rowsHtml + totalRowHtml;
  }

  if (AppState.masters && AppState.masters.settings) {
    const s = AppState.masters.settings;
    setElText('satker-name-header', (s.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase());
  }
}

// ============================================================================
// VIEW 2: PUSAT SIKLUS & RIWAYAT DOKUMEN
// ============================================================================

function renderSiklus() {
  const p = AppState.currentPeriode;
  if (!p) return;

  const baselineItem = AppState.periodesList.find(x => x.revisi_ke === 0) || AppState.periodesList[0];
  const baselinePagu = baselineItem ? (baselineItem.total_pagu || 49999999000) : 49999999000;

  setElText('siklus-nama-dokumen', p.nama_periode);
  setElText('siklus-versi-revisi', p.versi_revisi);
  setElText('siklus-dasar-pengesahan', p.dasar_pengesahan || 'Kertas Kerja Penyusunan');
  setElText('siklus-nomor-ba', p.nomor_ba_tapd || '-');
  setElText('siklus-tanggal-ba', p.tanggal_ba_tapd || '-');
  setElText('siklus-catatan', p.catatan_revisi || 'Dokumen Rujukan Induk RKB Pilkada 2024 (Baseline)');

  const badgeBox = document.getElementById('lifecycle-badge');
  if (badgeBox) {
    const isPra = p.tahap_revisi === 'PRA_NPHD';
    const isBaseline = p.revisi_ke === 0 || p.tahap_revisi === 'RKB_AWAL';
    if (p.is_locked) {
      if (isPra) {
        badgeBox.innerHTML = `<span class="badge" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-size: 13px; font-weight:700;">🔒 ARSIP PRA-PERENCANAAN (${p.dasar_pengesahan || 'USULAN'})</span>`;
      } else if (isBaseline) {
        badgeBox.innerHTML = '<span class="badge badge-danger" style="font-size: 13px; font-weight:700;">🏛️ TERKUNCI (RKB PILKADA 2024 - BASELINE RUJUKAN INDUK)</span>';
      } else {
        badgeBox.innerHTML = `<span class="badge" style="background:#fdf4ff;color:#86198f;border:1px solid #f0abfc;font-size: 13px; font-weight:700;">🔒 ARSIP USULAN REVISI RESMI (${p.dasar_pengesahan || 'BA TAPD'})</span>`;
      }
    } else {
      if (isPra) {
        badgeBox.innerHTML = '<span class="badge badge-success" style="font-size: 13px;">🌿 DRAFT PRA-PERENCANAAN (LEMBAR KERJA TERBUKA)</span>';
      } else if (isBaseline) {
        badgeBox.innerHTML = '<span class="badge badge-success" style="font-size: 13px;">🟢 DRAFT RKB PILKADA 2024 (LEMBAR KERJA AKTIF)</span>';
      } else {
        badgeBox.innerHTML = '<span class="badge badge-success" style="font-size: 13px;">🔄 DRAFT USULAN REVISI AKTIF (LEMBAR KERJA TERBUKA)</span>';
      }
    }
  }

  const actionContainer = document.getElementById('lifecycle-action-buttons');
  const user = AppState.currentUser;
  const canManage = user && (user.level === 0 || user.level === 1);

  const btnBuatRevisi = document.getElementById('btn-buat-revisi');
  if (btnBuatRevisi) {
    btnBuatRevisi.style.display = canManage ? 'inline-flex' : 'none';
  }

  if (actionContainer) {
    let buttonsHtml = '';
    if (canManage) {
      if (p.is_locked) {
        buttonsHtml += `
          <button class="btn btn-warning" onclick="toggleLockPeriode(${p.id}, false)">
            🔓 Buka Kunci Dokumen
          </button>
        `;
      } else {
        buttonsHtml += `
          <button class="btn btn-danger" onclick="toggleLockPeriode(${p.id}, true)">
            🔒 Kunci Dokumen (Tetapkan Arsip Resmi)
          </button>
        `;
      }

      buttonsHtml += `
        <button class="btn btn-outline-secondary" onclick="openEditLegalitasModal(${p.id})">
          ✏️ Ubah Dasar &amp; Legalitas
        </button>
      `;
    }

    buttonsHtml += `
      <button class="btn btn-primary" onclick="selectPeriodeAndSwitch(${p.id})">
        📘 Buka di Lembar Kerja RKB
      </button>
      <button class="btn btn-outline-primary" onclick="downloadExcel()">
        📥 Unduh Excel Resmi
      </button>
    `;

    actionContainer.innerHTML = buttonsHtml;
  }

  // Matriks Komparasi Dokumen Revisi vs Baseline
  const compCard = document.getElementById('siklus-comparison-card');
  if (compCard) {
    const isRevision = p.revisi_ke > 0;
    if (isRevision) {
      compCard.style.display = 'block';
      const curPagu = p.total_pagu || 0;
      const netDiff = curPagu - baselinePagu;

      setElText('comp-val-baseline', formatRupiah(baselinePagu));
      setElText('comp-val-current', formatRupiah(curPagu));
      setElText('comp-sub-current', `Versi: ${p.versi_revisi} (${p.dasar_pengesahan || 'BA TAPD'})`);

      const diffEl = document.getElementById('comp-val-diff');
      const diffSubEl = document.getElementById('comp-sub-diff');
      if (diffEl) {
        if (netDiff > 0) {
          diffEl.style.color = '#15803d';
          diffEl.textContent = `+ ${formatRupiah(netDiff)}`;
          if (diffSubEl) diffSubEl.textContent = 'Alokasi Bertambah (Peningkatan Belanja)';
        } else if (netDiff < 0) {
          diffEl.style.color = '#b91c1c';
          diffEl.textContent = `- ${formatRupiah(Math.abs(netDiff))}`;
          if (diffSubEl) diffSubEl.textContent = 'Alokasi Berkurang (Penghematan / Efisiensi)';
        } else {
          diffEl.style.color = '#475569';
          diffEl.textContent = 'Rp 0 (Tetap Seimbang)';
          if (diffSubEl) diffSubEl.textContent = 'Pagu Total Sama (Pergeseran Antar Akun)';
        }
      }

      // Prioritaskan ringkasan instan dari metadata periode (p.comparison_summary)
      // agar angka langsung tampil dalam 0ms tanpa menunggu download payload RKB
      const compSummary = p.comparison_summary || 
        ((AppState.rkbData?.periode?.id === p.id) ? AppState.rkbData?.revision_comparison : null);

      const breakdownEl = document.getElementById('comp-val-breakdown');
      if (breakdownEl) {
        if (compSummary && compSummary.summary) {
          const totalBaru = compSummary.total_baru ?? ((compSummary.log_detail || []).filter(x => x.status === 'BARU').length);
          breakdownEl.innerHTML = `
            <div style="color:#166534;">🟢 Bertambah: <strong>+${formatRupiah(compSummary.summary.deltaBertambah || 0)}</strong></div>
            <div style="color:#991b1b;">🔴 Berkurang: <strong>-${formatRupiah(compSummary.summary.deltaBerkurang || 0)}</strong></div>
            <div style="color:#1e40af;">✨ Baris Baru: <strong>${totalBaru} Rincian</strong></div>
          `;
        } else {
          breakdownEl.textContent = 'Memuat perbandingan rincian...';
        }
      }
    } else {
      compCard.style.display = 'none';
    }
  }

  // History Table
  const historyTbody = document.getElementById('table-periode-history');
  if (historyTbody) {
    historyTbody.innerHTML = AppState.periodesList.map((item, idx) => {
      const isCurrent = item.id === p.id;
      const isItemBaseline = item.revisi_ke === 0;
      const itemPagu = item.total_pagu || 0;
      const itemDiff = isItemBaseline ? 0 : (itemPagu - baselinePagu);

      let selisihHtml = '<span class="badge" style="background:#f1f5f9;color:#475569;">🏛️ Baseline</span>';
      if (!isItemBaseline) {
        if (itemDiff > 0) {
          selisihHtml = `<span style="color:#15803d;font-weight:700;font-family:var(--font-mono);">+${formatRupiah(itemDiff)}</span>`;
        } else if (itemDiff < 0) {
          selisihHtml = `<span style="color:#b91c1c;font-weight:700;font-family:var(--font-mono);">${formatRupiah(itemDiff)}</span>`;
        } else {
          selisihHtml = `<span style="color:#64748b;font-weight:600;font-family:var(--font-mono);">Rp 0 (Seimbang)</span>`;
        }
      }

      const noUrut = idx + 1;
      const nomorBa = (item.nomor_ba_tapd && item.nomor_ba_tapd !== '-') ? item.nomor_ba_tapd : '';
      const tanggalBa = item.tanggal_ba_tapd || '';

      return `
        <tr class="${isCurrent ? 'table-row-selected' : ''}" style="cursor: pointer;" onclick="selectPeriode(${item.id})">
          <td class="text-center" style="font-family: var(--font-mono);">
            <span class="badge" style="background:#f1f5f9;color:#334155;font-weight:700;font-size:11.5px;padding:3px 7px;border:1px solid #cbd5e1;">
              #${noUrut}
            </span>
          </td>
          <td>
            <strong>${escHtml(item.nama_periode)}</strong>
            ${item.catatan_revisi ? `<div style="font-size:11px;color:#64748b;margin-top:2px;">💬 ${escHtml(item.catatan_revisi)}</div>` : ''}
          </td>
          <td><span class="badge badge-primary">${escHtml(item.versi_revisi)}</span></td>
          <td>
            <span class="badge" style="background:#eff6ff;color:#1e40af;font-weight:700;border:1px solid #bfdbfe;font-size:11px;">
              📄 ${escHtml(item.dasar_pengesahan || 'Kertas Kerja')}
            </span>
            <div style="font-size:11px;color:#475569;margin-top:3px;font-family:var(--font-mono);line-height:1.3;">
              ${nomorBa ? `<strong>No:</strong> ${escHtml(nomorBa)}` : '<span style="color:#94a3b8;">No: -</span>'}
              ${tanggalBa ? `<span style="color:#64748b;margin-left:4px;">(${escHtml(tanggalBa)})</span>` : ''}
            </div>
          </td>
          <td>
            <span class="badge ${item.is_locked ? 'badge-danger' : 'badge-success'}">
              ${item.is_locked ? '🔒 Terkunci' : '🟢 Draft Aktif'}
            </span>
          </td>
          <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: #1e3a8a;">
            ${formatRupiah(itemPagu)}
          </td>
          <td class="text-right">
            ${selisihHtml}
          </td>
          <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">
            ${formatNumber(item.total_items || 953)}
          </td>
          <td class="text-center" onclick="event.stopPropagation()">
            <div style="display:inline-flex;align-items:center;gap:6px;justify-content:center;white-space:nowrap;">
              ${canManage ? `
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="openEditLegalitasModal(${item.id}, event)" title="Ubah Dasar Pengesahan & Legalitas Dokumen Ini" style="font-size:11px;padding:4px 8px;font-weight:600;">
                  ✏️ Edit Dasar
                </button>
              ` : ''}
              <button type="button" class="btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-outline-primary'}" onclick="selectPeriodeAndSwitch(${item.id})" title="Buka lembar kerja RKB untuk dokumen ini" style="font-size:11px;padding:4px 8px;font-weight:600;">
                📘 ${isCurrent ? 'Buka di RKB' : 'Pilih & Buka'}
              </button>
              <button type="button" class="btn btn-sm btn-success" onclick="exportExcelPeriode(${item.id})" title="Unduh File Excel Dokumen Ini" style="font-size:11px;padding:4px 8px;font-weight:600;">
                📥 Excel
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function openEditLegalitasModal(periodeId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const p = (periodeId ? AppState.periodesList.find(x => x.id === Number(periodeId)) : null) || AppState.currentPeriode;
  if (!p) return;

  setElVal('edit-leg-periode-id', p.id);
  setElVal('edit-leg-nama', p.nama_periode || '');
  setElVal('edit-leg-versi', p.versi_revisi || '');
  setElVal('edit-leg-nomor-ba', p.nomor_ba_tapd || '');
  setElVal('edit-leg-tanggal-ba', p.tanggal_ba_tapd || '');
  setElVal('edit-leg-catatan', p.catatan_revisi || '');

  const sel = document.getElementById('edit-leg-dasar-select');
  const customInp = document.getElementById('edit-leg-dasar-custom');
  const dasarVal = p.dasar_pengesahan || 'Kertas Kerja Penyusunan';

  let found = false;
  if (sel) {
    for (let i = 0; i < sel.options.length; i++) {
      if (sel.options[i].value === dasarVal) {
        sel.selectedIndex = i;
        found = true;
        break;
      }
    }
    if (!found) {
      sel.value = 'CUSTOM';
      if (customInp) {
        customInp.style.display = 'block';
        customInp.value = dasarVal;
      }
    } else {
      if (customInp) {
        customInp.style.display = 'none';
        customInp.value = '';
      }
    }
  }

  const modal = document.getElementById('modal-edit-legalitas');
  if (modal) modal.style.display = 'flex';
}

function closeEditLegalitasModal() {
  const modal = document.getElementById('modal-edit-legalitas');
  if (modal) modal.style.display = 'none';
}

function onEditLegDasarSelectChange() {
  const sel = document.getElementById('edit-leg-dasar-select');
  const customInp = document.getElementById('edit-leg-dasar-custom');
  if (!sel || !customInp) return;
  if (sel.value === 'CUSTOM') {
    customInp.style.display = 'block';
    customInp.focus();
  } else {
    customInp.style.display = 'none';
  }
}

async function submitEditLegalitasForm() {
  const id = Number(document.getElementById('edit-leg-periode-id')?.value);
  if (!id) return;

  const nama = document.getElementById('edit-leg-nama')?.value.trim();
  const versi = document.getElementById('edit-leg-versi')?.value.trim();
  const sel = document.getElementById('edit-leg-dasar-select');
  const customInp = document.getElementById('edit-leg-dasar-custom');
  let dasar = sel ? sel.value : 'Kertas Kerja Penyusunan';
  if (dasar === 'CUSTOM') {
    dasar = customInp ? customInp.value.trim() : '';
  }
  const nomorBa = document.getElementById('edit-leg-nomor-ba')?.value.trim();
  const tanggalBa = document.getElementById('edit-leg-tanggal-ba')?.value;
  const catatan = document.getElementById('edit-leg-catatan')?.value.trim();

  try {
    const res = await fetch(`/api/periodes/${id}/legalitas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({
        nama_periode: nama,
        versi_revisi: versi,
        dasar_pengesahan: dasar,
        nomor_ba_tapd: nomorBa,
        tanggal_ba_tapd: tanggalBa,
        catatan_revisi: catatan
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Gagal menyimpan perubahan dasar legalitas.');
      return;
    }

    closeEditLegalitasModal();

    // Reload period list
    const pRes = await fetch('/api/periodes');
    const pData = await pRes.json();
    AppState.periodesList = pData.periodes || [];

    const updated = AppState.periodesList.find(x => x.id === id);
    if (AppState.currentPeriode && AppState.currentPeriode.id === id && updated) {
      AppState.currentPeriode = updated;
    }

    renderAllViews();
    alert('✅ Dasar pengesahan & legalitas dokumen berhasil diperbarui!');
  } catch (err) {
    alert(`Terjadi kesalahan: ${err.message}`);
  }
}

async function selectPeriode(periodeId) {
  const p = AppState.periodesList.find(x => x.id === periodeId);
  if (!p) return;
  AppState.currentPeriode = p;
  AppState.treeNodeOverrides = {};
  AppState.expandedNodes = new Set();

  // Optimistic UI render: instant feedback in 0 ms!
  updateContextNavbar();
  if (AppState.activeView === 'view-siklus') {
    renderSiklus();
  }

  await loadRkbData();
  renderAllViews();
}

async function selectPeriodeAndSwitch(periodeId) {
  await selectPeriode(periodeId);
  switchView('view-rkb');
}

async function toggleLockPeriode(periodeId, lockState) {
  const user = AppState.currentUser;
  if (!user || user.level > 1) {
    alert('Hanya Ketua KPU (Level 0) atau KPA/Sekretaris (Level 1) yang berwenang mengunci atau membuka kunci dokumen.');
    return;
  }

  if (lockState) {
    // Tampilkan modal kunci jika mengunci agar pengguna bisa memilih fase & dasar pengesahan
    openLockModal(periodeId);
  } else {
    // Buka kunci
    if (!confirm('Apakah Anda yakin ingin MEMBUKA KUNCI dokumen RKB ini?\n\nSetelah dibuka, dokumen akan kembali berstatus "LEMBAR KERJA AKTIF" sehingga rincian belanja dapat diedit kembali.')) return;

    try {
      const res = await apiFetch(`/api/periodes/${periodeId}/unlock`, {
        method: 'POST'
      });
      alert(res.message || 'Kunci dokumen berhasil dibuka! Dokumen kini kembali berstatus LEMBAR KERJA AKTIF.');
      await loadPeriodes();
      AppState.currentPeriode = AppState.periodesList.find(x => x.id === periodeId) || AppState.periodesList[0];
      await loadRkbData();
      renderAllViews();
    } catch (err) {
      alert('Gagal membuka kunci dokumen: ' + err.message);
    }
  }
}

// ============================================================================
// VIEW 3: RKB KABUPATEN (TREE HIERARKI SAKTI DINAMIS & SEMULA-MENJADI)
// ============================================================================

function buildTreeMaps(rows) {
  const parentMap = {};
  const childrenMap = {};
  const nodeMap = {};
  for (const r of rows) {
    nodeMap[r.tree_id] = r;
    parentMap[r.tree_id] = r.parent_tree_id;
    if (r.parent_tree_id) {
      if (!childrenMap[r.parent_tree_id]) childrenMap[r.parent_tree_id] = [];
      childrenMap[r.parent_tree_id].push(r.tree_id);
    }
  }
  return { parentMap, childrenMap, nodeMap };
}

function getDescendantIds(rootTreeId, childrenMap) {
  const desc = [];
  const stack = [rootTreeId];
  while (stack.length > 0) {
    const curr = stack.pop();
    const children = childrenMap[curr] || [];
    for (const ch of children) {
      desc.push(ch);
      stack.push(ch);
    }
  }
  return desc;
}

function collapseBranch(rootTreeId) {
  const rows = AppState.rkbData?.rows || [];
  const { childrenMap } = buildTreeMaps(rows);
  const descendants = getDescendantIds(rootTreeId, childrenMap);
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();
  AppState.expandedNodes.delete(rootTreeId);
  for (const id of descendants) {
    AppState.expandedNodes.delete(id);
  }
}

function expandBranchAll(rootTreeId) {
  const rows = AppState.rkbData?.rows || [];
  const { childrenMap, nodeMap } = buildTreeMaps(rows);
  const rootNode = nodeMap[rootTreeId];
  if (!rootNode) return;
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();

  // Pastikan seluruh leluhur baris ini terbuka
  let p = rootNode.parent_tree_id;
  while (p) {
    AppState.expandedNodes.add(p);
    const pNode = nodeMap[p];
    p = pNode ? pNode.parent_tree_id : null;
  }
  AppState.expandedNodes.add(rootTreeId);

  const descendants = getDescendantIds(rootTreeId, childrenMap);
  for (const dId of descendants) {
    const dNode = nodeMap[dId];
    if (dNode && dNode.has_children) {
      AppState.expandedNodes.add(dId);
    }
  }
}

function applyLevelToBranch(rootTreeId, targetLevel) {
  const rows = AppState.rkbData?.rows || [];
  const { childrenMap, nodeMap } = buildTreeMaps(rows);
  const rootNode = nodeMap[rootTreeId];
  if (!rootNode) return;
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();

  if (targetLevel <= rootNode.tree_level) {
    // Lipat cabang baris ini
    collapseBranch(rootTreeId);
    return;
  }

  // Buka seluruh leluhur baris ini
  let p = rootNode.parent_tree_id;
  while (p) {
    AppState.expandedNodes.add(p);
    const pNode = nodeMap[p];
    p = pNode ? pNode.parent_tree_id : null;
  }
  AppState.expandedNodes.add(rootTreeId);

  // Buka anak cucu yang levelnya < targetLevel, lipat yang >= targetLevel
  const descendants = getDescendantIds(rootTreeId, childrenMap);
  for (const dId of descendants) {
    const dNode = nodeMap[dId];
    if (dNode && dNode.has_children) {
      if (dNode.tree_level < targetLevel) {
        AppState.expandedNodes.add(dId);
      } else {
        AppState.expandedNodes.delete(dId);
      }
    }
  }
}

function applyLevelGlobally(targetLevel) {
  const rows = AppState.rkbData?.rows || [];
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();
  AppState.expandedNodes.clear();
  if (targetLevel <= 1) return; // Lipat semua hingga hanya Level 1 terlihat

  for (const r of rows) {
    if (r.has_children && r.tree_level < targetLevel) {
      AppState.expandedNodes.add(r.tree_id);
    }
  }
}

function collapseAllTree() {
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();
  AppState.expandedNodes.clear();
  AppState.selectedRowId = null;
  updateTreeToolbarActiveButtons('btnTreeCollapseAll');
  renderRkbTable();
}

function setTreeExpandLevel(lvl) {
  const targetLvl = Number(lvl);
  if (targetLvl === 0) {
    collapseAllTree();
    return;
  }
  applyLevelGlobally(targetLvl);
  updateTreeToolbarActiveButtons(targetLvl);
  renderRkbTable();
}

function updateTreeToolbarActiveButtons(target) {
  const sel = document.getElementById('selectTreeExpandLevel');
  if (sel) {
    if (typeof target === 'number') {
      sel.value = String(target);
    } else if (target === 'btnTreeCollapseAll') {
      sel.value = '0';
    }
  }
}

function getTahapTargetRow(tahapKey) {
  const rows = AppState.rkbData?.rows || [];
  if (tahapKey === 'TAHAPAN_I') {
    return rows.find(r => r.level_indent === 1 && r.kode === 'I.' && (r.uraian || '').includes('TAHAPAN'));
  } else if (tahapKey === 'TAHAPAN_II') {
    return rows.find(r => r.level_indent === 1 && r.kode === 'II.' && (r.uraian || '').includes('OPERASIONAL'));
  } else if (tahapKey === 'HONOR') {
    return rows.find(r => r.level_indent === 0 && r.kode === 'B' && (r.uraian || '').includes('HONORARIUM'));
  }
  return null;
}

function sorotTahapan(tahapKey) {
  AppState.filterTahapan = tahapKey;
  updateTahapanStripUI();

  if (tahapKey === 'ALL') {
    AppState.selectedRowId = null;
    renderRkbTable();
    return;
  }

  const targetRow = getTahapTargetRow(tahapKey);
  if (!targetRow) {
    renderRkbTable();
    return;
  }

  AppState.selectedRowId = targetRow.id;

  // Pastikan targetRow dan seluruh leluhurnya terbuka
  const rows = AppState.rkbData?.rows || [];
  const { nodeMap, childrenMap } = buildTreeMaps(rows);
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();

  let p = targetRow.parent_tree_id;
  while (p) {
    AppState.expandedNodes.add(p);
    p = nodeMap[p]?.parent_tree_id;
  }
  AppState.expandedNodes.add(targetRow.tree_id);

  // Buka anak-anak langsung di bawah tahapan ini (misal 28 Komponen Kegiatan)
  const children = childrenMap[targetRow.tree_id] || [];
  for (const chId of children) {
    AppState.expandedNodes.add(chId);
  }

  renderRkbTable();
  highlightAndScrollToRow(targetRow.id);
}

function updateTahapanStripUI() {
  const current = AppState.filterTahapan || 'ALL';
  const pills = [
    { key: 'ALL', id: 'pillTahapAll' },
    { key: 'TAHAPAN_I', id: 'pillTahap1' },
    { key: 'TAHAPAN_II', id: 'pillTahap2' },
    { key: 'HONOR', id: 'pillTahapHonor' }
  ];
  pills.forEach(p => {
    const el = document.getElementById(p.id);
    if (el) el.classList.toggle('active', p.key === current);
  });
}

function toggleTreeNode(treeId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();

  if (AppState.expandedNodes.has(treeId)) {
    collapseBranch(treeId);
  } else {
    // Buka node ini beserta leluhurnya
    const rows = AppState.rkbData?.rows || [];
    const { nodeMap } = buildTreeMaps(rows);
    let p = nodeMap[treeId]?.parent_tree_id;
    while (p) {
      AppState.expandedNodes.add(p);
      p = nodeMap[p]?.parent_tree_id;
    }
    AppState.expandedNodes.add(treeId);
  }
  renderRkbTable();
}

function isNodeExpanded(treeId) {
  if (AppState.filters.search && AppState.filters.search.trim()) {
    return true;
  }
  return Boolean(AppState.expandedNodes && AppState.expandedNodes.has(treeId));
}

function toggleRevisionSandingMode(checked) {
  AppState.revisionViewMode = checked ? 'SANDING' : 'STANDARD';
  renderRkbTable();
}

function expandAncestorsOfRow(rowId) {
  if (!AppState.rkbData || !AppState.rkbData.rows) return;
  const rows = AppState.rkbData.rows;
  const targetRow = rows.find(r => Number(r.id) === Number(rowId));
  if (!targetRow) return;

  const { parentMap } = buildTreeMaps(rows);
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();

  let p = targetRow.parent_tree_id;
  while (p) {
    AppState.expandedNodes.add(p);
    p = parentMap[p];
  }
}

function highlightAndScrollToRow(rowId) {
  const rowEl = document.getElementById('row-' + rowId);
  if (!rowEl) return;
  rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  rowEl.classList.remove('row-flash-highlight');
  void rowEl.offsetWidth; // Force reflow
  rowEl.classList.add('row-flash-highlight');
  setTimeout(() => {
    rowEl.classList.remove('row-flash-highlight');
  }, 3800);
}

function onFilterPerubahanChange() {
  const sel = document.getElementById('filter-perubahan');
  AppState.filterPerubahan = sel ? sel.value : 'ALL';
  renderRkbTable();
}

function selectRow(rowId, event) {
  if (event && event.target && (event.target.closest('button') || event.target.closest('.pic-chip') || event.target.closest('.akun-badge-inline'))) {
    return;
  }

  const rows = AppState.rkbData?.rows || [];
  const row = rows.find(r => Number(r.id) === Number(rowId));
  if (!row) return;

  const wasAlreadySelected = (AppState.selectedRowId === Number(rowId));
  AppState.selectedRowId = Number(rowId);

  // FUNGSI LIPATAN DINAMIS PER BARIS AKTIF:
  // Hanya baris yang sorot (aktif) yang terlipat dan terbuka
  if (row.has_children) {
    if (!AppState.expandedNodes) AppState.expandedNodes = new Set();
    if (!wasAlreadySelected) {
      // Jika baris baru disorot dan posisinya tertutup: buka cabang baris ini
      if (!AppState.expandedNodes.has(row.tree_id)) {
        const { nodeMap } = buildTreeMaps(rows);
        let p = row.parent_tree_id;
        while (p) {
          AppState.expandedNodes.add(p);
          p = nodeMap[p]?.parent_tree_id;
        }
        AppState.expandedNodes.add(row.tree_id);
      }
    } else {
      // Jika baris yang SEDANG AKTIF (sorot) diklik lagi: toggle lipat/buka secara cerdas
      if (AppState.expandedNodes.has(row.tree_id)) {
        collapseBranch(row.tree_id);
      } else {
        AppState.expandedNodes.add(row.tree_id);
      }
    }
  }

  renderRkbTable();
}

function expandActiveBranch(event) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  const rows = AppState.rkbData?.rows || [];
  const selectedRow = rows.find(r => r.id === AppState.selectedRowId);
  if (!selectedRow) return;
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();
  AppState.expandedNodes.add(selectedRow.tree_id);
  renderRkbTable();
}

function collapseActiveBranch(event) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  const rows = AppState.rkbData?.rows || [];
  const selectedRow = rows.find(r => r.id === AppState.selectedRowId);
  if (!selectedRow) return;
  collapseBranch(selectedRow.tree_id);
  renderRkbTable();
}

function expandActiveBranchAll(event) {
  if (event) { event.preventDefault(); event.stopPropagation(); }
  const rows = AppState.rkbData?.rows || [];
  const selectedRow = rows.find(r => r.id === AppState.selectedRowId);
  if (!selectedRow) return;
  expandBranchAll(selectedRow.tree_id);
  renderRkbTable();
}

function clearSelectedRow(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  AppState.selectedRowId = null;
  renderRkbTable();
}

function updateSelectedRowUI() {
  const rowId = AppState.selectedRowId;
  const pill = document.querySelector('.sakti-selected-pill');
  const actBox = document.getElementById('saktiActionButtons');
  if (!actBox) return;

  const user = AppState.currentUser;
  const isLocked = Boolean(AppState.currentPeriode?.is_locked);
  const rows = AppState.rkbData?.rows || [];
  const row = rows.find(r => Number(r.id) === Number(rowId));

  if (!row) {
    if (pill) {
      pill.style.display = 'none';
      pill.textContent = '';
    }
    if (!isLocked) {
      actBox.innerHTML = `
        <span style="font-size:12px;color:#64748b;font-style:italic;display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:#f8fafc;border-radius:5px;border:1px dashed #cbd5e1;">
          👉 Pilih salah satu baris di tabel untuk memilih level aksi (L1–L6)
        </span>
      `;
    } else {
      actBox.innerHTML = '';
    }
    return;
  }

  const cleanUraian = (row.uraian || '').substring(0, 48);
  let treeLvl = row.tree_level;
  if (!treeLvl) {
    if (row.is_header) {
      const lvl = Number(row.level_indent);
      if (lvl === 0) treeLvl = 1;
      else if (lvl === 1) treeLvl = 2;
      else if (lvl === 2) treeLvl = 3;
      else if (lvl >= 21 && lvl <= 25) treeLvl = 4;
      else if (lvl === 3) treeLvl = 5;
      else if (lvl === 41 || lvl === 42) treeLvl = 5.5;
      else treeLvl = 4;
    } else {
      treeLvl = 6;
    }
  }
  if (row.is_sub_header || row.level_indent === 41 || row.level_indent === 42) {
    treeLvl = 5.5;
  }

  const lvlBadges = {
    1: '<span class="badge" style="background:#fef3c7;color:#92400e;font-weight:800;border:1px solid #fde68a;font-size:10.5px;">L1 (Bagian)</span>',
    2: '<span class="badge" style="background:#fed7aa;color:#9a3412;font-weight:800;border:1px solid #fdba74;font-size:10.5px;">L2 (Tahapan)</span>',
    3: '<span class="badge" style="background:#fef08a;color:#854d0e;font-weight:800;border:1px solid #fde047;font-size:10.5px;">L3 (Kegiatan)</span>',
    4: '<span class="badge" style="background:#e0e7ff;color:#3730a3;font-weight:800;border:1px solid #c7d2fe;font-size:10.5px;">L4 (Sub-Komp)</span>',
    5: '<span class="badge" style="background:#e0f2fe;color:#0369a1;font-weight:800;border:1px solid #bae6fd;font-size:10.5px;">L5 (Akun BAS)</span>',
    5.5: '<span class="badge" style="background:#ecfdf5;color:#047857;font-weight:800;border:1px solid #a7f3d0;font-size:10.5px;">📑 Header Teks</span>',
    6: '<span class="badge" style="background:#f1f5f9;color:#334155;font-weight:800;border:1px solid #cbd5e1;font-size:10.5px;">L6 (Detail)</span>'
  };
  const badgeHtml = lvlBadges[treeLvl] || `<span class="badge">Level ${treeLvl}</span>`;

  const totalStr = row.computed_total ? ` • ${formatRupiah(row.computed_total)}` : '';
  const isExpanded = row.has_children ? isNodeExpanded(row.tree_id) : false;

  if (pill) {
    pill.style.display = 'inline-flex';
    pill.innerHTML = `${badgeHtml}&nbsp;<strong>[${row.kode || ('L' + treeLvl)}]</strong>&nbsp;${cleanUraian}&nbsp;<span style="font-family:var(--font-mono);font-size:11px;color:#0284c7;font-weight:700;">${totalStr}</span>&nbsp;<span onclick="clearSelectedRow(event)" style="cursor:pointer;margin-left:5px;font-weight:700;color:#ef4444;padding:0 2px;" title="Lepas sorotan baris aktif">✕</span>`;
    pill.title = `Baris Aktif: [L${treeLvl}] ${row.kode || ''} ${row.uraian || ''}${totalStr}.`;
  }

  let btns = '';

  // 1. Tombol Dinamis Lipat / Buka Khusus Baris Aktif Ini
  if (row.has_children) {
    if (isExpanded) {
      btns += `
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="collapseActiveBranch(event)" title="Lipat cabang baris aktif ini" style="font-weight:700;">
          📁 Lipat
        </button>
      `;
    } else {
      btns += `
        <button type="button" class="btn btn-sm btn-primary" onclick="expandActiveBranch(event)" title="Buka cabang baris aktif ini" style="font-weight:700;">
          📂 Buka
        </button>
      `;
    }
  }

  // 2. Tombol Kontekstual Rekam Berdasarkan Level (L1..L6)
  if (!isLocked) {
    const canEdit = checkCanEditRow(user, row, isLocked);
    if (canEdit) {
      if (treeLvl === 1) {
        // L1: Tambah L1 (Setingkat) + Tambah L2 (Sub-Level)
        btns += `
          <button class="btn btn-outline-primary btn-sm" onclick="openAddHeaderModal(1, ${row.id})" style="font-weight:600;" title="Tambah Bagian baru sejajar dengan baris ini">
            ➕ Tambah Bagian (L1)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddHeaderModal(2, ${row.id})" style="font-weight:700;" title="Tambah Tahapan baru di bawah Bagian ini">
            📂 Tambah Tahapan (L2)
          </button>
        `;
      } else if (treeLvl === 2) {
        // L2: Tambah L2 (Setingkat) + Tambah L3 (Sub-Level)
        btns += `
          <button class="btn btn-outline-primary btn-sm" onclick="openAddHeaderModal(2, ${row.id})" style="font-weight:600;" title="Tambah Tahapan baru sejajar dengan baris ini">
            ➕ Tambah Tahapan (L2)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddHeaderModal(3, ${row.id})" style="font-weight:700;" title="Tambah Kegiatan baru di bawah Tahapan ini">
            📂 Tambah Kegiatan (L3)
          </button>
        `;
      } else if (treeLvl === 3) {
        // L3: Tambah L3 (Setingkat) + Tambah L4 (Sub-Level)
        btns += `
          <button class="btn btn-outline-primary btn-sm" onclick="openAddHeaderModal(3, ${row.id})" style="font-weight:600;" title="Tambah Kegiatan baru sejajar dengan baris ini">
            ➕ Tambah Kegiatan (L3)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddHeaderModal(4, ${row.id})" style="font-weight:700;" title="Tambah Sub-Komponen baru di bawah Kegiatan ini">
            📂 Tambah Sub-Komp (L4)
          </button>
        `;
      } else if (treeLvl === 4) {
        // L4: Tambah L4 (Setingkat) + Tambah L5 (Akun BAS)
        btns += `
          <button class="btn btn-outline-primary btn-sm" onclick="openAddHeaderModal(4, ${row.id})" style="font-weight:600;" title="Tambah Sub-Komponen baru sejajar dengan baris ini">
            ➕ Tambah Sub-Komp (L4)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddAkunModal(${row.id})" style="font-weight:700;" title="Rekam Akun Belanja (BAS 6-Digit) di bawah Sub-Komponen ini">
            🏷️ Rekam Akun BAS (L5)
          </button>
        `;
      } else if (treeLvl === 5) {
        // L5 (Akun BAS): Tambah Akun Sejajar (L5) + Tambah Detail Belanja (L6) + Tambah Header Teks
        btns += `
          <button class="btn btn-outline-primary btn-sm" onclick="openAddAkunModal(${row.id})" style="font-weight:600;" title="Tambah Akun Belanja BAS baru sejajar dengan akun ini">
            🏷️ Tambah Akun Sejajar (L5)
          </button>
          <button class="btn btn-success btn-sm" onclick="openAddRowModalWithParent(${row.id})" style="font-weight:700;" title="Tambah Rincian/Detail Belanja di bawah akun ini">
            ➕ Tambah Detail Belanja (L6)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddHeaderModal(5.5, ${row.id})" style="font-weight:700;" title="Tambah Header Teks / Sub-Header Pengelompok (seperti a., b., Paket 1) di bawah akun ini">
            📑 Tambah Header Teks
          </button>
        `;
      } else if (treeLvl === 5.5) {
        // L5.5 (Header Teks / Sub-Header): Tambah Detail (L6) di bawahnya + Tambah Header Teks Sejajar + Ubah Teks + Hapus
        btns += `
          <button class="btn btn-success btn-sm" onclick="openAddRowModalWithParent(${row.id})" style="font-weight:700;" title="Tambah Rincian Belanja di bawah kelompok teks ini">
            ➕ Tambah Detail Belanja (L6)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddHeaderModal(5.5, ${row.id})" style="font-weight:700;" title="Tambah Header Teks Sejajar (misal: b. Kendaraan Dinas)">
            📑 Tambah Header Teks Sejajar
          </button>
          <button class="btn btn-outline-primary btn-sm" onclick="openEditHeaderModal(${row.id}, event)" style="font-weight:600;" title="Ubah Kode atau Uraian Teks">
            ✏️ Ubah Teks
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteRow(${row.id}, event)" style="font-weight:600;" title="Hapus Header Teks ini">
            🗑️ Hapus
          </button>
        `;
      } else if (treeLvl === 6) {
        // L6: Tambah L6 (Detail Sejajar) + Ubah + Hapus
        btns += `
          <button class="btn btn-success btn-sm" onclick="openAddRowModal()" style="font-weight:700;" title="Tambah Rincian Belanja baru sejajar dengan baris ini">
            ➕ Tambah Detail Sejajar (L6)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openRowModal(${row.id}, event)" style="font-weight:600;" title="Ubah Rincian Belanja ini">
            ✏️ Ubah Rincian
          </button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteRow(${row.id}, event)" style="font-weight:600;" title="Hapus Rincian Belanja ini">
            🗑️ Hapus
          </button>
        `;
      }

      // 3. Tombol Ordering Bounded: Geser Naik / Geser Turun
      btns += `
        <div class="btn-group" style="display:inline-flex;gap:2px;margin-left:4px;">
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="moveRowOrdering(${row.id}, 'UP')" title="Geser baris ini naik 1 posisi di dalam induknya" style="font-weight:700;padding:4px 8px;">
            🔼 Naik
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="moveRowOrdering(${row.id}, 'DOWN')" title="Geser baris ini turun 1 posisi di dalam induknya" style="font-weight:700;padding:4px 8px;">
            🔽 Turun
          </button>
        </div>
      `;
    }
  }

  actBox.innerHTML = btns;
}

function renderRkbTable() {
  if (!AppState.rkbData) return;
  const { rows, summary, periode, revision_comparison } = AppState.rkbData;
  const user = AppState.currentUser;
  const isLocked = Boolean(periode.is_locked);
  const hasParentRev = Boolean(revision_comparison && revision_comparison.has_parent);
  const isSanding = hasParentRev && AppState.revisionViewMode === 'SANDING';

  // Total footer
  const hasFilter = Boolean(AppState.filters.pic !== 'SEMUA' || AppState.filters.sasaran !== 'ALL' || (AppState.filters.search && AppState.filters.search.trim()));
  const displayTotal = (hasFilter && AppState.rkbData.filtered_summary) ? AppState.rkbData.filtered_summary.grandTotal : summary.grandTotal;
  setElText('rkb-tfoot-total', formatRupiah(displayTotal));

  // Update RUH Belanja Header Badges
  const statusBadge = document.getElementById('rkb-header-status-badge');
  if (statusBadge) {
    statusBadge.className = `badge ${isLocked ? 'badge-danger' : 'badge-success'}`;
    statusBadge.textContent = isLocked ? '🔒 Terkunci' : '🟢 Draft Aktif';
  }
  const versionBadge = document.getElementById('rkb-header-version-badge');
  if (versionBadge) {
    if (hasParentRev) {
      versionBadge.textContent = `Versi: ${periode.versi_revisi} (Pembanding: ${revision_comparison.parent_periode.versi_revisi})`;
    } else {
      versionBadge.textContent = `Versi: ${periode.versi_revisi || 'Dokumen Induk Baseline'}`;
    }
  }

  // Revision Sanding Toggle Visibility
  const lblSanding = document.getElementById('lblToggleSanding');
  if (lblSanding) {
    lblSanding.style.display = hasParentRev ? 'inline-flex' : 'none';
  }

  // Filter Perubahan Box Visibility (Hanya muncul jika ada dokumen pembanding)
  const filterBox = document.getElementById('filter-perubahan-box');
  if (filterBox) {
    filterBox.style.display = hasParentRev ? 'inline-flex' : 'none';
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

  const revByRowId = (revision_comparison && revision_comparison.by_row_id) || {};
  const filterPerubahan = hasParentRev ? (AppState.filterPerubahan || 'ALL') : 'ALL';
  const filterExpandedSet = new Set();
  const filterMatchedRowIds = new Set();

  if (hasParentRev && filterPerubahan !== 'ALL') {
    for (const r of rows) {
      const diffInfo = revByRowId[r.id];
      let matches = false;

      if (filterPerubahan === 'BARU' && diffInfo && diffInfo.status === 'BARU') {
        matches = true;
      } else if (filterPerubahan === 'BERTAMBAH' && diffInfo && diffInfo.status === 'BERTAMBAH') {
        matches = true;
      } else if (filterPerubahan === 'BERKURANG' && diffInfo && diffInfo.status === 'BERKURANG') {
        matches = true;
      } else if (filterPerubahan === 'CATATAN' && (r.catatan_revisi_baris || (diffInfo && diffInfo.catatan))) {
        matches = true;
      }

      if (matches) {
        filterMatchedRowIds.add(r.id);
        let p = r.parent_tree_id;
        while (p) {
          filterExpandedSet.add(p);
          p = parentMap[p];
        }
      }
    }
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

  // Pastikan Set expandedNodes terinisialisasi
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();
  if (AppState.expandedNodes.size === 0 && AppState.treeExpandLevel !== 1) {
    for (const r of rows) {
      if (r.tree_level === 1) AppState.expandedNodes.add(r.tree_id);
    }
  }

  // Filter Isolasi / Sorot Tahapan
  const filterTahap = AppState.filterTahapan || 'ALL';
  let allowedTahapTreeSet = null;
  if (filterTahap !== 'ALL') {
    const targetTahapRow = getTahapTargetRow(filterTahap);
    if (targetTahapRow) {
      const { childrenMap } = buildTreeMaps(rows);
      const desc = getDescendantIds(targetTahapRow.tree_id, childrenMap);
      allowedTahapTreeSet = new Set([targetTahapRow.tree_id, ...desc]);
      let p = targetTahapRow.parent_tree_id;
      while (p) {
        allowedTahapTreeSet.add(p);
        p = parentMap[p];
      }
    }
  }

  const isRowVisible = (r) => {
    if (searchQ) return true;
    if (allowedTahapTreeSet && !allowedTahapTreeSet.has(r.tree_id)) {
      return false;
    }
    if (filterPerubahan !== 'ALL') {
      if (!filterMatchedRowIds.has(r.id) && !filterExpandedSet.has(r.tree_id)) {
        return false;
      }
      return true;
    }
    let p = r.parent_tree_id;
    while (p) {
      if (!AppState.expandedNodes.has(p)) return false;
      p = parentMap[p];
    }
    return true;
  };

  let rowsHtml = '';
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx];
    if (!isRowVisible(r)) continue;

    const lvl = Number(r.level_indent);
    const isItem = !r.is_header;
    const isExpanded = isNodeExpanded(r.tree_id);
    const isSelected = AppState.selectedRowId === r.id;
    const diffInfo = revByRowId[r.id] || {
      status: 'TETAP', diff: 0,
      semula_vol: r.computed_volume, semula_harga: r.harga_satuan, semula_jumlah: r.computed_total,
      menjadi_vol: r.computed_volume, menjadi_harga: r.harga_satuan, menjadi_jumlah: r.computed_total,
      catatan: ''
    };
    const isNewlyAdded = Boolean(hasParentRev && diffInfo && diffInfo.status === 'BARU');

    const toggleChevron = r.has_children
      ? `<button type="button" class="tree-toggle-btn" onclick="toggleTreeNode('${r.tree_id}', event)" title="${isExpanded ? 'Lipat baris ini' : 'Buka cabang ini'}">${isExpanded ? '▾' : '▸'}</button>`
      : `<span style="display:inline-block;width:24px;"></span>`;

    const pic = (r.pic_bagian || 'KUL').toUpperCase();
    const picChip = `<span class="pic-chip pic-${pic}" onclick="openQuickPicModal(${r.id}, event)" title="Klik untuk mengubah Subbagian PIC baris ini">${pic}</span>`;
    const showPic = lvl >= 2 || isItem;

    const targetSas = (r.target_scope || 'KAB').toUpperCase();
    const sasChip = `<span class="scope-chip scope-${targetSas}">${targetSas}</span>`;

    const canEdit = checkCanEditRow(user, r, isLocked);

    if (isSanding) {

      let badgeClass = 'diff-tetap';
      let badgeLabel = '⚪ Tetap';
      if (diffInfo.status === 'BERTAMBAH') { badgeClass = 'diff-bertambah'; badgeLabel = '🟢 Bertambah'; }
      else if (diffInfo.status === 'BERKURANG') { badgeClass = 'diff-berkurang'; badgeLabel = '🔴 Berkurang'; }
      else if (diffInfo.status === 'BARU') { badgeClass = 'diff-baru'; badgeLabel = '✨ Baru'; }

      rowsHtml += `
        <tr id="row-${r.id}" class="${r.is_header ? 'rkb-row-lvl-' + lvl : ''} ${isSelected ? 'table-row-selected' : ''}" onclick="selectRow(${r.id}, event)">
          <td class="col-no text-center" style="font-family: var(--font-mono); font-size: 11px;">${r.urutan || (idx + 1)}</td>
          <td class="col-kode" style="font-family: var(--font-mono); font-weight: 700;">${r.kode || ''}</td>
          <td class="col-uraian" style="padding-left: ${r.effective_indent || 0}px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              ${toggleChevron}
              ${r.is_akun_row ? `<span class="akun-badge-inline" onclick="openQuickAkunModal(${r.id}, event)">[${r.kode_akun || r.kode || '521211'}]</span>` : ''}
              <span>${escHtml(r.uraian || '')}</span>
              ${isNewlyAdded ? `<span class="badge badge-purple" style="font-size:10px;margin-left:6px;padding:1px 6px;border-radius:4px;font-weight:600;" title="Baris belanja baru / tambahan">✨ BARU</span>` : ''}
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
            ${isItem ? `
              <div style="margin-top: 4px;">
                ${diffInfo.catatan ? `
                  <div class="catatan-revisi-chip" onclick="openQuickCatatanModal(${r.id}, event)" title="Klik untuk mengedit catatan justifikasi revisi" style="font-size:11px; color:#1e3a8a; background:#e0f2fe; border:1px solid #bae6fd; padding:3px 6px; border-radius:4px; cursor:pointer; line-height:1.3; display:inline-block; max-width:100%; word-break:break-word;">
                    📝 ${escHtml(diffInfo.catatan)}
                  </div>
                ` : (canEdit && diffInfo.status !== 'TETAP' ? `
                  <button type="button" class="btn-quick-catatan" onclick="openQuickCatatanModal(${r.id}, event)" title="Beri catatan alasan perubahan" style="font-size:10.5px; color:#475569; background:#f1f5f9; border:1px dashed #cbd5e1; padding:2px 6px; border-radius:4px; cursor:pointer;">
                    ➕ Beri Catatan
                  </button>
                ` : '')}
              </div>
            ` : ''}
          </td>
        </tr>
      `;
    } else {
      let aksiHtml = '';
      if (isItem) {
        if (canEdit) {
          aksiHtml = `
            <button class="btn btn-sm btn-primary" onclick="openRowModal(${r.id}, event)" title="Edit Rincian">✏️</button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteRow(${r.id}, event)" title="Hapus">🗑️</button>
          `;
        } else {
          aksiHtml = `<span class="text-muted" style="font-size: 11px;">🔒 Read-Only</span>`;
        }
      } else {
        if (canEdit && !isLocked) {
          if (lvl === 41 || lvl === 42) {
            // Header Teks (Level 5.5, seperti a. Kantor/Inventaris): Aksi Ubah Teks & Hapus
            aksiHtml = `
              <button class="btn btn-xs btn-outline-primary" onclick="openEditHeaderModal(${r.id}, event)" title="Ubah Teks Header ini" style="font-size:10px;padding:2px 5px;font-weight:700;border-radius:4px;">
                ✏️
              </button>
              <button class="btn btn-xs btn-outline-danger" onclick="deleteRow(${r.id}, event)" title="Hapus Header Teks ini" style="font-size:10px;padding:2px 5px;font-weight:700;border-radius:4px;margin-left:2px;">
                🗑️
              </button>
            `;
          }
          // Catatan: Seluruh penambahan baris hirarki L1..L6 dikelola terpusat lewat baris aktif di toolbar (#saktiActionButtons)
        }
      }

      rowsHtml += `
        <tr id="row-${r.id}" class="${r.is_header ? 'rkb-row-lvl-' + lvl : ''} ${isSelected ? 'table-row-selected' : ''}" onclick="selectRow(${r.id}, event)">
          <td class="col-no text-center" style="font-family: var(--font-mono); font-size: 11px;">${r.urutan || (idx + 1)}</td>
          <td class="col-kode" style="font-family: var(--font-mono); font-weight: 700;">${r.kode || ''}</td>
          <td class="col-uraian" style="padding-left: ${r.effective_indent || 0}px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              ${toggleChevron}
              ${r.is_akun_row ? `<span class="akun-badge-inline" onclick="openQuickAkunModal(${r.id}, event)" title="Klik untuk mengubah Akun Belanja ini">[${r.kode_akun || r.kode || '521211'}]</span>` : ''}
              <span>${escHtml(r.uraian || '')}</span>
              ${isNewlyAdded ? `<span class="badge badge-purple" style="font-size:10px;margin-left:6px;padding:1px 6px;border-radius:4px;font-weight:600;" title="Baris belanja baru / tambahan">✨ BARU</span>` : ''}
            </div>
            ${isItem && r.catatan_revisi_baris ? `<div style="font-size:11px;color:#1e40af;background:#eff6ff;border-left:2px solid #3b82f6;padding:2px 6px;margin:3px 0 0 28px;border-radius:2px;display:inline-block;"><span style="font-weight:600;">Catatan:</span> ${escHtml(r.catatan_revisi_baris)}</div>` : ''}
          </td>
          <td class="col-pic">${showPic ? picChip : ''}</td>
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
  updateSelectedRowUI();
}

function checkCanEditRow(user, row, isLocked) {
  if (!user) return false;
  if (isLocked) {
    if (user.level === 0) return true; // Developer bypass
    return false;
  }
  if (user.level === 0 || user.level === 1) return true;
  if (user.level === 3) return false;
  if (user.level === 2) {
    let userSub = (user.pic_subbag || '').toUpperCase();
    if (userSub === 'PERENCANAAN') userSub = 'RENDATIN';
    if (userSub === 'KEUANGAN') userSub = 'KUL';
    if (userSub === 'PARMAS') userSub = 'PARSDM';
    if (userSub === 'SEMUA') return true;

    let rowPic = (row.pic_bagian || '').toUpperCase();
    if (rowPic === 'PERENCANAAN') rowPic = 'RENDATIN';
    if (rowPic === 'KEUANGAN') rowPic = 'KUL';
    if (rowPic === 'PARMAS') rowPic = 'PARSDM';

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

  setElText('resume-sasaran-total-rp', formatRupiah(total));
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

  setElVal('quick-pic-row-id', row.id);
  setElVal('quick-pic-select', (row.pic_bagian || 'KUL').toUpperCase());

  const isHeader = Boolean(row.is_header);
  const lvl = Number(row.level_indent);
  const uraianEl = document.getElementById('quick-pic-uraian');
  const badgeEl = document.getElementById('quick-pic-level-badge');
  const cascadeBox = document.getElementById('quick-pic-cascade-box');
  const itemHint = document.getElementById('quick-pic-item-hint');
  const cascadeDesc = document.getElementById('quick-pic-cascade-desc');
  const cascadeCheck = document.getElementById('quick-pic-cascade');

  let lvlName = 'Rincian Belanja (Item Level 4/6)';
  if (lvl === 2) lvlName = 'Kegiatan (Level 2 / 3)';
  else if (lvl >= 21 && lvl <= 25) lvlName = 'Sub-Kegiatan (Level 4)';
  else if (lvl === 3) lvlName = 'Akun Belanja 6-Digit BAS (Level 3 / 5)';

  if (badgeEl) {
    badgeEl.innerHTML = `<span class="badge ${isHeader ? 'badge-primary' : 'badge-subtle'}" style="font-size:11px; padding:3px 8px;">${lvlName}</span>`;
  }

  if (uraianEl) {
    uraianEl.innerHTML = `<strong>${escHtml(row.kode ? `[${row.kode}] ` : '')}${escHtml(row.uraian)}</strong>`;
  }

  if (isHeader) {
    // Hitung jumlah baris anak di bawahnya secara dinamis
    const allRows = AppState.rkbData?.rows || [];
    const idx = allRows.findIndex(r => r.id === row.id);
    let childCount = 0;
    const targetRank = row.hierarchy_rank || (lvl === 2 ? 30 : (lvl === 3 ? 50 : 45));
    if (idx !== -1) {
      for (let i = idx + 1; i < allRows.length; i++) {
        const rRank = allRows[i].hierarchy_rank || (allRows[i].is_header ? (allRows[i].level_indent === 2 ? 30 : (allRows[i].level_indent === 3 ? 50 : 45)) : 99);
        if (rRank <= targetRank) break;
        childCount++;
      }
    }

    if (cascadeBox) cascadeBox.style.display = 'block';
    if (itemHint) itemHint.style.display = 'none';
    if (cascadeCheck) cascadeCheck.checked = true;
    if (cascadeDesc) {
      cascadeDesc.textContent = `Akan memperbarui ${childCount} baris anak (sub-kegiatan, akun belanja & rincian belanja) di bawah pohon ini secara serentak.`;
    }
  } else {
    if (cascadeBox) cascadeBox.style.display = 'none';
    if (itemHint) itemHint.style.display = 'block';
    if (cascadeCheck) cascadeCheck.checked = false;
  }

  document.getElementById('modal-quick-pic').style.display = 'flex';
}

function closeQuickPicModal() {
  document.getElementById('modal-quick-pic').style.display = 'none';
}

async function submitQuickPic() {
  const rowId = Number(document.getElementById('quick-pic-row-id')?.value);
  const pic = document.getElementById('quick-pic-select')?.value;
  const cascade = Boolean(document.getElementById('quick-pic-cascade')?.checked);
  const periodeId = AppState.currentPeriode.id;

  try {
    const res = await apiFetch(`/api/rkb/${periodeId}/quick-pic`, {
      method: 'POST',
      body: JSON.stringify({ row_id: rowId, pic_bagian: pic, cascade })
    });
    closeQuickPicModal();
    await loadRkbData();
    renderAllViews();
    if (res && res.count > 1) {
      alert(`Berhasil mengalihkan PIC menjadi ${pic} untuk ${res.count} baris belanja secara hierarkis (Top-Down Cascade).`);
    }
  } catch (err) {
    alert('Gagal mengubah PIC: ' + err.message);
  }
}

function openQuickAkunModal(rowId, event) {
  if (event) event.stopPropagation();
  const row = (AppState.rkbData?.rows || []).find(r => r.id === rowId);
  if (!row) return;

  setElVal('quick-akun-row-id', row.id);
  setElText('quick-akun-uraian', `[${row.kode || '-'}] ${row.uraian}`);
  setElVal('quick-akun-select', row.kode_akun || '521211');
  document.getElementById('modal-quick-akun').style.display = 'flex';
}

function closeQuickAkunModal() {
  document.getElementById('modal-quick-akun').style.display = 'none';
}

async function submitQuickAkun() {
  const rowId = Number(document.getElementById('quick-akun-row-id')?.value);
  const akun = document.getElementById('quick-akun-select')?.value;
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
// MODAL: CEPAT EDIT CATATAN JUSTIFIKASI REVISI BARIS (MODE SANDING)
// ============================================================================

function openQuickCatatanModal(rowId, event) {
  if (event) event.stopPropagation();
  const row = (AppState.rkbData?.rows || []).find(r => r.id === rowId);
  if (!row) return;

  setElVal('quick-catatan-row-id', row.id);
  setElText('quick-catatan-uraian', `[${row.kode || '-'}] ${row.uraian}`);
  setElVal('quick-catatan-input', row.catatan_revisi_baris || '');
  document.getElementById('modal-quick-catatan').style.display = 'flex';
}

function closeQuickCatatanModal() {
  document.getElementById('modal-quick-catatan').style.display = 'none';
}

async function submitQuickCatatan() {
  const rowId = Number(document.getElementById('quick-catatan-row-id')?.value);
  const catatan = document.getElementById('quick-catatan-input')?.value || '';
  const periodeId = AppState.currentPeriode.id;

  try {
    await apiFetch(`/api/rkb/${periodeId}/quick-catatan`, {
      method: 'POST',
      body: JSON.stringify({ row_id: rowId, catatan_revisi_baris: catatan })
    });
    closeQuickCatatanModal();
    await loadRkbData();
    renderAllViews();
  } catch (err) {
    alert('Gagal menyimpan catatan revisi: ' + err.message);
  }
}

// ============================================================================
// MODAL: FORM TAMBAH / EDIT BARIS BELANJA
// ============================================================================

function openRowModal(rowId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const row = AppState.rkbData.rows.find(r => r.id === rowId);
  if (!row) return;

  AppState.activeEditingRow = row;
  AppState.targetAfterUrutan = null;

  const posBox = document.getElementById('modal-row-pos-container');
  if (posBox) posBox.style.display = 'none';

  const isSub = Boolean(row.is_sub_header || row.level_indent === 41 || row.level_indent === 42);
  const chk = document.getElementById('modal-is-header-checkbox');
  if (chk) chk.checked = isSub;
  toggleModalHeaderMode(isSub);
  if (isSub) {
    setElVal('modal-header-kode-input', row.kode || '');
  }

  const ctxAlert = document.getElementById('modal-insertion-context');
  if (ctxAlert) {
    ctxAlert.style.display = 'block';
    ctxAlert.innerHTML = `✏️ <strong>Mengubah Rincian Belanja:</strong> Baris <strong>[No: ${row.urutan}] ${escHtml(row.uraian || '')}</strong>.`;
  }

  setElText('modal-row-title', 'Edit Rincian Belanja RKB');
  setElVal('modal-row-id', row.id);
  setElVal('modal-row-level', row.level_indent || 4);
  setElVal('modal-uraian', row.uraian);
  setElVal('modal-pic', row.pic_bagian || 'KUL');
  setElVal('modal-sasaran', row.target_scope || 'KAB');

  const akunSelect = document.getElementById('modal-akun');
  if (akunSelect && AppState.masters && AppState.masters.akuns) {
    akunSelect.innerHTML = AppState.masters.akuns.map(a => `
      <option value="${a.kode}" ${a.kode === row.kode_akun ? 'selected' : ''}>[${a.kode}] ${a.uraian}</option>
    `).join('');
  }

  // Update BAS Account Card Display & Quick SBM Chips
  updateAkunCardDisplay(row.kode_akun || '521211');

  setElVal('modal-harga', row.harga_satuan || 0);
  setElVal('modal-f1-val', row.f1_val !== null ? row.f1_val : '');
  setElVal('modal-f1-unit', row.f1_unit || '');
  setElVal('modal-f2-val', row.f2_val !== null ? row.f2_val : '');
  setElVal('modal-f2-unit', row.f2_unit || '');
  setElVal('modal-f3-val', row.f3_val !== null ? row.f3_val : '');
  setElVal('modal-f3-unit', row.f3_unit || '');
  setElVal('modal-f4-val', row.f4_val !== null ? row.f4_val : '');
  setElVal('modal-f4-unit', row.f4_unit || '');
  setElVal('modal-basis-pengali', row.basis_pengali || 'NONE');

  // Update Satuan Volume Dropdown & Custom
  setSatuanVolValue(row.satuan_vol || 'Paket');

  setElVal('modal-catatan-revisi', row.catatan_revisi_baris || '');

  calculateModalTotal();
  document.getElementById('modal-row').style.display = 'flex';
}

function openAddRowModal() {
  AppState.activeEditingRow = null;
  setElText('modal-row-title', 'Tambah Rincian Belanja Baru');
  setElVal('modal-row-id', '');
  setElVal('modal-row-level', '4');
  setElVal('modal-uraian', '');

  const chk = document.getElementById('modal-is-header-checkbox');
  if (chk) chk.checked = false;
  toggleModalHeaderMode(false);
  setElVal('modal-header-kode-input', '');

  const selectedRow = AppState.selectedRowId ? AppState.rkbData?.rows.find(r => r.id === AppState.selectedRowId) : null;
  const ctxAlert = document.getElementById('modal-insertion-context');
  const posBox = document.getElementById('modal-row-pos-container');

  if (posBox) {
    if (selectedRow) {
      posBox.style.display = 'block';
      const rAfter = document.querySelector('input[name="modal-row-pos-choice"][value="after"]');
      if (rAfter) rAfter.checked = true;
    } else {
      posBox.style.display = 'none';
    }
  }

  if (selectedRow) {
    let lastChildU = selectedRow.urutan;
    if (selectedRow.is_header) {
      const allRows = AppState.rkbData?.rows || [];
      const targetIdx = allRows.findIndex(r => r.id === selectedRow.id);
      const refRank = selectedRow.hierarchy_rank || (selectedRow.level_indent === 3 ? 50 : 55);
      for (let i = targetIdx + 1; i < allRows.length; i++) {
        const r = allRows[i];
        if (r.is_header && (r.hierarchy_rank || 99) <= refRank) break;
        lastChildU = r.urutan;
      }
    }
    AppState.targetAfterUrutan = lastChildU;
    setElVal('modal-pic', selectedRow.pic_bagian || 'KUL');
    setElVal('modal-sasaran', selectedRow.target_scope || 'KAB');
    if (ctxAlert) {
      ctxAlert.style.display = 'block';
      const labelDesc = selectedRow.uraian ? selectedRow.uraian : (selectedRow.kode || 'Baris');
      ctxAlert.innerHTML = `📍 <strong>Posisi Sisip Terarah:</strong> ${selectedRow.is_header ? 'Di bawah induk' : 'Sejajar baris rujukan'} <strong>[No: ${selectedRow.urutan}] ${escHtml(labelDesc)}</strong>.`;
    }
  } else {
    AppState.targetAfterUrutan = null;
    setElVal('modal-pic', 'KUL');
    setElVal('modal-sasaran', 'KAB');
    if (ctxAlert) {
      ctxAlert.style.display = 'block';
      ctxAlert.innerHTML = `📍 <strong>Posisi Sisip:</strong> Di bagian akhir dokumen.`;
    }
  }

  const akunSelect = document.getElementById('modal-akun');
  if (akunSelect && AppState.masters && AppState.masters.akuns) {
    akunSelect.innerHTML = AppState.masters.akuns.map(a => `
      <option value="${a.kode}">[${a.kode}] ${a.uraian}</option>
    `).join('');
    const targetAkun = selectedRow ? (selectedRow.kode_akun || (selectedRow.level_indent === 3 ? selectedRow.kode : '')) : '';
    if (targetAkun) {
      akunSelect.value = targetAkun;
    }
  }

  // Update BAS Account Card Display & Quick SBM Chips
  updateAkunCardDisplay(selectedRow?.kode_akun || '521211');

  setElVal('modal-harga', 0);
  setElVal('modal-f1-val', 1);
  setElVal('modal-f1-unit', 'Keg');
  setElVal('modal-f2-val', '');
  setElVal('modal-f2-unit', '');
  setElVal('modal-f3-val', '');
  setElVal('modal-f3-unit', '');
  setElVal('modal-f4-val', '');
  setElVal('modal-f4-unit', '');
  setElVal('modal-basis-pengali', 'NONE');

  // Update Satuan Volume Dropdown & Custom
  setSatuanVolValue('Paket');

  setElVal('modal-catatan-revisi', '');

  calculateModalTotal();
  document.getElementById('modal-row').style.display = 'flex';
  setTimeout(() => {
    document.getElementById('modal-uraian')?.focus();
  }, 100);
}

function closeRowModal() {
  AppState.activeEditingRow = null;
  document.getElementById('modal-row').style.display = 'none';
}

function calculateModalTotal() {
  const f1 = Number(document.getElementById('modal-f1-val')?.value) || 1;
  const f1u = document.getElementById('modal-f1-unit')?.value || '';
  const f2 = Number(document.getElementById('modal-f2-val')?.value) || 1;
  const f2u = document.getElementById('modal-f2-unit')?.value || '';
  const f3 = Number(document.getElementById('modal-f3-val')?.value) || 1;
  const f3u = document.getElementById('modal-f3-unit')?.value || '';
  const f4 = Number(document.getElementById('modal-f4-val')?.value) || 1;
  const f4u = document.getElementById('modal-f4-unit')?.value || '';

  const basis = document.getElementById('modal-basis-pengali')?.value || 'NONE';
  let mult = 1;
  let multLabel = '';
  if (basis === 'PPK') { mult = 19; multLabel = '19 Kec'; }
  else if (basis === 'PPS') { mult = 217; multLabel = '217 Desa'; }
  else if (basis === 'TPS_RKB') { mult = 1371; multLabel = '1.371 TPS'; }

  const parts = [];
  if (document.getElementById('modal-f1-val')?.value) parts.push(`${f1} ${f1u}`.trim());
  if (document.getElementById('modal-f2-val')?.value) parts.push(`${f2} ${f2u}`.trim());
  if (document.getElementById('modal-f3-val')?.value) parts.push(`${f3} ${f3u}`.trim());
  if (document.getElementById('modal-f4-val')?.value) parts.push(`${f4} ${f4u}`.trim());
  if (multLabel) parts.push(multLabel);

  const totalVol = f1 * (document.getElementById('modal-f2-val')?.value ? f2 : 1) * 
                        (document.getElementById('modal-f3-val')?.value ? f3 : 1) * 
                        (document.getElementById('modal-f4-val')?.value ? f4 : 1) * mult;
  const harga = Number(document.getElementById('modal-harga')?.value) || 0;
  const totalAnggaran = totalVol * harga;

  setElText('modal-preview-formula', parts.join(' x ') || '-');
  setElText('modal-preview-volume', formatNumber(totalVol) + ' ' + (document.getElementById('modal-satuan-vol')?.value || ''));
  setElText('modal-preview-total', formatRupiah(totalAnggaran));
}

async function submitRowForm() {
  const rowId = document.getElementById('modal-row-id')?.value;
  const periodeId = AppState.currentPeriode.id;

  const uraian = (document.getElementById('modal-uraian')?.value || '').trim();
  if (!uraian) {
    alert('Mohon masukkan Uraian Rincian Belanja terlebih dahulu.');
    document.getElementById('modal-uraian')?.focus();
    return;
  }

  let targetBeforeUrutan = undefined;
  let targetAfterUrutan = undefined;
  if (!rowId && AppState.selectedRowId) {
    const selectedRow = AppState.rkbData?.rows.find(r => r.id === AppState.selectedRowId);
    if (selectedRow) {
      const posChoice = document.querySelector('input[name="modal-row-pos-choice"]:checked')?.value || 'after';
      if (posChoice === 'before') {
        targetBeforeUrutan = selectedRow.urutan;
      } else {
        targetAfterUrutan = selectedRow.urutan;
      }
    }
  }

  const isHeaderMode = Boolean(document.getElementById('modal-is-header-checkbox')?.checked);
  const headerKode = (document.getElementById('modal-header-kode-input')?.value || '').trim();

  const payload = {
    id: rowId ? Number(rowId) : undefined,
    target_before_urutan: targetBeforeUrutan,
    target_after_urutan: targetAfterUrutan,
    urutan: AppState.activeEditingRow ? AppState.activeEditingRow.urutan : undefined,
    kode: isHeaderMode ? headerKode : (AppState.activeEditingRow ? AppState.activeEditingRow.kode : ''),
    row_type: isHeaderMode ? 'header' : (AppState.activeEditingRow ? AppState.activeEditingRow.row_type : 'item'),
    level_indent: isHeaderMode ? 41 : (AppState.activeEditingRow ? AppState.activeEditingRow.level_indent : 4),
    uraian: uraian,
    pic_bagian: document.getElementById('modal-pic')?.value || 'KUL',
    target_scope: document.getElementById('modal-sasaran')?.value || 'KAB',
    kode_akun: document.getElementById('modal-akun')?.value || '521211',
    harga_satuan: isHeaderMode ? 0 : (Number(document.getElementById('modal-harga')?.value) || 0),
    f1_val: isHeaderMode ? null : (document.getElementById('modal-f1-val')?.value ? Number(document.getElementById('modal-f1-val').value) : null),
    f1_unit: isHeaderMode ? '' : (document.getElementById('modal-f1-unit')?.value || ''),
    f2_val: isHeaderMode ? null : (document.getElementById('modal-f2-val')?.value ? Number(document.getElementById('modal-f2-val').value) : null),
    f2_unit: isHeaderMode ? '' : (document.getElementById('modal-f2-unit')?.value || ''),
    f3_val: isHeaderMode ? null : (document.getElementById('modal-f3-val')?.value ? Number(document.getElementById('modal-f3-val').value) : null),
    f3_unit: isHeaderMode ? '' : (document.getElementById('modal-f3-unit')?.value || ''),
    f4_val: isHeaderMode ? null : (document.getElementById('modal-f4-val')?.value ? Number(document.getElementById('modal-f4-val').value) : null),
    f4_unit: isHeaderMode ? '' : (document.getElementById('modal-f4-unit')?.value || ''),
    basis_pengali: isHeaderMode ? 'NONE' : (document.getElementById('modal-basis-pengali')?.value || 'NONE'),
    satuan_vol: isHeaderMode ? '' : (document.getElementById('modal-satuan-vol')?.value || 'Paket'),
    catatan_revisi_baris: document.getElementById('modal-catatan-revisi')?.value || ''
  };

  try {
    const res = await apiFetch(`/api/rkb/${periodeId}/row`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    closeRowModal();
    await loadRkbData();

    const savedRowId = res && res.row ? res.row.id : (rowId ? Number(rowId) : null);
    if (savedRowId) {
      expandAncestorsOfRow(savedRowId);
      AppState.selectedRowId = savedRowId;
      renderRkbTable();
      setTimeout(() => {
        highlightAndScrollToRow(savedRowId);
      }, 150);
    } else {
      renderAllViews();
    }
  } catch (err) {
    alert('Gagal menyimpan baris: ' + err.message);
  }
}

async function deleteRow(rowId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
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
// REKAM AKUN BELANJA (BAS - LEVEL 3) SESUAI STANDAR SAKTI
// ============================================================================

function openAddAkunModal(targetRowId = null, event = null) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const p = AppState.currentPeriode;
  if (!p) return;
  if (p.is_locked) {
    const user = AppState.currentUser;
    if (!user || user.level > 0) {
      alert('Dokumen berstatus terkunci. Akun Belanja baru hanya dapat direkam pada dokumen usulan revisi aktif.');
      return;
    }
  }

  const rowId = targetRowId || AppState.selectedRowId;
  const targetRow = rowId ? AppState.rkbData?.rows.find(r => r.id === Number(rowId)) : null;
  const ctxBox = document.getElementById('add-akun-context-box');
  const posBox = document.getElementById('add-akun-position-box');

  setElVal('add-akun-target-row-id', rowId || '');

  // Populate dropdown BAS dari master_akun
  const akunSelect = document.getElementById('add-akun-select');
  if (akunSelect && AppState.masters && AppState.masters.akuns) {
    akunSelect.innerHTML = AppState.masters.akuns.map(a => `
      <option value="${a.kode}">[${a.kode}] ${a.uraian}</option>
    `).join('');
    // Default ke 521213 jika berada di rumpun Honor, atau 521211
    if (targetRow && (targetRow.uraian || '').toLowerCase().includes('honor')) {
      akunSelect.value = '521213';
    } else {
      akunSelect.value = '521211';
    }
  }

  if (targetRow) {
    if (ctxBox) {
      const lvlTxt = targetRow.is_header ? `Komponen [${targetRow.kode || 'L' + targetRow.level_indent}]` : 'Rincian Belanja';
      ctxBox.style.display = 'block';
      ctxBox.innerHTML = `📍 <strong>Komponen Induk Rujukan:</strong><br><strong>${lvlTxt} ${escHtml(targetRow.uraian || '')}</strong> (No. Urut: ${targetRow.urutan})`;
    }

    // Default PIC mewarisi dari targetRow
    setElVal('add-akun-pic', targetRow.pic_bagian || 'PARSDM');
    
    // Cek apakah targetRow memiliki rincian belanja langsung di bawahnya
    const allRows = AppState.rkbData?.rows || [];
    const targetIdx = allRows.findIndex(r => r.id === targetRow.id);
    let hasDirectItems = false;
    if (targetIdx !== -1 && targetIdx < allRows.length - 1) {
      const nextRow = allRows[targetIdx + 1];
      if (nextRow && !nextRow.is_header) {
        hasDirectItems = true;
      }
    }

    if (posBox) {
      posBox.style.display = 'block';
      const defVal = (targetRow.level_indent === 3) ? 'after_children' : (hasDirectItems ? 'wrap_children' : 'after_children');
      const rBtn = document.querySelector(`input[name="add-akun-pos-choice"][value="${defVal}"]`);
      if (rBtn) rBtn.checked = true;
    }
  } else {
    if (ctxBox) {
      ctxBox.style.display = 'block';
      ctxBox.innerHTML = `📍 <strong>Posisi Penempatan:</strong> Akun baru akan ditempatkan di bagian akhir dokumen atau pilih salah satu komponen/kegiatan terlebih dahulu.`;
    }
    setElVal('add-akun-pic', 'PARSDM');
    if (posBox) posBox.style.display = 'none';
  }

  onAddAkunSelectChange();
  document.getElementById('modal-add-akun').style.display = 'flex';
}

function closeAddAkunModal() {
  const m = document.getElementById('modal-add-akun');
  if (m) m.style.display = 'none';
}

function onAddAkunSelectChange() {
  const code = document.getElementById('add-akun-select')?.value;
  const uraianInput = document.getElementById('add-akun-uraian');
  if (!code || !uraianInput) return;

  const found = AppState.masters?.akuns?.find(a => a.kode === code);
  if (found) {
    uraianInput.value = found.uraian;
  }
}

function switchToAkunModal() {
  closeRowModal();
  openAddAkunModal(AppState.selectedRowId);
}

function openAddRowModalWithParent(parentRowId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  AppState.selectedRowId = parentRowId;
  updateSelectedRowUI();
  openAddRowModal();
}

function updateContextualActionBar(row) {
  updateSelectedRowUI();
}
window.updateContextualActionBar = updateContextualActionBar;

async function submitAddAkun() {
  const p = AppState.currentPeriode;
  if (!p) return;

  const targetRowId = document.getElementById('add-akun-target-row-id')?.value;
  const targetRow = targetRowId ? AppState.rkbData?.rows.find(r => r.id === Number(targetRowId)) : null;

  const kodeAkun = document.getElementById('add-akun-select')?.value;
  const uraian = document.getElementById('add-akun-uraian')?.value?.trim();
  const pic = document.getElementById('add-akun-pic')?.value || 'PARSDM';
  const sasaran = document.getElementById('add-akun-sasaran')?.value || 'ALL';

  if (!kodeAkun) {
    alert('Silakan pilih Kode Akun BAS terlebih dahulu.');
    return;
  }
  if (!uraian) {
    alert('Silakan isi Uraian Akun Belanja.');
    return;
  }

  let targetBeforeUrutan = undefined;
  let targetAfterUrutan = undefined;
  if (targetRow) {
    const posChoice = document.querySelector('input[name="add-akun-pos-choice"]:checked')?.value || 'after_children';
    if (posChoice === 'before') {
      targetBeforeUrutan = targetRow.urutan;
    } else if (posChoice === 'after_children' || targetRow.level_indent === 3) {
      const allRows = AppState.rkbData?.rows || [];
      const targetIdx = allRows.findIndex(r => r.id === targetRow.id);
      let lastChildU = targetRow.urutan;
      const targetRank = targetRow.hierarchy_rank || (targetRow.level_indent === 2 ? 30 : 45);
      for (let i = targetIdx + 1; i < allRows.length; i++) {
        const r = allRows[i];
        if (r.is_header && (r.hierarchy_rank || 99) <= targetRank) break;
        lastChildU = r.urutan;
      }
      targetAfterUrutan = lastChildU;
    } else {
      // wrap_children: sisipkan tepat di bawah targetRow (urutan targetRow)
      targetAfterUrutan = targetRow.urutan;
    }
  }

  const payload = {
    row_type: 'header',
    level_indent: 3,
    kode: kodeAkun,
    uraian: uraian,
    kode_akun: kodeAkun,
    pic_bagian: pic,
    target_scope: sasaran,
    harga_satuan: 0,
    target_before_urutan: targetBeforeUrutan,
    target_after_urutan: targetAfterUrutan,
    catatan_revisi_baris: 'Rekam Akun Belanja (BAS)'
  };

  try {
    const res = await apiFetch(`/api/rkb/${p.id}/row`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    closeAddAkunModal();
    await loadRkbData();
    renderAllViews();

    if (res && res.row) {
      AppState.selectedRowId = res.row.id;
      const fullRow = AppState.rkbData?.rows.find(r => r.id === res.row.id);
      if (fullRow) {
        updateSelectedRowUI();
        // Expand cabang induk
        let cur = fullRow.parent_tree_id;
        const parentMap = {};
        for (const r of (AppState.rkbData?.rows || [])) parentMap[r.tree_id] = r.parent_tree_id;
        while (cur) {
          AppState.expandedNodes.add(cur);
          cur = parentMap[cur];
        }
        renderRkbTable();
      }
    }

    alert(`✅ Akun Belanja [${kodeAkun}] "${uraian}" berhasil direkam sesuai struktur SAKTI!`);
  } catch (err) {
    alert('Gagal merekam Akun Belanja: ' + err.message);
  }
}

// ============================================================================
// MODAL: REKAM STRUKTUR HIERARKI KOMPONEN (L1 - L4)
// ============================================================================

function openAddHeaderModal(targetLevel, refRowId = null) {
  const p = AppState.currentPeriode;
  if (!p) return;
  if (p.is_locked) {
    const user = AppState.currentUser;
    if (!user || user.level > 0) {
      alert('Dokumen berstatus terkunci. Penambahan komponen/struktur hanya dapat dilakukan pada dokumen usulan aktif.');
      return;
    }
  }

  const rowId = refRowId || AppState.selectedRowId;
  const refRow = rowId ? AppState.rkbData?.rows.find(r => r.id === Number(rowId)) : null;

  setElVal('add-header-edit-id', '');
  setElVal('add-header-level', targetLevel);
  setElVal('add-header-parent-id', rowId || '');

  const posBox = document.getElementById('add-header-pos-container');
  if (posBox) posBox.style.display = 'block';

  const levelConfigs = {
    1: { title: 'Rekam Bagian Utama (L1)', subtitle: 'Tingkat Tertinggi Pengelompokan Anggaran (Contoh: A, B)', defaultKode: '', uraianPlaceholder: 'Contoh: TAHAPAN PEMILIHAN' },
    2: { title: 'Rekam Tahapan Program (L2)', subtitle: 'Tahapan Operasional Anggaran (Contoh: I, II, III)', defaultKode: '', uraianPlaceholder: 'Contoh: I. TAHAPAN PERSIAPAN' },
    3: { title: 'Rekam Kegiatan / Komponen (L3)', subtitle: '28 Komponen Kegiatan Anggaran (Contoh: 29, 30)', defaultKode: '', uraianPlaceholder: 'Contoh: Pelaksanaan Pemungutan dan Penghitungan Suara' },
    4: { title: 'Rekam Sub-Komponen (L4)', subtitle: 'Rincian Sub-Komponen Kegiatan (Contoh: 4.1, 4.2)', defaultKode: '', uraianPlaceholder: 'Contoh: Sub-Kegiatan Logistik dan Distribusi' },
    5.5: { title: 'Rekam Header Teks / Sub-Header Kelompok', subtitle: 'Teks Pengelompokan Rincian di bawah Akun (Contoh: a., b., c., Paket 1)', defaultKode: '', uraianPlaceholder: 'Contoh: Kantor/Inventaris, Kendaraan Dinas, atau Konsumsi Panitia' }
  };

  const cfg = levelConfigs[targetLevel] || { title: 'Rekam Komponen Baru', subtitle: '', defaultKode: '', uraianPlaceholder: '' };
  setElText('modal-header-title-text', cfg.title);
  setElText('modal-header-subtitle', cfg.subtitle);

  const uraianInput = document.getElementById('add-header-uraian');
  if (uraianInput) {
    uraianInput.value = '';
    uraianInput.placeholder = cfg.uraianPlaceholder;
  }

  const kodeInput = document.getElementById('add-header-kode');
  if (kodeInput) {
    kodeInput.value = '';
    if (targetLevel === 3) {
      const l3Rows = (AppState.rkbData?.rows || []).filter(r => r.level_indent === 2 && /^\d+$/.test(r.kode));
      const maxK = l3Rows.reduce((max, r) => Math.max(max, parseInt(r.kode, 10)), 28);
      kodeInput.value = String(maxK + 1);
    } else if (targetLevel === 5.5) {
      if (refRow && (refRow.level_indent === 41 || refRow.is_sub_header)) {
        const curK = (refRow.kode || '').trim().replace('.', '').toLowerCase();
        if (curK && curK.length === 1 && curK >= 'a' && curK < 'z') {
          const nextChar = String.fromCharCode(curK.charCodeAt(0) + 1);
          kodeInput.value = nextChar + '.';
        } else {
          kodeInput.value = 'b.';
        }
      } else {
        kodeInput.value = 'a.';
      }
    }
  }

  const ctxBox = document.getElementById('add-header-context-box');
  if (ctxBox) {
    if (refRow) {
      const isSub = Boolean(refRow.is_sub_header || refRow.level_indent === 41 || refRow.level_indent === 42);
      const refLvlName = isSub ? 'Header Teks' : (refRow.tree_level ? `L${refRow.tree_level}` : (refRow.is_header ? 'Header' : 'Item'));
      ctxBox.innerHTML = `📍 <strong>Baris Rujukan Aktif:</strong><br><span class="badge" style="background:#e2e8f0;color:#1e293b;font-weight:700;">${refLvlName}</span> <strong>[${refRow.kode || '-'}] ${escHtml((refRow.uraian || '').substring(0, 50))}</strong> (Urutan: ${refRow.urutan})`;
    } else {
      ctxBox.innerHTML = `📍 <strong>Penempatan:</strong> Tidak ada baris rujukan yang dipilih. Komponen baru akan ditempatkan di akhir dokumen.`;
    }
  }

  if (refRow && refRow.pic_bagian) {
    setElVal('add-header-pic', refRow.pic_bagian);
  } else {
    setElVal('add-header-pic', 'PARSDM');
  }

  const radioAfter = document.querySelector('input[name="add-header-pos-choice"][value="after"]');
  if (radioAfter) radioAfter.checked = true;

  document.getElementById('modal-add-header').style.display = 'flex';
  setTimeout(() => {
    document.getElementById('add-header-uraian')?.focus();
  }, 100);
}

function closeAddHeaderModal() {
  const m = document.getElementById('modal-add-header');
  if (m) m.style.display = 'none';
}

async function submitAddHeader() {
  const p = AppState.currentPeriode;
  if (!p) return;

  const editId = document.getElementById('add-header-edit-id')?.value;
  const targetLevel = Number(document.getElementById('add-header-level')?.value || 2);
  const refRowId = document.getElementById('add-header-parent-id')?.value;
  const refRow = refRowId ? AppState.rkbData?.rows.find(r => r.id === Number(refRowId)) : null;

  const kode = (document.getElementById('add-header-kode')?.value || '').trim();
  const uraian = (document.getElementById('add-header-uraian')?.value || '').trim();
  const pic = document.getElementById('add-header-pic')?.value || 'PARSDM';
  const posChoice = document.querySelector('input[name="add-header-pos-choice"]:checked')?.value || 'after';

  if (!uraian) {
    alert('Mohon masukkan Uraian Komponen / Kegiatan.');
    document.getElementById('add-header-uraian')?.focus();
    return;
  }

  // Jika mode edit baris yang sudah ada
  if (editId) {
    const payload = {
      id: Number(editId),
      kode: kode,
      uraian: uraian,
      pic_bagian: pic,
      catatan_revisi_baris: `Perubahan Header [${kode}] ${uraian}`
    };
    try {
      await apiFetch(`/api/rkb/${p.id}/row`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      closeAddHeaderModal();
      await loadRkbData();
      AppState.selectedRowId = Number(editId);
      renderRkbTable();
      setTimeout(() => highlightAndScrollToRow(Number(editId)), 150);
      alert(`✅ Teks Header [${kode}] "${uraian}" berhasil disimpan.`);
    } catch (err) {
      alert('Gagal menyimpan perubahan header: ' + err.message);
    }
    return;
  }

  let levelIndent = 2;
  if (targetLevel === 1) levelIndent = 0;
  else if (targetLevel === 2) levelIndent = 1;
  else if (targetLevel === 3) levelIndent = 2;
  else if (targetLevel === 4) levelIndent = 21;
  else if (targetLevel === 5.5) levelIndent = 41;

  let targetBeforeUrutan = undefined;
  let targetAfterUrutan = undefined;

  if (refRow) {
    if (posChoice === 'before') {
      targetBeforeUrutan = refRow.urutan;
    } else {
      const allRows = AppState.rkbData?.rows || [];
      const targetIdx = allRows.findIndex(r => r.id === refRow.id);
      let lastChildU = refRow.urutan;
      const refRank = refRow.hierarchy_rank || (refRow.level_indent === 0 ? 10 : (refRow.level_indent === 1 ? 20 : (refRow.level_indent === 2 ? 30 : 41)));
      for (let i = targetIdx + 1; i < allRows.length; i++) {
        const r = allRows[i];
        if (r.is_header && (r.hierarchy_rank || 99) <= refRank) break;
        lastChildU = r.urutan;
      }
      targetAfterUrutan = lastChildU;
    }
  }

  const kodeAkun = targetLevel === 5.5 && refRow ? (refRow.kode_akun || '') : '';

  const payload = {
    row_type: 'header',
    level_indent: levelIndent,
    kode: kode,
    uraian: uraian,
    kode_akun: kodeAkun,
    pic_bagian: pic,
    target_scope: 'KAB',
    harga_satuan: 0,
    target_before_urutan: targetBeforeUrutan,
    target_after_urutan: targetAfterUrutan,
    catatan_revisi_baris: targetLevel === 5.5 ? `Penambahan Header Teks [${kode}] ${uraian}` : `Penambahan Struktur Header L${targetLevel}`
  };

  try {
    const res = await apiFetch(`/api/rkb/${p.id}/row`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    closeAddHeaderModal();
    await loadRkbData();

    const savedRowId = res && res.row ? res.row.id : null;
    if (savedRowId) {
      expandAncestorsOfRow(savedRowId);
      AppState.selectedRowId = savedRowId;
      renderRkbTable();
      setTimeout(() => {
        highlightAndScrollToRow(savedRowId);
      }, 150);
    } else {
      renderAllViews();
    }
    const labelSukses = targetLevel === 5.5 ? `Header Teks [${kode}] "${uraian}"` : `Komponen L${targetLevel} "${uraian}"`;
    alert(`✅ ${labelSukses} berhasil direkam.`);
  } catch (err) {
    alert('Gagal merekam komponen baru: ' + err.message);
  }
}

function openEditHeaderModal(rowId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const p = AppState.currentPeriode;
  if (!p) return;
  if (p.is_locked) {
    const user = AppState.currentUser;
    if (!user || user.level > 0) {
      alert('Dokumen berstatus terkunci. Perubahan hanya dapat dilakukan pada dokumen usulan aktif.');
      return;
    }
  }
  const row = AppState.rkbData?.rows.find(r => r.id === rowId);
  if (!row) return;

  setElVal('add-header-edit-id', row.id);
  setElVal('add-header-level', row.level_indent === 41 || row.level_indent === 42 ? 5.5 : (row.tree_level || 2));
  setElVal('add-header-parent-id', row.parent_rkb_row_id || '');

  setElText('modal-header-title-text', `Ubah Teks Header [${row.kode || ''}]`);
  setElText('modal-header-subtitle', 'Sunting Kode dan Uraian Teks Pengelompok');

  setElVal('add-header-kode', row.kode || '');
  setElVal('add-header-uraian', row.uraian || '');
  setElVal('add-header-pic', row.pic_bagian || 'KUL');

  const ctxBox = document.getElementById('add-header-context-box');
  if (ctxBox) {
    ctxBox.innerHTML = `✏️ <strong>Mengubah Header Teks:</strong> Baris <strong>[No: ${row.urutan}] [${row.kode || '-'}] ${escHtml(row.uraian || '')}</strong>`;
  }

  const posBox = document.getElementById('add-header-pos-container');
  if (posBox) posBox.style.display = 'none';

  document.getElementById('modal-add-header').style.display = 'flex';
  setTimeout(() => {
    document.getElementById('add-header-uraian')?.focus();
  }, 100);
}

function toggleModalHeaderMode(isHeader) {
  const kodeGroup = document.getElementById('modal-header-kode-group');
  const calcFields = document.getElementById('modal-detail-calc-fields');
  const previewCard = document.getElementById('modal-calc-preview-card');
  const uraianLabel = document.getElementById('modal-uraian-label');
  const uraianInput = document.getElementById('modal-uraian');
  const hargaInput = document.getElementById('modal-harga');

  if (isHeader) {
    if (kodeGroup) kodeGroup.style.display = 'block';
    if (calcFields) calcFields.style.display = 'none';
    if (previewCard) previewCard.style.display = 'none';
    if (uraianLabel) uraianLabel.innerText = 'Uraian Header Teks / Judul Kelompok:';
    if (uraianInput) uraianInput.placeholder = 'Contoh: Kantor/Inventaris atau Kendaraan Dinas';
    if (hargaInput) hargaInput.removeAttribute('required');
    setElText('modal-row-title', 'Rekam / Edit Header Teks (Kelompok Belanja)');
  } else {
    if (kodeGroup) kodeGroup.style.display = 'none';
    if (calcFields) calcFields.style.display = 'contents';
    if (previewCard) previewCard.style.display = 'block';
    if (uraianLabel) uraianLabel.innerText = 'Uraian Rincian Belanja:';
    if (uraianInput) uraianInput.placeholder = 'Contoh: -. Konsumsi Rapat Koordinasi';
    if (hargaInput) hargaInput.setAttribute('required', 'required');
    setElText('modal-row-title', AppState.activeEditingRow ? 'Edit Rincian Belanja RKB' : 'Tambah Rincian Belanja Baru');
  }
}

// ============================================================================
// GESER URUTAN BARIS (REORDERING: UP / DOWN)
// ============================================================================

async function moveRowOrdering(rowId, direction) {
  const p = AppState.currentPeriode;
  if (!p) return;
  if (p.is_locked) {
    const user = AppState.currentUser;
    if (!user || user.level > 0) {
      alert('Dokumen berstatus terkunci. Perubahan urutan hanya dapat dilakukan pada dokumen usulan revisi aktif.');
      return;
    }
  }

  try {
    const res = await apiFetch(`/api/rkb/${p.id}/reorder`, {
      method: 'POST',
      body: JSON.stringify({
        row_id: Number(rowId),
        direction: direction
      })
    });

    await loadRkbData();
    AppState.selectedRowId = Number(rowId);
    renderRkbTable();
    setTimeout(() => {
      highlightAndScrollToRow(Number(rowId));
    }, 100);
  } catch (err) {
    alert('Pergeseran urutan tidak dapat dilakukan: ' + err.message);
  }
}

// Expose to window for inline HTML onclick handlers
window.openAddHeaderModal = openAddHeaderModal;
window.closeAddHeaderModal = closeAddHeaderModal;
window.submitAddHeader = submitAddHeader;
window.openEditHeaderModal = openEditHeaderModal;
window.toggleModalHeaderMode = toggleModalHeaderMode;
window.moveRowOrdering = moveRowOrdering;

// ============================================================================
// BAS ACCOUNT PICKER DATATABLE LOGIC
// ============================================================================
AppState.akunPickerFilter = 'SEMUA';

function updateAkunCardDisplay(kode) {
  const akuns = AppState.masters?.akuns || [];
  const found = akuns.find(a => a.kode === kode) || {
    kode: kode || '521211',
    uraian: 'Belanja Bahan',
    kelompok: '521 - Belanja Barang'
  };

  const badge = document.getElementById('modal-akun-code-badge');
  const uraian = document.getElementById('modal-akun-uraian-display');
  const meta = document.getElementById('modal-akun-meta-display');
  const hiddenSelect = document.getElementById('modal-akun');

  if (badge) badge.textContent = found.kode;
  if (uraian) uraian.textContent = found.uraian;
  if (meta) meta.textContent = `Kelompok: ${found.kelompok || '-'} ${found.kategori_dn ? '| DN: ' + found.kategori_dn : ''}`;
  if (hiddenSelect) hiddenSelect.value = found.kode;

  // Sync quick SBM chips for this account
  renderQuickSbmChips(found.kode);
}

function onModalAkunChange(kode) {
  updateAkunCardDisplay(kode);
}

function openAkunPickerModal() {
  AppState.akunPickerFilter = 'SEMUA';
  const searchInput = document.getElementById('akun-picker-search');
  if (searchInput) searchInput.value = '';

  // Reset tab buttons
  document.querySelectorAll('.tab-filter-akun').forEach(btn => {
    if (btn.getAttribute('data-filter') === 'SEMUA') {
      btn.className = 'btn btn-xs btn-primary tab-filter-akun';
    } else {
      btn.className = 'btn btn-xs btn-outline tab-filter-akun';
    }
  });

  filterAkunPickerTable();
  const modal = document.getElementById('modal-akun-picker');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      document.getElementById('akun-picker-search')?.focus();
    }, 100);
  }
}

function closeAkunPickerModal() {
  const modal = document.getElementById('modal-akun-picker');
  if (modal) modal.style.display = 'none';
}

function setAkunPickerFilter(filter, btn) {
  AppState.akunPickerFilter = filter;
  document.querySelectorAll('.tab-filter-akun').forEach(b => {
    b.className = 'btn btn-xs btn-outline tab-filter-akun';
  });
  if (btn) btn.className = 'btn btn-xs btn-primary tab-filter-akun';
  filterAkunPickerTable();
}

function filterAkunPickerTable() {
  const q = (document.getElementById('akun-picker-search')?.value || '').toLowerCase().trim();
  const filter = AppState.akunPickerFilter || 'SEMUA';
  const akuns = AppState.masters?.akuns || [];
  const activeKode = document.getElementById('modal-akun')?.value || '';

  const filtered = akuns.filter(a => {
    // Check category filter
    if (filter !== 'SEMUA') {
      if (!a.kode.startsWith(filter)) return false;
    }
    // Check search text
    if (!q) return true;
    return (
      a.kode.toLowerCase().includes(q) ||
      (a.uraian && a.uraian.toLowerCase().includes(q)) ||
      (a.kelompok && a.kelompok.toLowerCase().includes(q)) ||
      (a.keterangan && a.keterangan.toLowerCase().includes(q))
    );
  });

  const tbody = document.getElementById('akun-picker-tbody');
  const summaryEl = document.getElementById('akun-picker-summary');
  const countAllEl = document.getElementById('count-akun-all');

  if (countAllEl) countAllEl.textContent = akuns.length;
  if (summaryEl) summaryEl.textContent = `Menampilkan ${filtered.length} dari ${akuns.length} akun BAS`;

  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding: 24px; color: #64748b;">
          🔍 Tidak ditemukan akun BAS yang sesuai dengan pencarian "<strong>${escHtml(q)}</strong>".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(a => {
    const isSelected = a.kode === activeKode;
    return `
      <tr class="${isSelected ? 'table-row-active-picker' : ''}" onclick="selectAkunFromPicker('${a.kode}')" style="cursor: pointer;">
        <td>
          <code style="font-family: var(--font-mono); font-weight: 800; color: var(--accent); font-size: 13px;">${a.kode}</code>
          ${isSelected ? '<span class="badge badge-success ml-1" style="font-size: 9px; padding: 1px 4px;">Aktif</span>' : ''}
        </td>
        <td><strong>${escHtml(a.uraian)}</strong></td>
        <td><span class="badge badge-subtle" style="font-size: 11px;">${escHtml(a.kelompok || '-')}</span></td>
        <td style="color: #475569; font-size: 11.5px; line-height: 1.35;">${escHtml(a.keterangan || '-')}</td>
        <td class="text-center">
          <button type="button" class="btn btn-xs ${isSelected ? 'btn-primary' : 'btn-outline-primary'}" onclick="event.stopPropagation(); selectAkunFromPicker('${a.kode}')">
            ${isSelected ? '✓ Terpilih' : 'Pilih'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function selectAkunFromPicker(kode) {
  updateAkunCardDisplay(kode);
  closeAkunPickerModal();
  document.getElementById('modal-harga')?.focus();
}

// ============================================================================
// SBM LOKAL & STANDAR HARGA SATUAN LOGIC
// ============================================================================
AppState.sbmPickerFilter = 'SEMUA';

function renderQuickSbmChips(kodeAkun) {
  const container = document.getElementById('modal-sbm-quick-chips');
  const statusEl = document.getElementById('sbm-quick-status');
  if (!container) return;

  const sbms = AppState.masters?.sbms || [];
  const matched = sbms.filter(s => s.kode_akun === kodeAkun);

  if (matched.length === 0) {
    if (statusEl) statusEl.textContent = `(Tidak ada tarif spesifik untuk akun ${kodeAkun})`;
    container.innerHTML = `
      <span style="font-size: 11px; color: #94a3b8; font-style: italic;">Standar tarif akun ini fleksibel / riil cost.</span>
      <button type="button" class="sbm-chip" onclick="openSbmPickerModal()" style="background:#f1f5f9; color:#475569; border-color:#cbd5e1;">
        🏷️ Buka Katalog SBM (51 Tarif)
      </button>
    `;
    return;
  }

  if (statusEl) statusEl.textContent = `(${matched.length} tarif ditemukan)`;

  container.innerHTML = matched.map(s => {
    const shortLabel = s.uraian.replace(/Honorarium /i, '').replace(/Konsumsi Rapat /i, 'Konsumsi ').replace(/Perjalanan Dinas \/ /i, '');
    const priceFmt = (s.harga_satuan >= 1000000)
      ? (s.harga_satuan / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' Jt'
      : (s.harga_satuan / 1000).toLocaleString('id-ID') + ' Rb';

    return `
      <button type="button" class="sbm-chip" onclick="applySbmRate(${s.id})" title="${escHtml(s.uraian)}: Rp ${Number(s.harga_satuan).toLocaleString('id-ID')} / ${s.satuan}">
        <span>${escHtml(shortLabel)}</span>
        <span class="sbm-chip-rate">Rp ${priceFmt} / ${s.satuan}</span>
      </button>
    `;
  }).join('') + `
    <button type="button" class="sbm-chip" onclick="openSbmPickerModal()" style="background:#f8fafc; border-color:#94a3b8; color:#334155;">
      🔍 Semua SBM ➔
    </button>
  `;
}

function openSbmPickerModal() {
  AppState.sbmPickerFilter = 'SEMUA';
  const searchInput = document.getElementById('sbm-picker-search');
  if (searchInput) searchInput.value = '';

  document.querySelectorAll('.tab-filter-sbm').forEach(btn => {
    if (btn.getAttribute('data-filter') === 'SEMUA') {
      btn.className = 'btn btn-xs btn-primary tab-filter-sbm';
    } else {
      btn.className = 'btn btn-xs btn-outline tab-filter-sbm';
    }
  });

  filterSbmPickerTable();
  const modal = document.getElementById('modal-sbm-picker');
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => {
      document.getElementById('sbm-picker-search')?.focus();
    }, 100);
  }
}

function closeSbmPickerModal() {
  const modal = document.getElementById('modal-sbm-picker');
  if (modal) modal.style.display = 'none';
}

function setSbmPickerFilter(filter, btn) {
  AppState.sbmPickerFilter = filter;
  document.querySelectorAll('.tab-filter-sbm').forEach(b => {
    b.className = 'btn btn-xs btn-outline tab-filter-sbm';
  });
  if (btn) btn.className = 'btn btn-xs btn-primary tab-filter-sbm';
  filterSbmPickerTable();
}

function filterSbmPickerTable() {
  const q = (document.getElementById('sbm-picker-search')?.value || '').toLowerCase().trim();
  const filter = AppState.sbmPickerFilter || 'SEMUA';
  const sbms = AppState.masters?.sbms || [];

  const filtered = sbms.filter(s => {
    // Category tabs filter
    if (filter === 'HONOR_ADHOC') {
      const kat = (s.kategori || '').toUpperCase();
      if (!kat.includes('PPK') && !kat.includes('PPS') && !kat.includes('KPPS') && !kat.includes('PANTARLIH')) return false;
    } else if (filter === 'KONSUMSI') {
      const kat = (s.kategori || '').toUpperCase();
      if (!kat.includes('KONSUMSI') && !kat.includes('MAKAN') && !kat.includes('SNACK')) return false;
    } else if (filter === 'POKJA') {
      const kat = (s.kategori || '').toUpperCase();
      if (!kat.includes('POKJA')) return false;
    } else if (filter === 'PERJALANAN') {
      const kat = (s.kategori || '').toUpperCase();
      if (!kat.includes('PERJALANAN') && !kat.includes('TRANSPORT') && !kat.includes('MEETING')) return false;
    } else if (filter === 'SANTUNAN') {
      const kat = (s.kategori || '').toUpperCase();
      if (!kat.includes('SANTUNAN') && !kat.includes('PEMAKAMAN')) return false;
    } else if (filter === 'SEWA_JASA') {
      const kat = (s.kategori || '').toUpperCase();
      if (!kat.includes('SEWA') && !kat.includes('JASA') && !kat.includes('PROFESI') && !kat.includes('ATK')) return false;
    }

    if (!q) return true;
    return (
      (s.uraian && s.uraian.toLowerCase().includes(q)) ||
      (s.kategori && s.kategori.toLowerCase().includes(q)) ||
      (s.satuan && s.satuan.toLowerCase().includes(q)) ||
      (s.kode_akun && s.kode_akun.toLowerCase().includes(q)) ||
      (s.dasar_hukum && s.dasar_hukum.toLowerCase().includes(q)) ||
      (s.keterangan && s.keterangan.toLowerCase().includes(q))
    );
  });

  const tbody = document.getElementById('sbm-picker-tbody');
  const summaryEl = document.getElementById('sbm-picker-summary');
  const countAllEl = document.getElementById('count-sbm-all');

  if (countAllEl) countAllEl.textContent = sbms.length;
  if (summaryEl) summaryEl.textContent = `Menampilkan ${filtered.length} dari ${sbms.length} standar biaya`;

  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center" style="padding: 24px; color: #64748b;">
          🔍 Tidak ditemukan standar biaya masukan yang sesuai dengan pencarian "<strong>${escHtml(q)}</strong>".
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(s => {
    return `
      <tr onclick="applySbmRate(${s.id})" style="cursor: pointer;">
        <td><code style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${s.kode_akun || '-'}</code></td>
        <td><strong>${escHtml(s.uraian)}</strong></td>
        <td><span class="badge badge-subtle" style="font-size: 11px;">${escHtml(s.kategori || '-')}</span></td>
        <td class="text-center"><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${escHtml(s.satuan || '-')}</span></td>
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: #16a34a; font-size: 13px;">
          Rp ${Number(s.harga_satuan).toLocaleString('id-ID')}
        </td>
        <td style="font-size: 11px; color: #64748b;">
          <div>${s.pagu_sbm ? 'Max: Rp ' + Number(s.pagu_sbm).toLocaleString('id-ID') : '-'}</div>
          <div style="font-size: 10px; color: #94a3b8;">${escHtml(s.dasar_hukum || '')}</div>
        </td>
        <td class="text-center">
          <button type="button" class="btn btn-xs btn-outline-primary" onclick="event.stopPropagation(); applySbmRate(${s.id})">
            ⚡ Gunakan
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function applySbmRate(sbmId) {
  const sbms = AppState.masters?.sbms || [];
  const item = sbms.find(s => s.id === sbmId);
  if (!item) return;

  // 1. Set Harga Satuan
  setElVal('modal-harga', item.harga_satuan || 0);

  // 2. Set Satuan Total Volume
  setSatuanVolValue(item.satuan || 'Paket');

  // 3. Set Kode Akun BAS if exists
  if (item.kode_akun) {
    updateAkunCardDisplay(item.kode_akun);
  }

  // 4. If uraian is empty or just standard default, fill with SBM title
  const uraianEl = document.getElementById('modal-uraian');
  if (uraianEl && (!uraianEl.value.trim() || uraianEl.value.trim() === '-.')) {
    uraianEl.value = '-. ' + item.uraian;
  }

  // 5. Recalculate preview
  calculateModalTotal();

  // 6. Close SBM Picker if open
  closeSbmPickerModal();

  // Flash highlight on harga input to give user visual feedback
  const hargaEl = document.getElementById('modal-harga');
  if (hargaEl) {
    hargaEl.focus();
    hargaEl.style.transition = 'all 0.3s';
    hargaEl.style.borderColor = '#16a34a';
    hargaEl.style.boxShadow = '0 0 0 3px rgba(22, 163, 74, 0.25)';
    setTimeout(() => {
      hargaEl.style.borderColor = '';
      hargaEl.style.boxShadow = '';
    }, 1200);
  }
}

// ============================================================================
// SATUAN TOTAL VOLUME LOGIC (DROPDOWN + CUSTOM ENTRY)
// ============================================================================
function setSatuanVolValue(val) {
  const select = document.getElementById('modal-satuan-vol-select');
  const customInput = document.getElementById('modal-satuan-vol-custom');
  const hiddenInput = document.getElementById('modal-satuan-vol');
  const badge = document.getElementById('badge-satuan-selected');

  val = (val || 'Paket').trim();
  if (hiddenInput) hiddenInput.value = val;
  if (badge) badge.textContent = val;

  if (!select) return;

  let optionFound = false;
  for (let i = 0; i < select.options.length; i++) {
    if (select.options[i].value.toLowerCase() === val.toLowerCase()) {
      select.selectedIndex = i;
      optionFound = true;
      break;
    }
  }

  if (optionFound) {
    if (customInput) customInput.style.display = 'none';
  } else {
    // Custom unit
    select.value = '__CUSTOM__';
    if (customInput) {
      customInput.style.display = 'block';
      customInput.value = val;
    }
  }
}

function onSatuanVolSelectChange(selVal) {
  const customInput = document.getElementById('modal-satuan-vol-custom');
  const hiddenInput = document.getElementById('modal-satuan-vol');
  const badge = document.getElementById('badge-satuan-selected');

  if (selVal === '__CUSTOM__') {
    if (customInput) {
      customInput.style.display = 'block';
      customInput.focus();
      const currentVal = customInput.value.trim() || 'Paket';
      if (hiddenInput) hiddenInput.value = currentVal;
      if (badge) badge.textContent = currentVal;
    }
  } else {
    if (customInput) customInput.style.display = 'none';
    if (hiddenInput) hiddenInput.value = selVal;
    if (badge) badge.textContent = selVal;
  }
  calculateModalTotal();
}

function onSatuanVolCustomInput(customVal) {
  const hiddenInput = document.getElementById('modal-satuan-vol');
  const badge = document.getElementById('badge-satuan-selected');
  const cleanVal = customVal.trim() || 'Paket';
  if (hiddenInput) hiddenInput.value = cleanVal;
  if (badge) badge.textContent = cleanVal;
  calculateModalTotal();
}

// ============================================================================
// MODAL: KUNCI DOKUMEN (PILIH DASAR PENGESAHAN: PRA / NPHD / PASCA)
// ============================================================================

function openLockModal(periodeId) {
  const p = AppState.periodesList.find(x => x.id === periodeId) || AppState.currentPeriode;
  if (!p) return;

  setElVal('lock-periode-id', p.id);
  
  const faseSelect = document.getElementById('lock-fase');
  if (faseSelect) {
    if (p.tahap_revisi === 'PRA_NPHD') faseSelect.value = 'PRA_NPHD';
    else if (p.revisi_ke === 0) faseSelect.value = 'NPHD_SAH';
    else faseSelect.value = 'PASCA_NPHD';
  }
  
  onLockFaseChange();
  
  setElVal('lock-nomor-ba', p.nomor_ba_tapd || '');
  setElVal('lock-tanggal-ba', p.tanggal_ba_tapd || new Date().toISOString().slice(0, 10));
  setElVal('lock-catatan', p.catatan_revisi || '');
  
  document.getElementById('modal-kunci').style.display = 'flex';
}

function closeLockModal() {
  document.getElementById('modal-kunci').style.display = 'none';
}

function onLockFaseChange() {
  const fase = document.getElementById('lock-fase')?.value || 'NPHD_SAH';
  const dasarSelect = document.getElementById('lock-dasar');
  if (!dasarSelect) return;

  if (fase === 'PRA_NPHD') {
    dasarSelect.innerHTML = `
      <option value="Surat Usulan KPU">Surat Usulan Resmi KPU ke TAPD</option>
      <option value="BA Pembahasan TAPD">Berita Acara (BA) Pembahasan Bersama TAPD</option>
      <option value="Review Provinsi">Hasil Review KPU Provinsi Jawa Timur</option>
      <option value="Kertas Kerja Penyusunan">Kertas Kerja Penyusunan Internal</option>
    `;
  } else if (fase === 'NPHD_SAH') {
    dasarSelect.innerHTML = `
      <option value="NPHD">Naskah Perjanjian Hibah Daerah (NPHD)</option>
      <option value="BA Kesepakatan Final">BA Kesepakatan Final TAPD dan KPU</option>
    `;
  } else {
    dasarSelect.innerHTML = `
      <option value="BA TAPD">Berita Acara (BA) Persetujuan TAPD Pemda</option>
      <option value="SK KPU">Keputusan KPU (SK KPU Kabupaten Ngawi)</option>
      <option value="Surat Persetujuan KPA">Surat Persetujuan KPA (Pergeseran Internal)</option>
      <option value="Adendum NPHD">Adendum Naskah Perjanjian Hibah</option>
    `;
  }
}

async function submitLockForm() {
  const periodeId = Number(document.getElementById('lock-periode-id')?.value) || AppState.currentPeriode.id;
  const payload = {
    is_locked: 1,
    tahap_revisi: document.getElementById('lock-fase')?.value || 'NPHD_SAH',
    dasar_pengesahan: document.getElementById('lock-dasar')?.value || 'NPHD',
    nomor_ba_tapd: document.getElementById('lock-nomor-ba')?.value || '',
    tanggal_ba_tapd: document.getElementById('lock-tanggal-ba')?.value || '',
    catatan_revisi: document.getElementById('lock-catatan')?.value || ''
  };

  try {
    const res = await apiFetch(`/api/periodes/${periodeId}/lock`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    closeLockModal();
    alert(res.message || 'Dokumen berhasil dikunci sebagai Arsip Resmi!');
    await loadPeriodes();
    AppState.currentPeriode = AppState.periodesList.find(x => x.id === periodeId) || AppState.periodesList[0];
    await loadRkbData();
    renderAllViews();
  } catch (err) {
    alert('Gagal mengunci dokumen: ' + err.message);
  }
}

// ============================================================================
// MODAL: BUAT USULAN REVISI (PRA / PASCA NPHD)
// ============================================================================

function openRevisionModal() {
  onRevFaseChange();
  document.getElementById('modal-revisi').style.display = 'flex';
}

function closeRevisionModal() {
  document.getElementById('modal-revisi').style.display = 'none';
}

function onRevFaseChange() {
  const fase = document.getElementById('rev-fase')?.value || 'PASCA_NPHD';
  const nextRevNum = (AppState.periodesList?.filter(p => p.tahap_revisi !== 'PRA_NPHD' && p.revisi_ke > 0).length || 0) + 1;
  const revVersi = document.getElementById('rev-versi');
  const revNama = document.getElementById('rev-nama-periode');
  const dasarSelect = document.getElementById('rev-dasar');

  if (fase === 'PRA_NPHD') {
    if (revVersi) revVersi.value = 'Pra-NPHD Usulan 2';
    if (revNama) revNama.value = 'RKB KPU Kabupaten Ngawi (Rasionalisasi Pembahasan Bersama TAPD)';
    if (dasarSelect) {
      dasarSelect.innerHTML = `
        <option value="Hasil Pembahasan Internal">Hasil Pembahasan &amp; Simulasi Internal</option>
        <option value="Surat Usulan Resmi KPU">Surat Usulan Resmi KPU ke TAPD</option>
        <option value="Review KPU Provinsi">Review KPU Provinsi Jawa Timur</option>
        <option value="BA TAPD">BA Pembahasan Bersama TAPD</option>
      `;
    }
  } else {
    if (revVersi) revVersi.value = `Revisi ${nextRevNum}`;
    if (revNama) revNama.value = `RKB KPU Kabupaten Ngawi (Revisi ${nextRevNum} - Pasca NPHD)`;
    if (dasarSelect) {
      dasarSelect.innerHTML = `
        <option value="Berita Acara (BA) TAPD">Berita Acara (BA) TAPD Pemda</option>
        <option value="SK KPU">Keputusan KPU (SK KPU Ngawi)</option>
        <option value="Surat Permohonan Pergeseran">Surat Permohonan Pergeseran Anggaran ke Pemda</option>
        <option value="Adendum NPHD">Adendum NPHD</option>
      `;
    }
  }
}

async function submitRevisionForm() {
  const currentId = AppState.currentPeriode.id;
  const payload = {
    nama_periode: document.getElementById('rev-nama-periode')?.value || '',
    versi_revisi: document.getElementById('rev-versi')?.value || '',
    tahap_revisi: document.getElementById('rev-fase')?.value || 'PASCA_NPHD',
    dasar_pengesahan: document.getElementById('rev-dasar')?.value || '',
    nomor_ba_tapd: document.getElementById('rev-nomor-ba')?.value || '',
    tanggal_ba_tapd: document.getElementById('rev-tanggal-ba')?.value || '',
    catatan_revisi: document.getElementById('rev-catatan')?.value || ''
  };

  try {
    const res = await apiFetch(`/api/periodes/${currentId}/clone-revision`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    closeRevisionModal();
    alert(`Dokumen usulan revisi "${res.periode.versi_revisi}" berhasil dibuat!\n\nDokumen revisi baru ini sekarang AKTIF (dapat diedit) dan rincian belanja telah disalin lengkap.`);
    await loadPeriodes();
    AppState.currentPeriode = res.periode;
    await loadRkbData();
    renderAllViews();
    switchView('view-rkb');
  } catch (err) {
    alert('Gagal menerbitkan usulan revisi: ' + err.message);
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let pendingExportPeriodeId = null;

function downloadExcel(periodeId = null) {
  try {
    const pId = periodeId || (AppState.currentPeriode ? AppState.currentPeriode.id : null) || (document.getElementById('dashboard-periode-select')?.value ? Number(document.getElementById('dashboard-periode-select').value) : null);
    if (!pId) {
      alert('Silakan pilih dokumen RUH Belanja terlebih dahulu.');
      return;
    }
    pendingExportPeriodeId = pId;

    const periode = (AppState.periodes && AppState.periodes.find(p => p.id === pId)) || AppState.currentPeriode;
    const docInfo = document.getElementById('export-modal-doc-info');
    if (docInfo && periode) {
      docInfo.textContent = `Dokumen: ${periode.nama_periode || 'RUH Belanja'} | Versi: ${periode.versi_revisi || 'Induk'}`;
    }

    // Cek apakah filter layar sedang aktif
    const currentPic = (AppState.filters && AppState.filters.pic) || 'SEMUA';
    const currentSasaran = (AppState.filters && AppState.filters.sasaran) || 'ALL';
    const isFiltered = (currentPic !== 'SEMUA' || currentSasaran !== 'ALL');

    const picSelect = document.getElementById('export-filter-pic');
    const sasaranSelect = document.getElementById('export-filter-sasaran');
    const scopeFullRadio = document.getElementById('export-scope-full');
    const scopeFilteredRadio = document.getElementById('export-scope-filtered');

    if (picSelect) picSelect.value = currentPic;
    if (sasaranSelect) sasaranSelect.value = currentSasaran;

    // Role checking (Level 0 Developer, Level 1 Perencanaan)
    const user = AppState.currentUser;
    const roleNotice = document.getElementById('export-role-notice');
    const scopeZipRadio = document.getElementById('export-scope-zip');
    const btnQuickZip = document.getElementById('btn-quick-zip');

    if (user && user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
      // Wewenang Subbagian
      if (scopeFilteredRadio) scopeFilteredRadio.checked = true;
      if (scopeFullRadio) scopeFullRadio.disabled = true;
      if (scopeZipRadio) scopeZipRadio.disabled = true;
      if (btnQuickZip) btnQuickZip.style.display = 'none';

      let userPic = (user.pic_subbag || '').toUpperCase();
      if (userPic === 'PERENCANAAN') userPic = 'RENDATIN';
      if (userPic === 'KEUANGAN') userPic = 'KUL';
      if (userPic === 'PARMAS') userPic = 'PARSDM';
      if (picSelect) {
        picSelect.value = userPic;
        picSelect.disabled = true;
      }
      if (roleNotice) {
        const subMeta = SUBBAG_META[userPic];
        const subName = subMeta ? subMeta.name : userPic;
        roleNotice.innerHTML = `<span>🔒 <strong>Wewenang Subbag:</strong> Ekspor dibatasi untuk <u>${escapeHtml(subName)}</u>.</span>`;
      }
    } else {
      // Level 0 & Level 1 (Full Access)
      if (scopeFullRadio) scopeFullRadio.disabled = false;
      if (scopeZipRadio) scopeZipRadio.disabled = false;
      if (btnQuickZip) btnQuickZip.style.display = 'inline-flex';
      if (picSelect) picSelect.disabled = false;

      if (isFiltered) {
        if (scopeFilteredRadio) scopeFilteredRadio.checked = true;
      } else {
        if (scopeFullRadio) scopeFullRadio.checked = true;
      }
      if (roleNotice) {
        const roleName = user ? (user.level === 0 ? 'Developer' : 'Perencanaan') : 'Akses Penuh';
        roleNotice.innerHTML = `<span>ℹ️ <strong>Akses Penuh (${escapeHtml(roleName)}):</strong> Anda berwenang mencetak seluruh maupun per-bagian dokumen.</span>`;
      }
    }

    toggleExportFilterScope();

    const modal = document.getElementById('modal-export-excel');
    if (modal) {
      modal.style.display = 'flex';
    } else {
      // Fallback jika modal tidak ditemukan di DOM
      window.location.href = `/api/export-excel/${pId}`;
    }
  } catch (err) {
    console.error('Error saat membuka modal ekspor excel:', err);
    // Fallback: unduh langsung
    if (AppState.currentPeriode) {
      window.location.href = `/api/export-excel/${AppState.currentPeriode.id}`;
    }
  }
}

function closeExportModal() {
  const modal = document.getElementById('modal-export-excel');
  if (modal) modal.style.display = 'none';
  pendingExportPeriodeId = null;
}

function toggleExportFilterScope() {
  const isFiltered = document.getElementById('export-scope-filtered')?.checked;
  const isZip = document.getElementById('export-scope-zip')?.checked;
  const filterDetails = document.getElementById('export-filter-details');
  const btnExecute = document.getElementById('btn-execute-export');

  if (filterDetails) {
    filterDetails.style.display = isFiltered ? 'block' : 'none';
  }

  if (btnExecute) {
    if (isZip) {
      btnExecute.innerHTML = '📦 Unduh Paket 5 Kasubbag (.zip)';
      btnExecute.className = 'btn btn-primary';
    } else {
      btnExecute.innerHTML = '📥 Unduh Sekarang (.xlsx)';
      btnExecute.className = 'btn btn-success';
    }
  }
}

// ============================================================================
// SISTEM MONITORING REPORT & ASYNC DOWNLOAD (SAKTI KEMENKEU STYLE)
// ============================================================================

let monitoringPollTimer = null;
let monitoringData = [];
let monitoringCurrentPage = 1;
const MONITORING_PER_PAGE = 10;

async function executeExportExcel() {
  if (!pendingExportPeriodeId) return;

  const isZip = document.getElementById('export-scope-zip')?.checked;
  if (isZip) {
    await downloadAllSubbagZip(pendingExportPeriodeId);
    closeExportModal();
    return;
  }

  const isFiltered = document.getElementById('export-scope-filtered')?.checked;
  let pic = 'SEMUA';
  let sasaran = 'ALL';

  if (isFiltered) {
    pic = document.getElementById('export-filter-pic')?.value || 'SEMUA';
    sasaran = document.getElementById('export-filter-sasaran')?.value || 'ALL';
  }

  const periode = AppState.periodesList?.find(p => p.id === pendingExportPeriodeId) || AppState.currentPeriode;
  const versiStr = (periode?.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filterSuffix = (pic !== 'SEMUA' ? `_${pic}` : '') + (sasaran !== 'ALL' ? `_${sasaran}` : '');
  const filename = `RUH_Belanja_${versiStr}${filterSuffix}.xlsx`;

  try {
    const res = await fetch('/api/download-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama_file: filename,
        tipe_unduhan: 'EXCEL_RUH',
        periode_id: pendingExportPeriodeId,
        filter_pic: pic,
        filter_sasaran: sasaran
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Permintaan unduh berkas berhasil dikirim ke antrean. Mengalihkan ke Monitoring Report...', 'info');
      closeExportModal();
      switchView('view-monitoring');
    } else {
      showToast(result.error || 'Gagal membuat permintaan unduhan.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

async function downloadAllSubbagZip(periodeId = null) {
  const pId = periodeId || pendingExportPeriodeId || (AppState.currentPeriode ? AppState.currentPeriode.id : 1);
  if (!pId) return;

  const periode = AppState.periodesList?.find(p => p.id === pId) || AppState.currentPeriode;
  const versiStr = (periode?.versi_revisi || 'Induk').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Paket_RUH_5_Subbagian_${versiStr}.zip`;

  try {
    const res = await fetch('/api/download-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nama_file: filename,
        tipe_unduhan: 'ZIP_SUBBAGIAN',
        periode_id: pId
      })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Permintaan paket 5 Subbagian (.zip) berhasil dikirim. Mengalihkan ke Monitoring Report...', 'info');
      closeExportModal();
      switchView('view-monitoring');
    } else {
      showToast(result.error || 'Gagal membuat permintaan unduhan zip.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

async function loadMonitoringReport() {
  if (monitoringPollTimer) {
    clearTimeout(monitoringPollTimer);
    monitoringPollTimer = null;
  }

  const search = document.getElementById('monitoring-search-file')?.value || '';
  const dateStart = document.getElementById('monitoring-date-start')?.value || '';
  const dateEnd = document.getElementById('monitoring-date-end')?.value || '';

  const params = new URLSearchParams();
  if (search.trim()) params.append('search', search.trim());
  if (dateStart) params.append('tanggal_mulai', dateStart);
  if (dateEnd) params.append('tanggal_selesai', dateEnd);

  const tbody = document.getElementById('monitoring-table-body');
  try {
    const res = await fetch(`/api/download-requests?${params.toString()}`);
    if (!res.ok) throw new Error('Gagal memuat antrean unduhan');
    monitoringData = await res.json();
    renderMonitoringTable();

    // Cek jika ada yang masih berstatus DIPROSES, lakukan auto-poll
    const hasProcessing = monitoringData.some(d => d.status === 'DIPROSES');
    if (hasProcessing && AppState.activeView === 'view-monitoring') {
      monitoringPollTimer = setTimeout(() => {
        loadMonitoringReport();
      }, 2500);
    }
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 24px; color: #dc2626;">Gagal memuat data: ${err.message}</td></tr>`;
    }
  }
}

function renderMonitoringTable() {
  const tbody = document.getElementById('monitoring-table-body');
  if (!tbody) return;

  const countBadge = document.getElementById('badge-monitoring-count');
  if (countBadge) countBadge.textContent = monitoringData.filter(d => d.status === 'SELESAI').length;

  const totalItems = monitoringData.length;
  const labelCount = document.getElementById('monitoring-count-label');
  if (labelCount) labelCount.textContent = `Menampilkan ${totalItems} data`;

  if (totalItems === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 30px; color: var(--text-muted);">Tidak ada riwayat permintaan unduhan.</td></tr>';
    return;
  }

  const startIdx = (monitoringCurrentPage - 1) * MONITORING_PER_PAGE;
  const pageData = monitoringData.slice(startIdx, startIdx + MONITORING_PER_PAGE);

  const pageBadge = document.getElementById('monitoring-page-badge');
  if (pageBadge) pageBadge.textContent = monitoringCurrentPage;

  tbody.innerHTML = pageData.map(item => {
    let statusBadge = '';
    let dlBtn = '';

    if (item.status === 'DIPROSES') {
      statusBadge = '<span class="badge-diproses"><span class="spinner-sm" style="display:inline-block;width:12px;height:12px;border:2px solid #856404;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;"></span> Diproses</span>';
      dlBtn = '<button class="btn-sakti-download disabled" disabled title="Berkas sedang dibuat...">📄 Download</button>';
    } else if (item.status === 'SELESAI') {
      statusBadge = '<span class="badge-selesai">✓ Selesai</span>';
      dlBtn = `<a href="/api/download-requests/${item.id}/file" class="btn-sakti-download" target="_blank" download="${escapeHtml(item.nama_file)}">📄 Download</a>`;
    } else if (item.status === 'KADALUARSA') {
      statusBadge = '<span class="badge-kadaluarsa">⚠️ Kadaluarsa</span>';
      dlBtn = '<button class="btn-sakti-download disabled" disabled title="Berkas telah kadaluarsa (> 1 jam) dan terhapus otomatis">Kadaluarsa</button>';
    } else {
      statusBadge = '<span class="badge-gagal">✕ Gagal</span>';
      dlBtn = `<button class="btn-sakti-download disabled" disabled title="${escapeHtml(item.error_message || 'Gagal')}">Gagal</button>`;
    }

    return `
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; color: #1e293b;">
          ${escapeHtml(item.nama_file)}
          ${item.file_size ? `<small style="display:block; color:#64748b; font-weight:normal;">${(item.file_size / 1024).toFixed(1)} KB</small>` : ''}
        </td>
        <td style="padding: 10px 14px; text-align: center; color: #475569; font-size: 12.5px;">${escapeHtml(item.request_time || '-')}</td>
        <td style="padding: 10px 14px; text-align: center;">${statusBadge}</td>
        <td style="padding: 10px 14px; text-align: center;">${dlBtn}</td>
      </tr>
    `;
  }).join('');
}

function resetMonitoringFilter() {
  setElVal('monitoring-search-file', '');
  setElVal('monitoring-date-start', '');
  setElVal('monitoring-date-end', '');
  monitoringCurrentPage = 1;
  loadMonitoringReport();
}

function changeMonitoringPage(dir) {
  const maxPage = Math.max(1, Math.ceil(monitoringData.length / MONITORING_PER_PAGE));
  if (dir === 'first') monitoringCurrentPage = 1;
  else if (dir === 'prev') monitoringCurrentPage = Math.max(1, monitoringCurrentPage - 1);
  else if (dir === 'next') monitoringCurrentPage = Math.min(maxPage, monitoringCurrentPage + 1);
  else if (dir === 'last') monitoringCurrentPage = maxPage;
  renderMonitoringTable();
}

// ============================================================================
// VIEW: MASTER PPK (19 KECAMATAN)
// ============================================================================

function renderDbPpk() {
  if (!AppState.masters) return;
  const { kecamatans, desas } = AppState.masters;

  const desaByKec = {};
  for (const d of desas) {
    if (!desaByKec[d.kecamatan_id]) desaByKec[d.kecamatan_id] = [];
    desaByKec[d.kecamatan_id].push(d);
  }

  // Summary strip
  const elTotalKec = document.getElementById('ppk-stat-total-kec');
  const elTotalKom = document.getElementById('ppk-stat-total-kom');
  const elTotalSek = document.getElementById('ppk-stat-total-sek');
  if (elTotalKec) elTotalKec.textContent = `${kecamatans.length} Kecamatan`;
  if (elTotalKom) elTotalKom.textContent = `${kecamatans.length * 5} Orang`;
  if (elTotalSek) elTotalSek.textContent = `${kecamatans.length * 3} Orang`;

  const tbody = document.getElementById('table-db-ppk');
  if (!tbody) return;

  tbody.innerHTML = kecamatans.map((k, idx) => {
    const kecDesas = desaByKec[k.id] || [];
    const totalTps = kecDesas.reduce((a, b) => a + (Number(b.tps) || 0), 0);
    return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center" style="font-family: var(--font-mono); font-weight: 700;">${k.no_urut || (idx + 1)}</td>
        <td><strong>${escapeHtml(k.nama)}</strong></td>
        <td><code style="font-family: var(--font-mono);">${escapeHtml(k.kode || '-')}</code></td>
        <td>${escapeHtml(k.camat_nama || '-')}</td>
        <td>${escapeHtml(k.ketua_ppk || k.ketua_nama || '-')}</td>
        <td>${escapeHtml(k.sekretaris_ppk || k.sekretaris_nama || '-')}</td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${escapeHtml(k.sekretaris_nip || '-')}</td>
        <td class="text-center"><span class="badge badge-secondary">${kecDesas.length} Desa</span></td>
        <td class="text-center"><span class="badge badge-primary">${formatNumber(totalTps)} TPS</span></td>
        <td class="text-center">
          <button type="button" class="btn btn-outline btn-sm" onclick="openModalKecamatan(${k.id})" title="Edit Kecamatan">✏️</button>
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteKecamatan(${k.id})" title="Hapus Kecamatan">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterDbPpk() {
  const keyword = (document.getElementById('filter-db-ppk')?.value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#table-db-ppk tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(keyword) ? '' : 'none';
  });
}

function openModalKecamatan(id = null) {
  const modal = document.getElementById('modal-kecamatan');
  if (!modal) return;
  document.getElementById('form-kecamatan')?.reset();
  setElVal('kecamatan-id', id || '');

  if (id && AppState.masters?.kecamatans) {
    const k = AppState.masters.kecamatans.find(item => item.id === Number(id));
    if (k) {
      setElVal('kecamatan-no-urut', k.no_urut || 1);
      setElVal('kecamatan-kode', k.kode || '');
      setElVal('kecamatan-nama', k.nama || '');
      setElVal('kecamatan-camat', k.camat_nama || '');
      setElVal('kecamatan-ketua', k.ketua_ppk || k.ketua_nama || '');
      setElVal('kecamatan-sekretaris', k.sekretaris_ppk || k.sekretaris_nama || '');
      setElVal('kecamatan-sekretaris-nip', k.sekretaris_nip || '');
    }
  } else {
    const maxNo = (AppState.masters?.kecamatans?.length || 0) + 1;
    setElVal('kecamatan-no-urut', maxNo);
  }
  modal.style.display = 'flex';
}

function closeModalKecamatan() {
  const modal = document.getElementById('modal-kecamatan');
  if (modal) modal.style.display = 'none';
}

async function submitModalKecamatan() {
  const id = document.getElementById('kecamatan-id')?.value;
  const no_urut = document.getElementById('kecamatan-no-urut')?.value;
  const kode = document.getElementById('kecamatan-kode')?.value;
  const nama = document.getElementById('kecamatan-nama')?.value;
  const camat_nama = document.getElementById('kecamatan-camat')?.value;
  const ketua_ppk = document.getElementById('kecamatan-ketua')?.value;
  const sekretaris_ppk = document.getElementById('kecamatan-sekretaris')?.value;
  const sekretaris_nip = document.getElementById('kecamatan-sekretaris-nip')?.value;

  if (!nama || !nama.trim()) {
    showToast('Nama kecamatan tidak boleh kosong.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/master/kecamatan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AppState.token || ''}`
      },
      body: JSON.stringify({ id, no_urut, kode, nama, camat_nama, ketua_ppk, sekretaris_ppk, sekretaris_nip })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Data Kecamatan berhasil disimpan.', 'success');
      closeModalKecamatan();
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } else {
      showToast(result.error || 'Gagal menyimpan kecamatan.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

async function deleteKecamatan(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus kecamatan ini?')) return;
  try {
    const res = await fetch(`/api/master/kecamatan/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${AppState.token || ''}` }
    });
    const result = await res.json();
    if (result.success) {
      showToast('Kecamatan berhasil dihapus.', 'success');
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } else {
      showToast(result.error || 'Gagal menghapus kecamatan.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

// ============================================================================
// VIEW: MASTER DESA & TPS (217 PPS) - BASIS DATA PRIMER REAKTIF
// ============================================================================

function renderDbPps() {
  if (!AppState.masters) return;
  const { kecamatans, desas } = AppState.masters;

  // Update summary strip
  const totalDesa = desas.length;
  const totalTps = desas.reduce((a, b) => a + (Number(b.tps) || 0), 0);
  const totalPemilih = desas.reduce((a, b) => a + (Number(b.pemilih) || 0), 0);
  const totalPantarlih = desas.reduce((a, b) => a + (Number(b.pantarlih) || 0), 0);

  const elTotalDesa = document.getElementById('pps-stat-total-desa');
  const elTotalTps = document.getElementById('pps-stat-total-tps');
  const elTotalPem = document.getElementById('pps-stat-total-pemilih');
  const elTotalPan = document.getElementById('pps-stat-total-pantarlih');

  if (elTotalDesa) elTotalDesa.textContent = `${totalDesa} Desa`;
  if (elTotalTps) elTotalTps.textContent = `${formatNumber(totalTps)} TPS`;
  if (elTotalPem) elTotalPem.textContent = `${formatNumber(totalPemilih)} Jiwa`;
  if (elTotalPan) elTotalPan.textContent = `${formatNumber(totalPantarlih)} Orang`;

  // Update kecamatan dropdown
  const selKec = document.getElementById('filter-db-pps-kec');
  if (selKec && selKec.options.length <= 1) {
    selKec.innerHTML = '<option value="ALL">-- Semua Kecamatan (217 Desa) --</option>' +
      kecamatans.map(k => `<option value="${k.id}">Kecamatan ${escapeHtml(k.nama)}</option>`).join('');
  }

  filterDbPps();
}

function filterDbPps() {
  if (!AppState.masters) return;
  const { kecamatans, desas } = AppState.masters;
  const kecId = document.getElementById('filter-db-pps-kec')?.value || 'ALL';
  const keyword = (document.getElementById('filter-db-pps-text')?.value || '').toLowerCase().trim();

  const kecMap = {};
  for (const k of kecamatans) kecMap[k.id] = k.nama;

  const filtered = desas.filter(d => {
    if (kecId !== 'ALL' && String(d.kecamatan_id) !== String(kecId)) return false;
    if (keyword) {
      const kecName = (kecMap[d.kecamatan_id] || '').toLowerCase();
      const match = d.nama.toLowerCase().includes(keyword) || 
                    kecName.includes(keyword) || 
                    (d.ketua_nama && d.ketua_nama.toLowerCase().includes(keyword)) ||
                    (d.sekretaris_nama && d.sekretaris_nama.toLowerCase().includes(keyword));
      if (!match) return false;
    }
    return true;
  });

  const tbody = document.getElementById('table-db-pps');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="12" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada desa/kelurahan yang cocok dengan filter.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((d, idx) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td><strong>${escapeHtml(kecMap[d.kecamatan_id] || '-')}</strong></td>
      <td><strong>${escapeHtml(d.nama)}</strong></td>
      <td class="text-center"><span class="badge badge-primary">${formatNumber(d.tps)} TPS</span></td>
      <td class="text-center" style="font-weight: 600; color: #059669;">${formatNumber(d.pantarlih)}</td>
      <td class="text-right" style="font-weight: 700; color: #7c3aed; font-family: var(--font-mono);">${formatNumber(d.pemilih || 0)}</td>
      <td class="text-center">${formatNumber(d.kotak || d.tps)}</td>
      <td class="text-center">${formatNumber(d.rohaniwan || 1)}</td>
      <td>${escapeHtml(d.ketua_nama || '-')}</td>
      <td>${escapeHtml(d.sekretaris_nama || '-')}</td>
      <td style="font-family: var(--font-mono); font-size: 11px;">${escapeHtml(d.sekretaris_nip || '-')}</td>
      <td class="text-center">
        <button type="button" class="btn btn-outline btn-sm" onclick="openModalDesa(${d.id})" title="Edit Desa">✏️</button>
        <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteDesa(${d.id})" title="Hapus Desa">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function openModalDesa(id = null) {
  const modal = document.getElementById('modal-desa');
  if (!modal) return;
  document.getElementById('form-desa')?.reset();
  setElVal('desa-id', id || '');

  // Populate kecamatan selector
  const selKec = document.getElementById('desa-kecamatan-id');
  if (selKec && AppState.masters?.kecamatans) {
    selKec.innerHTML = AppState.masters.kecamatans.map(k => `<option value="${k.id}">Kecamatan ${escapeHtml(k.nama)}</option>`).join('');
  }

  if (id && AppState.masters?.desas) {
    const d = AppState.masters.desas.find(item => item.id === Number(id));
    if (d) {
      setElVal('desa-kecamatan-id', d.kecamatan_id);
      setElVal('desa-no-urut', d.no_urut || 1);
      setElVal('desa-nama', d.nama || '');
      setElVal('desa-tps', d.tps || 1);
      setElVal('desa-pantarlih', d.pantarlih || (d.tps * 2));
      setElVal('desa-pemilih', d.pemilih || 0);
      setElVal('desa-kotak', d.kotak || d.tps);
      setElVal('desa-rohaniwan', d.rohaniwan || 1);
      setElVal('desa-ketua', d.ketua_nama || '');
      setElVal('desa-sekretaris', d.sekretaris_nama || '');
      setElVal('desa-sekretaris-nip', d.sekretaris_nip || '');
    }
  }
  modal.style.display = 'flex';
}

function closeModalDesa() {
  const modal = document.getElementById('modal-desa');
  if (modal) modal.style.display = 'none';
}

async function submitModalDesa() {
  const id = document.getElementById('desa-id')?.value;
  const kecamatan_id = document.getElementById('desa-kecamatan-id')?.value;
  const no_urut = document.getElementById('desa-no-urut')?.value;
  const nama = document.getElementById('desa-nama')?.value;
  const tps = document.getElementById('desa-tps')?.value;
  const pantarlih = document.getElementById('desa-pantarlih')?.value;
  const pemilih = document.getElementById('desa-pemilih')?.value;
  const kotak = document.getElementById('desa-kotak')?.value;
  const rohaniwan = document.getElementById('desa-rohaniwan')?.value;
  const ketua_nama = document.getElementById('desa-ketua')?.value;
  const sekretaris_nama = document.getElementById('desa-sekretaris')?.value;
  const sekretaris_nip = document.getElementById('desa-sekretaris-nip')?.value;

  if (!nama || !nama.trim()) {
    showToast('Nama desa tidak boleh kosong.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/master/desa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AppState.token || ''}`
      },
      body: JSON.stringify({ id, kecamatan_id, no_urut, nama, tps, pantarlih, pemilih, kotak, rohaniwan, ketua_nama, sekretaris_nama, sekretaris_nip })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Data Desa & TPS berhasil disimpan. Seluruh baris RKB otomatis dihitung ulang.', 'success');
      closeModalDesa();
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } else {
      showToast(result.error || 'Gagal menyimpan desa.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

async function deleteDesa(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus desa ini?')) return;
  try {
    const res = await fetch(`/api/master/desa/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${AppState.token || ''}` }
    });
    const result = await res.json();
    if (result.success) {
      showToast('Desa berhasil dihapus.', 'success');
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } else {
      showToast(result.error || 'Gagal menghapus desa.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

// ============================================================================
// VIEW: MASTER PASANGAN CALON (PASLON)
// ============================================================================

function renderDbPaslon() {
  if (!AppState.masters) return;
  const paslons = AppState.masters.paslons || [];

  const elStatTotal = document.getElementById('paslon-stat-total');
  const elStatKoef = document.getElementById('paslon-stat-koef');
  if (elStatTotal) elStatTotal.textContent = `${paslons.length} Pasangan`;
  if (elStatKoef) elStatKoef.textContent = `${paslons.length} Paslon`;

  const tbody = document.getElementById('table-db-paslon');
  if (!tbody) return;

  if (paslons.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted);">Belum ada pasangan calon terdaftar.</td></tr>';
    return;
  }

  tbody.innerHTML = paslons.map(p => `
    <tr>
      <td class="text-center" style="font-size: 16px; font-weight: 800; color: #1e40af;">
        <span class="badge badge-primary" style="font-size: 14px; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%;">
          ${p.no_urut}
        </span>
      </td>
      <td><strong style="color: #0f172a; font-size: 13.5px;">${escapeHtml(p.nama_calon_bupati)}</strong></td>
      <td><strong style="color: #334155; font-size: 13.5px;">${escapeHtml(p.nama_calon_wakil_bupati)}</strong></td>
      <td><span style="font-size: 12px; color: #475569;">${escapeHtml(p.partai_pengusung || '-')}</span></td>
      <td><i style="color: #64748b; font-size: 12px;">"${escapeHtml(p.slogan || '-')}"</i></td>
      <td><small style="color: #64748b;">${escapeHtml(p.keterangan || '-')}</small></td>
      <td class="text-center">
        <button type="button" class="btn btn-outline btn-sm" onclick="openModalPaslon(${p.id})" title="Edit Paslon">✏️</button>
        <button type="button" class="btn btn-outline-danger btn-sm" onclick="deletePaslon(${p.id})" title="Hapus Paslon">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function filterDbPaslon() {
  const keyword = (document.getElementById('filter-db-paslon')?.value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#table-db-paslon tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(keyword) ? '' : 'none';
  });
}

function openModalPaslon(id = null) {
  const modal = document.getElementById('modal-paslon');
  if (!modal) return;
  document.getElementById('form-paslon')?.reset();
  setElVal('paslon-id', id || '');

  if (id && AppState.masters?.paslons) {
    const p = AppState.masters.paslons.find(item => item.id === Number(id));
    if (p) {
      setElVal('paslon-no-urut', p.no_urut || 1);
      setElVal('paslon-bupati', p.nama_calon_bupati || '');
      setElVal('paslon-wakil', p.nama_calon_wakil_bupati || '');
      setElVal('paslon-partai', p.partai_pengusung || '');
      setElVal('paslon-slogan', p.slogan || '');
      setElVal('paslon-keterangan', p.keterangan || '');
    }
  } else {
    const maxNo = (AppState.masters?.paslons?.length || 0) + 1;
    setElVal('paslon-no-urut', maxNo);
  }
  modal.style.display = 'flex';
}

function closeModalPaslon() {
  const modal = document.getElementById('modal-paslon');
  if (modal) modal.style.display = 'none';
}

async function submitModalPaslon() {
  const id = document.getElementById('paslon-id')?.value;
  const no_urut = document.getElementById('paslon-no-urut')?.value;
  const nama_calon_bupati = document.getElementById('paslon-bupati')?.value;
  const nama_calon_wakil_bupati = document.getElementById('paslon-wakil')?.value;
  const partai_pengusung = document.getElementById('paslon-partai')?.value;
  const slogan = document.getElementById('paslon-slogan')?.value;
  const keterangan = document.getElementById('paslon-keterangan')?.value;

  if (!nama_calon_bupati || !nama_calon_wakil_bupati) {
    showToast('Nama calon bupati dan wakil bupati wajib diisi.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/master/paslon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AppState.token || ''}`
      },
      body: JSON.stringify({ id, no_urut, nama_calon_bupati, nama_calon_wakil_bupati, partai_pengusung, slogan, keterangan })
    });
    const result = await res.json();
    if (result.success) {
      showToast('Data Pasangan Calon berhasil disimpan. Koefisien RKB otomatis diperbarui.', 'success');
      closeModalPaslon();
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } else {
      showToast(result.error || 'Gagal menyimpan paslon.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

async function deletePaslon(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus pasangan calon ini?')) return;
  try {
    const res = await fetch(`/api/master/paslon/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${AppState.token || ''}` }
    });
    const result = await res.json();
    if (result.success) {
      showToast('Pasangan calon berhasil dihapus.', 'success');
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } else {
      showToast(result.error || 'Gagal menghapus paslon.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan jaringan.', 'error');
  }
}

// ============================================================================
// VIEW: PARAMETER & KUANTITAS SSOT
// ============================================================================

function renderDbKuantitas() {
  if (!AppState.masters) return;
  const { kuantitas, kecamatans, desas, paslons } = AppState.masters;

  const totalKec = kecamatans.length;
  const totalDesa = desas.length;
  const totalTps = desas.reduce((a, b) => a + (Number(b.tps) || 0), 0);
  const totalPemilih = desas.reduce((a, b) => a + (Number(b.pemilih) || 0), 0);
  const totalPantarlih = desas.reduce((a, b) => a + (Number(b.pantarlih) || 0), 0);
  const totalPaslon = (paslons || []).length;

  setElText('kuantitas-stat-kec', totalKec);
  setElText('kuantitas-stat-desa', totalDesa);
  setElText('kuantitas-stat-tps', formatNumber(totalTps));
  setElText('kuantitas-stat-pemilih', formatNumber(totalPemilih));
  setElText('kuantitas-stat-pantarlih', formatNumber(totalPantarlih));
  setElText('kuantitas-stat-paslon', totalPaslon);

  const tbody = document.getElementById('table-db-kuantitas');
  if (!tbody) return;

  tbody.innerHTML = kuantitas.map(q => {
    let sourceBadge = '';
    if (['tps_rkb', 'pemilih_dpt', 'dpt', 'pantarlih'].includes(q.kode)) {
      sourceBadge = '<span class="badge badge-success" style="font-size:11px;">Reaktif: Detail Desa/TPS</span>';
    } else if (q.kode === 'kec_ppk') {
      sourceBadge = '<span class="badge badge-info" style="font-size:11px;">Reaktif: Master PPK</span>';
    } else if (q.kode === 'paslon') {
      sourceBadge = '<span class="badge badge-primary" style="font-size:11px;">Reaktif: Master Paslon</span>';
    } else if (['kpps_ketua', 'kpps_anggota', 'linmas_tps', 'petugas_tps', 'ppk_ketua', 'pps_ketua'].includes(q.kode)) {
      sourceBadge = '<span class="badge badge-secondary" style="font-size:11px;">Formula Agregat Otomatis</span>';
    } else {
      sourceBadge = '<span class="badge badge-warning" style="font-size:11px;">Konfigurasi Koefisien</span>';
    }

    return `
      <tr>
        <td><code style="font-family: var(--font-mono); font-weight: 700; color: #0284c7;">@${q.kode}</code></td>
        <td><strong>${escapeHtml(q.nama || q.uraian)}</strong></td>
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent); font-size: 13.5px;">${formatNumber(q.nilai)}</td>
        <td>${escapeHtml(q.satuan || '')}</td>
        <td>
          ${sourceBadge}
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(q.keterangan || '-')}</div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterDbKuantitas() {
  const keyword = (document.getElementById('filter-db-kuantitas')?.value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#table-db-kuantitas tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(keyword) ? '' : 'none';
  });
}

// ============================================================================
// VIEW: STANDAR BIAYA MASUKAN (SBM)
// ============================================================================

function renderDbSbm() {
  if (!AppState.masters) return;
  const { sbms } = AppState.masters;

  const selKat = document.getElementById('filter-db-sbm-kat');
  if (selKat && selKat.options.length <= 1) {
    const categories = Array.from(new Set(sbms.map(s => s.kategori).filter(Boolean)));
    selKat.innerHTML = '<option value="ALL">-- Semua Kategori SBM --</option>' +
      categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }

  filterDbSbm();
}

function filterDbSbm() {
  if (!AppState.masters) return;
  const { sbms } = AppState.masters;
  const selectedKat = document.getElementById('filter-db-sbm-kat')?.value || 'ALL';
  const keyword = (document.getElementById('filter-db-sbm-text')?.value || '').toLowerCase().trim();

  const filtered = sbms.filter(s => {
    if (selectedKat !== 'ALL' && s.kategori !== selectedKat) return false;
    if (keyword) {
      const match = (s.uraian || '').toLowerCase().includes(keyword) ||
                    (s.kategori || '').toLowerCase().includes(keyword) ||
                    (s.kode_akun || '').toLowerCase().includes(keyword) ||
                    (s.dasar_hukum || '').toLowerCase().includes(keyword);
      if (!match) return false;
    }
    return true;
  });

  const tbody = document.getElementById('table-db-sbm');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada standar biaya masukan yang cocok.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((s, idx) => `
    <tr>
      <td class="text-center" style="font-weight: 600; color: #64748b;">${idx + 1}</td>
      <td><code style="font-family: var(--font-mono); font-weight: 700; color: #0284c7;">${escapeHtml(s.kode_akun || '521211')}</code></td>
      <td><span class="badge badge-secondary">${escapeHtml(s.kategori || 'SBM')}</span></td>
      <td><strong>${escapeHtml(s.uraian)}</strong></td>
      <td class="text-center">${escapeHtml(s.satuan || '')}</td>
      <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: #1e40af;">${formatRupiah(s.harga_satuan || s.pagu_sbm)}</td>
      <td><small style="color: #64748b;">${escapeHtml(s.jenis_regulasi || 'SBM')} ${escapeHtml(s.dasar_hukum || '')}</small></td>
      <td class="text-center" style="white-space: nowrap;">
        <button type="button" class="btn btn-xs btn-outline-primary" onclick="openModalSbm(${s.id})" title="Edit Standar Biaya">✏️ Edit</button>
        <button type="button" class="btn btn-xs btn-outline-danger" onclick="deleteSbm(${s.id})" title="Hapus Standar Biaya">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function openModalSbm(id = null) {
  const selKode = document.getElementById('sbm-kode-akun');
  if (selKode && AppState.masters && AppState.masters.akuns) {
    selKode.innerHTML = AppState.masters.akuns.map(a => `<option value="${a.kode}">[${a.kode}] ${escapeHtml(a.uraian)}</option>`).join('');
  }

  if (id) {
    const s = (AppState.masters.sbms || []).find(item => item.id === Number(id));
    if (!s) return;
    setElText('modal-sbm-title', `✏️ Edit Standar Biaya: ${s.uraian}`);
    setElVal('sbm-id', s.id);
    setElVal('sbm-kode-akun', s.kode_akun || '521211');
    setElVal('sbm-kategori', s.kategori || 'Umum');
    setElVal('sbm-uraian', s.uraian || '');
    setElVal('sbm-satuan', s.satuan || 'OK');
    setElVal('sbm-harga-satuan', s.harga_satuan || s.pagu_sbm || 0);
    setElVal('sbm-jenis-regulasi', s.jenis_regulasi || 'SBM');
    setElVal('sbm-dasar-hukum', s.dasar_hukum || '');
    setElVal('sbm-keterangan', s.keterangan || '');
  } else {
    setElText('modal-sbm-title', '➕ Tambah Standar Biaya Masukan (SBM) Baru');
    setElVal('sbm-id', '');
    setElVal('sbm-kode-akun', '521211');
    setElVal('sbm-kategori', 'Honorarium');
    setElVal('sbm-uraian', '');
    setElVal('sbm-satuan', 'OK');
    setElVal('sbm-harga-satuan', 0);
    setElVal('sbm-jenis-regulasi', 'SBM');
    setElVal('sbm-dasar-hukum', 'PMK Standar Biaya Masukan');
    setElVal('sbm-keterangan', '');
  }

  document.getElementById('modal-sbm').style.display = 'flex';
}

function closeModalSbm() {
  document.getElementById('modal-sbm').style.display = 'none';
}

async function submitModalSbm() {
  const uraian = (document.getElementById('sbm-uraian')?.value || '').trim();
  if (!uraian) {
    alert('Uraian Standar Biaya Masukan wajib diisi.');
    document.getElementById('sbm-uraian')?.focus();
    return;
  }

  const payload = {
    id: document.getElementById('sbm-id')?.value || undefined,
    kode_akun: document.getElementById('sbm-kode-akun')?.value || '521211',
    kategori: document.getElementById('sbm-kategori')?.value || 'Umum',
    uraian: uraian,
    satuan: document.getElementById('sbm-satuan')?.value || 'OK',
    harga_satuan: Number(document.getElementById('sbm-harga-satuan')?.value) || 0,
    pagu_sbm: Number(document.getElementById('sbm-harga-satuan')?.value) || 0,
    jenis_regulasi: document.getElementById('sbm-jenis-regulasi')?.value || 'SBM',
    dasar_hukum: document.getElementById('sbm-dasar-hukum')?.value || '',
    keterangan: document.getElementById('sbm-keterangan')?.value || ''
  };

  try {
    const res = await apiFetch('/api/master/sbm', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    alert(payload.id ? 'Data SBM berhasil diperbarui.' : 'Standar biaya masukan baru berhasil ditambahkan.');
    closeModalSbm();
    await loadMasters();
    renderDbSbm();
  } catch (err) {
    alert('Gagal menyimpan SBM: ' + err.message);
  }
}

async function deleteSbm(id) {
  const s = (AppState.masters.sbms || []).find(item => item.id === Number(id));
  const uraian = s ? s.uraian : `ID #${id}`;
  if (!confirm(`Apakah Anda yakin ingin menghapus Standar Biaya "${uraian}"?`)) return;

  try {
    await apiFetch(`/api/master/sbm/${id}`, { method: 'DELETE' });
    alert('Standar biaya berhasil dihapus.');
    await loadMasters();
    renderDbSbm();
  } catch (err) {
    alert('Gagal menghapus SBM: ' + err.message);
  }
}

function exportSbmExcel() {
  window.location.href = '/api/master/sbm/export';
}

function triggerImportSbm() {
  document.getElementById('input-file-sbm')?.click();
}

async function handleExcelUploadSbm(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = '';

  if (!confirm(`Mulai unggah berkas "${file.name}" untuk update masal Standar Biaya Masukan (SBM)?\nData akan dicocokkan berdasarkan ID atau (Kategori & Uraian).`)) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const base64Data = e.target.result.split(',')[1];
      const res = await apiFetch('/api/master/sbm/import', {
        method: 'POST',
        body: JSON.stringify({ file_base64: base64Data, filename: file.name })
      });
      alert(`✅ ${res.message || 'Update masal SBM berhasil!'}`);
      await loadMasters();
      renderDbSbm();
    } catch (err) {
      alert('❌ Gagal mengimpor data SBM: ' + err.message);
    }
  };
  reader.readAsDataURL(file);
}

// ============================================================================
// VIEW: BAGAN AKUN STANDAR (BAS)
// ============================================================================

function renderDbBas() {
  if (!AppState.masters) return;
  const { akuns } = AppState.masters;

  const selKel = document.getElementById('filter-db-bas-kel');
  if (selKel && selKel.options.length <= 1) {
    const kelompoks = Array.from(new Set(akuns.map(a => a.kelompok).filter(Boolean)));
    selKel.innerHTML = '<option value="ALL">-- Semua Kelompok Akun --</option>' +
      kelompoks.map(k => `<option value="${escapeHtml(k)}">${escapeHtml(k)}</option>`).join('');
  }

  filterDbBas();
}

function filterDbBas() {
  if (!AppState.masters) return;
  const { akuns } = AppState.masters;
  const selectedKel = document.getElementById('filter-db-bas-kel')?.value || 'ALL';
  const keyword = (document.getElementById('filter-db-bas-text')?.value || '').toLowerCase().trim();

  const filtered = akuns.filter(a => {
    if (selectedKel !== 'ALL' && a.kelompok !== selectedKel) return false;
    if (keyword) {
      const match = (a.kode || '').toLowerCase().includes(keyword) ||
                    (a.uraian || '').toLowerCase().includes(keyword) ||
                    (a.kelompok || '').toLowerCase().includes(keyword);
      if (!match) return false;
    }
    return true;
  });

  const tbody = document.getElementById('table-db-bas');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding: 24px; color: var(--text-muted);">Tidak ada akun BAS yang cocok.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((a, idx) => `
    <tr>
      <td class="text-center" style="font-weight: 600; color: #64748b;">${idx + 1}</td>
      <td><code style="font-family: var(--font-mono); font-weight: 700; color: #0284c7; font-size: 13px;">${escapeHtml(a.kode)}</code></td>
      <td><strong>${escapeHtml(a.uraian)}</strong></td>
      <td>${escapeHtml(a.kelompok || '-')}</td>
      <td><span class="badge badge-secondary">${escapeHtml(a.kategori_dn || 'Belanja')}</span></td>
      <td class="text-center" style="white-space: nowrap;">
        <button type="button" class="btn btn-xs btn-outline-primary" onclick="openModalBas(${a.id})" title="Edit Akun BAS">✏️ Edit</button>
        <button type="button" class="btn btn-xs btn-outline-danger" onclick="deleteAkun(${a.id})" title="Hapus Akun BAS">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function openModalBas(id = null) {
  if (id) {
    const a = (AppState.masters.akuns || []).find(item => item.id === Number(id));
    if (!a) return;
    setElText('modal-bas-title', `✏️ Edit Akun BAS: [${a.kode}] ${a.uraian}`);
    setElVal('bas-id', a.id);
    setElVal('bas-kode', a.kode || '');
    setElVal('bas-uraian', a.uraian || '');
    setElVal('bas-kelompok', a.kelompok || '521 - Belanja Barang');
    setElVal('bas-kategori-dn', a.kategori_dn || a.kode || '');
    setElVal('bas-keterangan', a.keterangan || '');
    document.getElementById('bas-kode').readOnly = false;
  } else {
    setElText('modal-bas-title', '➕ Tambah Akun BAS (6 Digit) Baru');
    setElVal('bas-id', '');
    setElVal('bas-kode', '');
    setElVal('bas-uraian', '');
    setElVal('bas-kelompok', '521 - Belanja Barang');
    setElVal('bas-kategori-dn', '');
    setElVal('bas-keterangan', '');
    document.getElementById('bas-kode').readOnly = false;
  }

  document.getElementById('modal-bas').style.display = 'flex';
}

function closeModalBas() {
  document.getElementById('modal-bas').style.display = 'none';
}

async function submitModalBas() {
  const kode = (document.getElementById('bas-kode')?.value || '').trim();
  const uraian = (document.getElementById('bas-uraian')?.value || '').trim();
  if (!kode) {
    alert('Kode akun (6 digit) wajib diisi.');
    document.getElementById('bas-kode')?.focus();
    return;
  }
  if (!uraian) {
    alert('Uraian akun wajib diisi.');
    document.getElementById('bas-uraian')?.focus();
    return;
  }

  const payload = {
    id: document.getElementById('bas-id')?.value || undefined,
    kode: kode,
    uraian: uraian,
    kelompok: document.getElementById('bas-kelompok')?.value || '521 - Belanja Barang',
    kategori_dn: document.getElementById('bas-kategori-dn')?.value || kode,
    keterangan: document.getElementById('bas-keterangan')?.value || ''
  };

  try {
    const res = await apiFetch('/api/master/akun', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    alert(payload.id ? 'Akun BAS berhasil diperbarui.' : 'Akun BAS baru berhasil ditambahkan.');
    closeModalBas();
    await loadMasters();
    renderDbBas();
  } catch (err) {
    alert('Gagal menyimpan Akun BAS: ' + err.message);
  }
}

async function deleteAkun(id) {
  const a = (AppState.masters.akuns || []).find(item => item.id === Number(id));
  const uraian = a ? `[${a.kode}] ${a.uraian}` : `ID #${id}`;
  if (!confirm(`Apakah Anda yakin ingin menghapus Akun BAS "${uraian}"?`)) return;

  try {
    await apiFetch(`/api/master/akun/${id}`, { method: 'DELETE' });
    alert('Akun BAS berhasil dihapus.');
    await loadMasters();
    renderDbBas();
  } catch (err) {
    alert('Gagal menghapus Akun BAS: ' + err.message);
  }
}

function exportBasExcel() {
  window.location.href = '/api/master/akun/export';
}

function triggerImportBas() {
  document.getElementById('input-file-bas')?.click();
}

async function handleExcelUploadBas(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = '';

  if (!confirm(`Mulai unggah berkas "${file.name}" untuk update masal Bagan Akun Standar (BAS)?\nData akan dicocokkan berdasarkan Kode Akun (6 digit).`)) {
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const base64Data = e.target.result.split(',')[1];
      const res = await apiFetch('/api/master/akun/import', {
        method: 'POST',
        body: JSON.stringify({ file_base64: base64Data, filename: file.name })
      });
      alert(`✅ ${res.message || 'Update masal BAS berhasil!'}`);
      await loadMasters();
      renderDbBas();
    } catch (err) {
      alert('❌ Gagal mengimpor data BAS: ' + err.message);
    }
  };
  reader.readAsDataURL(file);
}

// ============================================================================
// VIEW 5: PENGATURAN SATKER & PEJABAT PENANDATANGAN
// ============================================================================

function renderSettings() {
  if (!AppState.masters || !AppState.masters.settings) return;
  const s = AppState.masters.settings;

  setElVal('set-nama-satker', s.nama_satker);
  setElVal('set-kode-satker', s.kode_satker);
  setElVal('set-tahun-anggaran', s.tahun_anggaran || '2029');
  setElVal('set-nama-agenda', s.nama_agenda || 'PEMILIHAN BUPATI DAN WAKIL BUPATI NGAWI');
  setElVal('set-ketua-nama', s.ketua_kpu_nama);
  setElVal('set-ketua-jabatan', s.ketua_kpu_jabatan || 'Ketua Komisi Pemilihan Umum Kabupaten Ngawi');
  setElVal('set-kpa-nama', s.kpa_nama);
  setElVal('set-kpa-nip', s.kpa_nip);
  setElVal('set-ppkom-nama', s.ppkom_nama);
  setElVal('set-ppkom-nip', s.ppkom_nip);
  setElVal('set-bp-nama', s.bendahara_nama);
  setElVal('set-bp-nip', s.bendahara_nip);
  setElVal('set-kota-ttd', s.kota_penandatangan || 'NGAWI');

  // Google OAuth Settings
  setElVal('set-google-client-id', s.google_client_id || '');
  setElVal('set-google-auth-enabled', s.google_auth_enabled || '0');
  setElVal('set-google-allowed-domains', s.google_allowed_domains || 'kpu.go.id, gmail.com');
}

async function saveSatkerSettings() {
  const payload = {
    nama_satker: document.getElementById('set-nama-satker')?.value || '',
    kode_satker: document.getElementById('set-kode-satker')?.value || '',
    tahun_anggaran: document.getElementById('set-tahun-anggaran')?.value || '2029',
    nama_agenda: document.getElementById('set-nama-agenda')?.value || '',
    ketua_kpu_nama: document.getElementById('set-ketua-nama')?.value || '',
    ketua_kpu_jabatan: document.getElementById('set-ketua-jabatan')?.value || '',
    kpa_nama: document.getElementById('set-kpa-nama')?.value || '',
    kpa_nip: document.getElementById('set-kpa-nip')?.value || '',
    ppkom_nama: document.getElementById('set-ppkom-nama')?.value || '',
    ppkom_nip: document.getElementById('set-ppkom-nip')?.value || '',
    bendahara_nama: document.getElementById('set-bp-nama')?.value || '',
    bendahara_nip: document.getElementById('set-bp-nip')?.value || '',
    kota_penandatangan: document.getElementById('set-kota-ttd')?.value || 'NGAWI',
    google_client_id: document.getElementById('set-google-client-id')?.value || '',
    google_auth_enabled: document.getElementById('set-google-auth-enabled')?.value || '0',
    google_allowed_domains: document.getElementById('set-google-allowed-domains')?.value || 'kpu.go.id, gmail.com'
  };

  try {
    const res = await apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    alert(res.message);
    await loadMasters();
    await initGoogleAuth();
    renderAllViews();
  } catch (err) {
    alert('Gagal menyimpan pengaturan: ' + err.message);
  }
}

// ============================================================================
// VIEW 6: MANAJEMEN HAK AKSES PENGGUNA SATKER & DEVELOPER
// ============================================================================

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  const users = AppState.usersList || [];
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px;">Tidak ada data pengguna.</td></tr>`;
    return;
  }

  const currentUser = AppState.currentUser;
  const isDev = currentUser && currentUser.level === 0;
  const isPerencanaan = currentUser && currentUser.level === 1;
  const canManage = isDev || isPerencanaan;

  let html = '';
  users.forEach((u, idx) => {
    const isCurrent = currentUser && currentUser.username === u.username;
    
    // Level Badge
    let lvlBadge = '';
    if (u.level === 0) lvlBadge = `<span class="badge" style="background:#0f172a;color:#fff;font-weight:700;">Level 0 (Developer)</span>`;
    else if (u.level === 1) lvlBadge = `<span class="badge badge-primary" style="font-weight:700;">Level 1 (Super Admin)</span>`;
    else if (u.level === 2) lvlBadge = `<span class="badge badge-success" style="font-weight:700;">Level 2 (Operator Subbag)</span>`;
    else lvlBadge = `<span class="badge badge-secondary" style="font-weight:700;">Level 3 (Viewer Eksekutif)</span>`;

    // PIC Subbag
    let pic = (u.pic_subbag || 'SEMUA').toUpperCase();
    if (pic === 'PERENCANAAN') pic = 'RENDATIN';
    if (pic === 'KEUANGAN') pic = 'KUL';
    if (pic === 'PARMAS') pic = 'PARSDM';
    const subMeta = SUBBAG_META[pic];
    let picBadge = `<span class="pic-chip pic-${pic}" title="${subMeta ? subMeta.name : pic}">${pic}</span>`;
    if (pic === 'SEMUA') {
      picBadge = `<span class="badge badge-info" style="font-size:11px;">Semua Subbag</span>`;
    }

    // Status
    const statusBadge = u.is_active
      ? `<span class="badge badge-success" style="font-size:11px;">Aktif</span>`
      : `<span class="badge badge-danger" style="font-size:11px;">Nonaktif</span>`;

    // Hak Akses Actions
    let aksiHtml = '';
    if (isCurrent) {
      aksiHtml = `<button class="btn btn-xs btn-success" style="font-weight:700; pointer-events:none;">✅ Aktif</button>`;
    } else {
      aksiHtml = `<button class="btn btn-xs btn-outline-primary" onclick="switchUser('${u.username}')" title="Beralih ke peran ini">⚡ Beralih</button>`;
    }

    if (canManage) {
      // Edit button (Level 1 cannot edit Level 0)
      if (isDev || u.level > 0) {
        aksiHtml += ` <button class="btn btn-xs btn-secondary" onclick="openEditUserModal(${u.id})" title="Edit Pengguna">✏️</button>`;
      }
      // Delete button: Developer (Level 0) can delete any user except 'emenje'.
      // Level 1 can only delete Level 2 or 3.
      if (u.username !== 'emenje' && !isCurrent) {
        if (isDev || (isPerencanaan && u.level > 1)) {
          aksiHtml += ` <button class="btn btn-xs btn-outline-danger" onclick="deleteUserAction(${u.id}, '${escHtml(u.username)}')" title="Hapus Pengguna">🗑️</button>`;
        }
      }
    }

    html += `
      <tr style="${isCurrent ? 'background: #f0fdf4;' : ''}">
        <td class="text-center" style="font-weight:600; color:#64748b;">${idx + 1}</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-weight:700;font-family:var(--font-mono);color:#0f172a;">${escHtml(u.username)}</span>
            ${u.level === 0 ? `<span style="font-size:11px;" title="Akun Developer Resmi">⚡</span>` : ''}
          </div>
        </td>
        <td>
          <strong style="color:#0f172a;">${escHtml(u.nama_pejabat)}</strong>
          ${u.email ? `<div style="font-size:11px;color:#0284c7;font-family:var(--font-mono);margin-top:2px;">📧 ${escHtml(u.email)}</div>` : ''}
        </td>
        <td style="color:#475569;">${escHtml(u.jabatan || '-')}</td>
        <td>${lvlBadge}</td>
        <td>${picBadge}</td>
        <td class="text-center">
          ${canManage && u.username !== 'emenje' ? `
            <span style="cursor:pointer;" onclick="toggleUserStatusAction(${u.id})" title="Klik untuk mengubah status">${statusBadge}</span>
          ` : statusBadge}
        </td>
        <td class="text-center" style="white-space:nowrap;">
          ${aksiHtml}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // Update session info banner
  const sessionInfoEl = document.getElementById('users-active-session-info');
  if (sessionInfoEl && currentUser) {
    sessionInfoEl.innerHTML = `Sesi Aktif: <strong>${escHtml(currentUser.nama_pejabat)}</strong> (${escHtml(currentUser.username)}) &bull; [Level ${currentUser.level}]`;
  }
}

function openAddUserModal() {
  setElText('modal-user-title', 'Tambah Pengguna Baru Satker');
  setElVal('modal-user-id', '');
  setElVal('modal-user-username', '');
  setElVal('modal-user-password', '');
  setElVal('modal-user-nama', '');
  setElVal('modal-user-jabatan', '');
  setElVal('modal-user-email', '');
  setElVal('modal-user-role', 'op_teknis');
  setElVal('modal-user-level', '2');
  setElVal('modal-user-pic', 'TEKNIS');
  setElVal('modal-user-status', '1');

  document.getElementById('modal-user-username').readOnly = false;
  document.getElementById('modal-user-password').required = true;
  document.getElementById('modal-user-password-hint').style.display = 'none';

  document.getElementById('modal-user').style.display = 'flex';
}

function openEditUserModal(userId) {
  const user = AppState.usersList.find(u => u.id === userId);
  if (!user) return;

  setElText('modal-user-title', `Edit Pengguna: ${user.username}`);
  setElVal('modal-user-id', user.id);
  setElVal('modal-user-username', user.username);
  setElVal('modal-user-password', '');
  setElVal('modal-user-nama', user.nama_pejabat);
  setElVal('modal-user-jabatan', user.jabatan || '');
  setElVal('modal-user-email', user.email || '');
  setElVal('modal-user-role', user.role_id || 'op_teknis');
  setElVal('modal-user-level', String(user.level));
  let userPic = (user.pic_subbag || 'SEMUA').toUpperCase();
  if (userPic === 'PERENCANAAN') userPic = 'RENDATIN';
  if (userPic === 'KEUANGAN') userPic = 'KUL';
  if (userPic === 'PARMAS') userPic = 'PARSDM';
  setElVal('modal-user-pic', userPic);
  setElVal('modal-user-status', String(user.is_active));

  document.getElementById('modal-user-username').readOnly = (user.username === 'emenje');
  document.getElementById('modal-user-password').required = false;
  document.getElementById('modal-user-password-hint').style.display = 'block';

  document.getElementById('modal-user').style.display = 'flex';
}

function closeUserModal() {
  document.getElementById('modal-user').style.display = 'none';
}

function onUserRoleTemplateChange() {
  const role = document.getElementById('modal-user-role')?.value;
  const levelSelect = document.getElementById('modal-user-level');
  const picSelect = document.getElementById('modal-user-pic');

  if (role === 'developer') {
    if (levelSelect) levelSelect.value = '0';
    if (picSelect) picSelect.value = 'SEMUA';
  } else if (role === 'super_admin' || role === 'admin_perencanaan') {
    if (levelSelect) levelSelect.value = '1';
    if (picSelect) picSelect.value = 'SEMUA';
  } else if (role === 'op_perencanaan') {
    if (levelSelect) levelSelect.value = '2';
    if (picSelect) picSelect.value = 'RENDATIN';
  } else if (role === 'op_teknis') {
    if (levelSelect) levelSelect.value = '2';
    if (picSelect) picSelect.value = 'TEKNIS';
  } else if (role === 'op_hukum') {
    if (levelSelect) levelSelect.value = '2';
    if (picSelect) picSelect.value = 'HUKUM';
  } else if (role === 'op_parmas') {
    if (levelSelect) levelSelect.value = '2';
    if (picSelect) picSelect.value = 'PARSDM';
  } else if (role === 'op_kul') {
    if (levelSelect) levelSelect.value = '2';
    if (picSelect) picSelect.value = 'KUL';
  } else if (role === 'viewer_sekretaris' || role === 'viewer_komisioner') {
    if (levelSelect) levelSelect.value = '3';
    if (picSelect) picSelect.value = 'SEMUA';
  }
}

async function submitUserForm() {
  const id = document.getElementById('modal-user-id')?.value;
  const payload = {
    id: id ? Number(id) : undefined,
    username: document.getElementById('modal-user-username')?.value,
    password: document.getElementById('modal-user-password')?.value || undefined,
    nama_pejabat: document.getElementById('modal-user-nama')?.value,
    jabatan: document.getElementById('modal-user-jabatan')?.value,
    email: document.getElementById('modal-user-email')?.value?.trim()?.toLowerCase() || '',
    role_id: document.getElementById('modal-user-role')?.value,
    level: Number(document.getElementById('modal-user-level')?.value),
    pic_subbag: document.getElementById('modal-user-pic')?.value,
    is_active: Number(document.getElementById('modal-user-status')?.value)
  };

  try {
    const res = await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    alert(res.message || 'Pengguna berhasil disimpan.');
    closeUserModal();
    await loadUsers();
  } catch (err) {
    alert('Gagal menyimpan pengguna: ' + err.message);
  }
}

async function deleteUserAction(userId, username) {
  if (!confirm(`Apakah Anda yakin ingin MENGHAPUS pengguna "${username}" secara permanen dari sistem?`)) {
    return;
  }

  try {
    const res = await apiFetch(`/api/users/${userId}`, {
      method: 'DELETE'
    });
    alert(res.message || `Pengguna "${username}" berhasil dihapus.`);
    await loadUsers();
  } catch (err) {
    alert('Gagal menghapus pengguna: ' + err.message);
  }
}

async function toggleUserStatusAction(userId) {
  try {
    const res = await apiFetch(`/api/users/${userId}/toggle`, {
      method: 'POST'
    });
    await loadUsers();
  } catch (err) {
    alert('Gagal mengubah status: ' + err.message);
  }
}

// Global Window Exports for Inline HTML Handlers
window.toggleSidebarCollapse = toggleSidebarCollapse;
window.filterSidebarMenu = filterSidebarMenu;
window.loadMonitoringReport = loadMonitoringReport;
window.resetMonitoringFilter = resetMonitoringFilter;
window.changeMonitoringPage = changeMonitoringPage;
window.openModalPaslon = openModalPaslon;
window.closeModalPaslon = closeModalPaslon;
window.submitModalPaslon = submitModalPaslon;
window.deletePaslon = deletePaslon;
window.filterDbPaslon = filterDbPaslon;
window.openModalDesa = openModalDesa;
window.closeModalDesa = closeModalDesa;
window.submitModalDesa = submitModalDesa;
window.deleteDesa = deleteDesa;
window.filterDbPps = filterDbPps;
window.openModalKecamatan = openModalKecamatan;
window.closeModalKecamatan = closeModalKecamatan;
window.submitModalKecamatan = submitModalKecamatan;
window.deleteKecamatan = deleteKecamatan;
window.filterDbPpk = filterDbPpk;
window.filterDbKuantitas = filterDbKuantitas;
window.filterDbSbm = filterDbSbm;
window.openModalSbm = openModalSbm;
window.closeModalSbm = closeModalSbm;
window.submitModalSbm = submitModalSbm;
window.deleteSbm = deleteSbm;
window.exportSbmExcel = exportSbmExcel;
window.triggerImportSbm = triggerImportSbm;
window.handleExcelUploadSbm = handleExcelUploadSbm;
window.filterDbBas = filterDbBas;
window.openModalBas = openModalBas;
window.closeModalBas = closeModalBas;
window.submitModalBas = submitModalBas;
window.deleteAkun = deleteAkun;
window.exportBasExcel = exportBasExcel;
window.triggerImportBas = triggerImportBas;
window.handleExcelUploadBas = handleExcelUploadBas;
window.downloadAllSubbagZip = downloadAllSubbagZip;

