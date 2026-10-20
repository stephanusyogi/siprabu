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
    // Sesi berakhir
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
  // Ambil daftar user
  const usersRes = await apiFetch('/api/users');
  AppState.usersList = usersRes.users || [];

  // Populate user switcher di navbar
  const switcher = document.getElementById('user-switcher');
  switcher.innerHTML = AppState.usersList.map(u => `
    <option value="${u.username}">[Level ${u.level}] ${u.nama_pejabat} (${u.username})</option>
  `).join('');

  // Cek apakah ada token tersimpan
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

  // Jika belum login, default login sebagai Kasubbag Perencanaan (Level 1)
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
  AppState.currentUser = res.user;
  localStorage.setItem('siprabu_token', res.token);
  updateUserNavbar();
}

async function switchUser(username) {
  const u = AppState.usersList.find(x => x.username === username);
  if (!u) return;
  // Login dengan password default
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
  const pwd = pwdMap[u.username] || 'perencanaan123';
  await performLogin(u.username, pwd);
  
  // Refresh view agar hak akses tombol/tabel terupdate seketika
  renderAllViews();
}

function logout() {
  localStorage.removeItem('siprabu_token');
  location.reload();
}

function updateUserNavbar() {
  const u = AppState.currentUser;
  if (!u) return;

  document.getElementById('user-nama-pejabat').textContent = u.nama_pejabat;
  const roleBadge = document.getElementById('user-role-badge');
  roleBadge.textContent = `Level ${u.level}: ${u.role_id}`;
  
  if (u.level === 0) roleBadge.className = 'user-role badge badge-secondary';
  else if (u.level === 1) roleBadge.className = 'user-role badge badge-primary';
  else if (u.level === 2) roleBadge.className = 'user-role badge badge-warning';
  else roleBadge.className = 'user-role badge badge-success';

  // Sinkronkan pilihan di select switcher
  const switcher = document.getElementById('user-switcher');
  if (switcher) switcher.value = u.username;
}

// ============================================================================
// DATA LOADERS
// ============================================================================

async function loadMasters() {
  AppState.masters = await apiFetch('/api/masters');
  // Update header satker name if available
  if (AppState.masters.settings && AppState.masters.settings.nama_satker) {
    document.getElementById('satker-name-header').textContent = AppState.masters.settings.nama_satker;
  }
}

async function loadPeriodes() {
  const res = await apiFetch('/api/periodes');
  AppState.periodesList = res.periodes || [];

  const activeRes = await apiFetch('/api/periodes/active');
  AppState.currentPeriode = activeRes.periode || AppState.periodesList[0];

  updateContextNavbar();
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

  document.getElementById('context-nama-dokumen').textContent = p.nama_periode;
  const badge = document.getElementById('context-badge-status');
  const dot = document.getElementById('context-dot');
  const banner = document.getElementById('global-lock-banner');

  if (p.is_locked) {
    badge.textContent = '🔒 TERKUNCI (NPHD SAH)';
    badge.className = 'context-status badge badge-danger';
    dot.className = 'pulse-dot locked';
    banner.style.display = 'flex';
    document.getElementById('lock-banner-title').textContent = `DOKUMEN ${p.versi_revisi.toUpperCase()} TELAH DIKUNCI (NPHD SAH)`;
  } else {
    badge.textContent = '🟢 DRAFT AKTIF';
    badge.className = 'context-status badge badge-success';
    dot.className = 'pulse-dot active';
    banner.style.display = 'none';
  }
}

// ============================================================================
// VIEW SWITCHER & RENDERERS
// ============================================================================

function switchView(viewId) {
  AppState.activeView = viewId;
  document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === viewId);
  });

  const targetView = document.getElementById(viewId);
  if (targetView) targetView.classList.add('active');

  // Trigger render spesifik
  if (viewId === 'view-dashboard') renderDashboard();
  else if (viewId === 'view-siklus') renderSiklus();
  else if (viewId === 'view-rkb') renderRkbTable();
  else if (viewId === 'view-adhoc') renderAdhocMatrix();
  else if (viewId === 'view-master') renderMasterTabs();
  else if (viewId === 'view-settings') renderSettings();
}

function renderAllViews() {
  updateContextNavbar();
  renderDashboard();
  renderSiklus();
  renderRkbTable();
  renderAdhocMatrix();
  renderMasterTabs();
  renderSettings();
}

// ----------------------------------------------------------------------------
// VIEW 1: DASHBOARD
// ----------------------------------------------------------------------------
function renderDashboard() {
  if (!AppState.rkbData || !AppState.rkbData.summary) return;
  const { summary, periode } = AppState.rkbData;

  document.getElementById('kpi-total-pagu').textContent = formatRupiah(summary.grandTotal);
  document.getElementById('kpi-total-items').textContent = formatNumber(summary.totalItems) + ' Baris';
  document.getElementById('kpi-total-rows').textContent = formatNumber(summary.totalRows) + ' Total Komponen Hierarki';
  document.getElementById('badge-total-items').textContent = formatNumber(summary.totalItems);

  const paguKab = summary.bySasaran.KAB || 0;
  const paguAdhoc = (summary.bySasaran.PPK || 0) + (summary.bySasaran.PPS || 0) + (summary.bySasaran.TPS || 0) + (summary.bySasaran.PANTARLIH || 0);
  
  document.getElementById('kpi-pagu-kab').textContent = formatRupiah(paguKab);
  document.getElementById('kpi-pagu-adhoc').textContent = formatRupiah(paguAdhoc);

  const pctKab = summary.grandTotal > 0 ? ((paguKab / summary.grandTotal) * 100).toFixed(2) : '0';
  const pctAdhoc = summary.grandTotal > 0 ? ((paguAdhoc / summary.grandTotal) * 100).toFixed(2) : '0';

  document.getElementById('kpi-pct-kab').textContent = `${pctKab}% dari Pagu Total`;
  document.getElementById('kpi-pct-adhoc').textContent = `${pctAdhoc}% (PPK, PPS, TPS, Pantarlih)`;
  document.getElementById('kpi-status-dokumen').textContent = periode.is_locked ? 'Status: Terkunci (NPHD Sah)' : 'Status: Draft Aktif';

  // Subbag Distribution
  const subbagList = document.getElementById('subbag-distribution-list');
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

  // Sasaran Table
  const sasaranBody = document.getElementById('table-sasaran-body');
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

  // Akun BAS Table
  const akunBody = document.getElementById('table-akun-body');
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

// ----------------------------------------------------------------------------
// VIEW 2: PUSAT SIKLUS & RIWAYAT REVISI
// ----------------------------------------------------------------------------
function renderSiklus() {
  const p = AppState.currentPeriode;
  if (!p) return;

  document.getElementById('siklus-nama-dokumen').textContent = p.nama_periode;
  document.getElementById('siklus-versi-revisi').textContent = p.versi_revisi;
  document.getElementById('siklus-dasar-pengesahan').textContent = p.dasar_pengesahan || 'NPHD';
  document.getElementById('siklus-nomor-ba').textContent = p.nomor_ba_tapd || '-';
  document.getElementById('siklus-tanggal-ba').textContent = p.tanggal_ba_tapd || '-';
  document.getElementById('siklus-catatan').textContent = p.catatan_revisi || 'Baseline NPHD Awal Pilkada Ngawi';

  const badgeBox = document.getElementById('lifecycle-badge');
  if (p.is_locked) {
    badgeBox.innerHTML = '<span class="badge badge-danger" style="font-size: 13px;">🔒 TERKUNCI (NPHD SAH)</span>';
  } else {
    badgeBox.innerHTML = '<span class="badge badge-success" style="font-size: 13px;">🟢 DRAFT AKTIF (TERBUKA)</span>';
  }

  // Tombol aksi penguncian berdasarkan level
  const actionContainer = document.getElementById('lifecycle-action-buttons');
  const user = AppState.currentUser;
  const canManage = user && (user.level === 0 || user.level === 1);

  let buttonsHtml = '';
  if (p.is_locked) {
    if (canManage) {
      buttonsHtml += `
        <button class="btn btn-warning" onclick="toggleLockPeriode(${p.id}, false)">
          🔓 Buka Kunci Dokumen
        </button>
      `;
    }
    buttonsHtml += `
      <button class="btn btn-primary" onclick="openRevisionModal()">
        ➕ Buat Usulan Revisi Baru
      </button>
    `;
  } else {
    if (canManage) {
      buttonsHtml += `
        <button class="btn btn-danger" onclick="toggleLockPeriode(${p.id}, true)">
          🔒 Kunci NPHD Sah
        </button>
      `;
    }
  }

  buttonsHtml += `
    <button class="btn btn-outline-primary" onclick="downloadExcel()">
      📥 Unduh Excel Resmi
    </button>
  `;

  actionContainer.innerHTML = buttonsHtml;

  // History Table
  const historyTbody = document.getElementById('table-periode-history');
  historyTbody.innerHTML = AppState.periodesList.map(item => `
    <tr class="${item.id === p.id ? 'table-primary-row' : ''}">
      <td>${item.id}</td>
      <td><strong>${item.nama_periode}</strong></td>
      <td><span class="badge badge-secondary">${item.versi_revisi}</span></td>
      <td>${item.dasar_pengesahan || 'NPHD'}</td>
      <td>
        ${item.is_locked 
          ? '<span class="badge badge-danger">🔒 Terkunci</span>' 
          : '<span class="badge badge-success">🟢 Draft Aktif</span>'}
      </td>
      <td class="text-right" style="font-family: var(--font-mono);">${formatNumber(item.total_items)} item</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary" onclick="selectPeriode(${item.id})">
          ${item.id === p.id ? 'Sedang Aktif' : 'Buka Dokumen'}
        </button>
      </td>
    </tr>
  `).join('');
}

async function selectPeriode(id) {
  const p = AppState.periodesList.find(x => x.id === id);
  if (!p) return;
  AppState.currentPeriode = p;
  await loadRkbData();
  renderAllViews();
}

async function toggleLockPeriode(id, shouldLock) {
  const endpoint = `/api/periodes/${id}/${shouldLock ? 'lock' : 'unlock'}`;
  const msg = shouldLock 
    ? 'Apakah Anda yakin ingin MENGUNCI dokumen ini sebagai NPHD Sah? Dokumen akan menjadi Read-Only.' 
    : 'Buka kembali kunci dokumen untuk mengizinkan perubahan?';
  
  if (!confirm(msg)) return;

  try {
    const res = await apiFetch(endpoint, { method: 'POST' });
    AppState.currentPeriode = res.periode;
    await loadPeriodes();
    await loadRkbData();
    renderAllViews();
    alert(shouldLock ? 'Dokumen berhasil dikunci (NPHD Sah).' : 'Kunci dokumen berhasil dibuka.');
  } catch (err) {
    alert('Gagal mengubah status penguncian: ' + err.message);
  }
}

// ----------------------------------------------------------------------------
// VIEW 3: RKB KABUPATEN (ACTIVE WORKBENCH)
// ----------------------------------------------------------------------------
function renderRkbTable() {
  if (!AppState.rkbData) return;
  const { rows, summary, periode } = AppState.rkbData;
  const user = AppState.currentUser;
  const isLocked = Boolean(periode.is_locked);

  document.getElementById('rkb-tfoot-total').textContent = formatRupiah(summary.grandTotal);

  // Disable button tambah baris jika locked atau unauthorized
  const btnTambah = document.getElementById('btn-tambah-baris');
  if (btnTambah) {
    btnTambah.disabled = isLocked || (user && user.level === 3);
    if (isLocked) {
      btnTambah.title = 'Dokumen terkunci. Buat usulan revisi untuk menambah/mengubah baris.';
    } else {
      btnTambah.title = 'Tambah rincian belanja baru.';
    }
  }

  const tbody = document.getElementById('rkb-table-body');
  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="text-center" style="padding: 30px;">Tidak ada data baris yang cocok dengan filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, idx) => {
    const lvl = Number(r.level_indent);
    const isItem = lvl === 4;
    const rowClass = `rkb-row-lvl-${lvl}`;

    // Indentasi visual uraian
    let indentPx = 0;
    if (lvl === 0) indentPx = 0;
    else if (lvl === 1) indentPx = 16;
    else if (lvl === 2) indentPx = 32;
    else if (lvl >= 21 && lvl <= 24) indentPx = 48;
    else if (lvl === 3) indentPx = 64;
    else if (lvl === 41) indentPx = 80;
    else if (lvl === 4) indentPx = 96;

    // Badges
    const pic = (r.pic_bagian || 'KUL').toUpperCase();
    const picBadge = isItem ? `<span class="badge badge-pic-${pic.toLowerCase()}">${pic}</span>` : '';
    
    const sas = (r.target_scope || 'KAB').toUpperCase();
    const sasBadge = isItem ? `<span class="badge badge-sasaran-${sas.toLowerCase()}">${sas}</span>` : '';

    // Cek otorisasi edit baris ini
    const canEdit = checkCanEditRow(user, r, isLocked);

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

    return `
      <tr class="${rowClass}">
        <td class="col-no text-center" style="font-family: var(--font-mono); font-size: 11px;">${r.urutan || (idx + 1)}</td>
        <td class="col-kode" style="font-family: var(--font-mono); font-weight: 700;">${r.kode || ''}</td>
        <td class="col-uraian uraian-cell" style="padding-left: ${indentPx}px;">
          ${r.uraian || ''}
        </td>
        <td class="col-pic">${picBadge}</td>
        <td class="col-sasaran">${sasBadge}</td>
        <td class="col-formula" style="font-family: var(--font-mono); font-size: 11px; color: ${isItem ? '#475569' : 'inherit'};">
          ${isItem ? r.computed_formula : ''}
        </td>
        <td class="col-vol text-right" style="font-family: var(--font-mono); font-weight: 600;">
          ${isItem && r.computed_volume !== null ? formatNumber(r.computed_volume) : ''}
        </td>
        <td class="col-sat">${isItem ? (r.satuan_vol || '') : ''}</td>
        <td class="col-harga text-right" style="font-family: var(--font-mono);">
          ${isItem && r.harga_satuan ? formatRupiah(r.harga_satuan) : ''}
        </td>
        <td class="col-total text-right" style="font-family: var(--font-mono); font-weight: 700;">
          ${formatRupiah(r.computed_total)}
        </td>
        <td class="col-aksi text-center">${aksiHtml}</td>
      </tr>
    `;
  }).join('');
}

function checkCanEditRow(user, row, isLocked) {
  if (!user || isLocked) return false;
  if (user.level === 0 || user.level === 1) return true;
  if (user.level === 2) {
    const userPic = (user.pic_subbag || '').toUpperCase();
    const rowPic = (row.pic_bagian || '').toUpperCase();
    if (userPic === 'SEMUA') return true;
    if (userPic === 'PERENCANAAN' && (rowPic === 'RENDATIN' || rowPic === 'PERENCANAAN')) return true;
    if (userPic === 'KEUANGAN' && (rowPic === 'KUL' || rowPic === 'KEUANGAN')) return true;
    if (userPic === 'PARMAS' && (rowPic === 'PARSDM' || rowPic === 'PARMAS')) return true;
    return userPic === rowPic;
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
  }, 300);
}

// ----------------------------------------------------------------------------
// VIEW 4: MATRIKS BREAKDOWN ANGGARAN ADHOC (PPK & PPS)
// ----------------------------------------------------------------------------
let adhocCalculatedMatrix = [];

function renderAdhocMatrix() {
  if (!AppState.masters || !AppState.rkbData) return;
  const { kecamatans, desas } = AppState.masters;
  const rows = AppState.rkbData.rows.filter(r => Number(r.level_indent) === 4);

  // Peta desa per kecamatan
  const desaByKec = {};
  for (const d of desas) {
    if (!desaByKec[d.kecamatan_id]) desaByKec[d.kecamatan_id] = [];
    desaByKec[d.kecamatan_id].push(d);
  }

  // Hitung alokasi per kecamatan
  let grandTotalPpk = 0;
  let grandTotalPps = 0;

  adhocCalculatedMatrix = kecamatans.map((k, idx) => {
    const kecDesas = desaByKec[k.id] || [];
    const totalTpsKec = kecDesas.reduce((a, b) => a + (Number(b.tps) || 0), 0);

    // Alokasi PPK
    let ppkSum = 0;
    for (const r of rows) {
      if (r.target_scope === 'PPK') {
        const mult = (r.basis_pengali === 'PPK' || r.basis_pengali === 'FIXED' || !r.basis_pengali || r.basis_pengali === 'NONE') ? 1 : 1;
        const f1 = Number(r.f1_val) || 1;
        const f2 = Number(r.f2_val) || 1;
        const f3 = Number(r.f3_val) || 1;
        const f4 = Number(r.f4_val) || 1;
        const vol = f1 * (r.f2_val ? f2 : 1) * (r.f3_val ? f3 : 1) * (r.f4_val ? f4 : 1) * mult;
        ppkSum += vol * (Number(r.harga_satuan) || 0);
      }
    }

    // Alokasi PPS & TPS di wilayah kecamatan ini
    let ppsSum = 0;
    for (const d of kecDesas) {
      for (const r of rows) {
        if (r.target_scope === 'PPS') {
          const f1 = Number(r.f1_val) || 1;
          const f2 = Number(r.f2_val) || 1;
          const f3 = Number(r.f3_val) || 1;
          const f4 = Number(r.f4_val) || 1;
          const vol = f1 * (r.f2_val ? f2 : 1) * (r.f3_val ? f3 : 1) * (r.f4_val ? f4 : 1);
          ppsSum += vol * (Number(r.harga_satuan) || 0);
        } else if (r.target_scope === 'TPS') {
          const tpsCount = Number(d.tps) || 0;
          const f1 = Number(r.f1_val) || 1;
          const f2 = Number(r.f2_val) || 1;
          const f3 = Number(r.f3_val) || 1;
          const vol = f1 * (r.f2_val ? f2 : 1) * (r.f3_val ? f3 : 1) * tpsCount;
          ppsSum += vol * (Number(r.harga_satuan) || 0);
        } else if (r.target_scope === 'PANTARLIH') {
          const pantarlihCount = Number(d.pantarlih) || Number(d.tps) || 0;
          const f1 = Number(r.f1_val) || 1;
          const f2 = Number(r.f2_val) || 1;
          const vol = f1 * (r.f2_val ? f2 : 1) * pantarlihCount;
          ppsSum += vol * (Number(r.harga_satuan) || 0);
        }
      }
    }

    const totalWilayah = ppkSum + ppsSum;
    grandTotalPpk += ppkSum;
    grandTotalPps += ppsSum;

    return {
      id: k.id,
      noUrut: idx + 1,
      nama: k.nama,
      ketua_nama: k.ketua_nama,
      sekretaris_nama: k.sekretaris_nama,
      jumlahDesa: kecDesas.length,
      totalTps: totalTpsKec,
      ppkSum,
      ppsSum,
      totalWilayah
    };
  });

  // Update KPI Adhoc Cards
  const totalCombined = grandTotalPpk + grandTotalPps;
  document.getElementById('adhoc-total-pagu').textContent = formatRupiah(totalCombined);
  document.getElementById('adhoc-pagu-ppk').textContent = formatRupiah(grandTotalPpk);
  document.getElementById('adhoc-pagu-pps').textContent = formatRupiah(grandTotalPps);

  // Update Footer Totals
  document.getElementById('foot-ppk-total').textContent = formatRupiah(grandTotalPpk);
  document.getElementById('foot-pps-total').textContent = formatRupiah(grandTotalPps);
  document.getElementById('foot-grand-total').textContent = formatRupiah(totalCombined);

  filterAdhocMatrix();
}

function filterAdhocMatrix() {
  const keyword = (document.getElementById('adhoc-search-kec')?.value || '').toLowerCase().trim();
  const tbody = document.getElementById('table-adhoc-matrix-body');
  if (!tbody) return;

  const filtered = adhocCalculatedMatrix.filter(k => k.nama.toLowerCase().includes(keyword));

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center" style="padding: 20px;">Tidak ada kecamatan yang cocok dengan pencarian.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(k => `
    <tr>
      <td class="text-center">${k.noUrut}</td>
      <td><strong>${k.nama}</strong></td>
      <td class="text-center"><span class="badge badge-secondary">${k.jumlahDesa} Desa</span></td>
      <td class="text-center"><span class="badge badge-primary">${formatNumber(k.totalTps)} TPS</span></td>
      <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">${formatRupiah(k.ppkSum)}</td>
      <td class="text-right" style="font-family: var(--font-mono); font-weight: 600;">${formatRupiah(k.ppsSum)}</td>
      <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${formatRupiah(k.totalWilayah)}</td>
      <td class="text-center">
        <button class="btn btn-sm btn-outline-primary" onclick="openAdhocDetail(${k.id})">
          📄 Rincian RKK
        </button>
      </td>
    </tr>
  `).join('');
}

function openAdhocDetail(kecId) {
  const kec = adhocCalculatedMatrix.find(x => x.id === kecId);
  if (!kec) return;

  document.getElementById('adhoc-modal-title').textContent = `Rincian Alokasi RKK: Kecamatan ${kec.nama}`;
  document.getElementById('adhoc-modal-subtitle').textContent = `Wilayah: ${kec.jumlahDesa} Desa/Kelurahan | Total TPS: ${formatNumber(kec.totalTps)} TPS | Total Alokasi: ${formatRupiah(kec.totalWilayah)}`;
  document.getElementById('adhoc-modal-total').textContent = formatRupiah(kec.totalWilayah);

  // Ambil baris-baris belanja untuk PPK dan PPS
  const rows = AppState.rkbData.rows.filter(r => Number(r.level_indent) === 4 && ['PPK', 'PPS', 'TPS', 'PANTARLIH'].includes(r.target_scope));
  const tbody = document.getElementById('adhoc-modal-table-body');

  tbody.innerHTML = rows.map((r, idx) => {
    let vol = 0;
    let labelVol = '';

    if (r.target_scope === 'PPK') {
      const f1 = Number(r.f1_val) || 1;
      const f2 = Number(r.f2_val) || 1;
      vol = f1 * (r.f2_val ? f2 : 1);
      labelVol = `${vol} ${r.satuan_vol || ''}`;
    } else if (r.target_scope === 'PPS') {
      const f1 = Number(r.f1_val) || 1;
      const f2 = Number(r.f2_val) || 1;
      vol = f1 * (r.f2_val ? f2 : 1) * kec.jumlahDesa;
      labelVol = `${kec.jumlahDesa} Desa x ${f1} ${r.satuan_vol || ''}`;
    } else if (r.target_scope === 'TPS') {
      const f1 = Number(r.f1_val) || 1;
      vol = f1 * kec.totalTps;
      labelVol = `${kec.totalTps} TPS x ${f1} ${r.satuan_vol || ''}`;
    } else if (r.target_scope === 'PANTARLIH') {
      const f1 = Number(r.f1_val) || 1;
      vol = f1 * kec.totalTps;
      labelVol = `${kec.totalTps} Org x ${f1} ${r.satuan_vol || ''}`;
    }

    const jumlah = vol * (Number(r.harga_satuan) || 0);

    return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong>${r.uraian}</strong></td>
        <td><span class="badge badge-sasaran-${(r.target_scope || 'PPK').toLowerCase()}">${r.target_scope}</span></td>
        <td style="font-family: var(--font-mono); font-size: 11px;">${labelVol}</td>
        <td class="text-right" style="font-family: var(--font-mono);">${formatRupiah(r.harga_satuan)}</td>
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 700;">${formatRupiah(jumlah)}</td>
      </tr>
    `;
  }).join('');

  document.getElementById('modal-adhoc-detail').style.display = 'flex';
}

function closeAdhocModal() {
  document.getElementById('modal-adhoc-detail').style.display = 'none';
}

// ----------------------------------------------------------------------------
// VIEW 5: DATABASE MASTER WILAYAH & AKUN (SSOT)
// ----------------------------------------------------------------------------
function switchMasterTab(tabId) {
  document.querySelectorAll('.master-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('#view-master .tab-content').forEach(tc => tc.classList.remove('active'));
  
  if (event && event.target) {
    event.target.classList.add('active');
  }
  const content = document.getElementById(tabId);
  if (content) content.classList.add('active');
}

function renderMasterTabs() {
  if (!AppState.masters) return;
  const { kecamatans, desas, akuns, sbms, kuantitas } = AppState.masters;

  // Peta desa per kecamatan
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
  const tbodyKuantitas = document.getElementById('table-master-kuantitas');
  if (tbodyKuantitas) {
    tbodyKuantitas.innerHTML = kuantitas.map(k => `
      <tr>
        <td><code style="font-family: var(--font-mono); font-weight: 700;">@${k.kode}</code></td>
        <td><strong>${k.nama}</strong></td>
        <td class="text-right" style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${formatNumber(k.nilai)}</td>
        <td>${k.satuan}</td>
        <td><small>${k.keterangan || '-'}</small></td>
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

// ----------------------------------------------------------------------------
// VIEW 6: SETTINGS
// ----------------------------------------------------------------------------
function renderSettings() {
  if (!AppState.masters || !AppState.masters.settings) return;
  const s = AppState.masters.settings;

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined) el.value = val;
  };

  setVal('set-nama-satker', s.nama_satker);
  setVal('set-kode-satker', s.kode_satker);
  setVal('set-tahun-anggaran', s.tahun_anggaran || s.tahun_anggaran_pilkada);
  setVal('set-nama-agenda', s.nama_agenda_pilkada);

  // Urutan Pejabat dari atas ke bawah: Ketua, Sekretaris, PPK, BP
  setVal('set-ketua-nama', s.ketua_kpu_nama);
  setVal('set-ketua-jabatan', s.ketua_kpu_jabatan || 'Ketua Komisi Pemilihan Umum Kabupaten Ngawi');
  setVal('set-kpa-nama', s.kpa_nama);
  setVal('set-kpa-nip', s.kpa_nip);
  setVal('set-ppkom-nama', s.ppkom_nama);
  setVal('set-ppkom-nip', s.ppkom_nip);
  setVal('set-bp-nama', s.bp_nama);
  setVal('set-bp-nip', s.bp_nip);
  setVal('set-kota-ttd', s.kota_ttd);

  // Disable simpan jika user level > 1
  const user = AppState.currentUser;
  const btnSave = document.getElementById('btn-simpan-settings');
  if (btnSave) btnSave.disabled = !user || user.level > 1;
}

async function saveSatkerSettings() {
  // Urutan Pejabat dari atas ke bawah: Ketua, Sekretaris, PPK, BP
  const settings = {
    nama_satker: document.getElementById('set-nama-satker').value,
    kode_satker: document.getElementById('set-kode-satker').value,
    tahun_anggaran: document.getElementById('set-tahun-anggaran').value,
    nama_agenda_pilkada: document.getElementById('set-nama-agenda').value,
    ketua_kpu_nama: document.getElementById('set-ketua-nama').value,
    ketua_kpu_jabatan: document.getElementById('set-ketua-jabatan').value,
    kpa_nama: document.getElementById('set-kpa-nama').value,
    kpa_nip: document.getElementById('set-kpa-nip').value,
    ppkom_nama: document.getElementById('set-ppkom-nama').value,
    ppkom_nip: document.getElementById('set-ppkom-nip').value,
    bp_nama: document.getElementById('set-bp-nama').value,
    bp_nip: document.getElementById('set-bp-nip').value,
    kota_ttd: document.getElementById('set-kota-ttd').value
  };

  try {
    await apiFetch('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    });
    alert('Pengaturan satker berhasil diperbarui!');
    await loadMasters();
    renderAllViews();
  } catch (err) {
    alert('Gagal menyimpan pengaturan: ' + err.message);
  }
}

// ============================================================================
// MODAL: EDIT & TAMBAH BARIS BELANJA
// ============================================================================

function openRowModal(rowId = null) {
  const modal = document.getElementById('modal-row');
  const title = document.getElementById('modal-row-title');

  // Populate Akun Select
  const akunSelect = document.getElementById('modal-akun');
  if (AppState.masters && AppState.masters.akuns) {
    akunSelect.innerHTML = AppState.masters.akuns.map(a => `
      <option value="${a.kode}">${a.kode} - ${a.uraian}</option>
    `).join('');
  }

  if (rowId) {
    title.textContent = 'Edit Rincian Belanja RKB';
    const row = AppState.rkbData.rows.find(r => r.id === rowId);
    if (!row) return;

    document.getElementById('modal-row-id').value = row.id;
    document.getElementById('modal-uraian').value = row.uraian || '';
    document.getElementById('modal-pic').value = (row.pic_bagian || 'KUL').toUpperCase();
    document.getElementById('modal-sasaran').value = (row.target_scope || 'KAB').toUpperCase();
    document.getElementById('modal-akun').value = row.kode_akun || '521211';
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
    document.getElementById('modal-satuan-vol').value = row.satuan_vol || '';
  } else {
    title.textContent = 'Tambah Rincian Belanja Baru';
    document.getElementById('modal-row-id').value = '';
    document.getElementById('modal-uraian').value = '';
    
    // Default PIC sesuai user login
    const user = AppState.currentUser;
    let defPic = 'KUL';
    if (user && user.pic_subbag && user.pic_subbag !== 'SEMUA') {
      defPic = user.pic_subbag.toUpperCase();
      if (defPic === 'PERENCANAAN') defPic = 'RENDATIN';
      if (defPic === 'PARMAS') defPic = 'PARSDM';
    }
    document.getElementById('modal-pic').value = defPic;
    document.getElementById('modal-sasaran').value = 'KAB';
    document.getElementById('modal-akun').value = '521211';
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
    document.getElementById('modal-satuan-vol').value = 'Keg';
  }

  calculateModalTotal();
  modal.style.display = 'flex';
}

function closeRowModal() {
  document.getElementById('modal-row').style.display = 'none';
}

function calculateModalTotal() {
  const f1 = Number(document.getElementById('modal-f1-val').value) || 1;
  const f1u = document.getElementById('modal-f1-unit').value.trim();
  const f2 = Number(document.getElementById('modal-f2-val').value) || 1;
  const f2u = document.getElementById('modal-f2-unit').value.trim();
  const f3 = Number(document.getElementById('modal-f3-val').value) || 1;
  const f3u = document.getElementById('modal-f3-unit').value.trim();
  const f4 = Number(document.getElementById('modal-f4-val').value) || 1;
  const f4u = document.getElementById('modal-f4-unit').value.trim();

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
