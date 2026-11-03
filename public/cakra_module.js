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
  siprabuRkbItems: [],
  rkbDrawerOpen: false
};

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

    const sbBadge = document.getElementById('badge-pengadaan-paket');
    if (sbBadge) sbBadge.textContent = CakraState.pakets.length;

    if (CakraState.pakets.length > 0 && !CakraState.activePaketId) {
      CakraState.activePaketId = CakraState.pakets[0].id;
    }
  } catch (err) {
    console.error('[PENGADAAN INIT ERROR]', err);
  }
}

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
  }

  if (viewId === 'view-pengadaan-kokpit') {
    const targetId = CakraState.activePaketId || (CakraState.pakets[0] && CakraState.pakets[0].id);
    if (targetId) {
      await openPaketInCockpit(targetId, CakraState.activeStageNo || 6, false);
    }
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
              <a href="/api/cakra/download/docx/${p.id}?tahap=ALL" class="cakra-btn cakra-btn-info cakra-btn-sm" style="flex:1;" title="Download Word 18 Tahap">📄 Word</a>
              <a href="/api/cakra/download/xlsx/${p.id}?tahap=ALL" class="cakra-btn cakra-btn-success cakra-btn-sm" style="flex:1;" title="Download Excel Kertas Kerja">📊 Excel</a>
              <a href="/api/cakra/download/zip/${p.id}" class="cakra-btn cakra-btn-warning cakra-btn-sm" style="flex:1;" title="Download Bundel Arsip ZIP">📦 ZIP</a>
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
    const ctx = await cakraApiGet(`/api/cakra/paket/${CakraState.activePaketId}`);
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

    return `
      <button type="button" class="${cls}" onclick="selectCockpitStage(${def.no})" title="Tahap ${def.no}: ${cakraEsc(def.nama)} (${cakraEsc(row.nomor_dokumen || '-')})">
        <div class="cakra-stage-pill-num">${def.no}</div>
        <div class="cakra-stage-pill-text">
          <div class="cakra-stage-pill-title">${cakraEsc(def.nama)}</div>
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

  return `
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
      <a href="/api/cakra/download/docx/${paket.id}?tahap=${stageNo}" class="cakra-btn cakra-btn-info cakra-btn-sm" title="Cetak Naskah Word Tahap ${stageNo}">
        📄 Word Tahap ${stageNo} (.docx)
      </a>
      <a href="/api/cakra/download/xlsx/${paket.id}?tahap=${stageNo}" class="cakra-btn cakra-btn-success cakra-btn-sm" title="Cetak Kertas Kerja Excel Tahap ${stageNo}">
        📊 Excel Tahap ${stageNo} (.xlsx)
      </a>
      <span style="color:#cbd5e1;">|</span>
      <a href="/api/cakra/download/docx/${paket.id}?tahap=13" class="cakra-btn cakra-btn-outline cakra-btn-sm" title="Pintasan Cetak Kontrak / SPK / Surat Pesanan Final">
        📝 Naskah ${cakraEsc(paket.bentuk_kontrak)} (T13)
      </a>
      <a href="/api/cakra/download/docx/${paket.id}?tahap=16" class="cakra-btn cakra-btn-outline cakra-btn-sm" title="Pintasan Cetak BAPHP & BAST / PHO-FHO">
        🤝 BAST / PHO (T16)
      </a>
      <a href="/api/cakra/download/docx/${paket.id}?tahap=ALL" class="cakra-btn cakra-btn-primary cakra-btn-sm" title="Unduh Gabungan 18 Tahap dalam 1 File Word">
        📘 Word Master 18 Tahap
      </a>
      <a href="/api/cakra/download/zip/${paket.id}" class="cakra-btn cakra-btn-warning cakra-btn-sm" style="color:#0f172a; font-weight:800;" title="Unduh Bundel Arsip Lengkap 18 Tahap (.ZIP)">
        📦 Unduh Arsip Lengkap (.ZIP)
      </a>
    </div>
  `;
}

/**
 * BUAT PAKET PENGADAAN BARU
 */
async function createNewPaketPrompt() {
  const nama = prompt('Masukkan Nama Paket Pengadaan Baru (Barang / Jasa / Konstruksi / Swakelola):', 'Pekerjaan Konstruksi Pemeliharaan Gedung & Penataan Halaman Kantor KPU Kabupaten Ngawi');
  if (!nama) return;
  const jenis = prompt(
    'Pilih Jenis Pengadaan:\n1. Barang\n2. Jasa Lainnya\n3. Jasa Konsultansi Nonkonstruksi\n4. Pekerjaan Konstruksi\n5. Jasa Konsultansi Konstruksi\n6. Swakelola\n7. Dikecualikan',
    'Pekerjaan Konstruksi'
  ) || 'Barang';
  const pagu = Number(prompt('Masukkan Nilai Pagu Anggaran DIPA (Rp):', '185000000') || 50000000);

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
    metode_pemilihan: isKonstruksi && pagu <= 400000000 ? 'Pengadaan Langsung' : 'E-Purchasing',
    bentuk_kontrak: isKonstruksi && pagu <= 400000000 ? 'SPK' : 'Surat Pesanan',
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
 * VIEW 3: DIREKTORI PENYEDIA & PEJABAT PENGADAAN
 */
function renderMasterView() {
  const tbPenyedia = document.getElementById('cakra-table-master-penyedia');
  if (tbPenyedia) {
    tbPenyedia.innerHTML = CakraState.penyedias.map(v => `
      <tr>
        <td>
          <div style="font-weight:700;">${cakraEsc(v.nama_perusahaan)}</div>
          <span class="cakra-badge cakra-badge-blue">${cakraEsc(v.kualifikasi_usaha)}</span>
          <div style="font-size:10.5px; color:#64748b; margin-top:2px;">${cakraEsc(v.kbli)}</div>
        </td>
        <td>
          <div style="font-weight:700;">${cakraEsc(v.nama_direktur)} (${cakraEsc(v.jabatan_penandatangan)})</div>
          <div class="cakra-mono" style="font-size:11px;">NPWP: ${cakraEsc(v.npwp)}</div>
          <div style="font-size:10.5px; color:#475569;">${cakraEsc(v.nama_bank)}: ${cakraEsc(v.no_rekening)}</div>
        </td>
        <td>
          <div style="font-weight:700;">${cakraEsc(v.bo_nama_pemilik_manfaat)}</div>
          <div style="font-size:10.5px; color:#047857;">${cakraEsc(v.bo_hubungan)}</div>
        </td>
        <td>
          <span class="cakra-badge cakra-badge-green">${Number(v.skor_kinerja_terakhir).toFixed(2)} — ${cakraEsc(v.kategori_kinerja)}</span>
        </td>
      </tr>
    `).join('');
  }

  const tbPejabat = document.getElementById('cakra-table-master-pejabat');
  if (tbPejabat) {
    tbPejabat.innerHTML = CakraState.pejabats.map(p => `
      <tr>
        <td><span class="cakra-badge cakra-badge-amber">${cakraEsc(p.peran)}</span></td>
        <td>
          <div style="font-weight:700;">${cakraEsc(p.nama_lengkap)}</div>
          <div class="cakra-mono" style="font-size:11px;">NIP. ${cakraEsc(p.nip)}</div>
          <div style="font-size:10.5px; color:#64748b;">${cakraEsc(p.jabatan_struktural)}</div>
        </td>
        <td>
          <div class="cakra-mono" style="font-size:11px;">${cakraEsc(p.no_sk)}</div>
          <div style="font-size:10.5px; color:#1d4ed8;">Sertifikat PBJ: ${cakraEsc(p.no_sertifikat_pbj)}</div>
        </td>
      </tr>
    `).join('');
  }
}

async function openAddPenyediaModal() {
  const nama = prompt('Nama Perusahaan / Penyedia Baru (PT / CV / UD):', 'CV. NGAWI KONSTRUKSI JAYA');
  if (!nama) return;
  const direktur = prompt('Nama Direktur / Penandatangan Kontrak:', 'IR. BAMBANG HERMANTO');
  const kualifikasi = prompt('Kualifikasi Usaha (Usaha Mikro / Usaha Kecil / Usaha Kecil (SBU K1) / Non-Kecil):', 'Usaha Kecil (SBU K1)');
  const npwp = prompt('Nomor NPWP Penyedia:', '02.445.991.8-646.000');

  await cakraApiPost('/api/cakra/penyedia', {
    nama_perusahaan: nama,
    bentuk_usaha: nama.startsWith('PT') ? 'PT' : 'CV',
    kualifikasi_usaha: kualifikasi || 'Usaha Kecil',
    npwp: npwp || '-',
    nama_direktur: direktur || '-',
    bo_nama_pemilik_manfaat: direktur || '-'
  });
  await initCakraApp();
  cakraNotify(`Penyedia "${nama}" berhasil ditambahkan ke direktori.`, 'success');
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

// Ekspos ke global window untuk pemanggilan dari atribut onclick & switchView SI-PRABU
window.initCakraApp = initCakraApp;
window.onEnterPengadaanView = onEnterPengadaanView;
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

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(initCakraApp, 350);
});
