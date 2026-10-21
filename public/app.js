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
  revisionViewMode: 'STANDARD', // 'STANDARD' | 'SANDING'
  filters: {
    pic: 'SEMUA',
    sasaran: 'ALL',
    search: ''
  },
  searchDebounceTimer: null
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
    if (user.level === 0) {
      roleBanner.style.display = 'block';
      roleBanner.style.background = '#0f172a';
      roleBanner.style.color = '#f8fafc';
      roleBanner.style.border = '1px solid #334155';
      roleBanner.innerHTML = `
        <div style="font-weight:800;display:flex;align-items:center;gap:6px;margin-bottom:2px;color:#38bdf8;">
          <span>⚡ MODE ARSITEK PENGEMBANG (LEVEL 0 — MASTER DEVELOPER)</span>
        </div>
        Anda aktif sebagai <strong>${escHtml(user.nama_pejabat)}</strong>. Hak istimewa arsitek sistem aktif: Anda dapat menambah, mengedit, dan menghapus akun pengguna secara dinamis, serta melakukan bypass penyesuaian darurat.
      `;
    } else if (user.level === 2) {
      roleBanner.style.display = 'block';
      roleBanner.style.background = '#ecfdf5';
      roleBanner.style.color = '#065f46';
      roleBanner.style.border = '1px solid #a7f3d0';
      roleBanner.innerHTML = `
        <div style="font-weight:800;display:flex;align-items:center;gap:6px;margin-bottom:2px;color:#047857;">
          <span>🛠️ MODE OPERATOR SUBBAGIAN (LEVEL 2 — PIC: ${escHtml(user.pic_subbag)})</span>
        </div>
        Anda login sebagai <strong>${escHtml(user.nama_pejabat)}</strong> (${escHtml(user.jabatan)}). Hak akses dibatasi khusus untuk mengusulkan &amp; mengedit rincian belanja Subbagian <strong>${escHtml(user.pic_subbag)}</strong>. Baris subbag lain dan wewenang penguncian NPHD / pembukaan revisi terkunci otomatis.
      `;
    } else if (user.level === 3) {
      roleBanner.style.display = 'block';
      roleBanner.style.background = '#faf5ff';
      roleBanner.style.color = '#581c87';
      roleBanner.style.border = '1px solid #e9d5ff';
      roleBanner.innerHTML = `
        <div style="font-weight:800;display:flex;align-items:center;gap:6px;margin-bottom:2px;color:#7e22ce;">
          <span>👁️ MODE PEMANTAUAN EKSEKUTIF (LEVEL 3 — READ ONLY)</span>
        </div>
        Anda sedang meninjau dokumen dalam kapasitas <strong>${escHtml(user.nama_pejabat)}</strong> (${escHtml(user.jabatan)}). Seluruh data disajikan dalam mode <strong>Read-Only</strong> untuk penelaahan pleno dan pemantauan pimpinan. Seluruh fitur pengeditan angka dinonaktifkan demi integritas data.
      `;
    } else {
      roleBanner.style.display = 'none';
    }
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
  else if (viewId === 'view-users') renderUsersTable();
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
  renderUsersTable();
  applyRolePermissionsToUI();
}

// ============================================================================
// VIEW 1: DASHBOARD KPI EKSEKUTIF
// ============================================================================

function renderDashboard() {
  if (!AppState.rkbData || !AppState.rkbData.summary) return;
  const { summary, periode } = AppState.rkbData;

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
    const subbagNames = {
      KUL: { name: 'Keuangan, Umum & Logistik (KUL)', color: '#3b82f6' },
      RENDATIN: { name: 'Perencanaan, Data & Informasi (RENDATIN)', color: '#10b981' },
      TEKNIS: { name: 'Teknis Penyelenggaraan Pemilu (TEKNIS)', color: '#8b5cf6' },
      HUKUM: { name: 'Hukum & SDM (HUKUM)', color: '#f59e0b' },
      PARSDM: { name: 'Partisipasi Masyarakat & SDM (PARSDM)', color: '#ec4899' }
    };

    subbagList.innerHTML = Object.entries(summary.bySubbag).map(([pic, amt]) => {
      const meta = subbagNames[pic] || { name: pic, color: '#64748b' };
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
    const sortedAkun = Object.entries(summary.byAkun).sort((a, b) => b[1] - a[1]);
    akunBody.innerHTML = sortedAkun.map(([code, amt]) => {
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
  }

  if (AppState.masters && AppState.masters.settings) {
    const s = AppState.masters.settings;
    setElText('satker-name-header', (s.nama_satker || 'KPU KABUPATEN NGAWI').toUpperCase());
  }
}

// ============================================================================
// VIEW 2: PUSAT SIKLUS & RIWAYAT REVISI
// ============================================================================

function renderSiklus() {
  const p = AppState.currentPeriode;
  if (!p) return;

  setElText('siklus-nama-dokumen', p.nama_periode);
  setElText('siklus-versi-revisi', p.versi_revisi);
  setElText('siklus-dasar-pengesahan', p.dasar_pengesahan || 'NPHD');
  setElText('siklus-nomor-ba', p.nomor_ba_tapd || '-');
  setElText('siklus-tanggal-ba', p.tanggal_ba_tapd || '-');
  setElText('siklus-catatan', p.catatan_revisi || 'Baseline NPHD Awal Pilkada Ngawi');

  const badgeBox = document.getElementById('lifecycle-badge');
  if (badgeBox) {
    const isPra = p.tahap_revisi === 'PRA_NPHD';
    const isNphdInduk = p.dasar_pengesahan === 'NPHD' || p.tahap_revisi === 'RKB_AWAL';
    if (p.is_locked) {
      if (isPra) {
        badgeBox.innerHTML = `<span class="badge" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-size: 13px; font-weight:700;">🔒 ARSIP RESMI PRA-NPHD (${p.dasar_pengesahan || 'USULAN'})</span>`;
      } else if (isNphdInduk) {
        badgeBox.innerHTML = '<span class="badge badge-danger" style="font-size: 13px; font-weight:700;">🏛️ TERKUNCI (NPHD SAH - BASELINE)</span>';
      } else {
        badgeBox.innerHTML = `<span class="badge" style="background:#fdf4ff;color:#86198f;border:1px solid #f0abfc;font-size: 13px; font-weight:700;">🔒 ARSIP RESMI PASCA-NPHD (${p.dasar_pengesahan || 'REVISI'})</span>`;
      }
    } else {
      if (isPra) {
        badgeBox.innerHTML = '<span class="badge badge-success" style="font-size: 13px;">🌿 DRAFT PRA-NPHD (LEMBAR KERJA AKTIF)</span>';
      } else if (isNphdInduk) {
        badgeBox.innerHTML = '<span class="badge badge-success" style="font-size: 13px;">🟢 DRAFT NPHD INDUK (LEMBAR KERJA AKTIF)</span>';
      } else {
        badgeBox.innerHTML = '<span class="badge badge-success" style="font-size: 13px;">🔄 DRAFT REVISI AKTIF (LEMBAR KERJA TERBUKA)</span>';
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

  // History Table
  const historyTbody = document.getElementById('table-periode-history');
  if (historyTbody) {
    historyTbody.innerHTML = AppState.periodesList.map(item => {
      const isCurrent = item.id === p.id;
      return `
        <tr class="${isCurrent ? 'table-row-selected' : ''}">
          <td class="text-center" style="font-family: var(--font-mono); font-weight: 700;">${item.id}</td>
          <td><strong>${item.nama_periode}</strong></td>
          <td><span class="badge badge-primary">${item.versi_revisi}</span></td>
          <td>${item.dasar_pengesahan || 'NPHD'}</td>
          <td>
            <span class="badge ${item.is_locked ? 'badge-danger' : 'badge-success'}">
              ${item.is_locked ? '🔒 Terkunci' : '🟢 Draft Aktif'}
            </span>
          </td>
          <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">
            ${formatNumber(item.total_items || 953)}
          </td>
          <td class="text-center">
            <button class="btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-outline-primary'}" onclick="selectPeriodeAndSwitch(${item.id})" title="Buka lembar kerja RKB untuk dokumen ini">
              📘 ${isCurrent ? 'Buka di RKB' : 'Pilih & Buka di RKB'}
            </button>
            <button class="btn btn-sm btn-success" onclick="exportExcelPeriode(${item.id})" title="Unduh File Excel Dokumen Ini">
              📥 Excel
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

async function selectPeriode(periodeId) {
  const p = AppState.periodesList.find(x => x.id === periodeId);
  if (!p) return;
  AppState.currentPeriode = p;
  AppState.treeNodeOverrides = {};
  AppState.expandedNodes = new Set();
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
  const rows = AppState.rkbData?.rows || [];
  const selectedRow = rows.find(r => r.id === AppState.selectedRowId);

  if (selectedRow && selectedRow.has_children) {
    // Jika ada baris aktif yang disorot, lipat cabang baris aktif tersebut!
    collapseBranch(selectedRow.tree_id);
  } else {
    // Jika tidak ada baris yang disorot, lipat seluruh tabel
    if (!AppState.expandedNodes) AppState.expandedNodes = new Set();
    AppState.expandedNodes.clear();
    AppState.selectedRowId = null;
    updateTreeToolbarActiveButtons('btnTreeCollapseAll');
  }

  renderRkbTable();
}

function setTreeExpandLevel(lvl) {
  const targetLvl = Number(lvl);
  const rows = AppState.rkbData?.rows || [];
  const selectedRow = rows.find(r => r.id === AppState.selectedRowId);

  if (selectedRow && selectedRow.has_children) {
    // FUNGSI LIPATAN DINAMIS:
    // Berlaku HANYA untuk baris yang sedang aktif / disorot!
    applyLevelToBranch(selectedRow.tree_id, targetLvl);
  } else {
    // Berlaku secara global jika tidak ada baris yang dipilih
    applyLevelGlobally(targetLvl);
  }

  updateTreeToolbarActiveButtons(targetLvl);
  renderRkbTable();
}

function updateTreeToolbarActiveButtons(target) {
  const ids = ['btnTreeCollapseAll', 'btnTreeL1', 'btnTreeL2', 'btnTreeL3', 'btnTreeL4', 'btnTreeAkun', 'btnTreeAll'];
  ids.forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (typeof target === 'string') {
      btn.classList.toggle('active', id === target);
    } else {
      const lvl = Number(target);
      const isLvlMatch = (id === 'btnTreeL' + lvl) || (lvl === 5 && id === 'btnTreeAkun') || (lvl === 6 && id === 'btnTreeAll');
      btn.classList.toggle('active', isLvlMatch);
    }
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
    actBox.innerHTML = '';
    return;
  }

  const cleanUraian = (row.uraian || '').substring(0, 45);
  const lvlLabel = row.is_header ? `Level ${row.level_indent}` : 'Detail Belanja';
  const isExpanded = row.has_children ? isNodeExpanded(row.tree_id) : false;

  if (pill) {
    pill.style.display = 'inline-flex';
    pill.innerHTML = `<strong>[${row.kode || lvlLabel}]</strong>&nbsp;${cleanUraian}&nbsp;<span onclick="clearSelectedRow(event)" style="cursor:pointer;margin-left:4px;font-weight:700;color:#ef4444;padding:0 2px;" title="Lepas sorotan baris aktif (kembali ke kontrol global)">✕</span>`;
    pill.title = `Baris Aktif: [${row.kode || lvlLabel}] ${row.uraian || ''}. Klik tombol lipatan untuk melipat/membuka khusus cabang ini.`;
  }

  let btns = '';

  // 1. Tombol Dinamis Lipat / Buka Khusus Baris Aktif Ini
  if (row.has_children) {
    if (isExpanded) {
      btns += `
        <button type="button" class="btn btn-sm btn-outline-secondary" onclick="collapseActiveBranch(event)" title="Lipat cabang baris aktif ini" style="font-weight:700;">
          📁 Lipat Cabang Ini
        </button>
      `;
    } else {
      btns += `
        <button type="button" class="btn btn-sm btn-primary" onclick="expandActiveBranch(event)" title="Buka cabang baris aktif ini" style="font-weight:700;">
          📂 Buka Cabang Ini
        </button>
      `;
    }
    btns += `
      <button type="button" class="btn btn-sm btn-outline-info" onclick="expandActiveBranchAll(event)" title="Buka seluruh rincian belanja mikro di dalam cabang ini" style="font-weight:600;">
        📖 Buka Semua Detail
      </button>
    `;
  }

  // 2. Tombol Kontekstual Rekam / Tambah / Ubah
  if (!isLocked) {
    const canEdit = checkCanEditRow(user, row, isLocked);
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
        btns += `
          <button class="btn btn-primary btn-sm" onclick="openRowModal(${row.id}, event)">✏️ Ubah Rincian</button>
          <button class="btn btn-outline-danger btn-sm" onclick="deleteRow(${row.id}, event)">🗑️ Hapus</button>
        `;
      }
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

  // Stepper Header
  setElText('rkb-stepper-title', periode.nama_periode);
  const stepperSub = document.getElementById('rkb-stepper-sub');
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

    revisionPills.innerHTML = pillsHtml;
  }

  // Quick Actions (Status Dokumen & Tautan Pengelolaan Siklus/Revisi di Pusat Siklus)
  const quickActions = document.getElementById('rkb-quick-actions');
  if (quickActions) {
    let actionsHtml = `
      <span class="badge ${isLocked ? 'badge-danger' : 'badge-success'}" style="font-size: 11px; padding: 5px 8px;">
        ${isLocked ? '🔒 Terkunci (Read-Only)' : '🟢 Draft Aktif'}
      </span>
      <button class="btn btn-sm btn-outline-secondary" onclick="switchView('view-siklus')" title="Kelola status kunci, legalitas NPHD, dan usulan revisi di Pusat Siklus">
        🔄 Kelola di Pusat Siklus
      </button>
    `;
    quickActions.innerHTML = actionsHtml;
  }

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

  // Pastikan Set expandedNodes terinisialisasi
  if (!AppState.expandedNodes) AppState.expandedNodes = new Set();
  if (AppState.expandedNodes.size === 0 && AppState.treeExpandLevel !== 1) {
    for (const r of rows) {
      if (r.tree_level === 1) AppState.expandedNodes.add(r.tree_id);
    }
  }

  const isRowVisible = (treeId, parentTreeId) => {
    if (searchQ) return true;
    let p = parentTreeId;
    while (p) {
      if (!AppState.expandedNodes.has(p)) return false;
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
    const isExpanded = isNodeExpanded(r.tree_id);
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
        <tr id="row-${r.id}" class="${r.is_header ? 'rkb-row-lvl-' + lvl : ''} ${isSelected ? 'table-row-selected' : ''}" onclick="selectRow(${r.id}, event)">
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
            </div>
            ${isItem && r.catatan_revisi_baris ? `<div style="font-size:11px;color:#1e40af;background:#eff6ff;border-left:2px solid #3b82f6;padding:2px 6px;margin:3px 0 0 28px;border-radius:2px;display:inline-block;"><span style="font-weight:600;">Catatan:</span> ${escHtml(r.catatan_revisi_baris)}</div>` : ''}
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
  setElText('quick-pic-uraian', `[${row.kode || '-'}] ${row.uraian}`);
  setElVal('quick-pic-select', (row.pic_bagian || 'KUL').toUpperCase());
  document.getElementById('modal-quick-pic').style.display = 'flex';
}

function closeQuickPicModal() {
  document.getElementById('modal-quick-pic').style.display = 'none';
}

async function submitQuickPic() {
  const rowId = Number(document.getElementById('quick-pic-row-id')?.value);
  const pic = document.getElementById('quick-pic-select')?.value;
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
  setElVal('modal-satuan-vol', row.satuan_vol || 'Paket');
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
  setElVal('modal-pic', 'KUL');
  setElVal('modal-sasaran', 'KAB');

  const akunSelect = document.getElementById('modal-akun');
  if (akunSelect && AppState.masters && AppState.masters.akuns) {
    akunSelect.innerHTML = AppState.masters.akuns.map(a => `
      <option value="${a.kode}">[${a.kode}] ${a.uraian}</option>
    `).join('');
  }

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
  setElVal('modal-satuan-vol', 'Paket');
  setElVal('modal-catatan-revisi', '');

  calculateModalTotal();
  document.getElementById('modal-row').style.display = 'flex';
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

  const payload = {
    id: rowId ? Number(rowId) : undefined,
    urutan: AppState.activeEditingRow ? AppState.activeEditingRow.urutan : undefined,
    kode: AppState.activeEditingRow ? AppState.activeEditingRow.kode : '',
    row_type: AppState.activeEditingRow ? AppState.activeEditingRow.row_type : 'item',
    level_indent: AppState.activeEditingRow ? AppState.activeEditingRow.level_indent : 4,
    uraian: document.getElementById('modal-uraian')?.value || '',
    pic_bagian: document.getElementById('modal-pic')?.value || 'KUL',
    target_scope: document.getElementById('modal-sasaran')?.value || 'KAB',
    kode_akun: document.getElementById('modal-akun')?.value || '521211',
    harga_satuan: Number(document.getElementById('modal-harga')?.value) || 0,
    f1_val: document.getElementById('modal-f1-val')?.value ? Number(document.getElementById('modal-f1-val').value) : null,
    f1_unit: document.getElementById('modal-f1-unit')?.value || '',
    f2_val: document.getElementById('modal-f2-val')?.value ? Number(document.getElementById('modal-f2-val').value) : null,
    f2_unit: document.getElementById('modal-f2-unit')?.value || '',
    f3_val: document.getElementById('modal-f3-val')?.value ? Number(document.getElementById('modal-f3-val').value) : null,
    f3_unit: document.getElementById('modal-f3-unit')?.value || '',
    f4_val: document.getElementById('modal-f4-val')?.value ? Number(document.getElementById('modal-f4-val').value) : null,
    f4_unit: document.getElementById('modal-f4-unit')?.value || '',
    basis_pengali: document.getElementById('modal-basis-pengali')?.value || 'NONE',
    satuan_vol: document.getElementById('modal-satuan-vol')?.value || 'Paket',
    catatan_revisi_baris: document.getElementById('modal-catatan-revisi')?.value || ''
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
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 700;">${formatRupiah(s.harga_satuan || s.pagu_sbm)}</td>
        <td><small>${s.jenis_regulasi || 'SBM'} ${s.dasar_hukum || ''}</small></td>
      </tr>
    `).join('');
  }

  // 5. TAB KUANTITAS
  const tbodyKuan = document.getElementById('table-master-kuantitas');
  if (tbodyKuan) {
    tbodyKuan.innerHTML = kuantitas.map(q => `
      <tr>
        <td><code style="font-family: var(--font-mono); font-weight: 700;">@${q.kode}</code></td>
        <td><strong>${q.nama || q.uraian}</strong></td>
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${formatNumber(q.nilai)}</td>
        <td>${q.satuan || ''}</td>
        <td><small>${q.keterangan || '-'}</small></td>
      </tr>
    `).join('');
  }
}

function filterMasterPpk() {
  const keyword = (document.getElementById('filter-master-ppk')?.value || '').toLowerCase().trim();
  const rows = document.querySelectorAll('#table-master-ppk tr');
  rows.forEach(r => {
    const text = r.textContent.toLowerCase();
    r.style.display = text.includes(keyword) ? '' : 'none';
  });
}

function filterMasterPps() {
  if (!AppState.masters) return;
  const { kecamatans, desas } = AppState.masters;
  const kecId = document.getElementById('filter-pps-kec')?.value || 'ALL';
  const keyword = (document.getElementById('filter-master-pps')?.value || '').toLowerCase().trim();

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

  const countBadge = document.getElementById('pps-count-badge');
  if (countBadge) countBadge.textContent = `${filtered.length} Desa`;

  const tbody = document.getElementById('table-master-pps');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center" style="padding: 20px;">Tidak ada desa/kelurahan yang cocok dengan kriteria filter.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((d, idx) => `
    <tr>
      <td class="text-center">${idx + 1}</td>
      <td><strong>${kecMap[d.kecamatan_id] || '-'}</strong></td>
      <td><strong>${d.nama}</strong></td>
      <td class="text-center"><span class="badge badge-primary">${formatNumber(d.tps)} TPS</span></td>
      <td class="text-center">${formatNumber(d.pantarlih)}</td>
      <td class="text-center">${formatNumber(d.kotak)}</td>
      <td class="text-center">${formatNumber(d.rohaniwan)}</td>
      <td>${d.ketua_nama || '-'}</td>
      <td>${d.sekretaris_nama || '-'}</td>
      <td style="font-family: var(--font-mono); font-size: 11px;">${d.sekretaris_nip || '-'}</td>
    </tr>
  `).join('');
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
    kota_penandatangan: document.getElementById('set-kota-ttd')?.value || 'NGAWI'
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
    const pic = (u.pic_subbag || 'SEMUA').toUpperCase();
    let picBadge = `<span class="pic-chip pic-${pic}">${pic}</span>`;
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
  setElVal('modal-user-role', user.role_id || 'op_teknis');
  setElVal('modal-user-level', String(user.level));
  setElVal('modal-user-pic', (user.pic_subbag || 'SEMUA').toUpperCase());
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
