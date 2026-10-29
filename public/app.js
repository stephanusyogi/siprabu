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
  rkbWorkflowData: null,
  matriksData: null,
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
    cost_sharing: 'ALL',
    search: ''
  },
  searchDebounceTimer: null,
  stagedRkbOps: [],
  stagedDiff: null,
  initialReferenceVersion: null,
  latestReferenceVersion: null,
  referenceChangeAcknowledged: false,
  rkbVersion: null,
  menuMatrix: []
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
// SISTEM ROUTING DINAMIS TERENKRIPSI ALA SAKTI KEMENKEU (43-CHAR TOKENS)
// ============================================================================
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
  'view-rekap-pelaksanaan': 22,
  'view-audit': 23,
  'view-panduan-pelaksanaan': 24,
  'view-menu-matrix': 25
};

const SAKTI_CODE_TO_VIEW = {
  1: 'view-dashboard',
  2: 'view-rkb',
  3: 'view-siklus',
  4: 'view-revisi-pengajuan',
  5: 'view-revisi-validasi',
  6: 'view-revisi-tahap4',
  7: 'view-revisi-monitoring',
  8: 'view-siklus',
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
  22: 'view-rekap-pelaksanaan',
  23: 'view-audit',
  24: 'view-panduan-pelaksanaan',
  25: 'view-menu-matrix'
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
  'view-db-regulasi': 'Regulasi & Dasar Hukum KPU',
  'view-db-settings': 'Pengaturan Sistem & Parameter',
  'view-settings': 'Pengaturan Sistem & Parameter',
  'view-panduan': 'Panduan Perencanaan Anggaran',
  'view-panduan-pelaksanaan': 'Panduan Pelaksanaan & Pembayaran Anggaran',
  'view-monitoring': 'Executive Real-Time Monitoring',
  'view-users': 'Manajemen Pengguna & Otoritas',
  'view-penandatangan': 'Pejabat Penandatangan Satker',
  'view-developer': 'Ruang Pengembang & Blueprint PRD',
  'view-rekap-perencanaan': 'Rekap Perencanaan Anggaran',
  'view-rekap-pelaksanaan': 'Rekap Pelaksanaan Anggaran (Baseline Sah)',
  'view-audit': 'Log Aktivitas & Rekam Jejak Audit Sistem',
  'view-menu-matrix': 'Manajemen Hak Akses Menu (RBAC)'
};

function bufferToBase64Url(uint8Array) {
  let binary = '';
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64 = (typeof btoa === 'function') ? btoa(binary) : '';
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBuffer(base64UrlStr) {
  let base64 = base64UrlStr.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(0);
}

function generateSaktiLoginToken() {
  const bytes = new Uint8Array(15);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 15; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return 'LL-' + bufferToBase64Url(bytes);
}

function generateSaktiRouteToken(viewId, isSanding = false) {
  const code = SAKTI_VIEW_CODES[viewId] || 1;
  const bytes = new Uint8Array(32);
  bytes[0] = 0x53; // 'S' Magic Byte
  bytes[1] = code;
  bytes[2] = isSanding ? 1 : 0;
  const nowSec = Math.floor(Date.now() / 1000);
  bytes[3] = (nowSec >> 24) & 0xff;
  bytes[4] = (nowSec >> 16) & 0xff;
  bytes[5] = (nowSec >> 8) & 0xff;
  bytes[6] = nowSec & 0xff;

  const rand = new Uint8Array(23);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(rand);
  } else {
    for (let i = 0; i < 23; i++) rand[i] = Math.floor(Math.random() * 256);
  }
  bytes.set(rand, 7);

  let sum1 = 0, sum2 = 0;
  for (let i = 0; i < 30; i++) {
    sum1 = (sum1 + bytes[i]) % 255;
    sum2 = (sum2 + sum1) % 255;
  }
  bytes[30] = sum1;
  bytes[31] = sum2;

  return bufferToBase64Url(bytes);
}

function parseSaktiRouteToken(tokenPath) {
  if (!tokenPath) return null;
  const clean = tokenPath.replace(/^\/+/, '').split('?')[0].split('#')[0];
  if (!clean) return null;
  if (clean.startsWith('LL-')) {
    return { isLogin: true };
  }
  if (clean.length !== 43) return null;
  try {
    const bytes = base64UrlToBuffer(clean);
    if (!bytes || bytes.length !== 32) return null;
    if (bytes[0] !== 0x53) return null;
    let sum1 = 0, sum2 = 0;
    for (let i = 0; i < 30; i++) {
      sum1 = (sum1 + bytes[i]) % 255;
      sum2 = (sum2 + sum1) % 255;
    }
    if (bytes[30] !== sum1 || bytes[31] !== sum2) return null;
    const viewCode = bytes[1];
    const isSanding = (bytes[2] & 1) === 1;
    const viewId = SAKTI_CODE_TO_VIEW[viewCode];
    if (!viewId) return null;
    return { viewId, isSanding, isLogin: false };
  } catch (e) {
    return null;
  }
}

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
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
const escapeHtml = escHtml;
window.escapeHtml = escHtml;
window.escHtml = escHtml;

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

/**
 * Sistem Notifikasi Toast Global SI-PRABU
 * @param {string} message - Pesan notifikasi
 * @param {'success'|'error'|'warning'|'info'|'danger'} type - Tipe status
 * @param {number} duration - Durasi tayang dalam milidetik (default: 3500)
 */
function showToast(message, type = 'info', duration = 3500) {
  if (!message) return;
  try {
    let container = document.getElementById('siprabu-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'siprabu-toast-container';
      container.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 420px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `siprabu-toast siprabu-toast-${type}`;

    let bg = '#1e293b';
    let border = '#334155';
    let icon = 'ℹ️';
    let textColor = '#ffffff';

    if (type === 'success') {
      bg = '#065f46';
      border = '#059669';
      icon = '✅';
    } else if (type === 'error' || type === 'danger') {
      bg = '#991b1b';
      border = '#dc2626';
      icon = '❌';
    } else if (type === 'warning') {
      bg = '#92400e';
      border = '#d97706';
      icon = '⚠️';
    } else if (type === 'info') {
      bg = '#1e3a8a';
      border = '#2563eb';
      icon = 'ℹ️';
    }

    toast.style.cssText = `
      background: ${bg};
      color: ${textColor};
      border: 1px solid ${border};
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13.5px;
      font-weight: 500;
      line-height: 1.4;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      gap: 10px;
      pointer-events: auto;
      cursor: pointer;
      opacity: 0;
      transform: translateY(-10px) scale(0.98);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    toast.innerHTML = `
      <span style="font-size: 16px; flex-shrink: 0;">${icon}</span>
      <span style="flex: 1;">${escapeHtml(message)}</span>
      <span style="font-size: 16px; opacity: 0.6; margin-left: 8px; cursor: pointer;" title="Tutup">&times;</span>
    `;

    const dismiss = () => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px) scale(0.98)';
      setTimeout(() => { if (toast.parentElement) toast.remove(); }, 250);
    };

    toast.onclick = dismiss;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0) scale(1)';
    });

    setTimeout(dismiss, duration);
  } catch (e) {
    console.log('[Toast ' + type + ']:', message);
    if (type === 'error' || type === 'danger') {
      try { alert(message); } catch (_) {}
    }
  }
}
window.showToast = showToast;

function getAuthToken() {
  return localStorage.getItem('siprabu_token') || '';
}
window.getAuthToken = getAuthToken;

async function apiFetch(endpoint, options = {}) {
  const token = getAuthToken();
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
    console.warn('Unauthorized request:', endpoint);
    if (endpoint !== '/api/login' && endpoint !== '/api/me' && AppState.currentUser) {
      localStorage.removeItem('siprabu_token');
      AppState.currentUser = null;
      showLoginScreen();
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data;
}

async function downloadProtectedFile(url, fallbackFilename = 'download.xlsx') {
  const token = localStorage.getItem('siprabu_token');
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  if (res.status === 401) {
    if (AppState.currentUser) {
      localStorage.removeItem('siprabu_token');
      AppState.currentUser = null;
      showLoginScreen();
    }
    throw new Error('Sesi tidak sah atau telah berakhir. Silakan login kembali.');
  }

  if (!res.ok) {
    let errMsg = `Gagal mengunduh berkas (HTTP ${res.status})`;
    try {
      const errData = await res.json();
      if (errData && errData.error) errMsg = errData.error;
    } catch (_) {}
    throw new Error(errMsg);
  }

  let filename = fallbackFilename;
  const disposition = res.headers.get('Content-Disposition');
  if (disposition) {
    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1].replace(/['"]/g, '').trim();
    }
  }

  const blob = await res.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
}

window.downloadProtectedFile = downloadProtectedFile;

// ============================================================================
// INISIALISASI APLIKASI
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    startServerClockTicker();
    await initGoogleAuth();
    await initAuth();
    if (AppState.currentUser) {
      await loadMasters();
      await loadPeriodes();
      await loadRkbData();
      renderAllViews();

      // Kembalikan rute dari token URL jika ada
      const parsedRoute = parseSaktiRouteToken(window.location.pathname);
      let targetViewId = 'view-dashboard';
      if (parsedRoute && parsedRoute.viewId) {
        targetViewId = parsedRoute.viewId;
        if (parsedRoute.isSanding) {
          AppState.revisionViewMode = 'SANDING';
          const cb = document.getElementById('chk-revision-sanding');
          if (cb) cb.checked = true;
        }
      }
      switchView(targetViewId, false);

      // Pastikan URL termutakhirkan dengan token SAKTI yang valid
      const token = generateSaktiRouteToken(AppState.activeView, AppState.revisionViewMode === 'SANDING');
      window.history.replaceState({ viewId: AppState.activeView, revisionViewMode: AppState.revisionViewMode }, '', '/' + token);
      document.title = (SAKTI_VIEW_TITLES[AppState.activeView] || 'SI-PRABU') + ' | SAKTI Kemenkeu - KPU Ngawi';
    }
  } catch (err) {
    console.error('Initialization error:', err);
  }
});

async function initAuth() {
  const savedToken = localStorage.getItem('siprabu_token');
  let loggedInUser = null;

  if (savedToken) {
    try {
      const meRes = await apiFetch('/api/me');
      loggedInUser = meRes.user;
    } catch (e) {
      console.warn('Sesi tidak valid / kadaluarsa:', e.message);
      localStorage.removeItem('siprabu_token');
      sessionStorage.removeItem('siprabu_is_developer_origin');
    }
  }

  if (loggedInUser) {
    AppState.currentUser = loggedInUser;
    if (loggedInUser.is_developer || loggedInUser.level === 0 || loggedInUser.username === 'emenje') {
      sessionStorage.setItem('siprabu_is_developer_origin', 'true');
    } else {
      sessionStorage.removeItem('siprabu_is_developer_origin');
    }
    await loadUsers();
    await loadMenuMatrix();
    showMainApp();
    updateUserNavbar();
  } else {
    AppState.currentUser = null;
    sessionStorage.removeItem('siprabu_is_developer_origin');
    // Jika user mencoba membuka link modul tanpa login, simpan untuk redirect setelah login
    const parsed = parseSaktiRouteToken(window.location.pathname);
    if (parsed && parsed.viewId) {
      sessionStorage.setItem('siprabu_redirect_view', parsed.viewId);
    }
    showLoginScreen(true);
  }
}

function isDeveloperSession() {
  const user = AppState.currentUser;
  if (!user) return false;
  return Boolean(
    user.level === 0 || 
    user.role_id === 'developer' || 
    user.username === 'emenje' || 
    user.is_developer === true ||
    sessionStorage.getItem('siprabu_is_developer_origin') === 'true'
  );
}

/**
 * Verifikasi ketat bahwa akun yang sedang aktif adalah Developer (Level 0 / emenje).
 * Saat sedang mensimulasikan peran lain (Level 1/2/3), bernilai false agar menu Blueprint & PRD tersembunyi.
 */
function isActiveDeveloperUser(user = AppState.currentUser) {
  if (!user) return false;
  return Boolean(
    Number(user.level) === 0 && (
      user.role_id === 'developer' ||
      user.username === 'emenje'
    )
  );
}

function showLoginScreen(updateHistory = true) {
  const splash = document.getElementById('app-loading-splash');
  const loginScreen = document.getElementById('login-screen');
  const appLayout = document.getElementById('app');
  if (splash) splash.style.setProperty('display', 'none', 'important');
  if (loginScreen) loginScreen.style.setProperty('display', 'flex', 'important');
  if (appLayout) appLayout.style.display = 'none';

  const uInput = document.getElementById('screen-login-username');
  const pInput = document.getElementById('screen-login-password');
  const errBox = document.getElementById('login-screen-error');
  if (uInput) {
    uInput.value = '';
    setTimeout(() => uInput.focus(), 150);
  }
  if (pInput) pInput.value = '';
  if (errBox) errBox.style.display = 'none';

  renderGoogleButton();

  if (updateHistory !== false) {
    const curPath = window.location.pathname.replace(/^\/+/, '');
    if (!curPath.startsWith('LL-')) {
      const loginToken = generateSaktiLoginToken();
      window.history.replaceState({ isLogin: true }, '', '/' + loginToken);
    }
    document.title = 'Masuk Sistem | SAKTI Kemenkeu - KPU Ngawi';
  }
}

function showMainApp() {
  const splash = document.getElementById('app-loading-splash');
  const loginScreen = document.getElementById('login-screen');
  const appLayout = document.getElementById('app');
  if (splash) splash.style.setProperty('display', 'none', 'important');
  if (loginScreen) loginScreen.style.setProperty('display', 'none', 'important');
  if (appLayout) appLayout.style.display = 'flex';

  renderActiveRoleSwitcher(user);
  applyRolePermissionsToUI();
}

function toggleScreenPasswordVisibility() {
  const input = document.getElementById('screen-login-password');
  const icon = document.getElementById('screen-pwd-icon');
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.textContent = '🙈';
  } else {
    input.type = 'password';
    if (icon) icon.textContent = '👁️';
  }
}

function clearLoginScreenError() {
  const errorBox = document.getElementById('login-screen-error');
  if (errorBox) errorBox.style.display = 'none';
}


async function submitScreenLoginForm() {
  const errorBox = document.getElementById('login-screen-error');
  const errorText = document.getElementById('login-screen-error-text');
  if (errorBox && errorText) {
    errorText.textContent = 'Login menggunakan nama pengguna dan kata sandi sementara dinonaktifkan. Silakan gunakan Single Sign-On (SSO) Google di atas.';
    errorBox.style.display = 'block';
  }
  return;
}


async function quickDeveloperLogin() {
  const errorBox = document.getElementById('login-screen-error');
  const errorText = document.getElementById('login-screen-error-text');
  if (errorBox) errorBox.style.display = 'none';

  try {
    const res = await performLogin('emenje', '');
    await loadUsers();
    await loadMenuMatrix();
    showMainApp();
    updateUserNavbar();
    showToast('Mode Pengembang Aktif: Bebas Akses Semua Level Akun untuk QC!', 'success');
    await loadMasters();
    await loadPeriodes();
    await loadRkbData();
    renderAllViews();
    const redirectView = sessionStorage.getItem('siprabu_redirect_view');
    sessionStorage.removeItem('siprabu_redirect_view');
    switchView(redirectView || 'view-dashboard', true);
  } catch (err) {
    if (errorBox && errorText) {
      errorText.textContent = err.message || 'Gagal masuk akun pengembang.';
      errorBox.style.display = 'block';
    }
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

async function performLogin(username, password = '') {
  const res = await apiFetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  localStorage.setItem('siprabu_token', res.token);
  AppState.currentUser = res.user;
  if (res.is_developer || res.user?.is_developer || username === 'emenje' || res.user?.level === 0) {
    sessionStorage.setItem('siprabu_is_developer_origin', 'true');
  } else {
    sessionStorage.removeItem('siprabu_is_developer_origin');
  }
  await loadMenuMatrix();
  updateUserNavbar();
  return res;
}

function canViewDatabaseMaster(user) {
  if (!user) return false;
  const userLevels = new Set();
  userLevels.add(Number(user.level));
  if (Array.isArray(user.roles)) {
    user.roles.forEach(r => userLevels.add(Number(r.level)));
  }
  return userLevels.has(0) || userLevels.has(1) || userLevels.has(3) || userLevels.has(4);
}

/**
 * Memuat matriks hak akses menu dinamis berbasis level dari database
 */
async function loadMenuMatrix() {
  try {
    const res = await apiFetch('/api/menu-matrix');
    if (res && res.matrix) {
      AppState.menuMatrix = res.matrix;
      applyDynamicMenuMatrix();
    }
  } catch (e) {
    console.warn('[MENU-MATRIX] Gagal memuat matriks hak akses:', e);
  }
}

/**
 * Menerapkan visibilitas menu sidebar & folder berdasarkan matriks hak akses Level (0-4)
 */
function applyDynamicMenuMatrix(user = AppState.currentUser) {
  if (!user) return;
  const matrix = AppState.menuMatrix;
  if (!matrix || !Array.isArray(matrix) || matrix.length === 0) {
    loadMenuMatrix();
    return;
  }

  const isDevOrigin = sessionStorage.getItem('siprabu_is_developer_origin') === 'true' || user.username === 'emenje';
  const isDevUnrestricted = isDevOrigin && (Number(user.level) === 0 && (!user.active_role || Number(user.active_role.level) === 0));

  // Kumpulkan level kewenangan berdasarkan mode peran (SAKTI vs KUMULATIF)
  const userLevels = new Set();
  const isKumulatif = (user.role_mode === 'KUMULATIF');
  if (isKumulatif) {
    userLevels.add(Number(user.level));
    if (Array.isArray(user.roles)) {
      user.roles.forEach(r => userLevels.add(Number(r.level)));
    }
  } else {
    // Mode SAKTI: Tampilkan menu sesuai peran aktif saja
    const activeLevel = user.active_role ? Number(user.active_role.level) : Number(user.level);
    userLevels.add(activeLevel);
  }
  const isDev = isDevUnrestricted || userLevels.has(0) || user.role_id === 'developer' || user.username === 'emenje';

  // 1. Terapkan visibilitas pada setiap tombol menu berdasarkan data-view (Strict SAKTI Canon)
  matrix.forEach(item => {
    const btn = document.querySelector(`button[data-view="${item.menu_key}"]`);
    if (!btn) return;

    let isAllowed = false;
    if (isDevUnrestricted) {
      isAllowed = true;
    } else {
      // Strict SAKTI Mode: Murni mengevaluasi peran aktif yang sedang dipilih (activeLevel)
      isAllowed = Boolean(item[`allow_l${activeLevel}`]);
    }

    btn.style.display = isAllowed ? 'flex' : 'none';
  });

  // 2. Evaluasi Folder (Auto-Hide jika semua submenu di dalamnya 'none')
  const folders = document.querySelectorAll('.sakti-tree-group');
  folders.forEach(folder => {
    if (folder.id === 'folder-developer') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      folder.style.display = (isDevOrigin && isLocalhost) ? 'block' : 'none';
      return;
    }
    const children = folder.querySelectorAll('.sakti-tree-children button.nav-item');
    let hasVisible = false;
    children.forEach(c => {
      if (c.style.display !== 'none') hasVisible = true;
    });
    folder.style.display = hasVisible ? 'block' : 'none';
  });

  // Jika view aktif saat ini tidak diizinkan untuk activeLevel, alihkan otomatis ke view-dashboard
  const currentMatrixItem = matrix.find(m => m.menu_key === AppState.activeView);
  if (currentMatrixItem && !isDevUnrestricted && !currentMatrixItem[`allow_l${activeLevel}`]) {
    switchView('view-dashboard', true);
  }
}


// ==============================================================================
// SAKTI KEMENKEU MULTI-ROLE CANON IMPLEMENTATION (GAMBAR 1, 2, 3)
// ==============================================================================
let SaktiRoleState = {
  pendingRoleId: null,
  isFromPostLogin: false,
  loginSearchFilter: '',
  modalSearchFilter: ''
};

function getSaktiRoleNomenclature(role, user) {
  if (!role) {
    return {
      kodeSatker: '657811',
      peran: 'OPERATOR',
      tipe: 'SATKER',
      roleCode: 'ROLE_OPERATOR',
      deskripsiSatker: 'KPU KABUPATEN NGAWI',
      kodeUakpb: '076010500657811000KD',
      userId: 'opr_657811_198401012009121001',
      labelPeran: 'OPERATOR'
    };
  }
  const lvl = Number(role.level);
  const pic = String(role.pic || user?.pic_subbag || 'SEMUA').toUpperCase();
  let peranLabel = 'OPERATOR';
  let roleCode = 'ROLE_OPERATOR';
  let prefix = 'opr';

  if (lvl === 0) {
    peranLabel = 'ADMINISTRATOR';
    roleCode = 'ROLE_ADMINISTRATOR';
    prefix = 'adm';
  } else if (lvl === 1) {
    peranLabel = 'VALIDATOR';
    roleCode = 'ROLE_VALIDATOR';
    prefix = 'val';
  } else if (lvl === 2) {
    peranLabel = pic !== 'SEMUA' ? `OPERATOR (${pic})` : 'OPERATOR';
    roleCode = pic !== 'SEMUA' ? `ROLE_OPERATOR_${pic}` : 'ROLE_OPERATOR';
    prefix = 'opr';
  } else if (lvl === 3) {
    peranLabel = 'APPROVER';
    roleCode = 'ROLE_APPROVER';
    prefix = 'app';
  } else if (lvl === 4) {
    peranLabel = 'REKAP TAKTIS';
    roleCode = 'ROLE_REKAP_TAKTIS';
    prefix = 'aud';
  } else {
    peranLabel = role.label_peran ? role.label_peran.toUpperCase() : `LEVEL ${lvl}`;
    roleCode = `ROLE_LEVEL_${lvl}`;
    prefix = 'usr';
  }

  const rawNip = user?.nip || user?.username || '198401012009121001';
  const cleanDigits = String(rawNip).replace(/\D/g, '');
  const userNipId = cleanDigits.length >= 8 ? cleanDigits : (user?.username || '198401012009121001');
  const userIdFormatted = `${prefix}_657811_${userNipId}`;

  return {
    kodeSatker: '657811',
    peran: peranLabel,
    tipe: 'SATKER',
    roleCode: roleCode,
    deskripsiSatker: 'KPU KABUPATEN NGAWI',
    kodeUakpb: '076010500657811000KD',
    userId: userIdFormatted,
    labelPeran: role.label_peran || peranLabel
  };
}

function getSaktiRoleHeaderSub(role, user) {
  const lvl = role ? Number(role.level) : Number(user?.level ?? 1);
  if (lvl === 0) return 'ADMINISTRATOR SATKER 657811';
  if (lvl === 1) return 'VALIDATOR SATKER 657811';
  if (lvl === 2) {
    const pic = role ? String(role.pic).toUpperCase() : String(user?.pic_subbag || 'TEKNIS').toUpperCase();
    return `OPERATOR ${pic} SATKER 657811`;
  }
  if (lvl === 3) return 'APPROVER SATKER 657811';
  if (lvl === 4) return 'REKAP TAKTIS SATKER 657811';
  return 'SATKER 657811';
}

function handleUserProfileClick(event) {
  if (event) event.stopPropagation();
  if (!AppState.currentUser) {
    openLoginModal();
    return;
  }
  const dropdown = document.getElementById('sakti-profile-dropdown');
  if (dropdown) {
    const isOpen = dropdown.style.display === 'block';
    dropdown.style.display = isOpen ? 'none' : 'block';
  }
}

// Tutup dropdown saat klik di luar
window.addEventListener('click', function(e) {
  const dropdown = document.getElementById('sakti-profile-dropdown');
  if (dropdown && dropdown.style.display === 'block') {
    if (!e.target.closest('#user-profile-pill')) {
      dropdown.style.display = 'none';
    }
  }
});

function openProfileInfoModal(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('sakti-profile-dropdown');
  if (dropdown) dropdown.style.display = 'none';

  const user = AppState.currentUser;
  if (!user) return;
  const activeRole = user.active_role || (user.roles ? user.roles[0] : null);
  const nom = getSaktiRoleNomenclature(activeRole, user);

  alert(`[PROFILE SAKTI SI-PRABU]\n\nNama: ${user.nama_pejabat || user.username}\nUsername: ${user.username}\nNIP: ${user.nip || '-'}\nPeran Aktif: ${nom.peran}\nKode Satker: 657811 (KPU KABUPATEN NGAWI)\nKode UAKPB: 076010500657811000KD\nMode Akses: ${user.mode_akses || 'VIEWER'}`);
}

function openSaktiGantiPeranModal(event) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById('sakti-profile-dropdown');
  if (dropdown) dropdown.style.display = 'none';

  const modal = document.getElementById('modal-sakti-ganti-peran');
  if (!modal) return;

  const searchInput = document.getElementById('sakti-modal-search-input');
  if (searchInput) searchInput.value = '';
  SaktiRoleState.modalSearchFilter = '';

  renderSaktiModalRolesList();
  modal.style.display = 'flex';
}

function closeSaktiGantiPeranModal() {
  const modal = document.getElementById('modal-sakti-ganti-peran');
  if (modal) modal.style.display = 'none';
  closeSaktiConfirmPopup();
}

function renderSaktiModalRolesList() {
  const container = document.getElementById('sakti-modal-roles-list');
  if (!container) return;

  const user = AppState.currentUser;
  if (!user) return;

  let roles = Array.isArray(user.roles) ? [...user.roles] : [];
  if (isDeveloperSession()) {
    const simRoles = [
      { id: 10, level: 0, pic: 'SEMUA', mode_akses: 'EDITOR', label_peran: 'Lead Developer & System Architect' },
      { id: 1001, level: 1, pic: 'SEMUA', mode_akses: 'EDITOR', label_peran: 'Kasubbag Perencanaan (Validator)' },
      { id: 1002, level: 2, pic: 'TEKNIS', mode_akses: 'EDITOR', label_peran: 'Staf Subbag Teknis (Operator)' },
      { id: 1003, level: 3, pic: 'SEMUA', mode_akses: 'VIEWER', label_peran: 'Sekretaris KPU (Approver)' },
      { id: 1004, level: 4, pic: 'SEMUA', mode_akses: 'VIEWER', label_peran: 'Akses Eksklusif Rekap Taktis' }
    ];
    simRoles.forEach(sr => {
      if (!roles.some(r => Number(r.id) === Number(sr.id))) {
        roles.push(sr);
      }
    });
  }

  const activeRoleId = user.active_role ? Number(user.active_role.id) : (roles[0] ? Number(roles[0].id) : null);
  const activeLevel = user.active_role ? Number(user.active_role.level) : Number(user.level);
  const query = (SaktiRoleState.modalSearchFilter || '').toLowerCase().trim();

  const filtered = roles.filter(r => {
    if (!query) return true;
    const nom = getSaktiRoleNomenclature(r, user);
    return nom.kodeSatker.includes(query) ||
           nom.peran.toLowerCase().includes(query) ||
           nom.tipe.toLowerCase().includes(query) ||
           (r.label_peran && r.label_peran.toLowerCase().includes(query));
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;">Tidak ada peran yang cocok dengan pencarian.</div>';
    return;
  }

  container.innerHTML = filtered.map(r => {
    const isActive = Number(r.id) === activeRoleId || Number(r.level) === activeLevel;
    const nom = getSaktiRoleNomenclature(r, user);
    return `
      <div class="sakti-role-card-item ${isActive ? 'active-role' : ''}" onclick="promptSaktiRoleConfirmation(${r.id}, false)">
        <div class="sakti-role-col sakti-role-col-satker">${nom.kodeSatker}</div>
        <div class="sakti-role-col sakti-role-col-peran">${nom.peran}</div>
        <div class="sakti-role-col sakti-role-col-tipe">${nom.tipe}</div>
      </div>
    `;
  }).join('');
}

function filterSaktiModalRoles() {
  const input = document.getElementById('sakti-modal-search-input');
  SaktiRoleState.modalSearchFilter = input ? input.value : '';
  renderSaktiModalRolesList();
}

function promptSaktiRoleConfirmation(roleId, isFromPostLogin = false) {
  const user = AppState.currentUser;
  if (!user) return;

  let roles = Array.isArray(user.roles) ? [...user.roles] : [];
  if (isDeveloperSession()) {
    const simRoles = [
      { id: 10, level: 0, pic: 'SEMUA', mode_akses: 'EDITOR', label_peran: 'Lead Developer & System Architect' },
      { id: 1001, level: 1, pic: 'SEMUA', mode_akses: 'EDITOR', label_peran: 'Kasubbag Perencanaan (Validator)' },
      { id: 1002, level: 2, pic: 'TEKNIS', mode_akses: 'EDITOR', label_peran: 'Staf Subbag Teknis (Operator)' },
      { id: 1003, level: 3, pic: 'SEMUA', mode_akses: 'VIEWER', label_peran: 'Sekretaris KPU (Approver)' },
      { id: 1004, level: 4, pic: 'SEMUA', mode_akses: 'VIEWER', label_peran: 'Akses Eksklusif Rekap Taktis' }
    ];
    simRoles.forEach(sr => {
      if (!roles.some(r => Number(r.id) === Number(sr.id))) {
        roles.push(sr);
      }
    });
  }

  const targetRole = roles.find(r => Number(r.id) === Number(roleId));
  if (!targetRole) return;

  // Jika role yang diklik sudah aktif dan bukan dari post-login, beri info
  if (!isFromPostLogin && user.active_role && Number(user.active_role.id) === Number(roleId)) {
    showToast('Peran ini sudah aktif pada sesi Anda saat ini.', 'info');
    return;
  }

  SaktiRoleState.pendingRoleId = roleId;
  SaktiRoleState.isFromPostLogin = isFromPostLogin;

  const nom = getSaktiRoleNomenclature(targetRole, user);

  const detailsContainer = document.getElementById('sakti-confirm-details-content');
  if (detailsContainer) {
    detailsContainer.innerHTML = `
      <div>Peran : <strong>${nom.roleCode}</strong></div>
      <div>Tipe : <strong>${nom.tipe}</strong></div>
      <div>Kode Satker : <strong>${nom.kodeSatker}</strong></div>
      <div>Deskripsi Satker : <strong>${nom.deskripsiSatker}</strong></div>
      <div>Kode UAKPB : <strong>${nom.kodeUakpb}</strong></div>
      <div>User ID : <strong>${nom.userId} ?</strong></div>
    `;
  }

  const confirmModal = document.getElementById('modal-sakti-konfirmasi');
  if (confirmModal) confirmModal.style.display = 'flex';
}

function closeSaktiConfirmPopup() {
  const confirmModal = document.getElementById('modal-sakti-konfirmasi');
  if (confirmModal) confirmModal.style.display = 'none';
  SaktiRoleState.pendingRoleId = null;
}

async function executeSaktiRoleSwitch() {
  const roleId = SaktiRoleState.pendingRoleId;
  if (!roleId) return;

  const confirmBtn = document.getElementById('btn-sakti-confirm-yes');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = '⏳ Memproses...';
  }

  try {
    const res = await apiFetch('/api/switch-active-role', {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId })
    });

    if (res && res.success && res.token) {
      localStorage.setItem('siprabu_token', res.token);
      AppState.currentUser = res.user;

      closeSaktiConfirmPopup();
      closeSaktiGantiPeranModal();

      // Sembunyikan post-login screen jika aktif
      const postLoginScreen = document.getElementById('sakti-post-login-screen');
      if (postLoginScreen) postLoginScreen.style.display = 'none';

      updateUserNavbar();
      applyDynamicMenuMatrix(res.user);
      applyRolePermissionsToUI();

      const nom = getSaktiRoleNomenclature(res.user.active_role, res.user);
      showToast(`✅ Berhasil masuk sebagai ${nom.peran} (SATKER 657811)`, 'success');

      // Refresh tampilan sesuai peran baru
      if (SaktiRoleState.isFromPostLogin) {
        showMainApp();
        await loadMasters();
        await loadPeriodes();
        await loadRkbData();
        renderAllViews();
        switchView('view-dashboard', true);
      } else {
        if (Number(res.user.level) === 4) {
          switchView('view-rekap-taktis', true);
        } else {
          switchView('view-dashboard', true);
        }
      }
    } else {
      throw new Error(res.error || 'Gagal beralih peran');
    }
  } catch (err) {
    showToast(`Gagal beralih peran: ${err.message}`, 'error');
  } finally {
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = '✓ Ya';
    }
  }
}

// Layar Pemilihan Peran Pasca-Login (Gambar 1)
function showSaktiPostLoginRoleSelector(user) {
  const overlay = document.getElementById('sakti-post-login-screen');
  if (!overlay) return;

  const nameEl = document.getElementById('sakti-login-user-name');
  if (nameEl) nameEl.textContent = (user.nama_pejabat || user.username || 'PENGGUNA').toUpperCase();

  const searchInput = document.getElementById('sakti-login-search-input');
  if (searchInput) searchInput.value = '';
  SaktiRoleState.loginSearchFilter = '';

  renderSaktiLoginRolesList();
  overlay.style.display = 'flex';
}

function renderSaktiLoginRolesList() {
  const container = document.getElementById('sakti-login-roles-list');
  if (!container) return;

  const user = AppState.currentUser;
  if (!user) return;

  const roles = Array.isArray(user.roles) ? user.roles : [];
  const query = (SaktiRoleState.loginSearchFilter || '').toLowerCase().trim();

  const filtered = roles.filter(r => {
    if (!query) return true;
    const nom = getSaktiRoleNomenclature(r, user);
    return nom.kodeSatker.includes(query) ||
           nom.peran.toLowerCase().includes(query) ||
           nom.tipe.toLowerCase().includes(query) ||
           (r.label_peran && r.label_peran.toLowerCase().includes(query));
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 24px; color: #64748b; font-size: 13px;">Tidak ada peran yang cocok dengan pencarian.</div>';
    return;
  }

  container.innerHTML = filtered.map(r => {
    const nom = getSaktiRoleNomenclature(r, user);
    return `
      <div class="sakti-role-card-item" onclick="promptSaktiRoleConfirmation(${r.id}, true)">
        <div class="sakti-role-col sakti-role-col-satker">${nom.kodeSatker}</div>
        <div class="sakti-role-col sakti-role-col-peran">${nom.peran}</div>
        <div class="sakti-role-col sakti-role-col-tipe">${nom.tipe}</div>
      </div>
    `;
  }).join('');
}

function filterSaktiLoginRoles() {
  const input = document.getElementById('sakti-login-search-input');
  SaktiRoleState.loginSearchFilter = input ? input.value : '';
  renderSaktiLoginRolesList();
}
// ==============================================================================

function updateUserNavbar() {
  const user = AppState.currentUser;
  if (!user) return;

  // Set default dashboard scope based on user's role/pic
  AppState.dashboardSubbag = (user && user.pic_subbag && user.pic_subbag !== 'SEMUA') ? user.pic_subbag : 'SEMUA';

  const isDev = isDeveloperSession();
  const isDevSimulating = isDev && user.level > 0;
  const devAccount = AppState.usersList.find(u => u.level === 0 || u.username === 'emenje');
  const permanentDevNama = user.original_dev_nama || devAccount?.nama_pejabat || 'emenje (Pengembang)';
  const permanentDevAvatar = user.original_dev_avatar || devAccount?.avatar_url || '';

  // Bab 11.2 & FR-14: Saat login sebagai Developer (termasuk saat ganti peran), badge login kanan atas TIDAK BERUBAH
  setElText('user-nama-pejabat', (isDev && !isDevSimulating) ? permanentDevNama : (user.nama_pejabat || user.username || 'Tamu'));
  const switcher = document.getElementById('user-switcher');
  if (switcher) switcher.value = user.username;

  // SAKTI Verified Badge (Gambar 2)
  const verifiedBadge = document.getElementById('user-verified-badge');
  if (verifiedBadge) {
    verifiedBadge.style.display = 'inline-block';
  }

  // SAKTI Masked NIP / Username (Gambar 2: | 140902******0012)
  const nipBadge = document.getElementById('user-nip-badge');
  if (nipBadge) {
    if (user.nip) {
      const cleanNip = String(user.nip).trim();
      if (cleanNip.length >= 10) {
        const masked = cleanNip.substring(0, 6) + '******' + cleanNip.substring(cleanNip.length - 4);
        nipBadge.textContent = ` | ${masked}`;
      } else {
        nipBadge.textContent = ` | ${cleanNip}`;
      }
    } else {
      nipBadge.textContent = ` | ${user.username}`;
    }
  }

  // SAKTI Sub-text Peran Aktif: VALIDATOR SATKER 657811 2026 (Gambar 2)
  const activeRoleSub = document.getElementById('user-active-role-sub');
  if (activeRoleSub) {
    const activeRole = user.active_role || (Array.isArray(user.roles) ? user.roles[0] : null);
    const subText = getSaktiRoleHeaderSub(activeRole, user);
    activeRoleSub.textContent = `${subText} 2026`;
  }

  const roleEl = document.getElementById('user-role-badge');
  if (roleEl) {
    if (isDev) {
      roleEl.textContent = 'LEVEL 0: DEVELOPER';
      roleEl.className = 'user-role badge';
      roleEl.style.background = '#0f172a';
      roleEl.style.color = '#fff';
      roleEl.title = isDevSimulating
        ? `Identitas Login Tetap: ${permanentDevNama} (LEVEL 0: DEVELOPER) | Tampilan & Fitur Aktif: Level ${user.level} - ${user.nama_pejabat}`
        : `Identitas Login Tetap: ${permanentDevNama} (LEVEL 0: DEVELOPER)`;
    } else {
      roleEl.textContent = `Level ${user.level}: ${user.role || user.role_id || 'User'}`;
      roleEl.removeAttribute('title');
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
  }

  const avatarEl = document.getElementById('user-avatar');
  if (avatarEl) {
    if (isDev) {
      if (permanentDevAvatar) {
        avatarEl.innerHTML = `<img src="${escHtml(permanentDevAvatar)}" alt="Avatar" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='👨‍💻'" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1.5px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">`;
      } else {
        avatarEl.textContent = '👨‍💻';
      }
    } else if (user.avatar_url) {
      avatarEl.innerHTML = `<img src="${escHtml(user.avatar_url)}" alt="Avatar" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='👤'" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1.5px solid #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">`;
    } else if (user.username === 'emenje') {
      avatarEl.textContent = '👨‍💻';
    } else if (user.level === 0) {
      avatarEl.textContent = '⚡';
    } else if (user.level === 1) {
      avatarEl.textContent = '👑';
    } else if (user.level === 2) {
      avatarEl.textContent = '🛠️';
    } else {
      avatarEl.textContent = '👔';
    }
  }

  const btnLogin = document.getElementById('btn-nav-login');
  const btnLogout = document.getElementById('btn-nav-logout');
  if (btnLogin) btnLogin.style.display = 'none';
  if (btnLogout) btnLogout.style.display = 'inline-flex';

  applyRolePermissionsToUI();
}

function applyRolePermissionsToUI() {
  const user = AppState.currentUser;
  if (!user) return;

  const roleBanner = document.getElementById('global-role-banner');
  if (roleBanner) {
    roleBanner.style.display = 'none';
  }

  // 1. Terapkan Matriks Hak Akses Menu Dinamis Berbasis Level (0-4) dari Database
  applyDynamicMenuMatrix(user);

  // Kumpulkan level pengguna (aktif & multi-peran)
  const userLevels = new Set();
  userLevels.add(Number(user.level));
  if (Array.isArray(user.roles)) {
    user.roles.forEach(r => userLevels.add(Number(r.level)));
  }

  // 2. Akses Tombol Tambah Pengguna di view-users (Level 0 dan Level 1)
  const canAccessUserMgmt = userLevels.has(0) || userLevels.has(1);
  const btnTambahUser = document.getElementById('btn-tambah-user');
  if (btnTambahUser) {
    btnTambahUser.style.display = canAccessUserMgmt ? 'inline-flex' : 'none';
  }

  // 3. Pembatasan Subbag RKB:
  // Jika user memiliki pic_subbag spesifik (bukan 'SEMUA'), kunci filter RKB ke subbagnya
  const filterPicEl = document.getElementById('filter-pic');
  if (filterPicEl) {
    if (user.pic_subbag && user.pic_subbag !== 'SEMUA') {
      filterPicEl.value = user.pic_subbag;
      filterPicEl.disabled = true;
      filterPicEl.title = `Terkunci: Anda bertugas pada Subbagian/Divisi ${user.pic_subbag}`;
      AppState.filters.pic = user.pic_subbag;
    } else {
      if (filterPicEl.disabled) {
        filterPicEl.value = 'SEMUA';
        AppState.filters.pic = 'SEMUA';
      }
      filterPicEl.disabled = false;
      filterPicEl.removeAttribute('title');
    }
  }

  // 4. Read-Only Protection di Referensi (SBM, BAS, SSOT) & Database Master (PPK, PPS, Paslon, Settings)
  const isLevel1OrDev = userLevels.has(0) || userLevels.has(1);
  const masterActionSelectors = [
    '#view-db-sbm button[onclick*="openModalSbm"]',
    '#view-db-sbm button[onclick*="triggerImportSbm"]',
    '#view-db-bas button[onclick*="openModalBas"]',
    '#view-db-bas button[onclick*="triggerImportBas"]',
    '#view-db-ppk button[onclick*="openModalKecamatan"]',
    '#view-db-ppk button[onclick*="triggerImportKecamatan"]',
    '#view-db-pps button[onclick*="openModalDesa"]',
    '#view-db-pps button[onclick*="triggerImportDesa"]',
    '#view-db-paslon button[onclick*="openModalPaslon"]',
    '#btn-tambah-regulasi',
    '#btn-simpan-settings'
  ];
  masterActionSelectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(btn => {
      btn.style.display = isLevel1OrDev ? 'inline-flex' : 'none';
    });
  });

  // 5. Pengendali Switcher Cepat: HANYA tampil untuk Pengembang (Level 0 / QC Mode)
  const switcherContainer = document.getElementById('user-switcher-container');
  if (switcherContainer) {
    switcherContainer.style.display = isDeveloperSession() ? 'inline-flex' : 'none';
  }

  // 6. Tombol "Buat Usulan Revisi Baru" HANYA ADA DI LEVEL 2
  const isLevel2 = (Number(user.level) === 2);
  const btnBuatUsulanHeader = document.getElementById('btn-monitoring-buat-usulan');
  if (btnBuatUsulanHeader) {
    btnBuatUsulanHeader.style.display = isLevel2 ? 'inline-flex' : 'none';
  }
  const btnBuatRevisiSiklus = document.getElementById('btn-buat-revisi');
  if (btnBuatRevisiSiklus) {
    btnBuatRevisiSiklus.style.display = isLevel2 ? 'inline-flex' : 'none';
  }

  // 7. Filter konten Panduan secara ketat sesuai level & hak akses peran aktif
  renderPanduanByRole(user);
}

/**
 * Menentukan apakah pengguna memiliki hak akses ke Modul Perencanaan (dan Panduan Perencanaan).
 * Mencakup Level 0 (Developer), Level 1 (Rendatin), Level 2 (PIC Subbag), dan Level 3 (Viewer/Pimpinan).
 * Untuk Level 4-6 (khusus Pelaksanaan/Pembayaran murni), hanya aktif jika diberi flag akses perencanaan.
 */
function canAccessModulPerencanaan(user = AppState.currentUser) {
  if (!user) return false;
  return true;
}

function canAccessModulPelaksanaan(user = AppState.currentUser) {
  if (!user) return false;
  const userLevels = new Set();
  userLevels.add(Number(user.level));
  if (Array.isArray(user.roles)) {
    user.roles.forEach(r => userLevels.add(Number(r.level)));
  }
  return userLevels.has(0) || userLevels.has(1) || userLevels.has(4);
}

/**
 * Menyaring dan menyesuaikan konten di dalam #view-panduan (Panduan Perencanaan)
 * dan #view-panduan-pelaksanaan (Panduan Pelaksanaan) secara KETAT sesuai peran/level user.
 */
function renderPanduanByRole(user = AppState.currentUser) {
  if (!user) return;
  const lvl = Number(user.level);
  const pic = user.pic_subbag || 'SEMUA';
  const roleLow = (user.role_id || '').toLowerCase();
  const unameLow = (user.username || '').toLowerCase();
  const isPimpinanPelaksanaan = (
    roleLow === 'ketua_kpu' || unameLow === 'ketua' || unameLow === 'ketua_kpu' ||
    roleLow === 'sekretaris' || unameLow === 'sekretaris' || roleLow === 'viewer_sekretaris'
  );

  // Tentukan cakupan blok panduan perencanaan yang boleh tampil untuk user ini
  const showLevel1Pimpinan = (lvl <= 1 || isPimpinanPelaksanaan);
  const showLevel2 = (lvl === 2 || lvl <= 1);
  const showViewer = (lvl === 3 || lvl <= 1);

  document.querySelectorAll('#view-panduan [data-panduan-scope]').forEach(el => {
    const scope = el.getAttribute('data-panduan-scope');
    let visible = true;
    if (scope === 'level1_pimpinan') visible = showLevel1Pimpinan;
    else if (scope === 'level2') visible = showLevel2;
    else if (scope === 'viewer') visible = showViewer;
    el.style.display = visible ? '' : 'none';
  });

  // Sesuaikan badge, deskripsi, dan tautan unduhan dokumen pada Panduan Perencanaan
  const badgePerencanaan = document.getElementById('panduan-perencanaan-role-badge');
  const descPerencanaan = document.getElementById('panduan-perencanaan-desc');
  const docLinkPerencanaan = document.getElementById('panduan-perencanaan-doc-link');

  if (lvl === 2) {
    if (badgePerencanaan) {
      badgePerencanaan.textContent = `📖 PANDUAN PERENCANAAN • KHUSUS LEVEL 2 (PIC ${pic})`;
    }
    if (descPerencanaan) {
      descPerencanaan.innerHTML = `<strong>Khusus Pengguna Level 2 (PIC Subbagian ${escHtml(pic)})</strong> &mdash; Panduan praktis penyusunan RKB, pengajuan revisi 3 dokumen, dan pembacaan Rekap Perencanaan sesuai kewenangan subbagian Anda.`;
    }
    if (docLinkPerencanaan) {
      docLinkPerencanaan.href = '/assets/Panduan_Si_Prabu_Level_2_dan_Viewer.docx';
      docLinkPerencanaan.setAttribute('download', 'Panduan_Si_Prabu_Level_2_dan_Viewer.docx');
    }
  } else if (lvl === 3 && !isPimpinanPelaksanaan) {
    if (badgePerencanaan) {
      badgePerencanaan.textContent = `📖 PANDUAN PERENCANAAN • KHUSUS VIEWER (${pic})`;
    }
    if (descPerencanaan) {
      descPerencanaan.innerHTML = `<strong>Khusus Pengguna Viewer (Lihat-Saja &mdash; Cakupan ${escHtml(pic)})</strong> &mdash; Panduan membaca data perencanaan, memantau progres revisi, dan mengunduh laporan sesuai cakupan divisi/akun Anda.`;
    }
    if (docLinkPerencanaan) {
      docLinkPerencanaan.href = '/assets/Panduan_Si_Prabu_Level_2_dan_Viewer.docx';
      docLinkPerencanaan.setAttribute('download', 'Panduan_Si_Prabu_Level_2_dan_Viewer.docx');
    }
  } else {
    if (badgePerencanaan) {
      badgePerencanaan.textContent = `📖 PANDUAN PERENCANAAN • OTORITAS PERENCANAAN & PIMPINAN`;
    }
    if (descPerencanaan) {
      descPerencanaan.innerHTML = `<strong>Panduan Lengkap Modul Perencanaan SI-PRABU</strong> &mdash; Mencakup tata kelola SSOT/SBM/BAS, penyusunan RUH Belanja, validasi usulan revisi (Tahap 1–3), hingga Pengesahan BA Pleno (Tahap 4).`;
    }
    if (docLinkPerencanaan) {
      docLinkPerencanaan.href = '/assets/Panduan_Pengguna_Si_Prabu.docx';
      docLinkPerencanaan.setAttribute('download', 'Panduan_Pengguna_Si_Prabu.docx');
    }
  }

  // Sesuaikan badge & deskripsi pada Panduan Pelaksanaan (mendukung Level 0/1/Pimpinan hingga Level 4-6)
  const badgePelaksanaan = document.getElementById('panduan-pelaksanaan-role-badge');
  const descPelaksanaan = document.getElementById('panduan-pelaksanaan-desc');
  if (badgePelaksanaan) {
    if (lvl >= 4) {
      badgePelaksanaan.textContent = `💳 PANDUAN PELAKSANAAN & PEMBAYARAN • LEVEL ${lvl}`;
    } else {
      badgePelaksanaan.textContent = `💳 MODUL PELAKSANAAN & PEMBAYARAN • BASELINE SAH TAHAP 4`;
    }
  }
  if (descPelaksanaan) {
    descPelaksanaan.innerHTML = `<strong>Khusus Otoritas Pelaksanaan (${escHtml(user.nama_pejabat || user.username)})</strong> &mdash; Panduan penggunaan Rekap Pelaksanaan berbasis RKB Sah Terakhir (Tahap 4) serta matriks kewenangan eksekusi &amp; pembayaran.`;
  }
}

const RoleSwitchModalState = {
  previousUsername: null,
  targetUsername: null,
  prepPromise: null,
  isReady: false,
  cancelled: false
};

function buildRolePermissionsSummaryHtml(targetUser) {
  if (!targetUser) return '';
  const lvl = Number(targetUser.level);
  const pic = targetUser.pic_subbag || 'SEMUA';
  const uname = (targetUser.username || '').toLowerCase();
  const role = (targetUser.role_id || '').toLowerCase();

  if (lvl === 0) {
    return `
      <ul style="margin: 0; padding-left: 18px;">
        <li><strong>Akses Penuh (Superuser Developer):</strong> Membuka seluruh menu Penganggaran, Rekap Anggaran, Referensi, Database, Manajemen Pengguna, Log Aktivitas, serta <strong>Ruang Pengembang (Blueprint &amp; PRD)</strong>.</li>
        <li><strong>Cakupan RKB:</strong> Seluruh 5 Subbagian Pelaksana (<code>SEMUA</code>) dengan hak edit penuh.</li>
      </ul>
    `;
  }
  if (lvl === 1) {
    const isKasubag = (uname === 'perencanaan' || uname === 'kasubbag_rendatin' || role === 'super_admin' || role === 'perencanaan_kasubag');
    return `
      <ul style="margin: 0; padding-left: 18px;">
        <li><strong>Otoritas Perencanaan (Level 1):</strong> Edit penuh RUH Belanja lintas 5 Subbagian, <strong>Validasi Revisi (Tahap 2–3)</strong>, <strong>Pengesahan BA Pleno (Tahap 4)</strong>, serta kelola Referensi &amp; Database Master.</li>
        <li><strong>Rekap Anggaran:</strong> Akses penuh <em>Rekap Perencanaan</em> dan <em>Rekap Pelaksanaan (Baseline Sah)</em>.</li>
        <li><strong>Administrasi:</strong> ${isKasubag ? 'Membuka menu <strong>Manajemen Pengguna</strong> &amp; <strong>Log Aktivitas</strong> (Kewenangan Kasubag Rendatin).' : 'Menu Manajemen Pengguna &amp; Log Aktivitas <strong>disembunyikan</strong> (Khusus Kasubag Rendatin).'}</li>
      </ul>
    `;
  }
  if (lvl === 2) {
    return `
      <ul style="margin: 0; padding-left: 18px;">
        <li><strong>Isolasi Subbagian (Level 2 — <code>${escHtml(pic)}</code>):</strong> Hanya dapat menambah/mengubah baris RUH Belanja milik Subbagian <strong>${escHtml(pic)}</strong>; filter subbagian dikunci otomatis ke <code>${escHtml(pic)}</code>.</li>
        <li><strong>Siklus Revisi:</strong> Membuka menu <strong>Pengajuan Usulan Revisi (Tahap 1)</strong>; menu Validasi Tahap 2–3, Tahap 4, Database Master, dan Administrasi disembunyikan.</li>
        <li><strong>Rekap &amp; Ekspor:</strong> Hanya menampilkan <em>Rekap Perencanaan</em> khusus <code>${escHtml(pic)}</code> dan ekspor Excel 2 Sheet (<code>RUH_Belanja_Resmi</code> &amp; <code>Matriks_Revisi</code>).</li>
      </ul>
    `;
  }
  const canPelaksanaan = (role === 'ketua_kpu' || uname === 'ketua' || uname === 'ketua_kpu' || role === 'sekretaris' || uname === 'sekretaris' || role === 'viewer_sekretaris');
  const canDb = canViewDatabaseMaster(targetUser);
  return `
    <ul style="margin: 0; padding-left: 18px;">
      <li><strong>Monitoring Eksekutif (Level 3 — Read-Only):</strong> Seluruh lembar kerja RUH Belanja dan Referensi berada dalam mode baca saja (tanpa tombol tambah/edit/hapus).</li>
      <li><strong>Cakupan Data &amp; Rekap:</strong> Cakupan divisi <code>${escHtml(pic)}</code> • Rekap Perencanaan Aktif ${canPelaksanaan ? '• Membuka <strong>Rekap Pelaksanaan (Baseline Sah)</strong>' : '• Rekap Pelaksanaan disembunyikan'}.</li>
      <li><strong>Database Master:</strong> ${canDb ? 'Tersedia dalam mode <strong>Read-Only</strong>.' : 'Menu Database Master <strong>disembunyikan</strong>.'}</li>
    </ul>
  `;
}

async function switchUser(username) {
  const targetUser = AppState.usersList.find(u => u.username === username);
  if (!targetUser) return;

  if (!isDeveloperSession()) {
    showToast('Akses ditolak: Fitur ganti peran bebas hanya untuk Akun Pengembang (Level 0).', 'error');
    return;
  }

  const prevUser = AppState.currentUser;
  RoleSwitchModalState.previousUsername = prevUser ? prevUser.username : 'emenje';
  RoleSwitchModalState.targetUsername = username;
  RoleSwitchModalState.isReady = false;
  RoleSwitchModalState.cancelled = false;

  // 1. Tampilkan Pop-Up Validasi Ganti Peran seketika
  const modal = document.getElementById('modal-role-switch');
  const devAccount = AppState.usersList.find(u => u.level === 0 || u.username === 'emenje');
  const permanentDevNama = prevUser?.original_dev_nama || devAccount?.nama_pejabat || 'emenje (Pengembang)';

  setElText('role-switch-origin-name', permanentDevNama);
  setElText('role-switch-target-name', `${targetUser.nama_pejabat} (${targetUser.username})`);
  setElHtml('role-switch-target-badges', `
    <span class="badge badge-primary" style="font-size: 10.5px;">Level ${targetUser.level}</span>
    <span class="badge badge-secondary" style="font-size: 10.5px;">PIC/Scope: ${escHtml(targetUser.pic_subbag || 'SEMUA')}</span>
    <span class="badge" style="background: #e2e8f0; color: #1e293b; font-size: 10.5px;">${escHtml(targetUser.jabatan || targetUser.role_id || '-')}</span>
  `);
  setElHtml('role-switch-permissions-summary', buildRolePermissionsSummaryHtml(targetUser));

  const progBox = document.getElementById('role-switch-progress-box');
  const progIcon = document.getElementById('role-switch-progress-icon');
  const progTitle = document.getElementById('role-switch-progress-title');
  const progDesc = document.getElementById('role-switch-progress-desc');
  if (progBox) {
    progBox.style.background = '#fffbeb';
    progBox.style.borderColor = '#fde68a';
  }
  if (progIcon) progIcon.textContent = '⏳';
  if (progTitle) {
    progTitle.style.color = '#92400e';
    progTitle.textContent = 'Menyiapkan Refresh & Memuat Halaman Dashboard...';
  }
  if (progDesc) {
    progDesc.style.color = '#b45309';
    progDesc.textContent = `Menyegarkan konteks fitur, filter subbagian (${targetUser.pic_subbag || 'SEMUA'}), dan menyiapkan halaman Beranda...`;
  }

  if (modal) modal.style.display = 'flex';

  // 2. Sementara Pop-Up muncul, sistem di latar belakang menyiapkan sesi, refresh data, dan mengarahkan halaman baru ke Dashboard
  RoleSwitchModalState.prepPromise = (async () => {
    try {
      const res = await apiFetch('/api/switch-user', {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      if (RoleSwitchModalState.cancelled) return false;

      localStorage.setItem('siprabu_token', res.token);
      AppState.currentUser = res.user;
      sessionStorage.setItem('siprabu_is_developer_origin', 'true');

      // Bersihkan draf perubahan RKB sementara agar tidak terbawa lintas peran
      AppState.stagedRkbOps = [];
      AppState.stagedDiff = null;
      if (typeof renderStagedRkbFloatingBar === 'function') {
        renderStagedRkbFloatingBar();
      }

      // Sesuaikan filter subbagian RKB dengan peran baru
      AppState.filters.pic = (res.user.pic_subbag && res.user.pic_subbag !== 'SEMUA') ? res.user.pic_subbag : 'SEMUA';
      const filterPicEl = document.getElementById('filter-pic');
      if (filterPicEl) {
        filterPicEl.value = AppState.filters.pic;
      }

      // Update navbar (badge login tetap LEVEL 0: DEVELOPER) dan terapkan hak akses menu/fitur
      updateUserNavbar();
      applyRolePermissionsToUI();

      // Jika beralih ke peran non-developer, bersihkan konten Blueprint di memori
      if (!isActiveDeveloperUser(res.user)) {
        currentBlueprintRawContent = '';
        const bpContainer = document.getElementById('dev-blueprint-formatted-view');
        const bpTextarea = document.getElementById('dev-blueprint-raw-textarea');
        if (bpContainer) bpContainer.innerHTML = '';
        if (bpTextarea) bpTextarea.value = '';
      }

      // Muat ulang data dan mulai halaman baru dari Beranda (view-dashboard) sesuai peran yang dipilih
      await loadMasters();
      await loadPeriodes();
      await loadRkbData();
      renderAllViews();
      switchView('view-dashboard', true);

      if (RoleSwitchModalState.cancelled) return false;
      RoleSwitchModalState.isReady = true;

      if (progBox) {
        progBox.style.background = '#ecfdf5';
        progBox.style.borderColor = '#6ee7b7';
      }
      if (progIcon) progIcon.textContent = '✅';
      if (progTitle) {
        progTitle.style.color = '#065f46';
        progTitle.textContent = 'Halaman Dashboard & Fitur Peran Baru Siap!';
      }
      if (progDesc) {
        progDesc.style.color = '#047857';
        progDesc.textContent = `Halaman Beranda (Dashboard) telah dimuat sesuai peran ${res.user.nama_pejabat} [Level ${res.user.level}]. Klik tombol di bawah untuk melanjutkan.`;
      }
      return true;
    } catch (err) {
      if (progBox) {
        progBox.style.background = '#fef2f2';
        progBox.style.borderColor = '#fca5a5';
      }
      if (progIcon) progIcon.textContent = '❌';
      if (progTitle) {
        progTitle.style.color = '#991b1b';
        progTitle.textContent = 'Gagal Menyiapkan Peran Baru';
      }
      if (progDesc) {
        progDesc.style.color = '#b91c1c';
        progDesc.textContent = err.message || 'Terjadi kesalahan saat memvalidasi pergantian peran.';
      }
      showToast('Gagal beralih peran: ' + err.message, 'error');
      return false;
    }
  })();
}

async function confirmRoleSwitchModal() {
  const btnConfirm = document.getElementById('btn-confirm-role-switch');
  if (btnConfirm) {
    btnConfirm.disabled = true;
    btnConfirm.textContent = '⏳ Menyelesaikan Transisi...';
  }
  try {
    if (RoleSwitchModalState.prepPromise) {
      await RoleSwitchModalState.prepPromise;
    }
    const modal = document.getElementById('modal-role-switch');
    if (modal) modal.style.display = 'none';
    if (AppState.currentUser) {
      showToast(`Tampilan & fitur disesuaikan ke: ${AppState.currentUser.nama_pejabat} [Level ${AppState.currentUser.level}] (Dimulai dari Dashboard)`, 'success');
    }
  } finally {
    if (btnConfirm) {
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = '🚀 Terapkan &amp; Mulai dari Dashboard';
    }
  }
}
window.confirmRoleSwitchModal = confirmRoleSwitchModal;

async function cancelRoleSwitchModal() {
  RoleSwitchModalState.cancelled = true;
  const modal = document.getElementById('modal-role-switch');
  if (modal) modal.style.display = 'none';

  const prevUsername = RoleSwitchModalState.previousUsername;
  if (prevUsername && AppState.currentUser && AppState.currentUser.username !== prevUsername) {
    try {
      const res = await apiFetch('/api/switch-user', {
        method: 'POST',
        body: JSON.stringify({ username: prevUsername })
      });
      localStorage.setItem('siprabu_token', res.token);
      AppState.currentUser = res.user;
      updateUserNavbar();
      applyRolePermissionsToUI();
      await loadPeriodes();
      await loadRkbData();
      renderAllViews();
    } catch (_) {}
  } else {
    const switcher = document.getElementById('user-switcher');
    if (switcher && prevUsername) switcher.value = prevUsername;
  }
}
window.cancelRoleSwitchModal = cancelRoleSwitchModal;

async function logout(isAutoTimeout = false) {
  if (!isAutoTimeout) {
    const konfirmasi = confirm('Apakah Anda yakin ingin keluar dari sistem SI-PRABU?');
    if (!konfirmasi) return;
  }

  try {
    await apiFetch('/api/logout', { method: 'POST' });
  } catch (e) {}

  localStorage.removeItem('siprabu_token');
  sessionStorage.removeItem('siprabu_is_developer_origin');
  sessionStorage.removeItem('siprabu_redirect_view');
  AppState.currentUser = null;
  AppState.rkbData = null;
  AppState.currentPeriode = null;
  showLoginScreen(true);
  if (isAutoTimeout) {
    showToast('Sesi berakhir otomatis karena tidak ada aktivitas selama 30 menit.', 'warning');
  } else {
    showToast('Anda telah berhasil keluar dari sistem.', 'info');
  }
}

// Pelacak Inaktivitas 30 Menit (Bab 12 & FR-15)
const CLIENT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let clientIdleTimer = null;
function resetClientIdleTimer() {
  if (clientIdleTimer) clearTimeout(clientIdleTimer);
  if (!localStorage.getItem('siprabu_token')) return;
  clientIdleTimer = setTimeout(() => {
    if (localStorage.getItem('siprabu_token') && AppState.currentUser) {
      logout(true);
    }
  }, CLIENT_IDLE_TIMEOUT_MS);
}
if (typeof window !== 'undefined') {
  ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetClientIdleTimer, { passive: true });
  });
  resetClientIdleTimer();
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

let gsiRetryCount = 0;
function renderGoogleButton() {
  const targets = [
    {
      container: document.getElementById('login-screen-google-btn-wrapper'),
      hint: document.getElementById('login-screen-google-hint')
    },
    {
      container: document.getElementById('google-btn-wrapper'),
      hint: document.getElementById('google-hint')
    }
  ];

  const activeTargets = targets.filter(t => Boolean(t.container));
  if (activeTargets.length === 0) return;

  const isGoogleActive = Boolean(googleAuthConfig.enabled && googleAuthConfig.client_id);
  if (isGoogleActive) {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      gsiRetryCount = 0;
      activeTargets.forEach(({ container, hint }) => {
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
            hint.innerHTML = `Domain diizinkan: <strong>${escHtml(googleAuthConfig.allowed_domains || 'gmail.com, kpungawi.com, kpu.go.id')}</strong>`;
          }
        } catch (e) {
          console.warn('GSI renderButton error:', e);
          container.innerHTML = `<div class="text-danger" style="font-size:12px;">Gagal memuat tombol Google: ${escHtml(e.message)}</div>`;
        }
      });
    } else {
      // SDK Google masih dalam proses loading
      if (gsiRetryCount < 15) {
        gsiRetryCount++;
        activeTargets.forEach(({ container }) => {
          container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;font-size:12px;color:#64748b;padding:8px;">
              <span class="spinner-sm"></span> Menghubungkan Google Identity Services...
            </div>
          `;
        });
        setTimeout(renderGoogleButton, 350);
      } else {
        activeTargets.forEach(({ container }) => {
          container.innerHTML = `
            <div style="background:#fff1f2;border:1px solid #fecdd3;color:#e11d48;padding:8px 12px;border-radius:6px;font-size:11.5px;">
              ⚠️ SDK Google Identity Services belum dapat dimuat dari Google. Periksa koneksi internet Anda.
            </div>
          `;
        });
      }
    }
  } else {
    activeTargets.forEach(({ container, hint }) => {
      container.innerHTML = `
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; padding: 12px 14px; border-radius: 8px; font-size: 11.5px; color: #64748b; width: 100%; text-align: center;">
          ℹ️ <strong>Single Sign-On (SSO) Google belum dikonfigurasi</strong><br>
          <span style="font-size: 11px;">Silakan hubungi Administrator Satker untuk mengonfigurasi Client ID Google pada sistem.</span>
        </div>
      `;
      if (hint) hint.innerHTML = '';
    });
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
      if (res.user?.level === 0 || res.user?.role_id === 'developer' || res.user?.username === 'emenje') {
        sessionStorage.setItem('siprabu_is_developer_origin', 'true');
      } else {
        sessionStorage.removeItem('siprabu_is_developer_origin');
      }
      await loadUsers();
      closeLoginModal();

      // Alur SAKTI Post-Login (Gambar 1): Jika akun memiliki > 1 peran, tampilkan Layar Pemilihan Peran
      if (res.user && Array.isArray(res.user.roles) && res.user.roles.length > 1 && res.user.role_mode !== 'KUMULATIF') {
        showSaktiPostLoginRoleSelector(res.user);
        return;
      }

      showMainApp();
      updateUserNavbar();
      showToast(res.message || `Selamat datang, ${res.user.nama_pejabat}!`, 'success');
      await loadMasters();
      await loadPeriodes();
      await loadRkbData();
      renderAllViews();
      const redirectView = sessionStorage.getItem('siprabu_redirect_view');
      sessionStorage.removeItem('siprabu_redirect_view');
      switchView(redirectView || 'view-dashboard', true);
    } else {
      const errBox = document.getElementById('login-screen-error');
      const errText = document.getElementById('login-screen-error-text');
      if (errBox && errText) {
        errText.textContent = res.error || 'Login Google gagal.';
        errBox.style.display = 'block';
      }
      showToast(res.error || 'Login Google gagal.', 'error');
    }
  } catch (err) {
    const errBox = document.getElementById('login-screen-error');
    const errText = document.getElementById('login-screen-error-text');
    if (errBox && errText) {
      errText.textContent = err.message || 'Terjadi kesalahan saat verifikasi akun Google.';
      errBox.style.display = 'block';
    }
    showToast(err.message || 'Terjadi kesalahan saat verifikasi akun Google.', 'error');
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
  const password = document.getElementById('login-modal-password')?.value || '';

  if (!username) {
    showToast('Username wajib diisi.', 'error');
    return;
  }
  // Pengguna selain developer wajib memasukkan kata sandi
  if (username !== 'emenje' && !password) {
    showToast('Kata sandi wajib diisi.', 'error');
    return;
  }

  try {
    const res = await performLogin(username, password);
    closeLoginModal();

    // Alur SAKTI Post-Login (Gambar 1): Jika akun memiliki > 1 peran, tampilkan Layar Pemilihan Peran
    if (res.user && Array.isArray(res.user.roles) && res.user.roles.length > 1 && res.user.role_mode !== 'KUMULATIF') {
      showSaktiPostLoginRoleSelector(res.user);
      return;
    }

    showToast(`Berhasil login sebagai ${AppState.currentUser.nama_pejabat}!`, 'success');
    await loadMasters();
    await loadPeriodes();
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
  AppState.periodesList = (res.periodes || []).filter(p => p.id !== 1000004 && !String(p.nama_periode || '').includes('Revisi 2') && p.versi_revisi !== 'Revisi 2');

  // ATURAN BARU: Inisialisasi & Dashboard SELALU mengambil draft aktif (is_locked = 0)
  try {
    const actRes = await apiFetch('/api/periodes/active');
    if (actRes && actRes.periode) {
      AppState.activeDraftPeriode = actRes.periode;
      // Selalu kunci pilihan default ke draft aktif
      AppState.currentPeriode = actRes.periode;
    }
  } catch (e) {
    console.warn('Gagal memuat periode aktif:', e);
  }

  // Fallback: cari dokumen yang belum terkunci (is_locked = 0) atau urutan usulan terakhir
  if (!AppState.currentPeriode && AppState.periodesList.length > 0) {
    const draft = AppState.periodesList.slice().reverse().find(p => !p.is_locked);
    AppState.currentPeriode = draft || AppState.periodesList[AppState.periodesList.length - 1];
  }

  if (AppState.currentPeriode) {
    const matched = AppState.periodesList.find(x => x.id === AppState.currentPeriode.id);
    if (matched) {
      AppState.currentPeriode = matched;
    }
  }
}

function saveStagedOpsToStorage(periodeId, ops) {
  if (!periodeId) return;
  try {
    if (Array.isArray(ops) && ops.length > 0) {
      localStorage.setItem(`siprabu_staged_rkb_ops_${periodeId}`, JSON.stringify(ops));
    } else {
      localStorage.removeItem(`siprabu_staged_rkb_ops_${periodeId}`);
    }
  } catch (e) {}
}

function loadStagedOpsFromStorage(periodeId) {
  if (!periodeId) return [];
  try {
    const raw = localStorage.getItem(`siprabu_staged_rkb_ops_${periodeId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function loadRkbData() {
  if (!AppState.currentPeriode) return;
  const periodeId = AppState.currentPeriode.id;

  if (AppState.stagedPeriodeId !== periodeId) {
    AppState.stagedPeriodeId = periodeId;
    if (!Array.isArray(AppState.stagedRkbOps) || AppState.stagedRkbOps.length === 0) {
      AppState.stagedRkbOps = loadStagedOpsFromStorage(periodeId);
    }
  } else if (!Array.isArray(AppState.stagedRkbOps) || AppState.stagedRkbOps.length === 0) {
    const stored = loadStagedOpsFromStorage(periodeId);
    if (stored.length > 0) {
      AppState.stagedRkbOps = stored;
    }
  }

  const user = AppState.currentUser;
  if (user && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
    AppState.filters.pic = user.pic_subbag;
  }

  if (Array.isArray(AppState.stagedRkbOps) && AppState.stagedRkbOps.length > 0 && !AppState.currentPeriode.is_locked) {
    const previewRes = await apiFetch(`/api/rkb/${periodeId}/preview-staged`, {
      method: 'POST',
      body: JSON.stringify({
        ops: AppState.stagedRkbOps,
        pic: AppState.filters.pic,
        target_scope: AppState.filters.sasaran,
        cost_sharing: AppState.filters.cost_sharing || 'ALL',
        search: AppState.filters.search.trim()
      })
    });
    AppState.rkbData = previewRes;
    AppState.stagedDiff = previewRes.staged_diff || null;
    AppState.rowIdToTempId = {};
    if (previewRes.temp_id_map && typeof previewRes.temp_id_map === 'object') {
      for (const [tId, sqlId] of Object.entries(previewRes.temp_id_map)) {
        AppState.rowIdToTempId[Number(sqlId)] = tId;
        AppState.rowIdToTempId[String(sqlId)] = tId;
      }
    }
    if (previewRes.reference_version) {
      AppState.latestReferenceVersion = previewRes.reference_version;
      if (!AppState.initialReferenceVersion) {
        AppState.initialReferenceVersion = previewRes.reference_version;
      }
    }
    if (previewRes.rkb_version) {
      AppState.rkbVersion = previewRes.rkb_version;
    }
  } else {
    AppState.rowIdToTempId = {};
    const queryParams = new URLSearchParams();
    if (AppState.filters.pic !== 'SEMUA') queryParams.append('pic', AppState.filters.pic);
    if (AppState.filters.sasaran !== 'ALL') queryParams.append('target_scope', AppState.filters.sasaran);
    if (AppState.filters.cost_sharing && AppState.filters.cost_sharing !== 'ALL') queryParams.append('cost_sharing', AppState.filters.cost_sharing);
    if (AppState.filters.search.trim()) queryParams.append('search', AppState.filters.search.trim());

    const url = `/api/rkb/${periodeId}?${queryParams.toString()}`;
    AppState.rkbData = await apiFetch(url);
    AppState.stagedDiff = null;
    if (AppState.rkbData && AppState.rkbData.reference_version) {
      AppState.initialReferenceVersion = AppState.rkbData.reference_version;
      AppState.latestReferenceVersion = AppState.rkbData.reference_version;
      AppState.referenceChangeAcknowledged = false;
    }
    if (AppState.rkbData && AppState.rkbData.rkb_version) {
      AppState.rkbVersion = AppState.rkbData.rkb_version;
    }
  }

  updateStagedRkbBannerUI();

  try {
    AppState.rkbWorkflowData = await apiFetch(`/api/rkb/${periodeId}/usulan-subbag`);
  } catch (err) {
    console.warn('Gagal memuat status alur revisi subbag:', err);
    AppState.rkbWorkflowData = null;
  }
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
  const target = document.getElementById(folderId);
  if (!target) return;

  const isCurrentlyOpen = !target.classList.contains('collapsed');

  // Duplikasi Cara Kerja SAKTI Kemenkeu: Tutup SEMUA modul folder lainnya
  document.querySelectorAll('#sidebar-nav-menu .sakti-tree-group').forEach(group => {
    group.classList.add('collapsed');
  });

  // Jika folder yang diklik sebelumnya tertutup, maka sekarang dibuka
  if (!isCurrentlyOpen) {
    target.classList.remove('collapsed');
  }
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

function switchView(viewId, updateHistory = true) {
  // Redirect legacy view-revisi-arsip ke Pusat Siklus Dokumen terpadu (Bab 5 Canon)
  if (viewId === 'view-revisi-arsip') {
    viewId = 'view-siklus';
  }

  const user = AppState.currentUser;
  if (user) {
    // 0. GUARD DINAMIS BERBASIS MATRIKS DATABASE LEVEL (0-4)
    if (Array.isArray(AppState.menuMatrix) && AppState.menuMatrix.length > 0) {
      const menuItem = AppState.menuMatrix.find(m => m.menu_key === viewId);
      if (menuItem) {
        const userLevels = new Set();
        userLevels.add(Number(user.level));
        if (Array.isArray(user.roles)) {
          user.roles.forEach(r => userLevels.add(Number(r.level)));
        }
        const isDev = userLevels.has(0) || user.role_id === 'developer' || user.username === 'emenje';
        let isAllowed = isDev;
        if (!isAllowed) {
          for (const lvl of userLevels) {
            if (Boolean(menuItem[`allow_l${lvl}`])) {
              isAllowed = true;
              break;
            }
          }
        }
        if (!isAllowed) {
          showToast(`Akses ditolak: Menu "${menuItem.menu_label || viewId}" memerlukan kewenangan khusus (Level ${[0,1,2,3,4].filter(l => menuItem['allow_l' + l]).join('/')}).`, 'warning');
          switchView('view-dashboard', updateHistory);
          return;
        }
      }
    }

    // 1. Pusat Siklus Dokumen & Arsip Revisi terbuka Read-Only untuk semua peran terautentikasi (Bab 5 Canon)

    // 2. Guard Database Master: Level <= 1 (CRUD) + Sekretaris & Divisi Perencanaan (Read-Only)
    const isMasterDbView = ['view-db-ppk', 'view-db-pps', 'view-db-paslon', 'view-db-settings', 'view-settings', 'view-penandatangan'].includes(viewId);
    if (isMasterDbView && !canViewDatabaseMaster(user)) {
      showToast('Akses ditolak: Menu Master Database hanya untuk Tim Perencanaan, Sekretaris, Divisi Perencanaan & Pengembang.', 'warning');
      switchView('view-dashboard', updateHistory);
      return;
    }

    // 3. Guard Manajemen User & Log Aktivitas: HANYA Level 0 aktif dan Kasubbag Perencanaan
    const canAccessUserMgmt = Boolean(
      user.level === 0 || 
      (user.level === 1 && (user.username === 'perencanaan' || user.username === 'kasubbag_rendatin' || user.role_id === 'super_admin'))
    );
    if ((viewId === 'view-users' || viewId === 'view-audit' || viewId === 'view-menu-matrix') && !canAccessUserMgmt) {
      showToast('Akses ditolak: Menu ini hanya untuk Akun Developer (Level 0) dan Kasubbag Perencanaan (Rendatin).', 'warning');
      switchView('view-dashboard', updateHistory);
      return;
    }

    if (viewId === 'view-penandatangan') {
      const canAccessPenandatangan = Boolean(
        user.level <= 1 || 
        ['sekretaris', 'viewer_sekretaris', 'ketua_kpu', 'komisioner_rendatin', 'komisioner_teknis', 'komisioner_hukum', 'komisioner_parmas', 'komisioner_kul'].includes(user.role_id) ||
        ['sekretaris', 'ketua', 'divisi_rendatin', 'divisi_teknis', 'divisi_hukum', 'divisi_parmas', 'divisi_kul'].includes(user.username)
      );
      if (!canAccessPenandatangan) {
        showToast('Akses ditolak: Menu Pejabat Penandatangan khusus untuk Tim Perencanaan dan Pimpinan Satker.', 'warning');
        switchView('view-dashboard', updateHistory);
        return;
      }
    }

    // 3b. Guard Ruang Pengembang (Blueprint & PRD): HANYA Akun Developer Aktif (Level 0 / emenje) di Server Lokal (Localhost)
    if (viewId === 'view-developer' || viewId === 'view-dev-push') {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocalhost || !isActiveDeveloperUser(user)) {
        showToast('Akses ditolak: Ruang Pengembang (DEV) hanya dapat diakses pada server lokal pengembang.', 'error');
        switchView('view-dashboard', updateHistory);
        return;
      }
    }

    // 4. Guard Menu Siklus Revisi Sesuai Role KPU:
    // a. Pengajuan Usulan Revisi: HANYA untuk PIC Subbag (Level 2)
    if (viewId === 'view-revisi-pengajuan' && user.level !== 2) {
      showToast('Akses dibatasi: Form Pengajuan Usulan Revisi hanya untuk Akun PIC Subbag (Level 2). Anda dialihkan ke Validasi Revisi.', 'info');
      switchView('view-revisi-validasi', updateHistory);
      return;
    }
    // b. Validasi Revisi: HANYA untuk Tim Rendatin (Level <= 1) & Developer
    if (viewId === 'view-revisi-validasi' && user.level > 1 && user.role_id !== 'sekretaris' && user.role_id !== 'developer') {
      showToast('Akses ditolak: Menu Validasi Revisi khusus untuk Tim Rendatin (Level 1).', 'warning');
      switchView('view-revisi-monitoring', updateHistory);
      return;
    }
    // c. Pengesahan BA Pleno (Tahap 4): HANYA untuk Tim Rendatin (Level <= 1), Sekretaris KPU, & Developer
    if (viewId === 'view-revisi-tahap4' && user.level > 1 && user.role_id !== 'sekretaris' && user.role_id !== 'developer') {
      showToast('Akses ditolak: Pengesahan BA Pleno (Tahap 4) khusus untuk Tim Rendatin (Level 1) & Sekretaris KPU.', 'warning');
      switchView('view-revisi-monitoring', updateHistory);
      return;
    }
    // d. Guard Modul Pelaksanaan (Rekap Pelaksanaan & Panduan Pelaksanaan): Ketat sesuai hak akses
    if ((viewId === 'view-rekap-pelaksanaan' || viewId === 'view-panduan-pelaksanaan') && !canAccessModulPelaksanaan(user)) {
      showToast('Akses ditolak: Modul & Panduan Pelaksanaan hanya tersedia sesuai kewenangan peran Pelaksanaan/Pimpinan.', 'warning');
      switchView(viewId === 'view-panduan-pelaksanaan' ? 'view-panduan' : 'view-rekap-perencanaan', updateHistory);
      return;
    }
    // e. Guard Panduan Perencanaan: Ketat sesuai hak akses Modul Perencanaan
    if (viewId === 'view-panduan' && !canAccessModulPerencanaan(user)) {
      showToast('Akses ditolak: Panduan Perencanaan hanya untuk peran Modul Perencanaan.', 'warning');
      switchView('view-panduan-pelaksanaan', updateHistory);
      return;
    }
  }

  AppState.activeView = viewId;
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  
  let activeParentGroup = null;
  document.querySelectorAll('.nav-item').forEach(btn => {
    const isActive = btn.getAttribute('data-view') === viewId;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      activeParentGroup = btn.closest('.sakti-tree-group');
    }
  });

  // Duplikasi Cara Kerja SAKTI Kemenkeu:
  // Jika target view berada di dalam modul folder, buka folder tersebut dan tutup folder lain.
  // Jika target view adalah menu mandiri (Beranda, Manajemen User, Log, dll), tutup SEMUA folder.
  document.querySelectorAll('#sidebar-nav-menu .sakti-tree-group').forEach(group => {
    if (activeParentGroup && group === activeParentGroup) {
      group.classList.remove('collapsed');
    } else {
      group.classList.add('collapsed');
    }
  });

  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.add('active');

  // Perbarui Riwayat URL Browser & Judul Layar SAKTI Kemenkeu
  if (updateHistory !== false) {
    const routeToken = generateSaktiRouteToken(viewId, AppState.revisionViewMode === 'SANDING');
    window.history.pushState({ viewId, revisionViewMode: AppState.revisionViewMode }, '', '/' + routeToken);
  }
  document.title = (SAKTI_VIEW_TITLES[viewId] || 'SI-PRABU') + ' | SAKTI Kemenkeu - KPU Ngawi';

  if (viewId === 'view-dashboard') {
    // ATURAN BARU: Masuk ke dashboard SELALU beralih dan mengambil data draft aktif
    if (AppState.activeDraftPeriode && AppState.currentPeriode && AppState.currentPeriode.id !== AppState.activeDraftPeriode.id) {
      AppState.currentPeriode = AppState.activeDraftPeriode;
      loadRkbData().then(() => renderAllViews());
      return;
    }
    renderDashboard();
  }
  else if (viewId === 'view-siklus') renderSiklus();
  else if (viewId === 'view-revisi-pengajuan') initRevisiPengajuanView();
  else if (viewId === 'view-revisi-validasi') loadValidasiRevisiTable();
  else if (viewId === 'view-revisi-tahap4') loadTahap4ViewData();
  else if (viewId === 'view-revisi-monitoring') loadRevisiMonitoringTable();
  else if (viewId === 'view-revisi-arsip') loadRevisiArsipTable();
  else if (viewId === 'view-rkb') renderRkbTable();
  else if (viewId === 'view-db-ppk') { renderDbPpk(); renderContextualMasterReminderBanner(viewId); }
  else if (viewId === 'view-db-pps') { renderDbPps(); renderContextualMasterReminderBanner(viewId); }
  else if (viewId === 'view-db-paslon') { renderDbPaslon(); renderContextualMasterReminderBanner(viewId); }
  else if (viewId === 'view-db-kuantitas') { renderDbKuantitas(); renderContextualMasterReminderBanner(viewId); }
  else if (viewId === 'view-db-sbm') { renderDbSbm(); renderContextualMasterReminderBanner(viewId); }
  else if (viewId === 'view-db-bas') { renderDbBas(); renderContextualMasterReminderBanner(viewId); }
  else if (viewId === 'view-db-regulasi') { renderDbRegulasi(); renderContextualMasterReminderBanner(viewId); }
  else if (viewId === 'view-db-settings' || viewId === 'view-settings') { renderSettings(); renderContextualMasterReminderBanner(viewId); }
  else if (viewId === 'view-panduan') { renderPanduanByRole(); }
  else if (viewId === 'view-panduan-pelaksanaan') { renderPanduanByRole(); }
  else if (viewId === 'view-monitoring') loadMonitoringReport();
  else if (viewId === 'view-users') renderUsersTable();
  else if (viewId === 'view-menu-matrix') loadMenuMatrixView();
  else if (viewId === 'view-penandatangan') loadPenandatanganView();
  else if (viewId === 'view-audit') loadAuditLogsView();
  else if (viewId === 'view-developer') loadDeveloperBlueprint();
  else if (viewId === 'view-rekap-perencanaan') loadRekapView('perencanaan');
  else if (viewId === 'view-rekap-pelaksanaan') loadRekapView('pelaksanaan');
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
  renderDbRegulasi();
  renderSettings();
  renderUsersTable();
  applyRolePermissionsToUI();

  const u = AppState.currentUser;
  const canAudit = Boolean(
    u && (
      u.level === 0 ||
      (u.level === 1 && (u.username === 'perencanaan' || u.username === 'kasubbag_rendatin' || u.role_id === 'super_admin'))
    )
  );
  if (canAudit && typeof loadAuditLogsView === 'function') {
    loadAuditLogsView(false);
  }
}

// ============================================================================
// VIEW 1: DASHBOARD KPI EKSEKUTIF
// ============================================================================

function handleDashboardSubbagChange(val) {
  AppState.dashboardSubbag = val;
  renderDashboard();
}

function renderDashboard() {
  if (!AppState.rkbData || !AppState.rkbData.summary) return;
  const user = AppState.currentUser;
  const { summary: docSummary, subbag_summaries, periode } = AppState.rkbData;

  // 1. Tentukan konteks scoping (Apakah scoped ke Subbag tertentu?)
  const isUserLockedSubbag = Boolean(user && user.pic_subbag && user.pic_subbag !== 'SEMUA');
  let selectedSubbag = isUserLockedSubbag ? user.pic_subbag : (AppState.dashboardSubbag || 'SEMUA');
  
  // Jika subbag_summaries tersedia dan dipilih subbag tertentu
  const isScoped = selectedSubbag !== 'SEMUA';
  const subbagMeta = isScoped ? (SUBBAG_META[selectedSubbag] || { name: selectedSubbag, color: '#6366f1' }) : null;
  const summaries = subbag_summaries || (docSummary.subbagSummaries || {});
  const activeSummary = (isScoped && summaries[selectedSubbag])
    ? summaries[selectedSubbag]
    : ((isScoped && AppState.rkbData.filtered_summary) ? AppState.rkbData.filtered_summary : docSummary);

  // 2. Sinkronkan Filter Dropdown di Header Dashboard
  const filterContainer = document.getElementById('dashboard-subbag-filter-container');
  const filterSelect = document.getElementById('dashboard-subbag-select');
  const lockedBadge = document.getElementById('dashboard-subbag-locked-badge');
  const lockedText = document.getElementById('dashboard-subbag-locked-text');

  if (isUserLockedSubbag) {
    if (filterContainer) filterContainer.style.display = 'none';
    if (lockedBadge) {
      lockedBadge.style.display = 'inline-flex';
      if (lockedText) lockedText.textContent = `Subbag: ${subbagMeta ? subbagMeta.name : user.pic_subbag}`;
    }
  } else {
    if (lockedBadge) lockedBadge.style.display = 'none';
    if (filterContainer) filterContainer.style.display = 'inline-flex';
    if (filterSelect) filterSelect.value = selectedSubbag;
  }

  // 3. Update Title & Deskripsi Header Dashboard
  const draftTitleEl = document.getElementById('dashboard-active-draft-title');
  if (draftTitleEl) {
    if (isScoped) {
      draftTitleEl.textContent = `${periode.nama_periode} (${periode.versi_revisi}) • Subbag ${selectedSubbag}`;
    } else {
      draftTitleEl.textContent = `${periode.nama_periode} (${periode.versi_revisi}) • Konsolidasi Satker`;
    }
  }

  const descEl = document.getElementById('dashboard-desc');
  if (descEl) {
    if (isScoped) {
      descEl.innerHTML = `Ringkasan alokasi belanja RKB Aktif <b>Subbag ${subbagMeta ? subbagMeta.name : selectedSubbag}</b>.`;
    } else {
      descEl.textContent = 'Ringkasan eksekutif konsolidasi Pagu NPHD Hibah Pilkada Satker KPU Kabupaten Ngawi.';
    }
  }

  // 4. Update KPI Labels & Values
  const labelPagu = document.getElementById('kpi-label-total-pagu');
  if (labelPagu) {
    labelPagu.textContent = isScoped ? `TOTAL PAGU SUBBAG ${selectedSubbag}` : 'TOTAL PAGU SATKER (NPHD)';
  }
  setElText('kpi-total-pagu', formatRupiah(activeSummary.grandTotal));

  const pctOfTotal = docSummary.grandTotal > 0 ? ((activeSummary.grandTotal / docSummary.grandTotal) * 100).toFixed(2) : '0';
  setElText('kpi-status-dokumen', isScoped 
    ? `${pctOfTotal}% dari Total Satker (${formatRupiah(docSummary.grandTotal)})` 
    : (periode.is_locked ? 'Status: Terkunci (NPHD Sah)' : 'Status: Draft Aktif (Konsolidasi)'));

  const labelItems = document.getElementById('kpi-label-total-items');
  if (labelItems) {
    labelItems.textContent = isScoped ? 'RINCIAN ITEM BELANJA SUBBAG' : 'RINCIAN ITEM BELANJA SATKER';
  }
  setElText('kpi-total-items', formatNumber(activeSummary.totalItems) + ' Baris');
  setElText('kpi-total-rows', isScoped
    ? `Subbag ${selectedSubbag} (${formatNumber(activeSummary.totalItems)} dari ${formatNumber(docSummary.totalItems)} rincian satker)`
    : formatNumber(docSummary.totalRows) + ' Total Komponen Hierarki Satker');
  setElText('badge-total-items', formatNumber(activeSummary.totalItems));

  // Pagu Lingkup Kab & Adhoc
  const paguKab = (activeSummary.bySasaran && activeSummary.bySasaran.KAB) || 0;
  const paguAdhoc = ((activeSummary.bySasaran && activeSummary.bySasaran.PPK) || 0) +
                    ((activeSummary.bySasaran && activeSummary.bySasaran.PPS) || 0) +
                    ((activeSummary.bySasaran && activeSummary.bySasaran.TPS) || 0) +
                    ((activeSummary.bySasaran && activeSummary.bySasaran.PANTARLIH) || 0) +
                    ((activeSummary.bySasaran && activeSummary.bySasaran.PESERTA) || 0);

  const labelKab = document.getElementById('kpi-label-pagu-kab');
  if (labelKab) {
    labelKab.textContent = isScoped ? `KABUPATEN (${selectedSubbag})` : 'LINGKUP KABUPATEN';
  }
  const labelAdhoc = document.getElementById('kpi-label-pagu-adhoc');
  if (labelAdhoc) {
    labelAdhoc.textContent = isScoped ? `BADAN ADHOC (${selectedSubbag})` : 'ALOKASI BADAN ADHOC';
  }

  setElText('kpi-pagu-kab', formatRupiah(paguKab));
  setElText('kpi-pagu-adhoc', formatRupiah(paguAdhoc));

  const pctKab = activeSummary.grandTotal > 0 ? ((paguKab / activeSummary.grandTotal) * 100).toFixed(2) : '0';
  const pctAdhoc = activeSummary.grandTotal > 0 ? ((paguAdhoc / activeSummary.grandTotal) * 100).toFixed(2) : '0';

  setElText('kpi-pct-kab', `${pctKab}% dari Pagu ${isScoped ? 'Subbag' : 'Satker'}`);
  setElText('kpi-pct-adhoc', `${pctAdhoc}% (${isScoped ? 'PPK, PPS, TPS, Pantarlih, Peserta' : 'PPK, PPS, TPS, Pantarlih'})`);

  // 5. Card 1: Distribusi Subbag
  const subbagCardTitle = document.getElementById('dashboard-subbag-card-title');
  if (subbagCardTitle) {
    subbagCardTitle.textContent = isScoped 
      ? `Posisi Alokasi Anggaran Subbag ${selectedSubbag} Terhadap Satker` 
      : 'Distribusi Pagu Per Subbagian Pelaksana';
  }

  const subbagList = document.getElementById('subbag-distribution-list');
  if (subbagList && docSummary.bySubbag) {
    let subbagHtml = '';
    if (isScoped) {
      subbagHtml += `
        <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: #1e1b4b; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <strong>🏢 Subbagian ${subbagMeta ? subbagMeta.name : selectedSubbag}</strong>
            <div style="font-size: 11px; color: #4338ca; margin-top: 2px;">
              Mengelola <b>${formatRupiah(activeSummary.grandTotal)}</b> atau <b>${pctOfTotal}%</b> dari total pagu Satker KPU Kabupaten Ngawi.
            </div>
          </div>
          <span class="badge" style="background:#6366f1; color:#fff; font-size: 11px;">Tanggung Jawab Subbag</span>
        </div>
      `;
    }

    subbagHtml += Object.entries(docSummary.bySubbag).map(([pic, amt]) => {
      const meta = SUBBAG_META[pic] || { name: pic, color: '#64748b' };
      const pct = docSummary.grandTotal > 0 ? ((amt / docSummary.grandTotal) * 100).toFixed(2) : '0';
      const isCurrent = isScoped && (pic === selectedSubbag);
      return `
        <div class="subbag-progress-item ${isCurrent ? 'subbag-current-active' : ''}" style="${isCurrent ? 'background: #f8fafc; border: 1.5px solid ' + meta.color + '; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px;' : 'margin-bottom: 8px;'}">
          <div class="subbag-meta">
            <span class="subbag-name">${meta.name} ${isCurrent ? '⭐ (Subbag Anda)' : ''}</span>
            <span class="subbag-amount" style="font-weight: 700; color: ${isCurrent ? meta.color : 'inherit'};">${formatRupiah(amt)} (${pct}%)</span>
          </div>
          <div class="progress-track" style="height: ${isCurrent ? '8px' : '6px'};">
            <div class="progress-bar" style="width: ${pct}%; background-color: ${meta.color};"></div>
          </div>
        </div>
      `;
    }).join('');

    subbagList.innerHTML = subbagHtml;
  }

  // 6. Card 2: Distribusi Sasaran
  const sasaranCardTitle = document.getElementById('dashboard-sasaran-card-title');
  if (sasaranCardTitle) {
    sasaranCardTitle.textContent = isScoped 
      ? `Distribusi Sasaran Belanja Subbag ${selectedSubbag}` 
      : 'Distribusi Alokasi Berdasarkan Sasaran';
  }

  const sasaranBody = document.getElementById('table-sasaran-body');
  if (sasaranBody && activeSummary.bySasaran) {
    const sasaranOrder = ['KAB', 'PPK', 'PPS', 'TPS', 'PANTARLIH', 'PESERTA'];
    sasaranBody.innerHTML = sasaranOrder.map(s => {
      const amt = activeSummary.bySasaran[s] || 0;
      const pct = activeSummary.grandTotal > 0 ? ((amt / activeSummary.grandTotal) * 100).toFixed(2) : '0.00';
      return `
        <tr>
          <td><span class="badge badge-sasaran-${s.toLowerCase()}">${s}</span></td>
          <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">${formatRupiah(amt)}</td>
          <td class="text-right" style="font-family: var(--font-mono);">${pct}%</td>
        </tr>
      `;
    }).join('');
  }

  // 7. Card 3: Distribusi Akun BAS
  const basCardTitle = document.getElementById('dashboard-bas-card-title');
  if (basCardTitle) {
    basCardTitle.textContent = isScoped 
      ? `Distribusi Bagan Akun Standar (BAS Subbag ${selectedSubbag})` 
      : 'Distribusi Anggaran Berdasarkan Bagan Akun Standar (BAS)';
  }

  const akunBody = document.getElementById('table-akun-body');
  if (akunBody && activeSummary.byAkun) {
    const akunsMap = {};
    if (AppState.masters && AppState.masters.akuns) {
      for (const a of AppState.masters.akuns) akunsMap[a.kode] = a.uraian;
    }
    const sortedAkun = Object.entries(activeSummary.byAkun).filter(([_, amt]) => amt > 0).sort((a, b) => a[0].localeCompare(b[0]));
    let totAkun = 0;
    const rowsHtml = sortedAkun.map(([code, amt]) => {
      totAkun += amt;
      const desc = akunsMap[code] || 'Belanja Terkait';
      const pct = activeSummary.grandTotal > 0 ? ((amt / activeSummary.grandTotal) * 100).toFixed(2) : '0.00';
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
        <td colspan="2" style="font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL BAGAN AKUN STANDAR (BAS ${isScoped ? selectedSubbag : 'SATKER'})</td>
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
  const baselinePagu = baselineItem ? (baselineItem.total_pagu || baselineItem.pagu_nphd || 0) : (p.pagu_nphd || 0);

  setElText('siklus-nama-dokumen', p.nama_periode);
  const versiEl = document.getElementById('siklus-versi-revisi');
  if (versiEl) {
    const faseLabel = p.fase_perencanaan || p.tahap_revisi || 'PRA_NPHD';
    versiEl.innerHTML = `<span class="badge badge-primary">${escHtml(p.versi_revisi || '-')}</span> <span class="badge badge-info" style="margin-left:4px;font-size:10.5px;">${escHtml(faseLabel)}</span>`;
  }
  setElText('siklus-dasar-pengesahan', p.dasar_pengesahan || 'Kertas Kerja Penyusunan');
  setElText('siklus-nomor-ba', p.nomor_ba_tapd || '-');
  setElText('siklus-tanggal-ba', p.tanggal_ba_tapd || '-');
  setElText('siklus-catatan', p.catatan_revisi || 'Dokumen Rujukan Induk RKB Pilkada 2024 (Baseline)');

  const buktiLinksBox = document.getElementById('siklus-bukti-links');
  if (buktiLinksBox) {
    const baLink = p.gdrive_link_pleno || p.file_pendukung_path || '';
    const rkbLink = p.rkb_final_link || '';
    const kakLink = p.kak_gabungan_link || '';
    const linksArr = [
      baLink ? `<a href="${escHtml(baLink)}" target="_blank" rel="noopener noreferrer" style="font-size:11.5px; color:#2563eb; text-decoration:none; font-weight:600;">📄 BA Pleno</a>` : '',
      rkbLink ? `<a href="${escHtml(rkbLink)}" target="_blank" rel="noopener noreferrer" style="font-size:11.5px; color:#15803d; text-decoration:none; font-weight:600;">📊 RKB Final</a>` : '',
      kakLink ? `<a href="${escHtml(kakLink)}" target="_blank" rel="noopener noreferrer" style="font-size:11.5px; color:#7c3aed; text-decoration:none; font-weight:600;">📑 KAK Gabungan</a>` : ''
    ].filter(Boolean);
    buktiLinksBox.innerHTML = linksArr.length > 0
      ? linksArr.join(' &nbsp;&bull;&nbsp; ')
      : '<span style="font-size:11px; color:#94a3b8;">Belum ada tautan bukti fisik Google Drive</span>';
  }

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
  const isKasubagRendatin = Boolean(
    user && (
      user.level === 0 ||
      (user.level === 1 && (user.username === 'perencanaan' || user.username === 'kasubbag_rendatin' || user.role_id === 'super_admin' || user.role_id === 'perencanaan'))
    )
  );

  const btnBuatRevisi = document.getElementById('btn-buat-revisi');
  if (btnBuatRevisi) {
    btnBuatRevisi.style.display = (user && user.level === 2) ? 'inline-flex' : 'none';
  }

  if (actionContainer) {
    let buttonsHtml = '';
    if (canManage) {
      if (p.is_locked) {
        if (isKasubagRendatin) {
          buttonsHtml += `
            <button class="btn btn-outline-secondary" onclick="openKoreksiTautanPascaPengesahan(${p.id}, event)">
              🔗 Koreksi Tautan Arsip Pasca-Pengesahan
            </button>
          `;
        }
      } else {
        buttonsHtml += `
          <button class="btn btn-danger" onclick="switchView('view-revisi-tahap4')">
            🔏 Pengesahan BA Pleno (Tahap 4)
          </button>
          <button class="btn btn-outline-secondary" onclick="openEditLegalitasModal(${p.id})">
            ✏️ Ubah Dasar &amp; Legalitas
          </button>
        `;
      }
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
      const faseItem = item.fase_perencanaan || item.tahap_revisi || 'PRA_NPHD';

      const baLink = item.gdrive_link_pleno || item.file_pendukung_path || '';
      const rkbLink = item.rkb_final_link || '';
      const kakLink = item.kak_gabungan_link || '';
      const linksHtml = [
        baLink ? `<a href="${escHtml(baLink)}" target="_blank" rel="noopener noreferrer" style="font-size:10.5px; color:#2563eb; text-decoration:none; font-weight:600;">📄 BA Pleno</a>` : '',
        rkbLink ? `<a href="${escHtml(rkbLink)}" target="_blank" rel="noopener noreferrer" style="font-size:10.5px; color:#15803d; text-decoration:none; font-weight:600;">📊 RKB Final</a>` : '',
        kakLink ? `<a href="${escHtml(kakLink)}" target="_blank" rel="noopener noreferrer" style="font-size:10.5px; color:#7c3aed; text-decoration:none; font-weight:600;">📑 KAK Gabungan</a>` : ''
      ].filter(Boolean).join(' &bull; ');

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
            ${linksHtml ? `<div style="margin-top:4px;" onclick="event.stopPropagation()">${linksHtml}</div>` : ''}
          </td>
          <td>
            <span class="badge badge-primary">${escHtml(item.versi_revisi)}</span>
            <div style="margin-top:3px;"><span class="badge badge-info" style="font-size:9.5px;">${escHtml(faseItem)}</span></div>
          </td>
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
              ${item.is_locked ? '🔒 Terkunci (Sah)' : '🟢 Draft Aktif'}
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
              ${(!item.is_locked && canManage) ? `
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="openEditLegalitasModal(${item.id}, event)" title="Ubah Dasar Pengesahan & Legalitas Dokumen Ini" style="font-size:11px;padding:4px 8px;font-weight:600;">
                  ✏️ Edit Dasar
                </button>
              ` : ''}
              ${(item.is_locked && isKasubagRendatin) ? `
                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="openKoreksiTautanPascaPengesahan(${item.id}, event)" title="Koreksi Tautan Google Drive Pasca-Pengesahan (Khusus Kasubag Rendatin)" style="font-size:11px;padding:4px 8px;font-weight:600;">
                  🔗 Tautan
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
    const data = await apiFetch(`/api/periodes/${id}/legalitas`, {
      method: 'POST',
      body: JSON.stringify({
        nama_periode: nama,
        versi_revisi: versi,
        dasar_pengesahan: dasar,
        nomor_ba_tapd: nomorBa,
        tanggal_ba_tapd: tanggalBa,
        catatan_revisi: catatan
      })
    });

    closeEditLegalitasModal();

    // Reload period list via apiFetch
    const pData = await apiFetch('/api/periodes');
    AppState.periodesList = (pData.periodes || []).filter(p => p.id !== 1000004 && !String(p.nama_periode || '').includes('Revisi 2') && p.versi_revisi !== 'Revisi 2');

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
  if (AppState.activeView === 'view-rkb') {
    const token = generateSaktiRouteToken('view-rkb', checked);
    window.history.replaceState({ viewId: 'view-rkb', revisionViewMode: AppState.revisionViewMode }, '', '/' + token);
  }
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
  if (event && event.target && (event.target.closest('button') || event.target.closest('.pic-chip') || event.target.closest('.akun-badge-inline') || event.target.closest('.l4-lapis-badge'))) {
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

  const curLvlIndent = Number(row.level_indent);
  const curL4Lapis = (curLvlIndent >= 21 && curLvlIndent <= 25) ? (curLvlIndent - 20) : 1;

  const lvlBadges = {
    1: '<span class="badge" style="background:#fef3c7;color:#92400e;font-weight:800;border:1px solid #fde68a;font-size:10.5px;">L1 (Bagian)</span>',
    2: '<span class="badge" style="background:#fed7aa;color:#9a3412;font-weight:800;border:1px solid #fdba74;font-size:10.5px;">L2 (Tahapan)</span>',
    3: '<span class="badge" style="background:#fef08a;color:#854d0e;font-weight:800;border:1px solid #fde047;font-size:10.5px;">L3 (Kegiatan)</span>',
    4: `<span class="badge" style="background:#e0e7ff;color:#3730a3;font-weight:800;border:1px solid #c7d2fe;font-size:10.5px;">L4-${curL4Lapis} (Sub-Komp Lapis ${curL4Lapis})</span>`,
    5: '<span class="badge" style="background:#e0f2fe;color:#0369a1;font-weight:800;border:1px solid #bae6fd;font-size:10.5px;">L5 (Akun BAS)</span>',
    5.5: '<span class="badge" style="background:#ecfdf5;color:#047857;font-weight:800;border:1px solid #a7f3d0;font-size:10.5px;">📑 Header Kelompok (>)</span>',
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
        // L1: Tambah L1 (Setingkat) + Tambah L2 (Sub-Level) + Ubah Teks + Hapus
        btns += `
          <button class="btn btn-outline-primary btn-sm" onclick="openAddHeaderModal(1, ${row.id})" style="font-weight:600;" title="Tambah Bagian baru sejajar dengan baris ini">
            ➕ Tambah Bagian (L1)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddHeaderModal(2, ${row.id})" style="font-weight:700;" title="Tambah Tahapan baru di bawah Bagian ini">
            📂 Tambah Tahapan (L2)
          </button>
          <button class="btn btn-outline-primary btn-sm" onclick="openEditHeaderModal(${row.id}, event)" style="font-weight:600;" title="Ubah Kode atau Uraian Teks">
            ✏️ Ubah Teks
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow(${row.id}, event)" style="font-weight:700;" title="Hapus Bagian ini beserta seluruh level di bawahnya">
            🗑️ Hapus Bagian (L1)
          </button>
        `;
      } else if (treeLvl === 2) {
        // L2: Tambah L2 (Setingkat) + Tambah L3 (Sub-Level) + Ubah Teks + Hapus
        btns += `
          <button class="btn btn-outline-primary btn-sm" onclick="openAddHeaderModal(2, ${row.id})" style="font-weight:600;" title="Tambah Tahapan baru sejajar dengan baris ini">
            ➕ Tambah Tahapan (L2)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddHeaderModal(3, ${row.id})" style="font-weight:700;" title="Tambah Kegiatan baru di bawah Tahapan ini">
            📂 Tambah Kegiatan (L3)
          </button>
          <button class="btn btn-outline-primary btn-sm" onclick="openEditHeaderModal(${row.id}, event)" style="font-weight:600;" title="Ubah Kode atau Uraian Teks">
            ✏️ Ubah Teks
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow(${row.id}, event)" style="font-weight:700;" title="Hapus Tahapan/Kegiatan ini beserta seluruh level di bawahnya">
            🗑️ Hapus Tahapan (L2)
          </button>
        `;
      } else if (treeLvl === 3) {
        // L3: Tambah L3 (Setingkat) + Tambah L4-1 (Sub-Level) + Rekam Akun BAS (L5) + Ubah Teks + Hapus
        btns += `
          <button class="btn btn-outline-primary btn-sm" onclick="openAddHeaderModal(3, ${row.id})" style="font-weight:600;" title="Tambah Kegiatan baru sejajar dengan baris ini">
            ➕ Tambah Kegiatan (L3)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddHeaderModal(4, ${row.id}, 21)" style="font-weight:700;" title="Tambah Sub-Komponen Lapis 1 (L4-1: a., b.) di bawah Kegiatan ini">
            📂 Tambah Sub-Komp (L4-1)
          </button>
          <button class="btn btn-outline-primary btn-sm" onclick="openAddAkunModal(${row.id})" style="font-weight:700;" title="Rekam Akun Belanja (BAS 6-Digit) langsung di bawah Kegiatan ini">
            🏷️ Rekam Akun BAS (L5)
          </button>
          <button class="btn btn-outline-primary btn-sm" onclick="openEditHeaderModal(${row.id}, event)" style="font-weight:600;" title="Ubah Kode atau Uraian Teks">
            ✏️ Ubah Teks
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow(${row.id}, event)" style="font-weight:700;" title="Hapus Kegiatan ini beserta seluruh level di bawahnya">
            🗑️ Hapus Kegiatan (L3)
          </button>
        `;
      } else if (treeLvl === 4) {
        // L4 (Lapis 1..5): Tambah Sejajar (L4-k) + Tambah Turunan Anak (L4-(k+1) s.d. L4-5) + Rekam Akun BAS (L5) + Ubah Teks/Lapis + Hapus
        const effIndent = (curLvlIndent >= 21 && curLvlIndent <= 25) ? curLvlIndent : 21;
        const childLapisBtn = curL4Lapis < 5 ? `
          <button class="btn btn-primary btn-sm" onclick="openAddHeaderModal(4, ${row.id}, ${effIndent + 1})" style="font-weight:700;" title="Tambah Sub-Komponen Turunan Anak (L4-${curL4Lapis + 1}) di bawah baris ini">
            📂 Tambah Turunan (L4-${curL4Lapis + 1})
          </button>
        ` : '';
        btns += `
          <button class="btn btn-outline-primary btn-sm" onclick="openAddHeaderModal(4, ${row.id}, ${effIndent})" style="font-weight:600;" title="Tambah Sub-Komponen baru sejajar pada Lapis L4-${curL4Lapis}">
            ➕ Tambah Sejajar (L4-${curL4Lapis})
          </button>
          ${childLapisBtn}
          <button class="btn btn-success btn-sm" onclick="openAddAkunModal(${row.id})" style="font-weight:700;" title="Rekam Akun Belanja (BAS 6-Digit) di bawah L4-${curL4Lapis} ini">
            🏷️ Rekam Akun BAS (L5)
          </button>
          <button class="btn btn-outline-primary btn-sm" onclick="openEditHeaderModal(${row.id}, event)" style="font-weight:600;" title="Ubah Kode, Uraian Teks, atau Lapis L4-1..L4-5">
            ✏️ Ubah L4-${curL4Lapis}
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow(${row.id}, event)" style="font-weight:700;" title="Hapus Sub-Komponen ini beserta seluruh level di bawahnya">
            🗑️ Hapus
          </button>
        `;
      } else if (treeLvl === 5) {
        // L5 (Akun BAS): Tambah Akun Sejajar (L5) + Tambah Detail Belanja (L6) + Tambah Header Teks + Ubah Akun + Hapus
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
          <button class="btn btn-outline-primary btn-sm" onclick="openQuickAkunModal(${row.id}, event)" style="font-weight:600;" title="Ubah Akun Belanja (BAS)">
            ✏️ Ubah Akun
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow(${row.id}, event)" style="font-weight:700;" title="Hapus Akun Belanja ini beserta seluruh level di bawahnya">
            🗑️ Hapus Akun BAS (L5)
          </button>
        `;
      } else if (treeLvl === 5.5) {
        // L5.5 (Header Kelompok >): Tambah Detail (L6) di bawahnya + Tambah Header Teks Sejajar + Rekam Akun BAS + Ubah Teks + Hapus
        btns += `
          <button class="btn btn-success btn-sm" onclick="openAddRowModalWithParent(${row.id})" style="font-weight:700;" title="Tambah Rincian Belanja di bawah kelompok teks ini">
            ➕ Tambah Detail Belanja (L6)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openAddHeaderModal(5.5, ${row.id})" style="font-weight:700;" title="Tambah Header Kelompok Sejajar (misal: > Konsumsi)">
            📑 Tambah Header Kelompok
          </button>
          <button class="btn btn-outline-primary btn-sm" onclick="openAddAkunModal(${row.id})" style="font-weight:600;" title="Rekam Akun Belanja BAS baru">
            🏷️ Rekam Akun BAS (L5)
          </button>
          <button class="btn btn-outline-primary btn-sm" onclick="openEditHeaderModal(${row.id}, event)" style="font-weight:600;" title="Ubah Kode atau Uraian Teks">
            ✏️ Ubah Teks
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow(${row.id}, event)" style="font-weight:700;" title="Hapus Header Teks ini beserta seluruh level di bawahnya">
            🗑️ Hapus Header Teks
          </button>
        `;
      } else if (treeLvl === 6) {
        // L6: Tambah L6 (Detail Sejajar) + Rekam Akun BAS (L5) + Ubah + Hapus
        btns += `
          <button class="btn btn-success btn-sm" onclick="openAddRowModal()" style="font-weight:700;" title="Tambah Rincian Belanja baru sejajar dengan baris ini">
            ➕ Tambah Detail Sejajar (L6)
          </button>
          <button class="btn btn-outline-primary btn-sm" onclick="openAddAkunModal(${row.id})" style="font-weight:600;" title="Rekam Akun Belanja BAS baru setelah rincian ini">
            🏷️ Rekam Akun BAS (L5)
          </button>
          <button class="btn btn-primary btn-sm" onclick="openRowModal(${row.id}, event)" style="font-weight:600;" title="Ubah Rincian Belanja ini">
            ✏️ Ubah Rincian
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow(${row.id}, event)" style="font-weight:700;" title="Hapus Rincian Belanja ini">
            🗑️ Hapus Rincian
          </button>
        `;
      } else {
        // Fallback Header Lainnya (misal: L0 Program): Ubah Teks + Hapus
        btns += `
          <button class="btn btn-outline-primary btn-sm" onclick="openEditHeaderModal(${row.id}, event)" style="font-weight:600;" title="Ubah Kode atau Uraian Teks">
            ✏️ Ubah Teks
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow(${row.id}, event)" style="font-weight:700;" title="Hapus Baris ini beserta seluruh level di bawahnya">
            🗑️ Hapus Baris
          </button>
        `;
      }
    }
  }

  actBox.innerHTML = btns;
}

function renderRkbTable() {
  if (!AppState.rkbData) return;
  renderRkbWorkflow();
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
          <th class="col-aksi text-center" style="width: 135px; min-width: 130px;">Aksi</th>
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

  // Pre-compute boundary sibling info for Move Up / Move Down buttons (Bab 18.5 Canon)
  const siblingBoundsById = {};
  const siblingBuckets = {};
  for (const r of rows) {
    const pKey = r.parent_tree_id || '__ROOT__';
    const rRank = r.hierarchy_rank || (r.is_header ? 45 : 99);
    const bKey = `${pKey}|${rRank}`;
    if (!siblingBuckets[bKey]) siblingBuckets[bKey] = [];
    siblingBuckets[bKey].push(r.id);
  }
  Object.values(siblingBuckets).forEach(idList => {
    idList.forEach((id, pos) => {
      siblingBoundsById[id] = {
        isFirst: pos === 0,
        isLast: pos === idList.length - 1
      };
    });
  });

  const stagedByRowId = {};
  if (AppState.stagedDiff && Array.isArray(AppState.stagedDiff.changes)) {
    for (const ch of AppState.stagedDiff.changes) {
      if (ch.id) stagedByRowId[ch.id] = ch;
    }
  }

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
    const stagedInfo = stagedByRowId[r.id] || null;
    const stagedBadgeHtml = stagedInfo
      ? (stagedInfo.status === 'BARU'
        ? `<span class="badge" style="background:#fef3c7;color:#92400e;border:1px solid #f59e0b;font-size:9.5px;margin-left:6px;padding:1px 6px;border-radius:4px;font-weight:800;" title="Baris baru di keranjang draf (Belum disimpan ke database)">⏳ DRAF BARU</span>`
        : `<span class="badge" style="background:#fef3c7;color:#92400e;border:1px solid #f59e0b;font-size:9.5px;margin-left:6px;padding:1px 6px;border-radius:4px;font-weight:800;" title="Perubahan belum disimpan ke database (${escHtml(stagedInfo.detail || '')})">⏳ DRAF DIUBAH</span>`)
      : '';

    const toggleChevron = r.has_children
      ? `<button type="button" class="tree-toggle-btn" onclick="toggleTreeNode('${r.tree_id}', event)" title="${isExpanded ? 'Lipat baris ini' : 'Buka cabang ini'}">${isExpanded ? '▾' : '▸'}</button>`
      : `<span style="display:inline-block;width:24px;"></span>`;

    const pic = (r.pic_bagian || 'KUL').toUpperCase();
    const picChip = `<span class="pic-chip pic-${pic}" onclick="openQuickPicModal(${r.id}, event)" title="Klik untuk mengubah Subbagian PIC baris ini">${pic}</span>`;
    const showPic = lvl >= 2 || isItem;

    const targetSas = (r.effective_target_scope || r.target_scope || (r.is_header ? 'NONE' : 'KAB')).toUpperCase();
    const sasChip = (r.is_header && (targetSas === 'NONE' || targetSas === 'ALL'))
      ? `<span onclick="openQuickSasaranModal(${r.id}, event)" style="cursor:pointer;font-size:11px;color:#94a3b8;padding:1px 7px;border:1px dashed #cbd5e1;border-radius:4px;display:inline-block;" title="Multi-Sasaran / Mengikuti rincian di bawahnya. Klik untuk mengatur Sasaran">-</span>`
      : `<span class="scope-chip scope-${targetSas}" onclick="openQuickSasaranModal(${r.id}, event)" style="cursor:pointer;" title="Klik untuk mengubah atau menghapus Sasaran Anggaran (Mendukung Top-Down Cascade)">${targetSas}</span>`;
    const showSas = lvl >= 2 || isItem;

    const isProv = (r.cost_sharing || 'KABUPATEN').toUpperCase() === 'PROVINSI';
    const costChip = isProv
      ? `<span class="badge-cost-prov" onclick="openQuickCostSharingModal(${r.id}, event)" style="cursor:pointer;background:#0284c7;color:#ffffff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:6px;display:inline-block;letter-spacing:0.3px;vertical-align:middle;box-shadow:0 1px 2px rgba(2,132,199,0.25);" title="Sumber Dana: APBD Provinsi (Sharing Jatim). Klik untuk mengubah/mengosongkan">PROV</span>`
      : '';

    const canEdit = checkCanEditRow(user, r, isLocked);

    const rawKode = String(r.kode || '').trim();
    const rawUraian = String(r.uraian || '').trim();
    const isTopLvlKode = r.is_header && (lvl === 0 || lvl === 1 || lvl === 2);
    const kodeColPad = lvl === 0 ? '6px' : (lvl === 1 ? '20px' : '34px');
    const kodeColColor = lvl === 1 ? '#1e3a8a' : '#0f172a';
    const kodeCellDisplay = isTopLvlKode ? escHtml(rawKode) : '';

    const showInlineKode = r.is_header && !isTopLvlKode && !r.is_akun_row && rawKode && rawKode !== '-' && !rawUraian.startsWith(rawKode);
    const inlineKodeHtml = showInlineKode
      ? `<span style="font-family:var(--font-mono);font-weight:800;margin-right:3px;">${escHtml(rawKode)}</span>`
      : '';

    const effRank = Number(r.hierarchy_rank || (r.is_header ? (lvl === 0 ? 10 : (lvl === 1 ? 20 : (lvl === 2 ? 30 : (lvl === 3 ? 50 : 41)))) : 99));
    let effLvlKey = 'L6';
    if (!r.is_header || effRank >= 99) effLvlKey = 'L6';
    else if (effRank === 10) effLvlKey = 'L1';
    else if (effRank === 20) effLvlKey = 'L2';
    else if (effRank === 30) effLvlKey = 'L3';
    else if (effRank === 41) effLvlKey = 'L4-1';
    else if (effRank > 41 && effRank <= 42.5) effLvlKey = 'L4-2';
    else if (effRank === 43) effLvlKey = 'L4-3';
    else if (effRank === 44) effLvlKey = 'L4-4';
    else if (effRank >= 45 && effRank < 50) effLvlKey = 'L4-5';
    else if (effRank === 50) effLvlKey = 'L5';
    else effLvlKey = 'L6-H';

    const levelStyleCatalog = {
      'L1':   { text: 'font-weight:800;color:#0f172a;font-size:13.5px;text-transform:uppercase;', badge: 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;', click: 'header' },
      'L2':   { text: 'font-weight:800;color:#1e3a8a;font-size:13.2px;', badge: 'background:#fed7aa;color:#9a3412;border:1px solid #fdba74;', click: 'header' },
      'L3':   { text: 'font-weight:700;color:#0f172a;font-size:13px;', badge: 'background:#fef08a;color:#854d0e;border:1px solid #fde047;', click: 'header' },
      'L4-1': { text: 'font-weight:700;color:#1e3a8a;font-size:13px;', badge: 'background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;', click: 'header' },
      'L4-2': { text: 'font-weight:600;color:#0f766e;font-size:12.6px;', badge: 'background:#ccfbf1;color:#115e59;border:1px solid #5eead4;', click: 'header' },
      'L4-3': { text: 'font-weight:600;color:#4338ca;font-size:12.4px;', badge: 'background:#e0e7ff;color:#3730a3;border:1px solid #a5b4fc;', click: 'header' },
      'L4-4': { text: 'font-weight:500;color:#b45309;font-size:12.2px;', badge: 'background:#fef3c7;color:#92400e;border:1px solid #fcd34d;', click: 'header' },
      'L4-5': { text: 'font-weight:500;font-style:italic;color:#334155;font-size:12px;', badge: 'background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;', click: 'header' },
      'L5':   { text: 'font-weight:700;color:#1e40af;font-size:12.6px;text-decoration:underline;', badge: 'background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;', click: 'akun' },
      'L6-H': { text: 'font-weight:600;font-style:italic;color:#0369a1;font-size:12.3px;', badge: 'background:#ecfdf5;color:#047857;border:1px solid #6ee7b7;', click: 'header' },
      'L6':   { text: 'font-weight:400;color:#0f172a;font-size:12.5px;', badge: 'background:#f8fafc;color:#64748b;border:1px solid #cbd5e1;', click: 'header' }
    };

    const st = levelStyleCatalog[effLvlKey] || levelStyleCatalog['L6'];
    const uraianTextStyle = st.text;
    let l4BadgeHtml = '';
    if (canEdit && !isLocked) {
      const badgeAction = st.click === 'akun' ? `openQuickAkunModal(${r.id}, event)` : `openEditHeaderModal(${r.id}, event)`;
      const badgeTitle = st.click === 'akun'
        ? `Penanda Level [${effLvlKey}]. Klik untuk mengubah Akun Belanja BAS`
        : `Penanda Level [${effLvlKey}]. Klik untuk mengubah/menyamakan Level Hierarki, Kode, atau Uraian baris ini`;
      l4BadgeHtml = `<span class="l4-lapis-badge" onclick="${badgeAction}" style="${st.badge}font-family:var(--font-mono);font-size:9.5px;font-weight:800;padding:1px 5px;border-radius:4px;cursor:pointer;margin-left:4px;white-space:nowrap;" title="${badgeTitle}">${effLvlKey}</span>`;
    } else {
      l4BadgeHtml = `<span style="${st.badge}font-family:var(--font-mono);font-size:9.5px;font-weight:800;padding:1px 5px;border-radius:4px;margin-left:4px;white-space:nowrap;" title="Penanda Level [${effLvlKey}]">${effLvlKey}</span>`;
    }

    if (isSanding) {

      let badgeClass = 'diff-tetap';
      let badgeLabel = '⚪ Tetap';
      if (diffInfo.status === 'BERTAMBAH') { badgeClass = 'diff-bertambah'; badgeLabel = '🟢 Bertambah'; }
      else if (diffInfo.status === 'BERKURANG') { badgeClass = 'diff-berkurang'; badgeLabel = '🔴 Berkurang'; }
      else if (diffInfo.status === 'BARU') { badgeClass = 'diff-baru'; badgeLabel = '✨ Baru'; }

      rowsHtml += `
        <tr id="row-${r.id}" class="${r.is_header ? 'rkb-row-lvl-' + lvl : ''} ${isSelected ? 'table-row-selected' : ''}" onclick="selectRow(${r.id}, event)">
          <td class="col-no text-center" style="font-family: var(--font-mono); font-size: 11px;">${r.urutan || (idx + 1)}</td>
          <td class="col-kode" style="font-family: var(--font-mono); font-weight: 800; text-align: left; padding-left: ${kodeColPad}; color: ${kodeColColor};">${kodeCellDisplay}</td>
          <td class="col-uraian" style="padding-left: ${r.effective_indent || 0}px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              ${toggleChevron}
              ${r.is_akun_row ? `<span class="akun-badge-inline" onclick="openQuickAkunModal(${r.id}, event)">[${r.kode_akun || r.kode || '521211'}]</span>` : ''}
              <span style="${uraianTextStyle}">${inlineKodeHtml}${escHtml(r.uraian || '')}</span>
              ${l4BadgeHtml}
              ${costChip}
              ${isNewlyAdded ? `<span class="badge badge-purple" style="font-size:10px;margin-left:6px;padding:1px 6px;border-radius:4px;font-weight:600;" title="Baris belanja baru / tambahan">✨ BARU</span>` : ''}
              ${stagedBadgeHtml}
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
      if (canEdit && !isLocked) {
        const editFn = isItem
          ? `openRowModal(${r.id}, event)`
          : (r.is_akun_row ? `openQuickAkunModal(${r.id}, event)` : `openEditHeaderModal(${r.id}, event)`);
        const editTitle = isItem
          ? 'Edit Rincian Belanja'
          : (r.is_akun_row ? 'Ubah Akun Belanja (BAS)' : 'Ubah Level Hierarki / Kode / Teks Header ini');
        const delTitle = isItem
          ? 'Hapus Baris Rincian Belanja ini'
          : `Hapus [${r.kode || '-'}] ${escHtml(r.uraian || '')} (beserta seluruh level di bawahnya)`;
        const bounds = siblingBoundsById[r.id] || { isFirst: false, isLast: false };
        const disableUp = bounds.isFirst ? 'disabled style="font-size:10px;padding:2px 5px;line-height:1;border-radius:3px;font-weight:700;opacity:0.35;cursor:not-allowed;"' : 'style="font-size:10px;padding:2px 5px;line-height:1;border-radius:3px;font-weight:700;"';
        const disableDown = bounds.isLast ? 'disabled style="font-size:10px;padding:2px 5px;line-height:1;border-radius:3px;font-weight:700;opacity:0.35;cursor:not-allowed;"' : 'style="font-size:10px;padding:2px 5px;line-height:1;border-radius:3px;font-weight:700;"';

        const isShiftableRow = r.is_header && ((lvl >= 21 && lvl <= 25) || lvl === 41 || lvl === 42);
        const effL4Num = effLvlKey === 'L4-1' ? 21 : (effLvlKey === 'L4-2' ? 22 : (effLvlKey === 'L4-3' ? 23 : (effLvlKey === 'L4-4' ? 24 : (effLvlKey === 'L4-5' ? 25 : 25))));
        const disableOutdent = effL4Num <= 21 && effLvlKey !== 'L6-H' ? 'disabled style="font-size:10px;padding:2px 4px;line-height:1;border-radius:3px;font-weight:700;opacity:0.3;cursor:not-allowed;"' : 'style="font-size:10px;padding:2px 4px;line-height:1;border-radius:3px;font-weight:700;color:#0f766e;"';
        const disableIndent = effL4Num >= 25 && effLvlKey !== 'L6-H' ? 'disabled style="font-size:10px;padding:2px 4px;line-height:1;border-radius:3px;font-weight:700;opacity:0.3;cursor:not-allowed;"' : 'style="font-size:10px;padding:2px 4px;line-height:1;border-radius:3px;font-weight:700;color:#0f766e;"';
        const l4ShiftButtons = isShiftableRow ? `
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="shiftHeaderLevel(${r.id}, -1, event)" title="Majukan ke kiri 1 lapis (Outdent)" ${disableOutdent}>◀</button>
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="shiftHeaderLevel(${r.id}, 1, event)" title="Jorokkan ke dalam 1 lapis (Indent)" ${disableIndent}>▶</button>
        ` : '';

        aksiHtml = `
          <div style="display:inline-flex;align-items:center;gap:2px;white-space:nowrap;">
            ${l4ShiftButtons}
            <button type="button" class="btn btn-xs btn-outline-secondary" onclick="moveRowOrdering(${r.id}, 'UP', event)" title="${bounds.isFirst ? 'Sudah berada di urutan paling atas grup induknya' : 'Geser Naik (1 posisi dalam grup induk)'}" ${disableUp}>
              ▲
            </button>
            <button type="button" class="btn btn-xs btn-outline-secondary" onclick="moveRowOrdering(${r.id}, 'DOWN', event)" title="${bounds.isLast ? 'Sudah berada di urutan paling bawah grup induknya' : 'Geser Turun (1 posisi dalam grup induk)'}" ${disableDown}>
              ▼
            </button>
            <button type="button" class="btn btn-xs btn-outline-info" onclick="openQuickCostSharingModal(${r.id}, event)" title="Atur Sumber Dana Belanja (APBD Kabupaten / Provinsi)" style="font-size:10px;padding:2px 4px;line-height:1;border-radius:3px;font-weight:700;color:#0284c7;border-color:#bae6fd;">
              🏛️
            </button>
            <button type="button" class="btn btn-xs btn-primary" onclick="${editFn}" title="${editTitle}" style="font-size:10px;padding:2px 5px;line-height:1;border-radius:3px;font-weight:700;margin-left:2px;">
              ✏️
            </button>
            <button type="button" class="btn btn-xs btn-outline-danger" onclick="deleteRow(${r.id}, event)" title="${delTitle}" style="font-size:10px;padding:2px 5px;line-height:1;border-radius:3px;font-weight:700;">
              🗑️
            </button>
          </div>
        `;
      } else {
        aksiHtml = `<span class="text-muted" style="font-size: 11px;">🔒 Read-Only</span>`;
      }

      rowsHtml += `
        <tr id="row-${r.id}" class="${r.is_header ? 'rkb-row-lvl-' + lvl : ''} ${isSelected ? 'table-row-selected' : ''}" onclick="selectRow(${r.id}, event)">
          <td class="col-no text-center" style="font-family: var(--font-mono); font-size: 11px;">${r.urutan || (idx + 1)}</td>
          <td class="col-kode" style="font-family: var(--font-mono); font-weight: 800; text-align: left; padding-left: ${kodeColPad}; color: ${kodeColColor};">${kodeCellDisplay}</td>
          <td class="col-uraian" style="padding-left: ${r.effective_indent || 0}px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              ${toggleChevron}
              ${r.is_akun_row ? `<span class="akun-badge-inline" onclick="openQuickAkunModal(${r.id}, event)" title="Klik untuk mengubah Akun Belanja ini">[${r.kode_akun || r.kode || '521211'}]</span>` : ''}
              <span style="${uraianTextStyle}">${inlineKodeHtml}${escHtml(r.uraian || '')}</span>
              ${l4BadgeHtml}
              ${costChip}
              ${isNewlyAdded ? `<span class="badge badge-purple" style="font-size:10px;margin-left:6px;padding:1px 6px;border-radius:4px;font-weight:600;" title="Baris belanja baru / tambahan">✨ BARU</span>` : ''}
              ${stagedBadgeHtml}
            </div>
            ${isItem && r.catatan_revisi_baris ? `<div style="font-size:11px;color:#1e40af;background:#eff6ff;border-left:2px solid #3b82f6;padding:2px 6px;margin:3px 0 0 28px;border-radius:2px;display:inline-block;"><span style="font-weight:600;">Catatan:</span> ${escHtml(r.catatan_revisi_baris)}</div>` : ''}
          </td>
          <td class="col-pic">${showPic ? picChip : ''}</td>
          <td class="col-sasaran">${showSas ? sasChip : ''}</td>
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
    if (Number(user.level) === 0) return true; // Developer bypass
    return false;
  }
  if (Number(user.level) === 0 || Number(user.level) === 1) return true;
  if (Number(user.level) === 3 || user.mode_akses === 'VIEWER') return false;
  if (Number(user.level) === 2) {
    if (user.mode_akses && user.mode_akses !== 'EDITOR') return false;
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
  const user = AppState.currentUser;
  if (user && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
    AppState.filters.pic = user.pic_subbag;
  } else {
    AppState.filters.pic = document.getElementById('filter-pic')?.value || 'SEMUA';
  }
  AppState.filters.sasaran = document.getElementById('filter-sasaran')?.value || 'ALL';
  AppState.filters.cost_sharing = document.getElementById('filter-cost-sharing')?.value || 'ALL';
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
  const total = Number(summary.grandTotal) || 0;

  const kecCount = (AppState.masters?.kecamatans || []).length || 19;
  const desas = AppState.masters?.desas || [];
  const desaCount = desas.length || 217;
  const tpsCount = desas.reduce((acc, d) => acc + Math.round(Number(d.tps) || 0), 0) || 1393;
  const pantarlihCount = desas.reduce((acc, d) => acc + Math.round(Number(d.pantarlih) || 0), 0) || 2784;
  const kMap = {};
  (AppState.masters?.kuantitas || []).forEach(k => { kMap[String(k.kode || '').toLowerCase()] = Number(k.nilai); });
  const kppsOrgPerTps = (Number.isFinite(kMap.kpps_ketua_tps) ? kMap.kpps_ketua_tps : 1) + (Number.isFinite(kMap.kpps_anggota_tps) ? kMap.kpps_anggota_tps : 6);
  const linmasOrgPerTps = Number.isFinite(kMap.linmas_per_tps) ? kMap.linmas_per_tps : 2;

  const dataSasaran = [
    { title: '🏢 1. KPU Kabupaten', scope: 'KAB', entitas: 'Satker KPU Kab. Ngawi', val: sas.KAB || 0, desc: 'Operasional satker, logistik sentral, bimtek, sosialisasi, advokasi hukum' },
    { title: `🏛️ 2. PPK (${formatNumber(kecCount)} Kecamatan)`, scope: 'PPK', entitas: `${formatNumber(kecCount)} Kecamatan`, val: sas.PPK || 0, desc: `Operasional sekretariat PPK, honorarium PPK & sekretariat ${formatNumber(kecCount)} kecamatan` },
    { title: `🏘️ 3. PPS Murni (${formatNumber(desaCount)} Desa)`, scope: 'PPS', entitas: `${formatNumber(desaCount)} Desa / Kelurahan`, val: sas.PPS || 0, desc: `Operasional sekretariat PPS, honorarium PPS & sekretariat ${formatNumber(desaCount)} desa` },
    { title: '📋 4. Pantarlih / PPDP', scope: 'PANTARLIH', entitas: `${formatNumber(pantarlihCount)} Petugas`, val: sas.PANTARLIH || 0, desc: 'Honorarium petugas pemutakhiran data pemilih (di bawah koordinasi PPS)' },
    { title: '🗳️ 5. TPS (KPPS + Linmas)', scope: 'TPS', entitas: `${formatNumber(tpsCount)} TPS`, val: sas.TPS || 0, desc: `Honorarium KPPS (${kppsOrgPerTps} org) dan Linmas (${linmasOrgPerTps} org) per TPS se-Kabupaten Ngawi` },
    { title: '🎯 6. Peserta Pemilihan', scope: 'PESERTA', entitas: 'Paslon & Parpol', val: sas.PESERTA || 0, desc: 'Bahan kampanye, alat peraga kampanye (APK), fasilitasi debat paslon, audit KAP' }
  ];

  const totalPenyelenggara = (sas.KAB || 0) + (sas.PPK || 0) + (sas.PPS || 0) + (sas.PANTARLIH || 0) + (sas.TPS || 0);
  const pctPenyelenggara = total > 0 ? ((totalPenyelenggara / total) * 100).toFixed(2) : '0.00';

  const tbody = document.getElementById('resume-sasaran-tbody');
  if (tbody) {
    let rowsHtml = dataSasaran.map(d => {
      const pct = total > 0 ? ((d.val / total) * 100).toFixed(2) : '0.00';
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

  try {
    await stageRkbOperation({
      type: 'QUICK_PIC',
      row_id: rowId,
      pic_bagian: pic,
      cascade
    }, `Perubahan PIC menjadi ${pic} masuk ke draf kerja.`);
    closeQuickPicModal();
  } catch (err) {
    showToast('Gagal mengubah PIC: ' + err.message, 'error');
  }
}

function openQuickSasaranModal(rowId, event) {
  if (event) event.stopPropagation();
  const row = (AppState.rkbData?.rows || []).find(r => r.id === rowId);
  if (!row) return;

  const isHeader = Boolean(row.is_header);
  const optNone = document.getElementById('quick-sasaran-opt-none');
  const btnClear = document.getElementById('btn-clear-sasaran-header');
  if (optNone) optNone.style.display = isHeader ? 'block' : 'none';
  if (btnClear) btnClear.style.display = isHeader ? 'inline-flex' : 'none';

  setElVal('quick-sasaran-row-id', row.id);
  const curSas = (row.effective_target_scope || row.target_scope || (isHeader ? 'NONE' : 'KAB')).toUpperCase();
  setElVal('quick-sasaran-select', (curSas === 'ALL' || curSas === 'NONE') ? (isHeader ? 'NONE' : 'KAB') : curSas);

  const lvl = Number(row.level_indent);
  const uraianEl = document.getElementById('quick-sasaran-uraian');
  const badgeEl = document.getElementById('quick-sasaran-level-badge');
  const cascadeBox = document.getElementById('quick-sasaran-cascade-box');
  const itemHint = document.getElementById('quick-sasaran-item-hint');
  const cascadeDesc = document.getElementById('quick-sasaran-cascade-desc');
  const cascadeCheck = document.getElementById('quick-sasaran-cascade');

  let lvlName = 'Rincian Belanja (Item Level 6)';
  if (lvl === 2) lvlName = 'Kegiatan (Level 3)';
  else if (lvl >= 21 && lvl <= 25) lvlName = `Sub-Kegiatan (Level 4 — L4-${lvl - 20})`;
  else if (lvl === 3) lvlName = 'Akun Belanja 6-Digit BAS (Level 5)';
  else if (lvl === 41 || lvl === 42) lvlName = 'Header Kelompok (Level 6 Header)';

  if (badgeEl) {
    badgeEl.innerHTML = `<span class="badge ${isHeader ? 'badge-primary' : 'badge-subtle'}" style="font-size:11px; padding:3px 8px;">${lvlName}</span>`;
  }
  if (uraianEl) {
    uraianEl.innerHTML = `<strong>${escHtml(row.kode ? `[${row.kode}] ` : '')}${escHtml(row.uraian)}</strong>`;
  }

  if (isHeader) {
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
    const isClearing = document.getElementById('quick-sasaran-select')?.value === 'NONE';
    if (cascadeCheck) {
      cascadeCheck.checked = !isClearing;
      cascadeCheck.disabled = isClearing;
    }
    if (cascadeDesc) {
      cascadeDesc.textContent = isClearing
        ? 'Hanya menghapus/mengosongkan label Sasaran pada baris Header ini (tidak mengubah rincian belanja di bawahnya).'
        : `Akan memperbarui ${childCount} baris turunan di bawah induk ini secara serentak.`;
    }
  } else {
    if (cascadeBox) cascadeBox.style.display = 'none';
    if (itemHint) itemHint.style.display = 'block';
    if (cascadeCheck) {
      cascadeCheck.checked = false;
      cascadeCheck.disabled = false;
    }
  }

  document.getElementById('modal-quick-sasaran').style.display = 'flex';
}

function onQuickSasaranSelectChange() {
  const val = document.getElementById('quick-sasaran-select')?.value;
  const cascadeCheck = document.getElementById('quick-sasaran-cascade');
  const cascadeDesc = document.getElementById('quick-sasaran-cascade-desc');
  if (val === 'NONE') {
    if (cascadeCheck) {
      cascadeCheck.checked = false;
      cascadeCheck.disabled = true;
    }
    if (cascadeDesc) {
      cascadeDesc.textContent = 'Hanya menghapus/mengosongkan label Sasaran pada baris Header ini (tidak mengubah rincian belanja di bawahnya).';
    }
  } else {
    if (cascadeCheck) {
      cascadeCheck.disabled = false;
      cascadeCheck.checked = true;
    }
    if (cascadeDesc) {
      cascadeDesc.textContent = 'Seluruh anak baris di bawah induk ini akan otomatis mengikuti Sasaran baru.';
    }
  }
}

async function clearHeaderSasaran() {
  const rowId = Number(document.getElementById('quick-sasaran-row-id')?.value);
  if (!rowId) return;
  try {
    await stageRkbOperation({
      type: 'QUICK_SASARAN',
      row_id: rowId,
      target_scope: 'NONE',
      cascade: false
    }, 'Label Sasaran pada baris Header berhasil dihapus/dikosongkan.');
    closeQuickSasaranModal();
  } catch (err) {
    showToast('Gagal menghapus Sasaran Header: ' + err.message, 'error');
  }
}

function closeQuickSasaranModal() {
  const m = document.getElementById('modal-quick-sasaran');
  if (m) m.style.display = 'none';
}

async function submitQuickSasaran() {
  const rowId = Number(document.getElementById('quick-sasaran-row-id')?.value);
  const sasaran = document.getElementById('quick-sasaran-select')?.value;
  const isClearing = sasaran === 'NONE';
  const cascade = isClearing ? false : Boolean(document.getElementById('quick-sasaran-cascade')?.checked);

  try {
    await stageRkbOperation({
      type: 'QUICK_SASARAN',
      row_id: rowId,
      target_scope: sasaran,
      cascade
    }, isClearing ? 'Label Sasaran pada baris Header dikosongkan.' : `Perubahan Sasaran menjadi ${sasaran} masuk ke draf kerja.`);
    closeQuickSasaranModal();
  } catch (err) {
    showToast('Gagal mengubah Sasaran: ' + err.message, 'error');
  }
}
window.onQuickSasaranSelectChange = onQuickSasaranSelectChange;
window.clearHeaderSasaran = clearHeaderSasaran;

// ============================================================================
// QUICK COST SHARING (SUMBER DANA APBD KAB VS PROV)
// ============================================================================

function openQuickCostSharingModal(rowId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const row = (AppState.rkbData?.rows || []).find(r => r.id === rowId);
  if (!row) return;

  const isHeader = Boolean(row.is_header);
  document.getElementById('quick-cost-sharing-row-id').value = row.id;

  const effRank = Number(row.hierarchy_rank || (row.is_header ? (row.level_indent === 0 ? 10 : (row.level_indent === 1 ? 20 : (row.level_indent === 2 ? 30 : 41))) : 99));
  let lvlLabel = isHeader ? `HEADER L${effRank < 20 ? 1 : (effRank < 30 ? 2 : (effRank < 40 ? 3 : (effRank < 50 ? 4 : 5)))}` : 'RINCIAN BELANJA (L6)';
  document.getElementById('quick-cost-sharing-level-badge').innerHTML = `<span class="badge" style="background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;font-weight:700;font-size:11px;padding:2px 8px;border-radius:4px;">${lvlLabel}</span>`;

  document.getElementById('quick-cost-sharing-uraian').textContent = `[${row.kode || '-'}] ${row.uraian || ''}`;

  const curCost = (row.cost_sharing || 'KABUPATEN').toUpperCase();
  const radKab = document.querySelector('input[name="quick-cost-sharing-choice"][value="KABUPATEN"]');
  const radProv = document.querySelector('input[name="quick-cost-sharing-choice"][value="PROVINSI"]');
  if (curCost === 'PROVINSI') {
    if (radProv) radProv.checked = true;
  } else {
    if (radKab) radKab.checked = true;
  }
  onQuickCostSharingChoiceChange();

  const cascadeBox = document.getElementById('quick-cost-sharing-cascade-box');
  const itemHint = document.getElementById('quick-cost-sharing-item-hint');
  const btnClear = document.getElementById('btn-clear-cost-sharing-header');

  if (isHeader) {
    if (cascadeBox) cascadeBox.style.display = 'block';
    if (itemHint) itemHint.style.display = 'none';
    if (btnClear) btnClear.style.display = 'inline-flex';
    const cascadeCheck = document.getElementById('quick-cost-sharing-cascade');
    if (cascadeCheck) {
      cascadeCheck.checked = true;
      cascadeCheck.disabled = false;
    }
  } else {
    if (cascadeBox) cascadeBox.style.display = 'none';
    if (itemHint) itemHint.style.display = 'block';
    if (btnClear) btnClear.style.display = 'none';
  }

  document.getElementById('modal-quick-cost-sharing').style.display = 'flex';
}

function closeQuickCostSharingModal() {
  const m = document.getElementById('modal-quick-cost-sharing');
  if (m) m.style.display = 'none';
}

function onQuickCostSharingChoiceChange() {
  const choice = document.querySelector('input[name="quick-cost-sharing-choice"]:checked')?.value || 'KABUPATEN';
  const labelKab = document.getElementById('label-choice-kab');
  const labelProv = document.getElementById('label-choice-prov');
  if (choice === 'PROVINSI') {
    if (labelProv) { labelProv.style.background = '#e0f2fe'; labelProv.style.borderColor = '#0284c7'; }
    if (labelKab) { labelKab.style.background = '#f8fafc'; labelKab.style.borderColor = '#cbd5e1'; }
  } else {
    if (labelKab) { labelKab.style.background = '#f0fdf4'; labelKab.style.borderColor = '#86efac'; }
    if (labelProv) { labelProv.style.background = '#f8fafc'; labelProv.style.borderColor = '#cbd5e1'; }
  }
}

async function clearHeaderCostSharing() {
  const rowId = Number(document.getElementById('quick-cost-sharing-row-id')?.value);
  if (!rowId) return;
  const isHeader = Boolean(document.getElementById('quick-cost-sharing-cascade-box')?.style.display !== 'none');
  const cascade = isHeader ? Boolean(document.getElementById('quick-cost-sharing-cascade')?.checked) : false;
  try {
    await stageRkbOperation({
      type: 'QUICK_COST_SHARING',
      row_id: rowId,
      cost_sharing: 'KABUPATEN',
      cascade
    }, 'Sumber dana baris dikembalikan ke APBD Kabupaten (Default).');
    closeQuickCostSharingModal();
  } catch (err) {
    showToast('Gagal mereset sumber dana: ' + err.message, 'error');
  }
}

async function submitQuickCostSharing() {
  const rowId = Number(document.getElementById('quick-cost-sharing-row-id')?.value);
  if (!rowId) return;
  const choice = document.querySelector('input[name="quick-cost-sharing-choice"]:checked')?.value || 'KABUPATEN';
  const isHeader = Boolean(document.getElementById('quick-cost-sharing-cascade-box')?.style.display !== 'none');
  const cascade = isHeader ? Boolean(document.getElementById('quick-cost-sharing-cascade')?.checked) : false;

  try {
    await stageRkbOperation({
      type: 'QUICK_COST_SHARING',
      row_id: rowId,
      cost_sharing: choice,
      cascade
    }, `Sumber dana berhasil diatur ke ${choice === 'PROVINSI' ? 'APBD Provinsi' : 'APBD Kabupaten'}.`);
    closeQuickCostSharingModal();
  } catch (err) {
    showToast('Gagal mengubah sumber dana: ' + err.message, 'error');
  }
}

window.openQuickCostSharingModal = openQuickCostSharingModal;
window.closeQuickCostSharingModal = closeQuickCostSharingModal;
window.onQuickCostSharingChoiceChange = onQuickCostSharingChoiceChange;
window.clearHeaderCostSharing = clearHeaderCostSharing;
window.submitQuickCostSharing = submitQuickCostSharing;

async function openAuditIntegritasModal() {
  const periodeId = AppState.currentPeriode?.id || 1;
  const modal = document.getElementById('modal-audit-integritas');
  const tbody = document.getElementById('audit-integritas-tbody');
  if (modal) modal.style.display = 'flex';
  if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 24px;">⏳ Sedang memeriksa integritas data RKB...</td></tr>`;

  try {
    const res = await apiFetch(`/api/rkb/${periodeId}/audit-integritas`);
    AppState.lastAuditReport = res.report || { summary: { kritis: 0, peringatan: 0, valid: 0 }, findings: [] };
    renderAuditIntegritasRows();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger" style="padding: 20px;">Gagal memuat laporan audit: ${escHtml(err.message)}</td></tr>`;
    }
  }
}

function closeAuditIntegritasModal() {
  const modal = document.getElementById('modal-audit-integritas');
  if (modal) modal.style.display = 'none';
}

function renderAuditIntegritasRows() {
  const report = AppState.lastAuditReport || { summary: { kritis: 0, peringatan: 0, valid: 0 }, findings: [] };
  const sum = report.summary || { kritis: 0, peringatan: 0, valid: 0 };
  setElText('audit-badge-kritis', `🔴 Kritis: ${sum.kritis || 0}`);
  setElText('audit-badge-peringatan', `🟡 Peringatan: ${sum.peringatan || 0}`);
  setElText('audit-badge-valid', `🟢 Baris Valid: ${sum.valid || 0} / ${sum.total_checked || 0}`);

  const filterVal = document.getElementById('audit-integritas-filter')?.value || 'ALL';
  let findings = report.findings || [];
  if (filterVal !== 'ALL') {
    findings = findings.filter(f => f.tingkat === filterVal);
  }

  const tbody = document.getElementById('audit-integritas-tbody');
  if (!tbody) return;

  if (findings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 28px; color: #15803d; font-weight: 700;">
          ✅ Tidak ditemukan masalah pada kategori filter ini. Seluruh struktur &amp; perhitungan sudah selaras!
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = findings.map(f => {
    const badge = f.tingkat === 'KRITIS'
      ? '<span class="badge badge-danger" style="font-size:10.5px;">🔴 Kritis</span>'
      : '<span class="badge badge-warning" style="font-size:10.5px;">🟡 Peringatan</span>';
    return `
      <tr onclick="jumpToAuditedRow(${f.row_id})" style="cursor:pointer;" title="Klik untuk menyorot baris ini di tabel RUH Belanja">
        <td class="text-center">${badge}</td>
        <td style="font-weight: 600; color: #1e293b;">${escHtml(f.lokasi_baris)}</td>
        <td><strong>${escHtml(f.jenis_masalah)}</strong></td>
        <td style="font-family: var(--font-mono); color: #b91c1c;">${escHtml(f.nilai_ditemukan)}</td>
        <td style="font-family: var(--font-mono); color: #0369a1;">${escHtml(f.acuan_seharusnya)}</td>
        <td style="font-size: 11.5px; color: #334155;">${escHtml(f.panduan_perbaikan)}</td>
      </tr>
    `;
  }).join('');
}

function jumpToAuditedRow(rowId) {
  closeAuditIntegritasModal();
  if (!rowId) return;
  expandAncestorsOfRow(Number(rowId));
  AppState.selectedRowId = Number(rowId);
  renderRkbTable();
  setTimeout(() => {
    highlightAndScrollToRow(Number(rowId));
  }, 150);
}
window.openQuickSasaranModal = openQuickSasaranModal;
window.closeQuickSasaranModal = closeQuickSasaranModal;
window.submitQuickSasaran = submitQuickSasaran;
window.openAuditIntegritasModal = openAuditIntegritasModal;
window.closeAuditIntegritasModal = closeAuditIntegritasModal;
window.renderAuditIntegritasRows = renderAuditIntegritasRows;
window.jumpToAuditedRow = jumpToAuditedRow;

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

  try {
    await stageRkbOperation({
      type: 'QUICK_AKUN',
      row_id: rowId,
      kode_akun: akun
    }, `Perubahan Kode Akun [${akun}] masuk ke draf kerja.`);
    closeQuickAkunModal();
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

  try {
    await stageRkbOperation({
      type: 'QUICK_CATATAN',
      row_id: rowId,
      catatan_revisi_baris: catatan
    }, 'Catatan justifikasi revisi masuk ke draf kerja.');
    closeQuickCatatanModal();
  } catch (err) {
    alert('Gagal menyimpan catatan revisi: ' + err.message);
  }
}

// ============================================================================
// MODAL: FORM TAMBAH / EDIT BARIS BELANJA
// ============================================================================

function populateFactorVarSelects() {
  const kuantitasList = AppState.masters?.kuantitas || [];
  const primaryCodes = ['parpol', 'paslon', 'bakal_paslon', 'paslon_parpol', 'paslon_perseorangan', 'komisioner', 'tps_rkb', 'kotak_rkb', 'kec_ppk', 'desa_pps', 'dpt', 'surat_suara', 'sekretariat_kpu', 'kpu_all'];
  
  const primaryItems = [];
  const adhocItems = [];
  const otherItems = [];

  kuantitasList.forEach(k => {
    const code = String(k.kode || '').toLowerCase();
    if (primaryCodes.includes(code)) {
      primaryItems.push(k);
    } else if (code.startsWith('ppk_') || code.startsWith('pps_') || code.startsWith('kpps_') || code.startsWith('masa_kerja_') || code === 'pantarlih' || code === 'linmas_per_tps' || code === 'linmas_tps' || code === 'petugas_tps') {
      adhocItems.push(k);
    } else {
      otherItems.push(k);
    }
  });

  const renderGroup = (label, list) => {
    if (!list.length) return '';
    return `<optgroup label="${label}">${list.map(k => `
      <option value="${k.kode}">@${k.kode} (${k.nama || k.kode}: ${k.nilai} ${k.satuan || ''})</option>
    `).join('')}</optgroup>`;
  };

  const html = `
    <option value="">-- Manual (Input Bebas) --</option>
    ${renderGroup('Parameter Utama SSOT', primaryItems)}
    ${renderGroup('Honorarium & Adhoc SSOT', adhocItems)}
    ${renderGroup('Parameter Lainnya', otherItems)}
  `;

  for (let i = 1; i <= 4; i++) {
    const sel = document.getElementById(`modal-f${i}-var`);
    if (sel) {
      const currentVal = sel.value;
      sel.innerHTML = html;
      if (currentVal) sel.value = currentVal;
    }
  }
}

function onFactorVarSelectChange(factorIdx) {
  const sel = document.getElementById(`modal-f${factorIdx}-var`);
  const valEl = document.getElementById(`modal-f${factorIdx}-val`);
  const unitEl = document.getElementById(`modal-f${factorIdx}-unit`);
  const badgeEl = document.getElementById(`modal-f${factorIdx}-var-badge`);

  if (!sel || !valEl) return;
  const varCode = (sel.value || '').trim();

  if (varCode) {
    if (badgeEl) badgeEl.style.display = 'inline-block';
    const kuantitasList = AppState.masters?.kuantitas || [];
    const clean = varCode.replace(/^@/, '').toLowerCase();
    const item = kuantitasList.find(k => String(k.kode || '').toLowerCase() === clean);
    if (item) {
      valEl.value = item.nilai;
      if (unitEl && (!unitEl.value || unitEl.value.trim() === '')) {
        unitEl.value = item.satuan || '';
      }
    }
  } else {
    if (badgeEl) badgeEl.style.display = 'none';
  }
  calculateModalTotal();
}

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
  
  const user = AppState.currentUser;
  const isUserScoped = Boolean(user && user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA');
  setElVal('modal-pic', isUserScoped ? user.pic_subbag : (row.pic_bagian || 'KUL'));
  const picSelect = document.getElementById('modal-pic');
  if (picSelect) picSelect.disabled = isUserScoped;

  setElVal('modal-sasaran', row.target_scope || 'KAB');

  const costChk = document.getElementById('modal-cost-sharing-prov');
  if (costChk) costChk.checked = ((row.cost_sharing || 'KABUPATEN').toUpperCase() === 'PROVINSI');

  const akunSelect = document.getElementById('modal-akun');
  if (akunSelect && AppState.masters && AppState.masters.akuns) {
    akunSelect.innerHTML = AppState.masters.akuns.map(a => `
      <option value="${a.kode}" ${a.kode === row.kode_akun ? 'selected' : ''}>[${a.kode}] ${a.uraian}</option>
    `).join('');
  }

  // Update BAS Account Card Display & Quick SBM Chips
  updateAkunCardDisplay(row.kode_akun || '521211');

  setElVal('modal-harga', row.harga_satuan || 0);
  setModalSbmDisplay(row.sbm_id || null, row.harga_satuan);
  setElVal('modal-f1-val', row.f1_val !== null ? row.f1_val : '');
  setElVal('modal-f1-unit', row.f1_unit || '');
  setElVal('modal-f2-val', row.f2_val !== null ? row.f2_val : '');
  setElVal('modal-f2-unit', row.f2_unit || '');
  setElVal('modal-f3-val', row.f3_val !== null ? row.f3_val : '');
  setElVal('modal-f3-unit', row.f3_unit || '');
  setElVal('modal-f4-val', row.f4_val !== null ? row.f4_val : '');
  setElVal('modal-f4-unit', row.f4_unit || '');

  // Setup variable selectors for F1..F4 (SSOT Binding)
  populateFactorVarSelects();
  for (let i = 1; i <= 4; i++) {
    let fVar = (row[`f${i}_var`] || '').trim();
    if (fVar === '0') fVar = '';
    const fUnitRaw = String(row[`f${i}_unit`] || '').trim();
    const fUnit = (fUnitRaw && fUnitRaw !== '0') ? fUnitRaw.toLowerCase() : '';
    const rawValNum = Number(row[`f${i}_val`] || 0);
    const uLower = String(row.uraian || '').toLowerCase();
    const targetScopeUpper = String(row.target_scope || '').toUpperCase();
    const adhocLabelUpper = String(row.label_pengali_adhoc || '').toUpperCase();

    if (!fVar) {
      if (fUnit === 'paslon' || uLower.includes('paslon')) {
        if (uLower.includes('perseorangan')) fVar = 'paslon_perseorangan';
        else if (uLower.includes('bakal') || uLower.includes('parpol')) fVar = 'paslon_parpol';
        else fVar = 'paslon';
      } else if (fUnit === 'parpol' || fUnit === 'partai' || fUnit.includes('parpol')) {
        fVar = 'parpol';
      } else if (fUnit === 'komisioner') {
        fVar = 'komisioner';
      } else if (fUnit === 'pemilih' || ((fUnit.includes('org') || !fUnit) && (uLower.includes(' dpt') || uLower.includes('pemilih')) && rawValNum >= 500000)) {
        fVar = 'dpt';
      } else if (fUnit === 'lembar ss' || ((fUnit === 'lembar' || fUnit.includes('lembar') || !fUnit) && rawValNum >= 100000 && uLower.includes('surat suara'))) {
        fVar = 'surat_suara';
      } else if (fUnit === 'kotak' || adhocLabelUpper === 'KOTAK' || (uLower.includes('kotak') && (rawValNum >= 100 || rawValNum === 1393 || rawValNum === 1374))) {
        fVar = 'kotak_rkb';
      } else if (fUnit === 'pantarlih' || fUnit === 'ppdp' || targetScopeUpper === 'PANTARLIH' || uLower.includes('pantarlih') || uLower.includes('ppdp') || rawValNum === 2784) {
        fVar = 'pantarlih';
      } else if (
        fUnit === 'tps' || 
        adhocLabelUpper === 'TPS' || 
        (targetScopeUpper === 'TPS' && (rawValNum >= 100 || rawValNum === 1393 || rawValNum === 1374 || uLower.includes('kpps') || uLower.includes('tingkat kpps'))) ||
        ((rawValNum === 1393 || rawValNum === 1374) && rawValNum >= 100)
      ) {
        fVar = 'tps_rkb';
      }
    }
    setElVal(`modal-f${i}-var`, fVar);
    if (fVar && fVar !== 'MANUAL' && fVar !== 'FIXED') {
      const cleanVar = fVar.replace(/^@/, '').toLowerCase();
      const kItem = (AppState.masters?.kuantitas || []).find(k => String(k.kode || '').toLowerCase() === cleanVar || (cleanVar === 'dpt' && k.kode === 'pemilih_dpt'));
      if (kItem && kItem.nilai !== null && kItem.nilai !== undefined) {
        const liveVal = (cleanVar === 'dpt' || cleanVar === 'pemilih_dpt' || cleanVar === 'surat_suara' || fUnit === 'pemilih')
          ? Math.round(Number(kItem.nilai) || 0)
          : kItem.nilai;
        setElVal(`modal-f${i}-val`, liveVal);
      }
    } else if (fUnit === 'pemilih') {
      const rawPemVal = row[`f${i}_val`];
      if (rawPemVal !== null && rawPemVal !== undefined && rawPemVal !== '') {
        setElVal(`modal-f${i}-val`, Math.round(Number(rawPemVal) || 0));
      }
    }
    const badge = document.getElementById(`modal-f${i}-var-badge`);
    if (badge) badge.style.display = fVar ? 'inline-block' : 'none';
  }

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
    const user = AppState.currentUser;
    const isUserScoped = Boolean(user && user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA');
    setElVal('modal-pic', isUserScoped ? user.pic_subbag : (selectedRow.pic_bagian || 'KUL'));
    const picSelect = document.getElementById('modal-pic');
    if (picSelect) picSelect.disabled = isUserScoped;

    setElVal('modal-sasaran', selectedRow.target_scope || 'KAB');
    const costChk = document.getElementById('modal-cost-sharing-prov');
    if (costChk) costChk.checked = Boolean((selectedRow.cost_sharing || '').toUpperCase() === 'PROVINSI');
    if (ctxAlert) {
      ctxAlert.style.display = 'block';
      const labelDesc = selectedRow.uraian ? selectedRow.uraian : (selectedRow.kode || 'Baris');
      ctxAlert.innerHTML = `📍 <strong>Posisi Sisip Terarah:</strong> ${selectedRow.is_header ? 'Di bawah induk' : 'Sejajar baris rujukan'} <strong>[No: ${selectedRow.urutan}] ${escHtml(labelDesc)}</strong>.`;
    }
  } else {
    AppState.targetAfterUrutan = null;
    const user = AppState.currentUser;
    const isUserScoped = Boolean(user && user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA');
    setElVal('modal-pic', isUserScoped ? user.pic_subbag : 'KUL');
    const picSelect = document.getElementById('modal-pic');
    if (picSelect) picSelect.disabled = isUserScoped;

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

  populateFactorVarSelects();

  setElVal('modal-harga', 0);
  setModalSbmDisplay(null);
  setElVal('modal-f1-val', 1);
  setElVal('modal-f1-unit', 'Keg');
  setElVal('modal-f1-var', '');
  setElVal('modal-f2-val', '');
  setElVal('modal-f2-unit', '');
  setElVal('modal-f2-var', '');
  setElVal('modal-f3-val', '');
  setElVal('modal-f3-unit', '');
  setElVal('modal-f3-var', '');
  setElVal('modal-f4-val', '');
  setElVal('modal-f4-unit', '');
  setElVal('modal-f4-var', '');
  for (let i = 1; i <= 4; i++) {
    const badge = document.getElementById(`modal-f${i}-var-badge`);
    if (badge) badge.style.display = 'none';
  }
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
  const f1El = document.getElementById('modal-f1-val');
  const f2El = document.getElementById('modal-f2-val');
  const f3El = document.getElementById('modal-f3-val');
  const f4El = document.getElementById('modal-f4-val');

  const f1u = document.getElementById('modal-f1-unit')?.value || '';
  const f2u = document.getElementById('modal-f2-unit')?.value || '';
  const f3u = document.getElementById('modal-f3-unit')?.value || '';
  const f4u = document.getElementById('modal-f4-unit')?.value || '';

  const f1v = (document.getElementById('modal-f1-var')?.value || '').trim();
  const f2v = (document.getElementById('modal-f2-var')?.value || '').trim();
  const f3v = (document.getElementById('modal-f3-var')?.value || '').trim();
  const f4v = (document.getElementById('modal-f4-var')?.value || '').trim();

  const factorDefs = [
    { el: f1El, unit: f1u, varCode: f1v, badge: document.getElementById('modal-f1-var-badge') },
    { el: f2El, unit: f2u, varCode: f2v, badge: document.getElementById('modal-f2-var-badge') },
    { el: f3El, unit: f3u, varCode: f3v, badge: document.getElementById('modal-f3-var-badge') },
    { el: f4El, unit: f4u, varCode: f4v, badge: document.getElementById('modal-f4-var-badge') }
  ];

  let baseFactor = 1;
  let activeFactors = 0;
  let hasExplicitZero = false;
  const parts = [];

  for (const f of factorDefs) {
    if (f.badge) f.badge.style.display = f.varCode ? 'inline-block' : 'none';
    if (!f.el || f.el.value === undefined || f.el.value === null || f.el.value.trim() === '') {
      continue;
    }
    activeFactors++;
    const isPemilihFactor = String(f.unit || '').trim().toLowerCase() === 'pemilih' || f.varCode === 'dpt' || f.varCode === 'pemilih_dpt';
    if (isPemilihFactor && f.el.value.includes('.')) {
      f.el.value = String(Math.round(Number(f.el.value) || 0));
    }
    const rawNum = Number(f.el.value);
    const num = isPemilihFactor ? Math.round(rawNum || 0) : rawNum;
    if (num === 0) {
      hasExplicitZero = true;
      baseFactor = 0;
      parts.push(`0 ${f.unit}`.trim());
    } else {
      const validNum = isNaN(num) ? 0 : num;
      baseFactor *= validNum;
      const varTag = f.varCode ? ` (@${f.varCode})` : '';
      parts.push(`${validNum.toLocaleString('id-ID')} ${f.unit}${varTag}`.trim());
    }
  }

  const basis = (document.getElementById('modal-basis-pengali')?.value || 'NONE').toUpperCase();
  let mult = 1;
  let multLabel = '';

  const kecCount = (AppState.masters?.kecamatans || []).length || 19;
  const desaCount = (AppState.masters?.desas || []).length || 217;
  const totalTps = (AppState.masters?.desas || []).reduce((a, b) => a + (Number(b.tps) || 0), 0) || 1371;
  const totalKotak = (AppState.masters?.desas || []).reduce((a, b) => a + (Number(b.kotak) || Number(b.tps) || 0), 0) || totalTps;

  if (basis === 'PPK' || basis === 'KEC_PPK') {
    mult = kecCount;
    multLabel = `${kecCount.toLocaleString('id-ID')} Kec`;
  } else if (basis === 'PPS') {
    mult = desaCount;
    multLabel = `${desaCount.toLocaleString('id-ID')} Desa`;
  } else if (basis === 'TPS_RKB') {
    mult = totalTps;
    multLabel = `${totalTps.toLocaleString('id-ID')} TPS`;
  } else if (basis === 'KOTAK_RKB') {
    mult = totalKotak;
    multLabel = `${totalKotak.toLocaleString('id-ID')} Kotak`;
  } else if (basis === 'PASLON') {
    const paslonCount = (AppState.masters?.paslons || []).length || 2;
    mult = paslonCount;
    multLabel = `${paslonCount.toLocaleString('id-ID')} Paslon`;
  }

  if (multLabel) parts.push(multLabel);

  const totalVol = baseFactor * mult;
  const hargaRaw = document.getElementById('modal-harga')?.value || '0';
  const harga = Number(hargaRaw) || 0;
  const totalAnggaran = totalVol * harga;

  const satuanVol = (document.getElementById('modal-satuan-vol')?.value || '').trim();
  setElText('modal-preview-formula', parts.join(' x ') || '-');
  setElText('modal-preview-volume', `${formatNumber(totalVol)} ${satuanVol} × ${formatRupiah(harga)}`.trim());
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
  let anchorRowId = undefined;
  let anchorMode = undefined;
  if (!rowId && AppState.selectedRowId) {
    const selectedRow = AppState.rkbData?.rows.find(r => r.id === AppState.selectedRowId);
    if (selectedRow) {
      const posChoice = document.querySelector('input[name="modal-row-pos-choice"]:checked')?.value || 'after';
      anchorRowId = selectedRow.id;
      anchorMode = posChoice === 'before' ? 'before' : 'after';
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
    anchor_row_id: anchorRowId,
    anchor_mode: anchorMode,
    target_before_urutan: targetBeforeUrutan,
    target_after_urutan: targetAfterUrutan,
    ensure_akun_header: !isHeaderMode,
    kode: isHeaderMode ? headerKode : (AppState.activeEditingRow ? AppState.activeEditingRow.kode : ''),
    row_type: isHeaderMode ? 'header' : (AppState.activeEditingRow ? AppState.activeEditingRow.row_type : 'item'),
    level_indent: isHeaderMode ? 41 : (AppState.activeEditingRow ? AppState.activeEditingRow.level_indent : 4),
    uraian: uraian,
    pic_bagian: document.getElementById('modal-pic')?.value || 'KUL',
    target_scope: document.getElementById('modal-sasaran')?.value || 'KAB',
    cost_sharing: document.getElementById('modal-cost-sharing-prov')?.checked ? 'PROVINSI' : 'KABUPATEN',
    kode_akun: document.getElementById('modal-akun')?.value || '521211',
    harga_satuan: isHeaderMode ? 0 : (Number(document.getElementById('modal-harga')?.value) || 0),
    sbm_id: isHeaderMode ? null : (document.getElementById('modal-sbm-id')?.value ? Number(document.getElementById('modal-sbm-id').value) : null),
    f1_val: isHeaderMode ? null : (document.getElementById('modal-f1-val')?.value ? Number(document.getElementById('modal-f1-val').value) : null),
    f1_unit: isHeaderMode ? '' : (document.getElementById('modal-f1-unit')?.value || ''),
    f1_var: isHeaderMode ? '' : (document.getElementById('modal-f1-var')?.value || ''),
    f2_val: isHeaderMode ? null : (document.getElementById('modal-f2-val')?.value ? Number(document.getElementById('modal-f2-val').value) : null),
    f2_unit: isHeaderMode ? '' : (document.getElementById('modal-f2-unit')?.value || ''),
    f2_var: isHeaderMode ? '' : (document.getElementById('modal-f2-var')?.value || ''),
    f3_val: isHeaderMode ? null : (document.getElementById('modal-f3-val')?.value ? Number(document.getElementById('modal-f3-val').value) : null),
    f3_unit: isHeaderMode ? '' : (document.getElementById('modal-f3-unit')?.value || ''),
    f3_var: isHeaderMode ? '' : (document.getElementById('modal-f3-var')?.value || ''),
    f4_val: isHeaderMode ? null : (document.getElementById('modal-f4-val')?.value ? Number(document.getElementById('modal-f4-val').value) : null),
    f4_unit: isHeaderMode ? '' : (document.getElementById('modal-f4-unit')?.value || ''),
    f4_var: isHeaderMode ? '' : (document.getElementById('modal-f4-var')?.value || ''),
    basis_pengali: isHeaderMode ? 'NONE' : (document.getElementById('modal-basis-pengali')?.value || 'NONE'),
    satuan_vol: isHeaderMode ? '' : (document.getElementById('modal-satuan-vol')?.value || 'Paket'),
    catatan_revisi_baris: document.getElementById('modal-catatan-revisi')?.value || ''
  };

  try {
    await stageRkbOperation({
      type: 'SAVE_ROW',
      payload
    }, rowId ? 'Perubahan rincian belanja masuk ke draf kerja.' : 'Rincian belanja baru masuk ke draf kerja.');
    closeRowModal();

    const savedRowId = AppState.rkbData?.last_affected_row_id || (rowId ? Number(rowId) : null);
    if (savedRowId) {
      expandAncestorsOfRow(savedRowId);
      AppState.selectedRowId = savedRowId;
      renderRkbTable();
      setTimeout(() => {
        highlightAndScrollToRow(savedRowId);
      }, 150);
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

  const allRows = AppState.rkbData?.rows || [];
  const targetRow = allRows.find(r => r.id === Number(rowId));
  let confirmMsg = 'Apakah Anda yakin ingin menghapus baris belanja ini?';

  if (targetRow) {
    // Bangun childrenMap dari relasi parent_tree_id riil
    const childrenMap = {};
    allRows.forEach(r => {
      if (r.parent_tree_id) {
        if (!childrenMap[r.parent_tree_id]) childrenMap[r.parent_tree_id] = [];
        childrenMap[r.parent_tree_id].push(r);
      }
    });

    const targetTreeId = `row_${targetRow.id}`;
    const queue = [targetTreeId];
    let descendantCount = 0;
    while (queue.length > 0) {
      const curTreeId = queue.shift();
      const children = childrenMap[curTreeId] || [];
      for (const child of children) {
        descendantCount++;
        queue.push(child.tree_id);
      }
    }

    if (descendantCount > 0) {
      confirmMsg = `⚠️ PERINGATAN HAPUS BERJENJANG (CASCADE):\n\nMenghapus baris [${targetRow.kode || '-'}] "${targetRow.uraian}" akan OTOMATIS menghapus ${descendantCount} level/rincian di bawahnya.\n\n(Catatan: Level di atas baris ini TIDAK akan terhapus).\n\nApakah Anda yakin ingin melanjutkan penghapusan ke draf?`;
    } else {
      confirmMsg = `Apakah Anda yakin ingin menghapus baris [${targetRow.kode || '-'}] "${targetRow.uraian}"?`;
    }
  }

  if (!confirm(confirmMsg)) return;

  try {
    await stageRkbOperation({
      type: 'DELETE_ROW',
      row_id: Number(rowId)
    }, 'Penghapusan baris masuk ke draf kerja.');
    AppState.selectedRowId = null;
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
    
    // Cek apakah targetRow atau kelompoknya memiliki rincian / sub-header di bawahnya yang belum dinaungi L5 Akun
    const allRows = AppState.rkbData?.rows || [];
    const targetIdx = allRows.findIndex(r => r.id === targetRow.id);
    let hasWrappableChildren = false;
    let detectedAkunCode = targetRow.kode_akun || '';

    if (!targetRow.is_header || Number(targetRow.level_indent) === 41 || Number(targetRow.level_indent) === 42) {
      hasWrappableChildren = true;
    } else if (targetIdx !== -1 && targetIdx < allRows.length - 1 && Number(targetRow.level_indent) !== 3) {
      const targetRank = targetRow.hierarchy_rank || (targetRow.level_indent === 2 ? 30 : 45);
      for (let i = targetIdx + 1; i < allRows.length; i++) {
        const r = allRows[i];
        if (r.is_header && Number(r.level_indent) <= 2 && (r.hierarchy_rank || 99) <= targetRank) break;
        if (r.is_header && Number(r.level_indent) === 3) break;
        if (!r.is_header || Number(r.level_indent) >= 21) {
          hasWrappableChildren = true;
          if (!detectedAkunCode && r.kode_akun) detectedAkunCode = r.kode_akun;
        }
      }
    }

    if (detectedAkunCode && akunSelect) {
      akunSelect.value = detectedAkunCode;
    }

    if (posBox) {
      posBox.style.display = 'block';
      const defVal = (targetRow.level_indent === 3) ? 'after_children' : (hasWrappableChildren ? 'wrap_children' : 'after_children');
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
  const posChoice = document.querySelector('input[name="add-akun-pos-choice"]:checked')?.value || 'after_children';
  if (targetRow) {
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
      // wrap_children: sisipkan tepat di bawah induk struktural (melingkupi rincian yang ada)
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
    anchor_row_id: targetRow ? targetRow.id : undefined,
    anchor_mode: posChoice,
    wrap_children: posChoice === 'wrap_children',
    target_before_urutan: targetBeforeUrutan,
    target_after_urutan: targetAfterUrutan,
    catatan_revisi_baris: 'Rekam Akun Belanja (BAS)'
  };

  try {
    await stageRkbOperation({
      type: 'SAVE_ROW',
      payload
    }, `Akun Belanja [${kodeAkun}] "${uraian}" masuk ke draf kerja.`);

    closeAddAkunModal();

    const savedId = AppState.rkbData?.last_affected_row_id;
    if (savedId) {
      AppState.selectedRowId = savedId;
      const fullRow = AppState.rkbData?.rows.find(r => r.id === savedId);
      if (fullRow) {
        updateSelectedRowUI();
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
  } catch (err) {
    alert('Gagal merekam Akun Belanja: ' + err.message);
  }
}

// ============================================================================
// MODAL: REKAM STRUKTUR HIERARKI KOMPONEN (L1 - L4)
// ============================================================================

function openAddHeaderModal(targetLevel, refRowId = null, explicitLevelIndent = null) {
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

  const lapisBox = document.getElementById('add-header-lapis-container');
  const lapisSelect = document.getElementById('add-header-level-indent');
  let chosenIndent = 21;
  if (lapisBox) {
    if (targetLevel === 4 || targetLevel === 5.5) {
      lapisBox.style.display = 'block';
      if (targetLevel === 5.5) {
        chosenIndent = 41;
      } else if (explicitLevelIndent && explicitLevelIndent >= 21 && explicitLevelIndent <= 25) {
        chosenIndent = Number(explicitLevelIndent);
      } else if (refRow && refRow.level_indent >= 21 && refRow.level_indent <= 25) {
        chosenIndent = Number(refRow.level_indent);
      } else {
        chosenIndent = 21;
      }
      if (lapisSelect) lapisSelect.value = String(chosenIndent);
    } else {
      lapisBox.style.display = 'none';
    }
  }

  const levelConfigs = {
    1: { title: 'Rekam Bagian Utama (L1)', subtitle: 'Tingkat Tertinggi Pengelompokan Anggaran (Contoh: A, B)', defaultKode: '', uraianPlaceholder: 'Contoh: TAHAPAN PEMILIHAN' },
    2: { title: 'Rekam Tahapan Program (L2)', subtitle: 'Tahapan Operasional Anggaran (Contoh: I, II, III)', defaultKode: '', uraianPlaceholder: 'Contoh: I. TAHAPAN PERSIAPAN' },
    3: { title: 'Rekam Kegiatan / Komponen (L3)', subtitle: '28 Komponen Kegiatan Anggaran (Contoh: 29, 30)', defaultKode: '', uraianPlaceholder: 'Contoh: Pelaksanaan Pemungutan dan Penghitungan Suara' },
    4: { title: `Rekam Sub-Komponen (L4-${chosenIndent >= 21 && chosenIndent <= 25 ? (chosenIndent - 20) : 1})`, subtitle: 'Daftar Isi Level 4 di atas Akun: L4-1 (a.) → L4-2 (1)) → L4-3 (a)) → L4-4 ((1)) → L4-5 ((a))', defaultKode: '', uraianPlaceholder: 'Contoh: Sosialisasi Tatap Muka / Dilaksanakan KPU Kabupaten' },
    5.5: { title: 'Rekam Header Kelompok di Bawah Akun (>)', subtitle: 'Kelompok Rincian di bawah Kode Akun 52xxxx (Contoh: > Konsumsi, > Souvenir)', defaultKode: '>', uraianPlaceholder: 'Contoh: Konsumsi, Souvenir, atau Kantor/Inventaris' }
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
    } else if (targetLevel === 4) {
      const defaultL4Prefixes = { 21: 'a.', 22: '1)', 23: 'a)', 24: '(1)', 25: '(a)' };
      kodeInput.value = defaultL4Prefixes[chosenIndent] || '';
    } else if (targetLevel === 5.5) {
      kodeInput.value = '>';
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

  const user = AppState.currentUser;
  const isUserScoped = Boolean(user && user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA');
  const headerPic = isUserScoped ? user.pic_subbag : (refRow && refRow.pic_bagian ? refRow.pic_bagian : 'RENDATIN');
  setElVal('add-header-pic', headerPic);
  const addHeaderPicSelect = document.getElementById('add-header-pic');
  if (addHeaderPicSelect) addHeaderPicSelect.disabled = isUserScoped;

  const radioAfter = document.querySelector('input[name="add-header-pos-choice"][value="after"]');
  if (radioAfter) radioAfter.checked = true;

  const costChk = document.getElementById('add-header-cost-sharing-prov');
  if (costChk) costChk.checked = Boolean(refRow && (refRow.cost_sharing || '').toUpperCase() === 'PROVINSI');
  const cascadeChk = document.getElementById('add-header-cost-cascade');
  if (cascadeChk) cascadeChk.checked = true;

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
    const existingRow = AppState.rkbData?.rows.find(r => r.id === Number(editId));
    const lapisBox = document.getElementById('add-header-lapis-container');
    const selectedLvlIndent = (lapisBox && lapisBox.style.display !== 'none')
      ? Number(document.getElementById('add-header-level-indent')?.value || (existingRow ? existingRow.level_indent : 21))
      : (existingRow ? existingRow.level_indent : undefined);

    const isConvertingToItem = selectedLvlIndent === 4;
    let finalKode = kode;
    let finalUraian = uraian;
    if (isConvertingToItem && finalKode && !finalUraian.startsWith(finalKode)) {
      finalUraian = `${finalKode} ${finalUraian}`.trim();
      finalKode = '';
    }

    const isProv = Boolean(document.getElementById('add-header-cost-sharing-prov')?.checked);
    const costSharingVal = isProv ? 'PROVINSI' : 'KABUPATEN';
    const doCascade = Boolean(document.getElementById('add-header-cost-cascade')?.checked);

    const payload = {
      id: Number(editId),
      row_type: isConvertingToItem ? 'item' : 'header',
      kode: finalKode,
      uraian: finalUraian,
      level_indent: selectedLvlIndent,
      pic_bagian: pic,
      cost_sharing: costSharingVal,
      catatan_revisi_baris: `Perubahan Level/Teks [${finalKode || '-'}] ${finalUraian}`
    };
    try {
      await stageRkbOperation({
        type: 'SAVE_ROW',
        payload
      }, `Perubahan Level & Teks "${finalUraian}" masuk ke draf kerja.`);
      if (doCascade) {
        await stageRkbOperation({
          type: 'QUICK_COST_SHARING',
          row_id: Number(editId),
          cost_sharing: costSharingVal,
          cascade: true
        }, `Sumber dana baris & turunannya disinkronkan ke ${costSharingVal}.`);
      }
      closeAddHeaderModal();
      AppState.selectedRowId = Number(editId);
      renderRkbTable();
      setTimeout(() => highlightAndScrollToRow(Number(editId)), 150);
    } catch (err) {
      alert('Gagal menyimpan perubahan header: ' + err.message);
    }
    return;
  }

  let levelIndent = 2;
  if (targetLevel === 1) levelIndent = 0;
  else if (targetLevel === 2) levelIndent = 1;
  else if (targetLevel === 3) levelIndent = 2;
  else if (targetLevel === 4 || targetLevel === 5.5) {
    const selVal = Number(document.getElementById('add-header-level-indent')?.value || 0);
    levelIndent = selVal > 0 ? selVal : (targetLevel === 5.5 ? 41 : 21);
  }

  let targetBeforeUrutan = undefined;
  let targetAfterUrutan = undefined;

  if (refRow) {
    if (posChoice === 'before') {
      targetBeforeUrutan = refRow.urutan;
    } else {
      const allRows = AppState.rkbData?.rows || [];
      const targetIdx = allRows.findIndex(r => r.id === refRow.id);
      let lastChildU = refRow.urutan;
      const refLvl = Number(refRow.level_indent);
      const refRank = refRow.hierarchy_rank || (refLvl === 0 ? 10 : (refLvl === 1 ? 20 : (refLvl === 2 ? 30 : (refLvl >= 21 && refLvl <= 25 ? 40 + (refLvl - 20) : 41))));
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
    cost_sharing: document.getElementById('add-header-cost-sharing-prov')?.checked ? 'PROVINSI' : 'KABUPATEN',
    harga_satuan: 0,
    anchor_row_id: refRow ? refRow.id : undefined,
    anchor_mode: posChoice === 'before' ? 'before' : 'after_children',
    target_before_urutan: targetBeforeUrutan,
    target_after_urutan: targetAfterUrutan,
    catatan_revisi_baris: targetLevel === 5.5 ? `Penambahan Header Teks [${kode}] ${uraian}` : `Penambahan Struktur Header L${targetLevel}`
  };

  try {
    const labelSukses = targetLevel === 5.5 ? `Header Teks [${kode}] "${uraian}"` : `Komponen L${targetLevel} "${uraian}"`;
    await stageRkbOperation({
      type: 'SAVE_ROW',
      payload
    }, `${labelSukses} masuk ke draf kerja.`);

    closeAddHeaderModal();

    const savedRowId = AppState.rkbData?.last_affected_row_id || null;
    if (savedRowId) {
      expandAncestorsOfRow(savedRowId);
      AppState.selectedRowId = savedRowId;
      renderRkbTable();
      setTimeout(() => {
        highlightAndScrollToRow(savedRowId);
      }, 150);
    }
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

  setElText('modal-header-title-text', `Ubah Komponen / Header [${row.kode || '-'}]`);
  setElText('modal-header-subtitle', 'Sunting Posisi Lapis Level 4 (L4-1 s.d. L4-5), Kode, dan Uraian');

  const lapisBox = document.getElementById('add-header-lapis-container');
  const lapisSelect = document.getElementById('add-header-level-indent');
  if (lapisBox) {
    const lvlNum = Number(row.level_indent);
    const rankNum = Number(row.hierarchy_rank || 41);
    if (!row.is_header || lvlNum === 2 || (lvlNum >= 21 && lvlNum <= 25) || lvlNum === 41 || lvlNum === 42 || lvlNum === 4) {
      lapisBox.style.display = 'block';
      if (lapisSelect) {
        if (!row.is_header) {
          lapisSelect.value = '4';
        } else if (lvlNum === 2) {
          lapisSelect.value = '2';
        } else if (lvlNum >= 21 && lvlNum <= 25) {
          lapisSelect.value = String(lvlNum);
        } else if (rankNum === 41) {
          lapisSelect.value = '21';
        } else if (rankNum > 41 && rankNum <= 42.5) {
          lapisSelect.value = '22';
        } else if (rankNum === 43) {
          lapisSelect.value = '23';
        } else if (rankNum === 44) {
          lapisSelect.value = '24';
        } else if (rankNum >= 45 && rankNum < 50) {
          lapisSelect.value = '25';
        } else {
          lapisSelect.value = '41';
        }
      }
    } else {
      lapisBox.style.display = 'none';
    }
  }

  setElVal('add-header-kode', row.kode || '');
  setElVal('add-header-uraian', row.uraian || '');
  setElVal('add-header-pic', row.pic_bagian || 'KUL');

  const costChk = document.getElementById('add-header-cost-sharing-prov');
  if (costChk) costChk.checked = ((row.cost_sharing || 'KABUPATEN').toUpperCase() === 'PROVINSI');
  const cascadeChk = document.getElementById('add-header-cost-cascade');
  if (cascadeChk) cascadeChk.checked = true;

  const ctxBox = document.getElementById('add-header-context-box');
  if (ctxBox) {
    ctxBox.innerHTML = `✏️ <strong>Mengubah Header:</strong> Baris <strong>[No: ${row.urutan}] [${row.kode || '-'}] ${escHtml(row.uraian || '')}</strong>`;
  }

  const posBox = document.getElementById('add-header-pos-container');
  if (posBox) posBox.style.display = 'none';

  document.getElementById('modal-add-header').style.display = 'flex';
  setTimeout(() => {
    document.getElementById('add-header-uraian')?.focus();
  }, 100);
}

function setQuickHeaderKode(kodeVal, levelIndentVal) {
  const kodeInput = document.getElementById('add-header-kode');
  if (kodeInput) kodeInput.value = kodeVal;
  if (levelIndentVal) {
    const sel = document.getElementById('add-header-level-indent');
    if (sel) sel.value = String(levelIndentVal);
  }
}

function onChangeHeaderLevelIndent(val) {
  const numVal = Number(val);
  const kodeInput = document.getElementById('add-header-kode');
  if (!kodeInput) return;
  if (numVal === 41 && !kodeInput.value.trim()) {
    kodeInput.value = '>';
  }
}

async function shiftHeaderLevel(rowId, delta, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const p = AppState.currentPeriode;
  if (!p) return;
  const user = AppState.currentUser;
  if (p.is_locked && (!user || user.level > 0)) {
    alert('Dokumen berstatus terkunci.');
    return;
  }
  const row = AppState.rkbData?.rows.find(r => r.id === Number(rowId));
  if (!row) return;
  const curLvl = Number(row.level_indent);
  const rankNum = Number(row.hierarchy_rank || 41);
  let baseL4 = curLvl;
  if (curLvl === 41 || curLvl === 42) {
    baseL4 = rankNum === 41 ? 21 : (rankNum <= 42.5 ? 22 : (rankNum === 43 ? 23 : (rankNum === 44 ? 24 : 25)));
  }
  if (baseL4 < 21 || baseL4 > 25) return;
  const nextLvl = Math.max(21, Math.min(25, baseL4 + delta));
  if (nextLvl === curLvl) return;

  try {
    await stageRkbOperation({
      type: 'SAVE_ROW',
      payload: {
        id: row.id,
        kode: row.kode || '',
        uraian: row.uraian || '',
        level_indent: nextLvl,
        pic_bagian: row.pic_bagian || 'PARSDM',
        catatan_revisi_baris: `Geser Lapis Hierarki L4-${curLvl - 20} → L4-${nextLvl - 20}`
      }
    }, `Baris "${row.uraian}" digeser ke L4 Lapis ${nextLvl - 20}.`);
    AppState.selectedRowId = row.id;
    renderRkbTable();
  } catch (err) {
    alert('Gagal menggeser level hierarki: ' + err.message);
  }
}
window.setQuickHeaderKode = setQuickHeaderKode;
window.onChangeHeaderLevelIndent = onChangeHeaderLevelIndent;
window.shiftHeaderLevel = shiftHeaderLevel;

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
    if (previewCard) previewCard.style.display = 'flex';
    if (uraianLabel) uraianLabel.innerText = 'Uraian Rincian Belanja:';
    if (uraianInput) uraianInput.placeholder = 'Contoh: -. Konsumsi Rapat Koordinasi';
    if (hargaInput) hargaInput.setAttribute('required', 'required');
    setElText('modal-row-title', AppState.activeEditingRow ? 'Edit Rincian Belanja RKB' : 'Tambah Rincian Belanja Baru');
  }
}

// ============================================================================
// GESER URUTAN BARIS (REORDERING: UP / DOWN)
// ============================================================================

async function moveRowOrdering(rowId, direction, event = null) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
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
    await stageRkbOperation({
      type: 'REORDER_ROW',
      row_id: Number(rowId),
      direction: direction
    }, `Pergeseran urutan baris (${direction === 'UP' ? 'Naik' : 'Turun'}) masuk ke draf kerja.`);

    AppState.selectedRowId = Number(rowId);
    renderRkbTable();
    setTimeout(() => {
      highlightAndScrollToRow(Number(rowId));
    }, 100);
  } catch (err) {
    alert('Pergeseran urutan tidak dapat dilakukan: ' + err.message);
  }
}

// ============================================================================
// STAGED DRAFT BUFFER & POP-UP KONFIRMASI SIMPAN PERUBAHAN RKB (BAB 18.8 CANON)
// ============================================================================

function updateStagedRkbBannerUI() {
  const opsCount = Array.isArray(AppState.stagedRkbOps) ? AppState.stagedRkbOps.length : 0;
  const banner = document.getElementById('rkb-staged-banner');
  const headerBtn = document.getElementById('btn-header-commit-rkb');
  const headerBadge = document.getElementById('badge-staged-count-header');
  const bannerCount = document.getElementById('staged-banner-count');
  const subtext = document.getElementById('staged-banner-subtext');

  if (opsCount > 0) {
    if (banner) banner.style.display = 'flex';
    if (headerBtn) headerBtn.style.display = 'inline-flex';
    if (headerBadge) headerBadge.textContent = String(opsCount);
    if (bannerCount) bannerCount.textContent = String(opsCount);

    const diff = AppState.stagedDiff;
    if (subtext && diff) {
      const selisihSign = (diff.selisih_pagu || 0) > 0 ? '+' : '';
      const refChanged = AppState.initialReferenceVersion && AppState.latestReferenceVersion && AppState.initialReferenceVersion !== AppState.latestReferenceVersion;
      subtext.innerHTML = `
        <strong>+${diff.added_count || 0} Baru</strong> &bull;
        <strong>~${diff.updated_count || 0} Diubah</strong> &bull;
        <strong>-${diff.deleted_count || 0} Dihapus</strong>
        ${diff.reordered_count ? `&bull; <strong>↕${diff.reordered_count} Urutan</strong>` : ''}
        &nbsp;|&nbsp; Pagu: <strong>${formatRupiah(diff.pagu_semula || 0)} &rarr; ${formatRupiah(diff.pagu_menjadi || 0)}</strong>
        (Selisih: <strong style="color:${(diff.selisih_pagu || 0) >= 0 ? '#15803d' : '#b91c1c'};">${selisihSign}${formatRupiah(diff.selisih_pagu || 0)}</strong>)
        ${refChanged ? `&nbsp; <span class="badge badge-info" style="font-size:10px;">🔄 Referensi Baru Tersinkron</span>` : ''}
      `;
    }
  } else {
    if (banner) banner.style.display = 'none';
    if (headerBtn) headerBtn.style.display = 'none';
  }
}

async function stageRkbOperation(op, successToastMsg = 'Perubahan masuk ke draf kerja.') {
  if (!Array.isArray(AppState.stagedRkbOps)) {
    AppState.stagedRkbOps = [];
  }

  const mapTempId = (rawId) => {
    if (rawId === undefined || rawId === null || rawId === '') return rawId;
    if (AppState.rowIdToTempId && AppState.rowIdToTempId[rawId] !== undefined) {
      return AppState.rowIdToTempId[rawId];
    }
    return rawId;
  };

  const normalizedOp = { ...op, staged_at: Date.now() };
  if (normalizedOp.row_id !== undefined) {
    normalizedOp.row_id = mapTempId(normalizedOp.row_id);
  }
  if (normalizedOp.payload && typeof normalizedOp.payload === 'object') {
    const p = { ...normalizedOp.payload };
    if (p.id !== undefined && p.id !== null && p.id !== '') {
      p.id = mapTempId(p.id);
    } else if (String(normalizedOp.type || '').toUpperCase() === 'SAVE_ROW' && !normalizedOp.temp_id) {
      normalizedOp.temp_id = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }
    if (p.anchor_row_id !== undefined) {
      p.anchor_row_id = mapTempId(p.anchor_row_id);
    }
    if (p.parent_rkb_row_id !== undefined) {
      p.parent_rkb_row_id = mapTempId(p.parent_rkb_row_id);
    }
    normalizedOp.payload = p;
  }

  AppState.stagedRkbOps.push(normalizedOp);
  const p = AppState.currentPeriode;
  if (p) {
    saveStagedOpsToStorage(p.id, AppState.stagedRkbOps);
  }

  try {
    await loadRkbData();
    renderAllViews();
    if (typeof showToast === 'function') {
      showToast(`${successToastMsg} (Klik "💾 Simpan Perubahan RKB" untuk menyimpan permanen)`, 'info');
    }
  } catch (err) {
    AppState.stagedRkbOps.pop();
    if (p) {
      saveStagedOpsToStorage(p.id, AppState.stagedRkbOps);
    }
    throw err;
  }
}

async function undoLastStagedRkbOp() {
  if (!Array.isArray(AppState.stagedRkbOps) || AppState.stagedRkbOps.length === 0) return;
  AppState.stagedRkbOps.pop();
  if (AppState.currentPeriode) {
    saveStagedOpsToStorage(AppState.currentPeriode.id, AppState.stagedRkbOps);
  }
  await loadRkbData();
  renderAllViews();
  showToast('1 aksi draf terakhir telah diurungkan.', 'info');
}

async function discardAllStagedRkbOps(fromModal = false) {
  if (!Array.isArray(AppState.stagedRkbOps) || AppState.stagedRkbOps.length === 0) return;
  if (!confirm(`Apakah Anda yakin ingin membatalkan seluruh ${AppState.stagedRkbOps.length} draf perubahan RUH Belanja dan mengembalikan angka ke kondisi terakhir di database?`)) {
    return;
  }
  AppState.stagedRkbOps = [];
  AppState.stagedDiff = null;
  AppState.referenceChangeAcknowledged = false;
  if (AppState.currentPeriode) {
    saveStagedOpsToStorage(AppState.currentPeriode.id, []);
  }
  if (fromModal) {
    closeCommitRkbModal();
  }
  await loadRkbData();
  renderAllViews();
  showToast('Seluruh draf perubahan berhasil dibatalkan. Data kembali ke kondisi database terakhir.', 'info');
}

async function openCommitRkbModal() {
  if (!Array.isArray(AppState.stagedRkbOps) || AppState.stagedRkbOps.length === 0) {
    showToast('Belum ada perubahan pada RUH Belanja yang perlu disimpan.', 'info');
    return;
  }

  // Segarkan preview & cek apakah ada perubahan Referensi/Master di saat bersamaan
  await loadRkbData();
  renderCommitRkbModalContent();

  const modal = document.getElementById('modal-commit-rkb');
  if (modal) modal.style.display = 'flex';
}

function renderCommitRkbModalContent() {
  const diff = AppState.stagedDiff || {
    ops_count: AppState.stagedRkbOps.length,
    added_count: 0,
    updated_count: 0,
    deleted_count: 0,
    reordered_count: 0,
    pagu_semula: 0,
    pagu_menjadi: 0,
    selisih_pagu: 0,
    changes: []
  };

  const refAlert = document.getElementById('commit-rkb-ref-alert');
  const isRefChanged = Boolean(
    AppState.initialReferenceVersion &&
    AppState.latestReferenceVersion &&
    AppState.initialReferenceVersion !== AppState.latestReferenceVersion
  );

  if (refAlert) {
    if (isRefChanged) {
      refAlert.style.display = 'block';
      AppState.referenceChangeAcknowledged = true;
    } else {
      refAlert.style.display = 'none';
    }
  }

  setElText('commit-rkb-pagu-semula', formatRupiah(diff.pagu_semula || 0));
  setElText('commit-rkb-pagu-menjadi', formatRupiah(diff.pagu_menjadi || 0));

  const selisihEl = document.getElementById('commit-rkb-pagu-selisih');
  if (selisihEl) {
    const net = diff.selisih_pagu || 0;
    selisihEl.textContent = `${net > 0 ? '+' : ''}${formatRupiah(net)}`;
    selisihEl.style.color = net > 0 ? '#15803d' : (net < 0 ? '#b91c1c' : '#475569');
  }

  setElText(
    'commit-rkb-stats-badges',
    `+${diff.added_count || 0} Baru | ~${diff.updated_count || 0} Diubah | -${diff.deleted_count || 0} Dihapus${diff.reordered_count ? ` | ↕${diff.reordered_count} Urutan` : ''}`
  );

  const tbody = document.getElementById('commit-rkb-changes-tbody');
  if (tbody) {
    const changes = diff.changes || [];
    if (changes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center" style="padding: 18px; color: #64748b;">
            Perubahan urutan baris (${diff.reordered_count || AppState.stagedRkbOps.length} aksi pengurutan) siap disimpan.
          </td>
        </tr>
      `;
    } else {
      tbody.innerHTML = changes.map(ch => {
        let badge = '<span class="badge badge-info" style="font-size:10px;">✏️ DIUBAH</span>';
        if (ch.status === 'BARU') badge = '<span class="badge badge-success" style="font-size:10px;">➕ BARU</span>';
        else if (ch.status === 'DIHAPUS') badge = '<span class="badge badge-danger" style="font-size:10px;">🗑️ DIHAPUS</span>';

        return `
          <tr>
            <td class="text-center">${badge}</td>
            <td>
              <strong>${ch.kode ? `[${escHtml(ch.kode)}] ` : ''}${escHtml(ch.uraian || '-')}</strong>
            </td>
            <td class="text-center"><span class="badge badge-subtle">${escHtml(ch.pic_bagian || '-')}</span></td>
            <td style="font-size: 11px; color: #475569;">${escHtml(ch.detail || '-')}</td>
            <td class="text-right" style="font-family: var(--font-mono);">${formatRupiah(ch.semula_jumlah || 0)}</td>
            <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: #1e3a8a;">${formatRupiah(ch.menjadi_jumlah || 0)}</td>
          </tr>
        `;
      }).join('');
    }
  }
}

function closeCommitRkbModal() {
  const modal = document.getElementById('modal-commit-rkb');
  if (modal) modal.style.display = 'none';
}

async function submitCommitRkbChanges() {
  const p = AppState.currentPeriode;
  if (!p || !Array.isArray(AppState.stagedRkbOps) || AppState.stagedRkbOps.length === 0) return;

  const diff = AppState.stagedDiff;
  if (diff && diff.deleted_count > 0) {
    const totalDeletedNominal = (diff.changes || [])
      .filter(c => c.status === 'DIHAPUS')
      .reduce((sum, c) => sum + (c.semula_jumlah || 0), 0);
    const delMsg = `⚠️ PERINGATAN PENGHAPUSAN BARIS ANGGARAN!\n\nDraf Anda memuat ${diff.deleted_count} baris belanja yang akan DIHAPUS PERMANEN dari database (Perkiraan nilai: ${formatRupiah(totalDeletedNominal)}).\n\nApakah Anda benar-benar yakin ingin melanjutkan penyimpanan?`;
    if (!confirm(delMsg)) {
      return;
    }
  }

  const btn = document.getElementById('btn-confirm-commit-rkb');
  const catatan = (document.getElementById('commit-rkb-catatan')?.value || '').trim();

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Menyimpan ke Database...';
  }

  try {
    const res = await fetch(`/api/rkb/${p.id}/commit-staged`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
      },
      body: JSON.stringify({
        ops: AppState.stagedRkbOps,
        expected_reference_version: AppState.initialReferenceVersion,
        expected_rkb_version: AppState.rkbVersion,
        acknowledge_reference_change: AppState.referenceChangeAcknowledged,
        catatan_simpan: catatan
      })
    });

    const data = await res.json();

    if (res.status === 409 && data && data.reference_changed) {
      AppState.latestReferenceVersion = data.reference_version;
      AppState.stagedDiff = data.staged_diff || AppState.stagedDiff;
      AppState.referenceChangeAcknowledged = true;
      renderCommitRkbModalContent();
      showToast('🔄 Data Referensi/Master baru saja berubah. Angka ringkasan telah disinkronkan, silakan klik Konfirmasi Simpan sekali lagi.', 'warning');
      return;
    }

    if (res.status === 409 && data && data.rkb_conflict) {
      AppState.rkbVersion = data.current_rkb_version;
      if (typeof Swal !== 'undefined') {
        const result = await Swal.fire({
          title: 'Konflik Perubahan RKB',
          text: data.error || 'Data RKB telah diperbarui oleh pengguna lain sejak halaman ini dibuka. Muat ulang halaman untuk memuat perubahan terbaru atau simpan paksa untuk menimpa?',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Tetap Simpan (Timpa)',
          cancelButtonText: 'Batal & Muat Ulang'
        });
        if (result.isConfirmed) {
          const forceRes = await fetch(`/api/rkb/${p.id}/commit-staged`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
            },
            body: JSON.stringify({
              ops: AppState.stagedRkbOps,
              expected_reference_version: AppState.initialReferenceVersion,
              expected_rkb_version: AppState.rkbVersion,
              force_overwrite: true,
              acknowledge_reference_change: true,
              catatan_simpan: catatan
            })
          });
          const forceData = await forceRes.json();
          if (forceRes.ok) {
            AppState.stagedRkbOps = [];
            AppState.stagedDiff = null;
            AppState.rkbVersion = forceData.rkb_version || null;
            closeCommitRkbModal();
            await loadPeriodes();
            await loadRkbData();
            renderAllViews();
            showToast('✅ Perubahan berhasil disimpan paksa ke database.', 'success');
            return;
          }
        } else {
          closeCommitRkbModal();
          await loadRkbData();
          renderAllViews();
          return;
        }
      } else {
        alert(data.error);
        return;
      }
    }

    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan perubahan RKB.');
    }

    AppState.stagedRkbOps = [];
    AppState.stagedDiff = null;
    AppState.initialReferenceVersion = data.reference_version || null;
    AppState.latestReferenceVersion = data.reference_version || null;
    AppState.referenceChangeAcknowledged = false;
    if (data.rkb_version) {
      AppState.rkbVersion = data.rkb_version;
    }
    saveStagedOpsToStorage(p.id, []);
    setElVal('commit-rkb-catatan', '');

    closeCommitRkbModal();
    await loadPeriodes();
    await loadRkbData();
    renderAllViews();

    showToast(data.message || '✅ Seluruh perubahan RKB berhasil disimpan permanen dan tercatat pada Log Aktivitas.', 'success');
  } catch (err) {
    alert('Gagal menyimpan perubahan RKB: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '💾 Konfirmasi & Simpan Sekarang';
    }
  }
}

window.addEventListener('beforeunload', (e) => {
  if (Array.isArray(AppState.stagedRkbOps) && AppState.stagedRkbOps.length > 0) {
    e.preventDefault();
    e.returnValue = '';
  }
});

window.openCommitRkbModal = openCommitRkbModal;
window.closeCommitRkbModal = closeCommitRkbModal;
window.submitCommitRkbChanges = submitCommitRkbChanges;
window.undoLastStagedRkbOp = undoLastStagedRkbOp;
window.discardAllStagedRkbOps = discardAllStagedRkbOps;

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
  setModalSbmDisplay(item.id, item.harga_satuan, item.uraian);

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
  setElVal('lock-gdrive-link', p.gdrive_link_pleno || '');
  setElVal('lock-catatan', p.catatan_revisi || p.catatan_pleno || '');
  
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
      <option value="BA Pleno KPU">Berita Acara (BA) Sidang Pleno KPU</option>
    `;
  } else {
    dasarSelect.innerHTML = `
      <option value="BA Pleno KPU">Berita Acara (BA) Sidang Pleno KPU</option>
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
    catatan_revisi: document.getElementById('lock-catatan')?.value || '',
    gdrive_link_pleno: document.getElementById('lock-gdrive-link')?.value || '',
    catatan_pleno: document.getElementById('lock-catatan')?.value || ''
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



let pendingExportPeriodeId = null;

async function downloadExcel(periodeId = null) {
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
      await downloadProtectedFile(`/api/export-excel/${pId}`, `RKB_Periode_${pId}.xlsx`);
    }
  } catch (err) {
    console.error('Error saat membuka modal ekspor excel:', err);
    // Fallback: unduh langsung
    if (AppState.currentPeriode) {
      downloadProtectedFile(`/api/export-excel/${AppState.currentPeriode.id}`, `RKB_Periode_${AppState.currentPeriode.id}.xlsx`).catch(e => {
        showToast('Gagal mengunduh berkas: ' + e.message, 'error');
      });
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
    const result = await apiFetch('/api/download-requests', {
      method: 'POST',
      body: JSON.stringify({
        nama_file: filename,
        tipe_unduhan: 'EXCEL_RUH',
        periode_id: pendingExportPeriodeId,
        filter_pic: pic,
        filter_sasaran: sasaran
      })
    });
    if (result && result.success) {
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
    const result = await apiFetch('/api/download-requests', {
      method: 'POST',
      body: JSON.stringify({
        nama_file: filename,
        tipe_unduhan: 'ZIP_SUBBAGIAN',
        periode_id: pId
      })
    });
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
    const raw = await apiFetch(`/api/download-requests?${params.toString()}`);
    // Sesuai arahan: data yang Gagal dan Kadaluarsa otomatis disaring keluar dari datatabel
    monitoringData = (Array.isArray(raw) ? raw : []).filter(d => d.status !== 'GAGAL' && d.status !== 'KADALUARSA');
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

  // Pastikan data yang Gagal dan Kadaluarsa otomatis hilang dari datatabel
  const activeItems = (monitoringData || []).filter(d => d.status !== 'GAGAL' && d.status !== 'KADALUARSA');

  const countBadge = document.getElementById('badge-monitoring-count');
  if (countBadge) countBadge.textContent = activeItems.filter(d => d.status === 'SELESAI').length;

  const totalItems = activeItems.length;
  const labelCount = document.getElementById('monitoring-count-label');
  if (labelCount) labelCount.textContent = `Menampilkan ${totalItems} data`;

  if (totalItems === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center" style="padding: 48px 20px; color: #64748b; background: #fafafa;">
          <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
          <div style="font-weight: 700; font-size: 13.5px; color: #1e293b;">Belum Ada Riwayat Unduhan Aktif</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px; max-width: 420px; margin-left: auto; margin-right: auto; line-height: 1.5;">
            Berkas unduhan aktif tersedia selama 1 jam sejak selesai dibuat. Berkas yang gagal atau telah kedaluwarsa otomatis dibersihkan dari tampilan datatabel.
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const startIdx = (monitoringCurrentPage - 1) * MONITORING_PER_PAGE;
  const pageData = activeItems.slice(startIdx, startIdx + MONITORING_PER_PAGE);

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
      dlBtn = `<button type="button" class="btn-sakti-download" onclick="downloadMonitoringItem(${item.id}, '${escapeHtml(item.nama_file)}')">📄 Download</button>`;
    } else if (item.status === 'KADALUARSA') {
      statusBadge = '<span class="badge-kadaluarsa">⚠️ Kadaluarsa</span>';
      dlBtn = '<button class="btn-sakti-download disabled" disabled title="Berkas fisik telah kedaluwarsa (> 1 jam), riwayat tetap tercatat untuk audit">Kadaluarsa</button>';
    } else {
      statusBadge = '<span class="badge-gagal">✕ Gagal</span>';
      dlBtn = `<button class="btn-sakti-download disabled" disabled title="${escapeHtml(item.error_message || 'Gagal')}">Gagal</button>`;
    }

    const siklusInfo = item.siklus_versi || item.siklus_nama || 'Siklus Aktif';
    const scopeInfo = item.tipe_unduhan === 'ZIP_SUBBAGIAN'
      ? 'Paket ZIP 5 Subbagian (@ 2 Sheet Fokus)'
      : (item.filter_pic && item.filter_pic !== 'SEMUA'
          ? `Fokus PIC: ${item.filter_pic} (2 Sheet)`
          : 'Satker Penuh (7 Sheet)');

    return `
      <tr>
        <td style="padding: 10px 14px; font-weight: 600; color: #1e293b;">
          ${escapeHtml(item.nama_file)}
          <small style="display:block; color:#475569; font-weight:500; margin-top:2px;">
            📌 ${escapeHtml(siklusInfo)} &bull; ${escapeHtml(scopeInfo)}
            ${item.file_size ? ` &bull; ${(item.file_size / 1024).toFixed(1)} KB` : ''}
          </small>
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
// PENGINGAT KONTEKSTUAL PEMUTAKHIRAN DATA DASAR (BAB 7.1 & MATRIKS A-03)
// ============================================================================

async function renderContextualMasterReminderBanner(viewId = null) {
  const targetViews = viewId
    ? [viewId]
    : ['view-db-kuantitas', 'view-db-sbm', 'view-db-bas', 'view-db-regulasi', 'view-db-ppk', 'view-db-pps', 'view-db-paslon', 'view-db-settings'];

  let stageCode = 'TAHAP_0';
  try {
    const list = Array.isArray(AppState.revisiList) && AppState.revisiList.length > 0
      ? AppState.revisiList
      : await apiFetch('/api/revisi/pengajuan').catch(() => []);
    if (Array.isArray(list) && list.length > 0) {
      AppState.revisiList = list;
      const activeItems = list.filter(x => x.status_tahap !== 'DISAHKAN_TAHAP4');
      if (activeItems.length === 0) {
        stageCode = 'TAHAP_0';
      } else if (activeItems.length === 5 && activeItems.every(x => x.status_tahap === 'DISETUJUI_PLENO')) {
        stageCode = 'TAHAP_4';
      } else if (activeItems.some(x => x.status_tahap === 'DISETUJUI_PLENO' || x.status_tahap === 'TERVALIDASI_RENDATIN')) {
        stageCode = 'TAHAP_3';
      } else if (activeItems.some(x => x.status_tahap === 'DIAJUKAN_SUBBAG')) {
        stageCode = 'TAHAP_2';
      } else {
        stageCode = 'TAHAP_1';
      }
    }
  } catch (e) {}

  const stageMeta = {
    TAHAP_0: {
      bg: '#eff6ff',
      border: '#93c5fd',
      color: '#1e3a8a',
      icon: '🏛️',
      title: 'Tahap 0 — Pra-Pengajuan (Pemutakhiran Data Dasar):',
      desc: 'Pastikan pemutakhiran data dasar (Kuantitas SSOT, SBM/SBML, BAS, Wilayah PPK/PPS, Paslon, dan Pejabat Satker) telah diselesaikan sebelum Subbagian menyusun dan mengunci usulan revisi.'
    },
    TAHAP_1: {
      bg: '#f0fdf4',
      border: '#86efac',
      color: '#14532d',
      icon: '📝',
      title: 'Tahap 1 — Pengajuan Subbagian Sedang Berlangsung:',
      desc: 'Perubahan pada parameter referensi/master pada tahap ini akan langsung memengaruhi kalkulasi draf kerja RKB yang sedang disusun oleh Subbagian.'
    },
    TAHAP_2: {
      bg: '#fefce8',
      border: '#fde047',
      color: '#713f12',
      icon: '🔍',
      title: 'Tahap 2 — Validasi Subbag Perencanaan (Rendatin):',
      desc: 'Pastikan parameter SSOT, standar biaya SBM, dan kode akun BAS telah sinkron sebelum meneruskan usulan Subbagian ke Tahap 3 (Pleno Pimpinan).'
    },
    TAHAP_3: {
      bg: '#fff7ed',
      border: '#fdba74',
      color: '#7c2d12',
      icon: '⚖️',
      title: 'Tahap 3 — Pembahasan Pleno Pimpinan:',
      desc: 'Usulan sedang berada pada tahap Pleno Pimpinan. Hindari mengubah parameter master yang berdampak pada angka RKB kecuali atas instruksi koreksi Pleno.'
    },
    TAHAP_4: {
      bg: '#fef2f2',
      border: '#fca5a5',
      color: '#7f1d1d',
      icon: '🔒',
      title: 'Tahap 4 — Siap Pengesahan Akhir Siklus:',
      desc: 'Seluruh 5 Subbagian telah disetujui Pleno. Perubahan data master menjelang pengesahan akhir tidak disarankan agar baseline anggaran tetap konsisten.'
    }
  }[stageCode];

  const user = AppState.currentUser;
  const readOnlyNote = (user && user.level > 1)
    ? ` <span style="display:inline-block; margin-left:6px; padding:1px 8px; border-radius:12px; background:rgba(15,23,42,0.08); font-weight:700; font-size:11px;">Mode Baca Saja (Read-Only — Level ${user.level})</span>`
    : '';

  targetViews.forEach(vId => {
    const section = document.getElementById(vId);
    if (!section) return;
    let banner = section.querySelector('.contextual-master-reminder-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.className = 'contextual-master-reminder-banner mb-3';
      const header = section.querySelector('.view-header');
      if (header && header.nextSibling) {
        section.insertBefore(banner, header.nextSibling);
      } else {
        section.prepend(banner);
      }
    }
    banner.style.cssText = `background:${stageMeta.bg}; border:1px solid ${stageMeta.border}; color:${stageMeta.color}; padding:10px 14px; border-radius:8px; font-size:12.5px; display:flex; align-items:flex-start; gap:10px; margin-bottom:12px;`;
    banner.innerHTML = `
      <span style="font-size:16px; line-height:1.2;">${stageMeta.icon}</span>
      <div style="flex:1; line-height:1.45;">
        <strong>${stageMeta.title}</strong> ${stageMeta.desc}${readOnlyNote}
      </div>
    `;
  });
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

  const isLevel1 = (AppState.currentUser?.level <= 1);
  tbody.innerHTML = kecamatans.map((k, idx) => {
    const kecDesas = desaByKec[k.id] || [];
    const totalTps = kecDesas.reduce((a, b) => a + (Number(b.tps) || 0), 0);
    return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="text-center" style="font-family: var(--font-mono); font-weight: 700;">${k.no_urut || (idx + 1)}</td>
        <td><strong>${escapeHtml(k.nama)}</strong></td>
        <td><code style="font-family: var(--font-mono);">${escapeHtml(k.kode || '-')}</code></td>
        <td>${escapeHtml(k.ketua_ppk || k.ketua_nama || '-')}</td>
        <td>${escapeHtml(k.sekretaris_ppk || k.sekretaris_nama || '-')}</td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${escapeHtml(k.sekretaris_nip || '-')}</td>
        <td class="text-center"><span class="badge badge-secondary">${kecDesas.length} Desa</span></td>
        <td class="text-center"><span class="badge badge-primary">${formatNumber(totalTps)} TPS</span></td>
        <td class="text-center">
          ${isLevel1 ? `
          <button type="button" class="btn btn-outline btn-sm" onclick="openModalKecamatan(${k.id})" title="Edit Kecamatan">✏️</button>
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteKecamatan(${k.id})" title="Hapus Kecamatan">🗑️</button>
          ` : `<span class="badge badge-secondary" style="font-size:11px;">Read-Only</span>`}
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
  const ketua_ppk = document.getElementById('kecamatan-ketua')?.value;
  const sekretaris_ppk = document.getElementById('kecamatan-sekretaris')?.value;
  const sekretaris_nip = document.getElementById('kecamatan-sekretaris-nip')?.value;

  if (!nama || !nama.trim()) {
    showToast('Nama kecamatan tidak boleh kosong.', 'error');
    return;
  }

  try {
    const result = await apiFetch('/api/master/kecamatan', {
      method: 'POST',
      body: JSON.stringify({ id, no_urut, kode, nama, ketua_ppk, sekretaris_ppk, sekretaris_nip })
    });
    if (result.success) {
      closeModalKecamatan();
      showToast('Data Kecamatan berhasil disimpan.', 'success');
      try {
        await loadMasters();
        await loadRkbData();
        renderAllViews();
      } catch (e) {
        console.warn('Gagal memuat ulang view kecamatan:', e);
      }
    } else {
      showToast(result.error || 'Gagal menyimpan kecamatan.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'error');
  }
}

async function deleteKecamatan(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus kecamatan ini?')) return;
  try {
    const result = await apiFetch(`/api/master/kecamatan/${id}`, {
      method: 'DELETE'
    });
    if (result.success) {
      showToast('Kecamatan berhasil dihapus.', 'success');
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } else {
      showToast(result.error || 'Gagal menghapus kecamatan.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'error');
  }
}

async function downloadMonitoringItem(id, filename) {
  try {
    await downloadProtectedFile(`/api/download-requests/${id}/file`, filename || 'unduhan.xlsx');
  } catch (err) {
    showToast('Gagal mengunduh berkas: ' + err.message, 'error');
  }
}
window.downloadMonitoringItem = downloadMonitoringItem;

async function exportKecamatanExcel() {
  try {
    await downloadProtectedFile('/api/master/kecamatan/export', 'Master_Kecamatan.xlsx');
  } catch (err) {
    showToast('Gagal mengunduh: ' + err.message, 'error');
  }
}

function triggerImportKecamatan() {
  document.getElementById('input-file-kecamatan')?.click();
}

async function handleExcelUploadKecamatan(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = '';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const base64Data = e.target.result.split(',')[1];
      // 1. Pratinjau terlebih dahulu tanpa menyimpan perubahan
      const previewRes = await apiFetch('/api/master/kecamatan/import', {
        method: 'POST',
        body: JSON.stringify({ file_base64: base64Data, preview: true, filename: file.name })
      });

      if (previewRes.errors && previewRes.errors.length > 0) {
        alert(`❌ Terdapat ${previewRes.errors.length} baris bermasalah pada berkas:\n${previewRes.errors[0].error}`);
        return;
      }

      const confirmMsg = `Pratinjau Impor Kecamatan/PPK:\n- Total data: ${previewRes.processed}\n- Akan ditambahkan baru: ${previewRes.would_insert}\n- Akan diperbarui: ${previewRes.would_update}\n\nApakah Anda ingin menerapkan perubahan ini ke database?`;
      if (!confirm(confirmMsg)) return;

      // 2. Terapkan perubahan dalam transaksi
      const res = await apiFetch('/api/master/kecamatan/import', {
        method: 'POST',
        body: JSON.stringify({ file_base64: base64Data, preview: false, filename: file.name })
      });
      alert(`✅ ${res.message || 'Update masal Kecamatan/PPK berhasil!'}`);
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } catch (err) {
      alert('❌ Gagal mengimpor data Kecamatan/PPK: ' + err.message);
    }
  };
  reader.readAsDataURL(file);
}

// ============================================================================
// VIEW: MASTER DESA & TPS (217 PPS) - BASIS DATA PRIMER REAKTIF
// ============================================================================

function renderDbPps() {
  if (!AppState.masters) return;
  const { kecamatans, desas } = AppState.masters;

  // Update summary strip
  const totalDesa = desas.length;
  const totalTps = desas.reduce((a, b) => a + Math.round(Number(b.tps) || 0), 0);
  const totalPemilih = desas.reduce((a, b) => a + Math.round(Number(b.pemilih) || 0), 0);
  const totalPantarlih = desas.reduce((a, b) => a + Math.round(Number(b.pantarlih) || 0), 0);

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

  const isLevel1 = (AppState.currentUser?.level <= 1);
  tbody.innerHTML = filtered.map((d, idx) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td><strong>${escapeHtml(kecMap[d.kecamatan_id] || '-')}</strong></td>
      <td><strong>${escapeHtml(d.nama)}</strong></td>
      <td class="text-center"><span class="badge badge-primary">${formatNumber(Math.round(Number(d.tps) || 0))} TPS</span></td>
      <td class="text-center" style="font-weight: 600; color: #059669;">${formatNumber(Math.round(Number(d.pantarlih) || 0))}</td>
      <td class="text-right" style="font-weight: 700; color: #7c3aed; font-family: var(--font-mono);">${formatNumber(Math.round(Number(d.pemilih) || 0))}</td>
      <td class="text-center">${formatNumber(Math.round(Number(d.kotak || d.tps) || 0))}</td>
      <td class="text-center">${formatNumber(Math.round(Number(d.rohaniwan) || 1))}</td>
      <td>${escapeHtml(d.ketua_nama || '-')}</td>
      <td>${escapeHtml(d.sekretaris_nama || '-')}</td>
      <td style="font-family: var(--font-mono); font-size: 11px;">${escapeHtml(d.sekretaris_nip || '-')}</td>
      <td class="text-center">
        ${isLevel1 ? `
        <button type="button" class="btn btn-outline btn-sm" onclick="openModalDesa(${d.id})" title="Edit Desa">✏️</button>
        <button type="button" class="btn btn-outline-danger btn-sm" onclick="deleteDesa(${d.id})" title="Hapus Desa">🗑️</button>
        ` : `<span class="badge badge-secondary" style="font-size:11px;">Read-Only</span>`}
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
      const cleanTps = Math.round(Number(d.tps) || 1);
      setElVal('desa-kecamatan-id', d.kecamatan_id);
      setElVal('desa-no-urut', d.no_urut || 1);
      setElVal('desa-nama', d.nama || '');
      setElVal('desa-tps', cleanTps);
      setElVal('desa-pantarlih', Math.round(Number(d.pantarlih) || (cleanTps * 2)));
      setElVal('desa-pemilih', Math.round(Number(d.pemilih) || 0));
      setElVal('desa-kotak', Math.round(Number(d.kotak || cleanTps) || cleanTps));
      setElVal('desa-rohaniwan', Math.round(Number(d.rohaniwan) || 1));
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
  const tps = Math.round(Number(document.getElementById('desa-tps')?.value) || 0);
  const pantarlih = Math.round(Number(document.getElementById('desa-pantarlih')?.value) || 0);
  const pemilih = Math.round(Number(document.getElementById('desa-pemilih')?.value) || 0);
  const kotak = Math.round(Number(document.getElementById('desa-kotak')?.value) || tps);
  const rohaniwan = Math.round(Number(document.getElementById('desa-rohaniwan')?.value) || 1);
  const ketua_nama = document.getElementById('desa-ketua')?.value;
  const sekretaris_nama = document.getElementById('desa-sekretaris')?.value;
  const sekretaris_nip = document.getElementById('desa-sekretaris-nip')?.value;

  if (!nama || !nama.trim()) {
    showToast('Nama desa tidak boleh kosong.', 'error');
    return;
  }

  try {
    const result = await apiFetch('/api/master/desa', {
      method: 'POST',
      body: JSON.stringify({ id, kecamatan_id, no_urut, nama, tps, pantarlih, pemilih, kotak, rohaniwan, ketua_nama, sekretaris_nama, sekretaris_nip })
    });
    if (result.success) {
      closeModalDesa();
      showToast('Data Desa & TPS berhasil disimpan. Seluruh baris RKB otomatis dihitung ulang.', 'success');
      try {
        await loadMasters();
        await loadRkbData();
        renderAllViews();
      } catch (e) {
        console.warn('Gagal memuat ulang view desa:', e);
      }
    } else {
      showToast(result.error || 'Gagal menyimpan desa.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'error');
  }
}

async function deleteDesa(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus desa ini?')) return;
  try {
    const result = await apiFetch(`/api/master/desa/${id}`, {
      method: 'DELETE'
    });
    if (result.success) {
      showToast('Desa berhasil dihapus.', 'success');
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } else {
      showToast(result.error || 'Gagal menghapus desa.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'error');
  }
}

async function exportDesaExcel() {
  try {
    await downloadProtectedFile('/api/master/desa/export', 'Master_Desa.xlsx');
  } catch (err) {
    showToast('Gagal mengunduh: ' + err.message, 'error');
  }
}

function triggerImportDesa() {
  document.getElementById('input-file-desa')?.click();
}

async function handleExcelUploadDesa(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = '';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const base64Data = e.target.result.split(',')[1];
      // 1. Pratinjau terlebih dahulu tanpa menyimpan perubahan
      const previewRes = await apiFetch('/api/master/desa/import', {
        method: 'POST',
        body: JSON.stringify({ file_base64: base64Data, preview: true, filename: file.name })
      });

      if (previewRes.errors && previewRes.errors.length > 0) {
        alert(`❌ Terdapat ${previewRes.errors.length} baris bermasalah pada berkas:\n${previewRes.errors[0].error}`);
        return;
      }

      const confirmMsg = `Pratinjau Impor Desa/TPS:\n- Total data: ${previewRes.processed}\n- Akan ditambahkan baru: ${previewRes.would_insert}\n- Akan diperbarui: ${previewRes.would_update}\n\nApakah Anda ingin menerapkan perubahan ini ke database?`;
      if (!confirm(confirmMsg)) return;

      // 2. Terapkan perubahan dalam transaksi
      const res = await apiFetch('/api/master/desa/import', {
        method: 'POST',
        body: JSON.stringify({ file_base64: base64Data, preview: false, filename: file.name })
      });
      alert(`✅ ${res.message || 'Update masal Desa/TPS berhasil!'}`);
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } catch (err) {
      alert('❌ Gagal mengimpor data Desa/TPS: ' + err.message);
    }
  };
  reader.readAsDataURL(file);
}

// ============================================================================
// VIEW: MASTER PASANGAN CALON (PASLON)
// ============================================================================

function renderDbPaslon() {
  if (!AppState.masters) return;
  const paslons = AppState.masters.paslons || [];
  const countPerseorangan = paslons.filter(p => p.keterangan === 'Jalur Perseorangan').length;
  const countParpol = paslons.length - countPerseorangan;

  const elStatTotal = document.getElementById('paslon-stat-total');
  const elStatParpol = document.getElementById('paslon-stat-parpol');
  const elStatPerseorangan = document.getElementById('paslon-stat-perseorangan');
  const elStatKoef = document.getElementById('paslon-stat-koef');
  if (elStatTotal) elStatTotal.textContent = `${paslons.length} Pasangan`;
  if (elStatParpol) elStatParpol.textContent = `${countParpol} Paslon`;
  if (elStatPerseorangan) elStatPerseorangan.textContent = `${countPerseorangan} Paslon`;
  if (elStatKoef) elStatKoef.textContent = `${paslons.length} Paslon`;

  const tbody = document.getElementById('table-db-paslon');
  if (!tbody) return;

  if (paslons.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 24px; color: var(--text-muted);">Belum ada pasangan calon terdaftar.</td></tr>';
    return;
  }

  const isLevel1 = (AppState.currentUser?.level <= 1);
  tbody.innerHTML = paslons.map(p => {
    const jalurParam = p.keterangan === 'Jalur Perseorangan' ? 'Jalur Perseorangan' : 'Jalur Parpol';
    const jalurBadge = jalurParam === 'Jalur Perseorangan'
      ? `<span class="badge badge-warning" style="font-size: 11.5px; padding: 4px 10px; font-weight: 700;">👤 ${escapeHtml(jalurParam)}</span>`
      : `<span class="badge badge-primary" style="font-size: 11.5px; padding: 4px 10px; font-weight: 700;">🏛️ ${escapeHtml(jalurParam)}</span>`;
    return `
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
      <td>${jalurBadge}</td>
      <td class="text-center">
        ${isLevel1 ? `
        <button type="button" class="btn btn-outline btn-sm" onclick="openModalPaslon(${p.id})" title="Edit Paslon">✏️</button>
        <button type="button" class="btn btn-outline-danger btn-sm" onclick="deletePaslon(${p.id})" title="Hapus Paslon">🗑️</button>
        ` : `<span class="badge badge-secondary" style="font-size:11px;">Read-Only</span>`}
      </td>
    </tr>
  `;
  }).join('');
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
      setElVal('paslon-keterangan', p.keterangan === 'Jalur Perseorangan' ? 'Jalur Perseorangan' : 'Jalur Parpol');
    }
  } else {
    const maxNo = (AppState.masters?.paslons?.length || 0) + 1;
    setElVal('paslon-no-urut', maxNo);
    setElVal('paslon-keterangan', 'Jalur Parpol');
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
    const result = await apiFetch('/api/master/paslon', {
      method: 'POST',
      body: JSON.stringify({ id, no_urut, nama_calon_bupati, nama_calon_wakil_bupati, partai_pengusung, slogan, keterangan })
    });
    if (result.success) {
      closeModalPaslon();
      showToast('Data Pasangan Calon berhasil disimpan. Koefisien RKB otomatis diperbarui.', 'success');
      try {
        await loadMasters();
        await loadRkbData();
        renderAllViews();
      } catch (e) {
        console.warn('Gagal memuat ulang view paslon:', e);
      }
    } else {
      showToast(result.error || 'Gagal menyimpan paslon.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'error');
  }
}

async function deletePaslon(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus pasangan calon ini?')) return;
  try {
    const result = await apiFetch(`/api/master/paslon/${id}`, {
      method: 'DELETE'
    });
    if (result.success) {
      showToast('Pasangan calon berhasil dihapus.', 'success');
      await loadMasters();
      await loadRkbData();
      renderAllViews();
    } else {
      showToast(result.error || 'Gagal menghapus paslon.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'error');
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
  const totalTps = desas.reduce((a, b) => a + Math.round(Number(b.tps) || 0), 0);
  const totalPemilih = desas.reduce((a, b) => a + Math.round(Number(b.pemilih) || 0), 0);
  const totalPantarlih = desas.reduce((a, b) => a + Math.round(Number(b.pantarlih) || 0), 0);
  const totalPaslon = (paslons || []).length;

  setElText('kuantitas-stat-kec', totalKec);
  setElText('kuantitas-stat-desa', totalDesa);
  setElText('kuantitas-stat-tps', formatNumber(totalTps));
  setElText('kuantitas-stat-pemilih', formatNumber(totalPemilih));
  setElText('kuantitas-stat-pantarlih', formatNumber(totalPantarlih));
  setElText('kuantitas-stat-paslon', totalPaslon);

  const tbody = document.getElementById('table-db-kuantitas');
  if (!tbody) return;

  const reactiveDesa = ['tps_rkb', 'kotak_rkb', 'pemilih_dpt', 'dpt', 'pantarlih', 'desa_pps'];
  const reactivePpk = ['kec_ppk'];
  const reactivePaslon = ['paslon', 'paslon_parpol', 'paslon_perseorangan', 'bakal_paslon'];
  const formulaKeys = [
    'kpps_ketua', 'kpps_anggota', 'linmas_tps', 'petugas_tps', 'kpps_all',
    'ppk_ketua', 'ppk_anggota', 'ppk_komisioner', 'ppk_sekretaris', 'ppk_staf', 'ppk_sekretariat',
    'pps_ketua', 'pps_anggota', 'pps_komisioner', 'pps_sekretaris', 'pps_staf', 'pps_sekretariat',
    'kpu_all', 'surat_suara'
  ];

  tbody.innerHTML = kuantitas.map(q => {
    let sourceBadge = '';
    let actionBtn = '';

    const isLevel1 = (AppState.currentUser?.level <= 1);

    if (reactiveDesa.includes(q.kode)) {
      sourceBadge = '<span class="badge badge-success" style="font-size:11px;">Reaktif: Detail Desa/TPS</span>';
      actionBtn = isLevel1 
        ? `<button type="button" class="btn btn-xs btn-outline-primary" onclick="navigateToMaster('view-db-pps')" title="Ubah data di Master Desa & TPS"><i class="fas fa-external-link-alt"></i> Buka Master</button>`
        : `<span class="badge badge-secondary" style="font-size:11px;">Master Primer</span>`;
    } else if (reactivePpk.includes(q.kode)) {
      sourceBadge = '<span class="badge badge-info" style="font-size:11px;">Reaktif: Master PPK</span>';
      actionBtn = isLevel1 
        ? `<button type="button" class="btn btn-xs btn-outline-primary" onclick="navigateToMaster('view-db-ppk')" title="Ubah data di Master Kecamatan (PPK)"><i class="fas fa-external-link-alt"></i> Buka Master</button>`
        : `<span class="badge badge-secondary" style="font-size:11px;">Master Primer</span>`;
    } else if (reactivePaslon.includes(q.kode)) {
      sourceBadge = '<span class="badge badge-primary" style="font-size:11px;">Reaktif: Master Paslon</span>';
      actionBtn = isLevel1 
        ? `<button type="button" class="btn btn-xs btn-outline-primary" onclick="navigateToMaster('view-db-paslon')" title="Ubah data di Master Pasangan Calon"><i class="fas fa-external-link-alt"></i> Buka Master</button>`
        : `<span class="badge badge-secondary" style="font-size:11px;">Master Primer</span>`;
    } else if (q.kode === 'surat_suara') {
      sourceBadge = '<span class="badge badge-secondary" style="font-size:11px;">Sumber: @dpt + 2,5%</span>';
      actionBtn = `<span class="badge badge-secondary" style="font-size:11px; font-weight: 600;" title="Dihitung otomatis oleh rumus @dpt + 2,5%"><i class="fas fa-calculator"></i> ∑ Rumus</span>`;
    } else if (formulaKeys.includes(q.kode)) {
      sourceBadge = '<span class="badge badge-secondary" style="font-size:11px;">Formula Agregat Otomatis</span>';
      actionBtn = `<span class="badge badge-secondary" style="font-size:11px; font-weight: 600;" title="Dihitung otomatis oleh formula"><i class="fas fa-calculator"></i> ∑ Rumus</span>`;
    } else {
      sourceBadge = '<span class="badge badge-warning" style="font-size:11px;">Konfigurasi Koefisien Mandiri</span>';
      actionBtn = isLevel1 
        ? `<button type="button" class="btn btn-xs btn-primary" onclick="openModalKuantitas(${q.id})" title="Edit Parameter Kuantitas"><i class="fas fa-pencil-alt"></i> Edit</button>`
        : `<span class="badge badge-secondary" style="font-size:11px;">Read-Only</span>`;
    }

    return `
      <tr data-kategori="${escapeHtml(q.kategori || '')}">
        <td><code style="font-family: var(--font-mono); font-weight: 700; color: #0284c7;">@${q.kode}</code></td>
        <td><strong>${escapeHtml(q.nama || q.uraian)}</strong></td>
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent); font-size: 13.5px;">${formatNumber(q.nilai)}</td>
        <td>${escapeHtml(q.satuan || '')}</td>
        <td>
          ${sourceBadge}
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${escapeHtml(q.keterangan || '-')}</div>
        </td>
        <td class="text-center" style="white-space: nowrap;">
          ${actionBtn}
        </td>
      </tr>
    `;
  }).join('');
}

function filterDbKuantitas() {
  const selectedKat = document.getElementById('filter-db-kuantitas-kat')?.value || 'ALL';
  const keyword = (document.getElementById('filter-db-kuantitas')?.value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#table-db-kuantitas tr');
  rows.forEach(r => {
    const kat = r.getAttribute('data-kategori') || '';
    const text = r.textContent.toLowerCase();
    const matchKat = (selectedKat === 'ALL' || kat === selectedKat);
    const matchText = (!keyword || text.includes(keyword));
    r.style.display = (matchKat && matchText) ? '' : 'none';
  });
}

function openModalKuantitas(id) {
  const modal = document.getElementById('modal-kuantitas');
  if (!modal) return;
  const q = (AppState.masters?.kuantitas || []).find(item => item.id === Number(id));
  if (!q) return;

  setElText('modal-kuantitas-title', `📐 Edit Parameter SSOT: ${q.nama || q.kode}`);
  setElVal('kuantitas-id', q.id);
  setElVal('kuantitas-kode', q.kode || '');
  setElVal('kuantitas-nama', q.nama || q.kode || '');
  setElVal('kuantitas-kategori', q.kategori || 'UMUM');
  setElText('modal-kuantitas-kode-chip', `@${q.kode}`);
  setElText('modal-kuantitas-nama', q.nama || q.kode);
  setElVal('kuantitas-nilai', q.nilai);
  setElVal('kuantitas-satuan', q.satuan || '');
  setElVal('kuantitas-keterangan', q.keterangan || '');

  modal.style.display = 'flex';
  setTimeout(() => document.getElementById('kuantitas-nilai')?.focus(), 100);
}

function closeModalKuantitas() {
  const modal = document.getElementById('modal-kuantitas');
  if (modal) modal.style.display = 'none';
  const submitBtn = document.getElementById('btn-submit-kuantitas');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '💾 Simpan Parameter';
  }
}

async function submitModalKuantitas() {
  const id = document.getElementById('kuantitas-id')?.value;
  const kode = document.getElementById('kuantitas-kode')?.value;
  const nama = document.getElementById('kuantitas-nama')?.value;
  const kategori = document.getElementById('kuantitas-kategori')?.value;
  const nilai = parseFloat(document.getElementById('kuantitas-nilai')?.value);
  const satuan = (document.getElementById('kuantitas-satuan')?.value || '').trim();
  const keterangan = (document.getElementById('kuantitas-keterangan')?.value || '').trim();

  if (isNaN(nilai) || nilai < 0) {
    showToast('Nilai parameter harus berupa angka positif.', 'error');
    return;
  }

  const submitBtn = document.getElementById('btn-submit-kuantitas');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Menyimpan...';
  }

  try {
    const result = await apiFetch('/api/master/kuantitas', {
      method: 'POST',
      body: JSON.stringify({
        id: Number(id),
        kode,
        nama,
        kategori,
        nilai,
        satuan,
        keterangan
      })
    });
    if (result.success) {
      // 1. Pastikan pop up langsung tertutup seketika saat sukses
      closeModalKuantitas();

      // 2. Berikan notifikasi toast konfirmasi
      showToast(result.message || 'Parameter SSOT berhasil diperbarui!', 'success');

      // 3. Perbarui state dan kalkulasi di latar belakang
      try {
        await loadMasters();
        await loadRkbData();
        renderAllViews();
      } catch (refreshErr) {
        console.warn('Gagal memuat ulang view master kuantitas:', refreshErr);
      }
    } else {
      showToast(result.error || 'Gagal memperbarui parameter kuantitas.', 'error');
    }
  } catch (err) {
    showToast('Terjadi kesalahan: ' + err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '💾 Simpan Parameter';
    }
  }
}

function navigateToMaster(viewId) {
  switchView(viewId);
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
        ${(AppState.currentUser?.level <= 1) ? `
        <button type="button" class="btn btn-xs btn-outline-primary" onclick="openModalSbm(${s.id})" title="Edit Standar Biaya">✏️ Edit</button>
        <button type="button" class="btn btn-xs btn-outline-danger" onclick="deleteSbm(${s.id})" title="Hapus Standar Biaya">🗑️</button>
        ` : `<span class="badge badge-secondary" style="font-size:11px;">Read-Only</span>`}
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

async function exportSbmExcel() {
  try {
    await downloadProtectedFile('/api/master/sbm/export', 'Master_SBM.xlsx');
  } catch (err) {
    showToast('Gagal mengunduh: ' + err.message, 'error');
  }
}

function triggerImportSbm() {
  document.getElementById('input-file-sbm')?.click();
}

async function handleExcelUploadSbm(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = '';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const base64Data = e.target.result.split(',')[1];
      // 1. Pratinjau terlebih dahulu tanpa menyimpan perubahan
      const previewRes = await apiFetch('/api/master/sbm/import', {
        method: 'POST',
        body: JSON.stringify({ file_base64: base64Data, preview: true, filename: file.name })
      });

      if (previewRes.errors && previewRes.errors.length > 0) {
        alert(`❌ Terdapat ${previewRes.errors.length} baris bermasalah pada berkas:\n${previewRes.errors[0].error}`);
        return;
      }

      const confirmMsg = `Pratinjau Impor SBM:\n- Total data: ${previewRes.processed}\n- Akan ditambahkan baru: ${previewRes.would_insert}\n- Akan diperbarui: ${previewRes.would_update}\n\nApakah Anda ingin menerapkan perubahan ini ke database?`;
      if (!confirm(confirmMsg)) return;

      // 2. Terapkan perubahan dalam transaksi
      const res = await apiFetch('/api/master/sbm/import', {
        method: 'POST',
        body: JSON.stringify({ file_base64: base64Data, preview: false, filename: file.name })
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
        ${(AppState.currentUser?.level <= 1) ? `
        <button type="button" class="btn btn-xs btn-outline-primary" onclick="openModalBas(${a.id})" title="Edit Akun BAS">✏️ Edit</button>
        <button type="button" class="btn btn-xs btn-outline-danger" onclick="deleteAkun(${a.id})" title="Hapus Akun BAS">🗑️</button>
        ` : `<span class="badge badge-secondary" style="font-size:11px;">Read-Only</span>`}
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

async function exportBasExcel() {
  try {
    await downloadProtectedFile('/api/master/akun/export', 'Master_Akun.xlsx');
  } catch (err) {
    showToast('Gagal mengunduh: ' + err.message, 'error');
  }
}

function triggerImportBas() {
  document.getElementById('input-file-bas')?.click();
}

async function handleExcelUploadBas(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = '';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const base64Data = e.target.result.split(',')[1];
      // 1. Pratinjau terlebih dahulu tanpa menyimpan perubahan
      const previewRes = await apiFetch('/api/master/akun/import', {
        method: 'POST',
        body: JSON.stringify({ file_base64: base64Data, preview: true, filename: file.name })
      });

      if (previewRes.errors && previewRes.errors.length > 0) {
        alert(`❌ Terdapat ${previewRes.errors.length} baris bermasalah pada berkas:\n${previewRes.errors[0].error}`);
        return;
      }

      const confirmMsg = `Pratinjau Impor Akun BAS:\n- Total data: ${previewRes.processed}\n- Akan ditambahkan baru: ${previewRes.would_insert}\n- Akan diperbarui: ${previewRes.would_update}\n\nApakah Anda ingin menerapkan perubahan ini ke database?`;
      if (!confirm(confirmMsg)) return;

      // 2. Terapkan perubahan dalam transaksi
      const res = await apiFetch('/api/master/akun/import', {
        method: 'POST',
        body: JSON.stringify({ file_base64: base64Data, preview: false, filename: file.name })
      });
      alert(`✅ ${res.message || 'Update masal akun BAS berhasil!'}`);
      await loadMasters();
      renderDbBas();
    } catch (err) {
      alert('❌ Gagal mengimpor data akun BAS: ' + err.message);
    }
  };
  reader.readAsDataURL(file);
}

// ============================================================================
// VIEW 7: REGULASI & DASAR HUKUM (PORTAL KATALOG JDIH PENYUSUNAN & PELAKSANAAN)
// ============================================================================

let currentJdihScopeFilter = 'ALL';

function getJdihJenisStyle(jenis) {
  const j = String(jenis || '').toUpperCase();
  if (j.includes('UU')) return { bg: '#fee2e2', color: '#991b1b', border: '#dc2626', icon: '🏛️' };
  if (j.includes('PP') || j.includes('PERPRES')) return { bg: '#fef3c7', color: '#92400e', border: '#d97706', icon: '📜' };
  if (j.includes('PERMENDAGRI')) return { bg: '#e0e7ff', color: '#3730a3', border: '#4f46e5', icon: '🏢' };
  if (j.includes('PMK')) return { bg: '#dcfce7', color: '#166534', border: '#16a34a', icon: '💰' };
  if (j.includes('PKPU')) return { bg: '#dbeafe', color: '#1e40af', border: '#2563eb', icon: '🗳️' };
  if (j.includes('KPT KPU')) return { bg: '#f3e8ff', color: '#6b21a8', border: '#9333ea', icon: '⚖️' };
  return { bg: '#f1f5f9', color: '#334155', border: '#64748b', icon: '📋' };
}

function getJdihScopeBadge(lingkup) {
  const l = String(lingkup || '').toUpperCase();
  if (l === 'PENYUSUNAN') {
    return `<span class="badge badge-info" style="font-size:11px; padding:3px 9px; font-weight:700;">📐 Penyusunan Anggaran (Perencanaan)</span>`;
  }
  if (l === 'PELAKSANAAN') {
    return `<span class="badge badge-success" style="font-size:11px; padding:3px 9px; font-weight:700;">⚙️ Pelaksanaan &amp; Pertanggungjawaban</span>`;
  }
  return `<span class="badge badge-primary" style="font-size:11px; padding:3px 9px; font-weight:700;">🔄 Penyusunan &amp; Pelaksanaan</span>`;
}

function renderDbRegulasi() {
  if (!AppState.masters) return;
  const regulasis = AppState.masters.regulasis || [];

  const totalCount = regulasis.length;
  const penyusunanCount = regulasis.filter(r => r.lingkup_anggaran === 'PENYUSUNAN' || r.lingkup_anggaran === 'PENYUSUNAN & PELAKSANAAN').length;
  const pelaksanaanCount = regulasis.filter(r => r.lingkup_anggaran === 'PELAKSANAAN' || r.lingkup_anggaran === 'PENYUSUNAN & PELAKSANAAN').length;
  const lintasCount = regulasis.filter(r => r.lingkup_anggaran === 'PENYUSUNAN & PELAKSANAAN').length;

  setElText('jdih-stat-total', `${totalCount} Produk Hukum`);
  setElText('jdih-stat-penyusunan', `${penyusunanCount} Regulasi`);
  setElText('jdih-stat-pelaksanaan', `${pelaksanaanCount} Regulasi`);
  setElText('jdih-stat-lintas', `${lintasCount} Regulasi`);

  const isLevel1 = (AppState.currentUser?.level <= 1);
  const btnTambah = document.getElementById('btn-tambah-regulasi');
  if (btnTambah) btnTambah.style.display = isLevel1 ? 'inline-flex' : 'none';

  filterDbRegulasi();
}

function setJdihScopeFilter(scope) {
  currentJdihScopeFilter = scope || 'ALL';
  const tabs = document.querySelectorAll('#jdih-scope-tabs button[data-scope]');
  tabs.forEach(btn => {
    const isAct = btn.getAttribute('data-scope') === currentJdihScopeFilter;
    btn.className = isAct ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary';
  });
  filterDbRegulasi();
}

function filterDbRegulasi() {
  const container = document.getElementById('jdih-catalog-container');
  if (!container || !AppState.masters) return;

  const regulasis = AppState.masters.regulasis || [];
  const selectedJenis = document.getElementById('filter-jdih-jenis')?.value || 'ALL';
  const keyword = (document.getElementById('filter-jdih-search')?.value || '').toLowerCase().trim();

  const filtered = regulasis.filter(r => {
    if (currentJdihScopeFilter === 'PENYUSUNAN') {
      if (r.lingkup_anggaran !== 'PENYUSUNAN' && r.lingkup_anggaran !== 'PENYUSUNAN & PELAKSANAAN') return false;
    } else if (currentJdihScopeFilter === 'PELAKSANAAN') {
      if (r.lingkup_anggaran !== 'PELAKSANAAN' && r.lingkup_anggaran !== 'PENYUSUNAN & PELAKSANAAN') return false;
    } else if (currentJdihScopeFilter === 'PENYUSUNAN & PELAKSANAAN') {
      if (r.lingkup_anggaran !== 'PENYUSUNAN & PELAKSANAAN') return false;
    }

    if (selectedJenis !== 'ALL' && r.jenis_produk !== selectedJenis) return false;

    if (keyword) {
      const hay = `${r.jenis_produk} ${r.nomor_peraturan} ${r.tahun} ${r.tentang} ${r.instansi_penetap} ${r.modul_terkait} ${r.abstrak}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    return true;
  });

  setElText('jdih-showing-count', `Menampilkan ${filtered.length} dari ${regulasis.length} produk hukum`);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card" style="padding: 32px; text-align: center; color: var(--text-muted);">
        Tidak ada produk hukum JDIH yang cocok dengan filter atau kata kunci pencarian.
      </div>
    `;
    return;
  }

  const isLevel1 = (AppState.currentUser?.level <= 1);
  container.innerHTML = filtered.map((r, idx) => {
    const jStyle = getJdihJenisStyle(r.jenis_produk);
    const scopeBadge = getJdihScopeBadge(r.lingkup_anggaran);
    const statusBadge = r.status_berlaku === 'Berlaku'
      ? `<span class="badge badge-success" style="font-size:10.5px;">✅ Berlaku</span>`
      : `<span class="badge badge-warning" style="font-size:10.5px;">⚠️ ${escapeHtml(r.status_berlaku)}</span>`;

    return `
      <div class="card" style="padding: 16px 18px; border-left: 5px solid ${jStyle.border}; transition: box-shadow 0.15s ease;">
        <div style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 8px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 8px;">
            <span style="background: ${jStyle.bg}; color: ${jStyle.color}; border: 1px solid ${jStyle.border}40; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.3px;">
              ${jStyle.icon} ${escapeHtml(r.jenis_produk)}
            </span>
            <span style="background: #f1f5f9; color: #334155; padding: 3px 8px; border-radius: 6px; font-family: var(--font-mono); font-size: 11px; font-weight: 700;">
              Tahun ${escapeHtml(r.tahun)}
            </span>
            ${scopeBadge}
            ${statusBadge}
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <button type="button" class="btn btn-outline-primary btn-xs" onclick="openModalRegulasiDetail(${r.id})" title="Lihat Lembar Metadata & Abstrak JDIH">
              📖 Abstrak &amp; Metadata
            </button>
            ${r.tautan_dokumen ? `
              <a href="${escapeHtml(r.tautan_dokumen)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-xs" style="text-decoration: none;" title="Buka Portal JDIH Resmi">
                🔗 Portal JDIH &rarr;
              </a>
            ` : ''}
            ${isLevel1 ? `
              <button type="button" class="btn btn-outline btn-xs" onclick="openModalRegulasi(${r.id})" title="Edit Produk Hukum">✏️</button>
              <button type="button" class="btn btn-outline-danger btn-xs" onclick="deleteRegulasi(${r.id})" title="Hapus Produk Hukum">🗑️</button>
            ` : ''}
          </div>
        </div>

        <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 800; color: #0f172a;">
          ${idx + 1}. ${escapeHtml(r.nomor_peraturan)}
        </h4>
        <div style="font-size: 13px; font-weight: 700; color: #1e3a8a; margin-bottom: 8px; line-height: 1.45;">
          Tentang ${escapeHtml(r.tentang)}
        </div>
        <p style="margin: 0 0 10px 0; font-size: 12.5px; color: #475569; line-height: 1.55;">
          ${escapeHtml(r.abstrak || '-')}
        </p>

        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding-top: 8px; border-top: 1px dashed #e2e8f0; font-size: 11.5px; color: #64748b;">
          <div>
            <strong>Instansi Penetap:</strong> ${escapeHtml(r.instansi_penetap || '-')}
          </div>
          <div>
            <strong>Relevansi Modul SI-PRABU:</strong> <span style="color: #0369a1; font-weight: 700;">${escapeHtml(r.modul_terkait || '-')}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openModalRegulasiDetail(id) {
  const modal = document.getElementById('modal-regulasi-detail');
  const body = document.getElementById('modal-regulasi-detail-body');
  if (!modal || !body) return;

  const r = (AppState.masters?.regulasis || []).find(item => item.id === Number(id));
  if (!r) return;

  const scopeBadge = getJdihScopeBadge(r.lingkup_anggaran);
  body.innerHTML = `
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
        <span class="badge badge-primary" style="font-size:11px;">${escapeHtml(r.jenis_produk)}</span>
        ${scopeBadge}
        <span class="badge badge-success" style="font-size:11px;">Status: ${escapeHtml(r.status_berlaku)}</span>
      </div>
      <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">${escapeHtml(r.nomor_peraturan)}</div>
      <div style="font-size: 13.5px; font-weight: 700; color: #1e40af; line-height: 1.45;">Tentang ${escapeHtml(r.tentang)}</div>
    </div>

    <table class="table table-bordered" style="font-size: 12.5px; margin-bottom: 12px;">
      <tbody>
        <tr>
          <th style="width: 190px; background: #f1f5f9;">Jenis Produk Hukum</th>
          <td><strong>${escapeHtml(r.jenis_produk)}</strong></td>
        </tr>
        <tr>
          <th style="background: #f1f5f9;">Nomor &amp; Tahun</th>
          <td>${escapeHtml(r.nomor_peraturan)} (Tahun ${escapeHtml(r.tahun)})</td>
        </tr>
        <tr>
          <th style="background: #f1f5f9;">Instansi / Pejabat Penetap</th>
          <td>${escapeHtml(r.instansi_penetap || '-')}</td>
        </tr>
        <tr>
          <th style="background: #f1f5f9;">Lingkup Penganggaran</th>
          <td>${scopeBadge}</td>
        </tr>
        <tr>
          <th style="background: #f1f5f9;">Relevansi Modul SI-PRABU</th>
          <td><strong style="color: #0369a1;">${escapeHtml(r.modul_terkait || '-')}</strong></td>
        </tr>
        <tr>
          <th style="background: #f1f5f9;">Abstrak / Pokok Materi</th>
          <td style="line-height: 1.6;">${escapeHtml(r.abstrak || '-')}</td>
        </tr>
        ${r.tautan_dokumen ? `
        <tr>
          <th style="background: #f1f5f9;">Tautan JDIH Resmi</th>
          <td><a href="${escapeHtml(r.tautan_dokumen)}" target="_blank" rel="noopener noreferrer" style="font-weight:700; color:#2563eb;">${escapeHtml(r.tautan_dokumen)} &rarr;</a></td>
        </tr>
        ` : ''}
      </tbody>
    </table>
  `;
  modal.style.display = 'flex';
}

function closeModalRegulasiDetail() {
  const modal = document.getElementById('modal-regulasi-detail');
  if (modal) modal.style.display = 'none';
}

function openModalRegulasi(id = null) {
  const modal = document.getElementById('modal-regulasi');
  if (!modal) return;
  document.getElementById('form-regulasi')?.reset();
  setElVal('regulasi-id', id || '');

  if (id && AppState.masters?.regulasis) {
    const r = AppState.masters.regulasis.find(item => item.id === Number(id));
    if (r) {
      setElText('modal-regulasi-title', '✏️ Edit Produk Hukum JDIH');
      setElVal('regulasi-no-urut', r.no_urut || 1);
      setElVal('regulasi-jenis', r.jenis_produk || 'KPT KPU');
      setElVal('regulasi-tahun', r.tahun || 2024);
      setElVal('regulasi-nomor', r.nomor_peraturan || '');
      setElVal('regulasi-tentang', r.tentang || '');
      setElVal('regulasi-lingkup', r.lingkup_anggaran || 'PENYUSUNAN & PELAKSANAAN');
      setElVal('regulasi-status', r.status_berlaku || 'Berlaku');
      setElVal('regulasi-instansi', r.instansi_penetap || '');
      setElVal('regulasi-modul', r.modul_terkait || '');
      setElVal('regulasi-abstrak', r.abstrak || '');
      setElVal('regulasi-tautan', r.tautan_dokumen || '');
    }
  } else {
    setElText('modal-regulasi-title', '➕ Tambah Produk Hukum JDIH Baru');
    const maxNo = (AppState.masters?.regulasis?.length || 0) + 1;
    setElVal('regulasi-no-urut', maxNo);
    setElVal('regulasi-jenis', 'KPT KPU');
    setElVal('regulasi-tahun', 2024);
    setElVal('regulasi-lingkup', 'PENYUSUNAN & PELAKSANAAN');
    setElVal('regulasi-status', 'Berlaku');
  }
  modal.style.display = 'flex';
}

function closeModalRegulasi() {
  const modal = document.getElementById('modal-regulasi');
  if (modal) modal.style.display = 'none';
}

async function submitModalRegulasi() {
  const payload = {
    id: document.getElementById('regulasi-id')?.value || undefined,
    no_urut: Number(document.getElementById('regulasi-no-urut')?.value) || 1,
    jenis_produk: document.getElementById('regulasi-jenis')?.value || 'KPT KPU',
    tahun: Number(document.getElementById('regulasi-tahun')?.value) || 2024,
    nomor_peraturan: (document.getElementById('regulasi-nomor')?.value || '').trim(),
    tentang: (document.getElementById('regulasi-tentang')?.value || '').trim(),
    lingkup_anggaran: document.getElementById('regulasi-lingkup')?.value || 'PENYUSUNAN & PELAKSANAAN',
    status_berlaku: document.getElementById('regulasi-status')?.value || 'Berlaku',
    instansi_penetap: (document.getElementById('regulasi-instansi')?.value || '').trim(),
    modul_terkait: (document.getElementById('regulasi-modul')?.value || '').trim(),
    abstrak: (document.getElementById('regulasi-abstrak')?.value || '').trim(),
    tautan_dokumen: (document.getElementById('regulasi-tautan')?.value || '').trim()
  };

  if (!payload.nomor_peraturan || !payload.tentang) {
    showToast('Nomor Peraturan dan Judul/Tentang wajib diisi.', 'error');
    return;
  }

  try {
    const res = await apiFetch('/api/master/regulasi', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    if (res.success) {
      closeModalRegulasi();
      showToast(res.message || 'Produk hukum JDIH berhasil disimpan.', 'success');
      await loadMasters();
      renderDbRegulasi();
    } else {
      showToast(res.error || 'Gagal menyimpan produk hukum.', 'error');
    }
  } catch (err) {
    showToast('Gagal menyimpan produk hukum: ' + err.message, 'error');
  }
}

async function deleteRegulasi(id) {
  if (!confirm('Apakah Anda yakin ingin menghapus produk hukum ini dari katalog JDIH?')) return;
  try {
    const res = await apiFetch(`/api/master/regulasi/${id}`, { method: 'DELETE' });
    if (res.success) {
      showToast('Produk hukum JDIH berhasil dihapus.', 'success');
      await loadMasters();
      renderDbRegulasi();
    }
  } catch (err) {
    showToast('Gagal menghapus produk hukum: ' + err.message, 'error');
  }
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
  setElVal('set-kota-ttd', s.kota_penandatangan || 'NGAWI');

  // Google OAuth Settings
  setElVal('set-google-client-id', s.google_client_id || '');
  setElVal('set-google-auth-enabled', s.google_auth_enabled || '0');
  setElVal('set-google-allowed-domains', s.google_allowed_domains || 'kpu.go.id, gmail.com');

  const isLevel1 = (AppState.currentUser?.level <= 1);
  const btnSimpan = document.getElementById('btn-simpan-settings');
  if (btnSimpan) btnSimpan.style.display = isLevel1 ? 'inline-flex' : 'none';
  document.querySelectorAll('#form-settings input, #form-settings select').forEach(el => {
    el.disabled = !isLevel1;
  });
}

async function saveSatkerSettings() {
  const payload = {
    nama_satker: document.getElementById('set-nama-satker')?.value || '',
    kode_satker: document.getElementById('set-kode-satker')?.value || '',
    tahun_anggaran: document.getElementById('set-tahun-anggaran')?.value || '2029',
    nama_agenda: document.getElementById('set-nama-agenda')?.value || '',
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
    showToast(res.message || 'Pengaturan Satker berhasil disimpan.', 'success');
    await loadMasters();
    await initGoogleAuth();
    renderAllViews();
  } catch (err) {
    showToast('Gagal menyimpan pengaturan: ' + err.message, 'error');
  }
}

// ============================================================================
// VIEW 6: MANAJEMEN HAK AKSES PENGGUNA SATKER & DEVELOPER
// ============================================================================

AppState.modalUserRoles = [];

function renderUsersTable() {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  const users = AppState.usersList || [];
  if (users.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding: 24px;">Tidak ada data pengguna.</td></tr>`;
    return;
  }

  const currentUser = AppState.currentUser;
  const isDev = currentUser && currentUser.level === 0;
  const isPerencanaan = currentUser && currentUser.level === 1;
  const canManage = isDev || isPerencanaan;

  let html = '';
  users.forEach((u, idx) => {
    const isCurrent = currentUser && currentUser.username === u.username;

    // Render Peran & Hak Akses (3 Komponen: Level, PIC, Hak Aksi)
    const roles = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles : [{
      level: Number(u.level),
      pic: u.pic_subbag || 'SEMUA',
      mode_akses: Number(u.level) === 3 ? 'VIEWER' : 'EDITOR',
      label_peran: u.jabatan || u.nama_pejabat,
      is_default: 1
    }];

    let rolesHtml = `<div style="display:flex;flex-direction:column;gap:5px;">`;
    roles.forEach(r => {
      const lvl = Number(r.level);
      let lvlBadge = '';
      if (lvl === 0) lvlBadge = `<span class="badge" style="background:#0f172a;color:#fff;font-weight:800;font-size:10px;">L0 DEV</span>`;
      else if (lvl === 1) lvlBadge = `<span class="badge badge-primary" style="font-weight:700;font-size:10px;">L1 PERENCANA</span>`;
      else if (lvl === 2) lvlBadge = `<span class="badge badge-success" style="font-weight:700;font-size:10px;">L2 SUBBAG</span>`;
      else if (lvl === 3) lvlBadge = `<span class="badge" style="background:#fef3c7;color:#92400e;font-weight:800;font-size:10px;">L3 PIMPINAN</span>`;
      else if (lvl === 4) lvlBadge = `<span class="badge" style="background:#f3e8ff;color:#6b21a8;font-weight:800;font-size:10px;border:1px solid #d8b4fe;">L4 EKSKLUSIF</span>`;
      else lvlBadge = `<span class="badge" style="background:#e2e8f0;color:#334155;font-weight:700;font-size:10px;">L${lvl}</span>`;

      let pic = String(r.pic || 'SEMUA').toUpperCase();
      if (pic === 'PERENCANAAN') pic = 'RENDATIN';
      if (pic === 'KEUANGAN') pic = 'KUL';
      if (pic === 'PARMAS') pic = 'PARSDM';
      let picBadge = `<span class="pic-chip pic-${pic}" style="font-size:10px;padding:1px 6px;">${pic}</span>`;
      if (pic === 'SEMUA') {
        picBadge = `<span class="badge badge-info" style="font-size:10px;">SEMUA PIC</span>`;
      }

      const mode = String(r.mode_akses || 'VIEWER').toUpperCase();
      let modeBadge = mode === 'EDITOR'
        ? `<span class="badge" style="background:#dcfce7;color:#166534;font-size:9.5px;font-weight:800;border:1px solid #bbf7d0;">EDITOR</span>`
        : `<span class="badge" style="background:#f1f5f9;color:#475569;font-size:9.5px;font-weight:700;border:1px solid #cbd5e1;">VIEWER</span>`;

      rolesHtml += `
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;background:#f8fafc;padding:3px 6px;border-radius:4px;border:1px solid #e2e8f0;">
          ${lvlBadge}
          ${picBadge}
          ${modeBadge}
          ${r.label_peran ? `<span style="font-size:10.5px;color:#475569;font-weight:500;">${escHtml(r.label_peran)}</span>` : ''}
          ${r.is_default ? `<span title="Peran Utama" style="font-size:11px;">⭐</span>` : ''}
        </div>
      `;
    });
    rolesHtml += `</div>`;

    // Status Badge
    const statusBadge = u.is_active
      ? `<span class="badge badge-success" style="font-size:11px;">Aktif</span>`
      : `<span class="badge badge-danger" style="font-size:11px;">Nonaktif</span>`;

    // Kolom Aksi Lengkap SAKTI (Edit, Aktif/Nonaktif, Hapus, Beralih)
    let aksiHtml = `<div style="display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap;justify-content:center;">`;
    if (isCurrent) {
      aksiHtml += `<button type="button" class="btn btn-xs btn-success" style="font-weight:700;pointer-events:none;">✅ Sesi Anda</button>`;
    } else {
      if (canManage) {
        // 1. Tombol Edit
        if (isDev || u.level > 0) {
          aksiHtml += `<button type="button" class="btn btn-xs btn-secondary" onclick="openEditUserModal(${u.id})" title="Edit Pengguna & Peran" style="display:inline-flex;align-items:center;gap:3px;font-weight:600;">✏️ Edit</button>`;
        }

        // 2. Tombol Aktifkan / Nonaktifkan User
        if (u.username !== 'emenje') {
          if (u.is_active) {
            aksiHtml += `<button type="button" class="btn btn-xs btn-outline-warning" onclick="toggleUserStatusAction(${u.id})" title="Nonaktifkan Pengguna" style="display:inline-flex;align-items:center;gap:3px;font-weight:600;">🔒 Nonaktifkan</button>`;
          } else {
            aksiHtml += `<button type="button" class="btn btn-xs btn-outline-success" onclick="toggleUserStatusAction(${u.id})" title="Aktifkan Kembali Pengguna" style="display:inline-flex;align-items:center;gap:3px;font-weight:600;">🔓 Aktifkan</button>`;
          }
        }

        // 3. Tombol Hapus User
        if (u.username !== 'emenje') {
          if (isDev || (isPerencanaan && u.level > 1)) {
            aksiHtml += `<button type="button" class="btn btn-xs btn-outline-danger" onclick="deleteUserAction(${u.id}, '${escHtml(u.username)}')" title="Hapus Pengguna Permanen" style="display:inline-flex;align-items:center;gap:3px;font-weight:600;">🗑️ Hapus</button>`;
          }
        }
      }

      // 4. Tombol Beralih Peran (Khusus Developer Level 0 untuk QC Bebas)
      if (isDeveloperSession()) {
        aksiHtml += `<button type="button" class="btn btn-xs btn-outline-primary" onclick="switchUser('${u.username}')" title="Beralih peran (Mode QC)" style="display:inline-flex;align-items:center;gap:3px;font-weight:600;">⚡ Beralih</button>`;
      }
    }
    aksiHtml += `</div>`;

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
          ${u.nip ? `<div style="font-size:11px;color:#64748b;font-family:var(--font-mono);margin-top:2px;">NIP: ${escHtml(u.nip)}</div>` : ''}
          ${u.email ? `<div style="font-size:11px;color:#0284c7;font-family:var(--font-mono);margin-top:2px;">📧 ${escHtml(u.email)}</div>` : ''}
        </td>
        <td style="color:#475569;">${escHtml(u.jabatan || '-')}</td>
        <td>${rolesHtml}</td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center">${aksiHtml}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  const sessionInfoEl = document.getElementById('users-active-session-info');
  if (sessionInfoEl && currentUser) {
    sessionInfoEl.innerHTML = `Sesi Aktif: <strong>${escHtml(currentUser.nama_pejabat)}</strong> (${escHtml(currentUser.username)}) &bull; [Level ${currentUser.level} - ${currentUser.mode_akses || 'VIEWER'}]`;
  }
}

function renderModalUserRolesTable() {
  const tbody = document.getElementById('modal-user-roles-tbody');
  if (!tbody) return;

  const roles = AppState.modalUserRoles || [];
  if (roles.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:14px;color:#94a3b8;">Belum ada peran terpasang. Tambahkan minimal satu peran di bawah.</td></tr>`;
    return;
  }

  let html = '';
  roles.forEach((r, idx) => {
    const lvl = Number(r.level);
    let lvlLabel = `Level ${lvl}`;
    if (lvl === 0) lvlLabel = `Level 0 (Developer)`;
    else if (lvl === 1) lvlLabel = `Level 1 (Perencana)`;
    else if (lvl === 2) lvlLabel = `Level 2 (Subbagian)`;
    else if (lvl === 3) lvlLabel = `Level 3 (Pimpinan Satker)`;
    else if (lvl === 4) lvlLabel = `Level 4 (Menu Eksklusif / Rekap)`;

    const mode = String(r.mode_akses || 'VIEWER').toUpperCase();
    const modeBadge = mode === 'EDITOR'
      ? `<span class="badge" style="background:#dcfce7;color:#166534;font-size:10px;font-weight:700;">EDITOR</span>`
      : `<span class="badge" style="background:#f1f5f9;color:#475569;font-size:10px;font-weight:700;">VIEWER</span>`;

    html += `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:6px 10px;text-align:center;font-weight:600;color:#64748b;">${idx + 1}</td>
        <td style="padding:6px 10px;font-weight:600;color:#0f172a;">${lvlLabel}</td>
        <td style="padding:6px 10px;"><span class="pic-chip pic-${r.pic}">${r.pic}</span></td>
        <td style="padding:6px 10px;">${modeBadge}</td>
        <td style="padding:6px 10px;color:#475569;">${escHtml(r.label_peran || '-')}</td>
        <td style="padding:6px 10px;text-align:center;">
          <input type="radio" name="modal_role_default" ${r.is_default ? 'checked' : ''} onchange="setDefaultModalRole(${idx})" title="Jadikan Peran Utama">
        </td>
        <td style="padding:6px 10px;text-align:center;">
          <button type="button" class="btn btn-xs btn-outline-danger" onclick="removeRoleFromModalUser(${idx})" title="Hapus Peran Ini" style="padding:2px 6px;">✕</button>
        </td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function onModalNewRoleLevelChange() {
  const lvl = Number(document.getElementById('modal-newrole-level')?.value);
  const picSelect = document.getElementById('modal-newrole-pic');
  const modeSelect = document.getElementById('modal-newrole-mode');

  if (lvl === 3 || lvl === 4) {
    if (picSelect) picSelect.value = 'SEMUA';
    if (modeSelect) modeSelect.value = 'VIEWER';
  } else if (lvl === 1 || lvl === 0) {
    if (picSelect) picSelect.value = 'SEMUA';
    if (modeSelect) modeSelect.value = 'EDITOR';
  } else if (lvl === 2) {
    if (picSelect && picSelect.value === 'SEMUA') picSelect.value = 'TEKNIS';
  }
}

function addRoleToModalUser() {
  const lvl = Number(document.getElementById('modal-newrole-level')?.value || 2);
  let pic = (document.getElementById('modal-newrole-pic')?.value || 'TEKNIS').toUpperCase();
  let mode = (document.getElementById('modal-newrole-mode')?.value || 'EDITOR').toUpperCase();
  const label = (document.getElementById('modal-newrole-label')?.value || '').trim();

  if (lvl === 3) {
    mode = 'VIEWER';
    pic = 'SEMUA';
  } else if (lvl === 1 || lvl === 0) {
    mode = 'EDITOR';
    pic = 'SEMUA';
  }

  // Cek duplikasi peran yang persis sama (level & pic sama)
  const exists = AppState.modalUserRoles.some(r => Number(r.level) === lvl && r.pic === pic);
  if (exists) {
    alert(`Peran dengan Level ${lvl} dan PIC ${pic} sudah ada dalam daftar pengguna ini.`);
    return;
  }

  const isFirst = AppState.modalUserRoles.length === 0;
  AppState.modalUserRoles.push({
    level: lvl,
    pic,
    mode_akses: mode,
    label_peran: label || (lvl === 0 ? 'Developer' : (lvl === 1 ? 'Perencana' : (lvl === 3 ? 'Pimpinan Satker' : (lvl === 4 ? 'Akses Eksklusif Rekap' : `Pelaksana ${pic}`)))),
    is_default: isFirst ? 1 : 0
  });

  const labelInput = document.getElementById('modal-newrole-label');
  if (labelInput) labelInput.value = '';

  renderModalUserRolesTable();
}

function removeRoleFromModalUser(idx) {
  if (AppState.modalUserRoles.length <= 1) {
    alert('Pengguna harus memiliki minimal satu peran kewenangan.');
    return;
  }
  const wasDefault = AppState.modalUserRoles[idx]?.is_default;
  AppState.modalUserRoles.splice(idx, 1);
  if (wasDefault && AppState.modalUserRoles.length > 0) {
    AppState.modalUserRoles[0].is_default = 1;
  }
  renderModalUserRolesTable();
}

function setDefaultModalRole(idx) {
  AppState.modalUserRoles.forEach((r, i) => {
    r.is_default = (i === idx) ? 1 : 0;
  });
  renderModalUserRolesTable();
}

function openAddUserModal() {
  setElText('modal-user-title', 'Tambah Pengguna Baru Satker');
  setElVal('modal-user-id', '');
  setElVal('modal-user-username', '');
  setElVal('modal-user-password', '');
  setElVal('modal-user-nama', '');
  setElVal('modal-user-nip', '');
  setElVal('modal-user-jabatan', '');
  setElVal('modal-user-email', '');
  setElVal('modal-user-status', '1');
  setElVal('modal-user-role-mode', 'SWITCH');

  AppState.modalUserRoles = [{
    level: 2,
    pic: 'TEKNIS',
    mode_akses: 'EDITOR',
    label_peran: 'Operator Subbag Teknis',
    is_default: 1
  }];

  document.getElementById('modal-user-username').readOnly = false;
  document.getElementById('modal-user-password').required = true;
  document.getElementById('modal-user-password-hint').style.display = 'none';

  renderModalUserRolesTable();
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
  setElVal('modal-user-nip', user.nip || '');
  setElVal('modal-user-jabatan', user.jabatan || '');
  setElVal('modal-user-email', user.email || '');
  setElVal('modal-user-status', String(user.is_active));
  setElVal('modal-user-role-mode', user.role_mode || 'SWITCH');

  if (Array.isArray(user.roles) && user.roles.length > 0) {
    AppState.modalUserRoles = JSON.parse(JSON.stringify(user.roles));
  } else {
    let defaultMode = (Number(user.level) === 0 || Number(user.level) === 1 || (Number(user.level) === 2 && !user.username.startsWith('divisi_'))) ? 'EDITOR' : 'VIEWER';
    AppState.modalUserRoles = [{
      level: Number(user.level),
      pic: user.pic_subbag || 'SEMUA',
      mode_akses: defaultMode,
      label_peran: user.jabatan || user.nama_pejabat,
      is_default: 1
    }];
  }

  document.getElementById('modal-user-username').readOnly = (user.username === 'emenje');
  document.getElementById('modal-user-password').required = false;
  document.getElementById('modal-user-password-hint').style.display = 'block';

  renderModalUserRolesTable();
  document.getElementById('modal-user').style.display = 'flex';
}

function closeUserModal() {
  document.getElementById('modal-user').style.display = 'none';
}

async function submitUserForm() {
  const id = document.getElementById('modal-user-id')?.value;
  const username = (document.getElementById('modal-user-username')?.value || '').trim();
  const nama_pejabat = (document.getElementById('modal-user-nama')?.value || '').trim();

  if (!username) {
    alert('Username tidak boleh kosong.');
    return;
  }
  if (!nama_pejabat) {
    alert('Nama lengkap / pejabat tidak boleh kosong.');
    return;
  }
  if (!AppState.modalUserRoles || AppState.modalUserRoles.length === 0) {
    alert('Pengguna wajib memiliki minimal satu peran (Level, PIC, Mode Akses).');
    return;
  }

  const payload = {
    id: id ? Number(id) : undefined,
    username,
    password: document.getElementById('modal-user-password')?.value || undefined,
    nama_pejabat,
    nip: document.getElementById('modal-user-nip')?.value || '',
    jabatan: document.getElementById('modal-user-jabatan')?.value || '',
    email: document.getElementById('modal-user-email')?.value?.trim()?.toLowerCase() || '',
    is_active: Number(document.getElementById('modal-user-status')?.value || 1),
    role_mode: document.getElementById('modal-user-role-mode')?.value || 'SWITCH',
    roles: AppState.modalUserRoles
  };

  try {
    const res = await apiFetch('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    showToast(res.message || 'Pengguna berhasil disimpan.', 'success');
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
    showToast(res.message || `Pengguna "${username}" berhasil dihapus.`, 'success');
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
    showToast(res.message || 'Status pengguna berhasil diperbarui.', 'success');
    await loadUsers();
  } catch (err) {
    alert('Gagal mengubah status: ' + err.message);
  }
}

// ============================================================================
// MODUL ADMINISTRASI: PEJABAT PENANDATANGAN DOKUMEN SATKER (BAB 22 CANON)
// ============================================================================

AppState.penandatanganList = [];
AppState.penandatanganFilter = 'ALL';
AppState.penandatanganSearch = '';

async function loadPenandatanganView() {
  const tbody = document.getElementById('penandatangan-table-body');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 24px; color: #64748b;">Memuat data pejabat penandatangan...</td></tr>';
  }

  try {
    const res = await apiFetch('/api/administrasi/penandatangan');
    AppState.penandatanganList = res.data || [];
    renderPenandatanganTable();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = '<tr' + '><td colspan="9" class="text-center text-danger" style="padding: 24px;">Gagal memuat data: ' + escHtml(err.message) + '</td></tr>';
    }
  }
}

function renderPenandatanganTable(filterKategori = null) {
  const tbody = document.getElementById('penandatangan-table-body');
  if (!tbody) return;

  if (filterKategori !== null) {
    AppState.penandatanganFilter = filterKategori;
  }

  const activeFilter = AppState.penandatanganFilter || 'ALL';
  const search = (AppState.penandatanganSearch || '').toLowerCase().trim();

  const tabContainer = document.getElementById('filter-penandatangan-tabs');
  if (tabContainer) {
    tabContainer.querySelectorAll('button[data-filter]').forEach(btn => {
      const isAct = btn.getAttribute('data-filter') === activeFilter;
      btn.className = isAct ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary';
    });
  }

  let list = AppState.penandatanganList || [];

  if (activeFilter === 'KEUANGAN_LEMBAGA') {
    list = list.filter(p => p.kategori === 'LEMBAGA' || p.kategori === 'KEUANGAN');
  } else if (activeFilter === 'KOMISIONER') {
    list = list.filter(p => p.kategori === 'KOMISIONER');
  } else if (activeFilter === 'SUBBAGIAN') {
    list = list.filter(p => p.kategori === 'SUBBAGIAN');
  }

  if (search) {
    list = list.filter(p => {
      const n = (p.nama_pejabat || '').toLowerCase();
      const nip = (p.nip || '').toLowerCase();
      const j = (p.jabatan_penandatangan || '').toLowerCase();
      const jd = (p.jabatan_dinas || '').toLowerCase();
      const u = (p.username_terkait || '').toLowerCase();
      return n.includes(search) || nip.includes(search) || j.includes(search) || jd.includes(search) || u.includes(search);
    });
  }

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 24px; color: #64748b;">Tidak ada data penandatangan yang cocok dengan kriteria filter.</td></tr>';
    return;
  }

  const currentUser = AppState.currentUser;
  const canEdit = currentUser && (currentUser.level <= 1 || currentUser.username === 'emenje');

  tbody.innerHTML = list.map((p, idx) => {
    let katBadge = '';
    if (p.kategori === 'LEMBAGA') {
      katBadge = '<span class="badge" style="background:#0f172a; color:#fff;">LEMBAGA</span>';
    } else if (p.kategori === 'KEUANGAN') {
      katBadge = '<span class="badge" style="background:#0284c7; color:#fff;">KEUANGAN</span>';
    } else if (p.kategori === 'KOMISIONER') {
      katBadge = '<span class="badge" style="background:#7c3aed; color:#fff;">KOMISIONER</span>';
    } else {
      katBadge = '<span class="badge" style="background:#059669; color:#fff;">SUBBAGIAN</span>';
    }

    const linkedUserBadge = p.username_terkait
      ? '<span class="badge badge-info" style="font-family:var(--font-mono); font-size:11px;">@' + escHtml(p.username_terkait) + '</span>'
      : '<span style="color:#94a3b8; font-size:11px;">(Lepas)</span>';

    return `
      <tr>
        <td class="text-center" style="font-size:11.5px; color:#64748b;">${idx + 1}</td>
        <td class="text-center">${katBadge}</td>
        <td>
          <div style="font-weight:700; color:#0f172a; font-size:12.5px;">${escHtml(p.jabatan_penandatangan)}</div>
          <div style="font-size:11px; color:#64748b; margin-top:2px;">${escHtml(p.deskripsi || '')}</div>
        </td>
        <td><strong style="color:#1e3a8a;">${escHtml(p.nama_pejabat)}</strong></td>
        <td style="font-family:var(--font-mono); font-size:11.5px;">${escHtml(p.nip || '-')}</td>
        <td style="font-size:12px; color:#334155;">${escHtml(p.jabatan_dinas || '-')}</td>
        <td class="text-center">${linkedUserBadge}</td>
        <td class="text-center">
          <span class="badge badge-success" style="font-size:10.5px;">Aktif</span>
        </td>
        <td class="text-center">
          ${canEdit ? `
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="openEditPenandatanganModal('${escHtml(p.id)}')" style="padding:2px 8px; font-size:11.5px;">
              ✏️ Edit
            </button>
          ` : '<span style="color:#94a3b8; font-size:11px;">-</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

function filterPenandatanganTable(kategori) {
  renderPenandatanganTable(kategori);
}

function handleSearchPenandatangan(val) {
  AppState.penandatanganSearch = val;
  renderPenandatanganTable();
}

function openEditPenandatanganModal(id) {
  const item = (AppState.penandatanganList || []).find(p => p.id === id);
  if (!item) return;

  document.getElementById('edit-ttd-id').value = item.id;
  document.getElementById('edit-ttd-jabatan-label').value = item.jabatan_penandatangan;
  document.getElementById('edit-ttd-nama').value = item.nama_pejabat === '-' ? '' : item.nama_pejabat;
  document.getElementById('edit-ttd-nip').value = item.nip === '-' ? '' : item.nip;
  document.getElementById('edit-ttd-jabatan-dinas').value = item.jabatan_dinas;

  const userSelect = document.getElementById('edit-ttd-user-select');
  if (userSelect) {
    const users = AppState.usersList || [];
    userSelect.innerHTML = '<option value="">-- Tidak Ditautkan ke Akun --</option>' + users.map(u => {
      const isSel = (item.username_terkait === u.username);
      return `<option value="${escHtml(u.username)}" ${isSel ? 'selected' : ''}>@${escHtml(u.username)} - ${escHtml(u.nama_pejabat || u.username)} (${escHtml(u.jabatan || 'User')})</option>`;
    }).join('');
  }

  const modal = document.getElementById('modal-edit-penandatangan');
  if (modal) modal.style.display = 'flex';
}

function closeEditPenandatanganModal() {
  const modal = document.getElementById('modal-edit-penandatangan');
  if (modal) modal.style.display = 'none';
}

function handlePenandatanganUserSelect(username) {
  if (!username) return;
  const user = (AppState.usersList || []).find(u => u.username === username);
  if (user && user.nama_pejabat && !user.nama_pejabat.toLowerCase().startsWith('kasubbag') && !user.nama_pejabat.toLowerCase().startsWith('ketua')) {
    document.getElementById('edit-ttd-nama').value = user.nama_pejabat;
    if (user.jabatan) {
      document.getElementById('edit-ttd-jabatan-dinas').value = user.jabatan;
    }
  }
}

async function savePenandatanganModal(e) {
  if (e) e.preventDefault();
  const id = document.getElementById('edit-ttd-id').value;
  const nama = document.getElementById('edit-ttd-nama').value.trim();
  const nip = document.getElementById('edit-ttd-nip').value.trim();
  const jabatan = document.getElementById('edit-ttd-jabatan-dinas').value.trim();
  const username = document.getElementById('edit-ttd-user-select').value;

  const btn = document.getElementById('btn-save-penandatangan');
  if (btn) btn.disabled = true;

  try {
    const res = await apiFetch('/api/administrasi/penandatangan/update', {
      method: 'POST',
      body: JSON.stringify({
        id,
        nama_pejabat: nama,
        nip,
        jabatan_dinas: jabatan,
        username_terkait: username
      })
    });

    showToast(res.message || 'Pejabat penandatangan berhasil diperbarui.', 'success');
    closeEditPenandatanganModal();
    await loadPenandatanganView();
    if (typeof loadUsers === 'function') await loadUsers();
  } catch (err) {
    showToast('Gagal menyimpan penandatangan: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function syncPenandatanganToUsers() {
  if (!confirm('Apakah Anda ingin menyinkronkan profil nama pejabat pada seluruh Akun Pengguna berdasarkan data Pejabat Penandatangan Sah?')) {
    return;
  }

  const btn = document.getElementById('btn-sync-penandatangan');
  if (btn) btn.disabled = true;

  try {
    const res = await apiFetch('/api/administrasi/penandatangan/sync-users', {
      method: 'POST'
    });
    showToast(res.message || 'Sinkronisasi berhasil dilakukan.', 'success');
    await loadPenandatanganView();
    if (typeof loadUsers === 'function') await loadUsers();
  } catch (err) {
    showToast('Gagal sinkronisasi: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Registrasi global
window.loadPenandatanganView = loadPenandatanganView;
window.renderPenandatanganTable = renderPenandatanganTable;
window.filterPenandatanganTable = filterPenandatanganTable;
window.handleSearchPenandatangan = handleSearchPenandatangan;
window.openEditPenandatanganModal = openEditPenandatanganModal;
window.closeEditPenandatanganModal = closeEditPenandatanganModal;
window.handlePenandatanganUserSelect = handlePenandatanganUserSelect;
window.savePenandatanganModal = savePenandatanganModal;
window.syncPenandatanganToUsers = syncPenandatanganToUsers;

// ============================================================================
// VIEW: RUANG PENGEMBANG & BLUEPRINT PRD ARSITEKTUR (LEAD DEVELOPER ONLY)
// ============================================================================

let currentBlueprintRawContent = '';

function renderMarkdownToHtml(md) {
  if (!md) return '<p class="text-muted">Dokumen kosong.</p>';
  
  const escape = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  const lines = md.split('\n');
  let html = '';
  let inCodeBlock = false;
  let inTable = false;
  let inUl = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += '</code></pre>\n';
        inCodeBlock = false;
      } else {
        html += '<pre style="background:#0f172a;color:#f8fafc;padding:12px;border-radius:8px;overflow-x:auto;font-family:var(--font-mono, monospace);font-size:12px;margin:12px 0;"><code>';
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      html += escape(line) + '\n';
      continue;
    }

    // Tables
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').slice(1, -1);
      if (cells.every(c => /^[\s-:]+$/.test(c))) {
        continue;
      }
      if (!inTable) {
        html += '<div style="overflow-x:auto;margin:12px 0;"><table class="table table-bordered table-striped" style="font-size:12.5px;background:#fff;width:100%;"><tbody>';
        inTable = true;
      }
      html += '<tr>' + cells.map(c => `<td style="padding:6px 10px;">${inlineFormat(escape(c.trim()))}</td>`).join('') + '</tr>';
      continue;
    } else if (inTable) {
      html += '</tbody></table></div>\n';
      inTable = false;
    }

    // Unordered List
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inUl) { html += '<ul style="margin:6px 0 10px 20px;padding:0;">'; inUl = true; }
      const content = line.replace(/^\s*[-*]\s+/, '');
      html += `<li style="margin-bottom:4px;">${inlineFormat(escape(content))}</li>`;
      continue;
    } else if (inUl) {
      html += '</ul>';
      inUl = false;
    }

    // Headers
    if (line.startsWith('# ')) {
      html += `<h1 style="font-size:22px;color:#0f172a;border-bottom:2px solid #cbd5e1;padding-bottom:8px;margin-top:24px;margin-bottom:12px;">${inlineFormat(escape(line.substring(2)))}</h1>`;
      continue;
    }
    if (line.startsWith('## ')) {
      html += `<h2 style="font-size:17px;color:#1e293b;border-bottom:1px solid #e2e8f0;padding-bottom:6px;margin-top:20px;margin-bottom:10px;">${inlineFormat(escape(line.substring(3)))}</h2>`;
      continue;
    }
    if (line.startsWith('### ')) {
      html += `<h3 style="font-size:14.5px;color:#334155;margin-top:16px;margin-bottom:8px;font-weight:700;">${inlineFormat(escape(line.substring(4)))}</h3>`;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      html += `<blockquote style="border-left:4px solid #3b82f6;background:#eff6ff;padding:8px 14px;margin:10px 0;border-radius:0 6px 6px 0;color:#1e40af;">${inlineFormat(escape(line.substring(2)))}</blockquote>`;
      continue;
    }

    // Horizontal Rule
    if (/^---|\*\*\*|___$/.test(line.trim())) {
      html += '<hr style="border:0;border-top:1px solid #e2e8f0;margin:16px 0;">';
      continue;
    }

    // Paragraph
    if (line.trim().length > 0) {
      html += `<p style="margin-bottom:8px;">${inlineFormat(escape(line))}</p>`;
    }
  }

  if (inCodeBlock) html += '</code></pre>\n';
  if (inTable) html += '</tbody></table></div>\n';
  if (inUl) html += '</ul>';

  return html;
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;color:#0f172a;padding:2px 5px;border-radius:4px;font-size:12px;font-family:var(--font-mono, monospace);">$1</code>');
}

async function loadDeveloperBlueprint() {
  if (!isActiveDeveloperUser()) return;
  const container = document.getElementById('dev-blueprint-formatted-view');
  const textarea = document.getElementById('dev-blueprint-raw-textarea');
  const mtimeEl = document.getElementById('dev-blueprint-mtime');
  if (!container) return;

  container.innerHTML = '<div style="text-align: center; padding: 30px; color: #64748b;"><span>Memuat dokumen Blueprint &amp; PRD dari server...</span></div>';

  try {
    const res = await apiFetch('/api/developer/blueprint?_t=' + Date.now());
    if (res && res.success) {
      currentBlueprintRawContent = res.content || '';
      if (textarea) textarea.value = currentBlueprintRawContent;
      container.innerHTML = renderMarkdownToHtml(currentBlueprintRawContent);
      if (mtimeEl && res.last_modified) {
        const d = new Date(res.last_modified);
        mtimeEl.textContent = 'Terakhir disinkronkan: ' + d.toLocaleDateString('id-ID') + ' ' + d.toLocaleTimeString('id-ID');
      }
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger" style="margin: 20px 0;">Gagal memuat blueprint: ${escHtml(err.message)}</div>`;
  }
}

function toggleRawBlueprintView() {
  const formatted = document.getElementById('dev-blueprint-formatted-view');
  const raw = document.getElementById('dev-blueprint-raw-view');
  const btn = document.getElementById('btn-toggle-raw-blueprint');
  if (!formatted || !raw) return;

  const isRawVisible = raw.style.display !== 'none';
  if (isRawVisible) {
    raw.style.display = 'none';
    formatted.style.display = 'block';
    if (btn) btn.textContent = '👁️ Tampilkan Raw Markdown';
    const textarea = document.getElementById('dev-blueprint-raw-textarea');
    if (textarea && textarea.value !== currentBlueprintRawContent) {
      currentBlueprintRawContent = textarea.value;
      formatted.innerHTML = renderMarkdownToHtml(currentBlueprintRawContent);
    }
  } else {
    raw.style.display = 'block';
    formatted.style.display = 'none';
    if (btn) btn.textContent = '👁️ Tampilkan Dokumen Rapi';
    const textarea = document.getElementById('dev-blueprint-raw-textarea');
    if (textarea) textarea.value = currentBlueprintRawContent;
  }
}

async function saveDeveloperBlueprint() {
  if (!isActiveDeveloperUser()) return;
  const textarea = document.getElementById('dev-blueprint-raw-textarea');
  if (!textarea) return;

  const newContent = textarea.value;
  try {
    const res = await apiFetch('/api/developer/blueprint', {
      method: 'POST',
      body: JSON.stringify({ content: newContent })
    });
    showToast(res.message || 'Blueprint berhasil disimpan.', 'success');
    currentBlueprintRawContent = newContent;
    toggleRawBlueprintView();
    await loadDeveloperBlueprint();
  } catch (err) {
    showToast('Gagal menyimpan blueprint: ' + err.message, 'error');
  }
}

window.loadDeveloperBlueprint = loadDeveloperBlueprint;
window.toggleRawBlueprintView = toggleRawBlueprintView;
window.saveDeveloperBlueprint = saveDeveloperBlueprint;

// ============================================================================
// WORKFLOW REVISI & PLENO SUBBAGIAN
// ============================================================================

async function loadRkbWorkflowData(forceRender = false) {
  if (!AppState.currentPeriode) return;
  const periodeId = AppState.currentPeriode.id;
  try {
    AppState.rkbWorkflowData = await apiFetch(`/api/rkb/${periodeId}/usulan-subbag`);
    if (forceRender) {
      renderRkbWorkflow();
    }
  } catch (err) {
    console.warn('Gagal memuat status alur revisi subbag:', err);
  }
}

function renderRkbWorkflow() {
  const container = document.getElementById('rkb-workflow-container');
  if (!container) return;

  if (!AppState.rkbData || !AppState.currentPeriode) {
    container.innerHTML = '';
    return;
  }

  const periode = AppState.rkbData.periode;
  const isLocked = Boolean(periode.is_locked);
  const user = AppState.currentUser || {};
  const isLevel1 = (user.role === 'admin' || user.level === 1);
  const isLevel3 = (user.level === 3);
  const wfData = AppState.rkbWorkflowData;
  const usulanList = (wfData && wfData.usulan_list) ? wfData.usulan_list : [];
  const stats = (wfData && wfData.stats) ? wfData.stats : { total: 5, draft: 5, diajukan: 0, valid: 0, dikembalikan: 0, disetujui: 0 };

  // If locked, render an official Pleno/Lock banner
  if (isLocked) {
    const gdrivePlenoLink = periode.gdrive_link_pleno || (wfData && wfData.gdrive_link_pleno);
    const catatanPleno = periode.catatan_pleno || periode.catatan_revisi || (wfData && wfData.catatan_pleno);
    const dasarPengesahan = periode.dasar_pengesahan || 'BA Pleno KPU';
    const nomorBa = periode.nomor_ba_tapd || '-';
    const tanggalBa = periode.tanggal_ba_tapd || '-';

    container.innerHTML = `
      <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="font-size: 24px;">🔒</div>
          <div>
            <div style="font-size: 13px; font-weight: 700; color: #1e293b; display: flex; align-items: center; gap: 8px;">
              <span>DOKUMEN TERKUNCI (HASIL SIDANG PLENO KPU)</span>
              <span class="badge badge-danger">LOCKED</span>
            </div>
            <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">
              Dasar: <b>${escapeHtml(dasarPengesahan)}</b> &bull; No: <b>${escapeHtml(nomorBa)}</b> (${escapeHtml(tanggalBa)})
              ${catatanPleno ? ` &bull; Catatan: <i>${escapeHtml(catatanPleno)}</i>` : ''}
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          ${gdrivePlenoLink ? `
            <a href="${escapeHtml(gdrivePlenoLink)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary" style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
              📂 Berkas BA Pleno / SK (GDrive) ↗
            </a>
          ` : ''}
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="openModalMatriks('SEMUA')" style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
            📊 Matriks Semula-Menjadi
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Active Draft Workflow:
  // CASE A: User is Operator Subbag (Level 2 with specific PIC, not Level 1 and not Level 3)
  if (!isLevel1 && !isLevel3 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
    const mySubbag = user.pic_subbag;
    const subbagMeta = SUBBAG_META[mySubbag] || { name: mySubbag, color: '#3b82f6' };
    const myUsulan = usulanList.find(u => u.subbag_kode === mySubbag) || {
      subbag_kode: mySubbag,
      status_usulan: 'DRAFT',
      gdrive_link: '',
      catatan_usulan: '',
      catatan_koreksi: '',
      catatan_pleno: ''
    };

    let statusBadge = '<span class="badge badge-secondary">⚪ DRAFT PIC</span>';
    let bgGradient = '#f0f9ff';
    let borderColor = '#bae6fd';
    let actionBtnHtml = '';

    if (myUsulan.status_usulan === 'DIAJUKAN') {
      statusBadge = '<span class="badge badge-warning" style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d;">🟡 DIAJUKAN KE RENDATIN</span>';
      bgGradient = '#fffdf5';
      borderColor = '#fef08a';
      actionBtnHtml = `
        <button type="button" class="btn btn-sm btn-outline-warning" onclick="openModalAjukanUsulan('${mySubbag}')" style="font-weight:600;">
          ✏️ Perbarui Link / Catatan
        </button>
      `;
    } else if (myUsulan.status_usulan === 'VALID') {
      statusBadge = '<span class="badge badge-success" style="background:#dcfce7; color:#166534; border:1px solid #86efac;">🟢 VALID (BAHAN PLENO)</span>';
      bgGradient = '#f0fdf4';
      borderColor = '#bbf7d0';
    } else if (myUsulan.status_usulan === 'DIKEMBALIKAN' || myUsulan.status_usulan === 'DITOLAK_PLENO') {
      statusBadge = '<span class="badge badge-danger" style="background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;">🔴 PERLU KOREKSI (DIKEMBALIKAN)</span>';
      bgGradient = '#fff5f5';
      borderColor = '#fecaca';
      actionBtnHtml = `
        <button type="button" class="btn btn-sm btn-danger" onclick="openModalAjukanUsulan('${mySubbag}')" style="font-weight:600;">
          🔁 Ajukan Ulang Revisi
        </button>
      `;
    } else {
      // DRAFT
      actionBtnHtml = `
        <button type="button" class="btn btn-sm btn-primary" onclick="openModalAjukanUsulan('${mySubbag}')" style="font-weight:600; box-shadow: 0 1px 2px rgba(37,99,235,0.2);">
          🚀 Ajukan Usulan Revisi (Link GDrive)
        </button>
      `;
    }

    container.innerHTML = `
      <div style="background: ${bgGradient}; border: 1.5px solid ${borderColor}; border-radius: 8px; padding: 10px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 24px;">📁</div>
            <div>
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 13px; font-weight: 700; color: #0f172a;">Alur Usulan Revisi: Subbag ${escapeHtml(subbagMeta.name)}</span>
                ${statusBadge}
              </div>
              <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">
                ${myUsulan.status_usulan === 'DIAJUKAN' ? 'Usulan dan bukti dukung telah terkirim ke Tim Rendatin. Sedang dalam proses verifikasi dan komparasi matriks.' :
                  myUsulan.status_usulan === 'VALID' ? 'Usulan telah dinyatakan VALID oleh Tim Rendatin dan siap dibahas dalam Sidang Pleno Komisioner.' :
                  (myUsulan.status_usulan === 'DIKEMBALIKAN' || myUsulan.status_usulan === 'DITOLAK_PLENO') ? '<span style="color:#b91c1c; font-weight:600;">Harap segera diperbaiki sesuai catatan pengembalian di bawah, lalu upload ulang berkas dan ajukan kembali.</span>' :
                  'Silakan sesuaikan rincian RKB subbag Anda, unduh Excel revisi, cetak dan ttd, scan PDF, upload 2 berkas ke Google Drive, lalu ajukan.'}
              </div>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            ${myUsulan.gdrive_link ? `
              <a href="${escapeHtml(myUsulan.gdrive_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary" style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
                📂 Folder GDrive Bukti Dukung ↗
              </a>
            ` : ''}
            ${actionBtnHtml}
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick="openModalMatriks('${mySubbag}')" style="font-weight: 600;">
              📊 Matriks Semula-Menjadi
            </button>
          </div>
        </div>

        ${(myUsulan.status_usulan === 'DIKEMBALIKAN' || myUsulan.status_usulan === 'DITOLAK_PLENO') && (myUsulan.catatan_koreksi || myUsulan.alasan_pengembalian) ? `
          <div style="margin-top: 8px; padding: 7px 12px; background: #fee2e2; border-left: 3px solid #dc2626; border-radius: 4px; font-size: 12px; color: #7f1d1d;">
            <strong>⚠️ Catatan Pengembalian dari Tim Rendatin / Pleno:</strong> ${escapeHtml(myUsulan.catatan_koreksi || myUsulan.alasan_pengembalian)}
          </div>
        ` : ''}

        ${myUsulan.catatan_pleno ? `
          <div style="margin-top: 8px; padding: 7px 12px; background: #e0f2fe; border-left: 3px solid #0284c7; border-radius: 4px; font-size: 12px; color: #0369a1;">
            <strong>📝 Catatan Arahan Pleno Komisioner:</strong> ${escapeHtml(myUsulan.catatan_pleno)}
          </div>
        ` : ''}
      </div>
    `;
    return;
  }

  // CASE B: User is Level 1 (Tim Rendatin / Perencanaan / Admin) OR Level 3 (Ketua, Sekretaris, Komisioner)
  // Display 5 Subbag Workflow Control Panel & Plenary Session Hub
  const subbagKeys = ['KUL', 'RENDATIN', 'TEKNIS', 'HUKUM', 'PARSDM'];

  const rowsHtml = subbagKeys.map(code => {
    const meta = SUBBAG_META[code] || { name: code, color: '#64748b' };
    const usulan = usulanList.find(u => u.subbag_kode === code) || {
      subbag_kode: code,
      status_usulan: 'DRAFT',
      gdrive_link: '',
      catatan_usulan: '',
      catatan_koreksi: '',
      catatan_pleno: ''
    };

    let badge = '<span class="badge badge-secondary" style="font-size:10.5px;">⚪ DRAFT</span>';
    if (usulan.status_usulan === 'DIAJUKAN') {
      badge = '<span class="badge badge-warning" style="font-size:10.5px; background:#fef3c7; color:#92400e; border:1px solid #fcd34d;">🟡 DIAJUKAN</span>';
    } else if (usulan.status_usulan === 'VALID') {
      badge = '<span class="badge badge-success" style="font-size:10.5px; background:#dcfce7; color:#166534; border:1px solid #86efac;">🟢 VALID PLENO</span>';
    } else if (usulan.status_usulan === 'DIKEMBALIKAN' || usulan.status_usulan === 'DITOLAK_PLENO') {
      badge = '<span class="badge badge-danger" style="font-size:10.5px; background:#fee2e2; color:#991b1b; border:1px solid #fca5a5;">🔴 DIKEMBALIKAN</span>';
    }

    const gdriveBtn = usulan.gdrive_link ? `
      <a href="${escapeHtml(usulan.gdrive_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-xs btn-outline-primary" style="font-weight:600; padding: 2px 7px; font-size:11px;" title="Buka Google Drive (Excel Revisi + Scan PDF ttd)">
        📂 Bukti Dukung ↗
      </a>
    ` : '<span style="color:#94a3b8; font-size:11px; font-style:italic;">Belum ada link</span>';

    // Notes summary
    let noteText = '-';
    if ((usulan.status_usulan === 'DIKEMBALIKAN' || usulan.status_usulan === 'DITOLAK_PLENO') && (usulan.catatan_koreksi || usulan.alasan_pengembalian)) {
      const kor = usulan.catatan_koreksi || usulan.alasan_pengembalian;
      noteText = `<span style="color:#dc2626; font-size:11px;" title="${escapeHtml(kor)}">⚠️ Koreksi: ${escapeHtml(kor.length > 35 ? kor.slice(0, 35) + '...' : kor)}</span>`;
    } else if (usulan.catatan_pleno) {
      noteText = `<span style="color:#0284c7; font-size:11px;" title="${escapeHtml(usulan.catatan_pleno)}">📝 Pleno: ${escapeHtml(usulan.catatan_pleno.length > 35 ? usulan.catatan_pleno.slice(0, 35) + '...' : usulan.catatan_pleno)}</span>`;
    } else if (usulan.catatan_usulan) {
      noteText = `<span style="color:#475569; font-size:11px;" title="${escapeHtml(usulan.catatan_usulan)}">${escapeHtml(usulan.catatan_usulan.length > 35 ? usulan.catatan_usulan.slice(0, 35) + '...' : usulan.catatan_usulan)}</span>`;
    }

    // Actions (Only for Level 1)
    let actionButtons = '';
    if (isLevel1) {
      if (usulan.status_usulan === 'DIAJUKAN') {
        actionButtons = `
          <button type="button" class="btn btn-xs btn-success" onclick="validasiUsulanSubbag('${code}')" title="Nyatakan berkas valid untuk dibahas di Sidang Pleno" style="padding: 2px 7px; font-size: 11px; font-weight:600;">
            ✅ Nyatakan Valid
          </button>
          <button type="button" class="btn btn-xs btn-outline-danger" onclick="openModalKembalikanUsulan('${code}', '${escapeHtml(meta.name)}')" title="Kembalikan ke Operator PIC jika ada catatan besar" style="padding: 2px 7px; font-size: 11px;">
            ↩️ Kembalikan
          </button>
        `;
      } else if (usulan.status_usulan === 'VALID') {
        actionButtons = `
          <button type="button" class="btn btn-xs btn-primary" onclick="openModalCatatanPleno('${code}', '${escapeHtml(meta.name)}')" title="Input catatan atau putusan sidang pleno" style="padding: 2px 7px; font-size: 11px; font-weight:600;">
            📝 Catatan Pleno
          </button>
          <button type="button" class="btn btn-xs btn-outline-danger" onclick="openModalKembalikanUsulan('${code}', '${escapeHtml(meta.name)}')" title="Kembalikan jika ditolak Pleno" style="padding: 2px 7px; font-size: 11px;">
            ↩️ Kembalikan
          </button>
        `;
      } else if (usulan.status_usulan === 'DIKEMBALIKAN' || usulan.status_usulan === 'DITOLAK_PLENO') {
        actionButtons = `<span style="color:#dc2626; font-size:11px; font-weight:600;">Menunggu Koreksi</span>`;
      } else {
        // DRAFT
        actionButtons = `
          <button type="button" class="btn btn-xs btn-outline-secondary" onclick="openModalAjukanUsulan('${code}')" title="Bantu input pengajuan usulan subbag" style="padding: 2px 6px; font-size: 11px;">
            ➕ Input Link
          </button>
        `;
      }
    } else {
      // Level 3 (Komisioner & Sekretaris)
      actionButtons = `<span style="color:#64748b; font-size:11px;">Read-Only</span>`;
    }

    return `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 6px 10px; font-weight: 700;">
          <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${meta.color}; margin-right:6px; vertical-align:middle;"></span>
          ${code}
          <span style="font-weight:400; font-size:11px; color:#64748b; margin-left:4px;">(${escapeHtml(meta.name.split('(')[0].trim())})</span>
        </td>
        <td style="padding: 6px 10px;">${badge}</td>
        <td style="padding: 6px 10px;">${gdriveBtn}</td>
        <td style="padding: 6px 10px;">${noteText}</td>
        <td style="padding: 6px 10px; text-align: right;">${actionButtons}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <strong style="font-size: 13px; color: #1e293b;">📋 Alur Usulan Revisi &amp; Sidang Pleno (5 Subbagian)</strong>
          <span class="badge" style="background:#dcfce7; color:#166534; font-size:11px;">🟢 ${stats.valid || 0} Valid</span>
          <span class="badge" style="background:#fef3c7; color:#92400e; font-size:11px;">🟡 ${stats.diajukan || 0} Diajukan</span>
          <span class="badge" style="background:#fee2e2; color:#991b1b; font-size:11px;">🔴 ${stats.dikembalikan || 0} Dikembalikan</span>
          <span class="badge badge-secondary" style="font-size:11px;">⚪ ${stats.draft || 0} Draft</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="btn btn-sm btn-outline-primary" onclick="openModalMatriks('SEMUA')" style="display: inline-flex; align-items: center; gap: 4px; font-weight: 600;">
            📊 Matriks Semula-Menjadi (By System)
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="loadRkbWorkflowData(true)" title="Segarkan status usulan" style="padding: 4px 8px;">
            🔄
          </button>
        </div>
      </div>

      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #f8fafc; border-bottom: 1.5px solid #e2e8f0; text-align: left; color: #475569; font-size: 11.5px;">
              <th style="padding: 6px 10px; width: 230px;">Subbagian Pengusul</th>
              <th style="padding: 6px 10px; width: 130px;">Status</th>
              <th style="padding: 6px 10px; width: 140px;">Bukti Dukung (GDrive)</th>
              <th style="padding: 6px 10px;">Catatan / Uraian</th>
              <th style="padding: 6px 10px; text-align: right; width: 190px;">Aksi Rendatin &amp; Pleno</th>
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

function openModalAjukanUsulan(subbagKode) {
  const user = AppState.currentUser || {};
  const targetKode = subbagKode || (user.pic_subbag !== 'SEMUA' ? user.pic_subbag : 'KUL');
  const meta = SUBBAG_META[targetKode] || { name: targetKode };
  
  const wfData = AppState.rkbWorkflowData;
  const usulan = (wfData && wfData.usulan_list) ? wfData.usulan_list.find(u => u.subbag_kode === targetKode) : null;

  setElVal('ajukan-subbag-kode', targetKode);
  setElVal('ajukan-subbag-label', `${targetKode} - ${meta.name}`);
  setElVal('ajukan-gdrive-link', usulan ? usulan.gdrive_link || '' : '');
  setElVal('ajukan-catatan', usulan ? usulan.catatan_usulan || '' : '');

  const modal = document.getElementById('modal-ajukan-usulan');
  if (modal) modal.style.display = 'flex';
}

function closeModalAjukanUsulan() {
  const modal = document.getElementById('modal-ajukan-usulan');
  if (modal) modal.style.display = 'none';
}

async function submitModalAjukanUsulan() {
  const periodeId = AppState.currentPeriode ? AppState.currentPeriode.id : null;
  if (!periodeId) return alert('Periode anggaran aktif tidak ditemukan.');

  const subbag_kode = document.getElementById('ajukan-subbag-kode')?.value;
  const gdrive_link = document.getElementById('ajukan-gdrive-link')?.value?.trim();
  const catatan_usulan = document.getElementById('ajukan-catatan')?.value?.trim();

  if (!subbag_kode) return alert('Subbagian pengusul tidak valid.');
  if (!gdrive_link) return alert('Tautan/Link Google Drive bukti dukung wajib diisi.');
  if (!gdrive_link.startsWith('http://') && !gdrive_link.startsWith('https://')) {
    return alert('Format link Google Drive harus diawali dengan http:// atau https://');
  }

  try {
    const res = await apiFetch(`/api/rkb/${periodeId}/usulan-subbag/ajukan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subbag_kode, gdrive_link, catatan_usulan })
    });
    alert(res.message || 'Usulan revisi subbag berhasil diajukan.');
    closeModalAjukanUsulan();
    await loadRkbWorkflowData(true);
  } catch (err) {
    alert('Gagal mengajukan usulan: ' + err.message);
  }
}

async function validasiUsulanSubbag(subbagKode) {
  const periodeId = AppState.currentPeriode ? AppState.currentPeriode.id : null;
  if (!periodeId) return;

  const konfirmasi = confirm(`Nyatakan VALID usulan revisi Subbag ${subbagKode}?\n\nSetelah dinyatakan valid, usulan ini resmi masuk sebagai bahan pertimbangan Sidang Pleno Komisioner.`);
  if (!konfirmasi) return;

  try {
    const res = await apiFetch(`/api/rkb/${periodeId}/usulan-subbag/validasi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subbag_kode: subbagKode })
    });
    alert(res.message || `Usulan Subbag ${subbagKode} dinyatakan valid.`);
    await loadRkbWorkflowData(true);
  } catch (err) {
    alert('Gagal memvalidasi usulan: ' + err.message);
  }
}

function openModalKembalikanUsulan(subbagKode, subbagNama) {
  setElVal('kembalikan-subbag-kode', subbagKode);
  setElText('kembalikan-subbag-label', subbagNama || subbagKode);
  setElVal('kembalikan-alasan', '');

  const modal = document.getElementById('modal-kembalikan-usulan');
  if (modal) modal.style.display = 'flex';
}

function closeModalKembalikanUsulan() {
  const modal = document.getElementById('modal-kembalikan-usulan');
  if (modal) modal.style.display = 'none';
}

async function submitModalKembalikanUsulan() {
  const periodeId = AppState.currentPeriode ? AppState.currentPeriode.id : null;
  if (!periodeId) return;

  const subbag_kode = document.getElementById('kembalikan-subbag-kode')?.value;
  const alasan = document.getElementById('kembalikan-alasan')?.value?.trim();

  if (!alasan) return alert('Alasan pengembalian usulan wajib diisi untuk panduan koreksi PIC.');

  try {
    const res = await apiFetch(`/api/rkb/${periodeId}/usulan-subbag/kembalikan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subbag_kode, alasan })
    });
    alert(res.message || `Usulan Subbag ${subbag_kode} berhasil dikembalikan ke PIC.`);
    closeModalKembalikanUsulan();
    await loadRkbWorkflowData(true);
  } catch (err) {
    alert('Gagal mengembalikan usulan: ' + err.message);
  }
}

function openModalCatatanPleno(subbagKode, subbagNama) {
  const wfData = AppState.rkbWorkflowData;
  const usulan = (wfData && wfData.usulan_list) ? wfData.usulan_list.find(u => u.subbag_kode === subbagKode) : null;

  setElVal('pleno-subbag-kode', subbagKode);
  setElText('pleno-subbag-label', subbagNama || subbagKode);
  setElVal('pleno-catatan-text', usulan ? usulan.catatan_pleno || '' : '');

  const modal = document.getElementById('modal-catatan-pleno');
  if (modal) modal.style.display = 'flex';
}

function closeModalCatatanPleno() {
  const modal = document.getElementById('modal-catatan-pleno');
  if (modal) modal.style.display = 'none';
}

async function submitModalCatatanPleno() {
  const periodeId = AppState.currentPeriode ? AppState.currentPeriode.id : null;
  if (!periodeId) return;

  const subbag_kode = document.getElementById('pleno-subbag-kode')?.value;
  const catatan_pleno = document.getElementById('pleno-catatan-text')?.value?.trim();

  try {
    const res = await apiFetch(`/api/rkb/${periodeId}/usulan-subbag/catatan-pleno`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subbag_kode, catatan_pleno })
    });
    alert(res.message || 'Catatan sidang pleno berhasil disimpan.');
    closeModalCatatanPleno();
    await loadRkbWorkflowData(true);
  } catch (err) {
    alert('Gagal menyimpan catatan pleno: ' + err.message);
  }
}

async function openModalMatriks(defaultSubbag = 'SEMUA') {
  const periodeId = AppState.currentPeriode ? AppState.currentPeriode.id : null;
  if (!periodeId) return alert('Pilih periode anggaran terlebih dahulu.');

  const modal = document.getElementById('modal-matriks-semula-menjadi');
  if (modal) modal.style.display = 'flex';

  const select = document.getElementById('matriks-filter-subbag');
  if (select) select.value = defaultSubbag || 'SEMUA';

  const tbody = document.getElementById('matriks-table-body');
  if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px; color: #64748b;">⏳ Memuat komparasi matriks semula-menjadi dari server...</td></tr>`;

  try {
    const data = await apiFetch(`/api/rkb/${periodeId}/matriks-semula-menjadi`);
    AppState.matriksData = data;
    filterMatriksModalRows();
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px; color: #ef4444;">❌ Gagal memuat matriks: ${escapeHtml(err.message)}</td></tr>`;
    }
  }
}

function closeModalMatriks() {
  const modal = document.getElementById('modal-matriks-semula-menjadi');
  if (modal) modal.style.display = 'none';
}

function filterMatriksModalRows() {
  if (!AppState.matriksData) return;
  const data = AppState.matriksData;
  const selectedSubbag = document.getElementById('matriks-filter-subbag')?.value || 'SEMUA';
  const tbody = document.getElementById('matriks-table-body');
  const summaryPills = document.getElementById('matriks-summary-pills');

  let rows = data.rows || data.details || [];
  if (selectedSubbag !== 'SEMUA') {
    rows = rows.filter(r => r.pic_bagian === selectedSubbag);
  }

  // Calculate totals for filtered subset
  let totalSemula = 0;
  let totalMenjadi = 0;
  let countBerubah = 0;
  let countBaru = 0;
  let countDihapus = 0;

  rows.forEach(r => {
    totalSemula += Number(r.total_semula) || 0;
    totalMenjadi += Number(r.total_menjadi) || 0;
    if (r.status_perubahan === 'BERUBAH') countBerubah++;
    else if (r.status_perubahan === 'BARU') countBaru++;
    else if (r.status_perubahan === 'DIHAPUS') countDihapus++;
  });

  const selisih = totalMenjadi - totalSemula;

  if (summaryPills) {
    summaryPills.innerHTML = `
      <span class="badge" style="background:#f1f5f9; color:#334155;">Semula: <b>${formatRupiah(totalSemula)}</b></span>
      <span class="badge" style="background:#eff6ff; color:#1d4ed8;">Menjadi: <b>${formatRupiah(totalMenjadi)}</b></span>
      <span class="badge" style="background:${selisih > 0 ? '#fef3c7' : selisih < 0 ? '#dcfce7' : '#f8fafc'}; color:${selisih > 0 ? '#b45309' : selisih < 0 ? '#15803d' : '#475569'};">
        Selisih: <b>${selisih > 0 ? '+' : ''}${formatRupiah(selisih)}</b>
      </span>
      <span class="badge badge-info">${countBerubah + countBaru + countDihapus} Berubah / Disorot</span>
    `;
  }

  if (!tbody) return;

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding: 24px; color: #94a3b8;">Tidak ada data rincian belanja yang cocok dengan filter subbagian ini.</td></tr>`;
    return;
  }

  // Render rows
  tbody.innerHTML = rows.map((r, idx) => {
    const meta = SUBBAG_META[r.pic_bagian] || { name: r.pic_bagian || '-', color: '#64748b' };
    const rowSelisih = Number(r.selisih) || 0;
    let statusBadge = '<span class="badge badge-secondary" style="font-size:10px;">TETAP</span>';
    let rowBg = 'transparent';

    if (r.status_perubahan === 'BERUBAH') {
      statusBadge = '<span class="badge badge-warning" style="font-size:10px; background:#fef3c7; color:#92400e;">BERUBAH</span>';
      rowBg = '#fffdf7';
    } else if (r.status_perubahan === 'BARU') {
      statusBadge = '<span class="badge badge-success" style="font-size:10px; background:#dcfce7; color:#166534;">BARU (+)</span>';
      rowBg = '#f0fdf4';
    } else if (r.status_perubahan === 'DIHAPUS') {
      statusBadge = '<span class="badge badge-danger" style="font-size:10px; background:#fee2e2; color:#991b1b;">DIHAPUS (-)</span>';
      rowBg = '#fef2f2';
    }

    const selisihColor = rowSelisih > 0 ? '#b45309' : rowSelisih < 0 ? '#15803d' : '#64748b';
    const selisihPrefix = rowSelisih > 0 ? '+' : '';

    return `
      <tr style="background: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
        <td class="text-center" style="color: #94a3b8; font-size: 11px;">${idx + 1}</td>
        <td>
          <span class="badge" style="background: ${meta.color}15; color: ${meta.color}; border: 1px solid ${meta.color}40; font-size: 10.5px; font-weight: 700;">
            ${escapeHtml(r.pic_bagian || '-')}
          </span>
        </td>
        <td style="font-family: var(--font-mono); font-size: 11px; color: #475569;">${escapeHtml(r.kode_tahapan || '-')}</td>
        <td>
          <div style="font-weight: 600; color: #1e293b;">${escapeHtml(r.uraian || '')}</div>
          ${r.status_perubahan === 'BERUBAH' ? `
            <div style="font-size: 10.5px; color: #64748b; margin-top: 1px;">
              Semula: ${r.vol_semula || 0} ${r.satuan_semula || ''} @ ${formatRupiah(r.harga_semula || 0)} &rarr;
              Menjadi: ${r.vol_menjadi || 0} ${r.satuan_menjadi || ''} @ ${formatRupiah(r.harga_menjadi || 0)}
            </div>
          ` : ''}
        </td>
        <td class="text-right" style="font-family: var(--font-mono);">${formatRupiah(r.total_semula)}</td>
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">${formatRupiah(r.total_menjadi)}</td>
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: ${selisihColor};">
          ${selisihPrefix}${formatRupiah(rowSelisih)}
        </td>
        <td class="text-center">${statusBadge}</td>
      </tr>
    `;
  }).join('');
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
window.exportDesaExcel = exportDesaExcel;
window.triggerImportDesa = triggerImportDesa;
window.handleExcelUploadDesa = handleExcelUploadDesa;
window.exportKecamatanExcel = exportKecamatanExcel;
window.triggerImportKecamatan = triggerImportKecamatan;
window.handleExcelUploadKecamatan = handleExcelUploadKecamatan;
window.downloadAllSubbagZip = downloadAllSubbagZip;
window.openModalKuantitas = openModalKuantitas;
window.closeModalKuantitas = closeModalKuantitas;
window.submitModalKuantitas = submitModalKuantitas;
window.navigateToMaster = navigateToMaster;
window.renderRkbWorkflow = renderRkbWorkflow;
window.loadRkbWorkflowData = loadRkbWorkflowData;
window.openModalAjukanUsulan = openModalAjukanUsulan;
window.closeModalAjukanUsulan = closeModalAjukanUsulan;
window.submitModalAjukanUsulan = submitModalAjukanUsulan;
window.validasiUsulanSubbag = validasiUsulanSubbag;
window.openModalKembalikanUsulan = openModalKembalikanUsulan;
window.closeModalKembalikanUsulan = closeModalKembalikanUsulan;
window.submitModalKembalikanUsulan = submitModalKembalikanUsulan;
window.openModalCatatanPleno = openModalCatatanPleno;
window.closeModalCatatanPleno = closeModalCatatanPleno;
window.submitModalCatatanPleno = submitModalCatatanPleno;
window.openModalMatriks = openModalMatriks;
window.closeModalMatriks = closeModalMatriks;
// ============================================================================
// MODUL SIKLUS PROSES REVISI MANDIRI (STANDAR SAKTI KEMENKEU 4-TAHAP)
// ============================================================================

let currentRevisiStep = 1;
let subbagPreviewCache = {};
let monitoringRevisiData = [];
let monitoringRevisiSearchDebounce = null;

function getKomisionerBySubbag(subbag) {
  const code = (subbag || '').toUpperCase();
  const subList = AppState.masters?.subbagians || [];
  const found = subList.find(item => String(item.kode).toUpperCase() === code);
  if (found && found.komisioner_nama) {
    return `${found.komisioner_nama} (${found.komisioner_jabatan || 'Ketua Divisi'})`;
  }
  const map = {
    'TEKNIS': 'MUHAMMAD PRASETYO NUGROHO (Ketua Divisi Teknis Penyelenggaraan)',
    'HUKUM': 'SUDARSONO (Ketua Divisi Hukum & Pengawasan)',
    'PARSDM': 'JEANNI TRIANGGALUH PRAMINTO (Ketua Divisi Sosdiklih, Parmas & SDM)',
    'KUL': 'SAMSU MUSTAKIM (Ketua Divisi Keuangan, Umum & Logistik)',
    'RENDATIN': 'PUTRA ADI WIBOWO SW (Ketua Divisi Perencanaan, Data & Informasi)'
  };
  return map[code] || 'MUHAMMAD PRASETYO NUGROHO (Ketua Divisi Teknis Penyelenggaraan)';
}

function handleSubbagInputChange(subbag) {
  const komisionerEl = document.getElementById('revisi-input-komisioner-pengusul');
  if (komisionerEl) {
    komisionerEl.value = getKomisionerBySubbag(subbag);
  }
  loadSubbagPreviewData(subbag);
}

function initRevisiPengajuanView() {
  const user = AppState.currentUser;
  currentRevisiStep = 1;
  goToRevisiStep(1);

  // Set default Subbag sesuai PIC jika user adalah Operator / Kasubbag Level 2
  const subbagSelect = document.getElementById('revisi-input-subbag');
  if (subbagSelect) {
    if (user && user.level > 1 && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
      subbagSelect.value = user.pic_subbag;
      subbagSelect.disabled = true;
      subbagSelect.title = `Terkunci: Anda bertugas sebagai PIC Subbag ${user.pic_subbag}`;
    } else {
      subbagSelect.disabled = false;
      subbagSelect.removeAttribute('title');
      if (!subbagSelect.value) subbagSelect.value = 'TEKNIS';
    }
  }

  // Set default tanggal hari ini
  const tglInput = document.getElementById('revisi-input-tanggal-surat');
  if (tglInput && !tglInput.value) {
    const today = new Date().toISOString().split('T')[0];
    tglInput.value = today;
  }

  const selectedSubbag = subbagSelect ? subbagSelect.value : (user?.pic_subbag || 'TEKNIS');
  handleSubbagInputChange(selectedSubbag);
}

function goToRevisiStep(step) {
  currentRevisiStep = step;

  // Update Stepper UI (1-2-3)
  for (let i = 1; i <= 3; i++) {
    const stepNav = document.getElementById(`step-nav-${i}`);
    const stepLine = document.getElementById(`step-line-${i}`);
    const stepContent = document.getElementById(`revisi-step-${i}-content`);

    if (stepNav) {
      stepNav.classList.remove('active', 'completed');
      if (i < step) {
        stepNav.classList.add('completed');
      } else if (i === step) {
        stepNav.classList.add('active');
      }
    }

    if (stepLine) {
      stepLine.classList.toggle('completed', i < step);
    }

    if (stepContent) {
      stepContent.style.display = (i === step) ? 'block' : 'none';
    }
  }

  // Scroll ke atas card
  const activeContent = document.getElementById(`revisi-step-${step}-content`);
  if (activeContent) {
    activeContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

async function loadSubbagPreviewData(subbag) {
  if (!subbag) return;
  const sub = subbag.toUpperCase();
  const semulaEl = document.getElementById('preview-semula-val');
  const menjadiEl = document.getElementById('preview-menjadi-val');
  const selisihEl = document.getElementById('preview-selisih-val');
  const tableBody = document.getElementById('table-revisi-matriks-preview');

  // Update metadata ringkasan Langkah 2 (Bab 4.1 Canon: informasi utama & total anggaran tanpa tabel rincian RUH)
  setElText('step2-meta-subbag', sub);
  setElText('step2-meta-komisioner', document.getElementById('revisi-input-komisioner-pengusul')?.value || getKomisionerBySubbag(sub));
  const noSurat = document.getElementById('revisi-input-nomor-surat')?.value?.trim() || '-';
  const tglSurat = document.getElementById('revisi-input-tanggal-surat')?.value || '-';
  setElText('step2-meta-surat', `${noSurat} (${tglSurat})`);
  setElText('step2-meta-perihal', document.getElementById('revisi-input-perihal')?.value?.trim() || '-');

  try {
    const res = await apiFetch(`/api/revisi/preview-subbag?subbag=${encodeURIComponent(sub)}`);
    subbagPreviewCache[sub] = res;

    const total = Number(res.total_anggaran) || 0;
    if (semulaEl) semulaEl.textContent = formatRupiah(total);
    if (menjadiEl) menjadiEl.textContent = formatRupiah(total);
    if (selisihEl) selisihEl.textContent = 'Rp 0 (Seimbang)';
    setElText('step2-meta-kegiatan', `${res.total_kegiatan || 0} Kegiatan`);
    setElText('step2-meta-items', `${res.total_item || 0} Item Belanja`);
    if (tableBody) tableBody.innerHTML = '';
  } catch (err) {
    console.warn('Gagal memuat preview subbag:', err);
  }
}

function resetRevisiForm() {
  const form1 = document.getElementById('form-revisi-step-1');
  if (form1) form1.reset();
  const dokSurat = document.getElementById('revisi-input-dok-surat');
  const dokMatriks = document.getElementById('revisi-input-dok-matriks');
  const dokLain = document.getElementById('revisi-input-dok-lain');
  const checkKeabsahan = document.getElementById('revisi-check-keabsahan');
  if (dokSurat) dokSurat.value = '';
  if (dokMatriks) dokMatriks.value = '';
  if (dokLain) dokLain.value = '';
  if (checkKeabsahan) checkKeabsahan.checked = false;
  initRevisiPengajuanView();
}

async function submitRevisiUsulanFinal() {
  const user = AppState.currentUser;
  if (!user) {
    alert('Silakan login terlebih dahulu untuk mengajukan revisi.');
    showLoginScreen();
    return;
  }

  const subbag = document.getElementById('revisi-input-subbag')?.value || user.pic_subbag || 'TEKNIS';
  const nomorSurat = document.getElementById('revisi-input-nomor-surat')?.value?.trim();
  const tanggalSurat = document.getElementById('revisi-input-tanggal-surat')?.value;
  const perihal = document.getElementById('revisi-input-perihal')?.value?.trim();
  const komisionerPengusul = document.getElementById('revisi-input-komisioner-pengusul')?.value?.trim() || getKomisionerBySubbag(subbag);
  const keterangan = document.getElementById('revisi-input-keterangan')?.value?.trim();

  const dokSurat = document.getElementById('revisi-input-dok-surat')?.value?.trim();
  const dokMatriks = document.getElementById('revisi-input-dok-matriks')?.value?.trim();
  const dokLain = document.getElementById('revisi-input-dok-lain')?.value?.trim();
  const checkKeabsahan = document.getElementById('revisi-check-keabsahan');

  if (!nomorSurat || !tanggalSurat || !perihal || !keterangan) {
    alert('Harap lengkapi seluruh field wajib pada Langkah 1 (Nomor Surat, Tanggal, Perihal, dan Keterangan Revisi).');
    goToRevisiStep(1);
    return;
  }

  if (!dokSurat) {
    alert('Tautan Google Drive Nota Dinas / Surat Usulan bertanda tangan wajib disertakan pada Langkah 3.');
    goToRevisiStep(3);
    return;
  }

  if (!dokMatriks) {
    alert('Tautan Google Drive RKB Hardcopy PIC bertanda tangan wajib disertakan pada Langkah 3.');
    goToRevisiStep(3);
    return;
  }

  if (!dokLain) {
    alert('Tautan Google Drive Kerangka Acuan Kerja (KAK) bertanda tangan wajib disertakan pada Langkah 3.');
    goToRevisiStep(3);
    return;
  }

  if (!checkKeabsahan || !checkKeabsahan.checked) {
    alert('Harap beri tanda centang pada pernyataan konfirmasi kebenaran data dan keabsahan dokumen untuk melanjutkan.');
    return;
  }

  const previewData = subbagPreviewCache[subbag.toUpperCase()] || {};
  const totalSemula = Number(previewData.total_anggaran) || 0;
  const totalMenjadi = totalSemula;

  const payload = {
    subbag,
    nomor_surat: nomorSurat,
    tanggal_surat: tanggalSurat,
    perihal,
    pejabat_pengusul: komisionerPengusul,
    jabatan_pengusul: 'Komisioner Pengusul (Pengampu Divisi)',
    kewenangan: 'KPU KABUPATEN NGAWI',
    jenis_revisi: 'Pergeseran Antar Rincian Output',
    keterangan_revisi: keterangan,
    dokumen_surat_link: dokSurat,
    dokumen_matriks_link: dokMatriks,
    dokumen_kak_link: dokLain,
    dokumen_dukung_lain: dokLain,
    konfirmasi_kebenaran: true,
    strict_tahap1: true,
    total_semula: totalSemula,
    total_menjadi: totalMenjadi
  };

  const btnSubmit = document.getElementById('btn-submit-revisi-final');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Mengirim Usulan Revisi...';
  }

  try {
    const res = await apiFetch('/api/revisi/pengajuan', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    showToast(res.message || 'Usulan revisi berhasil diajukan ke Tahap 1!', 'success');
    resetRevisiForm();
    switchView('view-revisi-monitoring');
  } catch (err) {
    alert('Gagal mengajukan usulan revisi: ' + err.message);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = '🚀 Kirim Usulan Revisi (Submit ke Tahap 1)';
    }
  }
}

// ----------------------------------------------------------------------------
// MONITORING REVISI 4-TAHAP (SAKTI KEMENKEU TABLE)
// ----------------------------------------------------------------------------

function handleMonitoringRevisiSearch() {
  if (monitoringRevisiSearchDebounce) clearTimeout(monitoringRevisiSearchDebounce);
  monitoringRevisiSearchDebounce = setTimeout(() => {
    loadRevisiMonitoringTable();
  }, 250);
}

async function loadRevisiMonitoringTable() {
  const tableBody = document.getElementById('table-revisi-monitoring-body');
  if (!tableBody) return;

  const user = AppState.currentUser;
  const searchVal = document.getElementById('monitoring-revisi-search')?.value?.trim() || '';
  const subbagVal = document.getElementById('monitoring-revisi-subbag')?.value || 'SEMUA';
  const statusVal = document.getElementById('monitoring-revisi-status')?.value || 'ALL';

  tableBody.innerHTML = `<tr><td colspan="10" class="text-center" style="padding: 24px; color: #64748b;">Memuat data monitoring 4 tahap...</td></tr>`;

  try {
    const q = new URLSearchParams();
    if (searchVal) q.append('search', searchVal);
    if (subbagVal && subbagVal !== 'SEMUA') q.append('subbag', subbagVal);
    if (statusVal && statusVal !== 'ALL') q.append('status', statusVal);

    const res = await apiFetch(`/api/revisi/monitoring?${q.toString()}`);
    const list = res.data || [];
    monitoringRevisiData = list;

    // Update badge di sidebar menu
    const activeCount = list.filter(r => ['PROSES', 'DIAJUKAN', 'MENUNGGU_PLENO', 'ACC_PLENO'].includes(r.status_tahap)).length;
    const badgeEl = document.getElementById('badge-revisi-aktif');
    if (badgeEl) badgeEl.textContent = String(activeCount);

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="10" class="text-center" style="padding: 28px; color: #64748b;">Tidak ada data usulan revisi yang cocok dengan filter yang dipilih.</td></tr>`;
      return;
    }

    tableBody.innerHTML = list.map((rev, index) => {
      let tahapCircleClass = 'tahap-green';
      let tahapCircleNum = rev.tahap_terkini || 1;
      const verBadge = `V${rev.versi_usulan || 1}`;

      if (rev.status_tahap === 'SELESAI') {
        tahapCircleClass = 'tahap-green';
        tahapCircleNum = 4;
      } else if (rev.status_tahap === 'PERBAIKAN' || rev.status_tahap === 'DIKEMBALIKAN') {
        tahapCircleClass = 'tahap-red';
        tahapCircleNum = rev.tahap3_hasil === 'DIKEMBALIKAN' ? 3 : 2;
      } else if (rev.status_tahap === 'DITOLAK') {
        tahapCircleClass = 'tahap-red';
        tahapCircleNum = 3;
      } else {
        tahapCircleClass = 'tahap-orange';
        tahapCircleNum = rev.tahap_terkini;
      }

      // 1. Kolom Tahap 1: Pengajuan (Kotak Warna SAKTI)
      const t1Html = rev.tahap1_waktu ? `
        <div class="sakti-stage-box stage-success">
          <span class="stage-date">${escHtml(rev.tahap1_waktu)}</span>
          <span class="stage-meta">${escHtml(rev.tahap1_oleh || 'Pengusul')}</span>
          <span class="stage-pill">Diajukan (${verBadge})</span>
        </div>
      ` : `<div class="sakti-stage-box stage-empty">-</div>`;

      // 2. Kolom Tahap 2: Penelitian Rendatin (Kotak Warna SAKTI)
      let t2Html = '';
      if (rev.tahap2_waktu && rev.tahap2_hasil) {
        if (rev.tahap2_hasil === 'SETUJU') {
          t2Html = `
            <div class="sakti-stage-box stage-success">
              <span class="stage-date">${escHtml(rev.tahap2_waktu)}</span>
              <span class="stage-meta">${escHtml(rev.tahap2_oleh || 'Tim Rendatin')}</span>
              <span class="stage-pill">Setuju SBM</span>
            </div>
          `;
        } else {
          t2Html = `
            <div class="sakti-stage-box stage-rejected">
              <span class="stage-date">${escHtml(rev.tahap2_waktu)}</span>
              <span class="stage-meta">${escHtml(rev.tahap2_oleh || 'Tim Rendatin')}</span>
              <span class="stage-pill">Dikembalikan</span>
            </div>
          `;
        }
      } else if (rev.status_tahap === 'DIAJUKAN' || (rev.tahap_terkini <= 2 && rev.status_tahap === 'PROSES')) {
        t2Html = `
          <div class="sakti-stage-box stage-pending">
            <span class="stage-date">Antrean</span>
            <span class="stage-meta">Tim Rendatin</span>
            <span class="stage-pill">Penelitian SBM</span>
          </div>
        `;
      } else {
        t2Html = `<div class="sakti-stage-box stage-empty">-</div>`;
      }

      // 3. Kolom Tahap 3: ACC Pleno (Kotak Warna SAKTI)
      let t3Html = '';
      if (rev.tahap3_waktu && rev.tahap3_hasil) {
        if (rev.tahap3_hasil === 'SETUJU') {
          t3Html = `
            <div class="sakti-stage-box stage-success">
              <span class="stage-date">${escHtml(rev.tahap3_waktu)}</span>
              <span class="stage-meta">${escHtml(rev.tahap3_oleh || 'Pleno Komisioner')}</span>
              <span class="stage-pill">ACC Pleno</span>
            </div>
          `;
        } else {
          t3Html = `
            <div class="sakti-stage-box stage-rejected">
              <span class="stage-date">${escHtml(rev.tahap3_waktu)}</span>
              <span class="stage-meta">${escHtml(rev.tahap3_oleh || 'Pleno Komisioner')}</span>
              <span class="stage-pill">${rev.tahap3_hasil === 'BATAL_KOREKSI_L1' ? 'Batal (Koreksi L1)' : 'Dikembalikan Pleno'}</span>
            </div>
          `;
        }
      } else if (rev.status_tahap === 'MENUNGGU_PLENO' || (rev.tahap_terkini === 3 && rev.status_tahap === 'PROSES')) {
        t3Html = `
          <div class="sakti-stage-box stage-pending">
            <span class="stage-date">Agenda</span>
            <span class="stage-meta">Pleno Komisioner</span>
            <span class="stage-pill">Menunggu ACC</span>
          </div>
        `;
      } else {
        t3Html = `<div class="sakti-stage-box stage-empty">-</div>`;
      }

      // 4. Kolom Tahap 4: BA Pleno di Sahkan (Kotak Warna SAKTI)
      let t4Html = '';
      if (rev.tahap4_waktu || rev.status_tahap === 'SELESAI') {
        t4Html = `
          <div class="sakti-stage-box stage-success">
            <span class="stage-date">${escHtml(rev.tahap4_waktu || 'Disahkan')}</span>
            <span class="stage-meta" title="${escHtml(rev.nomor_penetapan || '')}">${escHtml(rev.nomor_penetapan || 'BA Pleno Sah')}</span>
            <span class="stage-pill">BA Sah &amp; Kunci</span>
          </div>
        `;
      } else if (rev.status_tahap === 'ACC_PLENO' || (rev.tahap_terkini === 4 && rev.status_tahap === 'PROSES')) {
        t4Html = `
          <div class="sakti-stage-box stage-pending">
            <span class="stage-date">Menunggu</span>
            <span class="stage-meta">Pengesahan BA</span>
            <span class="stage-pill">Siap Sahkan</span>
          </div>
        `;
      } else {
        t4Html = `<div class="sakti-stage-box stage-empty">-</div>`;
      }

      // Tombol Aksi Sesuai Role (Bab 4.2 Canon: Tahap 2, 3, 4 dioperasikan di sistem oleh akun Perencanaan Level 1)
      let actionButtons = `
        <button class="btn btn-outline btn-xs" onclick="openRevisiDetail(${rev.id})" title="Lihat Berkas & Detail Usulan">
          🔍 Detail
        </button>
      `;

      const isValidator = user && user.level <= 1;

      if (isValidator && (rev.status_tahap === 'DIAJUKAN' || ((rev.tahap_terkini === 1 || rev.tahap_terkini === 2) && rev.status_tahap === 'PROSES'))) {
        actionButtons += `
          <button class="btn btn-primary btn-xs" onclick="openRevisiTahapAction(${rev.id}, 2)" style="margin-top: 3px;" title="Lakukan Penelitian Kelayakan SBM">
            ✔️ Teliti SBM
          </button>
        `;
      } else if (isValidator && (rev.status_tahap === 'MENUNGGU_PLENO' || (rev.tahap_terkini === 3 && rev.status_tahap === 'PROSES'))) {
        actionButtons += `
          <button class="btn btn-info btn-xs" onclick="openRevisiTahapAction(${rev.id}, 3)" style="margin-top: 3px;" title="Catat Putusan Sidang Pleno Komisioner">
            🏛️ ACC Pleno
          </button>
        `;
      } else if (isValidator && (rev.status_tahap === 'ACC_PLENO' || (rev.tahap_terkini === 4 && rev.status_tahap === 'PROSES'))) {
        actionButtons += `
          <button class="btn btn-success btn-xs" onclick="switchView('view-revisi-tahap4')" style="margin-top: 3px;" title="Sahkan RKB dan Kunci Dokumen dengan BA Pleno">
            🔒 Sahkan BA
          </button>
        `;
      }

      if ((rev.status_tahap === 'PERBAIKAN' || rev.status_tahap === 'DIKEMBALIKAN') &&
          user && (user.level === 0 || (user.level === 2 && (user.pic_subbag === rev.subbag || user.pic_subbag === 'SEMUA')))) {
        actionButtons += `
          <button class="btn btn-warning btn-xs" onclick="switchView('view-revisi-pengajuan')" style="margin-top: 3px;" title="Perbaiki & Ajukan Ulang (${verBadge})">
            ✏️ Ajukan Ulang (${verBadge})
          </button>
        `;
      }

      return `
        <tr>
          <td class="text-center" style="font-weight: 600; color: #64748b;">${index + 1}</td>
          <td>
            <div style="font-family: var(--font-mono); font-weight: 700; color: #1e40af; font-size: 11.5px;">
              ${escHtml(rev.kode_revisi)}
              <span class="badge badge-info" style="font-size: 9.5px; margin-left: 4px;">${verBadge}</span>
            </div>
            <div style="font-size: 10px; color: #64748b;">Thang: ${rev.tahun_anggaran}</div>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 12px;">
              <span class="badge badge-primary" style="font-size: 10px; padding: 2px 6px;">${escHtml(rev.subbag)}</span>
              ${escHtml(rev.perihal)}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Surat: <strong>${escHtml(rev.nomor_surat)}</strong> (${escHtml(rev.tanggal_surat)})
            </div>
            ${rev.alasan_pengembalian ? `
              <div style="font-size: 11px; color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; padding: 4px 6px; margin-top: 4px;">
                ⚠️ <strong>Alasan Pengembalian:</strong> ${escHtml(rev.alasan_pengembalian)}
              </div>
            ` : ''}
            ${rev.l1_koreksi_catatan ? `
              <div style="font-size: 10.5px; color: #1e40af; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 2px 6px; margin-top: 3px;">
                ℹ️ <strong>Koreksi L1:</strong> ${escHtml(rev.l1_koreksi_catatan)}
              </div>
            ` : ''}
            ${rev.tahap3_hasil === 'BATAL_KOREKSI_L1' ? `
              <div style="font-size: 10.5px; color: #b45309; background: #fffbeb; border: 1px solid #fde68a; border-radius: 4px; padding: 2px 6px; margin-top: 3px;">
                ⚠️ <strong>ACC Dibatalkan:</strong> Diubah L1 setelah ACC Pleno, perlu ACC ulang
              </div>
            ` : ''}
          </td>
          <td class="text-center">
            <span class="badge badge-success" style="font-size: 10px; padding: 3px 6px;">OK / Lolos</span>
          </td>
          <td>${t1Html}</td>
          <td>${t2Html}</td>
          <td>${t3Html}</td>
          <td>${t4Html}</td>
          <td class="text-center">
            <div class="sakti-tahap-badge ${tahapCircleClass}" title="Tahap ${tahapCircleNum} (${escHtml(rev.status_tahap)})">
              ${tahapCircleNum}
            </div>
          </td>
          <td class="text-center">
            <div style="display: flex; flex-direction: column; align-items: center; gap: 3px;">
              ${actionButtons}
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.warn('Gagal memuat monitoring revisi:', err);
    tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-danger" style="padding: 24px;">Gagal memuat monitoring: ${escHtml(err.message)}</td></tr>`;
  }
}

// ----------------------------------------------------------------------------
// MODAL DETAIL REVISI & AKSI TAHAP
// ----------------------------------------------------------------------------

async function openRevisiDetail(id) {
  const modal = document.getElementById('modal-revisi-detail');
  const bodyEl = document.getElementById('modal-revisi-detail-body');
  const titleEl = document.getElementById('modal-revisi-detail-kode');
  const actionsEl = document.getElementById('modal-revisi-detail-actions');
  if (!modal || !bodyEl) return;

  modal.style.display = 'flex';
  bodyEl.innerHTML = '<div class="text-center" style="padding: 30px; color: #64748b;">Memuat rincian usulan revisi...</div>';

  try {
    const [res, histRes] = await Promise.all([
      apiFetch(`/api/revisi/pengajuan/${id}`),
      apiFetch(`/api/revisi/pengajuan/${id}/history`).catch(() => ({ data: [], history: [] }))
    ]);
    const rev = res.data;
    const historyList = histRes.history || histRes.data || [];
    const verBadge = `V${rev.versi_usulan || 1}`;
    if (titleEl) titleEl.textContent = `ID Revisi: ${rev.kode_revisi} (${verBadge}) | Subbag: ${rev.subbag}`;

    const kakLink = rev.dokumen_kak_link || rev.dokumen_dukung_lain || '';

    bodyEl.innerHTML = `
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; font-size: 12px;">
          <div><strong>Nomor Surat Usulan:</strong> ${escHtml(rev.nomor_surat)}</div>
          <div><strong>Tanggal Surat:</strong> ${escHtml(rev.tanggal_surat)}</div>
          <div><strong>Subbagian Pengusul:</strong> <span class="badge badge-primary" style="font-size: 10px;">${escHtml(rev.subbag)}</span> <span class="badge badge-info" style="font-size: 10px;">Versi ${verBadge}</span></div>
          <div><strong>Komisioner Pengusul:</strong> <span style="color: #1e40af; font-weight: 700;">${escHtml(rev.pejabat_pengusul || getKomisionerBySubbag(rev.subbag))}</span></div>
          <div><strong>Kewenangan Revisi:</strong> ${escHtml(rev.kewenangan || 'KPU KABUPATEN NGAWI')}</div>
          <div><strong>Jenis Revisi:</strong> ${escHtml(rev.jenis_revisi || 'Pergeseran Antar Rincian Output')}</div>
        </div>
        <div style="margin-top: 10px; font-size: 12px; border-top: 1px dashed #cbd5e1; padding-top: 8px;">
          <strong>Perihal Usulan:</strong><br>
          <span style="color: #1e293b; font-weight: 600;">${escHtml(rev.perihal)}</span>
        </div>
        <div style="margin-top: 8px; font-size: 12px;">
          <strong>Keterangan / Latar Belakang Urgensi:</strong><br>
          <p style="color: #475569; margin: 4px 0 0 0; line-height: 1.45;">${escHtml(rev.keterangan_revisi || '-')}</p>
        </div>
        ${rev.alasan_pengembalian ? `
          <div style="margin-top: 8px; padding: 6px 10px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; font-size: 12px; color: #991b1b;">
            <strong>Catatan Pengembalian Terakhir:</strong><br>${escHtml(rev.alasan_pengembalian)}
          </div>
        ` : ''}
        ${rev.l1_koreksi_catatan ? `
          <div style="margin-top: 8px; padding: 6px 10px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 12px; color: #1e40af;">
            <strong>Catatan Koreksi Kecil L1:</strong><br>${escHtml(rev.l1_koreksi_catatan)}
          </div>
        ` : ''}
      </div>

      <!-- TAUTAN BERKAS PENDUKUNG (3 TAUTAN WAJIB, BAB 4.1 CANON) -->
      <div style="margin-bottom: 16px;">
        <h5 style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">📎 Dokumen Pendukung Terlampir (Google Drive):</h5>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
          ${rev.dokumen_surat_link ? `
            <a href="${escHtml(rev.dokumen_surat_link)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; color: #2563eb; text-decoration: none; font-weight: 600; background: #eff6ff; padding: 6px 12px; border-radius: 6px; border: 1px solid #bfdbfe;">
              📄 1. Nota Dinas Bertanda Tangan (Buka Berkas) &rarr;
            </a>
          ` : '<span style="color: #94a3b8;">- Tidak ada berkas Nota Dinas</span>'}
          ${rev.dokumen_matriks_link ? `
            <a href="${escHtml(rev.dokumen_matriks_link)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; color: #15803d; text-decoration: none; font-weight: 600; background: #f0fdf4; padding: 6px 12px; border-radius: 6px; border: 1px solid #bbf7d0;">
              📊 2. RKB Hardcopy PIC Bertanda Tangan (Buka Berkas) &rarr;
            </a>
          ` : '<span style="color: #94a3b8;">- Tidak ada berkas RKB Hardcopy PIC</span>'}
          ${kakLink ? `
            <a href="${escHtml(kakLink)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; color: #7c3aed; text-decoration: none; font-weight: 600; background: #faf5ff; padding: 6px 12px; border-radius: 6px; border: 1px solid #e9d5ff;">
              📑 3. Kerangka Acuan Kerja / KAK Bertanda Tangan (Buka Berkas) &rarr;
            </a>
          ` : '<span style="color: #94a3b8;">- Tidak ada berkas KAK</span>'}
          ${rev.dokumen_surat_original_link && rev.dokumen_surat_original_link !== rev.dokumen_surat_link ? `
            <a href="${escHtml(rev.dokumen_surat_original_link)}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 6px; color: #475569; text-decoration: none; font-size: 11px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
              📑 Arsip Dokumen Pengajuan Awal (V1) &rarr;
            </a>
          ` : ''}
        </div>
      </div>

      <!-- REKAPITULASI PROGRES 4 TAHAP SAKTI -->
      <div>
        <h5 style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">🕒 Status Tahapan Revisi (${verBadge}):</h5>
        <div style="border-left: 2px solid #e2e8f0; margin-left: 12px; padding-left: 14px; display: flex; flex-direction: column; gap: 12px;">
          <!-- Tahap 1 -->
          <div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b;">1. Tahap Pengajuan Usulan (PIC Subbag)</div>
            <div style="font-size: 11px; color: #64748b;">${escHtml(rev.tahap1_waktu || '-')} oleh <strong>${escHtml(rev.tahap1_oleh || '-')}</strong></div>
            <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">${escHtml(rev.tahap1_catatan || '-')}</div>
          </div>
          <!-- Tahap 2 -->
          <div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b;">2. Tahap Penelitian &amp; Validasi (Tim Rendatin)</div>
            <div style="font-size: 11px; color: #64748b;">${escHtml(rev.tahap2_waktu || 'Belum diteliti')} ${rev.tahap2_oleh ? `oleh <strong>${escHtml(rev.tahap2_oleh)}</strong>` : ''}</div>
            <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">${escHtml(rev.tahap2_catatan || '-')}</div>
          </div>
          <!-- Tahap 3 -->
          <div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b;">3. Tahap ACC Pleno Komisioner</div>
            <div style="font-size: 11px; color: #64748b;">${escHtml(rev.tahap3_waktu || 'Belum di-ACC')} ${rev.tahap3_oleh ? `oleh <strong>${escHtml(rev.tahap3_oleh)}</strong>` : ''}</div>
            <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">${escHtml(rev.tahap3_catatan || '-')}</div>
          </div>
          <!-- Tahap 4 -->
          <div>
            <div style="font-size: 12px; font-weight: 700; color: #1e293b;">4. Tahap BA Pleno Disahkan (Kunci RKB Gabungan)</div>
            <div style="font-size: 11px; color: #64748b;">${escHtml(rev.tahap4_waktu || 'Belum disahkan')}</div>
            <div style="font-size: 11.5px; color: #15803d; font-weight: 700; margin-top: 2px;">Nomor Dokumen: ${escHtml(rev.nomor_penetapan || '-')}</div>
          </div>
        </div>
      </div>

      <!-- RESUME PROSES LENGKAP & AUDIT RINCI (KHUSUS KASUBAG RENDATIN & DEVELOPER, BAB 6 CANON) -->
      ${historyList.length > 0 ? `
        <div style="margin-top: 16px;">
          <h5 style="font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">📜 Resume Proses Lengkap &amp; Audit Rinci Versi Pengajuan (Khusus Kasubag Rendatin &amp; Developer):</h5>
          <div style="max-height: 180px; overflow-y: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 11.5px;">
            <table class="table table-sm" style="margin: 0;">
              <thead style="background: #f8fafc;">
                <tr>
                  <th style="padding: 6px 8px;">Waktu</th>
                  <th style="padding: 6px 8px;">Versi</th>
                  <th style="padding: 6px 8px;">Aksi</th>
                  <th style="padding: 6px 8px;">Pelaku</th>
                  <th style="padding: 6px 8px;">Catatan / Alasan</th>
                </tr>
              </thead>
              <tbody>
                ${historyList.map(h => `
                  <tr>
                    <td style="padding: 6px 8px; font-size: 11px; color: #64748b;">${escHtml(h.waktu_wib || h.waktu || '-')}</td>
                    <td style="padding: 6px 8px;"><span class="badge badge-info" style="font-size: 9.5px;">V${h.versi_usulan || 1}</span></td>
                    <td style="padding: 6px 8px;"><span class="badge badge-secondary" style="font-size: 9.5px;">${escHtml(h.aksi || h.action || '-')}</span></td>
                    <td style="padding: 6px 8px; font-weight: 600;">${escHtml(h.actor_name || h.actor_username || h.username_pelaku || '-')}</td>
                    <td style="padding: 6px 8px; color: #334155;">${escHtml(h.alasan_pengembalian || h.catatan || '-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;

    if (actionsEl) {
      actionsEl.innerHTML = '';
      const user = AppState.currentUser;
      const isValidator = user && user.level <= 1;

      if ((rev.status_tahap === 'PERBAIKAN' || rev.status_tahap === 'DIKEMBALIKAN') &&
          user && (user.level === 0 || (user.level === 2 && (user.pic_subbag === rev.subbag || user.pic_subbag === 'SEMUA')))) {
        actionsEl.innerHTML = `<button class="btn btn-warning btn-sm" onclick="closeModalRevisiDetail(); switchView('view-revisi-pengajuan')">✏️ Perbaiki &amp; Ajukan Ulang (${verBadge})</button>`;
      } else if (isValidator && (rev.status_tahap === 'DIAJUKAN' || ((rev.tahap_terkini === 1 || rev.tahap_terkini === 2) && rev.status_tahap === 'PROSES'))) {
        actionsEl.innerHTML = `<button class="btn btn-primary btn-sm" onclick="closeModalRevisiDetail(); openRevisiTahapAction(${rev.id}, 2)">✔️ Proses Penelitian (Tahap 2)</button>`;
      } else if (isValidator && (rev.status_tahap === 'MENUNGGU_PLENO' || (rev.tahap_terkini === 3 && rev.status_tahap === 'PROSES'))) {
        actionsEl.innerHTML = `<button class="btn btn-info btn-sm" onclick="closeModalRevisiDetail(); openRevisiTahapAction(${rev.id}, 3)">🏛️ Catat Hasil Pleno (Tahap 3)</button>`;
      } else if (isValidator && (rev.status_tahap === 'ACC_PLENO' || (rev.tahap_terkini === 4 && rev.status_tahap === 'PROSES'))) {
        actionsEl.innerHTML = `<button class="btn btn-success btn-sm" onclick="closeModalRevisiDetail(); switchView('view-revisi-tahap4')">🔒 Pengesahan BA Pleno (Tahap 4)</button>`;
      }
    }
  } catch (err) {
    bodyEl.innerHTML = `<div class="text-danger" style="padding: 20px;">Gagal memuat detail revisi: ${escHtml(err.message)}</div>`;
  }
}

function closeModalRevisiDetail() {
  const modal = document.getElementById('modal-revisi-detail');
  if (modal) modal.style.display = 'none';
}

function openRevisiTahapAction(id, tahap) {
  const modal = document.getElementById('modal-revisi-tahap-action');
  const rev = (monitoringRevisiData || []).find(r => r.id === id) || (validasiRevisiData || []).find(r => r.id === id);
  if (!modal || !rev) return;

  setElVal('action-revisi-id', id);
  setElVal('action-revisi-tahap', tahap);
  setElText('modal-tahap-action-subtitle', `ID: ${rev.kode_revisi} | Subbag: ${rev.subbag} | ${rev.perihal}`);

  const bannerEl = document.getElementById('action-revisi-banner');
  const titleEl = document.getElementById('modal-tahap-action-title');
  const keputusanEl = document.getElementById('action-revisi-keputusan');
  const t4Fields = document.getElementById('action-revisi-tahap4-fields');
  const noBaInput = document.getElementById('action-revisi-nomor-ba');
  const tglBaInput = document.getElementById('action-revisi-tanggal-ba');
  const catatanInput = document.getElementById('action-revisi-catatan');

  if (catatanInput) catatanInput.value = '';
  if (t4Fields) t4Fields.style.display = 'none';

  if (tahap === 2) {
    if (titleEl) titleEl.textContent = '✔️ Tahap 2: Penelitian Teknis (Tim Rendatin)';
    if (bannerEl) {
      bannerEl.className = 'alert alert-info';
      bannerEl.innerHTML = `
        <strong>Verifikasi Teknis &amp; SBM:</strong> Lakukan penelitian terhadap kesesuaian akun, tarif Standar Biaya Masukan (SBM), dan dampak pergeseran anggaran terhadap pagu NPHD.
      `;
    }
    if (keputusanEl) {
      keputusanEl.innerHTML = `
        <option value="SETUJU">🟢 Penelitian Sesuai SBM &rarr; Lanjutkan ke ACC Pleno (Tahap 3)</option>
        <option value="PERBAIKAN">🔴 Perlu Perbaikan &rarr; Kembalikan Berkas ke PIC Subbagian</option>
      `;
    }
  } else if (tahap === 3) {
    if (titleEl) titleEl.textContent = '🏛️ Tahap 3: ACC Pleno (Persetujuan Sidang Pleno Komisioner)';
    if (bannerEl) {
      bannerEl.className = 'alert alert-info';
      bannerEl.innerHTML = `
        <strong>Pembahasan Forum Pleno:</strong> Usulan revisi ditelaah dalam Rapat Pleno Komisioner KPU bersama Sekretaris KPU (KPA) untuk mendapatkan persetujuan (ACC Pleno).
      `;
    }
    if (keputusanEl) {
      keputusanEl.innerHTML = `
        <option value="SETUJU">🟢 ACC Pleno Disetujui &rarr; Lanjutkan ke Pengesahan BA Pleno (Tahap 4)</option>
        <option value="TOLAK">🔴 Usulan Ditolak oleh Pleno Komisioner</option>
      `;
    }
  } else if (tahap === 4) {
    if (titleEl) titleEl.textContent = '🔒 Tahap 4: BA Pleno di Sahkan (Kunci RKB Draf Keseluruhan)';
    if (bannerEl) {
      bannerEl.className = 'alert alert-success';
      bannerEl.innerHTML = `
        <strong>Pengesahan BA Pleno &amp; Penguncian Dokumen (Locked History):</strong> Masukkan nomor Berita Acara Pleno Komisioner. Dokumen RKB revisi akan otomatis <b>DIKUNCI RESMI SECARA KESELURUHAN</b> dan dicatat ke arsip permanen.
      `;
    }
    if (keputusanEl) {
      keputusanEl.innerHTML = `
        <option value="SETUJU">🟢 Sahkan BA Pleno &amp; Kunci RKB Draf Keseluruhan</option>
      `;
    }
    if (t4Fields) t4Fields.style.display = 'block';
    if (noBaInput && !noBaInput.value) {
      noBaInput.value = `05/BA.01-BA/3521/${new Date().getFullYear()}`;
    }
    if (tglBaInput && !tglBaInput.value) {
      tglBaInput.value = new Date().toISOString().split('T')[0];
    }
  }

  modal.style.display = 'flex';
}

function handleTahapDecisionChange(val) {
  // Callback when decision select changes
}

function closeModalTahapAction() {
  const modal = document.getElementById('modal-revisi-tahap-action');
  if (modal) modal.style.display = 'none';
}

async function submitRevisiTahapAction() {
  const id = Number(document.getElementById('action-revisi-id')?.value);
  const tahap = Number(document.getElementById('action-revisi-tahap')?.value);
  const keputusan = document.getElementById('action-revisi-keputusan')?.value;
  const catatan = document.getElementById('action-revisi-catatan')?.value?.trim();
  const noBa = document.getElementById('action-revisi-nomor-ba')?.value?.trim();
  const tglBa = document.getElementById('action-revisi-tanggal-ba')?.value;

  if (tahap === 4 && !noBa) {
    alert('Nomor Berita Acara Pleno wajib diisi untuk mengesahkan revisi.');
    return;
  }

  const btnSubmit = document.getElementById('btn-submit-tahap-action');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Memproses Tahap...';
  }

  try {
    const res = await apiFetch(`/api/revisi/pengajuan/${id}/tahap`, {
      method: 'POST',
      body: JSON.stringify({
        tahap,
        aksi: keputusan,
        catatan,
        nomor_penetapan: noBa,
        tanggal_penetapan: tglBa
      })
    });

    closeModalTahapAction();
    showToast(res.message || `Tahap ${tahap} berhasil diproses!`, 'success');
    await loadRevisiMonitoringTable();
    if (document.getElementById('view-revisi-validasi')?.classList.contains('active')) {
      await loadValidasiRevisiTable();
    }
    if (tahap === 4) {
      await loadPeriodes();
      await loadRkbData();
      renderAllViews();
    }
  } catch (err) {
    alert('Gagal memproses tahapan revisi: ' + err.message);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = '💾 Simpan & Proses Tahap';
    }
  }
}

// ----------------------------------------------------------------------------
// MEJA KERJA VALIDASI REVISI (KHUSUS LEVEL 1 / TIM RENDATIN)
// ----------------------------------------------------------------------------

let validasiRevisiData = [];

async function loadValidasiRevisiTable() {
  const tableBody = document.getElementById('table-validasi-revisi-body');
  if (!tableBody) return;

  tableBody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding: 24px; color: #64748b;">Memuat data usulan revisi untuk penelitian teknis Rendatin...</td></tr>`;

  try {
    const res = await apiFetch('/api/revisi/monitoring');
    const list = res.data || [];
    validasiRevisiData = list;

    // Hitung KPI Meja Kerja Validator
    const totalUsulan = list.length;
    const pendingVal = list.filter(r => r.status_tahap === 'DIAJUKAN' || ((r.tahap_terkini === 1 || r.tahap_terkini === 2) && r.status_tahap === 'PROSES')).length;
    const plenoVal = list.filter(r => r.status_tahap === 'MENUNGGU_PLENO' || r.status_tahap === 'ACC_PLENO' || r.status_tahap === 'SELESAI' || r.tahap_terkini >= 3).length;
    const perbaikanVal = list.filter(r => r.status_tahap === 'PERBAIKAN' || r.status_tahap === 'DIKEMBALIKAN').length;

    setElText('val-kpi-total', String(totalUsulan));
    setElText('val-kpi-pending', String(pendingVal));
    setElText('val-kpi-pleno', String(plenoVal));
    setElText('val-kpi-revisi', String(perbaikanVal));

    const badgeVerif = document.getElementById('badge-revisi-perlu-verifikasi');
    if (badgeVerif) badgeVerif.textContent = String(pendingVal);

    if (list.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding: 28px; color: #64748b;">Belum ada berkas usulan revisi yang masuk dari subbagian.</td></tr>`;
      return;
    }

    tableBody.innerHTML = list.map((rev, idx) => {
      const verBadge = `V${rev.versi_usulan || 1}`;
      // Status badge
      let statusBadge = '';
      if (rev.status_tahap === 'SELESAI') {
        statusBadge = '<span class="badge badge-success" style="font-size: 10px; padding: 4px 8px;">🔒 Selesai &amp; Sah</span>';
      } else if (rev.status_tahap === 'PERBAIKAN' || rev.status_tahap === 'DIKEMBALIKAN') {
        statusBadge = `<span class="badge badge-danger" style="font-size: 10px; padding: 4px 8px;">↩️ Dikembalikan (${verBadge})</span>`;
      } else if (rev.status_tahap === 'ACC_PLENO' || rev.tahap_terkini === 3) {
        statusBadge = '<span class="badge badge-info" style="font-size: 10px; padding: 4px 8px;">🏛️ ACC Pleno</span>';
      } else if (rev.status_tahap === 'MENUNGGU_PLENO') {
        statusBadge = '<span class="badge badge-primary" style="font-size: 10px; padding: 4px 8px;">📋 Menunggu Pleno</span>';
      } else {
        statusBadge = `<span class="badge badge-warning" style="font-size: 10px; padding: 4px 8px;">⏳ Perlu Diteliti (${verBadge})</span>`;
      }

      // Berkas Links (3 tautan wajib Bab 4.1 Canon)
      const kakLink = rev.dokumen_kak_link || rev.dokumen_dukung_lain || '';
      let berkasHtml = '<div style="display: flex; flex-direction: column; gap: 3px; font-size: 11px;">';
      if (rev.dokumen_surat_link) {
        berkasHtml += `<a href="${escHtml(rev.dokumen_surat_link)}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: none; font-weight: 600;">📄 Nota Dinas &rarr;</a>`;
      }
      if (rev.dokumen_matriks_link) {
        berkasHtml += `<a href="${escHtml(rev.dokumen_matriks_link)}" target="_blank" rel="noopener noreferrer" style="color: #15803d; text-decoration: none; font-weight: 600;">📊 RKB PIC &rarr;</a>`;
      }
      if (kakLink) {
        berkasHtml += `<a href="${escHtml(kakLink)}" target="_blank" rel="noopener noreferrer" style="color: #7c3aed; text-decoration: none; font-weight: 600;">📑 KAK &rarr;</a>`;
      }
      if (!rev.dokumen_surat_link && !rev.dokumen_matriks_link && !kakLink) {
        berkasHtml += '<span style="color: #94a3b8;">- Tidak ada berkas -</span>';
      }
      berkasHtml += '</div>';

      // Tombol Aksi Meja Kerja
      const isPerluPenelitian = rev.status_tahap === 'DIAJUKAN' || ((rev.tahap_terkini === 1 || rev.tahap_terkini === 2) && rev.status_tahap === 'PROSES');
      const isMenungguPleno = rev.status_tahap === 'MENUNGGU_PLENO' || (rev.tahap_terkini === 3 && rev.status_tahap === 'PROSES');

      let actionBtns = `
        <button class="btn btn-outline btn-xs" onclick="openRevisiDetail(${rev.id})" style="width: 100%; margin-bottom: 3px;">
          🔍 Periksa Detail
        </button>
      `;

      if (isPerluPenelitian) {
        actionBtns += `
          <button class="btn btn-success btn-xs" onclick="openRevisiTahapAction(${rev.id}, 2)" style="width: 100%; margin-bottom: 3px;" title="Teliti SBM & Teruskan ke ACC Pleno">
            ✔️ Teliti &amp; Teruskan
          </button>
          <button class="btn btn-danger btn-xs" onclick="quickRejectTahap2(${rev.id})" style="width: 100%;" title="Kembalikan berkas ke PIC Subbag untuk perbaikan">
            ↩️ Kembalikan
          </button>
        `;
      } else if (isMenungguPleno) {
        actionBtns += `
          <button class="btn btn-info btn-xs" onclick="openRevisiTahapAction(${rev.id}, 3)" style="width: 100%; margin-bottom: 3px;" title="Putusan Rapat Pleno Komisioner">
            🏛️ Catat Putusan Pleno
          </button>
        `;
      } else if (rev.status_tahap === 'SELESAI') {
        actionBtns += `
          <span style="font-size: 10px; color: #15803d; font-weight: 700;">✅ Terkunci Resmi</span>
        `;
      }

      return `
        <tr>
          <td class="text-center" style="font-weight: 600; color: #64748b;">${idx + 1}</td>
          <td>
            <div style="font-family: var(--font-mono); font-weight: 700; color: #1e40af; font-size: 11.5px;">
              ${escHtml(rev.kode_revisi)}
              <span class="badge badge-info" style="font-size: 9.5px; margin-left: 3px;">${verBadge}</span>
            </div>
            <div style="font-size: 10px; color: #64748b;">Thang: ${rev.tahun_anggaran}</div>
          </td>
          <td>
            <span class="badge badge-primary" style="font-size: 10px; padding: 2px 6px;">${escHtml(rev.subbag)}</span>
          </td>
          <td>
            <div style="font-weight: 700; color: #0f172a; font-size: 12px;">${escHtml(rev.perihal)}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              No. Surat: <strong>${escHtml(rev.nomor_surat)}</strong> (${escHtml(rev.tanggal_surat)})
            </div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 11.5px; color: #1e40af;">
              ${escHtml(rev.pejabat_pengusul || getKomisionerBySubbag(rev.subbag))}
            </div>
          </td>
          <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: #1e40af;">
            ${formatRupiah(rev.total_semula || 0)}
          </td>
          <td>${berkasHtml}</td>
          <td class="text-center">${statusBadge}</td>
          <td class="text-center">
            <div style="display: flex; flex-direction: column; align-items: stretch; gap: 2px;">
              ${actionBtns}
            </div>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.warn('Gagal memuat validasi revisi:', err);
    tableBody.innerHTML = `<tr><td colspan="9" class="text-center text-danger" style="padding: 24px;">Gagal memuat meja kerja validasi: ${escHtml(err.message)}</td></tr>`;
  }
}

async function quickRejectTahap2(id) {
  const catatan = prompt('Tuliskan alasan / rincian perbaikan yang diperlukan oleh PIC Subbagian:');
  if (catatan === null) return;
  if (!catatan.trim()) {
    alert('Catatan perbaikan wajib diisi agar PIC Subbag mengetahui bagian yang harus disesuaikan.');
    return;
  }

  try {
    const res = await apiFetch(`/api/revisi/pengajuan/${id}/tahap`, {
      method: 'POST',
      body: JSON.stringify({
        tahap: 2,
        aksi: 'PERBAIKAN',
        catatan: catatan.trim()
      })
    });
    showToast(res.message || 'Berkas usulan berhasil dikembalikan untuk perbaikan.', 'warning');
    await loadValidasiRevisiTable();
    await loadRevisiMonitoringTable();
  } catch (err) {
    alert('Gagal mengembalikan berkas: ' + err.message);
  }
}

// ----------------------------------------------------------------------------
// PENGESAHAN BA PLENO (TAHAP 4: KUNCI RKB DRAF KESELURUHAN)
// ----------------------------------------------------------------------------

async function loadTahap4ViewData() {
  const statusEl = document.getElementById('tahap4-draft-status');
  const namaEl = document.getElementById('tahap4-draft-nama');
  const versiEl = document.getElementById('tahap4-draft-versi');
  const itemsEl = document.getElementById('tahap4-draft-items');
  const totalEl = document.getElementById('tahap4-draft-total');
  const tableBody = document.getElementById('table-tahap4-usulan-acc');

  if (tableBody) {
    tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 16px; color: #64748b;">Memuat status draf RKB aktif...</td></tr>`;
  }

  try {
    const res = await apiFetch('/api/revisi/tahap4-info');
    const p = res.periode;
    if (!p) {
      if (namaEl) namaEl.textContent = 'Tidak ada siklus revisi aktif (Menunggu Pengajuan Tahap 1)';
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 16px; color: #64748b;">Belum ada siklus revisi aktif. Siklus baru akan terbuka otomatis saat PIC Subbagian mengajukan usulan Tahap 1.</td></tr>`;
      }
      const btnSubmit = document.getElementById('btn-submit-tahap4-final');
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.className = 'btn btn-secondary';
        btnSubmit.innerHTML = '⚠️ Tidak Ada Siklus Aktif yang Siap Disahkan';
      }
      return;
    }

    if (statusEl) {
      statusEl.className = p.is_locked ? 'badge badge-secondary' : 'badge badge-success';
      statusEl.textContent = p.is_locked ? '🔒 TERKUNCI' : '🟢 DRAFT AKTIF';
    }
    if (namaEl) {
      namaEl.innerHTML = `${escHtml(p.nama_periode)} ${res.dasar_anggaran ? `<br><small style="font-weight:normal; color:#64748b;">(Dasar Semula: <strong>${escHtml(res.dasar_anggaran.nama_periode)}</strong> | Fase: <strong>${escHtml(p.fase_perencanaan || 'PRA_NPHD')}</strong>)</small>` : ''}`;
    }
    if (versiEl) versiEl.textContent = p.versi_revisi || 'Baseline Draft';
    if (itemsEl) itemsEl.textContent = `${res.total_items} Item RKB`;
    if (totalEl) totalEl.textContent = formatRupiah(res.total_pagu || 0);

    // Default Fase Perencanaan & Dasar Pengesahan (Bab 17 Canon)
    const faseInput = document.getElementById('tahap4-input-fase');
    if (faseInput) {
      faseInput.value = p.fase_perencanaan || 'PRA_NPHD';
    }
    const dasarInput = document.getElementById('tahap4-input-dasar-pengesahan');
    if (dasarInput && p.dasar_pengesahan && p.dasar_pengesahan !== 'Kertas Kerja Penyusunan') {
      dasarInput.value = p.dasar_pengesahan;
    }

    // Default nomor BA Pleno & tanggal
    const noBaInput = document.getElementById('tahap4-input-nomor-ba');
    const tglBaInput = document.getElementById('tahap4-input-tanggal-ba');
    if (noBaInput && !noBaInput.value) {
      const year = new Date().getFullYear();
      noBaInput.value = `05/BA.01-BA/3521/${year}`;
    }
    if (tglBaInput && !tglBaInput.value) {
      tglBaInput.value = new Date().toISOString().split('T')[0];
    }

    const proposalsList = res.proposals || [];
    const isReady = Boolean(res.is_ready_for_ratification || res.siap_pengesahan);

    if (tableBody) {
      if (proposalsList.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="padding: 16px; color: #64748b;">Belum ada pengajuan usulan revisi subbag dalam siklus berjalan.</td></tr>`;
      } else {
        tableBody.innerHTML = proposalsList.map(u => {
          const verBadge = `V${u.versi_usulan || 1}`;
          let badgeStatus = '<span class="badge badge-warning" style="font-size: 10px;">Proses</span>';
          if (u.status_tahap === 'ACC_PLENO' || u.tahap3_hasil === 'SETUJU') {
            badgeStatus = `<span class="badge badge-success" style="font-size: 10px;">ACC Pleno (${verBadge})</span>`;
          } else if (u.status_tahap === 'DIKEMBALIKAN' || u.status_tahap === 'PERBAIKAN') {
            badgeStatus = `<span class="badge badge-danger" style="font-size: 10px;">Dikembalikan (${verBadge})</span>`;
          } else if (u.status_tahap === 'MENUNGGU_PLENO') {
            badgeStatus = `<span class="badge badge-info" style="font-size: 10px;">Valid / Menunggu Pleno (${verBadge})</span>`;
          } else if (u.status_tahap === 'DIAJUKAN') {
            badgeStatus = `<span class="badge badge-secondary" style="font-size: 10px;">Tahap 1 Diajukan (${verBadge})</span>`;
          }
          return `
            <tr>
              <td><span class="badge badge-primary" style="font-size: 10px;">${escHtml(u.subbag)}</span></td>
              <td><code style="font-size: 11px;">${escHtml(u.kode_revisi)}</code></td>
              <td style="font-size: 11px;">${escHtml(u.nomor_surat)}</td>
              <td class="text-center">${badgeStatus}</td>
            </tr>
          `;
        }).join('');
      }
    }

    const btnSubmit = document.getElementById('btn-submit-tahap4-final');
    if (btnSubmit) {
      if (!isReady) {
        btnSubmit.disabled = true;
        btnSubmit.className = 'btn btn-secondary';
        const pendingStr = (res.pending_subbags && res.pending_subbags.length > 0) ? res.pending_subbags.join(', ') : 'Belum ada pengajuan ACC Pleno';
        btnSubmit.title = `Belum dapat disahkan: ${pendingStr}`;
        btnSubmit.innerHTML = `⚠️ Belum Dapat Disahkan (${escHtml(pendingStr)})`;
      } else {
        btnSubmit.disabled = false;
        btnSubmit.className = 'btn btn-success';
        btnSubmit.title = '';
        btnSubmit.innerHTML = '🔒 Kunci RKB Keseluruhan &amp; Sahkan BA Pleno (Tahap 4)';
      }
    }
  } catch (err) {
    console.warn('Gagal memuat info tahap 4:', err);
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger" style="padding: 16px;">Gagal memuat: ${escHtml(err.message)}</td></tr>`;
    }
  }
}

async function submitPengesahanTahap4Keseluruhan() {
  const fasePerencanaan = document.getElementById('tahap4-input-fase')?.value || 'PRA_NPHD';
  const dasarPengesahan = document.getElementById('tahap4-input-dasar-pengesahan')?.value || 'BA Pleno Komisioner';
  const noBa = document.getElementById('tahap4-input-nomor-ba')?.value?.trim();
  const tglBa = document.getElementById('tahap4-input-tanggal-ba')?.value;
  const linkBa = document.getElementById('tahap4-input-link-ba')?.value?.trim();
  const linkRkbFinal = document.getElementById('tahap4-input-link-rkb-final')?.value?.trim();
  const linkKakGabungan = document.getElementById('tahap4-input-link-kak-gabungan')?.value?.trim();
  const checkVerifikasi = document.getElementById('tahap4-check-verifikasi');
  const catatan = document.getElementById('tahap4-input-catatan')?.value?.trim();

  if (!noBa || !tglBa) {
    alert('Nomor Berita Acara Pleno dan Tanggal BA Pleno wajib diisi.');
    return;
  }

  if (!linkBa) {
    alert('Tautan Google Drive Berita Acara Pleno (BA Pleno) bertanda tangan wajib dilampirkan.');
    return;
  }

  if (!linkRkbFinal) {
    alert('Tautan Google Drive RKB Final bertanda tangan wajib dilampirkan.');
    return;
  }

  if (!linkKakGabungan) {
    alert('Tautan Google Drive KAK Gabungan wajib dilampirkan.');
    return;
  }

  if (!checkVerifikasi || !checkVerifikasi.checked) {
    alert('Harap beri tanda centang pada verifikasi manual sebelum mengesahkan dan mengunci RKB Tahap 4.');
    return;
  }

  const confirmMsg = `PERINGATAN PENGESAHAN DOKUMEN TAHAP 4:\n\n` +
    `Anda akan MENGUNCI RESMI RKB siklus ini secara keseluruhan:\n` +
    `- Fase Perencanaan: ${fasePerencanaan}\n` +
    `- Dasar Pengesahan: ${dasarPengesahan}\n` +
    `- Nomor BA Pleno: ${noBa} (${tglBa})\n\n` +
    `Dokumen RKB saat ini akan dikunci permanen menjadi Baseline Sah berikutnya.\n\n` +
    `Apakah Anda yakin ingin melanjutkan pengesahan?`;

  if (!confirm(confirmMsg)) return;

  const btnSubmit = document.getElementById('btn-submit-tahap4-final');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = '🔒 Mengunci RKB & Mengesahkan Dokumen...';
  }

  try {
    const res = await apiFetch('/api/revisi/pengesahan-tahap4-keseluruhan', {
      method: 'POST',
      body: JSON.stringify({
        nomor_ba: noBa,
        tanggal_ba: tglBa,
        link_scan_ba: linkBa,
        rkb_final_link: linkRkbFinal,
        kak_gabungan_link: linkKakGabungan,
        fase_perencanaan: fasePerencanaan,
        dasar_pengesahan: dasarPengesahan,
        verifikasi_manual: true,
        strict_tahap4: true,
        catatan
      })
    });

    showToast(res.message || 'RKB Siklus berhasil dikunci secara keseluruhan dengan BA Pleno!', 'success');

    // Reload periodes dan RKB dataset
    await loadPeriodes();
    await loadRkbData();
    renderAllViews();

    // Beralih ke Pusat Siklus Dokumen & Arsip Revisi terpadu
    switchView('view-siklus');
  } catch (err) {
    alert('Gagal mengesahkan Tahap 4: ' + err.message);
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = '🔒 Kunci RKB Keseluruhan & Sahkan BA Pleno (Tahap 4)';
    }
  }
}

// ----------------------------------------------------------------------------
// RIWAYAT ARSIP DOKUMEN REVISI (DILEBUR KE PUSAT SIKLUS DOKUMEN - BAB 5 CANON)
// ----------------------------------------------------------------------------

async function loadRevisiArsipTable() {
  renderSiklus();
}

async function openKoreksiTautanPascaPengesahan(periodeId, event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  try {
    let item = (AppState.periodesList || []).find(a => Number(a.id) === Number(periodeId));
    if (!item) {
      const res = await apiFetch('/api/revisi/arsip');
      item = (res.data || []).find(a => Number(a.id) === Number(periodeId));
    }
    if (!item) {
      alert('Data arsip tidak ditemukan.');
      return;
    }

    const currentBa = item.gdrive_link_pleno || item.file_pendukung_path || '';
    const newBa = prompt('1. Koreksi Tautan Google Drive BA Pleno Bertanda Tangan:', currentBa);
    if (newBa === null) return;
    const newRkb = prompt('2. Koreksi Tautan Google Drive RKB Final Bertanda Tangan:', item.rkb_final_link || '');
    if (newRkb === null) return;
    const newKak = prompt('3. Koreksi Tautan Google Drive KAK Gabungan:', item.kak_gabungan_link || '');
    if (newKak === null) return;
    const catatan = prompt('Alasan / Catatan Koreksi Tautan (Wajib untuk Audit Log):', 'Perbaikan tautan Google Drive dokumen arsip pasca-pengesahan');
    if (catatan === null) return;

    const saveRes = await apiFetch(`/api/periodes/${periodeId}/koreksi-tautan`, {
      method: 'POST',
      body: JSON.stringify({
        gdrive_link_pleno: newBa.trim(),
        rkb_final_link: newRkb.trim(),
        kak_gabungan_link: newKak.trim(),
        catatan: catatan.trim()
      })
    });

    showToast(saveRes.message || 'Tautan dokumen arsip berhasil diperbarui.', 'success');
    await loadPeriodes();
    renderSiklus();
  } catch (err) {
    alert('Gagal memperbarui tautan pasca-pengesahan: ' + err.message);
  }
}

async function bukaArsipKertasKerja(periodeId) {
  const p = AppState.periodes.find(item => item.id === periodeId);
  if (!p) return;
  AppState.currentPeriode = p;
  await loadRkbData();
  renderAllViews();
  switchView('view-rkb');
  showToast(`Membuka arsip dokumen: ${p.nama_periode} (Mode Read-Only)`, 'info');
}

async function downloadArsipExcel(periodeId) {
  try {
    await downloadProtectedFile(`/api/export-excel/${periodeId}`, `RKB_Arsip_${periodeId}.xlsx`);
  } catch (err) {
    showToast('Gagal mengunduh arsip: ' + err.message, 'error');
  }
}

window.initRevisiPengajuanView = initRevisiPengajuanView;
window.handleSubbagInputChange = handleSubbagInputChange;
window.getKomisionerBySubbag = getKomisionerBySubbag;
window.goToRevisiStep = goToRevisiStep;
window.loadSubbagPreviewData = loadSubbagPreviewData;
window.resetRevisiForm = resetRevisiForm;
window.submitRevisiUsulanFinal = submitRevisiUsulanFinal;
window.handleMonitoringRevisiSearch = handleMonitoringRevisiSearch;
window.loadRevisiMonitoringTable = loadRevisiMonitoringTable;
window.openRevisiDetail = openRevisiDetail;
window.closeModalRevisiDetail = closeModalRevisiDetail;
window.openRevisiTahapAction = openRevisiTahapAction;
window.handleTahapDecisionChange = handleTahapDecisionChange;
window.closeModalTahapAction = closeModalTahapAction;
window.submitRevisiTahapAction = submitRevisiTahapAction;
window.loadValidasiRevisiTable = loadValidasiRevisiTable;
window.quickRejectTahap2 = quickRejectTahap2;
window.loadTahap4ViewData = loadTahap4ViewData;
window.submitPengesahanTahap4Keseluruhan = submitPengesahanTahap4Keseluruhan;
window.loadRevisiArsipTable = loadRevisiArsipTable;
window.openKoreksiTautanPascaPengesahan = openKoreksiTautanPascaPengesahan;
window.bukaArsipKertasKerja = bukaArsipKertasKerja;
window.downloadArsipExcel = downloadArsipExcel;

window.filterMatriksModalRows = filterMatriksModalRows;
window.showLoginScreen = showLoginScreen;
window.showMainApp = showMainApp;
window.toggleScreenPasswordVisibility = toggleScreenPasswordVisibility;
window.clearLoginScreenError = clearLoginScreenError;
window.submitScreenLoginForm = submitScreenLoginForm;
window.quickDeveloperLogin = quickDeveloperLogin;
window.isDeveloperSession = isDeveloperSession;
window.logout = logout;
window.switchView = switchView;
window.generateSaktiRouteToken = generateSaktiRouteToken;
window.generateSaktiLoginToken = generateSaktiLoginToken;
window.parseSaktiRouteToken = parseSaktiRouteToken;
window.SAKTI_VIEW_TITLES = SAKTI_VIEW_TITLES;

// ============================================================================
// POPSTATE LISTENER: DUKUNGAN NAVIGASI BROWSER (BACK / FORWARD) ALA SAKTI
// ============================================================================
window.addEventListener('popstate', (event) => {
  if (!AppState.currentUser) {
    showLoginScreen(false);
    return;
  }
  if (event.state && event.state.viewId) {
    if (event.state.revisionViewMode) {
      AppState.revisionViewMode = event.state.revisionViewMode;
      const cb = document.getElementById('chk-revision-sanding');
      if (cb) cb.checked = (event.state.revisionViewMode === 'SANDING');
    }
    switchView(event.state.viewId, false);
    document.title = (SAKTI_VIEW_TITLES[event.state.viewId] || 'SI-PRABU') + ' | SAKTI Kemenkeu - KPU Ngawi';
  } else {
    const parsed = parseSaktiRouteToken(window.location.pathname);
    if (parsed && parsed.viewId) {
      if (parsed.isSanding) {
        AppState.revisionViewMode = 'SANDING';
        const cb = document.getElementById('chk-revision-sanding');
        if (cb) cb.checked = true;
      }
      switchView(parsed.viewId, false);
      document.title = (SAKTI_VIEW_TITLES[parsed.viewId] || 'SI-PRABU') + ' | SAKTI Kemenkeu - KPU Ngawi';
    } else {
      switchView('view-dashboard', false);
      document.title = (SAKTI_VIEW_TITLES['view-dashboard'] || 'SI-PRABU') + ' | SAKTI Kemenkeu - KPU Ngawi';
    }
  }
});

// ============================================================================
// MENU MANDIRI: REKAP ANGGARAN (REKAP PERENCANAAN & REKAP PELAKSANAAN - BAB 21)
// ============================================================================

AppState.rekapState = {
  perencanaan: { tab: 'EKSEKUTIF', data: null },
  pelaksanaan: { tab: 'EKSEKUTIF', data: null }
};

async function loadRekapView(mode = 'perencanaan') {
  const cleanMode = mode === 'pelaksanaan' ? 'pelaksanaan' : 'perencanaan';
  const selectEl = document.getElementById(`rekap-${cleanMode}-pic-select`);
  const picBox = document.getElementById(`rekap-${cleanMode}-pic-filter-box`);
  const lockedBadge = document.getElementById(`rekap-${cleanMode}-pic-locked-badge`);
  const contentBox = document.getElementById(`rekap-${cleanMode}-content`);
  const docLabel = document.getElementById(`rekap-${cleanMode}-doc-label`);

  if (contentBox) {
    contentBox.innerHTML = `<div class="text-center" style="padding: 28px;">⏳ Memuat data Rekap ${cleanMode === 'pelaksanaan' ? 'Pelaksanaan' : 'Perencanaan'}...</div>`;
  }

  const requestedPic = selectEl ? selectEl.value : 'SEMUA';
  try {
    const res = await apiFetch(`/api/rekap/${cleanMode}?pic=${encodeURIComponent(requestedPic)}`);
    AppState.rekapState[cleanMode].data = res;

    if (docLabel && res.periode) {
      docLabel.innerHTML = `<strong>${escHtml(res.periode.nama_periode)}</strong> (${escHtml(res.periode.versi_revisi || 'Induk')}) • Fase: <span class="badge badge-info">${escHtml(res.periode.fase_perencanaan || 'PRA_NPHD')}</span> • Dasar: <strong>${escHtml(res.periode.dasar_pengesahan || '-')}</strong>`;
    }

    if (res.can_view_all) {
      if (picBox) picBox.style.display = 'inline-flex';
      if (lockedBadge) lockedBadge.style.display = 'none';
      if (selectEl) selectEl.value = res.filter_pic || 'SEMUA';
    } else {
      if (picBox) picBox.style.display = 'none';
      if (lockedBadge) {
        lockedBadge.style.display = 'inline-flex';
        lockedBadge.textContent = `🏢 Terkunci pada PIC: ${res.filter_pic}`;
      }
    }

    renderRekapTabContent(cleanMode);
  } catch (err) {
    if (contentBox) {
      contentBox.innerHTML = `<div class="alert alert-danger" style="margin:0;">❌ ${escHtml(err.message)}</div>`;
    }
  }
}

function switchRekapTab(mode, tabName) {
  const cleanMode = mode === 'pelaksanaan' ? 'pelaksanaan' : 'perencanaan';
  AppState.rekapState[cleanMode].tab = tabName;
  const tabContainer = document.getElementById(`rekap-${cleanMode}-tabs`);
  if (tabContainer) {
    tabContainer.querySelectorAll('button[data-tab]').forEach(btn => {
      const isAct = btn.getAttribute('data-tab') === tabName;
      btn.className = isAct ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary';
    });
  }
  renderRekapTabContent(cleanMode);
}

function renderRekapTabContent(mode) {
  const cleanMode = mode === 'pelaksanaan' ? 'pelaksanaan' : 'perencanaan';
  const state = AppState.rekapState[cleanMode];
  const contentBox = document.getElementById(`rekap-${cleanMode}-content`);
  if (!contentBox || !state || !state.data) return;

  const { summary, doc_summary, kegiatan_rows, akun_map, filter_pic, periode } = state.data;
  const tab = state.tab || 'EKSEKUTIF';
  const total = Number(summary?.grandTotal) || 0;

  if (tab === 'EKSEKUTIF') {
    const bySasaran = summary?.bySasaran || {};
    const sasOrder = [
      { code: 'KAB', label: '1. KPU Kabupaten Ngawi (Satker)' },
      { code: 'PPK', label: '2. PPK (19 Kecamatan)' },
      { code: 'PPS', label: '3. PPS (217 Desa / Kelurahan)' },
      { code: 'PANTARLIH', label: '4. Pantarlih / PPDP' },
      { code: 'TPS', label: '5. TPS (KPPS & Linmas)' },
      { code: 'PESERTA', label: '6. Peserta Pemilihan (Paslon)' }
    ];
    contentBox.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 18px;">
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:14px;">
          <div style="font-size:11px; font-weight:700; color:#1e40af;">TOTAL PAGU (${escHtml(filter_pic)})</div>
          <div style="font-size:20px; font-weight:800; font-family:var(--font-mono); color:#1e3a8a; margin-top:4px;">${formatRupiah(total)}</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:14px;">
          <div style="font-size:11px; font-weight:700; color:#475569;">TOTAL ITEM BELANJA</div>
          <div style="font-size:20px; font-weight:800; font-family:var(--font-mono); color:#0f172a; margin-top:4px;">${formatNumber(summary?.totalItems || 0)} Item</div>
        </div>
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:14px;">
          <div style="font-size:11px; font-weight:700; color:#166534;">FASE &amp; STATUS SUMBER</div>
          <div style="font-size:14px; font-weight:800; color:#15803d; margin-top:6px;">${escHtml(periode?.fase_perencanaan || 'PRA_NPHD')} • ${periode?.is_locked ? 'TERKUNCI SAH' : 'RKB AKTIF'}</div>
        </div>
      </div>
      <h4 style="font-size:14px; font-weight:700; margin-bottom:10px;">Distribusi Alokasi Berdasarkan Sasaran</h4>
      <div class="table-responsive">
        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Kelompok Sasaran</th>
              <th class="text-right">Jumlah Anggaran (Rp)</th>
              <th class="text-right">Porsi (%)</th>
            </tr>
          </thead>
          <tbody>
            ${sasOrder.map(s => {
              const val = Number(bySasaran[s.code]) || 0;
              const pct = total > 0 ? ((val / total) * 100).toFixed(2) : '0.00';
              return `
                <tr>
                  <td><strong>${escHtml(s.label)}</strong></td>
                  <td class="text-right" style="font-family:var(--font-mono); font-weight:700;">${formatRupiah(val)}</td>
                  <td class="text-right" style="font-family:var(--font-mono);">${pct}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#eff6ff; font-weight:800;">
              <td>TOTAL REKAPITULASI</td>
              <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(total)}</td>
              <td class="text-right" style="font-family:var(--font-mono);">100.00%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  } else if (tab === 'KEGIATAN') {
    contentBox.innerHTML = `
      <div class="table-responsive">
        <table class="table table-bordered table-hover">
          <thead>
            <tr>
              <th style="width:90px;">Kode</th>
              <th>Uraian Bagian / Tahapan / Kegiatan RKB (L1 – L3)</th>
              <th style="width:110px;">PIC Subbag</th>
              <th class="text-right" style="width:180px;">Jumlah Anggaran (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${(kegiatan_rows || []).filter(r => Number(r.level_indent) <= 2).map(r => {
              const lvl = Number(r.level_indent);
              const rowStyle = lvl === 0
                ? 'font-weight:800; background:#1e293b; color:#fff;'
                : (lvl === 1 ? 'font-weight:700; background:#f1f5f9;' : '');
              return `
                <tr style="${rowStyle}">
                  <td style="font-family:var(--font-mono);">${escHtml(r.kode)}</td>
                  <td style="padding-left:${lvl * 16 + 10}px;">${escHtml(r.uraian)}</td>
                  <td>${lvl <= 1 ? `<span style="font-size:11px; opacity:0.85;">${lvl === 0 ? 'Kelompok Makro' : 'Kelompok Tahapan'}</span>` : `<span class="pic-chip pic-${escHtml(r.pic_bagian)}">${escHtml(r.pic_bagian)}</span>`}</td>
                  <td class="text-right" style="font-family:var(--font-mono); font-weight:${lvl <= 1 ? '800' : '600'};">${formatRupiah(r.jumlah)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#eff6ff; font-weight:800;">
              <td colspan="3">TOTAL REKAPITULASI KEGIATAN RKB (L1 – L3)</td>
              <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  } else if (tab === 'SUBBAGIAN') {
    const bySub = (filter_pic && filter_pic !== 'SEMUA') ? (summary?.bySubbag || {}) : (doc_summary?.bySubbag || summary?.bySubbag || {});
    const refTotal = (filter_pic && filter_pic !== 'SEMUA') ? total : (Number(doc_summary?.grandTotal) || total);
    const subKeys = ['RENDATIN', 'TEKNIS', 'HUKUM', 'PARSDM', 'KUL'];
    contentBox.innerHTML = `
      <div class="table-responsive">
        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th style="width:120px;">Kode PIC</th>
              <th>Nama Subbagian Pelaksana</th>
              <th class="text-right" style="width:190px;">Alokasi Pagu (Rp)</th>
              <th class="text-right" style="width:110px;">Porsi (%)</th>
            </tr>
          </thead>
          <tbody>
            ${subKeys.filter(k => filter_pic === 'SEMUA' || k === filter_pic).map(k => {
              const val = Number(bySub[k]) || 0;
              const pct = refTotal > 0 ? ((val / refTotal) * 100).toFixed(2) : '0.00';
              const meta = SUBBAG_META[k] || { name: k };
              return `
                <tr>
                  <td><span class="pic-chip pic-${k}">${k}</span></td>
                  <td><strong>${escHtml(meta.name)}</strong></td>
                  <td class="text-right" style="font-family:var(--font-mono); font-weight:700;">${formatRupiah(val)}</td>
                  <td class="text-right" style="font-family:var(--font-mono);">${pct}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#eff6ff; font-weight:800;">
              <td colspan="2">TOTAL ANGGARAN</td>
              <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(total)}</td>
              <td class="text-right" style="font-family:var(--font-mono);">100.00%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  } else if (tab === 'AKUN_BAS') {
    const byAkun = summary?.byAkun || {};
    const sorted = Object.entries(byAkun).filter(([_, v]) => Number(v) > 0).sort((a, b) => a[0].localeCompare(b[0]));
    contentBox.innerHTML = `
      <div class="table-responsive">
        <table class="table table-bordered table-striped">
          <thead>
            <tr>
              <th style="width:110px;">Kode BAS</th>
              <th>Uraian Bagan Akun Standar (6 Digit)</th>
              <th class="text-right" style="width:190px;">Alokasi Anggaran (Rp)</th>
              <th class="text-right" style="width:110px;">Porsi (%)</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(([code, val]) => {
              const numVal = Number(val) || 0;
              const pct = total > 0 ? ((numVal / total) * 100).toFixed(2) : '0.00';
              const info = (akun_map && akun_map[code]) || {};
              return `
                <tr>
                  <td style="font-family:var(--font-mono); font-weight:700; color:#0284c7;">${escHtml(code)}</td>
                  <td>${escHtml(info.uraian || 'Belanja Terkait')}</td>
                  <td class="text-right" style="font-family:var(--font-mono); font-weight:700;">${formatRupiah(numVal)}</td>
                  <td class="text-right" style="font-family:var(--font-mono);">${pct}%</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background:#eff6ff; font-weight:800;">
              <td colspan="2">TOTAL BAGAN AKUN STANDAR</td>
              <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(total)}</td>
              <td class="text-right" style="font-family:var(--font-mono);">100.00%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  } else if (tab === 'COST_SHARING') {
    const byCS = summary?.byCostSharing || { KABUPATEN: 0, PROVINSI: 0 };
    const kabTotal = Number(byCS.KABUPATEN) || 0;
    const provTotal = Number(byCS.PROVINSI) || 0;
    const grandTot = total || (kabTotal + provTotal);
    const kabPct = grandTot > 0 ? ((kabTotal / grandTot) * 100).toFixed(2) : '0.00';
    const provPct = grandTot > 0 ? ((provTotal / grandTot) * 100).toFixed(2) : '0.00';

    const bySubCost = summary?.byCostSharingBySubbag || {};
    const bySasCost = summary?.byCostSharingBySasaran || {};
    const provItems = state.provinsi_items || state.data?.provinsi_items || [];

    const subKeys = ['KUL', 'RENDATIN', 'TEKNIS', 'HUKUM', 'PARSDM'];
    const sasOrder = [
      { code: 'KAB', label: '1. KPU Kabupaten Ngawi (Satker)' },
      { code: 'PPK', label: '2. PPK (19 Kecamatan)' },
      { code: 'PPS', label: '3. PPS (217 Desa / Kelurahan)' },
      { code: 'PANTARLIH', label: '4. Pantarlih / PPDP' },
      { code: 'TPS', label: '5. TPS (KPPS & Linmas)' },
      { code: 'PESERTA', label: '6. Peserta Pemilihan (Paslon)' }
    ];

    contentBox.innerHTML = `
      <!-- Action Bar Unduh Tab 5 Mandiri -->
      <div class="rekap-cost-sharing-action-bar" style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:12px 16px; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
        <div>
          <div style="font-weight:700; color:#1e293b; font-size:13px; display:flex; align-items:center; gap:6px;">
            <i class="fa fa-pie-chart" style="color:#0284c7;"></i> Pemisahan Sumber Pendanaan: APBD Kabupaten &amp; APBD Provinsi (Cost Sharing)
          </div>
          <div style="font-size:12px; color:#64748b; margin-top:2px;">Rekapitulasi resmi pemilahan beban anggaran Pilkada 2024 sesuai NPHD Induk Pemkab Ngawi dan Cost Sharing Pemprov Jatim.</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" class="btn btn-sm btn-success" onclick="exportRekapCostSharingExcel('${cleanMode}')" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
            <i class="fa fa-file-excel-o"></i> Unduh Excel Rekap Sumber Dana
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" onclick="printRekapCostSharingPdf('${cleanMode}')" style="display:inline-flex; align-items:center; gap:6px; font-weight:600;">
            <i class="fa fa-print"></i> Unduh / Cetak PDF
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:8px; padding:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:11px; font-weight:700; color:#1e40af;">APBD KABUPATEN NGAWI</div>
            <span style="font-size:11px; font-weight:800; background:#dbeafe; color:#1e40af; padding:1px 6px; border-radius:4px;">${kabPct}%</span>
          </div>
          <div style="font-size:20px; font-weight:800; font-family:var(--font-mono); color:#1e3a8a; margin-top:6px;">${formatRupiah(kabTotal)}</div>
          <div style="font-size:11px; color:#3b82f6; margin-top:4px;">Beban NPHD Pemkab Ngawi</div>
        </div>

        <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:11px; font-weight:700; color:#92400e;">APBD PROVINSI JAWA TIMUR</div>
            <span style="font-size:11px; font-weight:800; background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:4px;">${provPct}%</span>
          </div>
          <div style="font-size:20px; font-weight:800; font-family:var(--font-mono); color:#b45309; margin-top:6px;">${formatRupiah(provTotal)}</div>
          <div style="font-size:11px; color:#d97706; margin-top:4px;">Cost Sharing Pemprov Jatim (${formatNumber(provItems.length)} Item Belanja)</div>
        </div>

        <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:14px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="font-size:11px; font-weight:700; color:#334155;">TOTAL TERKONSOLIDASI</div>
            <span style="font-size:11px; font-weight:800; background:#e2e8f0; color:#334155; padding:1px 6px; border-radius:4px;">100.00%</span>
          </div>
          <div style="font-size:20px; font-weight:800; font-family:var(--font-mono); color:#0f172a; margin-top:6px;">${formatRupiah(grandTot)}</div>
          <div style="font-size:11px; color:#64748b; margin-top:4px;">Cakupan PIC: ${escHtml(filter_pic || 'SEMUA')}</div>
        </div>
      </div>

      <!-- Tabel 1: Distribusi per Subbagian -->
      <div style="margin-bottom:24px;">
        <h4 style="font-size:14px; font-weight:700; color:#1e293b; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
          <span>I. Distribusi Sumber Dana Berdasarkan Subbagian Pelaksana</span>
        </h4>
        <div class="table-responsive">
          <table class="table table-bordered table-striped" style="margin-bottom:0;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="width:45px; text-align:center;">No</th>
                <th style="width:110px; text-align:center;">Kode PIC</th>
                <th>Nama Subbagian Pelaksana</th>
                <th class="text-right" style="width:180px;">APBD Kab (Rp)</th>
                <th class="text-right" style="width:180px;">APBD Prov (Rp)</th>
                <th class="text-right" style="width:190px;">Total Anggaran (Rp)</th>
                <th class="text-right" style="width:105px;">Porsi Prov (%)</th>
              </tr>
            </thead>
            <tbody>
              ${subKeys.filter(k => filter_pic === 'SEMUA' || k === filter_pic).map((k, idx) => {
                const kabVal = Number(bySubCost[k]?.KABUPATEN) || 0;
                const provVal = Number(bySubCost[k]?.PROVINSI) || 0;
                const totVal = kabVal + provVal;
                const pct = totVal > 0 ? ((provVal / totVal) * 100).toFixed(2) : '0.00';
                const meta = SUBBAG_META[k] || { name: k };
                return `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="text-center"><span class="pic-chip pic-${k}">${k}</span></td>
                    <td><strong>${escHtml(meta.name)}</strong></td>
                    <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(kabVal)}</td>
                    <td class="text-right" style="font-family:var(--font-mono); font-weight:${provVal > 0 ? '700' : 'normal'}; color:${provVal > 0 ? '#b45309' : 'inherit'};">${formatRupiah(provVal)}</td>
                    <td class="text-right" style="font-family:var(--font-mono); font-weight:700;">${formatRupiah(totVal)}</td>
                    <td class="text-right" style="font-family:var(--font-mono); font-weight:${provVal > 0 ? '700' : 'normal'}; color:${provVal > 0 ? '#b45309' : 'inherit'};">${pct}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#eff6ff; font-weight:800;">
                <td colspan="3" class="text-center">TOTAL REKAPITULASI SUBBAGIAN</td>
                <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(kabTotal)}</td>
                <td class="text-right" style="font-family:var(--font-mono); color:#b45309;">${formatRupiah(provTotal)}</td>
                <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(grandTot)}</td>
                <td class="text-right" style="font-family:var(--font-mono); color:#b45309;">${provPct}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Tabel 2: Distribusi per Kelompok Sasaran -->
      <div style="margin-bottom:24px;">
        <h4 style="font-size:14px; font-weight:700; color:#1e293b; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
          <span>II. Distribusi Sumber Dana Berdasarkan Kelompok Sasaran</span>
        </h4>
        <div class="table-responsive">
          <table class="table table-bordered table-striped" style="margin-bottom:0;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="width:45px; text-align:center;">No</th>
                <th>Kelompok Sasaran</th>
                <th class="text-right" style="width:180px;">APBD Kab (Rp)</th>
                <th class="text-right" style="width:180px;">APBD Prov (Rp)</th>
                <th class="text-right" style="width:190px;">Total Anggaran (Rp)</th>
                <th class="text-right" style="width:105px;">Porsi Prov (%)</th>
              </tr>
            </thead>
            <tbody>
              ${sasOrder.map((s, idx) => {
                const kabVal = Number(bySasCost[s.code]?.KABUPATEN) || 0;
                const provVal = Number(bySasCost[s.code]?.PROVINSI) || 0;
                const totVal = kabVal + provVal;
                const pct = totVal > 0 ? ((provVal / totVal) * 100).toFixed(2) : '0.00';
                return `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td><strong>${escHtml(s.label)}</strong></td>
                    <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(kabVal)}</td>
                    <td class="text-right" style="font-family:var(--font-mono); font-weight:${provVal > 0 ? '700' : 'normal'}; color:${provVal > 0 ? '#b45309' : 'inherit'};">${formatRupiah(provVal)}</td>
                    <td class="text-right" style="font-family:var(--font-mono); font-weight:700;">${formatRupiah(totVal)}</td>
                    <td class="text-right" style="font-family:var(--font-mono); font-weight:${provVal > 0 ? '700' : 'normal'}; color:${provVal > 0 ? '#b45309' : 'inherit'};">${pct}%</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#eff6ff; font-weight:800;">
                <td colspan="2" class="text-center">TOTAL REKAPITULASI SASARAN</td>
                <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(kabTotal)}</td>
                <td class="text-right" style="font-family:var(--font-mono); color:#b45309;">${formatRupiah(provTotal)}</td>
                <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(grandTot)}</td>
                <td class="text-right" style="font-family:var(--font-mono); color:#b45309;">${provPct}%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Tabel 3: Rincian Khusus Belanja Bersumber APBD Provinsi -->
      <div style="margin-bottom:16px;">
        <h4 style="font-size:14px; font-weight:700; color:#92400e; margin-bottom:10px; display:flex; align-items:center; gap:8px;">
          <span>III. Rincian Belanja yang Dibiayai Cost Sharing APBD Provinsi Jatim</span>
          <span style="font-size:12px; font-weight:600; background:#fef3c7; color:#92400e; padding:2px 8px; border-radius:12px; border:1px solid #fde68a;">
            ${formatNumber(provItems.length)} Item
          </span>
        </h4>
        <div class="table-responsive">
          <table class="table table-bordered table-hover" style="margin-bottom:0;">
            <thead>
              <tr style="background:#fffbeb; color:#92400e;">
                <th style="width:40px; text-align:center;">No</th>
                <th style="width:95px; text-align:center;">Kode Akun</th>
                <th style="width:85px; text-align:center;">Kode RKB</th>
                <th>Uraian Rincian Belanja</th>
                <th style="width:90px; text-align:center;">Subbag</th>
                <th style="width:85px; text-align:center;">Sasaran</th>
                <th class="text-right" style="width:95px;">Volume</th>
                <th class="text-right" style="width:130px;">Harga Satuan (Rp)</th>
                <th class="text-right" style="width:160px;">Total Alokasi (Rp)</th>
              </tr>
            </thead>
            <tbody>
              ${provItems.length === 0 ? `
                <tr>
                  <td colspan="9" class="text-center" style="padding:18px; color:#64748b; font-style:italic;">
                    Tidak ada rincian belanja bersumber APBD Provinsi pada cakupan filter ini.
                  </td>
                </tr>
              ` : provItems.map((it, idx) => `
                <tr>
                  <td class="text-center" style="font-size:11px;">${idx + 1}</td>
                  <td class="text-center" style="font-family:var(--font-mono); font-size:11px; font-weight:700; color:#0284c7;">${escHtml(it.kode_akun || '-')}</td>
                  <td class="text-center" style="font-family:var(--font-mono); font-size:11px; color:#64748b;">${escHtml(it.kode || '-')}</td>
                  <td><strong>${escHtml(it.uraian)}</strong></td>
                  <td class="text-center"><span class="pic-chip pic-${escHtml(it.pic_bagian)}">${escHtml(it.pic_bagian)}</span></td>
                  <td class="text-center"><span style="font-size:11px; font-weight:700; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${escHtml(it.target_scope || 'KAB')}</span></td>
                  <td class="text-right" style="font-family:var(--font-mono); font-size:11px;">${formatNumber(it.volume || 1)} ${escHtml(it.satuan || '')}</td>
                  <td class="text-right" style="font-family:var(--font-mono); font-size:11px;">${formatRupiah(it.harga_satuan || 0)}</td>
                  <td class="text-right" style="font-family:var(--font-mono); font-weight:700; color:#b45309;">${formatRupiah(it.jumlah || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#fffbeb; font-weight:800; color:#92400e;">
                <td colspan="8" class="text-center">TOTAL RINCIAN BELANJA SHARING APBD PROVINSI</td>
                <td class="text-right" style="font-family:var(--font-mono); font-weight:800; color:#b45309; font-size:13px;">${formatRupiah(provTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  }
}

async function exportRekapExcel(mode = 'perencanaan') {
  const cleanMode = mode === 'pelaksanaan' ? 'pelaksanaan' : 'perencanaan';
  const state = AppState.rekapState[cleanMode]?.data;
  if (!state || !state.periode) {
    showToast('Data rekap belum dimuat.', 'warning');
    return;
  }
  const pId = state.periode.id;
  const filterPic = state.filter_pic || 'SEMUA';
  const qs = filterPic !== 'SEMUA' ? `?pic=${encodeURIComponent(filterPic)}` : '';
  await downloadProtectedFile(`/api/export-excel/${pId}${qs}`, `Rekap_${cleanMode}_${state.periode.versi_revisi || 'RKB'}_${filterPic}.xlsx`);
}

function printRekapPdf(mode = 'perencanaan') {
  const cleanMode = mode === 'pelaksanaan' ? 'pelaksanaan' : 'perencanaan';
  const state = AppState.rekapState[cleanMode]?.data;
  const contentEl = document.getElementById(`rekap-${cleanMode}-content`);
  if (!state || !contentEl) return;

  const win = window.open('', '_blank');
  if (!win) {
    window.print();
    return;
  }
  const title = cleanMode === 'pelaksanaan' ? 'REKAP PELAKSANAAN ANGGARAN (BASELINE SAH)' : 'REKAP PERENCANAAN ANGGARAN (RKB AKTIF)';
  win.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${escHtml(title)} - SI-PRABU KPU Kabupaten Ngawi</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; font-size: 12px; }
        h2 { margin: 0 0 4px 0; font-size: 16px; }
        .meta { margin-bottom: 16px; font-size: 11.5px; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #94a3b8; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; }
        .text-right { text-align: right; }
      </style>
    </head>
    <body>
      <h2>${escHtml(title)}</h2>
      <div class="meta">
        Dokumen: <strong>${escHtml(state.periode.nama_periode)} (${escHtml(state.periode.versi_revisi)})</strong> |
        Fase: <strong>${escHtml(state.periode.fase_perencanaan)}</strong> |
        Cakupan PIC: <strong>${escHtml(state.filter_pic)}</strong>
      </div>
      ${contentEl.innerHTML}
      <script>window.onload = function() { window.print(); };<\/script>
    </body>
    </html>
  `);
  win.document.close();

  // Catat unduhan PDF Rekap ke Log Aktivitas
  apiFetch('/api/audit-logs/client-event', {
    method: 'POST',
    body: JSON.stringify({
      action: 'EXPORT_REKAP_PDF',
      entity: 'download_requests',
      entity_id: state.periode?.id || '',
      new_values: {
        mode: cleanMode,
        nama_periode: state.periode?.nama_periode || '',
        versi_revisi: state.periode?.versi_revisi || '',
        filter_pic: state.filter_pic || 'SEMUA'
      },
      notes: `Cetak / Ekspor PDF ${title} (${state.periode?.nama_periode || ''} - PIC: ${state.filter_pic || 'SEMUA'}).`
    })
  }).catch(() => {});
}

async function exportRekapCostSharingExcel(mode = 'perencanaan') {
  const cleanMode = mode === 'pelaksanaan' ? 'pelaksanaan' : 'perencanaan';
  const state = AppState.rekapState[cleanMode]?.data;
  if (!state || !state.periode) {
    showToast('Data rekap belum dimuat.', 'warning');
    return;
  }
  const filterPic = state.filter_pic || 'SEMUA';
  const qs = filterPic !== 'SEMUA' ? `?pic=${encodeURIComponent(filterPic)}` : '';
  const filename = `Rekap_Sumber_Dana_${cleanMode}_${state.periode.versi_revisi || 'RKB'}_${filterPic}.xlsx`;
  try {
    showToast('Menyiapkan berkas Excel Rekap Sumber Dana...', 'info');
    await downloadProtectedFile(`/api/rekap/${cleanMode}/export-cost-sharing-excel${qs}`, filename);
    showToast('Berkas Excel Rekap Sumber Dana berhasil diunduh.', 'success');
  } catch (err) {
    showToast('Gagal mengunduh Excel: ' + err.message, 'error');
  }
}

function printRekapCostSharingPdf(mode = 'perencanaan') {
  const cleanMode = mode === 'pelaksanaan' ? 'pelaksanaan' : 'perencanaan';
  const state = AppState.rekapState[cleanMode]?.data;
  const contentEl = document.getElementById(`rekap-${cleanMode}-content`);
  if (!state || !contentEl) return;

  const win = window.open('', '_blank');
  if (!win) {
    window.print();
    return;
  }
  const title = cleanMode === 'pelaksanaan'
    ? 'REKAPITULASI SUMBER DANA ANGGARAN PELAKSANAAN (BASELINE SAH)'
    : 'REKAPITULASI SUMBER DANA ANGGARAN PERENCANAAN (RKB AKTIF)';

  const clone = contentEl.cloneNode(true);
  const actionBars = clone.querySelectorAll('.rekap-cost-sharing-action-bar');
  actionBars.forEach(el => el.remove());

  win.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${escHtml(title)} - SI-PRABU KPU Kabupaten Ngawi</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; font-size: 11px; line-height: 1.4; }
        h2 { margin: 0 0 4px 0; font-size: 15px; text-align: center; }
        .sub-title { text-align: center; font-size: 13px; font-weight: bold; color: #1e3a8a; margin-bottom: 6px; }
        .meta { margin-bottom: 16px; font-size: 11px; color: #334155; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 16px; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { border: 1px solid #94a3b8; padding: 5px 6px; text-align: left; }
        th { background: #f1f5f9; font-weight: bold; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        @media print {
          body { padding: 0; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>
      <h2>KOMISI PEMILIHAN UMUM KABUPATEN NGAWI</h2>
      <div class="sub-title">${escHtml(title)}</div>
      <div class="meta">
        Dokumen: <strong>${escHtml(state.periode.nama_periode)} (${escHtml(state.periode.versi_revisi || 'Induk')})</strong> |
        Fase: <strong>${escHtml(state.periode.fase_perencanaan)}</strong> |
        Cakupan PIC: <strong>${escHtml(state.filter_pic)}</strong>
      </div>
      ${clone.innerHTML}
      
      <!-- Blok Tanda Tangan Resmi SAKTI Bab 22 -->
      <div style="margin-top: 36px; display: flex; justify-content: space-between; page-break-inside: avoid;">
        <div style="width: 45%; text-align: center;">
          <p style="margin: 0 0 54px 0;">Mengetahui,<br><strong>Ketua Komisi Pemilihan Umum<br>Kabupaten Ngawi</strong></p>
          <p style="margin: 0; font-weight: bold; text-decoration: underline;">${escHtml((AppState.penandatanganList?.find(p => p.id === 'KETUA')?.nama_pejabat) || 'SAMSU MUSTAKIM')}</p>
        </div>
        <div style="width: 45%; text-align: center;">
          <p style="margin: 0 0 54px 0;">Ngawi, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br><strong>Sekretaris KPU Kabupaten Ngawi<br>Selaku Kuasa Pengguna Anggaran (KPA)</strong></p>
          <p style="margin: 0; font-weight: bold; text-decoration: underline;">${escHtml((AppState.penandatanganList?.find(p => p.id === 'SEKRETARIS')?.nama_pejabat) || 'BUDI RAHAYU')}</p>
          <p style="margin: 0; font-family: monospace; font-size: 11px;">NIP. ${escHtml((AppState.penandatanganList?.find(p => p.id === 'SEKRETARIS')?.nip) || '19830503 200902 1 002')}</p>
        </div>
      </div>
      
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `);
  win.document.close();

  apiFetch('/api/audit-logs/client-event', {
    method: 'POST',
    body: JSON.stringify({
      action: 'EXPORT_REKAP_COST_SHARING_PDF',
      entity: 'download_requests',
      entity_id: state.periode?.id || '',
      new_values: {
        mode: cleanMode,
        nama_periode: state.periode?.nama_periode || '',
        versi_revisi: state.periode?.versi_revisi || '',
        filter_pic: state.filter_pic || 'SEMUA'
      },
      notes: `Cetak / Ekspor PDF Rekap Sumber Dana (${state.periode?.nama_periode || ''} - PIC: ${state.filter_pic || 'SEMUA'}).`
    })
  }).catch(() => {});
}

window.loadRekapView = loadRekapView;
window.switchRekapTab = switchRekapTab;
window.exportRekapExcel = exportRekapExcel;
window.printRekapPdf = printRekapPdf;
window.exportRekapCostSharingExcel = exportRekapCostSharingExcel;
window.printRekapCostSharingPdf = printRekapCostSharingPdf;

// ============================================================================
// MODUL LOG AKTIVITAS & REKAM JEJAK AUDIT (BAB 14 CANON)
// Hanya dapat diakses oleh Developer (Level 0) & Kasubbag Perencanaan (Rendatin)
// ============================================================================

AppState.auditState = {
  category: 'ALL',
  username: 'ALL',
  date_start: '',
  date_end: '',
  search: '',
  page: 1,
  pageSize: 50,
  total: 0,
  logs: [],
  summary: { total: 0, RKB: 0, SIKLUS: 0, MASTER: 0, USER: 0, AUTH: 0, UNDUH: 0 }
};

const AUDIT_CATEGORY_META = {
  RKB: { label: '1. RUH Belanja', badgeBg: '#e0f2fe', badgeColor: '#0369a1', icon: '📘' },
  SIKLUS: { label: '2. Siklus & Revisi', badgeBg: '#f3e8ff', badgeColor: '#6d28d9', icon: '🔄' },
  MASTER: { label: '3. Referensi & DB', badgeBg: '#dcfce7', badgeColor: '#15803d', icon: '📐' },
  USER: { label: '4. Manajemen User', badgeBg: '#fef3c7', badgeColor: '#b45309', icon: '👥' },
  AUTH: { label: '5. Autentikasi', badgeBg: '#fee2e2', badgeColor: '#b91c1c', icon: '🔑' },
  UNDUH: { label: '6. Unduhan', badgeBg: '#ccfbf1', badgeColor: '#0f766e', icon: '📥' }
};

const AUDIT_ACTION_LABELS = {
  COMMIT_RKB_CHANGES: 'Simpan Perubahan RKB (Batch)',
  CREATE_RKB_ROW: 'Tambah Baris RKB',
  UPDATE_RKB_ROW: 'Ubah Baris RKB',
  DELETE_RKB_ROW: 'Hapus Baris RKB',
  CASCADE_PIC_SUBBAG: 'Ubah PIC Subbag (Cascade)',
  CASCADE_SASARAN: 'Ubah Sasaran (Cascade)',
  REORDER_ROW: 'Geser Urutan Baris RKB',
  CREATE_REVISI_PENGAJUAN: 'Pengajuan Revisi PIC (Tahap 1)',
  UPDATE_REVISI_TAHAP_2: 'Validasi Rendatin (Tahap 2)',
  UPDATE_REVISI_TAHAP_3: 'Keputusan Pleno (Tahap 3)',
  DELETE_REVISI_PENGAJUAN: 'Batal Usulan Revisi',
  FINALIZE_TAHAP4_KESELURUHAN: 'Pengesahan & Kunci RKB (Tahap 4)',
  UPDATE_POST_RATIFICATION_LINKS: 'Koreksi Tautan Pasca-Pengesahan',
  LOCK_PERIODE: 'Kunci Dokumen RKB',
  UNLOCK_PERIODE: 'Buka Kunci Dokumen RKB',
  CREATE_PERIODE: 'Buat Siklus RKB Baru',
  CLONE_PERIODE_REVISION: 'Buka Kertas Kerja Revisi',
  CREATE_KUANTITAS: 'Tambah Parameter Kuantitas',
  UPDATE_KUANTITAS: 'Ubah Parameter Kuantitas',
  CREATE_PASLON: 'Tambah Pasangan Calon',
  UPDATE_PASLON: 'Ubah Pasangan Calon',
  DELETE_PASLON: 'Hapus Pasangan Calon',
  CREATE_KECAMATAN: 'Tambah Kecamatan (PPK)',
  UPDATE_KECAMATAN: 'Ubah Kecamatan (PPK)',
  DELETE_KECAMATAN: 'Hapus Kecamatan (PPK)',
  BULK_IMPORT_KECAMATAN: 'Impor Excel Masal PPK',
  CREATE_DESA: 'Tambah Desa/TPS (PPS)',
  UPDATE_DESA: 'Ubah Desa/TPS (PPS)',
  DELETE_DESA: 'Hapus Desa/TPS (PPS)',
  BULK_IMPORT_DESA: 'Impor Excel Masal Desa/TPS',
  CREATE_SBM: 'Tambah Standar Biaya (SBM)',
  UPDATE_SBM: 'Ubah Standar Biaya (SBM)',
  DELETE_SBM: 'Hapus Standar Biaya (SBM)',
  BULK_IMPORT_SBM: 'Impor Excel Masal SBM',
  CREATE_AKUN_BAS: 'Tambah Akun BAS',
  UPDATE_AKUN_BAS: 'Ubah Akun BAS',
  DELETE_AKUN_BAS: 'Hapus Akun BAS',
  BULK_IMPORT_AKUN_BAS: 'Impor Excel Masal BAS',
  CREATE_REGULASI_JDIH: 'Tambah Produk Hukum JDIH',
  UPDATE_REGULASI_JDIH: 'Ubah Produk Hukum JDIH',
  DELETE_REGULASI_JDIH: 'Hapus Produk Hukum JDIH',
  UPDATE_SETTINGS: 'Simpan Pengaturan Satker & TTD',
  CREATE_USER: 'Tambah Akun Pengguna',
  UPDATE_USER: 'Ubah Akun Pengguna',
  DELETE_USER: 'Hapus Akun Pengguna',
  TOGGLE_USER_STATUS: 'Ubah Status Aktif Akun',
  LOGIN_SUCCESS: 'Login Manual Berhasil',
  LOGIN_GOOGLE_SUCCESS: 'Login Google Berhasil',
  LOGIN_FAILED: 'Percobaan Login Gagal',
  LOGOUT: 'Keluar Sistem (Logout)',
  SWITCH_ROLE_SIMULATION: 'Simulasi Ganti Peran (Dev)',
  CREATE_DOWNLOAD_REQUEST: 'Antrean Unduh Laporan',
  DOWNLOAD_FILE: 'Unduh Berkas Selesai',
  EXPORT_EXCEL_RKB: 'Unduh Excel RUH Belanja',
  EXPORT_ZIP_SUBBAG: 'Unduh Paket ZIP 5 Subbag',
  EXPORT_REKAP_PDF: 'Cetak / Ekspor PDF Rekap'
};

async function loadAuditLogsView(showFeedback = false) {
  const st = AppState.auditState;
  const tbody = document.getElementById('audit-logs-table-body');
  if (tbody && showFeedback) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:28px;color:#64748b;">Memuat ulang rekam jejak aktivitas...</td></tr>';
  }

  try {
    const offset = (st.page - 1) * st.pageSize;
    const qs = new URLSearchParams({
      limit: String(st.pageSize),
      offset: String(offset),
      category: st.category || 'ALL',
      username: st.username || 'ALL',
      search: st.search || '',
      date_start: st.date_start || '',
      date_end: st.date_end || ''
    });

    const res = await apiFetch(`/api/audit-logs?${qs.toString()}`);
    st.logs = res.logs || [];
    st.total = Number(res.total) || 0;
    st.summary = res.summary || { total: 0, RKB: 0, SIKLUS: 0, MASTER: 0, USER: 0, AUTH: 0, UNDUH: 0 };

    // Update badge di sidebar & pill total
    setElText('badge-total-audit', st.summary.total || 0);
    setElText('audit-total-pill', `${(st.summary.total || 0).toLocaleString('id-ID')} Kejadian Tercatat`);

    // Update angka pada 7 kartu kategori
    setElText('audit-count-ALL', (st.summary.total || 0).toLocaleString('id-ID'));
    ['RKB', 'SIKLUS', 'MASTER', 'USER', 'AUTH', 'UNDUH'].forEach(cat => {
      setElText(`audit-count-${cat}`, (st.summary[cat] || 0).toLocaleString('id-ID'));
    });

    // Populate dropdown filter pengguna
    const userSel = document.getElementById('audit-filter-user');
    if (userSel && Array.isArray(res.distinct_users)) {
      const currentVal = st.username || 'ALL';
      userSel.innerHTML = '<option value="ALL">-- Semua Pengguna --</option>' +
        res.distinct_users.map(u => `<option value="${escHtml(u)}" ${u === currentVal ? 'selected' : ''}>${escHtml(u)}</option>`).join('');
    }

    renderAuditLogsTable();
    if (showFeedback) {
      showToast('Log Aktivitas berhasil diperbarui.', 'info');
    }
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding:28px;">Gagal memuat Log Aktivitas: ${escHtml(err.message)}</td></tr>`;
    }
  }
}

function setAuditCategoryFilter(cat) {
  AppState.auditState.category = cat || 'ALL';
  AppState.auditState.page = 1;
  document.querySelectorAll('.audit-cat-btn').forEach(btn => {
    const isAct = btn.getAttribute('data-cat') === AppState.auditState.category;
    btn.classList.toggle('active', isAct);
    btn.style.border = isAct ? '2px solid #2563eb' : '1px solid #cbd5e1';
    btn.style.background = isAct ? '#eff6ff' : '#ffffff';
  });
  loadAuditLogsView();
}

function applyAuditLogFilters() {
  const st = AppState.auditState;
  st.username = document.getElementById('audit-filter-user')?.value || 'ALL';
  st.date_start = document.getElementById('audit-filter-date-start')?.value || '';
  st.date_end = document.getElementById('audit-filter-date-end')?.value || '';
  st.search = (document.getElementById('audit-filter-search')?.value || '').trim();
  st.page = 1;
  loadAuditLogsView();
}

function resetAuditLogFilters() {
  const st = AppState.auditState;
  st.category = 'ALL';
  st.username = 'ALL';
  st.date_start = '';
  st.date_end = '';
  st.search = '';
  st.page = 1;

  const uEl = document.getElementById('audit-filter-user');
  const dsEl = document.getElementById('audit-filter-date-start');
  const deEl = document.getElementById('audit-filter-date-end');
  const sEl = document.getElementById('audit-filter-search');
  if (uEl) uEl.value = 'ALL';
  if (dsEl) dsEl.value = '';
  if (deEl) deEl.value = '';
  if (sEl) sEl.value = '';

  setAuditCategoryFilter('ALL');
}

function changeAuditLogPage(delta) {
  const st = AppState.auditState;
  const maxPage = Math.max(1, Math.ceil(st.total / st.pageSize));
  const nextPage = st.page + delta;
  if (nextPage < 1 || nextPage > maxPage) return;
  st.page = nextPage;
  loadAuditLogsView();
}

function renderAuditLogsTable() {
  const st = AppState.auditState;
  const tbody = document.getElementById('audit-logs-table-body');
  if (!tbody) return;

  const maxPage = Math.max(1, Math.ceil(st.total / st.pageSize));
  const startIdx = st.total === 0 ? 0 : ((st.page - 1) * st.pageSize) + 1;
  const endIdx = Math.min(st.total, st.page * st.pageSize);

  setElText('audit-pagination-info', `Menampilkan ${startIdx}–${endIdx} dari ${st.total} aktivitas`);
  setElText('audit-page-indicator', `Halaman ${st.page} / ${maxPage}`);
  const prevBtn = document.getElementById('btn-audit-prev');
  const nextBtn = document.getElementById('btn-audit-next');
  if (prevBtn) prevBtn.disabled = st.page <= 1;
  if (nextBtn) nextBtn.disabled = st.page >= maxPage;

  if (!st.logs || st.logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:32px;color:#64748b;">Tidak ada catatan aktivitas yang sesuai dengan filter saat ini.</td></tr>';
    return;
  }

  tbody.innerHTML = st.logs.map(row => {
    const catMeta = AUDIT_CATEGORY_META[row.category] || { label: row.category || 'SISTEM', badgeBg: '#f1f5f9', badgeColor: '#334155', icon: '📌' };
    const actionLabel = AUDIT_ACTION_LABELS[row.action] || row.action;
    const isFailed = String(row.status || 'SUCCESS').toUpperCase() !== 'SUCCESS';
    const statusBadge = isFailed
      ? '<span class="badge badge-danger" style="font-size:10.5px;">GAGAL</span>'
      : '<span class="badge badge-success" style="font-size:10.5px;">BERHASIL</span>';

    const hasDetail = Boolean(row.old_values || row.new_values);
    const simMatch = String(row.role_id || '').match(/^(.*?)\s*\[simulasi:([^\]]+)\]$/i);
    let roleHtml = `<div style="font-size:10.5px;color:#64748b;">${escHtml(row.role_id || '-')}</div>`;
    if (simMatch) {
      const baseRole = simMatch[1].trim() || 'developer';
      const simRoleName = simMatch[2].trim();
      roleHtml = `
        <div style="font-size:10.5px;color:#64748b;">${escHtml(baseRole)}</div>
        <div style="margin-top:2px;">
          <span style="display:inline-block;background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:10px;">
            🎭 Simulasi: ${escHtml(simRoleName)}
          </span>
        </div>
      `;
    }
    return `
      <tr>
        <td style="font-family:var(--font-mono);font-size:11px;color:#334155;white-space:nowrap;">
          ${escHtml(row.waktu_wib || '-')}
          ${row.ip_address ? `<div style="font-size:10px;color:#94a3b8;">IP: ${escHtml(row.ip_address)}</div>` : ''}
        </td>
        <td>
          <div style="font-weight:700;color:#0f172a;">${escHtml(row.username || 'anonymous')}</div>
          ${roleHtml}
        </td>
        <td class="text-center">
          <span style="display:inline-flex;align-items:center;gap:4px;background:${catMeta.badgeBg};color:${catMeta.badgeColor};font-weight:700;font-size:10.5px;padding:3px 8px;border-radius:12px;">
            <span>${catMeta.icon}</span>
            <span>${escHtml(catMeta.label)}</span>
          </span>
        </td>
        <td>
          <div style="font-weight:700;color:#1e293b;">${escHtml(actionLabel)}</div>
          <div style="font-size:10px;font-family:var(--font-mono);color:#64748b;">${escHtml(row.action)}${row.entity_id ? ` #${escHtml(row.entity_id)}` : ''}</div>
        </td>
        <td style="line-height:1.45;color:#334155;">
          ${escHtml(row.notes || '-')}
        </td>
        <td class="text-center">${statusBadge}</td>
        <td class="text-center">
          <button type="button" class="btn btn-outline-primary btn-xs" onclick="openAuditDetailModal(${Number(row.id)})">
            🔍 ${hasDetail ? 'Detail' : 'Info'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function openAuditDetailModal(logId) {
  const row = (AppState.auditState.logs || []).find(r => Number(r.id) === Number(logId));
  if (!row) return;

  const modal = document.getElementById('modal-audit-detail');
  const titleEl = document.getElementById('modal-audit-detail-title');
  const subEl = document.getElementById('modal-audit-detail-subtitle');
  const bodyEl = document.getElementById('modal-audit-detail-body');
  if (!modal || !bodyEl) return;

  const actionLabel = AUDIT_ACTION_LABELS[row.action] || row.action;
  if (titleEl) titleEl.textContent = `🔍 ${actionLabel}`;
  if (subEl) subEl.textContent = `Waktu: ${row.waktu_wib || '-'} | Pelaku: ${row.username || '-'} (${row.role_id || '-'}) | Entitas: ${row.entity || '-'}${row.entity_id ? ' #' + row.entity_id : ''}`;

  const oldObj = row.old_values_obj;
  const newObj = row.new_values_obj;

  let diffSectionHtml = '';

  // Tampilan khusus untuk COMMIT_RKB_CHANGES (Simpan Perubahan RKB Batch)
  if (row.action === 'COMMIT_RKB_CHANGES' && newObj && typeof newObj === 'object') {
    const changes = Array.isArray(newObj.changes) ? newObj.changes : [];
    const paguSemula = Number(oldObj?.pagu_semula ?? 0);
    const paguMenjadi = Number(newObj?.pagu_menjadi ?? 0);
    const selisih = Number(newObj?.selisih_pagu ?? (paguMenjadi - paguSemula));
    const selisihPrefix = selisih > 0 ? '+' : '';

    diffSectionHtml = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:10px;margin-bottom:14px;">
        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:10px 12px;">
          <div style="font-size:11px;color:#64748b;font-weight:700;">PAGU SEMULA</div>
          <div style="font-size:15px;font-weight:800;color:#334155;font-family:var(--font-mono);margin-top:2px;">${formatRupiah(paguSemula)}</div>
        </div>
        <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:10px 12px;">
          <div style="font-size:11px;color:#1e40af;font-weight:700;">PAGU MENJADI</div>
          <div style="font-size:15px;font-weight:800;color:#1e3a8a;font-family:var(--font-mono);margin-top:2px;">${formatRupiah(paguMenjadi)}</div>
        </div>
        <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 12px;">
          <div style="font-size:11px;color:#166534;font-weight:700;">SELISIH NETTO</div>
          <div style="font-size:15px;font-weight:800;color:#15803d;font-family:var(--font-mono);margin-top:2px;">${selisihPrefix}${formatRupiah(selisih)}</div>
          <div style="font-size:11px;color:#475569;margin-top:2px;">
            +${Number(newObj.added_count || 0)} Baru &bull; ~${Number(newObj.updated_count || 0)} Diubah &bull; -${Number(newObj.deleted_count || 0)} Dihapus
          </div>
        </div>
      </div>
      ${newObj.catatan_simpan ? `
        <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#92400e;">
          <strong>📝 Catatan Penyimpanan:</strong> ${escHtml(newObj.catatan_simpan)}
        </div>
      ` : ''}
      ${changes.length > 0 ? `
        <div style="font-weight:700;font-size:12px;color:#0f172a;margin-bottom:6px;">📋 Daftar Baris RKB yang Terdampak (${changes.length} baris):</div>
        <div class="table-responsive" style="max-height:280px;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;">
          <table class="table table-bordered table-hover mb-0" style="font-size:11.5px;">
            <thead style="background:#f1f5f9;">
              <tr>
                <th style="width:75px;" class="text-center">Status</th>
                <th>Uraian Baris</th>
                <th style="width:75px;" class="text-center">PIC</th>
                <th>Rincian Perubahan</th>
                <th style="width:115px;" class="text-right">Semula</th>
                <th style="width:115px;" class="text-right">Menjadi</th>
              </tr>
            </thead>
            <tbody>
              ${changes.map(c => `
                <tr>
                  <td class="text-center"><span class="badge ${c.status === 'BARU' ? 'badge-success' : (c.status === 'DIHAPUS' ? 'badge-danger' : 'badge-warning')}">${escHtml(c.status || '-')}</span></td>
                  <td><strong>${escHtml(c.kode || '')}</strong> ${escHtml(c.uraian || '')}</td>
                  <td class="text-center">${escHtml(c.pic_bagian || '-')}</td>
                  <td style="font-size:11px;color:#475569;">${escHtml(c.detail || '-')}</td>
                  <td class="text-right" style="font-family:var(--font-mono);">${formatRupiah(c.semula_jumlah || 0)}</td>
                  <td class="text-right" style="font-family:var(--font-mono);font-weight:700;">${formatRupiah(c.menjadi_jumlah || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
    `;
  } else if (oldObj || newObj) {
    const isOldDict = oldObj && typeof oldObj === 'object' && !Array.isArray(oldObj);
    const isNewDict = newObj && typeof newObj === 'object' && !Array.isArray(newObj);
    let tableCompareHtml = '';

    if (isOldDict || isNewDict) {
      const allKeys = Array.from(new Set([
        ...(isOldDict ? Object.keys(oldObj) : []),
        ...(isNewDict ? Object.keys(newObj) : [])
      ]));
      if (allKeys.length > 0) {
        const formatVal = (v) => {
          if (v === undefined || v === null || v === '') return '<span style="color:#94a3b8;font-style:italic;">(kosong)</span>';
          if (typeof v === 'object') return `<code>${escHtml(JSON.stringify(v))}</code>`;
          return escHtml(String(v));
        };
        tableCompareHtml = `
          <div style="font-weight:700;font-size:12px;color:#0f172a;margin-bottom:6px;">📊 Tabel Perbandingan Parameter (Semula vs Menjadi):</div>
          <div class="table-responsive" style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:6px;">
            <table class="table table-bordered table-hover mb-0" style="font-size:11.5px;">
              <thead style="background:#f1f5f9;">
                <tr>
                  <th style="width:28%;">Atribut / Field</th>
                  <th style="width:31%;">⬅️ Nilai Semula</th>
                  <th style="width:31%;">➡️ Nilai Menjadi</th>
                  <th style="width:10%;" class="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                ${allKeys.map(k => {
                  const vOld = isOldDict ? oldObj[k] : undefined;
                  const vNew = isNewDict ? newObj[k] : undefined;
                  const strOld = vOld !== undefined ? JSON.stringify(vOld) : '';
                  const strNew = vNew !== undefined ? JSON.stringify(vNew) : '';
                  const isChanged = strOld !== strNew;
                  return `
                    <tr style="${isChanged ? 'background:#fffbeb;' : ''}">
                      <td style="font-family:var(--font-mono);font-weight:700;color:#1e293b;">${escHtml(k)}</td>
                      <td style="font-family:var(--font-mono);color:#475569;word-break:break-word;">${formatVal(vOld)}</td>
                      <td style="font-family:var(--font-mono);font-weight:${isChanged ? '700' : '400'};color:${isChanged ? '#1e3a8a' : '#475569'};word-break:break-word;">${formatVal(vNew)}</td>
                      <td class="text-center">
                        ${isChanged
                          ? '<span class="badge badge-warning" style="font-size:10px;">BERUBAH</span>'
                          : '<span class="badge badge-subtle" style="font-size:10px;">TETAP</span>'}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

    diffSectionHtml = `
      ${tableCompareHtml}
      <details style="margin-top:6px;">
        <summary style="cursor:pointer;font-size:11.5px;font-weight:700;color:#475569;padding:6px 0;">🔎 Lihat Data Mentah JSON (Semula vs Menjadi)</summary>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px;">
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:12px;">
            <div style="font-size:11.5px;font-weight:800;color:#475569;margin-bottom:6px;">⬅️ NILAI SEBELUM (SEMULA)</div>
            <pre style="margin:0;font-size:11.5px;font-family:var(--font-mono);white-space:pre-wrap;word-break:break-word;color:#334155;">${oldObj ? escHtml(JSON.stringify(oldObj, null, 2)) : '(Tidak ada data semula / Entitas baru)'}</pre>
          </div>
          <div style="background:#eff6ff;border:1px solid #93c5fd;border-radius:8px;padding:12px;">
            <div style="font-size:11.5px;font-weight:800;color:#1e40af;margin-bottom:6px;">➡️ NILAI SESUDAH (MENJADI)</div>
            <pre style="margin:0;font-size:11.5px;font-family:var(--font-mono);white-space:pre-wrap;word-break:break-word;color:#1e3a8a;">${newObj ? escHtml(JSON.stringify(newObj, null, 2)) : '(Entitas dihapus / Tidak ada nilai baru)'}</pre>
          </div>
        </div>
      </details>
    `;
  } else {
    diffSectionHtml = `
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;color:#475569;font-size:12px;">
        Aktivitas ini telah tercatat secara permanen di dalam log audit sistem.
      </div>
    `;
  }

  bodyEl.innerHTML = `
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:12.5px;color:#1e293b;line-height:1.5;">
      <strong>Ringkasan Kejadian:</strong><br>
      ${escHtml(row.notes || '-')}
    </div>
    ${diffSectionHtml}
  `;

  modal.style.display = 'flex';
}

function closeAuditDetailModal() {
  const modal = document.getElementById('modal-audit-detail');
  if (modal) modal.style.display = 'none';
}

window.loadAuditLogsView = loadAuditLogsView;
window.setAuditCategoryFilter = setAuditCategoryFilter;
window.applyAuditLogFilters = applyAuditLogFilters;
window.resetAuditLogFilters = resetAuditLogFilters;
window.changeAuditLogPage = changeAuditLogPage;
window.openAuditDetailModal = openAuditDetailModal;
window.closeAuditDetailModal = closeAuditDetailModal;





function setModalSbmDisplay(sbmId, harga, uraianOpt = null) {
  const inputEl = document.getElementById('modal-sbm-id');
  const badgeEl = document.getElementById('modal-sbm-badge');
  if (inputEl) inputEl.value = sbmId || '';
  if (!badgeEl) return;
  
  if (!sbmId) {
    badgeEl.style.display = 'none';
    badgeEl.innerHTML = '';
    return;
  }
  
  const sbms = AppState.masters?.sbms || [];
  const s = sbms.find(x => x.id === Number(sbmId));
  const title = s ? s.uraian : (uraianOpt || 'Standar Biaya Masukan');
  const tarif = s ? Number(s.harga_satuan) : Number(harga || 0);

  badgeEl.style.display = 'block';
  badgeEl.innerHTML = `
    <div style="font-size:11px; background:#eff6ff; color:#1d4ed8; padding:3px 8px; border-radius:4px; border:1px solid #bfdbfe; display:inline-flex; align-items:center; gap:6px; font-weight:600;">
      <span>🏷️ SBM SSOT: <strong>${escHtml(title)} (Rp ${tarif.toLocaleString('id-ID')})</strong></span>
      <span style="font-size:10px; color:#64748b; font-weight:normal;">(Otomatis mengikuti referensi)</span>
      <button type="button" onclick="unlinkModalSbm()" style="border:none; background:transparent; color:#ef4444; cursor:pointer; font-size:12px; font-weight:bold;" title="Lepas ikatan SBM">✕</button>
    </div>
  `;
}

function unlinkModalSbm() {
  setModalSbmDisplay(null);
}
window.unlinkModalSbm = unlinkModalSbm;


// ============================================================================
// SAKTI ACTIVE ROLE SWITCHER & ROLE PREFERENCE
// ============================================================================

function toggleActiveRoleDropdown(e) {
  if (e) e.stopPropagation();
  const dropdown = document.getElementById('active-role-dropdown-menu');
  if (!dropdown) return;
  const isVisible = dropdown.style.display === 'block';
  dropdown.style.display = isVisible ? 'none' : 'block';
}

window.addEventListener('click', (e) => {
  const container = document.getElementById('active-role-container');
  const dropdown = document.getElementById('active-role-dropdown-menu');
  if (dropdown && dropdown.style.display === 'block') {
    if (!container || !container.contains(e.target)) {
      dropdown.style.display = 'none';
    }
  }
});

function renderActiveRoleSwitcher(user = AppState.currentUser) {
  const container = document.getElementById('active-role-container');
  if (!container) return;

  if (!user || !Array.isArray(user.roles) || user.roles.length <= 1) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'inline-flex';

  const chkKumulatif = document.getElementById('chk-role-mode-kumulatif');
  const roleIcon = document.getElementById('active-role-icon');
  const roleLabel = document.getElementById('active-role-label');
  const roleBtn = document.getElementById('btn-active-role-dropdown');
  const subheading = document.getElementById('role-dropdown-subheading');
  const listEl = document.getElementById('active-role-list');

  const isKumulatif = (user.role_mode === 'KUMULATIF');
  if (chkKumulatif) chkKumulatif.checked = isKumulatif;

  if (isKumulatif) {
    if (roleIcon) roleIcon.textContent = '⚡';
    const subbagList = user.roles.map(r => r.pic).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    if (roleLabel) roleLabel.textContent = `Hak Kumulatif: ${subbagList}`;
    if (roleBtn) {
      roleBtn.style.background = '#15803d';
      roleBtn.style.borderColor = '#22c55e';
      roleBtn.style.color = '#ffffff';
    }
    if (subheading) subheading.textContent = 'MODE AKTIF: HAK KUMULATIF GABUNGAN';
  } else {
    if (roleIcon) roleIcon.textContent = '🎭';
    const activeLabel = user.active_role ? (user.active_role.label_peran || `Operator ${user.active_role.pic}`) : (user.jabatan || user.pic_subbag);
    const activeMode = user.active_role ? user.active_role.mode_akses : user.mode_akses;
    if (roleLabel) roleLabel.textContent = `${activeLabel} (${activeMode})`;
    if (roleBtn) {
      roleBtn.style.background = 'rgba(255, 255, 255, 0.12)';
      roleBtn.style.borderColor = 'rgba(255, 255, 255, 0.25)';
      roleBtn.style.color = '#ffffff';
    }
    if (subheading) subheading.textContent = 'PILIH PERAN AKTIF (MODE SAKTI):';
  }

  if (listEl) {
    listEl.innerHTML = '';
    user.roles.forEach(r => {
      const isRoleActive = (!isKumulatif) && (
        (user.active_role && Number(user.active_role.id) === Number(r.id)) ||
        (!user.active_role && Number(r.is_default) === 1) ||
        (user.active_role && Number(user.active_role.level) === Number(r.level) && String(user.active_role.pic).toUpperCase() === String(r.pic).toUpperCase())
      );

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `role-item-btn ${isRoleActive ? 'active' : ''}`;
      btn.onclick = () => switchActiveRoleAction(r.id);

      const modeBadgeBg = (r.mode_akses === 'EDITOR') ? '#dcfce7' : '#f1f5f9';
      const modeBadgeColor = (r.mode_akses === 'EDITOR') ? '#15803d' : '#475569';

      btn.innerHTML = `
        <div style="flex: 1; text-align: left;">
          <div class="role-item-title" style="display: flex; align-items: center; justify-content: space-between;">
            <span>${escHtml(r.label_peran || ('Operator ' + r.pic))}</span>
            ${isRoleActive ? '<span style="color: #2563eb; font-weight: 800; font-size: 13px;">✓</span>' : ''}
          </div>
          <div class="role-item-desc" style="margin-top: 2px;">
            Level ${r.level} • Subbag: <strong>${escHtml(r.pic)}</strong>
          </div>
        </div>
        <span class="role-item-badge" style="background: ${modeBadgeBg}; color: ${modeBadgeColor}; margin-left: 8px;">
          ${escHtml(r.mode_akses)}
        </span>
      `;
      listEl.appendChild(btn);
    });
  }
}

async function switchActiveRoleAction(roleId) {
  try {
    const res = await apiFetch('/api/switch-active-role', {
      method: 'POST',
      body: JSON.stringify({ role_id: roleId })
    });
    if (res && res.token) {
      localStorage.setItem('token', res.token);
      AppState.currentUser = res.user;
      const dropdown = document.getElementById('active-role-dropdown-menu');
      if (dropdown) dropdown.style.display = 'none';
      showToast(res.message || 'Berhasil beralih peran.', 'success');
      updateUserNavbar();
      applyDynamicMenuMatrix(res.user);
      renderAllViews();
    }
  } catch (err) {
    showToast(err.message || 'Gagal beralih peran.', 'error');
  }
}

async function toggleRoleModeCheckbox(checked) {
  const newMode = checked ? 'KUMULATIF' : 'SWITCH';
  try {
    const res = await apiFetch('/api/user/preference-role-mode', {
      method: 'POST',
      body: JSON.stringify({ role_mode: newMode })
    });
    if (res && res.token) {
      localStorage.setItem('token', res.token);
      AppState.currentUser = res.user;
      showToast(res.message || `Mode peran diubah ke ${newMode}.`, 'success');
      updateUserNavbar();
      applyDynamicMenuMatrix(res.user);
      renderAllViews();
    }
  } catch (err) {
    showToast(err.message || 'Gagal mengubah preferensi mode peran.', 'error');
    const chk = document.getElementById('chk-role-mode-kumulatif');
    if (chk) chk.checked = !checked;
  }
}

// ============================================================================
// MODUL MANAJEMEN MATRIKS HAK AKSES MENU (RBAC DINAMIS)
// ============================================================================

async function loadMenuMatrixView() {
  const tbody = document.getElementById('menu-matrix-table-body');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 24px; color: #64748b;">Memuat konfigurasi hak akses menu...</td></tr>';
  }
  try {
    const res = await apiFetch('/api/menu-matrix');
    if (res && res.matrix) {
      AppState.menuMatrix = res.matrix;
      renderMenuMatrixTable();
    }
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding: 24px; color: #dc2626;">Gagal memuat matriks: ${escHtml(err.message)}</td></tr>`;
  }
}

function filterMenuMatrixTable() {
  renderMenuMatrixTable();
}

function renderMenuMatrixTable() {
  const tbody = document.getElementById('menu-matrix-table-body');
  if (!tbody) return;

  const matrix = AppState.menuMatrix || [];
  const filterFolder = document.getElementById('menu-matrix-filter-folder')?.value || 'ALL';

  let filtered = matrix;
  if (filterFolder === 'ROOT') {
    filtered = matrix.filter(m => !m.folder_key);
  } else if (filterFolder !== 'ALL') {
    filtered = matrix.filter(m => m.folder_key === filterFolder);
  }

  const countEl = document.getElementById('menu-matrix-count');
  if (countEl) countEl.textContent = `${filtered.length} dari ${matrix.length} Menu`;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center" style="padding: 24px; color: #64748b;">Tidak ada menu pada kategori ini.</td></tr>';
    return;
  }

  const folderLabels = {
    'folder-perencanaan': 'Perencanaan & Revisi',
    'folder-rekap': 'Rekapitulasi Anggaran',
    'folder-referensi': 'Referensi Standar (SBM, BAS)',
    'folder-database': 'Database Master Adhoc',
    'folder-panduan': 'Panduan & Regulasi',
    'folder-administrasi': 'Administrasi & Pengaturan',
    'folder-developer': 'Ruang Pengembang DEV'
  };

  tbody.innerHTML = filtered.map((m, idx) => {
    const fName = m.folder_key ? (folderLabels[m.folder_key] || m.folder_key) : 'Menu Utama (Root)';
    const isCriticalAdmin = (m.menu_key === 'view-users' || m.menu_key === 'view-menu-matrix' || m.menu_key === 'view-dashboard');

    return `
      <tr data-menu-key="${escHtml(m.menu_key)}" style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 14px; text-align: center; color: #64748b;">${idx + 1}</td>
        <td style="padding: 10px 14px;">
          <strong style="color: #1e293b; font-size: 12.5px;">${escHtml(m.menu_label || m.menu_key)}</strong>
          <div style="font-size: 11px; color: #94a3b8; font-family: var(--font-mono); margin-top: 2px;">
            ${escHtml(m.menu_key)}
          </div>
        </td>
        <td style="padding: 10px 14px; color: #475569;">
          <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
            ${escHtml(fName)}
          </span>
        </td>
        <td style="padding: 10px 14px; text-align: center; background: #f8fafc;">
          <input type="checkbox" data-field="allow_l0" ${m.allow_l0 ? 'checked' : ''} disabled title="Developer (Level 0) dilindungi anti-lockout" style="width: 15px; height: 15px; cursor: not-allowed; accent-color: #0f172a;">
        </td>
        <td style="padding: 10px 14px; text-align: center; background: #eff6ff;">
          <input type="checkbox" data-field="allow_l1" ${m.allow_l1 ? 'checked' : ''} ${isCriticalAdmin ? 'disabled title="Menu kritis Level 1 dilindungi anti-lockout"' : ''} style="width: 15px; height: 15px; cursor: ${isCriticalAdmin ? 'not-allowed' : 'pointer'}; accent-color: #1e40af;">
        </td>
        <td style="padding: 10px 14px; text-align: center; background: #f0fdf4;">
          <input type="checkbox" data-field="allow_l2" ${m.allow_l2 ? 'checked' : ''} style="width: 15px; height: 15px; cursor: pointer; accent-color: #166534;">
        </td>
        <td style="padding: 10px 14px; text-align: center; background: #fdf4ff;">
          <input type="checkbox" data-field="allow_l3" ${m.allow_l3 ? 'checked' : ''} style="width: 15px; height: 15px; cursor: pointer; accent-color: #86198f;">
        </td>
        <td style="padding: 10px 14px; text-align: center; background: #fefce8;">
          <input type="checkbox" data-field="allow_l4" ${m.allow_l4 ? 'checked' : ''} style="width: 15px; height: 15px; cursor: pointer; accent-color: #854d0e;">
        </td>
        <td style="padding: 10px 14px; text-align: center;">
          <select class="input-select-sm" data-field="required_mode" style="padding: 3px 6px; font-size: 11px; font-weight: 600;">
            <option value="VIEWER" ${(m.required_mode || 'VIEWER') === 'VIEWER' ? 'selected' : ''}>VIEWER</option>
            <option value="EDITOR" ${m.required_mode === 'EDITOR' ? 'selected' : ''}>EDITOR</option>
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

async function saveMenuMatrixAction() {
  const btn = document.getElementById('btn-save-menu-matrix');
  if (btn) btn.disabled = true;

  try {
    const tbody = document.getElementById('menu-matrix-table-body');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr[data-menu-key]');
    const matrixMap = {};
    (AppState.menuMatrix || []).forEach(m => {
      matrixMap[m.menu_key] = { ...m };
    });

    rows.forEach(tr => {
      const menuKey = tr.getAttribute('data-menu-key');
      if (matrixMap[menuKey]) {
        matrixMap[menuKey].allow_l0 = 1; // Anti-lockout
        matrixMap[menuKey].allow_l1 = tr.querySelector('input[data-field="allow_l1"]')?.checked ? 1 : 0;
        matrixMap[menuKey].allow_l2 = tr.querySelector('input[data-field="allow_l2"]')?.checked ? 1 : 0;
        matrixMap[menuKey].allow_l3 = tr.querySelector('input[data-field="allow_l3"]')?.checked ? 1 : 0;
        matrixMap[menuKey].allow_l4 = tr.querySelector('input[data-field="allow_l4"]')?.checked ? 1 : 0;
        matrixMap[menuKey].required_mode = tr.querySelector('select[data-field="required_mode"]')?.value || 'VIEWER';
      }
    });

    const itemsToSave = Object.values(matrixMap);
    const res = await apiFetch('/api/menu-matrix', {
      method: 'PUT',
      body: JSON.stringify({ matrix: itemsToSave })
    });

    AppState.menuMatrix = res.matrix || itemsToSave;
    applyDynamicMenuMatrix(AppState.currentUser);
    showToast(res.message || 'Matriks hak akses menu berhasil disimpan.', 'success');
  } catch (err) {
    showToast('Gagal menyimpan matriks: ' + err.message, 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}


// Preferensi Mode Multi-Peran (SAKTI vs KUMULATIF)
async function handleSaktiKumulatifToggle(checked) {
  const targetMode = checked ? 'KUMULATIF' : 'SWITCH';
  try {
    const res = await apiFetch('/api/user/preference-role-mode', {
      method: 'POST',
      body: JSON.stringify({ role_mode: targetMode })
    });
    if (res && res.success) {
      if (res.token) localStorage.setItem('siprabu_token', res.token);
      if (res.user) AppState.currentUser = res.user;
      else if (AppState.currentUser) AppState.currentUser.role_mode = targetMode;

      // Sync checkbox states
      const chkLogin = document.getElementById('chk-sakti-login-kumulatif');
      const chkModal = document.getElementById('chk-sakti-modal-kumulatif');
      if (chkLogin) chkLogin.checked = checked;
      if (chkModal) chkModal.checked = checked;

      // Update UI
      updateUserNavbar();
      applyDynamicMenuMatrix(AppState.currentUser);
      applyRolePermissionsToUI();

      if (checked) {
        showToast('⚡ Mode Hak Kumulatif aktif: Seluruh wewenang subbagian Anda kini aktif bersamaan.', 'success');
        const postLoginScreen = document.getElementById('sakti-post-login-screen');
        if (postLoginScreen && postLoginScreen.style.display !== 'none') {
          postLoginScreen.style.display = 'none';
          showMainApp();
          await loadMasters();
          await loadPeriodes();
          await loadRkbData();
          renderAllViews();
          switchView('view-dashboard', true);
        }
      } else {
        showToast('Mode Ganti Peran (ala SAKTI) aktif: Silakan pilih peran yang ingin digunakan.', 'info');
      }
    } else {
      throw new Error(res.error || 'Gagal mengubah preferensi peran');
    }
  } catch (err) {
    showToast(`Gagal mengubah preferensi peran: ${err.message}`, 'error');
  }
}
