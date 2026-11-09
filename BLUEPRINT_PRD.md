# 🏛️ BLUEPRINT & PRD INDUK
## SI-PRABU | Sistem Perencanaan dan Belanja Terpadu
### CANON MASTER PENGEMBANGAN SISTEM

- **Tata Kelola 2 Kontributor Utama:**
  1. **`emenje`:** Pengembang Utama & Perancang Sistem Kerja (*System Architect & Business Logic Lead* — fokus pada alur perencanaan anggaran, pembagian tugas PIC subbagian, validasi bertingkat, penyesuaian regulasi Pilkada, dan antarmuka pengguna).
  2. **`Stephanus Yogi`:** Administrator Basis Data (*Database Administrator* — fokus pada integritas skema database, pemeliharaan tabel, dan server MySQL phpMyAdmin Hostinger).
- **Repositori Resmi:** https://github.com/stephanusyogi/siprabu (Branch: `main`)
- **Basis Data Sah Terpusat (Production SSOT):** MySQL / MariaDB via phpMyAdmin Hostinger (`siprabu_db`)
- **Status Dokumen:** Dokumen Induk Tunggal (Single Source of Truth / SSOT) • 27 Oktober 2026 • Kompilasi Kesepakatan Konseptual & Implementasi Terverifikasi
- **Protokol Kerja Terpadu (Zero-Friction Workflow):**
  1. Setiap awal sesi pengembangan, sistem dan asisten AI otomatis melakukan sinkronisasi dengan database phpMyAdmin dan memvalidasi integritas sebelum memulai pekerjaan baru.
  2. Pengembang (`emenje`) berfokus penuh pada penyempurnaan sistem kerja dan alur bisnis anggaran tanpa dibebani perintah teknis database manual.
  3. Setiap deploy fitur baru ke hosting dijamin aman dan tidak akan mereset data operasional di phpMyAdmin.

> Dokumen ini merangkum keputusan Pengembang (`emenje`) dan AI. Ketentuan yang belum disepakati tidak boleh dianggap sebagai izin implementasi atau perubahan aturan bisnis.

---

## DAFTAR KESEPAKATAN ARSITEKTUR & ATURAN SISTEM

### [KESEPAKATAN-01] Visi, Ruang Lingkup & Fondasi Arsitektur 3 Tahap Siklus SI-PRABU
- **Definisi Aplikasi:** **SI-PRABU** (*Sistem Perencanaan dan Belanja Terpadu*) adalah aplikasi terintegrasi yang dirancang untuk mengelola **Perencanaan**, **Pengadaan**, dan **Pembayaran** Anggaran **Pilkada Serentak** secara utuh dari hulu ke hilir (*Single Source of Truth*).
- **Pola Arsitektur Navigasi Berdasarkan Siklus Tahapan Pekerjaan (3 Pilar Utama):**
  1. **Tahap 1 — 📁 PERENCANAAN (Hulu):** Mencakup penyusunan `RUH Belanja RKB`, `Pengajuan Usulan Revisi`, `Validasi Revisi`, `Pengesahan BA Pleno (Tahap 4)`, `Monitoring Revisi (4 Tahap)`, `Rekap Perencanaan`, `Standar 28 Kegiatan (KPT 543)`, dan `📘 Panduan Perencanaan`.
  2. **Tahap 2 — 📁 PENGADAAN (Tengah — `pengadaan.js`):** Mencakup `Daftar Paket Pengadaan`, `Kokpit 18 Tahap`, `Rekap Pengadaan` (5 Tab Komprehensif: Ringkasan Eksekutif, Progres 18 Tahap, Metode & Jenis PBJ, Per Subbagian & PPK, serta PDN/TKDN/UMK & Efisiensi), dan `📘 Panduan Pengadaan`.
  3. **Tahap 3 — 📁 PEMBAYARAN (Hilir — Bendahara & Pertanggungjawaban):** Mencakup `Rekap Pembayaran` (berbasis Pagu Baseline Sah) dan `💳 Panduan Pembayaran`.
- **Menu Pendukung & Fondasi Rujukan Lintas Modul:**
  - **📊 BERANDA:** Papan Kendali Eksekutif yang merangkum **Rekap Besar 3 Modul Sekaligus** (`1. Rekap Perencanaan (RKB)`, `2. Rekap Pengadaan (18 Tahap)`, `3. Rekap Pembayaran (Baseline Sah)`) beserta **Matriks Konsolidasi Hulu-ke-Hilir 3 Modul Per Subbagian**.
  - **📚 DOKUMEN ANGGARAN (`view-siklus`):** Menu Besar Mandiri (*Top-Level Menu*) tepat di bawah Beranda yang mengelola siklus hidup dan versi dokumen anggaran lintas modul — menentukan **Dokumen Siklus Aktif** bagi *Perencanaan* serta **Dokumen Terkunci Terbaru (Baseline Sah)** bagi *Pengadaan* dan *Pembayaran*, lengkap dengan tautan bukti fisik Google Drive (BA Pleno, RKB Final, KAK Gabungan).
  - **📁 REFERENSI:** Rujukan master data murni lintas modul (`Parameter & Kuantitas SSOT`, `Standar Biaya Masukan (SBM)`, `Bagan Akun Standar (BAS)`) yang dipakai bersama oleh Perencanaan, Pengadaan, dan Pembayaran.
  - **📁 DATABASE:** Data entitas master eksternal (`Master Kecamatan (19 PPK)`, `Master Desa & TPS (217 PPS)`, `Master Pasangan Calon (Paslon)`, dan `🏢 Master Penyedia (Rekanan)` sebagai rujukan kontrak Pengadaan sekaligus rekening bank, NPWP pajak, & link berkas Google Drive Pembayaran).
  - **📜 REGULASI & DASAR HUKUM:** Menu Besar Mandiri (*Top-Level Menu*) di bawah Database yang memuat Portal JDIH 3 Pilar (`Perencanaan`, `Pengadaan`, `Pembayaran`), dilengkapi fitur pencarian, tambah, edit, dan hapus regulasi.
  - **📁 ADMINISTRASI & 📥 MONITORING UNDUHAN:** Tata kelola `👥 Pengguna`, **`✍️ Penandatangan`** (Single Source of Truth seluruh pejabat penandatangan dokumen Perencanaan, Pengadaan 18 Tahap, dan Pembayaran termasuk No. SK & Sertifikat PBJ), matriks hak akses 33 menu (`app_menu_matrix`), pengaturan satker, pengumuman kedinasan, log aktivitas, dan histori unduhan.

---

## 1. Kedudukan dan Tata Kelola Canon
1. Blueprint Induk merupakan sumber kebenaran utama bagi pengembangan, perbaikan, pengujian, dan audit Si Prabu.
2. AI wajib mematuhi Canon; AI dapat mengusulkan perbaikan tetapi tidak dapat mengubah aturan bisnis secara sepihak.
3. Hanya satu Blueprint Induk yang dipelihara. Kesalahan atau kekurangan diperbaiki langsung di bagian terkait setelah disetujui Pengembang; tidak membuat rangkaian dokumen V1/V2/V3.
4. Riwayat perubahan teknis dapat dicatat untuk audit tanpa menciptakan salinan Blueprint baru.
5. PRD dan spesifikasi implementasi merupakan turunan dari Canon; bila bertentangan, Canon yang disepakati berlaku.
6. Dokumen ini bukan bukti bahwa aplikasi atau kode telah diperbarui tanpa verifikasi pengujian atas sistem aktual.

---

## 2. Ruang Lingkup dan Arsitektur RKB
1. Satu RKB aktif terpadu untuk seluruh lima subbagian: **KUL**, **Rendatin** (Perencanaan, Data dan Informasi), **Teknis**, **Hukum**, dan **ParSDM**.
2. Struktur baris anggaran hierarkis **L1–L6** dengan PIC Subbag pada aktivitas; bukan lima RKB terpisah.
3. Operator **Level 2** hanya mengubah baris sesuai PIC-nya. Perubahan subtotal induk lintas PIC adalah konsekuensi agregasi, bukan izin mengubah baris PIC lain.
4. **Level 1** dapat melakukan penyesuaian lintas divisi dalam pengecualian yang sudah disepakati, khususnya perubahan nonkonseptual; perubahan konsep dikembalikan ke PIC.
5. Siklus revisi selalu berangkat dari baseline terakhir. Level 2 yang belum mengajukan boleh bergabung sebelum pengesahan, tetapi satu PIC hanya memiliki satu pengajuan aktif dalam satu siklus.
6. Perencanaan perubahan lintas subbagian dilakukan melalui koordinasi offline; sistem tidak menambah workflow koordinasi baru.

---

## 3. Terminologi Versi, Siklus dan Baseline

| Istilah | Makna Canon |
| :--- | :--- |
| **RKB aktif** | Satu tabel RKB terpadu yang sedang berlaku dan menjadi tempat penyusunan. |
| **V1/V2/V3 usulan** | Penanda administratif versi proses pengajuan PIC setelah penolakan; bukan file/tabel RKB fisik baru. |
| **Siklus revisi** | Satu rangkaian pengajuan dari 1–5 subbagian peserta hingga pengesahan bersama. |
| **Baseline** | Snapshot RKB terpadu yang disahkan pada Tahap 4, immutable dan menjadi dasar siklus berikutnya. |
| **Anggaran awal** | Baseline pertama yang wajib tersedia dalam Pusat Siklus Dokumen (`RKB Pilkada 2024`). |

- Penolakan mencatat alasan dan perubahan versi administratif pada log, lalu membuka hanya baris PIC yang ditolak.
- Baseline yang sudah disahkan tidak berubah oleh pengeditan, perubahan parameter, atau koreksi tautan dokumen berikutnya.
- Setelah Tahap 4, sistem menutup siklus dan menyiapkan RKB aktif berdasarkan baseline terbaru.

---

## 4. Tahapan Revisi dan Aturan Transisi

| Tahap | Aktivitas dan keputusan | Dampak data |
| :--- | :--- | :--- |
| **0 — Draft** | Level 2 menyusun RUH sesuai PIC; Level 1 dapat melakukan penyesuaian nonkonseptual lintas divisi sesuai pengecualian. | Baris PIC yang berhak diedit tetap terbuka. |
| **1 — Pengajuan** | PIC mengirim satu usulan dengan konfirmasi, total anggaran, dan 3 tautan dokumen bertanda tangan. | Baris PIC pengaju terkunci. |
| **2 — Validasi Administratif** | Level 1 menetapkan Menunggu / Memenuhi Syarat / Tidak Memenuhi Syarat. Penolakan wajib alasan. | Lulus ke Tahap 3; ditolak kembali Tahap 0 hanya untuk PIC terkait. |
| **3 — Validasi Pleno** | Level 1 menetapkan Disetujui / Tidak Disetujui; penyesuaian nonkonseptual yang disepakati pleno dapat dilakukan. | PIC disetujui tetap disetujui; hanya PIC ditolak mengulang Tahap 0–3. |
| **4 — Pengesahan BA Pleno** | Aktif setelah semua PIC peserta disetujui; Level 1 memverifikasi dokumen final dan mengesahkan. | Baseline immutable, siklus selesai, RKB aktif berikutnya disiapkan. |

### 4.1 Detail Tahap 1
- Tampilan pengajuan bersifat ringkas: metadata usulan dan total anggaran, bukan rincian tabel RUH.
- Tiga tautan Google Drive terpisah dan wajib: **RKB hardcopy bertanda tangan**, **Nota Dinas bertanda tangan**, dan **KAK bertanda tangan**.
- Pengaju melakukan konfirmasi kebenaran dokumen sebelum pengajuan mengunci PIC.

### 4.2 Detail Tahap 2–3
- Validasi administratif hanya oleh **Level 1**. Status *Tidak Memenuhi Syarat* harus disertai alasan yang terlihat di Monitoring Revisi PIC terkait.
- Dalam pleno, status PIC yang disetujui tidak direset karena PIC lain ditolak. Pleno ulang hanya memeriksa PIC yang sebelumnya ditolak.
- Pleno dinyatakan selesai hanya setelah semua PIC peserta mendapat persetujuan.
- Level 2 hanya membaca data pada Tahap 3. Level 1 dapat menyesuaikan RUH nonkonseptual yang disepakati dalam pleno dan wajib mencatat audit perubahan.

### 4.3 Detail Tahap 4 (Pengesahan BA Pleno)
- **Kedudukan Approver Substantif vs Pencatatan Sistem:** Pengesahan revisi anggaran hibah Pilkada di dunia nyata merupakan kewenangan **kolektif kolegial 5 Komisioner KPU** (Ketua KPU + 4 Anggota Komisioner) melalui forum resmi **Rapat Pleno**. Bukti sah yuridis persetujuan (*approval*) mereka dituangkan dalam **Naskah Fisik Berita Acara (BA) Rapat Pleno** dan RKB Final bertandatangan basah/elektronik resmi.
- Di dalam software SI-PRABU, **tidak disediakan approval workflow engine bertingkat** (tidak ada tombol klik persetujuan mandiri per komisioner di aplikasi).
- Pencatatan pengesahan ke dalam sistem dieksekusi secara administratif oleh **Administrator Utama Satker (Rendatin / Level 1)** atau Level 0 dengan menginput Nomor BA Pleno, Tanggal BA Pleno, serta tiga tautan Google Drive terpisah dan wajib: **BA Pleno bertanda tangan**, **RKB final bertanda tangan**, dan **KAK gabungan**.
- Tautan diverifikasi secara manual sebelum pengesahan.
- Sesudah pengesahan, hanya **Level 1 (Administrator Utama Satker / Rendatin)** dapat mengoreksi tautan dokumen, dengan audit log; koreksi tautan tidak mengubah baseline data RKB yang sudah berstatus *immutable*.

---

## 5. Arsitektur 3 Modul Siklus Utama (Perencanaan • Pengadaan • Pembayaran)

### 5.1 Modul 1 — 📁 PERENCANAAN (Hulu)
| Menu | Fungsi utama |
| :--- | :--- |
| **📘 RUH Belanja RKB** | Menampilkan/mengedit satu RKB terpadu, hierarki L1–L6, PIC, subtotal, dan ekspor sesuai hak. |
| **📝 Pengajuan Usulan Revisi** | Pengajuan Tahap 1, dokumen wajib, konfirmasi, dan penguncian PIC. |
| **🔍 Validasi Revisi** | Validasi Tahap 2 dan Tahap 3 beserta keputusan, alasan penolakan, dan status PIC. |
| **🔒 Pengesahan BA Pleno** | Verifikasi dokumen Tahap 4, pengesahan baseline, dan penutupan siklus. |
| **📊 Monitoring Revisi (4 Tahap)** | Status per PIC, alasan penolakan, jejak tahap, dan pemantauan siklus. |
| **🔄 Pusat Siklus Dokumen** | Arsip anggaran awal dan seluruh baseline disahkan beserta dokumen pendukung; dilengkapi aksi buka rincian RKB, sanding semula vs menjadi, unduh Excel, dan koreksi tautan. |
| **📈 Rekap Perencanaan** | Rekapitulasi komprehensif pagu perencanaan RKB (Per Bagian, 28 Kegiatan, Subbagian, Sasaran, dan BAS). |
| **📋 Standar 28 Kegiatan (KPT 543)** | Standar tahapan dan 28 kegiatan anggaran hibah Pemilihan sesuai KPT KPU Nomor 543 Tahun 2022. |
| **📘 Panduan Perencanaan** | Buku panduan teknis tata kelola perencanaan anggaran RKB dan siklus revisi 4 tahap. |

### 5.2 Modul 2 — 📁 PENGADAAN (Tengah — `public/pengadaan.js`)
| Menu | Fungsi utama |
| :--- | :--- |
| **📦 Daftar Paket Pengadaan** | Registri paket pengadaan barang/jasa/konstruksi/swakelola yang terhubung langsung dengan item RKB (`Penarik Item RKB SI-PRABU` dari Dokumen Terkunci Terbaru). |
| **🧭 Kokpit 18 Tahap** | Ruang kendali 18 tahapan pengadaan hulu-ke-hilir (Perpres 46/2025, Perlem LKPP 2 & 3/2026, Kepsekjen KPU 1272/2025) beserta generator berita acara & pakta integritas. |
| **📈 Rekap Pengadaan** | Pusat analitik 5 tab pengadaan: **(1) Ringkasan Eksekutif**, **(2) Progres 18 Tahap**, **(3) Metode & Jenis PBJ**, **(4) Per Subbagian & PPK**, dan **(5) PDN/TKDN/UMK & Efisiensi**. |
| **📘 Panduan Pengadaan** | Buku pintar pedoman 18 tahapan pengadaan barang/jasa, matriks metode pemilihan, dan kepatuhan regulasi PBJ. |

### 5.3 Modul 3 — 📁 PEMBAYARAN (Hilir — Bendahara & Pertanggungjawaban)
| Menu | Fungsi utama |
| :--- | :--- |
| **🏛️ Rekap Pembayaran** | Rekapitulasi pelaksanaan pembayaran anggaran berbasis **Pagu Baseline Sah** (terpisah dari draft simulasi perencanaan yang belum disahkan). |
| **💳 Panduan Pembayaran** | Pedoman tata kelola pencairan, pengujian tagihan SPP/SPM/SP2D, pemungutan pajak (PPN/PPh), dan pertanggungjawaban belanja hibah oleh Bendahara/KPA. |

---

## 6. Monitoring Revisi
1. Monitoring siklus mulai aktif setelah pengajuan Tahap 1 pertama pada siklus itu.
2. Sesudah pengesahan, Monitoring tetap menampilkan siklus selesai terakhir sampai siklus berikutnya memiliki pengajuan Tahap 1 pertama.
3. **Level 2** hanya melihat usulan PIC sendiri; **Level 1** dapat memantau seluruh pengajuan sesuai kewenangannya.
4. Riwayat proses tersimpan; akses resume proses lengkap dan audit rinci hanya untuk **Kasubag Rendatin** dan **Developer**.
5. Alasan penolakan terlihat oleh pengaju dan status PIC yang telah disetujui tetap tercatat.

---

## 7. REFERENSI dan DATABASE

| Kelompok | Submenu / objek | Akses pengelolaan |
| :--- | :--- | :--- |
| **REFERENSI** | Parameter & Kuantitas SSOT; SBM; BAS | **Level 0** dan **Level 1**. Pengguna lain dapat melihat sesuai aturan Referensi. |
| **DATABASE** | Master Kecamatan (19 PPK); Master Desa & TPS (217 PPS); Master Pasangan Calon (Paslon); Master Penyedia (Rekanan) | **Level 0**, **Level 1**, dan Pejabat Pengadaan/PPK (untuk Master Penyedia); pengguna lain melihat sesuai matriks hak akses. |

- Kuantitas SSOT sebagian berasal dari DATABASE; parameter mandiri memiliki fasilitas edit. SBM dan BAS adalah referensi tersendiri.
- Perubahan referensi/database memperbarui perhitungan hanya pada baris RKB aktif yang sah masih terbuka; baris terkunci dan baseline immutable.
- Perubahan parameter yang memengaruhi beberapa baris dan subtotal harus diproses konsisten, dengan audit sebelum/sesudah.

### 7.1 Waktu Perubahan REFERENSI / DATABASE — A-03

| Tahap | Kesepakatan waktu |
| :--- | :--- |
| **Tahap 0** | Waktu utama dan paling tepat untuk pembaruan sebelum pengajuan. |
| **Tahap 1** | Umumnya dihindari; pengecualian saat Level 1 melakukan revisi lintas divisi. |
| **Tahap 2** | Sebaiknya tidak dilakukan; tampilkan pengingat risiko perubahan. |
| **Tahap 3** | Dapat dilakukan untuk penyesuaian sesuai hasil pleno. |
| **Tahap 4** | Tidak boleh mengubah baseline yang telah disahkan. |

- Pengingat bersifat kontekstual, bukan penguncian permanen menu. Hak akses pengelolaan tetap ditentukan oleh matriks kewenangan, bukan oleh tahap.

---

## 8. Menu Mandiri & Tata Letak Navigasi Sejajar
1. **Panduan Kontekstual Per Modul:** Setiap modul tahapan siklus memiliki menu panduan kontekstual di dalam foldernya masing-masing dengan ikon seragam: **📘 Panduan Perencanaan** (di dalam `📁 Perencanaan`), **📘 Panduan Pengadaan** (di dalam `📁 Pengadaan`), dan **💳 Panduan Pembayaran** (di dalam `📁 Pembayaran`). Seluruh pengguna dapat membaca; **Level 0** dan **Level 1** berwenang mengelola konten.
2. **Menu Besar Mandiri Sejajar (*Top-Level Standalone Menu*):** **📊 Beranda**, **📜 Regulasi & Dasar Hukum** (ditempatkan tepat di bawah `📁 Database`), serta **📥 Monitoring Unduhan** (di bawah `📁 Administrasi`) merupakan menu besar mandiri yang posisi kirinya (ikon `20px` + `gap 8px` + label huruf kapital tebal) **sejajar persis** dengan grup folder utama.
3. **Portal Regulasi & Dasar Hukum 3 Pilar (`view-db-regulasi`):** Mengelompokkan produk hukum ke dalam 3 pilar tahapan siklus (**Pilar 1: Perencanaan Anggaran**, **Pilar 2: Pengadaan Barang/Jasa**, **Pilar 3: Pembayaran & Pertanggungjawaban**), dilengkapi pencarian instan serta fitur CRUD (`Tambah`, `Edit`, `Hapus`).

---

## 9. Monitoring Unduhan dan Ekspor
1. Setiap pengguna hanya dapat melihat histori unduhannya sendiri; catat tanggal/waktu, pengguna, siklus RKB, tipe unduhan, PIC/filter, dan status berhasil/gagal.
2. Setiap unduhan harus diverifikasi hak aksesnya di backend.
3. File XLSX/ZIP hasil ekspor kedaluwarsa tepat **1 jam** setelah dibuat dan otomatis dihapus dari penyimpanan; URL yang kedaluwarsa ditolak meskipun penghapusan fisik terlambat.
4. Audit log unduhan tetap tersimpan meskipun file hasil ekspor telah dihapus.
5. Opsi ekspor: seluruh dokumen; berdasarkan PIC/sasaran; paket ZIP terpisah untuk lima subbagian.
6. **Level 1** dapat mengekspor RKB penuh semua PIC dan ZIP lima subbagian; **Level 2** hanya PIC sendiri dengan filter sasaran yang berada dalam PIC sendiri.

### 9.1 Komposisi Sheet XLSX

| Level | Sheet yang benar-benar dihasilkan |
| :--- | :--- |
| **Level 2** | `RUH_Belanja_Resmi`; `Matriks_Revisi` — hanya dua sheet, difilter ke PIC sendiri. Sheet lain tidak dibuat maupun disembunyikan. |
| **Level 1** | `RUH_Belanja_Resmi`; `Data_Kertas_Kerja`; `Matriks_Revisi`; `Rekap_Eksekutif`; `Rekap_Kegiatan_RKB`; `Rekap_Subbagian`; `Rekap_Akun_BAS`. |

- Catatan keselarasan antarmuka: label jumlah sheet pada dialog ekspor harus mengikuti jenis ekspor dan level yang berlaku, bukan angka tetap yang menyesatkan.

---

## 10. Matriks Kewenangan Inti & 11 Tingkat Kewenangan Satker

Sistem menerapkan **Decoupled Dynamic RBAC & ABAC** yang membagi kewenangan pengguna ke dalam 11 level baku berbasis struktur kedinasan resmi KPU Kabupaten Ngawi:

| Level | Nomenklatur Jabatan Resmi KPU | Peran Bisnis & Hak Akses | Cakupan Subbagian (`pic_subbag`) |
| :---: | :--- | :--- | :---: |
| **Level 0** | **Lead Developer & System Architect** | Akses Penuh Sistem, bypass darurat, CRUD konfigurasi DB, Blueprint & PRD, simulasi multi-peran QC. | `SEMUA` (Lintas 5 Subbag) |
| **Level 1** | **Administrator Utama Satker (Rendatin)** | Pengelola Utama Satker, Manajemen User, Log Audit, Validasi Tahap 2 & 3, Pencatatan Pengesahan Tahap 4, Edit Master Referensi & DB, Ekspor ZIP & Seluruh PIC. | `SEMUA` (Rendatin & Satker) |
| **Level 2** | **Pengolah Data Perencanaan Anggaran** | Penyusunan RUH Belanja RKB, Pengajuan Usulan Revisi, Monitoring Revisi 4 Tahap, Pusat Siklus Dokumen. Seluruh folder **ADMINISTRASI** tersembunyi 100%. | `SEMUA` (Perencanaan Satker) |
| **Level 3** | **Operator Pengelola Subbagian** | Penyusunan RUH Belanja RKB & Pengajuan Usulan Revisi khusus subbagian yang ditugaskan (`KUL`, `RENDATIN`, `TEKNIS`, `HUKUM`, `PARSDM`). | Terisolasi per Subbagian |
| **Level 4** | **Ketua KPU (Kepala Lembaga)** | **Executive Viewer:** Peninjau Pimpinan Tertinggi Satker (Pagu Utuh / Konsolidasi, RUH Belanja, Monitoring Revisi, Rekap Anggaran). *Read-Only*. | `SEMUA` (Konsolidasi Satker) |
| **Level 5** | **Anggota KPU Divisi Rendatin** | **Executive Viewer:** Pengampu Kebijakan Divisi Perencanaan, Data & Informasi. Peninjau pagu, RUH belanja, usulan revisi, dan rekapitulasi. *Read-Only*. | `SEMUA` (Pengampu Perencanaan) |
| **Level 6** | **Anggota Komisioner KPU** | **Executive Viewer:** Peninjau Kolektif Kolegial (Divisi Teknis, Hukum, Parmas). Peninjau pagu utuh, RUH belanja, monitoring usulan, dan rekapitulasi. *Read-Only*. | `SEMUA` (Konsolidasi Satker) |
| **Level 7** | **Sekretaris KPU / Kuasa Pengguna Anggaran (KPA)** | **Executive Viewer:** Penanggung Jawab Keuangan & Administrasi Satker. Peninjau pagu utuh, RUH belanja, rekapitulasi pelaksanaan anggaran. *Read-Only*. | `SEMUA` (Konsolidasi Satker) |
| **Level 8** | **Pejabat Pembuat Komitmen & PBJ** | Pengelola Pengadaan Barang/Jasa & Komitmen Belanja (Pelaksanaan Anggaran). | `SEMUA` |
| **Level 9** | **Badan Ad Hoc — PPK (Kecamatan)** | Operator Belanja Hibah Tingkat Panitia Pemilihan Kecamatan (PPK). | Terisolasi per Kecamatan |
| **Level 10** | **Badan Ad Hoc — PPS (Desa/Kelurahan)** | Operator Belanja Hibah Tingkat Panitia Pemungutan Suara (PPS Desa). | Terisolasi per Desa/Kelurahan |

- **Matriks Hak Akses Menu Dinamis (`app_menu_matrix`):** Seluruh hak akses visibilitas 27 menu per tingkat kewenangan (L0 s.d. L10) dikonfigurasi secara terpusat di database.
- **Penyembunyian Folder Otomatis (*Auto-Collapse Empty Folders*):** Folder navigasi sidebar (seperti folder ADMINISTRASI) secara otomatis disembunyikan dari antarmuka jika seluruh tombol menu anak di dalamnya berstatus `display: none` (`allow_lX = 0`).
- **Penegakan di Backend:** Semua pembatasan kewenangan wajib ditegakkan di backend (`src/auth.js` dan endpoint API `server.js`), bukan hanya penyembunyian elemen visual di antarmuka web.

---

## 11. Ganti Peran untuk Pengujian & Tata Kelola Multi-Peran

1. Fitur **Ganti Peran** hanya tersedia bagi **Level 0** sebagai alat uji fitur web (Quality Control / QC).
2. **Penonaktifan Total Mode Kumulatif (*Strict Single Active Role / Switch Mode*):**
   - Mode kumulatif (*Cumulative Multi-Role*) dilarang dan dinonaktifkan total di seluruh sistem (`role_mode = 'SWITCH'`).
   - Setiap pengguna multi-peran hanya dapat beroperasi dalam **satu peran aktif tunggal** (`active_role`) pada satu waktu.
   - Dilarang keras menggabungkan wewenang lintas peran (`Math.min(levels)` dihapus). Tingkat kewenangan, mode akses (`EDITOR` vs `VIEWER`), dan subbagian (`pic_subbag`) murni mengacu pada satu peran yang sedang aktif.
3. **Pembersihan Nomenklatur SAKTI & Standardisasi Jabatan KPU:**
   - Seluruh istilah asing bawaan SAKTI (`APPROVER`, `VALIDATOR`, `OPERATOR (PERENCANAAN)`) dibersihkan total dari modal Ganti Peran dan Sub-text Header.
   - Antarmuka sistem wajib menampilkan nama kedinasan resmi KPU (*Ketua KPU (Kepala Lembaga)*, *Anggota KPU Divisi Rendatin*, *Anggota Komisioner KPU*, *Sekretaris KPU / Kuasa Pengguna Anggaran (KPA)*, *Administrator Utama Satker*, dll).
4. **Badge Login Tetap Permanen & UX Header:**
   - Akun login, nama profil (`emenje`), avatar, dan badge kanan atas tetap mengidentifikasi akun Developer (`LEVEL 0 SATKER 657811 2026`); kata "Pengembang" atau "Lead Developer" tidak dimunculkan pada navigasi saat beralih peran untuk menjaga keselarasan antarmuka dinamis.
   - Hanya pemilih peran aktif, tampilan halaman, menu navigasi, filter subbagian, dan fitur aplikasi yang menyesuaikan peran baru.
5. **Pop-Up Validasi Ganti Peran & Start dari Dashboard:** Saat memilih peran simulasi pada daftar `Ganti Peran`, sistem memunculkan Pop-Up Validasi Ganti Peran yang menampilkan detail peran tujuan beserta cakupan hak aksesnya. Sementara Pop-Up tampil, sistem di latar belakang menyiapkan penyegaran sesi, menyesuaikan hak akses fitur/menu serta filter subbagian, dan memuat halaman baru dimulai dari **Beranda / Dashboard (`#view-dashboard`)** sesuai peran yang dipilih.
6. Simulasi tidak mengubah data akun permanen dan tidak dapat meningkatkan kewenangan backend di luar ketentuan peran uji.
7. Audit tindakan selama simulasi membedakan identitas asli dan peran simulasi; logout menghapus simulasi.

---

## 12. Session Login dan Pengamanan

| Aspek | Aturan |
| :--- | :--- |
| **Batas absolut** | **8 jam** sejak login; aktivitas tidak memperpanjang batas absolut. |
| **Tidak aktif** | Logout setelah **30 menit** tanpa aktivitas. |
| **Refresh** | Tetap login bila sesi masih valid. |
| **Logout** | Sesi dicabut di server. |
| **Perubahan akun/izin** | Sesi terkait dicabut saat akun dinonaktifkan atau kewenangannya berubah (**A-01 PASS**). |
| **Simulasi peran** | Tidak membuat atau memperpanjang sesi autentikasi asli (**A-02 PASS**). |

- Backend memvalidasi status sesi dan hak akses pada setiap aksi yang relevan.
- Penyimpanan dari halaman lama harus ditolak jika baris sudah terkunci atau status pengajuan berubah.
- Benturan penyimpanan data ditangani dengan pemeriksaan status dan versi data; tidak menambah antrean atau koordinasi lintas PIC (**A-04 PASS**).
- Rekomendasi implementasi keamanan: cookie HttpOnly/Secure/SameSite, proteksi CSRF, pencatatan autentikasi, dan pembatasan percobaan login; detail teknis dipilih saat desain keamanan tanpa mengubah aturan bisnis.

---

## 13. Persyaratan Fungsional dan Kriteria Penerimaan

| ID | Persyaratan | Kriteria penerimaan ringkas |
| :--- | :--- | :--- |
| **FR-01** | Satu RKB aktif | Kelima PIC berada pada tabel sama; operator PIC A tidak dapat mengubah baris PIC B. |
| **FR-02** | Versi administratif | Penolakan menaikkan versi proses dan mencatat log tanpa membuat RKB fisik baru. |
| **FR-03** | Pengajuan Tahap 1 | Tanpa salah satu dari 3 tautan wajib atau konfirmasi, pengajuan tidak dapat selesai. |
| **FR-04** | Validasi Tahap 2 | Penolakan mewajibkan alasan dan hanya membuka PIC terkait. |
| **FR-05** | Pleno Tahap 3 | Persetujuan PIC lain tetap tersimpan saat satu PIC ditolak. |
| **FR-06** | Pengesahan Tahap 4 | Hanya aktif setelah seluruh peserta disetujui dan 3 tautan final diverifikasi. |
| **FR-07** | Baseline | Snapshot pengesahan tidak berubah setelah siklus ditutup. |
| **FR-08** | Monitoring | Siklus selesai tetap terlihat sampai pengajuan Tahap 1 siklus berikutnya. |
| **FR-09** | Referensi/DB | Baris terkunci dan baseline tidak berubah otomatis akibat perubahan parameter. |
| **FR-10** | Ekspor Level 2 | XLSX berisi tepat dua sheet dengan baris PIC sendiri. |
| **FR-11** | Unduhan | Tautan file tidak dapat dipakai setelah 1 jam; histori tetap ada. |
| **FR-12** | Manajemen User | Hanya Level 0 dan Kasubag Rendatin dapat membuka serta menjalankan aksi pengelolaan. |
| **FR-13** | Blueprint DEV | Hanya Level 0 dapat mengakses menu. |
| **FR-14** | Ganti Peran | Badge Level 0 tetap, fitur sesuai simulasi, akun asli tidak berubah. |
| **FR-15** | Session | Sesi berakhir setelah 8 jam absolut atau 30 menit tidak aktif, mana yang lebih dulu. |

---

## 14. Audit Log dan Integritas Data

Sistem Audit Log SI-PRABU dirancang sebagai fondasi transparansi hukum, akuntabilitas anggaran, dan keandalan data transaksi hibah Pilkada. Seluruh aktivitas pengelolaan dokumen, perubahan belanja, validasi siklus, pemutakhiran master, serta akses pengguna dicatat secara sistematis dan tidak dapat diubah (*immutable*).

1. **Prinsip Dasar Audit Trail:** Setiap entri audit wajib merekam 7 elemen kunci:
   - **Aktor:** ID pengguna, username asli, nama pejabat, jabatan, dan peran operasional.
   - **Waktu:** Timestamp presisi tinggi WIB (*Waktu Indonesia Barat*) berstandar SAKTI Kemenkeu.
   - **PIC Subbagian:** Subbagian pelaksana yang berwenang atas data yang terdampak (`KUL`, `RENDATIN`, `TEKNIS`, `HUKUM`, `PARSDM`, atau `SEMUA`).
   - **Entitas & ID:** Nama tabel atau objek data beserta identitas baris terkait (`periode_anggaran`, `rab_baris`, `master_sbm`, dll).
   - **Nilai Semula vs Menjadi:** Struktur perbandingan data sebelum (*old values*) dan sesudah (*new values*) aksi dilakukan dalam bentuk JSON terstruktur.
   - **Catatan / Justifikasi:** Alasan perubahan yang dicantumkan oleh pengguna saat konfirmasi simpan atau penolakan/pengembalian usulan.
   - **Status Siklus:** Fase dan tahap siklus perencanaan saat aksi dilakukan.
2. Pada lembar kerja **RUH Belanja RKB**, perubahan baris tidak langsung dicatat satu per satu saat pengetikan/perubahan draf sementara di browser, melainkan dicatat secara bersih saat pengguna menekan **Simpan Perubahan RKB** dan mengonfirmasinya melalui Pop-Up Konfirmasi Simpan (**Batch Commit** — Bab 18.8 Canon).
3. Audit mencatat pengajuan, validasi, penolakan, persetujuan pleno, pengesahan, perubahan tautan pascapengesahan, pengelolaan pengguna, dan antrean unduhan.
4. Log proses versi `V1/V2/V3` tetap dapat ditelusuri secara historis pada Pusat Siklus tanpa memecah RKB aktif menjadi dokumen baru.
5. Integritas baseline, batas PIC, kontrol konkurensi optimistik (*Optimistic Concurrency Control*), dan status penguncian wajib diverifikasi secara ketat pada backend.

### 14.1 Hak Akses Eksklusif dan Kekekalan Log Aktivitas (Immutability)
- **Otorisasi Terbatas:** Menu antarmuka dan endpoint API **Log Aktivitas** (`GET /api/audit-logs`, `view-audit`) dibatasi secara eksklusif hanya untuk:
  1. **Level 0 (`Lead Developer / Architect` — `emenje`)**
  2. **Kasubag Rendatin (`perencanaan_kasubag` / Level 1 `super_admin`)**
- **Penolakan Hak Akses:** Staf Rendatin (Level 1 staf), Operator Subbagian (Level 2), dan Akun Pimpinan/Komisioner (Level 3) ditolak tegas untuk mengakses Log Aktivitas demi kerahasiaan jejak digital dan kepatuhan audit internal.
- **Kekekalan Log (Immutability):** Catatan log bersifat *Read-Only Murni*. Tidak ada antarmuka, API, atau tombol untuk mengubah (*update*) maupun menghapus (*delete*) log audit yang telah tercatat.

### 14.2 Enam Kelompok Cakupan Kejadian (`RKB`, `SIKLUS`, `MASTER`, `USER`, `AUTH`, `UNDUH`)
Mesin audit secara otomatis mengklasifikasikan setiap peristiwa ke dalam salah satu dari 6 kategori resmi:
1. **Perubahan RUH Belanja (`RKB`):**
   - Aksi: `COMMIT_RKB_CHANGES`, `CREATE_RKB_ROW`, `UPDATE_RKB_ROW`, `DELETE_RKB_ROW`, `REORDER_RKB_ROW`, `QUICK_UPDATE_PIC`, `QUICK_UPDATE_SASARAN`, `QUICK_UPDATE_CATATAN`.
   - Data Tercatat: Pagu Semula, Pagu Menjadi, Selisih Netto Anggaran, Ringkasan Aksi (jumlah baris ditambah, diubah, dihapus, digeser), Catatan Simpan Pengguna, serta daftar rincian belanja terdampak.
2. **Alur Siklus & Revisi (`SIKLUS`):**
   - Aksi: `SUBMIT_REVISI_TAHAP1`, `VALIDATE_REVISI_TAHAP2`, `REJECT_REVISI_TAHAP2`, `PLENO_SETUJU_TAHAP3`, `PLENO_TOLAK_TAHAP3`, `FINALIZE_TAHAP4_KESELURUHAN`, `KOREKSI_LINK_PASCAPENGESAHAN`.
   - Data Tercatat: Nomor/Tanggal Surat Pengajuan, Kode Revisi, Catatan Pleno, Nomor/Tanggal Berita Acara, Fase Perencanaan (`Pra-NPHD`/`NPHD`/`Pasca-NPHD`), dan pembaruan tautan berkas resmi (RKB Final, KAK, GDrive Pleno).
3. **Referensi & Database Master (`MASTER`):**
   - Aksi: Tambah/ubah/hapus dan impor massal Excel pada Kecamatan, Desa/TPS (`BULK_IMPORT_DESA`), Paslon (`UPDATE_PASLON`), Parameter Kuantitas SSOT (`UPDATE_KUANTITAS`), Standar Biaya Masukan SBM (`UPDATE_SBM`), Akun Bagan Akun Standar (`UPDATE_AKUN`), Regulasi JDIH (`SAVE_REGULASI`), dan Pengaturan Pejabat Satker (`UPDATE_SETTINGS`).
   - Data Tercatat: Nilai parameter semula vs menjadi, dampak perhitungan terhadap rumus turunan RKB, serta volume impor data.
4. **Manajemen Pengguna (`USER`):**
   - Aksi: `CREATE_USER`, `UPDATE_USER`, `TOGGLE_USER_STATUS`, `DELETE_USER`, `RESET_PASSWORD`.
   - Data Tercatat: Username, nama pejabat, jabatan, wewenang PIC subbagian, perubahan level RBAC, dan kenaikan `token_version` untuk pencabutan sesi aktif.
5. **Autentikasi & Sesi (`AUTH`):**
   - Aksi: `LOGIN_SUCCESS` (Login Sandi / Google OAuth), `LOGIN_FAILED`, `LOGOUT`, `SWITCH_ROLE_SIMULATION`, `SESSION_REVOCATION`.
   - Data Tercatat: Alamat IP, identitas perangkat, waktu login/logout, serta penanda sesi simulator peran pengembang.
6. **Unduhan & Ekspor Dokumen (`UNDUH`):**
   - Aksi: `CREATE_DOWNLOAD_REQUEST`, `DOWNLOAD_FILE_ACCESSED`, `CLEANUP_EXPIRED_DOWNLOADS`.
   - Data Tercatat: Jenis dokumen yang diekspor (Excel RUH Belanja Subbag, Rekap Perencanaan, Rekap Pelaksanaan, Paket ZIP 5 Subbag), parameter filter, waktu kedaluwarsa file (1 jam), dan penghapusan fisik file kedaluwarsa.

### 14.3 Arsitektur Penyimpanan RUH Belanja & Batch Commit (Bab 18.8 Canon)
1. **Penampungan Draf Sementara (Staged Draft Buffer):**
   - Saat pengguna melakukan penambahan, penyuntingan angka, atau penggeseran baris di RUH Belanja, seluruh operasi ditampung secara sementara di memori browser/sesi (`AppState.stagedRkbOps`).
   - Tabel `audit_log` **TIDAK** mencatat transaksi sementara ini baris-per-baris agar basis data audit tetap bersih, rapi, dan memiliki arti akuntansi yang utuh.
2. **Pengeksekusian Bersih (Single Atomic Batch Commit):**
   - Ketika pengguna menekan tombol **Simpan Perubahan RKB**, modal Pop-Up Pratinjau menyajikan selisih netto anggaran semula vs menjadi dan meminta masukan Catatan Justifikasi.
   - Setelah pengguna mengklik **Konfirmasi Simpan**, seluruh operasi dieksekusi dalam satu transaksi atomik database (`BEGIN TRANSACTION / COMMIT` dengan penanganan savepoint).
   - Tepat **satu entri audit** berkode `COMMIT_RKB_CHANGES` dicatat secara permanen, mendokumentasikan dampak agregat dari seluruh draf yang disetujui.

### 14.4 Audit Trail pada Simulasi Ganti Peran Pengembang (Bab 11.5 Canon)
1. **Non-Repudiation (Anti-Pengelakan Identitas):**
   - Ketika Lead Developer (`emenje` / Level 0) menggunakan fitur **Simulasi Ganti Peran** (misalnya menyamar sebagai Operator KUL atau Kasubag Rendatin untuk keperluan *Quality Control*), sistem **TIDAK PERNAH** mencatat transaksi dengan identitas palsu operator tersebut.
2. **Format Pencatatan Spesifik:**
   - Field `user_id` dan `username` pada `audit_log` tetap mencatat identitas akun pengembang asli (`emenje`).
   - Keterangan peran pada log mencantumkan atribut simulasi secara transparan:
     `developer [simulasi: operator | PIC: KUL]`
   - Dengan mekanisme ini, seluruh rekam jejak pengembang saat pengujian sistem dapat diaudit dengan jelas dan tidak mencemari riwayat kerja riil operator satker.

### 14.5 Mekanisme Immutability & Kebijakan Startup Nol-Destruktif
1. **Larangan Kueri Destruktif pada Startup:**
   - Rutinitas penyelarasan awal server (*server startup initialization*) dilarang keras memuat perintah:
     `DELETE FROM audit_log`, `DELETE FROM audit_log_perubahan`, atau `TRUNCATE TABLE audit_log`.
2. **Perlindungan Siklus Hidup Database:**
   - Skrip migrasi dan penyesuaian operasional (`alignOperationalRkbCycles`) dipagari penuh dengan flag konfigurasi persisten `operational_cycle_aligned_v1` pada tabel `settings_satker`.
   - Tindakan migrasi satu-kali (*one-time seed*) tidak akan pernah dieksekusi ulang saat server mengalami restart, *git deploy*, atau *power cycle*, sehingga integritas riwayat log, nomor BA pengesahan, dan dokumen yang telah dikunci dijamin abadi.

### 14.6 Verifikasi Integritas Backend & Optimistic Concurrency Control (OCC)
1. **Verifikasi Backend Tanpa Kompromi:**
   - Validasi hak akses, isolasi subbagian (Pagar PIC), status penguncian dokumen (`is_locked = 1`), serta validasi harga/volume negatif divalidasi pada lapisan logika backend (`src/db.js` dan `server.js`), bukan hanya pada lapisan UI/antarmuka.
2. **Optimistic Concurrency Control (OCC — Temuan 8):**
   - Setiap dokumen RKB memiliki penanda versi aktif (`rkb_version`) yang dihitung secara dinamis dari hash kondisi baris dan pencacah revisi.
   - Setiap pengiriman simpan draf (`/api/rkb/:id/commit-staged` atau `/row`) wajib menyertakan `expected_rkb_version`.
   - Apabila terdapat pengguna lain yang telah menyimpan perubahan terlebih dahulu sehingga versi dokumen di server telah berubah, penyimpanan dari halaman lama akan ditolak dengan status **HTTP 409 Conflict** (`rkb_conflict: true`), mencegah risiko tumpang tindih atau hilangnya data perubahan pengguna lain (*lost updates*).

### 14.7 Arsitektur Basis Data Utama: Fullpoint MySQL & phpMyAdmin (Single Source of Truth)
1. **Standar Tunggal Operasional (Fullpoint MySQL phpMyAdmin):**
   - Seluruh lingkungan server produksi (`siprabu.kpungawi.com`) dan lingkungan pengembang lokal secara default berjalan penuh (*exclusive fullpoint*) dengan engine **MySQL 8.0 / MariaDB** (`DB_TYPE=mysql`) yang terkelola langsung pada phpMyAdmin (`siprabu_db`).
   - Seluruh transaksi, perhitungan kalkulasi anggaran, audit logging, perizinan, dan sesi beroperasi langsung pada MySQL melalui driver bridge tersinkronisasi `src/mysql_sync.js`.
2. **Status Arsip File SQLite Lokal (`data/`):**
   - File basis data SQLite lama (`hibah_kpu.sqlite`, `.template`, `.bak`) yang berada di folder `data/` dibiarkan utuh di tempatnya sebagai arsip statis/legacy historis.
   - Tidak ada lagi proses aktif runtime aplikasi yang membaca, menulis, atau memutasi file SQLite lokal tersebut.
3. **Ekspor & Pencadangan Berbasis MySQL Dump:**
   - Modul pencadangan (`src/backup.js`) dan utilitas CLI (`npm run backup`) secara langsung mengekstrak SQL Dump murni berstandar phpMyAdmin (`.sql`).
   - Endpoint sinkronisasi pengembang (`/api/developer/export-mysql` & `/api/developer/export-db`) menyajikan dump data hidup langsung dari MySQL, sehingga sinkronisasi satu arah (`pull_online_db.js`) selalu menghasilkan data termutakhir yang siap diimpor ke phpMyAdmin.
4. **Kompatibilitas Sintaks Driver:**
   - Bridge `mysql_sync.js` secara otomatis mentranslasikan kueri dialek SQLite (`INSERT OR REPLACE`, `INSERT OR IGNORE`, `PRAGMA`, `GROUP_CONCAT`, `datetime('now')` -> `NOW()`, dan isolasi `SAVEPOINT` pada connection pool) ke padanan standar MySQL 8.0/MariaDB tanpa memerlukan perombakan kode logika bisnis.

---

## 15. Panduan Pengembangan dan Pengujian
1. Pengembang memandu alur bisnis; AI membantu menerjemahkan Canon ke spesifikasi dan melakukan pemeriksaan kesesuaian.
2. Setiap patch wajib mempertahankan Canon; ketidaksesuaian harus dilaporkan sebelum perubahan dilakukan.
3. Implementasi dapat diuji pada website setelah Pengembang menginstruksikan pekerjaan kode; penyusunan dokumen ini sendiri tidak mengotorisasi perubahan repository atau deployment.
4. Uji wajib mencakup akses lintas PIC, pengajuan/penolakan, penguncian, pleno parsial, pengesahan, ekspor, kedaluwarsa file, sesi, dan simulasi peran.
5. Perubahan kesepakatan diperbaiki langsung pada Blueprint Induk setelah disetujui; tidak membuat banyak versi dokumen.

---

## 16. Batasan dan Detail yang Tidak Boleh Diasumsikan
1. Nama teknis database, skema tabel, framework, dan struktur API tunduk pada kesepakatan arsitektur sistem.
2. Detail UI yang tidak disebutkan Canon dapat dirancang sebagai implementasi, tetapi tidak boleh mengubah proses bisnis atau hak akses.
3. Angka jumlah kecamatan/desa/TPS adalah konteks master data yang tercatat dalam diskusi; data operasional tetap mengikuti DATABASE resmi.
4. Penerapan larangan/pengingat perubahan referensi pada tahap tertentu mengikuti keputusan waktu pada Bab 7.1, tanpa perlu memperluas hak akses.
5. Dokumen ini menyusun hasil diskusi; kesesuaian dengan kode aplikasi aktual diverifikasi melalui rangkaian pengujian penerimaan bisnis otomatis (`npm test`).

---

## 17. Siklus Perencanaan Pra-NPHD, NPHD dan Pasca-NPHD
1. **RKB Pilkada 2024** adalah dokumen rujukan awal penyusunan **RKB Pilkada 2029**. Pusat Siklus Dokumen menyimpan dokumen rujukan, baseline yang telah disahkan, dan keterkaitan dokumen legalitas; RUH Belanja RKB tetap menjadi lembar kerja satu RKB aktif terpadu.
2. Tiga fase resmi: **Pra-NPHD** (pagu dinamis), **NPHD** (penetapan pagu resmi berdasarkan dokumen NPHD), dan **Pasca-NPHD** (revisi mengikuti pagu NPHD yang berlaku). Fase ditetapkan pada Tahap 4, terpisah dari pilihan Dasar Pengesahan/Acuan Hukum. Setiap baseline menyimpan fase saat disahkan.
3. Pra-NPHD tidak memiliki batas jumlah siklus. Setiap siklus tetap melalui Tahap 0–4 dan menghasilkan baseline baru pada pengesahan. Selesainya Tahap 4 tidak otomatis mengubah fase menjadi NPHD. Saat fase NPHD ditetapkan, siklus berikutnya otomatis berfase Pasca-NPHD. Tidak dibuat RKB kerja terpisah untuk setiap fase atau penolakan administratif.
4. Pagu Pasca-NPHD dikendalikan berdasarkan NPHD yang berlaku. Mekanisme khusus perubahan nilai NPHD melalui addendum, apabila diperlukan, tidak boleh diasumsikan di luar keputusan Pengembang.

---

## 18. Spesifikasi Fitur RUH Belanja RKB

### 18.1 Sumber data, tampilan dan struktur
RUH menampilkan satu RKB aktif, hierarki L1–L6, kode, uraian komponen/akun/rincian, PIC Subbag, Sasaran, rincian perhitungan (faktor × pengali), volume, satuan, harga satuan, jumlah anggaran, dan aksi baris. Navigasi yang terlihat mencakup pencarian uraian/kode, filter subbagian, sasaran, level, cakupan baris, ekspansi/kolaps cabang, pilihan baris aktif, Sanding, Resume, Audit Integritas, dan Unduh Excel. Fungsi detail tombol yang belum disepakati tidak boleh direkayasa.

#### Skema Penomoran Hierarki RKB (L1–L6 — Maksimal 5 Lapis Anak Level 4)

| Level | Sebutan Hierarki | Format Penomoran / Kode | Contoh pada RKB KPU Ngawi |
| :--- | :--- | :--- | :--- |
| **L1** | Bagian Utama (Grand Title) | Huruf Kapital (`A, B`) | `A. KEBUTUHAN BARANG DAN JASA`<br>`B. HONORARIUM POKJA DAN PENYELENGGARA` |
| **L2** | Kelompok Tahapan | Angka Romawi (`I., II.`) | `I. TAHAPAN PERSIAPAN DAN PELAKSANAAN`<br>`II. OPERASIONAL DAN ADMINISTRASI KANTOR` |
| **L3** | Tahapan / Kegiatan (RO SAKTI) | Angka Biasa (`1 s.d. 28`) | `4. Sosialisasi/Penyuluhan/Bimbingan Teknis`<br>`20. Pelayanan Administrasi Perkantoran` |
| **L4.1** *(Lapis 1)* | Metode / Komponen Utama | Huruf Kecil Titik (`a., b., c.`) | `a. Sosialisasi/Penyuluhan/Bimtek`<br>`b. Relawan Demokrasi` (atau `a. KPU Kab`, `b. PPK`, `c. PPS`) |
| **L4.2** *(Lapis 2)* | Bentuk Kegiatan / Sub-Komponen | Angka Kurung Tutup (`1), 2), 3)`) | `1) Sosialisasi Tatap Muka`<br>`2) Pemasangan Alat Peraga Sosialisasi`<br>`1) Alat Tulis Kantor (ATK)` |
| **L4.3** *(Lapis 3)* | Pelaksana / Sasaran / Sub-Bentuk | Huruf Kecil Kurung Tutup (`a), b), c)`) | `a) Dilaksanakan KPU Kabupaten`<br>`b) Dilaksanakan PPK`<br>`c) Dilaksanakan PPS` |
| **L4.4** *(Lapis 4)* | Segmen Sasaran / Aktivitas | Angka Kurung Penuh (`(1), (2), (3)`) | `(1) Tokoh Agama, Parpol, Ormas`<br>`(2) Pemilih Pemula`<br>`(3) Pemilih Perempuan` |
| **L4.5** *(Lapis 5)* | Sub-Segmen / Tahap Rapat | Huruf Kecil Kurung Penuh (`(a), (b), (c)`) | `(a) Rapat Persiapan`<br>`(b) Rapat Penjurian` |
| **L5** | **Akun Belanja (BAS — Pagar Akun)** | Kode 6 Digit (`52xxxx`) | `[521211] Belanja Bahan`<br>`[524114] Belanja Perjalanan Dinas Paket Meeting Dalam Kota` |
| **L6 Header** | Kelompok Rincian di Bawah Akun | Tanda Kurung Sudut (`>`) | `> Konsumsi`<br>`> Souvenir` |
| **L6 Item** | Detail Item Belanja | Strip Titik (`-.`) + Rumus Faktor | `-. Konsumsi Rapat (15 Org x 5 Keg x Rp 65.000 = Rp 4.875.000)` |

### 18.2 Penambahan baris berdasarkan baris aktif
Baris aktif `L1` mengaktifkan penambahan `L1/L2`; `L2` → `L2/L3`; `L3` → `L3/L4`; `L4` → `L4/L5`; `L5` → `L5/L6`; `L6` → `L6` saja. Penambahan level sama menciptakan sibling, satu level di bawah menciptakan child. Baris baru wajib terhubung pada parent yang sah dan berada pada cabang yang benar.

### 18.3 Pewarisan PIC dan Sasaran
Perubahan PIC atau Sasaran pada suatu baris induk otomatis diterapkan ke seluruh keturunannya sampai L6 (**top-down**). Perubahan pada anak tidak mengubah induk, saudara, maupun cabang lain. Jika hanya satu atribut berubah, atribut lain tidak ikut diubah. Dampak perubahan PIC wajib tercermin pada distribusi pagu RKB aktif.

### 18.4 Penghapusan hierarkis
Penghapusan baris L1–L5 menghapus baris terpilih dan seluruh keturunannya dalam cabang tersebut; penghapusan L6 hanya menghapus L6 itu. Penghapusan anak tidak menghapus induk atau cabang sejajar. Sebelum eksekusi tampilkan konfirmasi dan jumlah turunan terdampak; setelahnya hitung ulang subtotal, total, dan distribusi. Tetap patuhi status kunci RKB.

### 18.5 Pengurutan naik dan turun
Tombol naik/turun hanya menggeser baris di antara sibling selevel dengan parent yang sama; tidak boleh melewati batas parent. Bila baris mempunyai turunan, seluruh subpohon ikut berpindah. Tombol tidak aktif pada batas pertama/terakhir sibling. Pemindahan tidak mengubah PIC, Sasaran, nilai, maupun relasi induk–anak.

### 18.6 Distribusi pagu per subbagian pelaksana
Distribusi KUL, Rendatin, Teknis, Hukum, dan ParSDM selalu merupakan agregasi langsung dari rincian belanja L6 pada RKB aktif, bukan angka terpisah. Perubahan PIC, pewarisan PIC, penambahan/penghapusan rincian, atau perubahan nilai anggaran langsung menghitung ulang nominal, persentase, dan grafik. Perpindahan PIC tidak mengubah total RKB; subtotal parent tidak boleh dihitung ganda.

### 18.7 Keterkaitan REFERENSI dan DATABASE
Volume, faktor, dan harga yang wajib mengacu parameter SSOT, DATABASE, SBM, atau BAS harus memiliki relasi sumber yang dapat ditelusuri. Pembaruan nilai mengikuti aturan tahap dan perlindungan baris terkunci pada Bab 7. Peringatan waktu perubahan: Tahap 0 adalah waktu utama; Tahap 1 pengecualian revisi lintas divisi; Tahap 2 sebaiknya tidak mengubah; Tahap 3 untuk kebutuhan penyesuaian pleno; Tahap 4 tidak mengubah baseline disahkan. Pengingat tidak memperluas hak akses.

### 18.8 Penyimpanan Eksplisit Perubahan RUH Belanja (Draft Buffer, Pop-Up Konfirmasi, dan Sinkronisasi Referensi)
1. **Draf Sesi Sementara (Staged Draft Buffer):** Seluruh aksi perubahan pada lembar kerja **RUH Belanja RKB** (tambah baris rincian/akun/header, ubah rincian/volume/harga, hapus baris, ubah PIC/Sasaran/Akun/Catatan, serta geser urutan naik/turun) ditampung terlebih dahulu sebagai draf sesi di memori (tanpa membebani server atau penyimpanan permanen per ketukan tombol) hingga pengguna menekan tombol **`Simpan Perubahan RKB`**. Pengguna dapat membatalkan langkah terakhir (**Urungkan Terakhir**) atau membuang seluruh draf (**Batal Semua**) sebelum disimpan, dan peramban memberikan peringatan (`beforeunload`) apabila halaman ditutup saat masih ada draf yang belum disimpan.
2. **Pop-Up Konfirmasi Simpan:** Saat pengguna menekan **`Simpan Perubahan RKB`**, sistem menampilkan **Pop-Up Konfirmasi Simpan** yang memuat:
   - Ringkasan jumlah perubahan (`+Baris Baru`, `~Baris Diubah`, `-Baris Dihapus`, `↕Geser Urutan`),
   - Perbandingan dampak anggaran (**Pagu Semula**, **Pagu Menjadi**, dan **Selisih Netto**),
   - Tabel rincian baris yang terdampak (status, kode, uraian, PIC, nilai semula, nilai menjadi, dan selisih),
   - Kolom opsional **Catatan Penyimpanan** untuk memperkaya rekam jejak pada **Log Aktivitas**.
3. **Deteksi dan Sinkronisasi Perubahan Referensi Bersamaan (Concurrent Reference Sync):** Apabila saat pengguna sedang mengedit draf RUH Belanja terdapat perubahan pada data **REFERENSI** atau **DATABASE** (`PPK`, `PPS`, `TPS`, `Paslon`, `Kuantitas`, `SBM`, atau `BAS`) oleh pengguna lain/admin, sistem mendeteksi perubahan sidik jari versi referensi (`reference_version`), secara otomatis menghitung ulang draf RUH menggunakan nilai referensi terbaru, serta menampilkan **Banner Peringatan Sinkronisasi Referensi** di dalam Pop-Up Konfirmasi Simpan agar pengguna meninjau dan menyetujui angka terbaru sebelum komit permanen ke database.
4. **Pencegahan Tabrakan Perubahan Data (Optimistic Concurrency Control — OCC):**
   - Saat pengguna membuka lembar kerja RKB, sistem merekam sidik jari versi dokumen aktif di server (`rkb_version`).
   - Apabila saat pengguna sedang menyusun draf terdapat operator lain yang telah menyimpan perubahan terlebih dahulu, server menolak penyimpanan (HTTP 409 Conflict) dengan status `rkb_conflict: true`.
   - Draf pengguna di browser tidak hilang; sistem meminta pengguna meninjau atau memuat ulang data terbaru guna mencegah risiko tumpang tindih data (*lost updates*).

---

## 19. Audit Integritas Pra-Operasional RKB
Sebelum aplikasi dinyatakan siap berjalan, wajib tersedia pemeriksaan menyeluruh atas keterkaitan RKB aktif dengan DATABASE dan REFERENSI. Audit juga dapat dijalankan ulang setelah impor atau perubahan besar. Pemeriksaan ini adalah syarat verifikasi kesiapan, bukan tambahan tahapan revisi Tahap 0–4.
- **Kuantitas:** temukan angka seperti TPS, PPK, PPS dan parameter lain yang semestinya terkait sumber data tetapi masih manual/tidak terhubung. Angka manual yang memang sah tidak otomatis dianggap salah.
- **Harga satuan:** temukan harga yang semestinya mengacu SBM namun belum memiliki relasi, serta relasi referensi harga yang tidak valid.
- **Akun dan hierarki:** deteksi L6 tanpa induk L5, parent hilang/tidak sesuai, akun BAS tidak dikenal, serta hubungan induk–anak yang terputus.
- **Perhitungan:** cocokkan faktor, pengali, volume, harga satuan, jumlah rincian, subtotal parent, dan total RKB tanpa penghitungan ganda.
- **Konsistensi data:** tandai referensi yang tidak ditemukan/tidak berlaku dan ketidaksesuaian PIC/Sasaran menurut struktur yang telah ditetapkan.
- **Laporan audit:** setiap temuan menampilkan lokasi baris, jenis masalah, referensi yang diharapkan, dan arahan koreksi. Klasifikasi **Kritis**, **Peringatan**, dan **Valid**; temuan kritis harus diselesaikan sebelum kesiapan operasional dinyatakan.

Batas verifikasi: dokumen rancangan, screenshot, atau ekspor Excel saja tidak membuktikan relasi aktual backend. Pemeriksaan implementasi membutuhkan data sumber dan relasi sistem pada tahap pengujian oleh tim pengembang.

---

## 20. Pernyataan Penutup Canon
Si Prabu dikembangkan berdasarkan satu Blueprint Induk yang menjadi pedoman wajib bagi Pengembang dan AI. Satu RKB terpadu, kontrol PIC, proses revisi Tahap 0–4, baseline immutable, pembatasan akses, dan integritas dokumen merupakan ketentuan pokok yang tidak dapat diubah secara sepihak.

---

## 21. Menu Khusus Rekap Anggaran — Perencanaan dan Pelaksanaan
Menu utama baru: **REKAP ANGGARAN**, ditempatkan setelah **PENGANGGARAN** dan sebelum **REFERENSI**. Menu ini terpisah dari RUH Belanja karena seluruh rekap adalah keluaran olahan sistem, bukan lembar input.

### 21.1 Struktur menu dan keluaran
1. **Rekap Perencanaan** dan **Rekap Pelaksanaan** merupakan dua konteks/tahapan yang berbeda, bukan satu rekap dengan campuran sumber data.
2. Masing-masing menyediakan **Ringkasan Eksekutif**, **Rekap Kegiatan RKB (hanya sampai Level 3 / L1–L3)**, **Rekap Subbagian**, dan **Rekap Akun BAS**, mengikuti empat sheet rekap workbook resmi.
3. Seluruh halaman rekap **VIEW ONLY**: tidak ada tambah, ubah, hapus, atau input angka. Pencarian, filter, tampilan, dan unduhan diperbolehkan sesuai kewenangan.
4. Angka, subtotal, persentase, dan grafik dihitung otomatis; hasil layar dan ekspor untuk filter/sumber yang sama harus konsisten.

### 21.2 Rekap Perencanaan
1. **Sumber:** RKB aktif yang sedang disusun atau direvisi; perhitungan dan tampilan mengikuti perubahan sah pada RKB aktif.
2. **VIEW ALL seluruh anggaran:** Ketua, Divisi Perencanaan, Sekretaris, dan Level 1.
3. **Level 2:** hanya rekap sesuai kewenangan PIC/subbagian masing-masing; contoh PIC KUL hanya melihat rekap KUL.
4. **Komisioner lainnya:** hanya rekap sesuai kewenangan divisinya. Batasan berlaku pada setiap jenis rekap, rincian, agregasi, grafik, filter, dan file ekspor; tidak boleh bocor total lintas kewenangan.
5. Sediakan tombol **Unduh Excel (.xlsx)** dan **Unduh PDF (.pdf)**. Kedua ekspor hanya berisi data sesuai cakupan akses pengguna dan filter yang diterapkan.

### 21.3 Rekap Pelaksanaan
1. **Sumber resmi:** baseline RKB **TERAKHIR** yang telah disahkan dan dikunci pada Tahap 4, yaitu kunci terakhir sebelum RKB aktif terbaru untuk revisi berikutnya.
2. RKB aktif yang sedang direvisi tidak mengubah angka Rekap Pelaksanaan sampai revisi tersebut disahkan dan dikunci. Setelah Tahap 4 berikutnya, sistem otomatis mengganti sumber ke baseline terkunci paling mutakhir.
3. Tidak tersedia pilihan manual untuk menjadikan arsip RKB lama sebagai sumber utama Rekap Pelaksanaan.
4. **Akses sementara yang dikunci:** Ketua, Sekretaris, dan Level 1. PPK, PBJ, dan Bendahara belum diberikan akses; penambahan role dibahas kemudian.
5. Semua Rekap Pelaksanaan **VIEW ONLY**; tidak ada jalur edit atau transaksi belanja melalui menu rekap.

### 21.4 Kriteria penerimaan Rekap
- Uji akses PIC KUL: seluruh rekap dan ekspornya hanya menampilkan KUL; uji View All untuk Ketua, Divisi Perencanaan, Sekretaris, dan Level 1.
- Uji bahwa pembaruan RKB aktif mengubah Rekap Perencanaan tetapi tidak mengubah Rekap Pelaksanaan.
- Uji pengesahan Tahap 4: Rekap Pelaksanaan beralih otomatis ke baseline terkunci terbaru tanpa pilihan versi manual.
- Uji semua jenis rekap tanpa kontrol tambah/ubah/hapus; uji kesamaan angka pada layar, XLSX, dan PDF dengan sumber/filter yang identik.

---

## 22. Penandatangan pada Dokumen dan Hasil Ekspor Excel
Susunan blok penandatangan mengikuti konteks/tahapan dokumen yang dicetak atau diunduh, bukan satu format tanda tangan untuk semua penggunaan.

| Konteks | Penandatangan | Waktu penggunaan |
| :--- | :--- | :--- |
| **Perencanaan Divisi** | **Ketua Divisi dan Kasubag terkait** | Saat RKB divisi disiapkan untuk pengajuan |
| **Pengesahan Pleno** | **Ketua KPU bersama anggota KPU lainnya** | Saat seluruh dokumen divisi disahkan menjadi RKB lembaga |
| **Pengusulan, Pelaporan, dan Arsip Lembaga** | **Ketua KPU saja** | Saat dokumen digunakan secara resmi atas nama lembaga |

- Blok penandatangan pada keluaran Excel harus sesuai konteks dokumen dan konsisten saat dicetak.
- Jangan otomatis menambahkan seluruh penandatangan pleno ke dokumen pengusulan, pelaporan, atau arsip lembaga: untuk konteks tersebut **hanya Ketua KPU**.
- Identitas/jabatan dan format visual rinci mengikuti data serta format resmi yang disetujui, tanpa mengarang nama atau jabatan individu.

---

## 23. Struktur Menu Panduan Aplikasi (Perencanaan & Pelaksanaan) dan Pemisahan Regulasi
1. **Menu Mandiri `📜 Regulasi & Dasar Hukum` (`view-db-regulasi`):**
   - Dipisahkan dari folder `📁 Panduan` menjadi menu tingkat utama (*top-level menu*) di Sidebar agar pengguna dapat langsung merujuk regulasi pendukung (PKPU, KPT, PMK, NPHD) kapan saja, baik saat menyusun perencanaan maupun saat verifikasi pelaksanaan/pembayaran.
2. **Folder `📁 Panduan` Fokus 100% pada Panduan Penggunaan Aplikasi (`#folder-panduan`):**
   - Terdiri atas 2 sub-menu terpisah sesuai fase siklus anggaran:
     - **`📖 Panduan Perencanaan` (`view-panduan`):** Fokus murni pada alur penyusunan RKB, aturan edit RUH (Faktor 1–4 sebelum Harga Satuan), pengajuan revisi 3 tautan dokumen, validasi Tahap 2–3, pengesahan Tahap 4, dan pembacaan Rekap Perencanaan. Point 7 lama tentang Rekap Pelaksanaan telah dipindahkan sepenuhnya dari halaman ini.
     - **`💳 Panduan Pelaksanaan` (`view-panduan-pelaksanaan`):** Fokus pada penggunaan Rekap Pelaksanaan (berbasis RKB Sah Terakhir / Baseline Tahap 4) serta matriks kewenangan eksekusi & pembayaran.
3. **Isolasi Panduan Ketat Sesuai Hak Akses (*Strict Role-Based Guide Isolation* — Skalabel Level 0 s.d. Level 6):**
   - Sub-menu dan isi konten panduan difilter secara otomatis dan ketat mengikuti hak akses pengguna (`canAccessModulPerencanaan` & `canAccessModulPelaksanaan` serta `renderPanduanByRole`):
     - **Level 2 (PIC Subbagian):** Hanya melihat sub-menu dan konten `📖 Panduan Perencanaan` khusus Level 2 PIC (tanpa sub-menu atau pembahasan Rekap Pelaksanaan).
     - **Viewer Divisi (Level 3 tanpa akses Pelaksanaan):** Hanya melihat sub-menu dan konten `📖 Panduan Perencanaan` khusus Viewer.
     - **Ketua KPU, Sekretaris KPU (KPA), Level 1 (Rendatin), & Level 0 (Developer):** Melihat `📖 Panduan Perencanaan` (lengkap dengan panduan Validasi/Pleno/Tahap 4 & SSOT) serta `💳 Panduan Pelaksanaan`.
     - **Pengembangan Level 4, Level 5, dan Level 6 (PPK, PPSPM, Bendahara, Verifikator SPJ, Pelaksana Teknis/Adhoc):** Secara otomatis mendapatkan akses ke `💳 Panduan Pelaksanaan` sesuai cakupan otoritas eksekusi dan pembayarannya.

---

## 24. Arsitektur Smart Reactive Reference-to-RKB Linking (SSOT)
Setiap perubahan angka pada menu **REFERENSI / DATABASE** (`Master Desa & TPS`, `Master Kecamatan (PPK)`, `Master Pasangan Calon`, dan `Parameter Kuantitas & Koefisien SSOT`) secara otomatis dan seketika (*reactive*) memperbarui seluruh baris rincian belanja (`rab_baris`) yang terkait pada dokumen RKB aktif (`is_locked = 0`), sementara dokumen RKB historis yang telah dikunci (`is_locked = 1`) tetap terjaga utuh melalui mekanisme *snapshot*.

### 24.1 Alur Sinkronisasi Reaktif Otomatis (`syncPrimaryKuantitas` -> `syncRkbReferenceLinks`)
1. **Trigger Otomatis dari Seluruh Titik Perubahan Referensi:**
   - Pembaruan, penambahan, penghapusan, atau impor Excel pada **Master Desa & TPS** (`saveDesa`, `deleteDesa`, `bulkUpsertDesa`) — bilangan Pemilih/DPT selalu dibulatkan menjadi bilangan bulat utuh (`Math.round`) tanpa angka desimal di belakang koma.
   - Pembaruan pada **Master Kecamatan / PPK** (`saveKecamatan`, `deleteKecamatan`, `bulkUpsertKecamatan`).
   - Pembaruan pada **Master Pasangan Calon** (`savePaslon`, `deletePaslon`).
   - Pembaruan pada **Parameter Kuantitas & Koefisien SSOT** (`saveKuantitas`), termasuk perubahan formasi personil TPS, masa kerja badan adhoc, jumlah Parpol, maupun jumlah personil Sekretariat/Komisioner KPU.
   - Pembukaan siklus revisi baru (`clonePeriodeToRevision`).
2. **Agregasi Otomatis Parameter Turunan di `master_kuantitas` & `getKuantitasMap()`:**
   - `@tps_rkb` = $\sum \text{TPS seluruh Desa/Kelurahan}$ (`master_desa.tps`).
   - `@kotak_rkb` = $\sum \text{Kotak Suara seluruh Desa/Kelurahan}$ (`master_desa.kotak`).
   - `@pantarlih` = $\sum \text{Pantarlih seluruh Desa/Kelurahan}$ (`master_desa.pantarlih`).
   - `@dpt` / `@pemilih_dpt` = $\sum \text{Pemilih seluruh Desa/Kelurahan}$ (`master_desa.pemilih`, bilangan bulat).
   - `@surat_suara` = $\text{round}(\text{DPT} \times 1{,}025)$ (`Jumlah Pemilih (DPT) + Cadangan 2,5%`, dibulatkan menjadi bilangan bulat Lembar).
   - `@desa_pps` = Jumlah Desa/Kelurahan (`COUNT(master_desa)`).
   - `@kec_ppk` = Jumlah Kecamatan (`COUNT(master_kecamatan)`).
   - `@kpu_all` = `@komisioner` + `@sekretariat_kpu` (beserta pembaruan otomatis teks keterangan komposisi).
   - `@kpps_all` = `@kpps_ketua_tps` (`1`) + `@kpps_anggota_tps` (`6`) + `@linmas_per_tps` (`2`) = `9 Org/TPS`.
   - `@kpps_ketua` = `@tps_rkb` $\times$ `@kpps_ketua_tps`; `@kpps_anggota` = `@tps_rkb` $\times$ `@kpps_anggota_tps`; `@linmas_tps` = `@tps_rkb` $\times$ `@linmas_per_tps`; `@petugas_tps` = `@tps_rkb` $\times$ `@kpps_all`.

### 24.2 Matriks Pengikatan Otomatis (*Smart Auto-Binding*) ke Baris RKB (`rab_baris`)
| Kelompok Belanja RKB | Pengikatan Faktor (`f1_var`..`f4_var`) & `basis_pengali` | Perilaku Saat Referensi Berubah |
| :--- | :--- | :--- |
| **Honorarium KPPS & Linmas Tingkat TPS** (`3 KPPS > 521213`: `a. Ketua`, `b. Anggota`, `c. Linmas`) | `F1 = @kpps_ketua_tps` / `@kpps_anggota_tps` / `@linmas_per_tps` (`Org`), `F2 = @masa_kerja_kpps` (`Bulan`), `F3 = @tps_rkb` (`TPS`), `basis_pengali = FIXED` | Otomatis berubah saat jumlah **TPS** di Master Desa berubah, saat formasi **Ketua/Anggota KPPS atau Linmas per TPS** diubah, atau saat **Masa Kerja KPPS** diubah. |
| **Honorarium Pantarlih / PPDP** (`4 PPDP > 521213 > Honor Pantarlih`) | `F1 = @masa_kerja_pantarlih` (`Bulan`), `F2 = @pantarlih` (`Org`), `basis_pengali = FIXED`, `target_scope = PANTARLIH` | Otomatis berubah saat jumlah **Pantarlih** di Master Desa berubah atau saat **Masa Kerja Pantarlih** diubah. |
| **Perlengkapan & Konsumsi PPDP / Pantarlih** (Kaos Coklit PPDP, Konsumsi Pleno DPS/DPTb PPDP, Rapid Test Snack PPDP) | `F1 = @pantarlih` (`Org`), `F2 = 1 Buah / 1 Keg`, `basis_pengali = FIXED`, `target_scope = PANTARLIH` | Otomatis mengikuti jumlah **Pantarlih** terbaru (bukan lagi tertukar dengan angka TPS). |
| **Kebutuhan Per-Petugas TPS** (APD Masker/Face Shield, Vitamin/Suplemen, Rapid Test, & Konsumsi 9 Petugas TPS) | `F1 = @kpps_all` (`Org`), `basis_pengali = TPS_RKB` | Otomatis mengalikan formasi petugas per TPS (`@kpps_all`) dengan jumlah seluruh TPS (`@tps_rkb`). |
| **Bimtek, Formulir, & Logistik Berbasis TPS** (`basis_pengali = TPS_RKB` atau faktor bersatuan `TPS` dengan nilai $\ge 100$) | `f_var = @tps_rkb` dan/atau `basis_pengali = TPS_RKB` | Seluruh 108+ baris logistik, formulir, bimtek, dan pembuatan TPS otomatis berubah mengikuti `@tps_rkb`. Baris kunjungan sampel kecil (`< 100 TPS`, misal `5 TPS` Forkopimda) dilindungi agar tetap sesuai angka sampel. |
| **Distribusi Logistik Kotak Suara** (Faktor bersatuan `Kotak` dengan nilai $\ge 100$) | `f_var = @kotak_rkb` | Otomatis mengikuti jumlah **Kotak Suara** (`@kotak_rkb`), sedangkan satuan `kotak` bernilai kecil (`< 100`, misal kotak masker medis) dilindungi agar tidak berubah menjadi jumlah kotak suara. |
| **Honorarium & Operasional PPK / PPS** | `basis_pengali = PPK` / `PPS`, `f_var = @masa_kerja_ppk` / `@masa_kerja_pps`, `f_var = @ppk_all` / `@pps_all` | Otomatis mengikuti jumlah Kecamatan (`@kec_ppk`), jumlah Desa (`@desa_pps`), masa kerja, dan formasi personil PPK/PPS. |
| **Surat Suara, Alat Bantu, & Logistik Pemilih (DPT)** | `f_var = @dpt` (Formulir C.Pemberitahuan) & `f_var = @surat_suara` (Cetak Surat Suara + 2,5% & Sortir/Lipat Surat Suara) | Otomatis mengikuti total **Pemilih (DPT)** terbaru (`@dpt`) serta kalkulasi otomatis **`@surat_suara = DPT + 2,5%`** tanpa angka desimal. |
| **Fasilitasi Paslon, Parpol, & Personil KPU Kab.** | `f_var = @paslon`, `@paslon_parpol`, `@paslon_perseorangan`, `@parpol`, `@komisioner`, `@sekretariat_kpu`, `@kpu_all` | Otomatis mengikuti perubahan pada Master Pasangan Calon dan Parameter Kuantitas SSOT. |
| **Pembersihan Label Pengali Ganda pada Baris `FIXED`** | `if (basis !== 'NONE' && basis !== 'FIXED')` | Mencegah munculnya duplikasi teks `x 1 TPS` atau `x 1 Kotak` pada pratinjau formula baris yang sudah menggunakan `@tps_rkb` atau `@kotak_rkb` di Faktor F1–F4. |

---

## 25. Standar Sistematisasi Hierarki & Penomoran RKB Berbasis SAKTI (L1–L6 & Maksimal 5 Lapis Anak Level 4)
Merujuk pada disiplin pohon hierarki (*strict tree hierarchy*) pada output **RKKS SAKTI** (`Program -> Kegiatan/KRO -> RO -> Komponen -> Sub-Komponen -> Akun -> Header Detil -> Detil Belanja`), struktur RKB Hibah di SI-PRABU menerapkan arsitektur hierarki satu arah (**Opsi A — Pagar Pembatas Akun**) dengan ketentuan baku sebagai berikut:

### 25.1 Anatomi Pemetaan Level RKB SI-PRABU terhadap RKKS SAKTI (`master_penomoran` & `getHierarchyRank`)
| Level RKB | Padanan RKKS SAKTI | `level_indent` | `Rank` Mesin | Format Penomoran | Peran & Contoh Penulisan |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Level 1 (`L1`)** | Program (`076.01.CQ`) | `0` | `10` | **`A`, `B`** | **Kelompok Besar Anggaran:** `A. KEBUTUHAN BARANG DAN JASA` / `B. HONORARIUM` |
| **Level 2 (`L2`)** | Kegiatan / KRO (`6709.QGE`) | `1` | `20` | **`I.`, `II.`** | **Bagian / Tahapan:** `I. TAHAPAN PERSIAPAN DAN PELAKSANAAN` / `II. OPERASIONAL KANTOR` |
| **Level 3 (`L3`)** | Rincian Output / RO (`001`) | `2` | `30` | **`1` s.d. `28`** | **Kegiatan Utama:** `4. Sosialisasi/Penyuluhan/Bimbingan Teknis`, `20. Pelayanan Administrasi Perkantoran` |
| **Level 4.1** *(Lapis 1)* | Komponen (`051` / `052`) | `21` | `41` | **`a.`, `b.`, `c.`** | **Metode / Komponen Utama:** `a. Sosialisasi/Penyuluhan/Bimtek`, `b. Relawan Demokrasi` (atau `a. KPU Kab`, `b. PPK`, `c. PPS`, `d. KPPS`) |
| **Level 4.2** *(Lapis 2)* | Sub-Komponen (`A`, `B`, `C`) | `22` | `42` | **`1)`, `2)`, `3)`** | **Bentuk Kegiatan / Sub-Komponen:** `1) Sosialisasi Tatap Muka`, `2) Pemasangan Alat Peraga`, `1) Alat Tulis Kantor (ATK)` |
| **Level 4.3** *(Lapis 3)* | Sub-Subkomponen Lapis 1 | `23` | `43` | **`a)`, `b)`, `c)`** | **Pelaksana / Sasaran / Sub-Bentuk (Opsional):** `a) Dilaksanakan KPU Kabupaten`, `b) Dilaksanakan PPK`, `c) Dilaksanakan PPS` |
| **Level 4.4** *(Lapis 4)* | Sub-Subkomponen Lapis 2 | `24` | `44` | **`(1)`, `(2)`, `(3)`** | **Segmen Sasaran / Aktivitas (Opsional):** `(1) Tokoh Agama, Parpol, Ormas`, `(2) Pemilih Pemula`, `(3) Pemilih Perempuan` |
| **Level 4.5** *(Lapis 5)* | Sub-Subkomponen Lapis 3 | `25` | `45` | **`(a)`, `(b)`, `(c)`** | **Sub-Segmen / Tahap Rapat (Opsional):** `(a) Rapat Persiapan`, `(b) Rapat Penjurian` |
| **Level 5 (`L5`)** | **Akun BAS 6-Digit** | **`3`** | **`50`** | **`52xxxx`** | **PAGAR PEMBATAS AKUN:** `521211 Belanja Bahan`, `524114 Belanja Paket Meeting`, dll. |
| **Level 6 Header** | Header Kelompok (`>`) | `41` | `61` | **`>`** | **Kelompok Rincian di Bawah Akun (Opsional):** `> Konsumsi`, `> Souvenir` |
| **Level 6 Item (`L6`)** | Detil Belanja (`-`) | `4` (`item`) | `99` | **`-.`** | **Detil Rincian Belanja:** Baris item pemilik formula `F1..F4 x Pengali x Harga Satuan = Jumlah` |

### 25.2 Tiga Hukum Emas Sistematisasi Hierarki & Kalkulasi RKB
1. **Hukum Pagar Pembatas Akun (`Rank 50` — Anti Zig-Zag):**
   - Seluruh struktur organisasi dan penomoran kegiatan (`Level 4.1` s.d. `Level 4.5`: `a.` $\rightarrow$ `1)` $\rightarrow$ `a)` $\rightarrow$ `(1)` $\rightarrow$ `(a)`) **wajib ditempatkan di ATAS baris Kode Akun (`52xxxx`)**.
   - Di bawah baris Kode Akun (`52xxxx`, `Rank 50`), hanya boleh terdapat **Header Kelompok (`>`, `Rank 61`)** atau **Detil Rincian Belanja (`-.`, `Rank 99`)**. Dilarang menempatkan nomor Sub-Komponen baru di bawah Akun yang diikuti oleh Akun lain agar tidak terjadi penyedotan (*mis-nesting*) subtotal ke dalam cabang sebelumnya.
2. **Fleksibilitas Kedalaman Level 4 (1 s.d. 5 Anak Level):**
   - Suatu kegiatan tidak diwajibkan menggunakan kelima lapis Level 4 secara penuh. Kegiatan sederhana dapat berhenti di `Level 4.1 (a.)` atau `Level 4.2 (1))` dan langsung diikuti oleh `Level 5 (Akun 52xxxx)`.
   - Karena `Level 5 (Akun)` memiliki `Rank 50` (lebih besar dari `41..45`), mesin `getHierarchyRank()` secara otomatis mengikat baris Akun sebagai anak dari lapis Level 4 terakhir yang berada tepat di atasnya.
3. **Independensi Kalkulasi Vertikal (*Rollup*) dan Horizontal (*Rekap Akun BAS*):**
   - **Penjumlahan Vertikal (*Top-Down Rollup*):** Setiap baris induk (`L1` s.d. `L5` dan `Header >`) menghitung subtotalnya secara murni dari akumulasi baris `item` (`row_type = 'item'`) yang berada di dalam cabangnya.
   - **Penjumlahan Horizontal (*Rekapitulasi per Akun BAS*):** Setiap baris `item` menyimpan atribut `kode_akun` 6-digit di database (`rab_baris.kode_akun`), sehingga rekapitulasi pagu per Akun Belanja selalu dihitung dari `SUM(jumlah) WHERE row_type = 'item' GROUP BY kode_akun` tanpa risiko penjumlahan ganda (*double-counting*).

### 25.3 Contoh Baku Penerapan 5 Lapis Level 4 pada Kegiatan Kompleks (Kegiatan 4: Sosialisasi)
```text
L3   [4]       Sosialisasi/Penyuluhan/Bimbingan Teknis
 ├─ L4.1 [a.]      Sosialisasi/Penyuluhan/Bimbingan Teknis (Metode 1)
 │   ├─ L4.2 [1)]      Sosialisasi Tatap Muka
 │   │   ├─ L4.3 [a)]      Dilaksanakan KPU Kabupaten
 │   │   │   ├─ L5 [521211]    Belanja Bahan
 │   │   │   │   └─ L6 [-.]        Spanduk, ATK, Penggandaan
 │   │   │   ├─ L5 [522151]    Belanja Jasa Profesi (Narasumber)
 │   │   │   └─ L5 [524114]    Belanja Paket Meeting Dalam Kota
 │   │   ├─ L4.3 [b)]      Dilaksanakan PPK
 │   │   │   └─ L5 [521211]    Belanja Bahan -> [-.] Konsumsi & ATK PPK
 │   │   └─ L4.3 [c)]      Dilaksanakan PPS
 │   │       └─ L5 [521211]    Belanja Bahan -> [-.] Konsumsi & Spanduk PPS
 │   ├─ L4.2 [4)]      Pendidikan Pemilih kepada Masyarakat
 │   │   └─ L4.3 [a)]      Dilaksanakan KPU Kabupaten
 │   │       ├─ L4.4 [(1)]     Perundang-undangan dgn Tokoh Agama, Parpol, Ormas
 │   │       │   ├─ L5 [521211]    Belanja Bahan
 │   │       │   ├─ L5 [522151]    Belanja Jasa Profesi
 │   │       │   └─ L5 [524114]    Belanja Paket Meeting
 │   │       └─ L4.4 [(2)]     Pemilih Pemula -> L5 [521211 / 522151 / 524114]
 │   └─ L4.2 [9)]      Lomba Selfie di TPS
 │       └─ L4.3 [a)]      Dilaksanakan KPU Kabupaten
 │           ├─ L4.4 [(1)]     Persiapan dan Penjurian Lomba
 │           │   ├─ L4.5 [(a)]     Rapat Persiapan -> L5 [521211] -> [-.] Konsumsi
 │           │   └─ L4.5 [(b)]     Rapat Penjurian -> L5 [521211 / 522151]
 │           └─ L4.4 [(2)]     Hadiah Pemenang Lomba -> L5 [522191]
 └─ L4.1 [b.]      Relawan Demokrasi (Metode 2)
     └─ L4.2 [1)]      Pembentukan dan Kegiatan Relawan Demokrasi -> L5 [521211 / 521213]
```

---

## 26. Standar Tata Kelola Peran, Matriks Hak Akses Dinamis, dan Pengesahan Anggaran (Approver Substantif vs Sistem)

### 26.1 Hierarki 11 Tingkat Kewenangan Satker KPU Kabupaten Ngawi
Struktur otorisasi SI-PRABU menerapkan 11 tingkatan kewenangan berjenjang yang mencakup level Developer, Pejabat Satker, Pejabat Pimpinan/Komisioner, hingga Badan Ad Hoc:
1. **Level 0 — Lead Developer & System Architect (Sistem):** Superuser sistem dengan hak akses penuh, bypass pemeliharaan darurat, dan pengujian peran.
2. **Level 1 — Administrator Utama Satker (Rendatin):** Administrator teknis operasional satker, penanggung jawab manajemen pengguna, audit log, validasi usulan (Tahap 2 & 3), dan pencatatan pengesahan (Tahap 4).
3. **Level 2 — Pengolah Data Perencanaan Anggaran:** Tim penyusun dokumen anggaran RKB dan usulan revisi satker. Terisolasi dari menu administrasi sistem.
4. **Level 3 — Operator Pengelola Subbagian:** Operator penyusun anggaran tingkat subbagian pelaksana (`KUL`, `RENDATIN`, `TEKNIS`, `HUKUM`, `PARSDM`).
5. **Level 4 — Ketua KPU (Kepala Lembaga):** Peninjau eksekutif (*Executive Viewer*) pimpinan tertinggi satker atas konsolidasi anggaran hibah Pilkada.
6. **Level 5 — Anggota KPU Divisi Rendatin:** Peninjau eksekutif (*Executive Viewer*) pengampu divisi perencanaan dan anggaran satker.
7. **Level 6 — Anggota Komisioner KPU:** Peninjau eksekutif (*Executive Viewer*) kolektif kolegial divisi teknis, hukum, dan parmas.
8. **Level 7 — Sekretaris KPU / Kuasa Pengguna Anggaran (KPA):** Peninjau eksekutif (*Executive Viewer*) administrasi dan pertanggungjawaban keuangan satker.
9. **Level 8 — Pejabat Pembuat Komitmen & PBJ:** Pengelola komitmen belanja dan pengadaan barang/jasa satker.
10. **Level 9 — Badan Ad Hoc — PPK (Kecamatan):** Operator anggaran hibah di tingkat 19 Kecamatan se-Kabupaten Ngawi.
11. **Level 10 — Badan Ad Hoc — PPS (Desa/Kelurahan):** Operator anggaran hibah di tingkat 217 Desa/Kelurahan se-Kabupaten Ngawi.

### 26.2 Ketetapan Approver Substantif (Kolektif Kolegial) vs Pencatat Sistem (Rendatin Level 1)
1. **Prinsip Hukum Tata Kelola (Substantif):** Persetujuan (*approval*) perubahan RKB hibah NPHD sah secara hukum melalui **Rapat Pleno 5 Komisioner KPU** dan dituangkan dalam dokumen Berita Acara (BA) Pleno serta naskah RKB Final bertandatangan basah/elektronik resmi.
2. **Prinsip Operasional Software (Sistem):** Aplikasi SI-PRABU tidak menyediakan alur persetujuan digital bertingkat (tidak ada tombol approve per komisioner di aplikasi). Pencatatan hasil pengesahan fisik ke dalam sistem dilakukan secara terpusat oleh **Level 1 (Administrator Utama Satker / Rendatin)** atau Level 0 melalui pengunggahan nomor BA Pleno, tanggal, dan tautan scan naskah BA Pleno serta RKB Final.
3. **Status Pimpinan di Aplikasi:** Level 4 (Ketua KPU), Level 5 (Divisi Rendatin), Level 6 (Komisioner), dan Level 7 (Sekretaris/KPA) berkedudukan sebagai **Executive Viewer (Peninjau Eksekutif)** dengan hak akses *Read-Only* penuh terhadap monitoring revisi, RUH belanja konsolidasi, dan rekap anggaran.

### 26.3 Penegakan Peran Tunggal Aktif (*Strict Single Active Role / Anti-Cumulative Mode*)
1. Mode multi-peran kumulatif (*cumulative permissions*) dilarang keras di seluruh modul sistem (`role_mode = 'SWITCH'`).
2. Setiap pengguna dengan multi-peran hanya memiliki tepat satu peran aktif pada satu sesi.
3. Fungsi agregasi wewenang seperti `Math.min(levels)` dihapus secara permanen; seluruh evaluasi menu, hak edit, dan filter subbagian murni mengacu pada `active_role` tunggal.
4. Token otentikasi sesi menyimpan identitas peran aktif (`active_role`), dan developer yang beralih peran tetap mempertahankan verifikasi akun pengembang asal sehingga tidak ter-reset secara sepihak.

### 26.4 Matriks Hak Akses Menu Dinamis (*Decoupled Dynamic Menu Matrix* — `app_menu_matrix`)
1. Hak akses visibilitas terhadap 27 menu aplikasi diatur secara dinamis per tingkat kewenangan (L0 s.d. L10) melalui tabel `app_menu_matrix`.
2. Setiap kali peran pengguna berubah, antarmuka mengevaluasi matriks (`applyDynamicMenuMatrix`) dan menyembunyikan tombol navigasi yang tidak diizinkan (`allow_lX = 0`).
3. Jika pengguna berada pada tampilan yang tidak diizinkan untuk perannya saat ini, sistem secara otomatis mengalihkan navigasi ke Beranda/Dashboard (`view-dashboard`).

### 26.5 Isolasi Folder Navigasi Berdasarkan Hak Akses Anak (*Auto-Collapse Empty Folders*)
1. Folder navigasi grup (seperti *PENGANGGARAN*, *REKAP ANGGARAN*, *REFERENSI*, *DATABASE*, *PANDUAN*, dan *ADMINISTRASI*) secara otomatis memeriksa visibilitas seluruh menu anak di dalamnya.
2. Jika seluruh menu anak di dalam suatu folder berstatus `display: none`, folder induk tersebut wajib disembunyikan (`folder.style.display = 'none'`).
3. Khusus untuk Level 2 (Pengolah Data Perencanaan Anggaran), seluruh menu di dalam folder ADMINISTRASI (`view-penandatangan`, `view-db-settings`, `view-menu-matrix`, `view-audit`, `view-users`) diset `allow_l2 = 0`, sehingga folder ADMINISTRASI tersembunyi 100% dari pandangan Level 2.

### 26.6 Standardisasi Nomenklatur Jabatan Resmi KPU
1. Seluruh antarmuka pengguna (modal Ganti Peran, profil navbar, tabel hak akses, dan manajemen pengguna) wajib menggunakan sebutan kedinasan resmi KPU.
2. Istilah teknis SAKTI Kemenkeu seperti `APPROVER (KETUA KPU)`, `APPROVER (KOMISIONER TEKNIS)`, `VALIDATOR`, dan `OPERATOR (PERENCANAAN)` dilarang digunakan di antarmuka pengguna.

## BAB 27: STANDAR PENGUMUMAN SAKTI KEDINASAN, PENARGETAN LEVEL, DAN PROFIL MANDIRI PENGGUNA

### 27.1 Arsitektur Pemisahan Tegas: Pre-Login (Publik) vs Post-Login (Surat Dinas Kedinasan)
Sesuai arahan arsitektur Mas emenje, sistem mengimplementasikan pemisahan tegas (Strict Separation of Concerns) menjadi **hanya 2 habitat kategori**:
1. **Sebelum Login (`PRELOGIN` / Tamu & Publik):**
   - **Karakteristik Sesi:** Sistem belum mengenali siapa yang akan login (belum ada token, sesi, atau tingkat level akses).
   - **Peruntukan Konten:** Dikhususkan untuk informasi publik / tamu awal sesi (misal: himbauan integritas anti-gratifikasi UPG KPU RI, jadwal pemeliharaan server, dan kontak bantuan Helpdesk SI-PRABU).
   - **Ketentuan Tampil:** Pop-up pengumuman awal sesi **wajib selalu tampil sebelum login** bagi siapapun yang mengakses sistem.
   - **TIDAK ADA checkbox "Jangan tampilkan pesan ini lagi"**. Akses penutupan modal dilakukan eksklusif melalui tombol `[✖ Tutup]` atau ikon silang di sudut kanan atas.
   - **Tata Letak Dua Kolom:**
     - **Kolom Kiri (Branding & Contact Center):** Logo aplikasi SI-PRABU KPU Kabupaten Ngawi, judul "PENGUMUMAN", ilustrasi grafis SVG modern, dan kontainer kontak helpdesk kedinasan (Nama layanan, Call center/WhatsApp, email, dan portal resmi) dengan fitur *auto-hide*.
     - **Kolom Kanan (Kontainer Kartu Pengumuman):** Menampilkan kartu berbingkai modern dengan Tag Perihal (`#HIMBAUAN INTEGRITAS`, dll.), judul tebal, deteksi link otomatis, dan tombol lampiran dokumen.
   - **Isolasi Penuh:** Pengumuman Pre-Login tidak menyela dan tidak tayang berulang di dalam area kerja dashboard setelah pengguna login.

2. **Setelah Login (`POSTLOGIN` / Surat Kedinasan & Korespondensi Rentang Level):**
   - **Karakteristik Sesi:** Sistem telah mengautentikasi identitas pengguna, mengetahui NIK, nama pejabat, dan Level kewenangannya (Level 0 s.d. 10).
   - **Peruntukan Konten:** Dikhususkan untuk **korespondensi kedinasan internal satker** (perihal revisi anggaran, penatausahaan belanja RKB, arahan rapat pleno, disposisi pimpinan, dsb).
   - **Penyaringan Presisi Berbasis Level:** Begitu pengguna berhasil login (atau beralih peran), sistem memanggil `/api/announcements/my` dan menyaring pengumuman di mana `target_level_min <= userLevel AND target_level_max >= userLevel`.
   - **Isolasi Mutlak dari Publik:** Surat kedinasan Post-Login **100% diisolasi** dan tidak akan pernah bocor ke publik sebelum login.
   - **Modal Korespondensi Dinas:** Menampilkan identitas penerima (`👤 Ditujukan Kepada: [Nama Pejabat] • Level [X] - [Peran]`), label sasaran dinas, dan rincian arahan kedinasan.
   - **Pemberitahuan Terintegrasi di Dashboard & Navbar:**
     - **Banner Beranda:** Kotak pengumuman kedinasan elegan di bagian atas Dashboard Beranda (`#dashboard-announcement-banner`).
     - **Tombol Notifikasi Navbar:** Tombol `[📢 Pengumuman (N)]` di samping profil pengguna beserta item menu di profil dropdown untuk membaca ulang surat dinas sewaktu-waktu.
     - **Sesi Bebas Gangguan:** Status baca disimpan per sesi tab browser (`sessionStorage`), sehingga pop-up tidak berulang kali menyela navigasi halaman kecuali terdapat surat pengumuman baru.

3. **Masa Berlaku Dinamis (*Evergreen Support*):**
   - Pengumuman mendukung konfigurasi rentang tanggal penayangan (`tanggal_mulai` dan `tanggal_selesai`).
   - **Aturan Tanggal Kosong (Evergreen):** Apabila tanggal mulai dan tanggal selesai tidak diatur (kosong/null), pengumuman otomatis berstatus *Evergreen* (selalu tayang tanpa batas waktu selama status `is_active = 1`).

4. **Kategori Penayangan & Penargetan Level (Hapus Opsi Dual Layer):**
   - Opsi *Dual Layer* (campur aduk pre & post) dihapus total dari formulir dan logika sistem.
   - Formulir hanya menyediakan 2 pilihan murni:
     - `PRELOGIN`: 🚪 **Sebelum Login** — Khusus halaman awal sesi sebelum login (Papan Pengumuman Tamu / Publik). Pengaturan level otomatis dinonaktifkan (Level 0 s.d. 10).
     - `POSTLOGIN`: 🏛️ **Setelah Login** — Khusus setelah login untuk korespondensi kedinasan internal satker. Kotak pengaturan level otomatis muncul dengan pilihan preset cepat:
       - `[Semua Level (0-10)]`: Menjangkau seluruh jajaran satker.
       - `[Level 1–6 (Operator/Perencana)]`: Khusus operator, perencana, dan PPK.
       - `[Level 7–10 (Pimpinan/Pengesah)]`: Khusus pejabat penandatangan, sekretaris, dan komisioner pleno.
       - Serta selektor kustom Level Min s.d. Level Max.

### 27.2 Halaman Manajemen Pengumuman Satker (`view-pengumuman`)
1. **Lokasi & Otoritas Akses:**
   - Terdaftar sebagai menu ke-28 resmi di dalam folder `ADMINISTRASI` (`folder-administrasi`).
   - Otoritas akses dikunci eksklusif untuk **Level 0 (Lead Developer)** dan **Level 1 (Administrator Utama Satker / Rendatin)** melalui konfigurasi `allow_l0 = 1, allow_l1 = 1, allow_l2..10 = 0` pada tabel `app_menu_matrix`.
2. **Fitur Pengelolaan:**
   - Formulir konfigurasi kontak helpdesk kedinasan dinamis dengan tombol simpan langsung.
   - Tabel ringkasan seluruh pengumuman satker (Urutan, Perihal/Tag, Judul, Sasaran Pengguna, Masa Berlaku, Status Aktif, dan Aksi).
   - Modal form tambah & edit pengumuman dengan saran perihal cepat.
   - Tombol "Pratinjau Pop-Up (Preview)" untuk menguji tampilan pop-up awal sesi sebelum dipublikasikan.

### 27.3 Modal Profil Pengguna Modern ala SAKTI Kemenkeu & Kemandirian Profil (Self-Service)
1. **Desain Visual:**
   - Menggantikan dialog pop-up teks primitif lama (`alert()`) dengan modal kartu profil pegawai modern ala SAKTI Kemenkeu.
   - Header banner gradasi biru elegan dengan teks watermark peran kedinasan (`sakti developer`, `sakti administrator`, `sakti operator`, atau `sakti pimpinan`).
   - Avatar melayang (*floating circular avatar*) di tengah kartu, nama pejabat tebal, simbol gender kedinasan (`♂`/`♀`), dan badge biru `[✔] Akun Terverifikasi`.
2. **Koreksi Data Kedinasan (Koreksi Mas emenje):**
   - **TIDAK ADA Tanggal Lahir** dan **TIDAK ADA Kode UAKPB**.
   - Menyajikan data esensial 2 kolom:
     - Kolom Kiri (Data Pegawai): NIP Pegawai, NIK (KTP 16 digit), Email Terdaftar, Nomor HP / WhatsApp.
     - Kolom Kanan (Data Satker): Lembaga (`KOMISI PEMILIHAN UMUM`), Unit Kerja (`Komisi Pemilihan Umum`), Satker (`KPU KABUPATEN NGAWI`), Tingkat Kewenangan & Peran Aktif, Kode Satker (`657811`).
3. **Kemandirian Profil Pengguna (Self-Service):**
   - Pengguna sistem dapat melengkapi dan mengubah sendiri **Nomor HP / WhatsApp** dan **NIK** langsung dari modal profil melalui mode "Perbarui No HP & NIK".
   - **Proteksi Integritas RBAC:** Parameter sensitif sistem kedinasan lainnya (**Level Otoritas**, **Email Akun SSO Google**, **Username**, **Role ID**, **PIC Subbagian**) terkunci mati (*Read-Only*) dari perubahan mandiri pengguna guna mencegah eskalasi wewenang sepihak.
   - Validasi ketat diterapkan pada backend: NIK wajib berupa 16 digit angka jika diisi, dan nomor HP wajib berupa nomor telepon yang valid.

---

## BAB 28: ARSITEKTUR SIKLUS 3 MODUL HULU-KE-HILIR (PERENCANAAN • PENGADAAN • PEMBAYARAN) & BERANDA EKSEKUTIF 3 PILAR

### 28.1 Filosofi UX Berbasis Siklus Tahapan Pekerjaan (*End-to-End Lifecycle Navigation*)
1. Mengikuti standar UX sistem *Enterprise Government Financial Management* modern, navigasi SI-PRABU disusun mengikuti urutan kronologis siklus anggaran:
   - **Hulu (`📁 Perencanaan`):** Penyusunan RKB, revisi 4 tahap, standar 28 kegiatan KPT 543/2022, rekap perencanaan, dan panduan perencanaan.
   - **Tengah (`📁 Pengadaan` — `public/pengadaan.js`):** Pelaksanaan pengadaan barang/jasa 18 tahap hulu-ke-hilir, direktori penyedia, rekap pengadaan 5 tab, dan panduan pengadaan.
   - **Hilir (`📁 Pembayaran`):** Rekapitulasi pembayaran berbasis Pagu Baseline Sah, estimasi pajak/SP2D bendahara, dan panduan pembayaran.
2. **Kedudukan `📁 Referensi` sebagai Fondasi Rujukan Bersama:**
   - Menu `📁 Referensi` (`Parameter & Kuantitas SSOT`, `Standar Biaya Masukan (SBM)`, dan `Bagan Akun Standar (BAS)`) dipertahankan sebagai master referensi lintas modul yang menjadi rujukan bersama bagi **Perencanaan**, **Pengadaan**, maupun **Pembayaran**.
   - Sementara itu, `Standar 28 Kegiatan (KPT 543)` ditempatkan di dalam `📁 Perencanaan` karena merupakan pedoman struktur penyusunan program/kegiatan RKB.

### 28.2 Beranda Eksekutif Rekap 3 Modul (`#view-dashboard` — 100% Model Block Tanpa Tabel & Tanpa Tombol Pintasan)
1. Karena halaman **Beranda (`📊 Beranda`)** diakses oleh seluruh tingkatan pengguna (Level 0 s.d. Level 12), Beranda dirancang **100% berbasis Model Block (*Bento Card Grid*)**, **tanpa tabel data (`<table>`)**, dan **tanpa tombol pintasan menu** di dalam blok agar netral terhadap perbedaan hak akses menu per level.
2. Beranda menampilkan **4 Baris Blok Resume Besar**:
   - **Blok Baris 1 — 3 Kartu Utama Rekap Siklus Anggaran (`#dashboard-3modul-grid`):**
     - **Pilar 1 (`📐 1. Rekap Perencanaan (RKB)`):** Total Pagu Perencanaan, Lingkup Kabupaten vs Badan Adhoc, serta Volume Baris Rincian Belanja.
     - **Pilar 2 (`📦 2. Rekap Pengadaan (18 Tahap)`):** Total Nilai Kontrak Pengadaan, Pagu Paket & HPS, Efisiensi Pengadaan (Rp & %), Kepatuhan UMK & TKDN, serta Progres BAST & 18 Tahap.
     - **Pilar 3 (`💳 3. Rekap Pembayaran (Baseline Sah)`):** Pagu Sah Dasar Pembayaran, Estimasi Tagihan Netto SP2D & Potongan Pajak (PPN/PPh), Penyaluran Badan Adhoc, serta Dokumen Dasar Pengesahan Pleno.
   - **Blok Baris 2 — 5 Blok Resume Siklus 3 Modul Per Subbagian (`#dashboard-subbag-3modul-blocks`):**
     - Menampilkan 5 kartu blok (`TEKNIS`, `HUKUM`, `PARSDM`, `KUL`, `RENDATIN`) yang masing-masing merangkum porsi pagu satker (`%`) serta angka Perencanaan, Pengadaan (`Paket`, `Kontrak`, `Efisiensi`), dan Pembayaran (`Baseline Sah`).
   - **Blok Baris 3 — 6 Blok Resume Alokasi Berdasarkan Sasaran (`#dashboard-sasaran-blocks`):**
     - Menampilkan 6 kartu blok sasaran (`KPU Kabupaten`, `PPK 19 Kecamatan`, `PPS 217 Desa`, `KPPS / TPS`, `Pantarlih / PPDP`, dan `Peserta / Paslon`).
   - **Blok Baris 4 — Blok Grid Distribusi Bagan Akun Standar / BAS (`#dashboard-akun-blocks`):**
     - Menampilkan kartu-kartu blok per kode akun belanja 6-digit (`52xxxx`) beserta porsi persentase dan bar proporsi anggaran.

### 28.3 Pemisahan Tegas Sumber Data Modul & Konsolidasi Penamaan (`public/pengadaan.js` & `src/pengadaan/db_pengadaan.js`)
1. **Hukum Pemisahan Sumber Data Lintas Modul:**
   - **Modul 1 — Perencanaan (`📐 Perencanaan`):** Wajib menggunakan dokumen **RKB dari Pusat Siklus Aktif** (`getActivePeriode()`, baik berstatus draft revisi berjalan maupun aktif).
   - **Modul 2 — Pengadaan (`📦 Pengadaan`) & Modul 3 — Pembayaran (`💳 Pembayaran`):** Wajib menggunakan **Dokumen Terkunci Paling Baru (`getLatestRatifiedPeriode()`, `is_locked = 1`)** sebagai dasar hukum eksekusi kontrak dan pencairan anggaran.
   - Pada halaman **Beranda (`#view-dashboard`)**, angka **Perencanaan (Siklus Aktif)** dan angka **Pengadaan / Pembayaran (Dokumen Terkunci Terbaru)** ditampilkan terpisah sekaligus disandingkan pada setiap blok Subbagian, Sasaran, dan Bagan Akun Standar (BAS).
2. **Konsolidasi Penamaan Berkas Pengadaan & Pembersihan Kontainer Lama:**
   - Berkas frontend modul pengadaan menggunakan nama resmi **`public/pengadaan.js`** (menggantikan `cakra_module.js`), dan modul backend menggunakan folder **`src/pengadaan/`** (`src/pengadaan/db_pengadaan.js`, `src/pengadaan/pengadaan_schema_seed.js`, `src/pengadaan/pengadaan_schema_seed.sql`, `src/pengadaan/router.js`).
   - Seluruh kontainer Docker terpisah dari prototipe lama (`cakra_phpmyadmin`, `cakra_mysql`) telah dihapus permanen sehingga seluruh modul berjalan terpadu di dalam satu aplikasi **SI-PRABU v3.0** (`siprabu_db`).
3. **Unifikasi Pejabat Penandatangan (`📁 Administrasi > ✍️ Penandatangan`) & Penempatan `🏢 Master Penyedia (Rekanan)` di `📁 Database`:**
   - Seluruh pejabat penandatangan dokumen Satker (Ketua KPU, Sekretaris/KPA, PPK, Pejabat Pengadaan/PPBJ, Bendahara Pengeluaran, PPSPM/Kasubbag KUL, Komisioner Divisi, dan Kasubbag) dikelola terpusat pada **`📁 Administrasi > ✍️ Penandatangan`** (terhubung langsung ke `👥 Pengguna`), lengkap dengan **Nomor SK Penetapan** dan **Nomor Sertifikat Kompetensi PBJ (LKPP)** sebagai rujukan tunggal (*Single Source of Truth*) bagi seluruh cetakan dokumen `.docx` dan `.xlsx` pada Perencanaan, Pengadaan 18 Tahap, dan Pembayaran.
   - Direktori perusahaan rekanan ditempatkan di dalam **`📁 Database > 🏢 Master Penyedia (Rekanan)`** sebagai basis data entitas eksternal ke-4 yang melayani **Pengadaan** (kontrak, kualifikasi UMK, Beneficial Ownership, skor kinerja PPK) sekaligus **Pembayaran** (rekening bank tujuan SP2D/SPBy dan NPWP pemotongan pajak PPN/PPh).

---

## BAB 29: ARSITEKTUR KOKPIT PENGADAAN 18 TAHAP, ATURAN NASKAH RESMI KPU, DAN STANDAR UX SINGLE PRIMARY ACTION

### 29.1 Evaluasi & Penuntasan Tahap 1 s.d. Tahap 4 (Fondasi Fase Perencanaan & Awal Persiapan PPK)
1. **Penuntasan Fase 1 (Tahap 1 s.d. 3 — Perencanaan Pengadaan):**
   - **Tahap 1 (Identifikasi Kebutuhan PBJ):** Integrasi Nota Dinas Usulan Subbagian, Lembar Disposisi KPA, Formulir Analisis BMN/RKBMN, komparasi Belanja Modal vs Ekstrakomptabel, dan Formulir Identifikasi Kebutuhan Baku LKPP (Pasal 18–19 Perpres 46/2025 jo. Perlem LKPP 2/2026).
   - **Tahap 2 (Penetapan Jenis, Cara Pengadaan, dan Pemaketan):** Penentuan cara pengadaan (Penyedia vs Swakelola), metode pemilihan (E-Purchasing, Pengadaan Langsung, Tender), pembatasan kewenangan Pejabat Pengadaan (s.d. Rp 200 juta) vs Pokja Pemilihan (> Rp 200 juta), dan penegasan larangan memecah paket.
   - **Tahap 3 (Penetapan RUP oleh KPA & Pengumuman SiRUP LKPP):** Penetapan tunggal oleh KPA di kanan bawah tanpa tanda tangan PPK, penugasan teknis KPA kepada PPK untuk melanjutkan persiapan pengadaan, serta pencatatan Kode RUP resmi SiRUP LKPP.
2. **Penuntasan Gerbang Fase 2 (Tahap 4 — Penetapan KAK dan Spesifikasi Teknis):**
   - Penyusunan dan penetapan KAK / Spesifikasi Teknis oleh PPK (Pasal 23–25 Perpres 46/2025 jo. Bab V Perlem LKPP 2/2026).
   - Penegasan klausul target penggunaan Produk Dalam Negeri (PDN), target sertifikasi TKDN (contoh: TKDN minimal 40% / TKDN 42.50% + BMP 10.00%), pengutamaan Usaha Mikro dan Kecil (UMK), serta kriteria mutu (SNI / sertifikasi standar industri).
   - Dokumen Tahap 4 menjadi fondasi mutlak sebelum PPK melangkah ke Tahap 5 (Analisis Pasar & Penilaian Ketersediaan Barang/Jasa pada Katalog Elektronik).

### 29.2 Standarisasi Tipografi & Tata Naskah Dinas Resmi KPU (Word Engine SSOT)
Guna menjamin kepatuhan terhadap Keputusan KPU Nomor 1272 Tahun 2025 tentang Tata Naskah Dinas di Lingkungan KPU serta standar audit dokumen negara:
1. **Tipografi Tunggal Baku:** Seluruh naskah dinas Word (`.docx`) wajib menggunakan font **Cambria** (Body text ukuran 10.5pt atau 11pt, spasi paragraf 1.15, spacing before 0pt, spacing after 4pt) demi keterbacaan formal yang seimbang dan elegan.
2. **Kop Surat KPU Resmi:**
   - Memuat logo resmi KPU (resolusi tinggi) di sisi kiri.
   - Teks instansi kedinasan KPU berjenjang vertikal: `KOMISI PEMILIHAN UMUM KABUPATEN NGAWI`, alamat kantor, telepon, email dinas, dan portal web resmi.
   - **Garis Pemisah Kop:** Garis horizontal ganda (garis tebal di atas dan garis tipis di bawah) wajib diletakkan **tepat di bawah teks Kop Surat** pada halaman isi pertama, **bukan** di dalam Header Word yang mengambang di margin atas.
3. **Format List Numbering Baku Word (Tanpa Campuran Bullet):**
   - Menggunakan format paragraf dengan *hanging indent* Word asli (`pNum` dan `pSubNum`) dengan tab stop terukur, memastikan teks baris kedua rata lurus dengan huruf pertama baris pertama.
   - Larangan keras mencampuradukkan karakter bullet simbol (seperti titik bulat •, strip -, atau bintang *) di tengah penomoran hierarki huruf/angka (1., a., 1), a), dst).
4. **Validasi Pejabat & NIP SSOT Database:**
   - Seluruh nama pejabat penandatangan, jabatan kedinasan, dan NIP ditarik secara dinamis dari tabel `pbj_penandatangan` (Ketua KPU, KPA, PPK, Pejabat Pengadaan, Kasubbag).
   - Larangan menampilkan NIP dummy / nol; seluruh NIP wajib tervalidasi 18 digit resmi BKN.

### 29.3 Kebijakan Matriks Tombol Unduh Dokumen (8 Tahap Word & Excel vs 10 Tahap Word Saja)
Aplikasi SI-PRABU menerapkan pemilahan tajam berbasis substansi yuridis naskah di seluruh 18 tahap:
1. **Word (.docx) — Tersedia di Seluruh 18 Tahap:**
   - Setiap tahap menghasilkan naskah dinas resmi siap cetak (Berita Acara, Nota Dinas, Keputusan, Formulir LKPP, Pakta Integritas, Dokumen Kontrak, BAST, dsb.).
2. **Excel (.xlsx) — HANYA Muncul di 8 Tahap Teknis & Kertas Kerja:**
   - **Tahap 3 (RUP):** Kertas Kerja Konsolidasi RUP, Struktur Anggaran MAK, dan Pemilahan Swakelola vs Penyedia.
   - **Tahap 5 (Persiapan PPK / Analisis Pasar):** Kertas Kerja Analisis Pasar 3 Penyedia, Perbandingan Harga Pasar, dan Matriks Kesesuaian Spesifikasi Teknis.
   - **Tahap 6 (HPS):** Kertas Kerja Rincian Perhitungan HPS, Komponen Biaya Riil, Pajak (PPN 11%, PPh), dan AHSP.
   - **Tahap 9 (Negosiasi Harga & Teknis):** Kertas Kerja Evaluasi Penawaran, Riwayat Negosiasi Harga Satuan, dan Berita Acara Klarifikasi Teknis.
   - **Tahap 13 (Kontrak & BoQ):** Bill of Quantities (BoQ) Definitif, Jadwal Milestone Prestasi Kerja, dan Skema Termin Pembayaran.
   - **Tahap 15 (Pelaksanaan & CCO):** Matriks Contract Change Order (CCO), Addendum Kontrak, dan Kurva S Realisasi Fisik Mingguan.
   - **Tahap 17 (BAST, Pencatatan Aset & Pajak):** Rekapitulasi Rincian BAST BMN, Faktur Pajak PPN/PPh, Potongan Denda Keterlambatan, dan Resume SP2D Netto.
   - **Tahap 18 (Evaluasi Kinerja Penyedia):** Kertas Kerja Penilaian Kinerja Penyedia pada 4 Indikator (Kualitas, Biaya, Waktu, Layanan) sesuai aplikasi SIKaP LKPP.
3. **10 Tahap Word Saja (Tahap 1, 2, 4, 7, 8, 10, 11, 12, 14, 16):**
   - Menghilangkan tombol Excel secara otomatis dari antarmuka guna mencegah redudansi dan kebingungan pengguna pada tahapan yang murni bersifat ketetapan hukum/naskah naratif.

### 29.4 Restrukturisasi Antarmuka Kokpit Zero-Clutter & Single Primary Action
Menjawab temuan duplikasi tombol pada implementasi awal, tata letak antarmuka Kokpit 18 Tahap diselaraskan dengan prinsip *Strict Spatial Separation*:
1. **Toolbar Atas (Dock Aksi Terpadu):**
   - Menjadi **Pusat Aksi Tunggal (*Single Primary Action*)**:
     - `[✏️ Ubah Data Tahap N (Pop Up)]`: Tombol utama pintu masuk pengisian formulir dan perubahan data tahapan.
     - `[📄 Word Tahap N (.docx)]`: Tombol unduh naskah dinas resmi Word.
     - `[📊 Excel Tahap N (.xlsx)]`: Tombol unduh kertas kerja spreadsheet (kondisional 8 tahap).
     - `[📁 Berkas Lainnya ▼]`: Menu dropdown unduhan berkas pendukung dan dokumen gabungan.
   - Menghapus tombol `[💾 Simpan Draf]` dari toolbar atas karena kartu ringkasan di bawahnya berstatus non-editable resume.
2. **Card Resume Naskah Sah (Non-Editable Form Mati):**
   - Berfungsi murni sebagai **Pratinjau Naskah Sah (*Read-Only Executive Resume*)**.
   - Seluruh duplikasi tombol (`Unduh Word`, `Unduh Excel`, dan `Ubah via Pop Up`) di header kartu dihapus 100%.
   - Digantikan dengan badge status resmi yang tenang: `[📋 Pratinjau Naskah Sah (Non-Editable)]`.
3. **Baris Berkas Fisik Google Drive:**
   - Tombol ganda `Ubah via Pop Up` di baris Google Drive dihapus.
   - Baris ini murni menampilkan link dokumen fisik:
     - Jika tautan sudah ada: `[🔗 Buka di Google Drive]` (hijau).
     - Jika tautan masih kosong: `[+ Tautkan Berkas G-Drive (Pop Up)]` (kuning/oranye).
4. **Navigasi Sekuensial Bawah (Guided Footer Bar):**
   - Tombol duplikat `Ubah Data Tahap N` di footer dihilangkan.
   - Footer difokuskan murni sebagai pemandu alur sekuensial:
     - Jika tahapan sudah selesai: `[Lanjut ke Tahap (N+1) →]`.
     - Jika tahapan masih draft: `[✓ Selesaikan Tahap N & Lanjut →]` (primer hijau) dan `[Lewati ke Tahap (N+1) →]` (outline).


## 30. Standar Operasional Prosedur (SOP) & Spesifikasi Tahap 05: Analisa Pasar & Penilaian PPK atas Katalog Elektronik

### 30.1 Landasan Yuridis & Wewenang PPK
Tahap 5 (Fase II: Persiapan Pengadaan) dilaksanakan oleh Pejabat Pembuat Komitmen (PPK) berdasarkan:
1. **Pasal 38 ayat (1) huruf a dan ayat (2) Perpres No. 16/2018 jo. Perpres No. 46/2025:** Menegaskan kewajiban memprioritaskan metode E-Purchasing untuk barang/jasa yang telah tercantum dalam Katalog Elektronik.
2. **Pasal 8 Peraturan LKPP Nomor 2 Tahun 2026:** Mewajibkan PPK menguji dan menilai kelayakan produk katalog elektronik sebelum menetapkan referensi harga/HPS dan memerintahkan pelaksanaan transaksi e-purchasing.
3. **Keputusan Kepala LKPP Nomor 177 Tahun 2024:** Penyelenggaraan Katalog Elektronik Versi 6 (LKPP v6) dengan keterbukaan riwayat harga pasar, status penyedia, dan fasilitas negosiasi harga digital.
4. **Keputusan KPU Nomor 1272 Tahun 2025:** Pedoman Teknis Pengadaan Barang/Jasa di Lingkungan Komisi Pemilihan Umum.

### 30.2 Pengujian 5 Parameter Baku Kelayakan (Pasal 8 Perlem LKPP 2/2026)
PPK wajib memverifikasi dan mendokumentasikan 5 parameter kelayakan terhadap setiap komoditas:
1. **Kesesuaian Spesifikasi Teknis & Kualitas Mutu:** Memastikan produk yang tayang memenuhi spesifikasi KAK (misal: processor server multi-core, ECC RAM, redundant power supply, kartu grafis dedicated, dan legalitas OS resmi).
2. **Ketersediaan Produk & Kepastian Stok:** Konfirmasi ketersediaan barang (ready stock) dari distributor/prinsipal guna menjamin barang dapat dikirim dalam batas waktu pelaksanaan.
3. **Kewajaran Harga & Struktur Pembiayaan:** Harga tayang telah mencakup PPN 11%, garansi, ongkir franco wilayah kerja (Kabupaten Ngawi, Jawa Timur), serta berada di bawah Pagu Anggaran DIPA.
4. **Layanan Pengiriman & Service Level Agreement (SLA):** Kesanggupan waktu ekspedisi/pengiriman maksimal 14 hari kalender sejak penerbitan Surat Pesanan dan kesiapan penanganan kendala fisik.
5. **Jaminan Layanan Purna Jual & Garansi Onsite:** Jaminan garansi resmi pabrikan minimal 3 tahun Onsite NBD (Next Business Day) untuk PC Server dan 1 tahun untuk PC Workstation dengan dukungan Authorized Service Center resmi di Jawa Timur.

### 30.3 Strategi Pemenuhan Pasar: Penyedia Tunggal vs Multi-Order
Menjawab dinamika ketersediaan barang di mana penyedia katalog hanya memiliki 1 jenis barang yang memenuhi kualifikasi:
1. **Skenario A (Penyedia Tunggal / Agregator Multibrand):** Diterapkan apabila ditemukan penyedia terpercaya yang mampu memasok seluruh item paket secara komprehensif dalam 1 Surat Pesanan (SP).
2. **Skenario B (Multi-Vendor / Multi-Order dalam 1 RUP):** Dalam hal penyedia terbaik masing-masing hanya memiliki 1 jenis barang (misal: Vendor A khusus Server Enterprise Tier-1 dan Vendor B khusus Workstation TKDN), Pejabat Pengadaan secara hukum **DIBENARKAN** menerbitkan 2 Surat Pesanan terpisah (SP-01 Server dan SP-02 Workstation) di bawah satu paket RUP dan DIPA yang sama.
3. **Kepastian Kepatuhan Anti-Pemecahan Paket:** Skenario B **BUKAN PEMERIKSAAN/PEMECAHAN PAKET** yang dilarang Pasal 20 Perpres PBJ, karena metode pemilihannya tidak diturunkan ke non-tender/pengadaan langsung, melainkan tetap menggunakan E-Purchasing yang transparan dan kompetitif demi mengutamakan prinsip *Value for Money*.

### 30.4 Arsitektur Formulir Interaktif Tahap 5 di SI-PRABU (4 Blok Terstruktur)
1. **Blok 1 (Strategi Pemenuhan Pasar & Transaksi E-Purchasing):** Pemilihan Skenario A vs B, pilihan sub-metode E-Purchasing (Negosiasi Harga, Mini-Kompetisi, Beli Langsung), serta penjelasan yuridis multi-order.
2. **Blok 2 (Matriks Komparasi & Evaluasi 5 Parameter per Vendor per Barang dengan Fitur Checklist All):** Evaluasi detail 5 parameter kelayakan per vendor per item (Pasal 8 Perlem LKPP 2/2026), tombol Master `[⚡ Centang Semua Lolos (5/5 Seluruh Barang & Vendor)]`, tombol mikro `[⚡ 5/5 Lolos]` per vendor, live badge status kelayakan (`✓ 5/5 Lolos Uji`, `⚠️ 3-4/5 Catatan`, `✗ <3 Gugur`), komparasi harga survei, dan penyimpanan persisten ke kolom `evaluasi_pasar_json` di tabel `pbj_paket_item`.
3. **Blok 3 (Ikhtisar Baku 5 Parameter Baku Kelayakan):** Pratinjau status pemenuhan kelayakan 5 parameter sesuai Pasal 8 Perlem LKPP 2/2026.
4. **Blok 4 (Kesimpulan PPK & Tautan Berkas):** Tombol cerdas `[⚡ Susun Otomatis Narasi PPK]`, textarea justifikasi formal PPK yang terisi otomatis berdasarkan hasil centang parameter vendor, tautan produk e-Katalog 1 & 2, dan tautan Google Drive dokumen sah bertandatangan.

### 30.5 Standar Output Berkas Tahap 5
- **Word (.docx):** `05_Berita_Acara_Analisa_Pasar_dan_Penilaian_PPK_Katalog.docx` (Font Cambria, Kop Surat Resmi KPU Ngawi, 5 Bab Evaluasi Komprehensif, Tabel Komparasi, Tabel 5 Parameter, dan Blok Tanda Tangan PPK).
- **PDF (.pdf):** `05_Berita_Acara_Analisa_Pasar_dan_Penilaian_PPK_Katalog.pdf` (Versi cetak sah 201 KB).
- **Excel (.xlsx):** `Kertas_Kerja_Analisa_Pasar_dan_Komparasi_Harga_Tahap_05.xlsx` (Kertas kerja formula matematis komparasi 3 sumber pasar dan evaluasi kelayakan).

### 30.6 Validasi Pejabat Penandatangan SSOT (Strictly Tanpa Gelar)
- **Kuasa Pengguna Anggaran (KPA):** `BUDI RAHAYU` (NIP 19830503 200902 1 002) — Tanpa Gelar
- **Pejabat Pembuat Komitmen (PPK):** `MOHAMMAD NOOR JIHAN` (NIP 19840101 200912 1 001) — Tanpa Gelar
- **Pejabat Pengadaan:** `INDRAYU FATIKA MAHARDIKA` — Tanpa Gelar
- Kepatuhan penuh terhadap Keputusan KPU Nomor 1272 Tahun 2025.


---

## 31. ARSITEKTUR TAHAP 4 & TAHAP 5 UNIFIED SUITE: EDITOR ITEM KAK, ALTERNATIF VERTIKAL COLLAPSIBLE, & PEMISAHAN TUPOKSI PPK-PP

### 31.1 Latar Belakang & Prinsip Pembenahan Terpadu
Berdasarkan arahan strategis arsitektur dari Mas emenje (PPK Satker 657811 KPU Kabupaten Ngawi) pada siklus simulasi Paket `PBJ-2026-001`, modul Tahap 4 (Penetapan KAK & Spesifikasi Teknis) dan Tahap 5 (Analisa Pasar & Penilaian Kelayakan Katalog) disempurnakan secara terintegrasi (*Unified Suite*) untuk menegakkan:
1. **Dinamisasi Item Kebutuhan Hulu-ke-Hilir:** Nama barang, spesifikasi teknis detail, volume, dan pagu anggaran satuan diinput dan dikelola di Tahap 4 sebagai SSOT, kemudian mengalir secara otomatis menjadi objek telaah komparasi di Tahap 5.
2. **Netralitas Absolut PPK dalam Pengujian Pasar:** Menghilangkan seluruh bias rekomendasi sepihak (seperti label *"Vendor Rekomendasi"* atau *"Pilihan PPK"*). PPK bertugas menguji kelayakan parameter secara objektif tanpa mengunci pilihan penyedia.
3. **Pemisahan Kewenangan (Tupoksi) PPK vs Pejabat Pengadaan (PP):** Sesuai Pasal 12 ayat (1) huruf a Perpres PBJ jo. Perpres 46/2025, pelaksanaan transaksi, pemilihan penyedia terbaik, negosiasi harga, dan penerbitan Surat Pesanan (baik Skenario Penyedia Tunggal maupun Multi-Order SP-01 & SP-02) merupakan kewenangan atributif Pejabat Pengadaan (PP).
4. **Ergonomi Kerja UI (Vertical Collapsible Cards):** Mengganti tata letak 3 kolom horizontal yang sempit dengan susunan kartu vertikal yang dapat dilipat (*accordion*), dilengkapi ringkasan status di header kartu.

### 31.2 Fitur Baru Tahap 4: Editor Rincian Item KAK & Validasi Pagu DIPA
- **Kontainer Dinamis (`#t4_items_container`):** Mendukung penambahan (`[➕ Tambah Item Barang]`) dan penghapusan (`[🗑️ Hapus]`) item barang secara bebas (fleksibel untuk 1, 2, 3, 4+ item).
- **Atribut Rincian Item Barang:**
  - Nama / Uraian Kebutuhan Barang (cth: *PC Server Tower Database Operasional*, *PC Workstation SIDALIH*).
  - Volume & Satuan (cth: 1 Unit, 3 Unit).
  - Alokasi Pagu Satuan (Rp) & Kalkulasi Subtotal Pagu otomatis.
  - Rincian Spesifikasi Teknis Fungsional Detail KAK (Processor, RAM, Storage RAID, OS legal, PSU redundant, Garansi).
  - Target Capaian TKDN (%) & Klasifikasi Penatausahaan BMN/SAKTI (*Aset Tetap BMN*, *Persediaan*, *Jasa/Habis Pakai*).
- **Validasi Pagu Real-Time:** Menghitung total pagu seluruh item secara instan terhadap Pagu DIPA Paket (`Rp 145.000.000,-`), menampilkan badge status:
  - `✅ Pagu Item Sesuai Pagu Paket (100%)` jika total tepat sama.
  - `⚠️ Sisa Pagu Belum Dialokasikan` jika total di bawah pagu.
  - `❌ Pagu Item Melebihi Pagu Paket` jika total melebihi batas DIPA.
- **Persistensi Data:** Tersimpan langsung ke tabel `pbj_paket_item` melalui endpoint `POST /api/cakra/paket/:id/items`.

### 31.3 Fitur Baru Tahap 5: Kartu Alternatif Vertikal Collapsible & Uji 5 Parameter Netral
- **Blok 1: Skenario Transaksi Pasar & Sub-Metode E-Purchasing:**
  - Pilihan Skenario A (Penyedia Tunggal / Agregator Multibrand) atau Skenario B (Multi-Order / SP-01 & SP-02 Terpisah).
  - Sub-Metode: Negosiasi Harga, Mini-Kompetisi, Beli Langsung.
  - Edukasi Yuridis: Menegaskan bahwa Multi-Order bukan pemecahan paket (Pasal 20 Perpres PBJ).
- **Blok 2: Matriks Alternatif Vertikal & Accordion:**
  - Kartu alternatif disusun vertikal dan dapat dilipat (*collapsible accordion*).
  - Header Accordion menampilkan ringkasan langsung: `▼ Alternatif X: [Vendor] — [Produk] (Rp ...) | Status: 5/5 Lolos`.
  - Penamaan netral: `Alternatif 1`, `Alternatif 2`, `Alternatif 3`, dst.
  - Tombol dinamis: `[➕ Tambah Alternatif]` dan `[🗑️ Hapus Alternatif]`.
  - **Tautan E-Katalog v6:** Diletakkan langsung di dalam kartu alternatif per vendor per barang (`alt-inp-url`).
  - **Form Khusus SLA Pengiriman:** Input angka hari kalender (`alt-inp-sla`).
  - **Form Khusus Masa Garansi:** Dropdown opsi garansi resmi onsite (3 Tahun, 2 Tahun, 1 Tahun, atau *"Tidak Dipersyaratkan / N/A"* untuk bahan habis pakai/jasa). Jika dipilih *Tidak Dipersyaratkan*, checkbox garansi otomatis tercentang dan terkunci.
  - **Checklist 5 Parameter Uji Kelayakan Baku (Pasal 8 Perlem LKPP 2/2026):** Spek Teknis KAK, Ketersediaan Stok Ready, Kewajaran Harga, SLA Kirim, Garansi Resmi Onsite.
  - **Aksi Cepat:** Tombol `[⚡ Centang Semua]` per alternatif dan tombol global `[⚡ Centang Semua Lolos (Seluruh Barang & Alternatif)]`.
- **Blok 3: Kesimpulan Kelayakan PPK & Delegasi ke PP:**
  - Status ketersediaan di Katalog Elektronik v6 (Dropdown).
  - Textarea justifikasi formal PPK dengan tombol `[⚡ Susun Otomatis Narasi PPK]`. Narasi menegaskan pemenuhan 5 parameter dan menyerahkan mandat pemilihan rekanan serta eksekusi transaksi ke Pejabat Pengadaan (PP).
  - *Blok 3 Ikhtisar lama dihapus (Opsi B disepakati karena redundan).*

### 31.4 Sinkronisasi Dokumen Naskah Dinas (.docx / .pdf / .xlsx)
- **Tabel KAK Tahap 4 Word (.docx):** Merender tabel terstruktur rincian kebutuhan barang, volume, pagu satuan, subtotal, spesifikasi teknis fungsional, dan klasifikasi BMN.
- **Tabel Analisa Pasar Tahap 5 Word (.docx):** Merender matriks alternatif per item barang dengan label netral `Alternatif 1`, `Alternatif 2`, `Alternatif 3`, status skor `5/5 LOLOS UJI`, tautan katalog, SLA, garansi, serta Bab V yang menegaskan netralitas PPK dan penyerahan transaksi ke Pejabat Pengadaan.
- **PDF Resmi:** Dikonversi langsung melalui Microsoft Word COM Object dengan layout presisi tanpa teks bergeser.
- **Excel Kertas Kerja (.xlsx):** Kertas kerja komparasi matematis dengan formula aktif.
- **Integritas Penandatangan SSOT (Strictly Tanpa Gelar):**
  - KPA: `BUDI RAHAYU` (NIP 19830503 200902 1 002)
  - PPK: `MOHAMMAD NOOR JIHAN` (NIP 19840101 200912 1 001)
  - PP: `INDRAYU FATIKA MAHARDIKA`
