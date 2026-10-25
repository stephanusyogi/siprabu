# SI-PRABU — Sistem Perencanaan dan Belanja Terpadu
### Komisi Pemilihan Umum (KPU) Kabupaten Ngawi

**SI-PRABU** (**Sistem Perencanaan dan Belanja Terpadu**) adalah platform tata kelola penyusunan, revisi, pemantauan, dan pertanggungjawaban Rencana Kebutuhan Biaya (RKB) Dana Hibah Pemilihan Kepala Daerah (Pilkada) dan Pemilu berbasis *Single Source of Truth* (SSOT).

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
- **Kompresi & Arsip**: [Archiver](https://github.com/archiverjs/node-archiver) (ZIP per-subbag streaming).
- **Keamanan Kriptografi**: Node.js `node:crypto` (`scrypt` password hashing, timing-safe equality, dynamic session signing key, in-memory rate limiting).

---

## 🔒 Keamanan & Tata Kelola Hak Akses (RBAC)

SIPRABU menerapkan arsitektur keamanan bertingkat yang ketat:
1. **Penyimpanan Kredensial Berstandar Industri (`scrypt`)**:
   - Seluruh password di-hash secara aman menggunakan algoritma `scrypt` dengan salt acak 16 byte.
   - Migrasi transparan dari hash lama saat pengguna login tanpa mereset akun secara diam-diam.
   - Papan konfigurasi/log disaring otomatis (`sanitizeLogData`) agar tidak membocorkan password atau token.
2. **Kunci Penandatangan Sesi Dinamis**:
   - Token sesi ditandatangani menggunakan `SESSION_SECRET` (dapat disetel melalui *environment variable* atau di-generate otomatis ke berkas dengan izin akses terbatas `0o600`).
3. **Pencabutan Sesi Seketika (*Instant Session Invalidation*)**:
   - Setiap token JWT terikat pada `token_version` dan status `is_active` pengguna.
   - Perubahan status akun, penggantian password, atau pergantian hak akses otomatis menaikkan `token_version` dan membatalkan seluruh token lama seketika.
4. **Isolasi Subbagian & Validasi Kepemilikan (*Zero Trust Backend*)**:
   - Backend memvalidasi kepemilikan baris berdasarkan rekaman database yang tersimpan, bukan PIC yang dikirim dari browser.
   - Operator (Level 2) terisolasi ketat hanya pada subbagiannya (KUL, RENDATIN, TEKNIS, HUKUM, PARSDM). Operator dilarang mengedit, menghapus, atau memindahkan baris milik subbagian lain.
   - Baris Header dilindungi secara ketat dan tidak dapat dihapus jika masih memiliki baris rincian di bawahnya.
5. **Mitigasi *Brute-Force***:
   - Pembatasan frekuensi login (*rate limiter*) otomatis memblokir IP setelah 5 kali kegagalan berturut-turut selama jendela waktu 15 menit.

---

## 💾 Pencadangan Basis Data & Integritas (*WAL Checkpoint*)

SIPRABU dilengkapi modul pencadangan SQLite atomik yang memastikan data konsisten:
- **Pencadangan Manual**:
  ```bash
  npm run backup
  # atau dengan label kustom:
  node scripts/backup.js pra_pleno_2026
  ```
- **Melihat Daftar Riwayat Backup**:
  ```bash
  node scripts/backup.js --list
  ```
- Setiap proses backup mengeksekusi `PRAGMA wal_checkpoint(TRUNCATE)` untuk memastikan seluruh transaksi WAL tertulis ke berkas utama, diikuti dengan verifikasi `PRAGMA integrity_check === 'ok'`.

---

## 🔑 Pemulihan & Penetapan Password Administrator

Jika akses admin/pengembang (`emenje`) perlu dipulihkan secara aman:
```bash
# Menghasilkan password acak berkekuatan tinggi secara otomatis:
npm run reset-admin -- --generate

# Atau menetapkan password tertentu secara langsung:
ADMIN_RESET_PASSWORD="PasswordKpuBaru2026!" npm run reset-admin
```

---

## 🧪 Pengujian Otomatis (*Automated Test Suite*)

SIPRABU menyediakan rangkaian uji komprehensif yang berjalan pada database terisolasi (`data/test_hibah_kpu.sqlite`), sehingga database produksi tetap terlindungi 100%:
```bash
npm test
```
Rangkaian uji mencakup 42 skenario:
- **Kelompok 1**: Konsistensi Backup SQLite & Integrity Check.
- **Kelompok 2**: Kriptografi Scrypt, Timing-Safe Verifier, Dynamic Secret, Session Revocation, Role Coherence.
- **Kelompok 3**: Isolasi Subbagian Operator, Validasi Periode Terkunci, Proteksi Header RKB.
- **Kelompok 4**: Parser Angka Indonesia/Internasional, Kalkulasi Faktor 0 Presisi, Multiplier `KOTAK_RKB`, Dynamic Balance NPHD.
- **Kelompok 5**: *Snapshot Immutability* pada Dokumen Terkunci.
- **Kelompok 6**: Alur Pengesahan 4 Tahap Berurutan, Pencegahan Pelompatan Tahap, Format Kode Revisi SAKTI Bebas Bentrok.
- **Kelompok 7**: Transaksional Impor Excel & Mode Pratinjau (*Preview Only*).
- **Kelompok 8**: *Audit Trail Logging*.
- **Kelompok 9**: Ekspor Excel RUH per-subbag & Normalisasi Angka Desimal.
- **Kelompok 10**: Verifikasi Integritas & Isolasi Database Produksi.

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
git clone https://github.com/stephanusyogi/siprabu.git
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
   git clone https://github.com/stephanusyogi/siprabu.git
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
2. Masukkan URL Repository: `https://github.com/stephanusyogi/siprabu.git` dengan Branch `main`.
3. Masuk ke menu **Node.js** di hPanel:
   - **Node.js Version**: Pilih versi **22.x** (versi tertinggi yang tersedia).
   - **Application Root**: Masukkan folder clone siprabu.
   - **Application Startup File**: Masukkan `server.js`.
4. Klik **Install NPM Packages** untuk menginstal dependensi.
5. Klik **Run / Start** untuk mengaktifkan aplikasi.

---

## 👤 Informasi Pengembang & Kolaborator Sistem

- **Lead Developer & System Architect**: **emenje** ([Hubungi via Telegram: 085228699640](https://t.me/+6285228699640))
- **Core Contributor & Technical Reviewer**: **[@stephanusyogi](https://github.com/stephanusyogi)**
- **Satker Pengguna**: Komisi Pemilihan Umum (KPU) Kabupaten Ngawi
- **Tahun Anggaran**: 2024 / 2029

---
*© 2026 SIPRABU — Platform Tata Kelola Anggaran & RKB Hibah Pilkada.*
