# 🏛️ BLUEPRINT & PRD INDUK
## SI PRABU | Sistem Perencanaan dan Revisi Anggaran Berbasis RKB
### CANON MASTER PENGEMBANGAN SISTEM

- **Lead Developer & System Architect:** `emenje`
- **Repositori Resmi:** https://github.com/stephanusyogi/siprabu (Branch: `main`)
- **Status Dokumen:** Dokumen Induk Tunggal (Single Source of Truth / SSOT) • 24 Oktober 2026 • Kompilasi Kesepakatan Konseptual & Implementasi Terverifikasi

> Dokumen ini merangkum keputusan Pengembang (`emenje`) dan AI. Ketentuan yang belum disepakati tidak boleh dianggap sebagai izin implementasi atau perubahan aturan bisnis.

---

## DAFTAR KESEPAKATAN ARSITEKTUR & ATURAN SISTEM

### [KESEPAKATAN-01] Visi, Ruang Lingkup & Fondasi Modul SI-PRABU
- **Definisi Aplikasi:** SI-PRABU adalah aplikasi yang dirancang untuk **Perencanaan** dan **Pelaksanaan** Anggaran **Pilkada Serentak Tahun 2029**.
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
| **Pusat Siklus Dokumen** | Arsip anggaran awal dan seluruh baseline disahkan beserta dokumen pendukung; termasuk riwayat arsip revisi. |

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
1. **PANDUAN** hanya berisi **Regulasi & Dasar Hukum** dan **Panduan Penggunaan Sistem**. Seluruh pengguna dapat membaca; **Level 0** dan **Level 1** mengelola konten.
2. **Monitoring Unduhan**, **Manajemen User**, serta **Blueprint & PRD (DEV)** adalah menu mandiri pada navigasi utama, bukan submenu PANDUAN.

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
2. Akun login, identitas permanen, dan badge kanan atas tetap **LEVEL 0: DEVELOPER**.
3. Pilihan peran simulasi memicu refresh konteks fitur web sehingga menu dan aksi mengikuti aturan peran yang sedang diuji.
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
1. Audit revisi mencatat aktor, waktu, PIC, baris/objek, nilai sebelum dan sesudah, alasan bila relevan, dan status tahap.
2. Audit mencatat pengajuan, validasi, penolakan, persetujuan, pengesahan, perubahan tautan pascapengesahan, pengelolaan pengguna, dan unduhan.
3. Log proses versi `V1/V2/V3` tetap dapat ditelusuri tanpa memecah RKB aktif menjadi dokumen baru.
4. Integritas baseline, batas PIC, dan status penguncian wajib diverifikasi pada backend.

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
