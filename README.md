# SIPRABU — Sistem Informasi Perencanaan & Penganggaran RKB
### Komisi Pemilihan Umum (KPU) Kabupaten Ngawi

SIPRABU (**Sistem Informasi Perencanaan Anggaran dan Biaya Terpadu**) adalah platform tata kelola penyusunan, revisi, pemantauan, dan pertanggungjawaban Rencana Kebutuhan Biaya (RKB) Dana Hibah Pemilihan Kepala Daerah (Pilkada) dan Pemilu berbasis *Single Source of Truth* (SSOT).

Aplikasi ini dirancang dengan antarmuka modern yang mengadopsi struktur navigasi lipat hierarkis ala **SAKTI Kemenkeu**, sistem antrean unduhan dokumen asinkron, serta kalkulasi otomatis anggaran belanja riil berjenjang dari tingkat Satker Kabupaten hingga Badan Adhoc (PPK, PPS, dan TPS).

---

## 🌟 Fitur Utama Sistem

1. **Pusat Siklus & Revisi Anggaran**:
   - Pengelolaan versi dokumen anggaran mulai dari RKB Induk, Berita Acara TAPD, hingga revisi berjenjang.
   - Pelacakan histori perubahan anggaran (*Audit Trail*), legalitas penandatanganan, dan perbandingan perubahan kuantitas dan nominal secara *real-time*.

2. **RUH Belanja RKB (Rencana Anggaran Biaya)**:
   - Penyusunan anggaran interaktif berbasis kode tahapan, komponen output, jenis belanja, dan bagan akun standar (BAS 521211, 521213, 521219, dll.).
   - Visualisasi pembagian 5 Subbagian (*Rendatin, Teknis, Parmas/SDM, Hukum, Keuangan & Logistik*).
   - Ekspor laporan berformat resmi KPU ke Microsoft Excel (`.xlsx`) dan paket bundel ZIP per subbagian.

3. **Modul Referensi SSOT (Single Source of Truth)**:
   - **Parameter & Kuantitas SSOT**: Pusat koefisien terintegrasi mencakup wilayah (19 Kecamatan, 217 Desa/Kelurahan, 1.374 TPS), 701.425 Pemilih DPT, 5 Pasangan Calon, dan ribuan personel badan adhoc KPPS & Linmas.
   - **Standar Biaya Masukan (SBM & SBML)**: Katalog tarif satuan honorarium dan uang harian resmi berdasarkan PMK Kemenkeu dan Keputusan KPU RI, dilengkapi fitur unduh template dan impor massal Excel.
   - **Bagan Akun Standar (BAS)**: Referensi 6-digit klasifikasi belanja negara.

4. **Basis Data Primer (Master Database)**:
   - Master Kecamatan (19 PPK).
   - Master Desa/Kelurahan & TPS (217 PPS).
   - Master Pasangan Calon (5 Paslon: 4 Parpol + 1 Jalur Perseorangan).
   - Pengaturan Satker KPU (KPA, PPK, Pejabat Penandatangan, Kop Dokumen).

5. **Monitoring Unduhan (SAKTI Style)**:
   - Antrean pemrosesan unduhan dokumen laporan di latar belakang (*background processing*) dengan penghapusan otomatis file temporer setelah 1 jam demi efisiensi penyimpanan server.

6. **Panduan & Dasar Hukum**:
   - Modul regulasi terpadu (UU Pemilihan, PKPU, Keputusan KPU RI, Juknis Pengelolaan Dana Hibah).

---

## 🛠️ Arsitektur & Teknologi

- **Runtime**: [Node.js](https://nodejs.org/) versi `>= 22.0.0`
- **Database Engine**: Driver bawaan `node:sqlite` (`DatabaseSync`) dengan arsitektur WAL (*Write-Ahead Logging*) yang cepat dan bebas kompilasi C++ biner.
- **Frontend**: HTML5, CSS3 kustom (SAKTI Design System), Vanilla ES6 JavaScript (Single Page Architecture).
- **Pengolah Spreadsheet**: [ExcelJS](https://github.com/exceljs/exceljs) & [SheetJS (xlsx)](https://sheetjs.com/).

---

## 🚀 Panduan Instalasi Lokal

### 1. Prasyarat
Pastikan komputer Anda telah terpasang **Node.js versi 22.0.0 atau lebih baru**:
```bash
node -v   # Harus v22.x.x atau v24.x.x
git -v
```

### 2. Kloning Repository & Jalankan
```bash
# Clone repository
git clone https://github.com/jihanandro/siprabu.git
cd siprabu

# Pasang dependensi
npm install

# Jalankan server
npm start
```
Buka peramban (browser) dan akses:  
👉 `http://localhost:3456`

---

## ☁️ Panduan Deployment di Hostinger

Hostinger menyediakan dua opsi utama: **Hostinger VPS** (paling direkomendasikan untuk Node.js v22+) dan **Hostinger Web Hosting (Cloud/Business dengan hPanel Node.js)**.

### Opsi A: Deployment di Hostinger VPS (Direkomendasikan)

1. **Akses VPS via SSH**:
   ```bash
   ssh root@<IP_VPS_ANDA>
   ```

2. **Pasang Node.js 22 LTS (via NodeSource)**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt-get install -y nodejs git
   node -v   # Memastikan Node.js v22 terpasang
   ```

3. **Kloning Proyek & Pasang Dependensi**:
   ```bash
   cd /var/www
   git clone https://github.com/jihanandro/siprabu.git
   cd siprabu
   npm install
   ```

4. **Jalankan Aplikasi dengan PM2 (Process Manager)**:
   ```bash
   npm install -g pm2
   pm2 start server.js --name siprabu
   pm2 save
   pm2 startup
   ```

5. **Konfigurasi Reverse Proxy Nginx (Opsional / Domain)**:
   Arahkan domain atau subdomain Anda ke port lokal `3456`:
   ```nginx
   server {
       listen 80;
       server_name siprabu.domainanda.com;

       location / {
           proxy_pass http://localhost:3456;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

### Opsi B: Deployment di Hostinger hPanel (Cloud / Business Hosting)

1. Masuk ke **hPanel Hostinger** ➔ Buka menu **Git**.
2. Masukkan URL Repository: `https://github.com/jihanandro/siprabu.git` dengan Branch `main`.
3. Masuk ke menu **Node.js** di hPanel:
   - **Node.js Version**: Pilih versi **22.x** (versi tertinggi yang tersedia).
   - **Application Root**: Masukkan folder clone siprabu.
   - **Application Startup File**: Masukkan `server.js`.
4. Klik **Install NPM Packages** untuk menginstal dependensi.
5. Klik **Run / Start** untuk mengaktifkan aplikasi.

---

## 👤 Akun Pengembang & Satker

- **Satker Pengguna**: Komisi Pemilihan Umum (KPU) Kabupaten Ngawi
- **Lead Developer & System Architect**: `emenje` (`emenje@kpu-ngawi.go.id`)
- **Tahun Anggaran**: 2024 / 2029

---
*© 2026 KPU Kabupaten Ngawi — Seluruh Hak Cipta Dilindungi Undang-Undang.*
