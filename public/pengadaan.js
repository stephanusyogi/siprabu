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
  activeRekapTab: 'EKSEKUTIF',
  siprabuRkbItems: [],
  rkbDrawerOpen: false
};
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

    if (CakraState.pakets.length > 0 && !CakraState.activePaketId) {
      CakraState.activePaketId = CakraState.pakets[0].id;
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
    const targetId = CakraState.activePaketId || (CakraState.pakets[0] && CakraState.pakets[0].id);
    if (targetId) {
      await openPaketInCockpit(targetId, CakraState.activeStageNo || 6, false);
    }
  } else if (viewId === 'view-rekap-pengadaan') {
    renderRekapPengadaanView();
  }
}

/**
 * VIEW 1: DAFTAR PAKET PENGADAAN & RINGKASAN EKSEKUTIF
 */
function renderDashboardKpi() {
  const s = CakraState.summary;
  const grid = document.getElementById('cakra-dashboard-kpi-grid');
  if (!grid) return;

  grid.innerHTML = `
    <div class="cakra-kpi-card">
      <div class="cakra-kpi-label">Total Paket PBJ & Konstruksi</div>
      <div class="cakra-kpi-value">${s.jumlahPaket || 0} Paket</div>
      <div class="cakra-kpi-sub">Total Pagu DIPA: <strong>${cakraFmtRp(s.totalPagu)}</strong></div>
    </div>
    <div class="cakra-kpi-card amber">
      <div class="cakra-kpi-label">Total Nilai Kontrak & Efisiensi</div>
      <div class="cakra-kpi-value">${cakraFmtRp(s.totalKontrak)}</div>
      <div class="cakra-kpi-sub">Penghematan Anggaran: <strong>${cakraFmtRp(s.totalEfisiensi)}</strong></div>
    </div>
    <div class="cakra-kpi-card green">
      <div class="cakra-kpi-label">Realisasi UMK-Koperasi (Pasal 65)</div>
      <div class="cakra-kpi-value">${s.persenAlokasiUmk || 100}%</div>
      <div class="cakra-kpi-sub">Target Wajib Regulasi: <strong>Minimal 40%</strong> (${s.totalPaketUmk || 0} Paket UMK)</div>
    </div>
    <div class="cakra-kpi-card blue">
      <div class="cakra-kpi-label">Rata-rata Komitmen PDN / TKDN</div>
      <div class="cakra-kpi-value">${s.rataTkdn || 45}%</div>
      <div class="cakra-kpi-sub">Hierarki Wajib PDN Pasal 66 Perpres 46/2025</div>
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

function renderDashboardTable() {
  const tbody = document.getElementById('cakra-table-paket-body');
  if (!tbody) return;

  tbody.innerHTML = CakraState.pakets.map(p => {
    const badgeCls = getBadgeClassByJenis(p.jenis_pengadaan);
    return `
      <tr>
        <td>
          <div class="cakra-mono" style="font-weight:800; color:#991b1b;">${cakraEsc(p.kode_paket_internal)}</div>
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
          <span class="cakra-badge cakra-badge-green" style="margin-top:3px;">Tahap ${p.tahap_aktif}/18 — ${cakraEsc(p.status_paket)}</span>
        </td>
        <td style="text-align:center;">
          <div style="display:flex; flex-direction:column; gap:5px; align-items:center;">
            <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" style="width:100%;" onclick="openPaketInCockpit(${p.id}, ${p.tahap_aktif || 6}, true)">🧭 Buka Kokpit 18 Tahap</button>
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
 * DRAWER TARIK MATA ANGGARAN DARI RKB SI-PRABU
 */
async function toggleCakraRkbDrawer() {
  const drawer = document.getElementById('cakra-rkb-pull-drawer');
  if (!drawer) return;
  CakraState.rkbDrawerOpen = !CakraState.rkbDrawerOpen;
  drawer.style.display = CakraState.rkbDrawerOpen ? 'block' : 'none';
  if (CakraState.rkbDrawerOpen) {
    await loadSiprabuRkbItems();
  }
}

async function loadSiprabuRkbItems() {
  const tbody = document.getElementById('cakra-table-siprabu-rkb-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px;">⏳ Membaca mata anggaran RUH Belanja RKB...</td></tr>`;

  try {
    const res = await cakraApiGet('/api/cakra/siprabu-rkb');
    CakraState.siprabuRkbItems = res.items || [];

    tbody.innerHTML = CakraState.siprabuRkbItems.map((it, idx) => {
      const rowId = it.siprabu_rab_id || it.id;
      const uraian = it.uraian_bersih || it.uraian || '-';
      const totalPagu = it.pagu_total || it.jumlah_pagu || 0;
      return `
        <tr>
          <td class="cakra-mono">#${rowId}</td>
          <td><span class="cakra-badge cakra-badge-blue cakra-mono">${cakraEsc(it.kode_akun)}</span></td>
          <td><strong>${cakraEsc(it.pic_subbag)}</strong></td>
          <td>
            <div style="font-weight:700;">${cakraEsc(uraian)}</div>
          </td>
          <td class="cakra-mono">${it.volume} ${cakraEsc(it.satuan)}</td>
          <td class="cakra-mono">${cakraFmtRp(it.harga_satuan)}</td>
          <td class="cakra-mono" style="font-weight:800; color:#047857;">${cakraFmtRp(totalPagu)}</td>
          <td>
            <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="importRkbItemToCakra(${idx})">⚡ Jadikan Paket Pengadaan</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="color:red;">Gagal memuat RKB: ${cakraEsc(err.message)}</td></tr>`;
  }
}

async function importRkbItemToCakra(idx) {
  const it = CakraState.siprabuRkbItems[idx];
  if (!it) return;

  const uraian = it.uraian_bersih || it.uraian || 'Paket Pengadaan RKB';
  const pagu = Number(it.pagu_total || it.jumlah_pagu || 50000000);
  const isKonstruksi = String(it.kode_akun || '').startsWith('533') ||
    uraian.toLowerCase().includes('rehabilitasi') ||
    uraian.toLowerCase().includes('gedung');
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
    jenis_pengadaan: isKonstruksi ? 'Pekerjaan Konstruksi' : 'Barang',
    cara_pengadaan: 'Penyedia',
    metode_pemilihan: isKonstruksi ? 'Pengadaan Langsung' : (pagu <= 100000000 ? 'E-Purchasing' : 'Pengadaan Langsung'),
    bentuk_kontrak: isKonstruksi ? 'SPK' : (pagu <= 100000000 ? 'Surat Pesanan' : 'SPK'),
    jenis_kontrak: isKonstruksi ? 'Gabungan Lumsum dan Harga Satuan' : 'Lumsum',
    nilai_pagu: pagu,
    nilai_hps: pagu,
    nilai_penawaran_awal: pagu,
    nilai_kontrak: Math.round(pagu * 0.97),
    jenis_pph: isKonstruksi ? 'PPh Final Konstruksi Kecil SBU K1/K2/K3 (1.75%)' : 'PPh 22 Barang (1.5%)',
    tarif_pph: isKonstruksi ? 1.75 : 1.5,
    penyedia_id: isKonstruksi ? 6 : 1
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
async function openPaketInCockpit(paketId, stageNo = 6, navigateToCockpit = true) {
  try {
    CakraState.activePaketId = Number(paketId);
    CakraState.activeStageNo = Number(stageNo) || 6;
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

function renderCockpitTopBanner() {
  const banner = document.getElementById('cakra-cockpit-top-banner');
  if (!banner || !CakraState.activePaketCtx) return;
  const { paket, keuangan } = CakraState.activePaketCtx;

  const optionsHtml = CakraState.pakets.map(p =>
    `<option value="${p.id}" ${Number(p.id) === Number(paket.id) ? 'selected' : ''}>[${cakraEsc(p.kode_paket_internal)}] ${cakraEsc(p.nama_paket.substring(0, 68))} (${cakraEsc(p.jenis_pengadaan)})</option>`
  ).join('');

  banner.innerHTML = `
    <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
      <span style="font-size:12px; font-weight:800; color:#fbbf24;">🎯 PILIH PAKET KOKPIT:</span>
      <select onchange="openPaketInCockpit(this.value, 6, false)" style="background:#1e293b; color:#fff; border:1px solid #475569; padding:6px 10px; border-radius:6px; font-weight:700; font-size:12px; min-width:340px;">
        ${optionsHtml}
      </select>
      <span class="cakra-badge cakra-badge-amber">${cakraEsc(paket.jenis_pengadaan)}</span>
      <span class="cakra-badge cakra-badge-blue">${cakraEsc(paket.metode_pemilihan)} (${cakraEsc(paket.bentuk_kontrak)})</span>
    </div>
    <div style="display:flex; align-items:center; gap:14px; font-size:12px; flex-wrap:wrap;">
      <div>Pagu: <strong class="cakra-mono">${cakraFmtRp(paket.nilai_pagu)}</strong></div>
      <div>${cakraEsc(paket.jenis_kertas_harga)}: <strong class="cakra-mono" style="color:#93c5fd;">${cakraFmtRp(paket.nilai_hps)}</strong></div>
      <div>Kontrak: <strong class="cakra-mono" style="color:#6ee7b7;">${cakraFmtRp(paket.nilai_kontrak)}</strong></div>
      <div>SP2D Netto: <strong class="cakra-mono" style="color:#fde047;">${cakraFmtRp(keuangan.nilaiBersihDiterimaPenyedia)}</strong></div>
    </div>
  `;
}

function renderCockpitLeftStepper() {
  const container = document.getElementById('cakra-cockpit-stepper-list');
  if (!container || !CakraState.activePaketCtx) return;

  const { tahaps } = CakraState.activePaketCtx;
  const tahapMap = {};
  (tahaps || []).forEach(t => { tahapMap[t.no_tahap] = t; });

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

  const pillsHtml = CakraState.definisi18Tahap.map(def => {
    const row = tahapMap[def.no] || {};
    const isBypass = row.status_tahap === 'Bypass';
    const isActive = Number(CakraState.activeStageNo) === Number(def.no);
    const cls = `cakra-stage-pill-btn ${isActive ? 'active' : ''} ${isBypass ? 'bypass' : ''}`;

    const isDone = row.status_tahap === 'Final' || (row.nomor_dokumen && row.nomor_dokumen.length > 3);
    const hasWarning = CakraState.activePaketCtx?.audit?.warnings?.some(w => w.tahap === def.no || (def.no === 7 && w.kode === 'HPS_GT_PAGU') || (def.no === 12 && w.kode === 'KONTRAK_GT_HPS'));
    let statusBadgeIcon = '';
    if (isBypass) statusBadgeIcon = '<span title="Dilewati Sesuai Regulasi (Bypass)" style="font-size:11px;margin-left:auto;">⏭️</span>';
    else if (hasWarning) statusBadgeIcon = '<span title="Peringatan Kepatuhan Regulasi" style="font-size:11px;margin-left:auto;color:#ef4444;">⚠️</span>';
    else if (isDone) statusBadgeIcon = '<span title="Tahap Selesai" style="font-size:11px;margin-left:auto;color:#10b981;">✅</span>';

    return `
      <button type="button" class="${cls}" onclick="selectCockpitStage(${def.no})" title="Tahap ${def.no}: ${cakraEsc(def.nama)} (${cakraEsc(row.nomor_dokumen || '-')})">
        <div class="cakra-stage-pill-num">${def.no}</div>
        <div class="cakra-stage-pill-text" style="flex:1;">
          <div style="display:flex;align-items:center;gap:4px;">
            <div class="cakra-stage-pill-title">${cakraEsc(def.nama)}</div>
            ${statusBadgeIcon}
          </div>
          <div class="cakra-stage-pill-date">${isBypass ? '⏭️ Bypass Regulasi' : `${cakraEsc(row.tanggal_dokumen || '-')} • ${cakraEsc(def.kode)}`}</div>
        </div>
      </button>
    `;
  }).join('');

  container.innerHTML = `${headersHtml}<div class="cakra-stage-pills-grid">${pillsHtml}</div>`;
}

function selectCockpitStage(stageNo) {
  CakraState.activeStageNo = Number(stageNo);
  renderCockpitLeftStepper();
  renderCockpitRightDock();
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

  if (CakraState.activeCockpitSubTab === 'form') {
    container.innerHTML = buildCockpitFormTabHtml();
  } else if (CakraState.activeCockpitSubTab === 'items') {
    container.innerHTML = buildCockpitItemsTabHtml();
  } else if (CakraState.activeCockpitSubTab === 'jadwal') {
    container.innerHTML = buildCockpitJadwalTabHtml();
  } else {
    container.innerHTML = buildCockpitPajakKinerjaTabHtml();
  }
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
          <label>Kode Akun MAK DIPA</label>
          <input type="text" class="cakra-form-control cakra-mono" id="cf_kode_akun_mak" value="${cakraEsc(paket.kode_akun_mak)}" />
        </div>
        <div class="cakra-form-group">
          <label>Nama Akun Belanja DIPA</label>
          <input type="text" class="cakra-form-control" id="cf_nama_akun_mak" value="${cakraEsc(paket.nama_akun_mak)}" />
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

async function saveCurrentPaketForm(e) {
  e.preventDefault();
  const { paket } = CakraState.activePaketCtx;
  const pphRaw = (document.getElementById('cf_jenis_pph_select')?.value || 'PPh 22 (1.5%)|1.5').split('|');

  const payload = {
    ...paket,
    kode_paket_internal: document.getElementById('cf_kode_paket_internal').value,
    kode_rup: document.getElementById('cf_kode_rup').value,
    pic_subbag: document.getElementById('cf_pic_subbag').value,
    nama_paket: document.getElementById('cf_nama_paket').value,
    uraian_pekerjaan: document.getElementById('cf_uraian_pekerjaan').value,
    jenis_pengadaan: document.getElementById('cf_jenis_pengadaan').value,
    cara_pengadaan: document.getElementById('cf_cara_pengadaan').value,
    metode_pemilihan: document.getElementById('cf_metode_pemilihan').value,
    bentuk_kontrak: document.getElementById('cf_bentuk_kontrak').value,
    jenis_kontrak: document.getElementById('cf_jenis_kontrak').value,
    jenis_kertas_harga: document.getElementById('cf_jenis_kertas_harga').value,
    kode_akun_mak: document.getElementById('cf_kode_akun_mak').value,
    nama_akun_mak: document.getElementById('cf_nama_akun_mak').value,
    nilai_pagu: Number(document.getElementById('cf_nilai_pagu').value || 0),
    penyedia_id: Number(document.getElementById('cf_penyedia_id').value || 1),
    tersedia_di_katalog: document.getElementById('cf_tersedia_di_katalog').value,
    prioritas_pdn_level: document.getElementById('cf_prioritas_pdn_level').value,
    alasan_penilaian_ppk_katalog: document.getElementById('cf_alasan_penilaian_ppk_katalog').value,
    masa_pelaksanaan_hari: Number(document.getElementById('cf_masa_pelaksanaan_hari').value || 14),
    tgl_mulai_kerja: document.getElementById('cf_tgl_mulai_kerja').value,
    tgl_selesai_kontrak: document.getElementById('cf_tgl_selesai_kontrak').value,
    jenis_pph: pphRaw[0],
    tarif_pph: Number(pphRaw[1] || 1.5),
    persen_uang_muka: Number(document.getElementById('cf_persen_uang_muka').value || 0),
    status_paket: document.getElementById('cf_status_paket').value
  };

  await cakraApiPost('/api/cakra/paket', payload);
  await initCakraApp();
  await openPaketInCockpit(paket.id, CakraState.activeStageNo, false);
  cakraNotify('Data paket pengadaan berhasil disimpan.', 'success');
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
function renderCockpitRightDock() {
  const dock = document.getElementById('cakra-cockpit-dock-right');
  if (!dock || !CakraState.activePaketCtx) return;

  const { paket, tahaps } = CakraState.activePaketCtx;
  const stageNo = CakraState.activeStageNo || 6;
  const def = CakraState.definisi18Tahap.find(d => d.no === stageNo) || CakraState.definisi18Tahap[0] || { no: 6, nama: 'Tahap 6' };
  const tRow = (tahaps || []).find(t => Number(t.no_tahap) === stageNo) || {};

  dock.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
      <span class="cakra-badge cakra-badge-blue" style="font-size:12px; padding:5px 10px;">📌 TAHAP AKTIF: ${stageNo} / 18</span>
      <div>
        <div style="font-weight:800; font-size:13.5px; color:#0f172a;">${cakraEsc(def.nama)}</div>
        <div style="font-size:11.5px; color:#475569;">
          Nomor Surat/BA: <strong class="cakra-mono">${cakraEsc(tRow.nomor_dokumen || '-')}</strong> &nbsp;|&nbsp;
          Tanggal: <strong class="cakra-mono">${cakraEsc(tRow.tanggal_dokumen || '-')}</strong> &nbsp;|&nbsp;
          Status: <strong>${cakraEsc(tRow.status_tahap || 'Selesai')}</strong>
        </div>
      </div>
    </div>

    <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
      <button type="button" class="cakra-btn cakra-btn-info cakra-btn-sm" onclick="queuePengadaanDownload('docx', ${paket.id}, '${stageNo}')" title="Kirim Naskah Word Tahap ${stageNo} ke Monitoring Unduhan">
        📄 Word Tahap ${stageNo} (.docx)
      </button>
      <button type="button" class="cakra-btn cakra-btn-success cakra-btn-sm" onclick="queuePengadaanDownload('xlsx', ${paket.id}, '${stageNo}')" title="Kirim Kertas Kerja Excel Tahap ${stageNo} ke Monitoring Unduhan">
        📊 Excel Tahap ${stageNo} (.xlsx)
      </button>
      <span style="color:#cbd5e1;">|</span>
      <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" onclick="queuePengadaanDownload('docx', ${paket.id}, '13')" title="Kirim Kontrak / SPK / Surat Pesanan Final (Tahap 13) ke Monitoring Unduhan">
        📝 Naskah ${cakraEsc(paket.bentuk_kontrak)} (T13)
      </button>
      <button type="button" class="cakra-btn cakra-btn-outline cakra-btn-sm" onclick="queuePengadaanDownload('docx', ${paket.id}, '16')" title="Kirim BAPHP & BAST / PHO-FHO (Tahap 16) ke Monitoring Unduhan">
        🤝 BAST / PHO (T16)
      </button>
      <button type="button" class="cakra-btn cakra-btn-primary cakra-btn-sm" onclick="queuePengadaanDownload('docx', ${paket.id}, 'ALL')" title="Kirim Gabungan 18 Tahap dalam 1 File Word ke Monitoring Unduhan">
        📘 Word Master 18 Tahap
      </button>
      <button type="button" class="cakra-btn cakra-btn-warning cakra-btn-sm" style="color:#0f172a; font-weight:800;" onclick="queuePengadaanDownload('zip', ${paket.id}, 'ALL')" title="Kirim Bundel Arsip Lengkap 18 Tahap (.ZIP) ke Monitoring Unduhan">
        📦 Unduh Arsip Lengkap (.ZIP)
      </button>
    </div>
  `;
}

/**
 * BUAT PAKET PENGADAAN BARU
 */
async function createNewPaketPrompt(initialData = null) {
  let nama, jenis, pagu, metode, bentuk;
  if (initialData) {
    nama = initialData.nama || initialData.nama_paket || 'Paket Pengadaan ' + (initialData.jenis_pengadaan || 'Barang');
    jenis = initialData.jenis_pengadaan || 'Barang';
    pagu = Number(initialData.pagu || initialData.nilai_pagu || 50000000);
    metode = initialData.metode_pemilihan;
    bentuk = initialData.bentuk_kontrak;
  } else {
    nama = prompt('Masukkan Nama Paket Pengadaan Baru (Barang / Jasa / Konstruksi / Swakelola):', 'Pekerjaan Konstruksi Pemeliharaan Gedung & Penataan Halaman Kantor KPU Kabupaten Ngawi');
    if (!nama) return;
    jenis = prompt(
      'Pilih Jenis Pengadaan:\n1. Barang\n2. Jasa Lainnya\n3. Jasa Konsultansi Nonkonstruksi\n4. Pekerjaan Konstruksi\n5. Jasa Konsultansi Konstruksi\n6. Swakelola\n7. Dikecualikan',
      'Pekerjaan Konstruksi'
    ) || 'Barang';
    pagu = Number(prompt('Masukkan Nilai Pagu Anggaran DIPA (Rp):', '185000000') || 50000000);
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
      3. <strong>Perlem LKPP Nomor 3 Tahun 2026 (Lampiran I, II, & III)</strong>: Pedoman Barang, Jasa Lainnya, Konsultansi Nonkonstruksi, <strong>Pekerjaan Konstruksi (DED, AHSP, RKK/SMKK, SBU K1/K2/K3, SKP = KP-P, Kontrak Kritis SCM Periode I 10% / Periode II 5%, PHO, Masa Pemeliharaan 6/3 Bulan, Retensi 5%, FHO, PPh Final Konstruksi 1,75% / 2,65% / 3,5%)</strong>, Jasa Konsultansi Konstruksi, dan Konstruksi Terintegrasi Rancang Bangun.
    </div>
    <div class="cakra-form-grid-3">${cardsHtml}</div>
  `;
}

/**
 * VIEW 5: REKAP PENGADAAN BARANG/JASA (5 PERSPEKTIF EKSEKUTIF)
 */
function switchRekapPengadaanTab(tabName) {
  CakraState.activeRekapTab = tabName || 'EKSEKUTIF';
  const tabs = document.querySelectorAll('#rekap-pengadaan-tabs button[data-tab]');
  tabs.forEach(btn => {
    const isAct = btn.getAttribute('data-tab') === CakraState.activeRekapTab;
    btn.className = isAct ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary';
  });
  renderRekapPengadaanView();
}

function getFilteredRekapPakets() {
  const picFilter = document.getElementById('rekap-pengadaan-filter-pic')?.value || 'ALL';
  const all = Array.isArray(CakraState.pakets) ? CakraState.pakets : [];
  if (picFilter === 'ALL') return all;
  return all.filter(p => String(p.pic_subbag || '').toUpperCase() === picFilter);
}

function renderRekapPengadaanView() {
  const kpiGrid = document.getElementById('rekap-pengadaan-kpi-grid');
  const container = document.getElementById('rekap-pengadaan-table-container');
  if (!kpiGrid || !container) return;

  const pakets = getFilteredRekapPakets();
  const totalPaket = pakets.length;
  const totalPagu = pakets.reduce((s, p) => s + (Number(p.nilai_pagu) || 0), 0);
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

  const selesaiCount = pakets.filter(p => Number(p.tahap_aktif) >= 16 || String(p.status_paket || '').toUpperCase().includes('SELESAI')).length;

  kpiGrid.innerHTML = `
    <div class="cakra-kpi-card">
      <div class="cakra-kpi-label">Total Paket &amp; Pagu Pengadaan</div>
      <div class="cakra-kpi-value">${totalPaket} Paket</div>
      <div class="cakra-kpi-sub">Total Pagu RUP/DIPA: <strong>${cakraFmtRp(totalPagu)}</strong></div>
    </div>
    <div class="cakra-kpi-card amber">
      <div class="cakra-kpi-label">Realisasi Kontrak &amp; Efisiensi</div>
      <div class="cakra-kpi-value">${cakraFmtRp(totalKontrak)}</div>
      <div class="cakra-kpi-sub">Efisiensi Pagu: <strong style="color:#047857;">${cakraFmtRp(totalEfisiensi)} (${persenEfisiensi}%)</strong></div>
    </div>
    <div class="cakra-kpi-card green">
      <div class="cakra-kpi-label">Pemenuhan UMK-Koperasi &amp; PDN</div>
      <div class="cakra-kpi-value">${persenUmk}% UMK | ${rataTkdn}% TKDN</div>
      <div class="cakra-kpi-sub">Pasal 65 &amp; 66 Perpres 46/2025 (${umkPakets.length} Paket UMK)</div>
    </div>
    <div class="cakra-kpi-card blue">
      <div class="cakra-kpi-label">Penyelesaian BAST &amp; Arsip 18 Tahap</div>
      <div class="cakra-kpi-value">${selesaiCount} / ${totalPaket} Paket</div>
      <div class="cakra-kpi-sub">Siap Masuk Tahap Pembayaran (SPP/SPM/SP2D)</div>
    </div>
  `;

  const tab = CakraState.activeRekapTab || 'EKSEKUTIF';

  if (tab === 'EKSEKUTIF') {
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
      { code: 'KUL', name: 'Subbag Keuangan, Umum & Logistik (KUL)' },
      { code: 'TEKMAS', name: 'Subbag Teknis Penyelenggaraan & Parhupmas (TEKMAS)' },
      { code: 'RENDATIN', name: 'Subbag Perencanaan, Data & Informasi (RENDATIN)' },
      { code: 'HUKUM_SDM', name: 'Subbag Hukum & Sumber Daya Manusia (HUKUM & SDM)' }
    ];
    const rowsHtml = subbags.map((sb, idx) => {
      const items = (CakraState.pakets || []).filter(p => String(p.pic_subbag || '').toUpperCase() === sb.code);
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
  const filterSubbag = document.getElementById('rekap-pengadaan-filter-subbag')?.value || 'ALL';
  const filterMetode = document.getElementById('rekap-pengadaan-filter-metode')?.value || 'ALL';
  const picLabel = filterSubbag === 'ALL' ? 'SEMUA' : filterSubbag;
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
  const filterSubbag = document.getElementById('rekap-pengadaan-filter-subbag')?.value || 'ALL';
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
