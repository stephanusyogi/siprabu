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

### [KESEPAKATAN-01] Visi, Ruang Lingkup & Fondasi Modul SI-PRABU
- **Definisi Aplikasi:** **SI-PRABU** (*Sistem Perencanaan dan Belanja Terpadu*) adalah aplikasi yang dirancang untuk **Perencanaan** dan **Pelaksanaan** Anggaran **Pilkada Serentak Tahun 2029**.
- **Struktur Modul Perencanaan:** Terdiri dari 2 (dua) fase utama ditambah fase penetapan NPHD:
  1. **Pra-NPHD (Pagu Dinamis):** Plafon/pagu anggaran bersifat dinamis (mengikuti perubahan/akumulasi rincian kebutuhan yang disusun).
  2. **NPHD (Penetapan Pagu Resmi):** Penetapan pagu resmi berdasarkan dokumen NPHD yang ditandatangani.
  3. **Pasca-NPHD (Pagu Statis):** Plafon/pagu anggaran bersifat statis (terkunci tetap pada nilai NPHD yang telah disahkan).
- **Fokus Pengembangan Saat Ini:**
  - **Fokus Aktif:** **Modul Perencanaan** (Pra-NPHD, NPHD & Pasca-NPHD) beserta **Menu Mandiri Rekap Anggaran (Perencanaan & Pelaksanaan)**.
  - **Target Pengembangan Ke Depan:** **Modul Pelaksanaan Transaksional**.

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

### 4.3 Detail Tahap 4
- Tiga tautan Google Drive terpisah dan wajib: **BA Pleno**, **RKB final bertanda tangan**, dan **KAK gabungan**.
- Tautan diverifikasi secara manual sebelum pengesahan.
- Sesudah pengesahan, hanya **Level 1 Kasubag Rendatin** dapat mengoreksi tautan dokumen, dengan audit log; koreksi tautan tidak mengubah baseline.

---

## 5. Modul Penganggaran

| Menu | Fungsi utama |
| :--- | :--- |
| **RUH Belanja RKB** | Menampilkan/mengedit satu RKB terpadu, hierarki L1–L6, PIC, subtotal, dan ekspor sesuai hak. |
| **Pengajuan Usulan Revisi** | Pengajuan Tahap 1, dokumen wajib, konfirmasi, dan penguncian PIC. |
| **Validasi Revisi** | Validasi Tahap 2 dan Tahap 3 beserta keputusan, alasan penolakan, dan status PIC. |
| **Pengesahan BA Pleno** | Verifikasi dokumen Tahap 4, pengesahan baseline, dan penutupan siklus. |
| **Monitoring Revisi** | Status per PIC, alasan penolakan, jejak tahap, dan pemantauan siklus. |
| **Pusat Siklus Dokumen** | Arsip anggaran awal dan seluruh baseline disahkan beserta dokumen pendukung; menyatukan fungsi riwayat arsip revisi dalam satu tampilan terpadu (dilengkapi aksi buka rincian RKB, sanding semula vs menjadi, unduh Excel, dan koreksi tautan). |

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
| **DATABASE** | Master Kecamatan (19 PPK); Master Desa & TPS (217 PPS); Master Pasangan Calon; Pengaturan Satker KPU | **Level 1**; **Level 3 Sekretaris** dan **Divisi Rendatin** melihat saja. |

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

## 8. PANDUAN dan Menu Mandiri
1. **PANDUAN** terbagi menjadi 3 menu navigasi mandiri terpisah: **Panduan Perencanaan**, **Panduan Pelaksanaan**, dan **Regulasi & Dasar Hukum** (Bab 23). Seluruh pengguna dapat membaca; **Level 0** dan **Level 1** berwenang mengelola konten.
2. **Monitoring Unduhan**, **Manajemen User**, **Log Aktivitas**, serta **Blueprint & PRD (DEV)** adalah menu mandiri pada navigasi utama, bukan submenu PANDUAN.

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

## 10. Matriks Kewenangan Inti

| Fitur | Kewenangan Canon |
| :--- | :--- |
| **Manajemen User** | **Level 0** dan **Kasubag Rendatin** saja; kewenangan Rendatin ini melekat pada jabatan Kasubag, bukan seluruh akun divisi. |
| **Log Aktivitas** | **Level 0** dan **Kasubag Rendatin** saja (Bab 14.1). |
| **Blueprint & PRD (DEV)** | **Level 0** saja. |
| **Ganti Peran untuk uji** | **Level 0** saja. |
| **Validasi Tahap 2 dan 3** | **Level 1**. |
| **Pengesahan Tahap 4** | **Level 1**. |
| **Revisi PIC pada Tahap 0** | **Level 2** hanya PIC masing-masing; pengecualian Level 1 sebagaimana aturan. |
| **REFERENSI — edit** | **Level 0** dan **Level 1**. |
| **DATABASE — edit** | **Level 1**. |
| **Unduh XLSX semua PIC dan ZIP** | **Level 1**. |
| **Unduh Level 2** | Hanya RUH dan Matriks Revisi sesuai PIC. |

- Semua pembatasan harus ditegakkan di backend, bukan hanya dengan menyembunyikan menu atau kontrol antarmuka.

---

## 11. Ganti Peran untuk Pengujian
1. Fitur **Ganti Peran** hanya tersedia bagi **Level 0** sebagai alat uji fitur web.
2. **Badge Login Tetap Permanen:** Akun login, nama profil (`emenje (Pengembang)`), avatar, dan badge kanan atas tetap **LEVEL 0: DEVELOPER** (tidak ikut berubah menjadi nama/badge peran simulasi); hanya pemilih `Ganti Peran`, tampilan halaman, menu navigasi, filter, dan fitur aplikasi yang menyesuaikan peran baru.
3. **Pop-Up Validasi Ganti Peran & Start dari Dashboard:** Saat memilih peran simulasi pada dropdown `Ganti Peran`, sistem memunculkan **Pop-Up Validasi Ganti Peran** yang menampilkan detail peran tujuan beserta cakupan hak aksesnya. Sementara Pop-Up tampil, sistem di latar belakang menyiapkan penyegaran sesi, menyesuaikan hak akses fitur/menu serta filter subbagian, dan memuat halaman baru dimulai dari **Beranda / Dashboard (`#view-dashboard`)** sesuai peran yang dipilih.
4. Simulasi tidak mengubah data akun permanen dan tidak dapat meningkatkan kewenangan backend di luar ketentuan peran uji.
5. Audit tindakan selama simulasi membedakan identitas asli dan peran simulasi; logout menghapus simulasi.

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

Sistem Audit Log SI-PRABU dirancang sebagai fondasi transparansi hukum, akuntabilitas anggaran, dan keandalan data pengelolaan dana hibah Pilkada. Seluruh aktivitas perencanaan dokumen, perubahan belanja, validasi siklus, pemutakhiran master referensi, serta hak akses pengguna dicatat secara permanen, transparan, dan tidak dapat diubah (*immutable*).

---

### 14.1 Prinsip Dasar & Hak Akses Eksklusif Log Aktivitas
1. **Hak Akses Terbatas & Eksklusif:**
   - Menu **Log Aktivitas** pada navigasi utama dibatasi secara ketat dan hanya dapat dibuka oleh:
     1. **Lead Developer / System Architect (`emenje` / Level 0)**
     2. **Kasubag Rendatin (Perencanaan, Data dan Informasi / Level 1)**
   - Staf Rendatin, Operator Subbagian (Level 2), dan Pimpinan/Komisioner (Level 3) **ditolak tegas** demi kerahasiaan jejak digital dan kepatuhan pengawasan internal.
2. **Kekekalan Rekam Jejak (Immutability):**
   - Catatan pada Log Aktivitas bersifat *Read-Only Murni*.
   - Tidak ada tombol, antarmuka, maupun fungsi sistem yang dapat mengubah (*edit*) atau menghapus (*delete*) riwayat aktivitas yang sudah tercatat.
3. **Penyimpanan Permanen di phpMyAdmin:**
   - Seluruh data log tersimpan langsung pada tabel `audit_log` dan `audit_log_perubahan` di basis data MySQL phpMyAdmin (`siprabu_db`). Data ini abadi dan tidak akan pernah terhapus saat aplikasi diperbarui atau saat server restart.

---

### 14.2 Enam Kelompok Aktivitas yang Wajib Dicatat
Setiap peristiwa di dalam sistem secara otomatis dikelompokkan ke dalam salah satu dari 6 kategori resmi:

| Kelompok | Cakupan Aktivitas | Data Kunci yang Dicatat |
| :--- | :--- | :--- |
| **1. RKB** | Perubahan rincian belanja pada lembar kerja RUH Belanja (tambah/ubah/hapus baris, ganti PIC, ganti Sasaran, ganti Akun, dan geser urutan). | Pagu Semula, Pagu Menjadi, Selisih Netto Anggaran, Ringkasan Perubahan (jumlah baris baru/ubah/hapus), serta Catatan Justifikasi Pengguna. |
| **2. SIKLUS** | Tahapan usulan dan pengesahan revisi (Pengajuan Tahap 1, Verifikasi Tahap 2, Pleno Tahap 3, Pengesahan Tahap 4, dan Koreksi Tautan Dokumen Resmi). | Nomor & Tanggal Surat, Kode Revisi, Catatan Pengembalian/Pleno, Nomor & Tanggal Berita Acara (BA), serta tautan berkas sah (RKB Final, KAK, BA Pleno). |
| **3. MASTER** | Pemutakhiran referensi dan database master (Kecamatan PPK, Desa/TPS PPS, Paslon, Parameter Kuantitas SSOT, Standar Biaya SBM, dan Bagan Akun BAS). | Nilai parameter semula vs menjadi, dampak perhitungan terhadap rumus anggaran turunan, dan log impor massal Excel. |
| **4. USER** | Pengelolaan pengguna satker (Tambah akun, ubah profil/role, ubah hak PIC, nonaktifkan akun, dan reset sandi). | Nama pejabat, username, jabatan, pergeseran level wewenang, dan pencabutan sesi aktif pengguna terkait. |
| **5. AUTH** | Autentikasi dan sesi login (Login Sandi, Login Google SSO, Logout, dan Sesi Berakhir). | Alamat IP, identitas perangkat, waktu masuk/keluar, dan penanda simulasi peran. |
| **6. UNDUH** | Ekspor dan pengunduhan berkas (Unduh Excel RUH per-subbag, Rekap Perencanaan, Rekap Pelaksanaan, dan Paket ZIP 5 Subbag). | Jenis berkas, filter subbagian, waktu unduh, dan kepatuhan masa aktif berkas (kedaluwarsa 1 jam). |

---

### 14.3 Alur Simpan RUH Belanja & Komit Bersih (Batch Commit)
1. **Draf Sementara di Layar (Tanpa Mencemari Log):**
   - Saat operator menyusun rincian belanja di lembar kerja RUH (mengetik harga, mengubah volume, atau menambah item), perubahan ditampung sementara di memori browser sebagai draf kerja.
   - Sistem **TIDAK** mencatat log setiap ketikan tombol, sehingga database audit tetap bersih, rapi, dan mudah dibaca.
2. **Pop-Up Konfirmasi & Rekam 1 Entri Bersih:**
   - Ketika tombol **`Simpan Perubahan RKB`** ditekan, sistem memunculkan Pop-Up Pratinjau yang merangkum:
     - Jumlah baris yang bertambah, berubah, atau dihapus.
     - Perubahan anggaran: **Pagu Semula ➔ Pagu Menjadi (Selisih Netto)**.
     - Kolom **Catatan Penyimpanan** untuk alasan justifikasi.
   - Setelah pengguna mengonfirmasi, seluruh draf disimpan secara utuh ke database dan dicatat sebagai **tepat 1 entri resmi** berkode `COMMIT_RKB_CHANGES` pada Log Aktivitas.

---

### 14.4 Rekam Jejak Simulasi Ganti Peran Pengembang
1. **Transparansi Akun Asli (Anti-Pencatutan Identitas):**
   - Ketika Pengembang (`emenje`) menggunakan fitur **Simulasi Ganti Peran** (misalnya menyamar sebagai Operator KUL untuk menguji alur kerja), sistem **TIDAK PERNAH** mencatat transaksi seolah-olah dilakukan oleh operator KUL asli.
2. **Format Pencatatan Resmi:**
   - Kolom pelaku (`username`) pada log tetap mencatat akun asli: **`emenje`**.
   - Keterangan peran mencantumkan identitas simulasi secara jujur:
     `developer [simulasi: operator | PIC: KUL]`
   - Dengan cara ini, pengujian oleh pengembang tidak akan pernah merusak atau mencemari riwayat kerja riil operator satker.

---

### 14.5 Perlindungan Database Anti-Reset & Nol-Destruktif
1. **Larangan Kueri Pembersihan Data:**
   - Server dilarang keras memuat perintah penghapusan riwayat audit atau pembersihan data otomatis saat server menyala.
2. **Kekekalan Data Siklus Hidup:**
   - Seluruh rutinitas awal server dipagari secara permanen (`operational_cycle_aligned_v1`).
   - Server restart, listrik padam, maupun deploy kode baru melalui Git **TIDAK AKAN PERNAH** mereset database, tidak akan menghapus riwayat RKB, dan tidak akan membuka kunci anggaran yang sudah disahkan pada Tahap 4.

---

### 14.6 Pencegahan Tabrakan Perubahan Data Antar-Operator
1. **Deteksi Versi Dokumen Otomatis:**
   - Setiap kali lembar kerja RKB dibuka, sistem merekam penanda versi dokumen aktif (`rkb_version`).
2. **Perlindungan Data dari Penimpaan Tak Sengaja (*Lost Updates*):**
   - Apabila saat seorang operator sedang menyusun draf terdapat rekan kerja lain yang telah menyimpan perubahan terlebih dahulu, sistem akan menolak simpan secara aman dan memunculkan peringatan:
     *"Data RKB telah diperbarui oleh pengguna lain. Silakan muat ulang data terbaru."*
   - Draf kerja yang sedang disusun oleh operator **tidak akan hilang**, sehingga operator dapat membandingkan angka terlebih dahulu sebelum menyimpan.

---

### 14.7 Standar Basis Data Produksi (MySQL phpMyAdmin)
1. **Pusat Data Tunggal (Production SSOT):**
   - Seluruh data operasional SI-PRABU berjalan langsung pada basis data **MySQL / MariaDB** (`DB_TYPE=mysql`) yang terkelola di **phpMyAdmin Hostinger** (`siprabu_db`) melalui jembatan koneksi `src/mysql_sync.js`.
2. **Keamanan Transaksi Terpadu:**
   - Transaksi penyimpanan draf belanja diselaraskan dengan standar transaksi MySQL (tanpa ketergantungan pada savepoint connection pool yang rapuh), menjamin proses simpan selalu berhasil dan bebas dari galat database.
3. **Mode Portabel / Pengujian:**
   - Engine lokal SQLite hanya digunakan sebagai alat bantu otomatis (*unit test runner*) di komputer pengembang tanpa pernah mengganggu database produksi phpMyAdmin.

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


