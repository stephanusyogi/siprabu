# 🏛️ BLUEPRINT & PRODUCT REQUIREMENTS DOCUMENT (PRD)
## SISTEM INFORMASI PERENCANAAN ANGGARAN KPU KABUPATEN NGAWI (SI-PRABU)
- **Lead Developer & System Architect:** `emenje`
- **AI Pair-Programmer:** `Antigravity`
- **Status Dokumen:** Single Source of Truth (SSOT) Terkunci & Mengikat
- **Repositori:** `jihanandro/siprabu` (Branch: `main`)

---

## I. PRINSIP DASAR & PROTOKOL PENGEMBANGAN (DEVELOPER CONTRACT)

1. **Prinsip Developer-to-Developer:**
   - Semua definisi bisnis, tahapan penganggaran, arti angka pagu, dan alur dokumen **hanya sah jika bersumber langsung dari Lead Developer (`emenje`)**.
   - AI Pair-Programmer **dilarang keras berasumsi** atau mengarang logika bisnis berdasarkan interpretasi umum di luar arahan langsung Lead Developer.
2. **Kekebalan Aturan Terkunci (Zero Regression Guarantee):**
   - Setiap butir kesepakatan yang telah disahkan (*PASS*) diberi nomor aturan permanen (`[RULE-XX]`).
   - Setiap `[RULE-XX]` dilindungi oleh automated regression test di `test/`. Perubahan kode yang menyebabkan test gagal **wajib ditolak**.
3. **Audit Modul Bertahap:**
   - Proses audit berjalan 1 per 1 modul secara berurutan dan tidak melompat.
   - Modul hanya berstatus `PASS` setelah diverifikasi dan disetujui langsung oleh Lead Developer.

---

## II. DAFTAR KESEPAKATAN ARSITEKTUR & ATURAN TERKUNCI (LOCKED RULES)

### [RULE-01] Otoritas Akses Menu Manajemen Pengguna Satker
- **Status:** TERKUNCI & TERUJI (PASS ✅ - Commit `7b51dfc`)
- **Cakupan:** Menu Manajemen User (`view-users`), endpoint `/api/users`.
- **Kewenangan:**
  - HANYA **Level 0 (Lead Developer `emenje`)** dan **Kasubbag Perencanaan (Level 1, username: `perencanaan`)** yang berhak melihat menu dan mengelola akun pengguna (tambah, edit, hapus, toggle aktif/nonaktif).
  - Staf Perencanaan (Level 1 staf), Operator Subbagian (Level 2), dan Pimpinan Eksekutif (Level 3) **DIBLOKIR TOTAL** dari menu dan endpoint ini (HTTP 403 Forbidden).

### [RULE-02] Isolasi Monitoring Unduhan & Auto-Purge Riwayat Kadaluarsa
- **Status:** TERKUNCI & TERUJI (PASS ✅ - Commit `1fa7a65`)
- **Cakupan:** Menu Monitoring Unduhan (`view-monitoring`), tabel `download_requests`.
- **Aturan Isolasi:**
  - Setiap pengguna **hanya dapat melihat daftar unduhan miliknya sendiri**. Pengguna A tidak dapat melihat file/hasil unduhan Pengguna B.
- **Pembersihan Otomatis:**
  - Riwayat dan file unduhan yang telah kadaluarsa (*expired*) atau berstatus `KADALUARSA` **otomatis terhapus permanen** dari database SQLite dan disk server setiap kali menu/endpoint diakses.

### [RULE-03] Hirarki & Cascade PIC Subbagian ke Sub-Kegiatan Anak
- **Status:** TERKUNCI & TERUJI (PASS ✅ - Commit `43bac69`)
- **Cakupan:** Rincian Belanja RKB (`rab_baris`).
- **Aturan Cascade:**
  - Pengubahan PIC pada baris induk/komponen belanja (contoh: baris PPK, PPS) **secara otomatis menurunkan (*cascade*) nilai PIC tersebut ke seluruh baris rincian/sub-kegiatan di bawahnya**.
  - Rincian belanja di bawah induk tidak boleh memiliki PIC yang terpisah atau tertinggal dari induknya.

### [RULE-04] Keamanan Rute Dinamis Ala SAKTI Kemenkeu
- **Status:** TERKUNCI & TERUJI (PASS ✅ - Commit `f3534a4`)
- **Cakupan:** Router SPA, proteksi URL bar, SAKTI token generator.
- **Spesifikasi:**
  - Token rute acak terenkripsi 43-karakter Base64URL dengan HMAC-SHA256 rotasi dinamis per muat ulang.
  - Mendukung navigasi browser Back/Forward, F5 Hard Refresh, anti-caching redirect, dan route guard terpusat.

---

## III. MATRIKS PERAN & LEVEL AKSES PENGGUNA (RBAC)

| Tingkat (Level) | Identitas Peran | Kewenangan Sistem Utama |
|---|---|---|
| **Level 0** | **Lead Developer (`emenje`)** | Akses mutlak sistem, CRUD Pengguna Bebas, Bypass Kunci Darurat, Ruang Pengembang (Blueprint & PRD), Bebas Beralih Peran (QC Mode). |
| **Level 1** | **Kasubbag Perencanaan** | Manajemen Pengguna Satker, RUH Belanja Penuh, Tata Kelola Siklus & Kunci RKB, Validasi Usulan Revisi Subbag, Akses Master Database. |
| **Level 1** | **Staf Perencanaan** | RUH Belanja RKB, Validasi Usulan Revisi, Master Database (Dilarang Manajemen User). |
| **Level 2** | **Operator 5 Subbagian** *(KUL, TEKNIS, HUKUM, PARSDM, RENDATIN)* | Pengajuan Usulan Revisi Subbagian, RUH Belanja terisolasi ketat sesuai PIC Subbagian masing-masing. |
| **Level 3** | **Pimpinan Eksekutif** *(Ketua, Anggota, Sekretaris/KPA)* | Dashboard Monitoring Eksekutif, Akses Arsip BA Pleno, Hak Suara ACC Pleno Revisi (Read-Only Belanja). |

---

## IV. STATUS DOKUMEN RKB, ALUR PAGU & SIKLUS (DALAM PENYELARASAN)
*(Bagian ini disediakan khusus untuk mencatat definisi resmi dari Lead Developer `emenje` mengenai posisi RKB aktif, arti angka pagu, dan siklus dokumen yang sebenarnya).*
